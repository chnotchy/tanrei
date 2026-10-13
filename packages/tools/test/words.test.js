import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSpecs } from '../src/conventions.js';
import { statusFiles } from '../src/status.js';
import { emitWordsTs, productWords } from '../src/words.js';

const spec = (name, props, items) => ({ name, props, ...(items ? { items } : {}) });
const text = (name, words) => ({ name, type: 'string', default: '', ...(words ? { words } : {}) });

test("the product's words are the keys the specs name, each with the props that read it", () => {
  const words = productWords([
    spec('snackbar', [text('closeLabel', 'closeLabel'), text('message')]),
    spec('callout', [text('closeLabel', 'closeLabel')]),
    spec('copy-button', [text('label', 'copyLabel')]),
    spec('menu', [text('label')], [{ name: 'item', props: [text('targetLabel', 'targetLabel'), text('label')] }]),
  ]);
  assert.deepEqual(words, [
    // Keys in alphabetical order; readers by component, whatever order the specs were read in.
    { key: 'closeLabel', readers: [{ component: 'callout', prop: 'closeLabel' }, { component: 'snackbar', prop: 'closeLabel' }] },
    // A key may differ from its prop's name.
    { key: 'copyLabel', readers: [{ component: 'copy-button', prop: 'label' }] },
    { key: 'targetLabel', readers: [{ component: 'menu', item: 'item', prop: 'targetLabel' }] },
  ]);
  const ts = emitWordsTs(words, 'acme');
  assert.match(ts, /^\/\/ GENERATED FILE — DO NOT EDIT\./);
  assert.match(ts, /export interface AcmeWords \{/, 'the type is named from the configured namespace');
  assert.match(ts, /\/\*\* Read by `callout\.closeLabel`, `snackbar\.closeLabel`\. \*\/\n {2}closeLabel\?: string;/);
  assert.match(ts, /export const wordKeys: readonly WordKey\[\] = \['closeLabel', 'copyLabel', 'targetLabel'\];/);
  assert.match(ts, /targetLabel: \['menu\/item\.targetLabel'\],/);
  assert.doesNotMatch(ts, /message/, 'a prop without the field is not a key');
});

test("the generated list holds every `words` field of the repository's specs, and no word", () => {
  const files = statusFiles();
  const { keys } = JSON.parse(files['docs/status/words.json']);
  const marked = loadSpecs().flatMap(({ spec }) => [...spec.props, ...(spec.items ?? []).flatMap((kind) => kind.props ?? [])]).filter((prop) => prop.words);
  assert.equal(keys.reduce((n, k) => n + k.readers.length, 0), marked.length);
  assert.deepEqual(keys.map((k) => k.key), [...new Set(marked.map((prop) => prop.words))].sort());
  for (const { key } of keys) assert.ok(files['packages/web/src/generated/words.ts'].includes(`  ${key}?: string;`), key);
  // Tanrei ships no words: the file names keys and props, and gives no value for any of them.
  assert.doesNotMatch(files['packages/web/src/generated/words.ts'], /\?: string = |: '[^']*',\n\};/);
});

test("a key whose word has places carries them, in the list and in the web's type", () => {
  const entry = { name: 'entry', kind: 'text', description: 'The text of the entry the action removes.', required: true };
  const count = { name: 'count', kind: 'number', description: 'How many entries were made at once.' };
  const words = productWords([
    spec('chip-field', [{ ...text('removeLabel', 'entryRemoveLabel'), places: [entry] }, { ...text('addedCountText', 'entriesAddedText'), places: [count] }, text('clearLabel', 'clearLabel')]),
    spec('field', [], [{ name: 'text-input', props: [{ ...text('removeLabel', 'entryRemoveLabel'), places: [entry] }] }]),
  ]);
  assert.deepEqual(words, [
    // A key without places has no such field.
    { key: 'clearLabel', readers: [{ component: 'chip-field', prop: 'clearLabel' }] },
    { key: 'entriesAddedText', readers: [{ component: 'chip-field', prop: 'addedCountText' }], places: [count] },
    // Every reader of one key declares the same places (`validate`, rule P6): the key has them once.
    { key: 'entryRemoveLabel', readers: [{ component: 'chip-field', prop: 'removeLabel' }, { component: 'field', item: 'text-input', prop: 'removeLabel' }], places: [entry] },
  ]);
  const ts = emitWordsTs(words, 'acme');
  assert.match(ts, /\/\*\* Read by `chip-field\.addedCountText`\. A word with places: `\{count\}` \(number\)\. \*\/\n {2}entriesAddedText\?: string;/);
  assert.match(ts, /A word with places: `\{entry\}` \(text, needed\)\. \*\/\n {2}entryRemoveLabel\?: string;/);
  assert.match(ts, /\/\*\* Read by `chip-field\.clearLabel`\. \*\/\n {2}clearLabel\?: string;/);
  assert.match(ts, /export const wordPlaces: Readonly<Partial<Record<WordKey, readonly WordPlace\[\]>>> = \{\n {2}entriesAddedText: \[\{ name: 'count', kind: 'number' \}\],\n {2}entryRemoveLabel: \[\{ name: 'entry', kind: 'text', required: true \}\],\n\};/);
  // A place's description is for the reader of the list; the constant a debug build reads holds no sentence.
  assert.doesNotMatch(ts, /How many entries/);
});

test("the repository's words: seventeen keys have places, and each is what its readers declare", () => {
  const files = statusFiles();
  const { keys } = JSON.parse(files['docs/status/words.json']);
  const withPlaces = keys.filter((k) => k.places);
  assert.deepEqual(withPlaces.map((k) => k.key), ['avatarGroupOverflowLabel',  'cancelledText',  'characterCountNoLimitText',  'characterCountText',  'dragHandleLabel',  'entriesAddedText',  'entryAddedText',  'entryRemoveLabel',  'entryRemovedText',  'filesDroppedText',  'filesRefusedText',  'imageCountText',  'liftedText',  'movedText',  'removeLabel',  'retryLabel',  'stepPositionText']);
  assert.deepEqual(keys.find((k) => k.key === 'movedText').places.map((p) => [p.name, p.kind]), [['label',  'text'],  ['position',  'number'],  ['count',  'number']]);
  const props = new Map(loadSpecs().flatMap(({ spec: each }) => [...each.props, ...(each.items ?? []).flatMap((kind) => kind.props ?? [])].filter((prop) => prop.words).map((prop) => [`${each.name}.${prop.name}`, prop])));
  for (const { key, readers, places } of withPlaces) {
    for (const reader of readers) assert.deepEqual(props.get(`${reader.component}.${reader.prop}`).places, places, `${key}: ${reader.component}.${reader.prop}`);
    assert.ok(files['packages/web/src/generated/words.ts'].includes(`  ${key}: [${places.map((p) => `{ name: '${p.name}', kind: '${p.kind}'${p.required ? ', required: true' : ''} }`).join(', ')}],`), key);
  }
});
