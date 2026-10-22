// The message of a required control left empty (src/primitives/missing-value.ts): the browser's own
// words, in the browser's language — and, where a browser has none, the element's own: its errorText, else its
// requiredText (the instance's or the product's), else its label. Tanrei has no message of its own in any language.
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, type Spec, loadSpec, mountFixtures, setWords } from '../../test/harness.js';

type P = Page;
/**
 * `framed`: a composed field, whose control is given its Field's required word and its name through the Field's
 * connection and never the Field's error text (a select and a combobox do not draw the frame) — so where the browser has no message, an errorText is not what the form is told.
 */
const SUBJECTS: { spec: Spec; label: string; items?: Fixture['items']; framed?: true }[] = [
  { spec: loadSpec('select-field'), label: 'Country', items: [{ kind: 'option', props: { label: 'Japan', value: 'jp' } }], framed: true },
  { spec: loadSpec('combobox-field'), label: 'City', items: [{ kind: 'option', props: { label: 'Tokyo', value: 'tokyo' } }], framed: true },
  { spec: loadSpec('number-field'), label: 'Quantity', framed: true },
  { spec: loadSpec('radio-group'), label: 'Delivery', items: [{ kind: 'radio-button', props: { label: 'Standard', value: 'standard' } }] },
];
/** The message the form would show for the fixture's element, and whether a value is missing. */
const validity = (page: P, spec: Spec, id: string) =>
  page.locator(`[data-fixture="${id}"] ${spec.platforms.web.name}`).evaluate(async (el) => {
    const element = el as HTMLElement & { updateComplete: Promise<unknown>; validity: ValidityState; validationMessage: string };
    await element.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return [element.validity.valueMissing, element.validationMessage];
  });
/** A browser that has no message for a missing value: every native control answers with the empty string. */
async function withoutBrowserWords(page: P) {
  await page.addInitScript(() => {
    for (const native of [HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement]) Object.defineProperty(native.prototype, 'validationMessage', { get: () => '', configurable: true });
  });
  await page.goto('about:blank');
}

for (const { spec, label, items, framed } of SUBJECTS) {
  const fixture = (id: string, props: Fixture['props']): Fixture => ({ id, props: { label, required: true, ...props }, ...(items ? { items } : {}) });

  test(`${spec.name}: a required value that is missing is told to the form in the browser’s own words, in the browser’s language — not in words of Tanrei’s`, async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('plain', { requiredText: 'Needed' })] });
    const native = await page.evaluate((kind) => {
      const probe = kind === 'select' || kind === 'select-field' ? document.createElement('select') : document.createElement('input');
      if (kind === 'radio-group') Object.assign(probe, { type: 'radio', name: 'probe' });
      probe.required = true;
      return probe.validationMessage;
    }, spec.name);
    expect(native).not.toBe('');
    expect(await validity(page, spec, 'plain')).toEqual([true, native]);
  });

  test(`${spec.name}: where the browser has no message, the validity message is the element’s errorText, else its requiredText — the instance’s or the product’s — else its label, and never an English sentence`, async ({ page }) => {
    await withoutBrowserWords(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('error', { errorText: 'Choose one to go on.', requiredText: 'Needed' }), fixture('required', { requiredText: 'Needed' }), fixture('label', {}), fixture('nothing', { label: '' })],
    });
    expect(await validity(page, spec, 'error')).toEqual([true, framed ? 'Needed' : 'Choose one to go on.']);
    expect(await validity(page, spec, 'required')).toEqual([true, 'Needed']);
    expect(await validity(page, spec, 'label')).toEqual([true, label]);
    // Nothing at all: the flag still stands (a message is required with it), on the required mark and no word.
    expect(await validity(page, spec, 'nothing')).toEqual([true, '*']);
    // The product's words are read where the instance gives none.
    await setWords(page, { requiredText: 'Required' });
    await expect.poll(() => validity(page, spec, 'label')).toEqual([true, 'Required']);
    expect(await validity(page, spec, 'required')).toEqual([true, 'Needed']);
    for (const id of ['error', 'required', 'label', 'nothing']) expect((await validity(page, spec, id))[1], id).not.toMatch(/Please/);
  });
}
