# CLAUDE.md — Ty LuWa

De site van Ty LuWa: het particuliere vakantieverblijf (mobil-home) van Luuk & Wanda
op Camping Le Conguel, Quiberon (Bretagne). Drie domeinen, vier talen, één codebase:
statische HTML uit `scripts/build-site.js`, geserveerd door `Server.js` op Azure App
Service; deploy op push naar `main` via `.github/workflows/main_ty-luwa.yml`.

## Werken aan de site

- Alle teksten en vier talen: `content/site-content.json` (← bewerk hier).
- Domeinen, talen en vertaalde slugs: `content/routes.json`.
- `npm start` bouwt en serveert lokaal; `npm run build` alleen bouwen. Talenopzet en
  host-naar-taal: `docs/MEERTALIGHEID.md`.
- `photo-masters/` is onbewerkt bronmateriaal en wordt nooit meegebouwd;
  `scripts/retouch-photos.py` maakt `assets/photos/` reproduceerbaar.
- Merk-assets: `assets/brand/` (afgeleiden via `scripts/brand-assets.js`).
- Planning en aanvragen: SQLite in `DATA_DIR` via `lib/store.js`; beheer op
  `ty-luwa.nl/beheer` (`routes/beheer.js`, Nederlands, voor Luuk en Wanda); publieke
  kalender vrij/bezet die `Server.js` bij elk verzoek in de beschikbaarheidspagina zet.
  Instellingen en Azure-inrichting: `docs/AZURE-SETUP.md` §4 en §7. `npm test` moet groen.
- Seizoen (november t/m februari dicht) in `lib/season.js`; feestdagen en schoolvakanties
  per land in `lib/holidays.js` (open bronnen, dagelijks opgehaald). Uitleg voor de
  beheerders: `docs/uitleg/` op `/beheer/uitleg`, plaatjes via `scripts/screenshots.js`
  (telefoon én laptop).
- Het beheer als app op het beginscherm: `/beheer/app`, manifest en service worker op
  eigen routes in `routes/beheer.js` (vóór de inlogmuur, scope `/beheer` zonder slash).
  De worker in `assets/beheer/app-sw.js` onderschept met opzet niets en mag nooit gaan
  cachen; daar staat ook hoe je hem intrekt. Iconen komen uit `scripts/brand-assets.js`.
- Mails: blokken als gegevens in `lib/mail-doc.js`, opmaak in `mail-html.js`, tekst in
  `mail-text.js`; inhoud in `lib/mail-texts.js`. Nooit alleen de HTML aanpassen — de
  tekstversie hoort dezelfde feiten te dragen, en de test controleert dat. De
  bijzonderheden bij een aanvraag komen uit `lib/highlights.js` en voeden zowel de mail
  als het beheerscherm. Bekijken: `node scripts/mail-preview.js`.

## Harde merkwetten (nooit van afwijken)

- **Feitenblad verblijf — niets bij verzinnen:** 4 personen in de twee slaapkamers,
  plus hooguit 2 kinderen op de slaapbank (dus nooit meer dan 4 volwassenen en nooit
  meer dan 6 gasten in totaal); hoofdslaapkamer 1 tweepersoonsbed + inloopkast;
  tweede slaapkamer 2 eenpersoonsbedden; slaapbank voor 2 kinderen in de
  woonkamer; keuken met gasfornuis, gasoven, magnetron,
  koelkast/vriesvak, vaatwasser; badkamer met douche; wasmachine in een apart hok; apart toilet;
  ruime overdekte veranda; privé-tuintje met ligbedden; 1 parkeerplek.
- **Beschikbaar op aanvraag.** Succes is een aanvraag plus persoonlijk contact. Geen
  automatische boeking of betaling suggereren; het beheer bevestigt nooit automatisch aan
  een gast, alleen de ontvangst van de aanvraag.
- **Geen fake reviews, fake schaarste, countdowns of "x mensen kijken nu".** Er zijn
  geen testimonials; die worden niet verzonnen.
- **Attributie:** Ty LuWa beheert de camping niet en de sterren zijn van de camping:
  altijd formuleren als "gelegen op 4★ Camping Le Conguel", nooit als classificatie
  van Ty LuWa zelf. De fineprint-regel in site-content.json is wet.
- **Geen privé-e-mailadressen, telefoonnummers of API-keys** publiceren of in
  frontend-variabelen zetten.
- **Per taal de woorden van de gast:** vertalingen zijn redactiewerk per taal, nooit
  automatisch doorgezet zonder review.
- Voice: warm, eerlijk, persoonlijk; gastvrijheid boven verkoop. Vastgelegde
  UX-referenties: de rust van Airbnb, de helderheid van Booking zónder de dark
  patterns, het vakantiegevoel van goede hotelsites.

## AI-vindbaarheid (GEO)

De site wordt ook gelezen door AI-systemen die antwoorden geven in plaats van links
(ChatGPT, Perplexity, Claude, Google AI). Wat daarvoor in de build zit en wat er nog
te doen is staat in `docs/GEO.md`. De technische laag:

- `robots.txt` per domein laat de AI-agents expliciet toe (`AI_AGENTS` in
  `scripts/build-site.js`); `/beheer` en `/api` blijven dicht.
- `llms.txt` per domein, gegenereerd uit `site-content.json` (feiten, pagina's met
  beschrijving, FAQ), met een sectie per taal die op dat domein woont. Geen eigen copy
  in de build: verandert de content, dan verandert het bestand mee.
- JSON-LD: één entiteit `@id https://ty-luwa.com/#ty-luwa` op alle pagina's en talen,
  met kamers, voorzieningen en de camping; de FAQ-pagina draagt `FAQPage`.

Schrijfregels voor content die een taalmodel goed moet kunnen overnemen (gelden naast
de merkwetten, nooit erboven):

- **Eén punt per alinea, antwoord vooraan.** Een alinea moet los van de pagina nog
  kloppen en volledig zijn.
- **Entiteiten altijd voluit en hetzelfde:** Ty LuWa, Camping Le Conguel, Quiberon,
  Bretagne, Luuk en Wanda. Geen "de camping" of "het huisje" in een alinea die op
  zichzelf moet staan.
- **Vervolgvragen op de pagina zelf beantwoorden:** voor wie, hoeveel personen, wanneer
  open, hoe aanvragen, wat het verschil is met boeken via Siblu. Nieuwe antwoorden
  horen in `faq.items`, zodat ze ook in `FAQPage` en `llms.txt` komen.
- **Koppen als vragen** waar dat natuurlijk is ("Wanneer is Ty LuWa vrij?" staat er al).
- **Regio, seizoen en doelgroep expliciet:** Quiberon, Bretagne, maart tot en met
  oktober, gezinnen en twee stellen.
- Nieuwe feiten alleen uit het feitenblad of van Luuk en Wanda; alle vier de talen
  blijven redactiewerk per taal.

## Grounding & brand authority

Laad voor pagina-, copy- of ontwerpwerk de **craft-grounding**-skill
(`.claude/skills/craft-grounding/`): de canon met CP-citaties, de kritieklijst en
`references/inspiration-sources.md` (voor deze site voorop: Refero en Nicely Done
voor de aanvraagflow, Screensdesign voor mobiel, Httpster voor de warme toon).

Grounding is een stapel, geen wedstrijd: het **merk is de basis** (de merkwetten
hierboven, `content/site-content.json` als inhoudsbron in vier talen,
`content/routes.json`, `docs/MEERTALIGHEID.md`, `assets/brand/`); de **canon is de
generieke middenlaag** (merk-agnostische craftmechanismen, CP-geciteerd); de
**toegepaste laag is waar je op werkt** — de "canon applied"-regels in de skill.
Grijp naar de canon waar de toegepaste regels zwijgen, naar de basis waar de
identiteit zelf de vraag is. Waar een huisregel bewust afwijkt van een canoniek
principe (eerlijkheid boven conversie, aanvraag boven boeking) is dat vastgelegde
doctrine, geen conflict.

## Bezoekerslogging

`lib/track.js` (identiek aan de kopie in trainerbjorn en dogoda; alle drie of geen) logt elk
verzoek server-side: geen cookie, geen script, geen IP, een sessiehash die per dag roteert. Met
`TRACK_COLLECT_KEY` gaan de events als batch naar de verzamelaar op dogoda (`/api/collect`), anders
naar dagbestanden in `DATA_DIR/track`. Benoemd event: `request_sent` in `routes/api.js`. De
centrale opzet, instellingen en Bjorns stappen: `docs/web-analytics.md` in de dogoda-repo. Let op:
de site heeft nog geen privacyverklaring; die staat op Bjorns lijst.
