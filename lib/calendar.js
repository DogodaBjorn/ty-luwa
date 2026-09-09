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
  const { ym, occupied, kinds, today, lang, labels } = o;
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
          const cls = ["cal-day"];
          if (busy) cls.push("is-busy");
          if (past) cls.push("is-past");
          if (d === today) cls.push("is-today");
          if (info) cls.push(`kind-${info.kind}`);
          const num = Number(d.slice(8, 10));
          const state = busy
            ? info && info.kind === "siblu" && labels.siblu
              ? labels.siblu
              : labels.busy
            : past
              ? labels.past
              : labels.free;
          let inner =
            `<span class="cal-num">${num}</span>` +
            `<span class="visually-hidden">${esc(state)}</span>`;
          const href = o.dayHref ? o.dayHref(d, info) : null;
          if (href) inner = `<a href="${esc(href)}"${info && info.name ? ` title="${esc(info.name)}"` : ""}>${inner}</a>`;
          const aria = d === today ? ` aria-current="date"` : "";
          return `<td class="${cls.join(" ")}" data-date="${d}"${aria}>${inner}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("\n      ");

  return `<table class="cal" data-month="${ym}">
    <caption>${esc(dates.formatMonth(ym, lang))}</caption>
    <thead><tr>${heads}</tr></thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`;
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
  return `<div class="cal-legend">
    <ul>
      <li><span class="cal-swatch" aria-hidden="true"></span>${esc(l.free)}</li>
      <li><span class="cal-swatch is-busy" aria-hidden="true"></span>${esc(l.busy)}</li>${siblu}
    </ul>
    <p>${esc(l.departureNote)}</p>
    ${l.closedNote ? `<p>${esc(l.closedNote)}</p>` : ""}
  </div>`;
}

module.exports = { renderMonth, renderMonths, renderMonthList, renderLegend };
