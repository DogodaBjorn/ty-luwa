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
const LAPTOP = { width: 1100, height: 800 };

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
  // Twee opnames van elk scherm: één zoals het op een telefoon staat en één
  // zoals het op een laptop staat. De uitleg toont de juiste (of die je kiest).
  // Eén context, twee pagina's: zo delen ze de sessie en hoeft er maar één
  // keer ingelogd te worden.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize(PHONE);
  const wide = await context.newPage();
  await wide.setViewportSize(LAPTOP);
  let lastUrl = null;
  const shot = async (name, selector) => {
    const target = selector ? page.locator(selector).first() : page;
    await target.screenshot({ path: path.join(OUT, `${name}.png`) });
    if (lastUrl) {
      await wide.goto(lastUrl, { waitUntil: "domcontentloaded" });
      const w = selector ? wide.locator(selector).first() : wide;
      await w.screenshot({ path: path.join(OUT, `${name}-laptop.png`) });
    }
    realLog(`  ${name}.png + -laptop`);
  };
  const open = async (url, waitFor) => {
    lastUrl = url;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    if (waitFor) await page.waitForSelector(waitFor);
  };
  /** Schermen die pas na klikken verschijnen: dezelfde stappen op beide maten. */
  const shotSteps = async (name, selector, steps) => {
    for (const [target, suffix] of [[page, ""], [wide, "-laptop"]]) {
      await steps(target);
      await target.locator(selector).first().screenshot({ path: path.join(OUT, `${name}${suffix}.png`) });
    }
    realLog(`  ${name}.png + -laptop`);
  };

  realLog("Publieke site:");
  await open(`${base}/nl/`);
  await shot("publiek-home");
  await open(`${base}/nl/beschikbaarheid`, ".cal-block.is-paged");
  const months = await page.locator(".cal-month").evaluateAll((els) => els.map((e) => e.dataset.month));
  for (let i = 0; i < Math.max(0, months.indexOf(ym)); i++) await page.click("[data-cal-next]");
  await shot("publiek-kalender", ".cal-block");
  await page.locator("[data-request-form]").scrollIntoViewIfNeeded();
  await shot("publiek-formulier", "[data-request-form]");

  realLog("Beheer:");
  await open(`${base}/beheer/inloggen`);
  await shot("inloggen", "main");
  await page.fill("#email", "uitleg@voorbeeld.nl");
  await page.click("button[type=submit]");
  await page.waitForSelector("#code");
  const code = /^\s{4}(\d{6})$/m.exec(logged.join("\n"))[1];
  await page.fill("#code", code);
  await page.click("button[type=submit]");
  await page.waitForSelector(".month");
  await open(`${base}/beheer?m=${ym}`);
  await shot("beheer-kalender", "main");

  await open(`${base}/beheer/periode/nieuw`);
  await page.click("label.tile.kind-rented");
  await page.fill("#arrival", d(4));
  await page.dispatchEvent("#arrival", "change");
  await page.fill("#guestName", "Familie Bakker");
  await shot("periode", "main");

  await shotSteps("overlap", "main", async (target) => {
    await target.goto(`${base}/beheer/periode/nieuw`, { waitUntil: "domcontentloaded" });
    await target.click("label.tile.kind-rented");
    await target.fill("#arrival", d(4));
    await target.dispatchEvent("#arrival", "change");
    await target.fill("#guestName", "Familie Bakker");
    await target.click("form[data-period-form] button[type=submit]");
    await target.waitForSelector(".flash.overlap, .flash-ok");
  });

  await open(`${base}/beheer/periode/1/verwijderen`);
  await shot("verwijderen", "main");

  await open(`${base}/beheer/aanvragen`);
  await shot("aanvragen", "main");
  await open(`${base}/beheer/aanvraag/${req.id}`);
  await shot("aanvraag", "main");

  await shotSteps("antwoord", "main", async (target) => {
    await target.goto(`${base}/beheer/aanvraag/${req.id}`, { waitUntil: "domcontentloaded" });
    await target.fill("#reply", "Ja, die week is nog vrij. Wat leuk dat jullie met de kinderen komen! De vaatwasser doet het prima.");
    await target.click(".reply button[type=submit]");
    await target.waitForSelector(".preview, .flash-warn");
  });

  // De meldingsmail zelf, precies zoals hij verstuurd wordt.
  realLog("Mail:");
  const texts = require("../lib/mail-texts");
  const { loadContext, collectHighlights } = require("../lib/highlights");
  const mail = texts.notify(store.getRequest(req.id), {
    beheerUrl: "https://ty-luwa.nl/beheer",
    highlights: collectHighlights(loadContext(store, store.getRequest(req.id), today)),
    messageNl: store.getRequest(req.id).message_nl,
  });
  for (const [size, suffix] of [[PHONE, ""], [LAPTOP, "-laptop"]]) {
    const mp = await context.newPage();
    await mp.setViewportSize({ width: size.width, height: size.height });
    await mp.setContent(mail.html, { waitUntil: "domcontentloaded" });
    await mp.screenshot({ path: path.join(OUT, `mail-melding${suffix}.png`), fullPage: true });
    await mp.close();
  }
  realLog("  mail-melding.png + -laptop");

  await browser.close();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  realLog(`\nKlaar. ${fs.readdirSync(OUT).filter((f) => f.endsWith(".png")).length} plaatjes in assets/beheer/uitleg/`);
  process.exit(0);
})().catch((e) => {
  console.error("Mislukt:", e.message);
  process.exit(1);
});
