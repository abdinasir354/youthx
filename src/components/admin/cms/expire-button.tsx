"use client";

import { useTransition } from "react";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { closeExpiredOpportunities } from "@/app/actions/cms";
import { Button } from "@/components/ui/button";
import { adminErrorText } from "@/components/admin/ui/feedback";

/** Closes published opportunities whose deadline/expiry has passed (also runs daily via cron). */
export function ExpireButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await closeExpiredOpportunities();
          if (!res.ok) return void toast.error(adminErrorText(res.error));
          toast.success(res.data ? `Closed ${res.data} expired listing(s)` : "No expired listings");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <Clock />} Close expired
    </Button>
  );
}
