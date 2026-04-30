-- Create profiles table for user data
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  cv_text text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Create saved_jobs table
create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null,
  title text not null,
  company text not null,
  location text,
  source text,
  published_date text,
  job_type text,
  summary text,
  url text,
  match_score integer,
  match_analysis jsonb,
  status text default 'saved' check (status in ('saved', 'applied', 'interview', 'rejected', 'offer')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, job_id)
);

alter table public.saved_jobs enable row level security;

create policy "saved_jobs_select_own" on public.saved_jobs for select using (auth.uid() = user_id);
create policy "saved_jobs_insert_own" on public.saved_jobs for insert with check (auth.uid() = user_id);
create policy "saved_jobs_update_own" on public.saved_jobs for update using (auth.uid() = user_id);
create policy "saved_jobs_delete_own" on public.saved_jobs for delete using (auth.uid() = user_id);

-- Trigger to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add updated_at triggers
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at();

drop trigger if exists saved_jobs_updated_at on public.saved_jobs;
create trigger saved_jobs_updated_at
  before update on public.saved_jobs
  for each row
  execute function public.update_updated_at();
