// Controle van wat er binnenkomt. Geeft nooit een uitzondering, altijd een
// code die de aanroeper vertaalt naar een melding in de taal van de gast.

const dates = require("./dates");

const MAX_NIGHTS = 28;
const MAX_ADULTS = 4; // het feitenblad: vier slaapplaatsen in de twee slaapkamers
const MAX_GUESTS = 6; // die vier, plus hooguit twee kinderen op de slaapbank
const MAX_MONTHS_AHEAD = 24;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
const int = (v, fallback) => {
  const n = Number.parseInt(String(v == null ? "" : v).trim(), 10);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * @returns {{ok:true, data:object} | {ok:false, code:string}}
 */
function validateRequest(body, { today, languages }) {
  const b = body || {};
  if (str(b.website, 200)) return { ok: false, code: "honeypot" };

  const arrival = str(b.arrival, 10);
  const departure = str(b.departure, 10);
  if (!dates.isIsoDate(arrival) || !dates.isIsoDate(departure) || arrival >= departure) {
    return { ok: false, code: "dates" };
  }
  if (arrival < today) return { ok: false, code: "past" };
  if (arrival > `${dates.addMonths(dates.monthOf(today), MAX_MONTHS_AHEAD)}-01`) {
    return { ok: false, code: "tooFar" };
  }
  if (dates.nightsBetween(arrival, departure) > MAX_NIGHTS) return { ok: false, code: "tooLong" };

  const adults = int(b.adults, 0);
  const children = int(b.children, 0);
  if (adults < 1) return { ok: false, code: "adults" };
  if (adults > MAX_ADULTS) return { ok: false, code: "tooManyAdults" };
  if (children < 0 || adults + children > MAX_GUESTS) return { ok: false, code: "tooMany" };

  const name = str(b.name, 100);
  if (name.length < 2) return { ok: false, code: "name" };
  const email = str(b.email, 200);
  if (!EMAIL.test(email)) return { ok: false, code: "email" };

  const lang = languages.includes(b.lang) ? b.lang : languages[0];
  const message = str(b.message, 2000);

  return { ok: true, data: { arrival, departure, adults, children, name, email, message, lang } };
}

/** Het periodeformulier in het beheer. */
function validatePeriod(body, kinds) {
  const b = body || {};
  const arrival = str(b.arrival, 10);
  const departure = str(b.departure, 10);
  if (!dates.isIsoDate(arrival) || !dates.isIsoDate(departure)) return { ok: false, code: "dates" };
  if (arrival >= departure) return { ok: false, code: "order" };
  if (dates.nightsBetween(arrival, departure) > 365) return { ok: false, code: "tooLong" };
  const kind = str(b.kind, 20);
  if (!kinds.includes(kind)) return { ok: false, code: "kind" };
  return {
    ok: true,
    data: {
      arrival,
      departure,
      kind,
      guestName: str(b.guestName, 100),
      guestEmail: str(b.guestEmail, 200),
      guestPhone: str(b.guestPhone, 40),
      notes: str(b.notes, 2000),
    },
  };
}

module.exports = { validateRequest, validatePeriod, MAX_NIGHTS, MAX_GUESTS, MAX_ADULTS };
