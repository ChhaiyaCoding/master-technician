# UI / UX Guidelines — Master Technician

These are the rules every screen must follow. They exist because the user is a
professional mechanic who is **mid-repair** when they pick up the phone — hands
busy, seconds to spare — and who needs to get back to the vehicle immediately.

## Core UX philosophy — get in, get the answer, get out

The mechanic's workspace is the vehicle, not the phone. The app is a **reference
instrument**, used in short bursts. The entire experience is optimized for one loop:

> **Open quickly → find the information quickly → understand immediately → return to
> the repair.**

We optimize for **time-to-answer**, not time-on-screen. More interaction is worse,
not better. If a screen adds a tap, a scroll, or a moment of confusion without
helping the mechanic decide faster, it is a defect. See the accompanying design law
in `product-strategy/design-principles.md`.

## The 10 UX principles

1. **Open quickly.** Launch to a useful state fast; no splash, no warm-up, no login
   wall for core reference.
2. **Find information quickly.** The needed answer is reachable in seconds — search,
   shortcuts, and defaults beat menu-diving.
3. **Understand immediately.** Present answers so they're grasped at a glance —
   scannable structure, clear hierarchy, plain Khmer.
4. **Return to vehicle repair.** Every flow has an obvious, fast exit; nothing traps
   the user or invites a longer session.
5. **Never require unnecessary interaction.** No steps, confirmations, or taps that
   don't move the mechanic toward a decision.
6. **Every screen helps a repair decision faster.** If a screen doesn't speed up a
   decision, redesign or remove it.
7. **Information over conversation.** Prefer structured, scannable information to
   back-and-forth dialogue. Chat is a fallback, not the default.
8. **AI assists only when needed.** AI supports the workflow; it never dominates it.
   Structured lookups come first; AI fills gaps and answers the genuinely open
   questions.
9. **Reduce diagnostic time, not increase phone usage.** Screen time is a cost.
   Success is the mechanic spending *less* time in the app.
10. **One test for every feature/screen:** *"Does this help the mechanic repair the
   vehicle faster and more accurately?"* If no → redesign or remove.

## 1. Mobile-first

- Design for a **phone viewport (~375–430px wide)**. Content is centered in a
  `max-w-md` column (`Page` in `components/Layout.tsx`).
- Respect device safe areas: `.pt-safe` / `.pb-safe` helpers and
  `viewport-fit=cover` handle notches and home indicators.
- Disable zoom-on-input jank; keep vertical scroll only. Desktop/tablet are not
  targets yet — they simply see the centered phone column.

## 2. One-hand use

- **Primary and confirming actions live at the bottom**, within thumb reach:
  - Top-level navigation is a fixed **bottom tab bar** (`BottomNav`).
  - Multi-step and form screens use a **sticky bottom action bar** (`StickyBar`)
    for the main button (Continue / Analyze / Save).
- The bottom tab bar shows **only on the tab roots** (`/`, `/dtc`, `/cases`,
  `/settings`). Full-screen flows (chat, photo, diagnosis workflow, case
  detail/form) hide it so their own sticky bar/composer owns the bottom — never
  stack two fixed bottom bars.
- Back navigation is a large top-left target in `TopBar`, so exiting is always fast.

## 3. Large buttons & touch targets

- Buttons use `btn-lg`: **min height 56px**, generous horizontal padding — usable
  with gloves or dirty hands, first tap.
- The home primary CTA is oversized and full-width.
- Icon-only buttons are ~40px squares minimum.
- Selectable chips/tiles (systems, brands, DTC) are large, spaced (`gap-2`+), and
  give an active-press scale (`active:scale-95`) for tactile feedback.
- Inputs are tall (`py-3`) with clear focus rings.

## 4. Dark / light mode

- **Dark mode is the default** (better for shop lighting and battery). Light mode
  and "follow system" are available in Settings and via the home toggle.
- Theme is driven by **CSS variables**, not hard-coded colors. `:root` = light,
  `.dark` = dark (see `src/index.css`). Tailwind maps semantic tokens to them:
  `bg`, `surface`, `surface-2`, `border`, `text`, `muted`, `primary`, `accent`,
  `danger`, `warning`, `success`.
- **Never hard-code hex colors in components.** Always use the semantic tokens
  (e.g. `bg-surface`, `text-muted`, `text-primary`) so both themes stay correct.
- Maintain high contrast; the accent (`primary`, an orange "mechanic amber") is
  reserved for primary actions and active state.

## 5. Fast-reference workflow (mechanic-focused)

- **Speed to answer is the metric.** Optimize the common paths (DTC lookup, "what's
  the likely cause / next test", find a past case) to a few taps and instant recall.
- **Khmer-first copy**, with English technical terms inline (DTC, ABS, OBD-II, fuel
  trim, scan tool, HV, SRS). All UI strings live in `src/i18n/strings.ts`. This is
  governed by the permanent [language-standard.md](language-standard.md) — Khmer
  prose, English component names / DTC codes / Live Data / tools never translated.
- **Fewest taps to value:** Home → answer with minimal detours; the diagnosis flow
  is a short, linear wizard with a progress indicator (`StepDots`). No deep menu
  trees.
- **Structured over chatty:** diagnosis output is scannable sections, not
  paragraphs; even the expert chat surfaces follow-up questions as tappable chips so
  the tech resolves and leaves quickly.
- **Answers are glanceable:** the most decision-relevant information (top cause,
  next test, safety warning) is visible without scrolling where possible.
- **Evidence and safety are first-class:** ranked causes show a confidence bar and
  reasoning; HV/EV and SRS/Airbag flows surface isolation/discharge warnings in
  distinct warning-colored cards, immediately.
- **Fast exit, fast re-entry:** leaving and returning is cheap; the app never
  guilt-trips the user into staying (no streaks, feeds, or engagement nudges).
- **Professional tone:** no gamification, no playful language; fast and clear.

## 6. Reusable building blocks (use these, don't reinvent)

From `components/ui.tsx` and `components/Layout.tsx`:

- `Page`, `TopBar`, `BottomNav`, `StickyBar`, `StepDots`
- `Button` (variants: primary / surface / ghost / danger), `Card`, `Field`
- `SectionTitle`, `ConfidenceBar`, `LikelihoodBadge`, `SeverityBadge`
- `EmptyState`, `LoadingDots`, `cx()` (class join)
- `Icon.*` — inline SVG icons (no external icon library)

New screens should compose these to stay visually consistent. Shared component
classes (`.card`, `.btn`, `.input`, `.chip`, `.label`) are defined in
`src/index.css` under `@layer components`.
