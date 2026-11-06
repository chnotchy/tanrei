// The foot of a built page, in each engine (components/frame/Footer.astro): a prose page links its own source on
// GitHub, and a component page its source and its spec, in the page's language; both link a new issue in the bug form
// that carries the page's address, and the repository. Each link is named in the page's language and says it leaves
// the site. What the addresses are made of is test/repository.test.mjs's.
//
//   pnpm --filter @tanrei/docs build && DOCS_ENGINES=chromium node --test test/browser/page-foot.test.mjs
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

register('../vite-shim.mjs', import.meta.url);
const { strings } = await import('../../src/lib/i18n.ts');

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const config = JSON.parse(fs.readFileSync(path.join(docs, '../../tanrei.config.json'), 'utf8'));
const repository = `https://github.com/${config.repository.public}`;
const blob = (file) => `${repository}/blob/main/${file}`;

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
  { url: '/foundations/accessibility/', lang: 'en', source: 'apps/docs/src/content/docs/foundations/accessibility.mdx' },
  { url: '/ja/foundations/accessibility/', lang: 'ja', source: 'apps/docs/src/content/docs/ja/foundations/accessibility.mdx' },
  { url: '/components/button/', lang: 'en', source: 'apps/docs/src/content/docs/components/button.mdx', component: 'button' },
  { url: '/ja/components/button/', lang: 'ja', source: 'apps/docs/src/content/docs/ja/components/button.mdx', component: 'button' },
];

for (const engine of ENGINES) {
  describe(`the foot of a page in ${engine}`, () => {
    let browser;
    before(async () => {
      browser = await launch(engine);
    });
    after(async () => {
      await browser?.close();
    });

    for (const { url, lang, source, component } of PAGES) {
      test(`${url}: its source${component ? ', its spec' : ''}, a report of a problem and the repository`, async () => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });
        const page = await context.newPage();
        await page.goto(`${origin}${url}`);
        const words = strings(lang);
        const links = await page.locator('.docs-page-foot a').evaluateAll((all) => all.map((a) => ({ id: a.dataset.docsFoot, href: a.href, text: a.textContent.trim(), description: a.getAttribute('aria-description') })));
        assert.deepEqual(
          links.map(({ id }) => id),
          component ? ['source', 'spec', 'report', 'repository'] : ['source', 'report', 'repository'],
        );
        const by = Object.fromEntries(links.map((link) => [link.id, link]));
        assert.equal(by.source.href, blob(source));
        assert.equal(by.source.text, words.pageFoot.pageSource);
        if (component) {
          assert.equal(by.spec.href, blob(`specs/${component}.spec.json`));
          assert.equal(by.spec.text, words.pageFoot.spec);
        }
        const report = new URL(by.report.href);
        const address = new URL(url, config.site).href;
        assert.equal(`${report.origin}${report.pathname}`, `${repository}/issues/new`);
        assert.equal(report.searchParams.get('template'), 'bug.yml');
        assert.ok(report.searchParams.get('title').includes(address), report.searchParams.get('title'));
        assert.ok(report.searchParams.get('what').includes(address));
        assert.equal(report.searchParams.get('component'), component ?? null);
        assert.equal(by.report.text, words.pageFoot.report);
        assert.equal(by.repository.href, repository);
        for (const link of links) assert.equal(link.description, words.externalLink, `${link.id} says it leaves the site`);
        // The name a reader hears is the link's words alone.
        assert.equal(await page.getByRole('link', { name: words.pageFoot.report, exact: true }).count(), 1);
        await context.close();
      });
    }
  });
}
