-- ============ CONTENT: POSTS & STORIES ============
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'news' check (kind in ('news','story')),
  title text not null, slug text unique not null, excerpt text, body text, cover_url text,
  language text default 'so', is_published boolean not null default false, published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create index posts_listing_idx on public.posts (kind, is_published, published_at desc);
alter table public.posts enable row level security;
create policy "posts: read published" on public.posts for select using (is_published or public.has_perm('content'));
create policy "posts: staff write" on public.posts for all using (public.has_perm('content')) with check (public.has_perm('content'));

-- Editors may draft news but not publish it.
create or replace function public.protect_post_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_published and (tg_op = 'INSERT' or not old.is_published)
     and public.is_api_user() and not public.can_publish() then
    raise exception 'Only publishers can publish content';
  end if;
  return new;
end $$;
create trigger posts_publish_guard before insert or update on public.posts
for each row execute function public.protect_post_publish();

-- ============ DONATIONS, CONTACT, PARTNER REQUESTS ============
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_name text, donor_email text, donor_phone text,
  amount numeric(12,2) not null check (amount > 0), currency text not null default 'USD' check (currency in ('USD','SOS')),
  method text check (method in ('evc_plus','zaad','sahal','bank','other')),
  reference text, message text, is_anonymous boolean not null default false,
  status text not null default 'pledged' check (status in ('pledged','confirmed','cancelled')),
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_type text not null default 'general' check (inquiry_type in ('general','partnership','programs','media','other')),
  name text not null, email text, phone text, subject text, message text not null,
  is_read boolean not null default false, is_archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_messages_inbox_idx on public.contact_messages (is_archived, created_at desc);
create table public.partner_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'partner' check (kind in ('partner','sponsor')),
  org_name text not null, contact_name text not null, email text not null, phone text,
  message text, status text not null default 'new' check (status in ('new','contacted','approved','declined')),
  created_at timestamptz not null default now()
);

-- Public submissions always start in their initial state, whatever the client sends.
create or replace function public.force_submission_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('inbox') then
    if tg_table_name = 'donations' then new.status := 'pledged';
    elsif tg_table_name = 'contact_messages' then new.is_read := false; new.is_archived := false;
    elsif tg_table_name = 'partner_requests' then new.status := 'new';
    end if;
    new.created_at := now();
  end if;
  return new;
end $$;
create trigger donations_defaults before insert on public.donations for each row execute function public.force_submission_defaults();
create trigger contact_defaults before insert on public.contact_messages for each row execute function public.force_submission_defaults();
create trigger partner_req_defaults before insert on public.partner_requests for each row execute function public.force_submission_defaults();

alter table public.donations enable row level security;
alter table public.contact_messages enable row level security;
alter table public.partner_requests enable row level security;
-- anyone can submit; only staff can read
create policy "donations: anyone insert" on public.donations for insert with check (user_id is null or user_id = auth.uid());
create policy "donations: own read" on public.donations for select using (user_id = auth.uid());
create policy "donations: staff all" on public.donations for all using (public.has_perm('inbox')) with check (public.has_perm('inbox'));
create policy "contact: anyone insert" on public.contact_messages for insert with check (true);
create policy "contact: staff all" on public.contact_messages for all using (public.has_perm('inbox')) with check (public.has_perm('inbox'));
create policy "partner_req: anyone insert" on public.partner_requests for insert with check (true);
create policy "partner_req: staff all" on public.partner_requests for all using (public.has_perm('inbox')) with check (public.has_perm('inbox'));

-- ============ RATE LIMITS (public forms) ============
-- Only the server (service role) touches this table; RLS with no policies blocks everyone else.
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);
alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare r record;
begin
  insert into public.rate_limits as rl (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning * into r;
  return r.hits <= p_max;
end $$;
revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- Failure-only limiting (sign-in): look without counting, and clear after a success.
create or replace function public.peek_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select hits < p_max or window_start < now() - make_interval(secs => p_window_seconds)
                   from public.rate_limits where key = p_key), true)
$$;
create or replace function public.clear_rate_limit(p_key text)
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limits where key = p_key
$$;
revoke execute on function public.peek_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function public.clear_rate_limit(text) from public, anon, authenticated;
grant execute on function public.peek_rate_limit(text, int, int) to service_role;
grant execute on function public.clear_rate_limit(text) to service_role;
