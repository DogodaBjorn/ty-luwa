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
