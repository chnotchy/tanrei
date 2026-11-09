// The drawn box a baseline comparison checks besides its pixel count (test/drawn-box.js, test/baseline.ts): what counts
// as drawn, how far a box may move, and that every baseline comparison checks it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { BOX_TOLERANCE, INK, boxMove, drawnBox, surfaceOf } from './drawn-box.js';

const root = fileURLToPath(new URL('..', import.meta.url));

/** A picture of `width` × `height` filled with `surface`, with each rectangle `[left, top, right, bottom, rgba]` painted on it. */
function picture(width, height, surface, rectangles = []) {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(surface, i * 4);
  for (const [left, top, right, bottom, colour] of rectangles)
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) data.set(colour, (y * width + x) * 4);
  return { width, height, data };
}

const WHITE = [255, 255, 255, 255];
const SHADOW = [255 - INK - 3, 255 - INK - 3, 255 - INK - 2, 255];

test('the surface is the colour most of the border has', () => {
  assert.deepEqual(surfaceOf(picture(20, 10, WHITE, [[0, 0, 4, 0, [0, 0, 0, 255]]])), WHITE);
  assert.deepEqual(surfaceOf(picture(20, 10, [254, 247, 255, 255])), [254, 247, 255, 255]);
});

test('a pale shadow on a white surface is drawn; a level or two of a scrim’s edge is not', () => {
  assert.deepEqual(drawnBox(picture(40, 20, WHITE, [[10, 5, 29, 14, SHADOW]])), { left: 10, top: 5, right: 29, bottom: 14 });
  assert.equal(drawnBox(picture(40, 20, WHITE, [[10, 5, 29, 14, [255 - INK, 255 - INK, 255 - INK, 255]]])), null);
  assert.equal(drawnBox(picture(40, 20, WHITE)), null);
});

// The case the pixel count missed: a white floating toolbar, drawn by its shadow alone on a white surface, 28 device
// px larger on every side (720 × 192 device px; its baseline passed with under 1 % of the pixels beyond the colour
// threshold).
test('a white toolbar that grew on a white surface moves its drawn box past the tolerance', () => {
  const before = drawnBox(picture(720, 192, WHITE, [[178, 46, 541, 153, SHADOW]]));
  const after = drawnBox(picture(720, 192, WHITE, [[150, 30, 569, 169, SHADOW]]));
  assert.equal(boxMove(after, before), 28);
  assert.ok(boxMove(after, before) > BOX_TOLERANCE);
});

test('one device pixel of antialiasing is within the tolerance; one CSS pixel (two device pixels) is not', () => {
  const box = { left: 32, top: 92, right: 229, bottom: 163 };
  assert.equal(boxMove({ ...box, left: 31 }, box), 1);
  assert.ok(boxMove({ ...box, left: 31 }, box) <= BOX_TOLERANCE);
  assert.ok(boxMove({ ...box, top: 94 }, box) > BOX_TOLERANCE);
  assert.equal(boxMove(null, null), 0);
  assert.equal(boxMove(box, null), Infinity);
});

test('every baseline comparison checks the drawn box too: no test calls toHaveScreenshot but test/baseline.ts', () => {
  const callers = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(ts|js|mjs)$/.test(entry.name) && /\.toHaveScreenshot\(/.test(fs.readFileSync(file, 'utf8'))) callers.push(path.relative(root, file).split(path.sep).join('/'));
    }
  };
  walk(path.join(root, 'src'));
  walk(path.join(root, 'test'));
  assert.deepEqual(callers, ['test/baseline.ts'], 'compare with expectBaseline() from test/baseline.ts');
});
