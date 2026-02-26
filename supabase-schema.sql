-- Run this SQL in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  answer text not null,
  options text[] not null check (array_length(options, 1) >= 3),
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null
);

create table if not exists public.lesson_bookings (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  student_email text not null,
  slot text not null,
  payment_status text not null default 'paid',
  jitsi_room text not null,
  jitsi_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.player_progress (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique,
  xp int not null default 0,
  coins int not null default 0,
  streak int not null default 0,
  league text not null default 'Bronze',
  updated_at timestamptz not null default now()
);

alter table public.flashcards enable row level security;
alter table public.lesson_bookings enable row level security;
alter table public.player_progress enable row level security;

-- Students can read flashcards without login.
drop policy if exists flashcards_select_all on public.flashcards;
create policy flashcards_select_all
on public.flashcards
for select
to anon, authenticated
using (true);

-- Only authenticated teachers (any logged-in teacher account) can manage flashcards.
drop policy if exists flashcards_insert_auth on public.flashcards;
create policy flashcards_insert_auth
on public.flashcards
for insert
to authenticated
with check (true);

drop policy if exists flashcards_update_auth on public.flashcards;
create policy flashcards_update_auth
on public.flashcards
for update
to authenticated
using (true)
with check (true);

drop policy if exists flashcards_delete_auth on public.flashcards;
create policy flashcards_delete_auth
on public.flashcards
for delete
to authenticated
using (true);

-- Students can create booking after payment.
drop policy if exists bookings_insert_all on public.lesson_bookings;
create policy bookings_insert_all
on public.lesson_bookings
for insert
to anon, authenticated
with check (payment_status = 'paid');

-- Only authenticated teachers can read bookings list.
drop policy if exists bookings_select_auth on public.lesson_bookings;
create policy bookings_select_auth
on public.lesson_bookings
for select
to authenticated
using (true);

-- Public leaderboard and progress upsert by nickname.
drop policy if exists progress_select_all on public.player_progress;
create policy progress_select_all
on public.player_progress
for select
to anon, authenticated
using (true);

drop policy if exists progress_insert_all on public.player_progress;
create policy progress_insert_all
on public.player_progress
for insert
to anon, authenticated
with check (nickname <> '');

drop policy if exists progress_update_all on public.player_progress;
create policy progress_update_all
on public.player_progress
for update
to anon, authenticated
using (nickname <> '')
with check (nickname <> '');
