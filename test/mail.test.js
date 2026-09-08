const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { createMailer, signRequest } = require("../lib/mail");

test("HMAC-handtekening volgt het ACS-recept", () => {
  const key = Buffer.from("geheim-sleutel-voor-de-test").toString("base64");
  const body = '{"a":1}';
  const url = "https://tyluwa.europe.communication.azure.com/emails:send?api-version=2023-03-31";
  const date = "Tue, 08 Sep 2026 10:00:00 GMT";
  const h = signRequest({ method: "POST", url, body, key, date });

  const hash = crypto.createHash("sha256").update(body).digest("base64");
  const expected = crypto
    .createHmac("sha256", Buffer.from(key, "base64"))
    .update(`POST\n/emails:send?api-version=2023-03-31\n${date};tyluwa.europe.communication.azure.com;${hash}`)
    .digest("base64");
  assert.equal(h["x-ms-date"], date);
  assert.equal(h["x-ms-content-sha256"], hash);
  assert.equal(h.Authorization, `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${expected}`);
});

test("console-provider logt en verzendt niets", async () => {
  const lines = [];
  const mailer = createMailer({ provider: "console", from: "x@y" }, { log: (s) => lines.push(s) });
  await mailer.send({ to: "gast@example.fr", subject: "Hoi", text: "Tekst" });
  assert.equal(mailer.provider, "console");
  assert.match(lines[0], /Aan: gast@example.fr/);
  assert.match(lines[0], /Onderwerp: Hoi/);
  await assert.rejects(() => mailer.send({ to: [], subject: "x", text: "y" }));
});

test("acs-provider bouwt het verzoek en bewaakt de status", async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => ({ id: "abc" }) };
  };
  const mailer = createMailer(
    { provider: "acs", endpoint: "https://x.europe.communication.azure.com", key: Buffer.from("k").toString("base64"), from: "DoNotReply@ty-luwa.nl", replyTo: "luuk@example.nl" },
    { fetchFn }
  );
  const r = await mailer.send({ to: ["a@b.nl", "c@d.nl"], subject: "S", text: "T", attachments: [{ name: "b.json", contentType: "application/json", content: "{}" }] });
  assert.equal(r.id, "abc");
  assert.equal(calls[0].url, "https://x.europe.communication.azure.com/emails:send?api-version=2023-03-31");
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.senderAddress, "DoNotReply@ty-luwa.nl");
  assert.deepEqual(payload.recipients.to, [{ address: "a@b.nl" }, { address: "c@d.nl" }]);
  assert.deepEqual(payload.replyTo, [{ address: "luuk@example.nl" }]);
  assert.equal(payload.attachments[0].contentInBase64, Buffer.from("{}").toString("base64"));
  assert.match(calls[0].init.headers.Authorization, /^HMAC-SHA256 /);

  const failing = createMailer(
    { provider: "acs", endpoint: "https://x", key: "a2V5", from: "f@x" },
    { fetchFn: async () => ({ ok: false, status: 401, text: async () => "Denied" }) }
  );
  await assert.rejects(() => failing.send({ to: "a@b", subject: "s", text: "t" }), /ACS 401: Denied/);
});
