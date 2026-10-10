-- Report share links: anon can redeem one token and nothing else.
-- Synthetic users only; everything rolls back.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000031','share-owner@example.invalid'),
 ('10000000-0000-4000-8000-000000000032','share-other@example.invalid');
update public.profiles set plan = 'team', agency_name = 'Acme Access'
  where id = '10000000-0000-4000-8000-000000000031';
insert into public.projects(id,user_id,name,url) values
 ('20000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000031','Client One','https://example.invalid');

-- Valid, expired, revoked, never-expiring (null expiry), and pending runs.
insert into public.test_runs(id,project_id,user_id,url,status,share_token,share_expires_at,share_revoked_at) values
 ('30000000-0000-4000-8000-000000000031','20000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000031','https://example.invalid/a','completed',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', now() + interval '1 day', null),
 ('30000000-0000-4000-8000-000000000032','20000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000031','https://example.invalid/b','completed',
  'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', now() - interval '1 minute', null),
 ('30000000-0000-4000-8000-000000000033','20000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000031','https://example.invalid/c','completed',
  'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', now() + interval '1 day', now()),
 ('30000000-0000-4000-8000-000000000034','20000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000031','https://example.invalid/d','completed',
  'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', null, null),
 ('30000000-0000-4000-8000-000000000035','20000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000031','https://example.invalid/e','running',
  'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', now() + interval '1 day', null);

-- A run pointing at ANOTHER user's project (the existing update policy allows it) must not
-- leak that project's name through a share link.
insert into public.projects(id,user_id,name,url) values
 ('20000000-0000-4000-8000-000000000032','10000000-0000-4000-8000-000000000032','Foreign Secret Client','https://example.invalid');
insert into public.test_runs(id,project_id,user_id,url,status,share_token,share_expires_at) values
 ('30000000-0000-4000-8000-000000000036','20000000-0000-4000-8000-000000000032','10000000-0000-4000-8000-000000000031','https://example.invalid/f','completed',
  'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', now() + interval '1 day');

insert into public.findings(test_run_id,persona_id,severity,category,title,description,recommendation,page_url,source,rule_id,wcag_tags) values
 ('30000000-0000-4000-8000-000000000031','axe','serious','accessibility','Axe finding','d','r','https://example.invalid/a','axe','color-contrast','{wcag2aa}'),
 ('30000000-0000-4000-8000-000000000031','p1','minor','usability','Persona opinion','d','r','https://example.invalid/a','persona',null,null);
insert into public.journey_steps(test_run_id,persona_id,step,action,reasoning,goal_completed,page_url) values
 ('30000000-0000-4000-8000-000000000031','p1',1,'click','private narration',true,'https://example.invalid/a');

-- Anonymous callers.
set local role anon;
do $$
declare cols text[]; n int; fn text;
begin
  -- No listing: a token never widens what anon can read directly.
  if (select count(*) from public.test_runs) <> 0 then
    raise exception 'anon must not list test_runs';
  end if;
  if (select count(*) from public.findings) <> 0 then
    raise exception 'anon must not list findings';
  end if;
  if (select count(*) from public.journey_steps) <> 0 then
    raise exception 'anon must not list journey_steps';
  end if;
  begin
    update public.test_runs set share_revoked_at = now();
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'anon must not update test_runs'; end if;
  exception when insufficient_privilege then null;
  end;

  -- The internal resolver is not callable by API roles.
  if has_function_privilege('anon', 'public._shared_run_id(text)', 'execute')
     or has_function_privilege('authenticated', 'public._shared_run_id(text)', 'execute') then
    raise exception 'resolver must not be executable by API roles';
  end if;

  -- Valid token: one run row, only axe findings, journey reduced to four columns.
  if (select count(*) from public.get_shared_report('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')) <> 1 then
    raise exception 'valid token must return exactly one run';
  end if;
  if (select agency_name from public.get_shared_report('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')) is distinct from 'Acme Access' then
    raise exception 'team plan agency name must be returned';
  end if;
  if (select client_name from public.get_shared_report('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')) is distinct from 'Client One' then
    raise exception 'client name must be returned';
  end if;
  if (select count(*) from public.get_shared_report_findings('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')) <> 1 then
    raise exception 'only axe findings may be returned';
  end if;
  if (select count(*) from public.get_shared_report_journey('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')) <> 1 then
    raise exception 'journey rows must be returned for a valid token';
  end if;

  if (select count(*) from public.get_shared_report('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')) <> 1
     or (select client_name from public.get_shared_report('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')) is not null then
    raise exception 'a foreign project name must not be returned';
  end if;

  -- Expired, revoked, null expiry, not completed, unknown, malformed, null: nothing.
  foreach fn in array array[
    'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
    'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
    'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
    '', 'short'
  ] loop
    if (select count(*) from public.get_shared_report(fn)) <> 0
       or (select count(*) from public.get_shared_report_findings(fn)) <> 0
       or (select count(*) from public.get_shared_report_journey(fn)) <> 0 then
      raise exception 'token % must not resolve', fn;
    end if;
  end loop;
  if (select count(*) from public.get_shared_report(null)) <> 0 then
    raise exception 'null token must not resolve';
  end if;
end $$;
reset role;

-- The returned column lists never include owner, token, billing or internal fields.
do $$
declare names text[]; forbidden text[] := array[
  'user_id','email','share_token','share_expires_at','share_revoked_at','project_id',
  'stripe_customer_id','plan','reasoning','screenshot_path','status','dismissed'];
begin
  select coalesce(array_agg(n), '{}') into names
  from pg_proc p, unnest(p.proargnames) as n
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('get_shared_report','get_shared_report_findings','get_shared_report_journey')
    and n = any(forbidden);
  if array_length(names, 1) is not null then
    raise exception 'shared report functions expose forbidden columns: %', names;
  end if;
end $$;

-- A non-owner cannot mint or revoke; a short token violates the format check.
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000032';
do $$
declare n int;
begin
  update public.test_runs set share_revoked_at = now()
    where id = '30000000-0000-4000-8000-000000000031';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'non-owner must not revoke another user link'; end if;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000031';
do $$
declare n int;
begin
  update public.test_runs set share_revoked_at = now()
    where id = '30000000-0000-4000-8000-000000000031';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'owner must be able to revoke their own link'; end if;
  if (select count(*) from public.get_shared_report('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')) <> 0 then
    raise exception 'revoked token must stop resolving immediately';
  end if;
  begin
    update public.test_runs set share_token = 'short'
      where id = '30000000-0000-4000-8000-000000000031';
    raise exception 'a short token must violate the format check';
  exception when check_violation then null;
  end;
end $$;
rollback;
