// @ts-nocheck — Tweakpane v4 public types don't expose the runtime API
// (addFolder / addBinding / etc.). This component is dev-only; runtime works.

"use client";
// Live design-token tweak panel.
//
// Visible only in:
//   - dev mode (process.env.NODE_ENV === 'development'), automatically
//   - any mode if the URL has ?tweak=1
//
// What it lets you do:
//   - Color picker on every CSS palette variable (--bg, --fg, --accent, ...)
//   - Slider on key sizing tokens (hero size, body size, card radius, ...)
//   - "Copy CSS" button: emits the current values as a paste-ready block
//     for `src/app/globals.css` :root rule so a session of tweaking can be
//     committed permanently.
//
// Implementation notes:
//   - Tweakpane is dynamically imported so it's tree-shaken from production
//     bundles when not gated in.
//   - All token writes go through document.documentElement.style.setProperty
//     so changes are instant — no re-render, no rebuild.
//   - On unmount, we tear down the pane but leave the CSS overrides in place
//     so the visual state persists across HMR reloads.

import { useEffect } from "react";

const COLOR_TOKENS = [
  ["--bg",            "Background"],
  ["--bg-elev",       "BG elev"],
  ["--bg-card",       "Card BG"],
  ["--fg",            "Foreground"],
  ["--fg-muted",      "FG muted"],
  ["--fg-dim",        "FG dim"],
  ["--accent",        "Accent 1"],
  ["--accent-2",      "Accent 2"],
  ["--accent-3",      "Accent 3"],
] as const;

const SIZE_TOKENS = [
  // [css var, label, min, max, step, unit-suffix]
  ["--hero-size",        "Hero size",        2,    8,   0.1, "rem"],
  ["--section-pad-y",    "Section pad-Y",    2,   12,   0.5, "rem"],
  ["--card-radius",      "Card radius",      0,   24,   1,   "px"],
  ["--border-strength",  "Border strength",  0.02, 0.4, 0.01, ""], // alpha
] as const;

function rgbaWithAlpha(hex: string, alpha: number): string {
  // Basic hex → rgba; tolerates #rgb, #rrggbb, and #rrggbbaa
  const h = hex.replace(/^#/, "");
  let r = 0, g = 0, b = 0;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length >= 6) {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function TweakPanel() {
  useEffect(() => {
    const isDev = process.env.NODE_ENV === "development";
    const qsForce = typeof window !== "undefined" && new URL(window.location.href).searchParams.get("tweak") === "1";
    if (!isDev && !qsForce) return;

    let dispose: (() => void) | undefined;

    (async () => {
      const { Pane } = await import("tweakpane");
      // Cast to any — Tweakpane v4 has addFolder/addBinding on Pane at runtime
      // but the public type alias doesn't expose them. This component is dev-only.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pane = new Pane({ title: "Design tokens", expanded: true }) as any;

      // Read current values
      const cs = getComputedStyle(document.documentElement);
      const read = (name: string, fallback: string) => {
        const v = cs.getPropertyValue(name).trim();
        return v || fallback;
      };

      const params: Record<string, string | number> = {};

      // --- Colors folder ---
      const colors = pane.addFolder({ title: "Colors", expanded: true });
      for (const [cssVar, label] of COLOR_TOKENS) {
        const initial = read(cssVar, "#ffffff");
        // Tweakpane color picker requires a hex string. If the CSS value is
        // an rgba(...), give the picker the full string so it'll parse it.
        params[cssVar] = initial;
        colors.addBinding(params, cssVar, { label, view: "color", picker: "inline", expanded: false } as const)
          .on("change", (e) => {
            document.documentElement.style.setProperty(cssVar, String(e.value));
          });
      }

      // --- Sizing folder ---
      const sizing = pane.addFolder({ title: "Sizing", expanded: true });
      for (const [cssVar, label, min, max, step, unit] of SIZE_TOKENS) {
        // Read existing value or default to mid-range
        const raw = read(cssVar, "");
        const num = parseFloat(raw) || (min + max) / 2;
        params[cssVar] = num;
        sizing.addBinding(params, cssVar, { label, min, max, step })
          .on("change", (e) => {
            const value = unit ? `${e.value}${unit}` : String(e.value);
            document.documentElement.style.setProperty(cssVar, value);
          });
      }

      // --- Border alpha (derived) ---
      // The site's border colors are alpha-tinted whites. Sliding "Border
      // strength" rewrites --border + --border-strong with the new alpha.
      sizing.on("change", (e) => {
        if (e.target?.label !== "Border strength") return;
        const alpha = Number(params["--border-strength"]);
        document.documentElement.style.setProperty("--border", `rgba(255, 255, 255, ${alpha.toFixed(3)})`);
        document.documentElement.style.setProperty("--border-strong", `rgba(255, 255, 255, ${(alpha * 1.8).toFixed(3)})`);
      });

      // --- Export ---
      const exportFolder = pane.addFolder({ title: "Export", expanded: false });
      const exportBtn = exportFolder.addButton({ title: "Copy CSS to clipboard" });
      exportBtn.on("click", async () => {
        const lines: string[] = [":root {"];
        for (const [cssVar] of COLOR_TOKENS) {
          lines.push(`  ${cssVar}: ${params[cssVar]};`);
        }
        for (const [cssVar, , , , , unit] of SIZE_TOKENS) {
          const v = params[cssVar];
          lines.push(`  ${cssVar}: ${unit ? `${v}${unit}` : v};`);
        }
        // Border vars derived from --border-strength
        const a = Number(params["--border-strength"]);
        lines.push(`  --border: rgba(255, 255, 255, ${a.toFixed(3)});`);
        lines.push(`  --border-strong: rgba(255, 255, 255, ${(a * 1.8).toFixed(3)});`);
        lines.push("}");
        const css = lines.join("\n");
        try {
          await navigator.clipboard.writeText(css);
          exportBtn.title = "Copied! ✓";
          setTimeout(() => { exportBtn.title = "Copy CSS to clipboard"; }, 1500);
        } catch {
          // Fallback: print to console
          console.log("[TweakPanel] CSS:\n" + css);
          exportBtn.title = "Logged to console";
        }
      });

      const resetBtn = exportFolder.addButton({ title: "Reset (clear overrides)" });
      resetBtn.on("click", () => {
        for (const [cssVar] of COLOR_TOKENS) {
          document.documentElement.style.removeProperty(cssVar);
        }
        for (const [cssVar] of SIZE_TOKENS) {
          document.documentElement.style.removeProperty(cssVar);
        }
        document.documentElement.style.removeProperty("--border");
        document.documentElement.style.removeProperty("--border-strong");
        // Refresh pane values from stylesheet defaults
        const cs2 = getComputedStyle(document.documentElement);
        for (const [cssVar] of COLOR_TOKENS) {
          params[cssVar] = cs2.getPropertyValue(cssVar).trim();
        }
        pane.refresh();
      });

      // Position the pane out of the way of the chat FAB (bottom-right at
      // z 2147483647). Pane goes top-right by default; nudge it down.
      const paneEl = (pane as unknown as { element: HTMLElement }).element;
      if (paneEl) {
        paneEl.style.position = "fixed";
        paneEl.style.top = "70px";
        paneEl.style.right = "16px";
        paneEl.style.zIndex = "999999";
        paneEl.style.minWidth = "260px";
      }

      dispose = () => pane.dispose();
      // Suppress quiet TS unused warning for rgbaWithAlpha if tree-shaken
      void rgbaWithAlpha;
    })();

    return () => dispose?.();
  }, []);

  return null;
}
