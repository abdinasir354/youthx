-- ============ MENTORSHIP ============
create table public.mentorship_requests (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  topic text, message text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','completed','cancelled')),
  response_message text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index mentorship_mentor_idx on public.mentorship_requests (mentor_id, status);
create index mentorship_mentee_idx on public.mentorship_requests (mentee_id);

-- Mentors only change status/response; mentees may only cancel a pending request.
create or replace function public.protect_mentorship()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.responded_at := null; new.response_message := null;
    return new;
  end if;
  new.mentee_id := old.mentee_id; new.mentor_id := old.mentor_id;
  new.topic := old.topic; new.message := old.message; new.created_at := old.created_at;
  if public.is_api_user() and not public.has_perm('people') then
    if auth.uid() = old.mentee_id then
      if not (old.status = 'pending' and new.status = 'cancelled') then
        raise exception 'You can only cancel a pending request';
      end if;
      new.response_message := old.response_message;
    elsif auth.uid() = old.mentor_id then
      if new.status not in ('pending','accepted','declined','completed') then
        raise exception 'Invalid status';
      end if;
    end if;
  end if;
  if new.status is distinct from old.status then
    new.responded_at := now();
    if new.status in ('accepted','declined') then
      insert into public.notifications (user_id, title, body, link)
      values (old.mentee_id, 'Mentorship request ' || new.status, coalesce(new.response_message, ''), '/dashboard/mentorship');
    end if;
  end if;
  return new;
end $$;
create trigger mentorship_protect before insert or update on public.mentorship_requests
for each row execute function public.protect_mentorship();

-- Notify the mentor of a new request.
create or replace function public.notify_mentor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, title, body, link)
  values (new.mentor_id, 'New mentorship request', coalesce(new.topic, ''), '/mentor/requests');
  return null;
end $$;
create trigger mentorship_notify after insert on public.mentorship_requests
for each row execute function public.notify_mentor();

alter table public.mentorship_requests enable row level security;
create policy "mentorship: participants read" on public.mentorship_requests for select using (
  mentee_id = auth.uid() or mentor_id = auth.uid() or public.has_perm('people'));
create policy "mentorship: mentee create" on public.mentorship_requests for insert with check (
  mentee_id = auth.uid() and mentor_id <> auth.uid()
  and exists (select 1 from public.public_mentors p where p.id = mentor_id));
create policy "mentorship: participant update" on public.mentorship_requests for update using (
  mentor_id = auth.uid() or mentee_id = auth.uid() or public.has_perm('people'));

-- Mentors may read the profile of youth who sent them a request.
create or replace function public.is_my_mentee(profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mentorship_requests r where r.mentee_id = profile_id and r.mentor_id = auth.uid())
$$;
create policy "profiles: mentor read mentees" on public.profiles for select using (public.is_my_mentee(id));
