'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const { createServer } = require('../src/server');

// Start a fresh server on an ephemeral port for each test file run.
const server = createServer();

test.before(async () => {
  server.listen(0);
  await once(server, 'listening');
});

test.after(() => {
  server.close();
});

function baseUrl() {
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test('GET /ping responds 200 with body "ok"', async () => {
  const res = await fetch(`${baseUrl()}/ping`);

  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'ok');
});

test('GET /ping returns text/plain content type', async () => {
  const res = await fetch(`${baseUrl()}/ping`);

  assert.match(res.headers.get('content-type') ?? '', /text\/plain/);
});

test('GET /ping responds ok repeatedly (no state leaks)', async () => {
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${baseUrl()}/ping`);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), 'ok');
  }
});

test('unknown routes still return 404', async () => {
  const res = await fetch(`${baseUrl()}/nope`);

  assert.equal(res.status, 404);
});
