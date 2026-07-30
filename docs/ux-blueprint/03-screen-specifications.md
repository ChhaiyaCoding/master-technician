# 03 — Screen Specifications

Every screen, specified consistently: **Purpose · Primary action · Secondary
actions · Inputs · Outputs · Navigation (in/out) · Empty · Loading · Error.**

These describe the intended experience (grounded in what's built ✅, with planned
behavior marked 🔜). They are UX specs, not implementation.

Cross-cutting rules (apply to all screens): one-hand reach, ≥56px primary targets,
Khmer-first copy, glanceable hierarchy, fast exit. See `06-interaction-principles.md`.

---

## S0 — Splash / Launch frame 🔜

- **Purpose:** brief branded frame while the app mounts. Must **never block**.
- **Primary action:** none (auto-proceeds to Home in milliseconds).
- **Secondary:** none.
- **Inputs:** none.
- **Outputs:** transitions to Home; restores theme immediately (no flash).
- **Navigation:** → Home. Skipped on warm start.
- **Empty / Loading:** the frame *is* the loading state; nothing the user waits for.
- **Error:** if init fails, go straight to Home with a non-blocking toast.

---

## S1 — Home ✅  `/`

- **Purpose:** launchpad to every task; surface recent work; resume in progress.
- **Primary action:** **Diagnose Problem** (large CTA) → Vehicle Select (resets
  session).
- **Secondary actions:** DTC Search · Case Library · Photo Diagnosis · Ask Expert
  (2×2 tiles); theme toggle (top bar); 🔜 "Continue diagnosis" banner; "View all"
  → Cases.
- **Inputs:** none (pure navigation).
- **Outputs:** navigation; recent-cases list (last 3, from store).
- **Navigation in:** app launch, bottom-nav Home, back from any tab root.
- **Navigation out:** any of the 5 tasks; a recent case → Case Detail.
- **Empty state:** no recent cases → friendly "no cases yet" line (tiles still shown).
- **Loading:** none (reads local store synchronously).
- **Error:** store read fails → hide recent list gracefully; core tiles remain.

---

## S2 — Vehicle Select ✅  `/diagnose/vehicle`  (Step ①)

- **Purpose:** identify the vehicle under diagnosis, fast, with quick-picks.
- **Primary action:** **Continue** (sticky) → Symptom Input.
- **Secondary actions:** brand/model/engine quick-pick chips; back.
- **Inputs:** Brand (chip **or** free text), Model, Year (select), Mileage (numeric),
  Engine (chip/text, optional), Transmission (segmented, optional).
- **Outputs:** updates the diagnosis session `vehicle`.
- **Navigation in:** Home CTA; DTC "Use in diagnosis" (session pre-seeded).
- **Navigation out:** Continue → Symptom; back → Home. StepDots show 1/3.
- **Empty state:** all fields empty is valid; only **Brand** gates Continue.
- **Loading:** none (static reference data).
- **Error:** invalid mileage/year input is ignored/clamped; never blocks.
- **Notes:** free-text fallback everywhere (older/rare vehicles). Minimal typing —
  chips first.

---

## S3 — Symptom Input ✅  `/diagnose/symptom`  (Step ②)

- **Purpose:** capture what's wrong: system, description, codes, evidence.
- **Primary action:** **Analyze now** (sticky) → ⚙ AI → Diagnosis Result.
- **Secondary actions:** add/remove DTC chips; add/remove photos; back.
- **Inputs:** System (icon grid, **required**), symptom text, DTC codes (repeatable),
  photos (camera/gallery), scan-tool report (paste).
- **Outputs:** updates session `input`; triggers `ai.diagnose()`.
- **Navigation in:** from Vehicle (Continue).
- **Navigation out:** Analyze → Result; back → Vehicle. StepDots 2/3.
- **Empty state:** no system chosen → inline hint "select a system first"; Analyze
  disabled until System + (text or ≥1 DTC).
- **Loading:** Analyze button shows spinner + "analyzing…"; inputs locked briefly.
- **Error:** AI failure → keep inputs, show retry toast; never lose entered data.
- **Notes:** vehicle summary shown in top bar for context; typing minimized (system
  = tap, DTC = short code, scan = paste).

---

## S4 — Diagnosis Result ✅  `/diagnose/result`  (Step ③)

- **Purpose:** deliver the answer — ranked causes with evidence — and the actions
  around it. **This is the screen the mechanic reads and leaves on.**
- **Primary action:** **Save as repair case** (sticky) → Case Form (prefilled).
- **Secondary actions:** scroll sections; DTC chips; back. 🔜 tap a cause to expand;
  🔜 open interactive inspection/verification checklists.
- **Inputs:** none (renders the AI result). 🔜 checklist toggles, entered measurements.
- **Outputs:** the `DiagnosisResult` view: vehicle summary, DTC chips, **ranked
  causes (confidence + reasoning)**, inspection steps, tools, recommended repair,
  safety notes.
- **Navigation in:** from Symptom (after AI).
- **Navigation out:** Save → Case Form; back → Symptom. **Guard:** on refresh/no
  result → redirect to Vehicle (workflow restart).
- **Empty state:** causes list is never empty (AI guarantees a fallback + "get more
  data" guidance).
- **Loading:** arrives post-analysis; sub-sections render instantly.
- **Error:** if the result is missing → safe redirect (above), not a blank screen.
- **Notes:** the top cause + safety warning should be visible with minimal scroll
  (glanceable). Safety cards are visually distinct (warning color).

---

## S5 — DTC Search + Detail ✅  `/dtc`  (+ `?code=`)

- **Purpose:** interpret a trouble code in seconds.
- **Primary action:** **type/tap a code** → see Detail.
- **Secondary actions:** popular-code chips; from Detail: **Use in diagnosis** →
  seeds a diagnosis; tap partial-match card.
- **Inputs:** search query (uppercased); optional `?code=` deep-link param.
- **Outputs:** DTC Detail — meaning, related systems, possible causes, inspection
  flow, common mistakes, severity badge.
- **Navigation in:** bottom-nav DTC; any DTC chip (`/dtc?code=`); empty-state links.
- **Navigation out:** Use in diagnosis → Vehicle (seeded); stays on tab otherwise.
- **Empty state (no query):** show **popular codes**.
- **Empty state (no match):** "not found" + hint + suggest Ask Expert.
- **Loading:** local lookup is instant; no spinner. (🌐 remote KB → skeleton.)
- **Error:** malformed query → treated as no-match, never crashes.

---

## S6 — Case Library ✅  `/cases`

- **Purpose:** find a past repair (or start a new one).
- **Primary action:** **search** to recall a case.
- **Secondary actions:** **New case** (＋, top bar); tap a case → Detail.
- **Inputs:** search query (spans brand·model·year·engine·system·symptom·root
  cause·repair·note·parts·DTC·tags).
- **Outputs:** ranked/filtered case cards (vehicle, system, primary DTC, symptom,
  root cause), result count.
- **Navigation in:** bottom-nav Cases; Home "View all"/Recent; after saving a case.
- **Navigation out:** case card → Detail; ＋ → Case Form.
- **Empty state (none saved):** encourage saving the first case.
- **Empty state (0 hits):** "0 results" for the query.
- **Loading:** local; instant. (🌐 cloud → skeleton list.)
- **Error:** store read failure → empty state + retry.

---

## S7 — Case Detail ✅  `/cases/:id`

- **Purpose:** read a full repair record and jump to related knowledge.
- **Primary action:** read the record (root cause / repair / note). 🔜 "Reuse for
  new diagnosis".
- **Secondary actions:** **Edit** → Case Form; **Delete** (confirm); DTC chip → DTC
  Search; Similar Case → another Detail.
- **Inputs:** none (read view).
- **Outputs:** full case (vehicle summary, DTCs, symptom, root cause, repair, parts,
  note, photos, tags) + **Similar Cases**.
- **Navigation in:** Library, Recent, Similar Cases, after save.
- **Navigation out:** Edit/Delete; DTC chip; Similar → Detail; back → Library.
- **Empty state:** unknown `:id` → redirect to Library (no dead end).
- **Loading:** local; instant.
- **Error:** missing record → safe redirect.

---

## S8 — Case Form (new / edit) ✅  `/cases/new`, `/cases/:id/edit`

- **Purpose:** create or edit a repair case; capture the outcome fast.
- **Primary action:** **Save** (sticky) → Case Detail.
- **Secondary actions:** add/remove DTC & parts chips; pick system; back.
- **Inputs:** vehicle fields, system, DTCs, symptom, root cause, repair, parts,
  note, photos, tags. **Prefill** from a diagnosis (via router state) or an existing
  case (edit).
- **Outputs:** persisted `RepairCase`.
- **Navigation in:** Result "Save as case" (prefilled); Library ＋; Detail Edit.
- **Navigation out:** Save → Detail; back → previous.
- **Empty state:** blank form (new). Save gated by Brand + (symptom or root cause).
- **Loading:** save is local/instant.
- **Error:** save failure (e.g. storage quota from photos) → warn, keep the draft,
  offer to remove/compress photos (🔜).

---

## S9 — Photo Diagnosis ✅  `/photo`

- **Purpose:** analyze photos of parts / lights / live data.
- **Primary action:** **Analyze photos** (sticky, appears once photos exist) → ⚙.
- **Secondary actions:** add photo, edit per-photo note, remove photo.
- **Inputs:** one or more images + optional note each.
- **Outputs:** observations, possible causes (confidence), next steps.
- **Navigation in:** Home tile. (🔜 from Symptom's photos.)
- **Navigation out:** back → Home; result renders in place.
- **Empty state:** no photos → tappable add-photo prompt.
- **Loading:** Analyze shows spinner + "analyzing…".
- **Error:** analysis failure → retry; photos/notes preserved.
- **Notes:** placeholder analysis today; real vision behind `services/ai.ts`.

---

## S10 — Ask Expert ✅  `/expert`  (full-screen chat)

- **Purpose:** resolve the ambiguous case; the app asks the right questions back.
- **Primary action:** **send a message** (or tap a follow-up/quick-start chip).
- **Secondary actions:** tap follow-up chips; back. 🔜 save thread; 🔜 "make a case".
- **Inputs:** message text; taps on structured follow-up / quick-start chips.
- **Outputs:** expert replies (concise, evidence-oriented) + **follow-up question
  chips**; vehicle context pill if a session exists.
- **Navigation in:** bottom-nav Expert; Home tile; empty-state "Ask Expert" links.
- **Navigation out:** back → previous (bottom nav hidden here; composer owns bottom).
- **Empty state:** intro message + quick-start prompts.
- **Loading:** "expert is thinking…" indicator.
- **Error:** reply failure → inline retry; typed message preserved.
- **Notes:** designed to **conclude fast** — follow-ups drive to an answer, not a
  long chat (principle 7/8). Today messages are in-memory; 🔜 persist via threadStore.

---

## S11 — Settings ✅  `/settings`

- **Purpose:** theme + data management + about. Low-frequency.
- **Primary action:** choose **theme** (Light / Dark / System).
- **Secondary actions:** **Clear all cases** (confirm); read About/version.
- **Inputs:** theme selection; clear-data confirmation.
- **Outputs:** persisted theme; cleared local cases.
- **Navigation in:** bottom-nav Settings.
- **Navigation out:** bottom nav to any tab.
- **Empty state:** n/a.
- **Loading:** none.
- **Error:** clear-data failure → toast; nothing partially destructive.

---

## Global states (consistent across screens)

- **Loading:** button-inline spinners for actions; skeletons for future remote
  lists; never a full-screen blocking spinner for local data.
- **Empty:** always actionable — say what to do next, offer the fastest route
  (often Ask Expert or "add").
- **Error:** never destroy user input; offer retry; keep the mechanic moving. AI/
  network errors degrade gracefully to the last good state.
- **Offline (🔜):** local features (DTC lookup, cases, capture) keep working; AI
  features show a clear "needs connection" state and queue where sensible.
