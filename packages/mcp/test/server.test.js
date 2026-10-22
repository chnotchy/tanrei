// The server, end to end over stdio — the way an agent's MCP client talks to it — from a directory that is not
// the Tanrei repository. Values asserted here are the real ones of the shipped systems.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
const readJson = (...parts) => JSON.parse(fs.readFileSync(path.join(repo, ...parts), 'utf8'));

// What ships is discovered from the repository, not listed here: a new preset or a new member of an axis is not a
// reason for this file to change. Values that prove behaviour stay exact.
const SHIPPED = fs.readdirSync(path.join(repo, 'tokens/systems')).filter((name) => name.endsWith('.system.json')).map((name) => name.slice(0, -'.system.json'.length)).sort();
// The systems a product chooses from: every layer but the root, which values the vocabulary and has no output of its own.
const LISTED = SHIPPED.filter((id) => id !== 'core');
const shippedLayer = (id) => readJson('tokens/systems', `${id}.system.json`);
const fidelityReport = (id) => (fs.existsSync(path.join(repo, 'tokens/generated', id, 'fidelity.json')) ? readJson('tokens/generated', id, 'fidelity.json') : null);
// Button, as the core declares it: the members a new size gets, and the tokens a new variant gets (resting + each state).
const button = readJson('tokens/comp/button.tokens.json').tanrei.comp.button.$extensions;
const SIZE_MEMBERS = button['dev.tanrei.axes'].size.members;
const VARIANT_TOKENS = Object.keys(button['dev.tanrei.states'].perVariant).length * (button['dev.tanrei.states'].states.length + 1);
// The components that declare an axis — the only ones a layer can add an axis value to.
const WITH_AXES = fs
  .readdirSync(path.join(repo, 'tokens/comp'))
  .filter((name) => name.endsWith('.tokens.json'))
  .flatMap((name) => Object.entries(readJson('tokens/comp', name).tanrei.comp))
  .filter(([, group]) => group.$extensions?.['dev.tanrei.axes'])
  .map(([component]) => component)
  .sort();
const bin = path.join(pkg, 'bin/tanrei-mcp.js');
const product = tempDir('mcp-product');

async function connect({ fromSource }) {
  const env = { ...process.env };
  delete env.TANREI_VOCABULARY_ROOT;
  delete env.TANREI_MCP_FROM_SOURCE;
  if (fromSource) env.TANREI_MCP_FROM_SOURCE = '1';
  const client = new Client({ name: 'tanrei-mcp-test', version: '0.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [bin], cwd: product, env, stderr: 'pipe' }));
  const call = async (name, args = {}) => {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.content.length, 1);
    return { ok: !result.isError, text: result.content[0].text, data: JSON.parse(result.content[0].text) };
  };
  return { client, call };
}

const acme = {
  id: 'acme',
  name: 'Acme',
  extends: 'tanrei',
  palettes: { correct: { description: 'A right answer in a quiz.', source: { seed: '#0f766e' }, roles: 'intent' } },
  tokens: {
    'tanrei.dial.type.base': { $value: { value: 18, unit: 'px' }, reason: 'Read at arm’s length.' },
    'tanrei.comp.button.container.padding-inline-start.medium': { scale: 2 },
    'tanrei.comp.button.container.gap.medium': { $value: '{tanrei.sys.space.space50}' },
  },
};
const acmeFile = path.join(product, 'design/acme.system.json');
const writeAcme = (layer) => fs.writeFileSync(acmeFile, JSON.stringify(layer, null, 2));

// A product that EXTENDS the vocabulary in every way a layer may: the pipeline's own fixture, in its own directory.
const extended = JSON.parse(fs.readFileSync(path.join(pkg, '../tokens-build/test/fixtures/acme.system.json'), 'utf8'));
const extendedFile = path.join(product, 'extended/acme.system.json');
// What the fixture declares, counted from the fixture: own tokens and single steps (`$type`), axis values, and steps that are groups (a named spring set: four tokens each).
const DECLARED = Object.entries(extended.vocabulary);
const DECLARED_TOKENS = DECLARED.filter(([, d]) => d.$type).length;
const DECLARED_GROUPS = DECLARED.filter(([id, d]) => d.from && id.split('.')[1] === 'sys').length;
const SPRING_FIELDS = Object.keys(readJson('tokens/sys/motion.tokens.json').tanrei.sys.motion.spring.standard['default-spatial']).filter((key) => !key.startsWith('$')).length;
// A stack of two product layers: `app` extends `base`, which declares a step.
const stackFile = (id) => path.join(product, `stack/${id}.system.json`);
const space1200 = { $type: 'dimension', rationale: 'Hero sections need a 96px rhythm step.', derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 12 } };
const writeStack = (app) => {
  fs.mkdirSync(path.dirname(stackFile('app')), { recursive: true });
  fs.writeFileSync(stackFile('base'), JSON.stringify({ id: 'base', name: 'Base', extends: 'tanrei', vocabulary: { 'tanrei.sys.space.space1200': space1200 } }));
  fs.writeFileSync(stackFile('app'), JSON.stringify({ id: 'app', name: 'App', extends: 'base', ...app }));
  fs.utimesSync(stackFile('app'), new Date(), new Date(Date.now() + (writeStack.tick = (writeStack.tick ?? 0) + 5000)));
};

let server;
before(async () => {
  fs.mkdirSync(path.dirname(acmeFile), { recursive: true });
  writeAcme(acme);
  fs.mkdirSync(path.dirname(extendedFile), { recursive: true });
  fs.writeFileSync(extendedFile, JSON.stringify(extended, null, 2));
  writeStack({});
  server = await connect({ fromSource: true });
});
after(async () => {
  await server?.client.close();
  fs.rmSync(product, { recursive: true, force: true });
});
leavesNothingBehind(after); // after the server (whose working directory it is) has gone

test('initialize: the hard rules arrive as server instructions', () => {
  const instructions = server.client.getInstructions();
  assert.doesNotMatch(instructions, /never add|cannot add|never in tokens/i, 'a layer may extend the vocabulary');
  assert.match(instructions, /small, simply named core/);
  assert.match(instructions, /reproduce exactly/);
  assert.match(instructions, /under "vocabulary", with a "rationale"/);
  assert.match(instructions, /propose_extension/);
  assert.match(instructions, /Additive only/);
  assert.match(instructions, /states are not extensible/);
  assert.match(instructions, /layer file/);
  assert.match(instructions, /"reason"/);
  assert.match(instructions, /thresholds are constants/i);
  assert.match(instructions, /tanrei build/);
  assert.ok(instructions.split('\n').length <= 10, 'a few lines, not a manual');
  assert.equal(server.client.getServerVersion().name, 'tanrei');
});

test('tools/list: twelve read-only tools, each with a closed JSON Schema', async () => {
  const { tools } = await server.client.listTools();
  assert.deepEqual(tools.map((t) => t.name), ['list_systems', 'list_components', 'get_component', 'find_component', 'check_usage', 'search_tokens', 'resolve', 'explain_token', 'diff_systems', 'validate_layer', 'propose_extension', 'mimicry_gaps']);
  for (const tool of tools) {
    assert.doesNotMatch(tool.description, /never adds|cannot be added|not a token in a layer/i, `${tool.name}: no tool tells an agent that vocabulary cannot be added`);
    assert.equal(tool.inputSchema.type, 'object');
    assert.equal(tool.inputSchema.additionalProperties, false, tool.name);
    assert.equal(tool.annotations.readOnlyHint, true, tool.name);
  }
});

test('input is validated against the schema before anything runs', async () => {
  const unknown = await server.call('search_tokens', { tire: 'sys' });
  assert.equal(unknown.ok, false);
  assert.match(unknown.text, /must NOT have additional properties \(\\"tire\\"\)/);
  const range = await server.call('search_tokens', { limit: 100000 });
  assert.equal(range.ok, false);
  const scheme = await server.call('resolve', { token: 'tanrei.sys.color.primary', scheme: 'sepia' });
  assert.match(scheme.text, /light, light-medium, light-high, dark/);
  assert.equal((await server.call('explain_token', {})).ok, false);
});

test('list_systems: the shipped systems, and a product’s chain', async () => {
  const { data } = await server.call('list_systems', { layerFile: 'design/acme.system.json' });
  assert.deepEqual(data.shipped.map((s) => s.id), LISTED, 'every layer in tokens/systems but the root, and nothing else');
  assert.ok(['cupertino', 'm3-expressive-like', 'm3-like', 'tanrei'].every((id) => LISTED.includes(id)));
  assert.deepEqual([data.root, data.default], ['core', 'tanrei']);
  const shipped = Object.fromEntries(data.shipped.map((s) => [s.id, s]));
  const { cupertino, 'm3-like': m3, 'm3-expressive-like': expressive, tanrei } = shipped;
  for (const system of data.shipped) assert.equal(system.extends, shippedLayer(system.id).extends ?? null, system.id);
  assert.deepEqual(data.shipped.filter((s) => s.extends === null).map((s) => s.id), [], 'the root is not listed');
  assert.equal(tanrei.extends, 'core');
  assert.equal(tanrei.accessibilityWarnings, 0, 'a violation in the default system is a build failure, so there are none');
  // The default system's own layer chooses its components; the root it extends holds the palettes, roles and rules.
  assert.deepEqual([tanrei.patternRules, tanrei.valueChanges, tanrei.palettes], [0, 0, []]);
  assert.ok((shippedLayer('core').rules ?? []).length >= 18 && Object.keys(shippedLayer('core').tokens).length >= 30);
  assert.ok('accent' in shippedLayer('core').palettes);
  assert.deepEqual([m3.extends, expressive.extends, cupertino.extends], ['core', 'm3-like', 'core'], 'the presets extend the root, not the default system');
  assert.ok(m3.palettes.includes('tertiary (intent roles)'));
  assert.deepEqual(m3.droppedPalettes, ['accent']);
  // An imitation preset is not held to Tanrei's accessibility criteria in any contrast scheme: its
  // contrast is measured with the fixed ruler and shown as information, never counted as warnings.
  for (const preset of [m3, expressive, cupertino]) {
    assert.equal(preset.accessibilityWarnings, undefined, preset.id);
    assert.deepEqual([preset.accessibility.criteria, preset.accessibility.failures], ['not-applied', undefined], preset.id);
    assert.match(preset.accessibility.because, /held to fidelity to the system it imitates/);
  }
  assert.equal(m3.accessibility.measurements, 0);
  assert.ok(cupertino.accessibility.measurements > 0, 'the measurements are shown, as information');
  assert.match(cupertino.description, /Apple/);
  assert.deepEqual(data.product.chain, ['core', 'tanrei', 'acme']);
  assert.deepEqual(data.product.layers.map((l) => [l.id, l.valueChanges, l.palettes]), [['acme', 3, ['correct (intent roles)']]]);
  assert.equal(data.product.accessibilityWarnings, 8, 'type base 18px: the small button, segmented button and button with menu, the tag at both of its sizes, the accordion\'s regular header and the tree view\'s row at both densities no longer hold a label (validate_layer lists them by name)');

  // Extensions: how many exist in each system, the first few, and the layer that declared each.
  assert.deepEqual(tanrei.extensions, { total: 0, first: [] }, 'the core is what the root declares; it has no extensions');
  for (const system of data.shipped) assert.ok(system.extensions.first.every((e) => e.id && e.declaredBy), system.id);
  // A preset extends the vocabulary like a product does: m3-like declares the whole vocabulary of the component that
  // lives in it (the FAB menu) and single color roles; m3-expressive-like extends m3-like, inherits those, and adds two
  // button sizes of its own.
  const declared = Object.keys(shippedLayer('m3-like').vocabulary).length;
  assert.deepEqual([m3.extensions.total, m3.extensions.byKind], [declared, { component: 1, token: declared - 1 }]);
  assert.deepEqual(m3.extensions.first[0], { id: 'tanrei.comp.fab-menu', kind: 'component', declaredBy: 'm3-like' });
  assert.ok(m3.extensions.first.slice(1).every((e) => e.declaredBy === 'm3-like' && /^tanrei\.sys\.(color|typescale)\./.test(e.id)), 'Material’s extra color roles, and its two extra display sizes');
  assert.equal(expressive.extends, 'm3-like');
  assert.deepEqual(Object.keys(shippedLayer('m3-expressive-like').vocabulary), ['tanrei.comp.button.size.xsmall', 'tanrei.comp.button.size.xlarge']);
  assert.deepEqual(expressive.extensions.byKind, { component: 1, token: m3.extensions.total - 1, 'axis-value': 2 }, 'inherited down "extends", plus its own');
  assert.ok(expressive.extensions.first.every((e) => e.declaredBy === 'm3-like'), 'inherited extensions stay attributed to the layer that declared them');
  assert.deepEqual([expressive.palettes, expressive.droppedPalettes, expressive.accessibility.measurements], [[], [], 0], 'colors are m3-like\'s');

  // Exactness, measured: a preset with a fidelity report says how it compares with what it reproduces.
  for (const system of data.shipped) {
    const report = fidelityReport(system.id);
    if (!report) assert.equal('fidelity' in system, false, `${system.id}: nothing measured, nothing claimed`);
    else assert.deepEqual(system.fidelity, { equal: report.equal, measured: report.total - report.covered, different: report.different.length, unmapped: report.unmapped.length, reference: { name: report.reference.name, version: report.reference.version, source: report.reference.source } }, system.id);
  }
  assert.equal(tanrei.fidelity, undefined, 'the root reproduces nothing');
  for (const preset of [m3, expressive]) assert.ok(preset.fidelity.equal > 0 && preset.fidelity.equal <= preset.fidelity.measured && /^https:\/\//.test(preset.fidelity.reference.source), preset.id);
  assert.match(expressive.fidelity.reference.name, /androidx/);
  assert.equal(data.product.fidelity, undefined);
  assert.deepEqual(data.product.layers[0].extensions, { total: 0, first: [] });
  const own = (await server.call('list_systems', { layerFile: extendedFile, warnings: false })).data.product.layers[0].extensions;
  assert.deepEqual([own.total, own.byKind], [DECLARED.length, { token: DECLARED_TOKENS, group: DECLARED_GROUPS, 'axis-value': 2 }]);
  assert.deepEqual(own.first[0], { id: 'tanrei.sys.space.space1200', kind: 'token', declaredBy: 'acme' });
  assert.ok(own.first.length < own.total, 'the first few, not all');
  const inherited = (await server.call('list_systems', { layerFile: stackFile('app'), warnings: false })).data.product;
  assert.deepEqual(inherited.layers.map((l) => [l.id, l.extensions.first.map((e) => e.declaredBy)]), [['base', ['base']], ['app', ['base']]], 'extensions are inherited down "extends", and stay attributed');
});

test('search_tokens: substring, glob, filters and pagination', async () => {
  const glob = (await server.call('search_tokens', { query: 'tanrei.comp.button.*.hovered.*', limit: 200 })).data;
  assert.ok(glob.total >= 20);
  assert.ok(glob.tokens.every((t) => /^tanrei\.comp\.button\.[a-z]+\.hovered\./.test(t.id)));
  assert.ok(glob.tokens.some((t) => t.id === 'tanrei.comp.button.filled.hovered.container.color' && t.$type === 'color' && t.kind === 'derived'));

  const oneSegment = (await server.call('search_tokens', { query: 'tanrei.sys.shape.*' })).data;
  assert.ok(oneSegment.tokens.every((t) => t.id.startsWith('tanrei.sys.shape.')));
  const middle = (await server.call('search_tokens', { query: 'sys.*.small', limit: 200 })).data;
  assert.ok(middle.tokens.every((t) => t.id.split('.').length === 4), '`*` inside a glob is exactly one segment');

  const substring = (await server.call('search_tokens', { query: 'Focus-Ring' })).data;
  assert.ok(substring.tokens.some((t) => t.id === 'tanrei.sys.color.focus-ring'));

  const dials = (await server.call('search_tokens', { tier: 'dial' })).data;
  assert.equal(dials.total, 8);
  assert.ok(dials.tokens.every((t) => t.kind === 'dial'));
  assert.ok(dials.tokens.every((t) => typeof t.description === 'string' && t.description.length > 10 && t.description.length <= 140), 'a short description: its own, or the vocabulary rationale');
  const durations = (await server.call('search_tokens', { type: 'duration', kind: 'derived', limit: 5 })).data;
  assert.ok(durations.total > 0 && durations.tokens.every((t) => t.$type === 'duration' && t.kind === 'derived'));

  // Never the whole vocabulary unasked: 25 by default, and pages that join up exactly.
  const first = (await server.call('search_tokens', {})).data;
  assert.equal(first.tokens.length, 25);
  assert.ok(first.total > 400);
  assert.equal(first.nextOffset, 25);
  const pageA = (await server.call('search_tokens', { tier: 'sys', limit: 10 })).data;
  const pageB = (await server.call('search_tokens', { tier: 'sys', limit: 10, offset: pageA.nextOffset })).data;
  const both = (await server.call('search_tokens', { tier: 'sys', limit: 20 })).data;
  assert.deepEqual([...pageA.tokens, ...pageB.tokens], both.tokens);
  const last = (await server.call('search_tokens', { tier: 'sys', limit: 10, offset: both.total - 3 })).data;
  assert.equal(last.tokens.length, 3);
  assert.equal(last.nextOffset, null);

  // A declared palette's roles exist in the system that declares it, and only there.
  assert.equal((await server.call('search_tokens', { query: 'sys.color.*tertiary*' })).data.total, 0);
  // (`extensions: false` = core vocabulary and palette roles only: the preset may ALSO declare single roles such as tertiary-fixed.)
  const tertiary = (await server.call('search_tokens', { query: 'sys.color.*tertiary*', system: 'm3-like', extensions: false })).data;
  assert.deepEqual(tertiary.tokens.map((t) => t.id.split('.').at(-1)), ['on-tertiary', 'on-tertiary-container', 'tertiary', 'tertiary-container']);
  assert.equal((await server.call('search_tokens', { query: 'sys.color.*correct*', layerFile: acmeFile })).data.total, 4);

  // Extensions are ordinary tokens, flagged; a layer's own tokens are found by their namespace.
  const mine = (await server.call('search_tokens', { query: 'acme.comp.*', layerFile: extendedFile })).data;
  assert.deepEqual(mine.tokens.map((t) => [t.id, t.extension, t.declaredBy]), [['acme.comp.rating.gap', true, 'acme'], ['acme.comp.rating.star.color', true, 'acme'], ['acme.comp.rating.star.size', true, 'acme']]);
  assert.equal(mine.tokens[2].description, 'The rating component\'s star.', 'the rationale of the declaration');
  assert.equal((await server.call('search_tokens', { query: 'rating', layerFile: extendedFile })).data.total, 3, 'substring search too');
  const sizes = (await server.call('search_tokens', { query: 'comp.button.container.height.*', layerFile: extendedFile })).data.tokens;
  assert.deepEqual(sizes.map((t) => [t.id.split('.').at(-1), t.extension ?? false]), [['3x', true], ['large', false], ['medium', false], ['small', false]]);
  // One declared size makes one token per member of the size axis — whatever the axis has (gap and outline width included).
  const threeX = (await server.call('search_tokens', { query: 'tanrei.comp.button.**.3x', layerFile: extendedFile, limit: 200 })).data;
  assert.deepEqual(threeX.tokens.map((t) => t.id).sort(), SIZE_MEMBERS.map((member) => `tanrei.comp.button.${member}.3x`).sort());
  assert.ok(threeX.tokens.every((t) => t.extension && t.declaredBy === 'acme'));
  assert.ok(['container.gap', 'outline.width'].every((member) => SIZE_MEMBERS.includes(member)), 'gap and outline width are per size');
  const added = (await server.call('search_tokens', { extensions: true, layerFile: extendedFile, limit: 200 })).data;
  assert.equal(added.total, DECLARED_TOKENS + DECLARED_GROUPS * SPRING_FIELDS + SIZE_MEMBERS.length + VARIANT_TOKENS, 'own tokens, a step, a color role, every field of a spring set, every member of a size, every token of a variant');
  assert.equal(added.tokens.filter((t) => t.id.startsWith('tanrei.comp.button.danger.')).length, VARIANT_TOKENS);
  assert.ok(added.tokens.some((t) => t.id === 'tanrei.comp.button.danger.hovered.container.color' && t.declaredBy === 'acme'), 'the generated state tokens of a declared variant belong to it');
  assert.equal((await server.call('search_tokens', { extensions: true })).data.total, 0);
});

test('resolve: value, where it comes from, and the CSS custom property', async () => {
  const small = 'tanrei.sys.shape.corner.small';
  const inTanrei = (await server.call('resolve', { token: small })).data.tokens[0];
  assert.deepEqual(inTanrei, { id: small, $type: 'dimension', value: '6px', kind: 'derived', rule: { fn: 'mul', of: '{tanrei.dial.shape.unit}', by: 3 }, inputs: { 'tanrei.dial.shape.unit': '2px' }, cssVar: '--tanrei-sys-shape-corner-small' });
  const inM3 = (await server.call('resolve', { token: small, system: 'm3-like' })).data.tokens[0];
  assert.equal(inM3.value, '8px');
  assert.deepEqual(inM3.rule, { fn: 'mul', of: '{tanrei.dial.shape.unit}', by: 2 });
  assert.deepEqual(inM3.inputs, { 'tanrei.dial.shape.unit': '4px' });
  assert.equal(inM3.setBy, 'm3-like');

  // Schemes change colors; the default is light.
  const primary = async (args) => (await server.call('resolve', { token: 'tanrei.sys.color.primary', ...args })).data.tokens[0];
  assert.equal((await primary({})).value, '#1b1b1b');
  assert.deepEqual((await primary({})).aliasChain, ['tanrei.ref.palette.neutral.10']);
  assert.equal((await primary({ scheme: 'light-high' })).value, '#000000');
  assert.equal((await primary({ scheme: 'dark' })).aliasChain[0], 'tanrei.ref.palette.neutral.93');
  assert.equal((await primary({ system: 'm3-like', scheme: 'dark' })).value, '#d0bcff');
  assert.equal((await primary({})).rule.fn, 'tone');

  // A component token: the alias chain down to the reference tier, several ids at once, raw values on request.
  const many = (await server.call('resolve', { tokens: ['tanrei.comp.button.container.shape', 'tanrei.comp.button.filled.hovered.container.color', 'tanrei.sys.color.scrim'], system: 'm3-like', raw: true })).data;
  assert.deepEqual(many.chain, ['core', 'm3-like']);
  assert.deepEqual([many.tokens[0].value, many.tokens[0].kind, many.tokens[0].aliasChain], ['9999px', 'alias', ['tanrei.sys.shape.corner.full']]);
  assert.equal(many.tokens[1].rule.fn, 'mix');
  assert.equal(many.tokens[1].$value.colorSpace, 'srgb');
  assert.match(many.tokens[2].value, /^#000000 \/ 0\.\d+$/, 'a translucent color is "hex / alpha"');

  // Choices, not quantities: the typefaces (text, code, icons) and the icon style are fixed values no dial scales.
  const fixed = (await server.call('resolve', { tokens: ['tanrei.ref.typeface.plain', 'tanrei.ref.typeface.mono', 'tanrei.ref.typeface.icon', 'tanrei.sys.icon.weight', 'tanrei.sys.icon.fill.unselected', 'tanrei.sys.icon.fill.selected'] })).data.tokens;
  assert.ok(fixed.every((t) => t.kind === 'fixed' && typeof t.rule.fixed === 'string'), 'each says why it is exempt from the dials');
  assert.deepEqual(fixed[0].value.slice(0, 3), ['Inter', 'Noto Sans JP', 'Noto Sans']);
  assert.equal(fixed[1].value[0], 'Roboto Mono');
  assert.deepEqual([fixed[2].$type, fixed[2].value, fixed[2].cssVar], ['fontFamily', ['Material Symbols Rounded'], '--tanrei-ref-typeface-icon']);
  assert.deepEqual(fixed.slice(3).map((t) => [t.$type, t.value]), [['number', 300], ['number', 0], ['number', 1]]);

  // A palette may state single tones exactly (`source.tones`): the tone says so, and is the color that was stated.
  const tones = shippedLayer('m3-like').palettes.primary.source.tones;
  const tone40 = (await server.call('resolve', { token: 'tanrei.ref.palette.primary.40', system: 'm3-like' })).data.tokens[0];
  assert.deepEqual([tone40.value, tone40.rule.exact, tone40.rule.tone], [tones[40].toLowerCase(), tones[40], 40]);
  assert.match(tone40.rule.note, /"source\.tones"/);
  assert.equal((await server.call('resolve', { token: 'tanrei.ref.palette.neutral.10' })).data.tokens[0].rule.exact, undefined, 'generated from the seed');

  // A preset's extensions resolve like a product's: m3-expressive-like's two sizes, each member valued by the preset.
  const sized = (await server.call('resolve', { tokens: ['tanrei.comp.button.container.height.xsmall', 'tanrei.comp.button.container.height.xlarge', 'tanrei.comp.button.outline.width.xlarge', 'tanrei.comp.button.container.gap.xlarge'], system: 'm3-expressive-like' })).data;
  assert.deepEqual(sized.chain, ['core', 'm3-like', 'm3-expressive-like']);
  assert.deepEqual(sized.tokens.map((t) => [t.value, t.extension, t.declaredBy, t.setBy]), [['32px', true, 'm3-expressive-like', 'm3-expressive-like'], ['136px', true, 'm3-expressive-like', 'm3-expressive-like'], ['3px', true, 'm3-expressive-like', 'm3-expressive-like'], ['16px', true, 'm3-expressive-like', 'm3-expressive-like']]);
  assert.equal((await server.call('resolve', { token: 'tanrei.comp.button.container.height.xlarge', system: 'm3-like' })).data.tokens[0].error.includes('not in system "m3-like"'), true, 'and exist only where they are declared');

  // A product's layer: the dial it set, and what follows from it.
  const acmeTokens = (await server.call('resolve', { tokens: ['tanrei.dial.type.base', 'tanrei.sys.typescale.body-large', 'tanrei.comp.button.container.padding-inline-start.medium'], layerFile: acmeFile })).data.tokens;
  assert.deepEqual([acmeTokens[0].value, acmeTokens[0].setBy, acmeTokens[0].kind], ['18px', 'acme', 'fixed']);
  assert.equal(acmeTokens[1].value.fontSize, '18px');
  assert.equal(acmeTokens[2].value, '32px', 'scale 2 × space200 (16px)');

  // An id that is not vocabulary is answered per token, with the rule and nearby ids.
  const missing = (await server.call('resolve', { tokens: ['tanrei.sys.shape.corner.tiny', small] })).data.tokens;
  assert.match(missing[0].error, /not in system "tanrei"[\s\S]*To add it, declare it under "vocabulary"[\s\S]*propose_extension/);
  assert.doesNotMatch(missing[0].error, /cannot add|fixed/);
  assert.ok(missing[0].near.includes('tanrei.sys.shape.corner.extra-small'));
  assert.equal(missing[1].value, '6px');
  assert.equal((await server.call('resolve', { token: small, system: 'fluent' })).ok, false);

  // Extensions resolve like anything else. A layer's own tokens keep their own CSS prefix, as the web emitter writes them.
  const ext = (await server.call('resolve', { tokens: ['acme.comp.rating.star.size', 'acme.comp.rating.star.color', 'tanrei.comp.button.container.height.3x', 'tanrei.sys.color.brand-glow'], layerFile: extendedFile })).data.tokens;
  assert.deepEqual(ext[0], { id: 'acme.comp.rating.star.size', $type: 'dimension', value: '20px', kind: 'derived', rule: { fn: 'mul', of: '{tanrei.dial.size.unit}', by: 5 }, inputs: { 'tanrei.dial.size.unit': '4px' }, extension: true, declaredBy: 'acme', cssVar: '--acme-comp-rating-star-size' });
  assert.deepEqual([ext[1].cssVar, ext[1].aliasChain[0]], ['--acme-comp-rating-star-color', 'tanrei.sys.color.warning']);
  assert.deepEqual([ext[2].value, ext[2].cssVar, ext[2].declaredBy], ['84px', '--tanrei-comp-button-container-height-3x', 'acme'], 'large (56px) × 1.5');
  assert.deepEqual([ext[3].kind, ext[3].rule.fn, ext[3].extension], ['derived', 'tone', true]);
});

test('explain_token: rationale, the layers that touch it, and the legal operations', async () => {
  const hover = (await server.call('explain_token', { token: 'tanrei.comp.button.filled.hovered.container.color', system: 'cupertino' })).data;
  assert.match(hover.vocabulary.rationale, /One product uses buttons/);
  assert.deepEqual(hover.touchedBy.map((t) => t.layer), ['core', 'cupertino'], 'root first');
  assert.equal(hover.touchedBy[0].rules[0].match, 'tanrei.comp.*.*.hovered.container.color');
  assert.equal(hover.touchedBy[0].rules[0].derive.fn, 'mix');
  assert.deepEqual(hover.effectiveOperation, { $value: '{tanrei.comp.button.filled.container.color}' }, 'Apple has no hover: the later layer’s pattern wins');
  assert.equal(hover.kind, 'alias');
  assert.deepEqual(hover.howToChange.map((o) => o.op), ['re-point alias', 'derive', 'derive (tone)', 'derive (contrast-pick)', 'pin $value', 'pattern rule']);
  assert.equal(hover.howToChange.at(-1).write.rules[0].match, 'tanrei.comp.*.*.hovered.container.color');
  assert.ok(hover.llm === null || Array.isArray(hover.llm), 'LLM guidance is optional metadata: null until the vocabulary carries it');
  assert.ok(hover.cannot.some((c) => /additive only/.test(c)) && hover.cannot.some((c) => /add an interaction state/.test(c)) && hover.cannot.some((c) => /accessibility threshold/.test(c)));
  assert.ok(!hover.cannot.some((c) => /add a token id/.test(c)), 'adding vocabulary is not on the list');

  const corner = (await server.call('explain_token', { token: 'tanrei.sys.shape.corner.small', system: 'm3-like' })).data;
  assert.equal(corner.vocabulary.from, 'tanrei.sys.shape.corner', 'the rationale is inherited from the group');
  assert.deepEqual(corner.touchedBy, [{ layer: 'm3-like', operation: { derive: { fn: 'mul', of: '{tanrei.dial.shape.unit}', by: 2 } } }]);
  assert.equal(corner.setBy, 'm3-like');
  assert.deepEqual(corner.howToChange.map((o) => o.op), ['scale', 're-point alias', 'derive', 'pin $value']);
  assert.deepEqual(corner.howToChange[0].write, { tokens: { 'tanrei.sys.shape.corner.small': { scale: 1.5 } } }, 'every `write` is a fragment of a layer');
  const usedBy = (await server.call('explain_token', { token: 'tanrei.sys.shape.corner.small' })).data.usedBy;
  // `usedBy.first` shows eight ids in alphabetical order; whatever else aliases the step, the menu bar's own alias chain
  // says it is one of them. (A menu's row is not: its corner is its sheet's less the inset, a `sub` rule.)
  const menubarShape = (await server.call('explain_token', { token: 'tanrei.comp.menubar.container.shape' })).data;
  assert.ok(usedBy.total >= 1 && JSON.stringify(menubarShape.aliasChain ?? []).includes('tanrei.sys.shape.corner.small'), 'in the root system the menu bar aliases this step');
  assert.ok(!usedBy.first.includes('tanrei.comp.button.container.shape'), 'every button is fully rounded');
  // What `usedBy` means, held from the tokens and not from a list every new component joins: under m3-like every
  // token whose alias reaches the step, directly or through another token, is counted, and the first eight are shown.
  // The layer's own built documents (`tokens/generated/m3-like/`) say who aliases whom.
  const aliasesUnder = (system) => {
    const direct = new Map();
    const walk = (node, id) => {
      if (!node || typeof node !== 'object') return;
      if ('$value' in node) {
        const target = typeof node.$value === 'string' && /^\{[^{}]+\}$/.test(node.$value) ? node.$value.slice(1, -1) : null;
        if (target) direct.set(id, target);
        return;
      }
      for (const [key, child] of Object.entries(node)) if (!key.startsWith('$')) walk(child, id ? `${id}.${key}` : key);
    };
    const dir = path.join(repo, 'tokens/generated', system);
    for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.tokens.json')) walk(JSON.parse(fs.readFileSync(path.join(entry.parentPath ?? entry.path, entry.name), 'utf8')), '');
    }
    return direct;
  };
  const direct = aliasesUnder('m3-like');
  const reaches = (id, target) => {
    for (let at = direct.get(id), steps = 0; at && steps < 20; at = direct.get(at), steps += 1) if (at === target) return true;
    return false;
  };
  const users = [...direct.keys()].filter((id) => reaches(id, 'tanrei.sys.shape.corner.small')).sort();
  assert.ok(users.length > 8, `more tokens alias the step under m3-like than the answer shows (${users.length})`);
  assert.equal(corner.usedBy.total, users.length, 'every alias of the step under the layer is counted');
  assert.deepEqual(corner.usedBy.first, users.slice(0, 8), 'the first eight, in the order of the ids');
  // m3-like re-points the menu to no corner; a component that keeps the small corner there still aliases the step.
  assert.ok(!users.some((id) => id.startsWith('tanrei.comp.menu.')) && !corner.usedBy.first.some((id) => id.startsWith('tanrei.comp.menu.')), 'the menu is not among the users under m3-like');
  assert.ok(users.includes('tanrei.comp.chip.container.shape') && corner.usedBy.first.includes('tanrei.comp.chip.container.shape'), 'the chip is');

  const dial = (await server.call('explain_token', { token: 'tanrei.dial.space.unit' })).data;
  assert.deepEqual(dial.howToChange.map((o) => o.op), ['set the dial']);
  assert.match(dial.touchedBy, /No layer changes/);
  const full = (await server.call('explain_token', { token: 'tanrei.sys.shape.corner.full' })).data;
  assert.equal(full.kind, 'fixed');
  assert.ok(!full.howToChange.some((o) => o.op === 'scale'), 'a fixed value cannot be scaled');
  const gap = (await server.call('explain_token', { token: 'tanrei.comp.button.container.gap.medium', layerFile: acmeFile })).data;
  assert.deepEqual(gap.touchedBy, [{ layer: 'acme', operation: { $value: '{tanrei.sys.space.space50}' } }]);
  assert.deepEqual(gap.howToChange.slice(0, 2).map((o) => o.op), ['re-point alias', 'scale']);
  // The focus ring is the one role that reads the accent palette (a link takes the primary's color).
  const role = (await server.call('explain_token', { token: 'tanrei.sys.color.focus-ring' })).data;
  assert.deepEqual(role.howToChange.map((o) => o.op), ['change the palette', 'derive', 'derive (contrast-pick)', 're-point alias', 'declare a palette', 'declare a single role']);
  assert.equal(role.touchedBy[0].palette.accent.roles, 'intent', 'the palette the role reads is part of where its value comes from');
  const link = (await server.call('explain_token', { token: 'tanrei.sys.color.link' })).data;
  assert.equal(link.touchedBy[0].operation.$value, '{tanrei.sys.color.primary}', 'in the default system a link is the primary\'s color');
  const type = (await server.call('explain_token', { token: 'tanrei.sys.typescale.body-large' })).data;
  assert.deepEqual(type.howToChange[0].write, { tokens: { 'tanrei.sys.typescale.body-large': { scale: { fontSize: 1.125 } } } });

  // Every snippet the server offers for a numeric token is itself a valid layer edit.
  for (const operation of corner.howToChange.filter((o) => ['scale', 'derive', 'pin $value'].includes(o.op))) {
    const fragment = JSON.parse(JSON.stringify(operation.write).replace('<family>', 'shape').replace(/<why[^>]*>/, 'Because the test says so.'));
    const result = (await server.call('validate_layer', { layer: { id: 'snippet', extends: 'm3-like', ...fragment } })).data;
    assert.deepEqual(result.problems, [], operation.op);
  }
  assert.equal((await server.call('explain_token', { token: 'tanrei.sys.color.brand' })).ok, false);
});

test('explain_token: an extension says who declared it and why; every token says how to extend next to it, and what follows it', async () => {
  const explain = async (token, args = { layerFile: extendedFile }) => (await server.call('explain_token', { token, ...args })).data;

  // A member of a declared size.
  const height = await explain('tanrei.comp.button.container.height.3x');
  assert.deepEqual([height.extension, height.declaredBy, height.rationale], [true, 'acme', 'A hero call-to-action on the landing screen.']);
  assert.deepEqual([height.value, height.kind, height.rule], ['84px', 'derived', { fn: 'mul', of: '{tanrei.sys.control.height.large}', by: 1.5, min: '{tanrei.sys.target.minimum}' }], 'large (the ladder\'s large step, never below the minimum target) × 1.5');
  assert.match(height.touchedBy, /after "acme" declared it/);
  assert.deepEqual(height.howToChange[0].write, { tokens: { 'tanrei.comp.button.container.height.3x': { scale: 1.5 } } }, 'an extension takes operations like any core token');
  // A member that the layer also values under `tokens`, and the layer's own token.
  const block = await explain('tanrei.comp.button.container.padding-block.3x');
  assert.deepEqual([block.declaredBy, block.value, block.setBy, block.touchedBy], ['acme', '16px', 'acme', [{ layer: 'acme', operation: { $value: '{tanrei.sys.space.space200}' } }]]);
  const star = await explain('acme.comp.rating.star.size');
  assert.deepEqual([star.extension, star.declaredBy, star.rationale, star.cssVar], [true, 'acme', 'The rating component\'s star.', '--acme-comp-rating-star-size']);
  // The generated state tokens of a declared variant belong to the declaration.
  const hovered = await explain('tanrei.comp.button.danger.hovered.container.color');
  assert.deepEqual([hovered.extension, hovered.declaredBy, hovered.declaredAs, hovered.rationale], [true, 'acme', 'tanrei.comp.button.variant.danger', 'Destructive confirmation is a distinct emphasis in this product.']);
  assert.equal(hovered.rule.fn, 'mix', 'valued by the root system\'s pattern rule');
  // Core vocabulary carries none of this.
  const core = await explain('tanrei.comp.button.container.height.large');
  assert.deepEqual([core.extension, core.declaredBy, core.rationale], [undefined, undefined, undefined]);

  // howToExtend — a token of a series: one more step, shaped like this one; and always a token of your own.
  const step = await explain('tanrei.sys.space.space200', {});
  assert.deepEqual(step.howToExtend.map((r) => r.op), ['add a step to this series', 'add your own token']);
  assert.deepEqual(step.howToExtend[0].write, { vocabulary: { 'tanrei.sys.space.<new-step>': { $type: 'dimension', rationale: '<why this design system or product needs it — 8+ characters>', derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: '<coefficient>' } } } });
  assert.deepEqual(Object.keys(step.howToExtend[1].write.vocabulary), ['<layer id>.comp.<your-component>.<part>'], 'no product layer named: the namespace is a placeholder');
  // …a member of a component axis: one more value of that axis, cloned from this one.
  assert.deepEqual(core.howToExtend.map((r) => r.op), ['add a size', 'add your own token']);
  assert.deepEqual(core.howToExtend[0].write, { vocabulary: { 'tanrei.comp.button.size.<new-value>': { from: 'large', scale: 1.5, rationale: '<why this design system or product needs it — 8+ characters>' } } });
  assert.match(core.howToExtend[0].effect, /Existing values: small, medium, large, 3x/, 'the axis as this system has it, extensions included');
  const variant = await explain('tanrei.comp.button.tonal.pressed.label.color', {});
  assert.deepEqual(variant.howToExtend[0].write, { vocabulary: { 'tanrei.comp.button.variant.<new-value>': { from: 'tonal', rationale: '<why this design system or product needs it — 8+ characters>' } } });
  assert.match(variant.howToExtend[0].effect, /pattern rules value its hovered, focused, pressed and disabled tokens/);
  // …any token: a token of the product's own, in the product's namespace, referencing this one.
  assert.deepEqual(core.howToExtend[1].write, { vocabulary: { 'acme.comp.<your-component>.<part>': { $type: 'dimension', rationale: '<why this design system or product needs it — 8+ characters>', $value: '{tanrei.comp.button.container.height.large}' } } });
  const dial = await explain('tanrei.dial.size.unit');
  assert.deepEqual(dial.howToExtend.map((r) => r.op), ['add your own token'], 'dials are not a series a layer extends');

  // followers — what moves when this token (or dial) does: aliases and rules, transitively, extensions included.
  assert.ok(dial.followers.total > dial.followers.first.length && dial.followers.first.length === 8);
  const plain = await explain('tanrei.dial.size.unit', {});
  assert.equal(dial.followers.total - plain.followers.total, 5, 'in the extended system the dial also drives height.3x, icon.size.3x, icon.size-without-label.3x (the icon-only glyph), width-wide.3x (the wide icon-only width) and the product\'s own star; the narrow inset padding-inline-narrow.3x follows the space scale, not the size dial');
  const base = await explain('tanrei.dial.type.base', {});
  // The 16 text styles follow the type dial, and so does every component token that aliases one (Button's
  // label at three sizes, and each later component's text) — counted from the vocabulary, not written down.
  const lock = JSON.parse(fs.readFileSync(path.join(repo, 'tokens/vocabulary.lock.json'), 'utf8')).tokens;
  const textStyles = Object.entries(lock).filter(([id, type]) => type === 'typography');
  assert.equal(base.followers.total, textStyles.length, 'every text style and every component text token follows the type dial');
  const space50 = await explain('tanrei.sys.space.space50');
  assert.ok(space50.followers.first.includes('acme.comp.rating.gap'), 'a layer\'s own token follows the core token it references');
  assert.deepEqual((await explain('acme.comp.rating.gap')).followers, { total: 0, first: [] }, 'and nothing in tanrei.* follows a layer\'s own token');
  assert.match(step.then, /fragment of a layer[\s\S]*propose_extension/);
});

test('diff_systems: counts first, details paginated', async () => {
  const diff = (await server.call('diff_systems', { a: 'tanrei', b: 'm3-like', limit: 5 })).data;
  assert.equal(diff.changes.length, 5);
  assert.deepEqual(diff.changes[0], { id: 'tanrei.dial.shape.unit', a: '2px', b: '4px', setBy: ['m3-like'] });
  assert.equal(diff.byTier.dial, 1);
  assert.equal(diff.byTier.dial + diff.byTier.ref + diff.byTier.sys + diff.byTier.comp, diff.changed);
  assert.equal(Object.values(diff.byGroup).reduce((a, b) => a + b, 0), diff.changed);
  assert.equal(diff.nextOffset, 5);
  assert.ok(diff.onlyInB.fromPalettes.first.includes('tanrei.sys.color.tertiary') && diff.onlyInA.fromPalettes.first.includes('tanrei.sys.color.accent'));

  const shape = (await server.call('diff_systems', { a: 'tanrei', b: 'm3-like', group: 'sys.shape', limit: 200 })).data;
  assert.equal(shape.total, diff.byGroup['sys.shape']);
  assert.deepEqual(shape.changes.find((c) => c.id === 'tanrei.sys.shape.corner.small'), { id: 'tanrei.sys.shape.corner.small', a: '6px', b: '8px', setBy: ['m3-like'] });
  assert.ok(!shape.changes.some((c) => c.id === 'tanrei.sys.shape.corner.full'), 'fixed in both');

  // Dark differs from light only in colors, so the two diffs disagree exactly there.
  const dark = (await server.call('diff_systems', { a: 'tanrei', b: 'm3-like', scheme: 'dark', group: 'sys.color', limit: 200 })).data;
  assert.deepEqual(dark.changes.find((c) => c.id === 'tanrei.sys.color.primary'), { id: 'tanrei.sys.color.primary', a: '#ebebeb', b: '#d0bcff', setBy: ['m3-like'] });

  // A product against the system it extends: one dial, and everything that follows it.
  const own = (await server.call('diff_systems', { a: 'tanrei', b: acmeFile, limit: 200 })).data;
  assert.equal(own.b, 'acme');
  assert.equal(own.byGroup['dial.type'], 1);
  assert.equal(own.byGroup['sys.typescale'], 16, 'every one of the 16 text styles follows type.base');
  assert.deepEqual(own.changes.filter((c) => c.setBy).map((c) => c.id).sort(), Object.keys(acme.tokens).sort());
  assert.equal((await server.call('diff_systems', { a: 'tanrei', b: 'tanrei' })).data.changed, 0);

  // Ids on one side only are legitimate: vocabulary a layer declared, labelled with who declared it.
  const ext = (await server.call('diff_systems', { a: 'tanrei', b: extendedFile })).data;
  const declaredTokens = DECLARED_TOKENS + DECLARED_GROUPS * SPRING_FIELDS + SIZE_MEMBERS.length + VARIANT_TOKENS; // the same count search_tokens { extensions: true } reports
  assert.deepEqual([ext.onlyInA.total, ext.onlyInB.total, ext.onlyInB.extensions.total, ext.onlyInB.fromPalettes.total], [0, declaredTokens, declaredTokens, 0]);
  assert.ok(ext.onlyInB.extensions.first.every((e) => e.declaredBy === 'acme'));
  assert.deepEqual(ext.onlyInB.extensions.first[0], { id: 'acme.comp.rating.gap', declaredBy: 'acme' });
  assert.match(ext.note, /EXTENSIONS[\s\S]*declaredBy[\s\S]*Neither is an error/);
  // Extending changes no core value; what the fixture also SETS under "tokens" (its choices, icon families, state opacities) does, and says who set it.
  const core = Object.keys(extended.tokens).filter((id) => !DECLARED.some(([declared]) => id === declared || id.startsWith(`${declared}.`)) && !/\.(3x|danger)(\.|$)/.test(id));
  // Every page: the state colors that follow the fixture's state opacities fill more than one.
  const all = { changes: [] };
  for (let offset = 0; offset !== null; ) {
    const page = (await server.call('diff_systems', { a: 'tanrei', b: extendedFile, limit: 200, offset })).data;
    all.changes.push(...page.changes);
    offset = page.nextOffset;
  }
  assert.deepEqual(all.changes.filter((c) => c.setBy).map((c) => c.id).sort(), core.sort());
  assert.deepEqual(all.changes.find((c) => c.id === 'tanrei.sys.behavior.focus-style'), { id: 'tanrei.sys.behavior.focus-style', a: 'ring', b: 'glow', setBy: ['acme'] }, 'a choice of kind is shown by name');
});

test('validate_layer: the philosophy is enforced, with the way out', async () => {
  const bad = (
    await server.call('validate_layer', {
      layer: {
        id: 'bad',
        extends: 'm3-like',
        tokens: {
          'tanrei.sys.color.brand': { $value: '{tanrei.sys.color.primary}' },
          'tanrei.comp.card.container.color': { $value: '{tanrei.sys.color.surface}' },
          'tanrei.sys.shape.corner.small': { $value: { value: 3, unit: 'px' } },
          'tanrei.dial.space.unit': { $type: 'number', scale: 2 },
          'tanrei.sys.color.primary': { $value: { colorSpace: 'srgb', components: [1, 0, 0] }, reason: 'Brand red, by decree.' },
        },
        rules: [{ match: 'tanrei.comp.*.*.glowing.container.color', $value: '{tanrei.sys.color.primary}' }],
      },
    })
  ).data;
  assert.equal(bad.valid, false);
  assert.deepEqual(bad.chain, ['core', 'm3-like', 'bad']);
  assert.equal(bad.problems.length, 6);
  assert.match(bad.problems[0], /tanrei\.sys\.color\.brand: not a token of this system\.[\s\S]*declare it under "vocabulary" with a "rationale"[\s\S]*"bad\.comp\.…"[\s\S]*propose_extension[\s\S]*declare a palette/);
  assert.doesNotMatch(bad.problems[0], /cannot be added/);
  assert.match(bad.problems[1], /tanrei\.comp\.card\.container\.color: not a token of this system/);
  assert.match(bad.problems[2], /corner\.small: pinning a literal "\$value" needs a "reason"/);
  assert.match(bad.problems[3], /cannot change \$type \(dimension → number\)/);
  assert.match(bad.problems[4], /a color role is not pinned to a literal/);
  assert.match(bad.problems[5], /rules\[0\][\s\S]*matches no token/);
  assert.equal(bad.warnings, undefined, 'nothing is built from an invalid layer');

  // The same role, the legal way: a declared palette. Its roles are ids the layer may then use.
  const brand = (await server.call('validate_layer', { layer: { id: 'good', extends: 'm3-like', palettes: { brand: { description: 'Acme red is fixed by the brand guideline.', source: { seed: '#e60012' }, roles: 'intent' } }, tokens: { 'tanrei.sys.color.link': { $value: '{tanrei.sys.color.brand}' } } } })).data;
  assert.deepEqual([brand.valid, brand.problems], [true, []]);

  // JSON Schema problems, in the pipeline's words; and what only the engine sees.
  const schema = (await server.call('validate_layer', { layer: { id: 'Acme', extends: 'tanrei', colours: {}, tokens: { 'tanrei.dial.type.base': { $value: 1, reason: 'short' } } } })).data;
  assert.equal(schema.valid, false);
  assert.ok(schema.problems.some((p) => /must NOT have additional properties/.test(p)) && schema.problems.some((p) => /\/id must match pattern/.test(p)) && schema.problems.some((p) => /reason must NOT have fewer than 8 characters/.test(p)));
  const dangling = (await server.call('validate_layer', { layer: { id: 'dangling', extends: 'tanrei', tokens: { 'tanrei.comp.button.container.gap.medium': { $value: '{tanrei.sys.space.nope}' } } } })).data;
  assert.match(dangling.problems[0], /alias target \{tanrei\.sys\.space\.nope\} does not exist/);
  assert.match((await server.call('validate_layer', { layer: { id: 'orphan', extends: 'fluent' } })).data.problems[0], /system "fluent" not found: not among the layers passed, not a shipped system/);
  assert.match((await server.call('validate_layer', { layer: { id: 'core' } })).data.problems[0], /root system/);
  assert.match((await server.call('validate_layer', { layer: { id: 'tanrei' } })).data.problems[0], /does not extend "core"/);
  assert.equal((await server.call('validate_layer', {})).ok, false);

  // A valid product layer: the warnings `tanrei build` would print. Thresholds are constants; a product is warned.
  const valid = (await server.call('validate_layer', { layerFile: acmeFile })).data;
  assert.deepEqual([valid.valid, valid.problems, valid.chain], [true, [], ['core', 'tanrei', 'acme']]);
  // The chip holds its label: its small padding-block is 2 (a 20 glyph in a 24 height).
  // The list is exact, by token: each of these heights is its padding twice plus one line of its label at a 16px
  // base, with nothing to spare (the tree view's regular row has 2), so at 18px the line is taller than the height
  // (which platforms treat as a minimum). A component that joins or leaves this list is a change to notice, not a count to adjust.
  const HEIGHTS_WITHOUT_ROOM_AT_18 = [
    'accordion.container.height.regular',
    'button-with-menu.container.height.small',
    'button.container.height.small',
    'segmented-button.container.height.small',
    'tag.container.height.medium',
    'tag.container.height.small',
    'tree-view.container.height.compact',
    'tree-view.container.height.regular',
  ].map((rest) => `tanrei.comp.${rest}`);
  assert.equal(valid.warnings.total, HEIGHTS_WITHOUT_ROOM_AT_18.length);
  assert.deepEqual(valid.warnings.first.map((w) => w.split(':')[0]), HEIGHTS_WITHOUT_ROOM_AT_18, 'type base 18px: the button with menu, the small button and the segmented button no longer hold a label, and neither does the tag at either size (16 + 2 × 2 = 20 and 20 + 2 × 2 = 24 at a 16px base) nor the regular header of the accordion (24 + 2 × 16 = 56), nor a row of the tree view at either density (20 + 2 × 6 = 32 with nothing to spare, and 22 + 2 × 12 = 46 in 48, which a line of 24.75 passes)');
  assert.match(valid.warnings.first[0], /accordion\.container\.height\.regular: 56px cannot hold its content — 2 × padding-block \(16px\) \+ one label line = 59px/);
  assert.match(valid.warnings.first[1], /container\.height\.small: 32px cannot hold its content — 2 × padding-block \(6px\) \+ one label line = 34\.5px/);
  assert.match(valid.warnings.first[4], /tag\.container\.height\.medium: 24px cannot hold its content — 2 × padding-block \(2px\) \+ one label line = 26\.5px/);
  assert.match(valid.warnings.first[5], /tag\.container\.height\.small: 20px cannot hold its content — 2 × padding-block \(2px\) \+ one label line = 22px/);
  assert.match(valid.next, /tanrei build/);
  const inherited = (await server.call('validate_layer', { layer: { id: 'acme-ios', extends: 'cupertino' }, limit: 2 })).data;
  assert.ok(inherited.warnings.total > 2, 'a product layer on a preset is warned about what it inherits too: reported, not hidden');
  assert.equal(inherited.warnings.first.length, 2);
});

test('validate_layer: extensions are valid targets, and each way to get one wrong is named precisely', async () => {
  // The pipeline's fixture — every kind of extension, valued under `tokens` too — is valid, with no false positives.
  const ok = (await server.call('validate_layer', { layerFile: extendedFile })).data;
  assert.deepEqual([ok.valid, ok.problems, ok.extensions, ok.tokens > 570], [true, [], DECLARED.length, true]);
  // …including the ids an axis value GENERATES, a new variant's state tokens as a pattern target, and own-namespace ids.
  const targets = (
    await server.call('validate_layer', {
      layer: {
        ...extended,
        tokens: { ...extended.tokens, 'tanrei.comp.button.container.height.3x': { scale: 1.1 }, 'tanrei.comp.button.danger.pressed.container.color': { $value: '{tanrei.sys.color.error-container}' }, 'acme.comp.rating.star.size': { scale: 2 }, 'tanrei.sys.space.space1200': { derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 13 } } },
        rules: [{ match: 'tanrei.comp.button.danger.*.label.color', $value: '{tanrei.comp.button.danger.label.color}' }],
      },
    })
  ).data;
  assert.deepEqual([targets.valid, targets.problems], [true, []]);

  const problems = async (layer) => (await server.call('validate_layer', { layer: { id: 'shop', extends: 'tanrei', ...layer } })).data.problems;
  const step = { $type: 'dimension', derive: space1200.derive };
  // Missing rationale: said once, not once per branch of the schema's oneOf.
  assert.deepEqual(await problems({ vocabulary: { 'tanrei.sys.space.space1200': step } }), ['shop.system.json /vocabulary/tanrei.sys.space.space1200: an extension needs a "rationale" (8+ characters): why does this design system or product need it?']);
  // The placeholder propose_extension and explain_token write is not a rationale.
  assert.match((await problems({ vocabulary: { 'tanrei.sys.space.space1200': { ...step, rationale: '<why this design system or product needs it — 8+ characters>' } } }))[0], /space1200: the "rationale" is still the placeholder/);
  // Somebody else's namespace.
  assert.deepEqual(await problems({ vocabulary: { 'acme.comp.rating.gap': { $type: 'dimension', rationale: 'Distance between stars.', $value: '{tanrei.sys.space.space50}' } } }), ['shop: vocabulary: acme.comp.rating.gap: a layer\'s own tokens live in its own namespace — "shop.…", not "acme.…"']);
  // Several at once, in the engine's words: an unknown axis, a state as a variant, a `from` that is not a value — and, under
  // `tokens`, an id nobody declared. The member of a size whose declaration FAILED is not reported a second time.
  const many = await problems({
    vocabulary: {
      'tanrei.comp.button.density.compact': { from: 'medium', rationale: 'Dense tables need it.' },
      'tanrei.comp.button.variant.hovered': { from: 'filled', rationale: 'A misunderstanding.' },
      'tanrei.comp.button.size.4x': { from: 'huge', rationale: 'Bigger than big.' },
      'tanrei.comp.button.size.3x': { from: 'large', scale: 1.5, rationale: 'Hero call to action.' },
    },
    tokens: { 'tanrei.comp.button.container.height.3x': { scale: 1.1 }, 'tanrei.comp.button.container.height.4x': { scale: 1.1 }, 'tanrei.comp.button.container.height.5x': { scale: 1.1 } },
  });
  assert.equal(many.length, 4);
  assert.match(many[0], /^shop: vocabulary: tanrei\.comp\.button\.density\.compact: "tanrei\.comp\.button" has no axis "density"/);
  assert.match(many[1], /variant\.hovered: "hovered" is an interaction state; states are not extensible/);
  assert.match(many[2], /size\.4x: "from" must be an existing size \(small, medium, large\), not "huge"/);
  assert.match(many[3], /^shop: tanrei\.comp\.button\.container\.height\.5x: not a token of this system\.[\s\S]*declare it under "vocabulary"/);
  // An id that is not one a layer can declare is named (JSON Schema alone does not say which key).
  assert.match((await problems({ vocabulary: { 'tanrei.dial.speed.unit': { $type: 'number', rationale: 'A dial of our own.', $value: 1, reason: 'Because we can.' } } }))[0], /\/vocabulary\/tanrei\.dial\.speed\.unit: not an id a layer can declare[\s\S]*"shop\.comp\.…"/);
  assert.match((await problems({ vocabulary: { 'tanrei.sys.space.space1200': { ...step, from: 'space1000', rationale: 'Both shapes at once.' } } }))[0], /either a token[\s\S]*or a value on a component axis[\s\S]*It has both/);
  // Declared but never valued: only the real build sees it, and it is reported in the engine's words.
  assert.match((await problems({ vocabulary: { 'shop.comp.badge.size': { $type: 'dimension', rationale: 'The badge on the cart icon.' } } }))[0], /shop\.comp\.badge\.size: declared under "vocabulary" but never given a value/);
  // The core cannot depend on a layer's namespace.
  assert.match((await problems({ vocabulary: { 'shop.comp.badge.size': { $type: 'dimension', rationale: 'The badge on the cart icon.', $value: '{tanrei.sys.space.space200}' } }, tokens: { 'tanrei.comp.button.container.gap.medium': { $value: '{shop.comp.badge.size}' } } }))[0], /a tanrei\.\* token cannot reference \{shop\.comp\.badge\.size\}/);

  // Re-declaring what an ancestor declared (two product layers on disk): an error that points to `tokens`.
  writeStack({ vocabulary: { 'tanrei.sys.space.space1200': { ...space1200, rationale: 'We want it to be 104px here.' } } });
  const again = (await server.call('validate_layer', { layerFile: stackFile('app') })).data;
  assert.deepEqual([again.valid, again.chain], [false, ['core', 'tanrei', 'base', 'app']]);
  assert.deepEqual(again.problems, ['app: vocabulary: tanrei.sys.space.space1200: already declared by layer "base". Declare a token once; change its value under "tokens".']);
  // …which is what works: the inherited extension is a valid target in the child layer.
  writeStack({ tokens: { 'tanrei.sys.space.space1200': { derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: 13 } } } });
  assert.deepEqual([(await server.call('validate_layer', { layerFile: stackFile('app') })).data.problems, (await server.call('resolve', { token: 'tanrei.sys.space.space1200', layerFile: stackFile('app') })).data.tokens[0].value], [[], '104px']);
  const inherited = (await server.call('explain_token', { token: 'tanrei.sys.space.space1200', layerFile: stackFile('app') })).data;
  assert.deepEqual([inherited.declaredBy, inherited.setBy], ['base', 'app'], 'declared by one layer, valued by another');
  writeStack({});
});

test('propose_extension: a ready, verified `vocabulary` fragment for each kind of extension', async () => {
  const propose = (args) => server.call('propose_extension', args);
  const PLACEHOLDER = '<why this design system or product needs it — 8+ characters>';

  // A value on a component axis: size 3x from large × 1.5 — one line, and the trial build reports what it makes.
  const size = (await propose({ kind: 'axis-value', component: 'button', axis: 'size', value: '3x', from: 'large', scale: 1.5, layerId: 'shop' })).data;
  assert.deepEqual(size.write, { vocabulary: { 'tanrei.comp.button.size.3x': { from: 'large', scale: 1.5, rationale: PLACEHOLDER } } });
  assert.deepEqual([size.declares, size.layer, size.system], ['tanrei.comp.button.size.3x', 'shop', 'tanrei']);
  assert.equal(size.verified.built, true);
  const made = size.verified.newTokens.values;
  assert.deepEqual(Object.keys(made).sort(), SIZE_MEMBERS.map((member) => `tanrei.comp.button.${member}.3x`).sort(), 'every member of the size axis');
  assert.equal(size.verified.newTokens.total, SIZE_MEMBERS.length);
  // Large is 56px high with 24px paddings.
  assert.equal(made['tanrei.comp.button.container.height.3x'], '84px', '56px × 1.5');
  assert.equal(made['tanrei.comp.button.container.padding-inline-start.3x'], '36px', '24px × 1.5');
  assert.equal(made['tanrei.comp.button.container.padding-inline-end.3x'], '36px');
  assert.equal(made['tanrei.comp.button.container.gap.3x'], '12px', '8px × 1.5: the icon-to-label gap is per size');
  assert.equal(made['tanrei.comp.button.outline.width.3x'], '1.5px', '1px × 1.5: so is the outline width');
  assert.equal(made['tanrei.comp.button.icon.size.3x'], '36px', '24px × 1.5: a large button’s glyph is 24 since the icon scale moved up');
  assert.match(made['tanrei.comp.button.label.typescale.3x'], /^typography 14px/, 'a text style is cloned as it is');
  assert.deepEqual(size.verified.newWarnings, []);
  assert.match(size.fill[0], /rationale[\s\S]*validate_layer refuses the placeholder/);
  // The fragment as returned is NOT valid — the rationale is the agent's to write — and is valid once it is written.
  const asIs = (await server.call('validate_layer', { layer: { id: 'shop', extends: 'tanrei', ...size.write } })).data;
  assert.match(asIs.problems[0], /still the placeholder/);
  size.write.vocabulary['tanrei.comp.button.size.3x'].rationale = 'A hero call-to-action on the landing screen.';
  assert.deepEqual((await server.call('validate_layer', { layer: { id: 'shop', extends: 'tanrei', ...size.write } })).data.problems, []);
  // `near` is enough to name the component, the axis and `from`; the product's own layer file is where it goes.
  const near = (await propose({ kind: 'axis-value', near: 'tanrei.comp.button.container.height.small', value: 'xs', scale: 0.75, layerFile: acmeFile })).data;
  assert.deepEqual(near.write.vocabulary, { 'tanrei.comp.button.size.xs': { from: 'small', scale: 0.75, rationale: PLACEHOLDER } });
  // 32 × 0.75 is 24, held at the minimum target (32): a size scaled from a floored height keeps the floor.
  assert.deepEqual([near.layer, near.verified.newTokens.values['tanrei.comp.button.container.height.xs']], ['acme', '32px']);
  assert.ok(near.verified.newWarnings.some((w) => /height\.xs/.test(w)), 'thresholds are constants for extensions too: the xs button cannot hold its content, and the proposal says so');

  // A variant: the declaration, plus the resting colors to re-point under `tokens`; its state tokens come from the pattern rules.
  const variant = (await propose({ kind: 'axis-value', component: 'button', axis: 'variant', value: 'danger', from: 'filled' })).data;
  assert.deepEqual(variant.write.vocabulary, { 'tanrei.comp.button.variant.danger': { from: 'filled', rationale: PLACEHOLDER } });
  // A button that toggles rests selected or unselected too, and a destructive one in its destructive look: those resting
  // colors are offered as well, from the variant it was made from.
  assert.deepEqual(variant.write.tokens, {
    'tanrei.comp.button.danger.container.color': { $value: '{tanrei.sys.color.primary}' },
    'tanrei.comp.button.danger.destructive.container.color': { $value: '{tanrei.sys.color.error}' },
    'tanrei.comp.button.danger.destructive.label.color': { $value: '{tanrei.sys.color.on-error}' },
    'tanrei.comp.button.danger.label.color': { $value: '{tanrei.sys.color.on-primary}' },
    'tanrei.comp.button.danger.selected.container.color': { $value: '{tanrei.sys.color.primary}' },
    'tanrei.comp.button.danger.selected.label.color': { $value: '{tanrei.sys.color.on-primary}' },
    'tanrei.comp.button.danger.unselected.container.color': { $value: '{tanrei.sys.color.surface-container-highest}' },
    'tanrei.comp.button.danger.unselected.label.color': { $value: '{tanrei.sys.color.on-surface-variant}' },
  });
  assert.equal(variant.verified.newTokens.total, VARIANT_TOKENS);
  // The values listed are the first 40 ids in order; the state tokens among them come from the pattern rules.
  assert.ok('tanrei.comp.button.danger.focused.container.color' in variant.verified.newTokens.values && 'tanrei.comp.button.danger.disabled.label.color' in variant.verified.newTokens.values);

  // A step in a series: next to `near`, shaped like it; built once the coefficient is given.
  const open = (await propose({ kind: 'step', near: 'tanrei.sys.space.space200', value: 'space1200' })).data;
  assert.deepEqual(open.write.vocabulary['tanrei.sys.space.space1200'], { $type: 'dimension', rationale: PLACEHOLDER, derive: { fn: 'mul', of: '{tanrei.dial.space.unit}', by: '<coefficient — space200 is 2>' } });
  assert.equal(open.verified.built, false);
  assert.match(open.verified.because, /<coefficient — space200 is 2>[\s\S]*"definition"/);
  const step = (await propose({ kind: 'step', near: 'tanrei.sys.space.space200', value: 'space1200', definition: { derive: space1200.derive } })).data;
  assert.deepEqual(step.write, { vocabulary: { 'tanrei.sys.space.space1200': { $type: 'dimension', rationale: PLACEHOLDER, derive: space1200.derive } } });
  assert.deepEqual(step.verified.newTokens, { total: 1, values: { 'tanrei.sys.space.space1200': '96px' } });
  // …or a single color role, with the role drawn on it registered for the contrast checks.
  const role = (await propose({ kind: 'step', near: 'tanrei.sys.color.primary-container', value: 'primary-fixed' })).data;
  assert.deepEqual([role.write.vocabulary['tanrei.sys.color.primary-fixed'].derive.fn, role.write.vocabulary['tanrei.sys.color.primary-fixed'].onRole], ['tone', 'tanrei.sys.color.on-primary-container']);
  assert.match(role.verified.newTokens.values['tanrei.sys.color.primary-fixed'], /^#[0-9a-f]{6}$/);

  // A token of the product's own: its namespace is the layer's id.
  const own = (await propose({ kind: 'own-token', id: 'acme.comp.rating.star.size', $type: 'dimension', definition: { derive: { fn: 'mul', of: '{tanrei.dial.size.unit}', by: 5 } }, layerFile: acmeFile })).data;
  assert.deepEqual(own.write, { vocabulary: { 'acme.comp.rating.star.size': { $type: 'dimension', rationale: PLACEHOLDER, derive: { fn: 'mul', of: '{tanrei.dial.size.unit}', by: 5 } } } });
  assert.deepEqual(own.verified.newTokens.values, { 'acme.comp.rating.star.size': '20px' });
  assert.match(own.notes[0], /--acme-comp-rating-star-size/);
  const ref = (await propose({ kind: 'own-token', id: 'shop.comp.badge.color', near: 'tanrei.sys.color.error', layerId: 'shop' })).data;
  assert.deepEqual(ref.write.vocabulary['shop.comp.badge.color'], { $type: 'color', rationale: PLACEHOLDER, $value: '{tanrei.sys.color.error}' });
  assert.equal(ref.verified.built, true);

  // Refusals — each with the way out.
  const exists = await propose({ kind: 'step', id: 'tanrei.sys.space.space100' });
  assert.equal(exists.ok, false);
  assert.match(exists.data.error, /tanrei\.sys\.space\.space100 already exists in "tanrei" — it is core vocabulary\. Declaring it again is an error[\s\S]*Change its value instead/);
  assert.deepEqual(exists.data.exists, { id: 'tanrei.sys.space.space100', declaredBy: 'core' });
  assert.deepEqual(exists.data.howToChange[0].write, { tokens: { 'tanrei.sys.space.space100': { scale: 1.5 } } }, 'pointed to `tokens`');
  const declared = await propose({ kind: 'own-token', id: 'acme.comp.rating.star.size', $type: 'dimension', layerFile: extendedFile });
  assert.deepEqual([declared.ok, declared.data.exists], [false, { id: 'acme.comp.rating.star.size', declaredBy: 'acme' }]);
  const sizeExists = await propose({ kind: 'axis-value', component: 'button', axis: 'size', value: '3x', layerFile: extendedFile });
  assert.match(sizeExists.data.error, /button\.size\.3x already exists in "acme" — layer "acme" declared it[\s\S]*under "tokens"/);
  assert.match((await propose({ kind: 'axis-value', component: 'button', axis: 'size', value: 'large' })).data.error, /it is core vocabulary/);
  assert.match((await propose({ kind: 'axis-value', component: 'button', axis: 'variant', value: 'hovered' })).data.error, /"hovered" is an interaction state\. States are not extensible/);
  assert.match((await propose({ kind: 'axis-value', component: 'button', axis: 'density', value: 'compact' })).data.error, /tanrei\.comp\.button has no axis "density"\. Its axes: size, variant/);
  const noAxes = (await propose({ kind: 'axis-value', component: 'divider', axis: 'size', value: 'xl' })).data.error;
  // A component without an axis is a component: the refusal says what it lacks, not that it does not exist.
  assert.match(noAxes, /^tanrei\.comp\.divider declares no axis, so there is no size or variant to add a value to; a layer adds VALUES to an axis, not axes\. Components with an axis: /, 'a divider declares no axis, so there is nothing to add a value to');
  assert.doesNotMatch(noAxes, /not a component/);
  assert.doesNotMatch(noAxes.split('Components with an axis: ')[1], /\bdivider\b/, 'and the list offers only the components that have one');
  const noSuch = (await propose({ kind: 'axis-value', component: 'gizmo', axis: 'size', value: 'xl' })).data.error;
  assert.match(noSuch, /^"gizmo" is not a component of this system\. Components with an axis: /, 'a name no component has keeps its message');
  assert.deepEqual(noAxes.match(/Components with an axis: (.*)\.$/)[1].split(', ').sort(), WITH_AXES, 'every component that declares an axis, and only those');
  assert.match((await propose({ kind: 'axis-value', component: 'button', axis: 'size', value: 'xl', from: 'huge' })).data.error, /"from" must be an existing size of button \(small, medium, large\), not "huge"/);
  assert.match((await propose({ kind: 'axis-value', component: 'button', axis: 'size', value: 'Extra_Large' })).data.error, /"Extra_Large" is not a valid name[\s\S]*\^\[a-z0-9\]\[a-z0-9-\]\*\$/);
  assert.match((await propose({ kind: 'step', id: 'tanrei.sys.space.Space1200', $type: 'dimension' })).data.error, /"Space1200" is not a valid name/);
  assert.match((await propose({ kind: 'own-token', id: 'acme.comp.rating.gap', $type: 'dimension', layerId: 'shop' })).data.error, /own namespace — "shop\.…", not "acme\.…"[\s\S]*Did you mean "shop\.comp\.rating\.gap"/);
  assert.match((await propose({ kind: 'own-token', id: 'shop.comp.rating.gap', $type: 'dimension' })).data.error, /pass "layerFile"[\s\S]*or "layerId"/);
  assert.match((await propose({ kind: 'step', id: 'tanrei.dial.speed.unit', $type: 'number' })).data.error, /Dials and the reference tier are not extensible/);
  assert.equal((await propose({ kind: 'token' })).ok, false, 'kind is a closed enum');
  // What only the engine knows is reported in its words, as the result of the trial build.
  const dangling = (await propose({ kind: 'step', near: 'tanrei.sys.space.space200', value: 'space1200', definition: { $value: '{tanrei.sys.space.nope}' } })).data;
  assert.deepEqual([dangling.verified.built, dangling.verified.newTokens], [false, undefined]);
  assert.match(dangling.verified.error, /references unknown token \{tanrei\.sys\.space\.nope\}|alias target|does not exist/);
  // A group that does not exist yet is the engine's call (it accepts one); the proposal says what that means.
  const group = (await propose({ kind: 'step', id: 'tanrei.sys.rhythm.beat', $type: 'dimension', definition: { $value: '{tanrei.sys.space.space100}' } })).data;
  assert.match(group.notes[0], /starts a NEW group[\s\S]*own namespace/);
});

test('an inline layer may extend another inline layer, or a layer file in `dir` — resolved in memory', async () => {
  const base = { id: 'house', name: 'House', extends: 'm3-like', tokens: { 'tanrei.dial.space.unit': { $value: { value: 10, unit: 'px' }, reason: 'A roomier rhythm for the whole product family.' } } };
  const app = { id: 'shop', name: 'Shop', extends: 'house', tokens: { 'tanrei.sys.behavior.pressed-feedback': { $value: 'dim', reason: 'The shop dims on press.' } } };
  const inline = (await server.call('validate_layer', { layer: app, parents: [base] })).data;
  assert.deepEqual([inline.valid, inline.problems, inline.chain], [true, [], ['core', 'm3-like', 'house', 'shop']]);
  // `dim` on a base whose pressed opacity is 1 draws nothing: valid, and said like any other warning.
  assert.match(inline.warnings.first.join('\n'), /pressed-feedback is "dim", but every pressed opacity is 1 .*a press would show nothing/);
  // explain_token shows the choice as the layer wrote it — the name, not the index the documents keep.
  const dimDir = path.join(product, 'dim');
  fs.mkdirSync(dimDir, { recursive: true });
  for (const layer of [base, app]) fs.writeFileSync(path.join(dimDir, `${layer.id}.system.json`), JSON.stringify(layer));
  const explained = await server.call('explain_token', { token: 'tanrei.sys.behavior.pressed-feedback', layerFile: path.join(dimDir, 'shop.system.json') });
  assert.ok(explained.ok, explained.text);
  const dim = explained.data;
  assert.equal(dim.value, 'dim');
  assert.deepEqual(dim.choice, { name: 'dim', index: 2, of: ['overlay', 'ripple', 'dim', 'none'] });
  assert.deepEqual([dim.effectiveOperation, dim.setBy], [{ $value: 'dim', reason: 'The shop dims on press.' }, 'shop'], 'the authored operation, not a rewritten one');
  assert.deepEqual(dim.touchedBy.at(-1), { layer: 'shop', operation: { $value: 'dim', reason: 'The shop dims on press.' } });
  // A product on cupertino that undoes the pressed opacity of every component (it inherits ~100 contrast warnings): the
  // finding about the whole system still leads the shortened list.
  const undone = (await server.call('validate_layer', { layer: { id: 'undone', name: 'Undone', extends: 'cupertino', rules: [{ match: 'tanrei.comp.*.pressed.opacity', $value: 1, reason: 'Undoes the preset’s dimming for every component, to prove the check.' }] }, limit: 3 })).data;
  assert.ok(undone.valid && undone.warnings.total > 20 && undone.warnings.first.length === 3);
  assert.match(undone.warnings.first[0], /pressed-feedback is "dim"/);
  // The parent may live on disk instead; the layer in the request shadows a file of the same id.
  const dir = path.join(product, 'stacked');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'house.system.json'), JSON.stringify(base));
  fs.writeFileSync(path.join(dir, 'shop.system.json'), JSON.stringify({ ...app, tokens: {} }));
  const local = (await server.call('validate_layer', { layer: app, dir })).data;
  assert.deepEqual([local.valid, local.chain], [true, ['core', 'm3-like', 'house', 'shop']]);
  // Problems of a parent in the request are reported with the parent's name.
  const broken = (await server.call('validate_layer', { layer: app, parents: [{ ...base, tokens: { 'tanrei.sys.space.nope': { scale: 2 } } }] })).data;
  assert.equal(broken.valid, false);
  assert.ok(broken.problems.some((p) => /^house: tanrei\.sys\.space\.nope: not a token of this system/.test(p)), broken.problems.join('\n'));
  assert.match((await server.call('validate_layer', { layer: app })).data.problems[0], /system "house" not found: not among the layers passed/);
  assert.equal((await server.call('validate_layer', { layerFile: path.join(dir, 'shop.system.json'), parents: [base] })).ok, false);
});

test('"extends" from a request never becomes a path: not with `dir`, not through a layer file, not through a link', async () => {
  const dir = path.join(product, 'guarded/design');
  fs.mkdirSync(dir, { recursive: true });
  // A file one level above `dir`. Nothing about it may come back: not its id, not its problems, not a parse error.
  fs.writeFileSync(path.join(product, 'guarded/outside.system.json'), JSON.stringify({ id: 'outside-secret', name: 'Secret', extends: 'tanrei', surprise: 'a-telling-property' }));
  fs.writeFileSync(path.join(product, 'guarded/notes.system.json'), 'password=hunter2 not json');
  fs.symlinkSync(path.join(product, 'guarded/outside.system.json'), path.join(dir, 'linked.system.json'));
  const leaks = /outside-secret|a-telling-property|hunter2|Unexpected token/;
  const refused = async (tool, args, pattern) => {
    const result = await server.call(tool, args);
    assert.doesNotMatch(result.text, leaks, `${tool} ${JSON.stringify(args)}`);
    assert.match(result.text, pattern, `${tool} ${JSON.stringify(args)}`);
    return result.data;
  };
  for (const parent of ['../outside', '../notes', '..', path.join(product, 'guarded/outside'), 'outside\u0000', '../outside\u0000', 'Outside', 'a/b']) {
    const data = await refused('validate_layer', { layer: { id: 'x', name: 'X', extends: parent }, dir }, /is not a system id/);
    assert.deepEqual([data.valid, data.chain], [false, []]);
    // In a parent of the request, too.
    await refused('validate_layer', { layer: { id: 'x', name: 'X', extends: 'mid' }, parents: [{ id: 'mid', name: 'Mid', extends: parent }], dir }, /mid\.system\.json \\"extends\\".*is not a system id/);
  }
  // A legal id whose file is a link out of `dir`.
  await refused('validate_layer', { layer: { id: 'x', name: 'X', extends: 'linked' }, dir }, /a link that leaves/);
  // Written in a layer FILE (which finds its parents next to itself): every tool that takes one refuses alike.
  const file = path.join(dir, 'via-file.system.json');
  fs.writeFileSync(file, JSON.stringify({ id: 'via-file', name: 'Via file', extends: '../outside' }));
  await refused('validate_layer', { layerFile: file }, /is not a system id/);
  for (const [tool, args] of [['resolve', { token: 'tanrei.dial.type.base' }], ['list_systems', {}], ['search_tokens', { query: 'dial' }], ['explain_token', { token: 'tanrei.dial.type.base' }], ['propose_extension', { kind: 'step', near: 'tanrei.sys.space.space200', value: 'space1200' }]]) {
    const result = await server.call(tool, { ...args, layerFile: file });
    assert.equal(result.ok, false, tool);
    assert.doesNotMatch(result.text, leaks, tool);
    assert.match(result.text, /is not a system id/, tool);
  }
  assert.equal((await server.call('diff_systems', { a: 'tanrei', b: file })).ok, false);
  fs.writeFileSync(file, JSON.stringify({ id: 'via-file', name: 'Via file', extends: 'linked' }));
  await refused('validate_layer', { layerFile: file }, /a link that leaves/);
});

test('choices of kind and typefaces are shown by name; the winning pattern rule is marked', async () => {
  const resolved = (await server.call('resolve', { tokens: ['tanrei.sys.behavior.pressed-feedback', 'tanrei.sys.shape.corner-smoothing'], system: 'cupertino', raw: true })).data.tokens;
  assert.deepEqual([resolved[0].value, resolved[0].choice, resolved[0].$value], ['dim', { name: 'dim', index: 2, of: ['overlay', 'ripple', 'dim', 'none'] }, 2]);
  assert.equal(resolved[1].value, 0.6, 'corner smoothing is an amount: cupertino draws the iOS corner');
  const found = (await server.call('search_tokens', { query: 'sys.behavior.*', system: 'm3-like' })).data.tokens;
  assert.deepEqual(found.find((t) => t.id.endsWith('pressed-feedback')).value, 'ripple');
  assert.deepEqual(found.find((t) => t.id.endsWith('focus-style')).choices, ['ring', 'glow']);

  const focus = (await server.call('explain_token', { token: 'tanrei.sys.behavior.focus-style', layerFile: extendedFile })).data;
  assert.deepEqual([focus.value, focus.choice.index, focus.setBy], ['glow', 1, 'acme']);
  assert.deepEqual(focus.howToChange.map((o) => o.op), ['choose']);
  assert.deepEqual([focus.howToChange[0].choices, focus.howToChange[0].current, focus.howToChange[0].write.tokens['tanrei.sys.behavior.focus-style'].$value], [['ring', 'glow'], 'glow', 0]);
  assert.deepEqual(focus.howToExtend, [], 'a layer chooses among the names; it does not add one');
  assert.ok(focus.cannot.some((c) => /add a name to a choice of kind/.test(c)));
  const refused = (await server.call('validate_layer', { layer: { id: 'loud', name: 'Loud', extends: 'tanrei', tokens: { 'tanrei.sys.behavior.focus-style': { $value: 'halo', reason: 'A third way of showing focus.' } } } })).data;
  assert.equal(refused.valid, false);
  assert.match(refused.problems.join('\n'), /focus-style: "halo" is not one of its choices \(layer "loud"\)\. Allowed: "ring" \(0\), "glow" \(1\)/);

  const brand = (await server.call('explain_token', { token: 'tanrei.ref.typeface.brand', system: 'm3-like' })).data;
  assert.deepEqual(brand.howToChange.map((o) => o.op), ['set the font stack', 're-point alias']);
  assert.deepEqual(brand.value, ['Roboto', 'system-ui', 'sans-serif']);

  // Two patterns match in cupertino: both are listed, one wins, and it says why.
  const hover = (await server.call('explain_token', { token: 'tanrei.comp.button.filled.hovered.container.color', system: 'cupertino' })).data;
  const rules = hover.touchedBy.flatMap((t) => t.rules.map((r) => [t.layer, r.wins, r.because]));
  assert.equal(rules.filter(([, wins]) => wins).length, 1);
  assert.deepEqual(rules.find(([, wins]) => wins).slice(0, 2), ['cupertino', true]);
  assert.match(rules.find(([, wins]) => wins)[2], /the later one wins a tie|fewest wildcards/);
  assert.match(rules.find(([layer]) => layer === 'core')[2], /was written later|more wildcards/);
  assert.deepEqual([hover.winningRule.layer, hover.winningRule.match !== undefined], ['cupertino', true]);
  const pinned = (await server.call('validate_layer', { layer: { id: 'pin', name: 'Pin', extends: 'tanrei', tokens: { 'tanrei.comp.button.filled.hovered.container.color': { $value: '{tanrei.sys.color.primary-container}' } } } })).data;
  assert.equal(pinned.valid, true, pinned.problems.join('\n'));
});

test('a layer file is re-read when it changes, and cached when it does not', async () => {
  const base = async () => (await server.call('resolve', { token: 'tanrei.dial.type.base', layerFile: acmeFile })).data.tokens[0].value;
  assert.equal(await base(), '18px');
  const started = Date.now();
  assert.equal(await base(), '18px');
  assert.ok(Date.now() - started < 150, 'second answer comes from the cache');
  writeAcme({ ...acme, tokens: { ...acme.tokens, 'tanrei.dial.type.base': { $value: { value: 20, unit: 'px' }, reason: 'Even further away.' } } });
  fs.utimesSync(acmeFile, new Date(), new Date(Date.now() + 5000));
  assert.equal(await base(), '20px');
  writeAcme({ ...acme, tokens: { 'tanrei.sys.color.brand': { $value: '{tanrei.sys.color.primary}' } } });
  fs.utimesSync(acmeFile, new Date(), new Date(Date.now() + 10000));
  const broken = await server.call('resolve', { token: 'tanrei.dial.type.base', layerFile: acmeFile });
  assert.equal(broken.ok, false);
  assert.match(broken.text, /not a color role|unknown token/);
  writeAcme(acme);
  fs.utimesSync(acmeFile, new Date(), new Date(Date.now() + 15000));
  assert.equal(await base(), '18px');
});

test('mimicry_gaps: the registry, filtered and paginated', async () => {
  const all = (await server.call('mimicry_gaps', {})).data;
  const registry = JSON.parse(fs.readFileSync(path.join(pkg, '../../docs/governance/mimicry-gaps.json'), 'utf8')).gaps;
  assert.equal(all.total, registry.length);
  assert.equal(all.gaps.length, Math.min(10, registry.length));
  assert.equal(Object.values(all.byStatus).reduce((a, b) => a + b, 0), registry.length);
  const mechanisms = (await server.call('mimicry_gaps', { kind: 'mechanism', system: 'CUPERTINO' })).data;
  assert.ok(mechanisms.total >= 1 && mechanisms.gaps.every((g) => g.kind === 'mechanism' && g.systems.includes('cupertino')));
  // A preset's accessibility measurements are not gaps: no kind of the registry is about them.
  assert.deepEqual(Object.keys(all.byKind).filter((kind) => /a11y|accessib/.test(kind)), []);
  // Filter by status and system, one per page — expectations read from the registry, which moves (a gap gets resolved).
  const status = registry.find((g) => g.id === 'ripple').status;
  const expected = registry.filter((g) => g.status === status && g.systems.some((system) => system.toLowerCase().includes('material')));
  const filtered = (await server.call('mimicry_gaps', { status, system: 'material', limit: 1 })).data;
  assert.deepEqual([filtered.total, filtered.gaps.length, filtered.gaps[0].id], [expected.length, 1, expected[0].id]);
  assert.ok(expected.some((g) => g.id === 'ripple'));
  assert.equal((await server.call('mimicry_gaps', { id: 'continuous-corners' })).data.gaps[0].status, registry.find((g) => g.id === 'continuous-corners').status);
  assert.equal((await server.call('mimicry_gaps', { status: 'done' })).ok, false);
});

test('resources: philosophy, the layer schema, every shipped layer, every system’s components', async () => {
  const { resources } = await server.client.listResources();
  assert.deepEqual(resources.map((r) => r.uri), ['tanrei://philosophy', 'tanrei://schema/system', ...SHIPPED.map((id) => `tanrei://systems/${id}`), ...LISTED.map((id) => `tanrei://components/${id}`)]);
  const read = async (uri) => (await server.client.readResource({ uri })).contents[0];
  const philosophy = await read('tanrei://philosophy');
  assert.equal(philosophy.mimeType, 'text/markdown');
  assert.ok(philosophy.text.split('\n').length <= 60, 'one page');
  for (const phrase of [/one-product test/i, /"scale": 2/, /"reason"/, /4\.5:1/, /tanrei build/, /"tones": \{ "40"/]) assert.match(philosophy.text, phrase);
  // Both ideals, and how they hold together.
  for (const phrase of [/a small core/, /exact reproduction/, /any layer may extend it/, /a step in a series/, /a value on a component axis/, /the layer's own tokens/, /"tanrei\.comp\.button\.size\.3x": \{ "from": "large", "scale": 1\.5/, /rationale/, /Additive only/, /own namespace = the layer id/, /nothing in `tanrei\.\*` may reference them/, /Interaction states are not extensible/, /--acme-/, /for core and extensions alike/, /propose_extension/]) assert.match(philosophy.text, phrase);
  assert.doesNotMatch(philosophy.text, /never in tokens|can never add|cannot add/i);
  assert.equal(JSON.parse((await read('tanrei://schema/system')).text).title, 'Tanrei design system layer');
  for (const id of SHIPPED) assert.deepEqual(JSON.parse((await read(`tanrei://systems/${id}`)).text), shippedLayer(id), `${id}: the layer file as authored`);
  assert.equal(JSON.parse((await read('tanrei://systems/m3-expressive-like')).text).extends, 'm3-like');
  await assert.rejects(read('tanrei://systems/fluent'), /unknown resource/);
  assert.deepEqual((await server.client.listResourceTemplates()).resourceTemplates.map((t) => t.uriTemplate), ['tanrei://systems/{id}', 'tanrei://components/{id}']);
});

test('the packaged server (bundle + its own copy of the vocabulary and the registry) answers like the sources', async () => {
  execFileSync(process.execPath, [path.join(pkg, 'scripts/build.js')], { cwd: pkg });
  // Build output is not shipped — the server computes every system from its layers — except what the tools read as it
  // is: the measured fidelity reports, and each system's components manifest.
  const generated = path.join(pkg, 'dist/vocabulary/tokens/generated');
  const shippedOutput = fs.existsSync(generated) ? fs.readdirSync(generated, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => path.relative(generated, path.join(entry.parentPath ?? entry.path, entry.name))).sort() : [];
  assert.deepEqual(shippedOutput, [...SHIPPED.filter(fidelityReport).map((id) => path.join(id, 'fidelity.json')), ...LISTED.map((id) => path.join(id, 'components.json'))].sort());
  // The component tools answer from the specs and the catalog: every spec is carried.
  const specs = fs.readdirSync(path.join(repo, 'specs')).filter((name) => name.endsWith('.spec.json'));
  for (const name of specs) assert.deepEqual(JSON.parse(fs.readFileSync(path.join(pkg, 'dist/vocabulary/specs', name), 'utf8')), readJson('specs', name), name);
  assert.ok(fs.existsSync(path.join(pkg, 'dist/vocabulary/packages/tokens-build/generated/component-catalog.json')));
  assert.ok(fs.existsSync(path.join(pkg, 'dist/vocabulary/docs/governance/mimicry-gaps.json')));
  const packaged = await connect({ fromSource: false });
  try {
    assert.equal(packaged.client.getInstructions(), server.client.getInstructions());
    for (const [name, args] of [
      ['list_systems', {}],
      ['list_systems', { layerFile: acmeFile }],
      ['resolve', { tokens: ['tanrei.sys.shape.corner.small', 'tanrei.sys.color.primary'], system: 'cupertino', scheme: 'dark-high' }],
      ['mimicry_gaps', { status: 'open' }],
      // Extensions go through the same code in the package: the engine's operations, the axes, the trial build.
      ['list_systems', { layerFile: extendedFile, warnings: false }],
      ['explain_token', { token: 'tanrei.comp.button.danger.hovered.container.color', layerFile: extendedFile }],
      ['validate_layer', { layerFile: extendedFile }],
      ['propose_extension', { kind: 'axis-value', component: 'button', axis: 'size', value: '3x', from: 'large', scale: 1.5, layerId: 'shop' }],
      // The components: the manifests, the catalog for a product's own, and the specs.
      ['list_components', { system: 'cupertino', limit: 200 }],
      ['list_components', { layerFile: acmeFile, limit: 200 }],
      ['get_component', { name: 'text-field', sections: ['props', 'behavior', 'example', 'platforms'] }],
      ['find_component', { need: 'pick a date' }],
      ['check_usage', { code: '<tanrei-fab-menu label="Create"></tanrei-fab-menu><tanrei-text-field variant="outlined"></tanrei-text-field>' }],
    ]) {
      const [a, b] = [await packaged.call(name, args), await server.call(name, args)];
      assert.equal(a.ok, true, a.text);
      assert.equal(a.text, b.text, name);
    }
    assert.equal((await packaged.client.readResource({ uri: 'tanrei://schema/system' })).contents[0].text, (await server.client.readResource({ uri: 'tanrei://schema/system' })).contents[0].text);
  } finally {
    await packaged.client.close();
  }
});
