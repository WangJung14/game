create table if not exists public.room_question_sets (
  room_code text primary key check (room_code ~ '^[A-Z0-9]{6}$'),
  title text not null default 'Imported question set' check (char_length(title) between 1 and 120),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  question_count integer not null check (question_count between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.room_question_sets enable row level security;
revoke all on table public.room_question_sets from anon, authenticated;
grant select, insert, update, delete on table public.room_question_sets to service_role;

notify pgrst, 'reload schema';
