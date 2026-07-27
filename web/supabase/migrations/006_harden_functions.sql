-- 006: resolve the pre-existing Supabase security advisories on the two functions from
-- migration 001 (the P2-C deploy checklist item that is code, not ops).
--
-- Both are trigger functions — they run as the table owner on INSERT/UPDATE and are never
-- meant to be called directly over the API. Pinning search_path closes the
-- function_search_path_mutable advisory; revoking EXECUTE from anon/authenticated closes
-- the anon/authenticated SECURITY DEFINER-executable advisory on handle_new_user. Neither
-- change affects the triggers, which do not run with the caller's privileges.

alter function public.handle_new_user() set search_path = public;
alter function public.set_updated_at() set search_path = public;

revoke all on function public.handle_new_user() from anon, authenticated;
revoke all on function public.set_updated_at() from anon, authenticated;
