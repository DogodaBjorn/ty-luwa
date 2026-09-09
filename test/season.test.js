const test = require("node:test");
const assert = require("node:assert/strict");
const season = require("../lib/season");

test("open nachten: maart tot en met oktober", () => {
  assert.equal(season.isOpenNight("2026-03-01"), true);
  assert.equal(season.isOpenNight("2026-10-31"), true);
  assert.equal(season.isOpenNight("2026-11-01"), false);
  assert.equal(season.isOpenNight("2027-02-28"), false);
  assert.equal(season.isOpenNight("2026-02-29"), false);
});

test("open maanden", () => {
  assert.deepEqual(
    ["2026-01", "2026-02", "2026-03", "2026-07", "2026-10", "2026-11", "2026-12"].map(season.isOpenMonth),
    [false, false, true, true, true, false, false]
  );
});

test("navigatie springt over de winter heen", () => {
  assert.equal(season.stepMonth("2026-10", 1), "2027-03");
  assert.equal(season.stepMonth("2027-03", -1), "2026-10");
  assert.equal(season.stepMonth("2026-07", 1), "2026-08");
  assert.equal(season.nextOpenMonth("2026-12"), "2027-03");
  assert.equal(season.prevOpenMonth("2027-01"), "2026-10");
  assert.equal(season.nextOpenMonth("2026-05"), "2026-05");
});

test("gesloten nachten in een verblijf", () => {
  assert.deepEqual(season.closedNights("2026-07-01", "2026-07-08"), []);
  assert.deepEqual(season.closedNights("2026-10-30", "2026-11-03"), ["2026-11-01", "2026-11-02"]);
  assert.equal(season.closedNights("2026-12-20", "2026-12-27").length, 7);
});

test("publieke maanden: in het seizoen tot eind volgend seizoen, in de winter alleen het komende", () => {
  const zomer = season.publicMonths("2026-09-08");
  assert.equal(zomer[0], "2026-09");
  assert.equal(zomer[zomer.length - 1], "2027-10");
  assert.ok(!zomer.some((m) => !season.isOpenMonth(m)), "geen gesloten maanden");

  const winter = season.publicMonths("2027-01-15");
  assert.deepEqual(winter, ["2027-03", "2027-04", "2027-05", "2027-06", "2027-07", "2027-08", "2027-09", "2027-10"]);

  const laatst = season.publicMonths("2026-10-20");
  assert.equal(laatst[0], "2026-10");
  assert.equal(laatst[laatst.length - 1], "2027-10");
});
