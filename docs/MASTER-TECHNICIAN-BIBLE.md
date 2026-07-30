# The Master Technician Bible

The single source of truth for what Master Technician **is**, **why it exists**, and
**how every decision is judged**. When any other document, design, or feature
conflicts with this one, this document wins.

---

## 1. Identity

**Master Technician is an instant professional-reference tool for automotive
technicians.** Mobile-first, Khmer-first, it delivers trusted technical information
at the exact moment a repair decision is needed — and then gets out of the way.

It is **not** an AI chatbot. It is a structured **diagnosis + technician-knowledge**
system, with AI as one component inside it.

## 2. The core philosophy

> **Reduce searching time, not screen time.**

Professional mechanics spend almost all their time **on the vehicle** — tools,
measurements, scan tools, repairs. The smartphone is **not** the workspace; it is a
reference instrument picked up only when information is needed.

Master Technician is **not** designed to keep mechanics on the phone all day. Its
purpose is to deliver the **right technical information at exactly the right
moment.** The intended loop:

> **Open the app → find the required information within seconds → close the app →
> continue repairing the vehicle.**

**Minimal screen time. Maximum repair time.** Time in the app is a *cost to
minimize*, never a metric to grow. We do not build for engagement, session length,
or return frequency.

## 3. The one governing question

Every feature, screen, and decision must pass:

> **"Does this help the mechanic repair the vehicle faster and more accurately?"**

If the answer is **no**, the feature is **redesigned or removed.**

## 4. The language we use (and don't)

We describe Master Technician as:

- **Instant Professional Assistance**
- **Professional Knowledge On Demand**
- **Fast Access to Trusted Technical Information**
- **Evidence-Based Diagnosis**
- **Technician Productivity**
- **Minimal Screen Time / Maximum Repair Time**

We do **not** describe it as a *daily companion*, an *always-open app*, something
mechanics use *continuously*, or a *phone-centric workflow*. Those framings are
wrong and are banned from our docs and product copy.

## 5. The 10 UX / product principles

1. Open quickly.
2. Find information quickly.
3. Understand immediately.
4. Return to vehicle repair.
5. Never require unnecessary interaction.
6. Every screen should help the mechanic make a repair decision faster.
7. Information should be prioritized over conversation.
8. AI should assist only when needed, not dominate the workflow.
9. The app should reduce diagnostic time, not increase phone usage.
10. Every feature must answer: *"Does this help the mechanic repair the vehicle
   faster and more accurately?"* — if no, redesign or remove.

## 6. What Master Technician IS

- A **fast reference** for DTCs, causes, inspection flows, tools, and safety.
- An **evidence-based diagnostic assistant** that ranks causes and refuses to guess.
- A **memory of real repairs** — capture a fix fast, recall it (or a similar one)
  fast. This case flywheel is the long-term moat.
- **Safety-aware** — HV (Hybrid/EV) and SRS/Airbag warnings appear at the moment of
  the work.
- **Khmer-first**, with English technical terms preserved.

## 7. What Master Technician is NOT

- ❌ A garage / workshop management system.
- ❌ Sales, invoicing, quotations, customer billing, payments, or POS.
- ❌ Inventory / parts stock management.
- ❌ A customer-facing app (booking, status tracking, marketing).
- ❌ A general chatbot untethered from vehicle diagnosis.
- ❌ An attention/engagement product competing for the mechanic's screen time.

## 8. How AI must behave

AI is a component, not the product. It must (see `ai-system.md`):
**do not guess · ask follow-up questions when data is missing · rank possible
causes · show inspection steps · explain the evidence · show safety warnings.**
Structured knowledge answers first; AI fills the gaps — quickly and scannably.

## 9. How success is measured

By the mechanic's outcomes, not by screen time (see
`product-strategy/06-success-metrics.md`):
**time saved · diagnostic accuracy · repair accuracy / right-first-time · fewer
comebacks · safety adherence · knowledge growth.**
North-Star: **correctly-solved repair cases per active technician** — value earned
per use, not minutes spent.

## 10. Document map

- Vision & scope → `vision.md`
- Positioning → `product-strategy/01-product-positioning.md`
- Personas → `product-strategy/02-user-personas.md`
- Workflow (where quick answers help) → `product-strategy/03-mechanic-workflow.md`
- Feature vision → `product-strategy/04-feature-vision.md`
- Knowledge roadmap → `product-strategy/05-knowledge-roadmap.md`
- Success metrics → `product-strategy/06-success-metrics.md`
- Design law → `product-strategy/design-principles.md`
- UX rules → `ui-ux-guidelines.md`
- AI rules → `ai-system.md`
- Guardrails → `project-rules.md`

> **Golden rule:** every decision serves the mechanic getting a **trusted answer
> faster** and returning to the **repair**. Reduce searching time, not screen time.
