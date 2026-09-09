// De beschikbaarheidspagina is gebouwde HTML met twee markers. Bij elk verzoek
// vult de server de kalender en, na een aanvraag zonder JavaScript, de melding
// in. Zo blijft de pagina statisch (canonical, hreflang, alles in het bestand)
// en klopt de beschikbaarheid toch altijd, ook zonder JavaScript.

const fs = require("fs");
const path = require("path");
const dates = require("./dates");
const calendar = require("./calendar");
const season = require("./season");
const { holidayMap, HOLIDAY_COUNTRY } = require("./holidays");

const CALENDAR_MARK = "<!--tl:calendar-->";
const STATUS_MARK = "<!--tl:form-status-->";

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function createPageRenderer({ publicDir, content, routes, store, timeZone }) {
  const cache = new Map();

  function readPage(lang) {
    const slug = routes.slugs.availability[lang];
    const file = path.join(publicDir, lang, `${slug}.html`);
    const mtime = fs.statSync(file).mtimeMs;
    const hit = cache.get(file);
    if (hit && hit.mtime === mtime) return hit.html;
    const html = fs.readFileSync(file, "utf8");
    cache.set(file, { mtime, html });
    return html;
  }

  /** De kalender-HTML voor een taal: vanaf de huidige maand, twaalf maanden. */
  function renderCalendar(lang) {
    const c = content[lang].availability.calendar;
    const today = dates.today(timeZone);
    // Alleen de maanden dat de camping open is (1 maart t/m 31 oktober).
    const months = season.publicMonths(today);
    const to = `${dates.addMonths(months[months.length - 1], 1)}-01`;
    // Publiek is bezet gewoon bezet; alleen Siblu (juli) krijgt een eigen kleur
    // en tekst, want daar kan een gast nog wél terecht.
    const all = store.occupiedNightKinds(today, to);
    const occupied = new Set(all.keys());
    const kinds = new Map();
    for (const [d, info] of all) if (info.kind === "siblu") kinds.set(d, { kind: "siblu" });
    // Feestdagen en schoolvakanties van het land waar deze taal bij hoort:
    // een Franse gast ziet Franse vakanties, een Duitse Duitse.
    const country = HOLIDAY_COUNTRY[lang];
    const holidayRows = country ? store.holidaysBetween(country, today, to) : [];
    const holidays = holidayMap(holidayRows, dates);
    const labels = {
      free: c.srFree, busy: c.srBusy, past: c.srPast, today: c.today, siblu: c.srSiblu,
      holiday: c.srHoliday, school: c.srSchool,
    };
    return (
      `<div class="cal-months">\n` +
      calendar.renderMonthList(months, { occupied, kinds, holidays, holidayRows, today, lang, labels }) +
      `\n</div>\n` +
      calendar.renderLegend({
        free: c.legendFree,
        busy: c.legendBusy,
        siblu: c.legendSiblu,
        sibluUrl: c.sibluUrl,
        holiday: holidayRows.some((r) => r.kind === "public") ? c.legendHoliday : null,
        school: holidayRows.some((r) => r.kind === "school") ? c.legendSchool : null,
        departureNote: c.departureNote,
        closedNote: c.closedNote,
      }) +
      `\n<p class="cal-hint" data-cal-hint hidden>${esc(c.tapHint)}</p>`
    );
  }

  /**
   * @param {string} lang
   * @param {{kind:"sent"|"error", text:string}|null} [status]  melding voor de no-JS-route
   */
  function renderAvailabilityPage(lang, status = null) {
    let html = readPage(lang);
    html = html.replace(CALENDAR_MARK, renderCalendar(lang));
    const statusHtml = status
      ? `<p class="form-status ${status.kind === "error" ? "is-error" : "is-sent"}" role="status" tabindex="-1" id="melding">${esc(status.text)}</p>`
      : "";
    html = html.replace(STATUS_MARK, statusHtml);
    return html;
  }

  return { renderAvailabilityPage, renderCalendar };
}

module.exports = { createPageRenderer, CALENDAR_MARK, STATUS_MARK };
