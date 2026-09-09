// Mail versturen via Azure Communication Services (ACS) Email, rechtstreeks
// tegen de REST-API met een HMAC-handtekening, zodat de site geen npm-
// dependency nodig heeft. Lokaal (MAIL_PROVIDER=console) wordt elke mail
// alleen gelogd, inclusief de inloglink en -code.
//
// Instellen: docs/AZURE-SETUP.md §7. ACS_ENDPOINT is de resource-URL
// (https://<naam>.europe.communication.azure.com), ACS_KEY een van de twee
// toegangssleutels.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const API_VERSION = "2023-03-31";

/**
 * De HMAC-SHA256-handtekening die ACS verwacht. Apart geëxporteerd zodat een
 * test hem met een vaste sleutel en datum kan controleren.
 */
function signRequest({ method, url, body, key, date }) {
  const u = new URL(url);
  const contentHash = crypto.createHash("sha256").update(body).digest("base64");
  const stringToSign = `${method}\n${u.pathname}${u.search}\n${date};${u.host};${contentHash}`;
  const signature = crypto
    .createHmac("sha256", Buffer.from(key, "base64"))
    .update(stringToSign)
    .digest("base64");
  return {
    "x-ms-date": date,
    "x-ms-content-sha256": contentHash,
    Authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
  };
}

function consoleProvider(log = console.log) {
  let n = 0;
  return {
    name: "console",
    async send(m) {
      // De opgemaakte versie is in een terminal niet te lezen; zet
      // MAIL_DEBUG_DIR om hem als bestand te bewaren en te bekijken.
      let htmlNote = "";
      if (m.html) {
        const dir = process.env.MAIL_DEBUG_DIR;
        htmlNote = `HTML: ${(m.html.length / 1024).toFixed(1)} kB`;
        if (dir) {
          try {
            fs.mkdirSync(dir, { recursive: true });
            const file = path.join(dir, `${String(++n).padStart(2, "0")}-${m.subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 40).toLowerCase()}.html`);
            fs.writeFileSync(file, m.html);
            htmlNote += ` — opgeslagen als ${file}`;
          } catch (e) {
            htmlNote += ` — opslaan mislukt: ${e.message}`;
          }
        } else {
          htmlNote += " — zet MAIL_DEBUG_DIR om mee te kijken";
        }
        htmlNote += "\n";
      }
      log(
        `\n--- MAIL (niet verzonden, MAIL_PROVIDER=console) ---\n` +
          `Aan: ${m.to.join(", ")}\nOnderwerp: ${m.subject}\n\n${m.text}\n` +
          htmlNote +
          (m.attachments && m.attachments.length
            ? `Bijlagen: ${m.attachments.map((a) => a.name).join(", ")}\n`
            : "") +
          `--- EINDE MAIL ---\n`
      );
      return { id: "console" };
    },
  };
}

function acsProvider({ endpoint, key, fetchFn = fetch }) {
  const url = `${endpoint}/emails:send?api-version=${API_VERSION}`;
  return {
    name: "acs",
    async send(m) {
      const payload = {
        senderAddress: m.from,
        content: { subject: m.subject, plainText: m.text, ...(m.html ? { html: m.html } : {}) },
        recipients: { to: m.to.map((address) => ({ address })) },
        ...(m.replyTo && m.replyTo.length ? { replyTo: m.replyTo.map((address) => ({ address })) } : {}),
        ...(m.attachments && m.attachments.length
          ? {
              attachments: m.attachments.map((a) => ({
                name: a.name,
                contentType: a.contentType,
                contentInBase64: Buffer.from(a.content).toString("base64"),
              })),
            }
          : {}),
        userEngagementTrackingDisabled: true,
      };
      const body = JSON.stringify(payload);
      const headers = {
        "Content-Type": "application/json",
        "Repeatability-Request-ID": crypto.randomUUID(),
        "Repeatability-First-Sent": new Date().toUTCString(),
        ...signRequest({ method: "POST", url, body, key, date: new Date().toUTCString() }),
      };
      const res = await fetchFn(url, { method: "POST", headers, body });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`ACS ${res.status}: ${text.slice(0, 300)}`);
      }
      const data = await res.json().catch(() => ({}));
      return { id: data.id || null };
    },
  };
}

/**
 * @param {object} cfg  config.mail
 * @returns {{ send(m: {to: string|string[], subject, text, html?, replyTo?, attachments?}): Promise }}
 */
function createMailer(cfg, opts = {}) {
  const provider =
    cfg.provider === "acs"
      ? acsProvider({ endpoint: cfg.endpoint, key: cfg.key, fetchFn: opts.fetchFn })
      : consoleProvider(opts.log);
  return {
    provider: provider.name,
    async send(m) {
      const to = (Array.isArray(m.to) ? m.to : [m.to]).filter(Boolean);
      if (!to.length) throw new Error("Mail zonder ontvanger");
      const replyToRaw = m.replyTo === undefined ? cfg.replyTo : m.replyTo;
      const replyTo = (Array.isArray(replyToRaw) ? replyToRaw : [replyToRaw]).filter(Boolean);
      return provider.send({ from: cfg.from, ...m, replyTo, to });
    },
  };
}

module.exports = { createMailer, signRequest, API_VERSION };
