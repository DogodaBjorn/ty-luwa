// De schermen van het beheer. Nederlands, groot, één actie per scherm.
// Server-rendered HTML met minimale JavaScript (assets/beheer/beheer.js).
//
// Regels uit het ontwerp: tekst vanaf 18px, knoppen 56px hoog, geen modals,
// geen swipes, geen dropdowns (keuzetegels), altijd "Terug", elke actie
// omkeerbaar of bevestigd op een eigen scherm.

const dates = require("./dates");

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const KIND = {
  rented: { label: "Verhuurd", hint: "Er komen gasten" },
  option: { label: "Optie", hint: "Nog niet zeker" },
  own: { label: "Wij zelf", hint: "Wij zijn er zelf" },
  blocked: { label: "Gesloten", hint: "Niet beschikbaar, bijv. onderhoud" },
  siblu: { label: "Via Siblu", hint: "Siblu verhuurt (juli)" },
};

const STATUS = {
  new: "Nieuw",
  planned: "In de kalender",
  declined: "Afgewezen",
  archived: "Afgehandeld",
};

const LANG = { nl: "Nederlands", fr: "Frans", en: "Engels", de: "Duits" };

const ICON = {
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
  prev: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  next: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  plus: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  mail: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
};

function nights(a, b) {
  const n = dates.nightsBetween(a, b);
  return `${n} ${n === 1 ? "nacht" : "nachten"}`;
}

/** "za 12 – za 19 juli · 7 nachten" */
function rangeLine(a, b) {
  return `${dates.formatRange(a, b, "nl")} · ${nights(a, b)}`;
}

function party(r) {
  const parts = [`${r.adults} ${r.adults === 1 ? "volwassene" : "volwassenen"}`];
  if (r.children === 1) parts.push("1 kind");
  else if (r.children > 1) parts.push(`${r.children} kinderen`);
  return parts.join(" + ");
}

function periodTitle(p) {
  if (p.kind === "rented" || p.kind === "option") return p.guest_name || KIND[p.kind].label;
  return KIND[p.kind].label;
}

// ---- layout ---------------------------------------------------------------

function layout({ title, body, active = null, newCount = 0, admin = null, back = null }) {
  const tabs = admin
    ? `<nav class="tabs" aria-label="Beheer">
        <a href="/beheer"${active === "kalender" ? ' aria-current="page"' : ""}>Kalender</a>
        <a href="/beheer/aanvragen"${active === "aanvragen" ? ' aria-current="page"' : ""}>Aanvragen${
          newCount ? `<span class="badge">${newCount}</span>` : ""
        }</a>
        <a href="/beheer/hulp"${active === "hulp" ? ' aria-current="page"' : ""}>Hulp</a>
      </nav>`
    : "";
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#123F5D">
  <title>${esc(title)} · Ty LuWa beheer</title>
  <link rel="icon" href="/assets/favicon.svg">
  <link rel="stylesheet" href="/beheer/static/beheer.css">
</head>
<body>
  <header class="top">
    <div class="top-row">
      ${back ? `<a class="back" href="${esc(back)}">${ICON.back}<span>Terug</span></a>` : `<span class="brand">Ty LuWa <small>beheer</small></span>`}
      ${admin ? `<form method="post" action="/beheer/uitloggen" class="logout"><button type="submit">Uitloggen</button></form>` : ""}
    </div>
    ${tabs}
  </header>
  <main id="main">
${body}
  </main>
  <script src="/beheer/static/beheer.js" defer></script>
</body>
</html>
`;
}

function flashBox(flash) {
  if (!flash) return "";
  return `<div class="flash flash-${esc(flash.kind || "ok")}" role="status">
      <span>${esc(flash.text)}</span>
      ${flash.undo ? `<form method="post" action="${esc(flash.undo.href)}"><button type="submit" class="link">${esc(flash.undo.label)}</button></form>` : ""}
    </div>`;
}

// ---- inloggen -------------------------------------------------------------

function loginView({ error = null } = {}) {
  return layout({
    title: "Inloggen",
    body: `<section class="card narrow">
      <h1>Inloggen</h1>
      <p>Vul je e-mailadres in. Je krijgt een mail met een link en een code; daarmee ben je een jaar lang ingelogd op dit toestel.</p>
      ${error ? `<p class="flash flash-warn">${esc(error)}</p>` : ""}
      <form method="post" action="/beheer/inloggen">
        <label for="email">Je e-mailadres</label>
        <input id="email" type="email" name="email" required autocomplete="email" inputmode="email" autofocus>
        <button type="submit" class="btn primary">Stuur mij een inlogcode</button>
      </form>
    </section>`,
  });
}

function codeView({ error = null } = {}) {
  return layout({
    title: "Kijk in je mail",
    back: "/beheer/inloggen",
    body: `<section class="card narrow">
      <h1>Kijk in je mail</h1>
      <p>Als je adres bij ons bekend is, staat er nu een mail van Ty LuWa in je postvak. Tik op de link in die mail, <strong>of</strong> typ hier de code van 6 cijfers.</p>
      ${error ? `<p class="flash flash-warn">${esc(error)}</p>` : ""}
      <form method="post" action="/beheer/inlogcode">
        <label for="code">De code uit de mail</label>
        <input id="code" class="code" type="text" name="code" inputmode="numeric" pattern="[0-9 ]*" autocomplete="one-time-code" maxlength="7" required autofocus>
        <button type="submit" class="btn primary">Inloggen</button>
      </form>
      <p class="muted">Geen mail? Kijk bij ongewenste mail, of <a href="/beheer/inloggen">vraag een nieuwe code aan</a>.</p>
    </section>`,
  });
}

function linkView({ token }) {
  return layout({
    title: "Inloggen",
    body: `<section class="card narrow">
      <h1>Bijna ingelogd</h1>
      <p>Tik op de knop om in te loggen op het beheer van Ty LuWa.</p>
      <form method="post" action="/beheer/inloglink">
        <input type="hidden" name="token" value="${esc(token)}">
        <button type="submit" class="btn primary">Inloggen</button>
      </form>
    </section>`,
  });
}

function linkFailedView() {
  return layout({
    title: "Link werkt niet meer",
    body: `<section class="card narrow">
      <h1>Deze link werkt niet meer</h1>
      <p>Een inloglink werkt een half uur en één keer. Vraag gewoon een nieuwe aan.</p>
      <a class="btn primary" href="/beheer/inloggen">Nieuwe inlogcode aanvragen</a>
    </section>`,
  });
}

// ---- kalender -------------------------------------------------------------

function calendarView({ ym, gridHtml, periods, today, flash, newCount, admin, firstLogin }) {
  const prev = dates.addMonths(ym, -1);
  const next = dates.addMonths(ym, 1);
  const list = periods.length
    ? periods
        .map(
          (p) => `<li>
          <a class="period kind-${p.kind}" href="/beheer/periode/${p.id}">
            <span class="dot" aria-hidden="true"></span>
            <span class="period-main">
              <strong>${esc(rangeLine(p.arrival, p.departure))}</strong>
              <span>${esc(periodTitle(p))}${p.kind === "rented" || p.kind === "option" ? ` · ${KIND[p.kind].label}` : ""}</span>
            </span>
          </a>
        </li>`
        )
        .join("\n")
    : `<li class="empty">Deze maand staat er niets in de kalender.</li>`;

  return layout({
    title: dates.formatMonth(ym, "nl"),
    active: "kalender",
    newCount,
    admin,
    body: `
    ${firstLogin ? `<div class="flash flash-ok"><span>Je bent ingelogd. Zet deze pagina bij je favorieten; je blijft een jaar ingelogd op dit toestel.</span></div>` : ""}
    ${flashBox(flash)}
    ${newCount ? `<a class="notice" href="/beheer/aanvragen"><strong>${newCount} nieuwe ${newCount === 1 ? "aanvraag" : "aanvragen"}</strong><span>Bekijken ›</span></a>` : ""}
    <section class="month">
      <div class="month-nav">
        <a class="btn ghost" href="/beheer?m=${prev}" aria-label="Vorige maand">${ICON.prev}<span>vorige</span></a>
        <h1>${esc(dates.formatMonth(ym, "nl"))}</h1>
        <a class="btn ghost" href="/beheer?m=${next}" aria-label="Volgende maand">${ICON.next}<span>volgende</span></a>
      </div>
      ${ym !== dates.monthOf(today) ? `<p class="center"><a class="link" href="/beheer?m=${dates.monthOf(today)}">Naar vandaag</a></p>` : ""}
      ${gridHtml}
      <ul class="legend" aria-label="Legenda">
        ${Object.entries(KIND)
          .map(([k, v]) => `<li class="kind-${k}"><span class="dot" aria-hidden="true"></span>${esc(v.label)}</li>`)
          .join("")}
      </ul>
    </section>
    <section class="list">
      <h2>In ${esc(dates.formatMonth(ym, "nl"))}</h2>
      <ul class="periods">
        ${list}
      </ul>
    </section>
    <div class="bottom-action">
      <a class="btn primary" href="/beheer/periode/nieuw?m=${ym}">${ICON.plus}<span>Periode toevoegen</span></a>
    </div>`,
  });
}

// ---- periode --------------------------------------------------------------

function periodFormView({ isNew, id, values, error = null, overlap = [], request = null, formId, newCount, admin, back }) {
  const v = values;
  const kindTiles = Object.entries(KIND)
    .map(
      ([k, t]) => `<label class="tile kind-${k}">
          <input type="radio" name="kind" value="${k}"${v.kind === k ? " checked" : ""} required>
          <span class="dot" aria-hidden="true"></span>
          <span class="tile-text"><strong>${esc(t.label)}</strong><span>${esc(t.hint)}</span></span>
        </label>`
    )
    .join("\n");

  const overlapBox = overlap.length
    ? `<div class="flash flash-warn overlap">
        <strong>Let op: deze dagen overlappen met</strong>
        <ul>${overlap
          .map((p) => `<li><a href="/beheer/periode/${p.id}">${esc(rangeLine(p.arrival, p.departure))} · ${esc(periodTitle(p))}</a></li>`)
          .join("")}</ul>
        <p>Op een wisseldag mag dat (de een vertrekt, de ander komt). Anders: pas de datums aan.</p>
        <label class="check"><input type="checkbox" name="force" value="1"> Toch opslaan, ik weet het zeker</label>
      </div>`
    : "";

  const requestBox = request
    ? `<div class="notice static">
        <strong>Uit aanvraag van ${esc(request.name)}</strong>
        <span>${esc(rangeLine(request.arrival, request.departure))} · ${esc(party(request))} · ${esc(LANG[request.lang] || request.lang)}</span>
      </div>`
    : "";

  return layout({
    title: isNew ? "Periode toevoegen" : "Periode bewerken",
    back: back || "/beheer",
    newCount,
    admin,
    body: `<section class="card">
      <h1>${isNew ? "Periode toevoegen" : "Periode bewerken"}</h1>
      ${error ? `<p class="flash flash-warn">${esc(error)}</p>` : ""}
      ${requestBox}
      <form method="post" action="${isNew ? "/beheer/periode/nieuw" : `/beheer/periode/${id}`}" data-period-form>
        <input type="hidden" name="form_id" value="${esc(formId)}">
        ${request ? `<input type="hidden" name="request_id" value="${request.id}">` : ""}
        <fieldset>
          <legend>Wat is het?</legend>
          <div class="tiles">
            ${kindTiles}
          </div>
        </fieldset>
        <div class="row">
          <div>
            <label for="arrival">Aankomst</label>
            <input id="arrival" type="date" name="arrival" value="${esc(v.arrival)}" required>
          </div>
          <div>
            <label for="departure">Vertrek</label>
            <input id="departure" type="date" name="departure" value="${esc(v.departure)}" required>
          </div>
        </div>
        <p class="nights" data-nights aria-live="polite">${v.arrival && v.departure && v.arrival < v.departure ? esc(`${nights(v.arrival, v.departure)}, van ${dates.formatLong(v.arrival, "nl")} tot ${dates.formatLong(v.departure, "nl")}`) : ""}</p>
        ${overlapBox}
        <div class="guest" data-guest-fields>
          <label for="guestName">Naam gast</label>
          <input id="guestName" type="text" name="guestName" value="${esc(v.guestName)}" autocomplete="off">
          <label for="guestPhone">Telefoon</label>
          <input id="guestPhone" type="tel" name="guestPhone" value="${esc(v.guestPhone)}" autocomplete="off">
          <label for="guestEmail">E-mail</label>
          <input id="guestEmail" type="email" name="guestEmail" value="${esc(v.guestEmail)}" autocomplete="off">
        </div>
        <label for="notes">Opmerking</label>
        <textarea id="notes" name="notes" rows="3">${esc(v.notes)}</textarea>
        <button type="submit" class="btn primary">Opslaan</button>
      </form>
      ${isNew ? "" : `<a class="btn danger-outline" href="/beheer/periode/${id}/verwijderen">Verwijderen</a>`}
    </section>`,
  });
}

function deleteView({ period, newCount, admin }) {
  return layout({
    title: "Verwijderen?",
    back: `/beheer/periode/${period.id}`,
    newCount,
    admin,
    body: `<section class="card narrow">
      <h1>Periode verwijderen?</h1>
      <p class="big">${esc(rangeLine(period.arrival, period.departure))}<br>${esc(periodTitle(period))}</p>
      <p>Je kunt dit meteen daarna nog terugzetten.</p>
      <a class="btn primary" href="/beheer/periode/${period.id}">Nee, terug</a>
      <form method="post" action="/beheer/periode/${period.id}/verwijderen">
        <button type="submit" class="btn danger-outline">Ja, verwijderen</button>
      </form>
    </section>`,
  });
}

// ---- aanvragen ------------------------------------------------------------

function requestCard(r, overlap) {
  const free = !overlap.length;
  return `<li>
      <a class="request status-${r.status}" href="/beheer/aanvraag/${r.id}">
        <span class="request-main">
          <strong>${esc(rangeLine(r.arrival, r.departure))}</strong>
          <span>${esc(r.name)} · ${esc(party(r))} · in het ${esc(LANG[r.lang] || r.lang)}</span>
          <span class="${free ? "ok" : "warn"}">${
            r.status === "new"
              ? free
                ? "Deze dagen zijn vrij"
                : `Overlapt met ${esc(overlap.map((p) => `${dates.formatRange(p.arrival, p.departure, "nl")} (${periodTitle(p)})`).join(", "))}`
              : STATUS[r.status]
          }</span>
        </span>
      </a>
    </li>`;
}

function requestsView({ tab, requests, overlapOf, newCount, admin, flash }) {
  const items = requests.length
    ? requests.map((r) => requestCard(r, overlapOf(r))).join("\n")
    : `<li class="empty">${tab === "nieuw" ? "Geen nieuwe aanvragen. Mooi rustig." : "Nog niets afgehandeld."}</li>`;
  return layout({
    title: "Aanvragen",
    active: "aanvragen",
    newCount,
    admin,
    body: `${flashBox(flash)}
    <section class="list">
      <h1>Aanvragen</h1>
      <div class="subtabs">
        <a href="/beheer/aanvragen"${tab === "nieuw" ? ' aria-current="page"' : ""}>Nieuw${newCount ? ` (${newCount})` : ""}</a>
        <a href="/beheer/aanvragen?tab=afgehandeld"${tab === "afgehandeld" ? ' aria-current="page"' : ""}>Afgehandeld</a>
      </div>
      <ul class="requests">
        ${items}
      </ul>
    </section>`,
  });
}

function requestDetailView({ request: r, overlap, mailto, periods, newCount, admin, flash }) {
  const first = r.name.split(" ")[0];
  const received = new Date(r.created_at);
  const receivedText = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Paris", dateStyle: "long", timeStyle: "short" }).format(received);
  const linked = periods.length
    ? `<p class="ok">Staat in de kalender: ${periods
        .map((p) => `<a href="/beheer/periode/${p.id}">${esc(rangeLine(p.arrival, p.departure))} · ${esc(KIND[p.kind].label)}</a>`)
        .join(", ")}</p>`
    : "";
  const actions =
    r.status === "new" || r.status === "declined" || r.status === "archived"
      ? `<a class="btn primary" href="${esc(mailto)}">${ICON.mail}<span>Mail ${esc(first)}</span></a>
        <a class="btn" href="/beheer/periode/nieuw?aanvraag=${r.id}&amp;soort=option">Zet in kalender als optie</a>
        <a class="btn" href="/beheer/periode/nieuw?aanvraag=${r.id}&amp;soort=rented">Zet in kalender als verhuurd</a>
        <div class="minor">
          ${r.status !== "declined" ? `<form method="post" action="/beheer/aanvraag/${r.id}/status"><input type="hidden" name="status" value="declined"><button type="submit" class="link">Afwijzen</button></form>` : ""}
          ${r.status !== "archived" ? `<form method="post" action="/beheer/aanvraag/${r.id}/status"><input type="hidden" name="status" value="archived"><button type="submit" class="link">Afhandelen zonder kalender</button></form>` : ""}
          ${r.status !== "new" ? `<form method="post" action="/beheer/aanvraag/${r.id}/status"><input type="hidden" name="status" value="new"><button type="submit" class="link">Terug naar nieuw</button></form>` : ""}
        </div>`
      : `<a class="btn primary" href="${esc(mailto)}">${ICON.mail}<span>Mail ${esc(first)}</span></a>`;

  return layout({
    title: `Aanvraag van ${r.name}`,
    back: "/beheer/aanvragen",
    newCount,
    admin,
    body: `${flashBox(flash)}
    <section class="card">
      <p class="eyebrow">${esc(STATUS[r.status])} · ontvangen ${esc(receivedText)}</p>
      <h1>${esc(r.name)}</h1>
      <p class="big">${esc(rangeLine(r.arrival, r.departure))}</p>
      <dl class="facts">
        <dt>Wie</dt><dd>${esc(party(r))}</dd>
        <dt>Taal</dt><dd>${esc(LANG[r.lang] || r.lang)} (via ${esc(r.host || "de site")})</dd>
        <dt>E-mail</dt><dd><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></dd>
      </dl>
      ${r.message ? `<h2>Bericht</h2><blockquote>${esc(r.message).replace(/\n/g, "<br>")}</blockquote>` : `<p class="muted">Geen bericht erbij.</p>`}
      ${linked}
      <p class="${overlap.length ? "warn" : "ok"}">${
        overlap.length
          ? `Let op: overlapt met ${esc(overlap.map((p) => `${dates.formatRange(p.arrival, p.departure, "nl")} (${periodTitle(p)})`).join(", "))}`
          : "Deze dagen zijn vrij in de kalender."
      }</p>
      <div class="actions">
        ${actions}
      </div>
    </section>`,
  });
}

// ---- hulp -----------------------------------------------------------------

function helpView({ html, newCount, admin, backupHref }) {
  return layout({
    title: "Hulp",
    active: "hulp",
    newCount,
    admin,
    body: `<section class="card prose">
      ${html}
      <h2>Reservekopie</h2>
      <p>Alles wat in de kalender en bij de aanvragen staat, in één bestand. Björn krijgt dit ook elke week automatisch per mail.</p>
      <a class="btn" href="${esc(backupHref)}" download>Reservekopie downloaden</a>
    </section>`,
  });
}

/** Heel klein beetje Markdown: koppen, lijsten, vet, alinea's. Genoeg voor de handleiding. */
function markdownToHtml(md) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const out = [];
  let list = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = Math.min(h[1].length + 0, 3);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
    } else if (ol || ul) {
      const tag = ol ? "ol" : "ul";
      if (list !== tag) {
        closeList();
        list = tag;
        out.push(`<${tag}>`);
      }
      out.push(`<li>${inline((ol || ul)[1])}</li>`);
    } else if (!line) {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

module.exports = {
  esc,
  KIND,
  STATUS,
  LANG,
  rangeLine,
  party,
  periodTitle,
  layout,
  loginView,
  codeView,
  linkView,
  linkFailedView,
  calendarView,
  periodFormView,
  deleteView,
  requestsView,
  requestDetailView,
  helpView,
  markdownToHtml,
};
