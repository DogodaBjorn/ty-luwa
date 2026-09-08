// Instellingen uit de omgeving, één keer ingelezen. Lokaal komen ze uit .env
// (Server.js laadt dat), op Azure uit de Application settings. Niets hiervan
// staat in de repo; docs/AZURE-SETUP.md §7 beschrijft elke instelling.

const path = require("path");

function list(v) {
  return String(v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function load(env = process.env) {
  const provider = (env.MAIL_PROVIDER || (env.ACS_ENDPOINT && env.ACS_KEY ? "acs" : "console")).toLowerCase();
  const cfg = {
    dataDir: env.DATA_DIR || path.join(__dirname, "..", "data"),
    beheerHost: (env.BEHEER_HOST || "ty-luwa.nl").toLowerCase(),
    beheerEmails: list(env.BEHEER_EMAILS),
    sessionDays: Number(env.SESSION_DAYS || 365),
    rateMax: Number(env.RATE_MAX || 5),
    mail: {
      provider,
      endpoint: (env.ACS_ENDPOINT || "").replace(/\/+$/, ""),
      key: env.ACS_KEY || "",
      from: env.MAIL_FROM || "DoNotReply@ty-luwa.nl",
      replyTo: env.MAIL_REPLY_TO || "",
      notify: list(env.MAIL_NOTIFY),
      backup: list(env.BACKUP_EMAIL),
    },
    timeZone: "Europe/Paris",
  };
  if (provider === "acs" && (!cfg.mail.endpoint || !cfg.mail.key)) {
    throw new Error("MAIL_PROVIDER=acs vereist ACS_ENDPOINT en ACS_KEY");
  }
  if (!cfg.mail.notify.length) cfg.mail.notify = cfg.beheerEmails;
  return cfg;
}

module.exports = { load };
