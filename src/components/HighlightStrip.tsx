import type { Highlight } from "@/lib/highlights";

// Renders the per-experience / per-project highlight list in one of two modes:
//
//   - Compact pill row (default): tight `mono` chips, used on PreviewCard
//     where space is scarce and the card itself is the link.
//   - Card grid (`withDescription`): each highlight gets a card with label +
//     short description, used on detail pages and the IDE overview where
//     readers want to know what each highlight is *about* before clicking.
//
// Linking modes for the card grid:
//   - `variant="linked"` + `baseHref`: anchor link to `${baseHref}#${anchor}`
//     (used on /experience/[id], /project/[id]).
//   - `onSelect`: button-style click handler that fires per-highlight (used
//     in IdePortfolio to switch the active file in-place without a route push).

export function HighlightStrip({
  highlights,
  baseHref,
  variant = "static",
  withDescription = false,
  onSelect,
}: {
  highlights: Highlight[];
  baseHref?: string;
  variant?: "static" | "linked";
  withDescription?: boolean;
  onSelect?: (h: Highlight) => void;
}) {
  if (!highlights || highlights.length === 0) return null;

  if (withDescription) {
    return (
      <ul className="grid sm:grid-cols-2 gap-3">
        {highlights.map((h) => {
          const cardCls =
            "block h-full rounded-lg border border-white/[.06] bg-[color:var(--bg-card)]/40 p-4 text-left transition group";
          const interactiveCls =
            " hover:border-[color:var(--accent)]/50 hover:bg-[color:var(--bg-card)] hover:shadow-[0_0_20px_rgba(59,130,246,0.12)] cursor-pointer";

          const inner = (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent-3)]">
                  highlight
                </span>
                <span aria-hidden className="text-[color:var(--fg-dim)] transition-transform group-hover:translate-x-1 ml-auto">
                  →
                </span>
              </div>
              <div className="font-semibold text-[color:var(--fg)] text-sm md:text-base leading-snug group-hover:text-white">
                {h.label}
              </div>
              <div className="mt-1.5 text-xs text-[color:var(--fg-muted)] leading-relaxed">
                {h.description}
              </div>
            </>
          );

          if (onSelect && h.anchor) {
            return (
              <li key={h.label}>
                <button
                  type="button"
                  onClick={() => onSelect(h)}
                  className={`w-full ${cardCls}${interactiveCls}`}
                >
                  {inner}
                </button>
              </li>
            );
          }
          if (variant === "linked" && h.anchor) {
            return (
              <li key={h.label}>
                <a href={`${baseHref ?? ""}#${h.anchor}`} className={`${cardCls}${interactiveCls}`}>
                  {inner}
                </a>
              </li>
            );
          }
          return (
            <li key={h.label}>
              <div className={cardCls}>{inner}</div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {highlights.map((h) => {
        const baseCls =
          "mono text-[11px] tracking-widest px-3 py-1.5 rounded-sm border border-[color:var(--accent)]/30 text-[color:var(--accent-3)] bg-[color:var(--accent)]/10 font-semibold shadow-[0_0_5px_rgba(6,182,212,0.1)] transition-all duration-300";
        // Empty-string baseHref means "same-page anchor" — don't reject it.
        if (variant === "linked" && h.anchor) {
          return (
            <a
              key={h.label}
              href={`${baseHref ?? ""}#${h.anchor}`}
              title={h.description}
              className={`${baseCls} hover:border-[color:var(--accent-3)]/60 hover:bg-[color:var(--accent-3)]/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 cursor-pointer`}
            >
              {h.label}
            </a>
          );
        }
        return (
          <span
            key={h.label}
            title={h.description}
            className={`${baseCls} group-hover:border-[color:var(--accent-3)]/50 group-hover:text-[color:var(--accent-3)] group-hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]`}
          >
            {h.label}
          </span>
        );
      })}
    </div>
  );
}
