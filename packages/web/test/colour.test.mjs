// The colours `expectNoFlicker` (test/frames.ts) compares are read into one space, sRGB, whatever space the engine
// serializes them in (test/colour.js): a fade WebKit draws in `oklab()` rests on an `rgb()` end value, and its last
// frame is then a small step, not a jump across the range.
import assert from 'node:assert/strict';
import test from 'node:test';
import { premultiplied, srgb } from './colour.js';

/** Each channel within `tolerance` of the one expected. */
const near = (actual, expected, tolerance = 0.002) => {
  assert.ok(actual, `read: ${JSON.stringify(expected)}`);
  assert.equal(actual.length, expected.length);
  actual.forEach((channel, i) => assert.ok(Math.abs(channel - expected[i]) <= tolerance, `channel ${i}: ${actual.join(', ')} against ${expected.join(', ')}`));
};

test('rgb() and color(srgb) are read as they are written', () => {
  near(srgb('rgb(255, 0, 0)'), [1, 0, 0, 1]);
  near(srgb('rgba(0, 0, 255, 0.5)'), [0, 0, 1, 0.5]);
  near(srgb('color(srgb 0.25 0.5 0.75 / 0.2)'), [0.25, 0.5, 0.75, 0.2]);
});

test('every other space an engine serializes a colour in is turned into sRGB: the same red in each', () => {
  // sRGB red, as CSS Color 4 converts it into each space.
  for (const red of [
    'oklab(0.627955 0.224863 0.125846)',
    'oklch(0.627955 0.257683 29.2339)',
    'lab(54.2905 80.8049 69.891)',
    'lch(54.2905 106.839 40.8526)',
    'color(display-p3 0.917488 0.200287 0.138561)',
    'color(srgb-linear 1 0 0)',
  ])
    near(srgb(red), [1, 0, 0, 1]);
  near(srgb('oklab(1 0 0)'), [1, 1, 1, 1]);
  near(srgb('oklab(0 0 0)'), [0, 0, 0, 1]);
  near(srgb('color(srgb-linear 0.214041 0.214041 0.214041)'), [0.5, 0.5, 0.5, 1]);
  // `none` is 0, an angle may carry its unit, a percentage stands for its reference range.
  near(srgb('oklch(1 none none)'), [1, 1, 1, 1]);
  near(srgb('oklch(0.627955 0.257683 29.2339deg)'), [1, 0, 0, 1]);
  near(srgb('oklab(62.7955% 56.2158% 31.4615%)'), [1, 0, 0, 1]);
});

test('premultiplied(): sRGB channels times alpha, then alpha; a fade to transparent goes to 0', () => {
  near(premultiplied('oklab(0.627955 0.224863 0.125846 / 0.5)'), [0.5, 0, 0, 0.5]);
  near(premultiplied('rgba(0, 0, 0, 0)'), [0, 0, 0, 0]);
  near(premultiplied('transparent'), [0, 0, 0, 0]);
});

test('an oklab() frame at the end of a fade is its rgb() end value, not across the range from it', () => {
  // The case WebKit drew: a state layer fading in under m3-like, its frames in oklab(), its end value in rgb(). Read as
  // written, L/a/b against r/g/b, the last frame was a step of most of the way (0.50 against 0.40 on the first
  // channel, and -0.12 against 0.64 on the last).
  const end = premultiplied('rgb(103, 80, 164)');
  near(premultiplied('oklab(0.495521 0.052456 -0.119446)'), end);
  near(premultiplied('oklab(0.495521 0.052456 -0.119446 / 0.12)'), end.map((channel, i) => (i < 3 ? channel * 0.12 : 0.12)));
});

test('a form that is not read is null', () => {
  for (const value of ['currentcolor', 'color(xyz 0 0 0)', 'color(a98-rgb 1 0 0)', 'rgb(1 2)', 'oklab(a b c)', 'hwb(0 0% 0%)']) assert.equal(srgb(value), null, value);
  assert.equal(premultiplied('currentcolor'), null);
});
