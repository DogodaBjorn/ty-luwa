// De opgemaakte versie van een mail, in de huisstijl van Ty LuWa.
//
// Mail is geen web. Outlook op Windows rendert met de Word-engine, dus:
// alle ruimte als padding op <td> (padding op div en p wordt genegeerd),
// regelhoogtes in px met mso-line-height-rule, breedte als attribuut én als
// stijl, bgcolor naast background-color, geen flex, geen grid, geen
// achtergrondafbeeldingen, geen border-radius waar het uitmaakt. De layout
// moet kloppen zonder dat er één regel uit <style> wordt toegepast.
//
// Verder: color-scheme light only (anders keert een donkere modus cream en
// navy om en verdwijnt het logo), format-detection uit (deze mail bestaat uit
// datums, die maakt iOS anders tot agenda-links), en role="presentation" op
// elke layouttabel.

const LOGO_URL = "https://ty-luwa.nl/assets/brand/ty-luwa-logo-stacked.png";

// Spiegelt :root in assets/site.css; test/mail-doc.test.js bewaakt dat.
const COLORS = {
  navy: "#123f5d",
  sea: "#82b7c5",
  sand: "#dec9a3",
  sage: "#7c906d",
  cream: "#faf7f1",
  ink: "#2e3436",
  line: "#e7e1d7",
  sageInk: "#5a6c4d",
  sandTint: "#f4ede1",
  seaInk: "#3e7086",
  footerBg: "#0d2f45",
  footerInk: "#d8e4e8",
};

const TONES = {
  warn: { bg: "#fcf6e8", bar: COLORS.sand, ink: "#6b5b33" },
  info: { bg: "#e8f1f4", bar: COLORS.sea, ink: COLORS.seaInk },
  calm: { bg: "#eef1ea", bar: COLORS.sage, ink: COLORS.sageInk },
};

const SANS = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const BASE = `font-family:${SANS};font-size:16px;line-height:24px;mso-line-height-rule:exactly;color:${COLORS.ink};`;

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const br = (s) => esc(s).replace(/\n/g, "<br>");

const { safeHref } = require("./mail-doc");

/** Een rij in de kaart; alle ruimte hangt aan deze cel. */
const row = (inner, { padding = "0 28px" } = {}) =>
  `<tr><td style="padding:${padding};">${inner}</td></tr>`;

const spacer = (h) =>
  `<tr><td height="${h}" style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`;

function link(href, label, style) {
  const safe = safeHref(href);
  if (!safe) return esc(label);
  return `<a href="${esc(safe)}" style="${style}">${esc(label)}</a>`;
}

/** Een bijschrift boven een blok: eigen rij, ruimte op de cel. */
function captionHtml(text) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tr><td style="padding:0 0 6px;${BASE}font-size:13px;line-height:20px;font-weight:bold;color:${COLORS.sageInk};">${esc(text)}</td></tr>
        </table>`;
}

function factsHtml(b) {
  const rows = b.rows
    .map(
      (r) => `<tr>
            <td style="padding:5px 14px 5px 0;${BASE}font-size:15px;line-height:22px;color:${COLORS.sageInk};white-space:nowrap;vertical-align:top;">${esc(r.label)}</td>
            <td style="padding:5px 0;${BASE}font-size:15px;line-height:22px;vertical-align:top;"${r.lang ? ` lang="${esc(r.lang)}"` : ""}>${
              r.href ? link(r.href, r.value, `color:${COLORS.seaInk};text-decoration:underline;`) : br(r.value)
            }</td>
          </tr>`
    )
    .join("");
  const caption = b.caption ? captionHtml(b.caption) : "";
  return `${caption}<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">${rows}</table>`;
}

function noticeHtml(b) {
  const t = TONES[b.tone] || TONES.info;
  const inner = [];
  if (b.title) {
    inner.push(
      `<tr><td style="padding:0 0 2px;${BASE}font-size:15px;line-height:22px;font-weight:bold;color:${t.ink};">${esc(b.title)}</td></tr>`
    );
  }
  for (const l of b.lines || []) {
    inner.push(`<tr><td style="padding:2px 0 0;${BASE}font-size:15px;line-height:22px;">${br(l)}</td></tr>`);
  }
  if (b.rows && b.rows.length) {
    inner.push(`<tr><td style="padding:8px 0 0;">${factsHtml({ rows: b.rows })}</td></tr>`);
  }
  const body = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">${inner.join("")}</table>`;
  // Het balkje is een aparte cel: Word rondt border-left onvoorspelbaar af.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${t.bg}" style="background-color:${t.bg};border-collapse:collapse;">
          <tr>
            <td width="4" bgcolor="${t.bar}" style="width:4px;background-color:${t.bar};font-size:0;line-height:0;">&nbsp;</td>
            <td style="padding:12px 16px;">${body}</td>
          </tr>
        </table>`;
}

function blockHtml(b) {
  switch (b.type) {
    case "eyebrow":
      return row(
        `<div style="${BASE}font-size:12px;line-height:18px;font-weight:bold;color:${COLORS.sageInk};text-transform:uppercase;">${esc(b.text)}</div>`
      );
    case "h":
      return row(
        `<div style="font-family:${SERIF};font-size:${b.level === 1 ? 26 : 19}px;line-height:${b.level === 1 ? 32 : 26}px;mso-line-height-rule:exactly;color:${COLORS.navy};font-weight:${b.level === 1 ? "normal" : "bold"};">${esc(b.text)}</div>`
      );
    case "p": {
      const style =
        b.tone === "lead"
          ? `${BASE}font-size:18px;line-height:26px;color:${COLORS.navy};font-weight:bold;`
          : b.tone === "muted"
            ? `${BASE}font-size:14px;line-height:21px;color:${COLORS.sageInk};`
            : BASE;
      return row(`<div style="${style}"${b.lang ? ` lang="${esc(b.lang)}"` : ""}>${br(b.text)}</div>`);
    }
    case "facts":
      return row(factsHtml(b));
    case "notice":
      return row(noticeHtml(b));
    case "quote": {
      const caption = b.caption ? captionHtml(b.caption) : "";
      const bg = b.tone === "muted" ? "#eef5f7" : COLORS.sandTint;
      const bar = b.tone === "muted" ? COLORS.sea : COLORS.sand;
      return row(
        `${caption}<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${bg}" style="background-color:${bg};border-collapse:collapse;">
          <tr>
            <td width="4" bgcolor="${bar}" style="width:4px;background-color:${bar};font-size:0;line-height:0;">&nbsp;</td>
            <td style="padding:12px 16px;${BASE}"${b.lang ? ` lang="${esc(b.lang)}"` : ""}>${br(b.text)}</td>
          </tr>
        </table>`
      );
    }
    case "button": {
      const safe = safeHref(b.href);
      if (!safe) return "";
      return row(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr><td bgcolor="${COLORS.navy}" style="background-color:${COLORS.navy};border-radius:8px;">
            <a href="${esc(safe)}" style="display:inline-block;padding:14px 26px;${BASE}font-size:16px;line-height:20px;color:${COLORS.cream};text-decoration:none;font-weight:bold;">${esc(b.label)}</a>
          </td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tr><td style="padding:8px 0 0;${BASE}font-size:13px;line-height:20px;color:${COLORS.sageInk};">${esc(safe)}</td></tr>
        </table>`
      );
    }
    case "code":
      return row(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          <tr><td bgcolor="${COLORS.sandTint}" style="background-color:${COLORS.sandTint};padding:14px 22px;border:1px solid ${COLORS.sand};">
            <div style="font-family:Consolas,'Courier New',monospace;font-size:30px;line-height:36px;mso-line-height-rule:exactly;color:${COLORS.navy};font-weight:bold;">${esc(b.text)}</div>
          </td></tr>
        </table>`
      );
    case "divider":
      return row(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tr><td height="1" bgcolor="${COLORS.line}" style="height:1px;background-color:${COLORS.line};font-size:0;line-height:0;">&nbsp;</td></tr></table>`
      );
    default:
      return "";
  }
}

function footerHtml(b) {
  const lines = b.lines
    .map(
      (l) =>
        `<tr><td style="padding:0 0 10px;${BASE}font-size:14px;line-height:21px;color:${COLORS.footerInk};">${br(l)}</td></tr>`
    )
    .join("");
  return `<tr><td bgcolor="${COLORS.footerBg}" style="background-color:${COLORS.footerBg};border-top:3px solid ${COLORS.sea};padding:22px 28px 14px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">${lines}</table>
  </td></tr>`;
}

function renderHtml(document, { logoUrl = LOGO_URL } = {}) {
  const body = [];
  for (const b of document.blocks) {
    if (b.type === "footer") continue;
    body.push(blockHtml(b));
    body.push(spacer(b.type === "eyebrow" ? 6 : b.type === "h" ? 10 : 18));
  }
  const foot = document.blocks.find((b) => b.type === "footer");

  const preheader = document.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COLORS.cream};">${esc(
        document.preheader.slice(0, 120)
      )}${"&#8203;&zwnj;".repeat(30)}</div>`
    : "";

  return `<!doctype html>
<html lang="${esc(document.lang)}" style="margin:0;padding:0;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${esc(document.title)}</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    :root { color-scheme: light only; supported-color-schemes: light only; }
    body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }
    table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; display:block; -ms-interpolation-mode:bicubic; }
    @media (max-width:620px) {
      .card { width:100% !important; }
      .pad { padding-left:18px !important; padding-right:18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.sandTint};">
${preheader}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${COLORS.sandTint}" style="background-color:${COLORS.sandTint};border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="card" style="width:600px;max-width:600px;border-collapse:collapse;">
        <tr>
          <td align="center" bgcolor="${COLORS.cream}" style="background-color:${COLORS.cream};padding:22px 28px 14px;border:1px solid ${COLORS.line};border-bottom:0;">
            <img src="${esc(logoUrl)}" width="160" height="118" alt="Ty LuWa" style="width:160px;height:118px;font-family:${SERIF};font-size:18px;color:${COLORS.navy};">
          </td>
        </tr>
        <tr>
          <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid ${COLORS.line};border-top:0;border-bottom:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
              ${spacer(20)}
              ${body.join("\n              ")}
            </table>
          </td>
        </tr>
        ${foot ? footerHtml(foot) : ""}
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

module.exports = { renderHtml, COLORS, TONES, LOGO_URL, esc };
