# 06 — Interaction Principles

The concrete interaction rules for Master Technician. These translate the design law
(`../product-strategy/design-principles.md`) and the 10 UX principles into how the
app *feels* under a busy mechanic's thumb.

Every rule answers the governing question: **"Does this help the mechanic repair the
vehicle faster and more accurately?"**

---

## 1. One-handed use
- **Reachability:** primary and confirming actions live in the **bottom third** —
  bottom nav on tab roots, sticky action bars in flows. The top is for context/back,
  not for the main action.
- **Thumb ergonomics:** critical controls sit within a natural thumb arc; nothing
  essential in the top corners except back.
- **No two-hand gestures** required (no pinch-to-act, no long multi-finger gestures).
- **Portrait-first**; the app works held in one hand while the other holds a tool.

## 2. Large touch targets
- **Primary buttons ≥ 56px tall**, full-width where they're the main action.
- **Icon buttons ≥ 40px**; chips/tiles generously padded and spaced (no fat-finger
  mis-taps with gloves or greasy hands).
- **Tap feedback** on every control (active-press scale) so a tap is unmistakable.
- **Forgiving hit areas** — the tappable region extends beyond the visible label.

## 3. Minimal typing
- **Tap over type, always.** Systems, brands, models, engines, transmissions, DTC
  suggestions, and follow-ups are **chips/pickers** first; free text is the fallback.
- **Short inputs only:** DTC codes (5 chars), numbers (year/mileage), pastes (scan
  report). Never ask for a paragraph where a selection works.
- **Smart defaults & recall:** recent vehicles/DTCs pre-fill; the diagnosis carries
  context forward so nothing is re-entered.
- 🔜 **Voice input** for symptoms and notes (hands busy is the norm).
- 🔜 **Scan/OCR** to capture VIN, DTCs, and gauge readings instead of typing.

## 4. Fast search
- **Instant, local, as-you-type.** No submit round-trip; results update live.
- **Popular / recent shown when empty** so a tap often beats typing.
- **Forgiving matching:** uppercasing, partials, term-AND across all fields.
- **Answer, not a menu:** an exact DTC match jumps straight to the Detail.
- **Autofocus** where search *is* the screen's job (DTC).
- 🔜 Global search (DTCs + cases + systems) and voice search as coverage grows.

## 5. Offline-first thinking
- **Core features work with no signal:** DTC lookup, case capture, case search, and
  browsing are local and must never require the network.
- **AI features degrade gracefully:** a clear "needs connection" state, inputs
  preserved, queue/retry where sensible — never a dead end.
- **No data loss offline:** cases and drafts persist locally; sync (🌐) reconciles
  later. Shops have poor connectivity — assume it.
- **Fast cold start:** no network on launch path; the app is useful immediately.

## 6. Minimal screen time
- **Get in, answer, get out.** Default screens open on the answer or the shortest
  path to it; the exit is always one obvious tap.
- **No engagement mechanics** — ever. No streaks, feeds, badges-for-returning, or
  notifications whose purpose is to pull the tech back. (`project-rules.md` Rule 0.)
- **Concise everything:** scannable structure over prose; AI replies short and cited.
- **Interruptible & resumable:** the app assumes you'll leave mid-task; state is
  saved so returning costs nothing (`04` → Continue previous work).

## 7. Maximum repair time
- **Every screen earns its seconds.** If a screen doesn't speed a repair decision,
  it's redesigned or removed.
- **Glanceable answers:** the single most decision-relevant fact (top cause, DTC
  meaning, safety warning, next test) is visible without scrolling.
- **Fewest taps to value:** measure flows in taps-to-answer and drive it down.
- **The phone yields to the vehicle:** success is the mechanic back at the car,
  fixing it — the app measures itself by searching-time removed, not time held.

---

## Additional interaction rules

### Feedback & latency
- Any async action (AI, future network) shows an **immediate, honest** loading state
  (button spinner, brief label) and a way out; never a silent wait or a full-screen
  block for local data.
- Success is quiet and quick (transition/toast); errors never destroy input.

### Safety interactions
- **Safety is never dismissed by accident.** HV/SRS warnings are visually escalated
  (warning color, distinct cards) and always shown when applicable.
- 🔜 For HV/airbag steps, an explicit **acknowledge-before-proceed** gate — a
  deliberate interaction, because the stakes justify the one extra tap.

### Consistency
- The same components mean the same thing everywhere (chips = selectable, badges =
  status, sticky bottom = the primary action). Learn once, use anywhere.
- One information priority order on every screen (`05` → glanceable IA).

### Readability in the shop
- **Dark-first**, high contrast, large legible Khmer type; color used to *mean*
  (danger/warning/success), not to decorate. Usable in poor light and bright glare.

### Error & empty states
- Always **actionable**: say what's wrong or missing and the fastest next step
  (often "add…" or "Ask Expert"). Never a blank screen or a dead end.

---

## The interaction test (apply to every gesture, field, and screen)

> Does this interaction get the mechanic to a trusted answer **faster**, with
> **less typing** and **fewer taps**, and let them **return to the vehicle**
> sooner? If not — remove it, shorten it, or replace typing with a tap.
