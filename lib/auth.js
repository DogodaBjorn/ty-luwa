// Inloggen zonder wachtwoord. Wie op de allowlist staat vraagt een mail aan
// met een link én een code van zes cijfers. De link opent een pagina met één
// knop die het token POST (een mailscanner die de link volgt verbruikt hem zo
// niet); de code typ je in het venster waar je het adres invulde, gebonden
// aan een kort cookie, want een link uit de Gmail-app opent in een in-app-
// browser en die deelt zijn cookies niet met Safari.
//
// Tokens en sessies staan gehasht in de database; het cookie is de enige
// plek waar de echte waarde leeft.

const crypto = require("crypto");

const SESSION_COOKIE = "tl_sessie";
const LOGIN_COOKIE = "tl_inloggen";
const TOKEN_TTL_MIN = 30;
const MAX_ATTEMPTS = 5;
const MAX_MAILS_PER_HOUR = 5;
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

const randomToken = () => crypto.randomBytes(32).toString("base64url");
const hash = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const sixDigitCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

function isoPlus(now, ms) {
  return new Date(Date.parse(now) + ms).toISOString();
}

/**
 * Start een login. Geeft null als het adres niet mag of te vaak vroeg; de
 * aanroeper toont dan tóch "kijk in je mail", zodat niemand adressen kan raden.
 */
function startLogin(store, email, { allowed, now }) {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !allowed.includes(e)) return null;
  if (store.countRecentLoginTokens(e) >= MAX_MAILS_PER_HOUR) return null;
  const token = randomToken();
  const code = sixDigitCode();
  const expiresAt = isoPlus(now, TOKEN_TTL_MIN * 60 * 1000);
  const id = store.createLoginToken(hash(token), hash(code), e, expiresAt);
  return { id, token, code, expiresAt, email: e };
}

/** Verzilvert een link-token. Geeft het e-mailadres of null. */
function finishLoginByToken(store, token, { now }) {
  const row = store.getLoginTokenByHash(hash(token || ""));
  if (!row || row.used_at || row.expires_at <= now) return null;
  if (!store.useLoginToken(row.id)) return null;
  return row.email;
}

/** Verzilvert een code, gebonden aan het login-id uit het cookie. */
function finishLoginByCode(store, loginId, code, { now }) {
  const row = store.getLoginToken(Number(loginId));
  if (!row || row.used_at || row.expires_at <= now) return { error: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { error: "attempts" };
  const clean = String(code || "").replace(/\D/g, "");
  if (hash(clean) !== row.code_hash) {
    store.bumpLoginAttempts(row.id);
    return { error: row.attempts + 1 >= MAX_ATTEMPTS ? "attempts" : "wrong" };
  }
  if (!store.useLoginToken(row.id)) return { error: "expired" };
  return { email: row.email };
}

function createSession(store, email, { now, days }) {
  const value = randomToken();
  const expiresAt = isoPlus(now, days * 24 * 60 * 60 * 1000);
  store.createSession(hash(value), email, expiresAt);
  return { value, expiresAt };
}

// ---- cookies ---------------------------------------------------------------

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setCookie(res, name, value, { maxAgeSec, secure, path = "/beheer" }) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${maxAgeSec}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

function clearCookie(res, name, { secure, path = "/beheer" } = {}) {
  setCookie(res, name, "", { maxAgeSec: 0, secure, path });
}

// ---- middleware ------------------------------------------------------------

/** Zet req.admin = { email } als het sessiecookie klopt. */
function sessionMiddleware(store, { now = () => new Date().toISOString() } = {}) {
  return (req, res, next) => {
    const cookies = parseCookies(req);
    req.cookies = cookies;
    const value = cookies[SESSION_COOKIE];
    if (!value) return next();
    const h = hash(value);
    const session = store.getSession(h);
    if (!session) return next();
    req.admin = { email: session.email, hash: h };
    if (Date.parse(now()) - Date.parse(session.last_seen_at) > TOUCH_INTERVAL_MS) {
      store.touchSession(h);
    }
    next();
  };
}

function requireAdmin(loginPath) {
  return (req, res, next) => {
    if (req.admin) return next();
    if (req.method !== "GET") return res.status(403).type("text/plain").send("Niet ingelogd");
    return res.redirect(loginPath);
  };
}

/**
 * CSRF-bescherming voor POST: het verzoek moet van onze eigen host komen.
 * SameSite=Lax houdt het cookie al tegen bij een cross-site POST; dit is de
 * tweede grendel, voor browsers die dat niet doen.
 */
function sameOriginGuard(isAllowedHost) {
  return (req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") return next();
    const fetchSite = req.headers["sec-fetch-site"];
    if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
      return res.status(403).type("text/plain").send("Geweigerd");
    }
    const origin = req.headers.origin || req.headers.referer;
    if (origin) {
      let host;
      try {
        host = new URL(origin).hostname.toLowerCase();
      } catch {
        return res.status(403).type("text/plain").send("Geweigerd");
      }
      if (!isAllowedHost(host)) return res.status(403).type("text/plain").send("Geweigerd");
    }
    next();
  };
}

module.exports = {
  SESSION_COOKIE,
  LOGIN_COOKIE,
  TOKEN_TTL_MIN,
  MAX_ATTEMPTS,
  randomToken,
  hash,
  sixDigitCode,
  startLogin,
  finishLoginByToken,
  finishLoginByCode,
  createSession,
  parseCookies,
  setCookie,
  clearCookie,
  sessionMiddleware,
  requireAdmin,
  sameOriginGuard,
};
