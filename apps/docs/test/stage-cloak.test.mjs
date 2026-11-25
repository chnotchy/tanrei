// The web package's cloak, scoped to the figures' stages (src/lib/stage-cloak.mjs): every rule of it, inside the
// stage's scope and the docs' layer, and a stylesheet of another shape refused rather than shipped holding nothing.
// What it holds in a page — no figure grows in the reader's view when its modules arrive late — is asked of a browser in
// test/browser/layout-shift.test.mjs.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { LAYER, STAGE, stageCloak } from '../src/lib/stage-cloak.mjs';

const source = fs.readFileSync(new URL('../../../packages/web/src/styles/cloak.css', import.meta.url), 'utf8');
const rules = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+\{[^{}]*\}/g).map((rule) => rule.replace(/\s+/g, ' ').trim());

test('every rule of the cloak is kept, within the stage’s scope in the docs’ layer', () => {
  const scoped = stageCloak(source);
  assert.ok(scoped.startsWith(`@layer ${LAYER} {\n@scope (${STAGE}) {`), scoped.slice(0, 80));
  assert.ok(!scoped.includes('tanrei.components'));
  assert.deepEqual(rules(scoped), rules(source));
  // Balanced, and closed by the scope and the layer.
  assert.equal([...scoped].filter((c) => c === '{').length, [...scoped].filter((c) => c === '}').length);
  assert.match(scoped, /\}\n\}\n$/);
});

test('a cloak of another shape is refused', () => {
  assert.throws(() => stageCloak('.a { color: red }'), /one "@layer tanrei.components \{"/);
  assert.throws(() => stageCloak(`.a { color: red }\n${source}`), /something before its layer/);
  assert.throws(() => stageCloak(`${source}\n.a { color: red }`), /nothing after it/);
  assert.throws(() => stageCloak(`${source}\n@layer tanrei.components { .a { color: red } }`), /one "@layer tanrei.components \{"/);
  assert.throws(() => stageCloak('@layer tanrei.components { .a { color: red } }'), /holds no element before it is defined/);
});
