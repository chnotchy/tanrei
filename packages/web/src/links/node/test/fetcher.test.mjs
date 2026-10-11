// REQUIREMENTS.md, LKD-3 to LKD-13: the one fetcher, against a server on the machine itself that is reached only
// through the tests' seam (helpers/server.mjs). The check of an address is the production's own in every test here.
import './helpers/network.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import zlib from 'node:zlib';
import { asked } from './helpers/network.mjs';
import { fetcher, links, source } from './helpers/module.mjs';
import { selfSigned } from './helpers/certificate.mjs';
import { NAMES, PUBLIC, ask, optionsIn, page, scratch, serve } from './helpers/server.mjs';
import path from 'node:path';

const titled = (title = 'A title') => page(`<title>${title}</title>`);
const redirect = (to, status = 302, more = {}) => ({ status, headers: { location: to, ...more } });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('LKD-3: an http address, credentials, another port and a numeric host are refused before anything is resolved or contacted', async (t) => {
  const server = await serve({ '/': titled() });
  t.after(() => server.close());
  for (const href of ['http://site.test/', 'https://user:secret@site.test/', 'https://site.test:8443/', 'https://127.0.0.1/', 'https://2130706433/', 'https://0x7f.1/', 'https://[::1]/', 'not an address']) {
    const { result } = await ask(t, server, href);
    assert.deepEqual(result, { ok: false, href, reason: 'address-refused' });
  }
  assert.deepEqual(server.resolved, []);
  assert.deepEqual(server.requests, []);
});

test('LKD-4: a host outside allow, and a host in deny, are refused before any name is resolved', async (t) => {
  const server = await serve({ '/': titled() });
  t.after(() => server.close());
  assert.equal((await ask(t, server, 'https://site.test/', { allow: ['other.test'] })).result.reason, 'address-refused');
  assert.equal((await ask(t, server, 'https://site.test/', { deny: ['site.test'] })).result.reason, 'address-refused');
  assert.equal((await ask(t, server, 'https://site.test/', { allow: ['site.test'], deny: ['*.test', 'site.test'] })).result.reason, 'address-refused');
  assert.deepEqual(server.resolved, []);
  assert.equal((await ask(t, server, 'https://site.test/', { allow: ['site.test'] })).result.ok, true);
});

test('LKD-4: the lists are matched again against the host of every redirect', async (t) => {
  const server = await serve({ 'site.test/': redirect('https://www.site.test/'), 'www.site.test/': titled() });
  t.after(() => server.close());
  assert.equal((await ask(t, server, 'https://site.test/', { deny: ['www.site.test'] })).result.reason, 'redirect-refused');
  assert.equal((await ask(t, server, 'https://site.test/', { allow: ['site.test'] })).result.reason, 'redirect-refused');
  assert.deepEqual(server.requests.map((request) => request.host), ['site.test', 'site.test']);
  assert.equal((await ask(t, server, 'https://site.test/', { allow: ['site.test', 'www.site.test'] })).result.ok, true);
});

for (const [what, addresses] of [
  ['the machine itself', ['127.0.0.1']],
  ['a private network', ['10.1.2.3']],
  ['a private network (172.16/12)', ['172.20.0.1']],
  ['a private network (192.168/16)', ['192.168.1.10']],
  ['a link-local address, the one that serves a machine its credentials', ['169.254.169.254']],
  ['a shared carrier range', ['100.64.0.1']],
  ['the unspecified address', ['0.0.0.0']],
  ['a multicast address', ['224.0.0.1']],
  ['a reserved address', ['240.0.0.1']],
  ['a documentation address', ['203.0.113.7']],
  ['the IPv6 loopback', ['::1']],
  ['a unique-local IPv6 address', ['fd00::1']],
  ['a link-local IPv6 address', ['fe80::1']],
  ['an IPv4-mapped IPv6 address of the machine itself', ['::ffff:127.0.0.1']],
  ['an IPv4-mapped IPv6 address written in hexadecimal', ['::ffff:a00:1']],
  ['a 6to4 address that carries a private one', ['2002:c0a8:0101::1']],
  ['a public address and a private one together', [PUBLIC, '10.0.0.1']],
  ['a private one after two public ones', [PUBLIC, '2606:4700::1111', '::1']],
]) {
  test(`LKD-5: a name that resolves to ${what} is refused, and nothing is connected to`, async (t) => {
    const server = await serve({ '/': titled() });
    t.after(() => server.close());
    const { result, said } = await ask(t, server, 'https://site.test/', {}, { resolve: () => addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })) });
    assert.deepEqual(result, { ok: false, href: 'https://site.test/', reason: 'address-private' });
    assert.deepEqual(server.routed, []);
    assert.deepEqual(server.requests, []);
    assert.deepEqual(said, ['https://site.test/: address-private']);
  });
}

test('LKD-5: a redirect to a name that resolves to a private address is refused, and that address is never asked', async (t) => {
  const server = await serve({ 'site.test/': redirect('https://www.site.test/inside'), 'www.site.test/inside': titled('Inside') });
  t.after(() => server.close());
  const { result } = await ask(t, server, 'https://site.test/', {}, { resolve: (host) => [{ address: host === 'www.site.test' ? '192.168.0.1' : PUBLIC, family: 4 }] });
  assert.equal(result.reason, 'address-private');
  assert.deepEqual(server.requests.map((request) => `${request.host}${request.url}`), ['site.test/']);
  assert.deepEqual(server.routed, [PUBLIC]);
});

test('LKD-6: the connection goes to the address that was checked, under the host\'s name, and the name is resolved once for it', async (t) => {
  const server = await serve({ 'site.test/': redirect('/moved'), 'site.test/moved': titled() });
  t.after(() => server.close());
  const { result } = await ask(t, server, 'https://site.test/', { pictures: 'none' }, { resolve: () => [{ address: '198.41.0.4', family: 4 }, { address: PUBLIC, family: 4 }] });
  assert.equal(result.ok, true);
  assert.deepEqual(server.resolved, ['site.test', 'site.test'], 'once for each of the two requests');
  assert.deepEqual(server.routed, ['198.41.0.4', '198.41.0.4'], 'the first address that was checked, each time');
  assert.equal(server.requests.length, 2);
  for (const request of server.requests) {
    assert.equal(request.headers.host, 'site.test', 'the request names the host');
    assert.equal(request.sni, 'site.test', 'and so does what the certificate is asked for');
  }
});

test('LKD-6: a name that resolves to a public address first and a private one next gains nothing', async (t) => {
  const server = await serve({ 'site.test/': redirect('/second'), 'site.test/second': titled('Second') });
  t.after(() => server.close());
  // The first answer is public; every later answer for the same name is the machine itself.
  const { result } = await ask(t, server, 'https://site.test/', {}, { resolve: (_host, nth) => [{ address: nth === 1 ? PUBLIC : '127.0.0.1', family: 4 }] });
  assert.equal(result.reason, 'address-private', 'the second request resolves anew, is checked anew, and is refused');
  assert.deepEqual(server.requests.map((request) => request.url), ['/'], 'the one request went where the first answer was checked');
  assert.deepEqual(server.routed, [PUBLIC]);
  assert.deepEqual(server.resolved, ['site.test', 'site.test'], 'no second resolution was made for the first connection');
});

test('LKD-6: the socket is given the checked address by a lookup of the helper\'s own, never by the platform\'s resolver', () => {
  const text = fs.readFileSync(path.join(source, 'fetcher.js'), 'utf8');
  assert.match(text, /lookup: pinned/);
  assert.match(text, /agent: false/);
  assert.equal((text.match(/dns\./g) ?? []).length, 1, 'the platform\'s resolver is named once: in PRODUCTION.resolve');
  assert.deepEqual(asked, [], 'and in this run it was never asked');
});

test('LKD-7: a certificate no authority vouches for is refused, and nothing is asked of that server', async (t) => {
  const server = await serve({ '/': titled() });
  t.after(() => server.close());
  const stranger = selfSigned(NAMES).cert;
  const { result } = await ask(t, server, 'https://site.test/', {}, { ca: stranger });
  assert.deepEqual(result, { ok: false, href: 'https://site.test/', reason: 'unreachable' });
  assert.deepEqual(server.requests, []);
  // The platform's own authorities do not know the tests' certificate either.
  assert.equal((await ask(t, server, 'https://site.test/', {}, { ca: undefined })).result.reason, 'unreachable');
});

test('LKD-7: a certificate for another name is refused', async (t) => {
  const certificate = selfSigned(['other.test']);
  const server = await serve({ '/': titled() }, { certificate });
  t.after(() => server.close());
  assert.equal((await ask(t, server, 'https://site.test/')).result.reason, 'unreachable');
  assert.equal((await ask(t, server, 'https://other.test/')).result.ok, true);
  assert.deepEqual(server.requests.map((request) => request.host).filter((host) => host !== 'other.test'), []);
});

test('LKD-7: nothing turns the verification off — not an option, and not the environment\'s own switch', async (t) => {
  const server = await serve({ '/': titled() });
  t.after(() => server.close());
  const before = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  const warning = process.emitWarning;
  process.emitWarning = () => {};
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  t.after(() => {
    process.emitWarning = warning;
    if (before === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = before;
  });
  const { result } = await ask(t, server, 'https://site.test/', {}, { ca: selfSigned(NAMES).cert });
  assert.equal(result.reason, 'unreachable');
  assert.deepEqual(server.requests, []);
  for (const name of ['rejectUnauthorized', 'insecure', 'ca', 'agent', 'checkServerIdentity', 'strictSSL']) {
    await assert.rejects(ask(t, server, 'https://site.test/', { [name]: false }), TypeError, name);
  }
  const text = fs.readdirSync(source).filter((file) => file.endsWith('.js')).map((file) => fs.readFileSync(path.join(source, file), 'utf8')).join('\n');
  assert.deepEqual(text.match(/rejectUnauthorized[^,\n]*/g), ['rejectUnauthorized: true'], 'verification is named once, as on');
  assert.doesNotMatch(text, /checkServerIdentity|NODE_TLS_REJECT_UNAUTHORIZED|secureOptions|http\.request|from 'node:http'/);
});

test('LKD-8: three redirects are followed by hand, each as a request of its own; a fourth is refused', async (t) => {
  const server = await serve({
    'site.test/0': redirect('/1', 301),
    'site.test/1': redirect('/2', 302),
    'site.test/2': redirect('https://site.test/3', 307),
    'site.test/3': titled('The end'),
    'site.test/four': redirect('/0', 308),
    'site.test/see-other': redirect('/3', 303),
    'site.test/nowhere': { status: 302, headers: {} },
  });
  t.after(() => server.close());
  const three = await ask(t, server, 'https://site.test/0');
  assert.equal(three.result.ok && three.result.data.title, 'The end');
  assert.deepEqual(server.requests.slice(0, 4).map((request) => `${request.method} ${request.url}`), ['GET /0', 'GET /1', 'GET /2', 'GET /3']);
  server.requests.length = 0;
  const four = await ask(t, server, 'https://site.test/four');
  assert.deepEqual(four.result, { ok: false, href: 'https://site.test/four', reason: 'redirect-refused' });
  assert.deepEqual(server.requests.map((request) => request.url), ['/four', '/0', '/1', '/2'], 'the fourth redirect is read and not followed');
  assert.equal((await ask(t, server, 'https://site.test/see-other')).result.ok, true);
  assert.equal((await ask(t, server, 'https://site.test/0', { limits: { redirects: 0 } })).result.reason, 'redirect-refused');
  assert.equal((await ask(t, server, 'https://site.test/nowhere')).result.reason, 'unreachable');
});

test('LKD-8: a redirect is held to everything an address is — down to http, to credentials, to a port, to a numeric host: refused', async (t) => {
  const targets = ['http://site.test/plain', 'https://user:secret@site.test/plain', 'https://site.test:8443/plain', 'https://127.0.0.1/plain', 'https://[::1]/plain', 'https://2130706433/plain', 'ftp://site.test/plain', 'javascript:alert(1)', 'https://'];
  const server = await serve({ ...Object.fromEntries(targets.map((target, index) => [`site.test/${index}`, redirect(target)])), '/plain': titled('Plain') });
  t.after(() => server.close());
  for (const index of targets.keys()) {
    const { result } = await ask(t, server, `https://site.test/${index}`);
    assert.equal(result.reason, 'redirect-refused', targets[index]);
  }
  assert.deepEqual(server.requests.map((request) => request.url).filter((url) => url === '/plain'), []);
});

test('LKD-9: a redirect to another host is refused; adding or removing a leading www. is not another host', async (t) => {
  const server = await serve({
    'site.test/away': redirect('https://other.test/landing'),
    'other.test/landing': titled('Another site\'s words'),
    'site.test/www': redirect('https://www.site.test/page'),
    'www.site.test/page': titled('Same site'),
    'www.site.test/bare': redirect('https://site.test/plain'),
    'site.test/plain': titled('Bare'),
  });
  t.after(() => server.close());
  const away = await ask(t, server, 'https://site.test/away');
  assert.deepEqual(away.result, { ok: false, href: 'https://site.test/away', reason: 'redirect-refused' });
  assert.deepEqual(server.requests.map((request) => request.host), ['site.test'], 'the other host is never asked');
  const www = await ask(t, server, 'https://site.test/www');
  assert.equal(www.result.ok && www.result.data.title, 'Same site');
  assert.equal(www.result.data.href, 'https://site.test/www', 'the address asked about, never the redirect\'s end');
  assert.equal((await ask(t, server, 'https://www.site.test/bare')).result.data.title, 'Bare');
});

test('LKD-9: a forwarder the site lists may lead to another host, and the result is still the address asked about', async (t) => {
  const server = await serve({ 'short.test/x': redirect('https://site.test/long'), 'site.test/long': titled('The long page'), 'site.test/on': redirect('https://other.test/'), 'short.test/chain': redirect('https://site.test/on') });
  t.after(() => server.close());
  assert.equal((await ask(t, server, 'https://short.test/x')).result.reason, 'redirect-refused');
  const listed = await ask(t, server, 'https://short.test/x', { redirects: ['short.test'] });
  assert.equal(listed.result.ok, true);
  assert.equal(listed.result.data.href, 'https://short.test/x');
  assert.equal(listed.result.data.title, 'The long page');
  // Being forwarded to does not make a host a forwarder.
  assert.equal((await ask(t, server, 'https://short.test/chain', { redirects: ['short.test'] })).result.reason, 'redirect-refused');
});

test('LKD-10: one GET for a page; no cookie sent or kept, no credential, no referrer, and the one user agent the options give', async (t) => {
  const server = await serve({
    'site.test/': redirect('/landed', 302, { 'set-cookie': 'session=abc; Path=/; Secure' }),
    'site.test/landed': { headers: { 'content-type': 'text/html', 'set-cookie': 'again=1' }, body: '<title>Landed</title>' },
  });
  t.after(() => server.close());
  const { result } = await ask(t, server, 'https://site.test/', { userAgent: 'example-docs-build/1.0', pictures: 'none' });
  assert.equal(result.ok, true);
  assert.equal(server.requests.length, 2, 'the page and the redirect before it, and nothing else');
  for (const request of server.requests) {
    assert.equal(request.method, 'GET');
    const names = request.rawHeaders.filter((_, index) => index % 2 === 0).map((name) => name.toLowerCase()).sort();
    assert.deepEqual(names, ['accept', 'accept-encoding', 'connection', 'host', 'user-agent']);
    assert.equal(request.headers['user-agent'], 'example-docs-build/1.0');
    for (const name of ['cookie', 'authorization', 'referer', 'origin', 'proxy-authorization']) assert.equal(request.headers[name], undefined, name);
  }
  const usual = await ask(t, server, 'https://site.test/landed', { pictures: 'none' });
  assert.equal(usual.result.ok, true);
  const manifest = JSON.parse(fs.readFileSync(path.join(source, '../../../package.json'), 'utf8'));
  assert.ok(server.requests.at(-1).headers['user-agent'].startsWith(`${manifest.name}/`), 'without the option: the package\'s own name');
});

test('LKD-10: at most 4 requests at a time, and at most 1 to any one host', async (t) => {
  const slow = (_request, response) => setTimeout(() => response.writeHead(200, { 'content-type': 'text/html' }).end('<title>Slow</title>'), 60);
  const server = await serve({ '/a': slow, '/b': slow, '/c': slow });
  t.after(() => server.close());
  const { options } = optionsIn(scratch(t), { pictures: 'none' });
  const hrefs = ['a', 'b', 'c', 'd', 'e', 'f'].flatMap((host) => ['a', 'b', 'c'].map((file) => `https://${host}.test/${file}`));
  const seam = server.seam();
  const results = await Promise.all(hrefs.map((href) => links.resolveLinkDataWith(href, options, seam)));
  assert.equal(results.filter((result) => result.ok).length, 18);
  assert.equal(server.open.most, fetcher.AT_ONCE);
  assert.equal(fetcher.AT_ONCE, 4);
  assert.equal(server.open.mostForOneHost, 1);
  assert.equal(fetcher.AT_ONCE_PER_HOST, 1);
});

test('LKD-11: an answer that never comes is abandoned when the request\'s time has passed', async (t) => {
  let closed = 0;
  const server = await serve({ 'site.test/silent': (request) => request.socket.on('close', () => (closed += 1)) });
  t.after(() => server.close());
  const started = performance.now();
  const { result } = await ask(t, server, 'https://site.test/silent', { limits: { request: 200, time: 2000 } });
  const took = performance.now() - started;
  assert.deepEqual(result, { ok: false, href: 'https://site.test/silent', reason: 'timeout' });
  assert.ok(took >= 190 && took < 1500, `took ${took} ms`);
  await wait(50);
  assert.equal(closed, 1, 'the connection was abandoned');
});

test('LKD-11: an answer that arrives one byte at a time is abandoned too (it never ends a head)', async (t) => {
  let sent = 0;
  const server = await serve({
    'site.test/drip': (request, response) => {
      response.writeHead(200, { 'content-type': 'text/html' });
      const text = '<html><head><meta name="a" content="';
      const timer = setInterval(() => response.write(sent < text.length ? text[sent++] : (sent++, 'x')), 40);
      request.socket.on('close', () => clearInterval(timer));
    },
  });
  t.after(() => server.close());
  const started = performance.now();
  const { result } = await ask(t, server, 'https://site.test/drip', { limits: { request: 300, time: 2000 } });
  assert.equal(result.reason, 'timeout');
  assert.ok(performance.now() - started < 1500);
  const then = sent;
  await wait(150);
  assert.ok(sent - then <= 1, 'the server stopped being read');
});

test('LKD-11: one address has its time in all — every redirect and the reading together', async (t) => {
  const later = (to) => (_request, response) => setTimeout(() => response.writeHead(302, { location: to }).end(), 150);
  const server = await serve({ 'site.test/0': later('/1'), 'site.test/1': later('/2'), 'site.test/2': later('/3'), 'site.test/3': titled() });
  t.after(() => server.close());
  const started = performance.now();
  const { result } = await ask(t, server, 'https://site.test/0', { limits: { request: 250, time: 350 } });
  const took = performance.now() - started;
  assert.equal(result.reason, 'timeout', 'no single request was too slow; the address was');
  assert.ok(took >= 340 && took < 1200, `took ${took} ms`);
  assert.equal((await ask(t, server, 'https://site.test/0', { limits: { request: 250, time: 5000 } })).result.ok, true);
});

test('LKD-12: only an answer that declares a page of markup is read; a page that is declared a picture is not, and the reverse has no title', async (t) => {
  const { png } = await import('./helpers/picture-files.mjs');
  const server = await serve({
    'site.test/as-picture': { headers: { 'content-type': 'image/png' }, body: '<title>Markup under a picture\'s name</title>' },
    'site.test/as-text': { headers: { 'content-type': 'text/plain' }, body: '<title>Plain</title>' },
    'site.test/as-json': { headers: { 'content-type': 'application/json' }, body: '{"title":"<title>x</title>"}' },
    'site.test/untyped': { headers: {}, body: '<title>No type</title>' },
    'site.test/picture-as-page': { headers: { 'content-type': 'text/html' }, body: png(8, 8) },
    'site.test/xhtml': { headers: { 'content-type': 'application/xhtml+xml; charset=utf-8' }, body: '<html><head><title>X</title></head></html>' },
    'site.test/gone': { status: 404, headers: { 'content-type': 'text/html' }, body: '<title>Not found</title>' },
    'site.test/broken': { status: 500, headers: { 'content-type': 'text/html' }, body: '<title>Error</title>' },
  });
  t.after(() => server.close());
  for (const file of ['as-picture', 'as-text', 'as-json', 'untyped']) assert.equal((await ask(t, server, `https://site.test/${file}`)).result.reason, 'not-a-page', file);
  assert.equal((await ask(t, server, 'https://site.test/picture-as-page')).result.reason, 'no-title');
  assert.equal((await ask(t, server, 'https://site.test/xhtml')).result.ok, true);
  assert.equal((await ask(t, server, 'https://site.test/gone')).result.reason, 'unreachable', 'an error page is not the page that was asked about');
  assert.equal((await ask(t, server, 'https://site.test/broken')).result.reason, 'unreachable');
});

test('LKD-12: an answer without end is stopped at the limit, the connection is closed, and what was read is kept', async (t) => {
  let written = 0;
  let closed = false;
  const server = await serve({
    'site.test/endless': (request, response) => {
      let over = false;
      response.writeHead(200, { 'content-type': 'text/html' });
      response.write('<html><head><title>Endless</title>');
      const more = () => {
        while (!over && response.write(`<!-- ${'x'.repeat(4000)} -->`)) written += 4009;
      };
      response.on('drain', more);
      request.socket.on('close', () => (closed = over = true));
      more();
    },
  });
  t.after(() => server.close());
  const limit = 64 * 1024;
  const env = { options: { ...optionsIn(scratch(t)).options, limits: { ...fetcher.DEFAULT_LIMITS, markup: limit }, userAgent: 'test', deny: [], redirects: [] }, internals: server.seam() };
  const read = await fetcher.readAddress('https://site.test/endless', { kind: 'page', limit }, env);
  assert.equal(read.ok, true);
  assert.equal(read.bytes.length, limit, 'never more than the limit of one answer in memory');
  assert.equal(read.truncated, true);
  await wait(100);
  assert.equal(closed, true, 'the connection was closed');
  assert.ok(written < limit + 2 * 1024 * 1024, `the server wrote ${written} bytes before it was cut off`);
  const { result } = await ask(t, server, 'https://site.test/endless', { limits: { markup: limit }, pictures: 'none' });
  assert.equal(result.ok && result.data.title, 'Endless');
});

for (const [name, pack] of [['gzip', zlib.gzipSync], ['deflate', zlib.deflateSync], ['br', (bytes) => zlib.brotliCompressSync(bytes, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } })]]) {
  test(`LKD-12: the size is counted after decompression — a small ${name} answer that unpacks to 64 MiB is stopped at the limit`, async (t) => {
    const bomb = pack(Buffer.concat([Buffer.from('<html><head><title>Bomb</title>'), Buffer.alloc(64 * 1024 * 1024, 0x20)]));
    assert.ok(bomb.length < 256 * 1024, `the answer on the wire is ${bomb.length} bytes`);
    const server = await serve({ 'site.test/bomb': { headers: { 'content-type': 'text/html', 'content-encoding': name }, body: bomb } });
    t.after(() => server.close());
    const limit = 128 * 1024;
    const env = { options: { ...optionsIn(scratch(t)).options, limits: { ...fetcher.DEFAULT_LIMITS, markup: limit }, userAgent: 'test', deny: [], redirects: [] }, internals: server.seam() };
    const heap = process.memoryUsage().arrayBuffers;
    const read = await fetcher.readAddress('https://site.test/bomb', { kind: 'page', limit }, env);
    assert.equal(read.ok, true);
    assert.equal(read.bytes.length, limit);
    assert.equal(read.truncated, true);
    assert.ok(process.memoryUsage().arrayBuffers - heap < 16 * 1024 * 1024, 'the 64 MiB were never held');
    const { result } = await ask(t, server, 'https://site.test/bomb', { limits: { markup: limit }, pictures: 'none' });
    assert.equal(result.ok && result.data.title, 'Bomb');
    // The same answer as a picture is dropped whole.
    const picture = await fetcher.readAddress('https://site.test/bomb', { kind: 'picture', limit }, env);
    assert.deepEqual(picture, { ok: false, reason: 'too-large' });
  });
}

test('LKD-12: a coding the helper did not ask for, and one that is not what it says, are failures and not crashes', async (t) => {
  const server = await serve({
    'site.test/unknown': { headers: { 'content-type': 'text/html', 'content-encoding': 'zstd' }, body: '<title>x</title>' },
    'site.test/twice': { headers: { 'content-type': 'text/html', 'content-encoding': 'gzip, gzip' }, body: zlib.gzipSync(zlib.gzipSync('<title>x</title>')) },
    'site.test/garbage': { headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' }, body: 'this is not gzip at all' },
    'site.test/gzip': { headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' }, body: zlib.gzipSync('<title>Packed</title>') },
  });
  t.after(() => server.close());
  for (const file of ['unknown', 'twice', 'garbage']) assert.equal((await ask(t, server, `https://site.test/${file}`)).result.reason, 'unreachable', file);
  assert.equal((await ask(t, server, 'https://site.test/gzip')).result.data.title, 'Packed');
  assert.equal(server.requests[0].headers['accept-encoding'], 'gzip, deflate, br');
});

test('LKD-13: nothing after the head is read — the answer is given while the body is still on its way', async (t) => {
  let closed = false;
  const server = await serve({
    'site.test/long-body': (request, response) => {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.write('<!doctype html><html><head><title>Head only</title></head><body><h1>Start of a body that takes a minute');
      request.socket.on('close', () => (closed = true));
    },
  });
  t.after(() => server.close());
  const started = performance.now();
  const { result } = await ask(t, server, 'https://site.test/long-body', { pictures: 'none' });
  assert.equal(result.ok && result.data.title, 'Head only');
  assert.ok(performance.now() - started < 1500);
  await wait(50);
  assert.equal(closed, true, 'the connection was closed at the head\'s end');
});

test('LKD-13: no script is run, nothing the page refers to is loaded, and no instruction to go elsewhere is followed', async (t) => {
  const head = [
    '<meta http-equiv="refresh" content="0; url=https://site.test/elsewhere">',
    '<script src="/script.js"></script>',
    '<script>document.title = "Set by script"; fetch("/beacon"); var t = "</head><title>From a script</title>";</script>',
    '<link rel="stylesheet" href="/style.css">',
    '<link rel="preload" href="/font.woff2" as="font">',
    '<link rel="canonical" href="https://site.test/elsewhere">',
    '<link rel="manifest" href="/manifest.json">',
    '<style>@import url("/imported.css"); title::after { content: "<title>From a style</title>" }</style>',
    '<noscript><meta http-equiv="refresh" content="0; url=/noscript"><title>From noscript</title></noscript>',
    '<template><title>From a template</title></template>',
    '<!-- <title>From a comment</title> -->',
    '<base href="https://site.test/based/">',
    '<title>The page\'s own</title>',
    '<title>A second title</title>',
  ].join('\n');
  const server = await serve({ 'site.test/page': page(head, '<img src="/pixel.gif"><iframe src="/frame"></iframe><title>In the body</title>'), 'site.test/elsewhere': titled('Elsewhere') });
  t.after(() => server.close());
  const { result } = await ask(t, server, 'https://site.test/page', { pictures: 'none' });
  assert.equal(result.ok && result.data.title, 'The page\'s own');
  assert.deepEqual(server.requests.map((request) => request.url), ['/page'], 'the page, and nothing it refers to');
});

test('LKD-13: the head ends at its end tag, at the body\'s start or at the first thing that is not a head\'s — a title after that is not the page\'s', async (t) => {
  const server = await serve({
    'site.test/in-body': { body: '<html><head><meta charset="utf-8"></head><body><title>In the body</title></body></html>' },
    'site.test/no-head-tags': { body: '<meta charset="utf-8"><p>Text begins the body.</p><title>After the text</title>' },
    'site.test/svg': { body: '<html><head><meta charset="utf-8"><svg><title>A drawing\'s title</title></svg><title>Late</title>' },
    'site.test/unclosed': { body: '<html><head><title>Never closed' },
    'site.test/bare': { body: '<title>Bare</title>' },
  });
  t.after(() => server.close());
  for (const file of ['in-body', 'no-head-tags', 'svg', 'unclosed']) assert.equal((await ask(t, server, `https://site.test/${file}`)).result.reason, 'no-title', file);
  assert.equal((await ask(t, server, 'https://site.test/bare', { pictures: 'none' })).result.data.title, 'Bare');
});

test('the platform was asked to resolve no name', () => assert.deepEqual(asked, []));
