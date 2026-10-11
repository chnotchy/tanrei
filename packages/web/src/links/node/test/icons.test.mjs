// REQUIREMENTS.md, LKD-29 and LKD-30: the site icon — found as a page's icon is, held to every rule a picture is,
// recorded in the same lock file and directory, and written as a small PNG the site's image step made.
import './helpers/network.mjs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { asked } from './helpers/network.mjs';
import { links, pictures } from './helpers/module.mjs';
import { PUBLIC, optionsIn, page, scratch, serve } from './helpers/server.mjs';
import { ico, imageStep, jpegHeader, png, svg } from './helpers/picture-files.mjs';

const file = (body, type = 'image/png') => ({ headers: { 'content-type': type }, body });
const glyph = (ink) => (x, y) => (x >= 8 && x < 24 && y >= 8 && y < 24 ? [...ink, 255] : [0, 0, 0, 0]);
const pixelsOf = (options, src) => pictures.readPngPixels(fs.readFileSync(path.join(options.pictureDirectory, path.basename(src))));

test('LKD-29: an origin\'s icon is the one the page at its root names; failing that, its /favicon.ico', async (t) => {
  const server = await serve({
    'a.test/': page('<title>A</title><link rel="icon" href="/small.png" sizes="16x16"><link rel="icon" href="/assets/icon-64.png" sizes="64x64"><link rel="icon" href="/big.png" sizes="512x512">'),
    'a.test/assets/icon-64.png': file(png(64, 64)),
    'b.test/': page('<title>B has no icon link</title>'),
    'b.test/favicon.ico': file(ico([{ side: 16, bytes: png(16, 16) }, { side: 32, bytes: png(32, 32) }]), 'image/x-icon'),
    'c.test/': { status: 500 },
    'c.test/favicon.ico': file(png(32, 32)),
    'd.test/': page('<title>D</title>'),
  });
  t.after(() => server.close());
  const { options, said } = optionsIn(scratch(t), { transform: imageStep() });
  const icons = await links.resolveSiteIconsWith(['https://a.test', 'https://b.test/', 'https://c.test/some/page', 'https://d.test', 'https://a.test'], options, server.seam());
  assert.deepEqual(Object.keys(icons), ['https://a.test', 'https://b.test', 'https://c.test']);
  for (const icon of Object.values(icons)) {
    assert.deepEqual(Object.keys(icon), ['src', 'width', 'height'], 'each origin is answered with { src, width, height }');
    assert.deepEqual([icon.width, icon.height], [32, 32]);
    assert.match(icon.src, /^\/pictures\/[0-9a-f]{32}\.png$/);
  }
  const seen = server.requests.map((request) => `${request.host}${request.url}`).sort();
  assert.deepEqual(seen, ['a.test/', 'a.test/assets/icon-64.png', 'b.test/', 'b.test/favicon.ico', 'c.test/', 'c.test/favicon.ico', 'd.test/', 'd.test/favicon.ico']);
  assert.deepEqual(said, ['https://d.test: site icon: unreachable'], 'a failure is a line of the report, never a failed build');
});

test('LKD-29: the icon is held to every rule a picture is — the address, the bytes, the size, the image step', async (t) => {
  const server = await serve({
    'a.test/': page('<link rel="icon" href="https://pictures.test/i.png">'),
    'b.test/': page('<link rel="icon" href="/i.svg" type="image/png">'),
    'b.test/i.svg': file(svg, 'image/png'),
    'c.test/': page('<link rel="icon" href="/i.png">'),
    'c.test/i.png': { status: 302, headers: { location: 'https://other.test/i.png' } },
    'd.test/': page('<link rel="icon" href="/i.jpg">'),
    'd.test/i.jpg': file(jpegHeader(9000, 9000), 'image/jpeg'),
    'e.test/': page('<link rel="icon" href="http://e.test/i.png">'),
    'e.test/favicon.ico': file('<html>not found, but 200</html>', 'text/html'),
    'f.test/': { status: 302, headers: { location: 'https://other.test/' } },
    'f.test/favicon.ico': file(png(32, 32)),
    '/i.png': file(png(32, 32)),
  });
  t.after(() => server.close());
  const step = imageStep();
  const { options, said } = optionsIn(scratch(t), { transform: step });
  const seam = server.seam({ resolve: (host) => [{ address: host === 'pictures.test' ? '169.254.169.254' : PUBLIC, family: 4 }] });
  const icons = await links.resolveSiteIconsWith(['a', 'b', 'c', 'd', 'e', 'f'].map((host) => `https://${host}.test`), options, seam);
  assert.deepEqual(Object.keys(icons), ['https://f.test'], 'a root that forwards elsewhere names no icon; the origin\'s own /favicon.ico is asked');
  assert.deepEqual(said.sort(), [
    'https://a.test: site icon: address-private',
    'https://b.test: site icon: not-a-picture',
    'https://c.test: site icon: redirect-refused',
    'https://d.test: site icon: picture-too-large',
    'https://e.test: site icon: not-a-picture',
  ]);
  assert.equal(step.calls.length, 1, 'the image step saw only the one that was kept');
  assert.deepEqual(server.requests.filter((request) => request.host === 'other.test' || request.host === 'pictures.test'), []);
  assert.deepEqual(JSON.parse(fs.readFileSync(options.lock, 'utf8')).icons['https://b.test'], { ok: false, reason: 'not-a-picture' });
  assert.deepEqual(await links.resolveSiteIconsWith(['http://a.test', 'ftp://a.test', 'https://'], options, seam), {});
});

test('LKD-29: the icon is recorded in the same lock file and directory, under the same modes — read once whichever function asks first, and never by a build', async (t) => {
  const server = await serve({
    'site.test/': page('<title>Root</title><link rel="icon" href="/root-icon.png">'),
    'site.test/post': page('<title>Post</title><link rel="icon" href="/post-icon.png">'),
    'site.test/other-post': page('<title>Other</title><link rel="icon" href="/post-icon.png">'),
    'site.test/root-icon.png': file(png(32, 32, () => [10, 10, 200, 255])),
    'site.test/post-icon.png': file(png(32, 32, () => [200, 10, 10, 255])),
  });
  t.after(() => server.close());
  const count = (url) => server.requests.filter((request) => request.url === url).length;
  // The link asks first: the icon is the one its own page names, and the origin's root is never read for it.
  const first = optionsIn(scratch(t), { transform: imageStep() });
  const post = await links.resolveLinkDataWith('https://site.test/post', first.options, server.seam());
  const icons = await links.resolveSiteIconsWith(['https://site.test'], first.options, server.seam());
  await links.resolveLinkDataWith('https://site.test/other-post', first.options, server.seam());
  assert.equal(icons['https://site.test'].src, post.data.siteIcon.src);
  assert.deepEqual([count('/post-icon.png'), count('/root-icon.png'), count('/')], [1, 0, 0]);
  // The icons ask first: a link to the same origin then reads no icon.
  server.requests.length = 0;
  const second = optionsIn(scratch(t), { transform: imageStep() });
  const again = await links.resolveSiteIconsWith(['https://site.test'], second.options, server.seam());
  const linked = await links.resolveLinkDataWith('https://site.test/post', second.options, server.seam());
  assert.equal(linked.data.siteIcon.src, again['https://site.test'].src);
  assert.deepEqual([count('/root-icon.png'), count('/post-icon.png')], [1, 0]);
  const lock = JSON.parse(fs.readFileSync(second.options.lock, 'utf8'));
  assert.deepEqual(Object.keys(lock.icons), ['https://site.test']);
  assert.ok(fs.existsSync(path.join(second.options.pictureDirectory, lock.icons['https://site.test'].file)));
  // A build: frozen, and nothing is asked. A refresh: once more, and once only.
  server.requests.length = 0;
  const resolved = server.resolved.length;
  const { mode, ...build } = second.options;
  assert.deepEqual(await links.resolveSiteIconsWith(['https://site.test', 'https://a.test'], build, server.seam()), again);
  assert.deepEqual(server.requests, []);
  assert.equal(server.resolved.length, resolved, 'no name was resolved');
  const { refresh } = await import('./helpers/module.mjs');
  await refresh.refreshLinkDataWith({ links: ['https://site.test/post', 'https://site.test/other-post'], origins: ['https://site.test'], mode: 'refresh', options: build }, server.seam());
  assert.equal(server.requests.filter((request) => request.url.endsWith('icon.png')).length, 1, 'one icon for the origin, however many ask');
});

test('LKD-29: a link that was forwarded to another host does not give that host\'s icon to its own origin', async (t) => {
  const server = await serve({
    'short.test/x': { status: 302, headers: { location: 'https://site.test/long' } },
    'site.test/long': page('<title>Long</title><link rel="icon" href="/site-icon.png">'),
    'site.test/site-icon.png': file(png(32, 32)),
    'short.test/favicon.ico': file(png(32, 32, () => [9, 9, 9, 255])),
  });
  t.after(() => server.close());
  const { options } = optionsIn(scratch(t), { transform: imageStep(), redirects: ['short.test'] });
  const result = await links.resolveLinkDataWith('https://short.test/x', options, server.seam());
  assert.equal(result.ok, true);
  // The forwarder's own icon is found as any origin's is: the page at its root, and failing that its /favicon.ico.
  assert.deepEqual(server.requests.map((request) => `${request.host}${request.url}`), ['short.test/x', 'site.test/long', 'short.test/', 'short.test/favicon.ico']);
  assert.deepEqual(server.requests.filter((request) => request.url === '/site-icon.png'), []);
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(options.lock, 'utf8')).icons), ['https://short.test']);
});

test('LKD-30: a site icon is written as a small PNG, 32 a side by default, made by the site\'s image step and named by the digest of its bytes', async (t) => {
  const server = await serve({ 'site.test/': page('<link rel="icon" href="/i.png">'), 'site.test/i.png': file(png(180, 180)) });
  t.after(() => server.close());
  const step = imageStep();
  const { options } = optionsIn(scratch(t), { transform: step });
  const icons = await links.resolveSiteIconsWith(['https://site.test'], options, server.seam());
  assert.deepEqual(step.calls.map((call) => call.info), [{ type: 'image/png', width: 180, height: 180, role: 'siteIcon', size: 32 }]);
  const stored = fs.readdirSync(options.pictureDirectory);
  assert.equal(stored.length, 1);
  const bytes = fs.readFileSync(path.join(options.pictureDirectory, stored[0]));
  assert.deepEqual(pictures.sniffPicture(bytes), { type: 'image/png', width: 32, height: 32, extension: 'png' });
  assert.equal(stored[0], `${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 32)}.png`);
  assert.deepEqual(icons['https://site.test'], { src: `/pictures/${stored[0]}`, width: 32, height: 32 });
  const larger = optionsIn(scratch(t), { transform: imageStep(), iconSize: 48 });
  assert.deepEqual(Object.values(await links.resolveSiteIconsWith(['https://site.test'], larger.options, server.seam())).map((icon) => icon.width), [48]);
});

test('LKD-30: what the image step returns for an icon must be that PNG — another kind or another size is dropped', async (t) => {
  const server = await serve({ 'site.test/': page('<link rel="icon" href="/i.png">'), 'site.test/i.png': file(png(64, 64)) });
  t.after(() => server.close());
  for (const [what, transform] of Object.entries({ 'the picture as it was': (bytes) => bytes, 'a JPEG': () => jpegHeader(32, 32), 'a PNG that is not square': () => png(32, 16), 'a PNG of another size': () => png(64, 64), 'a vector drawing': () => svg })) {
    const { options, said } = optionsIn(scratch(t), { transform });
    assert.deepEqual(await links.resolveSiteIconsWith(['https://site.test'], options, server.seam()), {}, what);
    assert.deepEqual(said, ['https://site.test: site icon: image-step-failed'], what);
    assert.equal(fs.existsSync(options.pictureDirectory), false, what);
  }
});

test('LKD-30: a picture with transparent pixels that would not be seen on a dark or on a light surface gets a plain ground in the file', async (t) => {
  const server = await serve({
    'a.test/favicon.ico': file(png(32, 32, glyph([0, 0, 0]))), // black on nothing: lost on a dark surface
    'b.test/favicon.ico': file(png(32, 32, glyph([255, 255, 255]))), // white on nothing: lost on a light one
    'c.test/favicon.ico': file(png(32, 32, glyph([40, 110, 220]))), // a color seen on both
    'd.test/favicon.ico': file(png(32, 32, () => [0, 0, 0, 255])), // black, but no transparent pixel: it is its own ground
    'e.test/favicon.ico': file(png(32, 32, (x, y) => (x < 16 ? glyph([0, 0, 0])(x, y) : glyph([255, 255, 255])(x, y)))), // half of it is seen on either
  });
  t.after(() => server.close());
  const step = imageStep();
  const { options } = optionsIn(scratch(t), { transform: step });
  const icons = await links.resolveSiteIconsWith(['a', 'b', 'c', 'd', 'e'].map((host) => `https://${host}.test`), options, server.seam({ resolve: () => [{ address: PUBLIC, family: 4 }] }));
  const grounds = step.calls.filter((call) => call.info.ground !== undefined).map((call) => call.info.ground);
  assert.deepEqual(grounds.sort(), ['#000000', '#ffffff'], 'the step was asked twice for two of them, with the ground to lay under');
  assert.equal(step.calls.length, 7);
  const corner = (origin) => [...pixelsOf(options, icons[origin].src).rgba.subarray(0, 4)];
  const centre = (origin) => [...pixelsOf(options, icons[origin].src).rgba.subarray((16 * 32 + 16) * 4, (16 * 32 + 16) * 4 + 4)];
  assert.deepEqual([corner('https://a.test'), centre('https://a.test')], [[255, 255, 255, 255], [0, 0, 0, 255]], 'a light ground under the dark picture');
  assert.deepEqual([corner('https://b.test'), centre('https://b.test')], [[0, 0, 0, 255], [255, 255, 255, 255]], 'a dark ground under the light one');
  assert.deepEqual(corner('https://c.test'), [0, 0, 0, 0], 'none where the picture is seen on both');
  assert.deepEqual(corner('https://e.test'), [0, 0, 0, 0]);
  const own = optionsIn(scratch(t), { transform: imageStep(), iconGround: { light: '#f4f4f4' } });
  const tinted = await links.resolveSiteIconsWith(['https://a.test'], own.options, server.seam());
  assert.deepEqual([...pixelsOf(own.options, tinted['https://a.test'].src).rgba.subarray(0, 4)], [244, 244, 244, 255], 'the ground is the site\'s to name');
});

test('LKD-30: the rule for a ground, on pixels', () => {
  const { groundFor } = pictures;
  const pixels = (...list) => Uint8Array.from(list.flat());
  const clear = [0, 0, 0, 0];
  assert.equal(groundFor(pixels(clear, [0, 0, 0, 255], [20, 20, 20, 255])), 'light');
  assert.equal(groundFor(pixels(clear, [255, 255, 255, 255], [240, 240, 240, 200])), 'dark');
  assert.equal(groundFor(pixels(clear, [255, 0, 0, 255])), null);
  assert.equal(groundFor(pixels([0, 0, 0, 255], [0, 0, 0, 255])), null, 'no transparent pixel');
  assert.equal(groundFor(pixels(clear, clear)), null, 'nothing drawn');
  assert.equal(groundFor(pixels([0, 0, 0, 128], [0, 0, 0, 128])), 'light', 'half-transparent pixels are transparent ones');
  assert.equal(groundFor(pixels(clear, ...new Array(9).fill([0, 0, 0, 255]), [255, 255, 255, 255])), null, 'a tenth of it is seen: it is seen');
  assert.equal(groundFor(pixels(clear, ...new Array(19).fill([0, 0, 0, 255]), [255, 255, 255, 255])), 'light');
});

test('LKD-30: where the options ask for it, the same PNG is returned as a data: URL instead of a file\'s address', async (t) => {
  const server = await serve({ 'site.test/': page('<title>T</title><link rel="icon" href="/i.png">'), 'site.test/i.png': file(png(64, 64)) });
  t.after(() => server.close());
  const { options } = optionsIn(scratch(t), { transform: imageStep() });
  const asFile = await links.resolveSiteIconsWith(['https://site.test'], options, server.seam());
  const asData = await links.resolveSiteIconsWith(['https://site.test'], { ...options, iconOutput: 'data', mode: 'frozen' }, server.seam());
  const src = asData['https://site.test'].src;
  assert.match(src, /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/);
  assert.ok(Buffer.from(src.split(',')[1], 'base64').equals(fs.readFileSync(path.join(options.pictureDirectory, path.basename(asFile['https://site.test'].src)))), 'that same PNG');
  assert.deepEqual([asData['https://site.test'].width, asData['https://site.test'].height], [32, 32]);
  const card = await links.resolveLinkDataWith('https://site.test/', { ...options, iconOutput: 'data' }, server.seam());
  assert.equal(card.data.siteIcon.src, src);
});

test('LKD-30: an icon file that holds its picture as a PNG gives the image step that PNG; one that does not gives the file', async (t) => {
  const inner = png(48, 48, () => [1, 2, 3, 255]);
  const bitmap = Buffer.alloc(200, 7);
  bitmap.writeUInt32LE(40, 0); // a bitmap's header, not a PNG's
  const server = await serve({ 'a.test/favicon.ico': file(ico([{ side: 16, bytes: png(16, 16) }, { side: 48, bytes: inner }]), 'image/x-icon'), 'b.test/favicon.ico': file(ico([{ side: 32, bytes: bitmap }]), 'image/vnd.microsoft.icon') });
  t.after(() => server.close());
  const calls = [];
  const { options } = optionsIn(scratch(t), { transform: (bytes, info) => (calls.push({ bytes: Buffer.from(bytes), info }), png(32, 32)) });
  const icons = await links.resolveSiteIconsWith(['https://a.test', 'https://b.test'], options, server.seam());
  assert.deepEqual(Object.keys(icons), ['https://a.test', 'https://b.test']);
  const a = calls.find((call) => call.info.width === 48);
  assert.ok(a.bytes.equals(inner));
  assert.deepEqual(a.info, { type: 'image/png', width: 48, height: 48, role: 'siteIcon', size: 32 });
  const b = calls.find((call) => call.info.type === 'image/x-icon');
  assert.deepEqual(b.info, { type: 'image/x-icon', width: 32, height: 32, role: 'siteIcon', size: 32 });
});

test('the reader of a PNG\'s pixels reads what the image step writes, and says so when it cannot', () => {
  const made = png(5, 3, (x, y) => [x * 50, y * 80, 7, x === 0 ? 0 : 255]);
  const read = pictures.readPngPixels(made);
  assert.deepEqual([read.width, read.height], [5, 3]);
  assert.deepEqual([...read.rgba.subarray(4 * 6, 4 * 6 + 4)], [50, 80, 7, 255]);
  assert.deepEqual([...read.rgba.subarray(0, 4)], [0, 0, 7, 0]);
  assert.equal(pictures.readPngPixels(jpegHeader(8, 8)), null);
  assert.equal(pictures.readPngPixels(made.subarray(0, 40)), null);
  const interlaced = Buffer.from(made);
  interlaced[28] = 1;
  assert.equal(pictures.readPngPixels(interlaced), null);
});

test('the platform was asked to resolve no name', () => assert.deepEqual(asked, []));
