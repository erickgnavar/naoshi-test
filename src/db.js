'use strict';

const { DatabaseSync } = require('node:sqlite');

/**
 * Create and initialize the SQLite database.
 *
 * Uses Node's built-in `node:sqlite` module (Node >= 22.5), so no external
 * native dependency is required. When no path is given, an in-memory
 * database is used.
 *
 * @param {{ path?: string }} [options]
 * @returns {import('node:sqlite').DatabaseSync}
 */
function createDb(options = {}) {
  const path = options.path ?? process.env.SQLITE_PATH ?? ':memory:';

  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  return db;
}

module.exports = { createDb };
