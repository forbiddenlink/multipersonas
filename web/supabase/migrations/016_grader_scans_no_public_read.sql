-- Remove the public-read policy on grader_scans.
--
-- 015 created it with `using (true)`, which — combined with the default anon SELECT
-- grant + the Data API — let ANY holder of the public NEXT_PUBLIC anon key run
-- `from('grader_scans').select('*')` and enumerate EVERY scan (token, entry_url, full
-- report JSON, pages_visited). Listing needs no token, so the "shared by unguessable
-- token" model was defeated: the token filter was a convention, not a boundary.
--
-- Fix: grader reads now go through the service-role client scoped to the exact token
-- (web/src/lib/grade.ts), the same capability-URL pattern the audit_jobs poll uses.
-- RLS stays enabled; with no SELECT policy anon/authenticated get nothing, and only the
-- service role (which bypasses RLS, used by the worker + enqueue route) can read/write.

drop policy if exists grader_scans_public_read on public.grader_scans;
