/**
 * Hypothesis Engine — Milestone 3.
 *
 * Manages possible diagnostic causes (hypotheses) inside a Diagnostic
 * Session. Like sessionEngine.ts and evidenceEngine.ts, this is Rule Engine
 * territory (decision-authority-model.md §1): it enforces HOW a hypothesis
 * may change and WHO may confirm one — it never decides WHICH hypothesis is
 * correct. That judgment belongs to the reasoning layer (a later milestone)
 * and, for confirmation specifically, to the mechanic alone.
 *
 * Traceability guarantee (identical discipline to evidenceEngine.ts):
 *   - "Add" appends a brand-new hypothesis to session.hypotheses.
 *   - Every other operation (details, links, status, reorder) never erases
 *     the previous state — it appends a new, timestamped HypothesisRevision
 *     onto that hypothesis's own history, and the top-level fields mirror
 *     the latest revision for convenient reading.
 *   - Eliminating a hypothesis never deletes it — only its status changes.
 * Ranking is an explicit, explainable ordinal (`rank`), never a
 * probabilistic percentage — nothing here computes a confidence score.
 *
 * Authority rule (decision-authority-model.md, the override rule; this
 * milestone's brief): the Rule Engine and the AI Reasoning Layer may
 * propose adding, weakening, eliminating, or attempting to confirm a
 * hypothesis — but confirmHypothesis() only ever succeeds when
 * `initiatedBy === "mechanic"`. An AI or rule-engine attempt to confirm is
 * always rejected outright, never silently downgraded.
 */
import type { SystemId } from "@/types";
import type {
  ChangeInitiator,
  DiagnosticSession,
  FailureDomain,
  Hypothesis,
  HypothesisRevision,
  HypothesisStatus,
} from "@/types/session";
import { uid } from "@/services/store";
import { assertSessionActive } from "@/engine/sessionEngine";
import { EvidenceNotFoundError } from "@/engine/evidenceEngine";

export { EvidenceNotFoundError };

/* ------------------------------- Errors --------------------------------- */

export class HypothesisNotFoundError extends Error {
  constructor(public readonly hypothesisId: string) {
    super(`Hypothesis "${hypothesisId}" does not exist in this session.`);
    this.name = "HypothesisNotFoundError";
  }
}

/** Thrown when trying to modify a hypothesis that has reached a terminal status. */
export class HypothesisTerminalError extends Error {
  constructor(
    public readonly hypothesisId: string,
    public readonly status: HypothesisStatus,
  ) {
    super(
      `Hypothesis "${hypothesisId}" is "${status}" and cannot be modified further.`,
    );
    this.name = "HypothesisTerminalError";
  }
}

/** Thrown when a status change isn't a valid transition. */
export class HypothesisTransitionError extends Error {
  constructor(
    public readonly hypothesisId: string,
    public readonly from: HypothesisStatus,
    public readonly to: HypothesisStatus,
  ) {
    super(
      `Cannot change hypothesis "${hypothesisId}" from "${from}" to "${to}".`,
    );
    this.name = "HypothesisTransitionError";
  }
}

/** Thrown when linked evidence exists but does not belong to this session. */
export class EvidenceSessionMismatchError extends Error {
  constructor(
    public readonly evidenceId: string,
    public readonly evidenceSessionId: string,
    public readonly sessionId: string,
  ) {
    super(
      `Evidence "${evidenceId}" belongs to session "${evidenceSessionId}", ` +
        `not "${sessionId}" — refusing to link evidence across sessions.`,
    );
    this.name = "EvidenceSessionMismatchError";
  }
}

/** Thrown when linking evidence already linked (as either role) to this hypothesis. */
export class EvidenceAlreadyLinkedError extends Error {
  constructor(
    public readonly evidenceId: string,
    public readonly hypothesisId: string,
  ) {
    super(
      `Evidence "${evidenceId}" is already linked to hypothesis ` +
        `"${hypothesisId}". Unlink it first to change its role.`,
    );
    this.name = "EvidenceAlreadyLinkedError";
  }
}

/** Thrown when trying to unlink evidence that isn't currently linked. */
export class EvidenceNotLinkedError extends Error {
  constructor(
    public readonly evidenceId: string,
    public readonly hypothesisId: string,
  ) {
    super(
      `Evidence "${evidenceId}" is not currently linked to hypothesis "${hypothesisId}".`,
    );
    this.name = "EvidenceNotLinkedError";
  }
}

/** Thrown when anything other than the mechanic attempts to confirm a hypothesis. */
export class MechanicAuthorityRequiredError extends Error {
  constructor(
    public readonly hypothesisId: string,
    public readonly attemptedBy: ChangeInitiator,
  ) {
    super(
      `Hypothesis "${hypothesisId}" cannot be confirmed by "${attemptedBy}" ` +
        `— only the mechanic may confirm a root cause. An AI or rule-engine ` +
        `suggestion alone is never enough.`,
    );
    this.name = "MechanicAuthorityRequiredError";
  }
}

/** Thrown when trying to confirm a hypothesis while another is already confirmed. */
export class HypothesisAlreadyConfirmedError extends Error {
  constructor(
    public readonly confirmedHypothesisId: string,
    public readonly attemptedHypothesisId: string,
  ) {
    super(
      `Cannot confirm hypothesis "${attemptedHypothesisId}" — hypothesis ` +
        `"${confirmedHypothesisId}" is already confirmed as the root cause ` +
        `for this session. Only one hypothesis may be confirmed at a time.`,
    );
    this.name = "HypothesisAlreadyConfirmedError";
  }
}

/** Thrown when a hypothesis lacks qualifying evidence to be confirmed. */
export class InsufficientConfirmationEvidenceError extends Error {
  constructor(public readonly hypothesisId: string) {
    super(
      `Cannot confirm hypothesis "${hypothesisId}" — it must reference at ` +
        `least one active (non-retracted) Measured or Confirmed evidence item.`,
    );
    this.name = "InsufficientConfirmationEvidenceError";
  }
}

/** Thrown when a reorder list doesn't exactly match the current active/weakened set. */
export class InvalidReorderError extends Error {
  constructor(
    public readonly expectedIds: string[],
    public readonly providedIds: string[],
  ) {
    super(
      `Reorder must include exactly the current active/weakened hypotheses ` +
        `(expected: [${expectedIds.join(", ")}], got: [${providedIds.join(", ")}]).`,
    );
    this.name = "InvalidReorderError";
  }
}

/* ------------------------------- Guards ---------------------------------- */

function assertReason(reason: string, context: string): void {
  if (!reason || reason.trim().length === 0) {
    throw new Error(`${context} requires a reason.`);
  }
}

function findHypothesisOrThrow(
  session: DiagnosticSession,
  hypothesisId: string,
): Hypothesis {
  const hypothesis = session.hypotheses.find((h) => h.id === hypothesisId);
  if (!hypothesis) throw new HypothesisNotFoundError(hypothesisId);
  return hypothesis;
}

function assertNonTerminal(hypothesis: Hypothesis): void {
  if (hypothesis.status === "eliminated" || hypothesis.status === "confirmed") {
    throw new HypothesisTerminalError(hypothesis.id, hypothesis.status);
  }
}

function replaceHypothesis(
  session: DiagnosticSession,
  hypothesisId: string,
  updated: Hypothesis,
  now: number,
): DiagnosticSession {
  return {
    ...session,
    updatedAt: now,
    hypotheses: session.hypotheses.map((h) => (h.id === hypothesisId ? updated : h)),
  };
}

/**
 * Whether a hypothesis has at least one active Measured/Confirmed
 * supporting item. Exported for reuse by the Diagnostic Orchestrator
 * (orchestrator/orchestrator.ts), which needs the same rule to decide when
 * a "mechanic_confirmation" NextAction is warranted, without duplicating it.
 */
export function hasQualifyingConfirmationEvidence(
  session: DiagnosticSession,
  hypothesis: Hypothesis,
): boolean {
  return hypothesis.supportingEvidenceIds.some((evidenceId) => {
    const evidence = session.evidenceLog.find((e) => e.id === evidenceId);
    if (!evidence || evidence.retractedAt !== null) return false;
    return evidence.tier === "measured" || evidence.tier === "confirmed";
  });
}

/* --------------------------------- Add ------------------------------------ */

export interface AddHypothesisInput {
  title: string;
  description: string;
  systemId: SystemId | null;
  failureDomain: FailureDomain;
  missingEvidenceRequirements?: string[];
}

/**
 * Propose a new possible cause. Always requires a reason — a hypothesis
 * must never exist without one being stated up front.
 */
export function addHypothesis(
  session: DiagnosticSession,
  input: AddHypothesisInput,
  initiatedBy: ChangeInitiator,
  reason: string,
): DiagnosticSession {
  assertSessionActive(session);
  assertReason(reason, "Adding a hypothesis");
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Hypothesis title cannot be empty.");
  }

  const now = Date.now();
  const rank = listActiveHypotheses(session).length + 1;
  const missingEvidenceRequirements = input.missingEvidenceRequirements ?? [];

  const revision: HypothesisRevision = {
    id: uid("hrev"),
    kind: "created",
    status: "active",
    rank,
    title: input.title,
    description: input.description,
    systemId: input.systemId,
    failureDomain: input.failureDomain,
    supportingEvidenceIds: [],
    contradictingEvidenceIds: [],
    missingEvidenceRequirements,
    initiatedBy,
    reason,
    recordedAt: now,
  };

  const hypothesis: Hypothesis = {
    id: uid("hypothesis"),
    title: input.title,
    description: input.description,
    systemId: input.systemId,
    failureDomain: input.failureDomain,
    status: "active",
    rank,
    supportingEvidenceIds: [],
    contradictingEvidenceIds: [],
    missingEvidenceRequirements,
    createdAt: now,
    updatedAt: now,
    revisions: [revision],
  };

  return {
    ...session,
    updatedAt: now,
    hypotheses: [...session.hypotheses, hypothesis],
  };
}

/* -------------------------------- Update ----------------------------------- */

export interface UpdateHypothesisDetailsInput {
  title?: string;
  description?: string;
  systemId?: SystemId | null;
  failureDomain?: FailureDomain;
  missingEvidenceRequirements?: string[];
}

/**
 * Update a hypothesis's descriptive details. Never touches status, rank,
 * or evidence links — those each have their own dedicated operations.
 */
export function updateHypothesisDetails(
  session: DiagnosticSession,
  hypothesisId: string,
  input: UpdateHypothesisDetailsInput,
  initiatedBy: ChangeInitiator,
  reason?: string,
): DiagnosticSession {
  assertSessionActive(session);
  const hypothesis = findHypothesisOrThrow(session, hypothesisId);
  assertNonTerminal(hypothesis);

  const nextTitle = input.title ?? hypothesis.title;
  if (!nextTitle || nextTitle.trim().length === 0) {
    throw new Error("Hypothesis title cannot be empty.");
  }
  const nextDescription = input.description ?? hypothesis.description;
  const nextSystemId =
    input.systemId !== undefined ? input.systemId : hypothesis.systemId;
  const nextFailureDomain = input.failureDomain ?? hypothesis.failureDomain;
  const nextMissing =
    input.missingEvidenceRequirements ?? hypothesis.missingEvidenceRequirements;

  const now = Date.now();
  const revision: HypothesisRevision = {
    id: uid("hrev"),
    kind: "details_updated",
    status: hypothesis.status,
    rank: hypothesis.rank,
    title: nextTitle,
    description: nextDescription,
    systemId: nextSystemId,
    failureDomain: nextFailureDomain,
    supportingEvidenceIds: hypothesis.supportingEvidenceIds,
    contradictingEvidenceIds: hypothesis.contradictingEvidenceIds,
    missingEvidenceRequirements: nextMissing,
    initiatedBy,
    reason: reason ?? "",
    recordedAt: now,
  };

  const updated: Hypothesis = {
    ...hypothesis,
    title: nextTitle,
    description: nextDescription,
    systemId: nextSystemId,
    failureDomain: nextFailureDomain,
    missingEvidenceRequirements: nextMissing,
    updatedAt: now,
    revisions: [...hypothesis.revisions, revision],
  };

  return replaceHypothesis(session, hypothesisId, updated, now);
}

/* --------------------------- Evidence linking ------------------------------ */

function linkEvidenceInternal(
  session: DiagnosticSession,
  hypothesisId: string,
  evidenceId: string,
  target: "supporting" | "contradicting",
  initiatedBy: ChangeInitiator,
  reason: string,
): DiagnosticSession {
  assertSessionActive(session);
  assertReason(reason, "Linking evidence to a hypothesis");
  const hypothesis = findHypothesisOrThrow(session, hypothesisId);
  assertNonTerminal(hypothesis);

  const evidence = session.evidenceLog.find((e) => e.id === evidenceId);
  if (!evidence) throw new EvidenceNotFoundError(evidenceId);
  if (evidence.sessionId !== session.id) {
    throw new EvidenceSessionMismatchError(evidenceId, evidence.sessionId, session.id);
  }

  const alreadyLinked =
    hypothesis.supportingEvidenceIds.includes(evidenceId) ||
    hypothesis.contradictingEvidenceIds.includes(evidenceId);
  if (alreadyLinked) {
    throw new EvidenceAlreadyLinkedError(evidenceId, hypothesisId);
  }

  const nextSupporting =
    target === "supporting"
      ? [...hypothesis.supportingEvidenceIds, evidenceId]
      : hypothesis.supportingEvidenceIds;
  const nextContradicting =
    target === "contradicting"
      ? [...hypothesis.contradictingEvidenceIds, evidenceId]
      : hypothesis.contradictingEvidenceIds;

  const now = Date.now();
  const revision: HypothesisRevision = {
    id: uid("hrev"),
    kind: "evidence_linked",
    status: hypothesis.status,
    rank: hypothesis.rank,
    title: hypothesis.title,
    description: hypothesis.description,
    systemId: hypothesis.systemId,
    failureDomain: hypothesis.failureDomain,
    supportingEvidenceIds: nextSupporting,
    contradictingEvidenceIds: nextContradicting,
    missingEvidenceRequirements: hypothesis.missingEvidenceRequirements,
    initiatedBy,
    reason,
    recordedAt: now,
  };

  const updated: Hypothesis = {
    ...hypothesis,
    supportingEvidenceIds: nextSupporting,
    contradictingEvidenceIds: nextContradicting,
    updatedAt: now,
    revisions: [...hypothesis.revisions, revision],
  };

  return replaceHypothesis(session, hypothesisId, updated, now);
}

/** Link evidence that supports a hypothesis. Evidence must exist in this session. */
export function linkSupportingEvidence(
  session: DiagnosticSession,
  hypothesisId: string,
  evidenceId: string,
  initiatedBy: ChangeInitiator,
  reason: string,
): DiagnosticSession {
  return linkEvidenceInternal(
    session,
    hypothesisId,
    evidenceId,
    "supporting",
    initiatedBy,
    reason,
  );
}

/** Link evidence that contradicts/weakens a hypothesis. */
export function linkContradictingEvidence(
  session: DiagnosticSession,
  hypothesisId: string,
  evidenceId: string,
  initiatedBy: ChangeInitiator,
  reason: string,
): DiagnosticSession {
  return linkEvidenceInternal(
    session,
    hypothesisId,
    evidenceId,
    "contradicting",
    initiatedBy,
    reason,
  );
}

/**
 * Unlink evidence from a hypothesis. The link is removed from the CURRENT
 * state, but never silently — the prior revision still shows it was
 * linked, so the full history remains reconstructable.
 */
export function unlinkEvidence(
  session: DiagnosticSession,
  hypothesisId: string,
  evidenceId: string,
  initiatedBy: ChangeInitiator,
  reason: string,
): DiagnosticSession {
  assertSessionActive(session);
  assertReason(reason, "Unlinking evidence from a hypothesis");
  const hypothesis = findHypothesisOrThrow(session, hypothesisId);
  assertNonTerminal(hypothesis);

  const inSupporting = hypothesis.supportingEvidenceIds.includes(evidenceId);
  const inContradicting = hypothesis.contradictingEvidenceIds.includes(evidenceId);
  if (!inSupporting && !inContradicting) {
    throw new EvidenceNotLinkedError(evidenceId, hypothesisId);
  }

  const nextSupporting = hypothesis.supportingEvidenceIds.filter(
    (id) => id !== evidenceId,
  );
  const nextContradicting = hypothesis.contradictingEvidenceIds.filter(
    (id) => id !== evidenceId,
  );

  const now = Date.now();
  const revision: HypothesisRevision = {
    id: uid("hrev"),
    kind: "evidence_unlinked",
    status: hypothesis.status,
    rank: hypothesis.rank,
    title: hypothesis.title,
    description: hypothesis.description,
    systemId: hypothesis.systemId,
    failureDomain: hypothesis.failureDomain,
    supportingEvidenceIds: nextSupporting,
    contradictingEvidenceIds: nextContradicting,
    missingEvidenceRequirements: hypothesis.missingEvidenceRequirements,
    initiatedBy,
    reason,
    recordedAt: now,
  };

  const updated: Hypothesis = {
    ...hypothesis,
    supportingEvidenceIds: nextSupporting,
    contradictingEvidenceIds: nextContradicting,
    updatedAt: now,
    revisions: [...hypothesis.revisions, revision],
  };

  return replaceHypothesis(session, hypothesisId, updated, now);
}

/* ------------------------------- Status ------------------------------------ */

const HYPOTHESIS_TRANSITIONS: Record<HypothesisStatus, HypothesisStatus[]> = {
  active: ["weakened", "eliminated"],
  weakened: ["active", "eliminated"],
  eliminated: [],
  confirmed: [],
};

/**
 * Change a hypothesis's status among active/weakened/eliminated.
 * Deliberately CANNOT reach "confirmed" — that requires confirmHypothesis(),
 * which enforces the evidence and mechanic-authority rules.
 */
export function changeHypothesisStatus(
  session: DiagnosticSession,
  hypothesisId: string,
  newStatus: HypothesisStatus,
  initiatedBy: ChangeInitiator,
  reason: string,
): DiagnosticSession {
  assertSessionActive(session);
  assertReason(reason, "Changing a hypothesis's status");

  if (newStatus === "confirmed") {
    throw new Error(
      "Cannot set status to 'confirmed' via changeHypothesisStatus() — use " +
        "confirmHypothesis() instead, which enforces the evidence and " +
        "mechanic-authority rules.",
    );
  }

  const hypothesis = findHypothesisOrThrow(session, hypothesisId);
  if (!HYPOTHESIS_TRANSITIONS[hypothesis.status].includes(newStatus)) {
    throw new HypothesisTransitionError(hypothesis.id, hypothesis.status, newStatus);
  }

  const now = Date.now();
  const revision: HypothesisRevision = {
    id: uid("hrev"),
    kind: "status_changed",
    status: newStatus,
    rank: hypothesis.rank,
    title: hypothesis.title,
    description: hypothesis.description,
    systemId: hypothesis.systemId,
    failureDomain: hypothesis.failureDomain,
    supportingEvidenceIds: hypothesis.supportingEvidenceIds,
    contradictingEvidenceIds: hypothesis.contradictingEvidenceIds,
    missingEvidenceRequirements: hypothesis.missingEvidenceRequirements,
    initiatedBy,
    reason,
    recordedAt: now,
  };

  const updated: Hypothesis = {
    ...hypothesis,
    status: newStatus,
    updatedAt: now,
    revisions: [...hypothesis.revisions, revision],
  };

  return replaceHypothesis(session, hypothesisId, updated, now);
}

/** Rule out a hypothesis. It is NEVER deleted — only its status changes. */
export function eliminateHypothesis(
  session: DiagnosticSession,
  hypothesisId: string,
  initiatedBy: ChangeInitiator,
  reason: string,
): DiagnosticSession {
  return changeHypothesisStatus(session, hypothesisId, "eliminated", initiatedBy, reason);
}

/**
 * Confirm a hypothesis as the root cause. Enforces three hard rules:
 *   1. Only `initiatedBy === "mechanic"` may succeed — an AI or rule-engine
 *      suggestion is always rejected (decision-authority-model.md).
 *   2. At least one active (non-retracted) Measured or Confirmed evidence
 *      item must support it.
 *   3. No other hypothesis in this session may already be confirmed.
 * On success, also sets session.currentBestTheory — the same contract
 * sessionEngine.ts's completeSession() depends on.
 */
export function confirmHypothesis(
  session: DiagnosticSession,
  hypothesisId: string,
  initiatedBy: ChangeInitiator,
  reason: string,
): DiagnosticSession {
  assertSessionActive(session);
  assertReason(reason, "Confirming a hypothesis");

  if (initiatedBy !== "mechanic") {
    throw new MechanicAuthorityRequiredError(hypothesisId, initiatedBy);
  }

  const hypothesis = findHypothesisOrThrow(session, hypothesisId);
  assertNonTerminal(hypothesis);

  const otherConfirmed = session.hypotheses.find(
    (h) => h.id !== hypothesisId && h.status === "confirmed",
  );
  if (otherConfirmed) {
    throw new HypothesisAlreadyConfirmedError(otherConfirmed.id, hypothesisId);
  }

  if (!hasQualifyingConfirmationEvidence(session, hypothesis)) {
    throw new InsufficientConfirmationEvidenceError(hypothesisId);
  }

  const now = Date.now();
  const revision: HypothesisRevision = {
    id: uid("hrev"),
    kind: "status_changed",
    status: "confirmed",
    rank: hypothesis.rank,
    title: hypothesis.title,
    description: hypothesis.description,
    systemId: hypothesis.systemId,
    failureDomain: hypothesis.failureDomain,
    supportingEvidenceIds: hypothesis.supportingEvidenceIds,
    contradictingEvidenceIds: hypothesis.contradictingEvidenceIds,
    missingEvidenceRequirements: hypothesis.missingEvidenceRequirements,
    initiatedBy,
    reason,
    recordedAt: now,
  };

  const updated: Hypothesis = {
    ...hypothesis,
    status: "confirmed",
    updatedAt: now,
    revisions: [...hypothesis.revisions, revision],
  };

  return {
    ...replaceHypothesis(session, hypothesisId, updated, now),
    currentBestTheory: hypothesisId,
  };
}

/* -------------------------------- Reorder ----------------------------------- */

/**
 * Explicitly reorder the active/weakened hypothesis set. Must include
 * exactly the current active/weakened ids — nothing more, nothing fewer —
 * so reordering can never silently drop or invent a hypothesis. Ranking is
 * purely this explicit ordinal; nothing here infers priority from evidence.
 */
export function reorderActiveHypotheses(
  session: DiagnosticSession,
  orderedHypothesisIds: string[],
  initiatedBy: ChangeInitiator,
  reason: string,
): DiagnosticSession {
  assertSessionActive(session);
  assertReason(reason, "Reordering hypotheses");

  const currentActiveIds = listActiveHypotheses(session).map((h) => h.id);
  const sameSet =
    orderedHypothesisIds.length === currentActiveIds.length &&
    currentActiveIds.every((id) => orderedHypothesisIds.includes(id)) &&
    new Set(orderedHypothesisIds).size === orderedHypothesisIds.length;

  if (!sameSet) {
    throw new InvalidReorderError(currentActiveIds, orderedHypothesisIds);
  }

  const now = Date.now();
  let hypotheses = session.hypotheses;
  orderedHypothesisIds.forEach((hypothesisId, index) => {
    const hypothesis = hypotheses.find((h) => h.id === hypothesisId)!;
    const rank = index + 1;
    const revision: HypothesisRevision = {
      id: uid("hrev"),
      kind: "reordered",
      status: hypothesis.status,
      rank,
      title: hypothesis.title,
      description: hypothesis.description,
      systemId: hypothesis.systemId,
      failureDomain: hypothesis.failureDomain,
      supportingEvidenceIds: hypothesis.supportingEvidenceIds,
      contradictingEvidenceIds: hypothesis.contradictingEvidenceIds,
      missingEvidenceRequirements: hypothesis.missingEvidenceRequirements,
      initiatedBy,
      reason,
      recordedAt: now,
    };
    const updated: Hypothesis = {
      ...hypothesis,
      rank,
      updatedAt: now,
      revisions: [...hypothesis.revisions, revision],
    };
    hypotheses = hypotheses.map((h) => (h.id === hypothesisId ? updated : h));
  });

  return { ...session, updatedAt: now, hypotheses };
}

/* -------------------------------- Queries ------------------------------------ */

/**
 * The hypotheses still in play — status "active" or "weakened" — sorted by
 * rank ascending (1 = highest priority). Eliminated and confirmed
 * hypotheses are settled and excluded, though they remain in
 * session.hypotheses forever.
 */
export function listActiveHypotheses(session: DiagnosticSession): Hypothesis[] {
  return session.hypotheses
    .filter((h) => h.status === "active" || h.status === "weakened")
    .sort((a, b) => a.rank - b.rank);
}
