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

## 2. De slugs

Vastgelegd in `content/routes.json`; dat is de enige plek waar een URL staat. Een slug
wijzigen is één regel daar, maar wel eentje die een bestaande URL verandert — voeg dan een
oude-naar-nieuwe regel toe in `Server.js`.

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

## 3. Hoe het werkt

De site is statische HTML, geen client-side app. `scripts/build-site.js` genereert per taal
een map met echte pagina's, en `Server.js` kiest die map op basis van de host:

```
ty-luwa.nl/verblijf        ->  public/nl/verblijf.html
ty-luwa.com/accommodation  ->  public/en/accommodation.html
ty-luwa.com/de/unterkunft  ->  public/de/unterkunft.html
ty-luwa.fr/le-logement     ->  public/fr/le-logement.html
```

Duits is de enige taal met een prefix, en de server sorteert de prefixen van lang naar kort
zodat de lege prefix van Engels `/de/` niet wegkaapt.

De taalwisselaar staat als gewone absolute links in de HTML: vanaf `ty-luwa.fr/le-logement`
wijst NL naar `https://ty-luwa.nl/verblijf`. Geen JavaScript nodig.

**Waarom dit niet de vorige opzet is.** De site was een React-SPA waarin de router de URL
uit de adresbalk las, de taal uit een `:lang`-segment haalde, en in alle vier de talen de
Nederlandse slugs gebruikte — alleen de labels waren vertaald. De taal op de root zetten was
daar onmogelijk zonder de broncode, en die bestaat niet meer (zie de README). Bij het
herbouwen was statische HTML de betere keuze: `canonical` en `hreflang` staan nu gewoon in
het bestand, en dat is precies waar drie domeinen hun waarde uit halen.

## 4. Wat de server doet

Alles hieronder werkt en is getest met echte host-headers.

- **`www` strippen** naar het kale domein, via een allowlist van de drie eigen domeinen.
  Azure's health probes, `azurewebsites.net` en lokale requests worden nooit omgeleid;
  dat kan de instance ongezond maken.
- **Host naar taalmap**, met de prefix-uitzondering voor Duits.
- **Oude URL's opvangen.** De vorige opzet had de taal in het pad en overal de Nederlandse
  slug. `ty-luwa.com/en/verblijf` en `ty-luwa.com/verblijf` 301'en allebei naar
  `ty-luwa.com/accommodation`. De tabel staat in `routes.json` onder `legacyPaths`.
- **`sitemap.xml` en `robots.txt` per domein.** `ty-luwa.com` draagt de Engelse en de
  Duitse URL's omdat die het domein delen; de andere twee alleen hun eigen taal. Elke
  `<url>` draagt zijn `hreflang`-alternatieven mee.
- **Cache-headers.** Assets dragen een inhoudshash en mogen een jaar gecached worden;
  HTML nooit, zodat een deploy meteen doorkomt.

`canonical`, `hreflang`, Open Graph en JSON-LD worden niet door de server geïnjecteerd maar
door de build in de HTML gezet — hetzelfde resultaat, één bewegend deel minder.

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

## 6. Wat er nog moet

1. Definitieve foto's in plaats van `assets/photos/provisional/`.
2. Het aanvraagformulier echt laten versturen — wacht op de boekingsadmin (§5).
3. De boekingsadmin zelf.
