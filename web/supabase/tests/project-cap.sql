-- Synthetic fixtures only. The database, not the app, refuses a project past the plan cap.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-0000000000c1','cap-free@example.invalid'),
 ('10000000-0000-4000-8000-0000000000c2','cap-pro@example.invalid'),
 ('10000000-0000-4000-8000-0000000000c3','cap-team@example.invalid'),
 ('10000000-0000-4000-8000-0000000000c4','cap-over@example.invalid');
update public.profiles set plan = 'pro' where id = '10000000-0000-4000-8000-0000000000c2';
update public.profiles set plan = 'team' where id = '10000000-0000-4000-8000-0000000000c3';

do $$ declare n int; begin
 -- Free: the first project is allowed, the second is refused with the contract error.
 insert into public.projects(user_id,name,url) values ('10000000-0000-4000-8000-0000000000c1','One','https://example.invalid');
 begin
   insert into public.projects(user_id,name,url) values ('10000000-0000-4000-8000-0000000000c1','Two','https://example.invalid');
   raise exception 'Second free project was accepted';
 exception when sqlstate 'PA001' then
   if sqlerrm <> 'project_limit' then raise exception 'Unexpected message: %', sqlerrm; end if;
 end;
 select count(*) into n from public.projects where user_id = '10000000-0000-4000-8000-0000000000c1';
 if n <> 1 then raise exception 'Free user should hold exactly 1 project, has %', n; end if;

 -- Pro: five allowed, sixth refused.
 insert into public.projects(user_id,name,url)
  select '10000000-0000-4000-8000-0000000000c2','P' || g,'https://example.invalid' from generate_series(1,5) g;
 begin
   insert into public.projects(user_id,name,url) values ('10000000-0000-4000-8000-0000000000c2','P6','https://example.invalid');
   raise exception 'Sixth pro project was accepted';
 exception when sqlstate 'PA001' then null;
 end;

 -- Team: unlimited.
 insert into public.projects(user_id,name,url)
  select '10000000-0000-4000-8000-0000000000c3','T' || g,'https://example.invalid' from generate_series(1,12) g;

 -- Already over the line: existing projects stay, new inserts are refused.
 update public.profiles set plan = 'team' where id = '10000000-0000-4000-8000-0000000000c4';
 insert into public.projects(user_id,name,url)
  select '10000000-0000-4000-8000-0000000000c4','O' || g,'https://example.invalid' from generate_series(1,3) g;
 update public.profiles set plan = 'free' where id = '10000000-0000-4000-8000-0000000000c4';
 select count(*) into n from public.projects where user_id = '10000000-0000-4000-8000-0000000000c4';
 if n <> 3 then raise exception 'Downgrade must keep existing projects, has %', n; end if;
 update public.projects set name = 'Renamed' where user_id = '10000000-0000-4000-8000-0000000000c4';
 begin
   insert into public.projects(user_id,name,url) values ('10000000-0000-4000-8000-0000000000c4','New','https://example.invalid');
   raise exception 'Over-the-line owner created another project';
 exception when sqlstate 'PA001' then null;
 end;

 -- The trigger function is not callable over the API.
 if has_function_privilege('anon','public.enforce_project_cap()','execute') or
    has_function_privilege('authenticated','public.enforce_project_cap()','execute') then
   raise exception 'enforce_project_cap must not be executable by API roles';
 end if;
end $$;

-- Through the real API role, RLS plus the cap: a free caller is refused at the database.
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-0000000000c1';
do $$ begin
 begin
   insert into public.projects(user_id,name,url) values ('10000000-0000-4000-8000-0000000000c1','Three','https://example.invalid');
   raise exception 'Authenticated free caller created a second project';
 exception when sqlstate 'PA001' then null;
 end;
end $$;
rollback;
