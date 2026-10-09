import { cn } from "@/lib/utils";

/** Shown in place of a photo until an admin uploads one: branded, never blank. */
export function PhotoPlaceholder({ className, tone = "dark" }: { className?: string; tone?: "dark" | "lime" }) {
  return (
    <div aria-hidden className={cn("relative flex items-center justify-center overflow-hidden", tone === "dark" ? "bg-secondary" : "bg-primary-soft", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand mark */}
      <img src={tone === "dark" ? "/logo-icon-light.png" : "/logo-icon.png"} alt="" className="w-2/5 max-w-48 opacity-90" />
    </div>
  );
}
