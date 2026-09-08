// Eén SQLite-bestand, via de ingebouwde node:sqlite van Node 24. Geen npm-
// dependency, geen aparte databaseserver: voor één huis met een handvol
// boekingen per jaar is dit ruim genoeg.
//
// Op Azure App Service staat het bestand in /home/data (DATA_DIR), buiten
// wwwroot, dus het overleeft elke deploy. /home is daar een netwerkmount (SMB):
// daarom geen WAL (dat wil gedeeld geheugen via een -shm-bestand) maar het
// klassieke rollback-journal, en één proces op één instance.

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const MIGRATIONS = [
  // 1: eerste schema
  `
  CREATE TABLE requests (
    id          INTEGER PRIMARY KEY,
    arrival     TEXT    NOT NULL,
    departure   TEXT    NOT NULL,
    adults      INTEGER NOT NULL,
    children    INTEGER NOT NULL DEFAULT 0,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL,
    message     TEXT    NOT NULL DEFAULT '',
    lang        TEXT    NOT NULL,
    host        TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','planned','declined','archived')),
    mail_status TEXT,
    created_at  TEXT    NOT NULL,
    handled_at  TEXT
  );
  CREATE INDEX requests_status ON requests(status);

  CREATE TABLE periods (
    id          INTEGER PRIMARY KEY,
    arrival     TEXT    NOT NULL,
    departure   TEXT    NOT NULL,
    kind        TEXT    NOT NULL CHECK (kind IN ('rented','own','option','blocked')),
    guest_name  TEXT    NOT NULL DEFAULT '',
    guest_email TEXT    NOT NULL DEFAULT '',
    guest_phone TEXT    NOT NULL DEFAULT '',
    notes       TEXT    NOT NULL DEFAULT '',
    request_id  INTEGER REFERENCES requests(id) ON DELETE SET NULL,
    form_id     TEXT    UNIQUE,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL,
    deleted_at  TEXT
  );
  CREATE INDEX periods_arrival ON periods(arrival);
  CREATE INDEX periods_departure ON periods(departure);

  CREATE TABLE login_tokens (
    id         INTEGER PRIMARY KEY,
    token_hash TEXT    NOT NULL UNIQUE,
    code_hash  TEXT    NOT NULL,
    email      TEXT    NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT    NOT NULL,
    used_at    TEXT
  );

  CREATE TABLE sessions (
    session_hash TEXT PRIMARY KEY,
    email        TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    expires_at   TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );

  CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

/** Opent (en maakt zo nodig) de database en brengt het schema op peil. */
function open(file) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = DELETE");
  db.exec("PRAGMA synchronous = FULL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  return db;
}

function migrate(db) {
  const current = db.prepare("PRAGMA user_version").get().user_version;
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}

/** "ok" of de foutmelding van SQLite's integriteitscontrole. */
function quickCheck(db) {
  const rows = db.prepare("PRAGMA quick_check").all();
  return rows.map((r) => r.quick_check).join("; ");
}

module.exports = { open, migrate, quickCheck, MIGRATIONS };
