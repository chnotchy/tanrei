// The cloak (`@tanrei/web/cloak.css`, src/styles/cloak.css): a page whose elements are defined late shows none of them
// unstyled and does not move when they are defined, with the cloak; without it, nothing changes.
//
// "Late" is an amount of layout, not a time. Every page is written as a server sends it — its stylesheets and its
// elements, and no script — and two frames are drawn before the bundle runs, so the first frames are always the page
// before any element is defined, which is what a reader on a slow line sees, however fast the machine is. Then the
// bundle runs, every element of the page is defined, and the page is read again once three frames running have drawn
// it the same. What moved in between is read twice:
// - as boxes, in every engine: each held element's height and the height of its fixture's stage, so that nothing below
//   a fixture moves;
// - as Chromium's own measure of it, the sum of every `layout-shift` entry recorded meanwhile (the Layout Instability
//   API; the other engines have none). Core Web Vitals calls a page's CLS good under 0.1; a page here is held to 0.01.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { fixturesDocument, loadSpec } from '../test/harness.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = (file: string) => fs.readFileSync(path.join(here, '../dist', file), 'utf8');

/** A page's budget of layout shift, as Chromium measures it: a tenth of what Core Web Vitals calls good. */
const SHIFT_BUDGET = 0.01;

/**
 * The elements a rule of the cloak gives `declaration` — read from the built stylesheet, so a component it starts
 * holding, or takes out of the page, is tested here without anyone editing a list.
 */
function tagsWith(declaration: RegExp): string[] {
  const css = dist('cloak.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const tags = new Set<string>();
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!declaration.test(body!)) continue;
    for (const [tag] of selector!.matchAll(/tanrei-[a-z-]+/g)) if (tag !== 'tanrei-tab') tags.add(tag);
  }
  return [...tags].sort();
}

/**
 * The fixtures whose element the cloak holds lower than it will be drawn, by spec, with why: the cloak holds a
 * control's one row, and these grow past it by what they draw once they are defined. None is held higher than it will
 * be (the test asks that of them), so what is below one moves down, never up. The list only shrinks.
 */
const GROWS: Record<string, { grows: (props: Record<string, unknown>) => boolean; why: string }> = {
  combobox: { grows: (props) => props.selection === 'multiple', why: 'a combobox of several values draws them as chips, on as many rows as they need' },
  'text-input': { grows: (props) => !!props.multiline, why: 'a multiline input is as tall as its rows' },
};

/** The page as a server sends it: `markup` with no script, and the cloak's stylesheet when `cloak` is set; the scripts it held back. */
function withoutScripts(markup: string, cloak: boolean): { page: string; scripts: string[] } {
  const at = markup.indexOf('<script type="module">');
  const scripts = [...markup.slice(at).matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((match) => match[1]!);
  const head = cloak ? `<style>${dist('cloak.css')}</style></head>` : '</head>';
  return { page: `${markup.slice(0, at).replace('</head>', head)}<p id="after">After the fixtures.</p></body></html>`, scripts };
}

/** Runs in the page: resolves after `n` frames have been drawn. */
const frames = (page: Page, n: number) =>
  page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
        step(count);
      }),
    n,
  );

/** Starts the sum of Chromium's layout-shift entries (`window.__shift`), and the list of what moved (`window.__moved`). */
async function observeShifts(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __shift: number; __moved: string[] };
    w.__shift = 0;
    w.__moved = [];
    type Source = { node: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly };
    const rect = (r: DOMRectReadOnly) => `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}×${Math.round(r.height)}`;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { hadRecentInput: boolean; value: number; sources: Source[] }[]) {
        if (entry.hadRecentInput) continue;
        w.__shift += entry.value;
        for (const source of entry.sources) w.__moved.push(`${entry.value.toFixed(4)} ${source.node?.nodeName ?? '?'} ${(source.node as Element | null)?.id ?? ''}: ${rect(source.previousRect)} → ${rect(source.currentRect)}`);
      }
    }).observe({ type: 'layout-shift', buffered: false });
  });
}

/** The sum `observeShifts()` started, and each box that moved (its entry's value, the node, its rectangles before and after). */
const shifts = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __shift: number; __moved: string[] };
    return { sum: w.__shift, moved: w.__moved.join('\n') };
  });

/**
 * Runs the scripts held back, then waits until every element of the page is defined, its faces are loaded and three
 * frames running have drawn the same `read`.
 */
async function define<T>(page: Page, scripts: string[], read: () => Promise<T>): Promise<T> {
  for (const content of scripts) await page.addScriptTag({ type: 'module', content });
  await page.evaluate(() => Promise.all([...new Set([...document.querySelectorAll('*')].map((el) => el.localName).filter((name) => name.startsWith('tanrei-')))].map((name) => customElements.whenDefined(name))));
  await page.evaluate(() => document.fonts.ready);
  let last = '';
  let same = 0;
  for (let frame = 0; frame < 120 && same < 3; frame++) {
    await frames(page, 1);
    const now = JSON.stringify(await read());
    same = now === last ? same + 1 : 0;
    last = now;
  }
  return read();
}

/**
 * Runs in the page: each fixture's element (by the spec's tag) — its height, its visibility, whether a rule holds its
 * height (a `min-block-size` that is not `0px`) — and its stage's height.
 */
function stages(tag: string) {
  return [...document.querySelectorAll('[data-fixture]')].map((stage) => {
    const element = stage.querySelector(tag);
    const style = element ? getComputedStyle(element) : undefined;
    return {
      id: stage.getAttribute('data-fixture')!,
      stage: stage.getBoundingClientRect().height,
      height: element?.getBoundingClientRect().height ?? 0,
      visibility: style?.visibility ?? '',
      held: !!style && !['0px', 'auto'].includes(style.minBlockSize),
    };
  });
}

/**
 * A spec's fixtures written with the cloak and no script, read in their first frames (`before`), then defined and read
 * again (`after`). In a new window: one that has run the bundle keeps its elements defined, whatever document is
 * written into it. Chromium's layout shifts are summed from just before the script runs.
 */
async function mountedLate(first: Page, tag: string, browserName: string) {
  const spec = loadSpec(tag.replace(/^tanrei-/, ''));
  const page = await first.context().newPage();
  const { page: markup, scripts } = withoutScripts(await fixturesDocument(spec, { icons: true }), true);
  await page.setContent(markup);
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 2);
  expect(await page.evaluate((t) => !!customElements.get(t), tag)).toBe(false);
  const before = await page.evaluate(stages, tag);
  expect(before.length).toBe(spec.fixtures.length);
  if (browserName === 'chromium') await observeShifts(page);
  const after = await define(page, scripts, () => page.evaluate(stages, tag));
  return { spec, page, before, after };
}

test.describe('an element whose surface is in the top layer takes no room before it is defined, as after', () => {
  const tags = tagsWith(/display: none/);
  test('the cloak takes the overlays out of the page', () => {
    expect(tags).toEqual(['tanrei-date-time-picker', 'tanrei-dialog', 'tanrei-image-preview', 'tanrei-modal-layer', 'tanrei-popover']);
  });

  for (const tag of tags) {
    test(`${tag.replace(/^tanrei-/, '')}: with the cloak and no script, no fixture's stage is higher or lower than once it is defined`, async ({ page: first, browserName }) => {
      const { page, before, after } = await mountedLate(first, tag, browserName);
      expect(before.map((stage) => `${stage.id} ${Math.round(stage.stage)}px`)).toEqual(after.map((stage) => `${stage.id} ${Math.round(stage.stage)}px`));
      if (browserName === 'chromium') {
        const { sum, moved } = await shifts(page);
        expect(sum, moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      }
      await page.close();
    });
  }
});

test.describe('the cloak holds every control it names at the height it will be drawn', () => {
  const tags = tagsWith(/min-block-size:/);
  test('it holds the controls whose height is a token of their own', () => {
    // The list the tests below go through: a rule of the stylesheet that no longer holds anything would shrink it.
    expect(tags.length).toBeGreaterThan(20);
    for (const tag of ['tanrei-button', 'tanrei-checkbox', 'tanrei-text-input', 'tanrei-select', 'tanrei-tabs']) expect(tags).toContain(tag);
  });

  for (const tag of tags) {
    const name = tag.replace(/^tanrei-/, '');
    test(`${name}: with the cloak and no script, every fixture is hidden and as high as once it is defined, and nothing below it moves`, async ({ page: first, browserName }) => {
      const { spec, page, before, after } = await mountedLate(first, tag, browserName);
      // Nothing of it is painted before it is defined, and all of it after.
      expect(before.filter((stage) => stage.visibility !== 'hidden').map((stage) => stage.id)).toEqual([]);
      expect(after.filter((stage) => stage.visibility !== 'visible').map((stage) => stage.id)).toEqual([]);
      // Each fixture the cloak holds is as high as it will be (within a device pixel's rounding) and so is its stage,
      // so nothing below it moves; one that grows by what it draws is held no higher than it will be. One it does not
      // hold (a vertical slider, a key drawn as plain text, an open search) is left as it is.
      const props = new Map(spec.fixtures.map((fixture) => [fixture.id, (fixture.props ?? {}) as Record<string, unknown>]));
      const grows = (id: string) => !!GROWS[name]?.grows(props.get(id) ?? {});
      const wrong = before.flatMap((stage, i) => {
        const drawn = after[i]!;
        if (!stage.held) return [];
        if (grows(stage.id) ? stage.height <= drawn.height + 0.5 : Math.abs(stage.height - drawn.height) <= 0.5 && Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
        return [`${stage.id}: held ${stage.height}px in a stage of ${stage.stage}px, drawn ${drawn.height}px in ${drawn.stage}px${grows(stage.id) ? ` (it grows: ${GROWS[name]!.why})` : ''}`];
      });
      expect(wrong).toEqual([]);
      expect(before.filter((stage) => stage.held).length, 'the cloak holds some of the fixtures').toBeGreaterThan(0);
      // Chromium's own measure, for a spec whose every fixture is held as it will be drawn: within the budget.
      if (browserName === 'chromium' && before.every((stage) => stage.held && !grows(stage.id))) {
        const { sum, moved } = await shifts(page);
        expect(sum, moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      }
      await page.close();
    });
  }
});

/**
 * A page of a product's: a heading and a paragraph, then a form and a toolbar of the controls a page is most often
 * made of, then text below them. The controls that stand side by side are in rows of their own, as a product lays out
 * a toolbar or a set of choices (a flex row with a gap): the cloak holds a control's height and not its width, so in
 * a line of running text, the words after a control would move sideways when it is defined.
 */
const ROW = 'display: flex; flex-wrap: wrap; align-items: center; gap: var(--tanrei-sys-space-space100); margin-block: var(--tanrei-sys-space-space200)';
const PRODUCT_PAGE = `
  <h1>Settings</h1>
  <p>Choose how the project is built and who is told when it is.</p>
  <tanrei-tabs value="general" label="Sections">
    <tanrei-tab value="general" label="General"></tanrei-tab>
    <tanrei-tab value="members" label="Members"></tanrei-tab>
    <tanrei-tab value="billing" label="Billing"></tanrei-tab>
  </tanrei-tabs>
  <tanrei-text-input label="Project name" value="Tanrei"></tanrei-text-input>
  <tanrei-select label="Region" value="eu">
    <tanrei-option value="eu" label="Europe"></tanrei-option>
    <tanrei-option value="us" label="United States"></tanrei-option>
  </tanrei-select>
  <div style="${ROW}">
    <tanrei-checkbox label="Build on every push" selected></tanrei-checkbox>
    <tanrei-switch label="Notify the team"></tanrei-switch>
  </div>
  <div style="${ROW}">
    <tanrei-chip label="Linux"></tanrei-chip>
    <tanrei-chip label="macOS"></tanrei-chip>
    <tanrei-tag label="Beta"></tanrei-tag>
  </div>
  <div style="${ROW}">
    <tanrei-button variant="filled">Save</tanrei-button>
    <tanrei-button variant="outlined">Cancel</tanrei-button>
    <tanrei-button-with-menu label="More"></tanrei-button-with-menu>
  </div>
  <tanrei-pagination label="Pages" page="2" count="5"></tanrei-pagination>
  <p id="below">Changes are saved for everyone in the project. A build that is running finishes with the settings it started with.</p>
`;

/** Runs in the page: every Tanrei element's box and visibility, and the paragraph below them. */
function productPage() {
  return {
    elements: [...document.querySelectorAll('#product *')]
      .filter((el) => el.localName.startsWith('tanrei-') && el.localName !== 'tanrei-tab' && el.localName !== 'tanrei-option')
      .map((el) => ({ tag: el.localName, height: el.getBoundingClientRect().height, visibility: getComputedStyle(el).visibility })),
    below: document.getElementById('below')!.getBoundingClientRect().top,
  };
}

test.describe('a page whose elements are defined late', () => {
  for (const cloak of [true, false]) {
    test(`${cloak ? 'with' : 'without'} the cloak: ${cloak ? 'nothing unstyled is painted, and the text below the controls stays where it is' : 'the elements are shown as the browser draws unknown elements, as before the cloak — it is opted into, never loaded for a page'}`, async ({ page: first, browserName }) => {
      const page = await first.context().newPage();
      await page.setViewportSize({ width: 800, height: 900 });
      // The page before the fixtures' document's (empty) stages: that document's tokens and faces, and no fixture.
      const markup = await fixturesDocument(loadSpec('button'), { fixtures: [], icons: true, lead: `<div id="product">${PRODUCT_PAGE}</div>` });
      const { page: html, scripts } = withoutScripts(markup, cloak);
      await page.setContent(html.replace('<body>', '<body style="font: var(--tanrei-sys-typescale-body-font); margin: 16px">'));
      await page.evaluate(() => document.fonts.ready);
      await frames(page, 2);
      const before = await page.evaluate(productPage);
      expect(before.elements.length).toBe(12);
      if (browserName === 'chromium') await observeShifts(page);
      const after = await define(page, scripts, () => page.evaluate(productPage));
      const shift = browserName === 'chromium' ? await shifts(page) : undefined;
      if (shift) test.info().annotations.push({ type: 'layout shift', description: shift.sum.toFixed(4) });
      if (cloak) {
        expect(before.elements.filter((element) => element.visibility !== 'hidden').map((element) => element.tag)).toEqual([]);
        expect(after.elements.filter((element) => element.visibility !== 'visible').map((element) => element.tag)).toEqual([]);
        // Every control on it is held at the height it will be drawn, so the text below it stays where it is.
        const heights = (elements: typeof before.elements) => elements.map((element) => `${element.tag} ${Math.round(element.height)}px`);
        expect(heights(before.elements)).toEqual(heights(after.elements));
        expect(Math.round(after.below)).toBe(Math.round(before.below));
        if (shift) expect(shift.sum, shift.moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      } else {
        // Without it, every element is painted from the first frame, laid out as an unknown element — the page moves
        // when they are defined, which is what the cloak is for.
        expect(before.elements.filter((element) => element.visibility !== 'visible').map((element) => element.tag)).toEqual([]);
        expect(after.below).not.toBe(before.below);
        if (shift) expect(shift.sum, shift.moved).toBeGreaterThan(SHIFT_BUDGET);
      }
      await page.close();
    });
  }

  test('the cloak is in no stylesheet a page loads by default: with tanrei.css, an element that is not defined is painted', async ({ page }) => {
    await page.setContent(`<!doctype html><html><head><style>${dist('tanrei.css')}</style></head><body><tanrei-button>Save</tanrei-button><tanrei-checkbox label="Build"></tanrei-checkbox></body></html>`);
    expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-button, tanrei-checkbox')].map((el) => [getComputedStyle(el).visibility, getComputedStyle(el).display]))).toEqual([
      ['visible', 'inline'],
      ['visible', 'inline'],
    ]);
  });
});
