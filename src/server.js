'use strict';

const http = require('node:http');

/**
 * Create the application server.
 *
 * Routes:
 *   GET /ping -> 200 "ok"
 *   GET /time -> 200 JSON with the current server time
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

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  return server;
}

module.exports = { createServer };
