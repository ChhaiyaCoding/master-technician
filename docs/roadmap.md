# Roadmap — Master Technician

Phased plan. Each phase should ship independently and never violate
[project-rules.md](project-rules.md) or [vision.md](vision.md).

## Phase 1 — Stabilize the current MVP  ⬅️ we are here

Goal: make what exists solid and trustworthy before adding anything.

- Wire the **Ask Expert** screen to `threadStore` so conversations persist.
- Add basic **error/empty/edge-state handling** around `ai.*` calls (failure,
  slow network) beyond the current happy path.
- Guard **localStorage limits** (photos as data URLs can overflow quota) — warn or
  down-scale images before saving.
- Add lightweight **tests** for `store.ts` (search/similar) and the diagnosis
  workflow guard rails.
- Polish accessibility (focus order, labels) and Khmer copy review.
- Confirm reload/deep-link behavior for every route.

Exit criteria: no data-loss surprises, no dead ends, all current features robust.

## Phase 2 — Improve UI/UX and repair-case workflow

Goal: make the mechanic's day-to-day faster and cases more useful.

- Faster case capture: save straight from a diagnosis with fewer taps; templates.
- Better **search & filter** (by system, brand, DTC, date) and sorting.
- Improve **similar cases** (rank by symptom/cause text overlap, not just DTC).
- Photo UX: multiple photos, captions, zoom, image compression.
- Case sharing/export (e.g. share a case as text/PDF) — read-only, still no billing.
- Small workflow refinements from real technician feedback.

## Phase 3 — Connect real AI

Goal: replace `PlaceholderAiProvider` with a real model, obeying
[ai-system.md](ai-system.md).

- Implement a real `AiProvider` (e.g. `ClaudeAiProvider`) behind a **server-side
  proxy**; swap the single export in `services/ai.ts`.
- Enforce the AI rules: no guessing, ask follow-ups, rank causes, ordered
  inspection steps, evidence, mandatory safety warnings.
- Ground the model with the DTC knowledge base and the tech's saved cases
  (retrieval) for accuracy.
- Real **photo/vision** analysis in Photo Diagnosis.
- Structured-output validation and confidence calibration.

## Phase 4 — Cloud sync and multi-device

Goal: cases follow the technician across devices; nothing lost on browser wipe.

- Introduce a **backend** by reimplementing the repositories in `store.ts`
  (same API surface) against a real database/API.
- Accounts / **auth** and per-technician ownership (`technician_id`).
- **Sync** with offline-first behavior and conflict handling.
- Move photos to **object storage** (keep only URLs in records).
- Migrate the `.v1` local data to the backend on first login.

## Phase 5 — Professional knowledge base

Goal: deepen the technician-knowledge value.

- Expand the DTC database (broader coverage, manufacturer-specific notes).
- Curated inspection procedures, wiring references, torque/spec lookups.
- Optional shared/community case library (moderated), still diagnosis-only.
- Smarter retrieval across knowledge base + cases to power AI answers.

---

### Explicitly out of scope (any phase)

Garage management, invoicing/quotes, customer payments/POS, inventory/stock, and
customer-facing booking. These are non-goals by design — see
[vision.md](vision.md).
