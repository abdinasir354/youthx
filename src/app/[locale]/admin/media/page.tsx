import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { MediaLibrary } from "@/components/admin/media/media-library";

export const metadata: Metadata = { title: "Media" };

export default async function AdminMediaPage() {
  const me = await requireAdmin("media");
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">Media library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag images and documents anywhere in the box below. Click a file to add a description (alt text), copy its link, or delete it.
        </p>
      </div>
      <MediaLibrary mode="manage" canDelete={can(me.adminRole, "media_delete")} />
    </div>
  );
}
