// The box of the text input, the select, the combobox, the number input and the color input is one set of tokens,
// `comp.input-box`. It is no component: its document names the components that read it. What is held
// here, on the token sources as written:
//
//   the looks agree   a reader whose own group still declares looks, for parts of its own (a select's and a
//                     combobox's options), declares the box's looks, in the box's order and
//                     with the box's default — so that a layer that adds a look to the box is told to
//                     add it there too, and no reader offers a look the box cannot be drawn in;
//   the states        the box has no pressed state (no box is drawn pressed), and a reader with a list has it, for
//                     its rows;
//   the sizes         the box alone has a size axis: no reader declares one, so a size is a measure of the box;
//   the heights       a stacked box is as tall as a Button of the same size in the default system (the invariant that
//                     every control of one step of the height ladder is as tall as the step), and a preset keeps its
//                     own.
//
// That no reader's group repeats a name of the box is a rule of `validate` (packages/tools/src/checks.js,
// `validateSharedSets`), tested with the tools.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { checkInvariants } from '../src/invariants.js';
import { CONFIG, REPO_ROOT, buildModel } from '../src/model.js';

const BOX = 'input-box';
const extension = (name) => `dev.${CONFIG.namespace}.${name}`;
const groupOf = (name) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `tokens/comp/${name}.tokens.json`), 'utf8'))[CONFIG.namespace].comp[name];
const box = groupOf(BOX);
const readers = box.$extensions[extension('shared')].readers;

/** What a reader's declaration of looks must be, given the box's: the problems, by name. */
export function lookProblems(reader, group, boxGroup = box) {
  const [mine, shared] = [group.$extensions?.[extension('states')], boxGroup.$extensions[extension('states')]];
  const problems = [];
  if (!mine) return problems;
  if (JSON.stringify(mine.variants) !== JSON.stringify(shared.variants)) problems.push(`comp.${reader} declares the looks ${mine.variants.join(', ')}; the box has ${shared.variants.join(', ')}`);
  const [myAxis, boxAxis] = [group.$extensions[extension('axes')]?.variant, boxGroup.$extensions[extension('axes')].variant];
  if (myAxis && myAxis.default !== boxAxis.default) problems.push(`comp.${reader} defaults to the look "${myAxis.default}"; the box defaults to "${boxAxis.default}"`);
  return problems;
}

test('the box names its readers, and each of them has a document', () => {
  assert.deepEqual(readers, ['text-input', 'select', 'combobox', 'number-input', 'color-input']);
  for (const reader of readers) assert.ok(groupOf(reader), reader);
});

test('a reader that declares looks for parts of its own declares the box\'s looks, in its order, with its default', () => {
  const declaring = readers.filter((reader) => groupOf(reader).$extensions[extension('states')]);
  // The select's and the combobox's options are colored per look; a text input's resize handle is a Handle, drawn from
  // its own tokens, and a number input's steppers and a color input's swatch are not.
  assert.deepEqual(declaring, ['select', 'combobox']);
  assert.deepEqual(readers.flatMap((reader) => lookProblems(reader, groupOf(reader))), []);
});

test('the comparison is not vacuous: a look the box gains and a reader lacks is found, by name', () => {
  const grown = structuredClone(box);
  grown.$extensions[extension('states')].variants.push('tinted');
  assert.deepEqual(lookProblems('select', groupOf('select'), grown), ['comp.select declares the looks stacked, filled, outlined; the box has stacked, filled, outlined, tinted']);
  const other = structuredClone(groupOf('combobox'));
  other.$extensions[extension('axes')].variant.default = 'outlined';
  assert.deepEqual(lookProblems('combobox', other), ['comp.combobox defaults to the look "outlined"; the box defaults to "stacked"']);
});

test('the box has no pressed state; a reader with a list has one, for its rows', () => {
  assert.deepEqual(box.$extensions[extension('states')].states, ['hovered', 'focused', 'disabled']);
  for (const reader of ['select', 'combobox']) assert.ok(groupOf(reader).$extensions[extension('states')].states.includes('pressed'), reader);
});

test('a size is a measure of the box: the box alone declares the size axis, with every size a reader offers', () => {
  assert.deepEqual(box.$extensions[extension('axes')].size.values, ['small', 'medium', 'large']);
  assert.equal(box.$extensions[extension('axes')].size.default, 'medium');
  for (const reader of readers) assert.equal(groupOf(reader).$extensions[extension('axes')]?.size, undefined, `comp.${reader} declares a size axis of its own`);
  for (const size of box.$extensions[extension('axes')].size.values) assert.ok(box.container.height[size], `the box has no height at ${size}`);
});

test('a stacked box is as tall as a Button of the same size; a box that floats its label keeps the taller height', async () => {
  const model = await buildModel();
  const px = (id) => model.tokens[`${CONFIG.namespace}.comp.${id}`].value.value;
  // The small one is held at the default system's minimum target (36), as the small Button is.
  for (const [size, height] of [['small', 36], ['medium', 40], ['large', 56]]) {
    assert.equal(px(`${BOX}.stacked.container.height.${size}`), height, size);
    assert.equal(px(`button.container.height.${size}`), height, size);
  }
  assert.deepEqual(['small', 'medium', 'large'].map((size) => px(`${BOX}.container.height.${size}`)), [40, 48, 56]);
  // A line of the size's input text fits in the stacked height, with the stacked padding above and below it.
  for (const size of ['small', 'medium', 'large']) {
    const type = model.tokens[`${CONFIG.namespace}.comp.${BOX}.input.typescale.${size}`].value;
    const line = type.lineHeight * type.fontSize.value;
    assert.ok(2 * px(`${BOX}.stacked.container.padding-block.${size}`) + line <= px(`${BOX}.stacked.container.height.${size}`), `${size}: the padding and a line overflow the height`);
  }
});

test('the invariant refuses a stacked height that is not its ladder step\'s, and so not the Button\'s, in the default system only', async () => {
  const model = await buildModel();
  const id = `${CONFIG.namespace}.comp.${BOX}.stacked.container.height.medium`;
  const moved = { ...model, tokens: { ...model.tokens, [id]: { ...model.tokens[id], value: { value: 48, unit: 'px' } } } };
  const about = (failures) => failures.filter((f) => f.includes('size is as tall as sys.control.height.'));
  assert.deepEqual(about(checkInvariants(model)), []);
  const failures = about(checkInvariants(moved));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0], /^comp\.input-box\.stacked\.container\.height\.medium: 48px, but a control of the medium size is as tall as sys\.control\.height\.medium \(40px\) — read the step/);
  // A floored one names the minimum it is held at.
  const small = `${CONFIG.namespace}.comp.button.container.height.small`;
  const pinned = about(checkInvariants({ ...model, tokens: { ...model.tokens, [small]: { ...model.tokens[small], value: { value: 32, unit: 'px' } } } }));
  assert.deepEqual(pinned, [`comp.button.container.height.small: 32px, but a control of the small size is as tall as sys.control.height.small (32px), held at sys.target.minimum (36px) — read the step, { "fn": "mul", "of": "{${CONFIG.namespace}.sys.control.height.small}", "by": 1, "min": "{${CONFIG.namespace}.sys.target.minimum}" }`]);
  assert.deepEqual(about(checkInvariants({ ...moved, system: 'm3-like' })), []);
});
