# Language Standard (permanent, project-wide)

This is a **permanent project rule**. It applies consistently across the entire
Master Technician application — every screen, and every string produced by the
engines that a mechanic can read.

## The rule

1. **All explanations, guidance, reasoning, warnings, and instructional text are
   written in Khmer.**
2. **All automotive technical component names stay in English** and are never
   translated. Examples (do NOT translate any of these):
   Fuel Pump · Injector · Fuel Rail · SCV · Turbocharger · Alternator ·
   ABS Module · Brake Booster · Fuel Pressure Sensor · Crankshaft Position Sensor ·
   Camshaft Position Sensor · Mass Air Flow Sensor · MAP Sensor.
3. **DTC codes are unchanged** — e.g. `P0093`, `P0301`, `C1234`.
4. **Live Data parameter names stay in English** — e.g. Actual Rail Pressure,
   Target Rail Pressure, fuel trim, wheel speed.
5. **Diagnostic tools stay in English** — e.g. scan tool, multimeter,
   oscilloscope, smoke machine.
6. **UI buttons may remain in Khmer** — e.g. បន្ត · បញ្ចប់ · រំលង · បញ្ជាក់.
7. **Khmer prose naturally embeds the English terms** — the English technical
   name sits inline inside the Khmer sentence.

## Examples

✅ **Correct:**
> "សូមពិនិត្យ Fuel Pump មុន ព្រោះ Actual Rail Pressure ទាបជាង Target Rail Pressure។"

❌ **Incorrect** (translated the component name into Khmer):
> "សូមពិនិត្យ ម៉ាស៊ីនបូមប្រេងឥន្ធនៈ មុន..."

## What counts as "explanation/guidance/warning" (must be Khmer)

- `NextAction.title`, `NextAction.instruction`, `NextAction.reason`,
  `NextAction.safetyWarning` (from the Orchestrator).
- Reasoning Layer explanations (evidence groups, contradictions, missing evidence,
  hypothesis assessments, ranking reasons, question/test recommendation text).
- Screen section prose, empty states, error messages, hints, confirmations.

## What must stay English (embedded inside the Khmer)

- Component names (rule 2), DTC codes (rule 3), Live Data parameter names
  (rule 4), diagnostic tools (rule 5).

## Scope note

Much of the app's guidance text is currently **engine-generated in English**
(Orchestrator + Reasoning Layer, Milestones 4–5). Bringing those layers into
compliance is a scoped, string-level change — it does not alter the frozen
architecture or logic, only the human-readable strings those layers emit — and
should be applied when converting the app to this standard. See
`project-rules.md` and `ui-ux-guidelines.md`, which both reference this document.
