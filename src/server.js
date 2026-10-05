'use strict';

const http = require('node:http');

const DEFAULT_PAGE_LIMIT = 10;
const MAX_PAGE_LIMIT = 100;

/** In-memory task store. Tasks are never removed, so offset pagination is stable. */
const tasks = [];
let nextTaskId = 1;

/**
 * Read the request body as a JSON object.
 *
 * @param {http.IncomingMessage} req
 * @returns {Promise<object>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = raw.length === 0 ? {} : JSON.parse(raw);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Parse a non-negative integer query parameter.
 *
 * @param {URLSearchParams} searchParams
 * @param {string} name
 * @param {number} fallback
 * @returns {number|null} Parsed value, fallback when absent, null when invalid.
 */
function parseNonNegativeInt(searchParams, name, fallback) {
  const raw = searchParams.get(name);
  if (raw === null || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) return null;
  return Number.parseInt(raw, 10);
}

/**
 * Create the application server.
 *
 * Routes:
 *   GET /ping   -> 200 "ok"
 *   GET /time   -> 200 JSON with the current server time
 *   POST /tasks -> 201 JSON with the created task
 *   GET /tasks  -> 200 JSON with a paginated task list (offset pagination)
 *
 * @returns {http.Server}
 */
function createServer() {
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

    if (req.method === 'POST' && url.pathname === '/tasks') {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Invalid JSON body');
        return;
      }

      const title = typeof body?.title === 'string' ? body.title.trim() : '';
      if (title.length === 0) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('A non-empty "title" string is required');
        return;
      }

      const task = {
        id: nextTaskId++,
        title,
        done: false,
        createdAt: new Date().toISOString(),
      };
      tasks.push(task);

      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(task));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/tasks') {
      const offset = parseNonNegativeInt(url.searchParams, 'offset', 0);
      const limit = parseNonNegativeInt(url.searchParams, 'limit', DEFAULT_PAGE_LIMIT);

      if (offset === null || limit === null) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('"offset" and "limit" must be non-negative integers');
        return;
      }

      const effectiveLimit = Math.min(limit, MAX_PAGE_LIMIT);
      const items = tasks.slice(offset, offset + effectiveLimit);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          items,
          total: tasks.length,
          offset,
          limit: effectiveLimit,
        }),
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  return server;
}

module.exports = { createServer };
