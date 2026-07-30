# AI System — Master Technician

## Principle

All AI in the app is accessed through **one seam**: the `AiProvider` interface in
[`src/services/ai.ts`](../src/services/ai.ts). Screens never call a model
directly. This keeps the AI swappable and enforces a consistent contract.

```ts
export interface AiProvider {
  diagnose(req: DiagnoseRequest): Promise<DiagnosisResult>;
  analyzePhotos(notes: string[]): Promise<PhotoAnalysis>;
  askExpert(conversation, vehicle): Promise<ExpertReply>;
}
export const ai: AiProvider = new PlaceholderAiProvider(); // today
```

## Current placeholder AI

`PlaceholderAiProvider` is **not a real model**. It is deterministic and exists to
exercise the full UI/workflow and to define the exact output shape real AI must
produce.

- **`diagnose()`**
  - Matches entered DTC codes against the local knowledge base (`data/dtc.ts`).
  - Applies keyword heuristics to the symptom text (misfire, lean/black smoke,
    overheat, brake/ABS, A/C, transmission slip).
  - De-duplicates causes, keeps the highest confidence per cause, sorts
    descending, caps at 6, and buckets each into `high/medium/low` likelihood.
  - Builds inspection steps (DTC flows + generic checks), selects tools by system,
    and **auto-adds safety notes** for HV/EV and SRS/Airbag work.
  - Simulates ~1.1s latency.
- **`analyzePhotos()`** — echoes the technician's notes as "observations" and
  returns generic causes/next steps. It does **not** read pixels.
- **`askExpert()`** — detects missing context (vehicle, DTC, mileage) and returns
  **follow-up questions first**; otherwise gives simple keyword guidance.
- Every response is explicitly tagged as a placeholder in the UI/text.

## Rules for future real AI

When a real model is connected, it **must** obey these rules. They are product
requirements, not suggestions — enforce them in the prompt/system design and, where
possible, validate the structured output.

### 1. Do not guess
- Never fabricate DTC meanings, specs, torque values, or causes.
- If confidence is low or data is insufficient, **say so** and ask for more
  information instead of inventing an answer.
- Prefer "insufficient data → next test" over a confident wrong cause.

### 2. Ask follow-up questions when information is missing
- If vehicle, symptom detail, DTC codes, freeze-frame/live data, or mileage are
  missing and would change the diagnosis, **ask** before concluding.
- Return these as the structured `followUps: string[]` (Ask Expert already renders
  them as tappable chips). Keep them specific and diagnostic (e.g. "When does it
  occur — cold/hot, idle/driving?").

### 3. Rank possible causes
- Always return `possibleCauses` ordered **most-likely first**, each with a
  `confidence` (0–100), a `likelihood` bucket, and short `reasoning`.
- Ranking should reflect the actual evidence provided, not a generic list.

### 4. Show inspection steps
- Provide an **ordered** `inspectionSteps` procedure: what to check, in what order,
  and how — starting from the cheapest/fastest confirming test.
- Steps should let the tech **confirm the cause before replacing parts**.

### 5. Explain the evidence
- Every ranked cause's `reasoning` must state **why** — which DTC, which symptom,
  which reading points to it. No unexplained conclusions.
- Tie recommendations back to the inputs the technician gave.

### 6. Show safety warnings
- Always populate `safetyNotes` when the work involves hazards, and never omit
  them to be concise. Mandatory categories:
  - **High-voltage (Hybrid/EV):** isolate HV, remove service plug, class-0 gloves.
  - **SRS/Airbag:** disconnect battery, wait for capacitor discharge, do not probe
    squib circuits with a DMM.
  - **Brakes/road test:** verify in a safe location after repair.
- Safety warnings take priority over brevity and over the diagnosis itself.

### 7. Stay in scope
- Only answer **vehicle diagnosis / technician-knowledge** questions. Do not drift
  into pricing, customer handling, or shop management (see
  [vision.md](vision.md) and [project-rules.md](project-rules.md)).

### 8. Assist, don't dominate — information over conversation
- AI is **one component**, not the product. Structured knowledge (DTC base, cases,
  reference layers) answers first; AI fills the gaps and the genuinely open
  questions.
- Optimize for **fast reading and a fast decision**: ranked, cited, scannable
  output — not long prose or chatty back-and-forth. The mechanic should get the
  answer and return to the vehicle in seconds.
- Be **concise by default**. Do not pad, over-explain, or invite continued
  conversation. Ask a follow-up question only when it genuinely changes the
  diagnosis (rule 2) — never to keep the exchange going.
- The goal is to **reduce searching time, not increase screen time**
  (see [MASTER-TECHNICIAN-BIBLE.md](MASTER-TECHNICIAN-BIBLE.md)).

## Output contract (must be preserved)

Real providers must return the existing shapes so the UI is unaffected:

- `diagnose()` → `DiagnosisResult` (`possibleCauses`, `inspectionSteps`,
  `toolsNeeded`, `recommendedRepair`, `safetyNotes`, …).
- `analyzePhotos()` → `PhotoAnalysis` (`observations`, `possibleCauses`,
  `nextSteps`).
- `askExpert()` → `ExpertReply` (`text`, `followUps`).

See field definitions in [database-schema.md](database-schema.md).

## Implementation notes for going live

- Call the model through a **server-side proxy**; never ship an API key in the
  client.
- Validate/repair structured output before returning it (schema-check, clamp
  `confidence` to 0–100, ensure `possibleCauses` is sorted).
- Consider grounding the model with the local DTC knowledge base and the
  technician's own repair cases (retrieval) to improve accuracy and reduce guessing.
- Keep `PlaceholderAiProvider` available (e.g. behind an env flag) for offline/dev.
