create extension if not exists pgcrypto;

create table if not exists public.question_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  question_count integer not null check (question_count between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists question_sets_updated_at_idx on public.question_sets (updated_at desc);
alter table public.question_sets enable row level security;
revoke all on table public.question_sets from anon, authenticated;
grant select, insert, update, delete on table public.question_sets to service_role;
notify pgrst, 'reload schema';

