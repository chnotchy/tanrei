// The published server carries its own copy of the vocabulary (scripts/vocabulary.js), trimmed to what it reads. This
// file proves the trim is safe the only way that holds for a path built at run time: it runs one fixed session — every
// tool, every resource, every component in every system — once against the repository and once against the copy.
//   1. Every path the run against the repository touches (traced, packages/tools/src/read-trace.js) is in the copy.
//   2. Every answer from the copy is the same text as the answer from the repository.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readTrace } from '../../tools/src/read-trace.js';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';
import { writeVocabulary } from '../scripts/vocabulary.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(pkg, '../..');
const bin = path.join(pkg, 'bin/tanrei-mcp.js');
const tracer = pathToFileURL(path.join(repo, 'packages/tools/src/read-trace.js')).href;
const readJson = (...parts) => JSON.parse(fs.readFileSync(path.join(...parts), 'utf8'));
/**
 * A path under the repository that is code, not vocabulary: run from the sources, the server loads its modules, its
 * packages' manifests and tanrei.config.json (a JSON import, which the bundle inlines) from there.
 */
const isCode = (relative) => /\.[cm]?js$/.test(relative) || path.basename(relative) === 'package.json' || relative === 'tanrei.config.json' || relative.split(path.sep).includes('node_modules');

const work = tempDir('mcp-packed');
const copy = path.join(work, 'vocabulary');
const product = path.join(work, 'product');
const acmeFile = path.join(product, 'design/acme.system.json');
const extendedFile = path.join(product, 'extended/acme.system.json');

// What the session asks, from the repository: every component of the catalog, every platform a spec names.
const COMPONENTS = readJson(repo, 'packages/tokens-build/generated/component-catalog.json').components;
const specSchema = readJson(repo, 'specs/component.schema.json');
const PLATFORMS = Object.keys(specSchema.properties.platforms.properties);
const [LEVELS, LISTINGS, STATUSES] = [specSchema.properties.level.enum, specSchema.properties.listing.enum, specSchema.$defs.platform.properties.status.enum];
const CATEGORIES = [...new Set(readJson(repo, 'specs/inventory.json').components.map((row) => row.category))];
const SECTIONS = ['props', 'events', 'slots', 'items', 'states', 'behavior', 'accessibility', 'example', 'anatomy', 'tokens', 'platforms', 'fixtures'];

/** Opens the server from the sources, reading the vocabulary at `root`, with every path it touches written to `log`. */
async function open(root, log) {
  const env = { ...process.env, TANREI_MCP_FROM_SOURCE: '1', TANREI_VOCABULARY_ROOT: root, TANREI_READ_TRACE: log };
  const client = new Client({ name: 'tanrei-mcp-packed-test', version: '0.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ['--import', tracer, bin], cwd: product, env, stderr: 'pipe' }));
  return client;
}

/** One fixed session: every request and its answer's text, in order. */
async function session(root, log) {
  const client = await open(root, log);
  const answers = [];
  const ask = async (label, run) => {
    let text;
    try {
      text = JSON.stringify(await run());
    } catch (error) {
      text = `rejected: ${error.message}`;
    }
    answers.push([label, text]);
    return text;
  };
  const call = (name, args) => ask(`${name} ${JSON.stringify(args)}`, () => client.callTool({ name, arguments: args }));
  try {
    answers.push(['instructions', client.getInstructions()]);
    await ask('tools/list', () => client.listTools());
    const resources = JSON.parse(await ask('resources/list', () => client.listResources())).resources;
    await ask('resources/templates/list', () => client.listResourceTemplates());
    for (const { uri } of resources) await ask(`read ${uri}`, () => client.readResource({ uri }));
    await ask('read tanrei://components/core', () => client.readResource({ uri: 'tanrei://components/core' }));
    const systems = resources.filter(({ uri }) => uri.startsWith('tanrei://components/')).map(({ uri }) => uri.slice('tanrei://components/'.length));
    const references = [...systems.map((system) => ({ system })), { layerFile: acmeFile }, { layerFile: extendedFile }];

    await call('list_systems', {});
    await call('list_systems', { layerFile: acmeFile, warnings: false });
    await call('list_systems', { layerFile: extendedFile, warnings: false });
    for (const reference of references) await call('list_components', { ...reference, limit: 200 });
    for (const platform of PLATFORMS) await call('list_components', { platform, limit: 200 });
    for (const level of LEVELS) await call('list_components', { level, limit: 200 });
    for (const listing of LISTINGS) await call('list_components', { listing, limit: 200 });
    for (const status of STATUSES) await call('list_components', { status, platform: 'web', limit: 200 });
    for (const category of CATEGORIES) await call('list_components', { category, limit: 200 });
    await call('list_components', { limit: 7, offset: 7 });
    // Every component, every section, in every system and in a product's own.
    for (const reference of references) for (const { name } of COMPONENTS) await call('get_component', { name, ...reference, sections: SECTIONS });
    for (const { name, web, react } of COMPONENTS) {
      await call('get_component', { name });
      if (web?.element) await call('get_component', { name: web.element });
      if (react?.name) await call('get_component', { name: react.name, sections: ['props', 'example'] });
    }
    await call('get_component', { name: 'text-feild' });
    for (const reference of references) {
      for (const need of ['pick a date', 'confirm before deleting', 'navigate between pages', 'upload a file', 'toggle a setting', 'show progress', 'choose one of several options', 'zz']) await call('find_component', { need, ...reference, limit: 20 });
      const markup = COMPONENTS.map(({ name }) => `<tanrei-${name} variant="outlined"></tanrei-${name}>`).join('\n');
      await call('check_usage', { code: `${markup}\n<tanrei-nope></tanrei-nope>`, path: 'page.html', ...reference });
      await call('check_usage', { code: `import { Button, FabMenu } from '@tanrei/react';\nexport const A = () => <FabMenu label="x" variant="tonal" />;`, path: 'page.tsx', ...reference });
    }
    // The token tools, which read tokens/ and the reports beside it.
    for (const args of [{ query: 'tanrei.comp.button.*.hovered.*' }, { tier: 'sys', limit: 200 }, { tier: 'dial' }, { kind: 'fixed', limit: 200 }, { query: 'acme.**', layerFile: extendedFile }, { extensions: true, layerFile: extendedFile }, { query: 'sys.behavior', system: 'cupertino' }]) await call('search_tokens', args);
    for (const system of systems) await call('resolve', { tokens: ['tanrei.sys.shape.corner.small', 'tanrei.sys.color.primary', 'tanrei.comp.button.container.height.medium', 'tanrei.sys.behavior.press'], system, scheme: 'dark-high', raw: true });
    for (const token of ['tanrei.dial.type.base', 'tanrei.sys.space.space50', 'tanrei.sys.color.primary', 'tanrei.comp.button.container.height.medium', 'tanrei.comp.button.filled.hovered.container.color']) await call('explain_token', { token });
    await call('explain_token', { token: 'acme.comp.rating.gap', layerFile: extendedFile });
    for (const system of systems) await call('diff_systems', { a: 'tanrei', b: system, limit: 200 });
    await call('diff_systems', { a: 'tanrei', b: extendedFile, group: 'comp' });
    await call('validate_layer', { layerFile: acmeFile, limit: 200 });
    await call('validate_layer', { layerFile: extendedFile, limit: 200 });
    await call('validate_layer', { layer: { id: 'shop', name: 'Shop', extends: 'tanrei', components: { omit: { 'not-a-component': { reason: 'Nothing to leave out here.' } } } } });
    await call('propose_extension', { kind: 'axis-value', component: 'button', axis: 'size', value: '3x', from: 'large', scale: 1.5, layerId: 'shop' });
    await call('propose_extension', { kind: 'step', near: 'tanrei.sys.space.space50', value: 'space1200' });
    await call('propose_extension', { kind: 'own-token', id: 'shop.comp.rating.gap', near: 'tanrei.sys.space.space50', layerId: 'shop' });
    await call('mimicry_gaps', { limit: 100 });
  } finally {
    await client.close();
  }
  return answers;
}

let full;
let packed;
before(async () => {
  writeVocabulary(repo, copy);
  fs.mkdirSync(path.dirname(acmeFile), { recursive: true });
  // A product that leaves a component out and takes one from another layer, so the product path of every component tool is taken.
  const held = COMPONENTS.find(({ layer }) => layer && layer !== 'core' && layer !== 'tanrei');
  const components = { omit: { 'text-field': { reason: 'The product only shows text, it never asks for any.', insteadUse: ['button'] } }, ...(held ? { include: [{ name: held.name, from: held.layer }] } : {}) };
  fs.writeFileSync(acmeFile, JSON.stringify({ id: 'acme', name: 'Acme', extends: 'tanrei', palettes: { correct: { description: 'A right answer in a quiz.', source: { seed: '#0f766e' }, roles: 'intent' } }, components }, null, 2));
  fs.mkdirSync(path.dirname(extendedFile), { recursive: true });
  fs.copyFileSync(path.join(repo, 'packages/tokens-build/test/fixtures/acme.system.json'), extendedFile);
  [full, packed] = await Promise.all([
    session(repo, path.join(work, 'full.log')).then((answers) => ({ answers, trace: readTrace(path.join(work, 'full.log')) })),
    session(copy, path.join(work, 'packed.log')).then((answers) => ({ answers, trace: readTrace(path.join(work, 'packed.log')) })),
  ]);
});
leavesNothingBehind(after);

test('the copy leaves out what the server never reads', () => {
  for (const file of ['tokens/vocabulary.lock.json', 'tokens/AGENTS.md']) assert.ok(!fs.existsSync(path.join(copy, file)), file);
  for (const name of fs.readdirSync(path.join(copy, 'specs')).filter((file) => file.endsWith('.spec.json'))) {
    const spec = readJson(copy, 'specs', name);
    assert.ok(!(spec.behavior ?? []).some((rule) => 'verify' in rule), `${name}: no rule's verify`);
    assert.ok(!(spec.fixtures ?? []).some((fixture) => 'twin' in fixture), `${name}: no fixture's twin`);
  }
  // Not a vacuous check: the repository has all of these.
  assert.ok(fs.existsSync(path.join(repo, 'tokens/vocabulary.lock.json')));
  assert.ok(fs.readdirSync(path.join(repo, 'specs')).some((name) => name.endsWith('.spec.json') && (readJson(repo, 'specs', name).behavior ?? []).some((rule) => 'verify' in rule)));
});

test('every path the server touches in the repository is in the copy', (t) => {
  const touched = full.trace
    .filter((file) => file.startsWith(`${repo}${path.sep}`))
    .map((file) => path.relative(repo, file))
    .filter((file) => !isCode(file));
  assert.ok(touched.length > COMPONENTS.length, `the trace saw the run (${touched.length} paths)`);
  const missing = touched.filter((file) => fs.existsSync(path.join(repo, file)) && !fs.existsSync(path.join(copy, file)));
  assert.deepEqual(missing, [], 'touched in the repository, absent from the copy');
  t.diagnostic(`touched in the repository: ${touched.length} paths, ${touched.filter((file) => file.startsWith(`specs${path.sep}`)).length} of them under specs/`);
  for (const file of ['tokens/vocabulary.lock.json', 'tokens/AGENTS.md']) assert.ok(!touched.includes(file), `${file} is never touched`);
  // And the run against the copy touches nothing of the repository's but code.
  const outside = packed.trace.filter((file) => file.startsWith(`${repo}${path.sep}`) && !isCode(path.relative(repo, file)));
  assert.deepEqual(outside, [], 'the copy is read, not the repository');
  // What the copy still carries that this session did not open (each one a file some other input reads, or a candidate to trim).
  const opened = new Set(packed.trace);
  const unopened = fs.readdirSync(copy, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath ?? entry.path, entry.name)).filter((file) => !opened.has(file));
  t.diagnostic(`in the copy, not opened by this session: ${unopened.map((file) => `${path.relative(copy, file)} (${fs.statSync(file).size} B)`).join(', ') || 'none'}`);
});

test('every answer from the copy is the answer from the repository', (t) => {
  assert.equal(packed.answers.length, full.answers.length);
  assert.ok(full.answers.length > COMPONENTS.length * 5, `${full.answers.length} requests`);
  for (const [index, [label, text]] of full.answers.entries()) {
    assert.equal(packed.answers[index][0], label);
    assert.equal(packed.answers[index][1], text, label);
  }
  const errors = full.answers.filter(([, text]) => text.includes('"isError":true') || text.startsWith('rejected:'));
  t.diagnostic(`${full.answers.length} requests, ${errors.length} of them answered with an error: ${errors.map(([label]) => label.slice(0, 60)).join(' | ')}`);
  // The session exercised the components: answers that name rules and fixtures, not errors.
  assert.ok(full.answers.filter(([label, text]) => label.startsWith('get_component') && text.includes('"behavior')).length >= COMPONENTS.length);
});
