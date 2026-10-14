/**
 * Unit tests for lib/track.js: agent classification, the privacy properties of the session hash,
 * what one request turns into, the three sinks (file, sqlite in-process, http to the collector
 * with fallback) and the collector itself. Nothing here needs a network: the http sink gets a
 * fake fetch, the collector gets a temp SQLite file.
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");

const {
  createTracker, createCollector, openDatabase, classifyAgent, deviceClass, sessionHash, shouldSkip, COLUMNS,
} = require("../lib/track");

function fakeReq({ path: p = "/", method = "GET", headers = {}, query = {}, ip = "203.0.113.7", body } = {}) {
  // A real browser: Mozilla/ user agent plus an Accept-Language header (see browserSignals).
  const h = { host: "www.trainerbjorn.nl", "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130", "accept-language": "nl-NL,nl;q=0.9", ...headers };
  return { path: p, method, query, headers: h, body, socket: { remoteAddress: ip }, get: (k) => h[k.toLowerCase()] };
}

function fakeRes(statusCode = 200) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.chunks = [];
  res.headers = {};
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.body = o; res.emit("finish"); return res; };
  res.type = () => res;
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.write = (s) => { res.chunks.push(s); return true; };
  res.end = () => { res.text = res.chunks.join(""); res.emit("finish"); };
  return res;
}

function tmpDir(prefix = "track-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fileTracker(extra = {}) {
  const dir = tmpDir();
  return { dir, tracker: createTracker({ site: "test", dir, collectKey: "", flushEveryMs: 60000, ...extra }) };
}

function readEvents(dir) {
  return fs.readdirSync(dir).filter((f) => f.startsWith("events-")).flatMap((f) =>
    fs.readFileSync(path.join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
  );
}

function hit(tracker, opts, status = 200) {
  const res = fakeRes(status);
  tracker.middleware(fakeReq(opts), res, () => {});
  res.emit("finish");
}

describe("classifyAgent", () => {
  test("answer-time fetchers are ai-retrieval, indexers are ai-crawl", () => {
    assert.deepEqual(classifyAgent("Mozilla/5.0 ChatGPT-User/1.0"), { cls: "ai-retrieval", name: "ChatGPT-User" });
    assert.deepEqual(classifyAgent("Mozilla/5.0 Perplexity-User/1.0"), { cls: "ai-retrieval", name: "Perplexity-User" });
    assert.equal(classifyAgent("Mozilla/5.0 (compatible; GPTBot/1.2)").cls, "ai-crawl");
    assert.equal(classifyAgent("Mozilla/5.0 ClaudeBot/1.0").name, "ClaudeBot");
    assert.equal(classifyAgent("Mozilla/5.0 OAI-SearchBot/1.0").cls, "ai-crawl");
  });

  test("search engines and generic bots keep their class, browsers are human", () => {
    assert.equal(classifyAgent("Mozilla/5.0 (compatible; Googlebot/2.1)").cls, "search");
    assert.equal(classifyAgent("curl/8.4.0").cls, "bot");
    assert.equal(classifyAgent("python-requests/2.31").cls, "bot");
    assert.deepEqual(classifyAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1"), { cls: "human", name: null });
    assert.equal(classifyAgent("").name, "no-user-agent");
  });

  test("device class follows the user agent, bots are bots", () => {
    assert.equal(deviceClass("Mozilla/5.0 (iPhone) Mobile Safari", "human"), "mobile");
    assert.equal(deviceClass("Mozilla/5.0 (iPad; CPU OS 17) Safari", "human"), "tablet");
    assert.equal(deviceClass("Mozilla/5.0 (Windows NT 10.0) Chrome", "human"), "desktop");
    assert.equal(deviceClass("Mozilla/5.0 GPTBot", "ai-crawl"), "bot");
  });
});

describe("browserSignals (scanners that copy a browser's user agent)", () => {
  test("monitors and probes are bots by name", () => {
    assert.deepEqual(classifyAgent("AlwaysOn"), { cls: "bot", name: "AlwaysOn" });
    assert.equal(classifyAgent("Mozilla/5.0 (compatible; UptimeRobot/2.0)").cls, "bot");
    assert.equal(classifyAgent("Site24x7 monitor").cls, "bot");
  });

  test("a browser user agent without Accept-Language is logged as bot, not human", async () => {
    const { dir, tracker } = fileTracker();
    hit(tracker, { path: "/", headers: { "accept-language": undefined } });
    hit(tracker, { path: "/contact", headers: { "user-agent": "python-urllib/3.12", "accept-language": "en" } });
    hit(tracker, { path: "/pl-300" });
    await tracker.flush();
    const rows = readEvents(dir).map((e) => [e.path, e.agent_class, e.agent_name]);
    assert.deepEqual(rows, [
      ["/", "bot", "no-browser-signals"],
      ["/contact", "bot", "no-browser-signals"],
      ["/pl-300", "human", null],
    ]);
  });
});

describe("sessionHash", () => {
  test("same visitor, same day: same hash; next day: different hash", () => {
    const a = sessionHash("s", "1.2.3.4", "ua", new Date("2026-10-13T10:00:00Z"));
    const b = sessionHash("s", "1.2.3.4", "ua", new Date("2026-10-13T23:59:00Z"));
    const c = sessionHash("s", "1.2.3.4", "ua", new Date("2026-10-14T00:01:00Z"));
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(a, /^[0-9a-f]{16}$/);
  });

  test("a different secret gives a different hash, so nobody can rebuild it without it", () => {
    const now = new Date();
    assert.notEqual(sessionHash("one", "1.2.3.4", "ua", now), sessionHash("two", "1.2.3.4", "ua", now));
  });
});

describe("shouldSkip", () => {
  test("assets, health and the tracking endpoints are not events, pages are", () => {
    for (const p of ["/css/style.css", "/images/hero.webp", "/healthz", "/api/form-token", "/sitemap.xml", "/api/collect", "/api/track-export", "/api/track-db"]) {
      assert.equal(shouldSkip({ path: p }), true, p);
    }
    for (const p of ["/pl-300", "/", "/en/lessons/some-lesson", "/api/contact"]) {
      assert.equal(shouldSkip({ path: p }), false, p);
    }
  });
});

describe("middleware (file mode)", () => {
  test("one pageview per finished response, with status, duration, referrer and UTM", async () => {
    const { dir, tracker } = fileTracker();
    assert.equal(tracker.mode, "file");
    const req = fakeReq({
      path: "/pl-300",
      headers: { referer: "https://www.linkedin.com/feed/", "accept-language": "nl-NL,nl;q=0.9" },
      query: { utm_source: "linkedin", utm_campaign: "pl300-okt" },
    });
    const res = fakeRes(200);
    let nextCalled = false;
    tracker.middleware(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    res.emit("finish");
    await tracker.flush();

    const events = readEvents(dir);
    assert.equal(events.length, 1);
    const ev = events[0];
    assert.equal(ev.site, "test");
    assert.equal(ev.event, "pageview");
    assert.equal(ev.path, "/pl-300");
    assert.equal(ev.status, 200);
    assert.equal(typeof ev.duration_ms, "number");
    assert.equal(ev.agent_class, "human");
    assert.equal(ev.device, "desktop");
    assert.equal(ev.lang, "nl-nl");
    assert.equal(ev.referrer_host, "linkedin.com");
    assert.equal(ev.utm_source, "linkedin");
    assert.equal(ev.utm_campaign, "pl300-okt");
    assert.equal(ev.utm_medium, null);
  });

  test("stores no IP and no user agent, only the hash", async () => {
    const { dir, tracker } = fileTracker();
    hit(tracker, { ip: "198.51.100.9", headers: { "x-forwarded-for": "198.51.100.9:51234" } });
    await tracker.flush();
    const raw = fs.readFileSync(path.join(dir, fs.readdirSync(dir)[0]), "utf8");
    assert.doesNotMatch(raw, /198\.51\.100\.9/);
    assert.doesNotMatch(raw, /Chrome/);
    assert.match(raw, /"session_hash":"[0-9a-f]{16}"/);
  });

  test("own-site referrer is dropped, external referrer kept without www", async () => {
    const { dir, tracker } = fileTracker();
    for (const ref of ["https://www.trainerbjorn.nl/", "https://www.google.com/"]) hit(tracker, { headers: { referer: ref } });
    await tracker.flush();
    assert.deepEqual(readEvents(dir).map((e) => e.referrer_host), [null, "google.com"]);
  });

  test("an AI crawler is classified and counted in stats", async () => {
    const { dir, tracker } = fileTracker();
    hit(tracker, { path: "/nope", headers: { "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.0)" } }, 404);
    await tracker.flush();
    const [ev] = readEvents(dir);
    assert.equal(ev.agent_class, "ai-crawl");
    assert.equal(ev.agent_name, "GPTBot");
    assert.equal(ev.status, 404);
    assert.equal(tracker.stats().counts["ai-crawl"].GPTBot, 1);
  });

  test("assets never reach the buffer", async () => {
    const { dir, tracker } = fileTracker();
    hit(tracker, { path: "/css/style.css" });
    await tracker.flush();
    assert.equal(fs.readdirSync(dir).length, 0);
  });

  test("TRACK_DISABLED keeps everything off", async () => {
    const { dir, tracker } = fileTracker({ disabled: true });
    hit(tracker, {});
    tracker.event(fakeReq(), "contact_sent");
    await tracker.flush();
    assert.equal(fs.readdirSync(dir).length, 0);
  });

  test("a named event carries its props as JSON and the same session hash as the page", async () => {
    const { dir, tracker } = fileTracker();
    tracker.event(fakeReq({ path: "/api/contact", method: "POST" }), "contact_sent", { lang: "nl" });
    hit(tracker, { path: "/contact" });
    await tracker.flush();
    const events = readEvents(dir);
    const named = events.find((e) => e.event === "contact_sent");
    const page = events.find((e) => e.event === "pageview");
    assert.deepEqual(JSON.parse(named.props), { lang: "nl" });
    assert.equal(named.session_hash, page.session_hash);
  });

  test("buffer flushes by itself when it reaches flushAt", async () => {
    const { dir, tracker } = fileTracker({ flushAt: 3 });
    for (let i = 0; i < 3; i++) tracker.event(fakeReq(), "ping");
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(readEvents(dir).length, 3);
  });
});

describe("sqlite mode (the collector site writes in-process)", () => {
  test("events land in the central table with the site label and source 'log'", async () => {
    const dir = tmpDir("central-");
    const collector = createCollector({ dbPath: path.join(dir, "sitedata.sqlite"), key: "k", exportToken: "t" });
    const tracker = createTracker({ site: "dogoda", dir, db: collector.db, flushEveryMs: 60000 });
    assert.equal(tracker.mode, "sqlite");
    hit(tracker, { path: "/contentops", headers: { host: "www.dogoda.nl" } });
    tracker.event(fakeReq({ path: "/api/contentops", method: "POST" }), "contentops_sent");
    await tracker.flush();
    // node:sqlite rows have a null prototype; spread them so deepEqual compares values only.
    const rows = collector.db.prepare("SELECT site, event, path, source FROM events ORDER BY id").all().map((r) => ({ ...r }));
    assert.deepEqual(rows, [
      { site: "dogoda", event: "pageview", path: "/contentops", source: "log" },
      { site: "dogoda", event: "contentops_sent", path: "/api/contentops", source: "log" },
    ]);
    assert.equal(collector.db.prepare("SELECT COUNT(*) AS n FROM dim_site").get().n, 3);
    assert.equal(collector.db.prepare("SELECT pageviews FROM v_pageviews_daily").get().pageviews, 1);
    collector.close();
  });
});

describe("http mode (a site posts to the collector)", () => {
  test("batches are posted with the key, and the collector stores them under the site label", async () => {
    const dir = tmpDir("central-");
    const collector = createCollector({ dbPath: path.join(dir, "sitedata.sqlite"), key: "sleutel", exportToken: "t" });
    // Fake fetch: hands the request straight to the collector's express handler.
    const fetch = async (url, init) => {
      assert.equal(url, "https://collector.test/api/collect");
      const req = fakeReq({ path: "/api/collect", method: "POST", headers: { "x-track-key": init.headers["x-track-key"] }, body: JSON.parse(init.body) });
      const res = fakeRes();
      collector.receive(req, res);
      return { ok: res.statusCode === 200, status: res.statusCode };
    };
    const tracker = createTracker({ site: "ty-luwa", dir: tmpDir(), collectKey: "sleutel", collectUrl: "https://collector.test/api/collect", fetch, flushEveryMs: 60000 });
    assert.equal(tracker.mode, "http");
    hit(tracker, { path: "/verblijf", headers: { host: "ty-luwa.nl" } });
    hit(tracker, { path: "/le-logement", headers: { host: "ty-luwa.fr", "user-agent": "Mozilla/5.0 ChatGPT-User/1.0" } });
    await tracker.flush();
    const rows = collector.db.prepare("SELECT site, host, path, agent_class FROM events ORDER BY id").all().map((r) => ({ ...r }));
    assert.deepEqual(rows, [
      { site: "ty-luwa", host: "ty-luwa.nl", path: "/verblijf", agent_class: "human" },
      { site: "ty-luwa", host: "ty-luwa.fr", path: "/le-logement", agent_class: "ai-retrieval" },
    ]);
    collector.close();
  });

  test("when the collector is down events go to pending.ndjson and are replayed later", async () => {
    let up = false;
    const received = [];
    const fetch = async (url, init) => {
      if (!up) throw new Error("ECONNREFUSED");
      received.push(...JSON.parse(init.body).events);
      return { ok: true, status: 200 };
    };
    const dir = tmpDir();
    const logs = [];
    const tracker = createTracker({ site: "x", dir, collectKey: "k", collectUrl: "https://c/api/collect", fetch, flushEveryMs: 60000, log: (m) => logs.push(m) });
    hit(tracker, { path: "/a" });
    await tracker.flush();
    assert.ok(fs.existsSync(path.join(dir, "pending.ndjson")), "buffered to pending while down");
    assert.equal(logs.length, 1);
    up = true;
    hit(tracker, { path: "/b" });
    await tracker.flush();
    assert.deepEqual(received.map((e) => e.path), ["/a", "/b"]);
    assert.ok(!fs.existsSync(path.join(dir, "pending.ndjson")), "pending replayed and removed");
  });
});

describe("collector", () => {
  function setup() {
    const dir = tmpDir("central-");
    return createCollector({ dbPath: path.join(dir, "sitedata.sqlite"), key: "sleutel", exportToken: "geheim" });
  }

  test("receive refuses a wrong or missing key and a malformed body", () => {
    const c = setup();
    let res = fakeRes();
    c.receive(fakeReq({ method: "POST", body: { site: "a", events: [] } }), res);
    assert.equal(res.statusCode, 401);
    res = fakeRes();
    c.receive(fakeReq({ method: "POST", headers: { "x-track-key": "fout" }, body: { site: "a", events: [] } }), res);
    assert.equal(res.statusCode, 401);
    res = fakeRes();
    c.receive(fakeReq({ method: "POST", headers: { "x-track-key": "sleutel" }, body: { nope: 1 } }), res);
    assert.equal(res.statusCode, 400);
    c.close();
  });

  test("receive drops rows that are not events and forces the site label from the body", () => {
    const c = setup();
    const good = { ts: "2026-10-13T10:00:00.000Z", event: "pageview", agent_class: "human", site: "spoof", path: "/x" };
    const res = fakeRes();
    c.receive(fakeReq({ method: "POST", headers: { "x-track-key": "sleutel" }, body: { site: "trainerbjorn", events: [good, { junk: true }] } }), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ok: true, inserted: 1, dropped: 1 });
    assert.equal(c.db.prepare("SELECT site FROM events").get().site, "trainerbjorn");
    c.close();
  });

  test("export streams CSV with BOM, filtered by site and day, and refuses a wrong token", () => {
    const c = setup();
    c.insertRows([
      { ts: "2026-10-12T10:00:00.000Z", site: "a", event: "pageview", agent_class: "human", path: "/one" },
      { ts: "2026-10-13T10:00:00.000Z", site: "a", event: "pageview", agent_class: "human", path: "/two, with comma" },
      { ts: "2026-10-13T11:00:00.000Z", site: "b", event: "pageview", agent_class: "human", path: "/three" },
    ]);
    let res = fakeRes();
    c.exportHandler(fakeReq({ query: { token: "fout" } }), res);
    assert.equal(res.statusCode, 401);
    res = fakeRes();
    c.exportHandler(fakeReq({ query: { token: "geheim", site: "a", from: "2026-10-13" } }), res);
    const lines = res.text.split("\n").filter(Boolean);
    assert.ok(lines[0].startsWith("﻿id,ts,site,"));
    assert.equal(lines.length, 2);
    assert.ok(lines[1].includes('"/two, with comma"'));
    assert.ok(COLUMNS.every((col) => lines[0].includes(col)));
    c.close();
  });
});

describe("openDatabase", () => {
  test("is idempotent: opening the same file twice keeps the schema and the data", () => {
    const f = path.join(tmpDir("db-"), "x.sqlite");
    const a = openDatabase(f);
    a.exec("INSERT INTO events (ts, site, event, agent_class) VALUES ('2026-10-13T00:00:00Z', 's', 'pageview', 'human')");
    a.close();
    const b = openDatabase(f);
    assert.equal(b.prepare("SELECT COUNT(*) AS n FROM events").get().n, 1);
    b.close();
  });
});
