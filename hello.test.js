const assert = require("node:assert/strict");
const test = require("node:test");
const { hello } = require("./hello");

test('hello("Alice") returns "Hello, Alice!"', () => {
  assert.equal(hello("Alice"), "Hello, Alice!");
});

test('hello("") returns "Hello, !"', () => {
  assert.equal(hello(""), "Hello, !");
});
