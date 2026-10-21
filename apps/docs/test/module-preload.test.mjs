// The modules a built page asks for in its head (src/lib/module-preload.mjs): every module its scripts import
// statically, each once, in the order the browser would come to them, before `</head>` — and nothing for a page with
// no script of the bundle. That the built site's pages carry them, and that a browser then asks for no module it
// found only by reading another, is held in test/browser/module-preload.test.mjs.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { staticGraph, withModulePreloads } from '../src/lib/module-preload.mjs';

// header → button → base, header → menu → base; hero → button. `base` is reached twice and listed once.
const imports = new Map([
  ['_astro/header.js', ['_astro/button.js', '_astro/menu.js']],
  ['_astro/hero.js', ['_astro/button.js']],
  ['_astro/button.js', ['_astro/base.js']],
  ['_astro/menu.js', ['_astro/base.js']],
  ['_astro/base.js', []],
  ['_astro/studio.js', []],
]);
const links = (html) => [...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map((m) => m[1]);

describe('the static graph of a page’s scripts', () => {
  test('is the scripts, then what they import, a level at a time, each once', () => {
    assert.deepEqual(staticGraph(['_astro/header.js', '_astro/hero.js'], imports), ['_astro/header.js', '_astro/hero.js', '_astro/button.js', '_astro/menu.js', '_astro/base.js']);
  });
  test('ends where a chunk imports nothing, and survives a cycle', () => {
    assert.deepEqual(staticGraph(['_astro/base.js'], imports), ['_astro/base.js']);
    const cycle = new Map([['_astro/a.js', ['_astro/b.js']], ['_astro/b.js', ['_astro/a.js']]]);
    assert.deepEqual(staticGraph(['_astro/a.js'], cycle), ['_astro/a.js', '_astro/b.js']);
  });
  test('is refused for a script the bundle did not emit', () => {
    assert.throws(() => staticGraph(['_astro/gone.js'], imports), /not a chunk of the client bundle/);
  });
});

describe('a built page', () => {
  const page = (head, body = '') => `<!DOCTYPE html><html><head><link rel="stylesheet" href="/_astro/site.css">${head}</head><body>${body}</body></html>`;

  test('asks for each module of its scripts last in its head, after its stylesheets', () => {
    const html = withModulePreloads(page('<script type="module" src="/_astro/header.js"></script>', '<script type="module" src="/_astro/hero.js"></script>'), imports);
    assert.deepEqual(links(html), ['/_astro/header.js', '/_astro/hero.js', '/_astro/button.js', '/_astro/menu.js', '/_astro/base.js']);
    const head = html.slice(0, html.indexOf('</head>'));
    assert.ok(head.indexOf('rel="stylesheet"') < head.indexOf('rel="modulepreload"'), 'the stylesheet is asked for first');
    assert.ok(head.endsWith('<link rel="modulepreload" href="/_astro/base.js">'), 'the links stand last in the head');
    assert.doesNotMatch(html, /crossorigin/, 'a link with `crossorigin` is not sent as an Early Hint');
  });

  test('names each module once, whichever scripts share it', () => {
    const html = withModulePreloads(page('<script type="module" src="/_astro/header.js"></script><script type="module" src="/_astro/header.js"></script>'), imports);
    const found = links(html);
    assert.equal(found.length, new Set(found).size);
  });

  test('is left as it was without a module script of the bundle: inline modules, classic scripts and other files', () => {
    for (const head of ['', '<script type="module">document.title = "x"</script>', '<script src="/_astro/header.js"></script>', '<script type="module" src="/pagefind/pagefind-ui.js"></script>']) {
      const html = page(head);
      assert.equal(withModulePreloads(html, imports), html, head);
    }
  });

  test('takes the site’s base path from the configuration', () => {
    const html = withModulePreloads(page('<script type="module" src="/docs/_astro/hero.js"></script>'), imports, '/docs/');
    assert.deepEqual(links(html), ['/docs/_astro/hero.js', '/docs/_astro/button.js', '/docs/_astro/base.js']);
  });

  test('is refused where it names a bundle file the bundle did not emit, or already has the links', () => {
    assert.throws(() => withModulePreloads(page('<script type="module" src="/_astro/gone.js"></script>'), imports), /did not emit/);
    const once = withModulePreloads(page('<script type="module" src="/_astro/hero.js"></script>'), imports);
    assert.throws(() => withModulePreloads(once, imports), /given them twice/);
  });
});
