create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  actor_id    uuid references auth.users(id) on delete set null,
  type        text not null check (type in (
    'like', 'reply', 'follow', 'copy_trade',
    'ai_upgrade', 'new_trade', 'top_trader_earned'
  )),
  entity_id   text,
  metadata    jsonb,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, read);

alter table public.notifications enable row level security;

-- Users can read their own notifications
create policy "users_select_own_notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
create policy "users_update_own_notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Only service role can insert (enforced by denying anon/authenticated inserts)
create policy "service_role_insert_notifications"
  on public.notifications for insert
  with check (false);
