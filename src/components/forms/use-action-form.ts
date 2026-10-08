"use client";

import { useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { z } from "zod";

export type ClientActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Translate an error key: "validation.*" short keys ("required", "minChars:50") or full keys ("auth.invalidCredentials"). */
export function useErrorText() {
  const t = useTranslations();
  return (msg?: string) => {
    if (!msg) return undefined;
    const [key, param] = msg.split(":");
    const full = key.includes(".") ? key : `validation.${key}`;
    if (!t.has(full)) return t("validation.invalid");
    return t(full, { min: param, max: param });
  };
}

/**
 * react-hook-form + zod on the client, then the same schema is re-checked by the Server Action.
 * We send the raw form values (not the zod output) so the server parses exactly what the user typed.
 */
export function useActionForm<V extends FieldValues, R = unknown>({
  schema,
  defaultValues,
  action,
  onSuccess,
  successMessage,
  resetOnSuccess = false,
}: {
  schema: z.ZodType;
  defaultValues: DefaultValues<V>;
  action: (values: V) => Promise<ClientActionResult<R>>;
  onSuccess?: (result: { data?: R; message?: string }) => void;
  successMessage?: string;
  resetOnSuccess?: boolean;
}) {
  const errorText = useErrorText();
  const [pending, startTransition] = useTransition();
  const form = useForm<V>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as any,
    defaultValues,
    mode: "onTouched",
  });

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      try {
        const result = await action(values);
        if (result.ok) {
          if (successMessage) toast.success(successMessage);
          if (resetOnSuccess) form.reset(defaultValues);
          onSuccess?.(result);
        } else {
          for (const [field, msg] of Object.entries(result.fieldErrors ?? {})) {
            form.setError(field as Path<V>, { message: msg });
          }
          toast.error(errorText(result.error));
        }
      } catch (e) {
        // redirect() thrown from an action is handled by Next; anything else is unexpected
        if (e && typeof e === "object" && "digest" in e && String((e as { digest: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
        toast.error(errorText("common.error"));
      }
    });
  });

  return { form, onSubmit, pending, errorText };
}
