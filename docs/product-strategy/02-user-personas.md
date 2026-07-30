# 02 — User Personas

Personas guide what we build and for whom. The **primary** personas are working
technicians who touch the diagnostic loop daily. **Secondary** personas (owner,
students, instructor) shape adjacent features but never pull the product toward
garage-management/POS territory (see `vision.md`).

Each persona lists: profile, goals, frustrations, daily workflow, and how Master
Technician helps.

---

## P1 — Sopheak, the Professional Mechanic  *(primary)*

- **Profile:** 32, 10 years' experience, independent garage. Strong hands-on
  skills, self-taught diagnostics. Phone always within reach; laptop rarely.
- **Goals:** fix cars fast and *right the first time*; avoid comebacks; keep
  earning respect and repeat customers.
- **Frustrations:** modern cars are electronics-heavy; reference data is
  English/desktop; wastes time chasing the wrong part; forgets tricks he figured
  out months ago.
- **Daily workflow:** receives 4–8 cars/day, mixes quick jobs with 1–2 hard
  diagnostics; leans on memory and phone group chats when stuck.
- **How MT helps:** guided diagnosis with ranked causes + next test; confirm before
  replacing; one-tap case save so his own fixes become a searchable memory.

---

## P2 — Bora, the Garage Owner / Master Tech  *(secondary, high influence)*

- **Profile:** 45, owns a 6-bay shop with 5 techs. Still the best diagnostician;
  now spends time unsticking juniors and protecting the shop's reputation.
- **Goals:** raise the whole team's diagnostic quality; stop knowledge leaving with
  staff; reduce costly wrong repairs and comebacks.
- **Frustrations:** juniors repeat the same mistakes; expertise trapped in his head;
  no way to standardize "how we diagnose here."
- **Daily workflow:** floats between bays, reviews tough jobs, trains, handles the
  hardest cars himself.
- **How MT helps:** the shop's shared **repair-case library** and **common
  mistakes** turn his experience into a team asset; juniors self-serve answers he'd
  otherwise repeat. *(Note: MT stays diagnosis/knowledge — not job scheduling,
  invoicing, or payroll.)*

---

## P3 — Dara, the Diagnostic Technician / Driveability Specialist  *(primary)*

- **Profile:** 38, the "diagnosis guy" other shops send hard cases to. Comfortable
  with scan tools, scopes, wiring diagrams, fuel trims.
- **Goals:** crack intermittent and complex faults efficiently; document reasoning;
  justify findings to the customer/other shops.
- **Frustrations:** deep data is fragmented across tools; hard to capture the *chain
  of evidence*; reinvents test procedures.
- **Daily workflow:** fewer cars, deeper jobs; heavy on measurement, live data,
  waveform analysis, hypothesis testing.
- **How MT helps:** evidence-based ranked causes, structured inspection flows,
  scan-tool data as input, and rich cases that record the *reasoning*, not just the
  outcome. Later: wiring diagrams, TSBs, known-failures (see `05`).

---

## P4 — Vichea, the Auto Electrician  *(primary)*

- **Profile:** 29, specializes in electrical/electronic faults, wiring, modules,
  parasitic draws, CAN/network issues.
- **Goals:** trace electrical faults quickly; avoid replacing good modules; work
  safely around HV where present.
- **Frustrations:** electrical faults are invisible and intermittent; wiring info
  hard to get; U-codes and network faults are time sinks.
- **Daily workflow:** voltage-drop tests, resistance checks, back-probing
  connectors, chasing grounds and communication codes.
- **How MT helps:** electrical-focused inspection flows, U-code interpretation,
  common wiring mistakes, and (roadmap) wiring diagrams + measured-value references;
  HV safety warnings when relevant.

---

## P5 — Sokha, the Hybrid / EV Specialist  *(primary, safety-critical)*

- **Profile:** 34, trained on high-voltage systems; one of few in the region who
  will touch a hybrid/EV battery.
- **Goals:** diagnose HV faults **safely and correctly**; protect herself and the
  vehicle; stay current as EVs grow.
- **Frustrations:** HV mistakes can be fatal; sparse local knowledge; fear/
  hesitation among peers slows the whole trade.
- **Daily workflow:** isolate HV, service-plug removal, insulation testing, block
  voltage analysis, cooling checks — all with strict safety discipline.
- **How MT helps:** **mandatory HV safety warnings** (isolate, service plug, class-0
  gloves), HV-specific inspection flows and tools, and cases that spread safe
  practice. Safety is a first-class output, never trimmed for brevity.

---

## P6 — Rithy, the Body Repair Technician  *(secondary)*

- **Profile:** 31, collision/body repair; increasingly must deal with ADAS sensors,
  cameras, and calibration after bodywork.
- **Goals:** restore structure and finish; correctly handle the electronics and
  calibrations that modern body repair now touches.
- **Frustrations:** body work now overlaps with electronics he's less trained on;
  SRS/airbag and sensor faults after repairs.
- **Daily workflow:** panel/structural repair, refinishing, reassembly, then
  clearing/verifying related electronic faults.
- **How MT helps:** SRS/Airbag **safety warnings**, body/electrical DTC lookups, and
  cases covering post-repair calibration pitfalls. *(Body system is already in the
  12 supported systems.)*

---

## P7 — Mr. Pheakdey, the Driving-School Instructor  *(secondary, education)*

- **Profile:** 50, teaches driving and basic vehicle awareness; not a deep
  diagnostician but must explain warning lights and basic faults to learners.
- **Goals:** explain what dashboard warnings mean; teach safe, informed vehicle
  ownership; recognize when a car is unsafe to drive.
- **Frustrations:** learners ask about warning lights he must explain simply;
  outdated printed materials.
- **Daily workflow:** classroom + in-car lessons; fields "what does this light
  mean?" constantly.
- **How MT helps:** plain-Khmer DTC/warning explanations and severity; a trustworthy
  reference to teach from. *(Lightweight/education use — not the core loop.)*

---

## P8 — Chanda, the Automotive Student / Apprentice  *(secondary, pipeline)*

- **Profile:** 20, vocational student / 1st-year apprentice. Eager, low experience,
  learns by doing and by watching seniors.
- **Goals:** build real diagnostic skill fast; understand *why*, not just *what*;
  become employable and trusted.
- **Frustrations:** theory-heavy schooling, little structured guidance on real
  faults; afraid of expensive mistakes.
- **Daily workflow:** assists seniors, does basic services, observes diagnostics,
  studies at night.
- **How MT helps:** ranked causes *with reasoning*, ordered inspection flows, common
  mistakes, and (roadmap) a training layer. MT becomes a patient mentor that
  explains the evidence — feeding the future talent pipeline.

---

## Persona → priority summary

| # | Persona | Tier | Primary value from MT |
| --- | --- | --- | --- |
| P1 | Professional mechanic | **Primary** | Speed + right-first-time + personal memory |
| P3 | Diagnostic technician | **Primary** | Evidence-based deep diagnosis + documentation |
| P4 | Auto electrician | **Primary** | Electrical/network fault tracing + safety |
| P5 | Hybrid/EV specialist | **Primary** | Safe, correct HV diagnosis |
| P2 | Garage owner / master tech | Secondary | Team knowledge retention & quality |
| P6 | Body repair technician | Secondary | SRS/ADAS safety + post-repair faults |
| P7 | Driving instructor | Secondary | Plain-language warning/DTC explanations |
| P8 | Student / apprentice | Secondary | Learning with reasoning (talent pipeline) |

**Design implication:** optimize the core loop for P1/P3/P4/P5 (the technicians who
reach for MT at the bench most often) — make their answer fast and get them back to
the vehicle. Serve P2/P6/P8 through shared cases, safety, and a training layer. Keep
P7 light. Never let secondary personas drag the product into management/POS
features, or toward engagement/screen-time goals.
