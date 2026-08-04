import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { cx } from "@/components/ui";
import { t } from "@/i18n/strings";

/** Top bar — shows a back button on sub-screens, title, optional right slot. */
export function TopBar({
  title,
  back,
  right,
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-3">
        {back ? (
          <button
            onClick={() => navigate(-1)}
            aria-label={t.common.back}
            className="btn -ml-1 h-10 w-10 rounded-xl text-text active:bg-surface-2"
          >
            <Icon.Back />
          </button>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon.Wrench size={22} />
          </div>
        )}
        <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
        {right}
      </div>
    </header>
  );
}

// UX Audit v1 / P0-1 + P1-1 — the Ask Expert tab used to sit here, but it runs
// on PlaceholderAiProvider (canned replies), so giving it a permanent tab sold
// a feature the app does not actually have. The slot now goes to the session
// list, which is real work the mechanic can lose track of otherwise. Every
// entry below must also appear in `showOn` or tapping it hides the tab bar.
const NAV = [
  { to: "/", label: t.nav.home, icon: Icon.Home, exact: true },
  { to: "/dtc", label: t.nav.dtc, icon: Icon.Scan },
  { to: "/cases", label: t.nav.cases, icon: Icon.Book },
  { to: "/sessions", label: t.nav.sessions, icon: Icon.Wrench },
  { to: "/settings", label: t.nav.settings, icon: Icon.Settings },
];

/** Bottom navigation — thumb-reachable for one-hand use. */
export function BottomNav() {
  const { pathname } = useLocation();
  // Only show the tab bar on the top-level tab roots. Every other screen is
  // either a fullscreen chat or has its own sticky action bar that the fixed
  // nav would otherwise overlap.
  const showOn = NAV.map((n) => n.to);
  if (!showOn.includes(pathname)) return null;

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
        {NAV.map(({ to, label, icon: I, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cx(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-active active:scale-95",
                isActive ? "text-primary" : "text-muted",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cx(
                    "flex h-8 w-full max-w-[64px] items-center justify-center rounded-xl",
                    isActive && "bg-primary/12",
                  )}
                >
                  <I size={23} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Page scaffold: centers content in a phone-width column with bottom padding. */
export function Page({
  children,
  padded = true,
  noNavPad = false,
}: {
  children: ReactNode;
  padded?: boolean;
  noNavPad?: boolean;
}) {
  return (
    <main
      className={cx(
        "mx-auto min-h-[calc(100vh-3.5rem)] w-full max-w-md animate-fade-up",
        padded && "px-4 py-4",
        !noNavPad && "pb-28",
      )}
    >
      {children}
    </main>
  );
}
