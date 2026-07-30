/**
 * Reasoning Layer — provider contract & session bridge (Milestone 4).
 *
 * `ReasoningProvider` is the interface every reasoning source implements —
 * mirroring how `AiProvider` is defined in services/ai.ts. Screens and
 * future Rule Engine code should depend on this interface, never on a
 * concrete provider, so the reasoning source can change (rule-based today,
 * AI or a Verified Diagnosis Library later, or a Hybrid of several) without
 * any caller changing.
 *
 * `buildReasoningInput` is the ONLY place reasoning code touches
 * session-shaped data. It reads through the Evidence Engine's
 * `listActiveEvidence` and the Hypothesis Engine's `listActiveHypotheses`
 * — never the raw arrays — so retracted evidence and settled
 * (eliminated/confirmed) hypotheses are never handed to a provider in the
 * first place.
 */
import type { DiagnosticSession } from "@/types/session";
import type {
  ReasoningInput,
  ReasoningOutput,
  ReasoningProviderKind,
} from "@/types/reasoning";
import { listActiveEvidence } from "@/engine/evidenceEngine";
import { listActiveHypotheses } from "@/engine/hypothesisEngine";

/**
 * The contract every reasoning source must implement. Async so a future
 * network-backed AI provider is a drop-in replacement for a synchronous
 * rule-based provider — no caller needs to change when that happens.
 */
export interface ReasoningProvider {
  readonly kind: ReasoningProviderKind;
  analyze(input: ReasoningInput): Promise<ReasoningOutput>;
}

/**
 * Build a read-only ReasoningInput from a DiagnosticSession. This is the
 * hand-off point between the Rule Engine's state (Session/Evidence/
 * Hypothesis Engines) and the Reasoning Layer: a provider only ever sees
 * this curated projection, never the session itself, so it structurally
 * cannot mutate session state even by accident.
 */
export function buildReasoningInput(session: DiagnosticSession): ReasoningInput {
  return {
    vehicle: session.vehicle,
    system: session.system,
    complaint: session.complaint,
    dtcs: session.dtcs,
    evidence: listActiveEvidence(session),
    hypotheses: listActiveHypotheses(session),
  };
}
