// REQUIREMENTS.md, LKD-2 and LKD-23 to LKD-28: the lock file, its modes, and failing.
import './helpers/network.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { asked } from './helpers/network.mjs';
import { links, pkg, pureIsStandIn } from './helpers/module.mjs';
import { PUBLIC, ask, optionsIn, page, scratch, serve } from './helpers/server.mjs';
import { imageStep, png } from './helpers/picture-files.mjs';

const site = () => ({
  'site.test/a': page('<title>Page A</title><meta name="description" content="About A"><meta property="og:image" content="/a.png"><meta property="og:site_name" content="A Site">'),
  'site.test/b': page('<title>Page B</title>'),
  'other.test/c': page('<title>Page C</title><link rel="icon" href="/c-icon.png">'),
  'site.test/untitled': page('<meta name="description" content="No title here">'),
  'site.test/a.png': { headers: { 'content-type': 'image/png' }, body: png(60, 30) },
  'site.test/favicon.ico': { headers: { 'content-type': 'image/png' }, body: png(48, 48) },
  'other.test/c-icon.png': { headers: { 'content-type': 'image/png' }, body: png(32, 32) },
});
const HREFS = ['https://site.test/a', 'https://site.test/b', 'https://other.test/c', 'https://site.test/untitled', 'http://site.test/plain'];
/** A seam through which nothing can be reached: every use of it is written down, and fails. */
const unplugged = () => {
  const used = [];
  const touch = (what) => () => {
    used.push(what);
    throw new Error(`the network is unplugged (${what})`);
  };
  return { used, seam: { resolve: touch('resolve'), isPublic: touch('isPublic'), route: touch('route'), ca: undefined, now: touch('now') } };
};
const tree = (directory) => fs.readdirSync(directory, { recursive: true }).map(String).sort().map((file) => [file, fs.statSync(path.join(directory, file)).isFile() ? fs.readFileSync(path.join(directory, file)).toString('base64') : null]);

test('LKD-23: one file holds everything that was read — an entry for each address, the data or the failure, and the digests of its pictures', async (t) => {
  const server = await serve(site());
  t.after(() => server.close());
  const { options } = optionsIn(scratch(t), { transform: imageStep() });
  for (const href of HREFS) await links.resolveLinkDataWith(href, options, server.seam());
  assert.equal(path.basename(options.lock), 'link-data.lock.json');
  const lock = JSON.parse(fs.readFileSync(options.lock, 'utf8'));
  assert.deepEqual(Object.keys(lock), ['version', 'links', 'icons']);
  assert.deepEqual(Object.keys(lock.links), [...HREFS].sort());
  assert.deepEqual(Object.keys(lock.links['https://site.test/a']), ['ok', 'title', 'description', 'siteName', 'image', 'read']);
  assert.deepEqual(Object.keys(lock.links['https://site.test/a'].image), ['file', 'digest', 'width', 'height', 'type']);
  assert.match(lock.links['https://site.test/a'].image.digest, /^[0-9a-f]{64}$/);
  assert.deepEqual(lock.links['https://site.test/untitled'], { ok: false, reason: 'no-title' });
  assert.deepEqual(lock.links['http://site.test/plain'], { ok: false, reason: 'address-refused' });
  assert.deepEqual(Object.keys(lock.icons), ['https://other.test', 'https://site.test']);
  assert.deepEqual(Object.keys(lock.icons['https://site.test']), ['ok', 'file', 'digest', 'width', 'height', 'type']);
});

test('LKD-23: reading the same addresses twice — in another order, on another day — writes the same file', async (t) => {
  const server = await serve(site());
  t.after(() => server.close());
  const first = optionsIn(scratch(t), { transform: imageStep() });
  const second = optionsIn(scratch(t), { transform: imageStep() });
  for (const href of HREFS) await links.resolveLinkDataWith(href, first.options, server.seam());
  await Promise.all([...HREFS].reverse().map((href) => links.resolveLinkDataWith(href, second.options, server.seam())));
  const text = fs.readFileSync(first.options.lock, 'utf8');
  assert.equal(fs.readFileSync(second.options.lock, 'utf8'), text, 'the order of reading leaves no trace');
  assert.ok(text.endsWith('}\n'));
  // Everything read again a month later: the words are the same, so the file is.
  const stamp = fs.statSync(first.options.lock).mtimeMs;
  for (const href of HREFS) await links.resolveLinkDataWith(href, { ...first.options, mode: 'refresh' }, server.seam({ now: () => new Date('2026-11-09T09:00:00Z') }));
  assert.equal(fs.readFileSync(first.options.lock, 'utf8'), text);
  assert.equal(fs.statSync(first.options.lock).mtimeMs, stamp, 'and it was not written at all');
  assert.doesNotMatch(text, /2026-11|T09:00|mtime|fetched|etag/i, 'nothing that changes from one run to the next');
  // When the words do change, the day they were read does.
  server.routes['site.test/b'] = page('<title>Page B, renamed</title>');
  const again = await links.resolveLinkDataWith('https://site.test/b', { ...first.options, mode: 'refresh' }, server.seam({ now: () => new Date('2026-11-09T09:00:00Z') }));
  assert.deepEqual([again.data.title, again.data.read], ['Page B, renamed', '2026-11-09']);
  assert.equal(JSON.parse(fs.readFileSync(first.options.lock, 'utf8')).links['https://site.test/a'].read, '2026-10-07');
});

test('LKD-24: frozen is the default, answers from the lock file alone, and touches no network and no file', async (t) => {
  const server = await serve(site());
  t.after(() => server.close());
  const directory = scratch(t);
  const { options } = optionsIn(directory, { transform: imageStep() });
  const written = {};
  for (const href of HREFS) written[href] = await links.resolveLinkDataWith(href, options, server.seam());
  const requests = server.requests.length;
  const before = tree(directory);
  const { mode, ...build } = options; // a build gives no mode
  assert.equal(mode, 'update');
  const off = unplugged();
  for (const href of HREFS) {
    const frozen = await links.resolveLinkDataWith(href, build, off.seam);
    assert.deepEqual(frozen, written[href], `${href}: the same answer as the run that wrote the lock`);
  }
  assert.deepEqual(await links.resolveSiteIconsWith(['https://site.test', 'https://other.test', 'https://b.test'], build, off.seam), await links.resolveSiteIconsWith(['https://site.test', 'https://other.test'], { ...build, mode: 'frozen' }, off.seam));
  assert.deepEqual(off.used, [], 'the fetcher was never called: no name resolved, no connection opened');
  assert.equal(server.requests.length, requests);
  assert.deepEqual(tree(directory), before, 'no file was written or changed');
});

test('LKD-24: in frozen an address with no entry is not-in-lock, and no lock file is made for it', async (t) => {
  const directory = scratch(t);
  const { options, said } = optionsIn(directory, { mode: 'frozen' });
  const off = unplugged();
  const result = await links.resolveLinkDataWith('https://site.test/new', options, off.seam);
  assert.deepEqual(result, { ok: false, href: 'https://site.test/new', reason: 'not-in-lock' });
  assert.deepEqual(await links.resolveSiteIconsWith(['https://site.test'], options, off.seam), {});
  assert.deepEqual(off.used, []);
  assert.deepEqual(fs.readdirSync(directory), []);
  assert.deepEqual(said, ['https://site.test/new: not-in-lock', 'https://site.test: site icon: not-in-lock']);
});

test('LKD-24: update reads only the addresses that have no entry; refresh reads every address again', async (t) => {
  const server = await serve(site());
  t.after(() => server.close());
  const { options } = optionsIn(scratch(t), { pictures: 'none' });
  const seam = server.seam();
  await links.resolveLinkDataWith('https://site.test/a', options, seam);
  assert.deepEqual(server.requests.map((request) => request.url), ['/a']);
  server.routes['site.test/a'] = page('<title>Page A, changed</title>');
  const kept = await links.resolveLinkDataWith('https://site.test/a', options, seam);
  const added = await links.resolveLinkDataWith('https://site.test/b', options, seam);
  assert.equal(kept.data.title, 'Page A', 'an address that has an entry is not read');
  assert.equal(added.data.title, 'Page B');
  assert.deepEqual(server.requests.map((request) => request.url), ['/a', '/b']);
  const fresh = await links.resolveLinkDataWith('https://site.test/a', { ...options, mode: 'refresh' }, seam);
  assert.equal(fresh.data.title, 'Page A, changed');
  assert.deepEqual(server.requests.map((request) => request.url), ['/a', '/b', '/a']);
});

test('LKD-25: a failure is recorded with its reason and answered from the lock file without trying again, so a build with the network and one without draw the same page', async (t) => {
  const server = await serve({ 'site.test/gone': { status: 404 }, 'site.test/silent': () => {} });
  t.after(() => server.close());
  const { options } = optionsIn(scratch(t), { pictures: 'none', limits: { request: 150 } });
  const seam = server.seam();
  const first = [await links.resolveLinkDataWith('https://site.test/gone', options, seam), await links.resolveLinkDataWith('https://site.test/silent', options, seam), await links.resolveLinkDataWith('https://[::1]/', options, seam)];
  assert.deepEqual(first.map((result) => result.reason), ['unreachable', 'timeout', 'address-refused']);
  const lock = JSON.parse(fs.readFileSync(options.lock, 'utf8'));
  assert.deepEqual(lock.links, { 'https://[::1]/': { ok: false, reason: 'address-refused' }, 'https://site.test/gone': { ok: false, reason: 'unreachable' }, 'https://site.test/silent': { ok: false, reason: 'timeout' } });
  const requests = server.requests.length;
  // The page exists now; update and frozen still answer what was recorded.
  server.routes['site.test/gone'] = page('<title>Back</title>');
  const off = unplugged();
  for (const mode of ['update', 'frozen']) {
    const again = [await links.resolveLinkDataWith('https://site.test/gone', { ...options, mode }, off.seam), await links.resolveLinkDataWith('https://site.test/silent', { ...options, mode }, off.seam)];
    assert.deepEqual(again, first.slice(0, 2), mode);
  }
  assert.deepEqual(off.used, []);
  assert.equal(server.requests.length, requests);
  assert.equal((await links.resolveLinkDataWith('https://site.test/gone', { ...options, mode: 'refresh' }, seam)).data.title, 'Back', 'only a refresh tries again');
});

test('LKD-26: a picture that is missing from the directory, or is not the file that was recorded, is left out of the answer and reported — and not fetched in frozen', async (t) => {
  const server = await serve(site());
  t.after(() => server.close());
  const { options, said } = optionsIn(scratch(t), { transform: imageStep() });
  const whole = await links.resolveLinkDataWith('https://site.test/a', options, server.seam());
  assert.ok(whole.data.image && whole.data.siteIcon);
  const requests = server.requests.length;
  const lock = JSON.parse(fs.readFileSync(options.lock, 'utf8'));
  const image = path.join(options.pictureDirectory, lock.links['https://site.test/a'].image.file);
  const icon = path.join(options.pictureDirectory, lock.icons['https://site.test'].file);
  fs.rmSync(image);
  fs.writeFileSync(icon, Buffer.concat([fs.readFileSync(icon), Buffer.from('tampered')]));
  const off = unplugged();
  const frozen = await links.resolveLinkDataWith('https://site.test/a', { ...options, mode: 'frozen' }, off.seam);
  assert.equal(frozen.ok, true);
  assert.equal(frozen.data.title, 'Page A');
  assert.equal(frozen.data.image, undefined);
  assert.equal(frozen.data.siteIcon, undefined);
  assert.deepEqual(await links.resolveSiteIconsWith(['https://site.test'], { ...options, mode: 'frozen' }, off.seam), {});
  assert.deepEqual(off.used, []);
  assert.equal(server.requests.length, requests);
  assert.equal(fs.existsSync(image), false);
  assert.deepEqual(said.filter((line) => line.includes('missing')), [
    'https://site.test/a: picture: its file is missing from the picture directory, or is not the file that was recorded',
    'https://site.test: site icon: its file is missing from the picture directory, or is not the file that was recorded',
  ]);
  // A recorded name that is a path is never followed out of the directory.
  lock.links['https://site.test/a'].image.file = '../link-data.lock.json';
  fs.writeFileSync(options.lock, JSON.stringify(lock));
  assert.equal((await links.resolveLinkDataWith('https://site.test/a', { ...options, mode: 'frozen' }, off.seam)).data.image, undefined);
});

test('LKD-27: the answer is ok only while there is a title; with anything less it is the address and the reason', async (t) => {
  const server = await serve({ ...site(), 'site.test/only-description': page('<meta property="og:description" content="D"><meta property="og:image" content="/a.png">'), 'site.test/blank-title': page('<title> &#x202e; </title>') });
  t.after(() => server.close());
  const ok = await ask(t, server, 'https://site.test/b', { pictures: 'none' });
  assert.deepEqual(ok.result, { ok: true, data: { href: 'https://site.test/b', title: 'Page B', external: 'on', read: '2026-10-07' } });
  for (const file of ['untitled', 'only-description', 'blank-title']) {
    const { result } = await ask(t, server, `https://site.test/${file}`, { transform: imageStep() });
    assert.deepEqual(result, { ok: false, href: `https://site.test/${file}`, reason: 'no-title' }, 'no card with invented text');
  }
  assert.deepEqual(server.requests.filter((request) => request.url === '/a.png'), [], 'a page without a title has no picture read either');
});

test('LKD-27: external says whether the address is outside the product\'s own origins, from the one site option', async (t) => {
  const server = await serve(site());
  t.after(() => server.close());
  assert.equal((await ask(t, server, 'https://site.test/b', { pictures: 'none', site: ['https://docs.test'] })).result.data.external, 'on');
  assert.equal((await ask(t, server, 'https://site.test/b', { pictures: 'none', site: ['https://docs.test', 'https://site.test'] })).result.data.external, 'off');
});

const REASONS = ['not-in-lock', 'address-refused', 'address-private', 'redirect-refused', 'timeout', 'too-large', 'not-a-page', 'unreachable', 'no-title'];

test('LKD-28: each refusal and failure is reported once, naming the address and the reason', async (t) => {
  const server = await serve({ ...site(), 'site.test/away': { status: 302, headers: { location: 'https://other.test/' } }, 'site.test/text': { headers: { 'content-type': 'text/plain' }, body: 'x' } });
  t.after(() => server.close());
  const { options, said } = optionsIn(scratch(t), { pictures: 'none' });
  const seam = server.seam({ resolve: (host) => [{ address: host === 'b.test' ? '10.0.0.1' : PUBLIC, family: 4 }] });
  const hrefs = ['http://site.test/', 'https://b.test/', 'https://site.test/away', 'https://site.test/text', 'https://site.test/untitled', 'https://site.test/missing'];
  for (let round = 0; round < 3; round += 1) for (const href of hrefs) await links.resolveLinkDataWith(href, { ...options, mode: round === 2 ? 'frozen' : 'update' }, seam);
  await links.resolveLinkDataWith('https://site.test/never-read', { ...options, mode: 'frozen' }, seam);
  await links.resolveLinkDataWith('https://site.test/never-read', { ...options, mode: 'frozen' }, seam);
  assert.deepEqual(said, [
    'http://site.test/: address-refused',
    'https://b.test/: address-private',
    'https://site.test/away: redirect-refused',
    'https://site.test/text: not-a-page',
    'https://site.test/untitled: no-title',
    'https://site.test/missing: unreachable',
    'https://site.test/never-read: not-in-lock',
  ]);
  for (const line of said) assert.ok(REASONS.some((reason) => line.endsWith(`: ${reason}`)), line);
  // Another report is another reader: it is told once too.
  const other = [];
  await links.resolveLinkDataWith('http://site.test/', { ...options, mode: 'frozen', report: (line) => other.push(line) }, seam);
  assert.deepEqual(other, ['http://site.test/: address-refused']);
});

test('LKD-28: nothing a destination sent is printed, logged or returned, other than the cleaned fields', async (t) => {
  const MARK = 'SENT-BY-THE-DESTINATION';
  const server = await serve({
    'site.test/redirect': { status: 302, headers: { location: `https://other.test/${MARK}`, 'x-note': MARK } },
    'site.test/error': { status: 500, headers: { 'content-type': 'text/html', 'x-error': MARK }, body: `<title>${MARK}</title>` },
    'site.test/text': { headers: { 'content-type': `text/plain; note=${MARK}` }, body: MARK },
    'site.test/untitled': page(`<meta name="description" content="${MARK}"><meta name="author" content="${MARK}">`),
    'site.test/picture': page(`<title>Fine</title><meta property="og:image" content="/${MARK}.png"><link rel="icon" href="/${MARK}.ico"><meta name="generator" content="${MARK}">`),
    [`site.test/${MARK}.png`]: { headers: { 'content-type': 'image/png' }, body: `<svg>${MARK}</svg>` },
    [`site.test/${MARK}.ico`]: { status: 404, body: MARK },
  });
  t.after(() => server.close());
  const { options, said } = optionsIn(scratch(t), { transform: imageStep() });
  const logged = [];
  const original = { log: console.log, warn: console.warn, error: console.error, info: console.info, out: process.stdout.write, err: process.stderr.write };
  for (const name of ['log', 'warn', 'error', 'info']) console[name] = (...parts) => logged.push(parts.join(' '));
  const results = [];
  try {
    for (const file of ['redirect', 'error', 'text', 'untitled', 'picture']) results.push(await links.resolveLinkDataWith(`https://site.test/${file}`, options, server.seam()));
  } finally {
    Object.assign(console, { log: original.log, warn: original.warn, error: original.error, info: original.info });
  }
  assert.deepEqual(results.map((result) => result.reason ?? 'ok'), ['redirect-refused', 'unreachable', 'not-a-page', 'no-title', 'ok']);
  for (const [what, text] of [['the report', said.join('\n')], ['the console', logged.join('\n')], ['the results', JSON.stringify(results)], ['the lock file', fs.readFileSync(options.lock, 'utf8')]]) assert.ok(!text.includes(MARK), `${what}: ${text}`);
  assert.deepEqual(said, ['https://site.test/redirect: redirect-refused', 'https://site.test/error: unreachable', 'https://site.test/text: not-a-page', 'https://site.test/untitled: no-title', 'https://site.test/picture: picture: not-a-picture', 'https://site.test: site icon: unreachable']);
});

test('LKD-28: without a report of the site\'s own, a line goes to standard error and nowhere else', async (t) => {
  const { options } = optionsIn(scratch(t), { mode: 'frozen' });
  delete options.report;
  const written = [];
  const write = process.stderr.write;
  process.stderr.write = (text) => (written.push(String(text)), true);
  try {
    await links.resolveLinkDataWith('https://site.test/x', options, unplugged().seam);
  } finally {
    process.stderr.write = write;
  }
  assert.deepEqual(written, ['links: https://site.test/x: not-in-lock\n']);
});

test('LKD-2: every address gets a result — whatever a network or a destination does, nothing is thrown', async (t) => {
  const dead = await serve({});
  const port = dead.port;
  await dead.close();
  const server = await serve({
    'site.test/reset': (request) => request.socket.destroy(),
    'site.test/half': (request, response) => {
      response.writeHead(200, { 'content-type': 'text/html', 'content-length': '5000' });
      response.write('<html><head><meta name="x" content="y">');
      setTimeout(() => request.socket.destroy(), 20);
    },
    'site.test/garbage-header': (request) => request.socket.end('HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nBroken header without colon\r\n\r\n<title>x</title>'),
    'site.test/not-http': (request) => request.socket.end('\x00\x01\x02 this is not HTTP at all\r\n\r\n'),
    'site.test/loop': { status: 302, headers: { location: '/loop' } },
    'site.test/bad-location': { status: 302, headers: { location: 'https://[not a host/' } },
    'site.test/empty': { headers: { 'content-type': 'text/html' }, body: '' },
    'site.test/nul': { headers: { 'content-type': 'text/html' }, body: Buffer.alloc(4096) },
    'site.test/huge-header': (request, response) => response.writeHead(200, { 'content-type': 'text/html', 'x-pad': 'x'.repeat(60000) }).end('<title>x</title>'),
  });
  t.after(() => server.close());
  const expected = { reset: 'unreachable', half: 'unreachable', 'garbage-header': 'unreachable', 'not-http': 'unreachable', loop: 'redirect-refused', 'bad-location': 'redirect-refused', empty: 'no-title', nul: 'no-title', 'huge-header': 'unreachable' };
  for (const [file, reason] of Object.entries(expected)) assert.equal((await ask(t, server, `https://site.test/${file}`)).result.reason, reason, file);
  const seams = {
    'a resolver that throws': { resolve: () => { throw new Error('ENOTFOUND'); } },
    'a resolver that answers nothing': { resolve: () => [] },
    'a resolver that answers nonsense': { resolve: () => 'not a list' },
    'a resolver that answers what is not an address': { resolve: () => [{ address: 'site.test' }] },
  };
  for (const [what, seam] of Object.entries(seams)) {
    const { result } = await ask(t, server, 'https://site.test/', {}, seam);
    assert.equal(result.ok, false, what);
    assert.ok(['unreachable', 'address-private'].includes(result.reason), `${what}: ${result.reason}`);
  }
  // Nothing listens where the connection goes.
  const { options } = optionsIn(scratch(t));
  const nowhere = { ...server.seam(), route: () => ({ address: '127.0.0.1', family: 4, port }) };
  assert.deepEqual(await links.resolveLinkDataWith('https://site.test/', options, nowhere), { ok: false, href: 'https://site.test/', reason: 'unreachable' });
  assert.deepEqual(await links.resolveSiteIconsWith(['https://site.test', 'http://site.test', 'not an origin'], { ...options, transform: imageStep() }, nowhere), {});
});

test('LKD-2: the helper throws only for options it cannot read — and for every one of those', async (t) => {
  const directory = scratch(t);
  const good = { site: ['https://docs.test'], lock: path.join(directory, 'link-data.lock.json'), pictureDirectory: path.join(directory, 'p') };
  const { api } = await import('./helpers/module.mjs');
  const bad = [
    undefined,
    null,
    'options',
    {},
    { ...good, site: undefined },
    { ...good, site: 'https://docs.test' },
    { ...good, site: [] },
    { ...good, site: [42] },
    { ...good, lock: undefined },
    { ...good, lock: '' },
    { ...good, mode: 'online' },
    { ...good, mode: 'Frozen' },
    { ...good, pictures: 'inline' },
    { ...good, pictureDirectory: undefined },
    { ...good, pictureDirectory: 7 },
    { ...good, allow: 'site.test' },
    { ...good, allow: ['https://site.test/'] },
    { ...good, deny: [null] },
    { ...good, redirects: ['a b'] },
    { ...good, transform: 'a-library' },
    { ...good, picturePath: '/assets' },
    { ...good, report: console },
    { ...good, userAgent: '' },
    { ...good, userAgent: 'line\r\nbreak: injected' },
    { ...good, limits: { time: 0 } },
    { ...good, limits: { time: -1 } },
    { ...good, limits: { markup: 1.5 } },
    { ...good, limits: { request: Infinity } },
    { ...good, limits: { redirects: -1 } },
    { ...good, limits: { depth: 3 } },
    { ...good, limits: null },
    { ...good, iconSize: 0 },
    { ...good, iconOutput: 'inline' },
    { ...good, iconGround: { light: 255 } },
    { ...good, timeout: 5 },
    { ...good, offline: true },
  ];
  for (const options of bad) {
    await assert.rejects(async () => api.resolveLinkData('https://site.test/', options), TypeError, JSON.stringify(options));
    await assert.rejects(async () => api.resolveSiteIcons(['https://site.test'], options), TypeError, JSON.stringify(options));
  }
  await assert.rejects(async () => api.resolveLinkData(42, good), TypeError);
  await assert.rejects(async () => api.resolveSiteIcons('https://site.test', good), TypeError);
  assert.deepEqual(await api.resolveLinkData('https://site.test/', { ...good, report: () => {} }), { ok: false, href: 'https://site.test/', reason: 'not-in-lock' }, 'and the least a site gives is enough');
  // The lock file is named by an option: one that is not a lock file is an option that cannot be read.
  for (const text of ['{ not json', '[]', '{"version":2,"links":{},"icons":{}}', '{"version":1,"links":[],"icons":{}}', '{"version":1,"links":{"a":"b"},"icons":{}}']) {
    fs.writeFileSync(good.lock, text);
    await assert.rejects(async () => api.resolveLinkData('https://site.test/', good), /is not a lock file/, text);
  }
  assert.deepEqual(fs.readdirSync(directory), ['link-data.lock.json'], 'and a refused option writes nothing');
});

test('LKD-2: an address named like a property of every object is an address like any other', async (t) => {
  const { options } = optionsIn(scratch(t), { mode: 'frozen' });
  for (const href of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) assert.deepEqual(await links.resolveLinkDataWith(href, options, unplugged().seam), { ok: false, href, reason: 'not-in-lock' });
  assert.deepEqual(await links.resolveLinkDataWith('constructor', { ...options, mode: 'update' }, unplugged().seam), { ok: false, href: 'constructor', reason: 'address-refused' });
  assert.deepEqual(JSON.parse(fs.readFileSync(options.lock, 'utf8')).links, { constructor: { ok: false, reason: 'address-refused' } });
});

test('LKD-2: the pure functions live in a module without a Node dependency, and the Node entry gives the same functions', async () => {
  const pure = await import(new URL(`file://${path.join(pkg, 'dist/links/index.js')}`).href);
  const { api } = await import('./helpers/module.mjs');
  assert.equal(api.isExternal, pure.isExternal);
  assert.equal(api.displayHost, pure.displayHost);
  const text = fs.readFileSync(path.join(pkg, 'dist/links/index.js'), 'utf8');
  assert.doesNotMatch(text, /from\s+['"]node:|require\(|process\.|\bfs\b|import\s*\(/, pureIsStandIn ? '(the tests\' stand-in)' : 'src/links/index.ts');
  assert.equal(pure.isExternal('https://example.org/', { site: ['https://docs.test'] }), true);
  assert.equal(pure.isExternal('https://docs.test/a', { site: ['https://docs.test'] }), false);
});

test('the platform was asked to resolve no name', () => assert.deepEqual(asked, []));
