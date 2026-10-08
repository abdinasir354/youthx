-- ============ SAVED OPPORTUNITIES ============
create table public.saved_opportunities (
  user_id uuid references public.profiles(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
alter table public.saved_opportunities enable row level security;
create policy "saved: own" on public.saved_opportunities for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ COURSES ============
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null, slug text unique not null, description text,
  category text, level text, cover_url text, language text default 'so',
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null, content text, video_url text, position int not null default 0,
  duration_minutes int
);
create index lessons_course_idx on public.lessons (course_id, position);
create table public.enrollments (
  user_id uuid references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(), completed_at timestamptz,
  primary key (user_id, course_id)
);
create table public.lesson_progress (
  user_id uuid references public.profiles(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
create policy "courses: read published" on public.courses for select using (is_published or public.has_perm('content'));
create policy "courses: staff write" on public.courses for all using (public.has_perm('content')) with check (public.has_perm('content'));
create policy "lessons: read if course published" on public.lessons for select using (
  exists (select 1 from public.courses c where c.id = course_id and (c.is_published or public.has_perm('content'))));
create policy "lessons: staff write" on public.lessons for all using (public.has_perm('content')) with check (public.has_perm('content'));
create policy "enroll: own" on public.enrollments for all using (user_id = auth.uid()) with check (
  user_id = auth.uid() and exists (select 1 from public.courses c where c.id = course_id and c.is_published));
create policy "enroll: staff read" on public.enrollments for select using (public.has_perm('content'));
create policy "progress: own" on public.lesson_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress: staff read" on public.lesson_progress for select using (public.has_perm('content'));

-- Mark the enrollment complete once every lesson in the course is done.
create or replace function public.sync_course_completion()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid; total int; done int;
begin
  select course_id into cid from public.lessons where id = coalesce(new.lesson_id, old.lesson_id);
  select count(*) into total from public.lessons where course_id = cid;
  select count(*) into done from public.lesson_progress p join public.lessons l on l.id = p.lesson_id
    where p.user_id = coalesce(new.user_id, old.user_id) and l.course_id = cid;
  update public.enrollments
     set completed_at = case when total > 0 and done >= total then coalesce(completed_at, now()) else null end
   where user_id = coalesce(new.user_id, old.user_id) and course_id = cid;
  return null;
end $$;
create trigger progress_sync after insert or delete on public.lesson_progress
for each row execute function public.sync_course_completion();
