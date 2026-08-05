/**
 * Backup / restore tests (UX Audit v1 / P2-8).
 *
 * This is the one piece of the app that can destroy a mechanic's history if it
 * is subtly wrong, so the failure modes get tested directly: a restore must
 * never roll back newer work, never rewrite timestamps, and never let a
 * stray file through.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { buildBackup, parseBackup, restoreBackup, backupFilename } from "@/services/backup";
import { caseStore, sessionStore } from "@/services/store";
import type { RepairCase } from "@/types";

function makeCase(id: string, updatedAt: number, rootCause = "cause"): RepairCase {
  return {
    id,
    createdAt: 1_000,
    updatedAt,
    vehicle: { brand: "Toyota", model: "Vios", year: 2018, engine: "", transmission: "", mileageKm: null },
    system: "engine",
    symptomText: "ម៉ាស៊ីនញ័រ",
    dtcCodes: ["P0301"],
    rootCause,
    repairPerformed: "",
    partsReplaced: [],
    technicianNote: "",
    photos: [],
    tags: [],
  };
}

beforeEach(() => {
  localStorage.clear();
  // Skip the demo seeding so each test starts from a known set.
  caseStore.replaceAll([]);
  sessionStore.replaceAll([]);
});

describe("backup", () => {
  it("round-trips cases through export and restore", () => {
    caseStore.replaceAll([makeCase("c1", 5_000)]);
    const file = JSON.stringify(buildBackup());

    caseStore.replaceAll([]);
    const r = restoreBackup(parseBackup(file));

    expect(r.casesAdded).toBe(1);
    expect(caseStore.list()).toHaveLength(1);
    expect(caseStore.get("c1")?.rootCause).toBe("cause");
  });

  it("preserves updatedAt instead of stamping the restore time", () => {
    caseStore.replaceAll([makeCase("c1", 5_000)]);
    const file = JSON.stringify(buildBackup());
    caseStore.replaceAll([]);

    restoreBackup(parseBackup(file));

    // caseStore.save() would have rewritten this to Date.now().
    expect(caseStore.get("c1")?.updatedAt).toBe(5_000);
  });

  it("merges rather than replaces — work absent from the backup survives", () => {
    caseStore.replaceAll([makeCase("c1", 5_000)]);
    const file = JSON.stringify(buildBackup());

    caseStore.replaceAll([makeCase("c1", 5_000), makeCase("c2", 6_000)]);
    const r = restoreBackup(parseBackup(file));

    expect(r.casesAdded).toBe(0);
    expect(caseStore.list().map((c) => c.id).sort()).toEqual(["c1", "c2"]);
  });

  it("does not roll back a record that is newer than the backup's copy", () => {
    caseStore.replaceAll([makeCase("c1", 5_000, "old")]);
    const file = JSON.stringify(buildBackup());

    caseStore.replaceAll([makeCase("c1", 9_000, "new")]);
    const r = restoreBackup(parseBackup(file));

    expect(r.casesUpdated).toBe(0);
    expect(caseStore.get("c1")?.rootCause).toBe("new");
  });

  it("applies a backup copy that is newer than the local one", () => {
    caseStore.replaceAll([makeCase("c1", 9_000, "newer")]);
    const file = JSON.stringify(buildBackup());

    caseStore.replaceAll([makeCase("c1", 5_000, "older")]);
    const r = restoreBackup(parseBackup(file));

    expect(r.casesUpdated).toBe(1);
    expect(caseStore.get("c1")?.rootCause).toBe("newer");
  });

  it("rejects files that are not Master Technician backups", () => {
    expect(() => parseBackup("not json at all")).toThrow();
    expect(() => parseBackup(JSON.stringify({ hello: "world" }))).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ format: "master-technician-backup", version: 99, cases: [], sessions: [] })),
    ).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ format: "master-technician-backup", version: 1, cases: "nope", sessions: [] })),
    ).toThrow();
  });

  it("names the file by date so successive backups don't collide", () => {
    expect(backupFilename(new Date(2026, 7, 5))).toBe("master-technician-2026-08-05.json");
  });
});
