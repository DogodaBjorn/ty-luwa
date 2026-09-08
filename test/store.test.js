const test = require("node:test");
const assert = require("node:assert/strict");
const { open } = require("../lib/db");
const { createStore } = require("../lib/store");

function fresh() {
  let tick = 0;
  const db = open(":memory:");
  const store = createStore(db, { now: () => `2026-06-01T10:00:${String(tick++).padStart(2, "0")}.000Z` });
  return { db, store };
}

test("periode aanmaken, lezen, overlap", () => {
  const { store } = fresh();
  const p = store.createPeriod({ arrival: "2026-07-12", departure: "2026-07-19", kind: "rented", guestName: "Jansen" });
  assert.equal(p.id, 1);
  assert.equal(p.guest_name, "Jansen");

  // wisseldag: vertrek 19e, aankomst 19e is geen overlap
  assert.deepEqual(store.overlappingPeriods("2026-07-19", "2026-07-26"), []);
  assert.equal(store.overlappingPeriods("2026-07-18", "2026-07-20").length, 1);
  assert.equal(store.overlappingPeriods("2026-07-01", "2026-07-12").length, 0);
  assert.equal(store.overlappingPeriods("2026-07-10", "2026-07-13", p.id).length, 0, "zichzelf uitsluiten");
});

test("bezette nachten per nacht, niet per dag", () => {
  const { store } = fresh();
  store.createPeriod({ arrival: "2026-07-12", departure: "2026-07-15", kind: "own" });
  const set = store.occupiedNights("2026-07-01", "2026-08-01");
  assert.deepEqual([...set], ["2026-07-12", "2026-07-13", "2026-07-14"]);
  // bereik dat de periode snijdt
  assert.deepEqual([...store.occupiedNights("2026-07-14", "2026-07-20")], ["2026-07-14"]);
});

test("formId maakt opslaan idempotent", () => {
  const { store } = fresh();
  const a = store.createPeriod({ arrival: "2026-07-12", departure: "2026-07-15", kind: "option", formId: "abc" });
  const b = store.createPeriod({ arrival: "2026-07-12", departure: "2026-07-15", kind: "option", formId: "abc" });
  assert.equal(a.id, b.id);
  assert.equal(store.listPeriods("2026-01-01", "2027-01-01").length, 1);
});

test("zacht verwijderen en terugzetten, met gekoppelde aanvraag", () => {
  const { store } = fresh();
  const r = store.createRequest({ arrival: "2026-07-12", departure: "2026-07-19", adults: 2, children: 1, name: "Dupont", email: "d@example.fr", lang: "fr" });
  assert.equal(r.status, "new");
  const p = store.createPeriod({ arrival: "2026-07-12", departure: "2026-07-19", kind: "option", requestId: r.id });
  assert.equal(store.getRequest(r.id).status, "planned");
  assert.equal(store.countNewRequests(), 0);

  store.softDeletePeriod(p.id);
  assert.equal(store.listPeriods("2026-01-01", "2027-01-01").length, 0);
  assert.equal(store.getRequest(r.id).status, "new", "aanvraag terug in de inbox");
  assert.ok(store.getPeriod(p.id).deleted_at);

  store.restorePeriod(p.id);
  assert.equal(store.listPeriods("2026-01-01", "2027-01-01").length, 1);
  assert.equal(store.getRequest(r.id).status, "planned");
});

test("dubbele aanvraag binnen het venster", () => {
  const { store } = fresh();
  store.createRequest({ arrival: "2026-07-12", departure: "2026-07-19", adults: 2, name: "A", email: "A@Example.com", lang: "nl" });
  assert.ok(store.findDuplicateRequest("a@example.com", "2026-07-12", "2026-07-19", "2026-06-01T09:50:00.000Z"));
  assert.equal(store.findDuplicateRequest("a@example.com", "2026-07-12", "2026-07-20", "2026-06-01T09:50:00.000Z"), null);
  assert.equal(store.findDuplicateRequest("a@example.com", "2026-07-12", "2026-07-19", "2026-06-01T10:30:00.000Z"), null);
});

test("aanvragen per status", () => {
  const { store } = fresh();
  const a = store.createRequest({ arrival: "2026-07-12", departure: "2026-07-19", adults: 2, name: "A", email: "a@x", lang: "nl" });
  const b = store.createRequest({ arrival: "2026-08-12", departure: "2026-08-19", adults: 2, name: "B", email: "b@x", lang: "de" });
  store.setRequestStatus(a.id, "declined");
  assert.deepEqual(store.listRequests("new").map((r) => r.id), [b.id]);
  assert.deepEqual(store.listRequests(["declined", "archived"]).map((r) => r.id), [a.id]);
  assert.ok(store.getRequest(a.id).handled_at);
  assert.throws(() => store.setRequestStatus(a.id, "weg"));
});

test("sessies en tokens", () => {
  const { store } = fresh();
  const id = store.createLoginToken("th", "ch", "wanda@example.nl", "2026-06-01T11:00:00.000Z");
  assert.equal(store.getLoginToken(id).attempts, 0);
  store.bumpLoginAttempts(id);
  assert.equal(store.getLoginToken(id).attempts, 1);
  assert.equal(store.useLoginToken(id), true);
  assert.equal(store.useLoginToken(id), false, "eenmalig");
  assert.equal(store.countRecentLoginTokens("WANDA@example.nl"), 1);

  store.createSession("sh", "wanda@example.nl", "2027-06-01T00:00:00.000Z");
  assert.equal(store.getSession("sh").email, "wanda@example.nl");
  store.createSession("oud", "wanda@example.nl", "2026-01-01T00:00:00.000Z");
  assert.equal(store.getSession("oud"), null, "verlopen");
  store.purgeExpired("2026-05-01T00:00:00.000Z");
  store.deleteSession("sh");
  assert.equal(store.getSession("sh"), null);
});

test("snapshot exporteren en terugzetten", () => {
  const { store } = fresh();
  store.createRequest({ arrival: "2026-07-12", departure: "2026-07-19", adults: 2, name: "A", email: "a@x", lang: "nl" });
  store.createPeriod({ arrival: "2026-07-12", departure: "2026-07-19", kind: "rented", requestId: 1 });
  const snap = store.exportSnapshot();
  assert.equal(snap.periods.length, 1);

  const other = fresh().store;
  other.createPeriod({ arrival: "2026-01-01", departure: "2026-01-03", kind: "blocked" });
  other.importSnapshot(snap);
  assert.equal(other.listPeriods("2026-01-01", "2027-01-01").length, 1);
  assert.equal(other.getPeriod(1).request_id, 1);
  assert.equal(other.getRequest(1).name, "A");
});

test("validatie van een periode", () => {
  const { store } = fresh();
  assert.throws(() => store.createPeriod({ arrival: "2026-07-19", departure: "2026-07-12", kind: "rented" }));
  assert.throws(() => store.createPeriod({ arrival: "2026-07-12", departure: "2026-07-19", kind: "party" }));
  assert.throws(() => store.createPeriod({ arrival: "12-07-2026", departure: "2026-07-19", kind: "rented" }));
});
