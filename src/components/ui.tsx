import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Likelihood, Severity } from "@/types";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------- Button ------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "surface" | "ghost" | "danger";
  full?: boolean;
};

export function Button({
  variant = "primary",
  full,
  className,
  children,
  ...rest
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-fg",
    surface: "bg-surface-2 text-text border border-border",
    ghost: "bg-transparent text-text",
    danger: "bg-danger/15 text-danger border border-danger/30",
  };
  return (
    <button
      className={cx(
        "btn btn-lg",
        variants[variant],
        full && "w-full",
        rest.disabled && "opacity-50 pointer-events-none",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* -------------------------------- Card -------------------------------- */

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "card p-4",
        onClick && "cursor-pointer transition-active active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------- Section header --------------------------- */

export function SectionTitle({
  icon,
  children,
  action,
}: {
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2.5 mt-1 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-base font-bold text-text">
        {icon}
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ---------------------------- Confidence bar --------------------------- */

const likelihoodColor: Record<Likelihood, string> = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-accent",
};

export function ConfidenceBar({
  value,
  likelihood,
}: {
  value: number;
  likelihood: Likelihood;
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={cx("h-full rounded-full", likelihoodColor[likelihood])}
        style={{ width: `${Math.min(100, Math.max(6, value))}%` }}
      />
    </div>
  );
}

/* ------------------------------- Badges ------------------------------- */

export function LikelihoodBadge({ likelihood }: { likelihood: Likelihood }) {
  const map: Record<Likelihood, { km: string; cls: string }> = {
    high: { km: "ខ្ពស់", cls: "bg-danger/15 text-danger" },
    medium: { km: "មធ្យម", cls: "bg-warning/15 text-warning" },
    low: { km: "ទាប", cls: "bg-accent/15 text-accent" },
  };
  const m = map[likelihood];
  return (
    <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-semibold", m.cls)}>
      {m.km}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, { km: string; cls: string }> = {
    low: { km: "ស្រាល", cls: "bg-accent/15 text-accent" },
    medium: { km: "មធ្យម", cls: "bg-warning/15 text-warning" },
    high: { km: "ធ្ងន់", cls: "bg-primary/15 text-primary" },
    critical: { km: "គ្រោះថ្នាក់", cls: "bg-danger/15 text-danger" },
  };
  const m = map[severity];
  return (
    <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-semibold", m.cls)}>
      {m.km}
    </span>
  );
}

/* -------------------------------- Field ------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {hint && <span className="ml-1 text-muted/70">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ------------------------------ EmptyState ---------------------------- */

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="font-semibold text-text">{title}</p>
      {hint && <p className="max-w-xs text-sm text-muted">{hint}</p>}
    </div>
  );
}

/* ---------------------------- Loading dots ---------------------------- */

export function LoadingDots({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-muted">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 animate-pulse-soft rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
