const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { open } = require("../lib/db");
const { createStore } = require("../lib/store");
const { createJobs } = require("../lib/jobs");

test("snapshot per dag, oude weg, back-upmail per week", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tyluwa-jobs-"));
  const db = open(":memory:");
  let t = new Date("2026-09-08T03:00:00Z");
  const store = createStore(db, { now: () => t.toISOString() });
  const sent = [];
  const mailer = { send: async (m) => { sent.push(m); return {}; } };
  const jobs = createJobs({ store, db, mailer, config: { dataDir: dir, mail: { backup: ["bjorn@example.nl"] } }, log: { error() {} }, now: () => t });

  store.createPeriod({ arrival: "2026-10-01", departure: "2026-10-08", kind: "own" });
  const file = jobs.runSnapshot();
  assert.ok(file.endsWith("ty-luwa-2026-09-08.json"));
  assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).periods.length, 1);
  assert.equal(jobs.runSnapshot(), null, "één per dag");

  for (let i = 1; i <= 35; i++) {
    t = new Date(Date.parse("2026-09-08T03:00:00Z") + i * 86400000);
    jobs.runSnapshot();
  }
  const files = fs.readdirSync(jobs.backupDir).sort();
  assert.equal(files.length, 30);
  assert.equal(files[0], "ty-luwa-2026-09-14.json");

  assert.equal(await jobs.runBackupMail(), true);
  assert.equal(sent[0].to[0], "bjorn@example.nl");
  assert.equal(sent[0].attachments[0].contentType, "application/json");
  assert.equal(await jobs.runBackupMail(), false, "niet twee keer per week");
  t = new Date(t.getTime() + 8 * 86400000);
  assert.equal(await jobs.runBackupMail(), true);

  // opruimen: zacht verwijderde periode ouder dan 30 dagen verdwijnt
  const p = store.createPeriod({ arrival: "2026-11-01", departure: "2026-11-08", kind: "blocked" });
  store.softDeletePeriod(p.id);
  jobs.runCleanup();
  assert.ok(store.getPeriod(p.id), "nog binnen dertig dagen");
  t = new Date(t.getTime() + 31 * 86400000);
  jobs.runCleanup();
  assert.equal(store.getPeriod(p.id), null);
  await jobs.tick();
});

test("juli van Siblu: drie jaar vooruit, één keer per jaar, weghalen blijft weg", () => {
  const db = open(":memory:");
  let t = new Date("2026-09-08T03:00:00Z");
  const store = createStore(db, { now: () => t.toISOString() });
  const jobs = createJobs({ store, db, mailer: { send: async () => ({}) }, config: { dataDir: os.tmpdir(), mail: { backup: [] } }, log: { error() {} }, now: () => t });
  assert.deepEqual(jobs.runSibluSeed(), [2026, 2027, 2028]);
  assert.deepEqual(jobs.runSibluSeed(), [], "niet nog eens");
  const july = store.listPeriods("2027-07-01", "2027-08-01");
  assert.equal(july.length, 1);
  assert.equal(july[0].kind, "siblu");
  assert.equal(july[0].departure, "2027-08-01");
  assert.equal(store.occupiedNights("2027-07-30", "2027-08-02").size, 2);

  store.softDeletePeriod(july[0].id);
  assert.deepEqual(jobs.runSibluSeed(), [], "door de ouders weggehaald: komt niet terug");
  t = new Date("2027-01-05T03:00:00Z");
  assert.deepEqual(jobs.runSibluSeed(), [2029], "nieuw jaar erbij");
});

test("feestdagen bijwerken: één keer per dag, een land dat uitvalt houdt zijn oude lijst", async () => {
  const db = open(":memory:");
  let t = new Date("2026-09-09T03:00:00Z");
  const store = createStore(db, { now: () => t.toISOString() });
  let frDown = false;
  const holidaySource = {
    async fetchYear(country, year) {
      if (country === "FR" && frDown) throw new Error("bron plat");
      return [
        { kind: "public", startDate: `${year}-05-05`, endDate: `${year}-05-05`, name: `Feest ${country}`, nationwide: true, regions: [] },
        { kind: "school", startDate: `${year}-07-06`, endDate: `${year}-07-10`, name: `Vakantie ${country}`, nationwide: false, regions: ["Noord"] },
      ];
    },
  };
  const lines = [];
  const jobs = createJobs({
    store, db, holidaySource,
    mailer: { send: async () => ({}) },
    config: { dataDir: os.tmpdir(), mail: { backup: [] } },
    log: { log: (s) => lines.push(s), error: (s, m) => lines.push(`${s} ${m}`) },
    now: () => t,
  });

  const done = await jobs.runHolidaySync();
  assert.equal(done.length, 8, "vier landen, twee jaren");
  assert.match(lines[0], /feestdagen NL 2026: 1 feestdagen, 1 vakanties/);
  assert.deepEqual(await jobs.runHolidaySync(), [], "niet nog eens vandaag");

  const rows = store.holidaysBetween("NL", "2026-07-01", "2026-08-01");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Vakantie NL");
  assert.equal(rows[0].regions, "Noord");
  assert.equal(rows[0].nationwide, 0);
  assert.equal(store.holidaysBetween("FR", "2026-05-01", "2026-06-01").length, 1);
  assert.equal(store.holidaysBetween("NL", "2026-06-01", "2026-06-15").length, 0);

  // Volgende dag: Frankrijk valt uit, de rest wordt ververst.
  t = new Date("2026-09-10T03:00:00Z");
  frDown = true;
  const done2 = await jobs.runHolidaySync();
  assert.equal(done2.length, 6);
  assert.ok(lines.some((l) => /Feestdagen FR 2026 ophalen mislukt/.test(l)));
  assert.equal(store.holidaysBetween("FR", "2026-05-01", "2026-06-01").length, 1, "oude lijst blijft staan");
});
