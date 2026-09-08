// De teksten van de mails. Gastmails komen uit site-content.json in de taal
// van de gast; de mails aan Luuk en Wanda zijn Nederlands en staan hier.

const dates = require("./dates");

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

/** Ontvangstbevestiging aan de gast, in zijn taal. */
function receipt(req, content) {
  const c = content[req.lang].availability;
  const vars = {
    name: req.name,
    from: dates.formatLong(req.arrival, req.lang),
    to: dates.formatLong(req.departure, req.lang),
    nights: nightsText(c, dates.nightsBetween(req.arrival, req.departure)),
    party: partyText(c, req.adults, req.children),
  };
  return {
    subject: c.receipt.subject,
    text: `${fill(c.receipt.greeting, vars)}\n\n${fill(c.receipt.body, vars)}\n\n${c.receipt.closing}\n`,
  };
}

const LANG_NL = { nl: "Nederlands", fr: "Frans", en: "Engels", de: "Duits" };

/** Melding aan Luuk en Wanda dat er een nieuwe aanvraag is. */
function notify(req, { beheerUrl, overlap }) {
  const n = dates.nightsBetween(req.arrival, req.departure);
  const lines = [
    `Er is een nieuwe aanvraag binnengekomen via de site (${LANG_NL[req.lang] || req.lang}).`,
    ``,
    `Periode:   ${dates.formatLong(req.arrival, "nl")} tot ${dates.formatLong(req.departure, "nl")} (${n} ${n === 1 ? "nacht" : "nachten"})`,
    `Wie:       ${req.name}, ${req.adults} volw.${req.children ? ` + ${req.children} kind${req.children === 1 ? "" : "eren"}` : ""}`,
    `E-mail:    ${req.email}`,
    overlap && overlap.length
      ? `Let op:    overlapt met ${overlap.map((p) => `${dates.formatRange(p.arrival, p.departure, "nl")}${p.guest_name ? ` (${p.guest_name})` : ""}`).join(", ")}`
      : `Kalender:  deze nachten zijn nog vrij`,
    ``,
    req.message ? `Bericht:\n${req.message}\n` : `Geen bericht erbij.\n`,
    `Openen in het beheer: ${beheerUrl}/aanvraag/${req.id}`,
    ``,
    `De gast heeft automatisch een ontvangstbevestiging gekregen, in het ${LANG_NL[req.lang] || req.lang}. Antwoorden doe je zelf, vanuit het beheer met de knop "Mail ${req.name.split(" ")[0]}".`,
  ];
  return { subject: `Nieuwe aanvraag: ${req.name}, ${dates.formatRange(req.arrival, req.departure, "nl")}`, text: lines.join("\n") };
}

/** Inlogmail met link én code. */
function login({ code, link }) {
  return {
    subject: `Je inlogcode voor Ty LuWa: ${code}`,
    text: [
      `Je wilde inloggen op het beheer van Ty LuWa.`,
      ``,
      `Tik op deze link: ${link}`,
      ``,
      `Of typ deze code in het venster waar je je e-mailadres invulde:`,
      ``,
      `    ${code}`,
      ``,
      `De link en de code werken een half uur en maar één keer. Niet zelf om inloggen gevraagd? Dan hoef je niets te doen.`,
    ].join("\n"),
  };
}

/** Wekelijkse back-up naar Björn. */
function backup({ periods, requests, when }) {
  return {
    subject: `Ty LuWa back-up ${when.slice(0, 10)}`,
    text: `Automatische wekelijkse back-up van de planning van Ty LuWa.\n\n${periods} periodes, ${requests} aanvragen. Het bestand staat in de bijlage; terugzetten kan met scripts/restore.js.\n`,
  };
}

/** Onderwerp en aanhef voor de mailto-knop in het beheer, in de taal van de gast. */
const MAILTO = {
  nl: { subject: "Je aanvraag bij Ty LuWa", body: "Beste {name},\n\nBedankt voor je aanvraag voor {from} tot {to}.\n\n" },
  fr: { subject: "Votre demande auprès de Ty LuWa", body: "Bonjour {name},\n\nMerci pour votre demande du {from} au {to}.\n\n" },
  en: { subject: "Your request to Ty LuWa", body: "Dear {name},\n\nThank you for your request for {from} to {to}.\n\n" },
  de: { subject: "Eure Anfrage bei Ty LuWa", body: "Liebe(r) {name},\n\nvielen Dank für eure Anfrage für {from} bis {to}.\n\n" },
};

function mailto(req) {
  const t = MAILTO[req.lang] || MAILTO.en;
  const vars = { name: req.name, from: dates.formatLong(req.arrival, req.lang), to: dates.formatLong(req.departure, req.lang) };
  return `mailto:${encodeURIComponent(req.email)}?subject=${encodeURIComponent(t.subject)}&body=${encodeURIComponent(fill(t.body, vars))}`;
}

module.exports = { receipt, notify, login, backup, mailto, fill, nightsText, partyText };
