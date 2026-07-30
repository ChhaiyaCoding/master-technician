# Design Principles — Master Technician

The canonical design law for Master Technician. Where a decision is ambiguous, this
document breaks the tie. It applies to product, UX, visual, and AI design alike.

## The one law

> **Deliver the right technical information at exactly the right moment, in the
> fewest seconds possible — then get out of the mechanic's way.**

Master Technician reduces **searching time**, not screen time. The mechanic's real
work is on the vehicle; the app is a reference instrument used in short bursts. The
whole design serves this loop:

> **Open → find in seconds → understand at a glance → close → keep repairing.**

**Minimal screen time. Maximum repair time.** Time in the app is a *cost*, never a
goal. We never optimize for engagement, session length, or return frequency.

## The governing question (apply to every feature and screen)

> **"Does this help the mechanic repair the vehicle faster and more accurately?"**

If **no** → redesign or remove it. No exceptions for "nice to have," "engaging," or
"sticky."

## The 10 UX principles

1. **Open quickly** — instant to a useful state; no splash/warm-up, no login wall
   for core reference.
2. **Find information quickly** — the answer is seconds away; search/shortcuts/
   defaults beat menus.
3. **Understand immediately** — scannable structure, clear hierarchy, plain Khmer;
   the key fact is visible without work.
4. **Return to vehicle repair** — every flow has a fast, obvious exit; nothing traps
   the user.
5. **Never require unnecessary interaction** — no step, tap, or confirmation that
   doesn't advance a decision.
6. **Every screen helps a repair decision faster** — if it doesn't, cut it.
7. **Information over conversation** — structured answers first; dialogue is a
   fallback.
8. **AI assists only when needed** — AI supports, never dominates; structured
   lookups lead.
9. **Reduce diagnostic time, not phone usage** — screen time is a cost to minimize.
10. **One test** — *"Does this help the mechanic repair faster and more accurately?"*
   No → redesign or remove.

## Design language (how the law becomes pixels)

- **Speed-first surfaces.** Default screens open on the most likely answer or the
  fastest path to it. Prefer a visible result over a screen that asks "what do you
  want?"
- **Glanceable hierarchy.** The single most decision-relevant item (top cause, next
  test, safety warning, DTC meaning) is largest and highest; supporting detail is
  demoted or collapsible.
- **Structured blocks, not paragraphs.** Ranked lists, steps, chips, badges, and
  cards — scannable in a second. Reserve prose for genuinely explanatory text.
- **One-hand, large targets.** Bottom-anchored primary actions; ≥56px buttons;
  chips/tiles usable with gloves. (See `ui-ux-guidelines.md`.)
- **High-contrast, shop-readable.** Dark-first; semantic color tokens only; color
  used to *mean* something (danger/warning/success), not to decorate.
- **Fast, cheap exit.** Back is always a large, obvious target. Leaving and
  returning costs nothing.
- **Calm, professional, silent.** No streaks, feeds, badges-for-returning, or
  attention notifications. The app is quiet until the mechanic needs it.
- **Latency honesty.** When AI or a slow lookup runs, show a clear, brief loading
  state and a way out; never make the tech wait without feedback.

## AI design stance

- AI is **one component**, not the product. Structured knowledge (DTC base, cases,
  reference layers) answers first; AI handles the open-ended and the gaps.
- AI must obey the rules in `../ai-system.md`: **do not guess**, ask follow-up
  questions when data is missing, **rank causes**, show **inspection steps**,
  **explain the evidence**, and always show **safety warnings**.
- AI output is shaped for **fast reading and a fast decision** — ranked, cited,
  scannable — so the tech can act and leave, not converse.

## Anti-patterns (explicitly forbidden)

- ❌ Designing for "daily active use," session length, or return frequency.
- ❌ Engagement mechanics: streaks, feeds, social loops, gamification,
  notifications whose purpose is to pull the tech back in.
- ❌ Conversation-as-default where a structured answer would be faster.
- ❌ Multi-step flows or confirmations that don't advance a repair decision.
- ❌ Hiding the key answer below the fold or behind extra taps.
- ❌ AI that talks a lot, hedges, or dominates the screen.

## How to use this document

- **In design review:** every screen mockup is checked against the governing
  question and the 10 principles before it's accepted.
- **In feature triage:** see the prioritization lens in
  `04-feature-vision.md` (which inherits this law).
- **In conflict:** this document and `vision.md` outrank convenience, precedent, and
  "it would be cool."
