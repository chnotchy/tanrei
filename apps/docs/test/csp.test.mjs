// Each page's script policy (src/lib/csp.mjs): what it counts as inline code, the hashes it names, and where it stands.
// How the policies hold in a browser is test/browser/csp.test.mjs.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, test } from 'node:test';
import { BEACON_ORIGIN, inlineCode, pagePolicy, withPagePolicy } from '../src/lib/csp.mjs';

const hash = (text) => `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;
const page = (head, body = '') => `<!DOCTYPE html><html><head><link rel="preload" href="/a.woff2"><meta charset="utf-8"/>${head}</head><body>${body}</body></html>`;

describe('what a page runs inline', () => {
  test('the text of each inline script, of a type that is code', () => {
    const html = page('<script>a()</script><script type="module">b()</script><script src="/c.js"></script><script type="application/ld+json">{}</script><script type="application/json">[]</script><script type="speculationrules">{"prerender":[]}</script>');
    assert.deepEqual(inlineCode(html).scripts, ['a()', 'b()', '{"prerender":[]}']);
  });
  test('each event handler, as the browser reads its value', () => {
    const html = page('', `<tanrei-button onclick="this.closest(&#39;x&#39;).open = true">A</tanrei-button><div ontoggle='f(&quot;y&quot;)' onclose=g()></div>`);
    assert.deepEqual(inlineCode(html).handlers, ["this.closest('x').open = true", 'f("y")', 'g()']);
  });
  test('not the markup shown in a code block, a script’s text or a comment', () => {
    const html = page('<script>if (a<b) x.innerHTML = "<i onclick=\\"no()\\">"</script>', '<pre><code>&lt;b onclick="no()"&gt;</code></pre><!-- <b onclick="no()"> --><style>b[onclick] { }</style>');
    assert.deepEqual(inlineCode(html).handlers, []);
  });
  test('a javascript: address is refused', () => {
    assert.throws(() => inlineCode(page('', '<a href="javascript:void 0">x</a>')), /javascript:/);
  });
});

describe('the page’s policy', () => {
  test('names the site, WebAssembly, the beacon and the hash of each inline script once', () => {
    const policy = pagePolicy(page('<script>a()</script><script>a()</script>'));
    assert.equal(policy, `script-src 'self' 'wasm-unsafe-eval' ${BEACON_ORIGIN} ${hash('a()')}; script-src-attr 'none'`);
  });
  test('allows the event handlers by their hashes', () => {
    const policy = pagePolicy(page('', '<b onclick="f()"></b><i onclick="f()"></i>'));
    assert.match(policy, new RegExp(`script-src-attr 'unsafe-hashes' ${hash('f()').replace(/[+/]/g, '\\$&')}$`));
  });
  test('stands right after <meta charset>, before any script', () => {
    const html = withPagePolicy(page('<script>a()</script>'));
    assert.match(html, /<meta charset="utf-8"\/><meta http-equiv="Content-Security-Policy" content="script-src [^"]+"><script>/);
  });
  test('a redirect with no <meta charset> gets it after its doctype', () => {
    const html = withPagePolicy('<!doctype html><title>Redirecting</title><meta http-equiv="refresh" content="0;url=/b/">');
    assert.match(html, /^<!doctype html><meta http-equiv="Content-Security-Policy" content="script-src 'self' [^"]+; script-src-attr 'none'"><title>/);
  });
  test('a page that runs a script before its <meta charset> is refused', () => {
    assert.throws(() => withPagePolicy('<!DOCTYPE html><head><script>a()</script><meta charset="utf-8"/>'), /before its <meta charset>/);
  });
});
