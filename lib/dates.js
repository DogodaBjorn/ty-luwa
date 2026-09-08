// Datums als platte "YYYY-MM-DD"-strings. Alle rekenwerk gaat via UTC-dagen,
// nooit via een lokale Date: de server draait in UTC, de gasten en Luuk en
// Wanda leven in Europe/Paris, en een boeking van 12 tot 19 juli mag daar
// nooit een dag van verschuiven, ook niet rond de zomertijd.

const DAY_MS = 86400000;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Geldige kalenderdatum in de vorm YYYY-MM-DD (31 februari is ongeldig). */
function isIsoDate(s) {
  const m = ISO.exec(String(s || ""));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  return fromDays(toDays(`${m[1]}-${m[2]}-${m[3]}`)) === s;
}

/** Dagen sinds 1970-01-01 (UTC). */
function toDays(s) {
  const [y, m, d] = s.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

function fromDays(n) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

function addDays(s, n) {
  return fromDays(toDays(s) + n);
}

/** "2026-07" plus n maanden. */
function addMonths(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function monthOf(s) {
  return s.slice(0, 7);
}

/** Aantal nachten tussen aankomst en vertrek. */
function nightsBetween(arrival, departure) {
  return toDays(departure) - toDays(arrival);
}

/** Elke nacht van een verblijf: aankomstdag tot en met de dag voor vertrek. */
function eachNight(arrival, departure) {
  const out = [];
  for (let d = toDays(arrival); d < toDays(departure); d++) out.push(fromDays(d));
  return out;
}

/** 1 = maandag ... 7 = zondag. */
function weekdayMonFirst(s) {
  const dow = new Date(toDays(s) * DAY_MS).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** Vandaag in een tijdzone, als YYYY-MM-DD. */
function today(tz = "Europe/Paris", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Het raster van een maand: rijen van zeven, maandag eerst, met null op de
 * plekken die bij de vorige of volgende maand horen.
 */
function monthGrid(ym) {
  const first = `${ym}-01`;
  const next = `${addMonths(ym, 1)}-01`;
  const days = nightsBetween(first, next);
  const lead = weekdayMonFirst(first) - 1;
  const cells = Array(lead).fill(null);
  for (let i = 0; i < days; i++) cells.push(addDays(first, i));
  while (cells.length % 7) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const LOCALE = { nl: "nl-NL", fr: "fr-FR", en: "en-GB", de: "de-DE" };

function fmt(s, lang, options) {
  const [y, m, d] = s.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE[lang] || lang, {
    timeZone: "UTC",
    ...options,
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "zaterdag 12 juli 2026" */
function formatLong(s, lang) {
  return fmt(s, lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** "za 12 juli" */
function formatShort(s, lang) {
  return fmt(s, lang, { weekday: "short", day: "numeric", month: "long" });
}

/** "juli 2026" */
function formatMonth(ym, lang) {
  return fmt(`${ym}-01`, lang, { month: "long", year: "numeric" });
}

/** ["ma","di",...] — korte dagnamen, maandag eerst. */
function weekdayNames(lang, width = "short") {
  // 2024-01-01 was een maandag.
  return [0, 1, 2, 3, 4, 5, 6].map((i) =>
    fmt(addDays("2024-01-01", i), lang, { weekday: width })
  );
}

/** "za 12 – za 19 juli" of, over een maandgrens, "za 28 juni – za 5 juli". */
function formatRange(arrival, departure, lang) {
  return `${formatShort(arrival, lang)} – ${formatShort(departure, lang)}`;
}

module.exports = {
  isIsoDate,
  toDays,
  fromDays,
  addDays,
  addMonths,
  monthOf,
  nightsBetween,
  eachNight,
  weekdayMonFirst,
  today,
  monthGrid,
  formatLong,
  formatShort,
  formatMonth,
  formatRange,
  weekdayNames,
};
