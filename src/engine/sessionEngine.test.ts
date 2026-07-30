/**
 * Gold Standard Cases — Diagnostic Session Engine, Milestone 1
 * (lifecycle & persistence), hardened per Milestone 1 review.
 *
 * These cases are the acceptance criteria for Milestone 1. The
 * implementation is only considered complete once every case here passes.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  abandonSession,
  APP_VERSION,
  completeSession,
  confirmRootCause,
  createSession,
  evaluateVerification,
  loadSession,
  pauseSession,
  PrematureCompletionError,
  recordRepairDecision,
  resumeSession,
  saveSession,
  SESSION_ENGINE_VERSION,
  SESSION_SCHEMA_VERSION,
  SessionTransitionError,
  UnsupportedSchemaVersionError,
  verifySession,
  VerificationIncompleteError,
} from "@/engine/sessionEngine";
import type { DiagnosticSession, VerifiedDiagnosisRecord } from "@/types/session";
import type { Vehicle } from "@/types";

// The same Hiace 2008 diesel used throughout the diagnostic-framework and
// interactive-test-flow docs — kept consistent for continuity across specs.
const HIACE: Vehicle = {
  brand: "Toyota",
  model: "Hiace",
  year: 2008,
  engine: "1KD-FTV",
  transmission: "MT",
  mileageKm: 320000,
};

/** A session with a leading hypothesis that is NOT yet confirmed —
 * represents "hypothesis exists" only, the state completeSession() must
 * refuse to complete from. */
function withLeadingHypothesis(
  session: DiagnosticSession,
  hypothesisId = "hyp_1",
): DiagnosticSession {
  const now = Date.now();
  return {
    ...session,
    hypotheses: [
      {
        id: hypothesisId,
        title: "Ignition coil #1 weak",
        description: "Matches the misfire pattern; not yet isolated by a swap test.",
        systemId: "engine",
        failureDomain: "control",
        status: "active",
        rank: 1,
        supportingEvidenceIds: [],
        contradictingEvidenceIds: [],
        missingEvidenceRequirements: [],
        createdAt: now,
        updatedAt: now,
        revisions: [],
      },
    ],
    currentBestTheory: hypothesisId,
  };
}

/** A fully completable session: root cause confirmed AND repair recorded,
 * built through the real engine functions (not hand-constructed). */
function readyToComplete(complaint = "Rough idle."): DiagnosticSession {
  const leading = withLeadingHypothesis(
    createSession({ vehicle: HIACE, complaint }),
  );
  const confirmed = confirmRootCause(leading, "hyp_1");
  return recordRepairDecision(confirmed, {
    rootCauseHypothesisId: "hyp_1",
    repairPerformed: "Replaced ignition coil #1",
  });
}

function withoutUpdatedAt(session: DiagnosticSession) {
  return { ...session, updatedAt: 0 };
}

const FULLY_VERIFIED_RECORD: VerifiedDiagnosisRecord = {
  symptomConfirmed: true,
  inspectionSupportsRootCause: true,
  repairPerformed: "Replaced injector #1",
  symptomResolved: true,
  dtcsClearedAndStayCleared: true,
  mechanicConfirmed: true,
  verifiedAt: null,
};

beforeEach(() => {
  localStorage.clear();
});

describe("Diagnostic Session Engine — Gold Standard Cases (Milestone 1)", () => {
  it("GSC-1: creates a new session in the active state with every required field initialized", () => {
    const session = createSession({
      vehicle: HIACE,
      complaint: "Starts, runs briefly, stalls, restarts after resting.",
    });

    expect(session.status).toBe("active");
    expect(session.vehicle).toEqual(HIACE);
    expect(session.complaint).toBe(
      "Starts, runs briefly, stalls, restarts after resting.",
    );
    expect(session.symptoms).toEqual([]);
    expect(session.dtcs).toEqual([]);
    expect(session.evidenceLog).toEqual([]);
    expect(session.hypotheses).toEqual([]);
    expect(session.askedQuestions).toEqual([]);
    expect(session.givenAnswers).toEqual([]);
    expect(session.completedTests).toEqual([]);
    expect(session.currentReasoning).toBe("");
    expect(session.currentBestTheory).toBeNull();
    expect(session.remainingUncertainty).toBe("");
    expect(session.currentNextAction).toBeNull();
    expect(session.actionLog).toEqual([]);
    expect(session.actionHistory).toEqual([]);
    expect(session.repairDecision).toBeNull();
    expect(session.overrides).toEqual([]);
    expect(session.verifiedDiagnosis).toBeNull();
    expect(session.id).toMatch(/^session_/);
  });

  it("GSC-2: pausing and resuming preserves every field exactly — no reasoning is lost", () => {
    const original = confirmRootCause(
      withLeadingHypothesis(
        createSession({ vehicle: HIACE, complaint: "Stalls repeatedly." }),
      ),
      "hyp_1",
    );

    const paused = pauseSession(original);
    expect(paused.status).toBe("paused");
    expect(paused.pausedAt).not.toBeNull();

    const resumed = resumeSession(paused);
    expect(resumed.status).toBe("active");
    expect(resumed.pausedAt).toBeNull();

    expect(resumed.hypotheses).toEqual(original.hypotheses);
    expect(resumed.currentBestTheory).toBe(original.currentBestTheory);
    expect(resumed.complaint).toBe(original.complaint);
    expect(resumed.vehicle).toEqual(original.vehicle);
  });

  it("GSC-3: refuses to complete a session with no hypothesis at all", () => {
    const session = createSession({ vehicle: HIACE, complaint: "Rough idle." });
    expect(() => completeSession(session)).toThrow(PrematureCompletionError);
  });

  it("GSC-4: refuses to complete from a hypothesis alone — a leading theory is not a confirmed root cause", () => {
    const leadingOnly = withLeadingHypothesis(
      createSession({ vehicle: HIACE, complaint: "Rough idle." }),
    );
    // The hypothesis exists and is even the "current best theory" — but its
    // status is only "active", never explicitly confirmed.
    expect(leadingOnly.hypotheses[0].status).toBe("active");

    expect(() => completeSession(leadingOnly)).toThrow(PrematureCompletionError);
    try {
      completeSession(leadingOnly);
    } catch (e) {
      expect(e).toBeInstanceOf(PrematureCompletionError);
      expect((e as PrematureCompletionError).reason).toBe(
        "root_cause_not_confirmed",
      );
    }
  });

  it("GSC-5: refuses to complete a confirmed root cause with no repair decision recorded", () => {
    const confirmedNoRepair = confirmRootCause(
      withLeadingHypothesis(
        createSession({ vehicle: HIACE, complaint: "Rough idle." }),
      ),
      "hyp_1",
    );
    expect(confirmedNoRepair.hypotheses[0].status).toBe("confirmed");
    expect(confirmedNoRepair.repairDecision).toBeNull();

    expect(() => completeSession(confirmedNoRepair)).toThrow(
      PrematureCompletionError,
    );
    try {
      completeSession(confirmedNoRepair);
    } catch (e) {
      expect((e as PrematureCompletionError).reason).toBe("repair_not_recorded");
    }
  });

  it("GSC-6: completes a session once the root cause is confirmed AND the repair decision is recorded", () => {
    const completed = completeSession(readyToComplete());
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).not.toBeNull();
  });

  it("GSC-7: confirmRootCause rejects an unknown hypothesis id and an eliminated hypothesis", () => {
    const session = withLeadingHypothesis(
      createSession({ vehicle: HIACE, complaint: "Rough idle." }),
    );
    expect(() => confirmRootCause(session, "does_not_exist")).toThrow();

    const eliminated: DiagnosticSession = {
      ...session,
      hypotheses: session.hypotheses.map((h) => ({
        ...h,
        status: "eliminated" as const,
      })),
    };
    expect(() => confirmRootCause(eliminated, "hyp_1")).toThrow();
  });

  it("GSC-8: recordRepairDecision rejects a hypothesis that isn't confirmed (no parts cannon at the data layer)", () => {
    const leadingOnly = withLeadingHypothesis(
      createSession({ vehicle: HIACE, complaint: "Rough idle." }),
    );
    expect(() =>
      recordRepairDecision(leadingOnly, {
        rootCauseHypothesisId: "hyp_1",
        repairPerformed: "Replaced ignition coil #1",
      }),
    ).toThrow();
  });

  it("GSC-9: refuses to verify a diagnosis missing any of the six conditions, and says which", () => {
    const completed = completeSession(readyToComplete());
    const incomplete: VerifiedDiagnosisRecord = {
      ...FULLY_VERIFIED_RECORD,
      symptomResolved: false,
    };

    expect(() => verifySession(completed, incomplete)).toThrow(
      VerificationIncompleteError,
    );

    let caught: unknown;
    try {
      verifySession(completed, incomplete);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(VerificationIncompleteError);
    expect((caught as VerificationIncompleteError).failedConditions).toContain(
      "the original symptom disappeared",
    );
  });

  it("GSC-10: verifies a diagnosis once all six conditions are met, and only then", () => {
    const completed = completeSession(readyToComplete());
    expect(evaluateVerification(FULLY_VERIFIED_RECORD).passed).toBe(true);

    const verified = verifySession(completed, FULLY_VERIFIED_RECORD);
    expect(verified.status).toBe("verified");
    expect(verified.verifiedDiagnosis).not.toBeNull();
    expect(verified.verifiedDiagnosis?.verifiedAt).not.toBeNull();
    expect(verified.verifiedDiagnosis?.mechanicConfirmed).toBe(true);
  });

  it("GSC-11: dtcsClearedAndStayCleared = null (not applicable) does not block verification, but explicit false does", () => {
    const completed = completeSession(readyToComplete());
    const notApplicable: VerifiedDiagnosisRecord = {
      ...FULLY_VERIFIED_RECORD,
      dtcsClearedAndStayCleared: null,
    };
    expect(verifySession(completed, notApplicable).status).toBe("verified");

    const returnedDtc: VerifiedDiagnosisRecord = {
      ...FULLY_VERIFIED_RECORD,
      dtcsClearedAndStayCleared: false,
    };
    expect(() => verifySession(completed, returnedDtc)).toThrow(
      VerificationIncompleteError,
    );
  });

  it("GSC-12: rejects invalid transitions and never leaves a session in a partial state", () => {
    const session = createSession({ vehicle: HIACE, complaint: "Stalls." });

    expect(() => resumeSession(session)).toThrow(SessionTransitionError);
    expect(() => verifySession(session, FULLY_VERIFIED_RECORD)).toThrow(
      SessionTransitionError,
    );

    const verified = verifySession(
      completeSession(readyToComplete("Stalls.")),
      FULLY_VERIFIED_RECORD,
    );
    expect(() => pauseSession(verified)).toThrow(SessionTransitionError);
    expect(() => abandonSession(verified)).toThrow(SessionTransitionError);
  });

  it("GSC-13: save/load round-trips a session with full fidelity (nothing lost)", () => {
    const created = confirmRootCause(
      withLeadingHypothesis(
        createSession({
          vehicle: HIACE,
          complaint: "Starts, runs briefly, stalls, restarts after resting.",
          system: "engine",
        }),
      ),
      "hyp_1",
    );
    const withEvidence: DiagnosticSession = {
      ...created,
      dtcs: ["P0093"],
      askedQuestions: [
        {
          id: "q_1",
          questionText: "Does it relate to temperature or run time?",
          systemId: "engine",
          askedAt: Date.now(),
        },
      ],
    };

    saveSession(withEvidence);
    const loaded = loadSession(withEvidence.id);

    expect(loaded).toBeDefined();
    expect(withoutUpdatedAt(loaded!)).toEqual(withoutUpdatedAt(withEvidence));
    expect(loaded!.dtcs).toEqual(["P0093"]);
    expect(loaded!.askedQuestions).toHaveLength(1);
    expect(loaded!.currentBestTheory).toBe(withEvidence.currentBestTheory);
  });

  it("GSC-14: abandon is reachable from active, paused, and completed — but not from verified", () => {
    const active = createSession({ vehicle: HIACE, complaint: "No start." });
    expect(abandonSession(active).status).toBe("abandoned");

    const paused = pauseSession(
      createSession({ vehicle: HIACE, complaint: "No start." }),
    );
    expect(abandonSession(paused).status).toBe("abandoned");

    const completed = completeSession(readyToComplete("No start."));
    expect(abandonSession(completed).status).toBe("abandoned");
  });

  it("GSC-15: verifiedDiagnosis stays absent (null) across active, paused, abandoned, and completed-but-unverified states", () => {
    const active = createSession({ vehicle: HIACE, complaint: "No start." });
    expect(active.verifiedDiagnosis).toBeNull();

    const paused = pauseSession(active);
    expect(paused.verifiedDiagnosis).toBeNull();

    const abandoned = abandonSession(active);
    expect(abandoned.verifiedDiagnosis).toBeNull();

    const completed = completeSession(readyToComplete("No start."));
    expect(completed.verifiedDiagnosis).toBeNull();
    expect(completed.status).toBe("completed");
  });

  it("GSC-16: verifiedDiagnosis is created only by a successful verifySession() call — a failed attempt leaves the original session untouched", () => {
    const completed = completeSession(readyToComplete("No start."));
    const incomplete: VerifiedDiagnosisRecord = {
      ...FULLY_VERIFIED_RECORD,
      mechanicConfirmed: false,
    };

    expect(() => verifySession(completed, incomplete)).toThrow(
      VerificationIncompleteError,
    );
    // The failed attempt must not have mutated the session passed in.
    expect(completed.verifiedDiagnosis).toBeNull();
    expect(completed.status).toBe("completed");

    const verified = verifySession(completed, FULLY_VERIFIED_RECORD);
    expect(verified.verifiedDiagnosis).not.toBeNull();
    // The original object reference remains unaffected by the later call —
    // verifySession never mutates in place, it only returns a new object.
    expect(completed.verifiedDiagnosis).toBeNull();
  });

  it("GSC-17: session creation stamps schemaVersion, engineVersion, and createdWithAppVersion", () => {
    const session = createSession({ vehicle: HIACE, complaint: "Rough idle." });
    expect(session.schemaVersion).toBe(SESSION_SCHEMA_VERSION);
    expect(session.engineVersion).toBe(SESSION_ENGINE_VERSION);
    expect(session.createdWithAppVersion).toBe(APP_VERSION);
  });

  it("GSC-18: loadSession safely rejects a session with an unsupported (future) schema version", () => {
    const session = createSession({ vehicle: HIACE, complaint: "Rough idle." });
    const fromTheFuture: DiagnosticSession = { ...session, schemaVersion: 999 };
    saveSession(fromTheFuture);

    expect(() => loadSession(fromTheFuture.id)).toThrow(
      UnsupportedSchemaVersionError,
    );
    try {
      loadSession(fromTheFuture.id);
    } catch (e) {
      expect(e).toBeInstanceOf(UnsupportedSchemaVersionError);
      expect((e as UnsupportedSchemaVersionError).foundSchemaVersion).toBe(999);
    }
  });
});
