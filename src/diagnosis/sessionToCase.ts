/**
 * Verified-diagnosis → Repair Case mapping (Milestone 8, the flywheel).
 *
 * Turns a VERIFIED DiagnosticSession into a RepairCase draft for the Case
 * Library. Per decision-authority-model.md §5, only a verified diagnosis may
 * feed the shop's memory — `canSaveAsCase` enforces that gate. This is pure
 * data mapping; it changes no engine state.
 */
import type { RepairCase, SystemId } from "@/types";
import type { DiagnosticSession } from "@/types/session";
import { uid } from "@/services/store";

/**
 * Only a verified diagnosis may be saved as a repair case — the flywheel is
 * built from proven outcomes, never from unconfirmed suggestions.
 */
export function canSaveAsCase(session: DiagnosticSession): boolean {
  return session.status === "verified";
}

/** Map a verified session to a RepairCase draft (id/timestamps are fresh). */
export function diagnosticSessionToRepairCase(session: DiagnosticSession): RepairCase {
  const confirmed = session.hypotheses.find((h) => h.status === "confirmed");
  const system: SystemId = session.system ?? confirmed?.systemId ?? "engine";
  const v = session.verifiedDiagnosis;
  const now = Date.now();

  const noteParts: string[] = ["បង្កើតពី Diagnostic Session ដែលបានផ្ទៀងផ្ទាត់។"];
  if (v?.symptomResolved) noteParts.push("រោគសញ្ញាដើមបានបាត់។");
  if (v?.dtcsClearedAndStayCleared === true) noteParts.push("DTC មិនត្រឡប់មកវិញ។");

  return {
    id: uid("case"),
    createdAt: now,
    updatedAt: now,
    vehicle: session.vehicle,
    system,
    symptomText: session.complaint,
    dtcCodes: session.dtcs,
    rootCause: confirmed?.title ?? "",
    repairPerformed: session.repairDecision?.repairPerformed ?? v?.repairPerformed ?? "",
    partsReplaced: [],
    technicianNote: noteParts.join(" "),
    photos: [],
    tags: [...session.dtcs.map((d) => d.toLowerCase()), system].filter(Boolean),
  };
}
