# Changelog — Master Technician

All notable changes to this project are documented here.
Format is loosely based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — Documentation / product philosophy

Docs-only change. **No code changed.**

### Changed — product philosophy revision
- Reframed the product from an "always-open daily companion" to an **instant
  professional-reference tool**: *open → find in seconds → close → keep repairing.*
- New guiding principle across all strategy/design docs:
  **reduce searching time, not screen time** (minimal screen time, maximum repair
  time). Time in the app is now treated as a cost to minimize.
- Established the governing question for every feature/screen: *"Does this help the
  mechanic repair the vehicle faster and more accurately?"*
- Updated `vision.md`, `product-strategy/01-product-positioning.md`,
  `03-mechanic-workflow.md`, `04-feature-vision.md`, `ui-ux-guidelines.md`,
  `02-user-personas.md`, `05-knowledge-roadmap.md`, `06-success-metrics.md`,
  `ai-system.md`, `project-rules.md`, and both README indexes.
- Rewrote `06-success-metrics.md` to stop rewarding screen time: added the inverted
  **time-to-information** metric, reframed engagement as **trust & usefulness**, and
  added guardrails against session-length growth and engagement mechanics.

### Added
- **`MASTER-TECHNICIAN-BIBLE.md`** — canonical north-star philosophy document.
- **`product-strategy/design-principles.md`** — the design law + the 10 UX
  principles + design language and anti-patterns.

## [0.1.0] — 2026-07-04

Initial build. A complete, working **UI + workflow + data model** with placeholder
AI and localStorage persistence. No real AI and no backend yet — the architecture
is prepared for both.

### Added

**Project & tooling**
- Vite + React 18 + TypeScript project.
- Tailwind CSS 3 with CSS-variable theme tokens (dark + light).
- React Router 6 routing; `@/` → `src/` path alias.
- Production build passes (`npm run build`).

**Screens**
- **Home** (`/`) — primary Diagnose CTA, action grid (DTC, Cases, Photo, Expert),
  recent cases, theme toggle.
- **Diagnosis workflow** — Vehicle selection (`/diagnose/vehicle`), Symptom input
  (`/diagnose/symptom`), Diagnosis result (`/diagnose/result`) with ranked causes,
  inspection steps, tools, recommended repair, and safety notes.
- **DTC search** (`/dtc`) — meaning, related systems, causes, inspection flow,
  common mistakes; popular codes; deep-link via `?code=`; "use in diagnosis".
- **Repair Case Library** — list/search (`/cases`), detail with similar cases
  (`/cases/:id`), create/edit (`/cases/new`, `/cases/:id/edit`), delete; save a
  case prefilled from a diagnosis.
- **Photo Diagnosis** (`/photo`) — attach photos + notes, placeholder analysis.
- **Ask Expert** (`/expert`) — chat with structured follow-up question chips and
  quick-start prompts.
- **Settings** (`/settings`) — Light/Dark/System theme, clear all cases, about.

**Architecture**
- `services/ai.ts` — `AiProvider` interface + `PlaceholderAiProvider` (deterministic
  dummy diagnosis, photo analysis, and expert replies). Single swap point for real AI.
- `services/store.ts` — localStorage repositories (`caseStore`, `threadStore`,
  `themeStore`) + `uid()`, mirroring a backend repository API; first-run seed of
  3 example cases.
- `types/index.ts` — full domain model / database schema.
- `data/` — 12 vehicle systems, curated brands/models/engines, a 12-entry DTC
  knowledge base (P/C/B/U codes incl. HV & SRS), and seed cases.
- `context/` — ThemeContext and DiagnosisContext (workflow session state).
- `components/` — Layout (TopBar/BottomNav/Page/StickyBar/StepDots), inline SVG
  Icon set, and UI primitives.
- `i18n/strings.ts` — Khmer-first string catalog.

**UX**
- Mobile-first, one-hand layout; large bottom-anchored actions; bottom tab bar on
  tab roots only; safe-area handling; dark mode default.
- Automatic HV (Hybrid/EV) and SRS/Airbag safety warnings in diagnosis output.

### Known limitations
- AI is placeholder only (no real model, no real image analysis).
- Ask Expert messages are in-memory (not yet persisted via `threadStore`).
- Photos are stored as data URLs in localStorage (quota risk).
- No accounts, no cloud sync, single-device only.

### Docs
- Added `/docs`: vision, current-features, app-architecture, database-schema,
  ui-ux-guidelines, ai-system, roadmap, project-rules, changelog.
