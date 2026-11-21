// One control height. A developer sets `dial.control.height` once, and every control and row of its default size is
// drawn at that height: a Button, a field, a menu row, a tab, a navigation item, a tree row, a list row. The heights
// that read it are marked `"dev.tanrei.aligned": "control"` in the core vocabulary; the ladder `sys.control.height.*`
// is whole size units from it.
//
// ALIGNED_ON_THE_LADDER below is the set marked and read here at every height a product may set. OWN is the pressable
// heights marked `"dev.tanrei.aligned": "own"`, which keep a size of their own at every control height: each is read
// here at every height too, and stays as it was.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { layerChain, listSystems } from '../src/bundle.js';
import { HEIGHTS_NOT_YET_ON_THE_LADDER, auditInvariants, isRefusedEverywhere } from '../src/invariants.js';
import { REPO_ROOT, coreAlignedTokens, coreLadderReaders, coreOwnHeights, coreTargetFloors } from '../src/model.js';
import { buildProductSystem } from '../src/product.js';
import { resolveChain } from '../src/resolve.js';
import { loadSystem } from '../src/scheme.js';

const NS = 'tanrei';
const px = (value) => ({ value, unit: 'px' });
const REASON = 'A product sets its own value, for the test.';
const comp = (ids) => ids.map((id) => `${NS}.comp.${id}`);

/** Marked, and drawn at the control height in every system that does not pin them. */
const ALIGNED_ON_THE_LADDER = comp([
  'accordion.container.height.medium',
  'button-with-menu.container.height.medium',
  'button.container.height.medium',
  'calendar.day.container.size',
  'calendar.view-toggle.container.height',
  'calendar.year.container.height',
  'carousel.controls.button-size',
  'checkbox.container.size',
  'combobox.option.height.medium',
  'date-time-picker.range-field.container.height',
  'input-box.container.height.medium',
  'input-box.stacked.container.height.medium',
  'list-row.container.height.one-line.medium',
  'list.container.height.medium',
  'menu.container.height.medium',
  'menubar.container.height',
  'navigation-drawer.collapsed.item.container.width.medium',
  'navigation-drawer.item.container.height.medium',
  'one-time-code-input.container.height',
  'pagination.container.height.medium',
  'radio-button.container.size',
  'search.container.height',
  'search.suggestion.container.height.medium',
  'search.trigger.container.height',
  'segmented-button.container.height.medium',
  'select.option.height.medium',
  'slider.container.size',
  'switch.container.size',
  'table-of-contents.compact.row.height',
  'table-of-contents.row.height.medium',
  'table.row.height.medium',
  'tabs.container.height.medium',
  'toolbar.container.size.inline',
  'tree-view.container.height.medium',
]);

/**
 * Pressable heights that keep a size of their own at every control height, marked `"dev.tanrei.aligned": "own"`: no
 * control on a row, and their specs say why (TAB-63). A rating's containers are in neither list: they are the pitch of a
 * row of glyphs, which follows the mark's size, and its targets reach the minimum beyond them (RAT-20).
 */
const OWN = comp([
  'tabs.container.height-with-icon',
]);

const vocabulary = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tokens/vocabulary.lock.json'), 'utf8')).tokens;
const systems = listSystems(REPO_ROOT);
const chainOf = (id, tokens) => [...layerChain(id, (x) => loadSystem(REPO_ROOT, x)), { id: 'compact', name: 'Compact', extends: id, tokens }];
/** What a system's own layers pin, past the core and the default system: a preset keeps its original's heights. */
const pinnedBy = (id) => new Set(layerChain(id, (x) => loadSystem(REPO_ROOT, x)).filter((layer) => layer.id !== 'core' && layer.id !== NS).flatMap((layer) => Object.keys(layer.tokens ?? {})));

test('the aligned set: the marked heights are the ones on the ladder, the heights of their own are marked, and the rest are listed', () => {
  assert.deepEqual(coreAlignedTokens(), [...ALIGNED_ON_THE_LADDER].sort(), 'the marks in tokens/comp/ are the heights on the ladder');
  assert.deepEqual(coreOwnHeights(), [...OWN].sort(), 'the heights marked as their own');
  for (const id of ALIGNED_ON_THE_LADDER) assert.equal(coreLadderReaders()[id], 'medium', `${id} reads the medium step`);
  // The pressable heights that read no step are those marked as their own and those the invariant still lists.
  assert.deepEqual(coreTargetFloors().filter((id) => !(id in coreLadderReaders())), [...OWN, ...HEIGHTS_NOT_YET_ON_THE_LADDER].sort());
});

test('the ladder is whole size units from the control height: 24, 32, 40, 56, 72 at 40', async () => {
  const at = async (height, unit = 4) => {
    const tokens = (await resolveChain(chainOf(NS, { [`${NS}.dial.control.height`]: { $value: px(height), reason: REASON }, [`${NS}.dial.size.unit`]: { $value: px(unit), reason: REASON }, [`${NS}.sys.target.minimum`]: { $value: px(Math.min(36, height)), reason: REASON } }), { model: false })).tokens('light');
    return ['extra-small', 'small', 'medium', 'large', 'extra-large'].map((step) => tokens[`${NS}.sys.control.height.${step}`].$value.value);
  };
  assert.deepEqual(await at(40), [24, 32, 40, 56, 72]);
  assert.deepEqual(await at(36), [20, 28, 36, 52, 68]);
  assert.deepEqual(await at(32), [16, 24, 32, 48, 64]);
  assert.deepEqual(await at(34), [18, 26, 34, 50, 66], 'a height off the grid gives steps equally off it');
  assert.deepEqual(await at(40, 5), [20, 30, 40, 60, 80], 'the size unit is the distance between the sizes');
});

for (const id of systems) {
  test(`${id}: at every control height from 24 to 56, every aligned height it does not pin is drawn at it`, async () => {
    const pinned = pinnedBy(id);
    const base = (await resolveChain(layerChain(id, (x) => loadSystem(REPO_ROOT, x)), { model: false })).tokens('light');
    const minimum = base[`${NS}.sys.target.minimum`].$value.value;
    const held = ALIGNED_ON_THE_LADDER.filter((token) => !pinned.has(token));
    assert.ok(held.length >= 4, `${id} holds ${held.length} of the aligned heights`);
    for (let height = 24; height <= 56; height += 4) {
      const tokens = (await resolveChain(chainOf(id, {
        [`${NS}.dial.control.height`]: { $value: px(height), reason: REASON },
        [`${NS}.sys.target.minimum`]: { $value: px(Math.min(minimum, height)), reason: REASON },
      }), { model: false })).tokens('light');
      assert.deepEqual(held.filter((token) => tokens[token].$value.value !== height).map((token) => `${token} ${tokens[token].$value.value}`), [], `${id} at ${height}`);
      // What the system pins stays as its original draws it.
      for (const token of ALIGNED_ON_THE_LADDER.filter((t) => pinned.has(t))) assert.deepEqual(tokens[token].$value, base[token].$value, `${id} pins ${token}`);
    }
  });
}

for (const id of systems) {
  test(`${id}: at every control height from 24 to 56, every height of its own keeps its size`, async () => {
    const base = (await resolveChain(layerChain(id, (x) => loadSystem(REPO_ROOT, x)), { model: false })).tokens('light');
    const minimum = base[`${NS}.sys.target.minimum`].$value.value;
    for (let height = 24; height <= 56; height += 4) {
      const tokens = (await resolveChain(chainOf(id, {
        [`${NS}.dial.control.height`]: { $value: px(height), reason: REASON },
        [`${NS}.sys.target.minimum`]: { $value: px(Math.min(minimum, height)), reason: REASON },
      }), { model: false })).tokens('light');
      for (const token of OWN) assert.deepEqual(tokens[token].$value, base[token].$value, `${id} at ${height}: ${token}`);
    }
  });
}

test('the minimum target is never above the control height: refused in every system, a product layer’s too', async () => {
  const layer = { [`${NS}.dial.control.height`]: { $value: px(32), reason: REASON } };
  const { failures } = await (await resolveChain(chainOf(NS, layer))).audit();
  const refused = failures.filter(isRefusedEverywhere);
  assert.deepEqual(refused, ['target floor: sys.target.minimum: 36px is above dial.control.height (32px) — a control of the default size is drawn at the control height; lower the minimum or raise the control height']);
  await assert.rejects(buildProductSystem({ layers: [{ id: 'compact', name: 'Compact', extends: NS, tokens: layer }], targets: ['tokens'] }), /cannot be built:\n {2}- target floor: sys\.target\.minimum: 36px is above dial\.control\.height \(32px\)/);
  // With the minimum at the control height or under it, the layer builds.
  const built = await buildProductSystem({ layers: [{ id: 'compact', name: 'Compact', extends: NS, tokens: { ...layer, [`${NS}.sys.target.minimum`]: { $value: px(32), reason: REASON } } }], targets: ['tokens'] });
  assert.ok(!built.warnings.some(isRefusedEverywhere));
});

test('the invariants hold the marks and the ladder: an aligned height off the medium step, or a pressable height off the ladder and unlisted, fails', async () => {
  const model = await (await resolveChain(layerChain(NS, (x) => loadSystem(REPO_ROOT, x)))).model();
  const fails = (changed) => auditInvariants({ ...model, ...changed }).failures.filter((f) => !auditInvariants(model).failures.includes(f));
  assert.deepEqual(fails({ aligned: [...model.aligned, `${NS}.comp.button.container.height.small`] }), [`comp.button.container.height.small: marked dev.tanrei.aligned, but it does not read sys.control.height.medium — derive it with { "fn": "mul", "of": "{${NS}.sys.control.height.medium}", "by": 1, "min": "{${NS}.sys.target.minimum}" }, or alias a token that does`]);
  const ladder = { ...model.ladder };
  delete ladder[`${NS}.comp.button.container.height.small`];
  const offTheLadder = (id) => `${id}: a pressable height that reads no step of the control height ladder — read the step of its size, { "fn": "mul", "of": "{${NS}.sys.control.height.<step>}", "by": 1, "min": "{${NS}.sys.target.minimum}" }, or, where its spec says it keeps a size of its own at every control height, mark it "dev.tanrei.aligned": "own"`;
  assert.deepEqual(fails({ ladder }), [offTheLadder('comp.button.container.height.small')]);
  // A height of its own that reads a step, or is not marked, is told. (Read as a step, a tab's 64 with its icon is also
  // told it is not the step's 40.)
  const withIcon = `${NS}.comp.tabs.container.height-with-icon`;
  assert.ok(fails({ ladder: { ...model.ladder, [withIcon]: 'medium' } }).includes('comp.tabs.container.height-with-icon: marked dev.tanrei.aligned "own", but it reads a step of the ladder — take the mark off'));
  assert.deepEqual(fails({ own: model.own.filter((id) => id !== withIcon) }), [offTheLadder('comp.tabs.container.height-with-icon')]);
});
