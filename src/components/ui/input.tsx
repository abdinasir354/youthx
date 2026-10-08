import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-xl border border-border bg-white px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-secondary focus:outline-none focus:ring-2 focus:ring-primary/60 disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(field, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-28 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(field, "h-11 pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-secondary", className)} {...props} />;
}

export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-danger">
      {children}
    </p>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return <input type="checkbox" className={cn("size-4 rounded accent-secondary", className)} {...props} />;
}
