# Current Features — Master Technician (v0.1.0)

This documents **what is actually built today**. AI output and part of the data
are placeholders; the UI, workflow, and data model are complete.

## Feature overview

| Feature | Status | Route |
| --- | --- | --- |
| Home dashboard | ✅ Built | `/` |
| Diagnosis workflow (3 steps) | ✅ Built | `/diagnose/*` |
| DTC search | ✅ Built | `/dtc` |
| Repair Case Library (CRUD + search + similar) | ✅ Built | `/cases`, `/cases/:id`, `/cases/new`, `/cases/:id/edit` |
| Photo diagnosis | ✅ Built (placeholder analysis) | `/photo` |
| Ask Expert chat | ✅ Built (placeholder replies) | `/expert` |
| Settings (theme + data) | ✅ Built | `/settings` |
| Dark / Light / System theme | ✅ Built | global |
| localStorage persistence | ✅ Built | global |

All screens are Khmer-first with inline English technical terms.

## Screen-by-screen

### 1. Home — `/` (`src/screens/Home.tsx`)
Entry dashboard. A large primary **"វិនិច្ឆ័យបញ្ហា / Diagnose Problem"** button,
then a 2×2 grid of secondary actions: **DTC search**, **Repair Case Library**,
**Photo Diagnosis**, **Ask Expert**. Below that, a **Recent cases** list (last 3
from storage) linking to case detail. A theme toggle sits in the top bar.
Starting a diagnosis calls `reset()` on the diagnosis session first.

### 2. Vehicle Selection — `/diagnose/vehicle` (`VehicleSelect.tsx`)
Step 1 of 3 (progress dots). Captures **Brand, Model, Year, Engine,
Transmission, Mileage**. Brand and model offer quick-pick chips from
`data/vehicles.ts`; free-text entry is always allowed for unlisted vehicles.
Brand is the only required field to continue. A sticky bottom **Continue** bar.

### 3. Symptom Input — `/diagnose/symptom` (`SymptomInput.tsx`)
Step 2 of 3. Contains:
- **System picker** — 12 systems (Engine, ABS, Airbag, Hybrid, EV, Transmission,
  A/C, Electrical, Suspension, Brake, Steering, Body) as an icon grid.
- **Describe problem** — free-text.
- **Add DTC code** — type a code and add it as a chip (repeatable).
- **Add photos** — file picker → thumbnails (stored as data URLs).
- **Scan tool report** — free-text (monospace) for live data / freeze frame.

Requires a system **and** at least a description or one DTC to analyze. The
**"វិនិច្ឆ័យឥឡូវ / Analyze now"** button calls `ai.diagnose()` and navigates to
the result.

### 4. Diagnosis Result — `/diagnose/result` (`DiagnosisResult.tsx`)
Step 3. Shows:
- Vehicle summary + DTC chips.
- **Possible causes ranked by likelihood** — numbered, each with a confidence
  bar, a likelihood badge (ខ្ពស់/មធ្យម/ទាប), and reasoning.
- **Inspection steps** — ordered list.
- **Tools needed** — chips.
- **Recommended repair** — highlighted card.
- **Safety notes** — warning cards (HV/SRS/brake warnings auto-added).

Sticky **"Save as repair case"** button prefills the Case form from the result.
If there is no active result (e.g. page refresh), it redirects to the workflow start.

### 5. DTC Search — `/dtc` (`DtcSearch.tsx`)
Search input (accepts `?code=` query param for deep links from cases). On empty
state, shows **popular codes**. An exact match renders a full **DTC detail**:
meaning, related systems, possible causes, **inspection flow**, **common
mistakes**, severity badge, and a **"Use in diagnosis"** button that seeds a new
diagnosis session. Partial matches list as cards. No-match shows an empty state.

### 6. Repair Case Library — `/cases` (`CaseLibrary.tsx`)
Searchable list of saved cases (search spans brand, model, year, engine, system,
symptom, root cause, repair, note, parts, DTC codes, tags). New-case button in
the top bar. Each card shows vehicle, system, primary DTC, symptom, and root cause.

- **Case Detail** — `/cases/:id` (`CaseDetail.tsx`): full case view, DTC chips
  (link to DTC search), symptom / root cause / repair / parts / note / photos,
  **Similar cases** section, and Edit / Delete actions.
- **Case Form** — `/cases/new` and `/cases/:id/edit` (`CaseForm.tsx`):
  create/edit a case. Can be **prefilled from a diagnosis** (via router state);
  seeds root cause from the top-ranked cause. Add/remove DTC codes and parts as chips.

### 7. Photo Diagnosis — `/photo` (`PhotoDiagnosis.tsx`)
Attach one or more photos, each with a note. **"Analyze photos"** calls
`ai.analyzePhotos()` and renders observations, possible causes (with confidence
bars), and next steps. Sticky analyze bar appears once photos exist.

### 8. Ask Expert — `/expert` (`AskExpert.tsx`)
Full-screen chat. Opens with an intro message and **quick-start** prompts. Tech
messages are right-aligned bubbles; expert replies are left-aligned. Replies come
from `ai.askExpert()` and include **structured follow-up question chips** shown
below the latest reply — tapping one sends it. The current diagnosis vehicle (if
any) is shown as a context pill. This satisfies "always ask follow-up diagnostic
questions when information is missing."

### 9. Settings — `/settings` (`Settings.tsx`)
Theme selector (Light / Dark / System), **Clear all cases** (data management),
and an About card with app name/version/description.

## Current dummy AI behavior

All AI lives behind `AiProvider` in `src/services/ai.ts`. The shipped
implementation is `PlaceholderAiProvider` — **no real model**. It is deterministic
and composes believable output from real inputs:

- **`diagnose()`** — matches entered DTC codes against the local DTC knowledge
  base, applies keyword heuristics to the symptom text (e.g. "ញ័r/misfire",
  "ផ្សែងខ្មៅ/lean", "ក្តៅ/overheat"), de-duplicates and sorts causes by confidence,
  builds inspection steps (DTC flows + generic checks), picks tools by system,
  and auto-adds safety notes for HV/EV and SRS/Airbag work. ~1.1s simulated delay.
- **`analyzePhotos()`** — returns placeholder observations that echo the user's
  notes, plus generic causes and next steps. It does **not** actually read images.
- **`askExpert()`** — detects missing context (vehicle, DTC, mileage) and returns
  follow-up questions first; otherwise gives simple keyword-based guidance. Every
  reply is tagged as a placeholder.

See [ai-system.md](ai-system.md) for the rules real AI must follow.

## localStorage data persistence

There is **no backend**. Data persists in the browser via `src/services/store.ts`:

- **Keys:** `mt.cases.v1`, `mt.threads.v1`, `mt.seeded.v1`, `mt.theme.v1`.
- **Repair cases** — seeded on first run with 3 example cases
  (`data/seedCases.ts`), then fully owned by the technician: create, edit, delete,
  search, and "similar cases" ranking. Sorted by `updatedAt`.
- **Expert threads** — a `threadStore` exists (list/get/save). The Ask Expert
  screen currently holds messages in component state; persisting threads through
  `threadStore` is available but not yet wired into the screen.
- **Theme** — persisted so the chosen mode survives reloads.
- **Photos** — stored inline as data URLs inside the case/photo records.

> localStorage is per-browser and per-device; clearing browser data erases cases.
> Cloud sync is a future phase (see [roadmap.md](roadmap.md)).
