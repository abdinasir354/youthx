"use client";

import { createClient } from "@/lib/supabase/client";
import { FILE_LIMITS } from "@/lib/validations";

export type UploadError = "pdfOnly" | "imageOnly" | "fileTooBig" | "upload";

/** Shrink an image on the device before upload — saves our users' mobile data. */
export async function compressImage(file: File, maxSize = 512, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("compress"))), "image/webp", quality),
  );
}

export function checkFile(file: File, kind: "cv" | "image"): UploadError | null {
  const limits = FILE_LIMITS[kind];
  if (!(limits.types as readonly string[]).includes(file.type)) return kind === "cv" ? "pdfOnly" : "imageOnly";
  if (file.size > limits.maxMb * 1024 * 1024) return "fileTooBig";
  return null;
}

/** Upload to "<userId>/<name>" in a bucket. Returns the storage path. */
export async function uploadToBucket(bucket: "avatars" | "cvs" | "org-logos" | "media", userId: string, body: Blob, ext: string) {
  const supabase = createClient();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    upsert: false,
    contentType: body.type || undefined,
    cacheControl: "31536000",
  });
  if (error) throw new Error(error.message);
  return path;
}
