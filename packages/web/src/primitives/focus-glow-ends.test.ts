// Under focus-style glow a filled input box's halo follows each corner of the box: rounded with the top corners
// (container.shape), and by container.shape-bottom at the bottom two — square in the default system — and never rounded
// at all four (`focusGlowEnds()`, src/primitives/focus-ring.ts).
import { expect, test } from '@playwright/test';
import { acmeSystemCss, loadSpec, mountFixtures, resolveToken } from '../../test/harness.js';

/** Each input box that has a filled look: the sentence its glow is, and a filled fixture of its spec. */
const BOXES: Record<string, { sentence: string; fixture: string }> = {
  'text-input': { sentence: 'TXI-7', fixture: 'filled-empty' },
  'number-input': { sentence: 'NMI-15', fixture: 'filled-empty' },
  select: { sentence: 'SEL-21', fixture: 'filled-empty' },
  combobox: { sentence: 'CMB-15', fixture: 'filled-empty' },
  'color-input': { sentence: 'CLI-23', fixture: 'filled-empty' },
};

for (const [name, { sentence, fixture }] of Object.entries(BOXES)) {
  test(`${sentence}: where the focus style is glow, a filled ${name}’s halo follows each corner of its container — the top two by container.shape, the bottom two by container.shape-bottom — and an outlined one’s all four`, async ({ page }) => {
    const spec = loadSpec(name);
    const outlined = fixture.replace('filled', 'outlined');
    await mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss(), fixtures: spec.fixtures.filter((f) => [fixture, outlined].includes(f.id)) });
    const offset = await resolveToken(page, '--tanrei-sys-focus-offset');
    const corners = async (id: string) => {
      const container = page.locator(`[data-fixture="${id}"] ${spec.platforms.web.name}`).first().locator('.field > .container, .field .container').first();
      // Focus given by the page: a press would open a select's list.
      await page.locator(`[data-fixture="${id}"] ${spec.platforms.web.name}`).first().evaluate((el) => (el as HTMLElement).focus());
      await expect.poll(() => container.evaluate((el) => getComputedStyle(el, '::after').content)).not.toBe('none');
      return container.evaluate((el) => {
        const radii = (style: CSSStyleDeclaration) => [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].map((value) => Number.parseFloat(value));
        return { box: radii(getComputedStyle(el)), halo: radii(getComputedStyle(el, '::after')) };
      });
    };
    const filled = await corners(fixture);
    expect(filled.box[0], 'the fixture’s top corners are rounded and its bottom ones are not').toBeGreaterThan(filled.box[3]);
    for (let corner = 0; corner < 4; corner++) expect(filled.halo[corner], `filled, corner ${corner}`).toBeCloseTo(filled.box[corner] + offset, 1);
    const all = await corners(outlined);
    for (let corner = 0; corner < 4; corner++) expect(all.halo[corner], `outlined, corner ${corner}`).toBeCloseTo(all.box[corner] + offset, 1);
  });
}
