// REQUIREMENTS.md, LKD-1 — the helper runs under Node only and no browser entry point reaches it — and the seam: what
// the tests replace in the fetcher cannot be reached through the package.
import './helpers/network.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';
import { asked, platform } from './helpers/network.mjs';
import { api, dist, fetcher, pkg, source } from './helpers/module.mjs';
import { optionsIn, scratch } from './helpers/server.mjs';

const manifest = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8'));
const NODE_ENTRY = './links/node';
const specifiers = (text) => [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"\n]+)\1/g)].map((match) => match[2]);
const isBuiltin = (name) => name.startsWith('node:') || builtinModules.includes(name);

/** Every file reached from `entry` by relative imports, and every other specifier met on the way. */
function graph(entry, resolve) {
  const files = new Set();
  const others = new Set();
  const visit = (file) => {
    if (files.has(file)) return;
    files.add(file);
    for (const specifier of specifiers(fs.readFileSync(file, 'utf8'))) {
      if (!specifier.startsWith('.')) others.add(specifier);
      else {
        const next = resolve(path.resolve(path.dirname(file), specifier));
        if (next) visit(next);
      }
    }
  };
  visit(entry);
  return { files: [...files], others: [...others] };
}
const inSource = (file) => [file, file.replace(/\.js$/, '.ts')].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
const inDist = (file) => (fs.existsSync(file) && fs.statSync(file).isFile() ? file : undefined);

test('LKD-1: the graph of src/index.ts holds no file of the helper and no module of Node', () => {
  const { files, others } = graph(path.join(pkg, 'src/index.ts'), inSource);
  assert.ok(files.length > 50, `${files.length} files were walked`);
  assert.deepEqual(files.filter((file) => file.includes(`${path.sep}links${path.sep}node${path.sep}`)), []);
  assert.deepEqual(others.filter(isBuiltin), []);
});

test('LKD-1: no browser entry point of the package reaches the helper — each export\'s own graph, in the built files', () => {
  const targets = [];
  const collect = (key, value) => {
    if (key === NODE_ENTRY) return;
    if (typeof value === 'string') targets.push(value);
    else for (const [condition, inner] of Object.entries(value)) if (condition !== 'types') collect(key, inner);
  };
  for (const [key, value] of Object.entries(manifest.exports)) collect(key, value);
  const scripts = targets.filter((target) => target.endsWith('.js') && !target.includes('*')).map((target) => path.join(pkg, target));
  for (const directory of fs.readdirSync(path.join(pkg, 'dist/components'))) {
    const file = path.join(pkg, 'dist/components', directory, `${directory}.js`);
    if (fs.existsSync(file)) scripts.push(file);
  }
  assert.ok(scripts.length > 40, `${scripts.length} entry points`);
  for (const entry of scripts) {
    const { files, others } = graph(entry, inDist);
    assert.deepEqual(files.filter((file) => file.startsWith(dist + path.sep)), [], path.relative(pkg, entry));
    assert.deepEqual(others.filter(isBuiltin), [], path.relative(pkg, entry));
  }
});

test('LKD-1: the browser bundle does not include the helper', () => {
  const bundle = fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js'), 'utf8');
  for (const mark of ['node:https', 'node:dns', 'node:fs', 'node:zlib', 'rejectUnauthorized', 'link-data.lock', 'refreshLinkData', 'resolveLinkData', 'createBrotliDecompress']) assert.ok(!bundle.includes(mark), mark);
  // `resolveSiteIcons` is not a mark: the link's own debug report names that function when it tells a product to make
  // its site pictures where the site is built (LNK-35), so the name is in the bundle as words, and the helper is not.
  const map = JSON.parse(fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js.map'), 'utf8'));
  assert.ok(map.sources.length > 50);
  assert.deepEqual(map.sources.filter((file) => file.includes('links/node')), []);
  // And the marks are real ones: the helper's own files do hold them.
  const helper = fs.readdirSync(dist).filter((file) => file.endsWith('.js')).map((file) => fs.readFileSync(path.join(dist, file), 'utf8')).join('\n');
  for (const mark of ['node:https', 'node:dns', 'rejectUnauthorized', 'refreshLinkData']) assert.ok(helper.includes(mark), mark);
});

test('LKD-1: the package names the helper under the Node condition alone, and a bundler for a browser cannot resolve it', async () => {
  assert.deepEqual(manifest.exports[NODE_ENTRY], { types: './dist/links/node/index.d.ts', node: './dist/links/node/index.js' });
  const reaches = (value) => (typeof value === 'string' ? value.includes('links/node') : Object.values(value).some(reaches));
  assert.deepEqual(Object.keys(manifest.exports).filter((key) => reaches(manifest.exports[key])), [NODE_ENTRY]);
  for (const [key, value] of Object.entries(manifest.exports)) {
    if (!key.includes('*')) continue;
    for (const target of typeof value === 'string' ? [value] : Object.values(value)) assert.ok(!'./dist/links/node/'.startsWith(target.slice(0, target.indexOf('*'))), `${key} could name a file of the helper`);
  }
  const bundle = (platformName) =>
    build({ stdin: { contents: `import * as links from '${manifest.name}/links/node'; console.log(links);`, resolveDir: path.join(pkg, '../react') }, bundle: true, write: false, format: 'esm', platform: platformName, logLevel: 'silent' });
  await assert.rejects(bundle('browser'), /Could not resolve/);
  await assert.rejects(bundle('neutral'), /Could not resolve/);
  const forNode = await bundle('node');
  assert.match(forNode.outputFiles[0].text, /resolveLinkData/);
});

test('LKD-1: under Node the package\'s own name gives the helper, and the same functions as its files', async () => {
  const named = await import(`${manifest.name}/links/node`);
  assert.equal(named.resolveLinkData, api.resolveLinkData);
  const pure = await import(new URL(`file://${path.join(pkg, 'dist/links/index.js')}`).href);
  assert.deepEqual(Object.keys(named).sort(), [...new Set([...Object.keys(pure), 'markExternalLinks', 'refreshLinkData', 'resolveLinkData', 'resolveSiteIcons'])].sort());
});

test('LKD-1: the helper adds no dependency — to what a browser downloads, or to the package at all', () => {
  assert.deepEqual(Object.keys(manifest.dependencies), ['lit']);
  assert.equal(manifest.peerDependencies, undefined);
  assert.equal(manifest.optionalDependencies, undefined);
  for (const file of fs.readdirSync(source).filter((name) => name.endsWith('.js'))) {
    const text = fs.readFileSync(path.join(source, file), 'utf8');
    for (const specifier of specifiers(text)) assert.ok(specifier.startsWith('node:') || specifier.startsWith('./') || specifier === '../index.js', `${file} imports ${specifier}`);
    assert.doesNotMatch(text, /\brequire\(/, file);
  }
});

test('the seam: the fetcher is given the machine as it is — the default check refuses 127.0.0.1, and the connection goes to the address that was checked', () => {
  const { PRODUCTION } = fetcher;
  assert.ok(Object.isFrozen(PRODUCTION));
  assert.deepEqual(Object.keys(PRODUCTION).sort(), ['ca', 'isPublic', 'now', 'resolve', 'route']);
  for (const address of ['127.0.0.1', '127.0.0.53', '::1', '10.0.0.1', '169.254.169.254', '192.168.0.1', '::ffff:127.0.0.1', '0.0.0.0']) assert.equal(PRODUCTION.isPublic(address), false, address);
  assert.deepEqual(PRODUCTION.route('93.184.216.34', 4), { address: '93.184.216.34', family: 4, port: 443 });
  assert.deepEqual(PRODUCTION.route('2606:4700::1111', 6), { address: '2606:4700::1111', family: 6, port: 443 });
  assert.equal(PRODUCTION.ca, undefined, 'the platform\'s own authorities');
});

test('the seam: the public functions refuse the machine itself, by the platform\'s own resolver, whatever the tests can do elsewhere', async (t) => {
  const { options, said } = optionsIn(scratch(t));
  t.after(() => {
    platform.answer = null;
    asked.length = 0;
  });
  platform.answer = [{ address: '127.0.0.1', family: 4 }];
  assert.deepEqual(await api.resolveLinkData('https://localhost.test/', options), { ok: false, href: 'https://localhost.test/', reason: 'address-private' });
  platform.answer = [{ address: '93.184.216.34', family: 4 }, { address: '::1', family: 6 }];
  assert.deepEqual(await api.resolveLinkData('https://rebind.test/', options), { ok: false, href: 'https://rebind.test/', reason: 'address-private' });
  platform.answer = null;
  assert.deepEqual(await api.resolveLinkData('https://nowhere.test/', options), { ok: false, href: 'https://nowhere.test/', reason: 'unreachable' });
  assert.deepEqual(asked, ['localhost.test', 'rebind.test', 'nowhere.test'], 'the public functions asked the platform, and only it');
  assert.deepEqual(said, ['https://localhost.test/: address-private', 'https://rebind.test/: address-private', 'https://nowhere.test/: unreachable']);
});

test('the seam: no specifier of the package and no option reaches it', async (t) => {
  const { options } = optionsIn(scratch(t));
  for (const key of ['resolve', 'isPublic', 'route', 'ca', 'now', 'internals', 'lookup', 'agent', 'fetch', 'port']) {
    await assert.rejects(async () => api.resolveLinkData('https://site.test/', { ...options, [key]: () => true }), TypeError, key);
    await assert.rejects(async () => api.resolveSiteIcons(['https://site.test'], { ...options, [key]: () => true }), TypeError, key);
    await assert.rejects(async () => api.refreshLinkData({ options: { ...options, [key]: () => true } }), TypeError, key);
  }
  // A third argument is not looked at: the public functions take the address and the options, and pass PRODUCTION.
  assert.deepEqual([api.resolveLinkData.length, api.resolveSiteIcons.length, api.refreshLinkData.length], [2, 2, 1]);
  const lying = { resolve: async () => [{ address: '127.0.0.1', family: 4 }], isPublic: () => true, route: () => ({ address: '127.0.0.1', family: 4, port: 1 }), ca: undefined, now: () => new Date() };
  platform.answer = [{ address: '127.0.0.1', family: 4 }];
  t.after(() => {
    platform.answer = null;
    asked.length = 0;
  });
  assert.equal((await api.resolveLinkData('https://third-argument.test/', options, lying)).reason, 'address-private');
  for (const inner of ['fetcher.js', 'links.js', 'address.js', 'cli.js', 'refresh.js', 'index.js']) {
    for (const specifier of [`${manifest.name}/links/node/${inner}`, `${manifest.name}/dist/links/node/${inner}`, `${manifest.name}/links/node/${inner.replace('.js', '')}`]) {
      await assert.rejects(import(specifier), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, specifier);
    }
  }
  const entry = fs.readFileSync(path.join(source, 'index.js'), 'utf8');
  assert.equal((entry.match(/PRODUCTION\)/g) ?? []).length, 3, 'each public function passes PRODUCTION');
  assert.doesNotMatch(entry, /export \* from '\.\/|export \{[^}]*(?:With|PRODUCTION|readAddress)/, 'and the entry exports nothing that takes a seam');
});

test('the types written by hand declare what the entry exports', () => {
  const types = fs.readFileSync(path.join(source, 'index.d.ts'), 'utf8');
  for (const name of ['markExternalLinks', 'refreshLinkData', 'resolveLinkData', 'resolveSiteIcons']) {
    assert.equal(typeof api[name], 'function');
    assert.match(types, new RegExp(`export function ${name}\\b`));
  }
  assert.match(types, /export \* from '\.\.\/index\.js';/);
  const { options } = fetcher.DEFAULT_LIMITS ? { options: Object.keys(fetcher.DEFAULT_LIMITS) } : {};
  for (const limit of options) assert.match(types, new RegExp(`\\b${limit}\\?: number`), limit);
});

test('every requirement has a test whose title begins with its id', () => {
  const here = path.join(source, 'test');
  const titles = fs.readdirSync(here).filter((file) => file.endsWith('.test.mjs')).flatMap((file) => [...fs.readFileSync(path.join(here, file), 'utf8').matchAll(/test\((?:'|`)(LKD-\d+):/g)].map((match) => match[1]));
  const required = [...new Set([...fs.readFileSync(path.join(source, 'REQUIREMENTS.md'), 'utf8').matchAll(/^- \*\*(LKD-\d+)\*\*/gm)].map((match) => match[1]))];
  assert.equal(required.length, 31);
  assert.deepEqual(required.filter((id) => !titles.includes(id)), []);
});

test('the platform was asked to resolve no name but the ones the seam\'s own tests gave it', () => assert.deepEqual(asked, []));
