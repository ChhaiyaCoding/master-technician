# Project Rules — Master Technician

Guardrails for anyone (human or AI) working on this codebase. These protect the
product's purpose and keep the code maintainable.

## 0. Honor the product philosophy — reduce searching time, not screen time
- Master Technician delivers the right technical information at the right moment,
  then gets out of the way: **open → find in seconds → close → keep repairing.**
- **Time in the app is a cost to minimize, not a metric to grow.** Never add
  engagement mechanics (streaks, feeds, return-nudging notifications, gamified
  daily use). No feature may be justified by "it increases usage/retention."
- Every feature and screen must pass the governing question:
  **"Does this help the mechanic repair the vehicle faster and more accurately?"**
  If no → redesign or remove.
- Prefer **information over conversation**; AI **assists only when needed** and must
  not dominate the flow.
- The canonical statements of this are
  [MASTER-TECHNICIAN-BIBLE.md](MASTER-TECHNICIAN-BIBLE.md) and
  [product-strategy/design-principles.md](product-strategy/design-principles.md).

## 1. Do not remove working features without confirmation
- Never delete or disable an existing, working feature/screen as a side effect of
  another change. If a change requires removing something, **stop and confirm first**.
- Preserve current routes and the public shapes in `src/types` unless a change is
  explicitly approved (other code and the future backend depend on them).

## 2. Do not redesign the whole app without approval
- Incremental, scoped changes only. No wholesale visual or architectural rewrites
  without sign-off.
- Reuse existing building blocks (`components/ui.tsx`, `components/Layout.tsx`)
  rather than introducing parallel patterns.

## 3. Keep it mobile-first
- Every screen must follow [ui-ux-guidelines.md](ui-ux-guidelines.md): phone-width,
  one-hand use, large bottom-anchored actions, both themes via CSS-variable tokens.
- No desktop-only layouts. No hard-coded colors — use semantic tokens so dark/light
  both work.

## 4. Keep the code modular
- Respect the layering: **screens → services → data/types**. Screens don't talk to
  storage backends or models directly.
- One screen per file in `src/screens`. Shared UI in `components`. Domain types in
  `src/types`. Static data in `src/data`. Formatting/helpers in `src/utils`.
- All user-facing copy goes in `src/i18n/strings.ts` (Khmer-first).
- **All user-facing text — including engine-generated guidance/warnings — follows the
  permanent [language-standard.md](language-standard.md):** Khmer prose with English
  technical component names, DTC codes, Live Data parameters, and tools embedded
  inline (never translated).

## 5. Keep AI separated through `src/services/ai.ts`
- All AI access goes through the `AiProvider` interface. **No screen or component
  may call a model or AI SDK directly.**
- To change AI behavior/provider, implement `AiProvider` and swap the single export
  in `ai.ts`. Never scatter AI calls across the UI.
- Real AI must obey the rules in [ai-system.md](ai-system.md) (no guessing, ask
  follow-ups, rank causes, inspection steps, evidence, safety warnings).
- Never embed API keys in the client — real AI goes through a server-side proxy.

## 6. Keep persistence behind `src/services/store.ts`
- All reads/writes go through the store repositories. Don't touch `localStorage`
  (or a future API) directly from screens.
- Preserve the repository API (`list/get/save/remove/search/similar`) and versioned
  keys (`*.v1`) so the backend migration stays a one-file change.

## 7. Every new feature must match the app purpose
- Master Technician is **car diagnosis + technician knowledge only**.
- ❌ No garage management, invoicing, quotes, customer payments, POS, inventory, or
  customer-facing features. If a feature doesn't help a technician diagnose or
  recall a repair, it does not belong here (see [vision.md](vision.md)).

## 8. Housekeeping
- Keep the build green: `npm run build` (type-check + Vite) must pass before done.
- Update the docs when behavior changes; add a [changelog.md](changelog.md) entry
  each version.
- Match the surrounding code style; keep changes small and reviewable.
