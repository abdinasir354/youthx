"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { saveSettings } from "@/app/actions/cms";
import type { FieldDef } from "@/lib/cms/fields";
import { SOCIAL_LABELS, SOCIAL_NETWORKS, type SiteSettings } from "@/lib/cms/settings";
import { Button } from "@/components/ui/button";
import { adminErrorText } from "@/components/admin/ui/feedback";
import { FieldGrid } from "./field-renderer";

const GROUPS: { title: string; description?: string; fields: FieldDef[] }[] = [
  {
    title: "Organization",
    fields: [
      { kind: "text", name: "site_name", label: "Organization name", required: true, max: 120 },
      { kind: "text", name: "tagline", label: "Tagline", max: 200 },
      { kind: "textarea", name: "description", label: "Short description", max: 600, rows: 3, help: "Used in the footer and as the default description for search engines." },
    ],
  },
  {
    title: "Contact details",
    description: "Shown on the Contact page and in the footer. Leave empty anything that isn't official yet.",
    fields: [
      { kind: "email", name: "contact_email", label: "Email", half: true },
      { kind: "text", name: "contact_phone", label: "Phone", max: 30, half: true, placeholder: "+252 …" },
      { kind: "textarea", name: "address", label: "Address / location", max: 300, rows: 2 },
    ],
  },
  {
    title: "Social media",
    description: "Full links to your official accounts. Empty ones are hidden.",
    fields: SOCIAL_NETWORKS.map((n) => ({ kind: "url", name: `social_${n}`, label: SOCIAL_LABELS[n], half: true }) as FieldDef),
  },
  {
    title: "Header & footer",
    fields: [
      { kind: "text", name: "header_cta_label", label: "Header button text", required: true, max: 40, half: true },
      { kind: "url", name: "header_cta_href", label: "Header button link", allowRelative: true, required: true, half: true },
      { kind: "text", name: "footer_text", label: "Footer tagline", max: 300 },
      { kind: "boolean", name: "newsletter_enabled", label: "Show the newsletter sign-up in the footer" },
    ],
  },
  {
    title: "Default SEO",
    description: "Used for pages that don't set their own.",
    fields: [
      { kind: "text", name: "seo_title", label: "Default title", max: 70 },
      { kind: "textarea", name: "seo_description", label: "Default description", max: 170, rows: 3 },
      { kind: "image", name: "og_image_url", label: "Default sharing image", folder: "images", help: "1200×630 pixels works best on WhatsApp, Facebook and X." },
    ],
  },
];

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(settings)) if (k !== "social" && k !== "updated_at") v[k] = x ?? (typeof x === "boolean" ? false : "");
    for (const n of SOCIAL_NETWORKS) v[`social_${n}`] = settings.social?.[n] ?? "";
    return v;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  function submit() {
    const payload: Record<string, unknown> = { social: {} };
    for (const [k, v] of Object.entries(values)) {
      if (k.startsWith("social_")) (payload.social as Record<string, unknown>)[k.slice(7)] = v;
      else payload[k] = v;
    }
    start(async () => {
      const res = await saveSettings(payload);
      if (!res.ok) {
        // Map nested social errors back to the flat field names.
        const fe = Object.fromEntries(Object.entries(res.fieldErrors ?? {}).map(([k, m]) => [k.replace(/^social\./, "social_"), m]));
        setErrors(fe);
        return void toast.error(adminErrorText(res.error));
      }
      setErrors({});
      toast.success("Settings saved — the website is updated");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 pb-20">
      {GROUPS.map((g) => (
        <section key={g.title} className="rounded-lg border border-border bg-white">
          <header className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-bold text-secondary">{g.title}</h2>
            {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
          </header>
          <div className="p-5">
            <FieldGrid fields={g.fields} ctx={{ values, errors, relations: {} }} onChange={(n, v) => setValues((x) => ({ ...x, [n]: v }))} />
          </div>
        </section>
      ))}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white lg:left-64">
        <div className="mx-auto flex max-w-7xl justify-end px-4 py-3 sm:px-6">
          <Button variant="secondary" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />} Save settings
          </Button>
        </div>
      </div>
    </div>
  );
}
