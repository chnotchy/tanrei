// What a layer says in words — its name, its description, its attribution, a pin's reason, a declaration's rationale,
// a palette's description — is no part of any value. Typing one must not compute the layer: `core.preview` checks
// the layer each time (`validate`) and computes it only when its `valueKey` changes. These tests hold the computation
// to that promise: two layers with one key compute the same sheet, the same values and the same checks, whatever their
// words — for the shipped presets, which are full of them — and a word only counts by what the engine asks of it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emitCss } from '@tanrei/tokens-build/emit/css';
import { shipped, studio } from './studio-node.js';

const NS = studio.namespace;
const SCOPE = 'words';
const say = (text) => (typeof text === 'string' ? `${text} Said again, in other words.` : text);
const each = (section, fn) => (section ? Object.fromEntries(Object.entries(section).map(([key, value]) => [key, value && typeof value === 'object' ? fn(value) : value])) : section);
/** Every word of a layer said otherwise; every value as it was. */
function reworded(layer) {
  const pin = (op) => ('reason' in op ? { ...op, reason: say(op.reason) } : op);
  return {
    ...layer,
    ...('name' in layer ? { name: say(layer.name) } : {}),
    ...('description' in layer ? { description: say(layer.description) } : {}),
    ...(layer.attribution ? { attribution: { ...layer.attribution, inspiredBy: say(layer.attribution.inspiredBy), disclaimer: say(layer.attribution.disclaimer) } } : {}),
    tokens: each(layer.tokens, pin),
    vocabulary: each(layer.vocabulary, (declaration) => ({ ...pin(declaration), rationale: say(declaration.rationale), ...('$description' in declaration ? { $description: say(declaration.$description) } : {}) })),
    palettes: each(layer.palettes, (declaration) => ('description' in declaration ? { ...declaration, description: say(declaration.description) } : declaration)),
    ...(layer.rules ? { rules: layer.rules.map(pin) } : {}),
  };
}
/** What a computation values, whatever it says: every token's value and alias, in every scheme. */
const valuesOf = (model) => JSON.stringify([Object.values(model.tokens).map((t) => [t.id, t.value, t.alias]), Object.entries(model.perScheme).map(([scheme, tokens]) => [scheme, Object.values(tokens).map((t) => [t.id, t.value, t.alias])])]);
/** Every word the model was given: the reasons, rationales and descriptions it copied in. */
const wordsOf = (model) => JSON.stringify(Object.values(model.tokens).map((t) => [t.id, t.derive?.fixed, t.derive?.pinned?.reason, t.description, t.rationale, t.vocabulary?.rationale]));

for (const id of Object.keys(shipped).filter((id) => shipped[id].extends)) {
  test(`${id}: its words said otherwise, the layer computes the same sheet, values and checks — and is not computed again until its words are asked for`, () => {
    const layer = shipped[id];
    const other = reworded(layer);
    assert.notEqual(JSON.stringify(other), JSON.stringify(layer));
    assert.equal(studio.valueKey(other), studio.valueKey(layer), 'one key');

    const said = studio.preview(layer);
    assert.ok(said.model, said.problems.join('\n'));
    const typed = studio.preview(other);
    assert.equal(typed.computation, said.computation, 'typing words computes nothing');
    assert.equal(typed.layer, other, 'the view is the layer as typed');
    assert.equal(typed.system.name, other.name, 'with its own name');
    assert.equal(typed.chain.at(-1), other, 'and its own chain');
    assert.equal(typed.worded, false, 'the model still holds the words it was computed with');
    assert.deepEqual(typed.problems, said.problems, 'the same checks');

    const caught = studio.preview(other, { worded: true });
    assert.notEqual(caught.computation, said.computation, 'asked for, the words are computed');
    assert.equal(caught.worded, true);
    assert.equal(studio.preview(other), caught, 'and the layer is not computed again');
    assert.notEqual(wordsOf(caught.model), wordsOf(said.model), `${id} has words that reach the model`);
    assert.ok(wordsOf(caught.model).includes('Said again, in other words.'), 'the model holds the words typed');

    // The computation, held to the promise: its own sheet, emitted again from its own model, is the sheet of the old words.
    assert.equal(emitCss(caught.model, { scope: SCOPE }), emitCss(said.model, { scope: SCOPE }), 'the same sheet');
    assert.equal(caught.css(SCOPE), said.css(SCOPE), 'which is kept, not emitted again');
    assert.equal(valuesOf(caught.model), valuesOf(said.model), 'the same values');
    assert.deepEqual(caught.warnings, said.warnings, 'the same warnings');
    assert.deepEqual(caught.notices, said.notices, 'the same notices');
    assert.deepEqual(caught.problems, said.problems, 'the same problems');
    assert.deepEqual(caught.intents, said.intents);
  });
}

test('typing a name, a description or an attribution computes nothing, and the view says what was typed', () => {
  let layer = studio.setPalette(studio.blank(), 'primary', { source: { seed: '#0f766e' } });
  const start = studio.preview(layer);
  assert.ok(start.ok, start.problems.join('\n'));
  for (const name of [...'Acme brand'].map((_, i, all) => all.slice(0, i + 1).join(''))) {
    layer = studio.setMeta(layer, { name }).layer;
    const view = studio.preview(layer);
    assert.equal(view.computation, start.computation, `"${name}": not computed`);
    assert.equal(view.worded, true, 'a name is no word of the model');
    assert.equal(view.layer.name, name);
    assert.equal(view.system.name, name);
  }
  layer = studio.setMeta(layer, { description: 'What Acme’s products look like.', attribution: { inspiredBy: 'Acme’s brand book', disclaimer: 'Not affiliated.' } }).layer;
  const view = studio.preview(layer);
  assert.equal(view.computation, start.computation);
  assert.equal(view.worded, true);
  assert.equal(view.ok, true);
});

test('what is wrong with a layer’s words is said at once, by the schema, without computing it', () => {
  const layer = studio.setPalette(studio.blank(), 'primary', { source: { seed: '#0f766e' } });
  const start = studio.preview(layer);
  const wrong = studio.preview({ ...layer, attribution: { inspiredBy: 'Acme', sources: [{}] } });
  assert.equal(wrong.computation, start.computation, 'an attribution is no value');
  assert.equal(wrong.ok, false);
  assert.ok(wrong.problems.some((problem) => problem.startsWith('/attribution')), wrong.problems.join('\n'));
  assert.equal(studio.preview(layer).ok, true, 'and taken back, the layer is fine again');
});

test('a reason typed is shown at once and computed once asked for; a reason counts only by being long enough', () => {
  const dial = `${NS}.dial.shape.unit`;
  let layer = studio.setDial(studio.blank(), dial, 3);
  const start = studio.preview(layer);
  assert.equal(start.model.tokens[dial].derive.fixed, 'Chosen in Theme Studio.');
  const typed = 'Our corners are soft.';
  for (let i = 1; i <= typed.length; i += 1) {
    layer = studio.setDial(layer, dial, 3, typed.slice(0, i));
    assert.equal(studio.preview(layer).computation, start.computation, `"${typed.slice(0, i)}": not computed`);
  }
  assert.equal(studio.preview(layer).worded, false);
  const caught = studio.preview(layer, { worded: true });
  assert.equal(caught.model.tokens[dial].derive.fixed, typed, 'the model holds the reason, once asked for');
  assert.equal(studio.describe(caught, dial).token.derive.fixed, typed, 'and so does Every token');

  // A reason the engine refuses is refused whatever it says: one key, one problem.
  const pin = `${NS}.sys.shape.corner-smoothing`;
  const short = (reason) => ({ ...layer, tokens: { ...layer.tokens, [pin]: { $value: 0.6, reason } } });
  assert.notEqual(studio.valueKey(short('Too short')), studio.valueKey(short('short')), 'long enough or not: two keys');
  assert.equal(studio.valueKey(short('short')), studio.valueKey(short('tiny')), 'too short, whatever it says: one key');
  const refused = studio.preview(short('short'));
  assert.equal(refused.ok, false);
  assert.ok(refused.problems.some((problem) => problem.includes('needs a "reason"')), refused.problems.join('\n'));
  const again = studio.preview(short('tiny'));
  assert.equal(again.computation, refused.computation, 'not computed again');
  assert.deepEqual(again.problems, refused.problems);
});

test('a declared palette’s description counts by being there; a pattern rule’s reason not at all', () => {
  const layer = studio.setPalette(studio.blank(), 'brand', { source: { seed: '#7c3aed' }, description: 'The brand’s own violet.' });
  assert.equal(layer.palettes.brand.roles, 'intent');
  const said = studio.preview(layer);
  assert.ok(said.ok, said.problems.join('\n'));
  const typed = { ...layer, palettes: { brand: { ...layer.palettes.brand, description: 'The violet of the brand.' } } };
  assert.equal(studio.valueKey(typed), studio.valueKey(layer));
  const none = { ...layer, palettes: { brand: { ...layer.palettes.brand, description: '' } } };
  assert.notEqual(studio.valueKey(none), studio.valueKey(layer), 'without one, the engine refuses the palette');
  assert.equal(studio.preview(none).ok, false);

  const rule = (reason) => studio.setRules(layer, [{ match: `${NS}.comp.*.pressed.opacity`, $value: 0.6, reason }]);
  assert.equal(studio.valueKey(rule('This product dims on press.')), studio.valueKey(rule('Pressed, it dims.')));
});
