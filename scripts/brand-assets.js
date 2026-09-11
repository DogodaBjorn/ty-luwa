// Afgeleide merkbestanden. Eenmalig draaien; vereist `npm i pngjs jpeg-js` (geen
// dependencies van de site zelf). node scripts/brand-assets.js
// Maakt twee afgeleide merkbestanden uit assets/brand/:
//  - ty-luwa-logo-stacked.png : huisje + golven + woordmerk uit het volledige logo, zonder de
//    hermelijnen en de tagline (onleesbaar op headerformaat), verkleind tot 320px breed.
//  - ty-luwa-share.jpg        : 1200x630 deelkaart (WhatsApp, LinkedIn, Facebook) met de
//    hero-tekening gecentreerd op de crème achtergrond van de site.
const { PNG } = require("pngjs");
const jpeg = require("jpeg-js");
const fs = require("fs");
const BRAND = require("path").join(__dirname, "..", "assets", "brand") + "/";

const readPng = (f) => PNG.sync.read(fs.readFileSync(BRAND + f));

function crop(src, x0, y0, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    src.data.copy(out.data, y * w * 4, ((y0 + y) * src.width + x0) * 4, ((y0 + y) * src.width + x0 + w) * 4);
  return out;
}

// Gebiedsgemiddelde met 4x4 subsamples (bilineair), alpha gepremultipliceerd.
function resize(src, dw, dh) {
  const out = new PNG({ width: dw, height: dh });
  const sx = src.width / dw, sy = src.height / dh, S = 4;
  const sample = (x, y) => {
    x = Math.min(Math.max(x, 0), src.width - 1.001); y = Math.min(Math.max(y, 0), src.height - 1.001);
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const r = [0, 0, 0, 0];
    for (const [ox, oy, wgt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
      const i = ((y0 + oy) * src.width + x0 + ox) * 4, a = src.data[i + 3] / 255;
      r[0] += src.data[i] * a * wgt; r[1] += src.data[i + 1] * a * wgt; r[2] += src.data[i + 2] * a * wgt; r[3] += a * wgt;
    }
    return r;
  };
  for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
    const acc = [0, 0, 0, 0];
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const s = sample((x + (i + 0.5) / S) * sx - 0.5, (y + (j + 0.5) / S) * sy - 0.5);
      for (let k = 0; k < 4; k++) acc[k] += s[k] / (S * S);
    }
    const o = (y * dw + x) * 4, a = acc[3];
    out.data[o] = a ? Math.round(acc[0] / a) : 0;
    out.data[o + 1] = a ? Math.round(acc[1] / a) : 0;
    out.data[o + 2] = a ? Math.round(acc[2] / a) : 0;
    out.data[o + 3] = Math.round(a * 255);
  }
  return out;
}

// 1. Gestapeld logo: rijen 0-612 van het merk (huisje, golven, woordmerk incl. staart van de y).
const mark = readPng("ty-luwa-logo-mark.png");
const stacked = resize(crop(mark, 0, 0, 830, 612), 320, Math.round(612 * 320 / 830));
fs.writeFileSync(BRAND + "ty-luwa-logo-stacked.png", PNG.sync.write(stacked));
console.log("stacked", stacked.width + "x" + stacked.height, fs.statSync(BRAND + "ty-luwa-logo-stacked.png").size, "bytes");

// 2. Deelkaart 1200x630.
const hero = readPng("ty-luwa-hero-illustration.png");
const bbox = { x0: 185, y0: 234, x1: 1081, y1: 1056 };
const pad = 24;
const art = crop(hero, bbox.x0 - pad, bbox.y0 - pad, bbox.x1 - bbox.x0 + 2 * pad, bbox.y1 - bbox.y0 + 2 * pad);
const H = 590, W = Math.round(art.width * H / art.height);
const small = resize(art, W, H);
const CW = 1200, CH = 630, bg = [252, 246, 238];
const card = Buffer.alloc(CW * CH * 4);
for (let i = 0; i < CW * CH; i++) { card[i * 4] = bg[0]; card[i * 4 + 1] = bg[1]; card[i * 4 + 2] = bg[2]; card[i * 4 + 3] = 255; }
const ox = Math.round((CW - W) / 2), oy = Math.round((CH - H) / 2);
for (let y = 0; y < H; y++) small.data.copy(card, ((oy + y) * CW + ox) * 4, y * W * 4, (y + 1) * W * 4);
const q = 88;
const jpg = jpeg.encode({ data: card, width: CW, height: CH }, q).data;
fs.writeFileSync(BRAND + "ty-luwa-share.jpg", jpg);
console.log("share", CW + "x" + CH, "art", W + "x" + H, jpg.length, "bytes, q", q);

// 3. App-iconen voor het beheer op het beginscherm (/beheer/app).
// Bron is het huisje met de golven uit het merkteken, zonder woordmerk en
// zonder tagline: op 48 pixels leest alleen het huisje nog. De gemeten
// begrenzing van dat deel (alpha > 32, boven de "T" van Ty die op rij 427
// begint) is x 11-659, y 5-418.
const ICON_BOX = { x0: 11, y0: 5, x1: 659, y1: 418 };

// Source-over: het merkteken is het enige bronbestand mét alpha, dus hier kan
// niet zoals bij de deelkaart met een kale copy() gestempeld worden.
function over(dst, dstW, src, ox, oy) {
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < src.width; x++) {
      const s = (y * src.width + x) * 4;
      const a = src.data[s + 3] / 255;
      if (!a) continue;
      const d = ((oy + y) * dstW + ox + x) * 4;
      for (let k = 0; k < 3; k++) dst[d + k] = Math.round(src.data[s + k] * a + dst[d + k] * (1 - a));
    }
}

// Ondoorzichtig crème: Apple maakt transparantie zwart, en launchers zetten er
// anders zelf een wit vlak onder.
function icon(file, size, fraction) {
  const art = crop(mark, ICON_BOX.x0, ICON_BOX.y0, ICON_BOX.x1 - ICON_BOX.x0 + 1, ICON_BOX.y1 - ICON_BOX.y0 + 1);
  const w = Math.round(size * fraction);
  const h = Math.round((w * art.height) / art.width);
  const small = resize(art, w, h);
  const out = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i++) {
    out.data[i * 4] = bg[0];
    out.data[i * 4 + 1] = bg[1];
    out.data[i * 4 + 2] = bg[2];
    out.data[i * 4 + 3] = 255;
  }
  over(out.data, size, small, Math.round((size - w) / 2), Math.round((size - h) / 2));
  fs.writeFileSync(BRAND + file, PNG.sync.write(out));
  console.log(file, size + "x" + size, "beeld " + w + "x" + h, fs.statSync(BRAND + file).size, "bytes");
}

// Let op bij een herontwerp: public/assets wordt met max-age=31536000,immutable
// geserveerd, dus een nieuw ontwerp hoort een nieuwe bestandsnaam te krijgen.
// En iOS kopieert het icoon bij het installeren: wie het al op zijn beginscherm
// heeft, ziet een latere wijziging niet.
icon("ty-luwa-icoon-192.png", 192, 0.8);
icon("ty-luwa-icoon-512.png", 512, 0.8);
// maskable: de veilige zone is een cirkel van 80%, dus de diagonaal van het
// beeld moet daarbinnen passen. Bij deze beeldverhouding (1,57) is dat 66%.
icon("ty-luwa-icoon-maskable-512.png", 512, 0.66);
icon("ty-luwa-icoon-apple-180.png", 180, 0.76);
