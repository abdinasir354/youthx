"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Turns a Server Action error (a message key or plain text) into readable English for the admin. */
export function adminErrorText(error?: string) {
  if (!error) return "Something went wrong. Please try again.";
  const known: Record<string, string> = {
    "errors.forbidden": "You don't have permission to do this.",
    "common.error": "Something went wrong. Please try again.",
    "common.notConfigured": "Supabase isn't configured yet.",
    "common.tooManyRequests": "Too many requests. Please wait a moment.",
    "validation.invalid": "Please check the form and try again.",
  };
  if (known[error]) return known[error];
  return /^[a-zA-Z]+\.[a-zA-Z.]+$/.test(error) ? "Something went wrong. Please try again." : error;
}

type ConfirmOptions = { title: string; body?: ReactNode; confirmLabel?: string; danger?: boolean };
const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);

/** `const confirm = useConfirm(); if (await confirm({ title: "Delete?" , danger: true })) …` */
export function useConfirm() {
  return useContext(ConfirmContext);
}

/** Accessible confirmation dialog (native <dialog>: focus trap, Esc to cancel). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (opts && ref.current && !ref.current.open) ref.current.showModal();
  }, [opts]);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    ref.current?.close();
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={ref}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
        className="w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border bg-white p-0 shadow-xl backdrop:bg-black/40"
        aria-labelledby="confirm-title"
      >
        {opts && (
          <div className="p-6">
            <div className="flex gap-3">
              {opts.danger && (
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <AlertTriangle className="size-4" />
                </span>
              )}
              <div>
                <h2 id="confirm-title" className="text-base font-bold text-secondary">{opts.title}</h2>
                {opts.body && <div className="mt-1 text-sm text-muted-foreground">{opts.body}</div>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => close(false)} autoFocus>
                Cancel
              </Button>
              <Button variant={opts.danger ? "danger" : "secondary"} size="sm" onClick={() => close(true)}>
                {opts.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}

/** Generic modal (used by the media picker and section-type chooser). */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={`max-h-[90vh] rounded-lg border border-border bg-white p-0 shadow-xl backdrop:bg-black/40 ${wide ? "w-[min(64rem,calc(100vw-2rem))]" : "w-[min(36rem,calc(100vw-2rem))]"}`}
      aria-label={title}
    >
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-base font-bold text-secondary">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted" aria-label="Close">
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
