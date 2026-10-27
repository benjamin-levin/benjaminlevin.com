import type { Personal } from "@/lib/data";
import { COPY } from "@/../data/copy";
import { ResumeGeneratorButton } from "@/components/ResumeGeneratorButton";

export function Hero({ personal }: { personal: Personal }) {
  const linkedIn = personal.links.find((l) => l.label === "LinkedIn")?.url;
  return (
    <header className="relative px-6 md:px-10 pt-6 md:pt-10 pb-10 md:pb-14">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-[1.05] gradient-text pb-2">
          {personal.name}
        </h1>
        <p className="mt-6 text-lg md:text-2xl text-[color:var(--fg-muted)] max-w-3xl leading-relaxed">
          {COPY.hero.descriptor}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href={`mailto:${personal.email}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold border border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--accent)] hover:bg-[color:var(--accent)]/20 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all duration-300"
          >
            {COPY.hero.cta.email}
            <span aria-hidden className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
          {linkedIn && (
            <a
              href={linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium border border-white/10 hover:border-white/30 hover:bg-white/[.05] transition-all duration-300"
            >
              {COPY.hero.cta.linkedin}
            </a>
          )}
          <ResumeGeneratorButton label={COPY.hero.cta.resume} />
        </div>
      </div>
    </header>
  );
}
