// What the site draws with Tanrei's own components, held from the sources: the site's components (`src/components/`,
// `src/pages/`), its pages in every language (`src/content/docs/`) and its stylesheets.
//
// - No component of the site writes a native control, a disclosure, a dialog or a meter of its own: a choice of one
//   is Tanrei's Radio group or, where it switches what is drawn, its Tabs, a setting that is on or off its Switch, a
//   measure its Progress indicator. What a Tanrei element is written around — the Table's `<table>`, the Description
//   list's `<dl>` — is that element's own form.
// - No page writes one either, outside a code sample and outside the native parts a Tanrei element takes (the
//   Table's sort button, the Accordion's `<details>`). The places still owed are named, each with what it waits for;
//   a place leaves the list when it is drawn by a component, and none may join it.
// - Each adoption stays: the contrast in the header's menu, the typescale's switch, a component's states, the
//   platforms of a component, a choice of kind — with its words from the dictionary, in the six languages, and with
//   the room it takes kept before its element is defined.
// - The theme file dresses no part of the framework's that the site no longer draws.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { strings } = await import('../src/lib/i18n.ts');
const { source, translations } = await import('../i18n/locales.mjs');

const root = fileURLToPath(new URL('../src/', import.meta.url));
const read = (file) => fs.readFileSync(root + file, 'utf8');
const under = (dir, pattern) =>
  fs
    .readdirSync(root + dir, { recursive: true })
    .map((file) => `${dir}/${String(file).replaceAll('\\', '/')}`)
    .filter((file) => pattern.test(file));
const folders = translations.map(({ dir }) => `${dir}/`);
/** A page's path without its language's folder. */
const pageOf = (file) => folders.reduce((path, folder) => (path.startsWith(`content/docs/${folder}`) ? `content/docs/${path.slice(`content/docs/${folder}`.length)}` : path), file);

/** What an `.astro` file draws: its template, without the front matter, the scripts, the styles and the comments. */
const template = (text) =>
  text
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, '')
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<style\b[\s\S]*?<\/style>/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
/** What a page draws: its text without the code it shows (fenced blocks, inline code, strings given to a code block) and without comments. */
const drawn = (text) =>
  text
    .replace(/^[ \t]*(`{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm, '')
    .replace(/\{`[\s\S]*?`\}/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
/** The same text without what stands inside the elements of `tag`. */
const outside = (text, tag) => text.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, 'g'), '');

const NATIVE = /<(input|select|textarea|button|details|summary|dialog|fieldset|progress|meter)\b/g;

describe('the site’s own components', () => {
  const files = [...under('components', /\.astro$/), ...under('pages', /\.astro$/)];
  // The keys of a component's keyboard table are a spec's phrases («Tab / Shift+Tab», «Printable characters»), not
  // chords the Keyboard shortcut can draw.
  const KEYS_OWED = new Set(['components/ComponentAccessibility.astro']);

  test('there are components to read', () => assert.ok(files.length > 40, String(files.length)));
  test('write no native control, disclosure, dialog or meter', () => {
    for (const file of files) {
      const found = [...template(read(file)).matchAll(NATIVE)].map(([tag]) => tag);
      assert.deepEqual(found, [], `${file} draws ${found.join(', ')} by hand`);
    }
  });
  test('write a key by hand in one place only, the one this list names', () => {
    const written = files.filter((file) => /<kbd\b/.test(template(read(file))));
    assert.deepEqual(new Set(written), KEYS_OWED);
  });
  test('write a native table only inside Tanrei’s Table', () => {
    for (const file of files) {
      if (file === 'components/Table.astro') continue;
      const text = outside(template(read(file)), 'Table');
      assert.doesNotMatch(text, /<table\b/, `${file} writes a table outside <Table>`);
    }
  });
  test('write a list of facts only inside Tanrei’s Description list', () => {
    for (const file of files) assert.doesNotMatch(outside(template(read(file)), 'tanrei-description-list'), /<dl\b/, `${file} writes a dl outside the description list`);
  });
});

describe('the pages, in every language', () => {
  const pages = under('content/docs', /\.mdx?$/);
  /** The native elements a page may still write by hand, by the page: each waits for a component to draw it. */
  const OWED = {
    // The fill rule's example presses a native button and shows a row of hand-made tabs.
    'content/docs/foundations/icons.mdx': ['button'],
  };
  /** A key written in running text: a spec's phrase, not a chord the Keyboard shortcut can draw. */
  const KEYS_OWED = new Set(['content/docs/foundations/behaviour.mdx']);

  // A new page stands in English and Japanese before its other languages (the i18n check counts those as fallbacks),
  // so the count is not a multiple of six at every commit.
  test('there are pages to read', () => {
    assert.ok(pages.length >= 600, String(pages.length));
  });
  test('write no native control outside a code sample and outside the native parts a Tanrei element takes', () => {
    for (const file of pages) {
      let text = drawn(read(file));
      // The Table's sort button stands in its header cell; the Accordion's items are `<details>` with a `<summary>`.
      text = outside(text, 'tanrei-table');
      text = outside(text, 'tanrei-accordion');
      const found = [...new Set([...text.matchAll(NATIVE)].map(([, name]) => name))];
      assert.deepEqual(found, OWED[pageOf(file)] ?? [], `${file} draws ${found.join(', ')} by hand`);
    }
  });
  test('the pages still owed are true: each writes what the list says, in every language', () => {
    for (const [page, names] of Object.entries(OWED)) {
      for (const folder of ['', ...folders]) {
        const text = drawn(read(page.replace('content/docs/', `content/docs/${folder}`)));
        for (const name of names) assert.match(text, new RegExp(`<${name}\\b`), `${folder}${page}`);
      }
    }
  });
  test('write a key by hand on one page only, the one this list names', () => {
    const written = new Set(pages.filter((file) => /<kbd\b/.test(drawn(read(file)))).map(pageOf));
    assert.deepEqual(written, KEYS_OWED);
  });
  test('write a native table only inside Tanrei’s Table', () => {
    for (const file of pages) assert.doesNotMatch(outside(drawn(read(file)), 'tanrei-table'), /<table\b/, file);
  });
});

describe('each adoption', () => {
  const languages = [source, ...translations].map(({ lang }) => lang);
  const said = (keys) => {
    for (const lang of languages) for (const key of keys) assert.ok(String(strings(lang)[key] ?? '').trim(), `${lang}: ${key}`);
  };

  test('the contrast is chosen in the header’s Appearance panel, in the page’s language, and no frame has a control of its own', () => {
    const panel = template(read('components/frame/Appearance.astro'));
    // Three tabs of one row without panels, the panel's second choice: the page's contrast, which every example follows.
    assert.match(panel, /<tanrei-tabs class="docs-appearance-contrast" label=\{t\.contrast\} value="standard" size="small" full-width>\s*<tanrei-tab value="standard" label=\{t\.contrastStandard\} \/>\s*<tanrei-tab value="medium" label=\{t\.contrastMedium\} \/>\s*<tanrei-tab value="high" label=\{t\.contrastHigh\} \/>/);
    said(['contrast', 'contrastStandard', 'contrastMedium', 'contrastHigh']);
    // The choice is the appearance's (lib/appearance.ts), which the head's script reads before the first paint.
    assert.match(read('components/frame/Header.astro'), /setAppearance\(\{ contrast: control\.value as Contrast \}\)/);
    assert.match(read('components/frame/ThemeProvider.astro'), /appearanceBootstrap\(bootConfig\(/);
    // An example follows the page's look: its header offers no switch of system, scheme or contrast.
    const frame = template(read('components/visuals/Example.astro'));
    assert.doesNotMatch(frame, /<tanrei-tabs\b[^>]*\b(group="page-contrast"|data-docs-contrast|data-docs-visual-system)/);
  });
  test('the typescale’s flip is a Switch, named in the page’s language', () => {
    const text = template(read('components/tokens/Typescale.astro'));
    assert.match(text, /<tanrei-switch class="flip" label=\{t\.emphasizedToggle\} data-typescale-emphasized \/>/);
    said(['emphasizedToggle']);
  });
  test('a control that can do nothing without script is not drawn where none runs, and holds its room until it is defined', () => {
    for (const [file, name] of [['components/tokens/Typescale.astro', '.flip'], ['components/ListingSwitch.astro', '.docs-listing'], ['components/frame/PageActions.astro', '.docs-page-actions']]) {
      const text = read(file);
      const escaped = name.replace('.', '\\.');
      // Written with `:not(:defined)`, as the rule that holds the room is: a rule of the class alone would lose to it.
      assert.match(text, new RegExp(`@media \\(scripting: none\\) \\{\\s*${escaped}:not\\(:defined\\) \\{\\s*display: none;`), `${file}: ${name} without script`);
      assert.match(text, new RegExp(`${escaped}:not\\(:defined\\) \\{[^}]*visibility: hidden;`), `${file}: ${name} before it is defined`);
    }
    // A frame's actions: drawn from a template once the frame is near the view, the room of their buttons held until
    // then, and nothing drawn without script.
    const frame = read('components/visuals/Example.astro');
    assert.match(frame, /@media \(scripting: none\) \{\s*\[data-example-actions\]:has\(> template:first-child\) \{\s*display: none;/);
    assert.match(frame, /\[data-example-actions\]:has\(> template:first-child\) \{[^}]*min-block-size: var\(--tanrei-comp-button-container-height-small\);/);
  });
  test('a component’s states and a choice’s values are Tag groups of tags, each word given to the search index', () => {
    const tag = read('components/NameTag.astro');
    assert.match(template(tag), /<tanrei-tag class="docs-name-tag" size="small" variant=\{variant\} label=\{label\} data-pagefind-index-attrs="label" \/>/);
    assert.match(tag, /\.docs-name-tag:not\(:defined\)::before \{\s*content: attr\(label\);/);
    const specs = template(read('components/ComponentSpecs.astro'));
    assert.match(specs, /<tanrei-tag-group class="states docs-name-tags not-content" spacing="tags" label=\{t\.states\}>\s*\{spec\.states\.map\(\(state\) => <><NameTag label=\{state\} \/>\{' '\}<\/>\)\}/);
    const choice = template(read('components/tokens/BehaviorChoice.astro'));
    assert.match(choice, /<tanrei-tag-group class="docs-name-tags" spacing="tags" label=\{t\.choiceValues\}>/);
    said(['states', 'choiceValues', 'choiceDefault']);
  });
  test('the platforms of a component are a Description list, a platform to a fact', () => {
    const text = template(read('components/ComponentAvailability.astro'));
    assert.match(text, /<div role="group" aria-label=\{t\.availability\}>\s*<tanrei-description-list class="platforms" layout="stacked" separation="gap" columns=\{platforms\.length\}>\s*<dl>/);
    assert.doesNotMatch(text, /role="list(item)?"/);
    said(['availability']);
  });
});

describe('the theme file', () => {
  test('dresses no part of the framework’s that the site draws with Tanrei', () => {
    const css = read('styles/tanrei-theme.css').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /\.sl-(link-card|link-button|badge)\b|starlight-tabs|(^|[\s,}])\.card\b/);
  });
  test('and no component or page of the site writes one of those parts', () => {
    for (const file of [...under('components', /\.astro$/), ...under('pages', /\.astro$/), ...under('content/docs', /\.mdx?$/)]) {
      assert.doesNotMatch(drawn(template(read(file))), /class="[^"]*\bsl-(link-card|link-button|badge)\b|<starlight-tabs\b/, file);
    }
  });
});
