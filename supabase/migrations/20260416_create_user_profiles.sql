-- user_profiles: maps auth user IDs to public usernames
create table if not exists public.user_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  username_lower text not null unique,
  created_at    timestamptz not null default now()
);

-- Fast case-insensitive lookup
create index if not exists user_profiles_username_lower_idx on public.user_profiles (username_lower);

-- RLS: authenticated users can read all usernames; only service role writes
alter table public.user_profiles enable row level security;

create policy "Authenticated users can read usernames"
  on public.user_profiles for select
  to authenticated
  using (true);
