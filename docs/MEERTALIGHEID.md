# Drie domeinen, vier talen, één codebase

De doelopzet zoals Björn hem heeft vastgesteld, wat daarvoor moet veranderen, en waarom het
grootste deel daarvan niet in deze repo op te lossen is.

---

## 1. Doel

Elk domein is een eigen website in een eigen taal, met de taal op de **root** — geen
`/en/`-achtige prefix in de URL. De paden zelf zijn ook vertaald, zodat een Franse bezoeker
een Franse URL ziet.

| | Domein | Taal | Home | Voorbeeldpagina |
|---|---|---|---|---|
| | `ty-luwa.nl` | Nederlands | `ty-luwa.nl/` | `ty-luwa.nl/verblijf` |
| | `ty-luwa.com` | Engels | `ty-luwa.com/` | `ty-luwa.com/accommodation` |
| | `ty-luwa.fr` | Frans | `ty-luwa.fr/` | `ty-luwa.fr/le-logement` |
| | `ty-luwa.com/de/` | Duits | `ty-luwa.com/de/` | `ty-luwa.com/de/unterkunft` |

Duits is de enige taal met een prefix, omdat er geen `ty-luwa.de` is. Koop je die later,
dan verhuist Duits naar de root van dat domein en vervalt de uitzondering.

De taalwisselaar op een pagina brengt je naar **dezelfde pagina, op het domein van die taal,
met de slug in die taal**. Vanaf `ty-luwa.fr/le-logement` op NL klikken levert
`https://ty-luwa.nl/verblijf`, niet de homepage en niet een Franse slug op een Nederlands
domein.

## 2. Voorgestelde slugs

De labels komen uit de bestaande vertalingen in de app; de slugs zijn daarvan afgeleid.
**Dit is een voorstel — Björn stelt vast voordat het gebouwd wordt.** Eenmaal live is een
slug wijzigen een redirect waard, dus liever nu goed.

| Pagina | NL (`.nl`) | EN (`.com`) | FR (`.fr`) | DE (`.com/de`) |
|---|---|---|---|---|
| Home | `/` | `/` | `/` | `/de/` |
| Het verblijf | `/verblijf` | `/accommodation` | `/le-logement` | `/de/unterkunft` |
| Le Conguel | `/le-conguel` | `/le-conguel` | `/le-conguel` | `/de/le-conguel` |
| Quiberon | `/quiberon` | `/quiberon` | `/quiberon` | `/de/quiberon` |
| Beschikbaarheid | `/beschikbaarheid` | `/availability` | `/disponibilites` | `/de/verfuegbarkeit` |
| FAQ | `/faq` | `/faq` | `/faq` | `/de/faq` |
| Contact | `/contact` | `/contact` | `/contact` | `/de/kontakt` |

Twee keuzes die bewust zo staan:

- **`le-conguel` en `quiberon` blijven in elke taal gelijk.** Het zijn plaatsnamen en precies
  de woorden waarop mensen zoeken; vertalen zou de vindbaarheid schaden.
- **Geen accenten of umlauts in slugs** (`disponibilites`, `verfuegbarkeit`). Ze werken wel,
  maar worden in links en analytics als percent-encoding weergegeven en dat leest slecht.

## 3. Waarom dit niet in deze repo op te lossen is

De site is een client-side SPA. React Router leest de URL die **in de adresbalk van de
browser** staat. De server kan intern een pad herschrijven, maar dat verandert niets aan wat
de router in de browser ziet — de server stuurt bij elk pad hetzelfde `index.html` met
dezelfde bundle. De taal en de routetabel worden dus volledig in de app-code bepaald.

Wat er in de huidige bundle staat (bevestigd door inspectie van `public/assets/`):

- Talen: `["nl", "en", "de", "fr"]`, met vier vertaalwoordenboeken.
- Een padbouwer met de vorm `(taal, pad) => taal === "nl" ? pad : "/" + taal + pad`.
  Nederlands zonder prefix, de rest met.
- De layout leest de taal uit de **`:lang`-URL-parameter**, valt terug op `nl`, en stript de
  prefix om het "kale" pad over te houden.
- **De routes gebruiken in alle vier de talen de Nederlandse slugs.** `/verblijf`,
  `/beschikbaarheid` en de rest zijn hardcoded routepaden; vertaald wordt alleen het label.
  Op de Franse site heet de pagina "Le logement" maar de URL is `/verblijf`.
- `document.title` wordt opgezocht met het kale Nederlandse pad als sleutel.

Om bij de doelopzet te komen moet dus in de **Vite-broncode**:

1. De taal komen uit `location.hostname` in plaats van uit een URL-prefix — met `/de/` op
   `.com` als enige uitzondering die nog wél uit het pad komt.
2. Er een **slugtabel per taal** komen, en de router die tabel gebruiken in plaats van één
   vaste set Nederlandse paden. Sleutel op een taalonafhankelijke pagina-id (`home`,
   `accommodation`, `availability`, ...), niet op het Nederlandse pad.
3. `document.title` en alles wat nu op het Nederlandse pad indexeert, om naar die pagina-id.
4. De taalwisselaar **absolute cross-domain URL's** bouwen: pagina-id + doeltaal → domein +
   slug. Nu bouwt hij een relatief pad binnen hetzelfde domein.
5. Lokaal ontwikkelen moet blijven werken op `localhost`, waar geen domein de taal aangeeft.
   Een override via query (`?lang=fr`) of een env-variabele is daar genoeg.

**Die broncode staat niet in deze repo.** Hij staat gitignored op de Windows-machine, in de
map `Ty-LuWa/` naast de DoGoDa-repo. Wat hier is meegecommit is alleen de gebouwde output.
Zolang dat zo is kan deze wijziging niet gemaakt worden — het patchen van een geminificeerde
bundle is geen begaanbare weg voor een permanente architectuur.

Zie de README, "De broncode hierheen halen", voor de overzetstappen.

## 4. Wat de server dan nog doet

Zodra de app de taal zelf uit het domein haalt, vervalt de taal-redirect in `Server.js`
(`DOMAIN_DEFAULT_LANG_PREFIX`). Wat blijft, en wat erbij komt:

- **`www` strippen** naar het kale domein. Blijft.
- **Oude prefix-URL's opvangen.** `ty-luwa.com/en/verblijf` moet 301'en naar
  `ty-luwa.com/accommodation`. Dit is nu de live vorm, dus die links bestaan al.
- **`canonical` en `hreflang` injecteren.** Per pagina een self-canonical plus een
  `hreflang`-set die naar de drie andere taalversies wijst, inclusief `x-default`. Dit hoort
  server-side omdat crawlers dan geen JavaScript hoeven uit te voeren. Dit is precies waar de
  drie-domeinen-opzet zijn waarde haalt: zonder `hreflang` ziet Google drie losse sites.
- **`sitemap.xml` en `robots.txt`** per domein, met alleen de URL's van dat domein.

Die drie zijn pas te bouwen als de slugtabel vaststaat, want ze verwijzen er allemaal naar.

## 5. Gevolg voor de boekingsadmin

Björns opzet: drie publieke sites, **één gedeelde planningsdatabase**, en **één beheertool,
in het Nederlands**, voor zijn ouders.

- De beschikbaarheid die `ty-luwa.fr` toont komt uit dezelfde tabel als die op `ty-luwa.nl`.
  Er is één waarheid over welke datums vrij zijn; alleen de presentatie verschilt per taal.
- Het beheer hoort op **één domein en wordt niet vertaald**. Logische plek:
  `ty-luwa.nl/beheer`, achter App Service Easy Auth. Nederlands, want dat is de taal van de
  beheerders.
- Aanvragen die op `.fr` of `.com` binnenkomen landen in diezelfde inbox. Sla bij elke
  aanvraag op **in welke taal hij binnenkwam**, zodat het antwoord in de juiste taal kan.
- De beheertool valt buiten de `hreflang`-set en hoort in `robots.txt` uitgesloten te worden.

De keuze van database en authenticatie staat in `AZURE-SETUP.md` §7 en verandert hier niet
door.

## 6. Volgorde

1. Slugs uit §2 vaststellen.
2. Broncode naar deze repo (README).
3. Bronwijziging §3, met de build die naar `public/` schrijft.
4. Server-side `hreflang`, canonical, sitemap en de oude-URL-redirects (§4).
5. Pas daarna de boekingsadmin (§5).
