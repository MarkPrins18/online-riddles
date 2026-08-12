# Supabase-instellingen voor het optionele account-systeem

Deze stappen horen bij de "Account koppelen"-feature (`components/account/`,
`lib/supabase/accountAuth.ts`, `app/auth/confirm/route.ts`). Ze gebeuren
allemaal in het **Supabase dashboard**, niet in deze codebase, en zijn dus
niet via een commit af te vinken.

## Wat werkt al zonder deze stappen

- Anoniem spelen, browsen en community-content insturen: ongewijzigd.
- **Inloggen/account maken met een code per e-mail** ("Code per e-mail"-tab
  in de account-modal): werkt direct, heeft niets hieronder nodig.

## Wat nog niet werkt zonder deze stappen

- **Account maken met e-mail + wachtwoord** ("Wachtwoord"-tab): Supabase
  stuurt na het aanmaken een bevestigingsmail. Zolang stap 1 en 2 hieronder
  niet zijn gedaan, kun je die mail-template niet bewerken (gratis laag) en
  wijst de link in de mail niet naar de juiste plek in de app.

## Stap 1 — Custom SMTP instellen (verplicht op de gratis laag)

Sinds kort mag je op Supabase's gratis laag de e-mailsjablonen niet meer
bewerken zolang je de standaard-mailer gebruikt (banner: *"Set up custom
SMTP to edit templates"*). Dit moet dus eerst:

1. Maak een gratis account bij een SMTP-provider, bijv.
   [Resend](https://resend.com) (3000 mails/maand gratis).
2. Haal daar je SMTP-gegevens op (host, poort, gebruikersnaam, wachtwoord/API-key).
3. Ga in het Supabase dashboard naar **Authentication → Emails → Settings**
   (of de "Set up SMTP"-knop bovenaan de Email Templates-pagina) en vul die
   gegevens in.

Dit lost meteen ook de standaard-limiet van **2 auth-e-mails per uur** op
(die geldt voor signup, wachtwoord-reset én de code-per-e-mail-flow samen).

## Stap 2 — Bevestigingslink aanpassen

1. Ga naar **Authentication → Emails → Confirm sign up**.
2. Klik op **"Source"** (naast "Preview", rechtsboven het Body-vak) om de
   ruwe HTML te bewerken.
3. Zoek de link achter "Confirm email address" — die gebruikt
   `{{ .ConfirmationURL }}`. Vervang die door:

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/community/mijn
   ```

4. Klik **Save changes**.
5. Controleer ook de **"Change Email Address"**-template — het is niet met
   zekerheid te zeggen zonder live te testen of Supabase die gebruikt in
   plaats van (of naast) "Confirm sign up" wanneer iemand voor het eerst een
   e-mailadres aan een anonieme sessie koppelt. Pas zo nodig dezelfde link
   daar ook aan.

## Stap 3 — URL Configuration checken

Ga naar **Authentication → URL Configuration** en zorg dat:

- **Site URL** je echte productie-domein is.
- **Redirect URLs** dat domein bevat (en eventueel `http://localhost:3000`
  voor lokaal testen).

Zonder dit accepteert Supabase de `emailRedirectTo` die de app meegeeft
niet, en valt de link terug op een verkeerde URL.

## Testen

1. Open de app, ga naar de community-tab, open "Account" → tab
   "Wachtwoord" → vul een e-mailadres + wachtwoord in → "Account maken".
2. Check de inbox van dat e-mailadres, klik op de bevestigingslink.
3. Je zou terug moeten komen op `/community/mijn`, en de "Account"-knop in
   de nav zou nu je e-mailadres moeten tonen in plaats van "Account".
4. Ververs de pagina als dat niet meteen zichtbaar is — er is geen live
   auth-listener, dus de tab waarin je het formulier invulde merkt de
   bevestiging pas na een herlaad/nieuwe statuscheck.
