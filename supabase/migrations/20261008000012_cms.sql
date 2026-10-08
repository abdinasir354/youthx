-- ============================================================================
-- CMS: site settings, navigation, pages + sections, programs, events, projects,
-- resources, stories, FAQs, partner logos, media library.
--
-- Every content table follows the same rules:
--   * public (anon) can read only published rows
--   * writes need the matching back-office permission (has_perm)
--   * content_guard(): stamps created_by / updated_by / updated_at, sets published_at,
--     and stops editors from publishing
--   * audit_content(): writes create / update / publish / unpublish / delete to audit_log
-- ============================================================================

-- ---------- shared triggers ----------
create or replace function public.content_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);

  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if public.is_api_user() and not public.can_publish() then
      raise exception 'Only publishers can publish content';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

create or replace function public.audit_content()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  j jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  action text;
begin
  if tg_op = 'INSERT' then action := 'create';
  elsif tg_op = 'DELETE' then action := 'delete';
  elsif (to_jsonb(new)->>'status') is distinct from (to_jsonb(old)->>'status') then
    action := case
      when to_jsonb(new)->>'status' = 'published' then 'publish'
      when to_jsonb(old)->>'status' = 'published' then 'unpublish'
      else 'status_change' end;
  else action := 'update';
  end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), action, tg_table_name, (j->>'id')::uuid,
          jsonb_strip_nulls(jsonb_build_object(
            'title', coalesce(j->>'title', j->>'name', j->>'label', j->>'question', j->>'filename', j->>'type'),
            'status', j->>'status')));
  return null;
end $$;

-- ---------- site settings (single row) ----------
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'YouthX Foundation',
  tagline text,
  description text,
  contact_email text,
  contact_phone text,
  address text,
  social jsonb not null default '{}',     -- {"facebook": "...", "x": "...", "instagram": "...", "linkedin": "...", "youtube": "...", "tiktok": "..."}
  header_cta_label text not null default 'Join YouthX',
  header_cta_href text not null default '/get-involved',
  footer_text text,
  seo_title text,
  seo_description text,
  og_image_url text,
  newsletter_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
create or replace function public.settings_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id := 1;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  insert into public.audit_log (actor_id, action, entity, details)
  values (auth.uid(), 'settings_change', 'site_settings', '{}'::jsonb);
  return new;
end $$;
create trigger site_settings_guard before update on public.site_settings
for each row execute function public.settings_guard();

insert into public.site_settings (id, tagline, description, footer_text, seo_title, seo_description)
values (1,
  'Empowering Somali Youth. Building a Better Future.',
  'YouthX Foundation empowers Somali youth to learn, grow, connect, and lead through education, practical skills, mentorship, career development, entrepreneurship, and community initiatives.',
  'Empowering Somali Youth. Building a Better Future.',
  'YouthX Foundation — Empowering Somali Youth',
  'YouthX Foundation empowers Somali youth through education, skills development, mentorship, career development, entrepreneurship, leadership, and community engagement.')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;
create policy "settings: public read" on public.site_settings for select using (true);
create policy "settings: super admin update" on public.site_settings for update using (public.has_perm('settings')) with check (public.has_perm('settings'));

-- ---------- navigation ----------
create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu text not null check (menu in ('header','footer','legal')),
  label text not null check (length(label) between 1 and 60),
  href text not null check (href ~ '^(/[a-z0-9/#?=&_-]*|https?://.+|mailto:.+)$'),
  position int not null default 0,
  is_visible boolean not null default true,
  open_in_new_tab boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index navigation_items_menu_idx on public.navigation_items (menu, position);
alter table public.navigation_items enable row level security;
create policy "nav: public read visible" on public.navigation_items for select using (is_visible or public.is_staff());
create policy "nav: site managers write" on public.navigation_items for all using (public.has_perm('site')) with check (public.has_perm('site'));
create trigger navigation_audit after insert or update or delete on public.navigation_items
for each row execute function public.audit_content();

-- ---------- pages + sections ----------
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  description text,                      -- intro shown under the title on pages that have one
  is_system boolean not null default false,   -- built-in pages (home, about, ...) can't be deleted or renamed
  status public.content_status not null default 'draft',
  seo_title text,
  seo_description text,
  og_image_url text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.protect_system_pages()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then raise exception 'System pages cannot be deleted'; end if;
    return old;
  end if;
  if old.is_system then
    new.slug := old.slug;
    new.is_system := true;
  end if;
  return new;
end $$;
create trigger pages_system_guard before update or delete on public.pages
for each row execute function public.protect_system_pages();
create trigger pages_guard before insert or update on public.pages
for each row execute function public.content_guard();
create trigger pages_audit after insert or update or delete on public.pages
for each row execute function public.audit_content();

create table public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null check (type in (
    'hero','rich_text','image_text','cards','program_grid','opportunity_grid','event_grid',
    'story_grid','project_grid','resource_grid','cta','faq','statistics','gallery','video','partner_logos')),
  anchor text check (anchor is null or anchor ~ '^[a-z0-9-]+$'),
  position int not null default 0,
  is_visible boolean not null default true,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
create index page_sections_page_idx on public.page_sections (page_id, position);

create or replace function public.touch_section()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;
create trigger page_sections_touch before insert or update on public.page_sections
for each row execute function public.touch_section();
create trigger page_sections_audit after insert or update or delete on public.page_sections
for each row execute function public.audit_content();

alter table public.pages enable row level security;
alter table public.page_sections enable row level security;
create policy "pages: public read published" on public.pages for select using (status = 'published');
create policy "pages: content read all" on public.pages for select using (public.has_perm('content') or public.has_perm('site'));
create policy "pages: content insert" on public.pages for insert with check (public.has_perm('content'));
create policy "pages: content update" on public.pages for update using (public.has_perm('content') or public.has_perm('site'));
create policy "pages: content delete" on public.pages for delete using (public.has_perm('content') and public.can_publish());
create policy "sections: public read visible" on public.page_sections for select using (
  is_visible and exists (select 1 from public.pages p where p.id = page_id and p.status = 'published'));
create policy "sections: content all" on public.page_sections for all using (public.has_perm('content')) with check (public.has_perm('content'));

-- ---------- programs ----------
create table public.program_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  short_description text,
  description text,
  featured_image_url text,
  gallery text[] not null default '{}',
  category_id uuid references public.program_categories(id) on delete set null,
  objectives text[] not null default '{}',
  target_audience text,
  duration text,
  location text,
  registration_url text check (registration_url is null or registration_url ~ '^(https?://|/)'),
  application_url text check (application_url is null or application_url ~ '^(https?://|/)'),
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  position int not null default 0,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index programs_listing_idx on public.programs (status, position);

-- ---------- events ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  summary text,
  description text,
  event_type text not null default 'workshop' check (event_type in (
    'workshop','training','webinar','conference','meetup','competition','networking','other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  attendance_mode text not null default 'in_person' check (attendance_mode in ('in_person','online','hybrid')),
  online_url text check (online_url is null or online_url ~ '^https?://'),
  registration_url text check (registration_url is null or registration_url ~ '^(https?://|/)'),
  featured_image_url text,
  capacity int check (capacity is null or capacity > 0),
  event_status text not null default 'upcoming' check (event_status in ('upcoming','registration_open','ongoing','completed','cancelled')),
  program_id uuid references public.programs(id) on delete set null,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_listing_idx on public.events (status, starts_at);

create table public.event_speakers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  role_title text,
  bio text,
  image_url text,
  position int not null default 0
);
create index event_speakers_event_idx on public.event_speakers (event_id, position);

-- ---------- partner logos (shown on the site; separate from partner accounts) ----------
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website text check (website is null or website ~ '^https?://'),
  description text,
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- projects ----------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  summary text,
  description text,
  problem text,
  solution text,
  objectives text[] not null default '{}',
  activities text[] not null default '{}',
  impact text,
  project_status text not null default 'planned' check (project_status in ('planned','active','ongoing','completed')),
  start_date date,
  end_date date,
  location text,
  featured_image_url text,
  gallery text[] not null default '{}',
  documents jsonb not null default '[]',   -- [{"name": "...", "url": "..."}]
  program_id uuid references public.programs(id) on delete set null,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.project_partners (
  project_id uuid references public.projects(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete cascade,
  primary key (project_id, partner_id)
);

-- ---------- resources ----------
create table public.resource_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  body text,
  resource_type text not null default 'guide' check (resource_type in (
    'article','guide','report','document','video','educational_material','toolkit')),
  category_id uuid references public.resource_categories(id) on delete set null,
  author text,
  cover_image_url text,
  file_url text,
  external_url text check (external_url is null or external_url ~ '^https?://'),
  program_id uuid references public.programs(id) on delete set null,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- stories (real people, published only with consent) ----------
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  person_name text not null,
  introduction text,
  body text,
  profile_image_url text,
  quote text,
  program_id uuid references public.programs(id) on delete set null,
  consent_status text not null default 'pending' check (consent_status in ('pending','granted','withdrawn')),
  consent_notes text,                    -- internal: how/when consent was recorded
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A story can only be published with recorded consent; withdrawing consent unpublishes it.
create or replace function public.story_consent_guard()
returns trigger language plpgsql as $$
begin
  if new.consent_status <> 'granted' then
    if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
      raise exception 'Consent required before publishing a story';
    end if;
    if new.status = 'published' then new.status := 'draft'; end if;
  end if;
  return new;
end $$;
create trigger stories_consent before insert or update on public.stories
for each row execute function public.story_consent_guard();

-- ---------- FAQs ----------
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'general' check (category ~ '^[a-z0-9-]+$'),
  question text not null,
  answer text not null,
  position int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faqs_category_idx on public.faqs (category, position);

-- ---------- media library ----------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media',
  path text not null unique,
  url text not null,
  filename text not null,
  folder text not null default 'images' check (folder in ('images','documents','resources','events','programs','projects','stories')),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  alt_text text,
  width int,
  height int,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index media_folder_idx on public.media (folder, created_at desc);
create trigger media_audit after insert or delete on public.media
for each row execute function public.audit_content();

-- ---------- triggers for content tables ----------
do $$
declare t text;
begin
  foreach t in array array['programs','events','projects','resources','stories'] loop
    execute format('create trigger %1$s_guard before insert or update on public.%1$s for each row execute function public.content_guard()', t);
    execute format('create trigger %1$s_audit after insert or update or delete on public.%1$s for each row execute function public.audit_content()', t);
  end loop;
  foreach t in array array['faqs','partners','program_categories','resource_categories'] loop
    execute format('create trigger %1$s_audit after insert or update or delete on public.%1$s for each row execute function public.audit_content()', t);
  end loop;
end $$;

-- ---------- RLS ----------
alter table public.program_categories enable row level security;
alter table public.programs enable row level security;
alter table public.events enable row level security;
alter table public.event_speakers enable row level security;
alter table public.partners enable row level security;
alter table public.projects enable row level security;
alter table public.project_partners enable row level security;
alter table public.resource_categories enable row level security;
alter table public.resources enable row level security;
alter table public.stories enable row level security;
alter table public.faqs enable row level security;
alter table public.media enable row level security;

-- programs / events / categories: "programs" permission
create policy "program_categories: public read" on public.program_categories for select using (true);
create policy "program_categories: write" on public.program_categories for all using (public.has_perm('programs')) with check (public.has_perm('programs'));
create policy "programs: public read published" on public.programs for select using (status = 'published');
create policy "programs: staff read" on public.programs for select using (public.is_staff());
create policy "programs: insert" on public.programs for insert with check (public.has_perm('programs'));
create policy "programs: update" on public.programs for update using (public.has_perm('programs')) with check (public.has_perm('programs'));
create policy "programs: delete" on public.programs for delete using (public.has_perm('programs') and public.can_publish());

create policy "events: public read published" on public.events for select using (status = 'published');
create policy "events: staff read" on public.events for select using (public.is_staff());
create policy "events: insert" on public.events for insert with check (public.has_perm('programs'));
create policy "events: update" on public.events for update using (public.has_perm('programs')) with check (public.has_perm('programs'));
create policy "events: delete" on public.events for delete using (public.has_perm('programs') and public.can_publish());
create policy "speakers: public read" on public.event_speakers for select using (
  exists (select 1 from public.events e where e.id = event_id and e.status = 'published'));
create policy "speakers: staff all" on public.event_speakers for all using (public.has_perm('programs')) with check (public.has_perm('programs'));

-- projects / resources / stories / FAQs / partner logos: "content" permission
create policy "partners: public read visible" on public.partners for select using (is_visible or public.is_staff());
create policy "partners: write" on public.partners for all using (public.has_perm('content')) with check (public.has_perm('content'));

create policy "projects: public read published" on public.projects for select using (status = 'published');
create policy "projects: staff read" on public.projects for select using (public.is_staff());
create policy "projects: insert" on public.projects for insert with check (public.has_perm('content'));
create policy "projects: update" on public.projects for update using (public.has_perm('content')) with check (public.has_perm('content'));
create policy "projects: delete" on public.projects for delete using (public.has_perm('content') and public.can_publish());
create policy "project_partners: public read" on public.project_partners for select using (
  exists (select 1 from public.projects p where p.id = project_id and p.status = 'published') or public.is_staff());
create policy "project_partners: write" on public.project_partners for all using (public.has_perm('content')) with check (public.has_perm('content'));

create policy "resource_categories: public read" on public.resource_categories for select using (true);
create policy "resource_categories: write" on public.resource_categories for all using (public.has_perm('content')) with check (public.has_perm('content'));
create policy "resources: public read published" on public.resources for select using (status = 'published');
create policy "resources: staff read" on public.resources for select using (public.is_staff());
create policy "resources: insert" on public.resources for insert with check (public.has_perm('content'));
create policy "resources: update" on public.resources for update using (public.has_perm('content')) with check (public.has_perm('content'));
create policy "resources: delete" on public.resources for delete using (public.has_perm('content') and public.can_publish());

create policy "stories: public read published with consent" on public.stories for select using (status = 'published' and consent_status = 'granted');
create policy "stories: staff read" on public.stories for select using (public.is_staff());
create policy "stories: insert" on public.stories for insert with check (public.has_perm('content'));
create policy "stories: update" on public.stories for update using (public.has_perm('content')) with check (public.has_perm('content'));
create policy "stories: delete" on public.stories for delete using (public.has_perm('content') and public.can_publish());

create policy "faqs: public read visible" on public.faqs for select using (is_visible or public.is_staff());
create policy "faqs: write" on public.faqs for all using (public.has_perm('content')) with check (public.has_perm('content'));

-- media: only back-office users see the library; files themselves are public in the media bucket
create policy "media: staff read" on public.media for select using (public.is_staff());
create policy "media: upload" on public.media for insert with check (public.has_perm('media') and uploaded_by = auth.uid());
create policy "media: edit alt text" on public.media for update using (public.has_perm('media')) with check (public.has_perm('media'));
create policy "media: delete" on public.media for delete using (public.has_perm('media_delete'));

-- ---------- public impact numbers (live counts only — never typed in) ----------
create or replace function public.impact_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'youth_registered', (select count(*) from profiles where role = 'youth'),
    'youth_trained', (select count(distinct user_id) from enrollments where completed_at is not null)
                   + (select count(*) from applications a join opportunities o on o.id = a.opportunity_id
                      where a.status = 'accepted' and o.type = 'training'),
    'jobs_placed', (select count(*) from applications a join opportunities o on o.id = a.opportunity_id
                    where a.status = 'accepted' and o.type in ('job','internship')),
    'accepted_total', (select count(*) from applications where status = 'accepted'),
    'women_percent', (select round(100.0 * count(*) filter (where gender_snapshot = 'female') / nullif(count(*), 0))
                      from applications where status = 'accepted'),
    'opportunities', (select count(*) from opportunities where status in ('published','closed')),
    'courses', (select count(*) from courses where is_published),
    'partners', (select count(*) from organizations where is_verified) + (select count(*) from partners where is_visible),
    'programs', (select count(*) from programs where status = 'published'),
    'events', (select count(*) from events where status = 'published'),
    'projects', (select count(*) from projects where status = 'published'),
    'mentors', (select count(*) from profiles where role = 'mentor' and is_mentor_approved)
  )
$$;
grant execute on function public.impact_stats() to anon, authenticated;
