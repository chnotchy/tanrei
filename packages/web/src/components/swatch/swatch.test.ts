// <tanrei-swatch>, driven by specs/swatch.spec.json: every behaviour id (SWC-1…19) is cited by a test title, every
// fixture has a baseline, and every length and color is read back from the tokens — never from a number written here.
// SWC-20: the product's ARIA on the host is tested with every other host's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtureAsInAll, mountFixtures, resolveColor, resolveToken, rootTokens, tab } from '../../../test/harness.js';
import { decodePng, paintedColor } from '../../../test/png.js';

const spec = loadSpec('swatch');
type P = Page;
const TAG = 'tanrei-swatch';
const SIZES = ['small', 'medium', 'large'] as const;
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const swatch = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`).first();
const sample = (host: Locator) => host.locator('.sample');
const label = (host: Locator) => host.locator('.label');
const supporting = (host: Locator) => host.locator('.supporting');
const T = (name: string) => `--tanrei-comp-swatch-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
const fx = (id: string, props: Fixture['props'], extra: Partial<Fixture> = {}): Fixture => ({ id, props, ...extra });
const mount = (page: P, fixtures: Fixture[] = spec.fixtures, options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { fixtures, ...options });
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
const settled = async (page: P) => {
  await page.evaluate(() => Promise.all([...document.querySelectorAll('tanrei-swatch')].map((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete)));
  await frames(page, 2);
};
/** Markup of the test's own, each piece in a stage of its own, on a page that has the tokens, the faces and the element. */
async function mountHtml(page: P, stages: Record<string, string>) {
  await mount(page, []);
  await page.evaluate((entries) => {
    document.querySelector('main')!.innerHTML = entries.map(([id, markup]) => `<div class="stage" data-fixture="${id}">${markup}</div>`).join('');
  }, Object.entries(stages));
  await settled(page);
}
/** The pixels of a locator, addressed in CSS pixels from its top-left corner. */
async function pixels(locator: Locator) {
  const shot = decodePng(await locator.screenshot({ animations: 'disabled' }));
  const b = await box(locator);
  const scale = shot.width / b.width;
  return { at: (x: number, y: number) => channels(shot.at(Math.min(shot.width - 1, Math.round(x * scale)), Math.min(shot.height - 1, Math.round(y * scale)))), bytes: shot.data };
}
const channels = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
const close = (actual: number[], expected: number[], message: string, tolerance = 3) => {
  for (let i = 0; i < 3; i++) expect(Math.abs(actual[i] - expected[i]), `${message}: [${actual.slice(0, 3)}] ≈ [${expected}]`).toBeLessThanOrEqual(tolerance);
};
const hex = (value: string) => [1, 3, 5].map((i) => Number.parseInt(value.slice(i, i + 2), 16));

test.describe('behavior', () => {
  test('SWC-1: the sample is a square of the size’s side with the shape’s corners, never more than half the side, one box the layout neither stretches nor shrinks, inline, with no elevation', async ({ page }) => {
    await mount(page);
    for (const [id, size] of [['default', 'medium'], ['small', 'small'], ['large', 'large'], ['dot', 'small']] as const) {
      const side = await token(page, `container-size-${size}`);
      const b = await box(sample(swatch(page, id)));
      expect([b.width, b.height], id).toEqual([side, side]);
    }
    expect(await css(sample(swatch(page, 'default')), 'border-top-left-radius')).toBe(`${await token(page, 'container-shape-square')}px`);
    // A circle: the full step, round whatever the smoothing.
    const side = await token(page, 'container-size-medium');
    expect(Number.parseFloat(await css(sample(swatch(page, 'circle')), 'border-top-left-radius'))).toBeGreaterThanOrEqual(side / 2);
    expect((await css(sample(swatch(page, 'circle')), '--tanrei-corner-pill')).trim()).toBe('1');
    // Inline with the text around it.
    expect(await css(swatch(page, 'default'), 'display')).toBe('inline-flex');
    // Neither stretched in a row that stretches nor shrunk in a stage too narrow for it.
    await page.evaluate(() => {
      const s = document.querySelector('[data-fixture="default"]') as HTMLElement;
      s.style.cssText += ';display:flex;align-items:stretch;inline-size:60px;block-size:120px';
    });
    const squeezed = await box(sample(swatch(page, 'default')));
    expect([squeezed.width, squeezed.height]).toEqual([side, side]);
    // No elevation: the one shadow is the inset edge (SWC-4).
    expect(await css(sample(swatch(page, 'default')), 'box-shadow')).toMatch(/inset$/);
    expect((await css(sample(swatch(page, 'default')), 'box-shadow')).split('inset').length).toBe(2);
  });

  test('SWC-2: the sample is filled with exactly the color, its alpha included, with nothing mixed in, in every scheme', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, spec.fixtures, { theme });
      const side = await token(page, 'container-size-medium');
      for (const [id, color] of [['default', '#0f766e'], ['label-only', '#7c3aed'], ['near-surface', '#ffffff']] as const) {
        const p = await pixels(sample(swatch(page, id)));
        close(p.at(side / 2, side / 2), hex(color), `${theme} ${id}`, 1);
      }
      // The opacity of the sample is its own: none.
      expect(await css(sample(swatch(page, 'default')), 'opacity'), theme).toBe('1');
      expect(await css(sample(swatch(page, 'default')), 'filter'), theme).toBe('none');
    }
  });

  test('SWC-3: under the color a checkerboard of checkerboard.size squares in its two colors, the top-left square in checkerboard.color in every direction: a translucent color shows it, an opaque one covers it', async ({ page }) => {
    await mount(page, [...spec.fixtures, fx('translucent-rtl', spec.fixtures.find((f) => f.id === 'translucent')!.props, { direction: 'rtl' })]);
    const cell = await token(page, 'checkerboard-size');
    const [a, b] = [channels(await resolveColor(page, T('checkerboard-color'))), channels(await resolveColor(page, T('checkerboard-alternate-color')))];
    const teal = hex('#0f766e');
    const over = (ground: number[]) => teal.map((c, i) => (c * 0x80) / 255 + (ground[i] * (255 - 0x80)) / 255);
    // Squares away from the edge and the corners: column 0 and column 1 of the third row.
    const [first, second] = [[cell / 2, cell * 2.5], [cell * 1.5, cell * 2.5]] as const;
    for (const id of ['translucent', 'translucent-rtl']) {
      const p = await pixels(sample(swatch(page, id)));
      close(p.at(...first), over(a), `${id}: a checkerboard.color square`);
      close(p.at(...second), over(b), `${id}: a checkerboard.alternate-color square`);
    }
    const opaque = await pixels(sample(swatch(page, 'default')));
    close(opaque.at(...first), teal, 'opaque over checkerboard.color', 1);
    close(opaque.at(...second), teal, 'opaque over checkerboard.alternate-color', 1);
    // The square follows its token.
    await override(page, { [T('checkerboard-size')]: '8px' });
    const larger = await pixels(sample(swatch(page, 'translucent')));
    close(larger.at(4 + 2, 8 * 2 + 4), over(a), 'an 8px square: still checkerboard.color at column 0');
    close(larger.at(cell * 1.5, 8 * 2 + 4), over(a), 'an 8px square: column 1 of the 4px grid is inside the first 8px square');
  });

  test('SWC-4: the sample is edged inside its size by outline.width of outline.color, over the fill and following its shape, whatever the color', async ({ page }) => {
    await mount(page);
    const [width, color] = [await token(page, 'outline-width'), await resolveColor(page, T('outline-color'))];
    for (const id of ['default', 'near-surface', 'empty', 'circle', 'translucent']) {
      expect(await css(sample(swatch(page, id)), 'box-shadow'), id).toBe(`${color} 0px 0px 0px ${width}px inset`);
    }
    // Inside its size: the edge does not grow the box.
    const side = await token(page, 'container-size-medium');
    await override(page, { [T('outline-width')]: '4px' });
    const b = await box(sample(swatch(page, 'default')));
    expect([b.width, b.height]).toEqual([side, side]);
    // Over the fill: a white sample on the white surface shows its edge, drawn in the edge's color.
    await override(page, { [T('outline-width')]: '' });
    const p = await pixels(sample(swatch(page, 'near-surface')));
    close(p.at(0, side / 2), channels(await paintedColor(page, `var(${T('outline-color')})`, '#ffffff')), 'the edge at the start of a white sample', 3);
  });

  test('SWC-5: an empty color draws no fill and no checkerboard — the surface shows through — and the edge alone; its label is drawn and read', async ({ page }) => {
    await mount(page);
    const empty = swatch(page, 'empty');
    expect(await css(sample(empty), 'background-image')).toBe('none');
    const side = await token(page, 'container-size-medium');
    const p = await pixels(sample(empty));
    close(p.at(side / 2, side / 2), channels(await resolveColor(page, '--tanrei-sys-color-surface')), 'the surface through the sample', 1);
    await expect(label(empty)).toHaveText('No color');
    expect(await stage(page, 'empty').ariaSnapshot()).toContain('No color');
  });

  test('SWC-6: color is read as three, four, six or eight hexadecimal digits in either case, white space left out, the last digit or pair the alpha; the web also takes any CSS color, a custom property included; a value that is no color is drawn as empty and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('three', { color: '#fff', label: 'a' }),
      fx('four', { color: '#0F78', label: 'a' }),
      fx('six', { color: '  #0F766E ', label: 'a' }),
      fx('eight', { color: '#0f766e80', label: 'a' }),
      fx('named', { color: 'rebeccapurple', label: 'a' }),
      fx('function', { color: 'rgb(12 34 56 / 0.5)', label: 'a' }),
      fx('role', { color: 'var(--tanrei-sys-color-primary)', label: 'a' }),
      fx('five', { color: '#12345', label: 'a' }),
      fx('word', { color: 'not a color', label: 'a' }),
    ]);
    const fill = (id: string) => css(sample(swatch(page, id)), 'background-image');
    expect(await fill('three')).toContain('rgb(255, 255, 255)');
    expect(await fill('four')).toContain('rgba(0, 255, 119, 0.533');
    expect(await fill('six')).toContain('rgb(15, 118, 110)');
    expect(await fill('eight')).toContain('rgba(15, 118, 110, 0.5');
    expect(await fill('named')).toContain('rgb(102, 51, 153)');
    expect(await fill('function')).toContain('rgba(12, 34, 56, 0.5)');
    // A role's value, resolved where the swatch stands.
    expect(await fill('role')).toContain(await resolveColor(page, '--tanrei-sys-color-primary'));
    for (const id of ['five', 'word']) expect(await fill(id), id).toBe('none');
    await expect.poll(() => seen.filter((w) => w.includes('SWC-6')).length).toBe(2);
    expect(seen.filter((w) => w.includes('SWC-6')).join('\n')).toContain('color "#12345" reads as no color');
  });

  test('SWC-7: beside the sample, gap after it, a column of the label and under it the supporting text, each in its size’s role and color; the two are centred on each other, the swatch is no wider than its content, text wraps and the sample stays whole', async ({ page }) => {
    await mount(page);
    for (const [id, size] of [['default', 'medium'], ['small', 'small'], ['large', 'large']] as const) {
      const host = swatch(page, id);
      const [s, l, d, h] = [await box(sample(host)), await box(label(host)), await box(supporting(host)), await box(host)];
      near(l.x - (s.x + s.width), await token(page, `gap-${size}`), `${id} gap`);
      near(d.x, l.x, `${id}: the two texts start together`);
      expect(d.y, `${id}: the supporting text is under the label`).toBeGreaterThanOrEqual(l.y + l.height - 0.5);
      near(s.y + s.height / 2, (l.y + d.y + d.height) / 2, `${id}: centred`, 1);
      near(h.width, s.width + (await token(page, `gap-${size}`)) + Math.max(l.width, d.width), `${id}: as wide as its content`, 1);
      expect(Number.parseFloat(await css(label(host), 'font-size')), id).toBe(await token(page, `label-typescale-${size}-font-size`));
      expect(Number.parseFloat(await css(supporting(host), 'font-size')), id).toBe(await token(page, `supporting-text-typescale-${size}-font-size`));
      expect(await css(label(host), 'color'), id).toBe(await resolveColor(page, T('label-color')));
      expect(await css(supporting(host), 'color'), id).toBe(await resolveColor(page, T('supporting-text-color')));
    }
    // Only what is not empty is drawn.
    await expect(label(swatch(page, 'label-only'))).toHaveText('Violet');
    await expect(supporting(swatch(page, 'label-only'))).toHaveCount(0);
    // A text taller than the sample: the sample is centred on it.
    // Each text in its own direction, isolated.
    for (const part of [label, supporting]) expect(await css(part(swatch(page, 'default')), 'unicode-bidi')).toBe('plaintext');
    // Narrower than its line: the text wraps at word boundaries, the sample stays whole, nothing overflows.
    await mountHtml(page, { narrow: '<div style="inline-size:120px"><tanrei-swatch color="#0f766e" label="A rather long name for a color" supporting-text="#0f766e"></tanrei-swatch></div>' });
    const host = swatch(page, 'narrow');
    const [s, l, h] = [await box(sample(host)), await box(label(host)), await box(host)];
    expect(s.width).toBe(await token(page, 'container-size-medium'));
    expect(l.height).toBeGreaterThan(2 * Number.parseFloat(await css(label(host), 'font-size')));
    expect(h.width).toBeLessThanOrEqual(120);
    expect(l.x + l.width).toBeLessThanOrEqual(h.x + h.width + 0.5);
    near(s.y + s.height / 2, h.y + h.height / 2, 'the sample centred on the wrapped text', 1);
  });

  test('SWC-8: with the label hidden, or decorative, the sample is drawn alone and the swatch is exactly as large as it', async ({ page }) => {
    await mount(page);
    for (const [id, size] of [['label-hidden', 'medium'], ['dot', 'small'], ['decorative', 'medium']] as const) {
      const side = await token(page, `container-size-${size}`);
      const h = await box(swatch(page, id));
      expect([h.width, h.height], id).toEqual([side, side]);
      await expect(swatch(page, id).locator('.text'), id).toHaveCount(0);
    }
  });

  test('SWC-9: with its text drawn, the sample is hidden and the label and then the supporting text are read as text, with no role of the swatch’s own', async ({ page }) => {
    await mount(page);
    for (const id of ['default', 'small', 'translucent', 'rtl']) {
      const host = swatch(page, id);
      await expect(sample(host), id).toHaveAttribute('aria-hidden', 'true');
      expect(await host.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-hidden')]), id).toEqual([null, null, null]);
      const tree = await stage(page, id).ariaSnapshot();
      const f = spec.fixtures.find((x) => x.id === id)!;
      expect(tree, id).not.toContain('img');
      expect(tree.indexOf(String(f.props.label)), id).toBeGreaterThanOrEqual(0);
      expect(tree.indexOf(String(f.props.supportingText)), id).toBeGreaterThan(tree.indexOf(String(f.props.label)));
    }
  });

  test('SWC-10: with the label hidden the swatch is one image named by label — by supportingText where label is empty — and described by supportingText', async ({ page }) => {
    await mount(page, [...spec.fixtures, fx('value-only', { color: '#0f766e', supportingText: '#0f766e', labelHidden: true })]);
    const named = stage(page, 'label-hidden').getByRole('img');
    await expect(named).toHaveCount(1);
    await expect(named).toHaveAccessibleName('Teal 700');
    await expect(named).toHaveAccessibleDescription('#0f766e');
    await expect(stage(page, 'dot').getByRole('img', { name: 'Bug', exact: true })).toHaveCount(1);
    const value = stage(page, 'value-only').getByRole('img');
    await expect(value).toHaveAccessibleName('#0f766e');
    await expect(value).toHaveAccessibleDescription('');
    // Nothing else: the tree is the one image.
    expect((await stage(page, 'label-hidden').ariaSnapshot()).trim().split('\n')).toHaveLength(1);
  });

  test('SWC-11: a decorative swatch exposes nothing and neither draws nor reads its label and supporting text', async ({ page }) => {
    await mount(page, [...spec.fixtures, fx('decorative-hidden', { color: '#0f766e', label: 'Teal 700', supportingText: '#0f766e', decorative: true, labelHidden: true })]);
    for (const id of ['decorative', 'decorative-hidden']) {
      await expect(swatch(page, id), id).toHaveAttribute('aria-hidden', 'true');
      expect(await swatch(page, id).getAttribute('role'), id).toBeNull();
      expect((await stage(page, id).ariaSnapshot()).trim(), id).toBe('');
      await expect(swatch(page, id).locator('.label, .supporting'), id).toHaveCount(0);
    }
  });

  test('SWC-12: with neither a label nor supporting text the swatch draws the sample alone, exposes nothing, and is reported in debug builds', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('nameless', { color: '#0f766e' }), fx('nameless-hidden', { color: '#0f766e', labelHidden: true }), fx('blank', { color: '#0f766e', label: '   ' })]);
    const side = await token(page, 'container-size-medium');
    for (const id of ['nameless', 'nameless-hidden', 'blank']) {
      await expect(swatch(page, id), id).toHaveAttribute('aria-hidden', 'true');
      const h = await box(swatch(page, id));
      expect([h.width, h.height], id).toEqual([side, side]);
    }
    await expect.poll(() => seen.filter((w) => w.includes('SWC-12')).length).toBe(3);
    // Decorative on purpose is not reported.
    await mount(page, [fx('decorative', { color: '#0f766e', decorative: true })]);
    await frames(page);
    expect(seen.filter((w) => w.includes('SWC-12')).length).toBe(3);
  });

  test('SWC-13: the swatch takes no input and no focus and draws no state; inside a link or a Button it lets input reach that element, stays as drawn, and its name is that element’s content', async ({ page }) => {
    await mountHtml(page, {
      link: '<a id="teal" href="#teal" style="display:inline-block"><tanrei-swatch color="#0f766e" label="Teal 700" label-hidden></tanrei-swatch></a>',
      button: '<button id="pick" type="button"><tanrei-swatch color="#e11d48" label="Bug" size="small"></tanrei-swatch></button>',
      before: '<button id="before" type="button">Before</button><tanrei-swatch color="#0f766e" label="Teal 700"></tanrei-swatch><button id="after" type="button">After</button>',
    });
    // The verify: the link's accessible name is Teal 700…
    await expect(page.getByRole('link', { name: 'Teal 700', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Bug', exact: true })).toHaveCount(1);
    // …a click on the sample follows the link…
    await sample(swatch(page, 'link')).click();
    await expect(page).toHaveURL(/#teal$/);
    // …and the sample's pixels do not change on hover or under a press.
    const host = swatch(page, 'before');
    const rest = (await pixels(sample(host))).bytes;
    await sample(host).hover();
    await frames(page);
    expect(Buffer.compare((await pixels(sample(host))).bytes, rest)).toBe(0);
    await page.mouse.down();
    await frames(page);
    expect(Buffer.compare((await pixels(sample(host))).bytes, rest)).toBe(0);
    await page.mouse.up();
    // No focus: not a stop in the focus order, and a press does not focus it.
    expect(await host.evaluate((el) => [el.tabIndex, el.shadowRoot!.querySelectorAll('[tabindex]').length])).toEqual([-1, 0]);
    expect(await host.evaluate((el) => document.activeElement === el)).toBe(false);
    await page.locator('#before').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after');
    // No event of its own.
    const declared = await host.evaluate((el) => Object.keys((el.constructor as unknown as { properties: object }).properties));
    expect(declared.some((name) => name.startsWith('on'))).toBe(false);
  });

  test('SWC-14: a change of color, label, supportingText, labelHidden, decorative, size or shape is drawn and exposed at once, without a motion, and is not announced', async ({ page }) => {
    await mount(page);
    const host = swatch(page, 'default');
    await host.evaluate((el: HTMLElement & Record<string, unknown>) => {
      el.color = '#7c3aed';
      el.label = 'Violet';
      el.supportingText = '#7c3aed';
      el.size = 'large';
      el.shape = 'circle';
    });
    await host.evaluate((el: HTMLElement & { updateComplete: Promise<unknown> }) => el.updateComplete);
    expect(await host.evaluate((el) => [el.shadowRoot!.querySelector('.label')!.textContent, el.shadowRoot!.querySelector('.supporting')!.textContent, getComputedStyle(el.shadowRoot!.querySelector('.sample')!).backgroundImage.includes('rgb(124, 58, 237)'), el.shadowRoot!.querySelector('.sample')!.getBoundingClientRect().width, el.shadowRoot!.getAnimations().length])).toEqual(['Violet', '#7c3aed', true, await token(page, 'container-size-large'), 0]);
    for (const part of ['.sample', '.label']) expect(await css(host.locator(part), 'transition-duration'), part).toBe('0s');
    await host.evaluate((el: HTMLElement & Record<string, unknown>) => (el.labelHidden = true));
    await host.evaluate((el: HTMLElement & { updateComplete: Promise<unknown> }) => el.updateComplete);
    expect(await host.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual(['img', 'Violet']);
    await host.evaluate((el: HTMLElement & Record<string, unknown>) => (el.decorative = true));
    await host.evaluate((el: HTMLElement & { updateComplete: Promise<unknown> }) => el.updateComplete);
    expect(await host.evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-hidden')])).toEqual([null, 'true']);
    expect(await host.evaluate((el) => [el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length, el.getAttribute('aria-live')])).toEqual([0, null]);
  });

  test('SWC-15: with the text enlarged the sample keeps its side, the texts grow, and the sample stays centred on them', async ({ page }) => {
    await mount(page);
    const ids = ['default', 'small', 'large'] as const;
    const before = await Promise.all(ids.map(async (id) => [await box(sample(swatch(page, id))), Number.parseFloat(await css(label(swatch(page, id)), 'font-size'))] as const));
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await frames(page);
    for (const [i, id] of ids.entries()) {
      const host = swatch(page, id);
      const [s, l, d] = [await box(sample(host)), await box(label(host)), await box(supporting(host))];
      expect([s.width, s.height], id).toEqual([before[i][0].width, before[i][0].height]);
      expect(Number.parseFloat(await css(label(host), 'font-size')), id).toBeGreaterThan(before[i][1]);
      near(s.y + s.height / 2, (l.y + d.y + d.height) / 2, `${id}: centred`, 1);
    }
  });

  test('SWC-16: in forced colors the fill and the checkerboard keep their colors, the edge is the text color, and so are the texts', async ({ page }) => {
    await mount(page);
    const side = await token(page, 'container-size-medium');
    const restFill = (await pixels(sample(swatch(page, 'default')))).at(side / 2, side / 2);
    await page.emulateMedia({ forcedColors: 'active' });
    // Forced where the engine repaints a page color; an engine that only answers the media query does not have the mode.
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const host = swatch(page, 'default');
    expect(await css(sample(host), 'forced-color-adjust')).toBe('none');
    close((await pixels(sample(host))).at(side / 2, side / 2), restFill, 'the fill keeps its color', 1);
    const text = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'CanvasText';
      document.body.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    expect(await css(sample(host), 'box-shadow')).toContain(text);
    expect(await css(label(host), 'color')).toBe(text);
    expect(await css(supporting(host), 'color')).toBe(text);
  });

  test('SWC-17: in a right-to-left layout the sample is at the right and the text after it to the left, the gap applied by logical edges; nothing is mirrored and the value keeps its order', async ({ page }) => {
    await mount(page);
    const host = swatch(page, 'rtl');
    const [s, l] = [await box(sample(host)), await box(label(host))];
    expect(s.x).toBeGreaterThan(l.x);
    near(s.x - (l.x + l.width), await token(page, 'gap-medium'), 'gap');
    expect(await css(sample(host), 'background-position')).toBe(await css(sample(swatch(page, 'default')), 'background-position'));
    expect(await css(sample(host), 'transform')).toBe('none');
    // The value is left to right inside the right-to-left layout: the number sign is at its left.
    const range = await supporting(host).evaluate((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const text = walker.nextNode()!;
      const r = document.createRange();
      r.setStart(text, 0);
      r.setEnd(text, 1);
      const sign = r.getBoundingClientRect();
      r.setEnd(text, text.textContent!.length);
      return { sign: sign.x, box: r.getBoundingClientRect().x };
    });
    near(range.sign, range.box, 'the number sign is the leftmost character of the value', 1);
  });

  test('SWC-18: the direction is the nearest ancestor’s and the swatch has no setting of its own; a change after the first render is drawn at once, keeping what it shows', async ({ page }) => {
    await mount(page);
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    const host = swatch(page, 'rtl');
    expect(await host.evaluate((el) => [el.hasAttribute('dir'), Object.keys((el.constructor as unknown as { properties: object }).properties).filter((name) => /^dir/i.test(name))])).toEqual([false, []]);
    expect((await box(sample(host))).x).toBeGreaterThan((await box(label(host))).x);
    await page.evaluate(() => {
      for (const ancestor of document.querySelectorAll('[data-fixture="rtl"], [data-fixture="rtl"] [dir]')) ancestor.setAttribute('dir', 'ltr');
    });
    await frames(page, 1);
    expect((await box(sample(host))).x).toBeLessThan((await box(label(host))).x);
    await expect(label(host)).toHaveText(String(spec.fixtures.find((f) => f.id === 'rtl')!.props.label));
    expect(await host.evaluate((el) => el.shadowRoot!.getAnimations().length)).toBe(0);
  });

  test('SWC-19: a size or a shape the active design system does not have renders with the default’s tokens and is reported; one a design system adds is drawn from its tokens', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('base', { color: '#0f766e', label: 'a' }), fx('size', { color: '#0f766e', label: 'a', size: 'huge' }), fx('shape', { color: '#0f766e', label: 'a', shape: 'hexagon' }), fx('unsafe', { color: '#0f766e', label: 'a', size: '9"x', shape: 'a b{' })]);
    const look = async (id: string) => ({ side: await box(sample(swatch(page, id))).then((b) => [b.width, b.height]), radius: await css(sample(swatch(page, id)), 'border-top-left-radius'), font: await css(label(swatch(page, id)), 'font-size') });
    const base = await look('base');
    for (const id of ['size', 'shape', 'unsafe']) expect(await look(id), id).toEqual(base);
    await expect.poll(() => seen.filter((w) => w.includes('SWC-19')).length).toBeGreaterThanOrEqual(2);
    const reported = seen.filter((w) => w.includes('SWC-19')).join('\n');
    for (const said of ['size "huge"', 'shape "hexagon"']) expect(reported, said).toContain(said);
    expect(seen.filter((w) => w.includes('SWC-19') && /"(small|medium|large|square|circle)" is not/.test(w))).toEqual([]);
    const layer = `<style>:root { ${T('container-size-huge')}: 48px; ${T('gap-huge')}: 20px; ${T('label-typescale-huge-font')}: 500 30px/1.25 Inter; ${T('label-typescale-huge-letter-spacing')}: 0em; ${T('supporting-text-typescale-huge-font')}: 400 20px/1.25 Inter; ${T('supporting-text-typescale-huge-letter-spacing')}: 0em; ${T('container-shape-hexagon')}: 12px; ${T('container-shape-hexagon-pill')}: 0; }</style>`;
    await mountHtml(page, { layer, added: '<tanrei-swatch color="#0f766e" label="Teal" size="huge" shape="hexagon"></tanrei-swatch>' });
    const added = swatch(page, 'added');
    expect(await box(sample(added)).then((b) => [b.width, b.height])).toEqual([48, 48]);
    expect(await css(sample(added), 'border-top-left-radius')).toBe('12px');
    expect(await css(label(added), 'font-size')).toBe('30px');
    near((await box(label(added))).x - ((await box(sample(added))).x + 48), 20, 'the added gap');
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(page, spec.fixtures, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });
});

test.describe('fixtures', () => {
  test('every size of the spec has a fixture, and every fixture’s sample is the size it names', async ({ page }) => {
    await mount(page);
    const sizes = new Set(spec.fixtures.map((f) => String(f.props.size ?? 'medium')));
    for (const size of SIZES) expect(sizes.has(size), size).toBe(true);
    for (const f of spec.fixtures) {
      const side = await token(page, `container-size-${f.props.size ?? 'medium'}`);
      expect((await box(sample(swatch(page, f.id)))).width, f.id).toBe(side);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f);
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
