/**
 * Gold Standard Cases — Evidence Engine, Milestone 2.
 *
 * Written before the implementation they validate. The Evidence Engine is
 * only considered complete once every case here passes.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createSession, pauseSession } from "@/engine/sessionEngine";
import {
  addEvidence,
  changeEvidenceTier,
  EvidenceNotFoundError,
  EvidenceRetractedError,
  getEvidenceById,
  listActiveEvidence,
  removeEvidence,
  updateEvidence,
} from "@/engine/evidenceEngine";
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

beforeEach(() => {
  localStorage.clear();
});

describe("Evidence Engine — Gold Standard Cases (Milestone 2)", () => {
  it("GSC-1: addEvidence creates a fully-formed evidence item with a single 'created' revision", () => {
    const session = addEvidence(freshSession(), {
      source: "customer",
      category: "symptom",
      tier: "reported",
      description: "Stalls repeatedly, restarts after a few minutes' rest.",
    });

    expect(session.evidenceLog).toHaveLength(1);
    const entry = session.evidenceLog[0];

    expect(entry.id).toMatch(/^evidence_/);
    expect(entry.sessionId).toBe(session.id);
    expect(entry.source).toBe("customer");
    expect(entry.category).toBe("symptom");
    expect(entry.tier).toBe("reported");
    expect(entry.description).toBe(
      "Stalls repeatedly, restarts after a few minutes' rest.",
    );
    expect(entry.attachments).toEqual([]);
    expect(entry.retractedAt).toBeNull();
    expect(entry.retractedReason).toBeNull();
    expect(entry.createdAt).toBe(entry.updatedAt);
    expect(entry.revisions).toHaveLength(1);
    expect(entry.revisions[0].kind).toBe("created");
    expect(entry.revisions[0].tier).toBe("reported");
    expect(entry.revisions[0].description).toBe(entry.description);
  });

  it("GSC-2: adding evidence appends to the log without disturbing existing entries", () => {
    let session = addEvidence(freshSession(), {
      source: "customer",
      category: "symptom",
      tier: "reported",
      description: "Stalls repeatedly.",
    });
    const firstId = session.evidenceLog[0].id;

    session = addEvidence(session, {
      source: "scan_tool",
      category: "dtc",
      tier: "confirmed",
      description: "Fuel system large leak detected.",
      links: { dtcCode: "P0093" },
    });

    expect(session.evidenceLog).toHaveLength(2);
    expect(session.evidenceLog[0].id).toBe(firstId);
    expect(session.evidenceLog[0].description).toBe("Stalls repeatedly.");
    expect(session.evidenceLog[1].links.dtcCode).toBe("P0093");
  });

  it("GSC-3: supports all four evidence tiers at creation", () => {
    let session = freshSession();
    const tiers = ["reported", "observed", "measured", "confirmed"] as const;
    for (const tier of tiers) {
      session = addEvidence(session, {
        source: "technician",
        category: "technician_note",
        tier,
        description: `Evidence at tier ${tier}.`,
      });
    }
    expect(session.evidenceLog.map((e) => e.tier)).toEqual([
      "reported",
      "observed",
      "measured",
      "confirmed",
    ]);
  });

  it("GSC-4: supports all seven evidence categories, each linkable to its related session record", () => {
    let session = freshSession();

    session = addEvidence(session, {
      source: "customer",
      category: "symptom",
      tier: "reported",
      description: "Engine dies after a few minutes.",
      links: { symptomText: "Stalls repeatedly." },
    });
    session = addEvidence(session, {
      source: "scan_tool",
      category: "dtc",
      tier: "confirmed",
      description: "P0093 present.",
      links: { dtcCode: "P0093" },
    });
    session = addEvidence(session, {
      source: "technician",
      category: "test",
      tier: "measured",
      description: "Rail-pressure hold test performed.",
      links: { testId: "test_1" },
    });
    session = addEvidence(session, {
      source: "technician",
      category: "measurement",
      tier: "measured",
      description: "Feed pressure reads 0.15 MPa (spec: 0.2–0.3 MPa).",
    });
    session = addEvidence(session, {
      source: "technician",
      category: "photo",
      tier: "observed",
      description: "Photo of the fuel filter housing.",
      attachments: [{ id: "att_1", kind: "photo", uri: "data:image/png;base64,xyz" }],
    });
    session = addEvidence(session, {
      source: "technician",
      category: "voice_note",
      tier: "observed",
      description: "Voice memo describing the stall pattern.",
      attachments: [{ id: "att_2", kind: "voice_note", uri: "data:audio/wav;base64,xyz" }],
    });
    session = addEvidence(session, {
      source: "technician",
      category: "technician_note",
      tier: "observed",
      description: "Suspect suction-side air leak based on prior similar case.",
    });

    const byCategory = Object.fromEntries(
      session.evidenceLog.map((e) => [e.category, e]),
    );
    expect(Object.keys(byCategory).sort()).toEqual(
      [
        "dtc",
        "measurement",
        "photo",
        "symptom",
        "technician_note",
        "test",
        "voice_note",
      ].sort(),
    );
    expect(byCategory.symptom.links.symptomText).toBe("Stalls repeatedly.");
    expect(byCategory.dtc.links.dtcCode).toBe("P0093");
    expect(byCategory.test.links.testId).toBe("test_1");
    expect(byCategory.photo.attachments).toHaveLength(1);
    expect(byCategory.voice_note.attachments[0].kind).toBe("voice_note");
  });

  it("GSC-5: updateEvidence changes the current description but preserves the original in history", () => {
    let session = addEvidence(freshSession(), {
      source: "technician",
      category: "technician_note",
      tier: "observed",
      description: "Original wording, slightly unclear.",
    });
    const id = session.evidenceLog[0].id;

    session = updateEvidence(session, id, {
      description: "Clarified: suction-side air leak suspected at the filter housing.",
      reason: "Clarifying after re-reading the note.",
    });

    const entry = session.evidenceLog[0];
    expect(entry.description).toBe(
      "Clarified: suction-side air leak suspected at the filter housing.",
    );
    expect(entry.revisions).toHaveLength(2);
    expect(entry.revisions[0].kind).toBe("created");
    expect(entry.revisions[0].description).toBe(
      "Original wording, slightly unclear.",
    );
    expect(entry.revisions[1].kind).toBe("updated");
    expect(entry.revisions[1].description).toBe(entry.description);
    expect(entry.updatedAt).toBeGreaterThanOrEqual(entry.createdAt);
  });

  it("GSC-6: updateEvidence never changes the tier — only changeEvidenceTier may", () => {
    let session = addEvidence(freshSession(), {
      source: "technician",
      category: "measurement",
      tier: "measured",
      description: "Feed pressure reads low.",
    });
    const id = session.evidenceLog[0].id;

    session = updateEvidence(session, id, { description: "Feed pressure reads 0.15 MPa." });
    expect(session.evidenceLog[0].tier).toBe("measured");
  });

  it("GSC-7: changeEvidenceTier records a dedicated tier_changed revision and requires a reason", () => {
    let session = addEvidence(freshSession(), {
      source: "technician",
      category: "test",
      tier: "observed",
      description: "Injector back-leak test performed.",
    });
    const id = session.evidenceLog[0].id;

    expect(() => changeEvidenceTier(session, id, "confirmed", "")).toThrow();

    session = changeEvidenceTier(
      session,
      id,
      "confirmed",
      "Return-volume test isolated cylinder 1 — confirmed by direct measurement.",
    );
    const entry = session.evidenceLog[0];
    expect(entry.tier).toBe("confirmed");
    expect(entry.revisions).toHaveLength(2);
    expect(entry.revisions[1].kind).toBe("tier_changed");
    expect(entry.revisions[1].tier).toBe("confirmed");
    expect(entry.revisions[1].reason).toBe(
      "Return-volume test isolated cylinder 1 — confirmed by direct measurement.",
    );
    // The prior tier is still visible in history.
    expect(entry.revisions[0].tier).toBe("observed");
  });

  it("GSC-8: removeEvidence soft-retracts — the entry stays in the log forever", () => {
    let session = addEvidence(freshSession(), {
      source: "customer",
      category: "symptom",
      tier: "reported",
      description: "Customer mentioned a rattling noise (later found unrelated).",
    });
    const id = session.evidenceLog[0].id;

    session = removeEvidence(session, id, "Unrelated to the stalling fault — retracted.");

    expect(session.evidenceLog).toHaveLength(1); // never deleted
    const entry = session.evidenceLog[0];
    expect(entry.retractedAt).not.toBeNull();
    expect(entry.retractedReason).toBe(
      "Unrelated to the stalling fault — retracted.",
    );
    expect(entry.revisions).toHaveLength(2);
    expect(entry.revisions[1].kind).toBe("retracted");
    // The original content remains readable.
    expect(entry.description).toBe(
      "Customer mentioned a rattling noise (later found unrelated).",
    );
  });

  it("GSC-9: the evidence log never shrinks across add, update, tier-change, and remove", () => {
    let session = freshSession();
    session = addEvidence(session, {
      source: "customer",
      category: "symptom",
      tier: "reported",
      description: "Stalls repeatedly.",
    });
    const id = session.evidenceLog[0].id;
    let previousLength = session.evidenceLog.length;

    session = updateEvidence(session, id, { description: "Stalls repeatedly, worse when warm." });
    expect(session.evidenceLog.length).toBeGreaterThanOrEqual(previousLength);
    previousLength = session.evidenceLog.length;

    session = changeEvidenceTier(session, id, "observed", "Technician witnessed it directly.");
    expect(session.evidenceLog.length).toBeGreaterThanOrEqual(previousLength);
    previousLength = session.evidenceLog.length;

    session = removeEvidence(session, id, "Superseded by a more precise entry.");
    expect(session.evidenceLog.length).toBeGreaterThanOrEqual(previousLength);
    expect(session.evidenceLog).toHaveLength(1);
  });

  it("GSC-10: update/tier-change/remove on an unknown id throw a clear, typed error", () => {
    const session = freshSession();
    expect(() =>
      updateEvidence(session, "does_not_exist", { description: "x" }),
    ).toThrow(EvidenceNotFoundError);
    expect(() =>
      changeEvidenceTier(session, "does_not_exist", "confirmed", "because"),
    ).toThrow(EvidenceNotFoundError);
    expect(() => removeEvidence(session, "does_not_exist")).toThrow(
      EvidenceNotFoundError,
    );
  });

  it("GSC-11: cannot update or change the tier of already-retracted evidence", () => {
    let session = addEvidence(freshSession(), {
      source: "technician",
      category: "technician_note",
      tier: "observed",
      description: "Note later found irrelevant.",
    });
    const id = session.evidenceLog[0].id;
    session = removeEvidence(session, id, "Irrelevant.");

    expect(() => updateEvidence(session, id, { description: "Edit attempt." })).toThrow(
      EvidenceRetractedError,
    );
    expect(() => changeEvidenceTier(session, id, "confirmed", "because")).toThrow(
      EvidenceRetractedError,
    );
  });

  it("GSC-12: cannot retract already-retracted evidence (no double-retraction)", () => {
    let session = addEvidence(freshSession(), {
      source: "technician",
      category: "technician_note",
      tier: "observed",
      description: "Note.",
    });
    const id = session.evidenceLog[0].id;
    session = removeEvidence(session, id, "First retraction.");

    expect(() => removeEvidence(session, id, "Second retraction.")).toThrow(
      EvidenceRetractedError,
    );
  });

  it("GSC-13: listActiveEvidence excludes retracted evidence; getEvidenceById still finds it", () => {
    let session = addEvidence(freshSession(), {
      source: "customer",
      category: "symptom",
      tier: "reported",
      description: "Kept evidence.",
    });
    session = addEvidence(session, {
      source: "customer",
      category: "symptom",
      tier: "reported",
      description: "Retracted evidence.",
    });
    const retractedId = session.evidenceLog[1].id;
    session = removeEvidence(session, retractedId, "Turned out to be unrelated.");

    const active = listActiveEvidence(session);
    expect(active).toHaveLength(1);
    expect(active[0].description).toBe("Kept evidence.");

    const stillFindable = getEvidenceById(session, retractedId);
    expect(stillFindable).toBeDefined();
    expect(stillFindable?.retractedAt).not.toBeNull();
  });

  it("GSC-14: all evidence operations require an active session", () => {
    const paused = pauseSession(freshSession());
    expect(() =>
      addEvidence(paused, {
        source: "technician",
        category: "technician_note",
        tier: "observed",
        description: "Should not be allowed while paused.",
      }),
    ).toThrow();
  });

  it("GSC-15: a full lifecycle — add, update, tier-change, retract — is completely reconstructable from history", () => {
    let session = addEvidence(freshSession(), {
      source: "technician",
      category: "test",
      tier: "observed",
      description: "Injector back-leak test performed on cylinder 1.",
    });
    const id = session.evidenceLog[0].id;

    session = updateEvidence(session, id, {
      description: "Injector back-leak test performed — cylinder 1 return volume high.",
      reason: "Added the measured detail after reading the result.",
    });
    session = changeEvidenceTier(
      session,
      id,
      "confirmed",
      "Return volume clearly exceeds spec — confirms the injector as the root cause.",
    );
    session = removeEvidence(
      session,
      id,
      "Folded into the final case record; keeping the log accurate.",
    );

    const entry = session.evidenceLog.find((e) => e.id === id)!;
    expect(entry.revisions.map((r) => r.kind)).toEqual([
      "created",
      "updated",
      "tier_changed",
      "retracted",
    ]);
    // Every revision is individually timestamped and non-decreasing in time.
    const timestamps = entry.revisions.map((r) => r.recordedAt);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
    // The very first revision still shows the untouched original description.
    expect(entry.revisions[0].description).toBe(
      "Injector back-leak test performed on cylinder 1.",
    );
    expect(entry.revisions[0].tier).toBe("observed");
    // The current top-level state reflects the final (retracted) status.
    expect(entry.retractedAt).not.toBeNull();
    expect(entry.tier).toBe("confirmed");
  });

  it("GSC-16: addEvidence rejects an empty description", () => {
    expect(() =>
      addEvidence(freshSession(), {
        source: "technician",
        category: "technician_note",
        tier: "observed",
        description: "   ",
      }),
    ).toThrow();
  });
});
