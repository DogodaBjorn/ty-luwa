const express = require("express");
const fs = require("fs");
const path = require("path");

// Lokaal staan de instellingen in .env (gitignored); op Azure zijn het
// Application settings. Node 24 leest .env zonder dependency.
if (fs.existsSync(path.join(__dirname, ".env"))) {
  process.loadEnvFile(path.join(__dirname, ".env"));
}

const app = express();
const port = process.env.PORT || 8080;

// Azure App Service beeindigt TLS aan de voorkant en geeft het oorspronkelijke
// schema en de host door in X-Forwarded-*.
app.set("trust proxy", true);

const PUBLIC_DIR = path.join(__dirname, "public");
const routes = require(path.join(__dirname, "content", "routes.json"));
const content = require(path.join(__dirname, "content", "site-content.json"));
const { languages, domains, slugs, legacyPaths } = routes;

// --- planning: database, opslag, kalender ---------------------------------
// Eén SQLite-bestand in DATA_DIR (op Azure /home/data, buiten wwwroot).
// Alles wat dynamisch is (kalender, aanvragen, beheer) leest en schrijft daar.
const config = require("./lib/config").load();
const db = require("./lib/db").open(path.join(config.dataDir, "ty-luwa.sqlite"));
const store = require("./lib/store").createStore(db);
const pages = require("./lib/page").createPageRenderer({
  publicDir: PUBLIC_DIR,
  content,
  routes,
  store,
  timeZone: config.timeZone,
});
const mailer = require("./lib/mail").createMailer(config.mail);
if (mailer.provider === "console") {
  console.log("MAIL_PROVIDER=console: mails worden gelogd, niet verstuurd");
}

// Elke taal heeft een eigen domein en een eigen map met gegenereerde HTML.
// Duits deelt ty-luwa.com met Engels en is daar de enige taal met een prefix,
// omdat er geen ty-luwa.de is.
//
//   ty-luwa.nl/verblijf        -> public/nl/verblijf.html
//   ty-luwa.com/accommodation  -> public/en/accommodation.html
//   ty-luwa.com/de/unterkunft  -> public/de/unterkunft.html
//   ty-luwa.fr/le-logement     -> public/fr/le-logement.html
const HOSTS = {};
for (const lang of languages) {
  const { host, prefix } = domains[lang];
  (HOSTS[host] || (HOSTS[host] = [])).push({ lang, prefix });
}
// Langste prefix eerst, anders vangt de lege prefix van Engels ook /de/ af.
for (const host of Object.keys(HOSTS)) {
  HOSTS[host].sort((a, b) => b.prefix.length - a.prefix.length);
}

const DEFAULT_LANG = routes.defaultLanguage;

/**
 * Het IP van de bezoeker. Met trust proxy aan is req.ip het eerste adres in
 * X-Forwarded-For, en dat vult de client zelf in; het laatste adres is wat
 * Azure's front-end erachter zet. Azure plakt daar een poort aan vast.
 */
function clientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "");
  const last = xff.split(",").pop().trim();
  const raw = last || req.socket.remoteAddress || "";
  return raw.replace(/^::ffff:/, "").replace(/:\d+$/, "");
}

/** Host zonder poort en zonder www. */
function normalizeHost(req) {
  return (req.headers.host || "").toLowerCase().split(":")[0].replace(/^www\./, "");
}

// Lokaal geeft geen domein de taal aan; daar doet een prefix dat: /nl/..., /fr/...
// (de README beloofde dat al). In productie komen deze hosts nooit binnen.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const LOCAL = languages.map((lang) => ({ lang, prefix: `/${lang}` }));

function isLocalHost(host) {
  return LOCAL_HOSTS.has(host);
}

function resolveLang(host, pathname) {
  const candidates = HOSTS[host] || (isLocalHost(host) ? LOCAL : null);
  if (!candidates) return null;
  for (const c of candidates) {
    if (!c.prefix) return c;
    if (pathname === c.prefix || pathname.startsWith(c.prefix + "/")) return c;
  }
  return null;
}

// --- www strippen ---------------------------------------------------------
// Een allowlist, geen "stuur alles door wat niet klopt": Azure's health probes,
// het azurewebsites.net-adres en lokale requests komen binnen op een host die
// deze site nooit adverteert, en die omleiden kan de instance ongezond maken.
app.use((req, res, next) => {
  const raw = (req.headers.host || "").toLowerCase().split(":")[0];
  if (!raw.startsWith("www.")) return next();
  const bare = raw.slice(4);
  if (!HOSTS[bare]) return next();
  return res.redirect(301, `https://${bare}${req.originalUrl}`);
});

// --- sitemap en robots ----------------------------------------------------
// Per domein een eigen bestand: ty-luwa.com draagt de Engelse en de Duitse
// URL's, de andere twee alleen hun eigen taal.
for (const [file, name] of [
  ["sitemap", "sitemap.xml"],
  ["robots", "robots.txt"],
]) {
  app.get(`/${name}`, (req, res, next) => {
    const host = normalizeHost(req);
    if (!HOSTS[host]) return next();
    const ext = name.endsWith(".xml") ? "xml" : "txt";
    const target = path.join(PUBLIC_DIR, "_meta", `${file}.${host}.${ext}`);
    if (!fs.existsSync(target)) return next();
    res.type(ext === "xml" ? "application/xml" : "text/plain");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.sendFile(target);
  });
}

app.get("/healthz", (req, res) => res.type("text/plain").send("ok"));

// --- assets ---------------------------------------------------------------
// De build stempelt css en js met een inhoudshash, dus die mogen een jaar
// gecached worden. Afbeeldingen ook: ze veranderen alleen onder een nieuwe naam.
app.use(
  "/assets",
  express.static(path.join(PUBLIC_DIR, "assets"), {
    index: false,
    setHeaders(res) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    },
  })
);

// --- beheer ---------------------------------------------------------------
// Alleen op ty-luwa.nl (BEHEER_HOST) en lokaal; andere bekende hosts sturen
// door, onbekende krijgen 404. Vóór de paginahandler, die vangt anders alles.
app.use(
  "/beheer",
  require("./routes/beheer").createBeheerRouter({
    store,
    mailer,
    config,
    isLocalHost,
    knownHost: (host) => Boolean(HOSTS[host]),
  })
);

// --- aanvraagformulier ----------------------------------------------------
// Vóór de paginahandler en de 404: die vangen anders elke route af.
app.use(
  require("./routes/api").createApiRouter({
    store,
    mailer,
    config,
    content,
    routes,
    pages,
    clientIp,
    knownHost: (host) => Boolean(HOSTS[host]) || isLocalHost(host),
  })
);

// --- oude SPA-URL's -------------------------------------------------------
// De vorige opzet had de taal in het pad (/en/verblijf) en overal de
// Nederlandse slug. Die links bestaan al, dus ze krijgen een 301 naar de
// nieuwe vorm in plaats van een 404.
app.use((req, res, next) => {
  const host = normalizeHost(req);
  if (!HOSTS[host]) return next();

  const m = /^\/(nl|en|de|fr)(\/.*)?$/.exec(req.path);
  if (!m) return next();

  const lang = m[1];
  const rest = m[2] || "/";

  // /de/... op ty-luwa.com is de huidige, geldige vorm en geen oude URL.
  if (domains[lang] && domains[lang].host === host && domains[lang].prefix) {
    return next();
  }

  const pageId = legacyPaths[rest];
  if (!pageId) return next();

  const target = domains[lang];
  if (!target) return next();
  const slug = slugs[pageId][lang];
  const newPath = slug ? `${target.prefix}/${slug}` : `${target.prefix}/`;
  return res.redirect(301, `https://${target.host}${newPath}`);
});

// --- pagina's -------------------------------------------------------------
app.use((req, res, next) => {
  const host = normalizeHost(req);
  const resolved = resolveLang(host, req.path);
  if (!resolved) return next();

  const { lang, prefix } = resolved;
  let rest = prefix ? req.path.slice(prefix.length) || "/" : req.path;

  // Een oude Nederlandse slug op een anderstalig domein (ty-luwa.com/verblijf)
  // hoort naar de vertaalde URL te wijzen, niet naar een 404.
  const legacyId = legacyPaths[rest];
  if (legacyId && slugs[legacyId][lang] !== rest.replace(/^\//, "")) {
    const slug = slugs[legacyId][lang];
    const newPath = slug ? `${prefix}/${slug}` : `${prefix}/`;
    if (newPath !== req.path) return res.redirect(301, `https://${host}${newPath}`);
  }

  const name = rest === "/" ? "index" : rest.replace(/^\//, "").replace(/\/$/, "");
  if (!/^[a-z0-9-]+$/.test(name)) return next();

  const file = path.join(PUBLIC_DIR, lang, `${name}.html`);
  if (!fs.existsSync(file)) return next();

  // De HTML mag nooit gecached worden: na een deploy verwijst hij naar een
  // nieuwe assethash en die moet meteen doorkomen.
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Language", lang);

  // De beschikbaarheidspagina krijgt bij elk verzoek de actuele kalender.
  if (name === slugs.availability[lang]) {
    // ?verzonden=1 is de no-JS-route na een aanvraag (redirect na de post).
    const status = req.query.verzonden
      ? { kind: "sent", text: content[lang].availability.sent }
      : null;
    res.type("html");
    return res.send(pages.renderAvailabilityPage(lang, status));
  }
  return res.sendFile(file);
});

// --- 404 ------------------------------------------------------------------
app.use((req, res) => {
  const host = normalizeHost(req);
  const resolved = resolveLang(host, req.path);
  const lang = resolved ? resolved.lang : DEFAULT_LANG;
  const home = path.join(PUBLIC_DIR, lang, "index.html");
  res.status(404);
  res.setHeader("Cache-Control", "no-cache");
  if (fs.existsSync(home)) return res.sendFile(home);
  return res.type("text/plain").send("Not found");
});

module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Ty LuWa website running on port ${port}`);
  });
}
