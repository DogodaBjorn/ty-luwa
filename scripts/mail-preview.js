#!/usr/bin/env node
// Alle mails bekijken zonder mailclient. Rendert elke variant naar HTML in
// MAIL_DEBUG_DIR (standaard een tijdelijke map) en maakt er, als Playwright
// beschikbaar is, plaatjes van op telefoon- en laptopbreedte, ook in donkere
// modus.
//
//   npm install --no-save playwright && npx playwright install chromium
//   node scripts/mail-preview.js [uitvoermap]
//
// Let op: dit is Chromium. Over Outlook op Windows zegt het niets; daarvoor
// stuur je jezelf één keer een echte testaanvraag en kijk je in je mailbox.

const fs = require("fs");
const os = require("os");
const path = require("path");

const out = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "tyluwa-mail-"));
fs.mkdirSync(out, { recursive: true });

const texts = require("../lib/mail-texts");
const content = require("../content/site-content.json");
const dates = require("../lib/dates");
const season = require("../lib/season");
const { open } = require("../lib/db");
const { createStore } = require("../lib/store");
const { loadContext, collectHighlights } = require("../lib/highlights");

// Verzonnen voorbeeldgegevens; geen echte gasten.
const store = createStore(open(":memory:"));
const today = dates.today();
const ym = season.nextOpenMonth(dates.addMonths(dates.monthOf(today), 9));
const d = (n) => dates.addDays(`${ym}-01`, n);
const year = Number(ym.slice(0, 4));

store.replaceHolidays("FR", year, [
  { kind: "school", startDate: d(2), endDate: d(40), name: "Vacances d'été", nationwide: true, regions: [] },
  { kind: "public", startDate: d(6), endDate: d(6), name: "Fête nationale", nationwide: true, regions: [] },
]);
store.replaceHolidays("NL", year, [
  { kind: "school", startDate: d(3), endDate: d(45), name: "Zomervakantie", nationwide: false, regions: ["Noord"] },
]);
store.replaceHolidays("DE", year, []);
store.replaceHolidays("EN", year, []);
store.createPeriod({ arrival: d(-7), departure: d(0), kind: "rented", guestName: "Familie de Vries" });

const req = store.createRequest({
  arrival: d(0), departure: d(7), adults: 2, children: 2,
  name: "Sophie Martin", email: "sophie@voorbeeld.fr", lang: "fr", host: "ty-luwa.fr",
  message: "Bonjour,\n\nnous venons avec deux enfants et un chien. Le lave-vaisselle fonctionne-t-il bien ?",
});
store.setRequestMessageNl(req.id, "Hallo,\n\nwe komen met twee kinderen en een hond. Werkt de vaatwasser goed?");
store.createRequest({
  arrival: d(1), departure: d(8), adults: 4, name: "Familie Jansen", email: "jansen@voorbeeld.nl", lang: "nl",
});

const saved = store.getRequest(req.id);
const beheerUrl = "https://ty-luwa.nl/beheer";
const highlights = collectHighlights(loadContext(store, saved, today));

const variants = [
  ["melding-vol", texts.notify(saved, { beheerUrl, highlights, messageNl: saved.message_nl })],
  ["melding-kaal", texts.notify({ ...saved, message: "", lang: "nl", host: "ty-luwa.nl" }, { beheerUrl, highlights: highlights.slice(0, 1) })],
  ["melding-zonder-vertaling", texts.notify(saved, { beheerUrl, highlights, messageNl: null })],
  ...["nl", "fr", "en", "de"].map((lang) => [`bevestiging-${lang}`, texts.receipt({ ...saved, lang }, content)]),
  ["antwoord-frans", texts.reply(saved, { nl: "Ja hoor, die week is nog vrij. Wat leuk dat jullie met de kinderen komen!", translated: "Oui, cette semaine est encore libre. Quel plaisir de vous accueillir avec les enfants !" })],
  ["antwoord-nederlands", texts.reply({ ...saved, lang: "nl" }, { nl: "Ja hoor, die week is nog vrij.", translated: null })],
  ["inloggen", texts.login({ code: "373312", link: "https://ty-luwa.nl/beheer/inloglink/voorbeeld" })],
  ["backup", texts.backup({ periods: 12, requests: 5, when: new Date().toISOString() })],
];

for (const [name, m] of variants) {
  fs.writeFileSync(path.join(out, `${name}.html`), m.html);
  fs.writeFileSync(path.join(out, `${name}.txt`), `Onderwerp: ${m.subject}\n\n${m.text}`);
}
console.log(`${variants.length} mails in ${out}`);
console.log(variants.map(([n, m]) => `  ${n.padEnd(26)} ${(m.html.length / 1024).toFixed(1)} kB  ${m.subject}`).join("\n"));

let playwright = null;
try {
  playwright = require("playwright");
} catch {
  console.log("\nPlaywright ontbreekt; alleen de HTML-bestanden zijn gemaakt.");
  console.log("  npm install --no-save playwright && npx playwright install chromium");
  process.exit(0);
}

(async () => {
  const launch = {};
  if (fs.existsSync("/opt/pw-browsers/chromium")) launch.executablePath = "/opt/pw-browsers/chromium";
  const browser = await playwright.chromium.launch(launch);
  for (const [scheme, suffix] of [["light", ""], ["dark", "-donker"]]) {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    for (const [width, size] of [[390, "telefoon"], [800, "laptop"]]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [name] of variants) {
        await page.goto(`file://${path.join(out, `${name}.html`)}`, { waitUntil: "domcontentloaded" });
        await page.screenshot({ path: path.join(out, `${name}-${size}${suffix}.png`), fullPage: true });
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`\nPlaatjes ook in ${out} (telefoon en laptop, licht en donker).`);
})();
