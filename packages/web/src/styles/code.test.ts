// `.tanrei-code` (code.css), driven by specs/inline-code.spec.json: every behaviour id (ICD-1…16) is cited by a test
// title, every fixture has a baseline, and every length and color is read back from the tokens, never from a number
// written here. Eight of the fixtures are sections of specs/inline-code.specimen.md, built as prose's are.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { fixtureHost, loadSpec, mountFixtures, resolveColor, resolveToken, tab, rootTokens } from '../../test/harness.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

const spec = loadSpec('inline-code');
type P = Page;
const T = (name: string) => `--tanrei-comp-inline-code-${name}`;
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const run = (page: P, id: string) => fixtureHost(page, spec, id);
const only = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
const mountSpec = (page: P, ids: string[] = [], options: { theme?: 'light' | 'dark'; system?: string } = {}) => mountFixtures(page, spec, { icons: true, ...(ids.length ? { fixtures: only(...ids) } : {}), ...options });
/** A stage holding `html` as it is, in the body text style: the fixture `t`. */
const mount = (page: P, html: string, { direction, width = 480 }: { direction?: 'ltr' | 'rtl'; width?: number } = {}) =>
  mountFixtures(page, spec, {
    icons: true,
    fixtures: [{ id: 't', props: {}, content: `<div id="text" style="inline-size: ${width}px; font: var(--tanrei-sys-typescale-body-font); letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing); color: var(--tanrei-sys-color-on-surface)">${html}</div>`, ...(direction ? { direction } : {}) }],
  });
const CODE = (text: string, attributes = '') => `<code class="tanrei-code"${attributes ? ` ${attributes}` : ''}>${text}</code>`;

const css = (target: Locator, property: string, pseudo?: string): Promise<string> =>
  target.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (target: Locator, property: string) => Number.parseFloat(await css(target, property));
interface Box { x: number; y: number; width: number; height: number; right: number; bottom: number }
const box = (target: Locator): Promise<Box> => target.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
/** The run's part of each line it is on: the boxes of its pieces. */
const pieces = (target: Locator): Promise<Box[]> =>
  target.evaluate((el) => [...el.getClientRects()].map((r) => ({ x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom })));
/** Where one character of the run's text is drawn. */
const character = (target: Locator, index: number): Promise<Box> =>
  target.evaluate((el, i) => {
    const range = document.createRange();
    const text = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE)!;
    range.setStart(text, i);
    range.setEnd(text, i + 1);
    const r = range.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  }, index);
/**
 * How far the run passes the end of its line in `within` (which is left-to-right): the farthest of its characters, and
 * the farthest of its pieces' boxes. Zero or less is inside.
 */
const past = (target: Locator, within = '#text'): Promise<{ characters: number; pieces: number }> =>
  target.evaluate((el, selector) => {
    const edge = el.closest(selector)!.getBoundingClientRect().right;
    const text = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE) as Text;
    const range = document.createRange();
    let characters = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < text.length; i++) {
      if (text.data[i] === ' ') continue;
      range.setStart(text, i);
      range.setEnd(text, i + 1);
      characters = Math.max(characters, range.getBoundingClientRect().right - edge);
    }
    return { characters, pieces: Math.max(...[...el.getClientRects()].map((r) => r.right - edge)) };
  }, within);
/**
 * Chromium does not keep room for the padding at the END of a piece when it decides where a line breaks (it does for
 * the padding at its start), so where the characters and one padding fit the line and both paddings do not, the
 * piece's box passes the end of its line — by the padding at most, never a character. Measured on a bare `<code>` with
 * `padding-inline` and `box-decoration-break: clone` alone, on macOS and on Linux, at about half of all widths; Firefox
 * keeps the room.
 */
const pieceMayPass = async (page: P, browserName: string) => (browserName === 'chromium' ? await resolveToken(page, T('container-padding-inline')) : 0) + 0.5;
const near = (actual: number, expected: number, what: string, tolerance = 0.6) => expect(Math.abs(actual - expected), `${what}: ${actual} ≠ ${expected}`).toBeLessThanOrEqual(tolerance);
const unquoted = (family: string) => family.replaceAll(/["']/g, '').replaceAll(/\s*,\s*/g, ', ').trim();
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
/** What the run draws of its form: fill, padding, text color, edge. */
const form = async (target: Locator) => ({
  fill: await css(target, 'background-color'),
  padding: [await px(target, 'padding-left'), await px(target, 'padding-right')],
  color: await css(target, 'color'),
  edge: await css(target, 'box-shadow'),
});
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

test.describe('the stylesheet', () => {
  test('every value is a token: no literal color, length, duration or opacity — in code.css and in the code block’s light-DOM rules', () => {
    for (const file of ['src/styles/code.css', 'dist/code.css']) {
      const body = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
      const literals = [...body.matchAll(/:\s*([^;{}]+);/g)]
        .map((m) => m[1].replace(/var\([^()]*(\([^()]*\))*[^()]*\)/g, '').replace(/calc\(|\)/g, ''))
        .flatMap((value) => value.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsl|\b\d*\.?\d+(px|rem|em|ms|s)\b/gi) ?? []);
      // `1em` is the size of the text the run sits in (ICD-1); `1px` is the box of a mark's label, which is read and
      // never drawn (COD-15), and `0px` nothing.
      expect(literals.filter((literal) => !['1em', '1px', '0px'].includes(literal)), file).toEqual([]);
    }
  });

  test('dist/prose.css holds the same rules, under every code that is prose’s own and not in a pre, and a bare pre is a filled code block; the corner rule is the shared one (ICD-3, PRS-15, PRS-17)', async () => {
    const rules = (text: string) => text.slice(text.indexOf('/* code:rules */'), text.indexOf('/* code:rules:end */')).replace(/\s+/g, ' ');
    const [own, prose] = [read('dist/code.css'), read('dist/prose.css')];
    expect(rules(own).length).toBeGreaterThan(2000);
    expect(prose.replace(/\s+/g, ' ')).toContain(rules(own).replace('/* code:rules */', '').trim());
    expect(prose).toMatch(/^ {4}:where\(code:not\(pre code\)\) \{\s+\/\* ICD-1/m);
    expect(prose).toContain(":where([data-tanrei-code='plain'])");
    expect(prose).toMatch(/^ {4}:where\(pre\) \{[^}]*background: var\(--tanrei-comp-code-block-filled-container-color\)/m);
    const { SHAPE_CSS } = (await import(path.join(pkg, 'dist/styles/shape.js'))) as { SHAPE_CSS: string };
    expect(own.replace(/\s+/g, ' ')).toContain(SHAPE_CSS.replaceAll(':where([data-tanrei-shape])', '&').replaceAll('[data-tanrei-shape]', '&').replace(/\s+/g, ' '));
    expect(read('src/styles/code.css')).not.toContain('superellipse');
    // The source of prose names no code role any more: the code components' rules are the only ones.
    expect(read('src/styles/prose.css')).not.toContain('--tanrei-sys-typescale-code');
    // And the code block's light-DOM rules are the element's own text, once.
    const { CODE_BLOCK_CSS } = (await import(path.join(pkg, 'dist/components/code-block/code-block.light.js'))) as { CODE_BLOCK_CSS: string };
    expect(own.endsWith(CODE_BLOCK_CSS)).toBe(true);
  });

  test('a rule has no specificity: one class of the product wins, even in the same layer and written first', async ({ page }) => {
    await mount(page, `<p>${CODE('npm', 'id="c"').replace('tanrei-code', 'tanrei-code mine')}</p>`);
    await page.addStyleTag({ content: '@layer tanrei.components { .mine { color: rgb(1, 2, 3); background-color: rgb(4, 5, 6); } }' });
    expect([await css(page.locator('#c'), 'color'), await css(page.locator('#c'), 'background-color')]).toEqual(['rgb(1, 2, 3)', 'rgb(4, 5, 6)']);
  });

  test('prose: every code that is prose’s own is inline code without a class — in a paragraph, a heading and a list — and not inside an island or a pre (ICD-1, PRS-16)', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [{ id: 't', props: {}, content: `<div class="tanrei-prose"><p>Run <code id="p">npm</code>, or ${CODE('npm', 'id="classed"')}.</p><h2>Set <code id="h">size</code></h2><ul><li><code id="li">a</code></li></ul>
        <div class="tanrei-not-prose"><code id="island">x</code></div><pre><code id="pre">block()</code></pre></div>` }],
    });
    const drawn = async (id: string) => ({ ...(await form(page.locator(`#${id}`))), family: await css(page.locator(`#${id}`), 'font-family'), leading: await css(page.locator(`#${id}`), 'line-height') });
    expect(await drawn('p')).toEqual(await drawn('classed'));
    expect((await drawn('p')).fill).toBe(await resolveColor(page, T('container-color')));
    for (const id of ['h', 'li']) expect((await drawn(id)).fill, id).toBe(await resolveColor(page, T('container-color')));
    // A heading's own size: not the code role's 13.
    near(await px(page.locator('#h'), 'font-size'), (await resolveToken(page, '--tanrei-sys-typescale-heading-2-font-size')) * Number(await css(page.locator('#h'), T('label-scale'))), 'in a heading');
    // An island's code, and a block's, are not prose's inline code.
    expect((await drawn('island')).fill).toBe(TRANSPARENT);
    expect((await drawn('pre')).fill).toBe(TRANSPARENT);
    expect((await drawn('pre')).padding).toEqual([0, 0]);
    // The bare pre: the filled look of the medium size, scrolling in its own box.
    const pre = page.locator('.tanrei-prose > pre');
    expect(await css(pre, 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-code-block-filled-container-color'));
    expect(await px(pre, 'padding-left')).toBe(await resolveToken(page, '--tanrei-comp-code-block-container-padding-inline-medium'));
    expect(await px(pre, 'font-size')).toBe(await resolveToken(page, '--tanrei-comp-code-block-code-typescale-medium-font-size'));
    expect(await css(pre, 'overflow-x')).toBe('auto');
  });
});

test.describe('the text', () => {
  test('ICD-1: the family, the weight and the letter spacing of label.typescale, at the font size of the text it sits in times label.scale — body text, large text, a heading of any level, a caption, a table cell — and never the code role’s own size or line height', async ({ page }) => {
    await mountSpec(page);
    const scale = Number(await css(run(page, 'tonal'), T('label-scale')));
    expect(scale).toBeCloseTo(0.9286, 4);
    // Body text (14): 13. Large text (16): 14.86.
    near(await px(run(page, 'in-paragraph').first(), 'font-size'), 13, 'in body text', 0.01);
    near(await px(run(page, 'in-large-text').first(), 'font-size'), 14.86, 'in large text', 0.01);
    for (const id of ['tonal', 'in-paragraph', 'in-large-text']) {
      const first = run(page, id).first();
      expect(unquoted(await css(first, 'font-family')), id).toBe(unquoted(await css(first, T('label-typescale-font-family'))));
      expect(await css(first, 'font-weight'), id).toBe((await css(first, T('label-typescale-font-weight'))).trim());
      near(await px(first, 'letter-spacing') || 0, await resolveToken(page, T('label-typescale-letter-spacing')), `${id} letter spacing`, 0.01);
      // Not the code role's line height: it takes none of its own (ICD-2).
      expect(await css(first, 'line-height'), id).toBe('0px');
    }
    // A heading keeps its own size for the code inside it, at every level, with no rule per level.
    const [h2, h3] = [stage(page, 'in-heading').locator('h2'), stage(page, 'in-heading').locator('h3')];
    near(await px(h2.locator('code'), 'font-size'), (await px(h2, 'font-size')) * scale, 'in a heading of level 2', 0.01);
    near(await px(h3.locator('code').first(), 'font-size'), (await px(h3, 'font-size')) * scale, 'in a heading of level 3', 0.01);
    expect(await px(h2.locator('code'), 'font-size')).toBeGreaterThan(await px(h3.locator('code').first(), 'font-size'));
    expect(await px(h2.locator('code'), 'font-size')).not.toBeCloseTo(await resolveToken(page, T('label-typescale-font-size')), 0);
    // Whatever the text is.
    await mountFixtures(page, spec, {
      fixtures: [{ id: 't', props: {}, content: `${[1, 2, 3, 4, 5, 6].map((n) => `<h${n} style="font: var(--tanrei-sys-typescale-heading-${n}-font)">h ${CODE('x', `id="h${n}"`)}</h${n}>`).join('')}
        <p style="font: var(--tanrei-sys-typescale-caption-font)">caption ${CODE('x', 'id="caption"')}</p><p style="font: var(--tanrei-sys-typescale-label-font)">label ${CODE('x', 'id="label"')}</p>
        <table style="font: var(--tanrei-sys-typescale-body-small-font)"><tr><td>cell ${CODE('x', 'id="cell"')}</td></tr></table>` }],
    });
    for (const id of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'caption', 'label', 'cell']) {
      const code = page.locator(`#${id}`);
      const around = await code.evaluate((el) => Number.parseFloat(getComputedStyle(el.parentElement!).fontSize));
      near(await px(code, 'font-size'), around * scale, id, 0.01);
    }
  });

  test('ICD-2: it sits on the baseline of its line and never makes the line taller or moves the lines apart; its fill is as tall as the code face’s own text box, with no padding above or below', async ({ page }) => {
    const sentence = (code: string) => `Run ${code} in the folder that holds the sources, then start the server and wait until the first build has written its cache beside them.`;
    await mount(page, `<p id="with">${sentence(`${CODE('npm install<i class="probe"></i>', 'id="c"')}<i class="probe"></i>`)}</p><p id="without">${sentence('npm install')}</p><p><span id="face" style="font-family: var(${T('label-typescale-font-family')}); font-size: calc(1em * var(${T('label-scale')})); line-height: 0">npm install</span></p>`);
    await page.addStyleTag({ content: '.probe { display: inline-block; inline-size: 1px; block-size: 1px; } p { margin: 0; }' });
    // The baseline: an empty inline block sits on its line's baseline, and the one inside the run and the one in the
    // text beside it are level.
    const [inCode, inText] = [await box(page.locator('#c .probe')), await box(page.locator('#with > .probe'))];
    near(inCode.bottom, inText.bottom, 'the run’s baseline is the line’s', 0.1);
    const lineHeight = await px(page.locator('#with'), 'line-height');
    // The line is no taller: the paragraph is whole lines of its own line height, with and without the run.
    const [withRun, without] = [await box(page.locator('#with')), await box(page.locator('#without'))];
    for (const paragraph of [withRun, without]) near(paragraph.height / lineHeight, Math.round(paragraph.height / lineHeight), 'whole lines', 0.01);
    expect(Math.round(withRun.height / lineHeight)).toBeGreaterThan(1);
    // The fill: the face's own text box — what a bare span of the same face and size is — and no block padding.
    const [fill] = await pieces(page.locator('#c'));
    near(fill.height, (await pieces(page.locator('#face')))[0].height, 'the fill is the face’s text box', 0.1);
    expect(fill.height).toBeLessThan(lineHeight + 4);
    expect([await px(page.locator('#c'), 'padding-top'), await px(page.locator('#c'), 'padding-bottom')]).toEqual([0, 0]);
    expect(await css(page.locator('#c'), 'vertical-align')).toBe('baseline');
  });

  test('ICD-3: tonal — a fill of container.color with container.shape corners eased by the corner smoothing, extended by container.padding-inline before the first and after the last character, the text in label.color, an edge inside the fill only where outline.width is above 0, and no elevation', async ({ page }) => {
    await mountSpec(page, ['tonal']);
    const code = run(page, 'tonal');
    expect(await form(code)).toEqual({
      fill: await resolveColor(page, T('container-color')),
      padding: [await resolveToken(page, T('container-padding-inline')), await resolveToken(page, T('container-padding-inline'))],
      color: await resolveColor(page, T('label-color')),
      edge: await css(code, 'box-shadow'),
    });
    expect(await px(code, 'border-top-left-radius')).toBe(await resolveToken(page, T('container-shape')));
    // The fill reaches the padding past the first and the last character.
    const [fill] = await pieces(code);
    near((await character(code, 0)).x - fill.x, await resolveToken(page, T('container-padding-inline')), 'before the first character');
    near(fill.right - (await character(code, 'npm install'.length - 1)).right, await resolveToken(page, T('container-padding-inline')), 'after the last character');
    // The default system draws no edge (a width of 0), and never an elevation: the one shadow is the inset edge.
    expect(await resolveToken(page, T('outline-width'))).toBe(0);
    expect(await css(code, 'box-shadow')).toMatch(/0px 0px 0px 0px inset$|^none$/);
    await override(page, { [T('outline-width')]: '1px' });
    expect(await css(code, 'box-shadow')).toContain('0px 0px 0px 1px inset');
    expect(await css(code, 'box-shadow')).toContain(await resolveColor(page, T('outline-color')));
    expect((await pieces(code))[0]).toEqual(fill);
    // The corners are eased by the shared rule: the radius is scaled where the browser draws the curve.
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0.6' });
    const eased = await page.evaluate(() => CSS.supports('corner-shape: superellipse(2)'));
    expect(await px(code, 'border-top-left-radius')).toBeCloseTo((await resolveToken(page, T('container-shape'))) * (eased ? 1.24 : 1), 1);
  });

  test('ICD-4: plain — no fill, no edge and no padding, and the text in the color of the text it sits in, on whatever that text is read on', async ({ page }) => {
    await mount(page, `<p>${CODE('npm install', 'id="plain" data-variant="plain"')}</p><p style="background: var(--tanrei-sys-color-error-container); color: var(--tanrei-sys-color-on-error-container)">${CODE('x', 'id="on-color" data-variant="plain"')}</p>`);
    await override(page, { [T('outline-width')]: '1px' });
    expect(await form(page.locator('#plain'))).toEqual({ fill: TRANSPARENT, padding: [0, 0], color: await resolveColor(page, '--tanrei-sys-color-on-surface'), edge: 'none' });
    expect((await form(page.locator('#on-color'))).color).toBe(await resolveColor(page, '--tanrei-sys-color-on-error-container'));
    const [fill] = await pieces(page.locator('#plain'));
    near((await character(page.locator('#plain'), 0)).x, fill.x, 'no room before the first character', 0.1);
    // Still the code face, at the text's size.
    expect(unquoted(await css(page.locator('#plain'), 'font-family'))).toBe(unquoted(await css(page.locator('#plain'), T('label-typescale-font-family'))));
  });

  test('ICD-5: tonal and plain are drawn as named; auto is what the nearest ancestor chooses for the inline code inside it, tonal where none does; a change of that choice is followed at once', async ({ page }) => {
    await mount(
      page,
      `<p>${CODE('a', 'id="alone"')} ${CODE('a', 'id="auto" data-variant="auto"')}</p>
       <div id="chooser" data-tanrei-code="plain"><p>${CODE('a', 'id="chosen"')} ${CODE('a', 'id="own" data-variant="tonal"')}</p>
         <div data-tanrei-code="tonal"><p>${CODE('a', 'id="nearest"')} ${CODE('a', 'id="own-plain" data-variant="plain"')}</p></div></div>`,
    );
    const tonal = await resolveColor(page, T('container-color'));
    const fill = (id: string) => css(page.locator(`#${id}`), 'background-color');
    expect({ alone: await fill('alone'), auto: await fill('auto'), chosen: await fill('chosen'), own: await fill('own'), nearest: await fill('nearest'), ownPlain: await fill('own-plain') }).toEqual({
      alone: tonal,
      auto: tonal,
      chosen: TRANSPARENT,
      own: tonal,
      nearest: tonal,
      ownPlain: TRANSPARENT,
    });
    expect((await form(page.locator('#chosen'))).padding).toEqual([0, 0]);
    // The choice changes while the run is shown.
    await page.locator('#chooser').evaluate((el) => el.removeAttribute('data-tanrei-code'));
    expect(await fill('chosen')).toBe(tonal);
    await page.locator('#chooser').evaluate((el) => el.setAttribute('data-tanrei-code', 'plain'));
    expect(await fill('chosen')).toBe(TRANSPARENT);
    await page.locator('#alone').evaluate((el) => el.setAttribute('data-variant', 'plain'));
    expect(await fill('alone')).toBe(TRANSPARENT);
    expect(await css(page.locator('#alone'), 'transition-duration')).toBe('0s');
    // The fixtures: a table's cells are plain, by each run's own variant.
    await mountSpec(page, ['plain-in-table', 'plain', 'tonal']);
    for (const code of await run(page, 'plain-in-table').all()) expect(await css(code, 'background-color')).toBe(TRANSPARENT);
    expect(await css(run(page, 'plain'), 'background-color')).toBe(TRANSPARENT);
    expect(await css(run(page, 'tonal'), 'background-color')).toBe(tonal);
  });

  test('ICD-6: it wraps with its line — at its spaces first, and between any two characters where a part with no space is longer than the line; no hyphen or other character is drawn at a break; every piece keeps the fill, the corners and both paddings; nothing is cut and nothing scrolls', async ({ page, browserName }) => {
    const name = 'tanrei.comp.navigation-drawer.item.selected.hovered.color';
    const long = `${name}.state-layer`.slice(0, 60);
    await mount(page, `<p id="p">${CODE(long, 'id="long"')}</p><p>${CODE('npm run dev then start the server', 'id="spaced"')}</p>`, { width: 160 });
    expect(long.length).toBe(60);
    const code = page.locator('#long');
    // It wraps: no character passes the end of its line, and the page does not scroll sideways. (How far a PIECE's box
    // may pass is the next test's: which width the box has decides it, and this one's is whatever the face makes it.)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const parts = await pieces(code);
    expect(parts.length).toBeGreaterThan(2);
    const container = await box(page.locator('#text'));
    const reach = await past(code);
    expect(reach.characters).toBeLessThanOrEqual(0.5);
    expect(reach.pieces).toBeLessThanOrEqual(await pieceMayPass(page, browserName));
    for (const [index, part] of parts.entries()) expect(part.x, `piece ${index}`).toBeGreaterThanOrEqual(container.x - 0.5);
    // Every piece is a box of its own, with the fill and the corners.
    expect(await css(code, 'box-decoration-break').then((v) => v || css(code, '-webkit-box-decoration-break'))).toBe('clone');
    // Nothing is cut, nothing scrolls, and the text copies back unchanged — no hyphen, no added character.
    expect([await css(code, 'overflow-x'), await css(code, 'text-overflow'), await css(code, 'hyphens')]).toEqual(['visible', 'clip', 'none']);
    expect(await code.evaluate((el) => { getSelection()!.selectAllChildren(el); return getSelection()!.toString(); })).toBe(long);
    expect(await code.evaluate((el) => (el as HTMLElement).innerText)).toBe(long);
    // At its spaces first: every piece of a run of short words ends where a word does.
    const spaced = await page.locator('#spaced').evaluate((el) => {
      const text = el.firstChild as Text;
      const range = document.createRange();
      const ends: string[] = [];
      let last = -1;
      for (let i = 0; i < text.length; i++) {
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        const top = range.getBoundingClientRect().top;
        if (last >= 0 && Math.abs(top - last) > 4) ends.push(text.data[i - 1]);
        last = top;
      }
      return ends;
    });
    expect(spaced.length).toBeGreaterThan(0);
    expect(spaced.every((character) => character === ' ')).toBe(true);
    // The fixture: one name wider than the stage wraps inside it.
    await mountSpec(page, ['long', 'wrapping']);
    for (const id of ['long', 'wrapping']) expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth), id).toBe(true);
    expect((await pieces(run(page, 'long'))).length).toBeGreaterThan(1);
  });

  test('ICD-6: no piece runs past the edge of its container — at the width where the characters of a line and one padding fit and both paddings do not, the line holds one character fewer', async ({ page, browserName }) => {
    // The width is made from the face's own character, so that the test asks the same of every face: on a box 160
    // wide a face 7.8 wide to the character leaves room for both paddings and one 6.5 wide does not.
    test.fail(browserName === 'chromium', 'Chromium keeps no room for the padding at the end of a piece when it breaks a line');
    const name = 'tanrei.comp.navigation.drawer.item.selected.hovered.color.state';
    await mount(page, `<p>${CODE(name, 'id="long"')}</p>`, { width: 160 });
    const code = page.locator('#long');
    const [advance, padding] = [(await character(code, 0)).width, await resolveToken(page, T('container-padding-inline'))];
    expect(advance).toBeGreaterThan(padding);
    const count = 12;
    await page.locator('#text').evaluate((el, width) => ((el as HTMLElement).style.inlineSize = `${width}px`), count * advance + 1.5 * padding);
    expect((await pieces(code)).length).toBeGreaterThanOrEqual(Math.ceil(name.length / count));
    const reach = await past(code);
    expect(reach.characters).toBeLessThanOrEqual(0.5);
    expect(reach.pieces).toBeLessThanOrEqual(0.5);
    expect(await page.locator('#text').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('ICD-6: every piece of a run that breaks keeps both paddings — the first character of each line stands the padding after its piece’s start, and the last the padding before its end', async ({ page, browserName }) => {
    // WebKit clones the fill and the corners for each piece, and the padding too — except on an inline box that has a
    // `unicode-bidi` of its own, which the run has (`isolate`, ICD-8): measured on a bare `<code>` with the padding,
    // `box-decoration-break: clone` and nothing else, every piece keeps both paddings; with `unicode-bidi: isolate` (or
    // `embed`, `plaintext`, `isolate-override`) added, only the run's first and last edge do, and a border is treated
    // the same.
    test.fail(browserName === 'webkit', 'WebKit does not clone the padding of an inline box that has a unicode-bidi of its own');
    await mount(page, `<p>${CODE('tanrei.comp.navigation-drawer.item.selected.hovered.state-layer', 'id="long"')}</p>`, { width: 160 });
    const code = page.locator('#long');
    const parts = await pieces(code);
    const padding = await resolveToken(page, T('container-padding-inline'));
    const starts = await code.evaluate((el) => {
      const text = el.firstChild as Text;
      const range = document.createRange();
      const lines: { x: number; y: number }[] = [];
      for (let i = 0; i < text.length; i++) {
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        const r = range.getBoundingClientRect();
        if (!lines.some((line) => Math.abs(line.y - r.top) < r.height / 2)) lines.push({ x: r.left, y: r.top });
      }
      return lines;
    });
    expect(starts.length).toBe(parts.length);
    for (const [index, start] of starts.entries()) near(start.x - parts[index].x, padding, `the padding before piece ${index}`);
  });

  test('ICD-7: the characters are drawn as given — every space kept and a run of spaces not collapsed, nothing hyphenated, capitalised or transformed — and the fixtures carry translate="no" and spellcheck="false", which are the author’s attributes', async ({ page }) => {
    await mountSpec(page, ['spaces', 'tonal']);
    const code = run(page, 'spaces');
    const text = String(spec.fixtures.find((f) => f.id === 'spaces')!.props.text);
    expect(text).toContain('  ');
    expect(await code.textContent()).toBe(text);
    // The two spaces are two spaces wide.
    const at = text.indexOf('  ');
    const [one, two] = [await character(code, at), await character(code, at + 1)];
    expect(one.width).toBeGreaterThan(1);
    near(two.x, one.right, 'the second space follows the first', 1);
    near(two.width, one.width, 'and is as wide', 1);
    expect([await css(code, 'text-transform'), await css(code, 'hyphens'), await css(code, 'font-style')]).toEqual(['none', 'none', 'normal']);
    expect([await code.getAttribute('translate'), await code.getAttribute('spellcheck')]).toEqual(['no', 'false']);
    // A line break in the text is one space, where the browser can collapse a break and keep the spaces
    // (`white-space-collapse: preserve-spaces`); elsewhere it is drawn as a break (README, "Code").
    await mount(page, `<p>${CODE('a\nb', 'id="broken"')}</p>`);
    const supported = await page.evaluate(() => CSS.supports('white-space-collapse', 'preserve-spaces'));
    expect((await pieces(page.locator('#broken'))).length).toBe(supported ? 1 : 2);
    // It is not a link by itself, and nothing is generated around it.
    expect(await page.locator('#broken').evaluate((el) => [el.closest('a'), getComputedStyle(el, '::before').content, getComputedStyle(el, '::after').content])).toEqual([null, 'none', 'none']);
  });
});

test.describe('direction', () => {
  test('ICD-8: its text is a left-to-right run of its own, isolated from the text around it, in every layout direction: a path keeps its order inside a right-to-left sentence and reorders nothing beside it', async ({ page }) => {
    await mountSpec(page, ['rtl', 'in-rtl-paragraph', 'tonal']);
    for (const id of ['rtl', 'in-rtl-paragraph', 'tonal']) {
      const code = run(page, id).first();
      expect([await css(code, 'direction'), await css(code, 'unicode-bidi')], id).toEqual(['ltr', 'isolate']);
    }
    // `src/app/main.ts`: the first character is at the left, the last at the right, in a right-to-left stage.
    const path = run(page, 'rtl');
    expect((await character(path, 0)).x).toBeLessThan((await character(path, 'src/app/main.ts'.length - 1)).x);
    // In the sentence: `port: 4000` keeps its order (a colon and digits would otherwise be reordered by the Arabic
    // around them), and each run's characters go left to right.
    for (const code of await run(page, 'in-rtl-paragraph').all()) {
      const text = (await code.textContent())!;
      const xs = await Promise.all([...text].map((_, index) => character(code, index).then((c) => ({ x: c.x, y: c.y }))));
      const firstLine = xs.filter((c) => Math.abs(c.y - xs[0].y) < 4).map((c) => c.x);
      expect(firstLine, text).toEqual([...firstLine].sort((a, b) => a - b));
    }
  });

  test('ICD-9: the direction comes from the nearest ancestor that sets one — not from the root — and has no setting of its own; a change after the first render is drawn at once, without a motion, and the run keeps what it shows', async ({ page }) => {
    await mount(page, `<p id="p">شغّل ${CODE('npm install', 'id="c"')} الآن</p>`, { direction: 'rtl' });
    expect(await page.evaluate(() => document.documentElement.hasAttribute('dir'))).toBe(false);
    const code = page.locator('#c');
    const place = async () => ({ run: await box(code), paragraph: await box(page.locator('#p')), first: (await character(code, 0)).x, last: (await character(code, 10)).x });
    const rtl = await place();
    // Right-to-left: the sentence begins at the right, so the run stands after the first word — to its left — and
    // still reads left to right inside.
    expect(rtl.paragraph.right - rtl.run.right).toBeGreaterThan(8);
    expect(rtl.first).toBeLessThan(rtl.last);
    await stage(page, 't').evaluate((el) => el.setAttribute('dir', 'ltr'));
    const ltr = await place();
    expect(ltr.run.x).not.toBeCloseTo(rtl.run.x, 0);
    expect(ltr.first).toBeLessThan(ltr.last);
    expect(ltr.run.width).toBeCloseTo(rtl.run.width, 1);
    expect(await code.textContent()).toBe('npm install');
    expect(await code.evaluate((el) => [el.getAnimations().length, getComputedStyle(el).transitionDuration, el.hasAttribute('dir')])).toEqual([0, '0s', false]);
  });
});

test.describe('where it sits', () => {
  test('ICD-10: inside a link it takes the link’s color and the link’s underline runs under it; inside strong text it gains sys.typescale.emphasis.body of weight; inside emphasised text it is not slanted', async ({ page }) => {
    await mountSpec(page, ['in-link-and-strong']);
    const section = stage(page, 'in-link-and-strong');
    const [link, inLink, inStrong, inEm] = [section.locator('a'), section.locator('a code'), section.locator('strong code'), section.locator('em code')];
    expect(await css(inLink, 'color')).toBe(await css(link, 'color'));
    // The underline is the link's, drawn under every inline box in it: the run is an inline box and cancels nothing.
    expect(await css(link, 'text-decoration-line')).toBe('underline');
    expect([await css(inLink, 'display'), await css(inLink, 'text-decoration-line')]).toEqual(['inline', 'none']);
    // It keeps its fill there: the tonal form in the link's color.
    expect(await css(inLink, 'background-color')).toBe(await resolveColor(page, T('container-color')));
    const weight = Number((await css(inStrong, T('label-typescale-font-weight'))).trim());
    const emphasis = Number((await css(inStrong, '--tanrei-sys-typescale-emphasis-body')).trim());
    expect(emphasis).toBeGreaterThan(0);
    expect(Number(await css(inStrong, 'font-weight'))).toBe(weight + emphasis);
    expect(Number(await css(inLink, 'font-weight'))).toBe(weight);
    expect(await css(section.locator('em'), 'font-style')).toBe('italic');
    expect(await css(inEm, 'font-style')).toBe('normal');
    // Plain, in a link: the link's color too.
    await mount(page, `<p><a class="tanrei-link" href="#x">${CODE('Button', 'id="c" data-variant="plain"')}</a> <a href="#y" style="color: rgb(1, 2, 3)">${CODE('Button', 'id="d"')}</a></p>`);
    expect(await css(page.locator('#c'), 'color')).toBe(await css(page.locator('a').first(), 'color'));
    // Whatever the link's color is, and not label.color.
    expect(await css(page.locator('#d'), 'color')).toBe('rgb(1, 2, 3)');
    expect(await css(page.locator('#d'), 'background-color')).toBe(await resolveColor(page, T('container-color')));
  });

  test('ICD-11: it takes no input and no focus and changes nothing under a pointer, a press or focus — no state, no state layer, no focus indicator, no event of its own; inside a link or a button, input over it reaches that element', async ({ page }) => {
    await mount(page, `<p><button id="before">before</button> ${CODE('npm install', 'id="c"')} <a id="link" href="#there">see ${CODE('Button', 'id="in-link"')}</a> <button id="button">set ${CODE('size', 'id="in-button"')}</button></p>`);
    const code = page.locator('#c');
    expect(await code.evaluate((el) => [el.tabIndex, el.hasAttribute('tabindex'), el.getAttribute('role'), getComputedStyle(el).cursor, getComputedStyle(el).pointerEvents])).toEqual([-1, false, null, 'auto', 'auto']);
    // Tab passes it by: from the button before it to the link after it.
    await page.locator('#before').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('link');
    // Nothing changes under a pointer or a press.
    const rest = { ...(await form(code)), outline: await css(code, 'outline-style') };
    await code.hover();
    expect({ ...(await form(code)), outline: await css(code, 'outline-style') }).toEqual(rest);
    await page.mouse.down();
    expect({ ...(await form(code)), outline: await css(code, 'outline-style') }).toEqual(rest);
    await page.mouse.up();
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('c');
    expect(read('src/styles/code.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/:hover|:active|:focus|transition|cursor/);
    // Input over it reaches what holds it.
    await page.evaluate(() => {
      (window as unknown as { __clicked: string[] }).__clicked = [];
      for (const id of ['link', 'button']) document.getElementById(id)!.addEventListener('click', (event) => { event.preventDefault(); (window as unknown as { __clicked: string[] }).__clicked.push(id); });
    });
    await page.locator('#in-link').click();
    await page.locator('#in-button').click();
    expect(await page.evaluate(() => (window as unknown as { __clicked: string[] }).__clicked)).toEqual(['link', 'button']);
  });

  test('ICD-12: it is exposed as text, read where it sits in its sentence, with the code role and no name of its own; selecting it selects its characters with the text around it, and a copied selection holds exactly the text — nothing stands for the padding', async ({ page }) => {
    await mountSpec(page, ['in-paragraph', 'plain-in-table']);
    const section = stage(page, 'in-paragraph');
    await expect(section.getByRole('code')).toHaveCount(4);
    const snapshot = await section.ariaSnapshot();
    expect(snapshot).toContain('Run');
    expect(snapshot).toContain('npm install');
    expect(await section.locator('code').first().evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('role')])).toEqual([null, null, null]);
    // Nothing exposes the form: a plain run and a tonal one are the same element with the same role.
    await expect(stage(page, 'plain-in-table').getByRole('code')).toHaveCount(6);
    // The sentence, selected whole, is the sentence — the code's characters in their place.
    const selected = await section.locator('p').evaluate((el) => { getSelection()!.selectAllChildren(el); return getSelection()!.toString(); });
    expect(selected).toBe('Run npm install in the folder that holds package.json, then start the server with npm run dev -- --port 4000. The first run writes .cache/ beside your sources; it is safe to delete.');
    expect(await css(section.locator('code').first(), 'user-select')).not.toBe('none');
  });

  test('ICD-13: all of its text is one color: it takes no syntax role and interprets nothing it holds', async ({ page }) => {
    await mount(page, `<p>${CODE('<span data-syntax="keyword" id="k">const</span> <span data-syntax="constant" id="l">3</span>', 'id="c"')}</p><tanrei-code-block label="x"><pre><code><span data-syntax="keyword" id="block">const</span></code></pre></tanrei-code-block>`);
    const code = page.locator('#c');
    for (const id of ['k', 'l']) expect([await css(page.locator(`#${id}`), 'color'), await css(page.locator(`#${id}`), 'font-weight')], id).toEqual([await css(code, 'color'), await css(code, 'font-weight')]);
    // The block's roles are the block's alone.
    expect(Number(await css(page.locator('#block'), 'font-weight'))).toBeGreaterThan(Number(await css(page.locator('#k'), 'font-weight')));
    expect(await code.textContent()).toBe('const 3');
  });
});

test.describe('accessibility', () => {
  test('ICD-14: with forced colors the text is the platform’s text color (the link color in a link) with no fill; an edge is drawn only where outline.width is above 0, in that text color; tonal and plain differ from the text around them by the face alone', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page, ['tonal', 'plain', 'in-link-and-strong']);
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const drawn = async (target: Locator) => ({ color: await css(target, 'color'), fill: await css(target, 'background-color'), edge: await css(target, 'box-shadow'), outline: (await css(target, 'outline-style')) === 'none' ? 'none' : await css(target, 'outline-width') });
    const text = await css(stage(page, 'tonal').locator('p'), 'color');
    const [tonal, plain] = [await drawn(run(page, 'tonal')), await drawn(run(page, 'plain'))];
    expect(tonal.color).toBe(text);
    expect(plain.color).toBe(text);
    // No part rests on the fill: the mode's own ground, and no shadow.
    expect(tonal.fill).toBe(await css(stage(page, 'tonal'), 'background-color'));
    expect(tonal.edge).toBe('none');
    // outline.width is 0 in the default system: no edge.
    expect([tonal.outline, plain.outline]).toEqual(['0px', 'none']);
    // The face is what tells it apart.
    expect(unquoted(await css(run(page, 'tonal'), 'font-family'))).not.toBe(unquoted(await css(stage(page, 'tonal').locator('p'), 'font-family')));
    // The link color in a link.
    const link = stage(page, 'in-link-and-strong').locator('a');
    expect(await css(link.locator('code'), 'color')).toBe(await css(link, 'color'));
    expect(await css(link, 'color')).not.toBe(text);
    // An edge only where outline.width is above 0, in the text color, inside the run's box — and never on a plain run.
    await override(page, { [T('outline-width')]: '1px' });
    expect([await css(run(page, 'tonal'), 'outline-style'), await css(run(page, 'tonal'), 'outline-width'), await css(run(page, 'tonal'), 'outline-color'), await css(run(page, 'tonal'), 'outline-offset')]).toEqual(['solid', '1px', text, '-1px']);
    expect(await css(run(page, 'plain'), 'outline-style')).toBe('none');
  });

  test('ICD-15: with the text size enlarged it grows with the text it sits in, keeping the proportion, its padding and its corners; at twice the text size in a container 320 wide it wraps and the page does not scroll sideways', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const html = `<p id="p">The token ${CODE('tanrei.comp.navigation-drawer.item.selected.hovered.state-layer.color', 'id="c"')} is longer than this line.</p>`;
    const read = async () => ({ size: await px(page.locator('#c'), 'font-size'), around: await px(page.locator('#p'), 'font-size'), padding: await px(page.locator('#c'), 'padding-left'), radius: await px(page.locator('#c'), 'border-top-left-radius') });
    await mount(page, html, { width: 288 });
    const before = await read();
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await page.evaluate(() => document.fonts.ready);
    const after = await read();
    expect(after.around).toBeCloseTo(before.around * 2, 1);
    expect(after.size / after.around).toBeCloseTo(before.size / before.around, 3);
    expect(after.size / after.around).toBeCloseTo(Number(await css(page.locator('#c'), T('label-scale'))), 3);
    // Its padding and corners are the tokens' at this text size too.
    expect([after.padding, after.radius]).toEqual([await resolveToken(page, T('container-padding-inline')), await resolveToken(page, T('container-shape'))]);
    expect(after.padding).toBeGreaterThanOrEqual(before.padding);
    expect((await pieces(page.locator('#c'))).length).toBeGreaterThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    // No character passes the end of its line; a piece's box does where ICD-6's test says, and no farther.
    const reach = await past(page.locator('#c'));
    expect(reach.characters).toBeLessThanOrEqual(0.5);
    expect(reach.pieces).toBeLessThanOrEqual(await pieceMayPass(page, browserName));
  });

  test('ICD-16: with no text it draws nothing, takes no space and exposes nothing; a variant this spec does not have is drawn as auto', async ({ page }) => {
    await mount(page, `<p id="p">a${CODE('', 'id="empty"')}b</p><p id="q">ab</p><p>${CODE('x', 'id="unknown" data-variant="loud"')}</p><div data-tanrei-code="plain"><p>${CODE('x', 'id="unknown-chosen" data-variant="loud"')}</p></div>`);
    expect(await css(page.locator('#empty'), 'display')).toBe('none');
    expect((await pieces(page.locator('#empty'))).length).toBe(0);
    expect((await character(page.locator('#p'), 0)).width).toBeGreaterThan(0);
    expect((await box(page.locator('#p').locator('xpath=.'))).height).toBe((await box(page.locator('#q'))).height);
    expect(await page.locator('#p').evaluate((el) => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect().width; })).toBeCloseTo(await page.locator('#q').evaluate((el) => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect().width; }), 1);
    await expect(page.locator('#p').getByRole('code')).toHaveCount(0);
    // An unknown variant is auto: tonal by itself, and what an ancestor chooses inside one. (A stylesheet reports
    // nothing.)
    expect(await css(page.locator('#unknown'), 'background-color')).toBe(await resolveColor(page, T('container-color')));
    expect(await css(page.locator('#unknown-chosen'), 'background-color')).toBe(TRANSPARENT);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`axe: ${theme} — every fixture`, async ({ page }) => {
      await mountSpec(page, [], { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`).join('; ')}`).toEqual([]);
    });
  }
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountSpec(page);
  });

  test('every fixture draws its runs in the code face, in the form its props name, and none makes the stage scroll', async ({ page }) => {
    expect(spec.fixtures.length).toBe(13);
    const tonal = await resolveColor(page, T('container-color'));
    for (const f of spec.fixtures) {
      const runs = await run(page, f.id).all();
      expect(runs.length, f.id).toBeGreaterThan(0);
      for (const code of runs) {
        expect(await css(code, 'background-color'), f.id).toBe(f.props.variant === 'plain' ? TRANSPARENT : tonal);
        expect(unquoted(await css(code, 'font-family')), f.id).toBe(unquoted(await css(code, T('label-typescale-font-family'))));
      }
      if (f.props.text !== undefined) expect(await runs[0].textContent(), f.id).toBe(String(f.props.text));
      expect(await stage(page, f.id).evaluate((el) => el.scrollWidth <= el.clientWidth), f.id).toBe(true);
    }
    // The specimen's sections are drawn from its text: the runs it writes between backticks.
    expect(await run(page, 'in-heading').allTextContents()).toEqual(['size', 'variant', 'outlined', 'size']);
    expect(await run(page, 'japanese').allTextContents()).toEqual(['package.json', 'npm install', '.cache/']);
    expect(await stage(page, 'japanese').locator('.tanrei-prose').getAttribute('lang')).toBe('ja');
    expect(await stage(page, 'in-large-text').locator('.tanrei-prose').getAttribute('data-size')).toBe('large');
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
