const test = require("node:test");
const assert = require("node:assert/strict");
const { renderMonth, renderMonths, renderLegend } = require("../lib/calendar");

const labels = { free: "vrij", busy: "bezet", past: "voorbij", today: "vandaag" };

test("maandraster: koppen, bezette en voorbije dagen, vandaag", () => {
  const html = renderMonth({
    ym: "2026-07",
    occupied: new Set(["2026-07-12", "2026-07-13"]),
    today: "2026-07-10",
    lang: "nl",
    labels,
  });
  assert.match(html, /<caption>juli 2026<\/caption>/);
  assert.match(html, /<th scope="col" abbr="maandag">/);
  assert.match(html, /data-date="2026-07-12"[^>]*>.*?<span class="visually-hidden">bezet<\/span>/);
  assert.match(html, /class="cal-day is-busy" data-date="2026-07-13"/);
  assert.match(html, /class="cal-day is-past" data-date="2026-07-01"/);
  assert.match(html, /class="cal-day is-today" data-date="2026-07-10" aria-current="date"/);
  assert.match(html, /data-date="2026-07-20"[^>]*>.*?visually-hidden">vrij</);
  assert.equal((html.match(/data-date=/g) || []).length, 31);
  assert.ok(html.startsWith('<div class="cal-month" data-month="2026-07">'));
  assert.doesNotMatch(html, /<a /, "publiek: geen links");
});

test("beheer: soort per nacht en link per dag", () => {
  const html = renderMonth({
    ym: "2026-07",
    occupied: new Set(["2026-07-12"]),
    kinds: new Map([["2026-07-12", { kind: "option", id: 4, name: "Dupont" }]]),
    today: "2026-01-01",
    lang: "nl",
    labels,
    dayHref: (d, info) => (info ? `/beheer/periode/${info.id}` : `/beheer/periode/nieuw?aankomst=${d}`),
  });
  assert.match(html, /class="cal-day is-busy kind-option" data-date="2026-07-12"><a href="\/beheer\/periode\/4" title="Dupont">/);
  assert.match(html, /data-date="2026-07-13"><a href="\/beheer\/periode\/nieuw\?aankomst=2026-07-13">/);
});

test("reeks maanden en legenda", () => {
  const html = renderMonths({ fromYm: "2026-11", count: 3, occupied: new Set(), today: "2026-11-01", lang: "en", labels });
  assert.match(html, /data-month="2026-11"/);
  assert.match(html, /data-month="2027-01"/);
  assert.match(html, /<caption>January 2027<\/caption>/);
  const legend = renderLegend({ free: "Vrij", busy: "Bezet", departureNote: "Op een vertrekdag <kun> je aankomen." });
  assert.match(legend, /Op een vertrekdag &lt;kun&gt; je aankomen\./);
});

test("Siblu: eigen klasse, eigen woord, legenda met link", () => {
  const html = renderMonth({
    ym: "2027-07",
    occupied: new Set(["2027-07-01", "2027-07-02"]),
    kinds: new Map([["2027-07-01", { kind: "siblu" }]]),
    today: "2026-09-08",
    lang: "nl",
    labels: { ...labels, siblu: "via Siblu" },
  });
  assert.match(html, /class="cal-day is-busy kind-siblu" data-date="2027-07-01">.*?visually-hidden">via Siblu</);
  assert.match(html, /class="cal-day is-busy" data-date="2027-07-02">.*?visually-hidden">bezet</);
  const legend = renderLegend({ free: "Vrij", busy: "Bezet", siblu: "Mogelijk boekbaar via Siblu", sibluUrl: "https://leconguel.fr/", departureNote: "x" });
  assert.match(legend, /<span class="cal-swatch kind-siblu"[^>]*><\/span><a href="https:\/\/leconguel.fr\/" target="_blank" rel="noopener">Mogelijk boekbaar via Siblu<\/a>/);
  assert.doesNotMatch(renderLegend({ free: "Vrij", busy: "Bezet", departureNote: "x" }), /kind-siblu/);
});
