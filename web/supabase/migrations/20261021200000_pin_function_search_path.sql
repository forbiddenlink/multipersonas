-- Supabase advisor 0011 (function_search_path_mutable): pin search_path so a caller's
-- role setting cannot redirect unqualified names. 'public, extensions, pg_temp' keeps
-- today's resolution (public + extensions) and adds pg_temp last. Idempotent.
alter function public.effective_plan(public.profiles) set search_path = public, extensions, pg_temp;
