@AGENTS.md

# Design for scale

Build everything assuming it may eventually run with thousands to hundreds
of thousands of players/rows, not just the handful it has today.

# Known functionality gaps

1. Geen langetermijn-spelersstatistieken — alles reset zodra een kamer verdwijnt (24u cleanup) of de browsersessie wisselt.
2. Favorieten-feature is af (`FavoriteButton.tsx`, `packFavorites.ts`) maar nergens in de UI gerenderd — bewust dormant, dus onbruikbaar voor spelers.
3. ~~Geen testsuite~~ — Vitest is opgezet (`npm test`) met unit tests voor de pure spellogica in `lib/game/*.ts` (scoring, hint, roles, ranking, rounds, difficulty, reducer, membership) en component-tests (React Testing Library + jsdom) voor `Timer`, `GuessForm`, `VoteButtons`. Nog ontbrekend: integratietests tegen Supabase/RLS — kon hier niet gebouwd/geverifieerd worden zonder Docker/Supabase CLI in deze omgeving.
4. Geen monitoring/observability — geen Sentry, geen analytics. Productieproblemen worden alleen zichtbaar via gebruikersmeldingen.
5. Geen admin-UI — puzzelbeheer en community-moderatie gaan via Supabase Studio of een CLI-script met een service-role key.
6. Alleen Nederlands — hardcoded `lang="nl"`, geen i18n-laag.
7. ~~Minimale toegankelijkheid~~ — `eslint-plugin-jsx-a11y` recommended ruleset staat aan (als `warn`, zie `eslint.config.mjs`). `Modal`/`Drawer`/`Dialog` (`components/ui/`) hebben nu `role="dialog"`/`aria-modal` en delen focusbeheer via `lib/a11y/useDialog.ts` (focus in bij openen, focus-trap, focus terug naar trigger bij sluiten). `ChatThread` en `NextRoundCountdown` hebben live-regio's; `ChatForm`/`QuestionForm`/`GuessForm` hebben gelabelde inputs en `role="alert"`-foutmeldingen; `app/layout.tsx` heeft een skip-link naar `#main-content`; `Timer`'s urgentie en `VoteButtons`' actieve stem zijn niet meer kleur-only. Nog ontbrekend: keyboard-bediening van het prikbord (`CorkboardOverlay.tsx`, al gedocumenteerd als desktop/tablet-only) en een bredere audit (kleurcontrastmeting, screenreader-doorloop van de rest van de app).
8. Chat/content-moderatie is een blunt substring-filter — geen rapporteer-knop voor spelers, geen moderator-overzicht van gerapporteerde content.
9. Sessie kwijt = kamer kwijt — anonieme auth betekent dat een andere browser/tab of cache clear de rol/score niet terug te claimen is; alleen opnieuw joinen als nieuwe speler.
10. Schaal nog niet getest — geen load-test, geen index-review voor grote datasets (open vraag, geen vastgesteld probleem).

