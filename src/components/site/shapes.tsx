import { cn } from "@/lib/utils";

/**
 * Soft decorative shapes that drift slowly. Purely visual: aria-hidden, no pointer events,
 * and frozen for visitors who prefer reduced motion (see globals.css).
 */
export function FloatingShapes({ variant = "a", className }: { variant?: "a" | "b" | "c"; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {variant === "a" && (
        <>
          <div className="float-b absolute -right-24 -top-24 size-80 rounded-full bg-primary/25 blur-3xl" />
          <div className="float-a absolute -bottom-16 left-[8%] size-56 rounded-full bg-secondary/10 blur-2xl" />
          <svg className="spin-slow absolute right-[38%] top-10 size-24 text-primary/60" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="2" strokeDasharray="4 8" />
          </svg>
        </>
      )}
      {variant === "b" && (
        <>
          <div className="float-a absolute -left-10 top-16 size-40 rotate-12 rounded-[2.5rem] bg-primary/30" />
          <div className="float-b absolute bottom-6 left-[38%] size-16 rounded-full border-4 border-secondary/15" />
          <svg className="spin-slow absolute -left-6 bottom-10 size-28 text-secondary/20" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 9" />
          </svg>
        </>
      )}
      {variant === "c" && (
        <>
          <div className="float-b absolute -right-16 top-1/3 size-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="float-a absolute left-[6%] top-10 size-10 rounded-full bg-primary" />
          <div className="float-b absolute bottom-12 right-[12%] size-6 rotate-45 rounded-sm bg-secondary/25" />
        </>
      )}
    </div>
  );
}

/** Shown in place of a photo until an admin uploads one: branded, never blank. */
export function PhotoPlaceholder({ className, tone = "dark" }: { className?: string; tone?: "dark" | "lime" }) {
  return (
    <div aria-hidden className={cn("relative flex items-center justify-center overflow-hidden", tone === "dark" ? "bg-lattice bg-secondary" : "bg-primary", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand mark */}
      <img src={tone === "dark" ? "/logo-icon-light.png" : "/logo-icon.png"} alt="" className="w-2/5 max-w-48 opacity-90" />
    </div>
  );
}
