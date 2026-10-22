// The target floor. sys.target.minimum is the least height anything a person presses is drawn at; dial.density moves
// heights, block paddings and the gaps between rows. The check holds the target tokens and every floored height in
// every kind of system, and the sweep holds the default system at densities and minimums a product may set: no
// floored height under the minimum, every height still holding its content, and the controls that read one step of
// the height ladder as tall as each other.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layerChain } from '../src/bundle.js';
import { buildProductSystem } from '../src/product.js';
import { TARGET_THRESHOLDS, auditInvariants, isCriterionFinding, isRefusedEverywhere, targetFloors } from '../src/invariants.js';
import { REPO_ROOT, coreTargetFloors } from '../src/model.js';
import { resolveChain } from '../src/resolve.js';
import { loadSystem } from '../src/scheme.js';

const NS = 'tanrei';
const px = (value) => ({ value, unit: 'px' });
const REASON = 'A product sets its own value, for the test.';
const productLayer = (tokens) => ({ id: 'sweep', name: 'Sweep', extends: 'tanrei', tokens });
const chainOf = (tokens) => [...layerChain('tanrei', (id) => loadSystem(REPO_ROOT, id)), productLayer(tokens)];
const dials = ({ density, minimum }) => ({
  ...(density === undefined ? {} : { [`${NS}.dial.density`]: { $value: density, reason: REASON } }),
  ...(minimum === undefined ? {} : { [`${NS}.sys.target.minimum`]: { $value: px(minimum), reason: REASON } }),
});
const targetFindings = (failures) => failures.filter((f) => f.startsWith('target size: ') || f.startsWith('target floor: '));

test('the floored heights: every pressable height and row the core derives with min: sys.target.minimum, and their aliases', () => {
  const floors = coreTargetFloors();
  for (const id of [
    'comp.button.container.height.small',
    'comp.button.container.height.large',
    'comp.input-box.stacked.container.height.small', // an alias of the small Button
    'comp.tree-view.container.height.compact',
    'comp.menu.container.height.compact', // an alias of the tree's compact row
    'comp.select.option.height.compact', // an alias of the menu's, which aliases the tree's
    'comp.list-row.container.height.three-line.regular',
    'comp.navigation-drawer.collapsed.item.container.width.compact',
    'comp.snackbar.controls.height',
  ]) assert.ok(floors.includes(`${NS}.${id}`), id);
  for (const id of ['comp.tag.container.height.small', 'comp.chip.container.height.small', 'comp.checkbox.container.size', 'comp.app-bar.container.height.small']) assert.ok(!floors.includes(`${NS}.${id}`), `${id} is not floored: nobody presses it, a mark reaches, or a frame`);
  assert.ok(floors.length >= 60, `${floors.length} floored heights`);
  // The pure form, over documents a caller holds (Theme Studio's sources).
  const doc = { tanrei: { comp: { x: { a: { $value: px(36), $extensions: { 'dev.tanrei.derive': { fn: 'mul', of: '{u}', by: 9, min: `{${NS}.sys.target.minimum}` } } }, b: { $value: `{${NS}.comp.x.a}` }, c: { $value: `{${NS}.comp.x.b}` }, d: { $value: px(4) } } } } };
  assert.deepEqual(targetFloors([doc]), [`${NS}.comp.x.a`, `${NS}.comp.x.b`, `${NS}.comp.x.c`]);
});

test('the default system: no target finding; the thresholds are constants', async () => {
  const { failures } = auditInvariants(await (await resolveChain(chainOf({}))).model());
  assert.deepEqual(targetFindings(failures), []);
  assert.equal(TARGET_THRESHOLDS.minimum, 24);
  assert.ok(Object.isFrozen(TARGET_THRESHOLDS));
});

test('a target under 24px, or a floored height pinned under the minimum: a criterion (an error in the default system, a warning in a product layer, information in a preset)', async () => {
  const low = targetFindings((await (await resolveChain(chainOf({ [`${NS}.sys.target.minimum`]: { $value: px(20), reason: REASON } }))).audit()).failures);
  assert.deepEqual(low, ['target size: sys.target.minimum: 20px < 24px (WCAG 2.5.8: the least target a person presses)']);
  assert.ok(low.every(isCriterionFinding) && !low.some(isRefusedEverywhere));

  const pinned = targetFindings((await (await resolveChain(chainOf({ [`${NS}.comp.button.container.height.small`]: { $value: px(28), reason: REASON } }))).audit()).failures);
  // The small Button, and what is as tall as it by an alias: the stacked input box, the snackbar's controls.
  assert.deepEqual(pinned.map((f) => f.split(':')[1].trim()), ['comp.button.container.height.small', 'comp.input-box.stacked.container.height.small', 'comp.snackbar.controls.height']);
  assert.match(pinned[0], /^target size: comp\.button\.container\.height\.small: 28px < sys\.target\.minimum 32px \(/);
  assert.ok(pinned.every(isCriterionFinding));
});

test('a hit area under what is drawn, or a density of zero: refused in every system, a product layer’s too', async () => {
  const under = targetFindings((await (await resolveChain(chainOf({ [`${NS}.sys.target.pointer`]: { $value: px(30), reason: REASON } }))).audit()).failures);
  assert.deepEqual(under, ['target floor: sys.target.pointer: 30px is under sys.target.minimum (32px) — the area a press is taken from is never smaller than what is drawn; set it to the minimum or above']);
  const none = targetFindings((await (await resolveChain(chainOf(dials({ density: 0 })))).audit()).failures);
  assert.deepEqual(none, ['target floor: dial.density: 0 — a density is above zero (1 is the default; below 1 draws closer, above 1 gives more room)']);
  for (const finding of [...under, ...none]) assert.ok(isRefusedEverywhere(finding) && !isCriterionFinding(finding), finding);
  await assert.rejects(buildProductSystem({ layers: [productLayer(dials({ density: 0 }))], targets: ['tokens'] }), /system "sweep" cannot be built:\n {2}- target floor: dial\.density: 0/);
  // A criterion stays a warning there.
  const built = await buildProductSystem({ layers: [productLayer(dials({ minimum: 20 }))], targets: ['tokens'] });
  assert.ok(built.warnings.includes('target size: sys.target.minimum: 20px < 24px (WCAG 2.5.8: the least target a person presses)'));
});

// A height and the padding and label line it holds, by size (the content invariant's reading).
function heldContent(tokens) {
  const problems = [];
  for (const [id, token] of Object.entries(tokens)) {
    const [, tier, component, part, property, size] = id.split('.');
    if (tier !== 'comp' || part !== 'container' || property !== 'height' || !size) continue;
    const padding = tokens[`${NS}.comp.${component}.container.padding-block.${size}`]?.$value?.value;
    const label = tokens[`${NS}.comp.${component}.label.typescale.${size}`]?.$value;
    if (padding === undefined || !label?.fontSize) continue;
    const needed = 2 * padding + Math.round(label.fontSize.value * label.lineHeight * 100) / 100;
    if (token.$value.value < needed) problems.push(`${id}: ${token.$value.value} < ${needed}`);
  }
  return problems;
}

test('the sweep: at every density and minimum no floored height is under the minimum, every height holds its content, and the controls of one ladder step are as tall as each other', async () => {
  const floors = coreTargetFloors();
  // The controls that read one step of the ladder, by step: they stay equal at every density and minimum.
  const ladder = {};
  const { files } = await resolveChain(chainOf({}), { model: false });
  for (const doc of Object.values(files)) {
    const walk = (node, path) => {
      if (!node || typeof node !== 'object') return;
      if ('$value' in node) {
        const step = node.$extensions?.['dev.tanrei.derive']?.of?.match(/^\{tanrei\.sys\.control\.height\.([a-z-]+)\}$/)?.[1];
        if (step && node.$extensions['dev.tanrei.derive'].by === 1) (ladder[step] ??= []).push(path.join('.'));
        return;
      }
      for (const [key, child] of Object.entries(node)) if (!key.startsWith('$')) walk(child, [...path, key]);
    };
    walk(doc, []);
  }
  assert.ok(ladder.small.length >= 6 && ladder.medium.length >= 6 && ladder.large.length >= 3, JSON.stringify(ladder));
  const table = {};
  for (const density of [0.75, 0.9, 1, 1.25, 1.5]) {
    for (const minimum of [24, 32, 36, 48]) {
      const resolved = await resolveChain(chainOf(dials({ density, minimum })), { model: false });
      const tokens = resolved.tokens('light');
      const at = `density ${density}, minimum ${minimum}`;
      const under = floors.filter((id) => tokens[id]?.$value?.value < minimum).map((id) => `${id} ${tokens[id].$value.value}`);
      assert.deepEqual(under, [], `${at}: floored heights under the minimum`);
      assert.deepEqual(heldContent(tokens), [], `${at}: heights that cannot hold their content`);
      for (const [step, ids] of Object.entries(ladder)) {
        const expected = Math.max(minimum, tokens[`${NS}.sys.control.height.${step}`].$value.value);
        assert.deepEqual(ids.filter((id) => tokens[id].$value.value !== expected), [], `${at}: controls of the ${step} step`);
      }
      if (minimum === 36) table[density] = ['button.container.height.small', 'button.container.height.medium', 'button.container.height.large', 'tree-view.container.height.regular', 'tree-view.container.height.compact', 'list-row.container.height.one-line.regular'].map((id) => tokens[`${NS}.comp.${id}`].$value.value);
    }
  }
  // Heights by density at a minimum of 36: Button small, medium and large, a row, a compact row, a one-line list row.
  assert.deepEqual(table, {
    0.75: [36, 36, 44, 36, 36, 44],
    0.9: [36, 36, 52, 44, 36, 52],
    1: [36, 40, 56, 48, 36, 56],
    1.25: [40, 52, 72, 60, 40, 72],
    1.5: [48, 60, 84, 72, 48, 84],
  });
});
