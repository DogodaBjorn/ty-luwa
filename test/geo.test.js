// AI-vindbaarheid (GEO): wat de build per domein neerzet voor zoekmachines en
// taalmodellen. De build draait echt (public/ is wegwerp, zie .gitignore) en de
// test leest wat er staat: robots.txt met expliciete AI-agents, llms.txt uit de
// content, en één entiteit in het JSON-LD van elke pagina in elke taal.

const { test, before, describe } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const META = path.join(PUBLIC, "_meta");
const routes = require("../content/routes.json");
const content = require("../content/site-content.json");

const read = (f) => fs.readFileSync(path.join(META, f), "utf8");

before(() => {
  execFileSync(process.execPath, ["scripts/build-site.js"], { cwd: ROOT, stdio: "ignore" });
});

describe("robots.txt", () => {
  for (const host of ["ty-luwa.nl", "ty-luwa.com", "ty-luwa.fr"]) {
    test(`${host}: AI-agents expliciet toegelaten, beheer en api dicht, sitemap van het eigen domein`, () => {
      const txt = read(`robots.${host}.txt`);
      for (const ua of ["*", "GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended"]) {
        const block = txt.split("\n\n").find((b) => b.startsWith(`User-agent: ${ua}\n`));
        assert.ok(block, `blok voor ${ua}`);
        assert.match(block, /^Allow: \/$/m);
        assert.match(block, /^Disallow: \/beheer$/m);
        assert.match(block, /^Disallow: \/api$/m);
      }
      assert.ok(txt.includes(`Sitemap: https://${host}/sitemap.xml`));
    });
  }
});

describe("llms.txt", () => {
  test("ty-luwa.nl: Nederlands, de feiten en elke pagina met haar URL", () => {
    const txt = read("llms.ty-luwa.nl.txt");
    assert.ok(txt.startsWith("# Ty LuWa (nl)"));
    assert.ok(txt.includes(content.nl.home.heroBody));
    assert.ok(txt.includes("4 personen"), "feitenblad: 4 personen");
    for (const pageId of Object.keys(routes.slugs)) {
      const slug = routes.slugs[pageId].nl;
      assert.ok(txt.includes(`https://ty-luwa.nl/${slug}`), `URL van ${pageId}`);
    }
    for (const it of content.nl.faq.items) assert.ok(txt.includes(it.q.trim()), `FAQ: ${it.q}`);
    assert.ok(!txt.includes("/beheer"), "geen beheer-URL's");
  });

  test("ty-luwa.com: een sectie Engels en een sectie Duits, met Duitse URL's onder /de", () => {
    const txt = read("llms.ty-luwa.com.txt");
    assert.ok(txt.includes("# Ty LuWa (en)"));
    assert.ok(txt.includes("# Ty LuWa (de)"));
    assert.ok(txt.includes("https://ty-luwa.com/the-house"));
    assert.ok(txt.includes("https://ty-luwa.com/de/unterkunft"));
    assert.ok(txt.includes(content.de.home.heroBody));
  });

  test("ty-luwa.fr: alleen Frans", () => {
    const txt = read("llms.ty-luwa.fr.txt");
    assert.ok(txt.startsWith("# Ty LuWa (fr)"));
    assert.ok(!txt.includes("# Ty LuWa (nl)"));
    assert.ok(txt.includes("https://ty-luwa.fr/le-logement"));
  });
});

describe("JSON-LD entiteit", () => {
  const pages = fs
    .readdirSync(PUBLIC, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".html") && !f.startsWith("_meta"));

  test("elke gebouwde pagina draagt dezelfde @id, de camping, 2 kamers en de voorzieningen", () => {
    assert.equal(pages.length, routes.languages.length * Object.keys(routes.slugs).length);
    for (const f of pages) {
      const html = fs.readFileSync(path.join(PUBLIC, f), "utf8");
      const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(m, `JSON-LD in ${f}`);
      const ld = JSON.parse(m[1]);
      assert.equal(ld["@id"], "https://ty-luwa.com/#ty-luwa", f);
      assert.equal(ld.name, "Ty LuWa", f);
      assert.equal(ld.containedInPlace.name, "Camping Le Conguel", f);
      assert.equal(ld.containedInPlace.url, "https://leconguel.fr/", f);
      assert.equal(ld.numberOfRooms, 2, f);
      assert.equal(ld.amenityFeature.length, 13, f);
      assert.equal(ld.amenityFeature[0]["@type"], "LocationFeatureSpecification", f);
    }
  });

  test("de FAQ-pagina is ook een FAQPage met alle vragen", () => {
    const html = fs.readFileSync(path.join(PUBLIC, "nl", "faq.html"), "utf8");
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.deepEqual(ld["@type"], ["LodgingBusiness", "FAQPage"]);
    assert.equal(ld.mainEntity.length, content.nl.faq.items.length);
  });
});
