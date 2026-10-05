'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const net = require('node:net');

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

test('unknown routes return 404 with plain text body', async () => {
  const res = await fetch(`${baseUrl()}/nope`);

  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') ?? '', /text\/plain/);
  assert.equal(await res.text(), 'Not Found');
});

test('non-GET requests to /ping return 404', async () => {
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const res = await fetch(`${baseUrl()}/ping`, { method });

    assert.equal(res.status, 404, `${method} /ping should be 404`);
  }
});

test('handles requests without a Host header (HTTP/1.0 style)', async () => {
  // fetch always sends a Host header, so use a raw socket to exercise
  // the `req.headers.host ?? 'localhost'` fallback in server.js.
  const raw = await new Promise((resolve, reject) => {
    const socket = net.connect(server.address().port, '127.0.0.1');
    let data = '';

    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      data += chunk;
    });
    socket.on('end', () => resolve(data));
    socket.on('error', reject);

    socket.end('GET /ping HTTP/1.0\r\n\r\n');
  });

  assert.match(raw, /^HTTP\/1\.1 200/);
  assert.ok(raw.endsWith('ok'));
});
