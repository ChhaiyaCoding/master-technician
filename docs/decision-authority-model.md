# Decision Authority Model (TASK 006)

**Specification only. No code, no UI, no change to existing implementation.** This
document defines **who has authority** in Master Technician, and draws the line the
whole product must never cross.

## Core principle

> **The mechanic always has the final authority.**

Master Technician **guides, reasons, explains, records, and learns.** It must
**never lock the mechanic into the app's conclusion.** Every rank, every test, every
suggested cause is a **proposal** the mechanic is free to accept, question, or
reject — never a verdict the mechanic must follow.

This document is the enforceable boundary behind that principle. It extends the
hybrid split already defined in `mvp-scope.md` (§B) by adding the role the prior
document didn't yet formalize: **the mechanic, as final authority over every other
layer.**

---

## 1. Rule Engine — process authority

The Rule Engine owns the **mechanics of the process** — never the diagnostic
conclusion. It is responsible for:

- **Safety gates** — no hazardous step (HV, SRS) proceeds without its warning shown in full.
- **Question order** — which question the question tree asks next.
- **Test order** — which test is highest-value next.
- **Diagnostic workflow** — advancing the session state correctly, cycle to cycle.
- **Preventing skipped steps** — no stage of the loop (§ flow, below) may be bypassed.
- **Ensuring one test at a time** — the mechanic is never shown more than one next
  action.
- **Preventing premature repair recommendations** — a repair may only be suggested
  once a cause has reached **Confirmed** (`diagnostic-reasoning-engine.md` §4).

The Rule Engine is **deterministic and auditable.** It has no authority to conclude
what is wrong with the vehicle — only to keep the process safe, ordered, and
honest.

## 2. AI Reasoning Layer — explanatory authority

The AI is responsible for:

- **Explaining why** a cause fits the evidence.
- **Interpreting incomplete evidence** — ambiguous or partial input.
- **Comparing similar verified cases** and explaining the similarity.
- **Summarizing reasoning** in plain language.
- **Helping understand unusual cases** — the ones that don't fit a common pattern.
- **Acting like a senior technician** — calm, evidence-led, never certain beyond what
  the evidence supports.

**The AI must NOT:**
- **Override the mechanic.**
- **Make final repair decisions.**
- **Learn from unverified guesses.**
- **Recommend replacing parts without evidence.**

The AI's output is always a **suggestion with stated reasoning** — never a
conclusion the mechanic is bound by. It has no authority over safety gating, test
sequencing, or ranking mechanics (those belong to the Rule Engine), and no authority
to decide the vehicle is fixed (that belongs to the mechanic).

## 3. Mechanic — final authority

The mechanic is responsible for:

- **Inspecting the vehicle.**
- **Measuring real values.**
- **Confirming test results.**
- **Accepting or rejecting** the app's suggestions — at any point in the flow.
- **Making the final repair decision.**
- **Confirming whether the repair fixed the problem.**

**The mechanic can override the app at any point** — a test priority, a ranked
cause, a recommended repair, anything the app suggests. This is not an edge case to
be minimized; it is the mechanic's authority working as designed.

### The override rule

When the mechanic overrides the app, the app **must ask**:

> **"What evidence made you choose this direction?"**

The answer is saved as **technician evidence** — attributed to the mechanic,
recorded alongside the session/case, and kept distinct from Rule Engine output and
AI-generated reasoning. Technician evidence is never discarded and never treated as
lesser; it is real-world judgment the app did not have. It still passes through the
same **Verified Diagnosis** gate (§4) as any other path before it can feed the
Learning Engine (§5) — overriding the app does not bypass verification, it simply
means the human's reasoning, not the app's, led to the confirmed answer.

---

## 4. Verified Diagnosis

A diagnosis becomes **verified** only when **all** of the following are true:

1. The **symptom is confirmed** (reproduced, not assumed).
2. The **inspection result supports the root cause** (evidence, not opinion).
3. A **repair is performed.**
4. The **original symptom disappears.**
5. **DTCs do not return**, when applicable.
6. **The mechanic confirms** the vehicle is fixed.

**Only verified diagnoses can be used for future learning.** A diagnosis missing any
one of the six conditions is not verified — it may still be saved as a case record
(for reference), but it is not eligible to shape future reasoning.

## 5. Learning Engine

The app **learns only from**:
- **Verified Diagnosis** (§4, all six conditions met).
- **Mechanic-confirmed results.**
- **Final root cause.**
- **Final repair.**
- **Verification result.**

The app **must NOT learn from**:
- **AI guesses.**
- **Unconfirmed hypotheses.**
- **Unfinished diagnostic sessions.**
- **Suggested causes that were never repaired.**
- **Cases where the symptom was not verified fixed.**

This is the gate that keeps the flywheel honest: the app's growing knowledge is
built only from **proven outcomes**, never from its own unconfirmed suggestions.

---

## The final authority flow

```
Customer Complaint
        ↓
Diagnostic Question Tree        ← Rule Engine (process)
        ↓
Rule Engine                     ← safety, order, sequencing, no skipped steps
        ↓
AI Reasoning                    ← explains, interprets, compares, summarizes
        ↓
Senior Technician Guidance       ← the combined suggestion: ranked cause + one next step + why
        ↓
Mechanic Inspection              ← real-world measurement and observation
        ↓
Mechanic Decision                ← accept, question, or OVERRIDE — mechanic's authority
        ↓
Verified Diagnosis                ← all six conditions met (§4), or it stops here
        ↓
Learning Engine                  ← only verified outcomes are ever learned from
```

**Read the flow as a chain of custody for a conclusion:** the Rule Engine keeps it
orderly and safe, the AI makes it explainable, but nothing becomes *knowledge* until
a mechanic has inspected the real vehicle, made the real decision, and verified the
real result.

---

## Why this exists

Master Technician is not the final decision maker. **It is a professional
diagnostic partner.** The moment the app is allowed to conclude, override, or learn
from anything short of a mechanic-verified outcome, it stops being a diagnostic
partner and becomes a guessing machine — the exact failure mode this entire project
has been designed against (`ai-system.md`, `diagnostic-reasoning-engine.md` §1,
`vision.md`).

**Enforcement, in one sentence per layer:**
- The Rule Engine enforces *process* (no shortcuts, no skipped safety, no premature
  repair suggestion).
- The AI enforces *honesty of reasoning* (every explanation ties to evidence; nothing
  is asserted beyond what the evidence supports).
- The Learning Engine enforces *proof* (nothing is learned until it is verified).
- **The mechanic enforces everything else** — because the mechanic is the final
  authority, always.
