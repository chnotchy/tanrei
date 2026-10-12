// <tanrei-tag>, driven by specs/tag.spec.json: every behaviour id (TAG-1…21) is cited by a test title, every fixture has
// a baseline, and every length and color is read back from the tokens — never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, tab, rootTokens } from '../../../test/harness.js';

const spec = loadSpec('tag');
type P = Page;
const TAG = 'tanrei-tag';
const VARIANTS = ['tonal', 'outlined', 'filled'] as const;
const STATUSES = ['info', 'warning', 'error', 'success'] as const;
const SIZES = ['small', 'medium'] as const;
const LONG = String(spec.fixtures.find((f) => f.id === 'long-label')!.props.label);
const ARABIC_LONG = 'في انتظار مراجعة ثانية من فريق إمكانية الوصول قبل إصدار النسخة المرشحة';

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const container = (page: P, id: string) => host(page, id).locator('.container');
const label = (page: P, id: string) => host(page, id).locator('.label');
const icon = (page: P, id: string) => host(page, id).locator('.icon');
const dot = (page: P, id: string) => host(page, id).locator('.dot');
const T = (name: string) => `--tanrei-comp-tag-${name}`;
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const fx = (id: string, props: Fixture['props'], extra: Partial<Fixture> = {}): Fixture => ({ id, props, ...extra });
const glyph = (name: string, attributes = '') => `<span slot="icon"${attributes ? ` ${attributes}` : ''}>${name}</span>`;
/** What a fixture's tag paints: its fill, its label color, and its mark's color (the glyph's, or the dot's fill). */
async function painted(page: P, id: string) {
  const hasDot = (await dot(page, id).count()) > 0;
  return {
    container: await css(container(page, id), 'background-color'),
    label: await css(label(page, id), 'color'),
    mark: hasDot ? await css(dot(page, id), 'background-color') : await css(icon(page, id), 'color'),
  };
}
/** The tokens of a look: `tonal`, or `tonal-error`. */
const look = async (page: P, name: string) => ({
  container: await resolveColor(page, T(`${name}-container-color`)),
  label: await resolveColor(page, T(`${name}-label-color`)),
  mark: await resolveColor(page, T(`${name}-icon-color`)),
});
/**
 * Where the label's first and last characters are drawn, and the label's own box. A character an ellipsis hides is
 * reported where the engine likes (WebKit: at the ellipsis), so a cut is read from the FIRST character — it stands at
 * the label's own start edge — and from the box overflowing, never from the last one.
 */
const ends = (page: P, id: string) =>
  label(page, id).evaluate((el) => {
    const text = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!;
    const rect = (start: number) => {
      const range = document.createRange();
      range.setStart(text, start);
      range.setEnd(text, start + 1);
      return range.getBoundingClientRect();
    };
    const first = rect(0);
    const last = rect(text.textContent!.length - 1);
    const own = el.getBoundingClientRect();
    return { first: { left: first.left, right: first.right }, last: { left: last.left, right: last.right }, left: own.left, right: own.right };
  });
/** The transform an element is drawn with: `none`, or the mirror's matrix. */
const transformOf = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).transform);
const MIRRORED = 'matrix(-1, 0, 0, 1, 0, 0)';

test.describe('behavior', () => {
  test('TAG-1: a container at least its size’s height, pill corners eased by the shared rule, one row a gap apart; the paddings of each size, nearer at a start that holds a glyph or a dot; as wide as its content, no elevation', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const gap = await resolveToken(page, T('container-gap'));
    for (const size of SIZES) {
      const [plain, withIcon, withDot] = size === 'medium' ? ['tonal', 'icon', 'dot'] : ['small-tonal', 'icon-small', 'dot-small-outlined-warning'];
      const height = await resolveToken(page, T(`container-height-${size}`));
      const pad = await resolveToken(page, T(`container-padding-inline-${size}`));
      const padIcon = await resolveToken(page, T(`container-padding-inline-with-icon-${size}`));
      const padBlock = await resolveToken(page, T(`container-padding-block-${size}`));
      // A label alone: the height of the size, padding-inline before and after, as wide as that.
      const c = await box(container(page, plain));
      const l = await box(label(page, plain));
      expect(c.height, size).toBeCloseTo(height, 1);
      expect(l.x - c.x, size).toBeCloseTo(pad, 1);
      expect(c.x + c.width - (l.x + l.width), size).toBeCloseTo(pad, 1);
      expect(c.width, size).toBeCloseTo(l.width + 2 * pad, 1);
      // The row's tallest item is padded at the top and bottom by at least padding-block.
      expect(l.y - c.y, size).toBeGreaterThanOrEqual(padBlock - 0.01);
      expect(c.y + c.height - (l.y + l.height), size).toBeGreaterThanOrEqual(padBlock - 0.01);
      // The host is exactly its container.
      expect((await box(host(page, plain))).width, size).toBeCloseTo(c.width, 1);
      // A glyph, then a dot: the start is padded by padding-inline-with-icon, the mark is a gap from the label, the end is unchanged.
      for (const [id, mark] of [
        [withIcon, icon(page, withIcon)],
        [withDot, dot(page, withDot)],
      ] as const) {
        const cm = await box(container(page, id));
        const m = await box(mark);
        const lm = await box(label(page, id));
        expect(m.x - cm.x, id).toBeCloseTo(padIcon, 1);
        expect(lm.x - (m.x + m.width), id).toBeCloseTo(gap, 1);
        expect(cm.x + cm.width - (lm.x + lm.width), id).toBeCloseTo(pad, 1);
        expect(cm.height, id).toBeCloseTo(height, 1);
      }
    }
    // The corners: container.shape through the shared corner rule — the full step is a pill, round caps at any height.
    const shape = container(page, 'tonal');
    expect(await shape.getAttribute('data-tanrei-shape')).not.toBeNull();
    expect((await css(shape, '--tanrei-corner-pill')).trim()).toBe('1');
    const medium = await resolveToken(page, T('container-height-medium'));
    expect(Number.parseFloat(await css(shape, 'border-top-left-radius'))).toBeGreaterThanOrEqual(medium / 2);
    // A corner step instead: that radius, never more than half the height.
    await override(page, { [T('container-shape')]: 'var(--tanrei-sys-shape-corner-small)', [T('container-shape-pill')]: '0' });
    const small = await resolveToken(page, '--tanrei-sys-shape-corner-small');
    expect((await css(shape, '--tanrei-corner-pill')).trim()).toBe('0');
    const radius = Number.parseFloat(await css(shape, 'border-top-left-radius'));
    expect(small).toBeGreaterThan(0);
    expect(radius).toBeGreaterThanOrEqual(small);
    expect(radius).toBeLessThan(medium / 2);
    // No elevation, in any look.
    for (const id of ['tonal', 'filled', 'tonal-error', 'filled-success']) expect(await css(container(page, id), 'box-shadow'), id).toBe('none');
    for (const id of ['outlined', 'outlined-error']) expect(await css(container(page, id), 'box-shadow'), id).toContain('inset');
  });

  test('TAG-2: with no status, each variant fills its container and draws its label, its glyph and its dot from that variant’s own tokens', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: VARIANTS.flatMap((variant) => [
        fx(`${variant}-glyph`, { variant, label: 'Design' }, { slots: { icon: 'sell' } }),
        fx(`${variant}-dot`, { variant, label: 'Archived', dot: true }),
      ]),
    });
    for (const variant of VARIANTS) {
      const tokens = await look(page, variant);
      expect(await painted(page, `${variant}-glyph`), `${variant}, glyph`).toEqual(tokens);
      expect(await painted(page, `${variant}-dot`), `${variant}, dot`).toEqual(tokens);
    }
    // The three looks are three fills (the premise): quiet, none, full.
    const fills = await Promise.all(VARIANTS.map((variant) => css(container(page, `${variant}-dot`), 'background-color')));
    expect(new Set(fills).size).toBe(3);
    expect(fills[1]).toBe('rgba(0, 0, 0, 0)');
  });

  test('TAG-3: a status draws the container, the label and the glyph or dot from the variant’s parts of that status — colors only: the size, shape, layout and edge stay, and no glyph is drawn that the product did not give', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: VARIANTS.flatMap((variant) => [
        fx(`${variant}-plain`, { variant, label: 'Passed', dot: true }),
        ...STATUSES.flatMap((status) => [
          fx(`${variant}-${status}-bare`, { variant, status, label: 'Passed' }),
          fx(`${variant}-${status}-dot`, { variant, status, label: 'Passed', dot: true }),
          fx(`${variant}-${status}-glyph`, { variant, status, label: 'Passed' }, { slots: { icon: 'check_circle' } }),
        ]),
      ]),
    });
    for (const variant of VARIANTS) {
      const rest = await box(container(page, `${variant}-plain`));
      const restShadow = await css(container(page, `${variant}-plain`), 'box-shadow');
      const restRadius = await css(container(page, `${variant}-plain`), 'border-top-left-radius');
      for (const status of STATUSES) {
        const tokens = await look(page, `${variant}-${status}`);
        expect(await painted(page, `${variant}-${status}-dot`), `${variant} ${status}, dot`).toEqual(tokens);
        expect(await painted(page, `${variant}-${status}-glyph`), `${variant} ${status}, glyph`).toEqual(tokens);
        // Colors only: the same box, corners and edge as the variant without a status.
        const c = await box(container(page, `${variant}-${status}-dot`));
        expect(c.width, `${variant} ${status}`).toBeCloseTo(rest.width, 1);
        expect(c.height, `${variant} ${status}`).toBeCloseTo(rest.height, 1);
        expect(await css(container(page, `${variant}-${status}-dot`), 'box-shadow'), `${variant} ${status}`).toBe(restShadow);
        expect(await css(container(page, `${variant}-${status}-dot`), 'border-top-left-radius'), `${variant} ${status}`).toBe(restRadius);
        // No glyph of the tag's own: the icon box is not drawn, and only an outlined tag gains a dot (TAG-8).
        await expect(icon(page, `${variant}-${status}-bare`), `${variant} ${status}`).toBeHidden();
        await expect(dot(page, `${variant}-${status}-bare`), `${variant} ${status}`).toHaveCount(variant === 'outlined' ? 1 : 0);
        expect(await host(page, `${variant}-${status}-bare`).evaluate((el) => el.querySelectorAll('*').length)).toBe(0);
      }
    }
    // The spec's own names, spelled out once: a tonal info tag, an outlined error mark, a filled success fill.
    expect(await css(container(page, 'tonal-info-dot'), 'background-color')).toBe(await resolveColor(page, T('tonal-info-container-color')));
    expect(await css(label(page, 'tonal-info-dot'), 'color')).toBe(await resolveColor(page, T('tonal-info-label-color')));
    expect(await css(dot(page, 'tonal-info-dot'), 'background-color')).toBe(await resolveColor(page, T('tonal-info-icon-color')));
    expect(await css(icon(page, 'outlined-error-glyph'), 'color')).toBe(await resolveColor(page, T('outlined-error-icon-color')));
    expect(await css(container(page, 'filled-success-dot'), 'background-color')).toBe(await resolveColor(page, T('filled-success-container-color')));
  });

  test('TAG-4: the outlined look draws one hairline inside its container, the same in every status and without changing the tag’s size or its content’s place; tonal and filled draw no edge', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fx('tonal', { label: 'Draft' }), fx('filled', { variant: 'filled', label: 'Draft' }), fx('outlined', { variant: 'outlined', label: 'Draft' }), ...STATUSES.map((status) => fx(`outlined-${status}`, { variant: 'outlined', status, label: 'Draft', dot: true }))] });
    const width = await resolveToken(page, T('outline-width'));
    const color = await resolveColor(page, T('outline-color'));
    expect(width).toBeGreaterThan(0);
    const edge = await css(container(page, 'outlined'), 'box-shadow');
    // An inset ring of outline.width in outline.color: inside the box, following its corners.
    expect(edge).toContain('inset');
    expect(edge).toContain(color);
    expect(edge).toContain(`0px 0px 0px ${width}px`);
    // A status never colors the edge.
    for (const status of STATUSES) expect(await css(container(page, `outlined-${status}`), 'box-shadow'), status).toBe(edge);
    for (const id of ['tonal', 'filled']) expect(await css(container(page, id), 'box-shadow'), id).toBe('none');
    // It takes no room: the outlined tag is the tonal tag's size, its label in the same place — at any width of the edge.
    const tonal = { c: await box(container(page, 'tonal')), l: await box(label(page, 'tonal')) };
    for (const thickness of [null, '3px']) {
      if (thickness) await override(page, { [T('outline-width')]: thickness });
      const c = await box(container(page, 'outlined'));
      const l = await box(label(page, 'outlined'));
      expect(c.width, String(thickness)).toBeCloseTo(tonal.c.width, 1);
      expect(c.height, String(thickness)).toBeCloseTo(tonal.c.height, 1);
      expect(l.x - c.x, String(thickness)).toBeCloseTo(tonal.l.x - tonal.c.x, 1);
      expect(l.y - c.y, String(thickness)).toBeCloseTo(tonal.l.y - tonal.c.y, 1);
    }
    expect(await css(container(page, 'outlined'), 'border-top-width')).toBe('0px');
  });

  test('TAG-5: the label is one line in the text style of its size and its look’s color, never wrapped, and cut with an ellipsis only when the layout gives less than it needs — the paddings and the dot stay whole, and the full label is still read', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures.filter((f) => ['tonal', 'small-tonal', 'long-label'].includes(f.id)), fx('boxed', { status: 'info', dot: true, label: LONG })] });
    // The text style of each size, used whole.
    for (const [id, size] of [
      ['tonal', 'medium'],
      ['small-tonal', 'small'],
    ] as const) {
      expect(Number.parseFloat(await css(label(page, id), 'font-size')), size).toBeCloseTo(await resolveToken(page, T(`label-typescale-${size}-font-size`)), 1);
      expect(await css(label(page, id), 'font-weight'), size).toBe((await css(host(page, id), T(`label-typescale-${size}-font-weight`))).trim());
      expect(await css(label(page, id), 'white-space'), size).toBe('nowrap');
      // A label that fits is not cut.
      expect(await label(page, id).evaluate((el) => el.scrollWidth <= el.clientWidth), size).toBe(true);
    }
    expect(await css(label(page, 'tonal'), 'color')).toBe(await resolveColor(page, T('tonal-label-color')));
    // The fixture: wider than the stage, so cut at the stage's width.
    const inner = await stage(page, 'long-label').evaluate((el) => {
      const style = getComputedStyle(el);
      return el.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
    });
    expect((await box(host(page, 'long-label'))).width).toBeCloseTo(inner, 0);
    expect(await label(page, 'long-label').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // A box 96 wide: the tag is no wider, still one line, its paddings and its dot whole, the label cut with an ellipsis.
    await stage(page, 'boxed').evaluate((el) => {
      const narrow = document.createElement('div');
      narrow.style.inlineSize = '96px';
      narrow.append(el.querySelector('tanrei-tag')!);
      el.append(narrow);
    });
    const c = await box(container(page, 'boxed'));
    const l = await box(label(page, 'boxed'));
    const d = await box(dot(page, 'boxed'));
    expect(c.width).toBeCloseTo(96, 0);
    expect(c.height).toBeCloseTo(await resolveToken(page, T('container-height-medium')), 1);
    expect(await css(label(page, 'boxed'), 'text-overflow')).toBe('ellipsis');
    expect(await label(page, 'boxed').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(d.width).toBeCloseTo(await resolveToken(page, T('dot-size')), 1);
    expect(d.x - c.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline-with-icon-medium')), 1);
    expect(c.x + c.width - (l.x + l.width)).toBeCloseTo(await resolveToken(page, T('container-padding-inline-medium')), 1);
    // What assistive technology reads is the whole label.
    expect(await stage(page, 'boxed').ariaSnapshot()).toContain(LONG);
    expect(await label(page, 'boxed').textContent()).toBe(LONG);
  });

  test('TAG-6: a glyph in the icon slot is drawn before the label in a box of icon.size, centred on the label’s line, in the look’s icon color and the icon set’s unselected family, fill and weight; it is hidden from assistive technology and takes the dot’s place', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures.filter((f) => ['icon', 'icon-small', 'icon-success', 'icon-outlined-error', 'icon-filled'].includes(f.id)), fx('both', { dot: true, label: 'Design' }, { slots: { icon: 'sell' } })] });
    const size = await resolveToken(page, T('icon-size'));
    for (const id of ['icon', 'icon-small', 'icon-success', 'icon-outlined-error', 'icon-filled']) {
      const i = await box(icon(page, id));
      const l = await box(label(page, id));
      // The same box in both sizes, before the label, centred on its line.
      expect(i.width, id).toBeCloseTo(size, 1);
      expect(i.height, id).toBeCloseTo(size, 1);
      expect(i.x + i.width, id).toBeLessThanOrEqual(l.x);
      expect(i.y + i.height / 2, id).toBeCloseTo(l.y + l.height / 2, 0);
    }
    // The look's icon color (TAG-2, TAG-3).
    expect(await css(icon(page, 'icon'), 'color')).toBe(await resolveColor(page, T('tonal-icon-color')));
    expect(await css(icon(page, 'icon-success'), 'color')).toBe(await resolveColor(page, T('tonal-success-icon-color')));
    expect(await css(icon(page, 'icon-outlined-error'), 'color')).toBe(await resolveColor(page, T('outlined-error-icon-color')));
    expect(await css(icon(page, 'icon-filled'), 'color')).toBe(await resolveColor(page, T('filled-icon-color')));
    // The icon helper: the unselected family and fill, the system's weight, the box's own optical size; no motion.
    const unquoted = (family: string) => family.replaceAll(/["']/g, '').trim();
    const slotted = host(page, 'icon').locator('[slot="icon"]');
    expect(unquoted(await css(slotted, 'font-family'))).toBe(unquoted(await css(host(page, 'icon'), '--tanrei-sys-icon-family-unselected')));
    const fill = (await css(host(page, 'icon'), '--tanrei-sys-icon-fill-unselected')).trim();
    const weight = (await css(host(page, 'icon'), '--tanrei-sys-icon-weight')).trim();
    const variation = await css(slotted, 'font-variation-settings');
    expect(variation).toMatch(new RegExp(`["']FILL["'] ${fill}\\b`));
    expect(variation).toMatch(new RegExp(`["']wght["'] ${weight}\\b`));
    expect(await css(slotted, 'font-optical-sizing')).toBe('auto');
    expect(Number.parseFloat(await css(slotted, 'font-size'))).toBeCloseTo(size, 1);
    expect(await css(icon(page, 'icon'), 'transition-duration')).toBe('0s');
    // Hidden from assistive technology: the glyph's name is not read.
    expect(await icon(page, 'icon').evaluate((el) => el.closest('[aria-hidden="true"]') !== null)).toBe(true);
    expect(await stage(page, 'icon').ariaSnapshot()).not.toContain('sell');
    expect(await stage(page, 'icon').ariaSnapshot()).toContain('Design');
    // The glyph and no mark of the tag's own in its place, even where dot is true.
    await expect(dot(page, 'both')).toHaveCount(0);
    await expect(icon(page, 'both')).toBeVisible();
  });

  test('TAG-7: dot draws a filled circle of dot.size before the label in the look’s icon color, centred on the label’s line, a circle whatever corners the container has, hidden from assistive technology; a glyph takes its place', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures.filter((f) => ['dot', 'dot-success', 'tonal'].includes(f.id)), fx('filled-dot', { variant: 'filled', dot: true, label: 'Default' })] });
    const size = await resolveToken(page, T('dot-size'));
    for (const id of ['dot', 'dot-success', 'filled-dot']) {
      const d = await box(dot(page, id));
      const l = await box(label(page, id));
      expect(d.width, id).toBeCloseTo(size, 1);
      expect(d.height, id).toBeCloseTo(size, 1);
      expect(d.x + d.width, id).toBeLessThanOrEqual(l.x);
      expect(d.y + d.height / 2, id).toBeCloseTo(l.y + l.height / 2, 0);
      expect(await dot(page, id).evaluate((el) => el.closest('[aria-hidden="true"]') !== null), id).toBe(true);
    }
    expect(await css(dot(page, 'dot'), 'background-color')).toBe(await resolveColor(page, T('tonal-icon-color')));
    expect(await css(dot(page, 'dot-success'), 'background-color')).toBe(await resolveColor(page, T('tonal-success-icon-color')));
    expect(await css(dot(page, 'filled-dot'), 'background-color')).toBe(await resolveColor(page, T('filled-icon-color')));
    // A circle whatever corners the container has.
    await override(page, { [T('container-shape')]: '0px', [T('container-shape-pill')]: '0' });
    expect(Number.parseFloat(await css(container(page, 'dot'), 'border-top-left-radius'))).toBe(0);
    expect(await css(dot(page, 'dot'), 'border-top-left-radius')).toBe('50%');
    // Without dot there is none; a glyph given later takes the dot's place, and gives it back when it goes.
    await expect(dot(page, 'tonal')).toHaveCount(0);
    await host(page, 'dot').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="icon">sell</span>'));
    await expect(dot(page, 'dot')).toHaveCount(0);
    await expect(icon(page, 'dot')).toBeVisible();
    await host(page, 'dot').evaluate((el) => el.querySelector('[slot="icon"]')!.remove());
    await expect(dot(page, 'dot')).toHaveCount(1);
    await expect(icon(page, 'dot')).toBeHidden();
  });

  test('TAG-8: an outlined tag with a status draws the dot whether dot is true or false, in the status’s color; with no status, or in another look, the dot is only the product’s', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const status of STATUSES) {
      const id = `outlined-${status}`;
      // The fixture leaves dot false.
      expect(spec.fixtures.find((f) => f.id === id)!.props.dot, id).toBeUndefined();
      expect(await host(page, id).evaluate((el) => (el as HTMLElement & { dot: boolean }).dot), id).toBe(false);
      await expect(dot(page, id), id).toHaveCount(1);
      expect(await css(dot(page, id), 'background-color'), id).toBe(await resolveColor(page, T(`outlined-${status}-icon-color`)));
      // The label and the edge are the surface's: the mark is the only place the status shows.
      expect(await css(label(page, id), 'color'), id).toBe(await css(label(page, 'outlined'), 'color'));
      expect(await css(container(page, id), 'box-shadow'), id).toBe(await css(container(page, 'outlined'), 'box-shadow'));
    }
    await expect(dot(page, 'dot-small-outlined-warning')).toHaveCount(1);
    await expect(dot(page, 'ltr-label-rtl')).toHaveCount(1);
    // Not without a status, not in another look, and not where the product gave a glyph.
    for (const id of ['outlined', 'small-outlined', 'tonal-error', 'filled-error', 'icon-outlined-error', 'docs-status-lagging']) await expect(dot(page, id), id).toHaveCount(0);
    // It follows the props: a status given later brings the dot, and taking it away removes it.
    await host(page, 'outlined').evaluate((el) => el.setAttribute('status', 'error'));
    await expect(dot(page, 'outlined')).toHaveCount(1);
    await host(page, 'outlined').evaluate((el) => el.setAttribute('status', 'default'));
    await expect(dot(page, 'outlined')).toHaveCount(0);
  });

  test('TAG-9: a tag takes no input and no focus and is not a stop in the focus order; nothing it draws changes under a pointer, a press or focus — no state layer, ripple or focus indicator — and it emits no event', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => ['tonal', 'outlined-error', 'filled'].includes(f.id)) });
    await page.evaluate(() => {
      const before = Object.assign(document.createElement('button'), { id: 'before', textContent: 'Before' });
      const after = Object.assign(document.createElement('button'), { id: 'after', textContent: 'After' });
      document.querySelector('main')!.prepend(before);
      document.querySelector('main')!.append(after);
      (window as unknown as { emitted: string[] }).emitted = [];
      for (const tag of document.querySelectorAll('tanrei-tag')) {
        const dispatch = tag.dispatchEvent.bind(tag);
        tag.dispatchEvent = (event: Event) => {
          (window as unknown as { emitted: string[] }).emitted.push(event.type);
          return dispatch(event);
        };
      }
    });
    for (const id of ['tonal', 'outlined-error', 'filled']) {
      // No role of a control, no tabindex, nothing focusable inside.
      expect(await host(page, id).getAttribute('role'), id).toBeNull();
      expect(await host(page, id).getAttribute('tabindex'), id).toBeNull();
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('button, a, input, [tabindex], [role]').length), id).toBe(0);
      expect(await host(page, id).evaluate((el) => (el.shadowRoot as ShadowRoot).delegatesFocus), id).toBe(false);
      // focus() does nothing.
      expect(await host(page, id).evaluate((el) => ((el as HTMLElement).focus(), document.activeElement === el || el.shadowRoot!.activeElement !== null)), id).toBe(false);
      // Nothing it draws changes under a pointer or a press.
      const drawn = () =>
        container(page, id).evaluate((el) => {
          const s = getComputedStyle(el);
          return [s.backgroundColor, s.color, s.boxShadow, s.outlineStyle, s.opacity, s.cursor, s.transform, s.filter].join('|');
        });
      await page.mouse.move(0, 0);
      const rest = await drawn();
      await host(page, id).hover();
      expect(await drawn(), `${id} hovered`).toBe(rest);
      await page.mouse.down();
      expect(await drawn(), `${id} pressed`).toBe(rest);
      await page.mouse.up();
      expect(await drawn(), `${id} released`).toBe(rest);
      expect(rest.split('|')[5], id).not.toBe('pointer');
      // No state layer, no ripple, no focus ring, no minimum-target box, nothing that moves.
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('.ripple, .state-layer, [data-pressed]').length), id).toBe(0);
      expect(await css(container(page, id), 'transition-duration'), id).toBe('0s');
      expect(await container(page, id).evaluate((el) => getComputedStyle(el, '::before').content), id).toBe('none');
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.getAnimations().length), id).toBe(0);
    }
    // Not a stop: Tab goes from the control before the tags to the one after them.
    await page.locator('#before').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after');
    await tab(page, { back: true });
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('before');
    // A click, a key and a change of every prop: the tag dispatches nothing.
    await host(page, 'tonal').click();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await host(page, 'tonal').evaluate(async (el) => {
      Object.assign(el, { label: 'Published', status: 'success', statusLabel: 'Success', variant: 'filled', size: 'small', dot: true });
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    expect(await page.evaluate(() => (window as unknown as { emitted: string[] }).emitted)).toEqual([]);
  });

  test('TAG-10: inside a link or a button, input over the tag reaches that element, the tag stays as drawn while that element is hovered, focused or pressed, its text joins that element’s content in reading order, and it is no second target', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fx('in-button', { status: 'error', statusLabel: 'Error', label: '3 builds' }), fx('in-link', { variant: 'outlined', label: 'Beta' })] });
    await page.evaluate(() => {
      (window as unknown as { pressed: string[] }).pressed = [];
      const wrap = (id: string, element: HTMLElement, before: string) => {
        const tag = document.querySelector(`[data-fixture="${id}"] tanrei-tag`)!;
        element.id = `${id}-holder`;
        tag.replaceWith(element);
        element.append(before, tag);
        element.addEventListener('click', (event) => {
          event.preventDefault();
          (window as unknown as { pressed: string[] }).pressed.push(id);
        });
      };
      wrap('in-button', Object.assign(document.createElement('button'), { type: 'button' }), 'Pipeline ');
      wrap('in-link', Object.assign(document.createElement('a'), { href: '#docs' }), 'Carousel ');
    });
    for (const id of ['in-button', 'in-link']) {
      const holder = page.locator(`#${id}-holder`);
      const drawn = () =>
        container(page, id).evaluate((el) => {
          const s = getComputedStyle(el);
          return [s.backgroundColor, s.color, s.boxShadow, s.outlineStyle, s.opacity].join('|');
        });
      await page.mouse.move(0, 0);
      const rest = await drawn();
      // A press over the tag is a press of the holder: pointer-events are as they were.
      expect(await css(host(page, id), 'pointer-events'), id).toBe('auto');
      const t = await box(host(page, id));
      await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
      expect(await holder.evaluate((el) => el.matches(':hover')), id).toBe(true);
      expect(await drawn(), `${id}, holder hovered`).toBe(rest);
      await page.mouse.down();
      expect(await drawn(), `${id}, holder pressed`).toBe(rest);
      await page.mouse.up();
      expect(await page.evaluate(() => (window as unknown as { pressed: string[] }).pressed), id).toContain(id);
      // Focus is the holder's, drawn by the holder: the tag is no stop inside it and stays as it is.
      await holder.focus();
      expect(await page.evaluate(() => document.activeElement?.id), id).toBe(`${id}-holder`);
      expect(await drawn(), `${id}, holder focused`).toBe(rest);
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.activeElement), id).toBeNull();
    }
    // Its text is part of the holder's content, in reading order, the status in words before the label.
    await expect(page.locator('#in-button-holder')).toHaveAccessibleName(/^Pipeline\s+Error,\s+3 builds$/);
    await expect(page.locator('#in-link-holder')).toHaveAccessibleName(/^Carousel\s+Beta$/);
    await expect(page.getByRole('button')).toHaveCount(1);
    await expect(page.getByRole('link')).toHaveCount(1);
  });

  test('TAG-11: the label is plain text with no role, name or state; with a status, statusLabel is read before it as a second phrase and never drawn; with status default it is ignored; the variant, size and status are exposed in no other way', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [...spec.fixtures.filter((f) => ['status-label', 'tonal-error', 'small-filled'].includes(f.id)), fx('default-status', { statusLabel: 'Error', label: '3 builds' })],
    });
    // The fixture: "Error, 3 builds" is read; "3 builds" is drawn.
    expect(await stage(page, 'status-label').ariaSnapshot()).toMatch(/Error,\s+3 builds/);
    const spoken = host(page, 'status-label').locator('.status');
    expect(await spoken.textContent()).toBe('Error, ');
    // Before the label, in the same run of text.
    expect(await spoken.evaluate((el) => el.nextElementSibling?.classList.contains('label'))).toBe(true);
    // Not drawn: a clipped 1 × 1 box out of the flow, so the tag is exactly as wide as the same tag without it.
    const clip = await box(spoken);
    expect(clip.width).toBeLessThanOrEqual(1);
    expect(clip.height).toBeLessThanOrEqual(1);
    expect(await css(spoken, 'position')).toBe('absolute');
    expect(await css(spoken, 'clip-path')).toBe('inset(50%)');
    const withWords = await box(container(page, 'status-label'));
    await host(page, 'status-label').evaluate((el) => el.removeAttribute('status-label'));
    await expect(spoken).toHaveCount(0);
    expect((await box(container(page, 'status-label'))).width).toBeCloseTo(withWords.width, 1);
    // Reflected as status-label from the property.
    await host(page, 'status-label').evaluate((el) => ((el as HTMLElement & { statusLabel: string }).statusLabel = 'Fehler'));
    await expect(host(page, 'status-label')).toHaveAttribute('status-label', 'Fehler');
    expect(await stage(page, 'status-label').ariaSnapshot()).toMatch(/Fehler,\s+3 builds/);
    // A status without statusLabel reads the label alone; status default ignores statusLabel.
    expect(await stage(page, 'tonal-error').ariaSnapshot()).toBe('- text: Failed');
    await expect(host(page, 'default-status').locator('.status')).toHaveCount(0);
    expect(await stage(page, 'default-status').ariaSnapshot()).toBe('- text: 3 builds');
    // No role, name or state, on the host or inside it; the variant, size and status reach no one but the styles.
    for (const id of ['status-label', 'tonal-error', 'small-filled', 'default-status']) {
      const exposed = await host(page, id).evaluate((el) => {
        const named = (node: Element) => node.getAttributeNames().filter((name) => name === 'role' || name === 'title' || name === 'tabindex' || (name.startsWith('aria-') && name !== 'aria-hidden'));
        return [...named(el), ...[...el.shadowRoot!.querySelectorAll('*')].flatMap(named)];
      });
      expect(exposed, id).toEqual([]);
    }
    expect(await stage(page, 'small-filled').ariaSnapshot()).toBe('- text: Required');
  });

  test('TAG-12: a change of label, status or statusLabel is drawn and exposed at once, without a motion, and is not announced', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === 'tonal') });
    await host(page, 'tonal').evaluate(async (el) => {
      Object.assign(el, { label: '3 builds', status: 'error', statusLabel: 'Error' });
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    // In the frame of the update: the new label, the new colors at their final value, the new words.
    expect(await label(page, 'tonal').textContent()).toBe('3 builds');
    expect(await css(container(page, 'tonal'), 'background-color')).toBe(await resolveColor(page, T('tonal-error-container-color')));
    expect(await css(label(page, 'tonal'), 'color')).toBe(await resolveColor(page, T('tonal-error-label-color')));
    expect(await host(page, 'tonal').evaluate((el) => el.shadowRoot!.getAnimations().length)).toBe(0);
    for (const part of [container(page, 'tonal'), label(page, 'tonal')]) {
      expect(await css(part, 'transition-duration')).toBe('0s');
      expect(await css(part, 'animation-name')).toBe('none');
    }
    expect(await stage(page, 'tonal').ariaSnapshot()).toMatch(/Error,\s+3 builds/);
    // No live region of its own.
    expect(await host(page, 'tonal').evaluate((el) => el.matches('[aria-live], [role]') || el.shadowRoot!.querySelectorAll('[aria-live], [role]').length > 0)).toBe(false);
    // Back again, as fast.
    await host(page, 'tonal').evaluate(async (el) => {
      Object.assign(el, { status: 'default' });
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    expect(await css(container(page, 'tonal'), 'background-color')).toBe(await resolveColor(page, T('tonal-container-color')));
    expect(await stage(page, 'tonal').ariaSnapshot()).toBe('- text: 3 builds');
  });

  test('TAG-13: inline with the text beside it as one unbreakable box, its label on that text’s baseline with or without a mark; with enlarged text the container grows with the label, keeping its height as a minimum, its paddings, and the glyph box and the dot at their sizes', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fx('inline', { size: 'small', label: 'Beta' }),
        fx('inline-icon', { size: 'small', label: 'Stable', status: 'success' }, { slots: { icon: 'check_circle' } }),
        fx('inline-dot', { label: 'Online', dot: true }),
        fx('inline-large-icon', { size: 'small', label: 'Design' }, { slots: { icon: 'sell' } }),
      ],
    });
    // A glyph box taller than the label's line still leaves the label on the baseline.
    await host(page, 'inline-large-icon').evaluate((el) => (el as HTMLElement).style.setProperty('--tanrei-comp-tag-icon-size', '28px'));
    for (const id of ['inline', 'inline-icon', 'inline-dot', 'inline-large-icon']) {
      expect(await css(host(page, id), 'display'), id).toBe('inline-flex');
      expect(await css(host(page, id), 'vertical-align'), id).toBe('baseline');
      const [textBaseline, labelBaseline, lines] = await page.evaluate((fixture) => {
        const stage = document.querySelector(`[data-fixture="${fixture}"]`)!;
        const tag = stage.querySelector('tanrei-tag')!;
        const p = document.createElement('p');
        p.style.font = 'var(--tanrei-sys-typescale-body-font)';
        p.style.margin = '0';
        p.append('The carousel is ', tag, ' on the web');
        stage.append(p);
        const marker = () => Object.assign(document.createElement('span'), { style: 'display:inline-block;inline-size:0;block-size:0' });
        const inText = marker();
        p.append(inText);
        const inLabel = marker();
        tag.shadowRoot!.querySelector('.label')!.append(inLabel);
        const result = [inText.getBoundingClientRect().bottom, inLabel.getBoundingClientRect().bottom, 0];
        inLabel.remove();
        // One unbreakable box: in a column far narrower than the tag, it is still one line high.
        p.style.inlineSize = '24px';
        result[2] = tag.getClientRects().length;
        p.style.inlineSize = '';
        return result;
      }, id);
      expect(labelBaseline, id).toBeCloseTo(textBaseline, 0);
      expect(lines, id).toBe(1);
    }
    // The mark is centred on the label's line even when it is the taller of the two.
    const big = await box(icon(page, 'inline-large-icon'));
    const beside = await box(label(page, 'inline-large-icon'));
    expect(big.height).toBeCloseTo(28, 1);
    expect(big.y + big.height / 2).toBeCloseTo(beside.y + beside.height / 2, 0);
    await host(page, 'inline-large-icon').evaluate((el) => (el as HTMLElement).style.removeProperty('--tanrei-comp-tag-icon-size'));
    // Enlarged text.
    const height = await resolveToken(page, T('container-height-small'));
    const iconSize = await resolveToken(page, T('icon-size'));
    const dotSize = await resolveToken(page, T('dot-size'));
    const pad = await resolveToken(page, T('container-padding-inline-small'));
    const padIcon = await resolveToken(page, T('container-padding-inline-with-icon-small'));
    const padBlock = await resolveToken(page, T('container-padding-block-small'));
    const before = await box(container(page, 'inline-icon'));
    expect(before.height).toBeCloseTo(height, 1);
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await expect.poll(async () => (await box(container(page, 'inline-icon'))).height).toBeGreaterThan(before.height);
    const c = await box(container(page, 'inline-icon'));
    const l = await box(label(page, 'inline-icon'));
    const i = await box(icon(page, 'inline-icon'));
    expect(c.height).toBeGreaterThanOrEqual(height);
    expect(c.width).toBeGreaterThan(before.width);
    // The container still holds the whole line, with its paddings.
    expect(l.y - c.y).toBeCloseTo(padBlock, 1);
    expect(c.y + c.height - (l.y + l.height)).toBeCloseTo(padBlock, 1);
    expect(i.x - c.x).toBeCloseTo(padIcon, 1);
    expect(c.x + c.width - (l.x + l.width)).toBeCloseTo(pad, 1);
    // The glyph box and the dot do not grow with the text.
    expect(i.width).toBeCloseTo(iconSize, 1);
    expect(i.height).toBeCloseTo(iconSize, 1);
    expect((await box(dot(page, 'inline-dot'))).width).toBeCloseTo(dotSize, 1);
    // Still a pill at the height it grew to.
    expect(Number.parseFloat(await css(container(page, 'inline-icon'), 'border-top-left-radius'))).toBeGreaterThanOrEqual(c.height / 2);
  });

  test('TAG-14: in forced colors every variant draws an edge of outline.width in the text color inside its container, and its label, glyph and dot in that color, nothing resting on a fill; nothing moves', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const geometry = async () => Object.fromEntries(await Promise.all(spec.fixtures.map(async (f) => [f.id, [await box(container(page, f.id)), await box(label(page, f.id))]] as const)));
    const before = await geometry();
    const width = await resolveToken(page, T('outline-width'));
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'rgb(1, 2, 3)';
      document.body.appendChild(probe);
      const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)';
      probe.remove();
      return repainted;
    });
    test.skip(!forced, 'forced colors are not emulated by this browser');
    const [canvasText, canvas] = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'color: CanvasText; background-color: Canvas';
      document.body.appendChild(probe);
      const style = getComputedStyle(probe);
      const colors = [style.color, style.backgroundColor];
      probe.remove();
      return colors;
    });
    expect(canvasText).not.toBe(canvas);
    // A tag drawn inside something disabled takes the mode's color for disabled text instead (TAG-21).
    const grayText = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'GrayText';
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    const after = await geometry();
    for (const f of spec.fixtures) {
      const ink = f.props.disabled ? grayText : canvasText;
      // Read in one call for each tag: a page of forty tags read a property at a time outlasts a test.
      const drawn = await host(page, f.id).evaluate((el) => {
        const root = el.shadowRoot!;
        const c = getComputedStyle(root.querySelector('.container')!);
        const dotted = root.querySelector('.dot');
        const glyph = el.querySelector('[slot="icon"]');
        return {
          sides: ['top', 'right', 'bottom', 'left'].map((side) => [c.getPropertyValue(`border-${side}-style`), Number.parseFloat(c.getPropertyValue(`border-${side}-width`)), c.getPropertyValue(`border-${side}-color`)] as const),
          label: getComputedStyle(root.querySelector('.label')!).color,
          fill: c.backgroundColor,
          shadow: c.boxShadow,
          glyph: glyph ? getComputedStyle(glyph).color : null,
          dot: dotted ? getComputedStyle(dotted).backgroundColor : null,
        };
      });
      // A bounded label: a solid edge of the outline's width in CanvasText, on every side, in every variant.
      for (const [index, [style, edge, inked]] of drawn.sides.entries()) {
        expect(style, `${f.id} side ${index}`).toBe('solid');
        expect(edge, `${f.id} side ${index}`).toBeCloseTo(width, 1);
        expect(inked, `${f.id} side ${index}`).toBe(ink);
      }
      // The label in CanvasText; no look rests on its fill (the mode paints none of the fills the tokens name).
      expect(drawn.label, f.id).toBe(ink);
      expect(drawn.fill, f.id).not.toBe(ink);
      expect(drawn.shadow, f.id).toBe('none');
      if (f.slots?.icon) expect(drawn.glyph, f.id).toBe(ink);
      if (drawn.dot !== null) expect(drawn.dot, f.id).toBe(ink);
      // Inside the container: the box and the label are where they were.
      for (const part of [0, 1]) {
        for (const key of ['x', 'y', 'width', 'height'] as const) expect(after[f.id][part][key], `${f.id} ${key}`).toBeCloseTo(before[f.id][part][key], 1);
      }
    }
    // The statuses look alike now: the words carry them.
    expect(await css(dot(page, 'outlined-error'), 'background-color')).toBe(await css(dot(page, 'outlined-success'), 'background-color'));
  });

  test('TAG-15: in right-to-left the content’s order mirrors and the paddings follow the logical start and end: the glyph or the dot sits at the right of the label', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, dir: 'rtl', fixtures: spec.fixtures.filter((f) => ['icon', 'icon-small', 'dot', 'outlined-error', 'tonal'].includes(f.id)) });
    for (const [id, size, mark] of [
      ['icon', 'medium', icon(page, 'icon')],
      ['icon-small', 'small', icon(page, 'icon-small')],
      ['dot', 'medium', dot(page, 'dot')],
      ['outlined-error', 'medium', dot(page, 'outlined-error')],
    ] as const) {
      const c = await box(container(page, id));
      const m = await box(mark);
      const l = await box(label(page, id));
      // The mark at the right of the label, a gap from it.
      expect(m.x, id).toBeGreaterThan(l.x + l.width - 0.01);
      expect(m.x - (l.x + l.width), id).toBeCloseTo(await resolveToken(page, T('container-gap')), 1);
      // The start is the right: padding-inline-with-icon there, padding-inline at the left end.
      expect(c.x + c.width - (m.x + m.width), id).toBeCloseTo(await resolveToken(page, T(`container-padding-inline-with-icon-${size}`)), 1);
      expect(l.x - c.x, id).toBeCloseTo(await resolveToken(page, T(`container-padding-inline-${size}`)), 1);
    }
    // A label alone is padded alike on both sides, and the tag stands at the right of its stage.
    const c = await box(container(page, 'tonal'));
    const s = await box(stage(page, 'tonal'));
    expect(s.x + s.width - (c.x + c.width)).toBeCloseTo(16, 0);
  });

  test('TAG-16: the direction is the nearest ancestor’s, not the root’s and not a setting of the tag’s own; when it changes while the tag is shown the tag is drawn for the new direction at once, without a motion, keeping what it shows', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures.filter((f) => ['icon-rtl', 'icon'].includes(f.id)), fx('nested', { status: 'success', dot: true, label: 'Online' })] });
    const markIsRight = async (id: string, mark: Locator) => (await box(mark)).x > (await box(label(page, id))).x;
    // The document carries no dir; the fixture's stage does.
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    expect(await markIsRight('icon-rtl', icon(page, 'icon-rtl'))).toBe(true);
    expect(await markIsRight('icon', icon(page, 'icon'))).toBe(false);
    // No direction setting of its own.
    expect(await page.evaluate(() => (customElements.get('tanrei-tag') as unknown as { observedAttributes: string[] }).observedAttributes.filter((name) => /dir/.test(name)))).toEqual([]);
    expect(await host(page, 'icon-rtl').getAttribute('dir')).toBeNull();
    // The nearest ancestor wins: a left-to-right block inside a right-to-left one, across a shadow root.
    await stage(page, 'nested').evaluate((el) => {
      el.setAttribute('dir', 'rtl');
      const inner = document.createElement('div');
      inner.id = 'inner';
      inner.setAttribute('dir', 'ltr');
      const shadowHost = document.createElement('div');
      shadowHost.attachShadow({ mode: 'open' }).append(document.createElement('slot'));
      shadowHost.append(el.querySelector('tanrei-tag')!);
      inner.append(shadowHost);
      el.append(inner);
    });
    expect(await markIsRight('nested', dot(page, 'nested'))).toBe(false);
    // Changed after the first render: drawn for the new direction in the same frame, with nothing running.
    await page.evaluate(() => document.querySelector('#inner')!.setAttribute('dir', 'rtl'));
    expect(await markIsRight('nested', dot(page, 'nested'))).toBe(true);
    expect(await host(page, 'nested').evaluate((el) => el.shadowRoot!.getAnimations().length)).toBe(0);
    expect(await label(page, 'nested').textContent()).toBe('Online');
    await expect(dot(page, 'nested')).toHaveCount(1);
    await page.evaluate(() => document.querySelector('#inner')!.removeAttribute('dir'));
    expect(await markIsRight('nested', dot(page, 'nested'))).toBe(true); // the stage's rtl is now the nearest
    await stage(page, 'nested').evaluate((el) => el.setAttribute('dir', 'ltr'));
    expect(await markIsRight('nested', dot(page, 'nested'))).toBe(false);
    // And on a fixture that began right-to-left.
    await stage(page, 'icon-rtl').evaluate((el) => el.setAttribute('dir', 'ltr'));
    expect(await markIsRight('icon-rtl', icon(page, 'icon-rtl'))).toBe(false);
    expect(await transformOf(host(page, 'icon-rtl').locator('[slot="icon"]'))).toBe('none');
  });

  test('TAG-17: in right-to-left the icon helper mirrors a glyph the icon set marks, or the product forces, inside its own box, and not one the product forbids, an unmarked one, an image, or any glyph in left-to-right; the tag mirrors nothing itself and the dot is never mirrored', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        spec.fixtures.find((f) => f.id === 'icon-rtl')!,
        fx('marked', { label: 'Next' }, { slots: { icon: 'arrow_forward' }, direction: 'rtl' }),
        fx('unmarked', { label: 'Passed' }, { slots: { icon: 'check_circle' }, direction: 'rtl' }),
        fx('forbidden', { label: 'Next' }, { content: glyph('arrow_forward', 'data-mirror="never"'), direction: 'rtl' }),
        fx('forced', { label: 'Passed' }, { content: glyph('check_circle', 'data-mirror="always"'), direction: 'rtl' }),
        fx('marked-ltr', { label: 'Next' }, { slots: { icon: 'arrow_forward' }, direction: 'ltr' }),
        fx('image', { label: 'Next' }, { content: '<svg slot="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h10l-3-3M12 8l-3 3"/></svg>', direction: 'rtl' }),
        fx('dotted', { label: 'Online', dot: true, status: 'success' }, { direction: 'rtl' }),
      ],
    });
    const slotted = (id: string) => host(page, id).locator('[slot="icon"]');
    const expected: Record<string, boolean> = { 'icon-rtl': true, marked: true, unmarked: false, forbidden: false, forced: true, 'marked-ltr': false, image: false };
    for (const [id, mirrored] of Object.entries(expected)) {
      await expect.poll(() => transformOf(slotted(id)), id).toBe(mirrored ? MIRRORED : 'none');
      // The tag mirrors nothing itself: its box, its row and its container are not transformed.
      for (const part of [icon(page, id), container(page, id), host(page, id)]) expect(await transformOf(part), id).toBe('none');
      // Inside its own box, about its centre line: the glyph is where the box is, at the box's size, in the look's color.
      const glyphBox = await box(slotted(id));
      const iconBox = await box(icon(page, id));
      expect(glyphBox.x + glyphBox.width / 2, id).toBeCloseTo(iconBox.x + iconBox.width / 2, 0);
      expect(iconBox.width, id).toBeCloseTo(await resolveToken(page, T('icon-size')), 1);
      expect(await css(icon(page, id), 'color'), id).toBe(await resolveColor(page, T('tonal-icon-color')));
    }
    // The order TAG-15 gives is unchanged by the mirroring: the glyph is at the right of the label either way.
    for (const id of ['marked', 'forbidden']) expect((await box(icon(page, id))).x, id).toBeGreaterThan((await box(label(page, id))).x);
    expect((await box(icon(page, 'marked'))).x).toBeCloseTo((await box(icon(page, 'forbidden'))).x, 1);
    // The mark follows the name: a glyph renamed to an unmarked one is no longer mirrored.
    await slotted('marked').evaluate((el) => (el.textContent = 'check_circle'));
    await expect.poll(() => transformOf(slotted('marked'))).toBe('none');
    // The dot is never mirrored.
    expect(await transformOf(dot(page, 'dotted'))).toBe('none');
  });

  test('TAG-18: the label is text of its own direction, isolated: a left-to-right label keeps its order in a right-to-left layout, is still placed by the layout, and is cut at its own end — its right — never at its beginning; a right-to-left label is cut at its left', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [...spec.fixtures.filter((f) => ['long-label-rtl', 'ltr-label-rtl', 'long-label', 'icon-rtl'].includes(f.id)), fx('arabic-in-ltr', { status: 'info', dot: true, label: ARABIC_LONG }), fx('neutral-rtl', { label: '2026-10-06' }, { direction: 'rtl' })],
    });
    for (const id of ['long-label-rtl', 'ltr-label-rtl', 'long-label', 'arabic-in-ltr']) expect(await css(label(page, id), 'unicode-bidi'), id).toBe('plaintext');
    // The fixture long-label-rtl: the dot at the right (the layout's start), the label beginning with its first word at
    // its left edge, and what is lost is its right end.
    {
      const d = await box(dot(page, 'long-label-rtl'));
      const l = await box(label(page, 'long-label-rtl'));
      expect(d.x).toBeGreaterThan(l.x + l.width - 0.01);
      const e = await ends(page, 'long-label-rtl');
      expect(e.first.left).toBeCloseTo(e.left, 0);
      expect(await css(label(page, 'long-label-rtl'), 'text-overflow')).toBe('ellipsis');
      // The box that cuts it has the label's direction, so the ellipsis is drawn, and drawn at that end, in every engine.
      expect(await css(label(page, 'long-label-rtl'), 'direction')).toBe('ltr');
      expect(await css(container(page, 'long-label-rtl'), 'direction')).toBe('rtl');
      expect(await label(page, 'long-label-rtl').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
      expect(await label(page, 'long-label-rtl').textContent()).toBe(LONG);
    }
    // The same label in a left-to-right stage is cut the same way: the direction of the layout does not decide it.
    {
      const e = await ends(page, 'long-label');
      expect(e.first.left).toBeCloseTo(e.left, 0);
      expect(await label(page, 'long-label').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    }
    // A version in a right-to-left layout keeps its own order ("v2.1 beta", v first at the left), and reorders nothing
    // beside it: the dot is still at the right, the layout's start, where the label is placed after it.
    {
      const e = await ends(page, 'ltr-label-rtl');
      expect(e.first.left).toBeLessThan(e.last.left);
      expect(e.first.left).toBeCloseTo(e.left, 0);
      const d = await box(dot(page, 'ltr-label-rtl'));
      const l = await box(label(page, 'ltr-label-rtl'));
      expect(d.x).toBeGreaterThan(l.x + l.width - 0.01);
    }
    // A right-to-left label in a left-to-right layout: placed after the dot at the left, read from its right edge, and
    // cut at its left end.
    {
      const d = await box(dot(page, 'arabic-in-ltr'));
      const l = await box(label(page, 'arabic-in-ltr'));
      expect(d.x + d.width).toBeLessThanOrEqual(l.x);
      const e = await ends(page, 'arabic-in-ltr');
      expect(e.first.right).toBeCloseTo(e.right, 0);
      expect(await css(label(page, 'arabic-in-ltr'), 'direction')).toBe('rtl');
      expect(await label(page, 'arabic-in-ltr').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    }
    // A label with no strong character takes the layout direction, and a date keeps its order.
    {
      const e = await ends(page, 'neutral-rtl');
      expect(e.first.left).toBeLessThan(e.last.left);
      expect(await label(page, 'neutral-rtl').getAttribute('dir')).toBeNull();
      expect(await css(label(page, 'neutral-rtl'), 'direction')).toBe('rtl');
    }
    // The Arabic label of icon-rtl is right-to-left text in a right-to-left layout: its first letter at its right edge.
    {
      const e = await ends(page, 'icon-rtl');
      expect(e.first.right).toBeCloseTo(e.right, 0);
    }
  });

  test('TAG-19: a variant or size the active design system does not have, and a status this spec does not have, render as the default (tonal, medium, default) and are reported in debug builds', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fx('reference', { label: 'Draft', dot: true }),
        fx('unknown-variant', { variant: 'loud', label: 'Draft', dot: true }),
        fx('unknown-size', { size: 'huge', label: 'Draft', dot: true }),
        fx('unknown-status', { status: 'urgent', statusLabel: 'Urgent', label: 'Draft', dot: true }),
        fx('not-a-name', { variant: 'Not A Name!', size: '9 lives', label: 'Draft', dot: true }),
        fx('unknown-status-outlined', { variant: 'outlined', status: 'urgent', label: 'Draft' }),
      ],
    });
    const reference = { paint: await painted(page, 'reference'), c: await box(container(page, 'reference')), font: await css(label(page, 'reference'), 'font-size') };
    expect(reference.paint).toEqual(await look(page, 'tonal'));
    expect(reference.c.height).toBeCloseTo(await resolveToken(page, T('container-height-medium')), 1);
    for (const id of ['unknown-variant', 'unknown-size', 'unknown-status', 'not-a-name']) {
      expect(await painted(page, id), id).toEqual(reference.paint);
      const c = await box(container(page, id));
      expect(c.height, id).toBeCloseTo(reference.c.height, 1);
      expect(c.width, id).toBeCloseTo(reference.c.width, 1);
      expect(await css(label(page, id), 'font-size'), id).toBe(reference.font);
      expect(await css(container(page, id), 'box-shadow'), id).toBe('none');
    }
    // A status this spec does not have is status default in every way: no words are read, and an outlined tag gains no dot.
    await expect(host(page, 'unknown-status').locator('.status')).toHaveCount(0);
    await expect(dot(page, 'unknown-status-outlined')).toHaveCount(0);
    expect(await css(label(page, 'unknown-status-outlined'), 'color')).toBe(await resolveColor(page, T('outlined-label-color')));
    await expect.poll(() => seen.join('\n')).toMatch(/variant "loud" is not a value of the active design system; it is drawn as "tonal" \(TAG-19\)/);
    const all = seen.join('\n');
    expect(all).toMatch(/size "huge" is not a value of the active design system; it is drawn as "medium" \(TAG-19\)/);
    expect(all).toMatch(/status "urgent" is not a status of a tag; it is drawn as "default" \(TAG-19\)/);
    expect(all).toMatch(/variant "Not A Name!" .* \(TAG-19\)/);
    expect(all).toMatch(/size "9 lives" .* \(TAG-19\)/);
    // The core values report nothing.
    expect(all).not.toMatch(/"tonal" is not|"medium" is not|"default" is not/);
  });

  test('TAG-20: a tag with no label draws nothing, takes no space and exposes nothing — a glyph or a dot alone is not a tag — and is reported; statusLabel while status is default is ignored and reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fx('empty', {}),
        fx('empty-marks', { dot: true, status: 'error', statusLabel: 'Error', variant: 'outlined' }, { slots: { icon: 'error' } }),
        fx('blank', { label: '   ' }),
        fx('ignored', { statusLabel: 'Error', label: '3 builds' }),
        fx('fine', { status: 'error', statusLabel: 'Error', label: '3 builds' }),
      ],
    });
    for (const id of ['empty', 'empty-marks', 'blank']) {
      // Nothing drawn, no box at all, nothing in the accessibility tree.
      await expect(container(page, id), id).toHaveCount(0);
      expect(await host(page, id).boundingBox(), id).toBeNull();
      expect(await css(host(page, id), 'display'), id).toBe('none');
      expect(await stage(page, id).ariaSnapshot(), id).toBe('');
      expect(await host(page, id).evaluate((el) => el.shadowRoot!.textContent!.trim()), id).toBe('');
    }
    // No space: the stage of an empty tag is only its own padding.
    const s = await box(stage(page, 'empty'));
    expect(s.height).toBeCloseTo(32, 0);
    // In a row with a gap it leaves no gap behind either.
    const gapped = await page.evaluate(async () => {
      const row = document.createElement('div');
      row.style.cssText = 'display:inline-flex;gap:8px';
      row.innerHTML = '<tanrei-tag label="One"></tanrei-tag><tanrei-tag></tanrei-tag>';
      document.body.append(row);
      for (const tag of row.children) await (tag as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      const [one, two] = [row.getBoundingClientRect().width, row.firstElementChild!.getBoundingClientRect().width];
      row.remove();
      return one - two;
    });
    expect(gapped).toBeCloseTo(0, 1);
    // A label given later draws the tag, with the glyph that was waiting (and no dot in its place).
    await host(page, 'empty-marks').evaluate((el) => el.setAttribute('label', 'Failed'));
    await expect(container(page, 'empty-marks')).toBeVisible();
    await expect(icon(page, 'empty-marks')).toBeVisible();
    await expect(dot(page, 'empty-marks')).toHaveCount(0);
    expect(await stage(page, 'empty-marks').ariaSnapshot()).toMatch(/Error,\s+Failed/);
    // And taken away again, it is gone again.
    await host(page, 'empty-marks').evaluate((el) => el.removeAttribute('label'));
    await expect(container(page, 'empty-marks')).toHaveCount(0);
    expect(await host(page, 'empty-marks').boundingBox()).toBeNull();
    // statusLabel while status is default: not read, not drawn, reported.
    await expect(host(page, 'ignored').locator('.status')).toHaveCount(0);
    expect(await stage(page, 'ignored').ariaSnapshot()).toBe('- text: 3 builds');
    await expect.poll(() => seen.join('\n')).toMatch(/label is empty, so the tag draws nothing; a glyph or a dot alone is not a tag \(TAG-20\)/);
    const all = seen.join('\n');
    expect(all).toMatch(/statusLabel "Error" is ignored while status is default.* \(TAG-20\)/);
    // Four empty tags (three fixtures and the one in the row) and one ignored statusLabel: the tag with a label and a
    // status reports nothing.
    expect(seen.filter((line) => line.includes('TAG-20')).length).toBe(5);
  });

  test('TAG-21: disabled draws the tag as part of something disabled — its fill, label, glyph and dot from its look’s disabled tokens, in every look and every status, an outlined one with no fill and its edge kept — and changes nothing else: the same size and place, no focus, no input and no disabled state exposed', async ({ page }) => {
    const looks = VARIANTS.flatMap((variant) => ['', ...STATUSES].map((status) => ({ variant, status })));
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: looks.flatMap(({ variant, status }) => {
        const id = `${variant}${status ? `-${status}` : ''}`;
        const props = { variant, label: 'Archived', dot: true, ...(status ? { status } : {}) };
        return [fx(`${id}-on`, props), fx(`${id}-off`, { ...props, disabled: true })];
      }),
    });
    const sheet = (name: string) => resolveColor(page, name);
    const [fill, content] = [
      await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.backgroundColor = 'color-mix(in srgb, var(--tanrei-sys-color-on-surface) calc(var(--tanrei-sys-state-disabled-container-opacity) * 100%), transparent)';
        document.body.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      }),
      await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.color = 'color-mix(in srgb, var(--tanrei-sys-color-on-surface) calc(var(--tanrei-sys-state-disabled-content-opacity) * 100%), transparent)';
        document.body.appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }),
    ];
    for (const { variant, status } of looks) {
      const id = `${variant}${status ? `-${status}` : ''}`;
      const name = `${variant}-disabled${status ? `-${status}` : ''}`;
      // From its own disabled tokens…
      expect(await painted(page, `${id}-off`), id).toEqual({
        container: await sheet(T(`${name}-container-color`)),
        label: await sheet(T(`${name}-label-color`)),
        mark: await sheet(T(`${name}-icon-color`)),
      });
      // …which under the default system are on-surface at the disabled opacities, an outlined look keeping no fill.
      expect(await css(label(page, `${id}-off`), 'color'), id).toBe(content);
      expect(await css(dot(page, `${id}-off`), 'background-color'), id).toBe(content);
      if (variant === 'outlined') {
        expect(await css(container(page, `${id}-off`), 'background-color'), id).toBe(await css(container(page, `${id}-on`), 'background-color'));
        expect(await css(container(page, `${id}-off`), 'box-shadow'), id).toBe(await css(container(page, `${id}-on`), 'box-shadow'));
      } else {
        expect(await css(container(page, `${id}-off`), 'background-color'), id).toBe(fill);
      }
      // Nothing else changes: the same box.
      const [on, off] = [await box(container(page, `${id}-on`)), await box(container(page, `${id}-off`))];
      expect([off.width, off.height], id).toEqual([on.width, on.height]);
    }
    // Not a control: no focus, no tab stop, no disabled state of its own, and a press passes through to what holds it.
    const one = host(page, 'tonal-off');
    expect(await one.evaluate((el) => [el.getAttribute('aria-disabled'), el.hasAttribute('inert'), el.tabIndex, (el as HTMLElement & { disabled: boolean }).disabled])).toEqual([null, false, -1, true]);
    expect(await stage(page, 'tonal-off').ariaSnapshot()).toBe('- text: Archived');
    await expect(page.locator(':focus')).toHaveCount(0);
    await tab(page);
    await expect(page.locator(`${TAG}:focus, ${TAG} :focus`)).toHaveCount(0);
    // Set and taken off, it repaints at once.
    await one.evaluate(async (el: HTMLElement & { disabled: boolean; updateComplete: Promise<unknown> }) => {
      el.disabled = false;
      await el.updateComplete;
    });
    expect(await painted(page, 'tonal-off')).toEqual(await painted(page, 'tonal-on'));
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      // A tag drawn as disabled stands inside something disabled (TAG-21), which says so to assistive technology and
      // whose text is exempt from contrast: its stage says it as that element would.
      for (const f of spec.fixtures.filter((each) => each.props.disabled)) await stage(page, f.id).evaluate((el) => el.setAttribute('aria-disabled', 'true'));
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
    }
  });

  test('every fixture reads its label, and only the status-label fixture reads more', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      const read = await stage(page, f.id).ariaSnapshot();
      if (f.props.statusLabel) expect(read, f.id).toMatch(new RegExp(`^- text: ${String(f.props.statusLabel)},\\s+${String(f.props.label)}$`));
      else expect(read.replace(/^- text: "?|"?$/g, ''), f.id).toBe(String(f.props.label));
    }
  });

  test('a set of tags is the product’s list: the tags add no list role and no grouping of their own', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [fx('one', { label: 'Design' })] });
    await stage(page, 'one').evaluate((el) => {
      el.innerHTML = '<ul aria-label="Categories"><li><tanrei-tag label="Design"></tanrei-tag></li><li><tanrei-tag label="Research"></tanrei-tag></li></ul>';
    });
    await expect(page.getByRole('list', { name: 'Categories' }).getByRole('listitem')).toHaveCount(2);
    await expect(page.getByRole('listitem').first()).toHaveText('Design');
    await expect(page.getByRole('list')).toHaveCount(1);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('every fixture draws its label, its look and its mark as the spec gives them', async ({ page }) => {
    expect(spec.fixtures.length).toBe(43);
    for (const f of spec.fixtures) {
      const variant = String(f.props.variant ?? 'tonal');
      const status = String(f.props.status ?? 'default');
      const size = String(f.props.size ?? 'medium');
      // TAG-21: a disabled fixture's look is its variant's disabled tokens.
      const drawn = f.props.disabled ? `${variant}-disabled` : variant;
      expect(await label(page, f.id).textContent(), f.id).toBe(String(f.props.label));
      expect(await painted(page, f.id), f.id).toEqual(await look(page, status === 'default' ? drawn : `${drawn}-${status}`));
      // A fixture cut by the stage is still one line of its size's height.
      expect((await box(container(page, f.id))).height, f.id).toBeCloseTo(await resolveToken(page, T(`container-height-${size}`)), 1);
      const glyphGiven = !!f.slots?.icon;
      const dotDrawn = !glyphGiven && (f.props.dot === true || (variant === 'outlined' && status !== 'default'));
      if (glyphGiven) await expect(icon(page, f.id), f.id).toBeVisible();
      else await expect(icon(page, f.id), f.id).toBeHidden();
      await expect(dot(page, f.id), f.id).toHaveCount(dotDrawn ? 1 : 0);
      // A glyph is drawn as a glyph: one ligature in its box, not its name spelled out.
      if (glyphGiven) expect(await host(page, f.id).locator('[slot="icon"]').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), f.id).toBe(true);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
