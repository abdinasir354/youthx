-- ============ APPLICATIONS ============
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  gender_snapshot public.gender_type not null,
  status public.application_status not null default 'submitted',
  answers jsonb not null default '{}',
  cv_path text,
  motivation text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  unique (opportunity_id, applicant_id)
);
create index applications_quota_idx on public.applications (opportunity_id, status, gender_snapshot);
create index applications_applicant_idx on public.applications (applicant_id);

-- Fill gender from profile, block late applications, block status tampering by applicants.
create or replace function public.prepare_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare g public.gender_type; opp record; is_reviewer boolean;
begin
  if tg_op = 'INSERT' then
    select gender into g from public.profiles where id = new.applicant_id;
    if g is null then raise exception 'Please set your gender in your profile before applying'; end if;
    select * into opp from public.opportunities where id = new.opportunity_id;
    if not found or opp.status <> 'published' then raise exception 'Opportunity is not open'; end if;
    if opp.apply_mode <> 'internal' then raise exception 'Opportunity is not open'; end if;
    if opp.apply_deadline is not null and now() > opp.apply_deadline then raise exception 'Deadline has passed'; end if;
    new.gender_snapshot := g;
    new.status := 'submitted';
    new.submitted_at := now();
    new.decided_at := null;
    new.decided_by := null;
  else
    -- identity of an application never changes
    new.gender_snapshot := old.gender_snapshot;
    new.opportunity_id := old.opportunity_id;
    new.applicant_id := old.applicant_id;
    new.submitted_at := old.submitted_at;

    -- accepted can only be set via accept_application()
    if new.status = 'accepted' and old.status <> 'accepted'
       and coalesce(current_setting('app.accepting', true), '') <> 'on' then
      raise exception 'Use accept_application() to accept';
    end if;

    if public.is_api_user() then
      is_reviewer := public.has_perm('people') or public.is_org_member(
        (select organization_id from public.opportunities where id = new.opportunity_id));
      if not is_reviewer then
        -- applicants may only withdraw; they cannot edit answers after submitting
        if new.status <> old.status and new.status <> 'withdrawn' then
          raise exception 'You can only withdraw your application';
        end if;
        new.answers := old.answers; new.motivation := old.motivation; new.cv_path := old.cv_path;
        new.decided_at := old.decided_at; new.decided_by := old.decided_by;
      else
        -- reviewers cannot rewrite what the applicant submitted
        new.answers := old.answers; new.motivation := old.motivation; new.cv_path := old.cv_path;
        if new.status is distinct from old.status then
          new.decided_at := now(); new.decided_by := auth.uid();
        end if;
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger app_prepare before insert or update on public.applications
for each row execute function public.prepare_application();

alter table public.applications enable row level security;
create policy "apps: applicant read own" on public.applications for select using (applicant_id = auth.uid());
create policy "apps: applicant create" on public.applications for insert with check (applicant_id = auth.uid());
create policy "apps: applicant withdraw" on public.applications for update using (applicant_id = auth.uid()) with check (applicant_id = auth.uid());
create policy "apps: org read" on public.applications for select using (
  public.is_org_member((select organization_id from public.opportunities o where o.id = opportunity_id)) or public.has_perm('people'));
create policy "apps: org update" on public.applications for update using (
  public.is_org_member((select organization_id from public.opportunities o where o.id = opportunity_id)) or public.has_perm('people'));

-- Partners may read the profiles of people who applied to their organization's opportunities.
create or replace function public.is_applicant_of_my_org(profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a
    join public.opportunities o on o.id = a.opportunity_id
    join public.organization_members m on m.organization_id = o.organization_id
    where a.applicant_id = profile_id and m.user_id = auth.uid())
$$;
create policy "profiles: org read applicants" on public.profiles for select using (public.is_applicant_of_my_org(id));

-- Private reviewer notes (applicants never see these)
create table public.application_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  score int check (score between 1 and 10),
  notes text,
  created_at timestamptz not null default now()
);
create index application_reviews_app_idx on public.application_reviews (application_id);
alter table public.application_reviews enable row level security;
create policy "reviews: reviewers only" on public.application_reviews for all using (
  public.has_perm('people') or public.is_org_member((select o.organization_id from public.applications a
    join public.opportunities o on o.id = a.opportunity_id where a.id = application_id)))
with check (reviewer_id = auth.uid());
