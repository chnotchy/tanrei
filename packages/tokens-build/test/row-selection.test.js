// A row whose selection is told by its fill — a list's option, a tree's node, a drawer's destination, a table's row —
// is held apart from a row under the pointer: in the default system, in every scheme and on every surface role, the
// two composited colors stand at least 1.1:1 apart, and the selected row's text is read on its fill as it is drawn.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkInvariants } from '../src/invariants.js';
import { buildModel } from '../src/model.js';
import { SCHEMES } from '../src/scheme.js';

const RULE = 'a selected row against a hovered one';
const about = (failures) => failures.filter((f) => f.includes(RULE));
const model = await buildModel();
const ROWS = {
  'tanrei.comp.list.selected.container.color': 'tanrei.comp.list.unselected.hovered.container.color',
  'tanrei.comp.tree-view.selected.container.color': 'tanrei.comp.tree-view.unselected.hovered.container.color',
  'tanrei.comp.navigation-drawer.selected.item.container.color': 'tanrei.comp.navigation-drawer.unselected.hovered.item.container.color',
  'tanrei.comp.table.row.selected.container.color': 'tanrei.comp.table.row.unselected.hovered.container.color',
};

/** The default system's model with one row's selection set back to the secondary-container role. */
function withToneSelection(id) {
  const tokens = { ...model.tokens, [id]: { ...model.tokens[id], alias: 'tanrei.sys.color.secondary-container', aliasFinal: 'tanrei.sys.color.secondary-container' } };
  delete tokens[id].derive;
  return { ...model, tokens };
}

test('every row of the default system that is told by its fill stands apart from a hovered row', () => {
  for (const [selected, hovered] of Object.entries(ROWS)) {
    assert.ok(model.tokens[selected], `${selected} exists`);
    assert.ok(model.tokens[hovered], `${hovered} exists`);
    assert.ok(model.tokens[selected].derive, `${selected} is a layer of the row's content color, derived as the list's is`);
  }
  assert.deepEqual(about(checkInvariants(model)), []);
});

test('a selection that is a tone chosen against the page fails, in the schemes where it meets the hover layer', () => {
  for (const selected of Object.keys(ROWS).slice(1)) {
    const failures = about(checkInvariants(withToneSelection(selected)));
    const short = selected.slice('tanrei.'.length);
    assert.ok(failures.length > 0, `${short} as secondary-container is reported`);
    assert.ok(failures.every((f) => f.includes(`] ${short} on `)), failures.join('\n'));
    // In the light scheme the tone is the hovered row's grey: 1.00:1 to 1.03:1.
    assert.ok(failures.some((f) => f.startsWith('[light] ')), failures.join('\n'));
    for (const f of failures) assert.ok(SCHEMES.some((scheme) => f.startsWith(`[${scheme}] `)));
  }
});

test("a selected row's text is held on its fill as the fill is drawn, over each surface", () => {
  const id = 'tanrei.comp.tree-view.selected.label.color';
  const tokens = { ...model.tokens, [id]: { ...model.tokens[id], alias: 'tanrei.sys.color.surface-container', aliasFinal: 'tanrei.sys.color.surface-container' } };
  const failures = checkInvariants({ ...model, tokens }).filter((f) => f.includes("a selected row's text on its fill"));
  assert.equal(failures.length, SCHEMES.length, failures.join('\n'));
  assert.ok(failures.every((f) => f.includes('] comp.tree-view.selected.label.color on comp.tree-view.selected.container.color: ')), failures.join('\n'));
  // At rest the selected text is the row's content color, far from its own faint layer.
  assert.deepEqual(checkInvariants(model).filter((f) => f.includes("a selected row's text on its fill")), []);
});

test('a preset keeps its own selection: the rule holds the default system alone', () => {
  const preset = { ...withToneSelection('tanrei.comp.tree-view.selected.container.color'), system: 'm3-like' };
  assert.deepEqual(about(checkInvariants(preset)), []);
});
