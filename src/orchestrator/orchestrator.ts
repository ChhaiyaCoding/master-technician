/**
 * Diagnostic Orchestrator — Milestone 5.
 *
 * The Orchestrator selects exactly ONE NextAction for the mechanic at a
 * time. It generates no diagnostic knowledge itself — it coordinates
 * DiagnosticSession state (Session/Evidence/Hypothesis Engines), safety
 * rules, and a ReasoningOutput (Reasoning Layer, Milestone 4) into a single
 * recommendation. It never modifies evidence or hypotheses, never confirms
 * a root cause, and never makes a repair decision — those remain the
 * Hypothesis Engine's and the mechanic's alone
 * (decision-authority-model.md).
 *
 * computeNextAction() is a PURE function: (session, reasoningOutput,
 * context) → NextAction, deterministic for identical input. selectNextAction()
 * wraps it with session bookkeeping (idempotent while an action is already
 * active, appends to the append-only actionLog). The five mechanic-response
 * functions (accept/skip/cannotPerform/provideAlternativeResult/override)
 * resolve the current action and hand control back to selectNextAction()
 * for the next call.
 */
import type { SystemId } from "@/types";
import type {
  ActionResponse,
  DiagnosticSession,
  ExpectedResultType,
  FailureDomain,
  Hypothesis,
  NextAction,
  NextActionType,
  TechnicianOverride,
} from "@/types/session";
import type { ReasoningOutput, TestRecommendation } from "@/types/reasoning";
import { uid } from "@/services/store";
import { hasQualifyingConfirmationEvidence } from "@/engine/hypothesisEngine";

/* ------------------------------- Errors --------------------------------- */

export class NoActiveActionError extends Error {
  constructor() {
    super("There is no active NextAction to respond to for this session.");
    this.name = "NoActiveActionError";
  }
}

export class ActionMismatchError extends Error {
  constructor(
    public readonly providedActionId: string,
    public readonly currentActionId: string,
  ) {
    super(
      `Action "${providedActionId}" is not the currently active action ` +
        `("${currentActionId}"). Only the current action may be responded to.`,
    );
    this.name = "ActionMismatchError";
  }
}

/* -------------------------------- Context --------------------------------- */

export interface OrchestratorContext {
  /**
   * Tools currently on hand. When provided as an EMPTY array, tool-requiring
   * actions (inspection/measurement_test) are treated as unavailable when
   * searching for a Cannot-Perform alternative. Omitted/undefined means
   * "assume available" — the common case.
   */
  availableTools?: string[];
  /**
   * Whether the mechanic is currently available to act. Informational only
   * — reserved for future scheduling/UI use; it does not currently change
   * which action is selected.
   */
  mechanicAvailable?: boolean;
}

/* ------------------------------ Determinism ------------------------------- */

/** A stable, content-derived id — never random, never time-based. */
function stableId(prefix: string, parts: string[]): string {
  return `${prefix}_${[...parts].sort().join("~")}`;
}

/* ------------------------------- Guards ----------------------------------- */

function assertSessionNotPaused(session: DiagnosticSession): void {
  if (session.status === "paused") {
    throw new Error("Cannot select or respond to actions while the session is paused.");
  }
}

function assertReason(reason: string, context: string): void {
  if (!reason || reason.trim().length === 0) {
    throw new Error(`${context} requires a reason.`);
  }
}

function requireCurrentAction(session: DiagnosticSession, actionId: string): NextAction {
  if (!session.currentNextAction) {
    throw new NoActiveActionError();
  }
  if (session.currentNextAction.id !== actionId) {
    throw new ActionMismatchError(actionId, session.currentNextAction.id);
  }
  return session.currentNextAction;
}

/* ------------------------------- Safety ------------------------------------ */

const SAFETY_CRITICAL_CONTENT: Partial<
  Record<SystemId, { instruction: string; requiredTool: string; warning: string }>
> = {
  hybrid: {
    instruction:
      "Isolate the high-voltage system before any physical inspection: de-energize, " +
      "remove the service plug, and verify zero volts with a rated meter before proceeding.",
    requiredTool: "Insulated gloves (class 0), CAT III-rated meter, HV lockout kit",
    warning:
      "High-voltage system — incorrect handling can be fatal. Do not proceed until " +
      "isolation is verified.",
  },
  ev: {
    instruction:
      "Isolate the high-voltage system before any physical inspection: de-energize, " +
      "remove the service plug, and verify zero volts with a rated meter before proceeding.",
    requiredTool: "Insulated gloves (class 0), CAT III-rated meter, HV lockout kit",
    warning:
      "High-voltage system — incorrect handling can be fatal. Do not proceed until " +
      "isolation is verified.",
  },
  airbag: {
    instruction:
      "Disconnect the battery and wait for the reserve capacitor to discharge before " +
      "working near SRS components. Do not probe squib circuits directly.",
    requiredTool: "None beyond standard hand tools; never probe squib circuits with a meter.",
    warning: "SRS/Airbag system — incorrect handling can cause unintended deployment.",
  },
};

function isSafetyAcknowledged(session: DiagnosticSession): boolean {
  const safetyAction = session.actionLog.find((a) => a.type === "safety_instruction");
  if (!safetyAction) return false;
  return session.actionHistory.some(
    (r) => r.actionId === safetyAction.id && r.kind === "accepted",
  );
}

function buildSafetyAction(session: DiagnosticSession): NextAction | null {
  if (!session.system) return null;
  const content = SAFETY_CRITICAL_CONTENT[session.system];
  if (!content) return null;
  if (isSafetyAcknowledged(session)) return null;

  return {
    id: stableId("action_safety", [session.id, session.system]),
    type: "safety_instruction",
    title: `Safety: ${session.system.toUpperCase()} system`,
    instruction: content.instruction,
    reason: `This session's system (${session.system}) is safety-critical — required before any other step.`,
    expectedResultType: "acknowledgement",
    requiredTool: content.requiredTool,
    safetyWarning: content.warning,
    sourceRecommendationIds: [],
    createdAt: Date.now(),
  };
}

/* ---------------------------- Terminal-state actions ------------------------ */

function buildSessionCompleteAction(session: DiagnosticSession): NextAction | null {
  if (session.status !== "verified" && session.status !== "abandoned") return null;
  return {
    id: stableId("action_complete", [session.id, session.status]),
    type: "session_complete",
    title: "Session complete",
    instruction: "Nothing further to do — this diagnostic session has concluded.",
    reason: `Session status is "${session.status}".`,
    expectedResultType: "none",
    sourceRecommendationIds: [],
    createdAt: Date.now(),
  };
}

function buildRepairVerificationAction(session: DiagnosticSession): NextAction | null {
  if (session.status !== "completed" || !session.repairDecision) return null;
  return {
    id: stableId("action_verify_repair", [session.id, session.repairDecision.id]),
    type: "repair_verification",
    title: "Verify the repair",
    instruction:
      `Recreate the original conditions ("${session.complaint}") and confirm the symptom ` +
      `is gone and any DTCs stay cleared.`,
    reason: `A repair has been recorded ("${session.repairDecision.repairPerformed}") but not yet verified.`,
    expectedResultType: "ok_not_ok_unknown",
    sourceRecommendationIds: [session.repairDecision.id],
    createdAt: Date.now(),
  };
}

/* ------------------------------ Contradictions ------------------------------ */

function buildContradictionAction(
  session: DiagnosticSession,
  output: ReasoningOutput,
): NextAction | null {
  if (output.contradictions.length === 0) return null;
  const top = output.contradictions[0]; // already deterministically sorted by the Reasoning Layer
  return {
    id: stableId("action_contradiction", [session.id, top.id]),
    type: "review_contradiction",
    title: "Review conflicting evidence",
    instruction: `Re-examine: ${top.explanation}`,
    reason: top.explanation,
    expectedResultType: "free_text",
    sourceRecommendationIds: [top.id],
    createdAt: Date.now(),
  };
}

/* ------------------------------- Confirmation -------------------------------- */

/**
 * A hypothesis is offered for confirmation only when it qualifies
 * (hypothesisEngine's own rule, reused here — not duplicated) AND no other
 * hypothesis in the session is already confirmed. This never recommends
 * repairing or replacing anything itself — it only prompts the mechanic to
 * review and decide (decision-authority-model.md §1/§3, rule 8).
 */
function findConfirmableHypothesis(session: DiagnosticSession): Hypothesis | null {
  if (session.hypotheses.some((h) => h.status === "confirmed")) return null;
  const candidate = session.hypotheses.find(
    (h) =>
      (h.status === "active" || h.status === "weakened") &&
      hasQualifyingConfirmationEvidence(session, h),
  );
  return candidate ?? null;
}

function buildConfirmationAction(hypothesis: Hypothesis): NextAction {
  return {
    id: stableId("action_confirm", [hypothesis.id]),
    type: "mechanic_confirmation",
    title: `Confirm root cause: ${hypothesis.title}`,
    instruction:
      `Evidence supports "${hypothesis.title}" as the root cause. Review it and confirm ` +
      `only if you agree — this is your decision, not the app's.`,
    reason: "Sufficient Measured/Confirmed evidence exists to warrant a confirmation decision.",
    expectedResultType: "confirmation",
    sourceRecommendationIds: [hypothesis.id],
    createdAt: Date.now(),
  };
}

/* --------------------------- Question / test selection ----------------------- */

type InvasivenessLevel = "low" | "medium" | "high";

const FAILURE_DOMAIN_INVASIVENESS: Record<FailureDomain, InvasivenessLevel> = {
  power: "low",
  ground: "low",
  signal: "low",
  control: "medium",
  load: "medium",
  mechanical: "high",
};

/**
 * Derives a test's invasiveness from the failure domain(s) of the
 * hypotheses it targets — the most invasive domain wins. Unknown targets
 * default to "medium" (never assumed safe).
 */
function classifyTestInvasiveness(
  session: DiagnosticSession,
  test: TestRecommendation,
): InvasivenessLevel {
  const domains = test.targetHypothesisIds
    .map((id) => session.hypotheses.find((h) => h.id === id)?.failureDomain)
    .filter((d): d is FailureDomain => !!d);
  if (domains.length === 0) return "medium";
  if (domains.some((d) => FAILURE_DOMAIN_INVASIVENESS[d] === "high")) return "high";
  if (domains.some((d) => FAILURE_DOMAIN_INVASIVENESS[d] === "medium")) return "medium";
  return "low";
}

function buildQuestionAction(
  session: DiagnosticSession,
  output: ReasoningOutput,
): NextAction | null {
  const rec = output.nextQuestionRecommendation;
  if (!rec) return null;
  // The Reasoning Layer's next-question recommendation is always derived
  // from the first (deterministically sorted) missing-evidence finding.
  const source = output.missingEvidence[0]?.id;
  return {
    id: stableId("action_question", [session.id, rec.questionText]),
    type: "question",
    title: "Ask a question",
    instruction: rec.questionText,
    reason: rec.explanation,
    expectedResultType: "free_text" as ExpectedResultType,
    sourceRecommendationIds: source ? [source] : [],
    createdAt: Date.now(),
  };
}

function buildTestAction(
  session: DiagnosticSession,
  output: ReasoningOutput,
): { action: NextAction; invasiveness: InvasivenessLevel } | null {
  const rec = output.nextTestRecommendation;
  if (!rec) return null;
  const invasiveness = classifyTestInvasiveness(session, rec);
  const type: NextActionType = invasiveness === "low" ? "inspection" : "measurement_test";
  const action: NextAction = {
    id: stableId("action_test", [session.id, rec.testName]),
    type,
    title: rec.testName,
    instruction: rec.explanation,
    reason: rec.explanation,
    expectedResultType: type === "inspection" ? "ok_not_ok_unknown" : "measured_value",
    sourceRecommendationIds: rec.targetHypothesisIds,
    createdAt: Date.now(),
  };
  return { action, invasiveness };
}

/* -------------------------------- Fallback ---------------------------------- */

function buildFallbackRequestEvidenceAction(
  session: DiagnosticSession,
  output: ReasoningOutput,
): NextAction {
  const remaining = output.missingEvidence.map((m) => m.description).join("; ");
  return {
    id: stableId("action_request_evidence", [session.id, remaining || "none"]),
    type: "request_evidence",
    title: "Gather more evidence",
    instruction: remaining
      ? `Still needed: ${remaining}`
      : "No further structural signal is available from current evidence — consider " +
        "adding a hypothesis or gathering evidence manually.",
    reason: "No safety, contradiction, confirmation, question, or test action currently applies.",
    expectedResultType: "free_text",
    sourceRecommendationIds: output.missingEvidence.map((m) => m.id),
    createdAt: Date.now(),
  };
}

/* --------------------------------- Selection --------------------------------- */

/**
 * Pure computation: (session, reasoningOutput, context) → the single
 * highest-priority NextAction. Deterministic for identical input.
 * Priority ladder (mvp-scope.md / diagnostic-reasoning-engine.md rules):
 *   1. Safety always first.
 *   2. Terminal states (verified/abandoned → complete; completed → verify repair).
 *   3. Critical contradictions before continuing.
 *   4. A hypothesis ready for confirmation, before further testing.
 *   5. Between a question and a test: an invasive test yields to the
 *      question (ask before invasive testing); a non-invasive test proceeds
 *      (it gives stronger evidence at low risk).
 *   6. Otherwise, honestly report there is nothing further to structurally recommend.
 */
export function computeNextAction(
  session: DiagnosticSession,
  reasoningOutput: ReasoningOutput,
  _context: OrchestratorContext = {},
): NextAction {
  const safety = buildSafetyAction(session);
  if (safety) return safety;

  const complete = buildSessionCompleteAction(session);
  if (complete) return complete;

  const repairVerification = buildRepairVerificationAction(session);
  if (repairVerification) return repairVerification;

  const contradiction = buildContradictionAction(session, reasoningOutput);
  if (contradiction) return contradiction;

  const confirmable = findConfirmableHypothesis(session);
  if (confirmable) return buildConfirmationAction(confirmable);

  const questionAction = buildQuestionAction(session, reasoningOutput);
  const testResult = buildTestAction(session, reasoningOutput);

  if (questionAction && testResult) {
    return testResult.invasiveness === "high" ? questionAction : testResult.action;
  }
  if (questionAction) return questionAction;
  if (testResult) return testResult.action;

  return buildFallbackRequestEvidenceAction(session, reasoningOutput);
}

/**
 * Select the session's next action. Idempotent: if an action is already
 * active, it is returned unchanged — "only one action may be active at a
 * time" is enforced by never generating a second one until the first is
 * resolved via one of the mechanic-response functions below.
 */
export function selectNextAction(
  session: DiagnosticSession,
  reasoningOutput: ReasoningOutput,
  context: OrchestratorContext = {},
): DiagnosticSession {
  assertSessionNotPaused(session);
  if (session.currentNextAction) return session;

  const action = computeNextAction(session, reasoningOutput, context);
  const now = Date.now();
  return {
    ...session,
    updatedAt: now,
    currentNextAction: action,
    actionLog: [...session.actionLog, action],
  };
}

/* --------------------------- Mechanic response handling ---------------------- */

/** The mechanic performed the action and reports its result. */
export function acceptAction(
  session: DiagnosticSession,
  actionId: string,
  result?: string,
): DiagnosticSession {
  assertSessionNotPaused(session);
  const current = requireCurrentAction(session, actionId);
  const now = Date.now();
  const response: ActionResponse = {
    id: uid("response"),
    actionId: current.id,
    kind: "accepted",
    result,
    respondedAt: now,
  };
  return {
    ...session,
    updatedAt: now,
    currentNextAction: null,
    actionHistory: [...session.actionHistory, response],
  };
}

/** The mechanic chooses not to perform this action right now. Requires a reason. */
export function skipAction(
  session: DiagnosticSession,
  actionId: string,
  reason: string,
): DiagnosticSession {
  assertSessionNotPaused(session);
  assertReason(reason, "Skipping an action");
  const current = requireCurrentAction(session, actionId);
  const now = Date.now();
  const response: ActionResponse = {
    id: uid("response"),
    actionId: current.id,
    kind: "skipped",
    reason,
    respondedAt: now,
  };
  return {
    ...session,
    updatedAt: now,
    currentNextAction: null,
    actionHistory: [...session.actionHistory, response],
  };
}

/** The mechanic already has an equivalent answer without performing the exact action. */
export function provideAlternativeResult(
  session: DiagnosticSession,
  actionId: string,
  result: string,
  reason?: string,
): DiagnosticSession {
  assertSessionNotPaused(session);
  if (!result || result.trim().length === 0) {
    throw new Error("An alternative result cannot be empty.");
  }
  const current = requireCurrentAction(session, actionId);
  const now = Date.now();
  const response: ActionResponse = {
    id: uid("response"),
    actionId: current.id,
    kind: "alternative_result",
    result,
    reason,
    respondedAt: now,
  };
  return {
    ...session,
    updatedAt: now,
    currentNextAction: null,
    actionHistory: [...session.actionHistory, response],
  };
}

/**
 * The mechanic chooses a different direction than recommended. Requires a
 * reason — decision-authority-model.md §3's override rule: "What evidence
 * made you choose this direction?" — preserved as a TechnicianOverride,
 * never discarded.
 */
export function overrideAction(
  session: DiagnosticSession,
  actionId: string,
  chosenDirection: string,
  reason: string,
): DiagnosticSession {
  assertSessionNotPaused(session);
  assertReason(reason, "Overriding an action");
  if (!chosenDirection || chosenDirection.trim().length === 0) {
    throw new Error("An override must state the chosen direction.");
  }
  const current = requireCurrentAction(session, actionId);
  const now = Date.now();
  const response: ActionResponse = {
    id: uid("response"),
    actionId: current.id,
    kind: "overridden",
    reason,
    respondedAt: now,
  };
  const override: TechnicianOverride = {
    id: uid("override"),
    overriddenSuggestion: current.title,
    chosenDirection,
    evidence: reason,
    createdAt: now,
  };
  return {
    ...session,
    updatedAt: now,
    currentNextAction: null,
    actionHistory: [...session.actionHistory, response],
    overrides: [...session.overrides, override],
  };
}

export interface CannotPerformOptions {
  reason?: string;
  context?: OrchestratorContext;
}

/**
 * Finds a structurally equivalent alternative to a failed action: a test's
 * alternative is the pending question (never requires a tool); a
 * question's alternative is the pending test (unless context explicitly
 * reports no tools available). Returns null when no equivalent exists —
 * never fabricates one.
 */
function findAlternativeAction(
  session: DiagnosticSession,
  reasoningOutput: ReasoningOutput,
  failedAction: NextAction,
  context: OrchestratorContext,
): NextAction | null {
  if (failedAction.type === "inspection" || failedAction.type === "measurement_test") {
    return buildQuestionAction(session, reasoningOutput);
  }
  if (failedAction.type === "question") {
    const toolsExcluded = context.availableTools !== undefined && context.availableTools.length === 0;
    if (toolsExcluded) return null;
    return buildTestAction(session, reasoningOutput)?.action ?? null;
  }
  // Safety, contradiction, confirmation, verification, and terminal actions
  // have no structural "equivalent alternative" in this milestone's scope.
  return null;
}

/**
 * The mechanic cannot currently perform the recommended action (missing
 * tool, inaccessible component, etc.). Looks for an equivalent alternative
 * first; if none exists, the gap is recorded honestly in
 * session.remainingUncertainty and surfaced as a request_evidence action —
 * never silently dropped, never guessed at.
 */
export function cannotPerformAction(
  session: DiagnosticSession,
  actionId: string,
  reasoningOutput: ReasoningOutput,
  options: CannotPerformOptions = {},
): DiagnosticSession {
  assertSessionNotPaused(session);
  const current = requireCurrentAction(session, actionId);
  const now = Date.now();

  const alternative = findAlternativeAction(session, reasoningOutput, current, options.context ?? {});

  const response: ActionResponse = {
    id: uid("response"),
    actionId: current.id,
    kind: "cannot_perform",
    reason: options.reason,
    alternativeActionId: alternative ? alternative.id : null,
    respondedAt: now,
  };

  if (alternative) {
    return {
      ...session,
      updatedAt: now,
      actionHistory: [...session.actionHistory, response],
      currentNextAction: alternative,
      actionLog: [...session.actionLog, alternative],
    };
  }

  const uncertaintyNote =
    `Unresolved: ${current.title} — ${current.instruction} (no equivalent alternative found` +
    `${options.reason ? `; reason: ${options.reason}` : ""}).`;

  const fallbackAction: NextAction = {
    id: stableId("action_request_evidence", [session.id, current.id, "unresolved"]),
    type: "request_evidence",
    title: `Unresolved: ${current.title}`,
    instruction:
      `No equivalent alternative is currently available for "${current.title}". This ` +
      `remains an open gap in the diagnosis — gather this evidence when possible.`,
    reason: "Cannot Perform reported with no equivalent alternative — never fabricating a result.",
    expectedResultType: "free_text",
    sourceRecommendationIds: current.sourceRecommendationIds,
    createdAt: now,
  };

  return {
    ...session,
    updatedAt: now,
    remainingUncertainty: session.remainingUncertainty
      ? `${session.remainingUncertainty}\n${uncertaintyNote}`
      : uncertaintyNote,
    actionHistory: [...session.actionHistory, response],
    currentNextAction: fallbackAction,
    actionLog: [...session.actionLog, fallbackAction],
  };
}
