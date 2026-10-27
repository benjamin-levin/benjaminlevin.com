"use client";
// Strips the directional flag from <html> after a route-level View Transition
// completes. EdgeNav sets `data-edge-dir="next|prev"` before calling
// router.push (wrapped in document.startViewTransition) so the corresponding
// `::view-transition-old(root)` and `::view-transition-new(root)` animations
// run. After the transition ends we clean up so subsequent navigations
// (e.g., a back-click) don't re-use a stale direction.

import { useEffect } from "react";

export function EdgeEntry() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.dataset.edgeDir) return;
    const timer = window.setTimeout(() => {
      delete root.dataset.edgeDir;
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
