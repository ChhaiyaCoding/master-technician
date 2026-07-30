/**
 * Diagnostic Session Engine — Milestone 1 (lifecycle & persistence),
 * hardened per Milestone 1 review.
 *
 * This is the Rule Engine layer (decision-authority-model.md §1): it owns
 * the session's lifecycle state machine and enforces the rules that keep
 * the process honest — no skipped steps, no premature completion, no
 * verification without proof. It has no authority over the diagnostic
 * conclusion itself; that belongs to a later milestone (reasoning) and,
 * ultimately, to the mechanic (decision-authority-model.md §3).
 *
 * Every function here is pure: it takes a session and returns a NEW
 * session object. Nothing is ever mutated in place, and no array field is
 * ever cleared or truncated — only ever appended to by later milestones —
 * so the full reasoning history stays recoverable ("the engine must never
 * lose previous reasoning").
 *
 * Diagnostic progression is tracked as four explicit, distinguishable
 * states rather than one loose "best theory" flag:
 *   1. hypothesis exists       — Hypothesis.status === "active"
 *   2. root cause confirmed    — Hypothesis.status === "confirmed" (via confirmRootCause)
 *   3. repair completed        — DiagnosticSession.repairDecision !== null (via recordRepairDecision)
 *   4. verification completed  — DiagnosticSession.status === "verified" (via verifySession)
 * A session may only reach "completed" once BOTH (2) and (3) are true, and
 * the repair must target the very hypothesis that was confirmed.
 */
import type { SystemId, Vehicle } from "@/types";
import type {
  DiagnosticSession,
  RepairDecision,
  SessionStatus,
  VerifiedDiagnosisRecord,
} from "@/types/session";
import { sessionStore, uid } from "@/services/store";
import {
  APP_VERSION,
  isSupportedSchemaVersion,
  SESSION_ENGINE_VERSION,
  SESSION_SCHEMA_VERSION,
  UnsupportedSchemaVersionError,
} from "@/engine/version";

export {
  APP_VERSION,
  SESSION_ENGINE_VERSION,
  SESSION_SCHEMA_VERSION,
  UnsupportedSchemaVersionError,
};

/* ------------------------------- Errors --------------------------------- */

/** Thrown when a lifecycle transition isn't allowed from the current status. */
export class SessionTransitionError extends Error {
  constructor(
    public readonly from: SessionStatus,
    public readonly to: SessionStatus,
  ) {
    super(`Cannot transition session from "${from}" to "${to}".`);
    this.name = "SessionTransitionError";
  }
}

/** Why completeSession() refused to complete the session. */
export type PrematureCompletionReason =
  | "root_cause_not_confirmed"
  | "repair_not_recorded"
  | "repair_mismatched_root_cause";

const PREMATURE_COMPLETION_MESSAGES: Record<PrematureCompletionReason, string> = {
  root_cause_not_confirmed:
    "Cannot complete a session until the leading theory has been " +
    "explicitly confirmed as the root cause — a hypothesis alone is not " +
    "enough (confirm it with confirmRootCause() first).",
  repair_not_recorded:
    "Cannot complete a session until a repair decision has been recorded " +
    "(use recordRepairDecision()).",
  repair_mismatched_root_cause:
    "Cannot complete a session — the recorded repair does not address the " +
    "confirmed root cause.",
};

/** Thrown when completing a session before diagnosis has genuinely concluded. */
export class PrematureCompletionError extends Error {
  constructor(public readonly reason: PrematureCompletionReason) {
    super(PREMATURE_COMPLETION_MESSAGES[reason]);
    this.name = "PrematureCompletionError";
  }
}

/** Thrown when verification is attempted without all six conditions met. */
export class VerificationIncompleteError extends Error {
  constructor(public readonly failedConditions: string[]) {
    super(
      `Cannot verify diagnosis — unmet condition(s): ${failedConditions.join(", ")}`,
    );
    this.name = "VerificationIncompleteError";
  }
}

/* --------------------------- State machine ------------------------------- */

const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  active: ["paused", "completed", "abandoned"],
  paused: ["active", "abandoned"],
  completed: ["verified", "abandoned"],
  verified: [],
  abandoned: [],
};

function assertTransition(session: DiagnosticSession, to: SessionStatus): void {
  if (!ALLOWED_TRANSITIONS[session.status].includes(to)) {
    throw new SessionTransitionError(session.status, to);
  }
}

/**
 * Guard for operations that only make sense while diagnosis is ongoing.
 * Shared with other engine modules (e.g. evidenceEngine.ts) so every part
 * of the Rule Engine agrees on what "active" is allowed to mean.
 */
export function assertSessionActive(session: DiagnosticSession): void {
  if (session.status !== "active") {
    throw new Error(
      `This operation requires an active session (current status: "${session.status}").`,
    );
  }
}

/* --------------------------------- Create --------------------------------- */

export interface CreateSessionInput {
  vehicle: Vehicle;
  complaint?: string;
  system?: SystemId | null;
}

/** Create a brand-new diagnostic session in the "active" state. */
export function createSession(input: CreateSessionInput): DiagnosticSession {
  const now = Date.now();
  return {
    id: uid("session"),
    status: "active",
    createdAt: now,
    updatedAt: now,
    pausedAt: null,
    completedAt: null,

    schemaVersion: SESSION_SCHEMA_VERSION,
    engineVersion: SESSION_ENGINE_VERSION,
    createdWithAppVersion: APP_VERSION,

    vehicle: input.vehicle,
    system: input.system ?? null,

    complaint: input.complaint ?? "",
    symptoms: [],
    dtcs: [],

    evidenceLog: [],
    hypotheses: [],
    askedQuestions: [],
    givenAnswers: [],
    completedTests: [],

    currentReasoning: "",
    currentBestTheory: null,
    remainingUncertainty: "",

    currentNextAction: null,
    actionLog: [],
    actionHistory: [],

    repairDecision: null,
    overrides: [],
    verifiedDiagnosis: null,
  };
}

/* ---------------------------- Diagnostic progression ------------------------ */

/**
 * Confirm a specific hypothesis as the root cause. This does not decide
 * WHICH hypothesis deserves confirmation — that judgment belongs to the
 * reasoning layer and, ultimately, the mechanic (decision-authority-model.md
 * §3). This function only records that the confirmation has happened.
 */
export function confirmRootCause(
  session: DiagnosticSession,
  hypothesisId: string,
): DiagnosticSession {
  assertSessionActive(session);
  const hypothesis = session.hypotheses.find((h) => h.id === hypothesisId);
  if (!hypothesis) {
    throw new Error(
      `Cannot confirm root cause: hypothesis "${hypothesisId}" does not exist in this session.`,
    );
  }
  if (hypothesis.status === "eliminated") {
    throw new Error(
      `Cannot confirm hypothesis "${hypothesisId}" as the root cause — it has already been eliminated by the evidence.`,
    );
  }
  const now = Date.now();
  return {
    ...session,
    updatedAt: now,
    currentBestTheory: hypothesis.id,
    hypotheses: session.hypotheses.map((h) =>
      h.id === hypothesis.id ? { ...h, status: "confirmed" as const } : h,
    ),
  };
}

export interface RecordRepairDecisionInput {
  rootCauseHypothesisId: string;
  repairPerformed: string;
}

/**
 * Record the mechanic's final repair decision. May only target a
 * hypothesis that has already reached status "confirmed" — this is the
 * Rule Engine's "no parts cannon" guard applied at the data layer, not
 * just at completion time.
 */
export function recordRepairDecision(
  session: DiagnosticSession,
  input: RecordRepairDecisionInput,
): DiagnosticSession {
  assertSessionActive(session);
  const hypothesis = session.hypotheses.find(
    (h) => h.id === input.rootCauseHypothesisId,
  );
  if (!hypothesis) {
    throw new Error(
      `Cannot record a repair decision: hypothesis "${input.rootCauseHypothesisId}" does not exist in this session.`,
    );
  }
  if (hypothesis.status !== "confirmed") {
    throw new Error(
      `Cannot record a repair decision for hypothesis "${hypothesis.id}" — ` +
        `it has not been confirmed as the root cause yet (status: ` +
        `"${hypothesis.status}"). Confirm the root cause first.`,
    );
  }
  const now = Date.now();
  const record: RepairDecision = {
    id: uid("repair"),
    rootCauseHypothesisId: hypothesis.id,
    repairPerformed: input.repairPerformed,
    decidedAt: now,
  };
  return { ...session, updatedAt: now, repairDecision: record };
}

/* -------------------------------- Lifecycle -------------------------------- */

/** Set an active session aside without losing any of its state. */
export function pauseSession(session: DiagnosticSession): DiagnosticSession {
  assertTransition(session, "paused");
  const now = Date.now();
  return { ...session, status: "paused", pausedAt: now, updatedAt: now };
}

/** Bring a paused session back to active. */
export function resumeSession(session: DiagnosticSession): DiagnosticSession {
  assertTransition(session, "active");
  const now = Date.now();
  return { ...session, status: "active", pausedAt: null, updatedAt: now };
}

/**
 * Mark a session's diagnostic reasoning as concluded. Requires BOTH:
 *   1. the current best theory has been explicitly confirmed as the root
 *      cause (Hypothesis.status === "confirmed", not merely "active"), and
 *   2. a repair decision has been recorded against that same hypothesis.
 * This is the Rule Engine's guard against a premature conclusion
 * (decision-authority-model.md §1: "preventing premature repair
 * recommendations"). Verification remains a separate, later gate.
 */
export function completeSession(session: DiagnosticSession): DiagnosticSession {
  assertTransition(session, "completed");

  const rootCause = session.currentBestTheory
    ? session.hypotheses.find((h) => h.id === session.currentBestTheory)
    : undefined;
  if (!rootCause || rootCause.status !== "confirmed") {
    throw new PrematureCompletionError("root_cause_not_confirmed");
  }

  if (!session.repairDecision) {
    throw new PrematureCompletionError("repair_not_recorded");
  }
  if (session.repairDecision.rootCauseHypothesisId !== rootCause.id) {
    throw new PrematureCompletionError("repair_mismatched_root_cause");
  }

  const now = Date.now();
  return { ...session, status: "completed", completedAt: now, updatedAt: now };
}

/** End a session without a resolution, from any non-terminal state. */
export function abandonSession(session: DiagnosticSession): DiagnosticSession {
  assertTransition(session, "abandoned");
  return { ...session, status: "abandoned", updatedAt: Date.now() };
}

/* ----------------------------- Verified Diagnosis --------------------------- */

const VERIFICATION_CHECKS: {
  label: string;
  isSatisfied: (r: VerifiedDiagnosisRecord) => boolean;
}[] = [
  {
    label: "symptom confirmed",
    isSatisfied: (r) => r.symptomConfirmed === true,
  },
  {
    label: "inspection result supports the root cause",
    isSatisfied: (r) => r.inspectionSupportsRootCause === true,
  },
  {
    label: "a repair was performed",
    isSatisfied: (r) => r.repairPerformed.trim().length > 0,
  },
  {
    label: "the original symptom disappeared",
    isSatisfied: (r) => r.symptomResolved === true,
  },
  {
    // null = not applicable to this fault (no DTC involved) — satisfied.
    // false = a DTC returned — blocks verification.
    label: "DTCs do not return",
    isSatisfied: (r) => r.dtcsClearedAndStayCleared !== false,
  },
  {
    label: "the mechanic confirmed the vehicle is fixed",
    isSatisfied: (r) => r.mechanicConfirmed === true,
  },
];

/** Evaluate the six Verified Diagnosis conditions without mutating anything. */
export function evaluateVerification(record: VerifiedDiagnosisRecord): {
  passed: boolean;
  failedConditions: string[];
} {
  const failedConditions = VERIFICATION_CHECKS.filter(
    (c) => !c.isSatisfied(record),
  ).map((c) => c.label);
  return { passed: failedConditions.length === 0, failedConditions };
}

/**
 * Verify a completed session's diagnosis. All six conditions
 * (decision-authority-model.md §4) must be true. `verifiedDiagnosis` is
 * populated ONLY on the object this function returns after a successful
 * check — it is never set anywhere else, and a failed attempt throws
 * before producing any session object at all, so the caller's original
 * session reference is always left untouched. Only a verified diagnosis
 * may ever feed the Learning Engine (decision-authority-model.md §5).
 */
export function verifySession(
  session: DiagnosticSession,
  record: VerifiedDiagnosisRecord,
): DiagnosticSession {
  assertTransition(session, "verified");
  const { passed, failedConditions } = evaluateVerification(record);
  if (!passed) {
    throw new VerificationIncompleteError(failedConditions);
  }
  const now = Date.now();
  return {
    ...session,
    status: "verified",
    updatedAt: now,
    verifiedDiagnosis: { ...record, verifiedAt: now },
  };
}

/* -------------------------------- Persistence ------------------------------- */

/** Persist a session (create or update). */
export function saveSession(session: DiagnosticSession): DiagnosticSession {
  return sessionStore.save(session);
}

/**
 * Load a previously saved session by id. Refuses (throws) a session whose
 * schemaVersion this build doesn't support, rather than silently returning
 * a shape the rest of the engine was never designed to handle.
 */
export function loadSession(id: string): DiagnosticSession | undefined {
  const session = sessionStore.get(id);
  if (!session) return undefined;
  if (!isSupportedSchemaVersion(session.schemaVersion)) {
    throw new UnsupportedSchemaVersionError(session.id, session.schemaVersion);
  }
  return session;
}
