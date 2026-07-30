/**
 * Local persistence layer.
 *
 * Repair cases and expert threads are stored in localStorage today. The API
 * surface (list / get / save / remove / search) mirrors what a real backend
 * repository would expose, so screens can later point at a network client
 * without changing their calls.
 */
import type { ExpertThread, RepairCase } from "@/types";
import type { DiagnosticSession } from "@/types/session";
import { SEED_CASES } from "@/data/seedCases";

const KEYS = {
  cases: "mt.cases.v1",
  threads: "mt.threads.v1",
  seeded: "mt.seeded.v1",
  theme: "mt.theme.v1",
  sessions: "mt.sessions.v1",
} as const;

/** Short unique id — good enough for local records. */
export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("store: failed to persist", key, e);
  }
}

/* ----------------------------- Repair cases ----------------------------- */

function ensureSeeded(): void {
  if (!read<boolean>(KEYS.seeded, false)) {
    write(KEYS.cases, SEED_CASES);
    write(KEYS.seeded, true);
  }
}

export const caseStore = {
  list(): RepairCase[] {
    ensureSeeded();
    return read<RepairCase[]>(KEYS.cases, []).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  },

  get(id: string): RepairCase | undefined {
    return this.list().find((c) => c.id === id);
  },

  save(c: RepairCase): RepairCase {
    const all = this.list();
    const idx = all.findIndex((x) => x.id === c.id);
    const now = Date.now();
    const record: RepairCase = { ...c, updatedAt: now };
    if (idx >= 0) all[idx] = record;
    else all.unshift({ ...record, createdAt: c.createdAt || now });
    write(KEYS.cases, all);
    return record;
  },

  remove(id: string): void {
    write(
      KEYS.cases,
      this.list().filter((c) => c.id !== id),
    );
  },

  clearAll(): void {
    write(KEYS.cases, []);
    write(KEYS.seeded, true); // don't re-seed after an explicit clear
  },

  /** Full-text-ish search across the meaningful fields. */
  search(query: string): RepairCase[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.list();
    const terms = q.split(/\s+/);
    return this.list().filter((c) => {
      const hay = [
        c.vehicle.brand,
        c.vehicle.model,
        c.vehicle.year?.toString() ?? "",
        c.vehicle.engine,
        c.system,
        c.symptomText,
        c.rootCause,
        c.repairPerformed,
        c.technicianNote,
        c.partsReplaced.join(" "),
        c.dtcCodes.join(" "),
        c.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => hay.includes(term));
    });
  },

  /** Naive similarity: shared DTC / system / brand — for "similar cases". */
  similar(to: RepairCase, limit = 3): RepairCase[] {
    return this.list()
      .filter((c) => c.id !== to.id)
      .map((c) => {
        let score = 0;
        if (c.system === to.system) score += 2;
        if (c.vehicle.brand === to.vehicle.brand) score += 1;
        if (c.vehicle.model === to.vehicle.model) score += 1;
        if (c.dtcCodes.some((d) => to.dtcCodes.includes(d))) score += 3;
        return { c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.c);
  },
};

/* ---------------------------- Expert threads ---------------------------- */

export const threadStore = {
  list(): ExpertThread[] {
    return read<ExpertThread[]>(KEYS.threads, []).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  },
  get(id: string): ExpertThread | undefined {
    return this.list().find((t) => t.id === id);
  },
  save(thread: ExpertThread): void {
    const all = this.list();
    const idx = all.findIndex((t) => t.id === thread.id);
    if (idx >= 0) all[idx] = thread;
    else all.unshift(thread);
    write(KEYS.threads, all);
  },
};

/* --------------------------- Diagnostic sessions ------------------------- */

/**
 * Raw persistence for diagnostic sessions. This store only reads/writes
 * JSON — it enforces no lifecycle rules. Lifecycle rules (valid status
 * transitions, the Verified Diagnosis gate, etc.) live in
 * engine/sessionEngine.ts, which is the only intended caller of `save`.
 */
export const sessionStore = {
  list(): DiagnosticSession[] {
    return read<DiagnosticSession[]>(KEYS.sessions, []).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  },

  get(id: string): DiagnosticSession | undefined {
    return this.list().find((s) => s.id === id);
  },

  save(session: DiagnosticSession): DiagnosticSession {
    const all = this.list();
    const idx = all.findIndex((s) => s.id === session.id);
    const record: DiagnosticSession = { ...session, updatedAt: Date.now() };
    if (idx >= 0) all[idx] = record;
    else all.unshift(record);
    write(KEYS.sessions, all);
    return record;
  },

  remove(id: string): void {
    write(
      KEYS.sessions,
      this.list().filter((s) => s.id !== id),
    );
  },
};

/* -------------------------------- Theme -------------------------------- */

export const themeStore = {
  get(): string | null {
    return read<string | null>(KEYS.theme, null);
  },
  set(mode: string): void {
    write(KEYS.theme, mode);
  },
};
