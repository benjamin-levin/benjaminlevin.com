import Link from "next/link";
import { renderMarkdown, splitSubsections } from "@/lib/markdown";
import { ProjectMedia } from "@/components/ProjectMedia";
import { HighlightStrip } from "@/components/HighlightStrip";
import { EdgeNav } from "@/components/EdgeNav";
import { EdgeEntry } from "@/components/EdgeEntry";
import type { ProjectMedia as MediaType } from "@/lib/data";
import type { Highlight } from "@/lib/highlights";
import type { DetailNeighbors } from "@/lib/detailOrder";

export type DetailPageProps = {
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  meta: string;
  tags: string[];
  url?: string | null;
  highlights: Highlight[];
  detail: string;
  media?: MediaType;
  neighbors?: DetailNeighbors;
};

export function DetailPage({
  backHref = "/",
  backLabel = "Back to portfolio",
  eyebrow,
  title,
  subtitle,
  meta,
  tags,
  url,
  highlights,
  detail,
  media,
  neighbors,
}: DetailPageProps) {
  const { intro, sections } = splitSubsections(detail);
  const showSectionNav = sections.length > 1;

  return (
    <main data-edge-nav className="min-h-screen pb-24">
      <div className="px-6 md:px-10 pt-24 md:pt-28">
        <div className="max-w-4xl mx-auto">
          <Link
            href={backHref}
            className="mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition inline-flex items-center gap-2 mb-10"
          >
            <span aria-hidden>←</span>
            <span>{backLabel}</span>
          </Link>

          <header>
            {(eyebrow || meta) && (
              <div className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--accent-3)] mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                {eyebrow && <span>{eyebrow}</span>}
                {eyebrow && meta && <span className="text-[color:var(--fg-dim)]">·</span>}
                {meta && <span className="text-[color:var(--fg-dim)]">{meta}</span>}
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
              {title}
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 text-base text-[color:var(--fg-dim)] hover:text-[color:var(--accent)]"
                  aria-label="External link"
                >
                  ↗
                </a>
              )}
            </h1>
            {subtitle && (
              <p className="mt-2 text-[color:var(--fg-muted)] text-sm md:text-base">{subtitle}</p>
            )}
            {tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/[.08] text-[color:var(--fg-muted)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </header>

          {media && (
            <div className="mt-10">
              <ProjectMedia media={media} />
            </div>
          )}

          {highlights.length > 0 && (
            <section className="mt-10">
              <h2 className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--accent)] mb-3">
                Highlights
              </h2>
              <HighlightStrip highlights={highlights} variant="linked" baseHref="" withDescription />
            </section>
          )}

          {intro && (
            <section className="mt-12">
              <div
                className="prose-tight"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(intro) }}
              />
            </section>
          )}

          {showSectionNav && (
            <section className="mt-14">
              <h2 className="mono text-xs uppercase tracking-[0.18em] text-[color:var(--accent)] mb-4">
                On this page · {sections.length} sections
              </h2>
              <ol className="grid sm:grid-cols-2 gap-3">
                {sections.map((s, i) => (
                  <li key={s.slug}>
                    <a
                      href={`#${s.slug}`}
                      className="block h-full rounded-lg border border-white/[.06] bg-[color:var(--bg-card)]/40 p-4 hover:border-white/[.18] hover:bg-[color:var(--bg-card)] transition group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--fg-dim)]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span aria-hidden className="text-[color:var(--fg-dim)] transition-transform group-hover:translate-x-1">→</span>
                      </div>
                      <div className="font-medium text-[color:var(--fg)] text-sm md:text-base leading-snug">
                        {s.title}
                      </div>
                      {s.teaser && (
                        <div className="mt-2 text-xs text-[color:var(--fg-muted)] leading-relaxed line-clamp-3">
                          {s.teaser}
                        </div>
                      )}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {sections.length > 0 && (
            <div className="mt-14 space-y-16">
              {sections.map((s, i) => (
                <section key={s.slug} id={s.slug} className="scroll-mt-24">
                  <div className="flex items-baseline justify-between gap-4 border-b border-white/[.06] pb-3 mb-5">
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
                      <span className="mono text-xs text-[color:var(--accent)] mr-3 align-middle">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s.title}
                    </h2>
                    {showSectionNav && (
                      <a
                        href="#top"
                        className="hidden md:inline mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--fg-dim)] hover:text-[color:var(--fg)] transition"
                      >
                        ↑ top
                      </a>
                    )}
                  </div>
                  <div
                    className="prose-tight"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }}
                  />
                </section>
              ))}
            </div>
          )}

          <div className="mt-20 pt-10 border-t border-white/[.06] flex flex-wrap items-center justify-between gap-4">
            <Link
              href={backHref}
              className="mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition inline-flex items-center gap-2"
            >
              <span aria-hidden>←</span>
              <span>{backLabel}</span>
            </Link>
            <a
              href="#top"
              className="mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition inline-flex items-center gap-2"
            >
              <span>Back to top</span>
              <span aria-hidden>↑</span>
            </a>
          </div>

          {/* Static prev/next strip — visible at the bottom of every detail
              page even without the scroll gesture. The EdgeNav component
              handles the over-scroll commit; this strip is the click fallback. */}
          {(neighbors?.prev || neighbors?.next) && (
            <div className="mt-12 grid sm:grid-cols-2 gap-3">
              {neighbors?.prev && (
                <Link
                  href={neighbors.prev.href}
                  className="rounded-xl border border-white/[.06] bg-[color:var(--bg-card)]/40 p-5 hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--bg-card)] transition group"
                >
                  <div className="mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--fg-dim)] mb-1.5 flex items-center gap-2">
                    <span aria-hidden>←</span>
                    <span>Previous · {neighbors.prev.eyebrow}</span>
                  </div>
                  <div className="text-sm md:text-base font-medium text-[color:var(--fg)] group-hover:text-white">
                    {neighbors.prev.title}
                  </div>
                </Link>
              )}
              {neighbors?.next && (
                <Link
                  href={neighbors.next.href}
                  className={`rounded-xl border border-white/[.06] bg-[color:var(--bg-card)]/40 p-5 hover:border-[color:var(--accent)]/40 hover:bg-[color:var(--bg-card)] transition group ${neighbors.prev ? "" : "sm:col-start-2"} text-right`}
                >
                  <div className="mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--fg-dim)] mb-1.5 flex items-center justify-end gap-2">
                    <span>Next · {neighbors.next.eyebrow}</span>
                    <span aria-hidden>→</span>
                  </div>
                  <div className="text-sm md:text-base font-medium text-[color:var(--fg)] group-hover:text-white">
                    {neighbors.next.title}
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* The fluid pull-to-navigate gesture. Defaults: window scroll +
          router.push commit + transform on `main[data-edge-nav]`. */}
      {neighbors && (
        <EdgeNav
          prev={neighbors.prev ? { ...neighbors.prev } : undefined}
          next={neighbors.next ? { ...neighbors.next } : undefined}
        />
      )}
      {/* Reads the directional commit flag and animates the new page in
          from the matching edge so transitions feel continuous. */}
      <EdgeEntry />
    </main>
  );
}

