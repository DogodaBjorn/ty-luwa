// Het aanvraagformulier. Eerst opslaan, dan mailen: de inbox in het beheer is
// de waarheid, de mail is een seintje. Antwoordt in JSON als de pagina met
// JavaScript vraagt, anders met een redirect (verstuurd) of de pagina met de
// melding erin (fout), zodat het formulier ook zonder JavaScript werkt.

const express = require("express");
const dates = require("../lib/dates");
const season = require("../lib/season");
const { validateRequest } = require("../lib/validate");
const texts = require("../lib/mail-texts");

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

function createApiRouter({ store, mailer, translator, config, content, routes, pages, knownHost, clientIp, log = console }) {
  const router = express.Router();
  const hits = new Map(); // ip -> [timestamps]

  function limited(ip, now) {
    const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
    hits.set(ip, list);
    if (list.length >= (config.rateMax || RATE_MAX)) return true;
    list.push(now);
    if (hits.size > 5000) hits.clear();
    return false;
  }

  function pagePath(lang) {
    const slug = routes.slugs.availability[lang];
    return `${routes.domains[lang].prefix}/${slug}`;
  }

  router.post("/api/aanvraag", express.urlencoded({ extended: false, limit: "20kb" }), async (req, res) => {
    const host = String(req.headers.host || "").toLowerCase().split(":")[0].replace(/^www\./, "");
    if (!knownHost(host)) return res.status(404).type("text/plain").send("Not found");

    const wantsJson = /application\/json/.test(req.headers.accept || "");
    const languages = routes.languages;
    const lang = languages.includes(req.body.lang) ? req.body.lang : languages[0];
    const c = content[lang].availability;

    const reply = (status, kind, code, text) => {
      if (wantsJson) return res.status(status).json({ ok: kind === "sent", code, message: text });
      if (kind === "sent") return res.redirect(303, `${pagePath(lang)}?verzonden=1#melding`);
      res.status(status).type("html");
      return res.send(pages.renderAvailabilityPage(lang, { kind: "error", text }));
    };

    const nowMs = Date.now();
    if (limited(clientIp(req), nowMs)) return reply(429, "error", "rate", c.errors.rate);

    const today = dates.today(config.timeZone);
    const v = validateRequest(req.body, { today, languages });
    if (!v.ok) {
      // Een gevulde honeypot is een bot; die krijgt een "gelukt" zonder gevolg.
      if (v.code === "honeypot") return reply(200, "sent", "sent", c.sent);
      return reply(400, "error", v.code, c.errors[v.code] || c.errors.dates);
    }
    const r = v.data;

    // De camping is 's winters dicht; dan kan er niets geboekt worden.
    if (season.closedNights(r.arrival, r.departure).length) {
      return reply(409, "error", "closed", c.errors.closed);
    }

    const occupiedKinds = store.occupiedNightKinds(r.arrival, r.departure);
    if ([...occupiedKinds.values()].some((k) => k.kind === "siblu")) {
      return reply(409, "error", "siblu", c.errors.siblu);
    }
    const occupied = new Set(occupiedKinds.keys());
    if (occupied.size) {
      const first = dates.formatLong([...occupied].sort()[0], lang);
      return reply(409, "error", "occupied", texts.fill(c.errors.occupied, { first }));
    }

    const since = new Date(nowMs - DUPLICATE_WINDOW_MS).toISOString();
    if (store.findDuplicateRequest(r.email, r.arrival, r.departure, since)) {
      return reply(200, "sent", "sent", c.sent);
    }

    const saved = store.createRequest({ ...r, host });
    const beheerUrl = `https://${config.beheerHost}/beheer`;

    // Het bericht van de gast alvast in het Nederlands, voor de ouders. Best
    // effort: lukt het niet, dan vertaalt de detailpagina het later alsnog.
    let messageNl = null;
    if (r.message && r.lang !== "nl" && translator && translator.enabled) {
      messageNl = await translator.tryTranslate(r.message, r.lang, "nl");
      if (messageNl) store.setRequestMessageNl(saved.id, messageNl);
    }

    const results = [];
    try {
      if (config.mail.notify.length) {
        const overlap = store.overlappingPeriods(r.arrival, r.departure);
        const m = texts.notify(saved, { beheerUrl, overlap, messageNl });
        await mailer.send({ to: config.mail.notify, subject: m.subject, text: m.text, replyTo: r.email });
        results.push("notify:ok");
      } else {
        results.push("notify:geen-ontvanger");
      }
    } catch (e) {
      results.push(`notify:${e.message}`);
      log.error("Melding aan beheer mislukt:", e.message);
    }
    try {
      const m = texts.receipt(saved, content);
      await mailer.send({ to: r.email, subject: m.subject, text: m.text });
      results.push("receipt:ok");
    } catch (e) {
      results.push(`receipt:${e.message}`);
      log.error("Ontvangstbevestiging mislukt:", e.message);
    }
    store.setMailStatus(saved.id, results.join(" "));

    return reply(200, "sent", "sent", c.sent);
  });

  return router;
}

module.exports = { createApiRouter, RATE_MAX };
