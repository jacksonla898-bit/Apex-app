-- Add optional sentiment tag to trades.
-- Existing rows default to null (treated as 'regular' weight in conviction calculations).
alter table public.trades
  add column if not exists sentiment text
    check (sentiment in ('high', 'regular', 'test'));
