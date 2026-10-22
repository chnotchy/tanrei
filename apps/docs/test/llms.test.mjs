// The site's text for language models (src/lib/llms.ts): `/llms.txt` and each system's `/systems/<id>/llms.txt` in
// the llms.txt form (https://llmstxt.org/: one H1, a blockquote, sections of link lines), following each system's
// components manifest — the default index names no component the default system does not ship; every component's
// page as Markdown, with every requirement of its spec by id; `/llms-full.txt` under a size it is watched against; the
// head's link to a page's Markdown; and that a crawler may read all of them. Everything is compared with the files the
// site reads (the manifests, the specs, the token documents), read from disk.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { componentMarkdown, llmsFull, llmsIndex, markdownAlternate, markdownPath, pageGroups, PAGE_FOLDERS, standIns, systemIndexPath, systemIds } = await import('../src/lib/llms.ts');
const { componentTokenSources, config, statusComponents } = await import('../src/lib/repo.ts');
const { expandStateVocabulary } = await import('../../../packages/token-engine/src/states.js');
const { translations } = await import('../i18n/locales.mjs');

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const readJson = (file) => JSON.parse(fs.readFileSync(here(`../../../${file}`), 'utf8'));
const site = new URL('https://docs.example.test/');

/** The specs as written, by name. */
const specs = new Map(fs.readdirSync(here('../../../specs/')).filter((file) => file.endsWith('.spec.json')).map((file) => [file.replace('.spec.json', ''), readJson(`specs/${file}`)]));
/** Every shipped system's manifest, from disk. */
const manifests = new Map(
  fs
    .readdirSync(here('../../../tokens/generated/'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(here(`../../../tokens/generated/${entry.name}/components.json`)))
    .map((entry) => [entry.name, readJson(`tokens/generated/${entry.name}/components.json`)]),
);
const defaultId = config.namespace;

/** The English pages of the site's content, with the title and description of their front matter. */
function contentEntries() {
  const root = here('../src/content/docs/');
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(`${root}${dir}`, { withFileTypes: true })) {
      const rel = `${dir}${entry.name}`;
      if (entry.isDirectory()) walk(`${rel}/`);
      else if (/\.mdx?$/.test(entry.name)) {
        const front = /^---\n([\s\S]*?)\n---/.exec(fs.readFileSync(`${root}${rel}`, 'utf8'))?.[1] ?? '';
        const field = (name) => new RegExp(`^${name}: (.*)$`, 'm').exec(front)?.[1]?.replace(/^(['"])(.*)\1$/, '$2');
        out.push({ id: rel.replace(/\.mdx?$/, '').replace(/\/index$/, ''), data: { title: field('title'), description: field('description') } });
      }
    }
  };
  walk('');
  return out;
}
const groups = pageGroups(contentEntries(), translations.map(({ dir }) => dir));

/** A file in the llms.txt form, taken apart: its H1s, its blockquote, its sections and each section's link lines. */
function parse(text) {
  const lines = text.split('\n');
  const sections = [];
  for (const line of lines) {
    if (line.startsWith('## ')) sections.push({ title: line.slice(3), links: [], lines: [] });
    else if (sections.length) {
      sections.at(-1).lines.push(line);
      const link = /^- \[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(?:: (.+))?$/.exec(line);
      if (link) sections.at(-1).links.push({ title: link[1], url: link[2], note: link[3] });
    }
  }
  return { lines, h1: lines.filter((line) => /^# /.test(line)), sections };
}
const componentOf = (url) => /\/components\/([a-z0-9-]+)\.md$/.exec(new URL(url).pathname)?.[1];

describe('the indexes', () => {
  for (const id of [undefined, ...systemIds]) {
    const name = id ?? `${defaultId} (/llms.txt)`;
    const text = llmsIndex(site, groups, id);
    const { lines, h1, sections } = parse(text);

    test(`${name}: is in the llms.txt form`, () => {
      assert.equal(h1.length, 1, 'one H1');
      assert.equal(lines[0], h1[0], 'the H1 is the first line');
      assert.match(lines[2], /^> \S/, 'the blockquote follows the H1');
      assert.ok(sections.length > 0);
      for (const section of sections) {
        // A section holds paragraphs and a list of links; every item of its list is a link line.
        for (const line of section.lines.filter((each) => each.startsWith('- '))) assert.match(line, /^- \[[^\]]+\]\(https?:\/\/[^)\s]+\)(?:: .+)?$/, `${section.title}: ${line}`);
        assert.ok(section.links.length > 0, `${section.title} lists links`);
      }
      assert.ok(!lines.some((line) => /^#{3,} /.test(line)), 'no heading below H2');
      assert.equal(sections.at(-1).title, 'Optional');
    });

    test(`${name}: lists the components its manifest ships, first, and the others apart`, () => {
      const manifest = manifests.get(id ?? defaultId);
      const shipped = new Set(manifest.components.map((component) => component.name));
      const [first] = sections;
      assert.match(first.title, /^Components in /);
      const inShipped = sections.filter((section) => /^(Advanced )?[Cc]omponents in /.test(section.title)).flatMap((section) => section.links.map((link) => componentOf(link.url)));
      assert.deepEqual([...inShipped].sort(), [...shipped].sort());
      const apart = sections.find((section) => section.title.startsWith('Components not in'));
      assert.deepEqual((apart?.links ?? []).map((link) => componentOf(link.url)).sort(), manifest.omitted.map((omitted) => omitted.name).sort());
      for (const link of apart?.links ?? []) {
        const omitted = manifest.omitted.find((each) => each.name === componentOf(link.url));
        // Left out by a layer or living in a layer the system does not extend, alike: what to use instead, and why.
        for (const instead of omitted.insteadUse ?? []) assert.ok(link.note.includes(specs.get(instead).title), `${omitted.name}: names ${instead}`);
        if (omitted.insteadUse?.length) assert.ok(link.note.includes('Instead use: '), omitted.name);
        if (omitted.reason) assert.ok(link.note.includes(omitted.reason.replace(/\s*\n\s*/g, ' ').trim()), `${omitted.name}: says why`);
      }
    });

    test(`${name}: links to a page, a system or a file the site builds`, () => {
      const pages = new Set(statusComponents.filter((row) => row.hasSpec && row.docs).map((row) => markdownPath(row.name)));
      const systems = new Set(systemIds.map(systemIndexPath));
      const content = new Set(groups.flatMap((group) => group.pages.map((page) => page.href)));
      for (const { url } of sections.flatMap((section) => section.links)) {
        const address = new URL(url);
        if (address.origin !== site.origin) continue;
        const path = address.pathname;
        assert.ok(pages.has(path) || systems.has(path) || content.has(path) || ['/llms-full.txt', '/status/'].includes(path), url);
      }
    });
  }

  test('the default index names no component of another layer, and no component the default system leaves out, in its components', () => {
    const { sections } = parse(llmsIndex(site, groups));
    const own = sections.filter((section) => /^(Advanced )?[Cc]omponents in /.test(section.title)).flatMap((section) => section.links.map((link) => componentOf(link.url)));
    assert.ok(!own.includes('fab-menu'), 'the FAB menu lives in the m3-like layer');
    for (const omitted of manifests.get(defaultId).omitted) assert.ok(!own.includes(omitted.name), omitted.name);
    const apart = sections.find((section) => section.title.startsWith('Components not in')).links.map((link) => componentOf(link.url));
    assert.ok(apart.includes('fab-menu'));
  });

  test('a system that extends the layer the FAB menu lives in lists it with its components', () => {
    for (const [id, manifest] of manifests) {
      if (!manifest.components.some((component) => component.name === 'fab-menu')) continue;
      const own = parse(llmsIndex(site, groups, id)).sections.filter((section) => /^(Advanced )?[Cc]omponents in /.test(section.title)).flatMap((section) => section.links.map((link) => componentOf(link.url)));
      assert.ok(own.includes('fab-menu'), id);
    }
  });

  test("lists every English page of the site's folders, and no translation", () => {
    const pages = groups.flatMap((group) => group.pages);
    for (const [folder] of PAGE_FOLDERS) {
      const files = fs.readdirSync(here(`../src/content/docs/${folder}/`)).filter((file) => /\.mdx?$/.test(file));
      const listed = pages.filter((page) => page.href === `/${folder}/` || page.href.startsWith(`/${folder}/`));
      assert.equal(listed.length, files.length, folder);
      for (const page of listed) assert.ok(page.title, page.href);
    }
    for (const { dir } of translations) assert.ok(!pages.some((page) => page.href.startsWith(`/${dir}/`)), dir);
  });
});

describe("a component's page as Markdown", () => {
  const rows = statusComponents.filter((row) => row.hasSpec && row.docs);
  test('every component that has a page has one', () => {
    assert.equal(rows.length, specs.size);
  });
  for (const row of rows) {
    test(`${row.name}: holds every requirement of its spec, by id, and one H1`, () => {
      const spec = specs.get(row.name);
      const text = componentMarkdown(row.name, site);
      assert.equal(text.split('\n').filter((line) => /^# /.test(line)).length, 1);
      assert.equal(text.split('\n')[0], `# ${spec.title}`);
      const ids = [...text.matchAll(/^- \*\*([A-Z][A-Z0-9]*-\d+)\*\* /gm)].map((match) => match[1]);
      assert.deepEqual(ids, spec.behavior.map((rule) => rule.id));
      for (const rule of spec.behavior) assert.ok(text.includes(`**${rule.id}** ${rule.text.replace(/\s*\n\s*/g, ' ').trim()}`), rule.id);
      // Every prop of the spec has its row (a forwarded one too).
      for (const prop of spec.props) assert.match(text, new RegExp(`^\\| \`${prop.name}\` \\|`, 'm'), prop.name);
      // A row of a table has as many cells as its head: no text of a spec breaks one.
      const tables = text.split('\n\n').filter((block) => block.startsWith('| '));
      for (const block of tables) {
        const [head, , ...body] = block.split('\n');
        const cells = (line) => line.replace(/\\\|/g, '').split('|').length;
        for (const line of body.filter(Boolean)) assert.equal(cells(line), cells(head), line);
      }
    });
  }

  test('says what a system that does not ship a component uses instead, and why, whatever the reason it is not there', () => {
    let seen = 0;
    for (const [id, manifest] of manifests) {
      for (const omitted of manifest.omitted) {
        const row = componentMarkdown(omitted.name, site).split('\n').find((each) => each.includes(`(\`${id}\`) | No |`));
        assert.ok(row, `${omitted.name} in ${id}`);
        for (const instead of omitted.insteadUse ?? []) assert.ok(row.includes(specs.get(instead).title), `${omitted.name} in ${id}: names ${instead}`);
        if (omitted.insteadUse?.length) assert.ok(row.includes('Instead use: '), `${omitted.name} in ${id}`);
        if (omitted.reason) assert.ok(row.includes(omitted.reason.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim()), `${omitted.name} in ${id}: says why`);
        if (omitted.providedBy && omitted.insteadUse?.length) seen += 1;
      }
    }
    // The case that once said only where the component lives: a component of another layer with its stand-ins.
    assert.ok(seen > 0);
  });

  test("the stand-ins are said for a component of another layer as for one a layer left out", () => {
    const outside = { name: 'fab-menu', title: 'FAB menu', providedBy: 'm3-like', reason: 'Its main action opens a sheet.', insteadUse: ['main-action-button', 'bottom-sheet'] };
    assert.deepEqual(standIns(outside), [`Instead use: ${specs.get('main-action-button').title}, ${specs.get('bottom-sheet').title}.`, 'Its main action opens a sheet.']);
    assert.deepEqual(standIns({ name: 'fab-menu', title: 'FAB menu', providedBy: 'm3-like' }), []);
  });

  test('says where the component is, by each system\'s manifest', () => {
    const text = componentMarkdown('fab-menu', site);
    for (const [id, manifest] of manifests) {
      const has = manifest.components.some((component) => component.name === 'fab-menu');
      assert.match(text, new RegExp(`\\(\`${id}\`\\) \\| ${has ? 'Yes' : 'No'} \\|`), id);
    }
  });

  test('names every per-state token of its group that the vocabulary has', () => {
    // What a page says of them, read back into names, is the token engine's own expansion of the declaration.
    const vocabulary = expandStateVocabulary(Object.values(componentTokenSources));
    const codes = (text) => [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
    let groups = 0;
    for (const row of rows) {
      const group = `${config.namespace}.${specs.get(row.name).tokens}`;
      const said = [];
      for (const [, pattern, rest] of componentMarkdown(row.name, site).matchAll(/^- `([^`<]+)\.<[^`]+` for (.+)\.$/gm)) {
        if (`${config.namespace}.${pattern}` !== group) continue;
        const axis = (word) => codes(new RegExp(`the ${word} ((?:\`[^\`]+\`(?:, | and )?)+)`).exec(rest)?.[1] ?? '');
        const variants = rest.startsWith('the variants') ? axis('variants') : [undefined];
        for (const variant of variants) for (const state of axis('states')) for (const property of axis('properties')) said.push([group, variant, state, property].filter(Boolean).join('.'));
      }
      const expected = vocabulary.filter((entry) => entry.component === group).map((entry) => entry.id);
      if (expected.length) groups += 1;
      assert.deepEqual(said.sort(), expected.sort(), row.name);
    }
    assert.ok(groups > 0);
  });
});

describe('llms-full.txt', () => {
  const text = llmsFull(site);
  test("holds the page of every component the default system ships, and no other", () => {
    const lines = text.split('\n');
    assert.equal(lines.filter((line) => /^# /.test(line)).length, 1);
    const titles = lines.filter((line) => /^## /.test(line)).map((line) => line.slice(3));
    const shipped = manifests.get(defaultId).components;
    for (const component of shipped) assert.ok(titles.includes(specs.get(component.name).title), component.name);
    for (const omitted of manifests.get(defaultId).omitted) assert.ok(!titles.includes(specs.get(omitted.name).title), omitted.name);
  });
  // A watch on its size, before gzip: every spec's requirements are in it, so it grows with them. Raise the ceiling
  // when the specs have grown, and say so in the pull request.
  const CEILING = 4_000_000;
  test(`stays under ${CEILING} bytes`, () => {
    const bytes = Buffer.byteLength(text);
    assert.ok(bytes < CEILING, `llms-full.txt is ${bytes} bytes`);
  });
});

describe('the head names the Markdown version of a page', () => {
  test("a component's page, in every language, and no other page", () => {
    assert.equal(markdownAlternate('components/button'), '/components/button.md');
    for (const { dir } of translations) assert.equal(markdownAlternate(`${dir}/components/button`), '/components/button.md', dir);
    assert.equal(markdownAlternate('components'), undefined);
    assert.equal(markdownAlternate('foundations/color'), undefined);
  });
  test('Head.astro writes it as an alternate of type text/markdown', () => {
    const head = fs.readFileSync(here('../src/components/frame/Head.astro'), 'utf8');
    assert.match(head, /<link rel="alternate" type="text\/markdown" href=\{markdown\}/);
  });
});

describe('a crawler may read them', () => {
  test('robots.txt disallows none of their addresses', () => {
    const robots = fs.readFileSync(here('../public/robots.txt'), 'utf8');
    const disallowed = [...robots.matchAll(/^Disallow:\s*(\S+)/gim)].map((match) => match[1]);
    for (const path of ['/llms.txt', '/llms-full.txt', markdownPath('button'), systemIndexPath(defaultId)]) assert.ok(!disallowed.some((rule) => path.startsWith(rule)), path);
  });
  test('_headers sets no type of its own for them, and no header that keeps them from a reader', () => {
    // The host types a file by its extension (text/plain and text/markdown, as UTF-8); a rule that set Content-Type
    // over a pattern would be joined with it, and X-Robots-Tag would keep them out of an index.
    const headers = fs.readFileSync(here('../public/_headers'), 'utf8');
    assert.doesNotMatch(headers, /^\s*Content-Type:/im);
    assert.doesNotMatch(headers, /^\s*X-Robots-Tag:/im);
  });
});
