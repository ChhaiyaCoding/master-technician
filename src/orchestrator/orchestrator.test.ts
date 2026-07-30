/**
 * Gold Standard Cases — Diagnostic Orchestrator, Milestone 5.
 *
 * Written before the implementation they validate. The Orchestrator is
 * only considered complete once every case here passes.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  completeSession,
  createSession,
  loadSession,
  recordRepairDecision,
  saveSession,
  verifySession,
} from "@/engine/sessionEngine";
import { addEvidence } from "@/engine/evidenceEngine";
import { addHypothesis, confirmHypothesis, linkSupportingEvidence } from "@/engine/hypothesisEngine";
import { buildReasoningInput } from "@/reasoning/reasoningProvider";
import { ruleBasedReasoningProvider } from "@/reasoning/ruleBasedReasoningProvider";
import {
  acceptAction,
  ActionMismatchError,
  cannotPerformAction,
  computeNextAction,
  NoActiveActionError,
  overrideAction,
  provideAlternativeResult,
  selectNextAction,
  skipAction,
} from "@/orchestrator/orchestrator";
import type { DiagnosticSession } from "@/types/session";
import type { ReasoningOutput } from "@/types/reasoning";
import type { Vehicle } from "@/types";

const HIACE: Vehicle = {
  brand: "Toyota",
  model: "Hiace",
  year: 2008,
  engine: "1KD-FTV",
  transmission: "MT",
  mileageKm: 320000,
};

function freshSession(system: DiagnosticSession["system"] = "engine"): DiagnosticSession {
  return createSession({
    vehicle: HIACE,
    complaint: "Starts, runs briefly, stalls, restarts after resting.",
    system,
  });
}

/** Fill in a full ReasoningOutput from partial overrides — keeps tests terse. */
function makeReasoningOutput(overrides: Partial<ReasoningOutput> = {}): ReasoningOutput {
  return {
    generatedAt: Date.now(),
    producedBy: "rule_engine",
    evidenceGroups: [],
    contradictions: [],
    missingEvidence: [],
    candidateHypotheses: [],
    hypothesisAssessments: [],
    rankingRecommendations: [],
    nextQuestionRecommendation: null,
    nextTestRecommendation: null,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("Diagnostic Orchestrator — Gold Standard Cases (Milestone 5)", () => {
  it("GSC-1: a safety action overrides every other recommendation", () => {
    let session = freshSession("hybrid");
    session = addHypothesis(
      session,
      { title: "HV battery block weak", description: "d", systemId: "hybrid", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const reasoningOutput = makeReasoningOutput({
      contradictions: [
        {
          id: "c1",
          evidenceId: "ev1",
          supportingHypothesisIds: ["h1"],
          contradictingHypothesisIds: ["h2"],
          explanation: "conflict",
        },
      ],
      nextQuestionRecommendation: {
        questionText: "irrelevant question",
        targetSystemId: "hybrid",
        explanation: "irrelevant",
      },
      nextTestRecommendation: {
        testName: "irrelevant test",
        targetHypothesisIds: [session.hypotheses[0].id],
        explanation: "irrelevant",
      },
    });

    const action = computeNextAction(session, reasoningOutput);
    expect(action.type).toBe("safety_instruction");
    expect(action.safetyWarning).toBeDefined();
  });

  it("GSC-2: a detected contradiction is resolved before normal testing", () => {
    let session = freshSession("engine");
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
    const reasoningOutput = makeReasoningOutput({
      contradictions: [
        {
          id: "c1",
          evidenceId: "ev1",
          supportingHypothesisIds: [injector],
          contradictingHypothesisIds: [scv],
          explanation: "Evidence conflicts between injector and SCV.",
        },
      ],
      nextQuestionRecommendation: {
        questionText: "some question",
        targetSystemId: "engine",
        explanation: "some reason",
      },
      nextTestRecommendation: {
        testName: "some test",
        targetHypothesisIds: [injector],
        explanation: "some reason",
      },
    });

    const action = computeNextAction(session, reasoningOutput);
    expect(action.type).toBe("review_contradiction");
    expect(action.sourceRecommendationIds).toEqual(["c1"]);
  });

  it("GSC-3: asks for missing symptom information before an invasive (mechanical) test", async () => {
    let session = freshSession("engine");
    session = addHypothesis(
      session,
      {
        title: "Top-ranked, mechanical, no evidence yet",
        description: "d",
        systemId: "engine",
        failureDomain: "mechanical", // high invasiveness
      },
      "mechanic",
      "reason",
    );
    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.nextQuestionRecommendation).not.toBeNull();
    expect(output.nextTestRecommendation).not.toBeNull();

    const action = computeNextAction(session, output);
    expect(action.type).toBe("question");
  });

  it("GSC-4: selects exactly one action when both a question and a test are candidates", async () => {
    let session = freshSession("engine");
    session = addHypothesis(
      session,
      {
        title: "Top-ranked, signal domain, no evidence yet",
        description: "d",
        systemId: "engine",
        failureDomain: "signal", // low invasiveness
      },
      "mechanic",
      "reason",
    );
    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    expect(output.nextQuestionRecommendation).not.toBeNull();
    expect(output.nextTestRecommendation).not.toBeNull();

    const action = computeNextAction(session, output);
    expect(["question", "inspection", "measurement_test"]).toContain(action.type);
  });

  it("GSC-5: prefers a non-invasive test over an invasive one relative to the question alternative", async () => {
    // High invasiveness (mechanical) -> the question wins, the invasive test is deferred.
    let mechanicalSession = freshSession("engine");
    mechanicalSession = addHypothesis(
      mechanicalSession,
      { title: "Mechanical, no evidence", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const mechanicalOutput = await ruleBasedReasoningProvider.analyze(
      buildReasoningInput(mechanicalSession),
    );
    expect(computeNextAction(mechanicalSession, mechanicalOutput).type).toBe("question");

    // Low invasiveness (signal) -> the non-invasive test proceeds.
    let signalSession = freshSession("engine");
    signalSession = addHypothesis(
      signalSession,
      { title: "Signal, no evidence", description: "d", systemId: "engine", failureDomain: "signal" },
      "mechanic",
      "reason",
    );
    const signalOutput = await ruleBasedReasoningProvider.analyze(buildReasoningInput(signalSession));
    const signalAction = computeNextAction(signalSession, signalOutput);
    expect(["inspection", "measurement_test"]).toContain(signalAction.type);
  });

  it("GSC-6: only one action may be active at a time — selectNextAction is idempotent until resolved", () => {
    const session = freshSession("engine");
    const reasoningOutput = makeReasoningOutput({
      nextQuestionRecommendation: {
        questionText: "Any question",
        targetSystemId: "engine",
        explanation: "reason",
      },
    });

    const first = selectNextAction(session, reasoningOutput);
    expect(first.currentNextAction).not.toBeNull();
    expect(first.actionLog).toHaveLength(1);

    const second = selectNextAction(first, reasoningOutput);
    expect(second.currentNextAction!.id).toBe(first.currentNextAction!.id);
    expect(second.actionLog).toHaveLength(1); // no duplicate entry
  });

  it("GSC-7: skipping an action requires a reason", () => {
    const session = freshSession("engine");
    const reasoningOutput = makeReasoningOutput({
      nextQuestionRecommendation: { questionText: "q", targetSystemId: "engine", explanation: "r" },
    });
    const withAction = selectNextAction(session, reasoningOutput);
    const actionId = withAction.currentNextAction!.id;

    expect(() => skipAction(withAction, actionId, "")).toThrow();
    expect(() => skipAction(withAction, actionId, "   ")).toThrow();

    const skipped = skipAction(withAction, actionId, "Not relevant right now — moving to a different check.");
    expect(skipped.currentNextAction).toBeNull();
    expect(skipped.actionHistory).toHaveLength(1);
    expect(skipped.actionHistory[0].kind).toBe("skipped");
    expect(skipped.actionHistory[0].reason).toBe(
      "Not relevant right now — moving to a different check.",
    );
  });

  it("GSC-8: overriding an action requires mechanic evidence, and it is preserved as a TechnicianOverride", () => {
    const session = freshSession("engine");
    const reasoningOutput = makeReasoningOutput({
      nextQuestionRecommendation: { questionText: "q", targetSystemId: "engine", explanation: "r" },
    });
    const withAction = selectNextAction(session, reasoningOutput);
    const actionId = withAction.currentNextAction!.id;

    expect(() => overrideAction(withAction, actionId, "Doing something else instead.", "")).toThrow();

    const overridden = overrideAction(
      withAction,
      actionId,
      "Checking the battery first instead.",
      "Battery terminals were visibly corroded when I opened the hood.",
    );
    expect(overridden.currentNextAction).toBeNull();
    expect(overridden.actionHistory[0].kind).toBe("overridden");
    expect(overridden.actionHistory[0].reason).toBe(
      "Battery terminals were visibly corroded when I opened the hood.",
    );
    expect(overridden.overrides).toHaveLength(1);
    expect(overridden.overrides[0].evidence).toBe(
      "Battery terminals were visibly corroded when I opened the hood.",
    );
    expect(overridden.overrides[0].chosenDirection).toBe("Checking the battery first instead.");
  });

  it("GSC-9: Cannot Perform finds an equivalent alternative when one is available", async () => {
    let session = freshSession("engine");
    session = addHypothesis(
      session,
      { title: "Signal, no evidence", description: "d", systemId: "engine", failureDomain: "signal" },
      "mechanic",
      "reason",
    );
    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    const withAction = selectNextAction(session, output);
    expect(["inspection", "measurement_test"]).toContain(withAction.currentNextAction!.type);
    const testActionId = withAction.currentNextAction!.id;

    const result = cannotPerformAction(withAction, testActionId, output, {
      reason: "Don't have the right gauge on hand today.",
    });

    expect(result.actionHistory[result.actionHistory.length - 1]?.kind).toBe("cannot_perform");
    expect(result.actionHistory[result.actionHistory.length - 1]?.alternativeActionId).not.toBeNull();
    expect(result.currentNextAction).not.toBeNull();
    expect(result.currentNextAction!.type).toBe("question");
    expect(result.currentNextAction!.id).toBe(result.actionHistory[result.actionHistory.length - 1]?.alternativeActionId);
  });

  it("GSC-10: Cannot Perform preserves the unresolved uncertainty when no alternative exists", () => {
    let session = freshSession("engine");
    session = addHypothesis(
      session,
      { title: "Only a test exists, no question available", description: "d", systemId: "engine", failureDomain: "signal" },
      "mechanic",
      "reason",
    );
    const hypothesisId = session.hypotheses[0].id;
    // Hand-constructed: a test recommendation with NO corresponding question,
    // isolating the Orchestrator's own "no alternative" behavior from any
    // particular reasoning provider's correlation between the two.
    const reasoningOutput = makeReasoningOutput({
      nextTestRecommendation: {
        testName: "Test to confirm or eliminate: Only a test exists",
        targetHypothesisIds: [hypothesisId],
        explanation: "Top-ranked hypothesis has no supporting evidence.",
      },
    });
    const withAction = selectNextAction(session, reasoningOutput);
    const actionId = withAction.currentNextAction!.id;

    const result = cannotPerformAction(withAction, actionId, reasoningOutput, {
      reason: "No suitable tool available and no other lead to follow.",
    });

    expect(result.actionHistory[result.actionHistory.length - 1]?.kind).toBe("cannot_perform");
    expect(result.actionHistory[result.actionHistory.length - 1]?.alternativeActionId).toBeNull();
    expect(result.remainingUncertainty.length).toBeGreaterThan(0);
    expect(result.currentNextAction).not.toBeNull();
    expect(result.currentNextAction!.type).toBe("request_evidence");
  });

  it("GSC-11: never recommends part replacement before the root cause is confirmed", async () => {
    // Qualifying evidence exists, but confirmHypothesis() has not been called.
    let session = freshSession("engine");
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
      tier: "confirmed",
      description: "Return-volume test isolated cylinder 1 conclusively.",
    });
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, hypothesisId, evidenceId, "mechanic", "Confirms it.");

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    const action = computeNextAction(session, output);
    expect(action.type).toBe("mechanic_confirmation");
    expect(action.sourceRecommendationIds).toEqual([hypothesisId]);

    // Only AFTER the mechanic confirms and a repair is recorded does a
    // repair-related action appear — never before.
    session = confirmHypothesis(session, hypothesisId, "mechanic", "Proven by measurement.");
    session = recordRepairDecision(session, {
      rootCauseHypothesisId: hypothesisId,
      repairPerformed: "Replaced injector #1",
    });
    session = completeSession(session);

    const postRepairOutput = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    const postRepairAction = computeNextAction(session, postRepairOutput);
    expect(postRepairAction.type).toBe("repair_verification");
  });

  it("GSC-12: the orchestrator never mutates evidence or hypotheses", async () => {
    let session = freshSession("engine");
    session = addHypothesis(
      session,
      { title: "Injector back-leak", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    session = addEvidence(session, {
      source: "scan_tool",
      category: "dtc",
      tier: "confirmed",
      description: "P0093 present.",
    });

    const evidenceBefore = JSON.stringify(session.evidenceLog);
    const hypothesesBefore = JSON.stringify(session.hypotheses);
    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));

    let result = selectNextAction(session, output);
    const actionId = result.currentNextAction!.id;
    result = skipAction(result, actionId, "Testing mutation safety.");

    expect(JSON.stringify(result.evidenceLog)).toBe(evidenceBefore);
    expect(JSON.stringify(result.hypotheses)).toBe(hypothesesBefore);
  });

  it("GSC-13: computeNextAction is deterministic for identical input", async () => {
    let session = freshSession("engine");
    session = addHypothesis(
      session,
      { title: "Injector back-leak", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason",
    );
    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));

    const first = computeNextAction(session, output);
    const second = computeNextAction(session, output);

    const { createdAt: _a, ...firstRest } = first;
    const { createdAt: _b, ...secondRest } = second;
    expect(firstRest).toEqual(secondRest);
  });

  it("GSC-14: full session save/load fidelity for action state", () => {
    const session = freshSession("engine");
    const reasoningOutput = makeReasoningOutput({
      nextQuestionRecommendation: { questionText: "q", targetSystemId: "engine", explanation: "r" },
    });
    let result = selectNextAction(session, reasoningOutput);
    result = skipAction(result, result.currentNextAction!.id, "Preserving for save/load test.");

    saveSession(result);
    const loaded = loadSession(result.id);

    expect(loaded).toBeDefined();
    expect(loaded!.actionLog).toHaveLength(1);
    expect(loaded!.actionHistory).toHaveLength(1);
    expect(loaded!.actionHistory[0].reason).toBe("Preserving for save/load test.");
    expect(loaded!.currentNextAction).toBeNull();
  });

  it("GSC-15 (supporting): accepting an action clears currentNextAction and records the result", () => {
    const session = freshSession("engine");
    const reasoningOutput = makeReasoningOutput({
      nextQuestionRecommendation: { questionText: "q", targetSystemId: "engine", explanation: "r" },
    });
    const withAction = selectNextAction(session, reasoningOutput);
    const actionId = withAction.currentNextAction!.id;

    const accepted = acceptAction(withAction, actionId, "Answered: happens more when warm.");
    expect(accepted.currentNextAction).toBeNull();
    expect(accepted.actionHistory[0].kind).toBe("accepted");
    expect(accepted.actionHistory[0].result).toBe("Answered: happens more when warm.");
  });

  it("GSC-16 (supporting): responding to an action that isn't the current one is rejected", () => {
    const session = freshSession("engine");
    expect(() => acceptAction(session, "not_the_active_action", "result")).toThrow(
      NoActiveActionError,
    );

    const reasoningOutput = makeReasoningOutput({
      nextQuestionRecommendation: { questionText: "q", targetSystemId: "engine", explanation: "r" },
    });
    const withAction = selectNextAction(session, reasoningOutput);
    expect(() => acceptAction(withAction, "wrong_id", "result")).toThrow(ActionMismatchError);
  });

  it("GSC-17 (supporting): session_complete is selected once the session is verified", async () => {
    let session = freshSession("engine");
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
      tier: "confirmed",
      description: "Return-volume test isolated cylinder 1 conclusively.",
    });
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, hypothesisId, evidenceId, "mechanic", "Confirms it.");
    session = confirmHypothesis(session, hypothesisId, "mechanic", "Proven.");
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

    const output = await ruleBasedReasoningProvider.analyze(buildReasoningInput(session));
    const action = computeNextAction(session, output);
    expect(action.type).toBe("session_complete");
  });

  it("GSC-18 (supporting): providing an alternative result clears currentNextAction and records it", () => {
    const session = freshSession("engine");
    const reasoningOutput = makeReasoningOutput({
      nextQuestionRecommendation: { questionText: "q", targetSystemId: "engine", explanation: "r" },
    });
    const withAction = selectNextAction(session, reasoningOutput);
    const actionId = withAction.currentNextAction!.id;

    expect(() => provideAlternativeResult(withAction, actionId, "")).toThrow();

    const result = provideAlternativeResult(
      withAction,
      actionId,
      "Already knew this from a similar prior case.",
    );
    expect(result.currentNextAction).toBeNull();
    expect(result.actionHistory[0].kind).toBe("alternative_result");
    expect(result.actionHistory[0].result).toBe("Already knew this from a similar prior case.");
  });
});
