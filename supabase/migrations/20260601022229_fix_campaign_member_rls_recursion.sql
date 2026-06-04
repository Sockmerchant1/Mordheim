create or replace function app_private.is_campaign_member(target_campaign_id text, target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_members member
    where member.campaign_id = target_campaign_id
      and member.user_id = target_user_id
  );
$$;

create or replace function app_private.is_campaign_admin(target_campaign_id text, target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_members member
    where member.campaign_id = target_campaign_id
      and member.user_id = target_user_id
      and member.role = 'admin'
  );
$$;

create or replace function app_private.users_share_campaign(target_user_id uuid, viewer_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_members target_member
    join public.campaign_members viewer_member
      on viewer_member.campaign_id = target_member.campaign_id
    where target_member.user_id = target_user_id
      and viewer_member.user_id = viewer_user_id
  );
$$;

revoke all on function app_private.is_campaign_member(text, uuid) from public;
revoke all on function app_private.is_campaign_admin(text, uuid) from public;
revoke all on function app_private.users_share_campaign(uuid, uuid) from public;

grant usage on schema app_private to authenticated;
grant execute on function app_private.is_campaign_member(text, uuid) to authenticated;
grant execute on function app_private.is_campaign_admin(text, uuid) to authenticated;
grant execute on function app_private.users_share_campaign(uuid, uuid) to authenticated;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or app_private.users_share_campaign(profiles.id, auth.uid())
);

drop policy if exists "campaign_members_select_members" on public.campaign_members;
create policy "campaign_members_select_members"
on public.campaign_members
for select
to authenticated
using (app_private.is_campaign_member(campaign_members.campaign_id, auth.uid()));

drop policy if exists "scheduled_games_select_members" on public.scheduled_games;
create policy "scheduled_games_select_members"
on public.scheduled_games
for select
to authenticated
using (app_private.is_campaign_member(scheduled_games.campaign_id, auth.uid()));

drop policy if exists "scheduled_games_insert_host" on public.scheduled_games;
create policy "scheduled_games_insert_host"
on public.scheduled_games
for insert
to authenticated
with check (
  host_user_id = auth.uid()
  and app_private.is_campaign_member(scheduled_games.campaign_id, auth.uid())
);

drop policy if exists "scheduled_games_update_host_or_admin" on public.scheduled_games;
create policy "scheduled_games_update_host_or_admin"
on public.scheduled_games
for update
to authenticated
using (
  host_user_id = auth.uid()
  or app_private.is_campaign_admin(scheduled_games.campaign_id, auth.uid())
)
with check (
  host_user_id = auth.uid()
  or app_private.is_campaign_admin(scheduled_games.campaign_id, auth.uid())
);

drop policy if exists "scheduled_games_delete_host_or_admin" on public.scheduled_games;
create policy "scheduled_games_delete_host_or_admin"
on public.scheduled_games
for delete
to authenticated
using (
  host_user_id = auth.uid()
  or app_private.is_campaign_admin(scheduled_games.campaign_id, auth.uid())
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
    where game.id = game_invitations.game_id
      and app_private.is_campaign_member(game.campaign_id, auth.uid())
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
    where game.id = game_invitations.game_id
      and (
        game.host_user_id = auth.uid()
        or app_private.is_campaign_admin(game.campaign_id, auth.uid())
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
    where game.id = game_invitations.game_id
      and (
        game.host_user_id = auth.uid()
        or app_private.is_campaign_admin(game.campaign_id, auth.uid())
      )
  )
)
with check (
  player_id = auth.uid()::text
  or exists (
    select 1
    from public.scheduled_games game
    where game.id = game_invitations.game_id
      and (
        game.host_user_id = auth.uid()
        or app_private.is_campaign_admin(game.campaign_id, auth.uid())
      )
  )
);
