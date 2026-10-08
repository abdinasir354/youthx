import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

export function Progress({ value, className, barClassName, label }: { value: number; className?: string; barClassName?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full bg-secondary transition-all", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon = Inbox, children }: { title: string; description?: string; icon?: LucideIcon; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-primary-soft p-3 text-secondary">
        <Icon className="size-6" />
      </div>
      <h3 className="font-semibold text-secondary">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Alert({ variant = "info", children, className }: { variant?: "info" | "danger" | "warning" | "success"; children: ReactNode; className?: string }) {
  const styles = {
    info: "bg-secondary-soft text-secondary border-secondary/20",
    success: "bg-primary-soft text-secondary border-primary",
    warning: "bg-warning-soft text-warning border-warning/30",
    danger: "bg-danger-soft text-danger border-danger/30",
  }[variant];
  return (
    <div role={variant === "danger" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", styles, className)}>
      {children}
    </div>
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-white">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}
export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("border-b border-border bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)} {...props} />;
}
export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-border px-4 py-3 align-top", className)} {...props} />;
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-secondary sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && (
          <span className="rounded-lg bg-primary-soft p-2 text-secondary">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-extrabold text-secondary">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
