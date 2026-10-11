// The keyboard model of the operation tabs (an ARIA tablist) and of the ordered font-stack list.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moveItem, tabTarget } from '../src/keys.js';

test('tablist: arrows move and wrap, Home and End jump, other keys are left alone', () => {
  assert.equal(tabTarget('ArrowRight', 0, 4), 1);
  assert.equal(tabTarget('ArrowRight', 3, 4), 0, 'wraps to the first tab');
  assert.equal(tabTarget('ArrowLeft', 0, 4), 3, 'wraps to the last tab');
  assert.equal(tabTarget('ArrowLeft', 2, 4), 1);
  assert.equal(tabTarget('ArrowDown', 1, 4), 2);
  assert.equal(tabTarget('ArrowUp', 1, 4), 0);
  assert.equal(tabTarget('Home', 2, 4), 0);
  assert.equal(tabTarget('End', 1, 4), 3);
  for (const key of ['Tab', 'Enter', ' ', 'a', 'Escape', 'PageDown']) assert.equal(tabTarget(key, 1, 4), null, `${key} is not the tablist's`);
  assert.equal(tabTarget('ArrowRight', 0, 1), 0, 'one tab: stays');
  assert.equal(tabTarget('ArrowRight', 0, 0), null);
  // Right-to-left: the visual direction of Left and Right swaps; Up and Down do not.
  assert.equal(tabTarget('ArrowRight', 1, 4, { rtl: true }), 0);
  assert.equal(tabTarget('ArrowLeft', 1, 4, { rtl: true }), 2);
  assert.equal(tabTarget('ArrowDown', 1, 4, { rtl: true }), 2);
});

test('an ordered list: one place up or down, never out of the list', () => {
  const families = ['Inter', 'Noto Sans JP', 'Noto Sans'];
  assert.deepEqual(moveItem(families, 1, -1), ['Noto Sans JP', 'Inter', 'Noto Sans']);
  assert.deepEqual(moveItem(families, 1, 1), ['Inter', 'Noto Sans', 'Noto Sans JP']);
  assert.equal(moveItem(families, 0, -1), families, 'the first stays first');
  assert.equal(moveItem(families, 2, 1), families);
  assert.equal(moveItem(families, 5, -1), families);
  assert.deepEqual(families, ['Inter', 'Noto Sans JP', 'Noto Sans'], 'the input is not mutated');
});
