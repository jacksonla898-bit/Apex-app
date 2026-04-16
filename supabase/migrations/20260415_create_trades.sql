-- Create trades table for per-user portfolio tracking
create table if not exists public.trades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  symbol      text not null,
  side        text not null check (side in ('buy', 'sell')),
  quantity    numeric(18, 8) not null check (quantity > 0),
  price       numeric(18, 8) not null check (price > 0),
  created_at  timestamptz not null default now()
);

-- Index for fast per-user queries
create index if not exists trades_user_id_idx on public.trades (user_id);
create index if not exists trades_user_symbol_idx on public.trades (user_id, symbol);

-- Enable Row Level Security
alter table public.trades enable row level security;

-- Users can only read their own trades
create policy "Users can read own trades"
  on public.trades for select
  using (auth.uid() = user_id);

-- Users can only insert their own trades
create policy "Users can insert own trades"
  on public.trades for insert
  with check (auth.uid() = user_id);

-- No updates or deletes — trade history is immutable
