// <tanrei-file-picker>, driven by specs/file-picker.spec.json: every behaviour id (FPK-1…31) starts the title of a test,
// every fixture has a baseline, and every length and color is read back from the tokens — never from a number written
// here. A file is chosen through the browser's own picker (Playwright's filechooser event), and a drag is a DragEvent
// that carries a DataTransfer the page made. The sentences the web holds as the nearest thing (FPK-6, FPK-13, FPK-14,
// FPK-17, FPK-21) are named where a test holds them.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, iconFaceArrives, loadSpec, missingWords, mountFixtures, resolveToken, setWords, tab, tabTo, withoutIconFont, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('file-picker');
type P = Page;
const TAG = 'tanrei-file-picker';

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
/** The parts of the file picker's own shadow root, each named with its parent: a Button has parts of the same names. */
const chooser = (page: P, id: string) => host(page, id).locator('.group > .chooser');
const own = (page: P, id: string, name: 'icon' | 'label' | 'supporting' | 'line' | 'outline') => host(page, id).locator(`.group > .chooser > .${name}`);
const selection = (page: P, id: string) => host(page, id).locator('.group > .chooser > .line > .selection');
const trigger = (page: P, id: string) => host(page, id).locator(':scope > [slot="trigger"]');
/** The trigger's native button: where a Button carries what its host is given. */
const native = (page: P, id: string) => trigger(page, id).locator('[part="container"]');
const T = (name: string) => `--tanrei-comp-file-picker-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string, pseudo?: string) => locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p!), [property, pseudo ?? null] as const);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function logged(page: P, type: 'warning' | 'error' = 'warning') {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === type) seen.push(message.text());
  });
  return seen;
}
type Extra = Partial<Fixture>;
/** A fixture of the test's own: its props, and the product's Button in the trigger slot unless the test says otherwise. */
const fx = (id: string, props: Fixture['props'], extra: Extra = {}): Fixture => ({ id, props, slots: { trigger: 'Choose files' }, ...extra });
/**
 * The picker is asked of the browser for the whole of a test, not at each wait. Playwright takes the browser's picker
 * over only while the page has a `filechooser` listener, and tells the browser so without waiting for its answer: a
 * wait that begins with a key press — which, unlike a click, is sent at once — can reach the page before the browser
 * has been told again, and then the picker the element asked for is the browser's own and no event comes. A listener
 * held from the mount keeps it taken.
 */
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => {
  page.on('filechooser', () => {});
  return mountFixtures(page, spec, { icons: true, fixtures, ...options });
};
const mountSpec = (page: P, ...ids: string[]) => mount(page, ids.length ? spec.fixtures.filter((f) => ids.includes(f.id)) : spec.fixtures);
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
/** One turn of the page: what the file picker tells a debug build a turn after it is presented has been told. */
const turn = (page: P) => page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
/** The acme fixture system on the whole page: three different state strengths, and glow as the focus style. */
const underAcme = async (page: P) =>
  page.evaluate((sheet) => {
    document.head.insertAdjacentHTML('beforeend', `<style>${sheet}</style>`);
    document.documentElement.setAttribute('data-tanrei-system', 'acme');
  }, await acmeSystemCss());

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
const painted = (locator: Locator, property: string, pseudo?: string) =>
  locator.evaluate(
    (el, [p, ps]) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.fillStyle = getComputedStyle(el, ps ?? undefined).getPropertyValue(p!);
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    },
    [property, pseudo ?? null] as const,
  );
const sameColor = (actual: number[], expected: number[], message = '') => {
  for (let i = 0; i < 4; i++) expect(Math.abs(actual[i] - expected[i]), `${message}: ${actual.join(',')} ≈ ${expected.join(',')}`).toBeLessThanOrEqual(2);
};
const tokenColor = (page: P, name: string) => colorOf(page, `var(${T(name)})`);
const isColor = async (page: P, locator: Locator, property: string, name: string, message = name) => sameColor(await painted(locator, property), await tokenColor(page, name), message);
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
/** The deepest focused element, as `host tag.class` through the shadow roots it is in. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (!active) return '';
    const within = (active.getRootNode() as ShadowRoot).host;
    return `${within ? `${within.localName} ` : ''}${active.localName}${active.classList.length ? `.${[...active.classList].join('.')}` : ''}`;
  });
/** Whether focus is on the fixture's trigger. */
const onTrigger = (page: P, id: string) => trigger(page, id).evaluate((el) => el.matches(':focus-within') || el === document.activeElement);
/** What the file picker draws as text and says by an attribute: everything in its shadow root a person reads or hears. */
const said = (page: P, id: string) =>
  host(page, id).evaluate((el) => ({
    text: (() => {
      const texts: string[] = [];
      const walker = document.createTreeWalker(el.shadowRoot!, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) if (walker.currentNode.textContent!.trim()) texts.push(walker.currentNode.textContent!.replace(/\s+/g, ' ').trim());
      return texts.join(' ');
    })(),
    attributes: [...el.shadowRoot!.querySelectorAll('[aria-label], [aria-description], [title], [alt], [placeholder]')].map((node) => node.getAttribute('aria-label') ?? node.getAttribute('aria-description') ?? node.getAttribute('title') ?? ''),
    live: el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]').length,
  }));

// ── What the product hears ───────────────────────────────────────────────────────────────────────────────────────
interface Heard {
  type: string;
  files?: string[];
  reasons?: string[];
}
/** Records select and reject on the page, from now on. */
const listen = (page: P) =>
  page.evaluate(() => {
    const heard: unknown[] = [];
    (window as unknown as { __heard: unknown[] }).__heard = heard;
    document.addEventListener('select', (event) => {
      const detail = (event as CustomEvent<{ files: File[] }>).detail;
      if (detail?.files) heard.push({ type: 'select', files: detail.files.map((f) => f.name) });
    });
    document.addEventListener('reject', (event) => {
      const detail = (event as CustomEvent<{ files: { file: File; reason: string }[] }>).detail;
      heard.push({ type: 'reject', files: detail.files.map((f) => f.file.name), reasons: detail.files.map((f) => f.reason) });
    });
    // A control's other events: none of them is the file picker's.
    for (const type of ['change', 'input', 'remove', 'retry', 'cancel']) document.addEventListener(type, () => heard.push({ type }));
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { __heard: Heard[] }).__heard);
const forget = (page: P) => page.evaluate(() => void ((window as unknown as { __heard: Heard[] }).__heard.length = 0));

interface Given {
  name: string;
  type?: string;
  size?: number;
}
const payload = (files: Given[]) => files.map((f) => ({ name: f.name, mimeType: f.type ?? '', buffer: Buffer.alloc(f.size ?? 4, 1) }));
/** Chooses files in the browser's own picker, opened by `opener` (the trigger's click unless another is given). */
async function choose(page: P, id: string, files: Given[], opener: () => Promise<unknown> = () => trigger(page, id).click()) {
  const [picker] = await Promise.all([page.waitForEvent('filechooser'), opener()]);
  await picker.setFiles(payload(files));
  return picker;
}
/**
 * A drag event on the area (or on a part inside it), carrying a DataTransfer the page made: files, or text alone.
 * Returns whether the area took the event and the effect it named.
 */
const drag = (page: P, id: string, type: 'dragenter' | 'dragover' | 'dragleave' | 'drop', files: Given[], { text = false, on = '' }: { text?: boolean; on?: string } = {}) =>
  host(page, id).evaluate(
    (el, [t, given, withText, where]) => {
      const data = new DataTransfer();
      // What the area names as the effect: a DataTransfer the page made keeps none outside a real drag, so it is recorded.
      let effect = 'unset';
      Object.defineProperty(data, 'dropEffect', { configurable: true, get: () => effect, set: (value: string) => void (effect = value) });
      for (const f of given) data.items.add(new File([new Uint8Array(f.size ?? 4)], f.name, { type: f.type ?? '' }));
      if (withText) data.setData('text/plain', 'words');
      const area = el.shadowRoot!.querySelector('.chooser')!;
      const target = where === 'trigger' ? el.querySelector('[slot="trigger"]')! : where ? area.querySelector(where)! : area;
      const event = new DragEvent(t, { bubbles: true, cancelable: true, composed: true, dataTransfer: data });
      target.dispatchEvent(event);
      return { taken: event.defaultPrevented, effect, carried: !!event.dataTransfer };
    },
    [type, files, text, on] as const,
  );
const condition = (page: P, id: string) => chooser(page, id).getAttribute('data-drag');
const PDF: Given = { name: 'brief.pdf', type: 'application/pdf' };
const PNG: Given = { name: 'plan.png', type: 'image/png' };
const TXT: Given = { name: 'notes.txt', type: 'text/plain' };

/** Chromium's accessibility tree over the DevTools protocol: every node that is not ignored, with what the browser computed. */
async function axTree(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  // In the tree's own order — depth first from the root, as a reader meets it — not the order the engine lists its
  // nodes in, which follows when each node was made.
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const ordered: typeof nodes = [];
  const walk = (id: string) => {
    const node = byId.get(id);
    if (!node) return;
    ordered.push(node);
    for (const child of node.childIds ?? []) walk(child);
  };
  walk(nodes[0]!.nodeId);
  return ordered
    .filter((node) => !node.ignored)
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value.value;
      return { role: node.role?.value as string, name: (node.name?.value ?? '') as string, description: (node.description?.value ?? '') as string, invalid: property('invalid'), required: property('required'), disabled: property('disabled'), focusable: property('focusable') };
    });
}

test.describe('behavior', () => {
  test('FPK-1: one part from the start edge — the trigger with its texts, or the drop area — as wide as its layout gives it and as tall as its parts; no container, fill or edge around the whole, no list and no row, and no label, help, error text or requirement mark of its own', async ({ page }) => {
    await mountSpec(page, 'button', 'drop-area', 'button-bare', 'drop-area-error');
    for (const id of ['button', 'drop-area', 'button-bare']) {
      const [whole, top] = [await box(host(page, id)), await box(chooser(page, id))];
      near(whole.width, 360, `${id}: as wide as its layout gives it`);
      near(top.x, whole.x, `${id}: from the start edge`);
      near(top.y, whole.y, `${id}: the one part at the top`);
      near(top.y + top.height, whole.y + whole.height, `${id}: as tall as its parts`);
      for (const part of [host(page, id), host(page, id).locator('.group')]) {
        expect((await painted(part, 'background-color'))[3], `${id}: no fill`).toBe(0);
        expect(await css(part, 'border-top-width'), `${id}: no edge`).toBe('0px');
        expect(await css(part, 'padding-top'), `${id}: no container`).toBe('0px');
      }
      // One part: the group holds the chooser, and the picker nobody meets (FPK-6).
      expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelector('.group')!.children].map((child) => child.classList[0]))).toEqual(['chooser', 'picker']);
      // No list and no row for what was chosen.
      await expect(stage(page, id).getByRole('list')).toHaveCount(0);
      await expect(stage(page, id).getByRole('listitem')).toHaveCount(0);
    }
    // The label names the group and is not drawn; nothing is drawn that the product did not write as a text of the picker's.
    expect((await said(page, 'button')).text).toBe('No file chosen PDF, up to 10 MB');
    expect((await said(page, 'drop-area')).text).toBe('upload Drag files here, or choose them PDF or PNG, up to 10 MB each');
    expect((await said(page, 'button-bare')).text).toBe('');
    // The error condition draws no text and no mark (they are the Field's, FPK-21): the same parts, in the same places.
    expect((await said(page, 'drop-area-error')).text).toBe('upload Drag files here, or choose them PDF or PNG, up to 10 MB each');
    near((await box(host(page, 'drop-area-error'))).height, (await box(host(page, 'drop-area'))).height, 'no error text');
    // With the trigger alone it is as tall as the trigger.
    near((await box(host(page, 'button-bare'))).height, (await box(trigger(page, 'button-bare'))).height, 'as tall as the trigger');
  });

  test('FPK-2: the button layout draws the trigger at its start edge, selectionText after it on its line while it is not empty, and constraintsText below; no area, edge or glyph, dropText and the icon slot ignored, and no drop taken; the file picker never writes or changes selectionText', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['button', 'button-chosen', 'button-bare', 'button-long-text'].includes(f.id)), fx('ignores', { label: 'A', dropText: 'Drag here', selectionText: 'No file chosen' }, { slots: { trigger: 'Choose', icon: 'image' } })]);
    const [whole, button, text, limits] = [await box(host(page, 'button')), await box(trigger(page, 'button')), await box(selection(page, 'button')), await box(own(page, 'button', 'supporting'))];
    near(button.x, whole.x, 'the trigger at the start edge');
    near(text.x - (button.x + button.width), await token(page, 'trigger-gap'), 'trigger.gap');
    near(text.y + text.height / 2, button.y + button.height / 2, 'centred on the trigger');
    await expect(selection(page, 'button')).toHaveText('No file chosen');
    expect(await textStyle(selection(page, 'button'))).toEqual(await role(page, 'selection-text-typescale'));
    await isColor(page, selection(page, 'button'), 'color', 'standard-selection-text-color');
    near(limits.y - (button.y + button.height), await token(page, 'supporting-text-gap'), 'supporting-text.gap');
    near(limits.x, whole.x, 'the limits from the start edge');
    expect(await textStyle(own(page, 'button', 'supporting'))).toEqual(await role(page, 'supporting-text-typescale'));
    await isColor(page, own(page, 'button', 'supporting'), 'color', 'standard-supporting-text-color');
    // Whatever the product wrote is drawn — a file's own name too — and nothing where it wrote nothing.
    await expect(selection(page, 'button-chosen')).toHaveText('brief.pdf');
    await expect(selection(page, 'button-bare')).toHaveCount(0);
    await expect(own(page, 'button-bare', 'supporting')).toHaveCount(0);
    // No area, edge or glyph; dropText and the icon slot are ignored.
    for (const id of ['button', 'ignores']) {
      for (const name of ['outline', 'icon', 'label'] as const) await expect(own(page, id, name), `${id} ${name}`).toHaveCount(0);
      expect((await painted(chooser(page, id), 'background-color'))[3]).toBe(0);
      expect(await css(chooser(page, id), 'border-top-width')).toBe('0px');
    }
    await expect(host(page, 'ignores').locator('.group')).not.toContainText('Drag here');
    await expect(host(page, 'ignores').locator(':scope > [slot="icon"]')).toBeHidden();
    // It takes no drop: the drag is left to the browser.
    await listen(page);
    for (const type of ['dragenter', 'dragover', 'drop'] as const) expect((await drag(page, 'button', type, [PDF])).taken, type).toBe(false);
    expect(await condition(page, 'button')).toBeNull();
    expect(await heard(page)).toEqual([]);
    // It keeps nothing, so a choice changes no word: the text is the product's to write.
    await choose(page, 'button', [PDF]);
    expect(await heard(page)).toEqual([{ type: 'select', files: ['brief.pdf'] }]);
    await expect(selection(page, 'button')).toHaveText('No file chosen');
    expect(await host(page, 'button').evaluate((el: HTMLElement & { selectionText: string }) => [el.selectionText, el.getAttribute('selection-text')])).toEqual(['No file chosen', 'No file chosen']);
    // A text too long for the line wraps below the trigger, on as many lines as it needs, and is never cut.
    for (const part of [selection(page, 'button-long-text'), own(page, 'button-long-text', 'supporting')]) {
      const [b, long] = [await box(part), await box(host(page, 'button-long-text'))];
      expect(b.height, 'wraps').toBeGreaterThan(Number.parseFloat((await textStyle(part)).lineHeight) * 1.5);
      expect(b.x).toBeGreaterThanOrEqual(long.x - 0.5);
      expect(b.x + b.width).toBeLessThanOrEqual(long.x + long.width + 0.5);
      expect(await part.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis' && getComputedStyle(el).overflow === 'visible')).toBe(true);
    }
    const longTrigger = await box(trigger(page, 'button-long-text'));
    expect((await box(selection(page, 'button-long-text'))).y, 'below the trigger').toBeGreaterThanOrEqual(longTrigger.y + longTrigger.height - 0.5);
    // A line too short for both: the text wraps below the trigger.
    await page.addStyleTag({ content: `.stage > ${TAG} { inline-size: 150px !important; }` });
    const [narrowButton, narrowText] = [await box(trigger(page, 'button')), await box(selection(page, 'button'))];
    expect(narrowText.y).toBeGreaterThanOrEqual(narrowButton.y + narrowButton.height - 0.5);
  });

  test('FPK-3: the drop area is a container across the whole width with container.shape corners, its fill and its edge inside its size, and one centred column — the glyph, dropText, the trigger, constraintsText — container.gap apart inside the paddings; as tall as its parts, and without selectionText', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['drop-area', 'drop-area-trigger-only', 'long-text'].includes(f.id)), fx('with-selection', { label: 'A', layout: 'drop-area', selectionText: 'No file chosen' })]);
    const id = 'drop-area';
    const area = chooser(page, id);
    const [whole, a] = [await box(host(page, id)), await box(area)];
    near(a.width, whole.width, 'across the whole width');
    near(Number.parseFloat(await css(area, 'border-top-left-radius')), await token(page, 'container-shape'), 'container.shape');
    expect(await area.getAttribute('data-tanrei-shape')).not.toBeNull();
    sameColor(await painted(area, 'background-color'), await tokenColor(page, 'standard-container-color'), 'the fill');
    const parts = [await box(own(page, id, 'icon')), await box(own(page, id, 'label')), await box(trigger(page, id)), await box(own(page, id, 'supporting'))];
    const [gap, padBlock, padInline] = [await token(page, 'container-gap'), await token(page, 'container-padding-block'), await token(page, 'container-padding-inline')];
    near(parts[0].y - a.y, padBlock, 'padding-block above');
    near(a.y + a.height - (parts[3].y + parts[3].height), padBlock, 'padding-block below');
    for (let i = 1; i < parts.length; i++) near(parts[i].y - (parts[i - 1].y + parts[i - 1].height), gap, `container.gap before part ${i}`);
    for (const [i, part] of parts.entries()) near(part.x + part.width / 2, a.x + a.width / 2, `part ${i} centred`);
    // As tall as its parts and paddings.
    near(a.height, 2 * padBlock + parts.reduce((sum, part) => sum + part.height, 0) + 3 * gap, 'no height of its own');
    expect(await textStyle(own(page, id, 'label'))).toEqual(await role(page, 'label-typescale'));
    await isColor(page, own(page, id, 'label'), 'color', 'standard-label-color');
    expect(await textStyle(own(page, id, 'supporting'))).toEqual(await role(page, 'supporting-text-typescale'));
    await isColor(page, own(page, id, 'supporting'), 'color', 'standard-supporting-text-color');
    for (const name of ['label', 'supporting'] as const) expect(await css(own(page, id, name), 'text-align')).toBe('center');
    // Long texts wrap inside the paddings and are never cut.
    const long = await box(chooser(page, 'long-text'));
    for (const name of ['label', 'supporting'] as const) {
      const text = own(page, 'long-text', name);
      const b = await box(text);
      expect(b.height, `${name} wraps`).toBeGreaterThan(Number.parseFloat((await textStyle(text)).lineHeight) * 1.5);
      expect(b.x).toBeGreaterThanOrEqual(long.x + padInline - 0.5);
      expect(b.x + b.width).toBeLessThanOrEqual(long.x + long.width - padInline + 0.5);
      expect(await text.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis')).toBe(true);
    }
    // The trigger alone, and no selectionText in this layout: what was dropped on a place is shown below it, by whoever holds it.
    const alone = await box(chooser(page, 'drop-area-trigger-only'));
    near(alone.height, 2 * padBlock + (await box(own(page, 'drop-area-trigger-only', 'icon'))).height + gap + (await box(trigger(page, 'drop-area-trigger-only'))).height, 'the area with the trigger alone');
    await expect(selection(page, 'with-selection')).toHaveCount(0);
    await expect(host(page, 'with-selection').locator('.group')).not.toContainText('No file chosen');
  });

  test('FPK-4: the edge is drawn as outline.style names — dashes of outline.dash-length with gaps of the same length along the corners, or one unbroken line, solid too where the corners are eased — and the glyph at the top is the upload glyph or the one in the icon slot, at icon.size, kept from assistive technology', async ({ page }) => {
    await mountSpec(page, 'drop-area', 'drop-area-icon');
    const id = 'drop-area';
    const rect = own(page, id, 'outline').locator('rect');
    const [width, dash] = [await token(page, 'outline-width'), await token(page, 'outline-dash-length')];
    // Dashed (the default system): the stroke of a rounded rectangle that lies inside the area's size.
    expect((await css(rect, 'stroke-dasharray')).split(/[\s,]+/).map(Number.parseFloat)).toEqual([dash, dash]);
    near(Number.parseFloat(await css(rect, 'stroke-width')), width, 'outline.width');
    sameColor(await painted(rect, 'stroke'), await tokenColor(page, 'standard-outline-color'), 'the edge');
    expect(await css(own(page, id, 'outline'), 'opacity')).toBe('1');
    expect(await css(chooser(page, id), 'border-top-width')).toBe('0px');
    const [a, r] = [await box(chooser(page, id)), await box(rect)];
    expect(r.x).toBeGreaterThanOrEqual(a.x - 0.1);
    expect(r.x + r.width).toBeLessThanOrEqual(a.x + a.width + 0.1);
    near(Number.parseFloat(await css(rect, 'rx')), (await token(page, 'container-shape')) - width / 2, 'the dashes follow the corners');
    const before = await box(own(page, id, 'label'));
    // Solid: one unbroken line, a border inside the area's size; nothing moves.
    await override(page, { [T('outline-style')]: 'solid' });
    // Without style queries the element writes the name when it renders.
    await host(page, id).evaluate((el: HTMLElement & { requestUpdate: () => void; updateComplete: Promise<unknown> }) => (el.requestUpdate(), el.updateComplete));
    near(Number.parseFloat(await css(chooser(page, id), 'border-top-width')), width, 'a solid edge of outline.width');
    expect(await css(chooser(page, id), 'border-top-style')).toBe('solid');
    sameColor(await painted(chooser(page, id), 'border-top-color'), await tokenColor(page, 'standard-outline-color'), 'the solid edge');
    expect(await css(own(page, id, 'outline'), 'opacity')).toBe('0');
    const after = await box(own(page, id, 'label'));
    near(after.y, before.y, 'the content stands where it stood');
    near((await box(chooser(page, id))).height, a.height, 'the area keeps its size');
    // A name it does not know is the first value: dashed.
    await override(page, { [T('outline-style')]: 'dotted' });
    await host(page, id).evaluate((el: HTMLElement & { requestUpdate: () => void; updateComplete: Promise<unknown> }) => (el.requestUpdate(), el.updateComplete));
    expect(await css(own(page, id, 'outline'), 'opacity'), 'an unknown name is dashed').toBe('1');
    await override(page, { [T('outline-style')]: 'dashed' });
    await host(page, id).evaluate((el: HTMLElement & { requestUpdate: () => void; updateComplete: Promise<unknown> }) => (el.requestUpdate(), el.updateComplete));
    // Eased corners: solid where the browser draws them, dashed where it draws quarter circles.
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0.6' });
    const eased = await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(log(2, 2))'));
    expect(await css(own(page, id, 'outline'), 'opacity')).toBe(eased ? '0' : '1');
    near(Number.parseFloat(await css(chooser(page, id), 'border-top-width')), eased ? width : 0, 'solid along eased corners');
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0' });
    // The glyph.
    const glyph = own(page, id, 'icon');
    await expect(glyph).toHaveText('upload');
    expect(await glyph.getAttribute('aria-hidden')).toBe('true');
    const g = await box(glyph);
    near(g.width, await token(page, 'icon-size'), 'icon.size');
    near(g.height, await token(page, 'icon-size'), 'icon.size');
    await isColor(page, glyph, 'color', 'standard-icon-color');
    const family = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-icon-family-unselected').trim().replaceAll('"', ''));
    expect((await css(glyph, 'font-family')).replaceAll('"', '')).toContain(family.split(',')[0].trim());
    expect(await css(glyph, 'font-variation-settings')).toContain('"FILL" 0');
    await expect.poll(() => glyph.getAttribute('data-drawn')).not.toBeNull();
    // The product's glyph in its place.
    const product = own(page, 'drop-area-icon', 'icon');
    await expect(product.locator('.ink')).toHaveCount(0);
    await expect(host(page, 'drop-area-icon').locator(':scope > [slot="icon"]')).toHaveText('image');
    await expect(host(page, 'drop-area-icon').locator(':scope > [slot="icon"]')).toBeVisible();
    await expect.poll(() => product.getAttribute('data-drawn')).not.toBeNull();
    expect(await product.getAttribute('aria-hidden')).toBe('true');
  });

  test('FPK-5: the trigger is the product’s own Button, left what it is; activating it by pointer, Enter or Space opens the browser’s picker; an empty trigger slot still renders, still takes presses on its area and is reported as a functional failure; of several elements the first is used', async ({ page }) => {
    const errors = logged(page, 'error');
    const warnings = logged(page);
    await mount(page, [
      fx('one', { label: 'A', constraintsText: 'Any file' }),
      fx('none', { label: 'A', layout: 'drop-area' }, { slots: {} }),
      { id: 'two', props: { label: 'A' }, content: '<tanrei-button slot="trigger" id="first">First</tanrei-button><tanrei-button slot="trigger" id="second">Second</tanrei-button>' },
    ]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div class="stage" id="bare"><tanrei-button variant="text">Choose files</tanrei-button></div>'));
    // Left what it is: the Button it would be outside a file picker.
    const [inside, outside] = [native(page, 'one'), page.locator('#bare tanrei-button [part="container"]')];
    for (const property of ['background-color', 'color', 'height', 'padding-inline-start', 'border-radius', 'font-size']) expect(await css(inside, property), property).toBe(await css(outside, property));
    near((await box(inside)).width, (await box(outside)).width, 'the size the product gave it');
    await expect(trigger(page, 'one')).toHaveText('Choose files');
    // Any input the Button takes.
    const opened = async (act: () => Promise<unknown>) => {
      const [picker] = await Promise.all([page.waitForEvent('filechooser'), act()]);
      return picker;
    };
    await opened(() => trigger(page, 'one').click());
    await page.locator('body').click({ position: { x: 700, y: 5 } });
    await tabTo(page, native(page, 'one'));
    await opened(() => page.keyboard.press('Enter'));
    await page.mouse.move(700, 5);
    await page.mouse.down();
    await page.mouse.up();
    await tabTo(page, native(page, 'one'));
    await opened(() => page.keyboard.press('Space'));
    // No trigger: it renders, its area is still pressed, and the failure is reported — as an error, once.
    await expect(chooser(page, 'none')).toBeVisible();
    const a = await box(chooser(page, 'none'));
    await opened(() => page.mouse.click(a.x + 20, a.y + 20));
    expect(errors.filter((text) => text.includes('FPK-5') && text.includes('keyboard')).length).toBe(1);
    // Several: the first opens the picker, the others do not, and they are reported.
    await opened(() => page.locator('#first').click());
    let stray = false;
    page.once('filechooser', () => (stray = true));
    await page.locator('#second').click();
    await turn(page);
    expect(stray, 'the second element is not the trigger').toBe(false);
    expect(warnings.some((text) => text.includes('FPK-5') && text.includes('2 elements'))).toBe(true);
  });

  test('FPK-6: the picker is the browser’s own, asked for one file or for any number and for the kinds accept lists; after a choice focus is on the trigger; leaving it without choosing emits nothing and changes nothing; no second picker is opened while one is open', async ({ page }) => {
    await mount(page, [fx('single', { label: 'A', accept: ['.pdf', 'image/png'], constraintsText: 'x', selectionText: 'None' }), fx('many', { label: 'A', multiple: true })]);
    await listen(page);
    const one = await choose(page, 'single', [PDF]);
    expect(one.isMultiple()).toBe(false);
    expect(await one.element().evaluate((el: HTMLInputElement) => [el.type, el.accept, el.localName])).toEqual(['file', '.pdf,image/png', 'input']);
    // The picker is no part of the page a person meets: not drawn, not a stop, not exposed.
    expect(await one.element().evaluate((el: HTMLInputElement) => [getComputedStyle(el).display, el.tabIndex, el.getAttribute('aria-hidden')])).toEqual(['none', -1, 'true']);
    expect(await heard(page)).toEqual([{ type: 'select', files: ['brief.pdf'] }]);
    // Focus is left on the trigger: where the activation had it. The element moves none after a choice, so after a
    // choice by pointer in Safari — where a click gives a button no focus — it is where it was before
    // (a sentence the spec leaves open); the key puts it on the trigger everywhere.
    await forget(page);
    await tabTo(page, native(page, 'single'));
    await choose(page, 'single', [PDF], () => page.keyboard.press('Enter'));
    expect(await heard(page)).toEqual([{ type: 'select', files: ['brief.pdf'] }]);
    expect(await focused(page)).toContain('tanrei-button');
    expect(await onTrigger(page, 'single')).toBe(true);
    const many = await choose(page, 'many', [PDF, PNG]);
    expect(many.isMultiple()).toBe(true);
    expect(await many.element().evaluate((el: HTMLInputElement) => el.accept)).toBe('');
    // The value is cleared after each choice: the same file can be chosen again.
    expect(await one.element().evaluate((el: HTMLInputElement) => el.value)).toBe('');
    await forget(page);
    await choose(page, 'single', [PDF]);
    expect(await heard(page)).toEqual([{ type: 'select', files: ['brief.pdf'] }]);
    // Left without choosing: nothing is emitted — the input's own cancel does not leave the element either — nothing
    // changes, focus stays on the trigger, and the next press opens the picker again.
    await forget(page);
    const before = await said(page, 'single');
    await tabTo(page, native(page, 'single'));
    const [left] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')]);
    await left.element().evaluate((el) => el.dispatchEvent(new Event('cancel', { bubbles: true })));
    expect(await heard(page)).toEqual([]);
    expect(await said(page, 'single')).toEqual(before);
    expect(await host(page, 'single').evaluate((el: HTMLElement & { error: boolean; selectionText: string }) => [el.error, el.selectionText])).toEqual([false, 'None']);
    expect(await onTrigger(page, 'single')).toBe(true);
    await choose(page, 'single', [PDF]);
    expect(await heard(page)).toEqual([{ type: 'select', files: ['brief.pdf'] }]);
    // While a picker it opened is open, no second: two activations in one task ask the browser once. (The element
    // cannot ask a browser whether its picker is open: it remembers that it opened one until the input answers or
    // the person's next input inside it — point 8 of the same entry.)
    let pickers = 0;
    page.on('filechooser', () => pickers++);
    await trigger(page, 'many').evaluate((el: HTMLElement) => {
      el.click();
      el.click();
    });
    await turn(page);
    expect(pickers).toBe(1);
  });

  test('FPK-7: it keeps nothing and sends nothing — choosing and dropping make no request, the element creates no reader, no stream and no object URL, holds no file after the turn, and judges a second choice as if it were the first; it is not form-associated: no name, no value, no validity, and no entry in the FormData of a form around it', async ({ page }) => {
    await mount(page, [fx('a', { label: 'A', layout: 'drop-area', multiple: true, accept: ['.pdf', 'image/*'], maxSize: 1000, maxFiles: 1, required: true, constraintsText: 'x' })]);
    // A form around it, with a name written on it as a product might.
    await host(page, 'a').evaluate((el) => {
      const form = document.createElement('form');
      el.before(form);
      el.setAttribute('name', 'attachment');
      form.append(el);
    });
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.evaluate(() => {
      const used: string[] = [];
      (window as unknown as { __used: string[] }).__used = used;
      const spy = (owner: Record<string, unknown>, name: string, label: string) => {
        const original = owner[name] as (...args: unknown[]) => unknown;
        if (typeof original !== 'function') return;
        owner[name] = function (this: unknown, ...args: unknown[]) {
          used.push(label);
          return original.apply(this, args);
        };
      };
      for (const name of ['arrayBuffer', 'text', 'stream', 'slice', 'bytes']) spy(Blob.prototype as unknown as Record<string, unknown>, name, `Blob.${name}`);
      for (const name of ['readAsArrayBuffer', 'readAsText', 'readAsDataURL', 'readAsBinaryString']) spy(FileReader.prototype as unknown as Record<string, unknown>, name, `FileReader.${name}`);
      spy(URL as unknown as Record<string, unknown>, 'createObjectURL', 'URL.createObjectURL');
      spy(window as unknown as Record<string, unknown>, 'fetch', 'fetch');
      spy(window as unknown as Record<string, unknown>, 'createImageBitmap', 'createImageBitmap');
      spy(XMLHttpRequest.prototype as unknown as Record<string, unknown>, 'send', 'XMLHttpRequest.send');
      spy(navigator as unknown as Record<string, unknown>, 'sendBeacon', 'sendBeacon');
      spy(HTMLElement.prototype as unknown as Record<string, unknown>, 'attachInternals', 'attachInternals');
      const Reader = window.FileReader;
      (window as unknown as Record<string, unknown>).FileReader = function () {
        used.push('new FileReader');
        return new Reader();
      };
      const Socket = window.WebSocket;
      (window as unknown as Record<string, unknown>).WebSocket = function (...args: [string]) {
        used.push('new WebSocket');
        return new Socket(...args);
      };
    });
    await listen(page);
    await choose(page, 'a', [PDF, TXT, { name: 'big.pdf', type: 'application/pdf', size: 5000 }]);
    // A second choice is judged as if it were the first: the one file maxFiles lets in is let in again.
    await choose(page, 'a', [PDF, { name: 'second.pdf', type: 'application/pdf' }]);
    const carried = (await drag(page, 'a', 'dragenter', [PNG, TXT])).carried;
    for (const type of ['dragover', 'drop'] as const) await drag(page, 'a', type, [PNG, TXT]);
    await turn(page);
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['brief.pdf'] },
      { type: 'reject', files: ['notes.txt', 'big.pdf'], reasons: ['type', 'size'] },
      { type: 'select', files: ['brief.pdf'] },
      { type: 'reject', files: ['second.pdf'], reasons: ['count'] },
      ...(carried
        ? [
            { type: 'select', files: ['plan.png'] },
            { type: 'reject', files: ['notes.txt'], reasons: ['type'] },
          ]
        : []),
    ]);
    expect(await page.evaluate(() => (window as unknown as { __used: string[] }).__used)).toEqual([]);
    expect(requests).toEqual([]);
    // It keeps none: the picker holds nothing after the choice, and no property of the element holds a file.
    const kept = await host(page, 'a').evaluate((el) => {
      const holds = (value: unknown): boolean => value instanceof File || value instanceof FileList || (Array.isArray(value) && value.some(holds)) || (value instanceof Set && [...value].some(holds)) || (value instanceof Map && [...value.values()].some(holds));
      return { picker: el.shadowRoot!.querySelector<HTMLInputElement>('input')!.files!.length, own: Object.getOwnPropertyNames(el).filter((name) => holds((el as unknown as Record<string, unknown>)[name])) };
    });
    expect(kept).toEqual({ picker: 0, own: [] });
    // No part in a form: not form-associated, no value, no validity, nothing submitted, nothing to reset — also with `required`.
    const form = await host(page, 'a').evaluate((el) => {
      const formOf = el.closest('form')!;
      formOf.reset();
      return {
        associated: (el.constructor as unknown as { formAssociated?: boolean }).formAssociated === true,
        members: ['form', 'value', 'validity', 'checkValidity', 'reportValidity', 'willValidate', 'files', 'name'].filter((name) => name in el),
        entries: [...new FormData(formOf).keys()],
        valid: formOf.checkValidity(),
      };
    });
    expect(form).toEqual({ associated: false, members: [], entries: [], valid: true });
    expect((await heard(page)).length, 'a reset says nothing').toBe(carried ? 6 : 4);
  });

  test('FPK-8: a press on the drop area by pointer shows the pressed state without delay and keeps it for at least press-hold, even when the press ends at once; the area answers no key, and a press that begins on the trigger is not the area’s', async ({ page }) => {
    await mountSpec(page, 'drop-area');
    const hold = await resolveToken(page, '--tanrei-sys-motion-duration-press-hold', 'duration');
    expect(hold).toBeGreaterThan(0);
    const area = chooser(page, 'drop-area');
    const held = await area.evaluate(
      (el: HTMLElement, ms) =>
        new Promise<{ immediate: string | undefined; kept: number }>((resolve) => {
          const r = el.getBoundingClientRect();
          const at = { clientX: r.left + 6, clientY: r.top + 6, bubbles: true, composed: true };
          const start = performance.now();
          el.dispatchEvent(new PointerEvent('pointerdown', { ...at, button: 0, pointerType: 'mouse' }));
          const immediate = el.dataset.pressed;
          el.dispatchEvent(new PointerEvent('pointerup', { ...at, button: 0, pointerType: 'mouse' }));
          const stillThere = el.dataset.pressed;
          const look = () => {
            if (el.dataset.pressed === undefined) resolve({ immediate: immediate && stillThere, kept: performance.now() - start });
            else if (performance.now() - start > ms * 20 + 2000) resolve({ immediate, kept: Number.POSITIVE_INFINITY });
            else setTimeout(look, 1);
          };
          look();
        }),
      hold,
    );
    expect(held.immediate, 'pressed without delay, and still pressed when the press ends').toBeTruthy();
    expect(held.kept, 'kept for press-hold').toBeGreaterThanOrEqual(hold - 1);
    expect(held.kept).toBeLessThan(hold * 20 + 2000);
    // A touch is a press too.
    expect(await area.evaluate((el: HTMLElement) => (el.dispatchEvent(new PointerEvent('pointerdown', { clientX: 5, clientY: 5, button: 0, pointerType: 'touch', bubbles: true, composed: true })), el.dataset.pressed))).toBeTruthy();
    await area.evaluate((el) => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true })));
    await expect.poll(() => area.getAttribute('data-pressed')).toBeNull();
    // The area answers no key (FPK-12), and a press that begins on the trigger is not the area's.
    for (const key of ['Enter', ' ']) expect(await area.evaluate((el: HTMLElement, k) => (el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true })), el.dataset.pressed), key)).toBeUndefined();
    const t = await box(trigger(page, 'drop-area'));
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
    await page.mouse.down();
    expect(await area.getAttribute('data-pressed')).toBeNull();
    await page.mouse.move(5, 5);
    await page.mouse.up();
  });

  test('FPK-9: files are judged in the order the browser gave them, by what it reports — more than one where one is asked refuses all (count); a kind accept does not list, type; larger than maxSize, size; beyond the first maxFiles of one arrival, count — then select once and reject once, in that order; each arrival by itself, and nothing drawn or said for it', async ({ page }) => {
    await mount(page, [
      fx('single', { label: 'A' }),
      fx('kinds', { label: 'A', multiple: true, accept: ['.PDF', 'image/png', 'video/*'], maxSize: 100, constraintsText: 'x' }),
      fx('room', { label: 'A', multiple: true, maxFiles: 3, constraintsText: 'x' }),
      fx('order', { label: 'A', multiple: true, accept: ['.pdf'], maxSize: 100, maxFiles: 1, constraintsText: 'x' }),
      fx('single-capped', { label: 'A', maxFiles: 1, accept: ['.pdf'], constraintsText: 'x' }),
    ]);
    await listen(page);
    const before = await said(page, 'kinds');
    // One is asked and several arrive (a picker that did not hold to it is a drop's case too): all refused, none chosen.
    await host(page, 'single').evaluate((el) => {
      const input = el.shadowRoot!.querySelector<HTMLInputElement>('input')!;
      const data = new DataTransfer();
      for (const name of ['one.pdf', 'two.pdf']) data.items.add(new File(['x'], name));
      input.files = data.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(await heard(page)).toEqual([{ type: 'reject', files: ['one.pdf', 'two.pdf'], reasons: ['count', 'count'] }]);
    await forget(page);
    await choose(page, 'single', [TXT]);
    expect(await heard(page), 'an empty accept takes every kind').toEqual([{ type: 'select', files: ['notes.txt'] }]);
    // Kind, then size; the extension without regard to case, a media type by the reported kind, a family by its kinds.
    await forget(page);
    await choose(page, 'kinds', [
      { name: 'REPORT.Pdf', type: '' },
      { name: 'plan', type: 'image/png' },
      { name: 'clip.bin', type: 'video/mp4' },
      { name: 'photo.jpeg', type: 'image/jpeg' },
      { name: 'notes.txt', type: 'text/plain' },
      { name: 'large.pdf', type: 'application/pdf', size: 101 },
      { name: 'exact.pdf', type: 'application/pdf', size: 100 },
      { name: 'pdf', type: 'text/plain' },
    ]);
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['REPORT.Pdf', 'plan', 'clip.bin', 'exact.pdf'] },
      { type: 'reject', files: ['photo.jpeg', 'notes.txt', 'large.pdf', 'pdf'], reasons: ['type', 'type', 'size', 'type'] },
    ]);
    // The count is of one arrival: the first maxFiles of the files that remain pass, and the next arrival is counted anew.
    for (let arrival = 0; arrival < 2; arrival++) {
      await forget(page);
      await choose(page, 'room', [{ name: '1.pdf' }, { name: '2.pdf' }, { name: '3.pdf' }, { name: '4.pdf' }]);
      expect(await heard(page), `arrival ${arrival}`).toEqual([
        { type: 'select', files: ['1.pdf', '2.pdf', '3.pdf'] },
        { type: 'reject', files: ['4.pdf'], reasons: ['count'] },
      ]);
    }
    // Type before size before count: a file refused for its kind or its size takes no room.
    await forget(page);
    await choose(page, 'order', [TXT, { name: 'large.pdf', size: 500 }, { name: 'one.pdf' }, { name: 'two.pdf' }, { name: 'late.txt' }]);
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['one.pdf'] },
      { type: 'reject', files: ['notes.txt', 'large.pdf', 'two.pdf', 'late.txt'], reasons: ['type', 'size', 'count', 'type'] },
    ]);
    // maxFiles is ignored while multiple is false.
    await forget(page);
    await choose(page, 'single-capped', [PDF]);
    expect(await heard(page)).toEqual([{ type: 'select', files: ['brief.pdf'] }]);
    // No row and no error is drawn and no word is said because of a choice.
    await turn(page);
    expect(await said(page, 'kinds')).toEqual(before);
    for (const id of ['single', 'kinds', 'room', 'order']) {
      expect((await said(page, id)).live, `${id}: no live region`).toBe(0);
      expect(await host(page, id).evaluate((el: HTMLElement & { error: boolean }) => [el.error, el.hasAttribute('error')]), id).toEqual([false, false]);
      await expect(stage(page, id).getByRole('listitem')).toHaveCount(0);
    }
  });

  test('FPK-9: one choice through the browser’s own picker and one drop on the area each emit select once and then reject once, with the files as the browser’s own handles', async ({ page, browserName }) => {
    await mount(page, [fx('a', { label: 'A', layout: 'drop-area', multiple: true, accept: ['.pdf'], constraintsText: 'PDF' })]);
    await page.evaluate(() => {
      const order: string[] = [];
      (window as unknown as { __order: string[] }).__order = order;
      for (const type of ['select', 'reject']) {
        document.addEventListener(type, (event) => {
          const detail = (event as CustomEvent<{ files: (File | { file: File; reason: string })[] }>).detail;
          const files = detail.files.map((entry) => (entry instanceof File ? entry : entry.file));
          order.push(`${type}:${files.map((file) => file.name).join('+')}:${files.every((file) => file instanceof File)}:${event.bubbles}:${event.composed}:${(event.target as Element).localName}`);
        });
      }
    });
    const order = () => page.evaluate(() => (window as unknown as { __order: string[] }).__order);
    const [picker] = await Promise.all([page.waitForEvent('filechooser'), trigger(page, 'a').click()]);
    await picker.setFiles(payload([TXT, PDF]));
    await turn(page);
    expect(await order()).toEqual(['select:brief.pdf:true:true:false:tanrei-file-picker', 'reject:notes.txt:true:true:false:tanrei-file-picker']);
    const probe = await drag(page, 'a', 'dragenter', [TXT, PDF]);
    test.skip(!probe.carried, `${browserName} gives a constructed DragEvent no DataTransfer`);
    await drag(page, 'a', 'dragover', [TXT, PDF]);
    await drag(page, 'a', 'drop', [TXT, PDF]);
    await turn(page);
    expect((await order()).slice(2)).toEqual(['select:brief.pdf:true:true:false:tanrei-file-picker', 'reject:notes.txt:true:true:false:tanrei-file-picker']);
  });

  test('FPK-10: the drop area answers a press as sys.behavior.pressed-feedback names — overlay paints the pressed tokens at once, ripple grows the pressed layer from the point of contact, dim keeps the container color and takes the pressed opacity, none changes nothing; the ripple runs over motion.feedback-duration and appears whole where motion is reduced', async ({ page }) => {
    for (const reduced of [false, true]) {
      await mount(page, [fx('a', { label: 'A', layout: 'drop-area', multiple: true, dropText: 'Drag files here' })], { reducedMotion: reduced });
      await override(page, {
        [T('standard-pressed-container-color')]: 'rgb(1, 2, 3)',
        [T('standard-pressed-label-color')]: 'rgb(4, 5, 6)',
        [T('standard-container-color')]: 'rgb(9, 9, 9)',
        [T('standard-label-color')]: 'rgb(7, 7, 7)',
        [T('pressed-opacity')]: '0.5',
      });
      const [target, content] = [chooser(page, 'a'), own(page, 'a', 'label')];
      const press = () =>
        target.evaluate((el) => {
          const r = el.getBoundingClientRect();
          el.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 4, clientY: r.top + 6, button: 0, pointerType: 'mouse', bubbles: true, composed: true }));
        });
      const release = async () => {
        await target.evaluate((el) => el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true })));
        await expect.poll(() => target.getAttribute('data-pressed'), { message: 'the press ends' }).toBeNull();
        await expect(target.locator('.ripple')).toHaveCount(0);
        // At rest again before the next press: the way back from a state is a motion (FPK-20).
        await expect.poll(() => target.evaluate((el) => el.getAnimations().length), { message: 'at rest' }).toBe(0);
      };
      const feedback = async (value: string) => override(page, { '--tanrei-sys-behavior-pressed-feedback': value });
      // overlay (the default, and what an unknown name is): the pressed tokens on the whole container at once.
      for (const value of ['overlay', 'something-else']) {
        await feedback(value);
        await press();
        expect(await target.getAttribute('data-pressed')).toBe('overlay');
        sameColor(await painted(target, 'background-color'), [1, 2, 3, 255], 'overlay container');
        sameColor(await painted(content, 'color'), [4, 5, 6, 255], 'overlay content');
        expect(await css(target, 'opacity')).toBe('0.5');
        await expect(target.locator('.ripple')).toHaveCount(0);
        await release();
      }
      // ripple: the container color stays; the layer is the pressed color, from the point of contact; the rest is pressed.
      await feedback('ripple');
      await press();
      expect(await target.getAttribute('data-pressed')).toBe('ripple');
      sameColor(await painted(target, 'background-color'), [9, 9, 9, 255], 'ripple keeps the container color');
      sameColor(await painted(content, 'color'), [4, 5, 6, 255], 'ripple content');
      const layer = target.locator('.ripple');
      await expect(layer).toHaveCount(1);
      sameColor(await painted(layer, 'background-color'), [1, 2, 3, 255], 'ripple layer');
      const origin = await layer.evaluate((el) => [Number.parseFloat(el.style.getPropertyValue('--_x')), Number.parseFloat(el.style.getPropertyValue('--_y'))]);
      expect(origin[0], 'from the point of contact').toBeLessThanOrEqual(4.5);
      expect(origin[1]).toBeLessThanOrEqual(6.5);
      if (reduced) expect(await css(layer, 'animation-name'), 'whole where motion is reduced').toBe('none');
      else near(Number.parseFloat(await css(layer, 'animation-duration')) * 1000, await resolveToken(page, T('motion-feedback-duration'), 'duration'), 'motion.feedback-duration', 1);
      await release();
      // dim: no layer, the container color stays, the pressed opacity on the whole area.
      await feedback('dim');
      await press();
      expect(await target.getAttribute('data-pressed')).toBe('dim');
      sameColor(await painted(target, 'background-color'), [9, 9, 9, 255], 'dim keeps the container color');
      sameColor(await painted(content, 'color'), [4, 5, 6, 255], 'dim content');
      expect(await css(target, 'opacity')).toBe('0.5');
      await expect(target.locator('.ripple')).toHaveCount(0);
      await release();
      // none: nothing answers — every part stays with the state under the press.
      await feedback('none');
      await expect.poll(() => css(target, 'opacity'), { message: 'at rest again' }).toBe('1');
      await press();
      expect(await target.getAttribute('data-pressed')).toBe('none');
      sameColor(await painted(target, 'background-color'), [9, 9, 9, 255], 'none');
      sameColor(await painted(content, 'color'), [7, 7, 7, 255], 'none: the content too');
      expect(await css(target, 'opacity')).toBe('1');
      await release();
    }
  });

  test('FPK-11: the corners of the drop area are eased by sys.shape.corner-smoothing through the shared rule; the area draws no focus indicator of its own — keyboard focus is on the trigger, which shows it as sys.behavior.focus-style names: a ring, or a glow under the acme system', async ({ page }) => {
    await mountSpec(page, 'drop-area');
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    const id = 'drop-area';
    const area = chooser(page, id);
    expect(await area.getAttribute('data-tanrei-shape')).not.toBeNull();
    const radius = async (el: Locator) => Number.parseFloat(await css(el, 'border-top-left-radius'));
    const round = await radius(area);
    near(round, await token(page, 'container-shape'), 'a quarter circle of container.shape at smoothing 0');
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0.6' });
    const curve = await css(area, 'corner-shape');
    if (curve && curve !== 'round') expect(await radius(area)).toBeGreaterThan(round);
    else near(await radius(area), round, 'a quarter circle where the curve cannot be drawn');
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0' });
    const indicator = async () => ({ outline: await css(area, 'outline-style'), shadow: await css(area, 'box-shadow'), after: await css(area, 'box-shadow', '::after'), focusable: await area.evaluate((el: HTMLElement) => el.tabIndex) });
    const rest = await indicator();
    expect(rest).toMatchObject({ outline: 'none', shadow: 'none', focusable: -1 });
    // A ring on the trigger; nothing on the area.
    await page.locator('#start').focus();
    await tabTo(page, native(page, id));
    expect((await painted(native(page, id), 'outline-color'))[3]).not.toBe(0);
    expect(await css(native(page, id), 'box-shadow', '::after')).toBe('none');
    expect(await indicator(), 'no focus indicator of the area’s own').toEqual(rest);
    // The acme system names glow: a halo and no line, on the trigger; still nothing on the area.
    await mountSpec(page, 'drop-area');
    await underAcme(page);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    await page.locator('#start').focus();
    await tabTo(page, native(page, id));
    expect((await painted(native(page, id), 'outline-color'))[3], 'no ring under glow').toBe(0);
    expect(await css(native(page, id), 'box-shadow', '::after')).not.toBe('none');
    expect(await indicator()).toEqual(rest);
  });

  test('FPK-12: a press on the drop area outside the trigger opens the picker once and moves focus to the trigger; the area is no stop in the focus order, has no role and no name and answers no key; a press that begins on the trigger is the trigger’s alone', async ({ page }) => {
    await mountSpec(page, 'drop-area', 'drop-area-disabled');
    const id = 'drop-area';
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    let pickers = 0;
    page.on('filechooser', () => pickers++);
    const a = await box(chooser(page, id));
    // On the fill, on the glyph, on a text: each is the one large target.
    for (const [x, y] of [[a.x + 8, a.y + 8], [a.x + a.width / 2, a.y + (await token(page, 'container-padding-block')) + 4], [a.x + a.width / 2, a.y + a.height - (await token(page, 'container-padding-block')) - 4]]) {
      const before = pickers;
      await page.locator('#start').focus();
      await page.mouse.click(x, y);
      await expect.poll(() => pickers).toBe(before + 1);
      expect(await onTrigger(page, id), 'focus moves to the trigger').toBe(true);
    }
    // A press that begins on the trigger opens the picker once.
    const before = pickers;
    await trigger(page, id).click();
    await turn(page);
    expect(pickers).toBe(before + 1);
    // No stop, no role, no name, no key.
    const area = chooser(page, id);
    expect(await area.evaluate((el: HTMLElement) => [el.tabIndex, el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('tabindex')])).toEqual([-1, null, null, null]);
    await page.locator('#start').focus();
    await tab(page);
    expect(await focused(page)).toContain('tanrei-button');
    const count = pickers;
    for (const key of ['Enter', ' ']) await area.evaluate((el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true })), key);
    await turn(page);
    expect(pickers).toBe(count);
    // Disabled: a press opens nothing.
    const d = await box(chooser(page, 'drop-area-disabled'));
    await page.mouse.click(d.x + 8, d.y + 8);
    await turn(page);
    expect(pickers).toBe(count);
  });

  test('FPK-13: something dragged over the area draws it as receiving and names the copy effect, or as refusing — the refusing edge and the block glyph, and no effect — where what is held cannot be taken: no file, only refused kinds, or several where one is asked; the condition begins at the area’s bounds and is not ended by a part inside it; the button layout takes no drag', async ({ page, browserName }) => {
    await mount(
      page,
      [
        fx('types', { label: 'A', layout: 'drop-area', multiple: true, accept: ['application/pdf', 'image/*'], dropText: 'Drag files here', constraintsText: 'PDF or a picture' }),
        fx('one', { label: 'A', layout: 'drop-area', dropText: 'Drag a file here' }),
        fx('names', { label: 'A', layout: 'drop-area', multiple: true, accept: ['.pdf'], constraintsText: 'PDF' }),
        fx('plain', { label: 'A' }),
      ],
      { reducedMotion: true },
    );
    const probe = await drag(page, 'types', 'dragenter', [PDF]);
    test.skip(!probe.carried, `${browserName} gives a constructed DragEvent no DataTransfer`);
    await drag(page, 'types', 'dragleave', []);
    const id = 'types';
    // An accepted kind: receiving, and letting go copies.
    const entered = await drag(page, id, 'dragenter', [PDF]);
    expect(entered.taken).toBe(true);
    expect(await condition(page, id)).toBe('receiving');
    const over = await drag(page, id, 'dragover', [PDF]);
    expect(over.taken).toBe(true);
    expect(over.effect, 'letting go here copies').toBe('copy');
    await isColor(page, chooser(page, id), 'background-color', 'receiving-container-color');
    await expect.poll(async () => (await painted(own(page, id, 'outline').locator('rect'), 'stroke')).join()).toBe((await tokenColor(page, 'receiving-outline-color')).join());
    for (const name of ['icon', 'label', 'supporting'] as const) await expect.poll(async () => (await painted(own(page, id, name), 'color')).join(), { message: name }).toBe((await tokenColor(page, 'receiving-content-color')).join());
    await expect(own(page, id, 'icon')).toHaveText('upload');
    // A part inside the area is entered and the area left for it: the condition stays.
    await drag(page, id, 'dragenter', [PDF], { on: '.label' });
    await drag(page, id, 'dragleave', [PDF]);
    expect(await condition(page, id), 'a child does not end the condition').toBe('receiving');
    await drag(page, id, 'dragenter', [PDF], { on: 'trigger' });
    await drag(page, id, 'dragleave', [PDF], { on: '.label' });
    expect(await condition(page, id)).toBe('receiving');
    // The trigger and the texts do not answer the drag themselves.
    expect(await native(page, id).getAttribute('data-pressed')).toBeNull();
    await drag(page, id, 'dragleave', [PDF], { on: 'trigger' });
    expect(await condition(page, id), 'it ends when the drag leaves the bounds').toBeNull();
    // A refused kind, then text only: refusing — the fill and the texts as at rest, the edge and the block glyph.
    for (const [what, files, options] of [['a refused kind', [TXT], {}], ['text only', [], { text: true }], ['a mix none of which is taken', [TXT, { name: 'a.zip', type: 'application/zip' }], {}]] as const) {
      await drag(page, id, 'dragenter', [...files], options);
      expect(await condition(page, id), what).toBe('refusing');
      const refused = await drag(page, id, 'dragover', [...files], options);
      expect(refused.taken, what).toBe(true);
      expect(refused.effect, `${what}: letting go here does nothing`).toBe('none');
      await isColor(page, chooser(page, id), 'background-color', 'standard-container-color');
      await expect.poll(async () => (await painted(own(page, id, 'outline').locator('rect'), 'stroke')).join()).toBe((await tokenColor(page, 'refusing-outline-color')).join());
      await expect(own(page, id, 'icon')).toHaveText('block');
      await expect.poll(async () => (await painted(own(page, id, 'icon'), 'color')).join()).toBe((await tokenColor(page, 'refusing-icon-color')).join());
      await expect.poll(async () => (await painted(own(page, id, 'label'), 'color')).join()).toBe((await tokenColor(page, 'standard-label-color')).join());
      await expect.poll(async () => (await painted(own(page, id, 'supporting'), 'color')).join()).toBe((await tokenColor(page, 'standard-supporting-text-color')).join());
      await drag(page, id, 'dragleave', []);
      expect(await condition(page, id)).toBeNull();
      await expect(own(page, id, 'icon')).toHaveText('upload');
    }
    // One of two kinds can be taken: receiving.
    await drag(page, id, 'dragenter', [TXT, PNG]);
    expect(await condition(page, id)).toBe('receiving');
    await drag(page, id, 'dragleave', []);
    // Several where one is asked.
    await drag(page, 'one', 'dragenter', [PDF, PNG]);
    expect(await condition(page, 'one')).toBe('refusing');
    await drag(page, 'one', 'dragleave', []);
    await drag(page, 'one', 'dragenter', [TXT]);
    expect(await condition(page, 'one'), 'one file of any kind').toBe('receiving');
    await drag(page, 'one', 'dragleave', []);
    // The nearest thing to "every file is of a kind accept refuses" (a sentence the spec leaves open):
    // an extension is the end of a name, and a browser tells no name before the drop, so with an extension in accept
    // the area cannot know and receives; such a file is refused at the drop (FPK-14).
    await drag(page, 'names', 'dragenter', [TXT]);
    expect(await condition(page, 'names')).toBe('receiving');
    await drag(page, 'names', 'dragleave', []);
    // A drag elsewhere changes nothing, and the button layout takes none.
    await page.evaluate(() => document.body.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() })));
    expect(await condition(page, id)).toBeNull();
    expect((await drag(page, 'plain', 'dragenter', [PDF])).taken).toBe(false);
    expect(await condition(page, 'plain')).toBeNull();
  });

  test('FPK-14: a drop ends the condition at once, is always taken so the browser does not open the file, and is judged as a choice is — a folder is refused for its kind, a refusing area emits reject and no select, a drop without a file emits nothing — without moving focus; disabled, it draws neither condition, names no effect and still takes the drop', async ({ page, browserName }) => {
    await mount(page, [
      fx('a', { label: 'A', layout: 'drop-area', multiple: true, accept: ['application/pdf', '.png'], maxSize: 100, constraintsText: 'x' }),
      fx('one', { label: 'A', layout: 'drop-area' }),
      fx('any', { label: 'A', layout: 'drop-area', multiple: true }),
      fx('names', { label: 'A', layout: 'drop-area', multiple: true, accept: ['.pdf'], constraintsText: 'PDF' }),
      fx('off', { label: 'A', layout: 'drop-area', multiple: true, disabled: true }),
    ]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    const probe = await drag(page, 'a', 'dragenter', [PDF]);
    test.skip(!probe.carried, `${browserName} gives a constructed DragEvent no DataTransfer`);
    await listen(page);
    await page.locator('#start').focus();
    const dropped = await drag(page, 'a', 'drop', [PDF, PNG, TXT, { name: 'large.pdf', type: 'application/pdf', size: 500 }]);
    expect(dropped.taken, 'the drop is taken').toBe(true);
    expect(await condition(page, 'a'), 'the condition ends at once').toBeNull();
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['brief.pdf', 'plan.png'] },
      { type: 'reject', files: ['notes.txt', 'large.pdf'], reasons: ['type', 'size'] },
    ]);
    expect(await focused(page), 'a drop moves no focus').toBe('button');
    // What could not be known before the drop is refused at it: a name's extension (FPK-13).
    await forget(page);
    await drag(page, 'names', 'dragenter', [TXT]);
    expect(await condition(page, 'names')).toBe('receiving');
    await drag(page, 'names', 'drop', [TXT]);
    expect(await heard(page)).toEqual([{ type: 'reject', files: ['notes.txt'], reasons: ['type'] }]);
    // A folder is told by its entry — a handle, never read — and refused for its kind, also where accept is empty.
    await forget(page);
    await page.evaluate(() => {
      const original = DataTransferItem.prototype.webkitGetAsEntry;
      DataTransferItem.prototype.webkitGetAsEntry = function (this: DataTransferItem) {
        return this.getAsFile()?.name === 'photos' ? ({ isDirectory: true, isFile: false, name: 'photos' } as FileSystemEntry) : (original?.call(this) ?? null);
      };
    });
    await drag(page, 'any', 'drop', [{ name: 'photos' }, PDF]);
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['brief.pdf'] },
      { type: 'reject', files: ['photos'], reasons: ['type'] },
    ]);
    // Over a refusing area: reject with what it holds, and no select. This is the handler's answer to a drop that
    // arrives there; a browser that was told "letting go here does nothing" delivers no drop at all, so a real drop
    // over a refusing area emits nothing (a sentence the spec leaves open).
    await forget(page);
    await drag(page, 'one', 'dragenter', [PDF, PNG]);
    expect(await condition(page, 'one')).toBe('refusing');
    expect((await drag(page, 'one', 'drop', [PDF, PNG])).taken).toBe(true);
    expect(await condition(page, 'one')).toBeNull();
    expect(await heard(page)).toEqual([{ type: 'reject', files: ['brief.pdf', 'plan.png'], reasons: ['count', 'count'] }]);
    // No file: nothing.
    await forget(page);
    await drag(page, 'a', 'dragenter', [], { text: true });
    expect((await drag(page, 'a', 'drop', [], { text: true })).taken).toBe(true);
    expect(await heard(page)).toEqual([]);
    expect(await condition(page, 'a')).toBeNull();
    // Disabled: neither condition, no effect, and the drop is still taken.
    for (const type of ['dragenter', 'dragover', 'drop'] as const) {
      const answer = await drag(page, 'off', type, [PDF]);
      expect(answer.taken, `disabled ${type}`).toBe(true);
      if (type !== 'drop') expect(answer.effect, `disabled ${type}`).toBe('none');
      expect(await condition(page, 'off')).toBeNull();
    }
    expect(await heard(page)).toEqual([]);
    expect(await focused(page), 'still no focus moved').toBe('button');
  });

  test('FPK-15: the area paints its container, edge, glyph, prompt, line of limits and opacity from the highest-precedence state — pressed over hovered, the pointer over the trigger counting as over the area — and has no focused state; disabled wins over refusing and receiving, which win over hovered and pressed', async ({ page, browserName }) => {
    await mount(page, [fx('a', { label: 'A', layout: 'drop-area', multiple: true, dropText: 'Drag files here', constraintsText: 'Any file' }), fx('off', { label: 'A', layout: 'drop-area', disabled: true, dropText: 'Drag files here', constraintsText: 'Any file' })], { reducedMotion: true });
    const parts = ['container', 'outline', 'icon', 'label', 'supporting-text'];
    const colors: Record<string, string> = { '--tanrei-sys-behavior-pressed-feedback': 'overlay' };
    ['hovered', 'pressed', 'focused', 'disabled'].forEach((state, s) => parts.forEach((part, p) => (colors[T(`standard-${state}-${part}-color`)] = `rgb(${10 * (s + 1)}, ${20 * (p + 1)}, 200)`)));
    await override(page, { ...colors, [T('hovered-opacity')]: '0.9', [T('pressed-opacity')]: '0.7', [T('focused-opacity')]: '0.8', [T('disabled-opacity')]: '0.6' });
    const read = async (id: string) => ({
      container: await painted(chooser(page, id), 'background-color'),
      outline: await painted(own(page, id, 'outline').locator('rect'), 'stroke'),
      icon: await painted(own(page, id, 'icon'), 'color'),
      label: await painted(own(page, id, 'label'), 'color'),
      'supporting-text': await painted(own(page, id, 'supporting'), 'color'),
      opacity: await css(chooser(page, id), 'opacity'),
    });
    const is = async (id: string, state: string, opacity: string) => {
      const s = ['hovered', 'pressed', 'focused', 'disabled'].indexOf(state);
      await expect.poll(async () => (await read(id)).opacity, { message: `${id} ${state} opacity` }).toBe(opacity);
      const now = await read(id);
      parts.forEach((part, p) => sameColor(now[part as 'container'], [10 * (s + 1), 20 * (p + 1), 200, 255], `${id} ${state} ${part}`));
    };
    const rest = await read('a');
    const a = await box(chooser(page, 'a'));
    await page.mouse.move(a.x + 6, a.y + 6);
    await is('a', 'hovered', '0.9');
    // Over the trigger is over the area.
    const t = await box(trigger(page, 'a'));
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
    await is('a', 'hovered', '0.9');
    await page.mouse.move(a.x + 6, a.y + 6);
    await page.mouse.down();
    await is('a', 'pressed', '0.7');
    await page.mouse.up();
    await page.mouse.move(2, 2);
    await expect.poll(async () => (await read('a')).opacity).toBe('1');
    // No focused state: with keyboard focus on the trigger the area is as at rest.
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    await page.locator('#start').focus();
    await tabTo(page, native(page, 'a'));
    expect(await read('a')).toEqual(rest);
    // Disabled wins over the pointer.
    const o = await box(chooser(page, 'off'));
    await page.mouse.move(o.x + 6, o.y + 6);
    await is('off', 'disabled', '0.6');
    await page.mouse.down();
    await is('off', 'disabled', '0.6');
    await page.mouse.up();
    // The conditions of a drag win over hovered and pressed.
    const probe = await drag(page, 'a', 'dragenter', [PDF]);
    if (probe.carried) {
      await page.mouse.move(a.x + 6, a.y + 6);
      await isColor(page, chooser(page, 'a'), 'background-color', 'receiving-container-color', 'receiving over hovered');
      await page.mouse.down();
      await isColor(page, chooser(page, 'a'), 'background-color', 'receiving-container-color', 'receiving over pressed');
      expect(await css(chooser(page, 'a'), 'opacity')).toBe('1');
      await page.mouse.up();
      await drag(page, 'a', 'dragleave', []);
      await drag(page, 'a', 'dragenter', [], { text: true });
      await page.mouse.move(a.x + 8, a.y + 8);
      await expect.poll(async () => (await painted(own(page, 'a', 'outline').locator('rect'), 'stroke')).join(), { message: 'refusing over hovered' }).toBe((await tokenColor(page, 'refusing-outline-color')).join());
      await isColor(page, chooser(page, 'a'), 'background-color', 'standard-container-color', 'refusing keeps the fill at rest');
      await drag(page, 'a', 'dragleave', []);
      await drag(page, 'off', 'dragenter', [PDF]);
      expect(await condition(page, 'off'), 'disabled wins over receiving').toBeNull();
      await is('off', 'disabled', '0.6');
    } else expect(browserName, 'a constructed drag is carried in Chromium').not.toBe('chromium');
  });

  test('FPK-15: under the acme system, which values hovered and pressed differently, the area is drawn from each state’s own tokens — three different grounds — and the error edge follows the state', async ({ page }) => {
    await mountSpec(page, 'drop-area', 'drop-area-error');
    await underAcme(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'overlay' });
    const seen: Record<string, string> = {};
    const look = async (id: string, state: '' | 'hovered-' | 'pressed-', edge: string) => {
      await expect.poll(async () => (await painted(chooser(page, id), 'background-color')).join(), { message: `${id} ${state}container` }).toBe((await tokenColor(page, `standard-${state}container-color`)).join());
      await expect.poll(async () => (await painted(own(page, id, 'outline').locator('rect'), 'stroke')).join(), { message: `${id} ${state}${edge}` }).toBe((await tokenColor(page, `standard-${state}${edge}-color`)).join());
      await isColor(page, own(page, id, 'icon'), 'color', `standard-${state}icon-color`);
      await isColor(page, own(page, id, 'label'), 'color', `standard-${state}label-color`);
      await isColor(page, own(page, id, 'supporting'), 'color', `standard-${state}supporting-text-color`);
      seen[`${id} ${state}`] = (await painted(chooser(page, id), 'background-color')).join();
    };
    for (const [id, edge] of [['drop-area', 'outline'], ['drop-area-error', 'error-outline']] as const) {
      await page.mouse.move(2, 2);
      await look(id, '', edge);
      const a = await box(chooser(page, id));
      await page.mouse.move(a.x + 6, a.y + 6);
      await look(id, 'hovered-', edge);
      await page.mouse.down();
      await look(id, 'pressed-', edge);
      await page.mouse.up();
    }
    // The system's three strengths are three different grounds: a pressed area is not a hovered one drawn again.
    expect(new Set([seen['drop-area '], seen['drop-area hovered-'], seen['drop-area pressed-']]).size).toBe(3);
  });

  test('FPK-16: error draws the drop area’s edge in the error role in every state and every other part as without it, exposes the trigger as invalid, and draws nothing in the button layout; the file picker never sets error itself, and a drag’s conditions are drawn in the error edge’s place', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['drop-area-error', 'drop-area'].includes(f.id)), fx('button-error', { label: 'A', error: true, constraintsText: 'Any file' }), fx('plain', { label: 'A', constraintsText: 'Any file' }), fx('judged', { label: 'A', layout: 'drop-area', accept: ['.pdf'], required: true, constraintsText: 'PDF' })], { reducedMotion: true });
    const edge = (id: string) => painted(own(page, id, 'outline').locator('rect'), 'stroke');
    sameColor(await edge('drop-area-error'), await tokenColor(page, 'standard-error-outline-color'), 'the error edge');
    expect((await edge('drop-area-error')).join(), 'not the edge it has without the error').not.toBe((await edge('drop-area')).join());
    for (const name of ['icon', 'label', 'supporting'] as const) expect(await painted(own(page, 'drop-area-error', name), 'color'), name).toEqual(await painted(own(page, 'drop-area', name), 'color'));
    expect(await painted(chooser(page, 'drop-area-error'), 'background-color')).toEqual(await painted(chooser(page, 'drop-area'), 'background-color'));
    // In every state.
    await override(page, { [T('standard-hovered-error-outline-color')]: 'rgb(1, 2, 3)', [T('standard-pressed-error-outline-color')]: 'rgb(4, 5, 6)', [T('standard-disabled-error-outline-color')]: 'rgb(7, 8, 9)', '--tanrei-sys-behavior-pressed-feedback': 'overlay' });
    const a = await box(chooser(page, 'drop-area-error'));
    await page.mouse.move(a.x + 6, a.y + 6);
    await expect.poll(async () => (await edge('drop-area-error')).join()).toBe('1,2,3,255');
    await page.mouse.down();
    await expect.poll(async () => (await edge('drop-area-error')).join()).toBe('4,5,6,255');
    await page.mouse.up();
    await page.mouse.move(2, 2);
    await host(page, 'drop-area-error').evaluate(async (el: HTMLElement & { disabled: boolean; updateComplete: Promise<unknown> }) => ((el.disabled = true), await el.updateComplete));
    await expect.poll(async () => (await edge('drop-area-error')).join(), { message: 'disabled, the error edge still' }).toBe('7,8,9,255');
    await host(page, 'drop-area-error').evaluate(async (el: HTMLElement & { disabled: boolean; updateComplete: Promise<unknown> }) => ((el.disabled = false), await el.updateComplete));
    // The trigger is exposed as invalid.
    await expect(native(page, 'drop-area-error')).toHaveAttribute('aria-invalid', 'true');
    await expect(native(page, 'button-error')).toHaveAttribute('aria-invalid', 'true');
    expect(await native(page, 'drop-area').getAttribute('aria-invalid')).toBeNull();
    await host(page, 'drop-area-error').evaluate((el: HTMLElement & { error: boolean }) => (el.error = false));
    await expect(native(page, 'drop-area-error')).not.toHaveAttribute('aria-invalid', 'true');
    await host(page, 'drop-area-error').evaluate((el: HTMLElement & { error: boolean }) => (el.error = true));
    // The button layout draws nothing for it.
    const [withError, without] = [chooser(page, 'button-error'), chooser(page, 'plain')];
    expect((await box(withError)).height).toBe((await box(without)).height);
    expect(await painted(own(page, 'button-error', 'supporting'), 'color')).toEqual(await painted(own(page, 'plain', 'supporting'), 'color'));
    expect(await css(withError, 'border-top-width')).toBe('0px');
    // Never set by the element: not for a refused file, and not for a picker that was left without a choice.
    await listen(page);
    await choose(page, 'judged', [TXT]);
    expect((await heard(page))[0].reasons).toEqual(['type']);
    const errorOf = () => host(page, 'judged').evaluate((el: HTMLElement & { error: boolean }) => [el.error, el.hasAttribute('error'), el.shadowRoot!.querySelector('.chooser')!.hasAttribute('data-error')]);
    expect(await errorOf()).toEqual([false, false, false]);
    const [left] = await Promise.all([page.waitForEvent('filechooser'), trigger(page, 'judged').click()]);
    await left.element().evaluate((el) => el.dispatchEvent(new Event('cancel', { bubbles: true })));
    expect(await errorOf()).toEqual([false, false, false]);
    expect(await native(page, 'judged').getAttribute('aria-invalid')).toBeNull();
    // A drag's conditions in the error edge's place.
    const probe = await drag(page, 'drop-area-error', 'dragenter', [PDF]);
    if (probe.carried) {
      await expect.poll(async () => (await edge('drop-area-error')).join()).toBe((await tokenColor(page, 'receiving-outline-color')).join());
      await drag(page, 'drop-area-error', 'dragleave', []);
      await expect.poll(async () => (await edge('drop-area-error')).join()).toBe((await tokenColor(page, 'standard-error-outline-color')).join());
      await drag(page, 'drop-area-error', 'dragenter', [], { text: true });
      await expect.poll(async () => (await edge('drop-area-error')).join()).toBe((await tokenColor(page, 'refusing-outline-color')).join());
      await drag(page, 'drop-area-error', 'dragleave', []);
    }
  });

  test('FPK-17: a group named by label holding the trigger, and no group, no role and no report while it has no name; the trigger is described by constraintsText, then selectionText while it is drawn, after any description of its own, and exposed as invalid while error is true; the area, its glyph and dropText are no controls; no live region', async ({ page }) => {
    const warnings = logged(page);
    const errors = logged(page, 'error');
    await mount(page, [
      ...spec.fixtures.filter((f) => ['button', 'button-chosen', 'button-bare', 'drop-area', 'drop-area-error'].includes(f.id)),
      { id: 'described', props: { label: 'Attachment', constraintsText: 'PDF only' }, content: '<tanrei-button slot="trigger" aria-description="Opens your files.">Choose</tanrei-button>' },
      fx('area-selection', { label: 'A', layout: 'drop-area', constraintsText: 'Any file', selectionText: 'brief.pdf' }),
      fx('required', { label: 'A', required: true, constraintsText: 'Any file' }),
    ]);
    const group = (id: string, name: string) => stage(page, id).getByRole('group', { name, exact: true });
    await expect(group('button', 'Attachment')).toHaveCount(1);
    await expect(group('drop-area', 'Attachments')).toHaveCount(1);
    await expect(stage(page, 'button').getByRole('button', { name: 'Choose a file' })).toHaveCount(1);
    // The group holds the trigger and its texts (the tree assistive technology is given follows the slots).
    await expect(host(page, 'button')).toMatchAriaSnapshot(`
      - group "Attachment":
        - button "Choose a file"
        - text: No file chosen PDF, up to 10 MB
    `);
    // Without a name: no group and no role of its own — the trigger stands as the button it is — and nothing is reported.
    await expect(stage(page, 'button-bare').getByRole('group')).toHaveCount(0);
    expect(await host(page, 'button-bare').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.shadowRoot!.querySelector('.group')!.getAttribute('role'), el.shadowRoot!.querySelector('.group')!.getAttribute('aria-label')])).toEqual([null, null, null, null]);
    await expect(host(page, 'button-bare')).toMatchAriaSnapshot(`
      - button "Choose a file"
    `);
    expect(await native(page, 'button-bare').getAttribute('aria-description'), 'nothing to describe it by').toBeNull();
    // The name comes and goes with the label.
    await host(page, 'button-bare').evaluate(async (el: HTMLElement & { label: string; updateComplete: Promise<unknown> }) => ((el.label = 'Photo'), await el.updateComplete));
    await expect(group('button-bare', 'Photo')).toHaveCount(1);
    await host(page, 'button-bare').evaluate(async (el: HTMLElement & { label: string; updateComplete: Promise<unknown> }) => ((el.label = '  '), await el.updateComplete));
    await expect(stage(page, 'button-bare').getByRole('group')).toHaveCount(0);
    // The description: the limits, then the text beside the trigger while it is drawn.
    const described = (id: string) => native(page, id).getAttribute('aria-description');
    expect(await described('button')).toBe('PDF, up to 10 MB No file chosen');
    expect(await described('button-chosen')).toBe('PDF, up to 10 MB brief.pdf');
    expect(await described('drop-area'), 'the limits alone').toBe('PDF or PNG, up to 10 MB each');
    expect(await described('area-selection'), 'selectionText only while it is drawn: never in the drop-area layout').toBe('Any file');
    expect(await described('described'), 'after the description the trigger has of its own').toBe('Opens your files. PDF only');
    // The description follows the props, and a trigger that leaves the slot gets back what it had.
    await host(page, 'described').evaluate((el: HTMLElement & { constraintsText: string; selectionText: string }) => Object.assign(el, { constraintsText: 'PDF or PNG', selectionText: 'plan.png' }));
    await expect.poll(() => described('described')).toBe('Opens your files. PDF or PNG plan.png');
    const left = await host(page, 'described').evaluate(async (el: HTMLElement & { updateComplete: Promise<unknown> }) => {
      const button = el.querySelector('tanrei-button')!;
      button.removeAttribute('slot');
      await new Promise((resolve) => setTimeout(resolve, 30));
      await el.updateComplete;
      // The trigger moves the ARIA a frame or the product gives it to data-aria-* (src/primitives/delegated-aria.ts).
      return [button.getAttribute('data-aria-description'), button.getAttribute('data-aria-invalid')];
    });
    expect(left).toEqual(['Opens your files.', null]);
    // Invalid while error is true. Required: a button's role has no required state, so nothing of the picker's own
    // says it — a Field's required text does, in the description (FPK-21; a sentence the spec leaves open).
    await expect(native(page, 'drop-area-error')).toHaveAttribute('aria-invalid', 'true');
    expect(await native(page, 'required').evaluate((el) => [el.getAttribute('aria-required'), el.getAttribute('aria-description')])).toEqual([null, 'Any file']);
    // The area, its glyph and dropText are no controls: one button, and the prompt read as text before it.
    await expect(stage(page, 'drop-area').getByRole('button')).toHaveCount(1);
    await expect(host(page, 'drop-area')).toMatchAriaSnapshot(`
      - group "Attachments":
        - text: Drag files here, or choose them
        - button "Choose files"
        - text: PDF or PNG, up to 10 MB each
    `);
    // No live region, and nothing reported for a picker without a name.
    for (const id of ['button', 'drop-area', 'button-bare']) expect((await said(page, id)).live, id).toBe(0);
    await turn(page);
    expect([...warnings, ...errors].filter((text) => text.includes('FPK-17') || text.includes('accessible name'))).toEqual([]);
  });

  test('FPK-17: Chromium’s accessibility tree computes a group of the label’s name holding one button with its own name, the description — the limits, then the text beside the trigger — and the invalid and disabled states; a picker without a name is the button alone', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    await mountSpec(page, 'button', 'drop-area-error', 'button-disabled');
    let tree = await axTree(page);
    expect(tree.filter((node) => node.role === 'group').map((node) => node.name)).toEqual(['Attachment', 'Attachment', 'Attachments']);
    const buttons = tree.filter((node) => node.role === 'button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toMatchObject({ name: 'Choose a file', description: 'PDF, up to 10 MB No file chosen' });
    expect(buttons[0].invalid ?? 'false').toBe('false');
    expect(buttons[1]).toMatchObject({ name: 'Choose a file', description: 'PDF, up to 10 MB No file chosen', disabled: true });
    expect(buttons[2]).toMatchObject({ name: 'Choose files', description: 'PDF or PNG, up to 10 MB each', invalid: 'true' });
    // The prompt is text, read before the trigger; the glyph and the hidden picker are not in the tree.
    const texts = tree.filter((node) => node.role === 'StaticText').map((node) => node.name);
    expect(texts).toContain('Drag files here, or choose them');
    expect(texts).not.toContain('upload');
    expect(tree.filter((node) => ['textbox', 'list', 'listitem', 'status', 'alert', 'progressbar'].includes(node.role))).toEqual([]);
    // A selection the product writes after a choice reaches the tree at once.
    await host(page, 'button').evaluate(async (el: HTMLElement & { selectionText: string; updateComplete: Promise<unknown> }) => ((el.selectionText = 'brief.pdf'), await el.updateComplete));
    await expect.poll(async () => (await axTree(page)).find((node) => node.role === 'button')?.description).toBe('PDF, up to 10 MB brief.pdf');
    await mountSpec(page, 'button-bare');
    tree = await axTree(page);
    expect(tree.filter((node) => node.role === 'group')).toEqual([]);
    expect(tree.filter((node) => node.role === 'button')).toMatchObject([{ name: 'Choose a file', description: '' }]);
  });

  test('FPK-18: no words of its own — every word is the instance’s, and none is read from the product’s words by a key; without dropText or selectionText nothing stands in their place; a limit that is enforced and not said is reported; no sentence is built from accept, maxSize, maxFiles or a count', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      fx('limits', { label: 'A', multiple: true, accept: ['.pdf'], maxSize: 5000000, maxFiles: 3 }),
      fx('area', { label: 'A', layout: 'drop-area' }),
      fx('said', { label: 'A', multiple: true, accept: ['.pdf'], maxSize: 5000000, maxFiles: 3, constraintsText: 'Up to three PDFs of 5 MB' }),
      fx('size', { label: 'A', maxSize: 10 }),
      fx('single', { label: 'A', maxFiles: 3 }),
    ]);
    await turn(page);
    // No sentence of its own: the element draws and says nothing the product did not write.
    expect(await said(page, 'limits')).toEqual({ text: '', attributes: ['A'], live: 0 });
    expect(await native(page, 'limits').getAttribute('aria-description')).toBeNull();
    // Nothing in the place of a text that was not given.
    await expect(own(page, 'area', 'label')).toHaveCount(0);
    await expect(own(page, 'area', 'supporting')).toHaveCount(0);
    await expect(selection(page, 'limits')).toHaveCount(0);
    expect((await said(page, 'area')).text, 'the glyph alone').toBe('upload');
    // The product's words are not read: no key is the file picker's, and none it could take is taken.
    await setWords(page, { noFileText: 'No file chosen', emptyText: 'Nothing here', removeLabel: 'Remove', fileTypeErrorText: 'Not that kind.' });
    await turn(page);
    await listen(page);
    await choose(page, 'limits', [TXT]);
    expect(await heard(page)).toEqual([{ type: 'reject', files: ['notes.txt'], reasons: ['type'] }]);
    expect(await said(page, 'limits')).toEqual({ text: '', attributes: ['A'], live: 0 });
    expect(await said(page, 'area')).toMatchObject({ text: 'upload' });
    expect(await missingWords(page), 'and it misses none').toEqual([]);
    // A limit that is enforced and not said: once for each file picker that has one, and none where it is said or not enforced.
    const reported = warnings.filter((text) => text.includes('FPK-18') && text.includes('enforced and not said'));
    expect(reported.length, 'limits and size; maxFiles is no limit while multiple is false').toBe(2);
    await expect(host(page, 'limits')).toBeVisible();
  });

  test('FPK-19: disabled disables the trigger as the Button’s own disabled does and gives it back as it was, never enabling one the product disabled; draws the area, its texts and selectionText from their disabled tokens; answers no press and no drag and emits nothing — and judge() still answers', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['drop-area-disabled', 'button-disabled'].includes(f.id)),
      { id: 'own-disabled', props: { label: 'A', layout: 'drop-area' }, content: '<tanrei-button slot="trigger" disabled>Choose</tanrei-button>' },
    ]);
    const id = 'drop-area-disabled';
    await expect(native(page, id)).toBeDisabled();
    await expect(native(page, 'button-disabled')).toBeDisabled();
    expect(await trigger(page, id).evaluate((el: HTMLElement & { disabled: boolean }) => [el.disabled, el.hasAttribute('disabled')]), 'as the Button’s own disabled does').toEqual([true, true]);
    // The disabled tokens.
    await isColor(page, chooser(page, id), 'background-color', 'standard-disabled-container-color');
    sameColor(await painted(own(page, id, 'outline').locator('rect'), 'stroke'), await tokenColor(page, 'standard-disabled-outline-color'), 'the edge');
    await isColor(page, own(page, id, 'icon'), 'color', 'standard-disabled-icon-color');
    await isColor(page, own(page, id, 'label'), 'color', 'standard-disabled-label-color');
    await isColor(page, own(page, id, 'supporting'), 'color', 'standard-disabled-supporting-text-color');
    const disabledOpacity = await page.evaluate((name) => {
      const probe = document.createElement('div');
      probe.style.cssText = `position:absolute;visibility:hidden;opacity:var(${name})`;
      document.body.append(probe);
      const value = Number.parseFloat(getComputedStyle(probe).opacity);
      probe.remove();
      return value;
    }, T('disabled-opacity'));
    near(Number.parseFloat(await css(chooser(page, id), 'opacity')), disabledOpacity, 'disabled.opacity', 0.001);
    await isColor(page, selection(page, 'button-disabled'), 'color', 'standard-disabled-selection-text-color');
    await isColor(page, own(page, 'button-disabled', 'supporting'), 'color', 'standard-disabled-supporting-text-color');
    // Nothing is answered and nothing is emitted; the trigger leaves the focus order.
    await listen(page);
    let pickers = 0;
    page.on('filechooser', () => pickers++);
    const a = await box(chooser(page, id));
    await page.mouse.click(a.x + 8, a.y + 8);
    await trigger(page, id).click({ force: true });
    await drag(page, id, 'drop', [PDF]);
    await host(page, id).evaluate((el) => {
      el.querySelector<HTMLElement>('[slot="trigger"]')!.click();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await turn(page);
    expect(await heard(page)).toEqual([]);
    expect(pickers).toBe(0);
    expect(await chooser(page, id).getAttribute('data-pressed')).toBeNull();
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button><button id="end">end</button>'));
    await page.locator(`[data-fixture="${id}"]`).evaluate((el) => el.after(document.querySelector('#end')!));
    await page.locator(`[data-fixture="${id}"]`).evaluate((el) => el.before(document.querySelector('#start')!));
    await page.locator('#start').focus();
    await tab(page);
    expect(await focused(page), 'nothing of a disabled file picker is a stop').toBe('button');
    // FPK-31: disabled stops the person, not the product.
    const judged = await host(page, id).evaluate((el: HTMLElement & { judge: (files: File[]) => { accepted: File[]; refused: { file: File; reason: string }[] } }) => {
      const answer = el.judge([new File(['x'], 'a.pdf'), new File(['x'], 'b.pdf')]);
      return [answer.accepted.map((f) => f.name), answer.refused.length];
    });
    expect(judged).toEqual([['a.pdf', 'b.pdf'], 0]);
    expect(await heard(page)).toEqual([]);
    // Given back as it was.
    await host(page, id).evaluate((el: HTMLElement & { disabled: boolean }) => (el.disabled = false));
    await expect(native(page, id)).toBeEnabled();
    expect(await trigger(page, id).evaluate((el) => el.hasAttribute('disabled'))).toBe(false);
    await expect.poll(async () => (await painted(own(page, id, 'label'), 'color')).join(), { message: 'drawn as enabled again' }).toBe((await tokenColor(page, 'standard-label-color')).join());
    await choose(page, id, [PDF]);
    expect(await heard(page)).toEqual([{ type: 'select', files: ['brief.pdf'] }]);
    // A trigger the product disabled itself stays disabled, and its area opens nothing.
    await expect(native(page, 'own-disabled')).toBeDisabled();
    await host(page, 'own-disabled').evaluate((el: HTMLElement & { disabled: boolean }) => (el.disabled = true));
    await host(page, 'own-disabled').evaluate(async (el: HTMLElement & { disabled: boolean; updateComplete: Promise<unknown> }) => ((el.disabled = false), await el.updateComplete));
    await expect(native(page, 'own-disabled')).toBeDisabled();
    const o = await box(chooser(page, 'own-disabled'));
    const before = pickers;
    await page.mouse.click(o.x + 8, o.y + 8);
    await turn(page);
    expect(pickers).toBe(before);
  });

  test('FPK-20: the colors of the drop area change over motion.state-duration with motion.state-easing, and at once where motion is reduced; selectionText appears, changes and leaves at once, without a motion of its own', async ({ page }) => {
    await mountSpec(page, 'drop-area', 'button');
    const id = 'drop-area';
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    const easing = await page.evaluate((name) => {
      const probe = document.createElement('div');
      probe.style.cssText = `transition-timing-function: var(${name})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-state-easing'));
    const moving: [string, Locator, string[]][] = [
      ['the area', chooser(page, id), ['background-color', 'opacity']],
      ['the edge', own(page, id, 'outline').locator('rect'), ['stroke']],
      ['the glyph', own(page, id, 'icon'), ['color']],
      ['the prompt', own(page, id, 'label'), ['color']],
      ['the line of limits', own(page, id, 'supporting'), ['color']],
    ];
    for (const [name, target, properties] of moving) {
      const moves = await target.evaluate((el) => ({ property: getComputedStyle(el).transitionProperty, duration: getComputedStyle(el).transitionDuration, easing: getComputedStyle(el).transitionTimingFunction }));
      for (const property of properties) expect(moves.property, `${name}: ${property}`).toContain(property);
      near(Number.parseFloat(moves.duration) * 1000, duration, `${name}: motion.state-duration`, 1);
      expect(moves.easing.startsWith(easing), `${name}: motion.state-easing (${moves.easing})`).toBe(true);
    }
    // No layout property is ever in motion.
    for (const [name, target] of moving) expect(await css(target, 'transition-property'), name).not.toMatch(/all|width|height|inline-size|block-size|padding|margin|inset|transform/);
    // selectionText: drawn at once when it changes, appears and leaves.
    expect(Number.parseFloat(await css(selection(page, 'button'), 'transition-duration'))).toBe(0);
    expect(await css(selection(page, 'button'), 'animation-name')).toBe('none');
    for (const text of ['brief.pdf', '', '3 files']) {
      const now = await host(page, 'button').evaluate(async (el: HTMLElement & { selectionText: string; updateComplete: Promise<unknown> }, t) => {
        el.selectionText = t;
        await el.updateComplete;
        return { drawn: el.shadowRoot!.querySelector('.selection')?.textContent ?? null, moving: el.shadowRoot!.getAnimations({ subtree: true }).length };
      }, text);
      expect(now, `"${text}"`).toEqual({ drawn: text || null, moving: 0 });
    }
    // Reduced motion: at once.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [name, target] of moving) expect(Number.parseFloat(await css(target, 'transition-duration')), name).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('FPK-21: inside a Field the file picker takes the field’s label as its group’s name while its own is empty, the field’s help with, in error, the error text after it and optional text as the last part of the trigger’s description, the invalid state as its error condition, the required state as required and the disabled state as disabled; a press on the field’s label moves focus to the trigger and opens nothing', async ({ page, browserName }) => {
    const field = (attributes: string, picker = 'layout="drop-area" constraints-text="PDF, up to 10 MB"') =>
      `<tanrei-field ${attributes}><tanrei-file-picker ${picker}><tanrei-button slot="trigger" variant="outlined">Choose a file</tanrei-button></tanrei-file-picker></tanrei-field>`;
    await mount(page, [fx('holder', { label: 'unused' })]);
    await page.evaluate(
      (markup) => {
        document.querySelector('main')!.innerHTML = markup.map(([id, html]) => `<div class="stage" data-in="${id}" style="inline-size: 360px">${html}</div>`).join('');
      },
      [
        ['help', field('label="Attachment" supporting-text="We keep it for a year." optional optional-text="Optional"', 'constraints-text="PDF, up to 10 MB" selection-text="No file chosen"')],
        ['error', field('label="Attachment" supporting-text="We keep it for a year." error error-text="Choose a PDF of 10 MB or less." required required-text="Required"')],
        ['off', field('label="Attachment" disabled')],
        ['own', field('label="Attachment"', 'label="Supporting documents"')],
      ],
    );
    const inside = (id: string) => page.locator(`[data-in="${id}"] tanrei-file-picker`);
    const button = (id: string) => inside(id).locator(':scope > tanrei-button [part="container"]');
    // The name: the field's, while its own label is empty.
    await expect(page.locator('[data-in="help"]').getByRole('group', { name: 'Attachment', exact: true })).toHaveCount(1);
    await expect(page.locator('[data-in="own"]').getByRole('group', { name: 'Supporting documents', exact: true })).toHaveCount(1);
    await expect(page.locator('[data-in="own"]').getByRole('group')).toHaveCount(1);
    // The description: the limits, the text beside the trigger, then what the field gives.
    await expect.poll(() => button('help').getAttribute('aria-description')).toBe('PDF, up to 10 MB No file chosen We keep it for a year. Optional');
    // The error condition, and the requirement: a button's role has no required state, so the field's word is said
    // in the description (sentences the spec leaves open: the description, the invalid state
    // and disabled are written on the trigger's host, which a Button carries to its native button).
    // (In error the field's error text stands in its help's place, FLD-7.)
    await expect.poll(() => button('error').getAttribute('aria-description')).toBe('PDF, up to 10 MB Choose a PDF of 10 MB or less. Required');
    await expect(button('error')).toHaveAttribute('aria-invalid', 'true');
    expect(await button('error').getAttribute('aria-required')).toBeNull();
    expect(await inside('error').locator('.group > .chooser').getAttribute('data-error')).not.toBeNull();
    sameColor(await painted(inside('error').locator('.group > .chooser > .outline rect'), 'stroke'), await tokenColor(page, 'standard-error-outline-color'), 'the error edge');
    // The states are taken as values: its own props stay what the product wrote, and it has no validity to report.
    expect(await inside('error').evaluate((el: HTMLElement & { error: boolean; required: boolean; disabled: boolean }) => [el.error, el.required, el.disabled, 'validity' in el])).toEqual([false, false, false, false]);
    // The field's error changes: the trigger is told at once.
    await page.locator('[data-in="error"] tanrei-field').evaluate((el: HTMLElement & { error: boolean }) => (el.error = false));
    await expect.poll(() => button('error').getAttribute('aria-description')).toBe('PDF, up to 10 MB We keep it for a year. Required');
    await expect(button('error')).not.toHaveAttribute('aria-invalid', 'true');
    expect(await inside('error').locator('.group > .chooser').getAttribute('data-error')).toBeNull();
    // Disabled by the field, and given back.
    await expect(button('off')).toBeDisabled();
    expect(await inside('off').locator('.group > .chooser').getAttribute('data-disabled')).not.toBeNull();
    await page.locator('[data-in="off"] tanrei-field').evaluate((el: HTMLElement & { disabled: boolean }) => (el.disabled = false));
    await expect(button('off')).toBeEnabled();
    // A press on the label: focus on the trigger, and nothing opens.
    let pickers = 0;
    page.on('filechooser', () => pickers++);
    await page.locator('[data-in="help"] tanrei-field').locator('.label').first().click();
    expect(await inside('help').locator(':scope > tanrei-button').evaluate((el) => el.matches(':focus-within') || el === document.activeElement)).toBe(true);
    await turn(page);
    expect(pickers).toBe(0);
    // What Chromium computes of it.
    if (browserName === 'chromium') {
      const tree = await axTree(page);
      expect(tree.filter((node) => node.role === 'group').map((node) => node.name)).toEqual(['Attachment', 'Attachment', 'Attachment', 'Supporting documents']);
      expect(tree.filter((node) => node.role === 'button')[0]).toMatchObject({ name: 'Choose a file', description: 'PDF, up to 10 MB No file chosen We keep it for a year. Optional' });
      expect(tree.filter((node) => node.role === 'button')[1]).toMatchObject({ name: 'Choose a file', description: 'PDF, up to 10 MB We keep it for a year. Required' });
    }
    const results = await new AxeBuilder({ page }).include('.stage').analyze();
    expect(results.violations).toEqual([]);
  });

  test('FPK-22: with the text enlarged the prompt, the line of limits and selectionText grow and wrap and are never cut, the glyph keeps its box, the area grows in height and the trigger grows as the Button says; at 200 % in a width of 320 nothing is lost or lies over another part, and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 2400 });
    const ids = ['long-text', 'button', 'button-long-text'];
    await mountSpec(page, ...ids);
    const normal = await textStyle(own(page, 'long-text', 'label'));
    const [normalArea, normalTrigger] = [await box(chooser(page, 'long-text')), await box(trigger(page, 'long-text'))];
    // The page as a reader with text at 200 % loads it.
    await mount(page, spec.fixtures.filter((f) => ids.includes(f.id)), {
      lead: `<style>html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } .stage > ${TAG} { inline-size: auto !important; }</style>`,
    });
    await frames(page);
    near(Number.parseFloat((await textStyle(own(page, 'long-text', 'label'))).fontSize), 2 * Number.parseFloat(normal.fontSize), 'the prompt grows');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'nothing scrolls sideways').toBe(true);
    for (const id of ids) {
      const whole = await box(host(page, id));
      expect(whole.x + whole.width, id).toBeLessThanOrEqual(320.5);
      // Every text is whole and inside the file picker.
      const texts = host(page, id).locator('.group > .chooser > .label, .group > .chooser > .supporting, .group > .chooser > .line > .selection');
      expect(await texts.count(), id).toBeGreaterThan(0);
      for (const text of await texts.all()) {
        const b = await box(text);
        expect(b.x, `${id}: inside at the start`).toBeGreaterThanOrEqual(whole.x - 0.5);
        expect(b.x + b.width, `${id}: inside at the end`).toBeLessThanOrEqual(whole.x + whole.width + 0.5);
        expect(await text.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis' && getComputedStyle(el).overflow === 'visible'), `${id}: never cut`).toBe(true);
      }
      // The trigger is inside too: one too long for its line wraps its label, as the Button says.
      const t = await box(trigger(page, id));
      expect(t.x, `${id}: the trigger inside at the start`).toBeGreaterThanOrEqual(whole.x - 0.5);
      expect(t.x + t.width, `${id}: the trigger inside at the end`).toBeLessThanOrEqual(whole.x + whole.width + 0.5);
    }
    // The glyph keeps its box (it is a length of the root's, as every size is: twice what it was, and square).
    const glyph = await box(own(page, 'long-text', 'icon'));
    near(glyph.width, await token(page, 'icon-size'), 'the area’s glyph keeps its box');
    near(glyph.height, glyph.width, 'square');
    // The area grows in height with its texts, the trigger grows, and the parts keep their order without lying over one another.
    const parts = [glyph, await box(own(page, 'long-text', 'label')), await box(trigger(page, 'long-text')), await box(own(page, 'long-text', 'supporting'))];
    for (let i = 1; i < parts.length; i++) expect(parts[i].y, `part ${i} below part ${i - 1}`).toBeGreaterThanOrEqual(parts[i - 1].y + parts[i - 1].height - 0.5);
    const area = await box(chooser(page, 'long-text'));
    expect(parts[3].y + parts[3].height).toBeLessThanOrEqual(area.y + area.height);
    expect(area.height).toBeGreaterThan(normalArea.height);
    expect(parts[2].height, 'the trigger grows').toBeGreaterThan(normalTrigger.height);
    // selectionText wraps below the trigger where the line is too short, and the line of limits stands below both.
    for (const id of ['button', 'button-long-text']) {
      const [button, text, limits] = [await box(trigger(page, id)), await box(selection(page, id)), await box(own(page, id, 'supporting'))];
      expect(text.x + text.width).toBeLessThanOrEqual(320.5);
      expect(text.y >= button.y + button.height - 0.5 || text.x >= button.x + button.width - 0.5, `${id}: beside or below the trigger`).toBe(true);
      expect(limits.y, `${id}: the limits below`).toBeGreaterThanOrEqual(Math.max(button.y + button.height, text.y + text.height) - 0.5);
    }
    // The text enlarged while the page is open: the area and its glyph follow.
    await mountSpec(page, 'drop-area');
    const before = (await box(own(page, 'drop-area', 'icon'))).width;
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await frames(page);
    near((await box(own(page, 'drop-area', 'icon'))).width, 2 * before, 'the area’s glyph follows');
  });

  test('FPK-23: in forced colors the area’s edge and texts are the text color on no fill; a receiving area has a solid edge twice outline.width wide in the highlight color and a refusing one its block glyph; disabled parts are the disabled text color', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
    await mount(page, spec.fixtures.filter((f) => ['drop-area', 'drop-area-disabled', 'drop-area-error', 'button-disabled'].includes(f.id)), { reducedMotion: true });
    const width = await token(page, 'outline-width');
    const before = await box(own(page, 'drop-area', 'label'));
    await page.emulateMedia({ forcedColors: 'active' });
    const system = (name: string) => colorOf(page, name);
    const [canvasText, highlight, gray] = [await system('CanvasText'), await system('Highlight'), await system('GrayText')];
    for (const id of ['drop-area', 'drop-area-error']) {
      sameColor(await painted(own(page, id, 'outline').locator('rect'), 'stroke'), canvasText, `${id}: the edge in the text color`);
      for (const name of ['icon', 'label', 'supporting'] as const) sameColor(await painted(own(page, id, name), 'color'), canvasText, `${id} ${name}`);
      expect(await css(chooser(page, id), 'background-image')).toBe('none');
      expect((await painted(chooser(page, id), 'background-color'))[3] === 0 || (await painted(chooser(page, id), 'background-color')).join() === (await system('Canvas')).join(), `${id}: no fill`).toBe(true);
    }
    // Receiving: a thicker solid edge in the highlight color, and nothing moves; refusing: the block glyph.
    if ((await drag(page, 'drop-area', 'dragenter', [PDF])).carried) {
      near(Number.parseFloat(await css(chooser(page, 'drop-area'), 'border-top-width')), 2 * width, 'twice outline.width');
      expect(await css(chooser(page, 'drop-area'), 'border-top-style')).toBe('solid');
      sameColor(await painted(chooser(page, 'drop-area'), 'border-top-color'), highlight, 'the highlight color');
      expect(await css(own(page, 'drop-area', 'outline'), 'opacity')).toBe('0');
      near((await box(own(page, 'drop-area', 'label'))).y, before.y, 'nothing moves');
      expect((await painted(chooser(page, 'drop-area'), 'background-color'))[3] === 0 || (await painted(chooser(page, 'drop-area'), 'background-color')).join() === (await system('Canvas')).join(), 'receiving rests on no fill').toBe(true);
      await drag(page, 'drop-area', 'dragleave', []);
      await drag(page, 'drop-area', 'dragenter', [], { text: true });
      await expect(own(page, 'drop-area', 'icon')).toHaveText('block');
      sameColor(await painted(own(page, 'drop-area', 'icon'), 'color'), canvasText, 'the block glyph');
      await drag(page, 'drop-area', 'dragleave', []);
    }
    // Disabled parts, in both layouts.
    for (const name of ['icon', 'label', 'supporting'] as const) sameColor(await painted(own(page, 'drop-area-disabled', name), 'color'), gray, `disabled ${name}`);
    sameColor(await painted(own(page, 'drop-area-disabled', 'outline').locator('rect'), 'stroke'), gray, 'the disabled edge');
    sameColor(await painted(selection(page, 'button-disabled'), 'color'), gray, 'disabled selectionText');
    sameColor(await painted(own(page, 'button-disabled', 'supporting'), 'color'), gray, 'the disabled line of limits');
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('FPK-24: in right-to-left the layout mirrors — the trigger at the right, selectionText after it toward the left, the line of limits from the right edge — the drop area’s column stays centred, and a ripple still grows from the point of contact', async ({ page }) => {
    await mountSpec(page, 'button-rtl', 'drop-area-rtl');
    const id = 'button-rtl';
    const whole = await box(host(page, id));
    const t = await box(trigger(page, id));
    near(t.x + t.width, whole.x + whole.width, 'the trigger at the right');
    const text = await box(selection(page, id));
    near(t.x - (text.x + text.width), await token(page, 'trigger-gap'), 'selectionText after it toward the left, trigger.gap from it');
    near(text.y + text.height / 2, t.y + t.height / 2, 'centred on the trigger');
    const limits = await box(own(page, id, 'supporting'));
    near(limits.x + limits.width, whole.x + whole.width, 'the limits from the right');
    expect(limits.y).toBeGreaterThanOrEqual(t.y + t.height - 0.5);
    // The area's column stays centred.
    const area = await box(chooser(page, 'drop-area-rtl'));
    for (const part of [own(page, 'drop-area-rtl', 'icon'), own(page, 'drop-area-rtl', 'label'), trigger(page, 'drop-area-rtl'), own(page, 'drop-area-rtl', 'supporting')]) {
      const p = await box(part);
      near(p.x + p.width / 2, area.x + area.width / 2, 'centred');
    }
    // A ripple from the point of contact.
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple' });
    const origin = await chooser(page, 'drop-area-rtl').evaluate((el) => {
      const r = el.getBoundingClientRect();
      el.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 10, clientY: r.top + 12, button: 0, pointerType: 'mouse', bubbles: true, composed: true }));
      const layer = el.querySelector<HTMLElement>('.ripple')!;
      return [Number.parseFloat(layer.style.getPropertyValue('--_x')), Number.parseFloat(layer.style.getPropertyValue('--_y'))];
    });
    near(origin[0], 10, 'the point of contact', 1.5);
    near(origin[1], 12, 'the point of contact', 1.5);
  });

  test('FPK-25: the direction is the nearest ancestor’s, with no setting of the file picker’s own; when it changes while the file picker is shown it is drawn for the new direction at once, without a motion of its own, keeping its focus', async ({ page }) => {
    await mountSpec(page, 'button');
    const id = 'button';
    expect(await host(page, id).evaluate((el) => [el.hasAttribute('dir'), 'direction' in el])).toEqual([false, false]);
    const whole = await box(host(page, id));
    near((await box(trigger(page, id))).x, whole.x, 'left-to-right from the document');
    await native(page, id).focus();
    // The focused state has been drawn: what moves after this is the direction's doing.
    await expect.poll(() => trigger(page, id).evaluate((el) => el.shadowRoot!.getAnimations({ subtree: true }).length)).toBe(0);
    // An ancestor's direction, not the root's.
    const moving = await stage(page, id).evaluate((el) => {
      el.setAttribute('dir', 'rtl');
      const picker = el.querySelector('tanrei-file-picker')!;
      void picker.getBoundingClientRect();
      return picker.shadowRoot!.getAnimations({ subtree: true }).length;
    });
    expect(moving, 'without a motion of its own').toBe(0);
    const t = await box(trigger(page, id));
    near(t.x + t.width, whole.x + whole.width, 'drawn for the new direction at once');
    const text = await box(selection(page, id));
    expect(text.x + text.width, 'selectionText toward the left').toBeLessThan(t.x);
    const limits = await box(own(page, id, 'supporting'));
    near(limits.x + limits.width, whole.x + whole.width, 'the limits from the right');
    expect(await focused(page), 'the focus is kept').toContain('tanrei-button');
    expect(await onTrigger(page, id)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.hasAttribute('dir'))).toBe(false);
    // And back.
    await stage(page, id).evaluate((el) => el.removeAttribute('dir'));
    near((await box(trigger(page, id))).x, whole.x, 'left-to-right again');
  });

  test('FPK-26: each text is laid out as text of its own direction, isolated — a file name given as selectionText keeps its order, its dot and its extension in a right-to-left layout — and in right-to-left a glyph is mirrored exactly when the icon set marks its name or the product forces it: the upload glyph and the block glyph are not', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['drop-area-rtl', 'drop-area'].includes(f.id)),
      fx('mixed', { label: 'A', layout: 'drop-area', multiple: true, dropText: 'اسحب الملفات إلى هنا', constraintsText: 'PDF (10 MB)' }, { direction: 'rtl', slots: { trigger: 'Choose files', icon: 'arrow_forward' } }),
      fx('name', { label: 'A', selectionText: 'report (final).pdf', constraintsText: 'PDF (10 MB)' }, { direction: 'rtl' }),
      fx('arabic', { label: 'A', selectionText: 'تقرير.pdf', constraintsText: 'ملف PDF' }),
    ]);
    // Every text is isolated, by its first strong character.
    for (const text of [own(page, 'mixed', 'label'), own(page, 'mixed', 'supporting'), selection(page, 'name'), own(page, 'name', 'supporting'), selection(page, 'arabic')]) expect(await css(text, 'unicode-bidi')).toBe('plaintext');
    // A Latin name in a right-to-left layout: its letters run left to right, the extension last, at the visual right.
    const places = (text: Locator) =>
      text.evaluate((el) => {
        const node = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.trim()) as Text;
        const content = node.textContent!;
        const at = (index: number) => {
          const range = document.createRange();
          range.setStart(node, Math.max(0, index));
          range.setEnd(node, Math.max(0, index) + 1);
          return range.getBoundingClientRect().left;
        };
        return { first: at(0), paren: at(content.indexOf('(')), close: at(content.indexOf(')')), dot: at(content.lastIndexOf('.')), last: at(content.length - 1) };
      });
    const order = await places(selection(page, 'name'));
    expect(order.first).toBeLessThan(order.paren);
    expect(order.paren).toBeLessThan(order.close);
    expect(order.close).toBeLessThan(order.dot);
    expect(order.dot).toBeLessThan(order.last);
    // It is still placed by the layout: after the trigger, toward the left.
    const [t, n] = [await box(trigger(page, 'name')), await box(selection(page, 'name'))];
    expect(n.x + n.width).toBeLessThan(t.x);
    // The line of limits keeps its order too, and stands at the right edge.
    const limits = await places(own(page, 'name', 'supporting'));
    expect(limits.first).toBeLessThan(limits.paren);
    expect(limits.paren).toBeLessThan(limits.close);
    const [l, whole] = [await box(own(page, 'name', 'supporting')), await box(host(page, 'name'))];
    near(l.x + l.width, whole.x + whole.width, 'the limits at the right edge');
    // A right-to-left name in a left-to-right layout runs right to left: its first letter is at the right of its dot.
    const arabic = await selection(page, 'arabic').evaluate((el) => {
      const node = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.trim()) as Text;
      const at = (index: number) => {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + 1);
        return range.getBoundingClientRect().left;
      };
      return at(0) > at(node.textContent!.indexOf('.'));
    });
    expect(arabic).toBe(true);
    // Mirroring: the upload glyph and the block glyph are not in the set's list. The helper mirrors inside the glyph's own box.
    const mirrored = (glyph: Locator) => glyph.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a === -1);
    await expect(own(page, 'drop-area-rtl', 'icon')).toHaveText('upload');
    expect(await mirrored(own(page, 'drop-area-rtl', 'icon')), 'upload is not mirrored').toBe(false);
    expect(await mirrored(own(page, 'drop-area-rtl', 'icon').locator('.ink'))).toBe(false);
    if ((await drag(page, 'drop-area-rtl', 'dragenter', [], { text: true })).carried) {
      await expect(own(page, 'drop-area-rtl', 'icon')).toHaveText('block');
      expect(await mirrored(own(page, 'drop-area-rtl', 'icon'))).toBe(false);
      expect(await mirrored(own(page, 'drop-area-rtl', 'icon').locator('.ink'))).toBe(false);
      await drag(page, 'drop-area-rtl', 'dragleave', []);
    }
    // The product's glyph: the set marks arrow_forward; data-mirror decides for one use; left to right nothing is mirrored.
    const product = host(page, 'mixed').locator(':scope > [slot="icon"]');
    await expect.poll(() => mirrored(product)).toBe(true);
    near((await box(own(page, 'mixed', 'icon'))).width, await token(page, 'icon-size'), 'inside its own box');
    await product.evaluate((el) => el.setAttribute('data-mirror', 'never'));
    await expect.poll(() => mirrored(product)).toBe(false);
    await product.evaluate((el) => el.setAttribute('data-mirror', 'always'));
    await expect.poll(() => mirrored(product), { message: 'forced by the product' }).toBe(true);
    expect(await mirrored(own(page, 'drop-area', 'icon'))).toBe(false);
  });

  test('FPK-27: a layout it does not know is button; maxSize that is not a number above zero and maxFiles that is not a whole number of zero or more set no limit; an accept entry that is neither an extension nor a media type is ignored; each is reported — and maxFiles zero with multiple refuses every file with the reason count and reports nothing', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      fx('a', { label: 'A', layout: 'tiles' as never, multiple: true, maxSize: -5, maxFiles: 2.5, accept: ['pdf', '.png', 'image', '*'], constraintsText: 'PNG' }),
      fx('words', { label: 'A', multiple: true, maxSize: 'large' as never, maxFiles: -1, constraintsText: 'x' }),
      fx('full', { label: 'A', multiple: true, maxFiles: 0, constraintsText: 'The list is full' }),
      fx('full-single', { label: 'A', maxFiles: 0, constraintsText: 'One file' }),
    ]);
    await turn(page);
    const id = 'a';
    // button.
    await expect(own(page, id, 'outline')).toHaveCount(0);
    expect(await chooser(page, id).evaluate((el) => el.classList.contains('area'))).toBe(false);
    expect((await drag(page, id, 'dragenter', [PDF])).taken, 'and takes no drop').toBe(false);
    // No limit of size or count; the entries that say a kind still judge.
    await listen(page);
    await choose(page, id, [{ name: 'a.png', size: 9000 }, { name: 'b.png' }, { name: 'c.png' }, { name: 'd.pdf', type: 'application/pdf' }, { name: 'e', type: 'image/jpeg' }]);
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['a.png', 'b.png', 'c.png'] },
      { type: 'reject', files: ['d.pdf', 'e'], reasons: ['type', 'type'] },
    ]);
    await forget(page);
    await choose(page, 'words', [{ name: 'a.png', size: 9000 }, { name: 'b.png' }]);
    expect(await heard(page)).toEqual([{ type: 'select', files: ['a.png', 'b.png'] }]);
    const reported = (needle: string) => warnings.filter((text) => text.includes('FPK-27') && text.includes(needle)).length;
    expect(reported('layout "tiles"')).toBe(1);
    expect(reported('max-size "-5"')).toBe(1);
    expect(reported('max-files "2.5"')).toBe(1);
    expect(reported('max-size "NaN"')).toBe(1);
    expect(reported('max-files "-1"')).toBe(1);
    expect(reported('"pdf", "image", "*"')).toBe(1);
    // Every entry ignored: every kind is taken, as with an empty accept.
    await host(page, id).evaluate((el: HTMLElement & { accept: string[] }) => (el.accept = ['pdf']));
    await forget(page);
    await choose(page, id, [TXT]);
    expect(await heard(page)).toEqual([{ type: 'select', files: ['notes.txt'] }]);
    // Zero is the room a full list has left: with multiple every file is refused for the count, and nothing is reported.
    await forget(page);
    const picker = await choose(page, 'full', [PDF, PNG]);
    expect(picker.isMultiple(), 'the picker is still offered').toBe(true);
    expect(await heard(page)).toEqual([{ type: 'reject', files: ['brief.pdf', 'plan.png'], reasons: ['count', 'count'] }]);
    await forget(page);
    await choose(page, 'full', [PDF]);
    expect(await heard(page), 'one file too').toEqual([{ type: 'reject', files: ['brief.pdf'], reasons: ['count'] }]);
    expect(await host(page, 'full').evaluate((el: HTMLElement & { judge: (files: File[]) => { accepted: File[]; refused: { reason: string }[] } }) => {
      const answer = el.judge([new File(['x'], 'a.pdf')]);
      return [answer.accepted.length, answer.refused.map((r) => r.reason)];
    })).toEqual([0, ['count']]);
    // While multiple is false maxFiles is ignored, zero too.
    await forget(page);
    await choose(page, 'full-single', [PDF]);
    expect(await heard(page)).toEqual([{ type: 'select', files: ['brief.pdf'] }]);
    await turn(page);
    expect(reported('max-files "0"'), 'zero is a limit, not a bad value').toBe(0);
    expect(warnings.filter((text) => text.includes('FPK-27')).length, 'nothing else is reported: the six, and the accept that was set later').toBe(7);
  });

  test('FPK-28: a prop that changes while the file picker is shown is drawn and exposed at once, keeping focus, and announces nothing; accept, maxSize, maxFiles and multiple judge from the next arrival on; a layout that changes during a drag ends the condition', async ({ page }) => {
    await mount(page, [fx('a', { label: 'First', multiple: true, constraintsText: 'Any file', selectionText: 'No file chosen' })]);
    const id = 'a';
    await turn(page);
    await native(page, id).focus();
    const set = (props: Record<string, unknown>) => host(page, id).evaluate(async (el: HTMLElement & { updateComplete: Promise<unknown> }, p) => (Object.assign(el, p), await el.updateComplete), props);
    await set({ label: 'Second', constraintsText: 'PDF only', selectionText: '2 files', error: true });
    await expect(stage(page, id).getByRole('group', { name: 'Second', exact: true })).toHaveCount(1);
    await expect(own(page, id, 'supporting')).toHaveText('PDF only');
    await expect(selection(page, id)).toHaveText('2 files');
    await expect(native(page, id)).toHaveAttribute('aria-description', 'PDF only 2 files');
    await expect(native(page, id)).toHaveAttribute('aria-invalid', 'true');
    expect(await focused(page), 'the trigger keeps focus').toContain('tanrei-button');
    await set({ layout: 'drop-area', dropText: 'Drag here' });
    await expect(own(page, id, 'label')).toHaveText('Drag here');
    await expect(selection(page, id)).toHaveCount(0);
    await expect(native(page, id)).toHaveAttribute('aria-description', 'PDF only');
    expect(await focused(page), 'the trigger keeps focus across a change of layout').toContain('tanrei-button');
    expect(await onTrigger(page, id)).toBe(true);
    await set({ disabled: true });
    await expect(native(page, id)).toBeDisabled();
    await set({ disabled: false, error: false });
    await expect(native(page, id)).toBeEnabled();
    await expect(native(page, id)).not.toHaveAttribute('aria-invalid', 'true');
    expect((await said(page, id)).live, 'nothing announces').toBe(0);
    // The limits judge from the next arrival on.
    await listen(page);
    await set({ accept: ['.pdf'], maxSize: 10, maxFiles: 1, multiple: true });
    await turn(page);
    expect(await heard(page), 'a changed limit emits nothing').toEqual([]);
    await choose(page, id, [PDF, { name: 'second.pdf' }, { name: 'large.pdf', size: 11 }]);
    expect(await heard(page)).toEqual([
      { type: 'select', files: ['brief.pdf'] },
      { type: 'reject', files: ['second.pdf', 'large.pdf'], reasons: ['count', 'size'] },
    ]);
    await forget(page);
    await set({ maxFiles: null, multiple: false });
    const picker = await choose(page, id, [TXT]);
    expect(picker.isMultiple()).toBe(false);
    expect(await picker.element().evaluate((el: HTMLInputElement) => el.accept)).toBe('.pdf');
    expect(await heard(page)).toEqual([{ type: 'reject', files: ['notes.txt'], reasons: ['type'] }]);
    // A layout that changes while something is dragged over the area.
    if ((await drag(page, id, 'dragenter', [PDF])).carried) {
      expect(await condition(page, id)).toBe('receiving');
      await set({ layout: 'button' });
      expect(await condition(page, id)).toBeNull();
      await set({ layout: 'drop-area' });
      expect(await condition(page, id), 'the condition does not come back').toBeNull();
    }
  });

  test('FPK-29: while the icon set cannot draw a glyph the file picker draws nothing in its place — never the glyph’s name — and keeps the glyph’s box; it draws the glyph once the set can', async ({ page }) => {
    page.on('filechooser', () => {});
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => ['drop-area', 'drop-area-icon'].includes(f.id)) });
    await withoutIconFont(page);
    const glyphs = [own(page, 'drop-area', 'icon'), own(page, 'drop-area-icon', 'icon')];
    const size = await token(page, 'icon-size');
    for (const [i, glyph] of glyphs.entries()) {
      await expect.poll(() => glyph.getAttribute('data-drawn'), { message: `glyph ${i}` }).toBeNull();
      expect(await css(glyph, 'visibility')).toBe('hidden');
      const b = await box(glyph);
      near(b.width, size, 'the box is kept');
      near(b.height, size, 'the box is kept');
    }
    // The product's glyph is its own element in the icon slot: nothing of its name is drawn either.
    expect(await css(host(page, 'drop-area-icon').locator(':scope > [slot="icon"]'), 'visibility')).toBe('hidden');
    // The area and its trigger still work.
    await choose(page, 'drop-area', [PDF]);
    // While it refuses, the block glyph is not drawn as its name either.
    if ((await drag(page, 'drop-area', 'dragenter', [], { text: true })).carried) {
      await expect.poll(() => glyphs[0].getAttribute('data-drawn')).toBeNull();
      expect(await css(glyphs[0], 'visibility')).toBe('hidden');
      await drag(page, 'drop-area', 'dragleave', []);
    }
    // The face arrives: the glyphs are drawn.
    await iconFaceArrives(page);
    for (const [i, glyph] of glyphs.entries()) {
      await expect.poll(() => glyph.getAttribute('data-drawn'), { message: `glyph ${i}` }).not.toBeNull();
      expect(await css(glyph, 'visibility')).toBe('visible');
    }
  });

  test('FPK-30: an element in the trigger slot that is not a Button still opens the picker when it is pressed or clicked, and is reported; a child that is neither the trigger nor the glyph is not drawn, takes no room and is reported', async ({ page }) => {
    const warnings = logged(page);
    await mount(page, [
      { id: 'native', props: { label: 'A', multiple: true }, content: '<button slot="trigger" type="button" id="plain">Browse</button>' },
      { id: 'stray', props: { label: 'A', multiple: true }, content: '<tanrei-button slot="trigger">Choose</tanrei-button>Loose text<p id="para">A paragraph</p><div id="box">A box</div>' },
      fx('clean', { label: 'A', multiple: true }, { slots: { trigger: 'Choose' } }),
    ]);
    await turn(page);
    await listen(page);
    await choose(page, 'native', [PDF], () => page.locator('#plain').click());
    expect(await heard(page)).toEqual([{ type: 'select', files: ['brief.pdf'] }]);
    await page.locator('#plain').focus();
    const [picker] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')]);
    expect(picker.isMultiple()).toBe(true);
    expect(warnings.filter((text) => text.includes('FPK-30') && text.includes('<button>')).length).toBe(1);
    // It is left what it is: nothing of a Button's is written on it but what a control it does not know is given.
    expect(await page.locator('#plain').evaluate((el) => [el.className, el.getAttribute('style'), el.textContent])).toEqual(['', null, 'Browse']);
    // What does not belong is not drawn, takes no room and is not read.
    for (const selector of ['#para', '#box']) await expect(page.locator(selector)).toBeHidden();
    near((await box(host(page, 'stray'))).height, (await box(host(page, 'clean'))).height, 'no room for what is not drawn');
    const loose = await host(page, 'stray').evaluate((el) => {
      const node = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.includes('Loose'))!;
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect().height;
    });
    expect(loose).toBe(0);
    await expect(host(page, 'stray')).toMatchAriaSnapshot(`
      - group "A":
        - button "Choose"
    `);
    expect(warnings.filter((text) => text.includes('FPK-30') && text.includes('neither its trigger')).length).toBe(1);
    expect(warnings.filter((text) => text.includes('FPK-30')).length, 'a file picker with its Button and nothing else is not reported').toBe(2);
  });

  test('FPK-31: judge(files) judges files that came another way as one arrival by the rule of a choice and answers with { accepted, refused } — the files that passed and the refused with their reasons, each in the order given — dispatches nothing, keeps none, and answers the same while disabled', async ({ page }) => {
    const limits = { label: 'A', multiple: true, accept: ['.pdf', 'image/*'], maxSize: 100, maxFiles: 2, constraintsText: 'x' };
    await mount(page, [fx('a', limits), fx('off', { ...limits, disabled: true }), fx('one', { label: 'A' }), fx('area', { ...limits, layout: 'drop-area' })]);
    await listen(page);
    type Picker = HTMLElement & { judge: (files: Iterable<File>) => { accepted: File[]; refused: { file: File; reason: string }[] } };
    const judge = (id: string) =>
      host(page, id).evaluate((el) => {
        const picker = el as Picker;
        const dispatched: string[] = [];
        const original = picker.dispatchEvent.bind(picker);
        picker.dispatchEvent = (event: Event) => (dispatched.push(event.type), original(event));
        const make = (name: string, type = '', size = 4) => new File([new Uint8Array(size)], name, { type });
        const files = [make('a.pdf', 'application/pdf'), make('notes.txt', 'text/plain'), make('photo', 'image/jpeg'), make('big.pdf', 'application/pdf', 101), make('c.pdf', 'application/pdf'), make('late.zip')];
        const answer = picker.judge(files);
        const again = picker.judge(files);
        const list = new DataTransfer();
        for (const file of files.slice(0, 2)) list.items.add(file);
        const fromList = picker.judge(list.files);
        const fromSet = picker.judge(new Set([files[4], files[0]]));
        const mixed = picker.judge([files[0], 'words', null, { name: 'fake.pdf' }] as unknown as File[]);
        return {
          keys: Object.keys(answer).sort(),
          accepted: answer.accepted.map((file) => file.name),
          refused: answer.refused.map((entry) => [entry.file.name, entry.reason]),
          handles: answer.accepted[0] === files[0] && answer.refused[0]!.file === files[1] && answer.accepted.every((file) => file instanceof File),
          again: [again.accepted.map((file) => file.name), again.refused.length, again !== answer && again.accepted !== answer.accepted],
          fromList: [fromList.accepted.map((file) => file.name), fromList.refused.map((entry) => [entry.file.name, entry.reason])],
          fromSet: fromSet.accepted.map((file) => file.name),
          mixed: [mixed.accepted.map((file) => file.name), mixed.refused.length],
          none: [picker.judge([]).accepted.length, picker.judge([]).refused.length],
          dispatched,
          picker: el.shadowRoot!.querySelector<HTMLInputElement>('input')!.files!.length,
        };
      });
    const expected = {
      keys: ['accepted', 'refused'],
      accepted: ['a.pdf', 'photo'],
      refused: [
        ['notes.txt', 'type'],
        ['big.pdf', 'size'],
        ['c.pdf', 'count'],
        ['late.zip', 'type'],
      ],
      handles: true,
      // Nothing is kept: the same files are judged again as if for the first time, and the answer is a new one.
      again: [['a.pdf', 'photo'], 4, true],
      fromList: [['a.pdf'], [['notes.txt', 'type']]],
      fromSet: ['c.pdf', 'a.pdf'],
      // What is no file is passed over.
      mixed: [['a.pdf'], 0],
      none: [0, 0],
      dispatched: [],
      picker: 0,
    };
    expect(await judge('a')).toEqual(expected);
    // Disabled stops the person, not the product; the layout changes nothing either.
    expect(await judge('off')).toEqual(expected);
    expect(await judge('area')).toEqual(expected);
    // More than one where one is asked: all refused for the count, none chosen for the product.
    expect(await host(page, 'one').evaluate((el) => (el as Picker).judge([new File(['x'], 'a.pdf'), new File(['x'], 'b.pdf')]).refused.map((entry) => entry.reason))).toEqual(['count', 'count']);
    await turn(page);
    expect(await heard(page), 'neither select nor reject').toEqual([]);
    // Nothing is drawn or said for it either.
    expect((await said(page, 'a')).text).toBe('x');
  });

  test('FPK-5, FPK-17, FPK-19, FPK-22: a trigger passed on through another element’s slot — `<slot name="trigger" slot="trigger">` as the file picker’s child, the way a component that holds it does — is found, described, disabled and given back, placed so that its label may wrap, and opens the picker once; nothing is reported', async ({ page }) => {
    const warnings = logged(page);
    const errors = logged(page, 'error');
    await mount(page, [fx('plain', { label: 'A' })]);
    await page.evaluate(() => {
      // A component that holds the file picker in its shadow root and passes its own trigger and glyph on.
      class Holder extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' }).innerHTML =
            '<style>:host { display: block; } ::slotted([slot="trigger"]) { max-inline-size: 100%; min-inline-size: min-content; }</style>' +
            '<tanrei-file-picker layout="drop-area" label="Held" constraints-text="PDF only" drop-text="Drag here"><slot name="trigger" slot="trigger"></slot><slot name="icon" slot="icon"></slot></tanrei-file-picker>';
        }
      }
      customElements.define('test-holder', Holder);
      document.querySelector('main')!.insertAdjacentHTML(
        'beforeend',
        '<div class="stage" id="held" style="box-sizing: border-box; inline-size: 220px"><test-holder><tanrei-button slot="trigger" variant="outlined" aria-description="Opens your files.">Choose files from this device</tanrei-button></test-holder></div>' +
          '<div class="stage" id="empty" style="inline-size: 220px"><test-holder></test-holder></div>',
      );
    });
    const holder = page.locator('#held test-holder');
    const picker = holder.locator('tanrei-file-picker');
    const button = holder.locator(':scope > tanrei-button');
    const inner = button.locator('[part="container"]');
    await turn(page);
    // Found and described, after the description it has of its own.
    await expect(inner).toHaveAttribute('aria-description', 'Opens your files. PDF only');
    await expect(page.locator('#held').getByRole('group', { name: 'Held', exact: true })).toHaveCount(1);
    await expect(page.locator('#held').getByRole('button', { name: 'Choose files from this device' })).toHaveCount(1);
    // Placed: its label may wrap, and it is never wider than its line.
    await expect.poll(() => inner.evaluate((el) => el.classList.contains('joined'))).toBe(true);
    const [b, area] = [await box(button), await box(picker.locator('.group > .chooser'))];
    expect(b.x).toBeGreaterThanOrEqual(area.x - 0.5);
    expect(b.x + b.width).toBeLessThanOrEqual(area.x + area.width + 0.5);
    const line = Number.parseFloat(await button.locator('[part="label"]').evaluate((el) => getComputedStyle(el).lineHeight));
    expect((await box(button.locator('[part="label"]'))).height, 'the label wraps').toBeGreaterThan(line * 1.5);
    // It opens the picker once — by a press on it, and by a press on the area, which moves focus to it.
    let pickers = 0;
    page.on('filechooser', () => pickers++);
    await listen(page);
    await button.click();
    await turn(page);
    expect(pickers).toBe(1);
    await page.mouse.click(area.x + 6, area.y + 6);
    await expect.poll(() => pickers).toBe(2);
    expect(await button.evaluate((el) => el.matches(':focus-within') || el === document.activeElement)).toBe(true);
    // Disabled and given back; invalid too.
    await picker.evaluate(async (el: HTMLElement & { disabled: boolean; error: boolean; updateComplete: Promise<unknown> }) => (Object.assign(el, { disabled: true, error: true }), await el.updateComplete));
    await expect(inner).toBeDisabled();
    await expect(inner).toHaveAttribute('aria-invalid', 'true');
    await button.click({ force: true });
    await turn(page);
    expect(pickers).toBe(2);
    await picker.evaluate(async (el: HTMLElement & { disabled: boolean; error: boolean; updateComplete: Promise<unknown> }) => (Object.assign(el, { disabled: false, error: false }), await el.updateComplete));
    await expect(inner).toBeEnabled();
    expect(await button.evaluate((el) => [el.hasAttribute('disabled'), el.getAttribute('data-aria-invalid'), el.getAttribute('data-aria-description')])).toEqual([false, null, 'Opens your files. PDF only']);
    // A trigger that leaves the holder's slot gets back what it had, and stands alone again.
    await button.evaluate(async (el) => {
      el.removeAttribute('slot');
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    await expect.poll(() => button.evaluate((el) => el.getAttribute('data-aria-description'))).toBe('Opens your files.');
    await expect.poll(() => inner.evaluate((el) => el.classList.contains('joined'))).toBe(false);
    await turn(page);
    // Reported: the holder without a trigger (twice: #empty from the start, #held once its trigger left), and nothing else.
    expect(warnings.filter((text) => text.includes('FPK-')), 'a passed-on trigger is no stray and no stranger').toEqual([]);
    await expect.poll(() => errors.filter((text) => text.includes('FPK-5')).length).toBe(2);
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

  test('no axe violations while the area receives and refuses, in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, [fx('receiving', { label: 'A', layout: 'drop-area', multiple: true, accept: ['image/*'], dropText: 'Drag pictures here', constraintsText: 'Pictures' }), fx('refusing', { label: 'B', layout: 'drop-area', accept: ['image/*'], dropText: 'Drag a picture here', constraintsText: 'A picture' })], { theme });
      const carried = (await drag(page, 'receiving', 'dragenter', [PNG])).carried;
      await drag(page, 'refusing', 'dragenter', [TXT]);
      if (carried) {
        expect(await condition(page, 'receiving')).toBe('receiving');
        expect(await condition(page, 'refusing')).toBe('refusing');
      }
      await frames(page, 20);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('every fixture is a group of its label’s name — or no group where it has none — holding one trigger; the keyboard reaches the trigger and nothing else, and a disabled file picker is no stop', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      if (f.props.label) await expect(stage(page, f.id).getByRole('group', { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
      else await expect(stage(page, f.id).getByRole('group'), f.id).toHaveCount(0);
      await expect(stage(page, f.id).getByRole('button', { name: String(f.slots!.trigger), exact: true }), f.id).toHaveCount(1);
      await expect(stage(page, f.id).getByRole('button'), f.id).toHaveCount(1);
      const stops = await host(page, f.id).evaluate((el) => {
        const found: string[] = [];
        const walk = (root: ParentNode) => {
          for (const node of root.querySelectorAll('*')) {
            if (node.shadowRoot) walk(node.shadowRoot);
            if (node instanceof HTMLElement && node.tabIndex >= 0 && !(node as HTMLButtonElement).disabled && !node.shadowRoot) found.push(node.localName);
          }
        };
        walk(el.shadowRoot!);
        walk(el);
        return found;
      });
      expect(stops, `${f.id}: the stops`).toEqual(f.props.disabled ? [] : ['button']);
    }
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the layout, the texts and the glyph the spec gives it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(14);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      near((await box(host(page, f.id))).width, 360, `${f.id}: its stage’s column`);
      const area = f.props.layout === 'drop-area';
      expect(await chooser(page, f.id).evaluate((el) => el.classList.contains('area')), f.id).toBe(area);
      await expect(trigger(page, f.id), f.id).toHaveText(String(f.slots!.trigger));
      await expect(trigger(page, f.id), f.id).toBeVisible();
      if (f.props.constraintsText) await expect(own(page, f.id, 'supporting'), f.id).toHaveText(String(f.props.constraintsText));
      else await expect(own(page, f.id, 'supporting'), f.id).toHaveCount(0);
      if (area && f.props.dropText) await expect(own(page, f.id, 'label'), f.id).toHaveText(String(f.props.dropText));
      else await expect(own(page, f.id, 'label'), f.id).toHaveCount(0);
      if (!area && f.props.selectionText) await expect(selection(page, f.id), f.id).toHaveText(String(f.props.selectionText));
      else await expect(selection(page, f.id), f.id).toHaveCount(0);
      // The area's glyph is drawn by the icon set: the upload glyph, or the product's.
      await expect(own(page, f.id, 'icon'), f.id).toHaveCount(area ? 1 : 0);
      if (area) {
        await expect.poll(() => own(page, f.id, 'icon').getAttribute('data-drawn'), { message: f.id }).not.toBeNull();
        if (f.slots!.icon) await expect(host(page, f.id).locator(':scope > [slot="icon"]'), f.id).toHaveText(String(f.slots!.icon));
        else await expect(own(page, f.id, 'icon'), f.id).toHaveText('upload');
      }
      expect(await host(page, f.id).evaluate((el: HTMLElement & { disabled: boolean; error: boolean; multiple: boolean }) => [el.disabled, el.error, el.multiple]), f.id).toEqual([!!f.props.disabled, !!f.props.error, !!f.props.multiple]);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, reducedMotion: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
