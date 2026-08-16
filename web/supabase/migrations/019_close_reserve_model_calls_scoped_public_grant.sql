-- 019: close a live PUBLIC-execute gap on reserve_model_calls_scoped left by migration 017.
--
-- 017 revoked EXECUTE from anon/authenticated but not from PUBLIC, repeating the exact
-- mistake 006 made and 007 had to correct for the earlier spend/rate-limit functions:
-- Postgres grants EXECUTE to PUBLIC by default, and anon/authenticated inherit it, so
-- revoking from those two roles specifically leaves the grant in effect. Confirmed LIVE via
-- `supabase db advisors --linked --type security`
-- (anon_security_definer_function_executable / authenticated_security_definer_function_executable
-- on reserve_model_calls_scoped) — this is a real hole, not lint noise: the function is
-- SECURITY DEFINER and directly mutates usage_counters / usage_counters_by_caller (the
-- spend-cap ledger) using caller-supplied p_cap/p_caller/p_caller_cap, so an anonymous caller
-- hitting /rest/v1/rpc/reserve_model_calls_scoped directly (bypassing /api/audit's rate limit
-- and URL validation entirely) could inflate the global daily counter (denial of service
-- against every caller) or target a specific caller's sub-cap counter by name.
--
-- release_model_calls_scoped (018) already has the correct from-PUBLIC revoke; this brings
-- reserve_model_calls_scoped in line with it.

revoke all on function public.reserve_model_calls_scoped(int, int, text, int)
  from public, anon, authenticated;
grant execute on function public.reserve_model_calls_scoped(int, int, text, int) to service_role;
