// Which web tests a change selects (src/affected.js): what CI's changes job runs on a pull request and on main. Each
// case is a list of changed paths on the repository as it is.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CANARY, affected, crossCutting, grepFor, importsOf } from '../src/affected.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('a change outside the web selects nothing', () => {
  assert.deepEqual(affected(['docs/architecture/overview.md', 'apps/docs/astro.config.mjs', 'packages/compose/README.md', 'packages/flutter/lib/x.dart']), { all: false, units: [], files: [], every: [], each: [], reasons: [] });
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

test('the walks of every component are found by their marker line, each file in one way', () => {
  const { every, each } = crossCutting();
  for (const file of ['perf-budget', 'hidden', 'overlay-tree', 'styles/registered-properties', 'styles/has']) assert.ok(every.includes(`packages/web/src/${file}.test.ts`), file);
  for (const file of ['systems', 'stacking', 'first-frame-all', 'fouce', 'targets', 'styles/product-text-direction', 'primitives/composed']) assert.ok(each.includes(`packages/web/src/${file}.test.ts`), file);
  assert.deepEqual(every.filter((f) => each.includes(f)), []);
  for (const f of [...every, ...each]) assert.ok(fs.existsSync(path.join(REPO, f)), f);
});

test("a change to one component runs the walks of every component; its own tests or baselines alone, or the docs, run none", () => {
  const { every, each } = crossCutting();
  for (const file of ['packages/web/src/components/dialog/dialog.ts', 'specs/dialog.spec.json', 'tokens/comp/dialog.tokens.json', 'packages/web/src/primitives/focus-ring.ts', 'packages/web/src/styles/link.css']) {
    const r = affected([file]);
    assert.equal(r.all, false, file);
    assert.deepEqual([...r.files, ...r.every].filter((f) => every.includes(f)).sort(), every, file);
    assert.deepEqual([...r.files, ...r.each].filter((f) => each.includes(f)).sort(), each, file);
    const grep = grepFor(r);
    assert.match(grep, /perf-budget\\\.test\\\.ts/, file);
    assert.match(grep, /systems\\\.test\\\.ts/, file);
  }
  for (const file of ['packages/web/src/components/dialog/dialog.test.ts', 'packages/web/snapshots/dialog/x.png', 'docs/architecture/overview.md']) {
    const r = affected([file]);
    assert.deepEqual([r.every, r.each], [[], []], file);
    assert.equal(r.files.includes('packages/web/src/perf-budget.test.ts'), false, file);
  }
});

test('in a walk of each component, a test runs when its title names a selected component as a word, or names none', () => {
  // As Playwright matches it: the project, the file under src/ and the titles, joined by spaces, ignoring case.
  const re = new RegExp(grepFor({ units: ['button'], files: [], every: [], each: ['packages/web/src/systems.test.ts', 'packages/web/src/stacking.test.ts', 'packages/web/src/primitives/form-disabled.test.ts'] }), 'i');
  for (const title of [
    ' chromium systems.test.ts m3-like snapshot: button/filled-medium',
    " chromium systems.test.ts cupertino button: cupertino passes axe's functional rules",
    ' chromium stacking.test.ts a z-index in button orders its own parts only',
    ' chromium stacking.test.ts button scrolled under a product’s sticky header',
    ' chromium primitives/form-disabled.test.ts tanrei-button: disabled by its attribute',
    ' chromium systems.test.ts presets are discovered from tokens/systems/',
    ' chromium systems.test.ts two systems on one page do not leak into each other',
  ]) assert.ok(re.test(title), title);
  for (const title of [
    ' chromium systems.test.ts m3-like snapshot: badge/count-single',
    ' chromium stacking.test.ts a z-index in button-group orders its own parts only',
    ' chromium primitives/form-disabled.test.ts tanrei-checkbox: disabled by its attribute',
    ' chromium zoom.test.ts tooltip: under zoom 2',
  ]) assert.ok(!re.test(title), title);
});

/**
 * Web tests that read the registry and need no marker, with why. Any other test outside a component's directory that
 * reads the specs, the inventory, the components' directories, the manifest or the whole bundle walks every component.
 */
const NOT_A_WALK = {
  'packages/web/src/styles/prose.test.ts':
    "reads the manifest to hold that the build named every element in dist/prose.css; the build writes that list from the manifest, so no component's change parts them",
};

test('a web test that reads the registry from disk says how a change selects it', () => {
  const marked = new Set(Object.values(crossCutting()).flat());
  const tests = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === 'components' && dir.endsWith(path.join('web', 'src')) ? [] : tests(full);
      return entry.name.endsWith('.test.ts') ? [path.relative(REPO, full).split(path.sep).join('/')] : [];
    });
  const reads = /specs\/inventory\.json|readdirSync\([^)]*\b(?:specs|components)\b|custom-elements\.json|dist\/all\.js/;
  const unmarked = tests(path.join(REPO, 'packages/web/src')).filter((f) => reads.test(fs.readFileSync(path.join(REPO, f), 'utf8')) && !marked.has(f) && !NOT_A_WALK[f]);
  assert.deepEqual(unmarked, [], 'add `// affected: every component — <why>` or `// affected: each component — <why>` (packages/tools/src/affected.js)');
  for (const f of Object.keys(NOT_A_WALK)) assert.ok(fs.existsSync(path.join(REPO, f)), f);
});
