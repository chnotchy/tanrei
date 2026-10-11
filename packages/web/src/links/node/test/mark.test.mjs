// REQUIREMENTS.md, LKD-31: the marking step — it walks the tree it is given, parses nothing, and touches nothing else.
import './helpers/network.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { asked } from './helpers/network.mjs';
import { api, source } from './helpers/module.mjs';

const { markExternalLinks } = api;
const el = (tagName, properties = {}, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });
const a = (href, more = {}, children = [text('a link')]) => el('a', { href, ...more }, children);
const site = ['https://docs.test', 'https://example.test'];
const base = 'https://docs.test/guides/start/';
const WORDS = 'leaves this site';

test('LKD-31: each external anchor gets data-external="true"; what is external is isExternal()\'s answer for the one site option', () => {
  const anchors = {
    external: a('https://elsewhere.test/page'),
    otherScheme: a('http://docs.test/'),
    path: a('/guides/'),
    relative: a('../install'),
    fragment: a('#install'),
    own: a('https://docs.test/guides/'),
    declared: a('https://example.test/about'),
    mail: a('mailto:hello@elsewhere.test'),
    phone: a('tel:+15550100'),
    download: a('https://elsewhere.test/file.zip', { download: '' }),
    noHref: el('a', { name: 'anchor' }, [text('x')]),
  };
  const tree = { type: 'root', children: [el('p', {}, Object.values(anchors)), el('section', {}, [el('ul', {}, [el('li', {}, [a('https://deep.test/')])])])] };
  const returned = markExternalLinks(tree, { site, base });
  assert.equal(returned, tree, 'the tree it was given');
  const marked = Object.entries(anchors).filter(([, anchor]) => anchor.properties['data-external'] === 'true').map(([name]) => name);
  assert.deepEqual(marked, ['external', 'otherScheme']);
  assert.equal(tree.children[1].children[0].children[0].children[0].properties['data-external'], 'true', 'however deep');
  for (const [name, anchor] of Object.entries(anchors)) {
    assert.equal(anchor.properties['data-external'] === 'true', api.isExternal(anchor.properties.href ?? '', { base, site, download: 'download' in anchor.properties }), name);
  }
});

test('LKD-31: the description is written where the anchor has none', () => {
  const plain = a('https://elsewhere.test/');
  const described = a('https://elsewhere.test/', { 'aria-description': 'opens the vendor\'s site' });
  const treeNamed = a('https://elsewhere.test/', { ariaDescription: 'in the tree\'s own spelling' });
  const pointed = a('https://elsewhere.test/', { 'aria-describedby': 'note' });
  const empty = a('https://elsewhere.test/', { 'aria-description': '  ' });
  const internal = a('/guides/');
  markExternalLinks({ type: 'root', children: [plain, described, treeNamed, pointed, empty, internal] }, { site, base, description: WORDS });
  assert.equal(plain.properties['aria-description'], WORDS);
  assert.equal(described.properties['aria-description'], 'opens the vendor\'s site');
  assert.equal(treeNamed.properties['aria-description'], undefined);
  assert.equal(pointed.properties['aria-description'], undefined);
  assert.equal(empty.properties['aria-description'], WORDS);
  assert.equal(internal.properties['aria-description'], undefined);
  const unworded = a('https://elsewhere.test/');
  markExternalLinks(unworded, { site, base });
  assert.deepEqual(unworded.properties, { href: 'https://elsewhere.test/', 'data-external': 'true' }, 'without words in the options, none are written');
});

test('LKD-31: where an icon is recorded for the origin, an img is the anchor\'s first child — the class, an empty alt, its size, lazy, async, no referrer', () => {
  const icons = { 'https://elsewhere.test': { src: '/pictures/0123456789abcdef0123456789abcdef.png', width: 32, height: 32 } };
  const withIcon = a('https://elsewhere.test/deep/page?x=1#y', {}, [text('Elsewhere'), el('em', {}, [text('!')])]);
  const noIcon = a('https://unknown.test/');
  const internal = a('https://docs.test/');
  markExternalLinks({ type: 'root', children: [withIcon, noIcon, internal] }, { site, base, icons });
  assert.deepEqual(withIcon.children[0], {
    type: 'element',
    tagName: 'img',
    properties: { class: 'tanrei-link-site-icon', src: '/pictures/0123456789abcdef0123456789abcdef.png', alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer', width: 32, height: 32 },
    children: [],
  });
  assert.equal(withIcon.children.length, 3);
  assert.equal(withIcon.children[1].value, 'Elsewhere');
  assert.deepEqual(noIcon.children.map((child) => child.type), ['text'], 'no icon recorded: the arrow alone');
  assert.deepEqual(internal.children.map((child) => child.type), ['text']);
  // Marked again, nothing is added a second time.
  delete withIcon.properties['data-external'];
  markExternalLinks(withIcon, { site, base, icons });
  assert.equal(withIcon.children.filter((child) => child.tagName === 'img').length, 1);
  const inherited = a('https://constructor.test/');
  markExternalLinks(inherited, { site, base, icons: { toString: { src: '/x.png', width: 1, height: 1 } } });
  assert.deepEqual(inherited.children.map((child) => child.type), ['text']);
});

test('LKD-31: an anchor that already carries data-external is left as it is', () => {
  const icons = { 'https://elsewhere.test': { src: '/i.png', width: 32, height: 32 } };
  for (const carried of [{ 'data-external': 'false' }, { 'data-external': 'true' }, { 'data-external': '' }, { dataExternal: 'false' }]) {
    const anchor = a('https://elsewhere.test/', carried);
    const before = JSON.stringify(anchor);
    markExternalLinks(anchor, { site, base, icons, description: WORDS });
    assert.equal(JSON.stringify(anchor), before, JSON.stringify(carried));
  }
});

test('LKD-31: it parses nothing — text that looks like markup stays text, and markup itself is not taken', () => {
  const tree = { type: 'root', children: [text('<a href="https://elsewhere.test/">not an element</a>'), { type: 'raw', value: '<a href="https://elsewhere.test/">raw</a>' }, el('code', {}, [text('<a href="https://elsewhere.test/">')])] };
  const before = JSON.stringify(tree);
  markExternalLinks(tree, { site, base });
  assert.equal(JSON.stringify(tree), before);
  assert.throws(() => markExternalLinks('<p><a href="https://elsewhere.test/">x</a></p>', { site, base }), /parses nothing/);
  for (const bad of [[null, { site }], [{}, null], [{}, {}], [{}, { site: [] }], [{}, { site, base: 7 }], [{}, { site, description: 7 }], [{}, { site, icons: null }], [{}, { site, mode: 'update' }], [{}, { site, lock: 'x' }]]) assert.throws(() => markExternalLinks(...bad), TypeError);
  assert.doesNotMatch(fs.readFileSync(path.join(source, 'mark.js'), 'utf8'), /innerHTML|DOMParser|<\s*a\b[^>]*>/);
});

test('LKD-31: it opens no connection and writes no file', () => {
  const imports = [...fs.readFileSync(path.join(source, 'mark.js'), 'utf8').matchAll(/^import .* from '([^']+)';$/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ['../index.js'], 'the pure rule is all it imports: no file system, no network, not the fetcher');
  const tree = { type: 'root', children: [a('https://elsewhere.test/')] };
  const result = markExternalLinks(tree, { site, base });
  assert.equal(typeof result.then, 'undefined', 'it answers at once: there is nothing to wait for');
});

test('LKD-31: without the page\'s address a path is not read, and an absolute address still is', () => {
  const absolute = a('https://elsewhere.test/');
  const pathOnly = a('/guides/');
  markExternalLinks({ type: 'root', children: [absolute, pathOnly] }, { site });
  assert.equal(absolute.properties['data-external'], 'true');
  assert.equal(pathOnly.properties['data-external'], undefined);
});

test('the platform was asked to resolve no name', () => assert.deepEqual(asked, []));
