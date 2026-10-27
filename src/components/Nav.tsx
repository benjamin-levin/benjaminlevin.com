"use client";
import { useEffect, useState } from "react";
import { COPY } from "@/../data/copy";

const ITEMS = COPY.nav.items;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-[color:var(--bg)]/60 border-b border-white/[.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-10 h-11 flex items-center justify-end">
        <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-[color:var(--fg-muted)]">
          {ITEMS.map((it) => (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                className="hover:text-[color:var(--accent)] hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all"
              >
                {it.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
