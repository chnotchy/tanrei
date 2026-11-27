// The wrappers rendered on a server (`renderToString`, under Node, where there is no document): the HTML carries each
// prop the element reads from an attribute, under the attribute's name — the label, the value, the states — so it is
// there before any script runs. Every wrapper and every such prop of a string, number or boolean type, and every list
// (ssr-cases.mjs); what the element reads each attribute as, in a browser, is browser/ssr.test.mjs.
//
//   pnpm --filter @tanrei/web build && pnpm --filter @tanrei/react build && pnpm --filter @tanrei/react test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import * as wrappers from '@tanrei/react/all';
import { TextField } from '@tanrei/react';
import { cases, elements, lists } from './ssr-cases.mjs';

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

test('<NavigationDrawer width={320}> renders width="320" and the width as --tanrei-navigation-drawer-width, beside the product’s own style, for the first frame (NVD-103)', () => {
  const html = renderToString(React.createElement(wrappers.NavigationDrawer, { label: 'Mail', width: 320, style: { blockSize: '100%' } }));
  const attributes = attributesOf(html, 'tanrei-navigation-drawer');
  assert.equal(attributes.get('width'), '320');
  assert.equal(attributes.get('style'), 'block-size:100%;--tanrei-navigation-drawer-width:320px');
  // Without a width there is nothing to write.
  assert.equal(attributesOf(render('NavigationDrawer', { label: 'Mail' }), 'tanrei-navigation-drawer').has('style'), false);
});

test('what is not an attribute stays out of the HTML: handlers, a list no attribute carries, refs; React props pass as React writes them', () => {
  const html = renderToString(
    React.createElement(
      wrappers.CheckboxGroup,
      { label: 'Notify me by', value: ['email'], onChange: () => {}, ref: React.createRef(), 'aria-describedby': 'hint', style: { inlineSize: '20ch' } },
      React.createElement('span', { slot: 'label-icon' }, 'mail'),
    ),
  );
  assert.equal(html, '<tanrei-checkbox-group label="Notify me by" aria-describedby="hint" style="inline-size:20ch"><span slot="label-icon">mail</span></tanrei-checkbox-group>');
});

test('<ChipField value={[…]}> and a multiple <Combobox values={[…]}> render their lists as the attributes their elements read', () => {
  const chips = attributesOf(render('ChipField', { label: 'To', value: ['ada@example.com', 'grace@example.com'] }), 'tanrei-chip-field');
  assert.equal(chips.get('value'), '["ada@example.com","grace@example.com"]');
  const cities = attributesOf(render('Combobox', { label: 'Cities', selection: 'multiple', values: ['tokyo', 'osaka'] }), 'tanrei-combobox');
  assert.equal(cities.get('values'), '["tokyo","osaka"]');
  // A list with a converter of its own is written as that converter writes it (`accept` as a comma-separated list).
  assert.equal(attributesOf(render('DropZone', { label: 'Files', accept: ['image/*', '.pdf'] }), 'tanrei-drop-zone').get('accept'), 'image/*,.pdf');
});

test('every list prop of every wrapper is written as its attribute, and a list at its default writes none', () => {
  assert.ok(lists.length > 25, 'the list props are found in the manifest');
  assert.deepEqual(lists.filter((c) => c.value === undefined).map((c) => `${c.tag} ${c.prop}`), [], 'each list prop has a value in ssr-cases.mjs');
  const missing = [];
  for (const c of lists) {
    const attributes = attributesOf(render(c.wrapper, { [c.prop]: c.value }), c.tag);
    if (!attributes.has(c.attribute)) missing.push(`${c.wrapper} ${c.prop}=${JSON.stringify(c.value)}`);
  }
  assert.deepEqual(missing, []);
  // An empty list is the default of every list but the chip field's value, whose default the manifest does not give.
  const written = [];
  for (const c of lists.filter((c) => !(c.tag === 'tanrei-chip-field' && c.prop === 'value') && !['filterShortcut', 'edges', 'handles', 'trigger'].includes(c.prop))) {
    const attributes = attributesOf(render(c.wrapper, { [c.prop]: [] }), c.tag);
    if (attributes.has(c.attribute)) written.push(`${c.wrapper} ${c.prop}=[]: ${c.attribute}=${JSON.stringify(attributes.get(c.attribute))}`);
  }
  assert.deepEqual(written, []);
  // A list whose default is not empty writes nothing at its default, and writes the empty list as the element reads it.
  assert.equal(attributesOf(render('ScrollArea', { edges: ['top', 'bottom'] }), 'tanrei-scroll-area').has('edges'), false);
  assert.equal(attributesOf(render('ScrollArea', { edges: [] }), 'tanrei-scroll-area').get('edges'), '');
});

test('a list the element would read back otherwise is not written: the client sets it once it mounts', () => {
  // The values of a combobox are strings: numbers would be read back as their texts, so nothing is written.
  assert.equal(attributesOf(render('Combobox', { label: 'Floors', selection: 'multiple', values: [1, 2] }), 'tanrei-combobox').has('values'), false);
  // Not a list at all.
  assert.equal(attributesOf(render('ChipField', { label: 'To', value: new Set(['a']) }), 'tanrei-chip-field').has('value'), false);
});
