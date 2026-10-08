-- ============ ORGANIZATIONS (partners) ============
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  type text check (type in ('ngo','company','university','government','other')),
  logo_url text,
  website text,
  description text,
  is_verified boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner','member')),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = org and user_id = auth.uid())
$$;

-- Only people managers may verify an organization.
create or replace function public.protect_org_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_api_user() and not public.has_perm('people') then
    if tg_op = 'INSERT' then
      new.is_verified := false;
    else
      new.is_verified := old.is_verified;
      new.created_by := old.created_by;
    end if;
  end if;
  if tg_op = 'UPDATE' and new.is_verified is distinct from old.is_verified then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'organization_verified', 'organization', new.id, jsonb_build_object('verified', new.is_verified));
  end if;
  return new;
end $$;
create trigger org_protect before insert or update on public.organizations
for each row execute function public.protect_org_fields();

alter table public.organizations enable row level security;
create policy "orgs: public read verified" on public.organizations for select using (is_verified or public.is_org_member(id) or public.has_perm('people'));
create policy "orgs: partner create" on public.organizations for insert with check (
  (public.current_user_role() = 'partner' and created_by = auth.uid()) or public.has_perm('people'));
create policy "orgs: member update" on public.organizations for update using (public.is_org_member(id) or public.has_perm('people'));
create policy "orgs: staff delete" on public.organizations for delete using (public.has_perm('people'));

-- Creator becomes owner automatically
create or replace function public.add_org_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.organization_members (organization_id, user_id, member_role)
    values (new.id, new.created_by, 'owner') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger org_owner after insert on public.organizations for each row execute function public.add_org_owner();

alter table public.organization_members enable row level security;
create policy "members: read own org" on public.organization_members for select using (user_id = auth.uid() or public.is_org_member(organization_id) or public.has_perm('people'));
create policy "members: staff manage" on public.organization_members for all using (public.has_perm('people')) with check (public.has_perm('people'));
