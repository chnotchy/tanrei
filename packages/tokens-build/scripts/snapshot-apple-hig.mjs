// Reads the figures Apple publishes in its Human Interface Guidelines into a flat JSON snapshot: the reference
// `cupertino` is measured against. The guidelines are served as DocC render JSON next to each page; download the
// pages this reads into one directory, then run this on it:
//
//   for p in accessibility color typography; do
//     curl -sSo <dir>/$p.json https://developer.apple.com/tutorials/data/design/human-interface-guidelines/$p.json
//   done
//   node packages/tokens-build/scripts/snapshot-apple-hig.mjs <dir> <date read, YYYY-MM-DD> > tokens/fidelity/reference/apple-hig.json
//
// What it takes, and only that: the control sizes of the Accessibility page (iOS and iPadOS, macOS), the iOS and
// iPadOS text styles at the default Dynamic Type size (Large) with the SF Pro tracking at each style's size, and the
// system colors and iOS system grays in the default light and dark appearances. Figures only — no text, no images.
import fs from 'node:fs';
import path from 'node:path';

const [dir, read] = process.argv.slice(2);
if (!dir || !/^\d{4}-\d{2}-\d{2}$/.test(read ?? '')) throw new Error('usage: snapshot-apple-hig.mjs <dir> <YYYY-MM-DD the pages were read>');
const PAGES = ['accessibility', 'color', 'typography'];
const BASE = 'https://developer.apple.com/design/human-interface-guidelines/';
const DATA = 'https://developer.apple.com/tutorials/data/design/human-interface-guidelines/';
const docs = Object.fromEntries(PAGES.map((page) => [page, JSON.parse(fs.readFileSync(path.join(dir, `${page}.json`), 'utf8'))]));

const text = (node) => (Array.isArray(node) ? node.map(text).join('') : node == null ? '' : typeof node === 'string' ? node : node.type === 'text' ? node.text : node.inlineContent ? text(node.inlineContent) : node.content ? text(node.content) : '');
/** Every table of a page, with the headings above it, level by level. */
function tables(doc) {
  const found = [];
  const headings = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (node.type === 'heading') { headings.length = node.level; headings[node.level - 1] = node.text; }
    if (node.type === 'table') found.push({ headings: headings.filter(Boolean), rows: node.rows });
    for (const [key, value] of Object.entries(node)) if (key !== 'rows') walk(value);
  };
  walk(doc.primaryContentSections);
  return found;
}
function table(page, ...path) {
  const matches = tables(docs[page]).filter((t) => path.every((h) => t.headings.includes(h)));
  if (matches.length !== 1) throw new Error(`${page}: expected one table under ${path.join(' › ')}, found ${matches.length}`);
  return matches[0].rows;
}
/** A cell's text, or the alt text of the image it shows (the color swatches carry their RGB values there). */
function cell(page, value) {
  const image = JSON.stringify(value).match(/"identifier":"([^"]+)","type":"image"/)?.[1];
  return image ? docs[page].references[image]?.alt ?? '' : text(value).trim();
}
const rowsOf = (page, rows) => rows.slice(1).map((row) => row.map((value) => cell(page, value)));
const slug = (name) => name.toLowerCase().replace(/[()]/g, '').trim().replace(/\s+/g, '-');

const tokens = {};

// Accessibility › Mobility: default and minimum control sizes. The iOS row is shared with iPadOS.
const PLATFORMS = { 'iOS, iPadOS': 'ios', macOS: 'macos' };
for (const [platform, size, minimum] of rowsOf('accessibility', table('accessibility', 'Mobility'))) {
  if (!PLATFORMS[platform]) continue;
  for (const [field, raw] of [['default', size], ['minimum', minimum]]) {
    const m = /^(\d+)x(\d+) pt$/.exec(raw);
    if (!m || m[1] !== m[2]) throw new Error(`accessibility: unexpected control size "${raw}"`);
    tokens[`apple.target.${PLATFORMS[platform]}.${field}`] = `${m[1]}pt`;
  }
}

// Typography › iOS, iPadOS Dynamic Type sizes › Large (default), with SF Pro's tracking at each size.
const WEIGHTS = { Ultralight: 100, Thin: 200, Light: 300, Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Heavy: 800, Black: 900 };
const tracking = new Map(rowsOf('typography', table('typography', 'Tracking values', 'SF Pro')).map(([size, , points]) => [Number(size), Number(points)]));
for (const [style, weight, size, leading, emphasized] of rowsOf('typography', table('typography', 'iOS, iPadOS Dynamic Type sizes', 'Large (default)'))) {
  const role = `apple.typescale.${slug(style)}`;
  if (!(weight in WEIGHTS) || !(emphasized in WEIGHTS)) throw new Error(`typography: unknown weight in "${style}"`);
  if (!tracking.has(Number(size))) throw new Error(`typography: no SF Pro tracking for ${size} pt`);
  tokens[`${role}-size`] = `${Number(size)}pt`;
  tokens[`${role}-line-height`] = `${Number(leading)}pt`;
  tokens[`${role}-weight`] = WEIGHTS[weight];
  tokens[`${role}-emphasized-weight`] = WEIGHTS[emphasized];
  tokens[`${role}-tracking`] = `${tracking.get(Number(size))}pt`;
}

// Color › System colors, and the iOS system grays: the default light and dark appearances.
const hex = (alt) => {
  const m = /^R-(\d+),G-(\d+),B-(\d+)$/.exec(alt);
  if (!m) throw new Error(`color: unexpected swatch "${alt}"`);
  return `#${m.slice(1).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
};
for (const heading of ['System colors', 'iOS, iPadOS system gray colors']) {
  for (const [name, , light, dark] of rowsOf('color', table('color', heading))) tokens[`apple.color.${slug(name)}`] = { light: hex(light), dark: hex(dark) };
}

process.stdout.write(`${JSON.stringify({
  $comment: 'GENERATED by packages/tokens-build/scripts/snapshot-apple-hig.mjs from the render data of Apple\'s Human Interface Guidelines. Published figures only (sizes in points, weights, sRGB values); no text and no images. Do not edit.',
  reference: {
    name: 'Apple Human Interface Guidelines',
    source: BASE,
    version: `read ${read}`,
    license: 'Copyright Apple Inc. The figures are recorded as published facts, to measure an independent approximation against; Tanrei is not affiliated with, endorsed by, or sponsored by Apple Inc.',
    description: 'iOS and iPadOS (macOS for the pointer target): control sizes, the text styles at the default Dynamic Type size, the system colors and grays in the default appearances.',
    pages: PAGES.map((page) => ({ url: `${BASE}${page}`, data: `${DATA}${page}.json`, changed: docs[page].metadata?.customMetadata?.['alert-date'] ?? null })),
  },
  tokens: Object.fromEntries(Object.entries(tokens).sort(([a], [b]) => (a < b ? -1 : 1))),
}, null, 2)}\n`);
