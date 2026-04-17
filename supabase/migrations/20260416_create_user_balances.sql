-- Per-user cash balance. Seeded server-side with $10,000 on first trade/portfolio load.
create table if not exists public.user_balances (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  cash       numeric(18, 2) not null default 10000,
  updated_at timestamptz    not null default now()
);

-- Enable Row Level Security
alter table public.user_balances enable row level security;

-- Users can read their own balance
create policy "Users can read own balance"
  on public.user_balances for select
  using (auth.uid() = user_id);

-- No client-side inserts or updates — all writes go through the service role
