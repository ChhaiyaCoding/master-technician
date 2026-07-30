# App Architecture — Master Technician

## Stack

- **React 18 + TypeScript**, built with **Vite 5**.
- **Tailwind CSS 3** with CSS-variable theme tokens (dark + light).
- **React Router 6** for navigation.
- **No backend** — state persists in `localStorage`.
- Path alias `@/` → `src/` (configured in both `tsconfig.json` and
  `vite.config.ts`).

## Folder structure

```
Master Technician/
├── index.html                 App shell, fonts (Noto Sans Khmer), meta/theme-color
├── vite.config.ts             Vite + React plugin + "@/" alias
├── tailwind.config.js         Theme tokens mapped to CSS variables, fonts, animations
├── postcss.config.js
├── tsconfig.json
├── docs/                      ← this documentation
└── src/
    ├── main.tsx               Entry: mounts providers + Router + App
    ├── App.tsx                Route table + <BottomNav/>
    ├── index.css              Tailwind layers + :root / .dark theme variables + component classes
    ├── vite-env.d.ts
    │
    ├── types/index.ts         Domain model — the "database schema" (see database-schema.md)
    │
    ├── data/                  Static dummy data
    │   ├── systems.ts         The 12 vehicle systems (id, km, en, icon)
    │   ├── vehicles.ts        Brands/models/engines, transmissions, year range
    │   ├── dtc.ts             DTC knowledge base + lookup map + popular codes
    │   └── seedCases.ts       3 example repair cases (first-run seed)
    │
    ├── services/              App logic — the swap points for a real backend
    │   ├── ai.ts              AI abstraction layer + PlaceholderAiProvider
    │   └── store.ts           localStorage repositories + uid()
    │
    ├── context/               React context providers
    │   ├── ThemeContext.tsx   Theme mode, resolves "system", toggles .dark class
    │   └── DiagnosisContext.tsx  In-progress vehicle → symptom → result session
    │
    ├── components/            Reusable UI
    │   ├── Layout.tsx         TopBar, BottomNav, Page scaffold
    │   ├── Icon.tsx           Inline SVG icon set (no icon library dependency)
    │   └── ui.tsx             Button, Card, SectionTitle, ConfidenceBar, badges, Field, EmptyState, LoadingDots, cx()
    │
    ├── screens/               One file per screen (see current-features.md)
    │   ├── Home.tsx
    │   ├── VehicleSelect.tsx  (also exports StepDots, StickyBar helpers)
    │   ├── SymptomInput.tsx
    │   ├── DiagnosisResult.tsx
    │   ├── DtcSearch.tsx      (also exports DtcDetail)
    │   ├── CaseLibrary.tsx
    │   ├── CaseDetail.tsx
    │   ├── CaseForm.tsx
    │   ├── PhotoDiagnosis.tsx
    │   ├── AskExpert.tsx
    │   └── Settings.tsx
    │
    ├── i18n/strings.ts        Khmer-first string catalog
    └── utils/
        ├── format.ts          relTime, formatKm, formatDate
        └── file.ts            readFileAsDataUrl
```

## Data flow

```
Screens ──▶ services/ai.ts  (AiProvider)      ──▶ (today) PlaceholderAiProvider
        └─▶ services/store.ts (caseStore, …)   ──▶ (today) localStorage

Workflow session state ──▶ context/DiagnosisContext
Theme state            ──▶ context/ThemeContext
```

Screens never talk to AI or storage backends directly — they go through the two
service modules. This is the seam that lets us change backends without touching UI.

## Services

The `src/services/` folder is the boundary between the UI and "where data/answers
come from". There are two services.

### `src/services/ai.ts` — AI abstraction layer

The **only** way the app obtains AI answers. It defines a single interface and
ships a placeholder implementation.

```ts
export interface AiProvider {
  diagnose(req: DiagnoseRequest): Promise<DiagnosisResult>;
  analyzePhotos(notes: string[]): Promise<PhotoAnalysis>;
  askExpert(
    conversation: { role: "tech" | "expert"; text: string }[],
    vehicle: Vehicle | null,
  ): Promise<ExpertReply>;
}

export const ai: AiProvider = new PlaceholderAiProvider();
```

- **`DiagnoseRequest`** = `{ vehicle, input }` where `input` is the `SymptomInput`.
- **`PhotoAnalysis`** = `{ observations, possibleCauses, nextSteps }`.
- **`ExpertReply`** = `{ text, followUps }`.
- **`PlaceholderAiProvider`** builds deterministic output (DTC matches + keyword
  heuristics), simulates network latency with `delay()`, and never uses a real
  model. Private helpers: `buildCauses`, `buildInspection`, `buildTools`,
  `buildSafety`, plus `likelihoodFromConfidence`.

Every screen imports `{ ai }` from this file. **To connect real AI, only the
final `export const ai = …` line changes** (see below).

### `src/services/store.ts` — persistence layer

localStorage repositories whose API mirrors a real backend repository, plus a
`uid()` id generator (also used by `ai.ts` for result ids).

- **`caseStore`** — `list()`, `get(id)`, `save(case)`, `remove(id)`,
  `clearAll()`, `search(query)`, `similar(case, limit)`. Seeds `SEED_CASES` on
  first run (guarded by `mt.seeded.v1`).
- **`threadStore`** — `list()`, `get(id)`, `save(thread)` for expert threads.
- **`themeStore`** — `get()` / `set(mode)`.
- Internal `read`/`write` helpers wrap `JSON.parse`/`stringify` with try/catch.

`search()` is a term-AND substring match across all meaningful fields;
`similar()` is a naive score (shared DTC +3, same system +2, brand/model +1 each).

### `src/types/index.ts` — domain model

The shared TypeScript types used by data, services, context, and screens. It is
the single source of truth for the app's "database structure": `SystemId`,
`VehicleSystem`, `Vehicle`, `TransmissionType`, `DtcCode`, `Severity`,
`Likelihood`, `PossibleCause`, `DiagnosisResult`, `SymptomInput`, `PhotoRef`,
`RepairCase`, `ChatMessage`, `ExpertThread`, `ThemeMode`. Full field-level docs
are in [database-schema.md](database-schema.md).

## How real AI can be connected later

The architecture is intentionally set up so this is a **small, localized change**:

1. **Create a provider** — e.g. `src/services/claudeAiProvider.ts` implementing
   `AiProvider`. It calls the Claude API **through a server-side proxy** (never
   embed an API key in the client). It maps model output onto the existing
   `DiagnosisResult` / `PhotoAnalysis` / `ExpertReply` shapes.
2. **Swap the export** — change the last line of `ai.ts`:
   ```ts
   export const ai: AiProvider = new ClaudeAiProvider(config);
   ```
   (Optionally select by env var to keep the placeholder for offline/dev.)
3. **No screen changes** — every screen already awaits `ai.diagnose()`,
   `ai.analyzePhotos()`, `ai.askExpert()`; loading and error states exist.

The **same pattern applies to the backend**: reimplement the repositories in
`store.ts` (identical `list/get/save/remove/search/similar` surface) to call a
network API instead of localStorage, and the screens are unaffected. Because the
types in `src/types` map 1:1 onto backend tables/endpoints, the migration is
mechanical. See [database-schema.md](database-schema.md) and [roadmap.md](roadmap.md).
