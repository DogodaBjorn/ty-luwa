#!/usr/bin/env node
// Zet een snapshot (uit DATA_DIR/backups of uit de wekelijkse back-upmail)
// terug in de database. Vervangt de planning en de aanvragen; sessies blijven.
//
//   DATA_DIR=/home/data node scripts/restore.js /home/data/backups/ty-luwa-2026-09-08.json --ja

const fs = require("fs");
const path = require("path");

const file = process.argv[2];
const yes = process.argv.includes("--ja");
if (!file) {
  console.error("Gebruik: node scripts/restore.js <snapshot.json> --ja");
  process.exit(1);
}
const config = require("../lib/config").load();
const snap = JSON.parse(fs.readFileSync(file, "utf8"));
console.log(`Snapshot van ${snap.exportedAt}: ${snap.periods.length} periodes, ${snap.requests.length} aanvragen`);
console.log(`Database: ${path.join(config.dataDir, "ty-luwa.sqlite")}`);
if (!yes) {
  console.log("Niets gedaan. Voeg --ja toe om de huidige planning hiermee te vervangen.");
  process.exit(0);
}
const db = require("../lib/db").open(path.join(config.dataDir, "ty-luwa.sqlite"));
const store = require("../lib/store").createStore(db);
store.importSnapshot(snap);
console.log("Teruggezet.");
