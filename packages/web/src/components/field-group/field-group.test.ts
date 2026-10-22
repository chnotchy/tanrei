// <tanrei-field-group>, driven by specs/field-group.spec.json: every behaviour id (FGR-1…25) is cited by a test title,
// every fixture has a baseline, and every length and color is read back from the tokens — never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { axTree, ofRoles } from '../../../test/ax-tree.js';
import { type Fixture, type FixtureItem, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';

const spec = loadSpec('field-group');
type P = Page;
const TAG = 'tanrei-field-group';
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
/** A Tag and every control have parts of the same class names in their own shadow roots, so each part is named with its parents in the group's. */
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
/** The controls: the group's light-DOM children (a locator's child combinator also reaches the shadow root's own child, the fieldset). */
const members = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG} > :not(fieldset)`);
/** Whether `control` is inside the group's fieldset in the flattened tree, which the accessibility tree is built from. */
const contained = (page: P, id: string, control: Locator) =>
  control.evaluate((el, tag) => {
    const fieldset = el.assignedSlot?.closest('fieldset');
    return !!fieldset && (fieldset.getRootNode() as ShadowRoot).host === el.parentElement?.closest(tag);
  }, TAG);
const member = (page: P, id: string, nth: number) => members(page, id).nth(nth);
const T = (name: string) => `--tanrei-comp-field-group-${name}`;
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
const checkbox = (label: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'checkbox', props: { label, ...props } });
const toggle = (label: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'switch', props: { label, ...props } });
const field = (label: string, props: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'text-field', props: { label, ...props } });
const THREE = [checkbox('Email'), checkbox('Text message'), checkbox('Push notification')];
/** A fixture of the test's own: props, then its controls — items of the spec's kinds, or markup of the product's. */
/** The words of this file's own fixtures: a test is the product there and gives them itself (FGR-24). */
const WORDS = { requiredText: 'Required', optionalText: 'Optional' };
const fx = (id: string, props: Fixture['props'], inside: FixtureItem[] | string = THREE, extra: Partial<Fixture> = {}): Fixture => ({
  id,
  props: { ...WORDS, ...props },
  ...(typeof inside === 'string' ? { content: inside } : { items: inside }),
  ...extra,
});
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const mountSpec = (page: P, ...ids: string[]) => mount(page, ids.length ? spec.fixtures.filter((f) => ids.includes(f.id)) : spec.fixtures);
const set = async (page: P, id: string, props: Record<string, unknown>) => {
  await host(page, id).evaluate(async (el, p) => {
    Object.assign(el, p);
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    for (const child of el.querySelectorAll('*')) await (child as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
  }, props);
};
/** What a control exposes, read from the element that carries its semantics. */
const semantics = (control: Locator) =>
  control.evaluate((el) => {
    const inner = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"], input, textarea, fieldset') ?? (el as HTMLElement);
    const native = inner as HTMLInputElement;
    return {
      name: inner.getAttribute('aria-label'),
      description: inner.getAttribute('aria-description'),
      invalid: inner.getAttribute('aria-invalid') === 'true',
      required: inner.getAttribute('aria-required') === 'true' || native.required === true,
      disabled: inner.getAttribute('aria-disabled') === 'true' || native.disabled === true,
    };
  });
/** The group as its fieldset exposes it: the legend's text, and the texts its description refers to, in order. */
const group = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const fieldset = el.shadowRoot!.querySelector('fieldset')!;
    const legend = fieldset.querySelector(':scope > legend');
    const read = (node: Node): string => (node.nodeType === Node.TEXT_NODE ? node.textContent! : node instanceof Element && node.getAttribute('aria-hidden') !== 'true' && node.localName !== 'tanrei-tag' ? [...node.childNodes].map(read).join('') : '');
    return {
      role: fieldset.localName,
      name: legend ? read(legend).replace(/\s+/g, ' ').trim() : null,
      described: (fieldset.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter(Boolean)
        .map((ref) => fieldset.querySelector(`#${ref}`)?.textContent?.trim() ?? `missing:${ref}`),
      required: fieldset.hasAttribute('aria-required') || fieldset.hasAttribute('required'),
      invalid: fieldset.hasAttribute('aria-invalid'),
      disabled: fieldset.getAttribute('aria-disabled') === 'true',
    };
  });
const announced = (page: P, id: string) => host(page, id).evaluate((el) => el.shadowRoot!.querySelector('.announcer')!.textContent ?? '');
const activeInside = (target: Locator) =>
  target.evaluate((el) => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    for (let at: Node | null = active; at; at = at.parentNode ?? (at as ShadowRoot).host ?? null) if (at === el) return true;
    return false;
  });
/** How a checkbox draws its box's edge: the error form's differs from the plain one's. */
const edge = (control: Locator) => control.locator('.box').evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
async function axNodes(page: P, role: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored && node.role?.value === role)
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value.value;
      return { name: node.name?.value as string, description: (node.description?.value ?? '') as string, invalid: property('invalid'), required: property('required'), disabled: property('disabled'), children: node.childIds?.length ?? 0 };
    });
}

/** How many nodes of `role` are inside the `index`th node of `ancestor` in Chromium's accessibility tree. */
async function axDescendants(page: P, ancestor: string, index: number, role: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const root = nodes.filter((node) => !node.ignored && node.role?.value === ancestor)[index];
  let count = 0;
  const walk = (id: string) => {
    const node = byId.get(id);
    if (!node) return;
    if (!node.ignored && node.role?.value === role) count += 1;
    for (const child of node.childIds ?? []) walk(child);
  };
  for (const child of root?.childIds ?? []) walk(child);
  return count;
}

test.describe('behavior', () => {
  test('FGR-1: the label row, the description supporting-text.gap below it, the controls label.gap below whichever is drawn last and the error text error-text.gap below the last control, from the start edge; as wide as its layout and as tall as its rows and controls; no container, edge, fill, elevation or padding, and each control placed by its own bounds, unchanged', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['checkboxes-error', 'checkboxes'].includes(f.id)), fx('bare', { label: 'Bare' }, '<span id="bare-holder"><tanrei-checkbox label="Email"></tanrei-checkbox></span>')]);
    const id = 'checkboxes-error';
    const h = await box(host(page, id));
    const [label, description, controls, error] = [await box(part(page, id, '.label-row')), await box(part(page, id, '.supporting-text')), await box(part(page, id, '.controls')), await box(part(page, id, '.error-text'))];
    near(h.width, 320, 'as wide as its layout gives it');
    near(label.y, h.y, 'the label row is at the top');
    near(label.x, h.x, 'from the start edge');
    near(description.y - (label.y + label.height), await token(page, 'supporting-text-gap'), 'supporting-text.gap');
    near(description.x, h.x, 'the description starts at the start edge');
    near(controls.y - (description.y + description.height), await token(page, 'label-gap'), 'label.gap below the description');
    const last = await box(member(page, id, 2));
    near(last.y + last.height, controls.y + controls.height, 'the controls’ box ends with its last control');
    near(error.y - (last.y + last.height), await token(page, 'error-text-gap'), 'error-text.gap');
    near(h.height, error.y + error.height - h.y, 'as tall as its rows and its controls');
    // Without a description the controls stand label.gap below the label row.
    near((await box(part(page, 'checkboxes', '.controls'))).y - ((await box(part(page, 'checkboxes', '.label-row'))).y + (await box(part(page, 'checkboxes', '.label-row'))).height), await token(page, 'label-gap'), 'label.gap below the label');
    // No container, edge, fill, elevation or padding.
    for (const target of [host(page, id), part(page, id, '.group'), part(page, id, '.legend'), part(page, id, '.controls')]) {
      expect(await css(target, 'background-color')).toBe('rgba(0, 0, 0, 0)');
      expect(await css(target, 'border-top-width')).toBe('0px');
      expect(await css(target, 'padding-top')).toBe('0px');
      expect(await css(target, 'padding-left')).toBe('0px');
      expect(await css(target, 'box-shadow')).toBe('none');
    }
    expect(await css(part(page, id, '.group'), 'margin-left')).toBe('0px');
    expect(await css(host(page, id), 'display')).toBe('block');
    // Each control by its own bounds: its container starts at the group's start edge, so its mark stands further in
    // than the label above it, and it is the size it has outside a group.
    const first = await box(member(page, 'checkboxes', 0));
    near(first.x, (await box(host(page, 'checkboxes'))).x, 'the control starts at the start edge');
    expect((await box(member(page, 'checkboxes', 0).locator('.box'))).x, 'the mark stands inside its container').toBeGreaterThan(first.x + 1);
    const outside = await page.evaluate(() => {
      const own = document.createElement('tanrei-checkbox');
      own.setAttribute('label', 'Email');
      own.setAttribute('checked', '');
      document.body.append(own);
      return new Promise<number[]>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve([own.getBoundingClientRect().width, own.getBoundingClientRect().height]))));
    });
    near(first.width, outside[0], 'the control’s width is its own');
    near(first.height, outside[1], 'the control’s height is its own');
  });

  test('FGR-2: the label above the controls in label.typescale and the label color, wrapped onto as many lines as it needs and never cut; labelHidden or an empty label draws no label row, no gap and no requirement mark', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['checkboxes', 'long-label', 'checkboxes-label-hidden'].includes(f.id)), fx('hidden-required', { label: 'Notify me by', labelHidden: true, required: true }), fx('empty', { required: true })]);
    const label = part(page, 'checkboxes', '.label');
    expect(await css(label, 'color')).toBe(await color(page, 'standard-label-color'));
    near(Number.parseFloat(await css(label, 'font-size')), await token(page, 'label-typescale-font-size'), 'label.typescale');
    const line = (await box(label)).height;
    const long = part(page, 'long-label', '.label');
    expect((await box(long)).height, 'the long label wraps').toBeGreaterThanOrEqual(2 * line - 0.6);
    expect(await long.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1), 'and is not cut').toBe(true);
    expect(await css(long, 'text-overflow')).not.toBe('ellipsis');
    expect((await box(long)).y + (await box(long)).height, 'never over a control').toBeLessThanOrEqual((await box(member(page, 'long-label', 0))).y + 0.5);
    // No label row: the description, or the controls, at the group's top; no mark.
    await expect(part(page, 'checkboxes-label-hidden', '.label-row')).toHaveCount(0);
    near((await box(part(page, 'checkboxes-label-hidden', '.supporting-text'))).y, (await box(host(page, 'checkboxes-label-hidden'))).y, 'the description is at the top');
    for (const id of ['hidden-required', 'empty']) {
      await expect(part(page, id, '.label-row, .requirement-tag, .asterisk'), id).toHaveCount(0);
      near((await box(part(page, id, '.controls'))).y, (await box(host(page, id))).y, `${id}: the controls are at the top`);
    }
  });

  test('FGR-3: vertical lays the controls out in one column in the order given, each from the start edge — a field fills the group’s width, a checkbox or a switch takes what its mark and its label need — gap.controls apart for controls and gap.fields apart for fields', async ({ page }) => {
    await mountSpec(page, 'checkboxes', 'switches', 'fields', 'long-label');
    const [controlsGap, fieldsGap] = [await token(page, 'gap-controls'), await token(page, 'gap-fields')];
    expect(fieldsGap).toBeGreaterThan(controlsGap);
    for (const id of ['checkboxes', 'switches']) {
      const h = await box(host(page, id));
      const boxes = await Promise.all((await members(page, id).all()).map(box));
      for (let i = 0; i < boxes.length; i++) {
        near(boxes[i].x, h.x, `${id} ${i}: from the start edge`);
        expect(boxes[i].width, `${id} ${i}: as wide as its mark and its label need`).toBeLessThan(h.width);
        if (i) near(boxes[i].y - (boxes[i - 1].y + boxes[i - 1].height), controlsGap, `${id}: gap.controls`);
      }
    }
    // The containers of two checkboxes gap.controls apart puts their marks a container and a gap apart.
    const marks = await Promise.all([0, 1].map(async (i) => (await box(member(page, 'checkboxes', i).locator('.box'))).y));
    near(marks[1] - marks[0], (await resolveToken(page, '--tanrei-comp-checkbox-container-size')) + controlsGap, 'the marks');
    // A checkbox wraps its own label inside the group's width.
    const wide = await box(member(page, 'long-label', 0));
    expect(wide.width).toBeLessThanOrEqual((await box(host(page, 'long-label'))).width + 0.5);
    expect(wide.height, 'its label wraps').toBeGreaterThan((await box(member(page, 'long-label', 1))).height);
    // Fields: each fills the width, gap.fields from the bottom of one (its supporting row, or its container) to the next one's label.
    const h = await box(host(page, 'fields'));
    const fields = await Promise.all((await members(page, 'fields').all()).map(box));
    for (const [i, f] of fields.entries()) {
      near(f.x, h.x, `field ${i}: from the start edge`);
      near(f.width, h.width, `field ${i}: fills the group`);
      if (i) near(f.y - (fields[i - 1].y + fields[i - 1].height), fieldsGap, 'gap.fields');
    }
    near((await box(member(page, 'fields', 1).locator('.label-row'))).y - ((await box(member(page, 'fields', 0).locator('.field > .container'))).y + (await box(member(page, 'fields', 0).locator('.field > .container'))).height), fieldsGap, 'from the first one’s container to the second one’s label');
  });

  test('FGR-4: requirement none says and draws nothing; required draws the required mark and says so in the group’s description; optional draws the optional tag and adds optionalText to the description; it never validates, and a disabled group keeps its mark — the asterisk from the disabled tokens, the tag drawn as a tag inside something disabled', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['checkboxes', 'checkboxes-required', 'checkboxes-optional', 'checkboxes-disabled'].includes(f.id)), fx('disabled-asterisk', { label: 'Notify me by', required: true, requiredMark: 'asterisk', disabled: true })]);
    await expect(part(page, 'checkboxes', '.requirement-tag, .asterisk')).toHaveCount(0);
    expect((await group(page, 'checkboxes')).described).toEqual([]);
    await expect(part(page, 'checkboxes-required', '.required-tag')).toBeVisible();
    expect((await group(page, 'checkboxes-required')).described).toEqual(['Choose all that apply.', 'Required']);
    await expect(part(page, 'checkboxes-optional', '.optional-tag')).toBeVisible();
    expect((await group(page, 'checkboxes-optional')).described).toEqual(['Optional']);
    // It never validates: nothing is checked in the optional fixture, a required set with nothing checked is not in error.
    await set(page, 'checkboxes-optional', { required: true });
    expect(await host(page, 'checkboxes-optional').evaluate((el: HTMLElement & { error: boolean }) => el.error)).toBe(false);
    await expect(part(page, 'checkboxes-optional', '.error-text')).toHaveCount(0);
    for (const control of await members(page, 'checkboxes-optional').all()) expect((await semantics(control)).invalid).toBe(false);
    // Disabled: the mark stays — the tag drawn as a tag inside something disabled, from the Tag's own disabled tokens
    // (TAG-21), so that it fades with the label …
    const tag = part(page, 'checkboxes-disabled', '.required-tag').locator('.container');
    await expect(tag).toBeVisible();
    expect(await part(page, 'checkboxes-disabled', '.required-tag').evaluate((el) => el.hasAttribute('disabled'))).toBe(true);
    expect(await part(page, 'checkboxes-required', '.required-tag').evaluate((el) => el.hasAttribute('disabled'))).toBe(false);
    expect(await css(tag, 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-tag-filled-disabled-container-color'));
    expect(await css(tag, 'color')).toBe(await resolveColor(page, '--tanrei-comp-tag-filled-disabled-label-color'));
    // … and the asterisk, which is the group's own, from the disabled tokens.
    expect(await css(part(page, 'disabled-asterisk', '.asterisk'), 'color')).toBe(await color(page, 'standard-disabled-required-asterisk-color'));
  });

  test('FGR-5: the requirement tag is the Tag component at its small size — filled for required, tonal for optional — after the label’s text, requirement.gap from it and centred on its line, drawn as every small tag is, from the Tag’s own tokens: the group has no token for it and sets none, so what restyles small tags restyles it, and it is the same at rest and in error, and drawn as a tag inside something disabled while the group is disabled; it is text, never a control, never makes the row taller, moves whole to a line of its own when the label wraps, is not drawn with an empty text, is hidden as a drawn part, and lies over the field’s tag', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['checkboxes', 'checkboxes-required', 'checkboxes-optional', 'long-label', 'checkboxes-error', 'checkboxes-disabled'].includes(f.id)),
      fx('optional-error', { label: 'Notify me by', required: false, optional: true, error: true, errorText: 'Wrong.' }),
      fx('optional-disabled', { label: 'Notify me by', required: false, optional: true, disabled: true }),
      // A bare tag of each look, to compare with.
      fx('tags', { label: 'Tags' }, '<tanrei-tag id="small-filled" size="small" variant="filled" label="Required"></tanrei-tag><tanrei-tag id="small-tonal" size="small" variant="tonal" label="Optional"></tanrei-tag><tanrei-tag id="small-filled-disabled" size="small" variant="filled" label="Required" disabled></tanrei-tag><tanrei-tag id="small-tonal-disabled" size="small" variant="tonal" label="Optional" disabled></tanrei-tag>'),
      fx('no-required-text', { label: 'Notify me by', required: true, requiredText: '' }),
      fx('no-optional-text', { label: 'Notify me by', required: false, optional: true, optionalText: '' }),
      // The field's own tags, to lay the two over each other.
      fx('fields', { label: 'Fields', spacing: 'fields' }, '<tanrei-field id="field-required" label="Volume" required required-text="Required"><input /></tanrei-field><tanrei-field id="field-optional" label="Volume" optional optional-text="Optional"><input /></tanrei-field>'),
    ]);
    for (const [id, kind, variant, text] of [
      ['checkboxes-required', 'required', 'filled', 'Required'],
      ['checkboxes-optional', 'optional', 'tonal', 'Optional'],
    ] as const) {
      const tag = part(page, id, `.${kind}-tag`);
      const container = tag.locator('.container');
      expect(await tag.evaluate((el) => [el.localName, el.getAttribute('size'), el.getAttribute('variant'), (el as HTMLElement & { label: string }).label])).toEqual(['tanrei-tag', 'small', variant, text]);
      // The Tag's own tokens: the group has none for it.
      expect(await css(container, 'background-color'), `${id} fill`).toBe(await resolveColor(page, `--tanrei-comp-tag-${variant}-container-color`));
      expect(await css(container, 'color'), `${id} label`).toBe(await resolveColor(page, `--tanrei-comp-tag-${variant}-label-color`));
      near(Number.parseFloat(await css(container, 'padding-left')), await resolveToken(page, '--tanrei-comp-tag-container-padding-inline-small'), `${id} padding-inline`);
      near(Number.parseFloat(await css(container, 'font-size')), await resolveToken(page, '--tanrei-comp-tag-label-typescale-small-font-size'), `${id} text size`);
      near((await box(container)).height, await resolveToken(page, '--tanrei-comp-tag-container-height-small'), `${id} height`);
      expect(await css(container, 'white-space')).toBe('nowrap');
      // Nothing of the tag is set on its element: no token of the Tag's and no size, inline or from the group's sheet.
      expect(await tag.evaluate((el) => [el.getAttribute('style'), getComputedStyle(el).marginBlockStart, getComputedStyle(el).marginBlockEnd]), `${id}: nothing set on the tag`).toEqual([null, '0px', '0px']);
      expect(
        await host(page, id).evaluate((el) => [...el.shadowRoot!.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).filter((text) => text.includes('--tanrei-comp-tag-') || /chip/.test(text))),
        `${id}: the group’s styles name no token of the Tag and none of a chip`,
      ).toEqual([]);
      const [t, l] = [await box(tag), await box(part(page, id, '.label'))];
      near(t.x - (l.x + l.width), await token(page, 'requirement-gap'), `${id} requirement.gap`);
      near(t.y + t.height / 2, l.y + l.height / 2, `${id} centred on the label’s line`);
      expect(Number.parseFloat(await css(container, 'border-top-left-radius')), `${id} corners`).toBeGreaterThanOrEqual(t.height / 2 - 0.6);
      near((await box(part(page, id, '.label-row'))).height, (await box(part(page, 'checkboxes', '.label-row'))).height, `${id}: the row is no taller`);
      expect(await tag.getAttribute('aria-hidden')).toBe('true');
      expect(await tag.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
      // The field's tag of the same kind: the same box, text style, fill and corners.
      const ofField = page.locator(`#field-${kind}`).locator(`.label-row > .requirement-box > .${kind}-tag`);
      const [a, b] = [await box(tag), await box(ofField)];
      near(a.width, b.width, `${id}: as wide as the field’s tag`, 0.1);
      near(a.height, b.height, `${id}: as tall as the field’s tag`, 0.1);
      for (const property of ['font', 'letter-spacing', 'padding', 'background-color', 'color', 'border-radius', 'box-shadow', 'min-block-size']) {
        expect(await css(container, property), `${id} ${property}`).toBe(await css(ofField.locator('.container'), property));
      }
    }
    // The same at rest and in error: a tag has no states. Disabled, the tag fixtures drawn inside something disabled (TAG-21).
    const look = (locator: Locator) => locator.locator('.container').evaluate((el) => ['background-color', 'color', 'font', 'padding', 'border-radius', 'box-shadow', 'opacity'].map((property) => getComputedStyle(el).getPropertyValue(property)).join('|'));
    const [filled, tonal] = [await look(page.locator('#small-filled')), await look(page.locator('#small-tonal'))];
    for (const id of ['checkboxes-required', 'checkboxes-error']) expect(await look(part(page, id, '.required-tag')), id).toBe(filled);
    for (const id of ['checkboxes-optional', 'optional-error']) expect(await look(part(page, id, '.optional-tag')), id).toBe(tonal);
    expect(await look(part(page, 'checkboxes-disabled', '.required-tag')), 'checkboxes-disabled').toBe(await look(page.locator('#small-filled-disabled')));
    expect(await look(part(page, 'optional-disabled', '.optional-tag')), 'optional-disabled').toBe(await look(page.locator('#small-tonal-disabled')));
    // What restyles small tags for the page restyles the requirement tags with them — the group's, the field's and a
    // bare tag alike — and nothing restyles them alone.
    await override(page, { '--tanrei-comp-tag-tonal-container-color': 'rgb(1, 2, 3)', '--tanrei-comp-tag-filled-container-color': 'rgb(4, 5, 6)', '--tanrei-comp-tag-filled-disabled-container-color': 'rgb(7, 8, 9)', '--tanrei-comp-tag-container-shape': '2px', '--tanrei-comp-tag-container-shape-pill': '0' });
    for (const [mine, own, fill] of [
      [part(page, 'checkboxes-optional', '.optional-tag'), page.locator('#small-tonal'), 'rgb(1, 2, 3)'],
      [part(page, 'checkboxes-required', '.required-tag'), page.locator('#small-filled'), 'rgb(4, 5, 6)'],
      [part(page, 'checkboxes-disabled', '.required-tag'), page.locator('#small-filled-disabled'), 'rgb(7, 8, 9)'],
      [page.locator('#field-required').locator('.label-row > .requirement-box > .required-tag'), page.locator('#small-filled'), 'rgb(4, 5, 6)'],
    ] as const) {
      expect(await css(mine.locator('.container'), 'background-color')).toBe(fill);
      expect(await css(own.locator('.container'), 'background-color')).toBe(fill);
      expect(await css(mine.locator('.container'), 'border-top-left-radius')).toBe(await css(own.locator('.container'), 'border-top-left-radius'));
    }
    await rootTokens(page, { '--tanrei-comp-tag-tonal-container-color': '', '--tanrei-comp-tag-filled-container-color': '', '--tanrei-comp-tag-filled-disabled-container-color': '', '--tanrei-comp-tag-container-shape': '', '--tanrei-comp-tag-container-shape-pill': '' });
    await frames(page);
    // The label and the tag do not fit on one line: the tag stands, whole, after the label's last line.
    const [label, tag] = [await box(part(page, 'long-label', '.label')), await box(part(page, 'long-label', '.required-tag'))];
    expect(tag.y + tag.height / 2).toBeGreaterThan(label.y + label.height - 1);
    near(tag.x, (await box(host(page, 'long-label'))).x, 'on a line of its own, from the start edge');
    await expect(part(page, 'no-required-text', '.requirement-tag')).toHaveCount(0);
    await expect(part(page, 'no-optional-text', '.requirement-tag')).toHaveCount(0);
    // (Once for each word, by the words' own report: FGR-24.)
    expect(seen.filter((w) => w.includes('FGR-24'))).toHaveLength(2);
  });

  test('FGR-6: a required set draws the mark requiredMark names — the tag, the asterisk after the label’s text in its style and the asterisk color, hidden from assistive technology, or nothing — and under auto the one comp.field-group.requirement.mark names, which follows sys.behavior.requirement-mark unless it is set apart — a group set apart leaves the field beside it on the system’s choice — and requiredMark wins over both; whichever mark is drawn, and with no drawn label, the requirement is still exposed', async ({ page }) => {
    const marks = ['auto', 'tag', 'asterisk', 'none'] as const;
    await mount(page, [...marks.map((mark) => fx(mark, { label: 'Notify me by', required: true, requiredMark: mark })), fx('hidden', { label: 'Notify me by', labelHidden: true, required: true }), fx('with-field', { label: 'Fields', spacing: 'fields' }, '<tanrei-field id="beside" label="Volume" required required-text="Required"><input /></tanrei-field>')]);
    const drawn = async (id: string) => ({
      tag: (await part(page, id, '.required-tag').count()) > 0 && (await part(page, id, '.required-tag').isVisible()),
      asterisk: (await part(page, id, '.asterisk').count()) > 0 && (await part(page, id, '.asterisk').isVisible()),
    });
    expect(await drawn('auto')).toEqual({ tag: true, asterisk: false });
    expect(await drawn('tag')).toEqual({ tag: true, asterisk: false });
    expect(await drawn('asterisk')).toEqual({ tag: false, asterisk: true });
    expect(await drawn('none')).toEqual({ tag: false, asterisk: false });
    const asterisk = part(page, 'asterisk', '.asterisk');
    await expect(asterisk).toHaveText('*');
    expect(await asterisk.getAttribute('aria-hidden')).toBe('true');
    expect(await css(asterisk, 'color')).toBe(await color(page, 'standard-required-asterisk-color'));
    expect(await css(asterisk, 'font-size')).toBe(await css(part(page, 'asterisk', '.label'), 'font-size'));
    near(Number.parseFloat(await css(asterisk, 'margin-inline-start')), await token(page, 'requirement-asterisk-gap'), 'asterisk-gap');
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
    }
    // The component's token follows the system's one choice: set for the page, a group under auto follows it …
    const SYSTEM = '--tanrei-sys-behavior-requirement-mark';
    await rootTokens(page, { [T('requirement-mark')]: '' });
    expect(await css(page.locator('html'), SYSTEM), 'the default system marks with the tag').toBe('tag');
    const again = async () => {
      for (const mark of marks) await set(page, mark, { requiredMark: mark === 'auto' ? '' : mark });
      for (const mark of marks) await set(page, mark, { requiredMark: mark });
      await page.locator('#beside').evaluate(async (el: HTMLElement & { supportingText: string; updateComplete: Promise<unknown> }) => ((el.supportingText = el.supportingText ? '' : 'x'), await el.updateComplete));
    };
    const beside = async () => {
      const row = page.locator('#beside').locator('.label-row');
      return { tag: await row.locator('.required-tag').isVisible(), asterisk: (await row.locator('.asterisk').count()) > 0 && (await row.locator('.asterisk').isVisible()) };
    };
    for (const [system, auto] of [
      ['asterisk', { tag: false, asterisk: true }],
      ['none', { tag: false, asterisk: false }],
    ] as const) {
      await override(page, { [SYSTEM]: system });
      await again();
      expect(await drawn('auto'), `auto under the system’s ${system}`).toEqual(auto);
      expect(await beside(), `the field beside it under the system’s ${system}`).toEqual(auto);
      // … the prop wins over it …
      expect(await drawn('tag'), `tag under the system’s ${system}`).toEqual({ tag: true, asterisk: false });
      expect(await drawn('asterisk'), `asterisk under the system’s ${system}`).toEqual({ tag: false, asterisk: true });
    }
    // … and the group's token, set against the system's choice, wins for the group and leaves the field beside it on the
    // system's choice.
    await override(page, { [SYSTEM]: 'asterisk', [T('requirement-mark')]: 'tag' });
    await again();
    expect(await drawn('auto'), 'the group’s token against the system’s').toEqual({ tag: true, asterisk: false });
    expect(await beside(), 'the field follows the system’s choice').toEqual({ tag: false, asterisk: true });
    expect(await drawn('none'), 'the prop over both').toEqual({ tag: false, asterisk: false });
    await rootTokens(page, { [SYSTEM]: '', [T('requirement-mark')]: '' });
    await again();
    // The requirement is exposed in words, whichever mark is drawn and where no label is.
    for (const id of [...marks, 'hidden']) expect((await group(page, id)).described, id).toEqual(['Required']);
  });

  test('FGR-7: the description is drawn below the label row — at the group’s top without one — and above the controls, in supporting-text.typescale and its color, wrapped and never cut; it keeps its place and its words while error is true; with no text there is no row and no gap', async ({ page }) => {
    await mountSpec(page, 'checkboxes', 'checkboxes-supporting', 'checkboxes-error', 'long-label');
    await expect(part(page, 'checkboxes', '.supporting-text')).toHaveCount(0);
    const id = 'checkboxes-supporting';
    const row = part(page, id, '.supporting-text');
    await expect(row).toHaveText('Choose all that apply.');
    expect(await css(row, 'color')).toBe(await color(page, 'standard-supporting-text-color'));
    near(Number.parseFloat(await css(row, 'font-size')), await token(page, 'supporting-text-typescale-font-size'), 'supporting-text.typescale');
    const [r, label, first] = [await box(row), await box(part(page, id, '.label-row')), await box(member(page, id, 0))];
    expect(r.y).toBeGreaterThanOrEqual(label.y + label.height - 0.5);
    expect(r.y + r.height).toBeLessThanOrEqual(first.y + 0.5);
    // In error it keeps its place and its words, in the error part of its token.
    const inError = part(page, 'checkboxes-error', '.supporting-text');
    await expect(inError).toHaveText('Choose all that apply.');
    expect(await css(inError, 'color')).toBe(await color(page, 'standard-error-supporting-text-color'));
    near((await box(inError)).y - (await box(host(page, 'checkboxes-error'))).y, r.y - (await box(host(page, id))).y, 'the same place');
    await set(page, id, { error: true, errorText: 'Choose at least one.' });
    near((await box(row)).y, r.y, 'it does not move when the group goes into error');
    await expect(row).toHaveText('Choose all that apply.');
    // Wrapped, never cut.
    const long = part(page, 'long-label', '.supporting-text');
    expect((await box(long)).height).toBeGreaterThan(2 * r.height - 1);
    expect(await long.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  });

  test('FGR-8: error draws errorText in a row below the last control in the error-text color, the label, the asterisk and the description from the error parts — the tag as it is — and puts each checkbox and each radio button in its own error condition; a switch stays as drawn and a text field keeps the error the product gave it; without error there is no row and each control keeps its own error condition; the group never sets error', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['checkboxes-error', 'checkboxes-required', 'fields'].includes(f.id)),
      fx('mixed', { label: 'Mixed', error: true, errorText: 'Something is wrong.', spacing: 'fields' }, '<tanrei-checkbox label="Email"></tanrei-checkbox><tanrei-switch label="Share"></tanrei-switch><tanrei-text-field label="Street"></tanrei-text-field><tanrei-text-field label="City" error error-text="Enter a city."></tanrei-text-field><input type="checkbox" aria-label="Native" /><input aria-label="Text" />'),
      fx('valid', { label: 'Valid' }, '<tanrei-checkbox label="Email" error></tanrei-checkbox><tanrei-checkbox label="Text"></tanrei-checkbox><tanrei-switch label="Share"></tanrei-switch>'),
      fx('no-text', { label: 'No text', error: true }),
      fx('radios', { label: 'Delivery', kind: 'radio-group', error: true, errorText: 'Choose one.' }, '<tanrei-radio-button name="d" value="a" label="Standard"></tanrei-radio-button><tanrei-radio-button name="d" value="b" label="Express" checked></tanrei-radio-button><tanrei-radio-button name="d" value="c" label="Pick-up" disabled></tanrei-radio-button>'),
      fx('radios-valid', { label: 'Delivery', kind: 'radio-group' }, '<tanrei-radio-button name="e" value="a" label="Standard" error></tanrei-radio-button><tanrei-radio-button name="e" value="b" label="Express" checked></tanrei-radio-button><tanrei-radio-button name="e" value="c" label="Pick-up" disabled></tanrei-radio-button>'),
      fx('asterisk', { label: 'Notify me by', required: true, requiredMark: 'asterisk', error: true, errorText: 'Wrong.' }),
    ]);
    const id = 'checkboxes-error';
    const error = part(page, id, '.error-text');
    await expect(error).toHaveText('Choose at least one way to reach you.');
    expect(await css(error, 'color')).toBe(await color(page, 'standard-error-text-color'));
    expect(await css(error, 'font')).toBe(await css(part(page, id, '.supporting-text'), 'font'));
    near((await box(error)).x, (await box(host(page, id))).x, 'from the start edge');
    expect(await css(part(page, id, '.label'), 'color')).toBe(await color(page, 'standard-error-label-color'));
    expect(await css(part(page, id, '.supporting-text'), 'color')).toBe(await color(page, 'standard-error-supporting-text-color'));
    // Under the default system only the error text takes the error role.
    expect(await css(error, 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-error'));
    expect(await css(part(page, id, '.label'), 'color')).toBe(await css(part(page, 'checkboxes-required', '.label'), 'color'));
    expect(await css(part(page, id, '.supporting-text'), 'color')).toBe(await css(part(page, 'checkboxes-required', '.supporting-text'), 'color'));
    // Every box in its error form, exposed as invalid by itself.
    const plain = await edge(member(page, 'checkboxes-required', 1));
    const ownError = await edge(member(page, 'valid', 0));
    expect(ownError).not.toBe(plain);
    for (const control of await members(page, id).all()) {
      expect(await edge(control)).toBe(ownError);
      expect((await semantics(control)).invalid).toBe(true);
    }
    // A switch stays as drawn and is not invalid; a text field keeps what the product gave it, error or none.
    const mixed = (nth: number) => member(page, 'mixed', nth);
    expect((await semantics(mixed(0))).invalid).toBe(true);
    expect(await semantics(mixed(1))).toMatchObject({ invalid: false, description: null });
    expect(await mixed(1).locator('.track').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await member(page, 'valid', 2).locator('.track').evaluate((el) => getComputedStyle(el).backgroundColor));
    expect(await mixed(2).locator('input').getAttribute('aria-invalid')).toBeNull();
    expect(await mixed(3).locator('input').getAttribute('aria-invalid')).toBe('true');
    await expect(mixed(3).locator('.error-text')).toHaveText('Enter a city.');
    expect(await mixed(4).getAttribute('aria-invalid'), 'a native checkbox is marked').toBe('true');
    expect(await mixed(5).getAttribute('aria-invalid'), 'a native text input says its own errors').toBeNull();
    // The asterisk takes its error part; the tag has none and is the tag it is out of error.
    expect(await css(part(page, 'asterisk', '.asterisk'), 'color')).toBe(await color(page, 'standard-error-required-asterisk-color'));
    for (const property of ['background-color', 'color']) expect(await css(part(page, id, '.required-tag').locator('.container'), property), `the tag’s ${property}`).toBe(await css(part(page, 'checkboxes-required', '.required-tag').locator('.container'), property));
    // Each radio button in its error form (RAD-26): the ring in the error form's color — the plain form's while
    // disabled, because disabled wins — and never exposed as invalid: the radio group says the error once.
    const ring = (control: Locator) => control.locator('.ring').evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
    const radio = (fixture: string, nth: number) => member(page, fixture, nth);
    expect(await radio('radios', 0).locator('.root').getAttribute('data-error')).toBe('');
    expect(await ring(radio('radios', 0))).toBe(await resolveColor(page, '--tanrei-comp-radio-button-error-unselected-ring-color'));
    expect(await ring(radio('radios', 1))).toBe(await resolveColor(page, '--tanrei-comp-radio-button-error-selected-ring-color'));
    expect(await ring(radio('radios', 0))).toBe(await ring(radio('radios-valid', 0)));
    expect(await ring(radio('radios', 1))).not.toBe(await ring(radio('radios-valid', 1)));
    expect(await ring(radio('radios', 2)), 'a disabled option shows no error color').toBe(await ring(radio('radios-valid', 2)));
    for (const nth of [0, 1, 2]) expect(await radio('radios', nth).locator('input').getAttribute('aria-invalid'), `radio ${nth}`).toBeNull();
    // With error false a radio button keeps the error the product gave it, and the others are at rest.
    expect(await radio('radios-valid', 0).locator('.root').getAttribute('data-error')).toBe('');
    expect(await radio('radios-valid', 1).locator('.root').getAttribute('data-error')).toBeNull();
    await set(page, 'radios', { error: false });
    await expect.poll(() => ring(radio('radios', 1))).toBe(await ring(radio('radios-valid', 1)));
    expect(await radio('radios', 0).locator('.root').getAttribute('data-error')).toBeNull();
    // No error text: no row, the boxes still in their error form.
    await expect(part(page, 'no-text', '.error-text')).toHaveCount(0);
    expect(await edge(member(page, 'no-text', 0))).toBe(ownError);
    // Without error: no row and no room; one control of a valid group may be in error by itself.
    await expect(part(page, 'valid', '.error-text')).toHaveCount(0);
    near((await box(host(page, 'valid'))).y + (await box(host(page, 'valid'))).height, (await box(member(page, 'valid', 2))).y + (await box(member(page, 'valid', 2))).height, 'no room for an error row');
    expect((await semantics(member(page, 'valid', 0))).invalid).toBe(true);
    expect(await edge(member(page, 'valid', 1))).toBe(plain);
    await set(page, id, { error: false });
    for (const control of await members(page, id).all()) await expect.poll(() => edge(control)).toBe(plain);
    // It never sets error itself: unchecking everything in a required set changes nothing of the group's.
    await member(page, 'checkboxes-required', 0).click();
    expect(await host(page, 'checkboxes-required').evaluate((el: HTMLElement & { error: boolean }) => el.error)).toBe(false);
  });

  test('FGR-9: an error that appears, or changes its words, while focus is inside the group is announced once, politely; one set while focus is elsewhere is not announced and is read with the group; focus does not move, and no other change of its texts is announced', async ({ page }) => {
    await mount(page, [fx('a', { label: 'Notify me by', supportingText: 'Choose all that apply.' }), fx('b', { label: 'Days' }), fx('first', { label: 'First', error: true, errorText: 'Drawn in error from the start.' })]);
    const region = host(page, 'a').locator('.announcer');
    expect(await region.getAttribute('aria-live')).toBe('polite');
    await frames(page);
    expect(await announced(page, 'first')).toBe('');
    await member(page, 'a', 1).locator('input').focus();
    await set(page, 'a', { supportingText: 'New help.', required: true });
    await frames(page);
    expect(await announced(page, 'a')).toBe('');
    await set(page, 'a', { error: true, errorText: 'Choose at least one.' });
    await expect.poll(() => announced(page, 'a')).toBe('Choose at least one.');
    expect(await activeInside(member(page, 'a', 1)), 'focus stays').toBe(true);
    await set(page, 'a', { errorText: 'Choose one or two.' });
    await expect.poll(() => announced(page, 'a')).toBe('Choose one or two.');
    await set(page, 'b', { error: true, errorText: 'Choose a day.' });
    await frames(page);
    expect(await announced(page, 'b')).toBe('');
    expect((await group(page, 'b')).described).toEqual(['Choose a day.']);
    expect(await activeInside(member(page, 'a', 1))).toBe(true);
  });

  test('FGR-10: the group is exposed as a group that contains its controls and is named by label, drawn or not; it has neither a required nor an invalid state — each checkbox it put in error is invalid by itself, a radio button it put in error is not, and the requirement is in the description; an empty label still renders and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [...spec.fixtures.filter((f) => ['checkboxes', 'checkboxes-label-hidden', 'checkboxes-error', 'radio-buttons-required-error'].includes(f.id)), fx('nameless', {})]);
    for (const id of ['checkboxes', 'checkboxes-label-hidden']) {
      expect(await group(page, id), id).toMatchObject({ role: 'fieldset', name: 'Notify me by' });
      const named = stage(page, id).getByRole('group', { name: 'Notify me by', exact: true });
      await expect(named, id).toHaveCount(1);
      // It contains its controls: each is slotted inside the fieldset.
      await expect(stage(page, id).getByRole('checkbox'), id).toHaveCount(3);
      for (const control of await members(page, id).all()) expect(await contained(page, id, control), id).toBe(true);
    }
    expect(await group(page, 'checkboxes-error')).toMatchObject({ required: false, invalid: false, described: ['Choose all that apply.', 'Choose at least one way to reach you.', 'Required'] });
    for (const control of await members(page, 'checkboxes-error').all()) expect((await semantics(control)).invalid).toBe(true);
    // A radio button's role has no invalid state: the radio group carries it, once, and each option is only drawn in error.
    await expect(members(page, 'radio-buttons-required-error').first()).toBeVisible();
    for (const control of await members(page, 'radio-buttons-required-error').all()) {
      expect(await control.locator('input').getAttribute('aria-invalid')).toBeNull();
      expect(await control.locator('.root').getAttribute('data-error')).toBe('');
    }
    expect(await host(page, 'radio-buttons-required-error').evaluate((el) => el.shadowRoot!.querySelector('fieldset')!.getAttribute('aria-invalid'))).toBe('true');
    await expect(host(page, 'nameless')).toBeVisible();
    await expect(members(page, 'nameless')).toHaveCount(3);
    expect(seen.filter((w) => w.includes('FGR-10'))).toHaveLength(1);
  });

  test('FGR-11: the group’s description is supportingText, then errorText while error is true, then requiredText or optionalText; while error is true errorText is also the description of each checkbox it put in error, after any the control has of its own, and of no radio button; a change is exposed at once; the tag and the asterisk are not exposed', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['checkboxes-supporting', 'checkboxes-error', 'checkboxes-optional', 'checkboxes-required-ja', 'radio-buttons-required-error'].includes(f.id)),
      fx('native', { label: 'Native', error: true, errorText: 'Choose one.' }, '<input type="checkbox" aria-label="A" aria-description="Mine." /><tanrei-switch label="Share"></tanrei-switch>'),
    ]);
    expect((await group(page, 'checkboxes-supporting')).described).toEqual(['Choose all that apply.']);
    expect((await group(page, 'checkboxes-error')).described).toEqual(['Choose all that apply.', 'Choose at least one way to reach you.', 'Required']);
    expect((await group(page, 'checkboxes-optional')).described).toEqual(['Optional']);
    expect((await group(page, 'checkboxes-required-ja')).described).toEqual(['当てはまるものをすべて選んでください。', '必須']);
    for (const control of await members(page, 'checkboxes-error').all()) expect((await semantics(control)).description).toBe('Choose at least one way to reach you.');
    // A radio button it put in error is given no description: the radio group is described by the error text, and an
    // option that repeated it would say the error once for every arrow key.
    for (const control of await members(page, 'radio-buttons-required-error').all()) expect(await control.locator('input').getAttribute('aria-description')).toBeNull();
    expect((await group(page, 'radio-buttons-required-error')).described).toContain(String(spec.fixtures.find((f) => f.id === 'radio-buttons-required-error')!.props.errorText));
    expect(await member(page, 'native', 0).getAttribute('aria-description')).toBe('Mine. Choose one.');
    expect((await semantics(member(page, 'native', 1))).description, 'a control it did not put in error is not described by the error').toBeNull();
    // A change is exposed at once.
    await set(page, 'checkboxes-error', { errorText: 'Choose one or more.' });
    expect((await group(page, 'checkboxes-error')).described[1]).toBe('Choose one or more.');
    expect((await semantics(member(page, 'checkboxes-error', 0))).description).toBe('Choose one or more.');
    await set(page, 'checkboxes-error', { error: false, required: false, optional: true, optionalText: 'Optional', supportingText: '' });
    expect((await group(page, 'checkboxes-error')).described).toEqual(['Optional']);
    expect((await semantics(member(page, 'checkboxes-error', 0))).description).toBeNull();
    await set(page, 'native', { error: false });
    expect(await member(page, 'native', 0).getAttribute('aria-description')).toBe('Mine.');
    // The drawn marks are hidden; the words that carry the requirement are drawn nowhere.
    expect(await part(page, 'checkboxes-optional', '.optional-tag').getAttribute('aria-hidden')).toBe('true');
    await expect(host(page, 'checkboxes-optional').locator('#requirement')).toBeHidden();
  });

  test('FGR-12: a press on the label, the requirement mark, the description or the error text does nothing and moves no focus; the group adds no stop to the focus order and handles no key — Tab reaches its controls as it would outside it', async ({ page }) => {
    await mount(page, [fx('a', { label: 'Notify me by', required: true, supportingText: 'Choose all that apply.', error: true, errorText: 'Choose at least one.' }), fx('b', { label: 'Days' }, [checkbox('Monday'), checkbox('Tuesday', { disabled: true }), checkbox('Wednesday')])]);
    const checkedBefore = await members(page, 'a').evaluateAll((all) => all.map((el) => (el as HTMLElement & { checked: boolean }).checked));
    for (const target of ['.label', '.required-tag', '.supporting-text', '.error-text']) {
      await part(page, 'a', target).click();
      expect(await activeInside(host(page, 'a')), `${target}: no focus moved`).toBe(false);
    }
    expect(await members(page, 'a').evaluateAll((all) => all.map((el) => (el as HTMLElement & { checked: boolean }).checked))).toEqual(checkedBefore);
    expect(await host(page, 'a').evaluate((el) => [el.tabIndex, el.shadowRoot!.querySelectorAll('[tabindex], button, a[href], input').length])).toEqual([-1, 0]);
    // Tab: each enabled control in the order given, then on to the next group; the group itself is not a stop.
    await tabTo(page, member(page, 'a', 0));
    for (const next of [member(page, 'a', 1), member(page, 'a', 2), member(page, 'b', 0), member(page, 'b', 2)]) {
      await tab(page);
      expect(await activeInside(next)).toBe(true);
    }
    // No key is the group's: Space is the focused control's.
    await page.keyboard.press('Space');
    expect(await member(page, 'b', 2).evaluate((el: HTMLElement & { checked: boolean }) => el.checked)).toBe(true);
  });

  test('FGR-13: horizontal lays the controls out in a row from the start edge, gap-inline apart, their first lines aligned — a selection control as wide as it needs, fields an equal share each and never less than field.min-width, aligned at their tops — and wraps onto further lines gap.<spacing> apart, cutting, scrolling and narrowing no control; at 200 % text a row becomes a column without overlap', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['checkboxes-horizontal', 'checkboxes-horizontal-many', 'fields-horizontal'].includes(f.id)), fx('narrow', { label: 'Notify me by', orientation: 'horizontal' }, [checkbox('Email'), checkbox('Text'), checkbox('Push')])]);
    const [inline, controlsGap] = [await token(page, 'gap-inline'), await token(page, 'gap-controls')];
    const row = await Promise.all((await members(page, 'checkboxes-horizontal').all()).map(box));
    near(row[0].x, (await box(host(page, 'checkboxes-horizontal'))).x, 'from the start edge');
    for (let i = 1; i < row.length; i++) {
      near(row[i].y, row[0].y, 'on one line');
      near(row[i].x - (row[i - 1].x + row[i - 1].width), inline, 'gap-inline');
    }
    // Fields: an equal share of the row each, aligned at their tops, so their labels start on one line.
    const [h, a, b] = [await box(host(page, 'fields-horizontal')), await box(member(page, 'fields-horizontal', 0)), await box(member(page, 'fields-horizontal', 1))];
    near(a.width, (h.width - inline) / 2, 'an equal share');
    near(b.width, a.width, 'an equal share');
    near(b.x - (a.x + a.width), inline, 'gap-inline');
    near(a.y, b.y, 'aligned at their tops');
    near((await box(member(page, 'fields-horizontal', 0).locator('.label-row > .label'))).y, (await box(member(page, 'fields-horizontal', 1).locator('.label-row > .label'))).y, 'their labels on one line');
    // Never narrower than field.min-width: 400 wide, two fields share the row; 280 wide — less than two of them and
    // gap-inline — the second takes a line of its own, gap.fields below, and each is as wide as the group.
    {
      const [least, fieldsGap] = [await token(page, 'field-min-width'), await token(page, 'gap-fields')];
      expect(least, 'derived from the size scale: 36 units at the dial’s default').toBe(144);
      await host(page, 'fields-horizontal').evaluate((el) => (el.style.inlineSize = '400px'));
      await frames(page);
      const [wa, wb] = [await box(member(page, 'fields-horizontal', 0)), await box(member(page, 'fields-horizontal', 1))];
      near(wa.y, wb.y, '400: one line');
      near(wa.width, (400 - inline) / 2, '400: an equal share');
      await host(page, 'fields-horizontal').evaluate((el) => (el.style.inlineSize = `${2 * 144 + 16 - 24}px`));
      await frames(page);
      const width = (await box(host(page, 'fields-horizontal'))).width;
      expect(width, 'narrower than two fields of the least width').toBeLessThan(2 * least + inline);
      const [na, nb] = [await box(member(page, 'fields-horizontal', 0)), await box(member(page, 'fields-horizontal', 1))];
      near(nb.y - (na.y + na.height), fieldsGap, 'the second field on a line of its own, gap.fields below');
      near(na.width, width, 'the first as wide as the group');
      near(nb.width, width, 'the second as wide as the group');
      near(nb.x, na.x, 'both from the start edge');
      // A product's least width is followed.
      await override(page, { [T('field-min-width')]: '100px' });
      await frames(page);
      near((await box(member(page, 'fields-horizontal', 1))).y, (await box(member(page, 'fields-horizontal', 0))).y, 'with a least width of 100 the two share the row again');
      await override(page, { [T('field-min-width')]: '' });
      await host(page, 'fields-horizontal').evaluate((el) => (el.style.inlineSize = ''));
      await frames(page);
    }
    // The many-option fixture wraps in the stage: several lines, gap.controls apart, nothing cut or outside the group.
    const many = await Promise.all((await members(page, 'checkboxes-horizontal-many').all()).map(box));
    const group_ = await box(host(page, 'checkboxes-horizontal-many'));
    const lines = [...new Set(many.map((m) => Math.round(m.y)))].sort((x, y) => x - y);
    expect(lines.length).toBeGreaterThan(2);
    near(lines[1] - lines[0], many[0].height + controlsGap, 'the lines are gap.controls apart', 1);
    for (const m of many) expect(m.x + m.width, 'inside the group').toBeLessThanOrEqual(group_.x + group_.width + 0.5);
    expect(await members(page, 'checkboxes-horizontal-many').evaluateAll((all) => all.every((el) => { const label = el.shadowRoot!.querySelector('.label')!; return label.scrollWidth <= label.clientWidth + 1; })), 'no label is cut').toBe(true);
    // In a group 200 wide three checkboxes with one-word labels take two lines, gap.controls apart.
    await host(page, 'narrow').evaluate((el) => (el.style.inlineSize = '200px'));
    await frames(page);
    const narrow = await Promise.all((await members(page, 'narrow').all()).map(box));
    expect([...new Set(narrow.map((m) => Math.round(m.y)))]).toHaveLength(2);
    near(narrow[2].y - (narrow[0].y + narrow[0].height), controlsGap, 'two lines, gap.controls apart');
    // At 200 % text the same row becomes a column, without overlap.
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await frames(page);
    const large = await Promise.all((await members(page, 'narrow').all()).map(box));
    expect([...new Set(large.map((m) => Math.round(m.y)))]).toHaveLength(3);
    for (let i = 1; i < large.length; i++) expect(large[i].y).toBeGreaterThanOrEqual(large[i - 1].y + large[i - 1].height - 0.5);
  });

  test('FGR-14: disabled draws the label, the asterisk, the description and the error text from the disabled tokens and the requirement tag as a tag inside something disabled, makes every control it holds disabled as its own disabled does, and exposes the group as disabled; an enabled group does not enable a control the product disabled; its texts stay readable', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['checkboxes-disabled', 'checkboxes-one-disabled'].includes(f.id)),
      fx('mixed', { label: 'Mixed', disabled: true, error: true, errorText: 'Wrong.', supportingText: 'Help.', spacing: 'fields' }, '<tanrei-checkbox label="Email"></tanrei-checkbox><tanrei-switch label="Share"></tanrei-switch><tanrei-text-field label="Street"></tanrei-text-field><tanrei-slider label="Volume"></tanrei-slider><input aria-label="Native" /><button type="button">Press</button>'),
    ]);
    const id = 'checkboxes-disabled';
    expect(await css(part(page, id, '.label'), 'color')).toBe(await color(page, 'standard-disabled-label-color'));
    expect(await css(part(page, id, '.supporting-text'), 'color')).toBe(await color(page, 'standard-disabled-supporting-text-color'));
    expect(await css(part(page, 'mixed', '.error-text'), 'color')).toBe(await color(page, 'standard-disabled-error-text-color'));
    expect(await css(part(page, 'mixed', '.supporting-text'), 'color')).toBe(await color(page, 'standard-disabled-error-supporting-text-color'));
    // The requirement tag is no part of the group's own: it is drawn as a tag inside something disabled, from the Tag's
    // own disabled tokens (FGR-5, TAG-21).
    expect(await css(part(page, id, '.required-tag').locator('.container'), 'background-color')).toBe(await resolveColor(page, '--tanrei-comp-tag-filled-disabled-container-color'));
    expect(await css(part(page, id, '.required-tag').locator('.container'), 'color')).toBe(await resolveColor(page, '--tanrei-comp-tag-filled-disabled-label-color'));
    expect((await group(page, id)).disabled).toBe(true);
    for (const control of await members(page, id).all()) {
      expect((await semantics(control)).disabled).toBe(true);
      expect(await control.evaluate((el: HTMLElement & { disabled: boolean }) => el.disabled), 'the product’s own property is not written').toBe(false);
    }
    await member(page, id, 1).click({ force: true });
    expect(await member(page, id, 1).evaluate((el: HTMLElement & { checked: boolean }) => el.checked), 'not operable').toBe(false);
    // Every kind of control.
    expect((await semantics(member(page, 'mixed', 0))).disabled).toBe(true);
    expect((await semantics(member(page, 'mixed', 1))).disabled).toBe(true);
    expect(await member(page, 'mixed', 2).locator('input').evaluate((el: HTMLInputElement) => el.disabled)).toBe(true);
    expect((await semantics(member(page, 'mixed', 3))).disabled).toBe(true);
    expect(await member(page, 'mixed', 4).evaluate((el: HTMLInputElement) => el.disabled)).toBe(true);
    expect(await member(page, 'mixed', 5).evaluate((el: HTMLButtonElement) => el.disabled)).toBe(true);
    // Not focusable: Tab passes the whole group by.
    await tabTo(page, member(page, 'checkboxes-one-disabled', 0));
    expect(await activeInside(host(page, id))).toBe(false);
    // Enabled again: each control is given back; one the product disabled itself stays disabled.
    await set(page, 'mixed', { disabled: false });
    expect((await semantics(member(page, 'mixed', 0))).disabled).toBe(false);
    expect(await member(page, 'mixed', 4).evaluate((el: HTMLInputElement) => el.disabled)).toBe(false);
    expect((await group(page, 'mixed')).disabled).toBe(false);
    expect((await semantics(member(page, 'checkboxes-one-disabled', 1))).disabled).toBe(true);
    await set(page, 'checkboxes-one-disabled', { disabled: true });
    await set(page, 'checkboxes-one-disabled', { disabled: false });
    expect((await semantics(member(page, 'checkboxes-one-disabled', 1))).disabled, 'still the product’s').toBe(true);
    expect((await semantics(member(page, 'checkboxes-one-disabled', 0))).disabled).toBe(false);
    // Its texts stay readable.
    expect(await group(page, id)).toMatchObject({ name: 'Notify me by', described: ['Choose all that apply.', 'Required'] });
    expect(await part(page, id, '.supporting-text').getAttribute('aria-hidden')).toBeNull();
  });

  test('FGR-15: radio buttons in a field group are framed like any control and given nothing a set of them needs — no value, no required or invalid state, no radio group — and reported; a member that is a group of its own is one member: placed and spaced as a field, passed disabled, and passed neither the error nor the requirement; the group selects nothing, holds no value, moves no focus and emits no event', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('radios', { label: 'Delivery', required: true, error: true, errorText: 'Choose one.' }, '<tanrei-radio-button name="delivery" value="standard" label="Standard"></tanrei-radio-button><tanrei-radio-button name="delivery" value="express" label="Express"></tanrei-radio-button>'),
      // What a radio group is to a field group: a member that speaks for itself and follows only `disabled`.
      fx('shipping', { label: 'Shipping', spacing: 'fields', required: true, error: true, errorText: 'Something is missing.' }, '<tanrei-text-field label="Street"></tanrei-text-field><acme-radio-group></acme-radio-group>'),
    ]);
    const states = await page.evaluate(async () => {
      const told: unknown[] = [];
      customElements.define(
        'acme-radio-group',
        class extends HTMLElement {
          connectedCallback() {
            this.setAttribute('role', 'radiogroup');
            this.setAttribute('aria-label', 'Delivery');
            this.dispatchEvent(new CustomEvent('tanrei-field-connect', { bubbles: true, composed: true, detail: { control: this, takes: 'disabled', errorCondition: false, framed: true, named: () => true, update: (state: unknown) => told.push(state) } }));
          }
        },
      );
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      (window as unknown as { told: unknown[] }).told = told;
      return told;
    });
    // Radio buttons: framed, laid out, and nothing added.
    expect(await host(page, 'radios').evaluate((el) => [el.shadowRoot!.querySelector('[role="radiogroup"]'), (el as unknown as { value?: unknown }).value])).toEqual([null, undefined]);
    for (const radio of await members(page, 'radios').all()) expect(await semantics(radio)).toMatchObject({ invalid: false, required: false, description: null });
    // (FGR-8 does not ask the kind: the group in error draws them in their error form all the same.)
    for (const radio of await members(page, 'radios').all()) expect(await radio.locator('.root').getAttribute('data-error')).toBe('');
    expect(await group(page, 'radios')).toMatchObject({ role: 'fieldset', required: false, invalid: false });
    expect(seen.filter((w) => w.includes('FGR-15') && w.includes('radio group'))).toHaveLength(1);
    // The radio buttons keep what is theirs: exclusion by name.
    await member(page, 'radios', 1).click();
    await member(page, 'radios', 0).click();
    expect(await members(page, 'radios').evaluateAll((all) => all.map((el) => (el as HTMLElement & { checked: boolean }).checked))).toEqual([true, false]);
    // A member that is a group of its own: one group inside the group, beside a text field.
    const outer = stage(page, 'shipping').getByRole('group', { name: 'Shipping', exact: true });
    await expect(outer).toHaveCount(1);
    await expect(stage(page, 'shipping').getByRole('textbox', { name: 'Street' })).toHaveCount(1);
    await expect(stage(page, 'shipping').getByRole('radiogroup', { name: 'Delivery' })).toHaveCount(1);
    for (const control of await members(page, 'shipping').all()) expect(await contained(page, 'shipping', control)).toBe(true);
    expect(states.at(-1)).toEqual({ label: '', description: '', invalid: false, required: false, requiredText: '', disabled: false });
    expect(await member(page, 'shipping', 1).evaluate((el) => ['aria-invalid', 'aria-required', 'aria-description'].map((name) => el.getAttribute(name)))).toEqual([null, null, null]);
    expect(await member(page, 'shipping', 0).locator('input').getAttribute('aria-invalid'), 'its error reaches neither').toBeNull();
    near((await box(member(page, 'shipping', 1))).y - ((await box(member(page, 'shipping', 0))).y + (await box(member(page, 'shipping', 0))).height), await token(page, 'gap-fields'), 'spaced as a field');
    // Disabling the field group disables both.
    await set(page, 'shipping', { disabled: true });
    expect(await page.evaluate(() => ((window as unknown as { told: { disabled: boolean }[] }).told.at(-1) ?? { disabled: false }).disabled)).toBe(true);
    expect(await member(page, 'shipping', 0).locator('input').evaluate((el: HTMLInputElement) => el.disabled)).toBe(true);
    // It holds no value and takes no part in a form.
    expect(await host(page, 'radios').evaluate((el) => [(el.constructor as unknown as { formAssociated?: boolean }).formAssociated === true, 'value' in el, 'name' in el])).toEqual([false, false, false]);
  });

  test('FGR-15: a radio group inside a field group is one member — placed and spaced as a field, a radio group inside the group, following the field group’s disabled and nothing else: neither its error nor its requirement reaches the radio group or its radio buttons, which keep their value, their keys and their one change', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx(
        'shipping',
        { label: 'Shipping', spacing: 'fields', required: true, error: true, errorText: 'Something is missing.' },
        '<tanrei-text-field label="Street"></tanrei-text-field><tanrei-radio-group label="Delivery" name="delivery" value="standard" supporting-text="You can change this later."><tanrei-radio-button value="standard" label="Standard"></tanrei-radio-button><tanrei-radio-button value="express" label="Express"></tanrei-radio-button></tanrei-radio-group>',
      ),
    ]);
    await frames(page);
    const inner = member(page, 'shipping', 1);
    const radios = inner.locator('tanrei-radio-button');
    const radioGroup = () =>
      inner.evaluate((el) => {
        // The radio group is the field group's own element inside it, in its radio-group kind (FGR-25, RGP-10).
        const frame = el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!;
        const root = frame.querySelector('[role="radiogroup"]')!;
        return { value: (el as HTMLElement & { value: string }).value, required: root.getAttribute('aria-required'), invalid: root.getAttribute('aria-invalid'), disabled: root.getAttribute('aria-disabled'), described: root.getAttribute('aria-describedby'), error: frame.querySelectorAll('.error-text').length };
      });
    // One group inside the group, beside a text field, and nothing reported about radio buttons: these are a radio group's.
    await expect(stage(page, 'shipping').getByRole('group', { name: 'Shipping', exact: true })).toHaveCount(1);
    await expect(stage(page, 'shipping').getByRole('radiogroup', { name: 'Delivery', exact: true })).toHaveCount(1);
    await expect(stage(page, 'shipping').getByRole('radio')).toHaveCount(2);
    for (const control of await members(page, 'shipping').all()) expect(await contained(page, 'shipping', control)).toBe(true);
    expect(seen.filter((w) => w.includes('FGR-15'))).toEqual([]);
    // One member: the radio group asked, and the field group in its shadow root did not (the spec's web note of the
    // radio group) — the outer group keeps two connections, the text field's frame and the radio group, and none for a
    // field group.
    expect(await host(page, 'shipping').evaluate((el) => [...(el as unknown as { provider: { connections: Map<Element, unknown> } }).provider.connections.keys()].map((control) => control.localName).sort())).toEqual(['tanrei-field', 'tanrei-radio-group']);
    // Placed and spaced as a field: it fills the group's width, gap.fields below the text field.
    const [h, street, delivery] = [await box(host(page, 'shipping')), await box(member(page, 'shipping', 0)), await box(inner)];
    near(delivery.width, h.width, 'it fills the group’s width');
    near(delivery.y - (street.y + street.height), await token(page, 'gap-fields'), 'spaced as a field');
    // Neither the error nor the requirement reaches it or its radio buttons.
    expect(await radioGroup()).toEqual({ value: 'standard', required: null, invalid: null, disabled: null, described: 'supporting', error: 0 });
    for (const one of await radios.all()) expect(await semantics(one)).toMatchObject({ invalid: false, required: false, description: null, disabled: false });
    // The radio group keeps what is its own: the value, the arrow keys, one change.
    await inner.evaluate((el) => {
      const log: string[] = ((window as unknown as { changes: string[] }).changes = []);
      el.parentElement!.addEventListener('change', (event) => log.push(`${(event.target as Element).localName} ${(event as CustomEvent<{ value: string }>).detail.value}`));
    });
    await radios.nth(0).evaluate((el) => el.focus());
    await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await radioGroup()).value).toBe('express');
    expect(await page.evaluate(() => (window as unknown as { changes: string[] }).changes)).toEqual(['tanrei-radio-group express']);
    // Disabling the field group disables both members, and every radio button through its radio group; the value is kept.
    await set(page, 'shipping', { disabled: true });
    await expect.poll(async () => (await radioGroup()).disabled).toBe('true');
    await expect.poll(() => radios.evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('input')!.disabled))).toEqual([true, true]);
    expect(await member(page, 'shipping', 0).locator('input').evaluate((el: HTMLInputElement) => el.disabled)).toBe(true);
    expect((await radioGroup()).value).toBe('express');
    await set(page, 'shipping', { disabled: false });
    await expect.poll(() => radios.evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('input')!.disabled))).toEqual([false, false]);
    expect((await radioGroup()).disabled).toBeNull();
  });

  test('FGR-15: a checkbox group inside a field group is one member — placed and spaced as a field, a group inside the group, following the field group’s disabled and nothing else: neither its error nor its requirement reaches the checkbox group or its checkboxes, which keep their value and their one change', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx(
        'contact',
        { label: 'Contact', spacing: 'fields', required: true, error: true, errorText: 'Something is missing.' },
        '<tanrei-text-field label="Name"></tanrei-text-field><tanrei-checkbox-group label="Notify me by" name="notify" supporting-text="Choose all that apply."><tanrei-checkbox value="email" label="Email" checked></tanrei-checkbox><tanrei-checkbox value="text" label="Text message"></tanrei-checkbox></tanrei-checkbox-group>',
      ),
    ]);
    await frames(page);
    const inner = member(page, 'contact', 1);
    const boxes = inner.locator('tanrei-checkbox');
    const said = () =>
      inner.evaluate((el) => {
        const set = el.shadowRoot!.querySelector('tanrei-field-group')!.shadowRoot!;
        return { value: (el as HTMLElement & { value: string[] }).value, disabled: set.querySelector('fieldset')!.getAttribute('aria-disabled'), error: set.querySelectorAll('.error-text').length, boxes: [...el.querySelectorAll('tanrei-checkbox')].map((each) => `${each.shadowRoot!.querySelector('input')!.disabled} ${each.shadowRoot!.querySelector('input')!.getAttribute('aria-invalid')}`) };
      });
    // One group inside the group, beside a text field; the checkboxes are the inner group's.
    await expect(stage(page, 'contact').getByRole('group', { name: 'Contact', exact: true })).toHaveCount(1);
    await expect(stage(page, 'contact').getByRole('group', { name: 'Notify me by', exact: true })).toHaveCount(1);
    await expect(stage(page, 'contact').getByRole('checkbox')).toHaveCount(2);
    for (const control of await members(page, 'contact').all()) expect(await contained(page, 'contact', control)).toBe(true);
    // Placed and spaced as a field.
    const [h, name, notify] = [await box(host(page, 'contact')), await box(member(page, 'contact', 0)), await box(inner)];
    near(notify.width, h.width, 'it fills the group’s width');
    near(notify.y - (name.y + name.height), await token(page, 'gap-fields'), 'spaced as a field');
    // Neither the error nor the requirement reaches it or its checkboxes.
    expect(await said()).toEqual({ value: ['email'], disabled: null, error: 0, boxes: ['false null', 'false null'] });
    // Disabled reaches it, its frame and every checkbox; the value is kept.
    await host(page, 'contact').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await expect.poll(async () => (await said()).boxes).toEqual(['true null', 'true null']);
    expect(await said()).toMatchObject({ value: ['email'], disabled: 'true', error: 0 });
    await host(page, 'contact').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = false));
    await expect.poll(async () => (await said()).boxes).toEqual(['false null', 'false null']);
    // It keeps its one change.
    await inner.evaluate((el) => {
      (window as unknown as { changes: string[][] }).changes = [];
      el.addEventListener('change', (event) => (window as unknown as { changes: string[][] }).changes.push((event as CustomEvent<{ value: string[] }>).detail.value));
    });
    await boxes.nth(1).click();
    expect(await page.evaluate(() => (window as unknown as { changes: string[][] }).changes)).toEqual([['email', 'text']]);
    expect(seen.filter((w) => w.includes('FGR-15') || w.includes('FGR-20'))).toEqual([]);
  });

  test('FGR-16: with the text enlarged the group grows with its texts — the label, the description and the error text wrap and never clip, the tag grows with its text and keeps its paddings, a horizontal row wraps, the rows keep their order and gaps; at 200 % nothing is lost, overlaps or scrolls sideways', async ({ page }) => {
    const ids = ['long-label', 'checkboxes-error', 'checkboxes-horizontal'];
    await page.setViewportSize({ width: 320, height: 1600 });
    await mountSpec(page, ...ids);
    const before = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, (await box(host(page, id))).height] as const)));
    const labelSize = Number.parseFloat(await css(part(page, 'checkboxes-error', '.label'), 'font-size'));
    const tagSize = Number.parseFloat(await css(part(page, 'checkboxes-error', '.required-tag').locator('.container'), 'font-size'));
    await page.addStyleTag({ content: 'html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; } .stage > tanrei-field-group { inline-size: auto !important; }' });
    await frames(page);
    near(Number.parseFloat(await css(part(page, 'checkboxes-error', '.label'), 'font-size')), 2 * labelSize, 'the label grows');
    const tag = part(page, 'checkboxes-error', '.required-tag').locator('.container');
    near(Number.parseFloat(await css(tag, 'font-size')), 2 * tagSize, 'the tag grows with its text');
    near(Number.parseFloat(await css(tag, 'padding-left')), await resolveToken(page, '--tanrei-comp-tag-container-padding-inline-small'), 'the tag keeps its paddings');
    for (const id of ids) {
      expect((await box(host(page, id))).height, `${id} grows`).toBeGreaterThan(before[id]);
      expect(await stage(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: no scrolling sideways`).toBe(true);
      const rows = await host(page, id).evaluate((el) =>
        [el.shadowRoot!.querySelector('.label-row'), el.shadowRoot!.querySelector('.supporting-text'), el.shadowRoot!.querySelector('.controls'), el.shadowRoot!.querySelector('.error-text')].filter((row): row is Element => !!row).map((row) => [row.getBoundingClientRect().top, row.getBoundingClientRect().bottom]),
      );
      for (let i = 1; i < rows.length; i++) expect(rows[i][0], `${id}: row ${i} is below row ${i - 1}`).toBeGreaterThanOrEqual(rows[i - 1][1] - 0.5);
      expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.label-row > .label, .supporting-text, .error-text')].every((text) => text.scrollWidth <= text.clientWidth + 1 && text.scrollHeight <= text.clientHeight + 1)), `${id}: no text is clipped`).toBe(true);
    }
    // The gaps are still their tokens, and the horizontal row has wrapped.
    near((await box(part(page, 'checkboxes-error', '.supporting-text'))).y - ((await box(part(page, 'checkboxes-error', '.label-row'))).y + (await box(part(page, 'checkboxes-error', '.label-row'))).height), await token(page, 'supporting-text-gap'), 'supporting-text.gap');
    const row = await Promise.all((await members(page, 'checkboxes-horizontal').all()).map(box));
    expect(new Set(row.map((m) => Math.round(m.y))).size, 'the row wraps').toBeGreaterThan(1);
  });

  test('FGR-17: in forced colors the label, the asterisk, the description and the error text are drawn in the platform’s text color and the requirement tag has a visible edge; no color of the group’s own shows an error', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, [...spec.fixtures, fx('disabled-error', { label: 'Notify me by', disabled: true, error: true, errorText: 'Wrong.' })]);
    const system = (name: string) =>
      page.evaluate((keyword) => {
        const probe = document.createElement('div');
        probe.style.color = keyword;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    const [canvasText, grayText] = [await system('CanvasText'), await system('GrayText')];
    for (const f of [...spec.fixtures.map((fixture) => fixture.id), 'disabled-error']) {
      const disabled = f.includes('disabled') && !f.endsWith('one-disabled');
      for (const text of await part(page, f, '.label, .asterisk, .supporting-text, .error-text').all()) expect(await css(text, 'color'), f).toBe(disabled ? grayText : canvasText);
      for (const tag of await part(page, f, '.requirement-tag').all()) {
        expect(Number.parseFloat(await css(tag.locator('.container'), 'border-top-width')), `${f}: the tag has an edge`).toBeGreaterThan(0);
        expect(await css(tag.locator('.container'), 'border-top-style'), f).toBe('solid');
      }
    }
    expect(await css(part(page, 'checkboxes-error', '.error-text'), 'color')).toBe(await css(part(page, 'checkboxes-error', '.supporting-text'), 'color'));
    expect((await semantics(member(page, 'checkboxes-error', 0))).invalid).toBe(true);
  });

  test('FGR-18: in right-to-left the layout mirrors — the label row, the description, the controls and the error text start at the right edge, the requirement mark stands at the left of the label, and a horizontal row runs from right to left; a column keeps its order from top to bottom', async ({ page }) => {
    await mountSpec(page, 'checkboxes-rtl', 'checkboxes-horizontal-rtl');
    const id = 'checkboxes-rtl';
    const h = await box(host(page, id));
    const right = h.x + h.width;
    const [label, tag, description] = [await box(part(page, id, '.label')), await box(part(page, id, '.required-tag')), await box(part(page, id, '.supporting-text'))];
    near(label.x + label.width, right, 'the label starts at the right edge');
    near(label.x - (tag.x + tag.width), await token(page, 'requirement-gap'), 'the mark is at the left of the label');
    near(description.x + description.width, right, 'the description starts at the right edge');
    expect(await css(part(page, id, '.supporting-text'), 'text-align')).toBe('right');
    const column = await Promise.all((await members(page, id).all()).map(box));
    for (const [i, m] of column.entries()) {
      near(m.x + m.width, right, `control ${i} starts at the right edge`);
      if (i) expect(m.y, 'the column keeps its order').toBeGreaterThan(column[i - 1].y);
    }
    // A row runs from the right: the first control at the right.
    const row = await Promise.all((await members(page, 'checkboxes-horizontal-rtl').all()).map(box));
    const rowHost = await box(host(page, 'checkboxes-horizontal-rtl'));
    near(row[0].x + row[0].width, rowHost.x + rowHost.width, 'the first control is at the right');
    for (let i = 1; i < row.length; i++) near(row[i - 1].x - (row[i].x + row[i].width), await token(page, 'gap-inline'), 'gap-inline, leftwards');
    const error = await box(part(page, 'checkboxes-horizontal-rtl', '.error-text'));
    near(error.x + error.width, rowHost.x + rowHost.width, 'the error text starts at the right edge');
  });

  test('FGR-19: the direction is the nearest ancestor’s, not the root’s and not a setting of the group’s own; when it changes while the group is shown the group is drawn for the new direction at once, keeping its controls with their values, their selection and their focus', async ({ page }) => {
    await mount(page, [fx('a', { label: 'Notify me by', orientation: 'horizontal' }, [checkbox('Email', { checked: true }), checkbox('Text'), checkbox('Push')])]);
    expect(await host(page, 'a').evaluate((el) => Object.hasOwn(el.constructor.prototype, 'dir'))).toBe(false);
    const firstAt = async () => {
      const [h, first, last] = [await box(host(page, 'a')), await box(member(page, 'a', 0)), await box(member(page, 'a', 2))];
      return Math.abs(first.x - h.x) < 0.6 && last.x > first.x ? 'left' : Math.abs(first.x + first.width - (h.x + h.width)) < 0.6 && last.x < first.x ? 'right' : 'neither';
    };
    expect(await firstAt()).toBe('left');
    await member(page, 'a', 1).locator('input').focus();
    const before = await host(page, 'a').evaluateHandle((el) => [...el.children]);
    await stage(page, 'a').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await firstAt()).toBe('right');
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    expect(await members(page, 'a').evaluateAll((all, was) => all.every((el, i) => el === was[i]) && all.map((el) => (el as HTMLElement & { checked: boolean }).checked).join(), before)).toBe('true,false,false');
    expect(await activeInside(member(page, 'a', 1)), 'the focus stays').toBe(true);
    await stage(page, 'a').evaluate((el) => el.setAttribute('dir', 'ltr'));
    expect(await firstAt()).toBe('left');
  });

  test('FGR-20: a group with no control draws its rows and reports it; a field group inside a field group is one member — placed and spaced as a field, exposed as a group inside the group, passed disabled and nothing else, neither the error nor the requirement', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('none', { label: 'Empty', supportingText: 'Nothing to choose.' }, ''),
      fx('outer', { label: 'Contact', spacing: 'fields', required: true, error: true, errorText: 'Something is missing.' }, '<tanrei-text-field label="Name"></tanrei-text-field><tanrei-field-group label="Notify me by"><tanrei-checkbox label="Email"></tanrei-checkbox><tanrei-checkbox label="Push"></tanrei-checkbox></tanrei-field-group>'),
    ]);
    await expect(part(page, 'none', '.label')).toBeVisible();
    await expect(part(page, 'none', '.supporting-text')).toBeVisible();
    expect(seen.filter((w) => w.includes('FGR-20'))).toHaveLength(1);
    const inner = member(page, 'outer', 1);
    const outer = stage(page, 'outer').getByRole('group', { name: 'Contact', exact: true });
    await expect(outer).toHaveCount(1);
    await expect(stage(page, 'outer').getByRole('group', { name: 'Notify me by', exact: true })).toHaveCount(1);
    expect(await contained(page, 'outer', inner), 'a group inside the group').toBe(true);
    near((await box(inner)).y - ((await box(member(page, 'outer', 0))).y + (await box(member(page, 'outer', 0))).height), await token(page, 'gap-fields'), 'spaced as a field');
    near((await box(inner)).width, (await box(host(page, 'outer'))).width, 'placed as a field');
    // Neither the error nor the requirement.
    await expect(inner.locator('.group > .error-text')).toHaveCount(0);
    await expect(inner.locator('.group > .legend .requirement-tag')).toHaveCount(0);
    expect(await inner.evaluate((el) => el.shadowRoot!.querySelector('fieldset')!.getAttribute('aria-describedby'))).toBeNull();
    for (const control of await inner.locator('tanrei-checkbox').all()) expect(await semantics(control)).toMatchObject({ invalid: false, disabled: false });
    // Disabled passes through.
    await set(page, 'outer', { disabled: true });
    expect(await inner.evaluate((el) => el.shadowRoot!.querySelector('fieldset')!.getAttribute('aria-disabled'))).toBe('true');
    for (const control of await inner.locator('tanrei-checkbox').all()) expect((await semantics(control)).disabled).toBe(true);
    expect(await inner.evaluate((el: HTMLElement & { disabled: boolean }) => el.disabled), 'the inner group’s own property is not written').toBe(false);
    await set(page, 'outer', { disabled: false });
    for (const control of await inner.locator('tanrei-checkbox').all()) expect((await semantics(control)).disabled).toBe(false);
  });

  test('FGR-21: the label, the description, the error text and the tag’s text are each text of their own direction, isolated — a left-to-right text keeps its order in a right-to-left layout — and are still placed and aligned by the layout direction', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => f.id === 'ltr-label-rtl'), fx('error', { label: 'Wi-Fi 6E', required: true, error: true, errorText: 'Choose 1 band, at least.' }, THREE, { direction: 'rtl' })]);
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

  test('FGR-22: an unknown requiredMark, orientation or kind renders with its default (auto, vertical, group); a spacing the active design system does not have renders with the default value’s tokens; each is reported in debug builds', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('mark', { label: 'Notify me by', required: true, requiredMark: 'star' }),
      fx('orientation', { label: 'Notify me by', orientation: 'diagonal' }),
      fx('spacing', { label: 'Notify me by', spacing: 'sections' }),
      fx('kind', { label: 'Notify me by', kind: 'listbox', required: true }),
      fx('default', { label: 'Notify me by' }),
    ]);
    // An unknown kind is a group: no role of another kind, and the requirement in words (FGR-11).
    expect(await host(page, 'kind').evaluate((el) => el.shadowRoot!.querySelector('fieldset')!.getAttribute('role'))).toBeNull();
    expect(await group(page, 'kind')).toMatchObject({ role: 'fieldset', required: false, described: ['Required'] });
    await expect(stage(page, 'kind').getByRole('group', { name: 'Notify me by', exact: true })).toHaveCount(1);
    await expect(part(page, 'mark', '.required-tag')).toBeVisible();
    await expect(part(page, 'mark', '.asterisk')).toBeHidden();
    const ys = async (id: string) => Promise.all((await members(page, id).all()).map(async (m) => (await box(m)).y - (await box(host(page, id))).y));
    expect(await ys('orientation'), 'a column').toEqual(await ys('default'));
    expect(await ys('spacing'), 'the default spacing').toEqual(await ys('default'));
    const reports = seen.filter((w) => w.includes('FGR-22'));
    expect(reports.filter((w) => w.includes('requiredMark "star"'))).toHaveLength(1);
    expect(reports.filter((w) => w.includes('orientation "diagonal"'))).toHaveLength(1);
    expect(reports.filter((w) => w.includes('spacing "sections"'))).toHaveLength(1);
    expect(reports.filter((w) => w.includes('kind "listbox"'))).toHaveLength(1);
    // A spacing a design system adds is drawn from its token.
    await override(page, { [T('gap-sections')]: '40px' });
    await frames(page);
    const spaced = await ys('spacing');
    near(spaced[1] - spaced[0], (await box(member(page, 'spacing', 0))).height + 40, 'the layer’s own spacing');
    // `chip` is not a mark's name (the mark is the Tag's): an unknown name, it behaves as auto.
    await set(page, 'mark', { requiredMark: 'chip' });
    await expect(part(page, 'mark', '.required-tag')).toBeVisible();
    await expect(part(page, 'mark', '.asterisk')).toBeHidden();
    await expect.poll(() => seen.filter((w) => w.includes('FGR-22') && w.includes('requiredMark "chip"')).length).toBe(1);
  });

  test('FGR-23: the group leaves its controls what they are — it emits no event, holds no value and takes no part in a form; a control that is added is laid out at once and given the error condition and the disabled state the group holds, one that is removed gets back everything it was given, and focus stays on the control that has it', async ({ page }) => {
    await mount(page, [fx('a', { label: 'Notify me by', error: true, errorText: 'Choose one.' }, '<input id="native" type="checkbox" aria-label="Native" /><tanrei-checkbox name="by" value="email" label="Email" checked></tanrei-checkbox><tanrei-checkbox name="by" value="text" label="Text"></tanrei-checkbox>')]);
    expect(
      await host(page, 'a').evaluate((el) => {
        const form = document.createElement('form');
        el.before(form);
        form.append(el);
        const entries = [...new FormData(form).entries()].map(([name, value]) => `${name}=${String(value)}`);
        form.replaceWith(el);
        return entries;
      }),
    ).toEqual(['by=email']);
    const heard = await host(page, 'a').evaluateHandle((el) => {
      const events: string[] = [];
      for (const type of ['input', 'change']) el.addEventListener(type, (event) => events.push(`${type}:${(event.target as Element).localName}`));
      return events;
    });
    await member(page, 'a', 2).click();
    await set(page, 'a', { errorText: 'Choose two.', label: 'Reach me by', orientation: 'horizontal' });
    expect(await heard.jsonValue()).toEqual(['input:tanrei-checkbox', 'change:tanrei-checkbox']);
    await set(page, 'a', { orientation: 'vertical' });
    // A control that comes is laid out at once and given what the group holds; focus stays where it was.
    await member(page, 'a', 1).locator('input').focus();
    await host(page, 'a').evaluate(async (el) => {
      const next = document.createElement('tanrei-checkbox');
      next.id = 'added';
      next.setAttribute('label', 'Push');
      el.append(next);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const added = page.locator('#added');
    expect(await semantics(added)).toMatchObject({ invalid: true, description: 'Choose two.' });
    near((await box(added)).y - ((await box(member(page, 'a', 2))).y + (await box(member(page, 'a', 2))).height), await token(page, 'gap-controls'), 'laid out after the last control');
    expect(await activeInside(member(page, 'a', 1)), 'focus stays on the control that has it').toBe(true);
    await set(page, 'a', { disabled: true });
    expect((await semantics(added)).disabled).toBe(true);
    await set(page, 'a', { disabled: false });
    // Controls that leave get back everything.
    const gone = await host(page, 'a').evaluateHandle(async (el) => {
      const out = [el.querySelector('#added')!, el.querySelector('#native')!];
      for (const control of out) document.body.append(control);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return out;
    });
    expect(
      await gone.evaluate(([tanrei, native]) => {
        const input = tanrei.shadowRoot!.querySelector('input')!;
        return [input.getAttribute('aria-invalid'), input.getAttribute('aria-description'), native.getAttribute('aria-invalid'), native.getAttribute('aria-description'), native.getAttribute('aria-label')];
      }),
    ).toEqual([null, null, null, null, 'Native']);
    // Moving a control lays the group out again, without a motion: the controls have no transition of place.
    await host(page, 'a').evaluate(async (el) => {
      el.append(el.firstElementChild!);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    expect(await members(page, 'a').evaluateAll((all) => all.map((el) => el.getAttribute('label')))).toEqual(['Text', 'Email']);
    expect((await box(member(page, 'a', 1))).y).toBeGreaterThan((await box(member(page, 'a', 0))).y);
    expect(await css(part(page, 'a', '.controls'), 'transition-duration')).toBe('0s');
  });

  test('FGR-24: the group has no words of its own — requiredText and optionalText are the instance’s, else the product’s words, else nothing: without the required word the asterisk stands in the tag’s place and nothing says the requirement to assistive technology, whichever mark is drawn; without the optional word no tag is drawn and nothing joins the description; each is reported once, naming the prop', async ({ page }) => {
    const seen = warnings(page);
    const bare = (id: string, props: Fixture['props']): Fixture => ({ id, props: { label: 'Notify me by', ...props }, items: THREE });
    await mount(page, [
      bare('auto', { required: true, supportingText: 'Choose all that apply.' }),
      bare('tag', { required: true, requiredMark: 'tag' }),
      bare('asterisk', { required: true, requiredMark: 'asterisk' }),
      bare('none', { required: true, requiredMark: 'none' }),
      bare('optional', { required: false, optional: true }),
      bare('own', { required: true, requiredText: 'Needed' }),
      bare('own-optional', { required: false, optional: true, optionalText: 'If you like' }),
    ]);
    const drawn = async (id: string) => ({
      tag: (await part(page, id, '.requirement-tag').count()) > 0 && (await part(page, id, '.requirement-tag').isVisible()) ? await part(page, id, '.requirement-tag').getAttribute('label') : null,
      asterisk: (await part(page, id, '.asterisk').count()) > 0 && (await part(page, id, '.asterisk').isVisible()),
    });
    // No words set: the asterisk of FGR-6 in the tag's place.
    expect(await drawn('auto')).toEqual({ tag: null, asterisk: true });
    expect(await drawn('tag')).toEqual({ tag: null, asterisk: true });
    expect(await drawn('asterisk')).toEqual({ tag: null, asterisk: true });
    expect(await drawn('none')).toEqual({ tag: null, asterisk: false });
    expect(await css(part(page, 'tag', '.asterisk'), 'color')).toBe(await color(page, 'standard-required-asterisk-color'));
    // Nothing is said of the requirement, whichever mark is drawn: a group has no required state, and FGR-11 has no words.
    expect((await group(page, 'auto')).described).toEqual(['Choose all that apply.']);
    for (const id of ['tag', 'asterisk', 'none']) expect((await group(page, id)).described, id).toEqual([]);
    for (const id of ['auto', 'tag', 'asterisk', 'none']) expect((await group(page, id)).required, id).toBe(false);
    // No optional word: no tag, nothing in the description.
    expect(await drawn('optional')).toEqual({ tag: null, asterisk: false });
    expect((await group(page, 'optional')).described).toEqual([]);
    // An instance's own words, with no set of the product's.
    expect(await drawn('own')).toEqual({ tag: 'Needed', asterisk: false });
    expect((await group(page, 'own')).described).toEqual(['Needed']);
    expect((await group(page, 'own-optional')).described).toEqual(['If you like']);
    // Reported once per word and page, naming the prop.
    const reports = seen.filter((w) => w.includes('FGR-24'));
    expect(reports).toHaveLength(2);
    expect(reports.find((w) => w.includes('requiredText'))).toContain('required-text is empty');
    expect(reports.find((w) => w.includes('requiredText'))).toContain('nothing says the requirement to assistive technology');
    expect(reports.find((w) => w.includes('optionalText'))).toContain('optional-text is empty');
    expect(await missingWords(page)).toEqual(['optionalText', 'requiredText']);
    const said = await page.evaluate(() => [...document.querySelectorAll('tanrei-field-group')].map((el) => `${el.shadowRoot!.textContent} ${[...el.shadowRoot!.querySelectorAll('tanrei-tag')].map((tag) => tag.getAttribute('label')).join(' ')}`).join(' '));
    expect(said).not.toMatch(/Required|Optional/);
    // The product's words, set once: drawn and said by every group without the props, at once.
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional' });
    expect(await drawn('auto')).toEqual({ tag: 'Required', asterisk: false });
    expect(await drawn('tag')).toEqual({ tag: 'Required', asterisk: false });
    expect((await group(page, 'auto')).described).toEqual(['Choose all that apply.', 'Required']);
    // Said in words whichever mark is drawn (FGR-11).
    for (const id of ['asterisk', 'none']) expect((await group(page, id)).described, id).toEqual(['Required']);
    expect(await drawn('optional')).toEqual({ tag: 'Optional', asterisk: false });
    expect((await group(page, 'optional')).described).toEqual(['Optional']);
    expect(await missingWords(page)).toEqual([]);
    // An instance's own prop wins.
    expect(await drawn('own')).toEqual({ tag: 'Needed', asterisk: false });
    expect((await group(page, 'own')).described).toEqual(['Needed']);
    expect((await group(page, 'own-optional')).described).toEqual(['If you like']);
  });

  // ── FGR-25: the radio-group kind ──────────────────────────────────────────────────────────────────

  const radios = (name: string, checked = 1) =>
    ['standard:Standard', 'express:Express', 'pickup:Pick up'].map((entry, index) => `<tanrei-radio-button name="${name}" value="${entry.split(':')[0]}" label="${entry.split(':')[1]}"${index === checked ? ' checked' : ''}></tanrei-radio-button>`).join('');
  /** What the element that is the set says of itself: its element, its role, the texts that name and describe it, its states. */
  const said = (page: P, id: string) =>
    host(page, id).evaluate((el) => {
      const root = el.shadowRoot!;
      const set = root.querySelector('.group')!;
      const texts = (ids: string | null) =>
        (ids ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .map((ref) => {
            const read = (node: Node): string => (node.nodeType === Node.TEXT_NODE ? node.textContent! : node instanceof Element && node.getAttribute('aria-hidden') !== 'true' && node.localName !== 'tanrei-tag' ? [...node.childNodes].map(read).join('') : '');
            const found = root.getElementById(ref);
            return found ? read(found).replace(/\s+/g, ' ').trim() : `missing:${ref}`;
          });
      return {
        element: set.localName,
        role: set.getAttribute('role'),
        named: texts(set.getAttribute('aria-labelledby')),
        described: texts(set.getAttribute('aria-describedby')),
        required: set.getAttribute('aria-required'),
        invalid: set.getAttribute('aria-invalid'),
        orientation: set.getAttribute('aria-orientation'),
        disabled: set.getAttribute('aria-disabled'),
      };
    });
  const positions = (page: P, id: string) => members(page, id).evaluateAll((all) => all.map((el) => `${el.shadowRoot!.querySelector('input')!.getAttribute('aria-posinset')} of ${el.shadowRoot!.querySelector('input')!.getAttribute('aria-setsize')}`));

  test('FGR-25: with kind radio-group the field group is one radio group in the group’s place (FGR-10) — the same fieldset with the radio group’s role, named by label whether or not it is drawn, required while requirement is required, invalid while error is true, disabled while disabled, saying its orientation, and described as FGR-11 says without requiredText, because the required state carries it; the radio buttons say 1, 2 and 3 of 3 and are passed disabled and nothing else (FGR-8); kind set while it is shown changes what is exposed at once, both ways', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('plain', { label: 'Delivery', kind: 'radio-group' }, radios('plain')),
      fx('unseen', { label: 'Delivery', labelHidden: true, kind: 'radio-group', orientation: 'horizontal' }, radios('unseen')),
      fx('asked', { label: 'Delivery', kind: 'radio-group', required: true, supportingText: 'You can change this later.', error: true, errorText: 'Choose one.' }, radios('asked')),
      fx('optional', { label: 'Delivery', kind: 'radio-group', required: false, optional: true }, radios('optional')),
      fx('off', { label: 'Delivery', kind: 'radio-group', disabled: true }, radios('off')),
    ]);
    await frames(page);
    // One element, the fieldset the group is in its other kind, with the radio group's role and states as attributes.
    expect(await said(page, 'plain')).toEqual({ element: 'fieldset', role: 'radiogroup', named: ['Delivery'], described: [], required: null, invalid: null, orientation: 'vertical', disabled: null });
    // labelHidden: the legend is not drawn and still names the set.
    await expect(part(page, 'unseen', '.label')).toHaveCount(0);
    expect(await said(page, 'unseen')).toMatchObject({ role: 'radiogroup', named: ['Delivery'], orientation: 'horizontal' });
    // Required and invalid are states of the set; "Required" is not said in words, the error text and the description are.
    expect(await said(page, 'asked')).toEqual({ element: 'fieldset', role: 'radiogroup', named: ['Delivery'], described: ['You can change this later.', 'Choose one.'], required: 'true', invalid: 'true', orientation: 'vertical', disabled: null });
    expect(await host(page, 'asked').evaluate((el) => el.shadowRoot!.getElementById('requirement'))).toBeNull();
    await expect(part(page, 'asked', '.required-tag')).toBeVisible();
    // Optional has no state: it is said in words, as in a group.
    expect(await said(page, 'optional')).toMatchObject({ described: ['Optional'], required: null });
    expect(await said(page, 'off')).toMatchObject({ role: 'radiogroup', disabled: 'true' });
    // To a reader of the page: one radio group, named by the label alone — the tag is no part of the name — and no group.
    for (const id of ['plain', 'unseen', 'asked', 'optional', 'off']) {
      await expect(stage(page, id).getByRole('radiogroup', { name: 'Delivery', exact: true }), id).toHaveCount(1);
      await expect(stage(page, id).getByRole('radiogroup'), id).toHaveCount(1);
      await expect(stage(page, id).getByRole('group'), id).toHaveCount(0);
      await expect(stage(page, id).getByRole('radio'), id).toHaveCount(3);
      for (const control of await members(page, id).all()) expect(await contained(page, id, control)).toBe(true);
      expect(await positions(page, id), id).toEqual(['1 of 3', '2 of 3', '3 of 3']);
    }
    // FGR-8: a radio button has no error condition — it stays as it is drawn, and is told nothing but `disabled` (FGR-14).
    for (const radio of await members(page, 'asked').all()) expect(await semantics(radio)).toMatchObject({ invalid: false, required: false, description: null, disabled: false });
    for (const radio of await members(page, 'off').all()) expect(await semantics(radio)).toMatchObject({ disabled: true });
    expect(await members(page, 'off').evaluateAll((all) => all.map((el) => el.hasAttribute('disabled'))), 'a radio button’s own attribute is never written').toEqual([false, false, false]);
    // Nothing is reported: radio buttons of one name in a radio group are what the kind is for.
    expect(seen.filter((w) => w.includes('FGR-15') || w.includes('FGR-25') || w.includes('RAD-25'))).toEqual([]);
    // The kind changes while the group is shown: a group again — the requirement in words (FGR-11), no state — and back.
    await set(page, 'asked', { kind: 'group' });
    expect(await said(page, 'asked')).toEqual({ element: 'fieldset', role: null, named: [], described: ['You can change this later.', 'Choose one.', 'Required'], required: null, invalid: null, orientation: null, disabled: null });
    await expect(stage(page, 'asked').getByRole('group', { name: 'Delivery', exact: true })).toHaveCount(1);
    await expect(stage(page, 'asked').getByRole('radiogroup')).toHaveCount(0);
    expect(seen.filter((w) => w.includes('FGR-15'))).toHaveLength(1);
    await set(page, 'asked', { kind: 'radio-group', error: false, orientation: 'horizontal' });
    expect(await said(page, 'asked')).toMatchObject({ role: 'radiogroup', described: ['You can change this later.'], required: 'true', invalid: null, orientation: 'horizontal' });
    expect(await host(page, 'asked').getAttribute('kind'), 'kind is reflected').toBe('radio-group');
  });

  test('FGR-25: the radio-group kind changes nothing that the group does — it selects nothing, holds no value, moves no focus, handles no key and emits no event (FGR-12, FGR-15): exclusion, the arrow keys, the one tab stop and each position stay the radio buttons’ own, by their name (RAD-3, RAD-4, RAD-5, RAD-16, RAD-25); a press on the frame’s texts selects nothing; an error that appears under a radio button’s focus is announced once (FGR-9)', async ({ page, browserName }) => {
    await mount(page, [fx('set', { label: 'Delivery', kind: 'radio-group', supportingText: 'You can change this later.', required: true }, radios('delivery', -1))]);
    await page.evaluate(() => {
      const log: string[] = ((window as unknown as { heard: string[] }).heard = []);
      const el = document.querySelector('tanrei-field-group')!;
      for (const name of ['input', 'change', 'keydown']) el.addEventListener(name, (event) => log.push(`${event.type} ${(event.target as Element).localName}${event.defaultPrevented ? ' prevented' : ''}`));
    });
    const checked = () => members(page, 'set').evaluateAll((all) => all.map((el) => (el as HTMLElement & { checked: boolean }).checked));
    const stops = () => members(page, 'set').evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('input')!.tabIndex === 0));
    // It is no control: no value, no name, no place in a form.
    expect(await host(page, 'set').evaluate((el) => [(el.constructor as unknown as { formAssociated?: boolean }).formAssociated === true, 'value' in el, 'name' in el, el.tabIndex])).toEqual([false, false, false, -1]);
    // None selected: the first enabled radio button is the one stop.
    expect(await stops()).toEqual([true, false, false]);
    // A press on the label, the tag and the description selects nothing and moves no focus into the set.
    for (const selector of ['.label', '.required-tag', '.supporting-text']) await part(page, 'set', selector).click();
    expect(await checked()).toEqual([false, false, false]);
    expect(await activeInside(host(page, 'set'))).toBe(false);
    // Exclusion by name, with the radio buttons' own events passing the group untouched.
    await member(page, 'set', 1).click();
    await member(page, 'set', 0).click();
    expect(await checked()).toEqual([true, false, false]);
    expect(await page.evaluate(() => (window as unknown as { heard: string[] }).heard)).toEqual(['input tanrei-radio-button', 'change tanrei-radio-button', 'input tanrei-radio-button', 'change tanrei-radio-button']);
    // The arrow keys are the radio buttons' own (RAD-4): the group hears the key and handles none.
    await member(page, 'set', 0).evaluate((el) => el.focus());
    await page.keyboard.press('ArrowDown');
    expect(await checked()).toEqual([false, true, false]);
    expect(await stops()).toEqual([false, true, false]);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    expect(await checked(), 'wrapping from the first to the last').toEqual([false, false, true]);
    // FGR-9: the error that appears while a radio button has focus is announced once, politely; focus stays.
    await set(page, 'set', { error: true, errorText: 'Choose how the order reaches you.' });
    await expect.poll(() => announced(page, 'set')).toBe('Choose how the order reaches you.');
    expect(await activeInside(member(page, 'set', 2))).toBe(true);
    // The group stops no key and prevents none itself: what is prevented is the radio button's own doing.
    const keys = (await page.evaluate(() => (window as unknown as { heard: string[] }).heard)).filter((line) => line.startsWith('keydown'));
    expect(keys.length, browserName).toBe(3);
    expect(await host(page, 'set').evaluate((el) => (el as HTMLElement & { value?: unknown }).value)).toBeUndefined();
  });

  test('FGR-25: in the radio-group kind the group holds the radio buttons of one group and no other control — another control, radio buttons of more than one group and a spacing other than controls are each reported in debug builds, and the group still renders', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('other', { label: 'Delivery', kind: 'radio-group' }, `${radios('other')}<tanrei-checkbox label="Gift wrap"></tanrei-checkbox>`),
      fx('native', { label: 'Delivery', kind: 'radio-group' }, `${radios('native')}<span><button>More</button></span>`),
      fx('two', { label: 'Delivery', kind: 'radio-group' }, `${radios('first')}<tanrei-radio-button name="second" value="later" label="Later"></tanrei-radio-button>`),
      fx('fields', { label: 'Delivery', kind: 'radio-group', spacing: 'fields' }, radios('fields')),
      fx('wrapped', { label: 'Delivery', kind: 'radio-group' }, `<div>${radios('wrapped')}</div><p>A line of the product’s own between them.</p>`),
      fx('platform', { label: 'Delivery', kind: 'radio-group' }, '<label><input type="radio" name="platform" value="a" checked /> Standard</label><label><input type="radio" name="platform" value="b" /> Express</label>'),
    ]);
    await frames(page);
    const reports = seen.filter((w) => w.includes('FGR-25'));
    expect(reports.filter((w) => w.includes('a control that is not a radio button'))).toHaveLength(2);
    expect(reports.filter((w) => w.includes('radio buttons of more than one group'))).toHaveLength(1);
    expect(reports.filter((w) => w.includes('spacing "fields"'))).toHaveLength(1);
    expect(reports).toHaveLength(4);
    // Radio buttons inside the product's own elements, with text of the product's between them, and the platform's own
    // radio buttons of one name are a set like any other: nothing is reported, and each is one radio group.
    for (const id of ['other', 'native', 'two', 'fields', 'wrapped', 'platform']) await expect(stage(page, id).getByRole('radiogroup', { name: 'Delivery', exact: true }), id).toHaveCount(1);
    await expect(stage(page, 'platform').getByRole('radio')).toHaveCount(2);
    // A spacing other than controls is still drawn as it says: the kind changes nothing that is drawn.
    expect(await part(page, 'fields', '.controls').getAttribute('data-spacing')).toBe('fields');
    expect(seen.filter((w) => w.includes('FGR-15'))).toEqual([]);
  });

  test('FGR-24: in the radio-group kind the required state says the requirement without a word — with no requiredText from the instance or the product the asterisk stands in the tag’s place, the set is still exposed as required, and the missing word is reported once as a word that is not drawn, not as a requirement nobody says', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      { id: 'tag', props: { label: 'Delivery', kind: 'radio-group', required: true, requiredMark: 'tag' }, content: radios('tag') },
      { id: 'none', props: { label: 'Delivery', kind: 'radio-group', required: true, requiredMark: 'none' }, content: radios('none') },
    ]);
    await frames(page);
    await expect(part(page, 'tag', '.asterisk')).toBeVisible();
    await expect(part(page, 'tag', '.requirement-tag')).toBeHidden();
    for (const id of ['tag', 'none']) expect(await said(page, id), id).toMatchObject({ role: 'radiogroup', required: 'true', described: [] });
    const reports = seen.filter((w) => w.includes('FGR-24'));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toContain('the required state is kept');
    expect(await missingWords(page)).toEqual(['requiredText']);
    await setWords(page, { requiredText: 'Required' });
    await expect(part(page, 'tag', '.required-tag')).toBeVisible();
    expect((await said(page, 'tag')).described, 'never part of the description').toEqual([]);
  });

  for (const f of spec.fixtures.filter((fixture) => fixture.props.kind === 'radio-group')) {
    test(`FGR-25 the same picture: ${f.id} in its radio-group kind and the same fixture with kind group are the same pixels — the kind changes what is exposed and nothing that is drawn (FGR-1 to FGR-8, FGR-13)`, async ({ page }) => {
      // The same fixture a second time as a plain group; its radio buttons carry another name, so that the two sets
      // stay two groups of radio buttons.
      // (Its id still ends as the fixture's does: the stage reads the language of a fixture from it.)
      const plain: Fixture = { ...f, id: `as-a-group-${f.id}`, props: { ...f.props, kind: 'group' }, items: f.items!.map((item) => ({ ...item, props: { ...item.props, name: `${String(item.props.name)}-as-a-group` } })) };
      await mount(page, [f, plain]);
      await frames(page);
      expect((await said(page, f.id)).role).toBe('radiogroup');
      expect((await said(page, plain.id)).role).toBeNull();
      const [ours, theirs] = [stage(page, f.id), stage(page, plain.id)];
      // Each stage drawn in the same place — the other taken out of the flow for the picture.
      const alone = async (shown: Locator, other: Locator) => {
        await other.evaluate((el: HTMLElement) => (el.style.display = 'none'));
        const picture = decodePng(await shown.screenshot({ animations: 'disabled' }));
        await other.evaluate((el: HTMLElement) => el.style.removeProperty('display'));
        return picture;
      };
      const [a, b] = [await alone(ours, theirs), await alone(theirs, ours)];
      expect(a.width * a.height, 'the stage is drawn').toBeGreaterThan(0);
      expect({ width: a.width, height: a.height }, 'the two stages are one size').toEqual({ width: b.width, height: b.height });
      let different = 0;
      for (let index = 0; index < a.data.length; index++) if (a.data[index] !== b.data[index]) different++;
      expect(different, 'differing color channels').toBe(0);
    });
  }
});

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations in ${theme}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    });
  }

  test('no axe violations with native controls, a nested group, a field as a member, and a group that is disabled and in error', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(
        page,
        [
          fx('native', { label: 'Days', supportingText: 'Choose all that apply.', required: true, error: true, errorText: 'Choose a day.' }, '<label><input type="checkbox" /> Monday</label><label><input type="checkbox" /> Tuesday</label>'),
          fx('nested', { label: 'Contact', spacing: 'fields' }, '<tanrei-text-field label="Name"></tanrei-text-field><tanrei-field label="Volume" supporting-text="Help."><tanrei-slider></tanrei-slider></tanrei-field><tanrei-field-group label="Notify me by" optional><tanrei-checkbox label="Email"></tanrei-checkbox></tanrei-field-group>'),
          fx('disabled-error', { label: 'Notify me by', disabled: true, error: true, errorText: 'Choose one.', required: true, requiredMark: 'asterisk' }),
        ],
        { theme },
      );
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('Chromium’s accessibility tree computes the group’s name and description — the description, the error text, the requirement in words — and, for a checkbox the group put in error, its own name with the error text as its description', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    await mountSpec(page, 'checkboxes-error', 'checkboxes-label-hidden', 'switches-optional');
    const groups = await axNodes(page, 'group');
    expect(groups.map((node) => [node.name, node.description])).toEqual([
      ['Notify me by', 'Choose all that apply. Choose at least one way to reach you. Required'],
      ['Notify me by', 'Choose all that apply.'],
      ['Privacy', 'Optional'],
    ]);
    // The group contains its controls in the tree.
    expect(await axDescendants(page, 'group', 0, 'checkbox')).toBe(3);
    expect(await axDescendants(page, 'group', 2, 'switch')).toBe(2);
    // A group has neither a required nor an invalid state.
    expect(groups[0].invalid ?? 'false').toBe('false');
    expect(groups[0].required ?? false).toBe(false);
    const boxes = await axNodes(page, 'checkbox');
    expect(boxes.slice(0, 3)).toMatchObject([
      { name: 'Email', description: 'Choose at least one way to reach you.', invalid: 'true' },
      { name: 'Text message', description: 'Choose at least one way to reach you.', invalid: 'true' },
      { name: 'Push notification', description: 'Choose at least one way to reach you.', invalid: 'true' },
    ]);
    expect(boxes.slice(3).every((node) => node.description === '' && (node.invalid ?? 'false') === 'false')).toBe(true);
    expect((await axNodes(page, 'switch')).map((node) => [node.name, node.description])).toEqual([
      ['Share usage data', ''],
      ['Show my status', ''],
    ]);
    // The error set later reaches the tree at once.
    await set(page, 'checkboxes-label-hidden', { error: true, errorText: 'Choose at least one.' });
    expect((await axNodes(page, 'group'))[1]).toMatchObject({ name: 'Notify me by', description: 'Choose all that apply. Choose at least one.' });
    expect((await axNodes(page, 'checkbox'))[3]).toMatchObject({ name: 'Email', description: 'Choose at least one.', invalid: 'true' });
  });
});

test.describe('accessibility of the radio-group kind (FGR-25)', () => {
  const RADIOS = (name: string) => `<tanrei-radio-button name="${name}" value="standard" label="Standard"></tanrei-radio-button><tanrei-radio-button name="${name}" value="express" label="Express" checked></tanrei-radio-button><tanrei-radio-button name="${name}" value="pickup" label="Pick up" disabled></tanrei-radio-button>`;
  const SETS = [
    fx('asked', { label: 'Delivery', kind: 'radio-group', required: true, supportingText: 'You can change this later.', error: true, errorText: 'Choose one.' }, RADIOS('asked')),
    fx('unseen', { label: 'Delivery', kind: 'radio-group', labelHidden: true, orientation: 'horizontal', required: false, optional: true }, RADIOS('unseen')),
    fx('off', { label: 'Delivery', kind: 'radio-group', disabled: true, required: true, requiredMark: 'asterisk' }, RADIOS('off')),
  ];

  test('FGR-25: no axe violations in the radio-group kind — the role on the fieldset, its required and invalid states and its orientation are accepted — in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, SETS, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
      // The checks that speak of this construction ran, and passed: the role is one a fieldset may take, and every
      // ARIA attribute on it is one the role has.
      for (const rule of ['aria-allowed-role', 'aria-allowed-attr', 'aria-valid-attr-value', 'aria-roles']) expect(results.passes.map((pass) => pass.id), `${theme}: ${rule} was applied`).toContain(rule);
    }
  });

  test('FGR-25: Chromium’s accessibility tree has exactly one radio group for the set and no other group — never a radio group inside a group, nor a group inside a radio group — named by label with the label drawn and not drawn, with its description, its required and invalid states and its orientation, and its radios inside it, each with its name and its checked state', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    await mount(page, SETS);
    await frames(page);
    const tree = async (id: string) => ofRoles(await axTree(page, `[data-fixture="${id}"]`), ['radiogroup', 'group', 'radio']).map((line) => line.replace(/ focusable=\w+/, ''));
    expect(await tree('asked')).toEqual([
      'radiogroup "Delivery" (You can change this later. Choose one.) invalid=true orientation=vertical required=true',
      '  radio "Standard" checked=false invalid=false',
      '  radio "Express" checked=true invalid=false',
      '  radio "Pick up" checked=false disabled=true invalid=false',
    ]);
    expect(await tree('unseen')).toEqual([
      'radiogroup "Delivery" (Optional) invalid=false orientation=horizontal required=false',
      '  radio "Standard" checked=false invalid=false',
      '  radio "Express" checked=true invalid=false',
      '  radio "Pick up" checked=false disabled=true invalid=false',
    ]);
    expect((await tree('off'))[0]).toBe('radiogroup "Delivery" disabled=true invalid=false orientation=vertical required=true');
    expect((await tree('off')).filter((line) => line.includes('disabled=true'))).toHaveLength(4);
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the controls, the label, the mark, the description and the error the spec gives it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    // Twenty-two, and the five that are the twins of a checkbox group's fixtures: a refused answer with a
    // checked box, and four with a parent checkbox written by hand.
    // And the twenty that are the twins of the radio group's fixtures: the same frame in its radio-group kind, around
    // radio buttons of one name (radio-buttons-error-one-disabled among them).
    expect(spec.fixtures).toHaveLength(47);
    expect(spec.fixtures.filter((f) => f.props.kind === 'radio-group').map((f) => f.id)).toEqual(loadSpec('radio-group').fixtures.map((f) => `radio-buttons-${f.id}`));
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      near((await box(host(page, f.id))).width, 320, f.id);
      await expect(members(page, f.id), f.id).toHaveCount(f.items!.length);
      expect(await members(page, f.id).evaluateAll((all) => all.map((el) => el.localName)), f.id).toEqual(f.items!.map((item) => `tanrei-${item.kind}`));
      for (const control of await members(page, f.id).all()) await expect(control, f.id).toBeVisible();
      const labelled = !!f.props.label && !f.props.labelHidden;
      expect(await part(page, f.id, '.label').count(), `${f.id} label`).toBe(labelled ? 1 : 0);
      if (labelled) await expect(part(page, f.id, '.label'), f.id).toContainText(String(f.props.label));
      expect((await group(page, f.id)).name, f.id).toBe(String(f.props.label));
      const requirement = f.props.required ? 'required' : f.props.optional ? 'optional' : 'none';
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
