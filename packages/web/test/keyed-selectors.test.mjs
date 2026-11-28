// The package's light-DOM stylesheets, as built (`dist/*.css`, and the presets' `dist/systems/*.css`), are the page's
// own: every element of the page is tried against them. What a rule costs the page is decided by two names it holds
// (test/light-selectors.js says how an engine reads them):
//
// 1. The name its LAST compound holds — a tag, a class, an id, an attribute, `:root` or `:host` — under which an
//    engine files it, and tries it on the elements of that name alone. A rule with none is tried on every element.
// 2. A name among its ANCESTOR compounds, which the engine's filter of ancestors reads to reject an element at once.
//    A rule that asks where an element stands among its siblings (`:first-child`, `:last-child`, `:nth-child()`, `+`,
//    `~`) and that the filter cannot reject is matched on `<body>`, and on any element a script puts on `<html>`, and
//    Firefox marks the parent of each element it asks: `<html>` then restyles all of `<body>` when a child comes or
//    goes. On the docs Button page in Firefox one such rule — a nested `& > :where(div:first-child)` under a parent of
//    two selectors, which the filter cannot read — made a child added to `<html>` and taken off again cost about
//    140 ms; written out once per selector, 2 ms.
//
// The lists below are what the stylesheets cannot say otherwise without matching other elements: each entry with its
// reason. They only shrink: an entry that no rule needs any more fails until it is taken off.
// Run after the build, by `pnpm --filter @tanrei/web test:node`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ALL } from '../scripts/stylesheets.js';
import { ancestorFiltered, compoundsOf, filed, structural, styleSelectors } from './light-selectors.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(pkg, 'dist');

// ── Reasons ────────────────────────────────────────────────────────────────────────────────────────────────────────
const SETTLING =
  'the settling rule (settleRule(), src/styles/motion.ts): every element inside a settling element, whatever it is; the element is its ancestor, which the filter reads, and the rule asks nothing of siblings';
const CONTENT =
  "the product's own content in a part, whatever element it is (a paragraph, a list, a component); the part is its ancestor, which the filter reads";
const ROW =
  "a tree item's row is its first child element, whatever it is (a span, a div, a product's link: specs/tree-view.spec.json); the item and the tree are its ancestors, which the filter reads";
const LABEL = 'the label is whatever element of the row or summary is not one of its named parts; the row is its ancestor, which the filter reads';
const LANGUAGE = 'text in a language is any element that says it; the part is its ancestor, which the filter reads';
const PROSE_LANGUAGE = 'prose sets its own text by the language of any element (PRS-20), wherever it stands: prose.test.ts counts these rules';
const FOLLOWS =
  'prose spaces an element by the one it follows, whatever the two are (PRS-7), at any depth: there is no ancestor to name, and prose.test.ts counts these rules';
const FOLLOWS_NAMED =
  'prose spaces a named element by the one it follows, at any depth (PRS-7): no ancestor to name; it asks a sibling, not an edge, and only of the elements of its name';
const PAIR =
  'a pair of previous and next links is classes on the product\'s own markup: an item is told by its class wherever the product puts it, and only the elements of that class are asked';

/** Rules whose last compound holds no name: `<file>` → `<last compound, its pseudo-element taken off>` → reason. */
const UNKEYED = {
  'accordion.css': {
    ':where(:not(.tanrei-icon, [data-supporting-text], [data-trailing-text], .ripple))': LABEL,
    ':not([data-tanrei-appear])': SETTLING,
  },
  'app-shell.css': { ':not([data-tanrei-appear])': SETTLING },
  'avatar.css': {
    ':where(*)': "an avatar's own content before it is defined, whatever element it is; the avatar is its parent, which the filter reads",
    ':where(:not(tanrei-avatar))': "what a group holds beside its avatars before it is defined, whatever element it is; the group is its parent, which the filter reads",
  },
  'breadcrumbs.css': { ':not([data-tanrei-appear])': SETTLING },
  'description-list.css': { ':where(:lang(ja), :lang(zh))': LANGUAGE, ':not([data-tanrei-appear])': SETTLING },
  'figure.css': {
    ':where(*)': CONTENT,
    ':where(:first-child)': CONTENT,
    ':where(:last-child)': CONTENT,
    ':not([data-tanrei-appear])': SETTLING,
  },
  'link-card.css': { ':where(*)': CONTENT, ':not([data-tanrei-appear])': SETTLING },
  'page-header.css': { ':where(*)': CONTENT, ':where(* + *)': CONTENT, ':not([data-tanrei-appear])': SETTLING },
  'prose.css': {
    ':where(:lang(ja), :lang(zh), :lang(ko))': PROSE_LANGUAGE,
    ':where(:lang(ja), :lang(zh))': PROSE_LANGUAGE,
    ':where(:is(.tanrei-prose, section, article, div, blockquote, dd) > :not(style, script, template, link, meta, [hidden]) ~ *)': FOLLOWS,
    ':where(:is(blockquote, dd) > * + *)': FOLLOWS,
    ':where(li > p ~ *)': FOLLOWS,
    ':where(:is(h1, .tanrei-prose-heading:has(> h1)) + *)': FOLLOWS,
    ':where(:is(h2, .tanrei-prose-heading:has(> h2)) + *)': FOLLOWS,
    ':where(:is(h3, .tanrei-prose-heading:has(> h3)) + *)': FOLLOWS,
    ':where(:is(h4, .tanrei-prose-heading:has(> h4)) + *)': FOLLOWS,
    ':where(:is(h5, .tanrei-prose-heading:has(> h5)) + *)': FOLLOWS,
    ':where(:is(h6, .tanrei-prose-heading:has(> h6)) + *)': FOLLOWS,
    ':where(hr + *)': FOLLOWS,
    ':where(:is([data-footnotes], .footnotes) > .sr-only + *)': FOLLOWS,
    // The steps' and the timeline's own rules, which the build writes again after prose's (scripts/build.js).
    ':where(*)': CONTENT,
    ':where(* + *)': CONTENT,
    ':where(:is(.tanrei-steps-title, h2, h3, h4, h5, h6):first-child + *)': CONTENT,
    ':where(:is(.tanrei-timeline-marker, .tanrei-timeline-status) + *)': CONTENT,
    ':where(.tanrei-timeline-time + *)': CONTENT,
    ':where(:is(.tanrei-timeline-title, :is(h2, h3, h4, h5, h6):is(:first-child, :is(.tanrei-timeline-marker, .tanrei-timeline-status, .tanrei-timeline-time) + *)) + *)': CONTENT,
  },
  'skeleton.css': { ':not([data-tanrei-appear])': SETTLING },
  'steps.css': {
    ':where(*)': CONTENT,
    ':where(* + *)': CONTENT,
    ':where(:is(.tanrei-steps-title, h2, h3, h4, h5, h6):first-child + *)': CONTENT,
  },
  'table-of-contents.css': { ':not([data-tanrei-appear])': SETTLING },
  'table.css': {
    // A row's cells are `th` and `td` by the HTML parser, but a script may put any element in a row, and these rules
    // place whatever is first there: a name would leave such an element where the column no longer is.
    ':where(:lang(ja), :lang(zh))': LANGUAGE,
    ':where(*)': CONTENT,
    ':where(:only-child:not([role=\'status\']))': CONTENT,
    ':where(:first-child)': CONTENT,
    ':where([data-part=\'selection\']:first-child + *)': CONTENT,
    ':where(:first-child:not([data-part=\'selection\']), [data-part=\'selection\']:first-child + *)': CONTENT,
    ':not([data-tanrei-appear])': SETTLING,
  },
  'timeline.css': {
    ':where(*)': CONTENT,
    ':where(* + *)': CONTENT,
    ':where(:is(.tanrei-timeline-marker, .tanrei-timeline-status) + *)': CONTENT,
    ':where(.tanrei-timeline-time + *)': CONTENT,
    ':where(:is(.tanrei-timeline-title, :is(h2, h3, h4, h5, h6):is(:first-child, :is(.tanrei-timeline-marker, .tanrei-timeline-status, .tanrei-timeline-time) + *)) + *)': CONTENT,
  },
  'tree-view.css': {
    ':where(:first-child:not(ul, ol))': ROW,
    ':where(:first-child:not(ul, ol, :only-child))': ROW,
    ':where(:first-child)': ROW,
    ':where(:first-child:not(ul, ol, :only-child):hover)': ROW,
    ':where(:first-child:not(ul, ol):hover)': ROW,
    ':where(:first-child:not(ul, ol):is(:focus-visible, [data-tanrei-filter-active]))': ROW,
    ':where(:first-child:not(ul, ol):focus)': ROW,
    ':where(:not(.tanrei-icon, [data-supporting-text], [data-trailing], [data-trailing-text], [data-tanrei-loading-box], .ripple, [data-tanrei-edit], [data-tanrei-tip]))': LABEL,
    ':where(:not(.tanrei-icon, [data-supporting-text], [data-trailing], [data-trailing-text], [data-tanrei-loading-box], .ripple):has(> bdi, > [dir]))': LABEL,
    ':not([data-tanrei-appear])': SETTLING,
  },
};

/** Rules that ask of siblings and that the filter of ancestors cannot reject: `<file>` → `<selector>` → reason. */
const UNFILTERED = {
  'previous-next-links.css': {
    ':where(.tanrei-previous-next-links-label:not(:empty) + .tanrei-previous-next-links-title)': PAIR,
    ":where(.tanrei-previous-next-links-item[data-direction='previous'] ~ .tanrei-previous-next-links-item[data-direction='previous'])": PAIR,
    ":where(.tanrei-previous-next-links-item:is([data-direction='next'], :not([data-direction])) ~ .tanrei-previous-next-links-item:is([data-direction='next'], :not([data-direction])))": PAIR,
  },
  'prose.css': Object.fromEntries([
    [':where(:is(.tanrei-prose, section, article, div, blockquote, dd) > :not(style, script, template, link, meta, [hidden]) ~ *)', FOLLOWS],
    [':where(:is(blockquote, dd) > * + *)', FOLLOWS],
    [':where(li + li)', FOLLOWS_NAMED],
    [':where(dd):where(dt + *, dd + *)', FOLLOWS_NAMED],
    [':where(dd + dt)', FOLLOWS_NAMED],
    ...['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].flatMap((h) => [
      [`:where(${h}):where(:is(.tanrei-prose, section, article, div, blockquote, dd, li) > :not(style, script, template, link, meta, [hidden]) ~ *)`, FOLLOWS_NAMED],
      [`:where(.tanrei-prose-heading:has(> ${h})):where(:is(.tanrei-prose, section, article, div, blockquote, dd, li) > :not(style, script, template, link, meta, [hidden]) ~ *)`, FOLLOWS_NAMED],
      [`:where(:is(${h}, .tanrei-prose-heading:has(> ${h})) + *)`, FOLLOWS],
    ]),
    ...['hr', '[data-footnotes]', '.footnotes'].map((name) => [`:where(${name}):where(:is(.tanrei-prose, section, article, div, blockquote, dd, li) > :not(style, script, template, link, meta, [hidden]) ~ *)`, FOLLOWS_NAMED]),
    [':where(hr + *)', FOLLOWS],
    [':where(:is([data-footnotes], .footnotes) > .sr-only + *)', FOLLOWS],
  ]),
};

/** The light-DOM stylesheets as built: every `.css` of `dist/` but the one file that holds them all, and the presets'. */
function sheets() {
  const own = fs.readdirSync(dist).filter((name) => name.endsWith('.css') && `./${name}` !== ALL);
  const systems = fs.readdirSync(path.join(dist, 'systems')).filter((name) => name.endsWith('.css')).map((name) => `systems/${name}`);
  return [...own, ...systems].map((name) => ({ name, css: fs.readFileSync(path.join(dist, name), 'utf8') }));
}

const lastOf = (selector) => compoundsOf(selector).at(-1).text.replace(/::[\w-]+(\([^()]*\))?$/, '');

/** What `find(selector)` reports in each sheet, against `allowed`: what is not allowed, and the entries nothing needs. */
function check(allowed, find) {
  const found = new Map();
  for (const { name, css } of sheets()) {
    for (const selector of styleSelectors(css)) {
      const key = find(selector);
      if (key !== null) found.set(`${name}: ${key}`, selector);
    }
  }
  const listed = Object.entries(allowed).flatMap(([file, entries]) => Object.keys(entries).map((key) => `${file}: ${key}`));
  return {
    refused: [...found].filter(([key]) => !listed.includes(key)).map(([key, selector]) => `${key}  (in ${selector})`),
    stale: listed.filter((key) => !found.has(key)),
  };
}

test('the reading of a selector: the name of its last compound, and whether the filter of ancestors can reject it', () => {
  // Filed under a name: a tag, a class, an id, an attribute, :root, :host — or :where()/:is() of selectors that all are.
  for (const compound of ['li', 'li:first-child', '.tanrei-steps', '#a', "[data-part='actions']", ':root', ':where(li)', ':where(:is(th, td):first-child)', ':where(a, span):where(:last-child)', ':where(li > p:first-child)', 'li::before', '*|li']) {
    assert.equal(filed(compound), true, compound);
  }
  for (const compound of ['*', ':first-child', ':where(*)', ':where(* + *)', ':where(:first-child:not(ul, ol))', ':not([data-x])', ':where(:lang(ja), :lang(zh))', ':where(li, :first-child)', ':where(:first-child)::before']) {
    assert.equal(filed(compound), false, compound);
  }
  // Asks of siblings: an edge, a count, or a sibling combinator — not inside :has(), which asks the descendants.
  for (const selector of [':first-child', 'a + b', ':where(hr + *)', ':where(li) > :where(:not(:last-child))', 'td:nth-child(2)', 'p ~ *']) assert.equal(structural(selector), true, selector);
  for (const selector of ['li:has(> :first-child)', "[class~='a']", 'a > b', ':where(li:has(+ li))']) assert.equal(structural(selector), false, selector);
  // Rejected by the filter: an ancestor of a name, or :where()/:is() of ONE selector that has one — never a list of several.
  for (const selector of [':where(li) > :where(:first-child)', ':where(x-dl) > :where(dl) > :where(div:first-child)', ':is(:where(x-dl) > :where(dl)) > :where(div:first-child)', ':where(li > :first-child)', ':is(:where(x-b) > :where(a, span)):where(:last-child)', ':where(input):where(li > [type=checkbox]:first-child)']) {
    assert.equal(ancestorFiltered(selector), true, selector);
  }
  for (const selector of [':where(hr + *)', ':first-child', ':root > :first-child', ':is(:where(x-dl) > :where(dl), :where(x-dd) > :where(dl)) > :where(div:first-child)', ':where(input):where(li > [type=checkbox]:first-child, li > p > [type=checkbox])', ':is(a, b) > :first-child']) {
    assert.equal(ancestorFiltered(selector), false, selector);
  }
  // A nested rule is read as the engine reads it: `&` is :is() of the parent's whole list.
  assert.deepEqual(styleSelectors(':where(a) > :where(dl), :where(b) > :where(dl) { color: red; & > :where(div:first-child) { color: blue } } @media print { li { x: y } } @keyframes k { from { x: y } }'), [
    ':where(a) > :where(dl)',
    ':where(b) > :where(dl)',
    ':is(:where(a) > :where(dl), :where(b) > :where(dl)) > :where(div:first-child)',
    'li',
  ]);
});

test('every light-DOM rule is filed under a name its last compound holds, but those listed with their reason', () => {
  const { refused, stale } = check(UNKEYED, (selector) => (filed(compoundsOf(selector).at(-1).text) ? null : lastOf(selector)));
  assert.deepEqual(refused, [], 'give the last compound a tag or a class (`:where(li)`, `:where(.x):first-child`) that matches the same elements');
  assert.deepEqual(stale, [], 'these entries are needed by no rule: take them off');
});

test('every light-DOM rule that asks of siblings can be rejected by the filter of ancestors, but those listed with their reason', () => {
  const { refused, stale } = check(UNFILTERED, (selector) => (structural(selector) && !ancestorFiltered(selector) ? selector : null));
  assert.deepEqual(
    refused,
    [],
    'name an ancestor in a compound of its own (`:where(dl) > :where(div:first-child)`), not only inside `:is()` of a list — the `&` of a nested rule under a parent of several selectors is one: write the rule out once per selector',
  );
  assert.deepEqual(stale, [], 'these entries are needed by no rule: take them off');
});
