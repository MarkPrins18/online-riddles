# Nieuwe features — ideeën voor Dark Riddles

Brainstorm op basis van analyse van de codebase (augustus 2026). Van klein tot groot.

## Kleine, snelle toevoegingen

- **Favorieten-feature afmaken** — `FavoriteButton.tsx` en `packFavorites.ts` bestaan al maar worden nergens getoond. Simpelweg een "★ Favoriete packs" filter toevoegen aan `RoomSettingsForm` is bijna gratis functionaliteit die al af is.
- **Beste-vraag badge zichtbaar maken** — er is al een `BEST_QUESTION_BONUS` in de scoring, maar controleer of spelers ook echt te zien krijgen wélke vraag dat was (bijv. in `CaseLog`/`SessionRecapPanel`). Als dat nu stil verwerkt wordt in het eindscore, is het onbenut leermoment/leuk-moment.
- **Geluid/haptics** — korte soundcues bij: hint verschijnt, juiste gok, verkeerde gok, timer <10s. Kost weinig, verhoogt spanning enorm in dit soort "wie-weet-het-eerst" spellen.
- **Reacties/emoji op chat** — snelle 👍😂😱 reacties op berichten in `ChatThread`, leuk voor sfeer zonder de puzzeloplossing te spoilen.
- **Narrator-hints handmatig triggeren** — nu is er alleen een auto-hint na 3 min stilte (`hint.ts`). Een knop waarmee de verteller zelf eerder een hint kan geven geeft de verteller meer regie/spelplezier.

## Middelgrote features

- **Persistent leaderboard / spelersprofiel** — dit is een expliciete bekende gap (#1 in CLAUDE.md: alles reset bij kamer-cleanup). Zelfs een lichte versie — cumulatieve stats gekoppeld aan `profiles` (via community-auteurschap-systeem dat al bestaat) — zou herspeelwaarde enorm vergroten: win-streak, totaal opgeloste puzzels, favoriete rol.
- **Rolvariatie** — nu zijn er maar 2 rollen (verteller/gokker). Denk aan een "saboteur"-rol (weet de oplossing niet maar mag één keer een vals hint geven) of een "assistent-verteller" bij grote groepen. Past goed bij het hardcore-mode/team-lives-systeem dat er al is.
- **Async/laagdrempelige daily puzzle** — een los "dagelijkse raadsel" los van de multiplayer-kamer-flow, deelbaar via link/social (er is al `recapImage.ts` voor image-export — hergebruiken voor een Wordle-achtige deel-afbeelding).
- **Rapporteerknop voor chat** — bekende gap #8: moderatie is een blunte substring-filter zonder rapportagemogelijkheid. Een simpele "meld bericht"-knop in `ChatThread` + een moderator-tabel is relatief klein werk en dekt een reëel risico bij community content.
- **Spectator-interactie** — toeschouwers zitten nu alleen te kijken. Laat ze bijvoorbeeld stemmen op wie de beste vraag stelde, of een aparte "publieksgok" doen voor bonuspunten voor de groep.

## Grotere, ambitieuzere ideeën

- **Losse toernooi/seizoen-modus** — meerdere kamers/rondes gekoppeld aan een groep (vriendengroep-ID), met een seizoensscore. Bouwt voort op de al bestaande `ranking.ts` en zou de "alles reset"-pijnpunt structureel oplossen zonder een zware accountlaag.
- **AI-gegenereerde puzzels on-demand** — er zijn al `scripts/import-puzzles.ts` en `translate-puzzles.ts`; een volgende stap is puzzels genereren op thema-verzoek van spelers ("geef ons een horror-pack over ruimtevaart"), met de bestaande anti-drift-themetabel en community-review-flow (`status: machine|reviewed`) als kwaliteitsborging.
- **Cross-device rol-herclaim** — bekende gap #9 (sessie kwijt = kamer kwijt). Een lichte "reclaim code" (6-cijferige PIN per speler bij het joinen) zou dit oplossen zonder een volledige account-systeem te bouwen.
- **Uitgebreidere narrator-tools als eigen spelmodus** — er is al een verrassend rijke verteller-UI (`NarratorTensionPanel`, `NarratorArchive`, `CorkboardOverlay` met live cursors). Dat zou zich lenen voor een "Verteller vs. Detectives"-asymmetrische modus met eigen scoring, in plaats van verteller puur als rotatierol.

## Referentie: relevante codebase-onderdelen

- `lib/game/*.ts` — reducer, rounds, difficulty, hint, scoring, ranking, membership, roles
- `components/game/` — QuestionCard, GuessForm, NarratorInbox, CorkboardOverlay, ChatThread, ScoreBoard, SessionRecapPanel, etc.
- `components/lobby/` — RoomSettingsForm, join/create flows
- `lib/i18n/locales.ts` — huidige i18n-scope (en, nl)
- `scripts/import-puzzles.ts`, `scripts/translate-puzzles.ts` — puzzel content pipeline
- `supabase/schema.sql` — story_packs, categories, themes (anti-drift tabel), puzzle_votes, pack_favorites, profiles
