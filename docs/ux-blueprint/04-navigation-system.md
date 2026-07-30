# 04 — Navigation System

Navigation exists to get the mechanic to an answer in the **fewest taps**, then out.
Every rule below serves *reduce searching time, not screen time*.

## Navigation philosophy

- **Shallow, not deep.** Any answer is 1–2 taps from a tab root. Depth is a cost.
- **Task-oriented, not menu-oriented.** The home tiles and bottom tabs are *tasks*
  ("Diagnose", "DTC", "Cases"), not categories to browse.
- **Predictable and reversible.** Back always does the obvious thing; the mechanic
  is never lost or trapped.
- **Stateful.** Interruptions are the norm; the app remembers where you were.
- **Quiet.** No navigation that exists to pull the user deeper or back in.

## Bottom navigation

The primary wayfinding device — thumb-reachable for one-hand use.

- **5 destinations:** Home · DTC · Cases · Expert · Settings.
- **Visibility rule:** the bar shows **only on tab roots** (`/`, `/dtc`, `/cases`,
  `/settings`). It **hides** inside full-screen flows — the diagnosis workflow, case
  detail/form, photo, and the Expert chat — so a screen's own sticky action bar or
  composer owns the bottom edge. **Never stack two fixed bottom bars.**
- **Active state:** current tab highlighted (accent), large icon + Khmer label.
- **Why these 5:** they are the recurring *jobs* a technician does. Expert is a tab
  (fast access when stuck) but renders full-screen because it's a focused mode.
- **No overflow/hamburger.** If a 6th primary destination is ever proposed, something
  must justify leaving — we protect the 5-slot thumb zone.

## Back behavior

- **TopBar back** (large top-left target) appears on every non-root screen; it goes
  to the logical previous screen, not just history.
- **Workflow back** (Vehicle ← Symptom ← Result) preserves entered data — stepping
  back never wipes the session.
- **Hardware/gesture back** mirrors TopBar back.
- **Guarded destinations:**
  - Diagnosis **Result** on refresh/no session → redirect to Vehicle (no blank).
  - Unknown Case `:id` → redirect to Library.
  - 🔜 Leaving a dirty Case Form → confirm-discard prompt (protect unsaved work).
- **Save replaces, not stacks:** after Save, Case Form is replaced by Case Detail
  (back returns to Library, not the form) to avoid re-editing loops.
- **Root back:** on a tab root, back exits the app (standard) — we don't trap users.

## Deep links

Deep links make "open → find in seconds" literal by skipping navigation.

| Link | Lands on | Use |
| --- | --- | --- |
| `/dtc?code=P0301` ✅ | DTC Detail for that code | Case DTC chip → instant meaning |
| `/cases/:id` ✅ | Case Detail | Share/return to a specific case |
| `/diagnose/vehicle` (seeded) ✅ | Vehicle, pre-filled system/DTC | DTC "Use in diagnosis" |
| 🔜 `/dtc?code=…` from outside | DTC Detail | Future: notification/scan-tool handoff |
| 🔜 resume link | last workflow step | "Continue diagnosis" |

Principles: deep links are **idempotent** (safe to re-open), **degrade** to a sensible
screen if the target is missing, and **carry context** (seeded diagnosis) rather than
forcing re-entry.

## Recent items

Recall beats search when the thing is fresh.

- **Home → Recent cases:** last 3 saved cases, one tap into Case Detail — the fastest
  path back to a just-finished job.
- **"View all"** jumps to the Library.
- 🔜 **Recent DTC lookups** and 🔜 **recent vehicles** as quick-fill chips, to cut
  repeat typing during a shift.

## Continue previous work

Mechanics get interrupted mid-diagnosis; losing state would force re-entry (pure
searching-time waste).

- The diagnosis **session** (vehicle + symptom input + result) persists in memory
  across in-app navigation today (DiagnosisContext).
- 🔜 **Persist the session** (and Expert thread) to local storage so it survives an
  app close, and surface a **"Continue diagnosis"** banner on Home when an
  in-progress session exists → tap resumes at the last step (②/③).
- 🔜 Draft **Case Form** autosave, so an interrupted write is never lost.
- Rule: **the app never asks the mechanic to re-enter something they already gave.**

## Search behavior

Search is a primary navigation tool, tuned for speed and gloves.

- **DTC search:** uppercased input; **popular codes** shown when empty; instant local
  matching; exact match renders Detail immediately; partials list; clear no-match
  state with an Ask-Expert offer.
- **Case search:** single box spanning all meaningful fields (brand, model, year,
  engine, system, symptom, root cause, repair, note, parts, DTC, tags); term-AND
  substring matching; live result count.
- **Interaction rules:** autofocus where search is the screen's purpose (DTC);
  minimal typing (chips/recent to pre-fill); results update as you type; never a
  separate "search" round-trip screen.
- 🔜 **Voice search** (hands busy) and 🔜 **global search** (one box across DTCs +
  cases + systems) as coverage grows — always returning the *answer*, not a menu.

## Navigation anti-patterns (forbidden)

- ❌ Deep nested menus or a hamburger drawer hiding core tasks.
- ❌ Modal stacks that trap the user or obscure the exit.
- ❌ Interstitials, upsells, or "are you sure you want to leave?" nags that aren't
  protecting real unsaved work.
- ❌ Any navigation whose purpose is to increase time-in-app rather than speed a
  repair decision.
