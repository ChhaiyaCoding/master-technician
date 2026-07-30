/**
 * Gold Standard Cases — New-diagnosis bootstrap (Milestone 7).
 *
 * Validates that the entry flow builds a correct DiagnosticSession through
 * the frozen engine APIs, and — crucially — that a DTC never confirms a
 * cause on its own.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { bootstrapSession, guessFailureDomain, MAX_SEED_HYPOTHESES } from "@/diagnosis/bootstrapSession";
import { DTC_BY_CODE } from "@/data/dtc";
import type { Vehicle } from "@/types";

const CIVIC: Vehicle = {
  brand: "Honda",
  model: "Civic",
  year: 2015,
  engine: "R18A 1.8L",
  transmission: "AT",
  mileageKm: 88000,
};

beforeEach(() => {
  localStorage.clear();
});

describe("bootstrapSession — Gold Standard Cases (Milestone 7)", () => {
  it("GSC-1: a known DTC seeds confirmed DTC evidence plus a hypothesis per possible cause", () => {
    const session = bootstrapSession({
      vehicle: CIVIC,
      complaint: "Check engine light on; shakes at idle.",
      system: "engine",
      dtcCodes: ["P0301"],
    });

    expect(session.status).toBe("active");
    expect(session.dtcs).toContain("P0301");

    const dtcEvidence = session.evidenceLog.find((e) => e.links.dtcCode === "P0301");
    expect(dtcEvidence).toBeDefined();
    expect(dtcEvidence!.tier).toBe("confirmed");
    expect(dtcEvidence!.category).toBe("dtc");

    const expectedCauses = DTC_BY_CODE["P0301"].possibleCauses.slice(0, MAX_SEED_HYPOTHESES);
    expect(session.hypotheses).toHaveLength(expectedCauses.length);
    expect(session.hypotheses[0].title).toBe(expectedCauses[0]);
    expect(session.hypotheses.every((h) => h.status === "active")).toBe(true);
    expect(session.hypotheses.every((h) => h.revisions[0].initiatedBy === "rule_engine")).toBe(true);
  });

  it("GSC-2: the DTC is recorded but NEVER linked as supporting evidence to any cause", () => {
    const session = bootstrapSession({
      vehicle: CIVIC,
      complaint: "",
      system: "engine",
      dtcCodes: ["P0301"],
    });
    const dtcEvidence = session.evidenceLog.find((e) => e.links.dtcCode === "P0301")!;

    // No hypothesis references the DTC evidence as supporting or contradicting —
    // a code points at a region, it does not confirm a specific cause.
    const referenced = session.hypotheses.some(
      (h) =>
        h.supportingEvidenceIds.includes(dtcEvidence.id) ||
        h.contradictingEvidenceIds.includes(dtcEvidence.id),
    );
    expect(referenced).toBe(false);
    expect(session.hypotheses.every((h) => h.supportingEvidenceIds.length === 0)).toBe(true);
  });

  it("GSC-3: the complaint is recorded as reported symptom evidence", () => {
    const session = bootstrapSession({
      vehicle: CIVIC,
      complaint: "Shakes at idle and hesitates.",
      system: "engine",
      dtcCodes: [],
    });
    const symptom = session.evidenceLog.find((e) => e.category === "symptom");
    expect(symptom).toBeDefined();
    expect(symptom!.tier).toBe("reported");
    expect(symptom!.description).toBe("Shakes at idle and hesitates.");
    expect(session.hypotheses).toHaveLength(0);
  });

  it("GSC-4: an unknown DTC is recorded as reported evidence with no hypotheses", () => {
    const session = bootstrapSession({
      vehicle: CIVIC,
      complaint: "",
      system: "engine",
      dtcCodes: ["P9999"],
    });
    const dtcEvidence = session.evidenceLog.find((e) => e.links.dtcCode === "P9999");
    expect(dtcEvidence).toBeDefined();
    expect(dtcEvidence!.tier).toBe("reported");
    expect(session.hypotheses).toHaveLength(0);
  });

  it("GSC-5: hypotheses are capped and de-duplicated across multiple DTCs", () => {
    const session = bootstrapSession({
      vehicle: CIVIC,
      complaint: "",
      system: "engine",
      dtcCodes: ["P0300", "P0301", "P0171"],
    });
    expect(session.hypotheses.length).toBeLessThanOrEqual(MAX_SEED_HYPOTHESES);
    const titles = session.hypotheses.map((h) => h.title.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length); // no duplicates
  });

  it("GSC-6: empty / whitespace DTC entries are ignored", () => {
    const session = bootstrapSession({
      vehicle: CIVIC,
      complaint: "Runs rough.",
      system: "engine",
      dtcCodes: ["", "   "],
    });
    expect(session.dtcs).toEqual([]);
    expect(session.evidenceLog.filter((e) => e.category === "dtc")).toHaveLength(0);
  });

  it("GSC-7: guessFailureDomain maps common cause phrasing sensibly and always returns a valid domain", () => {
    expect(guessFailureDomain("Ignition coil weak")).toBe("signal");
    expect(guessFailureDomain("Clogged fuel filter / injector")).toBe("mechanical");
    expect(guessFailureDomain("Corroded ground point")).toBe("ground");
    expect(guessFailureDomain("Low battery voltage / wiring")).toBe("power");
    expect(guessFailureDomain("SCV solenoid control fault")).toBe("control");
    // Unknown phrasing still returns a valid domain (never throws / undefined).
    expect(["power", "ground", "signal", "control", "load", "mechanical"]).toContain(
      guessFailureDomain("something unusual"),
    );
  });
});
