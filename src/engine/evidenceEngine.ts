/**
 * Evidence Engine — Milestone 2.
 *
 * The single source of truth for diagnostic evidence. Every hypothesis,
 * question, recommendation, and report the reasoning layers produce later
 * must ultimately derive from evidence recorded here — nothing is ever
 * inferred without a traceable evidence entry behind it.
 *
 * Like sessionEngine.ts, this module is part of the Rule Engine
 * (decision-authority-model.md §1): it enforces HOW evidence may change,
 * never WHAT the evidence means diagnostically (no ranking, no inference —
 * that is later milestones' job).
 *
 * The core guarantee: evidence is never silently overwritten, and nothing
 * is ever lost.
 *   - "Add"    appends a brand-new entry to session.evidenceLog.
 *   - "Update" and "Change Tier" never erase the previous state — each
 *     change appends a new, timestamped EvidenceRevision onto that entry's
 *     own history, and the entry's top-level fields are updated to mirror
 *     the latest revision (for convenient reading of "current" state).
 *   - "Remove" is a SOFT retraction — the entry is marked `retractedAt`
 *     and stays in the log forever; it is never deleted from the array.
 * Every one of these changes is therefore fully traceable by walking an
 * entry's `revisions` array from oldest to newest.
 */
import type {
  DiagnosticSession,
  EvidenceAttachment,
  EvidenceCategory,
  EvidenceEntry,
  EvidenceLinks,
  EvidenceRevision,
  EvidenceSource,
  EvidenceTier,
} from "@/types/session";
import { uid } from "@/services/store";
import { assertSessionActive } from "@/engine/sessionEngine";

/* ------------------------------- Errors --------------------------------- */

/** Thrown when an operation targets an evidence id that doesn't exist. */
export class EvidenceNotFoundError extends Error {
  constructor(public readonly evidenceId: string) {
    super(`Evidence "${evidenceId}" does not exist in this session.`);
    this.name = "EvidenceNotFoundError";
  }
}

/** Thrown when trying to modify evidence that has already been retracted. */
export class EvidenceRetractedError extends Error {
  constructor(public readonly evidenceId: string) {
    super(
      `Evidence "${evidenceId}" has already been retracted and cannot be ` +
        `modified further. Add new evidence instead of reviving old evidence.`,
    );
    this.name = "EvidenceRetractedError";
  }
}

/* ------------------------------- Guards ---------------------------------- */

function assertDescription(description: string): void {
  if (!description || description.trim().length === 0) {
    throw new Error("Evidence description cannot be empty.");
  }
}

function findEvidenceOrThrow(
  session: DiagnosticSession,
  evidenceId: string,
): EvidenceEntry {
  const entry = session.evidenceLog.find((e) => e.id === evidenceId);
  if (!entry) throw new EvidenceNotFoundError(evidenceId);
  return entry;
}

function assertNotRetracted(entry: EvidenceEntry): void {
  if (entry.retractedAt !== null) {
    throw new EvidenceRetractedError(entry.id);
  }
}

function replaceEvidence(
  session: DiagnosticSession,
  evidenceId: string,
  updated: EvidenceEntry,
  now: number,
): DiagnosticSession {
  return {
    ...session,
    updatedAt: now,
    evidenceLog: session.evidenceLog.map((e) =>
      e.id === evidenceId ? updated : e,
    ),
  };
}

/* --------------------------------- Add ------------------------------------ */

export interface AddEvidenceInput {
  source: EvidenceSource;
  category: EvidenceCategory;
  tier: EvidenceTier;
  description: string;
  links?: EvidenceLinks;
  attachments?: EvidenceAttachment[];
}

/** Record a brand-new piece of evidence. Always appends — never overwrites. */
export function addEvidence(
  session: DiagnosticSession,
  input: AddEvidenceInput,
): DiagnosticSession {
  assertSessionActive(session);
  assertDescription(input.description);

  const now = Date.now();
  const links = input.links ?? {};
  const attachments = input.attachments ?? [];

  const revision: EvidenceRevision = {
    id: uid("rev"),
    kind: "created",
    tier: input.tier,
    category: input.category,
    description: input.description,
    links,
    attachments,
    recordedAt: now,
  };

  const entry: EvidenceEntry = {
    id: uid("evidence"),
    sessionId: session.id,
    source: input.source,
    category: input.category,
    tier: input.tier,
    description: input.description,
    links,
    attachments,
    retractedAt: null,
    retractedReason: null,
    createdAt: now,
    updatedAt: now,
    revisions: [revision],
  };

  return {
    ...session,
    updatedAt: now,
    evidenceLog: [...session.evidenceLog, entry],
  };
}

/* -------------------------------- Update ----------------------------------- */

export interface UpdateEvidenceInput {
  description?: string;
  category?: EvidenceCategory;
  links?: EvidenceLinks;
  attachments?: EvidenceAttachment[];
  /** Optional free-text reason for the change, kept in the revision. */
  reason?: string;
}

/**
 * Update an evidence item's description/category/links/attachments.
 * Deliberately CANNOT change the tier — see changeEvidenceTier(), which
 * exists as its own operation because tier changes are diagnostically
 * significant and must be justified with a reason.
 */
export function updateEvidence(
  session: DiagnosticSession,
  evidenceId: string,
  input: UpdateEvidenceInput,
): DiagnosticSession {
  assertSessionActive(session);
  const entry = findEvidenceOrThrow(session, evidenceId);
  assertNotRetracted(entry);

  const nextDescription = input.description ?? entry.description;
  assertDescription(nextDescription);
  const nextCategory = input.category ?? entry.category;
  const nextLinks = input.links ?? entry.links;
  const nextAttachments = input.attachments ?? entry.attachments;

  const now = Date.now();
  const revision: EvidenceRevision = {
    id: uid("rev"),
    kind: "updated",
    tier: entry.tier,
    category: nextCategory,
    description: nextDescription,
    links: nextLinks,
    attachments: nextAttachments,
    reason: input.reason,
    recordedAt: now,
  };

  const updatedEntry: EvidenceEntry = {
    ...entry,
    description: nextDescription,
    category: nextCategory,
    links: nextLinks,
    attachments: nextAttachments,
    updatedAt: now,
    revisions: [...entry.revisions, revision],
  };

  return replaceEvidence(session, evidenceId, updatedEntry, now);
}

/* ----------------------------- Change tier ---------------------------------- */

/**
 * Change an evidence item's reliability tier. A dedicated operation,
 * distinct from updateEvidence(), because tier drives how much weight
 * later reasoning gives this evidence — every change is REQUIRED to state
 * why, and is recorded as its own "tier_changed" revision.
 */
export function changeEvidenceTier(
  session: DiagnosticSession,
  evidenceId: string,
  newTier: EvidenceTier,
  reason: string,
): DiagnosticSession {
  assertSessionActive(session);
  if (!reason || reason.trim().length === 0) {
    throw new Error(
      "Changing an evidence item's tier requires a reason — tier is " +
        "diagnostically significant and every change must be justified.",
    );
  }
  const entry = findEvidenceOrThrow(session, evidenceId);
  assertNotRetracted(entry);

  const now = Date.now();
  const revision: EvidenceRevision = {
    id: uid("rev"),
    kind: "tier_changed",
    tier: newTier,
    category: entry.category,
    description: entry.description,
    links: entry.links,
    attachments: entry.attachments,
    reason,
    recordedAt: now,
  };

  const updatedEntry: EvidenceEntry = {
    ...entry,
    tier: newTier,
    updatedAt: now,
    revisions: [...entry.revisions, revision],
  };

  return replaceEvidence(session, evidenceId, updatedEntry, now);
}

/* -------------------------------- Remove ------------------------------------ */

/**
 * Soft-retract an evidence item. It is NEVER removed from
 * session.evidenceLog — only marked retracted, with a final "retracted"
 * revision appended. Its full history, including its original content,
 * remains readable forever.
 */
export function removeEvidence(
  session: DiagnosticSession,
  evidenceId: string,
  reason?: string,
): DiagnosticSession {
  assertSessionActive(session);
  const entry = findEvidenceOrThrow(session, evidenceId);
  assertNotRetracted(entry);

  const now = Date.now();
  const revision: EvidenceRevision = {
    id: uid("rev"),
    kind: "retracted",
    tier: entry.tier,
    category: entry.category,
    description: entry.description,
    links: entry.links,
    attachments: entry.attachments,
    reason,
    recordedAt: now,
  };

  const updatedEntry: EvidenceEntry = {
    ...entry,
    retractedAt: now,
    retractedReason: reason ?? null,
    updatedAt: now,
    revisions: [...entry.revisions, revision],
  };

  return replaceEvidence(session, evidenceId, updatedEntry, now);
}

/* -------------------------------- Queries ------------------------------------ */

/** Find an evidence item by id — retracted or not. Nothing is ever truly gone. */
export function getEvidenceById(
  session: DiagnosticSession,
  evidenceId: string,
): EvidenceEntry | undefined {
  return session.evidenceLog.find((e) => e.id === evidenceId);
}

/** The evidence currently in force — excludes retracted entries. */
export function listActiveEvidence(session: DiagnosticSession): EvidenceEntry[] {
  return session.evidenceLog.filter((e) => e.retractedAt === null);
}
