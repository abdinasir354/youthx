import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  published: "bg-secondary-soft text-secondary ring-secondary/20",
  draft: "bg-muted text-muted-foreground ring-border",
  pending_review: "bg-warning-soft text-warning ring-warning/30",
  archived: "bg-muted text-muted-foreground ring-border line-through decoration-1",
  closed: "bg-muted text-secondary ring-border",
  new: "bg-primary-soft text-secondary ring-primary",
  under_review: "bg-warning-soft text-warning ring-warning/30",
  approved: "bg-secondary-soft text-secondary ring-secondary/20",
  rejected: "bg-danger-soft text-danger ring-danger/30",
  visible: "bg-secondary-soft text-secondary ring-secondary/20",
  hidden: "bg-muted text-muted-foreground ring-border",
};

/** Small status pill used across the admin. */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", STYLES[status] ?? "bg-muted text-muted-foreground ring-border", className)}>
      {status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}
    </span>
  );
}
