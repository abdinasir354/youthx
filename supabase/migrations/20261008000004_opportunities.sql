-- ============ OPPORTUNITIES ============
-- Two kinds of listing share this table:
--   apply_mode = 'internal'  youth apply on the site; the 75/25 quota applies (partner + admin opportunities)
--   apply_mode = 'external'  a curated listing that links to another organization's application page
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  organization_name text,                 -- for external listings with no partner account
  type public.opportunity_type not null,
  title text not null,
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  summary text,
  description text,
  requirements text,                      -- eligibility
  region text,
  location text,
  is_remote boolean not null default false,
  apply_mode text not null default 'internal' check (apply_mode in ('internal','external')),
  application_url text check (application_url is null or application_url ~ '^https?://'),
  attachment_url text,
  capacity int check (capacity is null or capacity > 0),
  female_ratio numeric(3,2) not null default 0.75 check (female_ratio between 0 and 1),
  allow_rollover boolean not null default false,
  rollover_applied boolean not null default false,
  min_age int default 15,
  max_age int default 35,
  apply_deadline timestamptz,
  expires_at timestamptz,                 -- listing disappears after this (defaults to the deadline)
  starts_at timestamptz,
  ends_at timestamptz,
  cover_url text,
  questions jsonb not null default '[]',   -- custom application questions: [{id, label, required}]
  status public.opportunity_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (apply_mode = 'internal' or application_url is not null)
);
create index opportunities_listing_idx on public.opportunities (status, type, apply_deadline);
create index opportunities_org_idx on public.opportunities (organization_id);
create index opportunities_featured_idx on public.opportunities (is_featured) where is_featured;

-- Partners cannot publish/archive, feature, or change the quota ratio themselves.
-- Back-office editors can draft but not publish.
create or replace function public.protect_opportunity_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_api_user() and not public.has_perm('programs') then
    if new.status in ('published','archived') and (tg_op = 'INSERT' or old.status is distinct from new.status) then
      raise exception 'Only staff can publish or archive opportunities';
    end if;
    if tg_op = 'INSERT' then
      new.female_ratio := 0.75; new.allow_rollover := false; new.rollover_applied := false;
      new.is_featured := false; new.apply_mode := 'internal';
    else
      new.female_ratio := old.female_ratio; new.allow_rollover := old.allow_rollover; new.rollover_applied := old.rollover_applied;
      new.organization_id := old.organization_id; new.created_by := old.created_by;
      new.is_featured := old.is_featured; new.apply_mode := old.apply_mode;
    end if;
  end if;

  if public.is_api_user() and public.has_perm('programs') and not public.can_publish()
     and new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    raise exception 'Only publishers can publish content';
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  if tg_op = 'INSERT' then new.created_at := now(); end if;
  new.updated_by := coalesce(auth.uid(), new.updated_by);

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (auth.uid(),
            case when new.status = 'published' then 'publish' when old.status = 'published' then 'unpublish' else 'status_change' end,
            'opportunities', new.id, jsonb_build_object('title', new.title, 'from', old.status, 'to', new.status));
  end if;
  if tg_op = 'UPDATE' and old.female_ratio is distinct from new.female_ratio then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'quota_ratio_change', 'opportunities', new.id, jsonb_build_object('from', old.female_ratio, 'to', new.female_ratio));
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger opp_protect before insert or update on public.opportunities
for each row execute function public.protect_opportunity_fields();

alter table public.opportunities enable row level security;
create policy "opps: public read published" on public.opportunities for select using (status in ('published','closed'));
create policy "opps: org read own" on public.opportunities for select using (public.is_org_member(organization_id) or public.has_perm('programs'));
create policy "opps: partner create" on public.opportunities for insert with check (
  (public.is_org_member(organization_id) and created_by = auth.uid()) or public.has_perm('programs'));
create policy "opps: partner update" on public.opportunities for update using (public.is_org_member(organization_id) or public.has_perm('programs'));
create policy "opps: staff delete" on public.opportunities for delete using (public.has_perm('programs') and public.can_publish());

-- Close listings whose expiry date (or deadline) has passed. Run daily by the Vercel cron
-- (service role) or on demand from the admin. Returns the number of listings closed.
create or replace function public.close_expired_opportunities()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if public.is_api_user() and not public.has_perm('programs') then raise exception 'Not allowed'; end if;
  update public.opportunities set status = 'closed'
   where status = 'published' and coalesce(expires_at, apply_deadline) < now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.close_expired_opportunities() from public, anon;
grant execute on function public.close_expired_opportunities() to authenticated, service_role;
