/**
 * Instant AI Diagnose — Milestone 10.
 *
 * Answers "what could this be?" IMMEDIATELY, from local data only (no
 * network, no API cost, works offline) — combining two sources:
 *
 *  1. DTC-anchored causes (dtc.ts) — used whenever a known code is present.
 *  2. Symptom-pattern causes (symptomPatterns.ts) — used regardless of
 *     whether a DTC is present, so a mechanic gets a real answer even with
 *     no scan tool on hand (the case that used to be a dead end).
 *
 * This is deliberately NOT the evidence-gated Session/Hypothesis/Orchestrator
 * engine (Milestones 1-9) — it is a fast, one-shot ESTIMATE for browsing,
 * like asking a senior mechanic "what do you think this is?". It never
 * writes to a session, never confirms a diagnosis, and carries no
 * authority — the mechanic still tests and confirms through the real
 * session (bootstrapSession → DiagnosticSessionScreen) before anything is
 * recorded as a Repair Case.
 */
import type { DtcCode, PossibleCause, SystemId, Vehicle } from "@/types";
import { DTC_BY_CODE } from "@/data/dtc";
import { SYMPTOM_PATTERNS } from "@/data/symptomPatterns";

export interface InstantAnalysisInput {
  vehicle: Vehicle;
  complaint: string;
  dtcCodes: string[];
  system: SystemId | null;
}

export interface InstantAnalysisResult {
  causes: PossibleCause[];
  inspectionSteps: string[];
  toolsNeeded: string[];
  safetyNotes: string[];
  /** True if at least one DTC or symptom pattern actually matched (as
   * opposed to only the generic fallback being shown). */
  hasSignal: boolean;
}

const MAX_CAUSES = 6;

function likelihoodFromConfidence(c: number): PossibleCause["likelihood"] {
  if (c >= 70) return "high";
  if (c >= 45) return "medium";
  return "low";
}

/** Khmer complaints are commonly typed with inconsistent word-spacing —
 * match on content, not on exact spacing. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

export function analyzeInstant(input: InstantAnalysisInput): InstantAnalysisResult {
  const text = normalize(input.complaint);
  const matchedDtc = input.dtcCodes
    .map((c) => DTC_BY_CODE[c.trim().toUpperCase()])
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  const raw: PossibleCause[] = [];

  // 1) DTC-anchored causes — highest confidence, since a code is concrete evidence.
  matchedDtc.forEach((dtc, di) => {
    dtc.possibleCauses.forEach((title, ci) => {
      const confidence = Math.max(30, 88 - di * 10 - ci * 8);
      raw.push({
        title,
        confidence,
        likelihood: likelihoodFromConfidence(confidence),
        reasoning: `ភ្ជាប់នឹងកូដ ${dtc.code} (${dtc.titleKm})`,
      });
    });
  });

  // 2) Symptom-pattern causes — work with or without a DTC present.
  for (const p of SYMPTOM_PATTERNS) {
    if (!p.match.some((m) => text.includes(normalize(m)))) continue;
    // A pattern matching the mechanic-selected system gets a small boost —
    // it's more likely to be the right read of an ambiguous phrase.
    const confidence = input.system && input.system === p.systemId ? Math.min(95, p.conf + 8) : p.conf;
    raw.push({
      title: p.title,
      confidence,
      likelihood: likelihoodFromConfidence(confidence),
      reasoning: p.why,
    });
  }

  const hasSignal = raw.length > 0;

  // 3) Fallback so the mechanic is never left with a blank screen.
  if (!hasSignal) {
    raw.push(
      {
        title: "ត្រួតពិនិត្យ Wiring / Connector / Ground ពាក់ព័ន្ធ",
        confidence: 35,
        likelihood: "low",
        reasoning: "មិនទាន់មានទិន្នន័យគ្រប់គ្រាន់ — ចាប់ផ្ដើមពី basic electrical ជាមុនសិន។",
      },
      {
        title: "ស្កេនរក DTC បន្ថែម ដើម្បីតម្រង់ទិស",
        confidence: 30,
        likelihood: "low",
        reasoning: "គ្មាន DTC ឬពាក្យគន្លឹះច្បាស់លាស់ — ការស្កេនអាចផ្ដល់ទិសដៅច្បាស់ជាង។",
      },
    );
  }

  // De-dup by title (keep the highest confidence instance), sort desc, cap.
  const byTitle = new Map<string, PossibleCause>();
  for (const c of raw) {
    const prev = byTitle.get(c.title);
    if (!prev || c.confidence > prev.confidence) byTitle.set(c.title, c);
  }
  const causes = [...byTitle.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_CAUSES);

  return {
    causes,
    inspectionSteps: buildInspectionSteps(matchedDtc, hasSignal),
    toolsNeeded: buildTools(input.system, matchedDtc),
    safetyNotes: buildSafetyNotes(input.system, matchedDtc),
    hasSignal,
  };
}

function buildInspectionSteps(matchedDtc: DtcCode[], hasSignal: boolean): string[] {
  const steps: string[] = [];
  if (matchedDtc.length > 0) {
    steps.push("អាន DTC ទាំងអស់ និង freeze frame ដោយ scan tool");
    matchedDtc.forEach((d) => d.inspectionFlow.forEach((s) => steps.push(`[${d.code}] ${s}`)));
  } else if (hasSignal) {
    steps.push(
      "ពិនិត្យ live data ពាក់ព័ន្ធ (RPM, temp, fuel trim, voltage)",
      "ពិនិត្យ visual: ខ្សែ រលុង លេច ច្រេះ ខូច",
    );
  } else {
    steps.push(
      "ស្កេនរក DTC ជាមុនសិន បើមាន scan tool",
      "ពិនិត្យ visual ទូទៅ៖ ខ្សែ រលុង លេច ច្រេះ ខូច",
    );
  }
  steps.push("បញ្ជាក់មូលហេតុដោយការវាស់ មុនប្ដូរគ្រឿង");
  return steps;
}

function buildTools(system: SystemId | null, matchedDtc: DtcCode[]): string[] {
  const base = new Set<string>(["OBD-II scan tool", "Digital multimeter (DMM)"]);
  const bySystem: Partial<Record<SystemId, string[]>> = {
    engine: ["Compression tester", "Smoke machine", "Fuel pressure gauge"],
    transmission: ["ATF level tool", "Pressure gauge"],
    abs: ["Scope សម្រាប់ wheel speed sensor"],
    brake: ["Brake bleeder", "Feeler/dial gauge"],
    ac: ["Manifold gauge set", "Leak detector"],
    electrical: ["Test light", "Power probe"],
    hybrid: ["Insulated gloves class 0", "Insulation resistance tester (megohm)"],
    ev: ["Insulated gloves class 0", "Megohm tester"],
    airbag: ["SRS-capable scan tool"],
    suspension: ["Alignment gauge"],
    steering: ["Alignment gauge"],
    body: ["Wiring diagram"],
  };
  if (system && bySystem[system]) bySystem[system]!.forEach((x) => base.add(x));
  if (matchedDtc.some((d) => d.severity === "critical")) base.add("Insulated gloves class 0");
  return [...base];
}

function buildSafetyNotes(system: SystemId | null, matchedDtc: DtcCode[]): string[] {
  const notes: string[] = [];
  const touchesHv =
    system === "hybrid" ||
    system === "ev" ||
    matchedDtc.some((d) => d.systems.includes("hybrid") || d.systems.includes("ev"));
  if (touchesHv) {
    notes.push("⚠️ ប្រព័ន្ធតង់ស្យុងខ្ពស់ (HV) — ISOLATE មុនធ្វើការ ដក service plug ស្លៀក glove class 0។");
  }
  const touchesAirbag = system === "airbag" || matchedDtc.some((d) => d.systems.includes("airbag"));
  if (touchesAirbag) {
    notes.push("⚠️ SRS/Airbag — ដក battery រង់ចាំ discharge ≥ 3 នាទី។ កុំវាស់ squib ដោយ DMM ផ្ទាល់។");
  }
  return notes;
}
