-- SEC-013: expired rate_limits and usage_counters_by_caller rows are pruned as a side
-- effect of consume_rate_limit, and the limiter itself behaves as before.
begin;
delete from public.rate_limits;
delete from public.usage_counters_by_caller;
insert into public.rate_limits(key, window_start, count) values
 ('old-1', now() - interval '3 days', 5),
 ('old-2', now() - interval '2 days', 5),
 ('recent', now() - interval '2 hours', 5);
insert into public.usage_counters_by_caller(day, caller, model_calls) values
 ((now() at time zone 'utc')::date - 10, 'old-caller', 100),
 ((now() at time zone 'utc')::date, 'today-caller', 10);

do $$ begin
 -- Limiter behaviour is unchanged.
 if not public.consume_rate_limit('k', 2, 600) then raise exception 'first call must pass'; end if;
 if not public.consume_rate_limit('k', 2, 600) then raise exception 'second call must pass'; end if;
 if public.consume_rate_limit('k', 2, 600) then raise exception 'third call must be limited'; end if;

 if exists (select 1 from public.rate_limits where key in ('old-1','old-2')) then
   raise exception 'Expired rate_limits rows must be pruned';
 end if;
 if not exists (select 1 from public.rate_limits where key = 'recent') then
   raise exception 'A row inside the retention window must be kept';
 end if;
 if not exists (select 1 from public.rate_limits where key = 'k' and count = 3) then
   raise exception 'Active limiter row must be kept';
 end if;
 if exists (select 1 from public.usage_counters_by_caller where caller = 'old-caller') then
   raise exception 'Old per-caller spend rows must be pruned';
 end if;
 if not exists (select 1 from public.usage_counters_by_caller where caller = 'today-caller') then
   raise exception 'Today per-caller spend must be kept';
 end if;
 if has_function_privilege('anon', 'public.consume_rate_limit(text,int,int)', 'execute')
    or has_function_privilege('authenticated', 'public.consume_rate_limit(text,int,int)', 'execute') then
   raise exception 'consume_rate_limit must stay service-only';
 end if;
end $$;

-- Pruning is bounded per call, so a large backlog drains over many calls instead of
-- stalling one request.
delete from public.rate_limits;
insert into public.rate_limits(key, window_start, count)
  select 'bulk-' || g, now() - interval '5 days', 1 from generate_series(1, 500) g;
select public.consume_rate_limit('trigger', 5, 600);
do $$ declare n int; begin
 select count(*) into n from public.rate_limits where key like 'bulk-%';
 if n = 500 then raise exception 'A call must prune some expired rows'; end if;
 if n < 400 then raise exception 'A single call must not delete an unbounded batch (left %)', n; end if;
end $$;
rollback;
