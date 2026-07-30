# 04 — Feature Vision

The complete future feature set, grouped by category. This is a **vision backlog**,
not a commitment — sequencing lives in `roadmap.md` and `05-knowledge-roadmap.md`.

**Legend:** ✅ built · 🔜 near-term · 🌐 future · Every item must serve
**car diagnosis + technician knowledge** (see `project-rules.md`). Items that would
turn MT into garage management/POS are explicitly excluded at the end.

---

## 1. Diagnosis
- ✅ Guided 3-step workflow (vehicle → symptom → result)
- ✅ Ranked possible causes with confidence + reasoning
- ✅ 12 vehicle systems (Engine, ABS, Airbag, Hybrid, EV, Transmission, A/C,
  Electrical, Suspension, Brake, Steering, Body)
- 🔜 Interactive inspection checklists (record pass/fail per step)
- 🔜 Symptom → likely-DTC suggestions; guided customer-intake templates
- 🌐 Intermittent-fault mode (log events over time)
- 🌐 Case-grounded diagnosis (rank using the shop's own repair history)
- 🌐 Scan-tool / OBD live-data ingestion as diagnostic input

## 2. Repair
- ✅ Recommended repair guidance
- ✅ Tools-needed list per diagnosis
- 🌐 Step-by-step repair procedures (Knowledge L4)
- 🌐 Torque specifications inline (Knowledge L6)
- 🌐 Component location + removal/replacement guides
- 🌐 Verification/road-test checklists with re-scan comparison

## 3. Knowledge
- ✅ DTC knowledge base (meaning, systems, causes, inspection flow, common mistakes)
- ✅ Common-mistakes surfaced in context
- 🔜 Expanded DTC coverage + manufacturer-specific notes
- 🌐 Wiring diagrams (L5), TSBs (L7), known-failure patterns (L8)
- 🌐 Measured-value / known-good references (L6/L8)
- (See the layered plan in `05-knowledge-roadmap.md`.)

## 4. AI
- ✅ Placeholder provider behind a single `AiProvider` seam
- ✅ Structured follow-up questions when data is missing
- 🌐 Real AI (server-proxied) obeying the rules in `ai-system.md`:
  no guessing, ask follow-ups, rank causes, inspection steps, evidence, safety
- 🌐 Retrieval-grounded answers (DTC base + repair cases)
- 🌐 AI that learns from accumulated real cases (Knowledge L10)
- 🌐 Explainable AI: every conclusion cites its evidence

## 5. Camera / Vision
- ✅ Attach photos to symptoms and cases; per-photo notes
- 🌐 Real image analysis (damaged parts, warning lights, leaks, wear)
- 🌐 Read a scan-tool screen / gauge photo → extract values
- 🌐 OCR of VIN plates, part numbers, labels
- 🌐 Waveform/scope image interpretation

## 6. Voice
- 🌐 Voice capture of symptoms and notes (hands greasy / gloves on)
- 🌐 Hands-free "next step" narration during inspection
- 🌐 Voice search across DTCs and cases
- 🌐 Khmer speech-to-text tuned for automotive terms

## 7. Vehicle Database
- ✅ Curated brands/models/engines/transmissions (quick-pick, free-text fallback)
- 🔜 Broader model/engine coverage
- 🌐 VIN decode / license-plate lookup → auto-fill vehicle
- 🌐 Per-model system maps and common-fault profiles

## 8. Repair Cases
- ✅ Save/edit/delete cases; rich fields (root cause, repair, parts, notes, photos,
  tags)
- ✅ Full-text-ish search; **Similar Cases** ranking
- 🔜 Case templates, voice notes, better tagging/filtering
- 🌐 Attach measurements/waveforms; link cases to DTCs/procedures
- 🌐 Case sharing/export (read-only, no billing)

## 9. Community
- 🌐 Opt-in **shared case library** (moderated, anonymized)
- 🌐 Ask-the-community for rare faults; expert-verified answers
- 🌐 Reputation for contributors; regional fault trends
- 🌐 Curated "solved" collections by model/system

## 10. Cloud
- 🌐 Accounts + per-technician ownership
- 🌐 Cloud backup so nothing is lost when a device is wiped
- 🌐 Shop/team spaces with a shared case library
- 🌐 Photos in object storage (not inline)

## 11. Offline
- 🌐 Offline-first: full diagnosis, DTC lookup, and case capture with no signal
- 🌐 Local cache of knowledge base; sync when back online
- 🌐 Conflict-safe sync (shops have poor connectivity)

## 12. Training
- 🌐 Learning mode explaining the *why* behind each cause/step
- 🌐 Guided practice cases / simulated diagnostics for students & apprentices
- 🌐 Skill tracks (electrical, HV, driveability); progress tracking
- 🌐 Master-tech-authored lessons tied to real cases

## 13. Safety
- ✅ Automatic HV (Hybrid/EV) and SRS/Airbag warnings in diagnosis output
- 🔜 Safety warnings surfaced in DTC and repair contexts too
- 🌐 Per-procedure safety gating (acknowledge before HV/airbag steps)
- 🌐 PPE / lockout-tagout checklists for HV work

## 14. Future Marketplace *(exploratory, boundary-sensitive)*
- 🌐 **Parts/tool discovery** relevant to a diagnosis (find the right part number/
  tool) — *information and referral only*
- 🌐 Directory of specialists (e.g. HV, ADAS calibration) for referrals
- 🌐 Training/course marketplace

> ⚠️ **Boundary:** a marketplace here means *discovery and referral*, never turning
> MT into a POS, invoicing, inventory, or checkout system. If a "marketplace"
> feature starts handling the shop's sales or payments, it violates `vision.md` and
> must be rejected.

---

## Explicit non-features (never build)

- ❌ Garage/workshop management (scheduling, job cards as billing, payroll)
- ❌ Invoicing, quotations, customer billing/payments, POS
- ❌ Inventory / parts stock management
- ❌ Customer-facing booking / status-tracking app
- ❌ General-purpose chatbot untethered from vehicle diagnosis
- ❌ **Engagement/attention mechanics** (streaks, feeds, notifications-for-return,
  gamified daily use) — anything whose goal is more screen time. In Master
  Technician, time in the app is a *cost to minimize*, not a metric to grow.

## Prioritization lens

Every feature must first pass the one question that governs this product:

> **"Does this help the mechanic repair the vehicle faster and more accurately?"**
> If the answer is no, redesign it or remove it.

Then confirm it fits Master Technician:
1. Does it get the tech a **trusted answer faster** (less searching time), then out
   of the app and back to the vehicle?
2. Does it prioritize **information over conversation**, and keep AI assisting *only
   when needed* rather than dominating the flow?
3. Does it strengthen the **case flywheel** (steps 3–7 ↔ 10–11 in `03`)?
4. Does it work **one-handed on a phone**, Khmer-first, understandable at a glance?
5. Does it keep AI behind `services/ai.ts` and data behind `services/store.ts`?

If it adds interaction without adding repair speed or accuracy, it's the wrong
feature — cut it.
