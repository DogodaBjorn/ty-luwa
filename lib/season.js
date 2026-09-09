// Camping Le Conguel is open van 1 maart tot en met 31 oktober. In de winter
// kan er niets geboekt worden, dus die maanden staan niet in de kalender en
// een aanvraag ervoor wordt geweigerd.
//
// Grenzen als "MM-DD"; SEASON_CLOSE is exclusief (1 november is de eerste dag
// dicht). Te overschrijven met SEASON_OPEN / SEASON_CLOSE, mocht de camping
// ooit andere data aanhouden.

const dates = require("./dates");

const OPEN = process.env.SEASON_OPEN || "03-01";
const CLOSE = process.env.SEASON_CLOSE || "11-01";

/** Valt deze nacht in het seizoen? */
function isOpenNight(d) {
  const md = d.slice(5);
  return md >= OPEN && md < CLOSE;
}

/** Een maand telt mee zodra er één open nacht in zit. */
function isOpenMonth(ym) {
  const mm = `${ym.slice(5)}-01`;
  const last = dates.addDays(`${dates.addMonths(ym, 1)}-01`, -1).slice(5);
  return last >= OPEN && mm < CLOSE;
}

function nextOpenMonth(ym) {
  let m = ym;
  for (let i = 0; i < 13 && !isOpenMonth(m); i++) m = dates.addMonths(m, 1);
  return m;
}

function prevOpenMonth(ym) {
  let m = ym;
  for (let i = 0; i < 13 && !isOpenMonth(m); i++) m = dates.addMonths(m, -1);
  return m;
}

/** De maand ervoor die open is (oktober als je in maart staat). */
function stepMonth(ym, direction) {
  const m = dates.addMonths(ym, direction);
  return direction < 0 ? prevOpenMonth(m) : nextOpenMonth(m);
}

/** De gesloten nachten in een verblijf; leeg = helemaal binnen het seizoen. */
function closedNights(arrival, departure) {
  return dates.eachNight(arrival, departure).filter((d) => !isOpenNight(d));
}

/**
 * De maanden die de publieke kalender toont: vanaf vandaag tot en met het
 * einde van het volgende seizoen. In de winter dus alleen het komende seizoen.
 */
function publicMonths(today) {
  const start = nextOpenMonth(dates.monthOf(today));
  const lastYear = Number(start.slice(0, 4)) + (isOpenMonth(dates.monthOf(today)) ? 1 : 0);
  const end = `${lastYear}-${CLOSE.slice(0, 2)}`; // eerste gesloten maand
  const out = [];
  for (let m = start; m < end && out.length < 24; m = dates.addMonths(m, 1)) {
    if (isOpenMonth(m)) out.push(m);
  }
  return out;
}

module.exports = {
  OPEN,
  CLOSE,
  isOpenNight,
  isOpenMonth,
  nextOpenMonth,
  prevOpenMonth,
  stepMonth,
  closedNights,
  publicMonths,
};
