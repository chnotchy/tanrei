// Icon-set data: the shipped file is valid, every shipped system finds its set by its icon family, and
// the checks refuse what would make the list untrustworthy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { checkIconSets, emitIconSetsTs, iconSetFor, loadIconSets, validateIconSets } from '../src/icon-sets.js';
import { REPO_ROOT } from '../src/model.js';

const schema = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tokens/schema/icon-set.schema.json'), 'utf8'));
const sets = loadIconSets(REPO_ROOT);
const material = sets.find(({ fileId }) => fileId === 'material-symbols').doc;

test('the shipped icon-set files are valid', () => {
  assert.deepEqual(validateIconSets(REPO_ROOT), []);
});

test('Material Symbols mirrors what points along the line and nothing a spec forbids', () => {
  for (const name of ['arrow_back', 'arrow_forward', 'chevron_right', 'send', 'menu_open', 'open_in_new', 'help']) assert.ok(material.mirrored.includes(name), name);
  for (const name of ['check', 'close', 'cancel', 'search', 'remove', 'play_arrow', 'pause', 'expand_more', 'expand_less', 'arrow_upward', 'arrow_downward', 'info', 'warning', 'error', 'check_circle', 'calendar_month', 'schedule']) assert.ok(!material.mirrored.includes(name), name);
});

test('a system gets the set that describes the first family of its icon stack, or none', () => {
  for (const family of ['Material Symbols Rounded', 'Material Symbols Outlined', 'Material Symbols Sharp']) assert.equal(iconSetFor(sets, [family, 'sans-serif'])?.id, 'material-symbols');
  assert.equal(iconSetFor(sets, ['Material Icons Outlined']), null);
  assert.equal(iconSetFor(sets, ['Some Font', 'Material Symbols Rounded']), null);
  assert.equal(iconSetFor(sets, undefined), null);
});

test('the checks refuse a wrong id, an unsorted list, a shared family, a missing source and a malformed name', () => {
  const doc = (over) => ({ fileId: 'mine', doc: { id: 'mine', name: 'Mine', families: ['Mine'], source: material.source, mirrored: ['a', 'b'], ...over } });
  assert.deepEqual(checkIconSets(schema, [doc({})]), []);
  assert.match(checkIconSets(schema, [doc({ id: 'other' })]).join('\n'), /"id" must equal the file name/);
  assert.match(checkIconSets(schema, [doc({ mirrored: ['b', 'a'] })]).join('\n'), /not sorted/);
  assert.match(checkIconSets(schema, [doc({}), { fileId: 'theirs', doc: { ...doc({}).doc, id: 'theirs' } }]).join('\n'), /already described by mine/);
  assert.match(checkIconSets(schema, [doc({ source: undefined })]).join('\n'), /names its "source"/);
  assert.match(checkIconSets(schema, [doc({ mirrored: ['Arrow-Back'] })]).join('\n'), /must match pattern/);
  assert.match(checkIconSets(schema, [doc({ extra: true })]).join('\n'), /additional properties/);
});

test('the web module lists each set once and each system\'s set', () => {
  const text = emitIconSetsTs(sets, { tanrei: 'material-symbols', other: null });
  assert.match(text, /^\/\/ GENERATED FILE/);
  assert.match(text, /"material-symbols": \{\n {4}families: \["Material Symbols Rounded","Material Symbols Outlined","Material Symbols Sharp"\]/);
  assert.match(text, /"tanrei": "material-symbols",\n {2}"other": null,/);
  assert.equal((text.match(/"arrow_back"/g) ?? []).length, 1);
});
