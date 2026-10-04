const test = require("node:test");
const assert = require("node:assert/strict");
const hello = require("./hello");

test("hello returns a greeting for a plain name", () => {
  assert.equal(hello("World"), "Hello, World!");
});

test("hello handles empty input", () => {
  assert.equal(hello(""), "Hello, !");
});
