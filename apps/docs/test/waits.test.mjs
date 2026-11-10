// The words the browser tests' failures are written in (test/browser/waits.mjs), without a browser: the outstanding
// requests, as a timed-out test and a lost `goto` print them.
//
//   node --test test/waits.test.mjs
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { describeRequests } from './browser/waits.mjs';

describe('describeRequests', () => {
  test('each request not ended, by type, address, age and whether its response came', () => {
    const now = 100_000;
    assert.equal(
      describeRequests(
        [
          { type: 'script', url: 'http://127.0.0.1:1/_astro/a.js', started: now - 10_200 },
          { type: 'font', url: 'http://127.0.0.1:1/_astro/b.woff2', started: now - 500, answered: 200 },
        ],
        now,
      ),
      'script http://127.0.0.1:1/_astro/a.js, asked 10.2 s ago, no response; font http://127.0.0.1:1/_astro/b.woff2, asked 0.5 s ago, response 200, body not ended',
    );
  });

  test('says when nothing is outstanding', () => {
    assert.equal(describeRequests([], 0), 'no request');
  });
});
