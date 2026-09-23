-- Let an account delete replay screenshots for its own runs.
-- The worker uploads with the service role, so storage.objects.owner is not the
-- account. Match the existing read policy: the first folder is the test run id.
-- App code removes objects before the project cascade, because this policy can
-- see a run only while that row still exists.

drop policy if exists "Owners can delete own journey screenshots" on storage.objects;
create policy "Owners can delete own journey screenshots" on storage.objects
  for delete to authenticated using (
    bucket_id = 'journeys'
    and exists (
      select 1 from public.test_runs tr
      where tr.user_id = (select auth.uid())
        and (storage.foldername(name))[1] = tr.id::text
    )
  );
