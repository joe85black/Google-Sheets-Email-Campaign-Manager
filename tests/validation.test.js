'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGs } = require('./helpers');

const Validation = loadGs(['Config.gs', 'Validation.gs'])('Validation');

test('isValidEmail accepts ordinary addresses', () => {
  for (const email of ['jane@example.org', 'first.last+tag@sub.example.co.uk', "o'brien@example.io"]) {
    assert.equal(Validation.isValidEmail(email), true, email);
  }
});

test('isValidEmail rejects anything that could expand into several recipients', () => {
  for (const email of [
    'a@x.com,b@y.com',
    'a@x.com;b@y.com',
    'a@x.com b@y.com',
    'Jane <jane@example.org>',
    'no-at-sign.example.org',
    'jane@localhost',
    'jane@-example.org',
    '',
  ]) {
    assert.equal(Validation.isValidEmail(email), false, email);
  }
});

test('isValidEmail rejects non-strings and overlong addresses', () => {
  assert.equal(Validation.isValidEmail(null), false);
  assert.equal(Validation.isValidEmail(42), false);
  assert.equal(Validation.isValidEmail(`${'a'.repeat(250)}@x.io`), false);
});

test('normalizeEmail trims and tolerates empty cells', () => {
  assert.equal(Validation.normalizeEmail('  jane@example.org \n'), 'jane@example.org');
  assert.equal(Validation.normalizeEmail(null), '');
  assert.equal(Validation.normalizeEmail(undefined), '');
});

test('cleanText strips CR/LF and control characters to block header injection', () => {
  assert.equal(Validation.cleanText('Jane\r\nBcc: evil@x.com', 100), 'Jane Bcc: evil@x.com');
  assert.equal(Validation.cleanText('\u0000Jane\u0007\u007F', 100), 'Jane');
  assert.equal(Validation.cleanText('  many    spaces  ', 100), 'many spaces');
});

test('cleanText caps length', () => {
  assert.equal(Validation.cleanText('abcdef', 3), 'abc');
});

test('escapeHtml encodes every HTML-significant character', () => {
  assert.equal(
    Validation.escapeHtml(`<a href="x" onclick='y'>&</a>`),
    '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
  );
});

test('isValidDisplayName allows normal names', () => {
  assert.equal(Validation.isValidDisplayName('Jane Doe - Acme Co.'), true);
});

test('isValidDisplayName rejects spoofing characters, empty and overlong names', () => {
  for (const name of ['Jane <ceo@acme.com>', 'support@bank.com', 'Say "hi"', 'back\\slash', '']) {
    assert.equal(Validation.isValidDisplayName(name), false, name);
  }
  assert.equal(Validation.isValidDisplayName('x'.repeat(81)), false);
});
