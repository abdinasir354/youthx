-- ============ QUOTA: SEAT STATS + ACCEPT FUNCTION ============
-- The 75/25 women-first rule lives here. The UI only displays what these functions return.

create or replace view public.opportunity_seats with (security_invoker = true) as
select o.id as opportunity_id, o.capacity, o.female_ratio, o.rollover_applied,
  case when o.capacity is null then null else ceil(o.capacity * o.female_ratio)::int end as female_seats,
  case when o.capacity is null then null else o.capacity - ceil(o.capacity * o.female_ratio)::int end as male_seats,
  count(a.id) filter (where a.status='accepted' and a.gender_snapshot='female')::int as female_accepted,
  count(a.id) filter (where a.status='accepted' and a.gender_snapshot='male')::int as male_accepted,
  count(a.id) filter (where a.status<>'withdrawn' and a.gender_snapshot='female')::int as female_applied,
  count(a.id) filter (where a.status<>'withdrawn' and a.gender_snapshot='male')::int as male_applied,
  count(a.id) filter (where a.status='waitlisted')::int as waitlisted
from public.opportunities o
left join public.applications a on a.opportunity_id = o.id
group by o.id;

-- Public seat counts (aggregates only) via security definer function
create or replace function public.public_seats(opp uuid)
returns table (capacity int, female_seats int, male_seats int, female_left int, male_left int)
language sql stable security definer set search_path = public as $$
  select s.capacity, s.female_seats, s.male_seats,
         greatest(s.female_seats - s.female_accepted, 0)::int,
         greatest(s.male_seats - s.male_accepted, 0)::int
  from public.opportunity_seats s
  join public.opportunities o on o.id = s.opportunity_id
  where s.opportunity_id = opp and o.status in ('published','closed')
$$;
grant execute on function public.public_seats(uuid) to anon, authenticated;

-- Seat counts for many opportunities at once (listing pages)
create or replace function public.public_seats_many(opps uuid[])
returns table (opportunity_id uuid, capacity int, female_seats int, male_seats int, female_left int, male_left int)
language sql stable security definer set search_path = public as $$
  select s.opportunity_id, s.capacity, s.female_seats, s.male_seats,
         greatest(s.female_seats - s.female_accepted, 0)::int,
         greatest(s.male_seats - s.male_accepted, 0)::int
  from public.opportunity_seats s
  join public.opportunities o on o.id = s.opportunity_id
  where s.opportunity_id = any(opps) and o.status in ('published','closed')
$$;
grant execute on function public.public_seats_many(uuid[]) to anon, authenticated;

-- The ONLY way an application becomes 'accepted'.
-- Locks the opportunity row so two reviewers accepting at the same moment are serialized.
create or replace function public.accept_application(app_id uuid)
returns public.application_status language plpgsql security definer set search_path = public as $$
declare a record; o record; f_seats int; m_seats int; taken int; total int; result public.application_status;
begin
  select * into a from public.applications where id = app_id;
  if not found then raise exception 'Application not found'; end if;

  select * into o from public.opportunities where id = a.opportunity_id for update;  -- lock to prevent race
  if not (public.has_perm('people') or public.is_org_member(o.organization_id)) then
    raise exception 'Not allowed';
  end if;

  -- re-read the application after taking the lock
  select * into a from public.applications where id = app_id;
  if a.status = 'accepted' then return 'accepted'; end if;
  if a.status in ('withdrawn','rejected') then
    raise exception 'Cannot accept an application that is %', a.status;
  end if;

  perform set_config('app.accepting', 'on', true);

  if o.capacity is null then
    result := 'accepted';
  else
    f_seats := ceil(o.capacity * o.female_ratio);
    m_seats := o.capacity - f_seats;
    if o.rollover_applied then f_seats := o.capacity; m_seats := o.capacity; end if; -- total cap still enforced below

    select count(*) into taken from public.applications
      where opportunity_id = o.id and status = 'accepted' and gender_snapshot = a.gender_snapshot;

    if (a.gender_snapshot = 'female' and taken < f_seats) or (a.gender_snapshot = 'male' and taken < m_seats) then
      result := 'accepted';
    else
      result := 'waitlisted';
    end if;

    -- never exceed total capacity
    select count(*) into total from public.applications where opportunity_id = o.id and status = 'accepted';
    if result = 'accepted' and total >= o.capacity then
      result := 'waitlisted';
    end if;
  end if;

  update public.applications set status = result, decided_at = now(), decided_by = auth.uid() where id = app_id;
  perform set_config('app.accepting', 'off', true);

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
    values (auth.uid(), 'accept_attempt', 'application', app_id,
            jsonb_build_object('result', result, 'gender', a.gender_snapshot, 'opportunity_id', o.id));
  insert into public.notifications (user_id, title, body, link)
    values (a.applicant_id,
            case when result = 'accepted' then 'Application accepted' else 'Application waitlisted' end,
            o.title || ': ' || result::text,
            '/dashboard/applications');
  return result;
end $$;
revoke execute on function public.accept_application(uuid) from public, anon;
grant execute on function public.accept_application(uuid) to authenticated;

-- Admin-only rollover after deadline: unfilled seats of one gender may go to the other.
create or replace function public.apply_rollover(opp uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o record;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into o from public.opportunities where id = opp for update;
  if not found then raise exception 'Opportunity not found'; end if;
  if not o.allow_rollover then raise exception 'Rollover not enabled'; end if;
  if o.apply_deadline is null or now() < o.apply_deadline then raise exception 'Deadline not reached'; end if;
  update public.opportunities set rollover_applied = true where id = opp;
  insert into public.audit_log (actor_id, action, entity, entity_id) values (auth.uid(), 'rollover', 'opportunity', opp);
end $$;
revoke execute on function public.apply_rollover(uuid) from public, anon;
grant execute on function public.apply_rollover(uuid) to authenticated;
