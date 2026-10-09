/** Media library rules, shared by the upload UI and the server action that enforces them. */

export const MEDIA_FOLDERS = ["images", "documents", "resources", "events", "programs", "projects", "stories"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export type MediaKind = "image" | "document";

/** Allowed types: extension → MIME type. SVG and anything executable are never accepted. */
export const ALLOWED_FILES: Record<string, { mime: string; kind: MediaKind; maxMb: number }> = {
  jpg: { mime: "image/jpeg", kind: "image", maxMb: 10 },
  jpeg: { mime: "image/jpeg", kind: "image", maxMb: 10 },
  png: { mime: "image/png", kind: "image", maxMb: 10 },
  webp: { mime: "image/webp", kind: "image", maxMb: 10 },
  avif: { mime: "image/avif", kind: "image", maxMb: 10 },
  pdf: { mime: "application/pdf", kind: "document", maxMb: 20 },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "document", maxMb: 20 },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "document", maxMb: 20 },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", kind: "document", maxMb: 20 },
};

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";
export const DOCUMENT_ACCEPT = ".pdf,.docx,.xlsx,.pptx";
export const ANY_ACCEPT = `${IMAGE_ACCEPT},${DOCUMENT_ACCEPT}`;

export function extensionOf(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}

/** Client-side pre-check (the server re-checks extension, MIME type, size and file signature). */
export function checkUpload(file: File, want?: MediaKind): string | null {
  const rule = ALLOWED_FILES[extensionOf(file.name)];
  if (!rule) return "This file type isn't allowed. Use JPG, PNG, WebP, AVIF, PDF, DOCX, XLSX or PPTX.";
  if (want && rule.kind !== want) return want === "image" ? "Please choose an image (JPG, PNG, WebP or AVIF)." : "Please choose a document (PDF, DOCX, XLSX or PPTX).";
  if (file.type && file.type !== rule.mime) return "The file type doesn't match its extension.";
  if (file.size > rule.maxMb * 1024 * 1024) return `This file is too large (max ${rule.maxMb} MB).`;
  return null;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export type MediaItem = {
  id: string;
  url: string;
  path: string;
  filename: string;
  folder: MediaFolder;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export const isImageMime = (mime: string) => mime.startsWith("image/");
