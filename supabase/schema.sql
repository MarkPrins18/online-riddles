-- Online Riddles schema
-- Run this in the Supabase SQL editor for a new project.
--
-- This version requires Supabase Anonymous Auth (enabled by default on new
-- projects; if disabled, turn it on under Authentication > Providers >
-- Anonymous). Every write is authorized against auth.uid() — there is no
-- "trust the client" path left. Rooms/players created before this version
-- (no `players.user_id`) will no longer be usable; start a fresh room.

create extension if not exists "pgcrypto";

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'revealed', 'finished')),
  narrator_id uuid,
  current_puzzle_id uuid,
  round int not null default 0,
  round_started_at timestamptz,
  played_puzzle_ids uuid[] not null default '{}',
  round_duration_seconds int,
  max_rounds int not null default 5,
  pack_theme_filter text[],
  community_pack_ids uuid[],
  hardcore_mode boolean not null default false,
  team_lives_total int,
  team_lives_remaining int,
  host_id uuid not null,
  created_at timestamptz not null default now(),
  revealed_at timestamptz
);

-- Same reasoning as the players.user_id migration below: needed when this
-- table already existed from before revealed_at was added.
alter table rooms add column if not exists revealed_at timestamptz;
alter table rooms add column if not exists community_pack_ids uuid[];

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  is_narrator boolean not null default false,
  is_host boolean not null default false,
  is_spectator boolean not null default false,
  score int not null default 0,
  joined_at timestamptz not null default now()
);

alter table players add column if not exists is_spectator boolean not null default false;

-- Covers both a fresh install (column already exists from the create table
-- above, this is a no-op) and migrating an existing database (adds the
-- column that create table skipped since the table already existed). Note
-- this alone doesn't make old rooms usable again (their players have no
-- user_id, so every RLS check below will reject them) — it just lets the
-- app boot; start a fresh room to actually play.
alter table players add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Anyone joining while a round is already in progress starts as a
-- spectator (can watch, can't ask/guess) instead of a full player who
-- missed the round's earlier questions/answers — computed server-side from
-- the room's actual status rather than trusted from the client, same
-- reasoning as the moderation/rate-limit triggers further down.
create or replace function set_spectator_on_join()
returns trigger
language plpgsql
security definer
as $$
begin
  select (status <> 'lobby') into new.is_spectator
  from rooms where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists set_spectator_on_join on players;
create trigger set_spectator_on_join
  before insert on players
  for each row execute function set_spectator_on_join();

-- A story pack groups puzzles under one theme (Crime, Sci-Fi, Absurd, ...)
-- and can be released independently via is_published.
create table if not exists story_packs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  theme text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- A fixed, curated vocabulary for puzzle categories (Fraude, Techniek, ...)
-- instead of a free-text field — keeps community submissions from drifting
-- into near-duplicate labels ("Fraude" vs "fraude" vs "Bedrog"). Only admins
-- (service-role key or an /admin account) may add new categories; everyone
-- else picks from the existing list.
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

insert into categories (name) values
  ('Werk'), ('Hobby'), ('Gewoonte'), ('Familie'), ('Horeca'), ('School'),
  ('Techniek'), ('Interne diefstal'), ('Vervalsing'), ('Vals spoor'),
  ('Fraude'), ('Beveiligingsfraude'), ('Smokkel'), ('Post'), ('Buren'),
  ('Openbaar vervoer'), ('Nutsvoorzieningen'), ('Verjaardag'), ('Dieren'),
  ('Communicatie'), ('Astronomie'), ('Bemanning'), ('Voorraad'),
  ('Klassiek raadsel'), ('Verzekeringsfraude'), ('Moordwapen')
on conflict (name) do nothing;

-- Same anti-drift idea as `categories` above, but for story_packs.theme
-- ("Crime" vs "crime" vs "SciFi") — unlike categories this is NOT
-- admin-gated: community pack creators must be able to name a genuinely new
-- theme themselves (see PackForm.tsx's "+ Nieuw thema" flow), so anyone may
-- insert. `story_packs.theme` stays a plain text column (see
-- normalize_pack_theme below) — this table is purely a canonicalization
-- ledger, not a foreign key every reader has to join through.
create table if not exists themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists themes_name_unique on themes (lower(name));

insert into themes (name)
select distinct theme from story_packs
on conflict (lower(name)) do nothing;

-- For every insert/update of story_packs.theme: if a case-insensitive match
-- already exists in `themes`, silently snap the stored value to that
-- existing spelling (stops "Sci-Fi" vs "SciFi" from becoming two separate
-- checkboxes in the room-settings theme list); if it's genuinely new, record
-- it so future writes can match against it. Applies to every write path
-- (official import via upsertPack's on-conflict-update, community creation
-- via createOwnPack) without either needing to know this table exists.
create or replace function normalize_pack_theme() returns trigger
language plpgsql as $$
declare
  canonical text;
begin
  select name into canonical from themes where lower(name) = lower(new.theme);
  if canonical is not null then
    new.theme := canonical;
  else
    insert into themes (name) values (new.theme);
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_pack_theme_trigger on story_packs;
create trigger normalize_pack_theme_trigger
  before insert or update of theme on story_packs
  for each row execute function normalize_pack_theme();

create table if not exists puzzles (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references story_packs (id) on delete cascade,
  title text not null,
  scenario text not null,
  solution text not null,
  category_id uuid references categories (id) on delete set null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  hint text,
  created_at timestamptz not null default now(),
  unique (pack_id, title)
);

-- Upgrade path for a database that already has puzzles with the old
-- free-text `category` column: add category_id, backfill it by matching
-- the old text against the new categories table, then drop the old column.
-- Safe to re-run — once `category` is gone this whole block is a no-op.
-- (`create table if not exists` above doesn't add columns to a table that
-- already existed, hence the explicit `add column if not exists` here.)
alter table puzzles add column if not exists category_id uuid references categories (id) on delete set null;

-- A published_puzzles view from a previous run of this script still
-- selects the old `category` column, which blocks dropping it below
-- ("cannot drop column ... because other objects depend on it"). Drop it
-- here; the create-or-replace further down recreates it against category_id.
drop view if exists published_puzzles;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'puzzles' and column_name = 'category'
  ) then
    update puzzles p
    set category_id = c.id
    from categories c
    where p.category_id is null and p.category = c.name;

    alter table puzzles drop column category;
  end if;
end $$;

-- Who's allowed to write puzzle content from the /admin dashboard. A real
-- (non-anonymous) Supabase Auth account, not the player-facing anonymous
-- sessions — deliberately has no insert/update/delete policy of its own,
-- so nobody can self-promote via the app; rows here are only ever added by
-- hand in Supabase Studio.
create table if not exists admins (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Only puzzles from a published pack are eligible for gameplay. Explicit
-- security_invoker keeps the view bound by the querying role's RLS instead
-- of quietly running as the view owner.
create or replace view published_puzzles
  with (security_invoker = true) as
  select p.id, p.pack_id, p.title, p.scenario, p.solution, p.category_id, c.name as category, p.difficulty, p.hint, p.created_at, sp.theme, p.created_by, p.is_community
  from puzzles p
  join story_packs sp on sp.id = p.pack_id
  left join categories c on c.id = p.category_id
  where sp.is_published = true;

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  puzzle_id uuid not null references puzzles (id),
  player_id uuid not null references players (id) on delete cascade,
  player_name text not null,
  text text not null,
  answer text check (answer in ('yes', 'no', 'irrelevant', 'custom')),
  answered_at timestamptz,
  custom_response text,
  is_best_question boolean not null default false,
  round int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists guesses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  puzzle_id uuid not null references puzzles (id),
  player_id uuid not null references players (id) on delete cascade,
  player_name text not null,
  text text not null,
  status text not null default 'pending' check (status in ('pending', 'correct', 'incorrect')),
  created_at timestamptz not null default now()
);

-- Free-form discussion between players, separate from the structured
-- vragen-thread to the Verteller. Room-wide (not scoped per puzzle/round).
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  player_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

-- One row per concluded round — the "zaken-archief" shown live in-game and
-- summarized in the end-of-session recap. Denormalized (puzzle_title,
-- solver_name, narrator_name as plain text) like questions/guesses already
-- are, so the log stays readable even if a puzzle or player is later gone.
create table if not exists case_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  round int not null,
  puzzle_title text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  outcome text not null check (outcome in ('solved', 'unsolved')),
  solver_name text,
  narrator_name text,
  questions_asked int not null default 0,
  created_at timestamptz not null default now(),
  unique (room_id, round)
);

-- Prikbord (corkboard): one shared, drag-anywhere board per room. board_items
-- holds both free-text sticky notes and pinned questions (kind
-- discriminator); position is fractional (0..1) so the board looks the same
-- regardless of each viewer's screen size. board_connections draws
-- detective-wall threads between any two items.
create table if not exists board_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  kind text not null check (kind in ('note', 'question')),
  text text,
  color text not null default 'yellow' check (color in ('yellow', 'pink', 'blue', 'green')),
  question_id uuid references questions (id) on delete cascade,
  x double precision not null default 0.5 check (x >= 0 and x <= 1),
  y double precision not null default 0.5 check (y >= 0 and y <= 1),
  created_by uuid not null references players (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint board_items_kind_shape check (
    (kind = 'note' and text is not null and question_id is null)
    or (kind = 'question' and text is null and question_id is not null)
  )
);

-- A given question can only be pinned to the board once per room.
create unique index if not exists board_items_unique_question
  on board_items (room_id, question_id)
  where question_id is not null;

create table if not exists board_connections (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  from_item_id uuid not null references board_items (id) on delete cascade,
  to_item_id uuid not null references board_items (id) on delete cascade,
  created_by uuid not null references players (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint board_connections_distinct_items check (from_item_id <> to_item_id),
  unique (room_id, from_item_id, to_item_id)
);

-- The corkboard is scoped to the current mystery, not the whole session —
-- wiping it whenever a new round starts (current_puzzle_id changes) means
-- pinned questions never go stale (they'd otherwise reference a previous
-- round's question, which lib/game/useGameState.ts's per-round reload no
-- longer keeps around) and players always start each case with a clean
-- board. security definer so this fires regardless of whether the host or
-- narrator is the one advancing the round; board_connections cascades away
-- automatically via its `on delete cascade` to board_items.
create or replace function clear_board_on_new_round()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.current_puzzle_id is distinct from old.current_puzzle_id then
    delete from board_items where room_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_board_on_new_round on rooms;
create trigger clear_board_on_new_round
  after update on rooms
  for each row execute function clear_board_on_new_round();

-- Same trigger condition as clear_board_on_new_round — a new puzzle is the
-- right moment to promote any mid-round joiners to full players, since
-- everyone starts that puzzle on equal footing. Covers both "Volgende
-- zaak" and "Sla deze zaak over" (both change current_puzzle_id) with no
-- special-casing needed at either call site.
create or replace function promote_spectators_on_new_round()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.current_puzzle_id is distinct from old.current_puzzle_id then
    update players set is_spectator = false
    where room_id = new.id and is_spectator = true;
  end if;
  return new;
end;
$$;

drop trigger if exists promote_spectators_on_new_round on rooms;
create trigger promote_spectators_on_new_round
  after update on rooms
  for each row execute function promote_spectators_on_new_round();

-- Stamps the moment a round is revealed so every client can compute the
-- same "volgende ronde begint over..." countdown from one shared timestamp
-- instead of racing independent local timers. Cleared when a new round
-- starts so it never lingers into the next reveal. BEFORE UPDATE (not
-- AFTER) so it can rewrite NEW before the row is actually written.
create or replace function set_revealed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'revealed' and old.status is distinct from 'revealed' then
    new.revealed_at = now();
  elsif new.status = 'playing' and old.status is distinct from 'playing' then
    new.revealed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_revealed_at on rooms;
create trigger set_revealed_at
  before update on rooms
  for each row execute function set_revealed_at();

-- === Authorization helpers ==================================================
-- security definer + stable: usable inside RLS policies without triggering
-- RLS recursion (a policy that queries its own table via a normal function
-- call would otherwise re-trigger RLS and potentially loop/deny itself).

create or replace function is_room_host(target_room_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from rooms r join players p on p.id = r.host_id
    where r.id = target_room_id and p.user_id = auth.uid()
  );
$$;

create or replace function is_room_narrator(target_room_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from rooms r join players p on p.id = r.narrator_id
    where r.id = target_room_id and p.user_id = auth.uid()
  );
$$;

create or replace function is_room_member(target_room_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from players where room_id = target_room_id and user_id = auth.uid()
  );
$$;

create or replace function is_own_player(target_player_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from players where id = target_player_id and user_id = auth.uid()
  );
$$;

-- === RPCs for actions that touch someone else's row =========================
-- A "you can only update yourself" policy can't allow narrator/host
-- assignment or scoring (those inherently change another player's row), so
-- those go through security-definer functions that check authority
-- themselves instead — same pattern the score function already used.

create or replace function increment_player_score(
  player_id_input uuid, amount_input int, room_id_input uuid
)
returns void
language plpgsql
security definer
as $$
begin
  if not (is_room_narrator(room_id_input) or is_room_host(room_id_input)) then
    raise exception 'Not authorized to change scores in this room';
  end if;

  update players set score = greatest(0, score + amount_input)
  where id = player_id_input and room_id = room_id_input;
end;
$$;

create or replace function set_narrator(room_id_input uuid, player_id_input uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_room_host(room_id_input) then
    raise exception 'Only the host can assign the Verteller';
  end if;

  update players set is_narrator = false where room_id = room_id_input;
  update players set is_narrator = true where id = player_id_input and room_id = room_id_input;
  update rooms set narrator_id = player_id_input where id = room_id_input;
end;
$$;

create or replace function set_host(room_id_input uuid, player_id_input uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_room_host(room_id_input) then
    raise exception 'Only the current host can transfer host';
  end if;

  update players set is_host = false where room_id = room_id_input;
  update players set is_host = true where id = player_id_input and room_id = room_id_input;
  update rooms set host_id = player_id_input where id = room_id_input;
end;
$$;

-- Unlike set_host, deliberately does NOT require the caller to already be
-- host — this exists specifically for when the current host has
-- disconnected, so by definition no client can authenticate as them
-- anymore. Presence (who's actually connected) only lives in the realtime
-- layer, not the database, so this can't verify server-side that the old
-- host is really gone — it trusts the caller the same way the rest of this
-- anonymous-session app already does. Self-claim only (not "assign anyone"),
-- and the client only ever surfaces this to the one deterministic successor
-- (see lib/game/membership.ts: pickNextHost) rather than every player.
create or replace function claim_host(room_id_input uuid, claiming_player_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_room_member(room_id_input) then
    raise exception 'Not a member of this room';
  end if;
  if not is_own_player(claiming_player_id) then
    raise exception 'Can only claim host for yourself';
  end if;

  update players set is_host = false where room_id = room_id_input;
  update players set is_host = true where id = claiming_player_id and room_id = room_id_input;
  update rooms set host_id = claiming_player_id where id = room_id_input;
end;
$$;

-- For automatic offline-takeover only (see lib/game/membership.ts:
-- pickNarratorTakeoverElector / pickRandomOnlineCandidate, called from
-- GamePlayClient after the Verteller has been offline past a timeout).
-- Unlike claim_host, this is NOT self-claim-only: the caller assigns the
-- role to a different, randomly-chosen player, since the whole point is
-- that the Verteller isn't around to claim it themselves. Any room member
-- may reassign the Verteller to any other room member — same trust model as
-- claim_host (Presence isn't visible server-side, so this can't verify the
-- old Verteller is really gone; the client decides when this is warranted).
create or replace function claim_narrator(room_id_input uuid, new_narrator_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_room_member(room_id_input) then
    raise exception 'Not a member of this room';
  end if;
  if not exists (
    select 1 from players
    where id = new_narrator_id and room_id = room_id_input and not is_spectator
  ) then
    raise exception 'Target player not in this room';
  end if;

  update players set is_narrator = false where room_id = room_id_input;
  update players set is_narrator = true where id = new_narrator_id and room_id = room_id_input;
  update rooms set narrator_id = new_narrator_id where id = room_id_input;
end;
$$;

-- Returns the room's current puzzle with the solution nulled out unless the
-- caller is the Verteller or the round has already been revealed — the
-- first time "Verteller ziet de oplossing, anderen niet" is enforced by the
-- server instead of the client just choosing not to render it.
create or replace function get_room_puzzle(room_id_input uuid)
returns table (
  id uuid, pack_id uuid, title text, scenario text, solution text,
  category text, difficulty text, hint text, created_at timestamptz
)
language plpgsql
security definer
as $$
declare
  can_see_solution boolean;
begin
  select is_room_narrator(room_id_input) or exists (
    select 1 from rooms where rooms.id = room_id_input and status = 'revealed'
  ) into can_see_solution;

  return query
  select
    p.id, p.pack_id, p.title, p.scenario,
    case when can_see_solution then p.solution else null end,
    c.name, p.difficulty, p.hint, p.created_at
  from puzzles p
  left join categories c on c.id = p.category_id
  join rooms r on r.current_puzzle_id = p.id
  where r.id = room_id_input;
end;
$$;

-- === Rate limiting ==========================================================
-- One generic BEFORE INSERT trigger function reused across every
-- spam-prone table: counts how many rows the same group_column value (a
-- player or user) has inserted within window_seconds, and rejects the
-- insert once max_count is hit. Runs with the caller's own RLS-scoped
-- view (no security definer needed) since every table involved already
-- lets a player see at least their own rows.
create or replace function enforce_rate_limit()
returns trigger
language plpgsql
as $$
declare
  max_count int := TG_ARGV[0]::int;
  window_seconds int := TG_ARGV[1]::int;
  group_column text := TG_ARGV[2];
  time_column text := TG_ARGV[3];
  err_message text := coalesce(nullif(TG_ARGV[4], ''), 'Rustig aan — probeer het over een paar tellen opnieuw.');
  current_count int;
begin
  execute format(
    'select count(*) from %I where %I::text = $1 and %I > now() - make_interval(secs => $2)',
    TG_TABLE_NAME, group_column, time_column
  )
  into current_count
  using (to_jsonb(NEW) ->> group_column), window_seconds;

  if current_count >= max_count then
    raise exception '%', err_message;
  end if;

  return NEW;
end;
$$;

drop trigger if exists rate_limit_chat_messages on chat_messages;
create trigger rate_limit_chat_messages
  before insert on chat_messages
  for each row execute function enforce_rate_limit(
    8, 10, 'player_id', 'created_at',
    'Even rustig met chatten — probeer over een paar tellen opnieuw.'
  );

drop trigger if exists rate_limit_questions on questions;
create trigger rate_limit_questions
  before insert on questions
  for each row execute function enforce_rate_limit(
    5, 10, 'player_id', 'created_at',
    'Te veel vragen achter elkaar — wacht heel even.'
  );

drop trigger if exists rate_limit_guesses on guesses;
create trigger rate_limit_guesses
  before insert on guesses
  for each row execute function enforce_rate_limit(
    5, 30, 'player_id', 'created_at',
    'Te veel pogingen achter elkaar — wacht even voor je nog een keer gokt.'
  );

-- Covers both room creation (the host's own player row) and joining, since
-- there's no separate "create room" write to hang a limit on — a room row
-- with no host player can't exist for long anyway.
drop trigger if exists rate_limit_players on players;
create trigger rate_limit_players
  before insert on players
  for each row execute function enforce_rate_limit(
    10, 600, 'user_id', 'joined_at',
    'Te veel kamers/pogingen in korte tijd — probeer het over een paar minuten opnieuw.'
  );

drop trigger if exists rate_limit_board_items on board_items;
create trigger rate_limit_board_items
  before insert on board_items
  for each row execute function enforce_rate_limit(
    20, 30, 'created_by', 'created_at',
    'Even rustig met het prikbord — probeer over een paar tellen opnieuw.'
  );

drop trigger if exists rate_limit_board_connections on board_connections;
create trigger rate_limit_board_connections
  before insert on board_connections
  for each row execute function enforce_rate_limit(
    20, 30, 'created_by', 'created_at',
    'Even rustig met de draadjes — probeer over een paar tellen opnieuw.'
  );

-- === Chat moderation ========================================================
-- A blunt substring filter, not a smart one — catches the obvious stuff,
-- won't catch spaced-out or leetspeak variants. That's an acceptable first
-- line of defense given host-kick already exists as a backstop for anything
-- it misses. RLS-locked with no policies (nobody can read/write it directly
-- through the anon key); the trigger below is security definer so it can
-- still check against it. Extend the list any time via the SQL editor:
--   insert into banned_words (word) values ('woord');
create table if not exists banned_words (
  word text primary key
);
alter table banned_words enable row level security;

insert into banned_words (word) values
  ('kanker'), ('kut'), ('klote'), ('lul'), ('hoer'),
  ('fuck'), ('shit'), ('bitch'), ('asshole')
on conflict (word) do nothing;

create or replace function enforce_chat_moderation()
returns trigger
language plpgsql
security definer
as $$
declare
  hit text;
begin
  select word into hit
  from banned_words
  where NEW.text ilike '%' || word || '%'
  limit 1;

  if hit is not null then
    raise exception 'Dat bericht bevat taal die hier niet is toegestaan.';
  end if;

  return NEW;
end;
$$;

drop trigger if exists moderate_chat_messages on chat_messages;
create trigger moderate_chat_messages
  before insert on chat_messages
  for each row execute function enforce_chat_moderation();

drop trigger if exists moderate_board_items on board_items;
create trigger moderate_board_items
  before insert on board_items
  for each row execute function enforce_chat_moderation();

-- === Cleanup: stale rooms ===================================================
-- A room older than 24h is stale regardless of status — nobody leaves a
-- lobby open, or a game running, for a full day. Deleting the room cascades
-- to players/questions/guesses/chat_messages/case_log automatically (all
-- declared `on delete cascade` above), so this one delete is the entire
-- cleanup. Runs hourly via pg_cron so abandoned rooms don't sit around for
-- close to a full day before being swept.
create extension if not exists pg_cron;

create or replace function cleanup_stale_rooms()
returns void
language sql
security definer
as $$
  delete from rooms where created_at < now() - interval '24 hours';
$$;

-- Re-runnable: drops any previous schedule under this name before
-- re-creating it, instead of erroring or double-scheduling.
select cron.unschedule(jobid) from cron.job where jobname = 'cleanup-stale-rooms';
select cron.schedule('cleanup-stale-rooms', '0 * * * *', $$select cleanup_stale_rooms();$$);

-- Postgres's WAL only includes a deleted row's primary key by default
-- (REPLICA IDENTITY DEFAULT) — not its other columns. Every realtime
-- subscription below that filters DELETE events by room_id (a non-primary
-- key column) needs the full old row available to even evaluate that
-- filter, or Realtime silently drops the event instead of delivering it —
-- e.g. a player leaving a room was invisible to everyone else in real
-- time until they refreshed, even though the delete itself succeeded.
alter table players replica identity full;
alter table board_items replica identity full;
alter table board_connections replica identity full;

-- Realtime: broadcast changes on these tables to subscribed clients.
-- `alter publication add table` errors if the table is already a member, so
-- this is wrapped to make re-running the script safe.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'questions'
  ) then
    alter publication supabase_realtime add table questions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guesses'
  ) then
    alter publication supabase_realtime add table guesses;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'case_log'
  ) then
    alter publication supabase_realtime add table case_log;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'board_items'
  ) then
    alter publication supabase_realtime add table board_items;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'board_connections'
  ) then
    alter publication supabase_realtime add table board_connections;
  end if;
end $$;

-- === Row level security =====================================================
-- Every write is now scoped to who the caller actually is (auth.uid()) and
-- what role they hold in that specific room — no more "anyone with the
-- anon key can touch any row". Puzzle *content* stays admin-managed: only
-- the service-role key (import script / admin API route, which bypasses
-- RLS) can write to story_packs/puzzles.
alter table rooms enable row level security;
alter table players enable row level security;
alter table story_packs enable row level security;
alter table puzzles enable row level security;
alter table categories enable row level security;
alter table themes enable row level security;
alter table admins enable row level security;
alter table questions enable row level security;
alter table guesses enable row level security;
alter table chat_messages enable row level security;
alter table case_log enable row level security;
alter table board_items enable row level security;
alter table board_connections enable row level security;

-- Every policy is dropped first so this script can be re-run against a
-- database that already has these policies from a previous run.
drop policy if exists "public read rooms" on rooms;
create policy "public read rooms" on rooms for select using (true);
drop policy if exists "public insert rooms" on rooms;
create policy "public insert rooms" on rooms for insert with check (true);
drop policy if exists "host or narrator update rooms" on rooms;
create policy "host or narrator update rooms" on rooms for update
  using (is_room_host(id) or is_room_narrator(id));

drop policy if exists "public read players" on players;
create policy "public read players" on players for select using (true);
drop policy if exists "join as self" on players;
create policy "join as self" on players for insert with check (user_id = auth.uid());
drop policy if exists "update own player" on players;
create policy "update own player" on players for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "leave or be kicked" on players;
create policy "leave or be kicked" on players for delete
  using (user_id = auth.uid() or is_room_host(room_id));

drop policy if exists "public read story packs" on story_packs;
create policy "public read story packs" on story_packs for select using (true);
drop policy if exists "public read puzzles" on puzzles;
create policy "public read puzzles" on puzzles for select using (true);
drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);
drop policy if exists "public read themes" on themes;
create policy "public read themes" on themes for select using (true);
-- Community pack creators must be able to name a genuinely new theme
-- themselves (PackForm.tsx's "+ Nieuw thema" flow), so unlike categories
-- this can't be admin-only-write — the normalize_pack_theme trigger above
-- is the only thing that ever writes here for the app, and only via
-- insert, never update/delete.
drop policy if exists "anyone inserts themes" on themes;
create policy "anyone inserts themes" on themes for insert with check (true);

-- Content management: an authenticated admin (see the /admin dashboard)
-- may write story packs and puzzles directly, same as the service-role
-- key already could — this just extends that to a real logged-in user
-- instead of only server-only tooling.
drop policy if exists "admins write story packs" on story_packs;
create policy "admins write story packs" on story_packs for all
  using (exists (select 1 from admins where id = auth.uid()))
  with check (exists (select 1 from admins where id = auth.uid()));
drop policy if exists "admins write puzzles" on puzzles;
create policy "admins write puzzles" on puzzles for all
  using (exists (select 1 from admins where id = auth.uid()))
  with check (exists (select 1 from admins where id = auth.uid()));
drop policy if exists "admins write categories" on categories;
create policy "admins write categories" on categories for all
  using (exists (select 1 from admins where id = auth.uid()))
  with check (exists (select 1 from admins where id = auth.uid()));
drop policy if exists "admins write themes" on themes;
create policy "admins write themes" on themes for all
  using (exists (select 1 from admins where id = auth.uid()))
  with check (exists (select 1 from admins where id = auth.uid()));

-- You may only ever check your own admin status, never list who else is
-- one — and there is deliberately no insert/update/delete policy here at
-- all, so the admins table can't be written to from the app in any way.
drop policy if exists "read own admin row" on admins;
create policy "read own admin row" on admins for select using (id = auth.uid());

drop policy if exists "public read questions" on questions;
create policy "public read questions" on questions for select using (true);
drop policy if exists "ask as self" on questions;
create policy "ask as self" on questions for insert with check (is_own_player(player_id));
drop policy if exists "narrator answers questions" on questions;
create policy "narrator answers questions" on questions for update
  using (is_room_narrator(room_id));

-- Guesses are the one genuinely private thing in the game: your own
-- theory, or everything once you're the Verteller, or everything once the
-- round is over (which is also what lets the end-of-session recap work).
drop policy if exists "scoped read guesses" on guesses;
create policy "scoped read guesses" on guesses for select
  using (
    is_own_player(player_id)
    or is_room_narrator(room_id)
    or exists (select 1 from rooms where id = room_id and status <> 'playing')
  );
drop policy if exists "guess as self" on guesses;
create policy "guess as self" on guesses for insert with check (is_own_player(player_id));
drop policy if exists "narrator reviews guesses" on guesses;
create policy "narrator reviews guesses" on guesses for update
  using (is_room_narrator(room_id));

drop policy if exists "public read chat messages" on chat_messages;
create policy "public read chat messages" on chat_messages for select using (true);
drop policy if exists "chat as self" on chat_messages;
create policy "chat as self" on chat_messages for insert with check (is_own_player(player_id));

drop policy if exists "public read case log" on case_log;
create policy "public read case log" on case_log for select using (true);
drop policy if exists "narrator or host logs case" on case_log;
create policy "narrator or host logs case" on case_log for insert
  with check (is_room_narrator(room_id) or is_room_host(room_id));

-- Prikbord: any room member can see and move/edit any item (fully
-- collaborative board), but only the item's creator or the room host can
-- delete it.
drop policy if exists "members read board items" on board_items;
create policy "members read board items" on board_items for select
  using (is_room_member(room_id));
drop policy if exists "members add board items" on board_items;
create policy "members add board items" on board_items for insert
  with check (is_room_member(room_id) and is_own_player(created_by));
drop policy if exists "members move board items" on board_items;
create policy "members move board items" on board_items for update
  using (is_room_member(room_id)) with check (is_room_member(room_id));
drop policy if exists "creator or host deletes board items" on board_items;
create policy "creator or host deletes board items" on board_items for delete
  using (is_own_player(created_by) or is_room_host(room_id));

drop policy if exists "members read board connections" on board_connections;
create policy "members read board connections" on board_connections for select
  using (is_room_member(room_id));
drop policy if exists "members add board connections" on board_connections;
create policy "members add board connections" on board_connections for insert
  with check (is_room_member(room_id) and is_own_player(created_by));
drop policy if exists "creator or host deletes board connections" on board_connections;
create policy "creator or host deletes board connections" on board_connections for delete
  using (is_own_player(created_by) or is_room_host(room_id));

-- Seed a starter pack so the game has something to play immediately.
-- Add more via `npm run puzzles:import -- packs/your-pack.json` or POST
-- /api/admin/puzzles (see packs/example-pack.json for the JSON shape).
insert into story_packs (slug, name, theme, is_published) values
  ('classics-vol-1', 'Klassiekers Vol. 1', 'Klassiek', true)
on conflict (slug) do nothing;

insert into puzzles (pack_id, title, scenario, solution, category_id, difficulty, hint)
select sp.id, v.title, v.scenario, v.solution, c.id, v.difficulty, v.hint
from story_packs sp
cross join (values
  (
    'De brief zonder postzegel',
    'Een postbode bezorgt een brief zonder postzegel, en toch krijgt niemand een boete of nabetaling — de brief wordt gewoon netjes afgeleverd.',
    'De brief zit in een dienstenvelop van de posterijen zelf, intern verstuurd tussen twee postkantoren. Interne post heeft nooit een postzegel nodig gehad.',
    'Klassiek raadsel',
    'easy',
    'Niet alle post komt van buiten het systeem.'
  ),
  (
    'De man die zijn eigen begrafenis miste',
    'Op een begrafenis wordt de overledene herdacht en de kist gedragen, terwijl de man zelf kilometers verderop nog leeft en van niets weet.',
    'Het is de begrafenis van zijn tweelingbroer, die dezelfde voornaam draagt. Een verwarde buurtkrant meldde het overlijden onder de verkeerde naam, en de man zelf hoort er pas later per toeval van.',
    'Klassiek raadsel',
    'medium',
    'Twee mensen kunnen dezelfde naam dragen — en soms ook hetzelfde gezicht.'
  )
) as v(title, scenario, solution, category, difficulty, hint)
left join categories c on c.name = v.category
where sp.slug = 'classics-vol-1'
on conflict (pack_id, title) do nothing;

-- === Community content: user-submitted puzzles, packs, and voting ==========
-- Anyone can already play via anonymous auth (see authSession.ts) — the same
-- session may create packs/puzzles and vote, no separate signup. profiles
-- stores an optional display name for attribution ("door <naam>"), set once
-- from the client before someone's first submission. The only anti-abuse
-- layers are the rate-limit triggers and the word filter below; an
-- anonymous session is trivial to reset (new tab), so treat vote counts and
-- authorship as a light social signal, not a hard guarantee.

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table story_packs add column if not exists created_by uuid references auth.users (id) on delete cascade;
alter table story_packs add column if not exists is_community boolean not null default false;
alter table puzzles add column if not exists created_by uuid references auth.users (id) on delete cascade;
alter table puzzles add column if not exists is_community boolean not null default false;

create table if not exists puzzle_votes (
  id uuid primary key default gen_random_uuid(),
  puzzle_id uuid not null references puzzles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (puzzle_id, user_id)
);

-- A player's personal shortlist of community packs, built while browsing
-- /community — purely private curation (unlike puzzle_votes) so the host can
-- later pull it into a room's community-pack selection via "Gebruik mijn
-- favorieten" without exposing who favorited what to anyone else.
create table if not exists pack_favorites (
  pack_id uuid not null references story_packs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (pack_id, user_id)
);

-- Vote totals per puzzle, for sorting/display. security_invoker so it's
-- bound by the querying role's own RLS, same reasoning as published_puzzles.
create or replace view puzzle_vote_totals
  with (security_invoker = true) as
  select
    puzzle_id,
    count(*) filter (where value = 1) as upvotes,
    count(*) filter (where value = -1) as downvotes,
    coalesce(sum(value), 0) as score
  from puzzle_votes
  group by puzzle_id;

drop trigger if exists rate_limit_community_puzzles on puzzles;
create trigger rate_limit_community_puzzles
  before insert on puzzles
  for each row when (new.is_community)
  execute function enforce_rate_limit(
    10, 3600, 'created_by', 'created_at',
    'Te veel raadsels achter elkaar ingestuurd — probeer het over een uur opnieuw.'
  );

drop trigger if exists rate_limit_puzzle_votes on puzzle_votes;
create trigger rate_limit_puzzle_votes
  before insert on puzzle_votes
  for each row execute function enforce_rate_limit(
    60, 60, 'user_id', 'created_at',
    'Even rustig met stemmen — probeer over een paar tellen opnieuw.'
  );

-- Reuses the same banned_words list as chat moderation, applied only to
-- community puzzle text — curated/admin content (is_community = false) is
-- trusted and skips this check.
create or replace function enforce_puzzle_moderation()
returns trigger
language plpgsql
security definer
as $$
declare
  hit text;
begin
  if not new.is_community then
    return new;
  end if;

  select word into hit
  from banned_words
  where (new.title || ' ' || new.scenario || ' ' || new.solution || ' ' || coalesce(new.hint, ''))
    ilike '%' || word || '%'
  limit 1;

  if hit is not null then
    raise exception 'Dit raadsel bevat taal die hier niet is toegestaan.';
  end if;

  return new;
end;
$$;

drop trigger if exists moderate_puzzles on puzzles;
create trigger moderate_puzzles
  before insert or update on puzzles
  for each row execute function enforce_puzzle_moderation();

alter table profiles enable row level security;
alter table puzzle_votes enable row level security;
alter table pack_favorites enable row level security;

drop policy if exists "public read profiles" on profiles;
create policy "public read profiles" on profiles for select using (true);
drop policy if exists "write own profile" on profiles;
create policy "write own profile" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "public read puzzle votes" on puzzle_votes;
create policy "public read puzzle votes" on puzzle_votes for select using (true);
drop policy if exists "vote as self" on puzzle_votes;
create policy "vote as self" on puzzle_votes for insert
  with check (user_id = auth.uid());
drop policy if exists "change own vote" on puzzle_votes;
create policy "change own vote" on puzzle_votes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "remove own vote" on puzzle_votes;
create policy "remove own vote" on puzzle_votes for delete using (user_id = auth.uid());

-- Private: only the favoriting player can see or change their own shortlist.
drop policy if exists "read own pack favorites" on pack_favorites;
create policy "read own pack favorites" on pack_favorites for select using (user_id = auth.uid());
drop policy if exists "add own pack favorite" on pack_favorites;
create policy "add own pack favorite" on pack_favorites for insert with check (user_id = auth.uid());
drop policy if exists "remove own pack favorite" on pack_favorites;
create policy "remove own pack favorite" on pack_favorites for delete using (user_id = auth.uid());

-- Extends story_packs/puzzles write access: alongside the existing
-- admins-only policy, the pack/puzzle's own creator may manage it.
-- Multiple permissive policies OR together, so this adds insert/update/
-- delete on top of the "public read" select policy that already exists on
-- both tables.
drop policy if exists "creators write own community packs" on story_packs;
create policy "creators write own community packs" on story_packs for all
  using (created_by = auth.uid() and is_community)
  with check (created_by = auth.uid() and is_community);

drop policy if exists "creators write own community puzzles" on puzzles;
create policy "creators write own community puzzles" on puzzles for all
  using (created_by = auth.uid() and is_community)
  with check (
    created_by = auth.uid() and is_community
    and exists (
      select 1 from story_packs sp
      where sp.id = pack_id and sp.created_by = auth.uid() and sp.is_community
    )
  );
