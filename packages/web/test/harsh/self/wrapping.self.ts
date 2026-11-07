// Harsh mode's guard on its wrapping of Playwright's client classes: a method it names that Playwright no longer has, or
// an input action it does not name, fails the run instead of running with no gap. test/harsh-self.test.mjs runs these.
import { expect, test } from '@playwright/test';
import { harsh } from '../../harsh.js';
import { gapAround } from '../playwright-test.js';

test('check: the guard refuses a method it names that the class does not have', () => {
  test.skip(!harsh, 'harsh mode only: with it off, nothing is wrapped');
  const renamed = { click: async () => {}, tapAt: async () => {} };
  expect(() => gapAround(renamed, ['click', 'tap'], 'Thing')).toThrow(/harsh mode found nothing to wrap for Thing\.tap\(\): has Playwright renamed or moved it\?/);
});

test('check: the guard refuses an input action it does not name, in a class of input actions', () => {
  test.skip(!harsh, 'harsh mode only: with it off, nothing is wrapped');
  class Pointer {
    async down() {}
    async up() {}
    async drag() {}
  }
  expect(() => gapAround(Pointer.prototype as unknown as Record<string, unknown>, ['down', 'up'], 'Pointer', true)).toThrow(/harsh mode does not wrap Pointer\.drag\(\): a new input action\?/);
});

test('check: the guard wraps what it names, and the action waits the gaps', async () => {
  test.skip(!harsh, 'harsh mode only: with it off, nothing is wrapped');
  class Pointer {
    async down() {
      return 'down';
    }
  }
  gapAround(Pointer.prototype as unknown as Record<string, unknown>, ['down'], 'Pointer', true);
  const start = Date.now();
  expect(await new Pointer().down()).toBe('down');
  expect(Date.now() - start).toBeGreaterThanOrEqual(harsh!.before + harsh!.after - 5);
});
