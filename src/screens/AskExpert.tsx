import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/Layout";
import { Icon } from "@/components/Icon";
import { LoadingDots, cx } from "@/components/ui";
import { t } from "@/i18n/strings";
import { ai } from "@/services/ai";
import { uid } from "@/services/store";
import { useDiagnosis } from "@/context/DiagnosisContext";
import type { ChatMessage } from "@/types";

const QUICK_STARTS = [
  "ម៉ាស៊ីនញ័រពេលទំនេរ ភ្លើង check engine ភ្លឺ",
  "ចេញផ្សែងខ្មៅ ខ្សោយកម្លាំង",
  "ម៉ាស៊ីនក្តៅពេក",
  "ABS light ភ្លឺ ហ្វ្រាំងធ្ងន់",
];

export default function AskExpert() {
  const { vehicle } = useDiagnosis();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid("m"),
      role: "expert",
      text: t.expert.intro,
      createdAt: Date.now(),
    },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const techMsg: ChatMessage = {
      id: uid("m"),
      role: "tech",
      text: clean,
      createdAt: Date.now(),
    };
    const next = [...messages, techMsg];
    setMessages(next);
    setDraft("");
    setBusy(true);
    try {
      const reply = await ai.askExpert(
        next.map((m) => ({ role: m.role, text: m.text })),
        vehicle.brand ? vehicle : null,
      );
      setMessages((prev) => [
        ...prev,
        {
          id: uid("m"),
          role: "expert",
          text: reply.text,
          createdAt: Date.now(),
          followUps: reply.followUps,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const lastFollowUps =
    !busy && messages[messages.length - 1]?.role === "expert"
      ? messages[messages.length - 1].followUps
      : undefined;

  return (
    <div className="flex h-[100dvh] flex-col">
      <TopBar title={t.expert.title} back />

      {/* Messages */}
      <div
        ref={scrollRef}
        className="mx-auto w-full max-w-md flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {vehicle.brand && (
          <div className="mx-auto w-fit rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">
            <Icon.Car size={14} className="mr-1 inline" />
            {vehicle.brand} {vehicle.model} {vehicle.year ?? ""}
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cx(
              "flex",
              m.role === "tech" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cx(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "tech"
                  ? "rounded-br-sm bg-primary text-primary-fg"
                  : "rounded-bl-sm border border-border bg-surface",
              )}
            >
              {m.role === "expert" && (
                <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Icon.Wrench size={14} /> {t.expert.title}
                </span>
              )}
              {m.text}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
              <LoadingDots label={t.expert.thinking} />
            </div>
          </div>
        )}

        {/* Structured follow-up questions */}
        {lastFollowUps && lastFollowUps.length > 0 && (
          <div className="animate-fade-up">
            <p className="mb-1.5 text-xs font-semibold text-muted">
              {t.expert.followUp}
            </p>
            <div className="flex flex-wrap gap-2">
              {lastFollowUps.map((f, i) => (
                <button
                  key={i}
                  onClick={() => send(f)}
                  className="chip border-accent/40 bg-accent/10 text-left text-accent transition-active active:scale-95"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick starts only on first message */}
        {messages.length === 1 && (
          <div className="pt-2">
            <p className="mb-1.5 text-xs font-semibold text-muted">
              {t.expert.quickStart}
            </p>
            <div className="flex flex-col gap-2">
              {QUICK_STARTS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="card px-4 py-3 text-left text-sm transition-active active:scale-[0.99]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="pb-safe border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-md items-end gap-2 px-3 py-2.5">
          <textarea
            rows={1}
            className="input max-h-32 flex-1 resize-none py-3"
            placeholder={t.expert.placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
          />
          <button
            onClick={() => send(draft)}
            disabled={!draft.trim() || busy}
            aria-label={t.expert.send}
            className={cx(
              "btn h-12 w-12 shrink-0 rounded-xl bg-primary text-primary-fg transition-active active:scale-95",
              (!draft.trim() || busy) && "opacity-50",
            )}
          >
            <Icon.Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
