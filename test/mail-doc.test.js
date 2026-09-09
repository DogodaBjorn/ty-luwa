// Wat elke mail moet halen, ongeacht de inhoud: geen ontsnapte invoer, een
// opmaak die Outlook aankan, en dezelfde feiten in de tekst- en de
// opgemaakte versie.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const b = require("../lib/mail-doc");
const { renderHtml, COLORS } = require("../lib/mail-html");
const { renderText } = require("../lib/mail-text");
const texts = require("../lib/mail-texts");
const content = require("../content/site-content.json");

const EVIL = 'Sophie <script>alert("x")</script> & "co" \'t';
const REQ = {
  id: 412, name: EVIL, email: "sophie@voorbeeld.fr", lang: "fr", host: "ty-luwa.fr",
  arrival: "2027-07-10", departure: "2027-07-17", adults: 2, children: 2,
  message: "Bonjour,\n\nnous venons avec deux <enfants> & un chien.", created_at: "2026-09-09T14:38:00.000Z",
};
const HIGHLIGHTS = [
  { key: "kalender", tone: "calm", title: "In de kalender is deze periode vrij", lines: ["Er staat niets voor deze nachten."] },
  { key: "vakanties", tone: "info", title: "Feestdagen en schoolvakanties", lines: ["Per land."], rows: [{ label: "Frankrijk", value: "Vacances d'été: alle 7 nachten" }] },
];

const ALL = () => [
  texts.notify(REQ, { beheerUrl: "https://ty-luwa.nl/beheer", highlights: HIGHLIGHTS, messageNl: "Hallo, we komen met twee kinderen." }),
  texts.notify({ ...REQ, message: "", lang: "nl", host: "ty-luwa.nl" }, { beheerUrl: "https://ty-luwa.nl/beheer", highlights: [] }),
  ...["nl", "fr", "en", "de"].map((lang) => texts.receipt({ ...REQ, lang }, content)),
  texts.reply(REQ, { nl: "Ja hoor, die week is vrij.", translated: "Oui, cette semaine est libre." }),
  texts.reply({ ...REQ, lang: "nl" }, { nl: "Ja hoor, die week is vrij.", translated: null }),
  texts.login({ code: "373312", link: "https://ty-luwa.nl/beheer/inloglink/abc" }),
  texts.backup({ periods: 3, requests: 2, when: "2026-09-09T03:00:00.000Z" }),
];

test("geen invoer ontsnapt uit de opmaak", () => {
  for (const m of ALL()) {
    assert.ok(!m.html.includes("<script>"), "letterlijke scripttag");
    assert.ok(m.html.includes("&lt;") || !m.html.includes("<enfants>"));
    assert.ok(!/ on\w+=/.test(m.html), "geen event-handlers");
    assert.ok(!m.html.includes("javascript:"));
  }
  const m = texts.notify(REQ, { beheerUrl: "https://ty-luwa.nl/beheer", highlights: [] });
  assert.ok(m.html.includes("&lt;script&gt;"), "de naam staat er wel, maar onschadelijk");
});

test("opmaak die Outlook aankan", () => {
  for (const m of ALL()) {
    assert.match(m.html, /^<!doctype html>/i);
    assert.equal((m.html.match(/<html /g) || []).length, 1);
    const tables = (m.html.match(/<table/g) || []).length;
    const marked = (m.html.match(/<table[^>]*role="presentation"/g) || []).length;
    assert.equal(tables, marked, "elke tabel is opmaak, geen gegevens");
    assert.ok(!/<div[^>]*style="[^"]*padding/.test(m.html), "padding hoort op td");
    assert.ok(!/display:\s*(flex|grid)|background-image|position:\s*(absolute|fixed)/.test(m.html));
    assert.ok(!/<style/.test(m.html.split("</head>")[1] || ""), "stijlen alleen in de head");
    assert.match(m.html, /mso-line-height-rule:exactly/);
    assert.match(m.html, /content="light only"/);
    assert.ok(m.html.length < 60000, `mail is ${m.html.length} tekens; Gmail knipt rond 102 kB`);
  }
});

test("tekst en opmaak dragen dezelfde feiten", () => {
  for (const m of ALL()) {
    const plain = m.html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");
    for (const value of b.factValues(m.doc)) {
      for (const line of String(value).split("\n")) {
        const needle = line.replace(/\s+/g, " ").trim();
        if (!needle) continue;
        assert.ok(m.text.replace(/\s+/g, " ").includes(needle), `tekst mist "${needle}"`);
        assert.ok(plain.includes(needle), `opmaak mist "${needle}"`);
      }
    }
  }
});

test("de knop en de link staan in beide versies", () => {
  const m = texts.notify(REQ, { beheerUrl: "https://ty-luwa.nl/beheer", highlights: [] });
  assert.ok(m.text.includes("https://ty-luwa.nl/beheer/aanvraag/412"));
  assert.ok(m.html.includes("https://ty-luwa.nl/beheer/aanvraag/412"));
});

test("alleen adressen waar we zelf op uitkomen", () => {
  assert.equal(b.safeHref("https://ty-luwa.nl/x"), "https://ty-luwa.nl/x");
  assert.equal(b.safeHref("mailto:a@b.nl"), "mailto:a@b.nl");
  assert.equal(b.safeHref("http://localhost:8080/beheer"), "http://localhost:8080/beheer");
  assert.equal(b.safeHref("javascript:alert(1)"), null);
  assert.equal(b.safeHref("http://elders.example/x"), null);
  const doc = b.doc({ title: "x", blocks: [b.button({ href: "javascript:alert(1)", label: "Kwaad" })] });
  assert.ok(!renderHtml(doc).includes("Kwaad"), "een onveilige knop verdwijnt");
});

test("eerlijk blijven: geen boeking, wel de merkregel", () => {
  for (const lang of ["nl", "fr", "en", "de"]) {
    const m = texts.receipt({ ...REQ, lang }, content);
    const note = content[lang].availability.note.replace(/\s+/g, " ");
    assert.ok(m.text.replace(/\s+/g, " ").includes(note), `${lang}: de regel over geen automatische boeking`);
    assert.ok(m.html.replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/\s+/g, " ").includes(note));
    assert.match(m.html, new RegExp(`lang="${lang}"`));
  }
  const n = texts.notify(REQ, { beheerUrl: "https://ty-luwa.nl/beheer", highlights: [] });
  assert.match(n.text, /nog geen boeking/);
  assert.match(n.html, /lang="nl"/);
  assert.match(n.html, /lang="fr"/, "het bericht van de gast houdt zijn eigen taal");
});

test("de kleuren blijven gelijk aan de site", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "assets", "site.css"), "utf8");
  const value = (name) => (new RegExp(`--${name}:\\s*(#[0-9a-f]{3,8})`, "i").exec(css) || [])[1];
  for (const [token, key] of [["navy", "navy"], ["sea", "sea"], ["sand", "sand"], ["cream", "cream"], ["ink", "ink"], ["line", "line"], ["sage-ink", "sageInk"], ["sand-tint", "sandTint"], ["sea-ink", "seaInk"]]) {
    assert.equal(COLORS[key], value(token), `--${token} loopt uit de pas`);
  }
});

test("lege en rare invoer breekt niets", () => {
  const leeg = texts.notify({ ...REQ, message: "", children: 0, adults: 1, created_at: null }, { beheerUrl: "https://ty-luwa.nl/beheer" });
  assert.match(leeg.text, /Geen bericht erbij/);
  assert.match(leeg.text, /1 volwassene\b/);
  assert.ok(!leeg.text.includes("Binnengekomen"));

  const lang = texts.reply({ ...REQ, lang: "xx" }, { nl: "Hoi", translated: null });
  assert.match(lang.html, /lang="en"/, "onbekende taal valt terug op Engels");

  const jaren = texts.notify({ ...REQ, arrival: "2027-10-28", departure: "2027-11-04" }, { beheerUrl: "https://ty-luwa.nl/beheer" });
  assert.match(jaren.text, /28 oktober t\/m .*4 november 2027/);
});

test("de tekstversie leest als een mail, niet als een dump", () => {
  const m = texts.notify(REQ, { beheerUrl: "https://ty-luwa.nl/beheer", highlights: HIGHLIGHTS, messageNl: "Hallo" });
  const lines = m.text.split("\n");
  assert.ok(lines.every((l) => l.length <= 78), "regels blijven leesbaar smal");
  assert.ok(m.text.includes("\n\n"), "er staan lege regels tussen de blokken");
  assert.match(m.text, /^NIEUWE AANVRAAG/m);
  assert.match(m.text, /^-{10,}$/m, "een streep tussen de mail en de bijzonderheden");
});
