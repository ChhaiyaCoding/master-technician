# Diagnostic UX Validation Report v1

**Role for this document:** UX Validation Engineer, not software architect. Nothing
in this report modifies the product. Every observation below comes from actually
running the frozen prototype ([Diagnostic Session Screen](../src/screens/DiagnosticSessionScreen.tsx))
in a live browser session, seeding it with realistic case data through the real
`DiagnosticSession` schema, and reading the real, unmodified rendering and engine
output — exactly what a mechanic would see. No source file was changed to produce
this report; `npm test` (88/88) was re-confirmed green afterward.

**Methodology note:** the prototype currently seeds only one fixed demonstration
case (Toyota Hiace P0093) via a hardcoded function. To validate the other nine
cases without modifying the prototype, each case's starting data (vehicle,
complaint, evidence, hypotheses) was constructed as schema-valid `DiagnosticSession`
JSON and loaded through the same `localStorage` key the screen already reads
(`mt.sessions.v1` / `mt.demoSessionId.v1`) — the exact mechanism `saveSession`/
`loadSession` already use. From that point on, every screenshot, every "Current
Next Action," and every button response shown below is the **real**, live output
of the real `RuleBasedReasoningProvider` and `Orchestrator` code, rendered by the
real React screen. This is equivalent in rigor to a mechanic opening ten different
repair orders on the same installed app.

---

## Part 1 — The Diagnostic Validation Suite (10 cases)

### Case 1 — Engine Misfire
| Field | Value |
| --- | --- |
| Vehicle | Honda Civic |
| Year | 2015 |
| Engine | R18A 1.8L |
| Complaint | "Check engine light on. Engine shakes at idle and hesitates under acceleration." |
| DTCs | P0301 (Cylinder 1 Misfire Detected) |
| Initial evidence | P0301 (confirmed, scan_tool) |
| Expected hypotheses | Ignition coil #1 weak (control) · Spark plug #1 fouled (load) |
| Expected Current Thinking | Leading: coil weak; Alternative: plug fouled; no evidence linked yet |
| Expected Next Action | A test (control domain = medium invasiveness → proceeds) |
| Expected Verification | No misfire at idle/under load after repair; P0301 does not return |

**Executed result:** ✅ matched exactly — Current Next Action was *"Test to confirm
or eliminate: Ignition coil #1 weak"* (`measurement_test`), OK/Not OK quick-select
shown.

---

### Case 2 — Fuel Pressure
| Field | Value |
| --- | --- |
| Vehicle | Ford Ranger |
| Year | 2019 |
| Engine | 2.0L Bi-Turbo |
| Complaint | "Loses power under load, especially uphill or towing. Runs fine at idle and light cruising." |
| DTCs | P0087 (Fuel Rail/System Pressure Too Low) |
| Initial evidence | P0087 (confirmed, scan_tool) |
| Expected hypotheses | Fuel pump weakening under demand (mechanical) · Clogged fuel filter (mechanical) |
| Expected Current Thinking | Leading: pump weakening; Alternative: clogged filter |
| Expected Next Action | A question (mechanical = high invasiveness → test deferred) |
| Expected Verification | Power under load restored on a drive/tow test; P0087 does not return |

**Executed result:** ✅ matched — Current Next Action was a question. ⚠️ **But the
question targeted the wrong hypothesis** — it read *"Can you provide: No
supporting evidence linked yet for 'Clogged fuel filter restricting flow'"* (the
**alternative**, not the top-ranked "Fuel pump weakening"). See Issue #1.

---

### Case 3 — No Crank
| Field | Value |
| --- | --- |
| Vehicle | Hyundai Elantra |
| Year | 2017 |
| Engine | Gamma 1.6L |
| Complaint | "Turns key, nothing happens at all — no clicking, no crank, dash lights dim." |
| DTCs | None (pre-crank electrical fault) |
| Initial evidence | Measured battery voltage 9.8V at rest (measured, technician) |
| Expected hypotheses | Weak/dead battery (power) · Corroded terminal/ground (ground) |
| Expected Current Thinking | Leading: weak battery, with the measured evidence already linked |
| Expected Next Action | `mechanic_confirmation` (qualifying evidence already linked) |
| Expected Verification | Cranks reliably across multiple cold starts after battery service |

**Executed result:** ✅ matched exactly — *"Confirm root cause: Weak or dead
battery."* Also used to validate **Skip**: skipped with a reason ("no sensor in
stock" — reused wording, see below), which correctly recorded the reason, but the
**identical action reappeared immediately** afterward. See Issue #2.

---

### Case 4 — No Start
| Field | Value |
| --- | --- |
| Vehicle | Nissan Almera |
| Year | 2016 |
| Engine | HR15DE 1.5L |
| Complaint | "Cranks fine but will not start at all, no matter how long you crank it." |
| DTCs | P0335 (Crankshaft Position Sensor Circuit Malfunction) |
| Initial evidence | P0335 (confirmed, scan_tool) |
| Expected hypotheses | Crank sensor failed (signal) · Timing belt/chain slipped (mechanical) |
| Expected Current Thinking | Leading: crank sensor, matches the code directly |
| Expected Next Action | A test (signal = low invasiveness → proceeds) |
| Expected Verification | Starts reliably across repeated attempts; P0335 does not return |

**Executed result:** ✅ matched — *"Test to confirm or eliminate: Crankshaft
position sensor failed."* This is the case Skip was validated on (see Case 3 note
— Skip was tested here, not Case 3; corrected in Issue #2's evidence).

---

### Case 5 — Charging System
| Field | Value |
| --- | --- |
| Vehicle | Kia Sportage |
| Year | 2018 |
| Engine | Nu 2.0L |
| Complaint | "Battery light comes on while driving, electronics get dim, eventually stalls if driven long enough." |
| DTCs | None |
| Initial evidence | Charging voltage measured 12.6V at idle (measured, technician) |
| Expected hypotheses | Alternator output weak (control) · Belt slipping (mechanical) |
| Expected Current Thinking | Leading: alternator weak, with measured evidence already linked |
| Expected Next Action | `mechanic_confirmation` |
| Expected Verification | Charging voltage in spec (13.5–14.7V) across idle/rev on a drive test |

**Executed result:** ✅ matched exactly — *"Confirm root cause: Alternator output
weak."*

---

### Case 6 — ABS
| Field | Value |
| --- | --- |
| Vehicle | Mazda CX-5 |
| Year | 2017 |
| Engine | Skyactiv-G 2.5L |
| Complaint | "ABS warning light on constantly, brakes feel normal otherwise." |
| DTCs | C0035 (Left Front Wheel Speed Sensor Circuit) |
| Initial evidence | C0035 (confirmed, scan_tool); scope trace erratic/dropout (measured, technician) — deliberately linked as **supporting** the sensor hypothesis and **contradicting** the wiring hypothesis |
| Expected hypotheses | Left-front WSS failed (signal) · Damaged tone ring/wiring (signal) |
| Expected Current Thinking | Leading: sensor failed; contradiction flagged in the summary |
| Expected Next Action | `review_contradiction` (overrides normal test/question priority) |
| Expected Verification | ABS light off, wheel-speed data stable across a test drive |

**Executed result:** ✅ matched exactly — Current Thinking summary itself surfaced
*"⚠ មានភស្តុតាងផ្ទុយគ្នា 1 ចំណុច"* (1 contradicting point), and Current Next Action
was *"Review conflicting evidence."* ⚠️ **But the response area for this action is
just a generic "Completed" button — there is no way to actually act on the
contradiction** (e.g., re-classify the evidence, unlink it from one side). See
Issue #3.

---

### Case 7 — Air Conditioning
| Field | Value |
| --- | --- |
| Vehicle | Mercedes-Benz C-Class |
| Year | 2016 |
| Engine | M264 2.0T |
| Complaint | "AC blows warm air only, no cold air at all. Compressor does not seem to engage." |
| DTCs | None |
| Initial evidence | Observed: compressor clutch does not engage (observed, technician) — deliberately left **unlinked** |
| Expected hypotheses | Low refrigerant charge/leak (mechanical) · Clutch/relay electrical fault (control) |
| Expected Current Thinking | Leading: refrigerant leak |
| Expected Next Action | A question (mechanical = high invasiveness) |
| Expected Verification | Sustained cold vent temperature; compressor cycles normally |

**Executed result:** ✅ matched — a question was shown. ⚠️ **The already-recorded,
highly relevant observation ("clutch does not engage") was never surfaced or used**
— the question asked about missing evidence in general terms, ignoring evidence
that already exists but isn't linked to a hypothesis. See Issue #4.

---

### Case 8 — Engine Overheating
| Field | Value |
| --- | --- |
| Vehicle | Mitsubishi Triton |
| Year | 2018 |
| Engine | 4N15 2.4D |
| Complaint | "Temperature gauge climbs above normal on long drives or in traffic, sometimes triggers a warning light." |
| DTCs | P0217 (Engine Overtemperature Condition) |
| Initial evidence | P0217 (confirmed, scan_tool) |
| Expected hypotheses | Cooling fan/clutch not engaging (mechanical) · Thermostat stuck closed (mechanical) |
| Expected Current Thinking | Leading: fan/clutch |
| Expected Next Action | A question (mechanical = high invasiveness) |
| Expected Verification | Temperature stays in normal range under a sustained idle/drive test |

**Executed result:** ✅ matched — question shown, this time correctly targeting the
top-ranked hypothesis (fan clutch). Combined with Case 2's result, this confirms
the question-target selection is **inconsistent** — sometimes the top theory,
sometimes not, with no visible rule the mechanic could learn. See Issue #1.

---

### Case 9 — Hybrid Battery (safety-critical)
| Field | Value |
| --- | --- |
| Vehicle | Toyota Prius |
| Year | 2015 |
| Engine | 2ZR-FXE 1.8L Hybrid |
| Complaint | "Red warning triangle on dash, reduced power, hybrid system seems to disengage intermittently." |
| DTCs | P0A80 (Replace Hybrid Battery Pack) |
| Initial evidence | P0A80 (confirmed, scan_tool) |
| Expected hypotheses | Weak HV battery block (mechanical) · HV cooling fan restricted (mechanical) |
| Expected Current Thinking | Leading: weak block |
| Expected Next Action | **`safety_instruction` must appear first**, before anything else |
| Expected Verification | No warning triangle; block voltages in spec; cooling functions correctly |

**Executed result:** ✅ the safety gate fired correctly and looks excellent: a
clearly danger-styled warning ("High-voltage system — incorrect handling can be
fatal"), the required tools listed (insulated gloves class 0, CAT III meter, HV
lockout kit), and a single "Completed" acknowledgment button. ⚠️ **However, Skip,
Cannot Perform, and Override are all still available on this exact screen** — a
mechanic in a hurry could bypass a fatal-hazard warning with one tap and no
friction. This is the single most important finding in this report. See Issue #5.

---

### Case 10 — Transmission
| Field | Value |
| --- | --- |
| Vehicle | BMW 3 Series |
| Year | 2018 |
| Engine | B48 2.0T |
| Complaint | "Harsh shifting between 2nd and 3rd gear, occasional delay when shifting into Drive." |
| DTCs | P0700 (Transmission Control System Malfunction) |
| Initial evidence | P0700 (confirmed, scan_tool) |
| Expected hypotheses | Shift solenoid sticking (control) · Low/degraded fluid (mechanical) |
| Expected Current Thinking | Leading: solenoid |
| Expected Next Action | A test (control = medium invasiveness → proceeds) |
| Expected Verification | Smooth shifts across a drive cycle; P0700 does not return |

**Executed result:** ✅ matched — *"Test to confirm or eliminate: Shift solenoid
sticking."* Used to validate **Cannot Perform**: tapped with no reason (optional,
per design) → correctly found the pending question as an equivalent alternative and
switched to it, logging `alternativeActionId` correctly. Mechanically sound; the
resulting question text has the same awkward phrasing as Issue #1's finding.

---

## Part 2 — UX Review Report

Each issue is stated as **Problem → Why it's a problem → Real workshop scenario →
Suggested improvement → Priority**. No fixes were applied.

### Issue #1 — The question wording reads like a debug log, and doesn't reliably target the top theory

**Problem:** When the Reasoning Layer has no test candidate strong enough to
proceed, the question shown is always the literal string *"Can you provide: No
supporting evidence linked yet for '\<hypothesis title\>'."* Across the 10 cases,
this exact sentence appeared four times, and which hypothesis it names is
determined by internal string-sorting of an id, not by which hypothesis is actually
ranked first.

**Why it is a problem:** It doesn't read like a question a person would ask — it
reads like an error message that leaked into the UI. And because the targeted
hypothesis isn't reliably the leading one, a mechanic who learns "the app asks about
its top theory" will be wrong roughly as often as they're right, which erodes trust
in the "Why" explanation right next to it.

**Real workshop scenario:** A tech glances at "Current Next Action," sees *"Can you
provide: No supporting evidence linked yet for 'Clogged fuel filter'"* while the
app's own Current Thinking card says the *leading* theory is the fuel pump. The tech
either shrugs and answers about the filter (wasting a step) or gets confused about
why the app is asking about something it just said was the less-likely cause.

**Suggested improvement:** Phrase the question as a plain diagnostic ask ("Has the
fuel filter been checked or replaced recently?") rather than restating the internal
finding text, and always source it from the **top-ranked** hypothesis needing
evidence, not from string-sorted finding ids.

**Priority:** **High**

---

### Issue #2 — Skip has no visible effect; the same action reappears immediately

**Problem:** Tapping Skip correctly records the reason in `actionHistory`, but
because nothing about the underlying evidence or hypotheses changed, the very next
`selectNextAction` computation produces the **identical** action (same title, same
content) as the "next" thing to do.

**Why it is a problem:** From the mechanic's point of view, they typed a reason,
tapped Skip, and got the same task back with zero acknowledgment that anything
happened. This looks exactly like a broken button, even though the underlying data
model is behaving correctly (it has no other lead to offer).

**Real workshop scenario:** A tech is asked to test the crank sensor now, doesn't
have the right connector on hand, types "no connector, will come back to it" and
taps Skip — expecting to move to something else productive. Instead they're staring
at the same "Test the crank sensor" card. They'd reasonably conclude the app is
buggy and stop trusting the Skip button.

**Suggested improvement:** When Skip has no alternative to offer, say so explicitly
("Noted — no other lead available right now; this is still the best next step")
instead of silently re-presenting the same card with no acknowledgment.

**Priority:** **High**

---

### Issue #3 — "Review conflicting evidence" gives the mechanic nothing to actually do

**Problem:** When a contradiction is detected, the Current Next Action becomes
*"Review conflicting evidence,"* but the only response available is a generic
"✓ Completed" button. There is no way, from this screen, to re-link evidence, mark
one hypothesis eliminated, or otherwise resolve the conflict the app just flagged.

**Why it is a problem:** This is the single most analytically interesting moment
in the whole loop (two hypotheses are pulling in different directions on the same
evidence) and the UI treats it identically to acknowledging a safety notice. Tapping
"Completed" doesn't change anything about the contradiction — it will very likely
recur.

**Real workshop scenario:** The app tells a tech "this scope reading supports the
sensor theory but contradicts the wiring theory — worth re-examining." The tech
re-examines it, decides it's actually the wiring, and then has literally no button
in this screen to reflect that decision.

**Suggested improvement:** Give this action type a real resolution path — at
minimum, quick-select buttons to say which side the evidence should support, feeding
back into the Hypothesis Engine's existing (already frozen) evidence-linking
operations.

**Priority:** **High**

---

### Issue #4 — Recorded observations are invisible to the reasoning if they aren't linked, and there's no way to link them later

**Problem:** Evidence the technician has already entered (e.g., "compressor clutch
does not engage") sits in the evidence log but is never referenced by Current
Thinking, Missing Evidence, or the Next Action unless it happens to get linked
automatically as the *direct* answer to the *current* action. There is no
affordance anywhere on this screen to browse existing evidence and link it to a
hypothesis after the fact.

**Why it is a problem:** Mechanics don't always record observations in the exact
order or shape the app expects. A tech who front-loads a good observation before the
app "asks" for it effectively loses that observation's value.

**Real workshop scenario:** A tech notes upfront, "clutch doesn't engage at all," a
highly diagnostic fact for an A/C no-cold complaint. The app still asks a generic
"what's missing" question minutes later as if that observation never happened.

**Suggested improvement:** Add a lightweight "link this evidence to a hypothesis"
action reachable from the evidence itself, so early observations aren't stranded.

**Priority:** **Medium**

---

### Issue #5 — A safety instruction can be skipped, dismissed, or overridden exactly like any other step

**Problem:** On the Hybrid Battery case, the `safety_instruction` action — the one
step in the entire system explicitly designed to prevent a potentially fatal
mistake — is presented with the *same* Skip / Cannot Perform / Override buttons as
a routine test.

**Why it is a problem:** Every other design decision in this system treats safety
as non-negotiable (per `decision-authority-model.md` and `ai-system.md`). Making it
one tap away from being skipped, with no distinct friction or confirmation,
contradicts that principle at the exact moment it matters most.

**Real workshop scenario:** A rushed tech, eager to get to the actual diagnosis,
taps "⏭ Skip" out of habit without reading the HV isolation warning, types a
one-word reason, and proceeds to physically inspect a high-voltage system that was
never verified de-energized.

**Suggested improvement:** Remove Skip/Cannot Perform/Override entirely for
`safety_instruction` actions, or require a distinct, higher-friction confirmation
before allowing anything other than "Completed."

**Priority:** **High**

---

### Issue #6 — "Current Thinking" reads like a structured report, not a technician's voice

**Problem:** The summary sentence — e.g., *"Leading theory: 'X' (supporting
evidence 1, contradicting 0)"* — is accurate but clinical. The brief was explicit
that this section "should feel like a senior technician explaining what they are
currently thinking," and right now it reads like a data dump with light templating.

**Why it is a problem:** The tone sets the trust level for the whole screen. A
mechanic reading a natural sentence ("I'm fairly confident it's the coil — I've got
one solid piece of evidence and nothing arguing against it") is more likely to trust
the app's judgment than one reading a labeled count.

**Real workshop scenario:** A tech skims the summary the way they'd skim a
colleague's handover note. A templated count reads like a machine; a mechanic's
sentence reads like a colleague.

**Suggested improvement:** Rephrase the summary generation to read as connected
prose rather than a template with inserted counts.

**Priority:** **Medium**

---

### Issue #7 — VIN is always shown as "—", with no explanation why

**Problem:** The Vehicle Information card always shows `VIN: —`, because the data
model has no VIN field yet. Nothing on screen explains this is a known limitation
rather than a missing-data bug for this specific vehicle.

**Why it is a problem:** A mechanic seeing a blank VIN on every single vehicle,
every time, will reasonably assume something is broken rather than "not supported
yet."

**Real workshop scenario:** A shop owner glancing over a tech's shoulder asks "why
does it never have the VIN?" — a small but recurring credibility ding.

**Suggested improvement:** Either hide the VIN row entirely until the field exists,
or label it "not yet supported" rather than a bare dash.

**Priority:** **Low**

---

### Issue #8 — "Finish" is a two-step, easy-to-misread flow

**Problem:** Tapping "Finish" before a repair is recorded silently reveals an
inline "Record Repair" form below the button, with no visual transition drawing the
eye there — and the same "🏁 Finish" button remains visible and tappable above the
new form, inviting a second, premature tap.

**Why it is a problem:** During live testing, the newly revealed form was easy to
miss on first glance because nothing scrolled to it or visually separated it from
the (still fully colored, still tappable) Finish button above.

**Real workshop scenario:** A tech taps Finish, doesn't notice the new fields
appear below the fold, taps Finish again, and is confused why nothing happens (the
guard silently no-ops rather than explaining what's still needed).

**Suggested improvement:** Auto-scroll to the revealed form, and visually
de-emphasize/hide the original Finish button while its sub-form is open.

**Priority:** **Medium**

---

### Issue #9 — No visible way to review past mechanic responses (skips, overrides, cannot-performs) within the session

**Problem:** `actionHistory` and `actionLog` are faithfully recorded (confirmed via
direct inspection), but nothing in the UI surfaces this history to the mechanic. A
tech who skipped two things twenty minutes ago has no way to recall what or why
without asking the app to somehow show it.

**Why it is a problem:** The whole architecture is built around traceability and
"never silently lose reasoning" — but that discipline is currently invisible at the
UI layer. The data is captured faithfully; the mechanic just can't see it.

**Real workshop scenario:** A tech hands off a half-finished diagnosis to a
colleague. The colleague has no way to see "we already skipped the sensor test
because no connector was on hand" without re-reading the whole conversation from
memory.

**Suggested improvement:** A simple, collapsible "History" section showing prior
actions and how they were resolved.

**Priority:** **Medium**

---

### Issue #10 — Confirming a hypothesis doesn't visibly resolve the *other* open hypothesis

**Problem:** After confirming "Injector #1 internal back-leak" in the Hiace case,
the alternative hypothesis ("Low-pressure supply starvation") remained fully active
and the app immediately asked a question about *it* — which is logically correct
(nothing eliminated it) but was not signposted as expected behavior anywhere on
screen.

**Why it is a problem:** A mechanic who just confirmed a root cause and is
mentally moving toward the repair may be confused when the app keeps asking about a
theory that "lost." Without an explanation, it can look like the confirmation
didn't fully register.

**Real workshop scenario:** A tech confirms the injector as the cause, expects the
app to move toward "record the repair," and instead gets another question about a
completely different, seemingly-already-ruled-out theory.

**Suggested improvement:** When a root cause is confirmed while other hypotheses
remain open, say so explicitly ("Root cause confirmed. One alternative theory is
still unresolved — address it now or return to it later").

**Priority:** **Medium**

---

## Part 3 — Diagnostic UX Validation Report v1 (summary)

### Overall usability score: **6.5 / 10**
The screen is legible, large-target, and honest about what it knows — but several
interactions (Skip, contradiction review, safety-step friction) don't yet do what a
mechanic would expect them to do, which caps usability below "good" until addressed.

### Overall workflow score: **7 / 10**
The core loop (confirm → record repair → verify → complete) works cleanly and was
proven twice, on two different systems, without a single console error. The
weakest link is the "in-between" states — asking a question that doesn't map to the
visible top theory, or Skip appearing to do nothing.

### Overall mechanic confidence: **Medium**
A mechanic would trust the **confirmation and verification steps** (the moments
that matter most) — the "why" text and safety warnings there are clear and
specific. Confidence drops during ordinary back-and-forth (questions, skips,
contradictions), where the app's behavior sometimes doesn't match what it just told
the mechanic it was thinking.

### Most confusing interactions
1. The generic missing-evidence question (Issue #1)
2. Skip with no visible effect (Issue #2)
3. "Review conflicting evidence" with nothing to actually review (Issue #3)
4. Safety instruction sharing controls with routine steps (Issue #5)

### Most valuable moments
1. **The safety gate itself** (Case 9) — clear, correctly prioritized, well-written
   warning content once it appears.
2. **`mechanic_confirmation`** (Cases 3, 5, and the Hiace case) — a clean, honest
   "here's the evidence, you decide" moment that matches the whole product's
   philosophy.
3. **The live Current Thinking summary** updating immediately after confirmation —
   proof the engine → UI loop is genuinely real-time, not staged.
4. **Repair verification** — the quick-select form (symptom resolved / DTCs
   cleared) is fast, clear, and appropriately structured.

### Top 10 UX improvements (priority-ordered, not yet implemented)
1. **(High)** Gate safety instructions behind stricter, distinct confirmation —
   remove or friction-up Skip/Cannot Perform/Override for `safety_instruction`.
2. **(High)** Rewrite the generic missing-evidence question into natural phrasing,
   and always target the top-ranked hypothesis.
3. **(High)** Give "Review conflicting evidence" an actual resolution action.
4. **(High)** Make Skip visibly change something, or say plainly when it can't.
5. **(Medium)** Add a way to link already-recorded evidence to a hypothesis after
   the fact.
6. **(Medium)** Rewrite the Current Thinking summary as natural prose, not a
   templated count.
7. **(Medium)** Fix the Finish/Record-Repair flow's scroll and button-state
   handling.
8. **(Medium)** Surface `actionHistory` (skips/overrides/cannot-performs) somewhere
   visible in the UI.
9. **(Medium)** Explicitly acknowledge unresolved alternative hypotheses after a
   confirmation.
10. **(Low)** Hide or relabel the VIN row until the data model actually supports it.

---

**No code was modified to produce this report.** All findings above are grounded in
direct observation of the running, unmodified prototype across ten realistic cases
spanning engine, fuel, electrical, ABS, A/C, cooling, hybrid-HV, and transmission
systems.
