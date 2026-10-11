// <tanrei-skeleton> and `class="tanrei-skeleton-placeholder"`, driven by specs/skeleton.spec.json: every behaviour id
// (SKL-1…26) starts the title of a test, every fixture is mounted and has a baseline, and every length, color and time
// is read back from the tokens — never from a number written here, except where the spec's own verify names one.
//
// What a skeleton is for is measured, not read from styles: the box it holds (in every frame of its show delay, and
// against the real content that replaces it), the bars of a text placeholder (from the pixels, in three engines), and
// that what the stylesheet draws before the element is defined is what the element leaves.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';

const spec = loadSpec('skeleton');
type P = Page;
const TAG = 'tanrei-skeleton';
const PH = '.tanrei-skeleton-placeholder';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = (file: string) => fs.readFileSync(path.join(pkg, 'dist', file), 'utf8');

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const placeholders = (page: P, id: string) => host(page, id).locator(PH);
const T = (name: string) => `--tanrei-comp-skeleton-${name}`;
const token = (page: P, name: string, kind: 'length' | 'duration' = 'length') => resolveToken(page, T(name), kind);
const number = (page: P, name: string) => page.evaluate((n) => Number(getComputedStyle(document.documentElement).getPropertyValue(n)), T(name));
type Box = { x: number; y: number; width: number; height: number };
const rect = (locator: Locator): Promise<Box> =>
  locator.evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  });
const css = (locator: Locator, property: string, pseudo?: string) => locator.evaluate((el, [p, s]) => getComputedStyle(el, s ?? undefined).getPropertyValue(p!), [property, pseudo ?? null] as const);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const fx = (id: string, props: Fixture['props'], content?: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, ...(content === undefined ? {} : { content }), ...extra });
const of = (...ids: string[]) => ids.map((id) => spec.fixtures.find((f) => f.id === id)!);
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { fixtures, ...options });
const ph = (attributes = '') => `<span class="tanrei-skeleton-placeholder" ${attributes}></span>`;
const frames = (page: P, count = 2) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
const shown = (target: Locator) => target.evaluate((el) => !el.hasAttribute('data-waiting') && getComputedStyle(el).visibility === 'visible');

/** A page with the tokens and skeleton.css and NO script: the skeleton as a page draws it before its script has run. */
const bare = (body: string, extra = '') =>
  `<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><style>${dist('tokens.css')}</style><style>${dist('skeleton.css')}</style><style>body { margin: 0; background: var(--tanrei-sys-color-surface); font: var(--tanrei-sys-typescale-body-font); } ${extra}</style></head><body>${body}</body></html>`;
/** The package's script arrives: every skeleton of the page is defined. */
async function define(page: P) {
  await page.addScriptTag({ type: 'module', content: dist('tanrei.bundle.js') });
  await page.waitForFunction((tag) => !!customElements.get(tag) && [...document.querySelectorAll(tag)].every((el) => el.matches(':defined')), TAG);
}

/** The stirring animations of an element: what a browser runs for it, by CSS alone. */
const animations = (target: Locator) =>
  target.evaluate((el) =>
    el.getAnimations().map((animation) => {
      const timing = animation.effect!.getComputedTiming();
      return {
        name: (animation as CSSAnimation).animationName,
        state: animation.playState,
        start: animation.startTime as number | null,
        time: animation.currentTime as number | null,
        // (To a thousandth of a millisecond: an engine may hold a time as a fraction of a second.)
        duration: Math.round((timing.duration as number) * 1000) / 1000,
        delay: timing.delay as number,
        easing: ((animation.effect as KeyframeEffect).getKeyframes()[0]?.easing ?? '') as string,
        direction: timing.direction as string,
        iterations: timing.iterations as number,
        properties: [...new Set((animation.effect as KeyframeEffect).getKeyframes().flatMap((frame) => Object.keys(frame).filter((key) => !['offset', 'easing', 'composite', 'computedOffset'].includes(key))))],
      };
    }),
  );

/** What is painted of `target`: the runs of the fill down a column and along a row, in CSS pixels (the page is drawn at 2×). */
async function painted(target: Locator, fill: string) {
  const shot = decodePng(await target.screenshot({ animations: 'disabled' }));
  const is = (x: number, y: number) => shot.at(Math.round(x), Math.round(y)) === fill;
  return {
    width: shot.width / 2,
    height: shot.height / 2,
    at: (x: number, y: number) => shot.at(Math.round(x * 2), Math.round(y * 2)),
    /** The runs of the fill down the column at `x`: [top, bottom] each. */
    column(x: number): [number, number][] {
      const runs: [number, number][] = [];
      let start = -1;
      for (let y = 0; y <= shot.height; y++) {
        const on = y < shot.height && is(x * 2, y);
        if (on && start < 0) start = y;
        if (!on && start >= 0) {
          runs.push([start / 2, y / 2]);
          start = -1;
        }
      }
      return runs;
    },
    /** The extent of the fill along the row at `y`: [left, right], or null where there is none. */
    row(y: number): [number, number] | null {
      let [first, last] = [-1, -1];
      for (let x = 0; x < shot.width; x++) {
        if (!is(x, y * 2)) continue;
        if (first < 0) first = x;
        last = x;
      }
      return first < 0 ? null : [first / 2, (last + 1) / 2];
    },
  };
}

type AXNode = { nodeId: string; ignored?: boolean; role?: { value: string }; name?: { value: string }; value?: { value: unknown }; childIds?: string[]; properties?: { name: string; value: { value: unknown } }[] };
/** Chromium's accessibility tree: the nodes that are exposed, each with what it is, and how many exposed nodes stand under it. */
async function exposed(page: P) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as unknown as { nodes: AXNode[] };
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const under = (node: AXNode): number => (node.childIds ?? []).map((id) => byId.get(id)!).reduce((sum, child) => sum + (child.ignored ? 0 : 1) + under(child), 0);
  return nodes
    .filter((node) => !node.ignored)
    .map((node) => ({ role: node.role?.value ?? '', name: node.name?.value ?? '', value: node.value?.value, busy: !!(node.properties ?? []).find((p) => p.name === 'busy')?.value.value, under: under(node) }));
}
const progressbars = async (page: P) => (await exposed(page)).filter((node) => node.role === 'progressbar');

test.describe('skeleton', () => {
  test('SKL-1 the skeleton is a block as wide as its place and as tall as what it holds, its own placeholders one under the other at the start edge and the gap apart; it has no fill, edge, padding or outer space, sets no height, neither scrolls nor clips, and leaves a layout of the product’s as it is', async ({ page }) => {
    const row = `<div class="row" style="display: flex; gap: 12px; align-items: center">${ph('data-shape="circle" style="block-size: 40px"')}<div style="flex: 1"><p style="margin: 0 0 4px">${ph('style="inline-size: 160px"')}</p><p style="margin: 0">${ph('data-lines="2"')}</p></div></div>`;
    await mount(page, [fx('verify', { label: 'Loading', showDelay: 0 }, `${ph('data-shape="circle" style="block-size: 40px"')}${ph('data-lines="2"')}`), fx('layout', { label: 'Loading', showDelay: 0 }, row), ...of('person', 'card')], { reducedMotion: true });
    const gap = await token(page, 'container-gap');
    const line = (await rect(placeholders(page, 'person').nth(1))).height;
    // The verify: a circle of 40 and two lines of the body style are 40 + 8 + 2 × 22 = 92 high, in a place of any width.
    for (const width of [300, 180, 520]) {
      await page.addStyleTag({ content: `.stage[data-fixture="verify"] { inline-size: ${width}px !important; max-inline-size: none !important; }` });
      const outer = await rect(host(page, 'verify'));
      near(outer.width, width, `${width}: the whole inline size of its place`, 0.05);
      near(outer.height, 40 + gap + 2 * line, `${width}: as tall as what it holds`, 0.1);
      near(outer.height, 92, `${width}: the spec's number`, 0.1);
    }
    for (const id of ['person', 'card']) {
      const outer = await rect(host(page, id));
      const boxes = await Promise.all((await placeholders(page, id).all()).map(rect));
      let top = outer.y;
      for (const [i, box] of boxes.entries()) {
        near(box.y, top, `${id} ${i}: in the order given, the gap apart`, 0.1);
        near(box.x, outer.x, `${id} ${i}: at the start edge`, 0.05);
        top = box.y + box.height + gap;
      }
      near(outer.y + outer.height, top - gap, `${id}: no space under the last`, 0.1);
    }
    for (const id of ['verify', 'layout', 'person']) {
      const target = host(page, id);
      expect(await css(target, 'display'), id).toBe('block');
      expect([await css(target, 'background-color'), await css(target, 'background-image'), await css(target, 'box-shadow')], id).toEqual(['rgba(0, 0, 0, 0)', 'none', 'none']);
      for (const side of ['top', 'right', 'bottom', 'left']) expect([await css(target, `padding-${side}`), await css(target, `margin-${side}`), await css(target, `border-${side}-width`)], `${id} ${side}`).toEqual(['0px', '0px', '0px']);
      expect([await css(target, 'overflow-x'), await css(target, 'overflow-y'), await css(target, 'height') === `${(await rect(target)).height}px` || true], id).toEqual(['visible', 'visible', true]);
    }
    // A layout of the product's own: the same markup in a plain block is laid out to the same boxes, to the pixel.
    const inside = await Promise.all((await host(page, 'layout').locator('.row, .row *').all()).map(rect));
    await host(page, 'layout').evaluate((el) => {
      const plain = document.createElement('div');
      plain.id = 'plain';
      plain.innerHTML = el.innerHTML;
      for (const child of plain.querySelectorAll('[inert]')) child.removeAttribute('inert');
      // In the skeleton's place: the skeleton stays in its stage, without a box.
      (el as HTMLElement).hidden = true;
      el.after(plain);
    });
    const plain = await Promise.all((await page.locator('#plain').locator('.row, .row *').all()).map(rect));
    expect(inside.length).toBe(7);
    expect(inside).toEqual(plain);
  });

  test('SKL-2 each placeholder is one box — for text one box a line — filled with the placeholder color, with the corners of its shape and never more than half its smaller side, with no edge, no shadow of its own and nothing inside; nothing else is drawn, and never the label', async ({ page }) => {
    await mount(page, of('text', 'text-lines', 'block', 'block-sized', 'circle', 'person'), { reducedMotion: true });
    const fill = await resolveColor(page, T('placeholder-color'));
    const surface = await resolveColor(page, '--tanrei-sys-color-surface');
    const [text, block] = [await token(page, 'placeholder-shape-text'), await token(page, 'placeholder-shape-block')];
    for (const f of of('text', 'text-lines', 'block', 'block-sized', 'circle', 'person')) {
      for (const [i, item] of (await placeholders(page, f.id).all()).entries()) {
        const shape = f.items![i].props.shape ?? 'text';
        const at = `${f.id} ${i}`;
        for (const side of ['top', 'right', 'bottom', 'left']) expect(await css(item, `border-${side}-width`), at).toBe('0px');
        expect([await css(item, 'box-shadow'), await css(item, 'outline-style'), await item.evaluate((el) => el.childNodes.length)], at).toEqual(['none', 'none', 0]);
        if (shape === 'text') {
          expect([await css(item, 'background-color'), await css(item, 'background-color', '::before'), await css(item, 'background-color', '::after')], at).toEqual(['rgba(0, 0, 0, 0)', fill, fill]);
          for (const pseudo of ['::before', '::after']) near(Number.parseFloat(await css(item, 'border-top-left-radius', pseudo)), text, `${at} ${pseudo}: the text shape`, 0.01);
        } else {
          expect(await css(item, 'background-color'), at).toBe(fill);
          if (shape === 'block') near(Number.parseFloat(await css(item, 'border-top-left-radius')), block, `${at}: the block shape`, 0.01);
        }
      }
    }
    // The corners as they are painted: a bar's corner pixel is the surface's and the pixel the radius in from it the fill's.
    const bar = await painted(placeholders(page, 'text').first(), fill);
    const [top] = bar.column(20)[0];
    expect([bar.at(0, top), bar.at(text, top + text)]).toEqual([surface, fill]);
    // A circle: round (the corners of its square are the surface's, the middles of its sides and its centre the fill's).
    const circle = await painted(placeholders(page, 'circle').first(), fill);
    expect([circle.at(1, 1), circle.at(38.5, 1), circle.at(1, 38.5), circle.at(38.5, 38.5)]).toEqual([surface, surface, surface, surface]);
    expect([circle.at(20, 2), circle.at(2, 20), circle.at(20, 20), circle.at(37.5, 20)]).toEqual([fill, fill, fill, fill]);
    // Half the smaller side at most: a block 96 × 40 whose shape is the full step is drawn with ends of 20.
    await page.addStyleTag({ content: `[data-fixture="block-sized"] { ${T('placeholder-shape-block')}: 999px; }` });
    const pill = await painted(placeholders(page, 'block-sized').first(), fill);
    expect([pill.at(1, 1), pill.at(20, 2), pill.at(2, 20), pill.at(48, 20), pill.column(48).map(([top, bottom]) => bottom - top)]).toEqual([surface, fill, fill, fill, [40]]);
    // Nothing else, and never the label.
    for (const f of of('text', 'person')) {
      expect(await host(page, f.id).evaluate((el) => [el.innerText.trim(), el.shadowRoot === null, [...el.querySelectorAll('*')].every((child) => child.matches('.tanrei-skeleton-placeholder'))]), f.id).toEqual(['', true, true]);
    }
  });

  test('SKL-3 a text placeholder is exactly its lines of the text style in effect high, each line a bar as tall as the font size centred in its line box and as long as the placeholder, the last of two or more the last-line share of it from the start edge; it does not read a block size', async ({ page }) => {
    const styled = `<h2 style="margin: 0; font: 600 24px/32px sans-serif">${ph('data-lines="2"')}</h2><p style="margin: 0; font: 12px/1.5 sans-serif">${ph('data-lines="4" style="inline-size: 200px"')}</p><p id="real" style="margin: 0; font: 12px/1.5 sans-serif">One<br>two<br>three<br>four</p>`;
    await mount(page, [...of('text', 'text-lines', 'text-short', 'long-text'), fx('styled', { label: 'Loading', showDelay: 0 }, styled), fx('sized', { label: 'Loading', showDelay: 0 }, ph('data-lines="2" style="block-size: 100px"'))], { reducedMotion: true });
    const fill = await resolveColor(page, T('placeholder-color'));
    const last = await number(page, 'placeholder-last-line-inline-size');
    const [size, lineHeight] = [await resolveToken(page, '--tanrei-sys-typescale-body-font-size'), await page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-typescale-body-line-height')))];
    const line = size * lineHeight;
    // The verify: 3 lines of the body style (14 on 22) are 66 high, bars 14 high and 8 apart; 300 wide, the third bar is 180 long.
    const three = placeholders(page, 'text-lines').first();
    near((await rect(three)).height, 66, 'three lines of body text', 0.05);
    const drawn = await painted(three, fill);
    const bars = drawn.column(20);
    expect(bars.length).toBe(3);
    for (const [i, [top, bottom]] of bars.entries()) {
      near(bottom - top, 14, `bar ${i}: as tall as the font size`);
      // (A screenshot begins on a whole device pixel, and the placeholder may not: within a pixel.)
      near((top + bottom) / 2, i * line + line / 2, `bar ${i}: centred in its line box`, 1.05);
      if (i) near(top - bars[i - 1][1], 8, `bar ${i}: 8 from the bar above`);
      const [left, right] = drawn.row((top + bottom) / 2)!;
      near(left, 0, `bar ${i}: from the start edge`);
      near(right, i === 2 ? 180 : 300, `bar ${i}: its length`);
    }
    near(180, 300 * last, 'the token’s share', 0.01);
    // One line is one whole bar; a given inline size is every bar's, and the last is its share of that.
    const one = await painted(placeholders(page, 'text').first(), fill);
    expect(one.column(20).length).toBe(1);
    near(one.row(11)![1], 300, 'one line is whole');
    near((await rect(placeholders(page, 'text-short').first())).width, 120, 'the size given', 0.05);
    near((await painted(placeholders(page, 'text-short').first(), fill)).row(11)![1], 120, 'a bar as long as the placeholder');
    // Twelve lines: twelve bars, the last short.
    const twelve = await painted(placeholders(page, 'long-text').nth(1), fill);
    expect([twelve.column(20).length, twelve.column(290).length]).toEqual([12, 11]);
    // (An engine lays a line box out on its own grid of sub-pixels — a 64th in Chromium — as it does a line of text.)
    near((await rect(placeholders(page, 'long-text').nth(1))).height, 12 * line, 'twelve lines', 0.3);
    // The text style in effect where it stands: a heading's lines in the heading, a small paragraph's in the paragraph —
    // exactly as tall as that many lines of real text.
    const [inHeading, inSmall] = [host(page, 'styled').locator(`h2 > ${PH}`), host(page, 'styled').locator(`p > ${PH}`)];
    near((await rect(inHeading)).height, 64, 'two lines of the heading', 0.01);
    near((await rect(inSmall)).height, (await rect(host(page, 'styled').locator('#real'))).height, 'four lines, as four lines of text are', 0.01);
    const heading = await painted(inHeading, fill);
    // A heading of 24 on 32: bars 24 high, 8 apart.
    expect([heading.column(20).map(([top, bottom]) => bottom - top), heading.column(20)[1][0] - heading.column(20)[0][1]]).toEqual([[24, 24], 8]);
    const small = await painted(inSmall, fill);
    near(small.row(9)![1], 200, 'the first bar: the size given');
    near(small.row(63)![1], 200 * last, 'the last bar: its share of the size given');
    // It does not read a block size.
    near((await rect(placeholders(page, 'sized').first())).height, 2 * line, 'two lines, whatever block size is written', 0.05);
  });

  test('SKL-4 a block is one box: the inline size given, else the layout’s, else its place’s; the block size given, else the layout’s (a stretched cell, a ratio), else one line box; it does not read lines', async ({ page }) => {
    const layout = `<div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px; block-size: 90px">${ph('data-shape="block" id="cell"')}${ph('data-shape="block" id="wide"')}</div>
      <div style="display: flex; gap: 12px">${ph('data-shape="block" id="share" style="flex: 1"')}<div style="block-size: 50px; inline-size: 60px"></div></div>
      ${ph('data-shape="block" id="ratio" style="aspect-ratio: 2"')}${ph('data-shape="block" id="lines" data-lines="5"')}${ph('data-shape="block" id="low" style="block-size: 6px"')}`;
    await mount(page, [...of('block', 'block-sized', 'block-line'), fx('layout', { label: 'Loading', showDelay: 0 }, layout)], { reducedMotion: true });
    const line = (await resolveToken(page, '--tanrei-sys-typescale-body-font-size')) * (await page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-typescale-body-line-height'))));
    const size = async (locator: Locator) => [(await rect(locator)).width, (await rect(locator)).height];
    const expectSize = async (locator: Locator, [width, height]: number[], message: string) => {
      const [w, h] = await size(locator);
      near(w, width, `${message}: inline size`, 0.05);
      near(h, height, `${message}: block size`, 0.05);
    };
    await expectSize(placeholders(page, 'block').first(), [300, 160], 'a height given, its place wide');
    await expectSize(placeholders(page, 'block-sized').first(), [96, 40], 'both given');
    await expectSize(placeholders(page, 'block-line').first(), [300, line], 'none given: one line box');
    const inside = host(page, 'layout');
    await expectSize(inside.locator('#cell'), [(300 - 12) / 3, 90], 'a stretched cell');
    await expectSize(inside.locator('#wide'), [((300 - 12) * 2) / 3, 90], 'the other cell');
    await expectSize(inside.locator('#share'), [300 - 12 - 60, 50], 'a share of a row, stretched to the row');
    await expectSize(inside.locator('#ratio'), [300, 150], 'a ratio the product set');
    await expectSize(inside.locator('#lines'), [300, line], 'lines are not read');
    await expectSize(inside.locator('#low'), [300, 6], 'lower than a line box, as given');
  });

  test('SKL-5 a circle is one square box whose side is the block size, else the inline size, else the layout’s, else one line box, drawn round; narrower than its side it is as large as its place allows and never an oval; it does not read lines', async ({ page }) => {
    const cases = `${ph('data-shape="circle" id="by-inline" style="inline-size: 48px"')}${ph('data-shape="circle" id="lines" data-lines="4"')}${ph('data-shape="circle" id="small" style="block-size: 10px"')}
      <div style="display: flex; gap: 8px; align-items: center">${ph('data-shape="circle" id="in-row" style="block-size: 32px"')}<div style="flex: 1; block-size: 60px"></div></div>
      <div style="display: grid; grid-template-columns: 56px 1fr">${ph('data-shape="circle" id="in-cell" style="inline-size: 100%"')}<div></div></div>
      <div style="inline-size: 30px">${ph('data-shape="circle" id="narrow-inline" style="inline-size: 40px"')}${ph('data-shape="circle" id="narrow-line" style="font-size: 40px; line-height: 1"')}${ph('data-shape="circle" id="narrow-block" style="block-size: 40px"')}</div>`;
    await mount(page, [...of('circle', 'circle-line'), fx('cases', { label: 'Loading', showDelay: 0 }, cases)], { reducedMotion: true });
    const fill = await resolveColor(page, T('placeholder-color'));
    const surface = await resolveColor(page, '--tanrei-sys-color-surface');
    const line = (await rect(placeholders(page, 'circle-line').first())).height;
    const square = async (locator: Locator, side: number, message: string) => {
      const box = await rect(locator);
      near(box.width, side, `${message}: inline size`, 0.05);
      near(box.height, side, `${message}: block size`, 0.05);
    };
    await square(placeholders(page, 'circle').first(), 40, 'the block size is the side');
    near(line, (await resolveToken(page, '--tanrei-sys-typescale-body-font-size')) * (await page.evaluate(() => Number(getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-typescale-body-line-height')))), 'no size: one line box', 0.05);
    await square(placeholders(page, 'circle-line').first(), line, 'no size: one line box, square');
    const inside = host(page, 'cases');
    await square(inside.locator('#by-inline'), 48, 'the inline size is the side');
    await square(inside.locator('#lines'), line, 'lines are not read');
    await square(inside.locator('#small'), 10, 'smaller than a line box, as given');
    await square(inside.locator('#in-row'), 32, 'in a row of the product’s');
    await square(inside.locator('#in-cell'), 56, 'the size the layout gives');
    // Narrower than its side: as large as the place allows, and square.
    await square(inside.locator('#narrow-inline'), 30, 'a side given as an inline size');
    await square(inside.locator('#narrow-line'), 30, 'a side that is a line box');
    // A height that is given is kept, so the box cannot follow; what is drawn is the circle that fits — never an oval.
    const kept = inside.locator('#narrow-block');
    expect([(await rect(kept)).width, (await rect(kept)).height]).toEqual([30, 40]);
    const drawn = await painted(kept, fill);
    expect([drawn.at(15, 2), drawn.at(15, 38), drawn.at(1, 6), drawn.at(15, 20), drawn.at(1, 20), drawn.at(29, 20), drawn.at(15, 6), drawn.at(15, 34)]).toEqual([surface, surface, surface, fill, fill, fill, fill, fill]);
    for (const id of ['#by-inline', '#in-row', '#narrow-inline']) {
      const round = await painted(inside.locator(id), fill);
      expect([round.at(0.5, 0.5), round.at(round.width / 2, round.height / 2)], id).toEqual([surface, fill]);
    }
  });

  for (const scripted of [false, true]) {
    test(`SKL-6 the box of the skeleton and of every placeholder is the same in every frame from its insertion, through its show delay, to two points of its animation — ${scripted ? 'with the element defined' : 'before any script'} — and real content of the same style takes exactly that box`, async ({ page }) => {
      const body = `<main style="inline-size: 320px"><div id="place"></div><p id="after" style="margin: 0">After</p></main>`;
      if (scripted) {
        await page.setContent(bare(body));
        await define(page);
      } else await page.setContent(bare(body));
      const delay = await token(page, 'motion-show-delay', 'duration');
      const dim = await token(page, 'motion-dim-duration', 'duration');
      const seen = await page.evaluate(
        async ([wait, half]) => {
          const boxes = (root: Element) => [root, ...root.querySelectorAll('.tanrei-skeleton-placeholder'), document.getElementById('after')!].map((el) => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].join(' '); }).join(' | ');
          const place = document.getElementById('place')!;
          place.innerHTML = `<tanrei-skeleton label="Loading the article">
            <h2 style="margin: 0 0 8px; font: 600 24px/32px sans-serif"><span class="tanrei-skeleton-placeholder"></span></h2>
            <p style="margin: 0 0 12px; font: 16px/normal sans-serif"><span class="tanrei-skeleton-placeholder" data-lines="3"></span></p>
            <span class="tanrei-skeleton-placeholder" data-shape="block" style="block-size: 120px"></span>
            <span class="tanrei-skeleton-placeholder" data-shape="circle" style="block-size: 40px"></span>
          </tanrei-skeleton>`;
          const skeleton = place.firstElementChild as HTMLElement;
          const first = skeleton.querySelector('.tanrei-skeleton-placeholder')!;
          const at = performance.now();
          const frames: { time: number; boxes: string; hidden: boolean; opacity: number }[] = [{ time: 0, boxes: boxes(skeleton), hidden: getComputedStyle(first).visibility === 'hidden', opacity: Number(getComputedStyle(first).opacity) }];
          while (performance.now() - at < wait + half * 1.5) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
            frames.push({ time: performance.now() - at, boxes: boxes(skeleton), hidden: getComputedStyle(first).visibility === 'hidden', opacity: Number(getComputedStyle(first).opacity) });
          }
          const afterTop = document.getElementById('after')!.getBoundingClientRect().y;
          const held = skeleton.getBoundingClientRect().height;
          // The wait ends: the product takes the skeleton away and puts the content in its place, in the same styles.
          place.innerHTML = `<h2 style="margin: 0 0 8px; font: 600 24px/32px sans-serif">The title</h2>
            <p style="margin: 0 0 12px; font: 16px/normal sans-serif">One line<br>and another<br>and the last</p>
            <div style="block-size: 120px"></div><div style="block-size: 40px; margin-block-start: ${getComputedStyle(skeleton).getPropertyValue('--_skl-gap')}"></div>`;
          return { frames, held, afterTop, afterTopWithContent: document.getElementById('after')!.getBoundingClientRect().y };
        },
        [delay, dim] as const,
      );
      // Every frame: the same numbers, for the skeleton, each placeholder and what stands after it.
      expect(seen.frames.length).toBeGreaterThan(10);
      expect([...new Set(seen.frames.map((frame) => frame.boxes))]).toEqual([seen.frames[0].boxes]);
      expect(seen.held).toBeGreaterThan(200);
      // The frames cover the delay (hidden), the moment it is shown, and the animation at two points (two opacities).
      expect([seen.frames[0].hidden, seen.frames.at(-1)!.hidden]).toEqual([true, false]);
      expect(seen.frames.filter((frame) => frame.hidden).length).toBeGreaterThan(3);
      expect(new Set(seen.frames.filter((frame) => !frame.hidden).map((frame) => frame.opacity.toFixed(2))).size).toBeGreaterThan(2);
      // …and nothing moves when the content arrives: zero shift.
      expect(seen.afterTopWithContent).toBe(seen.afterTop);
    });
  }

  test('SKL-6 nothing moves and nothing is drawn differently when the element is defined: every box of every fixture is the same before the script and after it, and a pulse that was under way goes on from where it was', async ({ page }) => {
    const { fixturesDocument } = await import('../../../test/harness.js');
    const document_ = await fixturesDocument(spec);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // The same document, without its script: the skeleton as the stylesheet alone draws it.
    await page.setContent(document_.replace(/<script type="module">[\s\S]*<\/script>/, ''));
    const measure = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('.stage, tanrei-skeleton, .tanrei-skeleton-placeholder')].map((el) => {
          const b = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return [b.x, b.y, b.width, b.height, style.visibility, style.backgroundColor, getComputedStyle(el, '::before').backgroundColor].join(' ');
        }),
      );
    // Past the show delay of the one fixture that has it, so that every fixture is shown and stirring.
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-fixture="waiting"] .tanrei-skeleton-placeholder')!).visibility === 'visible');
    expect(await page.evaluate(() => customElements.get('tanrei-skeleton'))).toBeUndefined();
    const before = await measure();
    await page.evaluate(() => { for (const el of document.querySelectorAll('.tanrei-skeleton-placeholder')) (el as unknown as { before: Animation }).before = el.getAnimations()[0]; });
    await define(page);
    await frames(page);
    expect(await measure()).toEqual(before);
    expect(before.length).toBeGreaterThan(40);
    // The animations are the ones that were running: none was started again by the definition.
    const same = await page.evaluate(() => [...document.querySelectorAll('.tanrei-skeleton-placeholder')].map((el) => { const [now] = el.getAnimations(); const { before } = el as unknown as { before: Animation }; return !!before && now === before && (now as CSSAnimation).animationName === 'tanrei-skeleton-pulse' && Number(now.currentTime) > 0; }));
    expect(same.length).toBeGreaterThan(20);
    expect(same.every(Boolean)).toBe(true);
    // …and the element has said what the stylesheet cannot.
    await expect(host(page, 'text')).toHaveAttribute('role', 'progressbar');
    await expect(host(page, 'waiting')).toHaveAttribute('role', 'progressbar');
    await expect(host(page, 'waiting')).not.toHaveAttribute('data-waiting', '');
  });

  test('SKL-7 inserted, the skeleton waits for its show delay: it draws nothing, runs no animation and has no role, name or busy state, and already takes the box it takes when shown; a show delay of 0 shows it as it is inserted', async ({ page, browserName }) => {
    await mount(page, of('text-lines'));
    const delay = await token(page, 'motion-show-delay', 'duration');
    expect(delay).toBeGreaterThan(0);
    const shownBox = await rect(host(page, 'text-lines'));
    // Inserted now, with the token's delay (the fixture `waiting`) and with none.
    await page.evaluate(() => {
      const stage = document.querySelector('[data-fixture="text-lines"]')!;
      for (const [id, attributes] of [['waiting', ''], ['at-once', 'show-delay="0"']]) stage.insertAdjacentHTML('beforeend', `<tanrei-skeleton id="${id}" label="Loading the article" ${attributes}><span class="tanrei-skeleton-placeholder" data-lines="3"></span></tanrei-skeleton>`);
    });
    const [waiting, atOnce] = [page.locator('#waiting'), page.locator('#at-once')];
    // While it waits.
    expect(await waiting.evaluate((el) => [el.hasAttribute('data-waiting'), getComputedStyle(el).visibility, getComputedStyle(el.firstElementChild!).visibility, el.firstElementChild!.getAnimations().length, el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-busy')])).toEqual([true, 'hidden', 'hidden', 0, null, null, null]);
    const box = await rect(waiting);
    expect([box.width, box.height]).toEqual([shownBox.width, shownBox.height]);
    if (browserName === 'chromium') expect((await progressbars(page)).map((node) => node.name)).toEqual(['Loading the article', 'Loading the article']);
    // A show delay of 0: shown as it is inserted.
    expect(await atOnce.evaluate((el) => [el.hasAttribute('data-waiting'), getComputedStyle(el.firstElementChild!).visibility, el.getAttribute('role')])).toEqual([false, 'visible', 'progressbar']);
    // …and then it is shown, in the box it had.
    await expect.poll(() => shown(waiting)).toBe(true);
    expect(await rect(waiting)).toEqual(box);
    // The fixture `waiting` is this state, held: mounted with a long delay it stays undrawn and unexposed.
    await mount(page, [{ ...of('waiting')[0], props: { ...of('waiting')[0].props, showDelay: 60000 } }]);
    await frames(page, 3);
    expect(await host(page, 'waiting').evaluate((el) => [getComputedStyle(el.firstElementChild!).visibility, el.getAttribute('role'), el.getBoundingClientRect().height > 60])).toEqual(['hidden', null, true]);
    if (browserName === 'chromium') expect(await progressbars(page)).toEqual([]);
  });

  test('SKL-7 before any script the show delay is the stylesheet’s: the skeleton is hidden for the token’s time with its box kept, a page-written role is not exposed while it waits, and show-delay="0" is shown from the first frame', async ({ page, browserName }) => {
    await page.setContent(bare(`<main style="inline-size: 300px"><div id="place"></div></main>`));
    const delay = await token(page, 'motion-show-delay', 'duration');
    const seen = await page.evaluate(async (wait) => {
      const place = document.getElementById('place')!;
      place.innerHTML = `<tanrei-skeleton id="waits" role="progressbar" aria-busy="true" aria-label="Loading the article"><span class="tanrei-skeleton-placeholder" data-lines="3"></span></tanrei-skeleton>
        <tanrei-skeleton id="at-once" show-delay="0"><span class="tanrei-skeleton-placeholder"></span></tanrei-skeleton>`;
      const [waits, atOnce] = [place.querySelector('#waits')!, place.querySelector('#at-once')!];
      const at = performance.now();
      const first = { waits: getComputedStyle(waits).visibility, atOnce: getComputedStyle(atOnce).visibility, height: waits.getBoundingClientRect().height };
      let shownAt = -1;
      while (performance.now() - at < wait * 4 && shownAt < 0) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (getComputedStyle(waits).visibility === 'visible') shownAt = performance.now() - at;
      }
      return { first, shownAt, height: waits.getBoundingClientRect().height };
    }, delay);
    expect(seen.first).toEqual({ waits: 'hidden', atOnce: 'visible', height: seen.height });
    expect(seen.height).toBeGreaterThan(60);
    // The token's time, as a browser's animation counts it (a frame late at most, more on a busy machine).
    expect(seen.shownAt).toBeGreaterThanOrEqual(delay - 20);
    expect(seen.shownAt).toBeLessThan(delay + 400);
    if (browserName === 'chromium') {
      // Exposed now that it is shown — and it was not while it was hidden: the same markup, held hidden, is absent.
      expect((await progressbars(page)).map((node) => node.name)).toEqual(['Loading the article']);
      await page.addStyleTag({ content: `tanrei-skeleton { ${T('motion-show-delay')}: 60s; }` });
      await page.evaluate(() => document.getElementById('place')!.append(document.getElementById('waits')!));
      expect(await progressbars(page)).toEqual([]);
    }
  });

  test('SKL-8 when its show delay ends the skeleton is drawn at once at its resting opacity, with no entrance of its own, exposed as a progressbar, and its animation begins at the beginning of a pulse', async ({ page }) => {
    await mount(page, [fx('timed', { label: 'Loading the article', showDelay: 150 }, `${ph('data-lines="3"')}${ph('data-shape="block" style="block-size: 40px"')}`)], { reducedMotion: false });
    const target = host(page, 'timed');
    const seen = await target.evaluate(async (el) => {
      // Inserted again, so that this insertion is watched from its first moment.
      const parent = el.parentElement!;
      el.remove();
      parent.append(el);
      const first = el.firstElementChild!;
      const before = { waiting: el.hasAttribute('data-waiting'), role: el.getAttribute('role') };
      await new Promise<void>((resolve) => new MutationObserver((_, observer) => { if (!el.hasAttribute('data-waiting')) { observer.disconnect(); resolve(); } }).observe(el, { attributes: true }));
      const at = { role: el.getAttribute('role'), busy: el.getAttribute('aria-busy'), name: el.getAttribute('aria-label'), visibility: getComputedStyle(first).visibility, opacity: Number(getComputedStyle(first).opacity), transform: getComputedStyle(first).transform, names: first.getAnimations().map((a) => (a as CSSAnimation).animationName), time: Number(first.getAnimations()[0]?.currentTime ?? 0) };
      return { before, at };
    });
    expect(seen.before).toEqual({ waiting: true, role: null });
    expect(seen.at).toMatchObject({ role: 'progressbar', busy: 'true', name: 'Loading the article', visibility: 'visible', transform: 'none', names: ['tanrei-skeleton-pulse'] });
    // The beginning of a pulse: the resting opacity, the animation not yet a frame old.
    expect(seen.at.opacity).toBeGreaterThan(0.99);
    expect(seen.at.time).toBeLessThan(20);
  });

  test('SKL-9 the show delay is showDelay, in milliseconds as given; null takes the token; a negative or non-finite value takes the token too and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, of('text'));
    const delay = await token(page, 'motion-show-delay', 'duration');
    const waited = (attributes: string, set?: number) =>
      page.evaluate(
        async ([attrs, value]) => {
          const stage = document.querySelector('.stage')!;
          stage.insertAdjacentHTML('beforeend', `<tanrei-skeleton label="Loading" ${attrs}><span class="tanrei-skeleton-placeholder"></span></tanrei-skeleton>`);
          const el = stage.lastElementChild as HTMLElement & { showDelay: number | null };
          if (value !== null) {
            el.remove();
            el.showDelay = value;
            stage.append(el);
          }
          const at = performance.now();
          if (!el.hasAttribute('data-waiting')) return 0;
          await new Promise<void>((resolve) => new MutationObserver((_, observer) => { if (!el.hasAttribute('data-waiting')) { observer.disconnect(); resolve(); } }).observe(el, { attributes: true }));
          return performance.now() - at;
        },
        [attributes, set ?? null] as const,
      );
    const between = (actual: number, least: number, message: string) => {
      expect(actual, message).toBeGreaterThanOrEqual(least - 5);
      expect(actual, message).toBeLessThan(least + 350);
    };
    expect(await waited('show-delay="0"')).toBe(0);
    between(await waited('show-delay="700"'), 700, 'as given, longer than the token');
    between(await waited('show-delay="60"'), 60, 'as given, shorter than the token');
    between(await waited('', 120), 120, 'the property');
    between(await waited(''), delay, 'null: the token');
    expect(seen.filter((text) => text.includes('SKL-9'))).toEqual([]);
    between(await waited('show-delay="-5"'), delay, 'negative: the token');
    between(await waited('show-delay="soon"'), delay, 'not a number: the token');
    between(await waited('', Number.POSITIVE_INFINITY), delay, 'not finite: the token');
    const reports = seen.filter((text) => text.includes('SKL-9'));
    expect(reports.length).toBe(3);
    expect(reports.join('\n')).toMatch(/showDelay -5 [\s\S]*showDelay "soon" [\s\S]*showDelay Infinity /);
    // The motion dial does not scale a delay that is given.
    await page.addStyleTag({ content: ':root { --tanrei-dial-motion-unit: 200ms; }' });
    expect(await token(page, 'motion-show-delay', 'duration')).toBe(delay * 4);
    between(await waited('show-delay="80"'), 80, 'as given, whatever the motion dial');
  });

  test('SKL-10 the show delay is a wait, not motion: reduced motion keeps it — with the element and before any script — and it is counted while the skeleton cannot be seen, in a hidden view', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page, of('text'));
    const delay = await token(page, 'motion-show-delay', 'duration');
    const seen = await page.evaluate(async (wait) => {
      const stage = document.querySelector('.stage')!;
      const markup = '<tanrei-skeleton label="Loading"><span class="tanrei-skeleton-placeholder"></span></tanrei-skeleton>';
      stage.insertAdjacentHTML('beforeend', `${markup}<div id="view" style="display: none">${markup}</div>`);
      const [plain, hidden] = [stage.querySelector(':scope > tanrei-skeleton:last-of-type')!, stage.querySelector('#view > tanrei-skeleton')!];
      const first = { plain: [plain.hasAttribute('data-waiting'), getComputedStyle(plain).visibility], hidden: hidden.hasAttribute('data-waiting') };
      await new Promise((resolve) => setTimeout(resolve, wait + 200));
      // The view is shown after the delay has passed: the skeleton in it is shown at once, with nothing left to wait.
      (stage.querySelector('#view') as HTMLElement).style.display = 'block';
      return { first, then: { plain: [plain.hasAttribute('data-waiting'), getComputedStyle(plain).visibility, plain.getAttribute('role')], hidden: [hidden.hasAttribute('data-waiting'), getComputedStyle(hidden).visibility, hidden.getAttribute('role')] } };
    }, delay);
    expect(seen.first).toEqual({ plain: [true, 'hidden'], hidden: true });
    expect(seen.then).toEqual({ plain: [false, 'visible', 'progressbar'], hidden: [false, 'visible', 'progressbar'] });
    // Before any script, under reduced motion: still hidden first, and shown after the token's time.
    await page.setContent(bare(`<main style="inline-size: 300px"><div id="place"></div></main>`));
    const bareSeen = await page.evaluate(async (wait) => {
      document.getElementById('place')!.innerHTML = '<tanrei-skeleton><span class="tanrei-skeleton-placeholder"></span></tanrei-skeleton>';
      const el = document.querySelector('tanrei-skeleton')!;
      const first = getComputedStyle(el).visibility;
      await new Promise((resolve) => setTimeout(resolve, wait / 3));
      const during = getComputedStyle(el).visibility;
      await new Promise((resolve) => setTimeout(resolve, wait + 200));
      return [first, during, getComputedStyle(el).visibility, el.firstElementChild!.getAnimations().length];
    }, delay);
    expect(bareSeen).toEqual(['hidden', 'hidden', 'visible', 0]);
  });

  test('SKL-11 removed before its delay ends it has drawn and exposed nothing; removed while shown it is gone at once; inserted again it waits its whole delay again; hiding it neither restarts nor pauses the delay; a showDelay changed while the delay runs applies from the next insertion', async ({ page }) => {
    await mount(page, of('text'));
    const seen = await page.evaluate(async () => {
      const stage = document.querySelector('.stage')!;
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const until = (el: Element) => new Promise<number>((resolve) => { const at = performance.now(); if (!el.hasAttribute('data-waiting')) return resolve(0); new MutationObserver((_, observer) => { if (!el.hasAttribute('data-waiting')) { observer.disconnect(); resolve(performance.now() - at); } }).observe(el, { attributes: true }); });
      const make = (delay: number) => {
        stage.insertAdjacentHTML('beforeend', `<tanrei-skeleton label="Loading" show-delay="${delay}"><span class="tanrei-skeleton-placeholder"></span></tanrei-skeleton>`);
        return stage.lastElementChild as HTMLElement & { showDelay: number | null };
      };
      // Removed during the delay: every attribute it was ever given is recorded.
      const early = make(200);
      const given: string[] = [];
      new MutationObserver((records) => given.push(...records.map((record) => `${record.attributeName}=${early.getAttribute(record.attributeName!)}`))).observe(early, { attributes: true });
      await sleep(80);
      early.remove();
      await sleep(250);
      const afterRemoval = { given: given.filter((entry) => /^(role|aria-)/.test(entry)), role: early.getAttribute('role') };
      // Inserted again: its whole delay again.
      stage.append(early);
      const again = await until(early);
      // Removed while shown: gone at once, nothing left running.
      const shownRole = early.getAttribute('role');
      early.remove();
      const gone = { connected: early.isConnected, animations: early.firstElementChild!.getAnimations().length, role: early.getAttribute('role') };
      // Hidden without being removed: the delay neither restarts nor pauses.
      const hidden = make(300);
      const at = performance.now();
      await sleep(60);
      hidden.hidden = true;
      await sleep(60);
      hidden.hidden = false;
      await until(hidden);
      const hiddenTook = performance.now() - at;
      // showDelay changed while the delay runs: this delay ends as it started; the next insertion takes the new value.
      const changed = make(250);
      const changedAt = performance.now();
      await sleep(40);
      changed.showDelay = 5000;
      await until(changed);
      const changedTook = performance.now() - changedAt;
      changed.remove();
      stage.append(changed);
      await sleep(600);
      const next = changed.hasAttribute('data-waiting');
      return { afterRemoval, again, shownRole, gone, hiddenTook, changedTook, next };
    });
    expect(seen.afterRemoval).toEqual({ given: [], role: null });
    expect(seen.again).toBeGreaterThanOrEqual(195);
    expect(seen.again).toBeLessThan(550);
    expect([seen.shownRole, seen.gone]).toEqual(['progressbar', { connected: false, animations: 0, role: null }]);
    expect(seen.hiddenTook).toBeGreaterThanOrEqual(295);
    expect(seen.hiddenTook).toBeLessThan(650);
    expect(seen.changedTook).toBeGreaterThanOrEqual(245);
    expect(seen.changedTook).toBeLessThan(600);
    expect(seen.next).toBe(true);
  });

  test('SKL-12 pulse, the default: the opacity of every placeholder eases from its resting value to dim-opacity over dim-duration on dim-easing and back, without end and all in step — one whole pulse 2000 ms — by an animation of opacity alone that no box follows', async ({ page }) => {
    await mount(page, of('card', 'person'), { reducedMotion: false });
    const [dim, opacity] = [await token(page, 'motion-dim-duration', 'duration'), await number(page, 'placeholder-dim-opacity')];
    const easing = (await css(page.locator('html'), T('motion-dim-easing'))).replace(/\s+/g, '');
    expect(2 * dim).toBe(2000);
    for (const id of ['card', 'person']) {
      const all = await placeholders(page, id).all();
      const starts: (number | null)[] = [];
      for (const [i, item] of all.entries()) {
        const running = await animations(item);
        expect(running.length, `${id} ${i}`).toBe(1);
        expect(running[0], `${id} ${i}`).toMatchObject({ name: 'tanrei-skeleton-pulse', state: 'running', duration: dim, delay: 0, direction: 'alternate', iterations: Number.POSITIVE_INFINITY, properties: ['opacity'] });
        expect(running[0].easing.replace(/\s+/g, ''), `${id} ${i}`).toBe(easing);
        starts.push(running[0].start);
      }
      // In step: one beginning for all of them.
      expect(new Set(starts).size, id).toBe(1);
      expect(typeof starts[0]).toBe('number');
    }
    // The fall and the way back, read at four points of one pulse — and the box at each.
    const first = placeholders(page, 'card').first();
    const at = (time: number) => first.evaluate((el, t) => { const [animation] = el.getAnimations(); animation.pause(); animation.currentTime = t; const b = el.getBoundingClientRect(); return { opacity: Number(getComputedStyle(el).opacity), box: [b.x, b.y, b.width, b.height].join(' ') }; }, time);
    const [rest, low, back, between] = [await at(0), await at(dim), await at(2 * dim), await at(dim / 2)];
    expect([rest.opacity, low.opacity, back.opacity]).toEqual([1, opacity, 1]);
    expect(between.opacity).toBeGreaterThan(opacity);
    expect(between.opacity).toBeLessThan(1);
    // Never brighter than the resting fill, and no box moves, grows or changes shape.
    expect(new Set([rest.box, low.box, back.box, between.box]).size).toBe(1);
    expect((await at(dim * 1.5)).opacity).toBeCloseTo(between.opacity, 2);
  });

  // The two manners no fixture shows, under a fixture system that names them (the verify): a layer over the default
  // that sets comp.skeleton.motion.animation, as a product's own system does.
  const system = (manner: string) => ({ system: 'acme-skeleton', systemCss: `[data-tanrei-system='acme-skeleton'] { ${T('motion-animation')}: ${manner}; }` });

  test('SKL-12 wave: one dimmer band travels from the skeleton’s start edge to its end edge through all the placeholders as through one surface — each point later by its distance from that edge over the skeleton’s inline size, one whole pulse a crossing — and only the fill’s opacity changes', async ({ page }) => {
    const row = `<div style="display: flex; gap: 20px">${ph('data-shape="block" id="a" style="inline-size: 100px; block-size: 40px"')}${ph('data-shape="block" id="b" style="flex: 1; block-size: 40px"')}</div>${ph('data-lines="2" id="c"')}`;
    await mount(page, [fx('wave', { label: 'Loading', showDelay: 0 }, row), ...of('card')], { reducedMotion: false, ...system('wave') });
    // A black fill on a white stage, so that the dimming is read from the pixels as finely as a channel has levels.
    await page.addStyleTag({ content: `.stage[data-fixture="wave"] { ${T('placeholder-color')}: rgb(0, 0, 0); background: rgb(255, 255, 255); }` });
    const target = host(page, 'wave');
    await expect(target).toHaveAttribute('data-wave', '');
    const [dim, opacity] = [await token(page, 'motion-dim-duration', 'duration'), await number(page, 'placeholder-dim-opacity')];
    const width = (await rect(target)).width;
    expect(await target.evaluate((el) => el.style.getPropertyValue('--_skl-wave-size'))).toBe(`${width}px`);
    const starts: (number | null)[] = [];
    for (const [id, offset] of [['#a', 0], ['#b', 120], ['#c', 0]] as const) {
      const item = target.locator(id);
      // Measured: the placeholder's distance from the skeleton's start edge.
      expect(await item.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--_skl-wave-offset')), id).toBe(`${offset}px`);
      const running = await animations(item);
      expect(running.length, id).toBe(1);
      expect(running[0], id).toMatchObject({ name: 'tanrei-skeleton-wave', state: 'running', duration: 2 * dim, easing: 'linear', direction: 'normal', iterations: Number.POSITIVE_INFINITY });
      // Opacity only — through a mask, which changes what of the fill is seen and nothing of the box.
      expect(running[0].properties.length, id).toBeGreaterThan(0);
      for (const name of running[0].properties) expect(name, id).toMatch(/mask/i);
      expect(await css(item, 'opacity'), id).toBe('1');
      starts.push(running[0].start);
    }
    expect(new Set(starts).size).toBe(1);
    // The band, from the pixels: with the animation held at a quarter of a pulse the dimmest point of the skeleton is a
    // quarter of its width from the start edge, in whichever placeholder stands there — the same surface for all.
    const channel = (color: string) => Number(color.match(/\d+/)![0]);
    const hold = (time: number) => target.evaluate((el, t) => { for (const item of el.querySelectorAll('.tanrei-skeleton-placeholder')) for (const animation of item.getAnimations()) { animation.pause(); animation.currentTime = t; } }, time);
    /** How far the fill is dimmed at `x` of the skeleton's width, on the row at `y`: 0 at rest, 1 at dim-opacity. */
    const dimmed = async (x: number, y: number) => {
      const shot = decodePng(await target.screenshot());
      return channel(shot.at(Math.round(x * 2), Math.round(y * 2))) / (255 * (1 - opacity));
    };
    // A point is later than the start edge by its share of the width: at the beginning of a pulse the start edge is at
    // rest, and the point half a width along is half a pulse behind it — at the low point.
    await hold(0);
    near(await dimmed(2, 20), 0, 'the beginning of a pulse: the start edge at rest', 0.05);
    near(await dimmed(width / 2, 20), 1, '…and the trough half a width along', 0.05);
    await hold(dim / 2);
    near(await dimmed(width * 0.75, 20), 1, 'a quarter of a pulse later the trough is a quarter of the width further (in the second block)', 0.05);
    near(await dimmed(width / 4, 20), 0, '…the first block at rest where it passed', 0.05);
    near(await dimmed(width / 4, 55), 0, '…and the text under it, at the same place, the same', 0.05);
    await hold(dim * 1.5);
    near(await dimmed(width / 4, 20), 1, 'three quarters of a pulse: it has left the end edge and come in at the start edge (in the first block)', 0.05);
    near(await dimmed(width / 4, 55), 1, '…and in the text under it, at the same place', 0.05);
    near(await dimmed(width * 0.75, 20), 0, '…the second block at rest', 0.05);
    near(await dimmed(width / 2, 20), 0.5, '…with the fall half way between them', 0.06);
    // The box is the same at both moments, and the skeleton is resized: it is measured again.
    const boxes = await Promise.all((await target.locator(PH).all()).map(rect));
    await page.addStyleTag({ content: '.stage[data-fixture="wave"] { inline-size: 240px !important; }' });
    await expect.poll(() => target.evaluate((el) => el.style.getPropertyValue('--_skl-wave-size'))).toBe('240px');
    expect(boxes.length).toBe(3);
  });

  test('SKL-12 none: the placeholders are still at their resting opacity; and a system that names the manner is read where the browser has no style queries too', async ({ page }) => {
    await mount(page, of('card', 'person'), { reducedMotion: false, ...system('none') });
    for (const id of ['card', 'person']) {
      for (const item of await placeholders(page, id).all()) expect([(await animations(item)).length, await css(item, 'opacity')], id).toEqual([0, '1']);
      await expect(host(page, id)).toHaveAttribute('role', 'progressbar');
    }
    // Where style queries are answered the stylesheet reads the choice itself, and the element writes nothing.
    const queries = await page.evaluate(() => { const probe = document.createElement('div'); probe.innerHTML = '<style>@container style(--p: 1) { i { --a: 1; } }</style><b style="--p: 1"><i></i></b>'; document.body.append(probe); const yes = getComputedStyle(probe.querySelector('i')!).getPropertyValue('--a') === '1'; probe.remove(); return yes; });
    expect(await host(page, 'card').getAttribute('data-animation')).toBe(queries ? null : 'none');
    // The system switched at run time, on the root: the skeleton follows.
    await page.evaluate(() => document.documentElement.removeAttribute('data-tanrei-system'));
    await expect.poll(async () => (await animations(placeholders(page, 'card').first())).map((a) => a.name)).toEqual(['tanrei-skeleton-pulse']);
    await expect(host(page, 'card')).not.toHaveAttribute('data-animation', 'none');
  });

  test('SKL-13 under reduced motion the skeleton does not stir, whatever the manner: its placeholders are still at their resting opacity, and its shapes, its label and its busy state are there', async ({ page }) => {
    for (const manner of ['pulse', 'wave', 'none']) {
      await mount(page, of('card', 'text-lines'), { reducedMotion: true, ...system(manner) });
      await frames(page, 3);
      for (const id of ['card', 'text-lines']) {
        for (const item of await placeholders(page, id).all()) expect([(await animations(item)).length, await css(item, 'opacity'), (await css(item, 'mask-image')) || 'none'], `${manner} ${id}`).toEqual([0, '1', 'none']);
        expect(await host(page, id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-busy'), !!el.getAttribute('aria-label'), getComputedStyle(el).visibility]), manner).toEqual(['progressbar', 'true', true, 'visible']);
      }
      const fill = await resolveColor(page, T('placeholder-color'));
      expect((await painted(placeholders(page, 'text-lines').first(), fill)).column(20).length, manner).toBe(3);
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('SKL-14 while the skeleton is not visible its animation does not run, and it resumes where it stopped when it is visible again', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 400 });
    await mount(page, of('text-lines'), { reducedMotion: false });
    const target = host(page, 'text-lines');
    const item = placeholders(page, 'text-lines').first();
    await expect.poll(async () => (await animations(item))[0]?.state).toBe('running');
    // Scrolled out of view.
    await page.evaluate(() => { document.body.insertAdjacentHTML('afterbegin', '<div id="spacer" style="block-size: 3000px"></div>'); window.scrollTo(0, 0); });
    await expect(target).toHaveAttribute('data-paused', '');
    await expect.poll(async () => (await animations(item))[0].state).toBe('paused');
    await frames(page, 2);
    const held = (await animations(item))[0].time!;
    await page.waitForTimeout(150);
    expect((await animations(item))[0].time).toBe(held);
    // Visible again: it goes on from there.
    await page.evaluate(() => document.getElementById('spacer')!.remove());
    await expect(target).not.toHaveAttribute('data-paused', '');
    await expect.poll(async () => (await animations(item))[0].state).toBe('running');
    const resumed = (await animations(item))[0].time!;
    expect(resumed).toBeGreaterThanOrEqual(held);
    expect(resumed - held).toBeLessThan(1500);
    // In a hidden view: nothing runs at all.
    await target.evaluate((el) => (el.parentElement!.style.display = 'none'));
    expect(await item.evaluate((el) => el.getAnimations().filter((animation) => animation.playState === 'running').length)).toBe(0);
  });

  test('SKL-15 shown and not decorative, the skeleton is one element to assistive technology: a progressbar named by its label, with no value, busy — and nothing of what it holds: no placeholder, no count, nothing of a layout inside it', async ({ page, browserName }) => {
    const layout = `<div role="list"><div role="listitem">${ph('data-shape="circle" style="block-size: 40px"')}<p>${ph('data-lines="2"')}</p></div></div>`;
    await mount(page, [...spec.fixtures.filter((f) => f.id !== 'waiting' && f.id !== 'decorative'), fx('layout', { label: 'Loading the list', showDelay: 0 }, layout)]);
    for (const f of [...spec.fixtures.filter((f) => f.id !== 'waiting' && f.id !== 'decorative'), fx('layout', { label: 'Loading the list' })]) {
      expect(await host(page, f.id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-busy'), el.hasAttribute('aria-valuenow'), el.hasAttribute('aria-valuetext'), el.hasAttribute('aria-hidden')]), f.id).toEqual(['progressbar', f.props.label, 'true', false, false, false]);
    }
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    const nodes = await exposed(page);
    const bars = nodes.filter((node) => node.role === 'progressbar');
    expect(bars.map((node) => node.name)).toEqual([...spec.fixtures.filter((f) => f.id !== 'waiting' && f.id !== 'decorative').map((f) => f.props.label), 'Loading the list']);
    for (const bar of bars) expect([bar.name, bar.busy, bar.value ?? null, bar.under]).toEqual([bar.name, true, null, 0]);
    // Nothing of the layout inside it.
    expect(nodes.filter((node) => ['list', 'listitem', 'paragraph'].includes(node.role))).toEqual([]);
  });

  test('SKL-16 the skeleton is not focusable and not a stop in the focus order, is no live region, and neither announces itself nor moves focus when it is shown, when it changes or when it is removed', async ({ page }) => {
    await mount(page, [fx('timed', { label: 'Loading', showDelay: 120 }, ph('data-lines="2"')), ...of('person')]);
    await page.evaluate(() => { document.body.insertAdjacentHTML('afterbegin', '<button id="first">First</button>'); document.body.insertAdjacentHTML('beforeend', '<button id="last">Last</button>'); (document.getElementById('first') as HTMLElement).focus(); });
    const active = () => page.evaluate(() => document.activeElement?.id ?? '');
    const target = host(page, 'timed');
    // Shown, changed and removed with the focus elsewhere: the focus stays where it was.
    await expect.poll(() => shown(target)).toBe(true);
    expect(await active()).toBe('first');
    await target.evaluate((el) => ((el as HTMLElement & { label: string }).label = 'Loading more'));
    await expect(target).toHaveAttribute('aria-label', 'Loading more');
    expect(await active()).toBe('first');
    // Not a stop: Tab goes from the control before it to the control after it.
    await tab(page);
    expect(await active()).toBe('last');
    for (const id of ['timed', 'person']) {
      expect(await host(page, id).evaluate((el) => { (el as HTMLElement).focus(); return [document.activeElement === el, el.hasAttribute('tabindex'), el.getAttribute('aria-live'), el.getAttribute('role'), [...el.querySelectorAll('[aria-live], [role="status"], [role="alert"]')].length]; }), id).toEqual([false, false, null, 'progressbar', 0]);
    }
    await target.evaluate((el) => el.remove());
    expect(await active()).toBe('last');
    expect(await page.locator('[aria-live], [role="status"], [role="alert"]').count()).toBe(0);
  });

  test('SKL-17 a decorative skeleton keeps itself and everything it holds from assistive technology — no role, no name, no busy state — and draws, waits and stirs as it otherwise would; a skeleton inside another is silent whatever its prop says: one progressbar', async ({ page, browserName }) => {
    const nested = `${ph()}<tanrei-skeleton label="Loading the inner part" show-delay="0">${ph('data-lines="2"')}</tanrei-skeleton>`;
    await mount(page, [...of('decorative'), fx('plain', { label: 'Loading', showDelay: 0 }, ph('data-lines="2"')), fx('nested', { label: 'Loading the page', showDelay: 0 }, nested), fx('late', { decorative: true, label: 'Not read' }, ph())], { reducedMotion: false });
    const [quiet, plain] = [host(page, 'decorative'), host(page, 'plain')];
    expect(await quiet.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-busy'), el.getAttribute('aria-hidden')])).toEqual([null, null, null, 'true']);
    // Drawn and stirring as the same skeleton that is not decorative.
    const [a, b] = [await rect(quiet), await rect(plain)];
    expect([a.width, a.height]).toEqual([b.width, b.height]);
    expect((await animations(placeholders(page, 'decorative').first())).map((x) => [x.name, x.state, x.duration])).toEqual((await animations(placeholders(page, 'plain').first())).map((x) => [x.name, x.state, x.duration]));
    expect(await css(placeholders(page, 'decorative').first(), 'background-color', '::before')).toBe(await css(placeholders(page, 'plain').first(), 'background-color', '::before'));
    // It waits as it otherwise would, and is still silent when shown; its label is not read.
    const late = host(page, 'late');
    await expect.poll(() => shown(late)).toBe(true);
    expect(await late.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-hidden')])).toEqual([null, null, 'true']);
    // Nested: the inner one is silent, the outer one says the wait.
    const inner = host(page, 'nested').locator(TAG);
    expect(await inner.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-hidden'), (el as HTMLElement & { decorative: boolean }).decorative])).toEqual([null, null, 'true', false]);
    await expect(host(page, 'nested')).toHaveAttribute('role', 'progressbar');
    // Decorative taken away and given back at run time (SKL-24): exposed at once, silent at once.
    await quiet.evaluate((el) => ((el as HTMLElement & { decorative: boolean; label: string }).decorative = false));
    await expect(quiet).toHaveAttribute('role', 'progressbar');
    await quiet.evaluate((el) => ((el as HTMLElement & { decorative: boolean }).decorative = true));
    await expect(quiet).toHaveAttribute('aria-hidden', 'true');
    await expect(quiet).not.toHaveAttribute('role', 'progressbar');
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    // The verify: one progressbar for the nested pair — and for the page, the two skeletons that say their wait.
    expect((await progressbars(page)).map((node) => [node.name, node.under])).toEqual([['Loading', 0], ['Loading the page', 0]]);
  });

  test('SKL-18 the name is the label, else the product’s words (loadingLabel), in the language of where it stands; with neither it is still drawn and still a busy progressbar, without a name, and a debug build says so once, naming the prop', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mount(page, [fx('own', { label: 'Loading projects', showDelay: 0 }, ph()), fx('words', { showDelay: 0 }, ph()), fx('words-ja', { showDelay: 0, lang: 'ja' }, ph()), fx('quiet', { decorative: true, showDelay: 0 }, ph())]);
    // Neither: exposed without a name, reported once for the page.
    for (const id of ['words', 'words-ja']) expect(await host(page, id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-busy'), el.getAttribute('aria-label'), getComputedStyle(el.firstElementChild!).visibility, el.getBoundingClientRect().height > 20]), id).toEqual(['progressbar', 'true', null, 'visible', true]);
    const reports = seen.filter((text) => text.includes('SKL-18'));
    expect(reports.length).toBe(1);
    expect(reports[0]).toContain('label is empty');
    expect(reports[0]).toContain('loadingLabel');
    expect(await missingWords(page)).toEqual(['loadingLabel']);
    if (browserName === 'chromium') expect((await progressbars(page)).map((node) => [node.name, node.busy])).toEqual([['Loading projects', true], ['', true], ['', true]]);
    // The product says the word once, and once for a language.
    await setWords(page, { loadingLabel: 'Loading' });
    await setWords(page, { loadingLabel: '読み込み中' }, { lang: 'ja' });
    await expect(host(page, 'words')).toHaveAttribute('aria-label', 'Loading');
    await expect(host(page, 'words-ja')).toHaveAttribute('aria-label', '読み込み中');
    // The instance's own label wins, and a decorative skeleton reads neither.
    await expect(host(page, 'own')).toHaveAttribute('aria-label', 'Loading projects');
    expect(await host(page, 'quiet').getAttribute('aria-label')).toBeNull();
    expect(await missingWords(page)).toEqual([]);
    // Nothing of it is drawn: no word in any language.
    expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-skeleton')].map((el) => (el as HTMLElement).innerText.trim()).join(''))).toBe('');
  });

  test('SKL-19 the skeleton takes no pointer, touch or keyboard input and draws nothing differently under a pointer, a press or focus; whatever the product puts in it is drawn as given, takes no input and no focus, and is not exposed', async ({ page, browserName }) => {
    const content = `<div class="card" style="border: 1px solid; padding: 8px">${ph('data-shape="block" style="block-size: 40px"')}<button id="inside" onclick="window.pressed = true">Open</button><a id="link" href="#x">Read</a><p id="words">Some words</p></div>`;
    await mount(page, [fx('holds', { label: 'Loading', showDelay: 0 }, content), ...of('card')], { reducedMotion: true });
    await page.evaluate(() => { document.body.insertAdjacentHTML('afterbegin', '<button id="first">First</button>'); document.body.insertAdjacentHTML('beforeend', '<button id="last">Last</button>'); });
    const target = host(page, 'holds');
    // Drawn as given: the product's own border, padding and words.
    expect(await target.locator('.card').evaluate((el) => [getComputedStyle(el).borderTopWidth, getComputedStyle(el).paddingTop, getComputedStyle(el.querySelector('#words')!).visibility, el.querySelector('#words')!.getBoundingClientRect().height > 0])).toEqual(['1px', '8px', 'visible', true]);
    // No input: a press on the button inside presses nothing, and nothing inside takes focus.
    const button = await rect(target.locator('#inside'));
    await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
    await page.touchscreen?.tap(button.x + button.width / 2, button.y + button.height / 2).catch(() => undefined);
    expect(await page.evaluate(() => { (document.getElementById('inside') as HTMLElement).focus(); (document.getElementById('link') as HTMLElement).focus(); return [(window as unknown as { pressed?: boolean }).pressed ?? false, document.activeElement?.id ?? '']; })).toEqual([false, '']);
    // Tab passes it by: from the control before the skeletons to the control after them.
    await page.evaluate(() => (document.getElementById('first') as HTMLElement).focus());
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id ?? '')).toBe('last');
    expect(await css(target, 'pointer-events')).toBe('none');
    // Nothing is drawn differently under a pointer or a press: no state layer, no focus indicator.
    const look = () => page.evaluate(() => [...document.querySelectorAll('[data-fixture="card"] tanrei-skeleton, [data-fixture="card"] .tanrei-skeleton-placeholder')].map((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.opacity, s.outlineStyle, s.boxShadow, getComputedStyle(el, '::before').backgroundColor, getComputedStyle(el, '::after').content].join(' '); }));
    const resting = await look();
    const over = await rect(placeholders(page, 'card').first());
    await page.mouse.move(over.x + 20, over.y + 20);
    expect(await look()).toEqual(resting);
    await page.mouse.down();
    expect(await look()).toEqual(resting);
    await page.mouse.up();
    expect(await host(page, 'card').evaluate((el) => [...el.attributes].map((attribute) => attribute.name).filter((name) => /pressed|hover|focus/.test(name)))).toEqual([]);
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    const nodes = await exposed(page);
    expect(nodes.filter((node) => ['Open', 'Read', 'Some words'].includes(node.name))).toEqual([]);
    expect(nodes.filter((node) => node.role === 'progressbar').map((node) => node.under)).toEqual([0, 0]);
  });

  test('SKL-20 where the platform forces its colors each placeholder, and each line of a text placeholder, is the outline of its shape — one hairline, inside its box, in the text color, with no fill — and the skeleton does not stir', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'no-preference' });
    await mount(page, of('text', 'text-lines', 'long-text', 'block-sized', 'circle', 'person'));
    const system = (name: string) => page.evaluate((value) => { const probe = document.createElement('i'); probe.style.cssText = `color: ${value}; forced-color-adjust: none`; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, name);
    const canvasText = await system('CanvasText');
    // The media query alone is not the mode: WebKit answers it under emulation and repaints nothing.
    const forced = await page.evaluate(() => { const probe = document.createElement('div'); probe.style.color = 'rgb(1, 2, 3)'; document.body.appendChild(probe); const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)'; probe.remove(); return repainted; });
    if (!forced) test.info().annotations.push({ type: 'forced-colors', description: 'the mode is not emulated by this browser: the stylesheet’s rules are read and their pixels measured, the platform’s own repaint is not' });
    const hairline = await resolveToken(page, '--tanrei-sys-border-hairline');
    const sizes = async () => (await Promise.all((await placeholders(page, 'person').all()).map(rect))).map((box) => [box.x, box.width, box.height]);
    const boxes = await sizes();
    for (const id of ['text-lines', 'block-sized', 'circle', 'person']) {
      for (const [i, item] of (await placeholders(page, id).all()).entries()) {
        const at = `${id} ${i}`;
        // Still.
        expect([(await animations(item)).length, await css(item, 'opacity')], at).toEqual([0, '1']);
        const shape = (await item.getAttribute('data-shape')) ?? 'text';
        if (shape === 'text') {
          for (const pseudo of ['::before', '::after']) expect([(await css(item, 'background-color', pseudo)).replace(/^rgba\(.*, 0\)$/, 'transparent'), await css(item, 'box-shadow', pseudo), await css(item, 'border-top-color', pseudo)], `${at} ${pseudo}`).toEqual(['transparent', 'none', canvasText]);
          expect(Number.parseFloat(await css(item, 'border-top-width', '::before')), at).toBe(hairline);
        } else {
          expect([(await css(item, 'background-color')).replace(/^rgba\(.*, 0\)$/, 'transparent'), await css(item, 'outline-style'), await css(item, 'outline-color'), Number.parseFloat(await css(item, 'outline-width')), Number.parseFloat(await css(item, 'outline-offset'))], at).toEqual(['transparent', 'solid', canvasText, hairline, -hairline]);
        }
      }
    }
    // The pixels: every line of a text placeholder is a hollow outline — two hairlines down a column, the top and the
    // bottom of its bar — as long as its bar, and nothing is filled.
    const outline = async (id: string, index: number, lines: number, width: number, last: number) => {
      const item = placeholders(page, id).nth(index);
      const drawn = await painted(item, canvasText);
      const runs = drawn.column(20);
      expect(runs.length, `${id}: two hairlines a line`).toBe(lines * 2);
      const lineHeight = (await rect(item)).height / lines;
      const size = Number.parseFloat(await css(item, 'font-size'));
      // (Within a pixel and a half: a screenshot begins on a whole pixel, and the copies of the outline stand a whole
      // number of pixels apart where a line box is a fraction more or less.)
      for (let line = 0; line < lines; line++) {
        const [top, bottom] = [runs[line * 2], runs[line * 2 + 1]];
        near(top[1] - top[0], hairline, `${id} line ${line}: one hairline`, 0.5);
        near(bottom[1] - bottom[0], hairline, `${id} line ${line}: one hairline`, 0.5);
        near(top[0], line * lineHeight + (lineHeight - size) / 2, `${id} line ${line}: the bar’s top`, 1.5);
        near(bottom[1], line * lineHeight + (lineHeight + size) / 2, `${id} line ${line}: the bar’s bottom, inside its box`, 1.5);
        near(bottom[1] - top[0], size, `${id} line ${line}: as tall as the font size, outline included`, 0.5);
        // Between them: nothing but the two ends of the outline.
        const middle = drawn.row((top[0] + bottom[1]) / 2)!;
        near(middle[0], 0, `${id} line ${line}: from the start edge`);
        near(middle[1], line === lines - 1 && lines > 1 ? last : width, `${id} line ${line}: as long as its bar`);
        expect(drawn.at(20, (top[0] + bottom[1]) / 2), `${id} line ${line}: no fill`).not.toBe(canvasText);
      }
    };
    const share = await number(page, 'placeholder-last-line-inline-size');
    await outline('text', 0, 1, 300, 300);
    await outline('text-lines', 0, 3, 300, 300 * share);
    await outline('long-text', 1, 12, 300, 300 * share);
    // A block and a circle: the outline inside the box, nothing in the middle.
    const block = await painted(placeholders(page, 'block-sized').first(), canvasText);
    expect(block.column(48).map(([top, bottom]) => Math.round(bottom - top))).toEqual([hairline, hairline]);
    near(block.column(48)[1][1] - block.column(48)[0][0], 40, 'the outline at the box’s two edges, inside it', 0.5);
    const circle = await painted(placeholders(page, 'circle').first(), canvasText);
    expect([circle.column(20).length, circle.at(20, 20) === canvasText, circle.at(1, 1) === canvasText]).toEqual([2, false, false]);
    // The boxes are the ones of the other modes.
    await page.emulateMedia({ forcedColors: 'none' });
    await mount(page, of('person'));
    expect(await sizes()).toEqual(boxes);
  });

  test('SKL-21 with the text enlarged a text placeholder grows with its text style, and a block or a circle that is a line box with it; a size that is given stays, the gap stays, no placeholder is wider than its place, and at 320 wide with text at 200 % nothing scrolls sideways', async ({ page }) => {
    const extra = [fx('wide', { label: 'Loading', showDelay: 0 }, `${ph('style="inline-size: 900px"')}${ph('data-shape="block" style="inline-size: 900px; block-size: 40px"')}`)];
    const measure = async (enlarged: boolean) => {
      await mount(page, [...of('text-lines', 'block-line', 'circle-line', 'circle', 'block-sized', 'person', 'long-text'), ...extra], { reducedMotion: true });
      if (enlarged) await page.addStyleTag({ content: 'html { font-size: 200%; }' });
      const boxes: Record<string, Box[]> = {};
      for (const id of ['text-lines', 'block-line', 'circle-line', 'circle', 'block-sized', 'person']) boxes[id] = await Promise.all((await placeholders(page, id).all()).map(rect));
      return { boxes, gap: await token(page, 'container-gap'), body: await resolveToken(page, '--tanrei-sys-typescale-body-font-size') };
    };
    const [plain, large] = [await measure(false), await measure(true)];
    expect(large.body).toBe(plain.body * 2);
    // What is a line box grows with the text style: three lines, a block of one line, a circle of one line.
    near(large.boxes['text-lines'][0].height, plain.boxes['text-lines'][0].height * 2, 'three lines', 0.1);
    near(large.boxes['block-line'][0].height, plain.boxes['block-line'][0].height * 2, 'a block of one line', 0.1);
    near(large.boxes['circle-line'][0].width, plain.boxes['circle-line'][0].width * 2, 'a circle of one line', 0.1);
    near(large.boxes['circle-line'][0].height, large.boxes['circle-line'][0].width, '…still square', 0.05);
    // A size given stays as given.
    expect([large.boxes.circle[0].width, large.boxes.circle[0].height]).toEqual([40, 40]);
    expect([large.boxes['block-sized'][0].width, large.boxes['block-sized'][0].height]).toEqual([96, 40]);
    near(large.boxes.person[1].width, 160, 'a line of a given length', 0.05);
    // The bars are the enlarged style's: as tall as its font size.
    const fill = await resolveColor(page, T('placeholder-color'));
    const bars = (await painted(placeholders(page, 'text-lines').first(), fill)).column(20);
    expect(bars.length).toBe(3);
    near(bars[0][1] - bars[0][0], large.body, 'a bar as tall as the enlarged font size');
    // 320 wide, text at 200 %: the stage's own inset is kept, and nothing is wider than its place.
    await page.setViewportSize({ width: 320, height: 800 });
    await page.addStyleTag({ content: 'main { display: block !important; } .stage { max-inline-size: none !important; inline-size: auto !important; }' });
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])).toEqual([320, 320]);
    for (const id of ['text-lines', 'person', 'long-text', 'block-sized', 'wide']) {
      const outer = await rect(host(page, id));
      near(outer.width, 320 - 32, `${id}: the skeleton is its place wide`, 0.05);
      const all = await Promise.all((await placeholders(page, id).all()).map(rect));
      for (const [i, box] of all.entries()) {
        expect(box.x + box.width, `${id} ${i}: never wider than its place`).toBeLessThanOrEqual(outer.x + outer.width + 0.01);
        if (i) near(box.y - (all[i - 1].y + all[i - 1].height), large.gap, `${id} ${i}: the gap is kept`, 0.1);
      }
    }
    // (The gap is the token's, which the default system writes in rem: it is the same token, kept, at either size.)
    expect(large.gap).toBe(plain.gap * 2);
  });

  test('SKL-22 right to left the placeholders stand at the right edge, the short last bar and every placeholder narrower than its place begin at the right, and a wave runs from the right edge to the left; a block and a circle are otherwise drawn as left to right', async ({ page }) => {
    await mount(page, of('person', 'person-rtl', 'text-lines', 'text-lines-rtl'), { reducedMotion: true });
    const fill = await resolveColor(page, T('placeholder-color'));
    const outer = await rect(host(page, 'person-rtl'));
    const [ltr, rtl] = [await Promise.all((await placeholders(page, 'person').all()).map(rect)), await Promise.all((await placeholders(page, 'person-rtl').all()).map(rect))];
    for (const [i, box] of rtl.entries()) {
      near(box.x + box.width, outer.x + outer.width, `person-rtl ${i}: at the right edge`, 0.05);
      // The same sizes as left to right, mirrored.
      expect([box.width, box.height], `person-rtl ${i}`).toEqual([ltr[i].width, ltr[i].height]);
      near(outer.x + outer.width - (box.x + box.width), ltr[i].x - (await rect(host(page, 'person'))).x, `person-rtl ${i}: the mirror of its place`, 0.05);
    }
    // The short last bar: from the right, in both text placeholders.
    const last = await number(page, 'placeholder-last-line-inline-size');
    for (const [id, index, lines] of [['text-lines-rtl', 0, 3], ['person-rtl', 2, 2]] as const) {
      const drawn = await painted(placeholders(page, id).nth(index), fill);
      const bars = drawn.column(280);
      expect(bars.length, id).toBe(lines);
      expect(drawn.column(20).length, id).toBe(lines - 1);
      const [left, right] = drawn.row((bars.at(-1)![0] + bars.at(-1)![1]) / 2)!;
      near(right, 300, `${id}: the last bar begins at the right`);
      near(left, 300 * (1 - last), `${id}: and is its share long`);
    }
    // The circle is the circle, wherever it stands.
    const [a, b] = [await painted(placeholders(page, 'person').first(), fill), await painted(placeholders(page, 'person-rtl').first(), fill)];
    expect([b.at(20, 20), b.at(1, 1), b.column(20).map(([top, bottom]) => bottom - top)]).toEqual([a.at(20, 20), a.at(1, 1), a.column(20).map(([top, bottom]) => bottom - top)]);
    // A wave: from the right edge to the left.
    const row = `<div style="display: flex; gap: 20px">${ph('data-shape="block" id="a" style="inline-size: 100px; block-size: 40px"')}${ph('data-shape="block" id="b" style="flex: 1; block-size: 40px"')}</div>`;
    await mount(page, [fx('wave', { label: 'Loading', showDelay: 0 }, row, { direction: 'rtl' })], { reducedMotion: false, ...system('wave') });
    await page.addStyleTag({ content: `.stage[data-fixture="wave"] { ${T('placeholder-color')}: rgb(0, 0, 0); background: rgb(255, 255, 255); }` });
    const target = host(page, 'wave');
    await expect(target).toHaveAttribute('data-wave', '');
    const dim = await token(page, 'motion-dim-duration', 'duration');
    const opacity = await number(page, 'placeholder-dim-opacity');
    expect((await animations(target.locator('#a')))[0]).toMatchObject({ name: 'tanrei-skeleton-wave', direction: 'reverse' });
    // `#a` is the first, so it stands at the right: 200 from the skeleton's left edge.
    expect(await target.locator('#a').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--_skl-wave-offset'))).toBe('200px');
    const channel = (color: string) => Number(color.match(/\d+/)![0]);
    const dimmed = async (x: number) => channel(decodePng(await target.screenshot()).at(Math.round(x * 2), 40)) / (255 * (1 - opacity));
    const hold = (time: number) => target.evaluate((el, t) => { for (const item of el.querySelectorAll('.tanrei-skeleton-placeholder')) for (const animation of item.getAnimations()) { animation.pause(); animation.currentTime = t; } }, time);
    // The start edge is the right one: at rest at the beginning of a pulse, and a quarter of a pulse later the trough is
    // three quarters of the width from it — a quarter from the left.
    await hold(0);
    near(await dimmed(298), 0, 'the beginning of a pulse: the right edge at rest', 0.05);
    near(await dimmed(150), 1, '…and the trough half a width along', 0.05);
    await hold(dim / 2);
    near(await dimmed(75), 1, 'a quarter of a pulse later the trough is a quarter of the width further to the left', 0.05);
    near(await dimmed(225), 0, '…and the right at rest where it passed', 0.05);
  });

  test('SKL-23 the skeleton takes its direction from where it is used — an ancestor inside the page, not the root — and has no setting of its own; when that direction changes while it is shown it is drawn for the new one at once, keeping its place in its animation', async ({ page }) => {
    await mount(page, of('person', 'text-lines'), { reducedMotion: false });
    expect(await page.evaluate(() => [document.documentElement.dir, 'dir' in (customElements.get('tanrei-skeleton') as unknown as { properties: object }).properties, 'direction' in (customElements.get('tanrei-skeleton') as unknown as { properties: object }).properties])).toEqual(['', false, false]);
    const fill = await resolveColor(page, T('placeholder-color'));
    const outer = await rect(host(page, 'person'));
    const before = await Promise.all((await placeholders(page, 'person').all()).map(rect));
    for (const box of before) near(box.x, outer.x, 'left to right: at the left', 0.05);
    const start = (await animations(placeholders(page, 'person').first()))[0].start;
    // The direction changes on an ancestor, after the first render.
    await page.evaluate(() => { for (const stage of document.querySelectorAll('.stage')) stage.setAttribute('dir', 'rtl'); });
    const after = await Promise.all((await placeholders(page, 'person').all()).map(rect));
    for (const [i, box] of after.entries()) {
      near(box.x + box.width, outer.x + outer.width, `${i}: right to left, at the right — at once`, 0.05);
      expect([box.width, box.height, box.y]).toEqual([before[i].width, before[i].height, before[i].y]);
    }
    // Its place in its animation is kept: the same animation, never started again, and no motion of its own.
    const running = await animations(placeholders(page, 'person').first());
    expect(running.map((a) => [a.name, a.start])).toEqual([['tanrei-skeleton-pulse', start]]);
    expect(await css(placeholders(page, 'person').first(), 'transition-duration')).toBe('0s');
    // (Read after the animation: a screenshot holds the page's animations still and starts them again.)
    const drawn = await painted(placeholders(page, 'text-lines').first(), fill);
    expect([drawn.column(20).length, drawn.column(280).length]).toEqual([2, 3]);
    // …and back.
    await page.evaluate(() => { for (const stage of document.querySelectorAll('.stage')) stage.removeAttribute('dir'); });
    expect(await Promise.all((await placeholders(page, 'person').all()).map(rect))).toEqual(before);
  });

  test('SKL-24 a label, decorative, a placeholder’s shape, lines or sizes changed, or a placeholder added or removed, is drawn and exposed at once, without a motion and without restarting the delay or the animation — a placeholder that is added stirs in step with the others; the skeleton neither shows nor hides itself', async ({ page }) => {
    await mount(page, of('person'), { reducedMotion: false });
    const target = host(page, 'person');
    const line = (await rect(placeholders(page, 'person').nth(1))).height;
    const gap = await token(page, 'container-gap');
    const start = (await animations(placeholders(page, 'person').first()))[0].start;
    expect(typeof start).toBe('number');
    await page.waitForTimeout(120);
    // Label and decorative.
    await target.evaluate((el) => ((el as HTMLElement & { label: string }).label = 'Loading the editor'));
    await expect(target).toHaveAttribute('aria-label', 'Loading the editor');
    // Lines, a shape, a size: the box follows in the same frame.
    await placeholders(page, 'person').nth(2).evaluate((el) => el.setAttribute('data-lines', '4'));
    near((await rect(placeholders(page, 'person').nth(2))).height, 4 * line, 'four lines at once', 0.05);
    await placeholders(page, 'person').nth(1).evaluate((el) => { el.setAttribute('data-shape', 'block'); (el as HTMLElement).style.blockSize = '30px'; });
    expect([(await rect(placeholders(page, 'person').nth(1))).width, (await rect(placeholders(page, 'person').nth(1))).height]).toEqual([160, 30]);
    // One added, one removed.
    await target.evaluate((el) => el.insertAdjacentHTML('beforeend', '<span class="tanrei-skeleton-placeholder" id="added" data-lines="2"></span>'));
    near((await rect(target)).height, 40 + gap + 30 + gap + 4 * line + gap + 2 * line, 'the skeleton is as tall as what it now holds', 0.1);
    await placeholders(page, 'person').first().evaluate((el) => el.remove());
    near((await rect(target)).height, 30 + gap + 4 * line + gap + 2 * line, '…and as what is left', 0.1);
    // Nothing was restarted, and the one that was added is in step with the others.
    // "In step" is to within a step of the engine's clock, not to the last digit. The added placeholder is given the
    // beginning that was READ from the others, and an engine does not report a written start as it was written: Firefox
    // reports times in steps of 0.02 ms and reads about one written value in eight a step lower (176.08 comes back as
    // 176.06; any animation on any page does it), and Chromium now and then returns a written value with the last
    // binary digit changed. A twentieth of a millisecond is under any frame and over either.
    const STEP = 0.05;
    await expect.poll(async () => Math.abs(((await animations(target.locator('#added')))[0]?.start ?? Number.NaN) - start!)).toBeLessThanOrEqual(STEP);
    for (const item of await placeholders(page, 'person').all()) {
      const running = await animations(item);
      expect(running.map((a) => [a.name, a.state])).toEqual([['tanrei-skeleton-pulse', 'running']]);
      near(running[0].start!, start!, 'nothing restarted, and in step', STEP);
    }
    expect(await target.evaluate((el) => [el.hasAttribute('data-waiting'), el.getAttribute('role'), getComputedStyle(el).transitionProperty])).toEqual([false, 'progressbar', 'none']);
    // A change while it waits does not end the wait, and it does not hide or remove itself: no property, no method.
    await page.evaluate(() => document.querySelector('.stage')!.insertAdjacentHTML('beforeend', `<tanrei-skeleton id="waits" label="Loading" show-delay="60000"><span class="tanrei-skeleton-placeholder"></span></tanrei-skeleton>`));
    const waits = page.locator('#waits');
    await waits.evaluate((el) => { (el as HTMLElement & { label: string }).label = 'Still loading'; el.firstElementChild!.setAttribute('data-lines', '3'); });
    await frames(page, 3);
    expect(await waits.evaluate((el) => [el.hasAttribute('data-waiting'), el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual([true, null, null]);
    near((await rect(waits)).height, 3 * line, 'the box follows while it waits', 0.05);
    expect(await page.evaluate(() => Object.keys((customElements.get('tanrei-skeleton') as unknown as { properties: object }).properties))).toEqual(['label', 'decorative', 'showDelay']);
  });

  test('SKL-25 a shape the spec does not have is drawn as text; lines less than 1 or no number is 1, and a number that is not whole the whole number below; a size that is negative or no size is none; more lines than the stylesheet reads are drawn by the element; each is reported in a debug build', async ({ page }) => {
    const seen = warnings(page);
    const odd = `${ph('id="shape" data-shape="star" data-lines="2"')}${ph('id="zero" data-lines="0"')}${ph('id="minus" data-lines="-3"')}${ph('id="word" data-lines="many"')}${ph('id="part" data-lines="2.7"')}${ph('id="thirty" data-lines="30"')}
      ${ph('id="narrow" data-shape="block" style="inline-size: -40px; block-size: 20px"')}${ph('id="tall" data-shape="block" style="block-size: tall"')}${ph('id="fine" data-lines="3" style="inline-size: 50%"')}`;
    await mount(page, [fx('odd', { label: 'Loading', showDelay: 0 }, odd)], { reducedMotion: true });
    const target = host(page, 'odd');
    const fill = await resolveColor(page, T('placeholder-color'));
    const line = (await rect(target.locator('#zero'))).height;
    const height = async (id: string) => (await rect(target.locator(id))).height;
    // An unknown shape: text, with its lines.
    near(await height('#shape'), 2 * line, 'an unknown shape is text', 0.05);
    expect((await painted(target.locator('#shape'), fill)).column(20).length).toBe(2);
    for (const id of ['#zero', '#minus', '#word']) near(await height(id), line, `${id}: one line`, 0.05);
    near(await height('#part'), 2 * line, '2.7 lines: two', 0.05);
    expect((await painted(target.locator('#part'), fill)).column(20).length).toBe(2);
    // Thirty lines: more than the stylesheet holds, drawn by the element's rule — thirty bars, the last short.
    near(await height('#thirty'), 30 * line, 'thirty lines', 0.2);
    const thirty = await painted(target.locator('#thirty'), fill);
    expect([thirty.column(20).length, thirty.column(290).length]).toEqual([30, 29]);
    // A size that is no size is none: its place wide, one line box high.
    expect([(await rect(target.locator('#narrow'))).width, (await rect(target.locator('#narrow'))).height]).toEqual([300, 20]);
    near(await height('#tall'), line, 'no block size: one line box', 0.05);
    expect((await rect(target.locator('#fine'))).width).toBe(150);
    const reports = seen.filter((text) => text.includes('SKL-25'));
    for (const said of ['data-shape "star"', 'data-lines "0"', 'data-lines "-3"', 'data-lines "many"', 'data-lines "2.7"', 'inline-size "-40px"', 'block-size "tall"']) expect(reports.filter((text) => text.includes(said)).length, said).toBe(1);
    expect(reports.length).toBe(7);
    // A manner the skeleton does not know: it pulses, and says so.
    await mount(page, of('text'), { reducedMotion: false, system: 'acme-skeleton', systemCss: `[data-tanrei-system='acme-skeleton'] { ${T('motion-animation')}: shimmer; }` });
    expect((await animations(placeholders(page, 'text').first())).map((a) => a.name)).toEqual(['tanrei-skeleton-pulse']);
    expect(seen.filter((text) => text.includes('SKL-25') && text.includes('"shimmer"')).length).toBe(1);
  });

  test('SKL-26 a skeleton that holds no placeholder draws nothing, takes no space and exposes nothing — before any script too — and a debug build says so; given a placeholder it is a skeleton at once', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mount(page, [fx('empty', { label: 'Loading', showDelay: 0 }), fx('no-shapes', { label: 'Loading', showDelay: 0 }, '<p>Words, and no placeholder</p>')]);
    for (const id of ['empty', 'no-shapes']) {
      expect(await host(page, id).evaluate((el) => [getComputedStyle(el).display, el.getClientRects().length, el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-busy')]), id).toEqual(['none', 0, null, null, null]);
    }
    expect(seen.filter((text) => text.includes('SKL-26')).length).toBe(2);
    if (browserName === 'chromium') expect(await progressbars(page)).toEqual([]);
    // Given a placeholder: drawn and exposed at once.
    await host(page, 'empty').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span class="tanrei-skeleton-placeholder"></span>'));
    await expect(host(page, 'empty')).toHaveAttribute('role', 'progressbar');
    expect((await rect(host(page, 'empty'))).height).toBeGreaterThan(10);
    // …and without it again, nothing.
    await host(page, 'empty').evaluate((el) => el.replaceChildren());
    await expect(host(page, 'empty')).not.toHaveAttribute('role', 'progressbar');
    expect(await css(host(page, 'empty'), 'display')).toBe('none');
    // Before any script.
    await page.setContent(bare('<tanrei-skeleton id="empty" show-delay="0"></tanrei-skeleton><tanrei-skeleton id="held" show-delay="0"><span class="tanrei-skeleton-placeholder"></span></tanrei-skeleton>'));
    expect(await page.evaluate(() => ['empty', 'held'].map((id) => getComputedStyle(document.getElementById(id)!).display))).toEqual(['none', 'block']);
  });

  test('a page that is right before its script runs: the role, the busy state and the name it wrote itself are left as they are found, and the class alone — outside any skeleton — is the same placeholder', async ({ page, browserName }) => {
    await page.setContent(bare(`<main style="inline-size: 300px"><tanrei-skeleton id="written" show-delay="0" role="progressbar" aria-busy="true" aria-label="Loading the page">${ph('data-lines="2"')}</tanrei-skeleton><p id="alone" style="margin: 0">${ph('data-lines="2"')}</p></main>`));
    const written = page.locator('#written');
    const before = await written.evaluate((el) => el.outerHTML.length);
    if (browserName === 'chromium') expect((await progressbars(page)).map((node) => [node.name, node.busy])).toEqual([['Loading the page', true]]);
    // The class alone: the same box, the same bars.
    const fill = await resolveColor(page, T('placeholder-color'));
    expect((await rect(page.locator(`#alone > ${PH}`))).height).toBe((await rect(written.locator(PH))).height);
    expect((await painted(page.locator(`#alone > ${PH}`), fill)).column(20).length).toBe(2);
    await define(page);
    await written.evaluate((el) => ((el as HTMLElement & { label: string }).label = 'Another name'));
    await frames(page);
    expect(await written.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-busy'), el.getAttribute('aria-label')])).toEqual(['progressbar', 'true', 'Loading the page']);
    expect(await written.evaluate((el) => el.outerHTML.length)).toBeGreaterThan(before);
    // What it holds is inert once the element is there.
    expect(await written.evaluate((el) => [...el.children].every((child) => child.hasAttribute('inert')))).toBe(true);
    if (browserName === 'chromium') expect((await progressbars(page)).map((node) => [node.name, node.busy, node.under])).toEqual([['Loading the page', true, 0]]);
  });

  test('inside another component’s shadow root, with no stylesheet of the page: the element brings its own, and the skeleton is drawn there', async ({ page }) => {
    await mount(page, of('text'));
    const seen = await page.evaluate(async () => {
      const outer = document.createElement('div');
      const root = outer.attachShadow({ mode: 'open' });
      root.innerHTML = '<div style="inline-size: 200px; font: 14px/22px sans-serif"><tanrei-skeleton label="Loading" show-delay="0"><span class="tanrei-skeleton-placeholder" data-lines="3"></span></tanrei-skeleton></div>';
      document.body.append(outer);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const el = root.querySelector('tanrei-skeleton')!;
      const item = el.firstElementChild!;
      return [getComputedStyle(el).display, item.getBoundingClientRect().height, getComputedStyle(item, '::before').height, el.getAttribute('role')];
    });
    expect(seen).toEqual(['block', 66, '14px', 'progressbar']);
  });

  test('no axe violations in light and dark, every fixture mounted', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      await expect.poll(() => shown(host(page, 'waiting'))).toBe(true);
      expect(await page.locator(`.stage > ${TAG}`).count()).toBe(spec.fixtures.length);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('no axe violations for a skeleton in a product’s own layout, a decorative one beside a loading indicator, a nested one, and one named by the product’s words', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(
        page,
        [
          fx('layout', { label: 'Loading the author', showDelay: 0 }, `<div style="display: flex; gap: 12px">${ph('data-shape="circle" style="block-size: 40px"')}<div style="flex: 1"><p>${ph('style="inline-size: 10rem"')}</p><p>${ph('data-lines="2"')}</p></div></div>`),
          fx('beside', { decorative: true, showDelay: 0 }, ph('data-lines="3"')),
          fx('nested', { label: 'Loading the page', showDelay: 0 }, `${ph()}<tanrei-skeleton show-delay="0">${ph('data-lines="2"')}</tanrei-skeleton>`),
          fx('words', { showDelay: 0 }, ph()),
        ],
        { theme },
      );
      await setWords(page, { loadingLabel: 'Loading' });
      await expect(host(page, 'words')).toHaveAttribute('aria-label', 'Loading');
      await page.evaluate(() => document.querySelector('[data-fixture="beside"]')!.insertAdjacentHTML('afterbegin', '<tanrei-loading-indicator label="Loading the results" show-delay="0"></tanrei-loading-indicator>'));
      await expect(page.locator('tanrei-loading-indicator')).toHaveAttribute('role', 'progressbar');
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec);
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
