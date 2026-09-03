// Haalt de vier vertaalwoordenboeken uit de geminificeerde bundle in public/assets/.
//
// Waarom dit bestaat: de Vite-broncode van de site is verloren gegaan (hij stond
// gitignored in een remote container die is opgeruimd; alleen de build is ooit
// gecommit). Dit script heeft de content daaruit teruggehaald naar
// content/site-content.json, dat sindsdien de bron van waarheid is voor alle
// teksten. Het is bewaard als bewijsstuk en voor het geval de extractie herhaald
// moet worden — voor normaal werk bewerk je site-content.json rechtstreeks.
//
// Gebruik: node content/extract-from-bundle.js [pad-naar-bundle]

const fs = require("fs");
const path = require("path");

const BUNDLE =
  process.argv[2] ||
  path.join(__dirname, "..", "public", "assets", "index-BShhf7FK.js");
const OUT = path.join(__dirname, "site-content.json");

// De minifier gaf de woordenboeken deze namen. Verandert de build, dan
// verschuiven ze — zoek dan opnieuw op een herkenbare sleutel zoals `titles:{`.
const DICTS = [
  ["nl", "Dr"],
  ["en", "Or"],
  ["de", "kr"],
  ["fr", "Ar"],
];

const src = fs.readFileSync(BUNDLE, "utf8");

// Object-literals uit geminificeerde JS knippen kan niet met een regex: die telt
// geen haakjes. Dit loopt teken voor teken en houdt string-status bij, zodat een
// accolade binnen een tekst niet meetelt.
function extractObject(varName) {
  const start = new RegExp(`(?:var |,)${varName}=\\{`).exec(src);
  if (!start) return null;

  let i = start.index + start[0].length - 1; // op de openende accolade
  const from = i;
  let depth = 0;
  let inString = null;
  let escaped = false;

  for (; i < src.length; i++) {
    const c = src[i];
    if (escaped) {
      escaped = false;
    } else if (c === "\\") {
      escaped = true;
    } else if (inString) {
      if (c === inString) inString = null;
    } else if (c === '"' || c === "'" || c === "`") {
      inString = c;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  return null;
}

const out = {};
let failed = 0;

for (const [lang, varName] of DICTS) {
  const body = extractObject(varName);
  if (!body) {
    console.error(`${lang}: variabele ${varName} niet gevonden in de bundle`);
    failed++;
    continue;
  }
  if (/\$\{/.test(body)) {
    console.error(`${lang}: bevat template-interpolatie, geen zuivere data`);
    failed++;
    continue;
  }
  try {
    // eslint-disable-next-line no-eval
    out[lang] = eval(`(${body})`);
    console.error(`${lang}: ${body.length} tekens`);
  } catch (err) {
    console.error(`${lang}: kon niet worden geparsed — ${err.message}`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} woordenboek(en) mislukt, niets weggeschreven.`);
  process.exit(1);
}

fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.error(`\nGeschreven naar ${path.relative(process.cwd(), OUT)}`);
