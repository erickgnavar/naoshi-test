'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const { createDb } = require('../src/db');
const { createServer } = require('../src/server');

// Fresh in-memory database for each test run.
const server = createServer({ db: createDb() });

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

test('GET /notes responds 200 with an empty JSON array initially', async () => {
  const res = await fetch(`${baseUrl()}/notes`);

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await res.json(), []);
});

test('POST /notes creates a note and returns 201 with the stored row', async () => {
  const res = await fetch(`${baseUrl()}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'hello sqlite' }),
  });

  assert.equal(res.status, 201);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);

  const note = await res.json();
  assert.equal(note.text, 'hello sqlite');
  assert.equal(note.id, 1);
  assert.ok(typeof note.createdAt === 'string');
});

test('GET /notes/:id returns a previously created note', async () => {
  const created = await (
    await fetch(`${baseUrl()}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'fetch me' }),
    })
  ).json();

  const res = await fetch(`${baseUrl()}/notes/${created.id}`);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), created);
});

test('GET /notes/:id responds 404 for unknown ids', async () => {
  const res = await fetch(`${baseUrl()}/notes/999999`);

  assert.equal(res.status, 404);
});

test('POST /notes responds 400 when "text" is missing', async () => {
  const res = await fetch(`${baseUrl()}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nope: true }),
  });

  assert.equal(res.status, 400);
});

test('POST /notes responds 400 on invalid JSON', async () => {
  const res = await fetch(`${baseUrl()}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json',
  });

  assert.equal(res.status, 400);
});

test('DELETE /notes/:id removes the note and later GET returns 404', async () => {
  const created = await (
    await fetch(`${baseUrl()}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'to be deleted' }),
    })
  ).json();

  const del = await fetch(`${baseUrl()}/notes/${created.id}`, { method: 'DELETE' });
  assert.equal(del.status, 204);

  const get = await fetch(`${baseUrl()}/notes/${created.id}`);
  assert.equal(get.status, 404);
});

test('DELETE /notes/:id responds 404 for unknown ids', async () => {
  const res = await fetch(`${baseUrl()}/notes/999999`, { method: 'DELETE' });

  assert.equal(res.status, 404);
});

test('data persists across separate database handles on the same file', async () => {
  const { mkdtempSync } = require('node:fs');
  const { join } = require('node:path');
  const { tmpdir } = require('node:os');

  const file = join(mkdtempSync(join(tmpdir(), 'naoshi-')), 'test.sqlite');

  const dbA = createDb({ path: file });
  dbA.prepare('INSERT INTO notes (text, created_at) VALUES (?, ?)').run('persisted', new Date().toISOString());
  dbA.close();

  const dbB = createDb({ path: file });
  const rows = dbB.prepare('SELECT text FROM notes').all();
  dbB.close();

  assert.deepEqual(rows.map((r) => r.text), ['persisted']);
});
