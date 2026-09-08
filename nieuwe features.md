# Nieuwe features — ideeën voor DetectiveNights

Brainstorm op basis van analyse van de codebase. Van klein tot groot.
Bijgewerkt na verificatie tegen de huidige code (september 2026) — de
oorspronkelijke lijst (augustus 2026) bevatte meerdere punten die inmiddels
gebouwd zijn; die zijn hieronder verwijderd of aangepast in plaats van
stilzwijgend gecorrigeerd, zodat duidelijk is wat er is veranderd.

## Al gebouwd sinds de vorige versie van deze lijst

Ter referentie, niet meer als open idee: **favorieten-feature** (★-filter
in `RoomSettingsForm` + `FavoriteButton` in `PackCard`, commit
"Wire favorites, add invite links, fix solo-narrator, cap room size"),
**beste-vraag badge** (ster-icoon live in `QuestionCard`, ook terug in
`SessionRecapPanel`), **emoji-reacties op chat** (`chatReactions.ts`,
`ChatThread`), en **handmatige narrator-hints** (`NarratorHintForm` — de
auto-hint-na-stilte is zelfs volledig verwijderd, niet alleen aangevuld;
zie de comments in `lib/game/reducer.ts`/`lib/supabase/hints.ts`). Ook een
**saboteur-rol** bestaat al (`lib/game/roles.ts`,
`SaboteurBriefingScreen.tsx`, `AccusationPanel.tsx`) — maar anders dan
hieronder ooit voorgesteld: de saboteur ként de oplossing (net als de
verteller) en speelt verder gewoon mee als rader; na de reveal stemmen alle
raders wie ze verdenken de saboteur te zijn geweest. Geen "vals hint geven"-
mechanic.

## Kleine, snelle toevoegingen

- **Geluid/haptics** — korte soundcues bij: hint verschijnt, juiste gok,
  verkeerde gok, timer <10s. Kost weinig, verhoogt spanning enorm in dit
  soort "wie-weet-het-eerst" spellen.

## Middelgrote features

- **Assistent-verteller bij grote groepen** — nu is de verteller altijd één
  persoon; bij een grote groep (8+) zou een tweede meehelpende verteller de
  belasting kunnen spreiden. (Losstaand van de saboteur-rol hierboven, die
  al bestaat.)
- **Async/laagdrempelige daily puzzle** — een los "dagelijkse raadsel" los
  van de multiplayer-kamer-flow, deelbaar via link/social (er is al
  `lib/game/recapImage.ts` voor image-export — hergebruiken voor een
  Wordle-achtige deel-afbeelding).
- **Rapporteerknop voor chat** — bekende gap (CLAUDE.md #8): moderatie is
  een blunte woordfilter zonder rapportagemogelijkheid. Een simpele "meld
  bericht"-knop in `ChatThread` + een moderator-tabel is relatief klein
  werk en dekt een reëel risico bij community content. Nog steeds open.
- **Spectator-interactie** — toeschouwers (`is_spectator`) zitten nu alleen
  te kijken en worden expliciet uitgesloten van de accusation-stemming
  (`AccusationPanel.tsx` filtert ze eruit). Laat ze bijvoorbeeld stemmen op
  wie de beste vraag stelde, of een aparte "publieksgok" doen voor
  bonuspunten voor de groep. Nog steeds open.

## Grotere, ambitieuzere ideeën

- **Losse toernooi/seizoen-modus** — meerdere kamers/rondes gekoppeld aan
  een groep (vriendengroep-ID), met een seizoensscore. Bouwt voort op de
  bestaande `lib/game/ranking.ts`. Let op: dit is iets anders dan de
  bestaande `player_stats` (CLAUDE.md #1) — die zijn per-account en bewust
  privé/geen leaderboard; een seizoensmodus zou per-groep zijn, wat dezelfde
  cheat-prikkel-afweging niet per se raakt maar wel opnieuw doordacht moet
  worden voordat scores zichtbaar worden tussen spelers.
- **AI-gegenereerde puzzels on-demand** — er zijn al `scripts/import-puzzles.ts`
  en `scripts/translate-puzzles.ts`; een volgende stap is puzzels genereren
  op thema-verzoek van spelers ("geef ons een horror-pack over
  ruimtevaart"), met de bestaande anti-drift-themetabel en
  community-review-flow (`status: machine|reviewed`) als kwaliteitsborging.
- **Uitgebreidere narrator-tools als eigen spelmodus** — er is al een
  verrassend rijke verteller-UI (`NarratorTensionPanel`, `NarratorArchive`,
  `CorkboardOverlay` met live cursors). Dat zou zich lenen voor een
  "Verteller vs. Detectives"-asymmetrische modus met eigen scoring, in
  plaats van verteller puur als rotatierol.

**Niet meer aanbevolen: cross-device rol-herclaim via een PIN-code.** Dit
stond hier eerder als idee, maar een vergelijkbaar mechanisme
(`reclaim_player`, kamer-code + naam) is gebouwd én weer bewust verwijderd
tijdens de production-readiness pass (zie CLAUDE.md #9, commit `40d5955`):
kamer-code en spelernaam zijn allebei publiek zichtbaar, dus geen echt
geheim, en de RPC liet iemand anders' rij (score en rol) overnemen zonder
bewijs dat je diezelfde speler bent. Een losse PIN per speler zou dat gat
kunnen dichten (dat ís een echt geheim), maar dan moet die PIN ergens
veilig bewaard/getoond worden aan de juiste speler — niet triviaal in een
sessieloos "iedereen typt een naam in"-model. De structurele oplossing die
er al is: het optionele permanente account (zelfde `auth.uid()` op elk
device). Alleen oppakken met een concreet antwoord op het PIN-opslagprobleem.

## Referentie: relevante codebase-onderdelen

- `lib/game/*.ts` — reducer, rounds, difficulty, scoring, recap, ranking,
  membership, roles, accusation, chatReactions (er is geen `hint.ts` meer —
  narrator-hints zijn nu puur vrije tekst via `lib/supabase/hints.ts`, geen
  aparte spellogica)
- `components/game/` — QuestionCard, GuessForm, NarratorInbox,
  NarratorHintForm, CorkboardOverlay, ChatThread, ScoreBoard,
  SessionRecapPanel, SaboteurBriefingScreen, AccusationPanel, etc.
- `components/lobby/` — RoomSettingsForm, join/create flows
- `lib/i18n/locales.ts` — huidige i18n-scope (en, nl)
- `scripts/import-puzzles.ts`, `scripts/translate-puzzles.ts` — puzzel
  content pipeline
- `supabase/schema.sql` — story_packs, categories, themes (anti-drift
  tabel), puzzle_votes, pack_favorites, profiles, player_stats
