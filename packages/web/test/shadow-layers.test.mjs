// `shadowLayers()` (src/primitives/arrow.ts) reads a resolved `box-shadow` into the layers the arrow's filter draws.
// It tells a bare `0` length from a 0 inside a word or another number by the character before it, with no lookbehind
// in the pattern. These tests hold it to the lengths the browsers write and to the pattern it replaced, which said the
// same with a lookbehind (`(?<![\w.])0(?![\w.])`): over every value below and a seeded sweep of made-up ones, the two
// read the same layers. Run after the build (`dist/`), by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { shadowLayers } from '../dist/primitives/arrow.js';

/** What `shadowLayers()` did with the lookbehind, kept here as the reference the new pattern must agree with. */
function withLookbehind(value) {
  if (!value || value === 'none') return [];
  const layers = [];
  for (const layer of value.split(/,(?![^(]*\))/)) {
    const color = /[a-z-]+\([^)]*\)|#[0-9a-f]+/i.exec(layer)?.[0] ?? layer.trim().split(/\s+/).find((word) => /^[a-z]+$/i.test(word) && word !== 'inset') ?? '';
    const [x = 0, y = 0, blur = 0, spread = 0] = (layer.replace(color, ' ').match(/-?[\d.]+(?:e-?\d+)?px|(?<![\w.])0(?![\w.])/g) ?? []).map((length) => Number.parseFloat(length));
    const clear = color === 'transparent' || /^[a-z-]+\((?:[^,]+,){3}\s*0(?:\.0+)?%?\s*\)$/i.test(color) || /\/\s*0(?:\.0+)?%?\s*\)$/.test(color);
    if (/\binset\b/.test(layer) || clear || !color || (x === 0 && y === 0 && blur === 0 && spread <= 0)) continue;
    layers.push({ color, x, y, blur, spread });
  }
  return layers;
}

test('the lengths are read from each layer as the browsers write it, a bare 0 among them', () => {
  // Chromium and WebKit write the color first, Firefox last; a 0 may come with its unit or without.
  assert.deepEqual(shadowLayers('rgba(0, 0, 0, 0.3) 0px 1px 2px 0px, rgba(0, 0, 0, 0.15) 0px 1px 3px 1px'), [
    { color: 'rgba(0, 0, 0, 0.3)', x: 0, y: 1, blur: 2, spread: 0 },
    { color: 'rgba(0, 0, 0, 0.15)', x: 0, y: 1, blur: 3, spread: 1 },
  ]);
  assert.deepEqual(shadowLayers('0 2px 6px 2px rgb(0 0 0 / 0.15)'), [{ color: 'rgb(0 0 0 / 0.15)', x: 0, y: 2, blur: 6, spread: 2 }]);
  assert.deepEqual(shadowLayers('0 0 0 1px color(srgb 0.2 0.3 0.4 / 0.5)'), [{ color: 'color(srgb 0.2 0.3 0.4 / 0.5)', x: 0, y: 0, blur: 0, spread: 1 }]);
  assert.deepEqual(shadowLayers('black 0 -1px 0 0'), [{ color: 'black', x: 0, y: -1, blur: 0, spread: 0 }]);
  assert.deepEqual(shadowLayers('#00000026 1.5px 2.5e-1px 4px'), [{ color: '#00000026', x: 1.5, y: 0.25, blur: 4, spread: 0 }]);
});

test('a 0 inside a word or a number is not a length', () => {
  // `x0`, `0.5` and `.0` hold a 0 that the old pattern's lookbehind (or lookahead) refused, and the new one refuses too.
  assert.deepEqual(shadowLayers('rgba(1, 2, 3, 0.4) x0 0.5 .0 1px 2px'), [{ color: 'rgba(1, 2, 3, 0.4)', x: 1, y: 2, blur: 0, spread: 0 }]);
  // The layers that draw nothing are left out: inset, transparent, no alpha, and no offset, blur or spread.
  assert.deepEqual(shadowLayers('inset 0 1px 0 red, transparent 0 4px 8px, rgba(0, 0, 0, 0) 0 4px 8px, color(srgb 0 0 0 / 0) 0 4px, red 0 0 0 0'), []);
  assert.deepEqual(shadowLayers('none'), []);
});

test('it reads every value the same as the pattern with the lookbehind did', () => {
  const corpus = [
    'rgba(0, 0, 0, 0.3) 0px 1px 2px 0px, rgba(0, 0, 0, 0.15) 0px 1px 3px 1px',
    '0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
    'rgb(0 0 0 / 0.2) 0 0 0 1px, rgb(0 0 0 / 0.1) 0 8px 24px -4px',
    'red 0 0 0 0, blue a0 0a .0 0. 0.0 00 -0 1px',
    'oklch(0.5 0.1 200 / 0.3) 0px 0px 0px 0.5px',
  ];
  // A seeded sweep of made-up values from the characters a length, a word and a color are written with.
  let seed = 0x2f6b;
  const random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const alphabet = ['0', '0', '0', '1', '2', '.', '-', 'e', 'p', 'x', 'px', ' ', ' ', 'a', '_', 'red', 'rgba(0, 0, 0, 0.5)', ','];
  for (let i = 0; i < 20000; i++) corpus.push(Array.from({ length: 1 + Math.floor(random() * 16) }, () => alphabet[Math.floor(random() * alphabet.length)]).join(''));
  for (const value of corpus) assert.deepEqual(shadowLayers(value), withLookbehind(value), value);
});
