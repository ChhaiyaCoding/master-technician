# 02 — User Flows

Complete task flows, screen by screen, with decision points and — crucially — the
moments the mechanic **leaves the app and returns to the vehicle**. Every flow is
designed around one measure: *how few seconds to the answer.*

**Legend:** `▸` screen · `◆` decision · `⚙` AI/async step · `⤴` exit to the vehicle ·
`↺` re-entry point. ✅ built · 🔜 planned.

Each flow lists: **Trigger → Steps → Exit → Re-entry**.

---

## Flow A — Diagnose a Vehicle ✅

The core loop. Goal: from a complaint to a ranked, evidence-based cause list, then
a saved case.

**Trigger:** Home → "Diagnose Problem" (or DTC "Use in diagnosis", which pre-seeds).

```
▸ HOME
   ↓  tap Diagnose Problem  (session reset)
▸ ① VEHICLE SELECT
   • pick Brand (chip or type) → Model (chip/type)
   • Year · Mileage · Engine · Transmission (optional)
   ◆ Brand present? ── no ──▸ Continue disabled (only brand required)
   ↓  Continue
▸ ② SYMPTOM INPUT
   • pick System (required)
   • describe problem  (and/or)
   • add DTC code(s)   (and/or)
   • add photo(s) · paste scan-tool report
   ◆ System + (text or DTC)? ── no ──▸ Analyze disabled
   ↓  Analyze now
⚙  AI diagnose  (loading state; ~1s)
▸ ③ DIAGNOSIS RESULT
   • Vehicle summary + DTC chips
   • Possible causes RANKED (confidence + reasoning)  ← the answer
   • Inspection steps · Tools needed
   • Recommended repair · Safety notes (HV/SRS auto)
   ◆ Mechanic acts on it:
       ⤴ leaves app to inspect / measure / repair the car   ← primary intent
   ↺ returns later to log outcome
   ↓  Save as repair case
▸ ④ CASE FORM (prefilled from result: vehicle, system, DTCs, top cause→rootCause)
   • confirm root cause · repair performed · parts · note · photos
   ↓  Save
▸ CASE DETAIL  → now discoverable as a Similar Case for future diagnoses
```

**Exit points:** the mechanic typically exits at ③ to work on the car, and re-enters
at ④ to save. The app must make **③ glanceable** (answer without scrolling) and **④
fast** (few taps) so neither adds screen time.

**Fast path:** DTC known → `/dtc` → "Use in diagnosis" jumps straight to ①/② pre-seeded.

---

## Flow B — Search a DTC ✅

The most frequent, most time-sensitive lookup. Goal: understand a code in seconds.

**Trigger:** Bottom nav → DTC (or a DTC chip anywhere → `/dtc?code=…`).

```
▸ DTC SEARCH
   ◆ query empty?
      ── yes ──▸ show POPULAR codes (tap to fill)
      ── no  ──▸ ⚙ local lookup (instant)
                 ◆ exact match?
                    ── yes ──▸ DTC DETAIL (inline)
                    │           • meaning · related systems
                    │           • possible causes
                    │           • inspection flow (ordered)
                    │           • common mistakes · severity
                    │           ◆ next action:
                    │              ⤴ go fix / inspect the car        ← usual exit
                    │              or "Use in diagnosis" ──▸ Flow A (seeded)
                    ── no  ──▸ partial matches list ── tap ──▸ DTC DETAIL
                    ── none ──▸ EMPTY STATE (not found + hint + Ask Expert)
```

**Design intent:** deep-linking from a case's DTC chip lands directly on DETAIL —
zero navigation. This is the canonical "open → find in seconds → close" flow.

---

## Flow C — Photo Diagnosis ✅ (analysis 🔜 real)

Goal: capture what the eye sees (part, warning light, gauge) and get guidance.

```
▸ PHOTO DIAGNOSIS
   ◆ any photos?
      ── no ──▸ EMPTY STATE → tap to add (camera/gallery)
   • add photo(s); write a short note per photo (why it matters)
   ↓  Analyze photos
⚙  AI analyze  (loading)
▸ RESULT (in place)
   • observations · possible causes (confidence) · next steps
   ◆ next: ⤴ act on the car   or   add more photos / different angle
```

**Note:** placeholder analysis today; a real vision model plugs in behind
`services/ai.ts` with no flow change. Note-per-photo keeps typing minimal but
improves the answer.

---

## Flow D — Repair Case (capture & recall) ✅

Two sub-flows: **save** (D1) and **find/recall** (D2). The recall flow is what makes
future diagnoses faster — the flywheel.

### D1 — Save a case
```
Entry 1: Flow A ③ → "Save as repair case" → CASE FORM (prefilled)
Entry 2: Case Library → "New case" (＋) → CASE FORM (blank)
▸ CASE FORM
   • vehicle · system · DTCs · symptom · root cause · repair · parts · note · photos · tags
   ◆ brand + (symptom or root cause)? ── no ──▸ Save disabled
   ↓  Save
▸ CASE DETAIL
```

### D2 — Find / recall a case
```
▸ CASE LIBRARY
   • search box (brand·model·year·DTC·symptom·cause·repair·note·parts·tags)
   ◆ results?
      ── none saved ──▸ EMPTY STATE (save your first case)
      ── query, 0 hits ──▸ "0 results" state
      ── hits ──▸ result cards
   ↓  tap a case
▸ CASE DETAIL
   • full record · DTC chips (→ DTC Search)
   • SIMILAR CASES (shared DTC/system/brand) ── tap ──▸ another CASE DETAIL
   ◆ Edit → CASE FORM ·  Delete → confirm → back to Library
   ⤴ mechanic reads the fix and returns to the car
```

**Cross-flow:** from Home, the **Recent cases** list is a shortcut into D2 without
opening the Library.

---

## Flow E — Ask Expert ✅

The fallback when structured lookups don't resolve it. Designed to *conclude
quickly*, not to sustain a conversation (principle 7: information over conversation).

```
▸ ASK EXPERT  (full-screen)
   • intro message + QUICK-START prompts (tap to send)
   ◆ first message?
      ── yes ──▸ ⚙ AI: asks structured FOLLOW-UP questions first
                 (vehicle? DTC? mileage? when does it occur?)
   • tech answers via tappable follow-up chips or typing
⚙  AI reply (concise, evidence-oriented)
   ◆ resolved?
      ── yes ──▸ ⤴ act on the car   (🔜 "turn this into a case")
      ── no  ──▸ answer more follow-ups (loop, minimal)
```

**Context carry:** if a diagnosis vehicle exists, it's shown as a context pill and
passed to the AI so the tech doesn't re-enter it. 🔜 persist the thread so it can be
resumed.

---

## Flow F — Resume previous work 🔜

Because mechanics get interrupted. Goal: never lose an in-progress diagnosis.

```
▸ HOME
   ◆ in-progress diagnosis session exists?
      ── yes ──▸ "Continue diagnosis" banner ── tap ──▸ last workflow step (②/③)
      ── no  ──▸ normal home
```

See `04-navigation-system.md` → "Continue previous work".

---

## Flow entry-point matrix

| Flow | From Home | From bottom nav | From deep link | From another flow |
| --- | --- | --- | --- | --- |
| A Diagnose | Primary CTA | — | resume 🔜 | DTC "Use in diagnosis" |
| B DTC | Action tile | DTC tab | `/dtc?code=` | Case DTC chip |
| C Photo | Action tile | — | — | (🔜 from Symptom photos) |
| D Cases | Recent + tile | Cases tab | `/cases/:id` | Result → Save; Similar |
| E Expert | Action tile | Expert tab | — | Empty states ("Ask Expert") |
| F Resume | Banner 🔜 | — | — | any interrupted workflow |

## Common exit principle

Every flow has a **fast, obvious exit** and a cheap **re-entry**. We assume the
mechanic will leave mid-task to touch the car; the design's job is to make that
leaving frictionless and the returning stateful — never to keep them in the app.
