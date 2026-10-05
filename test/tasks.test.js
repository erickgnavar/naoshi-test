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

async function createTask(title) {
  const res = await fetch(`${baseUrl()}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  assert.equal(res.status, 201);
  return res.json();
}

test('POST /tasks creates a task with defaults', async () => {
  const created = await createTask('write tests');

  assert.ok(Number.isInteger(created.id));
  assert.equal(created.title, 'write tests');
  assert.equal(created.done, false);
  assert.ok(typeof created.createdAt === 'string');
});

test('POST /tasks trims surrounding whitespace from the title', async () => {
  const created = await createTask('  padded title  ');

  assert.equal(created.title, 'padded title');
});

test('POST /tasks rejects missing, empty, or non-string titles', async () => {
  for (const body of [{}, { title: '' }, { title: '   ' }, { title: 42 }, { title: null }]) {
    const res = await fetch(`${baseUrl()}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') ?? '', /text\/plain/);
  }
});

test('POST /tasks rejects malformed JSON', async () => {
  const res = await fetch(`${baseUrl()}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });

  assert.equal(res.status, 400);
  assert.match(res.headers.get('content-type') ?? '', /text\/plain/);
});

test('GET /tasks lists created tasks', async () => {
  await createTask('first');
  await createTask('second');

  const res = await fetch(`${baseUrl()}/tasks`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);

  const body = await res.json();
  assert.ok(Array.isArray(body.items));
  assert.ok(body.items.some((t) => t.title === 'first'));
  assert.ok(body.items.some((t) => t.title === 'second'));
  assert.equal(body.total, body.items.length);
  assert.equal(body.offset, 0);
  assert.ok(body.limit > 0);
});

test('GET /tasks paginates with offset and limit', async () => {
  // Capture existing state, then seed a known suffix of pages.
  const before = await (await fetch(`${baseUrl()}/tasks?limit=100`)).json();
  const headTitles = before.items.slice(0, 2).map((t) => t.title);
  for (let i = 1; i <= 5; i++) {
    await createTask(`page-item-${i}`);
  }
  const expectedTotal = before.total + 5;

  const page1 = await (await fetch(`${baseUrl()}/tasks?offset=0&limit=2`)).json();
  assert.equal(page1.items.length, 2);
  assert.equal(page1.offset, 0);
  assert.equal(page1.limit, 2);
  assert.equal(page1.total, expectedTotal);
  assert.deepEqual(page1.items.map((t) => t.title), headTitles);

  // Seeded items start right after the pre-existing tasks.
  const page2 = await (await fetch(`${baseUrl()}/tasks?offset=${before.total}&limit=2`)).json();
  assert.equal(page2.items.length, 2);
  assert.equal(page2.items[0].title, 'page-item-1');
  assert.equal(page2.items[1].title, 'page-item-2');

  // Pages do not overlap.
  const page1Ids = new Set(page1.items.map((t) => t.id));
  for (const task of page2.items) {
    assert.ok(!page1Ids.has(task.id));
  }

  // Offset beyond the collection returns an empty page with total intact.
  const far = await (await fetch(`${baseUrl()}/tasks?offset=9999&limit=2`)).json();
  assert.deepEqual(far.items, []);
  assert.equal(far.total, expectedTotal);
  assert.equal(far.offset, 9999);
});

test('GET /tasks caps limit at 100 and clamps short final pages', async () => {
  const capped = await (await fetch(`${baseUrl()}/tasks?limit=5000`)).json();
  assert.equal(capped.limit, 100);

  const tail = await (await fetch(`${baseUrl()}/tasks?offset=${capped.total - 1}&limit=10`)).json();
  assert.equal(tail.items.length, 1);
});

test('GET /tasks rejects invalid pagination parameters', async () => {
  for (const query of ['?offset=-1', '?offset=abc', '?limit=-5', '?limit=1.5', '?limit=none']) {
    const res = await fetch(`${baseUrl()}/tasks${query}`);
    assert.equal(res.status, 400, `GET /tasks${query} should be 400`);
    assert.match(res.headers.get('content-type') ?? '', /text\/plain/);
  }
});

test('non-GET requests to /tasks listing return 404', async () => {
  for (const method of ['PUT', 'DELETE']) {
    const res = await fetch(`${baseUrl()}/tasks`, { method });
    assert.equal(res.status, 404, `${method} /tasks should be 404`);
  }
});
