-- Periodic equity snapshots for portfolio history chart
create table if not exists public.equity_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  total_equity    numeric(18,2) not null,
  cash            numeric(18,2) not null,
  positions_value numeric(18,2) not null,
  created_at      timestamptz not null default now()
);

-- Fast time-range queries per user
create index if not exists equity_snapshots_user_time_idx
  on public.equity_snapshots (user_id, created_at desc);

-- RLS: users can only read their own snapshots; service role handles writes
alter table public.equity_snapshots enable row level security;

create policy "Users can read own snapshots"
  on public.equity_snapshots for select
  to authenticated
  using (auth.uid() = user_id);
