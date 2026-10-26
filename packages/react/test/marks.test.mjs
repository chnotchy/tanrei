// The marks of a wrapper (`src/marks.ts`, read from the build): a boolean mark is an attribute that is present or
// absent, in every React.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as React from 'react';
import { marks, withMarks, writeAttributes } from '../dist/marks.js';

test('marks(): true becomes the empty string, anything false is taken out, other props are untouched', () => {
  assert.deepEqual(marks({ confirming: true, dismissive: false, variant: 'tonal' }, ['confirming', 'dismissive']), { confirming: '', variant: 'tonal' });
  assert.deepEqual(marks({ confirming: undefined, slot: 'actions' }, ['confirming', 'dismissive']), { slot: 'actions' });
});

test('marks(): props that carry no mark are handed on as they are', () => {
  const props = { variant: 'filled' };
  assert.equal(marks(props, ['confirming', 'dismissive']), props);
});

test('withMarks(): renders the wrapper it was given, with the marks as attributes and the ref passed on', () => {
  const Inner = React.forwardRef(() => null);
  Inner.displayName = 'Inner';
  const Outer = withMarks(['confirming', 'dismissive'])(Inner);
  assert.equal(Outer.displayName, 'Inner');
  const ref = React.createRef();
  // A forwardRef component is its render function: what it returns is the element React would render.
  const element = Outer.render({ variant: 'tonal', confirming: true, dismissive: false }, ref);
  assert.equal(element.type, Inner);
  const { ref: passed = element.ref, ...props } = element.props;
  assert.equal(passed, ref);
  assert.deepEqual(props, { variant: 'tonal', confirming: '' });
});

/**
 * Renders a generated wrapper as it renders in a browser: where there is no document it renders for a server instead
 * (src/server.ts; ssr.test.mjs), and this file is about the client's wrapper. Its render touches no document.
 */
function inBrowser(render) {
  globalThis.document = {};
  try {
    return render();
  } finally {
    delete globalThis.document;
  }
}

test('the generated Button carries the marks, and a wrapper without marks is the element’s wrapper itself', async () => {
  const { Button, ButtonGroup } = await import('../dist/entries/generated/index.js');
  const element = inBrowser(() => Button.render({ confirming: false, dismissive: true, variant: 'text' }, null));
  const { ref: _ref, ...props } = element.props;
  assert.deepEqual(props, { dismissive: '', variant: 'text' });
  assert.equal(element.type.displayName, 'TanreiButton');
  assert.equal(ButtonGroup.displayName, 'TanreiButtonGroup');
});

/** What `writeAttributes` needs of an element. */
const element = () => {
  const attributes = new Map();
  return { attributes, setAttribute: (name, value) => attributes.set(name, value), removeAttribute: (name) => attributes.delete(name) };
};

test('writeAttributes(): a value is written as its text; nothing, null and false take the attribute away', () => {
  const el = element();
  writeAttributes(el, { form: 'checkout', variant: 'text' }, ['form']);
  assert.deepEqual([...el.attributes], [['form', 'checkout']]);
  for (const props of [{}, { form: null }, { form: undefined }, { form: false }]) {
    el.setAttribute('form', 'checkout');
    writeAttributes(el, props, ['form']);
    assert.deepEqual([...el.attributes], [], JSON.stringify(props));
  }
});

test('withMarks(): an attribute that has the name of a read-only property is kept out of the props and written on the element when it is attached, at every render; the ref is passed on', () => {
  const Inner = React.forwardRef(() => null);
  const Outer = withMarks(['confirming'], ['form'])(Inner);
  const ref = React.createRef();
  const el = element();
  const first = Outer.render({ variant: 'tonal', confirming: true, form: 'checkout' }, ref);
  const { ref: attach = first.ref, ...props } = first.props;
  assert.deepEqual(props, { variant: 'tonal', confirming: '' }, 'no prop named form reaches the element’s wrapper');
  attach(el);
  assert.equal(ref.current, el);
  assert.deepEqual([...el.attributes], [['form', 'checkout']]);
  // The prop taken away: the attribute goes with the next render.
  const second = Outer.render({ variant: 'tonal' }, ref);
  (second.props.ref ?? second.ref)(el);
  assert.deepEqual([...el.attributes], []);
  // A function ref is called with the element, and with null when it is detached.
  const seen = [];
  const third = Outer.render({ form: 'checkout' }, (node) => seen.push(node));
  (third.props.ref ?? third.ref)(el);
  (third.props.ref ?? third.ref)(null);
  assert.deepEqual(seen, [el, null]);
});

test('the generated Button writes form as an attribute: its element’s form property has only a getter', async () => {
  const { Button } = await import('../dist/entries/generated/index.js');
  const rendered = inBrowser(() => Button.render({ type: 'submit', form: 'checkout', name: 'intent', value: 'pay' }, null));
  const { ref: attach = rendered.ref, ...props } = rendered.props;
  assert.deepEqual(props, { type: 'submit', name: 'intent', value: 'pay' });
  const el = element();
  attach(el);
  assert.deepEqual([...el.attributes], [['form', 'checkout']]);
});

test('every form-associated element of the manifest has a wrapper that writes form as an attribute and hands no prop of that name on', async () => {
  const fs = await import('node:fs');
  const manifest = JSON.parse(fs.readFileSync(new URL('../../web/custom-elements.json', import.meta.url), 'utf8'));
  const tags = manifest.modules
    .flatMap((module) => module.declarations ?? [])
    .filter((declaration) => declaration.tagName && (declaration.members ?? []).some((member) => member.name === 'formAssociated' && member.static))
    .map((declaration) => declaration.tagName);
  // The list is the manifest's: an element that becomes form-associated is held here without anyone adding it.
  assert.deepEqual(
    tags.sort(),
    ['button', 'chat-composer', 'checkbox', 'checkbox-group', 'chip-field', 'color-field', 'color-input', 'combobox', 'combobox-field', 'embedded-text-input', 'file-upload', 'number-field', 'number-input', 'one-time-code-field', 'one-time-code-input', 'radio-button', 'radio-group', 'search', 'select', 'select-field', 'slider', 'slider-field', 'switch', 'text-field', 'text-input'].map((name) => `tanrei-${name}`),
  );
  const wrappers = await import('../dist/entries/generated/all.js');
  for (const tag of tags) {
    const name = tag
      .replace(/^tanrei-/, '')
      .split('-')
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join('');
    const Wrapper = wrappers[name];
    assert.ok(Wrapper, `${name} is exported`);
    const rendered = inBrowser(() => Wrapper.render({ form: 'checkout', name: 'field' }, null));
    const { ref: attach = rendered.ref, ...props } = rendered.props;
    assert.deepEqual(props, { name: 'field' }, `${name}: no prop named form reaches the element`);
    const el = element();
    attach(el);
    assert.deepEqual([...el.attributes], [['form', 'checkout']], `${name}: the attribute`);
    // Taken away again when the prop is.
    const again = inBrowser(() => Wrapper.render({ name: 'field' }, null));
    (again.props.ref ?? again.ref)(el);
    assert.deepEqual([...el.attributes], [], `${name}: no form, no attribute`);
  }
});
