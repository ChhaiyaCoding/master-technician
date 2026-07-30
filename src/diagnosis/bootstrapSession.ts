/**
 * New-diagnosis bootstrap (Milestone 7).
 *
 * Turns a mechanic's entry input (vehicle + complaint + DTC codes) into a
 * real DiagnosticSession, built ENTIRELY through the frozen engine APIs
 * (createSession / addEvidence / addHypothesis) — no engine logic is
 * duplicated or changed. Known DTC codes are looked up in the existing DTC
 * knowledge base (data/dtc.ts) to seed candidate cause hypotheses.
 *
 * Core principle preserved: the DTC is recorded as evidence (context) but is
 * NEVER linked as supporting evidence to a cause hypothesis. A code points at
 * a region; it does not confirm a specific cause. So the seeded hypotheses
 * start with zero supporting evidence, and the Orchestrator will (correctly)
 * ask the mechanic to test/inspect before anything can be confirmed.
 */
import type { DiagnosticSession, FailureDomain } from "@/types/session";
import type { SystemId, Vehicle } from "@/types";
import { DTC_BY_CODE } from "@/data/dtc";
import { createSession } from "@/engine/sessionEngine";
import { addEvidence } from "@/engine/evidenceEngine";
import { addHypothesis } from "@/engine/hypothesisEngine";

export interface NewDiagnosisInput {
  vehicle: Vehicle;
  complaint: string;
  system: SystemId | null;
  dtcCodes: string[];
}

/** Cap on seeded hypotheses so the mechanic isn't overwhelmed. */
export const MAX_SEED_HYPOTHESES = 6;

/**
 * Best-effort mapping of a free-text cause to one of the six failure domains
 * (diagnostic-reasoning-engine.md §6). This only categorizes for structure —
 * it does NOT diagnose. Keyword-based, defaults to "load" when unsure.
 */
export function guessFailureDomain(text: string): FailureDomain {
  const t = text.toLowerCase();
  if (/\bground\b|earth/.test(t)) return "ground";
  if (/wir|ខ្សែ|connector|connect|voltage|តង់ស៊្យុ|battery|ថ្ម|fuse|charg|\bpower\b|អគ្គិសនី/.test(t))
    return "power";
  if (/sensor|signal|coil|spark|ignition|\bmaf\b|\bmap\b|\bo2\b|a\/f|សេនស័រ|កូអ៊ីល|plug/.test(t))
    return "signal";
  if (/module|\becu\b|\btcm\b|\bbcm\b|solenoid|control|relearn|\bscv\b|actuator|regulat/.test(t))
    return "control";
  if (
    /pump|injector|valve|leak|compression|filter|belt|thermostat|worn|clog|cat|converter|ស្ទះ|លេច|ចាស់|ខូច|mechanical|piston|ring/.test(
      t,
    )
  )
    return "mechanical";
  return "load";
}

/** Build a fresh DiagnosticSession from new-diagnosis entry input. */
export function bootstrapSession(input: NewDiagnosisInput): DiagnosticSession {
  let session = createSession({
    vehicle: input.vehicle,
    complaint: input.complaint,
    system: input.system,
  });

  // 1) The complaint itself is (reported) evidence.
  if (input.complaint.trim()) {
    session = addEvidence(session, {
      source: "customer",
      category: "symptom",
      tier: "reported",
      description: input.complaint.trim(),
    });
  }

  // 2) DTC codes → confirmed evidence (known) or reported evidence (unknown),
  //    plus seeded cause hypotheses for known codes.
  const seenCauseKeys = new Set<string>();
  const dtcCodesSeen: string[] = [];

  for (const rawCode of input.dtcCodes) {
    const code = rawCode.trim().toUpperCase();
    if (!code) continue;
    if (!dtcCodesSeen.includes(code)) dtcCodesSeen.push(code);
    const dtc = DTC_BY_CODE[code];

    if (dtc) {
      session = addEvidence(session, {
        source: "scan_tool",
        category: "dtc",
        tier: "confirmed",
        description: `${code} — ${dtc.titleKm}`,
        links: { dtcCode: code },
      });

      for (const cause of dtc.possibleCauses) {
        if (session.hypotheses.length >= MAX_SEED_HYPOTHESES) break;
        const key = cause.trim().toLowerCase();
        if (!key || seenCauseKeys.has(key)) continue;
        seenCauseKeys.add(key);
        session = addHypothesis(
          session,
          {
            title: cause,
            description: `មូលហេតុដែលអាចកើតមាន ភ្ជាប់នឹង DTC ${code}។`,
            systemId: dtc.systems[0] ?? input.system,
            failureDomain: guessFailureDomain(cause),
          },
          "rule_engine",
          `បង្កើតដោយស្វ័យប្រវត្តិពី DTC ${code} (${dtc.titleKm})។`,
        );
      }
    } else {
      session = addEvidence(session, {
        source: "scan_tool",
        category: "dtc",
        tier: "reported",
        description: `${code} — មិនស្គាល់ក្នុងទិន្នន័យ`,
        links: { dtcCode: code },
      });
    }
  }

  // session.dtcs is a plain data field with no engine mutator — populate it
  // here so the Reasoning Layer (which reads session.dtcs) sees the codes.
  return { ...session, dtcs: dtcCodesSeen };
}
