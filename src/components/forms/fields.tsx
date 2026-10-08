"use client";

import { useId, type ReactNode } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Checkbox, FieldError, Input, Label, Select, Textarea } from "@/components/ui/input";
import { useErrorText } from "./use-action-form";

type Base<V extends FieldValues> = {
  form: UseFormReturn<V>;
  name: Path<V>;
  label: ReactNode;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
};

function useFieldState<V extends FieldValues>(form: UseFormReturn<V>, name: Path<V>) {
  const errorText = useErrorText();
  const id = useId();
  const error = name.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], form.formState.errors) as
    | { message?: string }
    | undefined;
  return { id, errorId: `${id}-error`, hintId: `${id}-hint`, message: errorText(error?.message) };
}

function Wrapper({ id, label, hint, hintId, optional, message, errorId, className, children }: {
  id: string; label: ReactNode; hint?: ReactNode; hintId: string; optional?: boolean; message?: string; errorId: string; className?: string; children: ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 text-xs font-normal text-muted-foreground">({t("optional")})</span>}
      </Label>
      {children}
      {hint && !message && <p id={hintId} className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <FieldError id={errorId}>{message}</FieldError>
    </div>
  );
}

export function TextField<V extends FieldValues>({ form, name, label, hint, optional, className, ...input }: Base<V> & Omit<React.ComponentProps<"input">, "name" | "form">) {
  const s = useFieldState(form, name);
  return (
    <Wrapper {...s} id={s.id} label={label} hint={hint} optional={optional} className={className}>
      <Input id={s.id} aria-invalid={!!s.message} aria-describedby={s.message ? s.errorId : hint ? s.hintId : undefined} {...input} {...form.register(name)} />
    </Wrapper>
  );
}

export function TextAreaField<V extends FieldValues>({ form, name, label, hint, optional, className, ...input }: Base<V> & Omit<React.ComponentProps<"textarea">, "name" | "form">) {
  const s = useFieldState(form, name);
  return (
    <Wrapper {...s} id={s.id} label={label} hint={hint} optional={optional} className={className}>
      <Textarea id={s.id} aria-invalid={!!s.message} aria-describedby={s.message ? s.errorId : hint ? s.hintId : undefined} {...input} {...form.register(name)} />
    </Wrapper>
  );
}

export function SelectField<V extends FieldValues>({ form, name, label, hint, optional, className, options, placeholder }: Base<V> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const s = useFieldState(form, name);
  return (
    <Wrapper {...s} id={s.id} label={label} hint={hint} optional={optional} className={className}>
      <Select id={s.id} aria-invalid={!!s.message} aria-describedby={s.message ? s.errorId : hint ? s.hintId : undefined} {...form.register(name)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Wrapper>
  );
}

export function CheckboxField<V extends FieldValues>({ form, name, label, className }: Omit<Base<V>, "hint" | "optional">) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-secondary">
        <Checkbox id={id} {...form.register(name)} />
        {label}
      </label>
    </div>
  );
}

/** Hidden honeypot field: bots fill it, humans never see it. */
export function Honeypot<V extends FieldValues>({ form }: { form: UseFormReturn<V> }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Website
        <input tabIndex={-1} autoComplete="off" {...form.register("website" as Path<V>)} />
      </label>
    </div>
  );
}

export function SubmitButton({ pending, children, ...props }: ButtonProps & { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
