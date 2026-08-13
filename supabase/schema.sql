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
  saboteur_mode boolean not null default false,
  host_id uuid not null,
  created_at timestamptz not null default now(),
  revealed_at timestamptz
);

-- Same reasoning as the players.user_id migration below: needed when this
-- table already existed from before revealed_at was added.
alter table rooms add column if not exists revealed_at timestamptz;
alter table rooms add column if not exists community_pack_ids uuid[];
alter table rooms add column if not exists hardcore_mode boolean not null default false;
alter table rooms add column if not exists team_lives_total int;
alter table rooms add column if not exists team_lives_remaining int;
alter table rooms add column if not exists saboteur_mode boolean not null default false;

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

-- Every list-players query filters on room_id (getPlayersInRoom,
-- findReclaimablePlayer), and so does every is_room_member() call — the
-- RLS/RPC gate behind nearly every write in the app (join, claim_host,
-- claim_narrator, ...). Without this, both are a full table scan across
-- every player in every room that has ever existed, not just this one.
-- user_id as the second column covers is_room_member's exact (room_id,
-- user_id) lookup in one index instead of two.
create index if not exists players_room_id_user_id_idx on players (room_id, user_id);

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

-- The "update own player" RLS policy below only checks *who* owns the row,
-- not *which* columns they're changing — with the (public, by design) anon
-- key, that's enough for a direct REST call to set is_host/is_narrator on
-- your own row (then use "leave or be kicked" to remove everyone else), or
-- score directly (bypassing increment_player_score entirely), or even
-- room_id (jumping an already-inflated row into an unrelated room). The app
-- itself never issues a raw players.update() for these columns — every
-- privileged change already goes through the security-definer functions
-- below (increment_player_score, set_host, set_narrator, claim_host,
-- claim_narrator) and the promote_spectators_on_new_round trigger. This
-- trigger makes that the only path: it sets the
-- transaction-local flag right before its update, everyone else's changes
-- to these columns are silently reverted to the pre-update value. Ordinary
-- client updates (e.g. a future rename feature) keep working since `name`
-- is left untouched.
create or replace function guard_player_privileged_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  if current_setting('app.player_privileged_update', true) = 'on' then
    return new;
  end if;

  new.room_id := old.room_id;
  new.user_id := old.user_id;
  new.is_host := old.is_host;
  new.is_narrator := old.is_narrator;
  new.is_spectator := old.is_spectator;
  new.score := old.score;
  new.joined_at := old.joined_at;
  return new;
end;
$$;

drop trigger if exists guard_player_privileged_columns on players;
create trigger guard_player_privileged_columns
  before update on players
  for each row execute function guard_player_privileged_columns();

-- A story pack groups puzzles under one theme (Crime, Sci-Fi, Absurd, ...)
-- and can be released independently via is_published. `theme` stays a
-- plain column (see normalize_pack_theme below — it's community-writable
-- free text, not a curated vocabulary, so it isn't split per-language like
-- `name` is). `slug` is the locale-agnostic identifier used for upserts —
-- it deliberately never moves to a translation table.
create table if not exists story_packs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  theme text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- Added here (not further down with the other community-authorship
-- columns) because the "public read story packs"/"public read puzzle
-- translations" policies below already reference created_by — on a
-- genuinely fresh database (not an existing one being migrated), defining
-- those policies before this column exists fails outright. Same reasoning
-- as puzzles.created_by/is_community above.
alter table story_packs add column if not exists created_by uuid references auth.users (id) on delete cascade;
alter table story_packs add column if not exists is_community boolean not null default false;

-- A published_puzzles view from a previous run of this script still selects
-- columns the migrations below remove (name on story_packs/categories,
-- title/scenario/... on puzzles), which blocks dropping them ("cannot drop
-- column ... because other objects depend on it"). Drop it before any of
-- that happens; get_published_puzzles further down replaces it with a
-- locale-aware function (a plain view can't take a locale parameter).
drop view if exists published_puzzles;

-- === i18n: story pack display names are locale-agnostic on story_packs
-- itself; the name lives in story_pack_translations (one row per language,
-- including Dutch — no language is special-cased as "the base"). Mirrors
-- the puzzles/categories split above.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'story_packs' and column_name = 'name'
  ) then
    create table if not exists story_pack_translations (
      pack_id uuid not null references story_packs (id) on delete cascade,
      locale text not null,
      name text not null,
      status text not null default 'reviewed' check (status in ('machine', 'reviewed')),
      created_at timestamptz not null default now(),
      primary key (pack_id, locale)
    );

    insert into story_pack_translations (pack_id, locale, name, status)
    select id, 'nl', name, 'reviewed' from story_packs
    on conflict (pack_id, locale) do nothing;

    alter table story_packs drop column name;
  end if;
end $$;

create table if not exists story_pack_translations (
  pack_id uuid not null references story_packs (id) on delete cascade,
  locale text not null,
  name text not null,
  -- 'machine': auto-translated, not yet vetted by a human. 'reviewed':
  -- confirmed correct (every hand-authored Dutch pack name is 'reviewed'
  -- from the start — see the seed data and createOwnPack/upsertPack).
  status text not null default 'machine' check (status in ('machine', 'reviewed')),
  created_at timestamptz not null default now(),
  primary key (pack_id, locale)
);

-- === i18n: categories are locale-agnostic; their display name lives in
-- category_translations (one row per language, including Dutch — no
-- language is special-cased as "the base"). Keeps community submissions
-- from drifting into near-duplicate labels ("Fraude" vs "fraude" vs
-- "Bedrog") per language. Only admins (service-role key or an /admin
-- account) may add new categories; everyone else picks from the existing
-- list via listCategories.
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Upgrade path: a database that still has the old `categories.name` column
-- gets it backfilled into category_translations as the Dutch row, then the
-- column is dropped. Safe to re-run — once `name` is gone this is a no-op.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'categories' and column_name = 'name'
  ) then
    -- Table below doesn't exist yet on a pre-i18n database; create it first
    -- so the insert has somewhere to land. (The `create table if not
    -- exists category_translations` further down would otherwise run too
    -- late — this block executes before it.)
    create table if not exists category_translations (
      category_id uuid not null references categories (id) on delete cascade,
      locale text not null,
      name text not null,
      status text not null default 'reviewed' check (status in ('machine', 'reviewed')),
      created_at timestamptz not null default now(),
      primary key (category_id, locale)
    );

    insert into category_translations (category_id, locale, name, status)
    select id, 'nl', name, 'reviewed' from categories
    on conflict (category_id, locale) do nothing;

    alter table categories drop constraint if exists categories_name_key;
    alter table categories drop column name;
  end if;
end $$;

create table if not exists category_translations (
  category_id uuid not null references categories (id) on delete cascade,
  locale text not null,
  name text not null,
  -- 'machine': auto-translated, not yet vetted by a human. 'reviewed':
  -- confirmed correct (every hand-authored Dutch category is 'reviewed'
  -- from the start — see the seed loop below).
  status text not null default 'machine' check (status in ('machine', 'reviewed')),
  created_at timestamptz not null default now(),
  primary key (category_id, locale)
);

-- A given name can only exist once per language (the old global-unique
-- `categories.name` constraint, now scoped per locale instead).
create unique index if not exists category_translations_locale_name_unique
  on category_translations (locale, lower(name));

-- Seeds the curated Dutch category vocabulary. Loops instead of a single
-- multi-row insert because each category needs its own `categories` row
-- created first — idempotent via the "does this Dutch name already exist"
-- check, since there's no single-statement ON CONFLICT target spanning two
-- tables.
do $$
declare
  cat_name text;
  new_category_id uuid;
begin
  foreach cat_name in array array[
    'Werk', 'Hobby', 'Gewoonte', 'Familie', 'Horeca', 'School',
    'Techniek', 'Interne diefstal', 'Vervalsing', 'Vals spoor',
    'Fraude', 'Beveiligingsfraude', 'Smokkel', 'Post', 'Buren',
    'Openbaar vervoer', 'Nutsvoorzieningen', 'Verjaardag', 'Dieren',
    'Communicatie', 'Astronomie', 'Bemanning', 'Voorraad',
    'Klassiek raadsel', 'Verzekeringsfraude', 'Moordwapen'
  ]
  loop
    if not exists (
      select 1 from category_translations
      where locale = 'nl' and lower(name) = lower(cat_name)
    ) then
      insert into categories default values returning id into new_category_id;
      insert into category_translations (category_id, locale, name, status)
      values (new_category_id, 'nl', cat_name, 'reviewed');
    end if;
  end loop;
end $$;

-- English names for the same curated categories, matched to their existing
-- category_id via the Dutch name above (not a second seed loop — every one
-- of these categories already exists by now, this only adds its English row).
insert into category_translations (category_id, locale, name, status)
select ct_nl.category_id, 'en', v.name_en, 'machine'
from (values
  ('Werk', 'Work'), ('Hobby', 'Hobby'), ('Gewoonte', 'Habit'),
  ('Familie', 'Family'), ('Horeca', 'Hospitality'), ('School', 'School'),
  ('Techniek', 'Technology'), ('Interne diefstal', 'Internal Theft'),
  ('Vervalsing', 'Forgery'), ('Vals spoor', 'False Trail'),
  ('Fraude', 'Fraud'), ('Beveiligingsfraude', 'Security Fraud'),
  ('Smokkel', 'Smuggling'), ('Post', 'Mail'), ('Buren', 'Neighbors'),
  ('Openbaar vervoer', 'Public Transport'), ('Nutsvoorzieningen', 'Utilities'),
  ('Verjaardag', 'Birthday'), ('Dieren', 'Animals'),
  ('Communicatie', 'Communication'), ('Astronomie', 'Astronomy'),
  ('Bemanning', 'Crew'), ('Voorraad', 'Supplies'),
  ('Klassiek raadsel', 'Classic Riddle'), ('Verzekeringsfraude', 'Insurance Fraud'),
  ('Moordwapen', 'Murder Weapon')
) as v(name_nl, name_en)
join category_translations ct_nl on ct_nl.locale = 'nl' and lower(ct_nl.name) = lower(v.name_nl)
on conflict (category_id, locale) do nothing;

-- Same anti-drift idea as `categories` above, but for story_packs.theme
-- ("Crime" vs "crime" vs "SciFi") — unlike categories this is NOT
-- admin-gated: community pack creators must be able to name a genuinely new
-- theme themselves (see PackForm.tsx's "+ Nieuw thema" flow), so anyone may
-- insert. `story_packs.theme` stays a plain text column (see
-- normalize_pack_theme below) — this table is purely a canonicalization
-- ledger, not a foreign key every reader has to join through. Not (yet)
-- split into per-language translations — themes are community-authored
-- free text, not a curated vocabulary like categories, so translating them
-- automatically isn't a clean fit; deferred.
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

-- === i18n: puzzles are locale-agnostic; their text lives in
-- puzzle_translations (one row per language, including Dutch — no language
-- is special-cased as "the base"). This mirrors the categories split above.
create table if not exists puzzles (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references story_packs (id) on delete cascade,
  category_id uuid references categories (id) on delete set null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now()
);

-- Upgrade path for a database that already has puzzles with the old
-- free-text `category` column: add category_id, backfill it by matching
-- the old text against the categories table (via its Dutch translation, now
-- that categories.name has moved), then drop the old column. Safe to
-- re-run — once `category` is gone this whole block is a no-op.
alter table puzzles add column if not exists category_id uuid references categories (id) on delete set null;

-- Added here (not further down with the other community-authorship
-- columns) because get_published_puzzles below already selects both —
-- on a genuinely fresh database (not an existing one being migrated),
-- defining that function before these columns exist fails outright.
alter table puzzles add column if not exists created_by uuid references auth.users (id) on delete cascade;
alter table puzzles add column if not exists is_community boolean not null default false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'puzzles' and column_name = 'category'
  ) then
    update puzzles p
    set category_id = ct.category_id
    from category_translations ct
    where p.category_id is null and ct.locale = 'nl' and p.category = ct.name;

    alter table puzzles drop column category;
  end if;
end $$;

-- Upgrade path: a database that still has puzzles.title/scenario/solution/
-- hint gets them backfilled into puzzle_translations as the Dutch row
-- (status 'reviewed' — this is existing, human-written content, not a
-- machine draft), then the columns are dropped. Safe to re-run — once
-- `title` is gone this is a no-op.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'puzzles' and column_name = 'title'
  ) then
    -- Table below doesn't exist yet on a pre-i18n database; create it first
    -- so the insert has somewhere to land (the `create table if not exists
    -- puzzle_translations` further down runs too late for this block).
    create table if not exists puzzle_translations (
      puzzle_id uuid not null references puzzles (id) on delete cascade,
      locale text not null,
      title text not null,
      scenario text not null,
      solution text not null,
      hint text,
      status text not null default 'reviewed' check (status in ('machine', 'reviewed')),
      created_at timestamptz not null default now(),
      primary key (puzzle_id, locale)
    );

    insert into puzzle_translations (puzzle_id, locale, title, scenario, solution, hint, status)
    select id, 'nl', title, scenario, solution, hint, 'reviewed' from puzzles
    on conflict (puzzle_id, locale) do nothing;

    alter table puzzles drop constraint if exists puzzles_pack_id_title_key;
    alter table puzzles drop column title;
    alter table puzzles drop column scenario;
    alter table puzzles drop column solution;
    alter table puzzles drop column hint;
  end if;
end $$;

create table if not exists puzzle_translations (
  puzzle_id uuid not null references puzzles (id) on delete cascade,
  locale text not null,
  title text not null,
  scenario text not null,
  solution text not null,
  hint text,
  -- 'machine': auto-translated, not yet vetted by a human. 'reviewed':
  -- confirmed correct (every hand-authored Dutch puzzle is 'reviewed' from
  -- the start — see the seed data and insertPuzzles/createCommunityPuzzle).
  status text not null default 'machine' check (status in ('machine', 'reviewed')),
  created_at timestamptz not null default now(),
  primary key (puzzle_id, locale)
);

-- Note: there's deliberately no DB-level "unique title per pack per
-- locale" constraint here (unlike the old `puzzles.unique(pack_id, title)`)
-- — enforcing that would need pack_id duplicated onto this table just for
-- the constraint. insertPuzzles instead checks for an existing (pack,
-- locale, title) combination in application code before inserting, the
-- same pattern resolveCategoryId already uses for categories.

-- The public-read surface for puzzle text: every column except `solution`.
-- puzzle_translations itself has no public select policy (see the RLS
-- section below) — `solution` must never be reachable via a direct table
-- read, only through get_room_puzzle/get_published_puzzle, which gate it
-- server-side. security_invoker = false (the default, spelled out here on
-- purpose) means this runs as the view owner, bypassing the base table's
-- RLS entirely rather than being bound by it — that's the whole point.
-- Defined here (immediately after the table, ahead of
-- get_published_puzzle_candidates/get_published_puzzle further down, both
-- of which read from this view) because a `language sql` function body is
-- validated against its referenced relations at CREATE FUNCTION time, so
-- this can't be defined later and referenced earlier in the file. Own
-- creators/admins keep full access (including solution) via the base
-- table's "creators write own"/"admins write" policies (`for all`, so they
-- already cover select) — this view is only the public/no-solution path.
create or replace view puzzle_translations_public
  with (security_invoker = false) as
  select pt.puzzle_id, pt.locale, pt.title, pt.scenario, pt.hint, pt.status, pt.created_at
  from puzzle_translations pt
  join puzzles p on p.id = pt.puzzle_id
  join story_packs sp on sp.id = p.pack_id
  where sp.is_published or p.created_by = auth.uid();

grant select on puzzle_translations_public to anon, authenticated;

-- Who's allowed to write puzzle content from the /admin dashboard. A real
-- (non-anonymous) Supabase Auth account, not the player-facing anonymous
-- sessions — deliberately has no insert/update/delete policy of its own,
-- so nobody can self-promote via the app; rows here are only ever added by
-- hand in Supabase Studio.
create table if not exists admins (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Only puzzles from a published pack are eligible for gameplay. A function
-- (not a view) so it can take a locale — falls back to Dutch wherever the
-- requested locale has no translation yet, at the SQL level, so an
-- untranslated puzzle never simply disappears from the pool. No explicit
-- SECURITY DEFINER, so it runs as SECURITY INVOKER (the default) — bound
-- by the calling role's own RLS, same reasoning the old view's
-- `security_invoker = true` had.
-- Feeds getRandomPuzzle's client-side filter cascade (theme -> difficulty
-- -> vote quality -> unplayed, each falling back to the wider pool if
-- empty) without paying for every published puzzle's full text on every
-- single round start — this used to be get_published_puzzles, returning
-- title/scenario/solution/hint for every row just so the caller could
-- throw all but one of them away. Only the columns that cascade actually
-- filters on remain; once it has picked a winning id, the caller fetches
-- that one puzzle's real text via get_published_puzzle below.
create or replace function get_published_puzzle_candidates()
returns table (
  id uuid, pack_id uuid, theme text, difficulty text, is_community boolean
)
language sql stable
as $$
  -- exists, not a join, on purpose: a puzzle can have more than one
  -- translation row (nl + en), and a plain join would return it once per
  -- translation — silently doubling its odds of being the one picked.
  -- puzzle_translations_public, not the base table: this function runs as
  -- SECURITY INVOKER (see comment above), and puzzle_translations itself
  -- has no select policy anymore (see the puzzle-solution-exposure fix) —
  -- reading the base table here would make every EXISTS check fail for
  -- anyone but a puzzle's own creator, returning zero candidates. The view
  -- bypasses that (owner-privileged) while still respecting the same
  -- is_published gate this query already applies.
  select p.id, p.pack_id, sp.theme, p.difficulty, p.is_community
  from puzzles p
  join story_packs sp on sp.id = p.pack_id
  where sp.is_published = true
    and exists (select 1 from puzzle_translations_public pt where pt.puzzle_id = p.id);
$$;

-- The other half of get_published_puzzle_candidates above — full
-- translated text for exactly one puzzle, same locale-fallback shape the
-- old get_published_puzzles had per-row. Re-checks is_published (rather
-- than trusting the caller already filtered on it) in case the pack was
-- unpublished in the moment between the candidates fetch and this call.
-- Deliberately does NOT return solution: this powers getRandomPuzzle's
-- "pick a puzzle to start the round" call, which never needs it (only
-- puzzle.id is used) — get_room_puzzle is the one and only path that's
-- allowed to reveal a solution, and only to the narrator/after reveal.
create or replace function get_published_puzzle(puzzle_id_input uuid, locale_input text)
returns table (
  id uuid, pack_id uuid, title text, scenario text,
  category_id uuid, category text, difficulty text, hint text,
  created_at timestamptz, theme text, created_by uuid, is_community boolean,
  locale text
)
language sql stable
as $$
  select
    p.id, p.pack_id,
    coalesce(pt.title, pt_fallback.title) as title,
    coalesce(pt.scenario, pt_fallback.scenario) as scenario,
    p.category_id,
    coalesce(ct.name, ct_fallback.name) as category,
    p.difficulty,
    coalesce(pt.hint, pt_fallback.hint) as hint,
    p.created_at, sp.theme, p.created_by, p.is_community,
    case when pt.puzzle_id is not null then locale_input else 'nl' end as locale
  from puzzles p
  join story_packs sp on sp.id = p.pack_id
  left join categories c on c.id = p.category_id
  left join puzzle_translations_public pt on pt.puzzle_id = p.id and pt.locale = locale_input
  left join puzzle_translations_public pt_fallback on pt_fallback.puzzle_id = p.id and pt_fallback.locale = 'nl'
  left join category_translations ct on ct.category_id = c.id and ct.locale = locale_input
  left join category_translations ct_fallback on ct_fallback.category_id = c.id and ct_fallback.locale = 'nl'
  where sp.is_published = true
    and p.id = puzzle_id_input
    and coalesce(pt.title, pt_fallback.title) is not null;
$$;

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

-- getQuestionsInRoom/clearBestQuestion both filter on room_id, the former
-- also ordering by created_at — one index covers the filter and (for the
-- common no-extra-filter case) the sort too, same reasoning as
-- players_room_id_user_id_idx above. Same pattern repeats below for every
-- other room-scoped table a client fetches "everything in this room" from.
create index if not exists questions_room_id_created_at_idx on questions (room_id, created_at);

-- "narrator answers questions" below has no `with check`, so it defaults
-- to reusing `using` — restricting *who* (the narrator) but not *which*
-- columns, letting a narrator rewrite text/player_id/player_name on
-- someone else's question via a raw update. Unconditional (no legitimate
-- flow ever changes these columns, see lib/supabase/questions.ts): unlike
-- the players/rooms guards, this needs no set_config bypass flag.
create or replace function guard_question_privileged_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  new.room_id := old.room_id;
  new.puzzle_id := old.puzzle_id;
  new.player_id := old.player_id;
  new.player_name := old.player_name;
  new.text := old.text;
  new.round := old.round;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists guard_question_privileged_columns on questions;
create trigger guard_question_privileged_columns
  before update on questions
  for each row execute function guard_question_privileged_columns();

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

create index if not exists guesses_room_id_created_at_idx on guesses (room_id, created_at);

-- Same reasoning/shape as guard_question_privileged_columns: "narrator
-- reviews guesses" checks role, not columns — lib/supabase/guesses.ts's
-- reviewGuess only ever changes `status`.
create or replace function guard_guess_privileged_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  new.room_id := old.room_id;
  new.puzzle_id := old.puzzle_id;
  new.player_id := old.player_id;
  new.player_name := old.player_name;
  new.text := old.text;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists guard_guess_privileged_columns on guesses;
create trigger guard_guess_privileged_columns
  before update on guesses
  for each row execute function guard_guess_privileged_columns();

-- Narrator-authored hints — purely at the Verteller's own initiative, no
-- automatic/timer-driven hint exists anymore. One row per hint given (a
-- narrator may send several over a round); scoped to the specific puzzle
-- like questions/guesses, so it naturally clears when the round changes.
create table if not exists hints (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  puzzle_id uuid not null references puzzles (id),
  player_id uuid not null references players (id) on delete cascade,
  player_name text not null,
  text text not null,
  round int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists hints_room_id_created_at_idx on hints (room_id, created_at);

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

create index if not exists chat_messages_room_id_created_at_idx on chat_messages (room_id, created_at);

-- Fast reactions on a chat message — any emoji the sender's own
-- keyboard/picker gives them (like WhatsApp), not a fixed set. The app
-- layer (lib/game/emoji.ts) already rejects anything that isn't a single
-- emoji cluster before it gets here; this check is just a generous length
-- backstop against that being bypassed (e.g. a direct API call), long
-- enough for even multi-codepoint ZWJ sequences (family emoji etc.). One
-- row per player+message+emoji; toggling a reaction off is a delete, not a
-- status flip, so counts stay a simple `count(*)`.
create table if not exists chat_message_reactions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  message_id uuid not null references chat_messages (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (message_id, player_id, emoji)
);

-- getChatReactionsInRoom fetches all of a room's reactions unfiltered
-- (no ordering) to reconcile against locally-held messages — no existing
-- unique constraint here has room_id as its leading column.
create index if not exists chat_message_reactions_room_id_idx on chat_message_reactions (room_id);

-- One row per concluded round — the "zaken-archief" shown live in-game and
-- summarized in the end-of-session recap. Denormalized (puzzle_title,
-- solver_name, narrator_name as plain text) like questions/guesses already
-- are, so the log stays readable even if a puzzle or player is later gone.
-- puzzle_title is captured in whatever language the round was actually
-- played in — it deliberately does NOT follow later puzzle translations,
-- since this is a historical record of what happened, not a live view.
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

-- Nullable, populated by the client alongside solver_name/narrator_name
-- (which stay purely for display) — lets the case_log_stats trigger below
-- attribute rounds_solved/rounds_narrated to a real account instead of a
-- free-text name that could collide or belong to nobody in particular.
-- Rows logged before this column existed simply stay null and are never
-- counted, same "stats start from now" precedent as the players.user_id
-- migration further up this file.
alter table case_log add column if not exists solver_user_id uuid references auth.users (id) on delete set null;
alter table case_log add column if not exists narrator_user_id uuid references auth.users (id) on delete set null;

-- Saboteur mode: one hidden rader per round secretly knows the solution and
-- tries to mislead the others while still looking like a normal player.
-- `saboteur_id` can NOT live on `rooms` or `players` — both of those tables
-- are publicly readable (see "public read rooms"/"public read players"
-- below), so any column added there would be visible to every player,
-- defeating the entire point. This table exists specifically so RLS can
-- restrict a single row (not a single column — Postgres RLS has no notion
-- of "hide this column") to only the saboteur themselves, until the round's
-- accusation vote closes and `revealed` flips to true.
create table if not exists round_secrets (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  round int not null,
  saboteur_id uuid not null references players (id) on delete cascade,
  revealed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, round)
);

-- One vote per player per round for "who do you think the saboteur is?" —
-- cast during the post-reveal accusation window. Hidden the same way as
-- round_secrets (own vote only) until that round's secret is revealed, so
-- votes can't influence each other while the window is still open. A
-- player may change their mind before the window closes (upsert on the
-- unique constraint), so this is a currently-held vote, not a vote log.
create table if not exists round_accusations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  round int not null,
  voter_id uuid not null references players (id) on delete cascade,
  target_id uuid not null references players (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, round, voter_id)
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

-- "members move board items" below deliberately lets any room member edit
-- any item's position/text/color (the board is fully collaborative by
-- design) — but that same breadth let a member reassign created_by to
-- themselves on someone else's note, which then blocks the true creator
-- from deleting it under "creator or host deletes board items". Guards
-- only the identity/shape columns; position/text/color stay freely
-- editable by any member.
create or replace function guard_board_item_privileged_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  new.room_id := old.room_id;
  new.kind := old.kind;
  new.question_id := old.question_id;
  new.created_by := old.created_by;
  return new;
end;
$$;

drop trigger if exists guard_board_item_privileged_columns on board_items;
create trigger guard_board_item_privileged_columns
  before update on board_items
  for each row execute function guard_board_item_privileged_columns();

-- The unique index above is partial (question_id is not null only), so it
-- can't serve getBoardItems' "every item in this room" fetch (which
-- includes plain notes, question_id null) or clear_board_on_new_round's
-- delete — both need a full, unfiltered index on room_id.
create index if not exists board_items_room_id_created_at_idx on board_items (room_id, created_at);

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
    perform set_config('app.player_privileged_update', 'on', true);
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

-- "host or narrator update rooms" below only checks *who* (host or
-- narrator), not *which columns* — without this, a narrator could PATCH
-- their own room's host_id directly, self-promoting to host and bypassing
-- set_host's "only the current host may transfer" check entirely. Same
-- guard-trigger shape as guard_player_privileged_columns: reverts
-- host_id/narrator_id to OLD unless the legitimate RPCs (set_host,
-- set_narrator, claim_host, claim_narrator) flagged this update themselves.
create or replace function guard_room_privileged_columns()
returns trigger
language plpgsql
security definer
as $$
begin
  if current_setting('app.room_role_update', true) = 'on' then
    return new;
  end if;

  new.host_id := old.host_id;
  new.narrator_id := old.narrator_id;
  return new;
end;
$$;

drop trigger if exists guard_room_privileged_columns on rooms;
create trigger guard_room_privileged_columns
  before update on rooms
  for each row execute function guard_room_privileged_columns();

-- === Authorization helpers ==================================================
-- security definer + stable: usable inside RLS policies without triggering
-- RLS recursion (a policy that queries its own table via a normal function
-- call would otherwise re-trigger RLS and potentially loop/deny itself).

-- p.room_id = target_room_id is load-bearing, not redundant with r.id =
-- target_room_id: without it, a player who holds the host/narrator seat in
-- some OTHER room (rooms.host_id/narrator_id has no FK to players, so
-- nothing stops it pointing at a foreign-room player row) would pass this
-- check for target_room_id too, since only p.user_id was ever verified.
create or replace function is_room_host(target_room_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from rooms r join players p on p.id = r.host_id
    where r.id = target_room_id and p.room_id = target_room_id and p.user_id = auth.uid()
  );
$$;

create or replace function is_room_narrator(target_room_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from rooms r join players p on p.id = r.narrator_id
    where r.id = target_room_id and p.room_id = target_room_id and p.user_id = auth.uid()
  );
$$;

-- Used by set_host/claim_host/set_narrator/claim_narrator to verify a
-- target player id actually belongs to the room being acted on, before
-- writing rooms.host_id/narrator_id (which has no FK to players).
create or replace function player_belongs_to_room(target_player_id uuid, target_room_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from players where id = target_player_id and room_id = target_room_id
  );
$$;

-- Same idea as player_belongs_to_room, keyed on a user id instead of a
-- player id — used by case_log's insert check, since solver_user_id/
-- narrator_user_id there reference auth.users, not players.
create or replace function user_belongs_to_room(target_user_id uuid, target_room_id uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from players where user_id = target_user_id and room_id = target_room_id
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

-- Long-term stats (see player_stats below) only ever accrue for players who
-- upgraded their anonymous session to a real account (linked an email) —
-- an anonymous score is exactly as unverifiable/gameable as any other
-- outcome in this narrator-trusts-the-group game, so there's no honest way
-- to call it "long-term" without at least that minimal commitment.
-- Defaults to true (don't count) if the user can't be found at all.
create or replace function is_anonymous_user(target_user_id uuid) returns boolean
language sql stable security definer as $$
  select coalesce(
    (select is_anonymous from auth.users where id = target_user_id),
    true
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
declare
  target_user_id uuid;
begin
  if not (is_room_narrator(room_id_input) or is_room_host(room_id_input)) then
    raise exception 'Not authorized to change scores in this room';
  end if;

  perform set_config('app.player_privileged_update', 'on', true);
  update players set score = greatest(0, score + amount_input)
  where id = player_id_input and room_id = room_id_input
  returning user_id into target_user_id;

  -- Every score change in the game already funnels through this one
  -- function, so it's the single cheapest place to also keep a lifetime
  -- total — no separate call site needed anywhere else. See player_stats
  -- below and is_anonymous_user above for why this only applies to
  -- upgraded accounts.
  if target_user_id is not null and not is_anonymous_user(target_user_id) then
    insert into player_stats (user_id, lifetime_score)
    values (target_user_id, amount_input)
    on conflict (user_id) do update
      set lifetime_score = player_stats.lifetime_score + excluded.lifetime_score,
          updated_at = now();
  end if;
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
  if not player_belongs_to_room(player_id_input, room_id_input) then
    raise exception 'Target player not in this room';
  end if;

  perform set_config('app.player_privileged_update', 'on', true);
  update players set is_narrator = false where room_id = room_id_input;
  update players set is_narrator = true where id = player_id_input and room_id = room_id_input;
  perform set_config('app.room_role_update', 'on', true);
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
  if not player_belongs_to_room(player_id_input, room_id_input) then
    raise exception 'Target player not in this room';
  end if;

  perform set_config('app.player_privileged_update', 'on', true);
  update players set is_host = false where room_id = room_id_input;
  update players set is_host = true where id = player_id_input and room_id = room_id_input;
  perform set_config('app.room_role_update', 'on', true);
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
  if not player_belongs_to_room(claiming_player_id, room_id_input) then
    raise exception 'Target player not in this room';
  end if;

  perform set_config('app.player_privileged_update', 'on', true);
  update players set is_host = false where room_id = room_id_input;
  update players set is_host = true where id = claiming_player_id and room_id = room_id_input;
  perform set_config('app.room_role_update', 'on', true);
  update rooms set host_id = claiming_player_id where id = room_id_input;
end;
$$;

-- For automatic offline-takeover only (see lib/game/membership.ts:
-- pickRandomOnlineCandidate, called from GamePlayClient after the Verteller
-- has been offline past a timeout, by the current host's own client). Host-
-- only, same trust model as set_narrator: since increment_player_score
-- authorizes on "is currently narrator or host", letting any member
-- reassign the role to anyone (including themselves) used to be a
-- score-manipulation path (claim narrator, award yourself points, hand it
-- back) — restricting the caller to the host closes that without needing
-- server-side presence tracking. If the host is also offline, claim_host
-- (unchanged, self-claim, no timeout) lets the deterministic successor
-- become host first; their client then completes the narrator takeover.
create or replace function claim_narrator(room_id_input uuid, new_narrator_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_room_host(room_id_input) then
    raise exception 'Only the host can reassign the Verteller';
  end if;
  if not exists (
    select 1 from players
    where id = new_narrator_id and room_id = room_id_input and not is_spectator
  ) then
    raise exception 'Target player not in this room';
  end if;

  perform set_config('app.player_privileged_update', 'on', true);
  update players set is_narrator = false where room_id = room_id_input;
  update players set is_narrator = true where id = new_narrator_id and room_id = room_id_input;
  perform set_config('app.room_role_update', 'on', true);
  update rooms set narrator_id = new_narrator_id where id = room_id_input;
end;
$$;

-- No cross-device player-identity recovery on purpose: rooms/players are
-- both publicly readable (see "public read rooms"/"public read players"),
-- so a room_id + player name is never a real secret — anyone could look
-- both up without ever having joined and take over an active player's seat.
-- Same model most similar apps use (Kahoot, Jackbox Games, Skribbl.io):
-- lose your session, rejoin as a new player. Anyone who wants real
-- cross-device continuity already has it via the optional real account
-- (lib/supabase/accountAuth.ts) — same auth.uid(), no reclaim needed.
-- (Used to be a reclaim_player() RPC here; removed rather than patched.)

-- Closes a round's saboteur-mode accusation vote: tallies every cast vote,
-- awards each voter a small personal bonus/penalty for guessing right or
-- wrong, awards the saboteur their outcome-based bonus (bigger if the
-- puzzle went unsolved, wiped out if both solved and correctly accused),
-- and finally flips `revealed` so round_secrets/round_accusations become
-- readable to everyone. Runs as security definer specifically because it
-- needs to read round_secrets/round_accusations rows nobody but their own
-- owner could normally see — that's the whole point of doing this
-- server-side instead of the host client reading-then-writing in two steps.
-- Safe to call more than once (e.g. a retried request): the `not revealed`
-- guard makes every later call after the first a no-op.
create or replace function close_accusation_vote(room_id_input uuid, round_input int)
returns void
language plpgsql
security definer
as $$
declare
  saboteur uuid;
  was_solved boolean;
  accused uuid;
  voter record;
begin
  if not is_room_host(room_id_input) then
    raise exception 'Only the host can close the accusation vote';
  end if;

  select saboteur_id into saboteur
  from round_secrets
  where room_id = room_id_input and round = round_input and not revealed;

  if saboteur is null then
    return;
  end if;

  select exists (
    select 1 from case_log
    where room_id = room_id_input and round = round_input and outcome = 'solved'
  ) into was_solved;

  -- The accused player is whoever has strictly the most votes; a tie for
  -- first place (including "nobody voted") means nobody was identified.
  with tally as (
    select target_id, count(*) as votes
    from round_accusations
    where room_id = room_id_input and round = round_input
    group by target_id
  ),
  ranked as (
    select target_id, votes, rank() over (order by votes desc) as position
    from tally
  )
  select target_id into accused
  from ranked
  where position = 1 and (select count(*) from ranked where position = 1) = 1;

  for voter in
    select voter_id, target_id from round_accusations
    where room_id = room_id_input and round = round_input
  loop
    if voter.target_id = saboteur then
      perform increment_player_score(voter.voter_id, 30, room_id_input);
    else
      perform increment_player_score(voter.voter_id, -20, room_id_input);
    end if;
  end loop;

  if accused = saboteur then
    perform increment_player_score(saboteur, case when was_solved then 0 else 75 end, room_id_input);
  else
    perform increment_player_score(saboteur, case when was_solved then 40 else 150 end, room_id_input);
  end if;

  update round_secrets set revealed = true
  where room_id = room_id_input and round = round_input;
end;
$$;

-- Returns the room's current puzzle with the solution nulled out unless the
-- caller is the Verteller or the round has already been revealed — the
-- first time "Verteller ziet de oplossing, anderen niet" is enforced by the
-- server instead of the client just choosing not to render it.
-- locale_input picks which translation to read; falls back to Dutch at the
-- SQL level wherever the requested locale has no row yet, same as
-- get_published_puzzles above.
create or replace function get_room_puzzle(room_id_input uuid, locale_input text default 'nl')
returns table (
  id uuid, pack_id uuid, title text, scenario text, solution text,
  category text, difficulty text, hint text, created_at timestamptz,
  locale text
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
    p.id, p.pack_id,
    coalesce(pt.title, pt_fallback.title),
    coalesce(pt.scenario, pt_fallback.scenario),
    case when can_see_solution then coalesce(pt.solution, pt_fallback.solution) else null end,
    coalesce(ct.name, ct_fallback.name),
    p.difficulty,
    coalesce(pt.hint, pt_fallback.hint),
    p.created_at,
    case when pt.puzzle_id is not null then locale_input else 'nl' end
  from puzzles p
  left join categories c on c.id = p.category_id
  left join puzzle_translations pt on pt.puzzle_id = p.id and pt.locale = locale_input
  left join puzzle_translations pt_fallback on pt_fallback.puzzle_id = p.id and pt_fallback.locale = 'nl'
  left join category_translations ct on ct.category_id = c.id and ct.locale = locale_input
  left join category_translations ct_fallback on ct_fallback.category_id = c.id and ct_fallback.locale = 'nl'
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

drop trigger if exists rate_limit_hints on hints;
create trigger rate_limit_hints
  before insert on hints
  for each row execute function enforce_rate_limit(
    5, 60, 'player_id', 'created_at',
    'Rustig aan met hints geven — probeer over een minuutje opnieuw.'
  );

drop trigger if exists rate_limit_chat_messages on chat_messages;
create trigger rate_limit_chat_messages
  before insert on chat_messages
  for each row execute function enforce_rate_limit(
    8, 10, 'player_id', 'created_at',
    'Even rustig met chatten — probeer over een paar tellen opnieuw.'
  );

drop trigger if exists rate_limit_chat_message_reactions on chat_message_reactions;
create trigger rate_limit_chat_message_reactions
  before insert on chat_message_reactions
  for each row execute function enforce_rate_limit(
    30, 10, 'player_id', 'created_at',
    'Even rustig met reageren — probeer over een paar tellen opnieuw.'
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

drop trigger if exists moderate_hints on hints;
create trigger moderate_hints
  before insert on hints
  for each row execute function enforce_chat_moderation();

drop trigger if exists moderate_board_items on board_items;
create trigger moderate_board_items
  before insert on board_items
  for each row execute function enforce_chat_moderation();

-- questions.text/guesses.text were never wired to this filter — both are
-- broadcast to the whole room the same way chat is (guesses.text is also
-- shown on the board via board_items), so the same banned-words check
-- applies to them.
drop trigger if exists moderate_questions on questions;
create trigger moderate_questions
  before insert on questions
  for each row execute function enforce_chat_moderation();

drop trigger if exists moderate_guesses on guesses;
create trigger moderate_guesses
  before insert on guesses
  for each row execute function enforce_chat_moderation();

-- === Cleanup: stale rooms ===================================================
-- A room older than 24h is stale regardless of status — nobody leaves a
-- lobby open, or a game running, for a full day. Deleting the room cascades
-- to players/questions/guesses/hints/chat_messages/case_log automatically
-- (all declared `on delete cascade` above), so this one delete is the entire
-- cleanup. Runs hourly via pg_cron so abandoned rooms don't sit around for
-- close to a full day before being swept.
create extension if not exists pg_cron;

-- This delete's WHERE clause is the entire cleanup — without an index on
-- created_at, every hourly run is a full sequential scan of the whole
-- rooms table, not just the (bounded, ~24h worth of) stale ones.
create index if not exists rooms_created_at_idx on rooms (created_at);

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
alter table chat_message_reactions replica identity full;

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
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hints'
  ) then
    alter publication supabase_realtime add table hints;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_message_reactions'
  ) then
    alter publication supabase_realtime add table chat_message_reactions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'case_log'
  ) then
    alter publication supabase_realtime add table case_log;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'round_secrets'
  ) then
    alter publication supabase_realtime add table round_secrets;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'round_accusations'
  ) then
    alter publication supabase_realtime add table round_accusations;
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
alter table story_pack_translations enable row level security;
alter table puzzles enable row level security;
alter table puzzle_translations enable row level security;
alter table categories enable row level security;
alter table category_translations enable row level security;
alter table themes enable row level security;
alter table admins enable row level security;
alter table questions enable row level security;
alter table guesses enable row level security;
alter table hints enable row level security;
alter table chat_messages enable row level security;
alter table chat_message_reactions enable row level security;
alter table round_secrets enable row level security;
alter table round_accusations enable row level security;
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
-- Row ownership only — see guard_player_privileged_columns above for why
-- that's still safe: it silently reverts score/is_host/is_narrator/
-- is_spectator/room_id/user_id on any update that doesn't go through one of
-- the security-definer RPCs, so a direct update through this policy can
-- only ever change `name`.
drop policy if exists "update own player" on players;
create policy "update own player" on players for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "leave or be kicked" on players;
create policy "leave or be kicked" on players for delete
  using (user_id = auth.uid() or is_room_host(room_id));

-- Published packs stay public (the whole point of /community); an
-- unpublished/draft community pack is only visible to its own creator —
-- previously `using (true)` let anyone who obtained a draft pack's UUID
-- read it in full before the creator ever chose to publish. Admins/
-- creators keep their own access regardless via the `for all` policies
-- below (those apply to select too).
drop policy if exists "public read story packs" on story_packs;
create policy "public read story packs" on story_packs for select
  using (is_published or created_by = auth.uid());
drop policy if exists "public read story pack translations" on story_pack_translations;
create policy "public read story pack translations" on story_pack_translations for select
  using (
    exists (
      select 1 from story_packs sp
      where sp.id = story_pack_translations.pack_id
        and (sp.is_published or sp.created_by = auth.uid())
    )
  );
drop policy if exists "public read puzzles" on puzzles;
create policy "public read puzzles" on puzzles for select
  using (
    exists (select 1 from story_packs sp where sp.id = puzzles.pack_id and sp.is_published)
    or created_by = auth.uid()
  );
-- No public policy on puzzle_translations itself anymore — `solution` must
-- never be readable by a direct table query (see get_room_puzzle/
-- get_published_puzzle, which are the only intended paths for that column).
-- puzzle_translations_public below is the actual public-read surface,
-- explicitly excluding solution and reapplying the same
-- published-or-own-draft gate as the two policies above.
drop policy if exists "public read puzzle translations" on puzzle_translations;
-- puzzle_translations_public (the actual public-read surface, excluding
-- solution) is defined earlier in this file, right after the
-- puzzle_translations table — see there for why.

drop policy if exists "public read categories" on categories;
create policy "public read categories" on categories for select using (true);
drop policy if exists "public read category translations" on category_translations;
create policy "public read category translations" on category_translations for select using (true);
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
drop policy if exists "admins write story pack translations" on story_pack_translations;
create policy "admins write story pack translations" on story_pack_translations for all
  using (exists (select 1 from admins where id = auth.uid()))
  with check (exists (select 1 from admins where id = auth.uid()));
drop policy if exists "admins write puzzles" on puzzles;
create policy "admins write puzzles" on puzzles for all
  using (exists (select 1 from admins where id = auth.uid()))
  with check (exists (select 1 from admins where id = auth.uid()));
drop policy if exists "admins write puzzle translations" on puzzle_translations;
create policy "admins write puzzle translations" on puzzle_translations for all
  using (exists (select 1 from admins where id = auth.uid()))
  with check (exists (select 1 from admins where id = auth.uid()));
drop policy if exists "admins write categories" on categories;
create policy "admins write categories" on categories for all
  using (exists (select 1 from admins where id = auth.uid()))
  with check (exists (select 1 from admins where id = auth.uid()));
drop policy if exists "admins write category translations" on category_translations;
create policy "admins write category translations" on category_translations for all
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

drop policy if exists "public read hints" on hints;
create policy "public read hints" on hints for select using (true);
drop policy if exists "narrator gives hints" on hints;
create policy "narrator gives hints" on hints for insert
  with check (is_room_narrator(room_id) and is_own_player(player_id));

drop policy if exists "public read chat messages" on chat_messages;
create policy "public read chat messages" on chat_messages for select using (true);
drop policy if exists "chat as self" on chat_messages;
create policy "chat as self" on chat_messages for insert with check (is_own_player(player_id));

drop policy if exists "public read chat message reactions" on chat_message_reactions;
create policy "public read chat message reactions" on chat_message_reactions for select using (true);
drop policy if exists "react as self" on chat_message_reactions;
create policy "react as self" on chat_message_reactions for insert with check (is_own_player(player_id));
drop policy if exists "remove own reaction" on chat_message_reactions;
create policy "remove own reaction" on chat_message_reactions for delete using (is_own_player(player_id));

-- Only the saboteur can read their own secret; everyone can once the host
-- closes that round's accusation vote (see close_accusation_vote below,
-- which is the only thing that ever flips `revealed`).
drop policy if exists "saboteur reads own secret" on round_secrets;
create policy "saboteur reads own secret" on round_secrets for select
  using (is_own_player(saboteur_id) or revealed);
drop policy if exists "host assigns saboteur" on round_secrets;
create policy "host assigns saboteur" on round_secrets for insert with check (
  is_room_host(room_id) and player_belongs_to_room(saboteur_id, room_id)
);

-- Same "own row, or everyone once revealed" shape as round_secrets, so a
-- vote can't be seen (and can't sway anyone else) while the window is
-- still open. Voters may change their mind before the window closes
-- (upsert), and everyone in the room may vote, including the saboteur.
drop policy if exists "player reads own or revealed accusation" on round_accusations;
create policy "player reads own or revealed accusation" on round_accusations for select
  using (
    is_own_player(voter_id)
    or exists (
      select 1 from round_secrets rs
      where rs.room_id = round_accusations.room_id
        and rs.round = round_accusations.round
        and rs.revealed
    )
  );
-- is_own_player(voter_id) alone only proves the caller owns that player
-- row — it never checked room_id/round matched where that player actually
-- is, so a player in Room A could insert/update a vote row naming Room B,
-- forging a phantom vote into an unrelated room's accusation tally. The
-- round_secrets existence check doubles as a (room, round) validity check,
-- since a round_secrets row is always created for a saboteur round before
-- accusations can open.
drop policy if exists "vote as self" on round_accusations;
create policy "vote as self" on round_accusations for insert with check (
  is_own_player(voter_id)
  and player_belongs_to_room(voter_id, room_id)
  and player_belongs_to_room(target_id, room_id)
  and exists (
    select 1 from round_secrets rs
    where rs.room_id = round_accusations.room_id and rs.round = round_accusations.round
  )
);
drop policy if exists "change own vote" on round_accusations;
create policy "change own vote" on round_accusations for update
  using (is_own_player(voter_id))
  with check (
    is_own_player(voter_id)
    and player_belongs_to_room(voter_id, room_id)
    and player_belongs_to_room(target_id, room_id)
  );

-- Was `using (true)` — let anyone with the anon key read solver_user_id/
-- narrator_user_id for every room ever played, correlating an account's
-- identity across rooms they were never a member of. The app itself
-- (getCaseLogForRoom) always scopes this per room_id already — it's a
-- per-room "zaken-archief"/recap feature, not a global archive — so
-- scoping the policy the same way is a pure tightening, not a UX change.
drop policy if exists "public read case log" on case_log;
create policy "public read case log" on case_log for select using (is_room_member(room_id));
-- Previously only checked the caller's own role in room_id, never that
-- solver_user_id/narrator_user_id on the row actually belong to that room —
-- a host/narrator could insert a case_log row naming an arbitrary
-- auth.users id, and apply_case_log_stats (a trigger on this table) would
-- silently credit that unrelated account's player_stats.
drop policy if exists "narrator or host logs case" on case_log;
create policy "narrator or host logs case" on case_log for insert
  with check (
    (is_room_narrator(room_id) or is_room_host(room_id))
    and (solver_user_id is null or user_belongs_to_room(solver_user_id, room_id))
    and (narrator_user_id is null or user_belongs_to_room(narrator_user_id, room_id))
  );

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
insert into story_packs (slug, theme, is_published) values
  ('classics-vol-1', 'Klassiek', true)
on conflict (slug) do nothing;

insert into story_pack_translations (pack_id, locale, name, status)
select sp.id, 'nl', 'Klassiekers Vol. 1', 'reviewed'
from story_packs sp
where sp.slug = 'classics-vol-1'
on conflict (pack_id, locale) do nothing;

insert into story_pack_translations (pack_id, locale, name, status)
select sp.id, 'en', 'Classics Vol. 1', 'machine'
from story_packs sp
where sp.slug = 'classics-vol-1'
on conflict (pack_id, locale) do nothing;

-- Idempotent via an explicit existence check (join puzzles -> its Dutch
-- translation by title) instead of ON CONFLICT — puzzle_translations has no
-- (pack, title) constraint to conflict on, see the note near its
-- definition above.
do $$
declare
  v_pack_id uuid;
  v_category_id uuid;
  v_puzzle_id uuid;
  v_row record;
begin
  select id into v_pack_id from story_packs where slug = 'classics-vol-1';
  select category_id into v_category_id
  from category_translations where locale = 'nl' and name = 'Klassiek raadsel' limit 1;

  for v_row in
    select * from (values
      (
        'De brief zonder postzegel',
        'Een postbode bezorgt een brief zonder postzegel, en toch krijgt niemand een boete of nabetaling — de brief wordt gewoon netjes afgeleverd.',
        'De brief zit in een dienstenvelop van de posterijen zelf, intern verstuurd tussen twee postkantoren. Interne post heeft nooit een postzegel nodig gehad.',
        'easy'::text,
        'Niet alle post komt van buiten het systeem.'
      ),
      (
        'De man die zijn eigen begrafenis miste',
        'Op een begrafenis wordt de overledene herdacht en de kist gedragen, terwijl de man zelf kilometers verderop nog leeft en van niets weet.',
        'Het is de begrafenis van zijn tweelingbroer, die dezelfde voornaam draagt. Een verwarde buurtkrant meldde het overlijden onder de verkeerde naam, en de man zelf hoort er pas later per toeval van.',
        'medium'::text,
        'Twee mensen kunnen dezelfde naam dragen — en soms ook hetzelfde gezicht.'
      )
    ) as v(title, scenario, solution, difficulty, hint)
  loop
    if not exists (
      select 1 from puzzle_translations pt
      join puzzles p on p.id = pt.puzzle_id
      where p.pack_id = v_pack_id and pt.locale = 'nl' and pt.title = v_row.title
    ) then
      insert into puzzles (pack_id, category_id, difficulty)
      values (v_pack_id, v_category_id, v_row.difficulty)
      returning id into v_puzzle_id;

      insert into puzzle_translations (puzzle_id, locale, title, scenario, solution, hint, status)
      values (v_puzzle_id, 'nl', v_row.title, v_row.scenario, v_row.solution, v_row.hint, 'reviewed');
    end if;
  end loop;
end $$;

-- English translations of the same two starter puzzles, matched to their
-- existing puzzle_id via the Dutch title above (not a second seed loop —
-- both puzzles already exist by now, this only adds their English row).
insert into puzzle_translations (puzzle_id, locale, title, scenario, solution, hint, status)
select pt_nl.puzzle_id, 'en', v.title, v.scenario, v.solution, v.hint, 'machine'
from (values
  (
    'De brief zonder postzegel',
    'The letter without a stamp',
    'A postal worker delivers a letter without a stamp, and yet nobody gets fined or has to pay extra — the letter is simply delivered as normal.',
    'The letter is in an internal service envelope from the postal service itself, sent between two post offices. Internal mail has never needed a stamp.',
    'Not all mail comes from outside the system.'
  ),
  (
    'De man die zijn eigen begrafenis miste',
    'The man who missed his own funeral',
    'At a funeral, the deceased is being mourned and the coffin carried, while the man himself is very much alive, miles away, and knows nothing about it.',
    'It''s the funeral of his identical twin brother, who shares the same first name. A confused local newspaper reported the death under the wrong name, and the man himself only finds out by chance much later.',
    'Two people can share the same name — and sometimes even the same face.'
  )
) as v(title_nl, title, scenario, solution, hint)
join puzzle_translations pt_nl on pt_nl.locale = 'nl' and pt_nl.title = v.title_nl
on conflict (puzzle_id, locale) do nothing;

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

-- Long-term player stats — only ever written by the security-definer hooks
-- below (increment_player_score, apply_case_log_stats, apply_room_finished
-- _stats), never directly by a client, and only for accounts that passed
-- is_anonymous_user. Private to the owner: no leaderboard/global comparison
-- exists in this app on purpose (see the increment_player_score comment —
-- an unverifiable narrator-trust game gives cheating real payoff the moment
-- there's an audience to impress, so this stays a personal-only view).
create table if not exists player_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  games_played int not null default 0,
  rounds_solved int not null default 0,
  rounds_narrated int not null default 0,
  lifetime_score int not null default 0,
  updated_at timestamptz not null default now()
);

-- After a round's outcome is logged, credit the solver/narrator (if they're
-- on an upgraded account) with a round played. Fires once per case_log row
-- — that table's own (room_id, round) unique constraint already prevents
-- duplicate inserts for the same round, so this can't double-count.
create or replace function apply_case_log_stats() returns trigger
language plpgsql
security definer
as $$
begin
  if new.narrator_user_id is not null and not is_anonymous_user(new.narrator_user_id) then
    insert into player_stats (user_id, rounds_narrated)
    values (new.narrator_user_id, 1)
    on conflict (user_id) do update
      set rounds_narrated = player_stats.rounds_narrated + 1,
          updated_at = now();
  end if;

  if new.outcome = 'solved' and new.solver_user_id is not null
     and not is_anonymous_user(new.solver_user_id) then
    insert into player_stats (user_id, rounds_solved)
    values (new.solver_user_id, 1)
    on conflict (user_id) do update
      set rounds_solved = player_stats.rounds_solved + 1,
          updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists case_log_stats on case_log;
create trigger case_log_stats
  after insert on case_log
  for each row execute function apply_case_log_stats();

-- Credits everyone who actually played (not spectators) with a game once
-- the room is marked finished — see GamePlayClient for the two points that
-- set this (out of rounds, or hardcore mode out of team lives). Guarded on
-- an actual old->new status change so a redundant client call (more than
-- one player's client can race to set this) can't double-count.
create or replace function apply_room_finished_stats() returns trigger
language plpgsql
security definer
as $$
declare
  member record;
begin
  if new.status = 'finished' and old.status is distinct from new.status then
    for member in
      select user_id from players
      where room_id = new.id and is_spectator = false and user_id is not null
    loop
      if not is_anonymous_user(member.user_id) then
        insert into player_stats (user_id, games_played)
        values (member.user_id, 1)
        on conflict (user_id) do update
          set games_played = player_stats.games_played + 1,
              updated_at = now();
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists room_finished_stats on rooms;
create trigger room_finished_stats
  after update on rooms
  for each row execute function apply_room_finished_stats();

-- story_packs.created_by/is_community and puzzles.created_by/is_community
-- both moved up next to their respective table definitions, well before
-- this point — see the comments there.

-- Neither pack_id nor created_by had an index before: pack_id backs
-- listPuzzlesForPack/deletePuzzlesForPack (every puzzle-management screen
-- filters a pack's puzzles this way), created_by backs "my puzzles"
-- (getMyCommunityPuzzles), ordered newest-first.
create index if not exists puzzles_pack_id_idx on puzzles (pack_id);
create index if not exists puzzles_created_by_created_at_idx on puzzles (created_by, created_at);

-- Same reasoning as puzzles_created_by_created_at_idx, for "my packs"
-- (getMyCommunityPacks).
create index if not exists story_packs_created_by_created_at_idx on story_packs (created_by, created_at);

-- Backs list_community_packs_newest's exact filter+sort (is_community,
-- is_published, then created_at) — without this, paginating "Newest" is
-- still a full scan of story_packs on every page.
create index if not exists story_packs_community_published_created_at_idx
  on story_packs (is_community, is_published, created_at)
  where is_community and is_published;

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

-- The primary key above is (pack_id, user_id) — great for "who favorited
-- this pack", useless for listFavoritePackIds' "this user's favorites"
-- (user_id isn't the leading column, so it can't use that index).
create index if not exists pack_favorites_user_id_idx on pack_favorites (user_id);

-- Vote totals per puzzle, for sorting/display. security_invoker so it's
-- bound by the querying role's own RLS, same reasoning as get_published_puzzles.
create or replace view puzzle_vote_totals
  with (security_invoker = true) as
  select
    puzzle_id,
    count(*) filter (where value = 1) as upvotes,
    count(*) filter (where value = -1) as downvotes,
    coalesce(sum(value), 0) as score,
    count(*) as vote_count
  from puzzle_votes
  group by puzzle_id;

-- A pack's score is the sum of its puzzles' scores — aggregated here once
-- instead of every browse-page load fetching every published pack's
-- puzzles and every one of those puzzles' votes just to sum them in JS
-- (the old listCommunityPacks). Lets "Top" sort and paginate in SQL like
-- "Newest" already could. Packs with no votes (or no puzzles) simply don't
-- appear here — the two list functions below LEFT JOIN and coalesce to 0.
create or replace view pack_vote_totals
  with (security_invoker = true) as
  select
    p.pack_id,
    coalesce(sum(pvt.score), 0)::int as score,
    coalesce(sum(pvt.vote_count), 0)::int as vote_count
  from puzzles p
  join puzzle_vote_totals pvt on pvt.puzzle_id = p.id
  group by p.pack_id;

-- Both return just (id, score) for one page of results, sorted in SQL —
-- the caller fetches the actual pack rows (name, theme, ...) for only that
-- page's ids afterward, same "fetch the page, not the catalog" idea as
-- get_published_puzzle_candidates/get_published_puzzle above. Split into
-- two functions rather than one with a sort-mode parameter: the ORDER BY
-- target differs (created_at vs an aggregate), which doesn't reduce to a
-- single expression to swap cleanly.
create or replace function list_community_packs_newest(limit_input int, offset_input int)
returns table (id uuid, score int)
language sql stable
as $$
  select sp.id, coalesce(pvt.score, 0)
  from story_packs sp
  left join pack_vote_totals pvt on pvt.pack_id = sp.id
  where sp.is_community = true and sp.is_published = true
  order by sp.created_at desc, sp.id
  limit limit_input offset offset_input;
$$;

-- Below MIN_VOTES_TO_TRUST_SCORE (same threshold getRandomPuzzle's own
-- client-side rating filter uses, see lib/supabase/puzzles.ts), a pack's
-- score is treated as neutral (0) for ranking purposes rather than trusted
-- outright — a handful of votes from freshly-minted anonymous sessions
-- (free to create, no friction) would otherwise be enough to push a pack
-- to the top of "Top" before it's collected any real signal. Doesn't stop
-- vote-stuffing outright (that needs friction on session creation, a
-- product decision, not a ranking-formula fix) but damps its effect on
-- what every visitor sees first.
create or replace function list_community_packs_top(limit_input int, offset_input int)
returns table (id uuid, score int)
language sql stable
as $$
  select
    sp.id,
    case when coalesce(pvt.vote_count, 0) < 5 then 0 else coalesce(pvt.score, 0) end as score
  from story_packs sp
  left join pack_vote_totals pvt on pvt.pack_id = sp.id
  where sp.is_community = true and sp.is_published = true
  order by
    case when coalesce(pvt.vote_count, 0) < 5 then 0 else coalesce(pvt.score, 0) end desc,
    sp.id
  limit limit_input offset offset_input;
$$;

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

-- Reuses the same banned_words list as chat moderation. Puzzle text now
-- lives on puzzle_translations, not puzzles, so this trigger moved there
-- too — it looks up whether the parent puzzle is community content (and
-- therefore untrusted) via puzzle_id, since is_community itself still lives
-- on puzzles. Curated/admin content (is_community = false) is trusted and
-- skips this check, same as before.
create or replace function enforce_puzzle_translation_moderation()
returns trigger
language plpgsql
security definer
as $$
declare
  hit text;
  puzzle_is_community boolean;
begin
  select is_community into puzzle_is_community from puzzles where id = new.puzzle_id;
  if not coalesce(puzzle_is_community, false) then
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
drop function if exists enforce_puzzle_moderation();

drop trigger if exists moderate_puzzle_translations on puzzle_translations;
create trigger moderate_puzzle_translations
  before insert or update on puzzle_translations
  for each row execute function enforce_puzzle_translation_moderation();

-- Puzzle bodies were moderated, but a community pack's own name/theme
-- weren't — the first thing anyone sees on the /community browse grid,
-- self-published with no review step. Same banned-words check, same
-- is_community gate, split across two triggers since name and theme live
-- on different tables.
create or replace function enforce_pack_translation_moderation()
returns trigger
language plpgsql
security definer
as $$
declare
  hit text;
  pack_is_community boolean;
begin
  select is_community into pack_is_community from story_packs where id = new.pack_id;
  if not coalesce(pack_is_community, false) then
    return new;
  end if;

  select word into hit
  from banned_words
  where new.name ilike '%' || word || '%'
  limit 1;

  if hit is not null then
    raise exception 'Deze naam bevat taal die hier niet is toegestaan.';
  end if;

  return new;
end;
$$;

drop trigger if exists moderate_story_pack_translations on story_pack_translations;
create trigger moderate_story_pack_translations
  before insert or update on story_pack_translations
  for each row execute function enforce_pack_translation_moderation();

create or replace function enforce_pack_theme_moderation()
returns trigger
language plpgsql
security definer
as $$
declare
  hit text;
begin
  if not coalesce(new.is_community, false) then
    return new;
  end if;

  select word into hit
  from banned_words
  where new.theme ilike '%' || word || '%'
  limit 1;

  if hit is not null then
    raise exception 'Dit thema bevat taal die hier niet is toegestaan.';
  end if;

  return new;
end;
$$;

drop trigger if exists moderate_story_pack_theme on story_packs;
create trigger moderate_story_pack_theme
  before insert or update of theme on story_packs
  for each row execute function enforce_pack_theme_moderation();

-- Generous length backstops against direct API calls bypassing the forms'
-- client-side maxLength (PackForm.tsx: name 60/theme 40, RiddleForm.tsx:
-- title 80/hint 120, scenario/solution had no limit at all) — same
-- reasoning as chat_message_reactions.emoji's length check above. Moderation
-- still applies regardless; this is purely a storage/rendering-abuse cap,
-- so the limits stay well above anything a real submission would need.
-- `add constraint` has no `if not exists` in Postgres, so each is wrapped
-- to stay safe to re-run.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'story_packs_theme_length') then
    alter table story_packs add constraint story_packs_theme_length check (char_length(theme) <= 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'story_pack_translations_name_length') then
    alter table story_pack_translations add constraint story_pack_translations_name_length check (char_length(name) <= 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'puzzle_translations_title_length') then
    alter table puzzle_translations add constraint puzzle_translations_title_length check (char_length(title) <= 300);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'puzzle_translations_scenario_length') then
    alter table puzzle_translations add constraint puzzle_translations_scenario_length check (char_length(scenario) <= 5000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'puzzle_translations_solution_length') then
    alter table puzzle_translations add constraint puzzle_translations_solution_length check (char_length(solution) <= 5000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'puzzle_translations_hint_length') then
    alter table puzzle_translations add constraint puzzle_translations_hint_length check (char_length(hint) <= 500);
  end if;
end $$;

-- Same reasoning as the block above, applied to the gameplay tables: only
-- client-side maxLength today (JoinRoomForm.tsx/SetNameForm.tsx name 24,
-- ChatForm.tsx text 300, QuestionForm.tsx text 140, QuestionCard.tsx
-- customResponse 200, GuessForm.tsx text 280, NarratorHintForm.tsx text
-- 300) — a direct API call bypasses all of those. player_name is
-- denormalized onto questions/guesses/hints/chat_messages from players.name
-- at write time, so it gets the same cap as players.name itself.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'players_name_length') then
    alter table players add constraint players_name_length check (char_length(name) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chat_messages_text_length') then
    alter table chat_messages add constraint chat_messages_text_length check (char_length(text) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chat_messages_player_name_length') then
    alter table chat_messages add constraint chat_messages_player_name_length check (char_length(player_name) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'questions_text_length') then
    alter table questions add constraint questions_text_length check (char_length(text) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'questions_player_name_length') then
    alter table questions add constraint questions_player_name_length check (char_length(player_name) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'questions_custom_response_length') then
    alter table questions add constraint questions_custom_response_length check (char_length(custom_response) <= 500);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'guesses_text_length') then
    alter table guesses add constraint guesses_text_length check (char_length(text) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'guesses_player_name_length') then
    alter table guesses add constraint guesses_player_name_length check (char_length(player_name) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hints_text_length') then
    alter table hints add constraint hints_text_length check (char_length(text) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hints_player_name_length') then
    alter table hints add constraint hints_player_name_length check (char_length(player_name) <= 100);
  end if;
end $$;

alter table profiles enable row level security;
alter table puzzle_votes enable row level security;
alter table pack_favorites enable row level security;
alter table player_stats enable row level security;

drop policy if exists "public read profiles" on profiles;
create policy "public read profiles" on profiles for select using (true);
drop policy if exists "write own profile" on profiles;
create policy "write own profile" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- Private to the owner (no leaderboard) — no insert/update/delete policy at
-- all, since every write goes through the security-definer hooks in this
-- file, never directly from a client.
drop policy if exists "read own player_stats" on player_stats;
create policy "read own player_stats" on player_stats for select using (user_id = auth.uid());

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

-- Mirrors "creators write own community packs" for the translation rows.
drop policy if exists "creators write own community pack translations" on story_pack_translations;
create policy "creators write own community pack translations" on story_pack_translations for all
  using (
    exists (
      select 1 from story_packs sp
      where sp.id = pack_id and sp.created_by = auth.uid() and sp.is_community
    )
  )
  with check (
    exists (
      select 1 from story_packs sp
      where sp.id = pack_id and sp.created_by = auth.uid() and sp.is_community
    )
  );

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

-- Mirrors "creators write own community puzzles" for the translation rows:
-- a creator may write translations for their own community puzzle. Admins
-- still cover official/curated content via "admins write puzzle
-- translations" above.
drop policy if exists "creators write own community puzzle translations" on puzzle_translations;
create policy "creators write own community puzzle translations" on puzzle_translations for all
  using (
    exists (
      select 1 from puzzles p
      where p.id = puzzle_id and p.created_by = auth.uid() and p.is_community
    )
  )
  with check (
    exists (
      select 1 from puzzles p
      where p.id = puzzle_id and p.created_by = auth.uid() and p.is_community
    )
  );
