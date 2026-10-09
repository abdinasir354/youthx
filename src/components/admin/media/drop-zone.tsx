"use client";

import { useRef, useState, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Drag files here or click to browse. Keyboard accessible (it's a button), and works on phones
 * (opens the file/photo picker).
 */
export function DropZone({
  onFiles,
  accept,
  multiple = true,
  disabled,
  compact,
  label = "Drag & drop files here",
  hint,
  children,
  className,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  return (
    <div
      onDragEnter={(e) => {
        if (disabled || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => {
        if (disabled || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-colors",
        over ? "border-primary bg-primary-soft" : "border-border bg-white hover:border-secondary/40",
        disabled && "opacity-60",
        className,
      )}
    >
      {children ?? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className={cn("flex w-full flex-col items-center justify-center gap-1.5 text-center", compact ? "px-4 py-5" : "px-6 py-10")}
        >
          <UploadCloud className={cn("text-secondary/60", compact ? "size-6" : "size-9")} aria-hidden />
          <span className="text-sm font-semibold text-secondary">
            {label} <span className="font-normal text-muted-foreground">or</span> <span className="underline underline-offset-2">browse</span>
          </span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </button>
      )}
      {children && (
        <button type="button" className="sr-only" onClick={() => input.current?.click()} disabled={disabled}>
          Choose files to upload
        </button>
      )}
      {over && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-primary-soft/80 text-sm font-semibold text-secondary">
          Drop to upload
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}

/** Opens the browser's file chooser (used by buttons outside a DropZone). */
export function pickFiles(accept: string, multiple: boolean, onFiles: (files: File[]) => void) {
  const el = document.createElement("input");
  el.type = "file";
  el.accept = accept;
  el.multiple = multiple;
  el.onchange = () => {
    const files = Array.from(el.files ?? []);
    if (files.length) onFiles(files);
  };
  el.click();
}
