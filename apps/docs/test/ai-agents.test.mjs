// The page on using Tanrei with AI agents (getting-started/ai-agents) says only what the repository has, in every
// language: its lists of the MCP server's tools and resources are the server's own lists (packages/mcp/src), and
// every name its samples and its rules file give a product — a custom property, a package and an export of it, a
// function, the default system, the words a component's page shows — is one the packages and the site have. The
// samples are code, so they are the same in every language. A tool the server gains, or a name a package drops, fails
// here until the page says so.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { strings } = await import('../src/lib/i18n.ts');
const { config } = await import('../src/lib/repo.ts');
const { TOOLS } = await import('../../../packages/mcp/src/tools.js');
const { listResources } = await import('../../../packages/mcp/src/resources.js');
const { translations } = await import('../i18n/locales.mjs');

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const read = (file) => fs.readFileSync(here(`../../../${file}`), 'utf8');
const folders = ['', ...translations.map(({ dir }) => `${dir}/`)];
const pages = folders.map((folder) => ({ folder, text: read(`apps/docs/src/content/docs/${folder}getting-started/ai-agents.mdx`) }));
const english = pages[0].text;

/**
 * The names a page's lists define, in code before a colon: `- \`list_systems\`: …` (Arabic names the kind first,
 * `- الأداة \`list_systems\`: …`; Japanese and Chinese take the full-width colon).
 */
const listed = (text, pattern) => [...text.matchAll(/^- [^`\n]*`([^`]+)`[:：]/gm)].map((match) => match[1]).filter((name) => pattern.test(name));
/** Every fenced block of a page, as written (its fence line and its lines, without the indentation of a list). */
const fences = (text) => [...text.matchAll(/^( *)```[^\n]*\n[\s\S]*?^\1```$/gm)].map(([block, indent]) => block.split('\n').map((line) => line.slice(indent.length)).join('\n'));

describe('the page on AI agents', () => {
  test('is translated in every language the site has', () => {
    assert.equal(pages.length, folders.length);
    for (const { folder, text } of pages) assert.match(text, /^---\n[\s\S]*?\n---/, `${folder}getting-started/ai-agents.mdx`);
  });

  test('lists every tool of the MCP server, in the server’s order, and no other', () => {
    const tools = TOOLS.map((tool) => tool.name);
    for (const { folder, text } of pages) assert.deepEqual(listed(text, /^[a-z]+(_[a-z]+)*$/), tools, `${folder}getting-started/ai-agents.mdx`);
  });

  test('lists every resource of the MCP server, a shipped system’s file and its components manifest once each as `<id>`', () => {
    const uris = [...new Set(listResources().map(({ uri }) => uri.replace(/^(tanrei:\/\/(?:systems|components)\/).+$/, '$1<id>')))];
    for (const { folder, text } of pages) assert.deepEqual(listed(text, /^tanrei:\/\//), uris, `${folder}getting-started/ai-agents.mdx`);
  });

  test('has the same samples in every language: they are code and the rules file a product copies', () => {
    const blocks = fences(english);
    assert.ok(blocks.length >= 6, `only ${blocks.length} samples were found: the test no longer reads the page`);
    for (const { folder, text } of pages.slice(1)) assert.deepEqual(fences(text), blocks, `${folder}getting-started/ai-agents.mdx`);
  });

  test('names only custom properties that Tanrei’s stylesheet declares', () => {
    const declared = new Set([...read('packages/web/src/generated/tokens.css').matchAll(/(--[a-z0-9-]+):/g)].map((match) => match[1]));
    const named = [...english.matchAll(/--tanrei-[a-z0-9-]+/g)].map(([name]) => name).filter((name) => !name.endsWith('-'));
    assert.ok(named.length >= 4);
    for (const name of named) assert.ok(declared.has(name), `${name} is not a custom property of tokens.css`);
  });

  test('names only packages that exist, and only exports they have', () => {
    const scope = config.packages.npmScope;
    const manifests = fs.readdirSync(here('../../../packages/')).flatMap((dir) => {
      const file = here(`../../../packages/${dir}/package.json`);
      return fs.existsSync(file) ? [JSON.parse(fs.readFileSync(file, 'utf8'))] : [];
    });
    const byName = new Map(manifests.map((manifest) => [manifest.name, manifest]));
    const named = [...english.matchAll(new RegExp(`${scope}/([a-z-]+)((?:/[a-z0-9*.-]*[a-z0-9*])*)`, 'g'))];
    assert.ok(named.length > 5);
    for (const [whole, name, subpath] of named) {
      const manifest = byName.get(`${scope}/${name}`);
      assert.ok(manifest, `${whole}: no package of that name`);
      if (subpath) assert.ok(Object.keys(manifest.exports ?? {}).includes(`.${subpath}`), `${whole}: ${manifest.name} exports no ".${subpath}"`);
    }
    // The manifest the rules file points an agent at is the one the web package ships.
    const web = byName.get(`${scope}/web`);
    assert.match(english, new RegExp(`node_modules/${scope}/web/${web.customElements}`));
    assert.ok(web.files.includes(web.customElements));
  });

  test('names the functions and the system as the packages and the site have them', () => {
    assert.match(read('packages/web/src/index.ts'), /\bsetWords\b/);
    assert.match(english, /\bsetWords\(\)/);
    // The default system is the namespace, and a component's page says it in the words of the site's dictionary.
    assert.ok(english.includes(`default design system, \`${config.namespace}\``));
    assert.ok(english.includes(`"${strings('en').notShippedIn} ${config.namespace}"`));
    // What a debug report starts with.
    assert.match(read('packages/web/src/primitives/report.ts'), /console\[level\]\(`\[tanrei\] /);
    assert.ok(english.includes('`[tanrei]`'));
  });
});
