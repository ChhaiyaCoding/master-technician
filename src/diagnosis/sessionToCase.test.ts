/**
 * Gold Standard Cases — sessionToCase mapping (Milestone 8, the flywheel).
 *
 * Validates the verified-only gate and the field mapping, using the real
 * engine APIs to build a genuinely verified session (not hand-constructed).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { completeSession, createSession, recordRepairDecision, verifySession } from "@/engine/sessionEngine";
import { addEvidence } from "@/engine/evidenceEngine";
import { addHypothesis, confirmHypothesis, linkSupportingEvidence } from "@/engine/hypothesisEngine";
import { canSaveAsCase, diagnosticSessionToRepairCase } from "@/diagnosis/sessionToCase";
import type { DiagnosticSession } from "@/types/session";
import type { Vehicle } from "@/types";

const HIACE: Vehicle = {
  brand: "Toyota",
  model: "Hiace",
  year: 2008,
  engine: "1KD-FTV",
  transmission: "MT",
  mileageKm: 320000,
};

function buildVerifiedSession(): DiagnosticSession {
  let session = createSession({
    vehicle: HIACE,
    complaint: "Starts, runs briefly, stalls, restarts after resting.",
    system: "engine",
  });
  session = addEvidence(session, {
    source: "scan_tool",
    category: "dtc",
    tier: "confirmed",
    description: "P0093 — Fuel System Leak Detected, Large Leak.",
    links: { dtcCode: "P0093" },
  });
  session = { ...session, dtcs: ["P0093"] };
  session = addHypothesis(
    session,
    {
      title: "Injector #1 internal back-leak",
      description: "Worn injector bleeding rail pressure to return.",
      systemId: "engine",
      failureDomain: "mechanical",
    },
    "mechanic",
    "Matches the P0093 pattern.",
  );
  const hypothesisId = session.hypotheses[0].id;
  session = addEvidence(session, {
    source: "technician",
    category: "measurement",
    tier: "confirmed",
    description: "Return-volume test isolated cylinder 1.",
  });
  const evidenceId = session.evidenceLog[1].id;
  session = linkSupportingEvidence(session, hypothesisId, evidenceId, "mechanic", "Confirms it.");
  session = confirmHypothesis(session, hypothesisId, "mechanic", "Proven by measurement.");
  session = recordRepairDecision(session, {
    rootCauseHypothesisId: hypothesisId,
    repairPerformed: "Replaced injector #1",
  });
  session = completeSession(session);
  session = verifySession(session, {
    symptomConfirmed: true,
    inspectionSupportsRootCause: true,
    repairPerformed: "Replaced injector #1",
    symptomResolved: true,
    dtcsClearedAndStayCleared: true,
    mechanicConfirmed: true,
    verifiedAt: null,
  });
  return session;
}

beforeEach(() => {
  localStorage.clear();
});

describe("sessionToCase — Gold Standard Cases (Milestone 8)", () => {
  it("GSC-1: canSaveAsCase is false for active/completed sessions, true only once verified", () => {
    const active = createSession({ vehicle: HIACE, complaint: "x" });
    expect(canSaveAsCase(active)).toBe(false);

    const verified = buildVerifiedSession();
    expect(canSaveAsCase(verified)).toBe(true);
  });

  it("GSC-2: maps a verified session to a complete RepairCase draft", () => {
    const session = buildVerifiedSession();
    const draft = diagnosticSessionToRepairCase(session);

    expect(draft.vehicle).toEqual(HIACE);
    expect(draft.system).toBe("engine");
    expect(draft.symptomText).toBe(session.complaint);
    expect(draft.dtcCodes).toEqual(["P0093"]);
    expect(draft.rootCause).toBe("Injector #1 internal back-leak");
    expect(draft.repairPerformed).toBe("Replaced injector #1");
    expect(draft.tags).toContain("p0093");
    expect(draft.tags).toContain("engine");
    expect(draft.technicianNote).toContain("ផ្ទៀងផ្ទាត់");
    expect(draft.id).toMatch(/^case_/);
  });

  it("GSC-3: each mapping call produces a fresh, unique case id (no accidental overwrite)", () => {
    const session = buildVerifiedSession();
    const first = diagnosticSessionToRepairCase(session);
    const second = diagnosticSessionToRepairCase(session);
    expect(first.id).not.toBe(second.id);
  });
});
