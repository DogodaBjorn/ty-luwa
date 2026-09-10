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
  koelkast/vriesvak, vaatwasser; badkamer met douche en wasmachine; apart toilet;
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
