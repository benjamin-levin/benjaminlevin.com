"use client";
// Pull-to-navigate gesture, generic over scroll container + commit handler.
//
// Two consumer modes:
//   - Detail pages: scroll container is `window`, commit calls `router.push`.
//   - IdePortfolio: scroll container is the inner editor div, commit calls
//     `setActiveFile`. Same component, two configurations.
//
// Visual story:
//   - Permanent edge hints ("↑ Previous · {title}", "↓ Next · {title}") fade
//     in at low opacity when the user reaches the top/bottom of the scroll
//     container, so the gesture is discoverable without having to attempt it.
//   - During a pull, a dampened CSS variable `--edge-pull-y` drives a
//     transform on the configured target element (rubber-band feel).
//   - When the pull crosses the commit threshold, the target slides off in
//     the appropriate direction and the consumer's `onCommit` fires.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

export type EdgeNeighbor = {
  title: string;
  eyebrow: string; // e.g., "Experience" or "Project" or "skills.md"
  href?: string;   // detail-page mode: the route to push
  // For consumer-controlled commit (e.g., IdePortfolio), pass `onCommit` instead.
};

export type EdgeNavProps = {
  prev?: EdgeNeighbor;
  next?: EdgeNeighbor;
  /**
   * Optional handler called instead of `router.push(target.href)`. Use for
   * single-page gestures (e.g., switch active file) where there's no route.
   */
  onCommit?: (direction: "prev" | "next") => void;
  /**
   * Where to attach scroll/wheel/touch listeners. Defaults to `window`.
   * Pass an HTMLElement (or null while loading) to listen on a specific
   * scroll container.
   */
  scrollContainer?: HTMLElement | null;
  /**
   * CSS selector or HTMLElement whose `transform` is driven by the pull.
   * Pass null to skip transform (just events + hints).
   */
  transformTarget?: HTMLElement | null | string;
};

const PULL_DAMPEN = 0.65;        // wheel deltaY → translateY scale
const PULL_THRESHOLD = 200;      // px past which we commit
const TRIGGER_RATIO = 0.92;      // % of threshold to commit
const PULL_BANNER_FADE = 60;     // px before banner reaches full opacity
const PULL_MAX_OVERSHOOT = 1.25; // % of threshold the user can pull past
const TRANSITION_MS = 280;       // commit slide-off animation
const WARMUP_PX = 70;            // accumulated wheel input at edge before pull starts visualizing
const WARMUP_RESET_MS = 220;     // wheel idle time before warmup buffer resets to 0

type Direction = "prev" | "next" | null;

export function EdgeNav({
  prev,
  next,
  onCommit,
  scrollContainer,
  transformTarget,
}: EdgeNavProps) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const pullRef = useRef(0);
  const committingRef = useRef(false);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => { pullRef.current = pull; }, [pull]);

  // Resolve transformTarget into an actual element.
  useEffect(() => {
    let el: HTMLElement | null = null;
    if (typeof transformTarget === "string") {
      el = document.querySelector(transformTarget);
    } else if (transformTarget instanceof HTMLElement) {
      el = transformTarget;
    } else if (transformTarget === null) {
      el = null;
    } else {
      // default: try to resolve `main[data-edge-nav]`
      el = document.querySelector("main[data-edge-nav]");
    }
    targetRef.current = el;
  }, [transformTarget]);

  // Drive the transform via inline style on the target.
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    el.style.setProperty("--edge-pull-y", `${pull}px`);
  }, [pull]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      const el = targetRef.current;
      if (el) {
        el.style.removeProperty("--edge-pull-y");
        el.classList.remove("edge-exit-up", "edge-exit-down");
      }
    };
  }, []);

  // Compute "at top / at bottom" for the configured container, with a
  // tolerance of 6px to handle subpixel rounding.
  const recomputeEdges = useCallback(() => {
    const c = scrollContainer ?? window;
    if (c === window) {
      const y = window.scrollY;
      const top = y <= 6;
      const bottom = y + window.innerHeight >= document.documentElement.scrollHeight - 6;
      setAtTop(top);
      setAtBottom(bottom);
    } else {
      const el = c as HTMLElement;
      const top = el.scrollTop <= 6;
      const bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 6;
      setAtTop(top);
      setAtBottom(bottom);
    }
  }, [scrollContainer]);

  useEffect(() => {
    recomputeEdges();
    const c: Window | HTMLElement = scrollContainer ?? window;
    const handler = () => recomputeEdges();
    c.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      c.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [scrollContainer, recomputeEdges]);

  // Also recompute when the active container or neighbors change (e.g.,
  // user clicks to a new file in the IDE).
  useEffect(() => {
    recomputeEdges();
    setPull(0);
  }, [prev, next, recomputeEdges]);

  // Commit a direction transition. Called by gestures (wheel/touch/key) AND
  // by direct clicks on the edge banners. Lifted to component scope so the
  // JSX onClick can call the same path the gestures use.
  const commit = useCallback((dir: "prev" | "next") => {
    if (committingRef.current) return;
    const target = dir === "prev" ? prev : next;
    if (!target) return;
    committingRef.current = true;
    const el = targetRef.current;
    if (el) {
      el.classList.add(dir === "prev" ? "edge-exit-down" : "edge-exit-up");
    }
    // Tell the receiving page which direction it was opened from so it can
    // animate in matching the user's scroll direction (continuous feel).
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("edge-entry", dir === "next" ? "from-bottom" : "from-top");
      }
    } catch { /* private mode etc. — ignore */ }

    window.setTimeout(() => {
      // Reset the pull transform + slide-off class IMMEDIATELY before
      // the commit fires. Otherwise the new content (rendered by
      // setActiveFile in onCommit, or by router.push) inherits the
      // pulled translateY for a render frame, which reads as the page
      // being scrolled out into empty space.
      const el2 = targetRef.current;
      if (el2) {
        el2.classList.remove("edge-exit-up", "edge-exit-down");
        el2.style.setProperty("--edge-pull-y", "0px");
      }
      committingRef.current = false;
      setPull(0);

      if (onCommit) {
        onCommit(dir);
      } else if (target.href) {
        // Tag the document so view-transition CSS knows which direction
        // the new page should enter from, then trigger the navigation.
        // View Transitions API gives us cross-page DOM animation for free.
        const root = document.documentElement;
        root.dataset.edgeDir = dir;
        const goNext = () => router.push(target.href!);
        const docAny = document as Document & { startViewTransition?: (cb: () => void) => unknown };
        if (typeof docAny.startViewTransition === "function") {
          docAny.startViewTransition(goNext);
        } else {
          goNext();
        }
      }
    }, TRANSITION_MS - 30);
  }, [prev, next, onCommit, router]);

  // Main wheel/touch/key handlers.
  useEffect(() => {
    const isAtTop = () => {
      const c = scrollContainer ?? window;
      if (c === window) return window.scrollY <= 6;
      const el = c as HTMLElement;
      return el.scrollTop <= 6;
    };
    const isAtBottom = () => {
      const c = scrollContainer ?? window;
      if (c === window) {
        return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 6;
      }
      const el = c as HTMLElement;
      return el.scrollTop + el.clientHeight >= el.scrollHeight - 6;
    };
    // Warmup buffers: deltaY absorbed at the edge BEFORE any visible pull
    // begins. Lets a casual flick past the page edge be silently consumed
    // without yanking the page off screen. Only once the user has shown
    // sustained intent (accumulated > WARMUP_PX of input in the same
    // direction within WARMUP_RESET_MS) does the rubber-band engage.
    let warmupTop = 0;
    let warmupBottom = 0;
    let warmupTimer: number | null = null;
    const tickWarmupReset = () => {
      if (warmupTimer) window.clearTimeout(warmupTimer);
      warmupTimer = window.setTimeout(() => {
        warmupTop = 0;
        warmupBottom = 0;
      }, WARMUP_RESET_MS);
    };

    const onWheel = (e: WheelEvent) => {
      if (committingRef.current) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const cur = pullRef.current;

      if (isAtTop() && e.deltaY < 0 && prev) {
        // Track wheel input at the edge silently until the warmup
        // threshold is met. CRITICAL: don't preventDefault during warmup —
        // that produces a visible "scroll lock" (the browser absorbs the
        // wheel but nothing happens visually). Letting the browser handle
        // the wheel naturally during warmup means it just does nothing
        // (we're at edge, can't scroll further), which is the expected
        // "I'm at the boundary" feel.
        warmupTop += -e.deltaY;
        warmupBottom = 0;
        tickWarmupReset();
        if (warmupTop < WARMUP_PX && cur === 0) return;
        e.preventDefault();
        const dampened = e.deltaY * PULL_DAMPEN;
        const np = Math.max(cur + dampened, -PULL_THRESHOLD * PULL_MAX_OVERSHOOT);
        setPull(np);
        if (np <= -PULL_THRESHOLD * TRIGGER_RATIO) commit("prev");
        return;
      }
      if (isAtBottom() && e.deltaY > 0 && next) {
        warmupBottom += e.deltaY;
        warmupTop = 0;
        tickWarmupReset();
        if (warmupBottom < WARMUP_PX && cur === 0) return;
        e.preventDefault();
        const dampened = e.deltaY * PULL_DAMPEN;
        const np = Math.min(cur + dampened, PULL_THRESHOLD * PULL_MAX_OVERSHOOT);
        setPull(np);
        if (np >= PULL_THRESHOLD * TRIGGER_RATIO) commit("next");
        return;
      }

      // Scroll moved away from the edge → rapidly decay any pull state and
      // reset both warmup buffers (we want a fresh dwell-at-edge each time).
      warmupTop = 0;
      warmupBottom = 0;
      if (cur !== 0) {
        const decay = cur > 0 ? Math.max(cur - Math.abs(e.deltaY) * 1.5, 0) : Math.min(cur + Math.abs(e.deltaY) * 1.5, 0);
        if (decay !== cur) setPull(decay);
      }
    };

    let touchStartY = 0;
    let touchTop = false;
    let touchBottom = false;
    let touchActive = false;

    const onTouchStart = (e: TouchEvent) => {
      if (committingRef.current) return;
      touchStartY = e.touches[0].clientY;
      touchTop = isAtTop();
      touchBottom = isAtBottom();
      touchActive = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchActive || committingRef.current) return;
      const dy = e.touches[0].clientY - touchStartY;
      // Re-check edge state as scroll happens.
      if (touchTop && dy > 0 && prev) {
        e.preventDefault();
        const np = Math.max(-dy * PULL_DAMPEN, -PULL_THRESHOLD * PULL_MAX_OVERSHOOT);
        setPull(np);
        if (np <= -PULL_THRESHOLD * TRIGGER_RATIO) commit("prev");
      } else if (touchBottom && dy < 0 && next) {
        e.preventDefault();
        const np = Math.min(-dy * PULL_DAMPEN, PULL_THRESHOLD * PULL_MAX_OVERSHOOT);
        setPull(np);
        if (np >= PULL_THRESHOLD * TRIGGER_RATIO) commit("next");
      }
    };
    const onTouchEnd = () => {
      touchActive = false;
      if (!committingRef.current && Math.abs(pullRef.current) > 0) {
        setPull(0);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (committingRef.current) return;
      if (e.key === "PageDown" && isAtBottom() && next) { e.preventDefault(); commit("next"); }
      else if (e.key === "PageUp" && isAtTop() && prev) { e.preventDefault(); commit("prev"); }
      else if (e.key === "ArrowRight" && (e.metaKey || e.altKey) && next) { e.preventDefault(); commit("next"); }
      else if (e.key === "ArrowLeft" && (e.metaKey || e.altKey) && prev) { e.preventDefault(); commit("prev"); }
      else if (e.key === "j" && e.ctrlKey && next) { e.preventDefault(); commit("next"); }
      else if (e.key === "k" && e.ctrlKey && prev) { e.preventDefault(); commit("prev"); }
    };

    const c: Window | HTMLElement = scrollContainer ?? window;
    c.addEventListener("wheel", onWheel as EventListener, { passive: false });
    c.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    c.addEventListener("touchmove", onTouchMove as EventListener, { passive: false });
    c.addEventListener("touchend", onTouchEnd as EventListener, { passive: true });
    window.addEventListener("keydown", onKey);

    return () => {
      c.removeEventListener("wheel", onWheel as EventListener);
      c.removeEventListener("touchstart", onTouchStart as EventListener);
      c.removeEventListener("touchmove", onTouchMove as EventListener);
      c.removeEventListener("touchend", onTouchEnd as EventListener);
      window.removeEventListener("keydown", onKey);
      if (warmupTimer) window.clearTimeout(warmupTimer);
    };
  }, [prev, next, scrollContainer, commit]);

  // Spring-back: when pull is non-zero and stale, ease toward 0.
  useEffect(() => {
    if (pull === 0 || committingRef.current) return;
    const timer = window.setTimeout(() => {
      const cur = pullRef.current;
      const np = cur > 0 ? Math.max(cur - 14, 0) : Math.min(cur + 14, 0);
      if (np !== cur) setPull(np);
    }, 110);
    return () => window.clearTimeout(timer);
  }, [pull]);

  // Direction the user is currently pulling, if any.
  const direction: Direction = pull < 0 ? "prev" : pull > 0 ? "next" : null;
  const progress = Math.min(Math.abs(pull) / PULL_THRESHOLD, 1);
  const pullingOpacity = Math.min(Math.abs(pull) / PULL_BANNER_FADE, 1);

  // Hint visibility — softly visible whenever scrolled to that edge,
  // amplified during pull.
  const topHintOpacity = direction === "prev" ? pullingOpacity : (atTop && prev ? 0.55 : 0);
  const bottomHintOpacity = direction === "next" ? pullingOpacity : (atBottom && next ? 0.55 : 0);

  // Banners only become clickable when softly visible — otherwise they're
  // off-screen taps that hijack scroll. The same fade-in threshold drives
  // both visibility and pointer-events.
  const topClickable = topHintOpacity > 0.45 && !committingRef.current;
  const bottomClickable = bottomHintOpacity > 0.45 && !committingRef.current;

  return (
    <>
      {prev && (
        <div
          className={`edge-banner edge-banner-top ${direction === "prev" ? "edge-banner-active" : ""}`}
          role={topClickable ? "button" : undefined}
          tabIndex={topClickable ? 0 : -1}
          aria-label={topClickable ? `Go to ${prev.eyebrow} · ${prev.title}` : undefined}
          aria-hidden={topHintOpacity < 0.5}
          onClick={topClickable ? () => commit("prev") : undefined}
          onKeyDown={topClickable ? (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit("prev"); }
          } : undefined}
          style={{
            opacity: topHintOpacity,
            "--edge-progress": `${direction === "prev" ? progress : 0}`,
            pointerEvents: topClickable ? "auto" : "none",
            cursor: topClickable ? "pointer" : "default",
          } as React.CSSProperties}
        >
          <span className="edge-banner-arrow" aria-hidden>↑</span>
          <span className="edge-banner-eyebrow">{prev.eyebrow}</span>
          <span className="edge-banner-title">{prev.title}</span>
        </div>
      )}
      {next && (
        <div
          className={`edge-banner edge-banner-bottom ${direction === "next" ? "edge-banner-active" : ""}`}
          role={bottomClickable ? "button" : undefined}
          tabIndex={bottomClickable ? 0 : -1}
          aria-label={bottomClickable ? `Go to ${next.eyebrow} · ${next.title}` : undefined}
          aria-hidden={bottomHintOpacity < 0.5}
          onClick={bottomClickable ? () => commit("next") : undefined}
          onKeyDown={bottomClickable ? (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit("next"); }
          } : undefined}
          style={{
            opacity: bottomHintOpacity,
            "--edge-progress": `${direction === "next" ? progress : 0}`,
            pointerEvents: bottomClickable ? "auto" : "none",
            cursor: bottomClickable ? "pointer" : "default",
          } as React.CSSProperties}
        >
          <span className="edge-banner-arrow" aria-hidden>↓</span>
          <span className="edge-banner-eyebrow">{next.eyebrow}</span>
          <span className="edge-banner-title">{next.title}</span>
        </div>
      )}
      {direction !== null && (
        <div
          className={`edge-shadow ${direction === "prev" ? "edge-shadow-top" : "edge-shadow-bottom"}`}
          style={{ opacity: progress * 0.55 }}
          aria-hidden
        />
      )}
    </>
  );
}
