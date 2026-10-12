-- SEC-002: evidence tables (test_runs, findings, personas) are written only by the
-- worker's service role. A signed-in user keeps exactly the writes the app performs:
-- share_* on their own test_runs, and status/owner/notes/resolved_at on their own findings.
-- Synthetic users only; everything rolls back.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000051','ev-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000052','ev-b@example.invalid');
insert into public.test_runs(id,user_id,url,status) values
 ('40000000-0000-4000-8000-000000000051','10000000-0000-4000-8000-000000000051','https://example.invalid','completed'),
 ('40000000-0000-4000-8000-000000000052','10000000-0000-4000-8000-000000000052','https://example.invalid','completed');
insert into public.findings(id,test_run_id,persona_id,severity,category,title,description,recommendation,page_url) values
 ('60000000-0000-4000-8000-000000000051','40000000-0000-4000-8000-000000000051','axe','minor','accessibility','t','d','r','https://example.invalid'),
 ('60000000-0000-4000-8000-000000000052','40000000-0000-4000-8000-000000000052','axe','minor','accessibility','t','d','r','https://example.invalid');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000051';
do $$ declare affected int; begin
 -- Forging evidence: inserts are refused outright.
 begin
   insert into public.test_runs(user_id,url,status) values
    ('10000000-0000-4000-8000-000000000051','https://forged.invalid','completed');
   raise exception 'User inserted a test_run';
 exception when sqlstate '42501' then null; end;
 begin
   insert into public.findings(test_run_id,persona_id,severity,category,title,description,recommendation,page_url) values
    ('40000000-0000-4000-8000-000000000051','axe','critical','accessibility','forged','d','r','https://example.invalid');
   raise exception 'User inserted a finding';
 exception when sqlstate '42501' then null; end;
 begin
   insert into public.personas(user_id,name,description) values ('10000000-0000-4000-8000-000000000051','x','y');
   raise exception 'User inserted a persona';
 exception when sqlstate '42501' then null; end;

 -- Destroying evidence: deletes are refused.
 begin
   delete from public.test_runs where id = '40000000-0000-4000-8000-000000000051';
   raise exception 'User deleted a test_run';
 exception when sqlstate '42501' then null; end;
 begin
   delete from public.findings where id = '60000000-0000-4000-8000-000000000051';
   raise exception 'User deleted a finding';
 exception when sqlstate '42501' then null; end;

 -- Rewriting evidence: columns outside the app's write set are refused.
 begin
   update public.test_runs set status = 'completed', url = 'https://forged.invalid'
    where id = '40000000-0000-4000-8000-000000000051';
   raise exception 'User rewrote test_run url/status';
 exception when sqlstate '42501' then null; end;
 begin
   update public.test_runs set task_success_achieved = 99 where id = '40000000-0000-4000-8000-000000000051';
   raise exception 'User rewrote test_run score';
 exception when sqlstate '42501' then null; end;
 begin
   update public.test_runs set user_id = '10000000-0000-4000-8000-000000000052'
    where id = '40000000-0000-4000-8000-000000000051';
   raise exception 'User reassigned a test_run owner';
 exception when sqlstate '42501' then null; end;
 begin
   update public.findings set title = 'forged', severity = 'critical' where id = '60000000-0000-4000-8000-000000000051';
   raise exception 'User rewrote finding title/severity';
 exception when sqlstate '42501' then null; end;
 begin
   update public.findings set test_run_id = '40000000-0000-4000-8000-000000000052'
    where id = '60000000-0000-4000-8000-000000000051';
   raise exception 'User moved a finding to another run';
 exception when sqlstate '42501' then null; end;

 -- What the app does still works: share_* on own run (web/src/app/(app)/audits/[id]/report/share-actions.ts).
 update public.test_runs
    set share_token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        share_expires_at = now() + interval '7 days', share_revoked_at = null
  where id = '40000000-0000-4000-8000-000000000051';
 get diagnostics affected = row_count;
 if affected <> 1 then raise exception 'Owner could not mint a share link'; end if;
 update public.test_runs set share_revoked_at = now() where id = '40000000-0000-4000-8000-000000000051';
 get diagnostics affected = row_count;
 if affected <> 1 then raise exception 'Owner could not revoke a share link'; end if;

 -- Finding workflow (web/src/app/(app)/audits/[id]/actions.ts), including the updated_at trigger.
 update public.findings set status = 'fixed', owner = 'me', notes = 'done', resolved_at = now()
  where id = '60000000-0000-4000-8000-000000000051';
 get diagnostics affected = row_count;
 if affected <> 1 then raise exception 'Owner could not update finding workflow'; end if;

 -- RLS still scopes the allowed writes: B's rows are untouched.
 update public.test_runs set share_revoked_at = now() where id = '40000000-0000-4000-8000-000000000052';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'User updated another user run'; end if;
 update public.findings set status = 'fixed' where id = '60000000-0000-4000-8000-000000000052';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'User updated another user finding'; end if;
end $$;
reset role;

do $$ begin
 if not exists (select 1 from public.findings where id = '60000000-0000-4000-8000-000000000051'
     and status = 'fixed' and title = 't' and severity = 'minor' and updated_at is not null) then
   raise exception 'Workflow update must land and leave evidence columns intact';
 end if;
 if not exists (select 1 from public.test_runs where id = '40000000-0000-4000-8000-000000000051'
     and url = 'https://example.invalid' and share_token is not null) then
   raise exception 'Run evidence must be intact and share link set';
 end if;
end $$;

-- anon has no write path either.
set local role anon;
do $$ begin
 begin
   insert into public.test_runs(user_id,url) values ('10000000-0000-4000-8000-000000000051','https://x.invalid');
   raise exception 'anon inserted a test_run';
 exception when sqlstate '42501' then null; end;
end $$;
rollback;
