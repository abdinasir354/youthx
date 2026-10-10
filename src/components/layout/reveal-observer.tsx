"use client";

import { useEffect } from "react";

const TARGETS = "[data-reveal]:not([data-reveal-state]), [data-reveal-stagger]:not([data-reveal-state])";

/** React attaches its fiber to a DOM node when it hydrates it; streamed sections hydrate later. */
const isHydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"));

/**
 * Scroll reveals: elements marked `data-reveal` (or groups marked `data-reveal-stagger`) fade up
 * the first time they scroll into view. See the matching rules in globals.css.
 *
 * - Content is only hidden once it is marked `data-reveal-state="hidden"` here, below the fold, so
 *   anything on screen at load, or anything this script never reaches, simply stays visible.
 * - Elements are only touched after React has hydrated them (no hydration mismatches).
 * - Skipped entirely when the visitor prefers reduced motion.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.revealState = "in";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );

    let waiting = false;
    const scan = () => {
      waiting = false;
      document.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => {
        if (!isHydrated(el)) {
          waiting = true;
          return;
        }
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.dataset.revealState = "shown"; // already on screen: leave as is
        } else {
          el.dataset.revealState = "hidden";
          io.observe(el);
        }
      });
    };

    scan();
    // Streamed sections hydrate a moment later; client navigation adds new ones.
    let frame = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    let tries = 0;
    const retry = window.setInterval(() => {
      if (waiting) scan();
      if (!waiting || ++tries > 40) window.clearInterval(retry);
    }, 250);

    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(frame);
      window.clearInterval(retry);
    };
  }, []);

  return null;
}
