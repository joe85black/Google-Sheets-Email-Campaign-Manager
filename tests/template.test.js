'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGs } = require('./helpers');

const Template = loadGs(['Config.gs', 'Validation.gs', 'Template.gs'])('Template');

const template = {
  subject: '{{first_name}}, your update',
  plainBody: 'Hi [name],\nThanks, {{ FIRST_NAME }}.',
  htmlBody: '<p>Hi {{first_name}},</p><p>Thanks, [ Name ].</p>',
};

test('render fills every placeholder style, case-insensitively', () => {
  const out = Template.render(template, 'Jane');
  assert.equal(out.subject, 'Jane, your update');
  assert.equal(out.plainBody, 'Hi Jane,\nThanks, Jane.');
  assert.equal(out.htmlBody, '<p>Hi Jane,</p><p>Thanks, Jane.</p>');
});

test('render falls back when the first name is blank', () => {
  const out = Template.render(template, '');
  assert.equal(out.subject, 'there, your update');
  assert.equal(out.htmlBody, '<p>Hi there,</p><p>Thanks, there.</p>');
});

test('render HTML-escapes names in the HTML body only', () => {
  const out = Template.render(template, '<b>Jo</b>');
  assert.equal(out.htmlBody, '<p>Hi &lt;b&gt;Jo&lt;/b&gt;,</p><p>Thanks, &lt;b&gt;Jo&lt;/b&gt;.</p>');
  assert.equal(out.plainBody, 'Hi <b>Jo</b>,\nThanks, <b>Jo</b>.');
});

test('render does not interpret $-replacement patterns in names', () => {
  const out = Template.render(template, "$& $' $1");
  assert.equal(out.subject, "$& $' $1, your update");
});

test('render leaves text without placeholders unchanged', () => {
  const plain = { subject: 'Hello', plainBody: 'Body', htmlBody: '<p>Body</p>' };
  const out = Template.render(plain, 'Jane');
  assert.equal(out.subject, 'Hello');
  assert.equal(out.plainBody, 'Body');
  assert.equal(out.htmlBody, '<p>Body</p>');
});
