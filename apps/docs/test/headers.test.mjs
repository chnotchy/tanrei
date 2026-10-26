// The response headers the host sends (public/_headers), read as Cloudflare Pages reads them (test/browser/host.mjs):
// no document of the site may be framed, and no page frames a document fetched from anywhere — the gallery's windows
// are documents a page writes into its frames (`srcdoc`), which nothing fetches. Each header is sent once.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, test } from 'node:test';
import { headerRules, headersFor } from './browser/host.mjs';

const rules = headerRules(fs.readFileSync(new URL('../public/_headers', import.meta.url), 'utf8'));
const directives = (policy) => Object.fromEntries(policy.split(';').map((d) => d.trim()).filter(Boolean).map((d) => [d.split(/\s+/)[0], d.split(/\s+/).slice(1).join(' ')]));

describe('the host’s headers', () => {
  test('the rules are read as the host reads them: a later rule joins a header, `!` detaches it', () => {
    const read = headerRules('/*\n  A: one\n  B: one\n\n/x/*\n  ! A\n  A: two\n  B: two\n');
    assert.deepEqual(headersFor(read, '/x/y/'), { a: 'two', b: 'one, two' });
    assert.deepEqual(headersFor(read, '/z/'), { a: 'one', b: 'one' });
  });

  for (const pathname of ['/', '/components/dialog/', '/ja/components/dialog/', '/_astro/x.js']) {
    test(`${pathname} is framed by no page, and frames nothing fetched`, () => {
      const headers = headersFor(rules, pathname);
      assert.equal(headers['x-frame-options'], 'DENY');
      assert.equal(headers['content-security-policy-report-only'], undefined);
      const policy = directives(headers['content-security-policy']);
      assert.equal(policy['frame-ancestors'], "'none'");
      assert.equal(policy['frame-src'], "'none'");
    });
  }

  test('no rule sets a header of framing twice, or for some paths only', () => {
    const framing = /^(x-frame-options|content-security-policy(-report-only)?)$/i;
    const setting = rules.filter((rule) => [...Object.keys(rule.set), ...rule.unset].some((name) => framing.test(name)));
    assert.deepEqual(setting.map((rule) => rule.path), ['/*']);
  });
});
