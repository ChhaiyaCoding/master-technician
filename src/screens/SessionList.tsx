/**
 * Session List — resume previous work (Milestone 9).
 *
 * Until now the app could only ever reach ONE session (a single localStorage
 * key), so a paused diagnosis became unreachable as soon as the mechanic
 * started another car — making Pause/Resume (built in Milestone 1) unusable
 * in practice. This screen surfaces sessionStore.list(), which already
 * persisted every session, and lets the mechanic pick one back up.
 *
 * Presentation only: it reads through the existing sessionStore and points
 * the Diagnostic Session Screen at the chosen session. No engine logic.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar, Page } from "@/components/Layout";
import { Card, EmptyState, cx } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { sessionStore } from "@/services/store";
import { CURRENT_SESSION_ID_KEY, isUnfinished } from "@/services/currentSession";
import { SYSTEM_BY_ID } from "@/data/systems";
import { relTime } from "@/utils/format";
import type { DiagnosticSession, SessionStatus } from "@/types/session";

const STATUS_LABEL: Record<SessionStatus, { km: string; cls: string }> = {
  active: { km: "កំពុងធ្វើ", cls: "bg-primary/15 text-primary" },
  paused: { km: "ផ្អាក", cls: "bg-warning/15 text-warning" },
  completed: { km: "ជួសជុលរួច", cls: "bg-accent/15 text-accent" },
  verified: { km: "✓ ផ្ទៀងផ្ទាត់រួច", cls: "bg-success/15 text-success" },
  abandoned: { km: "បោះបង់", cls: "bg-muted/20 text-muted" },
};


export default function SessionList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<DiagnosticSession[]>(() => sessionStore.list());

  function resume(session: DiagnosticSession) {
    localStorage.setItem(CURRENT_SESSION_ID_KEY, session.id);
    navigate("/diagnostic-session");
  }

  function remove(session: DiagnosticSession) {
    if (!confirm("លុបសម័យនេះមែនទេ?")) return;
    sessionStore.remove(session.id);
    setSessions(sessionStore.list());
  }

  const unfinished = sessions.filter(isUnfinished);
  const finished = sessions.filter((s) => !isUnfinished(s));

  function renderSession(s: DiagnosticSession) {
    const sys = s.system ? SYSTEM_BY_ID[s.system] : null;
    const status = STATUS_LABEL[s.status];
    const rootCause = s.hypotheses.find((h) => h.status === "confirmed");
    return (
      <Card key={s.id} className="space-y-2">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{sys?.icon ?? "🚗"}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">
              {s.vehicle.brand || "រថយន្ត"} {s.vehicle.model}{" "}
              <span className="font-normal text-muted">{s.vehicle.year ?? ""}</span>
            </p>
            <p className="text-xs text-muted">
              {sys?.en ?? "—"} · {relTime(s.updatedAt)}
            </p>
          </div>
          <span
            className={cx(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              status.cls,
            )}
          >
            {status.km}
          </span>
        </div>

        {s.complaint && <p className="line-clamp-2 text-sm text-muted">{s.complaint}</p>}

        {s.dtcs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {s.dtcs.map((d) => (
              <span key={d} className="chip text-xs font-semibold text-primary">
                {d}
              </span>
            ))}
          </div>
        )}

        {rootCause && (
          <p className="line-clamp-1 text-sm">
            <span className="font-semibold text-success">មូលហេតុ: </span>
            {rootCause.title}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => resume(s)}
            className="btn min-h-[44px] flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-fg active:scale-[0.98]"
          >
            {isUnfinished(s) ? "▶ បន្តការងារ" : "មើលលម្អិត"}
          </button>
          <button
            onClick={() => remove(s)}
            aria-label="delete"
            className="btn min-h-[44px] rounded-xl border border-border px-4 text-danger active:bg-danger/10"
          >
            <Icon.Trash size={18} />
          </button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <TopBar title="សម័យវិនិច្ឆ័យទាំងអស់" back />
      <Page>
        {sessions.length === 0 ? (
          <EmptyState
            icon={<Icon.Wrench size={40} />}
            title="មិនទាន់មានសម័យវិនិច្ឆ័យ"
            hint="ចាប់ផ្ដើមវិនិច្ឆ័យថ្មីពីទំព័រដើម"
          />
        ) : (
          <div className="space-y-4">
            {unfinished.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold text-muted">
                  កំពុងធ្វើ / ផ្អាក ({unfinished.length})
                </h2>
                <div className="space-y-2.5">{unfinished.map(renderSession)}</div>
              </section>
            )}

            {finished.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold text-muted">
                  បញ្ចប់រួច ({finished.length})
                </h2>
                <div className="space-y-2.5">{finished.map(renderSession)}</div>
              </section>
            )}
          </div>
        )}
      </Page>
    </>
  );
}
