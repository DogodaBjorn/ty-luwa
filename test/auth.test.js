const test = require("node:test");
const assert = require("node:assert/strict");
const { open } = require("../lib/db");
const { createStore } = require("../lib/store");
const auth = require("../lib/auth");

const T0 = "2026-09-08T10:00:00.000Z";
const allowed = ["wanda@example.nl", "luuk@example.nl"];

function fresh(now = T0) {
  const store = createStore(open(":memory:"), { now: () => now });
  return store;
}

test("inloggen met link", () => {
  const store = fresh();
  const login = auth.startLogin(store, "  Wanda@Example.nl ", { allowed, now: T0 });
  assert.ok(login);
  assert.equal(login.email, "wanda@example.nl");
  assert.match(login.code, /^\d{6}$/);
  assert.equal(auth.finishLoginByToken(store, "verkeerd", { now: T0 }), null);
  assert.equal(auth.finishLoginByToken(store, login.token, { now: T0 }), "wanda@example.nl");
  assert.equal(auth.finishLoginByToken(store, login.token, { now: T0 }), null, "eenmalig");
});

test("verlopen link, onbekend adres, te veel mails", () => {
  const store = fresh();
  assert.equal(auth.startLogin(store, "vreemde@example.com", { allowed, now: T0 }), null);
  const login = auth.startLogin(store, "luuk@example.nl", { allowed, now: T0 });
  assert.equal(auth.finishLoginByToken(store, login.token, { now: "2026-09-08T10:31:00.000Z" }), null);
  for (let i = 0; i < 4; i++) assert.ok(auth.startLogin(store, "luuk@example.nl", { allowed, now: T0 }));
  assert.equal(auth.startLogin(store, "luuk@example.nl", { allowed, now: T0 }), null, "zesde mail per uur geweigerd");
});

test("inloggen met code: fout, goed, pogingen op", () => {
  const store = fresh();
  const login = auth.startLogin(store, "wanda@example.nl", { allowed, now: T0 });
  assert.deepEqual(auth.finishLoginByCode(store, login.id, "000000", { now: T0 }), { error: "wrong" });
  assert.deepEqual(auth.finishLoginByCode(store, login.id, `${login.code.slice(0, 3)} ${login.code.slice(3)}`, { now: T0 }), { email: "wanda@example.nl" });
  assert.deepEqual(auth.finishLoginByCode(store, login.id, login.code, { now: T0 }), { error: "expired" }, "gebruikt");

  const l2 = auth.startLogin(store, "wanda@example.nl", { allowed, now: T0 });
  for (let i = 0; i < 4; i++) assert.equal(auth.finishLoginByCode(store, l2.id, "111111", { now: T0 }).error, "wrong");
  assert.equal(auth.finishLoginByCode(store, l2.id, "111111", { now: T0 }).error, "attempts");
  assert.equal(auth.finishLoginByCode(store, l2.id, l2.code, { now: T0 }).error, "attempts", "ook met de goede code");
  assert.equal(auth.finishLoginByCode(store, 999, "123456", { now: T0 }).error, "expired");
});

test("sessie, cookie en middleware", () => {
  const store = fresh();
  const s = auth.createSession(store, "luuk@example.nl", { now: T0, days: 365 });
  assert.equal(s.expiresAt, "2027-09-08T10:00:00.000Z");

  const mw = auth.sessionMiddleware(store, { now: () => T0 });
  const req = { headers: { cookie: `${auth.SESSION_COOKIE}=${s.value}; ander=1` } };
  mw(req, {}, () => {});
  assert.equal(req.admin.email, "luuk@example.nl");

  const bad = { headers: { cookie: `${auth.SESSION_COOKIE}=nep` } };
  mw(bad, {}, () => {});
  assert.equal(bad.admin, undefined);

  const headers = [];
  const res = { append: (k, v) => headers.push(v) };
  auth.setCookie(res, "x", "y z", { maxAgeSec: 10, secure: true });
  assert.equal(headers[0], "x=y%20z; Path=/beheer; Max-Age=10; HttpOnly; SameSite=Lax; Secure");
  auth.clearCookie(res, "x", { secure: false });
  assert.equal(headers[1], "x=; Path=/beheer; Max-Age=0; HttpOnly; SameSite=Lax");
});

test("sameOriginGuard", () => {
  const guard = auth.sameOriginGuard((h) => h === "ty-luwa.nl");
  const run = (headers, method = "POST") => {
    let status = 200, called = false;
    guard({ method, headers }, { status: (s) => ({ type: () => ({ send: () => { status = s; } }) }) }, () => { called = true; });
    return called ? "next" : status;
  };
  assert.equal(run({}), "next");
  assert.equal(run({ origin: "https://ty-luwa.nl" }), "next");
  assert.equal(run({ referer: "https://ty-luwa.nl/beheer/periode/3" }), "next");
  assert.equal(run({ origin: "https://evil.example" }), 403);
  assert.equal(run({ "sec-fetch-site": "cross-site" }), 403);
  assert.equal(run({ origin: "https://evil.example" }, "GET"), "next");
});
