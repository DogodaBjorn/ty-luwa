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
