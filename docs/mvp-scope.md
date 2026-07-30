# MVP Scope — Master Technician V1 (TASK 005, revised)

One concise specification, decided before any implementation. It defines what V1
actually builds from everything designed so far ([diagnostic-framework.md](diagnostic-framework.md),
[diagnostic-reasoning-engine.md](diagnostic-reasoning-engine.md),
[interactive-diagnostic-test-flow.md](interactive-diagnostic-test-flow.md),
[universal-diagnostic-question-tree.md](universal-diagnostic-question-tree.md)).

**The one-line goal of V1:** let a mechanic go from *"I don't know what's wrong"* to a
**proven root cause and a saved case**, guided one evidence-based step at a time —
nothing else.

> **Revision note:** this version replaces three prior assumptions with new
> architecture decisions — (1) all vehicle systems are supported from V1 at varying
> depth, never "unsupported," (2) the reasoning architecture is **hybrid** (rule
> engine + AI), not rule-only, (3) input is built around four ranked methods with
> typing always last. No new features were added; existing scope was reshaped around
> these decisions.

---

## Architecture decisions superseding prior assumptions

### A. System coverage — universal, graduated depth

Master Technician supports **all vehicle systems from V1.** No system is ever
presented as unsupported. What varies is **diagnostic depth**, not availability:

- **High-frequency systems** — Engine, Fuel, Ignition, Electrical, Charging,
  Starting, ABS, Brake — receive the **deepest guided diagnosis**: full
  question-tree routing and the complete interactive test-node loop.
- **All other systems** — Transmission, Cooling, Air Intake, Exhaust, Steering,
  Suspension, CAN Communication, Airbag, Body Control, Air Conditioning, Hybrid, EV
  High Voltage, ADAS — are **fully present in V1** with, initially, **fewer guided
  steps**. They always provide: DTC interpretation, safety guidance, component
  reference information, and structured reasoning (ranked causes from whatever
  evidence is available) — even where the step-by-step test sequence is shorter.
- **Safety guidance is never reduced by tier.** A shallower guided sequence never
  means a shallower safety warning — HV (Hybrid/EV) and SRS/Airbag warnings are always
  complete, regardless of how many guided steps exist for that system yet.

See §5 for the concrete depth table.

### B. Hybrid reasoning architecture

The reasoning system is **hybrid**, not rule-only:

| Responsibility | Owner |
| --- | --- |
| Safety gating (HV/SRS warnings, prerequisites) | **Rule Engine** |
| Question flow / entry routing (`universal-diagnostic-question-tree.md`) | **Rule Engine** |
| Decision tree (which branch an answer leads to) | **Rule Engine** |
| Test sequencing (which test is highest-value next) | **Rule Engine** |
| Diagnostic workflow state (evidence log, hypothesis ranking mechanics) | **Rule Engine** |
| **Explaining why** a cause fits, in natural language | **AI** |
| **Interpreting evidence** — ambiguous, partial, or free-text input | **AI** |
| **Handling incomplete information** — filling gaps in the *explanation*, never in the *decision* | **AI** |
| **Comparing verified cases** — surfacing and explaining why a past case is similar | **AI** |
| **Summarizing reasoning** — the plain-language recap of the current diagnostic state | **AI** |

The Rule Engine **owns every decision that must be safe, consistent, and auditable**:
it never lets the AI skip a safety gate, reorder the test sequence, or fabricate a
ranking. The AI **owns everything that benefits from language and nuance**: it
explains, interprets, compares, and summarizes — it does not decide.

This split is **part of V1's architecture from the start**, not a future upgrade.
What may evolve over time is the *sophistication* of the AI layer (e.g., simple
templated explanations today, richer generated reasoning later) — the **seam and the
division of responsibility do not change**. Both layers sit behind the existing
`services/ai.ts` boundary (`app-architecture.md`); screens still only ever call `ai.*`
— internally, that call is now answered by a Rule Engine component plus an AI-assist
component working together, not by either one alone. This does not contradict
`ai-system.md`'s rules — it operationalizes them: the rule engine enforces "never
guess / always rank / always gate safety," while the AI fulfills "explain the
evidence" and "assist only when needed."

### C. Input strategy — typing is always the last resort

Every input surface in V1 (vehicle details, symptom entry, test results, case notes)
offers input methods in this priority order:

1. **Quick Selection (default)** — chips, buttons, pickers, icon grids. Brand/model
   chips, system icons, OK/Not OK/Unknown, question-tree answer options. This is the
   primary and expected way to answer almost everything.
2. **Measured Values** — a structured numeric entry when a test's result is an actual
   reading (voltage, resistance, pressure, temperature) rather than a verdict. The
   mechanic enters the number; the system compares it to the known-good spec and
   derives OK/Not OK automatically — one less decision for the mechanic to make.
3. **Voice / Photo** — voice-to-text for filling a description or note field
   hands-free, and photo capture as attached evidence (a symptom, a warning light, a
   gauge). Both are alternate **capture** methods for existing fields — they reduce
   typing, they do not introduce a new screen or a dedicated analysis feature (see
   §4 for the boundary between "photo as evidence" and "AI photo analysis").
4. **Manual Text (fallback only)** — free typing exists everywhere as an escape
   hatch (an unlisted brand, an unusual note), but it is never the default and never
   required for the golden path.

This formalizes and extends the "minimal typing" rule already in
`ui-ux-guidelines.md`; it does not add a new screen or feature — it defines the
priority order for every input the app already collects.

---

## 1. What is included in V1

- **Guided diagnostic session** — vehicle → symptom/DTC entry (question-tree entry
  router, universal across all systems) → ranked possible causes with visible
  evidence/confidence → **one** highest-value test at a time (Senior Technician
  View) → result entry via the input-priority order above → updated ranking →
  repeat → **Confirmed** root cause → repair + verification step.
- **All 21 systems selectable and diagnosable**, at the depth defined in §5 — never
  presented as unavailable.
- **Hybrid reasoning**: the Rule Engine drives safety, question flow, decision tree,
  and test sequencing; the AI layer explains why, interprets evidence, handles
  incomplete information, compares verified cases, and summarizes reasoning.
- **DTC Search** — standalone lookup (meaning, systems, causes, inspection flow,
  common mistakes), usable with or without an active diagnosis session, for **every**
  system.
- **Repair Case Library** — save the confirmed diagnosis as a case; search, view,
  edit, delete; **Similar Cases** surfaced by shared DTC/system/brand, with an
  AI-generated explanation of *why* a case is similar.
- **Diagnostic Report** — secondary, on-demand snapshot of the current session's full
  reasoning state (the 8-section output, including the AI's plain-language summary),
  reachable from the guided session at any time.
- **Safety warnings** — HV (Hybrid/EV) and SRS/Airbag warnings, always shown in full
  when applicable, regardless of guided-step depth for that system.
- **Four-tier input strategy** — quick selection, measured values, voice/photo
  capture, manual text fallback — applied everywhere the app collects input.
- **Photo and voice capture** as evidence/notes within symptom entry and test results
  (captured and shown to the AI-assist layer for interpretation; no dedicated
  computer-vision analysis screen — see §4).
- **Local persistence** (no backend) — cases, theme, and the in-progress session
  survive navigation and app reopen.
- **Dark/light theme, mobile-first one-hand UI**, Khmer-first copy.

## 2. What is excluded from V1

**Permanent non-goals (never planned, any phase)** — per `vision.md` /
`project-rules.md`:
- Community, Marketplace, Social features, User profiles, Analytics dashboards,
  Gamification.
- Garage management, invoicing/quotes, payments/POS, inventory/stock, customer-facing
  booking.

**Postponed (planned for a later phase, not V1)** — see §4 for the full list and
reasoning: Ask Expert chat as a standalone free-form surface, dedicated
computer-vision photo analysis, full guided-step parity across all systems, AI
authority over decisions the Rule Engine owns, hands-free voice app control, cloud
sync/accounts, deeper knowledge layers (procedures, wiring, torque specs, TSBs,
known-failures).

## 3. Mandatory features

| Feature | Why it's mandatory |
| --- | --- |
| Vehicle identification (brand, model, year required; engine/transmission optional) | Scopes every downstream question and cause. |
| **All 21 systems available for selection**, each with at least DTC interpretation, safety guidance, and structured reasoning | No system may ever feel unsupported — a core product promise. |
| Question-tree entry router (system selection + Q1), universal across systems | Prevents irrelevant questions from turn one. |
| DTC-first shortcut (skip router when a code is known) | Fastest possible path; must always be preferred when available. |
| **Hybrid reasoning split** — Rule Engine owns safety/question-flow/decision-tree/test-sequencing; AI owns why-explanations/evidence interpretation/incomplete-info handling/case comparison/summarization | The architectural core of the product — not optional, not deferred. |
| Ranked possible causes, each with confidence **and** stated evidence | Never guess, never hide uncertainty — non-negotiable per `ai-system.md`. |
| **One** highest-value test/question at a time (Senior Technician View) | The core interaction model; overwhelming the mechanic breaks the product. |
| Result entry via Quick Selection → Measured Values → Voice/Photo → Manual Text (in that priority) | Minimizes typing at every step; typing is always the last resort. |
| Unknown handling: why it matters + how to perform + one alternative | The flow must never dead-end for lack of a tool. |
| Safety gate (HV/SRS) shown in full before any hazardous step, on every system, regardless of guided-step depth | Non-negotiable regardless of feature or content scope. |
| Repair recommendation **only** after a Confirmed root cause, with verification | Enforces "no parts cannon" structurally — the Rule Engine's to enforce, never the AI's to override. |
| Save as Repair Case (prefilled) + search + Similar Cases (with AI-explained similarity) | The knowledge flywheel — the long-term moat starts here. |
| DTC Search as a standalone tool, for every system | High-value, low-cost, already proven useful; a daily-use lookup. |
| Local persistence, dark/light theme, one-hand mobile UI | Baseline product quality; already largely built. |

## 4. Postponed features (with reasoning)

| Feature | Why postponed | Target |
| --- | --- | --- |
| **Ask Expert (standalone free-form chat)** | Redundant with the guided loop for V1: the question tree's follow-ups, the test flow's "Unknown" handling, and the AI's evidence-interpretation role already cover "ask/explain when information is missing." A separate open-ended chat risks pulling the product back toward "AI chatbot" positioning, which `vision.md` explicitly rejects. | Reconsider post-V1 as a narrow fallback for genuinely unstructured cases. |
| **AI authority over decisions the Rule Engine owns** (ranking mechanics, test sequencing, safety gating) | The hybrid split (§B) is deliberate: the AI explains and interprets, it never decides what's safe, what's next, or how confident to be. This boundary is permanent, not a V1 limitation. | Not planned — this is a permanent architectural boundary, not a postponement. |
| **Dedicated computer-vision photo analysis** (a screen whose output is "here's what's wrong with this part in the photo") | No real vision model integrated yet; claiming that capability without it would violate the no-guessing rule. Photo **capture as evidence**, viewable and referenced by the AI-assist layer alongside other evidence, is in V1 (§C). | Later, alongside deeper AI capability growth. |
| **Hands-free voice app control** (navigating screens, triggering actions by voice command) | Distinct from voice-to-text field capture (which **is** in V1, §C) — controlling the app by voice is a larger, separate capability not required to prove the core loop. | Post-V1. |
| **Full guided-step parity across all systems** | All systems are supported from V1 (§A) — but building the *deepest* question-tree + test-node content for all 21 systems simultaneously is not required to prove the loop, and would be feature-creep in content-authoring effort. Depth still exists for every system today (DTC + safety + structured reasoning); it grows over time. | Expand guided-step depth system-by-system in V1.x, prioritized by real shop usage. |
| **Cloud sync / accounts / multi-device** | Local-only is sufficient to validate the reasoning loop; sync is a real infra investment. | Phase 4 (per `roadmap.md`). |
| **Knowledge layers L4–L10** (repair procedures, wiring diagrams, torque specs, TSBs, known-failures, community cases, a self-improving AI-learning system) | Each is a substantial content/data investment; V1 needs L1–L3 (vehicle, DTC, inspection) plus L9 (real cases) to complete the loop. | Phased per `05-knowledge-roadmap.md`. |

## 5. System coverage — the depth gradient (not a cut)

Every system below is **available and diagnosable in V1.** The table shows how many
**guided steps** each tier has today — never whether the system is supported at all.

| Tier | Systems | Guided-step depth in V1 | Always present regardless of tier |
| --- | --- | --- | --- |
| **1 — Deepest guided diagnosis** | Engine, Fuel, Ignition, Electrical, Charging, Starting, ABS, Brake | Full question-tree routing + the complete interactive test-node loop, converging to a Confirmed root cause. | DTC interpretation, safety guidance, structured reasoning |
| **2 — Supported, fewer guided steps (growing)** | Transmission, Cooling, Air Intake, Exhaust, Steering, Suspension, CAN Communication, Airbag, Body Control, Air Conditioning, Hybrid, EV High Voltage, ADAS | A shorter guided sequence today (fewer test nodes than Tier 1); still produces ranked causes from whatever evidence is available, and still walks the mechanic through what's known. **Cooling, Air Intake, and Exhaust** additionally inherit useful routing context when reached via the Engine entry hub. | DTC interpretation, **full and complete** safety guidance, structured reasoning, component reference information |

**The governing rule:** depth may vary; **presence never does.** A mechanic
diagnosing a Hybrid HV fault or an ADAS calibration issue in V1 gets a real, useful
session — ranked causes, the DTC meaning, the safety warning in full, and whatever
guided steps exist today — never a message that the system isn't supported. Depth
expands tier-2 system by system after V1, prioritized by real shop frequency (per
`05-knowledge-roadmap.md`), without ever removing what's already there.

## 6. Screens in V1

| Screen | Purpose | Status vs. today |
| --- | --- | --- |
| **Home** | Entry point: Diagnose, DTC Search, Case Library (3 tiles — Photo/Expert tiles removed for V1) | Simplify existing screen |
| **Vehicle Select** | Brand/model/year (required) + engine/transmission (optional); quick-selection-first inputs | Keep as built |
| **Symptom / Complaint Entry** | System selection via the question-tree entry router (all 21 systems); complaint via quick-select/voice/text; DTC entry; photo attachment | Rework existing screen around the entry router and input-priority order |
| **Guided Diagnostic Session** *(new, primary)* | The Senior Technician View — current test node, result entry (quick-select → measured value → voice/photo → text), live-updating ranked causes with AI-generated "why" | New — replaces the static Diagnosis Result screen |
| **Diagnostic Report** *(new, secondary)* | On-demand full 8-section snapshot of the current session, including the AI's plain-language summary | New — reachable from the Guided Session |
| **DTC Search** | Standalone code lookup, all systems | Keep as built |
| **Case Library** | Search/list saved cases | Keep as built |
| **Case Detail** | Full case + Similar Cases with AI-explained similarity | Keep as built |
| **Case Form** (new/edit) | Save/edit a case, prefilled from a Confirmed diagnosis | Keep as built |
| **Settings** | Theme, clear data | Keep as built |

**Removed from V1:** standalone Photo Diagnosis (dedicated computer-vision analysis
screen), Ask Expert (free-form chat screen) — both postponed per §4. Photo and voice
remain available as **input methods** within the screens above (§C).

## 7. Simplest complete user journey (open app → saved, verified diagnosis)

```
Home
  ↓ tap "Diagnose"
Vehicle Select
  ↓ enter Brand · Model · Year (minimum) — quick-select first
Symptom / Complaint Entry
  ↓ EITHER: enter a known DTC → skip router, jump straight to system Q1 (any of the 21 systems)
  ↓ OR: describe the complaint (quick-select options, or voice/photo, text as last resort)
  ↓    → entry router asks ONE routing question → system selected
Guided Diagnostic Session
  ↓ engine (Rule Engine + AI) shows: problem summary, ranked possible causes with
  ↓   AI-explained evidence, ONE next test — its depth follows the system's tier (§5)
  ↓ mechanic performs the test → answers via quick-select (OK/Not OK/Unknown) or
  ↓   enters a measured value directly, whichever the test calls for
  ↓ Rule Engine updates the ranking; AI updates the plain-language "why"; shows the
  ↓   next single test
  ↓ (repeat — each step reduces uncertainty; safety gate always shown in full if the
  ↓   system requires it, regardless of tier)
  ↓ a cause reaches CONFIRMED
Guided Diagnostic Session — repair step
  ↓ engine shows: root cause, why it failed (AI explanation), the repair, and the
  ↓   verification step
  ↓ mechanic performs the repair and verifies under the original conditions
  ↓ tap "Save as Repair Case"
Case Form (prefilled: vehicle, system, DTCs, confirmed root cause, repair)
  ↓ confirm/add parts, note (quick-select/voice first, typing as fallback)
  ↓ Save
Case Detail
  → now discoverable as a Similar Case (with an AI-explained reason why) for the
    next mechanic who hits this fault, on any system
```

This is the **entire V1 product**: nothing exists that doesn't serve getting from
*"I don't know"* to *"proven, fixed, and remembered"* as fast as the evidence allows —
on **any** system, using the **least typing** possible, with the Rule Engine keeping
the process safe and consistent while the AI keeps it explainable.
