# Diagnostic Reasoning Engine — Specification (TASK 001)

**Design specification only. No production code, no UI, no AI implementation, no
database schema.** This document defines *how the engine reasons* — the contract any
future implementation (rules, AI, or a human) must conform to.

The engine is the **core of Master Technician**. Its job is **not** to guess the
failed part. Its job is to **help a technician reason through a fault using evidence,
reducing uncertainty one high-value step at a time** — exactly as a senior master
diagnostic technician would.

It is the operational form of [`diagnostic-framework.md`](diagnostic-framework.md)
and must obey the AI rules in [`ai-system.md`](ai-system.md).

---

## 0. What the engine is — and is not

- **It is** an *evidence reducer*: it takes what is currently known about a vehicle
  and a fault, and returns a structured reasoning step that moves the technician
  closer to a **proven** root cause.
- **It is** *iterative*: one pass is one turn of a loop. The mechanic performs the
  recommended inspection, feeds the result back, and the engine re-reasons with less
  uncertainty. (See §12.)
- **It is not** a part-predictor, a code dictionary, or a chatbot. It never concludes
  faster than the evidence allows.

---

## 1. Core invariants (non-negotiable)

The engine must **NEVER**:
- **Guess.** Every statement is tied to evidence or is explicitly flagged as an
  unconfirmed hypothesis with its confidence shown.
- **Recommend replacing a part immediately.** Replacement is permitted *only* after a
  cause reaches the **Confirmed** evidence tier (§4), and even then it is paired with
  *why the part failed* and *how to verify*. Until then, the next action is always an
  inspection or measurement.
- **Skip evidence.** No cause is ranked without stating the evidence for (and against)
  it. No inspection is recommended without stating what it will prove.
- **Hide uncertainty.** Confidence is always visible; missing/contradicting evidence
  is always named. False precision is forbidden.

The engine must **ALWAYS**:
- **Explain WHY** — for every system, every cause, every inspection, every next action.
- **Reduce uncertainty** — each step must measurably narrow the hypothesis set.
- **Recommend the highest-value inspection first** — the test that discriminates the
  most among the leading causes, cheapest/fastest/safest (information gain, §8).
- **Enforce safety** — HV (Hybrid/EV) and SRS/Airbag hazards gate the output (§10).
- **Behave like a senior master technician** — calm, methodical, evidence-led, never
  the parts cannon.

---

## 2. Mental model — evidence in, reduced uncertainty out

```
        ┌───────────── current evidence about the fault ─────────────┐
        │  vehicle · complaint · symptoms · DTCs · live data ·        │
        │  photos · measurements · voice notes · prior step results   │
        └───────────────────────────┬────────────────────────────────┘
                                     ▼
                      ┌────────── REASONING ──────────┐
                      │  generate → weigh → rank →     │
                      │  choose highest-value test     │
                      └───────────────┬────────────────┘
                                     ▼
        ┌──────── one structured reasoning step (8-section output) ───┐
        │  ends in exactly ONE next action → produces new evidence    │
        └───────────────────────────┬────────────────────────────────┘
                                     ▼
                         loop until root cause is PROVEN
```

The engine's success metric is **uncertainty removed per step**, not answers emitted.

---

## 3. Input contract

### 3.1 Vehicle (identity — scopes all reasoning)
`Brand · Model · Year · Engine · Transmission`
Used to scope which systems, failure patterns, specifications, and safety class apply.
Missing fields are allowed but **reduce specificity** and must be reflected in
confidence (a generic answer is stated as generic).

### 3.2 Available information (the evidence)
All optional except a minimum trigger (see §3.4). Each type is treated as evidence
with a reliability weight (§4):

| Input | What it provides | How the engine treats it |
| --- | --- | --- |
| **Customer complaint** | The reported problem + conditions | *Reported* evidence — a pointer, lowest weight; may be inaccurate. |
| **Symptoms** | What is actually observed/confirmed | *Observed* evidence if tech-confirmed; higher weight than reported. |
| **DTCs** | Conditions the modules detected (+ freeze-frame) | Evidence of a *detected condition*, not a cause. Freeze-frame conditions weighted heavily. |
| **Live data** (optional) | Real-time system values | *Measured* evidence — high weight; compared to known-good. |
| **Photos** (optional) | Visual state of parts/lights/gauges | *Observed* evidence; supports/【refutes】 hypotheses. |
| **Measurements** (optional) | Instrument readings | *Measured* evidence — highest weight; can Confirm/eliminate. |
| **Voice notes** (optional) | Tech's field observations | Treated per content (usually *Observed*). |

### 3.3 Prior step results (loop input)
The result of the previous **Next Recommended Action** re-enters as new evidence
(e.g., "swap test: misfire followed the coil"). This is what makes the engine
converge (§12).

### 3.4 Minimum to reason
The engine needs at least **one** of: a complaint, a symptom, or a DTC — plus enough
vehicle identity to scope. With less, the correct output is a **request for the
specific missing evidence** (a follow-up), *not* a guess (§12, terminal state C).

### 3.5 Missing-information handling
Like a real technician, the engine reasons with what it has **and openly states what
it lacks.** Missing evidence lowers confidence and often *becomes* the recommended
next action (e.g., "no freeze-frame — capture it first"). It never fills gaps with
assumptions presented as fact.

---

## 4. Evidence model (reliability tiers)

Every piece of evidence carries a **reliability tier**. Higher tiers can confirm or
eliminate; lower tiers can only *suggest*.

| Tier | Source | Can it confirm a cause? |
| --- | --- | --- |
| **Confirmed** | Direct measurement / proven test (incl. swap test following the fault) | **Yes** — this is the only tier that unlocks a repair recommendation. |
| **Measured** | Live data / instrument reading vs. known-good | Strongly supports or refutes; usually needs one more step to confirm. |
| **Observed** | Tech-confirmed symptom, photo, reproduced condition | Supports/weakens; cannot alone confirm. |
| **Reported** | Customer complaint, hearsay | Points direction only; never confirms. |

**Rule:** a cause may only be labeled *Confirmed* (and thus eligible for repair) when
supported by **Confirmed-tier** evidence. Everything below stays a ranked hypothesis.

---

## 5. The reasoning pipeline (internal stages)

Before emitting the 8-section output, the engine runs these stages internally. (These
are reasoning stages, not code.)

- **R1 — Normalize & separate.** Restate the fault; separate **confirmed** from
  **reported**. Extract conditions (cold/hot, idle/load, intermittent/constant) from
  complaint + freeze-frame.
- **R2 — Scope.** Apply vehicle identity: which systems, specs, known-failure
  patterns, and safety class are relevant.
- **R3 — Map to systems.** From symptoms + DTCs, identify candidate **affected
  systems** (→ output §2), noting cross-system effects (e.g., low voltage lights many
  modules).
- **R4 — Generate causes.** For each candidate system, enumerate failure modes across
  the **six failure domains** (§6). Each cause is a hypothesis that *predicts*
  specific symptoms and evidence.
- **R5 — Weigh & rank.** Score each cause by symptom-fit × evidence-fit × prior
  probability, minus contradiction penalty (§7). Eliminate causes the evidence
  refutes. Keep uncertainty explicit.
- **R6 — Choose highest-value inspection.** Select the single test that best
  discriminates among the top causes, adjusted for accessibility/cost/safety
  (information gain, §8).
- **R7 — Attach knowledge.** Gather component info (§ output 5) and define the
  measurements + known-good targets (§ output 6) for that inspection.
- **R8 — Build interpretation tree.** Enumerate what each measurement outcome would
  mean and how it updates the ranking (§ output 7).
- **R9 — Reduce to one action.** Collapse to the single highest-value, safe next step
  (§ output 8). Run self-checks (§13). Apply safety gate (§10).

---

## 6. Cause-generation model — the six failure domains

To avoid tunnel vision, every cause is generated and classified into one of six
domains. This guarantees breadth before ranking narrows it.

| Domain | Question | Typical examples |
| --- | --- | --- |
| **Power** | Is the device getting correct supply? | blown fuse, voltage drop, weak battery/charging |
| **Ground** | Is the return path good? | corroded/loose ground, high ground resistance |
| **Signal** | Is the input/output signal correct? | failed sensor, out-of-range signal, reference issue |
| **Control** | Is the commanding module/logic correct? | actuator driver, module fault, software/relearn |
| **Load** | Is the driven component drawing/doing right? | seized motor, clogged injector, worn actuator |
| **Mechanical** | Is the physical system intact? | low compression, leak, wear, blockage, binding |

The engine reasons the symptom through all six before ranking, then presents only the
credible ones — *breadth in thinking, focus in output.*

---

## 7. Confidence & ranking model

### 7.1 What sets a cause's confidence
- **Symptom fit** — how completely the cause's predicted symptoms match what's
  observed (observed > reported).
- **Evidence fit** — does the actual DTC / live data / freeze-frame / photo match what
  this cause would produce? Strong match raises confidence; contradiction eliminates.
- **Prior probability** — known-failure patterns for this vehicle/mileage; common vs.
  rare.
- **Explanatory completeness** — does it explain *all* the evidence, or only part?
  Causes that explain everything rank above causes that explain some.

### 7.2 How confidence is expressed (never hidden)
- Qualitative bands: **High / Medium / Low**, each **with its reason**. Optionally a
  coarse percentage, but **never false precision** and never a number without a reason.
- If two causes are close, say so ("coil and plug are near-equal until the swap test").
- Every cause shows **supporting evidence** *and* **missing/contradicting evidence** —
  uncertainty is part of the answer.

### 7.3 Ranking order
`most likely → least likely`, by the combined weight above. Ties are broken by **which
cause is cheaper/faster/safer to confirm** (so the ranking also serves the inspection
plan). Refuted causes are dropped (optionally shown as "considered and eliminated,
because…" — eliminating a cause *is* reducing uncertainty).

---

## 8. Inspection-priority model — highest value first

The engine does **not** list every possible check. It recommends the **one inspection
with the highest information gain**:

> Choose the test whose result — *whatever it is* — eliminates or confirms the largest
> share of the leading hypotheses, adjusted for how accessible, fast, cheap, and safe
> it is.

Selection logic (in order of preference):
1. **Discriminating power** — does it split the top causes? A test that halves the
   remaining possibilities beats one that nibbles.
2. **Decisiveness** — can it *confirm* or *eliminate* (Confirmed/Measured tier),
   versus merely suggest?
3. **Accessibility/cost** — prefer the faster, less invasive test when discriminating
   power is similar (e.g., a swap test or a power/ground check before a teardown).
4. **Safety** — never recommend a step that violates the safety gate (§10).

The engine must **state the WHY**: which causes this inspection confirms and which it
eliminates. "Inspect first *because* it separates the two most likely causes in one
move."

---

## 9. The single-next-action rule

The **Next Recommended Action** is always **exactly one** step. Never a to-do list.
Rationale: a mechanic mid-repair must not be overwhelmed; one decisive action keeps
the loop tight and the reasoning honest.

- The action is normally: *perform inspection/measurement N under condition C, and
  report the result.*
- It is **never** "replace part X" unless a cause is **Confirmed** (§4). Even then, the
  action is framed as *confirmed root cause → repair → why it failed → verify*.
- It must be the highest-value action from §8, safe (§10), and achievable with the
  tools a technician plausibly has.

---

## 10. Safety gate (overlays the output)

Before emitting, the engine checks the safety class from system + vehicle + DTCs:

- **High-voltage (Hybrid / EV):** any step touching HV is **blocked** behind an
  explicit isolation prerequisite — de-energize, remove service plug, insulated
  (class-0) gloves, verify 0 V — stated *before* the inspection/measurement/next action.
- **SRS / Airbag:** disconnect battery, wait for capacitor discharge, do not probe
  squib circuits — stated before any related step.
- **Brakes / steering / road test:** verify safely; road test in a safe place.

Safety text is **prepended** to Inspection Priority (§ output 4), Required Measurements
(§ output 6), and Next Action (§ output 8) whenever applicable. Safety is **never**
omitted for brevity and **never** hidden behind a screen.

---

## 11. The OUTPUT contract — always these 8 sections, in this exact order

Every reasoning step emits all eight sections, in order. Empty is not allowed; if a
section can't be filled, the engine states *why* and what evidence would fill it
(never silence, never a guess).

### Section 1 — Problem Summary
- Restate the fault in technician language: vehicle, the **confirmed** symptom and its
  **conditions**, DTCs present, and the **current uncertainty**.
- Separate **confirmed** vs **reported**. No conclusion here.
- *Purpose:* align on what we actually know before reasoning.

### Section 2 — Most Likely Affected Systems
- Ranked list of implicated systems (not causes yet), each with a **one-line why**.
- Note cross-system effects where relevant (e.g., "also check charging — low voltage
  can produce these codes").

### Section 3 — Possible Causes (ranked most → least likely)
For **each** cause, in ranked order:
- **Cause** — the specific failure (and its failure domain, §6).
- **Why it matches the symptoms** — the mechanism linking cause → observed symptom.
- **Confidence level** — High/Medium/Low, *with the reason for that level*.
- **Supporting evidence** — the specific DTC/live data/condition/photo that backs it.
- **Missing / contradicting evidence** — what's not yet confirmed or what argues
  against it (uncertainty is never hidden).
> No cause without evidence. No premature "replace this."

### Section 4 — Inspection Priority
- The **one** (occasionally the top) inspection to do **first**, and **WHY** — which
  causes it confirms and which it eliminates (§8).
- Explicitly **not** a dump of everything. If safety-gated, the safety prerequisite
  appears here first.

### Section 5 — Component Information
For **every important component** involved in the leading causes/inspection:
- **Name**
- **Function** — what it does in the system.
- **Location on vehicle** — where the technician will find it.
- **Related systems** — what else it touches.
- **Common failures** — how this part typically fails (pattern knowledge).

### Section 6 — Required Measurements
For the recommended inspection:
- **What to measure** — voltage / resistance / continuity / pressure / live data /
  temperature / waveform, etc.
- **Where / at what test point.**
- **Known-good target / spec** — the value to compare against (a measurement without a
  target is meaningless).
- **Conditions** — at rest vs. **under load / under the failing condition** (state it,
  because circuits can pass at rest and fail under load).
- Safety prerequisite prepended if gated.

### Section 7 — Interpretation
A decision tree tying each outcome to a conclusion and to the *updated* hypothesis set:
```
If measurement = A  →  Likely X   (why; ranking updates …)
If measurement = B  →  Likely Y   (why; ranking updates …)
If measurement = C  →  Inconclusive → continue inspecting (what next)
```
Every branch must **change the diagnosis** — if an outcome wouldn't change anything,
the test was the wrong one (revisit §8).

### Section 8 — Next Recommended Action
- **Exactly ONE** next action (§9). Never overwhelm.
- Normally: perform the §4 inspection / §6 measurement under the stated conditions and
  **report the result** back into the engine.
- Only "repair/replace" when a cause is **Confirmed** — and then framed with root
  cause, the fix, *why it failed*, and how to **verify** under the original conditions.

---

## 12. The reasoning loop (iteration, convergence, terminal states)

The engine is a **loop**, not a one-shot. Each Next Action produces evidence that
re-enters the engine; causes re-rank; uncertainty shrinks.

```
   evidence → [ENGINE] → 8-section step → mechanic performs ONE action
        ▲                                              │
        └──────────── result becomes new evidence ─────┘
                     (uncertainty strictly decreasing)
```

**Convergence rule:** each cycle must either confirm a cause, eliminate at least one
cause, or acquire evidence that was previously missing. If a cycle would do none of
these, the chosen inspection was wrong (§8).

**Terminal states:**
- **A — Root cause Confirmed** (Confirmed-tier evidence): emit the repair recommendation
  (root cause · fix · why it failed · **verification** under original conditions). This
  is the only path to a part-replacement recommendation.
- **B — Converging, not yet confirmed:** normal loop — emit the next highest-value step.
- **C — Insufficient evidence to proceed:** the next action *is* a request for the
  specific missing evidence (capture freeze-frame, reproduce symptom, provide a
  reading). Never guess to fill the gap.
- **D — Contradictory evidence / diverging:** widen the hypothesis set, state the
  contradiction openly, and choose a test that resolves it. Uncertainty is surfaced,
  not buried.

---

## 13. Self-checks before emitting (guardrails that enforce §1)

The engine validates every output against these before returning it:

1. **Ordering:** all 8 sections present, in the exact order.
2. **Evidence rule:** every cause in §3 has stated supporting evidence *and* stated
   missing/contradicting evidence.
3. **No premature parts:** §8 contains a replacement **only if** a cause is Confirmed;
   otherwise it is an inspection/measurement.
4. **Single action:** §8 contains exactly one next action.
5. **Why present:** §2, §3, §4, §7, §8 each contain an explicit WHY.
6. **Uncertainty visible:** at least one confidence expression and, where relevant, the
   open questions are named. No false precision.
7. **Uncertainty reduced:** the recommended action would confirm/eliminate at least one
   hypothesis or acquire missing evidence (§12 convergence).
8. **Safety gate applied:** if HV/SRS/brake class, the prerequisite is present and
   precedes the action.

If any check fails, the engine must revise before emitting. These checks *are* the
"behave like a master technician, never the parts cannon" contract.

---

## 14. Worked example (illustrative — Toyota, evidence-led)

**Vehicle:** Toyota Vios 2018 · 2NR-FE 1.5L · CVT.
**Complaint:** "Check Engine light on; shakes at idle when warm; slight power loss."
**DTC:** `P0301` (Cylinder 1 misfire). **Freeze-frame:** warm, low RPM, light load.
No other codes. No measurements yet.

### Cycle 1 — engine output

**1. Problem Summary**
2018 Vios (2NR-FE, CVT). **Confirmed via DTC:** cylinder-1 misfire (`P0301`), setting
warm at idle/light load. **Reported:** rough idle + mild power loss (consistent with a
single-cylinder misfire). Single cylinder is implicated — *not* a general (P0300)
misfire — which shifts the odds toward a cylinder-1-specific fault. Cause not yet
proven.

**2. Most Likely Affected Systems**
1. **Ignition (cylinder 1)** — a cylinder-specific misfire most often originates here.
2. **Fuel delivery (injector 1)** — a single clogged/failing injector produces the same
   pattern.
3. **Engine mechanical (cylinder 1 compression)** — less common, but possible if
   ignition and fuel check out.
- *Not* a general vacuum/lean issue: that would trend toward P0300/lean codes, not an
  isolated P0301.

**3. Possible Causes (ranked)**
1. **Ignition coil #1 weak/failing** *(Control/Signal)* — **Confidence: Medium-High.**
   *Why:* coils are the most common single-cylinder misfire cause and degrade under
   heat (matches "warm"). *Supporting:* P0301 + warm freeze-frame. *Missing:* not yet
   isolated to the coil vs. plug.
2. **Spark plug #1 fouled/worn/wrong gap** *(Load/Signal)* — **Confidence: Medium.**
   *Why:* a bad plug misfires that cylinder. *Supporting:* P0301. *Missing:* plug not
   yet inspected; can't separate from coil without a test.
3. **Injector #1 clogged/failing** *(Load)* — **Confidence: Low-Medium.** *Why:* under-
   fueling one cylinder misfires it. *Supporting:* single-cylinder pattern. *Against:*
   less common than ignition; no fuel-side evidence yet.
4. **Low compression, cylinder 1** *(Mechanical)* — **Confidence: Low.** *Why:* mechanical
   loss misfires the cylinder. *Against:* usually accompanied by other symptoms;
   considered only if ignition + fuel are good.
5. **Wiring/connector to coil/injector #1** *(Power/Ground/Signal)* — **Confidence: Low.**
   *Supporting:* possible; *Missing:* no inspection yet.

**4. Inspection Priority**
**First: swap ignition coil #1 with coil #2**, clear the code, run warm, and see which
cylinder now misfires. **Why:** this single, fast, no-cost move discriminates the top
of the list at once — if the misfire *follows the coil* it confirms coil #1; if it
*stays on cylinder 1* it eliminates the coil and points to plug/injector/compression
(positional). Highest information gain, minimal effort, no safety hazard.

**5. Component Information**
- **Ignition coil (coil-on-plug):** *Function* — steps up voltage to fire the plug.
  *Location* — on top of cylinder 1, valve-cover coil pack. *Related* — ignition,
  engine management. *Common failures* — heat-related breakdown, cracked housing,
  intermittent under load.
- **Spark plug:** *Function* — ignites the mixture. *Location* — under coil #1.
  *Related* — ignition, combustion. *Common failures* — wear, fouling, wrong gap.
- **Fuel injector #1:** *Function* — meters fuel into cylinder 1. *Location* — intake
  port, cylinder 1. *Related* — fuel, emissions. *Common failures* — clogging,
  electrical open, leak.

**6. Required Measurements** *(for the confirming steps after the swap)*
- **Coil primary resistance** at the coil connector — compare to spec (known-good
  coil #2 as reference). *Condition:* key off.
- **Spark plug #1** — visual + **gap** vs. spec.
- **Injector #1 resistance** — vs. spec / vs. the other injectors.
- **(If all pass) Compression, cylinder 1** — vs. spec and vs. the other cylinders,
  engine warm, throttle open.

**7. Interpretation**
```
Swap coil #1↔#2, clear code, run warm:
  • Misfire moves to cylinder 2      → Likely COIL #1 (confirm) → repair path
  • Misfire stays on cylinder 1      → Coil ELIMINATED → inspect plug #1, then injector #1
  • Misfire disappears entirely      → Intermittent connector/seating → re-seat & monitor
Then, if positional (stays on cyl 1):
  • Plug bad/gap wrong               → Likely SPARK PLUG #1
  • Plug good, injector out of spec  → Likely INJECTOR #1
  • Plug & injector good             → Measure COMPRESSION cyl 1 (mechanical)
```

**8. Next Recommended Action**
**Swap ignition coil #1 with coil #2, clear `P0301`, run the engine until warm, and
report which cylinder misfires now.** (One action. No part replaced yet — we confirm
first.)

### Cycle 2 — mechanic reports: *"After swap, misfire moved to cylinder 2."*

The engine re-reasons: the fault **followed the coil** → **coil #1 is Confirmed**
(Confirmed-tier evidence). Terminal state **A**. It now emits a repair recommendation:
- **Root cause:** ignition coil #1, confirmed by swap test.
- **Repair:** replace coil #1 (inspect plug #1 while accessible; check the connector for
  the reason it failed — heat/moisture).
- **Verify:** install, clear codes, run warm under the original conditions (idle, light
  load) and confirm no misfire and no P0301 return.

Notice: replacement was recommended **only after proof**, uncertainty was visible at
every step, and each cycle **eliminated or confirmed** a hypothesis. That is the engine
behaving like a master technician.

---

## 15. Summary

The Diagnostic Reasoning Engine is an **evidence-reducing loop** that always:
- takes structured evidence about a vehicle and fault,
- reasons across the six failure domains without tunnel vision,
- ranks causes by evidence with **visible confidence and visible uncertainty**,
- recommends the **single highest-value inspection** and explains **why**,
- interprets each possible result into an updated diagnosis,
- ends in **one** next action,
- and recommends a repair **only when the root cause is proven** — with the reason it
  failed and how to verify.

It never guesses, never throws parts, never hides doubt. It thinks like a senior master
diagnostic technician: *explain why, reduce uncertainty, inspect the highest-value thing
first — and prove it before you fix it.*
