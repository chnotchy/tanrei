// The edges a baseline comparison checks besides its pixel count and its drawn box (test/drawn-edges.js,
// test/baseline.ts): what counts as an edge, how far one may move, how many must move together to be a change.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { boxMove, drawnBox } from './drawn-box.js';
import { EDGE, EDGE_CHANGE, EDGE_FAINT, EDGE_REACH, describeEdgeMoves, edgeLevels, edgeMoves } from './drawn-edges.js';
import { decodePng } from './png.ts';

/** A picture of `width` × `height` filled with `surface`, with each rectangle `[left, top, right, bottom, rgba]` painted on it in turn. */
function picture(width, height, surface, rectangles = []) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(surface, i * 4);
  for (const [left, top, right, bottom, colour] of rectangles)
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) data.set(colour, (y * width + x) * 4);
  return { width, height, data };
}

const PAGE = [254, 247, 255, 255];
const WHITE = [255, 255, 255, 255];
const BORDER = [224, 224, 224, 255];
const INK = [28, 27, 31, 255];

/** A list in a bordered box of fixed size (a select's open list), its rows `step` device px apart from `first`: each row a label of three words. */
function list(step, first = 40, rows = 8) {
  const rectangles = [[30, 20, 593, 760, BORDER], [32, 22, 591, 758, WHITE]];
  for (let row = 0; row < rows; row++) {
    const top = first + row * step;
    if (top + 24 > 756) break;
    rectangles.push([64, top, 100, top + 24, INK], [110, top + 6, 160, top + 24, INK], [170, top, 190 + row * 6, top + 24, INK]);
    // the counters of the letters: a word is not one block of ink
    for (let x = 68; x < 96; x += 8) rectangles.push([x, top + 6, x + 3, top + 18, WHITE]);
  }
  return picture(624, 944, PAGE, rectangles);
}

test('an edge is a step of more than EDGE between neighbours; the other picture keeps it while its step is over EDGE_FAINT', () => {
  const levels = edgeLevels(picture(4, 1, WHITE, [[2, 0, 3, 0, [255 - EDGE - 1, 255, 255, 255]]]));
  assert.deepEqual([...levels], [0, EDGE + 1, 0, 0]);
  assert.ok(EDGE_FAINT < EDGE);
});

// The case the pixel count and the drawn box both missed: a select's list keeps its box (its maximum height, and it
// scrolls), and its rows moved from 48 to 40 CSS px apart (96 to 80 device px).
test('rows that moved inside a box that kept its size are a change, though the box did not move', () => {
  const [before, after] = [list(96), list(80)];
  assert.equal(boxMove(drawnBox(after), drawnBox(before)), 0);
  const { moved } = edgeMoves(after, before);
  assert.ok(moved.length > 0 && moved[0].pixels >= EDGE_CHANGE, `the largest change moved ${moved[0]?.pixels} edge pixels`);
});

test('a control that grew by one CSS px (two device px) inside a larger picture is a change', () => {
  const button = (grow) => picture(800, 400, WHITE, [[600 - grow, 40 - grow, 680 + grow, 120 + grow, BORDER], [602 - grow, 42 - grow, 678 + grow, 118 + grow, WHITE], [630, 76, 650, 84, INK], [40, 200, 500, 360, INK]]);
  assert.ok(edgeMoves(button(2), button(0)).moved.length > 0);
});

test('the same picture, or one shifted by EDGE_REACH device px, moved no edge', () => {
  assert.deepEqual(edgeMoves(list(80), list(80)).moved, []);
  assert.equal(EDGE_REACH, 1);
  assert.deepEqual(edgeMoves(list(80, 41), list(80, 40)).moved, []);
});

test('a change of colour that keeps every edge in place is left to the pixel count', () => {
  const tinted = list(80);
  for (let i = 0; i < tinted.data.length; i += 4) if (tinted.data[i] === 28) tinted.data.set([60, 40, 120, 255], i);
  assert.deepEqual(edgeMoves(tinted, list(80)).moved, []);
});

test('an edge drawn near EDGE in both pictures, over it in one, has not moved', () => {
  const step = (level) => picture(200, 100, WHITE, [[50, 20, 150, 80, [255 - level, 255 - level, 255 - level, 255]]]);
  assert.deepEqual(edgeMoves(step(EDGE + 2), step(EDGE - 2)).moved, []);
});

test('scattered single pixels of antialiasing, each rounded to the other side, are not a change', () => {
  const [a, b] = [list(80), list(80)];
  // a stem's edge rounded one pixel further in a dozen places, far apart
  for (let k = 0; k < 12; k++) {
    const i = ((60 + k * 50) * 624 + 102) * 4;
    b.data.set(INK, i);
    b.data.set(INK, i + 4);
  }
  assert.deepEqual(edgeMoves(a, b).moved, []);
});

// Two pairs of pictures the CI container drew (test/drawn-edges/). A combobox's open list, scrolled to its chosen
// option, at rows 48 CSS px apart (its stale baseline) and 40 (what the page draws at the control height): the same
// box, under 1 % of the pixels beyond the colour threshold. And an accordion's Arabic label as Chromium on arm64 Linux
// draws it and its baseline, drawn on x86_64: the same layout, but for a few glyph edges rounded to the other pixel.
const drawn = (name) => decodePng(fs.readFileSync(new URL(`./drawn-edges/${name}.png`, import.meta.url)));

test('the stale list whose rows moved inside its box is a change; a few glyph edges rounded to the other pixel are not', () => {
  const [stale, now] = [drawn('rows-48'), drawn('rows-40')];
  assert.ok(boxMove(drawnBox(now), drawnBox(stale)) <= 1, 'the drawn box alone passes it');
  const { moved } = edgeMoves(now, stale);
  assert.ok(moved[0].pixels > 10 * EDGE_CHANGE, `the largest change moved ${moved[0].pixels} edge pixels`);
  assert.match(describeEdgeMoves(moved), /^\d+ changes in \d+,\d+ – \d+,\d+ \(device px\); the largest: \d+ edge px drawn only/);

  const [arm, x86] = [drawn('arabic-arm64'), drawn('arabic-x86_64')];
  const { added, lost, moved: none } = edgeMoves(arm, x86);
  assert.ok(added.length + lost.length > 0, 'the two builds round some glyph edges apart');
  assert.deepEqual(none, []);
});
