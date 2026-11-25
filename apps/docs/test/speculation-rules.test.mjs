// Which of the site's pages a page asks the browser to load before the reader follows a link to one
// (src/lib/speculation-rules.mjs, written into every page by src/components/frame/PageFrame.astro and given to the browser
// once the page has loaded), what the host's policy
// says of them (public/_headers), and the move from one page to the next (styles/frame.css). What a browser makes of
// the rules and of the transition is test/browser/navigation.test.mjs.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { headerRules, headersFor } from './browser/host.mjs';
import { inlineCode, pagePolicy } from '../src/lib/csp.mjs';
import { EAGERNESS, NOT_PAGES, SITE, SPECULATION_RULES, speculateOnceLoadedText, speculationRules, speculationRulesText } from '../src/lib/speculation-rules.mjs';

const docs = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => fs.readFileSync(path.join(docs, file), 'utf8');
const SCRIPT = `<script type="speculationrules">${speculationRulesText}</script>`;

describe('the rules', () => {
  test('prerender and prefetch the same links, once a pointer rests on one or presses it', () => {
    assert.equal(EAGERNESS, 'moderate');
    assert.deepEqual(Object.keys(speculationRules).sort(), ['prefetch', 'prerender']);
    for (const action of ['prerender', 'prefetch']) {
      assert.equal(speculationRules[action].length, 1, action);
      const [rule] = speculationRules[action];
      assert.equal(rule.source, 'document', action);
      assert.equal(rule.eagerness, 'moderate', action);
      assert.deepEqual(rule.where, speculationRules.prerender[0].where, action);
    }
  });
  test('name the site’s own addresses alone, with one pattern that names no origin', () => {
    const { and } = speculationRules.prerender[0].where;
    assert.equal(SITE, '/*');
    assert.deepEqual(and[0], { href_matches: SITE });
    const patterns = JSON.stringify(speculationRules).match(/"href_matches":/g);
    assert.equal(patterns.length, 2, 'one pattern in each rule: an engine weighs every link against each pattern again whenever the page changes');
  });
  test('leave out the search’s files, the built assets, the files that are not pages, and a link that downloads, by one selector', () => {
    const { and } = speculationRules.prerender[0].where;
    assert.equal(and.length, 2);
    assert.deepEqual(and[1], { not: { selector_matches: NOT_PAGES.join(', ') } });
    for (const selector of ['[download]', '[href*="/pagefind/"]', '[href*="/_astro/"]', '[href$=".md"]', '[href$=".txt"]', '[href$=".xml"]', '[href$=".png"]']) assert.ok(NOT_PAGES.includes(selector), selector);
  });
  test('are JSON, as the browser reads them', () => {
    assert.deepEqual(JSON.parse(speculationRulesText), speculationRules);
  });
});

describe('every page holds them', () => {
  test('the frame writes them, inline and unchanged, in a template after the shell, at the end of the body, and the script that gives them to the browser once the page has loaded after it (PageFrame.astro); the head does not (Head.astro)', () => {
    const frame = read('src/components/frame/PageFrame.astro');
    assert.match(frame, /^import \{ speculateOnceLoadedText, speculationRulesText \} from '\.\.\/\.\.\/lib\/speculation-rules\.mjs';$/m);
    assert.match(frame, /^<\/tanrei-app-shell>\n<template data-docs-speculation-rules><script type="speculationrules" is:inline set:html=\{speculationRulesText\} \/><\/template>\n<script is:inline set:html=\{speculateOnceLoadedText\} \/>$/m);
    assert.doesNotMatch(read('src/components/frame/Head.astro'), /speculation/, 'read before the links, WebKit loaded the Calendar’s page 1.3 s later');
  });
  test('Theme Studio’s page, which writes a document of its own, writes them and the script at the end of its body (StudioPage.astro)', () => {
    const studio = read('src/components/StudioPage.astro');
    assert.match(studio, /^import \{ speculateOnceLoadedText, speculationRulesText \} from '\.\.\/lib\/speculation-rules\.mjs';$/m);
    assert.match(studio, /^ {4}<template data-docs-speculation-rules><script type="speculationrules" is:inline set:html=\{speculationRulesText\} \/><\/template>\n {4}<script is:inline set:html=\{speculateOnceLoadedText\} \/>\n {2}<\/body>$/m);
  });
  test('are given to the browser once the page has loaded, as the page holds them', () => {
    assert.equal(SPECULATION_RULES, 'template[data-docs-speculation-rules]');
    assert.match(speculateOnceLoadedText, /if \(document\.readyState === 'complete'\) add\(\);\n {2}else addEventListener\('load', add, \{ once: true \}\);/);
    assert.match(speculateOnceLoadedText, /rules\.type = 'speculationrules';\n {4}rules\.textContent = held\.textContent;/, 'the text the page holds, whose hash the page’s policy names');
    assert.ok(speculateOnceLoadedText.includes(JSON.stringify(SPECULATION_RULES)));
  });
  test('the page’s own policy names their hash, as it names every inline script’s (src/lib/csp.mjs)', () => {
    const html = `<!doctype html><html><head><meta charset="utf-8">${SCRIPT}</head><body></body></html>`;
    assert.deepEqual(inlineCode(html).scripts, [speculationRulesText]);
    assert.match(pagePolicy(html), /'sha256-[A-Za-z0-9+/=]+'/);
  });
  test('the host’s policy allows the rules as an inline script, and names no keyword an engine does not know (public/_headers)', () => {
    const rules = headerRules(read('public/_headers'));
    for (const pathname of ['/', '/components/button/', '/ja/foundations/color/']) {
      const policy = headersFor(rules, pathname)['content-security-policy'];
      const scripts = policy.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src ')).split(/\s+/).slice(1);
      assert.ok(!scripts.includes("'inline-speculation-rules'"), `${pathname}: WebKit reports the keyword as an invalid source`);
      assert.deepEqual(scripts, ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", 'https://static.cloudflareinsights.com'], pathname);
    }
  });
  const built = path.join(docs, 'dist/index.html');
  test('each built page holds them once, in the template (dist/, when the site has been built)', { skip: !fs.existsSync(built) && 'apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first' }, () => {
    const pages = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name !== '_astro' && entry.name !== 'pagefind') walk(path.join(dir, entry.name));
        else if (entry.name.endsWith('.html')) pages.push(path.join(dir, entry.name));
      }
    };
    walk(path.join(docs, 'dist'));
    // A page with no head of its own is Astro's redirect for a moved address, which loads nothing.
    const withHead = pages.map((file) => [file, fs.readFileSync(file, 'utf8')]).filter(([, html]) => /<meta charset=/i.test(html));
    assert.ok(withHead.length > 500, `${withHead.length} pages`);
    const wrong = withHead.filter(([, html]) => html.split(`<template data-docs-speculation-rules>${SCRIPT}</template>`).length !== 2 || html.split(SCRIPT).length !== 2).map(([file]) => path.relative(docs, file));
    assert.deepEqual(wrong.slice(0, 10), [], `${wrong.length} of ${withHead.length} pages`);
  });
});

describe('the move from one page to the next (styles/frame.css)', () => {
  const css = read('src/styles/frame.css');
  test('is a view transition, and none while motion is reduced', () => {
    assert.match(css, /^@view-transition \{\n {2}navigation: auto;\n\}$/m);
    assert.match(css, /^@media \(prefers-reduced-motion: reduce\) \{\n {2}@view-transition \{\n {4}navigation: none;\n {2}\}\n\}$/m);
  });
  test('cross-fades the page at the pace and on the curve of the motion tokens, and keeps the frame where it is', () => {
    assert.match(css, /::view-transition-new\(root\) \{\n {2}animation-duration: var\(--tanrei-sys-motion-role-state-large\);\n {2}animation-timing-function: var\(--tanrei-sys-motion-easing-state\);\n\}/);
    assert.match(css, /^tanrei-app-shell > \[slot='header'\] \{\n {2}view-transition-name: docs-header;\n\}$/m);
    assert.match(css, /^tanrei-app-shell > tanrei-navigation-drawer\.docs-sidebar \{\n {2}view-transition-name: docs-sidebar;\n\}$/m);
    const transition = css.slice(css.indexOf('@view-transition'));
    assert.doesNotMatch(transition, /\d(ms|s)\b|cubic-bezier|\bease\b/, 'no duration or curve of its own');
  });
});
