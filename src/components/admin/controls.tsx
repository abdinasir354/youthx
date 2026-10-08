"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { setAdminRole, setUserRole, updateQuota } from "@/app/actions/admin";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { useErrorText } from "@/components/forms/use-action-form";
import { ADMIN_ROLE_LABELS } from "@/lib/permissions";
import { ADMIN_ROLES, USER_ROLES, type AdminRole, type UserRole } from "@/types/database.types";

type Result = { ok: boolean; error?: string };

/** Runs a (bound) Server Action, shows a toast and refreshes the page. */
export function ActionButton({ action, children, confirmText, successText, ...props }: Omit<ButtonProps, "onClick" | "action"> & {
  action: () => Promise<Result>;
  children: ReactNode;
  confirmText?: string;
  successText?: string;
}) {
  const common = useTranslations("common");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      {...props}
      disabled={pending || props.disabled}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          const res = await action();
          if (res.ok) {
            toast.success(successText ?? common("success"));
            router.refresh();
          } else toast.error(errorText(res.error));
        });
      }}
    >
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

export function RoleSelect({ userId, role, disabled }: { userId: string; role: UserRole; disabled?: boolean }) {
  const t = useTranslations("roles");
  const ta = useTranslations("admin");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label={ta("changeRole")}
      defaultValue={role}
      disabled={pending || disabled}
      className="h-9 w-36"
      onChange={(e) => {
        const next = e.target.value as UserRole;
        start(async () => {
          const res = await setUserRole(userId, next);
          if (res.ok) {
            toast.success(ta("roleUpdated"));
            router.refresh();
          } else {
            toast.error(errorText(res.error));
            e.target.value = role;
          }
        });
      }}
    >
      {USER_ROLES.map((r) => (
        <option key={r} value={r}>
          {t(r)}
        </option>
      ))}
    </Select>
  );
}

/** Grant / change / remove back-office access (super admins only). */
export function AdminRoleSelect({ userId, role }: { userId: string; role: AdminRole | null }) {
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label="Admin access"
      defaultValue={role ?? ""}
      disabled={pending}
      className="h-9 w-40"
      onChange={(e) => {
        const next = (e.target.value || null) as AdminRole | null;
        if (!confirm(next ? `Give this user ${ADMIN_ROLE_LABELS[next]} access?` : "Remove this user's admin access?")) {
          e.target.value = role ?? "";
          return;
        }
        start(async () => {
          const res = await setAdminRole(userId, next);
          if (res.ok) {
            toast.success("Admin access updated");
            router.refresh();
          } else {
            toast.error(errorText(res.error));
            e.target.value = role ?? "";
          }
        });
      }}
    >
      <option value="">No admin access</option>
      {ADMIN_ROLES.map((r) => (
        <option key={r} value={r}>
          {ADMIN_ROLE_LABELS[r]}
        </option>
      ))}
    </Select>
  );
}

export function QuotaEditor({ id, ratio, allowRollover }: { id: string; ratio: number; allowRollover: boolean }) {
  const t = useTranslations("admin");
  const tf = useTranslations("partner.fields");
  const errorText = useErrorText();
  const router = useRouter();
  const [value, setValue] = useState(String(Math.round(ratio * 100)));
  const [rollover, setRollover] = useState(allowRollover);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        {t("quotaRatio")}
        <Input type="number" min={0} max={100} value={value} onChange={(e) => setValue(e.target.value)} className="h-8 w-16 px-2" />%
      </label>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <Checkbox checked={rollover} onChange={(e) => setRollover(e.target.checked)} />
        {tf("allowRollover")}
      </label>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await updateQuota({ id, female_ratio: Number(value) / 100, allow_rollover: rollover });
            if (res.ok) {
              toast.success(t("updateRatio"));
              router.refresh();
            } else toast.error(errorText(res.error));
          })
        }
      >
        {t("updateRatio")}
      </Button>
    </div>
  );
}

/** Calls a CSV-returning Server Action and downloads the result. */
export function CsvButton({ action, filename, children }: { action: () => Promise<{ ok: boolean; data?: string; error?: string }>; filename: string; children: ReactNode }) {
  const errorText = useErrorText();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await action();
          if (!res.ok || res.data == null) return void toast.error(errorText(res.error));
          const blob = new Blob(["﻿" + res.data], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Download />}
      {children}
    </Button>
  );
}
