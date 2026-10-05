'use strict';

const { createServer } = require('./server');

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

const server = createServer();

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

module.exports = server;
