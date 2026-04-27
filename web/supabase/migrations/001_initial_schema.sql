-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  url text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Custom personas
create table public.personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null,
  config jsonb not null default '{}',
  is_custom boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Test runs
create table public.test_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'partial')),
  overall_score integer,
  persona_ids text[] not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Findings
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references public.test_runs(id) on delete cascade,
  persona_id text not null,
  severity text not null check (severity in ('critical', 'serious', 'moderate', 'minor')),
  category text not null check (category in ('accessibility', 'usability', 'performance', 'content')),
  title text not null,
  description text not null,
  recommendation text not null,
  page_url text not null,
  screenshot_url text,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_projects_user_id on public.projects(user_id);
create index idx_personas_user_id on public.personas(user_id);
create index idx_test_runs_project_id on public.test_runs(project_id);
create index idx_test_runs_user_id on public.test_runs(user_id);
create index idx_findings_test_run_id on public.findings(test_run_id);
create index idx_findings_severity on public.findings(severity);

-- RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.personas enable row level security;
alter table public.test_runs enable row level security;
alter table public.findings enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can view own projects" on public.projects for select using (auth.uid() = user_id);
create policy "Users can create own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects for delete using (auth.uid() = user_id);

create policy "Users can view own personas" on public.personas for select using (auth.uid() = user_id);
create policy "Users can create own personas" on public.personas for insert with check (auth.uid() = user_id);
create policy "Users can update own personas" on public.personas for update using (auth.uid() = user_id);
create policy "Users can delete own personas" on public.personas for delete using (auth.uid() = user_id);

create policy "Users can view own test runs" on public.test_runs for select using (auth.uid() = user_id);
create policy "Users can create own test runs" on public.test_runs for insert with check (auth.uid() = user_id);

create policy "Users can view own findings" on public.findings for select using (
  exists (select 1 from public.test_runs where test_runs.id = findings.test_run_id and test_runs.user_id = auth.uid())
);
create policy "Users can update own findings" on public.findings for update using (
  exists (select 1 from public.test_runs where test_runs.id = findings.test_run_id and test_runs.user_id = auth.uid())
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger set_personas_updated_at before update on public.personas for each row execute function public.set_updated_at();
