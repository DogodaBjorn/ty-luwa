const test = require("node:test");
const assert = require("node:assert/strict");
const { open } = require("../lib/db");
const { createStore } = require("../lib/store");
const { loadContext, collectHighlights, overlapPhrase, mergeHolidays } = require("../lib/highlights");

const TODAY = "2026-09-09";
const REQ = { id: 1, arrival: "2027-07-10", departure: "2027-07-17", adults: 2, children: 2, name: "Sophie Martin", email: "s@voorbeeld.fr", lang: "fr", message: "" };

function fresh() {
  const store = createStore(open(":memory:"), { now: () => "2026-09-09T10:00:00.000Z" });
  return store;
}
const keys = (items) => items.map((i) => i.key);
const byKey = (items, k) => items.find((i) => i.key === k);

test("overlapPhrase in woorden", () => {
  const a = "2027-07-10", d = "2027-07-17"; // 7 nachten, laatste nacht de 16e
  assert.equal(overlapPhrase("2027-07-01", "2027-07-31", a, d), "alle 7 nachten");
  assert.equal(overlapPhrase("2027-07-10", "2027-07-12", a, d), "de eerste 3 nachten");
  assert.equal(overlapPhrase("2027-07-14", "2027-07-20", a, d), "de laatste 3 nachten");
  assert.equal(overlapPhrase("2027-07-12", "2027-07-13", a, d), "2 nachten midden in het verblijf");
  assert.equal(overlapPhrase("2027-07-01", "2027-07-08", a, d), "eindigt 2 dagen voor aankomst");
  assert.equal(overlapPhrase("2027-07-05", "2027-07-09", a, d), "eindigt de dag voor aankomst");
  assert.equal(overlapPhrase("2027-07-17", "2027-07-20", a, d), "begint op de vertrekdag");
  assert.equal(overlapPhrase("2027-07-20", "2027-07-25", a, d), "begint 3 dagen na vertrek");
});

test("regels met dezelfde naam worden één regel", () => {
  const merged = mergeHolidays([
    { kind: "school", name: "Zomervakantie", start_date: "2027-07-10", end_date: "2027-08-22", nationwide: 0 },
    { kind: "school", name: "Zomervakantie", start_date: "2027-07-03", end_date: "2027-08-15", nationwide: 0 },
    { kind: "public", name: "Koningsdag", start_date: "2027-04-27", end_date: "2027-04-27", nationwide: 1 },
  ]);
  assert.equal(merged.length, 2);
  const zomer = merged.find((m) => m.name === "Zomervakantie");
  assert.deepEqual([zomer.from, zomer.to, zomer.mixedRegions], ["2027-07-03", "2027-08-22", true]);
});

test("een vrije week zonder feestdagen: rustige meldingen, geen waarschuwing", () => {
  const store = fresh();
  store.replaceHolidays("NL", 2027, []);
  const items = collectHighlights(loadContext(store, { ...REQ, arrival: "2027-05-08", departure: "2027-05-15" }, TODAY));
  assert.deepEqual(keys(items), ["kalender", "vakanties"]);
  assert.equal(byKey(items, "kalender").tone, "calm");
  assert.match(byKey(items, "kalender").title, /vrij/);
  assert.equal(byKey(items, "vakanties").tone, "calm");
  assert.match(byKey(items, "vakanties").title, /Geen feestdag/);
  assert.ok(!items.some((i) => i.tone === "warn"));
});

test("feestdagen nog niet opgehaald is iets anders dan geen feestdagen", () => {
  const store = fresh();
  const items = collectHighlights(loadContext(store, { ...REQ, arrival: "2027-05-08", departure: "2027-05-15" }, TODAY));
  const v = byKey(items, "vakanties");
  assert.match(v.title, /nog niet opgehaald/);
  assert.equal(v.rows, undefined);
});

test("bezette nachten, een tweede aanvraag en een buur die dezelfde dag vertrekt", () => {
  const store = fresh();
  store.replaceHolidays("NL", 2027, []);
  store.createPeriod({ arrival: "2027-07-03", departure: "2027-07-10", kind: "rented", guestName: "Familie de Vries" });
  store.createPeriod({ arrival: "2027-07-12", departure: "2027-07-14", kind: "own" });
  const mine = store.createRequest({ ...REQ, id: undefined });
  store.createRequest({ ...REQ, id: undefined, name: "Familie Jansen", email: "j@voorbeeld.nl", lang: "nl", arrival: "2027-07-11", departure: "2027-07-18" });

  const items = collectHighlights(loadContext(store, mine, TODAY));
  assert.deepEqual(keys(items), ["kalender", "andere-aanvraag", "siblu", "buren", "vakanties"]);

  const kalender = byKey(items, "kalender");
  assert.equal(kalender.tone, "warn");
  assert.match(kalender.lines[0], /wij zelf/);
  assert.match(kalender.lines[1], /niets over gehoord/);

  const ander = byKey(items, "andere-aanvraag");
  assert.equal(ander.tone, "warn");
  assert.match(ander.lines[0], /Familie Jansen/);

  assert.match(byKey(items, "buren").lines[0], /Familie de Vries \(verhuurd\) vertrekt op za 10 juli — dezelfde dag als de aankomst\./);
});

test("juli: helemaal erin is een waarschuwing, eroverheen een melding", () => {
  const store = fresh();
  store.replaceHolidays("NL", 2027, []);
  const heel = collectHighlights(loadContext(store, { ...REQ, arrival: "2027-07-10", departure: "2027-07-17" }, TODAY));
  assert.equal(byKey(heel, "siblu").tone, "warn");
  assert.match(byKey(heel, "siblu").lines[0], /7 van de 7 nachten vallen daarin/);

  const rand = collectHighlights(loadContext(store, { ...REQ, arrival: "2027-06-28", departure: "2027-07-04" }, TODAY));
  assert.equal(byKey(rand, "siblu").tone, "info");
  assert.match(byKey(rand, "siblu").lines[0], /3 van de 6 nachten/);

  const buiten = collectHighlights(loadContext(store, { ...REQ, arrival: "2027-08-07", departure: "2027-08-14" }, TODAY));
  assert.equal(byKey(buiten, "siblu"), undefined);
});

test("de rand van het seizoen en de wintersluiting", () => {
  const store = fresh();
  store.replaceHolidays("NL", 2027, []);
  const rand = collectHighlights(loadContext(store, { ...REQ, arrival: "2027-10-24", departure: "2027-10-31" }, TODAY));
  assert.equal(byKey(rand, "seizoen").tone, "info");
  assert.match(byKey(rand, "seizoen").lines[0], /1 november dicht/);

  const winter = collectHighlights(loadContext(store, { ...REQ, arrival: "2027-10-29", departure: "2027-11-05" }, TODAY));
  assert.equal(byKey(winter, "seizoen").tone, "warn");
  assert.match(byKey(winter, "seizoen").lines[0], /4 nachten vallen in de wintersluiting/);

  const midden = collectHighlights(loadContext(store, { ...REQ, arrival: "2027-06-05", departure: "2027-06-12" }, TODAY));
  assert.equal(byKey(midden, "seizoen"), undefined);
});

test("haast: aankomst binnen drie weken", () => {
  const store = fresh();
  store.replaceHolidays("NL", 2026, []);
  const items = collectHighlights(loadContext(store, { ...REQ, arrival: "2026-09-19", departure: "2026-09-26" }, TODAY));
  assert.match(byKey(items, "haast").title, /over 10 dagen/);
  const ver = collectHighlights(loadContext(store, { ...REQ, arrival: "2027-06-05", departure: "2027-06-12" }, TODAY));
  assert.equal(byKey(ver, "haast"), undefined);
});

test("feestdagen: land van de gast eerst, per land één regel", () => {
  const store = fresh();
  store.replaceHolidays("FR", 2027, [
    { kind: "school", startDate: "2027-07-04", endDate: "2027-08-31", name: "Vacances d'été", nationwide: true, regions: [] },
    { kind: "public", startDate: "2027-07-14", endDate: "2027-07-14", name: "Fête nationale", nationwide: true, regions: [] },
  ]);
  store.replaceHolidays("NL", 2027, [
    { kind: "school", startDate: "2027-07-10", endDate: "2027-08-22", name: "Zomervakantie", nationwide: false, regions: ["Noord"] },
    { kind: "school", startDate: "2027-07-17", endDate: "2027-08-29", name: "Zomervakantie", nationwide: false, regions: ["Zuid"] },
  ]);
  store.replaceHolidays("DE", 2027, []);
  store.replaceHolidays("EN", 2027, []);

  const rows = byKey(collectHighlights(loadContext(store, REQ, TODAY)), "vakanties").rows;
  assert.deepEqual(rows.map((r) => r.label), ["Frankrijk", "Nederland", "Duitsland", "Engeland"]);
  assert.match(rows[0].value, /Vacances d'été \(zo 4 juli – di 31 augustus\): alle 7 nachten/);
  assert.match(rows[0].value, /Fête nationale: wo 14 juli, tijdens het verblijf/);
  assert.match(rows[1].value, /Zomervakantie \(za 10 juli – zo 29 augustus, regio's verschillen\): alle 7 nachten/);
  assert.equal(rows[2].value, "niets in deze dagen");
  assert.equal(rows[3].value, "niets in deze dagen");
});
