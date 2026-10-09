-- ============================================================================
-- Get Involved: volunteer applications, mentor applications, newsletter.
-- Anyone may submit (rate-limited + honeypot in the app); only people managers read.
-- ============================================================================

create table public.volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  location text,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  experience text,
  availability text,
  motivation text not null,
  cv_path text,                           -- private "applications" bucket
  portfolio_url text check (portfolio_url is null or portfolio_url ~ '^https?://'),
  status public.review_status not null default 'new',
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index volunteer_applications_status_idx on public.volunteer_applications (status, created_at desc);

create table public.mentor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  professional_field text not null,
  organization text,
  years_experience int check (years_experience is null or years_experience between 0 and 70),
  skills text[] not null default '{}',
  website_url text check (website_url is null or website_url ~ '^https?://'),
  mentor_areas text[] not null default '{}',
  availability text,
  bio text,
  motivation text not null,
  cv_path text,                           -- private "applications" bucket
  status public.review_status not null default 'new',
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index mentor_applications_status_idx on public.mentor_applications (status, created_at desc);

-- Public submissions always start as 'new', tied to the signed-in user (if any), never pre-reviewed.
-- Reviews stamp who changed the status and when.
create or replace function public.guard_review_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.has_perm('people') then
      new.status := 'new';
      new.admin_notes := null;
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.user_id := auth.uid();
    end if;
    new.created_at := now();
  else
    new.id := old.id; new.created_at := old.created_at; new.user_id := old.user_id;
    new.full_name := old.full_name; new.email := old.email; new.cv_path := old.cv_path;
    new.motivation := old.motivation;
    if new.status is distinct from old.status then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
      insert into public.audit_log (actor_id, action, entity, entity_id, details)
      values (auth.uid(), 'review', tg_table_name, new.id, jsonb_build_object('from', old.status, 'to', new.status));
    end if;
  end if;
  return new;
end $$;
create trigger volunteer_applications_guard before insert or update on public.volunteer_applications
for each row execute function public.guard_review_application();
create trigger mentor_applications_guard before insert or update on public.mentor_applications
for each row execute function public.guard_review_application();

alter table public.volunteer_applications enable row level security;
alter table public.mentor_applications enable row level security;
create policy "volunteers: anyone submits" on public.volunteer_applications for insert with check (true);
create policy "volunteers: people managers read" on public.volunteer_applications for select using (public.has_perm('people'));
create policy "volunteers: people managers update" on public.volunteer_applications for update using (public.has_perm('people')) with check (public.has_perm('people'));
create policy "volunteers: super admin delete" on public.volunteer_applications for delete using (public.is_admin());
create policy "mentor_apps: anyone submits" on public.mentor_applications for insert with check (true);
create policy "mentor_apps: people managers read" on public.mentor_applications for select using (public.has_perm('people'));
create policy "mentor_apps: people managers update" on public.mentor_applications for update using (public.has_perm('people')) with check (public.has_perm('people'));
create policy "mentor_apps: super admin delete" on public.mentor_applications for delete using (public.is_admin());

-- Approving a mentor application. When the applicant has an account, they become an approved mentor.
create or replace function public.approve_mentor_application(app_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a record;
begin
  if not public.has_perm('people') then raise exception 'Not allowed'; end if;
  select * into a from public.mentor_applications where id = app_id for update;
  if not found then raise exception 'Application not found'; end if;
  update public.mentor_applications set status = 'approved' where id = app_id;

  if a.user_id is not null then
    perform set_config('app.role_change', 'on', true);
    update public.profiles
       set role = case when role = 'youth' then 'mentor'::public.user_role else role end,
           is_mentor_approved = true,
           mentor_expertise = case when cardinality(mentor_expertise) = 0 then a.mentor_areas else mentor_expertise end,
           mentor_availability = coalesce(mentor_availability, a.availability)
     where id = a.user_id;
    perform set_config('app.role_change', 'off', true);
    insert into public.notifications (user_id, title, body, link)
    values (a.user_id, 'Mentor application approved', 'Welcome to the Youthup mentor network.', '/mentor');
  end if;
end $$;
revoke execute on function public.approve_mentor_application(uuid) from public, anon;
grant execute on function public.approve_mentor_application(uuid) to authenticated;

-- ---------- newsletter ----------
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
create unique index newsletter_email_unique on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;
-- No insert/select for the public: subscribing goes through the function below, which never
-- reveals whether an address was already on the list.
create policy "newsletter: inbox read" on public.newsletter_subscribers for select using (public.has_perm('inbox'));
create policy "newsletter: inbox update" on public.newsletter_subscribers for update using (public.has_perm('inbox')) with check (public.has_perm('inbox'));
create policy "newsletter: super admin delete" on public.newsletter_subscribers for delete using (public.is_admin());

create or replace function public.newsletter_subscribe(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.newsletter_subscribers (email) values (lower(trim(p_email)))
  on conflict ((lower(email))) do update
    set status = 'subscribed', unsubscribed_at = null;
end $$;

create or replace function public.newsletter_unsubscribe(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.newsletter_subscribers set status = 'unsubscribed', unsubscribed_at = now()
   where unsubscribe_token = p_token and status = 'subscribed';
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke execute on function public.newsletter_subscribe(text) from public;
revoke execute on function public.newsletter_unsubscribe(uuid) from public;
grant execute on function public.newsletter_subscribe(text) to anon, authenticated;
grant execute on function public.newsletter_unsubscribe(uuid) to anon, authenticated;
