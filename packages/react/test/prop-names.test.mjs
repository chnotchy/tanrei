// A wrapper's props are its element's properties (`@lit/react`), and the marks it types are its element's attributes
// (scripts/generate.js), so what a product writes in React is what it writes in HTML. A boolean prop is spelt as its
// attribute — the attribute's name in camelCase, or the DOM's own spelling of an HTML attribute (`readOnly` for
// `readonly`) — never as its inverse: a boolean that switches something off is named for what it does and is false by
// default, as an HTML boolean attribute is (`flush`, `noHandle`), not `inset` or `handle` set to false. Read from the
// elements' manifest the generator reads, so that a new property cannot bring a second name back.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const manifest = JSON.parse(fs.readFileSync(new URL('../../web/custom-elements.json', import.meta.url), 'utf8'));
const camel = (name) => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
const elements = manifest.modules.flatMap((m) => m.declarations ?? []).filter((d) => d.customElement && d.tagName);
const booleans = elements.flatMap((d) =>
  (d.members ?? [])
    .filter((m) => m.kind === 'field' && !m.static && m.attribute && m.privacy !== 'private' && m.privacy !== 'protected' && m.type?.text === 'boolean')
    .map((m) => ({ tag: d.tagName, prop: m.name, attribute: m.attribute, initial: m.default })),
);

test('every boolean prop of every wrapper is spelt as its web attribute', () => {
  assert.ok(booleans.length > 300, `the manifest lists ${booleans.length} boolean properties with an attribute`);
  const differ = booleans.filter(({ prop, attribute }) => prop !== camel(attribute) && prop.toLowerCase() !== attribute);
  assert.deepEqual(differ.map(({ tag, prop, attribute }) => `<${tag}> ${prop}: ${attribute}`), []);
});

test('a boolean prop whose name says it switches something off is false by default', () => {
  const on = booleans.filter(({ prop, initial }) => /^(no|not)[A-Z]/.test(prop) && initial !== 'false');
  assert.deepEqual(on.map(({ tag, prop, initial }) => `<${tag}> ${prop} = ${initial}`), []);
});

test('the props that used to be the inverse of their attribute are spelt as the attribute', () => {
  const spelt = new Set(booleans.map(({ tag, prop }) => `${tag} ${prop}`));
  for (const [tag, props] of Object.entries({
    'tanrei-card': ['flush'],
    'tanrei-figure': ['flush'],
    'tanrei-bottom-sheet': ['noHandle', 'flush'],
    'tanrei-popover': ['noInset'],
    'tanrei-carousel': ['fixedWidth', 'freeScroll', 'noPlaybackControl'],
    'tanrei-chip': ['notRemovable'],
    'tanrei-combobox': ['noWrap'],
    'tanrei-combobox-field': ['noWrap'],
    'tanrei-search': ['noWrap'],
    'tanrei-main-action-button': ['collapsed'],
    'tanrei-modal-layer': ['noScrim'],
    'tanrei-side-sheet': ['notClosable'],
    'tanrei-tooltip': ['noDescribe'],
  })) {
    for (const prop of props) assert.ok(spelt.has(`${tag} ${prop}`), `<${tag}> has the boolean prop ${prop}`);
  }
});
