-- Supabase Schema for Campus Treasure Hunt
-- Run this in your Supabase SQL Editor

-- 1. Single-row table holding active round state
create table if not exists event_state (
  id int primary key default 1,
  active_round text not null default 'round2',
  check (id = 1)
);

-- Seed initial event state with round2
insert into event_state (id, active_round)
values (1, 'round2')
on conflict (id) do nothing;

-- 2. Team progress table, scoped by round and team_code
create table if not exists team_progress (
  round text not null,
  team_code text not null,
  current_stage text not null default 'clue2',
  last_updated timestamptz not null default now(),
  primary key (round, team_code)
);

-- 3. Attempts log, scoped by round
create table if not exists attempts (
  id bigint generated always as identity primary key,
  round text not null,
  team_code text not null,
  stage text not null,
  submitted_answer text,
  correct boolean not null,
  created_at timestamptz not null default now()
);

-- 4. Finale submissions board (physical key verification by admin)
create table if not exists finale_submissions (
  round text not null,
  team_code text not null,
  position int,
  submitted_at timestamptz not null default now(),
  primary key (round, team_code)
);

-- Enable Row Level Security (RLS) or grant permissions for service role
-- Since service role key is used server-side, service role bypasses RLS.
alter table event_state enable row level security;
alter table team_progress enable row level security;
alter table attempts enable row level security;
alter table finale_submissions enable row level security;
