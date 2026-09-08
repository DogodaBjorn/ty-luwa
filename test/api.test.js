// Integratietest op de echte app: een verse DATA_DIR, mail naar de console.
// Vereist een gebouwde site (npm run build); de workflow doet dat vóór npm test.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tyluwa-"));
process.env.DATA_DIR = dir;
process.env.MAIL_PROVIDER = "console";
process.env.MAIL_NOTIFY = "ouders@example.nl";
process.env.RATE_MAX = "100";

const built = fs.existsSync(path.join(__dirname, "..", "public", "nl", "beschikbaarheid.html"));

const logged = [];
const origLog = console.log;
console.log = (...a) => logged.push(a.join(" "));
const app = require("../Server.js");
console.log = origLog;

const dates = require("../lib/dates");
const today = dates.today("Europe/Paris");
const arrival = dates.addDays(today, 30);
const departure = dates.addDays(today, 37);

// fetch (undici) negeert een eigen Host-header; http.request niet, en de
// host bepaalt hier de taal.
const http = require("http");
function request(method, urlPath, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request(
      { host: "127.0.0.1", port: server.address().port, method, path: urlPath, headers },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (text += c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: { get: (k) => res.headers[k.toLowerCase()] },
            text: async () => text,
            json: async () => JSON.parse(text),
          })
        );
      }
    );
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

let server;
test.before(async () => {
  await new Promise((r) => (server = app.listen(0, r)));
});
test.after(() => server.close());

const post = (body, headers = {}) =>
  request("POST", "/api/aanvraag", {
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", Host: "ty-luwa.fr", ...headers },
    body: new URLSearchParams(body).toString(),
  });

const good = { lang: "fr", arrival, departure, adults: "2", children: "1", name: "Marie Dupont", email: "marie@example.fr", message: "Bonjour" };

test("kalender staat in de pagina", { skip: !built && "site niet gebouwd" }, async () => {
  const res = await request("GET", "/disponibilites", { headers: { Host: "ty-luwa.fr" } });
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<table class="cal" data-month="/);
  assert.doesNotMatch(html, /tl:calendar/);
});

test("aanvraag versturen: opgeslagen, twee mails, daarna dubbel genegeerd", { skip: !built && "site niet gebouwd" }, async () => {
  logged.length = 0;
  const res = await post(good);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.match(data.message, /Luuk et Wanda/);
  const mails = logged.filter((l) => l.includes("--- MAIL"));
  assert.equal(mails.length, 2);
  assert.match(mails[0], /Aan: ouders@example.nl/);
  assert.match(mails[0], /Nieuwe aanvraag: Marie Dupont/);
  assert.match(mails[1], /Aan: marie@example.fr/);
  assert.match(mails[1], /Bonjour Marie Dupont,/);
  assert.match(mails[1], /7 nuits/);
  assert.match(mails[1], /2 adultes \+ 1 enfant/);

  logged.length = 0;
  const again = await post(good);
  assert.equal((await again.json()).ok, true);
  assert.equal(logged.filter((l) => l.includes("--- MAIL")).length, 0, "geen tweede mail");
});

test("fouten komen terug in de taal van de pagina", { skip: !built && "site niet gebouwd" }, async () => {
  let res = await post({ ...good, lang: "de", adults: "5", children: "3", email: "x@example.de" });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { ok: false, code: "tooMany", message: "Ty LuWa hat Platz für höchstens 6 Gäste." });

  res = await post({ ...good, lang: "nl", arrival: dates.addDays(today, 40), departure: dates.addDays(today, 41), email: "p@example.nl", name: "Piet" });
  // overlapt met de aanvraag hierboven? Nee: die is nog geen periode. Wel als we er een periode van maken.
  assert.equal(res.status, 200);
});

test("bezette nachten worden geweigerd", { skip: !built && "site niet gebouwd" }, async () => {
  const { open } = require("../lib/db");
  const { createStore } = require("../lib/store");
  const store = createStore(open(path.join(dir, "ty-luwa.sqlite")));
  store.createPeriod({ arrival: dates.addDays(today, 60), departure: dates.addDays(today, 63), kind: "own" });
  const res = await post({ ...good, lang: "en", arrival: dates.addDays(today, 62), departure: dates.addDays(today, 65), email: "j@example.com", name: "John Doe" });
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, "occupied");
  assert.match(data.message, /already taken \(from /);
  // de vertrekdag van de periode is een geldige aankomstdag
  const ok = await post({ ...good, lang: "en", arrival: dates.addDays(today, 63), departure: dates.addDays(today, 65), email: "j2@example.com", name: "Jane Doe" });
  assert.equal(ok.status, 200);
});

test("juli van Siblu wordt geweigerd met verwijzing, en staat roze in de kalender", { skip: !built && "site niet gebouwd" }, async () => {
  const { open } = require("../lib/db");
  const { createStore } = require("../lib/store");
  const store = createStore(open(path.join(dir, "ty-luwa.sqlite")));
  const y = Number(today.slice(0, 4)) + 1;
  store.createPeriod({ arrival: `${y}-07-01`, departure: `${y}-08-01`, kind: "siblu" });
  const res = await post({ ...good, lang: "fr", arrival: `${y}-07-10`, departure: `${y}-07-17`, email: "s@example.fr", name: "Sophie Martin" });
  assert.equal(res.status, 409);
  const data = await res.json();
  assert.equal(data.code, "siblu");
  assert.match(data.message, /leconguel\.fr/);
  const page = await request("GET", "/disponibilites", { headers: { Host: "ty-luwa.fr" } });
  const html = await page.text();
  assert.match(html, new RegExp(`class="cal-day is-busy kind-siblu" data-date="${y}-07-15"`));
  assert.match(html, /<a href="https:\/\/leconguel.fr\/" target="_blank" rel="noopener">Peut-être réservable via Siblu<\/a>/);
});

test("zonder JavaScript: redirect na versturen, pagina met melding bij fout", { skip: !built && "site niet gebouwd" }, async () => {
  const res = await post({ ...good, lang: "nl", email: "q@example.nl", arrival: dates.addDays(today, 90), departure: dates.addDays(today, 92) }, { Accept: "text/html", Host: "ty-luwa.nl" });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "/beschikbaarheid?verzonden=1#melding");
  const page = await request("GET", "/beschikbaarheid?verzonden=1", { headers: { Host: "ty-luwa.nl" } });
  assert.match(await page.text(), /form-status is-sent[^>]*>Je aanvraag is verstuurd/);

  const bad = await post({ ...good, lang: "nl", adults: "0" }, { Accept: "text/html", Host: "ty-luwa.nl" });
  assert.equal(bad.status, 400);
  assert.match(await bad.text(), /form-status is-error[^>]*>Minstens één volwassene\./);
});

test("honeypot en onbekende host", async () => {
  const bot = await post({ ...good, website: "http://spam", email: "bot@example.com" });
  assert.equal((await bot.json()).ok, true);
  const evil = await post(good, { Host: "evil.example" });
  assert.equal(evil.status, 404);
});
