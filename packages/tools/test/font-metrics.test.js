// The fallback faces our sites draw text in until a web font arrives (src/font-metrics.js): the metrics are read from
// the fonts' own tables, and the overrides are the ones Next.js, Fontaine and Capsize compute from the same numbers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fontFacesCss, metricFallbacks, packageFaces, parseUnicodeRange, withFallbacks } from '../src/font-faces.js';
import { FALLBACKS, JAPANESE_WEIGHTS, LATIN_WEIGHTS, METRIC_FALLBACKS, averageAdvance, overrides, percent, readMetrics } from '../src/font-metrics.js';
import { sfnt } from '../src/icon-font.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const docs = path.join(repo, 'apps/docs'); // depends on every family of the default stacks
const fileOf = (family, subset) => packageFaces(family, docs).find((face) => face.subset === subset).file;
const metricsOf = async (family, subset, text = '') => readMetrics(await sfnt(fs.readFileSync(fileOf(family, subset))), text);

test('the tables are read as the fonts write them: the em, the line metrics a browser uses, the advances', async () => {
  // The same numbers Capsize's metrics collection publishes for these families (from hhea). Inter asks for its
  // typographic metrics (USE_TYPO_METRICS), which are the same.
  const inter = await metricsOf('Inter', 'latin', 'a m');
  assert.deepEqual({ ...inter, advances: undefined }, { unitsPerEm: 2048, ascent: 1984, descent: -494, lineGap: 0, useTypoMetrics: true, advances: undefined });
  assert.ok(inter.advances.m > inter.advances.a && inter.advances.a > inter.advances[' '], JSON.stringify(inter.advances));
  const mono = await metricsOf('Roboto Mono', 'latin', 'il mW');
  assert.deepEqual([mono.unitsPerEm, mono.ascent, mono.descent, mono.lineGap], [2048, 2146, -555, 0]);
  assert.deepEqual(new Set(Object.values(mono.advances)), new Set([1229]), 'every character 0.6 em, as Courier New');
  // A family split by Unicode range: kana are in a numbered file, with the same line metrics as every other.
  const kana = packageFaces('Noto Sans JP', docs).find((face) => face.ranges.some(([first, last]) => first <= 0x3042 && 0x3042 <= last));
  const jp = readMetrics(await sfnt(fs.readFileSync(kana.file)), 'あい');
  assert.deepEqual([jp.unitsPerEm, jp.ascent, jp.descent, jp.lineGap], [1000, 1160, -288, 0]);
  assert.deepEqual(jp.advances, { あ: 1000, い: 1000 }, 'a full em, as every Japanese face');
  assert.deepEqual(readMetrics(await sfnt(fs.readFileSync(kana.file)), 'Q€').advances, {}, 'a character the file does not hold has no advance');
});

test('the overrides are Capsize’s and Next.js’s formula: Inter over Arial, from the numbers they publish', () => {
  // Capsize's metrics collection: Inter's average width 978, Arial's 913, both in 2048 units. Next.js writes this face for
  // Inter: size-adjust 107.12%, ascent-override 90.44%, descent-override 22.52%, line-gap-override 0%.
  const face = overrides({ unitsPerEm: 2048, ascent: 1984, descent: -494, lineGap: 0, average: 978 / 2048 }, 913 / 2048);
  assert.deepEqual(Object.fromEntries(Object.entries(face).map(([key, value]) => [key, `${(value * 100).toFixed(2)}%`])), { sizeAdjust: '107.12%', ascentOverride: '90.44%', descentOverride: '22.52%', lineGapOverride: '0.00%' });
  // A fallback as wide as the font changes nothing but the line metrics, which are then the font's own.
  const same = overrides({ unitsPerEm: 1000, ascent: 1160, descent: -288, lineGap: 0, average: 1 }, 1);
  assert.deepEqual(Object.values(same).map(percent), ['100%', '116%', '28.8%', '0%']);
  // The average is weighted, over the characters the font holds.
  assert.equal(averageAdvance({ unitsPerEm: 100, advances: { a: 50, b: 100 } }, { a: 3, b: 1, c: 6 }), 0.625);
});

test('the fallbacks’ advances are their faces’ own: Arial’s are Helvetica’s, Courier New’s 0.6 em, a Japanese face’s a full em', async (t) => {
  // Helvetica's widths (its AFM, in 1000 units), which Arial was drawn to, at Arial's 2048.
  const helvetica = { ' ': 278, a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500 };
  for (const [ch, width] of Object.entries(helvetica)) assert.equal(FALLBACKS.sans.advances[ch], Math.round((width * 2048) / 1000), ch);
  assert.ok(Math.abs(averageAdvance(FALLBACKS.mono, LATIN_WEIGHTS) - 1229 / 2048) < 1e-12);
  assert.ok(Math.abs(averageAdvance(FALLBACKS.cjk, JAPANESE_WEIGHTS) - 1) < 1e-12);
  for (const kind of Object.values(FALLBACKS)) assert.deepEqual(Object.keys(kind.advances).sort(), Object.keys(kind.weights).sort());
  // Where the platform's file is at hand (macOS), it is read and agrees.
  const arial = '/System/Library/Fonts/Supplemental/Arial.ttf';
  if (!fs.existsSync(arial)) return t.skip('Arial is not installed here');
  const own = readMetrics(new Uint8Array(fs.readFileSync(arial)), Object.keys(LATIN_WEIGHTS).join(''));
  assert.deepEqual(own.advances, FALLBACKS.sans.advances);
});

test('each family of the default stacks has its fallback face, computed from the files the sites register', async () => {
  const fallbacks = await metricFallbacks(docs);
  assert.deepEqual(Object.keys(fallbacks).sort(), Object.keys(METRIC_FALLBACKS).sort());
  const values = (family) => ['sizeAdjust', 'ascentOverride', 'descentOverride', 'lineGapOverride'].map((key) => percent(fallbacks[family][key]));
  // Inter is a little wider than Arial; Roboto Mono as wide as Courier New; Noto Sans JP's kana and kanji as wide as the platform's.
  assert.deepEqual(values('Inter'), ['107.3469%', '90.2448%', '22.4702%', '0%']);
  assert.deepEqual(values('Roboto Mono'), ['100%', '104.7852%', '27.0996%', '0%']);
  assert.deepEqual(values('Noto Sans JP'), ['100%', '116%', '28.8%', '0%']);
  assert.deepEqual(fallbacks.Inter.local, FALLBACKS.sans.local);
  assert.equal(fallbacks.Inter.family, 'Inter Fallback');

  const stacks = { '--x-ref-typeface-plain': ['Inter', 'Noto Sans JP', 'system-ui', 'sans-serif'], '--x-ref-typeface-icon': ['Material Symbols Rounded'] };
  assert.deepEqual(withFallbacks(stacks['--x-ref-typeface-plain'], fallbacks), ['Inter', 'Inter Fallback', 'Noto Sans JP', 'Noto Sans JP Fallback', 'system-ui', 'sans-serif']);
  const css = fontFacesCss(path.join(docs, 'fonts.css'), docs, { families: ['Inter'], subsets: ['latin'], fallbacks: { Inter: (await metricFallbacks(docs, { families: ['Inter'], subsets: ['latin'] })).Inter }, stacks });
  // The stacks are set on the root, outside the tokens' layer, unless the root names another system.
  assert.match(css, /:root:not\(\[data-tanrei-system\]\) \{\n {2}--x-ref-typeface-plain: 'Inter', 'Inter Fallback', 'Noto Sans JP', system-ui, sans-serif;\n\}/);
  assert.ok(!/--x-ref-typeface-icon/.test(css), 'a stack with no fallback is left alone');
  const face = css.match(/@font-face \{\n {2}font-family: 'Inter Fallback';[^}]*\}/)?.[0];
  assert.ok(face, css);
  assert.match(face, /src: local\('Arial'\), local\('ArialMT'\), local\('Liberation Sans'\), local\('LiberationSans'\);/);
  assert.match(face, /size-adjust: 107\.3469%;\n {2}ascent-override: 90\.2448%;\n {2}descent-override: 22\.4702%;\n {2}line-gap-override: 0%;/);
  // It stands in for Inter on the characters of the faces registered (here, Latin's) and on no other.
  const covered = (value) => parseUnicodeRange(value).flatMap(([first, last]) => Array.from({ length: last - first + 1 }, (_, i) => first + i)).sort((a, b) => a - b);
  assert.deepEqual(covered(face.match(/unicode-range: ([^;]+);/)[1]), covered(css.match(/inter-latin-wght-normal[\s\S]*?unicode-range: ([^;]+);/)[1]));
  assert.ok(css.indexOf("font-family: 'Inter Fallback'") > css.lastIndexOf("font-family: 'Inter';"), 'registered after the family');
  // Without fallbacks (the web test harness), nothing of it.
  assert.ok(!/Fallback/.test(fontFacesCss(path.join(docs, 'fonts.css'), docs, { families: ['Inter'], subsets: ['latin'], stacks })));
});
