/**
 * Diagnostic Report — on-demand snapshot of a session's full reasoning
 * state (mvp-scope.md §6, "the 8-section output, including the AI's
 * plain-language summary"). Read-only: this screen renders existing session
 * data, it never computes new diagnosis or mutates the session.
 *
 * Two of the engine spec's eight sections (diagnostic-reasoning-engine.md
 * §11) don't map onto data this app actually stores yet:
 *   - §5 Component Information: there is no structured component encyclopedia
 *     (name/function/location/related-systems/common-failures) — only
 *     free-text hypothesis descriptions and DTC causes.
 *   - §7 Interpretation: the engine is interactive/adaptive, not a
 *     precomputed decision tree — there is no "if X then Y" branch table to
 *     display.
 * Per the engine spec's own rule ("if a section can't be filled, state why
 * — never guess"), §5 says so honestly, and §7 is rendered as what the app
 * actually has: the real chronological history of questions/tests and their
 * results — the same evidence a decision tree would have been built from.
 */
import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Page, TopBar } from "@/components/Layout";
import { Card, SectionTitle, LoadingDots, cx } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { loadSession } from "@/engine/sessionEngine";
import { buildReasoningInput } from "@/reasoning/reasoningProvider";
import { ruleBasedReasoningProvider } from "@/reasoning/ruleBasedReasoningProvider";
import { SYSTEM_BY_ID } from "@/data/systems";
import { formatDate, formatKm } from "@/utils/format";
import type { DiagnosticSession, Hypothesis, HypothesisStatus } from "@/types/session";
import type { ReasoningOutput } from "@/types/reasoning";

const STATUS_LABEL: Record<HypothesisStatus, string> = {
  confirmed: "✅ បញ្ជាក់ជាមូលហេតុ",
  active: "កំពុងពិចារណា",
  weakened: "ចុះខ្សោយ",
  eliminated: "✕ បដិសេធ",
};

const STATUS_ORDER: Record<HypothesisStatus, number> = {
  confirmed: 0,
  active: 1,
  weakened: 2,
  eliminated: 3,
};

function hypById(session: DiagnosticSession, id: string): Hypothesis | undefined {
  return session.hypotheses.find((h) => h.id === id);
}

/** Short plain-language summary — the report's version of "what's going on". */
function summarize(session: DiagnosticSession, output: ReasoningOutput | null): string {
  if (!output) return "កំពុងវិភាគ...";
  const confirmed = session.hypotheses.find((h) => h.status === "confirmed");
  if (confirmed) {
    return `មូលហេតុត្រូវបានបញ្ជាក់ថា "${confirmed.title}"។ ${
      session.repairDecision ? `បានជួសជុលរួច៖ ${session.repairDecision.repairPerformed}។` : ""
    }`;
  }
  const active = session.hypotheses
    .filter((h) => h.status === "active" || h.status === "weakened")
    .sort((a, b) => a.rank - b.rank);
  if (active.length === 0) return "មិនទាន់មានទ្រឹស្ដីណាមួយត្រូវបានបង្កើត។";
  if (output.contradictions.length > 0) {
    return `⚠ មានភស្តុតាងផ្ទុយគ្នា ${output.contradictions.length} ចំណុច — ត្រូវពិនិត្យបន្ថែមមុននឹងសន្និដ្ឋាន។`;
  }
  return `កំពុងផ្ដោតលើ "${active[0].title}" ជាទ្រឹស្ដីឈានមុខគេ (${active.length} ទ្រឹស្ដីកំពុងពិចារណា)។`;
}

export default function DiagnosticReport() {
  const { id = "" } = useParams();
  const session = loadSession(id);
  const [reasoningOutput, setReasoningOutput] = useState<ReasoningOutput | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    ruleBasedReasoningProvider.analyze(buildReasoningInput(session)).then((output) => {
      if (!cancelled) setReasoningOutput(output);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.updatedAt]);

  if (!session) return <Navigate to="/sessions" replace />;

  const sys = session.system ? SYSTEM_BY_ID[session.system] : null;
  const activeEvidence = session.evidenceLog.filter((e) => e.retractedAt === null);
  const confirmedEvidence = activeEvidence.filter(
    (e) => e.tier === "confirmed" || e.tier === "measured",
  );
  const reportedEvidence = activeEvidence.filter(
    (e) => e.tier === "reported" || e.tier === "observed",
  );
  const evidenceDescription = (evId: string) =>
    activeEvidence.find((e) => e.id === evId)?.description;

  const sortedHypotheses = [...session.hypotheses].sort((a, b) => {
    if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    }
    return a.rank - b.rank;
  });

  const otherSystems = new Map<string, number>();
  for (const h of session.hypotheses) {
    if (!h.systemId || h.systemId === session.system) continue;
    otherSystems.set(h.systemId, (otherSystems.get(h.systemId) ?? 0) + 1);
  }

  type TimelineEntry = { at: number; label: string; detail: string };
  const timeline: TimelineEntry[] = [];
  for (const q of session.askedQuestions) {
    const a = session.givenAnswers.find((ans) => ans.questionId === q.id);
    timeline.push({
      at: q.askedAt,
      label: `❓ ${q.questionText}`,
      detail: a ? `→ ${a.selectedOption}` : "→ (មិនទាន់ឆ្លើយ)",
    });
  }
  for (const t of session.completedTests) {
    const resultLabel =
      t.result === "ok" ? "✅ OK" : t.result === "not_ok" ? "❌ Not OK" : "❔ Unknown";
    timeline.push({
      at: t.completedAt,
      label: `🔍 ${t.testName}`,
      detail: `→ ${resultLabel}${t.measuredValue ? ` (${t.measuredValue})` : ""}${
        t.notes ? ` — ${t.notes}` : ""
      }`,
    });
  }
  timeline.sort((a, b) => a.at - b.at);

  return (
    <>
      <TopBar
        title="របាយការណ៍វិនិច្ឆ័យ"
        back
        right={
          <button
            onClick={() => window.print()}
            aria-label="print"
            className="btn h-10 w-10 rounded-xl text-text active:bg-surface-2"
          >
            <Icon.Book size={20} />
          </button>
        }
      />
      <Page>
        <SectionTitle>១. សេចក្តីសង្ខេបបញ្ហា</SectionTitle>
        <Card className="mb-5 space-y-2">
          <p className="font-semibold">
            {session.vehicle.brand} {session.vehicle.model} {session.vehicle.year ?? ""}
            {session.vehicle.engine ? ` · ${session.vehicle.engine}` : ""}
          </p>
          <p className="text-sm text-muted">
            {formatKm(session.vehicle.mileageKm)} · {formatDate(session.createdAt)}
          </p>
          <p className="text-sm leading-relaxed">{session.complaint}</p>
          {session.dtcs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {session.dtcs.map((d) => (
                <span key={d} className="chip font-semibold text-primary">
                  {d}
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-xs font-semibold text-success">
                ភស្តុតាងបញ្ជាក់ ({confirmedEvidence.length})
              </p>
              {confirmedEvidence.length === 0 ? (
                <p className="text-xs text-muted">—</p>
              ) : (
                confirmedEvidence.map((e) => (
                  <p key={e.id} className="text-xs">
                    {e.description}
                  </p>
                ))
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-warning">
                ភស្តុតាងរាយការណ៍ ({reportedEvidence.length})
              </p>
              {reportedEvidence.length === 0 ? (
                <p className="text-xs text-muted">—</p>
              ) : (
                reportedEvidence.map((e) => (
                  <p key={e.id} className="text-xs">
                    {e.description}
                  </p>
                ))
              )}
            </div>
          </div>
          {session.remainingUncertainty && (
            <p className="rounded-lg bg-warning/10 p-2 text-xs text-warning">
              ⚠ {session.remainingUncertainty}
            </p>
          )}
        </Card>

        <SectionTitle>២. ប្រព័ន្ធដែលទំនងជាពាក់ព័ន្ធ</SectionTitle>
        <Card className="mb-5 space-y-1.5">
          {sys ? (
            <p className="text-sm">
              <span className="font-semibold">
                {sys.icon} {sys.en}
              </span>{" "}
              — ប្រព័ន្ធសំខាន់នៃសម័យវិនិច្ឆ័យនេះ
            </p>
          ) : (
            <p className="text-sm text-muted">មិនទាន់កំណត់ប្រព័ន្ធនៅឡើយទេ។</p>
          )}
          {[...otherSystems.entries()].map(([sid, count]) => {
            const s2 = SYSTEM_BY_ID[sid];
            return (
              <p key={sid} className="text-sm text-muted">
                {s2?.icon} {s2?.en} — ពាក់ព័ន្ធនឹងទ្រឹស្ដី {count}
              </p>
            );
          })}
        </Card>

        <SectionTitle>៣. មូលហេតុដែលអាចកើតមាន (តាមលំដាប់)</SectionTitle>
        <div className="mb-5 space-y-2.5">
          {sortedHypotheses.length === 0 && (
            <Card>
              <p className="text-sm text-muted">មិនទាន់មានទ្រឹស្ដីណាមួយ។</p>
            </Card>
          )}
          {sortedHypotheses.map((h) => (
            <Card key={h.id} className={cx(h.status === "eliminated" && "opacity-60")}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-semibold">{h.title}</p>
                <span className="shrink-0 text-xs font-semibold">{STATUS_LABEL[h.status]}</span>
              </div>
              <p className="text-sm text-muted">{h.description}</p>
              {h.supportingEvidenceIds.length > 0 && (
                <p className="mt-1 text-xs">
                  <span className="font-semibold text-success">ភស្តុតាងគាំទ្រ៖ </span>
                  {h.supportingEvidenceIds.map(evidenceDescription).filter(Boolean).join(" · ")}
                </p>
              )}
              {h.missingEvidenceRequirements.length > 0 && (
                <p className="mt-1 text-xs">
                  <span className="font-semibold text-warning">ភស្តុតាងនៅខ្វះ៖ </span>
                  {h.missingEvidenceRequirements.join(" · ")}
                </p>
              )}
            </Card>
          ))}
        </div>

        <SectionTitle>៤. អាទិភាពត្រួតពិនិត្យ</SectionTitle>
        <Card className="mb-5">
          {session.currentNextAction &&
          (session.currentNextAction.type === "inspection" ||
            session.currentNextAction.type === "measurement_test") ? (
            <>
              <p className="font-semibold">{session.currentNextAction.title}</p>
              <p className="mt-1 text-sm">{session.currentNextAction.instruction}</p>
              <p className="mt-1 text-xs text-muted">មូលហេតុ៖ {session.currentNextAction.reason}</p>
            </>
          ) : (
            <p className="text-sm text-muted">
              {session.status === "verified"
                ? "ដំណាក់កាលត្រួតពិនិត្យបានបញ្ចប់ — មូលហេតុត្រូវបានផ្ទៀងផ្ទាត់ហើយ។"
                : "មិនមាន inspection កំពុងរង់ចាំពិនិត្យទេពេលនេះ។"}
            </p>
          )}
        </Card>

        <SectionTitle>៥. ព័ត៌មានគ្រឿងបន្លាស់</SectionTitle>
        <Card className="mb-5">
          <p className="text-sm text-muted">
            Master Technician មិនទាន់មាន component encyclopedia (ឈ្មោះ/មុខងារ/ទីតាំង/ការខូចទូទៅ)
            ដាច់ដោយឡែកនៅឡើយទេ — មើលព័ត៌មាន component ដោយផ្ទាល់ក្នុងផ្នែក "មូលហេតុដែលអាចកើតមាន"
            ខាងលើ ឬស្វែងរកក្នុង DTC Search។
          </p>
        </Card>

        <SectionTitle>៦. ការវាស់ស្ទង់</SectionTitle>
        <div className="mb-5 space-y-2">
          {session.completedTests.length === 0 && (
            <Card>
              <p className="text-sm text-muted">មិនទាន់មានការវាស់ស្ទង់ណាមួយបានកត់ត្រាទេ។</p>
            </Card>
          )}
          {session.completedTests.map((t) => (
            <Card key={t.id}>
              <p className="text-sm font-semibold">{t.testName}</p>
              <p className="text-xs text-muted">
                លទ្ធផល៖{" "}
                {t.result === "ok" ? "✅ OK" : t.result === "not_ok" ? "❌ Not OK" : "❔ Unknown"}
                {t.measuredValue ? ` · តម្លៃ៖ ${t.measuredValue}` : ""}
              </p>
              {t.notes && <p className="text-xs text-muted">{t.notes}</p>}
            </Card>
          ))}
          {session.currentNextAction?.type === "measurement_test" && (
            <Card className="border-primary/40 bg-primary/5">
              <p className="text-sm font-semibold">📏 កំពុងរង់ចាំ៖ {session.currentNextAction.title}</p>
              {session.currentNextAction.requiredTool && (
                <p className="text-xs text-muted">ឧបករណ៍៖ {session.currentNextAction.requiredTool}</p>
              )}
            </Card>
          )}
        </div>

        <SectionTitle>៧. កំណត់ត្រាហេតុផល</SectionTitle>
        <div className="mb-5 space-y-2">
          {timeline.length === 0 && (
            <Card>
              <p className="text-sm text-muted">មិនទាន់មានសំណួរ ឬតេស្តណាមួយបានកត់ត្រាទេ។</p>
            </Card>
          )}
          {timeline.map((entry, i) => (
            <Card key={i}>
              <p className="text-sm">{entry.label}</p>
              <p className="text-sm text-muted">{entry.detail}</p>
            </Card>
          ))}
        </div>

        <SectionTitle>៨. សកម្មភាពបន្ទាប់ដែលបានផ្ដល់អនុសាសន៍</SectionTitle>
        <Card className="mb-5">
          {session.repairDecision ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-success">✅ ជួសជុលរួច</p>
              <p className="text-sm">
                មូលហេតុ៖ {hypById(session, session.repairDecision.rootCauseHypothesisId)?.title ?? "—"}
              </p>
              <p className="text-sm">ការជួសជុល៖ {session.repairDecision.repairPerformed}</p>
              {session.verifiedDiagnosis?.verifiedAt && (
                <p className="text-xs text-muted">
                  ផ្ទៀងផ្ទាត់នៅ {formatDate(session.verifiedDiagnosis.verifiedAt)}
                </p>
              )}
            </div>
          ) : session.currentNextAction ? (
            <>
              <p className="font-semibold">{session.currentNextAction.title}</p>
              <p className="mt-1 text-sm">{session.currentNextAction.instruction}</p>
              {session.currentNextAction.safetyWarning && (
                <p className="mt-2 rounded-lg bg-danger/10 p-2 text-xs text-danger">
                  ⚠ {session.currentNextAction.safetyWarning}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">មិនមានសកម្មភាពបន្ទាប់ណាមួយទេពេលនេះ។</p>
          )}
        </Card>

        {!reasoningOutput ? (
          <LoadingDots label="កំពុងសង្ខេប..." />
        ) : (
          <Card className="mb-2 border-accent/30 bg-accent/5">
            <p className="text-sm leading-relaxed">🤖 {summarize(session, reasoningOutput)}</p>
          </Card>
        )}
      </Page>
    </>
  );
}
