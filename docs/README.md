# Master Technician — Documentation

**Read [MASTER-TECHNICIAN-BIBLE.md](MASTER-TECHNICIAN-BIBLE.md) first** — it is the
north-star document for what the product is and how every decision is judged.

Documentation for the current build (v0.1.0).

| Doc | What it covers |
| --- | --- |
| [MASTER-TECHNICIAN-BIBLE.md](MASTER-TECHNICIAN-BIBLE.md) | **Canonical philosophy & law** — identity, "reduce searching time not screen time", the 10 principles |
| [vision.md](vision.md) | Purpose, philosophy, target users, what the app does and must NOT become |
| [current-features.md](current-features.md) | Every feature/screen built, the dummy AI behavior, localStorage persistence |
| [app-architecture.md](app-architecture.md) | Folder structure, services, `ai.ts` / `store.ts` / `types`, connecting real AI |
| [database-schema.md](database-schema.md) | All data models + future backend-ready schema |
| [ui-ux-guidelines.md](ui-ux-guidelines.md) | Core UX philosophy, the 10 UX principles, one-hand use, dark/light |
| [language-standard.md](language-standard.md) | **Permanent language rule** — Khmer prose, English technical component names / DTC codes / Live Data / tools embedded (never translated) |
| [diagnostic-framework.md](diagnostic-framework.md) | **How a Master Technician thinks** — the 15-step evidence-based diagnostic reasoning process, generic across all systems |
| [diagnostic-reasoning-engine.md](diagnostic-reasoning-engine.md) | **TASK 001 — the core reasoning engine spec**: input→reasoning→8-section output, evidence tiers, ranking, inspection priority, the reasoning loop |
| [interactive-diagnostic-test-flow.md](interactive-diagnostic-test-flow.md) | **TASK 003 — interactive test flow**: Test Nodes (10 fields), OK/Not OK/Unknown result inputs, likelihood updates, the decision tree + reasoning loop (P0093 example) |
| [universal-diagnostic-question-tree.md](universal-diagnostic-question-tree.md) | **TASK 004 — the questioning system**: system-based (not brand-based) question tree, entry router, 21 system question sets, global pruning rules, shared-cause checkpoints |
| [mvp-scope.md](mvp-scope.md) | **TASK 005 — V1 scope**: what's in/out, mandatory vs. postponed features, system coverage cut, V1 screens, the golden-path user journey |
| [decision-authority-model.md](decision-authority-model.md) | **TASK 006 — who has authority**: Rule Engine vs. AI vs. Mechanic responsibilities, the override rule, Verified Diagnosis gate, Learning Engine restrictions, the final authority flow — the mechanic is always the final authority |
| [ai-system.md](ai-system.md) | Placeholder AI + rules for future real AI |
| [roadmap.md](roadmap.md) | Phases 1–5 |
| [project-rules.md](project-rules.md) | Guardrails for changes and new features |
| [changelog.md](changelog.md) | Version history |
| [product-strategy/](product-strategy/) | Positioning, personas, workflow, feature vision, knowledge roadmap, success metrics, **design principles** |
| [ux-blueprint/](ux-blueprint/) | App map, user flows, screen specs, navigation system, information architecture, interaction principles |

> Golden rules: **reduce searching time, not screen time** (open → find in seconds →
> close → keep repairing); keep it **mobile-first & Khmer-first**; keep AI behind
> **`src/services/ai.ts`**; keep the app focused on **car diagnosis + technician
> knowledge only** — never garage management/POS, never engagement mechanics.
