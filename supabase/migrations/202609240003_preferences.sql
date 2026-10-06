-- Non-sensitive onboarding preferences. No identity or billing authority lives here.
create table public.forma_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  purpose text not null default 'personal' check(purpose in ('personal','business','client')),
  start text not null default 'sample' check(start in ('sample','template','reference','guest')),
  completed boolean not null default false
);
alter table public.forma_preferences enable row level security;
revoke all on public.forma_preferences from public,anon,authenticated;
grant select,insert,update,delete on public.forma_preferences to authenticated;
create policy forma_preferences_owner on public.forma_preferences for all to authenticated
using(owner_id=auth.uid()) with check(owner_id=auth.uid());
