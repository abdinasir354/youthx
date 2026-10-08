"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { addReview } from "@/app/actions/partner";
import { AppStatusBadge } from "@/components/dashboard/status-badge";
import { ReviewActions } from "./review-actions";
import { CvLink } from "@/components/forms/cv-link";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useErrorText } from "@/components/forms/use-action-form";
import { cn, formatDate } from "@/lib/utils";
import type { ApplicantRow } from "@/lib/data/applicants"; // type-only: erased at build
import type { OpportunityQuestion } from "@/types/database.types";

export function ApplicantList({ applicants, questions }: { applicants: ApplicantRow[]; questions: OpportunityQuestion[] }) {
  return (
    <ul className="space-y-3">
      {applicants.map((a) => (
        <ApplicantItem key={a.id} a={a} questions={questions} />
      ))}
    </ul>
  );
}

function ApplicantItem({ a, questions }: { a: ApplicantRow; questions: OpportunityQuestion[] }) {
  const t = useTranslations("partner");
  const tg = useTranslations("gender");
  const te = useTranslations("education");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const p = a.applicant;

  return (
    <li className="rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <button type="button" onClick={() => setOpen(!open)} className="flex flex-1 items-center gap-3 text-left" aria-expanded={open}>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          <div className="min-w-0">
            <p className="font-semibold text-secondary">{p?.full_name || p?.email || "—"}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{tg(a.gender_snapshot)}</span>
              {a.age != null && <span>· {t("age")} {a.age}</span>}
              {p?.region && (
                <span className="flex items-center gap-0.5">
                  · <MapPin className="size-3" />
                  {p.region}
                </span>
              )}
              <span>· {formatDate(a.submitted_at, locale)}</span>
            </p>
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <AppStatusBadge status={a.status} />
          <ReviewActions id={a.id} status={a.status} />
        </div>
      </div>

      {open && (
        <div className="grid gap-5 border-t border-border p-4 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <h3 className="font-bold text-secondary">{t("applicantDetails")}</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {p?.email && (<><dt className="text-muted-foreground">Email</dt><dd>{p.email}</dd></>)}
              {p?.phone && (<><dt className="text-muted-foreground">☎</dt><dd>{p.phone}</dd></>)}
              {p?.education_level && (<><dt className="text-muted-foreground">🎓</dt><dd>{te(p.education_level)}</dd></>)}
              {p?.district && (<><dt className="text-muted-foreground">📍</dt><dd>{p.district}</dd></>)}
            </dl>
            {!!p?.skills?.length && (
              <div className="flex flex-wrap gap-1">
                {p.skills.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>
            )}
            {a.cv_path && <CvLink path={a.cv_path} label={t("viewCv")} />}
            {a.motivation && (
              <div>
                <h4 className="font-semibold text-secondary">{t("motivation")}</h4>
                <p className="whitespace-pre-line text-foreground/80">{a.motivation}</p>
              </div>
            )}
            {questions.length > 0 && (
              <div>
                <h4 className="font-semibold text-secondary">{t("answers")}</h4>
                <dl className="space-y-2">
                  {questions.map((q) => (
                    <div key={q.id}>
                      <dt className="text-muted-foreground">{q.label}</dt>
                      <dd className="whitespace-pre-line">{a.answers?.[q.id] || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
          <ReviewNotes applicationId={a.id} reviews={a.reviews} />
        </div>
      )}
    </li>
  );
}

function ReviewNotes({ applicationId, reviews }: { applicationId: string; reviews: ApplicantRow["reviews"] }) {
  const t = useTranslations("partner");
  const locale = useLocale();
  const errorText = useErrorText();
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [score, setScore] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3 rounded-xl bg-muted p-4 text-sm">
      <h3 className="font-bold text-secondary">{t("notes")}</h3>
      {reviews.length > 0 && (
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg bg-white p-2">
              {r.score != null && <Badge className="mr-2">{r.score}/10</Badge>}
              {r.notes}
              <span className="block text-xs text-muted-foreground">{formatDate(r.created_at, locale)}</span>
            </li>
          ))}
        </ul>
      )}
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} className="min-h-0" aria-label={t("notes")} />
      <div className="flex items-center gap-2">
        <Input type="number" min={1} max={10} value={score} onChange={(e) => setScore(e.target.value)} placeholder={t("score")} aria-label={t("score")} className="h-9 w-32" />
        <Button
          size="sm"
          variant="secondary"
          disabled={pending || (!notes.trim() && !score)}
          onClick={() =>
            start(async () => {
              const res = await addReview({ application_id: applicationId, notes, score });
              if (res.ok) {
                setNotes("");
                setScore("");
                router.refresh();
              } else toast.error(errorText(res.error));
            })
          }
        >
          {t("addNote")}
        </Button>
      </div>
    </div>
  );
}
