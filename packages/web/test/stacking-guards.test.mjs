// What a z-index may be in the package, read from the source. A z-index orders things only within the stacking context
// they stand in, and a shadow root makes none: so a component's levels are local ones — a few small steps between its
// own parts, inside a stacking context of the component's own (`isolation: isolate` on its outermost box) — and what
// has to stand over the page is drawn in the top layer (a popover, a modal dialog), never by a large number. A large
// number only wins against the other numbers of the same stacking context, which is exactly the race this forbids.
//
// - Every z-index the package writes (a declaration in a stylesheet, or one a script sets) is one of LEVELS. A value
//   outside them is listed in ALLOWED with its reason; the list only shrinks.
// - A component's stylesheet that lifts a part above its siblings (a z-index above 0) also makes a stacking context of
//   its own (`isolation: isolate`), so the level stays inside the component. src/stacking.test.ts asks the same of
//   every fixture in a browser, which is what decides; this is the early word, before a page is drawn.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The levels a part may take inside its component's own stacking context. */
export const LEVELS = new Set(['auto', '-2', '-1', '0', '1', '2', '3', '4']);

/** Values outside LEVELS, by `<file>: <value>`, with the reason. Only shrinks. */
export const ALLOWED = {
  // DRZ-6: the overlay stands over whatever the product's content stacks — the content is slotted into the host's own
  // stacking context (the host is `isolation: isolate`), where a level of the component's cannot know the content's.
  'src/components/drop-zone/drop-zone.styles.ts: 2147483647': 'over any z-index of the product content slotted into the zone, inside the zone only',
};

/** Component stylesheets that lift a part above 0 without a stacking context of their own, with the reason. Only shrinks. */
export const UNSEALED = {
  // The host draws nothing (`display: contents`): every part stands in its modal dialog, which is in the top layer.
  'src/components/image-preview/image-preview.styles.ts': 'its parts stand inside its modal dialog, in the top layer',
};

function files(dir) {
  return fs.readdirSync(path.join(pkg, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'generated' ? [] : files(rel);
    return /\.(ts|css)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [rel] : [];
  });
}
const SOURCES = files('src').sort();

/** Every z-index a file writes: CSS declarations, and what a script sets (`style.zIndex = '…'`, `setProperty('z-index', '…')`). */
export function zIndexes(text) {
  const found = [];
  for (const m of text.matchAll(/z-index:\s*([^;\n`]+?)\s*(?:;|\\n|`)/g)) found.push(m[1].trim());
  for (const m of text.matchAll(/\.zIndex\s*=\s*(?:[^;\n]*\?\s*)?['"]([^'"]*)['"](?:\s*:\s*['"]([^'"]*)['"])?/g)) found.push(...[m[1], m[2]].filter((v) => v));
  for (const m of text.matchAll(/setProperty\(\s*['"]z-index['"]\s*,\s*['"]([^'"]+)['"]/g)) found.push(m[1]);
  return found;
}

test('every z-index the package writes is a local level (auto, -2 to 4), or is listed with its reason', () => {
  const outside = [];
  for (const file of SOURCES) {
    const text = fs.readFileSync(path.join(pkg, file), 'utf8');
    for (const value of zIndexes(text)) if (!LEVELS.has(value)) outside.push(`${file}: ${value}`);
  }
  assert.deepEqual([...new Set(outside)].sort(), Object.keys(ALLOWED).sort(), 'a z-index outside the local levels: seal the component and use a small level, or draw what must stand over the page in the top layer');
});

test('a component stylesheet that lifts a part above 0 makes a stacking context of its own', () => {
  const unsealed = [];
  for (const file of SOURCES.filter((f) => /^src\/components\/[^/]+\/[^/]+\.styles\.ts$/.test(f))) {
    const text = fs.readFileSync(path.join(pkg, file), 'utf8');
    const lifts = zIndexes(text).some((value) => Number(value) > 0);
    if (lifts && !/isolation:\s*isolate/.test(text)) unsealed.push(file);
  }
  assert.deepEqual(unsealed.sort(), Object.keys(UNSEALED).sort(), 'seal the component: `isolation: isolate` on its outermost box');
});

test('the guard reads what a source writes', () => {
  assert.deepEqual(zIndexes('.a {\n  z-index: 1;\n}\n.b { z-index: -1; }'), ['1', '-1']);
  assert.deepEqual(zIndexes("layers('.tint', (n) => `z-index: -2;\\n    background-color: x;`)"), ['-2']);
  assert.deepEqual(zIndexes("panel.style.zIndex = over ? '1' : '';"), ['1']);
  assert.deepEqual(zIndexes("el.style.setProperty('z-index', '9999')"), ['9999']);
});
