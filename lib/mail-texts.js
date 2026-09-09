// De mails zelf: welke blokken erin staan. De opmaak zit in lib/mail-html.js
// en lib/mail-text.js; hier staat alleen wat er in de mail hoort.
//
// Gastmails gebruiken de teksten uit content/site-content.json, in de taal van
// de gast. De mails aan Luuk en Wanda zijn Nederlands en staan hier.

const dates = require("./dates");
const b = require("./mail-doc");

function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function nightsText(c, n) {
  return n === 1 ? c.calendar.night : fill(c.calendar.nights, { n });
}

function partyText(c, adults, children) {
  const parts = [adults === 1 ? c.party.adult : fill(c.party.adults, { n: adults })];
  if (children === 1) parts.push(c.party.child);
  else if (children > 1) parts.push(fill(c.party.children, { n: children }));
  return parts.join(" + ");
}

const LANG_NL = { nl: "Nederlands", fr: "Frans", en: "Engels", de: "Duits" };
const SITE_NL = { nl: "ty-luwa.nl", fr: "ty-luwa.fr", en: "ty-luwa.com", de: "ty-luwa.com/de" };

/** "2 volwassenen + 1 kind", in het Nederlands. */
function partyNl(adults, children) {
  const parts = [`${adults} ${adults === 1 ? "volwassene" : "volwassenen"}`];
  if (children === 1) parts.push("1 kind");
  else if (children > 1) parts.push(`${children} kinderen`);
  return parts.join(" + ");
}

function nightsNl(n) {
  return `${n} ${n === 1 ? "nacht" : "nachten"}`;
}

// ---------------------------------------------------------------- melding

/**
 * De mail aan Luuk en Wanda: wie, wanneer, vanaf welke site, wat de gast
 * schreef, en wat er in en rond die dagen speelt.
 */
function notify(req, { beheerUrl, highlights = [], messageNl, receivedAt } = {}) {
  const n = dates.nightsBetween(req.arrival, req.departure);
  const period = dates.formatRangeLong(req.arrival, req.departure, "nl");
  const site = req.host || SITE_NL[req.lang] || "de site";
  const link = `${beheerUrl}/aanvraag/${req.id}`;
  const received = receivedAt || req.created_at;
  const today = dates.today();

  const blocks = [
    b.eyebrow(`Nieuwe aanvraag · via ${site}`),
    b.h(req.name, { level: 1 }),
    b.p(`${period} · ${nightsNl(n)}`, { tone: "lead" }),
    b.facts([
      { label: "Wie", value: partyNl(req.adults, req.children) },
      { label: "Aankomst", value: `${dates.formatLong(req.arrival, "nl")} (${dates.relativeAhead(today, req.arrival)})` },
      { label: "Vertrek", value: dates.formatLong(req.departure, "nl") },
      { label: "E-mail", value: req.email, href: `mailto:${req.email}` },
      { label: "Taal en site", value: `${LANG_NL[req.lang] || req.lang}, via ${site}` },
      received
        ? {
            label: "Binnengekomen",
            value: new Intl.DateTimeFormat("nl-NL", {
              timeZone: "Europe/Paris",
              dateStyle: "long",
              timeStyle: "short",
            }).format(new Date(received)),
          }
        : null,
    ]),
  ];

  if (req.message) {
    blocks.push(b.quote({ text: req.message, lang: req.lang, caption: `Het bericht van ${req.name.split(" ")[0]}` }));
    if (req.lang !== "nl") {
      if (messageNl && messageNl !== req.message) {
        blocks.push(b.quote({ text: messageNl, lang: "nl", caption: "In het Nederlands (automatisch vertaald)", tone: "muted" }));
      } else {
        blocks.push(b.p("Vertalen lukte niet. Open je de aanvraag in het beheer, dan wordt het daar alsnog geprobeerd.", { tone: "muted" }));
      }
    }
  } else {
    blocks.push(b.p("Geen bericht erbij.", { tone: "muted" }));
  }

  blocks.push(b.button({ href: link, label: "Open de aanvraag in het beheer" }));

  if (highlights.length) {
    blocks.push(b.divider(), b.h("Bijzonderheden"));
    for (const item of highlights) {
      blocks.push(b.notice({ tone: item.tone, title: item.title, lines: item.lines, rows: item.rows }));
    }
  }

  blocks.push(
    b.footer([
      `${req.name.split(" ")[0]} heeft automatisch een bevestiging van ontvangst gekregen, in het ${LANG_NL[req.lang] || req.lang}. Daarin staat dat dit nog geen boeking is en dat jullie persoonlijk contact opnemen.`,
      "Antwoorden doe je in het beheer: typ Nederlands, de site vertaalt het en laat het je eerst zien.",
      `Let op: antwoord je rechtstreeks op deze mail, dan gaat je antwoord naar ${req.name.split(" ")[0]} zelf, in het Nederlands en onvertaald.`,
      "Ty LuWa · Camping Le Conguel · Quiberon",
    ])
  );

  const doc = b.doc({
    lang: "nl",
    title: `Nieuwe aanvraag: ${req.name}`,
    preheader: `${req.name} · ${dates.formatRange(req.arrival, req.departure, "nl")} · ${nightsNl(n)} · ${partyNl(req.adults, req.children)} · ${site}`,
    blocks,
  });

  return {
    subject: `Nieuwe aanvraag · ${req.name} · ${dates.formatRange(req.arrival, req.departure, "nl")} · ${nightsNl(n)}`,
    ...b.render(doc),
    doc,
  };
}

// ------------------------------------------------------- ontvangstbevestiging

/** Aan de gast, in zijn eigen taal, met de teksten uit site-content.json. */
function receipt(req, content) {
  const c = content[req.lang].availability;
  const vars = {
    name: req.name,
    from: dates.formatLong(req.arrival, req.lang),
    to: dates.formatLong(req.departure, req.lang),
    nights: nightsText(c, dates.nightsBetween(req.arrival, req.departure)),
    party: partyText(c, req.adults, req.children),
  };
  const doc = b.doc({
    lang: req.lang,
    title: c.receipt.subject,
    preheader: `${vars.from} – ${vars.to} · ${vars.nights}`,
    blocks: [
      b.h(fill(c.receipt.greeting, vars), { level: 1 }),
      b.p(fill(c.receipt.body, vars)),
      b.facts([
        { label: c.arrival, value: vars.from },
        { label: c.departure, value: vars.to },
      ]),
      b.notice({ tone: "calm", lines: [c.note] }),
      b.footer([c.receipt.closing]),
    ],
  });
  return { subject: c.receipt.subject, ...b.render(doc), doc };
}

// ------------------------------------------------------------------ antwoord

const REPLY = {
  nl: { subject: "Antwoord van Luuk en Wanda · Ty LuWa", original: null, closing: "Hartelijke groet,\nLuuk en Wanda\nTy LuWa · Camping Le Conguel · Quiberon" },
  fr: { subject: "Réponse de Luuk et Wanda · Ty LuWa", original: "Message d’origine en néerlandais (traduit automatiquement ci-dessus) :", closing: "Bien cordialement,\nLuuk et Wanda\nTy LuWa · Camping Le Conguel · Quiberon" },
  en: { subject: "Reply from Luuk and Wanda · Ty LuWa", original: "Original message in Dutch (translated automatically above):", closing: "Warm regards,\nLuuk and Wanda\nTy LuWa · Camping Le Conguel · Quiberon" },
  de: { subject: "Antwort von Luuk und Wanda · Ty LuWa", original: "Ursprüngliche Nachricht auf Niederländisch (oben automatisch übersetzt):", closing: "Herzliche Grüße,\nLuuk und Wanda\nTy LuWa · Camping Le Conguel · Quiberon" },
};

const MAILTO = {
  nl: { subject: "Je aanvraag bij Ty LuWa", body: "Beste {name},\n\nBedankt voor je aanvraag voor {from} tot {to}.\n\n" },
  fr: { subject: "Votre demande auprès de Ty LuWa", body: "Bonjour {name},\n\nMerci pour votre demande du {from} au {to}.\n\n" },
  en: { subject: "Your request to Ty LuWa", body: "Dear {name},\n\nThank you for your request for {from} to {to}.\n\n" },
  de: { subject: "Eure Anfrage bei Ty LuWa", body: "Liebe(r) {name},\n\nvielen Dank für eure Anfrage für {from} bis {to}.\n\n" },
};

/** Het antwoord van Luuk en Wanda: een brief van twee mensen, geen systeem. */
function reply(req, { nl, translated }) {
  const lang = REPLY[req.lang] ? req.lang : "en";
  const r = REPLY[lang];
  const greeting = fill(MAILTO[lang].body, {
    name: req.name,
    from: dates.formatLong(req.arrival, lang),
    to: dates.formatLong(req.departure, lang),
  }).split("\n")[0];

  const blocks = [b.p(greeting), b.p(translated || nl, { lang }), b.p(r.closing)];
  if (translated && translated !== nl && r.original) {
    blocks.push(b.divider(), b.p(r.original, { tone: "muted" }), b.quote({ text: nl, lang: "nl", tone: "muted" }));
  }
  const doc = b.doc({
    lang,
    title: r.subject,
    preheader: (translated || nl).slice(0, 120),
    blocks,
  });
  return { subject: r.subject, ...b.render(doc), doc };
}

// ------------------------------------------------------------------ inloggen

function login({ code, link }) {
  // "code" is hier de zes cijfers; b.code is het blok. Even opletten dus.
  const doc = b.doc({
    lang: "nl",
    title: "Je inlogcode voor Ty LuWa",
    preheader: `Je code is ${code}`,
    blocks: [
      b.h("Inloggen op het beheer", { level: 1 }),
      b.p("Tik op de knop, of typ de code hieronder over in het venster waar je je e-mailadres invulde."),
      b.button({ href: link, label: "Inloggen" }),
      b.p("Of typ deze code over:"),
      b.code(code),
      b.p("De link en de code werken een half uur en maar één keer.", { tone: "muted" }),
      b.footer([
        "Niet zelf om inloggen gevraagd? Dan hoef je niets te doen; met deze mail alleen kan niemand iets.",
        "Ty LuWa · Camping Le Conguel · Quiberon",
      ]),
    ],
  });
  return { subject: `Je inlogcode voor Ty LuWa: ${code}`, ...b.render(doc), doc };
}

// ------------------------------------------------------------------- back-up

function backup({ periods, requests, when }) {
  const doc = b.doc({
    lang: "nl",
    title: "Ty LuWa back-up",
    preheader: `${periods} periodes, ${requests} aanvragen`,
    blocks: [
      b.h("Wekelijkse reservekopie", { level: 1 }),
      b.p("De planning van Ty LuWa, zoals hij er nu bij staat. Het bestand zit in de bijlage."),
      b.facts([
        { label: "Periodes", value: String(periods) },
        { label: "Aanvragen", value: String(requests) },
        { label: "Gemaakt op", value: when.slice(0, 10) },
      ]),
      b.p("Terugzetten kan met scripts/restore.js.", { tone: "muted" }),
      b.footer(["Ty LuWa · Camping Le Conguel · Quiberon"]),
    ],
  });
  return { subject: `Ty LuWa back-up ${when.slice(0, 10)}`, ...b.render(doc), doc };
}

/** Onderwerp en aanhef voor de mailto-knop in het beheer, in de taal van de gast. */
function mailto(req) {
  const t = MAILTO[req.lang] || MAILTO.en;
  const vars = { name: req.name, from: dates.formatLong(req.arrival, req.lang), to: dates.formatLong(req.departure, req.lang) };
  return `mailto:${encodeURIComponent(req.email)}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(fill(t.body, vars))}`;
}

module.exports = { receipt, notify, login, backup, reply, mailto, fill, nightsText, partyText, partyNl, LANG_NL };
