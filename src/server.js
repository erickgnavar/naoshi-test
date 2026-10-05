'use strict';

const http = require('node:http');
const { createDb } = require('./db');

/**
 * Read and parse a JSON request body.
 *
 * @param {http.IncomingMessage} req
 * @returns {Promise<unknown>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw === '') {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Create the application server.
 *
 * Routes:
 *   GET /ping         -> 200 "ok"
 *   GET /time         -> 200 JSON with the current server time
 *   GET /notes        -> 200 JSON array of notes (SQLite)
 *   POST /notes       -> 201 JSON created note (SQLite)
 *   GET /notes/:id    -> 200 JSON note (SQLite)
 *   DELETE /notes/:id -> 204 empty response (SQLite)
 *
 * @param {{ db?: import('node:sqlite').DatabaseSync }} [options]
 * @returns {http.Server}
 */
function createServer(options = {}) {
  const db = options.db ?? createDb();

  const listNotes = db.prepare(
    'SELECT id, text, created_at AS createdAt FROM notes ORDER BY id',
  );
  const getNote = db.prepare(
    'SELECT id, text, created_at AS createdAt FROM notes WHERE id = ?',
  );
  const insertNote = db.prepare(
    'INSERT INTO notes (text, created_at) VALUES (?, ?)',
  );
  const deleteNote = db.prepare('DELETE FROM notes WHERE id = ?');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/ping') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ok');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/time') {
      const now = new Date();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          iso: now.toISOString(),
          epochMs: now.getTime(),
        }),
      );
      return;
    }

    const noteMatch = /^\/notes(?:\/(\d+))?$/.exec(url.pathname);

    if (noteMatch && req.method === 'GET' && noteMatch[1] === undefined) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(listNotes.all()));
      return;
    }

    if (noteMatch && req.method === 'POST' && noteMatch[1] === undefined) {
      try {
        const body = await readJsonBody(req);
        const text = body?.text;
        if (typeof text !== 'string' || text.trim() === '') {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Field "text" (non-empty string) is required');
          return;
        }
        const createdAt = new Date().toISOString();
        const { lastInsertRowid } = insertNote.run(text, createdAt);
        const note = getNote.get(lastInsertRowid);
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(note));
      } catch (err) {
        res.writeHead(err.message === 'invalid JSON body' ? 400 : 500, {
          'Content-Type': 'text/plain; charset=utf-8',
        });
        res.end(err.message === 'invalid JSON body' ? 'Invalid JSON body' : 'Internal Server Error');
      }
      return;
    }

    if (noteMatch && noteMatch[1] !== undefined) {
      const id = Number(noteMatch[1]);

      if (req.method === 'GET') {
        const note = getNote.get(id);
        if (!note) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(note));
        return;
      }

      if (req.method === 'DELETE') {
        const { changes } = deleteNote.run(id);
        if (changes === 0) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }
        res.writeHead(204);
        res.end();
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  return server;
}

module.exports = { createServer, readJsonBody };

module.exports = { createServer };
