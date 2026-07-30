# Vision — Master Technician

## Purpose

**Master Technician is an instant professional-reference tool for automotive
technicians** — a mobile-first, **Khmer-first** source of trusted technical
information that a mechanic reaches for **at the exact moment a decision is
needed**, and then puts down to keep working on the vehicle.

It is a **diagnosis and technician-knowledge tool** — a fast, reliable replacement
for scattered notes, group chats, memory, and slow desktop reference systems.

## Product philosophy — reduce searching time, not screen time

Professional mechanics spend almost all of their time **on the vehicle**: using
tools, measuring electrical values, operating scan tools, and performing repairs.
**The smartphone is not the workspace.** It is a reference instrument, picked up
only when information is needed.

Master Technician is therefore **not** a "keep it open all day" app. Its job is to
deliver the right technical information at exactly the right moment. The intended
loop is:

> **Open the app → find the required information within seconds → close the app →
> continue repairing the vehicle.**

The app exists to **reduce searching time, not to increase screen time.** Success
is **minimal screen time and maximum repair time** — the mechanic gets the answer
and gets back to work. Every design and product decision is judged against this.

## Target users

- **Primary:** professional car mechanics / automotive technicians (independent
  garages and workshops), especially in the Cambodian market.
- **Assumed context:** the user already knows how to turn a wrench and is usually
  mid-task, hands busy, phone picked up for seconds. The app speaks their language
  (Khmer) but keeps English technical terms (DTC, ABS, OBD-II, fuel trim, scan
  tool, HV, SRS) because those are the professional norm.
- **Not** for car owners, service advisors, parts sellers, or accountants.

## What the app does

Delivers **professional knowledge on demand** at the point of need:

1. **Guided diagnosis** — from vehicle + symptoms/DTC/scan data to a structured,
   evidence-based result, fast.
2. **Ranked possible causes** with reasoning, so the tech knows what to check next.
3. **Inspection guidance** — ordered steps, required tools, and safety warnings.
4. **DTC lookup** — meaning, related systems, causes, inspection flow, common
   mistakes — in seconds.
5. **Repair-case recall** — capture a real fix in a few taps; find it (or a similar
   one) later just as quickly.
6. **Expert assistance when stuck** — asks the right follow-up questions instead of
   guessing.
7. **Photo reference** — capture parts, warning lights, or live data for analysis.

The unifying idea: **fast access to trusted technical information**, then back to
the vehicle.

## What the app must NOT become

Master Technician is deliberately narrow. It must **not** grow into:

- ❌ A **garage / workshop management system**.
- ❌ **Sales, invoicing, quotations, or customer billing**.
- ❌ **Customer payments / POS**.
- ❌ **Inventory / parts stock management**.
- ❌ A **customer-facing** app (booking, status tracking, marketing).
- ❌ A general chatbot untethered from vehicle diagnosis.
- ❌ An **attention/engagement product** that competes for the mechanic's screen
  time. More time in the app is a *cost*, not a goal.

Every feature must serve **car diagnosis and technician knowledge**, and must help
the mechanic **get the answer faster and get back to the repair** (see
`product-strategy/design-principles.md` and `project-rules.md`).

## Mobile-first direction

The app is designed **phone-first**, for a mechanic who is mid-repair when they
reach for it:

- **Open fast, find fast, close fast.** Speed to the answer is the core metric.
- **One-hand use** — large, bottom-anchored actions within thumb reach.
- **Understand at a glance** — scannable, prioritized information over conversation.
- **Readable in the shop** — high-contrast dark mode by default, plus a light mode.
- **Professional, focused UI** — not an engagement machine; built for the fastest
  path from question to repair decision.

Desktop/tablet are not targets right now; the layout is centered in a phone-width
column. See `ui-ux-guidelines.md` and `product-strategy/design-principles.md`.
