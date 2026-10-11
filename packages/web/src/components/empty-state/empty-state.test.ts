// <tanrei-empty-state>, driven by specs/empty-state.spec.json: every behaviour id (EMP-1…18) is cited by a test title,
// every fixture has a baseline, and every length and color is read back from the tokens — never from a number written
// here, except where the spec's own verify names one.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveToken, tab } from '../../../test/harness.js';

const spec = loadSpec('empty-state');
type P = Page;
const TAG = 'tanrei-empty-state';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = (file: string) => fs.readFileSync(path.join(pkg, 'dist', file), 'utf8');

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
/** A part of the empty state's own shadow root: a Button in the actions slot has parts of its own, so each is named with its parent here. */
const OWN: Record<string, string> = {
  '.container': '.container:has(> .text)',
  '.media': '.container > .media',
  '.text': '.container > .text',
  '.title': '.text > .title',
  '.headline': '.text > .title > .headline',
  '.description': '.text > .description',
  '.actions': '.container > .actions',
  '.announce': '.container > .announce',
};
const part = (page: P, id: string, selector: string) => host(page, id).locator(OWN[selector] ?? selector);
const actions = (page: P, id: string) => host(page, id).locator('> [slot="actions"]');
const T = (name: string) => `--tanrei-comp-empty-state-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const fx = (id: string, props: Fixture['props'], content?: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, ...(content === undefined ? {} : { content }), ...extra });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const of = (...ids: string[]) => ids.map((id) => spec.fixtures.find((f) => f.id === id)!);
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
/** Gives stages a width of their own (the harness's is 480): the region the empty state stands in. */
const widths = (page: P, by: Record<string, number>) =>
  page.addStyleTag({
    content: Object.entries(by)
      .map(([id, width]) => `.stage[data-fixture="${id}"] { inline-size: ${width}px !important; }`)
      .join('\n'),
  });

/** A CSS color expression as the browser draws it: [r, g, b, a] with the channels in 0–255. */
const colorOf = (page: P, expression: string) =>
  page.evaluate((e) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;color:${e}`;
    document.body.append(probe);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.fillStyle = getComputedStyle(probe).color;
    context.fillRect(0, 0, 1, 1);
    probe.remove();
    return [...context.getImageData(0, 0, 1, 1).data];
  }, expression);
const painted = (locator: Locator, property: string) =>
  locator.evaluate((el, p) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.fillStyle = getComputedStyle(el).getPropertyValue(p);
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  }, property);
const sameColor = (actual: number[], expected: number[], message = '') => {
  for (let i = 0; i < 4; i++) expect(Math.abs(actual[i] - expected[i]), `${message}: ${actual.join(',')} ≈ ${expected.join(',')}`).toBeLessThanOrEqual(2);
};
const tokenColor = (page: P, name: string) => colorOf(page, `var(${T(name)})`);
/** What a text role resolves to, read from a probe that is given its `font` and `letter-spacing`. */
const role = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;font:var(${n}-font);letter-spacing:var(${n}-letter-spacing)`;
    document.body.append(probe);
    const s = getComputedStyle(probe);
    const out = { fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight, letterSpacing: s.letterSpacing, fontFamily: s.fontFamily.replaceAll('"', '') };
    probe.remove();
    return out;
  }, T(name));
const textStyle = (locator: Locator) =>
  locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return { fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight, letterSpacing: s.letterSpacing, fontFamily: s.fontFamily.replaceAll('"', '') };
  });
/** The boxes of the lines of the text an element holds (a slot: what is assigned to it). */
const lines = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    const nodes = el instanceof HTMLSlotElement ? el.assignedNodes({ flatten: true }) : [el];
    // One box per line: the runs that share a vertical band (a line of two scripts, or of two directions, is several runs).
    const rects: { left: number; right: number; top: number; bottom: number }[] = [];
    for (const node of nodes) {
      range.selectNodeContents(node);
      for (const r of [...range.getClientRects()].filter((rect) => rect.width > 0).sort((a, b) => a.top - b.top)) {
        const at = (r.top + r.bottom) / 2;
        const line = rects.find((l) => at >= l.top && at <= l.bottom);
        if (line) [line.left, line.right] = [Math.min(line.left, r.left), Math.max(line.right, r.right)];
        else rects.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      }
    }
    return rects;
  });
/** How many lines those boxes are. */
const lineCount = (rects: unknown[]) => rects.length;
const middle = (b: { x: number; width: number }) => b.x + b.width / 2;
/** The deepest focused element, as `tag#id` through the shadow roots it is in. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    const owner = active?.getRootNode() instanceof ShadowRoot ? ((active.getRootNode() as ShadowRoot).host as Element) : active;
    return owner ? `${owner.localName}${owner.id ? `#${owner.id}` : ''}` : '';
  });
/** What the live region holds: the runs it was given, in order; null where there is no region. */
const announced = (locator: Locator) => locator.evaluate((el) => (el.shadowRoot!.querySelector('.announce') ? [...el.shadowRoot!.querySelectorAll('.announce > div')].map((run) => run.textContent ?? '') : null));
const PICTURE = (width: number, height: number, attributes = '') =>
  `<img slot="media" alt="" ${attributes} width="${width}" height="${height}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect width='${width}' height='${height}' fill='teal'/%3E%3C/svg%3E">`;
const TEXT = 'A project keeps the layers, the exports and the people of one design system together.';

test.describe('behavior', () => {
  test('EMP-1: a block as wide as its region and as tall as its content and its padding — one column in the order media, title, description, actions, padded by the block padding of its size and by padding-inline — with no fill, no edge, no elevation, no outer space, no height of its own and nothing that scrolls', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1300, height: 900 });
    await mount(page, [...of('title', 'actions', 'large', 'large-title', 'start'), fx('narrow', { title: 'No projects yet' }), fx('wide', { title: 'No projects yet' })]);
    await widths(page, { narrow: 232, wide: 1232 });
    const [padMedium, padLarge, padInline] = [await token(page, 'container-padding-block-medium'), await token(page, 'container-padding-block-large'), await token(page, 'container-padding-inline')];
    const titleLine = Number.parseFloat((await role(page, 'title-typescale-medium')).lineHeight);
    // The verify: a medium empty state with a title alone is 32 + 24 + 32 = 88 high, in a region of any width.
    for (const [id, width] of [['title', 480], ['narrow', 232], ['wide', 1232]] as const) {
      const b = await box(host(page, id));
      near(b.height, 2 * padMedium + titleLine, `${id}: its paddings and one line`);
      expect(b.height, id).toBe(88);
      near(b.width, width - 32, `${id}: the whole inline size of its region`);
    }
    near((await box(host(page, 'large-title'))).height, 2 * padLarge + Number.parseFloat((await role(page, 'title-typescale-large')).lineHeight), 'large: its own block padding');
    // One column, in order, padded above the first part and below the last.
    for (const [id, pad] of [['actions', padMedium], ['large', padLarge]] as const) {
      const h = await box(host(page, id));
      const [media, title, description, row] = [await box(part(page, id, '.media')), await box(part(page, id, '.title')), await box(part(page, id, '.description')), await box(part(page, id, '.actions'))];
      near(media.y - h.y, pad, `${id}: the padding above the first part`);
      near(h.y + h.height - (row.y + row.height), pad, `${id}: the padding below the last part`);
      expect(media.y + media.height, id).toBeLessThanOrEqual(title.y + 0.5);
      expect(title.y + title.height, id).toBeLessThanOrEqual(description.y + 0.5);
      expect(description.y + description.height, id).toBeLessThanOrEqual(row.y + 0.5);
    }
    // The inline padding, at the start and at the end.
    const start = await box(host(page, 'start'));
    near((await box(part(page, 'start', '.media'))).x - start.x, padInline, 'the padding at the start');
    expect(await css(part(page, 'start', '.container'), 'padding-inline-end')).toBe(`${padInline}px`);
    // No fill, no edge, no elevation, no outer space, no height of its own, nothing that scrolls.
    for (const target of [host(page, 'actions'), part(page, 'actions', '.container')]) {
      expect((await painted(target, 'background-color'))[3]).toBe(0);
      expect(await css(target, 'border-top-width')).toBe('0px');
      expect(await css(target, 'box-shadow')).toBe('none');
      expect(await css(target, 'outline-style')).toBe('none');
      expect(await css(target, 'margin')).toBe('0px');
      expect([await css(target, 'max-height'), await css(target, 'overflow-x'), await css(target, 'overflow-y')]).toEqual(['none', 'visible', 'visible']);
      expect(['0px', 'auto']).toContain(await css(target, 'min-height'));
    }
    // A taller region does not stretch it: placing the block is the region's.
    await page.addStyleTag({ content: '.stage[data-fixture="title"] { block-size: 400px; }' });
    expect((await box(host(page, 'title'))).height).toBe(88);
  });

  test('EMP-2: centred, every part is centred in the container and the lines of the text are centred; at the start, every part stands at the start edge inside the inline padding with its lines aligned there; the title and the description are no wider than content.measure times the description’s font size, nor than the container less its padding', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1300, height: 900 });
    const long = of('long-text')[0];
    await mount(page, [...of('actions', 'start', 'large', 'long-text'), { ...long, id: 'long-wide' }, { ...long, id: 'long-wide-large', props: { ...long.props, size: 'large' } }, { ...long, id: 'long-narrow' }, { ...long, id: 'long-start', props: { ...long.props, align: 'start' } }]);
    await widths(page, { 'long-wide': 1232, 'long-wide-large': 1232, 'long-narrow': 232, 'long-start': 1232 });
    const padInline = await token(page, 'container-padding-inline');
    const measure = Number.parseFloat(await page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name), T('content-measure')));
    // Centred: the middle of every part is the middle of the block, and each line of text is centred on it.
    for (const id of ['actions', 'large', 'long-wide']) {
      const centre = middle(await box(host(page, id)));
      for (const selector of ['.media', '.title', '.description', '.actions']) near(middle(await box(part(page, id, selector))), centre, `${id} ${selector} is centred`, 1);
      for (const selector of ['.headline', '.description slot']) for (const line of await lines(part(page, id, selector))) near((line.left + line.right) / 2, centre, `${id}: a line of ${selector} is centred`, 1);
    }
    // At the start: every part at the start edge, inside the inline padding, its lines aligned there.
    for (const id of ['start', 'long-start']) {
      const edge = (await box(host(page, id))).x + padInline;
      for (const selector of ['.media', '.title', '.description', '.actions']) near((await box(part(page, id, selector))).x, edge, `${id} ${selector} at the start edge`);
      for (const selector of ['.headline', '.description slot']) for (const line of await lines(part(page, id, selector))) near(line.left, edge, `${id}: a line of ${selector} starts at the edge`, 1);
    }
    // The verify: at medium the text is at most 30 × 14 = 420 wide; in a container 1200 wide a centred description
    // wraps at 420, not at 1168.
    const size = Number.parseFloat((await role(page, 'description-typescale-medium')).fontSize);
    expect(measure * size).toBe(420);
    for (const id of ['long-wide', 'long-start']) {
      near((await box(host(page, id))).width, 1200, `${id}: the container`);
      near((await box(part(page, id, '.text'))).width, measure * size, `${id}: the text is the measure wide`);
      expect((await box(part(page, id, '.title'))).width, `${id}: the title`).toBeLessThanOrEqual(measure * size + 0.5);
      expect(lineCount(await lines(part(page, id, '.description slot'))), `${id}: the description wraps`).toBeGreaterThan(2);
      for (const line of await lines(part(page, id, '.description slot'))) expect(line.right - line.left).toBeLessThanOrEqual(measure * size + 0.5);
    }
    // The measure counts the description's font size of the size.
    near((await box(part(page, 'long-wide-large', '.text'))).width, measure * Number.parseFloat((await role(page, 'description-typescale-large')).fontSize), 'large: the measure of its description’s size');
    // Never wider than the container less its inline padding.
    const narrow = await box(host(page, 'long-narrow'));
    for (const selector of ['.text', '.title', '.description']) expect((await box(part(page, 'long-narrow', selector))).width, `narrow ${selector}`).toBeLessThanOrEqual(narrow.width - 2 * padInline + 0.5);
    // The actions are not held to the measure: they have the container less its padding.
    expect(await css(part(page, 'long-wide', '.actions'), 'max-inline-size')).toBe('100%');
  });

  test('EMP-3: a glyph in the media slot is drawn first in a box of the media size of its size, in media.color, in the icon set’s unselected family and fill, with the title media.gap below it; a picture of the product’s own is drawn there at its own size, never wider than the container less its padding, its proportions kept, not colored, clipped or mirrored; the media is hidden from assistive technology, and none is drawn that was not given', async ({
    page,
  }) => {
    await mount(page, [
      ...of('media', 'large', 'title', 'start-rtl'),
      fx('picture', { title: 'No projects yet' }, `${PICTURE(120, 80)}${TEXT}`),
      fx('picture-wide', { title: 'No projects yet' }, `${PICTURE(900, 300)}${TEXT}`),
      fx('picture-rtl', { title: 'No projects yet' }, `${PICTURE(120, 80)}${TEXT}`, { direction: 'rtl' }),
      fx('view', { title: 'No projects yet' }, `<div slot="media" id="view" style="inline-size: 64px; block-size: 40px; background: teal"><span>Two words</span></div>${TEXT}`),
    ]);
    const gap = await token(page, 'media-gap');
    const [family, fill, weight] = await page.evaluate(() => ['--tanrei-sys-icon-family-unselected', '--tanrei-sys-icon-fill-unselected', '--tanrei-sys-icon-weight'].map((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim().replaceAll('"', '')));
    for (const [id, size] of [['media', 'medium'], ['large', 'large']] as const) {
      const media = part(page, id, '.media');
      await expect(media).toHaveClass(/glyph/);
      await expect.poll(() => media.getAttribute('data-drawn'), { message: `${id}: the icon set draws it` }).not.toBeNull();
      const [b, expected] = [await box(media), await token(page, `media-size-${size}`)];
      near(b.width, expected, `${id}: the box`);
      near(b.height, expected, `${id}: the box`);
      near(Number.parseFloat(await css(media, 'font-size')), expected, `${id}: the glyph's size`);
      sameColor(await painted(media, 'color'), await tokenColor(page, 'media-color'), `${id}: media.color`);
      expect((await css(media, 'font-family')).replaceAll('"', '')).toContain(family.split(',')[0].trim());
      const settings = await css(media, 'font-variation-settings');
      expect(settings).toMatch(new RegExp(`"FILL" ${fill}\\b`));
      expect(settings).toMatch(new RegExp(`"wght" ${weight}\\b`));
      // The optical size follows the box (the font clamps it to the range it covers).
      expect(await css(media, 'font-optical-sizing')).toBe('auto');
      expect(await css(media, 'transition-duration')).toBe('0s');
      // First, and the title media.gap below it.
      near((await box(part(page, id, '.title'))).y - (b.y + b.height), gap, `${id}: media.gap`);
      expect(await media.getAttribute('aria-hidden')).toBe('true');
    }
    expect(await token(page, 'media-size-large')).toBeGreaterThan(await token(page, 'media-size-medium'));
    // A picture: its own size, in the same place, untouched.
    const picture = host(page, 'picture').locator('> img');
    await expect(part(page, 'picture', '.media')).toHaveClass(/picture/);
    const p = await box(picture);
    expect([p.width, p.height]).toEqual([120, 80]);
    near(middle(p), middle(await box(host(page, 'picture'))), 'the picture is centred', 1);
    near((await box(part(page, 'picture', '.title'))).y - (p.y + p.height), gap, 'media.gap below a picture');
    expect(await css(part(page, 'picture', '.media'), 'overflow')).toBe('visible');
    expect(await css(picture, 'transform')).toBe('none');
    expect(await css(picture, 'filter')).toBe('none');
    expect(await part(page, 'picture', '.media').getAttribute('aria-hidden')).toBe('true');
    // Never wider than the container less its inline padding, its proportions kept.
    const wide = await box(host(page, 'picture-wide').locator('> img'));
    const inner = (await box(host(page, 'picture-wide'))).width - 2 * (await token(page, 'container-padding-inline'));
    near(wide.width, inner, 'a wide picture is held to the container');
    near(wide.height, inner / 3, 'its proportions are kept', 1);
    // Not mirrored in right-to-left, and never marked by the icon set's list.
    const rtl = host(page, 'picture-rtl').locator('> img');
    expect(await css(rtl, 'transform')).toBe('none');
    expect(await rtl.getAttribute('data-tanrei-mirrored')).toBeNull();
    expect(await css(part(page, 'picture-rtl', '.media'), 'transform')).toBe('none');
    // A view of the product's own keeps its size too.
    const view = await box(page.locator('#view'));
    expect([view.width, view.height]).toEqual([64, 40]);
    await expect(part(page, 'view', '.media')).toHaveClass(/picture/);
    // No media the product did not give.
    await expect(part(page, 'title', '.media')).toBeHidden();
    expect(await host(page, 'title').evaluate((el) => el.shadowRoot!.querySelector('.media')!.textContent!.trim())).toBe('');
    // Given later, it is drawn; taken away, it is gone.
    await host(page, 'title').evaluate((el) => el.insertAdjacentHTML('afterbegin', '<span slot="media">folder_open</span>'));
    await expect(part(page, 'title', '.media')).toBeVisible();
    await expect(part(page, 'title', '.media')).toHaveClass(/glyph/);
  });

  test('EMP-4: the title is drawn in the text style of its size and in title.color, wrapped and never cut; content in the title slot is drawn in its place, style and color and keeps its role and its level — a title given as text is never a heading, a heading the product gives stays one', async ({
    page,
  }) => {
    await mount(page, [
      ...of('title', 'large-title', 'title-slot', 'long-text'),
      fx('heading', { size: 'large', title: 'Not drawn' }, `<h2 slot="title" id="h">This page does not exist</h2>The address may be mistyped.`),
      fx('heading-medium', {}, `<h3 slot="title">No projects yet</h3>${TEXT}`),
      fx('rich', {}, `<p slot="title" id="rich">No results for <em>tokne</em></p>`),
    ]);
    for (const [id, size] of [['title', 'medium'], ['large-title', 'large']] as const) {
      expect(await textStyle(part(page, id, '.headline')), id).toEqual(await role(page, `title-typescale-${size}`));
      sameColor(await painted(part(page, id, '.headline'), 'color'), await tokenColor(page, 'title-color'), `${id}: title.color`);
    }
    expect(Number.parseFloat((await role(page, 'title-typescale-large')).fontSize)).toBeGreaterThan(Number.parseFloat((await role(page, 'title-typescale-medium')).fontSize));
    // Wrapped, never cut.
    const title = part(page, 'long-text', '.title');
    expect(lineCount(await lines(part(page, 'long-text', '.headline')))).toBeGreaterThan(1);
    expect([await css(title, 'overflow'), await css(title, 'text-overflow'), await css(title, 'white-space-collapse'), await css(title, '-webkit-line-clamp')]).toEqual(['visible', 'clip', 'collapse', 'none']);
    expect(await title.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await expect(part(page, 'long-text', '.headline')).toHaveText(String(of('long-text')[0].props.title));
    // A title given as text is plain text, never a heading.
    expect(await host(page, 'title').evaluate((el) => el.shadowRoot!.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]').length)).toBe(0);
    await expect(stage(page, 'title').getByRole('heading')).toHaveCount(0);
    await expect(stage(page, 'title-slot').getByRole('heading')).toHaveCount(0);
    // The slot's content in the title's place, style and color — in place of the title prop.
    for (const [id, selector, size] of [['title-slot', '> [slot="title"]', 'large'], ['heading', '#h', 'large'], ['heading-medium', '> h3', 'medium'], ['rich', '#rich', 'medium']] as const) {
      const slotted = host(page, id).locator(selector);
      expect(await textStyle(slotted), id).toEqual(await role(page, `title-typescale-${size}`));
      sameColor(await painted(slotted, 'color'), await tokenColor(page, 'title-color'), `${id}: title.color`);
      expect(await css(slotted, 'margin'), id).toBe('0px');
      expect(await part(page, id, '.headline').count(), `${id}: the prop is not drawn beside it`).toBe(0);
    }
    await expect(host(page, 'heading')).not.toContainText('Not drawn');
    near((await box(page.locator('#h'))).y, (await box(part(page, 'heading', '.title'))).y, 'the heading stands in the title’s place');
    // Its role and its level are the product's.
    await expect(stage(page, 'heading').getByRole('heading', { level: 2, name: 'This page does not exist' })).toHaveCount(1);
    await expect(stage(page, 'heading-medium').getByRole('heading', { level: 3, name: 'No projects yet' })).toHaveCount(1);
    expect(await page.locator('#h').evaluate((el) => [el.localName, el.getAttribute('role'), el.getAttribute('aria-level')])).toEqual(['h2', null, null]);
    expect(await css(page.locator('#rich em'), 'font-style')).toBe('italic');
  });

  test('EMP-5: content in the default slot is drawn as the description, title.gap below the title, in the text style of its size and in description.color, wrapped and never cut or limited to a number of lines; a link in it is the product’s own, in its own color and underlined', async ({
    page,
  }) => {
    await mount(page, [...of('description', 'large', 'long-text', 'title'), fx('link', { title: 'No results' }, 'Check the spelling, or <a id="l" class="tanrei-link" href="#x">read the guide</a>.'), fx('blocks', { title: 'No results' }, '<p id="p" style="margin: 0">A paragraph of the product’s.</p>')]);
    await page.addStyleTag({ content: dist('link.css') });
    const gap = await token(page, 'title-gap');
    for (const [id, size] of [['description', 'medium'], ['large', 'large']] as const) {
      const description = part(page, id, '.description');
      expect(await textStyle(description), id).toEqual(await role(page, `description-typescale-${size}`));
      sameColor(await painted(description, 'color'), await tokenColor(page, 'description-color'), `${id}: description.color`);
      const title = await box(part(page, id, '.title'));
      near((await box(description)).y - (title.y + title.height), gap, `${id}: title.gap`);
      await expect(host(page, id)).toContainText(TEXT);
    }
    // Text placed directly in the element, and a block of the product's, take the style and the color by inheritance.
    expect(await textStyle(page.locator('#p'))).toEqual(await role(page, 'description-typescale-medium'));
    sameColor(await painted(page.locator('#p'), 'color'), await tokenColor(page, 'description-color'));
    // Wrapped; never cut or limited to a number of lines.
    const long = part(page, 'long-text', '.description');
    expect(lineCount(await lines(part(page, 'long-text', '.description slot')))).toBeGreaterThan(3);
    expect([await css(long, 'overflow'), await css(long, 'text-overflow'), await css(long, '-webkit-line-clamp'), await css(long, 'max-height')]).toEqual(['visible', 'clip', 'none', 'none']);
    expect(await long.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await expect(host(page, 'long-text')).toContainText(String(of('long-text')[0].content));
    // A link is the product's own: its own color, underlined.
    const link = page.locator('#l');
    expect(await painted(link, 'color')).not.toEqual(await painted(part(page, 'link', '.description'), 'color'));
    expect(await css(link, 'text-decoration-line')).toBe('underline');
    // Empty draws the title alone.
    await expect(part(page, 'title', '.description')).toBeHidden();
  });

  test('EMP-6: the actions are one row actions.gap below the text, in the order given from the start, item-gap apart, centred or at the start as align says; a row that does not fit wraps with item-gap between its lines, and an action is never cut or shrunk below its own minimum; the empty state does not restyle, resize, reorder or rename them and emits no event of its own', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    const two = of('actions')[0];
    await mount(page, [two, ...of('start', 'table-no-rows'), { ...two, id: 'wrapped' }, { ...two, id: 'wrapped-start', props: { ...two.props, align: 'start' } }, fx('no-text-above', { title: 'No projects yet' }, undefined, { slots: { actions: ['New project'] } })]);
    await widths(page, { wrapped: 232, 'wrapped-start': 232 });
    // A Button of the product's, outside any empty state: what an action is by itself.
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div class="stage" id="alone"><tanrei-button variant="text">New project</tanrei-button></div>'));
    const [gap, itemGap, padInline] = [await token(page, 'actions-gap'), await token(page, 'actions-item-gap'), await token(page, 'container-padding-inline')];
    const alone = await box(page.locator('#alone > tanrei-button'));
    for (const id of ['actions', 'start']) {
      const [first, second] = [await box(actions(page, id).nth(0)), await box(actions(page, id).nth(1))];
      const text = await box(part(page, id, '.text'));
      near(first.y - (text.y + text.height), gap, `${id}: actions.gap below the text`);
      // One row, in the order given from the start, item-gap apart.
      near(first.y, second.y, `${id}: one row`);
      near(second.x - (first.x + first.width), itemGap, `${id}: item-gap`);
      expect(await actions(page, id).allTextContents()).toEqual(['New project', 'Import a layer']);
      // Not restyled or resized: the first action is exactly the Button it is alone.
      near(first.width, alone.width, `${id}: the action keeps its own width`, 0.01);
      near(first.height, alone.height, `${id}: the action keeps its own height`, 0.01);
      const h = await box(host(page, id));
      if (id === 'actions') near((first.x + second.x + second.width) / 2, middle(h), 'the row is centred', 1);
      else near(first.x, h.x + padInline, 'the row starts at the start edge');
    }
    near((await box(actions(page, 'no-text-above').nth(0))).y - (await box(part(page, 'no-text-above', '.text'))).y - (await box(part(page, 'no-text-above', '.text'))).height, gap, 'a title alone: actions.gap');
    near(middle(await box(actions(page, 'table-no-rows').nth(0))), middle(await box(host(page, 'table-no-rows'))), 'one action is centred', 1);
    // The row does not fit: it wraps, item-gap between its lines; no action is cut or made smaller.
    for (const id of ['wrapped', 'wrapped-start']) {
      const [first, second, h] = [await box(actions(page, id).nth(0)), await box(actions(page, id).nth(1)), await box(host(page, id))];
      near(second.y - (first.y + first.height), itemGap, `${id}: item-gap between the lines`);
      near(first.width, alone.width, `${id}: the action keeps its own width`, 0.01);
      near(first.height, alone.height, `${id}: the action keeps its own height`, 0.01);
      for (const b of [first, second]) {
        expect(b.x, id).toBeGreaterThanOrEqual(h.x + padInline - 0.5);
        expect(b.x + b.width, id).toBeLessThanOrEqual(h.x + h.width - padInline + 0.5);
      }
      if (id === 'wrapped') for (const b of [first, second]) near(middle(b), middle(h), 'each line is centred', 1);
      else for (const b of [first, second]) near(b.x, h.x + padInline, 'each line starts at the start edge');
    }
    // The Button's own styles are what they are alone (its label's line is its own until a line is too short for it).
    const inner = (locator: Locator) => locator.locator('button').evaluate((el) => ['font', 'color', 'background-color', 'padding', 'border-radius', 'min-height'].map((p) => getComputedStyle(el).getPropertyValue(p)).join(' | '));
    expect(await inner(actions(page, 'actions').nth(0))).toBe(await inner(page.locator('#alone > tanrei-button')));
    // No event of its own: a press is the control's. Nothing is dispatched from the empty state itself.
    const seen = await host(page, 'actions').evaluate(async (el) => {
      const own: string[] = [];
      const targets: string[] = [];
      const dispatch = EventTarget.prototype.dispatchEvent;
      EventTarget.prototype.dispatchEvent = function (event: Event) {
        if (this === el) own.push(event.type);
        return dispatch.call(this, event);
      };
      el.addEventListener('click', (event) => targets.push((event.target as Element).localName));
      (el.querySelector('[slot="actions"]') as HTMLElement).click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      EventTarget.prototype.dispatchEvent = dispatch;
      return { own, targets };
    });
    expect(seen).toEqual({ own: [], targets: ['tanrei-button'] });
  });

  test('EMP-6, EMP-11: an action whose one line is longer than its line of the row is given that line and no less — a Button wraps its label, a link wraps as text — so it is never cut and never runs past the block', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1200 });
    const LABEL = 'Open the list of contents of the documentation';
    await mount(page, [
      fx('long-action', { title: 'No results' }, 'Check the spelling.', { slots: { actions: ['Clear', LABEL] } }),
      fx('long-action-start', { title: 'No results', align: 'start' }, 'Check the spelling.', { slots: { actions: [LABEL] } }),
      fx('long-link', { title: 'No results' }, `Check the spelling.<a slot="actions" class="tanrei-link" href="#x">${LABEL}</a>`),
      fx('roomy', { title: 'No results' }, 'Check the spelling.', { slots: { actions: [LABEL] } }),
    ]);
    await page.addStyleTag({ content: dist('link.css') });
    await widths(page, { 'long-action': 232, 'long-action-start': 232, 'long-link': 232 });
    await frames(page);
    const padInline = await token(page, 'container-padding-inline');
    for (const id of ['long-action', 'long-action-start', 'long-link']) {
      const h = await box(host(page, id));
      for (const action of await actions(page, id).all()) {
        const b = await box(action);
        expect(b.x, `${id}: inside the block`).toBeGreaterThanOrEqual(h.x + padInline - 0.5);
        expect(b.x + b.width, `${id}: inside the block`).toBeLessThanOrEqual(h.x + h.width - padInline + 0.5);
        await expect(action).toBeVisible();
      }
      expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: nothing runs past the region`).toBe(true);
    }
    // The Button: as wide as its line, its label on several lines, whole.
    const long = actions(page, 'long-action').nth(1);
    near((await box(long)).width, (await box(host(page, 'long-action'))).width - 2 * padInline, 'the action takes its line');
    const label = long.locator('.label');
    expect(lineCount(await lines(label.locator('slot')))).toBeGreaterThan(1);
    expect(await long.locator('button').evaluate((el) => [getComputedStyle(el).overflow, el.scrollWidth <= el.clientWidth + 1])).toEqual(['visible', true]);
    await expect(long).toHaveText(LABEL);
    // Each action on a line of its own; the short one is untouched.
    const short = await box(actions(page, 'long-action').nth(0));
    expect((await box(long)).y).toBeGreaterThanOrEqual(short.y + short.height);
    expect(lineCount(await lines(actions(page, 'long-action').nth(0).locator('.label slot')))).toBe(1);
    // The link wraps as text does.
    expect(lineCount(await lines(actions(page, 'long-link').nth(0)))).toBeGreaterThan(1);
    // With room for its one line, the same Button is one line.
    expect(lineCount(await lines(actions(page, 'roomy').nth(0).locator('.label slot')))).toBe(1);
    // An action that leaves the slot is a Button alone again.
    const moved = actions(page, 'long-action-start').nth(0);
    expect(lineCount(await lines(moved.locator('.label slot')))).toBeGreaterThan(1);
    await moved.evaluate((el) => el.removeAttribute('slot'));
    await frames(page);
    expect(lineCount(await lines(host(page, 'long-action-start').locator('> tanrei-button .label slot')))).toBe(1);
  });

  test('EMP-7: the empty state takes no input and no focus and is no stop in the focus order, and draws nothing differently under a pointer, a press or focus; a link in the description and the Buttons in the actions take focus by their own specs in the order drawn, and the text stays selectable', async ({
    page,
  }) => {
    await mount(page, [fx('controls', { title: 'No results for tokne' }, 'Check the spelling, or <a id="guide" href="#x">read the guide</a>.<tanrei-button slot="actions" id="one" variant="text">Clear the search</tanrei-button><tanrei-button slot="actions" id="two" variant="text">Open the list</tanrei-button>'), ...of('description')]);
    await page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="before">before</button>');
      document.querySelector('main')!.insertAdjacentHTML('beforeend', '<button id="after">after</button>');
    });
    const target = host(page, 'controls');
    // No tabindex, no role, no control of its own, no listener it would need a cursor for.
    expect(await target.getAttribute('tabindex')).toBeNull();
    expect(await target.evaluate((el) => el.shadowRoot!.querySelectorAll('[tabindex], button, a, input, [role]:not(.announce)').length)).toBe(0);
    expect(await target.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
    // The focus order: what the product placed, in the order drawn; the empty state itself is never a stop.
    await page.locator('#before').focus();
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      await tab(page);
      order.push(await focused(page));
    }
    expect(order).toEqual(['a#guide', 'tanrei-button#one', 'tanrei-button#two', 'button#after']);
    // A plain one is passed over whole.
    await host(page, 'description').evaluate((el) => el.insertAdjacentHTML('beforebegin', '<button id="b1">1</button>'));
    await host(page, 'description').evaluate((el) => el.insertAdjacentHTML('afterend', '<button id="b2">2</button>'));
    await page.locator('#b1').focus();
    await tab(page);
    expect(await focused(page)).toBe('button#b2');
    // Nothing it draws changes under a pointer, a press or focus.
    const plain = host(page, 'description');
    const drawn = () =>
      plain.evaluate((el) =>
        [el, ...el.shadowRoot!.querySelectorAll('.container, .title, .headline, .description')].map((p) => ['color', 'background-color', 'opacity', 'outline-style', 'box-shadow', 'cursor'].map((name) => getComputedStyle(p).getPropertyValue(name)).join(' ')).join(' | '),
      );
    const rest = await drawn();
    expect(rest).toContain('auto');
    expect(rest).not.toContain('pointer');
    const b = await box(plain);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    expect(await drawn()).toBe(rest);
    await page.mouse.down();
    expect(await drawn()).toBe(rest);
    expect(await focused(page), 'a press gives it no focus').not.toBe(TAG);
    await page.mouse.up();
    expect(await drawn()).toBe(rest);
    expect(await plain.evaluate((el) => el.shadowRoot!.querySelectorAll('.ripple, .state-layer').length)).toBe(0);
    // The title and the description remain selectable.
    for (const selector of ['.headline', '.description']) expect(await part(page, 'description', selector).evaluate((el) => getComputedStyle(el).userSelect || getComputedStyle(el).webkitUserSelect)).not.toBe('none');
    const selected = await plain.evaluate((el) => {
      const selection = getSelection()!;
      selection.selectAllChildren(el);
      return selection.toString();
    });
    expect(selected).toContain(TEXT);
  });

  test('EMP-8: not live, the empty state is plain content read where it stands — the title as text or as the heading the product gave, the description, the actions as the controls they are — with no role and no name of its own; it is not announced when shown or changed, moves no focus, and is not exposed as an alert, a status, a dialog or a note', async ({
    page,
    browserName,
  }) => {
    await mount(page, [...of('actions', 'title-slot', 'list-no-items'), fx('heading', { size: 'large' }, `<h2 slot="title">This page does not exist</h2>The address may be mistyped.<a slot="actions" href="#x">Go to the start page</a>`)]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    await page.locator('#start').focus();
    for (const id of ['actions', 'title-slot', 'list-no-items', 'heading']) {
      const target = host(page, id);
      expect(await target.evaluate((el) => el.getAttributeNames().filter((name) => name === 'role' || name.startsWith('aria-') || name === 'tabindex' || name === 'title')), id).toEqual([]);
      // No live region, no role of any kind in its shadow root.
      expect(await target.evaluate((el) => el.shadowRoot!.querySelectorAll('[role], [aria-live], [aria-label], [aria-labelledby], output').length), id).toBe(0);
    }
    for (const name of ['status', 'alert', 'dialog', 'alertdialog', 'note', 'region', 'group'] as const) await expect(page.getByRole(name), name).toHaveCount(0);
    // Reading order: the title, the description, the actions; the glyph is not there.
    await expect(host(page, 'actions')).toMatchAriaSnapshot(`
      - text: No projects yet ${TEXT}
      - button "New project"
      - button "Import a layer"
    `);
    await expect(host(page, 'heading')).toMatchAriaSnapshot(`
      - heading "This page does not exist" [level=2]
      - text: The address may be mistyped.
      - link "Go to the start page"
    `);
    // Not announced when it is shown again or changed, and focus stays where it was.
    await host(page, 'actions').evaluate(async (el: HTMLElement & { headline: string; updateComplete: Promise<unknown> }) => {
      el.hidden = true;
      await el.updateComplete;
      el.hidden = false;
      el.headline = 'Changed';
      el.append(' More text.');
      await el.updateComplete;
    });
    await frames(page);
    expect(await announced(host(page, 'actions'))).toBeNull();
    expect(await page.locator('[aria-live], [role="status"], [role="alert"]').count()).toBe(0);
    expect(await focused(page)).toBe('button#start');
    // What the engine itself exposes can be read in Chromium alone (the DevTools protocol).
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const exposed = nodes.filter((node) => !node.ignored);
    const roles = new Set(exposed.map((node) => String(node.role?.value)));
    for (const name of ['status', 'alert', 'dialog', 'alertdialog', 'note', 'region', 'group', 'log']) expect(roles.has(name), `no ${name} is exposed`).toBe(false);
    const names = exposed.map((node) => String(node.name?.value ?? ''));
    expect(names.some((name) => name.includes('folder_open')), 'the glyph is not exposed').toBe(false);
    expect(exposed.filter((node) => node.role?.value === 'heading').map((node) => [node.name?.value, node.properties?.find((p) => p.name === 'level')?.value.value])).toEqual([['This page does not exist', 2]]);
    expect(exposed.filter((node) => node.role?.value === 'button').map((node) => node.name?.value)).toEqual(['start', 'New project', 'Import a layer', 'New project']);
    expect(exposed.filter((node) => node.role?.value === 'StaticText').map((node) => node.name?.value)).toEqual(expect.arrayContaining(['Changed', 'No projects yet', 'Nothing differs from the base yet', 'Change a value on the left and it is listed here.']));
  });

  test('EMP-9: live, the empty state is a polite live region — announced once when it is shown after its page was presented and when its title or its description changes, the title then the description and not its actions; never with the first presentation, never assertively, never moving focus, and drawn exactly as it is without live', async ({
    page,
    browserName,
  }) => {
    const found = of('search-no-results')[0];
    await mount(page, [found, { ...found, id: 'quiet', props: { ...found.props, live: false } }, { ...found, id: 'later' }, fx('slotted', { live: true }, `<p slot="title">No entries match</p>Three filters are on.`)]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    await page.locator('#start').focus();
    const [title, text] = [String(found.props.title), String(found.content)];
    const live = host(page, 'search-no-results');
    // A polite live region in the shadow root, there from the first render; the host itself has no live role, so its
    // own content is not read twice.
    expect(await live.evaluate((el) => [...el.shadowRoot!.querySelectorAll('.announce')].map((r) => [r.getAttribute('role'), r.getAttribute('aria-live'), r.getAttribute('aria-atomic')]))).toEqual([['status', null, 'true']]);
    expect(await live.evaluate((el) => el.getAttributeNames().filter((name) => name === 'role' || name.startsWith('aria-')))).toEqual([]);
    expect(await page.locator('[aria-live="assertive"], [role="alert"]').count()).toBe(0);
    const region = await box(part(page, 'search-no-results', '.announce'));
    expect(region.width).toBeLessThanOrEqual(1);
    expect(region.height).toBeLessThanOrEqual(1);
    // Drawn with the first presentation of its page: it announces nothing then.
    await frames(page);
    for (const id of ['search-no-results', 'later', 'slotted']) expect(await announced(host(page, id)), id).toEqual([]);
    // live changes nothing that is drawn.
    const [a, b] = [await box(live), await box(host(page, 'quiet'))];
    expect([a.width, a.height]).toEqual([b.width, b.height]);
    for (const selector of ['.media', '.title', '.description', '.actions']) {
      const [x, y] = [await box(part(page, 'search-no-results', selector)), await box(part(page, 'quiet', selector))];
      expect([x.x - a.x, x.y - a.y, x.width, x.height], selector).toEqual([y.x - b.x, y.y - b.y, y.width, y.height]);
    }
    // The verify: shown after a query returned nothing — one polite announcement of its title and its description, and
    // not of its action.
    const later = host(page, 'later');
    await later.evaluate((el: HTMLElement) => (el.hidden = true));
    await frames(page);
    expect(await announced(later)).toEqual([]);
    await later.evaluate((el: HTMLElement) => (el.hidden = false));
    await expect.poll(() => announced(later)).toEqual([title, text]);
    expect(await focused(page), 'focus is not moved').toBe('button#start');
    // Shown inside something the product shows: the same.
    await later.evaluate((el: HTMLElement) => (el.parentElement!.style.display = 'none'));
    await expect.poll(() => announced(later)).toEqual([]);
    await later.evaluate((el: HTMLElement) => (el.parentElement!.style.display = ''));
    await expect.poll(() => announced(later)).toEqual([title, text]);
    // Its title changes while it is shown: announced again, whole.
    await later.evaluate((el: HTMLElement & { headline: string }) => (el.headline = 'No results for “tokn”'));
    await expect.poll(() => announced(later)).toEqual(['No results for “tokn”', text]);
    // Its description changes.
    await later.evaluate((el) => [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!.replaceWith('Search for a shorter word.'));
    await expect.poll(() => announced(later)).toEqual(['No results for “tokn”', 'Search for a shorter word.']);
    // A title in the slot is what is announced, and a change inside it is a change.
    await host(page, 'slotted').evaluate((el) => (el.querySelector('[slot="title"]')!.textContent = 'No entries match these filters'));
    await expect.poll(() => announced(host(page, 'slotted'))).toEqual(['No entries match these filters', 'Three filters are on.']);
    // What changes inside an action or the media is not a change of what it says.
    await later.evaluate((el) => el.shadowRoot!.querySelector('.announce')!.replaceChildren());
    await later.evaluate((el) => {
      el.querySelector('[slot="actions"]')!.textContent = 'Clear';
      el.querySelector('[slot="media"]')!.textContent = 'search';
    });
    await frames(page);
    expect(await announced(later)).toEqual([]);
    // Added by the product after the page was presented: announced.
    await page.evaluate(() => {
      const added = document.createElement('tanrei-empty-state') as HTMLElement & { live: boolean; headline: string };
      added.id = 'added';
      added.live = true;
      added.headline = 'No entries match these filters';
      added.textContent = 'Three filters are on.';
      document.querySelector('.stage')!.append(added);
    });
    await expect.poll(() => announced(page.locator('#added'))).toEqual(['No entries match these filters', 'Three filters are on.']);
    // Taken away and put back: announced again.
    await page.evaluate(() => {
      const added = document.querySelector('#added')!;
      const parent = added.parentElement!;
      added.remove();
      (window as unknown as { __put: () => void }).__put = () => parent.append(added);
    });
    expect(await announced(page.locator('#added').or(page.locator('body'))).catch(() => null)).not.toEqual(['No entries match these filters', 'Three filters are on.']);
    await page.evaluate(() => (window as unknown as { __put: () => void }).__put());
    await expect.poll(() => announced(page.locator('#added'))).toEqual(['No entries match these filters', 'Three filters are on.']);
    // No longer live: there is no region.
    await later.evaluate((el: HTMLElement & { live: boolean; updateComplete: Promise<unknown> }) => ((el.live = false), el.updateComplete));
    expect(await announced(later)).toBeNull();
    expect(await focused(page)).toBe('button#start');
    expect(await page.locator('[aria-live="assertive"], [role="alert"]').count()).toBe(0);
    // What the engine exposes (Chromium, the DevTools protocol): a status that holds the title and the description.
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const byId = new Map(nodes.map((node) => [node.nodeId, node]));
    const textOf = (id: string): string => {
      const node = byId.get(id)!;
      return node.role?.value === 'StaticText' ? String(node.name?.value ?? '') : (node.childIds ?? []).map(textOf).join('|');
    };
    const statuses = nodes.filter((node) => !node.ignored && node.role?.value === 'status');
    expect(statuses.map((node) => textOf(node.nodeId)).filter(Boolean).sort()).toEqual(['No entries match these filters|Three filters are on.', 'No entries match these filters|Three filters are on.']);
    for (const node of statuses) {
      expect(node.properties?.find((p) => p.name === 'live')?.value.value).toBe('polite');
      expect(node.properties?.find((p) => p.name === 'atomic')?.value.value).toBe(true);
    }
    expect(nodes.some((node) => !node.ignored && node.role?.value === 'alert')).toBe(false);
  });

  test('EMP-10: a change of the title, the title slot’s content, the description, the media or the actions is drawn and exposed at once, without a motion; the empty state neither shows nor hides itself', async ({ page }) => {
    await mount(page, of('title', 'actions'));
    const target = host(page, 'title');
    const settle = () => target.evaluate((el: HTMLElement & { updateComplete: Promise<unknown> }) => new Promise<void>((resolve) => queueMicrotask(() => void el.updateComplete.then(() => resolve()))));
    await target.evaluate((el: HTMLElement & { headline: string }) => (el.headline = 'No layers yet'));
    await settle();
    await expect(part(page, 'title', '.headline')).toHaveText('No layers yet');
    await expect(host(page, 'title')).toMatchAriaSnapshot(`- text: No layers yet`);
    // A description, a glyph and an action, given later.
    await target.evaluate((el) => el.append('Add a layer to begin.'));
    await settle();
    await expect(part(page, 'title', '.description')).toBeVisible();
    await target.evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="media">folder_open</span><tanrei-button slot="actions" variant="text">New layer</tanrei-button>'));
    await settle();
    await expect(part(page, 'title', '.media')).toBeVisible();
    await expect(part(page, 'title', '.actions')).toBeVisible();
    await expect(host(page, 'title')).toMatchAriaSnapshot(`
      - text: No layers yet Add a layer to begin.
      - button "New layer"
    `);
    // The title slot's content takes the prop's place, and a change inside it is drawn where it is.
    await target.evaluate((el) => el.insertAdjacentHTML('afterbegin', '<h2 slot="title">Nothing here</h2>'));
    await settle();
    expect(await part(page, 'title', '.headline').count()).toBe(0);
    await target.evaluate((el) => (el.querySelector('h2')!.textContent = 'Nothing here yet'));
    await expect(stage(page, 'title').getByRole('heading', { level: 2, name: 'Nothing here yet' })).toHaveCount(1);
    // A title slot emptied in place is a title no more; the prop is drawn again.
    await target.evaluate((el) => (el.querySelector('h2')!.textContent = ''));
    await settle();
    await expect(part(page, 'title', '.headline')).toHaveText('No layers yet');
    // Taken away again.
    await target.evaluate((el) => {
      for (const child of [...el.querySelectorAll('[slot="media"], [slot="actions"]')]) child.remove();
    });
    await settle();
    await expect(part(page, 'title', '.media')).toBeHidden();
    await expect(part(page, 'title', '.actions')).toBeHidden();
    // Without a motion: nothing it draws has a transition or an animation.
    for (const id of ['title', 'actions']) {
      expect(await host(page, id).evaluate((el) => [el, ...el.shadowRoot!.querySelectorAll('*')].every((p) => getComputedStyle(p).transitionDuration.split(',').every((d) => Number.parseFloat(d) === 0) && getComputedStyle(p).animationName === 'none')), id).toBe(true);
      expect(await host(page, id).evaluate((el) => el.getAnimations({ subtree: true }).length + el.shadowRoot!.getAnimations().length), id).toBe(0);
    }
    // It neither shows nor hides itself: it wrote no `hidden`, no `style` and no display on itself through all of that.
    expect(await target.evaluate((el) => [el.hasAttribute('hidden'), el.hasAttribute('style'), getComputedStyle(el).display])).toEqual([false, false, 'block']);
    // Hidden by the product, it stays hidden; shown, it is shown.
    await target.evaluate((el: HTMLElement) => (el.hidden = true));
    await expect(target).toBeHidden();
    await target.evaluate((el: HTMLElement & { headline: string }) => (el.headline = 'Still hidden'));
    await settle();
    await expect(target).toBeHidden();
  });

  test('EMP-11: with the text enlarged the title and the description grow, and the measure with them; the paddings and gaps stay, the glyph’s box stays the media size, nothing is cut and no height is fixed, text-spacing overrides lose no content, and at 320 wide with text at 200 % nothing scrolls sideways and the actions stand each on a line of their own', async ({
    page,
  }) => {
    const ids = ['actions', 'long-text', 'large', 'start'];
    await page.setViewportSize({ width: 320, height: 1200 });
    const long = of('long-text')[0];
    await mount(page, [...of(...ids), { ...long, id: 'measure' }]);
    const normal = await textStyle(part(page, 'actions', '.description'));
    const normalTitle = await textStyle(part(page, 'actions', '.headline'));
    const heights = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, (await box(host(page, id))).height] as const)));
    // The verify: 200 % text in a region 320 wide.
    await page.addStyleTag({ content: 'html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; padding: 0 !important; } .stage[data-fixture="measure"] { inline-size: 1200px !important; }' });
    await frames(page);
    near(Number.parseFloat((await textStyle(part(page, 'actions', '.description'))).fontSize), 2 * Number.parseFloat(normal.fontSize), 'the description grows');
    near(Number.parseFloat((await textStyle(part(page, 'actions', '.headline'))).fontSize), 2 * Number.parseFloat(normalTitle.fontSize), 'the title grows');
    // The measure grows with the text: 30 times the description's size, now twice what it was.
    const measure = Number.parseFloat(await page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name), T('content-measure')));
    near((await box(part(page, 'measure', '.text'))).width, measure * 2 * Number.parseFloat(normal.fontSize), 'the measure grows with the text');
    await page.addStyleTag({ content: '.stage[data-fixture="measure"] { display: none; }' });
    // No horizontal scrolling at 320 wide.
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])).toEqual([320, 320]);
    const gapMedia = await token(page, 'media-gap');
    for (const id of ids) {
      const size = id === 'large' ? 'large' : 'medium';
      const h = await box(host(page, id));
      near(h.width, 320, `${id} fills its region`);
      expect(h.height, `${id} grows in height`).toBeGreaterThan(heights[id]);
      // The paddings and the gaps stay their tokens (the system's lengths are the reader's: rem).
      const pad = await token(page, `container-padding-block-${size}`);
      const media = await box(part(page, id, '.media'));
      near(media.y - h.y, pad, `${id}: the padding above`);
      const row = await box(part(page, id, '.actions'));
      near(h.y + h.height - (row.y + row.height), pad, `${id}: the padding below`);
      near((await box(part(page, id, '.title'))).y - (media.y + media.height), gapMedia, `${id}: media.gap`);
      // The glyph's box keeps the media size of its size.
      near(media.width, await token(page, `media-size-${size}`), `${id}: the glyph's box`);
      near(media.height, await token(page, `media-size-${size}`), `${id}: the glyph's box`);
      // Nothing cut, no fixed height.
      const c = part(page, id, '.container');
      expect(await c.evaluate((el) => [getComputedStyle(el).overflowX, getComputedStyle(el).overflowY, getComputedStyle(el).maxHeight, el.scrollHeight <= el.clientHeight + 1, el.scrollWidth <= el.clientWidth + 1]), id).toEqual(['visible', 'visible', 'none', true, true]);
      for (const selector of ['.title', '.description', '.actions']) {
        const b = await box(part(page, id, selector));
        expect(b.x, `${id} ${selector} inside`).toBeGreaterThanOrEqual(h.x - 0.5);
        expect(b.x + b.width, `${id} ${selector} inside`).toBeLessThanOrEqual(h.x + h.width + 0.5);
      }
      // Its actions each on a line of their own, whole and inside the block.
      const all = await actions(page, id).all();
      expect(all).toHaveLength(2);
      const [first, second] = [await box(all[0]), await box(all[1])];
      expect(second.y, `${id}: each action on its own line`).toBeGreaterThanOrEqual(first.y + first.height);
      for (const action of all) {
        const b = await box(action);
        expect(b.x, `${id}: an action inside`).toBeGreaterThanOrEqual(h.x - 0.5);
        expect(b.x + b.width, `${id}: an action inside`).toBeLessThanOrEqual(h.x + h.width + 0.5);
        expect(await action.locator('button').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: the label is whole`).toBe(true);
        await expect(action).toBeVisible();
      }
    }
    // Text spacing (WCAG 1.4.12): nothing is lost.
    const words = await host(page, 'long-text').evaluate((el) => (el as HTMLElement).innerText);
    const before = (await box(host(page, 'long-text'))).height;
    await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }' });
    await host(page, 'long-text').evaluate((el) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }');
      el.shadowRoot!.adoptedStyleSheets = [...el.shadowRoot!.adoptedStyleSheets, sheet];
    });
    await frames(page);
    const spaced = await box(host(page, 'long-text'));
    expect(spaced.height).toBeGreaterThanOrEqual(before);
    expect(await host(page, 'long-text').evaluate((el) => (el as HTMLElement).innerText)).toBe(words);
    await expect(part(page, 'long-text', '.headline')).toHaveText(String(long.props.title));
    expect(await part(page, 'long-text', '.container').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    for (const selector of ['.title', '.description', '.actions']) {
      const b = await box(part(page, 'long-text', selector));
      expect(b.y + b.height).toBeLessThanOrEqual(spaced.y + spaced.height + 0.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('EMP-12: in forced colors the glyph, the title and the description are drawn in the platform’s text color, links and Buttons keep their own, nothing rests on a fill and nothing moves', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
    await mount(page, [...spec.fixtures, fx('link', { title: 'No results' }, 'Check the spelling, or <a id="l" class="tanrei-link" href="#x">read the guide</a>.'), fx('picture', { title: 'No projects yet' }, `${PICTURE(120, 80)}${TEXT}`)]);
    await page.addStyleTag({ content: dist('link.css') });
    const ids = [...spec.fixtures.map((f) => f.id), 'link', 'picture'];
    const geometry = async () => Object.fromEntries(await Promise.all(ids.map(async (id) => [id, [await box(host(page, id)), await box(part(page, id, '.title'))]] as const)));
    const before = await geometry();
    await page.emulateMedia({ forcedColors: 'active' });
    const [canvasText, linkText, buttonText] = [await colorOf(page, 'CanvasText'), await colorOf(page, 'LinkText'), await colorOf(page, 'ButtonText')];
    for (const f of spec.fixtures) {
      sameColor(await painted(f.props.title ? part(page, f.id, '.headline') : host(page, f.id).locator('> [slot="title"]'), 'color'), canvasText, `${f.id}: the title`);
      if (f.content) sameColor(await painted(part(page, f.id, '.description'), 'color'), canvasText, `${f.id}: the description`);
      if (f.slots?.media) sameColor(await painted(part(page, f.id, '.media'), 'color'), canvasText, `${f.id}: the glyph`);
      // Nothing rests on a fill.
      expect((await painted(part(page, f.id, '.container'), 'background-color'))[3], f.id).toBe(0);
    }
    // A link keeps the link color and its underline; a Button the platform's colors for a button; a picture is itself.
    sameColor(await painted(page.locator('#l'), 'color'), linkText, 'the link');
    expect(await css(page.locator('#l'), 'text-decoration-line')).toBe('underline');
    sameColor(await painted(actions(page, 'actions').nth(0).locator('button'), 'color'), buttonText, 'a Button');
    expect(await css(host(page, 'picture').locator('> img'), 'filter')).toBe('none');
    expect(await geometry(), 'nothing moves').toEqual(before);
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('EMP-13: in right-to-left the paddings follow the logical start and end and the actions’ order mirrors, the first at the right; at the start every part stands at the right edge with its text aligned to the right; centred, the column stays centred', async ({
    page,
  }) => {
    await mount(page, [...of('actions-rtl', 'start-rtl', 'actions', 'start'), fx('wrapped-rtl', { title: 'لا توجد مشاريع بعد', align: 'start' }, 'يجمع المشروع الطبقات والتصديرات والأشخاص لنظام تصميم واحد.', { direction: 'rtl' })]);
    await widths(page, { 'wrapped-rtl': 232 });
    const [padInline, itemGap] = [await token(page, 'container-padding-inline'), await token(page, 'actions-item-gap')];
    // At the start: every part at the right edge, inside the padding; lines aligned to the right.
    const h = await box(host(page, 'start-rtl'));
    const edge = h.x + h.width - padInline;
    for (const selector of ['.media', '.title', '.description', '.actions']) {
      const b = await box(part(page, 'start-rtl', selector));
      near(b.x + b.width, edge, `${selector} at the right edge`);
    }
    for (const id of ['start-rtl', 'wrapped-rtl']) {
      const right = (await box(host(page, id))).x + (await box(host(page, id))).width - padInline;
      for (const selector of ['.headline', '.description slot']) for (const line of await lines(part(page, id, selector))) near(line.right, right, `${id}: a line of ${selector} ends at the right edge`, 1);
    }
    expect(lineCount(await lines(part(page, 'wrapped-rtl', '.description slot')))).toBeGreaterThan(1);
    // The actions mirror: the first is at the right, the second item-gap to its left.
    for (const id of ['start-rtl', 'actions-rtl']) {
      const [first, second] = [await box(actions(page, id).nth(0)), await box(actions(page, id).nth(1))];
      near(first.x - (second.x + second.width), itemGap, `${id}: the first action is at the right`);
      near(first.y, second.y, `${id}: one row`);
    }
    near((await box(actions(page, 'start-rtl').nth(0))).x + (await box(actions(page, 'start-rtl').nth(0))).width, edge, 'the first action at the right edge');
    // Centred, the column stays centred — and is the mirror image of the left-to-right one's places.
    const c = await box(host(page, 'actions-rtl'));
    for (const selector of ['.media', '.title', '.description', '.actions']) near(middle(await box(part(page, 'actions-rtl', selector))), middle(c), `${selector} stays centred`, 1);
    // The paddings are logical: the start padding is on the right.
    expect(await css(part(page, 'start-rtl', '.container'), 'padding-right')).toBe(`${padInline}px`);
    expect(await css(part(page, 'start-rtl', '.container'), 'direction')).toBe('rtl');
    // The left-to-right start is the mirror of it.
    near((await box(part(page, 'start', '.media'))).x - (await box(host(page, 'start'))).x, padInline, 'left-to-right: the left edge');
  });

  test('EMP-14: the direction is the nearest ancestor’s — not the root’s and not a setting of its own; when it changes while the empty state is shown it is drawn for the new direction at once, without a motion, keeping what it shows', async ({ page }) => {
    // The verify: the direction set on an ancestor inside the page, not on the root, and changed after the first render.
    const start = of('start')[0];
    await mount(page, [{ ...start, id: 'follows', direction: 'rtl' }, start]);
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    const target = host(page, 'follows');
    expect(await target.evaluate((el) => [el.getAttribute('dir'), el.matches(':dir(rtl)'), 'dir' in (el.constructor as unknown as { properties: object }).properties])).toEqual([null, true, false]);
    const padInline = await token(page, 'container-padding-inline');
    const h = await box(target);
    const media = await box(part(page, 'follows', '.media'));
    near(media.x + media.width, h.x + h.width - padInline, 'right-to-left: at the right edge');
    const [first, second] = [await box(actions(page, 'follows').nth(0)), await box(actions(page, 'follows').nth(1))];
    expect(first.x).toBeGreaterThan(second.x);
    const words = await target.evaluate((el) => (el as HTMLElement).innerText);
    // Changed on the ancestor: drawn for the new direction in the same frame, with nothing to animate.
    await stage(page, 'follows').evaluate((el) => el.setAttribute('dir', 'ltr'));
    const now = await target.evaluate((el) => {
      const b = el.getBoundingClientRect();
      const m = el.shadowRoot!.querySelector('.media')!.getBoundingClientRect();
      const [a1, a2] = [...el.querySelectorAll('[slot="actions"]')].map((a) => a.getBoundingClientRect().x);
      return { media: m.x - b.x, order: a1 < a2, animations: el.getAnimations({ subtree: true }).length + el.shadowRoot!.getAnimations().length, words: (el as HTMLElement).innerText };
    });
    near(now.media, padInline, 'left-to-right: at the left edge');
    expect([now.order, now.animations, now.words]).toEqual([true, 0, words]);
    // And it is exactly the one that was left-to-right from the start.
    const twin = await box(host(page, 'start'));
    const again = await box(target);
    expect([again.width, again.height]).toEqual([twin.width, twin.height]);
    // Back again.
    await stage(page, 'follows').evaluate((el) => el.setAttribute('dir', 'rtl'));
    const back = await box(part(page, 'follows', '.media'));
    near(back.x + back.width, h.x + h.width - padInline, 'right-to-left again');
  });

  test('EMP-15: in right-to-left the icon helper mirrors a glyph of the media slot that the icon set marks, or the product forces, inside its own box, and not one the product forbids or an unmarked one; the empty state mirrors nothing itself and never a picture', async ({
    page,
  }) => {
    const rtl = of('start-rtl')[0];
    const glyph = (id: string, name: string, attributes = '', direction: 'rtl' | 'ltr' = 'rtl') => fx(id, { title: 'لا توجد مشاريع بعد', align: 'start' }, `<span slot="media" ${attributes}>${name}</span>`, { direction });
    await mount(page, [rtl, ...of('actions-rtl'), glyph('never', 'arrow_forward', 'data-mirror="never"'), glyph('always', 'folder_open', 'data-mirror="always"'), glyph('ltr', 'arrow_forward', '', 'ltr'), fx('picture', { title: 'لا توجد مشاريع بعد' }, PICTURE(120, 80, 'data-x'), { direction: 'rtl' })]);
    const slotted = (id: string) => host(page, id).locator('> [slot="media"]');
    const MIRRORED = 'matrix(-1, 0, 0, 1, 0, 0)';
    // arrow_forward is in the icon set's mirrored list; folder_open is not.
    await expect(slotted('start-rtl')).toHaveAttribute('data-tanrei-mirrored', '');
    expect(await css(slotted('start-rtl'), 'transform')).toBe(MIRRORED);
    expect(await slotted('actions-rtl').getAttribute('data-tanrei-mirrored')).toBeNull();
    expect(await css(slotted('actions-rtl'), 'transform')).toBe('none');
    // The product forbids, and forces.
    expect(await css(slotted('never'), 'transform')).toBe('none');
    expect(await css(slotted('always'), 'transform')).toBe(MIRRORED);
    // Left-to-right: marked by its name, drawn as it is.
    await expect(slotted('ltr')).toHaveAttribute('data-tanrei-mirrored', '');
    expect(await css(slotted('ltr'), 'transform')).toBe('none');
    // In its own box, about its centre: the box's place, size, color and fill are those of the one not mirrored.
    const [a, b] = [await box(part(page, 'start-rtl', '.media')), await box(part(page, 'never', '.media'))];
    const [ha, hb] = [await box(host(page, 'start-rtl')), await box(host(page, 'never'))];
    expect([a.x - ha.x, a.y - ha.y, a.width, a.height]).toEqual([b.x - hb.x, b.y - hb.y, b.width, b.height]);
    for (const property of ['color', 'font-variation-settings', 'font-size']) expect(await css(part(page, 'start-rtl', '.media'), property), property).toBe(await css(part(page, 'never', '.media'), property));
    expect(await css(slotted('start-rtl'), 'transform-origin')).toBe(`${(await box(slotted('start-rtl'))).width / 2}px ${(await box(slotted('start-rtl'))).height / 2}px`);
    // The empty state mirrors nothing itself: no box of its own is transformed.
    expect(await host(page, 'start-rtl').evaluate((el) => [el, ...el.shadowRoot!.querySelectorAll('*')].every((p) => getComputedStyle(p).transform === 'none'))).toBe(true);
    // A picture is never mirrored by the list.
    expect(await slotted('picture').getAttribute('data-tanrei-mirrored')).toBeNull();
    expect(await css(slotted('picture'), 'transform')).toBe('none');
    // The direction changes: the mark stays, the drawing follows.
    await stage(page, 'start-rtl').evaluate((el) => el.setAttribute('dir', 'ltr'));
    expect(await css(slotted('start-rtl'), 'transform')).toBe('none');
  });

  test('EMP-16: a title given as text is text of its own direction, isolated: a left-to-right query quoted in a right-to-left title keeps its order, a left-to-right title in a right-to-left layout is still placed and aligned by the layout and by align; the description’s direction is its content’s', async ({
    page,
  }) => {
    await mount(page, [...of('search-no-results-rtl'), fx('latin-start', { title: 'tokens.css (3)', align: 'start' }, 'يجمع المشروع الطبقات.', { direction: 'rtl' }), fx('latin-centre', { title: 'tokens.css (3)' }, 'يجمع المشروع الطبقات.', { direction: 'rtl' }), fx('number', { title: '404', align: 'start' }, undefined, { direction: 'rtl' })]);
    // The verify: the query keeps its order and the title stays centred.
    const headline = part(page, 'search-no-results-rtl', '.headline');
    expect(await css(headline, 'unicode-bidi')).toBe('plaintext');
    const letters = await headline.evaluate((el) => {
      const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.includes('tokne'))!;
      const at = node.textContent!.indexOf('tokne');
      const place = (index: number) => {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        return range.getBoundingClientRect().left;
      };
      return { query: [0, 1, 2, 3, 4].map((i) => place(at + i)), first: place(0) };
    });
    expect([...letters.query].sort((x, y) => x - y), 'the query reads left to right').toEqual(letters.query);
    expect(letters.first, 'the Arabic words begin at the right, after the query').toBeGreaterThan(letters.query[4]);
    const h = await box(host(page, 'search-no-results-rtl'));
    for (const line of await lines(headline)) near((line.left + line.right) / 2, middle(h), 'the title stays centred', 1);
    // A left-to-right title in a right-to-left layout: its own order, placed and aligned by the layout.
    const padInline = await token(page, 'container-padding-inline');
    const latin = part(page, 'latin-start', '.headline');
    const order = await latin.evaluate((el) => {
      const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.includes('('))!;
      const place = (index: number) => {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        return range.getBoundingClientRect().left;
      };
      return [place(0), place(node.textContent!.indexOf('('))];
    });
    expect(order[0], 'the name is before its count').toBeLessThan(order[1]);
    const ls = await box(host(page, 'latin-start'));
    for (const line of await lines(latin)) near(line.right, ls.x + ls.width - padInline, 'aligned to the right, by the layout', 1);
    const lc = await box(host(page, 'latin-centre'));
    for (const line of await lines(part(page, 'latin-centre', '.headline'))) near((line.left + line.right) / 2, middle(lc), 'centred, by align', 1);
    // A title with no strong character takes the layout's direction: at the right edge.
    const n = await box(host(page, 'number'));
    for (const line of await lines(part(page, 'number', '.headline'))) near(line.right, n.x + n.width - padInline, 'a number at the right edge', 1);
    // The description is not isolated by the empty state: its direction is its content's.
    expect(await css(part(page, 'latin-start', '.description'), 'unicode-bidi')).not.toBe('plaintext');
    expect(await css(part(page, 'latin-start', '.description'), 'direction')).toBe('rtl');
  });

  test('EMP-17: a size the active design system does not have, and an align this spec does not have, render as the default (medium, center) and are reported in debug builds', async ({ page }) => {
    const seen = warnings(page);
    const base = of('actions')[0];
    await mount(page, [base, { ...base, id: 'size', props: { ...base.props, size: 'huge' } }, { ...base, id: 'align', props: { ...base.props, align: 'end' } }, { ...base, id: 'both', props: { ...base.props, size: 'Not A Size', align: 'START' } }]);
    await frames(page);
    const twin = await box(host(page, 'actions'));
    for (const id of ['size', 'align', 'both']) {
      const b = await box(host(page, id));
      expect([b.width, b.height], id).toEqual([twin.width, twin.height]);
      for (const selector of ['.media', '.title', '.description', '.actions']) {
        const [x, y] = [await box(part(page, id, selector)), await box(part(page, 'actions', selector))];
        expect([x.x - b.x, x.y - b.y, x.width, x.height], `${id} ${selector}`).toEqual([y.x - twin.x, y.y - twin.y, y.width, y.height]);
      }
      expect(await textStyle(part(page, id, '.headline')), id).toEqual(await role(page, 'title-typescale-medium'));
    }
    expect(seen.filter((text) => text.includes('EMP-17') && text.includes('size "huge"') && text.includes('"medium"'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('EMP-17') && text.includes('align "end"') && text.includes('"center"'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('EMP-17') && text.includes('Not A Size'))).toHaveLength(1);
    expect(seen.filter((text) => text.includes('EMP-17') && text.includes('align "START"'))).toHaveLength(1);
    // The known values report nothing.
    expect(seen.filter((text) => text.includes('EMP-17'))).toHaveLength(4);
    // A size a design system's layer adds is drawn from its tokens.
    await page.addStyleTag({ content: `:root { ${T('container-padding-block-compact')}: 8px; ${T('media-size-compact')}: 24px; }` });
    await host(page, 'size').evaluate((el: HTMLElement & { size: string; updateComplete: Promise<unknown> }) => ((el.size = 'compact'), el.updateComplete));
    near((await box(part(page, 'size', '.media'))).width, 24, 'a layer’s size: its glyph');
    near((await box(part(page, 'size', '.media'))).y - (await box(host(page, 'size'))).y, 8, 'a layer’s size: its padding');
    expect(seen.filter((text) => text.includes('compact'))).toHaveLength(0);
  });

  test('EMP-18: with no title, no title slot and no description the empty state draws nothing, takes no space, exposes nothing and is reported — a glyph or actions alone say nothing; a description without a title still renders and is reported', async ({
    page,
  }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('nothing', {}, undefined, { slots: { media: 'folder_open', actions: ['New project'] } }),
      fx('blank', { title: '   ' }, '   '),
      fx('empty-slot', {}, '<p slot="title"></p>'),
      fx('untitled', {}, TEXT),
      ...of('title'),
    ]);
    await frames(page);
    for (const id of ['nothing', 'blank', 'empty-slot']) {
      await expect(host(page, id), id).toBeHidden();
      expect(await css(host(page, id), 'display'), id).toBe('none');
      expect(await host(page, id).boundingBox(), `${id}: takes no space`).toBeNull();
      expect((await box(stage(page, id))).height, `${id}: its stage is its padding`).toBe(32);
    }
    // Exposes nothing: not its action either.
    await expect(stage(page, 'nothing').getByRole('button')).toHaveCount(0);
    expect(await stage(page, 'nothing').ariaSnapshot()).toBe('');
    expect(seen.filter((text) => text.includes('EMP-18') && text.includes('draws nothing'))).toHaveLength(3);
    // A description without a title renders, and says so.
    await expect(host(page, 'untitled')).toBeVisible();
    await expect(part(page, 'untitled', '.title')).toBeHidden();
    await expect(host(page, 'untitled')).toContainText(TEXT);
    const pad = await token(page, 'container-padding-block-medium');
    near((await box(part(page, 'untitled', '.description'))).y - (await box(host(page, 'untitled'))).y, pad, 'the description is the first part');
    expect(seen.filter((text) => text.includes('EMP-18') && text.includes('a description and no title'))).toHaveLength(1);
    // Given something to say, it is drawn; left with nothing, it is gone again.
    await host(page, 'nothing').evaluate((el: HTMLElement & { headline: string; updateComplete: Promise<unknown> }) => ((el.headline = 'No projects yet'), el.updateComplete));
    await expect(host(page, 'nothing')).toBeVisible();
    await expect(stage(page, 'nothing').getByRole('button', { name: 'New project' })).toHaveCount(1);
    await host(page, 'title').evaluate((el: HTMLElement & { headline: string; updateComplete: Promise<unknown> }) => ((el.headline = ''), el.updateComplete));
    await expect(host(page, 'title')).toBeHidden();
    // A browser without custom states: the block has no height (the container is hidden).
    expect(await host(page, 'blank').evaluate((el) => (el.shadowRoot!.querySelector('.container') as HTMLElement).hidden)).toBe(true);
  });

  test('EMP-1, EMP-2: content written in the page keeps its place before the element is defined — the stylesheet gives it the paddings of its size, the description’s text style and color and its alignment — and no rule of it applies once the element is defined', async ({
    page,
  }) => {
    const markup = (id: string, attributes: string, title: string) => `<div class="stage" id="${id}"><tanrei-empty-state ${attributes}><span slot="media">folder_open</span>${title}${TEXT}</tanrei-empty-state></div>`;
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${dist('tokens.css')}</style><style>${dist('empty-state.css')}</style>
      <style>body { margin: 0 } .stage { box-sizing: border-box; inline-size: 480px; padding: 16px; }</style></head><body>
      ${markup('m', '', '<p slot="title">No projects yet</p>')}${markup('l', 'size="large" align="start"', '<h1 slot="title">This page does not exist</h1>')}
      <div class="stage" id="pic"><tanrei-empty-state><img slot="media" alt="" width="120" height="80" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="><p slot="title">No projects yet</p></tanrei-empty-state></div></body></html>`);
    const el = (id: string) => page.locator(`#${id} > ${TAG}`);
    expect(await el('m').evaluate((e) => e.matches(':defined'))).toBe(false);
    const before: Record<string, { width: number; height: number }> = {};
    for (const [id, size, align] of [['m', 'medium', 'center'], ['l', 'large', 'start']] as const) {
      const e = el(id);
      expect(await css(e, 'display')).toBe('block');
      expect(await css(e, 'padding-block-start')).toBe(`${await token(page, `container-padding-block-${size}`)}px`);
      expect(await css(e, 'padding-inline-start')).toBe(`${await token(page, 'container-padding-inline')}px`);
      expect(await css(e, 'text-align')).toBe(align);
      expect(await textStyle(e)).toEqual(await role(page, `description-typescale-${size}`));
      sameColor(await painted(e, 'color'), await tokenColor(page, 'description-color'));
      const title = e.locator('> [slot="title"]');
      expect(await textStyle(title)).toEqual(await role(page, `title-typescale-${size}`));
      sameColor(await painted(title, 'color'), await tokenColor(page, 'title-color'));
      expect(await css(title, 'margin-block-end')).toBe(`${await token(page, 'title-gap')}px`);
      // A glyph's name is not shown as text.
      await expect(e.locator('> [slot="media"]')).toBeHidden();
      before[id] = await box(e);
    }
    // A picture is shown, in its place.
    await expect(el('pic').locator('> img')).toBeVisible();
    near(middle(await box(el('pic').locator('> img'))), middle(await box(el('pic'))), 'the picture is centred', 1);
    // Defined: none of those rules matches, and the block is where it was — taller by the glyph it now draws.
    await page.addScriptTag({ content: dist('tanrei.bundle.js'), type: 'module' });
    await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
    await frames(page);
    for (const [id, size] of [['m', 'medium'], ['l', 'large']] as const) {
      const e = el(id);
      expect(await css(e, 'padding-block-start')).toBe('0px');
      const after = await box(e);
      expect(after.width).toBe(before[id].width);
      near(after.height, before[id].height + (await token(page, `media-size-${size}`)) + (await token(page, 'media-gap')), `${id}: the same block, with its glyph`, 1);
    }
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { icons: true, theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('no axe violations with a heading as the title, a link in the description, a link as the action, a picture, and a live empty state that was announced', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(
        page,
        [
          fx('page', { size: 'large' }, `<h1 slot="title">This page does not exist</h1>The address may be mistyped, or <a class="tanrei-link" href="#x">the page may have moved</a>.<a slot="actions" class="tanrei-link" href="#y">Go to the start page</a>`),
          fx('picture', { title: 'No projects yet', align: 'start' }, `${PICTURE(120, 80)}${TEXT}`),
          { ...of('search-no-results')[0], id: 'announced' },
        ],
        { theme },
      );
      await page.addStyleTag({ content: dist('link.css') });
      await host(page, 'announced').evaluate((el: HTMLElement & { headline: string }) => (el.headline = 'No results for “tokn”'));
      await expect.poll(async () => (await announced(host(page, 'announced')))?.length).toBe(2);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('every fixture is plain content in reading order — the title, the description, the actions — with its glyph hidden, no role and no name of its own, and a status region only where it is live', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      const target = host(page, f.id);
      expect(await target.evaluate((el) => el.getAttributeNames().filter((name) => name === 'role' || name.startsWith('aria-') || name === 'tabindex' || name === 'title')), f.id).toEqual([]);
      expect(await part(page, f.id, '.media').getAttribute('aria-hidden'), f.id).toBe('true');
      expect(await target.evaluate((el) => el.shadowRoot!.querySelectorAll('[role="status"]').length), f.id).toBe(f.props.live ? 1 : 0);
      const title = String(f.slots?.title ?? f.props.title);
      const names = ([] as string[]).concat(f.slots?.actions ?? []);
      const text = [title, f.content].filter(Boolean).join(' ');
      await expect(target, f.id).toMatchAriaSnapshot(`- text: ${JSON.stringify(text)}\n${names.map((name) => `- button ${JSON.stringify(name)}`).join('\n')}`);
    }
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the glyph, the title, the description and the actions the spec gives it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(16);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      const b = await box(host(page, f.id));
      expect(b.width, f.id).toBe(448);
      expect(b.height, f.id).toBeGreaterThanOrEqual(88);
      expect(await part(page, f.id, '.media').isVisible(), `${f.id} media`).toBe(!!f.slots?.media);
      expect(await part(page, f.id, '.title').isVisible(), `${f.id} title`).toBe(true);
      expect(await part(page, f.id, '.description').isVisible(), `${f.id} description`).toBe(!!f.content);
      expect(await part(page, f.id, '.actions').isVisible(), `${f.id} actions`).toBe(!!f.slots?.actions);
      expect(await actions(page, f.id).count(), `${f.id} actions`).toBe(([] as string[]).concat(f.slots?.actions ?? []).length);
      if (f.content) await expect(host(page, f.id)).toContainText(f.content);
      expect(await host(page, f.id).getAttribute('size'), f.id).toBe(String(f.props.size ?? 'medium'));
      expect(await host(page, f.id).evaluate((el) => (el as HTMLElement & { align: string }).align), f.id).toBe(String(f.props.align ?? 'center'));
      // Every glyph is drawn by the icon set.
      if (f.slots?.media) await expect.poll(() => part(page, f.id, '.media').getAttribute('data-drawn'), { message: f.id }).not.toBeNull();
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
