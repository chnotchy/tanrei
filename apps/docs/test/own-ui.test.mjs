// The site defines only what `@tanrei/web` registers, the default system's components (lib/omitted-elements.ts,
// lib/define-on-demand.ts). A component the default system does not have — one its layer leaves out (`components.omit`
// in its system file) or one that lives in a layer it does not descend from — is defined only where the site shows a
// system that has it on purpose: its own page (and the windows of its own fixtures), and a frame pinned to a shipped
// system that has it. Anywhere else its element stays undefined, as in a product on `@tanrei/web`.
//
// Held here, by Node:
// - the loader's table names every tag of every such component, read from the components manifests the package's
//   entries are built from, which agree with the default system's own file;
// - the rule: where each such element is defined, and where it is not;
// - the marks the rule reads are written where they belong (the page's subject, the pinned frames), and nowhere else;
// - no script of the site reaches such a component past the loader (its module, a system's entry, `all`);
// - on every built page (dist/, when the site has been built), each element of such a component stands where the rule
//   defines it, named by page, line and column where it does not.
// That the loader keeps to the rule in a browser is test/browser/omitted-elements.test.mjs's.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SYSTEM, elementModules, elementModulesSource, outsideTags, systemManifests } from '../src/lib/element-modules.mjs';
import { defaultSystemContext } from '../../../packages/tools/src/own-ui.js';

register('./vite-shim.mjs', import.meta.url);
const { SHOWS_ATTR, SUBJECT_ATTR, leftUndefined, mayDefine } = await import('../src/lib/omitted-elements.ts');

const docs = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(docs, '../..');
const read = (file) => fs.readFileSync(path.join(docs, file), 'utf8');
const rows = elementModules(JSON.parse(fs.readFileSync(path.join(repo, 'packages/web/custom-elements.json'), 'utf8')));
const { manifests } = systemManifests();
const outside = outsideTags(rows, manifests, DEFAULT_SYSTEM);
/** The components the default system does not have, worked out from its layers as `tanrei audit` works them out. */
const fromLayers = defaultSystemContext();

describe('the components the default system does not have', () => {
  test('the loader’s table holds every tag of each, with the systems that have it and what to use instead', () => {
    const layer = JSON.parse(fs.readFileSync(path.join(repo, `tokens/systems/${DEFAULT_SYSTEM}.system.json`), 'utf8'));
    const omitted = fromLayers.omitted.map((entry) => entry.name);
    for (const name of Object.keys(layer.components?.omit ?? {})) assert.ok(omitted.includes(name), `${name}: the default system’s file leaves it out`);
    for (const entry of fromLayers.omitted) {
      const component = fromLayers.context.catalog.components.find((each) => each.name === entry.name);
      if (!component?.web?.tag) continue;
      for (const tag of [component.web.tag, ...(component.web.items ?? [])]) {
        assert.equal(outside[tag]?.component, entry.name, `${tag} is ${entry.name}’s`);
        assert.deepEqual(outside[tag].insteadUse, entry.insteadUse ?? []);
        assert.deepEqual(outside[tag].systems, [...fromLayers.shipped].filter(([, manifest]) => manifest.components.some((each) => each.name === entry.name)).map(([id]) => id), `${tag}: the systems that have it`);
      }
    }
    const tanrei = manifests.get(DEFAULT_SYSTEM);
    for (const { name, web } of tanrei.components) if (web?.tag) assert.equal(outside[web.tag], undefined, `${web.tag} is the default system’s`);
    assert.ok(Object.keys(outside).length > 0);
    const source = elementModulesSource(rows, outside);
    assert.ok(source.includes(`export const outside = ${JSON.stringify(outside)};`));
    assert.ok(source.includes(`export const system = ${JSON.stringify(DEFAULT_SYSTEM)};`));
  });

  test('each is defined on its own page and in a frame pinned to a system that has it, and nowhere else', () => {
    const shipped = [...manifests.keys()];
    for (const [tag, entry] of Object.entries(outside)) {
      assert.equal(mayDefine(entry, {}), false, `${tag}: on a page about nothing`);
      assert.equal(mayDefine(entry, { subject: 'button' }), false, `${tag}: on another component’s page`);
      assert.equal(mayDefine(entry, { subject: entry.component }), true, `${tag}: on its own page`);
      for (const id of shipped) assert.equal(mayDefine(entry, { subject: 'button', shows: id }), entry.systems.includes(id), `${tag}: in a frame pinned to ${id}`);
      assert.equal(mayDefine(entry, { shows: DEFAULT_SYSTEM }), false, `${tag}: in a frame of the default system`);
      assert.match(leftUndefined(tag, entry, DEFAULT_SYSTEM), new RegExp(`<${tag}> is left undefined: the design system "${DEFAULT_SYSTEM}" does not have ${entry.component}.*Use ${entry.insteadUse.join(', ')} instead\\.$`));
    }
    for (const tag of ['tanrei-tabs', 'tanrei-tab', 'tanrei-button']) assert.equal(mayDefine(outside[tag], {}), true, `${tag}: the default system’s own, anywhere`);
  });

  test('the marks the rule reads are written by the page’s frame, the pinned frames and the windows of a gallery of fixtures, and by nothing else', () => {
    assert.match(read('src/components/frame/PageFrame.astro'), /<tanrei-app-shell [^>]*\{\.\.\.\{ \[SUBJECT_ATTR\]: specOfPage\(route\.id\)\?\.name \}\}>/);
    assert.match(read('src/lib/fixture-stages.ts'), /attribute\(SUBJECT_ATTR, subject\)/);
    assert.match(read('src/components/visuals/Example.astro'), /data-tanrei-system=\{pinned\}\s+data-docs-shows-system=\{pinned\}/);
    assert.match(read('src/components/SystemGallery.astro'), /data-tanrei-system=\{layer\.id\} data-docs-shows-system=\{layer\.id\}/);
    assert.match(read('src/components/SystemButtons.astro'), /data-tanrei-system=\{system\.id\} data-docs-shows-system=\{system\.id\}/);
    const writers = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(path.join(docs, dir), { withFileTypes: true })) {
        const file = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(file);
        else if (/\.(astro|ts|mjs|mdx?)$/.test(entry.name) && new RegExp(`${SHOWS_ATTR}|${SUBJECT_ATTR}|SHOWS_ATTR|SUBJECT_ATTR`).test(read(file))) writers.push(file);
      }
    };
    walk('src');
    assert.deepEqual(writers.sort(), ['src/components/SystemButtons.astro', 'src/components/SystemGallery.astro', 'src/components/frame/PageFrame.astro', 'src/components/visuals/Example.astro', 'src/lib/fixture-stages.ts', 'src/lib/omitted-elements.ts'].sort());
  });

  test('no script of the site reaches one past the loader: neither its module nor an entry that registers it', () => {
    const modules = [...new Set(Object.values(outside).map((entry) => manifests.get(entry.systems[0]).components.find((each) => each.name === entry.component).web.module))];
    const entries = ['@tanrei/web/all', ...[...manifests.keys()].filter((id) => id !== DEFAULT_SYSTEM).map((id) => `@tanrei/web/${id}`)];
    const found = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(path.join(docs, dir), { withFileTypes: true })) {
        const file = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(file);
        else if (/\.(astro|ts|mjs)$/.test(entry.name)) {
          for (const specifier of [...modules, ...entries]) if (new RegExp(`(?:from|import\\(?)\\s*['"]${specifier}['"]`).test(read(file))) found.push(`${file}: ${specifier}`);
        }
      }
    };
    for (const dir of ['src/components', 'src/lib', 'src/pages', 'src/layouts', 'src/overrides']) if (fs.existsSync(path.join(docs, dir))) walk(dir);
    assert.deepEqual(found, []);
  });
});

// ── The built pages ─────────────────────────────────────────────────────────────────────────────────────────────────

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);

/**
 * Each element of a tag in `tags` in a built page, with where it stands: the page's subject and the system of the
 * nearest pinned frame around it. A reader of the page's tags as the site writes them (a stack of open elements), not a
 * full parser of HTML: enough for markup a build wrote.
 */
function placesIn(html, tags) {
  const subject = new RegExp(`<[a-z][\\w-]*\\s[^>]*\\b${SUBJECT_ATTR}="([^"]+)"`).exec(html)?.[1];
  const stack = [];
  const found = [];
  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  for (let match; (match = tag.exec(html)); ) {
    const [, closing, rawName, attrs, selfClosing] = match;
    const name = rawName.toLowerCase();
    if (closing) {
      const at = stack.findLastIndex((open) => open.name === name);
      if (at !== -1) stack.length = at;
      continue;
    }
    const shows = new RegExp(`\\b${SHOWS_ATTR}="([^"]+)"`).exec(attrs)?.[1];
    if (tags.has(name)) {
      const before = html.slice(0, match.index);
      found.push({ tag: name, line: before.split('\n').length, column: match.index - before.lastIndexOf('\n'), subject, shows: shows ?? stack.findLast((open) => open.shows)?.shows });
    }
    if (RAW.has(name)) {
      const end = html.indexOf(`</${name}`, tag.lastIndex);
      tag.lastIndex = end === -1 ? html.length : end;
      continue;
    }
    if (!VOID.has(name) && !selfClosing) stack.push({ name, shows });
  }
  return found;
}

const dist = path.join(docs, 'dist');
describe('the built pages', () => {
  test('the reader of a page’s places sees the page’s subject and the pinned frame around an element', () => {
    const tags = new Set(['tanrei-segmented-button']);
    const html = `<tanrei-app-shell ${SUBJECT_ATTR}="tabs"><main><div ${SHOWS_ATTR}="m3-like"><p>a</p><img src="x"><tanrei-segmented-button></tanrei-segmented-button></div>\n<script>const x = '<tanrei-segmented-button>';</script><tanrei-segmented-button></tanrei-segmented-button></main></tanrei-app-shell>`;
    assert.deepEqual(placesIn(html, tags).map(({ line, subject, shows }) => [line, subject, shows]), [[1, 'tabs', 'm3-like'], [2, 'tabs', undefined]]);
  });

  test('every element of a component the default system does not have stands where the site defines it (dist/, when the site has been built)', { skip: !fs.existsSync(path.join(dist, 'index.html')) && 'apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first' }, () => {
    const tags = new Set(Object.keys(outside));
    const stray = [];
    let pages = 0;
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.html')) {
          pages++;
          const html = fs.readFileSync(full, 'utf8');
          if (![...tags].some((each) => html.includes(`<${each}`))) continue;
          for (const place of placesIn(html, tags)) if (!mayDefine(outside[place.tag], place)) stray.push(`${path.relative(dist, full)}:${place.line}:${place.column} <${place.tag}>`);
        }
      }
    };
    walk(dist);
    assert.ok(pages > 100, `${pages} pages read`);
    assert.deepEqual(stray, []);
  });
});
