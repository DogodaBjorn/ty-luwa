"use strict";

/**
 * First-party, server-side visitor logging, plus the central collector. Kept identical across
 * the trainerbjorn, dogoda and ty-luwa repos: change all copies or none (same rule as
 * form-guard.js).
 *
 * Tracker (every site). Per non-asset request: time, site, host, path, status, duration, the
 * referrer host, the five UTM fields, the agent class (human, AI retrieval, AI crawler, search
 * engine or other bot), device class, language and a session hash. Named events (a form sent,
 * a booking request) go through `event()` from the route that handles them.
 *
 * What it never stores: the IP address, the user agent, or anything from a cookie. The session
 * hash is sha256(secret + day + ip + user agent), truncated, with the day in it, so the same
 * visitor hashes differently tomorrow and nothing links days together. That keeps this under the
 * Dutch "analytics with minor privacy impact" exemption: no consent banner, one paragraph in the
 * privacy statement.
 *
 * Where events go, in this order of preference:
 *   1. `db` option: an open node:sqlite handle, written in-process (the collector site itself).
 *   2. TRACK_COLLECT_KEY set: batches are POSTed to the central collector (`collectUrl`,
 *      default https://www.dogoda.nl/api/collect) with the key in the x-track-key header.
 *   3. Otherwise, or while 1/2 fail: newline-delimited JSON day files under TRACK_DIR, and a
 *      pending file that is replayed as soon as the real sink answers again.
 * Events are buffered in memory and flushed in batches, so a page never waits on storage.
 *
 * Collector (dogoda only): one SQLite file for all sites, `events` labelled by `site` and
 * `source`, `dim_site`, daily views, a POST endpoint for the other sites, a CSV export and a
 * consistent snapshot download of the whole database. SQLite lives on /home (an SMB mount on
 * App Service), so: rollback journal, no WAL, one process. Same lesson as ty-luwa's lib/db.js.
 *
 * Environment:
 *   TRACK_SITE          short site name (default: the `site` option)
 *   TRACK_SECRET        salt for the session hash; absent = random per process
 *   TRACK_COLLECT_KEY   shared key between the sites and the collector
 *   TRACK_COLLECT_URL   collector endpoint (default https://www.dogoda.nl/api/collect)
 *   TRACK_DIR           directory for the ndjson files
 *   TRACK_EXPORT_TOKEN  token for the CSV export and the database download
 *   TRACK_DISABLED      "1" switches recording off entirely
 */

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

// ── Agent classification ──────────────────────────────────────────────────────
// Order matters: the specific AI and search agents first, the generic catch-all last.
// Classes: "ai-retrieval" fetches a page at answer time because a person asked something (that is
// the GEO signal: the page was used in an answer); "ai-crawl" indexes or trains; "search" is a
// classic search engine; "bot" is anything else that announces itself.
const AGENT_PATTERNS = [
  // AI retrieval at answer time
  { name: "ChatGPT-User",        cls: "ai-retrieval", re: /ChatGPT-User/i },
  { name: "Perplexity-User",     cls: "ai-retrieval", re: /Perplexity-User/i },
  { name: "Claude-User",         cls: "ai-retrieval", re: /Claude-User/i },
  { name: "Meta-ExternalFetcher", cls: "ai-retrieval", re: /Meta-ExternalFetcher/i },
  { name: "DuckAssistBot",       cls: "ai-retrieval", re: /DuckAssistBot/i },
  { name: "MistralAI-User",      cls: "ai-retrieval", re: /MistralAI-User/i },
  { name: "GoogleAgent",         cls: "ai-retrieval", re: /GoogleAgent-Mano|Google-NotebookLM/i },
  // AI crawlers: indexing for AI search, or training
  { name: "OAI-SearchBot",       cls: "ai-crawl", re: /OAI-SearchBot/i },
  { name: "GPTBot",              cls: "ai-crawl", re: /GPTBot/i },
  { name: "Claude-SearchBot",    cls: "ai-crawl", re: /Claude-SearchBot/i },
  { name: "ClaudeBot",           cls: "ai-crawl", re: /ClaudeBot|Claude-Web|anthropic-ai/i },
  { name: "PerplexityBot",       cls: "ai-crawl", re: /PerplexityBot/i },
  { name: "Google-Extended",     cls: "ai-crawl", re: /Google-Extended/i },
  { name: "Gemini",              cls: "ai-crawl", re: /GeminiBot|Gemini-Deep-Research/i },
  { name: "Applebot-Extended",   cls: "ai-crawl", re: /Applebot-Extended/i },
  { name: "Meta-ExternalAgent",  cls: "ai-crawl", re: /Meta-ExternalAgent|FacebookBot/i },
  { name: "Bytespider",          cls: "ai-crawl", re: /Bytespider/i },
  { name: "CCBot",               cls: "ai-crawl", re: /CCBot/i },
  { name: "cohere-ai",           cls: "ai-crawl", re: /cohere-ai/i },
  { name: "Amazonbot",           cls: "ai-crawl", re: /Amazonbot/i },
  { name: "YouBot",              cls: "ai-crawl", re: /YouBot/i },
  { name: "Diffbot",             cls: "ai-crawl", re: /Diffbot/i },
  // Search engines
  { name: "Googlebot",           cls: "search", re: /Googlebot/i },
  { name: "Bingbot",             cls: "search", re: /bingbot/i },
  { name: "Applebot",            cls: "search", re: /Applebot/i },
  { name: "DuckDuckBot",         cls: "search", re: /DuckDuckBot/i },
  { name: "YandexBot",           cls: "search", re: /YandexBot/i },
  { name: "Slurp",               cls: "search", re: /Slurp/i },
  { name: "Baiduspider",         cls: "search", re: /Baiduspider/i },
  { name: "Sogou",               cls: "search", re: /Sogou/i },
  // Everything else that says so
  { name: "bot/spider",          cls: "bot", re: /\b(bot|spider|crawl|crawler|scrape|scraper|slurp|fetch|curl|wget|python-requests|httpclient|go-http-client|headless)\b/i },
];

function classifyAgent(ua) {
  if (!ua) return { cls: "bot", name: "no-user-agent" };
  for (const p of AGENT_PATTERNS) {
    if (p.re.test(ua)) return { cls: p.cls, name: p.name };
  }
  return { cls: "human", name: null };
}

function deviceClass(ua, cls) {
  if (cls !== "human") return "bot";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return "mobile";
  return "desktop";
}

// ── Request helpers ───────────────────────────────────────────────────────────
const ASSET_RE = /\.(css|js|mjs|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|eot|mp4|webm|mp3|pdf|txt|xml|json|webmanifest)$/i;
const SKIP_PATHS = new Set([
  "/healthz", "/api/form-token", "/api/bot-stats", "/api/track-export", "/api/track-db", "/api/collect", "/favicon.ico",
]);

function shouldSkip(req) {
  if (SKIP_PATHS.has(req.path)) return true;
  if (ASSET_RE.test(req.path)) return true;
  return false;
}

function clientIp(req) {
  // Azure App Service puts the visitor in X-Forwarded-For as "ip:port"; take the first entry.
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const raw = xff || (req.socket && req.socket.remoteAddress) || "";
  // Strip a port from IPv4 ("1.2.3.4:5678") but leave IPv6 alone.
  return raw.includes(".") && raw.includes(":") ? raw.slice(0, raw.lastIndexOf(":")) : raw;
}

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function sessionHash(secret, ip, ua, now) {
  return crypto.createHash("sha256").update(`${secret}|${dayKey(now)}|${ip}|${ua}`).digest("hex").slice(0, 16);
}

function referrerHost(req) {
  const ref = req.headers.referer || req.headers.referrer || "";
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.toLowerCase().replace(/^www\./, "");
    const own = String(req.headers.host || "").toLowerCase().split(":")[0].replace(/^www\./, "");
    return host && host !== own ? host.slice(0, 256) : null;
  } catch (_) {
    return null;
  }
}

function firstLang(req) {
  const al = String(req.headers["accept-language"] || "").split(",")[0].trim().toLowerCase();
  return al ? al.slice(0, 8) : null;
}

function utm(req) {
  const q = req.query || {};
  const pick = (k) => (typeof q[k] === "string" && q[k] ? q[k].slice(0, 128) : null);
  return {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
    utm_term: pick("utm_term"),
    utm_content: pick("utm_content"),
  };
}

const COLUMNS = [
  "ts", "site", "host", "method", "path", "status", "duration_ms", "event", "session_hash",
  "agent_class", "agent_name", "device", "lang", "referrer_host",
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "props",
];

function csvCell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function sameKey(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

function defaultDir() {
  if (process.env.TRACK_DIR) return process.env.TRACK_DIR;
  if (process.platform !== "win32" && fs.existsSync("/home")) return "/home/data/track";
  return path.join(process.cwd(), "data", "track");
}

// ── SQLite schema (collector) ─────────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY,
  ts            TEXT    NOT NULL,
  site          TEXT    NOT NULL,
  host          TEXT,
  method        TEXT,
  path          TEXT,
  status        INTEGER,
  duration_ms   INTEGER,
  event         TEXT    NOT NULL,
  session_hash  TEXT,
  agent_class   TEXT    NOT NULL,
  agent_name    TEXT,
  device        TEXT,
  lang          TEXT,
  referrer_host TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  utm_term      TEXT,
  utm_content   TEXT,
  props         TEXT,
  source        TEXT    NOT NULL DEFAULT 'log',
  received_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS ix_events_site_ts  ON events (site, ts);
CREATE INDEX IF NOT EXISTS ix_events_agent_ts ON events (agent_class, ts);

CREATE TABLE IF NOT EXISTS dim_site (
  site  TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  brand TEXT NOT NULL,
  hosts TEXT NOT NULL,
  langs TEXT NOT NULL
);
INSERT OR IGNORE INTO dim_site (site, label, brand, hosts, langs) VALUES
  ('trainerbjorn', 'TrainerBjörn', 'TrainerBjörn', 'www.trainerbjorn.nl', 'nl,en'),
  ('dogoda',       'dogoda.',      'DoGoDa',       'www.dogoda.nl',       'nl,en'),
  ('ty-luwa',      'Ty LuWa',      'Ty LuWa',      'ty-luwa.nl,ty-luwa.com,ty-luwa.fr', 'nl,en,de,fr');

CREATE TABLE IF NOT EXISTS job_runs (
  id     INTEGER PRIMARY KEY,
  job    TEXT NOT NULL,
  ran_at TEXT NOT NULL,
  ok     INTEGER NOT NULL,
  note   TEXT
);

CREATE VIEW IF NOT EXISTS v_pageviews_daily AS
SELECT site, date(ts) AS day, host, path,
       COUNT(*) AS pageviews, COUNT(DISTINCT session_hash) AS sessions,
       AVG(duration_ms) AS avg_ms, SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors
FROM events WHERE event = 'pageview' AND agent_class = 'human'
GROUP BY site, date(ts), host, path;

CREATE VIEW IF NOT EXISTS v_agents_daily AS
SELECT site, date(ts) AS day, agent_class, agent_name, path,
       COUNT(*) AS hits, SUM(CASE WHEN status = 404 THEN 1 ELSE 0 END) AS not_found
FROM events WHERE event = 'pageview' AND agent_class <> 'human'
GROUP BY site, date(ts), agent_class, agent_name, path;

CREATE VIEW IF NOT EXISTS v_sources_daily AS
SELECT site, date(ts) AS day, COALESCE(utm_source, referrer_host, '(direct)') AS source,
       utm_medium, utm_campaign, COUNT(*) AS pageviews, COUNT(DISTINCT session_hash) AS sessions
FROM events WHERE event = 'pageview' AND agent_class = 'human'
GROUP BY site, date(ts), COALESCE(utm_source, referrer_host, '(direct)'), utm_medium, utm_campaign;

CREATE VIEW IF NOT EXISTS v_named_events_daily AS
SELECT site, date(ts) AS day, event, COUNT(*) AS n
FROM events WHERE event NOT IN ('pageview', 'request')
GROUP BY site, date(ts), event;
`;

function openDatabase(dbPath) {
  // Lazy require: node:sqlite is built into Node 22.5+ and needs no package.
  const { DatabaseSync } = require("node:sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  // Rollback journal, not WAL: /home on App Service is an SMB mount without shared memory.
  db.exec("PRAGMA journal_mode = DELETE; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  return db;
}

function insertRows(db, rows, source = "log") {
  if (!rows.length) return 0;
  const cols = COLUMNS.concat("source");
  const stmt = db.prepare(`INSERT INTO events (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`);
  db.exec("BEGIN");
  try {
    for (const row of rows) stmt.run(...COLUMNS.map((c) => row[c] ?? null), row.source || source);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return rows.length;
}

// ── Tracker ───────────────────────────────────────────────────────────────────
function createTracker(options = {}) {
  const site = process.env.TRACK_SITE || options.site || "site";
  const secret = process.env.TRACK_SECRET || crypto.randomBytes(16).toString("hex");
  const disabled = process.env.TRACK_DISABLED === "1" || options.disabled === true;
  const dir = options.dir || defaultDir();
  const flushEveryMs = options.flushEveryMs ?? 5000;
  const flushAt = options.flushAt ?? 200;
  const db = options.db || null;
  const collectKey = options.collectKey ?? process.env.TRACK_COLLECT_KEY ?? "";
  const collectUrl = options.collectUrl ?? process.env.TRACK_COLLECT_URL ?? "https://www.dogoda.nl/api/collect";
  const fetchImpl = options.fetch || globalThis.fetch;
  const log = options.log || ((msg) => console.error(`[track] ${msg}`));
  const mode = db ? "sqlite" : collectKey ? "http" : "file";

  let buffer = [];
  let timer = null;
  let flushing = false;
  let broken = false; // the real sink failed last time: write to pending, retry next flush
  const stats = { since: new Date().toISOString(), mode, counts: {} };

  function bump(cls, name) {
    const key = name || cls;
    stats.counts[cls] = stats.counts[cls] || {};
    stats.counts[cls][key] = (stats.counts[cls][key] || 0) + 1;
  }

  function baseEvent(req, now) {
    const ua = String(req.headers["user-agent"] || "").slice(0, 512);
    const agent = classifyAgent(ua);
    return {
      ts: now.toISOString(),
      site,
      host: String(req.headers.host || "").toLowerCase().split(":")[0].slice(0, 128) || null,
      method: req.method,
      path: String(req.path || "/").slice(0, 512),
      status: null,
      duration_ms: null,
      event: "pageview",
      session_hash: sessionHash(secret, clientIp(req), ua, now),
      agent_class: agent.cls,
      agent_name: agent.name,
      device: deviceClass(ua, agent.cls),
      lang: firstLang(req),
      referrer_host: referrerHost(req),
      ...utm(req),
      props: null,
    };
  }

  function push(ev) {
    if (disabled) return;
    buffer.push(ev);
    bump(ev.agent_class, ev.agent_name);
    if (buffer.length >= flushAt) flush().catch(() => {});
    else if (!timer) {
      timer = setTimeout(() => { timer = null; flush().catch(() => {}); }, flushEveryMs);
      if (timer.unref) timer.unref();
    }
  }

  /** Express middleware: records one event per non-asset request when the response finishes. */
  function middleware(req, res, next) {
    if (disabled || shouldSkip(req)) return next();
    const start = process.hrtime.bigint();
    const now = new Date();
    res.on("finish", () => {
      const ev = baseEvent(req, now);
      ev.status = res.statusCode;
      ev.duration_ms = Number((process.hrtime.bigint() - start) / 1000000n);
      ev.event = req.method === "GET" || req.method === "HEAD" ? "pageview" : "request";
      push(ev);
    });
    next();
  }

  /** Named event from a route: tracker.event(req, "contact_sent", { lang: "nl" }). */
  function event(req, name, props) {
    if (disabled) return;
    const ev = baseEvent(req, new Date());
    ev.event = String(name).slice(0, 64);
    ev.props = props ? JSON.stringify(props).slice(0, 4000) : null;
    push(ev);
  }

  // ── Sinks ──
  function fileFor(name) {
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, name);
  }

  function appendFile(name, rows) {
    if (!rows.length) return;
    fs.appendFileSync(fileFor(name), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  }

  function readPending() {
    const f = fileFor("pending.ndjson");
    if (!fs.existsSync(f)) return [];
    return fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch (_) { return null; }
    }).filter(Boolean);
  }

  async function postBatches(rows) {
    for (let i = 0; i < rows.length; i += 500) {
      const res = await fetchImpl(collectUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-track-key": collectKey },
        body: JSON.stringify({ site, events: rows.slice(i, i + 500) }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`collector answered ${res.status}`);
    }
  }

  async function flush() {
    if (flushing) return;
    if (timer) { clearTimeout(timer); timer = null; }
    const rows = buffer;
    buffer = [];
    if (!rows.length && !(mode !== "file" && broken)) return;
    flushing = true;
    try {
      if (mode === "file") {
        appendFile(`events-${dayKey()}.ndjson`, rows);
        return;
      }
      try {
        const all = (broken ? readPending() : []).concat(rows);
        if (mode === "sqlite") insertRows(db, all);
        else await postBatches(all);
        if (broken) { fs.unlinkSync(fileFor("pending.ndjson")); broken = false; }
      } catch (err) {
        if (!broken) log(`${mode} sink unavailable, buffering to ${dir}/pending.ndjson: ${err.message}`);
        broken = true;
        appendFile("pending.ndjson", rows);
      }
    } finally {
      flushing = false;
    }
  }

  async function close() {
    await flush();
  }

  // ── Export of the day files (file mode only) ──
  // GET /api/track-export?token=…&from=YYYY-MM-DD&to=YYYY-MM-DD[&format=ndjson] streams the
  // ndjson day files as one CSV (UTF-8 with BOM, so Excel opens it right). In sqlite and http
  // mode the data is central: use the collector's export instead.
  function listEventFiles(from, to) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => /^events-\d{4}-\d{2}-\d{2}\.ndjson$/.test(f))
      .map((f) => ({ f, day: f.slice(7, 17) }))
      .filter((x) => (!from || x.day >= from) && (!to || x.day <= to))
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  function exportHandler(opts = {}) {
    const token = opts.token ?? process.env.TRACK_EXPORT_TOKEN ?? "";
    const DAY = /^\d{4}-\d{2}-\d{2}$/;
    return async (req, res) => {
      if (!sameKey(req.query.token, token)) return res.status(401).json({ error: "Unauthorized" });
      if (mode !== "file") return res.status(409).json({ error: `Events go to the central collector (${mode}); export there.` });
      const from = DAY.test(req.query.from || "") ? req.query.from : null;
      const to = DAY.test(req.query.to || "") ? req.query.to : null;
      const ndjson = req.query.format === "ndjson";
      await flush();
      res.type(ndjson ? "application/x-ndjson" : "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="events-${site}.${ndjson ? "ndjson" : "csv"}"`);
      if (!ndjson) res.write("﻿" + COLUMNS.join(",") + "\n");
      for (const { f } of listEventFiles(from, to)) {
        for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
          if (!line) continue;
          if (ndjson) { res.write(line + "\n"); continue; }
          try {
            const row = JSON.parse(line);
            res.write(COLUMNS.map((c) => csvCell(row[c])).join(",") + "\n");
          } catch (_) { /* a torn line from a crash mid-write: skip it */ }
        }
      }
      res.end();
    };
  }

  return { middleware, event, flush, close, exportHandler, stats: () => stats, site, dir, mode, disabled };
}

// ── Collector ─────────────────────────────────────────────────────────────────
/**
 * createCollector({ dbPath, key, exportToken }) opens (or creates) the central SQLite and
 * returns the handlers the collector site mounts:
 *   receive          POST /api/collect      body { site, events: [...] }, header x-track-key
 *   exportHandler    GET  /api/track-export?token=…&from=&to=&site=&format=ndjson
 *   downloadHandler  GET  /api/track-db?token=…   consistent snapshot of the .sqlite file
 * Pass `db` to a tracker on the same site so it writes in-process.
 */
function createCollector(options = {}) {
  const dbPath = options.dbPath || path.join(defaultDir(), "..", "sitedata.sqlite");
  const key = options.key ?? process.env.TRACK_COLLECT_KEY ?? "";
  const exportToken = options.exportToken ?? process.env.TRACK_EXPORT_TOKEN ?? "";
  const log = options.log || ((msg) => console.error(`[collect] ${msg}`));
  const db = openDatabase(dbPath);
  const MAX_EVENTS = 1000;

  function validRow(r) {
    return r && typeof r === "object" && typeof r.ts === "string" && typeof r.event === "string"
      && typeof r.agent_class === "string" && typeof r.site === "string";
  }

  function receive(req, res) {
    if (!key || !sameKey(req.get("x-track-key"), key)) return res.status(401).json({ error: "Unauthorized" });
    const body = req.body || {};
    const site = typeof body.site === "string" ? body.site.slice(0, 32) : null;
    const events = Array.isArray(body.events) ? body.events : null;
    if (!site || !events) return res.status(400).json({ error: "Expected { site, events[] }" });
    if (events.length > MAX_EVENTS) return res.status(413).json({ error: `At most ${MAX_EVENTS} events per request` });
    const rows = events.map((r) => ({ ...r, site })).filter(validRow);
    try {
      const n = insertRows(db, rows);
      res.json({ ok: true, inserted: n, dropped: events.length - rows.length });
    } catch (err) {
      log(`insert failed: ${err.message}`);
      res.status(500).json({ error: "Storage failed" });
    }
  }

  function exportHandler(req, res) {
    if (!sameKey(req.query.token, exportToken)) return res.status(401).json({ error: "Unauthorized" });
    const DAY = /^\d{4}-\d{2}-\d{2}$/;
    const where = [];
    const args = [];
    if (DAY.test(req.query.from || "")) { where.push("ts >= ?"); args.push(req.query.from); }
    if (DAY.test(req.query.to || "")) { where.push("ts < date(?, '+1 day')"); args.push(req.query.to); }
    if (typeof req.query.site === "string" && req.query.site) { where.push("site = ?"); args.push(req.query.site.slice(0, 32)); }
    const ndjson = req.query.format === "ndjson";
    const cols = ["id"].concat(COLUMNS, "source", "received_at");
    const stmt = db.prepare(`SELECT ${cols.join(",")} FROM events${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY id`);
    res.type(ndjson ? "application/x-ndjson" : "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="events-all.${ndjson ? "ndjson" : "csv"}"`);
    if (!ndjson) res.write("﻿" + cols.join(",") + "\n");
    for (const row of stmt.iterate(...args)) {
      res.write(ndjson ? JSON.stringify(row) + "\n" : cols.map((c) => csvCell(row[c])).join(",") + "\n");
    }
    res.end();
  }

  function downloadHandler(req, res) {
    if (!sameKey(req.query.token, exportToken)) return res.status(401).json({ error: "Unauthorized" });
    // VACUUM INTO writes a consistent copy even while the live file is being written to.
    const snapshot = path.join(os.tmpdir(), `sitedata-${process.pid}-${Date.now()}.sqlite`);
    try {
      db.exec(`VACUUM INTO '${snapshot.replace(/'/g, "''")}'`);
    } catch (err) {
      log(`snapshot failed: ${err.message}`);
      return res.status(500).json({ error: "Snapshot failed" });
    }
    res.download(snapshot, "sitedata.sqlite", () => { try { fs.unlinkSync(snapshot); } catch (_) {} });
  }

  function close() {
    try { db.close(); } catch (_) {}
  }

  return { db, dbPath, receive, exportHandler, downloadHandler, insertRows: (rows, source) => insertRows(db, rows, source), close };
}

module.exports = {
  createTracker, createCollector, openDatabase, insertRows,
  classifyAgent, deviceClass, sessionHash, shouldSkip, AGENT_PATTERNS, COLUMNS,
};
