# Ty LuWa op Azure — opzet van de App Service

Dit document beschrijft de volledige opzet: welke Azure-resources je aanmaakt, waarom,
wat het kost, en hoe je de drie Strato-domeinen eraan hangt. Volg de stappen op volgorde.

---

## 1. Wat je bouwt, en waarom

De site is statische HTML, gegenereerd door een buildscript. Een Static Web App zou daar
op zich voor volstaan, maar de server kiest per domein de juiste taalmap, en het beheer
(beschikbaarheidskalender, aanvragen, inloggen) heeft server-side code en opslag nodig. Daarom een **Web App op Linux met Node 24**, hetzelfde patroon
als DoGoDa en TrainerBjörn — een `Server.js` die Express draait. Je kent het al en je kunt er
later API-routes naast zetten zonder te migreren.

| Resource | Keuze | Waarom |
|---|---|---|
| Resource group | `rg-tyluwa-prod` | Alles van Ty LuWa bij elkaar, apart van DoGoDa. Eén klik om alles te verwijderen als het ooit stopt. |
| Regio | **West Europe** | Dichtst bij de bezoekers (NL/FR/DE). Kies dezelfde regio voor alle resources, anders betaal je dataverkeer tussen regio's. |
| App Service Plan | **B1, Linux** | Zie hieronder. |
| Web App | `ty-luwa`, Node 24 LTS | Naam moet wereldwijd uniek zijn op `azurewebsites.net`; dit is de naam die daadwerkelijk is aangemaakt. |
| Database | geen aparte resource | De planning staat in een SQLite-bestand op de App Service zelf (`/home/data`). Zie §7. |

### Waarom B1 en niet F1 (gratis)

Dit is de beslissing die telt:

- **F1 (gratis)** kan geen eigen domein met TLS aan. Je site zou alleen op
  `ty-luwa.azurewebsites.net` draaien. Ook geen Always On, dus na 20 minuten stilte
  slaapt de app en wacht de eerste bezoeker 10–20 seconden. Onbruikbaar voor een site die
  gasten moet overtuigen.
- **B1 (Basic, ± €12–13 per maand)** geeft eigen domeinen, een **gratis automatisch
  vernieuwend TLS-certificaat**, Always On, en 1,75 GB geheugen. Dit is wat je nodig hebt.
- **S1 (Standard, ± €65)** voegt deployment slots, autoscaling en dagelijkse back-ups toe.
  Voor één vakantiehuis is dat weggegooid geld.

**Kostentip die je echt geld scheelt:** een App Service *Plan* is de machine, een *Web App*
is een site die erop draait. Meerdere Web Apps mogen hetzelfde plan delen, en dat kost niets
extra. Als je DoGoDa al op een B1-plan of hoger hebt draaien, kun je `ty-luwa`
daarop zetten: eigen repo, eigen App Service, eigen domein, eigen deployment — alleen de
onderliggende machine is gedeeld. Dat scheelt €12–13 per maand.

De keerzijde: CPU en geheugen zijn dan gedeeld, en een herstart van het plan raakt beide
sites. Bij dit verkeersvolume is dat geen praktisch probleem. Wil je Ty LuWa echt volledig
losgekoppeld — bijvoorbeeld omdat je het later overdraagt aan je ouders of aan een andere
eigenaar — neem dan een eigen plan. Dan is de hele resource group in één keer overdraagbaar.

---

## 2. Resources aanmaken (portal)

1. **Resource group** → naam `rg-tyluwa-prod`, regio West Europe.
2. **Create a resource → Web App**:
   - Name: `ty-luwa`
   - Publish: **Code**
   - Runtime stack: **Node 24 LTS**
   - Operating System: **Linux**
   - Region: West Europe
   - Pricing plan: nieuw plan `asp-tyluwa-prod`, SKU **B1** — óf kies het bestaande
     DoGoDa-plan uit de lijst (zie de kostentip hierboven).
3. Na aanmaken: **Configuration → General settings** → zet **Always On** op **On**.
   Zonder dit valt de app in slaap ondanks B1.
4. **TLS/SSL settings** (of **Custom domains** in nieuwere portals) → **HTTPS Only: On**.
   Doe dit op platformniveau, niet in `Server.js` — dan hoeft de redirect niet door Node.

---

## 3. Startcommando

App Service detecteert Node en draait `npm start`, wat de site bouwt en daarna
`node Server.js` start. De GitHub-workflow draait `npm run build` al vóór het uploaden, dus
in productie is het bouwen bij het starten alleen een vangnet. Dat werkt zonder configuratie. Zie je toch de Azure-welkomstpagina, zet dan expliciet in
**Configuration → General settings → Startup Command**:

```
node Server.js
```

---

## 4. Applicatie-instellingen

Welke taal een domein toont (§6) staat vast in `content/routes.json`; daar is geen
Application setting voor. Het beheer en het aanvraagformulier (§7) hebben er wel een paar
nodig. Zet ze onder **Configuration → Application settings**:

| Naam | Waarde | Waarom |
|---|---|---|
| `DATA_DIR` | `/home/data` | Waar de SQLite-database en de snapshots staan. `/home` blijft bewaard over deploys en herstarts heen; `wwwroot` niet. |
| `BEHEER_EMAILS` | `luuk@…,wanda@…,bjorn@…` | Wie mag inloggen op `/beheer`. Alleen deze adressen krijgen een inlogcode. |
| `BEHEER_HOST` | `ty-luwa.nl` | Het enige domein waar het beheer op draait. Tot de domeinen live zijn: `ty-luwa.azurewebsites.net`. |
| `MAIL_PROVIDER` | `acs` | Mail via Azure Communication Services (§7). Weglaten of `console` = alleen loggen, niets versturen. |
| `ACS_ENDPOINT` | `https://<naam>.europe.communication.azure.com` | De Communication Services-resource. |
| `ACS_KEY` | *(sleutel)* | Een van de twee toegangssleutels van die resource. Liever als Key Vault reference. |
| `MAIL_FROM` | `DoNotReply@ty-luwa.nl` | Afzender; moet een gekoppeld adres van het geverifieerde domein zijn. |
| `MAIL_REPLY_TO` | *(adressen van Luuk en Wanda, komma's ertussen)* | Reply-To op elke mail aan een gast (ontvangstbevestiging en antwoorden): antwoordt de gast, dan landt dat in hun eigen mailbox. Staat in mailheaders, niet op de site. |
| `MAIL_NOTIFY` | *(adressen, komma's ertussen)* | Waar "nieuwe aanvraag" heen gaat. Leeg = `BEHEER_EMAILS`. |
| `TRANSLATOR_KEY` | *(sleutel)* | Azure AI Translator, voor antwoorden in de taal van de gast en gastberichten in het Nederlands (§7). Leeg = niet vertalen. |
| `TRANSLATOR_REGION` | `westeurope` | De regio van de Translator-resource; verplicht bij de sleutel. |
| `BACKUP_EMAIL` | *(adres van Björn)* | Krijgt elke week de planning als JSON-bijlage. |
| `WEBSITE_RUN_FROM_PACKAGE` | `1` | Alleen als je zonder GitHub Actions deployt. Bij de workflow hieronder niet nodig. |

`PORT` zet je **niet** zelf — App Service injecteert die. Lokaal staan dezelfde namen in een
`.env` in de repo-root (gitignored); `Server.js` leest dat bestand.

---

## 5. Deployment vanaf GitHub

Gekozen: **continuous deployment aangezet in de creation wizard** (het "Deployment"-tabblad
bij het aanmaken van de Web App), niet een los workflow-bestand in deze repo. Azure heeft
daar zelf de GitHub-koppeling, de app-registratie, de federated credential (OIDC) en het
workflow-bestand `.github/workflows/main_ty-luwa.yml` voor aangemaakt en naar `main`
gepusht. Voeg er zelf geen tweede workflow naast — dat geeft een botsende deploy bij elke
push. Dit is dezelfde route als DoGoDa gebruikt.

Controleren of het goed staat:

- Web App → **Deployment Center** toont de koppeling met `DogodaBjorn/ty-luwa`, branch `main`,
  en de laatste deployment-status.
- In de repo staat het door Azure gegenereerde workflow-bestand op `main`:
  `.github/workflows/main_ty-luwa.yml`. Die draait `npm install`, `npm run build` en uploadt
  het resultaat, dus `public/` hoeft niet in git.
- **Gebruik geen publish profile als je dit ooit handmatig overzet.** Basic authentication
  staat op nieuwe App Services standaard uit en dat is terecht — een publish profile is een
  langlevend wachtwoord in een secret. OIDC heeft geen wachtwoord dat kan lekken.

Wil je later toch naar een handmatig workflow-bestand in de repo (bijvoorbeeld om build-stappen
toe te voegen die de Azure-gegenereerde workflow niet doet), verwijder dan eerst de koppeling
in Deployment Center voordat je zelf een `.github/workflows/*.yml` toevoegt — anders deployen
er weer twee tegelijk.

---

## 6. De drie Strato-domeinen koppelen

Elk domein is een eigen website in een eigen taal: `ty-luwa.nl` Nederlands, `ty-luwa.com`
Engels, `ty-luwa.fr` Frans, en Duits onder `ty-luwa.com/de/` omdat er geen `ty-luwa.de` is.
Drie ccTLD's met elk hun eigen taal, geen canoniek domein met doorverwijzers.

Alle zes de hostnamen (apex + `www` van elk domein) moeten op de App Service staan en TLS
hebben. Hoe de taal per domein werkt staat in [`MEERTALIGHEID.md`](MEERTALIGHEID.md);
hieronder alleen wat je in Azure en bij Strato instelt.

### Per domein in Azure

Web App → **Custom domains → Add custom domain**. Voer het domein in; Azure toont dan twee
dingen die je bij Strato moet zetten: een **Domain verification ID** en het doeladres.
Doe dit voor alle zes de namen (apex + www van elk domein).

### Bij Strato, in de DNS-beheerder van elk domein

Voor `ty-luwa.com`:

| Type | Naam / host | Waarde |
|---|---|---|
| A | `@` (leeg / apex) | het **inbound IP-adres** uit Custom domains |
| TXT | `asuid` | de **Domain verification ID** uit Custom domains |
| CNAME | `www` | `ty-luwa.azurewebsites.net` |
| TXT | `asuid.www` | dezelfde **Domain verification ID** |

Herhaal exact hetzelfde voor `ty-luwa.fr` en `ty-luwa.nl`. De verification ID is voor alle
domeinen dezelfde (hij hoort bij de Web App, niet bij het domein).

Twee dingen die vaak misgaan:

- **Op de apex kan geen CNAME.** Dat is geen Strato-beperking maar hoe DNS werkt. Vandaar
  het A-record. Nadeel: verandert het inbound IP van je App Service ooit (bij een migratie
  tussen scale-units), dan moet je dat A-record met de hand bijwerken. Wil je dat niet:
  verhuis de nameservers naar een **Azure DNS zone** (± €0,45 per zone per maand) en gebruik
  daar een **Alias record** op de apex, die volgt de App Service automatisch.
- **Strato zet soms zelf een parking-record.** Verwijder bestaande A- of CNAME-records op
  `@` en `www` voordat je de jouwe toevoegt, anders blijft de parkeerpagina winnen.

Reken op 15 minuten tot een paar uur DNS-propagatie. Controleren:

```bash
nslookup ty-luwa.com
nslookup -type=TXT asuid.ty-luwa.com
```

### TLS-certificaten

Zodra een domein in Custom domains groen staat: klik het aan → **Add binding** →
**Create App Service Managed Certificate** → SNI SSL. Gratis, vernieuwt zichzelf.
Doe dit voor alle zes de namen. Een managed certificate kan geen wildcard, dus apex en
`www` krijgen elk hun eigen certificaat — dat is prima.

### Wat elk domein toont

Dit zit in de build en in `Server.js`, niet in een Application setting — geen
configuratiestap, het werkt zodra de domeinen en TLS staan.

| Binnenkomend | Resultaat |
|---|---|
| `ty-luwa.nl/verblijf` | 200, Nederlands |
| `ty-luwa.com/the-house` | 200, Engels |
| `ty-luwa.fr/le-logement` | 200, Frans |
| `ty-luwa.com/de/unterkunft` | 200, Duits |
| `www.<domein>/*` | 301 → zonder `www` |
| `ty-luwa.com/en/verblijf` (oude vorm) | 301 → `ty-luwa.com/the-house` |
| `<domein>/sitemap.xml`, `/robots.txt` | per domein een eigen bestand |
| onbekende host (`azurewebsites.net`, probes, een IP) | nooit doorgestuurd |

---

## 7. Het beheer en het aanvraagformulier

Gebouwd. Wat er draait, en wat je eenmalig in Azure moet inrichten.

**Wat het is.** `ty-luwa.nl/beheer` is een Nederlandstalige beheertool voor Luuk en Wanda:
kalender per maand, periodes toevoegen (verhuurd, optie, wij zelf, gesloten), aanvragen
afhandelen, hulp, reservekopie. De publieke sites tonen dezelfde planning als vrij/bezet,
zonder details. Het aanvraagformulier slaat op in dezelfde database en mailt Luuk en Wanda
en de gast. Uitleg voor de beheerders: `docs/HANDLEIDING-BEHEER.md` (ook op `/beheer/hulp`).

**Opslag: SQLite in `/home/data`.** Geen aparte databaseserver. Node 24 heeft SQLite
ingebouwd (`node:sqlite`); het bestand staat in `DATA_DIR` = `/home/data`, buiten
`wwwroot`, dus een deploy raakt het niet. `/home` is op App Service een netwerkmount (SMB):
daarom gebruikt `lib/db.js` het klassieke rollback-journal en geen WAL, en draait de app op
**één instance**. Schaal de App Service nooit uit naar meerdere instances; dat is voor deze
site ook nergens voor nodig. Controleren of `/home` inderdaad de persistente mount is:
Kudu → SSH → `mount | grep /home`.

**Reservekopieën.** Elke dag schrijft de server een JSON-snapshot naar
`/home/data/backups/` (dertig bewaard) en controleert de database; elke week gaat de
snapshot per mail naar `BACKUP_EMAIL`. In het beheer staat onder Hulp een downloadknop.
Terugzetten: `DATA_DIR=/home/data node scripts/restore.js <snapshot.json> --ja` via Kudu SSH.

**Inloggen: zonder wachtwoord.** Wie op `BEHEER_EMAILS` staat vult zijn adres in en krijgt
een mail met een link en een code van zes cijfers; daarna een cookie van een jaar op dat
toestel. Geen Easy Auth en geen Microsoft-account nodig; sessies en codes staan gehasht in
dezelfde database. Uitloggen kan in het beheer; alle sessies in één keer ongeldig maken kan
door de tabel `sessions` te legen (`scripts/restore.js` raakt die niet).

**Mail: Azure Communication Services Email.** Eenmalig:

1. **Create a resource → Communication Services**, naam bv. `acs-tyluwa`, data location
   Europe, in `rg-tyluwa-prod`.
2. **Create a resource → Email Communication Service**, zelfde resource group.
   Daarin **Provision domains → Add domain → Custom domain**: `ty-luwa.nl`. Azure toont
   TXT-records voor domeinverificatie, SPF en twee DKIM-CNAME's. Zet die bij Strato in de
   DNS van `ty-luwa.nl` en klik op Verify. Dit kan een uur duren.
3. Bij het domein: **MailFrom addresses** — de standaard is `DoNotReply@ty-luwa.nl`; dat is
   de `MAIL_FROM`.
4. Terug in de Communication Services-resource: **Email → Domains → Connect domain**, kies
   het domein van stap 2.
5. **Keys**: kopieer de endpoint-URL en een sleutel naar `ACS_ENDPOINT` en `ACS_KEY` (§4).
   De code praat rechtstreeks met de REST-API en tekent de verzoeken zelf; er is geen SDK.

Kosten: ACS Email rekent per mail (fracties van een cent); bij een handvol aanvragen per
maand is dat afgerond nul. Zonder `MAIL_PROVIDER=acs` logt de server elke mail alleen
(handig lokaal) en werkt de rest gewoon door.

**Vertalen: Azure AI Translator.** Luuk en Wanda typen hun antwoord in het Nederlands in
het beheer; de site vertaalt het naar de taal van de gast, laat het eerst zien en verstuurt
het dan vanaf `MAIL_FROM` met Reply-To naar `MAIL_REPLY_TO`. Binnenkomende berichten in
fr/en/de krijgen een Nederlandse vertaling in het beheer en in de meldingsmail. Eenmalig:

1. **Create a resource → Translator** (Azure AI services), naam bv. `tr-tyluwa`, regio
   **West Europe**, pricing tier **F0** (gratis, 2 miljoen tekens per maand; ruim genoeg).
2. **Keys and Endpoint**: kopieer een sleutel naar `TRANSLATOR_KEY` en de regio
   (`westeurope`) naar `TRANSLATOR_REGION`. Het eindpunt is het wereldwijde
   `api.cognitive.microsofttranslator.com`; `TRANSLATOR_ENDPOINT` alleen zetten als je een
   ander eindpunt gebruikt.

Zonder sleutel gaat een antwoord in het Nederlands, met een melding in het beheer; er wordt
nooit iets verstuurd als het vertalen mislukt.

**Structuur in de code.** `routes/beheer.js` en `routes/api.js` zijn in `Server.js`
gemonteerd **vóór** de paginahandler, die anders elke route afvangt. Het beheer staat op één
taal en één domein (`BEHEER_HOST`), buiten de `hreflang`-set; `robots.txt` sluit `/beheer`
en `/api` uit. Andere bekende domeinen sturen `/beheer` door naar `ty-luwa.nl`.

**Juli en Siblu.** Siblu verhuurt de caravan in juli. De server zet juli van dit jaar en de
twee volgende automatisch in de kalender als soort "Via Siblu" (roze); publiek staat er
"mogelijk boekbaar via Siblu" met een link naar leconguel.fr, en een aanvraag voor die
nachten krijgt die verwijzing. Halen Luuk en Wanda de periode weg of passen ze hem aan, dan
blijft dat zo voor dat jaar.

**Testen na de inrichting.** Log in met een echt adres, zet een testperiode, kijk op
`ty-luwa.fr/disponibilites` of hij bezet toont, stuur vanaf `ty-luwa.com` een testaanvraag,
controleer de twee mails, en stuur vanuit het beheer een antwoord (het voorbeeld toont de
vertaling). Verwijder daarna de testperiode weer (of zet hem terug).

---

## 8. Wat er nog moet gebeuren aan de site zelf

Zie de README. Kort: definitieve foto's in plaats van `assets/photos/provisional/`, en de
beslisinformatie (prijsindicatie, minimumverblijf, wisseldag) die alleen Luuk en Wanda
kunnen aanleveren.

De SEO-kant is af: elke pagina draagt een self-canonical, `hreflang` naar alle vier de
taalversies plus `x-default`, Open Graph, JSON-LD en een eigen meta description, en er is
per domein een `sitemap.xml` en `robots.txt`.
