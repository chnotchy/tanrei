// No element has a member named like a React event prop (`on` and a capital letter) on its prototype chain. The React
// wrappers (`@lit/react` `createComponent`) set a prop on the element as a property whenever its name is in the
// element class's prototype (`k in elementClass.prototype`, which sees private and non-enumerable members too), so
// `<Button toggle onClick={…}>` would replace a method named `onClick` that the element's own template listens with,
// and the toggle would stop toggling. An internal handler is an ES private method (`#onClick`) or has a name that does
// not start with `on`; instance fields are not on the prototype and do not collide. Every registered element is
// looked at, through Lit's server shim, after the build (`dist/`), by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'custom-elements.json'), 'utf8'));
const tags = [...new Set(manifest.modules.flatMap((m) => (m.declarations ?? []).map((d) => d.tagName).filter(Boolean)))];

/** The names on `C.prototype` and its ancestors that a React wrapper would take for an element property and an event prop. */
function reactLookingMembers(C) {
  const names = new Set();
  for (let proto = C.prototype; proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const name of Object.getOwnPropertyNames(proto)) if (/^on[A-Z]/.test(name)) names.add(name);
  }
  return [...names];
}

test('no registered element has an on<Capital> member on its prototype chain', async () => {
  await import(path.join(root, 'dist/all.js'));
  assert.ok(tags.length > 100, `the manifest lists the elements (${tags.length})`);
  const found = [];
  for (const tag of tags) {
    const C = customElements.get(tag);
    assert.ok(C, `${tag} is registered by @tanrei/web/all`);
    const names = reactLookingMembers(C);
    if (names.length) found.push(`${tag}: ${names.join(', ')}`);
  }
  assert.deepEqual(found, [], 'rename these to #private methods, or to names that do not start with `on`');
});

test('the check sees a private-in-TypeScript method on an ancestor class', () => {
  class Base {
    onClick() {}
  }
  class Element extends Base {
    #onKeyDown() {}
    onlyLower() {}
  }
  assert.deepEqual(reactLookingMembers(Element), ['onClick']);
});
