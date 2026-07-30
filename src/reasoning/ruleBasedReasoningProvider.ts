/**
 * Rule-Based Reasoning Provider — Milestone 4.
 *
 * A fully deterministic ReasoningProvider implementation: no AI, no
 * network calls, no randomness. The same ReasoningInput always produces
 * identical ReasoningOutput content (only `generatedAt` differs between
 * calls). It reasons purely from the STRUCTURE already present in the
 * session — evidence links, tiers, categories, hypothesis states — and has
 * no domain knowledge (no DTC database, no question tree, no test-node
 * library, all explicitly out of scope for this milestone). Every finding
 * states exactly which structural fact produced it.
 *
 * This is one of potentially several ReasoningProvider implementations
 * (types/reasoning.ts): an AI provider, a Verified Diagnosis Library
 * provider, or a Hybrid provider can each implement the same interface
 * later without any caller changing.
 */
import type { EvidenceEntry, Hypothesis } from "@/types/session";
import type { SystemId } from "@/types";
import type {
  CandidateHypothesis,
  ContradictionFinding,
  EvidenceGroup,
  HypothesisAssessment,
  MissingEvidenceFinding,
  QuestionRecommendation,
  RankingRecommendation,
  ReasoningInput,
  ReasoningOutput,
  TestRecommendation,
} from "@/types/reasoning";
import type { ReasoningProvider } from "@/reasoning/reasoningProvider";

/* ------------------------------ Determinism ------------------------------- */

/** A stable, content-derived id — never random, never time-based. */
function stableId(prefix: string, parts: string[]): string {
  return `${prefix}_${[...parts].sort().join("~")}`;
}

/* ---------------------------- Evidence grouping ---------------------------- */

function groupEvidence(evidence: EvidenceEntry[]): EvidenceGroup[] {
  const groups: EvidenceGroup[] = [];

  function addGroupsFromKey(
    keyFn: (e: EvidenceEntry) => string | undefined,
    labelFn: (key: string, count: number) => string,
  ): void {
    const buckets = new Map<string, string[]>();
    for (const e of evidence) {
      const key = keyFn(e);
      if (!key) continue;
      const list = buckets.get(key) ?? [];
      list.push(e.id);
      buckets.set(key, list);
    }
    for (const [key, ids] of buckets) {
      if (ids.length < 2) continue;
      const sortedIds = [...ids].sort();
      groups.push({
        id: stableId("group", sortedIds),
        label: labelFn(key, ids.length),
        evidenceIds: sortedIds,
        explanation: labelFn(key, ids.length),
      });
    }
  }

  addGroupsFromKey(
    (e) => e.links.dtcCode,
    (key, count) => `${count} evidence items relate to DTC ${key}.`,
  );
  addGroupsFromKey(
    (e) => e.links.testId,
    (key, count) => `${count} evidence items came from the same test (${key}).`,
  );
  addGroupsFromKey(
    (e) => e.links.symptomText,
    (key, count) => `${count} evidence items relate to the symptom "${key}".`,
  );
  addGroupsFromKey(
    (e) => e.links.questionId,
    (key, count) => `${count} evidence items came from the same question (${key}).`,
  );

  return groups.sort((a, b) => a.id.localeCompare(b.id));
}

/* -------------------------------- Contradictions ---------------------------- */

/**
 * A contradiction is a purely structural signal: the same evidence item is
 * linked as "supporting" to at least one hypothesis and "contradicting" to
 * at least one other — that evidence is providing divergent signal across
 * the hypothesis set and is worth re-examining.
 */
function detectContradictions(
  evidence: EvidenceEntry[],
  hypotheses: Hypothesis[],
): ContradictionFinding[] {
  const findings: ContradictionFinding[] = [];
  for (const e of evidence) {
    const supportingHypothesisIds = hypotheses
      .filter((h) => h.supportingEvidenceIds.includes(e.id))
      .map((h) => h.id)
      .sort();
    const contradictingHypothesisIds = hypotheses
      .filter((h) => h.contradictingEvidenceIds.includes(e.id))
      .map((h) => h.id)
      .sort();

    if (supportingHypothesisIds.length > 0 && contradictingHypothesisIds.length > 0) {
      findings.push({
        id: stableId("contradiction", [e.id]),
        evidenceId: e.id,
        supportingHypothesisIds,
        contradictingHypothesisIds,
        explanation:
          `Evidence "${e.description}" supports ${supportingHypothesisIds.length} ` +
          `hypothesis(es) but contradicts ${contradictingHypothesisIds.length} ` +
          `other(s) — this evidence is providing divergent signal and is worth ` +
          `re-examining before ranking either side.`,
      });
    }
  }
  return findings.sort((a, b) => a.id.localeCompare(b.id));
}

/* ------------------------------ Missing evidence ---------------------------- */

function detectMissingEvidence(hypotheses: Hypothesis[]): MissingEvidenceFinding[] {
  const findings: MissingEvidenceFinding[] = [];

  for (const h of hypotheses) {
    for (const requirement of h.missingEvidenceRequirements) {
      findings.push({
        id: stableId("missing", [h.id, requirement]),
        description: requirement,
        relatedHypothesisId: h.id,
        explanation: `Hypothesis "${h.title}" has declared this evidence still needed.`,
      });
    }
    if (h.supportingEvidenceIds.length === 0) {
      findings.push({
        id: stableId("missing", [h.id, "no-support"]),
        description: `No supporting evidence linked yet for "${h.title}".`,
        relatedHypothesisId: h.id,
        explanation:
          `Hypothesis "${h.title}" exists but has no supporting evidence linked ` +
          `— it cannot be confirmed until at least one Measured or Confirmed ` +
          `item supports it.`,
      });
    }
  }

  return findings.sort((a, b) => a.id.localeCompare(b.id));
}

/* --------------------------- Candidate hypotheses ---------------------------- */

/**
 * A candidate is proposed for any DTC/symptom evidence not yet referenced
 * as supporting by any active hypothesis. This does not claim to know WHY
 * the evidence occurred (that requires domain knowledge this milestone
 * doesn't have) — it only flags that something is unaddressed.
 */
function generateCandidateHypotheses(
  evidence: EvidenceEntry[],
  hypotheses: Hypothesis[],
): CandidateHypothesis[] {
  const addressedEvidenceIds = new Set(
    hypotheses.flatMap((h) => h.supportingEvidenceIds),
  );

  const candidates: CandidateHypothesis[] = [];
  for (const e of evidence) {
    if (e.category !== "dtc" && e.category !== "symptom") continue;
    if (addressedEvidenceIds.has(e.id)) continue;

    candidates.push({
      id: stableId("candidate", [e.id]),
      title: `Investigate: ${e.description}`,
      description:
        "No existing hypothesis currently references this evidence as " +
        "supporting. Consider adding a hypothesis to explain it.",
      systemId: null,
      failureDomain: null,
      supportingEvidenceIds: [e.id],
      explanation: `Evidence "${e.description}" (${e.category}) is not yet addressed by any active hypothesis.`,
    });
  }

  return candidates.sort((a, b) => a.id.localeCompare(b.id));
}

/* ------------------------------- Assessments -------------------------------- */

function assessHypotheses(
  evidence: EvidenceEntry[],
  hypotheses: Hypothesis[],
): HypothesisAssessment[] {
  const evidenceById = new Map(evidence.map((e) => [e.id, e]));

  return hypotheses
    .map((h) => {
      const supportingEvidenceCount = h.supportingEvidenceIds.filter((id) =>
        evidenceById.has(id),
      ).length;
      const contradictingEvidenceCount = h.contradictingEvidenceIds.filter((id) =>
        evidenceById.has(id),
      ).length;

      const explanation =
        supportingEvidenceCount === 0 && contradictingEvidenceCount === 0
          ? `"${h.title}" has no active evidence linked yet.`
          : `"${h.title}" is currently supported by ${supportingEvidenceCount} ` +
            `active evidence item(s) and contradicted by ${contradictingEvidenceCount}.`;

      return {
        hypothesisId: h.id,
        supportingEvidenceCount,
        contradictingEvidenceCount,
        explanation,
      };
    })
    .sort((a, b) => a.hypothesisId.localeCompare(b.hypothesisId));
}

/* ---------------------------- Ranking recommendations ------------------------ */

function netSupport(evidenceIds: Set<string>, h: Hypothesis): number {
  const supporting = h.supportingEvidenceIds.filter((id) => evidenceIds.has(id)).length;
  const contradicting = h.contradictingEvidenceIds.filter((id) => evidenceIds.has(id)).length;
  return supporting - contradicting;
}

/**
 * Compares the CURRENT explicit rank order against the order evidence
 * alone would imply (highest net support first, ties broken by current
 * rank for stability). A hypothesis whose evidence-implied position is
 * better than its current rank is recommended "up"; worse is "down".
 * Never applies the reorder itself — that stays reorderActiveHypotheses()'s
 * job, and remains the mechanic's call.
 */
function recommendRanking(
  evidence: EvidenceEntry[],
  hypotheses: Hypothesis[],
): RankingRecommendation[] {
  const evidenceIds = new Set(evidence.map((e) => e.id));

  const currentOrder = [...hypotheses].sort((a, b) => a.rank - b.rank);
  const evidenceImplied = [...hypotheses].sort((a, b) => {
    const diff = netSupport(evidenceIds, b) - netSupport(evidenceIds, a);
    return diff !== 0 ? diff : a.rank - b.rank;
  });

  const currentPosition = new Map(currentOrder.map((h, i) => [h.id, i]));
  const impliedPosition = new Map(evidenceImplied.map((h, i) => [h.id, i]));

  const recommendations: RankingRecommendation[] = [];
  for (const h of hypotheses) {
    const current = currentPosition.get(h.id)!;
    const implied = impliedPosition.get(h.id)!;
    if (implied < current) {
      recommendations.push({
        hypothesisId: h.id,
        direction: "up",
        explanation:
          `Evidence (net support ${netSupport(evidenceIds, h)}) places "${h.title}" ` +
          `higher than its current position.`,
      });
    } else if (implied > current) {
      recommendations.push({
        hypothesisId: h.id,
        direction: "down",
        explanation:
          `Evidence (net support ${netSupport(evidenceIds, h)}) places "${h.title}" ` +
          `lower than its current position.`,
      });
    }
  }

  return recommendations.sort((a, b) => a.hypothesisId.localeCompare(b.hypothesisId));
}

/* ------------------------------ Next action recommendations ------------------- */

function recommendNextQuestion(
  missingEvidence: MissingEvidenceFinding[],
  system: SystemId | null,
): QuestionRecommendation | null {
  if (missingEvidence.length === 0) return null;
  const top = missingEvidence[0];
  return {
    questionText: `Can you provide: ${top.description}`,
    targetSystemId: system,
    explanation: top.explanation,
  };
}

function recommendNextTest(
  contradictions: ContradictionFinding[],
  hypotheses: Hypothesis[],
): TestRecommendation | null {
  if (contradictions.length > 0) {
    const top = contradictions[0];
    const targetHypothesisIds = [
      ...new Set([...top.supportingHypothesisIds, ...top.contradictingHypothesisIds]),
    ].sort();
    return {
      testName: `Test to resolve conflicting evidence affecting: ${targetHypothesisIds.join(", ")}`,
      targetHypothesisIds,
      explanation: top.explanation,
    };
  }

  const topRanked = [...hypotheses].sort((a, b) => a.rank - b.rank)[0];
  if (topRanked && topRanked.supportingEvidenceIds.length === 0) {
    return {
      testName: `Test to confirm or eliminate: ${topRanked.title}`,
      targetHypothesisIds: [topRanked.id],
      explanation:
        `"${topRanked.title}" is the top-ranked hypothesis but has no supporting ` +
        `evidence yet — testing it directly gives the most information.`,
    };
  }

  return null;
}

/* --------------------------------- Provider --------------------------------- */

export class RuleBasedReasoningProvider implements ReasoningProvider {
  readonly kind = "rule_engine" as const;

  async analyze(input: ReasoningInput): Promise<ReasoningOutput> {
    const evidenceGroups = groupEvidence(input.evidence);
    const contradictions = detectContradictions(input.evidence, input.hypotheses);
    const missingEvidence = detectMissingEvidence(input.hypotheses);
    const candidateHypotheses = generateCandidateHypotheses(input.evidence, input.hypotheses);
    const hypothesisAssessments = assessHypotheses(input.evidence, input.hypotheses);
    const rankingRecommendations = recommendRanking(input.evidence, input.hypotheses);
    const nextQuestionRecommendation = recommendNextQuestion(missingEvidence, input.system);
    const nextTestRecommendation = recommendNextTest(contradictions, input.hypotheses);

    return {
      generatedAt: Date.now(),
      producedBy: this.kind,
      evidenceGroups,
      contradictions,
      missingEvidence,
      candidateHypotheses,
      hypothesisAssessments,
      rankingRecommendations,
      nextQuestionRecommendation,
      nextTestRecommendation,
    };
  }
}

/** The app-wide default reasoning provider for this milestone. */
export const ruleBasedReasoningProvider: ReasoningProvider = new RuleBasedReasoningProvider();
