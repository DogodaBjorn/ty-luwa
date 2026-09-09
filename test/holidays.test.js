const test = require("node:test");
const assert = require("node:assert/strict");
const { createHolidaySource, holidayMap, HOLIDAY_COUNTRY } = require("../lib/holidays");
const dates = require("../lib/dates");

// Antwoorden in de vorm die OpenHolidays en gov.uk documenteren.
const OPEN_PUBLIC = [
  {
    id: "x", startDate: "2027-04-27", endDate: "2027-04-27", type: "Public",
    name: [{ language: "NL", text: "Koningsdag" }, { language: "EN", text: "King's Day" }],
    nationwide: true,
  },
  { startDate: "2027-05-05", name: [{ language: "EN", text: "Liberation Day" }], nationwide: true },
];
const OPEN_SCHOOL = [
  {
    startDate: "2027-04-24", endDate: "2027-05-02",
    name: [{ language: "NL", text: "Meivakantie" }],
    nationwide: false,
    subdivisions: [{ code: "NL-NOORD", shortName: "Noord" }, { code: "NL-MIDDEN", shortName: "Midden" }],
  },
];
const GOVUK = {
  "england-and-wales": { division: "england-and-wales", events: [
    { title: "New Year's Day", date: "2027-01-01", notes: "", bunting: true },
    { title: "Christmas Day", date: "2027-12-27", notes: "Substitute day", bunting: true },
    { title: "Oud jaar", date: "2026-12-31" },
  ] },
  scotland: { events: [{ title: "St Andrew's Day", date: "2027-11-30" }] },
};

function source(handler) {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    const body = handler(url);
    if (body === undefined) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, json: async () => body };
  };
  return { src: createHolidaySource({ fetchFn, log: { error() {} } }), calls };
}

test("OpenHolidays: feestdagen en schoolvakanties, naam in de taal van de site", async () => {
  const { src, calls } = source((url) => (url.includes("PublicHolidays") ? OPEN_PUBLIC : OPEN_SCHOOL));
  const rows = await src.fetchYear("NL", 2027);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /PublicHolidays\?countryIsoCode=NL&languageIsoCode=NL&validFrom=2027-01-01&validTo=2027-12-31/);
  assert.match(calls[1], /SchoolHolidays\?countryIsoCode=NL/);

  assert.deepEqual(rows[0], { kind: "public", startDate: "2027-04-27", endDate: "2027-04-27", name: "Koningsdag", nationwide: true, regions: [] });
  assert.deepEqual(rows[1], { kind: "public", startDate: "2027-05-05", endDate: "2027-05-05", name: "Liberation Day", nationwide: true, regions: [] }, "geen NL-naam: valt terug, en endDate = startDate");
  assert.deepEqual(rows[2], { kind: "school", startDate: "2027-04-24", endDate: "2027-05-02", name: "Meivakantie", nationwide: false, regions: ["Noord", "Midden"] });

  const fr = source(() => OPEN_PUBLIC);
  await fr.src.fetchYear("FR", 2027);
  assert.match(fr.calls[0], /countryIsoCode=FR&languageIsoCode=FR/);
});

test("gov.uk: alleen Engeland en Wales, alleen dat jaar", async () => {
  const { src, calls } = source(() => GOVUK);
  const rows = await src.fetchYear("EN", 2027);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /gov\.uk\/bank-holidays\.json/);
  assert.deepEqual(rows.map((r) => r.name), ["New Year's Day", "Christmas Day"]);
  assert.ok(rows.every((r) => r.kind === "public" && r.startDate === r.endDate));
});

test("een bron die niet meewerkt gooit", async () => {
  const { src } = source(() => undefined);
  await assert.rejects(() => src.fetchYear("NL", 2027), /gaf 500/);
  const raar = source(() => ({ niet: "een lijst" }));
  await assert.rejects(() => raar.src.fetchYear("NL", 2027), /onverwacht antwoord/);
  const leeg = source(() => ({}));
  await assert.rejects(() => leeg.src.fetchYear("EN", 2027), /onverwacht antwoord/);
});

test("taal naar land", () => {
  assert.deepEqual(HOLIDAY_COUNTRY, { nl: "NL", fr: "FR", de: "DE", en: "EN" });
});

test("holidayMap zet rijen om naar een dag-map", () => {
  const map = holidayMap(
    [
      { kind: "public", start_date: "2027-04-27", end_date: "2027-04-27", name: "Koningsdag", regions: "", nationwide: 1 },
      { kind: "school", start_date: "2027-04-24", end_date: "2027-05-02", name: "Meivakantie", regions: "Noord, Midden", nationwide: 0 },
    ],
    dates
  );
  assert.equal(map.get("2027-04-27").public, "Koningsdag");
  assert.equal(map.get("2027-04-27").school.name, "Meivakantie", "feestdag én vakantie op dezelfde dag");
  assert.equal(map.get("2027-04-24").school.regions, "Noord, Midden");
  assert.equal(map.get("2027-05-02").school.nationwide, false);
  assert.equal(map.get("2027-05-03"), undefined);
  assert.equal(map.size, 9 + 0, "negen vakantiedagen, feestdag valt erbinnen");
});
