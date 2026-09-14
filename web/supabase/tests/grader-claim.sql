-- Claiming a grade token assigns it once. Authenticated clients still cannot
-- read or update grader_scans directly (service-role API only).
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000013','grade-owner@example.invalid'),
 ('10000000-0000-4000-8000-000000000014','grade-other@example.invalid');
insert into public.grader_scans(token, entry_url, status)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','https://example.invalid/','completed');

do $$ begin
  update public.grader_scans
     set user_id = '10000000-0000-4000-8000-000000000013'
   where token = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     and user_id is null;
  if (select user_id from public.grader_scans where token = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
     is distinct from '10000000-0000-4000-8000-000000000013' then
    raise exception 'unowned grade must claim to the first owner';
  end if;

  update public.grader_scans
     set user_id = '10000000-0000-4000-8000-000000000014'
   where token = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     and user_id is null;
  if (select user_id from public.grader_scans where token = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
     is distinct from '10000000-0000-4000-8000-000000000013' then
    raise exception 'a claimed grade must not move to a second owner';
  end if;
end $$;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000013';
do $$ begin
  if (select count(*) from public.grader_scans) <> 0 then
    raise exception 'authenticated must not read grader_scans through RLS';
  end if;
end $$;
rollback;
