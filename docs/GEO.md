# AI-vindbaarheid (GEO) van Ty LuWa

Steeds meer mensen vragen een AI-systeem "een vakantiehuis in Quiberon voor vier personen"
in plaats van te googelen. Die systemen geven een antwoord, geen lijst met links, en halen
dat antwoord uit pagina's die ze kunnen lezen, begrijpen en citeren. Dit document houdt bij
wat de site daarvoor doet, wat er nog aan content te doen is en hoe we meten of het werkt.

## Wat de build doet (klaar sinds 13 oktober 2026)

| Laag | Wat | Waar |
|---|---|---|
| robots.txt | Alle AI-agents expliciet toegelaten; `/beheer` en `/api` dicht | `AI_AGENTS` en `robotsTxt()` in `scripts/build-site.js` |
| llms.txt | Per domein één bestand met per taal: feitenblad, elke pagina met URL en beschrijving, de FAQ, de aanvraagregel en de attributie van de camping | `llmsTxt()` in `scripts/build-site.js`, route in `Server.js` |
| JSON-LD | Eén entiteit `@id https://ty-luwa.com/#ty-luwa` op alle 28 pagina's, met `numberOfRooms`, `amenityFeature` uit de voorzieningenlijst en de camping met haar website; FAQ-pagina als `FAQPage` | `head()` in `scripts/build-site.js` |
| Test | Build draait, bestanden en entiteit worden gecontroleerd | `test/geo.test.js` |

Alles komt uit `content/site-content.json`. Verandert de content, dan veranderen llms.txt en
het JSON-LD mee. Er staat geen eigen copy in de build.

## De zes kenmerken, toegepast op Ty LuWa

1. **Herkenbare entiteiten.** Ty LuWa, Camping Le Conguel, Quiberon, Bretagne, Luuk en Wanda.
   Nu consistent in JSON-LD. In de lopende tekst staat vaak "de camping" of "het verblijf";
   dat is prima binnen een pagina, maar elke alinea die op zichzelf een antwoord moet zijn
   noemt de naam voluit.
2. **Query fan-out.** De vervolgvragen die een AI-systeem bij de hoofdvraag stelt: wat kost het,
   voor wie, wanneer open, hoe boek je, wat is het verschil met Siblu. Drie staan in de FAQ;
   de rest staat hieronder als voorstel.
3. **Rol binnen het domein.** De homepage zegt al wat Ty LuWa is en voor wie. De hubpagina's
   verblijf, Le Conguel en Quiberon dragen elk één thema; dat klopt.
4. **Retrieval-ready passages.** Eén punt per alinea, antwoord vooraan. De introteksten doen
   dit goed; de kaartjes op Le Conguel en Quiberon zijn kort en losstaand, ook goed.
5. **Contextuele verankering.** Quiberon en Bretagne staan overal; het seizoen (maart tot en
   met oktober) staat alleen bij de kalender. Voorstel: ook in de FAQ.
6. **Vragende taal.** "Wanneer zouden jullie willen komen?" en "Wanneer is Ty LuWa vrij?"
   zijn al vragen. De FAQ-uitbreiding hieronder voegt de vragen toe die mensen echt stellen.

## Voorstel: FAQ uitbreiden (Nederlands, ter goedkeuring)

Elk antwoord hieronder gebruikt alleen feiten die al op de site of in het feitenblad staan.
Na akkoord komen ze in `faq.items` en worden ze per taal geredigeerd, nooit automatisch
vertaald. Ze landen dan vanzelf in `FAQPage` en in llms.txt.

**Wat kost een verblijf in Ty LuWa?**
Er staat geen prijslijst online. Stuur je gewenste periode en gezelschap door via de
beschikbaarheidspagina; Luuk en Wanda sturen persoonlijk een prijs en bevestigen of de
periode vrij is. Er is geen betaling vooraf.

**Wanneer is Ty LuWa open?**
Van maart tot en met oktober. Van november tot en met februari is Camping Le Conguel gesloten.

**Voor wie is Ty LuWa geschikt?**
Voor een gezin met tot vier kinderen, twee stellen met hooguit twee kinderen, of een groep
vrienden tot vier volwassenen. Vier personen slapen in de twee slaapkamers: een tweepersoonsbed
in de hoofdslaapkamer en twee eenpersoonsbedden in de tweede slaapkamer. Op de slaapbank in de
woonkamer kunnen hooguit twee kinderen bij. Nooit meer dan vier volwassenen en nooit meer dan
zes gasten in totaal.

**Kunnen we met zes personen komen?**
Ja, als er hooguit vier volwassenen bij zijn: vier personen in de twee slaapkamers en twee
kinderen op de slaapbank in de woonkamer. Meer dan zes gasten past niet.

**Zijn het zwembad en de animatie van de camping inbegrepen?**
Nee. Ty LuWa is een privéverblijf op Camping Le Conguel; het zwembad, de animatie en de andere
campingfaciliteiten horen bij de camping en zitten niet in de prijs van Ty LuWa. Je kunt ze
voordelig bijboeken bij de camping zelf, via de Fun Pass van Siblu. Vraag bij je aanvraag aan
Luuk en Wanda hoe dat voor jouw periode werkt.

**Hoe lang kunnen we blijven?**
Een aanvraag kan tot 28 nachten zijn. Wil je langer, stuur dan een kortere aanvraag met een
opmerking erbij.

**Wat is het verschil tussen Ty LuWa aanvragen en boeken via Siblu?**
Ty LuWa is het privéverblijf van Luuk en Wanda op Camping Le Conguel van Siblu. Via deze site
vraag je rechtstreeks bij hen aan, met persoonlijk contact en zonder boekingsmachine. In een
deel van het jaar verhuurt Siblu Ty LuWa zelf; die periodes staan in de kalender gemarkeerd
en boek je op leconguel.fr.

**Waar ligt Ty LuWa precies?**
Op Camping Le Conguel van Siblu, een viersterrencamping aan de zuidoostpunt van het
schiereiland Quiberon in Bretagne, vlak bij zee.

**Wat is er in de keuken?**
Gasfornuis, gasoven, magnetron, koelkast met vriesvak en vaatwasser.

**Is er een wasmachine?**
Ja, er is een wasmachine in het verblijf. De badkamer heeft een ruime douche; het toilet is apart.

> Correctie van Bjorn, 13 oktober 2026: de wasmachine staat niet in de badkamer maar in de
> kamer. Het feitenblad in `CLAUDE.md`, de regel "Badkamer met ruime douche en wasmachine" en
> de caption van de badkamerfoto in `site-content.json` zeggen nog badkamer, in vier talen.
> Eerst bevestigen welke kamer bedoeld is, dan alle drie de plekken tegelijk aanpassen.

**Kan ik bij de mobil-home parkeren?** *(staat al in de FAQ)*

### Vragen die mensen stellen en waarvoor het feit ontbreekt

Deze kunnen pas in de FAQ als Luuk en Wanda het antwoord geven. Niets verzinnen.

- Is er wifi in Ty LuWa of op de camping?
- Zijn huisdieren toegestaan?
- Hoe ver is het strand lopend?
- Zijn beddengoed en handdoeken inbegrepen?
- Is er een minimumverblijf, bijvoorbeeld een week in juli en augustus?
- Hoe ver is het vanaf Nederland, België en Duitsland rijden, en waar is de dichtstbijzijnde
  treinhalte of luchthaven?
- Kan een kinderbedje of kinderstoel geregeld worden?

## Meten of het werkt

Twee signalen, allebei uit de eigen serverlogging zodra `lib/track.js` ook op deze site
draait (nu op trainerbjorn, zie `docs/tracking.md` daar):

- **AI-crawl**: GPTBot, ClaudeBot, PerplexityBot en OAI-SearchBot halen pagina's op om te
  indexeren. Dit zegt dat de site gevonden is.
- **AI-retrieval**: ChatGPT-User, Perplexity-User en Claude-User halen een pagina op op het
  moment dat iemand een vraag stelt. Elke hit betekent dat de pagina in een antwoord is
  gebruikt. Dit is het kengetal; per pagina per dag in de view `v_agents_daily`.

Daarnaast een maandelijks panel van tien vragen, gesteld in ChatGPT, Perplexity en Claude,
met per vraag genoteerd of Ty LuWa wordt genoemd en welke pagina wordt geciteerd:

1. Vakantiehuis Quiberon voor 4 personen
2. Mobil-home huren Camping Le Conguel
3. Stacaravan Bretagne met kinderen aan zee
4. Quiberon camping vakantie gezin zwembad
5. Location mobil-home Quiberon 4 personnes
6. Mobilheim Quiberon Bretagne Familie
7. Holiday home Quiberon peninsula family
8. Le Conguel Siblu privé huren
9. Côte Sauvage overnachten gezin
10. Bretagne vakantie augustus 4 volwassenen 2 kinderen

Eerste meting doen zodra de branch live staat, daarna elke eerste week van de maand.

## Niet gedaan, met reden

- Geen `sameAs` naar sociale profielen: er zijn er geen bekend; niets verzinnen.
- Geen `geo`-coördinaten: niet in de content; eerst door Luuk en Wanda laten bevestigen.
- Geen `priceRange`: er is geen prijslijst en dat is een bewuste keuze van de site.
- Geen nieuwe tekst in vier talen in deze ronde: per taal redactiewerk, pas na akkoord.
