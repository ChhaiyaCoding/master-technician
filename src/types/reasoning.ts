/**
 * Reasoning Layer — contract types (Milestone 4).
 *
 * The Reasoning Layer is responsible for THINKING: interpreting evidence,
 * detecting patterns, and producing recommendations. It is explicitly NOT
 * responsible for storing hypotheses (Hypothesis Engine's job) or evidence
 * (Evidence Engine's job), and it never mutates a DiagnosticSession — every
 * type below describes a RECOMMENDATION, never a state change. The Rule
 * Engine remains responsible for workflow; the mechanic remains the final
 * authority (decision-authority-model.md).
 *
 * This contract is shaped so multiple reasoning sources can be plugged in
 * behind the same interface without changing any caller:
 *   - a deterministic Rule-Based provider (this milestone's implementation,
 *     see reasoning/ruleBasedReasoningProvider.ts)
 *   - a future AI provider (LLM-backed, behind a server proxy)
 *   - a future Verified Diagnosis Library provider (case-matching against
 *     the growing flywheel of past verified diagnoses — 05-knowledge-roadmap.md L9)
 *   - a Hybrid provider composing more than one of the above
 * See reasoning/reasoningProvider.ts for the ReasoningProvider interface
 * itself and the session-to-input bridge.
 */
import type { EvidenceEntry, FailureDomain, Hypothesis } from "@/types/session";
import type { SystemId, Vehicle } from "@/types";

/** Which kind of reasoning source produced a given output. */
export type ReasoningProviderKind =
  | "rule_engine"
  | "ai"
  | "verified_diagnosis_library"
  | "hybrid";

/**
 * A read-only, curated projection of session state — everything a
 * reasoning provider needs, and nothing it can mutate. Built from a
 * DiagnosticSession by buildReasoningInput(); a provider never receives
 * the raw session, keeping the reasoning contract decoupled from the exact
 * session shape.
 */
export interface ReasoningInput {
  vehicle: Vehicle;
  system: SystemId | null;
  complaint: string;
  dtcs: string[];
  /** Active (non-retracted) evidence only. */
  evidence: EvidenceEntry[];
  /** Active/weakened hypotheses only — eliminated/confirmed are settled. */
  hypotheses: Hypothesis[];
}

/** A cluster of evidence that relates to the same underlying signal. */
export interface EvidenceGroup {
  id: string;
  label: string;
  evidenceIds: string[];
  explanation: string;
}

/** Evidence that has been linked inconsistently across hypotheses. */
export interface ContradictionFinding {
  id: string;
  evidenceId: string;
  supportingHypothesisIds: string[];
  contradictingHypothesisIds: string[];
  explanation: string;
}

/** A gap in the evidence that would help narrow the diagnosis. */
export interface MissingEvidenceFinding {
  id: string;
  description: string;
  relatedHypothesisId: string | null;
  explanation: string;
}

/** A possible NEW cause, not yet added to the session as a real Hypothesis. */
export interface CandidateHypothesis {
  id: string;
  title: string;
  description: string;
  systemId: SystemId | null;
  /** null when the provider has no grounds to classify a failure domain. */
  failureDomain: FailureDomain | null;
  supportingEvidenceIds: string[];
  explanation: string;
}

/** A structured assessment of why an EXISTING hypothesis is still in play. */
export interface HypothesisAssessment {
  hypothesisId: string;
  supportingEvidenceCount: number;
  contradictingEvidenceCount: number;
  explanation: string;
}

export type RankingDirection = "up" | "down";

/** A recommendation to reprioritize an existing hypothesis — never applied automatically. */
export interface RankingRecommendation {
  hypothesisId: string;
  direction: RankingDirection;
  explanation: string;
}

/** A recommended next question. The Reasoning Layer may also emit a test
 * recommendation in the same pass — choosing the single next action
 * remains the Rule Engine's job (diagnostic-reasoning-engine.md §9). */
export interface QuestionRecommendation {
  questionText: string;
  targetSystemId: SystemId | null;
  explanation: string;
}

/** A recommended next test. */
export interface TestRecommendation {
  testName: string;
  targetHypothesisIds: string[];
  explanation: string;
}

/**
 * Everything a reasoning provider produces for one analysis pass. Pure
 * recommendations — nothing here is ever applied to a session
 * automatically; the Hypothesis Engine, the Rule Engine, and ultimately
 * the mechanic decide what (if anything) to do with it.
 */
export interface ReasoningOutput {
  generatedAt: number;
  producedBy: ReasoningProviderKind;
  evidenceGroups: EvidenceGroup[];
  contradictions: ContradictionFinding[];
  missingEvidence: MissingEvidenceFinding[];
  candidateHypotheses: CandidateHypothesis[];
  hypothesisAssessments: HypothesisAssessment[];
  rankingRecommendations: RankingRecommendation[];
  nextQuestionRecommendation: QuestionRecommendation | null;
  nextTestRecommendation: TestRecommendation | null;
}
