-- ABU-002: profiles.trial_ends_at marks trialing subscribers so the spend path can apply a
-- lower per-caller cap. Only the billing webhook (service role) may write it; a user who
-- could clear it would escape the trial cap.
begin;
insert into auth.users(id,email) values ('10000000-0000-4000-8000-000000000071','trial@example.invalid');
do $$ begin
 if (select trial_ends_at from public.profiles where id = '10000000-0000-4000-8000-000000000071') is not null then
   raise exception 'trial_ends_at must default to null';
 end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000071';
do $$ begin
 begin
   update public.profiles set trial_ends_at = null where id = '10000000-0000-4000-8000-000000000071';
   raise exception 'User wrote trial_ends_at';
 exception when sqlstate '42501' then null; end;
 if (select count(*) from public.profiles where id = '10000000-0000-4000-8000-000000000071') <> 1 then
   raise exception 'User must still read their own profile row';
 end if;
end $$;
reset role;
set local role service_role;
do $$ begin
 update public.profiles set trial_ends_at = now() + interval '7 days' where id = '10000000-0000-4000-8000-000000000071';
 if (select trial_ends_at from public.profiles where id = '10000000-0000-4000-8000-000000000071') is null then
   raise exception 'service_role must be able to set trial_ends_at';
 end if;
end $$;
rollback;
