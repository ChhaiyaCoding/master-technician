import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Page, TopBar } from "@/components/Layout";
import { Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { t } from "@/i18n/strings";
import { caseStore, isDemoCase } from "@/services/store";
import { SYSTEM_BY_ID } from "@/data/systems";
import { relTime } from "@/utils/format";

export default function CaseLibrary() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const results = caseStore.search(query);
  const hasAny = caseStore.list().length > 0;

  return (
    <>
      <TopBar
        title={t.cases.title}
        right={
          <button
            onClick={() => navigate("/cases/new")}
            aria-label={t.cases.newCase}
            className="btn h-10 w-10 rounded-xl bg-primary text-primary-fg"
          >
            <Icon.Plus />
          </button>
        }
      />
      <Page>
        <div className="relative mb-3">
          <Icon.Search
            size={20}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            className="input pl-11"
            placeholder={t.cases.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {query && (
          <p className="mb-2 text-sm text-muted">
            {t.cases.resultsCount(results.length)}
          </p>
        )}

        {!hasAny ? (
          <EmptyState
            icon={<Icon.Book size={40} />}
            title={t.cases.empty}
            hint={t.appTagline}
          />
        ) : (
          <div className="space-y-2.5">
            {results.map((c) => {
              const sys = SYSTEM_BY_ID[c.system];
              return (
                <Card
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{sys?.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {c.vehicle.brand} {c.vehicle.model}{" "}
                        <span className="font-normal text-muted">
                          {c.vehicle.year ?? ""}
                        </span>
                      </p>
                      <p className="text-xs text-muted">
                        {sys?.en} · {relTime(c.updatedAt)}
                      </p>
                    </div>
                    {/* P2-6 — say which cases shipped with the app, so a new
                        user doesn't mistake demo data for their own records. */}
                    {isDemoCase(c) && (
                      <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
                        គំរូ
                      </span>
                    )}
                    {c.dtcCodes.length > 0 && (
                      <span className="chip shrink-0 font-semibold text-primary">
                        {c.dtcCodes[0]}
                        {c.dtcCodes.length > 1 && ` +${c.dtcCodes.length - 1}`}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted">
                    {c.symptomText}
                  </p>
                  {c.rootCause && (
                    <p className="line-clamp-1 text-sm">
                      <span className="font-semibold text-success">
                        {t.cases.rootCause}:{" "}
                      </span>
                      {c.rootCause}
                    </p>
                  )}
                </Card>
              );
            })}
            {results.length === 0 && (
              <EmptyState title={t.cases.resultsCount(0).trim()} />
            )}
          </div>
        )}
      </Page>
    </>
  );
}
