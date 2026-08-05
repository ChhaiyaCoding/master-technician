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
import { SYSTEMS, SYSTEM_BY_ID } from "@/data/systems";
import type { SystemId } from "@/types";

/** UX Audit v1 / P1-5 — searching "P0" used to render all 566 hits at once:
 * a 54,000px page that stutters on an older phone and tells the mechanic
 * nothing about how many there were. Show a first page and a count instead. */
const PAGE_SIZE = 50;

export default function DtcSearch() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("code") ?? "");
  const [system, setSystem] = useState<SystemId | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const q = query.trim().toUpperCase();

  const exact = q ? DTC_BY_CODE[q] : undefined;
  const matches = useMemo(() => {
    if (!q && !system) return [];
    return DTC_CODES.filter((d) => {
      if (system && !d.systems.includes(system)) return false;
      if (!q) return true;
      return (
        d.code.includes(q) ||
        d.titleEn.toUpperCase().includes(q) ||
        d.titleKm.includes(query.trim())
      );
    });
  }, [q, query, system]);

  // A new search starts at page one again.
  function search(next: string) {
    setQuery(next);
    setShown(PAGE_SIZE);
  }

  function browseSystem(id: SystemId) {
    setSystem(system === id ? null : id);
    setShown(PAGE_SIZE);
  }

  const browsing = !q && !!system;
  const showList = (q || system) && !exact && matches.length > 0;

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
            onChange={(e) => search(e.target.value)}
          />
        </div>

        {/* The size banner and the popular chips are a landing page, so they go
            away the moment the mechanic is actually browsing a system —
            otherwise the results they just asked for start a screen and a half
            down. The system grid stays, to switch systems and to show which one
            is selected. */}
        {!q && !system && (
          <>
            {/* P1-5 — the empty state used to be six chips over a blank screen,
                so the app's single biggest asset was invisible: a mechanic could
                reasonably conclude it knew six codes. Say the size out loud, and
                give a way in for someone who has a system but not a code. */}
            <div className="mb-4 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-center">
              <p className="text-sm font-bold">
                ទិន្នន័យ {DTC_CODES.length} កូដ
              </p>
              <p className="text-xs text-muted">ដំណើរការ offline — មិនត្រូវការអ៊ីនធឺណិត</p>
            </div>

            <SectionTitle>{t.dtc.popular}</SectionTitle>
            <div className="mb-5 flex flex-wrap gap-2">
              {POPULAR_DTC.map((code) => (
                <button
                  key={code}
                  onClick={() => search(code)}
                  className="chip min-h-[44px] px-4 font-semibold transition-active active:scale-95"
                >
                  {code}
                </button>
              ))}
            </div>
          </>
        )}

        {!q && (
          <>
            <SectionTitle>រកតាមប្រព័ន្ធ</SectionTitle>
            <div className="mb-5 grid grid-cols-3 gap-2">
              {SYSTEMS.map((s) => {
                const n = DTC_CODES.filter((d) => d.systems.includes(s.id)).length;
                if (n === 0) return null;
                return (
                  <button
                    key={s.id}
                    onClick={() => browseSystem(s.id)}
                    className={cx(
                      "flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-surface px-1 py-2 transition-active active:scale-95",
                      system === s.id && "border-primary bg-primary/12",
                    )}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-[10px] font-semibold leading-tight">{s.en}</span>
                    <span className="text-[10px] text-muted">{n}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {exact && <DtcDetail code={exact.code} />}

        {showList && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-sm font-semibold text-muted">
                រកឃើញ {matches.length} កូដ
                {matches.length > shown && ` — បង្ហាញ ${shown} ដំបូង`}
              </p>
              {browsing && (
                <button
                  onClick={() => setSystem(null)}
                  className="shrink-0 text-sm font-semibold text-primary"
                >
                  ✕ សម្អាត
                </button>
              )}
            </div>

            {matches.slice(0, shown).map((d) => (
              <Card key={d.code} onClick={() => search(d.code)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-primary">{d.code}</span>
                  <SeverityBadge severity={d.severity} />
                </div>
                <p className="mt-1 text-sm text-muted">{d.titleKm}</p>
              </Card>
            ))}

            {matches.length > shown && (
              <button
                onClick={() => setShown((n) => n + PAGE_SIZE)}
                className="btn min-h-[48px] w-full rounded-xl border border-border font-semibold text-primary active:bg-surface-2"
              >
                មើលបន្ថែម ({matches.length - shown} នៅសល់)
              </button>
            )}
          </div>
        )}

        {(q || system) && !exact && matches.length === 0 && (
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
  const d = DTC_BY_CODE[code.toUpperCase()];
  if (!d) return null;

  function useInDiagnosis() {
    navigate("/diagnose/new", { state: { prefillDtc: d.code } });
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

      {/* Commonly found on — practical pattern, never a brand-ownership claim */}
      {d.commonOn && (
        <section>
          <SectionTitle icon={<Icon.Car size={18} className="text-accent" />}>
            {t.dtc.commonOn}
          </SectionTitle>
          <Card className="bg-surface-2">
            <p className="text-sm leading-relaxed">{d.commonOn}</p>
          </Card>
        </section>
      )}

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
