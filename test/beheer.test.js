// Integratietest van het beheer op de echte app: inloggen met code en met
// link, periode opslaan, overlap, verwijderen en terugzetten, aanvraag
// afhandelen, afscherming van andere hosts.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "tyluwa-beheer-"));
process.env.MAIL_PROVIDER = "console";
process.env.BEHEER_EMAILS = "wanda@example.nl, luuk@example.nl";
process.env.RATE_MAX = "100";
process.env.TRANSLATOR_KEY = "test-sleutel";
process.env.TRANSLATOR_REGION = "westeurope";

// Nep-vertaler: [xx] ervoor, zodat je ziet welke kant op vertaald is.
const realFetch = global.fetch;
let translatorDown = false;
global.fetch = async (url, init) => {
  if (!String(url).includes("microsofttranslator.com")) return realFetch(url, init);
  if (translatorDown) return { ok: false, status: 503, text: async () => "down" };
  const to = new URL(url).searchParams.get("to");
  const text = JSON.parse(init.body)[0].Text;
  return { ok: true, json: async () => [{ translations: [{ text: `[${to}] ${text}`, to }] }] };
};

const logged = [];
const origLog = console.log;
console.log = (...a) => logged.push(a.join(" "));
const app = require("../Server.js");
console.log = origLog;

let server;
let jar = {};
const cookieHeader = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
function request(method, urlPath, { headers = {}, body, host = "ty-luwa.nl" } = {}) {
  return new Promise((resolve, reject) => {
    const h = { Host: host, Cookie: cookieHeader(), ...headers };
    if (body) h["Content-Type"] = "application/x-www-form-urlencoded";
    const r = http.request({ host: "127.0.0.1", port: server.address().port, method, path: urlPath, headers: h }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (text += c));
      res.on("end", () => {
        for (const sc of res.headers["set-cookie"] || []) {
          const [pair, ...attrs] = sc.split(";");
          const [k, v] = pair.split("=");
          if (attrs.some((a) => a.trim() === "Max-Age=0")) delete jar[k];
          else jar[k] = v;
        }
        resolve({ status: res.statusCode, location: res.headers.location, headers: res.headers, text });
      });
    });
    r.on("error", reject);
    if (body) r.write(new URLSearchParams(body).toString());
    r.end();
  });
}

test.before(async () => {
  await new Promise((r) => (server = app.listen(0, r)));
});
test.after(() => server.close());

test("zonder sessie: naar inloggen; andere hosts weggestuurd", async () => {
  assert.equal((await request("GET", "/beheer")).location, "/beheer/inloggen");
  assert.equal((await request("GET", "/beheer", { host: "ty-luwa.fr" })).location, "https://ty-luwa.nl/beheer");
  assert.equal((await request("GET", "/beheer", { host: "evil.example" })).status, 404);
  assert.equal((await request("POST", "/beheer/periode/nieuw", { body: { kind: "own" } })).status, 403);
});

test("de app op het beginscherm: manifest en worker zijn er ook zonder sessie", async () => {
  // Een manifest wordt zónder cookies opgehaald: achter de inlogmuur zou de
  // browser een omleiding krijgen en dus nooit een manifest zien.
  const m = await request("GET", "/beheer/manifest.webmanifest");
  assert.equal(m.status, 200);
  assert.match(m.headers["content-type"], /manifest/);
  const manifest = JSON.parse(m.text);
  // Zonder afsluitende slash, anders valt /beheer zelf buiten de scope.
  assert.equal(manifest.scope, "/beheer");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.start_url.startsWith("/beheer"));
  const sizes = manifest.icons.map((i) => `${i.sizes} ${i.purpose}`);
  assert.deepEqual(sizes, ["192x192 any", "512x512 any", "512x512 maskable"]);

  const sw = await request("GET", "/beheer/sw.js");
  assert.equal(sw.status, 200);
  assert.equal(sw.headers["service-worker-allowed"], "/beheer");
  assert.doesNotMatch(sw.headers["cache-control"], /no-store/);
  assert.match(sw.text, /addEventListener\("fetch"/);
  // De worker mag nooit iets onderscheppen of bewaren: beheerdata mag niet
  // verouderd getoond worden. Deze twee asserties zijn de hele garantie.
  assert.doesNotMatch(sw.text.replace(/\/\/.*$/gm, ""), /respondWith/);
  assert.doesNotMatch(sw.text.replace(/\/\/.*$/gm, ""), /caches/);

  // De host-guard geldt ook voor de nieuwe routes.
  assert.equal((await request("GET", "/beheer/manifest.webmanifest", { host: "ty-luwa.fr" })).status, 302);
  assert.equal((await request("GET", "/beheer/sw.js", { host: "evil.example" })).status, 404);

  // De iconen staan op de publieke assets, dus buiten no-store.
  const icon = await request("GET", "/assets/brand/ty-luwa-icoon-192.png");
  assert.equal(icon.status, 200);
  const png = fs.readFileSync(path.join(__dirname, "..", "assets", "brand", "ty-luwa-icoon-192.png"));
  assert.equal(png.readUInt32BE(16), 192, "breedte uit de PNG-header");
  assert.equal(png.readUInt32BE(20), 192, "hoogte uit de PNG-header");

  // Uitgelogd de app openen: de inlogpagina zegt waarom dat gebeurt.
  assert.equal((await request("GET", "/beheer/app")).location, "/beheer/inloggen");
  assert.equal((await request("GET", "/beheer?vanuit=app")).location, "/beheer/inloggen?vanuit=app");
  const login = await request("GET", "/beheer/inloggen?vanuit=app");
  assert.match(login.text, /Je opent de app voor het eerst/);
  assert.match(login.text, /zes cijfers/);
});

test("inloggen met code, daarna met link (die is dan al verbruikt)", async () => {
  logged.length = 0;
  let res = await request("POST", "/beheer/inloggen", { body: { email: "Wanda@example.nl" } });
  assert.equal(res.status, 200);
  assert.match(res.text, /Kijk in je mail/);
  assert.ok(jar.tl_inloggen, "login-cookie gezet");
  const mail = logged.find((l) => l.includes("Je inlogcode"));
  const code = /^\s{4}(\d{6})$/m.exec(mail)[1];
  const link = /\/beheer\/inloglink\/(\S+)/.exec(mail)[1];

  res = await request("POST", "/beheer/inlogcode", { body: { code: "000000" } });
  assert.match(res.text, /Die code klopt niet/);
  res = await request("POST", "/beheer/inlogcode", { body: { code } });
  assert.equal(res.location, "/beheer?welkom=1");
  assert.ok(jar.tl_sessie, "sessiecookie gezet");
  assert.equal(jar.tl_inloggen, undefined, "login-cookie opgeruimd");

  res = await request("GET", "/beheer?welkom=1");
  assert.equal(res.status, 200);
  assert.match(res.text, /Je bent ingelogd/);
  assert.match(res.text, /Periode toevoegen/);

  // De link hoort bij dezelfde inlogpoging en is nu verbruikt.
  res = await request("GET", `/beheer/inloglink/${link}`);
  assert.match(res.text, /name="token" value="/);
  const saved = { ...jar };
  jar = {};
  res = await request("POST", "/beheer/inloglink", { body: { token: link } });
  assert.equal(res.status, 410);
  jar = saved;

  // Onbekend adres: zelfde scherm, geen mail.
  logged.length = 0;
  res = await request("POST", "/beheer/inloggen", { body: { email: "vreemde@example.com" } });
  assert.match(res.text, /Kijk in je mail/);
  assert.equal(logged.filter((l) => l.includes("--- MAIL")).length, 0);
});

test("periode opslaan, overlap, bewerken, verwijderen, terugzetten", async () => {
  let res = await request("POST", "/beheer/periode/nieuw", {
    body: { form_id: "f1", kind: "rented", arrival: "2026-10-17", departure: "2026-10-24", guestName: "Familie Jansen" },
  });
  assert.equal(res.location, "/beheer?m=2026-10&melding=opgeslagen");
  res = await request("GET", "/beheer?m=2026-10");
  assert.match(res.text, /Familie Jansen/);
  const formPage = await request("GET", "/beheer/periode/nieuw");
  assert.match(formPage.text, /value="siblu"/);
  assert.match(formPage.text, /Via Siblu/);
  assert.match(res.text, /class="cal-day is-busy kind-rented" data-date="2026-10-17"/);

  // dubbele post met hetzelfde form_id maakt geen tweede periode
  await request("POST", "/beheer/periode/nieuw", { body: { form_id: "f1", kind: "rented", arrival: "2026-10-17", departure: "2026-10-24", guestName: "Familie Jansen" } });
  res = await request("GET", "/beheer?m=2026-10");
  assert.equal((res.text.match(/class="period kind-rented"/g) || []).length, 1);

  // overlap: eerst waarschuwing, dan met force
  res = await request("POST", "/beheer/periode/nieuw", { body: { form_id: "f2", kind: "option", arrival: "2026-10-20", departure: "2026-10-27", guestName: "Dupont" } });
  assert.equal(res.status, 400);
  assert.match(res.text, /overlappen met/);
  assert.match(res.text, /name="force"/);
  res = await request("POST", "/beheer/periode/nieuw", { body: { form_id: "f2", kind: "option", arrival: "2026-10-20", departure: "2026-10-27", guestName: "Dupont", force: "1" } });
  assert.equal(res.location, "/beheer?m=2026-10&melding=opgeslagen");

  // fout: vertrek voor aankomst
  res = await request("POST", "/beheer/periode/nieuw", { body: { form_id: "f3", kind: "own", arrival: "2026-12-10", departure: "2026-12-03" } });
  assert.equal(res.status, 400);
  assert.match(res.text, /Vertrek moet na aankomst liggen/);

  // bewerken
  res = await request("GET", "/beheer/periode/1");
  assert.match(res.text, /value="Familie Jansen"/);
  res = await request("POST", "/beheer/periode/1", { body: { kind: "rented", arrival: "2026-10-17", departure: "2026-10-20", guestName: "Familie Jansen-de Vries" } });
  assert.equal(res.location, "/beheer?m=2026-10&melding=opgeslagen");

  // verwijderen en terugzetten
  res = await request("GET", "/beheer/periode/1/verwijderen");
  assert.match(res.text, /Ja, verwijderen/);
  res = await request("POST", "/beheer/periode/1/verwijderen");
  assert.equal(res.location, "/beheer?m=2026-10&melding=verwijderd&id=1");
  res = await request("GET", "/beheer?m=2026-10&melding=verwijderd&id=1");
  assert.match(res.text, /Terugzetten/);
  assert.doesNotMatch(res.text, /Jansen-de Vries/);
  res = await request("POST", "/beheer/periode/1/terugzetten");
  assert.equal(res.location, "/beheer?m=2026-10&melding=teruggezet");
  res = await request("GET", "/beheer?m=2026-10");
  assert.match(res.text, /Jansen-de Vries/);

  assert.equal((await request("GET", "/beheer/periode/999")).status, 404);
});

test("aanvraag: in de kalender zetten, afwijzen, terug naar nieuw", async () => {
  let res = await request("POST", "/api/aanvraag", {
    host: "ty-luwa.com",
    headers: { Accept: "application/json" },
    body: { lang: "de", arrival: "2027-03-06", departure: "2027-03-13", adults: "2", children: "2", name: "Hans Meier", email: "hans@example.de", message: "Mit Hund" },
  });
  assert.equal(res.status, 200);
  res = await request("GET", "/beheer/aanvragen");
  assert.match(res.text, /Hans Meier/);
  assert.match(res.text, /Deze dagen zijn vrij/);
  assert.match(res.text, /Aanvragen<span class="badge">1<\/span>/);

  res = await request("GET", "/beheer/aanvraag/1");
  assert.match(res.text, /mailto:hans%40example.de\?subject=Eure%20Anfrage/);
  assert.match(res.text, /Mit Hund/);
  // dezelfde bijzonderheden als in de meldingsmail
  assert.match(res.text, /<h2>Bijzonderheden<\/h2>/);
  assert.match(res.text, /class="tone-calm">\s*<strong>In de kalender is deze periode vrij/);
  assert.match(res.text, /Feestdagen nog niet opgehaald|Feestdagen en schoolvakanties|Geen feestdag/);

  res = await request("GET", "/beheer/periode/nieuw?aanvraag=1&soort=rented");
  assert.match(res.text, /value="rented" checked/);
  assert.match(res.text, /value="2027-03-06"/);
  assert.match(res.text, /value="Hans Meier"/);
  res = await request("POST", "/beheer/periode/nieuw", { body: { form_id: "f9", request_id: "1", kind: "rented", arrival: "2027-03-06", departure: "2027-03-13", guestName: "Hans Meier" } });
  assert.equal(res.location, "/beheer?m=2027-03&melding=opgeslagen");
  res = await request("GET", "/beheer/aanvragen");
  assert.doesNotMatch(res.text, /Hans Meier/);
  res = await request("GET", "/beheer/aanvragen?tab=afgehandeld");
  assert.match(res.text, /Hans Meier/);
  assert.match(res.text, /In de kalender/);

  res = await request("POST", "/beheer/aanvraag/1/status", { body: { status: "declined" } });
  assert.equal(res.location, "/beheer/aanvragen?melding=afgewezen&id=1");
  res = await request("POST", "/beheer/aanvraag/1/status?status=new");
  assert.equal(res.location, "/beheer/aanvraag/1?melding=nieuw&id=1");
  assert.equal((await request("POST", "/beheer/aanvraag/1/status", { body: { status: "weg" } })).status, 400);

  // de publieke kalender toont de periode uit de aanvraag als bezet
  res = await request("GET", "/verfuegbarkeit", { host: "ty-luwa.com" });
  assert.equal(res.status, 404, "Duits zit onder /de/");
  res = await request("GET", "/de/verfuegbarkeit", { host: "ty-luwa.com" });
  assert.match(res.text, /class="cal-day is-busy" data-date="2027-03-08"/);
});

test("antwoord aan de gast: vertaald voorbeeld, versturen, bewaard", async () => {
  logged.length = 0;
  let res = await request("GET", "/beheer/aanvraag/1");
  assert.match(res.text, /In het Nederlands/);
  assert.match(res.text, /\[nl\] Mit Hund/, "inkomend bericht vertaald bij binnenkomst");
  assert.match(res.text, /Vertaal en bekijk/);

  res = await request("POST", "/beheer/aanvraag/1/antwoord", { body: { body: "" } });
  assert.match(res.text, /Typ eerst een antwoord/);

  res = await request("POST", "/beheer/aanvraag/1/antwoord", { body: { body: "Ja hoor, die week is vrij!\r\nGroet, Wanda" } });
  assert.equal(res.status, 200);
  assert.match(res.text, /\[de\] Ja hoor, die week is vrij!/);
  assert.match(res.text, /name="translated" value="\[de\] Ja hoor, die week is vrij!/);
  assert.match(res.text, /Verstuur aan Hans/);
  assert.equal(logged.filter((l) => l.includes("--- MAIL")).length, 0, "voorbeeld verstuurt niets");

  res = await request("POST", "/beheer/aanvraag/1/antwoord/bewerk", { body: { body: "Ja hoor" } });
  assert.match(res.text, /<textarea id="reply"[^>]*>Ja hoor<\/textarea>/);

  res = await request("POST", "/beheer/aanvraag/1/antwoord/verstuur", { body: { body: "Ja hoor, die week is vrij!", translated: "[de] Ja hoor, die week is vrij!" } });
  assert.equal(res.location, "/beheer/aanvraag/1?melding=verstuurd");
  const mail = logged.find((l) => l.includes("--- MAIL"));
  assert.match(mail, /Aan: hans@example.de/);
  assert.match(mail, /Antwort von Luuk und Wanda/);
  assert.match(mail, /Liebe\(r\) Hans Meier,\n\n\[de\] Ja hoor, die week is vrij!/);
  assert.match(mail, /Ursprüngliche Nachricht auf Niederländisch/);
  res = await request("GET", "/beheer/aanvraag/1?melding=verstuurd");
  assert.match(res.text, /Antwoord verstuurd\./);
  assert.match(res.text, /Al verstuurd/);
  assert.match(res.text, /Ja hoor, die week is vrij!/);

  // vertaler valt uit: niets verstuurd, tekst blijft staan
  translatorDown = true;
  res = await request("POST", "/beheer/aanvraag/1/antwoord", { body: { body: "Nog een vraag" } });
  assert.match(res.text, /Het vertalen lukte even niet/);
  assert.match(res.text, /<textarea id="reply"[^>]*>Nog een vraag<\/textarea>/);
  translatorDown = false;
});

test("wintersluiting: het beheer slaat november tot en met februari over", async () => {
  // Een gesloten maand opvragen komt uit bij de eerstvolgende open maand.
  let res = await request("GET", "/beheer?m=2026-12");
  assert.match(res.text, /Maart 2027/i);
  assert.match(res.text, /href="\/beheer\?m=2026-10"/, "vorige springt terug naar oktober");
  assert.match(res.text, /href="\/beheer\?m=2027-04"/, "volgende gaat naar april");

  res = await request("GET", "/beheer?m=2026-10");
  assert.match(res.text, /href="\/beheer\?m=2027-03"/, "oktober springt door naar maart");

  // Onderhoud in de winter mag; het formulier waarschuwt alleen.
  res = await request("POST", "/beheer/periode/nieuw", { body: { form_id: "fw", kind: "blocked", arrival: "2026-12-01", departure: "2026-12-05" } });
  assert.equal(res.location, "/beheer?m=2026-12&melding=opgeslagen");
  res = await request("GET", "/beheer/periode/4");
  assert.match(res.text, /wintersluiting/);
  // maar de maand zelf blijft onbereikbaar in de kalender
  res = await request("GET", "/beheer?m=2026-12");
  assert.match(res.text, /Maart 2027/i);
});

test("uitleg: acht hoofdstukken, inhoudsopgave, twee sets plaatjes en alles op één pagina", async () => {
  let res = await request("GET", "/beheer/uitleg");
  assert.equal(res.status, 200);
  assert.match(res.text, /Uitleg over de site/);
  for (const t of ["In het kort", "De website", "De kalender lezen", "Inloggen", "Een aanvraag krijgen", "Antwoorden en vertalen", "De planning bijhouden", "Als iets niet lukt"]) {
    assert.ok(res.text.includes(t), `hoofdstuk "${t}" staat in het overzicht`);
  }
  assert.match(res.text, /href="\/beheer\/uitleg\/in-het-kort"/);
  assert.match(res.text, /href="\/beheer\/uitleg\/alles"/);

  // een hoofdstuk: inhoudsopgave uit de tussenkoppen, plaatjes in twee maten
  res = await request("GET", "/beheer/uitleg/de-planning-bijhouden");
  assert.equal(res.status, 200);
  assert.match(res.text, /<nav class="toc"/);
  assert.match(res.text, /<a href="#een-periode-toevoegen">Een periode toevoegen<\/a>/);
  assert.match(res.text, /<h2 id="een-periode-toevoegen">/);
  assert.match(res.text, /<img class="shot-mob" src="\/beheer\/static\/uitleg\/periode.png"/);
  assert.match(res.text, /<img class="shot-lap" src="\/beheer\/static\/uitleg\/periode-laptop.png"/);
  assert.match(res.text, /data-shot-switch/);
  assert.match(res.text, /href="\/beheer\/uitleg\/antwoorden-en-vertalen"/, "vorige hoofdstuk");
  assert.match(res.text, /href="\/beheer\/uitleg\/als-iets-niet-lukt"/, "volgende hoofdstuk");

  // tipblokken en de plaatjes worden echt geserveerd
  res = await request("GET", "/beheer/uitleg/inloggen");
  assert.match(res.text, /<p class="tip">/);
  assert.equal((await request("GET", "/beheer/static/uitleg/inloggen.png")).status, 200);

  // alles achter elkaar, met een afdrukknop
  res = await request("GET", "/beheer/uitleg/alles");
  assert.equal(res.status, 200);
  assert.match(res.text, /data-print/);
  assert.equal((res.text.match(/class="card prose chapter"/g) || []).length, 8);
  assert.match(res.text, /id="h8"/);

  // onbekend hoofdstuk gaat terug naar het overzicht
  assert.equal((await request("GET", "/beheer/uitleg/bestaat-niet")).location, "/beheer/uitleg");

  // en vanaf Hulp is de uitleg te vinden
  assert.match((await request("GET", "/beheer/hulp")).text, /href="\/beheer\/uitleg"/);
});

test("de app: uitnodiging op de kalender, eigen scherm, en 'niet nu'", async () => {
  let res = await request("GET", "/beheer");
  assert.match(res.text, /data-app-invite/);
  assert.match(res.text, /Zet het beheer op je beginscherm/);

  res = await request("GET", "/beheer/hulp");
  assert.match(res.text, /href="\/beheer\/app"/);

  res = await request("GET", "/beheer/app?van=kalender");
  assert.equal(res.status, 200);
  assert.match(res.text, /data-app-install/);
  assert.match(res.text, /Zet op beginscherm/); // de iPhone-stap
  assert.match(res.text, /App installeren/); // de Android-stap
  assert.match(res.text, /zes cijfers/); // de losse koekjespot op de iPhone
  assert.match(res.text, /href="\/beheer"/); // Terug naar de kalender

  // Wegklikken houdt een jaar stand, op dit toestel.
  res = await request("POST", "/beheer/app/niet-nu");
  assert.equal(res.location, "/beheer");
  assert.equal(jar.tl_app_gezien, "1");
  res = await request("GET", "/beheer");
  assert.doesNotMatch(res.text, /data-app-invite/);
  // Maar de vaste plek onder Hulp blijft.
  assert.match((await request("GET", "/beheer/hulp")).text, /href="\/beheer\/app"/);
});

test("hulp, back-up en uitloggen", async () => {
  let res = await request("GET", "/beheer/hulp");
  assert.match(res.text, /Een aanvraag beantwoorden/);
  res = await request("GET", "/beheer/backup.json");
  assert.equal(res.status, 200);
  const snap = JSON.parse(res.text);
  assert.equal(snap.periods.length, 4);
  assert.equal(snap.requests.length, 1);
  assert.equal(snap.messages.length, 1);

  res = await request("POST", "/beheer/uitloggen");
  assert.equal(res.location, "/beheer/inloggen");
  assert.equal(jar.tl_sessie, undefined);
  assert.equal((await request("GET", "/beheer")).location, "/beheer/inloggen");
});


