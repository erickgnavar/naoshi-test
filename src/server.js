'use strict';

const http = require('node:http');

/**
 * Create the application server.
 *
 * Routes:
 *   GET /ping -> 200 "ok"
 *   GET /time -> 200 JSON with the current server time
 *   GET /roll -> 200 JSON with a dice roll (?sides=N, default 6)
 *
 * @returns {http.Server}
 */
function createServer() {
  const server = http.createServer((req, res) => {
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

    if (req.method === 'GET' && url.pathname === '/roll') {
      const sidesParam = url.searchParams.get('sides');
      let sides = 6;

      if (sidesParam !== null) {
        sides = Number(sidesParam);
        if (!Number.isInteger(sides) || sides < 1 || sides > 1000) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'sides must be an integer between 1 and 1000' }));
          return;
        }
      }

      const roll = 1 + Math.floor(Math.random() * sides);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ roll, sides }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  return server;
}

module.exports = { createServer };
