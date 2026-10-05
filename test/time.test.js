'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const { createServer } = require('../src/server');

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

test('GET /time responds 200 with JSON body', async () => {
  const before = Date.now();
  const res = await fetch(`${baseUrl()}/time`);
  const elapsed = Date.now() - before;

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);

  const body = await res.json();
  assert.ok(typeof body.iso === 'string');
  assert.ok(typeof body.epochMs === 'number');

  // Timestamps should reflect "now", allowing for request latency.
  assert.ok(body.epochMs >= before - elapsed - 1000);
  assert.ok(body.epochMs <= before + elapsed + 1000);

  // ISO string must round-trip to the same epoch time.
  assert.equal(new Date(body.iso).getTime(), body.epochMs);
});

test('unknown routes still return 404', async () => {
  const res = await fetch(`${baseUrl()}/nope`);

  assert.equal(res.status, 404);
});
