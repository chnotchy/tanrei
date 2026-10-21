// The pipeline's reader of a bundle (src/reader.js) against a general DTCG parser reading the same bundle
// (`loadResolverFromBundle`, src/model.js): the same tokens, in the same order, field by field. The parser is the
// oracle — what any other consumer of a bundle reads; the reader is what the build, the CLI, the MCP server and
// Theme Studio's server run, because the parser held a gigabyte for one system and took nine tenths of a build.
//
// The parser is slow and large, which is the point of not running it elsewhere: here it reads ONE scheme at a time
// (a resolver document with one context — about two seconds and 0.2 GB at 8,500 tokens) and is let go before the
// next. The default system is compared in all six schemes; a preset and a product in two (the schemes furthest
// apart), which is where their documents differ from the default's in kind.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import v8 from 'node:v8';
import vm from 'node:vm';
import { buildBundle } from '../src/bundle.js';
import { REPO_ROOT, loadResolverFromBundle } from '../src/model.js';
import { TokenReadError, readBundle } from '../src/reader.js';
import { readSystemChain } from '../src/resolve.js';
import { SCHEMES } from '../src/scheme.js';

// Everything a reader says of a token. A general parser also keeps the syntax tree a token was read from (`source`),
// a copy of itself per mode (`mode`) and its group (`group`); the reader keeps none of them, and nothing reads them.
const FIELDS = ['id', '$type', '$description', '$deprecated', '$value', '$extensions', 'aliasChain', 'aliasedBy', 'aliasOf', 'partialAliasOf', 'dependencies', 'originalValue', 'jsonID'];

/** The bundle through the general parser, one scheme: the resolver document with only that context. */
async function oracle(files, systemId, scheme) {
  const name = `${systemId}.resolver.json`;
  const doc = files[name];
  const modifiers = doc.modifiers ? { modifiers: { ...doc.modifiers, scheme: { ...doc.modifiers.scheme, default: scheme, contexts: { [scheme]: doc.modifiers.scheme.contexts[scheme] } } } } : {};
  const resolver = await loadResolverFromBundle({ ...files, [name]: { ...doc, ...modifiers } }, systemId);
  return resolver.apply(doc.modifiers ? { scheme } : {});
}

// Between two readings of the parser, collect: each leaves 0.2 GB behind, and a process that waits for the engine to
// decide when holds six of them (1.8 GB resident, measured).
v8.setFlagsFromString('--expose-gc');
const collect = vm.runInNewContext('gc');

function assertSameTokens(read, parsed, where) {
  assert.deepEqual(Object.keys(read), Object.keys(parsed), `${where}: the same tokens in the same order`);
  for (const [id, token] of Object.entries(read)) {
    assert.deepEqual(Object.keys(token), FIELDS, `${where} ${id}: a token has these fields, set or not`);
    for (const field of FIELDS) assert.deepStrictEqual(token[field], parsed[id][field], `${where} ${id} ${field}`);
  }
}

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}.system.json`, import.meta.url), 'utf8'));
const FAR_APART = ['light', 'dark-high'];

for (const [name, input, schemes] of [
  ['the default system', { system: 'tanrei' }, SCHEMES],
  ['m3-like', { system: 'm3-like' }, FAR_APART],
  ['cupertino', { system: 'cupertino' }, FAR_APART],
  ['a product that extends the vocabulary (fixtures/acme)', { layers: [fixture('acme')] }, FAR_APART],
  ['a product whose state colors are tones per scheme (fixtures/tone-per-state)', { layers: [fixture('tone-per-state')] }, FAR_APART],
]) {
  test(`${name}: the reader and a general DTCG parser read the same tokens (${schemes.join(', ')})`, async () => {
    const { chain } = readSystemChain(input);
    const { files } = buildBundle(REPO_ROOT, chain);
    const reader = readBundle(files, chain.at(-1).id);
    assert.deepEqual(reader.schemes, SCHEMES);
    for (const scheme of schemes) {
      assertSameTokens(reader.tokens(scheme), await oracle(files, chain.at(-1).id, scheme), scheme);
      collect();
    }
  });
}

// ── What the vocabulary does not use today, and a reader must still read as a parser does ──
const color = (r, g, b, alpha) => ({ colorSpace: 'srgb', components: [r, g, b], ...(alpha === undefined ? {} : { alpha }) });
const px = (value) => ({ value, unit: 'px' });
const small = () => ({
  'x.resolver.json': {
    version: '2025.10',
    sets: { base: { sources: [{ $ref: 'base.tokens.json' }, { $ref: 'more.tokens.json' }] }, last: { sources: [{ $ref: 'last.tokens.json' }] } },
    modifiers: { scheme: { default: 'light', contexts: { light: [{ $ref: 'light.tokens.json' }], dark: [{ $ref: 'dark.tokens.json' }] } } },
    resolutionOrder: [{ $ref: '#/sets/base' }, { $ref: '#/modifiers/scheme' }, { $ref: '#/sets/last' }],
  },
  'base.tokens.json': {
    $description: 'A document.',
    t: {
      color: { $type: 'color', red: { $value: color(1, 0, 0), $description: 'Red.' }, clear: { $value: color(0, 0, 0, 0.5) }, brand: { $value: '{t.color.red}' }, accent: { $value: '{t.color.brand}', $extensions: { 'dev.example': { a: 1 } } } },
      size: { $type: 'dimension', $deprecated: 'Use space.', one: { $value: px(1) }, two: { $value: '{t.size.one}', $deprecated: false }, zero: { $value: px(0) } },
      number: { $type: 'number', zero: { $value: 0 }, nothing: { $value: '{t.number.zero}' }, half: { $value: 0.5 } },
      untyped: { $value: '{t.number.half}' },
      weight: { $type: 'fontWeight', bold: { $value: 'bold' }, light: { $value: 300 }, strong: { $value: '{t.weight.bold}' } },
      family: { $type: 'fontFamily', one: { $value: 'Inter' }, stack: { $value: ['Inter', 'sans-serif'] } },
      ease: { $type: 'cubicBezier', $value: [0.2, 0, 0, 1] },
      time: { $type: 'duration', $value: { value: 200, unit: 'ms' } },
      shadow: {
        $type: 'shadow',
        one: { $value: { color: '{t.color.red}', offsetX: px(0), offsetY: '{t.size.one}', blur: px(2), spread: px(0) } },
        two: { $value: [{ color: color(0, 0, 0, 0.2), offsetX: px(0), offsetY: px(1), blur: px(2), spread: px(0), inset: true }, { color: '{t.color.accent}', offsetX: px(0), offsetY: '{t.size.two}', blur: px(4), spread: px(0) }] },
        same: { $value: '{t.shadow.one}' },
      },
      border: { $type: 'border', $value: { color: '{t.color.brand}', width: '{t.size.one}', style: 'solid' } },
      move: { $type: 'transition', $value: { duration: '{t.time}', delay: { value: 0, unit: 'ms' }, timingFunction: '{t.ease}' } },
      fade: { $type: 'gradient', $value: [{ color: '{t.color.red}', position: 0 }, { color: color(0, 0, 1), position: '{t.number.half}' }] },
      text: { $type: 'typography', body: { $value: { fontFamily: '{t.family.one}', fontWeight: '{t.weight.strong}', fontSize: px(16), lineHeight: '{t.number.half}', letterSpacing: '{t.size.zero}' } }, same: { $value: '{t.text.body}' } },
    },
  },
  // The same token in a later source of the same set: merged key by key, as a resolver merges.
  'more.tokens.json': { t: { color: { red: { $extensions: { 'dev.example': { b: 2 } } }, clear: { $value: color(0, 0, 0, 0.25) } }, late: { $type: 'number', $value: '{t.number.half}' } } },
  'light.tokens.json': { t: { color: { surface: { $value: color(1, 1, 1) }, brand: { $value: '{t.color.clear}' } } } },
  'dark.tokens.json': { t: { color: { surface: { $value: color(0, 0, 0) }, brand: { $value: '{t.color.surface}' } } } },
  'last.tokens.json': { t: { color: { on: { $value: '{t.color.surface}' } } } },
});

test('composite values, inherited types and deprecations, a token merged from two sources, a set after the modifier: as a general parser reads them', async () => {
  const files = small();
  const reader = readBundle(files, 'x');
  assert.deepEqual(reader.schemes, ['light', 'dark']);
  assert.equal(reader.defaultScheme, 'light');
  for (const scheme of reader.schemes) assertSameTokens(reader.tokens(scheme), await oracle(files, 'x', scheme), scheme);
  assert.equal(reader.tokens(), reader.tokens('light'), 'no scheme named: the default one');
  assert.equal(reader.apply({ scheme: 'dark' }), reader.tokens('dark'), 'apply() is tokens(), in a resolver\'s words');

  const light = reader.tokens('light');
  // What the comparison above already holds, said once in the open so a reader of this file sees the forms.
  assert.deepEqual(light['t.color.red'].$value, { ...color(1, 0, 0), alpha: 1 });
  assert.deepEqual(light['t.color.red'].$extensions, { 'dev.example': { b: 2 } });
  assert.deepEqual(light['t.color.accent'].aliasChain, ['t.color.brand', 't.color.clear']);
  assert.equal(light['t.number.nothing'].$value, '{t.number.zero}', 'an alias that ends at 0 keeps the alias (the model reads the end of the chain)');
  assert.equal(light['t.weight.strong'].$value, 700);
  assert.deepEqual(light['t.family.one'].$value, ['Inter']);
  assert.equal(light['t.shadow.one'].$value[0].inset, false);
  assert.deepEqual(light['t.shadow.one'].partialAliasOf, [{ color: 't.color.red', offsetY: 't.size.one' }]);
  assert.equal(light['t.size.one'].$deprecated, 'Use space.');
  assert.equal(light['t.size.two'].$deprecated, false);
  assert.equal(light['t.untyped'].$type, 'number', 'no type of its own or of a group: the type at the end of its chain');
});

test('what the schemes have in common is held once', () => {
  const files = small();
  const reader = readBundle(files, 'x');
  const [light, dark] = [reader.tokens('light'), reader.tokens('dark')];
  assert.equal(reader.tokens('light'), light, 'a scheme is read once');
  // A token no scheme document touches, reaching nothing a scheme changes: one object in both schemes.
  for (const id of ['t.size.one', 't.size.two', 't.text.body', 't.shadow.one', 't.shadow.same', 't.weight.strong']) assert.equal(dark[id], light[id], id);
  // One that differs only by where a scheme points it shares everything else.
  assert.notEqual(dark['t.color.brand'], light['t.color.brand']);
  assert.notEqual(dark['t.color.accent'].$value, light['t.color.accent'].$value);
  assert.equal(dark['t.color.accent'].$extensions, light['t.color.accent'].$extensions);
  assert.equal(dark['t.color.accent'].originalValue, light['t.color.accent'].originalValue);
  // The bundle's own objects, not copies: an authored node, its extensions, a value nobody had to change.
  assert.equal(light['t.color.accent'].originalValue, files['base.tokens.json'].t.color.accent);
  assert.equal(light['t.color.accent'].$extensions, files['base.tokens.json'].t.color.accent.$extensions);
  assert.equal(light['t.shadow.two'].$value[0].color, files['base.tokens.json'].t.shadow.two.$value[0].color, 'a color that states its alpha is its own normal form');
  assert.equal(light['t.ease'].$value, files['base.tokens.json'].t.ease.$value);
  // A normal form is made once per value: every token that ends at it has the same object.
  assert.equal(light['t.color.on'].$value, light['t.color.surface'].$value);
  assert.equal(light['t.text.same'].$value, light['t.text.body'].$value);
  // …and reading leaves the documents as they were.
  assert.deepEqual(files, small());
});

test('a bundle that cannot be read is refused, in the token\'s name', () => {
  const broken = (edit) => {
    const files = small();
    edit(files['base.tokens.json'].t, files);
    return () => readBundle(files, 'x').tokens();
  };
  assert.throws(broken((t) => (t.color.accent.$value = '{t.color.nowhere}')), (error) => error instanceof TokenReadError && /(^|: )t\.color\.accent: Could not resolve alias \{t\.color\.nowhere\}\.$/.test(error.message));
  assert.throws(broken((t) => (t.size.one.$value = '{t.size.two}')), /Circular alias detected\./);
  assert.throws(broken((t) => (t.size.one.$value = '{t.size.one}')), /(^|: )t\.size\.one: Circular alias detected\.$/);
  assert.throws(broken((t) => (t.size.two.$value = '{t.color.red}')), /(^|: )t\.size\.two: Cannot alias to \$type "color" from \$type "dimension"\.$/);
  assert.throws(broken((t) => (t.shadow.one.$value.offsetY = '{t.color.red}')), /(^|: )t\.shadow\.one: Cannot alias to \$type "color" from \$type "dimension"\.$/);
  assert.throws(broken((t) => (t.family.one.$value = '{broken')), /(^|: )t\.family\.one: Invalid alias syntax\.$/);
  // What Tanrei's bundles never hold is not read differently from a general parser: it is not read.
  assert.throws(broken((t) => (t.color.red.$value = '#ff0000')), /(^|: )t\.color\.red: a color written as a string/);
  assert.throws(broken((t) => (t.size.$extends = '{t.number}')), /(^|: )t\.size: "\$extends" is not read/);
  assert.throws(broken((t) => (t.size.one = { $ref: '#/t/size/zero' })), /(^|: )t\.size\.one: "\$ref" is not read/);
  assert.throws(broken((t) => (t.border.$value.width = { $ref: '#/t/size/one/$value' })), /(^|: )t\.border: "\$ref" inside a value is not read/);
  assert.throws(broken((t, files) => delete files['more.tokens.json']), /the bundle has no more\.tokens\.json/);
  assert.throws(() => readBundle(small(), 'y'), /the bundle has no y\.resolver\.json/);
  assert.throws(() => readBundle(small(), 'x').tokens('sepia'), /Modifier scheme has no context "sepia"\./);
  assert.throws(broken((t, files) => files['x.resolver.json'].resolutionOrder.push({ $ref: '#/sets/nope' })), /"#\/sets\/nope" names no set and no modifier/);
});

// ── The token lint: a general parser's rules on the shape of a value, run over the written values alone ──
test('a value that is not well-formed for its type is refused in its token\'s name — by the same rules, with the same verdict, as a general parser reading the bundle', async () => {
  const { lintValues } = await import('../src/model.js');
  await lintValues(readBundle(small(), 'x').tokens()); // every value of the small bundle is well-formed
  for (const [what, edit, id, rule] of [
    ['a unit DTCG does not have', (t) => (t.size.one.$value = { value: 1, unit: 'pt' }), 't.size.one', 'core/valid-dimension'],
    ['a number written as text', (t) => (t.number.half.$value = '0.5'), 't.number.half', 'core/valid-number'],
    ['a color of two components', (t) => (t.color.red.$value = { colorSpace: 'srgb', components: [1, 0] }), 't.color.red', 'core/valid-color'],
    ['a weight nobody names', (t) => (t.weight.bold.$value = 'boldish'), 't.weight.bold', 'core/valid-font-weight'],
    ['a curve of three numbers', (t) => (t.ease.$value = [0.2, 0, 1]), 't.ease', 'core/valid-cubic-bezier'],
    ['a duration in minutes', (t) => (t.time.$value = { value: 2, unit: 'min' }), 't.time', 'core/valid-duration'],
    ['an empty font family', (t) => (t.family.stack.$value = ['Inter', '']), 't.family.stack', 'core/valid-font-family'],
    ['a field inside a composite value', (t) => (t.shadow.two.$value[0].blur = { value: 2, unit: 'pt' }), 't.shadow.two', 'core/valid-dimension'],
  ]) {
    const files = small();
    edit(files['base.tokens.json'].t);
    const tokens = readBundle(files, 'x').tokens(); // the reader reads it: the shape of a value is the linter's to judge
    await assert.rejects(lintValues(tokens), (error) => error instanceof TokenReadError && error.message.split('\n').some((line) => line.startsWith(`${id}: `) && line.endsWith(` (${rule})`)), what);
    await assert.rejects(oracle(files, 'x', 'light'), (error) => error.message.includes(`lint:${rule}`), `${what}: the general parser's own verdict`);
  }
});

test('a system is refused for a malformed value wherever a layer writes it: a token of a set, and a state token of a scheme\'s document', async () => {
  const { resolveSystem } = await import('../src/resolve.js');
  const layer = (tokens) => ({ id: 'acme', name: 'Acme', extends: 'tanrei', tokens });
  const reason = 'This product draws it so.';
  await assert.rejects(resolveSystem({ layers: [layer({ 'tanrei.sys.shape.corner.small': { $value: { value: 4, unit: 'pt' }, reason } })] }, { model: false }), /tanrei\.sys\.shape\.corner\.small: Unit pt not allowed\. Expected px, em, or rem\. \(core\/valid-dimension\)$/);
  await assert.rejects(resolveSystem({ layers: [layer({ 'tanrei.comp.button.disabled.opacity': { $value: 'half', reason } })] }, { model: false }), /tanrei\.comp\.button\.disabled\.opacity: Must be a number\. \(core\/valid-number\)$/);
  assert.ok(await resolveSystem({ layers: [layer({ 'tanrei.sys.shape.corner.small': { $value: { value: 4, unit: 'px' }, reason } })] }, { model: false }));
});
