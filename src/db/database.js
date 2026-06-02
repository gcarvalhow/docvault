// src/db/database.js
// SQLite via sql.js (puro JS, sem compilação nativa)
// Persiste em arquivo binário a cada write

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './data/docvault.db';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let _db = null;

function getDb() {
  if (!_db) throw new Error('DB não inicializado. Chame initDb() primeiro.');
  return _db;
}

function save() {
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run('PRAGMA foreign_keys = ON');
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('solicitante','analista','admin')),
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS documents (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      description  TEXT,
      category     TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pendente',
      owner_id     TEXT NOT NULL,
      analyst_id   TEXT,
      file_name    TEXT NOT NULL,
      file_mime    TEXT NOT NULL,
      comment      TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          TEXT PRIMARY KEY,
      user_id     TEXT,
      user_email  TEXT,
      action      TEXT NOT NULL,
      target_type TEXT,
      target_id   TEXT,
      detail      TEXT,
      ip          TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  save();
  return _db;
}

// Helpers que imitam better-sqlite3's API síncrona
const db = {
  get db() { return getDb(); },

  run(sql, params = []) {
    getDb().run(sql, params);
    save();
  },

  get(sql, params = []) {
    const stmt = getDb().prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  },

  all(sql, params = []) {
    const stmt = getDb().prepare(sql);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  },

  exec(sql) {
    getDb().run(sql);
    save();
  },

  initDb,
};

module.exports = db;
