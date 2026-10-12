-- ABU-001: paid/persona audits are claimed before anonymous grades, but a grade that has
-- waited past the aging window regains FIFO priority so it cannot starve. Synthetic rows
-- in a disposable database; everything rolls back.
begin;
delete from public.audit_jobs;
insert into public.audit_jobs(id, url, kind, status, created_at) values
 -- Oldest: two fresh grades, then an audit queued later.
 ('32000000-0000-4000-8000-000000000001','https://example.invalid/g1','grade','queued', now() - interval '5 minutes'),
 ('32000000-0000-4000-8000-000000000002','https://example.invalid/g2','grade','queued', now() - interval '4 minutes'),
 ('32000000-0000-4000-8000-000000000003','https://example.invalid/a1','audit','queued', now() - interval '3 minutes'),
 ('32000000-0000-4000-8000-000000000004','https://example.invalid/a2','audit','queued', now() - interval '2 minutes');

do $$ declare j public.audit_jobs; begin
 j := public.claim_audit_job();
 if j.id <> '32000000-0000-4000-8000-000000000003' then
   raise exception 'Oldest audit must be claimed before older fresh grades; got %', j.url;
 end if;
 if j.status <> 'running' or j.attempts <> 1 or j.started_at is null then
   raise exception 'Claim must still mark the job running';
 end if;
 j := public.claim_audit_job();
 if j.id <> '32000000-0000-4000-8000-000000000004' then
   raise exception 'Next audit must come before fresh grades; got %', j.url;
 end if;
 j := public.claim_audit_job();
 if j.id <> '32000000-0000-4000-8000-000000000001' then
   raise exception 'With no audits left, grades drain oldest first; got %', j.url;
 end if;
 j := public.claim_audit_job();
 if j.id <> '32000000-0000-4000-8000-000000000002' then
   raise exception 'Last grade must be claimed; got %', j.url;
 end if;
 if (public.claim_audit_job()).id is not null then
   raise exception 'Empty queue must return a null row';
 end if;
end $$;

-- Aging: a grade queued longer than the window ties with audits and wins on created_at.
delete from public.audit_jobs;
insert into public.audit_jobs(id, url, kind, status, created_at) values
 ('32000000-0000-4000-8000-000000000011','https://example.invalid/old-grade','grade','queued', now() - interval '30 minutes'),
 ('32000000-0000-4000-8000-000000000012','https://example.invalid/new-audit','audit','queued', now() - interval '1 minute'),
 ('32000000-0000-4000-8000-000000000013','https://example.invalid/new-grade','grade','queued', now() - interval '2 minutes');
do $$ begin
 if (public.claim_audit_job()).id <> '32000000-0000-4000-8000-000000000011' then
   raise exception 'An aged grade must not be starved by newer audits';
 end if;
 if (public.claim_audit_job()).id <> '32000000-0000-4000-8000-000000000012' then
   raise exception 'Audit goes before the remaining fresh grade';
 end if;
end $$;

-- Signature, security mode and grants are unchanged.
do $$ begin
 if not (select prosecdef from pg_proc where oid = 'public.claim_audit_job()'::regprocedure) then
   raise exception 'claim_audit_job must stay SECURITY DEFINER';
 end if;
 if has_function_privilege('anon', 'public.claim_audit_job()', 'execute')
    or has_function_privilege('authenticated', 'public.claim_audit_job()', 'execute') then
   raise exception 'claim_audit_job must stay service-only';
 end if;
 if not has_function_privilege('service_role', 'public.claim_audit_job()', 'execute') then
   raise exception 'service_role must keep execute';
 end if;
 if not exists (select 1 from pg_proc where oid = 'public.claim_audit_job()'::regprocedure
    and proconfig @> array['search_path=public']) then
   raise exception 'search_path must stay pinned';
 end if;
end $$;
rollback;
