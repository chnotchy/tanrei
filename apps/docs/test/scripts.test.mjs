// Where the site loads the web package's scripts, held from the sources.
//
// A page defines the elements it draws, and no others: a script of the site imports the module of each element it
// needs (`@tanrei/web/components/<name>`), and lib/register-web.ts defines the elements of a page's demos from the
// table of the package's manifest (lib/element-modules.mjs, lib/define-on-demand.ts). The package's entry
// (`@tanrei/web`) imports every module of the package — about 2.4 MB, 540 KB compressed — so no script of the site
// imports it, but for the console's `await tanrei`, which fetches it only when a person asks for it.
//
// What a built page then asks for and defines is asked of a browser in test/browser/scripts.test.mjs.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ELEMENT_MODULES, elementModules, elementModulesSource } from '../src/lib/element-modules.mjs';

const docs = fileURLToPath(new URL('../', import.meta.url));
const src = path.join(docs, 'src');
const web = path.join(docs, '../../packages/web');
const manifest = JSON.parse(fs.readFileSync(path.join(web, 'custom-elements.json'), 'utf8'));

const files = (dir, pattern) => fs.readdirSync(dir, { recursive: true }).filter((name) => pattern.test(name)).map((name) => path.join(dir, name));
// The site's own scripts: its components, pages and libraries — not the pages' content, whose imports are code samples.
const sources = [...files(path.join(src, 'components'), /\.(astro|ts|mjs)$/), ...files(path.join(src, 'pages'), /\.(astro|ts)$/), ...files(path.join(src, 'lib'), /\.(ts|mjs)$/)];
const read = (file) => fs.readFileSync(file, 'utf8');
const rel = (file) => path.relative(docs, file);
/** Every tag the package's manifest declares. */
const declared = manifest.modules.flatMap((module) => (module.declarations ?? []).filter((declaration) => declaration.customElement && declaration.tagName).map((declaration) => declaration.tagName));

describe('the package’s entry', () => {
  test('no script of the site imports it: neither for its elements nor for a function, which its own module exports', () => {
    const found = [];
    for (const file of sources) {
      for (const match of read(file).matchAll(/^\s*import\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?['"]@tanrei\/web['"]/gm)) found.push(`${rel(file)}: ${match[0].trim()}`);
    }
    assert.deepEqual(found, []);
  });

  test('only the console asks for it, when a person does: `await tanrei`', () => {
    const asking = sources.filter((file) => /import\(\s*['"]@tanrei\/web['"]\s*\)/.test(read(file))).map(rel);
    assert.deepEqual(asking, ['src/lib/register-web.ts']);
    assert.match(read(path.join(src, 'lib/register-web.ts')), /Object\.defineProperty\(window, 'tanrei', \{ configurable: true, get: \(\) => import\('@tanrei\/web'\) \}\);/);
  });

  test('the demos’ elements are defined from the table, and the page’s words are set before any of their modules arrives', () => {
    const register = read(path.join(src, 'lib/register-web.ts'));
    const onDemand = read(path.join(src, 'lib/define-on-demand.ts'));
    assert.match(register, /^import '\.\/define-on-demand';$/m);
    assert.match(onDemand, new RegExp(`^import \\{ loaders, modules \\} from '${ELEMENT_MODULES}';$`, 'm'));
    // It asks for modules only by `import()`, which settles after the script that imported it has run to its end.
    assert.match(onDemand, /void load\(\)\.then\(/);
    assert.match(register, /^for \(const given of document\.querySelectorAll<HTMLScriptElement>\('script\[data-tanrei-product-words\]'\)\) \{$/m);
    // What the entry runs besides defining elements still runs on a page that defines its demos.
    for (const script of ['icons', 'link']) assert.match(register, new RegExp(`^import '@tanrei/web/${script}';$`, 'm'), script);
    for (const script of ['steps', 'timeline', 'previous-next-links']) assert.ok(register.includes(`'tanrei-${script}': () => import('@tanrei/web/${script}'),`), script);
  });

  test('a part of the page that may hold an element asks for it on demand; the content column and the frame’s announcement do', () => {
    for (const file of ['src/components/MarkdownContent.astro', 'src/components/frame/PageFrame.astro']) {
      const script = read(path.join(docs, file)).split('<script>')[1] ?? '';
      assert.match(script, /import '(?:\.\.\/)+lib\/define-on-demand';/, file);
      assert.doesNotMatch(script, /@tanrei\/web\/components\/(?:table|callout|code-block)'/, file);
    }
  });
});

describe('the table of the module that defines each element', () => {
  const rows = elementModules(manifest);

  test('has every element the package declares, once, by a module the package exports', () => {
    const tags = rows.flatMap((row) => row.tags);
    assert.deepEqual([...tags].sort(), [...declared].sort());
    assert.equal(new Set(tags).size, tags.length);
    const exports = JSON.parse(read(path.join(web, 'package.json'))).exports;
    assert.ok(exports['./components/*'], '@tanrei/web exports ./components/*');
    for (const { specifier, tags } of rows) {
      const name = specifier.slice('@tanrei/web/components/'.length);
      assert.ok(fs.existsSync(path.join(web, `src/components/${name}/${name}.ts`)), `${specifier} (${tags.join(', ')})`);
    }
  });

  test('is written as a loader for each tag, one for the tags of one module', () => {
    const source = elementModulesSource(rows);
    assert.equal([...source.matchAll(/^const m\d+ = \(\) => import\("@tanrei\/web\/components\/[a-z-]+"\);$/gm)].length, rows.length);
    for (const [index, { tags }] of rows.entries()) for (const tag of tags) assert.ok(source.includes(`  "${tag}": m${index},`), tag);
    assert.match(source, new RegExp(`^export const modules = ${rows.length};$`, 'm'));
  });

  test('refuses a module the package has no export for', () => {
    const elsewhere = { modules: [{ path: 'src/primitives/thing.ts', declarations: [{ customElement: true, tagName: 'tanrei-thing' }] }] };
    assert.throws(() => elementModules(elsewhere), /src\/primitives\/thing\.ts defines tanrei-thing/);
  });

  test('is served to the site’s scripts by a plugin of its build', () => {
    const config = fs.readFileSync(path.join(docs, 'astro.config.mjs'), 'utf8');
    assert.match(config, /plugins: \[[^\]]*\belementModulesPlugin\(\)/);
  });
});
