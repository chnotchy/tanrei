// The landing page's specimen (src/lib/fixtures.ts, drawn by components/Hero.astro), read by Node: the Buttons it draws
// are the web package's own document's, read against the custom elements manifest of the web package — no browser,
// no build.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { specimenFixtures } = await import('../src/lib/fixtures.ts');
const { fixtureDocument } = await import('../src/lib/fixture-documents.ts');
const { specs } = await import('../src/lib/repo.ts');

const repo = (file) => fileURLToPath(new URL(`../../../${file}`, import.meta.url));
// The manifest, read here on its own: tag → the names of the attributes it reads.
const manifest = JSON.parse(fs.readFileSync(repo('packages/web/custom-elements.json'), 'utf8'));
const declared = new Map(manifest.modules.flatMap((module) => (module.declarations ?? []).filter((declaration) => declaration.tagName).map((declaration) => [declaration.tagName, new Set((declaration.attributes ?? []).map((attribute) => attribute.name))])));
const isGlobal = (name) => ['class', 'style', 'dir', 'lang', 'slot'].includes(name) || name.startsWith('data-') || name.startsWith('aria-');
const elements = (html) => [...html.matchAll(/<(tanrei-[a-z0-9-]+)((?:\s+[^\s=<>"]+(?:="[^"]*")?)*)\s*>/g)].map((tag) => ({ tag: tag[1], attributes: [...tag[2].matchAll(/\s+([^\s=<>"]+)(?:="[^"]*")?/g)].map((attribute) => attribute[1]) }));

describe("the landing page's specimen (components/Hero.astro)", () => {
  const drawn = specimenFixtures(specs.button);
  const tag = specs.button.platforms.web.name;

  test('draws Buttons as the web package’s document draws each fixture, and every attribute it writes is one the element reads', () => {
    assert.ok(drawn.length >= 6, 'the specimen shows at least the variants');
    const stages = fixtureDocument('button').stages.map((stage) => stage.html);
    for (const html of drawn) {
      assert.ok(stages.some((stage) => stage.includes(`>${html}</div>`)), `a stage of the document holds it: ${html}`);
      const [element, ...children] = elements(html);
      assert.equal(element.tag, tag);
      assert.deepEqual(children, [], `a specimen Button holds no other element: ${html}`);
      for (const name of element.attributes) assert.ok(isGlobal(name) || declared.get(tag).has(name), `${tag} reads no attribute ${name}: ${html}`);
    }
  });

  test('an icon button has its icon: a fixture that names an icon slot is drawn with it', () => {
    const iconOnly = drawn.filter((html) => / label="/.test(html));
    assert.ok(iconOnly.length > 0, 'the specimen shows an icon button');
    for (const html of iconOnly) assert.match(html, /<span slot="icon">[a-z_]+<\/span>/, `an icon button without its icon is an empty circle: ${html}`);
  });

  test("goes nowhere and holds no state: no link, no toggle, one size, one width, the page's direction", () => {
    for (const html of drawn) assert.doesNotMatch(html, / (href|target|toggle|selected|size|width|dir)(=|[ >])/, html);
  });

  test('is markup alone: a component whose document takes a step in script has no specimen', () => {
    assert.ok(fixtureDocument('file-upload').step);
    assert.deepEqual(specimenFixtures(specs['file-upload']), []);
  });
});
