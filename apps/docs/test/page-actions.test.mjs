// The actions at the head of a page (components/frame/PageActions.astro, lib/page-actions.ts), without a browser: where
// each link of the menu goes — the page's Markdown, a new chat that reads it, the editors' links that install the MCP
// server — the command the last item copies, the words in the six languages, and what the component writes.
// test/browser/page-actions.test.mjs uses them in each engine.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { strings } = await import('../src/lib/i18n.ts');
const { claudeCodeCommand, cursorInstallHref, mcpServer, pageActionHrefs, vscodeInstallHref } = await import('../src/lib/page-actions.ts');
const { source, translations } = await import('../i18n/locales.mjs');
const config = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../../tanrei.config.json', import.meta.url)), 'utf8'));
const component = fs.readFileSync(fileURLToPath(new URL('../src/components/frame/PageActions.astro', import.meta.url)), 'utf8');
const title = fs.readFileSync(fileURLToPath(new URL('../src/components/frame/PageTitle.astro', import.meta.url)), 'utf8');

const languages = [source, ...translations].map(({ lang }) => lang);
const KEYS = Object.keys(strings('en').pageActions);

describe('the MCP server the actions install', () => {
  test('is the package of the npm scope, named by the namespace (tanrei.config.json)', () => {
    assert.deepEqual(mcpServer, { name: config.namespace, command: 'npx', args: ['-y', `${config.packages.npmScope}/mcp`] });
    assert.equal(claudeCodeCommand, `claude mcp add --scope project ${config.namespace} -- npx -y ${config.packages.npmScope}/mcp`);
  });
  test('Cursor’s link names the server and carries its configuration as base64 JSON', () => {
    const url = new URL(cursorInstallHref());
    assert.equal(`${url.protocol}//${url.host}${url.pathname}`, 'cursor://anysphere.cursor-deeplink/mcp/install');
    assert.equal(url.searchParams.get('name'), mcpServer.name);
    assert.deepEqual(JSON.parse(Buffer.from(url.searchParams.get('config'), 'base64').toString('utf8')), { command: mcpServer.command, args: [...mcpServer.args] });
  });
  test('VS Code’s link carries the server’s definition as percent-encoded JSON, over stdio', () => {
    const href = vscodeInstallHref();
    assert.ok(href.startsWith('vscode:mcp/install?'), href);
    assert.deepEqual(JSON.parse(decodeURIComponent(href.slice('vscode:mcp/install?'.length))), { name: mcpServer.name, type: 'stdio', command: mcpServer.command, args: [...mcpServer.args] });
  });
});

describe('the links of a page', () => {
  test('lead to its Markdown, and start a chat that asks to read it by its address on the site', () => {
    for (const lang of languages) {
      const ask = strings(lang).pageActions.ask;
      const hrefs = pageActionHrefs('/ja/components/button.md', config.site, ask);
      assert.equal(hrefs.markdown, '/ja/components/button.md');
      const question = ask.replace('{url}', `${config.site}/ja/components/button.md`);
      const chatgpt = new URL(hrefs.chatgpt);
      assert.equal(chatgpt.origin, 'https://chatgpt.com');
      assert.equal(chatgpt.searchParams.get('q'), question, lang);
      const claude = new URL(hrefs.claude);
      assert.equal(`${claude.origin}${claude.pathname}`, 'https://claude.ai/new');
      assert.equal(claude.searchParams.get('q'), question, lang);
      assert.equal(hrefs.cursor, cursorInstallHref());
      assert.equal(hrefs.vscode, vscodeInstallHref());
    }
  });
});

describe('the words', () => {
  test('are said in every language, the question with one place for the address', () => {
    for (const lang of languages) {
      const words = strings(lang).pageActions;
      assert.deepEqual(Object.keys(words), KEYS, lang);
      for (const key of KEYS) assert.ok(String(words[key]).trim(), `${lang}: pageActions.${key}`);
      assert.equal(words.ask.split('{url}').length, 2, `${lang}: pageActions.ask`);
    }
  });
  test('are each language’s own: a translation does not fall back to the English words', () => {
    const english = strings('en').pageActions;
    for (const lang of languages.slice(1)) {
      const words = strings(lang).pageActions;
      // A word may be the same in two languages (Spanish «Error»); a dictionary that kept the English is not.
      const same = KEYS.filter((key) => words[key] === english[key]);
      assert.ok(same.length <= 1, `${lang}: ${same.join(', ')} are the English words`);
    }
  });
});

describe('the component', () => {
  const drawn = component.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<style\b[\s\S]*?<\/style>/g, '');
  test('is Tanrei’s Button with menu in the page header’s actions part, left out of the search and of the page’s Markdown', () => {
    assert.match(drawn, /^\s*<div data-part="actions" data-pagefind-ignore>\s*<tanrei-button-with-menu\b/);
    assert.match(drawn, /\blabel=\{w\.copy\}/);
    assert.match(drawn, /\bmenu-label=\{w\.more\}/);
    assert.doesNotMatch(drawn, /<button\b/);
    // It stands after the meta line, the last part of the head: the reading order and the focus order of PGH-11.
    assert.match(title, /<\/div>\s*\)\}\s*\{actions && <PageActions \/>\}\s*<\/tanrei-page-header>/);
  });
  test('opens the page’s Markdown and the chats in a new tab, said in the page’s language', () => {
    const links = [...drawn.matchAll(/<tanrei-menu-item\b[^>]*\bhref=\{hrefs\.(\w+)\}[^>]*>/g)];
    assert.deepEqual(links.map(([, name]) => name), ['markdown', 'chatgpt', 'claude', 'cursor', 'vscode']);
    for (const [item, name] of links) {
      const newTab = name === 'markdown' || name === 'chatgpt' || name === 'claude';
      assert.equal(/\btarget="new" target-label=\{t\.opensInNewTab\}/.test(item), newTab, item);
    }
    for (const lang of languages) assert.ok(strings(lang).opensInNewTab.trim(), lang);
  });
  test('copies the page by its Markdown, and the command, and says so in a snackbar defined on first use', () => {
    assert.match(drawn, /data-markdown=\{hrefs\.markdown\}/);
    assert.match(drawn, /class="docs-copy-command"[^>]*data-command=\{claudeCodeCommand\}/);
    assert.match(component, /new ClipboardItem\(\{ 'text\/plain': text\.then/);
    assert.match(title, /<tanrei-snackbar-host class="docs-snackbars" data-define-on-use data-pagefind-ignore><\/tanrei-snackbar-host>/);
    assert.match(component, /import\('@tanrei\/web\/components\/snackbar'\)/);
  });
});
