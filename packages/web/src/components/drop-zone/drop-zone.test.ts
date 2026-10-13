// <tanrei-drop-zone>, driven by specs/drop-zone.spec.json: every behaviour id (DRZ-1…21) starts the title of a test,
// every fixture has a baseline, and every length and color is read back from the tokens — never from a number written
// here. A drag is a DragEvent that carries a DataTransfer the page made, dispatched where a browser would dispatch it:
// on the element of the content under the pointer.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, iconFaceArrives, loadSpec, missingWords, mountFixtures, resolveToken, rootTokens, setWords, tab, withoutIconFont } from '../../../test/harness.js';

const spec = loadSpec('drop-zone');
type P = Page;
const TAG = 'tanrei-drop-zone';
const T = (name: string) => `--tanrei-comp-drop-zone-${name}`;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
/** The fixture's zone: the outermost, where a test nests another inside it. */
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`).first();
/** A part of the zone's own shadow root — never one of a nested zone's, nor a Button's of the same name in the content. */
const overlay = (page: P, id: string) => host(page, id).locator('.overlay').first();
const part = (page: P, id: string, name: 'edge' | 'view' | 'panel' | 'icon' | 'label' | 'announcer') => host(page, id).locator(name === 'announcer' ? '.announcer' : `.overlay .${name}`).first();
const condition = (page: P, id: string) => host(page, id).evaluate((el) => el.shadowRoot!.querySelector('.overlay')!.getAttribute('data-drag'));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const token = (page: P, name: string) => resolveToken(page, T(name));
function logged(page: P, type: 'warning' | 'error' = 'warning') {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === type) seen.push(message.text());
  });
  return seen;
}
/** A fixture of the test's own: its props, and the sample screen as its content unless the test gives markup. */
const fx = (id: string, props: Fixture['props'], extra: Partial<Fixture> = {}): Fixture => ({ id, props, content: 'Your videos', ...extra });
/** A page always has a File picker beside its zones (DRZ-13), unless a test says otherwise. */
const PICKER = '<tanrei-file-picker id="page-picker"><tanrei-button slot="trigger" variant="outlined">Choose files</tanrei-button></tanrei-file-picker>';
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] & { picker?: boolean } = {}) =>
  mountFixtures(page, spec, { icons: true, fixtures, ...(options.picker === false ? {} : { lead: PICKER }), ...options });
const mountSpec = (page: P, ...ids: string[]) => mount(page, ids.length ? spec.fixtures.filter((f) => ids.includes(f.id)) : spec.fixtures);
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);

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
const isColor = async (page: P, locator: Locator, property: string, name: string) => sameColor(await painted(locator, property), await colorOf(page, `var(${T(name)})`), name);

// ── What the product hears ───────────────────────────────────────────────────────────────────────────────────────
interface Heard {
  type: string;
  files?: string[];
  reasons?: string[];
  from?: string;
}
const listen = (page: P) =>
  page.evaluate(() => {
    const heard: unknown[] = [];
    (window as unknown as { __heard: unknown[] }).__heard = heard;
    document.addEventListener('select', (event) => {
      heard.push({ type: 'select', files: (event as CustomEvent<{ files: File[] }>).detail.files.map((f) => f.name), from: (event.target as Element).id || (event.target as Element).localName });
    });
    document.addEventListener('reject', (event) => {
      const detail = (event as CustomEvent<{ files: { file: File; reason: string }[] }>).detail;
      heard.push({ type: 'reject', files: detail.files.map((f) => f.file.name), reasons: detail.files.map((f) => f.reason), from: (event.target as Element).id || (event.target as Element).localName });
    });
    for (const type of ['change', 'input']) document.addEventListener(type, () => heard.push({ type }));
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { __heard: Heard[] }).__heard);

interface Given {
  name: string;
  type?: string;
  size?: number;
}
interface Drag {
  files?: Given[];
  text?: boolean;
  link?: boolean;
  /** A selector, from the stage, for the element the event is dispatched on; the content's paragraph by default. */
  on?: string;
  /** The relatedTarget of a dragleave, by a selector from the document. */
  to?: string;
  /** The default is prevented before the event reaches the zone: an inner target took it. */
  taken?: boolean;
}
/**
 * A drag event, as a browser dispatches it on the element under the pointer, carrying a DataTransfer the page made.
 * Returns whether the default was prevented, the effect named, and whether the engine carried the DataTransfer.
 */
const drag = (page: P, id: string, type: 'dragenter' | 'dragover' | 'dragleave' | 'drop', { files = [], text = false, link = false, on = 'p', to = '', taken = false }: Drag = {}) =>
  stage(page, id).evaluate(
    (el, [t, given, withText, withLink, where, related, inner]) => {
      const data = new DataTransfer();
      let effect = 'unset';
      Object.defineProperty(data, 'dropEffect', { configurable: true, get: () => effect, set: (value: string) => void (effect = value) });
      for (const f of given) data.items.add(new File([new Uint8Array(f.size ?? 4)], f.name, { type: f.type ?? '' }));
      if (withText) data.setData('text/plain', 'words');
      if (withLink) data.setData('text/uri-list', 'https://example.com/');
      const target = (el.querySelector(where) ?? el) as Element;
      const event = new DragEvent(t, { bubbles: true, cancelable: true, composed: true, dataTransfer: data, relatedTarget: related ? document.querySelector(related) : null });
      if (inner) target.addEventListener(t, (e) => e.preventDefault(), { once: true });
      target.dispatchEvent(event);
      return { taken: event.defaultPrevented, effect, carried: !!event.dataTransfer };
    },
    [type, files, text, link, on, to, taken] as const,
  );
const PDF: Given = { name: 'brief.pdf', type: 'application/pdf' };
const PNG: Given = { name: 'plan.png', type: 'image/png' };
const TXT: Given = { name: 'notes.txt', type: 'text/plain' };
/** Enters the zone with a drag of `files`, as a browser does: dragenter, then dragover. Skips where the engine gives a constructed DragEvent no DataTransfer. */
async function enter(page: P, id: string, files: Given[] = [PDF], on = 'p') {
  const probe = await drag(page, id, 'dragenter', { files, on });
  test.skip(!probe.carried, 'this engine gives a constructed DragEvent no DataTransfer');
  return drag(page, id, 'dragover', { files, on });
}

test.describe('behavior', () => {
  test('DRZ-1: a box of the size its layout gives it, laying out its content as the product’s styles say; at rest it draws nothing of its own and adds no state, no stop, no role and no name', async ({ page }) => {
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop files' })]);
    const [zone, sample] = [await box(host(page, 'a')), await box(stage(page, 'a').locator('.drop-zone-sample'))];
    near(zone.width, sample.width, 'its box is its content’s');
    near(zone.height, sample.height, 'its box is its content’s');
    expect(await css(overlay(page, 'a'), 'visibility')).toBe('hidden');
    expect(await css(overlay(page, 'a'), 'opacity')).toBe('0');
    expect(await host(page, 'a').evaluate((el) => [el.getAttribute('role'), el.getAttribute('tabindex'), el.getAttribute('aria-label'), (el as HTMLElement).tabIndex])).toEqual([null, null, null, -1]);
    // The product lays the content out by styling the host.
    await host(page, 'a').evaluate((el) => {
      (el as HTMLElement).style.display = 'grid';
      (el as HTMLElement).style.gridTemplateColumns = '1fr 1fr';
      el.innerHTML = '<div class="one">one</div><div class="two">two</div>';
    });
    const [one, two] = [await box(host(page, 'a').locator('.one')), await box(host(page, 'a').locator('.two'))];
    near(one.y, two.y, 'the content is a grid of the host’s');
    expect(two.x).toBeGreaterThan(one.x);
    // Tab reaches the content's controls in their own order; the zone is no stop.
    await host(page, 'a').evaluate((el) => (el.innerHTML = '<button id="first">First</button><button id="second">Second</button>'));
    await page.locator('#first').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('second');
    await expect(stage(page, 'a').getByRole('button')).toHaveCount(2);
  });

  test('DRZ-2: every press, key, scroll and focus inside stays the content’s, during a drag too; a press on the zone opens no picker and moves no focus', async ({ page }) => {
    let chooser = false;
    page.on('filechooser', () => void (chooser = true));
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop files' })]);
    await page.evaluate(() => {
      (window as unknown as { __clicked: number }).__clicked = 0;
      document.querySelector('[data-fixture="a"] tanrei-button')!.addEventListener('click', () => (window as unknown as { __clicked: number }).__clicked++);
    });
    await stage(page, 'a').locator('tanrei-button').click();
    await stage(page, 'a').locator('p').click();
    expect(await page.evaluate(() => (window as unknown as { __clicked: number }).__clicked)).toBe(1);
    expect(chooser).toBe(false);
    // During a drag, what lies under the overlay is still what the pointer finds.
    await enter(page, 'a');
    expect(await condition(page, 'a')).toBe('receiving');
    expect(await css(overlay(page, 'a'), 'pointer-events')).toBe('none');
    const b = await box(stage(page, 'a').locator('tanrei-button'));
    const under = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('tanrei-button')?.localName ?? '', [b.x + b.width / 2, b.y + b.height / 2]);
    expect(under).toBe('tanrei-button');
  });

  test('DRZ-3: a drag that holds no file — text, a link — is left wholly to the content: no overlay, no effect, nothing taken', async ({ page }) => {
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop files' })]);
    for (const what of [{ text: true }, { link: true }]) {
      const entered = await drag(page, 'a', 'dragenter', what);
      const over = await drag(page, 'a', 'dragover', what);
      expect([entered.taken, over.taken], JSON.stringify(what)).toEqual([false, false]);
      expect(over.effect).toBe('unset');
      expect(await condition(page, 'a')).toBeNull();
      const dropped = await drag(page, 'a', 'drop', what);
      expect(dropped.taken).toBe(false);
    }
  });

  test('DRZ-4: while files are dragged over it the zone draws the overlay — scrim, edge inside the box, panel with the upload glyph and dropText — and names copy', async ({ page }) => {
    await mountSpec(page, 'dragged');
    expect(await condition(page, 'dragged')).toBe('receiving');
    await frames(page, 20);
    const [zone, layer] = [await box(host(page, 'dragged')), await box(overlay(page, 'dragged'))];
    for (const k of ['x', 'y', 'width', 'height'] as const) near(layer[k], zone[k], `the overlay covers the zone: ${k}`);
    expect(await css(overlay(page, 'dragged'), 'visibility')).toBe('visible');
    await isColor(page, overlay(page, 'dragged'), 'background-color', 'scrim-color');
    near(parseFloat(await css(part(page, 'dragged', 'edge'), 'border-top-width')), await token(page, 'outline-width'), 'the edge');
    await isColor(page, part(page, 'dragged', 'edge'), 'border-top-color', 'outline-color');
    expect(await css(part(page, 'dragged', 'edge'), 'border-top-style')).toBe('solid');
    await isColor(page, part(page, 'dragged', 'panel'), 'background-color', 'panel-container-color');
    near(parseFloat(await css(part(page, 'dragged', 'panel'), 'padding-top')), await token(page, 'panel-padding-block'), 'padding-block');
    near(parseFloat(await css(part(page, 'dragged', 'panel'), 'padding-left')), await token(page, 'panel-padding-inline'), 'padding-inline');
    expect(await css(part(page, 'dragged', 'panel'), 'box-shadow')).not.toBe('none');
    await expect(part(page, 'dragged', 'icon')).toHaveText('upload');
    await isColor(page, part(page, 'dragged', 'icon'), 'color', 'icon-color');
    near((await box(part(page, 'dragged', 'icon'))).width, await token(page, 'icon-size'), 'the glyph');
    await expect(part(page, 'dragged', 'label')).toHaveText('Drop files to upload them');
    await isColor(page, part(page, 'dragged', 'label'), 'color', 'label-color');
    const [icon, label] = [await box(part(page, 'dragged', 'icon')), await box(part(page, 'dragged', 'label'))];
    near(label.y - (icon.y + icon.height), await token(page, 'panel-gap'), 'the gap');
    expect((await box(part(page, 'dragged', 'panel'))).width).toBeLessThanOrEqual((await token(page, 'panel-max-width')) + 0.5);
    // The browser is told that letting go here copies.
    expect((await drag(page, 'dragged', 'dragover', { files: [PDF] })).effect).toBe('copy');
  });

  test('DRZ-5: where the browser tells before the drop that nothing can be taken the overlay refuses — its edge and block glyph in the refusing role, refusingText — and names none; what it cannot tell is drawn as taking', async ({ page }) => {
    await mount(page, [fx('a', { multiple: true, accept: ['image/png'], dropText: 'Drop images', refusingText: 'Only PNG images' }), fx('b', { accept: ['.pdf'], dropText: 'Drop a PDF', refusingText: 'No' }), fx('c', { dropText: 'Drop a file', refusingText: 'One file only' })]);
    const over = await enter(page, 'a', [PDF]);
    expect(await condition(page, 'a')).toBe('refusing');
    expect(over.effect).toBe('none');
    await expect(part(page, 'a', 'icon')).toHaveText('block');
    await expect(part(page, 'a', 'label')).toHaveText('Only PNG images');
    await frames(page, 20);
    await isColor(page, part(page, 'a', 'edge'), 'border-top-color', 'refusing-outline-color');
    await isColor(page, part(page, 'a', 'icon'), 'color', 'refusing-icon-color');
    await isColor(page, overlay(page, 'a'), 'background-color', 'scrim-color');
    // An extension is the end of a name, which is not told before the drop: the zone takes it and judges at the drop.
    await enter(page, 'b', [PNG]);
    expect(await condition(page, 'b')).toBe('receiving');
    // Two files where one is asked.
    await enter(page, 'c', [PDF, PNG]);
    expect(await condition(page, 'c')).toBe('refusing');
    await expect(part(page, 'c', 'label')).toHaveText('One file only');
  });

  test('DRZ-6: the overlay stays inside the zone and above everything it holds, takes no press or scroll, and centres its panel in the part of the zone in view', async ({ page }) => {
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop files' }, { content: '<p style="position: relative; z-index: 1000">raised</p>' })]);
    await enter(page, 'a');
    expect(await css(host(page, 'a'), 'isolation')).toBe('isolate');
    expect(await css(host(page, 'a'), 'position')).toBe('relative');
    expect(Number(await css(overlay(page, 'a'), 'z-index'))).toBeGreaterThan(1000);
    // A zone far taller than the scrolling area around it, scrolled to its middle.
    await page.evaluate(() => {
      const zone = document.querySelector<HTMLElement>('[data-fixture="a"] > tanrei-drop-zone')!;
      const area = document.createElement('div');
      area.id = 'area';
      area.style.cssText = 'block-size: 300px; inline-size: 360px; overflow: auto';
      zone.before(area);
      area.append(zone);
      zone.style.blockSize = '3000px';
      area.scrollTop = 1200;
    });
    await drag(page, 'a', 'dragover', { files: [PDF] });
    await frames(page, 2);
    const [area, panel] = [await box(page.locator('#area')), await box(part(page, 'a', 'panel'))];
    expect(panel.y).toBeGreaterThanOrEqual(area.y);
    expect(panel.y + panel.height).toBeLessThanOrEqual(area.y + area.height + 0.5);
    near(panel.y + panel.height / 2, area.y + area.height / 2, 'centred in the part in view', 1);
    // A wheel over the overlay scrolls the area beneath it.
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
    await enter(page, 'a');
    const before = await page.locator('#area').evaluate((el) => el.scrollTop);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => page.locator('#area').evaluate((el) => el.scrollTop)).toBeGreaterThan(before);
  });

  test('DRZ-7: the condition holds while the drag crosses the content’s children and ends when it leaves the box, is let go anywhere, enters something outside, or the pointer moves', async ({ page }) => {
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop files' })]);
    await enter(page, 'a', [PDF], 'p');
    // Into the Button: an enter on it, then a leave from the paragraph.
    await drag(page, 'a', 'dragenter', { files: [PDF], on: 'tanrei-button' });
    await drag(page, 'a', 'dragleave', { files: [PDF], on: 'p', to: '[data-fixture="a"] tanrei-button' });
    expect(await condition(page, 'a')).toBe('receiving');
    // A leave with no related target, its enter counted: still within.
    await drag(page, 'a', 'dragenter', { files: [PDF], on: '.drop-zone-sample' });
    await drag(page, 'a', 'dragleave', { files: [PDF], on: 'tanrei-button' });
    expect(await condition(page, 'a')).toBe('receiving');
    // Out to the page's picker: ends at once.
    await drag(page, 'a', 'dragleave', { files: [PDF], on: '.drop-zone-sample', to: '#page-picker' });
    expect(await condition(page, 'a')).toBeNull();
    // A child removed under the drag loses its leave: an enter outside still ends it.
    await enter(page, 'a');
    await page.evaluate(() => document.querySelector('#page-picker')!.dispatchEvent(new DragEvent('dragenter', { bubbles: true, composed: true, cancelable: true, dataTransfer: new DataTransfer() })));
    expect(await condition(page, 'a')).toBeNull();
    for (const ending of ['drop', 'dragend', 'pointermove']) {
      await enter(page, 'a');
      expect(await condition(page, 'a')).toBe('receiving');
      await page.evaluate((type) => document.body.dispatchEvent(type === 'pointermove' ? new PointerEvent(type, { bubbles: true }) : new DragEvent(type, { bubbles: true, cancelable: true })), ending);
      expect(await condition(page, 'a'), ending).toBeNull();
    }
    // Leaving the last element entered ends it.
    await enter(page, 'a');
    await drag(page, 'a', 'dragleave', { files: [PDF], on: 'p' });
    expect(await condition(page, 'a')).toBeNull();
  });

  test('DRZ-8: the innermost target takes the drag — a drop zone inside, a File picker’s drop area, a target of the product’s — and the zone takes it again outside that target; a disabled zone inside takes nothing', async ({ page }) => {
    const inner = (attrs: string) => `<p>outer</p><tanrei-drop-zone id="inner" ${attrs} style="block-size: 80px"><span class="in">inner</span></tanrei-drop-zone>`;
    await mount(page, [
      fx('a', { multiple: true, dropText: 'Outer' }, { content: inner('multiple drop-text="Inner"') }),
      fx('b', { multiple: true, dropText: 'Outer' }, { content: '<p>outer</p><tanrei-file-picker layout="drop-area" multiple><tanrei-button slot="trigger">Choose</tanrei-button></tanrei-file-picker>' }),
      fx('c', { multiple: true, dropText: 'Outer' }, { content: inner('disabled drop-text="Inner"') }),
      fx('d', { multiple: true, dropText: 'Outer' }),
    ]);
    await listen(page);
    const innerCondition = (id: string) => stage(page, id).locator('#inner .overlay').getAttribute('data-drag');
    await enter(page, 'a', [PDF], '.in');
    expect([await innerCondition('a'), await condition(page, 'a')]).toEqual(['receiving', null]);
    await drag(page, 'a', 'drop', { files: [PDF], on: '.in' });
    expect((await heard(page)).map((h) => `${h.type}:${h.from}`)).toEqual(['select:inner']);
    // Out of the inner zone onto the outer's own content: the outer takes it.
    await enter(page, 'a', [PDF], 'p');
    expect([await innerCondition('a'), await condition(page, 'a')]).toEqual([null, 'receiving']);
    // A File picker's drop area inside.
    await enter(page, 'b', [PDF], 'tanrei-file-picker > tanrei-button');
    expect(await condition(page, 'b')).toBeNull();
    // A product's own target, which prevents the default first.
    expect((await drag(page, 'd', 'dragover', { files: [PDF], taken: true })).taken).toBe(true);
    expect(await condition(page, 'd')).toBeNull();
    // A disabled zone inside takes nothing: the outer takes the drag over it, and the drop.
    await enter(page, 'c', [PDF], '.in');
    expect([await innerCondition('c'), await condition(page, 'c')]).toEqual([null, 'receiving']);
    await drag(page, 'c', 'drop', { files: [PDF], on: '.in' });
    expect((await heard(page)).at(-1)).toMatchObject({ type: 'select', from: 'tanrei-drop-zone' });
  });

  test('DRZ-9: a drop is taken and judged as the File picker judges an arrival — multiple, accept, maxSize, maxFiles, in order — then select and reject, in that order; nothing for a drop without files; focus stays', async ({ page }) => {
    await mount(page, [
      fx('a', { multiple: true, accept: ['.pdf', 'image/*'], maxSize: 100, maxFiles: 2, dropText: 'Drop' }),
      fx('b', { accept: ['.pdf'], dropText: 'Drop' }),
    ]);
    await listen(page);
    await page.locator('#page-picker tanrei-button').focus();
    await enter(page, 'a', [TXT, PDF, { name: 'big.png', type: 'image/png', size: 500 }, PNG, { name: 'third.pdf', type: 'application/pdf' }]);
    const dropped = await drag(page, 'a', 'drop', { files: [TXT, PDF, { name: 'big.png', type: 'image/png', size: 500 }, PNG, { name: 'third.pdf', type: 'application/pdf' }] });
    expect(dropped.taken).toBe(true);
    expect(await condition(page, 'a')).toBeNull();
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['brief.pdf', 'plan.png'], from: 'tanrei-drop-zone' },
      { type: 'reject', files: ['notes.txt', 'big.png', 'third.pdf'], reasons: ['type', 'size', 'count'], from: 'tanrei-drop-zone' },
    ]);
    // Two where one is asked: both refused, none chosen.
    await drag(page, 'b', 'drop', { files: [PDF, { name: 'b.pdf', type: 'application/pdf' }] });
    expect((await heard(page)).at(-1)).toEqual({ type: 'reject', files: ['brief.pdf', 'b.pdf'], reasons: ['count', 'count'], from: 'tanrei-drop-zone' });
    const count = (await heard(page)).length;
    expect((await drag(page, 'a', 'drop', { files: [] })).taken).toBe(false);
    expect(await heard(page)).toHaveLength(count);
    expect(await page.evaluate(() => document.activeElement?.closest('#page-picker') !== null)).toBe(true);
    // The events bubble and carry the File picker's details.
    expect(await page.evaluate(() => new Promise<boolean[]>((resolve) => {
      const zone = document.querySelector('[data-fixture="a"] > tanrei-drop-zone')!;
      zone.addEventListener('select', (event) => resolve([event.bubbles, event.composed, (event as CustomEvent<{ files: File[] }>).detail.files.every((f) => f instanceof File)]), { once: true });
      const data = new DataTransfer();
      data.items.add(new File(['x'], 'one.pdf', { type: 'application/pdf' }));
      zone.querySelector('p')!.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, composed: true, dataTransfer: data }));
    }))).toEqual([true, false, true]);
  });

  test('DRZ-10: keeps nothing and sends nothing — no request, no reader, no object URL, no form value', async ({ page }) => {
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop' }, { content: '<p>in a form</p>' })]);
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.evaluate(() => {
      const w = window as unknown as { __made: number };
      w.__made = 0;
      URL.createObjectURL = () => (w.__made++, 'blob:none');
      const Reader = FileReader;
      window.FileReader = class extends Reader {
        constructor() {
          super();
          w.__made++;
        }
      };
      const zone = document.querySelector('[data-fixture="a"] > tanrei-drop-zone')!;
      const form = document.createElement('form');
      zone.before(form);
      form.append(zone);
    });
    await enter(page, 'a');
    await drag(page, 'a', 'drop', { files: [PDF] });
    expect(await page.evaluate(() => (window as unknown as { __made: number }).__made)).toBe(0);
    expect(await page.evaluate(() => [...new FormData(document.querySelector('form')!).keys()])).toEqual([]);
    expect(await host(page, 'a').evaluate((el) => (el.constructor as unknown as { formAssociated?: boolean }).formAssociated ?? false)).toBe(false);
    expect(requests.filter((url) => !url.startsWith('data:'))).toEqual([]);
  });

  test('DRZ-11: one polite live region says, once per drop, how many passed and then how many were refused, in the product’s words; nothing for a drag; silent says nothing; a missing sentence is reported', async ({ page }) => {
    await mount(page, [
      fx('a', { multiple: true, accept: ['.pdf'], dropText: 'Drop', droppedText: '{count} files added', refusedText: '{count} could not be added' }),
      fx('b', { multiple: true, accept: ['.pdf'], dropText: 'Drop', droppedText: '{count} files added', refusedText: '{count} could not be added', silent: true }),
      fx('c', { multiple: true, dropText: 'Drop' }),
    ]);
    const warnings = logged(page);
    for (const id of ['a', 'b', 'c']) {
      expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('[aria-live]')].map((n) => n.getAttribute('aria-live')))).toEqual(['polite']);
    }
    await enter(page, 'a');
    await expect(part(page, 'a', 'announcer')).toHaveText('');
    await drag(page, 'a', 'drop', { files: [PDF, { name: 'b.pdf', type: 'application/pdf' }, TXT] });
    await expect(part(page, 'a', 'announcer')).toHaveText('2 files added 1 could not be added');
    await drag(page, 'b', 'drop', { files: [PDF, TXT] });
    await expect(part(page, 'b', 'announcer')).toHaveText('');
    await drag(page, 'c', 'drop', { files: [PDF] });
    await expect(part(page, 'c', 'announcer')).toHaveText('');
    expect(warnings.some((text) => text.includes('DRZ-11') && text.includes('dropped-text'))).toBe(true);
    expect(await missingWords(page)).toContain('filesDroppedText');
    // The focus is not moved to announce.
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });

  test('DRZ-12: no words of its own — every word is the instance’s or the product’s, by its key; without the message the panel draws its glyph alone and that is reported', async ({ page }) => {
    await mount(page, [fx('a', { multiple: true }), fx('b', { multiple: true, accept: ['image/png'] })]);
    const warnings = logged(page);
    await enter(page, 'a');
    await expect(part(page, 'a', 'label')).toHaveCount(0);
    await expect(part(page, 'a', 'icon')).toHaveText('upload');
    expect(warnings.some((text) => text.includes('DRZ-12') && text.includes('drop-text'))).toBe(true);
    expect(await missingWords(page)).toContain('dropZoneText');
    await setWords(page, { dropZoneText: 'Drop files here', dropZoneRefusingText: 'Not here', filesDroppedText: '{count} added', filesRefusedText: '{count} refused' });
    await expect(part(page, 'a', 'label')).toHaveText('Drop files here');
    await enter(page, 'b', [PDF]);
    await expect(part(page, 'b', 'label')).toHaveText('Not here');
    await drag(page, 'a', 'drop', { files: [PDF] });
    await expect(part(page, 'a', 'announcer')).toHaveText('1 added');
    // The instance's own word wins.
    await host(page, 'a').evaluate((el) => el.setAttribute('drop-text', 'Mine'));
    await enter(page, 'a');
    await expect(part(page, 'a', 'label')).toHaveText('Mine');
  });

  test('DRZ-13: a page with no file picker of any kind is reported at the first drag of files; with one anywhere on the page nothing is reported', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop' })], { picker: false });
    await enter(page, 'a');
    expect(await condition(page, 'a')).toBe('receiving');
    expect(warnings.filter((text) => text.includes('DRZ-13'))).toHaveLength(1);
    warnings.length = 0;
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop' })]);
    await enter(page, 'a');
    expect(warnings.filter((text) => text.includes('DRZ-13'))).toEqual([]);
  });

  test('DRZ-14: disabled — no overlay, nothing said or emitted, none named, and the drop still kept from the browser; the content stays usable; disabled during a drag ends it', async ({ page }) => {
    await mount(page, [fx('a', { multiple: true, disabled: true, dropText: 'Drop', droppedText: '{count}' }), fx('b', { multiple: true, dropText: 'Drop' })]);
    await listen(page);
    const over = await enter(page, 'a');
    expect(await condition(page, 'a')).toBeNull();
    expect([over.taken, over.effect]).toEqual([true, 'none']);
    expect((await drag(page, 'a', 'drop', { files: [PDF] })).taken).toBe(true);
    expect(await heard(page)).toEqual([]);
    await expect(part(page, 'a', 'announcer')).toHaveText('');
    expect(await stage(page, 'a').locator('tanrei-button').evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled)).toBe(false);
    expect(await css(stage(page, 'a').locator('.drop-zone-sample'), 'opacity')).toBe('1');
    await enter(page, 'b');
    expect(await condition(page, 'b')).toBe('receiving');
    await host(page, 'b').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await expect.poll(() => condition(page, 'b')).toBeNull();
  });

  test('DRZ-15: judge() judges files by the same rule as one arrival, answers with what passed and what was refused, and emits, says and keeps nothing — also while disabled', async ({ page }) => {
    await mount(page, [fx('a', { multiple: true, accept: ['.pdf'], maxFiles: 1, disabled: true, dropText: 'Drop', droppedText: '{count}' })]);
    await listen(page);
    const answer = await host(page, 'a').evaluate((el) => {
      const result = (el as HTMLElement & { judge: (files: Iterable<File>) => { accepted: File[]; refused: { file: File; reason: string }[] } }).judge([
        new File(['a'], 'a.pdf', { type: 'application/pdf' }),
        new File(['b'], 'b.txt', { type: 'text/plain' }),
        new File(['c'], 'c.pdf', { type: 'application/pdf' }),
      ]);
      return { accepted: result.accepted.map((f) => f.name), refused: result.refused.map((r) => `${r.file.name}:${r.reason}`) };
    });
    expect(answer).toEqual({ accepted: ['a.pdf'], refused: ['b.txt:type', 'c.pdf:count'] });
    expect(await heard(page)).toEqual([]);
    await expect(part(page, 'a', 'announcer')).toHaveText('');
  });

  test('DRZ-16: the overlay fades in and out over motion.duration with motion.easing, and is shown and hidden at once where motion is reduced', async ({ page }) => {
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop' })], { reducedMotion: false });
    const duration = await resolveToken(page, T('motion-duration'), 'duration');
    const durations = (await css(overlay(page, 'a'), 'transition-duration')).split(',').map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000));
    near(durations[0], duration, 'the fade');
    const easing = await page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.transitionTimingFunction = `var(${n})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-easing'));
    const first = (list: string) => list.match(/^(cubic-bezier\([^)]*\)|[a-z-]+)/)?.[0];
    expect(first(await css(overlay(page, 'a'), 'transition-timing-function'))).toBe(first(easing));
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop' })], { reducedMotion: true });
    expect(await css(overlay(page, 'a'), 'transition-duration')).toBe('0s');
    await enter(page, 'a');
    expect(await css(overlay(page, 'a'), 'opacity')).toBe('1');
    await drag(page, 'a', 'dragleave', { files: [PDF] });
    expect(await css(overlay(page, 'a'), 'visibility')).toBe('hidden');
  });

  test('DRZ-17: under forced colors the edge is drawn in Highlight, twice as wide, and the panel on Canvas with a CanvasText edge; refusing keeps its block glyph', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, [fx('a', { multiple: true, accept: ['image/png'], dropText: 'Drop', refusingText: 'No' })]);
    await enter(page, 'a', [PNG]);
    sameColor(await painted(part(page, 'a', 'edge'), 'border-top-color'), await colorOf(page, 'Highlight'), 'the edge');
    near(parseFloat(await css(part(page, 'a', 'edge'), 'border-top-width')), (await token(page, 'outline-width')) * 2, 'twice as wide');
    sameColor(await painted(part(page, 'a', 'panel'), 'border-top-color'), await colorOf(page, 'CanvasText'), 'the panel’s edge');
    await enter(page, 'a', [PDF]);
    await expect(part(page, 'a', 'icon')).toHaveText('block');
  });

  test('DRZ-18: at 200 % text in a width of 320 the message wraps and is never cut, and the panel stays inside the zone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await mountSpec(page, 'dragged-long-text');
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await rootTokens(page, { '--tanrei-dial-type-base': 'calc(var(--tanrei-dial-type-base-default, 16) * 2)' });
    await host(page, 'dragged-long-text').evaluate((el) => {
      (el as HTMLElement).style.inlineSize = '320px';
      (el as HTMLElement).style.blockSize = '480px';
      el.querySelector('p')!.style.fontSize = '32px';
    });
    await enter(page, 'dragged-long-text');
    const label = part(page, 'dragged-long-text', 'label');
    expect(await label.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    const [zone, panel] = [await box(host(page, 'dragged-long-text')), await box(part(page, 'dragged-long-text', 'panel'))];
    expect(panel.x).toBeGreaterThanOrEqual(zone.x);
    expect(panel.x + panel.width).toBeLessThanOrEqual(zone.x + zone.width + 0.5);
  });

  test('DRZ-19: the direction is the context’s; the message is text of its own direction, isolated and centred; no glyph is mirrored by the zone itself', async ({ page }) => {
    await mountSpec(page, 'dragged-rtl');
    expect(await host(page, 'dragged-rtl').evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
    const label = part(page, 'dragged-rtl', 'label');
    expect(await css(label, 'unicode-bidi')).toBe('plaintext');
    expect(await css(label, 'text-align')).toBe('center');
    const [panel, view] = [await box(part(page, 'dragged-rtl', 'panel')), await box(part(page, 'dragged-rtl', 'view'))];
    near(panel.x + panel.width / 2, view.x + view.width / 2, 'the panel is centred', 1);
    expect(await part(page, 'dragged-rtl', 'icon').getAttribute('data-tanrei-mirrored')).toBeNull();
  });

  test('DRZ-20: a changed prop is drawn at once and judged from the next drop; a value that sets no limit and an entry that says no kind are reported', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [fx('a', { multiple: true, dropText: 'Drop' })]);
    await listen(page);
    await enter(page, 'a');
    await host(page, 'a').evaluate((el) => el.setAttribute('drop-text', 'Changed'));
    await expect(part(page, 'a', 'label')).toHaveText('Changed');
    await host(page, 'a').evaluate((el) => el.setAttribute('accept', 'image/png'));
    await drag(page, 'a', 'drop', { files: [PDF] });
    expect((await heard(page)).at(-1)).toMatchObject({ type: 'reject', reasons: ['type'] });
    await host(page, 'a').evaluate((el) => {
      el.setAttribute('max-size', '-4');
      el.setAttribute('max-files', '1.5');
      el.setAttribute('accept', 'pdf, image/png');
    });
    await expect.poll(() => warnings.filter((text) => text.includes('DRZ-20')).length).toBe(3);
  });

  test('DRZ-21: while the icon set cannot draw the glyph the zone draws nothing in its place — never its name — and keeps its box; it draws the glyph once the set can', async ({ page }) => {
    await mountSpec(page, 'dragged');
    await withoutIconFont(page);
    const glyph = part(page, 'dragged', 'icon');
    await expect.poll(() => glyph.getAttribute('data-drawn')).toBeNull();
    expect(await css(glyph, 'visibility')).toBe('hidden');
    near((await box(glyph)).width, await token(page, 'icon-size'), 'the box is kept');
    await iconFaceArrives(page);
    await expect.poll(() => glyph.getAttribute('data-drawn')).not.toBeNull();
  });
});

test.describe('accessibility', () => {
  test('axe finds nothing at rest or during a drag, in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { icons: true, theme, lead: PICKER });
      await frames(page, 20);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('the zone adds nothing to the accessibility tree: no role, no name, the overlay hidden; the content keeps its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, lead: PICKER });
    for (const f of spec.fixtures) {
      await expect(stage(page, f.id).getByRole('button', { name: 'New video', exact: true }), f.id).toHaveCount(1);
      expect(await overlay(page, f.id).getAttribute('aria-hidden'), f.id).toBe('true');
      expect(await host(page, f.id).getAttribute('role'), f.id).toBeNull();
    }
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the content it holds and — while dragged — the overlay the spec gives it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, lead: PICKER });
    expect(spec.fixtures).toHaveLength(6);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      await expect(stage(page, f.id).locator('p'), f.id).toHaveText(String(f.content));
      const shown = f.id.startsWith('dragged') && !f.props.disabled;
      expect(await condition(page, f.id), f.id).toBe(shown ? (f.props.accept ? 'refusing' : 'receiving') : null);
      if (shown) await expect(part(page, f.id, 'label'), f.id).toHaveText(String(f.props.accept ? f.props.refusingText : f.props.dropText));
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: [f] });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
