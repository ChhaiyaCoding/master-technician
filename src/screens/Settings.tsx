import { useRef, useState } from "react";
import { Page, TopBar } from "@/components/Layout";
import { Card, SectionTitle, cx } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { t } from "@/i18n/strings";
import { useTheme } from "@/context/ThemeContext";
import { caseStore, sessionStore } from "@/services/store";
import { downloadBackup, parseBackup, restoreBackup } from "@/services/backup";
import type { ThemeMode } from "@/types";

export default function Settings() {
  const { mode, setMode } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const [demoCount, setDemoCount] = useState(() => caseStore.countDemoCases());

  async function onRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    try {
      const r = restoreBackup(parseBackup(await file.text()));
      setNote({
        text: `បញ្ចូលរួច — ករណីថ្មី ${r.casesAdded}, កែ ${r.casesUpdated} · សម័យថ្មី ${r.sessionsAdded}, កែ ${r.sessionsUpdated}`,
      });
      setDemoCount(caseStore.countDemoCases());
    } catch (err) {
      setNote({ text: err instanceof Error ? err.message : String(err), bad: true });
    }
  }

  function removeDemo() {
    if (!confirm(`លុបករណីគំរូ ${demoCount} មែនទេ? ករណីរបស់អ្នកនៅដដែល។`)) return;
    caseStore.removeDemoCases();
    setDemoCount(0);
    setNote({ text: "លុបករណីគំរូរួចរាល់" });
  }

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
    // P2-8 — the old prompt was just the button label with a "?". Say what
    // actually goes, and how many, before a one-tap wipe of unrecoverable work.
    const n = caseStore.list().length;
    if (
      confirm(
        `លុបករណីទាំងអស់ ${n} ជាអចិន្ត្រៃយ៍មែនទេ?\n\nសម័យវិនិច្ឆ័យនៅដដែល។ ការលុបនេះមិនអាចត្រឡប់វិញបានទេ — សូម Export ទុកជាមុនបើមិនទាន់។`,
      )
    ) {
      caseStore.clearAll();
      setDemoCount(0);
      setNote({ text: `លុបករណី ${n} រួចរាល់` });
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

        {/* P2-8 — everything lives in localStorage and nowhere else, so
            clearing browser data or changing phones loses it all silently.
            A JSON file the mechanic keeps is the backup that fits an app with
            no server and no account. */}
        <p className="mb-2 text-xs text-muted">
          ទិន្នន័យរក្សាទុកក្នុងទូរស័ព្ទតែប៉ុណ្ណោះ — សូម Export ទុកជាប្រចាំ។
        </p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={downloadBackup}
            className="btn min-h-[52px] rounded-xl border border-border bg-surface text-sm font-semibold active:bg-surface-2"
          >
            <Icon.Book size={18} /> Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn min-h-[52px] rounded-xl border border-border bg-surface text-sm font-semibold active:bg-surface-2"
          >
            <Icon.Wrench size={18} /> Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onRestoreFile}
        />

        {note && (
          <p
            className={cx(
              "mb-3 rounded-xl border p-2.5 text-sm",
              note.bad
                ? "border-danger/30 bg-danger/8 text-danger"
                : "border-success/30 bg-success/8 text-success",
            )}
          >
            {note.text}
          </p>
        )}

        <p className="mb-3 text-xs text-muted">
          ករណី {caseStore.list().length} · សម័យវិនិច្ឆ័យ {sessionStore.list().length}
        </p>

        {demoCount > 0 && (
          <Card onClick={removeDemo} className="mb-3 flex items-center gap-3">
            <Icon.Trash size={20} className="text-muted" />
            <span className="text-sm font-semibold">
              លុបករណីគំរូ ({demoCount})
            </span>
          </Card>
        )}

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
