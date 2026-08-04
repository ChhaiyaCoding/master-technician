import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { Page, TopBar } from "@/components/Layout";
import { Card } from "@/components/ui";
import { t } from "@/i18n/strings";
import { caseStore, sessionStore } from "@/services/store";
import { isUnfinished } from "@/services/currentSession";
import { SYSTEM_BY_ID } from "@/data/systems";
import { useTheme } from "@/context/ThemeContext";
import { useDiagnosis } from "@/context/DiagnosisContext";
import { relTime } from "@/utils/format";

export default function Home() {
  const navigate = useNavigate();
  const { toggle, resolved } = useTheme();
  const { reset } = useDiagnosis();
  const recent = caseStore.list().slice(0, 3);
  // Milestone 9 — surface unfinished work so a paused diagnosis is never lost.
  const unfinishedSessions = sessionStore.list().filter(isUnfinished);

  const actions = [
    {
      km: t.home.diagnose,
      en: t.home.diagnoseSub,
      icon: <Icon.Wrench size={26} />,
      onClick: () => {
        reset();
        navigate("/diagnose/new");
      },
      primary: true,
    },
    {
      km: t.home.dtc,
      en: t.home.dtcSub,
      icon: <Icon.Scan size={26} />,
      onClick: () => navigate("/dtc"),
    },
    {
      km: t.home.cases,
      en: t.home.casesSub,
      icon: <Icon.Book size={26} />,
      onClick: () => navigate("/cases"),
    },
    {
      km: t.home.photo,
      en: t.home.photoSub,
      icon: <Icon.Camera size={26} />,
      onClick: () => navigate("/photo"),
    },
    {
      km: t.home.expert,
      en: t.home.expertSub,
      icon: <Icon.Chat size={26} />,
      onClick: () => navigate("/expert"),
    },
  ];

  return (
    <>
      <TopBar
        title={t.appName}
        right={
          <button
            onClick={toggle}
            aria-label="theme"
            className="btn h-10 w-10 rounded-xl text-text active:bg-surface-2"
          >
            {resolved === "dark" ? <Icon.Sun /> : <Icon.Moon />}
          </button>
        }
      />
      <Page>
        <div className="mb-5">
          <p className="text-sm text-muted">{t.home.greeting} 👋</p>
          <h2 className="text-2xl font-bold">{t.home.subtitle}</h2>
        </div>

        {/* Milestone 9 — continue previous work (never lose a paused diagnosis) */}
        {unfinishedSessions.length > 0 && (
          <button
            onClick={() => navigate("/sessions")}
            className="card mb-3 flex w-full items-center gap-3 border-warning/40 bg-warning/8 p-4 text-left transition-active active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <Icon.Wrench size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">បន្តការងារចាស់</span>
              <span className="block truncate text-sm text-muted">
                មានសម័យវិនិច្ឆ័យ {unfinishedSessions.length} មិនទាន់រួច —{" "}
                {unfinishedSessions[0].vehicle.brand} {unfinishedSessions[0].vehicle.model}
              </span>
            </span>
            <span className="shrink-0 text-muted">›</span>
          </button>
        )}

        {/* Primary CTA — big, full width, thumb friendly */}
        <button
          onClick={actions[0].onClick}
          className="btn mb-3 w-full items-center justify-between rounded-2xl bg-primary px-5 py-5 text-left text-primary-fg shadow-card transition-active active:scale-[0.99]"
        >
          <span>
            <span className="block text-xl font-bold">{actions[0].km}</span>
            <span className="block text-sm opacity-80">{actions[0].en}</span>
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            {actions[0].icon}
          </span>
        </button>

        {/* Secondary actions grid */}
        <div className="grid grid-cols-2 gap-3">
          {actions.slice(1).map((a) => (
            <button
              key={a.en}
              onClick={a.onClick}
              className="card flex flex-col gap-3 p-4 text-left transition-active active:scale-[0.98]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
                {a.icon}
              </span>
              <span>
                <span className="block font-bold leading-tight">{a.km}</span>
                <span className="block text-xs text-muted">{a.en}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Milestone 9 — reach all sessions even when nothing is unfinished */}
        <button
          onClick={() => navigate("/sessions")}
          className="mt-3 w-full text-center text-sm font-semibold text-primary"
        >
          មើលសម័យវិនិច្ឆ័យទាំងអស់ ›
        </button>

        {/* Recent cases */}
        <div className="mt-7">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-base font-bold">{t.home.recentCases}</h3>
            {recent.length > 0 && (
              <button
                onClick={() => navigate("/cases")}
                className="text-sm font-semibold text-primary"
              >
                មើលទាំងអស់
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              {t.home.noRecent}
            </p>
          ) : (
            <div className="space-y-2.5">
              {recent.map((c) => {
                const sys = SYSTEM_BY_ID[c.system];
                return (
                  <Card
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    className="flex items-center gap-3"
                  >
                    <span className="text-2xl">{sys?.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {c.vehicle.brand} {c.vehicle.model}{" "}
                        <span className="text-muted">{c.vehicle.year ?? ""}</span>
                      </p>
                      <p className="truncate text-sm text-muted">
                        {c.dtcCodes.join(", ") || sys?.en} · {c.rootCause}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {relTime(c.updatedAt)}
                    </span>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </Page>
    </>
  );
}
