/**
 * ELM327 protocol tests.
 *
 * The bit packing in a DTC and the scaling in a PID are the two places where a
 * wrong answer looks perfectly plausible: "P0143" and "P0343" are both real
 * codes, and a fuel trim of +7% and -7% are both believable numbers. Neither
 * mistake announces itself in the UI. Since none of this can be checked
 * against a real car from here, it gets checked against the standard instead —
 * worked examples decoded by hand from SAE J1979 and J2012.
 */
import { describe, expect, it } from "vitest";
import {
  ObdError,
  cleanResponse,
  decodeDtc,
  formatReading,
  parseDtcResponse,
  parsePidResponse,
  toBytes,
} from "@/services/obdProtocol";

describe("cleanResponse", () => {
  it("strips spaces, carriage returns and the prompt", () => {
    expect(cleanResponse("41 0C 1A F8\r>")).toBe("410C1AF8");
  });

  it("handles a reply that already has spaces turned off", () => {
    expect(cleanResponse("410C1AF8\r\r>")).toBe("410C1AF8");
  });

  it("drops the line numbers of a multi-frame CAN reply", () => {
    // 0:/1: are frame indices, not data — reading them as hex would corrupt
    // every byte that follows.
    expect(cleanResponse("0: 43 02 01 43\r1: 02 34 00 00\r>")).toBe("430201430234 0000".replace(/\s/g, ""));
  });

  it("ignores SEARCHING... when a real answer follows it", () => {
    expect(cleanResponse("SEARCHING...\r43 01 03 01\r>")).toBe("43010301");
  });

  it("throws when the adapter says there is no answer", () => {
    expect(() => cleanResponse("NO DATA\r>")).toThrow(ObdError);
    expect(() => cleanResponse("UNABLE TO CONNECT\r>")).toThrow(ObdError);
    expect(() => cleanResponse("CAN ERROR\r>")).toThrow(ObdError);
  });
});

describe("toBytes", () => {
  it("splits hex into byte values", () => {
    expect(toBytes("410C1AF8")).toEqual([0x41, 0x0c, 0x1a, 0xf8]);
  });

  it("ignores a trailing half-byte rather than producing NaN", () => {
    expect(toBytes("410C1")).toEqual([0x41, 0x0c]);
  });
});

describe("decodeDtc", () => {
  // Worked by hand from J2012: first two bits pick the letter, next two the
  // leading digit, the remaining twelve bits are three hex digits.
  it.each([
    [0x01, 0x43, "P0143"],
    [0x03, 0x01, "P0301"],
    [0x01, 0x71, "P0171"],
    [0x04, 0x20, "P0420"],
    [0x40, 0x30, "C0030"], // 01 -> C
    [0x80, 0x11, "B0011"], // 10 -> B
    [0xc1, 0x00, "U0100"], // 11 -> U
    [0x10, 0x00, "P1000"], // second pair of bits -> leading digit 1
    [0x2a, 0xbc, "P2ABC"], // hex digits survive
  ])("decodes %s %s as %s", (a, b, expected) => {
    expect(decodeDtc(a as number, b as number)).toBe(expected);
  });

  it("treats 0x0000 as padding, not as code P0000", () => {
    // CAN frames are fixed width and zero-filled; reading the padding as a
    // fault would show phantom codes on every scan.
    expect(decodeDtc(0x00, 0x00)).toBeNull();
  });
});

describe("parseDtcResponse", () => {
  it("reads a single-frame CAN reply with a count byte", () => {
    // 43 = reply to mode 03, 02 = two codes, then 0143 and 0234.
    expect(parseDtcResponse("43 02 01 43 02 34\r>")).toEqual(["P0143", "P0234"]);
  });

  it("reads a pre-CAN reply that has no count byte", () => {
    expect(parseDtcResponse("43 01 43 02 34 00 00\r>")).toEqual(["P0143", "P0234"]);
  });

  it("reads a multi-frame reply and drops the padding", () => {
    const raw = "0: 43 04 01 43 02 34\r1: 03 01 01 71 00 00\r>";
    expect(parseDtcResponse(raw)).toEqual(["P0143", "P0234", "P0301", "P0171"]);
  });

  it("collapses the same code reported by two ECUs", () => {
    expect(parseDtcResponse("43 02 03 01 03 01\r>")).toEqual(["P0301"]);
  });

  it("returns nothing when the car has no stored faults", () => {
    // A clean car answers mode 03 with a zero count.
    expect(parseDtcResponse("43 00\r>")).toEqual([]);
  });

  it("returns nothing rather than throwing when the reply has no mode echo", () => {
    expect(parseDtcResponse("41 0C 1A F8\r>")).toEqual([]);
  });

  it("reads pending codes from mode 07", () => {
    expect(parseDtcResponse("47 01 01 71\r>", "07")).toEqual(["P0171"]);
  });
});

describe("parsePidResponse", () => {
  it("decodes engine RPM at a quarter-count resolution", () => {
    // 0x1AF8 = 6904; /4 = 1726 rpm — a plausible warm idle-to-cruise value.
    const r = parsePidResponse("41 0C 1A F8\r>", "0C")!;
    expect(r.name).toBe("Engine RPM");
    expect(r.value).toBe(1726);
  });

  it("decodes coolant temperature with the -40 offset", () => {
    // The offset is what lets the scale carry sub-zero temperatures.
    expect(parsePidResponse("41 05 7B\r>", "05")!.value).toBe(83);
    expect(parsePidResponse("41 05 00\r>", "05")!.value).toBe(-40);
  });

  it("decodes fuel trim as a signed percentage around 128", () => {
    expect(parsePidResponse("41 06 80\r>", "06")!.value).toBe(0);
    expect(parsePidResponse("41 06 A0\r>", "06")!.value).toBeCloseTo(25, 5);
    expect(parsePidResponse("41 06 60\r>", "06")!.value).toBeCloseTo(-25, 5);
  });

  it("decodes control module voltage in millivolts", () => {
    // 0x3798 = 14232 mV -> 14.23 V, a healthy charging voltage.
    expect(parsePidResponse("41 42 37 98\r>", "42")!.value).toBeCloseTo(14.232, 3);
  });

  it("decodes vehicle speed directly", () => {
    expect(parsePidResponse("41 0D 50\r>", "0D")!.value).toBe(80);
  });

  it("returns null for an unsupported PID instead of aborting the scan", () => {
    expect(parsePidResponse("NO DATA\r>", "0C")).toBeNull();
    expect(parsePidResponse("41 0C 1A F8\r>", "05")).toBeNull();
    expect(parsePidResponse("41 05 7B\r>", "ZZ")).toBeNull();
  });

  it("returns null when the reply is truncated mid-value", () => {
    // RPM needs two bytes; one byte would silently decode as a wrong number.
    expect(parsePidResponse("41 0C 1A\r>", "0C")).toBeNull();
  });
});

describe("formatReading", () => {
  it("rounds each unit the way a technician reads it", () => {
    expect(formatReading({ pid: "0C", name: "Engine RPM", unit: "rpm", value: 1726.0 })).toBe("1726 rpm");
    expect(formatReading({ pid: "42", name: "V", unit: "V", value: 14.232 })).toBe("14.23 V");
    expect(formatReading({ pid: "06", name: "T", unit: "%", value: -12.5 })).toBe("-12.5 %");
  });
});
