-- Supabase schema for JobSearchAgent-v1
-- Run this in Supabase SQL Editor when setting up a new project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  cv_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null,
  title text not null,
  company text,
  location text,
  source text,
  published_date text,
  job_type text,
  summary text,
  url text,
  match_score integer,
  match_analysis jsonb,
  application_pack jsonb,
  status text not null default 'saved',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, job_id)
);

alter table public.saved_jobs
add column if not exists application_pack jsonb;

alter table public.profiles enable row level security;
alter table public.saved_jobs enable row level security;

create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can read own saved jobs"
on public.saved_jobs
for select
using (auth.uid() = user_id);

create policy "Users can insert own saved jobs"
on public.saved_jobs
for insert
with check (auth.uid() = user_id);

create policy "Users can update own saved jobs"
on public.saved_jobs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own saved jobs"
on public.saved_jobs
for delete
using (auth.uid() = user_id);
