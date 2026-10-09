"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createPage } from "@/app/actions/cms";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal, adminErrorText } from "@/components/admin/ui/feedback";

export function NewPageButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus /> New page
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New page">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await createPage({ title, slug });
              if (!res.ok) {
                setErrors(res.fieldErrors ?? {});
                return void toast.error(adminErrorText(res.error));
              }
              toast.success("Page created as a draft");
              router.push(`/admin/pages/${res.data}`);
            });
          }}
        >
          <div>
            <Label htmlFor="np-title">Title</Label>
            <Input
              id="np-title"
              value={title}
              autoFocus
              onChange={(e) => {
                setTitle(e.target.value);
                if (!touched) setSlug(slugify(e.target.value));
              }}
              required
              maxLength={160}
            />
            {errors.title && <p className="mt-1 text-xs text-danger">{errors.title}</p>}
          </div>
          <div>
            <Label htmlFor="np-slug">Address</Label>
            <div className="flex items-center rounded-xl border border-border bg-muted/40 pl-3 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-primary/60">
              <span>/</span>
              <input
                id="np-slug"
                value={slug}
                onChange={(e) => {
                  setTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
                className="h-11 flex-1 bg-transparent px-1 font-mono text-foreground focus:outline-none"
                required
              />
            </div>
            {errors.slug && <p className="mt-1 text-xs text-danger">{errors.slug}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="secondary" disabled={pending || !title || !slug}>
              {pending && <Loader2 className="animate-spin" />} Create page
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
