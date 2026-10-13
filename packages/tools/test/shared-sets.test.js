// A set of tokens several components read and that is no component: `comp.input-box`, the box of the
// text input, the select, the combobox, the number input and the color input. What `validate` holds of such a set,
// each rule on groups written here that fail it, and all of them on the repository as it is.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SHARED_SET, checkParity, offeredValues, sharedSetProblems, validateSharedSets, validateSpecs } from '../src/checks.js';
import { CONFIG, loadSpecs, read } from '../src/conventions.js';

const leaf = { $value: '{x}' };
const set = (readers, rest = {}, extra = {}) => ({ group: { $extensions: { [SHARED_SET]: { readers, ...extra } }, container: { shape: leaf, height: { medium: leaf } }, motion: { 'state-duration': leaf }, ...rest }, file: 'tokens/comp/box.tokens.json' });
const own = (name, tokens) => ({ group: tokens, file: `tokens/comp/${name}.tokens.json` });
const problemsOf = (groups, inventory = ['a', 'b'], retired = []) => sharedSetProblems(new Map(Object.entries(groups)), new Set(inventory), new Set(retired));

test('the repository holds the rule: every group is a component or a set that names its readers, and no reader repeats a name', () => {
  assert.deepEqual(validateSharedSets(), []);
});

test('`validate` runs the check: validateSharedSets is part of what validateSpecs returns', () => {
  assert.match(validateSpecs.toString(), /validateSharedSets\(\)/);
});

test('the extension is named from the configured namespace', () => {
  assert.equal(SHARED_SET, `dev.${CONFIG.namespace}.shared`);
});

test('the box is the one shared set today: five readers, each a component with a spec that says so in a sentence', () => {
  const box = JSON.parse(read('tokens/comp/input-box.tokens.json'))[CONFIG.namespace].comp['input-box'];
  const { readers, alsoIn } = box.$extensions[SHARED_SET];
  assert.deepEqual(readers, ['text-input', 'select', 'combobox', 'number-input', 'color-input']);
  // The rows of a list change state over the same two names and are faded by the same three: the readers with a list keep them.
  assert.deepEqual(alsoIn, { select: ['motion.state-duration', 'motion.state-easing'], combobox: ['motion.state-duration', 'motion.state-easing'] });
  const specs = new Map(loadSpecs().map(({ spec }) => [spec.name, spec]));
  for (const reader of readers) {
    const spec = specs.get(reader);
    assert.ok(spec.behavior.some((sentence) => /the group comp\.input-box/.test(sentence.text)), `${reader} has no sentence that names the set`);
    for (const axis of ['variant', 'size']) assert.equal(spec.props.find((prop) => prop.name === axis).axis, `${CONFIG.namespace}.comp.input-box.${axis}`, `${reader}.${axis}`);
  }
});

test('a group that is no component and names no reader is a problem; a component and a retired one are not', () => {
  assert.deepEqual(problemsOf({ a: own('a', { x: leaf }), stray: own('stray', { x: leaf }) }), [`tokens/comp/stray.tokens.json: comp.stray is not a component of specs/inventory.json and does not say which components read it (${SHARED_SET})`]);
  assert.deepEqual(problemsOf({ a: own('a', { x: leaf }), old: own('old', { x: leaf }) }, ['a'], ['old']), []);
});

test('a shared set is not a component, names two or more readers, and each is in the inventory', () => {
  assert.deepEqual(problemsOf({ a: set(['b', 'c']) }, ['a', 'b', 'c']), ['tokens/comp/box.tokens.json: comp.a is a component of the inventory and a shared set at once']);
  assert.deepEqual(problemsOf({ box: set(['a']) }), ['tokens/comp/box.tokens.json: a shared set names the two or more components that read it']);
  assert.deepEqual(problemsOf({ box: set('a') }), ['tokens/comp/box.tokens.json: a shared set names the two or more components that read it']);
  assert.deepEqual(problemsOf({ box: set(['a', 'ghost']) }), ['tokens/comp/box.tokens.json: reader "ghost" is not in specs/inventory.json']);
});

test('a reader whose own group repeats a name of the set is a problem, by name: a copy cannot come back', () => {
  const groups = { box: set(['a', 'b']), a: own('a', { container: { shape: leaf }, list: { color: leaf } }), b: own('b', { swatch: { shape: leaf } }) };
  assert.deepEqual(problemsOf(groups), ['tokens/comp/box.tokens.json: comp.a.container.shape repeats comp.box.container.shape: a reader draws that part from the shared set alone']);
  // A group that is no reader may have the same name: a card's corner is not the box's.
  assert.deepEqual(problemsOf({ ...groups, a: own('a', { list: { color: leaf } }), c: own('c', { container: { shape: leaf } }) }, ['a', 'b', 'c']), []);
});

test('a name a reader keeps for a part of its own is listed under alsoIn for that reader, and only there', () => {
  const rows = { motion: { 'state-duration': leaf }, option: { height: leaf } };
  assert.deepEqual(problemsOf({ box: set(['a', 'b']), a: own('a', rows) }), ['tokens/comp/box.tokens.json: comp.a.motion.state-duration repeats comp.box.motion.state-duration: a reader draws that part from the shared set alone']);
  assert.deepEqual(problemsOf({ box: set(['a', 'b'], {}, { alsoIn: { a: ['motion.state-duration'] } }), a: own('a', rows) }), []);
  // What is listed for one reader does not excuse another.
  assert.equal(problemsOf({ box: set(['a', 'b'], {}, { alsoIn: { a: ['motion.state-duration'] } }), a: own('a', rows), b: own('b', rows) }).length, 1);
  assert.deepEqual(problemsOf({ box: set(['a', 'b'], {}, { alsoIn: { c: ['motion.state-duration'] } }) }, ['a', 'b', 'c']), ['tokens/comp/box.tokens.json: alsoIn names "c", which is not one of the set\'s readers']);
});

test('a reader of a shared axis lists the values its component offers, in the axis\'s order; any other axis is listed whole', () => {
  const shared = { $extensions: { [SHARED_SET]: { readers: ['a', 'b'] } } };
  const sizes = ['small', 'medium', 'large'];
  assert.deepEqual(offeredValues(shared, sizes, ['medium', 'large']), ['medium', 'large']);
  assert.deepEqual(offeredValues(shared, sizes, sizes), sizes);
  // Out of the axis's order, or with a value the axis does not have: what is returned is not what the prop lists, so the parity check reports it.
  assert.notDeepEqual(offeredValues(shared, sizes, ['large', 'medium']), ['large', 'medium']);
  assert.notDeepEqual(offeredValues(shared, sizes, ['medium', 'huge']), ['medium', 'huge']);
  // A component's own axis is listed whole.
  assert.deepEqual(offeredValues({ $extensions: {} }, sizes, ['medium', 'large']), sizes);
  assert.deepEqual(offeredValues({}, sizes, ['medium', 'large']), sizes);
});

test('the repository: every control drawn in the box offers its three sizes, and the parity check holds them', () => {
  const sizesOf = (name) => loadSpecs().find(({ spec }) => spec.name === name).spec.props.find((prop) => prop.name === 'size').values;
  for (const name of ['select', 'text-input', 'combobox', 'number-input', 'color-input']) assert.deepEqual(sizesOf(name), ['small', 'medium', 'large'], name);
  assert.deepEqual(checkParity().filter((problem) => /names the axis|but the axis/.test(problem)), []);
});
