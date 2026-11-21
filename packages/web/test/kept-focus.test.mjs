// A `focus()` that lands nowhere while the element, or what holds it, has an update to draw is kept until it has drawn
// (`TanreiElement`, src/primitives/element.ts). That is written once, in the base's `focus()`: an element says where its
// focus goes by overriding `delegateFocus()`, never `focus()` itself, so no element can lose the keeping by writing its
// own. Its own `blur()` gives a kept focus up: `super.blur()`, or `forgetKeptFocus()`. What a kept focus then does in
// the engines is held by `src/primitives/kept-focus.test.ts`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

const files = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : files(file);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [file] : [];
  });

/** Each `[protected ]override <name>(…) {…}` of the package: where it is and its body, to the closing brace at its own indent. */
function overrides(name) {
  const found = [];
  for (const file of files(src)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, at) => {
      const start = new RegExp(`^(\\s*)(?:protected |public )?override ${name}\\(.*\\{$`).exec(line);
      if (!start) return;
      const end = lines.findIndex((other, index) => index > at && other === `${start[1]}}`);
      assert.ok(end > at, `${path.relative(src, file)}:${at + 1}: the end of ${name}() is not found`);
      found.push({ where: `${path.relative(src, file).split(path.sep).join('/')}:${at + 1}`, body: lines.slice(at + 1, end).join('\n') });
    });
  }
  return found;
}

test('focus() is written once, in the base: an element overrides delegateFocus() instead', () => {
  assert.deepEqual(overrides('focus').map(({ where }) => where.replace(/:\d+$/, '')), ['primitives/element.ts']);
  const delegating = overrides('delegateFocus');
  assert.ok(delegating.length >= 15, `only ${delegating.length} delegateFocus() overrides found: the reading is broken`);
  // An override that falls back to the host goes through the base's delegateFocus(), never HTMLElement's focus().
  assert.deepEqual(delegating.filter(({ body }) => body.includes('super.focus(')).map(({ where }) => where), []);
});

test('every blur() of the package gives up a focus kept until it has drawn', () => {
  const all = overrides('blur');
  assert.ok(all.length >= 8, `only ${all.length} blur() overrides found: the reading is broken`);
  const keeping = all.filter(({ body }) => !body.includes('super.blur(') && !body.includes('forgetKeptFocus('));
  assert.deepEqual(keeping.map(({ where }) => where), []);
});
