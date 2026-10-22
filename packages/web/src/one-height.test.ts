// One height per size name. An input and a Button set side by side in one row stand as tall as each other at one size
// name: a stacked input box — the box that draws no label inside it, the only look the default system ships — is
// comp.input-box.stacked.container.height tall, which the default system aliases to comp.button.container.height
// (TXI-16, SEL-1, CMB-1, NMI-1, CLI-1). A filled or an outlined box keeps the taller comp.input-box.container.height,
// which holds the label floated inside it. A preset keeps its own fields.
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveToken } from '../test/harness.js';

const SIZES = ['small', 'medium', 'large'] as const;
const BOXES = ['text-input', 'select', 'combobox', 'number-input', 'color-input'] as const;
/** What each box shows, so that its one line holds text: a value, or a placeholder. */
const PROPS: Record<(typeof BOXES)[number], Record<string, unknown>> = {
  'text-input': { label: 'Code', value: 'TANREI' },
  select: { label: 'Country', placeholder: 'Choose' },
  combobox: { label: 'City', value: 'Kyoto' },
  'number-input': { label: 'Quantity', value: 2 },
  'color-input': { label: 'Accent', value: '#336699' },
};

/** The Buttons of the three sizes, in one row of their own, before the boxes' stages. */
const BUTTONS = `<div style="display: flex; gap: 8px; align-items: start">${SIZES.map((size) => `<tanrei-button data-button="${size}" size="${size}" label="Apply">Apply</tanrei-button>`).join('')}</div>`;

const heightOf = (page: Page, selector: string) => page.locator(selector).evaluate((el) => el.getBoundingClientRect().height);
const container = (page: Page, id: string, tag: string) => heightOf(page, `[data-fixture="${id}"] ${tag} >> .container`);
const button = (page: Page, size: string) => heightOf(page, `[data-button="${size}"] >> button`);

for (const name of BOXES) {
  const spec = loadSpec(name);
  const tag = spec.platforms.web.name;
  const fixtures: Fixture[] = SIZES.flatMap((size) =>
    (['stacked', 'filled', 'outlined'] as const).map((variant) => ({ id: `${variant}-${size}`, props: { ...PROPS[name], variant, size } }) as Fixture),
  );

  test(`one height per size name (${name}): a stacked box is as tall as a Button of the same size; filled and outlined keep the box's own height`, async ({ page }) => {
    await mountFixtures(page, spec, { fixtures, lead: BUTTONS });
    for (const size of SIZES) {
      const [stacked, buttonHeight, own] = [await container(page, `stacked-${size}`, tag), await button(page, size), await resolveToken(page, `--tanrei-comp-input-box-container-height-${size}`)];
      expect(stacked, `${name} stacked ${size}`).toBeCloseTo(buttonHeight, 1);
      expect(stacked, `${name} stacked ${size}: its token`).toBeCloseTo(await resolveToken(page, `--tanrei-comp-input-box-stacked-container-height-${size}`), 1);
      // The floating-label looks hold a label above the value's line, and keep their height (at least it: a filled box
      // that draws its label may grow to hold it).
      for (const variant of ['filled', 'outlined']) expect(await container(page, `${variant}-${size}`, tag), `${name} ${variant} ${size}`).toBeGreaterThanOrEqual(own - 0.01);
    }
    expect(await Promise.all(SIZES.map((size) => button(page, size))), 'the premise: the default system\'s Buttons').toEqual([32, 40, 56]);
  });
}

test('one height per size name: a preset keeps its stacked field as tall as it was (cupertino, m3-like)', async ({ page }) => {
  const spec = loadSpec('text-input');
  for (const [system, heights] of [['cupertino', [34, 34, 44]], ['m3-like', [40, 56, 56]]] as const) {
    await mountFixtures(page, spec, { system, fixtures: SIZES.map((size) => ({ id: `stacked-${size}`, props: { ...PROPS['text-input'], variant: 'stacked', size } }) as Fixture) });
    expect(await Promise.all(SIZES.map((size) => container(page, `stacked-${size}`, spec.platforms.web.name))), system).toEqual(heights);
  }
});
