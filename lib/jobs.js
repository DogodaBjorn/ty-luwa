// Onderhoud dat vanzelf loopt zolang de server draait (App Service: Always On).
// Elk uur: verlopen inlogcodes en sessies weg, zacht verwijderde periodes na
// dertig dagen echt weg. Elke dag: een JSON-snapshot in DATA_DIR/backups en
// een integriteitscontrole van de database. Elke week: de snapshot per mail
// naar Björn. De meta-tabel onthoudt wanneer het voor het laatst gebeurde,
// zodat een herstart geen tweede mail geeft.

const fs = require("fs");
const path = require("path");
const { quickCheck } = require("./db");
const texts = require("./mail-texts");

const KEEP_SNAPSHOTS = 30;
const DELETED_KEEP_DAYS = 30;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function createJobs({ store, db, mailer, config, log = console, now = () => new Date() }) {
  const backupDir = path.join(config.dataDir, "backups");

  function runCleanup() {
    const before = new Date(now().getTime() - DELETED_KEEP_DAYS * 86400000).toISOString();
    store.purgeExpired(before);
  }

  /** Schrijft de snapshot van vandaag als die er nog niet is. Geeft het pad. */
  function runSnapshot() {
    const day = now().toISOString().slice(0, 10);
    if (store.getMeta("last_snapshot") === day) return null;
    fs.mkdirSync(backupDir, { recursive: true });
    const file = path.join(backupDir, `ty-luwa-${day}.json`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store.exportSnapshot(), null, 1));
    fs.renameSync(tmp, file);
    const old = fs
      .readdirSync(backupDir)
      .filter((f) => /^ty-luwa-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .slice(0, -KEEP_SNAPSHOTS);
    for (const f of old) fs.rmSync(path.join(backupDir, f), { force: true });
    store.setMeta("last_snapshot", day);

    const check = quickCheck(db);
    if (check !== "ok") {
      log.error("Databasecontrole:", check);
      if (config.mail.backup.length) {
        mailer
          .send({ to: config.mail.backup, subject: "Ty LuWa: databasecontrole meldt een probleem", text: `PRAGMA quick_check zegt:\n\n${check}\n\nDe snapshots staan in ${backupDir}; terugzetten kan met scripts/restore.js.` })
          .catch((e) => log.error("Waarschuwingsmail mislukt:", e.message));
      }
    }
    return file;
  }

  /**
   * Siblu verhuurt de caravan in juli. Voor dit jaar en de twee volgende staat
   * juli daarom automatisch in de kalender, één keer per jaar: halen Luuk en
   * Wanda hem weg of passen ze hem aan, dan blijft dat zo (de meta-sleutel
   * onthoudt dat het jaar al gezet is).
   */
  function runSibluSeed() {
    const year = now().getUTCFullYear();
    const made = [];
    for (let y = year; y <= year + 2; y++) {
      const key = `siblu_seeded_${y}`;
      if (store.getMeta(key)) continue;
      if (!store.hasKindInRange("siblu", `${y}-07-01`, `${y}-08-01`)) {
        store.createPeriod({
          arrival: `${y}-07-01`,
          departure: `${y}-08-01`,
          kind: "siblu",
          notes: "Automatisch gezet: Siblu verhuurt Ty LuWa in juli.",
        });
        made.push(y);
      }
      store.setMeta(key, now().toISOString());
    }
    return made;
  }

  async function runBackupMail() {
    if (!config.mail.backup.length) return false;
    const last = store.getMeta("last_backup_mail");
    if (last && now().getTime() - Date.parse(last) < WEEK_MS) return false;
    const snap = store.exportSnapshot();
    const when = now().toISOString();
    const m = texts.backup({ periods: snap.periods.length, requests: snap.requests.length, when });
    await mailer.send({
      to: config.mail.backup,
      subject: m.subject,
      text: m.text,
      replyTo: "",
      attachments: [{ name: `ty-luwa-planning-${when.slice(0, 10)}.json`, contentType: "application/json", content: JSON.stringify(snap, null, 1) }],
    });
    store.setMeta("last_backup_mail", when);
    return true;
  }

  async function tick() {
    for (const [name, fn] of [["opruimen", runCleanup], ["siblu", runSibluSeed], ["snapshot", runSnapshot], ["back-upmail", runBackupMail]]) {
      try {
        await fn();
      } catch (e) {
        log.error(`Onderhoud (${name}) mislukt:`, e.message);
      }
    }
  }

  function start(intervalMs = 60 * 60 * 1000) {
    // Juli van Siblu moet er zijn vóór de eerste bezoeker de kalender ziet.
    try {
      runSibluSeed();
    } catch (e) {
      log.error("Siblu-juli zetten mislukt:", e.message);
    }
    // De rest niet meteen bij het opstarten: eerst de site bedienen.
    const first = setTimeout(tick, 60 * 1000);
    first.unref();
    const timer = setInterval(tick, intervalMs);
    timer.unref();
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }

  return { runCleanup, runSibluSeed, runSnapshot, runBackupMail, tick, start, backupDir };
}

module.exports = { createJobs, KEEP_SNAPSHOTS, DELETED_KEEP_DAYS };
