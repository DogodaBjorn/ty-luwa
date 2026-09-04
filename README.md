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
scripts/retouch-photos.py   maakt assets/photos/ uit photo-masters/ (reproduceerbaar)
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

Echte foto's van de stacaravan, op de volle 1536px van het origineel, met de persoonlijke
rommel eruit. De onbewerkte originelen staan in `photo-masters/` (niet meegebouwd), met
per bestand wat er is gedaan.

**Hoe de bewerking is gemaakt, en waarom zo.** De eerste retouche (uit de DoGoDa-repo) was
zware generatieve AI-bewerking: die genereerde in twee foto's de lucht opnieuw, verving in
de woonkamer-keuken de tafel en legde er een vloerkleed bij dat er niet ligt, en haalde in
de inloopkast alle kleren weg voor verzonnen witte handdoeken. Ze had de foto's ook een
kwart verkleind. Klassieke inpainting (OpenCV FSR en SHIFTMAP) is hier geprobeerd en
faalt zichtbaar: smeer, of stukken stoel op het terras geplakt.

Wat wel werkt en eerlijk is: het 1536px-origineel als basis, en **uitsluitend binnen de
contouren van de weggehaalde rommel** de pixels van de eerste retouche, daarop uitgelijnd
(SIFT-homografie), 1,3× opgeschaald en licht verscherpt, met zachte randen ingeblend.
Zo is 95% van elke foto onbewerkt origineel, inclusief de echte lucht. De verzinsels zijn
niet overgenomen: waar de eerste retouche iets had verzonnen, is bijgesneden in plaats van
bewerkt (keuken, woonkamer-keuken, inloopkast) of is het echte beeld gelaten
(schoonmaakflessen in het toilet). Eén uitzondering bewust wel: de opgehangen tuinslang op
de hero, waar in werkelijkheid een bezem en twee harken staan; de slang bestaat, hij ligt
alleen op de grond.

`shower.jpg` en `separate-toilet.jpg` worden nergens getoond: ze hebben geen alt-tekst en
categorie in de content. `veranda-panorama.jpg` ook niet: als strook van 4,7:1 werkte hij
nergens, dus de site toont er twee frames van (`veranda-left.jpg`, de eetkant, en
`veranda-right.jpg`, de tuinkant), uit het bewerkte panorama gesneden. De coordinaten
staan in `DERIVED` in `scripts/retouch-photos.py` en in `photo-masters/README.md`.

De bewerking is reproduceerbaar: `scripts/retouch-photos.py` maakt `assets/photos/provisional/`
uit `photo-masters/` (originelen) en `photo-masters/first-retouch/` (de eerste retouche, als
bron voor de vlakken). Vereist `pip install opencv-contrib-python-headless numpy`. Per foto
staat in `CFG` welke vlakken en welke crop.

De bestandsnamen zijn de sleutel in `scripts/build-site.js` (`PHOTOS`), dus bij vervanging
gelijk houden of die tabel aanpassen. De build leest de afmetingen uit de JPEG-header en
zet ze als `width`/`height` op de afbeelding. De twee veranda-frames staan samen op een
eigen rij in de galerij (`WIDE` in de build, `.gallery-grid figure.wide` in de CSS).

Elke foto in de galerij en in de mozaiek op de homepage is een link naar het bestand.
Met JavaScript opent die link de lightbox (`site.js`): de foto vergroot, met eronder een
titel en een korte tekst, en pijlen, pijltjestoetsen of swipen om door de reeks te
bladeren. Titel en tekst staan per foto en per taal in `content/site-content.json` onder
`stay.gallery.<sleutel>.title` en `.caption`; de knopteksten van de lightbox onder
`layout.lightbox`. Een nieuwe foto heeft dus alt, categorie, titel en tekst nodig in alle
vier de talen, anders breekt de build.

### Het aanvraagformulier verstuurt nog niets

`assets/site.js` vangt de submit af en toont de melding die in de content staat. Echt
versturen wacht op de boekingsadmin.

### Beslisinformatie die de site nog niet geeft

Uit de UI/UX-beoordeling (september 2026): het overtuigingstraject is dun op precies het
beslispunt. Nergens een prijsindicatie, minimumverblijf, wisseldag of afstand tot zee en
strand, en de FAQ heeft drie vragen op een verder lege pagina. Dat is content die alleen
Luuk en Wanda kunnen aanleveren; het hoort in `content/site-content.json` (FAQ-items en
de introtekst van beschikbaarheid) en niet in de layout. Ook de datumvelden tonen de
volgorde van de browser van de bezoeker (`mm/dd/yyyy` in een Engelstalige browser); dat is
browsergedrag en niet vanuit de pagina te sturen.

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
