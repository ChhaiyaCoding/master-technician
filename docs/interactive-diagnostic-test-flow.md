# Interactive Diagnostic Test Flow — Specification (TASK 003)

**Design specification only. No production code, no UI code.** This document defines
how Master Technician turns a static diagnosis into an **interactive, step-by-step
testing loop** — the mechanic performs one inspection, enters the result, and the
diagnosis **updates and advances**.

It builds directly on:
- [`diagnostic-reasoning-engine.md`](diagnostic-reasoning-engine.md) (TASK 001) — the
  reasoning contract and the loop this flow makes interactive.
- [`diagnostic-framework.md`](diagnostic-framework.md) — the technician's thinking.
- The worked P0093 case in [TASK 002] — reused here as the example.

---

## 1. Concept — from report to guided testing

The engine already reasons in a **loop** (engine spec §12): each *Next Recommended
Action* produces evidence that re-enters the engine and reduces uncertainty. This
task defines the **interactive surface of one turn of that loop**:

> The engine recommends **one test** → the mechanic performs it and enters the
> **result** (OK / Not OK / Unknown) → the engine **updates every hypothesis** and
> presents the **next highest-value test** → repeat until the root cause is *proven*.

The app is therefore **not** a report generator that hands over a wall of text. It is
a **senior technician standing beside the mechanic**, asking for one measurement at a
time, interpreting it, and deciding what to check next.

```
   ┌──────────── ENGINE (working memory: hypotheses + evidence log) ────────────┐
   │                                                                            │
   │   recommend ONE test ─▶  [ TEST NODE ]  ─▶  mechanic enters result         │
   │        ▲                                         │                          │
   │        │            update likelihoods,          ▼                          │
   │        └──────────  eliminate/confirm,  ◀── OK / Not OK / Unknown           │
   │                     pick next best test                                    │
   └────────────────────────────────────────────────────────────────────────────┘
                     (uncertainty strictly decreasing every turn)
```

---

## 2. Two views — Senior Technician View (primary) & Diagnostic Report (secondary)

### Senior Technician View — **primary experience**
- **One test at a time.** The mechanic always sees a single current Test Node with a
  clear result input. This is the default, always-on mode.
- **Guided and conversational-but-structured** — like a master tech saying: *"Check
  this. Tell me what you got. …OK, then check this next, because…"*
- **State-aware:** it remembers everything tested so far and never repeats a settled
  question.

### Diagnostic Report — **secondary, on demand**
- The full **8-section engine output** (engine spec §11) as a **snapshot of the
  current state** of the diagnosis.
- Always reflects the **live** hypothesis set — every test result the mechanic enters
  updates it. It is a *projection* of the engine's working memory, not a separate
  document.
- Used when the mechanic wants the whole picture (ranked causes, component info,
  overall reasoning) — but the **driving loop stays the Senior Technician View.**

**Rule:** the interactive one-test-at-a-time flow leads; the report follows. The
report is never the place decisions are made — it's a review surface.

---

## 3. The Test Node — specification

Every step in the flow is a **Test Node**. Each node must contain all 10 fields:

| # | Field | Definition |
| --- | --- | --- |
| 1 | **Test name** | Short, unambiguous name of the inspection. |
| 2 | **Purpose** | What this test determines. |
| 3 | **Why this test matters** | *Which hypotheses it confirms/eliminates* — the information-gain reason it was chosen now. |
| 4 | **Required tool** | The instrument(s) needed (and whether a scan tool / gauge / adapters). |
| 5 | **Component location** | Where on *this* vehicle the mechanic works. |
| 6 | **How to perform** | The procedure, incl. the condition (at rest / under load / warm). |
| 7 | **Possible results** | The allowed result inputs (see §3.1). |
| 8 | **Meaning of each result** | What each result proves about the hypotheses. |
| 9 | **Next step for each result** | The single next node (or terminal) each result routes to. |
| 10 | **Safety warning** | Any hazard prerequisite (HP fuel, HV, SRS, hot/rotating). Omitted only if genuinely none. |

### 3.1 Result-input model

Every node accepts one of three results. Two node *types* exist:

- **Binary node** (default): **OK / Not OK / Unknown-Cannot Test.**
- **Observation node**: when a single reading needs a richer answer (e.g., *how* rail
  pressure fails), the primary answer is still **OK / Not OK / Unknown**, and **Not
  OK** carries a **refinement** (named sub-outcomes) that routes the branch.

### 3.2 What each result does (the core behavior)

**OK**
- **Reduce** the likelihood of the causes this test targets (that failure mechanism is
  now less likely / eliminated).
- **Advance** to the **next most valuable inspection** for the remaining hypotheses.

**Not OK**
- **Increase** the likelihood of the failure branch this test points to.
- **Branch** to the **related checks** that localize *which* cause in that branch.

**Unknown / Cannot Test**
- **Explain why this test matters** (its role in narrowing the diagnosis).
- **Explain how to perform it** (so the mechanic can do it if possible).
- **Offer an alternative test** that targets the **same question with different
  tools**, so the flow **never dead-ends** because a tool is missing (see §5).

---

## 4. Reasoning loop & likelihood-update model

### 4.1 Working memory (conceptual — not a database schema)
The engine holds, for the session:
- **Hypothesis set** — each cause with a **confidence band** (High / Medium / Low) and
  its stated reason.
- **Evidence log** — every test performed, its result, and the **evidence tier** it
  produced (engine spec §4: Reported < Observed < Measured < Confirmed).
- **Current node** — the one recommended test.

### 4.2 How a result updates confidence (explainable, no false precision)
Updates are **directional and reasoned**, not opaque numbers:

| Symbol | Effect | When |
| --- | --- | --- |
| **CONFIRM** | cause proven → move toward repair terminal | a **Confirmed-tier** result directly proves the cause |
| **ELIMINATE** | cause removed from the set | evidence contradicts it |
| **↑↑ / ↑** | strong / moderate increase | result supports the cause; strength scales with the evidence tier |
| **↓↓ / ↓** | strong / moderate decrease | result weakens the cause |
| **—** | unchanged | result is irrelevant to that cause |

Rules:
- A **Measured/Confirmed "Not OK"** on a discriminating test moves causes far more than
  an **Observed "OK"**. Tier governs magnitude.
- **Every result must change the set** — confirm, eliminate, or shift at least one
  hypothesis, or acquire previously-missing evidence. If it wouldn't, the node was the
  wrong choice (engine spec §8).
- Confidence and its reason are **always shown**; ties are stated openly ("A and B
  remain near-equal until the next test").

### 4.3 Next-node selection
After each update, the engine re-ranks and selects the next node by **information gain**
(engine spec §8): the test that best discriminates the *current* leading hypotheses,
adjusted for accessibility/cost/safety. One node is presented — never a list.

### 4.4 Terminal states (engine spec §12)
- **A — Confirmed root cause:** emit the repair recommendation *with why it failed and
  how to verify* under the original conditions. **Only** path to a part replacement.
- **B — Converging:** present the next test.
- **C — Insufficient evidence:** the next "test" is acquiring the missing evidence (or
  an alternative, §5).
- **D — Contradiction/diverging:** widen the set, state the contradiction, choose a
  resolving test.

---

## 5. Handling "Unknown / Cannot Test" (never dead-end)

Real shops lack tools. The flow must degrade gracefully, never stall.

When the mechanic answers **Unknown / Cannot Test**, the node provides:
1. **Why it matters** — the hypotheses this test would have separated, so the mechanic
   understands the cost of skipping it.
2. **How to perform it** — a concise procedure, in case the tool can be obtained.
3. **An alternative test** — a **diagnostically-equivalent** node that attacks the
   **same question** with different tools.

**Diagnostic equivalence:** two tests are equivalent for routing if they discriminate
the same hypotheses. Example (P0093): live rail-pressure data and the *mechanical*
pair {low-pressure feed-pressure gauge + injector return-volume test} both answer
"is the rail-pressure loss from supply, or from a leak/regulation fault?" — so if the
scan-tool route is unavailable, the mechanical route substitutes.

If **no** alternative is available either, the engine states honestly that the
diagnosis **cannot be advanced without this evidence**, and stops recommending — it
does **not** guess or jump to a part.

---

## 6. Invariants for the interactive flow

Inherited from the engine, enforced every node:
- **Never recommend replacing a part** until a cause is **Confirmed**; the default next
  step is always a test.
- **Every branch reduces uncertainty** (confirm / eliminate / shift / acquire).
- **One test at a time** — never overwhelm.
- **Always explain WHY** this test, and what each result means.
- **Uncertainty stays visible** — confidences and open questions shown; no false
  precision.
- **Safety gates** precede any hazardous test.
- **Unknown never dead-ends** — always why + how + alternative.

---

## 7. Worked decision tree — Toyota Hiace 2008 Diesel, `P0093`

Reusing the TASK 002 hypothesis set and its **starting confidences**:

| Cause | Start confidence |
| --- | --- |
| H1 Injector internal back-leak | Medium-High |
| H2 Low-pressure supply starvation (filter/air/feed) | Medium-High |
| H3 SCV sticking/worn | Medium |
| H4 Rail pressure-limiter leaking open | Medium-Low |
| H5 HP supply pump wear | Low-Medium |
| H6 External HP fuel leak | Low (safety-exclude early) |

### 7.1 The tree (overview)

```
T1  Rail-Pressure Hold Test (live data)              ← highest information gain
 ├─ OK  (reaches & holds target)      → pressure system NOT the mechanism
 │                                      → ↓↓ H1..H5 ; TERMINAL D: widen (other DTCs,
 │                                        fuel quality/water, air, ECU/wiring)
 ├─ NOT OK  (deviates/collapses)      → ↑ "rail-pressure fault confirmed", refine:
 │     ├─ collapses after building    → T2a  Injector Back-Leak Test
 │     ├─ never builds / supply-limited → T2b Low-Pressure Supply Test
 │     └─ erratic vs command          → T2c  SCV Control Test
 └─ UNKNOWN (no scan tool)            → why+how; ALTERNATIVE → T2b then T2a
                                         (mechanical route, no live data needed)

T2a Injector Back-Leak (return-volume) Test
 ├─ OK  (low & equal)                 → ↓↓ H1 ; next → T-LIM (limiter) / T2c (SCV)
 ├─ NOT OK (one cyl high)             → ↑↑ H1 → T-ISO isolate cylinder → CONFIRM → repair
 └─ UNKNOWN (no adapters)             → why+how; ALTERNATIVE → scan cylinder-balance / T-LIM

T2b Low-Pressure Supply Test (feed pressure + filter + air)
 ├─ OK  (clean, air-free, adequate)   → ↓↓ H2 ; next → T2a (back-leak)
 ├─ NOT OK (low feed / air / clogged) → ↑↑ H2 → localize: filter vs air-leak vs feed vs water
 └─ UNKNOWN (no LP gauge)             → why+how; ALTERNATIVE → clear-hose air check + filter history

T2c SCV Control Test
 ├─ OK  (in spec, responds smoothly)  → ↓ H3 ; next → T-PUMP (pump output) / T-LIM
 ├─ NOT OK (out of spec / erratic)    → ↑↑ H3 → T-SCV-ACT actuation/known-good compare → CONFIRM → repair
 └─ UNKNOWN (limited tooling)         → why+how; ALTERNATIVE → SCV resistance + wiring check

(Deeper branches: T-LIM pressure-limiter return-flow test · T-PUMP HP-pump output ·
 T-EXT external HP-leak visual [safety] — reached as the set narrows.)
```

Note the structure: **OK reduces and advances; Not OK amplifies and localizes;
Unknown explains and substitutes.** Every arrow changes the confidences above.

### 7.2 Full Test Nodes

---

#### **T1 — Rail-Pressure Hold Test** (observation node, root)

1. **Test name:** Common-rail pressure hold — commanded vs actual (live data).
2. **Purpose:** Determine whether the engine can reach and **hold** target rail
   pressure through a start→run→stall cycle.
3. **Why this test matters:** `P0093` means the ECU can't maintain commanded pressure.
   This one non-invasive reading splits the entire differential: a pressure that
   **collapses** points to leak/regulation (H1/H4/H3), one that **never builds** points
   to supply (H2/H5), one that is **erratic** points to SCV (H3). It reads the exact
   parameter the code is based on.
4. **Required tool:** Scan tool able to read rail-pressure PIDs (commanded + actual),
   engine speed, fuel temperature; logging preferred.
5. **Component location:** Data via OBD/Toyota connector; the rail-pressure sensor sits
   on the common rail across the cylinder head (engine accessed via the in-cab engine
   cover / from beneath on this chassis).
6. **How to perform:** Connect scanner; graph commanded vs actual rail pressure with
   RPM; start and run the engine through to the stall; note the pressure value and
   *manner* of deviation at the moment it stalls. Also pull **all** DTCs + freeze-frame.
7. **Possible results:** OK (reaches & holds) · Not OK (deviates — refine: *collapses /
   never builds / erratic*) · Unknown/Cannot Test.
8. **Meaning of each result:**
   - **OK:** rail pressure is not the failing mechanism → ↓↓ H1–H5; the stall is likely
     elsewhere (fuel quality/water, air, ECU) → **widen**.
   - **Not OK – collapses after building:** a leak/regulation loss → ↑ H1, ↑ H4.
   - **Not OK – never builds / supply-limited:** inadequate supply → ↑↑ H2, ↑ H5.
   - **Not OK – erratic vs command:** regulation fault → ↑↑ H3.
   - **Unknown:** central evidence missing.
9. **Next step for each result:**
   - OK → widen (Terminal D): review other DTCs, check fuel for water/air.
   - Not OK/collapses → **T2a**. Not OK/never-builds → **T2b**. Not OK/erratic → **T2c**.
   - Unknown → alternative mechanical route → **T2b** (then T2a).
10. **Safety warning:** ⚠ High-pressure diesel (up to ~180 MPa). Do not open or probe HP
    lines while running; risk of fluid-injection injury. Hot engine — take care.

---

#### **T2a — Injector Back-Leak (Return-Volume) Test** (binary)

1. **Test name:** Injector internal back-leak / return-volume test.
2. **Purpose:** Determine whether one or more injectors bleed excessive HP fuel to
   return (an internal "large leak").
3. **Why this test matters:** Excessive injector back-leak is a leading literal cause of
   `P0093` and of the heat-sensitive run-then-stall pattern. Discriminates H1 from the
   regulation/supply causes in one measurement.
4. **Required tool:** Injector return-flow adapter set + graduated cylinders (or Toyota
   return-measure kit).
5. **Component location:** Injectors in the cylinder head (one per cylinder) with the
   common return/leak-off line; accessed from the top of the engine.
6. **How to perform:** With the engine **off and depressurized**, fit return-flow
   measuring on each injector's leak-off; crank/run per procedure; compare volumes
   between cylinders against spec.
7. **Possible results:** OK (low & roughly equal) · Not OK (one/more clearly high) ·
   Unknown/Cannot Test.
8. **Meaning of each result:**
   - **OK:** injectors are sealing → ↓↓ H1.
   - **Not OK:** the leak is at the injector(s) with high return → ↑↑ H1 (approaching
     Confirmed once the specific cylinder is isolated).
   - **Unknown:** cannot yet weigh H1.
9. **Next step for each result:**
   - OK → **T-LIM** (pressure-limiter return check) or **T2c** (SCV).
   - Not OK → **T-ISO** (isolate the offending cylinder — e.g., cut-off/comparison) →
     **CONFIRM H1** → repair terminal.
   - Unknown → why+how; **alternative** → scan-tool **cylinder-balance / injector
     correction data** comparison, or proceed to **T-LIM**.
10. **Safety warning:** ⚠ Depressurize the rail and let it cool before opening leak-off
    unions; diesel spillage/fire risk.

---

#### **T2b — Low-Pressure Supply Test** (binary, with localization on Not OK)

1. **Test name:** Low-pressure fuel supply — feed pressure, filter, air.
2. **Purpose:** Determine whether clean, air-free fuel is delivered to the injection
   pump at adequate low-pressure.
3. **Why this test matters:** The run-then-stall-then-recover pattern is the classic
   signature of supply starvation / air ingress. Confirms or clears H2 (and informs
   H5) cheaply, no live data needed — so it's also the **Unknown-path alternative** to
   T1.
4. **Required tool:** Low-pressure gauge (feed side), clear hose section for air, filter
   inspection; hand-primer.
5. **Component location:** Fuel filter / water separator housing and feed line between
   tank and injection pump (engine bay / chassis on this model).
6. **How to perform:** Measure feed pressure at the pump inlet while running to the
   stall; inspect the filter/water separator; splice a clear hose to watch for **air
   bubbles**; check the separator for **water**; feel primer for firmness.
7. **Possible results:** OK (adequate pressure, clean, air-free) · Not OK (low pressure
   / air present / clogged / water) · Unknown/Cannot Test.
8. **Meaning of each result:**
   - **OK:** supply is good → ↓↓ H2.
   - **Not OK:** a supply-side fault is present → ↑↑ H2 → localize which: clogged
     **filter** vs suction **air leak** vs weak **feed** vs **water** contamination.
   - **Unknown:** supply not yet weighed.
9. **Next step for each result:**
   - OK → **T2a** (back-leak).
   - Not OK → localization sub-branch (filter / air-leak / feed / water) → **CONFIRM**
     the specific supply fault → repair terminal (renew filter/purge air *and* find
     *why*, e.g. the air-drawing seal — not just a filter swap).
   - Unknown → why+how; **alternative** → clear-hose air observation + filter service
     history + primer feel (tool-light).
10. **Safety warning:** ⚠ Diesel spillage/fire; relieve pressure; no ignition sources.

---

#### **T2c — SCV Control Test** (binary)

1. **Test name:** Suction Control Valve (SCV) regulation test.
2. **Purpose:** Determine whether the SCV correctly regulates fuel volume to the pump
   (electrical integrity + smooth pressure response).
3. **Why this test matters:** A sticking/worn SCV is a known 1KD/2KD failure that causes
   erratic or insufficient rail pressure and stalling. Discriminates H3 from pump wear
   (H5) and injectors (H1).
4. **Required tool:** Multimeter (SCV coil resistance, wiring); scan tool to observe rail
   pressure vs commanded response.
5. **Component location:** SCV mounted on the supply/injection pump body (front of
   engine).
6. **How to perform:** Check SCV coil resistance and connector/wiring against spec;
   observe in live data whether actual pressure **follows** commanded changes smoothly
   or hunts/sticks.
7. **Possible results:** OK (in spec, smooth response) · Not OK (out-of-spec / erratic
   regulation) · Unknown/Cannot Test.
8. **Meaning of each result:**
   - **OK:** SCV regulating → ↓ H3.
   - **Not OK:** SCV suspect → ↑↑ H3 (confirm vs pump next).
   - **Unknown:** H3 unweighed.
9. **Next step for each result:**
   - OK → **T-PUMP** (HP-pump output) or **T-LIM**.
   - Not OK → **T-SCV-ACT** (actuation / known-good SCV comparison — a *diagnostic
     substitution*, not a sale) → **CONFIRM H3** → repair terminal.
   - Unknown → why+how; **alternative** → SCV resistance + wiring check only.
10. **Safety warning:** ⚠ HP fuel system; depressurize before any mechanical access; hot
    engine.

---

*(Deeper nodes — reached as the set narrows, each specified with the same 10 fields
when built: **T-LIM** rail pressure-limiter return-flow test, **T-PUMP** HP-pump output
test, **T-EXT** external HP-leak visual inspection [engine off, depressurized — safety],
**T-ISO** cylinder isolation to confirm a specific injector.)*

### 7.3 Two convergence walkthroughs

**Path α (scan tool available):**
`T1 → Not OK/collapses` (↑H1, ↑H4; ↓H2) → `T2a → Not OK, cyl 3 high` (↑↑H1) →
`T-ISO confirms cyl 3` → **CONFIRM H1** → *Repair terminal:* replace/recondition
injector 3 **and** state why it failed (wear) + **verify** — clear codes, run warm
under the original conditions, confirm no stall and rail pressure now holds. Parts were
recommended **only after proof.**

**Path β (no scan tool → Unknown handled):**
`T1 → Unknown` (why+how+alternative) → `T2b → Not OK: air bubbles in clear hose` (↑↑H2)
→ localize → **suction-side air leak at filter-housing seal** confirmed → *Repair
terminal:* renew the seal/purge air (fix the *cause* of the air, not just bleed it) +
**verify** the stall is gone. The missing tool never dead-ended the diagnosis.

Both paths **reduced uncertainty at every branch** and **never guessed a part.**

---

## 8. Per-node self-checks (enforce the invariants)

Before presenting any node or accepting a result, the engine validates:
1. All **10 fields** present (safety may be "none" only if truly none).
2. **Result → update → next** mapping defined for **every** possible result (incl.
   Unknown with why + how + alternative).
3. The node, whatever the result, **changes the hypothesis set** (reduces uncertainty).
4. **No part-replacement** offered unless a cause is **Confirmed**.
5. Exactly **one** current test presented.
6. A **WHY** is present (field 3) tying the test to current hypotheses.
7. **Safety gate** applied where the test touches a hazard.
8. The **Diagnostic Report** (secondary) reflects the post-update state.

---

## 9. Summary

The interactive flow makes the reasoning engine **hands-on**:
- The **Senior Technician View** leads — one Test Node at a time, each with the 10
  fields and a three-way result input.
- **OK reduces and advances; Not OK amplifies and localizes; Unknown explains and
  substitutes** — so the flow always moves and never dead-ends.
- Every result **updates the ranked hypotheses** with visible, reasoned confidence, and
  the engine picks the next **highest-value** test.
- A **part is recommended only when the root cause is proven**, always with *why it
  failed* and *how to verify*.
- The **Diagnostic Report** stays secondary — a live snapshot, not the driver.

It behaves like a senior technician guiding the mechanic: *check this, tell me what you
got, here's what it means, here's the next best thing to check — and we don't replace
anything until we've proven it.*
