#!/usr/bin/env node
// Controleert wat de feestdagenbronnen teruggeven. Draai dit vanaf een plek
// met internet (je eigen machine, of Kudu SSH op de App Service):
//
//   node scripts/holidays-check.js            toont per land wat er binnenkomt
//   DATA_DIR=/home/data node scripts/holidays-check.js --save   zet het meteen in de database
//
// Bronnen: openholidaysapi.org (NL, FR, DE) en gov.uk (EN). Geen sleutel nodig.

const path = require("path");
const { createHolidaySource, COUNTRIES } = require("../lib/holidays");

const save = process.argv.includes("--save");
const year = Number(process.argv.find((a) => /^\d{4}$/.test(a))) || new Date().getUTCFullYear();

(async () => {
  const source = createHolidaySource();
  let store = null;
  if (save) {
    const config = require("../lib/config").load();
    const db = require("../lib/db").open(path.join(config.dataDir, "ty-luwa.sqlite"));
    store = require("../lib/store").createStore(db);
    console.log(`Opslaan in ${path.join(config.dataDir, "ty-luwa.sqlite")}\n`);
  }

  let failed = 0;
  for (const country of COUNTRIES) {
    for (const y of [year, year + 1]) {
      try {
        const rows = await source.fetchYear(country, y);
        const pub = rows.filter((r) => r.kind === "public");
        const school = rows.filter((r) => r.kind === "school");
        console.log(`${country} ${y}: ${pub.length} feestdagen, ${school.length} vakanties`);
        for (const r of [...pub.slice(0, 3), ...school.slice(0, 2)]) {
          const where = r.nationwide ? "landelijk" : r.regions.join(", ") || "regionaal";
          console.log(`   ${r.startDate}${r.endDate !== r.startDate ? ` t/m ${r.endDate}` : ""}  ${r.name} (${where})`);
        }
        if (store) store.replaceHolidays(country, y, rows);
      } catch (e) {
        failed++;
        console.error(`${country} ${y}: MISLUKT — ${e.message}`);
      }
    }
  }
  if (store) store.setMeta("holidays_synced", new Date().toISOString().slice(0, 10));
  process.exit(failed ? 1 : 0);
})();
