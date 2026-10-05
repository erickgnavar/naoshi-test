'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const { createServer } = require('../src/server');
const { TodoStore } = require('../src/todos');

const server = createServer(new TodoStore());

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

test('GET /todos starts with an empty list', async () => {
  const res = await fetch(`${baseUrl()}/todos`);

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await res.json(), []);
});

test('POST /todos creates a todo and returns 201', async () => {
  const res = await fetch(`${baseUrl()}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'buy milk' }),
  });

  assert.equal(res.status, 201);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);

  const todo = await res.json();
  assert.ok(typeof todo.id === 'string');
  assert.equal(todo.title, 'buy milk');
  assert.equal(todo.done, false);
  assert.ok(typeof todo.createdAt === 'string');
  assert.equal(todo.createdAt, todo.updatedAt);
});

test('POST /todos with invalid JSON returns 400', async () => {
  const res = await fetch(`${baseUrl()}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json',
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /valid JSON/);
});

test('POST /todos with empty title returns 400', async () => {
  for (const title of ['', '   ']) {
    const res = await fetch(`${baseUrl()}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /title/i);
  }
});

test('POST /todos with missing title returns 400', async () => {
  const res = await fetch(`${baseUrl()}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: false }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /title/);
});

test('GET /todos lists created todos', async () => {
  await fetch(`${baseUrl()}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'walk dog' }),
  });

  const res = await fetch(`${baseUrl()}/todos`);
  const todos = await res.json();

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(todos));
  assert.deepEqual(
    todos.map((t) => t.title),
    ['buy milk', 'walk dog'],
  );
});

test('GET /todos/:id returns a single todo', async () => {
  const created = await (
    await fetch(`${baseUrl()}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'read book' }),
    })
  ).json();

  const res = await fetch(`${baseUrl()}/todos/${created.id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), created);
});

test('GET /todos/:id with unknown id returns 404', async () => {
  const res = await fetch(`${baseUrl()}/todos/999999`);

  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  const body = await res.json();
  assert.match(body.error, /not found/i);
});

test('PUT /todos/:id updates title and done', async () => {
  const created = await (
    await fetch(`${baseUrl()}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'original' }),
    })
  ).json();

  const res = await fetch(`${baseUrl()}/todos/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'updated', done: true }),
  });

  assert.equal(res.status, 200);
  const todo = await res.json();
  assert.equal(todo.id, created.id);
  assert.equal(todo.title, 'updated');
  assert.equal(todo.done, true);
  assert.equal(todo.createdAt, created.createdAt);
  assert.ok(todo.updatedAt >= created.updatedAt);
});

test('PUT /todos/:id with partial body only updates provided fields', async () => {
  const created = await (
    await fetch(`${baseUrl()}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'partial' }),
    })
  ).json();

  const res = await fetch(`${baseUrl()}/todos/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: true }),
  });

  assert.equal(res.status, 200);
  const todo = await res.json();
  assert.equal(todo.title, 'partial');
  assert.equal(todo.done, true);
});

test('PUT /todos/:id with unknown id returns 404', async () => {
  const res = await fetch(`${baseUrl()}/todos/999999`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'nope' }),
  });

  assert.equal(res.status, 404);
});

test('PUT /todos/:id with invalid body returns 400', async () => {
  const created = await (
    await fetch(`${baseUrl()}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'invalid body test' }),
    })
  ).json();

  const res = await fetch(`${baseUrl()}/todos/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: 'yes' }),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /done/i);
});

test('DELETE /todos/:id returns 204 and removes the todo', async () => {
  const created = await (
    await fetch(`${baseUrl()}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'delete me' }),
    })
  ).json();

  const res = await fetch(`${baseUrl()}/todos/${created.id}`, { method: 'DELETE' });
  assert.equal(res.status, 204);
  assert.equal(await res.text(), '');

  const after = await fetch(`${baseUrl()}/todos/${created.id}`);
  assert.equal(after.status, 404);
});

test('DELETE /todos/:id with unknown id returns 404', async () => {
  const res = await fetch(`${baseUrl()}/todos/999999`, { method: 'DELETE' });
  assert.equal(res.status, 404);
});

test('unsupported methods on /todos return 405', async () => {
  for (const method of ['PUT', 'DELETE', 'PATCH']) {
    const res = await fetch(`${baseUrl()}/todos`, { method });
    assert.equal(res.status, 405, `${method} /todos should be 405`);
  }
});

test('todos are isolated per server instance', async () => {
  const other = createServer(new TodoStore());
  await new Promise((resolve) => other.listen(0, resolve));

  try {
    const port = other.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/todos`);
    assert.deepEqual(await res.json(), []);
  } finally {
    await new Promise((resolve) => other.close(resolve));
  }
});
