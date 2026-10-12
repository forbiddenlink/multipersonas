-- SEC-002: evidence tables become worker-written only.
--
-- RLS let every signed-in user insert, update and delete their own test_runs, findings and
-- personas through the public anon key. Only the worker (service role, which bypasses RLS)
-- should create or alter evidence. Without this, a user could fabricate a "completed" run
-- with invented findings, mint a share link for it, and host a forged report on
-- /r/<token>, or edit and delete real findings before sending a client deliverable.
--
-- What the web app writes with a user session (grep of web/src, kept working here):
--   test_runs: share_token, share_expires_at, share_revoked_at   (share-actions.ts)
--   findings : status, owner, notes, resolved_at                  (audits/[id]/actions.ts)
-- Nothing in web/src or worker/src writes personas with a user session, and the worker
-- uses the service role for everything else.
--
-- Mechanism: RLS cannot restrict columns, so table-level privileges are revoked and only
-- the column-level UPDATE grants above are given back (the pattern from 025 for profiles).
-- The remaining update policies still scope those writes to the caller's own rows. Insert
-- and delete grants are removed entirely, and the matching policies are dropped so a later
-- accidental re-grant does not silently reopen the path. The findings updated_at trigger
-- keeps working: trigger assignments to NEW are not column-privilege checked.
--
-- Additive and replayable: policies are dropped by name, revoke and grant are idempotent.
-- Existing rows are not rewritten. Apply BEFORE merging any code that depends on it; the
-- web code needs no change.

revoke insert, update, delete on public.test_runs from public, anon, authenticated;
revoke insert, update, delete on public.findings from public, anon, authenticated;
revoke insert, update, delete on public.personas from public, anon, authenticated;

grant update (share_token, share_expires_at, share_revoked_at) on public.test_runs to authenticated;
grant update (status, owner, notes, resolved_at) on public.findings to authenticated;

drop policy if exists "Users can create own test runs" on public.test_runs;
drop policy if exists "Users can delete own test runs" on public.test_runs;
drop policy if exists "Users can create findings for own test runs" on public.findings;
drop policy if exists "Users can delete own findings" on public.findings;
drop policy if exists "Users can create own personas" on public.personas;
drop policy if exists "Users can update own personas" on public.personas;
drop policy if exists "Users can delete own personas" on public.personas;
