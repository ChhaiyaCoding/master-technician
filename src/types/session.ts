/**
 * Diagnostic Session Engine — data model.
 *
 * A DiagnosticSession is the single, append-only record of one diagnostic
 * encounter: the vehicle, the complaint, every question asked and answered,
 * every test performed and its result, the evolving ranked hypotheses, and
 * the session's lifecycle status. Nothing is ever discarded from a session —
 * only appended to — so the full reasoning history is always recoverable.
 *
 * This is the Rule Engine's data contract (decision-authority-model.md §1):
 * the engine enforces lifecycle rules against this shape; it never decides
 * the diagnostic conclusion itself. See engine/sessionEngine.ts.
 */
import type { SystemId, Vehicle } from "@/types";

/** Where a session currently stands in its lifecycle. */
export type SessionStatus =
  | "active"
  | "paused"
  | "completed"
  | "verified"
  | "abandoned";

/**
 * Evidence reliability tiers (diagnostic-reasoning-engine.md §4). Higher
 * tiers can confirm or eliminate a hypothesis; lower tiers can only suggest
 * a direction.
 */
export type EvidenceTier = "reported" | "observed" | "measured" | "confirmed";

/** What kind of diagnostic input a piece of evidence represents. */
export type EvidenceCategory =
  | "symptom"
  | "dtc"
  | "test"
  | "measurement"
  | "photo"
  | "voice_note"
  | "technician_note";

/** Who or what originated a piece of evidence. */
export type EvidenceSource = "customer" | "technician" | "scan_tool" | "system";

/** The kind of change recorded in an evidence item's history. */
export type EvidenceChangeKind =
  | "created"
  | "updated"
  | "tier_changed"
  | "retracted";

/** Optional references tying a piece of evidence to other session records. */
export interface EvidenceLinks {
  /** A specific entry in DiagnosticSession.symptoms. */
  symptomText?: string;
  /** A specific entry in DiagnosticSession.dtcs. */
  dtcCode?: string;
  /** A specific CompletedTest.id. */
  testId?: string;
  /** A specific AskedQuestion.id. */
  questionId?: string;
}

/** A photo, voice note, or other file attached to a piece of evidence. */
export interface EvidenceAttachment {
  id: string;
  kind: "photo" | "voice_note" | "file";
  /** data: URL or object reference — storage mechanism is out of scope here. */
  uri: string;
  note?: string;
}

/**
 * One immutable snapshot in an evidence item's history. Never edited or
 * removed after being recorded — this is what makes every change to
 * evidence traceable.
 */
export interface EvidenceRevision {
  id: string;
  kind: EvidenceChangeKind;
  tier: EvidenceTier;
  category: EvidenceCategory;
  description: string;
  links: EvidenceLinks;
  attachments: EvidenceAttachment[];
  /** Why this change was made, when given (required for tier changes). */
  reason?: string;
  recordedAt: number;
}

/**
 * A single piece of diagnostic evidence gathered during the session. The
 * top-level fields always mirror the CURRENT state (the latest revision,
 * for convenient reading); `revisions` holds the complete, append-only
 * history of every state this evidence has ever been in — nothing is ever
 * removed from it. "Removing" evidence only ever soft-retracts it
 * (`retractedAt` is set) — the entry stays in the log forever, and its
 * full history remains readable.
 */
export interface EvidenceEntry {
  id: string;
  sessionId: string;
  source: EvidenceSource;
  category: EvidenceCategory;
  tier: EvidenceTier;
  description: string;
  links: EvidenceLinks;
  attachments: EvidenceAttachment[];
  retractedAt: number | null;
  retractedReason: string | null;
  createdAt: number;
  updatedAt: number;
  /** Complete history, oldest first. Always has at least one "created" entry. */
  revisions: EvidenceRevision[];
}

/** A question the question tree asked during the session. */
export interface AskedQuestion {
  id: string;
  questionText: string;
  systemId: SystemId | null;
  askedAt: number;
}

/** The mechanic's answer to an asked question. */
export interface Answer {
  id: string;
  questionId: string;
  selectedOption: string;
  isFreeText: boolean;
  answeredAt: number;
}

/** The three-way result of a Test Node (interactive-diagnostic-test-flow.md §3.1). */
export type TestResult = "ok" | "not_ok" | "unknown";

/** A completed inspection/measurement and its result. */
export interface CompletedTest {
  id: string;
  testName: string;
  systemId: SystemId | null;
  result: TestResult;
  /** The actual reading, when the test calls for a Measured Value input. */
  measuredValue?: string;
  notes?: string;
  completedAt: number;
}

/** Where a hypothesis currently stands. */
export type HypothesisStatus = "active" | "weakened" | "eliminated" | "confirmed";

/**
 * The six failure-mechanism categories a hypothesis is classified into
 * (diagnostic-reasoning-engine.md §6), used to keep cause generation broad
 * before it narrows.
 */
export type FailureDomain =
  | "power"
  | "ground"
  | "signal"
  | "control"
  | "load"
  | "mechanical";

/**
 * Who or what initiated a change to a hypothesis
 * (decision-authority-model.md). The Rule Engine and the AI Reasoning
 * Layer may propose changes, but only "mechanic" may confirm a root cause.
 */
export type ChangeInitiator = "rule_engine" | "ai_suggestion" | "mechanic";

/** The kind of change recorded in a hypothesis's history. */
export type HypothesisChangeKind =
  | "created"
  | "details_updated"
  | "evidence_linked"
  | "evidence_unlinked"
  | "status_changed"
  | "reordered";

/**
 * One immutable snapshot in a hypothesis's history. Never edited or
 * removed after being recorded — every change to a hypothesis, including
 * every evidence link and unlink, is reconstructable by walking this list
 * in order.
 */
export interface HypothesisRevision {
  id: string;
  kind: HypothesisChangeKind;
  status: HypothesisStatus;
  rank: number;
  title: string;
  description: string;
  systemId: SystemId | null;
  failureDomain: FailureDomain;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  missingEvidenceRequirements: string[];
  initiatedBy: ChangeInitiator;
  reason: string;
  recordedAt: number;
}

/**
 * A possible explanation for the vehicle fault. The top-level fields
 * always mirror the CURRENT state (the latest revision); `revisions` holds
 * the complete, append-only history of every state this hypothesis has
 * ever been in. Ranking is an explicit, explainable ordinal (`rank`) among
 * currently active/weakened hypotheses — never a probabilistic percentage.
 */
export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  systemId: SystemId | null;
  failureDomain: FailureDomain;
  status: HypothesisStatus;
  /** Explicit order among active/weakened hypotheses — 1 = highest priority. */
  rank: number;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  /** Free-text description of evidence still needed to further test this cause. */
  missingEvidenceRequirements: string[];
  createdAt: number;
  updatedAt: number;
  /** Complete history, oldest first. Always has at least one "created" entry. */
  revisions: HypothesisRevision[];
}

/**
 * The kind of the single next step the Diagnostic Orchestrator recommends.
 * Never more than one NextAction is active at a time.
 */
export type NextActionType =
  | "safety_instruction"
  | "question"
  | "inspection"
  | "measurement_test"
  | "request_evidence"
  | "review_contradiction"
  | "mechanic_confirmation"
  | "repair_verification"
  | "session_complete";

/** What shape of answer a NextAction expects back from the mechanic. */
export type ExpectedResultType =
  | "ok_not_ok_unknown"
  | "free_text"
  | "measured_value"
  | "confirmation"
  | "acknowledgement"
  | "none";

/**
 * The single next step the Orchestrator recommends — never more than one
 * active at a time (orchestrator/orchestrator.ts §7). This is a
 * RECOMMENDATION only; the Orchestrator never acts on it itself.
 */
export interface NextAction {
  id: string;
  type: NextActionType;
  title: string;
  instruction: string;
  /** Why this is the highest-value next step. */
  reason: string;
  expectedResultType: ExpectedResultType;
  requiredTool?: string;
  componentLocation?: string;
  safetyWarning?: string;
  /** Traces back to the ReasoningOutput finding(s)/recommendation(s) — or a
   * session-state fact (e.g. a hypothesis id) — that produced this action. */
  sourceRecommendationIds: string[];
  createdAt: number;
}

/**
 * The mechanic's final repair decision, recorded against a specific
 * CONFIRMED hypothesis. A "current best theory" alone (Hypothesis.status
 * === "active") is not enough to justify a repair — only a hypothesis that
 * has explicitly reached status "confirmed" may be repaired against
 * (decision-authority-model.md §1 — "preventing premature repair
 * recommendations").
 */
export interface RepairDecision {
  id: string;
  /** Must reference a Hypothesis with status "confirmed". */
  rootCauseHypothesisId: string;
  repairPerformed: string;
  decidedAt: number;
}

/**
 * A record of the mechanic overriding an app suggestion
 * (decision-authority-model.md §3 — the override rule).
 */
export interface TechnicianOverride {
  id: string;
  overriddenSuggestion: string;
  chosenDirection: string;
  /** Answer to "What evidence made you choose this direction?" */
  evidence: string;
  createdAt: number;
}

/** How the mechanic responded to a NextAction. */
export type ActionResponseKind =
  | "accepted"
  | "skipped"
  | "cannot_perform"
  | "alternative_result"
  | "overridden";

/**
 * A record of how the mechanic responded to a NextAction. Append-only —
 * every response is preserved in DiagnosticSession.actionHistory, never
 * overwritten (orchestrator/orchestrator.ts).
 */
export interface ActionResponse {
  id: string;
  actionId: string;
  kind: ActionResponseKind;
  /** The mechanic's answer/result, when the action was completed or an
   * alternative result was provided. */
  result?: string;
  /** Required for "skipped" and "overridden" — the mechanic's reasoning. */
  reason?: string;
  /** For "cannot_perform": the id of the alternative NextAction offered
   * instead, if an equivalent was found. */
  alternativeActionId?: string | null;
  respondedAt: number;
}

/**
 * The six conditions that must ALL be true for a diagnosis to be considered
 * verified (decision-authority-model.md §4). Only a verified diagnosis may
 * feed the Learning Engine.
 */
export interface VerifiedDiagnosisRecord {
  symptomConfirmed: boolean;
  inspectionSupportsRootCause: boolean;
  repairPerformed: string;
  symptomResolved: boolean;
  /** null = not applicable to this fault (no DTC was involved). */
  dtcsClearedAndStayCleared: boolean | null;
  mechanicConfirmed: boolean;
  verifiedAt: number | null;
}

/** The complete diagnostic session — the heart of Master Technician. */
export interface DiagnosticSession {
  id: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  pausedAt: number | null;
  completedAt: number | null;

  /** The DiagnosticSession schema shape this record was built against. */
  schemaVersion: number;
  /** The Session Engine build that created this record. */
  engineVersion: string;
  /** The app version at the time this session was created. */
  createdWithAppVersion: string;

  vehicle: Vehicle;
  system: SystemId | null;

  complaint: string;
  symptoms: string[];
  dtcs: string[];

  evidenceLog: EvidenceEntry[];
  hypotheses: Hypothesis[];
  askedQuestions: AskedQuestion[];
  givenAnswers: Answer[];
  completedTests: CompletedTest[];

  currentReasoning: string;
  /**
   * References a Hypothesis.id — the current leading theory. This alone
   * does NOT mean the root cause is confirmed; check that hypothesis's
   * `status` (or use RepairDecision existence) to know whether it has
   * actually been confirmed.
   */
  currentBestTheory: string | null;
  /** Free-text notes on gaps that remain unresolved — e.g. appended by the
   * Orchestrator when a mechanic reports "Cannot Perform" with no
   * equivalent alternative available (orchestrator/orchestrator.ts). */
  remainingUncertainty: string;

  /** The ONE currently active NextAction, or null if none is pending. */
  currentNextAction: NextAction | null;
  /** Every NextAction ever generated for this session, oldest first. Append-only. */
  actionLog: NextAction[];
  /** Every mechanic response to a NextAction, oldest first. Append-only. */
  actionHistory: ActionResponse[];

  /** Set only once the mechanic's final repair decision has been recorded. */
  repairDecision: RepairDecision | null;

  overrides: TechnicianOverride[];
  /** Set only by a successful verifySession() call — never populated otherwise. */
  verifiedDiagnosis: VerifiedDiagnosisRecord | null;
}
