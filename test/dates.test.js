const test = require("node:test");
const assert = require("node:assert/strict");
const d = require("../lib/dates");

test("isIsoDate accepteert alleen echte datums", () => {
  assert.equal(d.isIsoDate("2026-07-12"), true);
  assert.equal(d.isIsoDate("2026-02-29"), false);
  assert.equal(d.isIsoDate("2028-02-29"), true);
  assert.equal(d.isIsoDate("2026-7-12"), false);
  assert.equal(d.isIsoDate("12-07-2026"), false);
  assert.equal(d.isIsoDate(""), false);
  assert.equal(d.isIsoDate(null), false);
});

test("addDays over maand-, jaar- en zomertijdgrenzen", () => {
  assert.equal(d.addDays("2026-03-28", 2), "2026-03-30");
  assert.equal(d.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(d.addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(d.addDays("2026-10-24", 3), "2026-10-27");
});

test("addMonths", () => {
  assert.equal(d.addMonths("2026-11", 1), "2026-12");
  assert.equal(d.addMonths("2026-12", 1), "2027-01");
  assert.equal(d.addMonths("2026-01", -1), "2025-12");
  assert.equal(d.addMonths("2026-07", 12), "2027-07");
});

test("nachten en eachNight", () => {
  assert.equal(d.nightsBetween("2026-07-12", "2026-07-19"), 7);
  assert.deepEqual(d.eachNight("2026-07-30", "2026-08-02"), [
    "2026-07-30",
    "2026-07-31",
    "2026-08-01",
  ]);
  assert.deepEqual(d.eachNight("2026-07-12", "2026-07-12"), []);
});

test("monthGrid begint op maandag en vult tot volle weken", () => {
  const grid = d.monthGrid("2026-07"); // 1 juli 2026 is een woensdag
  assert.equal(grid[0][0], null);
  assert.equal(grid[0][1], null);
  assert.equal(grid[0][2], "2026-07-01");
  assert.equal(grid[grid.length - 1].length, 7);
  const days = grid.flat().filter(Boolean);
  assert.equal(days.length, 31);
  assert.equal(days[30], "2026-07-31");
  const feb = d.monthGrid("2027-02"); // 1 feb 2027 is een maandag, 28 dagen
  assert.equal(feb.length, 4);
  assert.equal(feb[0][0], "2027-02-01");
});

test("weekdayMonFirst", () => {
  assert.equal(d.weekdayMonFirst("2026-07-13"), 1);
  assert.equal(d.weekdayMonFirst("2026-07-12"), 7);
});

test("today in Europe/Paris", () => {
  assert.equal(d.today("Europe/Paris", new Date("2026-07-12T22:30:00Z")), "2026-07-13");
  assert.equal(d.today("Europe/Paris", new Date("2026-07-12T21:30:00Z")), "2026-07-12");
});

test("formattering per taal", () => {
  assert.equal(d.formatLong("2026-07-12", "nl"), "zondag 12 juli 2026");
  assert.equal(d.formatLong("2026-07-12", "fr"), "dimanche 12 juillet 2026");
  assert.equal(d.formatMonth("2026-07", "de"), "Juli 2026");
  assert.equal(d.formatMonth("2026-07", "en"), "July 2026");
  assert.equal(d.weekdayNames("nl")[0].toLowerCase().slice(0, 2), "ma");
  assert.equal(d.weekdayNames("en")[6].slice(0, 3), "Sun");
});
