import Link from "next/link";
import type { Highlight } from "@/lib/highlights";
import { HighlightStrip } from "@/components/HighlightStrip";

export function PreviewCard({
  href,
  eyebrow,
  title,
  meta,
  tags,
  highlights,
  url,
  hasMedia,
}: {
  href: string;
  eyebrow?: string;
  title: string;
  meta: string;
  tags: string[];
  highlights: Highlight[];
  url?: string | null;
  hasMedia?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-white/[.06] bg-[color:var(--bg-card)]/40 backdrop-blur-md transition-all duration-300 hover:border-[color:var(--accent)] hover:bg-[color:var(--bg-card)]/80 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] relative overflow-hidden"
    >
      {/* Top highlight gradient line on hover */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[color:var(--accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <article className="p-6 md:p-8 relative z-10">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 mb-3">
          {eyebrow && (
            <span className="mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--accent-3)] font-semibold">
              {eyebrow}
            </span>
          )}
          {hasMedia && (
            <span className="mono text-[9px] uppercase tracking-[0.2em] text-[color:var(--accent)] border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/10 px-2 py-0.5 rounded shadow-[0_0_5px_rgba(59,130,246,0.2)]">
              media
            </span>
          )}
          <span className="mono text-[11px] text-[color:var(--fg-dim)] ml-auto tracking-wider">{meta}</span>
        </div>

        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[color:var(--fg)] group-hover:text-white transition-colors">
          {title}
          {url && (
            <span
              className="ml-2 text-sm text-[color:var(--accent)] opacity-50 group-hover:opacity-100 transition-opacity"
              aria-hidden
            >
              ↗
            </span>
          )}
        </h3>

        {highlights.length > 0 && (
          <div className="mt-5">
            <HighlightStrip highlights={highlights} />
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {tags.slice(0, 8).map((t) => (
              <span
                key={t}
                className="mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-sm border border-white/[.04] bg-white/[.02] text-[color:var(--fg-dim)] group-hover:border-white/[.1] group-hover:text-[color:var(--fg-muted)] transition-colors"
              >
                {t}
              </span>
            ))}
            {tags.length > 8 && (
              <span className="mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-sm border border-white/[.04] bg-white/[.02] text-[color:var(--fg-dim)]">
                +{tags.length - 8}
              </span>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--fg-dim)] group-hover:text-[color:var(--accent)] transition-colors font-semibold">
          <span>View detail</span>
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-2">→</span>
        </div>
      </article>
    </Link>
  );
}
