// <tanrei-field>, driven by specs/field.spec.json: every behaviour id (FLD-1…31) is cited by a test title, every fixture
// has a baseline, and every length and color is read back from the tokens — never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo, rootTokens, mountFixtureAsInAll } from '../../../test/harness.js';

const spec = loadSpec('field');
const textField = loadSpec('text-field');
type P = Page;
const TAG = 'tanrei-field';
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
/** A part of the field's own shadow root (the frame's direct rows; a control has parts of its own). */
/** The label row: the frame's own child, or — beside a value text — a child of the line the two share (FLD-29). */
const ROW = ':is(.frame, .frame > .label-line) > .label-row';
const OWN: Record<string, string> = {
  '.label-row': ROW,
  '.label': `${ROW} > .label`,
  '.label-icon': `${ROW} > .label-icon`,
  '.asterisk': `${ROW} > .label > .asterisk`,
  // The tag stands in a box one label line high, which is what the row lays out (FLD-5).
  '.requirement-box': `${ROW} > .requirement-box`,
  '.requirement-tag': `${ROW} > .requirement-box > .requirement-tag`,
  '.required-tag': `${ROW} > .requirement-box > .required-tag`,
  '.optional-tag': `${ROW} > .requirement-box > .optional-tag`,
  '.label-line': '.frame > .label-line',
  '.value-text': '.frame > .label-line > .value-text',
  '.supporting': '.frame > .supporting',
  // The help and the error text are one column beside the count (FLD-7, FLD-31).
  '.texts': '.frame > .supporting > .texts',
  '.supporting-text': '.frame > .supporting > .texts > .supporting-text',
  '.error-text': '.frame > .supporting > .texts > .error-text',
  '.counter': '.frame > .supporting > .counter',
};
/** A Tag has a `.label` of its own in its shadow root, so each part is named with its parents in the field's. */
const part = (page: P, id: string, selector: string) =>
  host(page, id).locator(
    selector
      .split(',')
      .map((one) => OWN[one.trim()] ?? one.trim())
      .join(', '),
  );
const frame = (page: P, id: string) => host(page, id).locator('.frame');
const control = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG} > :not([slot])`).first();
const T = (name: string) => `--tanrei-comp-field-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const color = (page: P, name: string) => resolveColor(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
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
/**
 * FLD-7: the design system's error text placement, set for the page — `append` keeps the help and draws the error text
 * below it; `replace`, the default, puts the error text in the help's place — and every field drawn again, Fields
 * inside composed fields too, as a switch of the system draws them: a field reads the choice at each render.
 */
const placement = async (page: P, value: 'replace' | 'append') => {
  await override(page, { [T('error-text-placement')]: value });
  await page.evaluate(async () => {
    const fields: (HTMLElement & { requestUpdate(): void; updateComplete: Promise<unknown> })[] = [];
    const walk = (root: Document | ShadowRoot) => {
      for (const element of root.querySelectorAll('*')) {
        if (element.localName === 'tanrei-field') fields.push(element as (typeof fields)[number]);
        if (element.shadowRoot) walk(element.shadowRoot);
      }
    };
    walk(document);
    for (const field of fields) field.requestUpdate();
    await Promise.all(fields.map((field) => field.updateComplete));
  });
};
/** A press of the pointer at the centre of `target`, whatever is drawn over it (a slider's handle lies under its rail's hit area). */
const press = async (target: Locator) => {
  const b = (await target.boundingBox())!;
  await target.page().mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};
const slider = (props: FixtureItem['props'] = { value: 40 }): FixtureItem => ({ kind: 'slider', props });
const toggle = (props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'switch', props });
const checkbox = (props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'checkbox', props });
const textInput = (props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'text-input', props });
/** A fixture of the test's own: props, then its control — an item of the spec's kinds, or markup of the product's. */
/** The words of this file's own fixtures: a test is the product there and gives them itself (FLD-24). */
const WORDS = { requiredText: 'Required', optionalText: 'Optional' };
const fx = (id: string, props: Fixture['props'], inside: FixtureItem | string = slider(), extra: Partial<Fixture> = {}): Fixture => ({
  id,
  props: { ...WORDS, ...props },
  ...(typeof inside === 'string' ? { content: inside } : { items: [inside] }),
  ...extra,
});
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const mountSpec = (page: P, ...ids: string[]) => mount(page, ids.length ? spec.fixtures.filter((f) => ids.includes(f.id)) : spec.fixtures);
/**
 * The spec's fixtures in parts: by the kind of their control, and a kind with many of them in equal parts of at most
 * `PART`. A test that reads every fixture is one test per part, each within a test's default time, and never one test
 * with a longer time of its own: what a locator costs grows with the document it is resolved in (in a document of all
 * 357 fields about 29 ms in Firefox, 11 ms in Chromium and 8 ms in WebKit; 5–11 ms in a document of one part), so one
 * test over all of them took 50 s in Chromium and more than 120 s in Firefox, and grew with every new twin.
 * `the parts hold every fixture of the spec once` holds the sum.
 */
const PART = 40;
const PARTS: { name: string; fixtures: Fixture[] }[] = [...new Set(spec.fixtures.map((f) => f.items![0].kind))].flatMap((kind) => {
  const all = spec.fixtures.filter((f) => f.items![0].kind === kind);
  const count = Math.ceil(all.length / PART);
  const size = Math.ceil(all.length / count);
  return Array.from({ length: count }, (_, i) => ({ name: count === 1 ? kind : `${kind}, part ${i + 1} of ${count}`, fixtures: all.slice(i * size, (i + 1) * size) }));
});
const set = async (page: P, id: string, props: Record<string, unknown>) => {
  await host(page, id).evaluate(async (el, p) => {
    Object.assign(el, p);
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    for (const child of el.children) await (child as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
  }, props);
};

/**
 * What the control exposes, read from the element that carries its semantics: the native element or role holder in a
 * Tanrei control's shadow root, or the product's own element.
 */
const semantics = (page: P, id: string, nth = 0) =>
  host(page, id).evaluate(
    (el, n) => {
      const framed = [...el.children].filter((child) => !child.slot)[n] as HTMLElement & { disabled?: boolean };
      const inner = framed.shadowRoot?.querySelector<HTMLElement>('[role="slider"]:not([data-handle="start"] *), input, textarea') ?? framed;
      const native = inner as HTMLInputElement;
      return {
        name: inner.getAttribute('aria-label'),
        description: inner.getAttribute('aria-description'),
        invalid: inner.getAttribute('aria-invalid') === 'true',
        required: inner.getAttribute('aria-required') === 'true' || native.required === true,
        disabled: inner.getAttribute('aria-disabled') === 'true' || native.disabled === true,
        focusable: inner.tabIndex >= 0 && !(native.disabled === true),
      };
    },
    nth,
  );
const announced = (page: P, id: string) => host(page, id).evaluate((el) => el.shadowRoot!.querySelector('.announcer')!.textContent ?? '');
const activeInside = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    for (let at: Node | null = active; at; at = at.parentNode ?? (at as ShadowRoot).host ?? null) if (at === el) return true;
    return false;
  });
/** One Chromium accessibility node by role, over the DevTools protocol: the name and the description the browser computed. */
async function axNode(page: P, role: string, index = 0) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const found = nodes.filter((node) => !node.ignored && node.role?.value === role)[index];
  if (!found) return null;
  const property = (name: string) => found.properties?.find((p) => p.name === name)?.value.value;
  return { name: found.name?.value as string, description: (found.description?.value ?? '') as string, invalid: property('invalid'), required: property('required'), disabled: property('disabled') };
}

test.describe('behavior', () => {
  test('FLD-1: the label row, the control label.gap below it and the supporting row supporting-text.gap below the control, from the start edge; as wide as its layout and as tall as its rows and its control; no container, edge, fill, elevation or padding, and nothing of the control changed — the frame of the text field’s stacked-supporting, to the pixel', async ({ page }) => {
    await mountFixtures(page, textField, { icons: true, fixtures: textField.fixtures.filter((f) => f.id === 'stacked-supporting') });
    const field = page.locator('[data-fixture="stacked-supporting"] > tanrei-text-field');
    const reference = {
      width: (await box(field)).width,
      label: await box(field.locator('.label-row')),
      container: await box(field.locator('.container')),
      supporting: await box(field.locator('.supporting-text')),
      labelFont: await css(field.locator('.label-row .label'), 'font'),
      supportingFont: await css(field.locator('.supporting-text'), 'font'),
      x: (await box(field)).x,
    };
    await mount(page, [...spec.fixtures.filter((f) => ['slider-supporting', 'switch', 'slider'].includes(f.id)), fx('bare-slider', {}, '<tanrei-slider label="Volume" value="40"></tanrei-slider>')]);
    const [labelGap, supportingGap] = [await token(page, 'label-gap'), await token(page, 'supporting-text-gap')];
    const h = await box(host(page, 'slider-supporting'));
    const label = await box(part(page, 'slider-supporting', '.label-row'));
    const framed = await box(control(page, 'slider-supporting'));
    const supporting = await box(part(page, 'slider-supporting', '.supporting-text'));
    // The rows, from the top and from the start edge, with the two gaps.
    near(label.y, h.y, 'the label row is at the top');
    near(label.x, h.x, 'the label starts at the start edge');
    near(framed.y - (label.y + label.height), labelGap, 'label.gap');
    near(supporting.y - (framed.y + framed.height), supportingGap, 'supporting-text.gap');
    near(supporting.x, h.x, 'the supporting row starts at the start edge');
    near(h.height, label.height + labelGap + framed.height + supportingGap + supporting.height, 'as tall as its rows and its control');
    // The text field's frame at one width: the same label line, gaps and supporting line.
    near(h.width, reference.width, 'drawn at the text field’s width');
    near(label.height, reference.label.height, 'the label row’s height');
    near(supporting.height, reference.supporting.height, 'the supporting line’s height');
    near(reference.container.y - (reference.label.y + reference.label.height), labelGap, 'the text field’s label gap is the same token’s value');
    near(reference.supporting.y - (reference.container.y + reference.container.height), supportingGap, 'the text field’s supporting gap');
    near(label.x - h.x, reference.label.x - reference.x, 'the label’s start');
    expect(await css(part(page, 'slider-supporting', '.label'), 'font')).toBe(reference.labelFont);
    expect(await css(part(page, 'slider-supporting', '.supporting-text'), 'font')).toBe(reference.supportingFont);
    // A control that fills the width it is given fills it; one with a size of its own keeps it, at the start edge.
    near(framed.width, h.width, 'the slider fills the field');
    const own = await box(control(page, 'switch'));
    const switchHost = await box(host(page, 'switch'));
    expect(own.width, 'the switch keeps its own width').toBeLessThan(switchHost.width / 2);
    near(own.x, switchHost.x, 'the switch stands at the start edge');
    near((await box(part(page, 'switch', '.supporting-text'))).y - (own.y + own.height), supportingGap, 'the gap below a control with a size of its own');
    // Nothing of the control changes: a slider is as tall and as wide in a field as outside one.
    const [inField, bare] = [await box(control(page, 'slider')), await box(control(page, 'bare-slider'))];
    near(inField.height, bare.height, 'the control’s height');
    near(inField.width, bare.width, 'the control’s width');
    // No container, edge, fill, elevation or padding.
    for (const target of [host(page, 'slider-supporting'), frame(page, 'slider-supporting')]) {
      expect(await css(target, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      expect(await css(target, 'border-top-width')).toBe('0px');
      expect(await css(target, 'padding-top')).toBe('0px');
      expect(await css(target, 'padding-left')).toBe('0px');
      expect(await css(target, 'box-shadow')).toBe('none');
    }
    expect(await css(host(page, 'slider-supporting'), 'display')).toBe('block');
  });

  test('FLD-2: the label above its control in label.typescale and the label color, kept in place, wrapped onto as many lines as it needs and never cut; labelHidden or an empty label draws no row, no gap, no glyph and no mark', async ({ page }) => {
    await mount(page, [
      fx('plain', { label: 'Volume' }),
      fx('narrow', { label: 'A label of several words' }),
      fx('hidden', { label: 'Volume', labelHidden: true, required: true }, slider(), { slots: { 'label-icon': 'volume_up' } }),
      fx('empty', { required: true }, '<tanrei-slider label="Volume" value="40"></tanrei-slider>'),
    ]);
    const label = part(page, 'plain', '.label');
    expect(await css(label, 'color')).toBe(await color(page, 'standard-label-color'));
    near(Number.parseFloat(await css(label, 'font-size')), await token(page, 'label-typescale-font-size'), 'the label’s size');
    expect(await css(label, 'text-overflow')).not.toBe('ellipsis');
    // In a field 96 wide a label that needs two lines draws both, above the control, which starts label.gap below the second.
    const line = (await box(label)).height;
    await host(page, 'narrow').evaluate((el) => (el.style.inlineSize = '96px'));
    await frames(page);
    const wrapped = await box(part(page, 'narrow', '.label'));
    expect(wrapped.height, 'two lines or more').toBeGreaterThanOrEqual(2 * line - 0.6);
    expect(await part(page, 'narrow', '.label').evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1), 'nothing is cut').toBe(true);
    near((await box(control(page, 'narrow'))).y - (wrapped.y + wrapped.height), await token(page, 'label-gap'), 'the control starts label.gap below the last line');
    // No label row: the control is at the field's top, with no glyph and no mark.
    for (const id of ['hidden', 'empty']) {
      await expect(part(page, id, '.label-row'), id).toHaveCount(0);
      await expect(part(page, id, '.requirement-tag, .asterisk, .label-icon'), id).toHaveCount(0);
      near((await box(control(page, id))).y, (await box(host(page, id))).y, `${id}: the control is at the top`);
    }
  });

  test('FLD-3: a glyph in the label-icon slot is drawn before the label, label-icon.gap from it, at label-icon.size, centred on the label’s first line, in the icon set’s unselected family and the label-icon color, hidden from assistive technology; not drawn, and reported, while the label is not drawn', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...spec.fixtures.filter((f) => f.id === 'slider-label-icon' || f.id === 'slider-error'), fx('hidden', { label: 'Volume', labelHidden: true }, slider(), { slots: { 'label-icon': 'volume_up' } })]);
    const glyph = part(page, 'slider-label-icon', '.label-icon');
    const [g, l] = [await box(glyph), await box(part(page, 'slider-label-icon', '.label'))];
    const size = await token(page, 'label-icon-size');
    near(g.width, size, 'label-icon.size');
    near(g.height, size, 'label-icon.size');
    near(g.x, (await box(host(page, 'slider-label-icon'))).x, 'before the label, at the start');
    near(l.x - (g.x + g.width), await token(page, 'label-icon-gap'), 'label-icon.gap');
    near(g.y + g.height / 2, l.y + l.height / 2, 'centred on the label’s line');
    expect(await css(glyph, 'color')).toBe(await color(page, 'standard-label-icon-color'));
    expect(await glyph.getAttribute('aria-hidden')).toBe('true');
    const family = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-icon-family-unselected').trim().replaceAll('"', ''));
    expect((await css(glyph, 'font-family')).replaceAll('"', '')).toContain(family);
    // With an empty slot the row keeps no room for a glyph.
    await expect(part(page, 'slider-error', '.label-icon')).toBeHidden();
    near((await box(part(page, 'slider-error', '.label'))).x, (await box(host(page, 'slider-error'))).x, 'no room kept');
    // Not drawn while the label is not, and reported.
    await expect(host(page, 'hidden').locator('[slot="label-icon"]')).toBeHidden();
    expect(seen.filter((w) => w.includes('FLD-3'))).toHaveLength(1);
  });

  test('FLD-4: requirement none says and draws nothing; required exposes the control as required and draws the required mark; optional draws the optional tag and adds optionalText to the description; it never validates, and a disabled field keeps its mark — the asterisk from the disabled tokens, the tag drawn as a tag inside something disabled', async ({ page }) => {
    await mount(page, [
      fx('none', { label: 'Notifications' }, toggle()),
      fx('required', { label: 'Notifications', required: true }, toggle()),
      fx('optional', { label: 'Notifications', required: false, optional: true }, toggle()),
      fx('disabled', { label: 'Notifications', required: true, disabled: true }, toggle()),
      fx('disabled-asterisk', { label: 'Notifications', required: true, requiredMark: 'asterisk', disabled: true }, toggle()),
      fx('empty-value', { label: 'Name', required: true }, '<input />'),
    ]);
    expect(await semantics(page, 'none')).toMatchObject({ required: false, invalid: false, description: null });
    await expect(part(page, 'none', '.requirement-tag, .asterisk')).toHaveCount(0);
    expect(await semantics(page, 'required')).toMatchObject({ required: true, invalid: false, description: null });
    await expect(part(page, 'required', '.required-tag')).toBeVisible();
    expect(await semantics(page, 'optional')).toMatchObject({ required: false, invalid: false, description: 'Optional' });
    await expect(part(page, 'optional', '.optional-tag')).toBeVisible();
    // It never validates: a required control with no value is not invalid, no error text is shown, and `error` stays false.
    expect(await semantics(page, 'empty-value')).toMatchObject({ required: true, invalid: false });
    await expect(part(page, 'empty-value', '.supporting-text, .error-text')).toHaveCount(0);
    expect(await host(page, 'empty-value').evaluate((el: HTMLElement & { error: boolean }) => el.error)).toBe(false);
    // Disabled: the mark stays — the tag drawn as a tag inside something disabled, from the Tag's own disabled tokens
    // (TAG-21), so that it fades with the label …
    const tag = part(page, 'disabled', '.required-tag').locator('.container');
    await expect(tag).toBeVisible();
    expect(await part(page, 'disabled', '.required-tag').evaluate((el) => el.hasAttribute('disabled'))).toBe(true);
    expect(await part(page, 'required', '.required-tag').evaluate((el) => el.hasAttribute('disabled'))).toBe(false);
    expect(await css(tag, 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-tag-filled-disabled-container-color'));
    expect(await css(tag, 'color')).toBe(await resolveColor(page, '--tanrei-comp-tag-filled-disabled-label-color'));
    // … and the asterisk, which is the field's own, from the disabled tokens.
    expect(await css(part(page, 'disabled-asterisk', '.asterisk'), 'color')).toBe(await color(page, 'standard-disabled-required-asterisk-color'));
  });

  test('FLD-5: the requirement tag is the Tag component at its small size — filled for required, tonal for optional — after the label’s text, requirement.gap from it and centred on its line, drawn as every small tag is, from the Tag’s own tokens: the field has no token for it and sets none, so what restyles small tags restyles it, and it is the same at rest, focused and in error, and drawn as a tag inside something disabled while the field is disabled; it is text, never a control, never makes the row taller, moves whole to a line of its own when the label wraps, is not drawn with an empty text, and is kept from assistive technology', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['slider', 'slider-required', 'slider-optional', 'long-label', 'slider-required-error', 'slider-required-disabled'].includes(f.id)),
      fx('optional-error', { label: 'Volume', required: false, optional: true, error: true, errorText: 'Too loud.' }),
      fx('optional-disabled', { label: 'Volume', required: false, optional: true, disabled: true }),
      fx('no-required-text', { label: 'Volume', required: true, requiredText: '' }),
      fx('no-optional-text', { label: 'Volume', required: false, optional: true, optionalText: '' }),
      // The tag's own fixtures, to lay the two over each other.
      fx('tags', {}, '<tanrei-tag id="small-filled" size="small" variant="filled" label="Required"></tanrei-tag><tanrei-tag id="small-tonal" size="small" variant="tonal" label="Optional"></tanrei-tag><tanrei-tag id="small-filled-disabled" size="small" variant="filled" label="Required" disabled></tanrei-tag><tanrei-tag id="small-tonal-disabled" size="small" variant="tonal" label="Optional" disabled></tanrei-tag>'),
    ]);
    for (const [id, kind, variant, text] of [
      ['slider-required', 'required', 'filled', 'Required'],
      ['slider-optional', 'optional', 'tonal', 'Optional'],
    ] as const) {
      const tag = part(page, id, `.${kind}-tag`);
      const container = tag.locator('.container');
      expect(await tag.evaluate((el) => [el.localName, el.getAttribute('size'), el.getAttribute('variant'), (el as HTMLElement & { label: string }).label])).toEqual(['tanrei-tag', 'small', variant, text]);
      // The Tag's own tokens: the field has none for it.
      expect(await css(container, 'background-color'), `${id} fill`).toBe(await resolveColor(page, `--tanrei-comp-tag-${variant}-container-color`));
      expect(await css(container, 'color'), `${id} label`).toBe(await resolveColor(page, `--tanrei-comp-tag-${variant}-label-color`));
      near(Number.parseFloat(await css(container, 'padding-left')), await resolveToken(page, '--tanrei-comp-tag-container-padding-inline-small'), `${id} padding-inline`);
      near(Number.parseFloat(await css(container, 'font-size')), await resolveToken(page, '--tanrei-comp-tag-label-typescale-small-font-size'), `${id} text size`);
      near((await box(container)).height, await resolveToken(page, '--tanrei-comp-tag-container-height-small'), `${id} height`);
      expect(await css(container, 'white-space')).toBe('nowrap');
      // Nothing of the tag is set on its element: no token of the Tag's and no size, inline or from the field's sheet.
      expect(await tag.evaluate((el) => [el.getAttribute('style'), getComputedStyle(el).marginBlockStart, getComputedStyle(el).marginBlockEnd]), `${id}: nothing set on the tag`).toEqual([null, '0px', '0px']);
      expect(
        await host(page, id).evaluate((el) => [...el.shadowRoot!.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).filter((text) => text.includes('--tanrei-comp-tag-') || /chip/.test(text))),
        `${id}: the field’s styles name no token of the Tag and none of a chip`,
      ).toEqual([]);
      // After the label's text, requirement.gap from it, centred on the label's line.
      const [t, l] = [await box(tag), await box(part(page, id, '.label'))];
      near(t.x - (l.x + l.width), await token(page, 'requirement-gap'), `${id} requirement.gap`);
      near(t.y + t.height / 2, l.y + l.height / 2, `${id} centred on the label’s line`);
      // Never more than half its height: the full step draws round caps.
      expect(Number.parseFloat(await css(container, 'border-top-left-radius')), `${id} corners`).toBeGreaterThanOrEqual(t.height / 2 - 0.6);
      // The label's row is as tall with the tag as without it.
      near((await box(part(page, id, '.label-row'))).height, (await box(part(page, 'slider', '.label-row'))).height, `${id}: the row is no taller`);
      // Text, never a control: no focus, no role, hidden from assistive technology.
      expect(await tag.getAttribute('aria-hidden')).toBe('true');
      expect(await tag.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
      // The tag's own fixture of the same size, look and label: the same box, text style, fill and corners.
      const own = page.locator(`#small-${variant}`);
      const [a, b] = [await box(tag), await box(own)];
      near(a.width, b.width, `${id}: as wide as the tag’s own fixture`, 0.1);
      near(a.height, b.height, `${id}: as tall as the tag’s own fixture`, 0.1);
      for (const property of ['font', 'letter-spacing', 'padding', 'background-color', 'color', 'border-radius', 'box-shadow']) {
        expect(await css(container, property), `${id} ${property}`).toBe(await css(own.locator('.container'), property));
      }
    }
    // The same at rest, focused and in error: a tag has no states. Disabled, the tag fixtures drawn inside something
    // disabled (TAG-21).
    const look = (locator: Locator) => locator.locator('.container').evaluate((el) => ['background-color', 'color', 'font', 'padding', 'border-radius', 'box-shadow', 'opacity'].map((property) => getComputedStyle(el).getPropertyValue(property)).join('|'));
    const [filled, tonal] = [await look(page.locator('#small-filled')), await look(page.locator('#small-tonal'))];
    for (const id of ['slider-required', 'slider-required-error']) expect(await look(part(page, id, '.required-tag')), id).toBe(filled);
    for (const id of ['slider-optional', 'optional-error']) expect(await look(part(page, id, '.optional-tag')), id).toBe(tonal);
    expect(await look(part(page, 'slider-required-disabled', '.required-tag')), 'slider-required-disabled').toBe(await look(page.locator('#small-filled-disabled')));
    expect(await look(part(page, 'optional-disabled', '.optional-tag')), 'optional-disabled').toBe(await look(page.locator('#small-tonal-disabled')));
    expect(filled, 'disabled is a look of its own').not.toBe(await look(page.locator('#small-filled-disabled')));
    await tabTo(page, control(page, 'slider-required'));
    await frames(page);
    expect(await look(part(page, 'slider-required', '.required-tag')), 'focused').toBe(filled);
    expect(await css(part(page, 'slider-required', '.required-tag').locator('.container'), 'transition-property'), 'the tag changes no color, so nothing eases').not.toContain('background-color');
    await page.locator('body').click({ position: { x: 700, y: 5 } });
    // What restyles small tags for the page restyles the requirement tags with them — and nothing restyles them alone.
    await override(page, { '--tanrei-comp-tag-tonal-container-color': 'rgb(1, 2, 3)', '--tanrei-comp-tag-filled-container-color': 'rgb(4, 5, 6)', '--tanrei-comp-tag-filled-disabled-container-color': 'rgb(7, 8, 9)', '--tanrei-comp-tag-container-shape': '2px', '--tanrei-comp-tag-container-shape-pill': '0' });
    for (const [mine, own, fill] of [
      [part(page, 'slider-optional', '.optional-tag'), page.locator('#small-tonal'), 'rgb(1, 2, 3)'],
      [part(page, 'slider-required', '.required-tag'), page.locator('#small-filled'), 'rgb(4, 5, 6)'],
      [part(page, 'slider-required-disabled', '.required-tag'), page.locator('#small-filled-disabled'), 'rgb(7, 8, 9)'],
    ] as const) {
      expect(await css(mine.locator('.container'), 'background-color')).toBe(fill);
      expect(await css(own.locator('.container'), 'background-color')).toBe(fill);
      expect(await css(mine.locator('.container'), 'border-top-left-radius')).toBe(await css(own.locator('.container'), 'border-top-left-radius'));
    }
    expect(Number.parseFloat(await css(page.locator('#small-tonal .container'), 'border-top-left-radius')), 'the page’s shape reached the tags').toBeLessThanOrEqual(2.5);
    await rootTokens(page, { '--tanrei-comp-tag-tonal-container-color': '', '--tanrei-comp-tag-filled-container-color': '', '--tanrei-comp-tag-filled-disabled-container-color': '', '--tanrei-comp-tag-container-shape': '', '--tanrei-comp-tag-container-shape-pill': '' });
    // A tag taller than the label's line reaches equally above and below it, and the row is no taller.
    await override(page, { '--tanrei-comp-tag-container-height-small': '40px' });
    await frames(page);
    {
      const [t, l, row] = [await box(part(page, 'slider-required', '.required-tag')), await box(part(page, 'slider-required', '.label')), await box(part(page, 'slider-required', '.label-row'))];
      expect(t.height, 'the tag is taller than the label’s line').toBeGreaterThan(l.height + 4);
      near(t.y + t.height / 2, l.y + l.height / 2, 'still centred on the label’s line');
      near(row.height, (await box(part(page, 'slider', '.label-row'))).height, 'the row is no taller');
    }
    await rootTokens(page, { '--tanrei-comp-tag-container-height-small': '' });
    await frames(page);
    // The label and the tag do not fit on one line: the label wraps and the tag stands, whole, after its last line.
    const [label, tag] = [await box(part(page, 'long-label', '.label')), await box(part(page, 'long-label', '.required-tag'))];
    expect(tag.y + tag.height / 2, 'the tag is below the label’s last line').toBeGreaterThan(label.y + label.height - 1);
    near(tag.x, (await box(host(page, 'long-label'))).x, 'on a line of its own, from the start edge');
    expect(await part(page, 'long-label', '.required-tag').locator('.label').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'the tag is not cut').toBe(true);
    // An empty text draws no tag of that kind, and is reported (once for each word, by the words' own report: FLD-24).
    await expect(part(page, 'no-required-text', '.requirement-tag')).toHaveCount(0);
    await expect(part(page, 'no-optional-text', '.requirement-tag')).toHaveCount(0);
    expect(seen.filter((w) => w.includes('FLD-24'))).toHaveLength(2);
  });

  test('FLD-6: a required field draws the mark requiredMark names — the tag, the asterisk after the label’s text in its style and the asterisk color, hidden from assistive technology, or nothing — and under auto the one comp.field.requirement.mark names, which follows sys.behavior.requirement-mark unless it is set apart; requiredMark wins over both; every mark, and no drawn label, still exposes the required state', async ({ page }) => {
    const marks = ['auto', 'tag', 'asterisk', 'none'] as const;
    await mount(page, [...marks.map((mark) => fx(mark, { label: 'Volume', required: true, requiredMark: mark })), fx('hidden', { label: 'Volume', labelHidden: true, required: true }), fx('optional', { label: 'Volume', required: false, optional: true, requiredMark: 'asterisk' })]);
    const drawn = async (id: string) => ({
      tag: (await part(page, id, '.required-tag').count()) > 0 && (await part(page, id, '.required-tag').isVisible()),
      asterisk: (await part(page, id, '.asterisk').count()) > 0 && (await part(page, id, '.asterisk').isVisible()),
    });
    // Under the default system the mark is the tag.
    expect(await drawn('auto')).toEqual({ tag: true, asterisk: false });
    expect(await drawn('tag')).toEqual({ tag: true, asterisk: false });
    expect(await drawn('asterisk')).toEqual({ tag: false, asterisk: true });
    expect(await drawn('none')).toEqual({ tag: false, asterisk: false });
    // The asterisk: "*", after the label's text, asterisk-gap from it, in the label's style and the asterisk color.
    const asterisk = part(page, 'asterisk', '.asterisk');
    await expect(asterisk).toHaveText('*');
    expect(await asterisk.getAttribute('aria-hidden')).toBe('true');
    expect(await css(asterisk, 'color')).toBe(await color(page, 'standard-required-asterisk-color'));
    expect(await css(asterisk, 'font-size')).toBe(await css(part(page, 'asterisk', '.label'), 'font-size'));
    near(Number.parseFloat(await css(asterisk, 'margin-inline-start')), await token(page, 'requirement-asterisk-gap'), 'asterisk-gap');
    // The system's answer, for a field that does not say: asterisk, then none. A field that says keeps its own.
    for (const [system, auto] of [
      ['asterisk', { tag: false, asterisk: true }],
      ['none', { tag: false, asterisk: false }],
      ['tag', { tag: true, asterisk: false }],
    ] as const) {
      await override(page, { [T('requirement-mark')]: system });
      for (const mark of marks) await set(page, mark, { requiredMark: mark === 'auto' ? '' : mark });
      for (const mark of marks) await set(page, mark, { requiredMark: mark });
      expect(await drawn('auto'), `auto under ${system}`).toEqual(auto);
      expect(await drawn('tag'), `tag under ${system}`).toEqual({ tag: true, asterisk: false });
      expect(await drawn('asterisk'), `asterisk under ${system}`).toEqual({ tag: false, asterisk: true });
      expect(await drawn('none'), `none under ${system}`).toEqual({ tag: false, asterisk: false });
      // The optional tag is not a required mark: it is drawn whatever the system's answer.
      await expect(part(page, 'optional', '.optional-tag')).toBeVisible();
    }
    // The component's token follows the system's one choice: set for the page, a field under auto follows it …
    const SYSTEM = '--tanrei-sys-behavior-requirement-mark';
    await rootTokens(page, { [T('requirement-mark')]: '' });
    expect(await css(page.locator('html'), SYSTEM), 'the default system marks with the tag').toBe('tag');
    const again = async () => {
      for (const mark of marks) await set(page, mark, { requiredMark: mark === 'auto' ? '' : mark });
      for (const mark of marks) await set(page, mark, { requiredMark: mark });
    };
    for (const [system, auto] of [
      ['asterisk', { tag: false, asterisk: true }],
      ['none', { tag: false, asterisk: false }],
    ] as const) {
      await override(page, { [SYSTEM]: system });
      await again();
      expect(await drawn('auto'), `auto under the system’s ${system}`).toEqual(auto);
      // … the prop wins over it …
      expect(await drawn('tag'), `tag under the system’s ${system}`).toEqual({ tag: true, asterisk: false });
      expect(await drawn('asterisk'), `asterisk under the system’s ${system}`).toEqual({ tag: false, asterisk: true });
      expect(await drawn('none'), `none under the system’s ${system}`).toEqual({ tag: false, asterisk: false });
    }
    // … and the component's token, set against the system's choice, wins over the system's; the prop over both.
    await override(page, { [SYSTEM]: 'none', [T('requirement-mark')]: 'asterisk' });
    await again();
    expect(await drawn('auto'), 'the field’s token against the system’s').toEqual({ tag: false, asterisk: true });
    expect(await drawn('tag'), 'the prop over both').toEqual({ tag: true, asterisk: false });
    await rootTokens(page, { [SYSTEM]: '', [T('requirement-mark')]: '' });
    await again();
    // Whichever mark is drawn, and where none is, the required state is exposed — in words, for a slider, whose role
    // has no required state.
    for (const id of [...marks, 'hidden']) expect((await semantics(page, id)).description, id).toBe('Required');
  });

  test('FLD-7: the supporting row holds the help — in supporting-text.typescale and its color — and the error text: under the default system (error-text.placement replace) the error text stands in the help’s place and the help comes back where it was when it goes; under append the help keeps its place and its words and the error text is added below it; each wraps and is never cut; with no text there is no row, no gap and no room', async ({ page }) => {
    await mountSpec(page, 'slider', 'slider-supporting', 'slider-error', 'slider-error-without-text', 'long-label');
    // The default system: the error text in the help's place — the row's first line, where the help stands out of error.
    expect(await page.evaluate((name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(), T('error-text-placement'))).toBe('replace');
    await expect(part(page, 'slider-error', '.supporting-text')).toHaveCount(0);
    await expect(part(page, 'slider-error', '.error-text')).toHaveText('Choose a level above 0.');
    {
      const [wrong, help] = [await box(part(page, 'slider-error', '.error-text')), await box(part(page, 'slider-supporting', '.supporting-text'))];
      near(wrong.y - (await box(host(page, 'slider-error'))).y, help.y - (await box(host(page, 'slider-supporting'))).y, 'in the help’s place');
      near((await box(host(page, 'slider-error'))).height, (await box(host(page, 'slider-supporting'))).height, 'no taller in error than at rest');
    }
    // Without words the help stays, in its resting place and color.
    await expect(part(page, 'slider-error-without-text', '.supporting-text')).toHaveText('Applies to alerts and media.');
    {
      await set(page, 'slider-supporting', { error: true, errorText: 'Too quiet.' });
      await expect(part(page, 'slider-supporting', '.supporting-text')).toHaveCount(0);
      await set(page, 'slider-supporting', { error: false });
      await expect(part(page, 'slider-supporting', '.supporting-text'), 'the help comes back').toHaveText('Applies to alerts and media.');
      await expect(part(page, 'slider-supporting', '.error-text')).toHaveCount(0);
    }
    // append: the help keeps its place and its words, and the error text is added below it.
    await placement(page, 'append');
    await expect(part(page, 'slider', '.supporting-text')).toHaveCount(0);
    near((await box(host(page, 'slider'))).height, (await box(part(page, 'slider', '.label-row'))).height + (await token(page, 'label-gap')) + (await box(control(page, 'slider'))).height, 'no room for a row that is not drawn');
    const row = part(page, 'slider-supporting', '.supporting-text');
    await expect(row).toHaveText('Applies to alerts and media.');
    expect(await css(row, 'color')).toBe(await color(page, 'standard-supporting-text-color'));
    near(Number.parseFloat(await css(row, 'font-size')), await token(page, 'supporting-text-typescale-font-size'), 'supporting-text.typescale');
    // In error the help stays, in its place and its words, from the error look's token — the help's resting color under
    // the default system — and the error text is added below it, in the error text's own color.
    await expect(part(page, 'slider-error', '.supporting-text')).toHaveText('Applies to alerts and media.');
    expect(await css(part(page, 'slider-error', '.supporting-text'), 'color')).toBe(await color(page, 'standard-error-supporting-text-color'));
    expect(await css(part(page, 'slider-error', '.supporting-text'), 'color')).toBe(await css(row, 'color'));
    await expect(part(page, 'slider-error', '.error-text')).toHaveText('Choose a level above 0.');
    expect(await css(part(page, 'slider-error', '.error-text'), 'color')).toBe(await color(page, 'standard-error-text-color'));
    expect(await part(page, 'slider-error', '.texts').evaluate((el) => [...el.children].map((child) => child.getAttribute('part'))), 'the help first').toEqual(['supporting-text', 'error-text']);
    {
      const [help, wrong, mine] = [await box(part(page, 'slider-error', '.supporting-text')), await box(part(page, 'slider-error', '.error-text')), await box(row)];
      near(help.x, mine.x - (await box(host(page, 'slider-supporting'))).x + (await box(host(page, 'slider-error'))).x, 'the help keeps its place');
      near(help.y - (await box(host(page, 'slider-error'))).y, mine.y - (await box(host(page, 'slider-supporting'))).y, 'the help is where it is out of error');
      expect(wrong.y, 'the error text is below the help, never beside it').toBeGreaterThanOrEqual(help.y + help.height - 0.6);
      near(wrong.x, help.x, 'the two start at one edge');
    }
    // Without words for the error the help stays as it is and nothing is added.
    await expect(part(page, 'slider-error-without-text', '.supporting-text')).toHaveText('Applies to alerts and media.');
    expect(await css(part(page, 'slider-error-without-text', '.supporting-text'), 'color')).toBe(await css(row, 'color'));
    await expect(part(page, 'slider-error-without-text', '.error-text')).toHaveCount(0);
    // Wrapped, never cut.
    const long = part(page, 'long-label', '.supporting-text');
    expect((await box(long)).height).toBeGreaterThan(2 * (await box(row)).height - 1);
    expect(await long.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    // The row appears and goes with its text, and the field's height follows.
    const before = (await box(host(page, 'slider'))).height;
    await set(page, 'slider', { supportingText: 'Help' });
    near((await box(host(page, 'slider'))).height, before + (await token(page, 'supporting-text-gap')) + (await box(part(page, 'slider', '.supporting-text'))).height, 'the height follows');
    // With a help and an error text the row holds both, the help first; with error false again the help alone, where it was.
    const helpAt = (await box(part(page, 'slider', '.supporting-text'))).y;
    await set(page, 'slider', { error: true, errorText: 'Wrong.' });
    await expect(part(page, 'slider', '.error-text')).toHaveText('Wrong.');
    near((await box(part(page, 'slider', '.supporting-text'))).y, helpAt, 'the help does not move');
    await set(page, 'slider', { error: false });
    await expect(part(page, 'slider', '.error-text')).toHaveCount(0);
    near((await box(part(page, 'slider', '.supporting-text'))).y, helpAt, 'the help is where it was');
    near((await box(host(page, 'slider'))).height, before + (await token(page, 'supporting-text-gap')) + (await box(part(page, 'slider', '.supporting-text'))).height, 'the height is the help’s again');
    await set(page, 'slider', { supportingText: '', errorText: '' });
    near((await box(host(page, 'slider'))).height, before, 'and returns');
  });

  test('FLD-31: under the default system (replace) the error text is the row’s first line, supporting-text.gap below the control, in the help’s place, and a field in error is as tall as at rest; under append it is drawn error-text.gap below the help’s last line, or as the row’s first line where there is no help; it starts where the help starts, wraps and is never cut; under append a field with a help is taller in error by the gap and the error text’s lines; no room is kept for an error before; it comes and goes at once, with no motion of its own, and an error without words draws none', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['text-stacked-supporting-error', 'text-outlined-supporting-error', 'text-stacked-supporting-error-long', 'text-stacked-supporting-error-rtl', 'slider-error-without-text'].includes(f.id)),
      fx('both', { label: 'Volume', supportingText: 'Help.', error: true, errorText: 'Wrong.' }),
      fx('help', { label: 'Volume', supportingText: 'Help.' }),
      fx('alone', { label: 'Volume', error: true, errorText: 'Wrong.' }),
      fx('wordless', { label: 'Volume', supportingText: 'Help.', error: true }),
    ]);
    const [gap, rowGap] = [await token(page, 'error-text-gap'), await token(page, 'supporting-text-gap')];
    // Under the default system: 4, one line of error text (16), and no help; out of error, the help there instead.
    {
      const [framed, wrong, field] = [await box(control(page, 'both')), await box(part(page, 'both', '.error-text')), await box(host(page, 'both'))];
      await expect(part(page, 'both', '.supporting-text')).toHaveCount(0);
      near(wrong.y - (framed.y + framed.height), rowGap, 'replace: supporting-text.gap below the control');
      expect([rowGap, Math.round(wrong.height)]).toEqual([4, 16]);
      near(field.height, (await box(host(page, 'help'))).height, 'replace: as tall as the field out of error');
      near(wrong.y - field.y, (await box(part(page, 'help', '.supporting-text'))).y - (await box(host(page, 'help'))).y, 'replace: where the help stands');
    }
    // append: below the control the row's gap, the help, error-text.gap, the error text.
    await placement(page, 'append');
    const [framed, help, wrong, field] = [await box(control(page, 'both')), await box(part(page, 'both', '.supporting-text')), await box(part(page, 'both', '.error-text')), await box(host(page, 'both'))];
    near(help.y - (framed.y + framed.height), rowGap, 'the help supporting-text.gap below the control');
    near(wrong.y - (help.y + help.height), gap, 'the error text error-text.gap below the help');
    near(field.y + field.height, wrong.y + wrong.height, 'the field ends with its error text');
    near(wrong.x, help.x, 'it starts where the help starts');
    // Its text style is the supporting text's; its color its own token, whose default is the error role.
    expect(await css(part(page, 'both', '.error-text'), 'font')).toBe(await css(part(page, 'both', '.supporting-text'), 'font'));
    expect(await css(part(page, 'both', '.error-text'), 'color')).toBe(await color(page, 'standard-error-text-color'));
    expect(await css(part(page, 'both', '.error-text'), 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-error'));
    // Taller in error by the gap and the error text's lines; nothing above the error text moves.
    near(field.height, (await box(host(page, 'help'))).height + gap + wrong.height, 'taller by error-text.gap and the error text');
    for (const selector of ['.label', '.supporting-text']) near((await box(part(page, 'both', selector))).y - field.y, (await box(part(page, 'help', selector))).y - (await box(host(page, 'help'))).y, `${selector} is where it is out of error`);
    // Under the default system: 4, one line of help (16), 4, one line of error text (16).
    expect([rowGap, Math.round(help.height), gap, Math.round(wrong.height)]).toEqual([4, 16, 4, 16]);
    // Without help the error text is the row's first line, where it has always stood: supporting-text.gap below the control.
    const [aloneControl, aloneText] = [await box(control(page, 'alone')), await box(part(page, 'alone', '.error-text'))];
    near(aloneText.y - (aloneControl.y + aloneControl.height), rowGap, 'no help: supporting-text.gap below the control');
    await expect(part(page, 'alone', '.supporting-text')).toHaveCount(0);
    near((await box(host(page, 'alone'))).height, (await box(host(page, 'help'))).height, 'as tall as a field with one line of help');
    // In error without words: the help in its resting place and color, and no second line.
    await expect(part(page, 'wordless', '.error-text')).toHaveCount(0);
    near((await box(host(page, 'wordless'))).height, (await box(host(page, 'help'))).height, 'no room for an error text that is not drawn');
    expect(await css(part(page, 'wordless', '.supporting-text'), 'color')).toBe(await css(part(page, 'help', '.supporting-text'), 'color'));
    await expect(part(page, 'slider-error-without-text', '.error-text')).toHaveCount(0);
    // Both wrap and neither is cut; a look that floats its label starts both at the input's text (FLD-26).
    const long = 'text-stacked-supporting-error-long';
    for (const selector of ['.supporting-text', '.error-text']) {
      expect((await box(part(page, long, selector))).height, `${selector} wraps`).toBeGreaterThan(help.height * 1.5);
      expect(await part(page, long, selector).evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1), `${selector} is not cut`).toBe(true);
    }
    near((await box(part(page, long, '.error-text'))).y - ((await box(part(page, long, '.supporting-text'))).y + (await box(part(page, long, '.supporting-text'))).height), gap, 'the gap below a wrapped help');
    const outlined = 'text-outlined-supporting-error';
    near((await box(part(page, outlined, '.error-text'))).x, (await box(part(page, outlined, '.supporting-text'))).x, 'outlined: one start edge');
    expect((await box(part(page, outlined, '.error-text'))).x, 'outlined: inset to the input’s text').toBeGreaterThan((await box(host(page, outlined))).x + 1);
    // Right-to-left: both start at the right edge.
    const rtl = 'text-stacked-supporting-error-rtl';
    // (The right edge of the row's content: the field's, less what the input says its content is inset by — FLD-26.)
    const [rh, rw, rrow] = [await box(part(page, rtl, '.supporting-text')), await box(part(page, rtl, '.error-text')), await box(part(page, rtl, '.supporting'))];
    const rightEdge = rrow.x + rrow.width - Number.parseFloat(await css(part(page, rtl, '.supporting'), 'padding-right'));
    near(rh.x + rh.width, rightEdge, 'right-to-left: the help at the right edge');
    near(rw.x + rw.width, rightEdge, 'right-to-left: the error text at the right edge');
    expect(rightEdge, 'right-to-left: the row is on the right').toBeGreaterThan((await box(host(page, rtl))).x + (await box(host(page, rtl))).width / 2);
    expect(await css(part(page, rtl, '.error-text'), 'text-align')).toBe('right');
    // It comes and goes in the same frame, with no motion of the row: no transition but the color's, no animation.
    expect(await css(part(page, 'both', '.error-text'), 'transition-property')).toBe('color');
    expect(await css(part(page, 'both', '.error-text'), 'animation-name')).toBe('none');
    expect(await css(part(page, 'both', '.texts'), 'transition-property')).toBe('all');
    expect(Number.parseFloat(await css(part(page, 'both', '.texts'), 'transition-duration'))).toBe(0);
    const heights = await host(page, 'both').evaluate(async (el: HTMLElement & { error: boolean; updateComplete: Promise<unknown> }) => {
      const out: number[] = [];
      el.error = false;
      await el.updateComplete;
      out.push(el.getBoundingClientRect().height, el.shadowRoot!.querySelectorAll('.error-text').length);
      el.error = true;
      await el.updateComplete;
      out.push(el.getBoundingClientRect().height, el.shadowRoot!.querySelectorAll('.error-text').length);
      return out;
    });
    expect(heights[1]).toBe(0);
    expect(heights[3]).toBe(1);
    near(heights[0]!, (await box(host(page, 'help'))).height, 'error off: the line and its gap are gone in the same frame');
    near(heights[2]!, field.height, 'error on: the line is there in the same frame');
  });

  test('FLD-8: error draws the label, the glyph, the asterisk and the help from the error parts of the tokens and the error text in its own color — under the default system nothing that was drawn before the error changes color, and the tag never does — exposes the control as invalid and puts it in its own error condition where it has one — a checkbox draws its error form, a slider stays as drawn; the field never sets error itself', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['slider-required-error', 'slider-required', 'checkbox-own-label-error', 'checkbox-own-label'].includes(f.id)),
      fx('icon-error', { label: 'Volume', error: true, errorText: 'Choose a level above 0.' }, slider({ value: 0 }), { slots: { 'label-icon': 'volume_up' } }),
      fx('own-error', {}, '<tanrei-checkbox label="I accept the terms of use" error></tanrei-checkbox>'),
      fx('slider-zero', { label: 'Volume', required: true }, slider({ value: 0 })),
      fx('helped', { label: 'Volume', required: true, requiredMark: 'asterisk', supportingText: 'Help.' }, slider(), { slots: { 'label-icon': 'volume_up' } }),
      fx('helped-error', { label: 'Volume', required: true, requiredMark: 'asterisk', supportingText: 'Help.', error: true, errorText: 'Wrong.' }, slider(), { slots: { 'label-icon': 'volume_up' } }),
    ]);
    await placement(page, 'append');
    const id = 'slider-required-error';
    expect(await css(part(page, id, '.label'), 'color')).toBe(await color(page, 'standard-error-label-color'));
    expect(await css(part(page, id, '.error-text'), 'color')).toBe(await color(page, 'standard-error-text-color'));
    expect(await css(part(page, 'helped-error', '.supporting-text'), 'color')).toBe(await color(page, 'standard-error-supporting-text-color'));
    expect(await css(part(page, 'helped-error', '.asterisk'), 'color')).toBe(await color(page, 'standard-error-required-asterisk-color'));
    expect(await css(part(page, 'icon-error', '.label-icon'), 'color')).toBe(await color(page, 'standard-error-label-icon-color'));
    // The requirement tag has no error part: it is the tag it is out of error.
    for (const property of ['background-color', 'color']) expect(await css(part(page, id, '.required-tag').locator('.container'), property), `the tag’s ${property}`).toBe(await css(part(page, 'slider-required', '.required-tag').locator('.container'), property));
    // Under the default system no part that was drawn before the error changes color: the error text alone takes the error role.
    for (const selector of ['.label', '.label-icon', '.asterisk', '.supporting-text']) expect(await css(part(page, 'helped-error', selector), 'color'), `${selector} keeps its color in error`).toBe(await css(part(page, 'helped', selector), 'color'));
    expect(await css(part(page, id, '.label'), 'color')).toBe(await css(part(page, 'slider-required', '.label'), 'color'));
    expect(await css(part(page, id, '.error-text'), 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-error'));
    expect(await css(part(page, 'helped-error', '.supporting-text'), 'color')).not.toBe(await resolveColor(page, '--tanrei-sys-color-error'));
    // Each error part is its own token.
    await override(page, { [T('standard-error-label-color')]: 'rgb(1, 2, 3)', [T('standard-error-label-icon-color')]: 'rgb(4, 5, 6)', [T('standard-error-required-asterisk-color')]: 'rgb(7, 8, 9)', [T('standard-error-supporting-text-color')]: 'rgb(10, 11, 12)', [T('standard-error-text-color')]: 'rgb(13, 14, 15)' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(part(page, id, '.label'), 'color')).toBe('rgb(1, 2, 3)');
    expect(await css(part(page, 'icon-error', '.label-icon'), 'color')).toBe('rgb(4, 5, 6)');
    expect(await css(part(page, 'helped-error', '.asterisk'), 'color')).toBe('rgb(7, 8, 9)');
    expect(await css(part(page, 'helped-error', '.supporting-text'), 'color')).toBe('rgb(10, 11, 12)');
    expect(await css(part(page, 'helped-error', '.error-text'), 'color')).toBe('rgb(13, 14, 15)');
    // Invalid, and the control's own error condition: a checkbox in a field in error is drawn as a checkbox in error.
    expect((await semantics(page, 'checkbox-own-label-error')).invalid).toBe(true);
    expect((await semantics(page, 'checkbox-own-label')).invalid).toBe(false);
    const outline = (fixture: string) => control(page, fixture).locator('.box').evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
    expect(await outline('checkbox-own-label-error')).toBe(await outline('own-error'));
    expect(await outline('checkbox-own-label-error')).not.toBe(await outline('checkbox-own-label'));
    // A slider has no error condition: exposed as invalid, drawn as before.
    expect((await semantics(page, id)).invalid).toBe(true);
    const drawn = (fixture: string) => control(page, fixture).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.piece, .handle')].map((p) => getComputedStyle(p).backgroundColor + getComputedStyle(p).borderColor).join('|'));
    expect(await drawn(id)).toBe(await drawn('slider-zero'));
    // The field never sets error: nothing a person does to the control puts the field in error.
    await control(page, 'slider-zero').locator('[role="slider"]').focus();
    await page.keyboard.press('Home');
    expect(await host(page, 'slider-zero').evaluate((el: HTMLElement & { error: boolean }) => el.error)).toBe(false);
  });

  test('FLD-9: an error that appears, or changes its words, while focus is inside the field is announced once, politely — the error text alone, never the help again; one set while focus is elsewhere is not announced and is read as the control’s description; focus does not move, and no other change of its texts is announced', async ({ page }) => {
    await mount(page, [fx('a', { label: 'Volume', supportingText: 'Applies to alerts and media.' }, slider({ value: 0 })), fx('b', { label: 'Balance' }), fx('first', { label: 'Volume', error: true, errorText: 'Drawn in error from the start.' })]);
    const region = host(page, 'a').locator('.announcer');
    expect(await region.getAttribute('aria-live')).toBe('polite');
    expect(await region.getAttribute('role')).toBe('status');
    // What the field was first drawn with is not announced: it is read with the control.
    await frames(page);
    expect(await announced(page, 'first')).toBe('');
    await control(page, 'a').locator('[role="slider"]').focus();
    // No other change of its texts is announced.
    await set(page, 'a', { supportingText: 'New help.' });
    await frames(page);
    expect(await announced(page, 'a')).toBe('');
    await set(page, 'a', { error: true, errorText: 'Choose a level above 0.' });
    await expect.poll(() => announced(page, 'a')).toBe('Choose a level above 0.');
    // The help is not said again — the live region never holds it — whether the error text takes its place (the default)
    // or stands below it (append).
    await expect(part(page, 'a', '.supporting-text')).toHaveCount(0);
    expect(await announced(page, 'a')).not.toContain('New help.');
    expect(await activeInside(page, 'a'), 'focus stays').toBe(true);
    await set(page, 'a', { errorText: 'Choose a level between 1 and 10.' });
    await expect.poll(() => announced(page, 'a')).toBe('Choose a level between 1 and 10.');
    // A change of the help while the field is in error announces nothing new, and never the help.
    await set(page, 'a', { supportingText: 'Other help.' });
    await frames(page);
    expect(await announced(page, 'a')).toBe('Choose a level between 1 and 10.');
    // Set while focus is elsewhere: not announced, read as the description, and focus is not moved.
    await set(page, 'b', { error: true, errorText: 'Choose a side.' });
    await frames(page);
    expect(await announced(page, 'b')).toBe('');
    expect((await semantics(page, 'b')).description).toBe('Choose a side.');
    expect(await activeInside(page, 'a')).toBe(true);
    expect(await activeInside(page, 'b')).toBe(false);
  });

  test('FLD-10: label is the accessible name of the control, drawn or not, where the control has none of its own; a control that names itself keeps its name, and under a drawn label that is reported as two labels; an empty label with a nameless control is reported; required is exposed whichever mark is drawn', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['slider', 'slider-label-hidden', 'checkbox-own-label', 'switch'].includes(f.id)),
      fx('two-labels', { label: 'Terms' }, checkbox({ label: 'I accept the terms of use' })),
      fx('nameless', {}, '<tanrei-slider value="40"></tanrei-slider>'),
      fx('native', { label: 'City', required: true, requiredMark: 'none' }, '<input />'),
      fx('native-named', { label: 'City' }, '<input aria-label="Town" />'),
      fx('switch-required', { label: 'Notifications', required: true, requiredMark: 'asterisk' }, toggle()),
    ]);
    expect((await semantics(page, 'slider')).name).toBe('Volume');
    expect((await semantics(page, 'slider-label-hidden')).name).toBe('Volume');
    expect((await semantics(page, 'switch')).name).toBe('Notifications');
    await expect(stage(page, 'slider').getByRole('slider', { name: 'Volume', exact: true })).toHaveCount(1);
    await expect(stage(page, 'slider-label-hidden').getByRole('slider', { name: 'Volume', exact: true })).toHaveCount(1);
    await expect(stage(page, 'switch').getByRole('switch', { name: 'Notifications', exact: true })).toHaveCount(1);
    // The drawn label is not read a second time.
    expect(await part(page, 'slider', '.label').getAttribute('aria-hidden')).toBe('true');
    // A control that names itself keeps its name; with an empty field label nothing is reported.
    expect((await semantics(page, 'checkbox-own-label')).name).toBe('I accept the terms of use');
    expect((await semantics(page, 'two-labels')).name).toBe('I accept the terms of use');
    expect(await control(page, 'native-named').getAttribute('aria-label')).toBe('Town');
    // Any other element is given aria-label, and aria-required where its role has the state.
    expect(await control(page, 'native').getAttribute('aria-label')).toBe('City');
    expect(await control(page, 'native').getAttribute('aria-required')).toBe('true');
    expect((await semantics(page, 'switch-required')).required).toBe(true);
    const reports = seen.filter((w) => w.includes('FLD-10'));
    expect(reports.filter((w) => w.includes('two labels')).map((w) => /<(tanrei-[\w-]+|input)> names/.exec(w)?.[1]).sort()).toEqual(['input', 'tanrei-checkbox']);
    expect(reports.filter((w) => w.includes('no accessible name'))).toHaveLength(1);
    expect(reports).toHaveLength(3);
    // The control's own "no name" report is not made for a control its field names.
    expect(seen.filter((w) => w.includes('SLD-19'))).toHaveLength(1);
    expect(seen.filter((w) => w.includes('SWT-16'))).toHaveLength(0);
  });

  test('FLD-11: the description of the control is, in this order and after any description it has of its own, what the supporting row draws — the help, the error text while the field is in error, in the help’s place under the default system and after it under append — and optionalText while the control is optional, drawn label or not; a change is exposed at once; the glyph, the tag and the asterisk are not exposed', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['slider-supporting', 'slider-error', 'slider-label-hidden', 'switch-optional', 'slider-error-rtl'].includes(f.id)),
      fx('own', { label: 'City', supportingText: 'As written on your mail.', required: false, optional: true }, '<input aria-description="Autofilled." />'),
      fx('hidden-optional', { label: 'Volume', labelHidden: true, required: false, optional: true, supportingText: 'Help.' }),
    ]);
    expect((await semantics(page, 'slider-supporting')).description).toBe('Applies to alerts and media.');
    // In error, under the default system: the error text in the help's place, as the row draws it.
    expect((await semantics(page, 'slider-error')).description).toBe('Choose a level above 0.');
    expect((await semantics(page, 'slider-label-hidden')).description).toBe('Applies to alerts and media.');
    expect((await semantics(page, 'switch-optional')).description).toBe('Optional');
    expect((await semantics(page, 'slider-error-rtl')).description).toBe('יש לבחור רמה מעל 0. רשות');
    expect((await semantics(page, 'hidden-optional')).description).toBe('Help. Optional');
    // After the control's own description.
    expect(await control(page, 'own').getAttribute('aria-description')).toBe('Autofilled. As written on your mail. Optional');
    await expect(stage(page, 'slider-supporting').getByRole('slider')).toHaveAccessibleDescription('Applies to alerts and media.');
    // A change is exposed at once.
    await set(page, 'slider-supporting', { supportingText: 'Applies to media only.' });
    expect((await semantics(page, 'slider-supporting')).description).toBe('Applies to media only.');
    await set(page, 'slider-supporting', { error: true, errorText: 'Too loud.' });
    expect((await semantics(page, 'slider-supporting')).description).toBe('Too loud.');
    await set(page, 'slider-supporting', { error: false });
    expect((await semantics(page, 'slider-supporting')).description).toBe('Applies to media only.');
    await set(page, 'slider-supporting', { error: true, supportingText: '' });
    expect((await semantics(page, 'slider-supporting')).description).toBe('Too loud.');
    await set(page, 'slider-supporting', { error: false });
    expect((await semantics(page, 'slider-supporting')).description).toBeNull();
    // With the control's own description, a help, an error and the optional text: its own, the error text in the help's
    // place, the optional text — and under append all four, in that order.
    await set(page, 'own', { error: true, errorText: 'No such city.' });
    expect(await control(page, 'own').getAttribute('aria-description')).toBe('Autofilled. No such city. Optional');
    await placement(page, 'append');
    expect(await control(page, 'own').getAttribute('aria-description')).toBe('Autofilled. As written on your mail. No such city. Optional');
    expect((await semantics(page, 'slider-error')).description).toBe('Applies to alerts and media. Choose a level above 0.');
    await placement(page, 'replace');
    await set(page, 'own', { error: false });
    await set(page, 'own', { supportingText: '', required: false, optional: false });
    expect(await control(page, 'own').getAttribute('aria-description')).toBe('Autofilled.');
    // The drawn marks are not exposed.
    for (const hidden of await part(page, 'switch-optional', '.requirement-tag, .asterisk, .label-icon').all()) expect(await hidden.getAttribute('aria-hidden')).toBe('true');
  });

  test('FLD-12: a press on the label, the label glyph or the requirement mark moves focus to the control and does nothing else — it does not switch or change it, and draws no press answer; a press on the supporting row does nothing; the field adds no stop to the focus order and handles no key', async ({ page }) => {
    await mount(page, [
      fx('switch', { label: 'Notifications', required: true, supportingText: 'Sent when a review is waiting for you.' }, toggle({ selected: true }), { slots: { 'label-icon': 'volume_up' } }),
      fx('slider', { label: 'Volume', supportingText: 'Help.' }),
      fx('native', { label: 'Accept' }, '<input type="checkbox" />'),
    ]);
    const selected = () => control(page, 'switch').evaluate((el: HTMLElement & { selected: boolean }) => el.selected);
    const events = await host(page, 'switch').evaluateHandle((el) => {
      const heard: string[] = [];
      for (const type of ['input', 'change', 'click']) el.addEventListener(type, () => heard.push(type));
      return heard;
    });
    for (const target of ['.label', '.label-icon', '.required-tag']) {
      await page.locator('body').click({ position: { x: 600, y: 5 } });
      expect(await activeInside(page, 'switch'), `${target}: not focused before`).toBe(false);
      await part(page, 'switch', target).click();
      expect(await activeInside(page, 'switch'), `${target}: focus moved to the control`).toBe(true);
      expect(await selected(), `${target}: the control is not switched`).toBe(true);
    }
    // Nothing was switched or changed (a click on the label is the label's, not the control's).
    expect((await events.jsonValue()).filter((type) => type !== 'click')).toEqual([]);
    // No press answer: the row has no state of its own and its cursor is the default one.
    expect(await css(part(page, 'switch', '.label-row'), 'cursor')).toBe('default');
    // A native checkbox is focused and not checked by a press on the field's label.
    await part(page, 'native', '.label').click();
    expect(await control(page, 'native').evaluate((el: HTMLInputElement) => [el === document.activeElement, el.checked])).toEqual([true, false]);
    // A press on the supporting row does nothing.
    await page.locator('body').click({ position: { x: 600, y: 5 } });
    await part(page, 'slider', '.supporting-text').click();
    expect(await activeInside(page, 'slider')).toBe(false);
    // No stop of its own: Tab goes from one control to the next.
    await tabTo(page, control(page, 'switch'));
    await tab(page);
    expect(await activeInside(page, 'slider'), 'the next stop is the next control').toBe(true);
    expect(await host(page, 'slider').evaluate((el) => [el.tabIndex, el.shadowRoot!.querySelectorAll('[tabindex], button, a[href], input').length])).toEqual([-1, 0]);
  });

  test('FLD-13: while focus is inside the field — gained by pointer or by keyboard — the label, the glyph, the mark and the supporting row are drawn from the focused tokens, their error parts while error is true; the field draws no focus indicator; the colors change over motion.state-duration, and at once where motion is reduced', async ({ page }) => {
    await mount(page, [fx('a', { label: 'Volume', required: true, requiredMark: 'asterisk', supportingText: 'Help.' }, slider(), { slots: { 'label-icon': 'volume_up' } }), fx('error', { label: 'Volume', supportingText: 'Help.', error: true, errorText: 'Too loud.' })], { system: 'm3-like' });
    await placement(page, 'append');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const read = async (id: string) => ({
      label: await css(part(page, id, '.label'), 'color'),
      glyph: (await part(page, id, '.label-icon').count()) ? await css(part(page, id, '.label-icon'), 'color') : '',
      asterisk: (await part(page, id, '.asterisk').count()) ? await css(part(page, id, '.asterisk'), 'color') : '',
      supporting: await css(part(page, id, '.supporting-text'), 'color'),
    });
    const expected = async (state: string) => ({
      label: await color(page, `standard-${state}label-color`),
      glyph: await color(page, `standard-${state}label-icon-color`),
      asterisk: await color(page, `standard-${state}required-asterisk-color`),
      supporting: await color(page, `standard-${state}supporting-text-color`),
    });
    expect(await read('a')).toEqual(await expected(''));
    // By keyboard.
    await tabTo(page, control(page, 'a'));
    expect(await read('a')).toEqual(await expected('focused-'));
    // Under m3-like the primary is chromatic: the focused label takes it, as a focused text field's does.
    expect((await read('a')).label).toBe(await resolveColor(page, '--tanrei-sys-color-primary'));
    expect((await read('a')).label).not.toBe((await expected('')).label);
    expect((await read('a')).label).toBe(await resolveColor(page, '--tanrei-comp-input-box-outlined-focused-label-color'));
    // The field draws no focus indicator of its own.
    expect(await css(host(page, 'a'), 'outline-style')).toBe('none');
    expect(await css(frame(page, 'a'), 'outline-style')).toBe('none');
    await page.locator('body').click({ position: { x: 600, y: 5 } });
    expect(await read('a')).toEqual(await expected(''));
    // By pointer.
    await press(control(page, 'a').locator('[role="slider"]'));
    expect(await read('a')).toEqual(await expected('focused-'));
    // In error the focused error parts: the label keeps its error color.
    await press(control(page, 'error').locator('[role="slider"]'));
    const inError = await read('error');
    expect(inError.label).toBe(await color(page, 'standard-focused-error-label-color'));
    expect(inError.supporting).toBe(await color(page, 'standard-focused-error-supporting-text-color'));
    // The error text has its focused token too (FLD-31).
    expect(await css(part(page, 'error', '.error-text'), 'color')).toBe(await color(page, 'standard-focused-error-text-color'));
    expect(inError.label).toBe(await color(page, 'standard-error-label-color'));
    // Over motion.state-duration with motion.state-easing; at once where motion is reduced.
    expect(Number.parseFloat(await css(part(page, 'a', '.label'), 'transition-duration'))).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const duration = await resolveToken(page, T('motion-state-duration'), 'duration');
    for (const selector of ['.label', '.asterisk', '.supporting-text']) near(Number.parseFloat(await css(part(page, 'a', selector), 'transition-duration')) * 1000, duration, `${selector} changes over the state motion`, 0.01);
    expect(await css(part(page, 'a', '.label'), 'transition-property')).toBe('color');
  });

  test('FLD-13: under the default system the focused label takes the primary role, which is the surface’s text color, and every other part keeps its resting color', async ({ page }) => {
    await mount(page, [fx('a', { label: 'Volume', supportingText: 'Help.' })]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const rest = [await css(part(page, 'a', '.label'), 'color'), await css(part(page, 'a', '.supporting-text'), 'color')];
    await tabTo(page, control(page, 'a'));
    expect(await css(part(page, 'a', '.label'), 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-primary'));
    expect(await css(part(page, 'a', '.label'), 'color')).toBe(await color(page, 'standard-focused-label-color'));
    expect(await css(part(page, 'a', '.supporting-text'), 'color')).toBe(rest[1]);
  });

  test('FLD-13: while its control says that it is drawn focused — a combobox for as long as its list is open — the label and the supporting row are drawn from the focused tokens though focus is elsewhere, and from the resting ones again once the control no longer says so', async ({ page }) => {
    const combobox: FixtureItem = { kind: 'combobox', props: {}, items: [{ kind: 'option', props: { label: 'Kyoto', value: 'kyoto' } }, { kind: 'option', props: { label: 'Tokyo', value: 'tokyo' } }] };
    await mount(page, [fx('a', { label: 'City', supportingText: 'Help.' }, combobox), fx('other', { label: 'Volume' })], { system: 'm3-like' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const read = async () => [await css(part(page, 'a', '.label'), 'color'), await css(part(page, 'a', '.supporting-text'), 'color')];
    const rest = [await color(page, 'standard-label-color'), await color(page, 'standard-supporting-text-color')];
    const focused = [await color(page, 'standard-focused-label-color'), await color(page, 'standard-focused-supporting-text-color')];
    expect(focused[0], 'm3-like: the focused label differs').not.toBe(rest[0]);
    expect(await read()).toEqual(rest);
    // Focus is in another field; the product opens the combobox's list.
    await tabTo(page, control(page, 'other'));
    const open = (value: boolean) => control(page, 'a').evaluate(async (el, v) => (((el as HTMLElement & { open: boolean }).open = v), await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete), value);
    await open(true);
    await expect.poll(read, { message: 'the control says it is drawn focused' }).toEqual(focused);
    expect(await activeInside(page, 'a'), 'focus is not inside the field').toBe(false);
    expect(await frame(page, 'other').getAttribute('data-focused'), 'the field focus is in is focused as before').not.toBeNull();
    await open(false);
    await expect.poll(read).toEqual(rest);
  });

  test('FLD-13: while its control says that it is drawn focused — a select for as long as its list is open, whether or not it has focus — the label and the supporting row are drawn from the focused tokens, and at rest again once it says so no more; a control that says nothing changes nothing, and a disabled field is never drawn focused', async ({ page }) => {
    const options: FixtureItem[] = [{ kind: 'option', props: { label: 'Japan', value: 'jp' } }, { kind: 'option', props: { label: 'Kenya', value: 'ke' } }];
    await mount(page, [fx('a', { label: 'Country', supportingText: 'Help.' }, { kind: 'select', props: { value: 'jp' }, items: options }), fx('b', { label: 'Volume', supportingText: 'Help.' })], { system: 'm3-like' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const [rest, focused] = [await color(page, 'standard-label-color'), await color(page, 'standard-focused-label-color')];
    expect(focused, 'm3-like’s primary is chromatic: the focused label differs').not.toBe(rest);
    const open = (value: boolean) =>
      control(page, 'a').evaluate(async (el, v) => {
        (el as HTMLElement & { open: boolean }).open = v;
        for (let round = 0; round < 2; round++) await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      }, value);
    // Focus is in another field: nothing here is focused.
    await tabTo(page, control(page, 'b'));
    expect(await css(part(page, 'a', '.label'), 'color')).toBe(rest);
    // The product opens the select's list: the select says it is drawn focused, and the field's rows follow.
    await open(true);
    await expect.poll(() => css(part(page, 'a', '.label'), 'color')).toBe(focused);
    expect(await activeInside(page, 'a'), 'focus is still elsewhere').toBe(false);
    expect(await frame(page, 'a').getAttribute('data-focused')).not.toBeNull();
    expect(await css(part(page, 'a', '.supporting-text'), 'color')).toBe(await color(page, 'standard-focused-supporting-text-color'));
    await open(false);
    await expect.poll(() => css(part(page, 'a', '.label'), 'color')).toBe(rest);
    expect(await frame(page, 'a').getAttribute('data-focused')).toBeNull();
    // A disabled field: its select does not open (SEL-46), says nothing, and the field is not drawn focused.
    await set(page, 'a', { disabled: true });
    await open(true);
    await frames(page);
    expect(await frame(page, 'a').getAttribute('data-focused')).toBeNull();
    expect(await css(part(page, 'a', '.label'), 'color')).toBe(await color(page, 'standard-disabled-label-color'));
  });

  test('FLD-14: disabled draws every part of the field’s own from its disabled tokens and its requirement tag as a tag inside something disabled, makes the control disabled as its own disabled does — not focusable, not operable, exposed as disabled — and answers no press on its label; an enabled field does not enable a control the product disabled; its texts stay readable', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['slider-disabled', 'slider-required-disabled'].includes(f.id)),
      fx('switch', { label: 'Notifications', disabled: true, supportingText: 'Help.' }, toggle()),
      fx('native', { label: 'City', disabled: true }, '<input />'),
      fx('own', { label: 'City' }, '<input disabled />'),
      fx('own-tanrei', { label: 'Volume' }, '<tanrei-slider value="40" disabled></tanrei-slider>'),
      fx('error', { label: 'Volume', supportingText: 'Help.', disabled: true, error: true, errorText: 'Too loud.' }),
      fx('asterisk', { label: 'Volume', required: true, requiredMark: 'asterisk', disabled: true }),
      fx('enabled', { label: 'Volume' }),
    ]);
    await placement(page, 'append');
    const id = 'slider-disabled';
    expect(await css(part(page, id, '.label'), 'color')).toBe(await color(page, 'standard-disabled-label-color'));
    expect(await css(part(page, id, '.supporting-text'), 'color')).toBe(await color(page, 'standard-disabled-supporting-text-color'));
    expect(await css(part(page, 'error', '.supporting-text'), 'color')).toBe(await color(page, 'standard-disabled-error-supporting-text-color'));
    expect(await css(part(page, 'error', '.error-text'), 'color')).toBe(await color(page, 'standard-disabled-error-text-color'));
    expect(await css(part(page, 'asterisk', '.asterisk'), 'color')).toBe(await color(page, 'standard-disabled-required-asterisk-color'));
    // The requirement tag is no part of the field's own: it is drawn as a tag inside something disabled, from the Tag's
    // own disabled tokens (FLD-5, TAG-21).
    expect(await css(part(page, 'slider-required-disabled', '.required-tag').locator('.container'), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-tag-filled-disabled-container-color'));
    expect(await css(part(page, 'slider-required-disabled', '.required-tag').locator('.container'), 'color')).toBe(await resolveColor(page, '--tanrei-comp-tag-filled-disabled-label-color'));
    // The control: disabled as its own `disabled` does.
    expect(await semantics(page, id)).toMatchObject({ disabled: true, focusable: false });
    expect(await semantics(page, 'switch')).toMatchObject({ disabled: true, focusable: false });
    expect(await control(page, id).evaluate((el) => el.shadowRoot!.querySelector('[data-disabled]') !== null), 'drawn as a disabled slider').toBe(true);
    expect(await control(page, id).evaluate((el: HTMLElement & { disabled: boolean }) => el.disabled), 'the product’s own property is not written').toBe(false);
    await control(page, 'switch').click({ force: true });
    expect(await control(page, 'switch').evaluate((el: HTMLElement & { selected: boolean }) => el.selected), 'not operable').toBe(false);
    expect(await control(page, 'native').evaluate((el: HTMLInputElement) => el.disabled)).toBe(true);
    // No answer to a press on its label.
    await part(page, id, '.label').click();
    expect(await activeInside(page, id)).toBe(false);
    // Enabled again: the control is given back; a control the product disabled itself stays disabled.
    await set(page, 'native', { disabled: false });
    expect(await control(page, 'native').evaluate((el: HTMLInputElement) => el.disabled)).toBe(false);
    await set(page, id, { disabled: false });
    expect(await semantics(page, id)).toMatchObject({ disabled: false, focusable: true });
    expect(await control(page, 'own').evaluate((el: HTMLInputElement) => el.disabled)).toBe(true);
    await set(page, 'own', { disabled: true });
    await set(page, 'own', { disabled: false });
    expect(await control(page, 'own').evaluate((el: HTMLInputElement) => el.disabled), 'still the product’s').toBe(true);
    expect((await semantics(page, 'own-tanrei')).disabled).toBe(true);
    // Its texts stay readable: the name and the description are still on the disabled control, and the row is text.
    expect(await semantics(page, 'switch')).toMatchObject({ name: 'Notifications', description: 'Help.' });
    expect(await part(page, 'switch', '.supporting-text').getAttribute('aria-hidden')).toBeNull();
  });

  test('FLD-15: the field frames exactly one control — given none it draws its rows and reports it; given more it lays them out in order, names, describes and marks only the first and reports that a set is a field group; a control that draws this frame itself is reported and neither frame is hidden', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('none', { label: 'Volume', supportingText: 'Help.' }, ''),
      fx('two', { label: 'Range', supportingText: 'Help.', error: true, required: true, disabled: true }, '<input id="first" /><input id="second" />'),
      fx('text-field', { label: 'Outer', supportingText: 'Outer help.' }, '<tanrei-text-field label="Inner" supporting-text="Inner help."></tanrei-text-field>'),
    ]);
    await expect(part(page, 'none', '.label')).toBeVisible();
    await expect(part(page, 'none', '.supporting-text')).toBeVisible();
    const [first, second] = [page.locator('#first'), page.locator('#second')];
    expect((await box(first)).x).toBeLessThanOrEqual((await box(second)).x);
    expect(await first.evaluate((el) => ['aria-label', 'aria-description', 'aria-invalid', 'aria-required'].map((name) => el.getAttribute(name)))).toEqual(['Range', 'Help.', 'true', 'true']);
    expect(await second.evaluate((el) => ['aria-label', 'aria-description', 'aria-invalid', 'aria-required'].map((name) => el.getAttribute(name)))).toEqual([null, null, null, null]);
    // A text field is already a field: both frames are drawn, and it keeps its own name and description.
    await expect(part(page, 'text-field', '.label').first()).toBeVisible();
    await expect(part(page, 'text-field', '.supporting-text').first()).toBeVisible();
    const inner = control(page, 'text-field');
    await expect(inner.locator('.label-row .label')).toBeVisible();
    await expect(inner.locator('.supporting-text')).toBeVisible();
    expect(await inner.locator('input').getAttribute('aria-label')).toBe('Inner');
    expect(await inner.getAttribute('aria-label')).toBeNull();
    const reports = seen.filter((w) => w.includes('FLD-15'));
    expect(reports.filter((w) => w.includes('has no control'))).toHaveLength(1);
    expect(reports.filter((w) => w.includes('a set of controls is a field group'))).toHaveLength(1);
    expect(reports.filter((w) => w.includes('already a field'))).toHaveLength(1);
  });

  test('FLD-16: with the text enlarged the field grows with its texts — the label and the supporting row wrap and never clip, the tag grows with its text and keeps its paddings, the glyph keeps label-icon.size, the rows keep their order and gaps; at 200 % nothing is lost, overlaps or scrolls sideways', async ({ page }) => {
    const ids = ['long-label', 'slider-required-label-icon', 'slider-supporting'];
    await page.setViewportSize({ width: 320, height: 1200 });
    await mountSpec(page, ...ids);
    const before = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, (await box(host(page, id))).height] as const)));
    const labelSize = Number.parseFloat(await css(part(page, 'slider-supporting', '.label'), 'font-size'));
    const tagSize = Number.parseFloat(await css(part(page, 'slider-required-label-icon', '.required-tag').locator('.container'), 'font-size'));
    await page.addStyleTag({ content: 'html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } .stage > tanrei-field { inline-size: auto !important; }' });
    await frames(page);
    near(Number.parseFloat(await css(part(page, 'slider-supporting', '.label'), 'font-size')), 2 * labelSize, 'the label grows');
    const tag = part(page, 'slider-required-label-icon', '.required-tag').locator('.container');
    near(Number.parseFloat(await css(tag, 'font-size')), 2 * tagSize, 'the tag grows with its text');
    near(Number.parseFloat(await css(tag, 'padding-left')), await resolveToken(page, '--tanrei-comp-tag-container-padding-inline-small'), 'the tag keeps its paddings');
    near((await box(part(page, 'slider-required-label-icon', '.label-icon'))).width, await token(page, 'label-icon-size'), 'the glyph keeps label-icon.size');
    for (const id of ids) {
      const h = await box(host(page, id));
      expect(h.height, `${id} grows`).toBeGreaterThan(before[id]);
      expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: no scrolling sideways`).toBe(true);
      // The rows keep their order and do not lie over one another; nothing is clipped.
      const rows = await host(page, id).evaluate((el) => {
        const framed = [...el.children].find((child) => !child.slot)!;
        return [el.shadowRoot!.querySelector('.label-row'), framed, el.shadowRoot!.querySelector('.supporting-text')].filter((row): row is Element => !!row).map((row) => [row.getBoundingClientRect().top, row.getBoundingClientRect().bottom]);
      });
      for (let i = 1; i < rows.length; i++) expect(rows[i][0], `${id}: row ${i} is below row ${i - 1}`).toBeGreaterThanOrEqual(rows[i - 1][1] - 0.5);
      expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.label, .supporting-text')].every((text) => text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1)), `${id}: no text is clipped`).toBe(true);
    }
    near((await box(control(page, 'slider-supporting'))).y - ((await box(part(page, 'slider-supporting', '.label-row'))).y + (await box(part(page, 'slider-supporting', '.label-row'))).height), await token(page, 'label-gap'), 'the gap is still its token');
  });

  /** The platform's own color of a keyword, as the browser computes it. */
  const systemColor = (page: P, keyword: string) =>
    page.evaluate((name) => {
      const probe = document.createElement('div');
      probe.style.color = name;
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    }, keyword);
  /** FLD-17 of the fixtures mounted: their texts in the platform's text color (its disabled one in a disabled field), each tag with an edge. */
  const forcedColorsHold = async (page: P, fixtures: Fixture[]) => {
    const [canvasText, grayText] = [await systemColor(page, 'CanvasText'), await systemColor(page, 'GrayText')];
    for (const f of fixtures) {
      // (By its props, not by its id: `select-open-disabled-chosen` is a field whose select has a disabled option.)
      const disabled = f.props.disabled === true;
      for (const text of await part(page, f.id, '.label, .asterisk, .supporting-text, .error-text').all()) expect(await css(text, 'color'), f.id).toBe(disabled ? grayText : canvasText);
      for (const tag of await part(page, f.id, '.requirement-tag').all()) {
        const container = tag.locator('.container');
        expect(Number.parseFloat(await css(container, 'border-top-width')), `${f.id}: the tag has an edge`).toBeGreaterThan(0);
        expect(await css(container, 'border-top-style'), f.id).toBe('solid');
      }
    }
  };

  test('FLD-17: in forced colors the label, the asterisk, the supporting text and the error text are drawn in the platform’s text color and each requirement tag has a visible edge; an error is not told from help by a color of the field’s own', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    const fixtures = [...spec.fixtures.filter((f) => ['slider-required', 'slider-optional', 'slider-supporting', 'slider-error', 'slider-required-disabled'].includes(f.id)), fx('asterisk', { label: 'Volume', required: true, requiredMark: 'asterisk' })];
    expect(fixtures).toHaveLength(6);
    await mount(page, fixtures);
    await placement(page, 'append');
    await expect(part(page, 'asterisk', '.asterisk')).toHaveCount(1);
    await forcedColorsHold(page, fixtures);
    // The error and the help look alike: the words and the invalid state carry the error.
    // (The two texts, drawn in one color, are told apart by their words and their order: the help first.)
    expect(await css(part(page, 'slider-error', '.error-text'), 'color')).toBe(await css(part(page, 'slider-error', '.supporting-text'), 'color'));
    expect(await css(part(page, 'slider-error', '.error-text'), 'color')).toBe(await css(part(page, 'slider-supporting', '.supporting-text'), 'color'));
    expect(await part(page, 'slider-error', '.texts').evaluate((el) => [...el.children].map((child) => child.getAttribute('part')))).toEqual(['supporting-text', 'error-text']);
    expect((await semantics(page, 'slider-error')).invalid).toBe(true);
  });

  // Every fixture of the spec, a part at a time (`PARTS`).
  for (const { name, fixtures } of PARTS) {
    test(`FLD-17: in forced colors every fixture's label, asterisk and supporting or error text are in the platform’s text color and its requirement tag has an edge — ${name}`, async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await mount(page, fixtures);
      await forcedColorsHold(page, fixtures);
    });
  }

  test('FLD-18: in right-to-left the layout mirrors — the label row, the control and the supporting row start at the right edge, the glyph stands at the right of the label and the requirement mark at its left', async ({ page }) => {
    await mountSpec(page, 'slider-rtl', 'slider-error-rtl', 'ltr-label-rtl');
    const h = await box(host(page, 'slider-rtl'));
    const [glyph, label, tag, supporting] = [await box(part(page, 'slider-rtl', '.label-icon')), await box(part(page, 'slider-rtl', '.label')), await box(part(page, 'slider-rtl', '.required-tag')), await box(part(page, 'slider-rtl', '.supporting-text'))];
    near(glyph.x + glyph.width, h.x + h.width, 'the glyph is at the right edge');
    expect(label.x + label.width, 'the label is at the left of the glyph').toBeLessThanOrEqual(glyph.x + 0.5);
    near(glyph.x - (label.x + label.width), await token(page, 'label-icon-gap'), 'label-icon.gap');
    near(label.x - (tag.x + tag.width), await token(page, 'requirement-gap'), 'the mark is at the left of the label, requirement.gap from it');
    near(supporting.x + supporting.width, h.x + h.width, 'the supporting row starts at the right edge');
    expect(await css(part(page, 'slider-rtl', '.supporting-text'), 'text-align')).toBe('right');
    // A control with a size of its own stands at the right edge.
    const [own, field] = [await box(control(page, 'ltr-label-rtl')), await box(host(page, 'ltr-label-rtl'))];
    near(own.x + own.width, field.x + field.width, 'the switch is at the right edge');
  });

  test('FLD-19: the direction is the nearest ancestor’s, not the root’s and not a setting of the field’s own; when it changes while the field is shown the field is drawn for the new direction at once, keeping its control with its value and focus', async ({ page }) => {
    await mount(page, [fx('a', { label: 'Notifications', required: true, supportingText: 'Help.' }, toggle({ selected: true }))]);
    expect(await host(page, 'a').evaluate((el) => 'dir' in el.constructor.prototype && Object.hasOwn(el.constructor.prototype, 'dir'))).toBe(false);
    const edges = async () => {
      const [h, label, own] = [await box(host(page, 'a')), await box(part(page, 'a', '.label')), await box(control(page, 'a'))];
      return { labelAtStart: Math.abs(label.x - h.x) < 0.6, labelAtEnd: Math.abs(label.x + label.width - (h.x + h.width)) < 0.6, controlAtStart: Math.abs(own.x - h.x) < 0.6, controlAtEnd: Math.abs(own.x + own.width - (h.x + h.width)) < 0.6 };
    };
    expect(await edges()).toMatchObject({ labelAtStart: true, controlAtStart: true });
    await control(page, 'a').locator('input').focus();
    const before = await control(page, 'a').evaluateHandle((el) => el);
    // An ancestor inside the page, not the root.
    await stage(page, 'a').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await edges()).toMatchObject({ labelAtEnd: true, controlAtEnd: true });
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    expect(await control(page, 'a').evaluate((el, was) => el === was && (el as HTMLElement & { selected: boolean }).selected, before), 'the same control, with its value').toBe(true);
    expect(await activeInside(page, 'a'), 'and its focus').toBe(true);
    await stage(page, 'a').evaluate((el) => el.setAttribute('dir', 'ltr'));
    expect(await edges()).toMatchObject({ labelAtStart: true, controlAtStart: true });
  });

  test('FLD-20: in right-to-left the icon helper mirrors the glyph of the label-icon slot when the icon set marks its name or the product forces it, inside its own box, and not when the product forbids it or the name is unmarked; the field mirrors nothing itself', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => f.id === 'slider-rtl' || f.id === 'slider-label-icon'),
      fx('unmarked', { label: 'Volume' }, slider(), { slots: { 'label-icon': 'favorite' }, direction: 'rtl' }),
      fx('forbidden', { label: 'Volume' }, '<tanrei-slider value="40"></tanrei-slider><span slot="label-icon" data-mirror="never">volume_up</span>', { direction: 'rtl' }),
      fx('forced', { label: 'Volume' }, '<tanrei-slider value="40"></tanrei-slider><span slot="label-icon" data-mirror="always">favorite</span>', { direction: 'rtl' }),
    ]);
    const mirrored = (id: string) => host(page, id).locator('[slot="label-icon"]').evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a < 0);
    await expect.poll(() => mirrored('slider-rtl')).toBe(true);
    expect(await mirrored('slider-label-icon'), 'not in left-to-right').toBe(false);
    expect(await mirrored('unmarked')).toBe(false);
    expect(await mirrored('forbidden')).toBe(false);
    expect(await mirrored('forced')).toBe(true);
    // In its own box: the place and the size are the layout's.
    const [glyph, h] = [await box(part(page, 'slider-rtl', '.label-icon')), await box(host(page, 'slider-rtl'))];
    near(glyph.x + glyph.width, h.x + h.width, 'its place is FLD-18’s');
    near(glyph.width, await token(page, 'label-icon-size'), 'its size is unchanged');
    // The field's own boxes carry no transform.
    expect(await css(part(page, 'slider-rtl', '.label-icon'), 'transform')).toBe('none');
    expect(await css(part(page, 'slider-rtl', '.label-row'), 'transform')).toBe('none');
  });

  test('FLD-21: the label, the supporting or error text and the tag’s text are each text of their own direction, isolated — a left-to-right label keeps its order in a right-to-left layout — and are still placed and aligned by the layout direction', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => f.id === 'ltr-label-rtl'), fx('rtl-tag', { label: 'مستوى الصوت', required: true, supportingText: 'LE Audio, 2 Mbps' }, slider(), { direction: 'rtl' })]);
    const id = 'ltr-label-rtl';
    for (const selector of ['.label', '.supporting-text']) {
      expect(await css(part(page, id, selector), 'unicode-bidi'), selector).toBe('plaintext');
      expect(await css(part(page, id, selector), 'text-align'), selector).toBe('right');
      expect(await css(part(page, id, selector), 'direction'), `${selector}: the box keeps the layout’s direction`).toBe('rtl');
    }
    // A left-to-right text keeps its order: "Bluetooth" is at the left of "5.3", "LE Audio," at the left of "2 Mbps".
    const order = (selector: string, first: string, second: string) =>
      part(page, id, selector).evaluate(
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
    expect(await order('.label', 'Bluetooth', '5.3')).toBe(true);
    expect(await order('.supporting-text', 'LE Audio', 'Mbps')).toBe(true);
    // Placed by the layout: the text ends at the right edge.
    const [label, h] = [await box(part(page, id, '.label')), await box(host(page, id))];
    near(label.x + label.width, h.x + h.width, 'the label is placed at the right edge');
    // The tag's text is the Tag's own run (TAG-18): "Required" in a right-to-left field is laid out left to right.
    expect(await part(page, 'rtl-tag', '.required-tag').locator('.label').evaluate((el) => [getComputedStyle(el).unicodeBidi, el.getAttribute('dir')])).toEqual(['plaintext', 'auto']);
  });

  test('FLD-22: a requiredMark the field does not know behaves as auto, reported in debug builds', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('mark', { label: 'Notifications', required: true, requiredMark: 'star' }, toggle())]);
    await expect(part(page, 'mark', '.required-tag')).toBeVisible();
    await expect(part(page, 'mark', '.asterisk')).toBeHidden();
    expect((await semantics(page, 'mark')).required).toBe(true);
    const reports = seen.filter((w) => w.includes('FLD-22'));
    expect(reports.filter((w) => w.includes('requiredMark "star"'))).toHaveLength(1);
    // `chip` is not a mark's name (the mark is the Tag's): an unknown name, it behaves as auto.
    await set(page, 'mark', { requiredMark: 'chip' });
    await expect(part(page, 'mark', '.required-tag')).toBeVisible();
    await expect(part(page, 'mark', '.asterisk')).toBeHidden();
    await expect.poll(() => seen.filter((w) => w.includes('FLD-22') && w.includes('requiredMark "chip"')).length).toBe(1);
  });

  test('FLD-23: the field leaves its control what it is — it emits no event, holds no value and takes no part in a form, and the control keeps its place in one; a control that replaces another is named, described and marked at once, and the old one gets back everything it was given', async ({ page }) => {
    await mount(page, [
      fx('form', { label: 'Volume', supportingText: 'Help.' }, '<tanrei-slider name="volume" value="40"></tanrei-slider>'),
      fx('swap', { label: 'City', supportingText: 'Help.', error: true, required: true, disabled: true }, '<input id="old" aria-description="Mine." />'),
      fx('swap-tanrei', { label: 'Volume', supportingText: 'Help.', error: true, disabled: true }),
    ]);
    // Not form-associated, no value; the control is still the form's.
    expect(await host(page, 'form').evaluate((el) => [(el.constructor as unknown as { formAssociated?: boolean }).formAssociated === true, 'value' in el, 'name' in el])).toEqual([false, false, false]);
    expect(
      await host(page, 'form').evaluate((el) => {
        const form = document.createElement('form');
        el.before(form);
        form.append(el);
        const entries = [...new FormData(form).entries()].map(([name, value]) => `${name}=${String(value)}`);
        form.replaceWith(el);
        return entries;
      }),
    ).toEqual(['volume=40']);
    // It emits nothing of its own: what is heard on it is the control's event, with the control as its target.
    const heard = await host(page, 'form').evaluateHandle((el) => {
      const events: string[] = [];
      for (const type of ['input', 'change']) el.addEventListener(type, (event) => events.push(`${type}:${(event.target as Element).localName}`));
      return events;
    });
    await control(page, 'form').locator('[role="slider"]').focus();
    await page.keyboard.press('ArrowRight');
    await set(page, 'form', { error: true, errorText: 'Too loud.', disabled: false, label: 'Level' });
    expect([...new Set(await heard.jsonValue())]).toEqual(['input:tanrei-slider', 'change:tanrei-slider']);
    // A plain element that leaves gets back exactly what it had; the one that came is named, described and marked.
    const given = (selector: string) => page.locator(selector).evaluate((el: HTMLInputElement) => [...['aria-label', 'aria-description', 'aria-invalid', 'aria-required'].map((name) => el.getAttribute(name)), el.disabled]);
    expect(await given('#old')).toEqual(['City', 'Mine. Help.', 'true', 'true', true]);
    await host(page, 'swap').evaluate(async (el) => {
      const next = document.createElement('input');
      next.id = 'new';
      const old = el.querySelector('#old')!;
      old.replaceWith(next);
      document.body.append(old);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    expect(await given('#old')).toEqual([null, 'Mine.', null, null, false]);
    expect(await given('#new')).toEqual(['City', 'Help.', 'true', 'true', true]);
    // A Tanrei control that leaves is let go, and the one that came is told.
    const old = await control(page, 'swap-tanrei').evaluateHandle((el) => el);
    await host(page, 'swap-tanrei').evaluate(async (el) => {
      const next = document.createElement('tanrei-slider');
      const was = el.querySelector('tanrei-slider')!;
      was.replaceWith(next);
      document.body.append(was);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    expect(
      await old.evaluate((el) => {
        const handle = el.shadowRoot!.querySelector('[role="slider"]')!;
        return ['aria-label', 'aria-description', 'aria-invalid', 'aria-disabled'].map((name) => handle.getAttribute(name));
      }),
    ).toEqual([null, null, null, null]);
    expect(await semantics(page, 'swap-tanrei')).toMatchObject({ name: 'Volume', description: 'Help.', invalid: true, disabled: true });
  });

  test('FLD-10, FLD-11: a control defined after its field, and one that was upgraded before its field was, are each named and described once they both exist; a control the product built may ask with the same event', async ({ page }) => {
    await mount(page, [fx('late', { label: 'Volume', supportingText: 'Help.' }, '<acme-level></acme-level>'), fx('asks', { label: 'Level', supportingText: 'From 1 to 10.', error: true }, '<acme-asks></acme-asks>')]);
    // Not defined yet: it is given nothing.
    expect(await control(page, 'late').getAttribute('aria-label')).toBeNull();
    await page.evaluate(async () => {
      customElements.define('acme-level', class extends HTMLElement {});
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    // Defined, and it does not ask: it receives the attributes.
    expect(await control(page, 'late').evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-description')])).toEqual(['Volume', 'Help.']);
    // One that asks is told through its connection, and receives no attribute.
    const told = await page.evaluate(async () => {
      const states: unknown[] = [];
      customElements.define(
        'acme-asks',
        class extends HTMLElement {
          connectedCallback() {
            this.dispatchEvent(
              new CustomEvent('tanrei-field-connect', { bubbles: true, composed: true, detail: { control: this, takes: 'all', errorCondition: false, framed: false, named: () => false, update: (state: unknown) => states.push(state) } }),
            );
          }
        },
      );
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return states;
    });
    expect(told.at(-1)).toEqual({ label: 'Level', description: 'From 1 to 10.', invalid: true, required: false, requiredText: 'Required', disabled: false, labelHidden: false, requiredMark: 'none', optionalText: '' });
    expect(await control(page, 'asks').getAttribute('aria-label')).toBeNull();
  });

  for (const kind of ['file-picker', 'file-upload'] as const) {
    test(`FLD-8, FLD-10, FLD-11, FLD-12, FLD-14: a ${kind === 'file-picker' ? 'file picker' : 'file upload'} as the field’s control (the fixture ${kind}-required-error) is one group of the field’s label holding the product’s trigger, which is described by the limits${kind === 'file-picker' ? ', the text beside it' : ''}, the field’s error text and its required word, invalid with the field and disabled with it; a press on the label moves focus to the trigger and opens nothing${kind === 'file-upload' ? ' — the file upload answers its inner file picker in the field’s place' : ''}`, async ({ page, browserName }) => {
      const id = `${kind}-required-error`;
      const fixture = spec.fixtures.find((f) => f.id === id)!;
      const item = fixture.items![0];
      page.on('filechooser', () => {});
      const logged = warnings(page);
      page.on('console', (message) => void (message.type() === 'error' && logged.push(message.text())));
      await mount(page, [fixture]);
      const held = control(page, id);
      expect(await held.evaluate((el) => el.localName)).toBe(`tanrei-${kind}`);
      const button = held.locator(':scope > tanrei-button[slot="trigger"]');
      const native = button.locator('[part="container"]');
      await expect(button).toHaveText(String(item.content));
      // One group, named by the field's label; the control has no label of its own (FLD-10).
      await expect(stage(page, id).getByRole('group', { name: 'Attachment', exact: true })).toHaveCount(1);
      await expect(stage(page, id).getByRole('group')).toHaveCount(1);
      await expect(stage(page, id).getByRole('button', { name: 'Choose a file', exact: true })).toHaveCount(1);
      // The description (FLD-11): the control's own — the limits, then the text beside the trigger — then the field's
      // help (these fixtures have none), its error text, and the required word: a button's role has no required state.
      const own = [item.props.constraintsText, item.props.selectionText].filter(Boolean).join(' ');
      await expect.poll(() => native.getAttribute('aria-description')).toBe(`${own} Choose a PDF of 10 MB or less. Required`);
      // The error condition (FLD-8): the trigger is invalid, and nothing of the field's is written on the control's own props.
      await expect(native).toHaveAttribute('aria-invalid', 'true');
      expect(await held.evaluate((el: HTMLElement & { error: boolean; required: boolean; disabled: boolean; label: string }) => [el.error, el.required, el.disabled, el.label])).toEqual([false, false, false, '']);
      // The limits are drawn below the trigger and still read while the field shows its error.
      await expect(held.locator('.supporting').first()).toHaveText(String(item.props.constraintsText));
      await expect(part(page, id, '.error-text')).toHaveText('Choose a PDF of 10 MB or less.');
      if (browserName === 'chromium') {
        expect(await axNode(page, 'group')).toMatchObject({ name: 'Attachment' });
        expect(await axNode(page, 'button')).toMatchObject({ name: 'Choose a file', description: `${own} Choose a PDF of 10 MB or less. Required`, invalid: 'true' });
        expect(await axNode(page, 'button', 1), 'one button').toBeNull();
      }
      // A press on the label (FLD-12): focus on the trigger, and nothing opens.
      let pickers = 0;
      page.on('filechooser', () => pickers++);
      await part(page, id, '.label').click();
      expect(await button.evaluate((el) => el.matches(':focus-within') || el === document.activeElement)).toBe(true);
      expect(await activeInside(page, id)).toBe(true);
      await frames(page, 4);
      expect(pickers).toBe(0);
      // The error leaves: told at once, and the help — there is none — leaves the required word alone.
      await set(page, id, { error: false });
      await expect.poll(() => native.getAttribute('aria-description')).toBe(`${own} Required`);
      await expect(native).not.toHaveAttribute('aria-invalid', 'true');
      // Disabled with the field (FLD-14), and given back as it was.
      await set(page, id, { disabled: true });
      await expect(native).toBeDisabled();
      await button.click({ force: true });
      await frames(page, 4);
      expect(pickers).toBe(0);
      await set(page, id, { disabled: false });
      await expect(native).toBeEnabled();
      expect(await button.evaluate((el) => el.hasAttribute('disabled'))).toBe(false);
      const [picker] = await Promise.all([page.waitForEvent('filechooser'), button.click()]);
      expect(picker.isMultiple()).toBe(false);
      // Nothing is reported: one control, named once (FLD-15, FLD-10).
      expect(logged.filter((text) => /FLD-|FPK-|FUP-/.test(text))).toEqual([]);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('FLD-24: the field has no words of its own — requiredText and optionalText are the instance’s, else the product’s words, else nothing: without the required word the asterisk stands in the tag’s place and the required state is kept, without the optional word no tag is drawn and nothing joins the description, and each is reported once, naming the prop', async ({ page }) => {
    const seen = warnings(page);
    const bare = (id: string, props: Fixture['props'], inside: FixtureItem = slider()): Fixture => ({ id, props: { label: 'Volume', ...props }, items: [inside] });
    await mount(page, [
      bare('auto', { required: true }),
      bare('tag', { required: true, requiredMark: 'tag' }),
      bare('none', { required: true, requiredMark: 'none' }),
      bare('second', { required: true }),
      bare('optional', { required: false, optional: true }),
      bare('text', { required: true }, toggle()),
      bare('own', { required: true, requiredText: 'Needed' }),
      bare('own-optional', { required: false, optional: true, optionalText: 'If you like' }),
    ]);
    const drawn = async (id: string) => ({
      tag: (await part(page, id, '.requirement-tag').count()) > 0 && (await part(page, id, '.requirement-tag').isVisible()) ? await part(page, id, '.requirement-tag').getAttribute('label') : null,
      asterisk: (await part(page, id, '.asterisk').count()) > 0 && (await part(page, id, '.asterisk').isVisible()),
    });
    // No words set: the asterisk of FLD-6 in the tag's place, in its color and kept from assistive technology.
    for (const id of ['auto', 'tag', 'second', 'text']) expect(await drawn(id), id).toEqual({ tag: null, asterisk: true });
    await expect(part(page, 'tag', '.asterisk')).toHaveText('*');
    expect(await part(page, 'tag', '.asterisk').getAttribute('aria-hidden')).toBe('true');
    expect(await css(part(page, 'tag', '.asterisk'), 'color')).toBe(await color(page, 'standard-required-asterisk-color'));
    expect(await drawn('none'), 'a field that draws no mark draws none without the word either').toEqual({ tag: null, asterisk: false });
    // The required state is kept on the control (FLD-10).
    expect(await semantics(page, 'text')).toMatchObject({ required: true, invalid: false });
    // No optional word: no tag, and nothing joins the description.
    expect(await drawn('optional')).toEqual({ tag: null, asterisk: false });
    expect((await semantics(page, 'optional')).description).toBeNull();
    // An instance's own words are drawn with no set of the product's.
    expect(await drawn('own')).toEqual({ tag: 'Needed', asterisk: false });
    expect(await drawn('own-optional')).toEqual({ tag: 'If you like', asterisk: false });
    // Reported once per word and page, naming the prop — however many fields lack it; `none` needs no word.
    const reports = seen.filter((w) => w.includes('FLD-24'));
    expect(reports).toHaveLength(2);
    expect(reports.find((w) => w.includes('requiredText'))).toContain('required-text is empty');
    expect(reports.find((w) => w.includes('optionalText'))).toContain('optional-text is empty');
    expect(await missingWords(page)).toEqual(['optionalText', 'requiredText']);
    // No English word that the test did not give is drawn or exposed.
    const said = await page.evaluate(() => [...document.querySelectorAll('tanrei-field')].map((el) => `${el.shadowRoot!.textContent} ${[...el.shadowRoot!.querySelectorAll('tanrei-tag')].map((tag) => tag.getAttribute('label')).join(' ')}`).join(' '));
    expect(said).not.toMatch(/Required|Optional/);
    // Under a system whose mark is none, a field that does not say draws nothing, with or without the word.
    await override(page, { [T('requirement-mark')]: 'none' });
    await set(page, 'auto', { requiredMark: '' });
    await set(page, 'auto', { requiredMark: 'auto' });
    expect(await drawn('auto')).toEqual({ tag: null, asterisk: false });
    expect(await drawn('tag'), 'a field that says tag keeps the asterisk in its place').toEqual({ tag: null, asterisk: true });
    await override(page, { [T('requirement-mark')]: 'tag' });
    await set(page, 'auto', { requiredMark: '' });
    await set(page, 'auto', { requiredMark: 'auto' });
    // The product's words, set once: every instance without the props draws them, at once.
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional' });
    for (const id of ['auto', 'tag', 'second', 'text']) expect(await drawn(id), id).toEqual({ tag: 'Required', asterisk: false });
    expect(await drawn('optional')).toEqual({ tag: 'Optional', asterisk: false });
    expect((await semantics(page, 'optional')).description).toBe('Optional');
    expect(await missingWords(page)).toEqual([]);
    // An instance's own prop wins.
    expect(await drawn('own')).toEqual({ tag: 'Needed', asterisk: false });
    expect(await drawn('own-optional')).toEqual({ tag: 'If you like', asterisk: false });
    expect((await semantics(page, 'own-optional')).description).toBe('If you like');
  });
});

test.describe('a control that is a box: a text input', () => {
  const input = (id: string) => control(page_, id);
  let page_: P;
  test.beforeEach(({ page }) => {
    page_ = page;
  });
  const typed = (id: string) => input(id).locator('.input');
  const floating = (id: string) => input(id).locator('label.label');
  const I = (page: P, name: string) => resolveToken(page, `--tanrei-comp-input-box-${name}`);

  test('FLD-25: while its control draws the label itself the field draws no label row, no gap, no glyph and no tag, still names the control, and gives it whether the label is hidden and the required mark — an asterisk for its tag and its asterisk alike, none otherwise; and the optional word while the control is optional; its supporting row, its error and the description stay; a label glyph is reported; a press on that label is the control’s; and the row goes or comes at once when the control starts or stops', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('floats', { label: 'Email', supportingText: 'Help.', required: true }, textInput({ variant: 'outlined' })),
      fx('stacked', { label: 'Email', supportingText: 'Help.', required: true }, textInput({ variant: 'stacked' })),
      fx('asterisk', { label: 'Email', required: true, requiredMark: 'asterisk' }, textInput({ variant: 'outlined' })),
      fx('none', { label: 'Email', required: true, requiredMark: 'none' }, textInput({ variant: 'filled' })),
      fx('hidden', { label: 'Email', labelHidden: true, required: true }, textInput({ variant: 'outlined' })),
      fx('optional', { label: 'Company', required: false, optional: true, error: true, errorText: 'Wrong.' }, textInput({ variant: 'outlined' })),
      { ...fx('glyph', { label: 'Name' }, textInput({ variant: 'outlined' })), slots: { 'label-icon': 'person' } },
      fx('slider', { label: 'Volume', required: true }),
    ]);
    // No label row and no gap: the control stands at the field's top, and floats the field's label in its own box.
    for (const [id, label] of [['floats', 'Email*'], ['asterisk', 'Email*'], ['none', 'Email'], ['optional', 'Company Optional'], ['glyph', 'Name']] as const) {
      await expect(part(page, id, '.label-row'), id).toHaveCount(0);
      await expect(part(page, id, '.label-icon, .requirement-tag'), id).toHaveCount(0);
      near((await box(input(id))).y, (await box(host(page, id))).y, `${id}: nothing above the control`);
      await expect(floating(id), id).toHaveText(label);
    }
    // The name is still the field's label.
    await expect(input('floats').getByRole('textbox', { name: 'Email', exact: true })).toHaveCount(1);
    // The mark: under auto the default system's tag reaches a floating label as the asterisk; none where the field says none.
    await expect(floating('floats').locator('.asterisk')).toHaveCount(1);
    await expect(floating('asterisk').locator('.asterisk')).toHaveCount(1);
    await expect(floating('none').locator('.asterisk')).toHaveCount(0);
    for (const id of ['floats', 'asterisk', 'none', 'hidden']) await expect(typed(id), id).toHaveJSProperty('required', true);
    // labelHidden: the control draws none either, and keeps the name.
    await expect(part(page, 'hidden', '.label-row')).toHaveCount(0);
    await expect(floating('hidden')).toHaveCount(0);
    await expect(input('hidden').getByRole('textbox', { name: 'Email', exact: true })).toHaveCount(1);
    // The supporting row, the error condition and the description are unchanged.
    await expect(part(page, 'floats', '.supporting-text')).toHaveText('Help.');
    await expect(input('floats').getByRole('textbox')).toHaveAccessibleDescription('Help.');
    await expect(part(page, 'optional', '.error-text')).toHaveText('Wrong.');
    expect(await css(part(page, 'optional', '.error-text'), 'color')).toBe(await color(page, 'standard-error-text-color'));
    await expect(typed('optional')).toHaveAttribute('aria-invalid', 'true');
    // Optional: the control is given the optional word, which it draws after its floating label, kept from assistive
    // technology — its text stays in the description; nothing is reported. The glyph is (FLD-3).
    await expect(floating('optional').locator('.optional')).toHaveText('Optional');
    expect(await floating('optional').locator('.optional').getAttribute('aria-hidden')).toBe('true');
    await expect(floating('floats').locator('.optional')).toHaveCount(0);
    await expect(input('optional').getByRole('textbox')).toHaveAccessibleDescription('Wrong. Optional');
    await expect.poll(() => seen.filter((w) => w.includes('FLD-3') && w.includes('draws the label itself')).length).toBe(1);
    expect(seen.filter((w) => w.includes('FLD-25'))).toHaveLength(0);
    // A control that floats nothing, and a control that says nothing, are framed as before.
    await expect(part(page, 'stacked', '.label-row')).toHaveCount(1);
    await expect(part(page, 'stacked', '.required-tag')).toHaveCount(1);
    await expect(input('stacked').locator('label')).toHaveCount(0);
    await expect(part(page, 'slider', '.label-row')).toHaveCount(1);
    // A press on a label the control draws is the control's to answer (TXI-8): it focuses the input.
    await press(floating('floats'));
    expect(await activeInside(page, 'floats')).toBe(true);
    await page.locator('body').click({ position: { x: 700, y: 5 } });
    // The control starts and stops drawing the label: the row goes and comes at once.
    await input('stacked').evaluate((el) => ((el as HTMLElement & { variant: string }).variant = 'outlined'));
    await expect(part(page, 'stacked', '.label-row')).toHaveCount(0);
    await expect(floating('stacked')).toHaveText('Email*');
    await input('stacked').evaluate((el) => ((el as HTMLElement & { variant: string }).variant = 'stacked'));
    await expect(part(page, 'stacked', '.label-row')).toHaveCount(1);
    await expect(input('stacked').locator('label')).toHaveCount(0);
    // auto under a system that marks none: no asterisk is given; the field's own mark still is.
    await override(page, { [T('requirement-mark')]: 'none' });
    await expect(floating('floats').locator('.asterisk')).toHaveCount(0);
    await expect(floating('asterisk').locator('.asterisk')).toHaveCount(1);
    await expect(typed('floats')).toHaveJSProperty('required', true);
  });

  test('FLD-26: where its control says how far its content is inset, the supporting row starts that far from the field’s start edge and ends that far before its end edge — where a text input’s text starts, past a leading icon — and follows at once when what the control says changes; the label row stays at the field’s edges, and a control that says nothing has the row at the field’s edges', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['text-stacked-supporting', 'text-stacked-error', 'slider-supporting'].includes(f.id)),
      fx('icons', { label: 'Search', supportingText: 'Help.', countText: '0/40' }, { kind: 'text-input', props: { variant: 'stacked' }, content: 'leading-icon=search trailing-icon=close' }),
      fx('rtl', { label: 'Email', supportingText: 'Help.', countText: '0/40' }, textInput({}), { direction: 'rtl' }),
    ]);
    const [pad, padIcon, icon, gap] = [await I(page, 'container-padding-inline-medium'), await I(page, 'container-padding-inline-with-icon-medium'), await I(page, 'icon-size-medium'), await I(page, 'container-gap-medium')];
    for (const id of ['text-stacked-supporting', 'text-stacked-error']) {
      // (The help, or — in the fixture in error, which has no help — the error text: the row's first line either way.)
      const [h, text, label] = [await box(host(page, id)), await box(part(page, id, id === 'text-stacked-error' ? '.error-text' : '.supporting-text')), await box(part(page, id, '.label'))];
      near(text.x - h.x, pad, `${id}: the row starts at the control’s inline padding`);
      near(text.x, (await box(typed(id))).x, `${id}: where the input’s text starts`);
      near(label.x, h.x, `${id}: the label row stays at the field’s edge`);
    }
    // Past a leading icon; and the row ends at the padding the input keeps beside a trailing one.
    const [h, text, count] = [await box(host(page, 'icons')), await box(part(page, 'icons', '.supporting-text')), await box(part(page, 'icons', '.counter'))];
    near(text.x - h.x, padIcon + icon + gap, 'past the leading icon and its gap');
    near(text.x, (await box(typed('icons'))).x, 'where the input’s text starts');
    near(h.x + h.width - (count.x + count.width), padIcon, 'the row ends at the end padding');
    // Right-to-left: the same distances, from the right edge and to the left one.
    const [hr, textR, countR] = [await box(host(page, 'rtl')), await box(part(page, 'rtl', '.supporting-text')), await box(part(page, 'rtl', '.counter'))];
    near(hr.x + hr.width - (textR.x + textR.width), pad, 'right-to-left: from the right edge');
    near(countR.x - hr.x, pad, 'right-to-left: the count before the left edge');
    // A control that says nothing: at the field's edges.
    near((await box(part(page, 'slider-supporting', '.supporting-text'))).x, (await box(host(page, 'slider-supporting'))).x, 'a slider’s row is at the field’s edge');
    expect(await part(page, 'slider-supporting', '.supporting').getAttribute('style')).toBeNull();
    // What the control says changes — its size, an icon that goes — and the row follows at once.
    const starts = async (id: string) => (await box(part(page, id, '.supporting-text'))).x - (await box(host(page, id))).x;
    await input('text-stacked-supporting').evaluate((el) => ((el as HTMLElement & { size: string }).size = 'large'));
    await expect.poll(async () => Math.abs((await starts('text-stacked-supporting')) - (await I(page, 'container-padding-inline-large')))).toBeLessThan(0.6);
    await input('icons').evaluate((el) => el.querySelector('[slot="leading-icon"]')!.remove());
    await expect.poll(async () => Math.abs((await starts('icons')) - pad)).toBeLessThan(0.6);
    expect(await css(part(page, 'icons', '.supporting'), 'transition-duration')).toBe('0s');
  });

  test('FLD-27: the count the field is given is drawn at the end of the supporting row’s first line — beside the help, or beside the error text where there is no help, and in that place when the error text comes or goes below a help — on one line, at least counter.gap from every line of both texts, in the supporting text’s style with figures of one width and in its own color in every condition — and alone in the row where there is no text; it is drawn as given, kept from assistive technology, never counted or announced; a press on it does nothing; a new one is drawn at once and an empty one takes the part away', async ({ page }) => {
    const long = 'A few words about yourself, long enough to wrap onto a second line of the row.';
    await mount(page, [
      ...spec.fixtures.filter((f) => ['text-stacked-counter', 'text-outlined-counter', 'text-stacked-supporting-error-counter'].includes(f.id)),
      fx('long-both', { label: 'Bio', supportingText: long, error: true, errorText: `Too long: ${long}`, countText: '41/40' }, textInput({ value: 'Hi' })),
      fx('long', { label: 'Bio', supportingText: long, countText: '4/40' }, textInput({ value: 'Hi' })),
      fx('alone', { label: 'Volume', countText: '12' }),
      fx('wrong', { label: 'Bio', error: true, errorText: 'Too long.', countText: '41/40' }, textInput({ value: 'Hi' })),
      fx('off', { label: 'Bio', disabled: true, supportingText: 'Help.', countText: '1/2' }, textInput({ value: 'H' })),
      fx('rtl', { label: 'Volume', supportingText: 'Help.', countText: '3/9' }, slider(), { direction: 'rtl' }),
    ]);
    await placement(page, 'append');
    const counter = (id: string) => part(page, id, '.counter');
    await expect(counter('text-stacked-counter')).toHaveText('12/40');
    await expect(counter('text-outlined-counter')).toHaveText('12/40');
    // One line, figures of one width, the supporting text's style, its own color.
    for (const id of ['text-stacked-counter', 'long', 'alone']) {
      expect(await css(counter(id), 'white-space-collapse').then((value) => value || 'collapse'), id).toBe('collapse');
      expect(await css(counter(id), 'text-wrap-mode').then((value) => value || 'nowrap'), id).toBe('nowrap');
      expect(await css(counter(id), 'font-variant-numeric'), id).toContain('tabular-nums');
      expect(await css(counter(id), 'font-size'), id).toBe(`${await token(page, 'supporting-text-typescale-font-size')}px`);
      expect(await css(counter(id), 'color'), id).toBe(await color(page, 'standard-counter-color'));
      await expect(counter(id), id).toHaveAttribute('aria-hidden', 'true');
    }
    expect(await css(counter('wrong'), 'color')).toBe(await color(page, 'standard-error-counter-color'));
    expect(await css(counter('off'), 'color')).toBe(await color(page, 'standard-disabled-counter-color'));
    // At the end of the row, on the first line while the text beside it wraps, never nearer than counter.gap.
    const [text, count, rowBox] = [await box(part(page, 'long', '.supporting-text')), await box(counter('long')), await box(part(page, 'long', '.supporting'))];
    expect(text.height, 'the text wraps').toBeGreaterThan(count.height * 1.5);
    near(count.y, text.y, 'the count is on the first line');
    expect(count.x - (text.x + text.width)).toBeGreaterThanOrEqual((await token(page, 'counter-gap')) - 0.6);
    near(count.x + count.width, rowBox.x + rowBox.width - Number.parseFloat(await css(part(page, 'long', '.supporting'), 'padding-inline-end')), 'at the end of the row');
    // Beside an error text with no help: on that text's line, the row's first.
    near((await box(counter('wrong'))).y, (await box(part(page, 'wrong', '.error-text'))).y, 'no help: the count is on the error text’s line');
    // With a help and an error text: on the help's line; both texts wrap in the room it leaves and keep counter.gap.
    {
      const [help, wrong, mine] = [await box(part(page, 'long-both', '.supporting-text')), await box(part(page, 'long-both', '.error-text')), await box(counter('long-both'))];
      near(mine.y, help.y, 'the count is on the help’s first line');
      expect(wrong.height, 'the error text wraps').toBeGreaterThan(mine.height * 1.5);
      for (const [name, text] of [['help', help], ['error text', wrong]] as const) expect(mine.x - (text.x + text.width), `counter.gap from the ${name}`).toBeGreaterThanOrEqual((await token(page, 'counter-gap')) - 0.6);
    }
    // It keeps its place when the error text comes or goes below a help.
    {
      const id = 'text-stacked-supporting-error-counter';
      const at = async () => {
        const [mine, field] = [await box(counter(id)), await box(host(page, id))];
        return [mine.x - field.x, mine.y - field.y];
      };
      near((await box(counter(id))).y, (await box(part(page, id, '.supporting-text'))).y, 'the count is on the help’s line');
      await expect(part(page, id, '.error-text')).toHaveCount(1);
      const withError = await at();
      await set(page, id, { error: false });
      await expect(part(page, id, '.error-text')).toHaveCount(0);
      const without = await at();
      near(without[0]!, withError[0]!, 'the count does not move sideways');
      near(without[1]!, withError[1]!, 'the count does not move up or down');
      await set(page, id, { error: true });
      near((await at())[1]!, withError[1]!, 'nor when the error text comes back');
    }
    // Alone: the row is drawn for the count, at its end, supporting-text.gap below the control.
    await expect(part(page, 'alone', '.supporting-text')).toHaveCount(0);
    const [alone, framed, hostBox] = [await box(counter('alone')), await box(control(page, 'alone')), await box(host(page, 'alone'))];
    near(alone.y - (framed.y + framed.height), await token(page, 'supporting-text-gap'), 'the gap above the row');
    near(alone.x + alone.width, hostBox.x + hostBox.width, 'at the end edge');
    // Right-to-left: at the left end of the row.
    near((await box(counter('rtl'))).x, (await box(host(page, 'rtl'))).x, 'right-to-left: at the left edge');
    // Kept from assistive technology, and nothing of it reaches the control: the description is the help alone.
    expect((await semantics(page, 'rtl')).description).toBe('Help.');
    expect((await semantics(page, 'alone')).description).toBeNull();
    // Focused: the focused token (FLD-13).
    await override(page, { [T('standard-focused-counter-color')]: 'rgb(7, 0, 0)' });
    await tabTo(page, control(page, 'alone'));
    await expect.poll(() => css(counter('alone'), 'color')).toBe('rgb(7, 0, 0)');
    await page.locator('body').click({ position: { x: 700, y: 5 } });
    // A press on the count does nothing.
    await press(counter('text-stacked-counter'));
    expect(await activeInside(page, 'text-stacked-counter')).toBe(false);
    // Drawn as given — the field counts nothing — and a new one at once, with no announcement.
    await set(page, 'alone', { countText: 'three of nine' });
    await expect(counter('alone')).toHaveText('three of nine');
    expect(await css(counter('alone'), 'transition-property')).toBe('color');
    expect(await announced(page, 'alone')).toBe('');
    // Empty: the part goes, and the row with it where there is no text.
    await set(page, 'alone', { countText: '' });
    await expect(counter('alone')).toHaveCount(0);
    await expect(part(page, 'alone', '.supporting')).toHaveCount(0);
    await set(page, 'rtl', { countText: '' });
    await expect(part(page, 'rtl', '.supporting-text')).toHaveText('Help.');
  });

  test('FLD-28: while its control reports that it refused an entry the field is in its error condition exactly as while error is true — its error parts, the control invalid, and as its error text, where any error text stands (here under append: below the help, which stays), the control’s words, or errorText where it gives none; with no words from either it draws no error text — announces the error text while focus is inside, returns at once when the control withdraws the report, and forgets it when the control is replaced; it never sets error itself', async ({ page }) => {
    const date = (props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'text-input', props: { type: 'date', locale: 'en-US', segmentEmptyText: 'Empty', ...props } });
    await mount(page, [
      fx('own', { label: 'Due', supportingText: 'By the end of the year.', errorText: 'Check the date.' }, date({ invalidText: 'Finish the date.', unavailableText: 'Too late.', max: '2026-12-31' })),
      fx('fields', { label: 'Due', supportingText: 'By the end of the year.', errorText: 'Check the date.' }, date()),
      fx('help', { label: 'Due', supportingText: 'By the end of the year.' }, date()),
    ]);
    await placement(page, 'append');
    const segment = (id: string, unit: string) => input(id).locator(`.segment[data-unit="${unit}"]`);
    const blur = () => page.locator('body').click({ position: { x: 700, y: 5 } });
    const refuse = async (id: string) => {
      await segment(id, 'month').click();
      await page.keyboard.type('0927');
      await blur();
    };
    // Half-filled, then left: the control's own words as the error text, in its color, below the help, which stays; the
    // frame's error parts; the control invalid.
    const helpAt = (await box(part(page, 'own', '.supporting-text'))).y - (await box(host(page, 'own'))).y;
    await refuse('own');
    await expect(part(page, 'own', '.error-text')).toHaveText('Finish the date.');
    await expect(part(page, 'own', '.supporting-text')).toHaveText('By the end of the year.');
    near((await box(part(page, 'own', '.supporting-text'))).y - (await box(host(page, 'own'))).y, helpAt, 'the help is where it was');
    expect((await box(part(page, 'own', '.error-text'))).y, 'the error text is below the help').toBeGreaterThan((await box(part(page, 'own', '.supporting-text'))).y);
    await expect(frame(page, 'own')).toHaveAttribute('data-error', '');
    await expect.poll(() => css(part(page, 'own', '.error-text'), 'color')).toBe(await color(page, 'standard-error-text-color'));
    for (const unit of ['month', 'day', 'year']) await expect(segment('own', unit), unit).toHaveAttribute('aria-invalid', 'true');
    await expect(input('own').getByRole('spinbutton', { name: 'year, Due' })).toHaveAccessibleDescription('By the end of the year. Finish the date.');
    expect(await host(page, 'own').evaluate((el) => (el as HTMLElement & { error: boolean }).error), 'the field never sets error').toBe(false);
    // Left without focus inside: nothing was announced.
    expect(await announced(page, 'own')).toBe('');
    // The control gives no words: errorText is the error text; where that is empty too, none is drawn and the help stays.
    await refuse('fields');
    await expect(part(page, 'fields', '.error-text')).toHaveText('Check the date.');
    await expect(part(page, 'fields', '.supporting-text')).toHaveText('By the end of the year.');
    await refuse('help');
    await expect(part(page, 'help', '.supporting-text')).toHaveText('By the end of the year.');
    await expect(part(page, 'help', '.error-text')).toHaveCount(0);
    await expect(frame(page, 'help')).toHaveAttribute('data-error', '');
    // The next edit of a segment withdraws the report: back at once to what error and errorText say.
    await segment('own', 'year').click();
    await page.keyboard.type('2');
    await expect(part(page, 'own', '.error-text')).toHaveCount(0);
    await expect(part(page, 'own', '.supporting-text')).toHaveText('By the end of the year.');
    near((await box(part(page, 'own', '.supporting-text'))).y - (await box(host(page, 'own'))).y, helpAt, 'the help is where it was');
    await expect(frame(page, 'own')).not.toHaveAttribute('data-error', /.*/);
    await expect(segment('own', 'year')).not.toHaveAttribute('aria-invalid', /.*/);
    // A report that begins while focus is inside the field — committed by the action key — is announced, once.
    await page.keyboard.type('027');
    await segment('own', 'month').click();
    await page.keyboard.type('01052027');
    await page.keyboard.press('Enter');
    await expect(part(page, 'own', '.error-text')).toHaveText('Too late.');
    await expect.poll(() => announced(page, 'own')).toBe('Too late.');
    // The control is replaced: the report is forgotten with it.
    await host(page, 'fields').evaluate((el) => {
      el.querySelector('tanrei-text-input')!.remove();
      el.append(document.createElement('tanrei-slider'));
    });
    await expect(frame(page, 'fields')).not.toHaveAttribute('data-error', /.*/);
    await expect(part(page, 'fields', '.error-text')).toHaveCount(0);
    await expect(part(page, 'fields', '.supporting-text')).toHaveText('By the end of the year.');
  });

  test('FLD-28: while the control gives no words for its refusal and errorText is empty the field still marks itself — its error parts, the control invalid — and reports a refusal that has no words; with words from either, it reports nothing (a color input committed with a text that is not a color, CLI-20)', async ({ page }) => {
    const seen = warnings(page);
    const colorInput = (props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'color-input', props });
    await mount(page, [
      fx('wordless', { label: 'Brand color' }, colorInput()),
      fx('help-only', { label: 'Brand color', supportingText: 'Six hexadecimal digits.' }, colorInput()),
      fx('fields', { label: 'Brand color', errorText: 'Check this color.' }, colorInput()),
    ]);
    const text = (id: string) => control(page, id).locator('.input');
    const refuse = async (id: string) => {
      await text(id).click();
      await page.keyboard.type('teal');
      await page.locator('body').click({ position: { x: 700, y: 5 } });
      await expect(text(id), id).toHaveAttribute('aria-invalid', 'true');
    };
    // With the field's own words: shown, and nothing to report.
    await refuse('fields');
    await expect(part(page, 'fields', '.error-text')).toHaveText('Check this color.');
    await frames(page, 4);
    expect(seen.filter((w) => w.includes('FLD-28'))).toEqual([]);
    // No words from either: marked all the same — no row to draw — and reported.
    await refuse('wordless');
    await expect(frame(page, 'wordless')).toHaveAttribute('data-error', '');
    await expect(part(page, 'wordless', '.supporting-text, .error-text')).toHaveCount(0);
    await expect.poll(() => seen.filter((w) => w.includes('FLD-28')).length).toBe(1);
    expect(seen.find((w) => w.includes('FLD-28'))).toContain('neither it nor the field has words');
    // The help is no word for a refusal: it stays in the row as it is — never in the error color — no error text is
    // drawn, and the refusal is reported.
    const resting = await css(part(page, 'help-only', '.supporting-text'), 'color');
    await refuse('help-only');
    await expect(part(page, 'help-only', '.supporting-text')).toHaveText('Six hexadecimal digits.');
    await expect(part(page, 'help-only', '.error-text')).toHaveCount(0);
    await expect(frame(page, 'help-only')).toHaveAttribute('data-error', '');
    await frames(page, 4);
    expect(await css(part(page, 'help-only', '.supporting-text'), 'color')).toBe(await color(page, 'standard-error-supporting-text-color'));
    expect(await css(part(page, 'help-only', '.supporting-text'), 'color'), 'the help keeps its resting color').toBe(resting);
    await expect.poll(() => seen.filter((w) => w.includes('FLD-28')).length).toBe(2);
    // The next edit withdraws the report, and the field is as error and errorText say.
    await text('wordless').click();
    await page.keyboard.type('x');
    await expect(frame(page, 'wordless')).not.toHaveAttribute('data-error', /.*/);
  });
});

test.describe('the value text', () => {
  /** Where the first baseline of a text box is: the bottom of an empty inline box put before its text, for the reading. */
  const baseline = (locator: Locator) =>
    locator.evaluate((el) => {
      const probe = document.createElement('span');
      probe.style.cssText = 'display: inline-block; inline-size: 0; block-size: 0;';
      el.prepend(probe);
      const at = probe.getBoundingClientRect().bottom;
      probe.remove();
      return at;
    });
  const wide = (page: P, id: string, width: number) => host(page, id).evaluate((el: HTMLElement, w) => (el.style.inlineSize = `${w}px`), width);
  const whole = (locator: Locator) => locator.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1);

  test('FLD-29: valueText is drawn at the end edge of the label row, on the baseline of the label’s first line, on one line, in value-text.typescale and the value-text color — its error part while error is true — at least value-text.gap from the label with its mark; the label wraps in the room that is left and the tag moves to a line of its own; a new text is drawn at once and moves nothing but its own start; none while the label is not drawn, and never in the supporting row', async ({ page }) => {
    await mountSpec(page, 'slider-value-text', 'slider-value-words', 'slider-range', 'slider-label-icon', 'slider-required', 'slider-error', 'long-label', 'slider-label-hidden', 'slider');
    const gap = await token(page, 'value-text-gap');
    for (const [id, text] of [['slider-value-text', '40'], ['slider-value-words', '120 %'], ['slider-range', '20 – 60'], ['slider-label-icon', '40'], ['slider-required', '40'], ['long-label', '40']] as const) {
      const value = part(page, id, '.value-text');
      await expect(value, id).toHaveText(text);
      const [h, v, row] = [await box(host(page, id)), await box(value), await box(part(page, id, '.label-row'))];
      near(v.x + v.width, h.x + h.width, `${id}: at the end edge`);
      near(await baseline(value), await baseline(part(page, id, '.label')), `${id}: on the baseline of the label's first line`);
      near(v.height, Number.parseFloat(await css(value, 'line-height')), `${id}: one line`);
      expect(v.x - (row.x + row.width), `${id}: at least value-text.gap from the label with its mark`).toBeGreaterThanOrEqual(gap - 0.6);
      expect(row.width, `${id}: the label keeps half of the row at least`).toBeGreaterThanOrEqual(h.width / 2 - 0.6);
      expect(await css(value, 'font-size'), id).toBe(await css(part(page, id, '.label'), 'font-size'));
      expect(await css(value, 'color'), id).toBe(await color(page, 'standard-value-text-color'));
    }
    // The text style is the value text's own token.
    const family = await css(part(page, 'slider-value-text', '.value-text'), 'font-family');
    await override(page, { [T('value-text-typescale-font')]: `italic 700 24px/32px ${family}` });
    expect(await css(part(page, 'slider-value-text', '.value-text'), 'font-size')).toBe('24px');
    expect(await css(part(page, 'slider-value-text', '.value-text'), 'font-style')).toBe('italic');
    // A text of another size still stands on the label's baseline — beside a glyph too.
    for (const id of ['slider-value-text', 'slider-label-icon']) near(await baseline(part(page, id, '.value-text')), await baseline(part(page, id, '.label')), `${id}: the baseline, with a larger value text`);
    await rootTokens(page, { '--tanrei-comp-field-value-text-typescale-font': '' });
    // The label wraps in the room that is left, and the tag moves whole to a line of its own after it (FLD-5).
    const [label, tag, value] = [await box(part(page, 'long-label', '.label')), await box(part(page, 'long-label', '.required-tag')), await box(part(page, 'long-label', '.value-text'))];
    expect(label.height, 'the label wraps').toBeGreaterThan(2 * Number.parseFloat(await css(part(page, 'long-label', '.label'), 'line-height')) - 1);
    expect(label.x + label.width, 'the label ends before the value text').toBeLessThanOrEqual(value.x - gap + 0.6);
    // (A tag taller than the label's line reaches above the line it stands on by half of what it is taller: FLD-5.)
    expect(tag.y, 'the tag is on a line of its own').toBeGreaterThanOrEqual(label.y + label.height - Math.max(0, (tag.height - Number.parseFloat(await css(part(page, 'long-label', '.label'), 'line-height'))) / 2) - 0.6);
    expect(await whole(part(page, 'long-label', '.label'))).toBe(true);
    // In error: the error part of the token.
    expect(await css(part(page, 'slider-error', '.value-text'), 'color')).toBe(await color(page, 'standard-error-value-text-color'));
    // A new text: at once, with no motion of its own, and only its own start moves.
    const before = { row: await box(part(page, 'slider-value-text', '.label')), value: await box(part(page, 'slider-value-text', '.value-text')), control: await box(control(page, 'slider-value-text')) };
    await set(page, 'slider-value-text', { valueText: '100 %' });
    const after = { row: await box(part(page, 'slider-value-text', '.label')), value: await box(part(page, 'slider-value-text', '.value-text')), control: await box(control(page, 'slider-value-text')) };
    await expect(part(page, 'slider-value-text', '.value-text')).toHaveText('100 %');
    near(after.value.x + after.value.width, before.value.x + before.value.width, 'the end edge stays');
    expect(after.value.x, 'its own start moves').toBeLessThan(before.value.x);
    expect([after.row.x, after.row.y, after.control.y, after.control.height]).toEqual([before.row.x, before.row.y, before.control.y, before.control.height]);
    expect(await css(part(page, 'slider-value-text', '.value-text'), 'transition-property'), 'only its color is ever moved').toBe('color');
    expect(await part(page, 'slider-value-text', '.value-text').evaluate((el) => el.getAnimations().length)).toBe(0);
    // Without a value text the row is the frame's own child, as before; with the label not drawn none is drawn.
    await expect(part(page, 'slider', '.label-line')).toHaveCount(0);
    await set(page, 'slider-label-hidden', { valueText: '40' });
    await expect(host(page, 'slider-label-hidden').locator('.frame .label-line, .frame > .value-text, .frame > .supporting > .value-text')).toHaveCount(0);
    await set(page, 'slider-label-hidden', { labelHidden: false, label: '' });
    await expect(host(page, 'slider-label-hidden').locator('.frame .label-line, .frame > .value-text, .frame > .supporting > .value-text')).toHaveCount(0);
    // Never in the supporting row.
    await expect(host(page, 'slider-error').locator('.frame > .supporting > .value-text')).toHaveCount(0);
    // The gap below the label row is still label.gap, with a value text and without.
    for (const id of ['slider-value-text', 'slider']) near((await box(control(page, id))).y - ((await box(part(page, id, '.label-row'))).y + (await box(part(page, id, '.label-row'))).height), await token(page, 'label-gap'), `${id}: label.gap`);
    near((await box(host(page, 'slider-value-text'))).height, (await box(host(page, 'slider'))).height, 'the field is no taller for a value text on the label’s line');
  });

  test('FLD-29: a value text that would leave the label less than half of the row is drawn whole on a line of its own after the label row’s last line, from the start edge, wrapping where it must and never cut — at 160 wide, and at 320 wide with the text at 200 %; one that leaves half shares the label’s line', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1200 });
    await mount(page, [
      fx('own-line', { label: 'Price', valueText: '$1,000,000 – $2,000,000' }),
      fx('shares', { label: 'Price', valueText: '$100' }),
      fx('tagged', { label: 'Yearly income before tax', required: true, valueText: '3,400,000 – 12,500,000' }),
      fx('wraps', { label: 'Price', valueText: 'From one million two hundred thousand to two million four hundred thousand' }),
    ]);
    const gap = await token(page, 'value-text-gap');
    const read = async (id: string) => {
      const [h, row, value] = [await box(host(page, id)), await box(part(page, id, '.label-row')), await box(part(page, id, '.value-text'))];
      const natural = await part(page, id, '.value-text').evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect().width;
      });
      return { h, row, value, natural, own: value.y >= row.y + row.height - 0.6 };
    };
    const holds = async (id: string, width: number) => {
      const { h, row, value, natural, own } = await read(id);
      // The rule: its own line exactly where the room left for the label is less than half of the row.
      if (!own) {
        expect(h.width - gap - value.width, `${id} at ${width}: the label keeps half`).toBeGreaterThanOrEqual(h.width / 2 - 0.6);
        near(value.x + value.width, h.x + h.width, `${id} at ${width}: at the end edge`);
      } else {
        near(value.x, h.x, `${id} at ${width}: from the start edge`);
        near(value.y, row.y + row.height, `${id} at ${width}: after the label row's last line`);
        near(row.width, h.width, `${id} at ${width}: the label row has the whole line`);
        expect(h.width - gap - Math.min(natural, h.width), `${id} at ${width}: it would have left the label less than half`).toBeLessThan(h.width / 2 + 0.6);
      }
      expect(await whole(part(page, id, '.value-text')), `${id} at ${width}: never cut`).toBe(true);
      expect(value.x + value.width, `${id} at ${width}: inside the field`).toBeLessThanOrEqual(h.x + h.width + 0.6);
      // label.gap is below the line, whichever of the two ends it.
      near((await box(control(page, id))).y - Math.max(row.y + row.height, value.y + value.height), await token(page, 'label-gap'), `${id} at ${width}: label.gap below the line`);
      return own;
    };
    for (const id of ['own-line', 'shares', 'tagged', 'wraps']) await wide(page, id, 160);
    expect(await holds('own-line', 160)).toBe(true);
    expect(await holds('shares', 160)).toBe(false);
    expect(await holds('tagged', 160)).toBe(true);
    expect(await holds('wraps', 160)).toBe(true);
    expect((await box(part(page, 'wraps', '.value-text'))).height, 'it wraps on its own line').toBeGreaterThan(2 * Number.parseFloat(await css(part(page, 'wraps', '.value-text'), 'line-height')) - 1);
    // On its own line beside a tag that took a line of its own too: the tag's line, then the value's.
    const [tag, value] = [await box(part(page, 'tagged', '.required-tag')), await box(part(page, 'tagged', '.value-text'))];
    expect(value.y, 'after the tag').toBeGreaterThanOrEqual(tag.y + tag.height - 4);
    // 320 wide, text at 200 %.
    await page.addStyleTag({ content: 'html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; }' });
    for (const id of ['own-line', 'shares', 'tagged', 'wraps']) await host(page, id).evaluate((el: HTMLElement) => (el.style.inlineSize = 'auto'));
    await frames(page);
    expect(await holds('own-line', 320)).toBe(true);
    expect(await holds('shares', 320)).toBe(false);
    expect(await holds('tagged', 320)).toBe(true);
    expect(await holds('wraps', 320)).toBe(true);
    for (const id of ['own-line', 'shares', 'tagged', 'wraps']) expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: no scrolling sideways`).toBe(true);
  });

  test('FLD-30: the value text is kept from assistive technology and a change of it announces nothing; a press on it moves focus to the control and changes no value, and does nothing while disabled; the field writes only the words it is given', async ({ page }) => {
    await mount(page, [fx('a', { label: 'Volume', valueText: '40 %', supportingText: 'Help.' }), fx('off', { label: 'Volume', valueText: '40 %', disabled: true })]);
    const value = part(page, 'a', '.value-text');
    expect(await value.getAttribute('aria-hidden')).toBe('true');
    expect(await value.getAttribute('role')).toBeNull();
    expect(await stage(page, 'a').ariaSnapshot()).not.toContain('40 %');
    // The control says its own value; the field gives it no word of the value text.
    const said = await semantics(page, 'a');
    expect(said.name).toBe('Volume');
    expect(said.description).toBe('Help.');
    // A change announces nothing, focus inside or not.
    await tabTo(page, control(page, 'a'));
    await set(page, 'a', { valueText: '41 %' });
    await frames(page);
    expect(await announced(page, 'a')).toBe('');
    await expect(value).toHaveText('41 %');
    await page.locator('body').click({ position: { x: 600, y: 5 } });
    expect(await activeInside(page, 'a')).toBe(false);
    // A press on it: focus to the control, no value changed, no event.
    await control(page, 'a').evaluate((el) => {
      (window as unknown as { heard: number }).heard = 0;
      for (const name of ['input', 'change']) el.addEventListener(name, () => (window as unknown as { heard: number }).heard++);
    });
    await press(value);
    expect(await activeInside(page, 'a')).toBe(true);
    expect(await control(page, 'a').evaluate((el: HTMLElement & { value: number }) => [el.value, (window as unknown as { heard: number }).heard])).toEqual([40, 0]);
    // The words are given: what is drawn is the prop, whatever the control holds.
    await control(page, 'a').evaluate((el: HTMLElement & { value: number }) => (el.value = 90));
    await frames(page);
    await expect(value).toHaveText('41 %');
    // Disabled: a press does nothing; the text is still drawn, from the disabled token.
    await press(part(page, 'off', '.value-text'));
    expect(await activeInside(page, 'off')).toBe(false);
    await expect(part(page, 'off', '.value-text')).toHaveText('40 %');
    expect(await css(part(page, 'off', '.value-text'), 'color')).toBe(await color(page, 'standard-disabled-value-text-color'));
    expect(await part(page, 'off', '.value-text').getAttribute('aria-disabled')).toBe('true');
  });

  test('FLD-13: while focus is inside the field its value text is drawn from the focused token — its error part while error is true — over motion.state-duration, and at once where motion is reduced', async ({ page }) => {
    await mount(page, [fx('a', { label: 'Volume', valueText: '40' }), fx('error', { label: 'Volume', valueText: '0', error: true, errorText: 'Too quiet.' })]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // The default system's focused value text is its resting one: a product's own colors show the tokens read.
    await override(page, { [T('standard-focused-value-text-color')]: 'rgb(1, 2, 3)', [T('standard-focused-error-value-text-color')]: 'rgb(3, 2, 1)' });
    expect(await css(part(page, 'a', '.value-text'), 'color')).toBe(await color(page, 'standard-value-text-color'));
    await tabTo(page, control(page, 'a'));
    expect(await css(part(page, 'a', '.value-text'), 'color')).toBe('rgb(1, 2, 3)');
    await press(control(page, 'error').locator('[role="slider"]'));
    expect(await css(part(page, 'error', '.value-text'), 'color')).toBe('rgb(3, 2, 1)');
    expect(await css(part(page, 'a', '.value-text'), 'color'), 'focus left').toBe(await color(page, 'standard-value-text-color'));
    expect(Number.parseFloat(await css(part(page, 'a', '.value-text'), 'transition-duration'))).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    near(Number.parseFloat(await css(part(page, 'a', '.value-text'), 'transition-duration')) * 1000, await resolveToken(page, T('motion-state-duration'), 'duration'), 'over the state motion', 0.01);
  });

  test('FLD-16: with the text enlarged the value text grows with its text and keeps the line FLD-29 gives it; at 200 % in 320 nothing is lost, overlaps or scrolls sideways', async ({ page }) => {
    const ids = ['slider-value-words', 'long-label', 'slider-long-value-text', 'slider-required'];
    await page.setViewportSize({ width: 320, height: 1600 });
    await mountSpec(page, ...ids);
    const size = Number.parseFloat(await css(part(page, 'slider-value-words', '.value-text'), 'font-size'));
    await page.addStyleTag({ content: 'html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } .stage > tanrei-field { inline-size: auto !important; }' });
    await frames(page);
    near(Number.parseFloat(await css(part(page, 'slider-value-words', '.value-text'), 'font-size')), 2 * size, 'the value text grows');
    const gap = await token(page, 'value-text-gap');
    for (const id of ids) {
      const [h, row, value, own] = [await box(host(page, id)), await box(part(page, id, '.label-row')), await box(part(page, id, '.value-text')), await box(control(page, id))];
      const alone = value.y >= row.y + row.height - 0.6;
      // The line FLD-29 gives it: the label's, at the end edge, where the label keeps half of the row; else its own.
      if (alone) near(value.x, h.x, `${id}: from the start edge`);
      else {
        near(value.x + value.width, h.x + h.width, `${id}: at the end edge`);
        expect(value.x - (row.x + row.width), `${id}: value-text.gap`).toBeGreaterThanOrEqual(gap - 0.6);
        expect(row.width, `${id}: the label keeps half`).toBeGreaterThanOrEqual(h.width / 2 - 0.6);
      }
      expect(own.y, `${id}: the control is below both`).toBeGreaterThanOrEqual(Math.max(row.y + row.height, value.y + value.height) - 0.5);
      expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.label, .value-text, .supporting-text')].every((text) => text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1)), `${id}: no text is clipped`).toBe(true);
      expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: no scrolling sideways`).toBe(true);
    }
    expect((await box(part(page, 'slider-long-value-text', '.value-text'))).y, 'a long value text has its own line').toBeGreaterThanOrEqual((await box(part(page, 'slider-long-value-text', '.label-row'))).y + (await box(part(page, 'slider-long-value-text', '.label-row'))).height - 0.6);
  });

  test('FLD-17: in forced colors the value text is drawn in the platform’s text color, and in its disabled text color while the field is disabled', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page, 'slider-value-text', 'slider-error', 'slider-disabled');
    const system = (name: string) =>
      page.evaluate((keyword) => {
        const probe = document.createElement('div');
        probe.style.color = keyword;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    for (const id of ['slider-value-text', 'slider-error']) expect(await css(part(page, id, '.value-text'), 'color'), id).toBe(await system('CanvasText'));
    expect(await css(part(page, 'slider-disabled', '.value-text'), 'color')).toBe(await system('GrayText'));
  });

  test('FLD-18: in right-to-left the value text stands at the left end of the label row, value-text.gap at least from the label with its mark', async ({ page }) => {
    await mountSpec(page, 'slider-rtl', 'slider-error-rtl', 'slider-range-rtl');
    const gap = await token(page, 'value-text-gap');
    for (const id of ['slider-rtl', 'slider-error-rtl', 'slider-range-rtl']) {
      const [h, row, value] = [await box(host(page, id)), await box(part(page, id, '.label-row')), await box(part(page, id, '.value-text'))];
      near(value.x, h.x, `${id}: at the left end`);
      near(row.x + row.width, h.x + h.width, `${id}: the label row starts at the right edge`);
      expect(row.x - (value.x + value.width), `${id}: value-text.gap`).toBeGreaterThanOrEqual(gap - 0.6);
    }
  });

  test('FLD-21: the value text is text of its own direction, isolated — a left-to-right value keeps its order in a right-to-left layout, and one with no letter takes the layout’s direction, so a range’s two values stand in reading order — and is still placed by the layout direction', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => f.id === 'slider-range-rtl'),
      fx('words', { label: 'مستوى الصوت', valueText: 'Level 40 of 100' }, slider(), { direction: 'rtl' }),
      fx('isolated', { label: 'السعر', valueText: '\u2068100 km\u2069 – \u2068300 km\u2069' }, slider(), { direction: 'rtl' }),
      fx('ltr', { label: 'Price', valueText: '$100 – $300' }),
    ]);
    const left = (id: string, word: string) =>
      part(page, id, '.value-text').evaluate((el, text) => {
        const node = [...el.childNodes].find((child) => child.nodeType === Node.TEXT_NODE && child.textContent!.includes(text))!;
        const range = document.createRange();
        const start = node.textContent!.indexOf(text);
        range.setStart(node, start);
        range.setEnd(node, start + text.length);
        return range.getBoundingClientRect().left;
      }, word);
    // Its own direction: a left-to-right sentence keeps its order.
    expect(await css(part(page, 'words', '.value-text'), 'unicode-bidi')).toBe('plaintext');
    expect(await css(part(page, 'words', '.value-text'), 'direction'), 'the box keeps the layout’s direction').toBe('rtl');
    expect(await left('words', 'Level')).toBeLessThan(await left('words', '100'));
    // No letter: the layout's direction — the first of two values is at the right of the dash, each in its own order.
    expect(await css(part(page, 'slider-range-rtl', '.value-text'), 'unicode-bidi')).toBe('isolate');
    expect(await left('slider-range-rtl', '$100')).toBeGreaterThan(await left('slider-range-rtl', '$300'));
    expect(await left('slider-range-rtl', '$')).toBeLessThan(await left('slider-range-rtl', '100'));
    // Two runs that are isolated already: in reading order too, each in its own order.
    expect(await left('isolated', '100 km')).toBeGreaterThan(await left('isolated', '300 km'));
    expect(await left('isolated', '100')).toBeLessThan(await left('isolated', 'km'));
    // Left to right, the first is at the left.
    expect(await left('ltr', '$100')).toBeLessThan(await left('ltr', '$300'));
    // Placed by the layout: at the left end in right-to-left.
    near((await box(part(page, 'words', '.value-text'))).x, (await box(host(page, 'words'))).x, 'placed at the left end');
  });
});

test.describe('accessibility', () => {
  // Every fixture of the spec, a part at a time (`PARTS`).
  for (const { name, fixtures } of PARTS) {
    test(`no axe violations in light and dark — ${name}`, async ({ page }) => {
      for (const theme of ['light', 'dark'] as const) {
        await mount(page, fixtures, { theme });
        const results = await new AxeBuilder({ page }).include('.stage').analyze();
        expect(results.violations, theme).toEqual([]);
      }
    });
  }

  test('no axe violations with a native control, a control the product named, and a field in each state', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(
        page,
        [
          fx('native', { label: 'City', supportingText: 'As written on your mail.', required: true, error: true, errorText: 'Enter a city.' }, '<input />'),
          fx('native-optional', { label: 'Notes', required: false, optional: true }, '<textarea></textarea>'),
          fx('select', { label: 'Country', disabled: true, supportingText: 'Help.' }, '<select><option>Portugal</option></select>'),
          fx('range', { label: 'Volume', required: true }, '<input type="range" />'),
          fx('asterisk', { label: 'Volume', required: true, requiredMark: 'asterisk', error: true, errorText: 'Too loud.' }),
        ],
        { theme },
      );
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('Chromium’s accessibility tree computes the name, the description and the states of a control inside a field — a slider, a switch, a checkbox and a native input — with the error text in the help’s place as the description while the field is in error, and under append the help and then the error text', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    await mount(page, [...spec.fixtures.filter((f) => ['slider-supporting', 'slider-error'].includes(f.id))]);
    expect(await axNode(page, 'slider', 1)).toMatchObject({ name: 'Volume', description: 'Choose a level above 0.', invalid: 'true' });
    await placement(page, 'append');
    expect(await axNode(page, 'slider', 0)).toMatchObject({ name: 'Volume', description: 'Applies to alerts and media.' });
    expect(await axNode(page, 'slider', 1)).toMatchObject({ name: 'Volume', description: 'Applies to alerts and media. Choose a level above 0.', invalid: 'true' });
    // The error set later reaches the tree at once, after the help.
    await set(page, 'slider-supporting', { error: true, errorText: 'Too loud for this device.' });
    expect(await axNode(page, 'slider', 0)).toMatchObject({ name: 'Volume', description: 'Applies to alerts and media. Too loud for this device.', invalid: 'true' });
    await mount(page, [
      ...spec.fixtures.filter((f) => ['switch-optional', 'checkbox-own-label-error', 'slider-label-hidden', 'slider-required-disabled'].includes(f.id)),
      fx('native', { label: 'City', supportingText: 'As written on your mail.', required: true, error: true, errorText: 'Enter a city.' }, '<input />'),
    ]);
    await placement(page, 'append');
    expect(await axNode(page, 'switch')).toMatchObject({ name: 'Notifications', description: 'Optional' });
    expect(await axNode(page, 'checkbox')).toMatchObject({ name: 'I accept the terms of use', description: 'You can withdraw at any time. Accept the terms to continue.', invalid: 'true' });
    expect(await axNode(page, 'slider', 0)).toMatchObject({ name: 'Volume', description: 'Required', disabled: true });
    expect(await axNode(page, 'slider', 1)).toMatchObject({ name: 'Volume', description: 'Applies to alerts and media.' });
    expect(await axNode(page, 'textbox')).toMatchObject({ name: 'City', description: 'As written on your mail. Enter a city.', invalid: 'true', required: true });
    // Nothing of the frame is a second, unnamed or duplicate node: the label is not in the tree as text.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Accessibility.enable');
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    await cdp.detach();
    const texts = nodes.filter((node) => !node.ignored && node.role?.value === 'StaticText').map((node) => node.name?.value as string);
    expect(texts).not.toContain('Notifications');
    expect(texts).not.toContain('Optional');
    expect(texts).not.toContain('Required');
    expect(texts).toContain('You can withdraw at any time.');
    expect(texts).toContain('Accept the terms to continue.');
  });
});

test.describe('fixtures', () => {
  test('the parts hold every fixture of the spec once', () => {
    // Among them: two twins of the one-time-code field's (`code-disabled`, `code-required-rtl`), the file picker's
    // (`file-picker-required-error`), and the ninety `text-…`, the twins of the text field's fixtures around a text input;
    // 18 `slider…`, 2 `switch…`, 2 `checkbox…`, `long-label`, `ltr-label-rtl`, 4 `code-…`, the file upload's and the file
    // picker's; the twins of every other field — the 60 `combobox-…`, the twins of the combobox field's fixtures around a
    // combobox, and the 57 `select-…`, the twins of the select field's around a select; the four `number-…-rtl`, the twins
    // of the number field's fixtures of a number and its unit in a right-to-left layout; and the five
    // `text-…-supporting-error…`, a help and an error text together (the error text in the help's place under the default
    // system); `text-stacked-small` and `text-outlined-optional`, the twins of the text field's small size and of the
    // optional word after a floating label.
    expect(spec.fixtures).toHaveLength(368);
    expect(PARTS.flatMap((p) => p.fixtures.map((f) => f.id)).sort()).toEqual(spec.fixtures.map((f) => f.id).sort());
    for (const p of PARTS) expect(p.fixtures.length, p.name).toBeLessThanOrEqual(PART);
    expect(new Set(PARTS.map((p) => p.name)).size).toBe(PARTS.length);
  });

  // Every fixture of the spec, a part at a time (`PARTS`).
  for (const { name, fixtures } of PARTS) {
    test(`every fixture is mounted and visible, with the control, the label, the mark, the glyph and the text the spec gives it — ${name}`, async ({ page }) => {
      await mount(page, fixtures);
      for (const f of fixtures) {
        await expect(host(page, f.id), f.id).toBeVisible();
        await expect(control(page, f.id), f.id).toBeVisible();
        expect(await control(page, f.id).evaluate((el) => el.localName), f.id).toBe(`tanrei-${f.items![0].kind}`);
        near((await box(host(page, f.id))).width, 280, f.id);
        // A control of a look that floats its label draws it itself: the field draws no label row and no tag (FLD-25).
        const floats = ['text-input', 'combobox', 'color-input', 'number-input', 'select'].includes(f.items![0].kind) && ['filled', 'outlined'].includes(String(f.items![0].props.variant));
        const labelled = !!f.props.label && !f.props.labelHidden && !floats;
        expect(await part(page, f.id, '.label').count(), `${f.id} label`).toBe(labelled ? 1 : 0);
        if (labelled) await expect(part(page, f.id, '.label'), f.id).toContainText(String(f.props.label));
        const requirement = f.props.required ? 'required' : f.props.optional ? 'optional' : 'none';
        const mark = f.props.requiredMark ?? 'auto';
        const tag = labelled && (requirement === 'optional' || (requirement === 'required' && mark !== 'asterisk'));
        expect(await part(page, f.id, '.requirement-tag').count(), `${f.id} tag`).toBe(tag ? 1 : 0);
        if (tag) await expect(part(page, f.id, '.requirement-tag').locator('.label'), f.id).toHaveText(String(requirement === 'required' ? f.props.requiredText : f.props.optionalText));
        const wrong = f.props.error && f.props.errorText ? f.props.errorText : '';
        // FLD-7: under the default system the error text stands in the help's place.
        const shown = wrong ? '' : f.props.supportingText;
        expect(await part(page, f.id, '.supporting-text').count(), `${f.id} supporting row`).toBe(shown ? 1 : 0);
        if (shown) await expect(part(page, f.id, '.supporting-text'), f.id).toHaveText(String(shown));
        expect(await part(page, f.id, '.error-text').count(), `${f.id} error text`).toBe(wrong ? 1 : 0);
        if (wrong) await expect(part(page, f.id, '.error-text'), f.id).toHaveText(String(wrong));
        if (f.slots?.['label-icon']) await expect.poll(() => host(page, f.id).locator('[slot="label-icon"]').evaluate((el) => el.getBoundingClientRect().width > 0), { message: f.id }).toBe(true);
      }
    });
  }

  // One fixture is mounted for its picture, drawn as on the page of all of them (`mountFixtureAsInAll`): that page is
  // mounted once for a worker, not once for each picture.
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
