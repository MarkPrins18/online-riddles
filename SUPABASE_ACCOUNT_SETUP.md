# Supabase-instellingen voor het optionele account-systeem

Deze stappen horen bij de "Account koppelen"-feature (`components/account/`,
`lib/supabase/accountAuth.ts`). Ze gebeuren allemaal in het **Supabase
dashboard**, niet in deze codebase, en zijn dus niet via een commit af te
vinken.

Het account-systeem heeft één inlogmethode: een 6-cijferige code per e-mail
("Code per e-mail" in de account-modal, `MagicLinkTab.tsx`). Er is bewust
géén wachtwoord-optie meer (verwijderd tijdens de production-readiness
pass — zie CLAUDE.md item 9) — die vereiste een aparte "mode" (account
maken vs. inloggen op nieuw device) en een klik-door-bevestigingsmail, wat
zowel voor spelers als voor het e-mailsjabloon-beheer verwarrend bleek.
Eén flow, geen keuzes: Supabase beslist zelf bij het invullen van de code
of dit een nieuw account is of een bestaand account waarop wordt ingelogd.

## Wat werkt al zonder onderstaande stap

Anoniem spelen, browsen en community-content insturen, én inloggen/account
maken met een code per e-mail — dat laatste werkt direct met Supabase's
eigen standaardmailer, zonder verdere configuratie.

## Stap 1 — Custom SMTP instellen (aanbevolen voor productie)

Supabase's gratis laag limiteert auth-e-mails (waaronder deze
inlog-codes) tot **2 per uur** zolang je de standaard-mailer gebruikt —
te weinig zodra er meerdere spelers tegelijk inloggen. Los dat op met een
eigen SMTP-provider:

1. Maak een gratis account bij een SMTP-provider, bijv.
   [Resend](https://resend.com) (3000 mails/maand gratis).
2. Verifieer daar je eigen domein (Domains-tab → DNS-records toevoegen bij
   je registrar) zodat je vanaf een adres op dat domein kunt versturen
   (bijv. `noreply@jouwdomein.nl`) — nodig voor betrouwbare bezorging bij
   willekeurige spelers.
3. Haal je SMTP-gegevens op: host `smtp.resend.com`, poort `465`,
   gebruikersnaam `resend`, wachtwoord = je Resend API-key.
4. Ga in het Supabase dashboard naar **Authentication → Emails → Settings**
   (of de "Set up SMTP"-knop bovenaan de Email Templates-pagina), zet
   **Enable Custom SMTP** aan en vul die gegevens in.

Dit ontgrendelt ook het bewerken van de e-mailsjablonen op de gratis laag
(banner: *"Set up custom SMTP to edit templates"*).

## Stap 2 — Het "Magic Link"-sjabloon aanpassen (optioneel, styling)

Dit is het enige sjabloon dat deze feature daadwerkelijk gebruikt (via
`signInWithOtp`/`verifyOtp` in `lib/supabase/accountAuth.ts`) — "Confirm
sign up" en "Change Email Address" zijn hier niet van toepassing, want er
wordt nergens `auth.signUp()` of `updateUser({email})` aangeroepen.

1. Ga naar **Authentication → Emails → Magic Link**.
2. Klik op **"Source"** om de ruwe HTML te bewerken.
3. Zorg dat de mail de variabele `{{ .Token }}` prominent toont (de
   6-cijferige code die de speler in de app moet invullen) — de
   standaardtekst benadrukt vooral een klikbare link, die deze flow niet
   gebruikt (er wordt geen `emailRedirectTo` meegegeven, dus zo'n link
   zou nergens correct heen gaan).
4. Klik **Save changes**.

Geen URL Configuration-stap nodig: zonder klik-door-link speelt Site
URL/Redirect URLs voor deze feature geen rol.

## Testen

1. Open de app, ga naar de community-tab of `/profile` → "Account" →
   vul een e-mailadres in → "Stuur code".
2. Check de inbox van dat e-mailadres — de mail moet de 6-cijferige code
   duidelijk tonen.
3. Vul de code in de app in → "Bevestigen".
4. De "Account"-knop zou nu je e-mailadres moeten tonen in plaats van
   "Account", zonder pagina-herlaad nodig (de modal ververst zijn eigen
   status direct na een geslaagde verificatie).
