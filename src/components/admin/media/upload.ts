"use client";

import { uploadMedia } from "@/app/actions/media";
import { checkUpload, type MediaFolder, type MediaItem, type MediaKind } from "@/lib/cms/media";
import { adminErrorText } from "@/components/admin/ui/feedback";

async function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bmp = await createImageBitmap(file);
    const size = { width: bmp.width, height: bmp.height };
    bmp.close();
    return size;
  } catch {
    return null;
  }
}

/** Validate on the device, then upload through the Server Action (which validates again). */
export async function uploadOne(file: File, folder: MediaFolder, want?: MediaKind): Promise<{ ok: true; item: MediaItem } | { ok: false; error: string }> {
  const problem = checkUpload(file, want);
  if (problem) return { ok: false, error: problem };
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const size = await imageSize(file);
  if (size) {
    fd.append("width", String(size.width));
    fd.append("height", String(size.height));
  }
  try {
    const res = await uploadMedia(fd);
    return res.ok && res.data ? { ok: true, item: res.data } : { ok: false, error: adminErrorText(res.ok ? undefined : res.error) };
  } catch {
    return { ok: false, error: "Upload failed — check your connection and the file size." };
  }
}
