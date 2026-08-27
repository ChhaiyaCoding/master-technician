/**
 * ObdClient tests, driven through the mock transport.
 *
 * The point is not to test the mock — it is to run the client against replies
 * shaped the way a real ELM327 shapes them: a multi-frame DTC list, a
 * "SEARCHING..." preamble, "NO DATA" for an unsupported PID. Those are the
 * cases that break a scanner in a workshop, and they are reachable here.
 */
import { describe, expect, it } from "vitest";
import { MockObdTransport, ObdClient, isWebBluetoothAvailable } from "@/services/obd";
import { DTC_BY_CODE } from "@/data/dtc";

async function connectedClient(dtcs?: string[]) {
  const transport = new MockObdTransport(dtcs);
  await transport.connect();
  return { client: new ObdClient(transport), transport };
}

describe("ObdClient — reading codes", () => {
  it("reads the car's stored codes out of a multi-frame reply", async () => {
    const { client } = await connectedClient(["P0301", "P0171"]);
    const { storedDtcs } = await client.readDtcs();
    expect(storedDtcs).toEqual(["P0301", "P0171"]);
  });

  it("round-trips codes across the whole letter range", async () => {
    // Encoding and decoding are separate implementations here (the mock packs
    // the bytes, the protocol layer unpacks them), so agreement is meaningful.
    const codes = ["P0301", "C0035", "B0011", "U0100", "P2ABC"];
    const { client } = await connectedClient(codes);
    const { storedDtcs } = await client.readDtcs();
    expect(storedDtcs).toEqual(codes);
  });

  it("reports a clean car as no codes, not as an error", async () => {
    const { client } = await connectedClient([]);
    const { storedDtcs, pendingDtcs } = await client.readDtcs();
    expect(storedDtcs).toEqual([]);
    expect(pendingDtcs).toEqual([]);
  });

  it("does not repeat a stored code in the pending list", async () => {
    const { client } = await connectedClient(["P0301"]);
    const { storedDtcs, pendingDtcs } = await client.readDtcs();
    expect(storedDtcs).toEqual(["P0301"]);
    expect(pendingDtcs).toEqual([]);
  });

  it("returns codes the DTC database can actually explain", async () => {
    // A scan that produces codes the app cannot describe is a dead end for the
    // mechanic, so the mock's default car is one the knowledge base covers.
    const { client } = await connectedClient();
    const { storedDtcs } = await client.readDtcs();
    expect(storedDtcs.length).toBeGreaterThan(0);
    for (const code of storedDtcs) expect(DTC_BY_CODE[code]).toBeDefined();
  });
});

describe("ObdClient — live data", () => {
  it("decodes the readings the diagnostic engine cares about", async () => {
    const { client } = await connectedClient();
    const readings = await client.readLiveData(["0C", "05", "06", "42"]);
    const by = Object.fromEntries(readings.map((r) => [r.pid, r]));

    expect(by["0C"].value).toBeGreaterThan(600);
    expect(by["0C"].value).toBeLessThan(1200);
    expect(by["05"].value).toBe(88);
    expect(by["42"].value).toBeCloseTo(14.18, 2);
    // The mock car carries P0171, so its trims must read lean-correcting.
    expect(by["06"].value).toBeGreaterThan(5);
  });

  it("drops an unsupported PID instead of failing the whole sweep", async () => {
    const { client } = await connectedClient();
    const readings = await client.readLiveData(["0C", "1F", "05"]);
    expect(readings.map((r) => r.pid)).toEqual(["0C", "05"]);
  });

  it("returns an empty list rather than throwing when nothing is supported", async () => {
    const { client } = await connectedClient();
    expect(await client.readLiveData(["1F", "2B"])).toEqual([]);
  });
});

describe("ObdClient — clearing codes", () => {
  it("clears stored codes", async () => {
    const { client } = await connectedClient(["P0301"]);
    expect((await client.readDtcs()).storedDtcs).toEqual(["P0301"]);
    await client.clearDtcs();
    expect((await client.readDtcs()).storedDtcs).toEqual([]);
  });
});

describe("transport guards", () => {
  it("refuses commands before connecting", async () => {
    const client = new ObdClient(new MockObdTransport());
    await expect(client.readDtcs()).rejects.toThrow();
  });

  it("reports whether this browser can reach a BLE adapter at all", () => {
    // jsdom has no Web Bluetooth, so this must be false here — the value of
    // the check is that the UI can say "use Chrome on Android" up front
    // instead of letting the mechanic hunt for a fault that isn't theirs.
    expect(isWebBluetoothAvailable()).toBe(false);
  });
});
