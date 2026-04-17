-- Track whether the user has completed the onboarding flow.
-- Defaults to false so existing users are prompted on next login.
alter table public.user_balances
  add column if not exists onboarding_completed boolean not null default false;
