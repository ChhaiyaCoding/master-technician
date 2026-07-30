import { Page, TopBar } from "@/components/Layout";
import { Card, SectionTitle, cx } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { t } from "@/i18n/strings";
import { useTheme } from "@/context/ThemeContext";
import { caseStore } from "@/services/store";
import type { ThemeMode } from "@/types";

export default function Settings() {
  const { mode, setMode } = useTheme();

  const options: { value: ThemeMode; label: string; icon: JSX.Element }[] = [
    { value: "light", label: t.settings.light, icon: <Icon.Sun size={20} /> },
    { value: "dark", label: t.settings.dark, icon: <Icon.Moon size={20} /> },
    {
      value: "system",
      label: t.settings.system,
      icon: <Icon.Settings size={20} />,
    },
  ];

  function clearCases() {
    if (confirm(t.settings.clearCases + " ?")) {
      caseStore.clearAll();
      alert(t.result.saved);
    }
  }

  return (
    <>
      <TopBar title={t.settings.title} />
      <Page>
        {/* Theme */}
        <SectionTitle>{t.settings.theme}</SectionTitle>
        <div className="mb-6 grid grid-cols-3 gap-2">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => setMode(o.value)}
              className={cx(
                "flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-2 py-4 transition-active active:scale-95",
                mode === o.value &&
                  "border-primary bg-primary/12 text-primary ring-2 ring-primary/30",
              )}
            >
              {o.icon}
              <span className="text-sm font-semibold">{o.label}</span>
            </button>
          ))}
        </div>

        {/* Data management */}
        <SectionTitle>{t.settings.dataMgmt}</SectionTitle>
        <Card
          onClick={clearCases}
          className="mb-6 flex items-center gap-3 text-danger"
        >
          <Icon.Trash size={20} />
          <span className="font-semibold">{t.settings.clearCases}</span>
        </Card>

        {/* About */}
        <SectionTitle>{t.settings.about}</SectionTitle>
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon.Wrench size={24} />
            </span>
            <div>
              <p className="font-bold">{t.appName}</p>
              <p className="text-xs text-muted">{t.settings.version}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            {t.settings.aboutText}
          </p>
        </Card>
      </Page>
    </>
  );
}
