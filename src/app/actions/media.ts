"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionContext, dbError, fail, type ActionResult } from "@/lib/action";
import { ALLOWED_FILES, MEDIA_FOLDERS, extensionOf, type MediaFolder, type MediaItem } from "@/lib/cms/media";

const MEDIA_COLUMNS = "id, url, path, filename, folder, mime_type, size_bytes, alt_text, width, height, created_at";
const PAGE_SIZE = 48;

/** The first bytes of each allowed type. A renamed executable won't match. */
function signatureMatches(ext: string, b: Uint8Array) {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  switch (ext) {
    case "jpg":
    case "jpeg":
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "png":
      return b[0] === 0x89 && ascii(1, 4) === "PNG";
    case "webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "avif":
      return ascii(4, 8) === "ftyp" && /avi[fs]/.test(ascii(8, 12));
    case "pdf":
      return ascii(0, 5) === "%PDF-";
    case "docx":
    case "xlsx":
    case "pptx":
      return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04; // zip container
    default:
      return false;
  }
}

function cleanFilename(name: string) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").slice(0, 200) || "file";
}

/**
 * Upload one file to the media library. FormData: file, folder, alt?, width?, height?
 * Validated on the server: extension allow-list, MIME type, size, and file signature.
 */
export async function uploadMedia(formData: FormData): Promise<ActionResult<MediaItem>> {
  const ctx = await actionContext({ perm: "media" });
  if ("error" in ctx) return ctx.error!;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("No file received.");
  const folder = String(formData.get("folder") ?? "images") as MediaFolder;
  if (!MEDIA_FOLDERS.includes(folder)) return fail("Unknown folder.");

  const ext = extensionOf(file.name);
  const rule = ALLOWED_FILES[ext];
  if (!rule) return fail("This file type isn't allowed.");
  if (file.type && file.type !== rule.mime) return fail("The file type doesn't match its extension.");
  if (file.size > rule.maxMb * 1024 * 1024) return fail(`This file is too large (max ${rule.maxMb} MB).`);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(ext, bytes)) return fail("This file appears to be damaged or isn't really a " + ext.toUpperCase() + " file.");

  const alt = String(formData.get("alt") ?? "").trim().slice(0, 300) || null;
  const dim = (k: string) => {
    const n = Number(formData.get(k));
    return Number.isInteger(n) && n > 0 && n < 100000 ? n : null;
  };

  const now = new Date();
  const path = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`;
  const { error: upError } = await ctx.supabase.storage.from("media").upload(path, bytes, {
    contentType: rule.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upError) {
    console.error("[media upload]", upError.message);
    return fail(upError.message.includes("row-level security") ? "errors.forbidden" : "Upload failed. Please try again.");
  }
  const url = ctx.supabase.storage.from("media").getPublicUrl(path).data.publicUrl;

  const { data, error } = await ctx.supabase
    .from("media")
    .insert({
      bucket: "media",
      path,
      url,
      filename: cleanFilename(file.name),
      folder,
      mime_type: rule.mime,
      size_bytes: file.size,
      alt_text: alt,
      width: rule.kind === "image" ? dim("width") : null,
      height: rule.kind === "image" ? dim("height") : null,
      uploaded_by: ctx.userId,
    })
    .select(MEDIA_COLUMNS)
    .single();
  if (error) {
    await ctx.supabase.storage.from("media").remove([path]);
    return dbError(error.message);
  }
  revalidatePath("/[locale]/admin/media", "page");
  return { ok: true, data: data as MediaItem };
}

const listSchema = z.object({
  q: z.string().max(100).optional().default(""),
  folder: z.union([z.literal(""), z.enum(MEDIA_FOLDERS)]).optional().default(""),
  kind: z.enum(["all", "image", "document"]).optional().default("all"),
  page: z.number().int().min(1).max(1000).optional().default(1),
});

export async function listMedia(input: unknown): Promise<ActionResult<{ items: MediaItem[]; total: number; pageSize: number }>> {
  const ctx = await actionContext({ perm: "media" });
  if ("error" in ctx) return ctx.error!;
  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return fail("Invalid request.");
  const { q, folder, kind, page } = parsed.data;
  let query = ctx.supabase.from("media").select(MEDIA_COLUMNS, { count: "exact" }).order("created_at", { ascending: false });
  if (folder) query = query.eq("folder", folder);
  if (kind === "image") query = query.like("mime_type", "image/%");
  if (kind === "document") query = query.not("mime_type", "like", "image/%");
  const term = q.replace(/[%,()*\\]/g, " ").trim();
  if (term) query = query.or(`filename.ilike.%${term}%,alt_text.ilike.%${term}%`);
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) return dbError(error.message);
  return { ok: true, data: { items: (data as MediaItem[]) ?? [], total: count ?? 0, pageSize: PAGE_SIZE } };
}

export async function updateMediaAlt(id: string, alt: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "media" });
  if ("error" in ctx) return ctx.error!;
  if (!z.string().uuid().safeParse(id).success) return fail("Invalid request.");
  const { error } = await ctx.supabase.from("media").update({ alt_text: alt.trim().slice(0, 300) || null }).eq("id", id);
  if (error) return dbError(error.message);
  return { ok: true };
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  const ctx = await actionContext({ perm: "media_delete" });
  if ("error" in ctx) return ctx.error!;
  if (!z.string().uuid().safeParse(id).success) return fail("Invalid request.");
  const { data: item, error: readError } = await ctx.supabase.from("media").select("path").eq("id", id).single();
  if (readError || !item) return fail("File not found.");
  const { error: rmError } = await ctx.supabase.storage.from("media").remove([item.path]);
  if (rmError) return dbError(rmError.message);
  const { error } = await ctx.supabase.from("media").delete().eq("id", id);
  if (error) return dbError(error.message);
  revalidatePath("/[locale]/admin/media", "page");
  return { ok: true };
}
