// Het beheer: ty-luwa.nl/beheer. Nederlands, één domein, buiten de hreflang-
// set, uitgesloten in robots.txt. Server-rendered schermen uit
// lib/beheer-views.js; inloggen zonder wachtwoord uit lib/auth.js.

const fs = require("fs");
const path = require("path");
const express = require("express");
const dates = require("../lib/dates");
const auth = require("../lib/auth");
const calendar = require("../lib/calendar");
const season = require("../lib/season");
const views = require("../lib/beheer-views");
const texts = require("../lib/mail-texts");
const { validatePeriod } = require("../lib/validate");
const { PERIOD_KINDS } = require("../lib/store");

const { holidayMap } = require("../lib/holidays");
const { loadContext, collectHighlights } = require("../lib/highlights");

const CAL_LABELS = {
  free: "vrij", busy: "bezet", past: "voorbij", today: "vandaag",
  holiday: "feestdag", school: "schoolvakantie",
};

// Het beheer als app op het beginscherm (/beheer/app).
// scope zonder afsluitende slash: "binnen de scope" is een kale prefixtest, en
// met "/beheer/" zou juist de kalender op /beheer erbuiten vallen — dan is de
// site niet installeerbaar en klopt geen enkele interne link meer.
const APP_COOKIE = "tl_app_gezien";
const MANIFEST = {
  name: "Ty LuWa beheer",
  short_name: "Ty LuWa",
  description: "De planning en de aanvragen van Ty LuWa.",
  id: "/beheer",
  start_url: "/beheer?vanuit=app",
  scope: "/beheer",
  display: "standalone",
  background_color: "#FAF7F1",
  theme_color: "#123F5D",
  lang: "nl",
  dir: "ltr",
  icons: [
    { src: "/assets/brand/ty-luwa-icoon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/assets/brand/ty-luwa-icoon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/assets/brand/ty-luwa-icoon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  // Bewust geen "screenshots": Chrome toont die alleen bij een beeldverhouding
  // tussen 0,5 en 2, en de opnames uit scripts/screenshots.js zijn hele
  // schermen (390 breed, ruim 1500 hoog) en vallen daar buiten. Een afgekeurd
  // plaatje meesturen levert niets op; het venster werkt ook zonder.
};

function createBeheerRouter({ store, mailer, translator, config, isLocalHost, knownHost, log = console, now = () => new Date().toISOString() }) {
  const tr = translator || { enabled: false, translate: async () => null, tryTranslate: async () => null };
  const router = express.Router();
  const helpMd = fs.readFileSync(path.join(__dirname, "..", "docs", "HANDLEIDING-BEHEER.md"), "utf8");
  const helpHtml = views.markdownToHtml(helpMd);
  const swJs = fs.readFileSync(path.join(__dirname, "..", "assets", "beheer", "app-sw.js"), "utf8");

  // De uitleg: één Markdown-bestand per hoofdstuk in docs/uitleg/, met de
  // volgorde in de bestandsnaam. De titel is de eerste kop, de samenvatting
  // de eerste alinea.
  const uitlegDir = path.join(__dirname, "..", "docs", "uitleg");
  const chapters = fs
    .readdirSync(uitlegDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => {
      const md = fs.readFileSync(path.join(uitlegDir, file), "utf8");
      const slug = file.replace(/^\d+-/, "").replace(/\.md$/, "");
      const title = (/^#\s+(.*)$/m.exec(md) || [, slug])[1];
      const summary = (/^(?!#|!|>)(\S.*)$/m.exec(md) || [, ""])[1].replace(/\*\*/g, "");
      return { file, slug, title, summary, headings: views.headings(md), html: views.markdownToHtml(md) };
    });

  const hostOf = (req) => String(req.headers.host || "").toLowerCase().split(":")[0].replace(/^www\./, "");
  const isBeheerHost = (host) => host === config.beheerHost || isLocalHost(host);
  const secure = (req) => req.secure;
  const today = () => dates.today(config.timeZone);

  // --- host: alleen het beheerdomein --------------------------------------
  router.use((req, res, next) => {
    const host = hostOf(req);
    if (isBeheerHost(host)) return next();
    if (knownHost(host)) return res.redirect(302, `https://${config.beheerHost}/beheer`);
    return res.status(404).type("text/plain").send("Not found");
  });

  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
  });

  // css, js en de plaatjes van de uitleg; niet gehasht, dus geen lange cache.
  router.use("/static", express.static(path.join(__dirname, "..", "assets", "beheer"), { index: false }));
  router.use(express.urlencoded({ extended: false, limit: "50kb" }));
  router.use(auth.sameOriginGuard(isBeheerHost));
  router.use(auth.sessionMiddleware(store, { now }));

  const ctx = (req) => ({ admin: req.admin, newCount: store.countNewRequests() });
  const flashFrom = (req) => {
    const m = req.query.melding;
    if (!m) return null;
    const id = Number(req.query.id) || 0;
    switch (m) {
      case "opgeslagen": return { kind: "ok", text: "Opgeslagen." };
      case "verwijderd": return { kind: "ok", text: "Periode verwijderd.", undo: id ? { href: `/beheer/periode/${id}/terugzetten`, label: "Terugzetten" } : null };
      case "teruggezet": return { kind: "ok", text: "Periode teruggezet." };
      case "afgewezen": return { kind: "ok", text: "Aanvraag afgewezen.", undo: id ? { href: `/beheer/aanvraag/${id}/status?status=new`, label: "Terug naar nieuw" } : null };
      case "afgehandeld": return { kind: "ok", text: "Aanvraag afgehandeld.", undo: id ? { href: `/beheer/aanvraag/${id}/status?status=new`, label: "Terug naar nieuw" } : null };
      case "nieuw": return { kind: "ok", text: "Aanvraag staat weer bij nieuw." };
      case "verstuurd": return { kind: "ok", text: "Antwoord verstuurd." };
      default: return null;
    }
  };

  // --- inloggen ------------------------------------------------------------
  router.get("/inloggen", (req, res) => {
    if (req.admin) return res.redirect("/beheer");
    res.send(views.loginView({ fromApp: req.query.vanuit === "app" }));
  });

  router.post("/inloggen", async (req, res) => {
    const login = auth.startLogin(store, req.body.email, { allowed: config.beheerEmails, now: now() });
    if (login) {
      const link = `${req.protocol}://${req.headers.host}/beheer/inloglink/${login.token}`;
      const m = texts.login({ code: login.code, link });
      try {
        await mailer.send({ to: login.email, subject: m.subject, text: m.text, html: m.html, replyTo: "" });
      } catch (e) {
        log.error("Inlogmail mislukt:", e.message);
      }
      auth.setCookie(res, auth.LOGIN_COOKIE, String(login.id), { maxAgeSec: auth.TOKEN_TTL_MIN * 60, secure: secure(req) });
    }
    // Altijd hetzelfde scherm, ook bij een onbekend adres: niets te raden.
    res.send(views.codeView());
  });

  const startSession = (req, res, email) => {
    const s = auth.createSession(store, email, { now: now(), days: config.sessionDays });
    auth.setCookie(res, auth.SESSION_COOKIE, s.value, { maxAgeSec: config.sessionDays * 86400, secure: secure(req) });
    auth.clearCookie(res, auth.LOGIN_COOKIE, { secure: secure(req) });
    res.redirect("/beheer?welkom=1");
  };

  router.post("/inlogcode", (req, res) => {
    const loginId = req.cookies[auth.LOGIN_COOKIE];
    if (!loginId) return res.send(views.codeView({ error: "De code hoort bij het venster waar je je e-mailadres invulde. Vraag hier opnieuw een code aan." }));
    const r = auth.finishLoginByCode(store, loginId, req.body.code, { now: now() });
    if (r.email) return startSession(req, res, r.email);
    const msg = {
      wrong: "Die code klopt niet. Kijk nog eens goed in de mail.",
      attempts: "Te vaak een verkeerde code. Vraag een nieuwe code aan.",
      expired: "Deze code is verlopen of al gebruikt. Vraag een nieuwe aan.",
    }[r.error];
    res.send(views.codeView({ error: msg }));
  });

  router.get("/inloglink/:token", (req, res) => {
    res.send(views.linkView({ token: req.params.token }));
  });

  router.post("/inloglink", (req, res) => {
    const email = auth.finishLoginByToken(store, req.body.token, { now: now() });
    if (!email) return res.status(410).send(views.linkFailedView());
    startSession(req, res, email);
  });

  router.post("/uitloggen", (req, res) => {
    if (req.admin) store.deleteSession(req.admin.hash);
    auth.clearCookie(res, auth.SESSION_COOKIE, { secure: secure(req) });
    res.redirect("/beheer/inloggen");
  });

  // --- de app op het beginscherm ------------------------------------------
  // Vóór de inlogmuur, want een manifest wordt zónder cookies opgehaald: achter
  // requireAdmin krijgt de browser een omleiding naar de inlogpagina en dus
  // geen manifest, ook als je ingelogd bent. Een worker kan met zo'n omleiding
  // al helemaal niets. Beide bevatten alleen namen, kleuren en lege code.
  router.get("/manifest.webmanifest", (req, res) => {
    res.type("application/manifest+json");
    res.setHeader("Cache-Control", "public, max-age=600");
    res.send(JSON.stringify(MANIFEST, null, 2));
  });

  router.get("/sw.js", (req, res) => {
    res.type("application/javascript");
    // Een worker op /beheer/sw.js mag standaard alleen /beheer/ besturen; met
    // deze header ook /beheer zelf, waar de app op start.
    res.setHeader("Service-Worker-Allowed", "/beheer");
    res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
    res.send(swJs);
  });

  // Wie de app opent zonder sessie moet op de inlogpagina horen waaróm.
  router.use((req, res, next) => {
    if (!req.admin && req.method === "GET" && req.query.vanuit === "app" && !req.path.startsWith("/inloggen")) {
      return res.redirect("/beheer/inloggen?vanuit=app");
    }
    next();
  });

  // --- vanaf hier alleen ingelogd ----------------------------------------
  router.use(auth.requireAdmin("/beheer/inloggen"));

  function monthParam(req) {
    const m = String(req.query.m || "");
    const raw = /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : dates.monthOf(today());
    // De camping is 's winters dicht: die maanden bestaan niet in de kalender.
    return season.isOpenMonth(raw) ? raw : season.nextOpenMonth(raw);
  }

  router.get("/", (req, res) => {
    // Wie hier vanuit de app binnenkomt heeft hem al: geen uitnodiging meer.
    if (req.query.vanuit === "app" && !req.cookies[APP_COOKIE]) {
      auth.setCookie(res, APP_COOKIE, "1", { maxAgeSec: 365 * 86400, secure: secure(req) });
    }
    const ym = monthParam(req);
    const from = `${ym}-01`;
    const to = `${dates.addMonths(ym, 1)}-01`;
    const kinds = store.occupiedNightKinds(from, to);
    // In het beheer de Nederlandse feestdagen en vakanties: dat is de taal
    // van Luuk en Wanda, en het zegt iets over de drukte.
    const holidayRows = store.holidaysBetween("NL", from, to);
    const gridHtml = calendar.renderMonth({
      ym,
      occupied: new Set(kinds.keys()),
      kinds,
      holidays: holidayMap(holidayRows, dates),
      holidayRows,
      today: today(),
      minDate: "0000-00-00", // in het beheer is het verleden gewoon bewerkbaar
      lang: "nl",
      labels: CAL_LABELS,
      dayHref: (d, info) => (info ? `/beheer/periode/${info.id}` : `/beheer/periode/nieuw?aankomst=${d}`),
    });
    res.send(
      views.calendarView({
        ...ctx(req),
        ym,
        gridHtml,
        periods: store.listPeriods(from, to),
        today: today(),
        flash: flashFrom(req),
        firstLogin: Boolean(req.query.welkom),
        showAppInvite: !req.cookies[APP_COOKIE] && req.query.vanuit !== "app",
      })
    );
  });

  // Het beheer als app op het beginscherm. Eigen scherm, want een uitleg met
  // stappen past niet als kaartje tussen de hulp.
  router.get("/app", (req, res) => {
    res.send(views.appView({ ...ctx(req), back: req.query.van === "kalender" ? "/beheer" : "/beheer/hulp" }));
  });

  // "Niet nu": de uitnodiging op de kalender een jaar wegzetten. Een cookie en
  // geen databaseveld, want "heb ik de app op dít toestel" hoort bij het
  // toestel: op de laptop moet de uitnodiging nog komen.
  router.post("/app/niet-nu", (req, res) => {
    auth.setCookie(res, APP_COOKIE, "1", { maxAgeSec: 365 * 86400, secure: secure(req) });
    res.redirect("/beheer");
  });

  // --- periodes ------------------------------------------------------------
  const emptyValues = () => ({ kind: "", arrival: "", departure: "", guestName: "", guestEmail: "", guestPhone: "", notes: "" });

  router.get("/periode/nieuw", (req, res) => {
    const v = emptyValues();
    let request = null;
    if (req.query.aanvraag) {
      request = store.getRequest(Number(req.query.aanvraag));
      if (request) {
        Object.assign(v, { arrival: request.arrival, departure: request.departure, guestName: request.name, guestEmail: request.email });
        v.kind = PERIOD_KINDS.includes(req.query.soort) ? req.query.soort : "option";
        v.notes = `${views.party(request)}${request.message ? `\n${request.message}` : ""}`;
      }
    } else if (dates.isIsoDate(req.query.aankomst)) {
      v.arrival = req.query.aankomst;
      v.departure = dates.addDays(req.query.aankomst, 7);
    }
    res.send(views.periodFormView({ ...ctx(req), isNew: true, values: v, request, formId: auth.randomToken(), back: request ? `/beheer/aanvraag/${request.id}` : `/beheer?m=${req.query.m || ""}` }));
  });

  function handlePeriodPost(req, res, id) {
    const isNew = id === null;
    const v = validatePeriod(req.body, PERIOD_KINDS);
    const values = { ...emptyValues(), ...req.body };
    const request = req.body.request_id ? store.getRequest(Number(req.body.request_id)) : null;
    const render = (extra) =>
      res.status(400).send(views.periodFormView({ ...ctx(req), isNew, id, values, request, formId: req.body.form_id || auth.randomToken(), ...extra }));
    if (!v.ok) {
      const msg = { dates: "Vul een aankomst- en een vertrekdag in.", order: "Vertrek moet na aankomst liggen.", tooLong: "Een periode kan hooguit een jaar zijn.", kind: "Kies wat het is: verhuurd, optie, wij zelf of gesloten." }[v.code];
      return render({ error: msg });
    }
    const overlap = store.overlappingPeriods(v.data.arrival, v.data.departure, id || 0);
    if (overlap.length && !req.body.force) return render({ overlap });

    let saved;
    if (isNew) {
      saved = store.createPeriod({ ...v.data, requestId: request ? request.id : null, formId: req.body.form_id || null });
    } else {
      saved = store.updatePeriod(id, v.data);
    }
    res.redirect(`/beheer?m=${dates.monthOf(saved.arrival)}&melding=opgeslagen`);
  }

  router.post("/periode/nieuw", (req, res) => handlePeriodPost(req, res, null));

  function loadPeriod(req, res, next) {
    const p = store.getPeriod(Number(req.params.id));
    if (!p) return res.status(404).send(views.layout({ ...ctx(req), title: "Niet gevonden", back: "/beheer", body: `<section class="card narrow"><h1>Deze periode bestaat niet (meer).</h1><a class="btn primary" href="/beheer">Naar de kalender</a></section>` }));
    req.period = p;
    next();
  }

  router.get("/periode/:id", loadPeriod, (req, res) => {
    const p = req.period;
    if (p.deleted_at) return res.redirect(`/beheer?m=${dates.monthOf(p.arrival)}&melding=verwijderd&id=${p.id}`);
    const values = { kind: p.kind, arrival: p.arrival, departure: p.departure, guestName: p.guest_name, guestEmail: p.guest_email, guestPhone: p.guest_phone, notes: p.notes };
    const request = p.request_id ? store.getRequest(p.request_id) : null;
    res.send(views.periodFormView({ ...ctx(req), isNew: false, id: p.id, values, request, formId: auth.randomToken(), back: `/beheer?m=${dates.monthOf(p.arrival)}` }));
  });

  router.post("/periode/:id", loadPeriod, (req, res) => handlePeriodPost(req, res, req.period.id));

  router.get("/periode/:id/verwijderen", loadPeriod, (req, res) => {
    res.send(views.deleteView({ ...ctx(req), period: req.period }));
  });

  router.post("/periode/:id/verwijderen", loadPeriod, (req, res) => {
    store.softDeletePeriod(req.period.id);
    res.redirect(`/beheer?m=${dates.monthOf(req.period.arrival)}&melding=verwijderd&id=${req.period.id}`);
  });

  router.post("/periode/:id/terugzetten", loadPeriod, (req, res) => {
    store.restorePeriod(req.period.id);
    res.redirect(`/beheer?m=${dates.monthOf(req.period.arrival)}&melding=teruggezet`);
  });

  // --- aanvragen -----------------------------------------------------------
  const overlapOf = (r) => store.overlappingPeriods(r.arrival, r.departure);

  router.get("/aanvragen", (req, res) => {
    const tab = req.query.tab === "afgehandeld" ? "afgehandeld" : "nieuw";
    const requests = store.listRequests(tab === "nieuw" ? ["new"] : ["planned", "declined", "archived"]);
    res.send(views.requestsView({ ...ctx(req), tab, requests, overlapOf, flash: flashFrom(req) }));
  });

  function loadRequest(req, res, next) {
    const r = store.getRequest(Number(req.params.id));
    if (!r) return res.status(404).send(views.layout({ ...ctx(req), title: "Niet gevonden", back: "/beheer/aanvragen", body: `<section class="card narrow"><h1>Deze aanvraag bestaat niet.</h1><a class="btn primary" href="/beheer/aanvragen">Naar de aanvragen</a></section>` }));
    req.request = r;
    next();
  }

  async function renderDetail(req, res, extra = {}) {
    const r = req.request;
    // Oude aanvraag zonder Nederlandse vertaling: alsnog proberen, en bewaren.
    if (r.message && r.lang !== "nl" && !r.message_nl && tr.enabled) {
      const nl = await tr.tryTranslate(r.message, r.lang, "nl");
      if (nl) {
        store.setRequestMessageNl(r.id, nl);
        r.message_nl = nl;
      }
    }
    // Dezelfde bijzonderheden als in de meldingsmail, uit dezelfde functie.
    let highlights = [];
    try {
      highlights = collectHighlights(loadContext(store, r, today()));
    } catch (e) {
      log.error("Bijzonderheden verzamelen mislukt:", e.message);
    }
    res.send(
      views.requestDetailView({
        ...ctx(req),
        request: r,
        highlights,
        mailto: texts.mailto(r),
        periods: store.periodsOfRequest(r.id),
        messages: store.listMessages(r.id),
        translatorEnabled: tr.enabled,
        flash: flashFrom(req),
        ...extra,
      })
    );
  }

  router.get("/aanvraag/:id", loadRequest, (req, res) => renderDetail(req, res));

  // --- antwoord aan de gast: typen → voorbeeld met vertaling → versturen ----
  const cleanBody = (b) => String(b || "").replace(/\r\n/g, "\n").trim().slice(0, 4000);

  router.post("/aanvraag/:id/antwoord", loadRequest, async (req, res) => {
    const r = req.request;
    const bodyNl = cleanBody(req.body.body);
    if (!bodyNl) return renderDetail(req, res, { flash: { kind: "warn", text: "Typ eerst een antwoord." } });
    let translated = bodyNl;
    if (r.lang !== "nl") {
      try {
        translated = await tr.translate(bodyNl, "nl", r.lang);
      } catch (e) {
        log.error("Vertalen van antwoord mislukt:", e.message);
        return renderDetail(req, res, { draft: bodyNl, flash: { kind: "warn", text: "Het vertalen lukte even niet. Er is niets verstuurd; probeer het zo nog eens." } });
      }
    }
    res.send(views.replyPreviewView({ ...ctx(req), request: r, bodyNl, translated }));
  });

  router.post("/aanvraag/:id/antwoord/bewerk", loadRequest, (req, res) => {
    renderDetail(req, res, { draft: cleanBody(req.body.body) });
  });

  router.post("/aanvraag/:id/antwoord/verstuur", loadRequest, async (req, res) => {
    const r = req.request;
    const bodyNl = cleanBody(req.body.body);
    const translated = cleanBody(req.body.translated) || null;
    if (!bodyNl) return res.redirect(`/beheer/aanvraag/${r.id}`);
    const m = texts.reply(r, { nl: bodyNl, translated: r.lang === "nl" ? null : translated });
    let status = "ok";
    try {
      await mailer.send({ to: r.email, subject: m.subject, text: m.text, html: m.html });
    } catch (e) {
      status = e.message;
      log.error("Antwoord aan gast mislukt:", e.message);
    }
    store.addMessage({ requestId: r.id, bodyNl, bodySent: translated || bodyNl, lang: r.lang, mailStatus: status });
    if (status !== "ok") {
      return renderDetail(req, res, { draft: bodyNl, flash: { kind: "warn", text: "Het versturen lukte niet. Het antwoord staat bewaard onder 'Al verstuurd' met de fout; probeer het zo nog eens." } });
    }
    res.redirect(`/beheer/aanvraag/${r.id}?melding=verstuurd`);
  });

  router.post("/aanvraag/:id/status", loadRequest, (req, res) => {
    const status = req.body.status || req.query.status;
    const allowed = { declined: "afgewezen", archived: "afgehandeld", new: "nieuw" };
    if (!allowed[status]) return res.status(400).type("text/plain").send("Onbekende status");
    store.setRequestStatus(req.request.id, status);
    const back = status === "new" ? `/beheer/aanvraag/${req.request.id}` : "/beheer/aanvragen";
    res.redirect(`${back}?melding=${allowed[status]}&id=${req.request.id}`);
  });

  // --- hulp en back-up -----------------------------------------------------
  router.get("/uitleg", (req, res) => {
    res.send(views.uitlegIndexView({ ...ctx(req), chapters }));
  });

  router.get("/uitleg/alles", (req, res) => {
    res.send(views.uitlegAllView({ ...ctx(req), chapters }));
  });

  router.get("/uitleg/:slug", (req, res) => {
    const i = chapters.findIndex((c) => c.slug === req.params.slug);
    if (i < 0) return res.redirect("/beheer/uitleg");
    res.send(
      views.uitlegChapterView({
        ...ctx(req),
        chapter: chapters[i],
        prev: chapters[i - 1] || null,
        next: chapters[i + 1] || null,
      })
    );
  });

  router.get("/hulp", (req, res) => {
    res.send(views.helpView({ ...ctx(req), html: helpHtml, backupHref: "/beheer/backup.json" }));
  });

  router.get("/backup.json", (req, res) => {
    const snap = store.exportSnapshot();
    res.setHeader("Content-Disposition", `attachment; filename="ty-luwa-planning-${today()}.json"`);
    res.json(snap);
  });

  return router;
}

module.exports = { createBeheerRouter };
