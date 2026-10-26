// Export: the layer written out — every value an example of the theme gallery gives it, in the file itself — builds
// exactly as the layer that depends on the example; and the stylesheet's changes are the build's own sheet, less what
// the base's sheet already says.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { build, parseSheet } from './helpers.js';
import { shipped, studio } from './studio-node.js';
import { leavesNothingBehind } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after);

const examples = studio.systems.filter(({ id }) => studio.examplesOf({ id: 'acme', extends: id }).length).map(({ id }) => id);

test('the examples a layer could hold itself: every shipped layer between it and the default system or the root', () => {
  assert.ok(examples.length >= 2, `the gallery has examples (${examples})`);
  assert.equal(studio.writeOut({ id: 'acme', extends: studio.defaultId }), null, 'the default system is no example: nothing to write out');
  for (const id of examples) assert.notEqual(id, studio.defaultId);
  const stacked = examples.find((id) => ![studio.rootId, studio.defaultId].includes(shipped[id].extends));
  assert.ok(stacked, 'an example on an example');
  assert.deepEqual(studio.examplesOf({ id: 'acme', extends: stacked }).map((layer) => layer.id), [stacked, shipped[stacked].extends], 'nearest first');
});

test('the base of a layer written out is one of the Base system panel’s choices: the root, which is offered for no other layer', () => {
  const written = studio.writeOut({ id: 'acme', extends: examples[0] }).layer;
  assert.equal(written.extends, studio.rootId);
  assert.ok(!studio.systems.some(({ id }) => id === studio.rootId), 'the root is not offered as a base');
  const choices = studio.baseChoices(written);
  assert.deepEqual(choices.map(({ id }) => id), [...studio.systems.map(({ id }) => id), studio.rootId]);
  assert.equal(choices.at(-1).description, shipped[studio.rootId].description, 'with its own description');
  assert.deepEqual(studio.baseChoices({ id: 'acme', extends: studio.defaultId }), studio.systems);
});

/** Both files, built by `tanrei build`: the same sheet, declaration for declaration, the same documents and warnings. */
async function assertSameBuild(layer) {
  const written = studio.writeOut(layer);
  assert.ok(written, `${layer.extends}: written out`);
  const flat = written.layer;
  assert.equal(flat.id, layer.id);
  assert.ok(!examples.includes(flat.extends), `${layer.extends}: the file no longer extends an example (${flat.extends})`);
  assert.deepEqual(studio.check(flat).problems, [], 'the written file is valid, and the engine computes it');
  assert.deepEqual(studio.check(flat).warnings, studio.check(layer).warnings, 'the same warnings as the file that depends on the example');
  const [ours, theirs] = await Promise.all([build(flat), build(layer)]);
  assert.deepEqual(ours.warnings, theirs.warnings, 'the build warns the same');
  const [a, b] = [parseSheet(ours.files.web[`${layer.id}.css`]), parseSheet(theirs.files.web[`${layer.id}.css`])];
  assert.deepEqual(Object.keys(a), Object.keys(b), 'the same rules');
  for (const selector of Object.keys(b)) assert.deepEqual(a[selector], b[selector], selector);
  assert.deepEqual(Object.keys(ours.files.tokens).sort(), Object.keys(theirs.files.tokens).sort(), 'the same documents');
  // Every value and every component; what differs is only where the documents say they come from — the chain, its
  // layers, what the system extends, who declared what — and the module a component is imported from: the example's entry registers the
  // components the example ships, and a file that no longer extends it imports each from the component's own module.
  const PROVENANCE = new Set(['dev.tanrei.system', 'declaredBy', 'chain', 'extends', 'import']);
  const values = (doc) => {
    const out = JSON.parse(JSON.stringify(doc, (key, value) => (PROVENANCE.has(key) ? undefined : value)));
    if (/\(core ← .*\)/.test(out.description ?? '')) delete out.description; // "Design system "acme" (core ← m3-like ← acme) …"
    return out;
  };
  for (const [name, doc] of Object.entries(theirs.files.tokens)) assert.deepEqual(values(ours.files.tokens[name]), values(doc), name);
  return written;
}

for (const id of examples) {
  test(`a layer on "${id}", written out, builds as the one that depends on it`, async () => {
    await assertSameBuild({ id: 'acme', extends: id });
  });
}

test('written out with the edits of the rail: a brand color, a dial, a typeface pin, a scaled token and a component left out', async () => {
  const id = examples.includes('m3-like') ? 'm3-like' : examples[0];
  let layer = { id: 'acme', name: 'Acme', description: 'How Acme looks.', extends: id };
  layer = studio.setPalette(layer, 'primary', { seed: '#0b6e4f' });
  layer = studio.setDial(layer, `${studio.namespace}.dial.shape.unit`, 6);
  layer = { ...layer, tokens: { ...layer.tokens, 'tanrei.ref.typeface.brand': { $value: ['IBM Plex Sans', 'system-ui', 'sans-serif'], reason: 'Brand typeface.' }, 'tanrei.sys.typescale.body': { scale: 1.125 } }, components: { omit: { carousel: { reason: 'Acme shows one item at a time.', insteadUse: ['list'] } } } };
  const written = await assertSameBuild(layer);
  assert.equal(written.layer.name, 'Acme');
  assert.equal(written.layer.description, 'How Acme looks.');
  assert.equal(written.layer.tokens['tanrei.ref.typeface.brand'].reason, 'Brand typeface.', 'the layer’s own pins win');
  assert.ok(written.layer.components.omit.carousel, 'and so do the components it leaves out');
});

test('a component that lives in the example is still taken from it, and the file says so', () => {
  const holder = examples.find((id) => Object.values(shipped[id].vocabulary ?? {}).some((entry) => entry && typeof entry === 'object' && 'document' in entry));
  assert.ok(holder, 'an example holds a component of its own');
  const written = studio.writeOut({ id: 'acme', extends: holder });
  assert.ok(written.held.length > 0);
  for (const name of written.held) assert.ok(written.layer.components.include.some((entry) => entry.name === name && entry.from === holder), name);
  assert.ok(!Object.keys(written.layer.vocabulary ?? {}).some((key) => key === `tanrei.comp.${written.held[0]}`), 'its document stays the example’s');
});

test("the stylesheet's changes: the build's own declarations that the base's sheet does not have, in their rules", () => {
  const untouched = studio.preview({ id: 'acme', extends: 'tanrei' });
  assert.deepEqual(studio.sheetChanges(untouched), { css: '', changed: 0, removed: 0 }, 'nothing changed, nothing to show');
  const layer = studio.setDial({ id: 'acme', extends: 'tanrei' }, `${studio.namespace}.dial.shape.unit`, 6);
  const view = studio.preview(layer);
  const changes = studio.sheetChanges(view);
  const rules = parseSheet(changes.css);
  const whole = parseSheet(view.css('acme'));
  assert.ok(changes.changed > 0);
  for (const [selector, declarations] of Object.entries(rules)) for (const [property, value] of Object.entries(declarations)) assert.equal(whole[selector][property], value, `${selector} ${property}: as the build writes it`);
  assert.equal(rules[`[data-tanrei-system="acme"], [data-tanrei-system="acme"] [data-tanrei-contrast]`]['--tanrei-dial-shape-unit'], '6px', 'the dial');
  // A corner follows the dial in the sheet, so it is not among the changes: it moves with the dial.
  assert.ok(!Object.values(rules).some((declarations) => '--tanrei-sys-shape-corner-small' in declarations), 'a size that follows the dial is left to follow it');
  assert.match(changes.css, /^@layer tanrei\.tokens \{\n {2}\[data-tanrei-system="acme"\]/, 'in the sheet’s layer and rules');
});
