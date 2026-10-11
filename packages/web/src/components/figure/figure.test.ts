// <tanrei-figure> and figure.css, driven by specs/figure.spec.json: every behaviour id (FIG-1…25) is cited by a test
// title, every fixture has a baseline, and every length and color is read back from the tokens — never from a number
// written here (the numbers of a `verify` are the spec's own, for the default system).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { decodePng } from '../../../test/png.js';
import { type Fixture, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('figure');
type P = Page;
const TAG = 'tanrei-figure';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const T = (name: string) => `--tanrei-comp-figure-${name}`;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const figure = (page: P, id: string) => host(page, id).locator('> figure');
const frame = (page: P, id: string) => figure(page, id).locator('> [data-part="frame"]');
const header = (page: P, id: string) => frame(page, id).locator('> header');
const title = (page: P, id: string) => header(page, id).locator('> [data-part="title"]');
const actions = (page: P, id: string) => header(page, id).locator('> [data-part="actions"]');
/** The stage of the figure (the harness's own stage around a fixture is `stage`). */
const shown = (page: P, id: string) => frame(page, id).locator('> [data-part="stage"]');
const attachment = (page: P, id: string) => frame(page, id).locator('> [data-part="attachment"]');
const caption = (page: P, id: string) => figure(page, id).locator('> figcaption');
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const px = async (locator: Locator, property: string) => Number.parseFloat(await css(locator, property));
const edges = (locator: Locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
/** Where the text of an element is drawn: the box of its contents, not of the element. */
const textBox = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
const lines = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops: number[] = [];
    for (const r of range.getClientRects()) if (r.width > 0 && !tops.some((top) => Math.abs(top - r.top) < r.height / 2)) tops.push(r.top);
    return tops.length;
  });
/** Where the first and the last character of an element's text are drawn, from the left. */
const ends = (locator: Locator) =>
  locator.evaluate((el) => {
    const node = el.firstChild as Text;
    const at = (index: number) => {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      return range.getBoundingClientRect().left;
    };
    return { first: at(0), last: at(node.length - 1) };
  });
const scroll = (locator: Locator) => locator.evaluate((el) => ({ left: el.scrollLeft, width: el.scrollWidth, height: el.scrollHeight, clientWidth: el.clientWidth, clientHeight: el.clientHeight }));
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text());
  });
  return seen;
}
/** One frame drawn: what an observer of sizes or of the document wrote has been styled. */
const drawnFrame = (page: P) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const systemColor = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('span');
    probe.style.color = n;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, name);

/** A native figure of a test's own: the parts it names, as a page writes them. */
interface Parts {
  title?: string;
  actions?: string;
  stage?: string;
  attachment?: string;
  caption?: string;
}
const native = ({ title: t, actions: a, stage: s = 'Specimen', attachment: j, caption: c }: Parts) =>
  `<figure><div data-part="frame">${t !== undefined || a !== undefined ? `<header>${t !== undefined ? (t.startsWith('<') ? t : `<p data-part="title">${t}</p>`) : ''}${a !== undefined ? `<div data-part="actions">${a}</div>` : ''}</header>` : ''}<div data-part="stage">${s}</div>${j !== undefined ? (j.includes('data-part="attachment"') ? j : `<div data-part="attachment">${j}</div>`) : ''}</div>${c !== undefined ? `<figcaption>${c}</figcaption>` : ''}</figure>`;
const fx = (id: string, props: Fixture['props'], parts: Parts, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content: native(parts), ...extra });
/** A figure whose children the test writes: a whole `<figure>`, or what a figure the element builds is given. */
const raw = (id: string, props: Fixture['props'], content: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content, ...extra });
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
const some = (...ids: string[]) => ids.map(fixture);
/** The figure's width (a fixture cannot state the size of its stage). */
const size = (page: P, id: string, width: number) =>
  stage(page, id).evaluate((el, w) => {
    (el as HTMLElement).style.maxInlineSize = 'none';
    (el as HTMLElement).style.inlineSize = `${w + 32}px`;
  }, width);
const near = (a: number, b: number, tolerance = 0.6) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tolerance);
const BOX = (width: number, id = 'box') => `<div id="${id}" style="flex: none; inline-size: ${width}px; block-size: 40px; background: var(--tanrei-sys-color-primary)"></div>`;
const BUTTON = (glyph: string, id = '') => `<tanrei-button variant="text" label="${glyph}"${id ? ` id="${id}"` : ''}><span slot="icon">${glyph}</span></tanrei-button>`;
/** A picture with a size of its own and no file: an SVG drawn as an image. */
const picture = (width: number, height: number, alt = '') =>
  `<img id="picture" alt="${alt}" width="${width}" height="${height}" src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#567"/></svg>`)}">`;

test.describe('the frame and its looks', () => {
  test('FIG-1: from top to bottom a frame that holds the header, the stage and the attachment, and below it the caption; the frame has the container’s corners (8), clips what it holds to them, is exactly as tall as what it holds and draws no elevation', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('separation-divider', 'outlined', 'filled', 'flush', 'title-caption') });
    const id = 'separation-divider';
    const [f, h, s, a, c] = [await edges(frame(page, id)), await edges(header(page, id)), await edges(shown(page, id)), await edges(attachment(page, id)), await edges(caption(page, id))];
    near(h.top, f.top, 0.1);
    near(s.top, h.bottom, 0.1);
    near(a.top, s.bottom, 0.1);
    near(a.bottom, f.bottom, 0.1);
    expect(c.top).toBeGreaterThan(f.bottom);
    expect(await frame(page, id).evaluate((el) => [...el.children].map((child) => child.localName === 'header' ? 'header' : child.getAttribute('data-part')))).toEqual(['header', 'stage', 'attachment']);
    for (const each of ['separation-divider', 'outlined', 'filled', 'flush', 'title-caption']) {
      const box = frame(page, each);
      const radius = await resolveToken(page, T('container-shape'));
      expect(radius).toBe(8);
      // The radius is the token's, eased by the system's corner smoothing (none in the default system).
      const scale = Number(await css(box, '--_corner-scale')) || 1;
      for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) near(await px(box, `border-${corner}-radius`), radius * scale, 0.01);
      expect(await css(box, 'overflow-x')).toBe('clip');
      expect(await css(box, 'box-shadow')).toBe('none');
      // Exactly as tall as what it holds: no height and no minimum of its own.
      const held = await box.evaluate((el) => [...el.children].reduce((sum, child) => sum + child.getBoundingClientRect().height, 0));
      near((await edges(box)).height, held, 0.1);
      expect(await css(box, 'min-height')).toMatch(/^(0px|auto)$/);
    }
    // The verify: a picture placed with inset false has its four corners cut by the frame.
    const flush = await edges(frame(page, 'flush'));
    near((await edges(shown(page, 'flush').locator('.fixture-picture'))).width, flush.width, 0.1);
    const shot = decodePng(await frame(page, 'flush').screenshot({ scale: 'css' }));
    const at = (x: number, y: number) => [...shot.data.subarray((y * shot.width + x) * 4, (y * shot.width + x) * 4 + 3)].join(' ');
    const [inside, w, h2] = [at(Math.floor(shot.width / 2), Math.floor(shot.height / 2)), shot.width - 1, shot.height - 1];
    for (const [x, y] of [[0, 0], [w, 0], [0, h2], [w, h2]]) expect(at(x, y), `corner ${x}, ${y}`).not.toBe(inside);
    expect(at(12, 12)).toBe(inside);
  });

  test('FIG-2: outlined fills the frame with its color and draws an edge of outline.width in outline.color inside the frame’s size, changing neither its size nor the place of what it holds; filled fills it and draws no edge; plain draws no fill, no edge, no padding and no line and still clips the stage to the container’s shape', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('outlined', 'filled', 'plain', 'title', 'filled-title-caption') });
    const width = await resolveToken(page, T('outline-width'));
    // Outlined: the surface inside one hairline.
    expect(await css(frame(page, 'outlined'), 'background-color')).toBe(await resolveColor(page, T('outlined-container-color')));
    expect(await css(frame(page, 'outlined'), 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-surface'));
    expect([await px(frame(page, 'outlined'), 'outline-width'), await css(frame(page, 'outlined'), 'outline-style'), await css(frame(page, 'outlined'), 'outline-color'), await px(frame(page, 'outlined'), 'outline-offset')]).toEqual([width, 'solid', await resolveColor(page, T('outline-color')), -width]);
    // Inside the frame's size: no border, and the frame and what it holds are where the filled look has them.
    expect(await frame(page, 'outlined').evaluate((el) => ['top', 'right', 'bottom', 'left'].map((side) => getComputedStyle(el).getPropertyValue(`border-${side}-width`)))).toEqual(Array(4).fill('0px'));
    const place = async (id: string) => {
      const [outer, f, text] = [await edges(stage(page, id)), await edges(frame(page, id)), await textBox(shown(page, id))];
      return [f.left - outer.left, f.top - outer.top, f.width, f.height, text.left - outer.left, text.top - outer.top].map((n) => Math.round(n * 100) / 100);
    };
    expect(await place('outlined')).toEqual(await place('filled'));
    // Filled: a quiet tone and no edge.
    expect(await css(frame(page, 'filled'), 'background-color')).toBe(await resolveColor(page, T('filled-container-color')));
    expect(await css(frame(page, 'filled'), 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-surface-container'));
    expect(await px(frame(page, 'filled'), 'outline-width')).toBe(0);
    expect(await css(header(page, 'filled-title-caption'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    // Plain: nothing but what is shown, clipped to the shape.
    expect(await css(frame(page, 'plain'), 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(await px(frame(page, 'plain'), 'outline-width')).toBe(0);
    expect(await shown(page, 'plain').evaluate((el) => ['top', 'right', 'bottom', 'left'].flatMap((side) => [getComputedStyle(el).getPropertyValue(`padding-${side}`), getComputedStyle(el).getPropertyValue(`border-${side}-width`)]))).toEqual(Array(8).fill('0px'));
    near(await px(shown(page, 'plain'), 'border-top-left-radius'), await resolveToken(page, T('container-shape')), 0.01);
    expect(await css(shown(page, 'plain'), 'overflow-x')).not.toBe('visible');
    near((await edges(frame(page, 'plain'))).height, (await textBox(shown(page, 'plain'))).height, 0.6);
  });

  test('FIG-3: the content stands in the stage with nothing of the figure’s between the fill and it or over it; padded 32 and 24 while inset and not plain, not at all otherwise; handed content.color and centred in the outlined and the filled looks, handed no color and at the start edge in the plain look; several pieces stacked with no space between', async ({ page }) => {
    const three = (id: string, props: Fixture['props']) => fx(id, { label: id, ...props }, { stage: BOX(40) });
    await mountFixtures(page, spec, {
      fixtures: [three('o', {}), three('f', { variant: 'filled' }), three('p', { variant: 'plain' }), three('o-flush', { inset: false }), fx('several', { label: 'Several' }, { stage: `${BOX(40, 'one')}${BOX(60, 'two')}<span id="three">three</span>` }), ...some('outlined')],
    });
    const [block, inline] = [await resolveToken(page, T('stage-padding-block')), await resolveToken(page, T('stage-padding-inline'))];
    expect([block, inline]).toEqual([32, 24]);
    for (const id of ['o', 'f', 'p', 'o-flush']) await size(page, id, 400);
    for (const id of ['o', 'f']) {
      const [s, box] = [await edges(shown(page, id)), await edges(page.locator(`[data-fixture="${id}"] #box`))];
      // The verify: 32 above and below, 24 before and after; a 40 wide box has its centre at the stage's centre.
      near(box.top - s.top, block, 0.1);
      near(s.bottom - box.bottom, block, 0.1);
      expect([await px(shown(page, id), 'padding-left'), await px(shown(page, id), 'padding-right')]).toEqual([inline, inline]);
      near(box.left + box.width / 2, s.left + s.width / 2, 0.1);
      near(s.width, 400, 0.1);
      expect(await css(shown(page, id), 'color')).toBe(await resolveColor(page, T('content-color')));
      // Nothing of the figure's own in the stage: no fill, no layer under or over the content.
      expect(await shown(page, id).evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).backgroundImage, getComputedStyle(el, '::before').content, getComputedStyle(el, '::after').content])).toEqual(['rgba(0, 0, 0, 0)', 'none', 'none', 'none']);
    }
    // Plain: no padding, no color of the figure's, the content at the start edge in line with the text around.
    await stage(page, 'p').evaluate((el) => ((el as HTMLElement).style.color = 'rgb(1, 2, 3)'));
    const [plainStage, plainBox] = [await edges(shown(page, 'p')), await edges(page.locator('[data-fixture="p"] #box'))];
    near(plainBox.left, (await edges(host(page, 'p'))).left, 0.1);
    near(plainBox.top, plainStage.top, 0.1);
    near(plainStage.height, 40, 0.1);
    expect(await css(shown(page, 'p'), 'color')).toBe('rgb(1, 2, 3)');
    // Not inset: the content reaches the frame's edges.
    expect(await shown(page, 'o-flush').evaluate((el) => ['top', 'right', 'bottom', 'left'].map((side) => getComputedStyle(el).getPropertyValue(`padding-${side}`)))).toEqual(Array(4).fill('0px'));
    near((await edges(frame(page, 'o-flush'))).height, 40, 0.1);
    // Several pieces: in the order given, with no space of the figure's between them.
    const [one, two, three3] = [await edges(page.locator('#one')), await edges(page.locator('#two')), await edges(page.locator('#three'))];
    near(two.top, one.bottom, 0.1);
    near(three3.top, two.bottom, 0.1);
    near(one.left + one.width / 2, two.left + two.width / 2, 0.1);
  });

  test('FIG-4: a picture wider than the stage’s inner width is scaled down to it with its proportions kept, and nothing is scaled above its own size, cropped or stretched — in the stage, as its own stage and as its own frame', async ({ page }) => {
    const wide = picture(900, 300);
    await mountFixtures(page, spec, {
      fixtures: [
        fx('in-stage', { label: 'A picture' }, { stage: wide }),
        fx('small', { label: 'A small picture' }, { stage: picture(100, 50) }),
        raw('lone', { label: 'A lone picture' }, `<figure><div data-part="frame">${wide}</div><figcaption>Its own stage</figcaption></figure>`),
        raw('bare', {}, `<figure>${wide}<figcaption>Its own frame</figcaption></figure>`),
        raw('bare-plain', { variant: 'plain' }, `<figure>${wide}<figcaption>Its own frame, plain</figcaption></figure>`),
        raw('in-picture', { inset: false, label: 'A picture element' }, `<figure><div data-part="frame"><div data-part="stage"><picture>${wide}</picture></div></div></figure>`),
      ],
    });
    for (const id of ['in-stage', 'small', 'lone', 'bare', 'bare-plain', 'in-picture']) await size(page, id, 400);
    const inline = await resolveToken(page, T('stage-padding-inline'));
    const img = (id: string) => page.locator(`[data-fixture="${id}"] #picture`);
    await img('in-stage').evaluate((el) => (el as HTMLImageElement).decode());
    // In the stage: the stage's inner width, the proportions kept.
    const scaled = await edges(img('in-stage'));
    near(scaled.width, 400 - 2 * inline, 0.1);
    near(scaled.height, (400 - 2 * inline) / 3, 0.1);
    expect(await css(img('in-stage'), 'object-fit')).toBe('fill');
    // Never above its own size.
    const small = await edges(img('small'));
    expect([Math.round(small.width), Math.round(small.height)]).toEqual([100, 50]);
    // Its own stage: padded as the stage is, scaled inside the padding.
    const lone = await edges(img('lone'));
    near(lone.width, 400, 0.1);
    near(await px(img('lone'), 'padding-left'), inline, 0.01);
    near(lone.height - 2 * (await resolveToken(page, T('stage-padding-block'))), (400 - 2 * inline) / 3, 0.1);
    // Its own frame: the fill, the edge and the corners are on the picture; plain has none and no padding.
    near((await edges(img('bare'))).width, 400, 0.1);
    expect(await px(img('bare'), 'outline-width')).toBe(await resolveToken(page, T('outline-width')));
    near(await px(img('bare'), 'border-top-left-radius'), await resolveToken(page, T('container-shape')), 0.01);
    const plain = await edges(img('bare-plain'));
    near(plain.width, 400, 0.1);
    near(plain.height, 400 / 3, 0.1);
    near(await px(img('bare-plain'), 'border-top-left-radius'), await resolveToken(page, T('container-shape')), 0.01);
    near((await edges(img('in-picture'))).width, 400, 0.1);
    // The caption names each figure, and the picture keeps its own alternative (FIG-16).
    await expect(stage(page, 'bare').getByRole('figure', { name: 'Its own frame' })).toHaveCount(1);
    expect(await img('bare').getAttribute('alt')).toBe('');
  });

  test('FIG-5: content that cannot shrink scrolls sideways inside the stage from the start edge, placed at the start edge and not at the centre, the stage’s inline padding scrolling with it; the header, the attachment and the caption do not scroll, the figure is never wider than its layout, nothing that holds it scrolls sideways and the stage never scrolls up and down', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fx('wide', {}, { title: 'A wide thing', stage: BOX(900), attachment: '<div id="joined">joined</div>', caption: 'It scrolls in its stage.' })] });
    await size(page, 'wide', 320);
    const inline = await resolveToken(page, T('stage-padding-inline'));
    const s = shown(page, 'wide');
    // The verify: the figure stays 320 wide, the stage scrolls from the start edge, the document does not.
    near((await edges(host(page, 'wide'))).width, 320, 0.1);
    near((await edges(frame(page, 'wide'))).width, 320, 0.1);
    const at = await scroll(s);
    expect(at.left).toBe(0);
    near(at.width, 900 + 2 * inline, 1);
    near((await edges(page.locator('#box'))).left, (await edges(s)).left + inline, 0.1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await stage(page, 'wide').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // Up and down it does not scroll: it is as tall as its content.
    expect(await css(s, 'overflow-y')).toBe('hidden');
    expect(at.height).toBe(at.clientHeight);
    // Scrolled to its end, the last part of the content is clear of the frame's edge by the padding.
    const before = [await edges(title(page, 'wide')), await edges(page.locator('#joined')), await edges(caption(page, 'wide'))].map((e) => e.left);
    await s.evaluate((el) => (el.scrollLeft = el.scrollWidth));
    near((await edges(s)).right - (await edges(page.locator('#box'))).right, inline, 1);
    expect([await edges(title(page, 'wide')), await edges(page.locator('#joined')), await edges(caption(page, 'wide'))].map((e) => e.left)).toEqual(before);
  });

  test('FIG-6: while the stage scrolls it is one stop in the focus order before anything inside it, a group with the figure’s name, with the system’s focus ring inside its edge, never animated and not drawn for a pointer; the arrow keys, Home and End scroll it, left and right alike in either direction; a stage that does not scroll is no stop and no group', async ({ page }) => {
    const inner = (id: string) => `${BOX(900, `box-${id}`)}<a id="link-${id}" href="#${id}">a link in the stage</a>`;
    await mountFixtures(page, spec, {
      fixtures: [
        fx('wide', {}, { title: 'A wide thing', stage: inner('wide'), caption: 'It scrolls.' }),
        fx('captioned', {}, { stage: BOX(900, 'box-captioned'), caption: 'Named by its caption' }),
        fx('labelled', { label: 'Named by its label' }, { stage: BOX(900, 'box-labelled') }),
        fx('rtl-wide', {}, { title: 'A wide thing, from the right', stage: BOX(900, 'box-rtl') }, { direction: 'rtl' }),
        ...some('title'),
      ],
    });
    for (const id of ['wide', 'captioned', 'labelled', 'rtl-wide']) await size(page, id, 320);
    const s = shown(page, 'wide');
    await expect(s).toHaveAttribute('tabindex', '0');
    await expect(s).toHaveAttribute('role', 'group');
    // The figure's name: its title, its caption where it has no title, its label where it draws neither.
    await expect(stage(page, 'wide').getByRole('group', { name: 'A wide thing', exact: true })).toHaveCount(1);
    await expect(shown(page, 'captioned')).toHaveAttribute('role', 'group');
    await expect(stage(page, 'captioned').getByRole('group', { name: 'Named by its caption', exact: true })).toHaveCount(1);
    await expect(stage(page, 'labelled').getByRole('group', { name: 'Named by its label', exact: true })).toHaveCount(1);
    // A stage that does not scroll is no stop and exposes no group.
    expect(await shown(page, 'title').evaluate((el) => [el.hasAttribute('tabindex'), el.hasAttribute('role'), (el as HTMLElement).tabIndex])).toEqual([false, false, -1]);
    await expect(stage(page, 'title').getByRole('group')).toHaveCount(0);
    // One stop, before what it holds.
    await page.locator('body').click({ position: { x: 790, y: 5 } });
    await tabTo(page, s);
    // The ring: outer-width wide, in the focus color, set in from the edge by the offset, never animated.
    const [width, offset] = [await resolveToken(page, '--tanrei-sys-focus-outer-width'), await resolveToken(page, '--tanrei-sys-focus-offset')];
    expect(await px(s, 'outline-width')).toBe(width);
    expect(await css(s, 'outline-style')).toBe('solid');
    expect(await css(s, 'outline-color')).toBe(await resolveColor(page, '--tanrei-sys-color-focus-ring'));
    expect(await px(s, 'outline-offset')).toBe(-(width + offset));
    expect(await css(s, 'transition-duration')).toBe('0s');
    // It follows the frame's corners where the stage meets them: here the lower ones (a header is above it).
    near(await px(s, 'border-bottom-left-radius'), await resolveToken(page, T('container-shape')), 0.01);
    expect(await px(s, 'border-top-left-radius')).toBe(0);
    // (A key is held until the stage has moved: an engine that scrolls for as long as a key is down moves little for a tap.)
    const hold = async (key: string, of: Locator, moved: (at: Awaited<ReturnType<typeof scroll>>) => boolean) => {
      await page.keyboard.down(key);
      await expect.poll(async () => moved(await scroll(of)), { message: key }).toBe(true);
      await page.keyboard.up(key);
      await page.waitForTimeout(400);
    };
    await hold('ArrowRight', s, (at) => at.left > 0);
    const right = (await scroll(s)).left;
    await hold('ArrowLeft', s, (at) => at.left < right);
    await page.keyboard.press('End');
    await expect.poll(async () => { const at = await scroll(s); return at.width - at.clientWidth - at.left; }).toBeLessThanOrEqual(1);
    await page.keyboard.press('Home');
    await expect.poll(async () => (await scroll(s)).left).toBe(0);
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('link-wide');
    // Right-to-left: the view begins at the right, the left arrow moves it left, and End takes it to the left end.
    const r = shown(page, 'rtl-wide');
    expect((await scroll(r)).left).toBe(0);
    near((await edges(page.locator('#box-rtl'))).right, (await edges(r)).right - (await resolveToken(page, T('stage-padding-inline'))), 0.1);
    await tabTo(page, r);
    await hold('ArrowLeft', r, (at) => at.left < 0);
    const left = (await scroll(r)).left;
    await hold('ArrowRight', r, (at) => at.left > left);
    await page.keyboard.press('End');
    await expect.poll(async () => { const at = await scroll(r); return at.width - at.clientWidth + at.left; }).toBeLessThanOrEqual(1);
    await page.keyboard.press('Home');
    await expect.poll(async () => Math.abs((await scroll(r)).left)).toBe(0);
    // A pointer does not draw the ring.
    await page.locator('body').click({ position: { x: 790, y: 5 } });
    await page.locator('#box-wide').click({ position: { x: 10, y: 10 } });
    expect(await css(s, 'outline-style')).toBe('none');
    // No longer scrolling, it is no stop and no group.
    await page.locator('#box-wide').evaluate((el) => ((el as HTMLElement).style.inlineSize = '100px'));
    await expect(s).not.toHaveAttribute('tabindex', '0');
    expect(await s.evaluate((el) => [el.hasAttribute('role'), el.hasAttribute('aria-labelledby')])).toEqual([false, false]);
  });
});

test.describe('the header, the caption and the attachment', () => {
  test('FIG-7: a header where the figure has a title or actions — the title at the start and the actions at the end, header.gap apart, padded by the header’s paddings and at the end by the one it has with actions; the title takes the room the actions leave and wraps, and the actions move below it, at the start edge, when they and one word of it no longer fit; with neither, no header, no space and no line', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('actions', 'title', 'actions-only', 'outlined', 'long-title-actions'), fx('narrow', {}, { title: 'Variants', actions: BUTTON('contrast') + BUTTON('dark_mode') + BUTTON('open_in_new') }), raw('empty-header', { label: 'An empty header' }, '<figure><div data-part="frame"><header></header><div data-part="stage">Specimen</div></div></figure>')] });
    await page.waitForFunction(() => !!customElements.get('tanrei-button'));
    const [gap, block, inline, withActions] = [await resolveToken(page, T('header-gap')), await resolveToken(page, T('header-padding-block')), await resolveToken(page, T('header-padding-inline')), await resolveToken(page, T('header-padding-inline-end-with-actions'))];
    expect([gap, block, inline, withActions]).toEqual([8, 8, 16, 8]);
    // Title at the start, actions at the end, one row.
    const [h, t, a] = [await edges(header(page, 'actions')), await edges(title(page, 'actions')), await edges(actions(page, 'actions'))];
    near(t.left, h.left + inline, 0.1);
    near(a.right, h.right - withActions, 0.1);
    near(a.left - t.right, gap, 0.1);
    near(a.top - h.top, block, 0.1);
    expect(a.top).toBeLessThan(t.bottom);
    near(h.top, (await edges(frame(page, 'actions'))).top, 0.1);
    near(h.width, (await edges(frame(page, 'actions'))).width, 0.1);
    // Without actions the end padding is the header's own; a title alone is one line with the block padding around it.
    expect([await px(header(page, 'title'), 'padding-left'), await px(header(page, 'title'), 'padding-right'), await px(header(page, 'title'), 'padding-top'), await px(header(page, 'title'), 'padding-bottom')]).toEqual([inline, inline, block, block]);
    near((await edges(title(page, 'title'))).width, (await edges(header(page, 'title'))).width - 2 * inline, 0.1);
    // Actions without a title are still at the end.
    near((await edges(actions(page, 'actions-only'))).right, (await edges(header(page, 'actions-only'))).right - withActions, 0.1);
    // A long title wraps in the room the actions leave; the actions keep their sizes.
    expect(await lines(title(page, 'long-title-actions'))).toBeGreaterThan(1);
    const [lt, la] = [await edges(title(page, 'long-title-actions')), await edges(actions(page, 'long-title-actions'))];
    near(la.left - lt.right, gap, 0.1);
    near(la.width, 4 * (await edges(actions(page, 'long-title-actions').locator('tanrei-button').first())).width + 3 * gap, 0.1);
    // When the actions and one word of the title no longer fit in one row, the actions go below, at the start edge.
    const buttons = (await edges(actions(page, 'narrow'))).width;
    const word = (await textBox(title(page, 'narrow'))).width;
    const fits = Math.ceil(inline + word + gap + buttons + withActions);
    await size(page, 'narrow', fits + 1);
    expect((await edges(actions(page, 'narrow'))).top).toBeLessThan((await edges(title(page, 'narrow'))).bottom);
    await size(page, 'narrow', fits - 2);
    const [nt, na, nh] = [await edges(title(page, 'narrow')), await edges(actions(page, 'narrow')), await edges(header(page, 'narrow'))];
    near(na.top - nt.bottom, gap, 0.1);
    near(na.left, nh.left + inline, 0.1);
    expect(await lines(title(page, 'narrow'))).toBe(1);
    // With neither a title nor actions: no header, no space for one and no line.
    await expect(header(page, 'outlined')).toHaveCount(0);
    near((await edges(shown(page, 'outlined'))).top, (await edges(frame(page, 'outlined'))).top, 0.1);
    expect(await css(header(page, 'empty-header'), 'display')).toBe('none');
    near((await edges(shown(page, 'empty-header'))).top, (await edges(frame(page, 'empty-header'))).top, 0.1);
  });

  test('FIG-8: the title is drawn in its text style and color, wrapping and never cut; as the prop it is plain text and never a heading, and content given as the title keeps its role and its level while drawn in the title’s style; with both, the content is drawn and the prop ignored', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...some('title', 'title-slot', 'long-title-actions'),
        fx('heading', {}, { title: '<h3 data-part="title">A heading of the page</h3>' }),
        raw('prop', { title: 'From the prop' }, native({})),
        raw('both', { title: 'From the prop' }, native({ title: 'From the content' })),
        raw('built', { title: 'From the prop' }, '<!--children--><h4 slot="title">From the slot</h4>Specimen'),
      ],
    });
    const t = title(page, 'title');
    expect(await px(t, 'font-size')).toBe(await resolveToken(page, T('title-typescale-font-size')));
    expect(await css(t, 'font-weight')).toBe((await css(page.locator('html'), T('title-typescale-font-weight'))).trim());
    expect(await css(t, 'color')).toBe(await resolveColor(page, T('title-color')));
    expect([Math.round(await px(t, 'font-size')), Math.round(await px(t, 'line-height'))]).toEqual([14, 20]);
    for (const part of [t, title(page, 'long-title-actions')]) {
      expect(await css(part, 'text-overflow')).toBe('clip');
      expect(await css(part, 'white-space')).toBe('normal');
      expect(await css(part, 'overflow')).toBe('visible');
    }
    // The verify: the fixture title-slot draws the same as the fixture title.
    const boxes = async (id: string) => {
      const [outer, f, h, text] = [await edges(stage(page, id)), await edges(frame(page, id)), await edges(header(page, id)), await textBox(title(page, id))];
      return [f.width, f.height, h.height, text.left - outer.left, text.top - outer.top, text.width].map((n) => Math.round(n * 100) / 100);
    };
    expect(await boxes('title-slot')).toEqual(await boxes('title'));
    // The title as text is no heading.
    await expect(stage(page, 'title').getByRole('heading')).toHaveCount(0);
    expect(await t.evaluate((el) => [el.localName, el.getAttribute('role')])).toEqual(['p', null]);
    // The verify: a level 3 heading stays a level 3 heading, drawn at the title's size.
    await expect(stage(page, 'heading').getByRole('heading', { level: 3, name: 'A heading of the page' })).toHaveCount(1);
    expect(await px(title(page, 'heading'), 'font-size')).toBe(await px(t, 'font-size'));
    expect(await css(title(page, 'heading'), 'font-weight')).toBe(await css(t, 'font-weight'));
    expect(await title(page, 'heading').evaluate((el) => [getComputedStyle(el).marginTop, getComputedStyle(el).marginBottom])).toEqual(['0px', '0px']);
    near((await edges(header(page, 'heading'))).height, (await edges(header(page, 'title'))).height, 0.1);
    // The prop: the element writes the title as plain text, where the title fixture has it.
    await expect(title(page, 'prop')).toHaveText('From the prop');
    expect(await title(page, 'prop').evaluate((el) => el.localName)).toBe('p');
    near((await edges(header(page, 'prop'))).height, (await edges(header(page, 'title'))).height, 0.1);
    await expect(stage(page, 'prop').getByRole('heading')).toHaveCount(0);
    // Both: the content is drawn and the prop ignored — in the native form and in a figure the element builds.
    await expect(title(page, 'both')).toHaveCount(1);
    await expect(title(page, 'both')).toHaveText('From the content');
    await expect(title(page, 'built')).toHaveCount(1);
    await expect(stage(page, 'built').getByRole('heading', { level: 4, name: 'From the slot' })).toHaveCount(1);
    expect(await px(stage(page, 'built').locator('h4'), 'font-size')).toBe(await px(t, 'font-size'));
    await expect(stage(page, 'built').getByText('From the prop')).toHaveCount(0);
  });

  test('FIG-9: the actions are laid out in one row at the end of the header, in the order given, header.gap apart, each centred on the row’s height, and nothing else is done to them: they keep their sizes, their names and their focus, and the figure listens to none of their events', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fx('own', {}, { title: 'Variants', actions: `${BUTTON('contrast', 'one')}<button id="two" type="button" style="block-size: 20px">two</button>${BUTTON('open_in_new', 'three')}` }), ...some('docs-demo')] });
    await page.waitForFunction(() => !!customElements.get('tanrei-button'));
    const gap = await resolveToken(page, T('header-gap'));
    const [one, two, three, row] = [await edges(page.locator('#one')), await edges(page.locator('#two')), await edges(page.locator('#three')), await edges(actions(page, 'own'))];
    near(two.left - one.right, gap, 0.1);
    near(three.left - two.right, gap, 0.1);
    for (const each of [one, two, three]) near(each.top + each.height / 2, row.top + row.height / 2, 0.6);
    // They keep their own sizes: a Button its container height, the product's own button the height it was given.
    near(one.height, await resolveToken(page, '--tanrei-comp-button-container-height-medium'), 0.1);
    near(two.height, 20, 0.1);
    // Their own names, their own focus; a press changes nothing of the figure.
    await expect(stage(page, 'own').getByRole('button', { name: 'contrast' })).toHaveCount(1);
    const look = async () => [await css(frame(page, 'own'), 'background-color'), await css(header(page, 'own'), 'background-color'), (await edges(frame(page, 'own'))).height].join('|');
    const rest = await look();
    await page.evaluate(() => document.querySelector('#two')!.addEventListener('click', () => document.body.setAttribute('data-pressed', '')));
    await page.locator('#two').click();
    await expect(page.locator('body')).toHaveAttribute('data-pressed', '');
    expect(await look()).toBe(rest);
    await page.locator('#one').focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('one');
    expect(await actions(page, 'docs-demo').locator('tanrei-button').count()).toBe(3);
  });

  test('FIG-10: the caption is drawn below the frame, caption.gap from it, at the figure’s start edge in its text style and color, wrapping in the figure’s width and never cut — in every look; inline content sits on its baseline with its own styles and a link is underlined at rest; with both the prop and content, the content is drawn', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        ...some('caption', 'filled-caption', 'plain-caption', 'caption-slot', 'long-caption'),
        fx('rich', {}, { caption: 'Pressed with <kbd id="kbd">Enter</kbd>, written <code id="code">comp.button</code>; see <a id="link" href="#x">the Button page</a>.' }),
        raw('prop', { caption: 'From the prop' }, native({})),
        raw('both', { caption: 'From the prop' }, native({ caption: 'From the content' })),
        raw('built', { caption: 'From the prop' }, '<!--children--><span slot="caption">From the slot</span>Specimen'),
      ],
    });
    const gap = await resolveToken(page, T('caption-gap'));
    for (const id of ['caption', 'filled-caption', 'plain-caption', 'caption-slot', 'long-caption']) {
      const [f, c, text] = [await edges(frame(page, id)), await edges(caption(page, id)), await textBox(caption(page, id))];
      near(c.top - f.bottom, gap, 0.1);
      near(text.left, (await edges(host(page, id))).left, 1);
      near(c.width, (await edges(host(page, id))).width, 0.1);
      expect(await px(caption(page, id), 'font-size')).toBe(await resolveToken(page, T('caption-typescale-font-size')));
      expect(await css(caption(page, id), 'color')).toBe(await resolveColor(page, T('caption-color')));
      expect([await css(caption(page, id), 'text-overflow'), await css(caption(page, id), 'white-space'), await css(caption(page, id), 'overflow'), await css(caption(page, id), '-webkit-line-clamp')]).toEqual(['clip', 'normal', 'visible', 'none']);
    }
    expect([Math.round(await px(caption(page, 'caption'), 'font-size')), Math.round(await px(caption(page, 'caption'), 'line-height'))]).toEqual([13, 20]);
    expect(await css(caption(page, 'caption'), 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-on-surface-variant'));
    expect(await lines(caption(page, 'long-caption'))).toBeGreaterThan(2);
    expect((await textBox(caption(page, 'long-caption'))).right).toBeLessThanOrEqual((await edges(host(page, 'long-caption'))).right + 0.5);
    // caption-slot draws as caption does.
    near((await edges(caption(page, 'caption-slot'))).height, (await edges(caption(page, 'caption'))).height, 0.1);
    // Inline content keeps its own styles on the caption's line; a link is underlined at rest.
    expect(await css(page.locator('#code'), 'font-family')).not.toBe(await css(caption(page, 'rich'), 'font-family'));
    expect(await lines(caption(page, 'rich'))).toBe(1);
    expect(await css(page.locator('#link'), 'text-decoration-line')).toBe('underline');
    // The prop, and the content in its place.
    await expect(caption(page, 'prop')).toHaveText('From the prop');
    near((await edges(caption(page, 'prop'))).top - (await edges(frame(page, 'prop'))).bottom, gap, 0.1);
    await expect(caption(page, 'both')).toHaveCount(1);
    await expect(caption(page, 'both')).toHaveText('From the content');
    await expect(caption(page, 'built')).toHaveCount(1);
    await expect(caption(page, 'built')).toHaveText('From the slot');
  });

  test('FIG-11: the attachment is placed inside the frame below the stage, across its whole inline size, with no padding of the figure’s, clipped by the lower corners and joined as the separation names; nothing inside it is styled — a block with a fill, and a real code block, under one line and no second edge', async ({ page }) => {
    const block = '<div id="joined" style="background: var(--tanrei-sys-color-surface-container-high); padding: 12px">its own fill</div>';
    await mountFixtures(page, spec, {
      fixtures: [
        fx('own', { separation: 'divider' }, { title: 'Variants', attachment: block }),
        fx('code', { separation: 'divider' }, { title: 'Variants', attachment: '<tanrei-code-block data-part="attachment" id="code" label="Markup"><pre><code>&lt;tanrei-button&gt;Save&lt;/tanrei-button&gt;</code></pre></tanrei-code-block>' }),
        ...some('attachment'),
      ],
    });
    await page.waitForFunction(() => !!customElements.get('tanrei-code-block'));
    const thickness = await resolveToken(page, T('divider-thickness'));
    for (const [id, selector] of [['own', '#joined'], ['code', '#code']] as const) {
      const [f, s, joined] = [await edges(frame(page, id)), await edges(shown(page, id)), await edges(page.locator(selector))];
      // The verify: one line of the divider's thickness between the stage and the block…
      expect(await px(shown(page, id), 'border-bottom-width')).toBe(thickness);
      expect(await css(shown(page, id), 'border-bottom-color')).toBe(await resolveColor(page, T('divider-color')));
      near(joined.top, s.bottom, 0.1);
      // …the block reaches the frame's edges on three sides, with no padding of the figure's around it…
      near(joined.left, f.left, 0.1);
      near(joined.right, f.right, 0.1);
      near(joined.bottom, f.bottom, 0.1);
      expect(await frame(page, id).evaluate((el) => ['top', 'right', 'bottom', 'left'].map((side) => getComputedStyle(el).getPropertyValue(`padding-${side}`)))).toEqual(Array(4).fill('0px'));
      // …and the figure draws no second line or edge: the frame's own edge is an outline, which takes no room.
      const part = attachment(page, id);
      expect(await part.evaluate((el) => ['top', 'right', 'bottom', 'left'].map((side) => getComputedStyle(el).getPropertyValue(`margin-${side}`)))).toEqual(Array(4).fill('0px'));
      expect(await frame(page, id).evaluate((el) => ['top', 'right', 'bottom', 'left'].map((side) => getComputedStyle(el).getPropertyValue(`border-${side}-width`)))).toEqual(Array(4).fill('0px'));
    }
    expect(await attachment(page, 'own').evaluate((el) => ['top', 'right', 'bottom', 'left'].map((side) => getComputedStyle(el).getPropertyValue(`border-${side}-width`)))).toEqual(Array(4).fill('0px'));
    // Nothing inside it is styled: the block keeps its own fill and padding, the code block its own look.
    expect(await css(page.locator('#joined'), 'padding-top')).toBe('12px');
    expect(await css(page.locator('#joined'), 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-surface-container-high'));
    expect(await page.locator('#code').evaluate((el) => (el as HTMLElement).getAttribute('style'))).toBeNull();
    // Clipped by the frame's lower corners.
    expect(await css(frame(page, 'own'), 'overflow-y')).toBe('clip');
    // The fixture: text that stands for the block, in the frame under the stage.
    near((await edges(attachment(page, 'attachment'))).bottom, (await edges(frame(page, 'attachment'))).bottom, 0.1);
  });

  /** The form a figure draws inside its frame: read from the header's line and the attachment's distance. */
  const form = async (page: P, id: string) => {
    const [thickness, gap] = [await resolveToken(page, T('divider-thickness')), await resolveToken(page, T('attachment-gap'))];
    const [line, under, around] = [await px(header(page, id), 'border-bottom-width'), await px(shown(page, id), 'border-bottom-width'), await px(attachment(page, id), 'margin-left')];
    return line === thickness && under === thickness && around === 0 ? 'divider' : line === 0 && under === 0 && around === gap ? 'gap' : `neither (${line}, ${under}, ${around})`;
  };

  test('FIG-12: separation auto is what comp.figure.separation names, which follows the system’s choice; divider and gap are themselves whatever the tokens say; a change is drawn at once, without animation, the stage’s scroll kept; an unknown value is auto and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('attachment', 'separation-divider', 'separation-gap'), fx('wide', {}, { title: 'Wide', stage: BOX(900), attachment: 'joined' })] });
    await size(page, 'wide', 320);
    expect(await resolveToken(page, T('attachment-gap'))).toBeGreaterThan(0);
    // The verify: the named fixtures draw the same under every design system; `attachment` follows the system.
    expect([await form(page, 'attachment'), await form(page, 'separation-divider'), await form(page, 'separation-gap')]).toEqual(['divider', 'divider', 'gap']);
    // A browser without style queries is told the choice by the element, which reads it when it reads the figure: a
    // change of a token is then seen at its next reading (README). Where the queries work, `override` is all there is.
    const set = async (vars: Record<string, string>) => {
      await override(page, vars);
      await page.evaluate(() => {
        for (const element of document.querySelectorAll('tanrei-figure')) if (element.querySelector(':scope > figure[data-separation]')) (element as unknown as { read(): void }).read();
      });
    };
    await set({ '--tanrei-sys-behavior-separation': 'gap' });
    await expect.poll(() => form(page, 'attachment')).toBe('gap');
    expect([await form(page, 'separation-divider'), await form(page, 'separation-gap')]).toEqual(['divider', 'gap']);
    await set({ [T('separation')]: 'divider' });
    await expect.poll(() => form(page, 'attachment')).toBe('divider');
    await set({ [T('separation')]: 'gap', '--tanrei-sys-behavior-separation': 'divider' });
    await expect.poll(() => form(page, 'attachment')).toBe('gap');
    // A name the choice does not have is the first value, divider.
    await set({ [T('separation')]: 'stripes' });
    await expect.poll(() => form(page, 'attachment')).toBe('divider');
    // The prop, changed while shown: at once, no animation, the stage's scroll kept.
    await shown(page, 'wide').evaluate((el) => (el.scrollLeft = 90));
    await host(page, 'wide').evaluate((el) => ((el as unknown as { separation: string }).separation = 'gap'));
    await expect.poll(() => form(page, 'wide')).toBe('gap');
    expect((await scroll(shown(page, 'wide'))).left).toBe(90);
    for (const part of [header(page, 'wide'), shown(page, 'wide'), attachment(page, 'wide')]) expect(await css(part, 'transition-duration')).toBe('0s');
    // Unknown: auto, and a debug build says so.
    await host(page, 'wide').evaluate((el) => ((el as unknown as { separation: string }).separation = 'dotted'));
    await expect.poll(() => form(page, 'wide')).toBe('divider');
    await expect.poll(() => seen.filter((m) => m.includes('FIG-12') && m.includes('"dotted"')).length).toBe(1);
  });

  test('FIG-12: where the browser has no style queries the element names the tokens’ separation on the figure, and the same rules draw it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('attachment', 'separation-gap') });
    const queries = await page.evaluate(() => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('@container style(--probe: on) { #probe-inner { --answer: yes; } }');
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      document.body.insertAdjacentHTML('beforeend', '<div style="--probe: on"><div id="probe-inner"></div></div>');
      return getComputedStyle(document.querySelector('#probe-inner')!).getPropertyValue('--answer').trim() === 'yes';
    });
    expect(await figure(page, 'attachment').getAttribute('data-separation')).toBe(queries ? null : 'divider');
    expect(await figure(page, 'separation-gap').getAttribute('data-separation')).toBe(queries ? null : 'gap');
    expect([await form(page, 'attachment'), await form(page, 'separation-gap')]).toEqual(['divider', 'gap']);
    // The attribute alone draws the gap form, whatever the browser.
    await figure(page, 'attachment').evaluate((el) => el.setAttribute('data-separation', 'gap'));
    expect(await form(page, 'attachment')).toBe('gap');
  });

  test('FIG-13: while the separation is divider and the look is not plain, a line of divider.thickness in divider.color across the frame between the header and the stage and between the stage and the attachment, wherever both are present, the attachment flush against it; while it is gap, no line, the header’s padding the only space under it, and the attachment set in by attachment.gap from the stage and from the frame’s inline and lower edges', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: some('separation-divider', 'separation-gap', 'filled-separation-gap', 'title', 'filled-attachment', 'outlined') });
    const [thickness, gap, color] = [await resolveToken(page, T('divider-thickness')), await resolveToken(page, T('attachment-gap')), await resolveColor(page, T('divider-color'))];
    // Divider: both lines, across the frame's whole inline size.
    const id = 'separation-divider';
    const f = await edges(frame(page, id));
    for (const part of [header(page, id), shown(page, id)]) {
      expect(await px(part, 'border-bottom-width')).toBe(thickness);
      expect(await css(part, 'border-bottom-style')).toBe('solid');
      expect(await css(part, 'border-bottom-color')).toBe(color);
      near((await edges(part)).width, f.width, 0.1);
    }
    near((await edges(attachment(page, id))).top, (await edges(shown(page, id))).bottom, 0.1);
    near((await edges(attachment(page, id))).width, f.width, 0.1);
    // Wherever both parts of a pair are present: a title alone has the header's line and the stage none; an
    // attachment alone has the stage's line; neither has none.
    expect([await px(header(page, 'title'), 'border-bottom-width'), await px(shown(page, 'title'), 'border-bottom-width')]).toEqual([thickness, 0]);
    expect(await px(shown(page, 'filled-attachment'), 'border-bottom-width')).toBe(thickness);
    expect(await px(shown(page, 'outlined'), 'border-bottom-width')).toBe(0);
    // Gap: no line; the attachment set in from the stage, the inline edges and the lower edge, with its own shape.
    for (const each of ['separation-gap', 'filled-separation-gap']) {
      const [frameBox, stageBox, joined] = [await edges(frame(page, each)), await edges(shown(page, each)), await edges(attachment(page, each))];
      expect([await px(header(page, each), 'border-bottom-width'), await px(shown(page, each), 'border-bottom-width')]).toEqual([0, 0]);
      near(joined.top - stageBox.bottom, gap, 0.1);
      near(joined.left - frameBox.left, gap, 0.1);
      near(frameBox.right - joined.right, gap, 0.1);
      near(frameBox.bottom - joined.bottom, gap, 0.1);
      // The header's own padding is the only space between it and the stage.
      near(stageBox.top, (await edges(header(page, each))).bottom, 0.1);
      expect(await px(header(page, each), 'padding-bottom')).toBe(await resolveToken(page, T('header-padding-block')));
      near(await px(attachment(page, each).locator('.fixture-attachment'), 'border-top-left-radius'), await resolveToken(page, '--tanrei-sys-shape-corner-small'), 0.01);
    }
  });

  test('FIG-14: the plain look draws no line whatever the separation is, its header without inline padding so that the title begins at the figure’s start edge, caption.gap above the stage, and its attachment attachment.gap below the stage across the figure’s whole inline size', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('plain-title-attachment'), { ...fixture('plain-title-attachment'), id: 'plain-divider', props: { ...fixture('plain-title-attachment').props, separation: 'divider' } }, { ...fixture('plain-title-attachment'), id: 'plain-gap', props: { ...fixture('plain-title-attachment').props, separation: 'gap' } }] });
    const [captionGap, gap] = [await resolveToken(page, T('caption-gap')), await resolveToken(page, T('attachment-gap'))];
    for (const id of ['plain-title-attachment', 'plain-divider', 'plain-gap']) {
      const wrapper = await edges(host(page, id));
      expect([await px(header(page, id), 'border-bottom-width'), await px(shown(page, id), 'border-bottom-width')], id).toEqual([0, 0]);
      near((await textBox(title(page, id))).left, wrapper.left, 1);
      expect([await px(header(page, id), 'padding-left'), await px(header(page, id), 'padding-right'), await px(header(page, id), 'padding-top')]).toEqual([0, 0, 0]);
      near((await edges(shown(page, id))).top - (await edges(title(page, id))).bottom, captionGap, 0.1);
      const joined = await edges(attachment(page, id));
      near(joined.top - (await edges(shown(page, id))).bottom, gap, 0.1);
      near(joined.left, wrapper.left, 0.1);
      near(joined.width, wrapper.width, 0.1);
      near((await edges(caption(page, id))).top - joined.bottom, captionGap, 0.1);
      // It keeps the shape it has by itself: the frame clips nothing in the plain look.
      expect(await css(frame(page, id), 'overflow-x')).toBe('visible');
    }
  });
});

test.describe('input, what is exposed, changes and layout', () => {
  test('FIG-15: the figure takes no input of its own and changes nothing it draws under a pointer, a press or focus, and emits no event; what stands in it stays as operable and in the same focus order — the actions, the stage’s content, the attachment’s, then the caption’s', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fx('own', {}, { title: 'Variants', actions: BUTTON('contrast', 'in-actions'), stage: '<button id="in-stage" type="button">in the stage</button>', attachment: '<a id="in-attachment" href="#a">in the attachment</a>', caption: 'With <a id="in-caption" href="#c">a link in the caption</a>.' })],
    });
    await page.waitForFunction(() => !!customElements.get('tanrei-button'));
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('afterbegin', '<button id="before">before</button>');
      const w = window as unknown as { __events: string[] };
      w.__events = [];
      for (const name of ['change', 'input', 'toggle', 'select', 'close', 'open']) document.querySelector('main')!.addEventListener(name, (event) => w.__events.push(event.type), true);
    });
    const parts = [host(page, 'own'), figure(page, 'own'), frame(page, 'own'), header(page, 'own'), title(page, 'own'), shown(page, 'own'), caption(page, 'own')];
    for (const part of parts) expect(await part.evaluate((el) => [(el as HTMLElement).tabIndex, el.hasAttribute('tabindex'), getComputedStyle(el).cursor])).toEqual([-1, false, 'auto']);
    const look = () => Promise.all(parts.map((part) => part.evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.outlineStyle, s.outlineColor, s.boxShadow, s.opacity, getComputedStyle(el, '::before').content, getComputedStyle(el, '::after').content].join('|'); })));
    const rest = await look();
    await title(page, 'own').hover();
    expect(await look()).toEqual(rest);
    await page.mouse.down();
    expect(await look()).toEqual(rest);
    await page.mouse.up();
    await caption(page, 'own').hover({ position: { x: 2, y: 2 } });
    expect(await look()).toEqual(rest);
    // The focus order is the order of the parts.
    await page.locator('#before').focus();
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      await tab(page);
      order.push(await page.evaluate(() => document.activeElement?.id ?? ''));
    }
    expect(order).toEqual(['in-actions', 'in-stage', 'in-attachment', 'in-caption']);
    expect(await look()).toEqual(rest);
    // Input reaches what stands there.
    await page.evaluate(() => document.querySelector('#in-stage')!.addEventListener('click', () => document.body.setAttribute('data-pressed', '')));
    await page.locator('#in-stage').click();
    await expect(page.locator('body')).toHaveAttribute('data-pressed', '');
    expect(await page.evaluate(() => (window as unknown as { __events: string[] }).__events)).toEqual([]);
  });

  test('FIG-16: the figure is a figure named by its title, by its caption where it has no title, and by label otherwise; with both, the caption is its description and still read in its place; label is never drawn; a picture keeps its own text alternative; with none of the three it has no name, and that is reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('title', 'caption', 'title-caption', 'outlined', 'actions'), fx('nameless', {}, {}), fx('pictured', {}, { stage: picture(100, 50, 'A harbour at low tide'), caption: 'Where the boats rest.' }), raw('label-and-title', { label: 'Ignored', title: 'The title' }, native({}))] });
    // Its title.
    await expect(stage(page, 'title').getByRole('figure', { name: 'Variants', exact: true })).toHaveCount(1);
    await expect(figure(page, 'title')).toHaveAttribute('aria-labelledby', (await title(page, 'title').getAttribute('id')) as string);
    // Its caption: the figure names its caption as its label — a browser does not name a figure by its figcaption in the
    // tree it gives assistive technology — and the caption is no description of what it already names.
    await expect(stage(page, 'caption').getByRole('figure', { name: 'The medium corner, on a card.', exact: true })).toHaveCount(1);
    expect(await figure(page, 'caption').evaluate((el) => [el.getAttribute('aria-labelledby'), el.hasAttribute('aria-describedby'), el.hasAttribute('aria-label'), el.getAttribute('role')])).toEqual([(await caption(page, 'caption').getAttribute('id')) as string, false, false, null]);
    expect(await caption(page, 'caption').getAttribute('id')).toBeTruthy();
    // Both: the title is the name, the caption the description, and the caption is still text in its place.
    const both = stage(page, 'title-caption').getByRole('figure', { name: 'Revenue by quarter', exact: true });
    await expect(both).toHaveCount(1);
    await expect(both).toHaveAccessibleDescription('Every region grew; the north grew fastest.');
    await expect(caption(page, 'title-caption')).toBeVisible();
    expect(await caption(page, 'title-caption').evaluate((el) => [el.getAttribute('aria-hidden'), el.localName])).toEqual([null, 'figcaption']);
    // Label: the name of a figure that draws neither, never drawn.
    await expect(stage(page, 'outlined').getByRole('figure', { name: 'A specimen', exact: true })).toHaveCount(1);
    await expect(stage(page, 'outlined').getByText('A specimen')).toHaveCount(0);
    // FIG-25: ignored where a title or a caption is given.
    await expect(stage(page, 'label-and-title').getByRole('figure', { name: 'The title', exact: true })).toHaveCount(1);
    expect(await figure(page, 'label-and-title').getAttribute('aria-label')).toBeNull();
    // A picture's alternative is the picture's own.
    await expect(stage(page, 'pictured').getByRole('img', { name: 'A harbour at low tide' })).toHaveCount(1);
    await expect(stage(page, 'pictured').getByRole('figure', { name: 'Where the boats rest.', exact: true })).toHaveCount(1);
    // Everything stays exposed, in the reading order: the header's, the stage's, the caption's.
    await expect(stage(page, 'actions').getByRole('figure', { name: 'Variants' }).getByRole('button')).toHaveCount(2);
    // No name at all: exposed without one, and reported.
    await expect(stage(page, 'nameless').getByRole('figure')).toHaveCount(1);
    await expect.poll(() => seen.filter((m) => m.includes('FIG-16') && m.includes('no name')).length).toBe(1);
  });

  test('FIG-16: in the tree the browser gives assistive technology each figure has its name — its title, its caption where it has no title, label where it draws neither — and a caption that names is not its description too; a title given later takes the name and the caption becomes the description; a name the product wrote on the figure itself is left alone', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read through the Chromium protocol');
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...some('title', 'caption', 'title-caption', 'outlined'), fx('pictured', {}, { stage: picture(100, 50, 'A harbour at low tide'), caption: 'Where the boats rest.' }), raw('own-name', {}, '<figure aria-label="The product’s own"><div data-part="stage">x</div><figcaption>Its caption</figcaption></figure>')],
    });
    const tree = async () => {
      const client = await page.context().newCDPSession(page);
      await client.send('Accessibility.enable');
      const { nodes } = await client.send('Accessibility.getFullAXTree');
      await client.detach();
      return nodes.filter((node) => !node.ignored && node.role?.value === 'figure').map((node) => [String(node.name?.value ?? ''), String(node.description?.value ?? '')]);
    };
    expect(await tree()).toEqual([
      ['Variants', ''],
      ['The medium corner, on a card.', ''],
      ['Revenue by quarter', 'Every region grew; the north grew fastest.'],
      ['A specimen', ''],
      ['Where the boats rest.', ''],
      ['The product’s own', ''],
    ]);
    // A title given later is the name, and the caption its description; taken away again, the caption names.
    await host(page, 'caption').evaluate((el: HTMLElement & { headline: string }) => (el.headline = 'A title'));
    await expect.poll(async () => (await tree())[1]).toEqual(['A title', 'The medium corner, on a card.']);
    await host(page, 'caption').evaluate((el: HTMLElement & { headline: string }) => (el.headline = ''));
    await expect.poll(async () => (await tree())[1]).toEqual(['The medium corner, on a card.', '']);
  });

  test('FIG-17: a title, a caption, a look, inset or content that changes is drawn and exposed at once, without a motion, the stage’s scroll kept, and nothing announces the change', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [raw('own', { title: 'Before', caption: 'A caption' }, native({ stage: `${BOX(900)}` }))] });
    await size(page, 'own', 320);
    const element = host(page, 'own');
    await shown(page, 'own').evaluate((el) => (el.scrollLeft = 120));
    await element.evaluate((el) => ((el as unknown as { headline: string }).headline = 'After'));
    await expect(title(page, 'own')).toHaveText('After');
    await expect(stage(page, 'own').getByRole('figure', { name: 'After', exact: true })).toHaveCount(1);
    await element.evaluate((el) => ((el as unknown as { caption: string }).caption = 'Another caption'));
    await expect(caption(page, 'own')).toHaveText('Another caption');
    await expect(stage(page, 'own').getByRole('figure', { name: 'After' })).toHaveAccessibleDescription('Another caption');
    await element.evaluate((el) => ((el as unknown as { variant: string }).variant = 'filled'));
    await expect.poll(() => css(frame(page, 'own'), 'background-color')).toBe(await resolveColor(page, T('filled-container-color')));
    await element.evaluate((el) => ((el as unknown as { inset: boolean }).inset = false));
    await expect(element).toHaveAttribute('flush', '');
    await expect.poll(() => px(shown(page, 'own'), 'padding-top')).toBe(0);
    await element.evaluate((el) => ((el as unknown as { inset: boolean }).inset = true));
    await expect.poll(() => px(shown(page, 'own'), 'padding-top')).toBe(await resolveToken(page, T('stage-padding-block')));
    // The title and the caption taken away again.
    await element.evaluate((el) => ((el as unknown as { headline: string }).headline = ''));
    await expect(header(page, 'own')).toBeHidden();
    await expect(stage(page, 'own').getByRole('figure', { name: 'Another caption', exact: true })).toHaveCount(1);
    expect((await scroll(shown(page, 'own'))).left).toBe(120);
    for (const part of [element, figure(page, 'own'), frame(page, 'own'), shown(page, 'own'), caption(page, 'own')]) {
      expect(await css(part, 'transition-duration')).toBe('0s');
      expect(await css(part, 'animation-name')).toBe('none');
      expect(await part.evaluate((el) => [el.getAttribute('aria-live'), el.getAttribute('aria-atomic')])).toEqual([null, null]);
    }
  });

  test('FIG-18: the figure is a block in the flow that takes the whole inline size its container gives it, with its start edge on the text’s, no outer space, no minimum or maximum width and no measure of its own; it never floats, sticks or rises above the page', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...some('caption', 'plain-caption'), fx('wide', {}, { stage: BOX(900), caption: 'Never wider than its container.' })] });
    await page.evaluate(() => {
      const grid = document.createElement('div');
      grid.id = 'grid';
      grid.style.cssText = 'display: grid; grid-template-columns: 200px 1fr; gap: 8px; inline-size: 600px';
      grid.innerHTML = '<tanrei-figure id="cell"><figure><div data-part="frame"><div data-part="stage">In a cell</div></div><figcaption>A cell of the product’s grid</figcaption></figure></tanrei-figure><p id="text">Text beside it</p>';
      document.body.append(grid);
    });
    for (const id of ['caption', 'plain-caption', 'wide']) {
      const [outer, wrapper] = [await edges(stage(page, id)), await edges(host(page, id))];
      near(wrapper.left, outer.left + 16, 0.1);
      near(wrapper.width, outer.width - 32, 0.1);
      for (const part of [host(page, id), figure(page, id)]) expect(await part.evaluate((el) => ['top', 'right', 'bottom', 'left'].map((side) => getComputedStyle(el).getPropertyValue(`margin-${side}`)))).toEqual(Array(4).fill('0px'));
      expect(await host(page, id).evaluate((el) => { const s = getComputedStyle(el); return [s.display, s.float, s.position, s.minWidth, s.zIndex]; })).toEqual(['block', 'none', 'static', '0px', 'auto']);
      near(wrapper.bottom, outer.bottom - 16, 0.1);
      near(wrapper.top, outer.top + 16, 0.1);
    }
    // In a cell of the product's grid it is the cell's width; a wider container gives it more.
    near((await edges(page.locator('#cell'))).width, 200, 0.1);
    await size(page, 'caption', 700);
    near((await edges(frame(page, 'caption'))).width, 700, 0.1);
    near((await edges(frame(page, 'wide'))).width, (await edges(host(page, 'wide'))).width, 0.1);
  });

  test('no axe violations in light and dark', async ({ page }) => {
    test.setTimeout(120_000);
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      await page.waitForFunction(() => !!customElements.get('tanrei-button'));
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('text size, forced colors, direction, unknown values', () => {
  test('FIG-19: at 200 % text and a 320 wide window the title and the caption grow and wrap, paddings, gaps and lines are kept, nothing is cut and no height is fixed, the actions move below the title and content that cannot shrink scrolls inside the stage; nothing that holds the figure scrolls sideways; raised text spacing loses nothing', async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 320, height: 800 });
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, fx('wide', {}, { title: 'A wide thing', stage: BOX(900), caption: 'It scrolls in its stage.' })] });
    await page.waitForFunction(() => !!customElements.get('tanrei-button'));
    const normal = { title: await px(title(page, 'title'), 'font-size'), caption: await px(caption(page, 'caption'), 'font-size'), pad: await px(shown(page, 'title'), 'padding-top'), line: await px(header(page, 'title'), 'border-bottom-width'), gap: await px(caption(page, 'caption'), 'margin-top') };
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await drawnFrame(page);
    expect(await px(title(page, 'title'), 'font-size')).toBe(normal.title * 2);
    expect(await px(caption(page, 'caption'), 'font-size')).toBe(normal.caption * 2);
    expect(await px(shown(page, 'title'), 'padding-top')).toBeGreaterThanOrEqual(normal.pad);
    expect(await px(header(page, 'title'), 'border-bottom-width')).toBeGreaterThanOrEqual(normal.line);
    expect(await px(caption(page, 'caption'), 'margin-top')).toBeGreaterThanOrEqual(normal.gap);
    const whole = async (label: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth), label).toBeLessThanOrEqual(320);
      for (const f of [...spec.fixtures.map((each) => each.id), 'wide']) {
        expect(await stage(page, f).evaluate((el) => el.scrollWidth <= el.clientWidth), `${label} ${f}`).toBe(true);
        near((await edges(host(page, f))).width, 288, 0.1);
        // Nothing cut: the title and the caption hold their text, inside the figure, and no part has a fixed height.
        const cut = await figure(page, f).evaluate((el) => {
          const bounds = el.getBoundingClientRect();
          return [...el.querySelectorAll(':scope > [data-part="frame"] > header > [data-part="title"], :scope > figcaption')].filter((part) => {
            const s = getComputedStyle(part);
            const range = document.createRange();
            range.selectNodeContents(part);
            const [outer, inner] = [part.getBoundingClientRect(), range.getBoundingClientRect()];
            return s.overflow !== 'visible' || s.textOverflow !== 'clip' || inner.bottom > outer.bottom + 1 || inner.top < outer.top - 1 || inner.right > bounds.right + 1 || inner.left < bounds.left - 1;
          }).length;
        });
        expect(cut, `${label} ${f}`).toBe(0);
      }
    };
    await whole('200 %');
    // The actions move below the title, and the header grows.
    expect((await edges(actions(page, 'long-title-actions'))).top).toBeGreaterThanOrEqual((await edges(title(page, 'long-title-actions'))).bottom);
    expect((await edges(actions(page, 'long-title-actions'))).right).toBeLessThanOrEqual((await edges(header(page, 'long-title-actions'))).right + 0.5);
    expect(await lines(caption(page, 'long-caption'))).toBeGreaterThan(5);
    // What cannot shrink scrolls inside the stage, which is then a focus stop.
    const at = await scroll(shown(page, 'wide'));
    expect(at.width).toBeGreaterThan(at.clientWidth);
    await expect(shown(page, 'wide')).toHaveAttribute('tabindex', '0');
    // The reader's own spacing (WCAG 1.4.12).
    await page.addStyleTag({ content: 'tanrei-figure :is([data-part="title"], figcaption) { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } tanrei-figure p { margin-block-end: 2em !important; }' });
    await drawnFrame(page);
    await whole('text spacing');
  });

  test('FIG-20: in forced colors the outlined and the filled looks have an edge of outline.width in the text color and the plain look none; the lines, the title and the caption are the text color, a link the link color and still underlined, and the stage’s focus ring the platform’s own color for focus', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('outlined', 'filled', 'plain', 'separation-divider', 'filled-title-caption'), fx('wide', {}, { title: 'Wide', stage: BOX(900), caption: 'With <a id="link" href="#x">a link</a>.' })] });
    await size(page, 'wide', 320);
    const [canvasText, linkText, highlight, width] = [await systemColor(page, 'CanvasText'), await systemColor(page, 'LinkText'), await systemColor(page, 'Highlight'), await resolveToken(page, T('outline-width'))];
    // The verify: outlined and filled have a visible edge in CanvasText; plain has none.
    for (const id of ['outlined', 'filled', 'filled-title-caption']) {
      expect([await px(frame(page, id), 'outline-width'), await css(frame(page, id), 'outline-style'), await css(frame(page, id), 'outline-color')], id).toEqual([width, 'solid', canvasText]);
    }
    expect(await px(frame(page, 'plain'), 'outline-width')).toBe(0);
    // The lines of FIG-13, the title and the caption.
    expect(await css(header(page, 'separation-divider'), 'border-bottom-color')).toBe(canvasText);
    expect(await css(shown(page, 'separation-divider'), 'border-bottom-color')).toBe(canvasText);
    // The text is the platform's to repaint; a browser whose emulation answers the media query and repaints nothing
    // (WebKit) still draws the edges and the lines above, which are this stylesheet's.
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    if (forced) {
      expect(await css(title(page, 'separation-divider'), 'color')).toBe(canvasText);
      expect(await css(caption(page, 'separation-divider'), 'color')).toBe(canvasText);
      expect(await css(page.locator('#link'), 'color')).toBe(linkText);
    }
    expect(await css(page.locator('#link'), 'text-decoration-line')).toBe('underline');
    // No part relies on a background color.
    for (const id of ['outlined', 'filled', 'separation-divider']) expect(await figure(page, id).evaluate((el) => [...el.querySelectorAll(':scope > *, :scope > [data-part="frame"] > *')].every((part) => getComputedStyle(part).backgroundImage === 'none'))).toBe(true);
    await tabTo(page, shown(page, 'wide'));
    expect(await css(shown(page, 'wide'), 'outline-color')).toBe(highlight);
  });

  test('FIG-21: in a right-to-left layout the header is mirrored — the title at the right, the actions at the left, the paddings by start and end — the caption is drawn from the right, the stage’s scroll begins at the right, a plain figure’s narrow content is at the right, and nothing shown in the stage or the attachment is mirrored, reordered or realigned', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('actions-rtl', 'plain-caption-rtl', 'attachment-rtl'), fx('plain-narrow', { variant: 'plain' }, { stage: `${BOX(40)}`, caption: 'في البداية' }, { direction: 'rtl' }), fx('wide', {}, { title: 'عريض', stage: BOX(900, 'wide-box') }, { direction: 'rtl' })] });
    await page.waitForFunction(() => !!customElements.get('tanrei-button'));
    await size(page, 'wide', 320);
    await size(page, 'plain-narrow', 400);
    const [inline, withActions] = [await resolveToken(page, T('header-padding-inline')), await resolveToken(page, T('header-padding-inline-end-with-actions'))];
    const [h, t, a] = [await edges(header(page, 'actions-rtl')), await textBox(title(page, 'actions-rtl')), await edges(actions(page, 'actions-rtl'))];
    near(t.right, h.right - inline, 1);
    near(a.left, h.left + withActions, 0.1);
    expect(a.right).toBeLessThan(t.left);
    // The caption from the right edge.
    near((await textBox(caption(page, 'actions-rtl'))).right, (await edges(host(page, 'actions-rtl'))).right, 1);
    near((await textBox(caption(page, 'plain-caption-rtl'))).right, (await edges(host(page, 'plain-caption-rtl'))).right, 1);
    // The scroll begins at the right edge.
    expect((await scroll(shown(page, 'wide'))).left).toBe(0);
    near((await edges(page.locator('#wide-box'))).right, (await edges(shown(page, 'wide'))).right - (await resolveToken(page, T('stage-padding-inline'))), 0.1);
    // A plain figure's narrow content at the right edge.
    near((await edges(page.locator('[data-fixture="plain-narrow"] #box'))).right, (await edges(host(page, 'plain-narrow'))).right, 0.1);
    // Top and bottom do not change, and nothing shown is mirrored.
    expect((await edges(header(page, 'attachment-rtl'))).top).toBeLessThan((await edges(shown(page, 'attachment-rtl'))).top);
    expect((await edges(attachment(page, 'attachment-rtl'))).top).toBeGreaterThan((await edges(shown(page, 'attachment-rtl'))).top);
    for (const part of [shown(page, 'actions-rtl'), attachment(page, 'attachment-rtl'), shown(page, 'plain-caption-rtl').locator('.fixture-picture')]) expect(await css(part, 'transform')).toBe('none');
    const specimen = await ends(shown(page, 'actions-rtl').locator('.fixture-specimen'));
    expect(specimen.first).toBeLessThan(specimen.last);
  });

  test('FIG-22: the direction is that of the nearest ancestor that sets one — the figure has no setting of its own — and a change of it is drawn at once, keeping what it shows; a direction set on the stage’s content alone changes that content and nothing of the figure’s', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...some('actions-rtl', 'actions'), { ...fixture('actions'), id: 'turned' }, fx('inner-rtl', {}, { title: 'A title', actions: BUTTON('contrast'), stage: '<div id="example" dir="rtl" style="inline-size: 200px">مثال <span id="inner">abc</span></div>', caption: 'A caption' })] });
    await page.waitForFunction(() => !!customElements.get('tanrei-button'));
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    expect(await host(page, 'actions-rtl').evaluate((el) => [el.getAttribute('dir'), 'direction' in el, getComputedStyle(el).direction])).toEqual([null, false, 'rtl']);
    const side = async (id: string) => ((await edges(title(page, id))).left < (await edges(actions(page, id))).left ? 'title at the left' : 'title at the right');
    expect([await side('actions-rtl'), await side('actions'), await side('turned')]).toEqual(['title at the right', 'title at the left', 'title at the left']);
    // Changed after the first render.
    await stage(page, 'turned').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await side('turned')).toBe('title at the right');
    await expect(title(page, 'turned')).toHaveText('Variants');
    expect(await css(header(page, 'turned'), 'transition-duration')).toBe('0s');
    await stage(page, 'turned').evaluate((el) => el.removeAttribute('dir'));
    expect(await side('turned')).toBe('title at the left');
    // On a child of the stage: the header and the caption stay as the page's direction puts them.
    expect(await side('inner-rtl')).toBe('title at the left');
    near((await textBox(caption(page, 'inner-rtl'))).left, (await edges(host(page, 'inner-rtl'))).left, 1);
    expect(await css(page.locator('#example'), 'direction')).toBe('rtl');
    expect(await css(shown(page, 'inner-rtl'), 'direction')).toBe('ltr');
  });

  test('FIG-23: the title and the caption are each text of their own direction, isolated, placed by the layout direction and wrapped, never cut: a left-to-right name and a number with its unit keep their order in a right-to-left layout', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('ltr-title-rtl', 'actions-rtl') });
    const id = 'ltr-title-rtl';
    for (const part of [title(page, id), caption(page, id)]) {
      expect(await css(part, 'unicode-bidi')).toBe('plaintext');
      const drawn = await ends(part);
      expect(drawn.first, (await part.textContent()) as string).toBeLessThan(drawn.last);
      expect(await css(part, 'text-align')).toBe('right');
      expect(await css(part, 'text-overflow')).toBe('clip');
    }
    // Placed by the layout direction: at the right.
    near((await textBox(title(page, id))).right, (await edges(header(page, id))).right - (await resolveToken(page, T('header-padding-inline'))), 1);
    near((await textBox(caption(page, id))).right, (await edges(host(page, id))).right, 1);
    expect(await caption(page, id).textContent()).toBe('comp.button.container.height.medium: 40px');
    // An Arabic title reads from the right.
    const arabic = await ends(title(page, 'actions-rtl'));
    expect(arabic.first).toBeGreaterThan(arabic.last);
  });

  test('FIG-24: a variant the active design system does not have renders with the default variant’s tokens and is reported; one a design system adds is drawn from its tokens', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { fixtures: [{ ...fixture('outlined'), id: 'unknown', props: { variant: 'glass', label: 'Unknown' } }, { ...fixture('outlined'), id: 'added', props: { variant: 'tinted', label: 'Added' } }, ...some('outlined')] });
    expect(await css(frame(page, 'unknown'), 'background-color')).toBe(await css(frame(page, 'outlined'), 'background-color'));
    expect(await px(frame(page, 'unknown'), 'outline-width')).toBe(await px(frame(page, 'outlined'), 'outline-width'));
    expect(await px(shown(page, 'unknown'), 'padding-top')).toBe(await px(shown(page, 'outlined'), 'padding-top'));
    await expect.poll(() => seen.filter((m) => m.includes('FIG-24') && m.includes('"glass"')).length).toBe(1);
    await override(page, { [T('tinted-container-color')]: 'rgb(10, 20, 30)' });
    await host(page, 'added').evaluate((el) => {
      (el as unknown as { variant: string }).variant = 'outlined';
    });
    await drawnFrame(page);
    await host(page, 'added').evaluate((el) => {
      (el as unknown as { variant: string }).variant = 'tinted';
    });
    await expect.poll(() => css(frame(page, 'added'), 'background-color')).toBe('rgb(10, 20, 30)');
  });

  test('FIG-25: a figure whose stage holds nothing draws nothing, takes no space and exposes nothing, and that is reported — a title, a caption or an attachment alone is not a figure; label is ignored while a title or a caption is given', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fx('empty', {}, { title: 'A title', stage: '', attachment: 'joined', caption: 'A caption' }),
        fx('blank', {}, { title: 'A title', stage: '   \n  ', caption: 'A caption' }),
        raw('no-stage', {}, '<figure><figcaption>A caption alone</figcaption></figure>'),
        raw('nothing', { title: 'A title', caption: 'A caption' }, '<!--children-->'),
        raw('labelled', { label: 'Ignored' }, native({ caption: 'The caption names it' })),
      ],
    });
    await drawnFrame(page);
    for (const id of ['empty', 'blank', 'no-stage', 'nothing']) {
      expect((await edges(host(page, id))).height, id).toBe(0);
      await expect(stage(page, id).getByRole('figure'), id).toHaveCount(0);
      await expect(stage(page, id).getByText('A caption')).toBeHidden();
      near((await edges(stage(page, id))).height, 32, 0.1);
    }
    await expect.poll(() => seen.filter((m) => m.includes('FIG-25') && m.includes('shows nothing')).length).toBe(4);
    // Content that arrives is drawn (FIG-17).
    await shown(page, 'blank').evaluate((el) => (el.textContent = 'Now there is something'));
    await expect(stage(page, 'blank').getByRole('figure', { name: 'A title' })).toHaveCount(1);
    expect((await edges(host(page, 'blank'))).height).toBeGreaterThan(0);
    // label is ignored where a caption is given.
    await expect(stage(page, 'labelled').getByRole('figure', { name: 'The caption names it', exact: true })).toHaveCount(1);
    expect(await figure(page, 'labelled').getAttribute('aria-label')).toBeNull();
  });
});

test.describe('the element and its stylesheet', () => {
  /** The fixtures' document with the stylesheet a page loads and no script: the figure before its element is defined. */
  const withoutScript = async (page: P, fixtures: Fixture[]) => {
    const document = await fixturesDocument(spec, { fixtures });
    const script = document.lastIndexOf('<script type="module">');
    await page.setContent(`${document.slice(0, script)}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
  };
  const geometry = (page: P) =>
    page.evaluate(() =>
      [...document.querySelectorAll('.stage')].map((s) => [
        (s as HTMLElement).dataset.fixture,
        // Each part's place in its own stage.
        ...[s, ...s.querySelectorAll('tanrei-figure, figure, [data-part], header, figcaption')].map((part) => {
          const [r, origin] = [part.getBoundingClientRect(), s.getBoundingClientRect()];
          return [r.left - origin.left, r.top - origin.top, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(' ');
        }),
      ]),
    );

  test('the stylesheet alone draws every fixture, and defining the element moves nothing (FIG-1, FIG-17)', async ({ page }) => {
    // A fixture with actions holds Buttons, whose own definition draws them: those are left out of this measure.
    const fixtures = spec.fixtures.filter((f) => !f.slots?.actions);
    await withoutScript(page, fixtures);
    expect(await page.evaluate(() => customElements.get('tanrei-figure'))).toBeUndefined();
    // Drawn without script: the looks, the paddings, the header and its line, the joined block, the caption.
    expect(await css(frame(page, 'filled'), 'background-color')).toBe(await resolveColor(page, T('filled-container-color')));
    expect(await px(frame(page, 'outlined'), 'outline-width')).toBe(await resolveToken(page, T('outline-width')));
    expect(await px(shown(page, 'outlined'), 'padding-top')).toBe(await resolveToken(page, T('stage-padding-block')));
    expect(await px(shown(page, 'flush'), 'padding-top')).toBe(0);
    expect(await px(header(page, 'title'), 'border-bottom-width')).toBe(await resolveToken(page, T('divider-thickness')));
    expect(await px(attachment(page, 'filled-separation-gap'), 'margin-left')).toBe(await resolveToken(page, T('attachment-gap')));
    expect(await px(caption(page, 'caption'), 'margin-top')).toBe(await resolveToken(page, T('caption-gap')));
    near(await px(frame(page, 'outlined'), 'border-top-left-radius'), await resolveToken(page, T('container-shape')), 0.01);
    await expect(stage(page, 'caption').getByRole('figure', { name: 'The medium corner, on a card.' })).toHaveCount(1);
    const before = await geometry(page);
    await page.addScriptTag({ content: fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js'), 'utf8'), type: 'module' });
    await page.waitForFunction(() => !!customElements.get('tanrei-figure'));
    await drawnFrame(page);
    await expect(figure(page, 'title')).toHaveAttribute('aria-labelledby', /.+/);
    expect(await geometry(page)).toEqual(before);
  });

  test('a figure the element builds — its children the stage, those that name a part with slot in that part, headline and caption as the title and the caption — is drawn as the native form is; children added later go the same way (FIG-8, FIG-10, FIG-11)', async ({ page }) => {
    const built = `<!--children--><span slot="actions">${BUTTON('contrast')}</span><div slot="attachment" class="fixture-attachment">joined</div><span class="fixture-specimen">Specimen</span>`;
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [raw('built', { separation: 'divider', title: 'Variants', caption: 'A filled button and its markup.' }, built), fx('written', { separation: 'divider' }, { title: 'Variants', actions: `<span>${BUTTON('contrast')}</span>`, stage: '<span class="fixture-specimen">Specimen</span>', attachment: '<div class="fixture-attachment">joined</div>', caption: 'A filled button and its markup.' })],
    });
    await page.waitForFunction(() => !!customElements.get('tanrei-button'));
    await expect(figure(page, 'built')).toHaveCount(1);
    const boxes = async (id: string) => {
      const origin = await edges(stage(page, id));
      const parts = [frame(page, id), header(page, id), title(page, id), actions(page, id), shown(page, id), attachment(page, id), caption(page, id)];
      return Promise.all(parts.map(async (part) => { const e = await edges(part); return [e.left - origin.left, e.top - origin.top, e.width, e.height].map((n) => Math.round(n * 100) / 100); }));
    };
    expect(await boxes('built')).toEqual(await boxes('written'));
    await expect(stage(page, 'built').getByRole('figure', { name: 'Variants', exact: true })).toHaveAccessibleDescription('A filled button and its markup.');
    expect(await host(page, 'built').evaluate((el) => [...el.children].map((child) => child.localName))).toEqual(['figure']);
    // Added later: to the stage, or to the part its slot names.
    await host(page, 'built').evaluate((el) => {
      el.insertAdjacentHTML('beforeend', '<em id="later">later</em><span id="later-caption" slot="caption">A caption of the product’s own</span>');
    });
    await expect(shown(page, 'built').locator('#later')).toHaveCount(1);
    await expect(caption(page, 'built')).toHaveCount(1);
    await expect(caption(page, 'built')).toHaveText('A caption of the product’s own');
  });

  test('the element brings its stylesheet to the root it is connected to: a figure in another component’s shadow root is drawn, named and a focus stop while its stage scrolls (FIG-2, FIG-6, FIG-16)', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: some('outlined') });
    await page.evaluate(() => {
      const outer = document.createElement('div');
      outer.id = 'outer';
      outer.style.inlineSize = '300px';
      const root = outer.attachShadow({ mode: 'open' });
      root.innerHTML = '<tanrei-figure variant="filled"><figure><div data-part="frame"><header><p data-part="title">In a shadow root</p></header><div data-part="stage"><div style="flex: none; inline-size: 900px; block-size: 20px"></div></div></div><figcaption>Its caption</figcaption></figure></tanrei-figure>';
      document.body.append(outer);
    });
    const inner = page.locator('#outer tanrei-figure');
    await expect(inner.locator('[data-part="stage"]')).toHaveAttribute('role', 'group');
    expect(await css(inner.locator('[data-part="frame"]'), 'background-color')).toBe(await resolveColor(page, T('filled-container-color')));
    expect(await inner.evaluate((el) => (el.getRootNode() as ShadowRoot).adoptedStyleSheets.length)).toBeGreaterThan(0);
    await expect(inner.locator('figure')).toHaveAttribute('aria-describedby', /.+/);
  });

  test('the documentation’s composition: Tanrei’s own tabs in the actions, a row of examples scoped to a preset and drawn right-to-left in the stage, a code block joined beneath, the preset named in the caption (FIG-9, FIG-11, FIG-15, FIG-22)', async ({ page }) => {
    const tabs = '<tanrei-tabs id="contrast" variant="secondary" label="Contrast"><tanrei-tab value="standard" label="Standard"></tanrei-tab><tanrei-tab value="high" label="High"></tanrei-tab></tanrei-tabs>';
    const row = '<div id="row" dir="rtl" data-tanrei-system="m3-like" style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center"><tanrei-button id="filled" variant="filled">Filled</tanrei-button><tanrei-button variant="outlined">Outlined</tanrei-button></div>';
    const code = '<tanrei-code-block data-part="attachment" id="code" label="Markup"><pre><code>&lt;tanrei-button variant="filled"&gt;Filled&lt;/tanrei-button&gt;</code></pre></tanrei-code-block>';
    await mountFixtures(page, spec, { fixtures: [fx('docs', { separation: 'divider' }, { title: 'Variants, sizes and disabled', actions: tabs, stage: row, attachment: code, caption: 'Drawn under <code>m3-like</code>, a system that ships this component.' })] });
    await page.waitForFunction(() => !!customElements.get('tanrei-tabs') && !!customElements.get('tanrei-code-block') && !!customElements.get('tanrei-button'));
    await drawnFrame(page);
    const [h, t, a, s, joined, f] = [await edges(header(page, 'docs')), await edges(title(page, 'docs')), await edges(actions(page, 'docs')), await edges(shown(page, 'docs')), await edges(page.locator('#code')), await edges(frame(page, 'docs'))];
    // The tabs keep their own size at the end of the header, on its row with the title.
    near(a.right, h.right - (await resolveToken(page, T('header-padding-inline-end-with-actions'))), 0.1);
    expect(a.top).toBeLessThan(t.bottom);
    near(a.width, (await edges(page.locator('#contrast'))).width, 0.1);
    // They are the product's to operate.
    await page.locator('#contrast tanrei-tab[value="high"]').click();
    await expect(page.locator('#contrast')).toHaveJSProperty('value', 'high');
    // The row is centred in the stage and keeps its own direction; the header does not take it.
    const rowBox = await edges(page.locator('#row'));
    near(rowBox.left + rowBox.width / 2, s.left + s.width / 2, 0.6);
    expect((await edges(title(page, 'docs'))).left).toBeLessThan(a.left);
    expect((await edges(page.locator('#filled'))).left).toBeGreaterThan(rowBox.left + rowBox.width / 2 - 1);
    // The code block is joined under one line, flush with the frame.
    near(joined.top, s.bottom, 0.1);
    near(joined.left, f.left, 0.1);
    near(joined.right, f.right, 0.1);
    near(joined.bottom, f.bottom, 0.1);
    await expect(stage(page, 'docs').getByRole('figure', { name: 'Variants, sizes and disabled' })).toHaveAccessibleDescription('Drawn under m3-like, a system that ships this component.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

test.describe('fixtures', () => {
  test('every fixture of the spec is mounted', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    await page.waitForFunction(() => !!customElements.get('tanrei-button'));
    expect(spec.fixtures).toHaveLength(33);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toHaveCount(1);
      await expect(shown(page, f.id), f.id).toBeVisible();
      expect(await host(page, f.id).getAttribute('variant'), f.id).toBe(f.props.variant === undefined ? null : String(f.props.variant));
      expect(await host(page, f.id).getAttribute('separation'), f.id).toBe(f.props.separation === undefined ? null : String(f.props.separation));
      expect(await host(page, f.id).evaluate((el) => el.hasAttribute('flush')), f.id).toBe(f.props.inset === false);
      const [wantsTitle, wantsCaption] = [f.props.title ?? f.slots?.title, f.props.caption ?? f.slots?.caption];
      if (wantsTitle) await expect(title(page, f.id), f.id).toHaveText(String(wantsTitle));
      else await expect(title(page, f.id), f.id).toHaveCount(0);
      if (wantsCaption) await expect(caption(page, f.id), f.id).toHaveText(String(wantsCaption));
      else await expect(caption(page, f.id), f.id).toHaveCount(0);
      const glyphs = f.slots?.actions === undefined ? [] : [f.slots.actions].flat();
      await expect(actions(page, f.id).locator('tanrei-button'), f.id).toHaveCount(glyphs.length);
      await expect(attachment(page, f.id), f.id).toHaveCount(f.slots?.attachment ? 1 : 0);
      // Every fixture is a named figure, and none scrolls sideways.
      const name = String(wantsTitle ?? wantsCaption ?? f.props.label);
      await expect(stage(page, f.id).getByRole('figure', { name, exact: true }), f.id).toHaveCount(1);
      if (f.direction) await expect(stage(page, f.id)).toHaveAttribute('dir', f.direction);
      expect(await stage(page, f.id).evaluate((el) => el.scrollWidth <= el.clientWidth), f.id).toBe(true);
      expect(await shown(page, f.id).evaluate((el) => el.hasAttribute('tabindex')), f.id).toBe(false);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
