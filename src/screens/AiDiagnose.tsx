/**
 * AI Diagnose Problem — Milestone 10.
 *
 * The new primary entry point. Type a vehicle + a problem — with or
 * without a DTC code — and get a ranked, %-confidence answer INSTANTLY
 * (client-side, offline, no AI API cost), the same way DTC Search always
 * felt: fast, no waiting, no multi-step form. This is Phase 1 — "what do
 * you think this is?" — like asking a senior mechanic for a quick read.
 *
 * This screen never writes a session and never confirms anything; it is a
 * fast estimate for browsing. When the mechanic is ready to actually work
 * the car (tests, repair record, Verified Diagnosis, Repair Case), "ចាប់ផ្ដើម
 * ធ្វើការ" hands off to the real evidence-gated session (bootstrapSession →
 * DiagnosticSessionScreen, Milestones 1-9 — untouched, still frozen).
 */
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TopBar, Page } from "@/components/Layout";
import { Button, Card, ConfidenceBar, Field, LikelihoodBadge, cx } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { BRANDS, YEARS } from "@/data/vehicles";
import { SYSTEMS } from "@/data/systems";
import { DTC_BY_CODE } from "@/data/dtc";
import { analyzeInstant } from "@/diagnosis/instantAnalysis";
import { bootstrapSession } from "@/diagnosis/bootstrapSession";
import { saveSession } from "@/engine/sessionEngine";
import { CURRENT_SESSION_ID_KEY } from "@/services/currentSession";
import type { SystemId, Vehicle } from "@/types";

/** Standard OBD-II code shape: P/C/B/U + 4 hex-ish chars. */
const DTC_PATTERN = /\b[PCBU][0-3][0-9A-F]{3}\b/gi;

function extractDtcs(text: string): string[] {
  const found = text.toUpperCase().match(DTC_PATTERN) ?? [];
  return [...new Set(found)];
}

export default function AiDiagnose() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillDtc = (location.state as { prefillDtc?: string } | null)?.prefillDtc;

  const [brand, setBrand] = useState("");
  const [problem, setProblem] = useState(prefillDtc ?? "");
  const [showMore, setShowMore] = useState(false);

  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [engine, setEngine] = useState("");
  const [system, setSystem] = useState<SystemId | null>(null);

  const brandData = BRANDS.find((b) => b.name.toLowerCase() === brand.toLowerCase());
  const dtcs = useMemo(() => extractDtcs(problem), [problem]);
  const canStart = brand.trim().length > 0 && problem.trim().length > 0;

  // Live, instant, offline — recomputed on every keystroke since it's just
  // local pattern matching (no network, no cost).
  const showAnswer = problem.trim().length > 2 || dtcs.length > 0;
  const analysis = useMemo(
    () =>
      showAnswer
        ? analyzeInstant({
            vehicle: { brand, model, year, engine, transmission: "", mileageKm: null },
            complaint: problem,
            dtcCodes: dtcs,
            system,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showAnswer, problem, dtcs.join(","), system, brand, model, year, engine],
  );

  function startWorking() {
    const vehicle: Vehicle = {
      brand: brand.trim(),
      model: model.trim(),
      year,
      engine: engine.trim(),
      transmission: "",
      mileageKm: null,
    };
    const session = bootstrapSession({ vehicle, complaint: problem.trim(), system, dtcCodes: dtcs });
    saveSession(session);
    localStorage.setItem(CURRENT_SESSION_ID_KEY, session.id);
    navigate("/diagnostic-session");
  }

  return (
    <>
      <TopBar title="AI វិនិច្ឆ័យបញ្ហា" back />
      <Page>
        {/* 1 — Vehicle */}
        <Card className="mb-3">
          <Field label="១. រថយន្ត">
            <div className="flex flex-wrap gap-2">
              {BRANDS.slice(0, 8).map((b) => (
                <button
                  key={b.name}
                  onClick={() => {
                    setBrand(b.name);
                    setModel("");
                    setEngine("");
                  }}
                  className={cx(
                    "chip min-h-[40px] px-4 transition-active active:scale-95",
                    brand === b.name && "border-primary bg-primary/12 font-semibold text-primary",
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
            <input
              className="input mt-2"
              placeholder="ឬវាយម៉ាកផ្សេង..."
              value={brandData ? "" : brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </Field>
        </Card>

        {/* 2 — The problem: DTC works, no-DTC symptom works too */}
        <Card className="mb-3">
          <Field label="២. បញ្ហា ឬ កូដ DTC">
            <textarea
              className="input min-h-[100px] resize-none"
              placeholder="ឧ. ម៉ាស៊ីនក្ដៅពេក ហើយសំពាធទឹកឡើងខ្ពស់&#10;ឬវាយកូដ: P0301"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
            {dtcs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {dtcs.map((c) => {
                  const known = !!DTC_BY_CODE[c];
                  return (
                    <span
                      key={c}
                      className={cx(
                        "chip font-semibold",
                        known ? "border-success/40 bg-success/10 text-success" : "text-muted",
                      )}
                    >
                      {c} {known ? "✓" : "?"}
                    </span>
                  );
                })}
              </div>
            )}
          </Field>
        </Card>

        {/* 3 — Optional details (never block the instant answer) */}
        <Card className="mb-3">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-semibold"
          >
            <span className="text-muted">
              ព័ត៌មានបន្ថែម (ស្រេចចិត្ត) — ម៉ូដែល, ឆ្នាំ, ម៉ាស៊ីន, ប្រព័ន្ធ
            </span>
            <span className="text-muted">{showMore ? "▾" : "▸"}</span>
          </button>

          {showMore && (
            <div className="mt-3 space-y-3">
              <Field label="ម៉ូដែល (Model)">
                <input
                  className="input"
                  placeholder="ឧ. Civic, Ranger"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ឆ្នាំ (Year)">
                  <select
                    className="input appearance-none"
                    value={year ?? ""}
                    onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">—</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ម៉ាស៊ីន (Engine)">
                  <input
                    className="input"
                    placeholder="ឧ. R18A"
                    value={engine}
                    onChange={(e) => setEngine(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="ប្រព័ន្ធ (System) — ជួយឲ្យ AI ត្រឹមត្រូវជាង">
                <div className="grid grid-cols-4 gap-2">
                  {SYSTEMS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSystem(system === s.id ? null : s.id)}
                      className={cx(
                        "flex flex-col items-center gap-0.5 rounded-xl border border-border bg-surface px-1 py-2 transition-active active:scale-95",
                        system === s.id && "border-primary bg-primary/12",
                      )}
                    >
                      <span className="text-lg">{s.icon}</span>
                      <span className="text-[9px] font-semibold leading-tight">{s.en}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </Card>

        {/* Instant AI answer — appears live as soon as there's enough to go on */}
        {analysis && (
          <div className="mb-24 animate-fade-up space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Icon.Wrench size={16} className="text-primary" />
              <p className="text-sm font-bold text-primary">ចម្លើយភ្លាមៗ (AI Instant Answer)</p>
            </div>

            {!analysis.hasSignal && (
              <p className="rounded-xl border border-dashed border-border p-3 text-xs text-muted">
                មិនទាន់មានទិន្នន័យគ្រប់គ្រាន់ — សូមពិពណ៌នាបន្ថែម ឬបញ្ចូល DTC បើមាន។ ខាងក្រោមជាចំណុចចាប់ផ្ដើមទូទៅ។
              </p>
            )}

            <div className="space-y-2.5">
              {analysis.causes.map((c, i) => (
                <Card key={c.title}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
                        {i + 1}
                      </span>
                      <p className="font-semibold leading-snug">{c.title}</p>
                    </div>
                    <LikelihoodBadge likelihood={c.likelihood} />
                  </div>
                  <ConfidenceBar value={c.confidence} likelihood={c.likelihood} />
                  <p className="mt-2 text-sm text-muted">{c.reasoning}</p>
                </Card>
              ))}
            </div>

            {analysis.safetyNotes.length > 0 && (
              <div className="space-y-2">
                {analysis.safetyNotes.map((n, i) => (
                  <div
                    key={i}
                    className="flex gap-2.5 rounded-xl border border-danger/30 bg-danger/8 p-3 text-sm leading-snug"
                  >
                    <Icon.Alert size={18} className="mt-0.5 shrink-0 text-danger" />
                    {n}
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted">ជំហានត្រួតពិនិត្យ</p>
              <Card>
                <ol className="space-y-2.5">
                  {analysis.inspectionSteps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 leading-snug">{s}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted">ឧបករណ៍ត្រូវការ</p>
              <div className="flex flex-wrap gap-2">
                {analysis.toolsNeeded.map((tool) => (
                  <span key={tool} className="chip text-xs">
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <p className="px-1 text-xs text-muted">
              💡 នេះជាការប៉ាន់ស្មានរហ័ស មិនមែនការសន្និដ្ឋានចុងក្រោយទេ — ត្រូវធ្វើតេស្តបញ្ជាក់ជានិច្ច។
            </p>
          </div>
        )}
      </Page>

      {/* Sticky start-working bar */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto max-w-md px-4 py-3">
          <Button full disabled={!canStart} onClick={startWorking}>
            <Icon.Wrench size={20} /> ចាប់ផ្ដើមធ្វើការ
          </Button>
          {!canStart && (
            <p className="mt-1.5 text-center text-xs text-muted">
              ត្រូវការត្រឹម៖ ម៉ាករថយន្ត + បញ្ហា
            </p>
          )}
        </div>
      </div>
    </>
  );
}
