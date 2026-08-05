/**
 * Backup and restore — UX Audit v1 / P2-8.
 *
 * Every case and every diagnostic session lives in localStorage and nowhere
 * else. Clearing browser data, switching phones, or a browser evicting storage
 * under pressure takes all of it with no warning and no way back. For a
 * mechanic whose repair history IS the value of the app, that is the largest
 * silent risk in the product.
 *
 * A JSON file the user holds is the fix that fits the app as it is: no server,
 * no account, works offline, and readable by anything. Restore MERGES rather
 * than replaces — a restore that quietly deleted work done since the backup
 * would be its own version of the same disaster.
 */
import type { RepairCase } from "@/types";
import type { DiagnosticSession } from "@/types/session";
import { caseStore, sessionStore } from "@/services/store";

export const BACKUP_FORMAT = "master-technician-backup";
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  cases: RepairCase[];
  sessions: DiagnosticSession[];
}

export function buildBackup(): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    cases: caseStore.list(),
    sessions: sessionStore.list(),
  };
}

/** Filename carries the date, so successive backups don't overwrite silently. */
export function backupFilename(at = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `master-technician-${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}.json`;
}

export function downloadBackup(): void {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename();
  a.click();
  URL.revokeObjectURL(url);
}

export interface RestoreResult {
  casesAdded: number;
  casesUpdated: number;
  sessionsAdded: number;
  sessionsUpdated: number;
}

/**
 * Parse and validate an uploaded backup. Throws with a Khmer message a mechanic
 * can act on, rather than letting a stray file corrupt the store.
 */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("ឯកសារនេះមិនមែនជា backup ត្រឹមត្រូវទេ។");
  }
  const b = data as Partial<BackupFile>;
  if (b?.format !== BACKUP_FORMAT) {
    throw new Error("ឯកសារនេះមិនមែនជា backup របស់ Master Technician ទេ។");
  }
  if (typeof b.version !== "number" || b.version > BACKUP_VERSION) {
    throw new Error("Backup នេះមកពីកំណែថ្មីជាង — សូមធ្វើបច្ចុប្បន្នភាព App សិន។");
  }
  if (!Array.isArray(b.cases) || !Array.isArray(b.sessions)) {
    throw new Error("ទិន្នន័យក្នុង backup ខូច។");
  }
  return b as BackupFile;
}

/**
 * Merge a backup into the current store. Records are matched by id; when both
 * sides have one, the newer `updatedAt` wins, so restoring an old backup never
 * rolls back newer work.
 */
export function restoreBackup(backup: BackupFile): RestoreResult {
  const result: RestoreResult = {
    casesAdded: 0,
    casesUpdated: 0,
    sessionsAdded: 0,
    sessionsUpdated: 0,
  };

  // Note both stores are written via replaceAll, not save(): save() stamps
  // updatedAt with the current time, which is right for an edit and wrong here
  // — it would rewrite every restored record's history to "just now".
  const mergedCases = new Map(caseStore.list().map((c) => [c.id, c]));
  for (const c of backup.cases) {
    const mine = mergedCases.get(c.id);
    if (!mine) {
      mergedCases.set(c.id, c);
      result.casesAdded++;
    } else if (c.updatedAt > mine.updatedAt) {
      mergedCases.set(c.id, c);
      result.casesUpdated++;
    }
  }
  caseStore.replaceAll([...mergedCases.values()]);

  const mergedSessions = new Map(sessionStore.list().map((s) => [s.id, s]));
  for (const s of backup.sessions) {
    const mine = mergedSessions.get(s.id);
    if (!mine) {
      mergedSessions.set(s.id, s);
      result.sessionsAdded++;
    } else if (s.updatedAt > mine.updatedAt) {
      mergedSessions.set(s.id, s);
      result.sessionsUpdated++;
    }
  }
  sessionStore.replaceAll([...mergedSessions.values()]);

  return result;
}
