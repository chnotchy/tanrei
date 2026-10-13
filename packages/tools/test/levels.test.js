// The levels of the components:
// what `validate` holds of `level`, `builtFrom` and `uses`, each check on a spec written here that fails it, and all of
// them on the repository as it is.
//
// Nothing here writes a level's name: a test asks the tools' constant (src/levels.js) for the level of a single part,
// of components that complete one value or job, and of controls a component coordinates.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileSpecSchema, validateLevels } from '../src/checks.js';
import { loadSpecs, read } from '../src/conventions.js';
import { FEATURE_EVENTS, LEVELS, builtFromCycle, levelCounts, levelProblems, namedComponents, reportedEvents } from '../src/levels.js';
import { buildStatus, levelLine, statusFiles } from '../src/status.js';

const schema = () => JSON.parse(read('specs/component.schema.json'));

/** A spec as far as the levels read it. */
const spec = (name, level, rest = {}) => ({ file: `specs/${name}.spec.json`, spec: { name, level, tokens: `comp.${name}`, ...rest } });
/** An inventory of the specs given, each at its own level. */
const listed = (specs) => specs.map(({ spec: { name, level } }) => ({ name, level }));
const problemsOf = (specs, components = listed(specs)) => levelProblems(specs, components);
/** Two events: what a component of the third level has at least. */
const twoEvents = { events: [{ name: 'change' }, { name: 'send' }] };

test('the three names are written in the schema and in one constant, and the two agree', () => {
  assert.deepEqual(Object.values(LEVELS), schema().properties.level.enum);
  assert.deepEqual(Object.keys(LEVELS), ['single', 'completes', 'coordinates']);
  assert.equal(new Set(Object.values(LEVELS)).size, 3);
  assert.ok(schema().required.includes('level'), 'every spec has a level');
});

test('a spec without a level, or with a level that is not one of the three, fails the schema', () => {
  const validate = compileSpecSchema();
  const { spec: button } = loadSpecs().find(({ spec }) => spec.name === 'button');
  assert.equal(validate(button), true);
  const { level: _level, ...without } = button;
  assert.equal(validate(without), false);
  assert.ok(validate.errors.some((e) => e.params.missingProperty === 'level'), JSON.stringify(validate.errors));
  assert.equal(validate({ ...button, level: 'neither' }), false);
  for (const level of Object.values(LEVELS)) assert.equal(validate({ ...button, level }), true, level);
  // `builtFrom` and `uses` are lists of names, each once, and never an empty list: a component that names none leaves it out.
  for (const key of ['builtFrom', 'uses']) {
    assert.equal(validate({ ...button, [key]: [] }), false, key);
    assert.equal(validate({ ...button, [key]: ['tag', 'tag'] }), false, key);
    assert.equal(validate({ ...button, [key]: ['Tag'] }), false, key);
    assert.equal(validate({ ...button, [key]: ['tag'] }), true, key);
  }
});

test('the levels of the repository hold: every check, on every spec and the inventory', () => {
  assert.deepEqual(validateLevels(), []);
});

test('a spec whose level is not the inventory\'s is a problem, and so is an inventory row with no level', () => {
  const specs = [spec('a', LEVELS.single)];
  assert.deepEqual(problemsOf(specs), []);
  assert.match(problemsOf(specs, [{ name: 'a', level: LEVELS.completes }]).join('\n'), /specs\/a\.spec\.json: level is ".+", but specs\/inventory\.json says ".+"/);
  assert.match(problemsOf(specs, [{ name: 'a' }]).join('\n'), /specs\/inventory\.json: "a" has no level/);
});

test('a single part has no member: a builtFrom at the first level is a problem, and what it uses for a small part is not', () => {
  const member = spec('member', LEVELS.single);
  assert.match(problemsOf([spec('part', LEVELS.single, { builtFrom: ['member'] }), member]).join('\n'), /specs\/part\.spec\.json: a single part is built from no other component, and builtFrom names member/);
  assert.deepEqual(problemsOf([spec('part', LEVELS.single, { uses: ['member'] }), member]), []);
  assert.deepEqual(problemsOf([member]), []);
});

test('a component put together from others names them: an empty builtFrom at the second level is a problem', () => {
  const member = spec('member', LEVELS.single);
  assert.match(problemsOf([spec('set', LEVELS.completes), member]).join('\n'), /specs\/set\.spec\.json: .*builtFrom is empty/);
  // What it uses for a small part is not a member.
  assert.match(problemsOf([spec('set', LEVELS.completes, { uses: ['member'] }), member]).join('\n'), /builtFrom is empty/);
  assert.deepEqual(problemsOf([spec('set', LEVELS.completes, { builtFrom: ['member'] }), member]), []);
  // Depth is not a level: one put together from one that is put together is of the second level still.
  assert.deepEqual(problemsOf([spec('outer', LEVELS.completes, { builtFrom: ['set'] }), spec('set', LEVELS.completes, { builtFrom: ['member'] }), member]), []);
});

test('a component of the second level is built from none of the third; one of the third may be', () => {
  const whole = spec('whole', LEVELS.coordinates, twoEvents);
  assert.match(problemsOf([spec('set', LEVELS.completes, { builtFrom: ['whole'] }), whole]).join('\n'), /specs\/set\.spec\.json: it is built from "whole", which is of the level ".+": what holds several coordinated controls is of that level itself/);
  assert.deepEqual(problemsOf([spec('larger', LEVELS.coordinates, { ...twoEvents, builtFrom: ['whole'] }), whole]), []);
  // Using one for a small part, or laying one out for the product, raises nothing.
  assert.deepEqual(problemsOf([spec('frame', LEVELS.single, { uses: ['whole'] }), whole]), []);
});

test('a component of the third level reports two or more things, and need name no member: its controls may be its own', () => {
  assert.equal(FEATURE_EVENTS, 2);
  assert.deepEqual(problemsOf([spec('whole', LEVELS.coordinates, twoEvents)]), []);
  assert.match(problemsOf([spec('whole', LEVELS.coordinates, { events: [{ name: 'change' }] })]).join('\n'), /specs\/whole\.spec\.json: .*reports 2 or more different things, and it has 1 event\(s\)/);
  assert.match(problemsOf([spec('whole', LEVELS.coordinates)]).join('\n'), /it has 0 event\(s\)/);
  // What an item kind reports is the component's to report: a row's retry beside the component's change.
  const rows = { events: [{ name: 'change' }], items: [{ name: 'row', events: [{ name: 'retry' }] }] };
  assert.equal(reportedEvents(rows), 2);
  assert.deepEqual(problemsOf([spec('whole', LEVELS.coordinates, rows)]), []);
  // The other two levels are not counted: a single part may report many things (a list's selection and its order).
  assert.deepEqual(problemsOf([spec('part', LEVELS.single, { events: [{ name: 'change' }, { name: 'move' }, { name: 'toggle' }] })]), []);
});

test('a name in builtFrom or in uses that is no component of the inventory, or the component\'s own, or in both lists, is a problem', () => {
  const member = spec('member', LEVELS.single);
  assert.match(problemsOf([spec('set', LEVELS.completes, { builtFrom: ['member', 'nothing'] }), member]).join('\n'), /builtFrom names "nothing", which is not in specs\/inventory\.json/);
  assert.match(problemsOf([spec('part', LEVELS.single, { uses: ['nothing'] })]).join('\n'), /uses names "nothing", which is not in specs\/inventory\.json/);
  assert.match(problemsOf([spec('set', LEVELS.completes, { builtFrom: ['set'] })]).join('\n'), /specs\/set\.spec\.json: builtFrom names the component itself/);
  assert.match(problemsOf([spec('part', LEVELS.single, { uses: ['part'] })]).join('\n'), /specs\/part\.spec\.json: uses names the component itself/);
  assert.match(problemsOf([spec('set', LEVELS.completes, { builtFrom: ['member'], uses: ['member'] }), member]).join('\n'), /"member" is in builtFrom and in uses/);
});

test('a component an item kind is must be in builtFrom or in uses — but the component\'s own name', () => {
  const member = spec('member', LEVELS.single);
  const holds = (rest) => spec('holder', LEVELS.single, { ...rest, items: [{ name: 'action', component: 'member' }, { name: 'row' }] });
  assert.match(problemsOf([holds(), member]).join('\n'), /item kind "action" is component "member", which neither builtFrom nor uses lists/);
  // Laid out for the product, it is in `uses`; made into the component's one value, it is a member.
  assert.deepEqual(problemsOf([holds({ uses: ['member'] }), member]), []);
  assert.deepEqual(problemsOf([spec('group', LEVELS.completes, { builtFrom: ['member'], items: [{ name: 'option', component: 'member' }] }), member]), []);
  // A component whose set form holds its own kind (an avatar group's avatars) is not built from itself.
  assert.deepEqual(problemsOf([spec('one', LEVELS.single, { items: [{ name: 'member', component: 'one' }] })]), []);
});

test('a cycle through builtFrom and uses is a problem, named with its whole path, in each spec it passes through', () => {
  const specs = [spec('a', LEVELS.completes, { builtFrom: ['b'] }), spec('b', LEVELS.single, { uses: ['c'] }), spec('c', LEVELS.completes, { builtFrom: ['a'] }), spec('d', LEVELS.single, { uses: ['a'] })];
  assert.deepEqual(problemsOf(specs), [
    'specs/a.spec.json: builtFrom and uses make a cycle: a → b → c → a',
    'specs/b.spec.json: builtFrom and uses make a cycle: b → c → a → b',
    'specs/c.spec.json: builtFrom and uses make a cycle: c → a → b → c',
  ]);
  assert.deepEqual(namedComponents({ builtFrom: ['x'], uses: ['y'] }), ['x', 'y']);
  assert.deepEqual(namedComponents(undefined), []);
  // `d` leads into the cycle and is not on it; a diamond is not a cycle.
  assert.equal(builtFromCycle('d', (name) => namedComponents(specs.find(({ spec: each }) => each.name === name)?.spec)), null);
  const diamond = { top: ['left', 'right'], left: ['bottom'], right: ['bottom'], bottom: [] };
  for (const name of Object.keys(diamond)) assert.equal(builtFromCycle(name, (n) => diamond[n] ?? []), null, name);
});

test('a spec may name another component\'s token group only where it is built from that component', () => {
  const member = spec('member', LEVELS.single);
  const other = spec('other', LEVELS.single);
  const set = (builtFrom) => spec('set', LEVELS.completes, { builtFrom, tokens: 'comp.member' });
  assert.deepEqual(problemsOf([set(['member']), member, other]), []);
  assert.deepEqual(problemsOf([set(['other']), member, other]), ['specs/set.spec.json: tokens names "comp.member", the group of a component that builtFrom does not list']);
  // Using it for a small part is not being built from it: a single part's tokens are its own.
  assert.match(problemsOf([spec('part', LEVELS.single, { uses: ['member'], tokens: 'comp.member' }), member]).join('\n'), /tokens names "comp\.member"/);
});

test('the repository as it is today: 66 single parts, 15 put together, 4 that coordinate — and which', () => {
  const specs = loadSpecs().map(({ spec: each }) => each);
  assert.equal(specs.length, 85);
  const of = (level) => specs.filter((each) => each.level === level).map((each) => each.name).sort();
  assert.deepEqual(of(LEVELS.completes), ['button-with-menu', 'checkbox-group', 'chip-field', 'color-field', 'combobox-field', 'copy-button', 'date-time-picker', 'menubar', 'number-field', 'one-time-code-field', 'radio-group', 'select-field', 'slider-field', 'tab-view', 'text-field']);
  assert.deepEqual(of(LEVELS.coordinates), ['chat-composer', 'file-upload', 'image-preview', 'search']);
  assert.equal(of(LEVELS.single).length, 66);
  // No name was lost when the one list became two: 40 specs named another component, in one list or the other; the
  // one-time-code field is the forty-first, and the image preview the forty-second; the file picker (the product's Button is its
  // trigger) and the file item (its bar is a Progress indicator) make forty-four, and the file upload,
  // which named a Button and a Progress indicator before, is built from those two. The text field, which named a
  // Button for its picker button, is a Field around a Text input, and the Text input, which names that
  // Button now, is the forty-fifth; the single parts stay 64 — one became a composed field and one is new.
  // The slider field is a Field around a Slider and names both: one more that names another
  // component, and one more put together.
  // The checkbox group is the field group around Checkboxes and names both: the forty-seventh that
  // names another component, and the tenth put together.
  // The number field named a Button for its steppers and a Tag for its mark; it is a Field around a
  // Number input now, and the Number input, which names that Button, is one more that names another component.
  // The color field is a Field around a Color input, which names the Button of its picker button as
  // the color field did.
  // The select is the bare control and names no other component now; the select field, a Field around
  // it, names both : forty-nine still.
  // The combobox is the bare control and still names the Button of its clear button and the Loading
  // indicator; the combobox field, a Field around it, is the fiftieth.
  // The chip field is a Field around a Text input that holds Chips: the fifty-first that names
  // another component.
  // The embedded text input is a single part that names none; the chat composer, a
  // feature built from it, the File picker, the File item and the Button, is the fifty-second that names another
  // component and the fourth that coordinates.
  // The stepper is a single part that names no other component (its pressable steps and its glyphs are its own): 66.
  assert.equal(specs.filter((each) => namedComponents(each).length).length, 52);
  assert.deepEqual(specs.find((each) => each.name === 'text-field').builtFrom, ['field', 'text-input']);
  assert.deepEqual(specs.find((each) => each.name === 'text-input').uses, ['button']);
  assert.deepEqual(specs.find((each) => each.name === 'file-upload').builtFrom, ['file-picker', 'file-item']);
});

test('the status matrix carries the level: a column of the table, each row\'s level, members and uses in the data, and which name is which', () => {
  const status = buildStatus();
  assert.deepEqual(status.levels, LEVELS);
  const names = Object.values(LEVELS);
  for (const row of status.components) {
    assert.ok(names.includes(row.level), row.name);
    assert.ok(Array.isArray(row.builtFrom) && Array.isArray(row.uses), row.name);
    if (row.level === LEVELS.completes) assert.ok(row.builtFrom.length > 0, row.name);
    if (row.level === LEVELS.single) assert.equal(row.builtFrom.length, 0, row.name);
  }
  assert.equal(levelCounts(status.components).reduce((sum, { count }) => sum + count, 0), status.components.length);
  assert.equal(levelLine(status), levelCounts(status.components).map(({ level, count }) => `${count} ${level}`).join(' · '));
  // The row of each spec is its spec's.
  for (const { spec: each } of loadSpecs()) {
    const row = status.components.find((r) => r.name === each.name);
    assert.equal(row.level, each.level, each.name);
    assert.deepEqual(row.builtFrom, each.builtFrom ?? [], each.name);
    assert.deepEqual(row.uses, each.uses ?? [], each.name);
  }
  const table = statusFiles()['docs/status/STATUS.md'].split('\n');
  const head = table.find((line) => line.startsWith('| Component |'));
  const cells = (line) => line.split('|').slice(1, -1).map((cell) => cell.trim());
  assert.deepEqual(cells(head).slice(0, 5), ['Component', 'Level', 'Listing', 'Category', 'Spec']);
  const rows = table.slice(table.indexOf(head) + 2).filter((line) => line.startsWith('| '));
  assert.equal(rows.length, status.components.length);
  for (const [at, row] of status.components.entries()) {
    const [title, level] = cells(rows[at]);
    assert.equal(title, row.title);
    // A component with members says what it is built from, by the members' titles; one without says its level alone.
    if (row.builtFrom.length) assert.equal(level, `${row.level}: ${row.builtFrom.map((name) => status.components.find((c) => c.name === name).title).join(', ')}`);
    else assert.equal(level, row.level);
  }
  // Every row has as many cells as the head: the column did not shift the matrix.
  for (const line of rows) assert.equal(cells(line).length, cells(head).length, line);
});
