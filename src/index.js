'use strict';

const { createDb } = require('./db');
const { createServer } = require('./server');

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);
// Set SQLITE_PATH to choose the database file; defaults to ./data.sqlite.
const db = createDb(process.env.SQLITE_PATH ? { path: process.env.SQLITE_PATH } : { path: 'data.sqlite' });

const server = createServer({ db });

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}

module.exports = server;
