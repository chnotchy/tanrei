// The component tools, end to end over stdio, from a directory that is not the Tanrei repository. What they answer is
// checked against the two sources they answer from — the systems' components manifests and the component specs — and,
// for which components a system has, against the inventory and the layers themselves, worked out here on their own.
import assert from 'node:assert/strict';
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
const { namespace, web: { tagPrefix }, packages: { npmScope } } = readJson('tanrei.config.json');
const WEB = `${npmScope}/web`;
const REACT = `${npmScope}/react`;

const ROOT = 'core';
const layer = (id) => readJson('tokens/systems', `${id}.system.json`);
// The systems a product chooses from: every shipped layer but the root.
const LISTED = fs.readdirSync(path.join(repo, 'tokens/systems')).filter((name) => name.endsWith('.system.json')).map((name) => name.slice(0, -'.system.json'.length)).filter((id) => id !== ROOT).sort();
const INVENTORY = readJson('specs/inventory.json').components.filter((row) => fs.existsSync(path.join(repo, 'specs', `${row.name}.spec.json`)));
const spec = (name) => readJson('specs', `${name}.spec.json`);
const manifest = (id) => {
  const { $comment, ...rest } = readJson('tokens/generated', id, 'components.json');
  return rest;
};

/**
 * The components a shipped system has, from the inventory and the layers alone: those that live in the root or in a
 * layer of its chain, and those a layer includes from elsewhere, less what a layer leaves out — a later layer of the
 * chain bringing back what an earlier one left out.
 */
function expectedComponents(id) {
  const chain = [];
  for (let at = id; at; at = layer(at).extends) chain.unshift(layer(at));
  const has = new Set(INVENTORY.filter((row) => chain.some((l) => l.id === (row.layer ?? ROOT))).map((row) => row.name));
  for (const { components = {} } of chain) {
    for (const name of Object.keys(components.omit ?? {})) has.delete(name);
    for (const include of components.include ?? []) has.add(typeof include === 'string' ? include : include.name);
  }
  return [...has].sort();
}

const product = tempDir('mcp-components');
let client;
const call = async (name, args = {}) => {
  const result = await client.callTool({ name, arguments: args });
  return { ok: !result.isError, data: JSON.parse(result.content[0].text) };
};

// A product on the default system that takes the FAB menu from the layer it lives in and leaves the carousel out.
const shop = {
  id: 'shop',
  name: 'Shop',
  extends: namespace,
  components: { omit: { carousel: { reason: 'The shop shows one product at a time.', insteadUse: ['list'] } }, include: [{ name: 'fab-menu', from: 'm3-like' }] },
};
const shopFile = path.join(product, 'design/shop.system.json');

before(async () => {
  fs.mkdirSync(path.dirname(shopFile), { recursive: true });
  fs.writeFileSync(shopFile, JSON.stringify(shop, null, 2));
  const env = { ...process.env, TANREI_MCP_FROM_SOURCE: '1' };
  delete env.TANREI_VOCABULARY_ROOT;
  client = new Client({ name: 'tanrei-mcp-components-test', version: '0.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(pkg, 'bin/tanrei-mcp.js')], cwd: product, env, stderr: 'pipe' }));
});
after(async () => {
  await client?.close();
  fs.rmSync(product, { recursive: true, force: true });
});
leavesNothingBehind(after);

test('the instructions send an agent to list_components first, and to the default system for a rebuild', () => {
  const instructions = client.getInstructions();
  assert.match(instructions, /first call list_components to settle the system, and use no component it does not list/);
  assert.match(instructions, new RegExp(`rebuild a product with Tanrei, use system=${namespace}\\b`));
});

test('list_components: every system lists what its layers give it, and the rest under `omitted`', async () => {
  for (const id of LISTED) {
    const { data } = await call('list_components', { system: id, limit: 200 });
    const listed = data.components.map((c) => c.name);
    assert.deepEqual(listed, manifest(id).components.map((c) => c.name), `${id}: the manifest's components`);
    assert.deepEqual([...listed].sort(), expectedComponents(id), `${id}: what the inventory and the layers give`);
    assert.equal(data.total, listed.length);
    // Every component of the inventory is either listed or omitted, once.
    assert.deepEqual([...listed, ...data.omitted.map((o) => o.name)].sort(), INVENTORY.map((row) => row.name).sort(), id);
    assert.deepEqual(data.omittedVariants, manifest(id).omittedVariants, id);
    for (const row of data.components) assert.equal(row.status, spec(row.name).platforms.web.status, `${id} ${row.name}`);
  }
  const { data: tanrei } = await call('list_components', { limit: 200 });
  assert.equal(tanrei.system, namespace, 'the default system');
  assert.deepEqual(tanrei.chain, [ROOT, namespace]);
  assert.match(tanrei.rule, /these components only/);
});

test('list_components: cupertino has no FAB menu; m3-like has it, registered by its own entry', async () => {
  const { data: cupertino } = await call('list_components', { system: 'cupertino', limit: 200 });
  assert.equal(cupertino.components.some((c) => c.name === 'fab-menu'), false);
  const fab = cupertino.omitted.find((o) => o.name === 'fab-menu');
  assert.equal(fab.providedBy, 'm3-like');
  assert.deepEqual(fab.availableIn, LISTED.filter((id) => expectedComponents(id).includes('fab-menu')));
  assert.ok(fab.availableIn.includes('m3-like'));
  assert.deepEqual(fab.howToInclude.write, { components: { include: [{ name: 'fab-menu', from: 'm3-like' }] } });
  const { data: m3 } = await call('list_components', { system: 'm3-like', limit: 200 });
  const listed = m3.components.find((c) => c.name === 'fab-menu');
  assert.deepEqual(listed.web, { tag: `${tagPrefix}-fab-menu`, import: `${WEB}/m3-like`, module: `${WEB}/components/fab-menu` });
  assert.deepEqual(listed.react, { name: 'FabMenu', import: `${REACT}/m3-like` });
});

test('list_components: filters and pages', async () => {
  const advanced = INVENTORY.filter((row) => row.listing === 'advanced').map((row) => row.name);
  const { data } = await call('list_components', { listing: 'advanced' });
  assert.deepEqual(data.components.map((c) => c.name).sort(), advanced.filter((name) => expectedComponents(namespace).includes(name)).sort());
  for (const c of data.components) assert.equal(c.react.import, `${REACT}/advanced`, c.name);
  const { data: actions } = await call('list_components', { category: 'actions' });
  assert.deepEqual(actions.components.map((c) => c.name).sort(), INVENTORY.filter((row) => row.category === 'actions' && expectedComponents(namespace).includes(row.name)).map((row) => row.name).sort());
  const first = (await call('list_components', { limit: 10 })).data;
  const second = (await call('list_components', { limit: 10, offset: first.nextOffset })).data;
  assert.equal(first.nextOffset, 10);
  assert.deepEqual([...first.components, ...second.components].map((c) => c.name), manifest(namespace).components.slice(0, 20).map((c) => c.name));
  assert.equal((await call('list_components', { system: ROOT })).ok, false, 'the root ships no components of its own');
  assert.equal((await call('list_components', { system: 'fluent' })).ok, false);
});

test('list_components: a product’s layer is resolved as `tanrei build` resolves it', async () => {
  const { data } = await call('list_components', { layerFile: 'design/shop.system.json', limit: 200 });
  assert.equal(data.system, 'shop');
  assert.deepEqual(data.chain, [ROOT, namespace, 'shop']);
  const names = data.components.map((c) => c.name);
  assert.ok(names.includes('fab-menu'), 'included from the layer it lives in');
  assert.ok(!names.includes('carousel') && !names.includes('segmented-button'), 'left out by the product, and by the system it extends');
  assert.deepEqual(data.components.find((c) => c.name === 'fab-menu').react, { name: 'FabMenu', import: `${REACT}/all` });
  const carousel = data.omitted.find((o) => o.name === 'carousel');
  assert.deepEqual([carousel.omittedBy, carousel.reason, carousel.insteadUse.map((c) => c.name)], ['shop', 'The shop shows one product at a time.', ['list']]);
  assert.deepEqual(carousel.howToInclude, { note: 'Remove "carousel" from components.omit in shop.system.json.' }, 'what the product left out itself');
  const segmented = data.omitted.find((o) => o.name === 'segmented-button');
  assert.deepEqual(segmented.howToInclude, { write: { components: { include: ['segmented-button'] } } }, 'what the system it extends left out: its own layer includes it');
  const broken = await call('list_components', { layerFile: shopFile.replace('shop.system.json', 'none.system.json') });
  assert.equal(broken.ok, false);
});

test('get_component: the EARS rules of every component, with the spec’s own ids', async () => {
  for (const name of expectedComponents(namespace)) {
    const { data } = await call('get_component', { name, sections: ['behavior'] });
    assert.equal(data.available, true, name);
    assert.deepEqual(data.behavior, (spec(name).behavior ?? []).map(({ id, text }) => ({ id, text })), name);
  }
});

test('get_component: props narrowed to the system’s variants, an example it can draw, and the names on each platform', async () => {
  const { data: field } = await call('get_component', { name: `${tagPrefix}-text-field` });
  assert.equal(field.name, 'text-field');
  const variant = field.props.find((p) => p.name === 'variant');
  assert.deepEqual([variant.values, variant.notInThisSystem], [['stacked'], ['filled', 'outlined']]);
  assert.equal(variant.from, 'text-input.variant', 'a composed component’s prop is its member’s, written out');
  assert.ok(field.props.find((p) => p.name === 'label').description, 'resolved from the field');
  assert.ok(!field.example.props.variant || field.example.props.variant === 'stacked');
  assert.deepEqual(field.react, { name: 'TextField', import: REACT });
  for (const section of ['platforms', 'tokens', 'anatomy', 'fixtures']) assert.equal(section in field, false, `${section} only when asked`);
  const { data: m3 } = await call('get_component', { name: 'TextField', system: 'm3-like', sections: ['props', 'platforms', 'tokens'] });
  assert.ok(m3.props.find((p) => p.name === 'variant').values.includes('outlined'));
  assert.deepEqual(m3.platforms, spec('text-field').platforms);
  assert.equal(m3.tokens.group, `${namespace}.${spec('text-field').tokens}`);
  assert.equal('behavior' in m3, false);
  const { data: button } = await call('get_component', { name: 'button' });
  assert.deepEqual(button.events, spec('button').events);
  assert.equal(button.example.id, spec('button').fixtures[0].id);
});

test('get_component: a component the system does not have is `available: false`, with what to use instead', async () => {
  const { data: fab } = await call('get_component', { name: 'fab-menu', system: 'cupertino' });
  assert.equal(fab.available, false);
  assert.equal(fab.providedBy, 'm3-like');
  assert.equal('props' in fab, false);
  const { data: segmented } = await call('get_component', { name: 'SegmentedButton' });
  assert.equal(segmented.available, false);
  assert.deepEqual(segmented.insteadUse.map((c) => c.name), layer(namespace).components.omit['segmented-button'].insteadUse);
  const unknown = await call('get_component', { name: 'carrousel' });
  assert.equal(unknown.ok, false);
  assert.ok(unknown.data.near.includes('carousel'));
});

test('find_component: by what it is for, among what the system has', async () => {
  const { data: date } = await call('find_component', { need: 'pick a date' });
  assert.equal(date.components[0].name, 'date-time-picker');
  const { data: segmented } = await call('find_component', { need: 'segmented control' });
  assert.ok(!segmented.components.some((c) => c.name === 'segmented-button'));
  assert.ok(segmented.notInThisSystem.find((c) => c.name === 'segmented-button').insteadUse.length);
  const { data: m3 } = await call('find_component', { need: 'segmented control', system: 'm3-like' });
  assert.equal(m3.components[0].name, 'segmented-button');
});

const page = [
  `import '${WEB}/m3-like';`,
  `import { Button, FabMenu, TextField as Field } from '${REACT}';`,
  `import { Chip } from '${REACT}/all';`,
  'export const Page = () => (',
  '  <>',
  '    <Field variant="outlined" label="Email" />',
  `    <${tagPrefix}-fab-menu label="Create"><${tagPrefix}-fab-menu-item label="Upload" icon="upload"></${tagPrefix}-fab-menu-item></${tagPrefix}-fab-menu>`,
  `    <${tagPrefix}-segmented-button></${tagPrefix}-segmented-button>`,
  `    <${tagPrefix}-widget></${tagPrefix}-widget>`,
  '    <Button variant="filled">Go</Button>',
  '  </>',
  ');',
].join('\n');

test('check_usage: a FAB menu in code for the default system is found where it is, with its stand-ins', async () => {
  const { data } = await call('check_usage', { code: page, path: 'src/page.tsx' });
  assert.equal(data.system, namespace);
  assert.equal(data.clean, false);
  const at = (line, column) => data.findings.find((f) => f.line === line && f.column === column);
  const fab = at(7, 6);
  assert.deepEqual([fab.file, fab.kind, fab.found, fab.component, fab.severity], ['src/page.tsx', 'element', `<${tagPrefix}-fab-menu>`, 'fab-menu', 'error']);
  assert.equal(fab.providedBy, 'm3-like');
  assert.ok(fab.availableIn.includes('m3-like'));
  assert.deepEqual(fab.howToInclude.write, { components: { include: [{ name: 'fab-menu', from: 'm3-like' }] } });
  assert.equal(data.findings.filter((f) => f.component === 'fab-menu').length, 4, 'the web entry, the wrapper imported, the element and its item');
  assert.deepEqual([at(1, 9).kind, at(1, 9).found], ['import', `${WEB}/m3-like`]);
  assert.deepEqual([at(2, 18).kind, at(2, 18).found], ['import', 'FabMenu']);
  const segmented = data.findings.find((f) => f.component === 'segmented-button');
  assert.deepEqual([segmented.line, segmented.insteadUse.map((c) => c.name)], [8, layer(namespace).components.omit['segmented-button'].insteadUse]);
  assert.deepEqual(segmented.insteadUse[0].web, { tag: `${tagPrefix}-tabs`, import: WEB, module: `${WEB}/components/tabs` });
  const outlined = data.findings.find((f) => f.kind === 'variant');
  assert.deepEqual([outlined.line, outlined.column, outlined.component, outlined.insteadUse], [6, 12, 'text-field', ['stacked']], 'the alias of an imported wrapper is followed');
  assert.deepEqual([at(9, 6).problem, at(9, 6).severity], [`Tanrei has no element <${tagPrefix}-widget>`, 'error']);
  const chip = data.findings.find((f) => f.component === 'chip');
  assert.deepEqual([chip.severity, chip.use], ['warning', REACT]);
  assert.equal(data.findings.some((f) => f.line === 10), false, 'a filled button is a button of the default system');
  assert.deepEqual([data.errors, data.warnings], [data.findings.length - 1, 1]);
});

test('check_usage: the same code is clean of the FAB menu where the system has it — m3-like, or a product that takes it', async () => {
  for (const reference of [{ system: 'm3-like' }, { layerFile: 'design/shop.system.json' }]) {
    const { data } = await call('check_usage', { code: page, ...reference });
    const fab = data.findings.filter((f) => f.component === 'fab-menu');
    // The elements and the web entry are this system's; the wrapper is in this system's React entry, not in the default system's.
    assert.deepEqual(fab.map((f) => [f.line, f.kind, f.problem, f.use]), [[2, 'import', `'${REACT}' does not export FabMenu`, reference.system ? `${REACT}/m3-like` : `${REACT}/all`]], JSON.stringify(reference));
  }
  fs.writeFileSync(path.join(product, 'page.html'), `<${tagPrefix}-carousel></${tagPrefix}-carousel>\n`);
  const { data } = await call('check_usage', { files: ['page.html'], layerFile: 'design/shop.system.json' });
  assert.deepEqual(data.findings.map((f) => [f.file, f.line, f.column, f.component, f.insteadUse.map((c) => c.name)]), [['page.html', 1, 2, 'carousel', ['list']]]);
  assert.equal((await call('check_usage', { files: ['missing.html'] })).ok, false);
  assert.equal((await call('check_usage', {})).ok, false, 'code or files');
});

test('resources: each system’s components manifest, as the repository generates it', async () => {
  const { resources } = await client.listResources();
  assert.deepEqual(resources.filter((r) => r.uri.startsWith('tanrei://components/')).map((r) => r.uri), LISTED.map((id) => `tanrei://components/${id}`));
  for (const id of LISTED) assert.deepEqual(JSON.parse((await client.readResource({ uri: `tanrei://components/${id}` })).contents[0].text), manifest(id), id);
  await assert.rejects(client.readResource({ uri: `tanrei://components/${ROOT}` }), /unknown resource/);
  assert.ok((await client.listResourceTemplates()).resourceTemplates.some((t) => t.uriTemplate === 'tanrei://components/{id}'));
});
