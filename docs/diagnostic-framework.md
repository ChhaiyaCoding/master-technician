# Diagnostic Framework — How a Master Technician Thinks

This document describes the **thinking process** a professional automotive
technician uses to diagnose a vehicle. It is organized around the **real workshop
workflow**, not around software. It is generic: the same reasoning applies to
Engine, Transmission, ABS, Brake, Steering, Suspension, Electrical, Air
Conditioning, Hybrid, and EV systems.

The goal is not a checklist to follow blindly. It is the **discipline of evidence-
based reasoning** — how a Master Technician moves from a vague complaint to a
*proven* root cause, and why they refuse to guess.

---

## The mindset behind every diagnosis

Before the 15 steps, understand the principles that govern all of them. A Master
Technician holds these as instinct:

1. **A symptom is not a diagnosis. A DTC is not a diagnosis.** A trouble code names
   a *condition the computer detected*, not the *part that failed*. `P0301` means
   "cylinder 1 misfire," not "replace the coil." The code is a clue that points at a
   region to investigate — nothing more.

2. **Diagnose the cause, not the effect.** Many faults are downstream of something
   else. A weak battery can set ABS, airbag, and network codes at once. Fixing the
   effect (clearing codes, replacing the module) wastes time; the fault returns.

3. **No parts cannon.** Replacing parts to see what helps is not diagnosis — it is
   gambling with the customer's money and your reputation. **Confirm before you
   replace.** Every part swap must be justified by a measurement or a valid test.

4. **Follow the evidence; let measurements decide.** Intuition proposes; measurement
   disposes. When a reading contradicts your theory, the theory is wrong — not the
   meter.

5. **Change one variable at a time.** If you swap two things and it works, you don't
   know which one mattered. Isolate.

6. **Compare against known-good.** "Is this reading normal?" only has meaning against
   a specification or a comparable good component/circuit. Know the target before you
   measure.

7. **Think in the language of the system.** Nearly every fault is a break in one of:
   **power, ground, signal, control, load, or mechanical integrity.** Whatever the
   system, ask *which of these is failing?*

8. **Cheapest, fastest, most-accessible test that gives the most information, first.**
   Balance effort against how much a test *narrows the possibilities*. A five-minute
   visual that eliminates half the causes beats a two-hour teardown.

9. **Safety is not optional.** High-voltage (Hybrid/EV) and airbag (SRS) work can
   kill or maim. Road tests involve brakes and steering. Safety gates the whole
   process, not just the repair.

10. **You have not finished until you have proven the fix and understood *why* it
   failed.** Verification and understanding are part of the job, not extras.

---

## The 15-step diagnostic process

Each step answers a specific question, narrowing uncertainty. Together they form a
funnel: wide at the complaint, narrow at the confirmed root cause.

```
Complaint ─▶ Observe ─▶ Confirm ─▶ Evidence ─▶ Codes ─▶ Related systems
   ─▶ Possible causes ─▶ Prioritize ─▶ Inspect first ─▶ Measure
   ─▶ Interpret results ─▶ Root cause ─▶ Repair ─▶ Verify ─▶ Record
        (uncertainty shrinks at every arrow)
```

### 1. Customer complaint — *What does the driver actually experience?*
- **The question:** what is wrong, in the customer's words, and under what
  conditions?
- **The thinking:** the complaint is the starting coordinate. Extract the *when,
  where, how often, and how bad*: cold or hot? idle or driving? every time or
  intermittent? getting worse? Any noise, smell, vibration, warning light, or loss
  of function? What changed just before it started (a repair, an accident, fuel, a
  battery)?
- **Why it matters:** a precise complaint aims the whole investigation. "It runs bad"
  is useless; "it shudders at 60 km/h under light throttle when warm" is half the
  diagnosis.
- **Pitfall:** accepting the customer's *self-diagnosis* ("the alternator is bad") as
  fact. Record what they *experience*, not what they *conclude*.

### 2. Initial observations — *What do my own senses tell me?*
- **The question:** what can I see, hear, smell, and feel before touching a tool?
- **The thinking:** walk around the vehicle. Fluid leaks and their color/location.
  Warning lights on the dash. Tire condition and pressures. Obvious damage, corrosion,
  aftermarket wiring, rodent damage. Smells (coolant, burnt oil, fuel, hot brakes,
  electrical). Sounds at idle. Battery age. Service history and mileage context.
- **Why it matters:** many faults are found here for free. Observation also protects
  you from chasing a code while ignoring the puddle under the car.
- **Pitfall:** diving into the scan tool before looking at the vehicle.

### 3. Confirm the symptom — *Can I reproduce and witness it myself?*
- **The question:** does the fault actually occur, and can I make it happen on
  demand?
- **The thinking:** never diagnose a symptom you haven't verified. Reproduce the
  condition — test drive, load the system, recreate the temperature/speed/electrical
  state described. Feel the shudder, hear the noise, watch the light come on.
- **Why it matters:** you cannot fix what you cannot observe, and you cannot *verify*
  a repair later without a baseline. Confirming also filters out normal behavior the
  customer misread.
- **Intermittent faults:** if it won't reproduce, you must *capture* it — data
  logging, wiggle tests, temperature/vibration/moisture provocation, or leaving
  monitoring in place. An unconfirmed intermittent is diagnosed by *conditions*, not
  guesses.
- **Pitfall:** "fixing" a fault you never saw, then hoping.

### 4. Gather evidence — *What is the system actually doing?*
- **The question:** what does the live behavior and data tell me?
- **The thinking:** collect objective data around the confirmed symptom — live/serial
  data relevant to the system, freeze-frame conditions, operating temperatures,
  pressures, voltages, mechanical play, warning behavior. Note what is present *and
  what is absent* (a missing signal is evidence too).
- **Why it matters:** evidence turns opinion into fact and gives you the numbers to
  compare against known-good later.
- **Pitfall:** gathering random data instead of data *relevant to the confirmed
  symptom and the systems it implicates*.

### 5. Read DTC (if available) — *What has the system already flagged?*
- **The question:** what conditions have the control modules detected, and under what
  circumstances?
- **The thinking:** pull codes from *all* modules, not just the one with the light.
  Record them with their **freeze-frame** data (the operating conditions when the
  code set). Distinguish **current vs. history/pending** codes. Read a code as a
  *description of a monitored condition* — then ask *what could cause that condition?*
- **Codes are a starting point, not a conclusion.** A generic code (e.g. a
  transmission "control system malfunction") often requires reading manufacturer
  **sub-codes** to mean anything. Multiple codes may share one root cause (low
  voltage, a broken ground, a network fault taking modules offline).
- **No codes?** Absence of codes does not mean absence of fault — mechanical issues,
  faults below detection thresholds, and "runs bad but no light" problems are diagnosed
  by symptom and measurement, not codes.
- **Pitfall:** reading `P0420` and replacing the catalytic converter while a misfire
  is destroying the new one. The code is the *effect*.

### 6. Identify related systems — *What could plausibly be involved?*
- **The question:** given the symptom, codes, and evidence, which systems and
  sub-systems could produce this?
- **The thinking:** map the symptom to the chain of systems that could cause it.
  Systems interact: a lean engine code can come from the intake, fueling, exhaust
  (before the sensor), or a mechanical vacuum leak. An ABS fault can originate in a
  wheel-speed sensor, the hydraulic unit, wiring, *or* simply low system voltage.
  Consider shared resources: power, grounds, the communication network, and common
  sensors feed many systems at once.
- **Why it matters:** casting the right net prevents both tunnel vision (missing the
  real system) and boiling the ocean (checking everything).
- **Pitfall:** assuming the system named on the dash is the system at fault.

### 7. Generate possible causes — *What are all the ways this could happen?*
- **The question:** list every credible mechanism that could produce the confirmed
  symptom with this evidence.
- **The thinking:** brainstorm broadly and structure it by the failure categories:
  **power / ground / signal / control / load / mechanical.** For a misfire: ignition
  (spark), fuel (delivery/injector), air (vacuum leak), compression (mechanical),
  control (sensor/ECU), or wiring/connector. Keep the list complete before you start
  cutting it — a cause you never listed is a cause you'll never find.
- **Why it matters:** a good differential list is the backbone of diagnosis. It makes
  your reasoning explicit and testable.
- **Pitfall:** anchoring on the first plausible cause and stopping.

### 8. Prioritize the most likely causes — *What is probable, not just possible?*
- **The question:** of the possible causes, which are most likely *here*?
- **The thinking:** rank by **probability × evidence fit × ease of confirmation.**
  Weight by: what the freeze-frame conditions point to; the vehicle's known-failure
  patterns for that model/mileage; which causes explain *all* the evidence versus
  only some; and which are common versus rare. Prefer causes that explain the whole
  picture. Note which are *cheap and fast to confirm* — a high-probability cause that
  is also quick to test goes to the top.
- **Why it matters:** you cannot test everything at once; ranking directs effort where
  it pays off.
- **Pitfall:** chasing an exotic cause before ruling out the common, easy ones.

### 9. Decide what should be inspected first — *Where do I get the most information for the least effort?*
- **The question:** what is the single best next test?
- **The thinking:** choose the test that **best splits the remaining possibilities**
  (divide and conquer) while being accessible. The ideal first inspection *eliminates
  a whole branch* of causes regardless of outcome. Sometimes that's a visual; often
  it's a **swap/substitution** (move a component to another position and see if the
  fault follows), a **known-good comparison**, or checking **power and ground** at the
  suspect device before anything else.
- **Why it matters:** ordering tests well is the difference between a 20-minute and a
  2-hour diagnosis.
- **Pitfall:** starting with the most invasive or expensive test, or one whose result
  doesn't actually change what you do next.

### 10. Define required measurements — *What exactly will I measure, and against what target?*
- **The question:** what numbers do I need, with what tool, and what is the known-good
  value?
- **The thinking:** specify the measurement *before* taking it: voltage, resistance,
  current, pressure, compression, vacuum, waveform, temperature, clearance, live-data
  value. Know the **specification / expected range** first (a measurement without a
  target is just a number). Choose the right instrument and the right test point.
  Prefer measurements taken **under load / under the failing condition** — a circuit
  can read fine at rest and fail when it carries current (hence **voltage-drop
  testing** over static resistance for many electrical faults).
- **Why it matters:** measurement is where possibility becomes proof.
- **Pitfall:** measuring the easy thing instead of the *meaningful* thing; testing at
  rest a fault that only appears under load.

### 11. Explain how each result changes the diagnosis — *What does each outcome prove?*
- **The question:** for the test I'm about to run, what does each possible result tell
  me — and where does it send me next?
- **The thinking:** this is the heart of diagnostic reasoning. **Before** measuring,
  state the branches: *if the reading is X, then cause A is confirmed / eliminated and
  I go here; if it's Y, then B and I go there.* Each result should **eliminate or
  confirm** at least one branch of the differential. A test whose result wouldn't
  change your next action is a waste — don't run it.
- **The logic in practice:**
  - Reading **within spec** → that link in the chain is good; *move upstream/downstream*.
  - Reading **out of spec** → localize: is it the component, its power/ground/signal,
    or the wiring between? (A bad signal *at* a good sensor points at power/ground/
    wiring, not the sensor.)
  - **Swap test follows the fault** → the moved component is bad. **Fault stays put**
    → the cause is positional (wiring, connector, mechanical, that cylinder/corner).
- **Why it matters:** this turns a pile of measurements into a converging proof. It is
  also what separates a technician from a parts-changer.
- **Pitfall:** taking readings without a prior hypothesis about what they'd mean —
  data with no decision attached.

### 12. Narrow down the root cause — *What single fault explains everything?*
- **The question:** what is the one underlying cause that accounts for the confirmed
  symptom and all the evidence?
- **The thinking:** converge. Eliminate branches until one cause remains that explains
  *all* the observations — not most of them. Distinguish the **root cause** from
  contributing effects (the failed coil is the cause; the misfire code and the rough
  idle are effects). Ask *why did this fail?* — a chafed harness that killed a sensor
  means the harness is the root cause, and a new sensor alone will fail again.
- **Why it matters:** repairing the true root cause is what prevents comebacks.
- **Pitfall:** stopping at the first faulty component without asking what caused *it*
  to fail.

### 13. Recommend repair — *What is the correct, complete fix?*
- **The question:** what repair addresses the root cause, and what does doing it right
  require?
- **The thinking:** define the repair, the parts genuinely needed (justified by the
  diagnosis), and the correct procedure — including **torque, fluid types/levels,
  relearns/calibrations, and any collateral items** (fix the chafe, not just the
  sensor). Account for safety requirements before touching high-voltage or airbag
  circuits. Consider whether a known bulletin already documents the fix.
- **Why it matters:** a correct diagnosis with a sloppy repair still produces a
  comeback.
- **Pitfall:** replacing the failed part but ignoring what caused the failure, or
  skipping the required calibration/relearn.

### 14. Verify the repair — *Is it actually fixed, under the original conditions?*
- **The question:** does the symptom stay gone when I recreate the exact conditions
  that caused it?
- **The thinking:** clear codes, then **reproduce the original failing condition** (the
  same drive, load, temperature, speed) and confirm the symptom does not return and no
  new codes set. Re-check the live data you used as evidence — the fuel trim, the
  pressure, the voltage — and confirm it now reads normal. For safety systems, verify
  correct operation deliberately and safely.
- **Why it matters:** verification against the *original conditions* (step 3's
  baseline) is the only proof the job is done. "It seems fine in the bay" is not
  verification for a fault that only appeared at 60 km/h.
- **Pitfall:** clearing the code, seeing no light in the parking lot, and calling it
  done.

### 15. Record the final repair case — *What did I learn that my future self and shop should keep?*
- **The question:** what is the durable record of this diagnosis?
- **The thinking:** capture the vehicle, the confirmed symptom, the codes, the
  **evidence that mattered**, the **root cause**, the **repair performed**, the parts,
  and — most valuable — the **reasoning and any trap avoided** ("swap test proved the
  coil; don't replace all four; check the harness chafe"). A recorded case turns a
  one-time diagnosis into reusable knowledge and lets you (or a colleague) solve the
  same fault in minutes next time.
- **Why it matters:** experience only compounds if it is preserved. The best shops
  *remember*; the rest re-solve the same problems forever.
- **Pitfall:** finishing the repair and keeping the hard-won insight only in your head.

---

## The framework applied across systems

The same 15 steps hold everywhere; only the *specifics* change. This shows how the
generic reasoning lands in each system.

| System | Typical complaint | Confirm by | Related systems | Key measurements | Common root-cause traps |
| --- | --- | --- | --- | --- | --- |
| **Engine** | Rough idle, misfire, power loss, warning light | Reproduce under load/temp; feel/hear misfire | Ignition, fuel, air/intake, exhaust, sensors, mechanical | Fuel trims, compression, fuel pressure, ignition waveform, vacuum | Replacing parts for a code; ignoring a vacuum leak or mechanical compression loss |
| **Transmission** | Slipping, harsh/late shifts, no drive | Road test through the gears at the failing point | Engine load/signals, fluid condition, control module, sensors | Fluid level/quality, line pressure, gear-ratio/slip live data, solenoid function | Fixing a generic code without sub-codes; overlooking low/burnt fluid |
| **ABS** | ABS light, no ABS function, false activation | Reproduce; verify wheel-speed data | Base brakes, wheel bearings/tone rings, wiring, **system voltage**, network | Wheel-speed sensor waveform, voltage/ground at module, hydraulic function | Replacing the module when the real fault is low voltage or a wheel sensor/tone ring |
| **Brake (base)** | Pull, noise, vibration, long/soft pedal | Recreate braking event; measure | Hydraulics, ABS, wheel bearings, suspension geometry | Rotor thickness/runout, pad wear, hydraulic pressure, fluid condition | Treating a symptom (noise) without finding the mechanical/hydraulic cause |
| **Steering** | Wander, hard/heavy steering, noise, pull | Drive and feel; check at lock | Suspension, tires/alignment, EPS/hydraulic assist, sensors | Alignment angles, EPS current/data, play/free-travel, fluid (if hydraulic) | Aligning without finding worn components; blaming steering for a tire/suspension pull |
| **Suspension** | Noise over bumps, poor ride, uneven tire wear | Road test / bounce test; inspect under load | Steering, tires/alignment, ride-height sensors (if equipped) | Component play, ride height, damper performance, bushing/ball-joint wear | Replacing a noisy part without finding the worn joint actually causing it |
| **Electrical** | Dead/weak, intermittent, multiple odd faults | Reproduce; wiggle/provoke; load the circuit | Battery/charging, grounds, network, any powered module | **Voltage drop** under load, current, parasitic draw, ground integrity, waveforms | Chasing modules when the cause is a bad ground, low voltage, or a chafed harness |
| **Air Conditioning** | Not cold, weak airflow, noise | Run system; measure at operating state | Engine cooling, electrical/controls, cabin airflow | High/low side pressures, temperatures, compressor engagement, airflow | Adding refrigerant to a leak; blaming the compressor for a control/electrical fault |
| **Hybrid** | Warning triangle, reduced power, poor economy | Reproduce **after HV isolation for any HV work** | HV battery, inverter, engine, cooling, 12V system, network | Block/module voltages, insulation resistance, cooling, HV integrity | Working on HV unsafely; replacing a whole pack for one weak block; ignoring cooling |
| **EV** | Reduced range/power, charging fault, warnings | Reproduce; log; **HV safety first** | HV battery, drive unit, charging, thermal, 12V, network | Insulation resistance, cell/module voltages, thermal data, charging behavior | Bypassing HV lockout; diagnosing effects of a thermal/BMS fault as the drive unit |

**Read the pattern:** in every row the discipline is identical — confirm the symptom,
gather evidence, list causes across *power/ground/signal/control/load/mechanical*,
measure against known-good, let each result steer the next test, and prove the fix
under the original conditions. Only the tools and targets differ.

---

## The reasoning engine: how results steer the diagnosis

The through-line of steps 9–12 is a simple, repeatable logic the Master Technician
runs continuously:

```
Hypothesis  →  pick the test that best splits the remaining causes
            →  predict what each result would mean
            →  measure against known-good
            →  result CONFIRMS a branch   → follow it deeper
               result ELIMINATES a branch → discard it, pick the next best test
            →  repeat until ONE cause explains ALL the evidence
            →  ask "why did this fail?"  → that answer is the root cause
```

Two habits make this powerful:

- **Divide and conquer:** each test should ideally cut the remaining possibilities
  roughly in half, regardless of outcome. Halving beats poking.
- **Known-good comparison & substitution:** when unsure what "normal" is, compare to a
  spec, an identical circuit/component on the same vehicle, or swap a suspect part to a
  different position and see whether the fault *follows the part* (bad part) or *stays
  put* (positional cause — wiring, connector, mechanical).

---

## Safety as a constant overlay

Safety is not a step; it governs every step:

- **High-voltage (Hybrid / EV):** before *any* HV work — isolate the system, remove
  the service plug, use insulated (class-0) gloves and proper tools, and confirm
  de-energization. HV mistakes are potentially fatal. Diagnosis of HV faults is done
  *safely* or not at all.
- **Airbag / SRS:** disconnect the battery and allow the reserve capacitor to discharge
  before working; never probe squib circuits carelessly. A mistake can deploy an airbag
  into you.
- **Brakes & steering:** these are life-safety systems; verify operation deliberately,
  and conduct road tests in a safe place.
- **General:** support the vehicle properly, respect hot/rotating/pressurized
  components, and never let speed compromise safety.

When the system is HV or SRS, the safety overlay **precedes** step 9 (inspection) and
step 13 (repair). No diagnostic urgency justifies an unsafe action.

---

## The discipline in one paragraph

A Master Technician does not "know the answer" — they **run a reliable process** that
*finds* the answer. They confirm the complaint with their own senses, gather evidence
before forming an opinion, treat codes as clues rather than conclusions, list every
credible cause and rank it by probability and evidence, then run the test that best
narrows the field — always knowing in advance what each result will prove. They
converge on the one cause that explains everything, ask *why it failed* so the fix is
complete, prove the repair under the original failing conditions, and record what they
learned so the next diagnosis is faster. The tools change from Engine to EV; the
thinking does not.
