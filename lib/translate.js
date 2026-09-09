// Vertalen via Azure AI Translator, rechtstreeks tegen de REST-API (geen SDK).
// Gebruikt voor: het bericht van een gast naar het Nederlands, en het antwoord
// van Luuk en Wanda naar de taal van de gast. Zonder sleutel geeft translate()
// null en werkt de rest gewoon door, alleen dan zonder vertaling.
//
// Instellen: docs/AZURE-SETUP.md §7. TRANSLATOR_KEY en TRANSLATOR_REGION
// (de regio van de resource, bv. westeurope); TRANSLATOR_ENDPOINT alleen als
// je niet het wereldwijde eindpunt gebruikt.

const API_VERSION = "3.0";
const DEFAULT_ENDPOINT = "https://api.cognitive.microsofttranslator.com";
const MAX_CHARS = 10000;

// fetch pas bij de aanroep opzoeken, zodat een test global.fetch kan vervangen.
function createTranslator(cfg = {}, { fetchFn = (...a) => fetch(...a), log = console } = {}) {
  const enabled = Boolean(cfg.key);
  const endpoint = (cfg.endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, "");

  /**
   * @returns {Promise<string|null>}  de vertaling, of null als vertalen niet
   *   ingesteld is. Een mislukte aanroep gooit, zodat de aanroeper kiest:
   *   melden (antwoord aan een gast) of stil overslaan (inkomend bericht).
   */
  async function translate(text, from, to) {
    const clean = String(text || "").trim().slice(0, MAX_CHARS);
    if (!clean) return "";
    if (from === to) return clean;
    if (!enabled) return null;
    const url = `${endpoint}/translate?api-version=${API_VERSION}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&textType=plain`;
    const res = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": cfg.key,
        ...(cfg.region ? { "Ocp-Apim-Subscription-Region": cfg.region } : {}),
      },
      body: JSON.stringify([{ Text: clean }]),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Translator ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const out = data && data[0] && data[0].translations && data[0].translations[0];
    if (!out || typeof out.text !== "string") throw new Error("Translator: onverwacht antwoord");
    return out.text;
  }

  /** Als translate(), maar nooit een fout: null bij mislukking. */
  async function tryTranslate(text, from, to) {
    try {
      return await translate(text, from, to);
    } catch (e) {
      log.error("Vertalen mislukt:", e.message);
      return null;
    }
  }

  return { enabled, translate, tryTranslate };
}

module.exports = { createTranslator, API_VERSION };
