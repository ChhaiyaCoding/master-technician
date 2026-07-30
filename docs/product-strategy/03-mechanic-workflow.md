# 03 — Mechanic Workflow

The mechanic's real workspace is the vehicle, not the phone. Master Technician's
role is to provide **instant assistance at specific decision points** in the repair
process — a few seconds of reference, then the tech is back at the car. This maps
the complete workflow and shows *where* a quick answer helps: today (✅), planned
(🔜), or future (🌐).

The mechanic does not stay in the app between steps. At each marked point they may
**open → find the answer in seconds → close → continue the repair.** The value is
measured in **searching time removed**, not time spent on screen.

## The complete loop

```
        ┌─────────────────────────────────────────────┐
        │                                             │
   1. Receive vehicle                                 │
        ↓                                             │
   2. Interview customer                              │
        ↓                                             │
   3. Identify symptoms                               │
        ↓                                             │
   4. Scan DTC                                        │
        ↓                                             │
   5. Inspect vehicle                                 │
        ↓                                             │
   6. Measure values                                  │
        ↓                                             │
   7. Identify root cause                             │
        ↓                                             │
   8. Repair                                          │
        ↓                                             │
   9. Verify repair                                   │
        ↓                                             │
   10. Save repair case                               │
        ↓                                             │
   11. Learn from experience ─────────────────────────┘
        (feeds back into steps 3–7 next time)
```

The loop is a **flywheel**: every saved case (step 10) makes future diagnosis
(steps 3–7) faster and more accurate. That feedback is the product's long-term moat.

---

## Step-by-step: where Master Technician helps

### 1. Receive vehicle
- **Tech does:** greets customer, notes vehicle, warning lights, obvious issues.
- **MT helps:** start a diagnosis session; capture **Vehicle** (brand/model/year/
  engine/transmission/mileage) with quick-pick chips. ✅
- **Future:** VIN scan / plate lookup to auto-fill the vehicle. 🔜

### 2. Interview customer
- **Tech does:** asks when/how the problem happens (cold/hot, idle/driving, noise,
  smell, frequency).
- **MT helps:** **Ask Expert** models good interviewing by returning **structured
  follow-up questions** when info is missing — a checklist the tech can ask the
  customer. ✅
- **Future:** a guided customer-intake questionnaire template per symptom. 🔜

### 3. Identify symptoms
- **Tech does:** translates complaint into a technical symptom on a system.
- **MT helps:** **Symptom Input** — pick the system (12 systems), describe the
  problem, attach photos and scan-tool notes. ✅
- **Future:** voice-to-text capture (hands greasy), symptom suggestions. 🔜

### 4. Scan DTC
- **Tech does:** pulls codes and freeze-frame with a scan tool.
- **MT helps:** enter DTC codes; **DTC Search** gives meaning, related systems,
  causes, inspection flow, and **common mistakes**. ✅
- **Future:** direct scan-tool/OBD ingestion (import codes + live data instead of
  typing). 🌐

### 5. Inspect vehicle
- **Tech does:** visual + physical checks guided by the codes/symptoms.
- **MT helps:** **Diagnosis Result** provides an **ordered inspection procedure** and
  the **tools needed**; DTC pages include inspection flows. ✅
- **Future:** interactive checklists that record pass/fail per step. 🔜

### 6. Measure values
- **Tech does:** compression, pressures, voltages, waveforms, live-data reading.
- **MT helps:** inspection steps tell the tech *what* to measure and in what order;
  scan-tool report field captures live/freeze-frame data. ✅
- **Future:** **known-good measured-value references** ("what should this read?"),
  and attaching measurements/waveforms to the case. 🌐 (see `05` L6/L8)

### 7. Identify root cause
- **Tech does:** narrows to the actual fault, confirming before replacing.
- **MT helps:** **ranked possible causes** with confidence + **reasoning/evidence**;
  the app **refuses to guess** and asks for more data when unsure. ✅
- **Future:** AI grounded in the DTC base + the shop's own cases for sharper,
  vehicle-specific ranking. 🌐 (see `06-ai`/roadmap Phase 3)

### 8. Repair
- **Tech does:** performs the fix; replaces parts; follows procedure.
- **MT helps:** **recommended repair** guidance and **safety warnings** (HV/SRS/
  brake) shown *at the moment of the work*. ✅
- **Future:** step-by-step **repair procedures**, **torque specs**, **wiring
  diagrams** surfaced inline. 🌐 (see `05` L4–L6)

### 9. Verify repair
- **Tech does:** clears codes, road-tests, confirms the symptom is gone.
- **MT helps:** result includes verification guidance (clear codes, re-test, road
  test safely). ✅
- **Future:** a structured **verification checklist** and re-scan comparison. 🔜

### 10. Save repair case
- **Tech does:** (usually) forgets to document it.
- **MT helps:** **one-tap Save-as-case** prefilled from the diagnosis — records
  vehicle, symptom, DTCs, **root cause, repair, parts, notes, photos, tags**. ✅
- **Future:** faster templates, voice notes, auto-tagging. 🔜

### 11. Learn from experience
- **Tech does:** builds intuition over years — but knowledge stays in their head.
- **MT helps:** the **Repair Case Library** + **Similar Cases** turn each job into
  reusable, searchable knowledge; **common mistakes** prevent repeat errors. ✅
- **Future:** team/shared library, cloud sync, community cases, and an AI that
  learns from accumulated cases. 🌐 (see `05` L9–L10, roadmap Phase 4–5)

---

## Coverage summary

| Step | Today (✅) | Planned (🔜) | Future (🌐) |
| --- | --- | --- | --- |
| 1 Receive | Vehicle capture | VIN/plate scan | — |
| 2 Interview | Follow-up questions | Intake templates | — |
| 3 Symptoms | System + description + media | Voice capture | — |
| 4 Scan DTC | DTC search & meaning | — | OBD ingestion |
| 5 Inspect | Ordered inspection + tools | Interactive checklists | — |
| 6 Measure | What/when to measure | — | Known-good values, attach data |
| 7 Root cause | Ranked causes + evidence | — | Case-grounded AI |
| 8 Repair | Guidance + safety | — | Procedures/torque/wiring |
| 9 Verify | Verification guidance | Verify checklist | Re-scan compare |
| 10 Save case | One-tap save | Templates/voice | — |
| 11 Learn | Case library + similar | Team library | Community + AI learning |

## Design principle

Each interaction is a **brief, self-contained touch**, not a continuous session. The
app must open fast, deliver the needed information at a glance, and let the mechanic
put the phone down and return to the vehicle — one-hand operation, minimal taps, no
unnecessary interaction. The measure of success at every step is **how quickly the
tech gets back to the repair**, and case capture (step 10) must be fast enough that
it never feels like extra screen time. More time in the app is a cost to minimize,
not an outcome to pursue.
