-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, body text, link text, is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);
alter table public.notifications enable row level security;
create policy "notif: own read" on public.notifications for select using (user_id = auth.uid());
create policy "notif: own mark read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif: own delete" on public.notifications for delete using (user_id = auth.uid());
create policy "notif: staff insert" on public.notifications for insert with check (public.is_staff());
alter publication supabase_realtime add table public.notifications;

-- Notify applicants of every status change made by a reviewer (accept_application notifies on its own).
create or replace function public.notify_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status
     and new.status in ('under_review','shortlisted','rejected','waitlisted')
     and coalesce(current_setting('app.accepting', true), '') <> 'on' then
    insert into public.notifications (user_id, title, body, link)
    values (new.applicant_id, 'Application update',
            (select title from public.opportunities where id = new.opportunity_id) || ': ' || new.status::text,
            '/dashboard/applications');
  end if;
  return null;
end $$;
create trigger app_notify after update on public.applications
for each row execute function public.notify_application_status();

-- ============ AUDIT LOG ============
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null, entity text, entity_id uuid, details jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);
alter table public.audit_log enable row level security;
create policy "audit: admin read" on public.audit_log for select using (public.is_admin());
-- Writes only via security definer functions/triggers. There are no update or delete
-- policies, so not even a super admin can edit or remove entries through the API.

-- Login / logout and other events that don't touch a table. Only back-office users can log.
create or replace function public.log_admin_event(p_action text, p_details jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then return; end if;
  if p_action not in ('login','logout','export') then raise exception 'Unknown audit action'; end if;
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, 'session', auth.uid(), coalesce(p_details, '{}'::jsonb));
end $$;
revoke execute on function public.log_admin_event(text, jsonb) from public, anon;
grant execute on function public.log_admin_event(text, jsonb) to authenticated;

-- ============ PUBLIC IMPACT STATS (aggregates only) ============
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
    'partners', (select count(*) from organizations where is_verified)
  )
$$;
grant execute on function public.impact_stats() to anon, authenticated;
