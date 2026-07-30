# Database Schema — Master Technician

The canonical source is [`src/types/index.ts`](../src/types/index.ts). Today these
shapes are stored as JSON in `localStorage` and static dummy files, but they are
designed to map **1:1 onto real backend tables/endpoints** later.

## Enumerations

```ts
type SystemId =
  | "engine" | "abs" | "airbag" | "hybrid" | "ev" | "transmission"
  | "ac" | "electrical" | "suspension" | "brake" | "steering" | "body";

type TransmissionType = "AT" | "MT" | "CVT" | "DCT" | "EV";
type Severity   = "low" | "medium" | "high" | "critical";
type Likelihood = "high" | "medium" | "low";
type ThemeMode  = "light" | "dark" | "system";
```

## VehicleSystem (reference data — `data/systems.ts`)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `SystemId` | Stable key |
| `km` | `string` | Khmer label |
| `en` | `string` | English technical term |
| `icon` | `string` | Emoji/icon key |

## Vehicle (embedded value object)

Used inside diagnosis, repair cases, and expert threads. Free-text fields allow
unknown/older models.

| Field | Type | Notes |
| --- | --- | --- |
| `brand` | `string` | e.g. "Toyota" (required in most flows) |
| `model` | `string` | e.g. "Vios" |
| `year` | `number \| null` | |
| `engine` | `string` | e.g. "2NR-FE 1.5L" |
| `transmission` | `TransmissionType \| ""` | `""` = unset |
| `mileageKm` | `number \| null` | |

## DtcCode (knowledge base — `data/dtc.ts`)

| Field | Type | Notes |
| --- | --- | --- |
| `code` | `string` | e.g. "P0301" — primary key |
| `titleEn` | `string` | English title |
| `titleKm` | `string` | Khmer title |
| `systems` | `SystemId[]` | Related systems |
| `descriptionKm` | `string` | Meaning (Khmer) |
| `possibleCauses` | `string[]` | |
| `inspectionFlow` | `string[]` | Ordered checks |
| `commonMistakes` | `string[]` | |
| `severity` | `Severity` | |

Lookup: `DTC_BY_CODE` (uppercased map), `POPULAR_DTC` (string[]).

## PossibleCause (embedded)

| Field | Type | Notes |
| --- | --- | --- |
| `title` | `string` | The suspected cause |
| `likelihood` | `Likelihood` | Bucket for the badge |
| `confidence` | `number` | 0–100, drives the ranking bar |
| `reasoning` | `string` | Why this cause / what evidence |

## SymptomInput (workflow input — held in DiagnosisContext)

| Field | Type | Notes |
| --- | --- | --- |
| `system` | `SystemId \| null` | Selected system |
| `symptomText` | `string` | Free-text description |
| `dtcCodes` | `string[]` | Entered codes |
| `photos` | `PhotoRef[]` | Attached photos |
| `scanReport` | `string` | Scan-tool live data / freeze frame |

## PhotoRef (embedded)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | |
| `dataUrl` | `string` | `data:` URL (dummy storage) |
| `note` | `string` | Technician note for this photo |

> ⚠️ Storing photos as data URLs inside records is fine for the MVP but bloats
> localStorage. A real backend should store photos in object storage and keep only
> a URL/key here.

## DiagnosisResult (AI output — held in DiagnosisContext)

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | `uid("dx")` |
| `createdAt` | `number` | epoch ms |
| `vehicle` | `Vehicle` | |
| `system` | `SystemId` | |
| `symptomText` | `string` | |
| `dtcCodes` | `string[]` | |
| `possibleCauses` | `PossibleCause[]` | Ranked |
| `inspectionSteps` | `string[]` | |
| `toolsNeeded` | `string[]` | |
| `recommendedRepair` | `string` | |
| `safetyNotes` | `string[]` | |

Not persisted on its own today — it is either consumed by the result screen or
copied into a `RepairCase` when saved.

## RepairCase (persisted — `mt.cases.v1`)

The core saved record.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | `uid("case")` — primary key |
| `createdAt` | `number` | epoch ms |
| `updatedAt` | `number` | epoch ms (list sort key) |
| `vehicle` | `Vehicle` | |
| `system` | `SystemId` | |
| `symptomText` | `string` | |
| `dtcCodes` | `string[]` | |
| `rootCause` | `string` | What it actually was |
| `repairPerformed` | `string` | What was done |
| `partsReplaced` | `string[]` | |
| `technicianNote` | `string` | Free notes / tips |
| `photos` | `PhotoRef[]` | |
| `tags` | `string[]` | Free tags for search |

## Ask Expert: ChatMessage & ExpertThread

`ChatMessage`:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | |
| `role` | `"tech" \| "expert"` | |
| `text` | `string` | |
| `createdAt` | `number` | |
| `followUps?` | `string[]` | Structured follow-up questions from the expert |

`ExpertThread` (`mt.threads.v1`, store exists; screen not yet wired):

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | |
| `createdAt` | `number` | |
| `title` | `string` | |
| `vehicle` | `Vehicle \| null` | |
| `messages` | `ChatMessage[]` | |

## Similar Cases (derived, not stored)

Not a table — computed on demand by `caseStore.similar(case, limit)`:

```
score = (shared DTC code ? +3 : 0)
      + (same system     ? +2 : 0)
      + (same brand      ? +1 : 0)
      + (same model      ? +1 : 0)
```

Cases with `score > 0` are sorted descending and the top `limit` (default 3) are
returned. A real backend would likely replace this with vector similarity over
symptom/cause text plus structured filters.

## Future backend-ready schema

When moving off localStorage, a straightforward relational mapping:

```
technicians (id, name, …)                         -- new: auth/ownership
vehicles     -- usually embedded; can be normalized if reused
dtc_codes    (code PK, title_en, title_km, systems[], description_km,
              possible_causes[], inspection_flow[], common_mistakes[], severity)
repair_cases (id PK, technician_id FK, vehicle JSONB, system, symptom_text,
              dtc_codes[], root_cause, repair_performed, parts_replaced[],
              technician_note, tags[], created_at, updated_at)
case_photos  (id PK, case_id FK, storage_key/url, note)   -- photos → object storage
expert_threads (id PK, technician_id FK, title, vehicle JSONB, created_at)
expert_messages (id PK, thread_id FK, role, text, follow_ups[], created_at)
diagnoses    (id PK, technician_id FK, vehicle JSONB, system, symptom_text,
              dtc_codes[], result JSONB, created_at)      -- optional audit/history
```

Notes for the migration:
- Keep `Vehicle` as an embedded JSON value unless it needs to be shared/queried.
- Add `technician_id` (ownership) to every user-owned table for multi-device sync
  (roadmap Phase 4).
- Version the API/storage (the `.v1` key suffix is already a habit toward this).
- Preserve the exact field names so `store.ts` remains the only file that changes.
