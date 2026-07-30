import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Page, TopBar } from "@/components/Layout";
import {
  Card,
  EmptyState,
  SectionTitle,
  SeverityBadge,
  cx,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { t } from "@/i18n/strings";
import { DTC_BY_CODE, DTC_CODES, POPULAR_DTC } from "@/data/dtc";
import { SYSTEM_BY_ID } from "@/data/systems";
import { useDiagnosis } from "@/context/DiagnosisContext";

export default function DtcSearch() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("code") ?? "");
  const q = query.trim().toUpperCase();

  const exact = q ? DTC_BY_CODE[q] : undefined;
  const matches = useMemo(() => {
    if (!q) return [];
    return DTC_CODES.filter(
      (d) =>
        d.code.includes(q) ||
        d.titleEn.toUpperCase().includes(q) ||
        d.titleKm.includes(query.trim()),
    );
  }, [q, query]);

  return (
    <>
      <TopBar title={t.dtc.title} />
      <Page>
        <div className="relative mb-4">
          <Icon.Search
            size={20}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            autoFocus
            className="input pl-11 uppercase"
            placeholder={t.dtc.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {!q && (
          <>
            <SectionTitle>{t.dtc.popular}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {POPULAR_DTC.map((code) => (
                <button
                  key={code}
                  onClick={() => setQuery(code)}
                  className="chip font-semibold transition-active active:scale-95"
                >
                  {code}
                </button>
              ))}
            </div>
          </>
        )}

        {exact && <DtcDetail code={exact.code} />}

        {q && !exact && matches.length > 0 && (
          <div className="space-y-2.5">
            {matches.map((d) => (
              <Card key={d.code} onClick={() => setQuery(d.code)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-primary">{d.code}</span>
                  <SeverityBadge severity={d.severity} />
                </div>
                <p className="mt-1 text-sm text-muted">{d.titleKm}</p>
              </Card>
            ))}
          </div>
        )}

        {q && !exact && matches.length === 0 && (
          <EmptyState
            icon={<Icon.Search size={40} />}
            title={t.dtc.notFound}
            hint={t.dtc.notFoundHint}
          />
        )}
      </Page>
    </>
  );
}

/** Full detail card for a matched DTC — reused by search. */
export function DtcDetail({ code }: { code: string }) {
  const navigate = useNavigate();
  const { setInput, reset } = useDiagnosis();
  const d = DTC_BY_CODE[code.toUpperCase()];
  if (!d) return null;

  function useInDiagnosis() {
    reset();
    setInput({ dtcCodes: [d.code], system: d.systems[0] ?? null });
    navigate("/diagnose/vehicle");
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-bold text-primary">{d.code}</h2>
          <SeverityBadge severity={d.severity} />
        </div>
        <p className="mt-1 font-semibold">{d.titleKm}</p>
        <p className="text-sm text-muted">{d.titleEn}</p>
      </div>

      {/* Meaning */}
      <section>
        <SectionTitle>{t.dtc.meaning}</SectionTitle>
        <Card>
          <p className="text-sm leading-relaxed">{d.descriptionKm}</p>
        </Card>
      </section>

      {/* Related systems */}
      <section>
        <SectionTitle>{t.dtc.relatedSystems}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {d.systems.map((sid) => {
            const s = SYSTEM_BY_ID[sid];
            return (
              <span key={sid} className="chip">
                <span>{s?.icon}</span>
                {s?.en}
              </span>
            );
          })}
        </div>
      </section>

      {/* Possible causes */}
      <section>
        <SectionTitle>{t.dtc.possibleCauses}</SectionTitle>
        <Card>
          <ul className="space-y-2">
            {d.possibleCauses.map((c, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {c}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Inspection flow */}
      <section>
        <SectionTitle>{t.dtc.inspectionFlow}</SectionTitle>
        <Card>
          <ol className="space-y-3">
            {d.inspectionFlow.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm leading-snug">{s}</span>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      {/* Common mistakes */}
      <section>
        <SectionTitle
          icon={<Icon.Alert size={18} className="text-warning" />}
        >
          {t.dtc.commonMistakes}
        </SectionTitle>
        <div className="space-y-2">
          {d.commonMistakes.map((m, i) => (
            <div
              key={i}
              className={cx(
                "flex gap-2.5 rounded-xl border border-warning/30 bg-warning/8 p-3 text-sm leading-snug",
              )}
            >
              <Icon.Alert size={18} className="mt-0.5 shrink-0 text-warning" />
              {m}
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={useInDiagnosis}
        className="btn btn-lg w-full bg-primary text-primary-fg"
      >
        <Icon.Wrench size={20} />
        {t.dtc.useInDiagnosis}
      </button>
    </div>
  );
}
