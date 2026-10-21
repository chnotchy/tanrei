// The response headers the host sends (public/_headers), read as Cloudflare Pages reads them (test/browser/host.mjs):
// no document of the site may be framed, but for the gallery's windows (/fixtures/*), which this site, and no other,
// frames. Each header is sent once: a header two matching rules set is joined by the host, and X-Frame-Options with two
// values (`DENY, SAMEORIGIN`) is not a value a browser reads.
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

  for (const pathname of ['/', '/components/dialog/', '/ja/components/dialog/']) {
    test(`${pathname} is framed by no page`, () => {
      const headers = headersFor(rules, pathname);
      assert.equal(headers['x-frame-options'], 'DENY');
      assert.equal(headers['content-security-policy'], undefined);
      const policy = directives(headers['content-security-policy-report-only']);
      assert.equal(policy['frame-ancestors'], "'none'");
      // A page frames only this site's documents: the gallery's windows.
      assert.equal(policy['frame-src'], "'self'");
    });
  }

  test('a window of the gallery is framed by this site only, each header sent once', () => {
    const page = headersFor(rules, '/components/dialog/');
    const window = headersFor(rules, '/fixtures/dialog/');
    assert.equal(window['x-frame-options'], 'SAMEORIGIN');
    assert.equal(window['content-security-policy'], "frame-ancestors 'self'");
    // The report-only policy is the pages', but for who may frame the document.
    assert.deepEqual(directives(window['content-security-policy-report-only']), { ...directives(page['content-security-policy-report-only']), 'frame-ancestors': "'self'" });
    // Everything else is what every page is sent.
    const others = (headers) => Object.fromEntries(Object.entries(headers).filter(([name]) => !/^(x-frame-options|content-security-policy(-report-only)?)$/.test(name)));
    assert.deepEqual(others(window), others(page));
  });
});
