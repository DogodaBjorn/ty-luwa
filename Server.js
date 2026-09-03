const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 8080;

// Azure App Service terminates TLS at the front end and forwards the original
// scheme/host in X-Forwarded-*. Without this, req.protocol always reads "http"
// and the canonical redirect below would loop.
app.set("trust proxy", true);

const PUBLIC_DIR = path.join(__dirname, "public");

// Ty LuWa runs on three ccTLDs, each the home for one language: ty-luwa.nl is
// Dutch (unprefixed — the SPA's own default), ty-luwa.fr is French, ty-luwa.com
// is English. German has no domain of its own; it stays reachable as a path
// under any of them (ty-luwa.com/de/..., as agreed). This is a deliberate
// per-country strategy, not a placeholder — do not collapse it back to a
// single canonical host.
//
// The site is a client-side SPA (React Router reads the URL the browser
// actually navigated to), so the only way to make a bare domain default to a
// language is a redirect that adds the prefix — there is no server-side
// rewrite that a client router would ever see.
const DOMAIN_DEFAULT_LANG_PREFIX = {
  "ty-luwa.nl": "",
  "ty-luwa.fr": "/fr",
  "ty-luwa.com": "/en",
};

const LANG_PREFIXED_PATH = /^\/(en|de|fr)(\/|$)/;

app.use((req, res, next) => {
  const rawHost = (req.headers.host || "").toLowerCase().split(":")[0];
  const apex = rawHost.startsWith("www.") ? rawHost.slice(4) : rawHost;
  const defaultLangPrefix = DOMAIN_DEFAULT_LANG_PREFIX[apex];

  // Anything not one of our three domains — Azure's platform probes, the
  // azurewebsites.net hostname, an IP, localhost — is left alone. Redirecting
  // those can make App Service read the instance as unhealthy.
  if (defaultLangPrefix === undefined) return next();

  const needsWwwStrip = rawHost !== apex;
  const needsLangPrefix =
    defaultLangPrefix !== "" && !LANG_PREFIXED_PATH.test(req.path);
  if (!needsWwwStrip && !needsLangPrefix) return next();

  const newPath = needsLangPrefix
    ? defaultLangPrefix + (req.path === "/" ? "/" : req.path)
    : req.path;
  const query = req.originalUrl.slice(req.path.length);
  return res.redirect(301, `https://${apex}${newPath}${query}`);
});

// Liveness probe. Kept above the static handler so it never touches disk.
app.get("/healthz", (req, res) => res.type("text/plain").send("ok"));

// Vite fingerprints every file under assets/ with a content hash, so those are
// immutable and can be cached for a year. index.html is the one file that must
// never be cached, otherwise a browser keeps loading the previous build's
// script tags after a deploy.
app.use(
  express.static(PUBLIC_DIR, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

// Single-page app fallback. React Router owns /verblijf, /en/quiberon,
// /de/faq and the rest; a hard refresh on any of them must still return
// index.html rather than a 404.
app.get("*", (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(port, () => {
  console.log(`Ty LuWa website running on port ${port}`);
});
