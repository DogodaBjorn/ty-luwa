const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 8080;

// Azure App Service beeindigt TLS aan de voorkant en geeft het oorspronkelijke
// schema en de host door in X-Forwarded-*.
app.set("trust proxy", true);

const PUBLIC_DIR = path.join(__dirname, "public");
const routes = require(path.join(__dirname, "content", "routes.json"));
const { languages, domains, slugs, legacyPaths } = routes;

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

/** Host zonder poort en zonder www. */
function normalizeHost(req) {
  return (req.headers.host || "").toLowerCase().split(":")[0].replace(/^www\./, "");
}

function resolveLang(host, pathname) {
  const candidates = HOSTS[host];
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

app.listen(port, () => {
  console.log(`Ty LuWa website running on port ${port}`);
});
