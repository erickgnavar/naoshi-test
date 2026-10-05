'use strict';

const http = require('node:http');

const { TodoStore, handleTodos } = require('./todos');

/**
 * Create the application server.
 *
 * Routes:
 *   GET /ping -> 200 "ok"
 *   GET /time -> 200 JSON with the current server time
 *   GET    /todos      -> 200 JSON array of all todos
 *   POST   /todos      -> 201 JSON of the created todo
 *   GET    /todos/:id  -> 200 JSON of the todo, or 404
 *   PUT    /todos/:id  -> 200 JSON of the updated todo, or 404
 *   DELETE /todos/:id  -> 204, or 404
 *
 * @param {import('./todos').TodoStore} [todoStore] Injectable store (mainly for tests).
 * @returns {http.Server}
 */
function createServer(todoStore = new TodoStore()) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    if (await handleTodos(todoStore, req, res, url)) {
      return;
    }

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
