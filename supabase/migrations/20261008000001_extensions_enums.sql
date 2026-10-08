-- ============ EXTENSIONS & ENUMS ============
create extension if not exists "pgcrypto";

-- Platform roles (what a member of the public signed up as). Admin access is separate: see admin_users.
create type public.user_role as enum ('youth','mentor','partner');
-- CMS / back-office roles, stored in public.admin_users.
create type public.admin_role as enum ('super_admin','content_admin','program_manager','editor');

create type public.gender_type as enum ('female','male');
create type public.opportunity_type as enum (
  'scholarship','internship','fellowship','training','competition','volunteering',
  'conference','job','mentorship','grant','event','other'
);
create type public.opportunity_status as enum ('draft','pending_review','published','closed','archived');
create type public.application_status as enum ('submitted','under_review','shortlisted','accepted','waitlisted','rejected','withdrawn');
create type public.education_level as enum ('none','primary','secondary','diploma','bachelor','master','other');
-- Publishing workflow shared by every CMS content type.
create type public.content_status as enum ('draft','published','archived');
-- Review workflow for volunteer / mentor applications.
create type public.review_status as enum ('new','under_review','approved','rejected','archived');

-- True when the statement comes from a real signed-in API user (not the SQL editor,
-- migrations, seed, or the service role). Protection triggers only apply to API users.
create or replace function public.is_api_user()
returns boolean language sql stable as $$
  select auth.uid() is not null
$$;
