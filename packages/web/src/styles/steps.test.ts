// `.tanrei-steps` (steps.css, src/steps.ts), driven by specs/steps.spec.json: every behaviour id (STP-1…20) is cited by
// a test title, every fixture has a baseline, and every length and color is read back from the tokens, never from a
// number written here. A marker and a connector are pseudo-elements: their sizes are read from their computed style,
// and the NUMBER a marker draws — generated content, which no script can read — is proved by drawing the same list
// again with the expected numbers written out as text and comparing the two pictures (`expectNumbers`).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { fixtureHost, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab } from '../../test/harness.js';
import { decodePng } from '../../test/png.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

const spec = loadSpec('steps');
type P = Page;
const T = (name: string) => `--tanrei-comp-steps-${name}`;
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const steps = (page: P, id: string) => fixtureHost(page, spec, id);
const items = (list: Locator) => list.locator(':scope > li');

interface MountOptions { system?: string; dir?: 'ltr' | 'rtl'; direction?: 'ltr' | 'rtl'; theme?: 'light' | 'dark' }
/** A window of its own for every mount: the script of the document before would still be observing (see link.test.ts). */
const fresh = (page: P) => page.goto('about:blank');
/** The spec's fixtures named, or all of them. */
const mountSpec = async (page: P, ids: string[] = [], options: MountOptions = {}) => {
  await fresh(page);
  await mountFixtures(page, spec, { icons: true, ...(ids.length ? { fixtures: spec.fixtures.filter((f) => ids.includes(f.id)) } : {}), ...options });
};
/** A stage holding `html` as it is: the fixture `t`. */
const mount = async (page: P, html: string, { direction, ...options }: MountOptions = {}) => {
  await fresh(page);
  await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 't', props: {}, content: html, ...(direction ? { direction } : {}) }], ...options });
};
const list3 = (attributes = '', body = (n: number) => `Step ${n}`) => `<ol class="tanrei-steps" role="list" ${attributes}>${[1, 2, 3].map((n) => `<li>${body(n)}</li>`).join('')}</ol>`;

const css = (target: Locator, property: string, pseudo?: string): Promise<string> =>
  target.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (target: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(target, property, pseudo));
interface Box { x: number; y: number; width: number; height: number; right: number; bottom: number }
const box = (target: Locator): Promise<Box> => target.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
/** The box of the first line of the text an element holds (the text's own box, which is centred on its line). */
const firstLine = (target: Locator): Promise<Box> =>
  target.evaluate((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node && !node.textContent!.trim()) node = walker.nextNode();
    const range = document.createRange();
    range.selectNodeContents(node!);
    const r = [...range.getClientRects()].filter((rect) => rect.width > 0)[0];
    return { x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  });
/** The inline extent of everything an item holds besides its marker: its text and its blocks. */
const content = (item: Locator): Promise<{ left: number; right: number }> =>
  item.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    return { left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)) };
  });
const near = (actual: number, expected: number, what: string, tolerance = 0.5) => expect(Math.abs(actual - expected), `${what}: ${actual} ≠ ${expected}`).toBeLessThanOrEqual(tolerance);
/** The width of the marker column: the room an item keeps at its start, less the gap between the column and the content. */
const column = async (list: Locator) => {
  const first = list.locator(':scope > li').first();
  const start = (await css(first, 'direction')) === 'rtl' ? 'right' : 'left';
  return (await px(first, `padding-${start}`)) - (await resolveToken(list.page(), T('marker-gap')));
};
/** A marker's box, from its item's: the item is what its `::before` is placed against. */
const markerBox = async (item: Locator): Promise<Box> => {
  const [outer, width, height, top] = [await box(item), await px(item, 'width', '::before'), await px(item, 'height', '::before'), await px(item, 'top', '::before')];
  // (Its place in the column is its inset and the margin that centres it.)
  const x = (await css(item, 'direction')) === 'rtl' ? outer.right - (await px(item, 'right', '::before')) - (await px(item, 'margin-right', '::before')) - width : outer.x + (await px(item, 'left', '::before')) + (await px(item, 'margin-left', '::before'));
  return { x, y: outer.y + top, width, height, right: x + width, bottom: outer.y + top + height };
};

/**
 * How wide a marker's number is set: the same digits on a line of their own in the marker's own text style. (A digit's
 * width is the engine's to set: the same face's digit, 7.78 wide at the medium size, is set 7.78 wide by one engine and
 * on a whole pixel, 8, by Chromium on Linux — so two digits with their tracking are 15.8 or 16.25 in the 16 the padding
 * leaves, and what a marker's width has to be is measured, never written here.)
 */
const numberWidth = (item: Locator, digits: string | number): Promise<number> =>
  item.evaluate((li, text) => {
    const marker = getComputedStyle(li, '::before');
    const probe = document.createElement('span');
    for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch', 'font-variant-numeric', 'font-feature-settings', 'font-variation-settings', 'font-kerning', 'letter-spacing']) probe.style.setProperty(property, marker.getPropertyValue(property));
    probe.style.cssText += ';position:absolute;inset-block-start:0;inset-inline-start:0;white-space:nowrap;';
    probe.textContent = text;
    document.body.append(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }, String(digits));
/** The number a step draws: the list's `start` and the step's place in it. */
const numberOf = (item: Locator) => item.evaluate((li) => ((li.parentElement as HTMLOListElement).start || 1) + [...li.parentElement!.children].indexOf(li));

const rgba = (color: string): number[] => {
  const srgb = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/.exec(color);
  if (srgb) return [...srgb.slice(1, 4).map((c) => Math.round(Number(c) * 255)), Math.round(Number(srgb[4] ?? 1) * 100) / 100];
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [];
  return [...parts.slice(0, 3).map(Math.round), Math.round((parts[3] ?? 1) * 100) / 100];
};
const color = async (page: P, name: string) => rgba(await resolveColor(page, name));
/** A weight token as the browser computes it (a token may be an expression). */
const weight = (page: P, name: string) => page.evaluate((token) => { const probe = document.createElement('i'); probe.style.fontWeight = `var(${token})`; document.body.append(probe); const w = getComputedStyle(probe).fontWeight; probe.remove(); return w; }, name);
/** Debug reports of the page so far. */
const reports = (page: P) => {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text()); });
  return seen;
};

/**
 * Whether the markers of `list` draw `numbers`: the list is photographed, then photographed again where it stands with
 * each marker's content replaced by the number written out, and the two pictures are the same pixel for pixel.
 */
async function drawsNumbers(list: Locator, numbers: (number | string)[]): Promise<boolean> {
  const page = list.page();
  const shot = async () => decodePng(await list.screenshot({ animations: 'disabled' }));
  const drawn = await shot();
  await list.evaluate((ol, texts) => {
    ol.setAttribute('data-written', '');
    const style = document.createElement('style');
    style.id = 'written';
    style.textContent = texts.map((text, i) => `[data-written] > li:nth-child(${i + 1})::before { content: "${text}"; }`).join('\n');
    document.head.append(style);
  }, numbers.map(String));
  const written = await shot();
  await page.evaluate(() => { document.querySelector('#written')!.remove(); document.querySelector('[data-written]')!.removeAttribute('data-written'); });
  return drawn.width === written.width && drawn.height === written.height && Buffer.compare(Buffer.from(drawn.data), Buffer.from(written.data)) === 0;
}
const expectNumbers = async (list: Locator, numbers: (number | string)[]) => expect(await drawsNumbers(list, numbers), `the markers draw ${numbers.join(', ')}`).toBe(true);

test.describe('the stylesheet', () => {
  test('every value is a token: no literal color, length, duration or opacity', () => {
    const body = read('src/styles/steps.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const literals = [...body.matchAll(/:\s*([^;{}]+);/g)]
      .map((m) => m[1].replace(/var\([^()]*(\([^()]*\))*[^()]*\)/g, '').replace(/calc\(|\)/g, ''))
      .flatMap((value) => value.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsl|\b\d*\.?\d+(px|rem|em|ms|s)\b/gi) ?? []);
    // `0px` is nothing: the floor of the space a step's content is lowered by.
    expect(literals.filter((literal) => literal !== '0px')).toEqual([]);
    // No color of its own for any text (STP-2, STP-6, STP-7), no fill, no elevation (STP-1), and nothing for a state (STP-11).
    expect(body).not.toMatch(/(^|[\s;{])color:/);
    expect(body).not.toMatch(/background|box-shadow|:hover|:focus|:active|cursor|transition|animation/);
  });

  test('a rule has no specificity: one class of the product wins, even in the same layer and written first', async ({ page }) => {
    await mount(page, `<style>@layer tanrei.components { .mine { column-gap: 3px; } .mine > .step { padding-block-start: 7px; } .mine > li > .title { letter-spacing: 3px; } }</style><ol class="tanrei-steps mine" role="list"><li class="step"><p class="tanrei-steps-title title">One</p><p>Body</p></li></ol>`);
    expect(await css(page.locator('.mine'), 'column-gap')).toBe('3px');
    expect(await css(page.locator('.step'), 'padding-top')).toBe('7px');
    expect(await css(page.locator('.title'), 'letter-spacing')).toBe('3px');
  });

  test('dist/prose.css ends with the steps’ own rules, so a set of steps in a prose is drawn the same whichever stylesheet is loaded last; the corner rule is the shared one (STP-2, STP-7, STP-8)', async ({ page }) => {
    const rules = (text: string) => text.slice(text.indexOf('/* steps:rules */') + '/* steps:rules */'.length, text.indexOf('/* steps:rules:end */')).trim();
    const [own, prose] = [read('dist/steps.css'), read('dist/prose.css')];
    expect(rules(own).length).toBeGreaterThan(3000);
    // (After prose's own rules; the timeline's, said again for the same reason, follow them and end the file.)
    expect(prose).toContain(rules(own));
    expect(prose.slice(prose.indexOf(rules(own)) + rules(own).length)).not.toMatch(/\.tanrei-prose-anchor|tanrei-steps/);
    const { SHAPE_CSS } = (await import(path.join(pkg, 'dist/styles/shape.js'))) as { SHAPE_CSS: string };
    expect(own.replace(/\s+/g, ' ')).toContain(SHAPE_CSS.slice(SHAPE_CSS.indexOf('@supports'), SHAPE_CSS.indexOf('[data-tanrei-shape]::before')).replaceAll('[data-tanrei-shape]', ':where(.tanrei-steps) > :where(li)::before').replace(/\s+/g, ' ').trim());
    expect(read('src/styles/steps.css')).not.toContain('superellipse');
    // Both orders, measured: the section `with-table-and-tabs` (a title-less step with a paragraph, a code block and boxes).
    const measure = async (order: string[]) => {
      await page.goto('about:blank');
      const body = (await fixturesDocument(spec, { fixtures: spec.fixtures.filter((f) => f.id === 'in-prose' || f.id === 'titles-as-headings') })).replace(/<style>[^<]*tanrei-steps[\s\S]*?<\/style>/, '');
      await page.setContent(body.replace('</head>', `${order.map((file) => `<style>${read(file)}</style>`).join('')}<style>.stage > .tanrei-prose { inline-size: 720px; }</style></head>`));
      await page.evaluate(() => document.fonts.ready);
      return page.evaluate(() => [...document.querySelectorAll('.tanrei-steps, .tanrei-steps > li, .tanrei-steps > li > *')].map((el) => { const r = el.getBoundingClientRect(); return [el.localName, Math.round(r.left * 4), Math.round(r.top * 4), Math.round(r.width * 4), Math.round(r.height * 4), getComputedStyle(el).fontSize].join(' '); }));
    };
    const first = await measure(['dist/prose.css', 'dist/steps.css']);
    expect(first.length).toBeGreaterThan(15);
    expect(await measure(['dist/steps.css', 'dist/prose.css'])).toEqual(first);
    // …and prose.css alone draws them, as it draws its links.
    expect(await measure(['dist/prose.css'])).toEqual(first);
  });
});

test.describe('layout', () => {
  test('STP-1 one column of steps, each its marker at the start and its content beside it at one edge after the shared marker column; the step gap between steps, none before the first or after the last; no fill, edge or elevation', async ({ page }) => {
    await mountSpec(page, ['short', 'large-short', 'two-digits', 'three-digits']);
    const gap = await resolveToken(page, T('marker-gap'));
    const between = await resolveToken(page, T('step-gap'));
    for (const [id, size] of [['short', 'medium'], ['large-short', 'large']] as const) {
      const list = steps(page, id);
      const height = await resolveToken(page, T(`marker-height-${size}`));
      const outer = await box(list);
      near(await column(list), height, `${id}: the marker column is the marker's height`);
      const boxes: Box[] = [];
      for (const item of await items(list).all()) {
        boxes.push(await box(item));
        near((await content(item)).left, outer.x + height + gap, `${id}: the content edge`);
        near(await px(item, 'width', '::before'), height, `${id}: the marker's width`);
      }
      expect(boxes).toHaveLength(3);
      // In order, the gap apart; the set is exactly its steps and the gaps.
      near(boxes[0].y, outer.y, `${id}: no space before the first`);
      near(boxes[2].bottom, outer.bottom, `${id}: no space after the last`);
      for (const i of [1, 2]) near(boxes[i].y - boxes[i - 1].bottom, between, `${id}: the gap before step ${i + 1}`);
      near(outer.height, boxes.reduce((sum, b) => sum + b.height, 0) + 2 * between, `${id}: the set's height`);
      for (const b of boxes) near(b.right, outer.right, `${id}: a step runs to the end edge`);
      for (const target of [list, items(list).first()]) {
        expect(rgba(await css(target, 'background-color'))[3]).toBe(0);
        expect(await css(target, 'border-top-style')).toBe('none');
        expect(await css(target, 'box-shadow')).toBe('none');
      }
    }
    // The verify's own numbers, under the default system.
    near((await content(items(steps(page, 'short')).first())).left - (await box(steps(page, 'short'))).x, 36, 'medium: 24 and 12');
    near((await content(items(steps(page, 'large-short')).first())).left - (await box(steps(page, 'large-short'))).x, 40, 'large: 28 and 12');
    expect(between).toBe(16);
    // The widest marker sizes the column, and every content begins at one edge.
    for (const id of ['two-digits', 'three-digits']) {
      const list = steps(page, id);
      const widths = await Promise.all((await items(list).all()).map((item) => px(item, 'width', '::before')));
      // (A marker wider than a circle is measured by the package's script: the column follows in the same task.)
      await expect.poll(async () => Math.abs((await column(list)) - Math.max(...widths))).toBeLessThanOrEqual(0.05);
      // Each marker is centred in the column.
      for (const item of await items(list).all()) near(((await markerBox(item)).x + (await markerBox(item)).right) / 2, (await box(list)).x + (await column(list)) / 2, `${id}: centred in the column`, 0.05);
      const edges = await Promise.all((await items(list).all()).map(async (item) => (await content(item)).left));
      for (const edge of edges) near(edge, (await box(list)).x + Math.max(...widths) + gap, `${id}: one edge`);
    }
    expect(await column(steps(page, 'three-digits'))).toBeGreaterThan(await column(steps(page, 'two-digits')));
  });

  test('STP-2 a marker is a ring with the number at its centre: at least the marker’s height high and wide, the marker’s shape, no fill, the outline inside its size, the number on one line in the label style and the surface’s content color, padded so a long number widens it into a pill', async ({ page }) => {
    await mountSpec(page, ['short', 'two-digits', 'three-digits', 'large-two-digits']);
    const padding = await resolveToken(page, T('marker-padding-inline'));
    for (const [id, size] of [['short', 'medium'], ['two-digits', 'medium'], ['three-digits', 'medium'], ['large-two-digits', 'large']] as const) {
      const height = await resolveToken(page, T(`marker-height-${size}`));
      for (const item of await items(steps(page, id)).all()) {
        const ring = (property: string) => css(item, property, '::before');
        expect(await px(item, 'height', '::before'), id).toBe(height);
        // As wide as it is high, or as its number and the room on both sides of it where that is more: never narrower
        // than a circle, never cutting the number.
        near(await px(item, 'width', '::before'), Math.max(height, (await numberWidth(item, await numberOf(item))) + 2 * padding), `${id}: a circle, or the number and its room`, 0.05);
        expect(await px(item, 'width', '::before'), id).toBeGreaterThanOrEqual(height);
        expect(await ring('box-sizing')).toBe('border-box');
        expect(await px(item, 'border-top-width', '::before')).toBe(await resolveToken(page, T('marker-outline-width')));
        expect(await ring('border-top-style')).toBe('solid');
        expect(rgba(await ring('border-top-color'))).toEqual(await color(page, T('marker-outline-color')));
        expect(rgba(await ring('background-color'))[3]).toBe(0);
        // The shape: the full step, so never less than half the height — a circle, or a pill's caps.
        expect(await px(item, 'border-top-left-radius', '::before')).toBeGreaterThanOrEqual(height / 2);
        expect(await ring('white-space')).toBe('nowrap');
        expect(await ring('overflow-x')).toBe('visible');
        // The room between the number and the marker's edge, with the ring inside it.
        expect((await px(item, 'padding-left', '::before')) + (await px(item, 'border-left-width', '::before'))).toBe(padding);
        expect(await px(item, 'font-size', '::before')).toBe(await resolveToken(page, T(`marker-label-typescale-${size}-font-size`)));
        expect(await ring('font-weight')).toBe(await weight(page, T(`marker-label-typescale-${size}-font-weight`)));
        // The content color of the surface: the stage's, which the steps do not replace.
        expect(await ring('color')).toBe(await css(stage(page, id), 'color'));
        // At its centre: the line is as high as the marker inside its ring, and centred across it.
        expect(await ring('text-align')).toBe('center');
        near(await px(item, 'line-height', '::before'), height - 2 * (await px(item, 'border-top-width', '::before')), `${id}: the number's line`, 0.05);
      }
    }
    // Circles 24 across wherever the number and its room fit in 24: one digit everywhere, two digits where the engine
    // sets them no wider than 16 with their tracking (it does not on the machine that records the baselines: 24.25
    // across). 99 beside the pills of 100
    // and 101, each 24 high.
    const fits = async (item: Locator) => (await numberWidth(item, await numberOf(item))) + 2 * padding <= 24;
    for (const item of await items(steps(page, 'short')).all()) {
      expect(await fits(item), 'one digit and its room fit in a circle').toBe(true);
      expect(await px(item, 'width', '::before')).toBe(24);
    }
    for (const item of [...(await items(steps(page, 'two-digits')).all()), items(steps(page, 'three-digits')).first()]) {
      if (await fits(item)) expect(await px(item, 'width', '::before')).toBe(24);
      else expect((await px(item, 'width', '::before')) - 24, 'two digits: wider than a circle by what the font’s digits ask, less than one more digit').toBeLessThan((await numberWidth(item, 0)));
    }
    const three = await Promise.all((await items(steps(page, 'three-digits')).all()).map((item) => px(item, 'width', '::before')));
    expect(three[1]).toBeGreaterThan(Math.max(24, three[0]));
    expect(three[2]).toBeGreaterThan(Math.max(24, three[0]));
    for (const item of await items(steps(page, 'three-digits')).all()) expect(await px(item, 'height', '::before')).toBe(24);
    await expectNumbers(steps(page, 'three-digits'), [99, 100, 101]);
  });

  test('STP-2 the ring’s corners are the shared corner rule: eased by sys.shape.corner-smoothing for a marker shape that is not the full step, and round caps for the full step whatever the smoothing', async ({ page }) => {
    await mountSpec(page, ['short'], { system: 'cupertino' });
    const item = items(steps(page, 'short')).first();
    const eases = await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(1)'));
    expect(Number(await css(page.locator('html'), '--tanrei-sys-shape-corner-smoothing'))).toBeGreaterThan(0);
    // The full step: a pill, drawn round.
    expect(await px(item, 'border-top-left-radius', '::before')).toBe(await resolveToken(page, T('marker-shape')));
    if (eases) expect(['round', 'superellipse(1)']).toContain(await css(item, 'corner-top-left-shape', '::before'));
    // A layer that gives the marker a small corner: the amount applies.
    await page.addStyleTag({ content: ':root { --tanrei-comp-steps-marker-shape: var(--tanrei-sys-shape-corner-small); --tanrei-comp-steps-marker-shape-pill: 0; }' });
    const radius = await resolveToken(page, '--tanrei-sys-shape-corner-small');
    const smoothing = Number(await css(page.locator('html'), '--tanrei-sys-shape-corner-smoothing'));
    near(await px(item, 'border-top-left-radius', '::before'), radius * (eases ? 1 + 0.4 * smoothing : 1), 'the radius', 0.05);
    if (eases) expect(['round', 'superellipse(1)']).not.toContain(await css(item, 'corner-top-left-shape', '::before'));
    else test.info().annotations.push({ type: 'corner-shape', description: 'not in this browser: circular corners, the first value' });
  });

  test('STP-3 a marker stands at the top of its step, centred on the first line — the title’s where there is one; where it is the taller the content is lowered by half the difference; on a block that is not text its top is the block’s top', async ({ page }) => {
    await mountSpec(page, ['short', 'titles', 'large', 'in-prose']);
    for (const [id, size] of [['short', 'medium'], ['titles', 'medium'], ['large', 'large'], ['in-prose', 'medium']] as const) {
      const marker = await resolveToken(page, T(`marker-height-${size}`));
      for (const item of await items(steps(page, id)).all()) {
        const outer = await box(item);
        const lowered = await px(item, 'padding-top');
        const top = (await markerBox(item)).y;
        near(top, outer.y, `${id}: the marker's top is the step's top`, 0.05);
        const line = await firstLine(item);
        near(line.y + line.height / 2, top + marker / 2, `${id}: centred on the first line`, 1);
        // Half the difference between the marker and the line.
        const first = item.locator(':scope > :first-child');
        const lineHeight = (await first.count()) ? await px(first, 'line-height') : await px(item, 'line-height');
        near(lowered, Math.max(0, (marker - lineHeight) / 2), `${id}: lowered by half the difference`, 0.05);
        if (await first.count()) near((await box(first)).y - outer.y, lowered, `${id}: the first block begins there`, 0.05);
      }
    }
    // The verify's numbers: a line of 22 under a marker of 24 begins 1 below; a title's line of 20 begins 2 below.
    near(await px(items(steps(page, 'short')).first(), 'padding-top'), 1, 'a line of 22 under a marker of 24', 0.01);
    near(await px(items(steps(page, 'titles')).first(), 'padding-top'), 2, 'a title’s line of 20', 0.01);
    // A marker shorter than the line is lowered instead, and never reaches above its step.
    await page.addStyleTag({ content: ':root { --tanrei-comp-steps-marker-height-medium: 12px; --tanrei-comp-steps-marker-label-typescale-medium-font-size: 8px; }' });
    const small = items(steps(page, 'short')).first();
    expect(await px(small, 'padding-top')).toBe(0);
    near(await px(small, 'top', '::before'), ((await px(small, 'line-height')) - 12) / 2, 'the marker is lowered', 0.05);
    near(await px(small, 'top', '::after'), (await px(small, 'top', '::before')) + 12 + (await resolveToken(page, T('connector-gap'))), 'the connector begins under it', 0.05);
    // A step that begins with a block that is not text.
    await mount(page, '<ol class="tanrei-steps" role="list"><li><pre style="margin:0">code</pre><p>after</p></li><li><img alt="" width="40" height="40" style="display:block"><p>after</p></li><li>text</li></ol>');
    for (const item of (await items(page.locator('.tanrei-steps')).all()).slice(0, 2)) {
      expect(await px(item, 'padding-top')).toBe(0);
      expect(await px(item, 'top', '::before')).toBe(0);
      near((await box(item.locator(':scope > :first-child'))).y, (await box(item)).y, 'the block’s top is the step’s top', 0.05);
    }
  });

  test('STP-4 the steps are numbered from start, each one more than the last, in the digits 0 to 9 with nothing beside them; a step added, removed or moved renumbers every step at once', async ({ page }) => {
    await mountSpec(page, ['short', 'start', 'two-digits']);
    await expectNumbers(steps(page, 'short'), [1, 2, 3]);
    await expectNumbers(steps(page, 'start'), [4, 5, 6]);
    await expectNumbers(steps(page, 'two-digits'), [9, 10, 11]);
    // The comparison does tell numbers apart, and a mark beside a number.
    expect(await drawsNumbers(steps(page, 'start'), [4, 5, 7])).toBe(false);
    expect(await drawsNumbers(steps(page, 'short'), ['1.', '2.', '3.'])).toBe(false);
    // The list's own counter, with no marker of the browser's beside the ring.
    const first = items(steps(page, 'start')).first();
    expect(await css(first, 'content', '::before')).toContain('counter(list-item');
    expect([await css(first, 'display'), await css(first, 'list-style-type')]).toEqual(['list-item', 'none']);
    // Inserted before the second of three: 1, 2, 3, 4 — and no motion to wait for.
    const list = steps(page, 'short');
    await list.evaluate((ol) => ol.children[1].before(Object.assign(document.createElement('li'), { textContent: 'A step put in.' })));
    await expectNumbers(list, [1, 2, 3, 4]);
    await list.evaluate((ol) => { ol.children[0].remove(); ol.append(ol.children[0]); });
    await expectNumbers(list, [1, 2, 3]);
    // A change of start: the list's own counter.
    await steps(page, 'start').evaluate((ol: HTMLOListElement) => (ol.start = 7));
    await expect.poll(() => drawsNumbers(steps(page, 'start'), [7, 8, 9])).toBe(true);
    await steps(page, 'start').evaluate((ol: HTMLOListElement) => ol.removeAttribute('start'));
    await expect.poll(() => drawsNumbers(steps(page, 'start'), [1, 2, 3])).toBe(true);
    for (const pseudo of ['::before', '::after']) expect(await css(first, 'transition-duration', pseudo)).toBe('0s');
  });

  test('STP-5 a connector joins a step’s marker to the next: a hairline on the marker column’s centre line, the connector gap from both rings, through the space between the steps; none after the last step, none in a set of one; it takes no room and no press', async ({ page }) => {
    await mountSpec(page, ['short', 'long-bodies', 'single', 'three-digits', 'large-short']);
    const kept = await resolveToken(page, T('connector-gap'));
    const between = await resolveToken(page, T('step-gap'));
    for (const [id, size] of [['short', 'medium'], ['long-bodies', 'medium'], ['three-digits', 'medium'], ['large-short', 'large']] as const) {
      const list = steps(page, id);
      const marker = await resolveToken(page, T(`marker-height-${size}`));
      const all = await items(list).all();
      for (const [i, item] of all.entries()) {
        if (i === all.length - 1) {
          expect(await css(item, 'content', '::after'), `${id}: none after the last`).toBe('none');
          continue;
        }
        const line = (property: string) => css(item, property, '::after');
        const here = await box(item);
        expect(await line('position')).toBe('absolute');
        expect(await line('pointer-events')).toBe('none');
        near(await px(item, 'top', '::after'), marker + kept, `${id}: begins the gap under the marker`, 0.05);
        // …and ends the gap above the next marker, whose top is the next step's top (STP-3).
        const next = await box(all[i + 1]);
        near(here.y + (await px(item, 'top', '::after')) + (await px(item, 'height', '::after')), next.y - kept, `${id}: ends the gap above the next marker`, 0.05);
        near(await px(item, 'height', '::after'), here.height - marker + between - 2 * kept, `${id}: as long as its step`, 0.05);
        const logical = (await css(item, 'direction')) === 'rtl' ? 'right' : 'left';
        expect(await px(item, `border-${logical}-width`, '::after')).toBe(await resolveToken(page, T('connector-thickness')));
        expect(rgba(await line(`border-${logical}-color`))).toEqual(await color(page, T('connector-color')));
        // On the centre line of the marker column.
        near((await px(item, 'left', '::after')) + (await px(item, 'border-left-width', '::after')) / 2, (await column(list)) / 2, `${id}: on the centre line`, 0.05);
        // …which is the centre of its marker and of the next.
        for (const end of [item, all[i + 1]]) near(((await markerBox(end)).x + (await markerBox(end)).right) / 2, here.x + (await column(list)) / 2, `${id}: the markers' centre`, 0.05);
      }
    }
    // Two one-line medium steps: 16 between the markers, 4 kept at each end.
    const oneLine = items(steps(page, 'short')).nth(2);
    expect((await box(oneLine)).height).toBe(24);
    await steps(page, 'short').evaluate((ol) => ol.append(Object.assign(document.createElement('li'), { textContent: 'One line.' })));
    expect(await px(oneLine, 'height', '::after')).toBe(8);
    // A set of one.
    expect(await css(items(steps(page, 'single')).first(), 'content', '::after')).toBe('none');
    // It takes no room: the set is exactly its steps and gaps (STP-1), and each connector is longer in a longer step.
    const long = await Promise.all((await items(steps(page, 'long-bodies')).all()).slice(0, 2).map((item) => px(item, 'height', '::after')));
    for (const length of long) expect(length).toBeGreaterThan(60);
    // Never over a step's content: it is narrower than the marker column, which the content begins after.
    expect(await px(items(steps(page, 'short')).first(), 'width', '::after')).toBe(0);
  });

  test('STP-6 a title is drawn first, in the title’s text style and the surface’s content color, wraps, and the body begins the title gap below it; given as text it is no heading; a heading given as the title is drawn as any title and keeps its role and level; a title with no body is drawn alone', async ({ page }) => {
    await mountSpec(page, ['titles', 'large', 'long-title', 'titles-only', 'titles-as-headings']);
    const gap = await resolveToken(page, T('title-gap'));
    const html = page.locator('html');
    for (const [id, size] of [['titles', 'medium'], ['large', 'large'], ['long-title', 'medium'], ['titles-as-headings', 'large']] as const) {
      for (const item of await items(steps(page, id)).all()) {
        const title = item.locator(':scope > :first-child');
        expect(await px(title, 'font-size'), id).toBe(await resolveToken(page, T(`title-typescale-${size}-font-size`)));
        expect(await css(title, 'font-weight')).toBe(await weight(page, T(`title-typescale-${size}-font-weight`)));
        near(await px(title, 'line-height'), (await resolveToken(page, T(`title-typescale-${size}-font-size`))) * Number(await css(html, T(`title-typescale-${size}-line-height`))), `${id}: the title's line`, 0.05);
        expect(await css(title, 'color')).toBe(await css(stage(page, id), 'color'));
        const body = item.locator(':scope > :nth-child(2)');
        near((await box(body)).y - (await box(title)).bottom, gap, `${id}: the body begins the title gap below`, 0.05);
        expect(await css(title, 'overflow-x')).toBe('visible');
        expect(await css(title, 'white-space')).toBe('normal');
      }
    }
    // It wraps.
    const long = items(steps(page, 'long-title')).first().locator(':scope > :first-child');
    expect((await box(long)).height).toBeGreaterThan(2 * (await px(long, 'line-height')) - 1);
    // Text of its step, not a heading.
    await expect(steps(page, 'titles').getByRole('heading')).toHaveCount(0);
    expect(await items(steps(page, 'titles')).first().locator(':scope > :first-child').evaluate((el) => [el.localName, el.getAttribute('role')])).toEqual(['p', null]);
    // Level 4 headings: the title's text style, not the heading role of level 4, and still headings of level 4.
    const headings = steps(page, 'titles-as-headings').getByRole('heading', { level: 4 });
    await expect(headings).toHaveCount(3);
    await expect(headings.first()).toHaveText('Sign the last page');
    expect(await headings.first().evaluate((el) => el.localName)).toBe('h4');
    expect(await px(headings.first(), 'font-size')).not.toBe(await resolveToken(page, '--tanrei-sys-typescale-heading-4-font-size'));
    // A title and no body: the marker and the title alone.
    for (const item of await items(steps(page, 'titles-only')).all()) {
      expect(await item.evaluate((el) => el.childElementCount)).toBe(1);
      near((await box(item)).height, Math.max(await resolveToken(page, T('marker-height-medium')), (await px(item, 'padding-top')) + (await box(item.locator(':scope > *'))).height), 'a title alone', 0.05);
    }
  });

  test('STP-7 the body takes the body’s text style of the size and no color of the steps’; it wraps and is never cut; two blocks are the body gap apart, the first with no space before and the last with none after; long-form blocks are prose’s and a link is underlined', async ({ page }) => {
    await mountSpec(page, ['short', 'large-short', 'with-code', 'with-code-medium', 'long-bodies']);
    const html = page.locator('html');
    for (const [id, size] of [['short', 'medium'], ['large-short', 'large']] as const) {
      const item = items(steps(page, id)).first();
      expect(await px(item, 'font-size')).toBe(await resolveToken(page, T(`body-typescale-${size}-font-size`)));
      expect(await css(item, 'font-weight')).toBe(await weight(page, T(`body-typescale-${size}-font-weight`)));
      near(await px(item, 'line-height'), (await resolveToken(page, T(`body-typescale-${size}-font-size`))) * Number(await css(html, T(`body-typescale-${size}-line-height`))), `${id}: the body's line`, 0.05);
    }
    // No color of its own: on another surface's content color the number, the title and the body are that color.
    await page.addStyleTag({ content: '.stage[data-fixture="short"] { color: rgb(1, 2, 3); }' });
    const first = items(steps(page, 'short')).first();
    expect(await css(first, 'color')).toBe('rgb(1, 2, 3)');
    expect(await css(first, 'color', '::before')).toBe('rgb(1, 2, 3)');
    // Never cut.
    for (const item of await items(steps(page, 'long-bodies')).all()) {
      expect(await css(item, 'overflow-x')).toBe('visible');
      expect(await css(item, '-webkit-line-clamp')).toBe('none');
      expect((await box(item)).height).toBeGreaterThan(3 * (await px(item, 'line-height')));
    }
    // The gap between two blocks, whatever they are; the next step's marker the step gap below the last block.
    const gap = await resolveToken(page, T('body-gap'));
    const between = await resolveToken(page, T('step-gap'));
    expect([gap, between]).toEqual([8, 16]);
    for (const id of ['with-code', 'with-code-medium']) {
      const all = await items(steps(page, id)).all();
      for (const [i, item] of all.entries()) {
        const blocks = await Promise.all((await item.locator(':scope > *').all()).map(box));
        expect(blocks.length).toBeGreaterThan(1);
        for (let b = 1; b < blocks.length; b++) near(blocks[b].y - blocks[b - 1].bottom, gap, `${id}: step ${i + 1}, block ${b + 1}`, 0.05);
        const outer = await box(item);
        near(blocks[0].y - outer.y, await px(item, 'padding-top'), `${id}: no space before the first block`, 0.05);
        near(outer.bottom, blocks.at(-1)!.bottom, `${id}: no space after the last block`, 0.05);
        if (i < all.length - 1) near((await box(all[i + 1])).y - blocks.at(-1)!.bottom, between, `${id}: the next marker`, 0.05);
      }
    }
    // Prose inside a step: strong text at the emphasized weight, a link underlined at rest, with no class.
    await mount(page, '<div class="tanrei-prose"><ol class="tanrei-steps" role="list"><li><p><strong>Build.</strong> Read <a href="#x">the guide</a> and <code>run</code>.</p></li></ol></div>');
    expect(await css(page.locator('a'), 'text-decoration-line')).toBe('underline');
    expect(await css(page.locator('strong'), 'font-weight')).toBe(await weight(page, T('body-typescale-medium-font-weight-emphasized')));
    // Nothing is added inside a component placed in a body: the code block's own parts keep their own style.
    await mountSpec(page, ['with-code']);
    const code = steps(page, 'with-code').locator('tanrei-code-block').first();
    expect(await px(code.locator('pre'), 'font-size')).not.toBe(await px(items(steps(page, 'with-code')).first(), 'font-size'));
    expect(await px(code.locator('pre'), 'margin-top')).toBe(0);
  });

  test('STP-8 a block that is not text takes the body’s whole width and scrolls in its own box; in a prose with a measure the steps take the prose’s width and the text blocks stop at the measure; outside a prose every block fills the body', async ({ page }) => {
    await mountSpec(page, ['with-code', 'with-table-and-tabs', 'in-prose', 'in-prose-large']);
    const measure = Number(await css(page.locator('html'), '--tanrei-comp-prose-measure'));
    const gap = await resolveToken(page, T('marker-gap'));
    for (const id of ['with-code', 'with-table-and-tabs']) {
      const prose = await box(stage(page, id).locator('.tanrei-prose'));
      expect(prose.width).toBe(720);
      const list = steps(page, id);
      near((await box(list)).width, 720, `${id}: the steps take the prose's full width`, 0.05);
      const edge = prose.x + (await column(list)) + gap;
      for (const block of await list.locator(':scope > li > :is(tanrei-code-block, .specimen-placeholder)').all()) {
        const b = await box(block);
        near(b.x, edge, `${id}: from the content edge`, 0.05);
        near(b.right, prose.right, `${id}: to the prose's end edge`, 0.05);
      }
      for (const paragraph of await list.locator(':scope > li > p').all()) {
        expect((await box(paragraph)).width).toBeLessThanOrEqual(measure * (await px(paragraph, 'font-size')) + 0.05);
        near((await box(paragraph)).x, edge, `${id}: a paragraph begins at the content edge`, 0.05);
      }
    }
    for (const id of ['in-prose', 'in-prose-large']) {
      const list = steps(page, id);
      const edge = (await box(list)).x + (await column(list)) + gap;
      for (const paragraph of await list.locator(':scope > li > p').all()) {
        const b = await box(paragraph);
        near(b.width, Math.min(measure * (await px(paragraph, 'font-size')), 720 - (await column(list)) - gap), `${id}: the measure, counted from the content's start edge`, 0.05);
        near(b.x, edge, id, 0.05);
      }
    }
    // A block that cannot shrink scrolls in its own box, not the steps.
    await mount(page, `<div class="tanrei-prose" style="inline-size:320px"><ol class="tanrei-steps" role="list"><li><p>Run it.</p><pre><code>${'a-long-line-of-code '.repeat(12)}</code></pre></li><li><p>Done.</p></li></ol></div>`);
    const pre = page.locator('pre');
    expect(await pre.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    near((await box(pre)).right, (await box(page.locator('.tanrei-prose'))).right, 'the block ends at the end edge', 0.05);
    expect(await page.locator('.tanrei-steps').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // Outside a prose, and in one without a measure, every block takes the body's full inline size.
    for (const wrapper of ['<div style="inline-size:900px">', '<div class="tanrei-prose" data-measure="false" style="inline-size:900px">']) {
      await mount(page, `${wrapper}<ol class="tanrei-steps" role="list"><li><p id="p">${'Words that fill the line. '.repeat(12)}</p></li><li>${'Words that fill the line. '.repeat(12)}</li></ol></div>`);
      const list = page.locator('.tanrei-steps');
      near((await box(list)).width, 900, 'the steps fill the container', 0.05);
      near((await box(page.locator('#p'))).width, 900 - (await column(list)) - gap, 'a paragraph fills the body', 0.05);
      expect((await content(items(list).nth(1))).right).toBeGreaterThan((await box(list)).right - 120);
    }
    // In a prose with a measure, a set whose every step is text alone is kept to the measure as its text would be.
    await mount(page, `<div class="tanrei-prose" style="inline-size:900px"><ol class="tanrei-steps" role="list"><li><strong>Build.</strong> ${'Words that fill the line. '.repeat(12)}</li><li>Short.</li></ol></div>`);
    const text = page.locator('.tanrei-steps');
    near((await box(text)).width, 900, 'the set takes the prose’s width', 0.05);
    near((await box(items(text).first())).width, measure * (await px(text, 'font-size')) + (await column(text)) + gap, 'the measure after the marker column', 0.05);
    // Text written directly with a link and code in it flows as one paragraph: its parts are on one line.
    await mount(page, '<div class="tanrei-prose"><ol class="tanrei-steps" role="list"><li><strong id="s">Validate.</strong> Run <code id="c">pnpm validate</code> and <a id="a" href="#x">read the report</a>.</li></ol></div>');
    const tops = await Promise.all(['#s', '#c', '#a'].map(async (id) => (await box(page.locator(id))).y + (await box(page.locator(id))).height / 2));
    for (const top of tops) near(top, tops[0], 'one line', 3);
    expect((await box(page.locator('#c'))).x).toBeGreaterThan((await box(page.locator('#s'))).right);
    expect((await box(page.locator('.tanrei-steps > li'))).height).toBeLessThan(2 * (await px(page.locator('.tanrei-steps > li'), 'line-height')));
  });

  test('STP-9 a list in a body is prose’s list one depth down — letters for an ordered one, a ring for an unordered one, set in by prose’s inset, with no marker or connector of the steps’; a set of steps in a step is a set of its own and is reported', async ({ page }) => {
    await mountSpec(page, ['nested-list']);
    const list = steps(page, 'nested-list');
    const indent = await resolveToken(page, '--tanrei-comp-prose-list-indent');
    const gap = await resolveToken(page, T('marker-gap'));
    const edge = (await box(list)).x + (await column(list)) + gap;
    const ordered = list.locator(':scope > li > ol');
    const unordered = list.locator(':scope > li > ul');
    await expect(ordered).toHaveCount(1);
    await expect(unordered).toHaveCount(1);
    expect(await css(ordered, 'list-style-type')).toBe('lower-alpha');
    expect(await css(unordered, 'list-style-type')).toBe('circle');
    for (const inner of [ordered, unordered]) {
      expect(await px(inner, 'padding-left')).toBe(indent);
      near((await box(inner)).x, edge, 'set in from the body’s start edge', 0.05);
      await expect(inner.locator(':scope > li')).toHaveCount(3);
      for (const item of await inner.locator(':scope > li').all()) {
        expect(await css(item, 'display')).toBe('list-item');
        for (const pseudo of ['::before', '::after']) expect(await css(item, 'content', pseudo)).toBe('none');
      }
      // After the step's own paragraph, the body gap.
      near((await box(inner)).y - (await box(inner.locator('xpath=preceding-sibling::*[1]'))).bottom, await resolveToken(page, T('body-gap')), 'the body gap', 0.05);
    }
    await expectNumbers(list, [1, 2, 3, 4]);
    // A tight item, as a Markdown renderer writes it: the list follows the step's own text.
    await mount(page, '<div class="tanrei-prose"><ol class="tanrei-steps" role="list"><li>Export its data:<ol><li>choose</li><li>wait</li></ol></li><li>Close.</li></ol></div>');
    expect(await css(page.locator('.tanrei-steps ol'), 'list-style-type')).toBe('lower-alpha');
    expect(await px(page.locator('.tanrei-steps ol'), 'margin-top')).toBe(await resolveToken(page, T('body-gap')));
    // Steps in a step.
    const seen = reports(page);
    await mount(page, `<ol class="tanrei-steps" role="list" id="outer"><li><p>Outer one.</p>${list3('id="inner" start="5"')}</li><li>Outer two.</li></ol>`);
    const inner = page.locator('#inner');
    await expectNumbers(inner, [5, 6, 7]);
    await expectNumbers(page.locator('#outer'), [1, 2]);
    const body = await box(page.locator('#outer > li > p'));
    near((await box(inner)).x, body.x, 'laid out in the body’s width', 0.05);
    near((await box(inner)).right, (await box(page.locator('#outer'))).right, 'to the end edge', 0.05);
    await expect.poll(() => seen.filter((line) => line.includes('STP-9'))).toHaveLength(1);
  });

  test('STP-10 the steps are a block in the flow: the whole inline size of the container from the text’s start edge, no outer space, never wider than the container, no minimum or maximum width, and they do not scroll — in a callout’s body and in a tab’s panel 320 wide', async ({ page }) => {
    const procedure = list3('', (n) => `Step ${n}: words enough to wrap on a narrow container, and anextraordinarilylongwordwithoutanybreakopportunityinit.`);
    await mount(page, `<p id="before" style="margin:0">Before.</p>${procedure}<p id="after" style="margin:0">After.</p>
      <tanrei-callout style="display:block;inline-size:320px">${procedure}</tanrei-callout>
      <tanrei-tab-view label="Platform" style="display:block;inline-size:320px"><tanrei-tab-panel value="a" label="A"><div id="panel" style="padding:16px">${procedure}</div></tanrei-tab-panel><tanrei-tab-panel value="b" label="B">B</tanrei-tab-panel></tanrei-tab-view>`);
    const free = page.locator('.stage > .tanrei-steps');
    expect(await css(free, 'display')).toBe('block');
    for (const side of ['top', 'right', 'bottom', 'left']) expect(await px(free, `margin-${side}`), side).toBe(0);
    for (const side of ['top', 'right', 'bottom', 'left']) expect(await px(free, `padding-${side}`), side).toBe(0);
    near((await box(free)).y, (await box(page.locator('#before'))).bottom, 'no space before', 0.05);
    near((await box(page.locator('#after'))).y, (await box(free)).bottom, 'no space after', 0.05);
    near((await box(free)).x, (await box(page.locator('#before'))).x, 'at the start edge of the text around it', 0.05);
    expect([await css(free, 'min-width'), await css(free, 'max-width'), await css(free, 'overflow-x')]).toEqual(['0px', 'none', 'visible']);
    for (const [name, container] of [['callout', page.locator('tanrei-callout')], ['tab panel', page.locator('#panel')]] as const) {
      const list = container.locator('.tanrei-steps').first();
      await expect(list).toBeVisible();
      const outer = await box(container);
      const own = await box(list);
      expect(own.x, name).toBeGreaterThanOrEqual(outer.x);
      expect(own.right, name).toBeLessThanOrEqual(outer.right + 0.05);
      expect(await list.evaluate((el) => el.scrollWidth <= el.clientWidth), `${name}: nothing overflows`).toBe(true);
      for (const item of await items(list).all()) expect((await content(item)).right, name).toBeLessThanOrEqual(own.right + 0.5);
      // The markers begin at the container's text edge: the list fills the room its container's content has.
      const room = await list.evaluate((el) => { const parent = el.parentElement!; const s = getComputedStyle(parent); const r = parent.getBoundingClientRect(); return [r.left + Number.parseFloat(s.paddingLeft) + Number.parseFloat(s.borderLeftWidth), r.right - Number.parseFloat(s.paddingRight) - Number.parseFloat(s.borderRightWidth)]; });
      if (name === 'tab panel') {
        near(own.x, room[0], `${name}: the start edge`, 0.05);
        near(own.right, room[1], `${name}: the end edge`, 0.05);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

test.describe('no input, and what is read', () => {
  test('STP-11 the steps take no input and no focus and change nothing under a pointer or a press; what is in a body keeps its own input, and the text stays selectable', async ({ page }) => {
    await mount(page, `<button id="before">before</button><ol class="tanrei-steps" role="list"><li><p class="tanrei-steps-title">Install</p><p>Read <a href="#x" id="inside">the guide</a>.</p></li><li>Then build.</li></ol><button id="after">after</button>`);
    const list = page.locator('.tanrei-steps');
    // Tab passes through to what the product put in a body, and stops nowhere on the steps.
    await page.locator('#before').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('inside');
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after');
    expect(await list.evaluate((ol) => [ol, ...ol.querySelectorAll('li, .tanrei-steps-title')].every((el) => (el as HTMLElement).tabIndex === -1 && !el.hasAttribute('tabindex')))).toBe(true);
    // Nothing changes under a pointer or a press.
    const first = items(list).first();
    const look = () => first.evaluate((el) => ['::before', '::after', null].map((pseudo) => { const s = getComputedStyle(el, pseudo); return [s.borderTopColor, s.borderLeftColor, s.backgroundColor, s.color, s.opacity, s.cursor, s.outlineStyle].join('|'); }));
    const rest = await look();
    await first.hover({ position: { x: 10, y: 10 } });
    expect(await look()).toEqual(rest);
    await page.mouse.down();
    expect(await look()).toEqual(rest);
    await page.mouse.up();
    expect(await page.evaluate(() => document.activeElement?.localName)).not.toBe('li');
    // Selectable text.
    for (const target of [first, first.locator('.tanrei-steps-title'), first.locator('p').nth(1)]) expect(await css(target, 'user-select')).not.toBe('none');
    // No state, and nothing the script listens for: it names no event (src/steps.ts adds reports only).
    expect(read('src/steps.ts')).not.toMatch(/addEventListener|dispatchEvent|aria-current|data-state/);
    expect(await list.evaluate((ol) => [...ol.querySelectorAll('*')].some((el) => el.hasAttribute('aria-current') || el.hasAttribute('aria-selected') || el.hasAttribute('aria-disabled')))).toBe(false);
  });

  test('STP-12 the steps are an ordered list of as many items as steps, named by label; each item holds its number once — the number drawn, also where start is not 1 — then its title and its body; the ring and the connector are not exposed, and no step is current', async ({ page, browserName }) => {
    await mountSpec(page, ['start', 'short', 'titles-as-headings']);
    const list = page.getByRole('list', { name: 'The workflow, continued' });
    await expect(list).toHaveCount(1);
    expect(await list.evaluate((el) => [el.localName, el.getAttribute('role'), (el as HTMLOListElement).start])).toEqual(['ol', 'list', 4]);
    await expect(list.getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('list', { name: 'What to do next' }).getByRole('listitem')).toHaveCount(3);
    // The item's content in order: the number (the marker, the item's first box), the title, the body.
    const first = list.getByRole('listitem').first();
    expect(await first.evaluate((el) => [...el.children].map((child) => child.textContent))).toEqual(['Implement', 'Build the change on each platform the spec lists, with its tests.']);
    expect(await css(first, 'content', '::before')).toContain('counter(list-item');
    // The number is generated content with no alternative text of nothing, so it is read; the connector's is empty.
    expect(await css(first, 'content', '::before')).not.toContain('/');
    expect(await css(first, 'content', '::after')).toMatch(/^(""|'')$/);
    // No list marker of the browser's beside it: the number is exposed once.
    expect([await css(first, 'display'), await css(first, 'list-style-type')]).toEqual(['list-item', 'none']);
    await expectNumbers(steps(page, 'start'), [4, 5, 6]);
    // No role is added to a title or a body, and nothing says current, done or failed.
    expect(await list.evaluate((el) => [...el.querySelectorAll('*')].filter((child) => child.hasAttribute('role') || [...child.attributes].some((a) => a.name.startsWith('aria-'))).length)).toBe(0);
    await expect(page.getByRole('list', { name: 'Handing a notebook over' }).getByRole('heading', { level: 4 })).toHaveCount(3);
    // What the accessibility tree holds, where it can be read (Chromium, over the DevTools protocol): three items, each
    // read as its number once, then its title and its body.
    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Accessibility.enable');
      const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: { nodeId: string; parentId?: string; ignored: boolean; role?: { value: string }; name?: { value: string }; childIds?: string[] }[] };
      const byId = new Map(nodes.map((node) => [node.nodeId, node]));
      const root = nodes.find((node) => node.role?.value === 'list' && node.name?.value === 'The workflow, continued')!;
      expect(root).toBeDefined();
      const texts = (id: string): string[] => {
        const node = byId.get(id)!;
        const own = !node.ignored && node.role?.value === 'StaticText' ? [node.name?.value ?? ''] : [];
        return [...own, ...(node.childIds ?? []).flatMap(texts)];
      };
      const read = (root.childIds ?? []).map((id) => byId.get(id)!).filter((node) => node.role?.value === 'listitem').map((node) => texts(node.nodeId).map((t) => t.trim()).filter(Boolean));
      expect(read).toEqual([
        ['4', 'Implement', 'Build the change on each platform the spec lists, with its tests.'],
        ['5', 'Check', 'Run every check in order. All of them pass before anything is merged.'],
        ['6', 'Record', 'Add a note of the change for the people who will read the release.'],
      ]);
      await cdp.detach();
    }
  });

  test('STP-13 a change of label, of a title or of a body is drawn and exposed at once, without a motion, and announces nothing', async ({ page }) => {
    await mountSpec(page, ['titles']);
    const list = steps(page, 'titles');
    const first = items(list).first();
    const before = await box(first.locator('.tanrei-steps-title'));
    await list.evaluate((ol) => {
      ol.setAttribute('aria-label', 'Another name');
      ol.querySelector('.tanrei-steps-title')!.textContent = 'Propose, and say why the change is needed at all, in a title long enough to wrap';
      ol.querySelector('li > p:nth-child(2)')!.textContent = 'A body of one line.';
    });
    await expect(page.getByRole('list', { name: 'Another name' })).toHaveCount(1);
    await expect(first).toContainText('say why the change');
    await expect(first.locator('p').nth(1)).toHaveText('A body of one line.');
    expect((await box(first.locator('.tanrei-steps-title'))).height).toBeGreaterThan(before.height);
    for (const target of [list, first, first.locator(':scope > :first-child'), first.locator(':scope > :nth-child(2)')]) {
      expect(await css(target, 'transition-duration')).toBe('0s');
      expect(await css(target, 'animation-name')).toBe('none');
    }
    for (const pseudo of ['::before', '::after']) expect([await css(first, 'transition-duration', pseudo), await css(first, 'animation-name', pseudo)]).toEqual(['0s', 'none']);
    // Nothing announces: no live region on or in the steps.
    expect(await list.evaluate((ol) => !!ol.closest('[aria-live], [role=status], [role=alert]') || !!ol.querySelector('[aria-live], [role=status], [role=alert]'))).toBe(false);
  });
});

test.describe('scaling, forced colors, direction', () => {
  test('STP-14 with the text enlarged the numbers, titles and bodies grow and each marker with its number; the gaps stay; everything wraps, nothing has a fixed height, raised text spacing loses nothing, and 320 wide at 200 % needs no sideways scrolling except inside a code block', async ({ page }) => {
    const measure = async (enlarged: boolean) => {
      await mountSpec(page, ['titles', 'three-digits']);
      if (enlarged) await page.addStyleTag({ content: 'html { font-size: 200%; }' });
      await page.evaluate(() => document.fonts.ready);
      const item = items(steps(page, 'titles')).first();
      return {
        body: await px(item.locator('p').nth(1), 'font-size'),
        title: await px(item.locator('.tanrei-steps-title'), 'font-size'),
        number: await px(item, 'font-size', '::before'),
        marker: await px(item, 'height', '::before'),
        width: await px(item, 'width', '::before'),
        pill: await px(items(steps(page, 'three-digits')).nth(1), 'width', '::before'),
        minimum: await resolveToken(page, T('marker-height-medium')),
      };
    };
    const [rest, large] = [await measure(false), await measure(true)];
    for (const key of ['body', 'title', 'number'] as const) expect(large[key], key).toBe(rest[key] * 2);
    expect(large.marker).toBeGreaterThan(rest.marker);
    expect(large.marker).toBeGreaterThanOrEqual(large.minimum);
    expect(large.width).toBeGreaterThanOrEqual(large.marker);
    expect(large.pill).toBeGreaterThan(rest.pill);
    // The marker's height of the size stays a minimum where only the number's text is small.
    await mountSpec(page, ['short']);
    await page.addStyleTag({ content: ':root { --tanrei-comp-steps-marker-label-typescale-medium-font-size: 4px; }' });
    expect(await px(items(steps(page, 'short')).first(), 'height', '::before')).toBe(await resolveToken(page, T('marker-height-medium')));

    // 320 wide, text at 200 %: the fixtures titles and with-code.
    await page.setViewportSize({ width: 320, height: 800 });
    await mountSpec(page, ['titles', 'with-code']);
    await page.addStyleTag({ content: 'html { font-size: 200%; } .stage { box-sizing: border-box; inline-size: 320px; padding: 16px 8px; } .stage > .tanrei-steps, .stage > .tanrei-prose:has(.tanrei-steps) { inline-size: auto; }' });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const gaps = { marker: await resolveToken(page, T('marker-gap')), step: await resolveToken(page, T('step-gap')), title: await resolveToken(page, T('title-gap')), body: await resolveToken(page, T('body-gap')), connector: await resolveToken(page, T('connector-gap')) };
    for (const id of ['titles', 'with-code']) {
      const list = steps(page, id);
      const outer = await box(list);
      expect(outer.right, id).toBeLessThanOrEqual(320);
      const all = await items(list).all();
      for (const [i, item] of all.entries()) {
        const here = await box(item);
        expect(await css(item, 'overflow-x')).toBe('visible');
        // Every word is inside the step, and the step inside the set.
        for (const block of await item.locator(':scope > :not(tanrei-code-block)').all()) {
          expect(await block.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: no word is cut`).toBe(true);
          expect((await box(block)).right).toBeLessThanOrEqual(outer.right + 0.5);
        }
        // The marker holds its number: it is as high as the number's line at least, and its column as wide as it.
        const marker = await px(item, 'height', '::before');
        expect(marker).toBeGreaterThanOrEqual(await px(item, 'line-height', '::before'));
        expect(await column(list)).toBeGreaterThanOrEqual((await px(item, 'width', '::before')) - 0.05);
        near((await content(item)).left, outer.x + (await column(list)) + gaps.marker, `${id}: the marker gap stays`, 0.5);
        if (i === all.length - 1) continue;
        // Each connector still joins two markers; the step gap stays.
        const next = await box(all[i + 1]);
        near(next.y - here.bottom, gaps.step, `${id}: the step gap stays`, 0.05);
        near(await px(item, 'top', '::after'), marker + gaps.connector, `${id}: the connector gap stays`, 0.05);
        near(here.y + (await px(item, 'top', '::after')) + (await px(item, 'height', '::after')), next.y - gaps.connector, `${id}: the connector reaches the next marker`, 0.05);
      }
    }
    const title = items(steps(page, 'titles')).first().locator('.tanrei-steps-title');
    near((await box(items(steps(page, 'titles')).first().locator('p').nth(1))).y - (await box(title)).bottom, gaps.title, 'the title gap stays', 0.05);
    const blocks = await Promise.all((await items(steps(page, 'with-code')).nth(1).locator(':scope > *').all()).map(box));
    near(blocks[1].y - blocks[0].bottom, gaps.body, 'the body gap stays', 0.05);
    // Only a code block scrolls sideways.
    const code = steps(page, 'with-code').locator('tanrei-code-block').first();
    expect((await box(code)).right).toBeLessThanOrEqual(320);
    // The reader's own text spacing (line height 1.5, paragraph spacing 2, letter spacing 0.12, word spacing 0.16): no content is lost.
    await page.addStyleTag({ content: '.tanrei-steps, .tanrei-steps * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } .tanrei-steps p { margin-block-end: 2em !important; }' });
    for (const item of await items(steps(page, 'titles')).all()) {
      const here = await box(item);
      for (const block of await item.locator(':scope > *').all()) {
        expect(await block.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        expect((await box(block)).bottom).toBeLessThanOrEqual(here.bottom + 0.5);
      }
      expect(await css(item, 'height')).not.toBe('auto');
      expect(await item.evaluate((el) => (el as HTMLElement).style.height)).toBe('');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });

  test('STP-15 while the platform forces its colors every ring and connector is its text color at their own widths, and the number, the title and the body are that text color', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page);
    const canvasText = await page.evaluate(() => { const probe = document.createElement('i'); probe.style.cssText = 'color: CanvasText; forced-color-adjust: none'; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; });
    // The media query alone is not the mode: WebKit answers it under emulation and repaints nothing (see link.test.ts).
    const forced = await page.evaluate(() => { const probe = document.createElement('div'); probe.style.color = 'rgb(1, 2, 3)'; document.body.appendChild(probe); const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)'; probe.remove(); return repainted; });
    if (!forced) test.info().annotations.push({ type: 'forced-colors', description: 'the mode is not emulated by this browser: the stylesheet’s rule is read, the repaint of the text is not' });
    for (const f of spec.fixtures) {
      const all = await items(steps(page, f.id)).all();
      for (const [i, item] of all.entries()) {
        expect(await css(item, 'border-top-color', '::before'), f.id).toBe(canvasText);
        expect(await px(item, 'border-top-width', '::before')).toBe(await resolveToken(page, T('marker-outline-width')));
        // The text is the platform's by the mode itself: the steps name no color for it.
        if (forced) expect([await css(item, 'color', '::before'), await css(item, 'color')], f.id).toEqual([canvasText, canvasText]);
        // Nothing relies on a fill.
        expect(await css(item, 'background-image', '::before')).toBe('none');
        if (i === all.length - 1) continue;
        const side = (await css(item, 'direction')) === 'rtl' ? 'right' : 'left';
        expect(await css(item, `border-${side}-color`, '::after'), f.id).toBe(canvasText);
        expect(await px(item, `border-${side}-width`, '::after')).toBe(await resolveToken(page, T('connector-thickness')));
      }
    }
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('STP-16 right to left the marker column and the connectors are at the right and each step’s content at its left, from one edge to the steps’ left edge; a block that is not text still takes the body’s whole width', async ({ page }) => {
    await mountSpec(page, ['rtl', 'rtl-two-digits', 'with-code-rtl']);
    const gap = await resolveToken(page, T('marker-gap'));
    for (const id of ['rtl', 'rtl-two-digits', 'with-code-rtl']) {
      const list = steps(page, id);
      expect(await css(list, 'direction')).toBe('rtl');
      const outer = await box(list);
      const edge = outer.right - (await column(list)) - gap;
      for (const item of await items(list).all()) {
        near((await content(item)).right, edge, `${id}: the content begins at one edge, at the left of the markers`, 0.5);
        for (const block of await item.locator(':scope > *').all()) {
          near((await box(block)).right, edge, `${id}: a block begins at the content edge`, 0.05);
          expect((await box(block)).x).toBeGreaterThanOrEqual(outer.x - 0.05);
        }
        // The connector: in the column at the right.
        if ((await css(item, 'content', '::after')) !== 'none') near((await px(item, 'right', '::after')) + (await px(item, 'border-right-width', '::after')) / 2, (await column(list)) / 2, `${id}: the connector`, 0.05);
        // The marker: centred in the column at the right.
        near(((await markerBox(item)).x + (await markerBox(item)).right) / 2, outer.right - (await column(list)) / 2, `${id}: the marker`, 0.05);
      }
    }
    const list = steps(page, 'with-code-rtl');
    for (const block of await list.locator('tanrei-code-block').all()) {
      near((await box(block)).x, (await box(list)).x, 'a code block runs to the left edge', 0.05);
      near((await box(block)).right, (await box(list)).right - (await column(list)) - gap, 'from the content edge', 0.05);
    }
  });

  test('STP-17 the direction is an ancestor’s inside the page, not a setting of the steps; a change while they are shown is drawn at once, keeping what they show', async ({ page }) => {
    await mount(page, `<section id="around" dir="rtl">${list3('aria-label="Three"')}</section>`);
    const list = page.locator('.tanrei-steps');
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('');
    expect(await list.evaluate((el) => el.hasAttribute('dir'))).toBe(false);
    expect(read('src/styles/steps.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/(?<!-)\b(left|right):|margin-(left|right)|padding-(left|right)|border-(left|right)/);
    const gap = await resolveToken(page, T('marker-gap'));
    const first = items(list).first();
    near((await content(first)).right, (await box(list)).right - (await column(list)) - gap, 'right to left', 0.5);
    await page.locator('#around').evaluate((el) => (el.dir = 'ltr'));
    near((await content(first)).left, (await box(list)).x + (await column(list)) + gap, 'left to right at once', 0.5);
    await expect(items(list)).toHaveCount(3);
    await expectNumbers(list, [1, 2, 3]);
    expect(await css(first, 'transition-duration')).toBe('0s');
    await page.locator('#around').evaluate((el) => (el.dir = 'rtl'));
    near((await content(first)).right, (await box(list)).right - (await column(list)) - gap, 'and back', 0.5);
    // The document's own direction, where no ancestor sets one.
    await mount(page, list3(), { dir: 'rtl' });
    expect(await css(page.locator('.tanrei-steps'), 'direction')).toBe('rtl');
  });

  test('STP-18 a number is a left-to-right run whose digits are never reversed; a title given as text is text of its own direction, placed and aligned by the layout’s; the body’s blocks are laid out as prose lays out a block', async ({ page }) => {
    await mountSpec(page, ['rtl-two-digits', 'ltr-title-rtl', 'rtl']);
    const numbered = steps(page, 'rtl-two-digits');
    for (const item of await items(numbered).all()) {
      // Text of its own direction, which for a number — no strong character — is left to right in every layout.
      expect(await css(item, 'unicode-bidi', '::before')).toBe('plaintext');
    }
    await expectNumbers(numbered, [9, 10, 11]);
    expect(await drawsNumbers(numbered, [9, '01', 11])).toBe(false);
    // A sign stays before its digits.
    await mount(page, list3('start="-12" id="signed"'), { direction: 'rtl' });
    await expectNumbers(page.locator('#signed'), ['-12', '-11', '-10']);
    expect(await drawsNumbers(page.locator('#signed'), ['12-', '11-', '10-'])).toBe(false);
    await mountSpec(page, ['rtl-two-digits', 'ltr-title-rtl', 'rtl']);
    // Left-to-right titles in a right-to-left procedure: they begin at the right edge of the content and read in their own order.
    const list = steps(page, 'ltr-title-rtl');
    const edge = (await box(list)).right - (await column(list)) - (await resolveToken(page, T('marker-gap')));
    for (const [i, text] of ['npm install', 'tokens.css', 'v2.1 beta'].entries()) {
      const title = items(list).nth(i).locator('.tanrei-steps-title');
      await expect(title).toHaveText(text);
      expect(await css(title, 'unicode-bidi')).toBe('plaintext');
      expect(await css(title, 'text-align')).toBe('right');
      expect(await css(title, 'direction')).toBe('rtl');
      const line = await firstLine(title);
      near(line.right, edge, `"${text}" ends at the content's right edge`, 0.5);
      // Its own order: the first character stands at the left of the last.
      const [firstChar, lastChar] = await title.evaluate((el) => { const node = el.firstChild!; const at = (n: number) => { const r = document.createRange(); r.setStart(node, n); r.setEnd(node, n + 1); return r.getBoundingClientRect().left; }; return [at(0), at(node.textContent!.length - 1)]; });
      expect(firstChar).toBeLessThan(lastChar);
      // The Arabic body under it is aligned at the same edge.
      near((await firstLine(items(list).nth(i).locator('p').nth(1))).right, edge, 'the body under it', 0.5);
    }
    // An Arabic title in a left-to-right layout is placed by the layout: at the left.
    await mount(page, '<ol class="tanrei-steps" role="list"><li><p class="tanrei-steps-title">ثبّت الحزمة</p><p>Add the package.</p></li></ol>');
    const title = page.locator('.tanrei-steps-title');
    expect(await css(title, 'text-align')).toBe('left');
    near((await firstLine(title)).x, (await box(title)).x, 'at the left', 0.5);
    // The body's blocks in a prose: each by its own first strong character, aligned to the layout's start edge (PRS-25).
    await mount(page, '<div class="tanrei-prose" dir="rtl"><ol class="tanrei-steps" role="list"><li><p id="latin">npm run build</p><p id="arabic">اكتب العناصر.</p></li></ol></div>');
    for (const id of ['latin', 'arabic']) expect([await css(page.locator(`#${id}`), 'unicode-bidi'), await css(page.locator(`#${id}`), 'text-align')]).toEqual(['plaintext', 'right']);
  });
});

test.describe('what is not valid', () => {
  test('STP-19 a size the system does not have is drawn with the default size’s tokens and reported; a start that is not a whole number numbers from 1 and is reported; zero and below are drawn as they are', async ({ page }) => {
    const seen = reports(page);
    await mount(page, `${list3('id="unknown" data-size="huge"')}${list3('id="medium"')}${list3('id="fraction" start="2.5"')}${list3('id="word" start="three"')}${list3('id="zero" start="0"')}${list3('id="below" start="-2"')}${list3('id="large" data-size="large"')}`);
    const [unknown, medium] = [page.locator('#unknown'), page.locator('#medium')];
    for (const property of ['font-size', 'line-height', 'grid-template-columns']) expect(await css(unknown, property), property).toBe(await css(medium, property));
    expect(await px(items(unknown).first(), 'height', '::before')).toBe(await resolveToken(page, T('marker-height-medium')));
    expect(await px(items(page.locator('#large')).first(), 'height', '::before')).toBe(await resolveToken(page, T('marker-height-large')));
    await expect.poll(() => drawsNumbers(page.locator('#fraction'), [1, 2, 3])).toBe(true);
    await expectNumbers(page.locator('#word'), [1, 2, 3]);
    await expectNumbers(page.locator('#zero'), [0, 1, 2]);
    await expectNumbers(page.locator('#below'), [-2, -1, 0]);
    await expect.poll(() => seen.filter((line) => line.includes('STP-19')).length).toBe(3);
    expect(seen.filter((line) => line.includes('STP-19')).map((line) => /data-size "huge"|start "2\.5"|start "three"/.exec(line)?.[0]).sort()).toEqual(['data-size "huge"', 'start "2.5"', 'start "three"']);
    // A size a design system added is known by its tokens and is not reported.
    const again = reports(page);
    await mount(page, `<style>:root { --tanrei-comp-steps-marker-height-small: 20px; }</style>${list3('data-size="small"')}`);
    await page.waitForTimeout(100);
    expect(again.filter((line) => line.includes('data-size "small"'))).toEqual([]);
  });

  test('STP-20 a set with no step draws nothing, takes no room, exposes nothing and is reported; a step with neither a title nor a body still draws its marker and is counted, and is reported', async ({ page }) => {
    const seen = reports(page);
    await mount(page, `<p id="before" style="margin:0">Before.</p><ol class="tanrei-steps" role="list" id="empty" aria-label="Nothing"></ol><p id="after" style="margin:0">After.</p><ol class="tanrei-steps" role="list" id="gap" aria-label="A gap"><li>One.</li><li></li><li>Three.</li></ol>`);
    const empty = page.locator('#empty');
    expect(await css(empty, 'display')).toBe('none');
    near((await box(page.locator('#after'))).y, (await box(page.locator('#before'))).bottom, 'no room', 0.05);
    await expect(page.getByRole('list', { name: 'Nothing' })).toHaveCount(0);
    // The empty step: its marker, its number, its place in the list.
    const list = page.locator('#gap');
    await expect(page.getByRole('list', { name: 'A gap' }).getByRole('listitem')).toHaveCount(3);
    const hollow = items(list).nth(1);
    near((await box(hollow)).height, await resolveToken(page, T('marker-height-medium')), 'as high as its marker', 0.05);
    expect(await css(hollow, 'content', '::before')).toContain('counter(list-item');
    expect(await css(hollow, 'content', '::after')).not.toBe('none');
    await expectNumbers(list, [1, 2, 3]);
    await expect.poll(() => seen.filter((line) => line.includes('STP-20')).length).toBe(2);
    expect(seen.some((line) => line.includes('holds no step'))).toBe(true);
    expect(seen.some((line) => line.includes('neither a title nor a body'))).toBe(true);
    // A step added to the empty set draws it.
    await empty.evaluate((ol) => ol.append(Object.assign(document.createElement('li'), { textContent: 'Now a step.' })));
    expect(await css(empty, 'display')).toBe('block');
    await expect(page.getByRole('list', { name: 'Nothing' }).getByRole('listitem')).toHaveCount(1);
  });
});

test.describe('without the script', () => {
  test('the stylesheet alone draws every fixture: with scripting off the layout is the same box for box, and the list is the document’s own ordered list (STP-4, STP-12)', async ({ page, browser }) => {
    const document = (await fixturesDocument(spec)).replace(/<script type="module">[\s\S]*<\/script>/, '');
    await mountSpec(page);
    // The code blocks are elements, which draw differently before they are defined: the fixtures without one are compared.
    const context = await browser.newContext({ javaScriptEnabled: false, deviceScaleFactor: 2 });
    const off = await context.newPage();
    await off.setContent(document);
    await off.waitForFunction(() => document.fonts.status === 'loaded').catch(() => {});
    // …and the fixture whose numbers are too long for a circle: its column is measured by the script (STP-1).
    const without = spec.fixtures.filter((f) => !['with-code', 'with-code-medium', 'with-table-and-tabs', 'with-code-rtl', 'three-digits'].includes(f.id));
    const own = async (p: P) => {
      const rows: string[] = [];
      for (const f of without) rows.push(...(await p.locator(`[data-fixture="${f.id}"]`).evaluate((stage) => { const origin = stage.getBoundingClientRect(); return [...stage.querySelectorAll('.tanrei-steps, .tanrei-steps > li, .tanrei-steps > li > *')].map((el) => { const r = el.getBoundingClientRect(); const before = getComputedStyle(el, '::before'); return [el.localName, Math.round((r.left - origin.left) * 8), Math.round((r.top - origin.top) * 8), Math.round(r.width * 8), Math.round(r.height * 8), before.width, before.height].join(' '); }); })));
      return rows;
    };
    const [on, bare] = [await own(page), await own(off)];
    expect(bare.length).toBeGreaterThan(140);
    expect(bare).toEqual(on);
    await expect(off.getByRole('list', { name: 'The workflow, continued' }).first().getByRole('listitem')).toHaveCount(3);
    expect(await off.locator('[data-fixture="start"] ol').evaluate((ol: HTMLOListElement) => [ol.localName, ol.start, ol.children.length])).toEqual(['ol', 4, 3]);
    await context.close();
  });
});

test.describe('fixtures', () => {
  test('all 25 fixtures are mounted and visible, each an ordered list with the class — alone on its stage, or in a prose 720 wide for the eight of the specimen — and the review gallery draws the same document', async ({ page }) => {
    expect(spec.fixtures).toHaveLength(25);
    expect(spec.fixtures.filter((f) => f.content)).toHaveLength(8);
    await mountSpec(page);
    await expect(page.locator('.stage ol.tanrei-steps[role="list"]')).toHaveCount(25);
    for (const f of spec.fixtures) {
      const list = steps(page, f.id);
      await expect(list, f.id).toHaveCount(1);
      await expect(list, f.id).toBeVisible();
      expect((await box(list)).height, f.id).toBeGreaterThan(20);
      await expect(list, f.id).toHaveAttribute('aria-label', String(f.props.label));
      if (f.props.size === 'large') await expect(list).toHaveAttribute('data-size', 'large');
      if (f.props.start) await expect(list).toHaveAttribute('start', String(f.props.start));
      expect((await box(f.content ? stage(page, f.id).locator('.tanrei-prose') : list)).width, f.id).toBe(f.content ? 720 : 400);
      await expect(items(list), f.id).toHaveCount(f.items ? f.items.length : { 'with-code': 3, 'with-table-and-tabs': 4, 'nested-list': 4, 'in-prose': 3, 'titles-as-headings': 3, 'with-code-rtl': 3 }[f.content!]!);
      if (f.direction === 'rtl') expect(await css(list, 'direction')).toBe('rtl');
    }
    const gallery = await fixturesDocument(spec, { icons: true, assets: { font: '/f.css', tokens: '/t.css', system: (id) => `/${id}.css`, icons: () => '/i.css', bundle: '/b.js' } });
    for (const f of spec.fixtures) expect(gallery, f.id).toContain(`data-fixture="${f.id}"`);
    expect(gallery.slice(gallery.indexOf('<body>')).match(/<ol class="tanrei-steps" role="list"/g)).toHaveLength(25);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`accessibility: every fixture passes axe in ${theme}`, async ({ page }) => {
      await mountSpec(page, [], { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [f] });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
