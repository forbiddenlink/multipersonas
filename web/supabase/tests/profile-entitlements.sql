-- Run with psql -v ON_ERROR_STOP=1 against an isolated database with all migrations.
begin;
insert into auth.users(id,email) values ('10000000-0000-4000-8000-000000000002','profile-test@example.invalid');
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
do $$ begin
  begin
    update public.profiles set plan = 'pro' where id = auth.uid();
  exception when insufficient_privilege then
    return;
  end;
  raise exception 'Authenticated users must not grant themselves Pro';
end $$;
update public.profiles set agency_name = 'Synthetic agency' where id = auth.uid();
do $$ begin
  if not exists (select 1 from public.profiles where id = auth.uid() and agency_name = 'Synthetic agency' and plan = 'free') then
    raise exception 'Ordinary profile editing must still work without changing the plan';
  end if;
end $$;
set local role service_role;
update public.profiles set plan = 'pro' where id = '10000000-0000-4000-8000-000000000002';
do $$ begin
  if not exists (select 1 from public.profiles where id = '10000000-0000-4000-8000-000000000002' and plan = 'pro') then
    raise exception 'Trusted service must still be able to grant Pro';
  end if;
end $$;
rollback;
