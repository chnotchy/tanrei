// Harsh mode's longer time for a test: the config's, and one the test or its describe block sets itself, which would
// otherwise put the test back on its unslowed time. test/harsh-self.test.mjs runs these with harsh mode off and on.
import { expect, test } from '@playwright/test';
import { HARSH_TIMEOUT, harsh } from '../../harsh.js';
import { testTypePrototype } from '../playwright-test.js';

/** The time a test that asks for `ms` must get: more in harsh mode. */
const given = (ms: number) => (harsh ? ms * HARSH_TIMEOUT : ms);

test('check: a test that sets no time gets the config’s, multiplied', () => {
  expect(test.info().timeout).toBe(given(30_000));
});

test('check: test.setTimeout() in a test is multiplied', () => {
  test.setTimeout(1_000);
  expect(test.info().timeout).toBe(given(1_000));
});

test('check: test.setTimeout(0) stays no timeout', () => {
  test.setTimeout(0);
  expect(test.info().timeout).toBe(0);
});

test('check: test.slow() triples the multiplied time', () => {
  test.slow();
  expect(test.info().timeout).toBe(given(30_000) * 3);
});

test.describe('a block that sets its time', () => {
  test.setTimeout(2_000);
  test('check: test.setTimeout() in a describe block is multiplied', () => {
    expect(test.info().timeout).toBe(given(2_000));
  });
});

test.describe('a block that configures its time', () => {
  test.describe.configure({ timeout: 3_000 });
  test('check: test.describe.configure({ timeout }) is multiplied', () => {
    expect(test.info().timeout).toBe(given(3_000));
  });
});

const extended = test.extend<{ answer: number }>({ answer: async ({}, use) => use(42) });

extended('check: test.setTimeout() of a test extended from harsh mode’s is multiplied', ({ answer }) => {
  extended.setTimeout(1_500);
  expect(answer).toBe(42);
  expect(test.info().timeout).toBe(given(1_500));
});

test('check: the guard refuses a test with no test type to multiply on', () => {
  expect(() => testTypePrototype(() => {})).toThrow(/harsh mode found nothing to multiply a test's own time on: Playwright's test has no test type/);
  expect(testTypePrototype(test)._setTimeout).toBeInstanceOf(Function);
});
