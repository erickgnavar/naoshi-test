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

test('GET /roll responds 200 with JSON body using default sides', async () => {
  const res = await fetch(`${baseUrl()}/roll`);

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);

  const body = await res.json();
  assert.equal(body.sides, 6);
  assert.ok(Number.isInteger(body.roll));
  assert.ok(body.roll >= 1 && body.roll <= 6);
});

test('GET /roll?sides=N respects the requested number of sides', async () => {
  const res = await fetch(`${baseUrl()}/roll?sides=20`);

  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.sides, 20);
  assert.ok(body.roll >= 1 && body.roll <= 20);
});

test('GET /roll with invalid sides responds 400', async () => {
  for (const sides of ['0', '-3', 'abc', '2.5', '1001']) {
    const res = await fetch(`${baseUrl()}/roll?sides=${encodeURIComponent(sides)}`);
    assert.equal(res.status, 400, `expected 400 for sides=${sides}`);
    const body = await res.json();
    assert.ok(typeof body.error === 'string');
  }
});
