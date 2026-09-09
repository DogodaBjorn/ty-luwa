// Alle toegang tot de planning loopt hierlangs. Routes en jobs kennen geen SQL;
// de opslag is daardoor later te vervangen zonder de rest aan te raken.

const dates = require("./dates");

const REQUEST_STATUSES = ["new", "planned", "declined", "archived"];
const PERIOD_KINDS = ["rented", "own", "option", "blocked", "siblu"];

function createStore(db, opts = {}) {
  const now = opts.now || (() => new Date().toISOString());
  const num = (v) => Number(v);

  const q = {
    insertPeriod: db.prepare(
      `INSERT INTO periods (arrival, departure, kind, guest_name, guest_email, guest_phone,
         notes, request_id, form_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    updatePeriod: db.prepare(
      `UPDATE periods SET arrival = ?, departure = ?, kind = ?, guest_name = ?, guest_email = ?,
         guest_phone = ?, notes = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`
    ),
    getPeriod: db.prepare(`SELECT * FROM periods WHERE id = ?`),
    periodByFormId: db.prepare(`SELECT * FROM periods WHERE form_id = ?`),
    listPeriods: db.prepare(
      `SELECT * FROM periods
       WHERE deleted_at IS NULL AND arrival < ? AND departure > ?
       ORDER BY arrival, id`
    ),
    overlapping: db.prepare(
      `SELECT * FROM periods
       WHERE deleted_at IS NULL AND arrival < ? AND departure > ? AND id != ?
       ORDER BY arrival`
    ),
    softDelete: db.prepare(`UPDATE periods SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`),
    restore: db.prepare(`UPDATE periods SET deleted_at = NULL, updated_at = ? WHERE id = ?`),
    purgeDeleted: db.prepare(`DELETE FROM periods WHERE deleted_at IS NOT NULL AND deleted_at < ?`),
    linkedRequests: db.prepare(`SELECT request_id FROM periods WHERE id = ? AND request_id IS NOT NULL`),
    periodsOfRequest: db.prepare(`SELECT * FROM periods WHERE request_id = ? AND deleted_at IS NULL`),

    insertRequest: db.prepare(
      `INSERT INTO requests (arrival, departure, adults, children, name, email, message, lang, host, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    getRequest: db.prepare(`SELECT * FROM requests WHERE id = ?`),
    listRequests: db.prepare(`SELECT * FROM requests WHERE status IN (SELECT value FROM json_each(?)) ORDER BY created_at DESC, id DESC`),
    countNew: db.prepare(`SELECT COUNT(*) AS n FROM requests WHERE status = 'new'`),
    setRequestStatus: db.prepare(`UPDATE requests SET status = ?, handled_at = ? WHERE id = ?`),
    setMailStatus: db.prepare(`UPDATE requests SET mail_status = ? WHERE id = ?`),
    duplicateRequest: db.prepare(
      `SELECT * FROM requests WHERE lower(email) = lower(?) AND arrival = ? AND departure = ? AND created_at > ?
       ORDER BY id DESC LIMIT 1`
    ),

    insertToken: db.prepare(
      `INSERT INTO login_tokens (token_hash, code_hash, email, expires_at) VALUES (?, ?, ?, ?)`
    ),
    tokenByHash: db.prepare(`SELECT * FROM login_tokens WHERE token_hash = ?`),
    tokenById: db.prepare(`SELECT * FROM login_tokens WHERE id = ?`),
    useToken: db.prepare(`UPDATE login_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL`),
    bumpAttempts: db.prepare(`UPDATE login_tokens SET attempts = attempts + 1 WHERE id = ?`),
    countRecentTokens: db.prepare(`SELECT COUNT(*) AS n FROM login_tokens WHERE lower(email) = lower(?) AND expires_at > ?`),
    purgeTokens: db.prepare(`DELETE FROM login_tokens WHERE expires_at < ?`),

    insertSession: db.prepare(
      `INSERT INTO sessions (session_hash, email, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)`
    ),
    getSession: db.prepare(`SELECT * FROM sessions WHERE session_hash = ? AND expires_at > ?`),
    touchSession: db.prepare(`UPDATE sessions SET last_seen_at = ? WHERE session_hash = ?`),
    deleteSession: db.prepare(`DELETE FROM sessions WHERE session_hash = ?`),
    purgeSessions: db.prepare(`DELETE FROM sessions WHERE expires_at < ?`),

    setMessageNl: db.prepare(`UPDATE requests SET message_nl = ? WHERE id = ?`),
    insertMessage: db.prepare(`INSERT INTO messages (request_id, body_nl, body_sent, lang, sent_at, mail_status) VALUES (?, ?, ?, ?, ?, ?)`),
    listMessages: db.prepare(`SELECT * FROM messages WHERE request_id = ? ORDER BY id`),
    hasKindInRange: db.prepare(`SELECT COUNT(*) AS n FROM periods WHERE deleted_at IS NULL AND kind = ? AND arrival < ? AND departure > ?`),

    deleteHolidays: db.prepare(`DELETE FROM holidays WHERE country = ? AND year = ?`),
    insertHoliday: db.prepare(
      `INSERT INTO holidays (country, year, kind, start_date, end_date, name, nationwide, regions, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ),
    holidaysBetween: db.prepare(
      `SELECT * FROM holidays WHERE country = ? AND start_date < ? AND end_date >= ? ORDER BY start_date, kind`
    ),
    holidayYears: db.prepare(`SELECT country, year, COUNT(*) AS n FROM holidays GROUP BY country, year`),

    getMeta: db.prepare(`SELECT value FROM meta WHERE key = ?`),
    setMeta: db.prepare(`INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`),
  };

  function transaction(fn) {
    db.exec("BEGIN");
    try {
      const r = fn();
      db.exec("COMMIT");
      return r;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }

  // ---- periodes ---------------------------------------------------------

  function createPeriod(p) {
    assertPeriod(p);
    if (p.formId) {
      const existing = q.periodByFormId.get(p.formId);
      if (existing) return existing;
    }
    const t = now();
    const r = q.insertPeriod.run(
      p.arrival, p.departure, p.kind,
      p.guestName || "", p.guestEmail || "", p.guestPhone || "", p.notes || "",
      p.requestId || null, p.formId || null, t, t
    );
    const id = num(r.lastInsertRowid);
    if (p.requestId) q.setRequestStatus.run("planned", t, p.requestId);
    return q.getPeriod.get(id);
  }

  function updatePeriod(id, p) {
    assertPeriod(p);
    q.updatePeriod.run(
      p.arrival, p.departure, p.kind,
      p.guestName || "", p.guestEmail || "", p.guestPhone || "", p.notes || "",
      now(), id
    );
    return q.getPeriod.get(id);
  }

  function getPeriod(id) {
    return q.getPeriod.get(id) || null;
  }

  /** Periodes die (deels) in [from, to) vallen. */
  function listPeriods(from, to) {
    return q.listPeriods.all(to, from);
  }

  function overlappingPeriods(arrival, departure, excludeId = 0) {
    return q.overlapping.all(departure, arrival, excludeId);
  }

  /** Verwijderen is omkeerbaar: de rij blijft, alleen deleted_at wordt gezet.
   *  Een gekoppelde aanvraag springt terug naar "nieuw", zodat hij weer in de
   *  inbox staat en niets kwijtraakt. */
  function softDeletePeriod(id) {
    return transaction(() => {
      const p = q.getPeriod.get(id);
      if (!p || p.deleted_at) return null;
      const t = now();
      q.softDelete.run(t, t, id);
      if (p.request_id) q.setRequestStatus.run("new", t, p.request_id);
      return q.getPeriod.get(id);
    });
  }

  function restorePeriod(id) {
    return transaction(() => {
      const p = q.getPeriod.get(id);
      if (!p || !p.deleted_at) return null;
      const t = now();
      q.restore.run(t, id);
      if (p.request_id) q.setRequestStatus.run("planned", t, p.request_id);
      return q.getPeriod.get(id);
    });
  }

  /** Bezette nachten in [from, to) als Set van YYYY-MM-DD. */
  function occupiedNights(from, to) {
    const set = new Set();
    for (const p of listPeriods(from, to)) {
      const a = p.arrival < from ? from : p.arrival;
      const d = p.departure > to ? to : p.departure;
      for (const n of dates.eachNight(a, d)) set.add(n);
    }
    return set;
  }

  /** Per bezette nacht de soort, voor het beheer (stip per soort). */
  function occupiedNightKinds(from, to) {
    const map = new Map();
    for (const p of listPeriods(from, to)) {
      const a = p.arrival < from ? from : p.arrival;
      const d = p.departure > to ? to : p.departure;
      for (const n of dates.eachNight(a, d)) map.set(n, { kind: p.kind, id: p.id, name: p.guest_name });
    }
    return map;
  }

  // ---- aanvragen --------------------------------------------------------

  function createRequest(r) {
    const t = now();
    const res = q.insertRequest.run(
      r.arrival, r.departure, r.adults, r.children || 0,
      r.name, r.email, r.message || "", r.lang, r.host || "", t
    );
    return q.getRequest.get(num(res.lastInsertRowid));
  }

  function findDuplicateRequest(email, arrival, departure, sinceIso) {
    return q.duplicateRequest.get(email, arrival, departure, sinceIso) || null;
  }

  function getRequest(id) {
    return q.getRequest.get(id) || null;
  }

  function listRequests(statuses) {
    const list = Array.isArray(statuses) ? statuses : [statuses];
    return q.listRequests.all(JSON.stringify(list));
  }

  function countNewRequests() {
    return num(q.countNew.get().n);
  }

  function setRequestStatus(id, status) {
    if (!REQUEST_STATUSES.includes(status)) throw new Error(`Onbekende status: ${status}`);
    q.setRequestStatus.run(status, status === "new" ? null : now(), id);
    return q.getRequest.get(id);
  }

  function setMailStatus(id, status) {
    q.setMailStatus.run(status, id);
  }

  function periodsOfRequest(id) {
    return q.periodsOfRequest.all(id);
  }

  function setRequestMessageNl(id, text) {
    q.setMessageNl.run(text, id);
  }

  /** Een verstuurd antwoord aan de gast. */
  function addMessage(m) {
    const r = q.insertMessage.run(m.requestId, m.bodyNl, m.bodySent, m.lang, now(), m.mailStatus || null);
    return num(r.lastInsertRowid);
  }

  function listMessages(requestId) {
    return q.listMessages.all(requestId);
  }

  function hasKindInRange(kind, from, to) {
    return num(q.hasKindInRange.get(kind, to, from).n) > 0;
  }

  // ---- inloggen ---------------------------------------------------------

  function createLoginToken(tokenHash, codeHash, email, expiresAt) {
    const r = q.insertToken.run(tokenHash, codeHash, email, expiresAt);
    return num(r.lastInsertRowid);
  }

  function getLoginToken(id) {
    return q.tokenById.get(id) || null;
  }

  function getLoginTokenByHash(hash) {
    return q.tokenByHash.get(hash) || null;
  }

  /** Markeert een token als gebruikt; false als dat al gebeurd was. */
  function useLoginToken(id) {
    return q.useToken.run(now(), id).changes > 0;
  }

  function bumpLoginAttempts(id) {
    q.bumpAttempts.run(id);
  }

  function countRecentLoginTokens(email) {
    return num(q.countRecentTokens.get(email, now()).n);
  }

  function createSession(hash, email, expiresAt) {
    const t = now();
    q.insertSession.run(hash, email, t, expiresAt, t);
  }

  function getSession(hash) {
    return q.getSession.get(hash, now()) || null;
  }

  function touchSession(hash) {
    q.touchSession.run(now(), hash);
  }

  function deleteSession(hash) {
    q.deleteSession.run(hash);
  }

  // ---- feestdagen en schoolvakanties ------------------------------------

  /** Vervangt alles van één land en jaar in één keer. */
  function replaceHolidays(country, year, rows) {
    return transaction(() => {
      q.deleteHolidays.run(country, year);
      const t = now();
      // Ook vastleggen dát we gekeken hebben: een jaar zonder feestdagen is
      // iets anders dan een jaar dat nog niet is opgehaald.
      q.setMeta.run(`holidays:${country}:${year}`, t);
      for (const r of rows) {
        q.insertHoliday.run(
          country, year, r.kind, r.startDate, r.endDate || r.startDate,
          r.name, r.nationwide === false ? 0 : 1, (r.regions || []).join(", "), t
        );
      }
      return rows.length;
    });
  }

  /** Alles wat (deels) in [from, to) valt. */
  function holidaysBetween(country, from, to) {
    return q.holidaysBetween.all(country, to, from);
  }

  function holidayYears() {
    return q.holidayYears.all();
  }

  /** Is er voor dit jaar al opgehaald (voor welk land dan ook)? */
  function holidaysFetched(year) {
    return db
      .prepare("SELECT COUNT(*) AS n FROM meta WHERE key LIKE ?")
      .get(`holidays:%:${year}`).n > 0;
  }

  // ---- onderhoud --------------------------------------------------------

  function purgeExpired(deletedBefore) {
    const t = now();
    q.purgeTokens.run(t);
    q.purgeSessions.run(t);
    q.purgeDeleted.run(deletedBefore);
  }

  function getMeta(key) {
    const r = q.getMeta.get(key);
    return r ? r.value : null;
  }

  function setMeta(key, value) {
    q.setMeta.run(key, String(value));
  }

  /** Alles wat de planning is, als één JSON-object (de back-up). */
  function exportSnapshot() {
    return {
      exportedAt: now(),
      periods: db.prepare("SELECT * FROM periods ORDER BY id").all(),
      requests: db.prepare("SELECT * FROM requests ORDER BY id").all(),
      messages: db.prepare("SELECT * FROM messages ORDER BY id").all(),
    };
  }

  /** Zet een snapshot terug. Vervangt de planning en de aanvragen; sessies
   *  en inlogcodes blijven staan. */
  function importSnapshot(snap) {
    transaction(() => {
      db.exec("DELETE FROM messages; DELETE FROM periods; DELETE FROM requests;");
      const cols = (rows) => Object.keys(rows[0] || {});
      for (const table of ["requests", "periods", "messages"]) {
        const rows = snap[table] || [];
        if (!rows.length) continue;
        const c = cols(rows);
        const ins = db.prepare(
          `INSERT INTO ${table} (${c.join(", ")}) VALUES (${c.map(() => "?").join(", ")})`
        );
        for (const row of rows) ins.run(...c.map((k) => (row[k] === undefined ? null : row[k])));
      }
    });
  }

  return {
    transaction,
    createPeriod, updatePeriod, getPeriod, listPeriods, overlappingPeriods,
    softDeletePeriod, restorePeriod, occupiedNights, occupiedNightKinds,
    createRequest, findDuplicateRequest, getRequest, listRequests, countNewRequests,
    setRequestStatus, setMailStatus, periodsOfRequest, setRequestMessageNl, addMessage, listMessages, hasKindInRange,
    createLoginToken, getLoginToken, getLoginTokenByHash, useLoginToken,
    bumpLoginAttempts, countRecentLoginTokens,
    createSession, getSession, touchSession, deleteSession,
    replaceHolidays, holidaysBetween, holidayYears, holidaysFetched,
    purgeExpired, getMeta, setMeta, exportSnapshot, importSnapshot,
  };
}

function assertPeriod(p) {
  if (!dates.isIsoDate(p.arrival) || !dates.isIsoDate(p.departure)) throw new Error("Ongeldige datum");
  if (p.arrival >= p.departure) throw new Error("Vertrek moet na aankomst liggen");
  if (!PERIOD_KINDS.includes(p.kind)) throw new Error(`Onbekende soort: ${p.kind}`);
}

module.exports = { createStore, REQUEST_STATUSES, PERIOD_KINDS };
