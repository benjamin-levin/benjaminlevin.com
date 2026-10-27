import type { ReactNode } from "react";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-t border-white/[.04] py-16 md:py-24 px-6 md:px-10 relative">
      {/* Decorative vertical line matching the grid aesthetic */}
      <div className="absolute left-6 md:left-10 top-0 w-px h-16 bg-gradient-to-b from-[color:var(--accent)]/40 to-transparent"></div>

      <div className="max-w-6xl mx-auto">
        <div className="mb-10 md:mb-14 max-w-3xl">
          <div className="mono text-xs font-bold uppercase tracking-[0.25em] text-[color:var(--accent)] mb-3">
            {eyebrow}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-[color:var(--fg)]">
            {title}
          </h2>
          {description && (
            <p className="mt-4 text-[color:var(--fg-muted)] text-sm md:text-base leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
