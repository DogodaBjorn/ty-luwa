// Een mail is een lijstje blokken, geen HTML. lib/mail-html.js en
// lib/mail-text.js maken er allebei hun eigen versie van, zodat de tekstmail
// nooit achterloopt op de opgemaakte versie en een test kan bewijzen dat er
// in beide dezelfde feiten staan.
//
// De blokken dragen platte tekst; escapen gebeurt alleen in mail-html.js.

const h = (text, { level = 2 } = {}) => ({ type: "h", level, text });
const p = (text, { tone = "body", lang } = {}) => ({ type: "p", tone, text, lang });
const eyebrow = (text) => ({ type: "eyebrow", text });
const facts = (rows, { caption } = {}) => ({ type: "facts", caption, rows: rows.filter(Boolean) });
const notice = ({ tone = "info", title, lines = [], rows }) => ({ type: "notice", tone, title, lines, rows });
const quote = ({ text, lang, caption, tone = "body" }) => ({ type: "quote", text, lang, caption, tone });
const button = ({ href, label }) => ({ type: "button", href, label });
const code = (text) => ({ type: "code", text });
const divider = () => ({ type: "divider" });
const footer = (lines) => ({ type: "footer", lines: lines.filter(Boolean) });

/** Alleen adressen waar we zelf op uitkomen; al het andere wordt gewone tekst. */
function safeHref(url) {
  const s = String(url || "").trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  if (/^mailto:[^\s"'<>]+$/i.test(s)) return s;
  // Lokaal ontwikkelen: http op localhost mag, verder niets.
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/[^\s"'<>]*)?$/i.test(s)) return s;
  return null;
}

function doc({ lang = "nl", title, preheader, blocks }) {
  return { lang, title, preheader: preheader || "", blocks: blocks.filter(Boolean) };
}

/** Beide versies in één keer; dit is wat lib/mail-texts.js gebruikt. */
function render(document) {
  return {
    text: require("./mail-text").renderText(document),
    html: require("./mail-html").renderHtml(document),
  };
}

/** Alle waarden die als feit in de mail staan; de test loopt hierlangs. */
function factValues(document) {
  const out = [];
  for (const b of document.blocks) {
    if (b.type === "facts") for (const r of b.rows) out.push(r.value);
    if (b.type === "notice" && b.rows) for (const r of b.rows) out.push(r.value);
  }
  return out;
}

module.exports = { h, p, eyebrow, facts, notice, quote, button, code, divider, footer, doc, render, safeHref, factValues };
