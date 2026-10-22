// <tanrei-slider-field>, driven by specs/slider-field.spec.json: SLF-1 to SLF-13, each cited by a test title. It is a
// composed element, so what a composed element is — declarations, passing, parts, events and the value, the
// form, focus, the twin of each fixture, reports — is held once, for every composed element, by
// src/primitives/composed.test.ts (W13-1 to W13-8), and its members' own behaviour by their own files (a
// higher level's tests repeat no test of a member; FLD-29 and FLD-30, the value text, are the Field's). What is here is
// the thirteen sentences of its own, as they hold of THIS element.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, tab, twinOf } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';

const spec = loadSpec('slider-field');
type P = Page;
const TAG = 'tanrei-slider-field';
const FIELD = 'tanrei-field';
const SLIDER = 'tanrei-slider';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');
type Element_ = HTMLElement & { value: number; startValue: number; formatValue: ((value: number) => string) | null; updateComplete: Promise<unknown> } & Record<string, unknown>;

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const field = (page: P, id: string) => host(page, id).locator(FIELD);
const slider = (page: P, id: string) => host(page, id).locator(SLIDER);
const handle = (page: P, id: string, which: 'start' | 'end' = 'end') => slider(page, id).locator(`.thumb[data-handle="${which}"] .handle`);
/** The Field's own value text (a Slider's value indicator has a text of that class too). */
const valueText = (page: P, id: string) => field(page, id).locator('.frame > .label-line > .value-text');
const fx = (id: string, props: Fixture['props'], rest: Partial<Fixture> = {}): Fixture => ({ id, props: { label: 'Volume', ...props }, ...rest });
const RANGE = { label: 'Price', range: true, startLabel: 'Minimum price', endLabel: 'Maximum price' };
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const mountSpec = (page: P, ...ids: string[]) => mount(page, spec.fixtures.filter((f) => ids.includes(f.id)));
const focus = (element: Locator) => element.evaluate((el: HTMLElement) => el.focus());
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const settle = (page: P) =>
  page.evaluate(async () => {
    const all = (root: Document | ShadowRoot | Element): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
    for (let round = 0; round < 3; round++) await Promise.all(all(document).map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
  });
/** Every motion that is running is ended: what is measured is where things come to rest. */
const rest = (page: P) =>
  page.evaluate(() => {
    const all = (root: Document | ShadowRoot): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
    for (const el of all(document)) for (const motion of el.getAnimations()) motion.finish();
  });
const set = async (page: P, id: string, props: Record<string, unknown>) => {
  await host(page, id).evaluate((el, p) => void Object.assign(el, p), props);
  await settle(page);
};
const focusPath = (page: P) =>
  page.evaluate(() => {
    const at: string[] = [];
    for (let active: Element | null = document.activeElement; active; active = active.shadowRoot?.activeElement ?? null) at.push(active.localName + (active.id ? `#${active.id}` : '') + ((active as HTMLElement).dataset?.handle ? '' : active.closest?.('[data-handle]') ? `:${(active.closest('[data-handle]') as HTMLElement).dataset.handle}` : ''));
    return at;
  });
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') seen.push(message.text());
  });
  return seen;
}
/** Hears the two events on the fixture's element, in order, with the element's values and the detail's at each. */
const hear = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const heard: string[] = [];
    (window as unknown as { heard: string[] }).heard = heard;
    for (const name of ['input', 'change'])
      el.addEventListener(name, (event) => {
        const target = event.target as HTMLElement & { value: number; startValue: number };
        const detail = (event as CustomEvent<{ value: number; startValue?: number }>).detail;
        heard.push(`${name} ${target === el ? 'element' : 'member'} ${target.startValue}-${target.value} ${detail.startValue ?? ''}-${detail.value}`);
      });
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { heard: string[] }).heard);
/** A page of the product's own, with the bundle: for what a fixture cannot hold (a form, a row). */
const document_ = (body: string, head = '') => `<!doctype html>
<html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8" /><style>${read('dist/tokens.css')}</style>${head}</head>
<body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`;
async function page_(page: P, body: string, head = '') {
  await page.setContent(document_(body, head));
  await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
  await settle(page);
}
/** The two stages of a fixture and its twin, each drawn alone in the same place: the differing color channels. */
async function differing(ours: Locator, theirs: Locator) {
  const alone = async (shown: Locator, other: Locator) => {
    await other.evaluate((el: HTMLElement) => (el.style.display = 'none'));
    const picture = decodePng(await shown.screenshot({ animations: 'disabled' }));
    await other.evaluate((el: HTMLElement) => el.style.removeProperty('display'));
    return picture;
  };
  const [a, b] = [await alone(ours, theirs), await alone(theirs, ours)];
  expect([a.width, a.height]).toEqual([b.width, b.height]);
  expect(a.width * a.height).toBeGreaterThan(0);
  let different = 0;
  for (let index = 0; index < a.data.length; index++) if (a.data[index] !== b.data[index]) different++;
  return different;
}
/** One handle, as Chromium's accessibility tree computes it. */
async function axHandles(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored && node.role?.value === 'slider')
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value.value;
      return { name: node.name?.value as string, description: (node.description?.value ?? '') as string, invalid: String(property('invalid') ?? 'false'), required: property('required') ?? false, disabled: property('disabled') ?? false };
    });
}

test.describe('slider field', () => {
  test('every fixture of the spec is mounted, and each names its twin among the Field\'s fixtures', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(23);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      await expect(slider(page, f.id), f.id).toBeVisible();
      const twin = twinOf(f);
      expect(twin?.spec.name, f.id).toBe('field');
      expect(twin!.fixture.items?.[0]?.kind, f.id).toBe('slider');
    }
  });

  test('SLF-1: it is a Field whose one control is a Slider — the two members\' own elements in its shadow root, and nothing else — and draws nothing of its own: no part, no token, no custom property written', async ({ page }) => {
    await mountSpec(page, 'supporting', 'range-words');
    for (const id of ['supporting', 'range-words']) {
      const tree = await host(page, id).evaluate((el) => ({
        root: [...el.shadowRoot!.children].map((child) => child.localName),
        inField: [...el.shadowRoot!.querySelector('tanrei-field')!.children].map((child) => child.localName),
        text: [...el.shadowRoot!.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim()).length,
        parts: [...el.shadowRoot!.querySelectorAll('[part]')].map((part) => part.getAttribute('part')),
        written: [...el.shadowRoot!.querySelectorAll<HTMLElement>('*')].flatMap((child) => [...child.style]).filter((name) => name.startsWith('--')),
        sheet: [...el.shadowRoot!.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).filter((text) => text.includes('--tanrei-comp-')),
        role: el.getAttribute('role'),
        tabindex: el.getAttribute('tabindex'),
      }));
      expect(tree, id).toEqual({ root: ['tanrei-field'], inField: ['tanrei-slider'], text: 0, parts: ['field', 'slider'], written: [], sheet: [], role: null, tabindex: null });
    }
    // The members are the components themselves, each as it stands alone: the Slider has its own size and no look of the Field's.
    expect(await slider(page, 'supporting').evaluate((el) => [el.getAttribute('size'), el.hasAttribute('disabled'), el.getAttribute('orientation')])).toEqual(['small', false, 'horizontal']);
  });

  test('SLF-1: one instance is set apart by a custom property on the element — the members read it by inheritance, and the element writes none', async ({ page }) => {
    await mount(page, [fx('plain', { value: 40 }), fx('apart', { value: 40 })]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await host(page, 'apart').evaluate((el: HTMLElement) => {
      el.style.setProperty('--tanrei-comp-field-standard-value-text-color', 'rgb(1, 2, 3)');
      el.style.setProperty('--tanrei-comp-slider-standard-active-track-color', 'rgb(3, 2, 1)');
    });
    expect(await css(valueText(page, 'apart'), 'color')).toBe('rgb(1, 2, 3)');
    expect(await css(slider(page, 'apart').locator('.piece.active'), 'background-color')).toBe('rgb(3, 2, 1)');
    expect(await css(valueText(page, 'plain'), 'color')).toBe(await resolveColor(page, '--tanrei-comp-field-standard-value-text-color'));
    expect(await css(slider(page, 'plain').locator('.piece.active'), 'background-color')).not.toBe('rgb(3, 2, 1)');
  });

  test('SLF-2: each prop goes at once and on every change to the member it is from — ten to the Field, fourteen to the Slider, endLabel as the Slider\'s label while range is true — and the Slider is given no orientation and no disabled of its own: the Field disables it', async ({ page }) => {
    await mount(page, [fx('a', { supportingText: 'Help', value: 40 })]);
    const toField = { label: 'Price', labelHidden: false, supportingText: 'Per night.', errorText: 'Too wide.', error: true, required: true, requiredMark: 'asterisk', requiredText: 'Needed', optionalText: 'If you like' };
    const toSlider = { value: 300, startValue: 100, range: true, min: 0, max: 500, step: 50, origin: null, stops: true, size: 'medium', valueIndicator: 'always', valueText: '$300', startValueText: '$100', startLabel: 'Minimum price' };
    await set(page, 'a', { ...toField, ...toSlider, endLabel: 'Maximum price', disabled: true });
    const read = (member: Locator, names: string[]) => member.evaluate((el, keys) => Object.fromEntries(keys.map((key) => [key, (el as unknown as Record<string, unknown>)[key]])), names);
    expect(await read(field(page, 'a'), Object.keys(toField))).toEqual(toField);
    expect(await read(slider(page, 'a'), Object.keys(toSlider))).toEqual(toSlider);
    expect(await read(slider(page, 'a'), ['label', 'orientation', 'disabled'])).toEqual({ label: 'Maximum price', orientation: 'horizontal', disabled: false });
    expect(await read(field(page, 'a'), ['disabled'])).toEqual({ disabled: true });
    // The Field disables its control (FLD-14): no handle takes focus.
    expect(await slider(page, 'a').evaluate((el) => [...el.shadowRoot!.querySelectorAll('[role="slider"]')].map((each) => [each.getAttribute('aria-disabled'), each.hasAttribute('tabindex')]))).toEqual([['true', false], ['true', false]]);
    // The element has no orientation, as an attribute or as a property: the track runs along the line (SLD-21).
    await host(page, 'a').evaluate((el) => el.setAttribute('orientation', 'vertical'));
    await settle(page);
    expect(await read(slider(page, 'a'), ['orientation'])).toEqual({ orientation: 'horizontal' });
    expect(await host(page, 'a').evaluate((el) => (el.constructor as unknown as { elementProperties: Map<string, unknown> }).elementProperties.has('orientation'))).toBe(false);
    // While range is false endLabel is not read: the one handle is the Field's to name.
    await set(page, 'a', { range: false, disabled: false });
    expect(await read(slider(page, 'a'), ['label'])).toEqual({ label: '' });
    await expect(handle(page, 'a')).toHaveAttribute('aria-label', 'Price');
  });

  test('SLF-3: while valueHidden is false the Field is given, as its value text, the words the Slider gives its handle — the product\'s string, or its function\'s, or the number — and a range\'s two as two isolated runs with an en dash and a space on each side between, in reading order: in right-to-left the start\'s words stand at the right of the dash; it writes no number, unit or word itself; while valueHidden is true the Field is given none', async ({ page }) => {
    await mountSpec(page, 'default', 'value-words', 'range', 'range-words', 'range-rtl', 'value-hidden', 'label-hidden');
    const given = (id: string) => field(page, id).evaluate((el) => (el as HTMLElement & { valueText: string }).valueText);
    const spoken = (id: string, which: 'start' | 'end' = 'end') => handle(page, id, which).getAttribute('aria-valuetext');
    // One handle: exactly its words.
    expect(await given('default')).toBe('40');
    expect(await given('default')).toBe(await spoken('default'));
    expect(await given('value-words')).toBe('120 %');
    await expect(valueText(page, 'value-words')).toHaveText('120 %');
    // A range: the start's, an en dash with a space on each side, the end's. A plain number is one left-to-right run
    // in either direction already and is written as it is — the text is what a product writes by hand.
    expect(await given('range')).toBe('20 – 60');
    expect(await given('range-words')).toBe(`${await spoken('range-words', 'start')} – ${await spoken('range-words', 'end')}`);
    expect(await given('range-words')).toBe('$100 – $300');
    expect(await given('range-rtl')).toBe('$100 – $300');
    // In reading order: left to right the start's words are at the left of the dash, right to left at its right, as
    // the start handle stands at the right of the track; and the sign stays before its digits.
    const left = (id: string, word: string) =>
      valueText(page, id).evaluate((el, text) => {
        const node = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.includes(text))!;
        const range = document.createRange();
        const start = node.textContent!.indexOf(text);
        range.setStart(node, start);
        range.setEnd(node, start + text.length);
        return range.getBoundingClientRect().left;
      }, word);
    expect(await left('range-words', '$100')).toBeLessThan(await left('range-words', '$300'));
    expect(await left('range-rtl', '$100')).toBeGreaterThan(await left('range-rtl', '$300'));
    expect(await left('range-rtl', '$')).toBeLessThan(await left('range-rtl', '100'));
    const [startHandle, endHandle] = [await box(handle(page, 'range-rtl', 'start')), await box(handle(page, 'range-rtl', 'end'))];
    expect(startHandle.x, 'the start handle is at the right').toBeGreaterThan(endHandle.x);
    // Words that are more than a plain number — a unit, a word, a sign before the digits — are each an isolated run of
    // their own direction: in right-to-left each keeps its own order, and the two stay in reading order.
    await set(page, 'range-rtl', { startValueText: '100 km', valueText: '300 km' });
    expect(await given('range-rtl')).toBe('\u2068100 km\u2069 – \u2068300 km\u2069');
    expect(await left('range-rtl', '100 km')).toBeGreaterThan(await left('range-rtl', '300 km'));
    expect(await left('range-rtl', '100')).toBeLessThan(await left('range-rtl', 'km'));
    await set(page, 'range-rtl', { startValueText: '-40 %', valueText: '60 %' });
    expect(await given('range-rtl')).toBe('\u2068-40 %\u2069 – \u206860 %\u2069');
    expect(await left('range-rtl', '-40 %')).toBeGreaterThan(await left('range-rtl', '60 %'));
    expect(await left('range-rtl', '-')).toBeLessThan(await left('range-rtl', '40'));
    expect(await left('range-rtl', '40')).toBeLessThan(await left('range-rtl', '%'));
    // One run of the two may be plain and the other not.
    await set(page, 'range-rtl', { startValueText: '', valueText: 'no limit' });
    // The start's words are now the number itself, in the page's language (SLD-18) — and its digits are those this
    // engine's locale data gives Arabic: WebKit on Linux writes ١٠٠ where the other engines and macOS write 100
    // — the engine's locale data, not the component. Written with the digits a product types it is the
    // plain run, as it is; with any others it is an isolated run as every other. Either way it is the handle's words.
    const hundred = (await spoken('range-rtl', 'start'))!;
    const arabicDigits = await page.evaluate(() => new Intl.NumberFormat('ar', { useGrouping: false }).format(9876543210));
    expect([...hundred].map((letter) => (arabicDigits.includes(letter) ? '9876543210'[[...arabicDigits].indexOf(letter)] : letter)).join(''), 'the start handle says 100, in the digits of its language').toBe('100');
    expect(await given('range-rtl')).toBe(`${hundred === '100' ? hundred : `\u2068${hundred}\u2069`} – \u2068no limit\u2069`);
    expect(await left('range-rtl', hundred)).toBeGreaterThan(await left('range-rtl', 'no limit'));
    // Nothing of its own: what is drawn is what the Slider says, whatever the product's function writes.
    await host(page, 'default').evaluate((el) => ((el as Element_).formatValue = (value) => `${value} of 100`));
    await settle(page);
    expect(await given('default')).toBe('40 of 100');
    expect(await spoken('default')).toBe('40 of 100');
    // valueHidden: no value text, and the handle still says its value.
    expect(await given('value-hidden')).toBe('');
    await expect(valueText(page, 'value-hidden')).toHaveCount(0);
    expect(await spoken('value-hidden')).toBe('40');
    await set(page, 'value-hidden', { valueHidden: false });
    await expect(valueText(page, 'value-hidden')).toHaveText('40');
    await set(page, 'value-hidden', { valueHidden: true });
    await expect(valueText(page, 'value-hidden')).toHaveCount(0);
    expect(await host(page, 'value-hidden').evaluate((el) => el.hasAttribute('value-hidden'))).toBe(true);
    // With the label not drawn the Field draws none (FLD-29).
    await expect(valueText(page, 'label-hidden')).toHaveCount(0);
  });

  test('SLF-4: when a value changes — at every input of a drag, by a key, because the product set value or startValue, or because min, max or step changed what is drawn — or valueText, startValueText or the product\'s function changes, the new value text is shown in the frame the handle is drawn in: at every frame of a drag the drawn text is the handle\'s value text, with no motion and no announcement of its own', async ({ page }) => {
    await mount(page, [fx('a', { value: 40, supportingText: 'Help' }), fx('pair', { ...RANGE, startValue: 20, value: 60 })]);
    const drawn = (id: string) => valueText(page, id).evaluate((el) => el.textContent!.replace(/[\u2068\u2069]/g, ''));
    const spoken = (id: string, which: 'start' | 'end' = 'end') => handle(page, id, which).getAttribute('aria-valuetext');
    // A drag: at every frame, what is drawn at the end of the label row is what the handle says.
    await page.evaluate(() => {
      const el = document.querySelector('[data-fixture="a"] > tanrei-slider-field')!;
      const seen: [string, string][] = [];
      (window as unknown as { seen: [string, string][]; watching: boolean }).seen = seen;
      (window as unknown as { watching: boolean }).watching = true;
      const look = () => {
        const text = el.shadowRoot!.querySelector('tanrei-field')!.shadowRoot!.querySelector('.label-line > .value-text')!.textContent!;
        const said = el.shadowRoot!.querySelector('tanrei-slider')!.shadowRoot!.querySelector('[role="slider"]')!.getAttribute('aria-valuetext')!;
        seen.push([text, said]);
        if ((window as unknown as { watching: boolean }).watching) requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });
    const rail = await box(slider(page, 'a').locator('.rail'));
    await page.mouse.move(rail.x + rail.width * 0.4, rail.y + rail.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 12; step++) await page.mouse.move(rail.x + rail.width * (0.4 + step * 0.04), rail.y + rail.height / 2);
    await page.mouse.up();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const seen = await page.evaluate(() => ((window as unknown as { watching: boolean }).watching = false, (window as unknown as { seen: [string, string][] }).seen));
    expect(seen.length).toBeGreaterThan(2);
    expect(new Set(seen.map(([text]) => text)).size, 'the text changed through the drag').toBeGreaterThan(2);
    for (const [text, said] of seen) expect(text, 'the drawn text is the handle\'s value text in every frame').toBe(said);
    expect(await drawn('a')).toBe(await spoken('a'));
    // By a key.
    await set(page, 'a', { value: 40 });
    await focus(host(page, 'a'));
    await page.keyboard.press('ArrowRight');
    await settle(page);
    expect([await drawn('a'), await spoken('a')]).toEqual(['41', '41']);
    // Because the product set value, or startValue.
    await set(page, 'a', { value: 70 });
    expect(await drawn('a')).toBe('70');
    await set(page, 'pair', { startValue: 30 });
    expect(await drawn('pair')).toBe('30 – 60');
    // Because min, max or step changed what the Slider draws (SLD-22).
    await set(page, 'a', { max: 50 });
    // (A scale of 50 has a keyboard step of a half, so the number has one fraction digit: SLD-18.)
    expect([await drawn('a'), await spoken('a')]).toEqual(['50.0', '50.0']);
    await set(page, 'a', { max: 100, step: 25 });
    expect([await drawn('a'), await spoken('a')]).toEqual(['75', '75']);
    // Because the words changed: the product's string, the start's, or its function.
    await set(page, 'a', { valueText: 'Loud' });
    expect(await drawn('a')).toBe('Loud');
    await set(page, 'a', { valueText: '' });
    await host(page, 'a').evaluate((el) => ((el as Element_).formatValue = (value) => `${value} %`));
    await settle(page);
    expect([await drawn('a'), await spoken('a')]).toEqual(['75 %', '75 %']);
    await host(page, 'a').evaluate((el) => ((el as Element_).formatValue = null));
    await settle(page);
    expect(await drawn('a')).toBe('75');
    await set(page, 'pair', { startValueText: 'thirty' });
    expect(await drawn('pair')).toBe('thirty – 60');
    // No motion and no announcement of its own: the element has no live region, the Field's is silent, and the text is hidden.
    expect(await host(page, 'a').evaluate((el) => [el.shadowRoot!.querySelectorAll('[aria-live], [role="status"]').length, el.shadowRoot!.querySelector('tanrei-field')!.shadowRoot!.querySelector('.announcer')!.textContent])).toEqual([0, '']);
    expect(await valueText(page, 'a').evaluate((el) => [el.getAttribute('aria-hidden'), el.getAnimations().length])).toEqual(['true', 0]);
  });

  test('SLF-5: one handle is named by label; a range\'s start handle by startLabel and its end handle by endLabel, and by label where one is empty, which a debug build reports; every handle is described by the shown text, with optionalText while optional, is invalid while error is true, and — the web\'s slider role having no required state — is described as required by requiredText', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mountSpec(page, 'supporting', 'range-words', 'required', 'optional', 'error', 'label-hidden');
    const said = (id: string, which: 'start' | 'end' = 'end') => handle(page, id, which).evaluate((el) => ({ name: el.getAttribute('aria-label'), description: el.getAttribute('aria-description'), invalid: el.getAttribute('aria-invalid'), required: el.getAttribute('aria-required') }));
    expect(await said('supporting')).toEqual({ name: 'Volume', description: 'Applies to alerts and media.', invalid: null, required: null });
    expect(await said('label-hidden')).toMatchObject({ name: 'Volume' });
    expect(await said('range-words', 'start')).toEqual({ name: 'Minimum price', description: 'Per night, before taxes.', invalid: null, required: null });
    expect(await said('range-words', 'end')).toEqual({ name: 'Maximum price', description: 'Per night, before taxes.', invalid: null, required: null });
    expect(await said('required')).toEqual({ name: 'Volume', description: 'Required', invalid: null, required: null });
    expect(await said('optional')).toEqual({ name: 'Volume', description: 'Optional', invalid: null, required: null });
    expect(await said('error')).toEqual({ name: 'Volume', description: 'Choose a level above 0.', invalid: 'true', required: null });
    await set(page, 'range-words', { error: true, errorText: 'Too wide.', required: false, optional: true, optionalText: 'Optional' });
    for (const which of ['start', 'end'] as const) expect(await said('range-words', which)).toMatchObject({ description: 'Too wide. Optional', invalid: 'true' });
    expect(seen.filter((text) => text.includes('[tanrei]')), 'a range named at both handles under a drawn label is reported by nobody').toEqual([]);
    if (browserName === 'chromium') {
      const handles = await axHandles(page);
      expect(handles.find((each) => each.name === 'Minimum price')).toMatchObject({ description: 'Too wide. Optional', invalid: 'true' });
      expect(handles.find((each) => each.name === 'Maximum price')).toMatchObject({ description: 'Too wide. Optional', invalid: 'true' });
      expect(handles.filter((each) => each.name === 'Volume').map((each) => each.description)).toEqual(expect.arrayContaining(['Applies to alerts and media.', 'Required', 'Optional', 'Choose a level above 0.']));
    }
    // A handle with no name of its own is named by label, and a debug build says so.
    await set(page, 'range-words', { endLabel: '' });
    expect((await said('range-words', 'end')).name).toBe('Price');
    expect(seen.filter((text) => text.includes(`<${TAG}>`) && text.includes('SLF-5'))).toHaveLength(1);
    await set(page, 'range-words', { startLabel: '' });
    expect((await said('range-words', 'start')).name).toBe('Price');
    expect(seen.filter((text) => text.includes('SLD-19') && text.includes('startLabel'))).toHaveLength(1);
  });

  test('SLF-6: value and startValue are its own and reported as the Slider does — one input and one change for a change by a key, each exactly once with the element as its target and its values already new, for a range with startValue; a value the product sets reports nothing', async ({ page }) => {
    await mount(page, [fx('a', { value: 40 }), fx('pair', { ...RANGE, startValue: 20, value: 60 })]);
    await hear(page, 'a');
    await focus(host(page, 'a'));
    await page.keyboard.press('ArrowRight');
    expect(await heard(page)).toEqual(['input element 0-41 -41', 'change element 0-41 -41']);
    await set(page, 'a', { value: 10 });
    expect(await heard(page), 'nothing for a value the product set').toHaveLength(2);
    expect(await host(page, 'a').evaluate((el) => (el as Element_).value)).toBe(10);
    // A range: both values, read back from the element at once.
    await hear(page, 'pair');
    await focus(host(page, 'pair'));
    await page.keyboard.press('ArrowRight');
    await tab(page);
    await page.keyboard.press('ArrowLeft');
    expect(await heard(page)).toEqual(['input element 21-60 21-60', 'change element 21-60 21-60', 'input element 21-59 21-59', 'change element 21-59 21-59']);
    await set(page, 'pair', { startValue: 5 });
    expect(await heard(page)).toHaveLength(4);
    expect(await host(page, 'pair').evaluate((el) => [(el as Element_).startValue, (el as Element_).value])).toEqual([5, 59]);
    // What was last set is read at once, before the Slider has taken it.
    expect(await host(page, 'pair').evaluate((el) => (((el as Element_).startValue = 7), (el as Element_).startValue))).toBe(7);
    // A drag: an input for each change, one change when it ends.
    await set(page, 'a', { value: 40 });
    await hear(page, 'a');
    const rail = await box(slider(page, 'a').locator('.rail'));
    await page.mouse.move(rail.x + rail.width * 0.5, rail.y + rail.height / 2);
    await page.mouse.down();
    await page.mouse.move(rail.x + rail.width * 0.6, rail.y + rail.height / 2);
    await page.mouse.up();
    const dragged = await heard(page);
    expect(dragged.filter((line) => line.startsWith('change'))).toHaveLength(1);
    expect(dragged.at(-1)!.startsWith('change element')).toBe(true);
    expect(dragged.filter((line) => line.startsWith('input')).length).toBeGreaterThanOrEqual(1);
    expect(dragged.every((line) => line.includes(' element '))).toBe(true);
  });

  test('SLF-6: in a form it is the one control the form meets — it carries the name and submits what the Slider submits: one entry, or for a range the start value and then the value under the one name; it is reset to its value and start-value attributes, restored as the Slider is, and submits nothing while disabled; neither member is a second control', async ({ page }) => {
    const by = (id: string, name: string, rest: string) => `<tanrei-field label="Price"><tanrei-slider id="${id}" name="${name}" ${rest}></tanrei-slider></tanrei-field>`;
    await page_(
      page,
      `<form id="ours"><${TAG} id="one" name="level" label="Volume" value="40"></${TAG}><${TAG} id="two" name="price" label="Price" range start-value="100" value="300" max="500" start-label="Minimum price" end-label="Maximum price"></${TAG}></form>
       <form id="hand"><tanrei-field label="Volume"><tanrei-slider id="one-hand" name="level" value="40"></tanrei-slider></tanrei-field>${by('two-hand', 'price', 'range start-value="100" value="300" max="500" start-label="Minimum price" label="Maximum price"')}</form>`,
    );
    const entries = () => page.evaluate(async () => {
      const all = (root: Document | ShadowRoot | Element): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
      for (let round = 0; round < 3; round++) await Promise.all(all(document).map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
      return ['ours', 'hand'].map((id) => [...new FormData(document.getElementById(id) as HTMLFormElement).entries()].map(([key, value]) => `${key}=${String(value)}`));
    });
    const same = async () => {
      const [ours, hand] = await entries();
      expect(ours).toEqual(hand);
      return ours!;
    };
    expect(await same()).toEqual(['level=40', 'price=100', 'price=300']);
    // The form meets two controls: the two elements. Their members are in no form.
    expect(await page.evaluate(() => [...(document.getElementById('ours') as HTMLFormElement).elements].map((el) => el.id))).toEqual(['one', 'two']);
    expect(await page.locator('#two').evaluate((el) => [...el.shadowRoot!.querySelectorAll('*')].map((inner) => (inner as HTMLElement & { form?: unknown }).form ?? null))).toEqual([null, null]);
    // Values set later, on the element and by hand.
    await page.evaluate(() => {
      for (const id of ['two', 'two-hand']) Object.assign(document.getElementById(id)!, { startValue: 150, value: 450 });
      for (const id of ['one', 'one-hand']) Object.assign(document.getElementById(id)!, { value: 70 });
    });
    expect(await same()).toEqual(['level=70', 'price=150', 'price=450']);
    // A change by the person is submitted.
    await focus(page.locator('#two'));
    await page.keyboard.press('ArrowRight');
    expect((await entries())[0]).toEqual(['level=70', 'price=155', 'price=450']);
    await page.keyboard.press('ArrowLeft');
    // Reset: to the two attributes.
    await page.evaluate(() => [...document.forms].forEach((form) => form.reset()));
    expect(await same()).toEqual(['level=40', 'price=100', 'price=300']);
    expect(await page.locator('#two').evaluate((el) => [(el as Element_).startValue, (el as Element_).value])).toEqual([100, 300]);
    // Restore: what the platform hands back, passed on to the Slider; both values are then the element's.
    await page.evaluate(() => ['two', 'two-hand'].forEach((id) => (document.getElementById(id) as HTMLElement & { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('200 250', 'restore')));
    expect(await same()).toEqual(['level=40', 'price=200', 'price=250']);
    expect(await page.locator('#two').evaluate((el) => [(el as Element_).startValue, (el as Element_).value])).toEqual([200, 250]);
    // Disabled: nothing is submitted.
    await page.evaluate(() => {
      (document.getElementById('two') as HTMLElement & { disabled: boolean }).disabled = true;
      (document.getElementById('two-hand')!.parentElement as HTMLElement & { disabled: boolean }).disabled = true;
    });
    expect((await entries())[0]).toEqual(['level=40']);
    // Without a name it submits nothing.
    await page.evaluate(() => ((document.getElementById('one') as HTMLElement & { name: string }).name = ''));
    expect((await entries())[0]).toEqual([]);
  });

  test('SLF-7: it adds no stop and handles no key — the only stops are the Slider\'s handles, in the Slider\'s order; focus given to the element, and a press on the label or on the value text, goes to the only handle, and to a range\'s start handle, and changes no value; a press on the help does nothing', async ({ page }) => {
    await page_(
      page,
      `<button id="before">Before</button>
       <${TAG} id="one" label="Volume" supporting-text="Applies to alerts and media." value="40"></${TAG}>
       <${TAG} id="two" label="Price" supporting-text="Per night." range start-value="20" value="60" start-label="Minimum price" end-label="Maximum price"></${TAG}>
       <button id="after">After</button>`,
    );
    const at = async () => {
      const path = await page.evaluate(() => {
        const out: string[] = [];
        for (let active: Element | null = document.activeElement; active; active = active.shadowRoot?.activeElement ?? null) out.push(active.id || (active.closest('[data-handle]') as HTMLElement | null)?.dataset.handle || active.localName);
        return out;
      });
      return path.join(' > ');
    };
    const values = () => page.evaluate(() => ['one', 'two'].map((id) => [(document.getElementById(id) as HTMLElement & { startValue: number }).startValue, (document.getElementById(id) as HTMLElement & { value: number }).value]));
    expect(await page.evaluate(() => ['one', 'two'].map((id) => [document.getElementById(id)!.shadowRoot!.delegatesFocus, document.getElementById(id)!.tabIndex, document.getElementById(id)!.hasAttribute('tabindex')]))).toEqual([[false, -1, false], [false, -1, false]]);
    // The stops, forward and back: one handle, then the range's start and its end.
    await page.locator('#before').focus();
    const forward: string[] = [];
    for (let stop = 0; stop < 4; stop++) (await tab(page), forward.push(await at()));
    expect(forward).toEqual(['one > tanrei-slider > end', 'two > tanrei-slider > start', 'two > tanrei-slider > end', 'after']);
    const back: string[] = [];
    for (let stop = 0; stop < 4; stop++) (await tab(page, { back: true }), back.push(await at()));
    expect(back).toEqual(['two > tanrei-slider > end', 'two > tanrei-slider > start', 'one > tanrei-slider > end', 'before']);
    // focus(): the only handle; a range's start handle.
    await focus(page.locator('#one'));
    expect(await at()).toBe('one > tanrei-slider > end');
    await focus(page.locator('#two'));
    expect(await at()).toBe('two > tanrei-slider > start');
    await page.locator('#two').evaluate((el: HTMLElement) => el.blur());
    expect(await at()).toBe('body');
    // A press on the label row — the label, and the value text at its end — moves focus there and changes nothing.
    const before = await values();
    const press = async (target: Locator) => {
      const b = await box(target);
      await page.mouse.click(b.x + Math.min(b.width / 2, 6), b.y + b.height / 2);
    };
    await press(page.locator('#two tanrei-field .frame .label-row > .label'));
    expect(await at()).toBe('two > tanrei-slider > start');
    await page.locator('#two').evaluate((el: HTMLElement) => el.blur());
    await press(page.locator('#two tanrei-field .frame > .label-line > .value-text'));
    expect(await at()).toBe('two > tanrei-slider > start');
    await press(page.locator('#one tanrei-field .frame > .label-line > .value-text'));
    expect(await at()).toBe('one > tanrei-slider > end');
    expect(await values()).toEqual(before);
    // A press on the help: nothing.
    await page.locator('#one').evaluate((el: HTMLElement) => el.blur());
    await press(page.locator('#one tanrei-field .frame > .supporting .supporting-text'));
    expect(await at()).toBe('body');
    // It handles no key: a key on the handle is the Slider's, and nothing on the element listens for one.
    await focus(page.locator('#one'));
    await page.keyboard.press('End');
    expect((await values())[0]).toEqual([0, 100]);
  });

  test('SLF-8: disabled is a disabled Field holding a disabled Slider — no handle takes focus or changes, no event is heard, the value indicator is not shown, the label, the mark, the supporting row and the value text are drawn from the Field\'s disabled tokens — and the value text stays drawn', async ({ page }) => {
    await mount(page, [fx('off', { supportingText: 'Help', disabled: true, value: 40, required: true, requiredMark: 'asterisk', valueIndicator: 'always' }), fx('on', { value: 40 })]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(valueText(page, 'off')).toHaveText('40');
    const T = (name: string) => resolveColor(page, `--tanrei-comp-field-standard-disabled-${name}-color`);
    expect(await css(valueText(page, 'off'), 'color')).toBe(await T('value-text'));
    expect(await css(field(page, 'off').locator('.frame .label-row > .label'), 'color')).toBe(await T('label'));
    expect(await css(field(page, 'off').locator('.frame .label-row .asterisk'), 'color')).toBe(await T('required-asterisk'));
    expect(await css(field(page, 'off').locator('.frame > .supporting .supporting-text'), 'color')).toBe(await T('supporting-text'));
    expect(await handle(page, 'off').evaluate((el) => [el.getAttribute('aria-disabled'), el.hasAttribute('tabindex')])).toEqual(['true', false]);
    expect(await slider(page, 'off').evaluate((el) => [el.hasAttribute('disabled'), el.shadowRoot!.querySelector('.root')!.getAttribute('data-value-indicator')]), 'the Field disables it; its own disabled is not set').toEqual([false, 'none']);
    await expect(slider(page, 'off').locator('.value-indicator')).toBeHidden();
    // No focus, no change, no event.
    await hear(page, 'off');
    await focus(host(page, 'off'));
    expect((await focusPath(page))[0]).toBe('body');
    const rail = await box(slider(page, 'off').locator('.rail'));
    await page.mouse.click(rail.x + rail.width * 0.8, rail.y + rail.height / 2);
    const label = await box(field(page, 'off').locator('.frame .label-row > .label'));
    await page.mouse.click(label.x + 4, label.y + label.height / 2);
    expect((await focusPath(page))[0]).toBe('body');
    expect(await heard(page)).toEqual([]);
    expect(await host(page, 'off').evaluate((el) => (el as Element_).value)).toBe(40);
    // Tab passes it by.
    await page.locator('body').click({ position: { x: 600, y: 5 } });
    await tab(page);
    expect((await focusPath(page)).join(' ')).not.toContain('data-fixture="off"');
    expect(await host(page, 'off').evaluate((el) => el.matches(':focus-within'))).toBe(false);
  });

  test('SLF-9: with the text enlarged to 200 % in a place 320 wide it grows as the Field grows and leaves the track, the handles and the hit area as they are; no text is cut, lies over another part or scrolls sideways — the label wraps beside the value text, and a value text too wide to share the label\'s line moves whole to a line of its own', async ({ page }) => {
    const ids = ['long-label', 'long-value-text', 'range-words'];
    await page.setViewportSize({ width: 320, height: 1600 });
    await mount(page, spec.fixtures.filter((f) => ids.includes(f.id)), { twins: true });
    const measure = (id: string, of: Locator = slider(page, id)) =>
      of.evaluate((el) => {
        const root = el.shadowRoot!;
        const size = (selector: string) => [root.querySelector(selector)!.getBoundingClientRect().width, root.querySelector(selector)!.getBoundingClientRect().height];
        return { handle: size('.handle'), track: root.querySelector('.piece')!.getBoundingClientRect().height, hit: el.getBoundingClientRect().height };
      });
    const before = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, { height: (await box(host(page, id))).height }] as const)));
    // (The page's own text size is how the test enlarges text: the lengths of a design system that are written in rem
    // grow with it, a Slider's among them, standing alone as here. What is held is that the Field's growth changes
    // nothing of the Slider: it is the Slider of the pair by hand, at the same size.)
    await page.addStyleTag({ content: `html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } .stage > :is(${TAG}, ${FIELD}) { inline-size: auto !important; }` });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await rest(page);
    for (const id of ids) {
      expect((await box(host(page, id))).height, `${id} grows`).toBeGreaterThan(before[id]!.height);
      expect(await measure(id), `${id}: the Slider is as it is in a Field by hand`).toEqual(await measure(id, page.locator(`[data-twin-of="${id}"] ${SLIDER}`)));
      expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: no scrolling sideways`).toBe(true);
      expect(await field(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.label, .value-text, .supporting-text')].every((text) => text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1)), `${id}: no text is cut`).toBe(true);
      // Nothing lies over another part: the label row and the value text above the Slider, the help below it.
      const [row, value, control] = [await box(field(page, id).locator('.frame .label-row')), await box(valueText(page, id)), await box(slider(page, id))];
      expect(control.y, `${id}: the Slider is below the label row and the value text`).toBeGreaterThanOrEqual(Math.max(row.y + row.height, value.y + value.height) - 0.5);
      const sharing = value.y < row.y + row.height - 0.6;
      if (sharing) expect(value.x, `${id}: the value text is beside the label row`).toBeGreaterThanOrEqual(row.x + row.width - 0.5);
    }
    // long-label: the label wraps beside the value text, which keeps the end of its first line.
    const [h, value, label] = [await box(host(page, 'long-label')), await box(valueText(page, 'long-label')), await box(field(page, 'long-label').locator('.frame .label-row > .label'))];
    near(value.x + value.width, h.x + h.width, 'the value text at the end edge');
    near(value.y, label.y, 'on the label\'s first line', 2);
    expect(label.height, 'the label wraps').toBeGreaterThan(3 * value.height);
    // long-value-text: whole, on a line of its own after the label row, from the start edge.
    const [h2, value2, row2] = [await box(host(page, 'long-value-text')), await box(valueText(page, 'long-value-text')), await box(field(page, 'long-value-text').locator('.frame .label-row'))];
    near(value2.x, h2.x, 'from the start edge');
    expect(value2.y).toBeGreaterThanOrEqual(row2.y + row2.height - 0.6);
  });

  test('SLF-10: it has no direction of its own and its two members take the one of the place — in right-to-left the label row starts at the right with the value text at its left end, the track runs from the right to the left and the arrow keys follow it; the words of a value are not mirrored', async ({ page }) => {
    await mountSpec(page, 'rtl', 'range-rtl', 'default');
    expect(await host(page, 'rtl').evaluate((el) => [el.hasAttribute('dir'), 'dir' in el.constructor.prototype && Object.hasOwn(el.constructor.prototype, 'dir'), getComputedStyle(el.shadowRoot!.querySelector('tanrei-field')!).direction, getComputedStyle(el.shadowRoot!.querySelector('tanrei-slider')!).direction])).toEqual([false, false, 'rtl', 'rtl']);
    const [h, label, value, knob, rail] = [await box(host(page, 'rtl')), await box(field(page, 'rtl').locator('.frame .label-row')), await box(valueText(page, 'rtl')), await box(handle(page, 'rtl')), await box(slider(page, 'rtl').locator('.rail'))];
    near(label.x + label.width, h.x + h.width, 'the label row starts at the right');
    near(value.x, h.x, 'the value text at the left end');
    // 40 of 100 from the right: the handle's center is 40 % of the travel from its right end.
    near(knob.x + knob.width / 2, rail.x + rail.width * 0.6, 'the track runs from the right', 1);
    await focus(host(page, 'rtl'));
    await page.keyboard.press('ArrowLeft');
    expect(await host(page, 'rtl').evaluate((el) => (el as Element_).value)).toBe(41);
    await page.keyboard.press('ArrowRight');
    expect(await host(page, 'rtl').evaluate((el) => (el as Element_).value)).toBe(40);
    // The place decides: the same element under another direction is drawn for it, with no setting of its own.
    await stage(page, 'default').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    near((await box(valueText(page, 'default'))).x, (await box(host(page, 'default'))).x, 'mirrored with its place');
    // The words are not mirrored: a number with its sign and its unit keeps its order.
    await set(page, 'rtl', { valueText: '-40 dB' });
    const order = await valueText(page, 'rtl').evaluate((el) => {
      const node = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.includes('dB'))!;
      const at = (word: string) => {
        const range = document.createRange();
        const start = node.textContent!.indexOf(word);
        range.setStart(node, start);
        range.setEnd(node, start + word.length);
        return range.getBoundingClientRect().left;
      };
      return [at('-'), at('40'), at('dB')];
    });
    expect(order[0]).toBeLessThan(order[1]!);
    expect(order[1]).toBeLessThan(order[2]!);
  });

  test('SLF-11: under a person\'s own forced colors it adds nothing and removes nothing — it is still the picture of the pair by hand, the value text in the platform\'s text color — and the error is carried by its words and by the invalid state of the handle', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'forced colors cannot be asked for in this engine');
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, spec.fixtures.filter((f) => ['error', 'range-words'].includes(f.id)), { twins: true });
    await settle(page);
    for (const id of ['error', 'range-words']) expect(await differing(stage(page, id), page.locator(`[data-twin-of="${id}"]`)), id).toBe(0);
    expect(await host(page, 'error').evaluate((el) => getComputedStyle(el).forcedColorAdjust)).toBe('auto');
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    expect(await css(valueText(page, 'error'), 'color')).toBe(canvasText);
    // While the field is in error its error text stands in the help's place (FLD-7, FLD-31), in the text color.
    expect(await css(field(page, 'error').locator('.frame > .supporting .error-text'), 'color')).toBe(canvasText);
    await expect(field(page, 'error').locator('.frame > .supporting .supporting-text')).toHaveCount(0);
    await expect(field(page, 'error').locator('.frame > .supporting .error-text')).toHaveText('Choose a level above 0.');
    await expect(handle(page, 'error')).toHaveAttribute('aria-invalid', 'true');
  });

  test('SLF-12: it is what a Field holding a Slider is when the product writes the two by hand and keeps the Field\'s value text in step — the same picture and the same handles to assistive technology after a change too, where the fixture\'s twin holds the first picture alone', async ({ page, browserName }) => {
    // (Each fixture against the twin it names, as mounted: src/primitives/composed.test.ts, W13-7, in three engines.)
    await mount(page, spec.fixtures.filter((f) => ['supporting', 'range-words'].includes(f.id)), { twins: true });
    await settle(page);
    // The same change on both, the twin's value text written by its product from its Slider's own words.
    await page.evaluate(async () => {
      const change = (el: HTMLElement) => Object.assign(el, el.hasAttribute('range') ? { startValue: 50, value: 450, startValueText: '$50', valueText: '$450' } : { value: 85 });
      for (const ours of document.querySelectorAll<HTMLElement>('[data-fixture] > tanrei-slider-field')) change(ours);
      for (const twin of document.querySelectorAll<HTMLElement>('[data-twin-of] > tanrei-field')) {
        const inner = twin.querySelector<HTMLElement & { range: boolean; shownValueText: string; shownStartValueText: string; updateComplete: Promise<unknown> }>('tanrei-slider')!;
        change(inner);
        await inner.updateComplete;
        (twin as HTMLElement & { valueText: string }).valueText = inner.range ? `${inner.shownStartValueText} – ${inner.shownValueText}` : inner.shownValueText;
      }
    });
    await settle(page);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (const id of ['supporting', 'range-words']) {
      const [ours, theirs] = [stage(page, id), page.locator(`[data-twin-of="${id}"]`)];
      await expect(valueText(page, id)).toHaveText(id === 'supporting' ? '85' : /\$50.* – .*\$450/);
      expect(await ours.ariaSnapshot(), id).toBe(await theirs.ariaSnapshot());
      const handles = (root: Locator) => root.locator('tanrei-slider').evaluate((el) => [...el.shadowRoot!.querySelectorAll('[role="slider"]')].map((each) => ['aria-label', 'aria-description', 'aria-valuenow', 'aria-valuetext', 'aria-valuemin', 'aria-valuemax', 'aria-invalid', 'aria-disabled'].map((name) => each.getAttribute(name))));
      expect(await handles(ours), id).toEqual(await handles(theirs));
      // A finished value motion: the two pictures are one.
      await rest(page);
      expect(await differing(ours, theirs), id).toBe(0);
    }
    if (browserName === 'chromium') {
      const handles = await axHandles(page);
      expect(handles).toHaveLength(6);
      for (const name of ['Volume', 'Minimum price', 'Maximum price']) {
        const pair = handles.filter((each) => each.name === name);
        expect(pair).toHaveLength(2);
        expect(pair[0]).toEqual(pair[1]);
      }
    }
  });

  test('SLF-13: it is a block as wide as its place, with no width of its own, and its Slider fills it from the start edge to the end edge — in a container 320 wide the element, the Field and the Slider are each 320 wide, the rows as wide as the track\'s box; in a flex row it takes the room the row gives it and the track follows', async ({ page }) => {
    await page_(
      page,
      `<div id="place" style="inline-size: 320px"><${TAG} id="a" label="Volume" supporting-text="Applies to alerts and media." value="40"></${TAG}></div>
       <div id="row" style="display: flex; inline-size: 480px; gap: 16px"><${TAG} id="grows" label="Price" range start-value="3400000" value="12500000" max="20000000" start-value-text="3,400,000" value-text="12,500,000" start-label="Lowest" end-label="Highest" style="flex: 1"></${TAG}><div id="fixed" style="flex: none; inline-size: 300px"></div></div>
       <div id="narrow" style="display: flex; inline-size: 120px"><${TAG} id="shrinks" label="Yearly income before tax" value="40" value-text="12,500,000 a year" style="flex: 1"></${TAG}></div>`,
    );
    const width = (selector: string) => page.locator(selector).evaluate((el) => el.getBoundingClientRect().width);
    const edges = (selector: string) => page.locator(selector).evaluate((el) => [el.getBoundingClientRect().left, el.getBoundingClientRect().right]);
    expect(await css(page.locator('#a'), 'display')).toBe('block');
    for (const selector of ['#a', '#a tanrei-field', '#a tanrei-slider', '#a tanrei-field .frame > .label-line', '#a tanrei-field .frame > .supporting']) near(await width(selector), 320, selector);
    expect(await edges('#a tanrei-slider')).toEqual(await edges('#a'));
    expect(await page.locator('#a').evaluate((el) => [el.style.inlineSize, el.style.width, getComputedStyle(el).minInlineSize])).toEqual(['', '', '0px']);
    // In a flex row: the room the row gives it — 480 less the gap and the other item — and the track follows.
    for (const selector of ['#grows', '#grows tanrei-field', '#grows tanrei-slider']) near(await width(selector), 164, selector);
    // …and never wider than that, whatever its texts: they wrap.
    for (const selector of ['#shrinks', '#shrinks tanrei-slider']) near(await width(selector), 120, selector);
    expect(await page.locator('#narrow').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    // A wider place, a longer track.
    await page.locator('#place').evaluate((el: HTMLElement) => (el.style.inlineSize = '400px'));
    near(await width('#a tanrei-slider'), 400, 'the track follows its place');
  });
});

test.describe('accessibility', () => {
  test('no axe violations, light and dark: every fixture, and a slider field in each condition', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, [...spec.fixtures, fx('formatted', { value: 40, valueIndicator: 'always' }), fx('range-disabled', { ...RANGE, startValue: 20, value: 60, disabled: true })], { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('Chromium\'s accessibility tree has each handle as a slider with its name, its description and its states, each handle says its value in words, and nothing of the value text drawn at the end of the label row is in the tree', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    await mountSpec(page, 'value-words', 'range-words', 'error', 'disabled');
    const handles = await axHandles(page);
    expect(handles).toHaveLength(5);
    expect(handles).toEqual(expect.arrayContaining([
      { name: 'Text size', description: '', invalid: 'false', required: false, disabled: false },
      { name: 'Minimum price', description: 'Per night, before taxes.', invalid: 'false', required: false, disabled: false },
      { name: 'Maximum price', description: 'Per night, before taxes.', invalid: 'false', required: false, disabled: false },
      { name: 'Volume', description: 'Choose a level above 0.', invalid: 'true', required: false, disabled: false },
      { name: 'Volume', description: 'Applies to alerts and media.', invalid: 'false', required: false, disabled: true },
    ]));
    // Its value in words is the handle's own (SLD-18, SLD-19).
    expect(await Promise.all([handle(page, 'value-words'), handle(page, 'range-words', 'start'), handle(page, 'range-words'), handle(page, 'error'), handle(page, 'disabled')].map((each) => each.getAttribute('aria-valuetext')))).toEqual(['120 %', '$100', '$300', '0', '40']);
    // The drawn value text is not in the tree: the value is said once, by the handle (FLD-30).
    const snapshot = await stage(page, 'value-words').ariaSnapshot();
    expect((snapshot.match(/120 %/g) ?? []).length).toBeLessThanOrEqual(1);
    expect(await valueText(page, 'value-words').getAttribute('aria-hidden')).toBe('true');
  });
});

test.describe('fixtures', () => {
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
