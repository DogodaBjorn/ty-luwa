// De schermen van het beheer. Nederlands, groot, één actie per scherm.
// Server-rendered HTML met minimale JavaScript (assets/beheer/beheer.js).
//
// Regels uit het ontwerp: tekst vanaf 18px, knoppen 56px hoog, geen modals,
// geen swipes, geen dropdowns (keuzetegels), altijd "Terug", elke actie
// omkeerbaar of bevestigd op een eigen scherm.

const dates = require("./dates");
const season = require("./season");

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
  app: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
  // Het deel-icoontje van de iPhone, voor wie zelf op het beginscherm zet.
  share: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="m8 7 4-4 4 4"/><path d="M20 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/></svg>',
};

/** Een samenvatting die op een kaartje past. */
function shorten(s, max) {
  const t = String(s || "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…";
}

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
  <link rel="manifest" href="/beheer/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/assets/brand/ty-luwa-icoon-apple-180.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Ty LuWa">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
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

function loginView({ error = null, fromApp = false } = {}) {
  return layout({
    title: "Inloggen",
    body: `<section class="card narrow">
      <h1>Inloggen</h1>
      ${
        fromApp
          ? `<p class="flash flash-ok"><span>Je opent de app voor het eerst. Hij vraagt één keer om in te loggen; daarna blijf je ook hier een jaar ingelogd. Werkt de knop in de mail niet? <strong>Typ dan de zes cijfers over</strong> — dat werkt altijd.</span></p>`
          : ""
      }
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

function calendarView({ ym, gridHtml, periods, today, flash, newCount, admin, firstLogin, showAppInvite = false }) {
  // Over de wintersluiting heen: oktober springt naar maart en terug.
  const prev = season.stepMonth(ym, -1);
  const next = season.stepMonth(ym, 1);
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
    ${firstLogin ? `<div class="flash flash-ok"><span>Je bent ingelogd. Je blijft een jaar ingelogd op dit toestel.</span><a class="link" href="/beheer/uitleg">Lees de uitleg</a></div>` : ""}
    ${flashBox(flash)}
    ${newCount ? `<a class="notice" href="/beheer/aanvragen"><strong>${newCount} nieuwe ${newCount === 1 ? "aanvraag" : "aanvragen"}</strong><span>Bekijken ›</span></a>` : ""}
    ${
      showAppInvite
        ? `<div class="notice static invite" data-app-invite>
      <span class="period-main">
        <strong>Zet het beheer op je beginscherm</strong>
        <span>Dan hoef je het adres nooit meer in te typen. Je vindt dit altijd terug onder Hulp.</span>
      </span>
      <span class="invite-actions">
        <a class="btn small" href="/beheer/app?van=kalender">Laat zien</a>
        <form method="post" action="/beheer/app/niet-nu"><button type="submit" class="link">Niet nu</button></form>
      </span>
    </div>`
        : ""
    }
    <section class="month">
      <div class="month-nav">
        <a class="btn ghost" href="/beheer?m=${prev}" aria-label="Vorige maand">${ICON.prev}<span>vorige</span></a>
        <h1>${esc(dates.formatMonth(ym, "nl"))}</h1>
        <a class="btn ghost" href="/beheer?m=${next}" aria-label="Volgende maand">${ICON.next}<span>volgende</span></a>
      </div>
      ${ym !== season.nextOpenMonth(dates.monthOf(today)) ? `<p class="center"><a class="link" href="/beheer?m=${season.nextOpenMonth(dates.monthOf(today))}">Naar vandaag</a></p>` : ""}
      ${season.isOpenMonth(dates.monthOf(today)) ? "" : `<p class="muted center">De camping is nu gesloten (november tot en met februari). Je ziet het eerstvolgende seizoen.</p>`}
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

  const closed = v.arrival && v.departure && v.arrival < v.departure ? season.closedNights(v.arrival, v.departure) : [];
  const closedBox = closed.length
    ? `<p class="flash flash-warn">Let op: ${closed.length === 1 ? "één nacht valt" : `${closed.length} nachten vallen`} in de wintersluiting (november tot en met februari). Opslaan mag; gasten kunnen die dagen niet aanvragen.</p>`
    : "";

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
        ${closedBox}
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

function sentList(messages) {
  if (!messages || !messages.length) return "";
  const fmt = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" });
  return `<h2>Al verstuurd</h2>
      <ul class="sent">
        ${messages
          .map(
            (m) => `<li>
          <span class="muted">${esc(fmt.format(new Date(m.sent_at)))}${m.mail_status && m.mail_status !== "ok" ? ` · <span class="warn">niet verstuurd: ${esc(m.mail_status)}</span>` : ""}</span>
          <p>${esc(m.body_nl).replace(/\n/g, "<br>")}</p>
        </li>`
          )
          .join("")}
      </ul>`;
}

/** De bijzonderheden zoals ze ook in de meldingsmail staan. */
function highlightsHtml(items) {
  if (!items || !items.length) return "";
  return `<ul class="highlights">
        ${items
          .map(
            (i) => `<li class="tone-${esc(i.tone)}">
          <strong>${esc(i.title)}</strong>
          ${(i.lines || []).map((l) => `<p>${esc(l).replace(/\n/g, "<br>")}</p>`).join("")}
          ${
            i.rows && i.rows.length
              ? `<dl>${i.rows
                  .map((row) => `<dt>${esc(row.label)}</dt><dd>${esc(row.value).replace(/\n/g, "<br>")}</dd>`)
                  .join("")}</dl>`
              : ""
          }
        </li>`
          )
          .join("")}
      </ul>`;
}

function requestDetailView({ request: r, highlights = [], mailto, periods, messages = [], translatorEnabled = false, draft = "", newCount, admin, flash }) {
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
      ${r.message ? `<h2>Bericht</h2><blockquote${r.lang !== "nl" ? ` lang="${esc(r.lang)}"` : ""}>${esc(r.message).replace(/\n/g, "<br>")}</blockquote>` : `<p class="muted">Geen bericht erbij.</p>`}
      ${r.message && r.lang !== "nl" ? (r.message_nl ? `<p class="eyebrow">In het Nederlands</p><blockquote class="translated">${esc(r.message_nl).replace(/\n/g, "<br>")}</blockquote>` : `<p class="muted">Vertaling naar het Nederlands is niet beschikbaar (vertaler niet ingesteld).</p>`) : ""}
      ${linked}
      <h2>Bijzonderheden</h2>
      ${highlightsHtml(highlights)}
      <div class="actions">
        ${actions}
      </div>
    </section>
    <section class="card reply">
      <h2>Antwoord sturen</h2>
      <p>Typ gewoon Nederlands. ${
        r.lang === "nl"
          ? "De gast is Nederlandstalig; het gaat zo weg, vanaf Ty LuWa."
          : translatorEnabled
            ? `De site vertaalt het naar het ${esc(LANG[r.lang] || r.lang)}, laat je eerst het resultaat zien, en verstuurt het dan vanaf Ty LuWa. Antwoorden van de gast komen in jullie eigen mailbox.`
            : "Let op: de vertaler is nog niet ingesteld, dus het antwoord gaat in het Nederlands."
      }</p>
      <form method="post" action="/beheer/aanvraag/${r.id}/antwoord">
        <label for="reply">Je antwoord aan ${esc(first)}</label>
        <textarea id="reply" name="body" rows="6" required maxlength="4000" placeholder="Bijvoorbeeld: Ja, die week is vrij. Fijn dat jullie komen! De prijs is …">${esc(draft)}</textarea>
        <button type="submit" class="btn primary">${r.lang === "nl" ? "Bekijk en verstuur" : "Vertaal en bekijk"}</button>
      </form>
      ${sentList(messages)}
    </section>`,
  });
}

/** Het voorbeeld: Nederlands naast de vertaling, dan pas versturen. */
function replyPreviewView({ request: r, bodyNl, translated, error = null, newCount, admin }) {
  const first = r.name.split(" ")[0];
  const langName = LANG[r.lang] || r.lang;
  return layout({
    title: `Antwoord aan ${r.name}`,
    back: `/beheer/aanvraag/${r.id}`,
    newCount,
    admin,
    body: `<section class="card">
      <h1>Antwoord aan ${esc(first)}</h1>
      ${error ? `<p class="flash flash-warn">${esc(error)}</p>` : ""}
      ${
        translated === null
          ? `<p class="flash flash-warn">De vertaler is niet ingesteld. Het antwoord gaat in het Nederlands.</p>`
          : r.lang !== "nl"
            ? `<p class="muted">Zo krijgt ${esc(first)} het, in het ${esc(langName)}. De Nederlandse tekst gaat er ter controle onder mee.</p>`
            : ""
      }
      <div class="preview">
        ${r.lang !== "nl" && translated ? `<div><p class="eyebrow">${esc(langName)}</p><blockquote lang="${esc(r.lang)}">${esc(translated).replace(/\n/g, "<br>")}</blockquote></div>` : ""}
        <div><p class="eyebrow">Nederlands</p><blockquote>${esc(bodyNl).replace(/\n/g, "<br>")}</blockquote></div>
      </div>
      <form method="post" action="/beheer/aanvraag/${r.id}/antwoord/verstuur">
        <input type="hidden" name="body" value="${esc(bodyNl)}">
        <input type="hidden" name="translated" value="${esc(translated || "")}">
        <button type="submit" class="btn primary">${ICON.mail}<span>Verstuur aan ${esc(first)}</span></button>
      </form>
      <form method="post" action="/beheer/aanvraag/${r.id}/antwoord/bewerk">
        <input type="hidden" name="body" value="${esc(bodyNl)}">
        <button type="submit" class="btn">Terug en aanpassen</button>
      </form>
    </section>`,
  });
}

// ---- hulp -----------------------------------------------------------------

/** De uitleg: een kaart per hoofdstuk. */
function uitlegIndexView({ chapters, newCount, admin }) {
  return layout({
    title: "Uitleg",
    back: "/beheer/hulp",
    newCount,
    admin,
    body: `<section class="card">
      <h1>Uitleg over de site</h1>
      <p>Acht korte hoofdstukken over hoe alles werkt. Je kunt ze in elke volgorde lezen; er gaat niets stuk van kijken.</p>
      <a class="btn" href="/beheer/uitleg/alles">Alles achter elkaar, of afdrukken</a>
    </section>
    <ul class="chapters">
      ${chapters
        .map(
          (c, i) => `<li><a href="/beheer/uitleg/${esc(c.slug)}">
        <span class="chapter-number" aria-hidden="true">${i + 1}</span>
        <span class="period-main"><strong>${esc(c.title)}</strong><span>${esc(shorten(c.summary, 120))}</span></span>
      </a></li>`
        )
        .join("\n")}
    </ul>`,
  });
}

function tocHtml(chapter) {
  if (!chapter.headings || chapter.headings.length < 2) return "";
  return `<nav class="toc" aria-label="In dit hoofdstuk">
        <p>In dit hoofdstuk</p>
        <ul>${chapter.headings.map((h) => `<li><a href="#${esc(h.slug)}">${esc(h.title)}</a></li>`).join("")}</ul>
      </nav>`;
}

/** Telefoon of laptop: welke schermafbeeldingen je wilt zien. */
function shotSwitch() {
  return `<div class="shot-switch" data-shot-switch hidden>
        <span>Ik doe het op:</span>
        <button type="button" data-shots="mob">telefoon</button>
        <button type="button" data-shots="lap">laptop</button>
      </div>`;
}

function uitlegChapterView({ chapter, prev, next, newCount, admin }) {
  return layout({
    title: chapter.title,
    back: "/beheer/uitleg",
    newCount,
    admin,
    body: `${shotSwitch()}
    <section class="card prose">
      ${tocHtml(chapter)}
      ${chapter.html}
    </section>
    <nav class="chapter-nav">
      ${prev ? `<a class="btn" href="/beheer/uitleg/${esc(prev.slug)}">‹ ${esc(prev.title)}</a>` : ""}
      ${next ? `<a class="btn primary" href="/beheer/uitleg/${esc(next.slug)}">${esc(next.title)} ›</a>` : `<a class="btn primary" href="/beheer">Terug naar de kalender</a>`}
    </nav>`,
  });
}

/** Alle hoofdstukken achter elkaar, om te lezen of af te drukken. */
function uitlegAllView({ chapters, newCount, admin }) {
  return layout({
    title: "De hele uitleg",
    back: "/beheer/uitleg",
    newCount,
    admin,
    body: `${shotSwitch()}
    <section class="card prose">
      <h1>De hele uitleg</h1>
      <p class="no-print">Alle hoofdstukken achter elkaar. Handig om door te lezen, of om af te drukken en naast je laptop te leggen.</p>
      <button type="button" class="btn primary no-print" data-print>Afdrukken</button>
      <nav class="toc" aria-label="Inhoud">
        <p>Inhoud</p>
        <ul>${chapters.map((c, i) => `<li><a href="#h${i + 1}">${i + 1}. ${esc(c.title)}</a></li>`).join("")}</ul>
      </nav>
    </section>
    ${chapters
      .map(
        (c, i) => `<section class="card prose chapter" id="h${i + 1}">
      ${c.html}
    </section>`
      )
      .join("\n    ")}`,
  });
}

/**
 * Het beheer als app op het beginscherm. De stappen staan er altijd, ook
 * zonder JavaScript: de knop erboven verschijnt alleen in een browser die
 * echt kan installeren (Chrome en Edge). Geen gokken op de user-agent.
 */
function appView({ newCount, admin, back }) {
  return layout({
    title: "Op je beginscherm",
    back: back || "/beheer/hulp",
    newCount,
    admin,
    body: `<section class="card">
      <h1>Zet het beheer op je beginscherm</h1>
      <p>Dan staat Ty LuWa tussen je andere apps en hoef je het adres nooit meer in te typen. Je blijft gewoon ingelogd; er wordt niets geïnstalleerd uit een appwinkel.</p>
      <p class="install-ok" data-app-done hidden><strong>Gelukt.</strong> Het huisje van Ty LuWa staat nu bij je apps. Je kunt dit scherm sluiten.</p>
      <button type="button" class="btn primary" data-app-install hidden>${ICON.app}<span>Zet Ty LuWa op mijn scherm</span></button>
      <p class="muted" data-app-install-hint hidden>Eén tik, en dan nog één keer op <strong>Installeren</strong>.</p>
    </section>
    <section class="card" data-app-steps>
      <h2>Op je telefoon</h2>
      <p class="muted">Android, in Chrome:</p>
      <ol class="steps">
        <li><span>Tik rechtsboven op de <strong>drie puntjes</strong>.</span></li>
        <li><span>Kies <strong>App installeren</strong> (of <em>Toevoegen aan startscherm</em>).</span></li>
        <li><span>Tik op <strong>Installeren</strong>. Klaar.</span></li>
      </ol>
      <p class="muted">iPhone, in Safari:</p>
      <ol class="steps">
        <li><span>Tik onderin op het deel-icoontje <span class="glyph">${ICON.share}</span> — het vierkantje met het pijltje omhoog.</span></li>
        <li><span>Veeg omlaag tot je <strong>Zet op beginscherm</strong> ziet.</span></li>
        <li><span>Tik op <strong>Voeg toe</strong>.</span></li>
      </ol>
      <p class="muted">Op de iPhone vraagt de app de eerste keer opnieuw om inloggen. Dat hoort zo. Typ dan de zes cijfers uit de mail over; de knop in de mail opent je gewone browser en niet de app.</p>
      <h2>Op de laptop</h2>
      <ul>
        <li><strong>Chrome of Edge:</strong> de knop hierboven doet het. Zie je hem niet, klik dan op het installatie-icoontje rechts in de adresbalk.</li>
        <li><strong>Safari op een Mac:</strong> menu <strong>Archief</strong> → <strong>Voeg toe aan Dock</strong>.</li>
        <li><strong>Firefox kan dit niet.</strong> Zet de pagina daar bij je favorieten met Ctrl + D.</li>
      </ul>
      <h2>Weer weg doen</h2>
      <p>Hou het icoontje ingedrukt en kies verwijderen, net als bij elke andere app. Het beheer blijft gewoon bereikbaar op ty-luwa.nl/beheer.</p>
    </section>`,
  });
}

function helpView({ html, newCount, admin, backupHref }) {
  return layout({
    title: "Hulp",
    active: "hulp",
    newCount,
    admin,
    body: `<section class="card prose">
      ${html}
      <h2>Het beheer op je beginscherm</h2>
      <p>Zet Ty LuWa tussen je andere apps, op je telefoon en op de laptop. Dan hoef je het adres nooit meer in te typen.</p>
      <a class="btn" href="/beheer/app">Laat zien hoe</a>
      <h2>Uitleg over de hele site</h2>
      <p>Acht korte hoofdstukken met plaatjes: de website, de kalender, inloggen, aanvragen, antwoorden, de planning bijhouden, en wat te doen als iets niet lukt.</p>
      <a class="btn primary" href="/beheer/uitleg">Naar de uitleg</a>
      <h2>Reservekopie</h2>
      <p>Alles wat in de kalender en bij de aanvragen staat, in één bestand. Björn krijgt dit ook elke week automatisch per mail.</p>
      <a class="btn" href="${esc(backupHref)}" download>Reservekopie downloaden</a>
    </section>`,
  });
}

/**
 * Heel klein beetje Markdown: koppen, lijsten, vet, alinea's, afbeeldingen en
 * "> tip"-blokken. Genoeg voor de handleiding en de uitleg.
 */
/** "Een periode toevoegen" → "een-periode-toevoegen", voor de inhoudsopgave. */
function slug(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** De tussenkoppen van een hoofdstuk, voor de inhoudsopgave. */
function headings(md) {
  return [...String(md).matchAll(/^##\s+(.*)$/gm)].map((m) => ({ title: m[1].trim(), slug: slug(m[1].trim()) }));
}

function markdownToHtml(md) {
  const inline = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  const out = [];
  let list = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const img = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line);
    const quote = /^>\s+(.*)$/.exec(line);
    if (img) {
      closeList();
      // Twee opnames van hetzelfde scherm: telefoon en laptop. De CSS toont
      // standaard wat bij de schermbreedte past; de schakelaar bovenaan
      // overschrijft dat, voor wie op de laptop leest en op de telefoon doet.
      const src = esc(img[2]);
      const laptop = src.replace(/\.png$/, "-laptop.png");
      out.push(
        `<figure class="shot">` +
          `<img class="shot-mob" src="${src}" alt="${esc(img[1])}" loading="lazy">` +
          `<img class="shot-lap" src="${laptop}" alt="${esc(img[1])}" loading="lazy">` +
          (img[1] ? `<figcaption>${inline(img[1])}</figcaption>` : "") +
          `</figure>`
      );
      continue;
    }
    if (quote) {
      closeList();
      out.push(`<p class="tip">${inline(quote[1])}</p>`);
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = Math.min(h[1].length + 0, 3);
      const id = level === 2 ? ` id="${slug(h[2])}"` : "";
      out.push(`<h${level}${id}>${inline(h[2])}</h${level}>`);
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
  slug,
  headings,
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
  replyPreviewView,
  uitlegIndexView,
  uitlegChapterView,
  uitlegAllView,
  appView,
  helpView,
  markdownToHtml,
};
