// Which web tests a change selects (src/affected.js): what CI's changes job runs on a pull request and on main. Each
// case is a list of changed paths on the repository as it is.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CANARY, affected, grepFor, importsOf } from '../src/affected.js';

test('a change outside the web selects nothing', () => {
  assert.deepEqual(affected(['docs/architecture/overview.md', 'apps/docs/astro.config.mjs', 'packages/compose/README.md', 'packages/flutter/lib/x.dart']), { all: false, units: [], files: [], reasons: [] });
});

test('what pnpm generate writes is traced through its source, not on its own', () => {
  const r = affected(['packages/web/src/generated/tokens.css', 'docs/status/STATUS.md', 'packages/web/custom-elements.json']);
  assert.equal(r.all, false);
  assert.deepEqual(r.units, []);
});

test("a component's own file, spec, comp tokens or baseline select it", () => {
  for (const file of ['packages/web/src/components/tooltip/tooltip.ts', 'specs/tooltip.spec.json', 'tokens/comp/tooltip.tokens.json', 'packages/web/snapshots/tooltip/x.png']) {
    const r = affected([file]);
    assert.equal(r.all, false, file);
    assert.ok(r.units.includes('tooltip'), file);
  }
});

test('a component built from or using a selected one is selected with it', () => {
  const r = affected(['specs/menu.spec.json']);
  assert.ok(r.units.includes('button-with-menu'), 'button-with-menu is built from menu');
  const b = affected(['specs/button.spec.json']);
  assert.ok(b.units.includes('button-group'), 'button-group uses button');
});

test('a component drawn by a stylesheet is selected by its stylesheet and its spec', () => {
  for (const file of ['packages/web/src/styles/link.css', 'specs/link.spec.json']) assert.ok(affected([file]).units.includes('link'), file);
});

test('a module every component imports selects them all, without selecting everything', () => {
  const r = affected(['packages/web/src/primitives/focus-ring.ts']);
  assert.equal(r.all, false);
  assert.ok(r.units.length > 40, `${r.units.length} components`);
});

test('a test file that imports a changed helper runs in full', () => {
  const r = affected(['packages/web/src/tmp.test.ts']);
  assert.deepEqual(r.files, ['packages/web/src/tmp.test.ts']);
});

test("a change whose reach is not traced selects everything, and says which file", () => {
  for (const file of ['packages/web/playwright.config.ts', 'tokens/sys/color.tokens.json', 'packages/tokens-build/src/cli.js', 'pnpm-lock.yaml', 'specs/component.schema.json']) {
    const r = affected([file]);
    assert.equal(r.all, true, file);
    assert.match(r.reasons[0], new RegExp(`^${file.replace(/[.]/g, '\\.')}: `));
  }
});

test("CI's workflow alone runs the canary; with a component it runs that component", () => {
  assert.deepEqual(affected(['.github/workflows/ci.yml']).units, CANARY);
  assert.deepEqual(affected(['.github/workflows/ci.yml', 'specs/tooltip.spec.json']).units.includes('button'), false);
});

test('the grep names the components by directory, stylesheet and title, and the files by path', () => {
  const grep = grepFor({ units: ['link', 'tooltip'], files: ['packages/web/src/idle.test.ts'] });
  const re = new RegExp(grep);
  assert.ok(re.test('components/tooltip/tooltip.test.ts tooltip TIP-1: opens'));
  assert.ok(re.test('styles/link.test.ts the stylesheet'));
  assert.ok(re.test('scroll-box.test.ts inside a scroll box tooltip: at the far end'));
  assert.ok(re.test('idle.test.ts at rest button: its fixtures'));
  assert.ok(!re.test('components/button/button.test.ts button BTN-1: a press'));
  assert.ok(!re.test('components/tooltip-like/x.test.ts'));
});

test('imports are read in every form a module loads another', () => {
  const text = `import a from './a.ts';\nexport { b } from "../b.js";\nimport './c.css';\nconst d = await import('./d.ts');\nconst e = new URL('./e.woff2', import.meta.url);\nimport x from 'lit';`;
  assert.deepEqual(importsOf(text).sort(), ['../b.js', './a.ts', './c.css', './d.ts', './e.woff2']);
});

test("a change to a component's own tests or baselines selects that component and nothing built on it", () => {
  const r = affected(['packages/web/src/components/switch/switch.test.ts', 'packages/web/snapshots/switch/x.png']);
  assert.deepEqual(r.units, ['switch']);
  assert.ok(affected(['packages/web/src/components/switch/switch.ts']).units.length > 1, 'its implementation still reaches what is built on it');
});
