// Where the site loads the web package's stylesheets, held from the sources.
//
// Every one of them is written in `@layer tanrei.components`, and on this site the `tanrei` layers come before
// Starlight's (`@tanrei/web/tokens.css` is the first stylesheet of the page): a component stylesheet that arrives as
// it is written loses to every rule of Starlight's layers — the reset (`* { margin: 0 }`) first. So each is loaded
// into a layer of the docs' own, after Starlight's (styles/prose.css says how), once, for every page: a stylesheet
// loaded by one component of the site reaches only the pages that use that component, and a page that draws the same
// element without it takes whatever copy another bundle brings — Theme Studio's carries the Tree view's and the
// Accordion's, in `tanrei.components`. That is how the Tree view's page came to draw the chevron under the icon.
//
// What the page then draws is asked of a browser in test/browser/previews.test.mjs; this holds the cause.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../', import.meta.url));
const src = path.join(docs, 'src');
const web = JSON.parse(fs.readFileSync(path.join(docs, '../../packages/web/package.json'), 'utf8'));

// Every stylesheet the package exports by name (not the presets under systems/, which a frame links where it shows one).
const shipped = Object.keys(web.exports)
  .filter((key) => /^\.\/[a-z-]+\.css$/.test(key))
  .map((key) => key.slice(2));

// The two the framework's `customCss` loads (astro.config.mjs): the tokens are custom properties in `tanrei.tokens`, and
// the icon set's class sets the glyph's face, which no rule of Starlight's sets. And the two whose rules prose.css
// carries word for word (packages/web/src/styles/steps.test.ts and timeline.test.ts hold that they are the same). And
// two the site does not load: the page's base, because the site's page is Starlight's, which sets its own background,
// color and face; and tanrei.css, which is the base, the tokens and every other one of them in one file.
const ELSEWHERE = {
  'base.css': 'not loaded',
  'tanrei.css': 'not loaded',
  'tokens.css': 'customCss',
  'icons.css': 'customCss',
  'steps.css': 'prose.css',
  'timeline.css': 'prose.css',
};

const files = (dir, pattern) =>
  fs.readdirSync(dir, { recursive: true, withFileTypes: false }).filter((name) => pattern.test(name)).map((name) => path.join(dir, name));
// The site's own sources: its stylesheets, components, pages and libraries — not the pages' content, whose
// `@tanrei/web/*.css` are code samples.
const sources = [...files(path.join(src, 'styles'), /\.css$/), ...files(path.join(src, 'components'), /\.(astro|ts|mjs)$/), ...files(path.join(src, 'pages'), /\.(astro|ts)$/), ...files(path.join(src, 'lib'), /\.(ts|mjs)$/)];
const read = (file) => fs.readFileSync(file, 'utf8');
const rel = (file) => path.relative(docs, file);

test('every stylesheet the web package ships is loaded into a layer of the docs’ own, in styles/', () => {
  const styles = files(path.join(src, 'styles'), /\.css$/).map(read).join('\n');
  const config = fs.readFileSync(path.join(docs, 'astro.config.mjs'), 'utf8');
  const missing = shipped.filter((name) => {
    if (ELSEWHERE[name] === 'not loaded') return false;
    if (ELSEWHERE[name] === 'customCss') return !config.includes(`'@tanrei/web/${name}'`);
    if (ELSEWHERE[name] === 'prose.css') return !new RegExp(`@import '@tanrei/web/prose\\.css' layer\\(docs\\.`).test(styles);
    return !new RegExp(`@import '@tanrei/web/${name.replace('.', '\\.')}' layer\\(docs\\.[a-z-]+\\);`).test(styles);
  });
  assert.deepEqual(missing, [], `not loaded into a docs layer by src/styles/: ${missing.join(', ')}`);
});

test('no source of the site loads one of them any other way', () => {
  const found = [];
  for (const file of sources) {
    for (const [line, text] of read(file).split('\n').entries()) {
      // An `@import` outside a docs layer, or an import from a script (which Vite puts in the page as written).
      if (/@import\s+['"]@tanrei\/web\/[^'"]+\.css['"]/.test(text) && !/layer\(docs\.[a-z-]+\)/.test(text)) found.push(`${rel(file)}:${line + 1}: ${text.trim()}`);
      if (/^\s*import\s+['"]@tanrei\/web\/[^'"]+\.css['"]/.test(text)) found.push(`${rel(file)}:${line + 1}: ${text.trim()}`);
      // Loaded by a component, it reaches only the pages that use that component.
      if (!file.startsWith(path.join(src, 'styles')) && /@import\s+['"]@tanrei\/web\/[^'"]+\.css['"]/.test(text)) found.push(`${rel(file)}:${line + 1}: loaded by one component, not by styles/: ${text.trim()}`);
    }
  }
  assert.deepEqual(found, []);
});
