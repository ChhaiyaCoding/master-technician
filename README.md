# Master Technician

កម្មវិធីជំនួយវិនិច្ឆ័យសម្រាប់ជាងម៉ាស៊ីនរថយន្តអាជីព — a **mobile-first, Khmer-first
diagnostic assistant for professional automotive technicians**.

This is a diagnosis + technician-knowledge tool. It is **not** a garage
management system: there are no sales, invoices, customer payments, stock, or
POS features by design.

> AI responses and part of the data are **placeholders / dummy data** for now.
> The UI, workflow, and data model are complete, and the architecture is set up
> so real AI can be connected later without touching the screens.

## Features / Screens

| Screen | Route | Purpose |
| --- | --- | --- |
| Home | `/` | Entry points: Diagnose, DTC search, Case library, Photo, Ask Expert |
| Vehicle selection | `/diagnose/vehicle` | Brand · Model · Year · Engine · Transmission · Mileage |
| Symptom input | `/diagnose/symptom` | System picker · describe · DTC · photos · scan report |
| Diagnosis result | `/diagnose/result` | Ranked causes · inspection steps · tools · repair · safety notes |
| DTC search | `/dtc` | Meaning · related systems · causes · inspection flow · common mistakes |
| Case library | `/cases` | Save & search real repair cases; "similar cases" |
| Case detail / form | `/cases/:id`, `/cases/new` | View / create / edit a repair case |
| Photo diagnosis | `/photo` | Attach photos + notes → placeholder image analysis |
| Ask Expert | `/expert` | Chat that asks structured follow-up questions when info is missing |
| Settings | `/settings` | Light / Dark / System theme · data management |

## Tech stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS** with CSS-variable theme tokens (full dark + light mode)
- **React Router** for navigation
- No backend — data persists in **localStorage**

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Architecture

```
src/
├── types/            Domain model — the "database structure" (Vehicle, DtcCode,
│                     DiagnosisResult, RepairCase, ExpertThread, …)
├── data/             Dummy data: systems, vehicles, DTC knowledge base, seed cases
├── services/
│   ├── ai.ts         AI abstraction layer — see "Connecting real AI" below
│   └── store.ts      localStorage repositories (cases, threads, theme) — mirrors
│                     a real backend repository API (list/get/save/remove/search)
├── context/          ThemeContext, DiagnosisContext (workflow session state)
├── components/       Layout (TopBar, BottomNav, Page), Icon, ui primitives
├── screens/          One file per screen above
├── i18n/strings.ts   Khmer-first string catalog (English technical terms inline)
└── utils/            formatting + file helpers
```

### Connecting real AI later

The entire app talks to AI **only** through the `AiProvider` interface in
[`src/services/ai.ts`](src/services/ai.ts):

```ts
export interface AiProvider {
  diagnose(req: DiagnoseRequest): Promise<DiagnosisResult>;
  analyzePhotos(notes: string[]): Promise<PhotoAnalysis>;
  askExpert(conversation, vehicle): Promise<ExpertReply>;
}
```

Today the export is `new PlaceholderAiProvider()`. To go live:

1. Implement `AiProvider` in a new file that calls the Claude API through a
   **server-side proxy** (never ship an API key in the client).
2. Change the single export line at the bottom of `ai.ts`.

No screen or component needs to change — they all import `ai` from that module.

### Data model → real backend

The types in `src/types` map 1:1 onto backend tables/endpoints. When a real API
is added, reimplement the repositories in `src/services/store.ts` (same
`list/get/save/remove/search/similar` surface) to call the network instead of
localStorage; screens are unaffected.

## Design notes

- **One-hand use:** primary actions are large, bottom-anchored; a thumb-reach
  bottom tab bar drives top-level navigation.
- **Khmer-first:** all UI copy is Khmer, with English technical terms (DTC, ABS,
  OBD-II, scan tool, fuel trim, …) kept inline where they are the professional norm.
- **Safety-aware:** HV (Hybrid/EV) and SRS/Airbag flows surface isolation and
  discharge warnings automatically.
```
