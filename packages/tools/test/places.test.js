// The places of the product's words: how a word with places is read,
// what the schema takes as a place, and what `validate` holds of the places a spec declares — each rule (P1 to P7) on a
// spec written here that fails it, and all of them on the repository as it is.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileSpecSchema, validatePlaces } from '../src/checks.js';
import { loadSpecs } from '../src/conventions.js';
import { fillPlaces, placesProblems, readPlaces } from '../src/places.js';

const count = { name: 'count', kind: 'number', description: 'How many there are.' };
const entry = { name: 'entry', kind: 'text', description: 'The text of the entry.' };
/** A string prop whose description writes the places given, as a spec's does. */
const word = (name, places, rest = {}) => ({
  name,
  type: 'string',
  default: '',
  description: `A sentence of the product's, such as "${places.map((p) => `{${p.name}}`).join(' ')}".`,
  ...(places.length ? { places } : {}),
  ...rest,
});
const spec = (name, rest = {}) => ({ file: `specs/${name}.spec.json`, spec: { name, props: [], behavior: [], fixtures: [], ...rest } });
const problemsOf = (...specs) => placesProblems(specs);

test('a word with places is read from left to right: a doubled brace, then a place, then a brace that opens nothing', () => {
  const names = ['headline', 'position', 'count'];
  const filled = (sentence) => fillPlaces(sentence, { headline: 'Body font', position: '2', count: '3' });
  // §1.4: every occurrence is filled, and a place may be left out.
  assert.equal(filled('{headline}: {position} of {count}'), 'Body font: 2 of 3');
  assert.equal(filled('{count} 件中 {position} 番目、{count} 件'), '3 件中 2 番目、3 件');
  assert.equal(filled('Moved'), 'Moved');
  assert.deepEqual(readPlaces('{headline}: {position}', names).runs, [{ place: 'headline' }, { text: ': ' }, { place: 'position' }]);
  assert.deepEqual([...readPlaces('{count} {count}', names).used], ['count']);
  // §4.1: an unknown place is kept as written, and named once however often it is written.
  assert.equal(filled('{headline} {place}'), 'Body font {place}');
  assert.deepEqual(readPlaces('{place} {place} { count }', names).unknown, ['{place}', '{ count }']);
  assert.equal(filled('{ count }'), '{ count }', 'a name has no spaces');
  assert.equal(filled('{}'), '{}');
  // §4.2: a brace that opens or closes nothing is kept and counted.
  assert.equal(filled('{headline} {'), 'Body font {');
  assert.equal(readPlaces('{headline} {', names).stray, 1);
  assert.equal(readPlaces('} {count', names).stray, 2);
  assert.equal(filled('{a{count}'), '{a3');
  assert.deepEqual({ stray: readPlaces('{a{count}', names).stray, unknown: readPlaces('{a{count}', names).unknown }, { stray: 1, unknown: [] });
  // §5: a brace written twice is one brace, and nothing between doubled braces is filled.
  assert.equal(filled('{{headline}} {position}'), '{headline} 2');
  assert.equal(filled('{{'), '{');
  assert.equal(filled('}}'), '}');
  assert.equal(filled('{count}}}'), '3}');
  assert.deepEqual({ stray: readPlaces('{{count}} {count}}}', names).stray, unknown: readPlaces('{{count}} {count}}}', names).unknown }, { stray: 0, unknown: [] });
  // §2.2: what fills a place is not read again.
  assert.equal(fillPlaces('{headline}', { headline: '{count} {{', count: '3' }), '{count} {{');
});

test('the schema takes a place with a name, one of two kinds and a description; `required` is written only as true', () => {
  const validate = compileSpecSchema();
  const { spec: list } = loadSpecs().find(({ spec: each }) => each.name === 'list');
  assert.equal(validate(list), true, JSON.stringify(validate.errors));
  const withPlaces = (places) => ({ ...list, props: list.props.map((p) => (p.name === 'movedText' ? { ...p, places } : p)) });
  assert.equal(validate(withPlaces([count, { ...entry, required: true }])), true, JSON.stringify(validate.errors));
  for (const [what, places] of [
    ['an empty list', []],
    ['a kind that is neither', [{ ...count, kind: 'date' }]],
    ['a name with a space', [{ ...count, name: 'the count' }]],
    ['a name that begins with a capital', [{ ...count, name: 'Count' }]],
    ['no description', [{ name: 'count', kind: 'number' }]],
    ['required: false', [{ ...count, required: false }]],
    ['a field of its own', [{ ...count, example: '3' }]],
  ]) {
    assert.equal(validate(withPlaces(places)), false, what);
  }
});

test('P1: only a string prop has places', () => {
  const problems = problemsOf(spec('a', { props: [word('total', [count], { type: 'number' })] }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /specs\/a\.spec\.json: prop "total" has places but is not a string \(P1\)/);
});

test('P2: a prop names a place once, and `required` is written only where it is true', () => {
  const twice = problemsOf(spec('a', { props: [word('addedText', [count, count])] }));
  assert.ok(twice.some((p) => /declares the place "count" twice \(P2\)/.test(p)), twice.join('\n'));
  const optional = problemsOf(spec('a', { props: [word('addedText', [{ ...count, required: false }])] }));
  assert.ok(optional.some((p) => /`required` is written only where it is true \(P2\)/.test(p)), optional.join('\n'));
  const named = problemsOf(spec('a', { props: [{ ...word('addedText', [{ ...count, name: 'the-count' }]), description: 'How many.' }] }));
  assert.ok(named.some((p) => /"the-count" is not a place's name \(P2\)/.test(p)), named.join('\n'));
});

test('P3: the description writes each declared place and no other; a prop without places writes none', () => {
  const silent = problemsOf(spec('a', { props: [{ ...word('addedText', [count]), description: 'What is said when entries are made.' }] }));
  assert.deepEqual(silent, ['specs/a.spec.json: prop "addedText": its description does not write the place {count} (P3)']);
  const other = problemsOf(spec('a', { props: [{ ...word('addedText', [count]), description: 'Such as "{count} of {total}".' }] }));
  assert.deepEqual(other, ['specs/a.spec.json: prop "addedText": its description writes {total}, which it does not declare (P3)']);
  const undeclared = problemsOf(spec('a', { props: [{ ...word('addedText', []), description: 'Such as "Added {count}".' }] }));
  assert.deepEqual(undeclared, ['specs/a.spec.json: prop "addedText": its description writes {count} and the prop declares no places (P3)']);
  // A description quotes whole sentences: punctuation beside a place, and braces that hold no name, are not places.
  assert.deepEqual(problemsOf(spec('a', { props: [{ ...word('addedText', [count]), description: 'Such as 「{count} 件」 or "({count})"; a brace is written twice ({{).' }] })), []);
});

test('P4: a fixture writes only declared places, no stray brace, and every place that is needed — on the component and on an item of the kind', () => {
  const needed = { ...entry, required: true };
  const a = spec('a', {
    props: [word('removeLabel', [needed]), word('label', [])],
    items: [{ name: 'row', props: [word('entryRemoveLabel', [needed])] }],
    fixtures: [
      { id: 'right', props: { removeLabel: 'Remove {entry}' }, items: [{ kind: 'row', props: { entryRemoveLabel: '{entry} を削除' } }] },
      { id: 'doubled', props: { removeLabel: '{{x}} {entry}' } },
      { id: 'empty', props: { removeLabel: '' } },
      // A prop without places is not read at all: its braces are plain text.
      { id: 'plain', props: { label: 'Braces { } {anything}' } },
      { id: 'mistyped', props: { removeLabel: 'Remove {entri}' } },
      { id: 'lone', props: { removeLabel: 'Remove {entry} }' } },
      { id: 'without', props: { removeLabel: 'Remove' } },
      { id: 'nested', props: {}, items: [{ kind: 'group', props: {}, items: [{ kind: 'row', props: { entryRemoveLabel: 'Remove' } }] }] },
    ],
  });
  assert.deepEqual(problemsOf(a), [
    'specs/a.spec.json: fixture "mistyped": removeLabel writes {entri}, which is not a place of it ({entry}) (P4)',
    'specs/a.spec.json: fixture "mistyped": removeLabel is without the place {entry}, which it needs (P4)',
    'specs/a.spec.json: fixture "lone": removeLabel has a brace that opens or closes nothing; a brace is written twice (P4)',
    'specs/a.spec.json: fixture "without": removeLabel is without the place {entry}, which it needs (P4)',
    'specs/a.spec.json: fixture "nested": entryRemoveLabel is without the place {entry}, which it needs (P4)',
  ]);
  // A place that is not needed may be left out.
  assert.deepEqual(problemsOf(spec('b', { props: [word('addedText', [entry])], fixtures: [{ id: 'short', props: { addedText: 'Added' } }] })), []);
});

test('P5: a sentence of the behaviour writes only places some prop of the spec declares', () => {
  const a = spec('a', {
    props: [word('addedText', [count])],
    behavior: [
      { id: 'A-1', text: 'THE a SHALL fill {count} wherever the sentence has it.' },
      { id: 'A-2', text: 'THE a SHALL fill {total}.' },
    ],
  });
  assert.deepEqual(problemsOf(a), ['specs/a.spec.json: A-2 writes {total}, which no prop of the spec declares as a place (P5)']);
});

test('P6: props that read one key of the product\'s words declare the same places', () => {
  const a = spec('a', { props: [word('removeLabel', [{ ...entry, required: true }], { words: 'entryRemoveLabel' })] });
  const same = spec('b', { props: [word('removeLabel', [{ ...entry, required: true, description: 'Said otherwise.' }], { words: 'entryRemoveLabel' })] });
  assert.deepEqual(problemsOf(a, same), [], 'a description may differ: the names, the kinds and what is needed may not');
  const optional = spec('c', { props: [word('removeLabel', [entry], { words: 'entryRemoveLabel' })] });
  assert.deepEqual(problemsOf(a, optional), ['specs/c.spec.json: prop "removeLabel" reads the key "entryRemoveLabel" with other places than a.removeLabel (P6)']);
  const none = spec('d', { props: [word('removeLabel', [], { words: 'entryRemoveLabel' })] });
  assert.deepEqual(problemsOf(a, none), ['specs/d.spec.json: prop "removeLabel" reads the key "entryRemoveLabel" with other places than a.removeLabel (P6)']);
  const item = spec('e', { items: [{ name: 'row', props: [word('removeLabel', [count], { words: 'entryRemoveLabel' })] }] });
  assert.ok(problemsOf(a, item).some((p) => /item "row" prop "removeLabel" reads the key "entryRemoveLabel" with other places than a\.removeLabel \(P6\)/.test(p)));
});

test('P7: one name has one kind in every spec', () => {
  const a = spec('a', { props: [word('addedText', [count])] });
  const b = spec('b', { props: [word('totalText', [{ ...count, kind: 'text' }])] });
  assert.deepEqual(problemsOf(a, b), ['specs/b.spec.json: prop "totalText": the place "count" is a text here and a number in a.addedText (P7)']);
});

test('a forwarded prop and a forwarded item kind are not read: their places are their member\'s', () => {
  const composed = spec('field', {
    props: [{ name: 'removeLabel', from: 'chip-field.removeLabel' }],
    items: [{ name: 'chip-field', from: 'chip-field.entry' }],
    fixtures: [{ id: 'f', props: { removeLabel: 'Remove {entri}' } }],
  });
  assert.deepEqual(problemsOf(composed), []);
});

test('the repository: seven props of four specs declare places, three names of two kinds, and `validate` has nothing to report', () => {
  assert.deepEqual(validatePlaces(), []);
  const declared = loadSpecs().flatMap(({ spec: each }) => [
    ...each.props.filter((p) => p.places).map((p) => `${each.name}.${p.name}`),
    ...(each.items ?? []).flatMap((kind) => (kind.props ?? []).filter((p) => p.places).map((p) => `${each.name}/${kind.name}.${p.name}`)),
  ]);
  assert.deepEqual(declared.sort(), ['chip-field.addedCountText', 'chip-field.addedText', 'chip-field.removeLabel', 'chip-field.removedText', 'field/text-input.entryRemoveLabel', 'image-preview.countText', 'list.movedText']);
  const kinds = new Map(loadSpecs().flatMap(({ spec: each }) => [...each.props, ...(each.items ?? []).flatMap((kind) => kind.props ?? [])].flatMap((p) => p.places ?? []).map((p) => [p.name, p.kind])));
  assert.deepEqual([...kinds].sort(), [['count', 'number'], ['entry', 'text'], ['headline', 'text'], ['position', 'number']]);
  // The one place of any spec that is needed: the name of an entry's remove action.
  const needed = loadSpecs().flatMap(({ spec: each }) => [...each.props, ...(each.items ?? []).flatMap((kind) => kind.props ?? [])].filter((p) => (p.places ?? []).some((place) => place.required)).map((p) => p.name));
  assert.deepEqual(needed.sort(), ['entryRemoveLabel', 'removeLabel']);
});
