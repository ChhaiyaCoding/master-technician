import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Page, TopBar } from "@/components/Layout";
import { Card, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { t } from "@/i18n/strings";
import { caseStore } from "@/services/store";
import { explainSimilarity, hasApiKey } from "@/services/aiExplain";
import { SYSTEM_BY_ID } from "@/data/systems";
import { formatDate, formatKm } from "@/utils/format";

export default function CaseDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const c = caseStore.get(id);
  const similar = c ? caseStore.similar(c) : [];

  // Real AI, opt-in — only runs when the mechanic has configured their own
  // Anthropic key in Settings. Failure (no key, offline, API error) is
  // silent: the rule-based row above still shows either way.
  const [aiText, setAiText] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!c || !hasApiKey()) return;
    let cancelled = false;
    for (const s of similar) {
      setAiLoading((prev) => ({ ...prev, [s.id]: true }));
      explainSimilarity(c, s)
        .then((text) => {
          if (!cancelled) setAiText((prev) => ({ ...prev, [s.id]: text }));
        })
        .catch(() => {
          // Fall back to the rule-based line — no error shown to the mechanic.
        })
        .finally(() => {
          if (!cancelled) setAiLoading((prev) => ({ ...prev, [s.id]: false }));
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.id]);

  if (!c) return <Navigate to="/cases" replace />;
  const sys = SYSTEM_BY_ID[c.system];

  function remove() {
    if (confirm(t.cases.confirmDelete)) {
      caseStore.remove(c!.id);
      navigate("/cases", { replace: true });
    }
  }

  return (
    <>
      <TopBar
        title={`${c.vehicle.brand} ${c.vehicle.model}`}
        back
        right={
          <div className="flex gap-1">
            <button
              onClick={() => navigate(`/cases/${c.id}/edit`)}
              aria-label={t.common.edit}
              className="btn h-10 w-10 rounded-xl text-text active:bg-surface-2"
            >
              <Icon.Wrench size={20} />
            </button>
            <button
              onClick={remove}
              aria-label={t.common.delete}
              className="btn h-10 w-10 rounded-xl text-danger active:bg-danger/10"
            >
              <Icon.Trash size={20} />
            </button>
          </div>
        }
      />
      <Page>
        {/* Vehicle summary */}
        <Card className="mb-4 bg-surface-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{sys?.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">
                {c.vehicle.brand} {c.vehicle.model} {c.vehicle.year ?? ""}
              </p>
              <p className="text-sm text-muted">
                {sys?.en} · {c.vehicle.engine || "—"} ·{" "}
                {c.vehicle.transmission || "—"}
              </p>
              <p className="text-sm text-muted">
                {formatKm(c.vehicle.mileageKm)} · {formatDate(c.createdAt)}
              </p>
            </div>
          </div>
        </Card>

        {c.dtcCodes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {c.dtcCodes.map((code) => (
              <button
                key={code}
                onClick={() => navigate(`/dtc?code=${code}`)}
                className="chip font-semibold text-primary"
              >
                {code}
              </button>
            ))}
          </div>
        )}

        <Section title={t.symptom.describe} body={c.symptomText} />
        <Section title={t.cases.rootCause} body={c.rootCause} accent="success" />
        <Section title={t.cases.repair} body={c.repairPerformed} />

        {c.partsReplaced.length > 0 && (
          <section className="mt-5">
            <SectionTitle>{t.cases.parts}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {c.partsReplaced.map((p, i) => (
                <span key={i} className="chip">
                  {p}
                </span>
              ))}
            </div>
          </section>
        )}

        {c.technicianNote && (
          <section className="mt-5">
            <SectionTitle icon={<Icon.Chat size={18} className="text-accent" />}>
              {t.cases.note}
            </SectionTitle>
            <Card className="border-accent/30 bg-accent/5">
              <p className="text-sm leading-relaxed">{c.technicianNote}</p>
            </Card>
          </section>
        )}

        {c.photos.length > 0 && (
          <section className="mt-5">
            <SectionTitle>{t.symptom.photo}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {c.photos.map((p) => (
                <img
                  key={p.id}
                  src={p.dataUrl}
                  alt=""
                  className="h-24 w-24 rounded-xl border border-border object-cover"
                />
              ))}
            </div>
          </section>
        )}

        {/* Similar cases */}
        {similar.length > 0 && (
          <section className="mt-7">
            <SectionTitle>{t.cases.similar}</SectionTitle>
            <div className="space-y-2.5">
              {similar.map((s) => {
                const ssys = SYSTEM_BY_ID[s.system];
                return (
                  <Card
                    key={s.id}
                    onClick={() => navigate(`/cases/${s.id}`)}
                    className="flex items-center gap-3"
                  >
                    <span className="text-2xl">{ssys?.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {s.vehicle.brand} {s.vehicle.model} {s.vehicle.year ?? ""}
                      </p>
                      <p className="truncate text-sm text-muted">
                        {s.dtcCodes.join(", ") || ssys?.en} · {s.rootCause}
                      </p>
                      {aiLoading[s.id] && (
                        <p className="mt-1 text-xs text-muted">🤖 កំពុងវិភាគ...</p>
                      )}
                      {aiText[s.id] && (
                        <p className="mt-1 text-xs italic text-accent">🤖 {aiText[s.id]}</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </Page>
    </>
  );
}

function Section({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent?: "success";
}) {
  if (!body) return null;
  return (
    <section className="mt-5">
      <SectionTitle
        icon={
          accent === "success" ? (
            <Icon.Check size={18} className="text-success" />
          ) : undefined
        }
      >
        {title}
      </SectionTitle>
      <Card className={accent === "success" ? "border-success/30 bg-success/5" : ""}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
      </Card>
    </section>
  );
}
