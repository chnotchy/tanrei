// The command a person runs to write the lock file (REQUIREMENTS.md, LKD-24), and the function under it.
import './helpers/network.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { asked } from './helpers/network.mjs';
import { api, cli, dist, pkg, refresh, source } from './helpers/module.mjs';
import { page, scratch, serve } from './helpers/server.mjs';
import { png } from './helpers/picture-files.mjs';

const routes = () => ({
  'site.test/a': page('<title>Page A</title><meta property="og:image" content="/a.png">'),
  'site.test/b': page('<title>Page B</title>'),
  'site.test/a.png': { headers: { 'content-type': 'image/png' }, body: png(60, 30) },
  'site.test/favicon.ico': { headers: { 'content-type': 'image/png' }, body: png(32, 32) },
  'other.test/': page('<title>Other</title><link rel="icon" href="/i.png">'),
  'other.test/i.png': { headers: { 'content-type': 'image/png' }, body: png(64, 64) },
});

/** A site's config, as a module: its options, its addresses, and an image step of its own. */
function config(directory, { links = ['https://site.test/a', 'https://site.test/b', 'http://site.test/plain'], origins = ['https://other.test'], more = '', step = true } = {}) {
  const file = path.join(directory, 'links.config.mjs');
  // The stand-in image step is a test helper, and loads the module: a config run as a program of its own leaves it out.
  const helper = pathToFileURL(path.join(source, 'test/helpers/picture-files.mjs')).href;
  fs.writeFileSync(
    file,
    `${step ? `import { imageStep } from ${JSON.stringify(helper)};` : ''}
export default {
  options: { site: ['https://docs.test'], lock: new URL('./content/link-data.lock.json', import.meta.url).pathname, pictureDirectory: new URL('./public/link-pictures', import.meta.url).pathname, ${step ? 'transform: imageStep(),' : ''} ${more} },
  links: ${JSON.stringify(links)},
  origins: async () => ${JSON.stringify(origins)},
};
`,
  );
  return file;
}
const run = async (directory, argv, internals) => {
  const io = { out: '', err: '' };
  const code = await cli.main(argv, { cwd: directory, stdout: (text) => (io.out += text), stderr: (text) => (io.err += text), internals });
  return { code, ...io };
};
const unplugged = { resolve: () => { throw new Error('unplugged'); }, isPublic: () => { throw new Error('unplugged'); }, route: () => { throw new Error('unplugged'); }, ca: undefined, now: () => { throw new Error('unplugged'); } };

test('LKD-24: update reads what the lock file lacks and writes it with the pictures, for a person to review and commit; a build then needs no network', async (t) => {
  const server = await serve(routes());
  t.after(() => server.close());
  const directory = scratch(t);
  config(directory);
  const first = await run(directory, ['update'], server.seam());
  assert.equal(first.code, 0, first.err);
  assert.match(first.out, /^2 link\(s\) with data, 1 without \(recorded with their reasons\), 1 site icon\(s\)\. content\/link-data\.lock\.json changed: review the diff and commit it with the pictures\.\n$/);
  assert.match(first.err, /links: http:\/\/site\.test\/plain: address-refused\n/);
  const lock = path.join(directory, 'content/link-data.lock.json');
  const text = fs.readFileSync(lock, 'utf8');
  assert.deepEqual(Object.keys(JSON.parse(text).links), ['http://site.test/plain', 'https://site.test/a', 'https://site.test/b']);
  assert.deepEqual(Object.keys(JSON.parse(text).icons), ['https://other.test', 'https://site.test']);
  assert.equal(fs.readdirSync(path.join(directory, 'public/link-pictures')).length, 2, 'the picture, and one file for the two icons: they are the same bytes, so they have the same name');
  // Again: nothing to read, nothing changes.
  const requests = server.requests.length;
  const second = await run(directory, ['update'], server.seam());
  assert.equal(second.code, 0);
  assert.match(second.out, /content\/link-data\.lock\.json is unchanged\./);
  assert.equal(server.requests.length, requests);
  assert.match(second.err, /address-refused/, 'each run says anew what it could not read');
  // The build's own check, with the network unplugged.
  const check = await run(directory, ['check'], unplugged);
  assert.equal(check.code, 0, check.err);
  assert.match(check.out, /^2 link\(s\) and 1 site icon\(s\) are answered from content\/link-data\.lock\.json; 0 address\(es\) have no entry\.\n$/);
  assert.equal(fs.readFileSync(lock, 'utf8'), text);
});

test('LKD-24: refresh reads every address again, and only a changed word changes the file', async (t) => {
  const server = await serve(routes());
  t.after(() => server.close());
  const directory = scratch(t);
  config(directory);
  await run(directory, ['update'], server.seam());
  const lock = path.join(directory, 'content/link-data.lock.json');
  const text = fs.readFileSync(lock, 'utf8');
  server.requests.length = 0;
  const same = await run(directory, ['refresh'], server.seam());
  assert.match(same.out, /is unchanged/);
  assert.deepEqual(server.requests.map((request) => `${request.host}${request.url}`).sort(), ['other.test/', 'other.test/i.png', 'site.test/a', 'site.test/a.png', 'site.test/b', 'site.test/favicon.ico']);
  assert.equal(fs.readFileSync(lock, 'utf8'), text);
  server.routes['site.test/b'] = page('<title>Page B has a new title</title>');
  const changed = await run(directory, ['refresh'], server.seam());
  assert.match(changed.out, /changed: review the diff/);
  const lines = (value) => value.split('\n');
  const differing = lines(fs.readFileSync(lock, 'utf8')).filter((line, index) => line !== lines(text)[index]);
  assert.deepEqual(differing, ['      "title": "Page B has a new title",'], 'the diff a reviewer sees is the new words');
});

test('LKD-24: check reads nothing and fails where the lock file lacks an address', async (t) => {
  const directory = scratch(t);
  config(directory);
  const check = await run(directory, ['check'], unplugged);
  assert.equal(check.code, 1);
  assert.match(check.out, /^0 link\(s\) and 0 site icon\(s\) are answered from content\/link-data\.lock\.json; 4 address\(es\) have no entry\.\n$/);
  assert.match(check.err, /https:\/\/site\.test\/a: not-in-lock/);
  assert.equal(fs.existsSync(path.join(directory, 'content')), false, 'and it writes nothing');
});

test('the command says what it does not understand, and never throws', async (t) => {
  const directory = scratch(t);
  assert.deepEqual([(await run(directory, [])).code, (await run(directory, ['fetch'])).code, (await run(directory, ['update', '--fast'])).code], [2, 2, 2]);
  const missing = await run(directory, ['update']);
  assert.equal(missing.code, 2);
  assert.match(missing.err, /the config .*links\.config\.mjs cannot be read/);
  const help = await run(directory, ['--help']);
  assert.equal(help.code, 0);
  assert.match(help.out, /usage: tanrei-links <update\|refresh\|check>/);
  fs.writeFileSync(path.join(directory, 'empty.mjs'), 'export default 1;');
  assert.equal((await run(directory, ['update', '--config', 'empty.mjs'])).code, 2);
  config(directory, { more: 'offline: true' });
  const bad = await run(directory, ['update'], unplugged);
  assert.equal(bad.code, 2);
  assert.match(bad.err, /options\.offline is not an option of the links helper/);
});

test('the command is the package\'s bin, runs as a program, and in check opens no connection', async (t) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8'));
  assert.deepEqual(manifest.bin, { 'tanrei-links': './dist/links/node/cli.js' });
  const program = path.join(dist, 'cli.js');
  assert.ok(fs.readFileSync(program, 'utf8').startsWith('#!/usr/bin/env node\n'));
  assert.ok(fs.statSync(program).mode & 0o100, 'it may be executed');
  const directory = scratch(t);
  config(directory, { links: ['https://site.test/a'], origins: [], step: false });
  const help = spawnSync(process.execPath, [program, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /usage: tanrei-links/);
  // A name resolver that fails loudly is loaded before the program: check must never ask it.
  const guard = path.join(directory, 'guard.mjs');
  fs.writeFileSync(guard, `import dns from 'node:dns'; import net from 'node:net';\nconst stop = (what) => () => { process.stderr.write('NETWORK ' + what + '\\n'); process.exit(97); };\ndns.promises.lookup = stop('lookup'); dns.lookup = stop('lookup'); net.Socket.prototype.connect = stop('connect');\n`);
  const check = spawnSync(process.execPath, ['--import', pathToFileURL(guard).href, program, 'check'], { cwd: directory, encoding: 'utf8' });
  assert.equal(check.status, 1, check.stderr);
  assert.match(check.stdout, /1 address\(es\) have no entry/);
  assert.doesNotMatch(check.stderr, /NETWORK/);
});

test('refreshLinkData() is the same thing as a function, for a site that has a script of its own', async (t) => {
  const server = await serve(routes());
  t.after(() => server.close());
  const directory = scratch(t);
  const options = { site: ['https://docs.test'], lock: path.join(directory, 'link-data.lock.json'), pictures: 'none', report: () => {} };
  const summary = await refresh.refreshLinkDataWith({ links: ['https://site.test/a', 'https://site.test/a', 'https://site.test/missing'], options }, server.seam());
  assert.deepEqual(summary, { lock: options.lock, changed: true, links: ['https://site.test/a'], failed: [{ href: 'https://site.test/missing', reason: 'unreachable' }], icons: [] });
  assert.equal((await refresh.refreshLinkDataWith({ links: ['https://site.test/a'], options }, server.seam())).changed, false);
  await assert.rejects(async () => api.refreshLinkData({ options, mode: 'online' }), TypeError);
  await assert.rejects(async () => api.refreshLinkData({ options, links: 'https://site.test/a' }), TypeError);
  await assert.rejects(async () => api.refreshLinkData(null), TypeError);
  assert.deepEqual(await api.refreshLinkData({ options, mode: 'frozen', links: ['https://site.test/a'] }), { lock: options.lock, changed: false, links: ['https://site.test/a'], failed: [], icons: [] }, 'the public function, frozen: from the lock file');
});

test('the platform was asked to resolve no name', () => assert.deepEqual(asked, []));
