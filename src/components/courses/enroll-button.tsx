"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { enrollInCourse, setLessonComplete } from "@/app/actions/learning";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/components/forms/use-action-form";

export function EnrollButton({ courseId, firstLessonHref }: { courseId: string; firstLessonHref: string | null }) {
  const t = useTranslations("courses");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await enrollInCourse(courseId);
          if (!res.ok) return void toast.error(errorText(res.error));
          if (firstLessonHref) router.push(firstLessonHref);
          else router.refresh();
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />}
      {t("enroll")}
    </Button>
  );
}

export function CompleteLessonButton({ lessonId, courseId, initialDone, nextHref }: { lessonId: string; courseId: string; initialDone: boolean; nextHref: string | null }) {
  const t = useTranslations("courses");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={initialDone ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await setLessonComplete(lessonId, courseId, !initialDone);
          if (!res.ok) return void toast.error(errorText(res.error));
          if (!initialDone && nextHref) router.push(nextHref);
          else router.refresh();
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />}
      {initialDone ? `✓ ${t("completed")}` : t("markComplete")}
    </Button>
  );
}
