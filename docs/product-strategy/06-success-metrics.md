# 06 — Success Metrics

How we know Master Technician is becoming the world's best tool for professional
technicians. Metrics are grouped by **outcome** (does it make techs better?),
**trust & usefulness** (is it relied on when needed?), and **knowledge** (is the
moat growing?).

Guiding rule: **outcome metrics lead.** DAU means nothing if techs aren't fixing
cars faster and more correctly. We optimize for the mechanic's success first;
engagement and growth follow.

**Critical framing:** Master Technician reduces *searching time, not screen time*.
Time-in-app is a **cost to minimize**, not a metric to grow. We never celebrate
longer sessions, more taps, or higher return frequency for their own sake. The
right shape is **frequent-but-brief, high-value touches**: the tech opens the app,
gets a trusted answer in seconds, and leaves. Engagement metrics below measure
*whether the tool is trusted and useful*, not whether it holds attention.

---

## A. Outcome metrics (the real goal)

### 1. Time saved per diagnosis
- **Definition:** reduction in time from symptom to confirmed root cause vs. the
  tech's prior baseline.
- **How measured:** session timestamps (start → case saved); periodic self-reported
  "how long would this have taken you before?" prompts; cohort comparison.
- **Target direction:** ↓ time per job, especially on hard/complex faults.

### 1b. Time-to-information (in-app speed) — *lower is better*
- **Definition:** how long the mechanic spends in the app to get the answer they
  came for (e.g. open → DTC meaning; open → ranked cause; open → find a past case).
- **How measured:** in-app time per completed lookup/task; taps-to-answer.
- **Target direction:** ↓ — the app should get out of the way fast. This is a
  deliberate **inverted** metric: we want the mechanic *out* of the app quickly.

### 2. Diagnostic accuracy
- **Definition:** share of diagnoses where the identified root cause matched the
  actual fix.
- **How measured:** compare the ranked cause chosen vs. the `rootCause`/repair saved
  in the case; "was the top cause correct?" confirmation on case save.
- **Target direction:** ↑ top-1 and top-3 cause hit rate over time.

### 3. Repair accuracy / right-first-time
- **Definition:** repairs that fixed the problem without a comeback.
- **How measured:** "did this fix it?" follow-up on the case; comeback flag if the
  same vehicle+symptom returns.
- **Target direction:** ↓ comeback rate; ↓ wrong-part replacements ("parts cannon").

### 4. Mechanic productivity
- **Definition:** more correctly-diagnosed jobs completed per tech per day/week.
- **How measured:** cases solved per active tech; trend over cohort tenure.
- **Target direction:** ↑ throughput of *correctly* solved jobs (not just volume).

### 5. Safety adherence *(critical, non-negotiable)*
- **Definition:** HV/SRS jobs where safety warnings were shown and acknowledged.
- **How measured:** warning-surfaced rate on HV/EV/airbag diagnoses; (future)
  acknowledge-before-proceed gating.
- **Target direction:** 100% of applicable jobs show the warning; zero regressions.

---

## B. Trust & usefulness metrics (is it relied on when needed?)

> These measure whether technicians **reach for the tool when it matters** — not
> whether it holds their attention. We want *frequent, brief, high-value* touches.

### 6. Active users (used-when-needed, not always-on)
- **Definition:** unique technicians who use MT to answer a real question over a
  day/week/month.
- **Signal we want:** broad, sustained usage across working technicians —
  reached-for reliably **when information is needed**. We do **not** target
  "open all day"; a tech who opens MT three times a day for 20 seconds each and
  fixes cars faster is a total success.

### 7. Task success & speed (not session length)
- **Definition:** did the tech get what they came for, and how fast — completion
  rate of the intended lookup/diagnosis and the time it took.
- **Signal:** high task-completion with **low** time-to-answer (see 1b). Short,
  successful sessions are the goal; long sessions are a warning, not a win. We track
  workflow completion (e.g. diagnosis → saved case) as *value delivered*, never
  session duration as *engagement*.

### 8. Cases solved & saved
- **Definition:** diagnoses completed and cases saved.
- **Signal:** ↑ cases saved per active tech — the clearest sign MT is in the daily
  flow *and* feeding the flywheel.
- **Case-save rate:** % of diagnoses that end in a saved case (flywheel strength —
  the tech found it worth capturing, not a measure of time spent).

### 9. Feature reliance
- **Definition:** usage across steps — DTC search, inspection steps, similar cases,
  ask expert, safety warnings.
- **Signal:** reliance spread across the *whole* loop (a tool), not concentrated in
  chat (a chatbot).

### 10. Retention
- **Definition:** techs still active after 1 / 4 / 12 weeks.
- **Signal:** high long-term retention; retention rising with the number of cases a
  tech has saved (personal knowledge base = switching cost).

---

## C. Knowledge / flywheel metrics (is the moat growing?)

### 11. Knowledge growth
- **Definition:** total real repair cases, DTC coverage, and (future) procedures/
  wiring/TSB/known-failure entries (see `05`).
- **Signal:** ↑ cases/week; expanding coverage across systems, brands, and codes.

### 12. Similar-case hit rate
- **Definition:** when a new diagnosis begins, how often a relevant prior case is
  surfaced.
- **Signal:** ↑ over time as the library grows — proof the flywheel is compounding.

### 13. Case reuse
- **Definition:** how often a saved/similar case is opened to help a new job.
- **Signal:** ↑ reuse per case; knowledge is being *used*, not just stored.

### 14. AI grounding & trust *(post real-AI)*
- **Definition:** share of AI conclusions backed by cited evidence (DTC/case/spec)
  vs. unsupported; user "was this helpful/correct?" ratings.
- **Signal:** high cited-evidence rate; ↓ "AI guessed" reports; ↑ helpfulness score.
- **Guardrail:** any rise in confident-but-wrong outputs is a **stop-ship** signal.

### 15. Community contribution *(post community)*
- **Definition:** opt-in shared cases, expert-verified answers, contributors.
- **Signal:** healthy contribution + moderation quality; regional fault insights.

---

## North-Star metric

> **Correctly-solved repair cases per active technician per week.**

It is the single number that captures everything that matters — and it measures
**value earned per use, not minutes spent.** The tech *relies* on MT when it counts,
it makes them *accurate and fast* (outcome), and each solved case *grows the
knowledge flywheel* (moat). Note what it deliberately excludes: screen time, session
length, and return frequency. If correctly-solved cases per technician rises while
time-in-app per answer falls, Master Technician is winning.

## Counter-metrics / guardrails (watch for harm)

- **Comeback rate** must not rise — speed can't come at the cost of correctness.
- **Safety-warning coverage** must stay at 100% for HV/SRS work.
- **AI overconfidence** (confident wrong answers) must trend to zero.
- **Rising time-in-app / session length without added value is a red flag**, not
  progress. If the mechanic is spending *more* time on the phone per answer, the
  design has failed principle 9 (`design-principles.md`). We optimize
  time-to-answer *down*.
- **No engagement mechanics.** If anyone proposes streaks, feeds, or
  return-nudging notifications to lift "activity," reject it — it violates the
  philosophy (`MASTER-TECHNICIAN-BIBLE.md`).
- **Scope creep signal:** if usage shifts toward non-diagnostic features, revisit
  focus — MT is diagnosis + knowledge only (`vision.md`, `project-rules.md`).

## Measurement principles

- Instrument privacy-respectfully; technicians own their cases.
- Prefer **cohort trends** (a tech vs. their own past) over vanity totals.
- Pair every quantitative metric with periodic **qualitative feedback** from real
  mechanics — the trade tells us what the dashboards can't.
