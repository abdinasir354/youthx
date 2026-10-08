"use client";

import { useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { checkFile, compressImage, uploadToBucket } from "@/lib/upload";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Validates type/size, compresses images, uploads to "<uid>/…" and reports the storage path. */
export function FileUpload({
  kind,
  bucket,
  userId,
  label,
  onUploaded,
  maxImageSize = 512,
}: {
  kind: "cv" | "image";
  bucket: "avatars" | "cvs" | "org-logos" | "media";
  userId: string;
  label: string;
  onUploaded: (path: string) => void | Promise<void>;
  maxImageSize?: number;
}) {
  const t = useTranslations("validation");
  const common = useTranslations("common");
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    const problem = checkFile(file, kind);
    if (problem) {
      toast.error(t(problem, { max: kind === "cv" ? 5 : 2 }));
      return;
    }
    setBusy(true);
    try {
      const body = kind === "image" ? await compressImage(file, maxImageSize) : file;
      const path = await uploadToBucket(bucket, userId, body, kind === "image" ? "webp" : "pdf");
      setFileName(file.name);
      await onUploaded(path);
    } catch (e) {
      console.error(e);
      toast.error(common("error"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-secondary">{label}</p>
      <label htmlFor={id} className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
        {busy ? <Loader2 className="animate-spin" /> : kind === "cv" ? <FileText /> : <Upload />}
        {busy ? common("loading") : fileName ?? label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        accept={kind === "cv" ? "application/pdf" : "image/jpeg,image/png,image/webp"}
        disabled={busy}
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </div>
  );
}
