-- ============ STORAGE BUCKETS ============
-- Limits are enforced by the bucket as well as by the app (type, extension, size, file signature).
--   avatars       public   profile photos          <user_id>/...
--   org-logos     public   partner logos           <user_id>/...
--   cvs           PRIVATE  youth CVs               <user_id>/...      (signed URLs only)
--   applications  PRIVATE  volunteer / mentor CVs  volunteer/... mentor/...  (uploaded by the server)
--   media         public   CMS media library       images/ documents/ resources/ events/ programs/ projects/ stories/
-- SVG is deliberately not allowed anywhere (it can carry scripts).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',      'avatars',      true,  2097152,  array['image/jpeg','image/png','image/webp']),
  ('cvs',          'cvs',          false, 5242880,  array['application/pdf']),
  ('applications', 'applications', false, 5242880,  array['application/pdf']),
  ('media',        'media',        true,  20971520, array[
      'image/jpeg','image/png','image/webp','image/avif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
  ('org-logos',    'org-logos',    true,  2097152,  array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Files are stored under "<user_id>/filename"
create policy "avatars: public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars: own write" on storage.objects for insert with check (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own update" on storage.objects for update using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own delete" on storage.objects for delete using (bucket_id='avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "cvs: own read" on storage.objects for select using (bucket_id='cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cvs: staff read" on storage.objects for select using (bucket_id='cvs' and public.has_perm('people'));
create policy "cvs: org read applicants" on storage.objects for select using (
  bucket_id='cvs' and exists (
    select 1 from public.applications a join public.opportunities o on o.id = a.opportunity_id
    where a.applicant_id::text = (storage.foldername(name))[1] and public.is_org_member(o.organization_id)));
create policy "cvs: own write" on storage.objects for insert with check (bucket_id='cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cvs: own update" on storage.objects for update using (bucket_id='cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cvs: own delete" on storage.objects for delete using (bucket_id='cvs' and (storage.foldername(name))[1] = auth.uid()::text);

-- Volunteer / mentor application CVs: written by the server after validation, read by people managers.
create policy "applications: staff read" on storage.objects for select using (bucket_id='applications' and public.has_perm('people'));

create policy "media: public read" on storage.objects for select using (bucket_id = 'media');
create policy "media: staff upload" on storage.objects for insert with check (bucket_id='media' and public.has_perm('media'));
create policy "media: staff update" on storage.objects for update using (bucket_id='media' and public.has_perm('media'));
create policy "media: staff delete" on storage.objects for delete using (bucket_id='media' and public.has_perm('media_delete'));

create policy "logos: public read" on storage.objects for select using (bucket_id = 'org-logos');
create policy "logos: partner write" on storage.objects for insert with check (
  bucket_id='org-logos' and (public.current_user_role() = 'partner' or public.has_perm('people'))
  and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: own update" on storage.objects for update using (bucket_id='org-logos' and (storage.foldername(name))[1] = auth.uid()::text);
