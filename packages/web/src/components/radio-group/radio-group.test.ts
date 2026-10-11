// <tanrei-radio-group>, driven by specs/radio-group.spec.json: every behaviour id (RGP-1…19) is cited by a test title,
// every fixture has a baseline, and every length and color is read back from the field group's tokens — the radio group
// has none of its own — never from a number written here.
//
// A composed element: the field group's own element, in its radio-group kind, around the
// product's radio buttons. What every composed element owes is held by `src/primitives/composed.test.ts` — the
// declarations, the forwarded props, the parts, the one `change`, the reports, and the twins: each of the twenty
// fixtures is the same pixels and the same radio group as the field group's `radio-buttons-*` fixture it names, in
// three engines (W13-7). The frame's own sentences are the field group's tests (FGR-1 … FGR-25). What is here is what
// the group adds — the value, the event, the keys and the stop, the form — and, for the sentences that cite the field
// group, that the frame inside the group is drawn and exposed as they say.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { axTree, insideHost, ofRoles } from '../../../test/ax-tree.js';
import { type Fixture, type FixtureItem, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('radio-group');
type P = Page;
const TAG = 'tanrei-radio-group';
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
/**
 * The frame's parts are the field group's own, in the shadow root of the `<tanrei-field-group>` the radio group holds
 * (a locator reaches through both). A Tag and every radio button have parts of the same class names in their own shadow
 * roots, so each part is named with its parents in the field group's.
 */
const OWN: Record<string, string> = {
  '.group': '.group',
  '.legend': '.group > .legend',
  '.label-row': '.group > .legend > .label-row',
  '.label': '.group > .legend > .label-row > .label',
  '.asterisk': '.group > .legend > .label-row > .label > .asterisk',
  // The tag stands in a box one label line high, which is what the row lays out (FGR-5).
  '.requirement-tag': '.group > .legend > .label-row > .requirement-box > .requirement-tag',
  '.required-tag': '.group > .legend > .label-row > .requirement-box > .required-tag',
  '.optional-tag': '.group > .legend > .label-row > .requirement-box > .optional-tag',
  '.supporting-text': '.group > .supporting-text',
  '.controls': '.group > .controls',
  '.error-text': '.group > .error-text',
};
const part = (page: P, id: string, selector: string) =>
  host(page, id).locator(
    selector
      .split(',')
      .map((one) => OWN[one.trim()] ?? one.trim())
      .join(', '),
  );
/** The radio buttons: the group's light-DOM children. */
const options = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG} tanrei-radio-button`);
const option = (page: P, id: string, nth: number) => options(page, id).nth(nth);
const T = (name: string) => `--tanrei-comp-field-group-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const color = (page: P, name: string) => resolveColor(page, T(name));
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
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
const radio = (value: string, label: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'radio-button', props: { value, label, ...props } });
const THREE = [radio('standard', 'Standard'), radio('express', 'Express'), radio('pickup', 'Pick up')];
/** A fixture of the test's own: props, then its radio buttons — items, or markup of the product's. */
const fx = (id: string, props: Fixture['props'], inside: FixtureItem[] | string = THREE, extra: Partial<Fixture> = {}): Fixture => ({
  id,
  // The words are this file's own: a test is the product there and gives them itself (RGP-19).
  props: { label: 'Delivery', requiredText: 'Required', optionalText: 'Optional', ...props },
  ...(typeof inside === 'string' ? { content: inside } : { items: inside }),
  ...extra,
});
const mount = (page: P, fixtures: Fixture[], options_: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options_ });
const mountSpec = (page: P, ...ids: string[]) => mount(page, ids.length ? spec.fixtures.filter((f) => ids.includes(f.id)) : spec.fixtures);
/** Everything the group and its radio buttons have still to draw is drawn. */
const settled = (page: P, id: string) =>
  host(page, id).evaluate(async (el) => {
    for (let pass = 0; pass < 3; pass++) {
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      for (const child of el.querySelectorAll('*')) await (child as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
      await new Promise((resolve) => queueMicrotask(() => resolve(null)));
    }
  });
const set = async (page: P, id: string, props: Record<string, unknown>) => {
  await host(page, id).evaluate((el, p) => void Object.assign(el, p), props);
  await settled(page, id);
};
const setOption = async (page: P, id: string, nth: number, props: Record<string, unknown>) => {
  await option(page, id, nth).evaluate((el, p) => void Object.assign(el, p), props);
  await settled(page, id);
};
const value = (page: P, id: string) => host(page, id).evaluate((el) => (el as HTMLElement & { value: string }).value);
const checked = (page: P, id: string) => options(page, id).evaluateAll((all) => all.map((el) => (el as HTMLElement & { checked: boolean }).checked));
/** Which radio button has focus (-1: none of them). */
const focused = (page: P, id: string) => options(page, id).evaluateAll((all) => all.findIndex((el) => el === document.activeElement));
/** Which radio buttons are in the focus order. */
const stops = (page: P, id: string) => options(page, id).evaluateAll((all) => all.map((el) => { const native = el.shadowRoot!.querySelector('input')!; return !native.disabled && native.tabIndex >= 0; }));
/** The group's `input` and `change`, as a listener on the group and one on the document hear them, with the group's value at that moment. */
const listen = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const log: string[] = ((window as unknown as { heard: string[] }).heard = []);
    const group = el as HTMLElement & { value: string };
    for (const type of ['input', 'change']) {
      el.addEventListener(type, (event) => log.push(`group ${type} ${(event as CustomEvent<{ value?: string }>).detail?.value ?? '-'} ${group.value} ${event.target === el}`));
      el.addEventListener(type, (event) => log.push(`capture ${type} ${event.target === el}`), true);
      document.addEventListener(type, (event) => log.push(`document ${type} ${event.target === el}`));
      for (const child of el.querySelectorAll('tanrei-radio-button')) child.addEventListener(type, () => log.push(`option ${type}`));
    }
  });
const heard = (page: P, filter = 'group change') => page.evaluate((f) => (window as unknown as { heard: string[] }).heard.filter((line) => line.startsWith(f)), filter);
/**
 * The group as the element that is the radio group exposes it — the field group's own, in the shadow root of the
 * `<tanrei-field-group>` the radio group holds (RGP-10, FGR-25): its name, the texts its description refers to in
 * order, its states. `groups` counts every element that is a group of any kind, in both shadow roots and on the host.
 */
const group = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const frame = el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!;
    const root = frame.querySelector('[role="radiogroup"]')!;
    const read = (node: Node): string => (node.nodeType === Node.TEXT_NODE ? node.textContent! : node instanceof Element && node.getAttribute('aria-hidden') !== 'true' && node.localName !== 'tanrei-tag' ? [...node.childNodes].map(read).join('') : '');
    const labelledby = root.getAttribute('aria-labelledby');
    const GROUPS = '[role="radiogroup"], [role="group"], fieldset';
    return {
      groups: el.shadowRoot!.querySelectorAll(GROUPS).length + frame.querySelectorAll(GROUPS).length + (el.matches(GROUPS) || el.hasAttribute('role') ? 1 : 0),
      element: root.localName,
      name: labelledby ? read(frame.getElementById(labelledby)!).replace(/\s+/g, ' ').trim() : root.getAttribute('aria-label'),
      described: (root.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter(Boolean)
        .map((ref) => frame.getElementById(ref)?.textContent?.trim() ?? `missing:${ref}`),
      required: root.getAttribute('aria-required') === 'true',
      invalid: root.getAttribute('aria-invalid') === 'true',
      disabled: root.getAttribute('aria-disabled') === 'true',
      orientation: root.getAttribute('aria-orientation'),
    };
  });
/** Each radio button's position and the set's size, and whether it is inside the group's radiogroup in the flattened tree. */
const places = (page: P, id: string) =>
  options(page, id).evaluateAll((all, tag) =>
    all.map((el) => {
      const native = el.shadowRoot!.querySelector('input')!;
      let at: Element | null = el;
      while (at && !at.assignedSlot) at = at.parentElement;
      // Through the radio group's slot into the field group's: the element that is the radio group is around that one.
      let slot = at?.assignedSlot ?? null;
      while (slot?.assignedSlot) slot = slot.assignedSlot;
      const inside = slot?.closest('[role="radiogroup"]');
      const frame = inside ? (inside.getRootNode() as ShadowRoot).host : null;
      return `${native.getAttribute('aria-posinset')}/${native.getAttribute('aria-setsize')}${frame && (frame.getRootNode() as ShadowRoot).host === el.closest(tag) ? '' : ' outside'}`;
    }), TAG);
const announced = (page: P, id: string) => host(page, id).evaluate((el) => el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!.querySelector('.announcer')!.textContent ?? '');
/** What each option paints, settled: the ring (its `::before`), the fill and the stroke's width, and whether it is drawn in error (RGP-8, RAD-26). */
const paints = (page: P, id: string) =>
  options(page, id).evaluateAll(async (all) => {
    await Promise.all(all.flatMap((el) => [...el.shadowRoot!.querySelectorAll('*')].flatMap((layer) => layer.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)))));
    return all.map((el) => {
      const root = el.shadowRoot!;
      return {
        ring: getComputedStyle(root.querySelector('.ring')!, '::before').backgroundColor,
        fill: getComputedStyle(root.querySelector('.fill')!).backgroundColor,
        stroke: getComputedStyle(root.querySelector('.fill')!).paddingTop,
        error: root.querySelector('.root')!.hasAttribute('data-error'),
      };
    });
  });
/** A form around a radio group, appended to the page: what RGP-9 is about. */
const form = async (page: P, inner: string) => {
  await page.evaluate(async (markup) => {
    const form = document.createElement('form');
    form.id = 'form';
    form.innerHTML = markup;
    document.querySelector('main')!.append(form);
    for (const el of form.querySelectorAll('*')) await (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, inner);
  return page.locator('#form');
};
const entries = (page: P) => page.evaluate(() => [...new FormData(document.querySelector<HTMLFormElement>('#form')!).entries()].map(([k, v]) => `${k}=${String(v)}`));
const DELIVERY = '<tanrei-radio-button value="standard" label="Standard"></tanrei-radio-button><tanrei-radio-button value="express" label="Express"></tanrei-radio-button><tanrei-radio-button value="pickup" label="Pick up"></tanrei-radio-button>';

test.describe('behavior', () => {
  test('RGP-1: the radio group is a field group whose kind is radio-group and whose spacing is controls, around its radio buttons — the field group’s own element in its shadow root, with the eleven props of the frame on it as given, and no copy of it: laid over a field group with the same label, requirement, description and error, the label row, the tag, the description and the error text are in the same places, in the same styles; no container, edge, fill, elevation, padding, token or stylesheet rule of its own, and each radio button at its own size', async ({ page }) => {
    await mountSpec(page, 'error-selected', 'required-asterisk', 'default');
    // The construction: one member in the shadow root, the field group's own element, around the one slot.
    expect(
      await host(page, 'error-selected').evaluate((el) => {
        const root = el.shadowRoot!;
        const frame = root.querySelector('tanrei-field-group')! as HTMLElement & Record<string, unknown>;
        const mine = el as HTMLElement & Record<string, unknown>;
        return {
          children: [...root.children].map((child) => child.localName),
          inside: [...frame.children].map((child) => child.localName),
          part: frame.getAttribute('part'),
          exported: frame.getAttribute('exportparts'),
          kind: frame.kind,
          spacing: frame.spacing,
          same: ['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'disabled', 'requirement', 'requiredMark', 'requiredText', 'optionalText', 'orientation'].filter((name) => frame[name] !== mine[name]),
          slotted: root.querySelector('slot')!.assignedElements().map((child) => child.localName),
        };
      }),
    ).toEqual({ children: ['tanrei-field-group'], inside: ['slot'], part: 'field-group', exported: 'label, requirement-label, supporting-text, error-text', kind: 'radio-group', spacing: 'controls', same: [], slotted: ['tanrei-radio-button', 'tanrei-radio-button', 'tanrei-radio-button'] });
    // A field group beside it, with the same texts around three radio buttons of the same labels.
    const twin = async (id: string) => {
      await host(page, id).evaluate(async (el) => {
        const other = document.createElement('tanrei-field-group');
        for (const name of ['label', 'supporting-text', 'error-text', 'requirement', 'required-mark', 'required-text', 'optional-text', 'error']) if (el.hasAttribute(name)) other.setAttribute(name, el.getAttribute(name)!);
        other.style.inlineSize = '320px';
        other.id = `twin-${el.parentElement!.dataset.fixture}`;
        for (const child of el.children) {
          const copy = document.createElement('tanrei-radio-button');
          copy.setAttribute('label', child.getAttribute('label')!);
          copy.setAttribute('name', other.id);
          other.append(copy);
        }
        el.parentElement!.after(other);
        await (other as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const rows = (target: Locator) =>
        target.evaluate((el) => {
          const origin = el.getBoundingClientRect();
          // The frame's rows: the field group's own shadow root, which the radio group holds one level down.
          const frame = el.shadowRoot!.querySelector('tanrei-field-group')?.shadowRoot ?? el.shadowRoot!;
          return Object.fromEntries(
            ['.label-row', '.label', '.asterisk', '.requirement-tag', '.supporting-text', '.controls', '.error-text'].flatMap((selector) => {
              const row = frame.querySelector(selector);
              if (!row) return [];
              const r = row.getBoundingClientRect();
              // A mark the system does not draw (the asterisk under a tag) has no box.
              if (!r.width && !r.height) return [[selector, 'not drawn']];
              const s = getComputedStyle(row);
              // The label row's own box is as wide as its texts in a legend and as wide as the group here: its place and its height are compared.
              return [[selector, [Math.round((r.left - origin.left) * 2) / 2, Math.round((r.top - origin.top) * 2) / 2, selector === '.label-row' || selector === '.label' ? 0 : Math.round(r.width * 2) / 2, Math.round(r.height * 2) / 2, s.font, s.letterSpacing, s.color].join(' ')]];
            }),
          );
        });
      const [mine, theirs] = [await rows(host(page, id)), await rows(page.locator(`#twin-${id}`))];
      expect(Object.keys(mine).length, id).toBeGreaterThanOrEqual(3);
      expect(mine, id).toEqual(theirs);
      near((await box(host(page, id))).height, (await box(page.locator(`#twin-${id}`))).height, `${id}: as tall as the field group`);
    };
    for (const id of ['error-selected', 'required-asterisk', 'default']) await twin(id);
    // The measures, from the field group's tokens.
    const id = 'error-selected';
    const h = await box(host(page, id));
    const [label, description, controls, error] = [await box(part(page, id, '.label-row')), await box(part(page, id, '.supporting-text')), await box(part(page, id, '.controls')), await box(part(page, id, '.error-text'))];
    near(h.width, 320, 'as wide as its layout gives it');
    near(label.y, h.y, 'the label row is at the top');
    near(description.y - (label.y + label.height), await token(page, 'supporting-text-gap'), 'supporting-text.gap');
    near(controls.y - (description.y + description.height), await token(page, 'label-gap'), 'label.gap');
    const last = await box(option(page, id, 2));
    near(error.y - (last.y + last.height), await token(page, 'error-text-gap'), 'error-text.gap');
    near(h.height, error.y + error.height - h.y, 'as tall as its rows and its options');
    expect(await css(part(page, id, '.label'), 'color')).toBe(await color(page, 'standard-error-label-color'));
    expect(await css(part(page, id, '.error-text'), 'color')).toBe(await color(page, 'standard-error-text-color'));
    // No look of its own.
    for (const target of [host(page, id), part(page, id, '.group'), part(page, id, '.controls')]) {
      expect(await css(target, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      expect(await css(target, 'border-top-width')).toBe('0px');
      expect(await css(target, 'padding-top')).toBe('0px');
      expect(await css(target, 'padding-left')).toBe('0px');
      expect(await css(target, 'box-shadow')).toBe('none');
    }
    expect(await css(host(page, id), 'display')).toBe('block');
    // It names no token at all: its own stylesheet says that the host is a block, and that a hidden one has no box.
    const own = await host(page, id).evaluate((el) => el.shadowRoot!.adoptedStyleSheets.flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join('\n'));
    expect(own.match(/--[\w-]+/g) ?? [], 'no custom property is read or written').toEqual([]);
    expect(own.match(/[^{}]+(?=\{)/g)!.map((selector) => selector.trim()).every((selector) => selector.startsWith(':host')), own).toBe(true);
    // A field group token set on the radio group is read by the field group inside (W3).
    await host(page, 'default').evaluate((el) => (el as HTMLElement).style.setProperty('--tanrei-comp-field-group-gap-controls', '40px'));
    const [first_, second_] = [await box(option(page, 'default', 0)), await box(option(page, 'default', 1))];
    near(second_.y - (first_.y + first_.height), 40, 'the gap set on the radio group');
    await host(page, 'default').evaluate((el) => (el as HTMLElement).style.removeProperty('--tanrei-comp-field-group-gap-controls'));
    // Each radio button at its own size.
    const first = await box(option(page, 'default', 0));
    const outside = await page.evaluate(() => {
      const own = document.createElement('tanrei-radio-button');
      own.setAttribute('label', 'Standard, 3 to 5 days');
      own.setAttribute('name', 'outside');
      document.body.append(own);
      return new Promise<number[]>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve([own.getBoundingClientRect().width, own.getBoundingClientRect().height]))));
    });
    near(first.width, outside[0], 'the radio button’s width is its own');
    near(first.height, outside[1], 'the radio button’s height is its own');
  });

  test('RGP-1: a required set draws the mark requiredMark names — the tag, the asterisk after the label’s text in the asterisk color, or nothing — and under auto the one comp.field-group.requirement.mark names, which follows sys.behavior.requirement-mark, the system’s one answer for every field and every set; whichever mark is drawn, and with no drawn label, the group is exposed as required', async ({ page }) => {
    const marks = ['auto', 'tag', 'asterisk', 'none'] as const;
    await mount(page, [...marks.map((mark) => fx(mark, { requirement: 'required', requiredMark: mark })), fx('hidden', { labelHidden: true, requirement: 'required' })]);
    const drawn = async (id: string) => ({
      tag: (await part(page, id, '.required-tag').count()) > 0 && (await part(page, id, '.required-tag').isVisible()),
      asterisk: (await part(page, id, '.asterisk').count()) > 0 && (await part(page, id, '.asterisk').isVisible()),
    });
    expect(await drawn('auto')).toEqual({ tag: true, asterisk: false });
    expect(await drawn('tag')).toEqual({ tag: true, asterisk: false });
    expect(await drawn('asterisk')).toEqual({ tag: false, asterisk: true });
    expect(await drawn('none')).toEqual({ tag: false, asterisk: false });
    expect(await css(part(page, 'asterisk', '.asterisk'), 'color')).toBe(await color(page, 'standard-required-asterisk-color'));
    for (const [system, auto] of [
      ['asterisk', { tag: false, asterisk: true }],
      ['none', { tag: false, asterisk: false }],
      ['tag', { tag: true, asterisk: false }],
    ] as const) {
      await rootTokens(page, { [T('requirement-mark')]: system });
      for (const mark of marks) await set(page, mark, { requiredMark: mark === 'auto' ? '' : mark });
      for (const mark of marks) await set(page, mark, { requiredMark: mark });
      expect(await drawn('auto'), `auto under ${system}`).toEqual(auto);
      expect(await drawn('tag'), `tag under ${system}`).toEqual({ tag: true, asterisk: false });
      expect(await drawn('asterisk'), `asterisk under ${system}`).toEqual({ tag: false, asterisk: true });
      expect(await drawn('none'), `none under ${system}`).toEqual({ tag: false, asterisk: false });
    }
    // The field group's token follows the system's one choice: set for the page instead, the radio group follows it,
    // and requiredMark still wins.
    await rootTokens(page, { [T('requirement-mark')]: '' });
    for (const [system, auto] of [
      ['asterisk', { tag: false, asterisk: true }],
      ['none', { tag: false, asterisk: false }],
    ] as const) {
      await rootTokens(page, { '--tanrei-sys-behavior-requirement-mark': system });
      for (const mark of marks) await set(page, mark, { requiredMark: mark === 'auto' ? '' : mark });
      for (const mark of marks) await set(page, mark, { requiredMark: mark });
      expect(await drawn('auto'), `auto under the system’s ${system}`).toEqual(auto);
      expect(await drawn('tag'), `tag under the system’s ${system}`).toEqual({ tag: true, asterisk: false });
    }
    await rootTokens(page, { '--tanrei-sys-behavior-requirement-mark': '' });
    for (const id of [...marks, 'hidden']) expect(await group(page, id), id).toMatchObject({ required: true, described: [] });
  });

  test('RGP-2: vertical lays the radio buttons out in one column in the order given, each from the start edge with the group’s whole width to wrap in, gap.controls apart; horizontal in a row from the start edge, gap-inline apart, their first lines aligned, each as wide as it needs, wrapping onto further lines gap.controls apart without cutting, scrolling or narrowing an option', async ({ page }) => {
    await mountSpec(page, 'default', 'horizontal', 'horizontal-many', 'long-label');
    const [inline, gap] = [await token(page, 'gap-inline'), await token(page, 'gap-controls')];
    const h = await box(host(page, 'default'));
    const column = await Promise.all((await options(page, 'default').all()).map(box));
    for (const [i, o] of column.entries()) {
      near(o.x, h.x, `option ${i} starts at the start edge`);
      if (i) near(o.y - (column[i - 1].y + column[i - 1].height), gap, 'gap.controls');
    }
    // Under the default system that puts the rings one touch target apart.
    const ringsAt = await options(page, 'default').evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('.ring')!.getBoundingClientRect().top));
    near(ringsAt[1] - ringsAt[0], column[0].height + gap, 'ring to ring');
    expect(await options(page, 'default').evaluateAll((all) => all.map((el) => el.getAttribute('value')))).toEqual(['standard', 'express', 'pickup']);
    // A long label wraps inside the group's width.
    const long = await box(option(page, 'long-label', 0));
    const longHost = await box(host(page, 'long-label'));
    expect(long.width).toBeLessThanOrEqual(longHost.width + 0.5);
    expect(long.height, 'its label takes several lines').toBeGreaterThan(column[0].height + 10);
    // A row.
    const row = await Promise.all((await options(page, 'horizontal').all()).map(box));
    near(row[0].x, (await box(host(page, 'horizontal'))).x, 'from the start edge');
    for (let i = 1; i < row.length; i++) {
      near(row[i].y, row[0].y, 'on one line');
      near(row[i].x - (row[i - 1].x + row[i - 1].width), inline, 'gap-inline');
    }
    expect(row[0].width, 'as wide as its ring and its label need').toBeLessThan(160);
    // The many-option fixture wraps in the stage.
    const many = await Promise.all((await options(page, 'horizontal-many').all()).map(box));
    const manyHost = await box(host(page, 'horizontal-many'));
    const lines = [...new Set(many.map((m) => Math.round(m.y)))].sort((x, y) => x - y);
    expect(lines.length).toBeGreaterThan(2);
    near(lines[1] - lines[0], many[0].height + gap, 'the lines are gap.controls apart', 1);
    for (const m of many) expect(m.x + m.width, 'inside the group').toBeLessThanOrEqual(manyHost.x + manyHost.width + 0.5);
    expect(await options(page, 'horizontal-many').evaluateAll((all) => all.every((el) => { const label = el.shadowRoot!.querySelector('.label')!; return label.scrollWidth <= label.clientWidth + 1; })), 'no label is cut').toBe(true);
    expect(await part(page, 'horizontal-many', '.controls').evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible'), 'nothing scrolls').toBe(true);
  });

  test('RGP-3: the group holds one value and shows as selected the radio button of that value and no other, none while it is empty; the product’s value selects without a change and without moving focus; selected set on an option becomes the group’s value, likewise silently; drawn with both, value decides; a value no option has shows none and is kept and reported; of two options with one value the first is selected, and both that and an empty value are reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['default', 'none-selected'].includes(f.id)),
      fx('both', { value: 'express' }, [radio('standard', 'Standard', { checked: true }), radio('express', 'Express'), radio('pickup', 'Pick up')]),
      fx('marked', {}, [radio('standard', 'Standard'), radio('express', 'Express', { checked: true }), radio('pickup', 'Pick up')]),
      fx('unknown', { value: 'drone' }),
      fx('twice', { value: 'express' }, [radio('standard', 'Standard'), radio('express', 'Express'), radio('express', 'Express again'), radio('', 'Nothing')]),
    ]);
    expect(await checked(page, 'default')).toEqual([true, false, false]);
    expect(await checked(page, 'none-selected')).toEqual([false, false, false]);
    expect(await value(page, 'none-selected')).toBe('');
    // The product sets value.
    await listen(page, 'default');
    await option(page, 'default', 0).evaluate((el) => el.focus());
    await set(page, 'default', { value: 'pickup' });
    expect(await checked(page, 'default')).toEqual([false, false, true]);
    expect(await focused(page, 'default'), 'focus does not move').toBe(0);
    await set(page, 'default', { value: '' });
    expect(await checked(page, 'default')).toEqual([false, false, false]);
    // The product sets selected on an option.
    await setOption(page, 'default', 1, { checked: true });
    expect(await value(page, 'default')).toBe('express');
    expect(await checked(page, 'default')).toEqual([false, true, false]);
    expect(await heard(page, 'group'), 'no event for what the product set').toEqual([]);
    // Drawn with a value and with an option marked selected: value decides. With no value, the mark is the value.
    expect([await value(page, 'both'), await checked(page, 'both')]).toEqual(['express', [false, true, false]]);
    expect([await value(page, 'marked'), await checked(page, 'marked')]).toEqual(['express', [false, true, false]]);
    // A value no radio button has.
    expect([await value(page, 'unknown'), await checked(page, 'unknown')]).toEqual(['drone', [false, false, false]]);
    expect(seen.filter((w) => w.includes('RGP-3') && w.includes('"drone"'))).toHaveLength(1);
    // …is selected when its radio button arrives.
    await host(page, 'unknown').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-radio-button value="drone" label="By drone"></tanrei-radio-button>'));
    await settled(page, 'unknown');
    await expect.poll(() => checked(page, 'unknown')).toEqual([false, false, false, true]);
    // Two of one value, and one without a value.
    expect(await checked(page, 'twice')).toEqual([false, true, false, false]);
    expect(seen.filter((w) => w.includes('RGP-3') && w.includes('share the value "express"'))).toHaveLength(1);
    expect(seen.filter((w) => w.includes('RGP-3') && w.includes('has no value'))).toHaveLength(1);
    await setOption(page, 'twice', 2, { checked: true });
    expect([await value(page, 'twice'), await checked(page, 'twice')], 'the first of the two is the one the value selects').toEqual(['express', [false, true, false, false]]);
  });

  test('RGP-4: a person’s selection — a click on the ring or on the label, Space, an arrow key, assistive technology — sets value and emits change exactly once, carrying the new value, which the group already holds; the option that was selected emits nothing, and nothing a radio button emits reaches a listener on the group or beyond it; activating the selected one keeps value and emits nothing', async ({ page }) => {
    await mountSpec(page, 'default');
    await listen(page, 'default');
    const expected: string[] = [];
    const once = async (act: () => Promise<unknown>, to: string) => {
      await act();
      await settled(page, 'default');
      expected.push(`group change ${to} ${to} true`);
      expect(await heard(page)).toEqual(expected);
      expect(await value(page, 'default')).toBe(to);
    };
    await once(() => option(page, 'default', 1).locator('.container').click(), 'express');
    expect(await checked(page, 'default')).toEqual([false, true, false]);
    await once(() => option(page, 'default', 2).locator('.label').click(), 'pickup');
    await once(() => page.keyboard.press('ArrowUp'), 'express');
    await once(() => page.keyboard.press('ArrowRight'), 'pickup');
    await once(() => page.keyboard.press('ArrowDown'), 'standard');
    await once(() => page.keyboard.press('ArrowLeft'), 'pickup');
    // Assistive technology activates the native radio.
    await once(() => option(page, 'default', 0).evaluate((el) => el.shadowRoot!.querySelector('input')!.click()), 'standard');
    // The selected one again: nothing.
    await option(page, 'default', 0).locator('.container').click();
    await page.keyboard.press('Space');
    await settled(page, 'default');
    expect(await heard(page)).toEqual(expected);
    // One input before each change, from the group; a capture listener on the group and a listener on the document hear
    // the group's change and no radio button's, and a radio button's own listeners hear nothing. (The native control's
    // own `input` crosses its shadow root on the way down, as around every selection control: a capture listener sees
    // it, a listener in the bubble phase never does.)
    const all = await page.evaluate(() => (window as unknown as { heard: string[] }).heard);
    expect(all.filter((line) => line.startsWith('group input'))).toHaveLength(expected.length);
    expect(all.filter((line) => line.endsWith('false') && !line.startsWith('capture input'))).toEqual([]);
    expect(all.filter((line) => line.startsWith('document input'))).toHaveLength(expected.length);
    expect(all.filter((line) => line.startsWith('option'))).toEqual([]);
    expect(all.filter((line) => line.startsWith('document change'))).toHaveLength(expected.length);
    expect(all.filter((line) => line.startsWith('capture change'))).toHaveLength(expected.length);
    // Space selects the focused option of an unanswered group.
    await set(page, 'default', { value: '' });
    await option(page, 'default', 1).evaluate((el) => el.focus());
    await once(() => page.keyboard.press('Space'), 'express');
  });

  for (const orientation of ['vertical', 'horizontal'] as const) {
    test(`RGP-5: ${orientation} — Down and Right Arrow move focus to the next enabled radio button in the order given and select it, wrapping from the last to the first, Up and Left to the previous; a disabled one is skipped; in right-to-left Left and Right exchange and Up and Down stay; the only enabled one does nothing; a key with Alt, Control or Meta is the platform’s`, async ({ page }) => {
      await mount(page, [
        fx('ltr', { orientation, value: 'a' }, [radio('a', 'A'), radio('b', 'B', { disabled: true }), radio('c', 'C'), radio('d', 'D')]),
        fx('rtl', { orientation, value: 'a' }, [radio('a', 'A'), radio('b', 'B', { disabled: true }), radio('c', 'C'), radio('d', 'D')], { direction: 'rtl' }),
        fx('alone', { orientation }, [radio('a', 'A', { disabled: true }), radio('b', 'B'), radio('c', 'C', { disabled: true })]),
      ]);
      const press = async (id: string, key: string) => {
        await page.keyboard.press(key);
        await settled(page, id);
        return [await value(page, id), await focused(page, id)];
      };
      await option(page, 'ltr', 0).evaluate((el) => el.focus());
      expect(await press('ltr', 'ArrowDown'), 'the disabled option is passed over').toEqual(['c', 2]);
      expect(await press('ltr', 'ArrowRight')).toEqual(['d', 3]);
      expect(await press('ltr', 'ArrowDown'), 'from the last to the first').toEqual(['a', 0]);
      expect(await press('ltr', 'ArrowUp'), 'from the first to the last').toEqual(['d', 3]);
      expect(await press('ltr', 'ArrowLeft')).toEqual(['c', 2]);
      expect(await press('ltr', 'ArrowLeft')).toEqual(['a', 0]);
      expect(await checked(page, 'ltr')).toEqual([true, false, false, false]);
      for (const key of ['Alt+ArrowDown', 'Control+ArrowDown', 'Meta+ArrowDown']) expect(await press('ltr', key), key).toEqual(['a', 0]);
      // Right-to-left.
      await option(page, 'rtl', 0).evaluate((el) => el.focus());
      expect(await press('rtl', 'ArrowLeft'), 'Left Arrow is the next').toEqual(['c', 2]);
      expect(await press('rtl', 'ArrowDown'), 'Down Arrow is still the next').toEqual(['d', 3]);
      expect(await press('rtl', 'ArrowRight'), 'Right Arrow is the previous').toEqual(['c', 2]);
      expect(await press('rtl', 'ArrowUp')).toEqual(['a', 0]);
      expect(await press('rtl', 'ArrowRight'), 'wrapping').toEqual(['d', 3]);
      // The only enabled one: nothing, not even its own selection.
      await option(page, 'alone', 1).evaluate((el) => el.focus());
      for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) expect(await press('alone', key), key).toEqual(['', 1]);
    });
  }

  test('RGP-5: the arrow keys go by the order given, not by the place a wrapped row gave an option', async ({ page }) => {
    await mountSpec(page, 'horizontal-many');
    const at = await Promise.all((await options(page, 'horizontal-many').all()).map(box));
    const wrapsAfter = at.findIndex((o, i) => i > 0 && o.y > at[i - 1].y) - 1;
    expect(wrapsAfter).toBeGreaterThanOrEqual(0);
    await option(page, 'horizontal-many', wrapsAfter).evaluate((el) => el.focus());
    await page.keyboard.press('ArrowDown');
    await settled(page, 'horizontal-many');
    expect(await focused(page, 'horizontal-many'), 'Down Arrow is the next in order, the first of the next line').toBe(wrapsAfter + 1);
    await page.keyboard.press('ArrowLeft');
    await settled(page, 'horizontal-many');
    expect(await focused(page, 'horizontal-many'), 'Left Arrow goes back to the end of the line above').toBe(wrapsAfter);
  });

  test('RGP-6: exactly one radio button is in the focus order — the selected one while it is enabled, otherwise the first enabled one; Tab and Shift+Tab enter the group there from either side and leave it from whichever has focus; the group is not a stop, and a press on its label, its mark, its description or its error text does nothing; the stop changing under the focus leaves focus where it is; with no enabled radio button there is no stop', async ({ page }) => {
    await mount(page, [
      fx('none', {}),
      fx('third', { value: 'pickup', requirement: 'required', supportingText: 'Help.', error: true, errorText: 'Wrong.' }),
      fx('selected-disabled', { value: 'standard' }, [radio('standard', 'Standard', { disabled: true }), radio('express', 'Express'), radio('pickup', 'Pick up')]),
      fx('all-disabled', { value: 'express' }, [radio('standard', 'Standard', { disabled: true }), radio('express', 'Express', { disabled: true })]),
    ]);
    await page.evaluate(() => {
      for (const where of ['afterbegin', 'beforeend'] as const) document.querySelector('main')!.insertAdjacentHTML(where, `<button id="${where}">${where}</button>`);
      for (const stage of document.querySelectorAll('[data-fixture]')) stage.insertAdjacentHTML('afterend', `<button id="after-${(stage as HTMLElement).dataset.fixture}">after</button>`);
    });
    expect(await stops(page, 'none')).toEqual([true, false, false]);
    expect(await stops(page, 'third')).toEqual([false, false, true]);
    expect(await stops(page, 'selected-disabled')).toEqual([false, true, false]);
    expect(await stops(page, 'all-disabled')).toEqual([false, false]);
    expect(await host(page, 'none').evaluate((el) => [el.tabIndex, el.shadowRoot!.querySelector('tanrei-field-group')!.tabIndex, el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!.querySelector('.group')!.hasAttribute('tabindex'), el.shadowRoot!.delegatesFocus])).toEqual([-1, -1, false, false]);
    // Forwards.
    await tabTo(page, page.locator('#afterbegin'));
    await tab(page);
    expect(await focused(page, 'none'), 'Tab lands on the first enabled option').toBe(0);
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id), 'Tab leaves the group').toBe('after-none');
    await tab(page);
    expect(await focused(page, 'third'), 'Tab lands on the selected option').toBe(2);
    await tab(page);
    await tab(page);
    expect(await focused(page, 'selected-disabled'), 'the selected one is disabled: the first enabled one').toBe(1);
    await tab(page);
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id), 'a group with no enabled option has no stop').toBe('after-all-disabled');
    // Backwards, from after each group.
    await tab(page, { back: true });
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after-selected-disabled');
    await tab(page, { back: true });
    expect(await focused(page, 'selected-disabled')).toBe(1);
    await tab(page, { back: true });
    await tab(page, { back: true });
    expect(await focused(page, 'third'), 'Shift+Tab lands on the same one').toBe(2);
    await tab(page, { back: true });
    await tab(page, { back: true });
    expect(await focused(page, 'none')).toBe(0);
    // Leaving from whichever has focus.
    await page.keyboard.press('ArrowDown');
    await settled(page, 'none');
    expect(await focused(page, 'none')).toBe(1);
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after-none');
    // A press on the frame's texts.
    await listen(page, 'third');
    for (const selector of ['.label', '.required-tag', '.supporting-text', '.error-text']) {
      await part(page, 'third', selector).click();
      expect(await host(page, 'third').evaluate((el) => el.matches(':focus-within')), `${selector}: no focus moved into the group`).toBe(false);
    }
    expect([await value(page, 'third'), await checked(page, 'third'), await heard(page, 'group')]).toEqual(['pickup', [false, false, true], []]);
    // The stop changes while focus is inside: focus stays.
    await option(page, 'third', 2).evaluate((el) => el.focus());
    await set(page, 'third', { value: 'standard' });
    expect([await focused(page, 'third'), await stops(page, 'third')]).toEqual([2, [true, false, false]]);
  });

  test('RGP-7: disabled draws the frame from the field group’s disabled tokens, makes every radio button disabled as its own disabled does — out of the focus order, not operable, the selected one still shown selected — keeps value, emits no change and exposes the group as disabled; an enabled group does not enable a radio button the product disabled, which is skipped and still shown selected while value is its value', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['disabled', 'one-disabled'].includes(f.id)), fx('toggled', { value: 'express', supportingText: 'Help.' }, [radio('standard', 'Standard'), radio('express', 'Express', { disabled: true }), radio('pickup', 'Pick up')])]);
    const id = 'disabled';
    expect(await css(part(page, id, '.label'), 'color')).toBe(await color(page, 'standard-disabled-label-color'));
    expect(await css(part(page, id, '.supporting-text'), 'color')).toBe(await color(page, 'standard-disabled-supporting-text-color'));
    expect((await group(page, id)).disabled).toBe(true);
    expect(await options(page, id).evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('input')!.disabled))).toEqual([true, true, true]);
    expect(await options(page, id).evaluateAll((all) => all.map((el) => el.hasAttribute('disabled'))), 'the product’s own attribute is not written').toEqual([false, false, false]);
    expect(await stops(page, id)).toEqual([false, false, false]);
    expect(await checked(page, id)).toEqual([true, false, false]);
    await listen(page, id);
    await option(page, id, 1).locator('.container').click({ force: true });
    await option(page, id, 1).evaluate((el) => el.click());
    await settled(page, id);
    expect([await value(page, id), await heard(page, 'group')]).toEqual(['standard', []]);
    // Its texts stay readable.
    expect((await group(page, id)).described).toEqual(['You can change this until the order ships.']);
    // A disabled radio button of an enabled group.
    expect(await options(page, 'one-disabled').evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('input')!.disabled))).toEqual([false, true, false]);
    expect((await group(page, 'one-disabled')).disabled).toBe(false);
    // Disabling and enabling the group gives the state and takes it back, and keeps the product's own.
    expect(await checked(page, 'toggled'), 'the disabled option is shown selected').toEqual([false, true, false]);
    expect(await stops(page, 'toggled')).toEqual([true, false, false]);
    await set(page, 'toggled', { disabled: true });
    expect(await stops(page, 'toggled')).toEqual([false, false, false]);
    await set(page, 'toggled', { disabled: false });
    expect(await options(page, 'toggled').evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('input')!.disabled))).toEqual([false, true, false]);
    expect([await value(page, 'toggled'), await checked(page, 'toggled'), await stops(page, 'toggled')]).toEqual(['express', [false, true, false], [true, false, false]]);
  });

  test('RGP-8: requirement asks and never puts the group in error; error draws errorText and the error parts of the frame, exposes the group as invalid and draws every enabled radio button in the error form of its condition — a disabled one as out of error, and none exposed as invalid; an error that appears, or changes its words, while focus is on a radio button is announced once, politely, without moving focus; a change of value does not clear the error', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['required-error', 'error-selected', 'none-selected', 'supporting', 'error-one-disabled', 'one-disabled'].includes(f.id)), fx('a', { requirement: 'required', supportingText: 'Help.' }), fx('b', {})]);
    // A required group with no answer is not in error by itself.
    expect(await host(page, 'a').evaluate((el) => [(el as HTMLElement & { error: boolean }).error, el.hasAttribute('error')])).toEqual([false, false]);
    await expect(part(page, 'a', '.error-text')).toHaveCount(0);
    expect((await group(page, 'a')).invalid).toBe(false);
    // In error: the text, the invalid state, and every enabled radio button in the error form of its condition.
    await expect(part(page, 'required-error', '.error-text')).toHaveText('Choose how the order reaches you.');
    expect(await css(part(page, 'required-error', '.error-text'), 'color')).toBe(await color(page, 'standard-error-text-color'));
    expect((await group(page, 'required-error')).invalid).toBe(true);
    const R = (name: string) => resolveColor(page, `--tanrei-comp-radio-button-${name}`);
    const [unselected, selected, plain] = [await R('error-unselected-ring-color'), await R('error-selected-ring-color'), await R('unselected-ring-color')];
    expect(unselected, 'the error form has a color of its own').not.toBe(plain);
    expect((await paints(page, 'required-error')).map((o) => [o.error, o.ring]), 'every ring in the error form').toEqual((await paints(page, 'none-selected')).map(() => [true, unselected]));
    const [inError, atRest] = [await paints(page, 'error-selected'), await paints(page, 'supporting')];
    expect(inError.map((o) => o.error)).toEqual(inError.map(() => true));
    inError.forEach((o, index) => {
      expect(o.stroke, `option ${index}: the stroke’s weight is the condition’s, in error as out of it`).toBe(atRest[index]!.stroke);
      expect([unselected, selected]).toContain(o.ring);
      expect(o.ring, `option ${index}: the ring takes the error form’s color`).not.toBe(atRest[index]!.ring);
    });
    // The selected option of a group in error: the selected error form — its ring and its fill.
    const at = (await options(page, 'error-selected').evaluateAll((all) => all.map((el) => (el as HTMLElement & { checked: boolean }).checked))).indexOf(true);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(inError[at]!.ring).toBe(selected);
    expect(inError[at]!.fill, 'the fill follows the error form').not.toBe(atRest[at]!.fill);
    // Nothing but color changes: each layer's box, stroke and container are those of the group out of error.
    const sizes = (id: string) => options(page, id).evaluateAll((all) => all.map((el) => [...el.shadowRoot!.querySelectorAll('.ring, .fill, .container')].map((layer) => `${layer.getBoundingClientRect().width}x${layer.getBoundingClientRect().height}`).join(' ')));
    expect(await sizes('error-selected')).toEqual(await sizes('supporting'));
    // Disabled wins: a disabled option of a group in error is drawn as the same option out of error.
    const [mixed, mixedAtRest] = [await paints(page, 'error-one-disabled'), await paints(page, 'one-disabled')];
    const off = await options(page, 'error-one-disabled').evaluateAll((all) => all.map((el) => (el as HTMLElement & { isDisabled: boolean }).isDisabled));
    expect(off.filter(Boolean).length, 'the fixture has a disabled option').toBeGreaterThan(0);
    const offAtRest = await options(page, 'one-disabled').evaluateAll((all) => all.map((el) => (el as HTMLElement & { isDisabled: boolean; checked: boolean }).isDisabled && !(el as HTMLElement & { checked: boolean }).checked));
    const disabledRing = mixedAtRest[offAtRest.indexOf(true)]?.ring;
    mixed.forEach((o, index) => {
      if (off[index]) expect([unselected, selected], `option ${index}: a disabled option shows no error color`).not.toContain(o.ring);
      else expect([unselected, selected], `option ${index}: an enabled option is in its error form`).toContain(o.ring);
    });
    if (disabledRing) expect(mixed.filter((_, index) => off[index]).map((o) => o.ring)).toContain(disabledRing);
    // The error going puts every option back at rest.
    await set(page, 'required-error', { error: false });
    await expect.poll(async () => (await paints(page, 'required-error')).map((o) => [o.error, o.ring])).toEqual((await paints(page, 'none-selected')).map((o) => [false, o.ring]));
    await set(page, 'required-error', { error: true });
    await expect.poll(async () => (await paints(page, 'required-error')).map((o) => o.ring)).toEqual((await paints(page, 'none-selected')).map(() => unselected));
    await expect(part(page, 'error-selected', '.supporting-text'), 'the description stays').toHaveText('You can change this until the order ships.');
    expect(await options(page, 'required-error').evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('input')!.getAttribute('aria-invalid')))).toEqual([null, null, null]);
    // The announcement.
    expect(await host(page, 'a').locator('.announcer').getAttribute('aria-live')).toBe('polite');
    await frames(page);
    expect(await announced(page, 'required-error'), 'drawn in error from the start: not announced').toBe('');
    await option(page, 'a', 0).evaluate((el) => el.focus());
    await set(page, 'a', { supportingText: 'New help.' });
    await frames(page);
    expect(await announced(page, 'a')).toBe('');
    await set(page, 'a', { error: true, errorText: 'Choose one.' });
    await expect.poll(() => announced(page, 'a')).toBe('Choose one.');
    expect(await focused(page, 'a'), 'focus stays').toBe(0);
    await set(page, 'a', { errorText: 'Choose a way.' });
    await expect.poll(() => announced(page, 'a')).toBe('Choose a way.');
    await set(page, 'b', { error: true, errorText: 'Elsewhere.' });
    await frames(page);
    expect(await announced(page, 'b'), 'focus is elsewhere: read with the group').toBe('');
    expect((await group(page, 'b')).described).toEqual(['Elsewhere.']);
    // A change of value does not clear the error.
    await page.keyboard.press('ArrowDown');
    await settled(page, 'a');
    expect([await value(page, 'a'), await host(page, 'a').evaluate((el) => (el as HTMLElement & { error: boolean }).error), (await group(page, 'a')).invalid]).toEqual(['express', true, true]);
    await expect(part(page, 'a', '.error-text')).toHaveText('Choose a way.');
  });

  test('RGP-9: the group takes part in its form as one control — it submits value under its own name while value is not empty and it is not disabled, its radio buttons submit nothing; a reset returns to the first value without a change; a disabled fieldset disables it; a required, empty group is a missing value to the form’s validation; Enter on a radio button is the form’s', async ({ page }) => {
    await mountSpec(page, 'default');
    await form(
      page,
      `<tanrei-radio-group id="g" label="Delivery" name="delivery" value="express">${DELIVERY.replaceAll('<tanrei-radio-button ', '<tanrei-radio-button name="option" ')}</tanrei-radio-group>
       <fieldset id="set"><tanrei-radio-group id="inner" label="Size" name="size" value="m" requirement="required"><tanrei-radio-button value="s" label="Small"></tanrei-radio-button><tanrei-radio-button value="m" label="Medium" checked></tanrei-radio-button></tanrei-radio-group></fieldset>
       <button id="submit">Send</button>`,
    );
    const g = page.locator('#g');
    const inner = page.locator('#inner');
    expect(await g.evaluate((el) => [(el.constructor as unknown as { formAssociated: boolean }).formAssociated, (el as HTMLElement & { form: HTMLFormElement }).form?.id])).toEqual([true, 'form']);
    expect(await entries(page)).toEqual(['delivery=express', 'size=m']);
    // A person's selection is in the form when change is heard.
    await page.evaluate(() => {
      document.querySelector('#g')!.addEventListener('change', () => ((window as unknown as { atChange: string[] }).atChange = [...new FormData(document.querySelector<HTMLFormElement>('#form')!).entries()].map(([k, v]) => `${k}=${String(v)}`)));
    });
    await g.locator('tanrei-radio-button').nth(2).locator('.container').click();
    expect(await page.evaluate(() => (window as unknown as { atChange: string[] }).atChange)).toEqual(['delivery=pickup', 'size=m']);
    expect(await entries(page)).toEqual(['delivery=pickup', 'size=m']);
    // Empty: nothing is submitted.
    await g.evaluate((el) => ((el as HTMLElement & { value: string }).value = ''));
    await expect.poll(() => entries(page)).toEqual(['size=m']);
    // Reset: the first value, silently.
    await page.evaluate(() => {
      const log: string[] = ((window as unknown as { resets: string[] }).resets = []);
      for (const type of ['input', 'change']) document.querySelector('#form')!.addEventListener(type, () => log.push(type));
    });
    await inner.evaluate((el) => ((el as HTMLElement & { value: string }).value = 's'));
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.reset());
    await expect.poll(() => entries(page)).toEqual(['delivery=express', 'size=m']);
    expect(await g.locator('tanrei-radio-button').evaluateAll((all) => all.map((el) => (el as HTMLElement & { checked: boolean }).checked))).toEqual([false, true, false]);
    expect(await page.evaluate(() => (window as unknown as { resets: string[] }).resets)).toEqual([]);
    // A disabled fieldset.
    await page.evaluate(() => ((document.querySelector('#set') as HTMLFieldSetElement).disabled = true));
    await expect.poll(() => entries(page)).toEqual(['delivery=express']);
    await expect.poll(() => inner.locator('tanrei-radio-button').evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('input')!.disabled))).toEqual([true, true]);
    expect(await inner.evaluate((el) => el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!.querySelector('[role="radiogroup"]')!.getAttribute('aria-disabled'))).toBe('true');
    await page.evaluate(() => ((document.querySelector('#set') as HTMLFieldSetElement).disabled = false));
    await expect.poll(() => entries(page)).toEqual(['delivery=express', 'size=m']);
    // The group's own disabled keeps the value and submits nothing.
    await g.evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await expect.poll(() => entries(page)).toEqual(['size=m']);
    expect(await g.evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe('express');
    await g.evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    // Required and empty: a missing value, anchored on the radio button that is the stop; it is not the error condition.
    const validity = () => inner.evaluate((el) => { const group_ = el as HTMLElement & { validity: ValidityState; validationMessage: string; checkValidity(): boolean; error: boolean }; return [group_.validity.valueMissing, group_.checkValidity(), group_.validationMessage !== '', group_.error]; });
    expect(await validity()).toEqual([false, true, false, false]);
    await inner.evaluate((el) => ((el as HTMLElement & { value: string }).value = ''));
    await expect.poll(validity).toEqual([true, false, true, false]);
    expect(await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.checkValidity())).toBe(false);
    await inner.locator('tanrei-radio-button').nth(0).locator('.container').click();
    await expect.poll(validity).toEqual([false, true, false, false]);
    expect(await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.checkValidity())).toBe(true);
    // Not required: an empty group is valid.
    await g.evaluate((el) => ((el as HTMLElement & { value: string }).value = ''));
    expect(await g.evaluate((el) => (el as HTMLElement & { checkValidity(): boolean }).checkValidity())).toBe(true);
    // Enter submits the form and selects nothing.
    await page.evaluate(() => document.querySelector('#form')!.addEventListener('submit', (event) => { event.preventDefault(); (window as unknown as { submitted: number }).submitted = ((window as unknown as { submitted?: number }).submitted ?? 0) + 1; }));
    await g.locator('tanrei-radio-button').nth(1).evaluate((el) => el.focus());
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { submitted?: number }).submitted)).toBe(1);
    expect(await g.evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe('');
  });

  test('RGP-9: the value is the group’s — it is still submitted while the radio button of that value is one the product disabled by itself (RGP-7), and not while the group is disabled; a group that was disabled, required and unanswered reports the missing value again once it is enabled, anchored on the radio button that is then the stop; RGP-7: the group has no read-only state', async ({ page }) => {
    await mountSpec(page, 'default');
    await form(
      page,
      `<tanrei-radio-group id="g" label="Delivery" name="delivery" value="express"><tanrei-radio-button value="standard" label="Standard"></tanrei-radio-button><tanrei-radio-button value="express" label="Express" disabled></tanrei-radio-button></tanrei-radio-group>
       <tanrei-radio-group id="asked" label="Size" name="size" requirement="required" disabled><tanrei-radio-button value="s" label="Small"></tanrei-radio-button><tanrei-radio-button value="m" label="Medium"></tanrei-radio-button></tanrei-radio-group>`,
    );
    const [g, asked] = [page.locator('#g'), page.locator('#asked')];
    // A selected radio button disabled by itself: shown selected, out of the focus order, and its value submitted.
    expect(await g.locator('tanrei-radio-button').evaluateAll((all) => all.map((el) => [(el as HTMLElement & { checked: boolean }).checked, el.shadowRoot!.querySelector('input')!.disabled]))).toEqual([[false, false], [true, true]]);
    expect(await entries(page)).toEqual(['delivery=express']);
    // The group disabled: nothing; enabled again: the value it kept.
    await g.evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await expect.poll(() => entries(page)).toEqual([]);
    await g.evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await expect.poll(() => entries(page)).toEqual(['delivery=express']);
    // A disabled group is not validated; enabled, it is missing its value, and the message points at the stop.
    const validity = () => asked.evaluate((el) => { const group_ = el as HTMLElement & { validity: ValidityState; willValidate: boolean }; return [group_.willValidate, group_.validity.valueMissing]; });
    expect(await validity()).toEqual([false, false]);
    await asked.evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await expect.poll(validity).toEqual([true, true]);
    await expect.poll(() => asked.locator('tanrei-radio-button').evaluateAll((all) => all.map((el) => { const native = el.shadowRoot!.querySelector('input')!; return !native.disabled && native.tabIndex === 0; }))).toEqual([true, false]);
    await page.evaluate(() => {
      const log: string[] = ((window as unknown as { invalid: string[] }).invalid = []);
      document.querySelector('#asked')!.addEventListener('invalid', (event) => log.push((event.target as Element).id));
    });
    expect(await asked.evaluate((el) => (el as HTMLElement & { reportValidity(): boolean }).reportValidity())).toBe(false);
    expect(await page.evaluate(() => (window as unknown as { invalid: string[] }).invalid)).toEqual(['asked']);
    await expect.poll(() => asked.locator('tanrei-radio-button').evaluateAll((all) => all.findIndex((el) => el === document.activeElement || el.matches(':focus-within')))).toBe(0);
    // No read-only state: neither a property nor an attribute of the group's.
    expect(await g.evaluate((el) => ['readOnly' in el, 'readonly' in el, (el.constructor as unknown as { observedAttributes: string[] }).observedAttributes.some((name) => /read-?only/i.test(name))])).toEqual([false, false, false]);
  });

  test('RGP-6: focus asked of the group itself goes to the radio button that is the stop, and blur() takes it from the one that has it; a page’s label for the group moves focus there; the group is not focusable and does not delegate focus; while no radio button is enabled focus goes nowhere', async ({ page }) => {
    await mount(page, [fx('third', { value: 'pickup' }), fx('off', { disabled: true, value: 'express' })]);
    await page.evaluate(() => {
      const group = document.querySelector('[data-fixture="third"] tanrei-radio-group')!;
      group.id = 'the-group';
      group.insertAdjacentHTML('beforebegin', '<label id="outside" for="the-group">Delivery, in the page</label>');
    });
    expect(await host(page, 'third').evaluate((el) => [el.tabIndex, el.shadowRoot!.delegatesFocus, el.matches(':focus-within')])).toEqual([-1, false, false]);
    await host(page, 'third').evaluate((el) => (el as HTMLElement).focus());
    expect(await focused(page, 'third')).toBe(2);
    await host(page, 'third').evaluate((el) => (el as HTMLElement).blur());
    expect(await focused(page, 'third')).toBe(-1);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    // The page's own label for the element: the click arrives on the host, which gives its stop focus and selects nothing.
    await listen(page, 'third');
    await page.locator('#outside').click();
    expect(await focused(page, 'third')).toBe(2);
    expect([await value(page, 'third'), await heard(page, 'group')]).toEqual(['pickup', []]);
    // No radio button enabled: no stop, and focus stays where it was.
    await host(page, 'off').evaluate((el) => (el as HTMLElement).focus());
    expect(await focused(page, 'off')).toBe(-1);
    expect(await focused(page, 'third')).toBe(2);
  });

  test('RGP-11: radio buttons whose group is made by script, inside a field group that is disabled and in error, are the radio group’s and never the outer group’s — they ask before the group has drawn its frame, are answered by the field group inside it once it is there, take disabled through the radio group and nothing of the outer error; one added later is given the same, and one taken out is given it back', async ({ page }) => {
    await mountSpec(page, 'default');
    await page.evaluate(async () => {
      const outer = document.createElement('tanrei-field-group');
      outer.id = 'outer';
      outer.setAttribute('label', 'Shipping');
      outer.setAttribute('spacing', 'fields');
      outer.setAttribute('error', '');
      outer.setAttribute('error-text', 'Something is missing.');
      outer.setAttribute('disabled', '');
      const group = document.createElement('tanrei-radio-group');
      group.id = 'made';
      group.setAttribute('label', 'Delivery');
      group.setAttribute('value', 'b');
      for (const [value, label] of [['a', 'A'], ['b', 'B']]) {
        const radio = document.createElement('tanrei-radio-button');
        radio.setAttribute('value', value!);
        radio.setAttribute('label', label!);
        group.append(radio);
      }
      outer.append(group);
      document.querySelector('main')!.append(outer);
      for (let pass = 0; pass < 3; pass++) {
        for (const el of outer.querySelectorAll('*')) await (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
        await (outer as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    });
    const said = () =>
      page.locator('#made tanrei-radio-button').evaluateAll((all) =>
        all.map((el) => {
          const native = el.shadowRoot!.querySelector('input')!;
          return [native.checked, native.disabled, native.getAttribute('aria-invalid'), native.getAttribute('aria-description'), el.hasAttribute('disabled')];
        }),
      );
    await expect.poll(said).toEqual([[false, true, null, null, false], [true, true, null, null, false]]);
    // Whose they are: the field group inside the radio group keeps their connections; the outer one keeps the radio group's.
    const connections = (selector: string, inner = false) =>
      page.locator(selector).evaluate((el, deep) => {
        const frame = deep ? el.shadowRoot!.querySelector('tanrei-field-group')! : el;
        return [...(frame as unknown as { provider: { connections: Map<Element, unknown> } }).provider.connections.keys()].map((control) => control.localName);
      }, inner);
    expect(await connections('#made', true)).toEqual(['tanrei-radio-button', 'tanrei-radio-button']);
    expect(await connections('#outer')).toEqual(['tanrei-radio-group']);
    // The outer group enabled: both enabled, the selected one the stop.
    await page.locator('#outer').evaluate((el) => el.removeAttribute('disabled'));
    await expect.poll(said).toEqual([[false, false, null, null, false], [true, false, null, null, false]]);
    await expect.poll(() => page.locator('#made tanrei-radio-button').evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('input')!.tabIndex === 0))).toEqual([false, true]);
    // One added later while the radio group is disabled is given `disabled`; taken out, it has it no longer.
    await page.locator('#made').evaluate((el) => {
      (el as HTMLElement & { disabled: boolean }).disabled = true;
      el.insertAdjacentHTML('beforeend', '<tanrei-radio-button id="late" value="c" label="C"></tanrei-radio-button>');
    });
    await expect.poll(() => page.locator('#late').evaluate((el) => el.shadowRoot?.querySelector('input')?.disabled)).toBe(true);
    await page.locator('#late').evaluate((el) => document.querySelector('main')!.append(el));
    await expect.poll(() => page.locator('#late').evaluate((el) => el.shadowRoot!.querySelector('input')!.disabled)).toBe(false);
  });

  test('RGP-10: one radio group that contains its radio buttons — named by label, drawn or not; required while requirement is required; invalid while error is true; disabled while disabled; described by supportingText, then errorText while in error, then optionalText while optional, each at once when it changes, and never by requiredText; the tag and the asterisk are hidden; it says its orientation; each radio button says its position and the set’s size, disabled ones counted; the group is the field group it is, in its radio-group kind, and adds no group to it (FGR-25); an empty label still renders and is reported (FGR-10)', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...spec.fixtures.filter((f) => ['default', 'label-hidden', 'error-selected', 'optional', 'required-asterisk', 'one-disabled', 'disabled', 'horizontal'].includes(f.id)), fx('nameless', { label: '' })]);
    expect(await group(page, 'default')).toEqual({ groups: 1, element: 'fieldset', name: 'Delivery', described: [], required: false, invalid: false, disabled: false, orientation: 'vertical' });
    expect(await group(page, 'horizontal')).toMatchObject({ groups: 1, orientation: 'horizontal' });
    expect(await group(page, 'label-hidden')).toMatchObject({ groups: 1, name: 'Delivery', described: ['You can change this until the order ships.'] });
    await expect(part(page, 'label-hidden', '.label-row')).toHaveCount(0);
    expect(await group(page, 'error-selected')).toMatchObject({ name: 'Delivery', required: true, invalid: true, described: ['You can change this until the order ships.', 'Express delivery does not reach this address. Choose another way.'] });
    expect(await group(page, 'optional')).toMatchObject({ required: false, described: ['Optional'] });
    expect(await group(page, 'required-asterisk')).toMatchObject({ name: 'Delivery', required: true, described: [] });
    expect((await group(page, 'disabled')).disabled).toBe(true);
    // The drawn marks are kept from assistive technology.
    expect(await part(page, 'error-selected', '.required-tag').getAttribute('aria-hidden')).toBe('true');
    expect(await part(page, 'required-asterisk', '.asterisk').getAttribute('aria-hidden')).toBe('true');
    expect(await part(page, 'optional', '.optional-tag').getAttribute('aria-hidden')).toBe('true');
    // The role is the field group's own element's, two shadow roots down — the fieldset that is a group in its other
    // kind — and nothing else is a group: not the host, not the field group's host.
    expect(await host(page, 'default').evaluate((el) => [el.getAttribute('role'), el.shadowRoot!.querySelector('tanrei-field-group')!.getAttribute('role'), el.shadowRoot!.querySelector('tanrei-field-group')!.getAttribute('kind')])).toEqual([null, null, 'radio-group']);
    for (const id of ['default', 'label-hidden', 'error-selected', 'disabled']) {
      await expect(stage(page, id).getByRole('radiogroup'), id).toHaveCount(1);
      await expect(stage(page, id).getByRole('group'), id).toHaveCount(0);
    }
    await expect(stage(page, 'default').getByRole('radiogroup', { name: 'Delivery', exact: true })).toHaveCount(1);
    await expect(stage(page, 'label-hidden').getByRole('radiogroup', { name: 'Delivery', exact: true })).toHaveCount(1);
    await expect(stage(page, 'default').getByRole('radio')).toHaveCount(3);
    await expect(stage(page, 'default').getByRole('radio', { name: 'Standard, 3 to 5 days', checked: true })).toHaveCount(1);
    // Positions, with a disabled option counted.
    expect(await places(page, 'default')).toEqual(['1/3', '2/3', '3/3']);
    expect(await places(page, 'one-disabled')).toEqual(['1/3', '2/3', '3/3']);
    // Each new text is exposed at once.
    await set(page, 'default', { supportingText: 'Help.', error: true, errorText: 'Wrong.', requirement: 'optional', optionalText: 'If you like' });
    expect(await group(page, 'default')).toMatchObject({ described: ['Help.', 'Wrong.', 'If you like'], invalid: true, required: false });
    await set(page, 'default', { requirement: 'required', error: false });
    expect(await group(page, 'default')).toMatchObject({ described: ['Help.'], invalid: false, required: true });
    // Without a label it still renders.
    await expect(options(page, 'nameless')).toHaveCount(3);
    await expect(option(page, 'nameless', 0)).toBeVisible();
    // The report is the field group's, under its own sentence.
    expect(seen.filter((w) => w.includes('FGR-10') && w.includes('<tanrei-field-group>') && w.includes('label is empty'))).toHaveLength(1);
    expect(seen.filter((w) => w.includes('<tanrei-radio-group>') && w.includes('label'))).toEqual([]);
  });

  test('RGP-11: a radio button that is added, removed or moved, or whose value or disabled changes, is laid out at once without a motion and selected by value again — one that arrives with the group’s value is shown selected, and value is kept when the selected one leaves — given the disabled state the group holds and given it back when it leaves; the tab stop and each position are set again; no change is emitted and focus stays where it is', async ({ page }) => {
    await mount(page, [fx('a', { value: 'pickup' }), fx('off', { disabled: true, value: 'standard' }), fx('deep', { value: 'b' }, '<div><span><tanrei-radio-button value="a" label="A"></tanrei-radio-button></span></div><div><tanrei-radio-button value="b" label="B"></tanrei-radio-button></div>')]);
    await listen(page, 'a');
    await option(page, 'a', 0).evaluate((el) => el.focus());
    // Added.
    await host(page, 'a').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-radio-button value="drone" label="By drone"></tanrei-radio-button>'));
    await settled(page, 'a');
    await expect.poll(() => places(page, 'a')).toEqual(['1/4', '2/4', '3/4', '4/4']);
    const [third, fourth] = [await box(option(page, 'a', 2)), await box(option(page, 'a', 3))];
    near(fourth.y - (third.y + third.height), await token(page, 'gap-controls'), 'laid out at once');
    expect(await css(part(page, 'a', '.controls'), 'transition-duration')).toBe('0s');
    // The selected one leaves: value is kept, the stop is the first enabled one; it comes back and is selected again.
    const left = await option(page, 'a', 2).evaluateHandle((el) => { el.remove(); return el; });
    await settled(page, 'a');
    await expect.poll(() => places(page, 'a')).toEqual(['1/3', '2/3', '3/3']);
    expect([await value(page, 'a'), await checked(page, 'a'), await stops(page, 'a')]).toEqual(['pickup', [false, false, false], [true, false, false]]);
    await host(page, 'a').evaluate((el, option_) => el.prepend(option_), left);
    await settled(page, 'a');
    await expect.poll(() => checked(page, 'a')).toEqual([true, false, false, false]);
    expect([await places(page, 'a'), await stops(page, 'a')]).toEqual([['1/4', '2/4', '3/4', '4/4'], [true, false, false, false]]);
    expect(await options(page, 'a').evaluateAll((all) => all.map((el) => el.getAttribute('value')))).toEqual(['pickup', 'standard', 'express', 'drone']);
    // Its value changes: selected by value again, and the value is kept.
    await setOption(page, 'a', 0, { value: 'store' });
    expect([await value(page, 'a'), await checked(page, 'a')]).toEqual(['pickup', [false, false, false, false]]);
    await setOption(page, 'a', 3, { value: 'pickup' });
    expect(await checked(page, 'a')).toEqual([false, false, false, true]);
    // Its disabled changes: the stop moves off it.
    await setOption(page, 'a', 3, { disabled: true });
    expect(await stops(page, 'a')).toEqual([true, false, false, false]);
    expect(await checked(page, 'a'), 'still shown selected').toEqual([false, false, false, true]);
    // Nothing was emitted, and focus is where it was (on "standard", now the second).
    expect(await heard(page, 'group')).toEqual([]);
    expect(await focused(page, 'a')).toBe(1);
    // The disabled state a group holds: given to one that comes, taken back from one that leaves.
    await host(page, 'off').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-radio-button value="late" label="Late"></tanrei-radio-button>'));
    await settled(page, 'off');
    await expect.poll(() => option(page, 'off', 3).evaluate((el) => el.shadowRoot!.querySelector('input')!.disabled)).toBe(true);
    const gone = await option(page, 'off', 3).evaluateHandle((el) => { el.setAttribute('name', 'elsewhere'); document.querySelector('main')!.append(el); return el; });
    await expect.poll(() => gone.evaluate((el) => (el as Element).shadowRoot!.querySelector('input')!.disabled)).toBe(false);
    // Radio buttons inside the product's own elements are the group's all the same, in the order given.
    expect([await places(page, 'deep'), await checked(page, 'deep'), await stops(page, 'deep')]).toEqual([['1/2', '2/2'], [false, true], [false, true]]);
    await host(page, 'deep').evaluate((el) => el.querySelector('span')!.insertAdjacentHTML('beforeend', '<tanrei-radio-button value="c" label="C"></tanrei-radio-button>'));
    await settled(page, 'deep');
    await expect.poll(() => places(page, 'deep')).toEqual(['1/3', '2/3', '3/3']);
    expect(await options(page, 'deep').evaluateAll((all) => all.map((el) => el.getAttribute('value')))).toEqual(['a', 'c', 'b']);
  });

  test('RGP-12: the group holds radio buttons and nothing else that can be operated — with none it draws its rows and reports it, and another control, or a radio button that names a group of its own, is reported; it restyles no radio button and leaves hover, focus and a press the radio button’s', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('empty', { supportingText: 'Help.', error: true, errorText: 'Wrong.' }, ''),
      fx('mixed', {}, `${DELIVERY}<tanrei-checkbox label="Gift wrap"></tanrei-checkbox>`),
      fx('native', {}, `${DELIVERY}<button type="button">More</button>`),
      fx('named', {}, '<tanrei-radio-button name="own" value="a" label="A"></tanrei-radio-button><tanrei-radio-button name="other" value="b" label="B"></tanrei-radio-button>'),
      fx('plain', {}),
    ]);
    await expect(part(page, 'empty', '.label')).toHaveText('Delivery');
    await expect(part(page, 'empty', '.supporting-text')).toBeVisible();
    await expect(part(page, 'empty', '.error-text')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('RGP-12') && w.includes('holds no radio button'))).toHaveLength(1);
    await expect.poll(() => seen.filter((w) => w.includes('RGP-12') && w.includes('not a radio button'))).toHaveLength(2);
    expect(seen.filter((w) => w.includes('RGP-12') && w.includes('name of its own'))).toHaveLength(1);
    expect(seen.filter((w) => w.includes('RGP-12') && w.includes('<tanrei-radio-group>')).length).toBe(4);
    // A name of its own is ignored: the two are one group.
    await option(page, 'named', 0).locator('.container').click();
    await option(page, 'named', 1).locator('.container').click();
    await settled(page, 'named');
    expect([await checked(page, 'named'), await value(page, 'named'), await places(page, 'named')]).toEqual([[false, true], 'b', ['1/2', '2/2']]);
    // The group writes nothing on a radio button and styles nothing of it.
    // (`name` is the radio button's own reflection of its empty name.)
    expect(await options(page, 'plain').evaluateAll((all) => all.map((el) => [...el.attributes].map((a) => a.name).filter((name) => name !== 'name').sort().join()))).toEqual(['label,value', 'label,value', 'label,value']);
    expect(await host(page, 'plain').evaluate((el) => /::slotted|tanrei-radio-button|--tanrei-comp-radio/.test(el.shadowRoot!.adoptedStyleSheets.flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join('\n'))), 'no rule of the group reaches a radio button').toBe(false);
    // Focus, hover and a press are the radio button's.
    await tabTo(page, option(page, 'plain', 0));
    expect(await option(page, 'plain', 0).locator('input').evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    const ring = option(page, 'plain', 1).locator('.container');
    const rest = await css(ring, 'background-color');
    await option(page, 'plain', 1).locator('.container').hover();
    await expect.poll(() => css(ring, 'background-color')).not.toBe(rest);
    await page.mouse.down();
    await expect(ring).toHaveAttribute('data-pressed', /.+/);
    await page.mouse.up();
  });

  test('RGP-13: with the text enlarged the group grows with its texts — the label, the description, the error text and each option’s label wrap and never clip, the tag grows with its text, a horizontal row wraps and at 200 % becomes a column where one line no longer holds two options; nothing is lost, overlaps or scrolls sideways at 320 wide', async ({ page }) => {
    const ids = ['long-label', 'error-selected', 'horizontal', 'horizontal-many'];
    await page.setViewportSize({ width: 320, height: 2400 });
    await mountSpec(page, ...ids);
    const before = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, (await box(host(page, id))).height] as const)));
    const labelSize = Number.parseFloat(await css(part(page, 'error-selected', '.label'), 'font-size'));
    const tagSize = Number.parseFloat(await css(part(page, 'error-selected', '.required-tag').locator('.container'), 'font-size'));
    await page.addStyleTag({ content: `html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } .stage > ${TAG} { inline-size: auto !important; }` });
    await frames(page);
    near(Number.parseFloat(await css(part(page, 'error-selected', '.label'), 'font-size')), 2 * labelSize, 'the label grows');
    near(Number.parseFloat(await css(part(page, 'error-selected', '.required-tag').locator('.container'), 'font-size')), 2 * tagSize, 'the tag grows with its text');
    for (const id of ids) {
      expect((await box(host(page, id))).height, `${id} grows`).toBeGreaterThan(before[id]);
      expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: no scrolling sideways`).toBe(true);
      const rows = await host(page, id).evaluate((el) =>
        [el.shadowRoot!.querySelector('.label-row'), el.shadowRoot!.querySelector('.supporting-text'), el.shadowRoot!.querySelector('.controls'), el.shadowRoot!.querySelector('.error-text')].filter((row): row is Element => !!row).map((row) => [row.getBoundingClientRect().top, row.getBoundingClientRect().bottom]),
      );
      for (let i = 1; i < rows.length; i++) expect(rows[i][0], `${id}: row ${i} is below row ${i - 1}`).toBeGreaterThanOrEqual(rows[i - 1][1] - 0.5);
      expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.label-row > .label, .supporting-text, .error-text')].every((text) => text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1)), `${id}: no text is clipped`).toBe(true);
      expect(await options(page, id).evaluateAll((all) => all.every((el) => { const label = el.shadowRoot!.querySelector('.label')!; return label.scrollWidth <= label.clientWidth + 1 && label.scrollHeight <= label.clientHeight + 1; })), `${id}: no option’s label is clipped`).toBe(true);
      // No option lies over another or outside the group.
      const all = await Promise.all((await options(page, id).all()).map(box));
      const h = await box(host(page, id));
      for (const [i, a] of all.entries()) {
        expect(a.x, `${id}: inside the group`).toBeGreaterThanOrEqual(h.x - 0.5);
        expect(a.x + a.width, `${id}: inside the group`).toBeLessThanOrEqual(h.x + h.width + 0.5);
        for (const b of all.slice(i + 1)) expect(a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5, `${id}: options do not overlap`).toBe(true);
      }
    }
    // The long options of the wrapping row each take a line of their own: a column where one line no longer holds two.
    const many = await Promise.all((await options(page, 'horizontal-many').all()).map(box));
    expect(new Set(many.slice(-2).map((m) => Math.round(m.y))).size).toBe(2);
    expect(new Set(many.map((m) => Math.round(m.y))).size, 'the row has wrapped').toBeGreaterThan(3);
  });

  test('RGP-14: in forced colors the label, the asterisk, the description and the error text are drawn in the platform’s text color and the requirement tag has a visible edge; no color of the group’s own shows an error — the radio buttons of a group in error are drawn as out of error — which its words and the invalid state carry', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, [...spec.fixtures, fx('disabled-error', { disabled: true, error: true, errorText: 'Wrong.' })]);
    const system = (name: string) =>
      page.evaluate((keyword) => {
        const probe = document.createElement('div');
        probe.style.color = keyword;
        document.body.append(probe);
        const computed = getComputedStyle(probe).color;
        probe.remove();
        return computed;
      }, name);
    const [canvasText, grayText] = [await system('CanvasText'), await system('GrayText')];
    for (const f of [...spec.fixtures.map((fixture) => fixture.id), 'disabled-error']) {
      const disabled = f === 'disabled' || f === 'disabled-error';
      for (const text of await part(page, f, '.label, .asterisk, .supporting-text, .error-text').all()) expect(await css(text, 'color'), f).toBe(disabled ? grayText : canvasText);
      for (const tag of await part(page, f, '.requirement-tag').all()) {
        expect(Number.parseFloat(await css(tag.locator('.container'), 'border-top-width')), `${f}: the tag has an edge`).toBeGreaterThan(0);
        expect(await css(tag.locator('.container'), 'border-top-style'), f).toBe('solid');
      }
    }
    expect(await css(part(page, 'required-error', '.error-text'), 'color')).toBe(await css(part(page, 'error-selected', '.supporting-text'), 'color'));
    // The radio buttons show no error color there (RAD-27): each ring and fill is that of the same option out of error.
    const forced = async (id: string) => (await paints(page, id)).map((o) => [o.ring, o.fill, o.stroke]);
    expect(await forced('required-error')).toEqual(await forced('none-selected'));
    expect(await forced('error-selected')).toEqual(await forced('supporting'));
    expect((await paints(page, 'required-error')).every((o) => o.error), 'they are in their error form all the same').toBe(true);
    await expect(part(page, 'required-error', '.error-text')).toHaveText('Choose how the order reaches you.');
    expect((await group(page, 'required-error')).invalid).toBe(true);
  });

  test('RGP-15: in right-to-left the layout mirrors as a field group’s — the label row, the description, the options and the error text start at the right edge, the requirement mark stands at the left of the label, a horizontal row runs from right to left with the first option at the right, and a column keeps its order from top to bottom; each radio button mirrors itself', async ({ page }) => {
    await mountSpec(page, 'rtl', 'horizontal-rtl');
    const id = 'rtl';
    const h = await box(host(page, id));
    const right = h.x + h.width;
    const [label, tag, description] = [await box(part(page, id, '.label')), await box(part(page, id, '.required-tag')), await box(part(page, id, '.supporting-text'))];
    near(label.x + label.width, right, 'the label starts at the right edge');
    near(label.x - (tag.x + tag.width), await token(page, 'requirement-gap'), 'the mark is at the left of the label');
    near(description.x + description.width, right, 'the description starts at the right edge');
    expect(await css(part(page, id, '.supporting-text'), 'text-align')).toBe('right');
    const column = await Promise.all((await options(page, id).all()).map(box));
    for (const [i, o] of column.entries()) {
      near(o.x + o.width, right, `option ${i} starts at the right edge`);
      if (i) expect(o.y, 'the column keeps its order').toBeGreaterThan(column[i - 1].y);
    }
    // Each radio button mirrors itself: its ring at the right of its label.
    expect(await option(page, id, 0).evaluate((el) => el.shadowRoot!.querySelector('.ring')!.getBoundingClientRect().left > el.shadowRoot!.querySelector('.label')!.getBoundingClientRect().left)).toBe(true);
    // A row runs from the right.
    const row = await Promise.all((await options(page, 'horizontal-rtl').all()).map(box));
    const rowHost = await box(host(page, 'horizontal-rtl'));
    near(row[0].x + row[0].width, rowHost.x + rowHost.width, 'the first option is at the right');
    for (let i = 1; i < row.length; i++) near(row[i - 1].x - (row[i].x + row[i].width), await token(page, 'gap-inline'), 'gap-inline, leftwards');
    const error = await box(part(page, 'horizontal-rtl', '.error-text'));
    near(error.x + error.width, rowHost.x + rowHost.width, 'the error text starts at the right edge');
    // Left Arrow is the next one here (RGP-5).
    await option(page, 'horizontal-rtl', 0).evaluate((el) => el.focus());
    await page.keyboard.press('ArrowLeft');
    await settled(page, 'horizontal-rtl');
    expect([await value(page, 'horizontal-rtl'), await focused(page, 'horizontal-rtl')]).toEqual(['m', 1]);
  });

  test('RGP-16: the direction is the nearest ancestor’s, not the root’s and not a setting of the group’s own; when it changes while the group is shown it is drawn for the new direction at once, keeping its value, its selection and its focus, and the arrow keys follow the new direction at the next key', async ({ page }) => {
    await mount(page, [fx('a', { orientation: 'horizontal', value: 'express' }, [radio('standard', 'One'), radio('express', 'Two'), radio('pickup', 'Three')])]);
    expect(await host(page, 'a').evaluate((el) => Object.hasOwn(el.constructor.prototype, 'dir') || 'direction' in el)).toBe(false);
    const firstAt = async () => {
      const [h, first, last] = [await box(host(page, 'a')), await box(option(page, 'a', 0)), await box(option(page, 'a', 2))];
      return Math.abs(first.x - h.x) < 0.6 && last.x > first.x ? 'left' : Math.abs(first.x + first.width - (h.x + h.width)) < 0.6 && last.x < first.x ? 'right' : 'neither';
    };
    expect(await firstAt()).toBe('left');
    await option(page, 'a', 1).evaluate((el) => el.focus());
    await page.keyboard.press('ArrowRight');
    await settled(page, 'a');
    expect([await value(page, 'a'), await focused(page, 'a')]).toEqual(['pickup', 2]);
    // An ancestor inside the page becomes right-to-left; the root says nothing.
    await stage(page, 'a').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await firstAt()).toBe('right');
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    expect([await value(page, 'a'), await checked(page, 'a'), await focused(page, 'a')]).toEqual(['pickup', [false, false, true], 2]);
    expect(await css(part(page, 'a', '.controls'), 'transition-duration')).toBe('0s');
    await page.keyboard.press('ArrowRight');
    await settled(page, 'a');
    expect([await value(page, 'a'), await focused(page, 'a')], 'Right Arrow is now the previous').toEqual(['express', 1]);
    await page.keyboard.press('ArrowDown');
    await settled(page, 'a');
    expect([await value(page, 'a'), await focused(page, 'a')], 'Down Arrow is still the next').toEqual(['pickup', 2]);
    await stage(page, 'a').evaluate((el) => el.setAttribute('dir', 'ltr'));
    expect(await firstAt()).toBe('left');
    await page.keyboard.press('ArrowLeft');
    await settled(page, 'a');
    expect([await value(page, 'a'), await focused(page, 'a')]).toEqual(['express', 1]);
  });

  test('RGP-17: the label, the description, the error text and the tag’s text are each text of their own direction, isolated — a left-to-right text keeps its order in a right-to-left layout — and are still placed and aligned by the layout direction', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => f.id === 'ltr-label-rtl'), fx('error', { label: 'Wi-Fi 6E', requirement: 'required', error: true, errorText: 'Choose 1 band, at least.' }, THREE, { direction: 'rtl' })]);
    const id = 'ltr-label-rtl';
    for (const [fixture, selector] of [
      [id, '.label'],
      [id, '.supporting-text'],
      ['error', '.error-text'],
    ] as const) {
      expect(await css(part(page, fixture, selector), 'unicode-bidi'), selector).toBe('plaintext');
      expect(await css(part(page, fixture, selector), 'text-align'), selector).toBe('right');
      expect(await css(part(page, fixture, selector), 'direction'), selector).toBe('rtl');
    }
    const order = (fixture: string, selector: string, first: string, second: string) =>
      part(page, fixture, selector).evaluate(
        (el, [a, b]) => {
          const node = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.includes(a))!;
          const at = (word: string) => {
            const range = document.createRange();
            const start = node.textContent!.indexOf(word);
            range.setStart(node, start);
            range.setEnd(node, start + word.length);
            return range.getBoundingClientRect().left;
          };
          return at(a) < at(b);
        },
        [first, second],
      );
    expect(await order(id, '.label', 'Wi-Fi', '6E')).toBe(true);
    expect(await order(id, '.supporting-text', '2.4 GHz', '6 GHz')).toBe(true);
    expect(await order('error', '.error-text', 'Choose', 'least')).toBe(true);
    const [label, h] = [await box(part(page, id, '.label')), await box(host(page, id))];
    near(label.x + label.width, h.x + h.width, 'the label is placed at the right edge');
    expect(await part(page, 'error', '.required-tag').locator('.label').evaluate((el) => [getComputedStyle(el).unicodeBidi, el.getAttribute('dir')])).toEqual(['plaintext', 'auto']);
  });

  test('RGP-18: a requirement the group does not know behaves as none — for the form’s validation too; an unknown requiredMark or orientation renders with its default (auto, vertical); each is reported once in debug builds, by the field group, as it does (FGR-22)', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('requirement', { requirement: 'mandatory' }), fx('mark', { requirement: 'required', requiredMark: 'star' }), fx('orientation', { orientation: 'diagonal' }), fx('default', {})]);
    await expect(part(page, 'requirement', '.requirement-tag, .asterisk')).toHaveCount(0);
    expect(await group(page, 'requirement')).toMatchObject({ required: false, described: [] });
    await form(page, `<tanrei-radio-group id="g" label="Delivery" name="delivery" requirement="mandatory">${DELIVERY}</tanrei-radio-group>`);
    expect(await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.checkValidity()), 'an unknown requirement asks nothing').toBe(true);
    await expect(part(page, 'mark', '.required-tag')).toBeVisible();
    await expect(part(page, 'mark', '.asterisk')).toBeHidden();
    expect((await group(page, 'mark')).required).toBe(true);
    const ys = async (id: string) => Promise.all((await options(page, id).all()).map(async (o) => (await box(o)).y - (await box(host(page, id))).y));
    expect(await ys('orientation'), 'a column').toEqual(await ys('default'));
    // Reported once for each element, by the field group inside it; the radio group says nothing of its own.
    const reports = seen.filter((w) => w.includes('FGR-22') && w.includes('<tanrei-field-group>'));
    expect(seen.filter((w) => w.includes('<tanrei-radio-group>'))).toEqual([]);
    expect(reports.filter((w) => w.includes('requirement "mandatory"'))).toHaveLength(2);
    expect(reports.filter((w) => w.includes('requiredMark "star"'))).toHaveLength(1);
    expect(reports.filter((w) => w.includes('orientation "diagonal"'))).toHaveLength(1);
  });

  test('RGP-19: the radio group has no words of its own — requiredText and optionalText are the instance’s, else the product’s words, else nothing: without the required word the asterisk stands in the tag’s place and the required state is kept; without the optional word no tag is drawn and nothing joins the description; each is reported once, naming the prop, as the field group reads them (FGR-24)', async ({ page }) => {
    const seen = warnings(page);
    const bare = (id: string, props: Fixture['props']): Fixture => ({ id, props: { label: 'Delivery', ...props }, items: THREE });
    await mount(page, [
      bare('auto', { requirement: 'required' }),
      bare('tag', { requirement: 'required', requiredMark: 'tag' }),
      bare('none', { requirement: 'required', requiredMark: 'none' }),
      bare('optional', { requirement: 'optional', supportingText: 'Help.' }),
      bare('own', { requirement: 'required', requiredText: 'Needed' }),
      bare('own-optional', { requirement: 'optional', optionalText: 'If you like' }),
    ]);
    const drawn = async (id: string) => ({
      tag: (await part(page, id, '.requirement-tag').count()) > 0 && (await part(page, id, '.requirement-tag').isVisible()) ? await part(page, id, '.requirement-tag').getAttribute('label') : null,
      asterisk: (await part(page, id, '.asterisk').count()) > 0 && (await part(page, id, '.asterisk').isVisible()),
    });
    // No words set: the asterisk in the tag's place; the required state is kept, and nothing is said in words.
    expect(await drawn('auto')).toEqual({ tag: null, asterisk: true });
    expect(await drawn('tag')).toEqual({ tag: null, asterisk: true });
    expect(await drawn('none')).toEqual({ tag: null, asterisk: false });
    for (const id of ['auto', 'tag', 'none']) expect(await group(page, id), id).toMatchObject({ required: true, invalid: false, described: [] });
    // No optional word: no tag, and nothing added to the description.
    expect(await drawn('optional')).toEqual({ tag: null, asterisk: false });
    expect(await group(page, 'optional')).toMatchObject({ required: false, described: ['Help.'] });
    // An instance's own words, with no set of the product's.
    expect(await drawn('own')).toEqual({ tag: 'Needed', asterisk: false });
    expect((await group(page, 'own-optional')).described).toEqual(['If you like']);
    // Reported once per word and page, naming the prop.
    const reports = seen.filter((w) => w.includes('FGR-24'));
    expect(reports).toHaveLength(2);
    expect(reports.find((w) => w.includes('requiredText'))).toContain('required-text is empty');
    expect(reports.find((w) => w.includes('requiredText')), 'a radio group’s required state needs no word').toContain('the required state is kept');
    expect(reports.find((w) => w.includes('optionalText'))).toContain('optional-text is empty');
    expect(await missingWords(page)).toEqual(['optionalText', 'requiredText']);
    const said = await page.evaluate(() => [...document.querySelectorAll('tanrei-radio-group')].map((el) => el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!).map((frame) => `${frame.textContent} ${[...frame.querySelectorAll('tanrei-tag')].map((tag) => tag.getAttribute('label')).join(' ')}`).join(' '));
    expect(said).not.toMatch(/Required|Optional/);
    // The product's words, set once.
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional' });
    expect(await drawn('auto')).toEqual({ tag: 'Required', asterisk: false });
    expect(await drawn('tag')).toEqual({ tag: 'Required', asterisk: false });
    // The required state carries it: requiredText is never part of the description (RGP-10).
    expect(await group(page, 'auto')).toMatchObject({ required: true, described: [] });
    expect(await drawn('optional')).toEqual({ tag: 'Optional', asterisk: false });
    expect((await group(page, 'optional')).described).toEqual(['Help.', 'Optional']);
    expect(await missingWords(page)).toEqual([]);
    // An instance's own prop wins.
    expect(await drawn('own')).toEqual({ tag: 'Needed', asterisk: false });
    expect((await group(page, 'own-optional')).described).toEqual(['If you like']);
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

  test('no axe violations with a group that is disabled and in error, one inside a field group, and one in a form', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, [fx('disabled-error', { disabled: true, error: true, errorText: 'Choose one.', requirement: 'required', requiredMark: 'asterisk' }), fx('hidden', { labelHidden: true, requirement: 'optional' })], { theme });
      await form(page, `<tanrei-field-group label="Shipping" spacing="fields"><tanrei-text-field label="Street"></tanrei-text-field><tanrei-radio-group label="Delivery" name="delivery" requirement="required" supporting-text="Help.">${DELIVERY}</tanrei-radio-group></tanrei-field-group>`);
      const results = await new AxeBuilder({ page }).include('main').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('Chromium’s accessibility tree has one radio group per fixture and no other group — the field group’s own element, once — named by its label, with its description, its required and invalid states and its orientation, and its radios inside it, each with its name and its checked state; the host adds one node that says nothing', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    await mountSpec(page, 'default', 'label-hidden', 'optional', 'error-selected', 'disabled', 'horizontal');
    const whole = (id: string) => axTree(page, `[data-fixture="${id}"]`);
    const tree = async (id: string) => ofRoles(insideHost(await whole(id)), ['radiogroup', 'group', 'radio']).map((line) => line.replace(/ focusable=\w+/, ''));
    expect(await tree('default')).toEqual([
      'radiogroup "Delivery" invalid=false orientation=vertical required=false',
      '  radio "Standard, 3 to 5 days" checked=true invalid=false',
      '  radio "Express, next day" checked=false invalid=false',
      '  radio "Pick up in store" checked=false invalid=false',
    ]);
    expect((await tree('label-hidden'))[0]).toBe('radiogroup "Delivery" (You can change this until the order ships.) invalid=false orientation=vertical required=false');
    expect((await tree('optional'))[0]).toBe('radiogroup "Delivery" (Optional) invalid=false orientation=vertical required=false');
    expect((await tree('error-selected'))[0]).toBe('radiogroup "Delivery" (You can change this until the order ships. Express delivery does not reach this address. Choose another way.) invalid=true orientation=vertical required=true');
    expect((await tree('disabled'))[0]).toBe('radiogroup "Delivery" (You can change this until the order ships.) disabled=true invalid=false orientation=vertical required=true');
    expect((await tree('horizontal'))[0]).toBe('radiogroup "Size" invalid=false orientation=horizontal required=false');
    for (const id of ['default', 'label-hidden', 'optional', 'error-selected', 'disabled', 'horizontal']) {
      const lines = await tree(id);
      // One radio group, with every radio inside it, and no second group around it or in it.
      expect(lines.filter((line) => /^\s*(radiogroup|group) /.test(line)), id).toHaveLength(1);
      expect(lines.slice(1).every((line) => line.startsWith('  radio ')), id).toBe(true);
      expect(lines.length, id).toBe(4);
    }
    // The host: a form-associated element that is validated has a node of its own, which has no role and no name; a
    // disabled one, which is not validated, has none.
    expect((await whole('default'))[0]).toMatch(/^generic ""( invalid=false)?$/);
    expect((await whole('disabled'))[0]).toMatch(/^radiogroup /);
    // A state set later reaches the tree at once.
    await set(page, 'default', { error: true, errorText: 'Choose another.', requirement: 'required', value: 'pickup' });
    const later = await tree('default');
    expect(later[0]).toBe('radiogroup "Delivery" (Choose another.) invalid=true orientation=vertical required=true');
    expect(later.slice(1).map((line) => /checked=(\w+)/.exec(line)![1])).toEqual(['false', 'false', 'true']);
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the radio buttons, the selection, the label, the mark, the description and the error the spec gives it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    // Nineteen, and error-one-disabled.
    expect(spec.fixtures).toHaveLength(20);
    // Each names its twin among the field group's fixtures: compared by the shared test of composed elements.
    expect(spec.fixtures.map((f) => f.twin)).toEqual(spec.fixtures.map((f) => `field-group.radio-buttons-${f.id}`));
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      near((await box(host(page, f.id))).width, 320, f.id);
      await expect(options(page, f.id), f.id).toHaveCount(f.items!.length);
      for (const one of await options(page, f.id).all()) await expect(one, f.id).toBeVisible();
      expect(await checked(page, f.id), `${f.id} selection`).toEqual(f.items!.map((item) => !!f.props.value && item.props.value === f.props.value));
      expect(await value(page, f.id), f.id).toBe(String(f.props.value ?? ''));
      const labelled = !!f.props.label && !f.props.labelHidden;
      expect(await part(page, f.id, '.label').count(), `${f.id} label`).toBe(labelled ? 1 : 0);
      if (labelled) await expect(part(page, f.id, '.label'), f.id).toContainText(String(f.props.label));
      expect((await group(page, f.id)).name, f.id).toBe(String(f.props.label));
      const requirement = f.props.requirement ?? 'none';
      const tag = labelled && (requirement === 'optional' || (requirement === 'required' && (f.props.requiredMark ?? 'auto') !== 'asterisk'));
      expect(await part(page, f.id, '.requirement-tag').count(), `${f.id} tag`).toBe(tag ? 1 : 0);
      expect(await part(page, f.id, '.supporting-text').count(), `${f.id} description`).toBe(f.props.supportingText ? 1 : 0);
      if (f.props.supportingText) await expect(part(page, f.id, '.supporting-text'), f.id).toHaveText(String(f.props.supportingText));
      expect(await part(page, f.id, '.error-text').count(), `${f.id} error`).toBe(f.props.error && f.props.errorText ? 1 : 0);
      if (f.props.error && f.props.errorText) await expect(part(page, f.id, '.error-text'), f.id).toHaveText(String(f.props.errorText));
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
