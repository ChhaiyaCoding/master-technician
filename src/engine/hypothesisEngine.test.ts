/**
 * Gold Standard Cases — Hypothesis Engine, Milestone 3.
 *
 * Written before the implementation they validate. The Hypothesis Engine
 * is only considered complete once every case here passes.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createSession } from "@/engine/sessionEngine";
import { addEvidence, removeEvidence } from "@/engine/evidenceEngine";
import {
  addHypothesis,
  changeHypothesisStatus,
  confirmHypothesis,
  eliminateHypothesis,
  EvidenceSessionMismatchError,
  HypothesisAlreadyConfirmedError,
  HypothesisNotFoundError,
  HypothesisTerminalError,
  InsufficientConfirmationEvidenceError,
  linkContradictingEvidence,
  linkSupportingEvidence,
  listActiveHypotheses,
  MechanicAuthorityRequiredError,
  reorderActiveHypotheses,
  unlinkEvidence,
  updateHypothesisDetails,
} from "@/engine/hypothesisEngine";
import { saveSession, loadSession } from "@/engine/sessionEngine";
import type { DiagnosticSession, EvidenceEntry } from "@/types/session";
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

/** A session with one hypothesis added through the real engine call. */
function withOneHypothesis(): DiagnosticSession {
  return addHypothesis(
    freshSession(),
    {
      title: "Injector #1 internal back-leak",
      description: "Worn injector bleeding rail pressure to return.",
      systemId: "engine",
      failureDomain: "mechanical",
    },
    "mechanic",
    "Matches the P0093 pattern and the recover-after-rest behavior.",
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("Hypothesis Engine — Gold Standard Cases (Milestone 3)", () => {
  it("GSC-1: adding a hypothesis with a reason creates a fully-formed record with one 'created' revision", () => {
    const session = withOneHypothesis();
    expect(session.hypotheses).toHaveLength(1);
    const h = session.hypotheses[0];

    expect(h.id).toMatch(/^hypothesis_/);
    expect(h.title).toBe("Injector #1 internal back-leak");
    expect(h.description).toBe("Worn injector bleeding rail pressure to return.");
    expect(h.systemId).toBe("engine");
    expect(h.failureDomain).toBe("mechanical");
    expect(h.status).toBe("active");
    expect(h.rank).toBe(1);
    expect(h.supportingEvidenceIds).toEqual([]);
    expect(h.contradictingEvidenceIds).toEqual([]);
    expect(h.missingEvidenceRequirements).toEqual([]);
    expect(h.createdAt).toBe(h.updatedAt);
    expect(h.revisions).toHaveLength(1);
    expect(h.revisions[0].kind).toBe("created");
    expect(h.revisions[0].initiatedBy).toBe("mechanic");
    expect(h.revisions[0].reason).toBe(
      "Matches the P0093 pattern and the recover-after-rest behavior.",
    );
  });

  it("GSC-2: rejects adding a hypothesis without a reason", () => {
    expect(() =>
      addHypothesis(
        freshSession(),
        {
          title: "Some cause",
          description: "Some description.",
          systemId: "engine",
          failureDomain: "mechanical",
        },
        "mechanic",
        "",
      ),
    ).toThrow();
    expect(() =>
      addHypothesis(
        freshSession(),
        {
          title: "Some cause",
          description: "Some description.",
          systemId: "engine",
          failureDomain: "mechanical",
        },
        "mechanic",
        "   ",
      ),
    ).toThrow();
  });

  it("GSC-3: links valid supporting evidence from the same session", () => {
    let session = withOneHypothesis();
    session = addEvidence(session, {
      source: "scan_tool",
      category: "dtc",
      tier: "confirmed",
      description: "P0093 present.",
    });
    const hypothesisId = session.hypotheses[0].id;
    const evidenceId = session.evidenceLog[0].id;

    session = linkSupportingEvidence(
      session,
      hypothesisId,
      evidenceId,
      "mechanic",
      "The code directly implicates a large fuel-system leak.",
    );

    const h = session.hypotheses[0];
    expect(h.supportingEvidenceIds).toEqual([evidenceId]);
    expect(h.revisions[h.revisions.length - 1].kind).toBe("evidence_linked");
    expect(h.revisions[h.revisions.length - 1].supportingEvidenceIds).toEqual([evidenceId]);
  });

  it("GSC-4: rejects linking evidence with an unknown id, and evidence belonging to another session", () => {
    let session = withOneHypothesis();
    const hypothesisId = session.hypotheses[0].id;

    // Unknown id entirely.
    expect(() =>
      linkSupportingEvidence(
        session,
        hypothesisId,
        "does_not_exist",
        "mechanic",
        "reason",
      ),
    ).toThrow();

    // An evidence record that exists in the array but whose sessionId
    // doesn't match this session — simulating a data-integrity problem,
    // not just a missing id.
    const foreignEvidence: EvidenceEntry = {
      id: "evidence_foreign",
      sessionId: "session_other",
      source: "technician",
      category: "technician_note",
      tier: "observed",
      description: "Evidence that actually belongs to a different session.",
      links: {},
      attachments: [],
      retractedAt: null,
      retractedReason: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      revisions: [],
    };
    session = { ...session, evidenceLog: [...session.evidenceLog, foreignEvidence] };

    expect(() =>
      linkSupportingEvidence(
        session,
        hypothesisId,
        "evidence_foreign",
        "mechanic",
        "reason",
      ),
    ).toThrow(EvidenceSessionMismatchError);
  });

  it("GSC-5: retracted evidence is ignored as active support even though its link is preserved", () => {
    let session = withOneHypothesis();
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "measured",
      description: "Injector #1 return volume exceeds spec.",
    });
    const hypothesisId = session.hypotheses[0].id;
    const evidenceId = session.evidenceLog[0].id;

    session = linkSupportingEvidence(
      session,
      hypothesisId,
      evidenceId,
      "mechanic",
      "Confirms excessive back-leak on cylinder 1.",
    );
    // Confirmable before retraction.
    expect(() =>
      confirmHypothesis(
        session,
        hypothesisId,
        "mechanic",
        "Return-volume test proved it.",
      ),
    ).not.toThrow();

    // Now retract the evidence and confirm it can no longer support confirmation.
    session = removeEvidence(session, evidenceId, "Re-measured with a calibrated rig — voided.");
    expect(session.hypotheses[0].supportingEvidenceIds).toEqual([evidenceId]); // link preserved
    expect(() =>
      confirmHypothesis(
        session,
        hypothesisId,
        "mechanic",
        "Attempting again after retraction.",
      ),
    ).toThrow(InsufficientConfirmationEvidenceError);
  });

  it("GSC-6: links contradicting evidence", () => {
    let session = withOneHypothesis();
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "measured",
      description: "Injector #1 return volume is within spec after all.",
    });
    const hypothesisId = session.hypotheses[0].id;
    const evidenceId = session.evidenceLog[0].id;

    session = linkContradictingEvidence(
      session,
      hypothesisId,
      evidenceId,
      "mechanic",
      "Return volume came back normal — weakens this theory.",
    );
    const h = session.hypotheses[0];
    expect(h.contradictingEvidenceIds).toEqual([evidenceId]);
    expect(h.supportingEvidenceIds).toEqual([]);
  });

  it("GSC-7: unlinking evidence preserves the link's history — it is not silently erased", () => {
    let session = withOneHypothesis();
    session = addEvidence(session, {
      source: "scan_tool",
      category: "dtc",
      tier: "confirmed",
      description: "P0093 present.",
    });
    const hypothesisId = session.hypotheses[0].id;
    const evidenceId = session.evidenceLog[0].id;

    session = linkSupportingEvidence(
      session,
      hypothesisId,
      evidenceId,
      "mechanic",
      "Initially thought relevant.",
    );
    session = unlinkEvidence(
      session,
      hypothesisId,
      evidenceId,
      "mechanic",
      "On reflection, this code doesn't actually implicate this cause.",
    );

    const h = session.hypotheses[0];
    expect(h.supportingEvidenceIds).toEqual([]); // currently unlinked
    expect(h.revisions.map((r) => r.kind)).toEqual([
      "created",
      "evidence_linked",
      "evidence_unlinked",
    ]);
    // The revision history still shows it WAS linked at one point.
    expect(h.revisions[1].supportingEvidenceIds).toEqual([evidenceId]);
    expect(h.revisions[2].supportingEvidenceIds).toEqual([]);
  });

  it("GSC-8: eliminating a hypothesis changes its status without deleting it from session history", () => {
    let session = withOneHypothesis();
    const hypothesisId = session.hypotheses[0].id;

    session = eliminateHypothesis(
      session,
      hypothesisId,
      "mechanic",
      "Return-volume test came back clean — ruled out.",
    );

    expect(session.hypotheses).toHaveLength(1);
    expect(session.hypotheses[0].status).toBe("eliminated");
    expect(session.hypotheses[0].revisions[session.hypotheses[0].revisions.length - 1].kind).toBe("status_changed");
  });

  it("GSC-9: prevents confirmation without at least one active Measured or Confirmed evidence item", () => {
    let session = withOneHypothesis();
    const hypothesisId = session.hypotheses[0].id;

    // No evidence linked at all.
    expect(() =>
      confirmHypothesis(session, hypothesisId, "mechanic", "Just a hunch."),
    ).toThrow(InsufficientConfirmationEvidenceError);

    // Only "reported" tier evidence linked — still not enough.
    session = addEvidence(session, {
      source: "customer",
      category: "symptom",
      tier: "reported",
      description: "Customer says it happens more when it's hot outside.",
    });
    const reportedEvidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(
      session,
      hypothesisId,
      reportedEvidenceId,
      "mechanic",
      "Weak circumstantial support.",
    );
    expect(() =>
      confirmHypothesis(session, hypothesisId, "mechanic", "Still just a hunch."),
    ).toThrow(InsufficientConfirmationEvidenceError);
  });

  it("GSC-10: prevents an AI suggestion from becoming a confirmed root cause", () => {
    let session = withOneHypothesis();
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "confirmed",
      description: "Return-volume test isolated cylinder 1 conclusively.",
    });
    const hypothesisId = session.hypotheses[0].id;
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(
      session,
      hypothesisId,
      evidenceId,
      "ai_suggestion",
      "AI proposes this is the root cause.",
    );

    expect(() =>
      confirmHypothesis(
        session,
        hypothesisId,
        "ai_suggestion",
        "AI suggests confirming this now.",
      ),
    ).toThrow(MechanicAuthorityRequiredError);

    expect(() =>
      confirmHypothesis(
        session,
        hypothesisId,
        "rule_engine",
        "Automated confirmation attempt.",
      ),
    ).toThrow(MechanicAuthorityRequiredError);
  });

  it("GSC-11: allows a mechanic-confirmed root cause once qualifying evidence exists", () => {
    let session = withOneHypothesis();
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "confirmed",
      description: "Return-volume test isolated cylinder 1 conclusively.",
    });
    const hypothesisId = session.hypotheses[0].id;
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(
      session,
      hypothesisId,
      evidenceId,
      "mechanic",
      "Directly confirms the injector.",
    );

    session = confirmHypothesis(
      session,
      hypothesisId,
      "mechanic",
      "I performed and witnessed the return-volume test myself.",
    );

    const h = session.hypotheses[0];
    expect(h.status).toBe("confirmed");
    expect(session.currentBestTheory).toBe(hypothesisId);
    expect(h.revisions[h.revisions.length - 1].initiatedBy).toBe("mechanic");
  });

  it("GSC-12: enforces only one confirmed root cause at a time", () => {
    let session = withOneHypothesis();
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "confirmed",
      description: "Return-volume test isolated cylinder 1 conclusively.",
    });
    const firstId = session.hypotheses[0].id;
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, firstId, evidenceId, "mechanic", "Confirms it.");
    session = confirmHypothesis(session, firstId, "mechanic", "Proven by measurement.");

    session = addHypothesis(
      session,
      {
        title: "SCV sticking",
        description: "Alternative theory considered too late.",
        systemId: "engine",
        failureDomain: "control",
      },
      "mechanic",
      "Considering an alternative just in case.",
    );
    const secondId = session.hypotheses[1].id;
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "confirmed",
      description: "SCV resistance also out of spec.",
    });
    const secondEvidenceId = session.evidenceLog[1].id;
    session = linkSupportingEvidence(
      session,
      secondId,
      secondEvidenceId,
      "mechanic",
      "Also has qualifying evidence.",
    );

    expect(() =>
      confirmHypothesis(session, secondId, "mechanic", "Trying to confirm a second cause."),
    ).toThrow(HypothesisAlreadyConfirmedError);

    // The first confirmation was not disturbed by the rejected attempt.
    expect(session.hypotheses[0].status).toBe("confirmed");
    expect(session.hypotheses[1].status).toBe("active");
  });

  it("GSC-13: preserves the full revision history across the entire hypothesis lifecycle", () => {
    let session = withOneHypothesis();
    const hypothesisId = session.hypotheses[0].id;

    session = updateHypothesisDetails(
      session,
      hypothesisId,
      { missingEvidenceRequirements: ["Injector return-volume test not yet performed."] },
      "mechanic",
      "Noting what's still needed.",
    );
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "confirmed",
      description: "Return-volume test isolated cylinder 1 conclusively.",
    });
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, hypothesisId, evidenceId, "mechanic", "Confirms it.");
    session = confirmHypothesis(session, hypothesisId, "mechanic", "Proven.");

    const h = session.hypotheses[0];
    expect(h.revisions.map((r) => r.kind)).toEqual([
      "created",
      "details_updated",
      "evidence_linked",
      "status_changed",
    ]);
    // The original title/description are still visible in the first revision.
    expect(h.revisions[0].title).toBe("Injector #1 internal back-leak");
    expect(h.revisions[0].missingEvidenceRequirements).toEqual([]);
    expect(h.revisions[1].missingEvidenceRequirements).toEqual([
      "Injector return-volume test not yet performed.",
    ]);
  });

  it("GSC-14: lists active hypotheses (active + weakened) in ranked order, excluding eliminated/confirmed", () => {
    let session = freshSession();
    session = addHypothesis(
      session,
      { title: "A", description: "d", systemId: "engine", failureDomain: "mechanical" },
      "mechanic",
      "reason A",
    );
    session = addHypothesis(
      session,
      { title: "B", description: "d", systemId: "engine", failureDomain: "control" },
      "mechanic",
      "reason B",
    );
    session = addHypothesis(
      session,
      { title: "C", description: "d", systemId: "engine", failureDomain: "signal" },
      "mechanic",
      "reason C",
    );
    const [a, b, c] = session.hypotheses.map((h) => h.id);

    // Weaken B, eliminate C — both should behave differently in the list.
    session = changeHypothesisStatus(session, b, "weakened", "mechanic", "Some doubt raised.");
    session = eliminateHypothesis(session, c, "mechanic", "Ruled out.");

    // Reorder the remaining active/weakened set: B first, then A.
    session = reorderActiveHypotheses(session, [b, a], "mechanic", "B now looks more likely.");

    const active = listActiveHypotheses(session);
    expect(active.map((h) => h.id)).toEqual([b, a]);
    expect(active.map((h) => h.status)).toEqual(["weakened", "active"]);
    expect(active.every((h) => h.status !== "eliminated" && h.status !== "confirmed")).toBe(true);
  });

  it("GSC-15: reorder rejects a list that doesn't exactly match the current active/weakened set", () => {
    let session = withOneHypothesis();
    const onlyId = session.hypotheses[0].id;
    expect(() =>
      reorderActiveHypotheses(session, [onlyId, "does_not_exist"], "mechanic", "bad reorder"),
    ).toThrow();
    expect(() =>
      reorderActiveHypotheses(session, [], "mechanic", "missing entries"),
    ).toThrow();
  });

  it("GSC-16: terminal hypotheses (eliminated/confirmed) reject further detail edits, links, and status changes", () => {
    let session = withOneHypothesis();
    const hypothesisId = session.hypotheses[0].id;
    session = eliminateHypothesis(session, hypothesisId, "mechanic", "Ruled out.");

    expect(() =>
      updateHypothesisDetails(session, hypothesisId, { title: "New title" }, "mechanic"),
    ).toThrow(HypothesisTerminalError);
    expect(() =>
      changeHypothesisStatus(session, hypothesisId, "active", "mechanic", "Reviving it."),
    ).toThrow();
  });

  it("GSC-17: unknown hypothesis id is rejected clearly for every operation", () => {
    const session = withOneHypothesis();
    expect(() =>
      updateHypothesisDetails(session, "nope", { title: "x" }, "mechanic"),
    ).toThrow(HypothesisNotFoundError);
    expect(() => eliminateHypothesis(session, "nope", "mechanic", "x")).toThrow(
      HypothesisNotFoundError,
    );
  });

  it("GSC-18: save/load round-trips a session with hypotheses and revision history intact", () => {
    let session = withOneHypothesis();
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "confirmed",
      description: "Return-volume test isolated cylinder 1 conclusively.",
    });
    const hypothesisId = session.hypotheses[0].id;
    const evidenceId = session.evidenceLog[0].id;
    session = linkSupportingEvidence(session, hypothesisId, evidenceId, "mechanic", "Confirms it.");
    session = confirmHypothesis(session, hypothesisId, "mechanic", "Proven by measurement.");

    saveSession(session);
    const loaded = loadSession(session.id);

    expect(loaded).toBeDefined();
    expect(loaded!.hypotheses).toHaveLength(1);
    expect(loaded!.hypotheses[0].status).toBe("confirmed");
    expect(loaded!.hypotheses[0].revisions.map((r) => r.kind)).toEqual([
      "created",
      "evidence_linked",
      "status_changed",
    ]);
    expect(loaded!.currentBestTheory).toBe(hypothesisId);
  });
});
