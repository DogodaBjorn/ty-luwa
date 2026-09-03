const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 8080;

// Azure App Service terminates TLS at the front end and forwards the original
// scheme/host in X-Forwarded-*. Without this, req.protocol always reads "http"
// and the canonical redirect below would loop.
app.set("trust proxy", true);

const PUBLIC_DIR = path.join(__dirname, "public");

// Ty LuWa runs on three domains (ty-luwa.com, ty-luwa.fr, ty-luwa.nl). Serving
// the same pages on all three splits the search ranking three ways, so one is
// canonical and the other two redirect. Set CANONICAL_HOST in the App Service
// configuration; leave it unset locally and no redirect happens.
const CANONICAL_HOST = process.env.CANONICAL_HOST || "";

// Deliberately an allowlist, not "redirect everything that is not canonical".
// Azure's platform probes, the azurewebsites.net hostname and local requests
// all arrive with a host this app never advertises; bouncing those to the
// public domain can make App Service read the instance as unhealthy. Override
// with REDIRECT_DOMAINS (comma-separated) if a domain is ever added.
const REDIRECT_DOMAINS = (process.env.REDIRECT_DOMAINS ||
  "ty-luwa.com,ty-luwa.fr,ty-luwa.nl")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

if (CANONICAL_HOST) {
  app.use((req, res, next) => {
    const host = (req.headers.host || "").toLowerCase().split(":")[0];
    if (!host || host === CANONICAL_HOST.toLowerCase()) return next();
    const isOurs = REDIRECT_DOMAINS.some(
      (d) => host === d || host.endsWith(`.${d}`)
    );
    if (!isOurs) return next();
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
  });
}

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
