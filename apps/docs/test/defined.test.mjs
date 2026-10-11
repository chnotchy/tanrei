// Where `:defined` stands in the site's own stylesheets: every `.css` file under `src/`, and every `<style>` an
// `.astro` component or an `.mdx` page writes.
//
// The rule is the web package's, and so is its reason (packages/web/src/styles/has.test.ts, the second test): an
// engine keeps ONE list, for the whole page, of the elements that rules written with `:defined` style under the
// element asked; when ANY element is defined — a table, a tab panel, the shell around the whole page — what is under
// it is gone through for that list. One rule that styles an element without a name (`tanrei-app-bar:not(:defined) > *`,
// `… > :not(tanrei-button)`) makes the list "everything", and every definition styles its element's subtree whole.
// Six such selectors in styles/frame.css cost a docs page 30 to 80 ms of style time. So wherever `:defined` is asked
// of one element for the sake of another, that other has a name: a tag, a class, an id or an attribute — written in
// the compound, or in every selector of an `:is()` / `:where()` in it.
//
// The package reads its rules from a browser, as the engine prints them; this reads the source, with Node alone: the
// selectors are cut by the package's own reading (packages/web/test/selectors.ts), and the three questions asked of a
// selector below are the ones written in the package's test, word for word — a change of the rule is made in both.
// A component's scoped `<style>` is read as written, with `:global()` taken off: the build adds the component's own
// attribute to each compound, which only ever gives an element a name.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { compounds, functions, list } = await import('../../../packages/web/test/selectors.ts');

const src = fileURLToPath(new URL('../src', import.meta.url));

// ── The three questions (packages/web/src/styles/has.test.ts) ────────────────────────────────────────────────────────

/** A compound an engine can name: a tag, a class, an id or an attribute written in it, or in every selector of an `:is()` / `:where()` in it. */
function nameable(compound) {
  let outside = '';
  let depth = 0;
  for (const char of compound) {
    if (char === '(') depth += 1;
    if (depth === 0) outside += char;
    if (char === ')') depth -= 1;
  }
  if (/(?:^|[^:\w-])[a-z][\w-]*|[.#][\w-]+|\[/i.test(outside.replace(/::?[\w-]+/g, ''))) return true;
  return functions(compound).some((fn) => ['is', 'where'].includes(fn.name) && list(fn.argument).every((inner) => nameable(compounds(inner.text).at(-1).text)));
}
/** The pseudo-elements a rule may style for another element's sake: the element's own generated boxes, which carry its name. */
const OWN_BOXES = ['::before', '::after', '::marker'];
/** Whether the element `selector` styles is one an engine can name. */
function stylesANamedElement(selector) {
  const pseudo = /::[\w-]+(?:\([^()]*\))?$/.exec(selector)?.[0];
  if (pseudo && !OWN_BOXES.includes(pseudo)) return false;
  return nameable(compounds(pseudo ? selector.slice(0, -pseudo.length) : selector).at(-1).text);
}
/** Whether `:defined` is asked of one element for the sake of another: it stands in a compound that is not the one the rule styles. */
function definedForAnother(selector) {
  const pseudo = /::[\w-]+(?:\([^()]*\))?$/.exec(selector)?.[0];
  const all = compounds(pseudo ? selector.slice(0, -pseudo.length) : selector);
  // A selector that is one `:is()` / `:where()` around the whole of it is read as what it holds.
  if (all.length === 1) {
    const [only] = functions(all[0].text).filter((fn) => ['is', 'where'].includes(fn.name));
    if (only && all[0].text.replace(/^:(?:is|where)\(/, '').slice(0, -1) === only.argument && list(only.argument).length === 1) return definedForAnother(only.argument);
  }
  return all.slice(0, -1).some((compound) => compound.text.includes(':defined'));
}

// ── Reading the source ───────────────────────────────────────────────────────────────────────────────────────────────

/** `:global(x)` is `x`: a component's word for "not this component's own", which says nothing of the element. */
function withoutGlobal(selector) {
  let out = selector;
  for (let at = out.indexOf(':global('); at !== -1; at = out.indexOf(':global(')) {
    let end = at + 8;
    for (let open = 1; end < out.length && open; end++) open += out[end] === '(' ? 1 : out[end] === ')' ? -1 : 0;
    out = out.slice(0, at) + out.slice(at + 8, end - 1) + out.slice(end);
  }
  return out;
}

/**
 * Every style rule's selector in a stylesheet's text, written out: a nested rule's `&` is its parent's selector, and a
 * nested rule without one is under its parent — as the package's reading writes them. Rules inside `@media`,
 * `@container`, `@layer`, `@supports` and `@scope` are read; what an at-rule's own block holds that is not a selector
 * (a keyframe's `from`, a `@font-face`) holds no `:defined` and is passed over by the tests below.
 */
function selectors(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found = [];
  /** The open blocks: each with the selector its rules nest under (`null` at the top and inside an at-rule there). */
  const open = [null];
  let prelude = '';
  let quote = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      prelude += char;
      if (char === '\\') prelude += text[++i] ?? '';
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth -= 1;
    if (depth === 0 && char === '{') {
      const written = prelude.trim().replace(/\s+/g, ' ');
      const parent = open.at(-1);
      if (written.startsWith('@') || written === '') open.push(parent);
      else {
        const own = withoutGlobal(written);
        const selector = parent === null ? own : list(own).map((part) => (part.text.includes('&') ? part.text.replaceAll('&', `:is(${parent})`) : `:is(${parent}) ${part.text}`)).join(', ');
        found.push(selector);
        open.push(selector);
      }
      prelude = '';
    } else if (depth === 0 && char === '}') {
      open.pop();
      prelude = '';
    } else if (depth === 0 && char === ';') prelude = '';
    else prelude += char;
  }
  assert.equal(open.length, 1, 'the braces of a stylesheet do not pair');
  return found;
}

/** Every file under `directory`, by its path. */
const files = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
/** The stylesheets a source file holds: a `.css` file is one; an `.astro` or `.mdx` file holds one per `<style>` (a fenced block of a page is a sample, text). */
function sheets(file) {
  const written = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.css')) return [written];
  const markup = file.endsWith('.mdx') ? written.replace(/^([ \t]*)(`{3,}|~{3,})[\s\S]*?^\1\2[ \t]*$/gm, '') : written;
  return [...markup.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((style) => style[1]);
}

describe('where :defined stands in the site’s stylesheets', () => {
  const read = files(src).filter((file) => /\.(css|astro|mdx)$/.test(file));
  const rules = read.flatMap((file) => sheets(file).flatMap(selectors).flatMap((selector) => list(selector).map((one) => ({ selector: one.text, file: path.relative(src, file) }))));
  const asking = rules.filter((rule) => rule.selector.includes(':defined'));

  test('the reading finds the site’s stylesheets, and the rules that ask', () => {
    assert.ok(read.some((file) => file.endsWith(path.join('styles', 'frame.css'))), 'styles/frame.css was not read');
    assert.ok(rules.length > 250, `${rules.length} selectors read: fewer than the site writes`);
    // The frame's stylesheet, the components' `<style>` blocks (scoped and global), both kinds are among them.
    assert.ok(asking.length > 40, `${asking.length} selectors with :defined: fewer than the site writes`);
    assert.ok(new Set(asking.map((rule) => rule.file)).size > 8);
    assert.ok(asking.some((rule) => rule.file.endsWith('.astro')) && asking.some((rule) => rule.file.endsWith('.css')));
    // Rules inside `@layer`, `@container` and `@media` are read, and `:global()` is taken off.
    assert.ok(asking.some((rule) => rule.selector === 'tanrei-app-shell > tanrei-navigation-drawer.docs-sidebar:not(:defined)'));
    assert.ok(asking.some((rule) => rule.selector === '.stage :not(:defined)'));
  });

  test(':defined is asked of the element a rule styles, or for an element the engine can name', () => {
    const forAnother = asking.filter((rule) => definedForAnother(rule.selector));
    // The frame draws its parts before their elements are defined: it asks for many other elements.
    assert.ok(forAnother.length > 15, `${forAnother.length} selectors ask :defined for another element: fewer than the frame writes`);
    assert.deepEqual(
      forAnother.filter((rule) => !stylesANamedElement(rule.selector)).map((rule) => `${rule.file}: ${rule.selector}`),
      [],
      'a rule asks :defined of one element and styles another that has no name (`*`, a `:not()` alone): name it by its tag, a class or an attribute — `:where()` around the name keeps the rule’s weight',
    );
  });

  test('the reading finds the shapes this was written for', () => {
    // The six selectors the frame's stylesheet had, each asked for another element and styling one with no name.
    for (const selector of [
      'tanrei-app-bar:not(:defined) > *',
      'tanrei-app-bar:not(:defined) > :not([data-app-shell-menu], .docs-wide-only, .docs-compact-only, .docs-site-title)',
      'tanrei-select.docs-theme:not(:defined) > *',
      '.docs-sidebar:not(:defined) tanrei-navigation-drawer-group:not([open]) > *',
      'tanrei-navigation-drawer.docs-sidebar:not(:defined) > :not(tanrei-button)',
      'tanrei-app-shell > tanrei-navigation-drawer.docs-sidebar:not(:defined) > *',
    ]) {
      assert.equal(definedForAnother(selector), true, selector);
      assert.equal(stylesANamedElement(selector), false, selector);
    }
    // What they are now.
    for (const selector of [
      'tanrei-app-bar:not(:defined) > :where([slot])',
      'tanrei-app-bar:not(:defined) > .docs-search',
      'tanrei-select.docs-theme:not(:defined) > :where(tanrei-option)',
      '.docs-sidebar:not(:defined) tanrei-navigation-drawer-group:not([open]) > :where(tanrei-navigation-drawer-group, tanrei-navigation-drawer-item)',
      'tanrei-navigation-drawer.docs-sidebar:not(:defined) > :is(tanrei-navigation-drawer-group, tanrei-navigation-drawer-item)',
    ]) {
      assert.equal(definedForAnother(selector), true, selector);
      assert.equal(stylesANamedElement(selector), true, selector);
    }
    // One selector of a list without a name leaves the compound without one; a pseudo-element a browser draws inside a control is not the element's own box.
    assert.equal(stylesANamedElement('tanrei-app-bar:not(:defined) > :where([slot], *)'), false);
    assert.equal(stylesANamedElement('tanrei-select:not(:defined) > input::placeholder'), false);
    assert.equal(stylesANamedElement('.docs-sidebar:not(:defined) tanrei-navigation-drawer-group::before'), true);
    // Asked of the element the rule styles: not this test's.
    assert.equal(definedForAnother('.stage :not(:defined)'), false);
    assert.equal(definedForAnother('tanrei-table-of-contents.docs-toc-compact:not(:defined)'), false);
    assert.equal(definedForAnother(':where(tanrei-callout[closable]:not(:defined))'), false);
    assert.equal(definedForAnother('.docs-tabs:not(:defined)::before'), false);

    // The source's reading: comments go, at-rules are passed through, a nested rule is written out, `:global()` is taken off.
    assert.deepEqual(
      selectors(`/* a { */ @layer x { @media (pointer: coarse) { a:not(:defined) > *, b { c: "}"; } } .p { & > .q { d: e } .r :global(:not(:defined)) { f: g } } } @keyframes k { from { h: i } }`),
      ['a:not(:defined) > *, b', '.p', ':is(.p) > .q', ':is(.p) .r :not(:defined)', 'from'],
    );
    assert.equal(sheets(fileURLToPath(new URL('../src/styles/frame.css', import.meta.url))).length, 1);
  });
});
