# 01 — App Map

Every screen in Master Technician and how they connect. This is the structural
blueprint; behavior is in `03-screen-specifications.md`, navigation rules in
`04-navigation-system.md`.

**Legend:** ✅ built today · 🔜 planned (designed here, not yet built) ·
🌐 future. Routes shown as they exist in the app (`src/App.tsx`).

> Design lens: the map is shallow on purpose. A mechanic must reach any answer in
> **1–2 taps from a tab root**. Depth = searching time = a design smell.

---

## Top-level structure

```
                          ┌─────────────────────┐
                          │   (App launch)      │  Splash — instant, non-blocking 🔜
                          └──────────┬──────────┘
                                     ↓
        ┌───────────────────────── HOME (/) ✅ ─────────────────────────┐
        │  Entry to every task. Recent cases. Resume-in-progress.       │
        └───┬─────────────┬──────────────┬──────────────┬──────────────┘
            ↓             ↓              ↓              ↓             ↓
      DIAGNOSIS       DTC SEARCH     CASE LIBRARY    PHOTO DIAG.   ASK EXPERT
      (workflow)        (/dtc) ✅     (/cases) ✅     (/photo) ✅   (/expert) ✅
                                                                    
                          ┌──────────────────────┐
                          │   SETTINGS (/settings)│ ✅
                          └──────────────────────┘
```

## Bottom navigation roots (thumb-reachable tabs)

The persistent bottom bar exposes 5 destinations; it shows **only on tab roots**
and hides inside full-screen flows (see `04`).

| Tab | Route | Screen | Status |
| --- | --- | --- | --- |
| Home | `/` | Home | ✅ |
| DTC | `/dtc` | DTC Search | ✅ |
| Cases | `/cases` | Case Library | ✅ |
| Expert | `/expert` | Ask Expert (full-screen) | ✅ |
| Settings | `/settings` | Settings | ✅ |

## The Diagnosis workflow (linear, resumable)

The core loop. Today it is a 3-step wizard ending in a rich result; the result
screen already contains Inspection / Repair / Verification / Safety **as sections**.
The blueprint promotes them to first-class steps as knowledge deepens (see
`../product-strategy/05-knowledge-roadmap.md`).

```
HOME
  ↓  "Diagnose Problem"
① VEHICLE          /diagnose/vehicle  ✅   Brand·Model·Year·Engine·Trans·Mileage
  ↓
② SYMPTOM          /diagnose/symptom  ✅   System · describe · DTC · photo · scan
  ↓  (AI)
③ DIAGNOSIS RESULT /diagnose/result   ✅   Ranked causes + evidence
        │  contains, as sections today (🔜 promote to steps):
        ├─ Inspection steps ✅  → 🔜 interactive Inspection checklist
        ├─ Measurements     🔜  (record values / known-good refs)
        ├─ Recommended repair ✅ → 🌐 Repair Guide (procedures/torque/wiring)
        ├─ Safety notes     ✅  (HV / SRS warnings)
        └─ Verification     🔜  (clear codes · road test · re-scan compare)
  ↓  "Save as repair case"
④ SAVE CASE        /cases/new (prefilled) ✅
  ↓
CASE DETAIL        /cases/:id ✅  → feeds Similar Cases back into future diagnoses
```

### Reconciling the example flow

The requested example `Splash → Home → Diagnosis → Vehicle → Inspection → Repair
Guide → Verification → Save Case` maps onto the above:

| Example step | In Master Technician |
| --- | --- |
| Splash | Instant non-blocking launch frame 🔜 (see note below) |
| Home | Home ✅ |
| Diagnosis | The workflow entry (Diagnose Problem) ✅ |
| Vehicle | Step ① Vehicle ✅ |
| Inspection | Result → Inspection section ✅ → interactive checklist 🔜 |
| Repair Guide | Result → Recommended repair ✅ → Repair Guide 🌐 |
| Verification | Result → Verification guidance ✅ → Verify checklist 🔜 |
| Save Case | Step ④ Save Case ✅ |

## Cases area

```
CASE LIBRARY (/cases) ✅
  ├─ search / filter
  ├─ New case ──────────────→ CASE FORM (/cases/new) ✅
  └─ tap a case ────────────→ CASE DETAIL (/cases/:id) ✅
                                 ├─ Edit ──→ CASE FORM (/cases/:id/edit) ✅
                                 ├─ Delete (confirm)
                                 ├─ DTC chip ──→ DTC SEARCH (/dtc?code=…) ✅
                                 └─ Similar Cases ──→ CASE DETAIL (other) ✅
```

## DTC area

```
DTC SEARCH (/dtc) ✅
  ├─ empty → popular codes
  ├─ query → exact match → DTC DETAIL (inline) ✅
  │            └─ "Use in diagnosis" ──→ VEHICLE (seeded) ✅
  └─ query → partial matches → tap → DTC DETAIL ✅
```

## Photo & Expert (standalone tools)

```
PHOTO DIAGNOSIS (/photo) ✅       ASK EXPERT (/expert) ✅  (full-screen chat)
  add photos + notes                intro + quick-starts
  → analyze (AI)                    → messages + follow-up chips
  → observations/causes/steps       → (🔜 persist thread, resume)
```

## Global / system screens

| Screen | Route | Status | Notes |
| --- | --- | --- | --- |
| Splash / launch | — | 🔜 | See note; must not delay first paint |
| Not-found | `*` | ✅ | Falls back to Home |
| Settings | `/settings` | ✅ | Theme, clear data, about |
| Onboarding | — | 🌐 | If added, skippable & one-time only |

### Note on Splash (design decision)

Our design law says *open quickly — no splash, no warm-up* (`design-principles.md`).
So "Splash" here means **a branded launch frame that never blocks**: it appears only
for the milliseconds the app needs to mount, shows nothing the user must wait for,
and is skipped entirely on warm starts. We do **not** add an artificial timed splash.

## Screen inventory (single list)

| # | Screen | Route | Bottom nav? | Status |
| --- | --- | --- | --- | --- |
| 1 | Home | `/` | ✅ shown | ✅ |
| 2 | Vehicle Select | `/diagnose/vehicle` | hidden | ✅ |
| 3 | Symptom Input | `/diagnose/symptom` | hidden | ✅ |
| 4 | Diagnosis Result | `/diagnose/result` | hidden | ✅ |
| 5 | DTC Search (+ detail) | `/dtc` | ✅ shown | ✅ |
| 6 | Case Library | `/cases` | ✅ shown | ✅ |
| 7 | Case Detail | `/cases/:id` | hidden | ✅ |
| 8 | Case Form (new/edit) | `/cases/new`, `/cases/:id/edit` | hidden | ✅ |
| 9 | Photo Diagnosis | `/photo` | hidden | ✅ |
| 10 | Ask Expert | `/expert` | hidden (full-screen) | ✅ |
| 11 | Settings | `/settings` | ✅ shown | ✅ |
| 12 | Splash / launch frame | — | — | 🔜 |
