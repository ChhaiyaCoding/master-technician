/**
 * New Diagnosis — entry flow (Milestone 7, simplified).
 *
 * Design goal: the fewest possible steps to start a real diagnosis. Only two
 * things are actually required by bootstrapSession (brand + a complaint or a
 * DTC), so everything else (model / year / engine / system) is collapsed into
 * an optional section instead of standing between the mechanic and the work.
 *
 * The complaint box doubles as the DTC input: any code typed anywhere in the
 * text (P0301, C1234, …) is detected live and shown as a chip, so a mechanic
 * with a scan tool can just type the code and go. Typical flow is 3 actions —
 * tap brand, type the problem, tap start.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar, Page } from "@/components/Layout";
import { Button, Card, Field, cx } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { BRANDS, YEARS } from "@/data/vehicles";
import { SYSTEMS } from "@/data/systems";
import { DTC_BY_CODE } from "@/data/dtc";
import { bootstrapSession } from "@/diagnosis/bootstrapSession";
import { saveSession } from "@/engine/sessionEngine";
import { CURRENT_SESSION_ID_KEY } from "@/screens/DiagnosticSessionScreen";
import type { SystemId, Vehicle } from "@/types";

/** Standard OBD-II code shape: P/C/B/U + 4 hex-ish chars. */
const DTC_PATTERN = /\b[PCBU][0-3][0-9A-F]{3}\b/gi;

function extractDtcs(text: string): string[] {
  const found = text.toUpperCase().match(DTC_PATTERN) ?? [];
  return [...new Set(found)];
}

export default function NewDiagnosis() {
  const navigate = useNavigate();

  const [brand, setBrand] = useState("");
  const [problem, setProblem] = useState("");
  const [showMore, setShowMore] = useState(false);

  // Optional details — never block starting.
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [engine, setEngine] = useState("");
  const [system, setSystem] = useState<SystemId | null>(null);

  const brandData = BRANDS.find((b) => b.name.toLowerCase() === brand.toLowerCase());
  const dtcs = useMemo(() => extractDtcs(problem), [problem]);
  const canStart = brand.trim().length > 0 && problem.trim().length > 0;

  function start() {
    const vehicle: Vehicle = {
      brand: brand.trim(),
      model: model.trim(),
      year,
      engine: engine.trim(),
      transmission: "",
      mileageKm: null,
    };
    const session = bootstrapSession({
      vehicle,
      complaint: problem.trim(),
      system,
      dtcCodes: dtcs,
    });
    saveSession(session);
    localStorage.setItem(CURRENT_SESSION_ID_KEY, session.id);
    navigate("/diagnostic-session");
  }

  return (
    <>
      <TopBar title="វិនិច្ឆ័យថ្មី" back />
      <Page>
        {/* 1 — Vehicle: one tap */}
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

        {/* 2 — The problem: one box, DTC auto-detected */}
        <Card className="mb-3">
          <Field label="២. បញ្ហា ឬ កូដ DTC">
            <textarea
              className="input min-h-[110px] resize-none"
              placeholder="ឧ. ម៉ាស៊ីនញ័រពេលទំនេរ ភ្លើង Check Engine ភ្លឺ&#10;ឬវាយកូដ: P0301"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
            {dtcs.length > 0 && (
              <div className="mt-2">
                <p className="mb-1.5 text-xs font-semibold text-muted">
                  🔍 រកឃើញកូដ DTC ដោយស្វ័យប្រវត្តិ
                </p>
                <div className="flex flex-wrap gap-2">
                  {dtcs.map((c) => {
                    const known = !!DTC_BY_CODE[c];
                    return (
                      <span
                        key={c}
                        className={cx(
                          "chip font-semibold",
                          known
                            ? "border-success/40 bg-success/10 text-success"
                            : "text-muted",
                        )}
                      >
                        {c} {known ? "✓" : "?"}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </Field>
        </Card>

        {/* 3 — Everything else, out of the way */}
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
                {brandData && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {brandData.models.slice(0, 6).map((m) => (
                      <button
                        key={m}
                        onClick={() => setModel(m)}
                        className={cx(
                          "chip transition-active active:scale-95",
                          model === m && "border-primary bg-primary/12 text-primary",
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
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

              <Field label="ប្រព័ន្ធ (System)">
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
      </Page>

      {/* Sticky start bar */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto max-w-md px-4 py-3">
          <Button full disabled={!canStart} onClick={start}>
            <Icon.Wrench size={20} /> ចាប់ផ្ដើមវិនិច្ឆ័យ
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
