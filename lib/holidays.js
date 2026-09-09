// Feestdagen en schoolvakanties per land, zodat een bezoeker op zijn eigen
// taalsite ziet wanneer het bij hém vakantie of feestdag is. Twee open
// bronnen, geen sleutel nodig:
//
//   NL, FR, DE  OpenHolidays API (openholidaysapi.org) — feestdagen én
//               schoolvakanties, met de namen in de taal van de site.
//   EN          gov.uk bank holidays (england-and-wales) — Engeland kent geen
//               landelijke schoolvakantiedata, dus daar alleen feestdagen.
//
// Wat binnenkomt wordt in de database bewaard (lib/store.js). Valt een bron
// uit, dan blijft de vorige lijst gewoon staan.

const OPENHOLIDAYS = "https://openholidaysapi.org";
const GOVUK = "https://www.gov.uk/bank-holidays.json";

/** Taal van een site → het land waarvan de dagen daar getoond worden. */
const HOLIDAY_COUNTRY = { nl: "NL", fr: "FR", de: "DE", en: "EN" };
const LANGUAGE_OF = { NL: "NL", FR: "FR", DE: "DE", EN: "EN" };
const COUNTRIES = ["NL", "FR", "DE", "EN"];

/** De naam in de taal van de site, anders de eerste die er is. */
function pickName(list, language) {
  if (typeof list === "string") return list;
  if (!Array.isArray(list) || !list.length) return "";
  const hit = list.find((n) => String(n.language || "").toUpperCase() === language);
  return String((hit || list[0]).text || "");
}

function regionsOf(entry) {
  const subs = Array.isArray(entry.subdivisions) ? entry.subdivisions : [];
  return subs.map((s) => String(s.shortName || s.code || "").trim()).filter(Boolean);
}

function createHolidaySource({ fetchFn = (...a) => fetch(...a), log = console } = {}) {
  async function getJson(url) {
    const res = await fetchFn(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`${url.split("?")[0]} gaf ${res.status}`);
    return res.json();
  }

  async function openholidays(country, year, kind) {
    const path = kind === "public" ? "PublicHolidays" : "SchoolHolidays";
    const language = LANGUAGE_OF[country] || "EN";
    const url =
      `${OPENHOLIDAYS}/${path}?countryIsoCode=${country}&languageIsoCode=${language}` +
      `&validFrom=${year}-01-01&validTo=${year}-12-31`;
    const data = await getJson(url);
    if (!Array.isArray(data)) throw new Error(`${path}: onverwacht antwoord`);
    return data
      .filter((e) => e && e.startDate)
      .map((e) => ({
        kind,
        startDate: String(e.startDate).slice(0, 10),
        endDate: String(e.endDate || e.startDate).slice(0, 10),
        name: pickName(e.name, language) || (kind === "public" ? "Feestdag" : "Schoolvakantie"),
        nationwide: e.nationwide !== false,
        regions: regionsOf(e),
      }));
  }

  async function govuk(year) {
    const data = await getJson(GOVUK);
    const division = data && data["england-and-wales"];
    const events = division && Array.isArray(division.events) ? division.events : null;
    if (!events) throw new Error("gov.uk: onverwacht antwoord");
    return events
      .filter((e) => e && typeof e.date === "string" && e.date.startsWith(String(year)))
      .map((e) => ({
        kind: "public",
        startDate: e.date,
        endDate: e.date,
        name: String(e.title || "Bank holiday"),
        nationwide: true,
        regions: [],
      }));
  }

  /** Alle dagen van één land in één jaar. Gooit als de bron niet meewerkt. */
  async function fetchYear(country, year) {
    if (country === "EN") return govuk(year);
    const [pub, school] = await Promise.all([
      openholidays(country, year, "public"),
      openholidays(country, year, "school"),
    ]);
    return [...pub, ...school];
  }

  return { fetchYear, COUNTRIES, log };
}

/**
 * De rijen uit de database omzetten naar een map per dag, voor de kalender.
 * Een schoolvakantie loopt over meer dagen; elke dag krijgt hetzelfde item.
 */
function holidayMap(rows, { addDays }) {
  const map = new Map();
  for (const r of rows) {
    for (let d = r.start_date; d <= r.end_date; d = addDays(d, 1)) {
      const item = map.get(d) || {};
      if (r.kind === "public") item.public = r.name;
      else item.school = { name: r.name, regions: r.regions, nationwide: Boolean(r.nationwide) };
      map.set(d, item);
      if (d === r.end_date) break;
    }
  }
  return map;
}

module.exports = { createHolidaySource, holidayMap, HOLIDAY_COUNTRY, COUNTRIES, pickName };
