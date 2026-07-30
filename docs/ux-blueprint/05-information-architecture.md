# 05 — Information Architecture

How information is organized in Master Technician. The IA mirrors the **mechanic's
mental model of a diagnosis**, so the app's structure matches how a technician
already thinks — reducing the cognitive translation cost (and therefore searching
time).

## The information spine

Every diagnosis narrows from *the whole vehicle* to *a single confirmed fix*, then
is preserved as reusable knowledge. This is the backbone the whole app hangs on:

```
VEHICLE            what car are we working on?
   ↓
SYSTEM             which subsystem is involved?
   ↓
SYMPTOMS           what is wrong (complaint + codes + evidence)?
   ↓
INSPECTION         what should I check, in what order?
   ↓
MEASUREMENTS       what do the readings say vs. known-good?
   ↓
DIAGNOSIS          what is the ranked, evidence-based cause?
   ↓
REPAIR             how do I fix it (and stay safe)?
   ↓
VERIFICATION       is it actually fixed?
   ↓
REPAIR CASE        preserve it — feeds future diagnoses
```

Each level **narrows scope** and **adds evidence**. Information flows down (context)
and the outcome flows back up (the case enriches future diagnoses — the flywheel).

## Level definitions

### 1. Vehicle — *scope of everything*
- **Holds:** brand, model, year, engine, transmission, mileage.
- **Role:** scopes all downstream knowledge (which systems, which codes, which
  common failures apply).
- **Data:** `Vehicle` (`database-schema.md`).
- **Screen:** Vehicle Select. **Capture:** chips + free text, minimal typing.

### 2. System — *the subsystem*
- **Holds:** one of 12 systems (Engine, ABS, Airbag, Hybrid, EV, Transmission, A/C,
  Electrical, Suspension, Brake, Steering, Body).
- **Role:** the primary filter for symptoms, DTC relevance, tools, and safety class
  (HV/SRS gating flows from here).
- **Data:** `SystemId` / `VehicleSystem`.
- **Screen:** Symptom Input (system grid).

### 3. Symptoms — *the evidence gathered*
- **Holds:** free-text complaint, DTC codes, photos, scan-tool report.
- **Role:** the raw inputs the diagnosis reasons over.
- **Data:** `SymptomInput`, `PhotoRef`, DTC codes.
- **Screen:** Symptom Input.

### 4. Inspection — *guided checks*
- **Holds:** an ordered procedure (cheapest/fastest confirming test first).
- **Role:** turns symptoms into confirmable observations; prevents parts-cannon.
- **Data:** `DiagnosisResult.inspectionSteps`; DTC `inspectionFlow`. 🔜 interactive
  checklist state (pass/fail per step).
- **Screen:** Result → Inspection section 🔜 promoted to a step/checklist.

### 5. Measurements — *readings vs. known-good*
- **Holds:** values the tech reads (voltages, pressures, compression, live data).
- **Role:** the hard evidence that confirms or eliminates a cause.
- **Data:** scan report today; 🌐 structured measurements + known-good references
  (Knowledge L6/L8) attachable to the case.
- **Screen:** captured in Symptom (scan report) / 🔜 a Measurements step.

### 6. Diagnosis — *the ranked conclusion*
- **Holds:** possible causes **ranked** by likelihood/confidence, each with reasoning;
  recommended repair; tools; safety notes.
- **Role:** the answer — the reason the mechanic opened the app.
- **Data:** `DiagnosisResult`, `PossibleCause`.
- **Screen:** Diagnosis Result (the read-and-leave screen).

### 7. Repair — *how to fix it*
- **Holds:** recommended repair; 🌐 step-by-step procedures, torque specs, wiring.
- **Role:** the action; must surface **safety** at the point of work.
- **Data:** `DiagnosisResult.recommendedRepair`, `safetyNotes`; 🌐 Knowledge L4–L6.
- **Screen:** Result → Repair section 🌐 Repair Guide.

### 8. Verification — *confirm the fix*
- **Holds:** clear codes, road-test, re-scan comparison.
- **Role:** closes the loop; prevents comebacks.
- **Data:** guidance today; 🔜 verification checklist + before/after scan.
- **Screen:** Result → Verification 🔜 step.

### 9. Repair Case — *preserved knowledge*
- **Holds:** the whole story — vehicle, system, symptom, DTCs, **root cause, repair,
  parts, note, photos, tags**.
- **Role:** the durable artifact; searchable; powers **Similar Cases** and future AI
  grounding. The flywheel's output.
- **Data:** `RepairCase`.
- **Screen:** Case Form (write) / Case Detail (read).

## Data ↔ IA mapping (single view)

| IA level | Data type | Primary screen | Status |
| --- | --- | --- | --- |
| Vehicle | `Vehicle` | Vehicle Select | ✅ |
| System | `SystemId` | Symptom Input | ✅ |
| Symptoms | `SymptomInput` / `PhotoRef` | Symptom Input | ✅ |
| Inspection | `DiagnosisResult.inspectionSteps` | Result | ✅ / 🔜 checklist |
| Measurements | scan report → structured | Symptom / Result | ✅ / 🌐 |
| Diagnosis | `DiagnosisResult` / `PossibleCause` | Result | ✅ |
| Repair | `recommendedRepair` / `safetyNotes` | Result | ✅ / 🌐 guide |
| Verification | guidance → checklist | Result | ✅ / 🔜 |
| Repair Case | `RepairCase` | Case Form / Detail | ✅ |

## Cross-cutting knowledge (referenced, not in the linear spine)

- **DTC knowledge** (`DtcCode`) — attaches at Symptoms/Diagnosis; independently
  browsable via DTC Search. A code links to systems, causes, inspection flow,
  common mistakes.
- **Similar Cases** — derived from the case corpus; surfaced at Diagnosis/Case
  Detail to shortcut the spine.
- **Safety** — not a level but a **layer** that overlays Inspection/Repair whenever
  System ∈ {Hybrid, EV, Airbag} or a critical DTC is present.

## Prioritization within a screen (glanceable IA)

Within any screen, information is ranked by **decision value**:

1. **The answer** (top cause / DTC meaning / the fix) — largest, highest, no scroll.
2. **Why** (evidence, confidence) — immediately supporting.
3. **What next** (inspection step / tool / verification).
4. **Safety** — always visually escalated when present, never buried.
5. **Detail / provenance** — demoted, collapsible.

This ordering is the same everywhere so the mechanic learns *where to look* once.

## Progressive disclosure

- Show the **conclusion first**, details on demand (expand a cause, open a step).
- Optional inputs (engine, transmission, tags) never block the primary path.
- Reference depth (procedures, wiring, TSBs) loads **when the tech asks**, not up
  front — the spine stays fast even as knowledge grows.

## IA principles

- **Match the mechanic's model** — the spine *is* how they diagnose.
- **Narrow, don't sprawl** — each level reduces scope; no lateral mazes.
- **Evidence accumulates** — every level adds proof toward a confident cause.
- **The case closes the loop** — output re-enters as input (flywheel).
- **One consistent hierarchy** — same priority order on every screen.
