"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore, Loader2, MailCheck, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { setMessageRead } from "@/app/actions/admin";
import { setMessageArchived } from "@/app/actions/inbox";
import { Button } from "@/components/ui/button";
import { adminErrorText } from "@/components/admin/ui/feedback";

export function MessageActions({ id, isRead, archived }: { id: string; isRead: boolean; archived: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(adminErrorText(res.error));
      toast.success(msg);
      router.refresh();
    });
  return (
    <div className="flex gap-1">
      {pending && <Loader2 className="size-4 animate-spin self-center text-muted-foreground" />}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setMessageRead(id, !isRead), isRead ? "Marked unread" : "Marked read")}>
        {isRead ? <MailOpen /> : <MailCheck />} {isRead ? "Mark unread" : "Mark read"}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setMessageArchived(id, !archived), archived ? "Moved to inbox" : "Archived")}>
        {archived ? <ArchiveRestore /> : <Archive />} {archived ? "Restore" : "Archive"}
      </Button>
    </div>
  );
}
