'use strict';

const http = require('node:http');

/**
 * Create the application server.
 *
 * Routes:
 *   GET /ping -> 200 "ok"
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

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  });

  return server;
}

module.exports = { createServer };
