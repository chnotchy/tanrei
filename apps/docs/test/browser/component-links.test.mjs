// The links at the head of a built component page, in each engine (components/frame/PageTitle.astro): under the
// spec's facts, a navigation landmark named in the page's language holds the spec on GitHub, the web element's module
// (the path the web package's manifest names) and the package on npm, each named in the page's language and saying it
// leaves the site. What the addresses are made of is test/repository.test.mjs's.
//
//   pnpm --filter @tanrei/docs build && DOCS_ENGINES=chromium node --test test/browser/component-links.test.mjs
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { engines, launch } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs): the slowest, the links of the Button
// page, in WebKit, took 16 s in CI.
const LIMIT = { timeout: 120_000 };

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const config = JSON.parse(fs.readFileSync(path.join(docs, '../../tanrei.config.json'), 'utf8'));
const blob = (file) => `https://github.com/${config.repository.public}/blob/main/${file}`;
const npm = `https://www.npmjs.com/package/${config.packages.npmScope}/web`;

const ENGINES = engines('chromium,firefox,webkit');
let host;
let origin;
before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
});
after(async () => {
  await host?.close();
});

const PAGES = [
  { url: '/components/button/', lang: 'en', name: 'button' },
  { url: '/ja/components/checkbox/', lang: 'ja', name: 'checkbox' },
];

for (const engine of ENGINES) {
  describe(`the links at the head of a component page in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    for (const { url, lang, name } of PAGES) {
      test(`${url}: the spec, the web source and npm, under the facts`, LIMIT, async () => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });
        const page = await context.newPage();
        await page.goto(`${origin}${url}`);
        const words = strings(lang).componentLinks;
        const nav = page.getByRole('navigation', { name: words.label, exact: true });
        assert.equal(await nav.count(), 1, 'one landmark, named in the page’s language');
        const links = await nav.locator('a').evaluateAll((all) => all.map((a) => ({ id: a.dataset.docsLink, href: a.href, text: a.textContent.trim(), description: a.getAttribute('aria-description') })));
        assert.deepEqual(links, [
          { id: 'spec', href: blob(`specs/${name}.spec.json`), text: words.spec, description: strings(lang).externalLink },
          { id: 'web-source', href: blob(`packages/web/src/components/${name}/${name}.ts`), text: words.webSource, description: strings(lang).externalLink },
          { id: 'npm', href: npm, text: words.npm, description: strings(lang).externalLink },
        ]);
        // Under the facts, in the order of the page.
        const [facts, row] = await Promise.all([page.locator('.docs-page-facts').boundingBox(), nav.boundingBox()]);
        assert.ok(row.y >= facts.y + facts.height, `the links stand under the facts: ${JSON.stringify({ facts, row })}`);
        await context.close();
      });
    }
  });
}
