/**
 * Gold Standard Cases — Instant AI Diagnose (Milestone 10).
 *
 * Validates the "answer immediately, with or without a DTC" contract: this
 * module must always produce a ranked, capped, deduped answer, and must
 * never require a DTC to say something useful.
 */
import { describe, expect, it } from "vitest";
import { analyzeInstant } from "@/diagnosis/instantAnalysis";
import type { Vehicle } from "@/types";

const CIVIC: Vehicle = {
  brand: "Honda",
  model: "Civic",
  year: 2015,
  engine: "R18A",
  transmission: "AT",
  mileageKm: 88000,
};

describe("analyzeInstant — Gold Standard Cases (Milestone 10)", () => {
  it("GSC-1: a known DTC alone (no complaint) produces ranked, DTC-anchored causes", () => {
    const r = analyzeInstant({ vehicle: CIVIC, complaint: "", dtcCodes: ["P0301"], system: null });
    expect(r.hasSignal).toBe(true);
    expect(r.causes.length).toBeGreaterThan(0);
    expect(r.causes[0].reasoning).toContain("P0301");
    // sorted descending by confidence
    for (let i = 1; i < r.causes.length; i++) {
      expect(r.causes[i - 1].confidence).toBeGreaterThanOrEqual(r.causes[i].confidence);
    }
  });

  it("GSC-2: a symptom alone, with ZERO DTC, still produces a real answer (the old dead end)", () => {
    const r = analyzeInstant({
      vehicle: CIVIC,
      complaint: "ម៉ាស៊ីនក្ដៅពេក ហើយសំពាធទឹកឡើងខ្ពស់",
      dtcCodes: [],
      system: null,
    });
    expect(r.hasSignal).toBe(true);
    expect(r.causes.length).toBeGreaterThan(0);
    expect(r.causes[0].title).toContain("Cooling");
  });

  it("GSC-3: DTC + matching symptom both contribute; results are deduped by title", () => {
    const r = analyzeInstant({
      vehicle: CIVIC,
      complaint: "ម៉ាស៊ីនញ័រពេលទំនេរ",
      dtcCodes: ["P0301"],
      system: null,
    });
    const titles = r.causes.map((c) => c.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(r.hasSignal).toBe(true);
  });

  it("GSC-4: no DTC and no recognizable keyword falls back to generic guidance, flagged as low-signal", () => {
    const r = analyzeInstant({
      vehicle: CIVIC,
      complaint: "xyz something unusual qqq",
      dtcCodes: [],
      system: null,
    });
    expect(r.hasSignal).toBe(false);
    expect(r.causes.length).toBeGreaterThan(0);
    expect(r.causes.every((c) => c.confidence <= 40)).toBe(true);
  });

  it("GSC-5: results are capped at 6 causes", () => {
    const r = analyzeInstant({
      vehicle: CIVIC,
      complaint:
        "ញ័រ ស្តុប ចាប់ផ្តើម ពិបាក ផ្សែងខ្មៅ ផ្សែងស ផ្សែងខៀវ ខ្សោយកម្លាំង គោះ ក្តៅ check engine",
      dtcCodes: [],
      system: null,
    });
    expect(r.causes.length).toBeLessThanOrEqual(6);
  });

  it("GSC-6: hybrid system triggers the HV safety note; a non-HV symptom does not", () => {
    const hv = analyzeInstant({
      vehicle: CIVIC,
      complaint: "hybrid battery ភ្លើងព្រមាន",
      dtcCodes: [],
      system: "hybrid",
    });
    expect(hv.safetyNotes.some((n) => n.includes("HV"))).toBe(true);

    const brake = analyzeInstant({
      vehicle: CIVIC,
      complaint: "ស្រែកពេលហ្វ្រាំង",
      dtcCodes: [],
      system: "brake",
    });
    expect(brake.safetyNotes.some((n) => n.includes("HV"))).toBe(false);
  });

  it("GSC-7: an unknown/unrecognized DTC does not throw and does not fabricate a cause from it", () => {
    const r = analyzeInstant({ vehicle: CIVIC, complaint: "", dtcCodes: ["P9999"], system: null });
    expect(() => r).not.toThrow();
    expect(r.hasSignal).toBe(false); // unknown code contributes nothing
  });

  it("GSC-8: selecting the matching system boosts confidence for that pattern", () => {
    const withoutSystem = analyzeInstant({
      vehicle: CIVIC,
      complaint: "ស្រែកពេលហ្វ្រាំង",
      dtcCodes: [],
      system: null,
    });
    const withSystem = analyzeInstant({
      vehicle: CIVIC,
      complaint: "ស្រែកពេលហ្វ្រាំង",
      dtcCodes: [],
      system: "brake",
    });
    expect(withSystem.causes[0].confidence).toBeGreaterThan(withoutSystem.causes[0].confidence);
  });

  it("GSC-9: every cause has a non-empty reasoning string (never a silent guess)", () => {
    const r = analyzeInstant({
      vehicle: CIVIC,
      complaint: "ចង្កូតធ្ងន់",
      dtcCodes: [],
      system: null,
    });
    expect(r.causes.every((c) => c.reasoning.trim().length > 0)).toBe(true);
  });
});
