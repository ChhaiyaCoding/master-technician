# Universal Diagnostic Question Tree — Specification (TASK 004)

**Design specification only. No production code, no UI, no changes to the reasoning
engine.** This document defines the **questioning system** that decides which
question to ask **first**, **next**, and **never**, before the engine ever reaches a
physical Test Node.

It sits **upstream** of everything built so far:

```
 Complaint / DTC / Observation
          ▼
 ┌───────────────────────────────┐
 │  THIS DOCUMENT                │   Which SYSTEM is this?
 │  Universal Question Tree      │   Which question narrows it fastest?
 │  (symptom-level, mostly       │   Which questions are now irrelevant?
 │  selectable, no tools needed) │
 └───────────────┬───────────────┘
                 ▼
 diagnostic-reasoning-engine.md   →  ranks causes, picks the system(s), scopes evidence
                 ▼
 interactive-diagnostic-test-flow.md → Test Nodes (tools, measurements, OK/Not OK/Unknown)
```

The Question Tree asks **"what do you observe?"** questions (selectable, no tools).
The Test Flow (TASK 003) asks **"what do you measure?"** questions (tools required).
The boundary: once a system and a leading hypothesis are narrow enough that the next
useful step requires an instrument, the Question Tree **hands off** to a Test Node.

---

## 1. Why organize by SYSTEM, not by brand/model/year

A misfire is a misfire on a Toyota, a Ford, or a Hyundai — the **failure mechanism**
(spark, fuel, air, compression, mechanical) is universal automotive engineering. What
differs by brand/model/year is the **specific component name, location, and
specification** — and that detail already lives downstream, in the vehicle-scoped
knowledge the engine and Test Nodes use (`diagnostic-reasoning-engine.md` §3.1,
`database-schema.md`).

So this tree is organized the way a technician's *mind* is organized: **by system
first.** A Vehicle input (brand/model/year/engine/transmission) later **filters**
which systems even apply (e.g., no Hybrid/EV tree on a pure ICE truck; no Ignition
tree on a diesel — see §4) and supplies the specific component detail once a system
question narrows things down. The questions themselves — the *logic* — do not change
by brand.

---

## 2. Universal design principles

1. **System Isolation Rule.** Once a system is selected, **only that system's**
   questions (plus explicitly-triggered Shared-Cause Checkpoints, §6) are ever shown.
   An ABS diagnosis never sees a spark-plug question; an Engine-misfire diagnosis
   never sees a wheel-speed-sensor question — because those question sets are never
   even loaded, not because they're filtered out after the fact.
2. **Selectable first, typing last.** Every question offers discrete, tappable
   options. Free text exists only for content that cannot be enumerated (e.g., "when
   did it start" as a date, or a one-line description). This mirrors
   `ui-ux-guidelines.md` — minimal typing, fast answers.
3. **One question at a time, highest-value first.** Exactly like Test Node selection
   (`diagnostic-reasoning-engine.md` §8), the next question is the one that
   **discriminates the most** among the remaining possibilities — never a form, never
   a list of ten questions at once.
4. **Every answer must prune.** An answer that doesn't eliminate at least one branch,
   confirm a direction, or trigger a more specific question is the wrong question to
   have asked. This is the direct analogue of "every branch reduces uncertainty" from
   TASK 001–003.
5. **Vehicle powertrain gates system availability.** Diesel vehicles never see the
   Ignition (spark) tree. Non-hybrid/EV vehicles never see the Hybrid/EV trees. This
   pruning happens **before** the first question is even asked, using the Vehicle
   input already captured.
6. **Shared-cause awareness, not shared-cause guessing.** Some symptoms legitimately
   span systems (a weak battery can set ABS, airbag, and network faults at once). This
   is handled by explicit, **narrowly-triggered** Shared-Cause Checkpoints (§6) — never
   by asking irrelevant questions "just in case."
7. **DTCs shortcut the router.** If a DTC is already known, its prefix and range
   deterministically select the system — the entry router question is skipped
   entirely (§5). This is the fastest possible path and must always be preferred when
   available.
8. **Hand off the moment tools are needed.** The tree's job ends and the Test Flow's
   job begins the instant the next useful step is "measure something." The Question
   Tree never simulates a measurement with a selectable answer.

---

## 3. The Entry Router — mapping a complaint to a system

Before any system-specific question, the router asks the **fewest possible**
questions to determine which system tree to load.

### 3.1 Fast path — DTC known (preferred, skips the router)

| DTC prefix / range | Routes directly to system |
| --- | --- |
| `P00xx`–`P02xx` (fuel/air/ignition/misfire) | Engine → Fuel / Ignition / Air Intake (see §4 sub-routing) |
| `P04xx` (emissions/EGR/catalyst) | Exhaust |
| `P05xx`, `P01xx` (idle/speed, some fuel trim) | Engine → Fuel / Air Intake |
| `P06xx` (module/processor) | Electrical / CAN Communication |
| `P07xx`–`P08xx` | Transmission |
| `P0A9x`, HV-battery-specific | Hybrid / EV High Voltage |
| `C0xxx`–`C1xxx` | ABS / Brake / Suspension / Steering (by code detail) |
| `B0xxx` (restraint-specific) | Airbag |
| `B1xxx`–`B3xxx` (body/comfort) | Body Control / Air Conditioning |
| `U0xxx` | CAN Communication |
| ADAS-specific manufacturer codes | ADAS |

**Rule:** if a DTC is present, jump straight to that system's Q1 (§4) with the DTC and
its freeze-frame already loaded as evidence. No router question is wasted.

### 3.2 No DTC — Router Q1

> **"What best describes the concern?"** *(single-select; multi-select allowed if the
> customer reports more than one thing)*

| Option | Routes to | Notes |
| --- | --- | --- |
| Warning light only, engine/car runs fine | → ask *which* light (icon-based picker) → system by light | Fastest narrowing available without a code reader |
| Won't start / won't stay running | **Starting** (if it won't crank/fire) or **Engine** (if it starts then stops) | See Starting Q1 to split these |
| Runs but performs poorly (misfire, hesitation, power loss, rough idle) | **Engine** | Entry hub, sub-routes to Fuel/Ignition/Air Intake/Exhaust/Cooling |
| Unusual noise or vibration | ask *when* (idle / driving / braking / turning / bumps) → **Engine**, **Exhaust**, **Suspension**, **Steering**, or **Brake** | Noise timing is highly discriminating |
| Fluid leak or smell | ask fluid color/location → **Cooling**, **Engine (oil)**, or **Transmission** | |
| Braking concern | **Brake** (or **ABS** if a light is also on) | |
| Steering/handling concern | **Steering** or **Suspension** | |
| Electrical / accessory issue | **Electrical**, **Charging**, or **Body Control** | See Electrical Q1 to split |
| Climate control issue | **Air Conditioning** | |
| Hybrid/EV-specific behavior (only shown if Vehicle = hybrid/EV) | **Hybrid** or **EV High Voltage** | |
| ADAS warning / camera / sensor message | **ADAS** | |

**Multi-select handling:** if more than one category is chosen (e.g., "warning light"
+ "runs poorly"), the router does **not** open two independent question sets. It
opens the most specific one first (usually the warning light → DTC path, §3.1) and
treats the other as corroborating evidence, per the Shared-Cause logic in §6.

---

## 4. System question sets

Each system defines: **entry criteria**, **Q1** (the highest-value first question,
with a full effect table), the **most important Q2 branch**, and an explicit
**isolation note** — what this system deliberately never asks.

Format for every table below: **Answer → Effect on direction → Next question →
Eliminated questions.**

---

### 4.1 Engine (performance/drivability — entry hub)

**Entry criteria:** engine runs (at least sometimes) but performs poorly; complaint
mentions misfire, hesitation, power loss, rough idle, knocking, smoke, or overheating;
or a `P0xxx` performance-range DTC with no more specific prefix match yet.

**Q1 — "Which best describes what the engine is doing?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Misfire / rough idle | → **Ignition** + **Fuel** most likely; **Cooling/Exhaust** deprioritized unless smoke/temp also reported | Ignition Q1 (if not diesel) or Fuel Q1 (if diesel) | Cooling, Exhaust noise questions |
| Hesitation/stumble under acceleration | → **Fuel delivery** + **Air Intake** most likely | Air Intake Q1 | Cooling, Ignition-timing questions |
| Loss of power, no misfire feel | → **Air Intake/Exhaust restriction**, **Fuel supply** | Air Intake Q1 | Ignition-specific questions |
| Stalls while running (started fine, dies later) | → **Fuel supply interruption** or **Ignition module**; note the *pattern* (constant vs. intermittent, recovers after rest) | Fuel Q1 (pattern question) | Starting-system questions (it already started) |
| Knocking / unusual mechanical noise | → **Mechanical** (bearing, detonation) — away from ignition/fuel electrical checks | Ask fuel octane / recent fuel; escalate to Test Flow | Injector/coil-specific questions |
| Excessive exhaust smoke | → ask smoke **color** next | "What color is the smoke — white, blue, or black?" | Everything except the matching branch (white→Cooling, blue→mechanical/oil, black→Fuel/Exhaust rich) |
| Overheating | → routes entirely to **Cooling** | Cooling Q1 | Ignition, Fuel-pressure questions |

**Isolation note:** Engine never asks about wheel-speed sensors, ABS, brakes,
steering, or airbags — those question sets are never loaded here.

---

### 4.2 Fuel

**Entry criteria:** routed from Engine (misfire/hesitation/power-loss/stall
branches), a fuel-pressure/trim DTC, or complaint mentioning "runs out of fuel
feeling," "stalls and restarts after resting."

**Q1 — "Does the problem relate to temperature or run time?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Happens when cold | → cold-start enrichment / cold-sensitive components | Ask cold-start specifics | Heat-soak questions |
| Happens when warm/hot | → heat-soak issues (vapor lock on gasoline; injector back-leak worsening with heat on diesel) | Ask diesel vs. gasoline (below) | Cold-start questions |
| No correlation — random | → broader supply issue (filter, pump, tank level, contamination) | Ask fuel level/refuel history | Temperature-specific branches |
| **Runs briefly, stalls, recovers after resting — repeats** | → **strong signature of starvation or a leak/regulation fault** (this is the exact pattern from the Hiace `P0093` case) | Hand off to Fuel Test Flow (rail-pressure hold test, TASK 003 T1) | Ignition-timing, mechanical-compression questions |
| Unknown | → ask a simpler proxy: "does it happen more in the city or highway, or right after refueling?" | (re-ask above) | — |

**Q2 (highest value after Q1) — "Is this a diesel/common-rail system or a
gasoline system?"** *(usually already known from Vehicle input — asked only if
ambiguous)* → determines whether rail-pressure/common-rail questions apply or
conventional fuel-pressure-regulator questions apply; **eliminates** the wrong branch
entirely (never ask about "carburetor float level" on a common-rail diesel).

**Isolation note:** Fuel never asks about spark timing, wheel sensors, or HVAC.

---

### 4.3 Ignition

**Entry criteria:** routed from Engine misfire branch — **and only on gasoline/spark
vehicles.** Diesel vehicles have no spark ignition system, so **this entire tree is
removed from the router for diesel vehicles** before Q1 is ever asked — the clearest
example of powertrain-based pruning (principle 5, §2).

**Q1 — "Is the misfire on one specific cylinder, or does it move / affect multiple
cylinders?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| One specific cylinder | → localized coil/plug/injector for that cylinder — ready for a swap test | Hand off to Test Flow (coil/plug swap test) | Systemic fuel-trim/vacuum questions |
| Multiple / random cylinders | → systemic cause: vacuum leak, low fuel pressure, weak charging (affects all coils), timing | Route to **Charging** shared-cause checkpoint first, then Fuel | Single-cylinder localization questions |
| Unknown / hasn't checked | → recommend the swap test directly | Hand off to Test Flow | — |

**Isolation note:** never asked on diesel vehicles at all; never asks about ABS,
brakes, or HVAC.

---

### 4.4 Cooling

**Entry criteria:** routed from Engine overheating branch, coolant-temp DTC, or
complaint of "runs hot," "steam," "coolant loss."

**Q1 — "Does the temperature rise gradually, spike suddenly, read high from a cold
start, or fluctuate up and down?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Gradual rise while driving/idling | → classic insufficient cooling: fan, radiator flow, low coolant, water pump | "Any visible coolant loss?" | Sensor-circuit questions |
| Sudden spike | → thermostat stuck, or a sudden loss event (hose/water-pump failure) | "Any visible coolant loss?" | Gradual-cause questions |
| **High from cold start (immediately)** | → **likely a sensor/gauge/wiring fault, not real overheating** — reroute to **Electrical** (temp sensor circuit) | Electrical circuit check | **All mechanical cooling questions deferred** until sensor is confirmed good |
| Fluctuates up/down | → thermostat sticking intermittently, or an air pocket | "Has the system been bled/serviced recently?" | — |

**Isolation note:** never asks about ignition, transmission shifting, or ABS.

---

### 4.5 Air Intake

**Entry criteria:** routed from Engine hesitation/power-loss branch, MAF/MAP/boost
DTC, or turbocharged vehicles with "whistling," "loss of power under load."

**Q1 — "Is this engine turbocharged, and does the problem happen mainly under
acceleration/load?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Turbocharged + happens under boost/load | → boost leak, wastegate, turbo failure, intercooler leak | "Any hissing/whistling, especially accelerating?" | Naturally-aspirated-only questions |
| Turbocharged but happens at idle too | → broader vacuum/intake leak, not boost-limited | Same as above | — |
| Naturally aspirated, general power loss | → filter restriction, MAF contamination, unmetered air leak, throttle body | "Any hissing/whistling?" | Wastegate/intercooler/turbo-specific questions |
| Unknown if turbocharged | → answered from Vehicle input if known; else ask directly | — | — |

**Isolation note:** never asks about brakes, transmission, or electrical charging.

---

### 4.6 Exhaust

**Entry criteria:** routed from Engine smoke/power-loss branch, catalyst/EGR/back-
pressure DTC, "loud," "rattling underneath," "smell."

**Q1 — "Is the concern a NOISE, a PERFORMANCE issue, a WARNING LIGHT, or a SMELL in
the cabin?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Noise (loud/rattle) | → physical exhaust system (leak, loose heat shield, damaged pipe) — visual focus | "Where does the noise seem to come from (front/mid/rear)?" | Catalyst-efficiency data questions |
| Performance / power loss | → possible restriction (clogged cat/DPF) | "DPF (diesel) or gasoline catalytic converter?" | Noise-only questions |
| Warning light / emissions code | → catalyst-efficiency or EGR — **check upstream causes (misfire, oil consumption) before condemning the catalyst** | Route to Engine misfire check first if not already ruled out | Physical-noise questions |
| Smell of exhaust in cabin | → **safety-relevant** (possible CO risk) — elevate priority | Immediate visual/physical inspection | — |

**Isolation note:** never asks about steering, suspension, or HVAC.

---

### 4.7 Transmission

**Entry criteria:** routed from complaint "shifting," "slipping," "won't move," or a
`P07xx`–`P08xx` DTC.

**Q1 — "Does it slip/shift poorly, fail to move at all, fail in one specific gear, or
make noise?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Slips or shifts harshly/late | → fluid condition/level, solenoid, or clutch wear | "Checked fluid level/condition recently?" | Engine-side ignition/fuel questions |
| Won't move in ANY gear | → severe: fluid level catastrophic, linkage, or internal failure — higher urgency | Fluid check first (cheapest) | Single-gear-specific questions |
| Won't move in ONE gear only | → highly localized to that gear's clutch pack/solenoid | Hand off to Test Flow (pressure test for that circuit) | General fluid/linkage questions |
| Delayed engagement (pause before moving) | → low fluid, worn clutches, or valve-body wear | Fluid check first | — |
| Noise while driving/shifting | → mechanical/bearing, less fluid-related | Ask noise timing (constant vs. only when shifting) | Fluid-condition questions |

**Isolation note:** never asks about ignition, spark plugs, or HVAC.

---

### 4.8 ABS

**Entry criteria:** ABS/VSC warning light, `C0xxx`/`C1xxx` DTC, "wheel lock," "brake
pedal pulses."

**Q1 — "Is the ABS light constant, intermittent, only at certain speeds/turning, or
does it come on with other warning lights too?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Constant ON | → stored fault: sensor or module | Read DTC / hand to Test Flow | — |
| Intermittent | → wiring/connector, or contamination on tone ring | "Worse when wet/dirty?" | — |
| Only at certain speed or while turning | → **strongly points to a specific wheel-speed sensor/tone ring** (signal quality varies with speed) | "Which wheel — or all of them?" | Module-replacement questions (premature) |
| Comes on WITH other warning lights | → **Shared-Cause Checkpoint triggers** — check charging/voltage **first**, before any wheel-specific question | Charging system Q1 (§6.1) | All wheel-speed-sensor questions, deferred until voltage is cleared |

**Isolation note:** **ABS never asks about spark plugs, ignition timing, fuel
pressure, coolant, or air conditioning** — this is the explicit example requested:
those question sets are never loaded for an ABS diagnosis.

---

### 4.9 Brake

**Entry criteria:** complaint "noise," "pull," "soft pedal," "grinding," "vibration
while braking" — with or without an ABS light.

**Q1 — "What is the primary brake concern?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Noise (squeal/grind) | → pad/rotor wear — physical inspection first | "Only when braking, or constant rubbing?" | ABS wheel-speed questions (unless light also on) |
| Pulling to one side | → uneven pad wear, sticking caliper, or **alignment/suspension involvement** | Cross-reference **Suspension** Q1 | — |
| Soft or spongy pedal | → air in lines or fluid leak | "Fluid level normal?" | Rotor/vibration questions |
| Hard or long pedal travel | → booster/vacuum assist issue, or mechanical binding | Hand to Test Flow (booster test) | — |
| Vibration/pulsation while braking | → rotor thickness variation/warping | Hand to Test Flow (rotor runout/thickness measurement) | Fluid-related questions |
| Warning light (fluid/pad) | → check fluid level/pad-wear sensor first (cheap, fast) | — | — |

**Isolation note:** never asks about engine ignition/fuel unless the complaint is
unrelated braking-during-stall confusion (rare; would be re-routed via Engine).

---

### 4.10 Steering

**Entry criteria:** "hard to turn," "wanders," "noise when turning," "vibration
through the wheel."

**Q1 — "Is it EFFORT-related, STABILITY-related, or NOISE/VIBRATION while turning?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Feels heavy/hard | → power-steering assist fault (hydraulic pump/fluid or EPS motor) | "Hydraulic or electric power steering?" (from Vehicle if known) | Suspension-wear questions |
| Feels too light/loose | → excessive play — linkage, rack, or column wear | Hand to Test Flow (play measurement) | Power-assist questions |
| Wanders or pulls | → **may not be steering at all** — alignment or suspension wear | Cross-reference **Suspension** Q1 | Power-steering-specific questions |
| Noise when turning | → CV joint, power-steering pump whine, or strut noise | "Noise increases with wheel angle or with speed?" | — |
| Vibration through the wheel | → **often actually a Suspension/wheel-balance issue** | Cross-reference **Suspension** Q1 | Power-steering questions |

**Isolation note:** never asks about ABS module faults or engine performance.

---

### 4.11 Suspension

**Entry criteria:** "noise over bumps," "poor ride," "uneven tire wear," or
cross-referenced from Steering/Brake.

**Q1 — "Where does the issue seem to come from?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| One specific corner (FL/FR/RL/RR) | → focus inspection to that corner (strut, ball joint, bushing) — highly efficient | Hand to Test Flow (corner inspection) | Opposite-side and general questions |
| General / can't localize | → broader inspection, or all-corner mileage-related wear | "Does it happen over bumps, braking, or turning?" | — |
| Ride quality / handling only, no noise | → dampers/shocks focus, less likely a worn joint (which usually clunks) | Hand to Test Flow (damper test) | Joint/bushing-noise questions |

**Isolation note:** never asks about power-steering-motor or engine questions unless
cross-referenced.

---

### 4.12 Electrical (general power/wiring/ground)

**Entry criteria:** "multiple things acting up," "intermittent gremlins," "lights
flicker," or triggered as a Shared-Cause Checkpoint from another system.

**Q1 — "Is more than one system or component affected at the same time?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Yes, multiple unrelated things | → **strongly points to a shared cause**: battery/charging/ground/main fuse | Route to **Charging** Q1 first | All mechanical, system-specific questions (ABS wheel sensors, brake pads, etc.) |
| No, just one component/circuit | → localized circuit fault | "Completely dead, or works sometimes (intermittent)?" | Charging-system questions (not yet implicated) |
| Unknown | → ask simply whether other things (lights, radio, gauges) glitch at the same time | (re-ask above) | — |

**Isolation note:** Electrical is about power delivery and wiring — it never asks
about mechanical wear, pad thickness, or refrigerant pressure.

---

### 4.13 Charging

**Entry criteria:** triggered from Electrical shared-cause checkpoint, "battery
light," "dies overnight," "dim lights," battery-voltage DTC.

**Q1 — "Does it happen while DRIVING, when trying to START, or both?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Battery light on while driving | → alternator/charging output issue | Hand to Test Flow (charging voltage under load) | Starter-motor-specific questions |
| Battery dead/weak at start only | → battery health, age, or parasitic draw — not necessarily a charging-system fault | "How old is the battery / tested recently?" | Alternator-output questions (not yet implicated) |
| Both | → charging test still first (cheap, fast, discriminates) | Hand to Test Flow | — |

**Isolation note:** never asks about starter-motor cranking mechanics (that's
Starting) unless both overlap.

---

### 4.14 Starting

**Entry criteria:** "won't start," "clicks but nothing," "cranks but won't fire,"
crank/cam-sensor DTC.

**Q1 — "When you try to start, what happens?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Nothing at all — no sound | → dead battery, main power/ground, ignition switch, or immobilizer | Cheap battery/voltage check first | Fuel/spark-delivery questions (engine isn't even cranking) |
| Clicks but doesn't turn over | → weak battery, bad starter solenoid, or poor connections | Hand to Test Flow (voltage-drop at starter) | Fuel/spark questions |
| **Cranks but doesn't fire** | → engine mechanically turns fine — **focus shifts entirely to fuel/spark delivery during crank** | Route to **Fuel** Q1 and/or **Ignition** Q1 | **All starter-motor/solenoid/cranking-capacity questions — cranking is confirmed working** |
| Starts then dies immediately | → stall-on-start pattern — ties back to **Fuel** supply, or an anti-theft/security cutoff | Route to **Fuel** Q1 | Starter-mechanical questions |
| Slow/labored cranking | → battery, connections, or starter draw | Hand to Test Flow (battery/voltage-drop) | Fuel/spark questions (cranking itself is the issue) |

**Isolation note:** the moment cranking is confirmed normal, **every starter-motor
question disappears** — this is one of the clearest pruning examples in the whole
tree.

---

### 4.15 CAN Communication

**Entry criteria:** `U0xxx` DTC, multiple modules unresponsive, "many lights on at
once," "gauges dead," scan tool can't reach one or more modules.

**Q1 — "Are ALL modules unreachable, only SOME, or are reachable modules reporting
others as lost?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| All modules unreachable | → main power/ground to the OBD connector, or total bus failure | Cheap universal check: main fuse/ground/battery **first** | Every module-specific mechanical question — deferred entirely until the bus/power is cleared |
| Only some specific modules | → localized wiring/connector, or a bus-segment issue | "Which modules — do they share a harness routing?" | Modules confirmed reachable are no longer suspects |
| Reachable modules report others as lost | → the affected modules are fine; the modules **they can't reach** are the suspects | Narrow directly to those modules' wiring | — |

**Isolation note:** this is the formalized Shared-Cause Checkpoint for network faults
— system-specific questions for every named module are deferred until network/wiring
is cleared (§6.2).

---

### 4.16 Airbag (SRS)

**Entry criteria:** airbag warning light, `B0xxx` DTC.

⚠ **Safety gate — stated before Q1, not after:** disconnect the battery and allow the
reserve capacitor to discharge before any physical connector work; never probe squib
circuits directly.

**Q1 — "Is the light constant with no recent related work, did it appear after recent
repair/seat work/accessory install, after a collision, or is it intermittent?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Constant, no recent work/collision | → component or wiring degradation (clock spring, sensor, connector age) | Read stored SRS code | — |
| **After recent repair/seat work/accessory install** | → **strongly suspect the disturbed connector from that work** | Check that specific connection first | General degradation questions |
| After a collision (even minor) | → may involve deployed/damaged components or a needed reset | Full inspection path | — |
| Intermittent / flickers | → connector/wiring fault, often the clock spring (rotation-related) | "Worse with steering wheel turned a certain way?" | — |

**Isolation note:** never asks about charging/electrical unless a voltage-related code
is specifically present.

---

### 4.17 Body Control

**Entry criteria:** complaint about comfort/convenience — windows, locks, lighting,
wipers, keyless entry — non-safety-critical.

**Q1 — "Which body function is affected?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Power windows/locks | → localized switch/motor/relay for that function | "Switch, motor, or all windows fail?" | Unrelated body functions |
| Exterior/interior lighting | → localized bulb/relay/circuit | "One bulb or the whole circuit?" | — |
| Wipers/washers | → localized motor/switch/relay | — | — |
| Comfort features (mirrors, seats) | → localized motor/switch | — | — |
| **Multiple unrelated functions** | → **shared cause: BCM power/ground or a shared fuse** — route to Electrical/Charging checkpoint | Electrical Q1 | Individual per-function questions |
| Keyless entry/remote start | → may involve immobilizer/security, different (RF/antenna) path | — | — |

**Isolation note:** never asks about ABS, airbag mechanics, or engine performance
unless a shared BCM fault is suspected.

---

### 4.18 Air Conditioning

**Entry criteria:** "not cold," "weak airflow," "noise," "smell from vents."

**Q1 — "Is it blowing WARM, cold-but-WEAK airflow, cycling unusually, noisy, or is
there a bad smell?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Not cold at all | → refrigerant charge, compressor engagement, or electrical control | "Does the compressor clutch engage (visible pulley spin)?" | Airflow/ductwork questions |
| **Cold but weak airflow** | → **blower motor, cabin filter, or ductwork — NOT a refrigerant issue** | Hand to Test Flow (blower circuit check) | **All refrigerant-pressure questions, skipped entirely** |
| Cycles on/off unusually | → pressure switch, electrical control, or charge issue | Hand to Test Flow (pressure-switch check) | — |
| Noise from compressor/system | → mechanical (compressor/clutch bearing) | Physical/mechanical inspection | Refrigerant-charge questions |
| Bad smell from vents | → evaporator contamination/mold — unrelated to cooling performance | Cabin filter/evaporator focus | Compressor/refrigerant questions |

**Isolation note:** never asks about engine ignition, brakes, or suspension.

---

### 4.19 Hybrid

**Entry criteria:** hybrid vehicles only (from Vehicle input); warning
triangle/reduced power, poor economy, "Ready" won't engage, unusual HV-component
noise.

**Q1 — "What is the specific concern — warning + reduced power, poor economy/no
assist, won't reach 'Ready,' noise, or a charging/regen issue?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Warning + reduced power | → HV fault detected, power limited for protection — **safety gate triggers immediately** | Code-based localization (HV-isolated) | Pure-ICE-only questions |
| Poor economy / no assist | → HV battery degradation (weak cells/blocks) or control strategy | Read-only data gathering, no isolation needed yet | — |
| **Won't reach 'Ready'** | → could be HV **or** the conventional **12V system** (many hybrids need a healthy 12V to boot the HV system) | **Ask about the 12V battery first** — cheap, non-hazard check, before assuming an HV fault | HV-isolation-requiring questions, deferred |
| Unusual noise from hybrid components | → mechanical (motor/generator bearing) or HV cooling pump | Physical/mechanical inspection | — |
| Charging/regen issue | → regenerative braking blend — cross-reference **Brake** | Brake Q1 | — |

**Isolation note:** never asks pure spark-plug-only questions unless the engine-assist
side is implicated; 12V is always checked before HV is assumed.

---

### 4.20 EV High Voltage

**Entry criteria:** EV vehicles only; reduced range/power, charging fault, warning
light, won't power on — no engine involved at all.

**Q1 — "Is the concern related to DRIVING, CHARGING, a warning light with no
symptom, or won't power on at all?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| Driving — power or range issue | → drive unit, HV battery, or thermal management — **safety gate** | Code-based localization | — |
| Charging issue | → onboard charger, charge port, or the EVSE/cable itself (may not be the vehicle's fault) | **"All chargers/cables, or just one?"** — cheap elimination first | Vehicle-side questions if only one charger fails |
| Warning light, no symptom | → lower urgency; gather codes/BMS data before physical inspection | — | Immediate physical-inspection questions |
| **Won't power on at all** | → **check the 12V auxiliary system first**, same logic as Hybrid | 12V check before HV assumption | HV-isolation questions, deferred |

**Isolation note:** no ICE-specific question ever appears (no engine); mechanical
engine questions never load for EV.

---

### 4.21 ADAS

**Entry criteria:** "lane-keep not working," camera/radar warning, "adaptive cruise
disabled," calibration message — often after windshield, bumper, or suspension work.

**Q1 — "Did this start after any recent work — windshield/camera area, bumper/radar
area, or alignment/suspension?"**

| Answer | Effect | Next question | Eliminated |
| --- | --- | --- | --- |
| After windshield/camera-area work | → **camera almost certainly needs calibration/aiming** — very high confidence | Hand directly to the calibration procedure | Broad fault-search questions |
| After bumper/radar-area work | → radar sensor alignment/calibration needed | Hand to calibration procedure | — |
| After alignment/suspension work | → ride-height/geometry changed — sensors need recalibration to the new reference | Hand to calibration procedure | — |
| No recent related work | → component fault, obstruction (dirt/damage), or wiring — broader search | "Is the camera/radar area clean, unobstructed, undamaged?" | Calibration-first assumption |

**Isolation note:** never asks unrelated electrical/mechanical questions; if recent
related work is confirmed, the tree skips straight to the calibration-need hypothesis
rather than a broad differential.

---

## 5. Global pruning rules (cross-cutting)

These apply **before** any system tree loads, using only the Vehicle input already
captured:

| Vehicle fact | Systems removed from the router entirely |
| --- | --- |
| Diesel engine | **Ignition** (no spark system) |
| Not a hybrid | **Hybrid** |
| Not an EV | **EV High Voltage** |
| No ADAS package / older vehicle | **ADAS** |
| Manual transmission | Automatic-specific Transmission sub-questions (torque converter, shift-solenoid electrical) — mechanical clutch questions substitute |

**Rule:** a system that cannot physically exist on this vehicle is never offered as an
option — not hidden after being shown, **never presented at all.**

---

## 6. Shared-Cause Checkpoints (cross-system, explicitly triggered)

These are **not** asked by default. They fire only when a specific trigger condition
is met, and they **pause** the current system's deeper questions until resolved —
because answering them first is *more* valuable, not less relevant.

### 6.1 Voltage / Charging Checkpoint
- **Triggers when:** more than one unrelated system reports a fault at once (ABS +
  another light; multiple Body Control functions; any Electrical "multiple things"
  answer; Starting "won't reach Ready").
- **Question:** "Is the battery/charging system known good, or untested?"
- **Effect:** if untested or suspect, **all** the triggering systems' deeper questions
  pause until Charging Q1 resolves — a weak battery explains many symptoms at once far
  more cheaply than chasing each one individually.

### 6.2 Network / CAN Checkpoint
- **Triggers when:** two or more modules are simultaneously unreachable or reporting
  communication-lost codes.
- **Question:** CAN Communication Q1 ("all modules, some modules, or reachable
  modules reporting others lost?").
- **Effect:** every implicated module's system-specific questions pause until the
  bus/wiring/power is cleared.

### 6.3 Ground Integrity Checkpoint
- **Triggers when:** symptoms appear across circuits that share a common ground point
  (e.g., multiple accessories on one side of the vehicle misbehave together).
- **Question:** "Do the affected items share a location or ground point (e.g., all on
  one side, all near one connector)?"
- **Effect:** narrows to a shared ground before treating each symptom as independent.

**Design rule:** a Shared-Cause Checkpoint is only ever triggered by an **explicit,
named condition** (multiple simultaneous faults, multiple unreachable modules, shared
physical location) — never asked speculatively. This keeps it consistent with
principle 6 (§2): shared-cause *awareness*, not shared-cause *guessing*.

---

## 7. Dynamic question selection — how "highest value next" is chosen

For any system, at any point, the next question is chosen by the same logic as Test
Node selection (`diagnostic-reasoning-engine.md` §8), applied to *questions* instead
of *measurements*:

> **Value = (how many remaining branches this question's answer would eliminate) ×
> (how easily it can be answered — selectable beats free text, observation beats
> requiring a tool) ÷ (risk the answer is unreliable, e.g., a customer's guess vs. a
> technician's observation).**

Rules that follow from this:
1. **Never ask a question whose every possible answer leads to the same next step.**
   If the answer wouldn't change the direction, it isn't worth asking (identical to
   the Test Flow's "every branch must reduce uncertainty").
2. **Prefer questions answerable without tools before tool-based ones.** Selectable
   observation questions come first; the moment a question requires an instrument, it
   is no longer a Question-Tree question — it is a Test Node (hand off to TASK 003).
3. **Prefer questions that split the remaining possibilities roughly in half** over
   questions that only shave off a small fraction (same divide-and-conquer principle
   as the engine).
4. **Higher-reliability sources answer first when available.** A technician's direct
   observation outranks a customer's secondhand description; if both are available,
   ask in that order.

---

## 8. Worked example — zero wasted questions (Hiace, `P0093`)

Tying back to the TASK 002/003 case, showing the router in action:

```
DTC already known: P0093
        ↓ (§3.1 fast path — router SKIPPED entirely)
Routes directly to: Fuel system, Q1
        ↓
Fuel Q1: "Does it relate to temperature/run time?"
   Answer: "Runs briefly, stalls, recovers after resting — repeats"
        ↓ (this single answer matches the complaint AND narrows immediately)
Effect: strong starvation/leak signature — Ignition tree never loaded (diesel has
        none anyway, §4.3), Cooling/Exhaust/Transmission never touched,
        ABS/Brake/Steering/Electrical never touched.
        ↓
Hands off directly to Test Flow: T1 Rail-Pressure Hold Test (TASK 003)
```

**Zero irrelevant questions were asked.** The DTC shortcut skipped the router;
diesel-powertrain pruning removed Ignition before it could ever appear; one
selectable answer produced a strong, correctly-directed hand-off to the Test Flow.
This is the tree behaving exactly as specified: **it never wastes the mechanic's
time, and it never asks a question the vehicle or the evidence has already ruled
out.**

---

## 9. Self-checks (apply to every system entry before it is considered complete)

1. **Entry criteria stated** — what routes here (complaint keywords, DTC range, or
   Shared-Cause trigger).
2. **Q1 is genuinely the highest-value first question** — its answers meaningfully
   split the system's leading hypotheses.
3. **Every answer has an effect, a next question (or hand-off), and an elimination
   list.** No answer is a dead end.
4. **Options are selectable** wherever the answer space is enumerable; free text is
   the exception, not the default.
5. **No answer requires a tool** — the moment it would, the flow hands off to a Test
   Node (TASK 003), it does not fake the measurement as a question.
6. **Isolation note present** — explicitly states what this system never asks, so
   cross-contamination (spark plugs in ABS, wheel sensors in Engine) is structurally
   impossible.
7. **Powertrain-gated systems (Ignition, Hybrid, EV, ADAS)** are removed from the
   router for vehicles that cannot have them — never merely hidden after being asked.

---

## 10. Summary

The Universal Diagnostic Question Tree is the **first filter** a mechanic's report
passes through — before any test, before any tool. Organized by **system**, not by
brand, it works identically on a 2008 Hiace or a 2024 EV, because the *logic* of "what
question narrows this fastest" is universal; only the vehicle-specific detail changes,
and that arrives downstream.

Its discipline mirrors the technician's own: **ask the fewest questions that carry the
most weight, never ask something the system or the evidence has already ruled out, let
every answer move the diagnosis forward, and hand off to real tests the moment
observation alone can't go further.** It behaves like a senior technician doing the
intake interview — quick, sharp, and never off-topic.
