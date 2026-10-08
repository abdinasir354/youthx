-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  role public.user_role not null default 'youth',
  gender public.gender_type,
  date_of_birth date,
  region text,
  district text,
  phone text,
  education_level public.education_level,
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  bio text,
  avatar_url text,
  cv_path text,
  preferred_language text not null default 'en' check (preferred_language in ('so','en')),
  is_mentor_approved boolean not null default false,
  mentor_expertise text[] not null default '{}',
  mentor_availability text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, preferred_language)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when new.raw_user_meta_data->>'preferred_language' = 'so' then 'so' else 'en' end
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Accounts created before this migration ran (e.g. the first admin) get a profile too.
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', '')
from auth.users u
on conflict (id) do nothing;

-- ============ ADMIN USERS (CMS roles) ============
-- One row per back-office user. Only a super admin can add, change or remove rows.
create table public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.admin_role not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ ROLE HELPERS (security definer, avoid RLS recursion) ============
-- NOTE: named current_user_role() because CURRENT_ROLE is a reserved SQL keyword.
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_admin_role()
returns public.admin_role language sql stable security definer set search_path = public as $$
  select role from public.admin_users where user_id = auth.uid() and is_active
$$;

-- Any active back-office user.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_admin_role() is not null
$$;

-- Super admin.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_admin_role() = 'super_admin', false)
$$;

/*
  Permission matrix. Keep in sync with src/lib/permissions.ts.
    content      pages, sections, stories, projects, resources, news, courses, FAQs, partner logos
    programs     programs, events, opportunities (+ their categories / speakers)
    people       youth profiles, applications, organizations, mentorship, CVs, volunteer/mentor applications
    inbox        contact messages, partner requests, donations, newsletter
    media        upload to the media library / edit alt text
    media_delete delete media files
    site         navigation, page SEO
    settings     site settings, admin users, audit log
*/
create or replace function public.has_perm(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    case p
      when 'content'      then r in ('super_admin','content_admin','editor')
      when 'programs'     then r in ('super_admin','content_admin','program_manager','editor')
      when 'people'       then r in ('super_admin','program_manager')
      when 'inbox'        then r in ('super_admin','content_admin','program_manager')
      when 'media'        then r is not null
      when 'media_delete' then r in ('super_admin','content_admin')
      when 'site'         then r in ('super_admin','content_admin')
      when 'settings'     then r = 'super_admin'
      else false
    end, false)
  from (select public.current_admin_role() as r) x
$$;

-- Editors draft; everyone else with access may publish.
create or replace function public.can_publish()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_admin_role() in ('super_admin','content_admin','program_manager'), false)
$$;

-- Block users from changing their own role, mentor approval or email.
-- Role changes are written to the audit log (created in a later migration).
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.email := old.email;
  if public.is_api_user() and not public.is_admin()
     and coalesce(current_setting('app.role_change', true), '') <> 'on' then
    new.role := old.role;
    new.is_mentor_approved := old.is_mentor_approved;
  end if;
  if new.role is distinct from old.role or new.is_mentor_approved is distinct from old.is_mentor_approved then
    insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'profile_role_change', 'profile', new.id,
      jsonb_build_object('from', old.role, 'to', new.role,
                         'mentor_approved_from', old.is_mentor_approved, 'mentor_approved_to', new.is_mentor_approved));
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
for each row execute function public.protect_profile_fields();

alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select using (id = auth.uid());
create policy "profiles: people managers read" on public.profiles for select using (public.has_perm('people'));
create policy "profiles: admins read back-office users" on public.profiles for select using (
  public.is_admin() and exists (select 1 from public.admin_users a where a.user_id = id));
create policy "profiles: update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: super admin update" on public.profiles for update using (public.is_admin());
-- (partner / mentor read policies are added in later migrations once those tables exist)

-- ---- admin_users protection ----
create or replace function public.protect_admin_users()
returns trigger language plpgsql security definer set search_path = public as $$
declare remaining int;
begin
  if public.is_api_user() then
    -- nobody edits their own back-office access (no self-promotion, no accidental lock-out)
    if (tg_op = 'DELETE' and old.user_id = auth.uid()) or (tg_op <> 'DELETE' and new.user_id = auth.uid()) then
      raise exception 'You cannot change your own admin access';
    end if;
  end if;

  -- never remove or demote the last active super admin
  if tg_op in ('UPDATE','DELETE') and old.role = 'super_admin' and old.is_active
     and (tg_op = 'DELETE' or new.role <> 'super_admin' or not new.is_active) then
    select count(*) into remaining from public.admin_users
     where role = 'super_admin' and is_active and user_id <> old.user_id;
    if remaining = 0 then raise exception 'At least one active super admin is required'; end if;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
  end if;
  if tg_op <> 'DELETE' then new.updated_at := now(); end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'admin_role_' || lower(tg_op), 'admin_user',
          case when tg_op = 'DELETE' then old.user_id else new.user_id end,
          jsonb_build_object(
            'from', case when tg_op = 'INSERT' then null else old.role end,
            'to', case when tg_op = 'DELETE' then null else new.role end,
            'active', case when tg_op = 'DELETE' then null else new.is_active end));
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger admin_users_protect before insert or update or delete on public.admin_users
for each row execute function public.protect_admin_users();

alter table public.admin_users enable row level security;
create policy "admin_users: read own" on public.admin_users for select using (user_id = auth.uid());
create policy "admin_users: super admin read" on public.admin_users for select using (public.is_admin());
create policy "admin_users: super admin insert" on public.admin_users for insert with check (public.is_admin());
create policy "admin_users: super admin update" on public.admin_users for update using (public.is_admin()) with check (public.is_admin());
create policy "admin_users: super admin delete" on public.admin_users for delete using (public.is_admin());

-- Public, non-sensitive mentor directory (no gender, phone, DOB)
create view public.public_mentors with (security_invoker = false) as
  select id, full_name, avatar_url, bio, skills, languages, region, mentor_expertise, mentor_availability
  from public.profiles where role = 'mentor' and is_mentor_approved = true;
grant select on public.public_mentors to anon, authenticated;
