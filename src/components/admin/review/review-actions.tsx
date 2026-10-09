"use client";

import { useState, useTransition } from "react";
import { Archive, Check, Download, Eye, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { reviewCvUrl, saveReviewNotes, setReviewStatus } from "@/app/actions/inbox";
import type { ReviewKind } from "@/lib/cms/reviews";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { adminErrorText, useConfirm } from "@/components/admin/ui/feedback";

export function ReviewActions({ kind, id, status, notes: initialNotes, hasCv, hasAccount }: { kind: ReviewKind; id: string; status: string; notes: string; hasCv: boolean; hasAccount: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState<string | null>(null);
  const [savingNotes, startNotes] = useTransition();

  async function change(next: string, label: string) {
    if (next === "approved" && kind === "mentor") {
      const ok = await confirm({
        title: "Approve this mentor?",
        body: hasAccount ? "Their Youthup account becomes an approved mentor and youth can send them mentorship requests." : "They don't have a Youthup account yet. Ask them to sign up with the same email; you can then approve them under Users.",
        confirmLabel: "Approve",
      });
      if (!ok) return;
    }
    setBusy(next);
    const res = await setReviewStatus(kind, id, next);
    setBusy(null);
    if (!res.ok) return void toast.error(adminErrorText(res.error));
    toast.success(label);
    router.refresh();
  }

  async function downloadCv() {
    setBusy("cv");
    const res = await reviewCvUrl(kind, id);
    setBusy(null);
    if (!res.ok || !res.data) return void toast.error(adminErrorText(res.ok ? undefined : res.error));
    window.open(res.data, "_blank", "noopener");
  }

  const btn = (next: string, label: string, done: string, icon: React.ReactNode, variant: "secondary" | "outline" | "danger" = "outline") => (
    <Button key={next} variant={variant} size="sm" className="w-full justify-start" disabled={status === next || busy !== null} onClick={() => void change(next, done)}>
      {busy === next ? <Loader2 className="animate-spin" /> : icon} {label}
    </Button>
  );

  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <section className="space-y-2 rounded-lg border border-border bg-white p-4">
        <h2 className="mb-1 text-sm font-bold text-secondary">Decision</h2>
        {btn("under_review", "Mark under review", "Marked under review", <Eye />)}
        {btn("approved", kind === "mentor" ? "Approve mentor" : "Approve", "Approved", <Check />, "secondary")}
        {btn("rejected", "Reject", "Rejected", <X />)}
        {btn("archived", "Archive", "Archived", <Archive />)}
        <p className="pt-1 text-xs text-muted-foreground">Applicants are not emailed automatically — use “Email applicant” to contact them.</p>
      </section>
      <section className="rounded-lg border border-border bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-secondary">CV</h2>
        {hasCv ? (
          <Button variant="outline" size="sm" className="w-full" disabled={busy === "cv"} onClick={() => void downloadCv()}>
            {busy === "cv" ? <Loader2 className="animate-spin" /> : <Download />} Download CV (private link)
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">No CV uploaded.</p>
        )}
      </section>
      <section className="rounded-lg border border-border bg-white p-4">
        <Label htmlFor="review-notes">Internal notes</Label>
        <Textarea id="review-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={5000} placeholder="Only visible to staff" />
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          disabled={savingNotes || notes === initialNotes}
          onClick={() =>
            startNotes(async () => {
              const res = await saveReviewNotes(kind, id, notes);
              if (!res.ok) return void toast.error(adminErrorText(res.error));
              toast.success("Notes saved");
              router.refresh();
            })
          }
        >
          {savingNotes ? <Loader2 className="animate-spin" /> : <Save />} Save notes
        </Button>
      </section>
    </aside>
  );
}
