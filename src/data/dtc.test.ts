/**
 * Data-integrity tests for the DTC knowledge base.
 *
 * Written after Technical Content Audit v1, which found three defects that a
 * human reading 699 entries will never reliably catch, but a machine catches
 * every time:
 *
 *   P0-1  seven common-rail codes told a mechanic to go measure fuel pressure
 *         and look for leaks on a 1,500-2,500 bar system, with no warning.
 *   P0-2  a template generator skipped the Bank 1 Sensor 3 group, shifting six
 *         O2 heater codes by one position — and leaving two different codes
 *         claiming the identical sensor.
 *   P0-3  "PA100" was not an OBD-II code at all, so no scan tool reports it and
 *         the app's own detection regex could not match it: dead data.
 *
 * These are correctness tests about the CONTENT, not the code. Each one exists
 * because the defect it checks for actually shipped.
 */
import { describe, expect, it } from "vitest";
import { DTC_CODES } from "@/data/dtc";

/** Must stay in sync with AiDiagnose's DTC_PATTERN. */
const DTC_SHAPE = /^[PCBU][0-3][0-9A-F]{3}$/;

const byCode = Object.fromEntries(DTC_CODES.map((d) => [d.code, d]));
const textOf = (code: string) => {
  const d = byCode[code];
  return [d.descriptionKm, ...d.possibleCauses, ...d.inspectionFlow, ...d.commonMistakes].join(" ");
};

describe("DTC data — code shape", () => {
  it("every code is a well-formed OBD-II code the app can also detect in free text", () => {
    const bad = DTC_CODES.filter((d) => !DTC_SHAPE.test(d.code)).map((d) => d.code);
    expect(bad).toEqual([]);
  });

  it("has no duplicate codes", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const d of DTC_CODES) {
      if (seen.has(d.code)) dupes.push(d.code);
      seen.add(d.code);
    }
    expect(dupes).toEqual([]);
  });

  it("has no empty required fields", () => {
    const bad = DTC_CODES.filter(
      (d) =>
        !d.titleEn.trim() ||
        !d.titleKm.trim() ||
        !d.descriptionKm.trim() ||
        d.systems.length === 0 ||
        d.possibleCauses.length === 0 ||
        d.inspectionFlow.length === 0,
    ).map((d) => d.code);
    expect(bad).toEqual([]);
  });
});

describe("DTC data — O2 sensor bank/sensor positions (SAE J2012)", () => {
  // Bank and sensor number are a physical address: they tell the mechanic
  // which sensor, on which side of the engine, before or after which catalyst.
  // Getting one wrong sends them to the opposite end of the car.
  const HEATER_BLOCKS: [string, number, number][] = [
    ["P0030", 1, 1], ["P0036", 1, 2], ["P0042", 1, 3],
    ["P0050", 2, 1], ["P0056", 2, 2], ["P0062", 2, 3],
  ];
  const CIRCUIT_BLOCKS: [string, number, number][] = [
    ["P0130", 1, 1], ["P0136", 1, 2], ["P0142", 1, 3],
    ["P0150", 2, 1], ["P0156", 2, 2], ["P0162", 2, 3],
  ];

  function expectPositions(blocks: [string, number, number][], span: number) {
    const wrong: string[] = [];
    for (const [start, bank, sensor] of blocks) {
      const base = Number(start.slice(1));
      for (let i = 0; i < span; i++) {
        const code = "P" + String(base + i).padStart(4, "0");
        const d = byCode[code];
        if (!d) continue; // not every position is in the database yet
        const b = d.titleEn.match(/Bank\s*(\d)/i)?.[1];
        const s = d.titleEn.match(/Sensor\s*(\d)/i)?.[1];
        if (b !== String(bank) || s !== String(sensor)) {
          wrong.push(`${code}: expected B${bank}S${sensor}, got B${b}S${s}`);
        }
      }
    }
    return wrong;
  }

  it("heater control circuit codes sit on the right bank and sensor", () => {
    expect(expectPositions(HEATER_BLOCKS, 3)).toEqual([]);
  });

  it("sensor circuit codes sit on the right bank and sensor", () => {
    expect(expectPositions(CIRCUIT_BLOCKS, 6)).toEqual([]);
  });

  it("no two O2 codes claim the identical bank+sensor+fault", () => {
    // P0050-P0052 and P0056-P0058 both read "Bank 2 Sensor 2" before the fix,
    // making two different codes indistinguishable to the mechanic.
    const o2 = DTC_CODES.filter((d) => /Oxygen Sensor|O2 Sensor/i.test(d.titleEn));
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const d of o2) {
      const key = d.titleEn.toLowerCase().replace(/\s+/g, " ").trim();
      if (seen.has(key)) clashes.push(`${seen.get(key)} and ${d.code}: "${d.titleEn}"`);
      else seen.set(key, d.code);
    }
    expect(clashes).toEqual([]);
  });
});

describe("DTC data — cylinder numbering", () => {
  it("misfire codes name the cylinder their code position means", () => {
    const wrong: string[] = [];
    for (let n = 1; n <= 12; n++) {
      const d = byCode["P03" + String(n).padStart(2, "0")];
      if (!d) continue;
      const m = d.titleEn.match(/Cylinder\s+(\d+)/i);
      if (m && Number(m[1]) !== n) wrong.push(`${d.code} says cylinder ${m[1]}, expected ${n}`);
    }
    expect(wrong).toEqual([]);
  });

  it("injector circuit codes name the cylinder their code position means", () => {
    const wrong: string[] = [];
    for (let cyl = 1; cyl <= 10; cyl++) {
      for (let i = 0; i < 3; i++) {
        const d = byCode["P0" + (261 + (cyl - 1) * 3 + i)];
        if (!d) continue;
        const m = d.titleEn.match(/Cylinder\s*(\d+)/i);
        if (m && Number(m[1]) !== cyl) wrong.push(`${d.code} says cylinder ${m[1]}, expected ${cyl}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("DTC data — safety warnings on hazardous work", () => {
  const hasWarning = (code: string) =>
    /⚠|គ្រោះថ្នាក់|ប្រុងប្រយ័ត្ន|ISOLATE/i.test(textOf(code));

  it("high-voltage hybrid/EV codes warn before the mechanic touches anything", () => {
    // These systems carry enough voltage to kill. The warning is the first
    // inspection step, so it is read before the work, not after.
    const missing = DTC_CODES.filter(
      (d) => d.systems.some((s) => s === "hybrid" || s === "ev") && !hasWarning(d.code),
    ).map((d) => d.code);
    expect(missing).toEqual([]);
  });

  it("airbag/SRS codes warn about accidental deployment", () => {
    const missing = DTC_CODES.filter(
      (d) => d.systems.includes("airbag") && !hasWarning(d.code),
    ).map((d) => d.code);
    expect(missing).toEqual([]);
  });

  it("common-rail fuel pressure codes warn about injection injury", () => {
    // Common rail runs at 1,500-2,500 bar. A pinhole leak at that pressure
    // injects diesel through skin; the usual outcome is tissue necrosis and
    // sometimes amputation. Every one of these codes tells the mechanic to
    // measure pressure or inspect joints, so every one needs the warning.
    const isHighPressureFuel = (titleEn: string) =>
      /fuel rail|rail pressure|fuel pressure regulator|fuel volume regulator|fuel system leak/i.test(
        titleEn,
      );
    const missing = DTC_CODES.filter(
      (d) => isHighPressureFuel(d.titleEn) && !hasWarning(d.code),
    ).map((d) => d.code);
    expect(missing).toEqual([]);
  });
});
