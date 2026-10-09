"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { setSubscriberStatus } from "@/app/actions/inbox";
import { Button } from "@/components/ui/button";
import { adminErrorText } from "@/components/admin/ui/feedback";

export function SubscriberToggle({ id, subscribed }: { id: string; subscribed: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setSubscriberStatus(id, subscribed ? "unsubscribed" : "subscribed");
          if (!res.ok) return void toast.error(adminErrorText(res.error));
          toast.success(subscribed ? "Unsubscribed" : "Resubscribed");
          router.refresh();
        })
      }
    >
      {subscribed ? "Unsubscribe" : "Resubscribe"}
    </Button>
  );
}
