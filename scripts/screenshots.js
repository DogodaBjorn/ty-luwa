#!/usr/bin/env node
// Maakt de schermafbeeldingen voor de uitleg (/beheer/uitleg). Start de site
// met een tijdelijke database en verzonnen voorbeeldgegevens, loopt de
// schermen langs en zet de plaatjes in assets/beheer/uitleg/.
//
//   npm install --no-save playwright     (eenmalig; en npx playwright install chromium)
//   node scripts/screenshots.js
//
// De plaatjes staan in git: ze veranderen alleen als het ontwerp verandert.
// Er staan geen echte gastgegevens in — alles hieronder is verzonnen.

const fs = require("fs");
const os = require("os");
const path = require("path");

const OUT = path.join(__dirname, "..", "assets", "beheer", "uitleg");
const PHONE = { width: 390, height: 844 };

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tyluwa-shots-"));
process.env.DATA_DIR = dir;
process.env.MAIL_PROVIDER = "console";
process.env.BEHEER_EMAILS = "uitleg@voorbeeld.nl";
process.env.RATE_MAX = "999";
process.env.TRANSLATOR_KEY = process.env.TRANSLATOR_KEY || "";

const logged = [];
const realLog = console.log;
console.log = (...a) => logged.push(a.join(" "));

const app = require("../Server.js");
const dates = require("../lib/dates");
const season = require("../lib/season");
const { createStore } = require("../lib/store");
const { open } = require("../lib/db");

console.log = realLog;

const store = createStore(open(path.join(dir, "ty-luwa.sqlite")));
const today = dates.today("Europe/Paris");
const ym = season.nextOpenMonth(dates.addMonths(dates.monthOf(today), 1));
const d = (n) => dates.addDays(`${ym}-01`, n);

// Voorbeeldgegevens: verzonnen namen, geen echte gasten.
store.createPeriod({ arrival: d(4), departure: d(11), kind: "rented", guestName: "Familie de Vries", guestPhone: "06 12 34 56 78", notes: "Komen met twee kinderen." });
store.createPeriod({ arrival: d(17), departure: d(24), kind: "option", guestName: "Famille Martin" });
store.createPeriod({ arrival: d(25), departure: d(28), kind: "own", notes: "Zelf een paar dagen." });
store.replaceHolidays("NL", Number(ym.slice(0, 4)), [
  { kind: "public", startDate: d(5), endDate: d(5), name: "Hemelvaartsdag", nationwide: true, regions: [] },
  { kind: "school", startDate: d(1), endDate: d(9), name: "Meivakantie", nationwide: false, regions: ["Noord", "Midden"] },
]);
const req = store.createRequest({
  arrival: d(14), departure: d(21), adults: 2, children: 2,
  name: "Sophie Martin", email: "sophie@voorbeeld.fr", lang: "fr",
  message: "Bonjour, nous venons avec deux enfants. Est-ce que le lave-vaisselle fonctionne ?",
  host: "ty-luwa.fr",
});
store.setRequestMessageNl(req.id, "Hallo, we komen met twee kinderen. Werkt de vaatwasser?");

let playwright;
try {
  playwright = require("playwright");
} catch {
  console.error("Playwright ontbreekt. Draai eerst:\n  npm install --no-save playwright\n  npx playwright install chromium");
  process.exit(1);
}

(async () => {
  const server = await new Promise((r) => {
    const s = app.listen(0, () => r(s));
  });
  const base = `http://localhost:${server.address().port}`;
  const launch = {};
  if (fs.existsSync("/opt/pw-browsers/chromium")) launch.executablePath = "/opt/pw-browsers/chromium";
  const browser = await playwright.chromium.launch(launch);
  const page = await browser.newPage({ viewport: PHONE });
  const shot = async (name, selector) => {
    const target = selector ? page.locator(selector).first() : page;
    await target.screenshot({ path: path.join(OUT, `${name}.png`) });
    realLog(`  ${name}.png`);
  };

  realLog("Publieke site:");
  await page.goto(`${base}/nl/`, { waitUntil: "domcontentloaded" });
  await shot("publiek-home");
  await page.goto(`${base}/nl/beschikbaarheid`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".cal-block.is-paged");
  const months = await page.locator(".cal-month").evaluateAll((els) => els.map((e) => e.dataset.month));
  for (let i = 0; i < Math.max(0, months.indexOf(ym)); i++) await page.click("[data-cal-next]");
  await shot("publiek-kalender", ".cal-block");
  await page.locator("[data-request-form]").scrollIntoViewIfNeeded();
  await shot("publiek-formulier", "[data-request-form]");

  realLog("Beheer:");
  await page.goto(`${base}/beheer/inloggen`, { waitUntil: "domcontentloaded" });
  await shot("inloggen", "main");
  await page.fill("#email", "uitleg@voorbeeld.nl");
  await page.click("button[type=submit]");
  await page.waitForSelector("#code");
  const code = /^\s{4}(\d{6})$/m.exec(logged.join("\n"))[1];
  await page.fill("#code", code);
  await page.click("button[type=submit]");
  await page.waitForSelector(".month");
  await page.goto(`${base}/beheer?m=${ym}`, { waitUntil: "domcontentloaded" });
  await shot("beheer-kalender", "main");

  await page.goto(`${base}/beheer/periode/nieuw`, { waitUntil: "domcontentloaded" });
  await page.click("label.tile.kind-rented");
  await page.fill("#arrival", d(4));
  await page.dispatchEvent("#arrival", "change");
  await page.fill("#guestName", "Familie Bakker");
  await shot("periode", "main");
  await page.click("form[data-period-form] button[type=submit]");
  await page.waitForSelector(".flash.overlap, .flash-ok");
  if (await page.locator(".flash.overlap").count()) await shot("overlap", "main");

  await page.goto(`${base}/beheer/periode/1/verwijderen`, { waitUntil: "domcontentloaded" });
  await shot("verwijderen", "main");

  await page.goto(`${base}/beheer/aanvragen`, { waitUntil: "domcontentloaded" });
  await shot("aanvragen", "main");
  await page.goto(`${base}/beheer/aanvraag/${req.id}`, { waitUntil: "domcontentloaded" });
  await shot("aanvraag", "main");
  await page.fill("#reply", "Ja, die week is nog vrij. Wat leuk dat jullie met de kinderen komen! De vaatwasser doet het prima.");
  await page.click(".reply button[type=submit]");
  await page.waitForSelector(".preview, .flash-warn");
  await shot("antwoord", "main");

  // De meldingsmail als plaatje: de tekst uit de log in een simpel kaartje.
  const mail = logged.filter((l) => l.includes("Nieuwe aanvraag")).pop() || "";
  const body = mail.split("\n").filter((l) => !l.startsWith("---")).join("\n");
  const mailPage = await browser.newPage({ viewport: { width: 780, height: 620 } });
  await mailPage.setContent(
    `<body style="margin:0;background:#faf7f1;font-family:system-ui,sans-serif">
      <div style="margin:24px;background:#fff;border:1px solid #e7e1d7;border-radius:14px;padding:22px">
        <p style="margin:0 0 12px;color:#6a7477;font-size:14px">Van: Ty LuWa &lt;DoNotReply@ty-luwa.nl&gt;</p>
        <pre style="margin:0;white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#2e3436">${body
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")}</pre>
      </div>
    </body>`
  );
  await mailPage.screenshot({ path: path.join(OUT, "mail-melding.png") });
  realLog("  mail-melding.png");

  await browser.close();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  realLog(`\nKlaar. ${fs.readdirSync(OUT).filter((f) => f.endsWith(".png")).length} plaatjes in assets/beheer/uitleg/`);
  process.exit(0);
})().catch((e) => {
  console.error("Mislukt:", e.message);
  process.exit(1);
});
