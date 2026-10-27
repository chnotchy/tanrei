// The wrappers rendered on a server (`renderToString`, under Node, where there is no document): the HTML carries each
// prop the element reads from an attribute, under the attribute's name — the label, the value, the states — so it is
// there before any script runs. Every wrapper and every such prop of a string, number or boolean type (ssr-cases.mjs);
// what the element reads each attribute as, in a browser, is browser/ssr.test.mjs.
//
//   pnpm --filter @tanrei/web build && pnpm --filter @tanrei/react build && pnpm --filter @tanrei/react test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import * as wrappers from '@tanrei/react/all';
import { TextField } from '@tanrei/react';
import { cases, elements } from './ssr-cases.mjs';

/** The attributes of the first tag `tag` in `html`, as React wrote them (`name="text"`). */
function attributesOf(html, tag) {
  const open = new RegExp(`<${tag}((?:\\s+[^\\s=>]+(?:="[^"]*")?)*)\\s*>`).exec(html);
  assert.ok(open, `no <${tag}> in ${html}`);
  const unescape = (text) => text.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return new Map([...open[1].matchAll(/\s+([^\s=>]+)(?:="([^"]*)")?/g)].map(([, name, text]) => [name, unescape(text ?? '')]));
}
const render = (wrapper, props) => renderToString(React.createElement(wrappers[wrapper], props));

test('<TextField label="Name"> renders label="Name", and its boolean and number props as their attributes', () => {
  const html = renderToString(React.createElement(TextField, { label: 'Name', value: 'Ada', supportingText: 'As on your passport', required: true, maxLength: 40, readOnly: false, className: 'wide', id: 'name' }));
  assert.equal(html, '<tanrei-text-field label="Name" value="Ada" supporting-text="As on your passport" required="" maxlength="40" class="wide" id="name"></tanrei-text-field>');
});

test('every wrapper is in the cases, and every case names a wrapper', () => {
  for (const { wrapper } of elements) assert.ok(wrappers[wrapper], `@tanrei/react/all has no ${wrapper}`);
  // Enough cases that the loop below cannot pass by covering nothing: each kind is there, many times over.
  for (const kind of ['string', 'number', 'boolean']) assert.ok(cases.filter((c) => c.kind === kind).length > 50, kind);
});

test('each string, number and boolean prop of every wrapper is written as its attribute', () => {
  const missing = [];
  for (const c of cases) {
    const attributes = attributesOf(render(c.wrapper, { [c.prop]: c.value }), c.tag);
    const text = attributes.get(c.attribute);
    // A boolean's text is the element's to choose (`""`, `"false"`): what the element reads it as is the browser test's.
    const expected = c.kind === 'boolean' ? text : String(c.value);
    if (text === undefined || text !== expected) missing.push(`${c.wrapper} ${c.prop}=${JSON.stringify(c.value)}: ${c.attribute}=${JSON.stringify(text)}`);
  }
  assert.deepEqual(missing, []);
});

test('a prop at its default writes no attribute: a false is never written as present, nor a true that is the default', () => {
  const written = [];
  for (const c of cases.filter((c) => c.kind === 'boolean' && (c.initial === 'true' || c.initial === 'false'))) {
    const initial = c.initial === 'true';
    const attributes = attributesOf(render(c.wrapper, { [c.prop]: initial }), c.tag);
    if (attributes.has(c.attribute)) written.push(`${c.wrapper} ${c.prop}=${initial}: ${c.attribute}=${JSON.stringify(attributes.get(c.attribute))}`);
  }
  assert.deepEqual(written, []);
});

test('what is not an attribute stays out of the HTML: handlers, objects, refs; React props pass as React writes them', () => {
  const html = renderToString(
    React.createElement(TextField, { label: 'Name', onChange: () => {}, disabledDates: ['2026-01-01'], ref: React.createRef(), 'aria-describedby': 'hint', style: { inlineSize: '20ch' } }, React.createElement('span', { slot: 'leading-icon' }, 'search')),
  );
  assert.equal(html, '<tanrei-text-field label="Name" aria-describedby="hint" style="inline-size:20ch"><span slot="leading-icon">search</span></tanrei-text-field>');
});
