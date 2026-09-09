const test = require("node:test");
const assert = require("node:assert/strict");
const { createTranslator } = require("../lib/translate");

test("zonder sleutel: null, zelfde taal: ongewijzigd", async () => {
  const t = createTranslator({});
  assert.equal(t.enabled, false);
  assert.equal(await t.translate("Hallo", "nl", "fr"), null);
  assert.equal(await t.translate(" Hallo ", "nl", "nl"), "Hallo");
  assert.equal(await t.translate("", "nl", "fr"), "");
});

test("azure: verzoek en antwoord", async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => [{ translations: [{ text: "Bonjour, c’est libre.", to: "fr" }] }] };
  };
  const t = createTranslator({ key: "k", region: "westeurope" }, { fetchFn });
  assert.equal(t.enabled, true);
  assert.equal(await t.translate("Hallo, het is vrij.", "nl", "fr"), "Bonjour, c’est libre.");
  assert.equal(calls[0].url, "https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=nl&to=fr&textType=plain");
  assert.equal(calls[0].init.headers["Ocp-Apim-Subscription-Key"], "k");
  assert.equal(calls[0].init.headers["Ocp-Apim-Subscription-Region"], "westeurope");
  assert.deepEqual(JSON.parse(calls[0].init.body), [{ Text: "Hallo, het is vrij." }]);
});

test("fout: translate gooit, tryTranslate geeft null", async () => {
  const t = createTranslator({ key: "k" }, { fetchFn: async () => ({ ok: false, status: 401, text: async () => "nope" }), log: { error() {} } });
  await assert.rejects(() => t.translate("x", "nl", "de"), /Translator 401: nope/);
  assert.equal(await t.tryTranslate("x", "nl", "de"), null);
});
