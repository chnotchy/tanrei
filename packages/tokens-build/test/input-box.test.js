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
//   the sizes         the box alone has a size axis: no reader declares one, so a size is a measure of the box.
//
// That no reader's group repeats a name of the box is a rule of `validate` (packages/tools/src/checks.js,
// `validateSharedSets`), tested with the tools.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { CONFIG, REPO_ROOT } from '../src/model.js';

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
