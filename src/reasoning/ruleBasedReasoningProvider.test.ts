/**
 * Gold Standard Cases — Rule-Based Reasoning Provider, Milestone 4.
 *
 * Written before the implementation they validate. The Reasoning Layer is
 * only considered complete once every case here passes.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createSession } from "@/engine/sessionEngine";
import { addEvidence, removeEvidence } from "@/engine/evidenceEngine";
import {
  addHypothesis,
  linkContradictingEvidence,
  linkSupportingEvidence,
  updateHypothesisDetails,
} from "@/engine/hypothesisEngine";
import { buildReasoningInput } from "@/reasoning/reasoningProvider";
import { ruleBasedReasoningProvider } from "@/reasoning/ruleBasedReasoningProvider";
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

function freshSession(): DiagnosticSession {
  return createSession({
    vehicle: HIACE,
    complaint: "Starts, runs briefly, stalls, restarts after resting.",
    system: "engine",
  });
}

function withoutGeneratedAt<T extends { generatedAt: number }>(output: T) {
  const { generatedAt: _ignored, ...rest } = output;
  return rest;
}

beforeEach(() => {
  localStorage.clear();
});

describe("Rule-Based Reasoning Provider — Gold Standard Cases (Milestone 4)", () => {
  it("GSC-1: analyze() never mutates the session or its evidence/hypotheses", async () => {
    let session = freshSession();
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
    session = addEvidence(session, {
      source: "scan_tool",
      category: "dtc",
      tier: "confirmed",
      description: "P0093 present.",
      links: { dtcCode: "P0093" },
    });

    const before = JSON.stringify(session);
    const input = buildReasoningInput(session);
    const inputSnapshot = JSON.stringify(input);

    await ruleBasedReasoningProvider.analyze(input);

    expect(JSON.stringify(session)).toBe(before);
    expect(JSON.stringify(input)).toBe(inputSnapshot);
  });

  it("GSC-2: output is deterministic — identical input produces identical output (aside from generatedAt)", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "A", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason A",
    );
    session = addEvidence(session, {
      source: "scan_tool",
      category: "dtc",
      tier: "confirmed",
      description: "P0093 present.",
      links: { dtcCode: "P0093" },
    });
    const input = buildReasoningInput(session);

    const first = await ruleBasedReasoningProvider.analyze(input);
    const second = await ruleBasedReasoningProvider.analyze(input);

    expect(withoutGeneratedAt(first)).toEqual(withoutGeneratedAt(second));
  });

  it("GSC-3: groups evidence that shares the same DTC code", async () => {
    let session = freshSession();
    session = addEvidence(session, {
      source: "scan_tool",
      category: "dtc",
      tier: "confirmed",
      description: "P0093 stored.",
      links: { dtcCode: "P0093" },
    });
    session = addEvidence(session, {
      source: "technician",
      category: "symptom",
      tier: "observed",
      description: "Stalls after a few minutes, matches P0093 freeze frame.",
      links: { dtcCode: "P0093" },
    });

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.evidenceGroups).toHaveLength(1);
    expect(output.evidenceGroups[0].evidenceIds).toHaveLength(2);
    expect(output.evidenceGroups[0].explanation).toContain("P0093");
  });

  it("GSC-4: does not group evidence with no shared link (singletons stay ungrouped)", async () => {
    let session = freshSession();
    session = addEvidence(session, {
      source: "technician",
      category: "technician_note",
      tier: "observed",
      description: "Unrelated note about tire wear.",
    });
    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.evidenceGroups).toEqual([]);
  });

  it("GSC-5: detects a contradiction when the same evidence supports one hypothesis and contradicts another", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Injector back-leak", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    session = addHypothesis(
      session,
      { title: "SCV sticking", description: "d", systemId: "engine", failureDomain: "control" },
      "mechanic",
      "reason",
    );
    const [injector, scv] = session.hypotheses.map((h) => h.id);
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "measured",
      description: "Rail pressure collapses gradually after building normally.",
    });
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, injector, evidenceId, "mechanic", "Fits back-leak pattern.");
    session = linkContradictingEvidence(session, scv, evidenceId, "mechanic", "Doesn't fit an SCV fault pattern.");

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.contradictions).toHaveLength(1);
    expect(output.contradictions[0].evidenceId).toBe(evidenceId);
    expect(output.contradictions[0].supportingHypothesisIds).toEqual([injector]);
    expect(output.contradictions[0].contradictingHypothesisIds).toEqual([scv]);
  });

  it("GSC-6: no contradiction is reported when evidence only supports (or only contradicts)", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Injector back-leak", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const hypothesisId = session.hypotheses[0].id;
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "measured",
      description: "Return volume high on cylinder 1.",
    });
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, hypothesisId, evidenceId, "mechanic", "Confirms it.");

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.contradictions).toEqual([]);
  });

  it("GSC-7: surfaces a hypothesis's declared missing-evidence requirements", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Injector back-leak", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const hypothesisId = session.hypotheses[0].id;
    session = updateHypothesisDetails(
      session,
      hypothesisId,
      { missingEvidenceRequirements: ["Injector return-volume test not yet performed."] },
      "mechanic",
      "Noting the gap.",
    );

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    const declared = output.missingEvidence.find(
      (m) => m.description === "Injector return-volume test not yet performed.",
    );
    expect(declared).toBeDefined();
    expect(declared!.relatedHypothesisId).toBe(hypothesisId);
  });

  it("GSC-8: flags a hypothesis with zero supporting evidence as a missing-evidence finding", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Injector back-leak", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const hypothesisId = session.hypotheses[0].id;

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    const noSupportFinding = output.missingEvidence.find(
      (m) => m.relatedHypothesisId === hypothesisId,
    );
    expect(noSupportFinding).toBeDefined();
  });

  it("GSC-9: generates a candidate hypothesis for unaddressed DTC/symptom evidence", async () => {
    let session = freshSession();
    session = addEvidence(session, {
      source: "scan_tool",
      category: "dtc",
      tier: "confirmed",
      description: "P0093 present.",
      links: { dtcCode: "P0093" },
    });

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.candidateHypotheses).toHaveLength(1);
    expect(output.candidateHypotheses[0].supportingEvidenceIds).toEqual([
      session.evidenceLog[0].id,
    ]);
  });

  it("GSC-10: does not generate a candidate for evidence already linked as supporting to a hypothesis", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Injector back-leak", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const hypothesisId = session.hypotheses[0].id;
    session = addEvidence(session, {
      source: "scan_tool",
      category: "dtc",
      tier: "confirmed",
      description: "P0093 present.",
      links: { dtcCode: "P0093" },
    });
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, hypothesisId, evidenceId, "mechanic", "Addressed.");

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.candidateHypotheses).toEqual([]);
  });

  it("GSC-11: assesses hypotheses with accurate counts, ignoring retracted evidence", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Injector back-leak", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const hypothesisId = session.hypotheses[0].id;
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "measured",
      description: "Return volume high on cylinder 1.",
    });
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, hypothesisId, evidenceId, "mechanic", "Confirms it.");

    let output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    let assessment = output.hypothesisAssessments.find((a) => a.hypothesisId === hypothesisId)!;
    expect(assessment.supportingEvidenceCount).toBe(1);

    session = removeEvidence(session, evidenceId, "Re-measured — voided.");
    output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    assessment = output.hypothesisAssessments.find((a) => a.hypothesisId === hypothesisId)!;
    expect(assessment.supportingEvidenceCount).toBe(0);
  });

  it("GSC-12: recommends ranking a hypothesis 'up' when evidence-implied order beats its current rank", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "A (ranked first, no evidence)", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason A",
    );
    session = addHypothesis(
      session,
      { title: "B (ranked second, strongly supported)", description: "d", systemId: "engine", failureDomain: "control" },
      "mechanic",
      "reason B",
    );
    const [a, b] = session.hypotheses.map((h) => h.id);
    expect(session.hypotheses.find((h) => h.id === a)!.rank).toBe(1);
    expect(session.hypotheses.find((h) => h.id === b)!.rank).toBe(2);

    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "measured",
      description: "Strong support for B.",
    });
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, b, evidenceId, "mechanic", "Strongly supports B.");

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    const bRec = output.rankingRecommendations.find((r) => r.hypothesisId === b);
    const aRec = output.rankingRecommendations.find((r) => r.hypothesisId === a);
    expect(bRec?.direction).toBe("up");
    expect(aRec?.direction).toBe("down");
  });

  it("GSC-13: no ranking recommendation when the current order already matches the evidence", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Only hypothesis", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.rankingRecommendations).toEqual([]);
  });

  it("GSC-14: recommends a next test to resolve a contradiction, prioritized over the no-evidence heuristic", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Injector back-leak", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    session = addHypothesis(
      session,
      { title: "SCV sticking", description: "d", systemId: "engine", failureDomain: "control" },
      "mechanic",
      "reason",
    );
    const [injector, scv] = session.hypotheses.map((h) => h.id);
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "measured",
      description: "Ambiguous rail-pressure trace.",
    });
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, injector, evidenceId, "mechanic", "Fits injector.");
    session = linkContradictingEvidence(session, scv, evidenceId, "mechanic", "Doesn't fit SCV.");

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.nextTestRecommendation).not.toBeNull();
    expect(output.nextTestRecommendation!.targetHypothesisIds.sort()).toEqual(
      [injector, scv].sort(),
    );
  });

  it("GSC-15: recommends testing the top-ranked hypothesis when it lacks supporting evidence and there's no contradiction", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Top-ranked, no evidence yet", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const hypothesisId = session.hypotheses[0].id;

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.nextTestRecommendation).not.toBeNull();
    expect(output.nextTestRecommendation!.targetHypothesisIds).toEqual([hypothesisId]);
  });

  it("GSC-16: recommends a next question derived from a missing-evidence finding", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Injector back-leak", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const hypothesisId = session.hypotheses[0].id;
    session = updateHypothesisDetails(
      session,
      hypothesisId,
      { missingEvidenceRequirements: ["Does the stall correlate with engine temperature?"] },
      "mechanic",
      "Noting the gap.",
    );

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.nextQuestionRecommendation).not.toBeNull();
    expect(output.nextQuestionRecommendation!.questionText).toContain(
      "Does the stall correlate with engine temperature?",
    );
  });

  it("GSC-17: returns empty findings and null recommendations when there is nothing to recommend", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Well-supported, only hypothesis", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const hypothesisId = session.hypotheses[0].id;
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "confirmed",
      description: "Directly confirms the cause.",
    });
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, hypothesisId, evidenceId, "mechanic", "Confirms it.");

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.missingEvidence).toEqual([]);
    expect(output.contradictions).toEqual([]);
    expect(output.rankingRecommendations).toEqual([]);
    expect(output.nextQuestionRecommendation).toBeNull();
    expect(output.nextTestRecommendation).toBeNull();
  });

  it("GSC-18: buildReasoningInput excludes retracted evidence and terminal hypotheses", async () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "Active hypothesis", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    session = addHypothesis(
      session,
      { title: "To be eliminated", description: "d", systemId: "engine", failureDomain: "control" },
      "mechanic",
      "reason",
    );
    const [, toEliminate] = session.hypotheses.map((h) => h.id);

    session = addEvidence(session, {
      source: "technician",
      category: "technician_note",
      tier: "observed",
      description: "Will be retracted.",
    });
    const retractedEvidenceId = session.evidenceLog[0].id;

    const { eliminateHypothesis } = await import("@/engine/hypothesisEngine");
    session = eliminateHypothesis(session, toEliminate, "mechanic", "Ruled out.");
    session = removeEvidence(session, retractedEvidenceId, "No longer relevant.");

    const input = buildReasoningInput(session);
    expect(input.hypotheses.map((h) => h.id)).not.toContain(toEliminate);
    expect(input.evidence.map((e) => e.id)).not.toContain(retractedEvidenceId);
  });
});
