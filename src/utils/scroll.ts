/**
 * Scroll helper with a guaranteed landing.
 *
 * `scrollIntoView({ behavior: "smooth" })` is a request, not a promise: some
 * engines (and some embedded webviews) accept the call and animate nothing,
 * leaving the page exactly where it was. That is fine for a nicety, but here
 * the scroll IS the feature — UX Audit v1 / P0-3, where the mechanic types a
 * DTC code and never learns an answer was rendered a thousand pixels below.
 *
 * So: ask for smooth, then check. If nothing moved by the time an animation
 * would plainly have started, jump there. A jump beats staying put.
 */
export function scrollIntoViewReliably(
  el: HTMLElement | null,
  block: ScrollLogicalPosition = "start",
): void {
  if (!el) return;

  const reduceMotion =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    el.scrollIntoView({ block });
    return;
  }

  const before = window.scrollY;
  el.scrollIntoView({ behavior: "smooth", block });

  window.setTimeout(() => {
    // Still parked where we started, and the target is genuinely elsewhere?
    // The smooth request was ignored — place the page by hand.
    if (Math.abs(window.scrollY - before) < 2) {
      const top = el.getBoundingClientRect().top;
      if (Math.abs(top) > 8) el.scrollIntoView({ block });
    }
  }, 300);
}
