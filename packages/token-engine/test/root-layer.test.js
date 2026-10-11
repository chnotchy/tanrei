// The root layer is the recipe of what is GENERATED for the default system: its color roles, its per-state component
// tokens and the component colors a color rule values. Every other token's default is the value written in the
// vocabulary's own documents, which the default system is read from as they are — so a line for such a token in the
// root layer would be taken by every system that extends the root and by the default system not at all.
// `rootLayerProblems` says so, and says where the value is set.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DERIVE, ENUM, VOCABULARY, mergeLayers, resolveNumericTokens, rootLayerProblems, walkTokens } from '../src/index.js';

const px = (value) => ({ value, unit: 'px' });
const voc = { [VOCABULARY]: { rationale: 'One product needs this distinction in more than one place.' } };
const sources = {
  'dial/dial.tokens.json': { tanrei: { dial: { $extensions: voc, space: { unit: { $type: 'dimension', $value: px(8) } } } } },
  'sys/behavior.tokens.json': { tanrei: { sys: { behavior: { $type: 'number', $extensions: voc, 'link-underline': { $value: 0, $extensions: { [ENUM]: { values: ['always', 'hover', 'never'] } } } } } } },
  'sys/space.tokens.json': { tanrei: { sys: { space: { $type: 'dimension', $extensions: voc, space100: { $value: px(8), $extensions: { [DERIVE]: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 1 } } } } } } },
  'comp/button.tokens.json': {
    tanrei: { comp: { button: {
      $extensions: { ...voc, 'dev.tanrei.states': { variants: ['filled'], states: ['hovered', 'disabled'], perVariant: { 'container.color': 'color' }, perComponent: { opacity: 'number' } } },
      filled: { container: { color: { $type: 'color', $value: '{tanrei.sys.color.primary}' } } },
      mark: { color: { $type: 'color', $value: '{tanrei.sys.color.primary}' } },
      container: { gap: { $type: 'dimension', $value: '{tanrei.sys.space.space100}' } },
    } } },
  },
};
const tone = (n) => ({ derive: { fn: 'tone', palette: 'neutral', tone: { light: [n], dark: [100 - n] } } });
const root = (tokens) => ({ id: 'tanrei', name: 'Tanrei', specVersion: 'test', palettes: {}, tokens });
const CHOICE = 'tanrei.sys.behavior.link-underline';
const DIAL = 'tanrei.dial.space.unit';

test('a choice of kind and a plain value in the root layer are refused, each with the document that holds its default', () => {
  const problems = rootLayerProblems(sources, root({
    [CHOICE]: { $value: 'hover', reason: 'The default system shows the line under the pointer.' },
    [DIAL]: { $value: px(10), reason: 'A roomier default system.' },
  }));
  assert.equal(problems.length, 2, problems.join('\n'));
  assert.match(problems[0], /^tanrei\.sys\.behavior\.link-underline: the root layer "tanrei" cannot set this token/);
  assert.match(problems[0], /tokens\/sys\/behavior\.tokens\.json/);
  assert.match(problems[0], /"always"/, 'the default it has there is named, by name for a choice of kind');
  assert.match(problems[1], /^tanrei\.dial\.space\.unit: the root layer "tanrei" cannot set this token/);
  assert.match(problems[1], /tokens\/dial\/dial\.tokens\.json/);
});

test('every way of writing a document’s token is refused: an alias re-pointed, a rule replaced, a scale', () => {
  const problems = rootLayerProblems(sources, root({
    'tanrei.comp.button.container.gap': { scale: 2 },
    'tanrei.sys.space.space100': { derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 2 } },
    'tanrei.comp.button.mark.color': { $value: '{tanrei.sys.color.secondary}' },
  }));
  assert.deepEqual(problems.map((p) => p.split(':')[0]), ['tanrei.comp.button.container.gap', 'tanrei.sys.space.space100', 'tanrei.comp.button.mark.color']);
  assert.match(problems[0], /tokens\/comp\/button\.tokens\.json/);
});

test('what is generated from the root layer is the root layer’s to set: roles, per-state tokens, a component color by a color rule', () => {
  assert.deepEqual(rootLayerProblems(sources, root({
    'tanrei.sys.color.primary': tone(10),
    'tanrei.comp.button.filled.hovered.container.color': { $value: '{tanrei.sys.color.primary}' },
    'tanrei.comp.button.disabled.opacity': { $value: 0.5, reason: 'A disabled button is half as present.' },
    'tanrei.comp.button.mark.color': tone(40),
  })), []);
  assert.deepEqual(rootLayerProblems(sources, root({})), []);
  assert.deepEqual(rootLayerProblems(sources, { id: 'tanrei' }), []);
});

test('the refusal is the root layer’s alone: the same lines in a layer that extends it are taken, as they always were', () => {
  const layer = { id: 'acme', name: 'Acme', extends: 'tanrei', tokens: { [CHOICE]: { $value: 'hover', reason: 'This product shows the line under the pointer.' }, [DIAL]: { $value: px(10), reason: 'A roomier product.' } } };
  const docs = resolveNumericTokens(sources, mergeLayers([root({}), layer]));
  const value = new Map(Object.values(docs).flatMap((doc) => [...walkTokens(doc)].map(({ id, token }) => [id, token.$value])));
  assert.equal(value.get(CHOICE), 1);
  assert.deepEqual(value.get('tanrei.sys.space.space100'), px(10));
});

test('a token nobody declared is not this check’s to name: resolving refuses it, as for any layer', () => {
  assert.deepEqual(rootLayerProblems(sources, root({ 'tanrei.sys.nope': { scale: 2 } })), []);
  assert.throws(() => resolveNumericTokens(sources, mergeLayers([root({ 'tanrei.sys.nope': { scale: 2 } })])), /unknown token/);
});

// The same parting by the other door: a declaration
// under "vocabulary" is materialised into the documents of every system built from the layer chain, and the default
// system is not built from a chain — it is the documents under tokens/ as they are written.
const rationale = 'One product needs a wider gap between the sections of a long page.';
const STEP = 'tanrei.sys.space.space1200';
const step = { $type: 'dimension', rationale, derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 12 } };
const declaring = (vocabulary, tokens = {}) => ({ ...root(tokens), vocabulary });

test('a step declared in the root layer’s vocabulary is refused: every system that extends the root would have it, the default system would not', () => {
  // What the refusal prevents: built as a chain, the declaration is an ordinary token of the system.
  const docs = resolveNumericTokens(sources, mergeLayers([declaring({ [STEP]: step })]));
  assert.deepEqual(docs['sys/space.tokens.json'].tanrei.sys.space.space1200.$value, px(96));
  assert.equal(sources['sys/space.tokens.json'].tanrei.sys.space.space1200, undefined, 'and the documents the default system is read from do not have it');

  const problems = rootLayerProblems(sources, declaring({ [STEP]: step }));
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0], /^tanrei\.sys\.space\.space1200: the root layer "tanrei" cannot declare this token under "vocabulary"/);
  assert.match(problems[0], /tokens\/sys\/space\.tokens\.json/, 'the document of the series it would join is named');
  assert.match(problems[0], /with its one-product rationale/, 'a core token is added by the one-product test');
  assert.match(problems[0], /An extension belongs to a layer that extends "tanrei"/, 'and an extension belongs to a layer above the root');
});

test('every kind of declaration is refused: a value on a component axis, a step that is a group, a token outside the core’s tree', () => {
  const problems = rootLayerProblems(sources, declaring({
    'tanrei.comp.button.variant.danger': { from: 'filled', rationale },
    'tanrei.sys.motion.spring.standard.bouncy': { from: 'default-spatial', rationale },
    'tanrei.sys.depth.far': { $type: 'number', rationale, $value: 3 },
  }));
  assert.deepEqual(problems.map((p) => p.split(':')[0]), ['tanrei.comp.button.variant.danger', 'tanrei.sys.motion.spring.standard.bouncy', 'tanrei.sys.depth.far']);
  assert.match(problems[0], /tokens\/comp\/button\.tokens\.json/, 'the component’s document is named');
  for (const problem of problems) assert.match(problem, /cannot declare this token under "vocabulary"/);
  assert.match(problems[2], /a document under tokens\//, 'with no group of the core to join, the directory is named');
});

test('a color role declared by the root layer is the root layer’s to declare: the palette engine values it into the generated documents', () => {
  assert.deepEqual(rootLayerProblems(sources, declaring({ 'tanrei.sys.color.brand-quiet': { $type: 'color', rationale } }, { 'tanrei.sys.color.brand-quiet': tone(90) })), []);
});

test('a line under "tokens" for a token the root layer declares is named once, by its declaration', () => {
  const problems = rootLayerProblems(sources, declaring({ [STEP]: step }, { [STEP]: { scale: 2 } }));
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0], /cannot declare this token/);
});

test('a layer that extends the root declares as before', () => {
  const layer = { id: 'acme', name: 'Acme', extends: 'tanrei', vocabulary: { [STEP]: step } };
  const docs = resolveNumericTokens(sources, mergeLayers([root({}), layer]));
  assert.deepEqual(docs['sys/space.tokens.json'].tanrei.sys.space.space1200.$value, px(96));
});
