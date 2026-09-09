// De bijzonderheden bij een aanvraag: alles wat in en rond de gevraagde dagen
// speelt, zodat Luuk en Wanda snel kunnen beslissen. Eén lijst, gebruikt door
// de meldingsmail én het aanvraagscherm in het beheer, zodat de twee nooit uit
// elkaar lopen.
//
// De regels zijn feiten, geen oordeel: nergens staat "dan is het vol op de
// camping". Dat is een uitspraak over de camping van een ander, en die doen we
// niet (zie de merkwetten in CLAUDE.md).

const dates = require("./dates");
const season = require("./season");
const { COUNTRIES } = require("./holidays");

const WINDOW_DAYS = 7; // hoe ver we ervoor en erna kijken
const SOON_DAYS = 21;
const MAX_PER_COUNTRY = 2;

const COUNTRY_LABEL = { NL: "Nederland", FR: "Frankrijk", DE: "Duitsland", EN: "Engeland" };
const LANG_COUNTRY = { nl: "NL", fr: "FR", de: "DE", en: "EN" };
const KIND_LABEL = {
  rented: "verhuurd",
  option: "optie",
  own: "wij zelf",
  blocked: "gesloten",
  siblu: "via Siblu",
};

/** De enige plek die de opslag aanraakt; de rest van dit bestand is puur. */
function loadContext(store, request, today) {
  const from = dates.addDays(request.arrival, -WINDOW_DAYS);
  const to = dates.addDays(request.departure, WINDOW_DAYS);
  const holidays = {};
  for (const c of COUNTRIES) holidays[c] = store.holidaysBetween(c, from, to);
  const year = Number(request.arrival.slice(0, 4));
  return {
    request,
    today,
    periods: store.listPeriods(from, to),
    overlap: store.overlappingPeriods(request.arrival, request.departure),
    otherRequests: store
      .listRequests(["new"])
      .filter((r) => r.id !== request.id && r.arrival < request.departure && r.departure > request.arrival),
    holidays,
    holidaysLoaded: store.holidaysFetched(year),
  };
}

function periodName(p) {
  return p.guest_name ? `${p.guest_name} (${KIND_LABEL[p.kind]})` : KIND_LABEL[p.kind];
}

/** Hoe een periode zich verhoudt tot het verblijf, in woorden. */
function overlapPhrase(from, to, arrival, departure) {
  // [from, to] is inclusief; [arrival, departure) zijn de nachten.
  const lastNight = dates.addDays(departure, -1);
  const nights = dates.nightsBetween(arrival, departure);
  if (to < arrival) {
    const gap = dates.nightsBetween(to, arrival);
    return gap === 1 ? "eindigt de dag voor aankomst" : `eindigt ${gap} dagen voor aankomst`;
  }
  if (from > lastNight) {
    const gap = dates.nightsBetween(lastNight, from);
    return gap === 1 ? "begint op de vertrekdag" : `begint ${gap - 1} dagen na vertrek`;
  }
  const start = from < arrival ? arrival : from;
  const end = to > lastNight ? lastNight : to;
  const covered = dates.nightsBetween(start, end) + 1;
  if (covered >= nights) return `alle ${nights} ${nights === 1 ? "nacht" : "nachten"}`;
  const word = covered === 1 ? "nacht" : "nachten";
  if (start === arrival) return `de eerste ${covered} ${word}`;
  if (end === lastNight) return `de laatste ${covered} ${word}`;
  return `${covered} ${word} midden in het verblijf`;
}

/** Eén feestdag ten opzichte van het verblijf. */
function dayPhrase(day, arrival, departure, lang = "nl") {
  const lastNight = dates.addDays(departure, -1);
  const when = `${dates.formatShort(day, lang)}`;
  if (day === arrival) return `${when}, op de aankomstdag`;
  if (day === departure) return `${when}, op de vertrekdag`;
  if (day < arrival) {
    const gap = dates.nightsBetween(day, arrival);
    return `${when}, ${gap === 1 ? "de dag voor aankomst" : `${gap} dagen voor aankomst`}`;
  }
  if (day > departure) {
    const gap = dates.nightsBetween(departure, day);
    return `${when}, ${gap === 1 ? "de dag na vertrek" : `${gap} dagen na vertrek`}`;
  }
  return day <= lastNight ? `${when}, tijdens het verblijf` : when;
}

/**
 * Regionale rijen met dezelfde naam samenvoegen: de Nederlandse zomervakantie
 * komt in drie regio's binnen, de Duitse in zestien deelstaten. Eén regel dus,
 * met "(regio's verschillen)" erachter als het niet landelijk is.
 */
function mergeHolidays(rows) {
  const byKey = new Map();
  for (const r of rows) {
    const key = `${r.kind}|${r.name}`;
    const hit = byKey.get(key);
    if (!hit) {
      byKey.set(key, {
        kind: r.kind,
        name: r.name,
        from: r.start_date,
        to: r.end_date,
        mixedRegions: !r.nationwide,
      });
    } else {
      if (r.start_date < hit.from) hit.from = r.start_date;
      if (r.end_date > hit.to) hit.to = r.end_date;
      if (!r.nationwide) hit.mixedRegions = true;
    }
  }
  return [...byKey.values()].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

/** Per land één regel met wat er speelt; hooguit twee items. */
function holidayRows(ctx) {
  const { request } = ctx;
  const own = LANG_COUNTRY[request.lang];
  const order = [own, ...COUNTRIES.filter((c) => c !== own)].filter(Boolean);
  return order.map((country) => {
    const merged = mergeHolidays(ctx.holidays[country] || []);
    if (!merged.length) return { label: COUNTRY_LABEL[country], value: "niets in deze dagen" };
    const scored = merged
      .map((m) => ({ m, phrase: overlapPhrase(m.from, m.to, request.arrival, request.departure) }))
      .sort((a, b) => weight(b.phrase) - weight(a.phrase));
    const shown = scored.slice(0, MAX_PER_COUNTRY).map(({ m, phrase }) => {
      if (m.kind === "public" && m.from === m.to) {
        return `${m.name}: ${dayPhrase(m.from, request.arrival, request.departure)}`;
      }
      const span = `${dates.formatShort(m.from, "nl")} – ${dates.formatShort(m.to, "nl")}`;
      const regio = m.mixedRegions ? ", regio's verschillen" : "";
      return `${m.name} (${span}${regio}): ${phrase}`;
    });
    const rest = scored.length - shown.length;
    if (rest > 0) shown.push(`en nog ${rest} ${rest === 1 ? "andere" : "andere"}`);
    return { label: COUNTRY_LABEL[country], value: shown.join("\n") };
  });
}

/** Hoe zwaar een omschrijving weegt bij het kiezen van de twee die je toont. */
function weight(phrase) {
  const m = /^(alle|de eerste|de laatste|)\s*(\d+)?/.exec(phrase);
  if (phrase.startsWith("alle")) return 1000;
  const n = Number((m && m[2]) || 0);
  if (/voor aankomst|na vertrek|vertrekdag/.test(phrase)) return n ? 10 - n : 5;
  return 100 + n;
}

/**
 * @returns {Array<{key, tone: "warn"|"info"|"calm", title, lines?: string[], rows?: [{label, value}]}>}
 */
function collectHighlights(ctx) {
  const { request, today } = ctx;
  const { arrival, departure } = request;
  const out = [];
  const lastNight = dates.addDays(departure, -1);

  // 1. Wat staat er in de kalender voor deze nachten?
  if (ctx.overlap && ctx.overlap.length) {
    out.push({
      key: "kalender",
      tone: "warn",
      title: "Deze nachten staan al in de kalender",
      lines: [
        ctx.overlap
          .map((p) => `${dates.formatRange(p.arrival, p.departure, "nl")} · ${periodName(p)}`)
          .join("\n"),
        "De gast heeft hier niets over gehoord; die kreeg alleen de bevestiging dat de aanvraag binnen is.",
      ],
    });
  } else {
    out.push({
      key: "kalender",
      tone: "calm",
      title: "In de kalender is deze periode vrij",
      lines: ["Er staat niets voor deze nachten."],
    });
  }

  // 2. Een tweede aanvraag voor dezelfde dagen: die zie je nergens anders.
  if (ctx.otherRequests && ctx.otherRequests.length) {
    out.push({
      key: "andere-aanvraag",
      tone: "warn",
      title:
        ctx.otherRequests.length === 1
          ? "Er ligt nog een aanvraag voor deze dagen"
          : `Er liggen nog ${ctx.otherRequests.length} aanvragen voor deze dagen`,
      lines: [
        ctx.otherRequests
          .map((r) => `${r.name}: ${dates.formatRange(r.arrival, r.departure, "nl")}`)
          .join("\n"),
        "Beide families wachten nog op antwoord.",
      ],
    });
  }

  // 3. Juli is van Siblu.
  const julyStart = `${arrival.slice(0, 4)}-07-01`;
  const julyEnd = `${arrival.slice(0, 4)}-07-31`;
  const touchesJuly = arrival <= julyEnd && lastNight >= julyStart;
  if (touchesJuly) {
    const inside = dates.eachNight(arrival, departure).filter((d) => d >= julyStart && d <= julyEnd).length;
    const nights = dates.nightsBetween(arrival, departure);
    out.push({
      key: "siblu",
      tone: inside === nights ? "warn" : "info",
      title: inside === nights ? "Deze nachten liggen in de Siblu-maand" : "Het verblijf raakt de Siblu-maand",
      lines: [
        `Van 1 tot en met 31 juli verhuurt Siblu Ty LuWa. ${inside} van de ${nights} ${nights === 1 ? "nacht valt" : "nachten vallen"} daarin.`,
      ],
    });
  }

  // 4. De randen van het seizoen.
  const closed = season.closedNights(arrival, departure);
  if (closed.length) {
    out.push({
      key: "seizoen",
      tone: "warn",
      title: "Een deel valt buiten het seizoen",
      lines: [`${closed.length} ${closed.length === 1 ? "nacht valt" : "nachten vallen"} in de wintersluiting (november tot en met februari).`],
    });
  } else if (!season.isOpenNight(dates.addDays(arrival, -WINDOW_DAYS)) || !season.isOpenNight(dates.addDays(lastNight, WINDOW_DAYS))) {
    out.push({
      key: "seizoen",
      tone: "info",
      title: "Vlak bij de rand van het seizoen",
      lines: [
        !season.isOpenNight(dates.addDays(arrival, -WINDOW_DAYS))
          ? `De camping gaat 1 maart open; aankomst is ${dates.formatShort(arrival, "nl")}.`
          : `De camping gaat 1 november dicht; vertrek is ${dates.formatShort(departure, "nl")}.`,
      ],
    });
  }

  // 5. Wat er vlak voor of na staat: dezelfde dag wisselen is iets om te weten.
  const neighbours = (ctx.periods || []).filter((p) => p.departure <= arrival || p.arrival >= departure);
  if (neighbours.length) {
    const lines = neighbours.map((p) => {
      if (p.departure === arrival) return `${periodName(p)} vertrekt op ${dates.formatShort(arrival, "nl")} — dezelfde dag als de aankomst.`;
      if (p.arrival === departure) return `${periodName(p)} komt op ${dates.formatShort(departure, "nl")} — dezelfde dag als het vertrek.`;
      if (p.departure < arrival) return `${periodName(p)} vertrekt ${dates.formatShort(p.departure, "nl")}, ${dates.nightsBetween(p.departure, arrival)} dagen voor aankomst.`;
      return `${periodName(p)} komt ${dates.formatShort(p.arrival, "nl")}, ${dates.nightsBetween(departure, p.arrival)} dagen na vertrek.`;
    });
    out.push({ key: "buren", tone: "info", title: "Vlak ervoor of erna staat er iets", lines: [lines.join("\n")] });
  }

  // 6. Haast.
  const daysAhead = dates.nightsBetween(today, arrival);
  if (daysAhead >= 0 && daysAhead <= SOON_DAYS) {
    out.push({
      key: "haast",
      tone: "calm",
      title: `Aankomst is al ${dates.relativeAhead(today, arrival)}`,
      lines: ["Een snel antwoord scheelt de gast veel."],
    });
  }

  // 7. Feestdagen en schoolvakanties van alle vier de landen.
  if (!ctx.holidaysLoaded) {
    out.push({
      key: "vakanties",
      tone: "info",
      title: "Feestdagen nog niet opgehaald",
      lines: [`De feestdagen en schoolvakanties van ${arrival.slice(0, 4)} staan nog niet in de planning, dus daar valt nu niets over te zeggen.`],
    });
  } else {
    const rows = holidayRows(ctx);
    const empty = rows.every((r) => r.value === "niets in deze dagen");
    if (empty) {
      out.push({
        key: "vakanties",
        tone: "calm",
        title: "Geen feestdag of schoolvakantie in deze dagen",
        lines: ["In geen van de vier landen, ook niet in de week ervoor of erna."],
      });
    } else {
      out.push({
        key: "vakanties",
        tone: "info",
        title: "Feestdagen en schoolvakanties",
        lines: [`In deze dagen en de week eromheen, per land van de vier sites.`],
        rows,
      });
    }
  }

  return out;
}

module.exports = {
  loadContext,
  collectHighlights,
  overlapPhrase,
  dayPhrase,
  mergeHolidays,
  holidayRows,
  COUNTRY_LABEL,
  KIND_LABEL,
  WINDOW_DAYS,
};
