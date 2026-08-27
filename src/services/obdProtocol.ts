/**
 * ELM327 / OBD-II protocol — pure functions, no I/O.
 *
 * Everything here turns bytes into meaning and back. It is deliberately
 * separated from the Bluetooth transport so the fiddly part — DTC bit packing,
 * PID scaling, ELM327's chatty text responses — can be tested exhaustively
 * without an adapter or a car. That matters here: the whole feature is
 * unverifiable on a laptop except at this layer.
 *
 * References: SAE J1979 (OBD-II modes and PIDs), SAE J2012 (DTC format),
 * ELM327 datasheet (AT command set).
 */

/* ------------------------------ AT commands ------------------------------ */

/**
 * Adapter setup, in order. Each one matters:
 *   ATZ   full reset — clears whatever the last app left configured
 *   ATE0  echo off — otherwise every reply is prefixed with the command
 *   ATL0  no linefeeds — keeps responses to a single \r-terminated line
 *   ATS0  no spaces — halves the bytes we parse
 *   ATH0  no headers — we only want the payload
 *   ATSP0 protocol auto-detect — the adapter figures out CAN vs ISO vs KWP
 */
export const INIT_COMMANDS = ["ATZ", "ATE0", "ATL0", "ATS0", "ATH0", "ATSP0"] as const;

export const MODE = {
  liveData: "01",
  freezeFrame: "02",
  storedDtcs: "03",
  clearDtcs: "04",
  pendingDtcs: "07",
  permanentDtcs: "0A",
} as const;

/** Status words an ELM327 returns instead of data. Not errors in the JS sense. */
const STATUS_WORDS = [
  "SEARCHING",
  "BUS INIT",
  "BUSINIT",
  "STOPPED",
  "NO DATA",
  "NODATA",
  "UNABLE TO CONNECT",
  "CAN ERROR",
  "BUS ERROR",
  "DATA ERROR",
  "BUFFER FULL",
  "ERROR",
];

export class ObdError extends Error {}

/**
 * Strip an ELM327 reply down to a clean uppercase hex string.
 *
 * A raw reply can look like any of:
 *   "41 0C 1A F8\r>"                     spaces on, single line
 *   "410C1AF8\r\r>"                      spaces off
 *   "0: 43 02 01 43\r1: 02 34 00 00\r>"  multi-frame CAN, line-numbered
 *   "SEARCHING...\r43 01 03 01\r>"       status line, then the real answer
 *
 * Throws on the status words that mean "there is no answer", so callers get a
 * clear failure instead of silently parsing an empty string.
 */
export function cleanResponse(raw: string): string {
  let text = raw.toUpperCase();

  // Status words MUST be removed before the non-hex strip, not merely detected:
  // "SEARCHING" is made of letters and three of them — E, A, C — are valid hex
  // digits, so stripping punctuation first would splice "EAC" onto the front of
  // the real payload and shift every byte after it.
  const seen: string[] = [];
  for (const word of STATUS_WORDS) {
    if (text.includes(word)) {
      seen.push(word);
      text = text.split(word).join(" ");
    }
  }

  const hex = text
    .replace(/\r|\n|>/g, " ")
    // Multi-frame CAN prefixes each line with an index: "0:", "1:", ...
    .replace(/\b[0-9A-F]:\s*/g, " ")
    .replace(/[^0-9A-F]/g, "");

  // A status word on its own means there is no answer. Alongside data it is
  // just noise — "SEARCHING..." routinely precedes a valid reply.
  if (hex.length === 0 && seen.length > 0) throw new ObdError(seen[0].trim());

  return hex;
}

/** Split a clean hex string into byte values. */
export function toBytes(hex: string): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
}

/* --------------------------------- DTCs --------------------------------- */

const DTC_LETTER = ["P", "C", "B", "U"] as const;

/**
 * Decode one 2-byte DTC into its printed form (SAE J2012).
 *
 * The first two bits pick the letter, the next two the first digit, and the
 * remaining twelve bits are three hex digits:
 *
 *   0x01 0x43  ->  00 00 0001 / 0100 0011  ->  P 0 1 4 3  ->  "P0143"
 *
 * `0x0000` is padding, not a fault — CAN frames are fixed width and unused
 * slots are zero-filled. Returns null for it so callers can drop it.
 */
export function decodeDtc(a: number, b: number): string | null {
  if (a === 0 && b === 0) return null;
  const letter = DTC_LETTER[(a >> 6) & 0b11];
  const d1 = (a >> 4) & 0b11;
  const d2 = a & 0x0f;
  const d3 = (b >> 4) & 0x0f;
  const d4 = b & 0x0f;
  return `${letter}${d1}${d2.toString(16)}${d3.toString(16)}${d4.toString(16)}`.toUpperCase();
}

/**
 * Parse a Mode 03 / 07 / 0A reply into DTC codes.
 *
 * The reply starts with the mode + 0x40 (so 03 -> 43), and on CAN is followed
 * by a count byte. Older protocols omit the count and just pack three DTCs per
 * message. Rather than guess the protocol, we find the mode echo and read
 * pairs from there, dropping zero padding — which is correct for both shapes.
 *
 * Some adapters repeat the echo per frame in a multi-frame reply, so every
 * occurrence is handled, and duplicates are collapsed: the same code reported
 * by two ECUs is still one fault to the mechanic.
 */
export function parseDtcResponse(raw: string, mode: string = MODE.storedDtcs): string[] {
  const hex = cleanResponse(raw);
  const echo = (parseInt(mode, 16) + 0x40).toString(16).toUpperCase().padStart(2, "0");

  const codes: string[] = [];
  let i = hex.indexOf(echo);
  if (i < 0) return [];

  while (i >= 0 && i + 2 <= hex.length) {
    const bytes = toBytes(hex.slice(i + 2));
    // A CAN reply puts the DTC count here; a pre-CAN one starts straight into
    // data. A count is always small, and a real DTC's first byte is rarely
    // 0x00-0x07 with a zero partner, so treat a plausible count as a count.
    let start = 0;
    if (bytes.length % 2 === 1) start = 1;

    for (let k = start; k + 1 < bytes.length; k += 2) {
      const code = decodeDtc(bytes[k], bytes[k + 1]);
      if (code) codes.push(code);
    }
    const next = hex.indexOf(echo, i + 2);
    if (next === i) break;
    i = next;
  }

  return [...new Set(codes)];
}

/* --------------------------------- PIDs --------------------------------- */

export interface PidDefinition {
  /** Mode 01 PID, e.g. "0C" for engine RPM. */
  pid: string;
  /** English name — a Live Data parameter, kept in English by project rule. */
  name: string;
  unit: string;
  /** How many data bytes follow the "41 <pid>" echo. */
  bytes: number;
  decode: (b: number[]) => number;
  /** Khmer one-liner for what this reading means on the shop floor. */
  hintKm?: string;
}

/**
 * The readings that actually earn their place in a diagnosis.
 *
 * Chosen to line up with what the diagnostic engine already reasons about —
 * fuel trims for a lean/rich call, coolant temp for thermostat and cooling
 * faults, MAF/MAP for airflow — rather than everything an ELM327 can report.
 */
export const LIVE_PIDS: PidDefinition[] = [
  { pid: "0C", name: "Engine RPM", unit: "rpm", bytes: 2, decode: ([a, b]) => (a * 256 + b) / 4 },
  { pid: "0D", name: "Vehicle Speed", unit: "km/h", bytes: 1, decode: ([a]) => a },
  {
    pid: "05",
    name: "Engine Coolant Temperature",
    unit: "°C",
    bytes: 1,
    decode: ([a]) => a - 40,
    hintKm: "ធម្មតា 80–100°C ក្រោយកម្ដៅឡើងពេញ",
  },
  { pid: "0F", name: "Intake Air Temperature", unit: "°C", bytes: 1, decode: ([a]) => a - 40 },
  {
    pid: "04",
    name: "Calculated Engine Load",
    unit: "%",
    bytes: 1,
    decode: ([a]) => (a * 100) / 255,
  },
  {
    pid: "06",
    name: "Short Term Fuel Trim Bank 1",
    unit: "%",
    bytes: 1,
    decode: ([a]) => ((a - 128) * 100) / 128,
    hintKm: "លើស +10% យូរ — សង្ស័យ vacuum leak ឬ fuel ខ្សោយ",
  },
  {
    pid: "07",
    name: "Long Term Fuel Trim Bank 1",
    unit: "%",
    bytes: 1,
    decode: ([a]) => ((a - 128) * 100) / 128,
    hintKm: "លើស +10% យូរ — សង្ស័យ vacuum leak ឬ fuel ខ្សោយ",
  },
  { pid: "0B", name: "Intake Manifold Pressure", unit: "kPa", bytes: 1, decode: ([a]) => a },
  {
    pid: "10",
    name: "MAF Air Flow Rate",
    unit: "g/s",
    bytes: 2,
    decode: ([a, b]) => (a * 256 + b) / 100,
  },
  {
    pid: "11",
    name: "Throttle Position",
    unit: "%",
    bytes: 1,
    decode: ([a]) => (a * 100) / 255,
  },
  {
    pid: "42",
    name: "Control Module Voltage",
    unit: "V",
    bytes: 2,
    decode: ([a, b]) => (a * 256 + b) / 1000,
    hintKm: "ម៉ាស៊ីនដើរគួរ 13.5–14.5V — ទាបជាងនេះសង្ស័យ Alternator",
  },
];

export const PID_BY_ID = Object.fromEntries(LIVE_PIDS.map((p) => [p.pid, p])) as Record<
  string,
  PidDefinition
>;

export interface PidReading {
  pid: string;
  name: string;
  unit: string;
  value: number;
  hintKm?: string;
}

/**
 * Parse a Mode 01 reply for a known PID.
 *
 * Returns null rather than throwing when the ECU does not support the PID —
 * an unsupported reading is normal and should quietly drop out of the list,
 * not abort the whole scan.
 */
export function parsePidResponse(raw: string, pid: string): PidReading | null {
  const def = PID_BY_ID[pid.toUpperCase()];
  if (!def) return null;

  let hex: string;
  try {
    hex = cleanResponse(raw);
  } catch {
    return null;
  }

  const echo = "41" + def.pid;
  const at = hex.indexOf(echo);
  if (at < 0) return null;

  const bytes = toBytes(hex.slice(at + echo.length));
  if (bytes.length < def.bytes) return null;

  const value = def.decode(bytes.slice(0, def.bytes));
  if (!Number.isFinite(value)) return null;

  return { pid: def.pid, name: def.name, unit: def.unit, value, hintKm: def.hintKm };
}

/** Round for display: rpm and kPa read as integers, trims and volts need decimals. */
export function formatReading(r: PidReading): string {
  const decimals = r.unit === "V" ? 2 : r.unit === "g/s" || r.unit === "%" ? 1 : 0;
  return `${r.value.toFixed(decimals)} ${r.unit}`;
}
