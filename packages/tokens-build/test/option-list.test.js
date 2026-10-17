// The list a field opens — a select's, a combobox's — is drawn as the menu's: the sheet, a row, a group's title, the
// divider, the chosen row's fill, the motion. No token aliases the menu's (a component
// owns its tokens and aliases `sys.*`), so the family is held together here: every token of a component's list
// equals the menu's token it stands for, resolved, in every scheme of every shipped system. A component that joins
// the family is added to LISTS; a rule or a preset pin the menu has and the newcomer lacks then fails here, by name.
import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { DEFAULT_SYSTEM, shippedSystems } from '../src/bundle.js';
import { CONFIG, REPO_ROOT, buildModel } from '../src/model.js';

const NS = `${CONFIG.namespace}.comp`;
const MENU = `${NS}.menu`;
const STATE = '(?:(?:hovered|focused|pressed|disabled)\\.)?';

/** A component's list names → the menu's. First match wins; `$n` are the match's groups. */
const AS_THE_MENU = [
  [/^list\.(color|elevation|shape|padding-block|padding-inline|min-width|max-width|offset|viewport-margin)$/, 'surface.$1'],
  [/^option\.(height|shape|padding-inline|padding-block|gap)$/, 'container.$1'],
  [/^option\.(label\.typescale|supporting-text\.typescale|leading-icon\.size|mark\.size)$/, '$1'],
  [/^(group-title\.(?:color|padding-inline|typescale)|group\.gap|divider\.(?:color|space|thickness)|separation)$/, '$1'],
  [/^(motion\.(?:feedback-duration|open-duration|open-easing|close-duration|close-easing))$/, '$1'],
  // An option at rest and chosen, per look of the field and per state: the menu's plain row and its checked row.
  [new RegExp(`^[a-z-]+\\.(${STATE})option\\.([a-z-]+\\.color)$`), 'unselected.$1$2'],
  [new RegExp(`^[a-z-]+\\.(${STATE})selected-option\\.([a-z-]+\\.color)$`), 'selected.$1$2'],
];
/** What belongs to a list by its name: each of these is paired with the menu's or named as the component's own. */
const OF_THE_LIST = new RegExp(`^(?:list|option|group-title|group|divider)\\.|^separation$|^motion\\.(?:feedback|open|close)-|^[a-z-]+\\.${STATE}(?:selected-)?option\\.`);

/** `own`: list tokens the menu has no counterpart for, by name, so that nothing is left out by accident. */
export const LISTS = {
  // A long list scrolls inside a height of its own; a menu is short by its rules and has none.
  select: { own: ['list.max-height'], pairs: 196 },
  // A combobox's list is exactly as wide as its field, so it has no least width (CMB-22); the weight of the letters
  // that matched what was typed is its own.
  combobox: { own: ['list.max-height', 'option.match.emphasis'], pairs: 194 },
};

const systems = [DEFAULT_SYSTEM, ...shippedSystems(REPO_ROOT).filter((id) => id !== DEFAULT_SYSTEM)];
const models = new Map();
const modelOf = async (system) => {
  if (!models.has(system)) models.set(system, await (system === DEFAULT_SYSTEM ? buildModel() : buildModel(path.join(REPO_ROOT, 'tokens/generated', system), system)));
  return models.get(system);
};
const inScheme = (model, scheme, id) => JSON.stringify(model.tokens[id].type === 'color' ? model.componentColors[scheme][id].value : model.tokens[id].value);

/** The pairs of one component: [its token id, the menu's token id]; and the list tokens that found no pair. */
export function listPairs(model, component, list = LISTS[component]) {
  const prefix = `${NS}.${component}.`;
  const [pairs, unpaired] = [[], []];
  for (const id of Object.keys(model.tokens)) {
    if (!id.startsWith(prefix)) continue;
    const name = id.slice(prefix.length);
    if (!OF_THE_LIST.test(name) || list.own.includes(name)) continue;
    const rule = AS_THE_MENU.find(([from]) => from.test(name));
    const menu = rule && `${MENU}.${name.replace(rule[0], rule[1])}`;
    if (menu && model.tokens[menu]) pairs.push([id, menu]);
    else unpaired.push(name);
  }
  return { pairs, unpaired };
}

for (const [component, list] of Object.entries(LISTS)) {
  test(`${component}: every token of its list equals the menu's it stands for, in every scheme of every shipped system`, async () => {
    for (const system of systems) {
      const model = await modelOf(system);
      const { pairs, unpaired } = listPairs(model, component);
      assert.deepEqual(unpaired, [], `${system}: ${component} has list tokens the menu has no counterpart for — pair them in AS_THE_MENU or name them in LISTS.${component}.own`);
      assert.equal(pairs.length, list.pairs, `${system}: ${component} has ${pairs.length} list tokens`);
      const differing = [];
      for (const scheme of model.schemes) {
        for (const [mine, menu] of pairs) {
          const [a, b] = [inScheme(model, scheme, mine), inScheme(model, scheme, menu)];
          if (a !== b) differing.push(`[${system} ${scheme}] ${mine} ${a} ≠ ${menu} ${b}`);
        }
      }
      assert.deepEqual(differing, []);
    }
  });
}

// The row that says options are loading, failed or absent is the search's status row: its text style
// and its two colors, under the same names.
test('combobox: its status row equals the search\'s, in every scheme of every shipped system', async () => {
  const STATUS = ['status.typescale', 'status.color', 'status.error.color'];
  for (const system of systems) {
    const model = await modelOf(system);
    assert.deepEqual(Object.keys(model.tokens).filter((id) => id.startsWith(`${NS}.combobox.status.`)).map((id) => id.slice(`${NS}.combobox.`.length)).sort(), [...STATUS].sort(), `${system}: a status token that joined or left is named here`);
    const differing = [];
    for (const scheme of model.schemes) {
      for (const name of STATUS) {
        const [a, b] = [inScheme(model, scheme, `${NS}.combobox.${name}`), inScheme(model, scheme, `${NS}.search.${name}`)];
        if (a !== b) differing.push(`[${system} ${scheme}] comp.combobox.${name} ${a} ≠ comp.search.${name} ${b}`);
      }
    }
    assert.deepEqual(differing, []);
  }
});

test('the list comparison is not vacuous: the chosen row is the menu\'s checked row, state by state, and a value that moves is found', async () => {
  const model = structuredClone(await modelOf(DEFAULT_SYSTEM));
  const { pairs } = listPairs(model, 'select');
  const pair = (mine) => pairs.find(([id]) => id === `${NS}.select.${mine}`)?.[1];
  assert.equal(pair('stacked.selected-option.container.color'), `${MENU}.selected.container.color`);
  assert.equal(pair('outlined.hovered.selected-option.container.color'), `${MENU}.selected.hovered.container.color`);
  assert.equal(pair('filled.disabled.option.label.color'), `${MENU}.unselected.disabled.label.color`);
  assert.equal(pair('list.color'), `${MENU}.surface.color`);
  assert.equal(pair('option.height'), `${MENU}.container.height`);
  // The default system draws a checked row as a layer of its content color, per scheme: the value
  // compared is the one in force in that scheme.
  const id = `${NS}.select.stacked.selected-option.container.color`;
  assert.equal(inScheme(model, 'dark', id), inScheme(model, 'dark', `${MENU}.selected.container.color`));
  model.componentColors.dark[id].value = model.colors.dark.primary.value;
  assert.notEqual(inScheme(model, 'dark', id), inScheme(model, 'dark', `${MENU}.selected.container.color`));
});
