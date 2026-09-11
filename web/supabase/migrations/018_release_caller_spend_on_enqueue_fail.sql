-- Refund global + per-caller spend when a run never started (enqueue failed after
-- reserve_model_calls_scoped). Worker/reaper failures still use release_model_calls
-- (global only) — the caller sub-cap remains a fairness ceiling for runs that ran.

create or replace function public.release_model_calls_scoped(
  p_calls int,
  p_caller text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'utc')::date;
begin
  if p_calls is null or p_calls <= 0 then
    return;
  end if;

  update public.usage_counters
    set model_calls = greatest(0, model_calls - p_calls),
        runs = greatest(0, runs - 1)
    where day = v_day;

  if p_caller is not null and length(p_caller) > 0 then
    update public.usage_counters_by_caller
      set model_calls = greatest(0, model_calls - p_calls)
      where day = v_day and caller = p_caller;
  end if;
end;
$$;

revoke all on function public.release_model_calls_scoped(int, text)
  from public, anon, authenticated;
grant execute on function public.release_model_calls_scoped(int, text) to service_role;
