/**
 * OBD-II adapter connection.
 *
 * Two transports behind one interface: a real Bluetooth Low Energy adapter,
 * and a mock that answers like a car with faults on it. The mock is not a
 * convenience — it is the only way any of this is exercisable without an
 * adapter and a vehicle, so it speaks the same ELM327 dialect (status words,
 * multi-frame replies, unsupported PIDs) rather than returning tidy fixtures.
 *
 * Why BLE only: the Web Bluetooth API cannot reach Bluetooth Classic SPP,
 * which is what most cheap ELM327 clones use, and browsers cannot open the raw
 * TCP socket a WiFi adapter needs. A BLE adapter is a hard requirement, and
 * `isWebBluetoothAvailable()` exists so the UI can say so before the mechanic
 * goes looking for a fault that is not there. iOS has no Web Bluetooth at all.
 */
import { INIT_COMMANDS, MODE, ObdError, parseDtcResponse, parsePidResponse } from "@/services/obdProtocol";
import type { PidReading } from "@/services/obdProtocol";

/* ------------------------------- Transport ------------------------------- */

export interface ObdTransport {
  readonly label: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Send one command and wait for the reply, terminated by the '>' prompt. */
  send(command: string): Promise<string>;
  readonly connected: boolean;
}

/**
 * Vendor UUIDs seen on BLE ELM327 adapters. There is no standard for this, so
 * we try each in turn. Every one must also be listed in `optionalServices` or
 * Web Bluetooth refuses access to it after pairing.
 */
const BLE_PROFILES = [
  // HM-10 style, the most common clone module
  { service: 0xffe0, write: 0xffe1, notify: 0xffe1 },
  // Vgate iCar Pro and similar
  { service: 0xfff0, write: 0xfff2, notify: 0xfff1 },
  { service: 0x18f0, write: 0x2af1, notify: 0x2af0 },
  // Nordic UART, used by a few premium adapters
  {
    service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
    write: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
    notify: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  },
] as const;

export const BLE_OPTIONAL_SERVICES = BLE_PROFILES.map((p) => p.service);

export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.bluetooth !== "undefined";
}

/** Milliseconds to wait for a '>' prompt before giving up on a command. */
const REPLY_TIMEOUT_MS = 6000;

export class BleObdTransport implements ObdTransport {
  readonly label = "Bluetooth LE";
  private device: BluetoothDevice | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private buffer = "";
  private waiting: { resolve: (v: string) => void; reject: (e: Error) => void; timer: number } | null = null;

  get connected(): boolean {
    return !!this.device?.gatt?.connected && !!this.writeChar;
  }

  async connect(): Promise<void> {
    if (!isWebBluetoothAvailable()) {
      throw new ObdError(
        "Browser នេះមិនគាំទ្រ Web Bluetooth ទេ។ សូមប្រើ Chrome លើ Android — iPhone មិនអាចប្រើបានទេ។",
      );
    }

    // acceptAllDevices because ELM327 clones advertise wildly inconsistent
    // names ("OBDII", "V-LINK", "Vgate", "IOS-Vlink"...), and a name filter
    // would hide the mechanic's adapter from the picker.
    this.device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: BLE_OPTIONAL_SERVICES as unknown as BluetoothServiceUUID[],
    });

    const server = await this.device.gatt!.connect();

    let lastError: unknown = null;
    for (const profile of BLE_PROFILES) {
      try {
        const service = await server.getPrimaryService(profile.service as BluetoothServiceUUID);
        this.writeChar = await service.getCharacteristic(profile.write as BluetoothCharacteristicUUID);
        this.notifyChar = await service.getCharacteristic(profile.notify as BluetoothCharacteristicUUID);
        break;
      } catch (e) {
        lastError = e;
        this.writeChar = this.notifyChar = null;
      }
    }

    if (!this.writeChar || !this.notifyChar) {
      await this.disconnect();
      throw new ObdError(
        `រកមិនឃើញ service ដែលស្គាល់លើ adapter នេះទេ។ សូមប្រាកដថាវាជា BLE (Bluetooth 4.0+) មិនមែន Bluetooth Classic។ (${String(lastError)})`,
      );
    }

    await this.notifyChar.startNotifications();
    this.notifyChar.addEventListener("characteristicvaluechanged", this.onData);

    for (const cmd of INIT_COMMANDS) {
      // ATZ resets the adapter and can answer slowly or with junk; the init
      // sequence is best-effort, and a failure here shows up as a clear error
      // on the first real command instead.
      try {
        await this.send(cmd);
      } catch {
        /* keep going — later commands re-assert what matters */
      }
    }
  }

  private onData = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    this.buffer += new TextDecoder().decode(value);
    // '>' is the ELM327 prompt: the adapter is done talking and ready again.
    if (this.buffer.includes(">") && this.waiting) {
      const reply = this.buffer;
      this.buffer = "";
      const w = this.waiting;
      this.waiting = null;
      clearTimeout(w.timer);
      w.resolve(reply);
    }
  };

  async send(command: string): Promise<string> {
    if (!this.writeChar) throw new ObdError("មិនទាន់ភ្ជាប់ adapter ទេ");
    if (this.waiting) throw new ObdError("កំពុងរង់ចាំចម្លើយពីពាក្យបញ្ជាមុន");

    this.buffer = "";
    const payload = new TextEncoder().encode(command + "\r");

    return new Promise<string>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.waiting = null;
        reject(new ObdError(`Adapter មិនឆ្លើយតបចំពោះ "${command}" ទេ`));
      }, REPLY_TIMEOUT_MS);
      this.waiting = { resolve, reject, timer };
      this.writeChar!.writeValue(payload).catch((e) => {
        clearTimeout(timer);
        this.waiting = null;
        reject(e instanceof Error ? e : new ObdError(String(e)));
      });
    });
  }

  async disconnect(): Promise<void> {
    try {
      this.notifyChar?.removeEventListener("characteristicvaluechanged", this.onData);
      await this.notifyChar?.stopNotifications();
    } catch {
      /* the adapter may already be gone */
    }
    this.device?.gatt?.disconnect();
    this.device = null;
    this.writeChar = this.notifyChar = null;
    this.buffer = "";
  }
}

/* --------------------------------- Mock --------------------------------- */

/**
 * A simulated car, so the whole flow can be built and checked without hardware.
 *
 * It answers in the ELM327's own awkward dialect — a "SEARCHING..." preamble,
 * a multi-frame reply for the DTC list, "NO DATA" for a PID this ECU does not
 * support — because those are exactly the cases that break a naive parser, and
 * a mock that only produced clean replies would hide them until the adapter
 * arrived.
 */
export class MockObdTransport implements ObdTransport {
  readonly label = "សាកល្បង (Mock)";
  private isConnected = false;
  private cleared = false;
  private tick = 0;

  /** Faults the simulated car is carrying. Both exist in the DTC database. */
  constructor(private readonly dtcs: string[] = ["P0301", "P0171"]) {}

  get connected(): boolean {
    return this.isConnected;
  }

  async connect(): Promise<void> {
    await delay(400);
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
  }

  async send(command: string): Promise<string> {
    if (!this.isConnected) throw new ObdError("មិនទាន់ភ្ជាប់ adapter ទេ");
    await delay(90);
    const cmd = command.toUpperCase().replace(/\s/g, "");

    if (cmd.startsWith("AT")) return "OK\r>";

    if (cmd === MODE.storedDtcs || cmd === MODE.pendingDtcs) {
      const codes = this.cleared ? [] : this.dtcs;
      const echo = cmd === MODE.storedDtcs ? "43" : "47";
      if (codes.length === 0) return `SEARCHING...\r${echo} 00\r>`;
      const payload = codes.map(encodeDtcToHex).join(" ");
      // Deliberately multi-frame: this is the shape that trips up parsers.
      return `0: ${echo} 0${codes.length} ${payload}\r1: 00 00\r>`;
    }

    if (cmd === MODE.clearDtcs) {
      this.cleared = true;
      return "44\r>";
    }

    if (cmd.startsWith("01") && cmd.length === 4) {
      const pid = cmd.slice(2);
      const hex = this.mockPid(pid);
      return hex ? `41 ${pid} ${hex}\r>` : "NO DATA\r>";
    }

    return "?\r>";
  }

  /** Values drift a little each read, so the live panel looks alive. */
  private mockPid(pid: string): string | null {
    this.tick++;
    const wobble = Math.sin(this.tick / 4);
    const byte = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0").toUpperCase();
    const word = (n: number) => {
      const v = Math.max(0, Math.min(65535, Math.round(n)));
      return `${byte(v >> 8)} ${byte(v & 0xff)}`;
    };

    switch (pid) {
      case "0C": return word((820 + wobble * 60) * 4);      // idle, hunting slightly
      case "0D": return byte(0);                             // stationary
      case "05": return byte(88 + 40);                       // 88 °C
      case "0F": return byte(34 + 40);                       // 34 °C intake
      case "04": return byte((21 + wobble * 3) * 2.55);      // ~21% load
      // Lean trims, consistent with the P0171 this car is carrying.
      case "06": return byte(128 + (12 + wobble * 2) * 1.28);
      case "07": return byte(128 + 16 * 1.28);
      case "0B": return byte(33);                            // kPa at idle
      case "10": return word((3.4 + wobble * 0.3) * 100);    // g/s
      case "11": return byte(14 * 2.55);                     // throttle %
      case "42": return word(14180);                         // 14.18 V
      default: return null;                                  // unsupported PID
    }
  }
}

function encodeDtcToHex(code: string): string {
  const letter = "PCBU".indexOf(code[0].toUpperCase());
  const a = (letter << 6) | (parseInt(code[1], 10) << 4) | parseInt(code[2], 16);
  const b = (parseInt(code[3], 16) << 4) | parseInt(code[4], 16);
  return `${a.toString(16).padStart(2, "0")} ${b.toString(16).padStart(2, "0")}`.toUpperCase();
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* -------------------------------- Client -------------------------------- */

export interface ScanResult {
  storedDtcs: string[];
  pendingDtcs: string[];
}

/**
 * Thin command layer over a transport. Everything a screen needs, and nothing
 * that reaches into the diagnostic engine — a scan produces facts; deciding
 * what they mean stays where it already lives.
 */
export class ObdClient {
  constructor(private readonly transport: ObdTransport) {}

  get connected(): boolean {
    return this.transport.connected;
  }

  async readDtcs(): Promise<ScanResult> {
    const stored = parseDtcResponse(await this.transport.send(MODE.storedDtcs), MODE.storedDtcs);
    let pending: string[] = [];
    try {
      pending = parseDtcResponse(await this.transport.send(MODE.pendingDtcs), MODE.pendingDtcs);
    } catch {
      // Not every ECU answers mode 07; a missing pending list is not a failure.
    }
    return { storedDtcs: stored, pendingDtcs: pending.filter((c) => !stored.includes(c)) };
  }

  /** Read the PIDs one at a time — ELM327 handles a single request at a time. */
  async readLiveData(pids: string[]): Promise<PidReading[]> {
    const out: PidReading[] = [];
    for (const pid of pids) {
      try {
        const reading = parsePidResponse(await this.transport.send(MODE.liveData + pid), pid);
        if (reading) out.push(reading);
      } catch {
        // An unsupported or timed-out PID drops out of the list rather than
        // ending the sweep — a partial set of readings is still useful.
      }
    }
    return out;
  }

  /**
   * Erase stored codes. Held apart from everything else on purpose: the app's
   * own DTC content repeatedly warns that clearing before repair destroys the
   * evidence, so the UI must make this deliberate rather than easy.
   */
  async clearDtcs(): Promise<void> {
    await this.transport.send(MODE.clearDtcs);
  }
}
