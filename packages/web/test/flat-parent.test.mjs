// An element's parent in the flat tree — its slot, else its parent, else its shadow root's host — is written once,
// `flatParent()` (src/primitives/flat-tree.ts), and every walk up the flat tree takes it, so that the walks agree on
// where a slotted element, or the top of a shadow root, goes next. The one walk that writes its own steps is the one
// that keeps each shadow root it crosses (src/primitives/follow.ts).
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

/** The walks that step to an element's slot before its parent by themselves, and why each may. */
const OWN_STEPS = new Map([
  ['primitives/flat-tree.ts', 'the step itself'],
  ['primitives/follow.ts', 'keeps every shadow root it crosses, to watch it'],
]);

test('every walk up the flat tree takes flatParent()', () => {
  const found = [];
  for (const file of files(src)) {
    const where = path.relative(src, file).split(path.sep).join('/');
    if (OWN_STEPS.has(where)) continue;
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, at) => {
        if (/\.assignedSlot\s*(\?\?|\|\|)/.test(line) || /if \(\w+\.assignedSlot\) return \w+\.assignedSlot/.test(line)) found.push(`${where}:${at + 1}`);
      });
  }
  assert.deepEqual(found, []);
});
