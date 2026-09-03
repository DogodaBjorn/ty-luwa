# Ty LuWa

Website voor het vakantiehuis op Le Conguel, Quiberon (Bretagne). Drie domeinen, vier talen,
één codebase.

| Domein | Taal | Voorbeeld |
|---|---|---|
| `ty-luwa.nl` | Nederlands | `ty-luwa.nl/verblijf` |
| `ty-luwa.com` | Engels | `ty-luwa.com/the-house` |
| `ty-luwa.fr` | Frans | `ty-luwa.fr/le-logement` |
| `ty-luwa.com/de/` | Duits | `ty-luwa.com/de/unterkunft` |

Statische HTML, gegenereerd door een buildscript en geserveerd door een kleine
Express-server op Azure App Service. Geen framework.

## Draaien

```bash
npm install
npm start          # bouwt en start op http://localhost:8080
npm run build      # alleen bouwen
```

Lokaal draait alles op `localhost`, waar geen domein de taal aangeeft. Ga direct naar
`/nl/`, `/en/`, `/de/` of `/fr/`, of test met een echte host-header:

```bash
curl -H "Host: ty-luwa.fr" localhost:8080/le-logement
```

## Structuur

```
content/site-content.json   alle teksten, vier talen        ← bewerk hier
content/routes.json         domeinen, talen, slug per taal  ← bewerk hier
assets/                     site.css, site.js, foto's, logo's
photo-masters/              onbewerkte foto's, niet meegebouwd
scripts/build-site.js       genereert public/
Server.js                   host → taal, redirects, sitemap
public/                     GEGENEREERD, gitignored — nooit met de hand bewerken
docs/AZURE-SETUP.md         Azure, DNS bij Strato, TLS, deployment, boekingsadmin
docs/MEERTALIGHEID.md       hoe de drie domeinen en vier talen in elkaar zitten
```

Een tekst wijzigen is `content/site-content.json`. Een URL wijzigen is
`content/routes.json`. Beide zijn de enige plek waar hun soort informatie staat: de
build, de taalwisselaar, de `hreflang`-verwijzingen, de sitemaps en de server lezen daar
allemaal uit.

## Wat de build doet

`npm run build` genereert 28 pagina's (4 talen × 7 pagina's), drie sitemaps en drie
`robots.txt`. Elke pagina krijgt automatisch:

- een self-canonical
- `hreflang` naar alle vier de taalversies plus `x-default`
- Open Graph en Twitter-tags
- JSON-LD (`LodgingBusiness`, op de FAQ-pagina ook `FAQPage`)
- een eigen meta description, afgeleid van de introtekst van die pagina

Omdat het echte HTML is, ziet een crawler dat zonder JavaScript uit te voeren. Dat is de
reden dat de drie domeinen zin hebben.

`site.css` en `site.js` krijgen een inhoudshash in hun bestandsnaam, zodat ze een jaar
gecached mogen worden en een deploy toch meteen doorkomt.

## Herkomst van de content

De site draaide eerder als React/Vite-app onder `dogoda.nl/ty-luwa`. Die broncode bestaat
niet meer: hij stond gitignored in een remote container die is opgeruimd, en alleen de
gebouwde output is ooit gecommit.

`content/site-content.json` is teruggehaald uit die geminificeerde bundle met
`content/extract-from-bundle.js` — alle teksten in vier talen kwamen er compleet uit. De
CSS en de foto's waren al gecommit. Daarmee is de site herbouwd als statische HTML, wat
beter past bij wat hij moet doen dan een client-side app.

Het bestand `extract-from-bundle.js` is bewaard als bewijsstuk. De bundle waar het naar
verwijst is bij de herbouw verwijderd; hij staat nog in de git-historie
(commit `99c3480`, `public/assets/index-BShhf7FK.js`).

## Nog te doen

### Foto's

Het zijn echte foto's van de stacaravan, met de persoonlijke rommel eruit geretoucheerd.
Alleen heeft die retouche ze ook verkleind: de meeste staan nu op ~1184×864 terwijl het
origineel 1536×1152 was, en de keuken is fors bijgesneden. Voor de hero, die schermbreed
staat, is dat aan de krappe kant op een groot scherm.

De originelen staan in `photo-masters/` (niet meegebouwd) zodat het opruimen op volle
resolutie overgedaan kan worden. Zie de README daar voor de maten per bestand.

`shower.jpg` en `separate-toilet.jpg` worden nergens getoond: ze hebben geen alt-tekst en
categorie in de content, dus ze stonden ook in de oude site al buiten de galerij.

De bestandsnamen zijn de sleutel in `scripts/build-site.js` (`PHOTOS`), dus bij vervanging
gelijk houden of die tabel aanpassen.

### Het aanvraagformulier verstuurt nog niets

`assets/site.js` vangt de submit af en toont de melding die in de content staat. Echt
versturen wacht op de boekingsadmin.

### Boekingsadmin

Eén gedeelde planningsdatabase, één Nederlandstalige beheertool voor Luuk en Wanda.
Zie `docs/AZURE-SETUP.md` §7 en `docs/MEERTALIGHEID.md` §5.

## Opruimen in de DoGoDa-repo

`dogoda.nl/ty-luwa` draait nog steeds de oude versie. Zodra de domeinen live zijn kan daar
weg:

- de map `ty-luwa-app/`
- het `/ty-luwa`-blok in `Server.js`
- de regel `/Ty-LuWa/` in `.gitignore`

Zet er een 301 van `/ty-luwa/*` naar `https://ty-luwa.com/` voor in de plaats. Dit is nog
niet gedaan.
