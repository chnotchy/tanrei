// Where `:has()` stands in EVERY stylesheet of the package — the ones a page loads (dist/*.css), the ones an element
// adds to its root (the table's, the accordion's), and every component's shadow styles
// (prose.perf.test.ts measures what this file holds the shape of).
//
// How an engine answers `:has()` when the page changes. It remembers which elements `:has()` was asked of. When
// something changes that some `:has()` of the page asks about — an attribute any of them names (prose names `type`),
// a child added, a state — it walks up from what changed; an element on the way that was asked FOR ITSELF
// (`table:has(> tfoot)`, the rule styles the table) is styled again, itself alone. One that was asked for the sake of
// ANOTHER element (`table:has(> tfoot) > tbody > tr`, `li:has(> p) > :not(:first-child)`) has its subtree gone
// through for the elements such rules style — and the engine keeps ONE list of those for the whole page, every root
// together: where any such rule styles an element it cannot name (`> :not(:first-child)`, `.input::placeholder`), the
// list is "everything", and the subtree is styled whole. So one rule in the text field's shadow styles and one in
// prose made the docs' table of fixtures — 2,500 elements, asked by table.css whether it has a footer — be styled
// whole at each attribute a component in it wrote: a second of style time on one page.
//
// Two rules follow, and this file holds both for all the package's sheets:
//
// 1. In a stylesheet of the document, `:has()` is asked of the element the rule styles; what it finds reaches other
//    elements as an inherited value (`--_table-last-body-line`, `--_prose-item-gap`). The exceptions are listed below,
//    each on an element that holds a few inline things of its own and never a product's components.
// 2. Wherever `:has()` is asked for another element — a component's shadow styles do it freely: the element asked is
//    a part of the component, with the component's few parts under it — the rule styles an element with a NAME: a
//    tag, a class, an id or an attribute, and no pseudo-element a browser draws inside a control (`::placeholder`).
//
// Chromium only: the selectors are read from the page's own style rules, as one engine prints them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { compounds, functions, hasForAnother, list } from '../../test/selectors.js';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** `:has()` asked of one element for the sake of another, in a stylesheet of the document: every one, and why it stands. */
const FOR_ANOTHER_IN_THE_DOCUMENT: Record<string, string> = {
  // The link that is a glyph alone (LNK-16) takes its glyph out of the room a label would give it. Asked of the link,
  // which holds its label and its glyph; the rule styles `.tanrei-icon`. Twice: the class, and prose's own anchors.
  ':is(:where(.tanrei-link)):where([aria-label]:has(> .tanrei-icon), .tanrei-prose-anchor) > .tanrei-icon.tanrei-icon': 'link.css',
  ':is(:where(a)):where([aria-label]:has(> .tanrei-icon), .tanrei-prose-anchor) > .tanrei-icon.tanrei-icon': 'prose.css (the link’s rules)',
  // A previous or next link without a title draws its label as the title (PNL). Asked of the item, an anchor of two lines.
  ':where(.tanrei-previous-next-links-item:not(:has(> .tanrei-previous-next-links-title:not(:empty)))) > :where(.tanrei-previous-next-links-label)': 'previous-next-links.css',
  // What follows a heading's wrapper takes the heading's space after (PRS-6, PRS-7): no value passes between
  // siblings. Asked of the wrapper, which holds a heading and its anchor; one element is restyled.
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`:where(:is(h${n}, .tanrei-prose-heading:has(> h${n})) + *)`, 'prose.css'])),
};

/** A compound an engine can name: a tag, a class, an id or an attribute written in it, or in every selector of an `:is()` / `:where()` in it. */
function nameable(compound: string): boolean {
  let outside = '';
  let depth = 0;
  for (const char of compound) {
    if (char === '(') depth += 1;
    if (depth === 0) outside += char;
    if (char === ')') depth -= 1;
  }
  if (/(?:^|[^:\w-])[a-z][\w-]*|[.#][\w-]+|\[/i.test(outside.replace(/::?[\w-]+/g, ''))) return true;
  return functions(compound).some((fn) => ['is', 'where'].includes(fn.name) && list(fn.argument).every((inner) => nameable(compounds(inner.text).at(-1)!.text)));
}
/** The pseudo-elements a rule may style after a `:has()` asked for another element: the element's own generated boxes, which carry its name. */
const OWN_BOXES = ['::before', '::after', '::marker'];
/** Whether the element `selector` styles is one an engine can name. */
function stylesANamedElement(selector: string): boolean {
  const pseudo = /::[\w-]+(?:\([^()]*\))?$/.exec(selector)?.[0];
  if (pseudo && !OWN_BOXES.includes(pseudo)) return false;
  return nameable(compounds(pseudo ? selector.slice(0, -pseudo.length) : selector).at(-1)!.text);
}

/**
 * Whether `:defined` is asked of one element for the sake of another: it stands in a compound that is not the one the
 * rule styles (a pseudo-element of the element asked is the element's own box).
 */
function definedForAnother(selector: string): boolean {
  const pseudo = /::[\w-]+(?:\([^()]*\))?$/.exec(selector)?.[0];
  const all = compounds(pseudo ? selector.slice(0, -pseudo.length) : selector);
  // A selector that is one `:is()` / `:where()` around the whole of it is read as what it holds.
  if (all.length === 1) {
    const [only] = functions(all[0]!.text).filter((fn) => ['is', 'where'].includes(fn.name));
    if (only && all[0]!.text.replace(/^:(?:is|where)\(/, '').slice(0, -1) === only.argument && list(only.argument).length === 1) return definedForAnother(only.argument);
  }
  return all.slice(0, -1).some((compound) => compound.text.includes(':defined'));
}

/**
 * Every style rule of the package whose selector holds `needle` — in every stylesheet a page can load and in what every
 * element adds to its shadow root or to the document — with its selector written out and where it stands.
 */
async function rulesWith(page: Page, needle: string): Promise<{ selector: string; where: string[] }[]> {
const manifest = JSON.parse(read('custom-elements.json')) as { modules: { declarations?: { tagName?: string }[] }[] };
  const tags = [...new Set(manifest.modules.flatMap((m) => m.declarations ?? []).map((d) => d.tagName).filter((t): t is string => !!t))];
  const sheets = fs.readdirSync(path.join(pkg, 'dist')).filter((file) => file.endsWith('.css'));
  expect(tags.length).toBeGreaterThan(40);
  expect(sheets.length).toBeGreaterThan(10);
  // Every stylesheet a page can load, and every element — each adds its styles to its shadow root, or to the document.
  await page.setContent(
    `<!doctype html><html><head>${sheets.map((file) => `<style>${read(`dist/${file}`)}</style>`).join('')}</head><body>${tags.map((tag) => `<${tag}></${tag}>`).join('')}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`,
  );
  await page.waitForFunction((all) => all.every((tag) => !!customElements.get(tag)), tags);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  // Every style rule with `needle`, its selector written out (a nested rule's `&` is its parent's selector), with where it is.
  return page.evaluate((needle) => {
    const found = new Map<string, Set<string>>();
    const top = (text: string) => {
      const out = [''];
      let depth = 0;
      for (const char of text) {
        if (char === '(' || char === '[') depth += 1;
        if (char === ')' || char === ']') depth -= 1;
        if (char === ',' && depth === 0) out.push('');
        else out[out.length - 1] += char;
      }
      return out.map((part) => part.trim());
    };
    const walk = (rules: CSSRuleList, parent: string | null, where: string) => {
      for (const rule of rules) {
        let selector = parent;
        const own = (rule as CSSStyleRule).selectorText;
        if (own) {
          selector = parent === null ? own : top(own).map((part) => (part.includes('&') ? part.replaceAll('&', `:is(${parent})`) : `:is(${parent}) ${part}`)).join(', ');
          if (selector.includes(needle)) found.set(selector, (found.get(selector) ?? new Set()).add(where));
        }
        if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules, selector, where);
      }
    };
    const read = (root: Document | ShadowRoot, where: string) => {
      for (const sheet of [...root.styleSheets, ...root.adoptedStyleSheets]) walk(sheet.cssRules, null, where);
    };
    read(document, 'document');
    const roots = (root: Document | ShadowRoot) => {
      for (const element of root.querySelectorAll('*')) {
        if (!element.shadowRoot) continue;
        read(element.shadowRoot, element.localName);
        roots(element.shadowRoot);
      }
    };
    roots(document);
    return [...found].map(([selector, where]) => ({ selector, where: [...where] }));
  }, needle);
}

test.describe('where :has() stands', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the selectors are read as one engine prints them');

  test('in every stylesheet of the package :has() is asked of the element a rule styles — or, in a component’s own shadow styles and in the listed rules of the document, for an element the engine can name', async ({ page }) => {
    const rules = await rulesWith(page, ':has(');
    // The page is the one meant: `:has()` is read from the document's sheets and from many components' shadow styles.
    expect(rules.length).toBeGreaterThan(100);
    expect(new Set(rules.flatMap((rule) => rule.where)).size).toBeGreaterThan(10);

    const each = rules.flatMap((rule) => list(rule.selector).map((selector) => ({ selector: selector.text, where: rule.where })));
    const forAnother = each.filter((rule) => hasForAnother(rule.selector).length);

    // 1. In the document: the listed ones, and no other.
    const inDocument = [...new Set(forAnother.filter((rule) => rule.where.includes('document')).map((rule) => rule.selector))];
    expect(inDocument.sort()).toEqual(Object.keys(FOR_ANOTHER_IN_THE_DOCUMENT).sort());

    // 2. Wherever it is asked for another element, that element has a name.
    expect(forAnother.filter((rule) => !stylesANamedElement(rule.selector)).map((rule) => `${rule.where.join(', ')}: ${rule.selector}`)).toEqual([
      // What follows a heading's wrapper is any element (above). An engine's list for a SIBLING of the element asked is
      // its own, and names nothing inside that sibling: prose.perf.test.ts measures that a table stays unstyled.
      ...[1, 2, 3, 4, 5, 6].map((n) => `document: :where(:is(h${n}, .tanrei-prose-heading:has(> h${n})) + *)`),
    ]);

    // (The reading finds the shapes this was written for.)
    expect(hasForAnother(':is(:where(tanrei-table) > :where(table)):where(:not(:has(> tfoot > tr))) > :where(tbody:last-of-type) > :where(tr:last-child)')).toHaveLength(1);
    expect(hasForAnother(':is(:where(tanrei-table) > :where(table)):where(:has(> tfoot > tr))')).toEqual([]);
    expect(stylesANamedElement('.field[data-labelled]:not(:is([data-has-value], :has(.input:focus))) .input::placeholder')).toBe(false);
    expect(stylesANamedElement(':where(li:has(> p) > :not(:first-child))')).toBe(false);
    expect(stylesANamedElement('.field:has(.input:focus) .container::after')).toBe(true);
    expect(stylesANamedElement('.cell:where(:has(> .container[data-pressed])) :is(.indicator, .icon, .label)')).toBe(true);
    expect(stylesANamedElement(':where(.tanrei-previous-next-links-item:not(:has(> .tanrei-previous-next-links-title))) > :where(.tanrei-previous-next-links-label)')).toBe(true);
  });

  // `:defined` is answered the same way. An engine keeps ONE list,
  // for the whole page, of the elements that rules written with `:defined` style under the element asked; when ANY
  // element is defined — a table, the frame around the whole page — what is under it is gone through for that list.
  // One rule that styles an element without a name (`tanrei-app-bar:not(:defined) > *`) makes the list "everything",
  // and every definition styles its element's subtree whole: on a long page, 50 to 70 ms for each kind of element that
  // holds much — the frame, the tab panels, the tables. So wherever `:defined` is asked of one element for the sake
  // of another, that other has a name.
  test('in every stylesheet of the package :defined is asked of the element a rule styles, or for an element the engine can name', async ({ page }) => {
    const rules = await rulesWith(page, ':defined');
    // The page is the one meant: the stylesheets that draw an element before it is defined ask.
    expect(rules.length).toBeGreaterThan(20);
    const each = rules.flatMap((rule) => list(rule.selector).map((selector) => ({ selector: selector.text, where: rule.where })));
    const forAnother = each.filter((rule) => definedForAnother(rule.selector));
    expect(forAnother.length).toBeGreaterThan(5);
    expect(forAnother.filter((rule) => !stylesANamedElement(rule.selector)).map((rule) => `${rule.where.join(', ')}: ${rule.selector}`).sort()).toEqual([
      // TODO: avatar.css hides whatever an avatar holds, and whatever
      // a group holds that is not a member, until they are defined — two elements with no name. A page that loads
      // avatar.css pays for it at every definition. They stand until avatar.css names what it hides; no other may join them.
      'document: :where(tanrei-avatar-group:not(:defined)) > :where(:not(tanrei-avatar))',
      'document: :where(tanrei-avatar:not(:defined)) > :where(*)',
    ]);

    // (The reading finds the shapes this was written for.)
    expect(definedForAnother('tanrei-app-bar:not(:defined) > *')).toBe(true);
    expect(stylesANamedElement('tanrei-app-bar:not(:defined) > *')).toBe(false);
    expect(stylesANamedElement('tanrei-navigation-drawer:not(:defined) > :not(tanrei-button)')).toBe(false);
    expect(definedForAnother('tanrei-code-block:not(:defined) > pre')).toBe(true);
    expect(stylesANamedElement('tanrei-code-block:not(:defined) > pre')).toBe(true);
    expect(definedForAnother(':where(tanrei-callout[closable]:not(:defined))')).toBe(false);
    expect(definedForAnother('tanrei-code-block:not(:defined)[copy]::after')).toBe(false);
  });
});
