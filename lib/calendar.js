// Het maandraster. Eén pure functie voor de publieke kalender (vrij/bezet, geen
// details) en het beheer (met soort per nacht en een link per dag). Geeft HTML
// terug; de aanroeper bepaalt wat "bezet" betekent en welke teksten erbij horen.
//
// Toegankelijkheid: bezet is nooit alleen een kleur. Elke bezette cel krijgt
// een arcering (CSS) en een visueel verborgen woord, en de tabel heeft echte
// kolomkoppen met de volledige dagnaam.

const dates = require("./dates");

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * @param {object} o
 * @param {string} o.ym          "2026-07"
 * @param {Set<string>} o.occupied  bezette nachten (YYYY-MM-DD)
 * @param {Map<string,{kind:string,id:number,name:string}>} [o.kinds]  per nacht de soort (beheer)
 * @param {string} o.today       YYYY-MM-DD
 * @param {string} o.lang        nl|fr|en|de
 * @param {string} [o.minDate]   dagen ervoor tellen als voorbij (standaard today)
 * @param {(date:string, info:object|undefined)=>string|null} [o.dayHref]  link per dag (beheer)
 * @param {object} o.labels      { free, busy, past, today }  woorden voor schermlezers
 */
function renderMonth(o) {
  const { ym, occupied, kinds, holidays, today, lang, labels } = o;
  const minDate = o.minDate || today;
  const grid = dates.monthGrid(ym);
  const heads = dates
    .weekdayNames(lang, "long")
    .map((long, i) => {
      const short = dates.weekdayNames(lang, "short")[i].replace(/\.$/, "");
      return `<th scope="col" abbr="${esc(long)}"><span aria-hidden="true">${esc(short)}</span><span class="visually-hidden">${esc(long)}</span></th>`;
    })
    .join("");

  const rows = grid
    .map((week) => {
      const cells = week
        .map((d) => {
          if (!d) return `<td class="cal-empty" aria-hidden="true"></td>`;
          const busy = occupied.has(d);
          const past = d < minDate;
          const info = kinds ? kinds.get(d) : undefined;
          const hol = holidays ? holidays.get(d) : undefined;
          const cls = ["cal-day"];
          if (busy) cls.push("is-busy");
          if (past) cls.push("is-past");
          if (d === today) cls.push("is-today");
          if (info) cls.push(`kind-${info.kind}`);
          if (hol && hol.public) cls.push("has-holiday");
          if (hol && hol.school) cls.push("has-school");
          const num = Number(d.slice(8, 10));
          const state = busy
            ? info && info.kind === "siblu" && labels.siblu
              ? labels.siblu
              : labels.busy
            : past
              ? labels.past
              : labels.free;
          const extra = hol
            ? (hol.public ? `, ${labels.holiday || "feestdag"}: ${hol.public}` : "") +
              (hol.school ? `, ${labels.school || "schoolvakantie"}: ${hol.school.name}` : "")
            : "";
          let inner =
            `<span class="cal-num">${num}</span>` +
            `<span class="visually-hidden">${esc(state + extra)}</span>`;
          const href = o.dayHref ? o.dayHref(d, info) : null;
          const title = [info && info.name, hol && hol.public, hol && hol.school && hol.school.name]
            .filter(Boolean)
            .join(" · ");
          if (href) inner = `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ""}>${inner}</a>`;
          else if (title) inner = `<span title="${esc(title)}">${inner}</span>`;
          const aria = d === today ? ` aria-current="date"` : "";
          return `<td class="${cls.join(" ")}" data-date="${d}"${aria}>${inner}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("\n      ");

  return `<div class="cal-month" data-month="${ym}">
  <table class="cal">
    <caption>${esc(dates.formatMonth(ym, lang))}</caption>
    <thead><tr>${heads}</tr></thead>
    <tbody>
      ${rows}
    </tbody>
  </table>${renderNotes(o)}
</div>`;
}

/**
 * Onder de maand een leesbare regel per feestdag en vakantie. Op een telefoon
 * is er geen hover, en een stipje alleen zegt niets; dit is het tweede kanaal.
 */
function renderNotes(o) {
  if (!o.holidayRows || !o.holidayRows.length) return "";
  const { ym, lang } = o;
  const first = `${ym}-01`;
  const next = `${dates.addMonths(ym, 1)}-01`;
  const inMonth = o.holidayRows.filter((r) => r.start_date < next && r.end_date >= first);
  if (!inMonth.length) return "";
  const items = inMonth
    .map((r) => {
      const when =
        r.start_date === r.end_date
          ? dates.formatShort(r.start_date, lang)
          : `${dates.formatShort(r.start_date, lang)} – ${dates.formatShort(r.end_date, lang)}`;
      const where = r.kind === "school" && !r.nationwide && r.regions ? ` (${r.regions})` : "";
      return `<li class="note-${r.kind}"><span class="note-mark" aria-hidden="true"></span><span>${esc(when)} ${esc(r.name)}${esc(where)}</span></li>`;
    })
    .join("");
  return `\n  <ul class="cal-notes">${items}</ul>`;
}

/** Een reeks maanden achter elkaar, vanaf fromYm. */
function renderMonths(o) {
  const out = [];
  for (let i = 0; i < o.count; i++) {
    out.push(renderMonth({ ...o, ym: dates.addMonths(o.fromYm, i) }));
  }
  return out.join("\n");
}

/** Een opgegeven rij maanden; de winter zit er niet bij (lib/season.js). */
function renderMonthList(months, o) {
  return months.map((ym) => renderMonth({ ...o, ym })).join("\n");
}

/** De legenda: vrij, bezet, (Siblu met link) en de regels over wisseldag en winter. */
function renderLegend(l) {
  const siblu = l.siblu
    ? `\n      <li><span class="cal-swatch kind-siblu" aria-hidden="true"></span>${
        l.sibluUrl
          ? `<a href="${esc(l.sibluUrl)}" target="_blank" rel="noopener">${esc(l.siblu)}</a>`
          : esc(l.siblu)
      }</li>`
    : "";
  const marks =
    (l.holiday ? `\n      <li><span class="note-mark mark-public" aria-hidden="true"></span>${esc(l.holiday)}</li>` : "") +
    (l.school ? `\n      <li><span class="note-mark mark-school" aria-hidden="true"></span>${esc(l.school)}</li>` : "");
  return `<div class="cal-legend">
    <ul>
      <li><span class="cal-swatch" aria-hidden="true"></span>${esc(l.free)}</li>
      <li><span class="cal-swatch is-busy" aria-hidden="true"></span>${esc(l.busy)}</li>${siblu}${marks}
    </ul>
    <p>${esc(l.departureNote)}</p>
    ${l.closedNote ? `<p>${esc(l.closedNote)}</p>` : ""}
  </div>`;
}

module.exports = { renderMonth, renderMonths, renderMonthList, renderLegend, renderNotes };
