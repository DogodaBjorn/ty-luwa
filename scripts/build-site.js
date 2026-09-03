// Genereert de complete site: vier talen x zeven pagina's naar public/.
//
// De site is bewust statische HTML en geen client-side app. De hele reden voor
// drie domeinen is vindbaarheid, en die staat of valt met canonical- en
// hreflang-tags die een crawler ziet zonder JavaScript uit te voeren. Hier staan
// ze gewoon in het bestand.
//
// Bronnen: content/site-content.json (teksten, vier talen) en content/routes.json
// (domeinen en slugs). Beide zijn de enige plek waar hun soort informatie staat.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public");
const ASSETS = path.join(ROOT, "assets");

const content = require(path.join(ROOT, "content", "site-content.json"));
const routes = require(path.join(ROOT, "content", "routes.json"));

const { languages, domains, slugs, nav, footerNav, defaultLanguage } = routes;

// ---------------------------------------------------------------- helpers

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Pad van een pagina binnen zijn eigen domein, bv. "/de/unterkunft". */
function pagePath(pageId, lang) {
  const slug = slugs[pageId][lang];
  const prefix = domains[lang].prefix;
  return slug ? `${prefix}/${slug}` : `${prefix}/`;
}

/** Volledige URL inclusief domein. Nodig voor hreflang en de taalwisselaar. */
function pageUrl(pageId, lang) {
  return `https://${domains[lang].host}${pagePath(pageId, lang)}`;
}

// Lucide-achtige iconen, met de hand overgenomen zodat de site geen
// icoonbibliotheek nodig heeft. De CSS bepaalt de afmetingen.
const ICONS = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  bed: '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  waves:
    '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1"/>',
  mapPin:
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  tent: '<path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>',
};

function icon(name, extra = "") {
  return (
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${ICONS[name]}</svg>`
  );
}

const waveRule =
  '<svg class="wave-rule" viewBox="0 0 56 8" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
  '<path d="M1 5c4-4 8-4 12 0s8 4 12 0 8-4 12 0 8 4 12 0"/></svg>';

// Foto's van het verblijf. De sleutel is die uit site-content.json (gallery);
// de waarde het bestand in assets/photos/.
const PHOTOS = {
  exterior: "exterior-main.jpg",
  living: "living-overview.jpg",
  livingKitchen: "living-kitchen-wide.jpg",
  kitchen: "kitchen-overview.jpg",
  doubleBedroom: "double-bedroom.jpg",
  twinBedroom: "twin-bedroom.jpg",
  bathroom: "bathroom-wide.jpg",
  closet: "walkin-closet.jpg",
  garden: "garden-terrace.jpg",
  veranda: "veranda-panorama.jpg",
};
const photo = (key) => `/assets/photos/provisional/${PHOTOS[key]}`;

/** Breedte en hoogte uit de JPEG-header, zonder afhankelijkheid. */
function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}
const PHOTO_SIZE = Object.fromEntries(
  Object.entries(PHOTOS).map(([k, f]) => [
    k,
    jpegSize(path.join(ASSETS, "photos", "provisional", f)),
  ])
);
// Een panorama krijgt in de galerij een volle rij op natuurlijke hoogte;
// in een 280px hoge uitsnede zou er alleen een smalle strook van overblijven.
const isPanorama = (key) => {
  const s = PHOTO_SIZE[key];
  return !!s && s.width / s.height > 2.4;
};

// De eerste vijf vullen de mozaiek op de homepage.
const MOSAIC = ["exterior", "living", "livingKitchen", "kitchen", "doubleBedroom"];

const FACT_ICONS = ["users", "bed", "home", "waves"];
const CARD_ICONS = ["tent", "sun", "waves"];

// ---------------------------------------------------------------- layout

/**
 * Meta description per pagina. Elke pagina heeft een eigen introtekst in de
 * content; die is een betere beschrijving dan overal dezelfde herotekst zetten,
 * wat de vorige site deed. FAQ heeft geen introtekst en valt terug.
 */
function description(t, pageId) {
  const own = t[pageId] && typeof t[pageId].text === "string" ? t[pageId].text : null;
  const raw = own || t.home.heroBody;
  if (raw.length <= 160) return raw;
  const cut = raw.slice(0, 160);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…";
}

function head(ctx) {
  const { lang, pageId, t, assetHash } = ctx;
  const title = t.titles[ctx.legacyPath];
  const desc = description(t, pageId);
  const url = pageUrl(pageId, lang);
  const ogImage = `https://${domains[lang].host}${photo("exterior")}`;

  const alternates = languages
    .map(
      (l) =>
        `  <link rel="alternate" hreflang="${l}" href="${pageUrl(pageId, l)}">`
    )
    .join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: "Ty LuWa",
    description: desc,
    url,
    image: ogImage,
    inLanguage: lang,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Quiberon",
      addressRegion: "Bretagne",
      addressCountry: "FR",
    },
    containedInPlace: {
      "@type": "Campground",
      name: "Camping Le Conguel",
    },
  };
  if (pageId === "faq") {
    jsonLd["@type"] = ["LodgingBusiness", "FAQPage"];
    jsonLd.mainEntity = t.faq.items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    }));
  }

  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#123F5D">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${url}">
${alternates}
  <link rel="alternate" hreflang="x-default" href="${pageUrl(pageId, defaultLanguage)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Ty LuWa">
  <meta property="og:locale" content="${lang}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="/assets/site.${assetHash}.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function navLinks(ctx, className = "") {
  return nav
    .map((id) => {
      const active = id === ctx.pageId ? ' class="active"' : "";
      const cls = className && !active ? ` class="${className}"` : "";
      return `<a href="${pagePath(id, ctx.lang)}"${active || cls}>${esc(
        ctx.navLabels[id]
      )}</a>`;
    })
    .join("\n        ");
}

/** De taalwisselaar springt naar hetzelfde artikel op het domein van die taal. */
function langSwitch(ctx) {
  const links = languages
    .map((l) => {
      const active = l === ctx.lang ? ' class="active"' : "";
      const current = l === ctx.lang ? ' aria-current="true"' : "";
      return `<a href="${pageUrl(ctx.pageId, l)}" lang="${l}"${active}${current}>${l.toUpperCase()}</a>`;
    })
    .join("");
  return `<div class="lang-switch" aria-label="Taal · Language · Sprache · Langue">${links}</div>`;
}

function layout(ctx, main) {
  const { t, lang } = ctx;
  const availability = pagePath("availability", lang);

  return `<!doctype html>
<html lang="${lang}">
<head>
  ${head(ctx)}
</head>
<body>
  <a class="skip-link" href="#main">${esc(t.layout.skipLink)}</a>

  <header class="site-header">
    <a class="brand" href="${pagePath("home", lang)}" aria-label="Ty LuWa">
      <img src="/assets/brand/ty-luwa-logo-header.png" alt="Ty LuWa" width="240" height="68">
    </a>
    <nav class="desktop-nav" aria-label="${esc(t.layout.navAria)}">
        ${navLinks(ctx)}
    </nav>
    <div class="header-actions">
      ${langSwitch(ctx)}
      <a class="btn btn-primary desktop-only" href="${availability}">${esc(t.layout.cta)}</a>
      <button class="icon-button mobile-only" type="button"
              aria-label="${esc(t.layout.menuAria)}" aria-expanded="false"
              aria-controls="mobile-menu" data-menu-toggle>
        ${icon("menu")}
      </button>
    </div>
    <div class="mobile-menu" id="mobile-menu" hidden>
        ${navLinks(ctx)}
        <a class="btn btn-primary" href="${availability}">${esc(t.layout.cta)}</a>
        ${langSwitch(ctx)}
    </div>
  </header>

  <main id="main">
${main}
  </main>

  <footer class="site-footer">
    <div class="footer-brand">
      <strong>Ty LuWa</strong>
      <span>Le Conguel · Quiberon · Bretagne</span>
      ${waveRule}
    </div>
    <nav class="footer-nav" aria-label="${esc(t.layout.footerNavAria)}">
      ${footerNav
        .map(
          (id) =>
            `<a href="${pagePath(id, lang)}">${esc(ctx.allLabels[id])}</a>`
        )
        .join("\n      ")}
    </nav>
    <p class="fineprint">${esc(t.layout.fineprint)}</p>
  </footer>

  <div class="mobile-cta">
    <span>${esc(t.layout.mobileBar)}</span>
    <a class="btn btn-primary" href="${availability}">${esc(t.layout.ctaShort)}</a>
  </div>

  <script src="/assets/site.${ctx.assetHash}.js" defer></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- pagina's

function sectionHeading(eyebrow, title, text) {
  return `<div class="section-heading">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
        ${waveRule}
        <h2>${esc(title)}</h2>
        ${text ? `<p>${esc(text)}</p>` : ""}
      </div>`;
}

function pageHome(ctx) {
  const { t, lang } = ctx;
  const h = t.home;
  return `    <section class="hero">
      <img class="hero-image" src="${photo("exterior")}" alt="${esc(
    t.stay.gallery.exterior.alt
  )}" fetchpriority="high">
      <div class="hero-overlay"></div>
      <div class="container hero-content">
        <p class="eyebrow light">Le Conguel · Quiberon</p>
        <h1>${esc(h.heroTitlePre)}<em>${esc(h.heroTitleEm)}</em>${esc(
    h.heroTitlePost
  )}</h1>
        <p>${esc(h.heroBody)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="${pagePath("availability", lang)}">${esc(
    t.layout.cta
  )} ${icon("arrowRight")}</a>
          <a class="btn btn-ghost" href="${pagePath("stay", lang)}">${esc(
    h.heroCtaSecondary
  )}</a>
        </div>
      </div>
    </section>

    <div class="container">
      <div class="quick-facts">
        ${h.facts
          .map(
            (f, i) => `<div>
          ${icon(FACT_ICONS[i] || "check")}
          <strong>${esc(f.title)}</strong>
          <span>${esc(f.sub)}</span>
        </div>`
          )
          .join("\n        ")}
      </div>
    </div>

    <section class="section">
      <div class="container">
        ${sectionHeading(null, h.intro.title, h.intro.text)}
        <div class="photo-mosaic" role="group" aria-label="${esc(t.mosaicAria)}">
          ${MOSAIC.map(
            (k, i) =>
              `<img${i === 0 ? ' class="mosaic-main"' : ""} src="${photo(
                k
              )}" alt="${esc(t.stay.gallery[k].alt)}" loading="lazy">`
          ).join("\n          ")}
        </div>
        <p class="center"><a class="text-link" href="${pagePath(
          "stay",
          lang
        )}">${esc(h.intro.link)}</a></p>
      </div>
    </section>

    <section class="section band band-sand">
      <div class="container split-section">
        <div class="split-copy">
          ${waveRule}
          <h2>${esc(h.stay.title)}</h2>
          <p>${esc(h.stay.body)}</p>
          <ul class="feature-list">
            ${h.stay.features
              .map((f) => `<li>${icon("check")}<span>${esc(f)}</span></li>`)
              .join("\n            ")}
          </ul>
          <a class="btn btn-secondary" href="${pagePath("stay", lang)}">${esc(
    h.stay.button
  )} ${icon("arrowRight")}</a>
        </div>
        <img class="rounded-image" src="${photo("living")}" alt="${esc(
    t.stay.gallery.living.alt
  )}" loading="lazy">
      </div>
    </section>

    <section class="context-band">
      <div class="container context-inner">
        <div>
          <p class="eyebrow light">${esc(h.conguel.eyebrow)}</p>
          <h2>${esc(h.conguel.title)}</h2>
          <p>${esc(h.conguel.body)}</p>
          <p><a class="btn btn-light" href="${pagePath("conguel", lang)}">${esc(
    h.conguel.button
  )} ${icon("arrowRight")}</a></p>
        </div>
        <div class="context-icon">${icon("waves")}</div>
      </div>
    </section>

    <section class="section">
      <div class="container split-section reverse">
        <div class="split-copy">
          ${waveRule}
          <h2>${esc(h.quiberon.title)}</h2>
          <p>${esc(h.quiberon.body)}</p>
          <a class="btn btn-secondary" href="${pagePath("quiberon", lang)}">${esc(
    h.quiberon.button
  )} ${icon("arrowRight")}</a>
        </div>
        <img class="rounded-image illustration" src="/assets/brand/ty-luwa-hero-illustration.png" alt="" loading="lazy">
      </div>
    </section>

    <section class="booking-banner">
      <div class="container">
        <div>
          <p class="eyebrow light">${esc(h.booking.eyebrow)}</p>
          <h2>${esc(h.booking.title)}</h2>
          <p>${esc(h.booking.body)}</p>
        </div>
        <a class="btn btn-light" href="${pagePath("availability", lang)}">${esc(
    t.layout.cta
  )} ${icon("arrowRight")}</a>
      </div>
    </section>`;
}

function pageStay(ctx) {
  const { t } = ctx;
  const s = t.stay;
  const galleryKeys = Object.keys(s.gallery);
  return `    <section class="section page-top">
      <div class="container narrow">
        ${sectionHeading(s.eyebrow, s.title, s.text)}
      </div>

      <div class="container content-grid">
        <div>
          <h3>${esc(s.sleepTitle)}</h3>
          ${s.sleeping
            .map(
              (b) => `<div class="info-card">
            <strong>${esc(b.title)}</strong>
            <p>${esc(b.detail)}</p>
          </div>`
            )
            .join("\n          ")}
        </div>
        <div>
          <h3>${esc(s.amenitiesTitle)}</h3>
          <div class="amenity-list">
            ${s.amenities
              .map((a) => `<div>${icon("check")}<span>${esc(a)}</span></div>`)
              .join("\n            ")}
          </div>
        </div>
      </div>
    </section>

    <section class="section band band-sand">
      <div class="container">
        <div class="gallery-grid">
          ${galleryKeys
            .map(
              (k) => `<figure${isPanorama(k) ? ' class="panorama"' : ""}>
            <img src="${photo(k)}" alt="${esc(s.gallery[k].alt)}" loading="lazy"${
                PHOTO_SIZE[k] ? ` width="${PHOTO_SIZE[k].width}" height="${PHOTO_SIZE[k].height}"` : ""
              }>
            <figcaption>${esc(s.gallery[k].category)}</figcaption>
          </figure>`
            )
            .join("\n          ")}
        </div>
      </div>
    </section>`;
}

function cardsPage(ctx, key, iconSet) {
  const { t } = ctx;
  const p = t[key];
  return `    <section class="section page-top">
      <div class="container narrow">
        ${sectionHeading(p.eyebrow, p.title, p.text)}
      </div>
      <div class="container">
        <div class="destination-grid">
          ${p.cards
            .map(
              (c, i) => `<article>
            ${icon(iconSet[i % iconSet.length])}
            <h3>${esc(c.title)}</h3>
            <p>${esc(c.body)}</p>
          </article>`
            )
            .join("\n          ")}
        </div>
        ${
          p.link
            ? `<p class="center"><a class="text-link" href="https://siblu.fr/camping/france/cote-atlantique-nord/bretagne/le-conguel" target="_blank" rel="noopener">${esc(
                p.link
              )}</a></p>`
            : ""
        }
      </div>
    </section>`;
}

function pageAvailability(ctx) {
  const { t } = ctx;
  const a = t.availability;
  const field = (name, label, type = "text", ph = "") =>
    `<label>${esc(label)}
            <input type="${type}" name="${name}" ${
      ph ? `placeholder="${esc(ph)}"` : ""
    } ${type === "date" || name === "name" || name === "email" ? "required" : ""}>
          </label>`;

  return `    <section class="section page-top">
      <div class="container narrow">
        ${sectionHeading(a.eyebrow, a.title, a.text)}

        <form class="request-form" data-request-form novalidate>
          <div class="form-row">
            ${field("arrival", a.arrival, "date")}
            ${field("departure", a.departure, "date")}
          </div>
          <div class="form-row">
            ${field("adults", a.adults, "number")}
            ${field("children", a.children, "number")}
          </div>
          ${field("name", a.name, "text", a.phName)}
          ${field("email", a.email, "email", a.phEmail)}
          <label>${esc(a.message)}
            <textarea name="message" rows="5" placeholder="${esc(
              a.phMessage
            )}"></textarea>
          </label>
          <p class="form-status" data-form-status hidden>${esc(a.status)}</p>
          <button class="btn btn-primary" type="submit">${esc(a.submit)}</button>
          <p class="form-note">${icon("info")}<span>${esc(a.note)}</span></p>
        </form>
      </div>
    </section>`;
}

function pageFaq(ctx) {
  const { t } = ctx;
  return `    <section class="section page-top">
      <div class="container narrow faq">
        ${sectionHeading(null, t.faq.title, null)}
        ${t.faq.items
          .map(
            (it) => `<details>
          <summary>${esc(it.q)}</summary>
          <p>${esc(it.a)}</p>
        </details>`
          )
          .join("\n        ")}
      </div>
    </section>`;
}

function pageContact(ctx) {
  const { t, lang } = ctx;
  const c = t.contact;
  return `    <section class="section page-top">
      <div class="container narrow">
        ${sectionHeading(c.eyebrow, c.title, c.text)}
        <p><a class="btn btn-primary" href="${pagePath("availability", lang)}">${esc(
    t.layout.cta
  )} ${icon("arrowRight")}</a></p>
      </div>
    </section>`;
}

const PAGES = {
  home: pageHome,
  stay: pageStay,
  conguel: (ctx) => cardsPage(ctx, "conguel", CARD_ICONS),
  quiberon: (ctx) => cardsPage(ctx, "quiberon", ["waves", "mapPin", "sun"]),
  availability: pageAvailability,
  faq: pageFaq,
  contact: pageContact,
};

// De teksten indexeren nog op de oude Nederlandse paden; die blijven de sleutel
// van titles{}. Deze tabel vertaalt pagina-id naar die sleutel.
const LEGACY_KEY = {
  home: "/",
  stay: "/verblijf",
  conguel: "/le-conguel",
  quiberon: "/quiberon",
  availability: "/beschikbaarheid",
  faq: "/faq",
  contact: "/contact",
};

// ---------------------------------------------------------------- build

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // Assets kopieren en css/js van een inhoudshash voorzien, zodat ze een jaar
  // gecached mogen worden en een deploy toch meteen doorkomt.
  const css = fs.readFileSync(path.join(ASSETS, "site.css"), "utf8");
  const js = fs.readFileSync(path.join(ASSETS, "site.js"), "utf8");
  const assetHash = crypto
    .createHash("sha256")
    .update(css + js)
    .digest("hex")
    .slice(0, 8);

  const outAssets = path.join(OUT, "assets");
  copyDir(path.join(ASSETS, "brand"), path.join(outAssets, "brand"));
  copyDir(path.join(ASSETS, "photos"), path.join(outAssets, "photos"));
  fs.copyFileSync(
    path.join(ASSETS, "favicon.svg"),
    path.join(outAssets, "favicon.svg")
  );
  fs.writeFileSync(path.join(outAssets, `site.${assetHash}.css`), css);
  fs.writeFileSync(path.join(outAssets, `site.${assetHash}.js`), js);

  let written = 0;
  for (const lang of languages) {
    const t = content[lang];
    if (!t) throw new Error(`Geen content voor taal "${lang}"`);

    // Navigatielabels komen uit layout.nav, dat nog op oude paden indexeert.
    const byLegacy = Object.fromEntries(t.layout.nav);
    const navLabels = {};
    for (const id of nav) navLabels[id] = byLegacy[LEGACY_KEY[id]];
    const allLabels = { ...navLabels, faq: "FAQ", contact: t.contact.eyebrow };

    const dir = path.join(OUT, lang);
    fs.mkdirSync(dir, { recursive: true });

    for (const pageId of Object.keys(PAGES)) {
      const ctx = {
        lang,
        pageId,
        t,
        navLabels,
        allLabels,
        assetHash,
        legacyPath: LEGACY_KEY[pageId],
      };
      const html = layout(ctx, PAGES[pageId](ctx));
      const slug = slugs[pageId][lang];
      fs.writeFileSync(path.join(dir, `${slug || "index"}.html`), html);
      written++;
    }
  }

  // Een sitemap per domein. ty-luwa.com draagt zowel de Engelse als de Duitse
  // URL's, want die delen dat domein.
  const meta = path.join(OUT, "_meta");
  fs.mkdirSync(meta, { recursive: true });
  const hosts = [...new Set(languages.map((l) => domains[l].host))];
  for (const host of hosts) {
    const langsHere = languages.filter((l) => domains[l].host === host);
    const urls = [];
    for (const l of langsHere) {
      for (const pageId of Object.keys(PAGES)) {
        const alts = languages
          .map(
            (o) =>
              `      <xhtml:link rel="alternate" hreflang="${o}" href="${pageUrl(
                pageId,
                o
              )}"/>`
          )
          .join("\n");
        urls.push(
          `    <url>\n      <loc>${pageUrl(
            pageId,
            l
          )}</loc>\n${alts}\n    </url>`
        );
      }
    }
    fs.writeFileSync(
      path.join(meta, `sitemap.${host}.xml`),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join(
        "\n"
      )}\n</urlset>\n`
    );
    fs.writeFileSync(
      path.join(meta, `robots.${host}.txt`),
      `User-agent: *\nAllow: /\nDisallow: /beheer\n\nSitemap: https://${host}/sitemap.xml\n`
    );
  }

  console.log(
    `${written} pagina's (${languages.length} talen x ${
      Object.keys(PAGES).length
    }), ${hosts.length} sitemaps, assets ${assetHash}`
  );
}

build();
