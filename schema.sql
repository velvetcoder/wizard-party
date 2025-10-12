-- Houses & points
create table if not exists house_points (
  house text primary key,
  points int default 0
);
insert into house_points (house, points) values
('Gryffindor',0),('Ravenclaw',0),('Hufflepuff',0),('Slytherin',0)
on conflict (house) do nothing;

create table if not exists points_log (
  id uuid primary key default gen_random_uuid(),
  house text not null,
  delta int not null,
  reason text,
  created_at timestamptz default now()
);

-- Profiles (optional demo for future features)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  house text,
  role text default 'guest'
);

-- Trivia
create table if not exists trivia_questions (
  id bigserial primary key,
  category text,
  question text not null,
  answer text not null,
  difficulty int default 1
);
create table if not exists trivia_sessions (
  id bigserial primary key,
  active boolean default false,
  active_question_id bigint references trivia_questions(id),
  updated_at timestamptz default now()
);
create table if not exists trivia_buzzes (
  id bigserial primary key,
  session_id bigint references trivia_sessions(id),
  question_id bigint references trivia_questions(id),
  display_name text not null,
  house text,
  created_at timestamptz default now()
);

-- Horcrux QR Hunt
create table if not exists horcrux_steps (
  id bigserial primary key,
  step_order int not null unique,
  code text not null unique,
  clue text not null
);
create table if not exists horcrux_progress (
  id bigserial primary key,
  display_name text not null,
  house text,
  step_order int not null,
  completed_at timestamptz default now()
);

-- Arrivals (on-site check-in)
create table if not exists checkins (
  id bigserial primary key,
  display_name text not null,
  house text,
  created_at timestamptz default now()
);
