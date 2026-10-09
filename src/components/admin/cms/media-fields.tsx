"use client";

import { useState } from "react";
import Image from "next/image";
import { FileText, FolderOpen, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DOCUMENT_ACCEPT, IMAGE_ACCEPT, type MediaFolder, type MediaItem } from "@/lib/cms/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/admin/ui/feedback";
import { SortableList } from "@/components/admin/ui/sortable";
import { DropZone, pickFiles } from "@/components/admin/media/drop-zone";
import { MediaLibrary } from "@/components/admin/media/media-library";
import { uploadOne } from "@/components/admin/media/upload";

function fileNameFromUrl(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? url);
  } catch {
    return url;
  }
}

function MediaPicker({ open, onClose, kind, folder, multiple, onPick }: { open: boolean; onClose: () => void; kind: "image" | "document"; folder: MediaFolder; multiple?: boolean; onPick: (items: MediaItem[]) => void }) {
  return (
    <Modal open={open} onClose={onClose} title={kind === "image" ? "Choose an image" : "Choose a file"} wide>
      <MediaLibrary
        mode="pick"
        kind={kind}
        folder={folder}
        multiple={multiple}
        onPick={(items) => {
          onPick(items);
          onClose();
        }}
      />
    </Modal>
  );
}

/** Single image: drop a file onto it, upload, pick from the library, or remove. */
export function ImageField({ id, value, onChange, folder, invalid }: { id: string; value: string; onChange: (v: string) => void; folder: MediaFolder; invalid?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);

  async function upload(files: File[]) {
    setBusy(true);
    const res = await uploadOne(files[0], folder, "image");
    setBusy(false);
    if (!res.ok) return void toast.error(res.error);
    onChange(res.item.url);
    toast.success("Image uploaded");
  }

  return (
    <div id={id} aria-invalid={invalid}>
      <DropZone onFiles={upload} accept={IMAGE_ACCEPT} multiple={false} disabled={busy} className={invalid ? "border-danger" : undefined}>
        {value ? (
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted sm:w-48">
              <Image src={value} alt="" fill sizes="200px" className="object-cover" />
              {busy && <Spinner />}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="truncate text-xs text-muted-foreground">{fileNameFromUrl(value)}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => pickFiles(IMAGE_ACCEPT, false, upload)}>
                  <Upload /> Replace
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setPicker(true)}>
                  <FolderOpen /> Library
                </Button>
                <Button type="button" size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" disabled={busy} onClick={() => onChange("")}>
                  <Trash2 /> Remove
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Tip: drop a new image here to replace it.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
            {busy ? <Loader2 className="size-6 animate-spin text-secondary" aria-hidden /> : <ImagePlus className="size-7 text-secondary/60" aria-hidden />}
            <p className="text-sm font-semibold text-secondary">{busy ? "Uploading…" : "Drag & drop an image"}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => pickFiles(IMAGE_ACCEPT, false, upload)}>
                <Upload /> Upload
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setPicker(true)}>
                <FolderOpen /> Choose from library
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP or AVIF · up to 10 MB</p>
          </div>
        )}
      </DropZone>
      <MediaPicker open={picker} onClose={() => setPicker(false)} kind="image" folder={folder} onPick={(items) => items[0] && onChange(items[0].url)} />
    </div>
  );
}

/** Image gallery: drag thumbnails to reorder, drop many files to add. */
export function GalleryField({ id, value, onChange, folder, max = 40 }: { id: string; value: string[]; onChange: (v: string[]) => void; folder: MediaFolder; max?: number }) {
  const [busy, setBusy] = useState(0);
  const [picker, setPicker] = useState(false);

  async function upload(files: File[]) {
    const room = Math.max(0, max - value.length);
    if (files.length > room) toast.error(`Only ${room} more image(s) can be added.`);
    let next = [...value];
    for (const file of files.slice(0, room)) {
      setBusy((b) => b + 1);
      const res = await uploadOne(file, folder, "image");
      setBusy((b) => b - 1);
      if (!res.ok) toast.error(`${file.name}: ${res.error}`);
      else {
        next = [...next, res.item.url];
        onChange(next);
      }
    }
  }

  return (
    <div id={id} className="space-y-3">
      {value.length > 0 && (
        <SortableList
          items={value}
          getId={(u) => u}
          onReorder={onChange}
          layout="grid"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          renderItem={(url, handle, i) => (
            <div className="overflow-hidden rounded-md border border-border bg-white">
              <div className="relative aspect-video bg-muted">
                <Image src={url} alt={`Gallery image ${i + 1}`} fill sizes="200px" className="object-cover" />
              </div>
              <div className="flex items-center justify-between px-1 py-1">
                {handle}
                <span className="text-xs text-muted-foreground">{i + 1}</span>
                <button type="button" onClick={() => onChange(value.filter((v) => v !== url))} className="rounded p-1.5 text-danger hover:bg-danger-soft" aria-label={`Remove image ${i + 1}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          )}
        />
      )}
      <DropZone onFiles={upload} accept={IMAGE_ACCEPT} compact label={busy ? `Uploading ${busy}…` : "Drag & drop images to add"} hint={`${value.length}/${max} images · drag thumbnails to reorder`} disabled={value.length >= max} />
      <Button type="button" size="sm" variant="outline" onClick={() => setPicker(true)} disabled={value.length >= max}>
        <FolderOpen /> Add from library
      </Button>
      <MediaPicker open={picker} onClose={() => setPicker(false)} kind="image" folder={folder} multiple onPick={(items) => onChange([...value, ...items.map((i) => i.url).filter((u) => !value.includes(u))].slice(0, max))} />
    </div>
  );
}

/** One downloadable document. */
export function FileField({ id, value, onChange, folder }: { id: string; value: string; onChange: (v: string) => void; folder: MediaFolder }) {
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  async function upload(files: File[]) {
    setBusy(true);
    const res = await uploadOne(files[0], folder);
    setBusy(false);
    if (!res.ok) return void toast.error(res.error);
    onChange(res.item.url);
    toast.success("File uploaded");
  }
  return (
    <div id={id}>
      <DropZone onFiles={upload} accept={`${DOCUMENT_ACCEPT},${IMAGE_ACCEPT}`} multiple={false} disabled={busy}>
        <div className="flex flex-wrap items-center gap-3 p-3">
          <FileText className="size-6 shrink-0 text-secondary/60" aria-hidden />
          <div className="min-w-0 flex-1">
            {value ? (
              <a href={value} target="_blank" rel="noopener" className="block truncate text-sm font-medium text-secondary underline-offset-2 hover:underline">
                {fileNameFromUrl(value)}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">{busy ? "Uploading…" : "Drag & drop a PDF or Office file, or upload one."}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => pickFiles(`${DOCUMENT_ACCEPT},${IMAGE_ACCEPT}`, false, upload)}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload />} {value ? "Replace" : "Upload"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setPicker(true)}>
              <FolderOpen /> Library
            </Button>
            {value && (
              <Button type="button" size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => onChange("")} aria-label="Remove file">
                <Trash2 />
              </Button>
            )}
          </div>
        </div>
      </DropZone>
      <MediaPicker open={picker} onClose={() => setPicker(false)} kind="document" folder={folder} onPick={(items) => items[0] && onChange(items[0].url)} />
    </div>
  );
}

type Doc = { name: string; url: string };

/** Several named documents, drag to reorder. */
export function DocumentsField({ id, value, onChange, folder }: { id: string; value: Doc[]; onChange: (v: Doc[]) => void; folder: MediaFolder }) {
  const [busy, setBusy] = useState(0);
  const [picker, setPicker] = useState(false);
  async function upload(files: File[]) {
    let next = [...value];
    for (const file of files) {
      setBusy((b) => b + 1);
      const res = await uploadOne(file, folder, "document");
      setBusy((b) => b - 1);
      if (!res.ok) toast.error(`${file.name}: ${res.error}`);
      else {
        next = [...next, { name: file.name.replace(/\.[^.]+$/, ""), url: res.item.url }];
        onChange(next);
      }
    }
  }
  return (
    <div id={id} className="space-y-3">
      {value.length > 0 && (
        <SortableList
          items={value}
          getId={(d) => d.url}
          onReorder={onChange}
          className="space-y-2"
          renderItem={(doc, handle, i) => (
            <div className="flex items-center gap-2 rounded-md border border-border bg-white p-2">
              {handle}
              <FileText className="size-4 shrink-0 text-secondary/60" aria-hidden />
              <Input
                value={doc.name}
                onChange={(e) => onChange(value.map((d, j) => (j === i ? { ...d, name: e.target.value } : d)))}
                className="h-9"
                aria-label={`Document ${i + 1} name`}
              />
              <a href={doc.url} target="_blank" rel="noopener" className="shrink-0 text-xs text-secondary underline">
                Open
              </a>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded p-1.5 text-danger hover:bg-danger-soft" aria-label={`Remove document ${i + 1}`}>
                <Trash2 className="size-4" />
              </button>
            </div>
          )}
        />
      )}
      <DropZone onFiles={upload} accept={DOCUMENT_ACCEPT} compact label={busy ? `Uploading ${busy}…` : "Drag & drop documents to add"} hint="PDF, DOCX, XLSX, PPTX · up to 20 MB" />
      <Button type="button" size="sm" variant="outline" onClick={() => setPicker(true)}>
        <FolderOpen /> Add from library
      </Button>
      <MediaPicker open={picker} onClose={() => setPicker(false)} kind="document" folder={folder} multiple onPick={(items) => onChange([...value, ...items.map((i) => ({ name: i.filename.replace(/\.[^.]+$/, ""), url: i.url }))])} />
    </div>
  );
}

function Spinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
      <Loader2 className="size-6 animate-spin text-secondary" aria-hidden />
    </div>
  );
}
