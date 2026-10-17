// resolveSystem: a chain of layers — shipped, in files, or only in memory — resolved without touching the disk.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, buildModel } from '../src/model.js';
import { layerChain } from '../src/bundle.js';
import { buildProductSystem, productLayerReader } from '../src/product.js';
import { LayerProblems, chainDigest, localLayerFile, readSystemChain, resolveChain, resolveChainByScheme, resolveSystem, validateSystem } from '../src/resolve.js';
import { SCHEMES, loadSystem, vocabularyDigest } from '../src/scheme.js';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';

leavesNothingBehind(after); // whatever tempDir() made is removed, and the file fails if something stays

const here = path.dirname(fileURLToPath(import.meta.url));
const acme = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/acme.system.json'), 'utf8'));
const base = { id: 'base', name: 'Base', extends: 'm3-like', tokens: { 'tanrei.dial.space.unit': { $value: { value: 10, unit: 'px' }, reason: 'A roomier rhythm for this product family.' } } };
const app = { id: 'app', name: 'App', extends: 'base', tokens: { 'tanrei.dial.type.base': { $value: { value: 18, unit: 'px' }, reason: 'Body text is read at arm’s length.' } } };

test('a shipped system resolved in memory equals the bundle committed on disk, read through the file resolver', async () => {
  const resolved = await resolveSystem({ system: 'm3-like' });
  const fromDisk = await buildModel(path.join(REPO_ROOT, 'tokens/generated/m3-like'), 'm3-like');
  assert.deepEqual(JSON.parse(JSON.stringify(await resolved.model())), JSON.parse(JSON.stringify(fromDisk)));
  assert.deepEqual(resolved.chain.map((l) => l.id), ['core', 'm3-like']);
  assert.equal(resolved.digest, chainDigest(resolved.chain));
});

test('read one scheme at a time (what the MCP server does), a system has the same tokens and the same warnings as read whole', async () => {
  // cupertino: a preset with contrast warnings; acme: a product that extends the vocabulary (a declared palette, steps, axis values).
  for (const layers of [readSystemChain({ system: 'cupertino' }).chain, readSystemChain({ layers: [acme] }).chain]) {
    const [whole, byScheme] = [await resolveChain(layers), await resolveChainByScheme(layers)];
    assert.deepEqual(await byScheme.warnings(), await whole.warnings(), byScheme.id);
    assert.throws(() => byScheme.tokens('dark'), /not loaded yet/);
    for (const scheme of SCHEMES) {
      await byScheme.load(scheme);
      assert.deepEqual(Object.keys(byScheme.tokens(scheme)), Object.keys(whole.tokens(scheme)), `${byScheme.id} ${scheme}`);
      assert.deepEqual(byScheme.tokens(scheme), whole.tokens(scheme), `${byScheme.id} ${scheme}`);
    }
  }
});

test('layers that exist only in memory may extend each other; the last one is the system', async () => {
  // Nothing may be written while resolving: not a bundle, not a temporary directory.
  const real = { mkdtempSync: fs.mkdtempSync, writeFileSync: fs.writeFileSync, mkdirSync: fs.mkdirSync };
  for (const name of Object.keys(real)) fs[name] = () => assert.fail(`resolveSystem called fs.${name}`);
  let resolved;
  try {
    resolved = await resolveSystem({ layers: [base, app] });
  } finally {
    Object.assign(fs, real);
  }
  assert.deepEqual(resolved.chain.map((l) => l.id), ['core', 'm3-like', 'base', 'app']);
  assert.deepEqual(resolved.sources.slice(2), [null, null]);
  assert.deepEqual(resolved.tokens('dark')['tanrei.sys.space.space200'].$value, { value: 20, unit: 'px' }, 'the parent in memory');
  assert.deepEqual(resolved.tokens()['tanrei.sys.typescale.body-large'].$value.fontSize, { value: 18, unit: 'px' }, 'the system itself');
  assert.equal(resolved.system.tokens['tanrei.dial.space.unit'].layer, 'base');
  assert.ok(Array.isArray(await resolved.warnings()));
  // Order among the parents does not matter.
  assert.deepEqual((await resolveSystem({ layers: [acme, base, app] }, { model: false })).chain.map((l) => l.id), ['core', 'm3-like', 'base', 'app']);
});

test('a layer in memory shadows the file of the same id, and finds its parents next to it — what Theme Studio validates before it writes', async () => {
  const dir = tempDir('resolve');
  try {
    fs.writeFileSync(path.join(dir, 'base.system.json'), JSON.stringify(base));
    fs.writeFileSync(path.join(dir, 'app.system.json'), JSON.stringify(app));
    assert.deepEqual(validateSystem({ layerFile: path.join(dir, 'app.system.json') }), []);
    const candidate = { ...app, tokens: { 'tanrei.dial.type.base': { $value: { value: 20, unit: 'px' }, reason: 'Even larger, for the kiosk build.' } } };
    assert.deepEqual(validateSystem({ layers: [candidate], dir }), []);
    const { chain, sources } = readSystemChain({ layers: [candidate], dir });
    assert.deepEqual(chain.map((l) => l.id), ['core', 'm3-like', 'base', 'app']);
    assert.equal(sources[2], path.join(dir, 'base.system.json'));
    assert.equal(sources[3], null);
    const resolved = await resolveSystem({ layers: [candidate], dir }, { model: false });
    assert.equal(resolved.tokens()['tanrei.sys.typescale.body-large'].$value.fontSize.value, 20);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'app.system.json'), 'utf8')).tokens['tanrei.dial.type.base'].$value.value, 18, 'nothing was written');

    // Problems of every layer of the chain come back together; resolveSystem throws them as a list.
    const broken = { ...candidate, surprise: true, tokens: { 'tanrei.dial.type.base': { $value: 3 } } };
    assert.ok(validateSystem({ layers: [broken], dir }).length >= 1);
    await assert.rejects(resolveSystem({ layers: [broken], dir }), (error) => error instanceof LayerProblems && error.problems.length >= 1 && /invalid system layer/.test(error.message));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('what cannot be resolved is said plainly', async () => {
  assert.throws(() => readSystemChain({ layers: [{ id: 'app', extends: 'nowhere' }] }), /system "nowhere" not found: not among the layers passed, not a shipped system/);
  assert.throws(() => readSystemChain({ layers: [{ id: 'a', extends: 'b' }, { id: 'b', extends: 'a' }] }), /"extends" cycle/);
  assert.throws(() => readSystemChain({}), /exactly one of/);
  assert.throws(() => readSystemChain({ system: 'tanrei', layers: [app] }), /exactly one of/);
  assert.match(validateSystem({ layers: [{ id: 'core', name: 'Mine' }] })[0], /root system/);
  assert.throws(() => validateSystem({ layers: [{ id: 'mine', name: 'Mine' }] }), /system "mine" does not extend "core"/);
  await assert.rejects(resolveSystem({ layers: [{ id: 'app', name: 'App', extends: 'tanrei', tokens: { 'tanrei.sys.space.nope': { $value: '{tanrei.sys.space.space100}' } } }] }), /unknown token/);
});

// "extends" is written in a layer nobody has validated yet, and a parent may be looked up in a directory: it must be
// an id before it is a path, and what it leads to must be a regular file inside that directory.
test('"extends" never becomes a path: only a system id is looked up, and only inside the directory', async () => {
  const product = tempDir('resolve-extends');
  const dir = path.join(product, 'design');
  fs.mkdirSync(path.join(dir, 'nested'), { recursive: true });
  const outside = { id: 'outside', name: 'Outside', extends: 'tanrei', description: 'must never be read' };
  fs.writeFileSync(path.join(product, 'outside.system.json'), JSON.stringify(outside));
  fs.writeFileSync(path.join(dir, 'nested/deep.system.json'), JSON.stringify({ ...outside, id: 'deep' }));
  fs.writeFileSync(path.join(dir, 'base.system.json'), JSON.stringify(base));

  // Every file the resolver opens, stats or resolves while it handles a hostile "extends".
  const touched = [];
  const real = { readFileSync: fs.readFileSync, existsSync: fs.existsSync, lstatSync: fs.lstatSync, statSync: fs.statSync, realpathSync: fs.realpathSync };
  const watched = async (run) => {
    for (const name of Object.keys(real)) fs[name] = Object.assign((file, ...rest) => (touched.push(`${name}:${file}`), real[name](file, ...rest)), real[name]);
    try {
      return await run();
    } finally {
      Object.assign(fs, real);
    }
  };

  const hostile = ['../outside', '..', '.', 'nested/deep', `${product}/outside`, path.join(product, 'outside'), 'outside\u0000', 'base\u0000', '..\\outside', 'Base', 'base.system.json', ' base', 'base\n', '', 42, { id: 'base' }, ['base'], true];
  for (const parent of hostile.filter((value) => value !== '')) {
    const layer = { id: 'x', name: 'X', extends: parent };
    const refused = /x\.system\.json "extends": .* is not a system id .*never by a path/s;
    await watched(async () => {
      assert.throws(() => readSystemChain({ layers: [layer], dir }), refused, JSON.stringify(parent));
      assert.throws(() => validateSystem({ layers: [layer], dir }), refused);
      await assert.rejects(resolveSystem({ layers: [layer], dir }), refused);
      await assert.rejects(buildProductSystem({ layers: [layer], dir, targets: ['tokens'] }), refused);
      // …written in a FILE, which finds its parents next to itself, and further up the chain than the system itself.
      fs.writeFileSync(path.join(dir, 'x.system.json'), JSON.stringify(layer));
      assert.throws(() => readSystemChain({ layerFile: path.join(dir, 'x.system.json') }), refused);
      assert.throws(() => readSystemChain({ layers: [{ id: 'y', name: 'Y', extends: 'x' }], dir }), refused);
      assert.throws(() => layerChain('x', productLayerReader(path.join(dir, 'x.system.json'))), refused);
    });
  }
  const strangers = touched.filter((file) => /outside|deep/.test(file));
  assert.deepEqual(strangers, [], 'no path was built from a hostile "extends"');
  // An empty "extends" ends the chain, as before: the layer simply does not reach the root.
  assert.throws(() => readSystemChain({ layers: [{ id: 'x', extends: '' }], dir }), /does not extend "core"/);

  // The same guard wherever an id becomes a file name.
  assert.throws(() => localLayerFile(dir, '../outside'), /not a system id/);
  assert.throws(() => productLayerReader(path.join(dir, 'x.system.json'))('../outside'), /not a system id/);
  assert.throws(() => loadSystem(REPO_ROOT, '../../package'), /not a system id/);
  assert.equal(localLayerFile(dir, 'base'), path.join(dir, 'base.system.json'));
  assert.equal(localLayerFile(dir, 'absent'), null);

  // A legal id whose file is a link: followed inside the directory, refused when it leaves it — or leads nowhere.
  fs.symlinkSync(path.join(product, 'outside.system.json'), path.join(dir, 'leaving.system.json'));
  fs.symlinkSync('../outside.system.json', path.join(dir, 'relative.system.json'));
  fs.symlinkSync(path.join(dir, 'base.system.json'), path.join(dir, 'inside.system.json'));
  fs.symlinkSync(path.join(dir, 'gone.system.json'), path.join(dir, 'dangling.system.json'));
  fs.symlinkSync(path.join(product), path.join(dir, 'up'));
  fs.mkdirSync(path.join(dir, 'folder.system.json'));
  for (const link of ['leaving', 'relative']) {
    touched.length = 0;
    await watched(async () => {
      assert.throws(() => readSystemChain({ layers: [{ id: 'x', name: 'X', extends: link }], dir }), /a link that leaves .*read only from inside/);
      await assert.rejects(resolveSystem({ layers: [{ id: 'x', name: 'X', extends: link }], dir }), /a link that leaves/);
    });
    assert.deepEqual(touched.filter((call) => call.startsWith('readFileSync:') && /outside|leaving|relative/.test(call)), [], 'the link was looked at, never read');
  }
  assert.throws(() => readSystemChain({ layers: [{ id: 'x', extends: 'dangling' }], dir }), /a link that leads nowhere/);
  assert.throws(() => readSystemChain({ layers: [{ id: 'x', extends: 'folder' }], dir }), /not a regular file/);
  // `inside` is a link to base.system.json: read, and then reported like any file whose id is not its name.
  assert.deepEqual(readSystemChain({ layers: [{ id: 'x', extends: 'inside' }], dir }).chain.map((l) => l.id), ['core', 'm3-like', 'base', 'x']);
  assert.match(validateSystem({ layers: [{ id: 'x', name: 'X', extends: 'inside' }], dir }).join('\n'), /inside\.system\.json: "id" must equal the file name/);
  // The directory itself may be reached through a link (macOS: /var → /private/var); that is not "leaving".
  assert.deepEqual(readSystemChain({ layers: [{ id: 'x', extends: 'base' }], dir: path.join(dir, 'up', 'design') }).chain.map((l) => l.id), ['core', 'm3-like', 'base', 'x']);
});

test('vocabularyDigest: the hand-authored files under tokens/ by size and mtime — what a cache of resolved systems keys on next to the chain', () => {
  const root = tempDir('vocabulary-digest');
  const tokens = path.join(root, 'tokens');
  fs.mkdirSync(path.join(tokens, 'sys'), { recursive: true });
  fs.writeFileSync(path.join(tokens, 'tanrei.resolver.json'), JSON.stringify({ sets: { sys: { sources: [{ $ref: 'sys/space.tokens.json' }, { $ref: 'generated/sys.color.light.tokens.json' }] } } }));
  fs.writeFileSync(path.join(tokens, 'sys/space.tokens.json'), JSON.stringify({ tanrei: { sys: { space: { space100: { $type: 'dimension', $value: { value: 8, unit: 'px' } } } } } }));
  const before = vocabularyDigest(root);
  assert.match(before, /^[0-9a-f]{32}$/);
  assert.equal(vocabularyDigest(root), before, 'stable while nothing changes');
  fs.writeFileSync(path.join(tokens, 'sys/space.tokens.json'), JSON.stringify({ tanrei: { sys: { space: { space100: { $type: 'dimension', $value: { value: 10, unit: 'px' } } } } } }));
  const after = vocabularyDigest(root);
  assert.notEqual(after, before, 'an edited source is another vocabulary');
  fs.writeFileSync(path.join(tokens, 'sys/color.vocabulary.json'), '{}');
  assert.notEqual(vocabularyDigest(root), after, 'the color vocabulary counts too, though no resolver names it');
  assert.notEqual(vocabularyDigest(REPO_ROOT), before, 'the real vocabulary has its own name');
  assert.equal(vocabularyDigest(REPO_ROOT), vocabularyDigest(REPO_ROOT));
  fs.rmSync(root, { recursive: true, force: true });
});
