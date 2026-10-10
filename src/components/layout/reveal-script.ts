/**
 * Scroll reveals, as a tiny inline script that runs in <head> while the page is still parsing.
 *
 * Elements marked `data-reveal` (or `data-reveal="image"`), and each child of a `data-reveal-stagger`
 * group, are held invisible by a *paused Web Animation* the moment they are inserted (before the
 * browser paints them), then played once when they scroll into view.
 *
 * Why this shape:
 * - Independent of React: it never adds attributes or classes to React's elements, so there are no
 *   hydration mismatches and no waiting for hydration. Works the same on first load, refresh,
 *   client-side navigation and streamed content, on any screen size.
 * - Fail-safe: nothing is hidden by CSS. If this script doesn't run, everything is simply visible;
 *   if it throws, every pending animation is cancelled (content shows). A watchdog also plays
 *   anything still waiting inside the viewport after load.
 * - Animations use `fill: "backwards"`: once finished they no longer apply, so hover transforms
 *   (Tailwind's `translate`/`scale` properties) are never overridden.
 * - Skipped entirely for prefers-reduced-motion and when printing.
 */
export const REVEAL_SCRIPT = `(function () {
  var w = window, d = document;
  if (!("IntersectionObserver" in w) || !("MutationObserver" in w) || !("animate" in Element.prototype)) return;
  if (w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var SEL = "[data-reveal],[data-reveal-stagger]";
  var EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
  var STEP = 120, MAX_DELAY = 600;
  var pending = new Map();      // element -> paused animation
  var seen = new WeakSet();
  var staggered = new WeakSet();
  var io, mo, dead = false;

  function bail() {
    dead = true;
    pending.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    pending.clear();
    try { io && io.disconnect(); mo && mo.disconnect(); } catch (e) {}
  }

  function hide(el, image, inGroup) {
    if (seen.has(el) || el.nodeType !== 1) return;
    // Decorative group children (lines, shapes) don't take a stagger slot.
    if (inGroup && el.getAttribute("aria-hidden") === "true") return;
    seen.add(el);
    if (inGroup) staggered.add(el);
    var frames = image
      ? [{ opacity: 0, transform: "translate3d(0,32px,0) scale(0.98)" }, { opacity: 1, transform: "none" }]
      : [{ opacity: 0, transform: "translate3d(0,28px,0)" }, { opacity: 1, transform: "none" }];
    var a = el.animate(frames, { duration: image ? 850 : 780, easing: EASE, fill: "backwards" });
    a.pause();
    a.currentTime = 0;
    pending.set(el, a);
    io.observe(el);
  }

  function reveal(el, delay) {
    var a = pending.get(el);
    io.unobserve(el);
    if (!a) return;
    pending.delete(el);
    a.effect.updateTiming({ delay: delay });
    a.play();
    // Photos settle from a slight zoom while their frame rises in.
    var imgs = el.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].animate([{ transform: "scale(1.1)" }, { transform: "none" }], { duration: 1300, delay: delay, easing: EASE, fill: "backwards" });
    }
  }

  function nested(el) {
    var p = el.parentElement;
    return p ? p.closest(SEL) : null;
  }

  function consider(el) {
    if (el.nodeType !== 1) return;
    var parent = el.parentElement;
    // A new child of a group (initial parse, or added later by React).
    if (parent && parent.hasAttribute("data-reveal-stagger") && !nested(parent)) hide(el, false, true);
    if (!el.matches(SEL) || nested(el)) return;
    if (el.hasAttribute("data-reveal-stagger")) {
      for (var i = 0; i < el.children.length; i++) hide(el.children[i], false, true);
    } else {
      hide(el, el.getAttribute("data-reveal") === "image", false);
    }
  }

  function scan(root) {
    consider(root);
    if (!root.querySelectorAll) return;
    var list = root.querySelectorAll(SEL);
    for (var i = 0; i < list.length; i++) consider(list[i]);
  }

  try {
    io = new IntersectionObserver(function (entries) {
      if (dead) return;
      try {
        var n = 0;
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i], el = e.target;
          if (!el.isConnected) { io.unobserve(el); pending.delete(el); continue; }
          if (!e.isIntersecting) continue;
          reveal(el, staggered.has(el) ? Math.min(n++ * STEP, MAX_DELAY) : 0);
        }
      } catch (err) { bail(); }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });

    mo = new MutationObserver(function (records) {
      if (dead) return;
      try {
        for (var i = 0; i < records.length; i++) {
          var added = records[i].addedNodes;
          for (var j = 0; j < added.length; j++) if (added[j].nodeType === 1) scan(added[j]);
        }
      } catch (err) { bail(); }
    });
    mo.observe(d.documentElement, { childList: true, subtree: true });
    if (d.body) scan(d.body);
    d.addEventListener("DOMContentLoaded", function () { try { scan(d.body); } catch (err) { bail(); } });

    // Watchdog: anything inside the viewport that is still waiting after load gets played.
    w.addEventListener("load", function () {
      setTimeout(function () {
        if (dead) return;
        try {
          pending.forEach(function (a, el) {
            var r = el.getBoundingClientRect();
            if (r.bottom > 0 && r.top < w.innerHeight && r.width > 0) reveal(el, 0);
          });
        } catch (err) { bail(); }
      }, 2500);
    });
    w.addEventListener("beforeprint", bail);
  } catch (err) {
    bail();
  }
})();`;
