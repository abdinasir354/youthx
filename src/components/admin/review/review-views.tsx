import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth";
import { REVIEWS, REVIEW_STATUSES, type ReviewField, type ReviewKind } from "@/lib/cms/reviews";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ReviewActions } from "./review-actions";
import { SectionTabs } from "@/components/admin/shell/section-tabs";
import { APPLICATION_TABS } from "@/components/admin/shell/nav";

const PAGE_SIZE = 25;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fmtDate = (v: string) => new Date(v).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Mogadishu" });

/** Inbox of applications with status tabs, search and paging. */
export async function ReviewList({ kind, searchParams, intro }: { kind: ReviewKind; searchParams: Record<string, string | undefined>; intro?: React.ReactNode }) {
  await requireAdmin("people");
  const cfg = REVIEWS[kind];
  const status = REVIEW_STATUSES.includes(searchParams.status as (typeof REVIEW_STATUSES)[number]) ? searchParams.status! : "";
  const q = (searchParams.q ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, 80);
  const page = Math.max(1, Number(searchParams.page) || 1);

  const supabase = await createClient();
  let query = supabase.from(cfg.table).select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  else query = query.neq("status", "archived");
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const [{ data, count }, ...counts] = await Promise.all([
    query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    ...REVIEW_STATUSES.map((s) => supabase.from(cfg.table).select("id", { count: "exact", head: true }).eq("status", s)),
  ]);
  const rows = (data ?? []) as Record<string, unknown>[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const qs = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, status, ...p })) if (v) u.set(k, String(v));
    return `${cfg.path}${u.size ? `?${u}` : ""}`;
  };

  return (
    <div>
      <SectionTabs tabs={APPLICATION_TABS} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">{cfg.label}</h1>
        {intro && <div className="mt-1 text-sm text-muted-foreground">{intro}</div>}
      </div>
      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-border" aria-label="Filter by status">
        {["", ...REVIEW_STATUSES].map((s, i) => (
          <Link
            key={s || "open"}
            href={qs({ status: s, page: undefined })}
            aria-current={status === s ? "page" : undefined}
            className={cn("-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium", status === s ? "border-secondary text-secondary" : "border-transparent text-muted-foreground hover:text-secondary")}
          >
            {s ? s.replace("_", " ").replace(/^./, (c) => c.toUpperCase()) : "Open"}
            {s && <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs">{counts[i - 1]?.count ?? 0}</span>}
          </Link>
        ))}
      </nav>
      <form className="mb-4 flex max-w-md gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Search by name or email" className="h-10 pl-9" aria-label="Search applications" />
        </div>
        <button className={buttonVariants({ variant: "outline", className: "h-10" })}>Search</button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
          {q || status ? "No applications match." : "No applications yet. They'll appear here as soon as someone applies."}
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
          {rows.map((r) => (
            <li key={String(r.id)}>
              <Link href={`${cfg.path}/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-secondary">{String(r.full_name)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {String(r.email)}
                    {cfg.listColumns.map((c) => {
                      const v = r[c.name];
                      const text = Array.isArray(v) ? v.join(", ") : v ? String(v) : "";
                      return text ? ` · ${text}` : "";
                    })}
                  </p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:block">{fmtDate(String(r.created_at))}</span>
                <StatusBadge status={String(r.status)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={qs({ page: page - 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>Previous</Link>}
            {page < pages && <Link href={qs({ page: page + 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>Next</Link>}
          </div>
        </nav>
      )}
    </div>
  );
}

function Value({ f, v }: { f: ReviewField; v: unknown }) {
  if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return <span className="text-muted-foreground">—</span>;
  if (f.kind === "list" && Array.isArray(v))
    return (
      <span className="flex flex-wrap gap-1">
        {v.map((x) => (
          <span key={String(x)} className="rounded bg-secondary-soft px-2 py-0.5 text-xs font-medium text-secondary">{String(x)}</span>
        ))}
      </span>
    );
  if (f.kind === "url") return <a href={String(v)} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-secondary underline">{String(v)}</a>;
  if (f.kind === "email") return <a href={`mailto:${String(v)}`} className="text-secondary underline">{String(v)}</a>;
  if (f.kind === "phone") return <a href={`tel:${String(v).replace(/\s/g, "")}`} className="text-secondary underline">{String(v)}</a>;
  if (f.kind === "long") return <span className="whitespace-pre-line">{String(v)}</span>;
  return <>{String(v)}</>;
}

/** One application with all answers, CV download, notes, and review actions. */
export async function ReviewDetail({ kind, id }: { kind: ReviewKind; id: string }) {
  await requireAdmin("people");
  if (!UUID.test(id)) notFound();
  const cfg = REVIEWS[kind];
  const supabase = await createClient();
  const { data } = await supabase.from(cfg.table).select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as Record<string, unknown>;
  let reviewer: string | null = null;
  if (r.reviewed_by) {
    const { data: p } = await supabase.from("profiles").select("full_name, email").eq("id", r.reviewed_by).maybeSingle();
    reviewer = p?.full_name || p?.email || null;
  }
  const email = String(r.email);
  const firstName = String(r.full_name).split(" ")[0];

  return (
    <div>
      <Link href={cfg.path} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-secondary">
        <ArrowLeft className="size-4" /> {cfg.label}
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary">{String(r.full_name)}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={String(r.status)} /> Applied {fmtDate(String(r.created_at))}
            {r.reviewed_at != null && <span>· Last reviewed {fmtDate(String(r.reviewed_at))}{reviewer ? ` by ${reviewer}` : ""}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${email}?subject=${encodeURIComponent(`Your YouthX ${kind} application`)}&body=${encodeURIComponent(`Dear ${firstName},\n\n`)}`} className={buttonVariants({ variant: "outline" })}>
            <Mail /> Email applicant
          </a>
          {typeof r.phone === "string" && r.phone && (
            <a href={`tel:${r.phone.replace(/\s/g, "")}`} className={buttonVariants({ variant: "outline" })}>
              <Phone /> Call
            </a>
          )}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-lg border border-border bg-white">
          <h2 className="border-b border-border px-5 py-3 text-sm font-bold text-secondary">Application</h2>
          <dl className="divide-y divide-border">
            {cfg.detail.map((f) => (
              <div key={f.name} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[12rem_1fr]">
                <dt className="font-medium text-muted-foreground">{f.label}</dt>
                <dd className="text-secondary">
                  <Value f={f} v={r[f.name]} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <ReviewActions kind={kind} id={id} status={String(r.status)} notes={(r.admin_notes as string | null) ?? ""} hasCv={Boolean(r.cv_path)} hasAccount={Boolean(r.user_id)} />
      </div>
    </div>
  );
}
