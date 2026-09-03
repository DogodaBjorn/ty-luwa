# Ty LuWa

Website voor het vakantiehuis op Le Conguel, Quiberon (Bretagne). Viertalig: NL, EN, DE, FR.

Een Vite/React single-page app, geserveerd door een kleine Express-server op Azure App
Service. Draaide eerder als submap op `dogoda.nl/ty-luwa`; staat nu op eigen benen.

## Draaien

```bash
npm install
npm start          # http://localhost:8080
```

## Structuur

```
Server.js                  Express: statische bestanden, SPA-fallback, canonical redirect
public/                    de gebouwde site (Vite-output)
  index.html
  assets/                  gehashte js/css + foto's en brandmateriaal
docs/AZURE-SETUP.md        Azure, DNS bij Strato, TLS, deployment, boekingsadmin
.github/workflows/         deploy naar Azure bij push op main
```

Routes komen van React Router: `/`, `/verblijf`, `/le-conguel`, `/quiberon`,
`/beschikbaarheid`, `/faq`, `/contact`, elk ook onder een taalprefix (`/en/verblijf`,
`/de/faq`, `/fr/contact`). De server serveert voor al die paden `public/index.html`.

## Nog te doen

### 1. De broncode hierheen halen

`public/` is nu **gebouwde output die is meegecommit**, overgezet uit `dogoda/ty-luwa-app/`.
De Vite-broncode staat alleen nog op de Windows-machine, in de map `Ty-LuWa/` naast de
DoGoDa-repo, waar hij bewust in `.gitignore` stond.

Overzetten:

1. Kopieer de broncode naar `app/` in deze repo (zonder `node_modules/` en `dist/`).
2. Zet in `app/vite.config.*` de `base` terug van `'/ty-luwa/'` naar `'/'`.
   De site staat nu op de root van een eigen domein, niet meer in een submap.
3. Laat de build naar `public/` schrijven (`build.outDir`), voeg
   `"build": "cd app && npm install && npm run build"` toe aan de scripts hier,
   en zet `/public/` in `.gitignore`.
4. Verwijder daarna de map `public/` uit git — de workflow bouwt hem voortaan zelf.

**Let op de onbewerkte bronfoto's.** Die zaten in `Ty-LuWa/` en hoorden nooit te deployen.
Neem alleen de bewerkte foto's mee die nu in `public/assets/photos/` staan, of houd de
bronmap buiten git.

Tot dat gebeurd is, is een sitewijziging alleen mogelijk door lokaal te bouwen en de
`public/`-map te vervangen. De basispaden in de meegeleverde build zijn al van
`/ty-luwa/` naar `/` herschreven, dus de site werkt zoals hij is.

### 2. Foto's

`public/assets/photos/provisional/` — de naam zegt het. Vervangen door definitieve beelden.

### 3. SEO

De pagina's dragen nu alleen een `<title>` en een meta description, en die zijn voor alle
vier de talen en alle zeven de pagina's hetzelfde, omdat het één SPA-shell is. Wat ontbreekt:

- `<link rel="canonical">` per pagina
- `hreflang`-verwijzingen tussen de vier taalversies — juist hier waardevol, want de talen
  hebben elk hun eigen URL
- Open Graph en Twitter-tags, zodat een gedeelde link een beeld toont
- JSON-LD (`LodgingBusiness` of `VacationRental`)
- `sitemap.xml` en `robots.txt`

Twee manieren om dat op te lossen. Server-side injectie per route in `Server.js`, zoals de
TrainerBjörn-site doet — werkt ook voor crawlers die geen JavaScript uitvoeren, en dat is de
reden om er de voorkeur aan te geven. Of client-side in React, wat eenvoudiger is maar
afhankelijk van rendering door de crawler.

### 4. Boekingsadmin

Zie `docs/AZURE-SETUP.md` §7.

## Opruimen in de DoGoDa-repo

Zolang deze site nog niet live staat, blijft `dogoda.nl/ty-luwa` gewoon werken. Zodra
`www.ty-luwa.com` draait, kan daar weg:

- de map `ty-luwa-app/`
- het `/ty-luwa`-blok in `Server.js` (regels 14–29)
- de regel `/Ty-LuWa/` in `.gitignore`

Zet er wel een 301 van `/ty-luwa/*` naar `https://www.ty-luwa.com/` voor in de plaats, zodat
bestaande links en zoekresultaten niet doodlopen. Dit is nog niet gedaan.
