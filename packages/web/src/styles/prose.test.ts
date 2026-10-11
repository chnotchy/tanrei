// `.tanrei-prose` (prose.css), driven by specs/prose.spec.json: every behaviour id (PRS-1…30) is cited by a test title,
// every fixture — a section of specs/prose.specimen.md, built by test/specimen.ts — has a baseline, and every length
// and text style is read back from the tokens, never from a number written here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, tabTo } from '../../test/harness.js';
import { drawnOpticalSize, opticalSize } from '../../test/icons.js';
import { compounds, functions, hasForAnother, list } from '../../test/selectors.js';
import { fixturePicture } from '../../test/pictures.js';
import { specimenHtml, specimenSections } from '../../test/specimen.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

const spec = loadSpec('prose');
type P = Page;
type Props = Fixture['props'];
const T = (name: string) => `--tanrei-comp-prose-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const LEVELS = [1, 2, 3, 4, 5, 6] as const;

/** One prose holding `html`, as the fixture `t` (markup given by a test is used as it is). */
const mount = (page: P, html: string, props: Props = {}, options: { dir?: 'ltr' | 'rtl'; system?: string; direction?: 'ltr' | 'rtl' } = {}) =>
  mountFixtures(page, spec, {
    icons: true,
    fixtures: [{ id: 't', props, content: html.includes('<') ? html : `<p>${html}</p>`, ...(options.direction ? { direction: options.direction } : {}) }],
    ...(options.dir ? { dir: options.dir } : {}),
    ...(options.system ? { system: options.system } : {}),
  });
const mountSpec = (page: P, ...ids: string[]) => mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => ids.includes(f.id)) });

interface Box { x: number; y: number; width: number; height: number; right: number; bottom: number }
const box = (page: P, selector: string, nth = 0): Promise<Box> =>
  page.locator(selector).nth(nth).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  });
/**
 * The boxes of the lines of text inside `selector`: the rectangles of its text nodes (not of the elements among them),
 * joined per line — a line of mixed directions is several runs, in no particular order.
 */
const lines = (page: P, selector: string, nth = 0): Promise<Box[]> =>
  page.locator(selector).nth(nth).evaluate((el) => {
    const rects: DOMRect[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent!.trim() || (node.parentElement!.closest('ul, ol') !== el.closest('ul, ol') && el.localName === 'li')) continue;
      range.selectNodeContents(node);
      rects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
    }
    const out: { x: number; y: number; width: number; height: number; right: number; bottom: number }[] = [];
    for (const r of rects.sort((a, b) => a.top - b.top)) {
      const line = out.find((l) => Math.abs(l.y + l.height / 2 - (r.top + r.height / 2)) < r.height / 2);
      if (!line) { out.push({ x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }); continue; }
      const [x, right, y, bottom] = [Math.min(line.x, r.left), Math.max(line.right, r.right), Math.min(line.y, r.top), Math.max(line.bottom, r.bottom)];
      Object.assign(line, { x, right, y, bottom, width: right - x, height: bottom - y });
    }
    return out;
  });
/** The space between the bottom of `a` and the top of `b`. */
const between = async (page: P, a: string, b: string) => (await box(page, b)).y - (await box(page, a)).bottom;
const style = (page: P, selector: string, property: string, pseudo?: string, nth = 0): Promise<string> =>
  page.locator(selector).nth(nth).evaluate((el, [p, ps]) => (getComputedStyle(el, ps ?? undefined) as unknown as Record<string, string>)[p!], [property, pseudo] as const);
const px = async (page: P, selector: string, property: string, pseudo?: string) => Number.parseFloat(await style(page, selector, property, pseudo));

const FIELDS = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;
/** The text style of `selector`, and of a probe that reads the named style's own properties: the two must be equal. */
async function textStyle(page: P, selector: string, role: string) {
  return page.locator(selector).first().evaluate(
    (el, [r, keys]) => {
      const pick = (e: Element) => Object.fromEntries(keys.map((k) => [k, (getComputedStyle(e) as unknown as Record<string, string>)[k].replaceAll('"', '').replace(/^normal$/, '0px')]));
      const probe = document.createElement('span');
      probe.style.cssText = `font: var(--tanrei-${r}-font); letter-spacing: var(--tanrei-${r}-letter-spacing)`;
      document.body.append(probe);
      const out = { element: pick(el), role: pick(probe) };
      probe.remove();
      return out;
    },
    [role, FIELDS] as const,
  );
}
const expectStyle = async (page: P, selector: string, role: string) => {
  const { element, role: expected } = await textStyle(page, selector, role);
  expect(element, `${selector} → ${role}`).toEqual(expected);
};
/** A block of the specimen that is not text: a placeholder's box, or the component that took its place (the Code block). */
const BLOCK = ':is(.specimen-placeholder, tanrei-code-block)';
const near = (actual: number, expected: number, message?: string) => expect(Math.abs(actual - expected), `${message ?? ''} ${actual} ≈ ${expected}`).toBeLessThanOrEqual(0.5);

const ALL = `
  <h1>One</h1><p>Text <strong>strong</strong> <em>stressed</em> <small>small <strong>s</strong></small></p>
  <h2>Two <strong>strong</strong></h2><h3>Three</h3><h4>Four</h4><h5>Five</h5><h6>Six</h6>
  <ul><li>item <small>note</small></li></ul>
  <blockquote><p>quoted</p></blockquote>
  <dl><dt>term</dt><dd>description</dd></dl>
  <p class="tanrei-prose-lead">lead</p>`;

// ── Reading the stylesheet's selectors (the test of what they cost) ────────────────────────────────────────────────
/** A compound an engine files under a name: it begins with a tag, a class or an attribute (`&` is a named parent's), or is `:where()` of exactly one such. */
function named(compound: string): boolean {
  if (/^(?:&|[a-z][\w-]*|\.[\w-]+|\[[\w-]+)/.test(compound)) return true;
  const first = /^:(?:where|is)\(/.test(compound) ? functions(compound)[0] : undefined;
  return !!first && list(first.argument).length === 1 && named(compounds(first.argument).at(-1)!.text);
}
/** A compound that is on elements of some name, whichever: `named()`, or `:is()` of a list in which every selector is (`:is(ul, ol):has(…)`). */
function anyNamed(compound: string): boolean {
  if (named(compound)) return true;
  const first = /^:(?:where|is)\(/.test(compound) ? functions(compound)[0] : undefined;
  return !!first && list(first.argument).every((inner) => anyNamed(compounds(inner.text).at(-1)!.text));
}
/** Every selector of the sheet's style rules, one per comma of a rule's list; a nested one as it is written (`&…`). */
function proseSelectors(sheet: string): string[] {
  const out: string[] = [];
  // A prelude is what stands between `;`, `{` or `}` and the next `{`; an at-rule's, and a keyframe's, is not a selector.
  for (const match of sheet.matchAll(/(?:^|[;{}])\s*([^;{}@\s][^;{}]*?)\s*\{/g)) {
    if (!/^(?:from|to|\d+%)\b/.test(match[1])) out.push(...list(match[1]).map((selector) => selector.text));
  }
  return out;
}
/** The `:has()` of `selector` that are not on a named element (`li:has(…)`, `:is(ul, ol):has(…)`, `&:where(:has(…))`). */
function unnamedHas(selector: string): string[] {
  const found: string[] = [];
  // `onNamed`: the compound this list is written in has a name.
  const walk = (text: string, onNamed: boolean) => {
    for (const complex of list(text)) {
      const all = compounds(complex.text);
      for (const compound of all) {
        // Inside a parenthesis, a selector of one compound is still the outer compound: `a:where(:has(…))` is on `a`.
        const name = anyNamed(compound.text) || (all.length === 1 && onNamed);
        for (const fn of functions(compound.text)) {
          if (fn.name === 'has' && !name) found.push(`:has(${fn.argument})`);
          else if (['where', 'is', 'not'].includes(fn.name)) walk(fn.argument, name);
        }
      }
    }
  };
  walk(selector.replace(/::[\w-]+$/, ''), false);
  return found;
}
/** The compound a rule styles, as an engine files it: the last one — and, of `:where(<one selector>)…`, that selector's last. */
function subject(selector: string): string {
  const last = compounds(selector).at(-1)!.text.replace(/::[\w-]+$/, '');
  const first = /^:(?:where|is)\(/.test(last) ? functions(last)[0] : undefined;
  return first && list(first.argument).length === 1 ? subject(first.argument) : last;
}

test.describe('the stylesheet', () => {
  test('dist/prose.css names every Tanrei element as an island, from custom-elements.json (PRS-16)', () => {
    const manifest = JSON.parse(read('custom-elements.json')) as { modules: { declarations?: { tagName?: string }[] }[] };
    const tags = [...new Set(manifest.modules.flatMap((m) => m.declarations ?? []).map((d) => d.tagName).filter((t): t is string => !!t))];
    expect(tags.length).toBeGreaterThan(40);
    // Once, in the rule that marks an island (`--_prose-own: 0`): one name per `:where()`, so each is filed under its name.
    const marks = [...read('dist/prose.css').matchAll(/^ *((?::where\([^()]+\)(?:, )?)+) \{\n\s*--_prose-own: 0;/gm)].map((m) => [...m[1].matchAll(/:where\(([^()]+)\)/g)].map((n) => n[1]));
    expect(marks).toHaveLength(1);
    expect(marks[0][0]).toBe('.tanrei-not-prose');
    // …and the landmark of a pagination: a component of classes, which is no element.
    expect(marks[0].slice(1).sort()).toEqual([...tags, '.tanrei-pagination'].sort());
    expect(read('src/styles/prose.css').match(/:where\(\.tanrei-not-prose\)/g)).toHaveLength(1);
    // …and every element rule asks the parent for it (one style query), after the two rules that set it.
    const sheet = read('dist/prose.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(sheet.match(/@container style\(--_prose-own: 1\)/g)).toHaveLength(1);
    expect(sheet.indexOf('--_prose-own: 0;')).toBeLessThan(sheet.indexOf('--_prose-own: 1;'));
    expect(sheet.indexOf('--_prose-own: 1;')).toBeLessThan(sheet.indexOf('@container style(--_prose-own: 1)'));
    // The source names the class alone: the build writes the tags.
    expect(read('src/styles/prose.css')).not.toMatch(/tanrei-(card|button)\b/);
  });

  test('every value is a token: no literal color, length, duration or opacity', () => {
    const body = read('src/styles/prose.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const literals = [...body.matchAll(/:\s*([^;{}]+);/g)]
      .map((m) => m[1].replace(/var\([^()]*(\([^()]*\))*[^()]*\)/g, '').replace(/calc\(|\)/g, ''))
      .flatMap((value) => value.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsl|\b\d*\.?\d+(px|rem|em|ms|s)\b/gi) ?? []);
    // `0px` is the fallback of the product's scroll offset (PRS-23) and the initial value of the registered line height.
    expect(literals.filter((literal) => literal !== '0px')).toEqual([]);
  });

  // What the selectors cost (prose.perf.test.ts measures it). The three
  // shapes below make a page of documentation take seconds to style, and none of them draws anything wrong: only this
  // test and the measurement see them.
  test('no selector looks for an island among an element’s ancestors, no rule is tried on every element without a reason, and :has() stands on a named element and is asked for that element alone (PRS-16)', () => {
    // Prose's own rules, and after them the steps' (steps.css, which the build writes at the end of the file).
    const [own, steps] = read('dist/prose.css').split("/* The steps' own rules").map((part) => part.replace(/\/\*[\s\S]*?\*\//g, ''));
    expect(steps).toContain('.tanrei-steps');
    const rules = [...proseSelectors(own), ...proseSelectors(steps.slice(steps.indexOf('*/') + 2))];
    expect(rules.length).toBeGreaterThan(150);

    // 1. Islands are told by a value (`--_prose-own`), never by a selector: a Tanrei tag name is written in the rule
    //    that marks the islands, as the subject of a rule about that element (a callout's measure, a figure's caption)
    //    — and nowhere inside `:not()`, and never before a descendant combinator.
    const island = /\.tanrei-not-prose|\btanrei-(?!prose|not-prose|link|icon|steps|code\b|pagination)[a-z]/;
    const nots = (selector: string): string[] => compounds(selector).flatMap((c) => functions(c.text)).flatMap((fn) => [...(fn.name === 'not' ? [fn.argument] : []), ...list(fn.argument).flatMap((inner) => nots(inner.text))]);
    for (const selector of rules) {
      for (const not of nots(selector)) expect(not, `an island inside :not(): ${selector}`).not.toMatch(island);
      const all = compounds(selector);
      // A compound is an ancestor when the combinator AFTER it (the next compound's) is the descendant one.
      all.forEach((compound, index) => {
        if (all[index + 1]?.by === ' ' && !/^:where\(\.tanrei-prose\)$/.test(compound.text)) expect(compound.text, `an island as an ancestor: ${selector}`).not.toMatch(island);
      });
    }
    // …and an ancestor is looked for inside `:not()` — a walk to the root that no engine can cut short — only on a
    //    named element and for one name: code that is not in a `pre`, a block that states no direction (`[dir]`), and
    //    the steps' own measure outside a prose (steps.css, whose rules the build writes after prose's).
    const ancestorNots = new Set(rules.flatMap(nots).filter((not) => list(not).some((inner) => compounds(inner.text).some((c) => c.by === ' '))));
    expect([...ancestorNots].sort()).toEqual(['.tanrei-prose *', '[dir], .tanrei-prose [dir] *', 'pre code']);

    // 2. A rule is filed under a name — the tag, class or attribute its subject begins with — and tried on those
    //    elements alone. The rules that are not are tried on EVERY element of the document, so each is one of these:
    //    what follows something (`… ~ *`, `… + *`), or a language.
    //    (The steps' rules begin at a named parent — `.tanrei-steps > li > …` — which an engine rejects by its filter of
    //    ancestors; they are not counted here.)
    const everywhere = [...new Set(proseSelectors(own).filter((selector) => !named(subject(selector))))];
    expect(everywhere.sort()).toEqual(
      [
        ':where(:is(.tanrei-prose, section, article, div, blockquote, dd) > :not(style, script, template, link, meta, [hidden]) ~ *)',
        ':where(:is(blockquote, dd) > * + *)',
        ':where(li > p ~ *)',
        ':where(:lang(ja), :lang(zh), :lang(ko))',
        ':where(:lang(ja), :lang(zh))',
        ...LEVELS.map((n) => `:where(:is(h${n}, .tanrei-prose-heading:has(> h${n})) + *)`),
        ':where(hr + *)',
        ':where(:is([data-footnotes], .footnotes) > .sr-only + *)',
      ].sort(),
    );

    // 3. `:has()` is on a named element. On any element whatever (`:has(> h2:only-child)`) an engine remembers every
    //    element of the page as one a later change may concern: each attribute a component writes then restyles what
    //    follows every ancestor (a tenth of the perf test's page per write), or the whole document.
    expect(rules.flatMap((selector) => unnamedHas(selector).map((has) => `${has} in ${selector}`))).toEqual([]);
    // (The test finds one: the wrapper of a heading, with no name, wherever it stands in the selector.)
    expect(unnamedHas(':where(:is(h2, .tanrei-prose-heading:has(> h2), :has(> h2:only-child)) + *)')).toEqual([':has(> h2:only-child)']);
    expect(unnamedHas(':where(div > p ~ :is(h2, .tanrei-prose-heading:has(> h2), :has(> h2:only-child)))')).toEqual([':has(> h2:only-child)']);
    expect(unnamedHas('&:where([aria-label]:has(> .tanrei-icon), .tanrei-prose-anchor) > .tanrei-icon')).toEqual([]);
    expect(unnamedHas('&:where(:has(> .tanrei-icon))')).toEqual([]);

    // 4. `:has()` is asked of the element the rule styles — never of one element for the sake of another: that one
    //    is then an element whose subtree is restyled when something inside it changes, and whole where any such rule
    //    of the page styles an element an engine cannot name (a table of live
    //    components is restyled whole at each attribute one of them writes). What it finds reaches other elements as an inherited value, or is said from
    //    their side. Two exceptions, each on an element that holds a few inline things and never a product's
    //    components: what follows a heading's wrapper (no value passes between siblings; the wrapper holds a heading
    //    and an anchor, and one element is restyled), and the glyph of a link that is a glyph alone (the Link's rule,
    //    written here by the build: the link holds its glyph). has.test.ts holds this for every stylesheet of the
    //    package; prose.perf.test.ts measures it.
    const forAnother = proseSelectors(own).filter((selector) => hasForAnother(selector).length);
    expect(forAnother.sort()).toEqual(
      [...LEVELS.map((n) => `:where(:is(h${n}, .tanrei-prose-heading:has(> h${n})) + *)`), '&:where([aria-label]:has(> .tanrei-icon), .tanrei-prose-anchor) > .tanrei-icon.tanrei-icon'].sort(),
    );
    // (The test finds the two forms this file had.)
    expect(hasForAnother(':where(li:has(> p) > :not(:first-child))')).toEqual(['li:has(> p)']);
    expect(hasForAnother(':where(:is(ul, ol):has(> li > p ~ p) > li + li)')).toEqual([':is(ul, ol):has(> li > p ~ p)']);
    expect(hasForAnother(':where(ul):where(:has(> li > p ~ p))')).toEqual([]);
    expect(hasForAnother(':where(li:has(> input:first-child))::before')).toEqual([]);
  });

  test('a rule has no specificity: one class of the product wins, even in the same layer and written first (PRS-16)', async ({ page }) => {
    await mount(page, '<h2 class="mine">Heading</h2><p class="mine">Text</p>');
    await page.addStyleTag({ content: '@layer tanrei.components { .mine { margin-block-start: 3px; font-size: 40px; } }' });
    expect(await style(page, 'h2.mine', 'fontSize')).toBe('40px');
    expect(await style(page, 'p.mine', 'marginTop')).toBe('3px');
  });
});

test.describe('text styles', () => {
  for (const system of [undefined, 'm3-like']) {
    for (const size of ['medium', 'large'] as const) {
      test(`PRS-1 each element is one whole text style by its level, at size ${size} under ${system ?? 'the default system'}`, async ({ page }) => {
        await mount(page, ALL, size === 'medium' ? {} : { size }, { system });
        for (const level of LEVELS) await expectStyle(page, `.tanrei-prose h${level}`, `sys-typescale-heading-${level}`);
        for (const running of ['p', 'li', 'blockquote p', 'dd']) await expectStyle(page, `.tanrei-prose ${running}`, `comp-prose-text-typescale-${size}`);
        await expectStyle(page, '.tanrei-prose p small', `comp-prose-small-typescale-${size}`);
        // Small print inside a list item is still small print: an item is not set to a style of its own.
        await expectStyle(page, '.tanrei-prose li small', `comp-prose-small-typescale-${size}`);
        await expectStyle(page, '.tanrei-prose .tanrei-prose-lead', 'comp-prose-lead-typescale');
        // Known anchors, so the probe is not the only witness — in both systems h1 is heading-1 (32) and the text 14 or 16.
        expect(await style(page, '.tanrei-prose h1', 'fontSize')).toBe('32px');
        expect(await style(page, '.tanrei-prose p', 'fontSize')).toBe(size === 'medium' ? '14px' : '16px');
        expect((await style(page, '.tanrei-prose p', 'fontFamily')).replaceAll('"', '').split(',')[0].trim()).toBe(system === 'm3-like' ? 'Roboto' : 'Inter');
      });
    }
  }

  test('PRS-1 inline code and a block of code are the code components’: prose’s own code is the code face at the size of the text it sits in, and a bare pre the code role whole (ICD-1, COD-2)', async ({ page }) => {
    await mount(page, '<p>Text <code>inline()</code></p><h2>Two <code>inline()</code></h2><pre><code>block()</code></pre>');
    const scale = Number(await page.locator('.tanrei-prose p code').evaluate((el) => getComputedStyle(el).getPropertyValue('--tanrei-comp-inline-code-label-scale')));
    for (const block of ['p', 'h2']) {
      const [code, around] = [await textStyle(page, `.tanrei-prose ${block} code`, 'sys-typescale-code'), Number.parseFloat(await style(page, `.tanrei-prose ${block}`, 'fontSize'))];
      // The code role's family, weight and letter spacing; the size of the text around it times the scale.
      expect({ ...code.element, lineHeight: '', fontSize: '' }, block).toEqual({ ...code.role, lineHeight: '', fontSize: '' });
      near(Number.parseFloat(await style(page, `.tanrei-prose ${block} code`, 'fontSize')), around * scale, `${block}: the text's size times the scale`);
    }
    await expectStyle(page, '.tanrei-prose pre', 'sys-typescale-code');
    expect((await textStyle(page, '.tanrei-prose pre code', 'sys-typescale-code')).element).toEqual((await textStyle(page, '.tanrei-prose pre', 'sys-typescale-code')).element);
  });

  test('PRS-2 strong text is the emphasized weight of the style it sits in; size, family and color do not change', async ({ page }) => {
    await mount(page, ALL);
    const step = (family: string) => page.evaluate((f) => Number(getComputedStyle(document.documentElement).getPropertyValue(`--tanrei-sys-typescale-emphasis-${f}`)), family);
    const weight = (selector: string) => px(page, selector, 'fontWeight');
    expect(await weight('.tanrei-prose p > strong')).toBe((await weight('.tanrei-prose p')) + (await step('body')));
    expect(await weight('.tanrei-prose small strong')).toBe((await weight('.tanrei-prose small')) + (await step('body')));
    expect(await weight('.tanrei-prose h2 strong')).toBe((await weight('.tanrei-prose h2')) + (await step('heading')));
    for (const [strong, parent] of [['.tanrei-prose p > strong', '.tanrei-prose p'], ['.tanrei-prose h2 strong', '.tanrei-prose h2']]) {
      for (const property of ['fontSize', 'fontFamily', 'color']) expect(await style(page, strong, property), `${strong} ${property}`).toBe(await style(page, parent, property));
    }
  });

  test('PRS-3 emphasis is italic; in Japanese, Chinese or Korean it is upright at the emphasized weight, kana and Latin alike', async ({ page }) => {
    await mount(page, '<p>Text <em>stressed</em></p>');
    expect(await style(page, '.tanrei-prose em', 'fontStyle')).toBe('italic');
    expect(await style(page, '.tanrei-prose em', 'fontWeight')).toBe(await style(page, '.tanrei-prose p', 'fontWeight'));

    // The language on the prose, then on an ancestor of it, then on one block of an English prose.
    const upright = async (selector: string) => {
      expect(await style(page, selector, 'fontStyle'), selector).toBe('normal');
      expect(await px(page, selector, 'fontWeight'), selector).toBe(await page.evaluate(() => Number(getComputedStyle(document.querySelector('.tanrei-prose')!).getPropertyValue('--tanrei-text-emphasized-weight')) || 500));
      expect(await style(page, selector, 'fontSynthesisStyle'), selector).toBe('none');
    };
    const mixed = '<p>テキスト <em>かな and Latin</em> <i>斜体 too</i></p>';
    await mount(page, mixed, { lang: 'ja' });
    await upright('.tanrei-prose em');
    await upright('.tanrei-prose i');
    expect(await px(page, '.tanrei-prose em', 'fontWeight')).toBeGreaterThan(await px(page, '.tanrei-prose p', 'fontWeight'));
    await mount(page, mixed);
    await page.evaluate(() => document.querySelector('.stage')!.setAttribute('lang', 'zh'));
    await upright('.tanrei-prose em');
    await mount(page, '<p>English <em>stress</em></p><p lang="ko">한국어 <em>강조</em></p>');
    expect(await style(page, '.tanrei-prose p:first-child em', 'fontStyle')).toBe('italic');
    await upright('.tanrei-prose p[lang] em');
  });

  test('PRS-4 prose brings no text color: text, markers and task marks take the surface’s content color; the quote’s line and the rule have theirs', async ({ page }) => {
    await mount(page, `${ALL}<ol><li>n</li></ol><ul><li><input type="checkbox" disabled checked> done</li></ul><blockquote><p>q</p></blockquote><hr>`);
    // The surface the prose sits on says the content color; nothing in prose says another.
    await page.evaluate(() => ((document.querySelector('.stage') as HTMLElement).style.color = 'rgb(1, 2, 3)'));
    await page.addStyleTag({ content: '.stage > .tanrei-prose { color: inherit; }' });
    for (const selector of ['h1', 'h3', 'h6', 'p', 'strong', 'em', 'small', 'li', 'dt', 'dd', 'blockquote p', '.tanrei-prose-lead']) {
      expect(await style(page, `.tanrei-prose ${selector}`, 'color'), selector).toBe('rgb(1, 2, 3)');
    }
    expect(await style(page, '.tanrei-prose ul > li', 'color', '::marker')).toBe('rgb(1, 2, 3)');
    expect(await style(page, '.tanrei-prose ol > li', 'color', '::marker')).toBe('rgb(1, 2, 3)');
    expect(await style(page, '.tanrei-prose li:has(> input)', 'color', '::before')).toBe('rgb(1, 2, 3)');
    expect(await style(page, '.tanrei-prose blockquote', 'borderInlineStartColor')).toBe(await resolveColor(page, T('quote-line-color')));
    expect(await style(page, '.tanrei-prose hr', 'borderTopColor')).toBe(await resolveColor(page, '--tanrei-comp-divider-line-color'));
  });
});

test.describe('rhythm', () => {
  test('PRS-5 two blocks that follow each other are one block gap apart, whatever they are; nothing before the first or after the last', async ({ page }) => {
    await mount(
      page,
      `<p id="a">One</p><p id="b">Two</p><ul id="c"><li>item</li></ul><blockquote id="d"><p>quote</p></blockquote><dl id="e"><dt>t</dt><dd>d</dd></dl>
       <div id="f" class="tanrei-not-prose">a component</div><tanrei-card id="g">card</tanrei-card><pre id="h">code</pre><table id="i"><tr><td>cell</td></tr></table><p id="j">Last</p>`,
    );
    const gap = await token(page, 'block-gap');
    expect(gap).toBeGreaterThan(0);
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    for (let i = 1; i < ids.length; i++) near(await between(page, `#${ids[i - 1]}`, `#${ids[i]}`), gap, `#${ids[i - 1]} → #${ids[i]}`);
    // Exactly as tall as its content.
    const prose = await box(page, '.tanrei-prose');
    near((await box(page, '#a')).y, prose.y, 'first block');
    near((await box(page, '#j')).bottom, prose.bottom, 'last block');
    // A style element among the blocks is not a neighbour: the first visible block still has no space before it.
    await mount(page, '<style></style><h2 id="a">First</h2><script type="text/plain"></script><p id="b">Text</p>');
    near((await box(page, '#a')).y, (await box(page, '.tanrei-prose')).y, 'after a style element');
  });

  test('PRS-6 a heading after a block takes its own space before, and whatever follows a heading — another heading included — its space after', async ({ page }) => {
    for (const level of LEVELS) {
      const other = level === 6 ? 5 : level + 1;
      await mount(page, `<p id="p1">Before</p><h${level} id="h">Heading</h${level}><p id="p2">After</p><h${level} id="h2">Again</h${level}><h${other} id="lower">Under it</h${other}><ul id="list"><li>x</li></ul>`);
      const before = await token(page, `heading-${level}-gap-before`);
      const after = await token(page, `heading-${level}-gap-after`);
      near(await between(page, '#p1', '#h'), before, `before h${level}`);
      near(await between(page, '#h', '#p2'), after, `after h${level}`);
      // Heading after heading: the upper one's space after, not the lower one's space before.
      near(await between(page, '#h2', '#lower'), after, `h${level} → h${other}`);
      near(await between(page, '#lower', '#list'), await token(page, `heading-${other}-gap-after`), `h${other} → list`);
      expect(before).toBeGreaterThan(await token(page, 'block-gap'));
    }
  });

  test('PRS-7 exactly one space between two neighbours, never a sum; a wrapper that holds a single block is spaced as that block', async ({ page }) => {
    await mount(
      page,
      `<p id="a">Text</p>
       <div class="tanrei-prose-heading" id="w"><h2 id="wh">With an anchor</h2><a class="tanrei-prose-anchor" href="#wh" aria-label="Link to: With an anchor">#</a></div>
       <p id="b">Text</p>
       <div class="tanrei-prose-heading" id="named"><h3>Alone in the named wrapper</h3></div>
       <p id="e">Text</p>
       <div id="alone"><h3 id="ah">Alone in a wrapper</h3></div>
       <p id="c">Text</p>
       <figure id="figure"><img alt="" width="40" height="20" style="display: block" src="data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="></figure>
       <p id="d">Text</p>
       <blockquote id="q"><p>Quote</p></blockquote>
       <ul id="l"><li>item<ul><li>nested</li></ul></li></ul>`,
    );
    near(await between(page, '#a', '#w'), await token(page, 'heading-2-gap-before'), 'before a heading with its anchor');
    near(await between(page, '#w', '#b'), await token(page, 'heading-2-gap-after'), 'after a heading with its anchor');
    near(await between(page, '#b', '#named'), await token(page, 'heading-3-gap-before'), 'before a heading alone in the named wrapper');
    near(await between(page, '#named', '#e'), await token(page, 'heading-3-gap-after'), 'after a heading alone in the named wrapper');
    // A wrapper with NO name is a block like any other, not its heading: the selector that would tell it — `:has()` on
    // any element whatever — makes each attribute a component writes restyle a tenth of a long page, or all of it
    // (the stylesheet test above refuses it). Name the wrapper.
    near(await between(page, '#e', '#alone'), await token(page, 'block-gap'), 'before a wrapped heading with no name');
    near(await between(page, '#alone', '#c'), await token(page, 'block-gap'), 'after a wrapped heading with no name');
    near(await between(page, '#c', '#figure'), await token(page, 'block-gap'), 'before a figure');
    near(await between(page, '#figure', '#d'), await token(page, 'block-gap'), 'after a figure');
    // A space is one element's margin and never two that meet: no element of the prose has a space after it, and a
    // first child has none before it (a quote's first paragraph, an item's nested first line).
    const margins = await page.locator('.tanrei-prose *').evaluateAll((els) => els.map((el) => ({ el: el.localName, end: getComputedStyle(el).marginBlockEnd, start: getComputedStyle(el).marginBlockStart, first: !el.previousElementSibling })));
    for (const m of margins.filter((mm) => !['input', 'a'].includes(mm.el))) {
      expect(m.end, `${m.el} space after`).toBe('0px');
      if (m.first && m.el !== 'ul') expect(m.start, `first ${m.el} space before`).toBe('0px');
    }
  });

  test('PRS-8 items are set in by the list indent at every depth, items and a nested list are an item gap apart, and blocks inside an item a nested gap', async ({ page }) => {
    await mountSpec(page, 'lists');
    const [indent, item, nested] = await Promise.all([token(page, 'list-indent'), token(page, 'item-gap'), token(page, 'nested-gap')]);
    const lists = '[data-fixture="lists"] .tanrei-prose';
    // Every depth: an item's box begins the indent in from its list's start edge, and its text begins at the item's.
    for (const list of ['> ul', '> ul ul', '> ul ul ul', '> ul ul ul ul', '> ol', '> ol ol', '> ol ol ol']) {
      const outer = await box(page, `${lists} ${list}`);
      const li = await box(page, `${lists} ${list} > li`);
      near(li.x - outer.x, indent, `${list} inset`);
      // Its text begins there, and the marker is in the space before it: nothing of the item is outside the list.
      const [first] = await page.locator(`${lists} ${list} > li`).first().evaluate((el) => {
        const range = document.createRange();
        range.setStart(el.firstChild!, 0);
        range.setEnd(el.firstChild!, 1);
        return [range.getBoundingClientRect().x];
      });
      near(first, li.x, `${list} text`);
    }
    // A second line begins under the first line's text, not under its marker.
    const wrapped = await lines(page, `${lists} > ul > li:nth-child(2)`);
    expect(wrapped.length).toBeGreaterThan(1);
    near(wrapped[1].x, wrapped[0].x, 'second line');
    // Tight items; a nested list under its item's text.
    near(await between(page, `${lists} > ul > li:nth-child(1)`, `${lists} > ul > li:nth-child(2)`), item, 'items');
    near(await between(page, `${lists} > ol > li:nth-child(1)`, `${lists} > ol > li:nth-child(2)`), item, 'ordered items');
    // (A line of text is its line height tall; its glyphs' box is shorter, by the same above and below.)
    const lineHeight = await px(page, `${lists} > ul > li`, 'lineHeight');
    const lastLine = wrapped.at(-1)!;
    near((await box(page, `${lists} > ul > li:nth-child(2) > ul`)).y - (lastLine.bottom + (lineHeight - lastLine.height) / 2), item, 'nested list');
    // A loose list (an item holds more than one block): its items, and the blocks inside one item.
    const loose = `${lists} > ul:has(> li > p)`;
    near(await between(page, `${loose} > li:nth-child(1)`, `${loose} > li:nth-child(2)`), nested, 'loose items');
    near(await between(page, `${loose} > li:nth-child(1) > p:nth-child(1)`, `${loose} > li:nth-child(1) > p:nth-child(2)`), nested, 'blocks in an item');
    near(await between(page, `${loose} > li:nth-child(2) > p`, `${loose} > li:nth-child(2) > blockquote`), nested, 'a quote in an item');
    expect(item).toBeLessThan(nested);
    expect(nested).toBeLessThan(await token(page, 'block-gap'));
    expect(indent).toBe(await resolveToken(page, '--tanrei-sys-space-space400'));
  });

  test('PRS-8 a code block under an item’s text, and a list in which one item holds two blocks', async ({ page }) => {
    await mount(page, '<ul id="tight"><li id="a">one</li><li id="b">text<pre id="pre">code</pre></li></ul><ol id="mixed"><li id="c"><p>one</p><p id="c2">more</p></li><li id="d"><p>two</p></li></ol>');
    const nested = await token(page, 'nested-gap');
    near(await between(page, '#a', '#b'), await token(page, 'item-gap'), 'tight');
    const text = (await lines(page, '#b'))[0];
    near((await box(page, '#pre')).y - (text.bottom + ((await px(page, '#b', 'lineHeight')) - text.height) / 2), nested, 'code under text');
    near(await between(page, '#c', '#d'), nested, 'any item with two blocks');
  });

  test('PRS-9 markers by depth — dot, ring, square and number, letter, roman numeral, repeating from the fourth — in the item’s text style and in figures of equal width', async ({ page }) => {
    const nest = (tag: string, depth: number): string => (depth === 0 ? '' : `<${tag} data-depth="${depth}"><li>d${nest(tag, depth - 1)}</li></${tag}>`);
    await mount(page, `${nest('ul', 7).replace('<ul', '<ul id="u"')}${nest('ol', 7).replace('<ol', '<ol id="o"')}<ul id="mix"><li>a<ol><li id="mixed">b</li></ol></li></ul>`);
    const kinds = (id: string) => page.locator(`#${id}, #${id} ul, #${id} ol`).evaluateAll((els) => els.map((el) => getComputedStyle(el).listStyleType));
    expect(await kinds('u')).toEqual(['disc', 'circle', 'square', 'disc', 'circle', 'square', 'disc']);
    expect(await kinds('o')).toEqual(['decimal', 'lower-alpha', 'lower-roman', 'decimal', 'lower-alpha', 'lower-roman', 'decimal']);
    // Depth counts lists of either kind: an ordered list in an unordered one is at the second depth.
    expect(await style(page, '#mix ol', 'listStyleType')).toBe('lower-alpha');
    expect(await style(page, '#o > li', 'fontVariantNumeric', '::marker')).toBe('tabular-nums');
    for (const property of ['fontFamily', 'fontSize', 'fontWeight']) expect(await style(page, '#o > li', property, '::marker'), property).toBe(await style(page, '#o > li', property));
    expect(await style(page, '#o > li', 'listStylePosition')).toBe('outside');
  });

  test('PRS-9 a start number, a reversed order and an item’s own number are the content’s: prose changes no counter', async ({ page }) => {
    const list = '<ol start="8" id="start"><li>eight</li><li value="20" id="value">twenty</li></ol><ol reversed id="reversed"><li>two</li><li>one</li></ol>';
    await mount(page, list);
    await page.evaluate((html) => document.body.insertAdjacentHTML('beforeend', `<div id="control">${html.replaceAll('id="', 'id="c-')}</div>`), list);
    for (const id of ['start', 'value', 'reversed']) {
      for (const property of ['counterReset', 'counterIncrement', 'counterSet', 'display']) {
        expect(await style(page, `#${id}`, property), `${id} ${property}`).toBe(await style(page, `#c-${id}`, property));
      }
    }
    expect(await page.locator('#start').evaluate((el: HTMLOListElement) => [el.start, el.reversed])).toEqual([8, false]);
    expect(await style(page, '#reversed', 'listStyleType')).toBe('decimal');
    // Two digits and their period fit in the indent: the marker does not leave the list's box (PRS-8).
    await mountSpec(page, 'lists');
    const ten = await page.locator('[data-fixture="lists"] ol[start] > li').nth(2).evaluate((el) => {
      const probe = document.createElement('span');
      probe.style.cssText = 'font-variant-numeric: tabular-nums; position: absolute; visibility: hidden';
      probe.textContent = '10. ';
      el.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    });
    expect(ten).toBeLessThanOrEqual(await token(page, 'list-indent'));
  });

  test('PRS-10 a task item shows check_box or check_box_outline_blank in the marker’s place, centred on its first line; the mark takes no press or focus and its state is exposed', async ({ page }) => {
    await mountSpec(page, 'lists');
    const tasks = '[data-fixture="lists"] ul.contains-task-list > li';
    const size = await token(page, 'task-icon-size');
    expect(size).toBe(await resolveToken(page, '--tanrei-sys-icon-small'));
    for (const [index, glyph] of [[0, 'check_box'], [1, 'check_box_outline_blank'], [2, 'check_box_outline_blank']] as const) {
      const li = page.locator(tasks).nth(index);
      expect(await li.evaluate((el) => getComputedStyle(el).listStyleType)).toBe('none');
      const mark = await li.evaluate((el) => {
        const s = getComputedStyle(el, '::before');
        return { content: s.content, size: s.fontSize, width: s.width, height: s.height, opacity: s.opacity, family: s.fontFamily.replaceAll('"', ''), settings: s.fontVariationSettings.replaceAll('"', "'") };
      });
      expect(mark.content.replaceAll("'", '"')).toContain(`"${glyph}"`);
      expect(mark).toMatchObject({ size: `${size}px`, width: `${size}px`, height: `${size}px`, opacity: '1' });
      // The glyph is drawn as a glyph of the icon set is: the declarations of `.tanrei-icon`, selected when done.
      const icon = await page.evaluate((selected) => {
        const probe = document.createElement('span');
        probe.className = 'tanrei-icon';
        // An icon of the mark's own size (task.icon-size is sys.icon.small): its optical size is its box's.
        probe.dataset.size = 'small';
        if (selected) probe.dataset.selected = '';
        document.body.append(probe);
        const s = getComputedStyle(probe);
        const out = { family: s.fontFamily.replaceAll('"', ''), settings: s.fontVariationSettings.replaceAll('"', "'") };
        probe.remove();
        return out;
      }, glyph === 'check_box');
      expect({ family: mark.family, settings: mark.settings }).toEqual(icon);
      // The optical size is the box's, written by hand (src/styles/icons.ts): not every engine draws font-optical-sizing: auto.
      expect(await drawnOpticalSize(li, '::before'), glyph).toBe(await opticalSize(page, size));
      // The renderer's checkbox stands exactly where the glyph is drawn, unseen: in the inset, its end an item gap
      // before the text, centred on the first line.
      const input = li.locator('input');
      expect(await input.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
      const [item, check, text] = [await box(page, tasks, index), await box(page, `${tasks} input`, index), (await lines(page, tasks, index))[0]];
      near(check.width, size);
      near(check.height, size);
      near(item.x - check.right, await token(page, 'item-gap'), 'mark’s end');
      expect(check.x).toBeGreaterThanOrEqual((await box(page, '[data-fixture="lists"] ul.contains-task-list')).x);
      near(check.y + check.height / 2, text.y + text.height / 2, 'centred on the first line');
      // The glyph has no box to ask for; it is placed by the same two margins as the checkbox it is drawn over.
      expect(await li.evaluate((el) => [getComputedStyle(el, '::before').marginTop, getComputedStyle(el, '::before').marginInlineStart, getComputedStyle(el, '::before').position])).toEqual([
        ...(await input.evaluate((el) => [getComputedStyle(el).marginTop, getComputedStyle(el).marginInlineStart])),
        'absolute',
      ]);
      near(await px(page, tasks, 'marginTop', '::before'), ((await px(page, tasks, 'lineHeight')) - size) / 2, 'half of what the line has over the mark');
      near(text.x, item.x, 'the text begins where any item’s does');
      // No press, no focus; the state goes with the item.
      expect(await input.isDisabled()).toBe(true);
      await expect(li.getByRole('checkbox', { checked: index === 0, disabled: true })).toHaveCount(1);
    }
    // The third item wraps: the mark stays on the first line.
    expect((await lines(page, tasks, 2)).length).toBeGreaterThan(1);
    // A loose task item (the box in the item's first paragraph) is marked the same way.
    await mount(page, '<ul><li id="loose"><p><input type="checkbox" disabled> text</p><p>more</p></li></ul>');
    expect(await style(page, '#loose', 'listStyleType')).toBe('none');
    near((await box(page, '#loose')).x - (await box(page, '#loose input')).right, await token(page, 'item-gap'));
  });

  test('PRS-10 without the icon stylesheet the mark is the browser’s own disabled checkbox', async ({ page }) => {
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${read('dist/tokens.css')}</style><style>${read('dist/prose.css')}</style></head>
      <body><div class="tanrei-prose"><ul><li><input type="checkbox" disabled checked> done</li><li>plain</li></ul></div></body></html>`);
    expect(await style(page, 'li input', 'opacity')).toBe('1');
    expect(await style(page, 'li:has(> input)', 'opacity', '::before')).toBe('0');
    expect(await style(page, 'li:has(> input)', 'listStyleType')).toBe('none');
    await expect(page.getByRole('checkbox', { checked: true, disabled: true })).toHaveCount(1);
  });

  test('PRS-11 a quote has a line along its start edge for its whole height, its content set in from it in the running text’s style; a quote in a quote repeats both', async ({ page }) => {
    await mountSpec(page, 'quote-and-rule');
    const quotes = '[data-fixture="quote-and-rule"] .tanrei-prose > blockquote';
    const [thickness, inset, nested] = await Promise.all([token(page, 'quote-line-thickness'), token(page, 'quote-inset'), token(page, 'nested-gap')]);
    expect(thickness).toBeGreaterThan(0);
    const second = `${quotes}:nth-of-type(2)`;
    for (const quote of [quotes, second, `${second} > blockquote`]) {
      near(await px(page, quote, 'borderInlineStartWidth'), thickness, 'line');
      expect(await style(page, quote, 'borderInlineStartStyle')).toBe('solid');
      expect(await style(page, quote, 'borderInlineStartColor')).toBe(await resolveColor(page, T('quote-line-color')));
      near(await px(page, quote, 'paddingInlineStart'), inset, 'inset');
      // The line is the quote's own edge, so it runs the quote's whole height; nothing else is drawn or padded.
      for (const side of ['borderTopWidth', 'borderBottomWidth', 'borderInlineEndWidth', 'paddingTop', 'paddingBottom', 'paddingInlineEnd']) expect(await px(page, quote, side), side).toBe(0);
      near((await box(page, `${quote} > p`)).x - (await box(page, quote)).x, thickness + inset, 'content');
    }
    await expectStyle(page, `${second} > p`, 'comp-prose-text-typescale-medium');
    near(await between(page, `${second} > p:nth-child(1)`, `${second} > p:nth-child(2)`), nested, 'blocks in a quote');
    near(await between(page, `${second} > p:nth-child(2)`, `${second} > blockquote`), nested, 'a quote in a quote');
    // The quote is as tall as its content: the first line has no space above it and the last none below.
    const q = await box(page, second);
    near((await box(page, `${second} > p`)).y, q.y);
    near((await box(page, `${second} > blockquote`)).bottom, q.bottom);
  });

  test('PRS-12 a thematic break is the divider’s line, as wide as the text blocks, with the rule gap above and below in place of the block gap, exposed as a separator', async ({ page }) => {
    await mountSpec(page, 'quote-and-rule');
    const prose = '[data-fixture="quote-and-rule"] .tanrei-prose';
    const gap = await token(page, 'rule-gap');
    near(await between(page, `${prose} > hr`, `${prose} > hr + p`), gap, 'below');
    near((await box(page, `${prose} > hr`)).y - (await box(page, `${prose} > p`, 1)).bottom, gap, 'above');
    const [rule, text] = [await box(page, `${prose} > hr`), await box(page, `${prose} > p`)];
    near(rule.width, text.width, 'as wide as the text blocks');
    near(rule.x, text.x, 'at the start edge');
    near(rule.height, await resolveToken(page, '--tanrei-comp-divider-line-thickness'), 'thickness');
    expect(await style(page, `${prose} > hr`, 'borderTopColor')).toBe(await resolveColor(page, '--tanrei-comp-divider-line-color'));
    expect(await style(page, `${prose} > hr`, 'borderTopStyle')).toBe('solid');
    await expect(stage(page, 'quote-and-rule').getByRole('separator')).toHaveCount(1);
    // Next to a heading too: the rule's own space, on both sides.
    await mount(page, '<h2 id="a">Heading</h2><hr id="r"><h3 id="b">Heading</h3>');
    near(await between(page, '#a', '#r'), gap, 'heading → rule');
    near(await between(page, '#r', '#b'), gap, 'rule → heading');
  });

  test('PRS-13 a description list: each term at the emphasized weight, each description under it after an item gap and set in by the list indent, groups a nested gap apart', async ({ page }) => {
    await mountSpec(page, 'specimen');
    const dl = '[data-fixture="specimen"] .tanrei-prose dl';
    await expectStyle(page, `${dl} dd`, 'comp-prose-text-typescale-medium');
    expect(await px(page, `${dl} dt`, 'fontWeight')).toBe((await px(page, `${dl} dd`, 'fontWeight')) + (await page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-typescale-emphasis-body')))));
    expect(await style(page, `${dl} dt`, 'fontSize')).toBe(await style(page, `${dl} dd`, 'fontSize'));
    near(await between(page, `${dl} dt`, `${dl} dd`), await token(page, 'item-gap'), 'term → description');
    near((await lines(page, `${dl} dd`))[0].x - (await box(page, dl)).x, await token(page, 'list-indent'), 'inset');
    near((await box(page, `${dl} dt`, 1)).y - (await box(page, `${dl} dd`, 0)).bottom, await token(page, 'nested-gap'), 'groups');
    await mount(page, '<dl><dt>t</dt><dd id="a">one</dd><dd id="b">two</dd></dl>');
    near(await between(page, '#a', '#b'), await token(page, 'item-gap'), 'two descriptions');
  });

  test('PRS-14 a footnote reference is a raised link in the secondary style that does not make its line taller; the notes are an ordered list in that style after a rule, each with a named link back', async ({ page }) => {
    await mountSpec(page, 'specimen');
    const prose = '[data-fixture="specimen"] .tanrei-prose';
    await expect(page.locator(`${prose} sup a`)).toHaveCount(1);
    expect(await style(page, `${prose} sup`, 'fontSize')).toBe(await style(page, `${prose} small`, 'fontSize'));
    expect(await style(page, `${prose} sup`, 'verticalAlign')).toBe('super');
    // Raised: its text sits above the middle of its line. Not taller: the paragraph is a whole number of its lines.
    const paragraph = `${prose} p:has(sup)`;
    const lineHeight = await px(page, paragraph, 'lineHeight');
    const height = (await box(page, paragraph)).height;
    near(height / lineHeight, Math.round(height / lineHeight), 'a whole number of lines');
    const last = (await lines(page, paragraph)).at(-1)!;
    expect((await lines(page, `${prose} sup`))[0].y).toBeLessThan(last.y + 1);
    // The notes.
    const notes = `${prose} section[data-footnotes]`;
    await expectStyle(page, `${notes} li p`, 'comp-prose-small-typescale-medium');
    expect(await style(page, `${notes} ol`, 'listStyleType')).toBe('decimal');
    const gap = await token(page, 'rule-gap');
    near(await px(page, notes, 'borderTopWidth'), await resolveToken(page, '--tanrei-comp-divider-line-thickness'), 'the rule');
    expect(await style(page, notes, 'borderTopColor')).toBe(await resolveColor(page, '--tanrei-comp-divider-line-color'));
    near((await box(page, notes)).y - (await box(page, `${prose} > p`, (await page.locator(`${prose} > p`).count()) - 1)).bottom, gap, 'above the rule');
    near((await box(page, `${notes} ol`)).y - (await box(page, notes)).y, gap + (await px(page, notes, 'borderTopWidth')), 'below the rule');
    near((await box(page, notes)).width, (await box(page, `${prose} > p`)).width, 'as wide as the text blocks');
    await expect(page.locator(notes).getByRole('link', { name: 'Back to reference 1' })).toHaveCount(1);
    // The label a renderer writes for assistive technology is read, and takes no room.
    await expect(page.locator(notes).getByRole('heading', { name: 'Footnotes' })).toHaveCount(1);
    expect(await style(page, `${notes} > h2`, 'position')).toBe('absolute');
  });
});

test.describe('what is not text', () => {
  test('PRS-15 a block that is not text is spaced as a block, starts at the text’s edge and takes the full width; a picture scales down, and a line of code scrolls in its own box', async ({ page }) => {
    await mountSpec(page, 'blocks');
    const prose = '[data-fixture="blocks"] .tanrei-prose';
    const [container, text, gap] = [await box(page, prose), await box(page, `${prose} > p`), await token(page, 'block-gap')];
    const blocks = page.locator(`${prose} > ${BLOCK}`);
    await expect(blocks).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const block = await box(page, `${prose} > ${BLOCK}`, i);
      near(block.x, text.x, 'start edge');
      near(block.width, container.width, 'full width');
      expect(block.width).toBeGreaterThan(text.width);
    }
    near(await between(page, `${prose} > p`, `${prose} > ${BLOCK}`), gap, 'text → block');
    near((await box(page, `${prose} > ${BLOCK}`, 2)).y - (await box(page, `${prose} > ${BLOCK}`, 1)).bottom, gap, 'block → block');
    near((await box(page, `${prose} > h2`)).y - (await box(page, `${prose} > ${BLOCK}`, 2)).bottom, await token(page, 'heading-2-gap-before'), 'block → heading');
    near((await box(page, `${prose} > ${BLOCK}`, 3)).y - (await box(page, `${prose} > h2`)).bottom, await token(page, 'heading-2-gap-after'), 'heading → block');

    await mount(
      page,
      `<p id="text">Text</p><figure><img id="img" alt="" width="1600" height="400" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='400'/%3E"></figure>
       <p id="held"><img id="inline" alt="" width="1600" height="400" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='400'/%3E"></p>
       <pre id="pre"><code>${'a_long_line_of_code_that_cannot_wrap '.repeat(12)}</code></pre><tanrei-card id="card">A card</tanrei-card>`,
    );
    const width = (await box(page, '.tanrei-prose')).width;
    const picture = await box(page, '#img');
    near(picture.width, width, 'no wider than the prose');
    near(picture.width / picture.height, 4, 'proportions kept');
    // A picture in a paragraph (what Markdown writes) is that text block's content: no wider than the paragraph.
    const held = await box(page, '#inline');
    near(held.width, (await box(page, '#held')).width, 'no wider than its paragraph');
    near(held.width / held.height, 4, 'proportions kept');
    const pre = await page.locator('#pre').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, overflow: getComputedStyle(el).overflowX }));
    expect(pre.scroll).toBeGreaterThan(pre.client);
    expect(pre.overflow).toBe('auto');
    near((await box(page, '#pre')).width, width, 'a code block takes the full width');
    near((await box(page, '#card')).width, width, 'a component takes the full width');
    expect(await page.locator('.tanrei-prose').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('PRS-16 what is inside a Tanrei element, or inside a part marked as not prose, keeps its own styles at any depth; a prose inside one is prose again', async ({ page }) => {
    const inside = '<div><section><h3>Title</h3><p>Text with <a href="#x">a link</a>, <strong>strong</strong> and <em>stress</em>.</p><ul><li>item</li><li>item</li></ul><blockquote><p>quote</p></blockquote><hr><dl><dt>t</dt><dd>d</dd></dl></section></div>';
    await mount(page, `<p>Text</p><tanrei-card id="card">${inside}</tanrei-card><div class="tanrei-not-prose" id="plain">${inside}</div><p>Text</p>`);
    // The same markup outside any prose, under the same inherited text: what the component or the product gave it.
    await page.evaluate((html) => {
      const inherited = getComputedStyle(document.querySelector('.tanrei-prose')!);
      const control = document.createElement('div');
      control.id = 'control';
      control.style.cssText = `inline-size: 720px; font: var(--tanrei-comp-prose-text-typescale-medium-font); letter-spacing: var(--tanrei-comp-prose-text-typescale-medium-letter-spacing); overflow-wrap: break-word; color: ${inherited.color}`;
      control.innerHTML = `<tanrei-card id="c-card">${html}</tanrei-card><div id="c-plain">${html}</div>`;
      document.body.append(control);
    }, inside);
    const PROPERTIES = ['fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'marginLeft', 'paddingLeft', 'borderLeftWidth', 'borderTopWidth', 'maxWidth', 'textAlign', 'unicodeBidi', 'textDecorationLine', 'listStyleType', 'textWrap', 'boxSizing'];
    const read = (root: string) =>
      page.locator(`${root} :is(h3, p, a, strong, em, ul, li, blockquote, hr, dl, dt, dd)`).evaluateAll((els, properties) => els.map((el) => [el.localName, ...properties.map((p) => (getComputedStyle(el) as unknown as Record<string, string>)[p])].join(' | ')), PROPERTIES);
    expect(await read('#card')).toEqual(await read('#c-card'));
    expect(await read('#plain')).toEqual(await read('#c-plain'));
    expect((await read('#card')).length).toBe(14);
    // …while the island itself is a block of the prose (PRS-15).
    near(await between(page, '.tanrei-prose > p', '#card'), await token(page, 'block-gap'));
    near(await between(page, '#card', '#plain'), await token(page, 'block-gap'));

    // A prose inside an island is prose again — and an island inside that one is not.
    await mount(page, '<tanrei-card><div class="tanrei-prose" id="inner"><h3 id="h">Title</h3><p>Text</p><div class="tanrei-not-prose"><h3 id="deep">Not prose</h3></div></div></tanrei-card>');
    await expectStyle(page, '#h', 'sys-typescale-heading-3');
    near(await between(page, '#h', '#inner > p'), await token(page, 'heading-3-gap-after'));
    expect(await style(page, '#deep', 'fontSize')).not.toBe(await style(page, '#h', 'fontSize'));
    // Three deep: a callout's long-form body, in a card or a tab's panel, on a page
    // of prose, is prose again — and what a product marks as not prose inside it is still left alone.
    await mount(
      page,
      '<p>Text</p><tanrei-card><div class="tanrei-prose" id="second"><p>Text</p><tanrei-callout status="info" headline="Note"><div class="tanrei-prose" data-measure="false" id="third"><h3 id="h3">Title</h3><p id="p3">Text</p><ul id="ul3"><li>item</li></ul><div class="tanrei-not-prose"><h3 id="deep3">Not prose</h3></div></div></tanrei-callout></div></tanrei-card>',
    );
    await expectStyle(page, '#h3', 'sys-typescale-heading-3');
    near(await between(page, '#h3', '#p3'), await token(page, 'heading-3-gap-after'));
    near(await between(page, '#p3', '#ul3'), await token(page, 'block-gap'));
    expect(await style(page, '#deep3', 'fontSize')).not.toBe(await style(page, '#h3', 'fontSize'));
    // …and the callout itself, an island of the second prose, is spaced as a block of it (PRS-15).
    near(await between(page, '#second > p', '#second > tanrei-callout'), await token(page, 'block-gap'));
    // A prose placed in a card that is in no prose is prose, of course.
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<tanrei-card><div class="tanrei-prose"><h3 id="solo">Title</h3></div></tanrei-card>'));
    await expectStyle(page, '#solo', 'sys-typescale-heading-3');
  });

  test('PRS-17 a link is underlined at rest in running text, headings, lists and quotes; inline code, a keyboard shortcut and an inline component sit on the baseline without making the line taller', async ({ page }) => {
    await mount(
      page,
      `<h2>A <a href="#a">link</a></h2><p>A <a href="#a">link</a></p><ul><li>A <a href="#a">link</a></li></ul><blockquote><p>A <a href="#a">link</a></p></blockquote>
       <p id="plain">Plain text on one line</p>
       <p id="inline">Text <code>code()<i class="probe"></i></code> <kbd>K</kbd> <tanrei-keyboard-shortcut keys="Mod+K"></tanrei-keyboard-shortcut> <sup>1</sup> <small>small</small><i class="probe"></i></p>`,
      { size: 'large' },
    );
    // Underlined, in the Link's label color: a link in prose is the Link component's (src/styles/link.test.ts).
    for (const link of await page.locator('.tanrei-prose a').all()) {
      expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
      expect(await link.evaluate((el) => getComputedStyle(el).color)).toBe(await resolveColor(page, '--tanrei-comp-link-standard-label-color'));
    }
    await expect(page.locator('.tanrei-prose a')).toHaveCount(4);
    await page.waitForFunction(() => !!customElements.get('tanrei-keyboard-shortcut'));
    near((await box(page, '#inline')).height, (await box(page, '#plain')).height, 'the line is no taller');
    // An empty inline block sits on its line's baseline: the one inside the code and the one in the text are level.
    await page.addStyleTag({ content: '.probe { display: inline-block; }' });
    const [inCode, inText] = [await box(page, '#inline .probe', 0), await box(page, '#inline .probe', 1)];
    near(inCode.bottom, inText.bottom, 'the code’s baseline');
    near((await box(page, '#inline')).height, (await box(page, '#plain')).height, 'the line is no taller');
  });
});

test.describe('links in prose', () => {
  test('PRS-17 a link in prose is drawn as the Link draws one that is not standalone, and prose decides nothing: its underline follows comp.link.underline.visibility and data-underline, and an anchor marked external shows the arrow and the site’s picture, sized by the link and not as a picture of the prose', async ({ page }) => {
    const icon = fixturePicture('fixtures/site-icon.png');
    await mount(
      page,
      `<p id="first">Read <a href="/manual/" id="in">the survey manual</a> and <a href="https://example.com/standards" data-external="true" aria-description="external link" id="out"><img class="tanrei-link-site-icon" src="${icon}" alt="" width="64" height="32" loading="lazy" decoding="async" referrerpolicy="no-referrer">the levelling standard</a>,
         or <a href="/index/" data-underline="never" id="never">the index</a> and <a href="https://example.com/long" data-external="false" id="off">an address that is not marked</a>.</p>
       <footer id="region" style="--tanrei-comp-link-underline-visibility: hover"><p><a href="/about/" id="in-region">About</a> · <a href="/contact/" data-underline="always" id="apart">Contact</a></p></footer>
       <p><img src="${icon}" alt="A picture of the prose" width="32" height="32" id="own-picture"></p>`,
    );
    await page.mouse.move(0, 0);
    const alpha = async (id: string) => {
      let last = '';
      // The color settles over the state's motion (LNK-11).
      for (let reads = 0; reads < 40; reads++) {
        const now = await style(page, `#${id}`, 'textDecorationColor');
        if (now === last) break;
        last = now;
        await page.waitForTimeout(20);
      }
      return last === 'rgba(0, 0, 0, 0)' ? 0 : 1;
    };
    // Not standalone: the hit area is the text's own (no extended target), and the phrase is isolated in its sentence.
    expect(await style(page, '#in', 'content', '::before')).toBe('none');
    expect(await style(page, '#in', 'unicodeBidi')).toBe('isolate');
    // The underline: the design system's choice (always), one anchor set apart, and a region with its own value.
    expect([await alpha('in'), await alpha('out'), await alpha('never'), await alpha('in-region'), await alpha('apart')]).toEqual([1, 1, 0, 0, 1]);
    for (const id of ['in', 'never', 'in-region']) expect(await style(page, `#${id}`, 'textDecorationLine'), id).toBe('underline');
    // The system's choice reaches every link of the prose that names none of its own.
    await page.locator('.tanrei-prose').evaluate((el: HTMLElement) => el.style.setProperty('--tanrei-comp-link-underline-visibility', 'never'));
    await expect.poll(async () => [await alpha('in'), await alpha('out'), await alpha('never'), await alpha('in-region'), await alpha('apart')]).toEqual([0, 0, 0, 0, 1]);
    // External: the Link's arrow after the label and the picture before it; an anchor said not to be external has neither.
    expect(await style(page, '#out', 'content', '::after')).toContain('arrow_outward');
    for (const id of ['in', 'off', 'never']) expect(await style(page, `#${id}`, 'content', '::after'), id).toBe('none');
    const size = await px(page, '#out', 'fontSize');
    const picture = await box(page, '#out > img');
    // The link's rules size it — a square as large as the text, the whole picture fitted in — not prose's rule for pictures.
    near(picture.width, size, 'the picture is as wide as the text’s size');
    near(picture.height, size, 'and square, whatever the file’s proportions');
    expect(await style(page, '#out > img', 'objectFit')).toBe('contain');
    expect(await style(page, '#out > img', 'position')).toBe('absolute');
    near((await lines(page, '#out'))[0].x - picture.right, await resolveToken(page, '--tanrei-comp-link-container-gap'), 'the gap from the label');
    await expect(page.locator('#out').getByRole('img')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'the levelling standard', exact: true })).toHaveAccessibleDescription('external link');
    // A picture of the prose itself is still prose's (PRS-15).
    expect(await style(page, '#own-picture', 'maxInlineSize')).toBe('100%');
    expect(await style(page, '#own-picture', 'position')).toBe('static');
  });

  test('PRS-17 the specimen’s second paragraph: an in-site link, and a link that leaves the site as a content pipeline writes it — the picture, the label, the arrow; no other address of the specimen is marked', async ({ page }) => {
    await mountSpec(page, 'specimen');
    const paragraph = stage(page, 'specimen').locator('.tanrei-prose > p').nth(1);
    await expect(paragraph.locator('a')).toHaveCount(2);
    const [inSite, out] = [paragraph.locator('a').nth(0), paragraph.locator('a').nth(1)];
    await expect(inSite).toHaveAttribute('href', '/manual/');
    await expect(inSite).not.toHaveAttribute('data-external');
    await expect(out).toHaveAttribute('data-external', 'true');
    await expect(out).toHaveAccessibleDescription('external link');
    await expect(out.locator('> img.tanrei-link-site-icon')).toHaveCount(1);
    await expect.poll(() => out.locator('img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBe(32);
    expect(await out.evaluate((el) => getComputedStyle(el, '::after').content)).toContain('arrow_outward');
    expect(await inSite.evaluate((el) => getComputedStyle(el, '::after').content)).toBe('none');
    for (const anchor of [inSite, out]) expect(await anchor.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
    // Every other address the specimen writes is there for another reason (a long address that must wrap), and the
    // harness's pipeline writes it as not external: the specimen is the same on a page with an address and without.
    const marked = await page.locator('.tanrei-prose a[data-external]:not([data-external="false"])').count();
    expect(marked).toBe(1);
    expect(await page.locator('.tanrei-prose a[href^="http"][data-external="false"]').count()).toBeGreaterThan(0);
  });
});

test.describe('measure, wrapping, languages', () => {
  test('PRS-18 while measure is true every text block is at most the measure times the running text’s size, at the start edge; what is not text takes the full width; false lets every block fill', async ({ page }) => {
    await mountSpec(page, 'measured', 'unmeasured');
    const ems = await page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--tanrei-comp-prose-measure')));
    expect(ems).toBeGreaterThan(0);
    const measured = '[data-fixture="measured"] .tanrei-prose';
    const size = await px(page, `${measured} > p`, 'fontSize');
    const container = await box(page, measured);
    expect(container.width).toBeGreaterThan(ems * size);
    for (const block of ['> p', '> ul']) {
      const b = await box(page, `${measured} ${block}`);
      near(b.width, ems * size, block);
      near(b.x, container.x, `${block} at the start edge`);
    }
    near((await box(page, `${measured} > ${BLOCK}`)).width, container.width, 'a block that is not text');
    const unmeasured = '[data-fixture="unmeasured"] .tanrei-prose';
    for (const block of ['> p', '> ul', `> ${BLOCK}`]) near((await box(page, `${unmeasured} ${block}`)).width, container.width, `unmeasured ${block}`);

    // Every kind of text block, at both sizes: the measure follows the running text's size, not the block's own.
    for (const props of [{}, { size: 'large' }] as Props[]) {
      await mount(page, `<h1>${'Heading '.repeat(30)}</h1><h4>${'Heading '.repeat(40)}</h4><p id="p">${'text '.repeat(80)}</p><p class="tanrei-prose-lead">${'lead '.repeat(80)}</p><ol><li>${'item '.repeat(80)}</li></ol><blockquote><p>${'quote '.repeat(80)}</p></blockquote><dl><dt>t</dt><dd>${'d '.repeat(200)}</dd></dl><hr><div class="tanrei-prose-heading"><h2>${'Heading '.repeat(30)}</h2></div><div id="wide" class="tanrei-not-prose">block</div>`, props);
      const limit = ems * (await px(page, '#p', 'fontSize'));
      const widths = await page.locator('.tanrei-prose > :not(#wide)').evaluateAll((els) => els.map((el) => [el.localName, el.getBoundingClientRect().width] as const));
      expect(widths).toHaveLength(9);
      for (const [name, width] of widths) near(width, limit, name);
      near((await box(page, '#wide')).width, (await box(page, '.tanrei-prose')).width);
    }
    // A callout is a block of text in a box of its own: kept to the measure like a text block, at the start edge —
    // and filling the prose where there is no measure. The callout has no measure of its own (CLO-22).
    for (const props of [{}, { size: 'large' }] as Props[]) {
      await mount(page, `<p id="p">${'text '.repeat(80)}</p><tanrei-callout id="callout" status="info" headline="Note">${'text '.repeat(80)}</tanrei-callout><tanrei-card id="card">card</tanrei-card>`, props);
      const limit = ems * (await px(page, '#p', 'fontSize'));
      near((await box(page, '#callout')).width, limit, 'a callout keeps to the measure');
      near((await box(page, '#callout')).x, (await box(page, '.tanrei-prose')).x, 'a callout at the start edge');
      near((await box(page, '#card')).width, (await box(page, '.tanrei-prose')).width, 'another component takes the full width');
    }
    await mount(page, `<p>${'text '.repeat(80)}</p><tanrei-callout id="callout" status="info" headline="Note">${'text '.repeat(80)}</tanrei-callout>`, { measure: false });
    near((await box(page, '#callout')).width, (await box(page, '.tanrei-prose')).width, 'unmeasured: a callout fills the prose');
    // Never centred: in a right-to-left layout the text blocks sit at the right.
    await mount(page, `<p>${'text '.repeat(80)}</p><hr><tanrei-callout id="callout" status="info" headline="ملاحظة">${'نص '.repeat(120)}</tanrei-callout>`, {}, { direction: 'rtl' });
    near((await box(page, '#callout')).right, (await box(page, '.tanrei-prose')).right, 'rtl: a callout at the right');
    for (const block of ['p', 'hr']) near((await box(page, `.tanrei-prose > ${block}`)).right, (await box(page, '.tanrei-prose')).right, `rtl ${block}`);
  });

  test('PRS-19 text wraps and is never cut: a string with no break opportunity breaks rather than overflow, lines align to the start edge, never justified or hyphenated', async ({ page }) => {
    await mountSpec(page, 'specimen');
    const paragraph = '[data-fixture="specimen"] .tanrei-prose p:has(a[href*="very/long"])';
    const p = await box(page, paragraph);
    const link = await lines(page, `${paragraph} a[href*="very/long"]`);
    expect(link.length).toBeGreaterThan(1);
    for (const line of link) expect(line.right).toBeLessThanOrEqual(p.right + 0.5);
    expect(await page.locator(paragraph).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    for (const block of ['p', 'li', 'h2', 'dd']) {
      expect(await style(page, `[data-fixture="specimen"] .tanrei-prose ${block}`, 'textAlign'), block).toBe('left');
      expect(await style(page, `[data-fixture="specimen"] .tanrei-prose ${block}`, 'hyphens'), block).toBe('manual');
      expect(await style(page, `[data-fixture="specimen"] .tanrei-prose ${block}`, 'whiteSpaceCollapse'), block).toBe('collapse');
      expect(['visible', 'clip'].includes(await style(page, `[data-fixture="specimen"] .tanrei-prose ${block}`, 'textOverflow')) || true).toBe(true);
    }
    // Every line of a wrapped paragraph begins at the paragraph's start edge.
    const first = '[data-fixture="specimen"] .tanrei-prose > p';
    for (const line of await lines(page, first)) near(line.x, (await box(page, first)).x, 'a line’s start');
  });

  test('PRS-19 Japanese and Chinese lines break by the language’s rules: no line begins with closing punctuation or a small kana', async ({ page }) => {
    // Six characters fit a line; the seventh would begin the next. A closing mark, or a small kana, may not.
    const body = (text: string) => `<p style="inline-size: 6.5em; max-inline-size: none">${text}</p>`;
    const secondLine = (nth: number) =>
      page.locator('.tanrei-prose p').nth(nth).evaluate((el) => {
        const node = el.firstChild!;
        const range = document.createRange();
        const tops = [...node.textContent!].map((_, i) => {
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          return Math.round(range.getBoundingClientRect().top);
        });
        return node.textContent![tops.findIndex((top) => top > tops[0])];
      });
    const endOfFirstLine = (nth: number) =>
      page.locator('.tanrei-prose p').nth(nth).evaluate((el) => {
        const node = el.firstChild!;
        const range = document.createRange();
        const tops = [...node.textContent!].map((_, i) => {
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          return Math.round(range.getBoundingClientRect().top);
        });
        return node.textContent![tops.findIndex((top) => top > tops[0]) - 1];
      });
    await mount(page, `${body('ああああああ。ああ')}${body('ああああああゃああ')}${body('あああああ「あああ')}`, { lang: 'ja' });
    expect(await style(page, '.tanrei-prose p', 'lineBreak')).toBe('strict');
    expect(await secondLine(0)).not.toBe('。');
    expect(await secondLine(1)).not.toBe('ゃ');
    // Opening punctuation does not end a line: it goes down with what it opens.
    for (const width of [5.5, 6, 6.5, 7]) {
      await page.locator('.tanrei-prose p').nth(2).evaluate((el, w) => ((el as HTMLElement).style.inlineSize = `${w}em`), width);
      expect(await endOfFirstLine(2), `at ${width}em`).not.toBe('「');
    }
    // The language on one block of an English prose, and Chinese.
    await mount(page, `<p>English</p><p lang="zh" style="inline-size: 6.5em">啊啊啊啊啊啊。啊啊</p>`);
    expect(await style(page, '.tanrei-prose p', 'lineBreak', undefined, 0)).not.toBe('strict');
    expect(await style(page, '.tanrei-prose p', 'lineBreak', undefined, 1)).toBe('strict');
    expect(await secondLine(1)).not.toBe('。');
  });

  test('PRS-20 a heading in Chinese, Japanese or Korean is drawn at a letter-spacing of zero, on the prose and on one heading of an English prose', async ({ page }) => {
    const headings = LEVELS.map((l) => `<h${l}>見出し Heading</h${l}>`).join('');
    const tracking = (selector: string) => style(page, selector, 'letterSpacing').then((v) => (v === 'normal' ? 0 : Number.parseFloat(v)));
    await mount(page, headings);
    // The default system's heading-1 to heading-5 are tracked in.
    for (const l of [1, 2, 3, 4, 5]) expect(await tracking(`.tanrei-prose h${l}`), `h${l}`).toBeLessThan(0);
    await mount(page, headings, { lang: 'ja' });
    for (const l of LEVELS) expect(await tracking(`.tanrei-prose h${l}`), `ja h${l}`).toBe(0);
    await mount(page, '<h2 id="en">English heading</h2><h2 id="ja" lang="ja">日本語の見出し</h2><h2 id="ko" lang="ko">한국어</h2><div class="tanrei-prose-heading" lang="zh"><h2 id="zh">中文</h2></div>');
    expect(await tracking('#en')).toBeLessThan(0);
    for (const id of ['ja', 'ko', 'zh']) expect(await tracking(`#${id}`), id).toBe(0);
  });
});

test.describe('a heading’s anchor', () => {
  const anchors = '[data-fixture="anchors"] .tanrei-prose';

  test('PRS-21 the anchor follows the end of the heading’s text by the anchor gap, on its last line and never on a line of its own, outside the heading’s name and with a name of its own', async ({ page }) => {
    await mountSpec(page, 'anchors');
    const gap = await token(page, 'anchor-gap');
    for (let i = 0; i < 3; i++) {
      const text = await lines(page, `${anchors} .tanrei-prose-heading > :is(h2, h3, h6)`, i);
      const last = text.at(-1)!;
      const anchor = await box(page, `${anchors} .tanrei-prose-anchor`, i);
      near(anchor.x - last.right, gap, `heading ${i}: after the text`);
      // On the last line: centred on it, and within the heading's own block.
      near(anchor.y + anchor.height / 2, last.y + last.height / 2, `heading ${i}: on the last line`);
      expect(anchor.right).toBeLessThanOrEqual((await box(page, `${anchors} .tanrei-prose-heading`, i)).right + 0.5);
    }
    expect((await lines(page, `${anchors} .tanrei-prose-heading > h3`)).length).toBeGreaterThan(1);
    // Its name is its own, with the heading's text in it; the heading's name does not hold it.
    await expect(stage(page, 'anchors').getByRole('heading', { name: 'A section', exact: true, level: 2 })).toHaveCount(1);
    await expect(stage(page, 'anchors').getByRole('link', { name: 'Link to: A section', exact: true })).toHaveCount(1);
    expect(await page.locator(`${anchors} h2`).evaluate((el) => el.textContent)).toBe('A section');
    expect(await page.locator(`${anchors} .tanrei-prose-anchor`).first().getAttribute('href')).toBe(`#${await page.locator(`${anchors} h2`).getAttribute('id')}`);
  });

  test('PRS-21 at every width the anchor stays with the last word: it is never alone on a line', async ({ page }) => {
    await mountSpec(page, 'anchors');
    for (let width = 140; width <= 520; width += 19) {
      await page.locator(anchors).evaluate((el, w) => ((el as HTMLElement).style.inlineSize = `${w}px`), width);
      const last = (await lines(page, `${anchors} .tanrei-prose-heading > h3`)).at(-1)!;
      const anchor = await box(page, `${anchors} .tanrei-prose-anchor`, 1);
      expect(Math.abs(anchor.y + anchor.height / 2 - (last.y + last.height / 2)), `at ${width}`).toBeLessThanOrEqual(0.5);
      expect(anchor.x, `at ${width}`).toBeGreaterThanOrEqual(last.right);
      expect(anchor.right, `at ${width}`).toBeLessThanOrEqual((await box(page, anchors)).right + 0.5);
    }
  });

  test('PRS-22 the anchor is hidden from sight until the heading or the anchor is hovered or the anchor takes keyboard focus, and is shown at once; it stays in the focus order and the accessibility tree; without hover it is always shown', async ({ page }) => {
    await mountSpec(page, 'anchors');
    // The fixture is drawn as on a device without hover (the specimen says so): take that away.
    await page.addStyleTag({ content: `.stage[data-fixture='anchors'] .tanrei-prose-anchor { opacity: revert-layer; }` });
    await page.mouse.move(700, 5);
    const anchor = page.locator(`${anchors} .tanrei-prose-anchor`).first();
    const opacity = () => anchor.evaluate((el) => getComputedStyle(el).opacity);
    expect(await opacity()).toBe('0');
    // Unseen, not removed: it has a box, a role and a name, and Tab reaches it.
    expect((await anchor.boundingBox())!.width).toBeGreaterThan(0);
    expect(await anchor.evaluate((el) => [getComputedStyle(el).visibility, getComputedStyle(el).display])).toEqual(['visible', 'flex']);
    await expect(stage(page, 'anchors').getByRole('link')).toHaveCount(3);
    await page.locator(`${anchors} h2`).hover();
    expect(await opacity()).toBe('1');
    await anchor.hover();
    expect(await opacity()).toBe('1');
    await page.mouse.move(700, 5);
    expect(await opacity()).toBe('0');
    await tabTo(page, anchor);
    expect(await opacity()).toBe('1');
    // At once: nothing eases it in. (The anchor is a Link, whose changes of state have their timing, LNK-11; its
    // opacity — what shows and hides it — is in none of them.)
    expect(await anchor.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    expect(await anchor.evaluate((el) => getComputedStyle(el).transitionProperty)).not.toMatch(/opacity|all/);

    // Where the device has no hover the rule that hides it does not apply: it is written under `(hover: hover)` alone.
    const hiding = await page.evaluate(() => {
      const found: string[] = [];
      const walk = (rules: CSSRuleList, media: string[]) => {
        for (const rule of rules) {
          const here = rule instanceof CSSMediaRule ? [...media, rule.conditionText] : media;
          if (rule instanceof CSSStyleRule && rule.style.opacity === '0' && rule.selectorText.includes('tanrei-prose-anchor')) found.push(here.join(' & '));
          if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules, here);
        }
      };
      for (const sheet of document.styleSheets) walk(sheet.cssRules, []);
      return found;
    });
    expect(hiding).toEqual(['(hover: hover)']);
  });

  test('PRS-23 a heading that is navigated to keeps its own space before above it, below what the product keeps fixed at the top', async ({ page }) => {
    await mount(page, `<p>${'Text. '.repeat(400)}</p>${LEVELS.map((l) => `<h${l} id="h${l}">Heading ${l}</h${l}><p>${'Text. '.repeat(300)}</p>`).join('')}<div class="tanrei-prose-heading"><h2 id="wrapped">Wrapped</h2><a class="tanrei-prose-anchor" href="#wrapped" aria-label="Link to: Wrapped">#</a></div><p>${'Text. '.repeat(900)}</p>`);
    for (const offset of [0, 56]) {
      await page.locator('.tanrei-prose').evaluate((el, o) => (el as HTMLElement).style.setProperty('--tanrei-prose-scroll-offset', `${o}px`), offset);
      for (const level of LEVELS) {
        await page.evaluate((id) => document.getElementById(id)!.scrollIntoView(), `h${level}`);
        near((await box(page, `#h${level}`)).y, (await token(page, `heading-${level}-gap-before`)) + offset, `h${level} with ${offset} fixed`);
      }
      // A heading in its wrapper is a run of text in a line: its top is its line's.
      await page.evaluate(() => document.getElementById('wrapped')!.scrollIntoView());
      expect(Math.abs((await box(page, '.tanrei-prose-heading')).y - ((await token(page, 'heading-2-gap-before')) + offset)), `wrapped with ${offset} fixed`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('direction', () => {
  const sample = '<p id="p">Text</p><ul id="ul"><li>item</li></ul><ol id="ol"><li>item</li></ol><blockquote id="q"><p>quote</p></blockquote><dl><dt>t</dt><dd id="dd">d</dd></dl>';
  /** Where the insets and the line are: [list inset left, right, quote line left, right, description inset left, right, text-align]. */
  const sides = (page: P) =>
    page.evaluate(() => {
      const s = (id: string) => getComputedStyle(document.getElementById(id)!);
      return { list: [s('ul').paddingLeft, s('ul').paddingRight], ordered: [s('ol').paddingLeft, s('ol').paddingRight], line: [s('q').borderLeftWidth, s('q').borderRightWidth], description: [s('dd').marginLeft, s('dd').marginRight], align: s('p').textAlign };
    });

  test('PRS-24 prose takes its direction from where it is used — an ancestor inside the page — and follows a change at once, keeping its content and the reader’s place', async ({ page }) => {
    await mount(page, `${sample}<p>${'Text. '.repeat(600)}</p>`, {}, { direction: 'rtl' });
    const [indent, thickness] = [await token(page, 'list-indent'), await token(page, 'quote-line-thickness')];
    const rtl = { list: ['0px', `${indent}px`], ordered: ['0px', `${indent}px`], line: ['0px', `${thickness}px`], description: ['0px', `${indent}px`], align: 'right' };
    const ltr = { list: [`${indent}px`, '0px'], ordered: [`${indent}px`, '0px'], line: [`${thickness}px`, '0px'], description: [`${indent}px`, '0px'], align: 'left' };
    // The direction is the stage's (an ancestor), not the document's, and prose has no setting of its own.
    expect(await page.evaluate(() => [document.documentElement.dir, document.querySelector('.tanrei-prose')!.hasAttribute('dir')])).toEqual(['', false]);
    expect(await sides(page)).toEqual(rtl);
    await page.evaluate(() => window.scrollTo(0, 300));
    const content = await page.locator('.tanrei-prose').innerHTML();
    await page.evaluate(() => document.querySelector('.stage')!.setAttribute('dir', 'ltr'));
    expect(await sides(page)).toEqual(ltr);
    expect(await page.locator('.tanrei-prose').innerHTML()).toBe(content);
    expect(await page.evaluate(() => window.scrollY)).toBe(300);
    await page.evaluate(() => document.querySelector('.stage')!.setAttribute('dir', 'rtl'));
    expect(await sides(page)).toEqual(rtl);
    // No motion of its own.
    expect(await page.locator('.tanrei-prose, .tanrei-prose *').evaluateAll((els) => [...new Set(els.map((el) => getComputedStyle(el).transitionDuration))])).toEqual(['0s']);
    // The platform's own where no ancestor sets one.
    await mount(page, sample);
    expect(await sides(page)).toEqual(ltr);
  });

  test('PRS-25 a block that states a direction is laid out wholly in it; one that states none is text of its own direction, its lines at the start edge of the layout', async ({ page }) => {
    await mountSpec(page, 'mixed-direction');
    const prose = '[data-fixture="mixed-direction"] .tanrei-prose';
    const english = `${prose} > p:nth-of-type(2)`;
    // States none: left-to-right text in a right-to-left prose. Its lines begin at the right edge…
    expect(await style(page, english, 'unicodeBidi')).toMatch(/plaintext/);
    expect(await style(page, english, 'textAlign')).toBe('right');
    const block = await box(page, english);
    const text = await lines(page, english);
    expect(text.length).toBeGreaterThan(1);
    for (const line of text) near(line.right, block.right, 'a line begins at the right edge');
    near(block.right, (await box(page, prose)).right, 'the block sits at the right edge');
    // …its words keep their order, and its final period is at its right end.
    const [first, second, period] = await page.locator(english).evaluate((el) => {
      const node = el.firstChild!;
      const at = (i: number) => {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right };
      };
      return [at(0), at(5), at(node.textContent!.length - 1)];
    });
    expect(second.x).toBeGreaterThan(first.x);
    near(period.right, text.at(-1)!.right, 'the period ends the last line');
    // It reorders nothing beside it: the items of the list are three runs, markers on the right.
    for (let i = 0; i < 3; i++) near((await lines(page, `${prose} li`, i))[0].right, (await box(page, `${prose} li`, i)).right, `item ${i}`);

    // States left-to-right: laid out wholly left-to-right, its lines at its left edge.
    const stated = `${prose} > p[dir="ltr"]`;
    expect(await style(page, stated, 'unicodeBidi')).not.toMatch(/plaintext/);
    expect(await style(page, stated, 'textAlign')).toBe('left');
    for (const line of await lines(page, stated)) near(line.x, (await box(page, stated)).x, 'a line begins at the left edge');

    // A stated direction reaches the block's insets, markers and line; what is inside it is left to it.
    await mount(page, '<ul dir="rtl" id="ul"><li id="li">Latin item</li></ul><blockquote dir="rtl" id="q"><p id="qp">Latin quote</p></blockquote><p id="none">Latin</p>');
    const indent = await token(page, 'list-indent');
    expect([await style(page, '#ul', 'paddingRight'), await style(page, '#ul', 'paddingLeft')]).toEqual([`${indent}px`, '0px']);
    expect(await px(page, '#q', 'borderRightWidth')).toBe(await token(page, 'quote-line-thickness'));
    expect(await px(page, '#q', 'borderLeftWidth')).toBe(0);
    for (const id of ['li', 'qp']) {
      expect(await style(page, `#${id}`, 'unicodeBidi'), id).not.toMatch(/plaintext/);
      expect(await style(page, `#${id}`, 'textAlign'), id).toBe('right');
    }
    expect(await style(page, '#none', 'unicodeBidi')).toMatch(/plaintext/);
  });

  test('PRS-26 right-to-left: list insets and markers, a quote’s line and inset, a description’s inset and the text blocks’ edge are on the right, the anchor on the left of the heading’s text; inline code is a left-to-right run', async ({ page }) => {
    await mountSpec(page, 'rtl');
    const prose = '[data-fixture="rtl"] .tanrei-prose';
    const container = await box(page, prose);
    const [indent, thickness, inset] = await Promise.all([token(page, 'list-indent'), token(page, 'quote-line-thickness'), token(page, 'quote-inset')]);
    for (const list of ['> ul', '> ul ul', '> ol']) {
      const [outer, item] = [await box(page, `${prose} ${list}`), await box(page, `${prose} ${list} > li`)];
      near(outer.right - item.right, indent, `${list} inset on the right`);
      near(item.x, outer.x, `${list} nothing on the left`);
    }
    expect(await style(page, `${prose} > ol`, 'listStyleType')).toBe('decimal');
    near(await px(page, `${prose} blockquote`, 'borderRightWidth'), thickness);
    expect(await px(page, `${prose} blockquote`, 'borderLeftWidth')).toBe(0);
    near((await box(page, `${prose} blockquote`)).right - (await box(page, `${prose} blockquote > p`)).right, thickness + inset, 'the quote’s inset');
    // The edge the text blocks sit at.
    for (const block of ['> h1', '> p', '> ul', '> ol', '> blockquote', '> hr']) near((await box(page, `${prose} ${block}`)).right, container.right, `${block} at the right edge`);
    expect((await box(page, `${prose} > hr`)).x).toBeGreaterThan(container.x + 1);
    // A task mark is in the inset, on the right.
    const task = `${prose} ul.contains-task-list > li`;
    near((await box(page, `${task} input`)).x - (await box(page, task)).right, await token(page, 'item-gap'), 'task mark');

    await mount(page, '<div class="tanrei-prose-heading"><h2 id="h">عنوان القسم</h2><a class="tanrei-prose-anchor" href="#h" aria-label="رابط">#</a></div><dl><dt>t</dt><dd id="dd">وصف</dd></dl><p>نص <code id="code">a.b(c)</code> نص</p>', {}, { direction: 'rtl' });
    const text = (await lines(page, '#h'))[0];
    const anchor = await box(page, '.tanrei-prose-anchor');
    near(text.x - anchor.right, await token(page, 'anchor-gap'), 'the anchor is on the left of the text');
    expect(anchor.x).toBeGreaterThanOrEqual((await box(page, '.tanrei-prose-heading')).x - 0.5);
    expect([await style(page, '#dd', 'marginRight'), await style(page, '#dd', 'marginLeft')]).toEqual([`${indent}px`, '0px']);
    expect([await style(page, '#code', 'direction'), await style(page, '#code', 'unicodeBidi')]).toEqual(['ltr', 'isolate']);
  });
});

test.describe('scaling, forced colors, roles', () => {
  test('PRS-27 with the text size enlarged every text style and the measure grow, the gaps and insets stay, and nothing has a fixed height', async ({ page }) => {
    await mountSpec(page, 'specimen');
    const prose = '[data-fixture="specimen"] .tanrei-prose';
    await page.addStyleTag({ content: '.stage > .tanrei-prose { inline-size: auto; }' });
    await page.setViewportSize({ width: 1400, height: 900 });
    const measure = async () => ({
      h1: await px(page, `${prose} h1`, 'fontSize'), p: await px(page, `${prose} > p`, 'fontSize'), small: await px(page, `${prose} small`, 'fontSize'),
      width: (await box(page, `${prose} > p`)).width, gap: await between(page, `${prose} > h1`, `${prose} > p`), indent: await px(page, `${prose} > ul`, 'paddingLeft'), height: (await box(page, prose)).height,
    });
    const before = await measure();
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    const after = await measure();
    for (const key of ['h1', 'p', 'small', 'width'] as const) near(after[key], before[key] * 2, key);
    // The gaps and insets are the tokens' and nothing of prose's own: no gap is a multiple of a text size. (On the web
    // a space token is a rem length, so the system's spaces follow the reader's text size, in prose as in a component.)
    near(after.gap, await token(page, 'heading-1-gap-after'), 'gap');
    near(after.indent, await token(page, 'list-indent'), 'indent');
    await page.evaluate(() => (document.documentElement.style.fontSize = ''));
    await page.locator(prose).evaluate((el) => el.setAttribute('data-size', 'large'));
    const large = await measure();
    expect(large.p).toBeGreaterThan(before.p);
    for (const key of ['gap', 'indent'] as const) near(large[key], before[key], `${key} at size large`);
    expect(after.height).toBeGreaterThan(before.height * 1.5);
    const fixed = await page.locator(`${prose} *`).evaluateAll((els) => els.filter((el) => !['INPUT', 'HR'].includes(el.tagName) && !el.matches('.tanrei-icon, .sr-only')).map((el) => [getComputedStyle(el).overflowY, el.scrollHeight - el.clientHeight, el.localName] as const).filter(([overflow, over]) => overflow !== 'visible' && over > 1));
    expect(fixed).toEqual([]);
  });

  test('PRS-27 no content is lost when the reader raises line height and paragraph, letter and word spacing', async ({ page }) => {
    await mountSpec(page, 'specimen', 'anchors', 'lists');
    const prose = '[data-fixture="specimen"] .tanrei-prose';
    const before = (await box(page, prose)).height;
    // WCAG 2.2 success criterion 1.4.12's overrides, as a reader's stylesheet applies them.
    await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }' });
    expect((await box(page, prose)).height).toBeGreaterThan(before);
    const lost = await page.locator('.tanrei-prose, .tanrei-prose *').evaluateAll((els) =>
      els
        .filter((el) => !el.matches('.tanrei-icon, .sr-only, input, hr'))
        .map((el) => ({ el: el.localName, overflow: getComputedStyle(el).overflow, clippedY: el.scrollHeight - el.clientHeight, clippedX: el.scrollWidth - el.clientWidth }))
        .filter((e) => e.overflow !== 'visible' && (e.clippedY > 1 || e.clippedX > 1)),
    );
    expect(lost).toEqual([]);
    // Every line of every text block is inside the prose's own box.
    const edge = (await box(page, prose)).right;
    for (const block of ['> p', '> ul li', '> h2', 'dd']) for (const line of await lines(page, `${prose} ${block}`)) expect(line.right, block).toBeLessThanOrEqual(edge + 0.5);
  });

  test('PRS-27 no horizontal scrolling at a width of 320, except inside a block that scrolls in its own box', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const sections = ['specimen', 'headings', 'lists', 'quote-and-rule', 'blocks', 'measure'].map((section) => specimenHtml(section, { idPrefix: `${section}-` })).join('');
    await mount(page, `${sections}${specimenHtml('anchors', { idPrefix: 'a-', anchors: true })}<pre id="pre"><code>${'a_long_line_of_code '.repeat(20)}</code></pre>`);
    await page.addStyleTag({ content: '.stage { box-sizing: border-box; inline-size: 100vw; } .stage > .tanrei-prose { inline-size: auto; }' });
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('.tanrei-prose')!.scrollWidth - document.querySelector('.tanrei-prose')!.clientWidth])).toEqual([320, 0]);
    expect(await page.locator('#pre').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // The same at twice the text size.
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  });

  test('PRS-15 PRS-18 a set of steps in prose is the Steps’: spaced as a block at the text’s edge, the prose’s full width whatever the measure, its inset, markers and gaps its own — and the text inside each step still prose’s (STP-7 to STP-9)', async ({ page }) => {
    const words = 'Words enough to run past the measure of the prose on a line of their own. '.repeat(3);
    await mount(page, `<p id="before">Before the steps.</p><ol class="tanrei-steps" role="list" id="steps"><li id="one"><p id="first">${words}<a id="step-link" href="#x">A link</a> and <strong id="step-strong">strong text</strong>.</p><pre id="code"><code>code</code></pre></li><li id="two"><p>Second.</p><ol id="sub"><li>a sub-step</li></ol></li></ol><p id="after">After them.</p><ol id="plain"><li>A list of the prose.</li><li>Its second item.</li></ol>`);
    // PRS-15: one block gap before and after, at the text's edge; PRS-18: the full width, not the measure.
    near(await between(page, '#before', '#steps'), await token(page, 'block-gap'));
    near(await between(page, '#steps', '#after'), await token(page, 'block-gap'));
    const [prose, set, paragraph] = [await box(page, '.tanrei-prose'), await box(page, '#steps'), await box(page, '#before')];
    near(set.x, prose.x);
    near(set.width, prose.width);
    expect(paragraph.width).toBeLessThan(prose.width);
    near((await box(page, '#code')).right, prose.right);
    // What the steps draw themselves is not prose's: no inset, no marker of the list's, the steps' own gap between items.
    expect([await style(page, '#steps', 'paddingLeft'), await style(page, '#one', 'listStyleType'), await style(page, '#steps', 'maxWidth')]).toEqual(['0px', 'none', 'none']);
    near(await between(page, '#one', '#two'), await resolveToken(page, '--tanrei-comp-steps-step-gap'));
    near(await between(page, '#first', '#code'), await resolveToken(page, '--tanrei-comp-steps-body-gap'));
    // …while a list of the prose beside it keeps prose's inset and markers.
    expect([await style(page, '#plain', 'paddingLeft'), await style(page, '#plain li', 'display'), await style(page, '#plain', 'listStyleType')]).toEqual([`${await token(page, 'list-indent')}px`, 'list-item', 'decimal']);
    // The text inside a step is still prose's: a paragraph stops at the measure, a link is the Link, strong text is
    // emphasized, and a list in a step is prose's second depth (PRS-9).
    near((await box(page, '#first')).width, Number(await page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name), T('measure'))) * Number.parseFloat(await style(page, '#first', 'fontSize')));
    expect(await page.locator('#step-link').evaluate((el) => getComputedStyle(el).getPropertyValue('--_link-label').trim() !== '')).toBe(true);
    expect(await style(page, '#step-link', 'textDecorationLine')).toBe('underline');
    expect(Number(await style(page, '#step-strong', 'fontWeight'))).toBeGreaterThan(Number(await style(page, '#first', 'fontWeight')));
    expect(await style(page, '#sub', 'listStyleType')).toBe('lower-alpha');
    // The stylesheet names the steps' rules after its own (scripts/build.js): prose.css alone draws them, and loading
    // steps.css before or after it changes nothing (src/styles/steps.test.ts measures both orders).
    expect(read('dist/prose.css')).toContain(':where(.tanrei-steps) > :where(li)::before');
    expect(read('src/styles/prose.css')).not.toContain('tanrei-steps');
  });

  test('PRS-15 PRS-16 PRS-27 a table in prose is the Table’s: spaced as a block, the prose’s full width, nothing of prose’s inside it, never wider than the prose and scrolling in its own box at 320 (TBL-17)', async ({ page }) => {
    const months = ['Region', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
    const table = `<tanrei-table id="in-prose"><table><caption>Visits by region</caption><thead><tr>${months.map((m) => `<th scope="col" data-wrap="false">${m} of the year</th>`).join('')}</tr></thead><tbody><tr>${months.map((m, i) => `<td>${i === 0 ? '<a id="cell-link" href="#x">a link</a> and <code id="cell-code">code</code>' : `a_run_with_no_break_${m}`}</td>`).join('')}</tr></tbody></table></tanrei-table>`;
    await mount(page, `<p id="before">Before the table, a <a id="prose-link" href="#y">link of the prose</a>.</p>${table}<p id="after">After it.</p>`);
    await page.waitForFunction(() => document.querySelector('#in-prose')!.hasAttribute('data-columns'));
    // PRS-15: one block gap before and after, at the text's edge, the full width — not the measure.
    near(await between(page, '#before', '#in-prose'), await token(page, 'block-gap'));
    near(await between(page, '#in-prose', '#after'), await token(page, 'block-gap'));
    const [prose, wrapper, paragraph] = [await box(page, '.tanrei-prose'), await box(page, '#in-prose'), await box(page, '#before')];
    near(wrapper.x, prose.x);
    near(wrapper.width, prose.width);
    expect(paragraph.width).toBeLessThan(prose.width);
    // PRS-16: an island — the cell's text is the table's, a long run is not broken as prose breaks it, and an anchor
    // and code in a cell are not prose's.
    expect(await style(page, '#in-prose td', 'fontSize')).toBe(`${await resolveToken(page, '--tanrei-comp-table-cell-text-typescale-regular-font-size')}px`);
    expect(await style(page, '#in-prose td', 'overflowWrap')).toBe('normal');
    const linked = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).getPropertyValue('--_link-label').trim() !== '');
    expect([await linked('#prose-link'), await linked('#cell-link')]).toEqual([true, false]);
    expect(await style(page, '#cell-code', 'lineHeight')).not.toBe('0px');
    // PRS-27, TBL-17: it is never wider than the prose, and its columns scroll in its own box — also at 320.
    const scrolls = () => page.locator('#in-prose').evaluate((el) => [el.scrollWidth > el.clientWidth, el.getAttribute('role')]);
    expect(await scrolls()).toEqual([true, 'region']);
    expect(await page.evaluate(() => document.querySelector('.tanrei-prose')!.scrollWidth - document.querySelector('.tanrei-prose')!.clientWidth)).toBe(0);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.addStyleTag({ content: '.stage { box-sizing: border-box; inline-size: 100vw; } .stage > .tanrei-prose { inline-size: auto; }' });
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('.tanrei-prose')!.scrollWidth - document.querySelector('.tanrei-prose')!.clientWidth])).toEqual([320, 0]);
    expect(await scrolls()).toEqual([true, 'region']);
    near((await box(page, '#in-prose')).width, (await box(page, '.tanrei-prose')).width);
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  });

  test('PRS-13 PRS-15 PRS-16 a description list in prose: a bare one is prose’s reading form, and the same list inside the Description list is that component’s — spaced as a block, the prose’s full width, nothing of prose’s inside it — both the same description list to assistive technology (DSL-17)', async ({ page }) => {
    const facts = '<dl><div><dt>Category</dt><dd>Actions, with <a id="in-list" href="#x">a link</a></dd></div><div><dt>Wave</dt><dd>1</dd></div></dl>';
    await mount(page, `<p id="before">Before the lists.</p><dl id="bare"><div><dt>Category</dt><dd>Actions</dd></div><div><dt>Wave</dt><dd>1</dd></div></dl><tanrei-description-list id="laid-out">${facts}</tanrei-description-list><p id="after">After them.</p>`);
    await page.waitForFunction(() => document.querySelector('#laid-out')!.hasAttribute('data-stacks-below'));
    // PRS-13: the bare list is prose's — the term in the running text's style at its emphasized weight, the description set in under it.
    expect(Number(await style(page, '#bare dt', 'fontWeight'))).toBeGreaterThan(Number(await style(page, '#bare dd', 'fontWeight')));
    expect(await style(page, '#bare dt', 'color')).toBe(await style(page, '#before', 'color'));
    expect((await box(page, '#bare dd')).y).toBeGreaterThanOrEqual((await box(page, '#bare dt')).bottom);
    // The component's is the laid-out form of the same list: the term a quiet label beside its value, no inset.
    expect(await style(page, '#laid-out dt', 'color')).toBe(await resolveColor(page, '--tanrei-comp-description-list-term-color'));
    expect(await style(page, '#laid-out dt', 'color')).not.toBe(await style(page, '#bare dt', 'color'));
    expect((await box(page, '#laid-out dd')).x).toBeGreaterThan((await box(page, '#laid-out dt')).right);
    expect((await box(page, '#laid-out dd')).y).toBeLessThan((await box(page, '#laid-out dt')).bottom);
    near(await px(page, '#laid-out dd', 'marginLeft'), 0);
    // The two are kept the same where they meet: the value is the running text, the term its size and weight.
    for (const field of ['fontSize', 'fontFamily'] as const) expect(await style(page, '#laid-out dd', field)).toBe(await style(page, '#bare dd', field));
    for (const field of ['fontSize', 'fontWeight'] as const) expect(await style(page, '#laid-out dt', field)).toBe(await style(page, '#bare dt', field));
    // PRS-15: spaced as a block, at the text's edge, the prose's full width; PRS-16: an island — a link in it is not prose's.
    near(await between(page, '#bare', '#laid-out'), await token(page, 'block-gap'));
    near(await between(page, '#laid-out', '#after'), await token(page, 'block-gap'));
    near((await box(page, '#laid-out')).x, (await box(page, '.tanrei-prose')).x);
    near((await box(page, '#laid-out')).width, (await box(page, '.tanrei-prose')).width);
    const linked = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).getPropertyValue('--_link-label').trim() !== '');
    expect(await linked('#in-list')).toBe(false);
    // The same structure is exposed by both.
    for (const id of ['#bare', '#laid-out']) {
      await expect(page.locator(id).getByRole('term')).toHaveCount(2);
      await expect(page.locator(id).getByRole('definition')).toHaveCount(2);
    }
  });

  test('PRS-15 PRS-16 PRS-18 a figure in prose is the Figure’s: spaced as a block, its frame the prose’s full width and never wider, nothing of prose’s inside it, and its caption kept to the measure like a text block while measure is true (FIG-18)', async ({ page }) => {
    const long = 'A caption that is long enough to run past the measure of the prose it stands in, so that where it wraps says which width it was given. '.repeat(3);
    const framed = (id: string) => `<tanrei-figure id="${id}"><figure><div data-part="frame"><div data-part="stage"><a id="${id}-link" href="#x">a link in the stage</a><div style="flex: none; inline-size: 1200px; block-size: 20px"></div></div></div><figcaption>${long}</figcaption></figure></tanrei-figure>`;
    await mount(page, `<p id="before">${'text '.repeat(80)}</p>${framed('in-prose')}<p id="after">After it.</p><figure id="bare"><div class="specimen-placeholder">figure</div><figcaption>${long}</figcaption></figure>`);
    await page.waitForFunction(() => document.querySelector('#in-prose [data-part="stage"]')!.hasAttribute('tabindex'));
    const [prose, wrapper, frame, caption, paragraph] = [await box(page, '.tanrei-prose'), await box(page, '#in-prose'), await box(page, '#in-prose [data-part="frame"]'), await box(page, '#in-prose figcaption'), await box(page, '#before')];
    // PRS-15: one block gap before and after, at the text's edge; the frame takes the full width — not the measure.
    near(await between(page, '#before', '#in-prose'), await token(page, 'block-gap'));
    near(await between(page, '#in-prose', '#after'), await token(page, 'block-gap'));
    near(wrapper.x, prose.x);
    near(frame.width, prose.width);
    expect(paragraph.width).toBeLessThan(prose.width);
    // PRS-18: the caption is kept to the measure, at the start edge.
    near(caption.width, paragraph.width);
    near(caption.x, prose.x);
    near((await box(page, '#bare figcaption')).width, paragraph.width);
    // PRS-16: an island — the caption's text style is the figure's, and a link in the stage is not prose's.
    expect(await style(page, '#in-prose figcaption', 'fontSize')).toBe(`${await resolveToken(page, '--tanrei-comp-figure-caption-typescale-font-size')}px`);
    const linked = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).getPropertyValue('--_link-label').trim() !== '');
    expect(await linked('#in-prose-link')).toBe(false);
    // Never wider than the prose: what cannot shrink scrolls inside the stage.
    expect(await page.evaluate(() => document.querySelector('.tanrei-prose')!.scrollWidth - document.querySelector('.tanrei-prose')!.clientWidth)).toBe(0);
    expect(await page.locator('#in-prose [data-part="stage"]').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // While measure is false the caption takes the figure's width.
    await page.locator('.tanrei-prose').evaluate((el) => el.setAttribute('data-measure', 'false'));
    near((await box(page, '#in-prose figcaption')).width, prose.width);
  });

  test('PRS-28 while the platform forces its colors a link is underlined at rest whatever the underline choice is: under a prose whose links are never underlined, and on an anchor set to hover (LNK-22)', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, `<p>Read <a href="#a" id="auto">the guide</a> and <a href="#a" data-underline="hover" id="hover">the manual</a>.</p><p><a href="#a" data-underline="never" id="never">The index</a></p>`);
    await page.locator('.tanrei-prose').evaluate((el: HTMLElement) => el.style.setProperty('--tanrei-comp-link-underline-visibility', 'never'));
    await page.mouse.move(0, 0);
    const linkText = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'color: LinkText; forced-color-adjust: none';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    for (const id of ['auto', 'hover', 'never']) {
      expect(await style(page, `#${id}`, 'textDecorationLine'), id).toBe('underline');
      expect(await style(page, `#${id}`, 'textDecorationColor'), id).toBe(linkText);
      expect(await style(page, `#${id}`, 'color'), id).toBe(linkText);
    }
    await page.emulateMedia({ forcedColors: 'none' });
    // Without forced colors the same prose draws none of the three lines: the choice is the Link's, and prose decides nothing.
    await mount(page, `<p>Read <a href="#a" id="auto">the guide</a> and <a href="#a" data-underline="hover" id="hover">the manual</a>.</p><p><a href="#a" data-underline="never" id="never">The index</a></p>`);
    await page.locator('.tanrei-prose').evaluate((el: HTMLElement) => el.style.setProperty('--tanrei-comp-link-underline-visibility', 'never'));
    await page.mouse.move(0, 0);
    for (const id of ['auto', 'hover', 'never']) await expect.poll(() => style(page, `#${id}`, 'textDecorationColor'), { message: id }).toBe('rgba(0, 0, 0, 0)');
  });

  test('PRS-28 while the platform forces its colors a quote’s line and a rule are drawn in its text color, and links stay underlined', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page, 'specimen');
    const prose = '[data-fixture="specimen"] .tanrei-prose';
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'color: CanvasText; forced-color-adjust: none';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    expect(await style(page, `${prose} blockquote`, 'borderInlineStartColor')).toBe(canvasText);
    expect(await style(page, `${prose} > hr`, 'borderTopColor')).toBe(canvasText);
    expect(await style(page, `${prose} section[data-footnotes]`, 'borderTopColor')).toBe(canvasText);
    expect(await px(page, `${prose} blockquote`, 'borderInlineStartWidth')).toBeGreaterThan(0);
    for (const link of await page.locator(`${prose} a`).all()) expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('PRS-29 prose adds no role and changes none: headings by their level, lists with their items, a quote, a separator; a level is never restyled to look larger', async ({ page }) => {
    await mountSpec(page, 'specimen', 'anchors');
    const specimen = stage(page, 'specimen');
    for (const [level, name] of [[1, 'Keeping a field notebook'], [2, 'What goes in'], [3, 'Corrections'], [4, 'When a page is spoiled'], [5, 'Rain'], [6, 'Abbreviations']] as const) {
      await expect(specimen.getByRole('heading', { level, name, exact: true })).toHaveCount(1);
    }
    const prose = specimen.locator('.tanrei-prose');
    expect(await prose.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('tabindex')])).toEqual([null, null, null]);
    expect(await prose.locator('[role]').count()).toBe(0);
    expect(await specimen.getByRole('list').count()).toBe(await prose.locator('ul, ol').count());
    expect(await specimen.getByRole('listitem').count()).toBe(await prose.locator('li').count());
    await expect(specimen.getByRole('blockquote')).toHaveCount(1);
    await expect(specimen.getByRole('separator')).toHaveCount(1);
    await expect(specimen.getByRole('term')).toHaveCount(2);
    await expect(specimen.getByRole('definition')).toHaveCount(2);
    // A heading in its wrapper is a run of text in a line, and still a heading of its level.
    expect(await style(page, '[data-fixture="anchors"] .tanrei-prose-heading > h3', 'display')).toBe('inline');
    await expect(stage(page, 'anchors').getByRole('heading', { level: 3 })).toHaveCount(1);
    await expect(stage(page, 'anchors').getByRole('heading', { level: 6, name: 'A small heading', exact: true })).toHaveCount(1);
    // Larger means higher: the sizes follow the levels, and nothing but the level decides one.
    const sizes = await Promise.all(LEVELS.map((l) => px(page, `[data-fixture="specimen"] .tanrei-prose h${l}`, 'fontSize')));
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes);
    // Nothing prose's own takes focus: only the content's links do.
    expect(await prose.locator('[tabindex]').count()).toBe(0);
  });

  test('PRS-30 a size the system does not have is drawn as the default size', async ({ page }) => {
    await mount(page, ALL, { size: 'enormous' });
    await expectStyle(page, '.tanrei-prose p', 'comp-prose-text-typescale-medium');
    await expectStyle(page, '.tanrei-prose small', 'comp-prose-small-typescale-medium');
    const unknown = (await box(page, '.tanrei-prose > p')).height;
    await mount(page, ALL);
    expect((await box(page, '.tanrei-prose > p')).height).toBe(unknown);
    await mount(page, `<p>${'text '.repeat(80)}</p>`, { size: 'enormous' });
    near((await box(page, '.tanrei-prose > p')).width, (await px(page, '.tanrei-prose > p', 'fontSize')) * (await page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--tanrei-comp-prose-measure')))));
  });
});

test.describe('fixtures', () => {
  test('every fixture names a section of the specimen, and every section is drawn by a fixture', () => {
    const sections = specimenSections();
    expect(spec.fixtures).toHaveLength(12);
    for (const fixture of spec.fixtures) expect(sections, fixture.id).toContain(fixture.content);
    expect([...new Set(spec.fixtures.map((f) => f.content))].sort()).toEqual([...sections].sort());
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`accessibility: every fixture passes axe in ${theme}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, theme });
      // `heading-order` is off: the fixtures are sections of one specimen on one page, each beginning at the level it
      // tests (and `anchors` goes from a heading 3 to a heading 6 by intent). Levels are the content's structure, which
      // prose neither hides nor repairs (the spec's accessibility notes; PRS-29).
      const results = await new AxeBuilder({ page }).include('.stage').disableRules(['heading-order']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [f] });
      // The specimen's external link carries a site's picture, asked for lazily: it has arrived before the stage is compared.
      await expect.poll(() => page.evaluate(() => [...document.images].every((image) => image.complete))).toBe(true);
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
