# Ty LuWa op Azure — opzet van de App Service

Dit document beschrijft de volledige opzet: welke Azure-resources je aanmaakt, waarom,
wat het kost, en hoe je de drie Strato-domeinen eraan hangt. Volg de stappen op volgorde.

---

## 1. Wat je bouwt, en waarom

De site is statische HTML, gegenereerd door een buildscript. Een Static Web App zou daar
op zich voor volstaan, maar de server kiest per domein de juiste taalmap en de boekingsadmin
die erbij komt (beschikbaarheidskalender, aanvragen goedkeuren, inloggen) heeft server-side
code en een database nodig. Daarom een **Web App op Linux met Node 24**, hetzelfde patroon
als DoGoDa en TrainerBjörn — een `Server.js` die Express draait. Je kent het al en je kunt er
later API-routes naast zetten zonder te migreren.

| Resource | Keuze | Waarom |
|---|---|---|
| Resource group | `rg-tyluwa-prod` | Alles van Ty LuWa bij elkaar, apart van DoGoDa. Eén klik om alles te verwijderen als het ooit stopt. |
| Regio | **West Europe** | Dichtst bij de bezoekers (NL/FR/DE). Kies dezelfde regio voor alle resources, anders betaal je dataverkeer tussen regio's. |
| App Service Plan | **B1, Linux** | Zie hieronder. |
| Web App | `ty-luwa`, Node 24 LTS | Naam moet wereldwijd uniek zijn op `azurewebsites.net`; dit is de naam die daadwerkelijk is aangemaakt. |
| Database | PostgreSQL Flexible Server, B1ms | Pas nodig bij de boekingsadmin. Zie §7. |

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

Niets verplicht hier voor de site zelf — welke taal een domein toont (§6) staat vast in
`content/routes.json`, geen Application setting nodig. Eén optionele:

| Naam | Waarde | Waarom |
|---|---|---|
| `WEBSITE_RUN_FROM_PACKAGE` | `1` | Alleen als je zonder GitHub Actions deployt. Bij de workflow hieronder niet nodig. |

`PORT` zet je **niet** zelf — App Service injecteert die.

---

## 5. Deployment vanaf GitHub

Gekozen: **continuous deployment aangezet in de creation wizard** (het "Deployment"-tabblad
bij het aanmaken van de Web App), niet een los workflow-bestand in deze repo. Azure heeft
daar zelf de GitHub-koppeling, de app-registratie, de federated credential (OIDC) en een
workflow-bestand voor aangemaakt en naar `main` gepusht. Er staat daarom **geen**
`.github/workflows/`-bestand in deze repo — dat zou een tweede, botsende deploy geven bij
elke push. Dit is dezelfde route als DoGoDa gebruikt.

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

## 7. De boekingsadmin (volgende fase)

Nog niet gebouwd. Dit is de vorm die past op wat er nu staat:

**Database.** Azure Database for PostgreSQL Flexible Server, SKU **B1ms Burstable**,
32 GB opslag, West Europe — ± €15–18 per maand. Zet **Allow public access from Azure
services** aan, of koppel via VNet-integratie als je strenger wilt zijn. Voor één huis met
een handvol boekingen per jaar is Postgres ruim bemeten maar wel de minste eigen code:
alternatieven als Azure Table Storage (± €0,50 per maand) besparen geld maar kosten je
zelfgeschreven query-logica.

**Inloggen.** Twee rollen: beheer en de maison. De goedkoopste betrouwbare route is
**App Service Built-in Authentication (Easy Auth)** met Microsoft Entra ID, afgeschermd op
`/admin/*` — geen wachtwoordcode van jezelf, geen sessiebeheer, gratis. Voorwaarde is wel
dat beide gebruikers een Microsoft-account hebben. Zo niet, dan een eigen loginformulier met
gehashte wachtwoorden en sessies in Postgres.

**Secrets.** Connection strings horen niet in de repo. Zet ze in **Application settings**,
of beter in **Azure Key Vault** met een Key Vault reference. `.env` staat in `.gitignore`.

**Structuur.** Voeg `routes/api.js` toe naast `Server.js` en mount die **vóór** de
pagina-handler — die staat aan het eind van `Server.js` en vangt anders elke API-route af,
net als de 404-handler daaronder. Zet het beheer op één taal en één domein
(`ty-luwa.nl/beheer`), buiten de `hreflang`-set; `robots.txt` sluit `/beheer` al uit.

---

## 8. Wat er nog moet gebeuren aan de site zelf

Zie de README. Kort: definitieve foto's in plaats van `assets/photos/provisional/`, en het
aanvraagformulier dat nog niets verstuurt omdat dat op de boekingsadmin wacht.

De SEO-kant is af: elke pagina draagt een self-canonical, `hreflang` naar alle vier de
taalversies plus `x-default`, Open Graph, JSON-LD en een eigen meta description, en er is
per domein een `sitemap.xml` en `robots.txt`.
