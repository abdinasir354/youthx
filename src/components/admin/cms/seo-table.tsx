"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { savePageSeo } from "@/app/actions/cms";
import { pagePublicPath } from "@/lib/cms/pages";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { adminErrorText } from "@/components/admin/ui/feedback";

type SeoPage = { id: string; slug: string; title: string; status: string; seo_title: string | null; seo_description: string | null; og_image_url: string | null };

/** Edit page titles and descriptions for search engines, with length guidance. */
export function SeoTable({ pages }: { pages: SeoPage[] }) {
  return (
    <ul className="space-y-3">
      {pages.map((p) => (
        <SeoRow key={p.id} page={p} />
      ))}
    </ul>
  );
}

function SeoRow({ page }: { page: SeoPage }) {
  const [title, setTitle] = useState(page.seo_title ?? "");
  const [description, setDescription] = useState(page.seo_description ?? "");
  const [pending, start] = useTransition();
  const dirty = title !== (page.seo_title ?? "") || description !== (page.seo_description ?? "");
  const complete = Boolean(description.trim().length >= 50);
  return (
    <li className="rounded-lg border border-border bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        {complete ? <CheckCircle2 className="size-4 text-secondary" aria-label="Description set" /> : <AlertCircle className="size-4 text-warning" aria-label="Needs a description" />}
        <h3 className="font-semibold text-secondary">{page.title}</h3>
        <span className="font-mono text-xs text-muted-foreground">{pagePublicPath(page.slug)}</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <Label htmlFor={`t-${page.id}`}>SEO title <Counter n={title.length} max={70} /></Label>
          <Input id={`t-${page.id}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={70} placeholder={page.title} className="h-10" />
        </div>
        <div>
          <Label htmlFor={`d-${page.id}`}>Description <Counter n={description.length} max={170} /></Label>
          <Textarea id={`d-${page.id}`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={170} rows={2} className="min-h-0" />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          variant="secondary"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              const res = await savePageSeo(page.id, { seo_title: title, seo_description: description, og_image_url: page.og_image_url ?? "" });
              if (!res.ok) return void toast.error(adminErrorText(res.error));
              toast.success("SEO saved");
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
        </Button>
      </div>
    </li>
  );
}

function Counter({ n, max }: { n: number; max: number }) {
  return <span className={`ml-1 text-xs font-normal ${n > max * 0.9 ? "text-warning" : "text-muted-foreground"}`}>{n}/{max}</span>;
}
