const test = require("node:test");
const assert = require("node:assert/strict");
const { validateRequest, validatePeriod } = require("../lib/validate");

const ctx = { today: "2026-09-08", languages: ["nl", "fr", "en", "de"] };
const good = { arrival: "2026-10-03", departure: "2026-10-10", adults: "2", children: "1", name: "Marie Dupont", email: "marie@example.fr", message: "Bonjour", lang: "fr" };

test("een goede aanvraag", () => {
  const r = validateRequest(good, ctx);
  assert.equal(r.ok, true);
  assert.deepEqual(r.data, { arrival: "2026-10-03", departure: "2026-10-10", adults: 2, children: 1, name: "Marie Dupont", email: "marie@example.fr", message: "Bonjour", lang: "fr" });
});

test("elke foutcode", () => {
  const code = (patch) => validateRequest({ ...good, ...patch }, ctx).code;
  assert.equal(code({ website: "spam" }), "honeypot");
  assert.equal(code({ arrival: "" }), "dates");
  assert.equal(code({ arrival: "2026-10-10", departure: "2026-10-03" }), "dates");
  assert.equal(code({ arrival: "2026-10-03", departure: "2026-10-03" }), "dates");
  assert.equal(code({ arrival: "2026-09-07", departure: "2026-09-10" }), "past");
  assert.equal(code({ arrival: "2028-10-03", departure: "2028-10-10" }), "tooFar");
  assert.equal(code({ departure: "2026-11-03" }), "tooLong");
  assert.equal(code({ adults: "0" }), "adults");
  assert.equal(code({ adults: "4", children: "3" }), "tooMany");
  assert.equal(code({ children: "-1" }), "tooMany");
  assert.equal(code({ name: "M" }), "name");
  assert.equal(code({ email: "marie@" }), "email");
});

test("vandaag aankomen mag, onbekende taal valt terug, tekst wordt ingekort", () => {
  const r = validateRequest({ ...good, arrival: "2026-09-08", departure: "2026-09-09", lang: "xx", message: "x".repeat(5000) }, ctx);
  assert.equal(r.ok, true);
  assert.equal(r.data.lang, "nl");
  assert.equal(r.data.message.length, 2000);
});

test("periode in het beheer", () => {
  const kinds = ["rented", "own", "option", "blocked"];
  assert.equal(validatePeriod({ arrival: "2026-10-03", departure: "2026-10-10", kind: "rented" }, kinds).ok, true);
  assert.equal(validatePeriod({ arrival: "2026-10-03", departure: "2026-10-03", kind: "rented" }, kinds).code, "order");
  assert.equal(validatePeriod({ arrival: "2026-10-03", departure: "2026-10-10", kind: "feest" }, kinds).code, "kind");
  assert.equal(validatePeriod({ arrival: "2026-10-03", departure: "2027-10-10", kind: "own" }, kinds).code, "tooLong");
});
