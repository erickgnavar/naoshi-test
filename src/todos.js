'use strict';

/**
 * In-memory TODO store and route handlers for the /todos REST endpoints.
 *
 * Endpoints:
 *   GET    /todos        -> 200 JSON array of all todos
 *   POST   /todos        -> 201 JSON of the created todo
 *   GET    /todos/{id}   -> 200 JSON of the todo, or 404
 *   PUT    /todos/{id}   -> 200 JSON of the updated todo, or 404
 *   DELETE /todos/{id}   -> 204 empty body, or 404
 */

/** @typedef {{ id: string, title: string, done: boolean, createdAt: string, updatedAt: string }} Todo */

class TodoStore {
  constructor() {
    /** @type {Map<string, Todo>} */
    this.todos = new Map();
    this.nextId = 1;
  }

  /** @returns {Todo[]} */
  list() {
    return [...this.todos.values()];
  }

  /**
   * @param {string} id
   * @returns {Todo | undefined}
   */
  get(id) {
    return this.todos.get(id);
  }

  /**
   * @param {string} title
   * @returns {Todo}
   */
  create(title) {
    const now = new Date().toISOString();
    /** @type {Todo} */
    const todo = {
      id: String(this.nextId++),
      title,
      done: false,
      createdAt: now,
      updatedAt: now,
    };
    this.todos.set(todo.id, todo);
    return todo;
  }

  /**
   * @param {string} id
   * @param {{ title?: string, done?: boolean }} patch
   * @returns {Todo | undefined}
   */
  update(id, patch) {
    const todo = this.todos.get(id);
    if (!todo) return undefined;

    if (typeof patch.title === 'string') {
      todo.title = patch.title;
    }
    if (typeof patch.done === 'boolean') {
      todo.done = patch.done;
    }
    todo.updatedAt = new Date().toISOString();
    return todo;
  }

  /**
   * @param {string} id
   * @returns {boolean} true if the todo existed and was removed
   */
  remove(id) {
    return this.todos.delete(id);
  }
}

/**
 * Validate and extract fields from a JSON request body.
 *
 * @param {string} rawBody
 * @returns {{ ok: true, body: { title?: string, done?: boolean } } | { ok: false, error: string }}
 */
function parseTodoBody(rawBody) {
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: 'Request body must be valid JSON' };
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  const result = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim() === '') {
      return { ok: false, error: '"title" must be a non-empty string' };
    }
    result.title = body.title;
  }

  if (body.done !== undefined) {
    if (typeof body.done !== 'boolean') {
      return { ok: false, error: '"done" must be a boolean' };
    }
    result.done = body.done;
  }

  return { ok: true, body: result };
}

/**
 * Read the full request body as a string.
 *
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/**
 * Send a JSON response.
 *
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} payload
 */
function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

/**
 * Handle /todos requests.
 *
 * @param {TodoStore} store
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 * @returns {Promise<boolean>} true if the request was handled
 */
async function handleTodos(store, req, res, url) {
  if (!url.pathname.startsWith('/todos')) return false;

  const method = req.method ?? 'GET';
  const rest = url.pathname.slice('/todos'.length); // '' or '/{id}'

  // Collection routes: /todos
  if (rest === '' || rest === '/') {
    if (method === 'GET') {
      sendJson(res, 200, store.list());
      return true;
    }
    if (method === 'POST') {
      const parsed = parseTodoBody(await readBody(req));
      if (!parsed.ok) {
        sendJson(res, 400, { error: parsed.error });
        return true;
      }
      if (parsed.body.title === undefined) {
        sendJson(res, 400, { error: '"title" is required' });
        return true;
      }
      const todo = store.create(parsed.body.title);
      sendJson(res, 201, todo);
      return true;
    }
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return true;
  }

  // Item routes: /todos/{id}
  const id = decodeURIComponent(rest.slice(1));
  if (method === 'GET') {
    const todo = store.get(id);
    if (!todo) {
      sendJson(res, 404, { error: 'Todo not found' });
      return true;
    }
    sendJson(res, 200, todo);
    return true;
  }
  if (method === 'PUT' || method === 'PATCH') {
    if (!store.get(id)) {
      sendJson(res, 404, { error: 'Todo not found' });
      return true;
    }
    const parsed = parseTodoBody(await readBody(req));
    if (!parsed.ok) {
      sendJson(res, 400, { error: parsed.error });
      return true;
    }
    sendJson(res, 200, store.update(id, parsed.body));
    return true;
  }
  if (method === 'DELETE') {
    if (!store.remove(id)) {
      sendJson(res, 404, { error: 'Todo not found' });
      return true;
    }
    res.writeHead(204);
    res.end();
    return true;
  }

  sendJson(res, 405, { error: 'Method Not Allowed' });
  return true;
}

module.exports = { TodoStore, handleTodos };
