// "Source" never loses what was typed. The rules live in
// src/draft.js, without a DOM, so they are tested here; ui/source.ts and ui.ts only wire them to the page.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stringifyLayer } from '../src/core.js';
import { createSourceDraft, lineAt, readSource } from '../src/draft.js';
import { studio } from './studio-node.js';

const layer = studio.setDial({ ...studio.blank(), id: 'drafty' }, 'tanrei.dial.type.base', 17);
const valid = stringifyLayer(layer);
// A person in the middle of typing: a trailing comma, tabs, a blank line, CRLF — kept byte for byte.
const broken = `${valid.slice(0, valid.lastIndexOf('}'))},\r\n\t"palettes": {\n\n  "brand": \n`;

test('text that parses is a layer; text that does not is a problem with a line', () => {
  assert.deepEqual(readSource(valid), { layer });
  const problem = readSource(broken);
  assert.ok(problem.error && !('layer' in problem));
  assert.equal(typeof problem.line === 'number' || problem.line === undefined, true);
  for (const notALayer of ['[]', '3', 'null', '"text"']) assert.deepEqual(readSource(notALayer, 'a layer is a JSON object'), { error: 'a layer is a JSON object' });
  assert.equal(lineAt('a\nb\nc', 4), 3);
});

test('invalid text is kept as a draft, word for word, across leaving and returning', () => {
  const draft = createSourceDraft();
  assert.deepEqual([draft.pending, draft.text, draft.open(valid)], [false, null, valid], 'no draft: the editor opens on the layer');

  // Typing something that does not parse: nothing to commit, and the text is the draft.
  const result = draft.input(broken, 'drafty');
  assert.ok('error' in result && !('layer' in result), 'an invalid draft never yields a layer — so nothing valid is overwritten and nothing is saved');
  assert.deepEqual([draft.pending, draft.text], [true, broken]);

  // Leaving Source and coming back (the level is redrawn from scratch): exactly the same text, whatever the layer is now.
  const elsewhere = stringifyLayer(studio.setDial(layer, 'tanrei.dial.space.unit', 10));
  assert.equal(draft.open(elsewhere), broken);
  assert.equal(draft.open(elsewhere).length, broken.length, 'not trimmed, not reformatted');

  // Every further keystroke that still does not parse replaces the draft; the one that parses ends it and IS the layer.
  draft.input(`${broken} `, 'drafty');
  assert.equal(draft.text, `${broken} `);
  assert.deepEqual(draft.input(valid, 'drafty'), { layer });
  assert.deepEqual([draft.pending, draft.text, draft.open(elsewhere)], [false, null, elsewhere]);
});

test('a draft can be discarded, survives a reload, and belongs to one layer file', () => {
  const draft = createSourceDraft();
  draft.input(broken, 'drafty');
  // Remembered with the rest of the page's state (JSON.stringify calls toJSON)…
  const stored = JSON.parse(JSON.stringify({ level: 'source', draft }));
  assert.deepEqual(stored.draft, { id: 'drafty', text: broken });
  const restored = createSourceDraft(stored.draft);
  assert.deepEqual([restored.pending, restored.open(valid)], [true, broken]);
  // …for the file it was typed in: `tanrei studio` on another layer file does not show it.
  restored.belongsTo('drafty');
  assert.equal(restored.pending, true);
  restored.belongsTo('another');
  assert.equal(restored.pending, false);
  // What was stored is only a draft while it still does not parse; junk is not a draft.
  assert.equal(createSourceDraft({ id: 'drafty', text: valid }).pending, false);
  for (const junk of [null, undefined, {}, { text: 3 }, 'text']) assert.equal(createSourceDraft(junk).pending, false);

  draft.discard();
  assert.deepEqual([draft.pending, draft.open(valid), JSON.stringify({ draft })], [false, valid, '{"draft":null}']);
});

test('the layer the other levels and autosave see is never the draft', () => {
  // The page's flow, without the page: `committed` is what ctx.commit received — the only thing autosave ever sends.
  const draft = createSourceDraft();
  let committed = layer;
  const type = (text) => {
    const result = draft.input(text, committed.id);
    if ('layer' in result) committed = result.layer;
  };
  type(broken);
  assert.deepEqual(committed, layer, 'still the last text that parsed');
  assert.equal(studio.preview(committed).ok, true, 'and still a layer the adapter may save');
  const renamed = { ...layer, name: 'Parsed again' };
  type(stringifyLayer(renamed));
  assert.deepEqual([committed, draft.pending], [renamed, false]);
});
