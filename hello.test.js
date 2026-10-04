const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hello } = require('./hello');

test('hello returns greeting for plain names', () => {
  assert.equal(hello('World'), 'Hello, World!');
  assert.equal(hello('Alice'), 'Hello, Alice!');
});

test('hello handles empty input', () => {
  assert.equal(hello(''), 'Hello, !');
});
