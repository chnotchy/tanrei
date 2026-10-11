// REQUIREMENTS.md, LKD-18 to LKD-22: pictures — fetched under every rule a page is, told by their bytes, bounded,
// written only after the site's image step has encoded them anew, under a name made from their content.
import './helpers/network.mjs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { asked } from './helpers/network.mjs';
import { links, pictures } from './helpers/module.mjs';
import { PUBLIC, ask, optionsIn, page, scratch, serve } from './helpers/server.mjs';
import { avifHeader, gifHeader, ico, imageStep, jpegHeader, png, pngClaiming, svg, webpHeader } from './helpers/picture-files.mjs';

const { sniffPicture } = pictures;
const withPicture = (address) => page(`<title>T</title><meta property="og:image" content="${address}">`);
const picture = (body, type = 'image/png', more = {}) => ({ headers: { 'content-type': type, ...more }, body });
const stored = (options) => (fs.existsSync(options.pictureDirectory) ? fs.readdirSync(options.pictureDirectory) : []);

test('LKD-18: a picture is fetched under every rule an address of a page is held to', async (t) => {
  const server = await serve({
    'site.test/private': withPicture('https://pictures.test/p.png'),
    'site.test/away': withPicture('/redirects-away.png'),
    'site.test/redirects-away.png': { status: 302, headers: { location: 'https://other.test/p.png' } },
    'site.test/plain': withPicture('http://site.test/p.png'),
    'site.test/numeric': withPicture('https://10.0.0.1/p.png'),
    'site.test/denied': withPicture('https://other.test/p.png'),
    'site.test/slow': withPicture('/slow.png'),
    'site.test/slow.png': () => {},
    '/p.png': picture(png(8, 8)),
  });
  t.after(() => server.close());
  const resolve = (host) => [{ address: host === 'pictures.test' ? '10.0.0.9' : PUBLIC, family: 4 }];
  const step = imageStep();
  const cases = [
    ['private', 'https://site.test/private: picture: address-private', {}],
    ['away', 'https://site.test/away: picture: redirect-refused', {}],
    ['denied', 'https://site.test/denied: picture: address-refused', { deny: ['other.test'] }],
    ['slow', 'https://site.test/slow: picture: timeout', { limits: { request: 150 } }],
  ];
  for (const [file, line, more] of cases) {
    const { result, said } = await ask(t, server, `https://site.test/${file}`, { transform: step, ...more }, { resolve });
    assert.equal(result.ok, true, 'the page is still a card, without its picture');
    assert.equal(result.data.image, undefined, file);
    assert.ok(said.includes(line), `${file}: ${said.join(' | ')}`);
  }
  for (const file of ['plain', 'numeric']) {
    const { result } = await ask(t, server, `https://site.test/${file}`, { transform: step }, { resolve });
    assert.equal(result.data.image, undefined, `${file}: such an address is absent (LKD-17) and nothing is asked`);
  }
  assert.deepEqual(server.requests.filter((request) => request.url === '/p.png'), [], 'no refused picture was ever asked for');
  assert.equal(step.calls.filter((call) => call.info.role === 'image').length, 0);
  for (const request of server.requests) for (const name of ['cookie', 'referer', 'authorization']) assert.equal(request.headers[name], undefined);
});

test('LKD-18: a picture stops at its limit and an icon at its own — one that is larger is dropped, declared or not', async (t) => {
  const big = png(300, 300, (x, y) => [(x * 7 + y * 13) % 256, (x * 31) % 256, (y * 17) % 256, 255]);
  const chunked = (_request, response) => {
    response.writeHead(200, { 'content-type': 'image/png' });
    response.write(big.subarray(0, 1000));
    setTimeout(() => response.end(big.subarray(1000)), 10);
  };
  const server = await serve({
    'site.test/declared': withPicture('/big.png'),
    'site.test/undeclared': withPicture('/chunked.png'),
    'site.test/icon': page('<title>T</title><link rel="icon" href="/big.png">'),
    'site.test/big.png': picture(big),
    'site.test/chunked.png': chunked,
  });
  t.after(() => server.close());
  assert.ok(big.length > 2000);
  for (const file of ['declared', 'undeclared']) {
    const step = imageStep();
    const { result, said, options } = await ask(t, server, `https://site.test/${file}`, { transform: step, limits: { picture: big.length - 1 } });
    assert.equal(result.data.image, undefined);
    assert.ok(said.includes(`https://site.test/${file}: picture: too-large`), said.join(' | '));
    assert.equal(step.calls.filter((call) => call.info.role === 'image').length, 0);
    assert.deepEqual(stored(options).length <= 1, true);
    const exact = await ask(t, server, `https://site.test/${file}`, { transform: imageStep(), limits: { picture: big.length } });
    assert.equal(exact.result.data.image.width, 300, 'exactly the limit is kept');
  }
  const icon = await ask(t, server, 'https://site.test/icon', { transform: imageStep(), limits: { icon: big.length - 1 } });
  assert.equal(icon.result.data.siteIcon, undefined);
  assert.ok(icon.said.includes('https://site.test: site icon: too-large'));
  const { fetcher } = await import('./helpers/module.mjs');
  assert.equal(fetcher.DEFAULT_LIMITS.picture, 5 * 1024 * 1024);
  assert.equal(fetcher.DEFAULT_LIMITS.icon, 256_000);
});

test('LKD-19: the kind of a file is told from its first bytes alone', () => {
  assert.deepEqual(sniffPicture(png(12, 7)), { type: 'image/png', width: 12, height: 7, extension: 'png' });
  assert.deepEqual(sniffPicture(jpegHeader(640, 480)), { type: 'image/jpeg', width: 640, height: 480, extension: 'jpg' });
  assert.deepEqual(sniffPicture(gifHeader(88, 31)), { type: 'image/gif', width: 88, height: 31, extension: 'gif' });
  assert.deepEqual(sniffPicture(webpHeader(1200, 630)), { type: 'image/webp', width: 1200, height: 630, extension: 'webp' });
  assert.deepEqual(sniffPicture(avifHeader(800, 418)), { type: 'image/avif', width: 800, height: 418, extension: 'avif' });
  const icon = ico([{ side: 16, bytes: png(16, 16) }, { side: 32, bytes: png(32, 32) }]);
  assert.equal(sniffPicture(icon), null, 'an icon file is not a picture for a page');
  assert.equal(sniffPicture(icon, { icon: true }).type, 'image/x-icon');
  const not = [svg, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>          '), Buffer.from('<!doctype html><title>x</title>'), Buffer.from('%PDF-1.7 ............'), Buffer.from('BM' + '\0'.repeat(40)), Buffer.from('II*\0' + '\0'.repeat(40), 'latin1'), Buffer.from('PK\x03\x04' + '\0'.repeat(40), 'latin1'), Buffer.alloc(64), Buffer.from([0x89, 0x50, 0x4e]), Buffer.alloc(0)];
  for (const bytes of not) assert.equal(sniffPicture(bytes, { icon: true }), null, bytes.subarray(0, 12).toString('latin1'));
  assert.equal(sniffPicture('not bytes'), null);
});

test('LKD-19: a vector drawing is dropped whatever it is named and whatever the server calls it — and is never handed to anything that would draw it', async (t) => {
  const server = await serve({
    'site.test/named-png': withPicture('/drawing.png'),
    'site.test/drawing.png': picture(svg, 'image/png'),
    'site.test/honest': withPicture('/drawing.svg'),
    'site.test/drawing.svg': picture(svg, 'image/svg+xml'),
    'site.test/markup': withPicture('/page.png'),
    'site.test/page.png': picture('<!doctype html><script>alert(1)</script>', 'image/png'),
    'site.test/icon': page('<title>T</title><link rel="icon" href="/drawing.png">'),
  });
  t.after(() => server.close());
  for (const file of ['named-png', 'honest', 'markup']) {
    const step = imageStep();
    const { result, said, options } = await ask(t, server, `https://site.test/${file}`, { transform: step });
    assert.equal(result.ok, true);
    assert.equal(result.data.image, undefined, file);
    assert.ok(said.includes(`https://site.test/${file}: picture: not-a-picture`), said.join(' | '));
    assert.equal(step.calls.filter((call) => call.info.role === 'image').length, 0, 'the image step is never given it: nothing rasterises a document someone else wrote');
    assert.deepEqual(stored(options).filter((file) => !file.endsWith('.png')), []);
  }
  const step = imageStep();
  const icon = await ask(t, server, 'https://site.test/icon', { transform: step });
  assert.equal(icon.result.data.siteIcon, undefined);
  assert.equal(step.calls.length, 0);
  assert.deepEqual(stored(icon.options), []);
});

test('LKD-19: what the server calls a file and what its address ends in decide nothing', async (t) => {
  const server = await serve({ 'site.test/': withPicture('/photo.jpg?x=.svg'), 'site.test/photo.jpg': picture(png(20, 10), 'image/svg+xml') });
  t.after(() => server.close());
  const { result } = await ask(t, server, 'https://site.test/', { transform: imageStep() });
  assert.equal(result.data.image.type, 'image/png');
  assert.match(result.data.image.src, /\.png$/);
});

test('LKD-20: width and height are read from the file\'s own header before anything decodes it; too wide, too high or a side of 0 is dropped', async (t) => {
  const server = await serve({
    'site.test/huge': withPicture('/huge.png'),
    'site.test/huge.png': picture(pngClaiming(60000, 60000)),
    'site.test/wide': withPicture('/wide.png'),
    'site.test/wide.png': picture(pngClaiming(4097, 10)),
    'site.test/high': withPicture('/high.jpg'),
    'site.test/high.jpg': picture(jpegHeader(10, 4097), 'image/jpeg'),
    'site.test/zero': withPicture('/zero.gif'),
    'site.test/zero.gif': picture(gifHeader(0, 10), 'image/gif'),
    'site.test/edge': withPicture('/edge.png'),
    'site.test/edge.png': picture(pngClaiming(4096, 4096)),
  });
  t.after(() => server.close());
  for (const file of ['huge', 'wide', 'high', 'zero']) {
    const step = imageStep();
    const { result, said } = await ask(t, server, `https://site.test/${file}`, { transform: step });
    assert.equal(result.data.image, undefined, file);
    assert.ok(said.includes(`https://site.test/${file}: picture: picture-too-large`), said.join(' | '));
    assert.equal(step.calls.filter((call) => call.info.role === 'image').length, 0, 'dropped before the image step sees it');
  }
  const calls = [];
  const edge = await ask(t, server, 'https://site.test/edge', { transform: (bytes, info) => (calls.push(info), png(64, 64)) });
  assert.deepEqual(calls[0], { type: 'image/png', width: 4096, height: 4096, role: 'image' }, 'the limit itself is kept, and the step is told what the header said');
  assert.equal(edge.result.data.image.width, 64);
  const small = await ask(t, server, 'https://site.test/edge', { transform: imageStep(), limits: { pixels: 1000 } });
  assert.equal(small.result.data.image, undefined);
});

test('LKD-20: of the pictures inside an icon file, the smallest that is at least 32 a side; failing that the largest', () => {
  const sizes = (...sides) => ico(sides.map((side) => ({ side, bytes: png(side > 64 ? 4 : side, side > 64 ? 4 : side) })));
  assert.equal(sniffPicture(sizes(16, 32, 48, 256), { icon: true, side: 32 }).width, 32);
  assert.equal(sniffPicture(sizes(16, 48, 256), { icon: true, side: 32 }).width, 48);
  assert.equal(sniffPicture(sizes(16, 24), { icon: true, side: 32 }).width, 24);
  assert.equal(sniffPicture(sizes(256), { icon: true, side: 32 }).width, 256, 'a side written as 0 is 256');
  assert.equal(sniffPicture(sizes(), { icon: true, side: 32 }), null);
});

test('LKD-21: without the site\'s image step no picture and no icon is stored or returned, nothing is fetched for them, and the report says so once', async (t) => {
  const server = await serve({
    'site.test/one': page('<title>One</title><meta property="og:image" content="/p.png"><link rel="icon" href="/i.png">'),
    'site.test/two': page('<title>Two</title><meta property="og:image" content="/p.png">'),
    '/p.png': picture(png(8, 8)),
    '/i.png': picture(png(32, 32)),
    '/favicon.ico': picture(png(32, 32)),
  });
  t.after(() => server.close());
  const { options, said } = optionsIn(scratch(t));
  const seam = server.seam();
  const one = await links.resolveLinkDataWith('https://site.test/one', options, seam);
  const two = await links.resolveLinkDataWith('https://site.test/two', options, seam);
  const icons = await links.resolveSiteIconsWith(['https://other.test'], options, seam);
  assert.deepEqual([one.ok, two.ok], [true, true], 'a card is still a card');
  for (const result of [one, two]) {
    assert.equal(result.data.image, undefined);
    assert.equal(result.data.siteIcon, undefined);
  }
  assert.deepEqual(icons, {});
  assert.deepEqual(server.requests.map((request) => request.url), ['/one', '/two'], 'nothing was fetched that could not be kept');
  assert.deepEqual(stored(options), []);
  const lines = said.filter((line) => line.includes('image step'));
  assert.equal(lines.length, 1, said.join(' | '));
  assert.match(lines[0], /need the site's image step/);
  assert.match(lines[0], /options\.transform/);
  assert.match(lines[0], /no picture and no icon/);
});

test('LKD-21: what is stored is what the image step returned, never the bytes as they were fetched', async (t) => {
  const fetched = png(40, 20, () => [200, 10, 10, 255]);
  const server = await serve({ 'site.test/': withPicture('/p.png'), 'site.test/p.png': picture(fetched) });
  t.after(() => server.close());
  const made = png(20, 10, () => [10, 200, 10, 255]);
  const calls = [];
  const { result, options } = await ask(t, server, 'https://site.test/', { transform: async (bytes, info) => (calls.push({ bytes: Buffer.from(bytes), info }), made), iconOutput: 'file' });
  assert.deepEqual(calls.filter((call) => call.info.role === 'image').map((call) => [call.bytes.equals(fetched), call.info]), [[true, { type: 'image/png', width: 40, height: 20, role: 'image' }]]);
  assert.deepEqual({ width: result.data.image.width, height: result.data.image.height }, { width: 20, height: 10 }, 'the size is the stored file\'s');
  const files = stored(options).map((file) => fs.readFileSync(path.join(options.pictureDirectory, file)));
  assert.ok(files.some((bytes) => bytes.equals(made)));
  assert.ok(!files.some((bytes) => bytes.equals(fetched)), 'the fetched bytes are nowhere on disk');
});

test('LKD-21: what the image step returns is held again to the kinds and the sizes — a step that fails costs the picture, never the build', async (t) => {
  const server = await serve({ 'site.test/': withPicture('/p.png'), 'site.test/p.png': picture(png(8, 8)) });
  t.after(() => server.close());
  const bad = {
    'returns a vector drawing': () => svg,
    'returns the markup of a page': () => Buffer.from('<!doctype html><title>x</title>'),
    'returns a picture beyond the limit of pixels': () => pngClaiming(5000, 10),
    'returns more bytes than a picture may have': () => Buffer.concat([png(8, 8), Buffer.alloc(6 * 1024 * 1024)]),
    'returns an icon file': () => ico([{ side: 32, bytes: png(32, 32) }]),
    'returns nothing': () => undefined,
    'returns text': () => 'a string',
    throws: () => {
      throw new Error('the codec fell over: /secret/path');
    },
    rejects: async () => Promise.reject(new Error('later')),
  };
  for (const [what, transform] of Object.entries(bad)) {
    const { result, said, options } = await ask(t, server, 'https://site.test/', { transform });
    assert.equal(result.ok, true, what);
    assert.equal(result.data.image, undefined, what);
    assert.ok(said.includes('https://site.test/: picture: image-step-failed'), `${what}: ${said.join(' | ')}`);
    assert.deepEqual(stored(options), [], what);
    assert.doesNotMatch(said.join('\n'), /secret/);
  }
});

test('LKD-22: a kept picture is written under a name made from a digest of its bytes and the extension of its kind — nothing of the name is the destination\'s', async (t) => {
  const server = await serve({
    'site.test/': withPicture('/a/..%2f..%2f..%2fetc/evil.php?name=shell.svg'),
    'site.test/a/..%2f..%2f..%2fetc/evil.php': picture(png(30, 15), 'application/x-php', { 'content-disposition': 'attachment; filename="../../evil.sh"' }),
  });
  t.after(() => server.close());
  const made = png(30, 15, () => [1, 2, 3, 255]);
  const { result, options } = await ask(t, server, 'https://site.test/', { transform: () => made, picturePath: (file) => `/assets/links/${file}` });
  const digest = crypto.createHash('sha256').update(made).digest('hex');
  const name = `${digest.slice(0, 32)}.png`;
  assert.deepEqual(result.data.image, { src: `/assets/links/${name}`, width: 30, height: 15, type: 'image/png' });
  assert.deepEqual(stored(options), [name]);
  assert.deepEqual(fs.readdirSync(path.dirname(options.pictureDirectory)).sort(), ['link-data.lock.json', 'pictures'], 'nothing was written anywhere else');
  const lock = JSON.parse(fs.readFileSync(options.lock, 'utf8'));
  assert.deepEqual(lock.links['https://site.test/'].image, { file: name, digest, width: 30, height: 15, type: 'image/png' });
  const other = await ask(t, server, 'https://site.test/', { transform: () => made });
  assert.equal(other.result.data.image.src, `/pictures/${name}`, 'without picturePath: under the directory\'s own name');
});

test('LKD-22: the extension is the kind the stored bytes are', async (t) => {
  const server = await serve({ 'site.test/': withPicture('/p.png'), 'site.test/p.png': picture(png(8, 8)) });
  t.after(() => server.close());
  for (const [extension, bytes, type] of [['jpg', jpegHeader(8, 8), 'image/jpeg'], ['webp', webpHeader(8, 8), 'image/webp'], ['avif', avifHeader(8, 8), 'image/avif'], ['gif', gifHeader(8, 8), 'image/gif']]) {
    const { result, options } = await ask(t, server, 'https://site.test/', { transform: () => bytes });
    assert.equal(result.data.image.type, type);
    assert.match(stored(options)[0], new RegExp(`^[0-9a-f]{32}\\.${extension}$`));
  }
});

test('LKD-22: while pictures is remote nothing is fetched for them and their addresses are returned as they are, said once; while it is none there are none', async (t) => {
  const server = await serve({ 'site.test/': page('<title>T</title><meta property="og:image" content="/p.png?v=2"><link rel="icon" href="/i.png">'), 'site.test/two': withPicture('/q.png') });
  t.after(() => server.close());
  const { options, said } = optionsIn(scratch(t), { pictures: 'remote' });
  delete options.pictureDirectory;
  const seam = server.seam();
  const result = await links.resolveLinkDataWith('https://site.test/', options, seam);
  await links.resolveLinkDataWith('https://site.test/two', options, seam);
  assert.deepEqual(result.data.image, { src: 'https://site.test/p.png?v=2', width: 0, height: 0, type: '' });
  assert.deepEqual(result.data.siteIcon, { src: 'https://site.test/i.png', width: 0, height: 0, type: '' });
  assert.deepEqual(server.requests.map((request) => request.url), ['/', '/two']);
  const lines = said.filter((line) => line.includes('remote'));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /every reader's browser will ask those destinations/);
  const none = await ask(t, server, 'https://site.test/', { pictures: 'none' });
  assert.equal(none.result.data.image, undefined);
  assert.equal(none.result.data.siteIcon, undefined);
  assert.deepEqual(stored(none.options), []);
  // A lock file written with remote pictures, answered where pictures are stored: the remote addresses are not used.
  const strict = await links.resolveLinkDataWith('https://site.test/', { ...options, pictures: 'store', pictureDirectory: path.join(path.dirname(options.lock), 'p'), mode: 'frozen' }, seam);
  assert.equal(strict.data.image, undefined);
  assert.equal(strict.data.siteIcon, undefined);
});

test('the platform was asked to resolve no name', () => assert.deepEqual(asked, []));
