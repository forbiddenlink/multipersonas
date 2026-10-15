begin;
-- Isolated local test database only; everything rolls back with the fixtures.
do $$
declare
  v_job uuid;
  v_token uuid;
  v_token2 uuid;
  v_status text;
  v_claimed text;
  v_token3 uuid;
  v_job3 uuid;
begin
  -- Boundary: only the service role may touch the table or call the functions.
  if has_table_privilege('anon', 'public.grade_email_requests', 'select')
     or has_table_privilege('authenticated', 'public.grade_email_requests', 'select')
     or has_table_privilege('authenticated', 'public.grade_email_requests', 'insert') then
    raise exception 'grade_email_requests must not be reachable by anon or authenticated';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.grade_email_requests'::regclass) then
    raise exception 'grade_email_requests must have RLS enabled';
  end if;
  if exists (select 1 from pg_policies where tablename = 'grade_email_requests') then
    raise exception 'grade_email_requests must have no policies';
  end if;
  if has_function_privilege('anon', 'public.request_grade_email(uuid,text,text,int,text,int,int)', 'execute')
     or has_function_privilege('authenticated', 'public.claim_grade_email(uuid)', 'execute') then
    raise exception 'grade email functions must be service-role only';
  end if;

  select token into v_token from public.enqueue_grade_scan('https://example.invalid/e1', 'grade:email-test-a', 25, 100, 600);
  select token into v_token2 from public.enqueue_grade_scan('https://example.invalid/e2', 'grade:email-test-a', 25, 100, 600);

  -- Unknown grade
  if public.request_grade_email(gen_random_uuid(), 'a@example.com', 'ip:t', 5, 'to:a', 3, 86400) <> 'not_found' then
    raise exception 'unknown token must be not_found';
  end if;

  -- Save, then a second request for the same grade is refused and does not spend quota.
  if public.request_grade_email(v_token, 'a@example.com', 'ip:t', 5, 'to:a', 3, 86400) <> 'saved' then
    raise exception 'first request must save';
  end if;
  if public.request_grade_email(v_token, 'other@example.com', 'ip:t', 5, 'to:b', 3, 86400) <> 'exists' then
    raise exception 'one request per grade';
  end if;
  if (select count from public.rate_limits where key = 'ip:t') <> 1 then
    raise exception 'a refused duplicate must not consume the caller allowance';
  end if;

  -- Not sendable while the grade is unfinished.
  if public.claim_grade_email(v_token) is not null then
    raise exception 'must not claim before the grade finishes';
  end if;

  -- Per-recipient cap: a third party cannot be mailed more than the cap.
  update public.rate_limits set count = 3 where key = 'to:a';
  if public.request_grade_email(v_token2, 'a@example.com', 'ip:t2', 5, 'to:a', 3, 86400) <> 'rate_limited' then
    raise exception 'recipient cap must refuse';
  end if;
  if exists (select 1 from public.grade_email_requests where token = v_token2) then
    raise exception 'a refused request must not store the address';
  end if;
  -- Per-caller cap
  update public.rate_limits set count = 5 where key = 'ip:t';
  if public.request_grade_email(v_token2, 'c@example.com', 'ip:t', 5, 'to:c', 3, 86400) <> 'rate_limited' then
    raise exception 'caller cap must refuse';
  end if;

  -- Finish the grade: exactly one claim wins, the second is refused while leased.
  update public.grader_scans set status = 'completed' where token = v_token;
  update public.audit_jobs set status = 'completed' where id = (select job_id from public.grader_scans where token = v_token);
  if public.claim_grade_email(v_token) is distinct from 'a@example.com' then
    raise exception 'a finished grade must be claimable';
  end if;
  if public.claim_grade_email(v_token) is not null then
    raise exception 'a leased claim must not be handed out twice';
  end if;

  -- Failed send releases the lease; success erases the address and keeps the tombstone.
  perform public.finish_grade_email(v_token, false);
  if public.claim_grade_email(v_token) is distinct from 'a@example.com' then
    raise exception 'a released claim must be claimable again';
  end if;
  perform public.finish_grade_email(v_token, true);
  if (select email from public.grade_email_requests where token = v_token) is not null then
    raise exception 'the address must be erased after the send';
  end if;
  if (select sent_at from public.grade_email_requests where token = v_token) is null then
    raise exception 'sent_at must be stamped';
  end if;
  if public.claim_grade_email(v_token) is not null then
    raise exception 'a sent request must never be claimable again';
  end if;
  if public.request_grade_email(v_token, 'again@example.com', 'ip:z', 5, 'to:z', 3, 86400) <> 'exists' then
    raise exception 'a tombstone must block a second email for the same grade';
  end if;

  -- Three failed attempts null the address without sending.
  update public.grader_scans set status = 'failed' where token = v_token2;
  update public.audit_jobs set status = 'failed' where id = (select job_id from public.grader_scans where token = v_token2);
  delete from public.rate_limits where key in ('ip:t', 'to:a');
  perform public.request_grade_email(v_token2, 'd@example.com', 'ip:t', 5, 'to:d', 3, 86400);
  for i in 1..3 loop
    v_claimed := public.claim_grade_email(v_token2);
    perform public.finish_grade_email(v_token2, false);
  end loop;
  if public.claim_grade_email(v_token2) is not null then
    raise exception 'after three attempts nothing may be claimed';
  end if;
  if (select email from public.grade_email_requests where token = v_token2) is not null then
    raise exception 'after three attempts the address must be dropped';
  end if;

  -- Reaper dead-letter: only audit_jobs is failed, the scan row stays running. Must still notify.
  select token, job_id into v_token3, v_job3 from public.enqueue_grade_scan('https://example.invalid/e3', 'grade:email-test-a', 25, 100, 600);
  perform public.request_grade_email(v_token3, 'e@example.com', 'ip:e', 5, 'to:e', 3, 86400);
  update public.grader_scans set status = 'running' where token = v_token3;
  update public.audit_jobs set status = 'running' where id = v_job3;
  if public.claim_grade_email(v_token3) is not null then raise exception 'running grade must not be claimable'; end if;
  update public.audit_jobs set status = 'failed' where id = v_job3;
  if not exists (select 1 from public.pending_grade_email_tokens(10) where token = v_token3) then
    raise exception 'a reaper-failed job must show up in the sweep';
  end if;
  if public.claim_grade_email(v_token3) is distinct from 'e@example.com' then
    raise exception 'a job failed by the reaper must be claimable';
  end if;
  perform public.finish_grade_email(v_token3, false);

  -- Completion race: scan row already completed, job row not yet. Not ready.
  update public.grader_scans set status = 'completed' where token = v_token3;
  update public.audit_jobs set status = 'running' where id = v_job3;
  if public.claim_grade_email(v_token3) is not null then
    raise exception 'scan completed but job still running must not be claimable';
  end if;
  if exists (select 1 from public.pending_grade_email_tokens(10) where token = v_token3) then
    raise exception 'the sweep must use the same status source';
  end if;
  update public.audit_jobs set status = 'completed' where id = v_job3;

  -- A refund gives the attempt back and clears the 23 hour clock if it was the only attempt.
  update public.grade_email_requests set attempts = 0, first_attempt_at = null, claimed_at = null where token = v_token3;
  perform public.claim_grade_email(v_token3);
  perform public.finish_grade_email(v_token3, false, true);
  if (select attempts from public.grade_email_requests where token = v_token3) <> 0
     or (select first_attempt_at from public.grade_email_requests where token = v_token3) is not null then
    raise exception 'a refund must restore attempts and the first-attempt clock';
  end if;

  -- 23 hour retry window: no automatic retry after Resend's idempotency window can lapse.
  perform public.claim_grade_email(v_token3);
  perform public.finish_grade_email(v_token3, false);
  update public.grade_email_requests set first_attempt_at = now() - interval '24 hours' where token = v_token3;
  if exists (select 1 from public.pending_grade_email_tokens(10) where token = v_token3) then
    raise exception 'the sweep must not retry after 23 hours';
  end if;
  if public.claim_grade_email(v_token3) is not null then raise exception 'no claim after 23 hours'; end if;
  if (select email from public.grade_email_requests where token = v_token3) is not null then
    raise exception 'the address must be dropped once the retry window closes';
  end if;

  -- Hard TTL
  update public.grade_email_requests set created_at = now() - interval '8 days' where token = v_token;
  perform public.prune_grade_email_requests();
  if exists (select 1 from public.grade_email_requests where token = v_token) then
    raise exception 'rows older than 7 days must be deleted';
  end if;

  -- Old grades refuse new requests
  update public.grader_scans set created_at = now() - interval '2 days' where token = v_token;
  if public.request_grade_email(v_token, 'late@example.com', 'ip:y', 5, 'to:y', 3, 86400) <> 'expired' then
    raise exception 'grades older than a day must be refused';
  end if;
end $$;
rollback;
