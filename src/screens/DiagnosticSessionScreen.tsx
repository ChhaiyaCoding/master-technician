/**
 * Diagnostic Session Screen — Milestone 6 (interactive prototype).
 *
 * The first screen that connects the React UI directly to the engines
 * built in Milestones 1–5. This screen contains NO diagnostic logic of its
 * own — every decision (what evidence exists, what the leading theory is,
 * what to do next, whether a response is valid) is read from or delegated
 * to the Session/Evidence/Hypothesis Engines, the Reasoning Layer, and the
 * Orchestrator. This file only renders their output and forwards the
 * mechanic's taps to the correct engine function.
 *
 * "Usable first, not beautiful first": built with the existing component
 * library (Layout/ui/Icon), large touch targets, minimal typing, and a
 * single always-visible next action — never a list of things to do.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar, Page } from "@/components/Layout";
import { Button, Card, SectionTitle, cx, LoadingDots } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { scrollIntoViewReliably } from "@/utils/scroll";

import {
  completeSession,
  createSession,
  loadSession,
  pauseSession,
  recordRepairDecision,
  resumeSession,
  saveSession,
  verifySession,
} from "@/engine/sessionEngine";
import { addEvidence, listActiveEvidence } from "@/engine/evidenceEngine";
import {
  addHypothesis,
  confirmHypothesis,
  eliminateHypothesis,
  linkSupportingEvidence,
  listActiveHypotheses,
  unlinkEvidence,
} from "@/engine/hypothesisEngine";
import { canSaveAsCase, diagnosticSessionToRepairCase } from "@/diagnosis/sessionToCase";
import { guessFailureDomain } from "@/diagnosis/bootstrapSession";
import { CURRENT_SESSION_ID_KEY } from "@/services/currentSession";
import { caseStore } from "@/services/store";
import { buildReasoningInput } from "@/reasoning/reasoningProvider";
import { ruleBasedReasoningProvider } from "@/reasoning/ruleBasedReasoningProvider";
import {
  acceptAction,
  cannotPerformAction,
  overrideAction,
  selectNextAction,
  skipAction,
} from "@/orchestrator/orchestrator";

import type {
  ActionResponseKind,
  DiagnosticSession,
  Hypothesis,
  HypothesisStatus,
  NextActionType,
} from "@/types/session";
import type { ReasoningOutput } from "@/types/reasoning";

/* ============================================================================
 * Demo seed — the Toyota Hiace 2008 Diesel, DTC P0093 Gold Standard Case
 * (the same case used throughout diagnostic-reasoning-engine.md,
 * interactive-diagnostic-test-flow.md, and every engine milestone's tests).
 * Built entirely through the real engine APIs — this is placeholder DATA,
 * not placeholder LOGIC.
 * ========================================================================= */

const DEMO_SESSION_ID_KEY = CURRENT_SESSION_ID_KEY;

function seedHiaceP0093Session(): DiagnosticSession {
  let session = createSession({
    vehicle: {
      brand: "Toyota",
      model: "Hiace",
      year: 2008,
      engine: "1KD-FTV",
      transmission: "MT",
      mileageKm: 320000,
    },
    complaint:
      "ម៉ាស៊ីនចាប់ផ្តើមធម្មតា ដើរបានមួយភ្លែត រួចស្តុប។ បន្ទាប់ពីរង់ចាំបន្តិច ចាប់ផ្តើម" +
      "ម្តងទៀត ដើរខ្លីៗ រួចស្តុបម្តងទៀត។ កើតឡើងដដែលៗ ច្រើនដង។",
    system: "engine",
  });

  session = addEvidence(session, {
    source: "scan_tool",
    category: "dtc",
    tier: "confirmed",
    description: "P0093 — Fuel System Leak Detected, Large Leak.",
    links: { dtcCode: "P0093" },
  });

  session = addHypothesis(
    session,
    {
      title: "Injector #1 លេចខាងក្នុង (back-leak)",
      description:
        "Injector control valve ចាស់ ធ្វើឲ្យ high-pressure fuel លេចត្រឡប់ទៅ return " +
        "line បណ្តាលឲ្យ Rail Pressure ធ្លាក់ចុះពេលក្តៅ — ត្រូវនឹងទម្រង់ ដើរខ្លីៗ ស្តុប " +
        "រួចដើរឡើងវិញក្រោយសម្រាក។",
      systemId: "engine",
      failureDomain: "mechanical",
    },
    "mechanic",
    "ត្រូវនឹង DTC P0093 (large leak) និងអាកប្បកិរិយា ដើររួចស្តុប ក្រោយសម្រាកដើរឡើងវិញ។",
  );
  const injectorId = session.hypotheses[0].id;

  session = addHypothesis(
    session,
    {
      title: "ខ្វះ Fuel ខាង Low-pressure (filter / air / feed)",
      description:
        "Fuel Filter ស្ទះ ឬ air leak ខាង suction ធ្វើឲ្យខ្វះ fuel មិនទៀងទាត់ពេលម៉ាស៊ីន" +
        "ដើរ — ក៏ត្រូវនឹងទម្រង់ ដើររួចស្តុប ក្រោយសម្រាកដើរឡើងវិញ។",
      systemId: "engine",
      failureDomain: "mechanical",
    },
    "mechanic",
    "ពិចារណាជាជម្រើសផ្សេង — ទម្រង់ ស្តុប/ដើរឡើងវិញ ក៏ជាទូទៅសម្រាប់ការខ្វះ fuel (starvation)។",
  );

  session = addEvidence(session, {
    source: "technician",
    category: "measurement",
    tier: "confirmed",
    description:
      "Injector #1 return-volume test: return volume នៃ cylinder 1 លើស spec ច្បាស់លាស់។",
  });
  const measurementId = session.evidenceLog[1].id;

  session = linkSupportingEvidence(
    session,
    injectorId,
    measurementId,
    "mechanic",
    "Return-volume test បញ្ជាក់ cylinder 1 — Injector ជាប្រភពនៃ leak។",
  );

  return session;
}

function loadOrCreateDemoSession(): DiagnosticSession {
  const existingId = localStorage.getItem(DEMO_SESSION_ID_KEY);
  if (existingId) {
    const existing = loadSession(existingId);
    if (existing) return existing;
  }
  const fresh = seedHiaceP0093Session();
  saveSession(fresh);
  localStorage.setItem(DEMO_SESSION_ID_KEY, fresh.id);
  return fresh;
}

/* ============================================================================
 * Small presentational helpers
 * ========================================================================= */

const HYPOTHESIS_STATUS_LABEL: Record<HypothesisStatus, { km: string; cls: string }> = {
  active: { km: "កំពុងពិចារណា", cls: "bg-accent/15 text-accent" },
  weakened: { km: "ចុះខ្សោយ", cls: "bg-warning/15 text-warning" },
  eliminated: { km: "បានលុបចោល", cls: "bg-muted/20 text-muted" },
  confirmed: { km: "✓ បញ្ជាក់ហើយ", cls: "bg-success/15 text-success" },
};

function HypothesisStatusBadge({ status }: { status: HypothesisStatus }) {
  const m = HYPOTHESIS_STATUS_LABEL[status];
  return (
    <span className={cx("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", m.cls)}>
      {m.km}
    </span>
  );
}

/** A single short status line — deliberately concise for fast scanning. */
function summarizeReasoning(session: DiagnosticSession, output: ReasoningOutput | null): string {
  if (!output) return "កំពុងវិភាគ...";
  const confirmed = session.hypotheses.find(
    (h) => h.id === session.currentBestTheory && h.status === "confirmed",
  );
  if (confirmed) return `មូលហេតុបានបញ្ជាក់៖ "${confirmed.title}"។`;
  const active = listActiveHypotheses(session);
  if (active.length === 0) return "មិនទាន់មានទ្រឹស្ដី។";
  if (output.contradictions.length > 0) return "⚠ មានភស្តុតាងផ្ទុយគ្នា — ត្រូវពិនិត្យ។";
  return `កំពុងផ្តោតលើ "${active[0].title}"។`;
}

type ProgressStep = "complaint" | "evidence" | "hypotheses" | "thinking" | "next_action" | "verification";

const PROGRESS_STEPS: { key: ProgressStep; label: string }[] = [
  { key: "complaint", label: "បញ្ហា" },
  { key: "evidence", label: "ភស្តុតាង" },
  { key: "hypotheses", label: "ទ្រឹស្ដី" },
  { key: "thinking", label: "កំពុងគិត" },
  { key: "next_action", label: "សកម្មភាពបន្ទាប់" },
  { key: "verification", label: "ផ្ទៀងផ្ទាត់" },
];

function currentProgressStep(session: DiagnosticSession): ProgressStep {
  if (session.status === "verified" || session.status === "abandoned") return "verification";
  if (session.currentNextAction?.type === "repair_verification") return "verification";
  if (session.currentNextAction) return "next_action";
  if (session.hypotheses.length > 0) return "thinking";
  if (session.evidenceLog.length > 0) return "evidence";
  return "complaint";
}

function ProgressTimeline({ session }: { session: DiagnosticSession }) {
  const current = currentProgressStep(session);
  const currentIndex = PROGRESS_STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {PROGRESS_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1">
          <span
            className={cx(
              "whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
              i === currentIndex
                ? "bg-primary text-primary-fg"
                : i < currentIndex
                  ? "bg-success/15 text-success"
                  : "bg-surface-2 text-muted",
            )}
          >
            {step.label}
          </span>
          {i < PROGRESS_STEPS.length - 1 && <span className="text-muted">→</span>}
        </div>
      ))}
    </div>
  );
}

const ACTION_TYPE_LABEL: Record<NextActionType, string> = {
  safety_instruction: "⚠ សុវត្ថិភាព",
  question: "❓ សំណួរ",
  inspection: "🔍 ត្រួតពិនិត្យ",
  measurement_test: "📏 វាស់ស្ទង់",
  request_evidence: "📋 ត្រូវការភស្តុតាង",
  review_contradiction: "⚡ ភស្តុតាងផ្ទុយគ្នា",
  mechanic_confirmation: "✅ សុំការបញ្ជាក់",
  repair_verification: "🔧 ផ្ទៀងផ្ទាត់ការជួសជុល",
  session_complete: "🏁 បញ្ចប់",
};

/* ============================================================================
 * Presentation-layer humanizer (Sprint 1, Fix #4 — remove debug wording).
 *
 * The Orchestrator and Reasoning Layer are FROZEN and still emit their exact
 * strings. This helper does NOT change them — it only chooses cleaner Khmer
 * wording to DISPLAY, composed from the same structured data the engine
 * already produced (the action's type + the hypothesis it targets). The
 * diagnostic decision is unchanged; only the words shown to the mechanic are.
 * Safety text is kept verbatim from the engine — never paraphrased.
 * ========================================================================= */

function hypById(session: DiagnosticSession, id: string): Hypothesis | undefined {
  return session.hypotheses.find((h) => h.id === id);
}

interface ActionPresentation {
  title: string;
  instruction: string;
  /** Whether to also show the raw engine `reason` box (only for pass-through types). */
  showReason: boolean;
}

const AUTO_NO_SUPPORT_PREFIX = "No supporting evidence linked yet for";

function presentAction(
  action: NonNullable<DiagnosticSession["currentNextAction"]>,
  session: DiagnosticSession,
  reasoningOutput: ReasoningOutput | null,
): ActionPresentation {
  const firstSource = action.sourceRecommendationIds[0];

  switch (action.type) {
    case "safety_instruction":
      // Authoritative safety wording stays exactly as the engine wrote it.
      return { title: action.title, instruction: action.instruction, showReason: false };

    case "question": {
      const finding = reasoningOutput?.missingEvidence.find((m) => m.id === firstSource);
      const isAuto = finding?.description.startsWith(AUTO_NO_SUPPORT_PREFIX);
      const hyp = finding?.relatedHypothesisId
        ? hypById(session, finding.relatedHypothesisId)
        : undefined;
      const instruction =
        finding && !isAuto
          ? finding.description // a mechanic-declared requirement — already clean
          : hyp
            ? `ដើម្បីបញ្ជាក់ ឬ កាត់ចេញ "${hyp.title}" យើងត្រូវការព័ត៌មានបន្ថែម។ តើអ្នកបានសង្កេត ឬ ពិនិត្យឃើញអ្វីខ្លះ ទាក់ទងនឹងវា?`
            : "តើអ្នកបានសង្កេតឃើញព័ត៌មានបន្ថែមអ្វីខ្លះ ដែលអាចជួយកំណត់មូលហេតុ?";
      return { title: "សំណួរបន្ថែម", instruction, showReason: false };
    }

    case "inspection":
    case "measurement_test": {
      const hyp = firstSource ? hypById(session, firstSource) : undefined;
      const target = hyp ? `"${hyp.title}"` : "មូលហេតុសង្ស័យ";
      return {
        title: hyp ? `ធ្វើតេស្តលើ ${target}` : "ធ្វើតេស្ត",
        instruction: `ធ្វើតេស្តនេះ ដើម្បីបញ្ជាក់ ឬ កាត់ចេញ ${target} ចេញពីបញ្ជីមូលហេតុ។`,
        showReason: false,
      };
    }

    case "mechanic_confirmation": {
      const hyp = firstSource ? hypById(session, firstSource) : undefined;
      return {
        title: hyp ? `បញ្ជាក់មូលហេតុ៖ "${hyp.title}"` : "បញ្ជាក់មូលហេតុ",
        instruction:
          "មានភស្តុតាងគ្រប់គ្រាន់ដើម្បីបញ្ជាក់មូលហេតុនេះ។ សូមពិនិត្យ ហើយបញ្ជាក់ ប្រសិនបើអ្នកយល់ស្រប — នេះជាការសម្រេចរបស់អ្នក មិនមែនរបស់កម្មវិធីទេ។",
        showReason: false,
      };
    }

    case "review_contradiction":
      return {
        title: "ភស្តុតាងផ្ទុយគ្នា",
        instruction:
          "មានភស្តុតាងមួយ ដែលគាំទ្រទ្រឹស្ដីមួយ ប៉ុន្តែផ្ទុយនឹងទ្រឹស្ដីមួយទៀត។ សូមពិនិត្យឡើងវិញ ហើយសម្រេចថាតើវាពិតជាគាំទ្រ ឬ កាត់ចេញទ្រឹស្ដីមួយណា។",
        showReason: false,
      };

    case "request_evidence":
      return {
        title: "ប្រមូលភស្តុតាងបន្ថែម",
        instruction:
          "មិនទាន់មានទិន្នន័យគ្រប់គ្រាន់ដើម្បីបន្ត។ សូមប្រមូលភស្តុតាង ឬ ធ្វើតេស្តបន្ថែម ដើម្បីរួមតូចមូលហេតុ។",
        showReason: false,
      };

    case "repair_verification":
      return {
        title: "ផ្ទៀងផ្ទាត់ការជួសជុល",
        instruction:
          "ធ្វើឲ្យស្ថានភាពដើមកើតឡើងម្តងទៀត ហើយបញ្ជាក់ថារោគសញ្ញាបានបាត់ ហើយ DTC មិនត្រឡប់មកវិញ។",
        showReason: false,
      };

    case "session_complete":
      return {
        title: "បញ្ចប់",
        instruction: "រោគសញ្ញាត្រូវបានដោះស្រាយ។ គ្មានអ្វីត្រូវធ្វើបន្ថែមទៀតទេ។",
        showReason: false,
      };

    default:
      return { title: action.title, instruction: action.instruction, showReason: true };
  }
}

function humanizeMissingEvidence(
  m: NonNullable<ReasoningOutput>["missingEvidence"][number],
  session: DiagnosticSession,
): string {
  if (m.description.startsWith(AUTO_NO_SUPPORT_PREFIX)) {
    const hyp = m.relatedHypothesisId ? hypById(session, m.relatedHypothesisId) : undefined;
    return hyp ? `មិនទាន់មានភស្តុតាងគាំទ្រ "${hyp.title}"` : "មិនទាន់មានភស្តុតាងគាំទ្រ";
  }
  return m.description;
}

/* ---- Sprint 2 presentation helpers (read-only; no engine logic) ---- */

/** Whether a piece of evidence is currently linked to any hypothesis. */
function evidenceIsLinked(session: DiagnosticSession, evidenceId: string): boolean {
  return session.hypotheses.some(
    (h) =>
      h.supportingEvidenceIds.includes(evidenceId) ||
      h.contradictingEvidenceIds.includes(evidenceId),
  );
}

/** Khmer label + colour for each mechanic-response kind (History section). */
const RESPONSE_KIND_LABEL: Record<ActionResponseKind, { km: string; cls: string }> = {
  accepted: { km: "បានធ្វើ", cls: "bg-success/15 text-success" },
  skipped: { km: "បានរំលង", cls: "bg-warning/15 text-warning" },
  cannot_perform: { km: "មិនអាចធ្វើ", cls: "bg-warning/15 text-warning" },
  alternative_result: { km: "លទ្ធផលផ្សេង", cls: "bg-accent/15 text-accent" },
  overridden: { km: "បដិសេធ/ជ្រើសផ្សេង", cls: "bg-primary/15 text-primary" },
};

/* ============================================================================
 * The screen
 * ========================================================================= */

type PendingResponse = "skip" | "cannotPerform" | "override" | "recordRepair" | "verify" | null;

export default function DiagnosticSessionScreen() {
  const navigate = useNavigate();
  const [session, setSession] = useState<DiagnosticSession>(() => loadOrCreateDemoSession());
  const [reasoningOutput, setReasoningOutput] = useState<ReasoningOutput | null>(null);
  // The session version (updatedAt) the current reasoningOutput was computed
  // from. Because analyze() is async, a stale reasoningOutput must NOT drive
  // action selection — otherwise, e.g., a just-resolved contradiction would be
  // re-selected from the pre-resolution snapshot. (UI coordination only; the
  // engine is untouched.)
  const [reasoningKey, setReasoningKey] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const [pending, setPending] = useState<PendingResponse>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [directionInput, setDirectionInput] = useState("");
  const [repairText, setRepairText] = useState("");
  const [verifySymptomResolved, setVerifySymptomResolved] = useState<boolean | null>(null);
  const [verifyDtcCleared, setVerifyDtcCleared] = useState<boolean | null>(null);

  // Sprint 2 — collapsible sections + evidence-linking (presentation state only).
  const [showEvidence, setShowEvidence] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [linkingEvidenceId, setLinkingEvidenceId] = useState<string | null>(null);
  const recordRepairRef = useRef<HTMLDivElement | null>(null);

  // UX Audit v1 / P0-2 — Sprint 1 asked for "Next Action always visible without
  // scrolling", but the card was only moved to the top, not pinned: on a phone
  // the page runs ~1500px against an 812px viewport, so reading Current Thinking
  // or Evidence scrolls the OK / Not OK buttons off screen entirely. The card
  // itself is too tall and too action-type-dependent to pin (duplicating the
  // response controls would risk double submits), so we watch it instead and
  // raise a one-tap recall bar the moment it leaves the viewport.
  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionOffscreen, setActionOffscreen] = useState(false);

  // Fix #8 — when the record-repair form opens, bring it into view so the
  // mechanic never misses the newly revealed fields below the fold.
  useEffect(() => {
    if (pending === "recordRepair") {
      recordRepairRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [pending]);

  // Recompute the Reasoning Layer's output whenever the session changes.
  useEffect(() => {
    let cancelled = false;
    const key = session.updatedAt;
    ruleBasedReasoningProvider.analyze(buildReasoningInput(session)).then((output) => {
      if (!cancelled) {
        setReasoningOutput(output);
        setReasoningKey(key);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Once reasoning is ready, make sure exactly one action is selected —
  // idempotent: does nothing if one is active or paused. The reasoningKey
  // guard ensures we only select from reasoning computed for the CURRENT
  // session version, never a stale snapshot.
  useEffect(() => {
    if (!reasoningOutput) return;
    if (reasoningKey !== session.updatedAt) return;
    if (session.currentNextAction) return;
    if (session.status === "paused") return;
    const next = selectNextAction(session, reasoningOutput);
    if (next !== session) setSession(next);
  }, [session, reasoningOutput, reasoningKey]);

  // P0-2 — track whether the Next Action card is on screen. A plain scroll
  // listener rather than an IntersectionObserver: IO callbacks are tied to the
  // rendering lifecycle and go quiet whenever the page is not painting, which
  // would leave the bar stuck in whatever state it was in. Measuring the rect
  // on scroll always tells the truth, and it is one element.
  useEffect(() => {
    function measure() {
      const el = actionRef.current;
      // Off screen once its bottom edge passes above the top bar (h-14 = 56px).
      setActionOffscreen(!!el && el.getBoundingClientRect().bottom < 64);
    }
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [session.status, session.currentNextAction?.id]);

  function scrollToAction() {
    scrollIntoViewReliably(actionRef.current);
  }

  function commit(next: DiagnosticSession) {
    setSession(next);
    saveSession(next);
    setError(null);
    setPending(null);
    setNotice(null);
    setTextInput("");
    setDirectionInput("");
  }

  function runEngineAction(fn: () => DiagnosticSession) {
    try {
      commit(fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleSave() {
    saveSession(session);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  const action = session.currentNextAction;

  /* ------------------------------ Responses ------------------------------- */

  function handleAccept(result?: string) {
    if (!action || !reasoningOutput) return;
    runEngineAction(() => {
      if (action.type === "question") {
        let next = acceptAction(session, action.id, result || "(គ្មានចម្លើយ)");
        if (result && result.trim()) {
          next = addEvidence(next, {
            source: "technician",
            category: "technician_note",
            tier: "observed",
            description: result,
          });
          const findingId = action.sourceRecommendationIds[0];
          const finding = reasoningOutput.missingEvidence.find((m) => m.id === findingId);
          if (finding?.relatedHypothesisId) {
            const newEvidenceId = next.evidenceLog[next.evidenceLog.length - 1].id;
            next = linkSupportingEvidence(
              next,
              finding.relatedHypothesisId,
              newEvidenceId,
              "mechanic",
              "ចម្លើយចំពោះសំណួរដែលបានណែនាំ។",
            );
          }
        }
        return next;
      }

      if (action.type === "inspection" || action.type === "measurement_test") {
        let next = acceptAction(session, action.id, result ?? "ok");
        const isNotOk = result === "not_ok";
        next = addEvidence(next, {
          source: "technician",
          category: action.type === "inspection" ? "test" : "measurement",
          tier: "measured",
          description: `${action.title}: លទ្ធផល ${isNotOk ? "Not OK" : "OK"}។`,
        });
        const newEvidenceId = next.evidenceLog[next.evidenceLog.length - 1].id;
        for (const hypothesisId of action.sourceRecommendationIds) {
          next = isNotOk
            ? linkSupportingEvidence(next, hypothesisId, newEvidenceId, "mechanic", `លទ្ធផលតេស្ត: ${action.title} — Not OK។`)
            : linkSupportingEvidence(next, hypothesisId, newEvidenceId, "mechanic", `លទ្ធផលតេស្ត: ${action.title} — OK។`);
        }
        return next;
      }

      if (action.type === "mechanic_confirmation") {
        const hypothesisId = action.sourceRecommendationIds[0];
        const reason = result?.trim() || "ជាងបានពិនិត្យភស្តុតាង ហើយបញ្ជាក់ថានេះជាមូលហេតុ។";
        let next = confirmHypothesis(session, hypothesisId, "mechanic", reason);
        next = acceptAction(next, action.id, "បានបញ្ជាក់។");
        return next;
      }

      return acceptAction(session, action.id, result);
    });
  }

  function submitSkip() {
    if (!action) return;
    runEngineAction(() => skipAction(session, action.id, textInput));
    // Fix #5 — make Skip's effect visible. If the same step returns, that's
    // because there's no new data yet, and this banner explains that.
    setNotice(
      "បានរំលង ✓ ហេតុផលត្រូវបានកត់ត្រា។ ប្រសិនបើជំហានដដែលបង្ហាញម្តងទៀត នោះមានន័យថាវានៅតែជាជម្រើសល្អបំផុត ព្រោះមិនទាន់មានទិន្នន័យថ្មី។",
    );
  }

  function submitCannotPerform() {
    if (!action || !reasoningOutput) return;
    runEngineAction(() =>
      cannotPerformAction(session, action.id, reasoningOutput, { reason: textInput || undefined }),
    );
    setNotice(
      "បានកត់ត្រា ✓ ។ បើមានជម្រើសផ្សេងសមមូល វានឹងបង្ហាញ។ បើគ្មានទេ ភាពមិនច្បាស់លាស់ត្រូវបានកត់ត្រាទុក ដើម្បីមិនឲ្យបាត់។",
    );
  }

  /**
   * Fix #6 — contradiction resolution. Uses ONLY existing, frozen Hypothesis
   * Engine operations (eliminateHypothesis / unlinkEvidence) — no engine code
   * is changed. The mechanic is the authority (decision-authority-model.md):
   * "rules_out" eliminates the contradicted theory; "not_contradict" removes
   * the evidence's contradicting link so it no longer conflicts.
   */
  function resolveContradiction(kind: "rules_out" | "not_contradict") {
    if (!action || !reasoningOutput) return;
    const c = reasoningOutput.contradictions[0];
    if (!c) return;
    runEngineAction(() => {
      let next = acceptAction(
        session,
        action.id,
        kind === "rules_out"
          ? "ភស្តុតាងកាត់ទ្រឹស្ដីផ្ទុយចេញ"
          : "ភស្តុតាងតាមពិតមិនផ្ទុយ",
      );
      for (const bId of c.contradictingHypothesisIds) {
        next =
          kind === "rules_out"
            ? eliminateHypothesis(next, bId, "mechanic", "ភស្តុតាងកាត់ទ្រឹស្ដីនេះចេញ (contradiction review)។")
            : unlinkEvidence(
                next,
                bId,
                c.evidenceId,
                "mechanic",
                "ភស្តុតាងតាមពិតមិនផ្ទុយនឹងទ្រឹស្ដីនេះទេ (contradiction review)។",
              );
      }
      return next;
    });
  }

  /**
   * Unblock the "no hypotheses yet" dead end.
   *
   * When a session starts from a symptom with no DTC, the rule-based reasoning
   * has nothing to generate causes from, so the Orchestrator can only ask for
   * more evidence — leaving the mechanic with nowhere to go. The mechanic is
   * the authority (decision-authority-model.md §3), so let them state the
   * suspected cause themselves. Uses ONLY the frozen addHypothesis op.
   */
  function addSuspectedCause(title: string) {
    const clean = title.trim();
    if (!clean) return;
    runEngineAction(() => {
      const next = addHypothesis(
        session,
        {
          title: clean,
          description: "មូលហេតុសង្ស័យ ដែលជាងបានបញ្ចូលដោយផ្ទាល់។",
          systemId: session.system,
          failureDomain: guessFailureDomain(clean),
        },
        "mechanic",
        "ជាងសង្ស័យមូលហេតុនេះ ផ្អែកលើរោគសញ្ញា និងបទពិសោធន៍។",
      );
      // Clear the pending action so the Orchestrator re-picks against the new
      // hypothesis instead of idempotently returning the stale one.
      return { ...next, currentNextAction: null };
    });
  }

  /**
   * Fix #4 — link an already-recorded piece of evidence to a hypothesis after
   * the fact, so early observations are never stranded. Uses ONLY the frozen
   * linkSupportingEvidence engine op; the mechanic chooses the hypothesis.
   */
  function linkEvidenceToHypothesis(evidenceId: string, hypothesisId: string) {
    runEngineAction(() =>
      linkSupportingEvidence(session, hypothesisId, evidenceId, "mechanic", "ភ្ជាប់ដោយជាងផ្ទាល់។"),
    );
    setLinkingEvidenceId(null);
  }

  function submitOverride() {
    if (!action) return;
    runEngineAction(() => overrideAction(session, action.id, directionInput, textInput));
  }

  /* ----------------------------- Session controls -------------------------- */

  function handlePause() {
    runEngineAction(() => pauseSession(session));
  }
  function handleResume() {
    runEngineAction(() => resumeSession(session));
  }

  const confirmedHypothesis: Hypothesis | undefined = session.hypotheses.find(
    (h) => h.id === session.currentBestTheory && h.status === "confirmed",
  );

  /**
   * These three functions call session-lifecycle engine functions directly
   * (recordRepairDecision / completeSession / verifySession) rather than
   * going through the Orchestrator's response functions, because they're
   * driven by the "Session Controls" (Finish) rather than a response to
   * the current NextAction. Those engine functions correctly transition
   * session.status but — unlike acceptAction/skipAction/etc. — have no
   * reason to know about currentNextAction at all, so they leave it as-is.
   * We clear it here, at the UI layer, so the next render's
   * selectNextAction() recomputes fresh against the new status instead of
   * idempotently returning the now-stale action. This is pure coordination
   * of already-frozen engine behavior — no engine logic is duplicated.
   */
  function handleFinish() {
    if (session.status === "verified" || session.status === "abandoned") return;
    if (!confirmedHypothesis) {
      setError("សូមបញ្ជាក់មូលហេតុ (root cause) មុននឹងបញ្ចប់សម័យវិនិច្ឆ័យ។");
      return;
    }
    if (!session.repairDecision) {
      setPending("recordRepair");
      return;
    }
    if (session.status === "active") {
      runEngineAction(() => ({ ...completeSession(session), currentNextAction: null }));
    }
  }

  function submitRecordRepair() {
    if (!confirmedHypothesis || !repairText.trim()) return;
    runEngineAction(() => {
      let next = recordRepairDecision(session, {
        rootCauseHypothesisId: confirmedHypothesis.id,
        repairPerformed: repairText,
      });
      next = completeSession(next);
      return { ...next, currentNextAction: null };
    });
    setRepairText("");
  }

  function submitVerify() {
    runEngineAction(() => {
      const next = verifySession(session, {
        symptomConfirmed: true,
        inspectionSupportsRootCause: true,
        repairPerformed: session.repairDecision?.repairPerformed ?? "",
        symptomResolved: verifySymptomResolved === true,
        dtcsClearedAndStayCleared: verifyDtcCleared,
        mechanicConfirmed: true,
        verifiedAt: null,
      });
      return { ...next, currentNextAction: null };
    });
  }

  /**
   * Milestone 8 — the flywheel. Save a VERIFIED session into the Case
   * Library. The verified-only gate lives in canSaveAsCase()
   * (decision-authority-model.md §5: never learn from an unproven outcome);
   * this only maps + persists through the existing caseStore.
   */
  function saveAsRepairCase() {
    if (!canSaveAsCase(session)) {
      setError("ត្រូវផ្ទៀងផ្ទាត់ (Verify) សម័យនេះជាមុនសិន មុននឹងរក្សាទុកជា Repair Case។");
      return;
    }
    try {
      const draft = diagnosticSessionToRepairCase(session);
      caseStore.save(draft);
      navigate(`/cases/${draft.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /* --------------------------------- Render --------------------------------- */

  const paused = session.status === "paused";

  return (
    <>
      <TopBar
        title="សម័យវិនិច្ឆ័យ"
        back
        right={
          <button
            onClick={handleSave}
            className="btn h-10 rounded-xl px-3 text-sm font-semibold text-primary active:bg-surface-2"
          >
            {savedFlash ? "✓ បានរក្សាទុក" : "រក្សាទុក"}
          </button>
        }
      />
      <Page>
        {/* Progress */}
        <div className="mb-4">
          <ProgressTimeline session={session} />
        </div>

        {/* Session paused banner (kept near the top so its Resume is reachable) */}
        {paused && (
          <Card className="mb-4 border-warning/30 bg-warning/8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon.Alert size={20} className="text-warning" />
                <p className="text-sm font-semibold">សម័យនេះកំពុងផ្អាក</p>
              </div>
              <Button variant="surface" onClick={handleResume} className="!min-h-0 !px-4 !py-2 text-sm">
                ▶ បន្តការងារ
              </Button>
            </div>
          </Card>
        )}

        {/* Fix #3 — Current Next Action FIRST, so it is visible without scrolling.
            P0-2 — plus actionRef, so the recall bar knows when it scrolls away. */}
        {!paused && (
          <div ref={actionRef} className="scroll-mt-20">
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <SectionTitle icon={<Icon.Alert size={18} className="text-primary" />}>
              សកម្មភាពបន្ទាប់ (Next Action)
            </SectionTitle>

            {/* Fix #5 — a visible acknowledgment banner (e.g. after Skip). */}
            {notice && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/8 p-2.5 text-sm">
                <Icon.Check size={18} className="mt-0.5 shrink-0 text-accent" />
                <span className="flex-1 leading-snug">{notice}</span>
                <button
                  onClick={() => setNotice(null)}
                  aria-label="បិទ"
                  className="shrink-0 text-muted active:text-text"
                >
                  <Icon.Close size={16} />
                </button>
              </div>
            )}

            {!action ? (
              <LoadingDots label="កំពុងជ្រើសរើសសកម្មភាព..." />
            ) : (
              (() => {
                // Fix #4 — display humanized wording, never the raw engine strings.
                const present = presentAction(action, session, reasoningOutput);
                const isSafety = action.type === "safety_instruction";
                return (
                  <div className="space-y-3">
                    <div>
                      <span className="chip mb-2 inline-block text-xs font-semibold">
                        {ACTION_TYPE_LABEL[action.type]}
                      </span>
                      <h3 className="text-lg font-bold leading-snug">{present.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed">{present.instruction}</p>
                    </div>

                    {present.showReason && action.reason !== present.instruction && (
                      <div className="rounded-xl bg-surface-2 p-3 text-sm">
                        <span className="font-semibold text-muted">ហេតុអ្វី: </span>
                        {action.reason}
                      </div>
                    )}

                    {action.safetyWarning && (
                      <div className="flex gap-2.5 rounded-xl border border-danger/30 bg-danger/8 p-3 text-sm">
                        <Icon.Alert size={18} className="mt-0.5 shrink-0 text-danger" />
                        {action.safetyWarning}
                      </div>
                    )}

                    {(action.requiredTool || action.componentLocation) && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {action.requiredTool && (
                          <span className="chip">🔧 {action.requiredTool}</span>
                        )}
                        {action.componentLocation && (
                          <span className="chip">📍 {action.componentLocation}</span>
                        )}
                      </div>
                    )}

                    {error && (
                      <p className="rounded-xl border border-danger/30 bg-danger/8 p-2.5 text-sm text-danger">
                        {error}
                      </p>
                    )}

                    {/* Response area — adapts to the action's expected result type */}
                    <ResponseArea
                      action={action}
                      session={session}
                      reasoningOutput={reasoningOutput}
                      confirmedHypothesis={confirmedHypothesis}
                      onAccept={handleAccept}
                      onAddSuspectedCause={addSuspectedCause}
                      onResolveContradiction={resolveContradiction}
                      onVerify={submitVerify}
                      verifySymptomResolved={verifySymptomResolved}
                      setVerifySymptomResolved={setVerifySymptomResolved}
                      verifyDtcCleared={verifyDtcCleared}
                      setVerifyDtcCleared={setVerifyDtcCleared}
                      textInput={textInput}
                      setTextInput={setTextInput}
                    />

                    {/* Fix #1 — Skip / Cannot Perform / Override are NOT offered on
                        safety steps (nor on terminal/verification steps). */}
                    {!isSafety &&
                      action.type !== "session_complete" &&
                      action.type !== "repair_verification" && (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <button
                            onClick={() => setPending(pending === "skip" ? null : "skip")}
                            className={cx(
                              "btn min-h-[48px] rounded-xl border border-border text-sm font-semibold active:bg-surface-2",
                              pending === "skip" && "border-primary bg-primary/10",
                            )}
                          >
                            ⏭ រំលង
                          </button>
                          <button
                            onClick={() => setPending(pending === "cannotPerform" ? null : "cannotPerform")}
                            className={cx(
                              "btn min-h-[48px] rounded-xl border border-border text-sm font-semibold active:bg-surface-2",
                              pending === "cannotPerform" && "border-primary bg-primary/10",
                            )}
                          >
                            ⚠ មិនអាចធ្វើបាន
                          </button>
                          <button
                            onClick={() => setPending(pending === "override" ? null : "override")}
                            className={cx(
                              "btn min-h-[48px] rounded-xl border border-border text-sm font-semibold active:bg-surface-2",
                              pending === "override" && "border-primary bg-primary/10",
                            )}
                          >
                            ✍ បដិសេធ/ជ្រើសផ្សេង
                          </button>
                        </div>
                      )}

                {pending === "skip" && (
                  <InlineForm
                    label="ហេតុអ្វីបានជារំលង? (ត្រូវបំពេញ)"
                    value={textInput}
                    onChange={setTextInput}
                    onSubmit={submitSkip}
                    onCancel={() => setPending(null)}
                    submitLabel="រំលង"
                    disabled={!textInput.trim()}
                  />
                )}
                {pending === "cannotPerform" && (
                  <InlineForm
                    label="ហេតុអ្វីមិនអាចធ្វើបាន? (ស្រេចចិត្ត)"
                    value={textInput}
                    onChange={setTextInput}
                    onSubmit={submitCannotPerform}
                    onCancel={() => setPending(null)}
                    submitLabel="ដាក់ស្នើ"
                  />
                )}
                {pending === "override" && (
                  <div className="space-y-2 rounded-xl border border-border p-3">
                    <input
                      className="input"
                      placeholder="តើអ្នកនឹងធ្វើអ្វីជំនួស?"
                      value={directionInput}
                      onChange={(e) => setDirectionInput(e.target.value)}
                    />
                    <input
                      className="input"
                      placeholder="តើភស្តុតាងអ្វីធ្វើឲ្យអ្នកជ្រើសរើសបែបនេះ?"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button variant="surface" onClick={() => setPending(null)} className="!min-h-0 flex-1 !py-2.5 text-sm">
                        បោះបង់
                      </Button>
                      <Button
                        onClick={submitOverride}
                        disabled={!directionInput.trim() || !textInput.trim()}
                        className="!min-h-0 flex-1 !py-2.5 text-sm"
                      >
                        បដិសេធ
                      </Button>
                    </div>
                  </div>
                )}
                  </div>
                );
              })()
            )}
          </Card>
          </div>
        )}

        {/* Vehicle Information */}
        <Card className="mb-4">
          <SectionTitle icon={<Icon.Car size={18} className="text-primary" />}>
            ព័ត៌មានរថយន្ត
          </SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted">ម៉ាក (Make): </span>
              <span className="font-semibold">{session.vehicle.brand}</span>
            </div>
            <div>
              <span className="text-muted">ម៉ូដែល (Model): </span>
              <span className="font-semibold">{session.vehicle.model}</span>
            </div>
            <div>
              <span className="text-muted">ឆ្នាំ (Year): </span>
              <span className="font-semibold">{session.vehicle.year ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted">ម៉ាស៊ីន (Engine): </span>
              <span className="font-semibold">{session.vehicle.engine || "—"}</span>
            </div>
            {session.vehicle.transmission && (
              <div>
                <span className="text-muted">ប្រអប់លេខ (Trans): </span>
                <span className="font-semibold">{session.vehicle.transmission}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Customer Complaint */}
        <Card className="mb-4">
          <SectionTitle icon={<Icon.Chat size={18} className="text-accent" />}>
            បញ្ហារបស់អតិថិជន
          </SectionTitle>
          <p className="text-sm leading-relaxed">{session.complaint}</p>
        </Card>

        {/* Current Thinking — Fix #2: shorter, easier to scan */}
        <Card className="mb-4">
          <SectionTitle icon={<Icon.Wrench size={18} className="text-primary" />}>
            ការគិតបច្ចុប្បន្ន
          </SectionTitle>

          {!reasoningOutput ? (
            <LoadingDots label="កំពុងវិភាគភស្តុតាង..." />
          ) : (
            (() => {
              const active = listActiveHypotheses(session);
              const top = confirmedHypothesis ?? active[0];
              const alternatives = confirmedHypothesis ? active : active.slice(1);
              const missing = reasoningOutput.missingEvidence;
              return (
                <div className="space-y-2.5">
                  <p className="text-sm font-medium leading-snug">
                    {summarizeReasoning(session, reasoningOutput)}
                  </p>

                  {/* Fix #10 — explain why the app still asks about other theories. */}
                  {confirmedHypothesis && alternatives.length > 0 && (
                    <p className="rounded-xl border border-accent/30 bg-accent/8 p-2.5 text-xs leading-relaxed">
                      ✅ មូលហេតុបានបញ្ជាក់រួច។ នៅមានទ្រឹស្ដីជំនួស {alternatives.length}{" "}
                      ដែលមិនទាន់ដោះស្រាយ — អ្នកអាចដោះស្រាយវាឥឡូវ ឬ បន្តទៅការជួសជុលក៏បាន។
                    </p>
                  )}

                  {top ? (
                    <div className="rounded-xl border border-border p-2.5">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase text-muted">
                          {confirmedHypothesis ? "មូលហេតុបញ្ជាក់" : "ទ្រឹស្ដីឈានមុខគេ"}
                        </span>
                        <HypothesisStatusBadge status={top.status} />
                      </div>
                      <p className="font-semibold leading-snug">{top.title}</p>
                      <p className="line-clamp-2 text-xs text-muted">{top.description}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">មិនទាន់មានទ្រឹស្ដី។</p>
                  )}

                  {alternatives.length > 0 && (
                    <div>
                      {/* No `uppercase` here: Khmer has no case, so the class
                          only shouted the English half — "(ALTERNATIVES)" — which
                          read like an error code. The English is gone too; the
                          language standard keeps component names in English, not
                          the engine's own vocabulary. */}
                      <p className="mb-1 text-[11px] font-semibold text-muted">
                        ទ្រឹស្ដីជំនួស
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {alternatives.map((h) => (
                          <span key={h.id} className="chip text-xs">
                            {h.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {missing.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-muted">
                        ភស្តុតាងដែលនៅខ្វះ
                      </p>
                      <ul className="space-y-0.5">
                        {missing.slice(0, 2).map((m) => (
                          <li key={m.id} className="flex gap-2 text-xs">
                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-warning" />
                            {humanizeMissingEvidence(m, session)}
                          </li>
                        ))}
                        {missing.length > 2 && (
                          <li className="text-xs text-muted">+{missing.length - 2} បន្ថែម</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </Card>

        {/* Session Controls */}
        <Card>
          <SectionTitle>ការគ្រប់គ្រងសម័យ</SectionTitle>
          {/* P2-1 — Save lived both here and in the top bar. Once the top-bar
              label stopped being the English "Save" (P1-2) the two read
              identically, so only the top-bar one is kept: it is on screen at
              every scroll position, while this card is at the very bottom.
              Nothing is lost either way — every response already autosaves. */}
          <div>
            {!paused ? (
              <Button variant="surface" full onClick={handlePause} className="!min-h-0 !py-3 text-sm">
                ⏸ ផ្អាកទុកសិន
              </Button>
            ) : (
              <Button variant="surface" full onClick={handleResume} className="!min-h-0 !py-3 text-sm">
                ▶ បន្តការងារ
              </Button>
            )}
          </div>
          {/* Fix #8 — hide Finish while the record-repair form is open, so the
              mechanic can't tap it twice or miss the revealed fields. */}
          {pending !== "recordRepair" && (
            <div className="mt-2">
              <Button
                onClick={handleFinish}
                disabled={session.status === "verified" || session.status === "abandoned" || paused}
                full
                className="!min-h-0 !py-3 text-sm"
              >
                🏁 បញ្ចប់ការងារ
              </Button>
            </div>
          )}

          {pending === "recordRepair" && (
            <div
              ref={recordRepairRef}
              className="mt-3 space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3"
            >
              <p className="text-sm font-semibold">
                មុននឹងបញ្ចប់ — តើអ្នកបានជួសជុលអ្វី? (Repair performed)
              </p>
              <input
                className="input"
                placeholder="ឧ. ប្ដូរ Injector #1"
                value={repairText}
                onChange={(e) => setRepairText(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="surface" onClick={() => setPending(null)} className="!min-h-0 flex-1 !py-2.5 text-sm">
                  បោះបង់
                </Button>
                <Button
                  onClick={submitRecordRepair}
                  disabled={!repairText.trim()}
                  className="!min-h-0 flex-1 !py-2.5 text-sm"
                >
                  កត់ត្រា និង បញ្ចប់
                </Button>
              </div>
            </div>
          )}

          {session.status === "verified" && (
            <div className="mt-3 space-y-2">
              <p className="flex items-center gap-2 rounded-xl bg-success/10 p-2.5 text-sm font-semibold text-success">
                <Icon.Check size={18} /> សម័យនេះត្រូវបានផ្ទៀងផ្ទាត់ និងបញ្ចប់ (Verified & Complete)
              </p>
              {/* Milestone 8 — the flywheel: only a VERIFIED session may become a case. */}
              <Button onClick={saveAsRepairCase} full className="!min-h-0 !py-3 text-sm">
                <Icon.Book size={18} /> រក្សាទុកជា Repair Case
              </Button>
              <p className="text-center text-xs text-muted">
                ករណីនេះនឹងជួយការវិនិច្ឆ័យលើកក្រោយ (Case Library)។
              </p>
            </div>
          )}
        </Card>

        {/* Fix #4 — all recorded evidence is visible; unlinked items can be
            linked to a hypothesis so early observations are never stranded. */}
        {(() => {
          const evidence = listActiveEvidence(session);
          if (evidence.length === 0) return null;
          const activeHyps = listActiveHypotheses(session);
          return (
            <Card className="mt-4">
              <button
                onClick={() => setShowEvidence((v) => !v)}
                className="flex w-full items-center justify-between text-base font-bold"
              >
                <span>ភស្តុតាងដែលប្រមូលបាន · {evidence.length}</span>
                <span className="text-muted">{showEvidence ? "▾" : "▸"}</span>
              </button>
              {showEvidence && (
                <div className="mt-3 space-y-2">
                  {evidence.map((e) => {
                    const linked = evidenceIsLinked(session, e.id);
                    return (
                      <div key={e.id} className="rounded-xl border border-border p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm leading-snug">{e.description}</p>
                          <span
                            className={cx(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              linked ? "bg-success/15 text-success" : "bg-muted/20 text-muted",
                            )}
                          >
                            {linked ? "✓ ភ្ជាប់ហើយ" : "មិនទាន់ភ្ជាប់"}
                          </span>
                        </div>
                        {!linked && activeHyps.length > 0 && (
                          <div className="mt-2">
                            {linkingEvidenceId === e.id ? (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-semibold text-muted">
                                  ភ្ជាប់ជាភស្តុតាងគាំទ្រ ទៅទ្រឹស្ដីណា?
                                </p>
                                {activeHyps.map((h) => (
                                  <button
                                    key={h.id}
                                    onClick={() => linkEvidenceToHypothesis(e.id, h.id)}
                                    className="btn min-h-[40px] w-full rounded-xl border border-border px-3 text-left text-sm active:bg-surface-2"
                                  >
                                    {h.title}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setLinkingEvidenceId(null)}
                                  className="text-xs text-muted"
                                >
                                  បោះបង់
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setLinkingEvidenceId(e.id)}
                                className="btn min-h-[40px] rounded-xl border border-border px-4 text-sm font-semibold active:bg-surface-2"
                              >
                                🔗 ភ្ជាប់ទៅទ្រឹស្ដី
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })()}

        {/* Fix #9 — a visible history of how the mechanic responded to each step. */}
        {session.actionHistory.length > 0 && (
          <Card className="mt-4">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center justify-between text-base font-bold"
            >
              <span>ប្រវត្តិការងារ · {session.actionHistory.length}</span>
              <span className="text-muted">{showHistory ? "▾" : "▸"}</span>
            </button>
            {showHistory && (
              <div className="mt-3 space-y-2">
                {[...session.actionHistory].reverse().map((r) => {
                  const act = session.actionLog.find((a) => a.id === r.actionId);
                  const label = RESPONSE_KIND_LABEL[r.kind];
                  return (
                    <div key={r.id} className="rounded-xl border border-border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {act ? ACTION_TYPE_LABEL[act.type] : "សកម្មភាព"}
                        </span>
                        <span
                          className={cx(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            label.cls,
                          )}
                        >
                          {label.km}
                        </span>
                      </div>
                      {(r.reason || r.result) && (
                        <p className="mt-1 text-xs text-muted">{r.reason || r.result}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </Page>

      {/* P0-2 — recall bar. Only appears once the Next Action card is off screen,
          so it never competes with the card itself. It restates WHAT the step is
          (a mechanic who scrolled away to check Current Thinking has usually
          forgotten) and puts the way back one thumb-tap from the bottom edge. */}
      {!paused && action && actionOffscreen && (
        <button
          onClick={scrollToAction}
          // No entrance animation: this bar toggles on every scroll past the
          // card, so a fade would flicker — and an interrupted fade can leave
          // it stranded at opacity 0, hiding the very control it exists to offer.
          className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-primary/30 bg-bg/95 backdrop-blur-md active:bg-surface-2"
        >
          <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon.Alert size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
                សកម្មភាពបន្ទាប់
              </span>
              <span className="block truncate text-sm font-bold">
                {presentAction(action, session, reasoningOutput).title}
              </span>
            </span>
            <span className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-fg">
              ↑ ឆ្លើយតប
            </span>
          </div>
        </button>
      )}
    </>
  );
}

/* ============================================================================
 * Response area — adapts to the current action's expected result type
 * ========================================================================= */

function ResponseArea({
  action,
  session,
  reasoningOutput,
  confirmedHypothesis,
  onAccept,
  onAddSuspectedCause,
  onResolveContradiction,
  onVerify,
  verifySymptomResolved,
  setVerifySymptomResolved,
  verifyDtcCleared,
  setVerifyDtcCleared,
  textInput,
  setTextInput,
}: {
  action: NonNullable<DiagnosticSession["currentNextAction"]>;
  session: DiagnosticSession;
  reasoningOutput: ReasoningOutput | null;
  confirmedHypothesis: Hypothesis | undefined;
  onAccept: (result?: string) => void;
  onAddSuspectedCause: (title: string) => void;
  onResolveContradiction: (kind: "rules_out" | "not_contradict") => void;
  onVerify: () => void;
  verifySymptomResolved: boolean | null;
  setVerifySymptomResolved: (v: boolean | null) => void;
  verifyDtcCleared: boolean | null;
  setVerifyDtcCleared: (v: boolean | null) => void;
  textInput: string;
  setTextInput: (v: string) => void;
}) {
  // Fix #1 — safety steps offer ONLY a deliberate acknowledgment (no skip path).
  if (action.type === "safety_instruction") {
    return (
      <Button
        onClick={() => onAccept("បានធ្វើ Isolation & ត្រៀមសុវត្ថិភាពរួច")}
        full
        className="!min-h-0 !py-3 text-sm"
      >
        ✓ ខ្ញុំបានធ្វើ Isolation និងត្រៀមសុវត្ថិភាពរួច
      </Button>
    );
  }

  // Fix #6 — a clear resolution workflow for a flagged contradiction.
  if (action.type === "review_contradiction") {
    const c = reasoningOutput?.contradictions[0];
    const nameOf = (ids: string[]) =>
      ids
        .map((id) => session.hypotheses.find((h) => h.id === id)?.title)
        .filter(Boolean)
        .join(", ");
    const support = c ? nameOf(c.supportingHypothesisIds) : "";
    const against = c ? nameOf(c.contradictingHypothesisIds) : "";
    return (
      <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/8 p-3">
        <p className="text-sm leading-relaxed">
          ភស្តុតាងនេះ គាំទ្រ <span className="font-semibold">{support || "?"}</span> ប៉ុន្តែផ្ទុយនឹង{" "}
          <span className="font-semibold">{against || "?"}</span>។ បន្ទាប់ពីពិនិត្យរួច សូមជ្រើសរើស៖
        </p>
        <Button
          onClick={() => onResolveContradiction("rules_out")}
          full
          className="!min-h-0 !py-2.5 text-sm"
        >
          ភស្តុតាងកាត់ "{against || "?"}" ចេញ
        </Button>
        <Button
          variant="surface"
          onClick={() => onResolveContradiction("not_contradict")}
          full
          className="!min-h-0 !py-2.5 text-sm"
        >
          តាមពិត វាមិនផ្ទុយនឹង "{against || "?"}" ទេ
        </Button>
        <Button
          variant="ghost"
          onClick={() => onAccept("បានពិនិត្យ — រក្សាទុកដដែល")}
          full
          className="!min-h-0 !py-2.5 text-sm text-muted"
        >
          ពិនិត្យរួច — មិនផ្លាស់ប្តូរ
        </Button>
      </div>
    );
  }

  if (action.type === "session_complete") {
    return (
      <p className="rounded-xl bg-success/10 p-3 text-center text-sm font-semibold text-success">
        គ្មានអ្វីត្រូវធ្វើបន្ថែមទៀតទេ 🎉
      </p>
    );
  }

  if (action.type === "repair_verification") {
    return (
      <div className="space-y-2 rounded-xl border border-border p-3">
        <p className="text-sm font-semibold">តើរោគសញ្ញាដើមបានបាត់ទៅហើយឬទេ?</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={verifySymptomResolved === true ? "primary" : "surface"}
            onClick={() => setVerifySymptomResolved(true)}
            className="!min-h-0 !py-2.5 text-sm"
          >
            បាទ/ចាស បាត់ហើយ
          </Button>
          <Button
            variant={verifySymptomResolved === false ? "danger" : "surface"}
            onClick={() => setVerifySymptomResolved(false)}
            className="!min-h-0 !py-2.5 text-sm"
          >
            ទេ នៅតែមាន
          </Button>
        </div>
        <p className="pt-1 text-sm font-semibold">តើ DTC មិនត្រឡប់មកវិញទេ?</p>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={verifyDtcCleared === true ? "primary" : "surface"}
            onClick={() => setVerifyDtcCleared(true)}
            className="!min-h-0 !py-2.5 text-xs"
          >
            មិនត្រឡប់
          </Button>
          <Button
            variant={verifyDtcCleared === false ? "danger" : "surface"}
            onClick={() => setVerifyDtcCleared(false)}
            className="!min-h-0 !py-2.5 text-xs"
          >
            ត្រឡប់វិញ
          </Button>
          <Button
            variant={verifyDtcCleared === null ? "primary" : "surface"}
            onClick={() => setVerifyDtcCleared(null)}
            className="!min-h-0 !py-2.5 text-xs"
          >
            N/A
          </Button>
        </div>
        <Button
          onClick={onVerify}
          disabled={verifySymptomResolved === null}
          full
          className="!min-h-0 !py-3 text-sm"
        >
          ✓ ផ្ទៀងផ្ទាត់ និង បញ្ចប់
        </Button>
      </div>
    );
  }

  if (action.type === "mechanic_confirmation") {
    return (
      <div className="space-y-2 rounded-xl border border-success/30 bg-success/5 p-3">
        <p className="text-sm font-semibold">ហេតុអ្វីអ្នកយល់ព្រមបញ្ជាក់មូលហេតុនេះ?</p>
        <textarea
          className="input min-h-[70px] resize-none text-sm"
          placeholder={`ឧ. ${confirmedHypothesis ? "" : "Return-volume test បញ្ជាក់ច្បាស់ — ខ្ញុំបានធ្វើ និងឃើញផ្ទាល់។"}`}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
        <Button onClick={() => onAccept(textInput)} full className="!min-h-0 !py-3 text-sm">
          ✅ បញ្ជាក់ជាមូលហេតុ (Confirm root cause)
        </Button>
      </div>
    );
  }

  if (action.type === "inspection" || action.type === "measurement_test") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => onAccept("ok")} variant="surface" className="!min-h-0 !py-3 text-sm">
          ✓ OK
        </Button>
        <Button onClick={() => onAccept("not_ok")} variant="danger" className="!min-h-0 !py-3 text-sm">
          ✗ Not OK
        </Button>
      </div>
    );
  }

  if (action.type === "question") {
    return (
      <div className="space-y-2">
        <textarea
          className="input min-h-[70px] resize-none text-sm"
          placeholder="ចម្លើយរបស់អ្នក..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
        <Button onClick={() => onAccept(textInput)} full className="!min-h-0 !py-3 text-sm">
          ✓ ដាក់ស្នើចម្លើយ
        </Button>
      </div>
    );
  }

  // request_evidence — the mechanic must be able to actually DO something here,
  // otherwise a symptom-only session (no DTC → no hypotheses) is a dead end.
  if (action.type === "request_evidence") {
    const hasHypotheses = session.hypotheses.some(
      (h) => h.status === "active" || h.status === "weakened",
    );
    return (
      <div className="space-y-2 rounded-xl border border-border p-3">
        <p className="text-sm font-semibold">
          {hasHypotheses
            ? "បន្ថែមមូលហេតុសង្ស័យមួយទៀត?"
            : "តើអ្នកសង្ស័យអ្វីជាមូលហេតុ?"}
        </p>
        <p className="text-xs text-muted">
          វាយឈ្មោះផ្នែកដែលអ្នកសង្ស័យ — App នឹងណែនាំតេស្តដើម្បីបញ្ជាក់ ឬកាត់ចេញ។
        </p>
        <input
          className="input"
          placeholder="ឧ. Ignition coil ខ្សោយ · Spark plug ចាស់ · Fuel Pump"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
        <Button
          onClick={() => onAddSuspectedCause(textInput)}
          disabled={!textInput.trim()}
          full
          className="!min-h-0 !py-3 text-sm"
        >
          ＋ បន្ថែមមូលហេតុសង្ស័យ
        </Button>
        <Button
          variant="ghost"
          onClick={() => onAccept("បានប្រមូលភស្តុតាងបន្ថែម")}
          full
          className="!min-h-0 !py-2.5 text-sm text-muted"
        >
          រំលងជំហាននេះ
        </Button>
      </div>
    );
  }

  // safety_instruction, review_contradiction — a simple acknowledge.
  return (
    <Button onClick={() => onAccept(textInput || undefined)} full className="!min-h-0 !py-3 text-sm">
      ✓ បានធ្វើរួច (Completed)
    </Button>
  );
}

/* ============================================================================
 * A small inline reason form, reused by Skip and Cannot Perform
 * ========================================================================= */

function InlineForm({
  label,
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <p className="text-sm font-semibold">{label}</p>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="flex gap-2">
        <Button variant="surface" onClick={onCancel} className="!min-h-0 flex-1 !py-2.5 text-sm">
          បោះបង់
        </Button>
        <Button onClick={onSubmit} disabled={disabled} className="!min-h-0 flex-1 !py-2.5 text-sm">
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
