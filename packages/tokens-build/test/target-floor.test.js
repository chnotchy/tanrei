// The target floor. sys.target.minimum is the least height anything a person presses is drawn at; dial.control.height
// moves the height ladder. The check holds the target tokens and every floored height in every kind of system, and the
// sweep holds the default system at control heights and minimums a product may set: no
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
const dials = ({ height, minimum }) => ({
  ...(height === undefined ? {} : { [`${NS}.dial.control.height`]: { $value: px(height), reason: REASON } }),
  ...(minimum === undefined ? {} : { [`${NS}.sys.target.minimum`]: { $value: px(minimum), reason: REASON } }),
});
const targetFindings = (failures) => failures.filter((f) => f.startsWith('target size: ') || f.startsWith('target floor: '));

test('the floored heights: every pressable height and row the core derives with min: sys.target.minimum, and their aliases', () => {
  const floors = coreTargetFloors();
  for (const id of [
    'comp.button.container.height.large',
    'comp.tree-view.container.height.small', // the small step of the ladder, with the minimum: a row that touches its neighbours
    'comp.menu.container.height.small',
    'comp.select.option.height.small', // an alias of the menu's
    'comp.list-row.container.height.one-line.medium',
    'comp.navigation-drawer.collapsed.item.container.width.small',
  ]) assert.ok(floors.includes(`${NS}.${id}`), id);
  // A control of the small size that stands alone is drawn at its step, and its hit area reaches the minimum past it.
  for (const id of ['comp.button.container.height.small', 'comp.input-box.stacked.container.height.small', 'comp.segmented-button.container.height.small', 'comp.button-with-menu.container.height.small', 'comp.pagination.container.height.small', 'comp.tabs.container.height.small', 'comp.snackbar.controls.height']) assert.ok(!floors.includes(`${NS}.${id}`), `${id} stands alone: drawn at its step, its hit area reaching the target`);
  for (const id of ['comp.tag.container.height.small', 'comp.chip.container.height.small', 'comp.checkbox.container.size', 'comp.app-bar.container.height.small']) assert.ok(!floors.includes(`${NS}.${id}`), `${id} is not floored: nobody presses it, a mark reaches, or a frame`);
  // A row of more lines adds its lines to the one-line row, which is floored: held up by it, it carries no floor of its own.
  for (const id of ['comp.list-row.container.height.two-line.medium', 'comp.list-row.container.height.three-line.small']) assert.ok(!floors.includes(`${NS}.${id}`), `${id} adds to a floored height`);
  // (52 since the small size of a control that stands alone reads its step without the floor.)
  assert.ok(floors.length >= 50, `${floors.length} floored heights`);
  // The pure form, over documents a caller holds (Theme Studio's sources).
  const doc = { tanrei: { comp: { x: { a: { $value: px(36), $extensions: { 'dev.tanrei.derive': { fn: 'mul', of: '{u}', by: 9, min: `{${NS}.sys.target.minimum}` } } }, b: { $value: `{${NS}.comp.x.a}` }, c: { $value: `{${NS}.comp.x.b}` }, d: { $value: px(4) } } } } };
  assert.deepEqual(targetFloors([doc]), [`${NS}.comp.x.a`, `${NS}.comp.x.b`, `${NS}.comp.x.c`]);
});

test('the default system: one target of 36 for pointer and touch alike, no target finding; the thresholds are constants', async () => {
  const model = await (await resolveChain(chainOf({}))).model();
  assert.deepEqual(['minimum', 'pointer', 'touch'].map((name) => model.tokens[`${NS}.sys.target.${name}`].value.value), [36, 36, 36]);
  // One value sets all three: pointer and touch follow the minimum a product sets, and may be set above it.
  const moved = (await (await resolveChain(chainOf(dials({ minimum: 40 })))).model()).tokens;
  assert.deepEqual(['minimum', 'pointer', 'touch'].map((name) => moved[`${NS}.sys.target.${name}`].value.value), [40, 40, 40]);
  const { failures } = auditInvariants(model);
  assert.deepEqual(targetFindings(failures), []);
  assert.equal(TARGET_THRESHOLDS.minimum, 24);
  assert.ok(Object.isFrozen(TARGET_THRESHOLDS));
});

test('a target under 24px, or a floored height pinned under the minimum: a criterion (an error in the default system, a warning in a product layer, information in a preset)', async () => {
  const low = targetFindings((await (await resolveChain(chainOf({ [`${NS}.sys.target.minimum`]: { $value: px(20), reason: REASON } }))).audit()).failures);
  // pointer and touch alias the minimum, so a product that lowers it lowers all three.
  assert.deepEqual(low, ['minimum', 'pointer', 'touch'].map((name) => `target size: sys.target.${name}: 20px < 24px (WCAG 2.5.8: the least target a person presses)`));
  assert.ok(low.every(isCriterionFinding) && !low.some(isRefusedEverywhere));

  const pinned = targetFindings((await (await resolveChain(chainOf({ [`${NS}.comp.tree-view.container.height.small`]: { $value: px(28), reason: REASON } }))).audit()).failures);
  // A tree's small row, a row that touches its neighbours, and what is as tall as it by an alias.
  assert.ok(pinned.map((f) => f.split(':')[1].trim()).includes('comp.tree-view.container.height.small'), pinned.join('\n'));
  assert.match(pinned.find((f) => f.includes('comp.tree-view.container.height.small:')), /^target size: comp\.tree-view\.container\.height\.small: 28px < sys\.target\.minimum 36px \(/);
  assert.ok(pinned.every(isCriterionFinding));
});

test('a hit area under what is drawn: refused in every system, a product layer’s too', async () => {
  const under = targetFindings((await (await resolveChain(chainOf({ [`${NS}.sys.target.pointer`]: { $value: px(30), reason: REASON } }))).audit()).failures);
  assert.deepEqual(under, ['target floor: sys.target.pointer: 30px is under sys.target.minimum (36px) — the area a press is taken from is never smaller than what is drawn; set it to the minimum or above']);
  for (const finding of under) assert.ok(isRefusedEverywhere(finding) && !isCriterionFinding(finding), finding);
  await assert.rejects(buildProductSystem({ layers: [productLayer({ [`${NS}.sys.target.pointer`]: { $value: px(30), reason: REASON } })], targets: ['tokens'] }), /system "sweep" cannot be built:\n {2}- target floor: sys\.target\.pointer: 30px/);
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

test('the sweep: at every control height and minimum no floored height is under the minimum, every height holds its content, and the controls of one ladder step are as tall as each other', async () => {
  const floors = coreTargetFloors();
  // The controls that read one step of the ladder, by step: they stay equal at every control height and minimum.
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
  for (const height of [32, 36, 40, 48, 56]) {
    for (const minimum of [24, 32, 36, 48].filter((value) => value <= height)) {
      const resolved = await resolveChain(chainOf(dials({ height, minimum })), { model: false });
      const tokens = resolved.tokens('light');
      const at = `control height ${height}, minimum ${minimum}`;
      const under = floors.filter((id) => tokens[id]?.$value?.value < minimum).map((id) => `${id} ${tokens[id].$value.value}`);
      assert.deepEqual(under, [], `${at}: floored heights under the minimum`);
      // A tag and a key cap are sized by their text and keep heights of their own: every height holds its content.
      const short = heldContent(tokens);
      assert.deepEqual(short, [], `${at}: heights that cannot hold their content`);
      for (const [step, ids] of Object.entries(ladder)) {
        // A row that touches its neighbours is held at the minimum; a control that stands alone is drawn at its step.
        const value = tokens[`${NS}.sys.control.height.${step}`].$value.value;
        assert.deepEqual(ids.filter((id) => tokens[id].$value.value !== (floors.includes(id) ? Math.max(minimum, value) : value)), [], `${at}: controls of the ${step} step`);
      }
      if (minimum === 32) table[height] = ['button.container.height.small', 'button.container.height.medium', 'button.container.height.large', 'tree-view.container.height.medium', 'tree-view.container.height.small', 'list-row.container.height.one-line.medium', 'list-row.container.height.two-line.medium', 'list-row.container.height.three-line.medium'].map((id) => tokens[`${NS}.comp.${id}`].$value.value);
    }
  }
  // Heights by control height at a minimum of 32: Button small, medium and large, a tree's row, a tree's small row, a
  // one-line, a two-line and a three-line list row. The Button, the tree's rows and the one-line list row follow the
  // ladder, the medium rows at the control height; a row of more lines adds the line of its supporting text, five size
  // units, for each line past the first.
  assert.deepEqual(table, {
    32: [24, 32, 48, 32, 32, 32, 52, 72],
    36: [28, 36, 52, 36, 32, 36, 56, 76],
    40: [32, 40, 56, 40, 32, 40, 60, 80],
    48: [40, 48, 64, 48, 40, 48, 68, 88],
    56: [48, 56, 72, 56, 48, 56, 76, 96],
  });
});
