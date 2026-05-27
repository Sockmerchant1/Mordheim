create schema if not exists app_private;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null,
  email text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, player_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'player_name', split_part(coalesce(new.email, 'player'), '@', 1), 'Player'),
    new.email
  )
  on conflict (id) do update
  set
    player_name = excluded.player_name,
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure app_private.handle_new_user();

create table if not exists public.campaigns (
  id text primary key,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id text not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table if not exists public.scheduled_games (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  title text not null,
  date text not null,
  time text not null,
  duration_minutes integer not null default 180 check (duration_minutes > 0),
  location_type text not null check (location_type in ('nova_games', 'player_house')),
  location_name text not null,
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  host_name text not null,
  max_players integer not null default 2 check (max_players between 2 and 6),
  notes text not null default '',
  status text not null default 'open' check (status in ('draft', 'open', 'scheduled', 'full', 'cancelled', 'completed')),
  google_calendar_event_id text,
  google_calendar_event_url text,
  google_calendar_invite_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_invitations (
  game_id text not null references public.scheduled_games(id) on delete cascade,
  player_id text not null,
  player_name text not null,
  email text,
  warband_name text,
  invite_status text not null default 'invited' check (invite_status in ('invited', 'accepted', 'declined', 'maybe', 'host')),
  responded_at timestamptz,
  primary key (game_id, player_id)
);

create table if not exists public.rosters (
  id text primary key,
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id text references public.campaigns(id) on delete set null,
  name text not null,
  warband_type_id text not null,
  roster_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_members_user_id_idx on public.campaign_members (user_id);
create index if not exists scheduled_games_campaign_date_idx on public.scheduled_games (campaign_id, date, time);
create index if not exists game_invitations_game_id_idx on public.game_invitations (game_id);
create index if not exists rosters_owner_updated_idx on public.rosters (owner_user_id, updated_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure app_private.set_updated_at();

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at
before update on public.campaigns
for each row execute procedure app_private.set_updated_at();

drop trigger if exists set_scheduled_games_updated_at on public.scheduled_games;
create trigger set_scheduled_games_updated_at
before update on public.scheduled_games
for each row execute procedure app_private.set_updated_at();

drop trigger if exists set_rosters_updated_at on public.rosters;
create trigger set_rosters_updated_at
before update on public.rosters
for each row execute procedure app_private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.scheduled_games enable row level security;
alter table public.game_invitations enable row level security;
alter table public.rosters enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.campaign_members target_member
    join public.campaign_members viewer_member
      on viewer_member.campaign_id = target_member.campaign_id
    where target_member.user_id = profiles.id
      and viewer_member.user_id = auth.uid()
  )
);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "campaigns_select_authenticated" on public.campaigns;
create policy "campaigns_select_authenticated"
on public.campaigns
for select
to authenticated
using (true);

drop policy if exists "campaigns_insert_creator" on public.campaigns;
create policy "campaigns_insert_creator"
on public.campaigns
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "campaigns_update_creator" on public.campaigns;
create policy "campaigns_update_creator"
on public.campaigns
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "campaign_members_select_members" on public.campaign_members;
create policy "campaign_members_select_members"
on public.campaign_members
for select
to authenticated
using (
  exists (
    select 1
    from public.campaign_members viewer_member
    where viewer_member.campaign_id = campaign_members.campaign_id
      and viewer_member.user_id = auth.uid()
  )
);

drop policy if exists "campaign_members_insert_self" on public.campaign_members;
create policy "campaign_members_insert_self"
on public.campaign_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.campaigns
    where campaigns.id = campaign_members.campaign_id
  )
);

drop policy if exists "campaign_members_update_self" on public.campaign_members;
create policy "campaign_members_update_self"
on public.campaign_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "scheduled_games_select_members" on public.scheduled_games;
create policy "scheduled_games_select_members"
on public.scheduled_games
for select
to authenticated
using (
  exists (
    select 1
    from public.campaign_members viewer_member
    where viewer_member.campaign_id = scheduled_games.campaign_id
      and viewer_member.user_id = auth.uid()
  )
);

drop policy if exists "scheduled_games_insert_host" on public.scheduled_games;
create policy "scheduled_games_insert_host"
on public.scheduled_games
for insert
to authenticated
with check (
  host_user_id = auth.uid()
  and exists (
    select 1
    from public.campaign_members viewer_member
    where viewer_member.campaign_id = scheduled_games.campaign_id
      and viewer_member.user_id = auth.uid()
  )
);

drop policy if exists "scheduled_games_update_host_or_admin" on public.scheduled_games;
create policy "scheduled_games_update_host_or_admin"
on public.scheduled_games
for update
to authenticated
using (
  host_user_id = auth.uid()
  or exists (
    select 1
    from public.campaign_members viewer_member
    where viewer_member.campaign_id = scheduled_games.campaign_id
      and viewer_member.user_id = auth.uid()
      and viewer_member.role = 'admin'
  )
)
with check (
  host_user_id = auth.uid()
  or exists (
    select 1
    from public.campaign_members viewer_member
    where viewer_member.campaign_id = scheduled_games.campaign_id
      and viewer_member.user_id = auth.uid()
      and viewer_member.role = 'admin'
  )
);

drop policy if exists "scheduled_games_delete_host_or_admin" on public.scheduled_games;
create policy "scheduled_games_delete_host_or_admin"
on public.scheduled_games
for delete
to authenticated
using (
  host_user_id = auth.uid()
  or exists (
    select 1
    from public.campaign_members viewer_member
    where viewer_member.campaign_id = scheduled_games.campaign_id
      and viewer_member.user_id = auth.uid()
      and viewer_member.role = 'admin'
  )
);

drop policy if exists "game_invitations_select_members" on public.game_invitations;
create policy "game_invitations_select_members"
on public.game_invitations
for select
to authenticated
using (
  exists (
    select 1
    from public.scheduled_games game
    join public.campaign_members viewer_member
      on viewer_member.campaign_id = game.campaign_id
    where game.id = game_invitations.game_id
      and viewer_member.user_id = auth.uid()
  )
);

drop policy if exists "game_invitations_insert_host_or_admin" on public.game_invitations;
create policy "game_invitations_insert_host_or_admin"
on public.game_invitations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.scheduled_games game
    left join public.campaign_members viewer_member
      on viewer_member.campaign_id = game.campaign_id
     and viewer_member.user_id = auth.uid()
    where game.id = game_invitations.game_id
      and (
        game.host_user_id = auth.uid()
        or viewer_member.role = 'admin'
      )
  )
);

drop policy if exists "game_invitations_update_player_host_or_admin" on public.game_invitations;
create policy "game_invitations_update_player_host_or_admin"
on public.game_invitations
for update
to authenticated
using (
  player_id = auth.uid()::text
  or exists (
    select 1
    from public.scheduled_games game
    left join public.campaign_members viewer_member
      on viewer_member.campaign_id = game.campaign_id
     and viewer_member.user_id = auth.uid()
    where game.id = game_invitations.game_id
      and (
        game.host_user_id = auth.uid()
        or viewer_member.role = 'admin'
      )
  )
)
with check (
  player_id = auth.uid()::text
  or exists (
    select 1
    from public.scheduled_games game
    left join public.campaign_members viewer_member
      on viewer_member.campaign_id = game.campaign_id
     and viewer_member.user_id = auth.uid()
    where game.id = game_invitations.game_id
      and (
        game.host_user_id = auth.uid()
        or viewer_member.role = 'admin'
      )
  )
);

drop policy if exists "rosters_select_owner" on public.rosters;
create policy "rosters_select_owner"
on public.rosters
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "rosters_insert_owner" on public.rosters;
create policy "rosters_insert_owner"
on public.rosters
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "rosters_update_owner" on public.rosters;
create policy "rosters_update_owner"
on public.rosters
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "rosters_delete_owner" on public.rosters;
create policy "rosters_delete_owner"
on public.rosters
for delete
to authenticated
using (owner_user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.campaigns to authenticated;
grant select, insert, update on public.campaign_members to authenticated;
grant select, insert, update, delete on public.scheduled_games to authenticated;
grant select, insert, update on public.game_invitations to authenticated;
grant select, insert, update, delete on public.rosters to authenticated;

insert into public.campaigns (id, name)
values ('autumn-in-the-city', 'Autumn in the City')
on conflict (id) do update
set name = excluded.name;
