// REQUIREMENTS.md, LKD-14 to LKD-17: what is taken from a head, and how it is made text. The `meta` and `link` names
// below are data the reader looks for.
import './helpers/network.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { asked } from './helpers/network.mjs';
import { fetcher, head } from './helpers/module.mjs';
import { ask, page, serve } from './helpers/server.mjs';
import { imageStep, png } from './helpers/picture-files.mjs';

const { cleanText, decodeReferences, fieldsOf, readHead, chooseIcon, decodePage } = head;
const limits = fetcher.DEFAULT_LIMITS;
const fields = (markup, more = {}) => fieldsOf(`<html><head>${markup}</head><body>`, { from: 'https://site.test/a/page', asked: 'https://site.test/a/page', limits, iconSide: 32, ...more });

test('LKD-14: each field comes from the first source that has one, in the order of the technical notes', () => {
  const all = fields(`
    <title>The title element</title>
    <meta name="description" content="The plain description">
    <meta name="application-name" content="The application name">
    <meta property="og:image" content="https://site.test/plain.png">
    <meta property="og:title" content="The shared title">
    <meta property="og:description" content="The shared description">
    <meta property="og:site_name" content="The site name">
    <meta property="og:image:secure_url" content="https://site.test/secure.png">
    <link rel="icon" href="/icon.png">`);
  assert.deepEqual(all, { title: 'The shared title', description: 'The shared description', siteName: 'The site name', image: 'https://site.test/secure.png', icon: 'https://site.test/icon.png' });
  const second = fields(`
    <title>The title element</title>
    <meta name="description" content="The plain description">
    <meta name="application-name" content="The application name">
    <meta property="og:image" content="https://site.test/plain.png">`);
  assert.deepEqual(second, { title: 'The title element', description: 'The plain description', siteName: 'The application name', image: 'https://site.test/plain.png', icon: undefined });
  assert.deepEqual(fields(''), { title: undefined, description: undefined, siteName: undefined, image: undefined, icon: undefined });
});

test('LKD-14: a source whose value is empty as text is no source, and the first of two wins', () => {
  assert.equal(fields('<meta property="og:title" content="   "><title>Fallback</title>').title, 'Fallback');
  assert.equal(fields('<meta property="og:title" content="&#8238;&#x202c;"><title>Fallback</title>').title, 'Fallback');
  assert.equal(fields('<meta property="og:title" content="First"><meta property="og:title" content="Second">').title, 'First');
  assert.equal(fields('<META PROPERTY="OG:TITLE" CONTENT="Upper case">').title, 'Upper case');
  assert.equal(fields("<meta property='og:title' content='Single quotes'>").title, 'Single quotes');
  assert.equal(fields('<meta property=og:title content=Unquoted>').title, 'Unquoted');
  assert.equal(fields('<meta content="Content first" property="og:title">').title, 'Content first');
});

test('LKD-14: five fields and no others — a result has no key the contract does not name', async (t) => {
  const markup = `<title>T</title><meta name="author" content="An author"><meta name="keywords" content="a,b"><meta property="og:url" content="https://other.test/">
    <meta property="og:type" content="article"><meta property="og:locale" content="en"><meta name="theme-color" content="#f00"><meta property="og:image:width" content="1"><meta property="og:video" content="https://site.test/v.mp4">
    <meta name="other:title" content="Another title"><link rel="canonical" href="https://other.test/"><meta property="og:image" content="/p.png"><meta name="description" content="D"><meta property="og:site_name" content="S">`;
  const server = await serve({ 'site.test/': page(markup), 'site.test/p.png': { headers: { 'content-type': 'image/png' }, body: png(40, 20) }, 'site.test/favicon.ico': { headers: { 'content-type': 'image/png' }, body: png(32, 32) } });
  t.after(() => server.close());
  const { result } = await ask(t, server, 'https://site.test/', { transform: imageStep() });
  assert.deepEqual(Object.keys(result.data), ['href', 'title', 'description', 'siteName', 'image', 'siteIcon', 'external', 'read']);
  assert.equal(result.data.href, 'https://site.test/', 'the address asked about, not the one the page names');
  assert.deepEqual(server.requests.map((request) => request.url), ['/', '/p.png', '/favicon.ico'], 'the page, the one picture, the one icon');
});

test('LKD-14: the icon is the link whose rel holds icon, chosen by its sizes; without one, the origin\'s /favicon.ico', async (t) => {
  assert.equal(fields('<link rel="shortcut icon" href="/a.ico"><link rel="apple-touch-icon" href="/touch.png"><link rel="mask-icon" href="/mask.svg">').icon, 'https://site.test/a.ico');
  assert.equal(fields('<link rel="apple-touch-icon" href="/touch.png"><link rel="stylesheet" href="/icon.css">').icon, undefined);
  const server = await serve({ 'site.test/deep/page': page('<title>T</title>'), 'site.test/favicon.ico': { headers: { 'content-type': 'image/x-icon' }, body: png(32, 32) } });
  t.after(() => server.close());
  const { result } = await ask(t, server, 'https://site.test/deep/page', { transform: imageStep() });
  assert.deepEqual(server.requests.map((request) => request.url), ['/deep/page', '/favicon.ico']);
  assert.equal(result.data.siteIcon.width, 32);
});

test('LKD-15: character references are decoded once', () => {
  assert.equal(decodeReferences('Fish &amp; chips &lt;3 &#38; &#x26; &quot;q&quot; &copy; &hellip;'), 'Fish & chips <3 & & "q" © …');
  assert.equal(decodeReferences('&amp;lt;b&amp;gt;'), '&lt;b&gt;', 'what a reference decodes to is not read as a reference again');
  assert.equal(decodeReferences('&amp;amp;amp;'), '&amp;amp;');
  assert.equal(decodeReferences('&#0; &#xD800; &#x110000; &#99999999;'), '� � � �');
  assert.equal(decodeReferences('&unknown; &; & &#; AT&T'), '&unknown; &; & &#; AT&T');
  assert.equal(fields('<title>Fish &amp;amp; chips</title>').title, 'Fish &amp; chips');
  assert.equal(fields('<meta property="og:title" content="A &amp;lt;b&amp;gt; tag">').title, 'A &lt;b&gt; tag');
});

test('LKD-15: no tag is ever interpreted — a tag inside a value stays the characters it was written with', () => {
  assert.equal(fields('<title><b>Bold</b> &lt;script&gt;alert(1)&lt;/script&gt; <img src=x onerror=alert(1)></title>').title, '<b>Bold</b> <script>alert(1)</script> <img src=x onerror=alert(1)>');
  assert.equal(fields('<meta property="og:description" content="&lt;a href=&quot;javascript:alert(1)&quot;&gt;click&lt;/a&gt;">').description, '<a href="javascript:alert(1)">click</a>');
  assert.equal(fields('<meta property="og:title" content="&quot;&gt;&lt;svg onload=alert(1)&gt;">').title, '"><svg onload=alert(1)>');
});

test('LKD-15: white space is made one space, control characters are dropped, and the characters that embed, override or isolate direction are dropped', () => {
  assert.equal(cleanText('  a \t\n\r\n b 　c  ', 200), 'a b c');
  assert.equal(cleanText('a\u0000b\u0007c\u001bd\u007fe\u0080f\u009fg', 200), 'abcdefg');
  const direction = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];
  for (const point of direction) assert.equal(cleanText(`safe${String.fromCodePoint(point)}exe.txt`, 200), 'safeexe.txt', point.toString(16));
  assert.equal(cleanText(`invoice-${String.fromCodePoint(0x202e)}fdp.exe`, 200), 'invoice-fdp.exe');
  assert.equal(fields(`<title>A${String.fromCodePoint(0x202e)}B\u0001C</title>`).title, 'ABC');
  assert.equal(fields('<title>A&#x202E;B&#8237;C&#x2066;D&#1;E</title>').title, 'ABCDE', 'also when they are written as references');
  assert.equal(cleanText('lone \ud800 surrogate', 200), 'lone � surrogate');
});

test('LKD-15: text is composed to one normal form', () => {
  assert.equal(cleanText('Café', 200), 'Café');
  assert.equal(cleanText('パ', 200), 'パ');
});

test('LKD-15: a value is cut between characters as a reader counts them, with nothing added — 200, 300 and 60 by default', () => {
  const long = fields(`<title>${'T'.repeat(5000)}</title><meta name="description" content="${'D'.repeat(5000)}"><meta property="og:site_name" content="${'S '.repeat(2500)}">`);
  assert.equal(long.title, 'T'.repeat(200));
  assert.equal(long.description, 'D'.repeat(300));
  assert.equal(long.siteName, 'S '.repeat(30).trim(), '60 characters, and no space left at the cut');
  const family = '👨‍👩‍👧'; // one character to a reader, eight code units
  assert.equal(cleanText(family.repeat(5), 3), family.repeat(3));
  assert.equal(cleanText(`ab${'é'.repeat(3)}`, 3), 'abé');
  assert.equal(cleanText('🇯🇵🇫🇷', 1), '🇯🇵', 'a flag is not cut in half');
  assert.equal(fields('<title>abcdef</title>', { limits: { ...limits, title: 3 } }).title, 'abc');
  assert.doesNotMatch(long.title, /…|\.\.\./);
});

test('LKD-15: a value that is empty after cleaning is absent', () => {
  for (const value of ['', '   ', '\u0000\u0001', String.fromCodePoint(0x202e, 0x2066), '\n\t']) assert.equal(cleanText(value, 200), undefined, JSON.stringify(value));
  assert.equal(cleanText(undefined, 200), undefined);
  assert.equal(fields('<title> </title><meta name="description" content=" ">').description, undefined);
});

test('LKD-15: markup, a direction override and 5000 characters in a title, through the whole path', async (t) => {
  const title = `<b>Win</b> ${String.fromCodePoint(0x202e)}gnp.exe &lt;script&gt; ${'x'.repeat(5000)}`;
  const server = await serve({ 'site.test/': page(`<title>${title}</title>`) });
  t.after(() => server.close());
  const { result } = await ask(t, server, 'https://site.test/', { pictures: 'none' });
  assert.equal(result.data.title.length, 200);
  assert.ok(result.data.title.startsWith('<b>Win</b> gnp.exe <script> xxx'));
  assert.doesNotMatch(result.data.title, /[‪-‮⁦-⁩]/);
});

test('LKD-16: a site name that reads as a host is left out unless it is the host of the address asked about', () => {
  const named = (name, asked = 'https://site.test/a') => fields(`<meta property="og:site_name" content="${name}">`, { asked }).siteName;
  assert.equal(named('bank.example'), undefined, 'another host\'s name beside this host');
  assert.equal(named('www.bank.example'), undefined);
  assert.equal(named('BANK.EXAMPLE'), undefined);
  assert.equal(named('https://bank.example'), undefined);
  assert.equal(named('bank.example/login'), undefined);
  assert.equal(named('bаnk.example'), undefined, 'in any letters');
  assert.equal(named('site.test'), 'site.test', 'the host itself');
  assert.equal(named('Site.Test'), 'Site.Test');
  assert.equal(named('site.test', 'https://www.site.test/a'), 'site.test', 'with or without www.');
  assert.equal(named('www.site.test'), undefined, 'but not a host the address does not have');
  assert.equal(named('Example Journal'), 'Example Journal');
  assert.equal(named('Acme Inc.'), 'Acme Inc.', 'a dot that is not between letters');
  assert.equal(named('Node.js Weekly'), 'Node.js Weekly', 'a name with a space is a name');
  assert.equal(named('v2.0'), undefined, 'no space and a dot between characters: it reads as a host');
});

test('LKD-17: a picture\'s and an icon\'s address are resolved against the address the page was finally read from, and against its base', async (t) => {
  assert.equal(fields('<meta property="og:image" content="pic.png">').image, 'https://site.test/a/pic.png');
  assert.equal(fields('<meta property="og:image" content="/pic.png">').image, 'https://site.test/pic.png');
  assert.equal(fields('<meta property="og:image" content="//pictures.test/pic.png">').image, 'https://pictures.test/pic.png');
  assert.equal(fields('<base href="https://pictures.test/assets/"><meta property="og:image" content="pic.png"><link rel="icon" href="i.png">').image, 'https://pictures.test/assets/pic.png');
  assert.equal(fields('<base href="/root/"><link rel="icon" href="i.png">').icon, 'https://site.test/root/i.png');
  const server = await serve({ 'site.test/': { status: 301, headers: { location: 'https://www.site.test/blog/post' } }, 'www.site.test/blog/post': page('<title>T</title><meta property="og:image" content="cover.png">'), 'www.site.test/blog/cover.png': { headers: { 'content-type': 'image/png' }, body: png(10, 10) } });
  t.after(() => server.close());
  const { result } = await ask(t, server, 'https://site.test/', { transform: imageStep() });
  assert.equal(result.data.image.width, 10);
  assert.ok(server.requests.some((request) => request.host === 'www.site.test' && request.url === '/blog/cover.png'));
});

test('LKD-17: only an https address is taken — inline data, a script, http and every other scheme are absent', () => {
  for (const value of ['http://site.test/p.png', 'data:image/png;base64,iVBORw0KGgo=', 'javascript:alert(1)', 'file:///etc/passwd', 'ftp://site.test/p.png', 'blob:https://site.test/1', 'vbscript:x', ' JaVaScRiPt:alert(1)', 'https://', 'https://user:pw@site.test/p.png', 'https://site.test:8443/p.png', 'https://127.0.0.1/p.png', 'https://[::1]/p.png']) {
    assert.equal(fields(`<meta property="og:image" content="${value}">`).image, undefined, value);
    assert.equal(fields(`<link rel="icon" href="${value}">`).icon, undefined, value);
  }
  assert.equal(fields('<meta property="og:image:secure_url" content="http://site.test/a.png"><meta property="og:image" content="https://site.test/b.png">').image, 'https://site.test/b.png');
  assert.equal(fields('<base href="http://site.test/"><meta property="og:image" content="p.png">').image, undefined, 'a base that leads down to http');
});

test('LKD-20: among the icons a page offers, the smallest that is at least 32 a side; failing that the largest', () => {
  const icons = (...list) => list.map(([href, sizes = '', type = '']) => ({ href, sizes, type }));
  assert.equal(chooseIcon(icons(['16', '16x16'], ['48', '48x48'], ['32', '32x32'], ['192', '192x192']), 32).href, '32');
  assert.equal(chooseIcon(icons(['16', '16x16'], ['48', '48x48'], ['192', '192x192']), 32).href, '48');
  assert.equal(chooseIcon(icons(['16', '16x16'], ['24', '24x24']), 32).href, '24');
  assert.equal(chooseIcon(icons(['multi', '16x16 32x32 64x64'], ['180', '180x180']), 32).href, 'multi');
  assert.equal(chooseIcon(icons(['16', '16x16'], ['plain']), 32).href, 'plain', 'one that declares no size before one known to be too small');
  assert.equal(chooseIcon(icons(['vector', 'any', 'image/svg+xml'], ['16', '16x16']), 32).href, '16', 'a vector drawing is never chosen');
  assert.equal(chooseIcon(icons(['vector', '', 'image/svg+xml']), 32), undefined);
  assert.equal(chooseIcon([], 32), undefined);
  assert.equal(chooseIcon(icons(['64', '64x64'], ['128', '128x128']), 64).href, '64', 'the side the options ask for');
});

test('the reader copes with what pages really hold', () => {
  assert.equal(readHead('<title>Unfinished').title, undefined);
  assert.equal(readHead('<title>A</title><meta property="og:title" content="unfinished').metas.size, 0);
  assert.equal(readHead('<!-- unfinished <title>x</title>').title, undefined);
  assert.equal(readHead('<meta = = ="x" content=y name=description>').metas.get('name:description'), 'y');
  assert.equal(readHead('< title>no</ title><title>yes</title>').title, 'yes');
  assert.equal(readHead('<TITLE>Upper</TITLE>').title, 'Upper');
  assert.equal(readHead('<title lang="en" >Attr</title >').title, 'Attr');
  assert.equal(readHead(`${'<meta name="x" content="y">'.repeat(20000)}<title>Late</title>`).title, 'Late');
  assert.equal(readHead('<<<<<<<<title>x</title>').title, 'x');
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('<title>日本語</title>', 'utf16le')]);
  assert.equal(readHead(decodePage(utf16, 'text/html')).title, '日本語', 'a byte-order mark');
  const latin = Buffer.from('<meta charset="iso-8859-1"><title>Café</title>', 'latin1');
  assert.equal(readHead(decodePage(latin, 'text/html')).title, 'Café', 'a meta declaration in the first 1024 bytes');
  assert.equal(readHead(decodePage(latin, 'text/html; charset=utf-8')).title, 'Caf�', 'the header wins, and bytes that are not valid become the replacement character');
  assert.equal(readHead(decodePage(Buffer.from('<title>ok</title>'), 'text/html; charset=no-such-encoding')).title, 'ok');
});

test('the platform was asked to resolve no name', () => assert.deepEqual(asked, []));
