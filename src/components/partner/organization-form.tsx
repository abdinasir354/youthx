"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { saveOrganization } from "@/app/actions/partner";
import { organizationSchema } from "@/lib/validations";
import { SelectField, SubmitButton, TextAreaField, TextField } from "@/components/forms/fields";
import { FileUpload } from "@/components/forms/file-upload";
import { useActionForm } from "@/components/forms/use-action-form";
import type { Organization } from "@/types/database.types";

type Values = { name: string; type: string; website: string; description: string; logo_url?: string };

export function OrganizationForm({ org, userId }: { org: Organization | null; userId: string }) {
  const t = useTranslations("partner");
  const common = useTranslations("common");
  const router = useRouter();
  const [logo, setLogo] = useState(org?.logo_url ?? null);
  const { form, onSubmit, pending } = useActionForm<Values>({
    schema: organizationSchema,
    defaultValues: { name: org?.name ?? "", type: org?.type ?? "ngo", website: org?.website ?? "", description: org?.description ?? "", logo_url: org?.logo_url ?? undefined },
    action: saveOrganization,
    successMessage: t("orgSaved"),
    onSuccess: () => router.refresh(),
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-border bg-white p-6 shadow-sm sm:grid-cols-2" noValidate>
      <TextField form={form} name="name" label={t("orgName")} className="sm:col-span-2" />
      <SelectField
        form={form}
        name="type"
        label={t("orgType")}
        options={(["ngo", "company", "university", "government", "other"] as const).map((v) => ({ value: v, label: t(`orgTypes.${v}`) }))}
      />
      <TextField form={form} name="website" label={t("website")} type="url" placeholder="https://" optional />
      <TextAreaField form={form} name="description" label={t("description")} rows={5} optional className="sm:col-span-2" />
      <div className="flex items-center gap-4 sm:col-span-2">
        <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-xl bg-secondary-soft">
          {logo ? <Image src={logo} alt="" fill sizes="64px" className="object-contain" unoptimized /> : <Building2 className="size-7 text-secondary" />}
        </div>
        <FileUpload
          kind="image"
          bucket="org-logos"
          userId={userId}
          label={t("logo")}
          maxImageSize={400}
          onUploaded={(path) => {
            const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/org-logos/${path}`;
            setLogo(url);
            form.setValue("logo_url", url);
          }}
        />
      </div>
      <SubmitButton pending={pending} className="sm:col-span-2 sm:justify-self-start">
        {common("save")}
      </SubmitButton>
    </form>
  );
}
