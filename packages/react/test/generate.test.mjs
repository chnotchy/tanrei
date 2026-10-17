// How the generator names an event prop: `on` and the event's name as the specs write it, in camelCase, while the
// element fires the event in lowercase. It runs for real, in a copy of what it reads: the manifest, the specs and itself.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after);

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const SPECS = fs.readdirSync(path.join(REPO, 'specs')).filter((f) => f.endsWith('.spec.json'));

/** A copy of what the generator reads, with `edit(name, spec)` applied to each spec (returning null leaves it out). */
function tree(edit = (_name, spec) => spec) {
  const root = tempDir('react-generate');
  for (const rel of ['packages/react/scripts/generate.js', 'packages/web/custom-elements.json']) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.copyFileSync(path.join(REPO, rel), path.join(root, rel));
  }
  fs.mkdirSync(path.join(root, 'specs'));
  for (const file of SPECS) {
    const spec = edit(file.replace(/\.spec\.json$/, ''), JSON.parse(fs.readFileSync(path.join(REPO, 'specs', file), 'utf8')));
    if (spec) fs.writeFileSync(path.join(root, 'specs', file), JSON.stringify(spec));
  }
  return root;
}
const generate = (root) => spawnSync(process.execPath, ['packages/react/scripts/generate.js'], { cwd: root, encoding: 'utf8' });
const wrapper = (root, name) => fs.readFileSync(path.join(root, 'packages/react/src/generated/wrappers', `${name}.ts`), 'utf8');
/** Every `prop: 'event'` pair of a wrapper's event map. */
const eventsOf = (text) => [...text.matchAll(/^ {4}(on\w+): '([^']+)'/gm)].map(([, prop, event]) => [prop, event]);

test('every event prop is `on` and the event in camelCase; the event it listens for is the lowercase DOM name', () => {
  const root = tree();
  const run = generate(root);
  assert.equal(run.status, 0, run.stderr);
  const all = fs.readdirSync(path.join(root, 'packages/react/src/generated/wrappers')).flatMap((file) => eventsOf(wrapper(root, file.replace(/\.ts$/, ''))));
  assert.ok(all.length > 100);
  for (const [prop, event] of all) assert.equal(prop.slice(2).toLowerCase(), event, `${prop} listens for ${event}`);
  assert.deepEqual(eventsOf(wrapper(root, 'navigation-drawer')).filter(([, event]) => event.endsWith('change') && event !== 'change'), [
    ['onExpandedChange', 'expandedchange'],
    ['onPresentationChange', 'presentationchange'],
  ]);
  // The snackbar's spec maps its `toggle` onto `expandedchange`: the prop is the event's own name, cased as another spec writes it.
  assert.ok(eventsOf(wrapper(root, 'snackbar')).some(([prop, event]) => prop === 'onExpandedChange' && event === 'expandedchange'));
  assert.ok(eventsOf(wrapper(root, 'copy-button')).some(([prop, event]) => prop === 'onCopyFailed' && event === 'copyfailed'));
  // A dialog's `dismiss` is the platform's one-word `cancel`.
  assert.ok(eventsOf(wrapper(root, 'dialog')).some(([prop, event]) => prop === 'onCancel' && event === 'cancel'));
});

test('an event that no spec names stops the generator, so it is never cased by guess', () => {
  const root = tree((name, spec) => (name === 'table' ? { ...spec, platforms: { ...spec.platforms, web: { ...spec.platforms.web, events: { sort: 'sort' } } } } : spec));
  const run = generate(root);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /<tanrei-table> fires "selectionchange", which no spec names/);
});

test('two specs that spell one event two ways stop the generator', () => {
  const root = tree((name, spec) => {
    if (name !== 'copy-button') return spec;
    const { copyFailed, ...events } = spec.platforms.web.events;
    return { ...spec, platforms: { ...spec.platforms, web: { ...spec.platforms.web, events: { ...events, copyfailed: copyFailed } } } };
  });
  const run = generate(root);
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /"copyfailed" is spelt "copyFailed" in another spec|"copyFailed" is spelt "copyfailed" in another spec/);
});
