// <tanrei-callout>, driven by specs/callout.spec.json: every behaviour id (CLO-1…31) is cited by a test title, every
// fixture has a baseline, and every length and color is read back from the tokens — never from a number written here.
// CLO-32: the product's ARIA on the host is tested with every other host's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, iconFaceArrives, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, withoutIconFont, rootTokens } from '../../../test/harness.js';
import { motionEnded } from '../../../test/motions.js';

const spec = loadSpec('callout');
type P = Page;
const TAG = 'tanrei-callout';
const VARIANTS = ['tonal', 'outlined'] as const;
const STATUSES = ['info', 'warning', 'error', 'success'] as const;
const FORMS = ['default', ...STATUSES] as const;
const GLYPHS: Record<(typeof STATUSES)[number], string> = { info: 'info', warning: 'warning', error: 'error', success: 'check_circle' };
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = (file: string) => fs.readFileSync(path.join(pkg, 'dist', file), 'utf8');

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
/**
 * A part of the callout's own shadow root. A Button in the actions slot has parts of the same class names in its own
 * shadow root, so each is named with its parent in the callout's.
 */
const OWN: Record<string, string> = {
  '.container': '.container:has(> .lead)',
  '.lead': '.container > .lead',
  '.icon': '.lead > .icon',
  '.ink': '.lead > .icon > .ink',
  '.icon .ink': '.lead > .icon > .ink',
  '.text': '.container > .text',
  '.status-label': '.text > .status-label',
  '.title': '.text > .title',
  '.headline': '.text > .title > .headline',
  '.body': '.text > .body',
  '.body slot': '.text > .body > slot',
  '.actions': '.text > .actions',
  '.end': '.container > .end',
  '.close': '.end > tanrei-button.close',
};
const part = (page: P, id: string, selector: string) => host(page, id).locator(OWN[selector] ?? selector);
const container = (page: P, id: string) => part(page, id, '.container');
/** The close button: a Tanrei Button in the callout's shadow root, and the container its own shadow root draws. */
const close = (page: P, id: string) => part(page, id, '.close');
const closeBox = (page: P, id: string) => close(page, id).locator('[part="container"]');
/** Button's small size, which the close button keeps (CLO-10). */
const SMALL = '--tanrei-comp-button-container-height-small';
const T = (name: string) => `--tanrei-comp-callout-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
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
const fx = (id: string, props: Fixture['props'], content?: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, ...(content === undefined ? {} : { content }), ...extra });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const mountSpec = (page: P, ...ids: string[]) => mount(page, ids.length ? spec.fixtures.filter((f) => ids.includes(f.id)) : spec.fixtures);
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);

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
/** A computed color of an element, drawn the same way. */
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
/** A color expression as the page computes it, as a background (the serialization a computed background-color has). */
const computed = (page: P, expression: string) =>
  page.evaluate((e) => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden';
    probe.style.backgroundColor = e;
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, expression);
/** BTN-45: the tone's color at an opacity, and laid over a color at a state's layer opacity. */
const toneAt = (tone: string, opacity: string) => `color-mix(in srgb, ${tone} calc(var(${opacity}) * 100%), transparent)`;
const toneOver = (base: string, tone: string, state: 'hover' | 'focus' | 'pressed') => `color-mix(in srgb, ${base}, ${tone} calc(var(--tanrei-sys-state-${state}-state-layer-opacity) * 100%))`;
/** A part's token in a form: `info-body-color-tonal`, or `body-color-tonal` without a status. */
const formToken = (status: string, partName: string, variant: string) => `${status === 'default' ? '' : `${status}-`}${partName}-color-${variant}`;
/** The glyph's color as drawn: its form's icon color at icon.opacity. */
const iconColor = (page: P, status: string, variant: string) => colorOf(page, `color-mix(in srgb, var(${T(formToken(status, 'icon', variant))}) calc(var(${T('icon-opacity')}) * 100%), transparent)`);
/** What a text role resolves to, read from a probe that is given its `font` and `letter-spacing`. */
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
/** The boxes of the lines of the text an element holds (its own text and its descendants'). */
const lines = (locator: Locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    const nodes = el instanceof HTMLSlotElement ? el.assignedNodes({ flatten: true }) : [el];
    const rects: { left: number; right: number; top: number; bottom: number }[] = [];
    for (const node of nodes) {
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) if (r.width > 0) rects.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    }
    return rects;
  });
const centre = (b: { y: number; height: number } | { top: number; bottom: number }) => ('y' in b ? b.y + b.height / 2 : (b.top + b.bottom) / 2);
/** The deepest focused element, as `tag.class` through the shadow roots it is in. */
const focused = (page: P) =>
  page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active ? `${active.localName}${active.id ? `#${active.id}` : ''}${active.classList.length ? `.${[...active.classList].join('.')}` : ''}` : '';
  });
/** Counts `dismiss` on the page, from now on. */
const countDismiss = (page: P) =>
  page.evaluate(() => {
    (window as unknown as { __dismissed: number }).__dismissed = 0;
    document.addEventListener('dismiss', () => (window as unknown as { __dismissed: number }).__dismissed++);
  });
const dismissed = (page: P) => page.evaluate(() => (window as unknown as { __dismissed: number }).__dismissed);
const announced = (page: P, id: string) =>
  host(page, id).evaluate((el) => ({
    polite: el.shadowRoot!.querySelector('.announce[aria-live="polite"]')!.textContent ?? '',
    assertive: el.shadowRoot!.querySelector('.announce[aria-live="assertive"]')!.textContent ?? '',
  }));
const prose = (blocks: string, size = '') => `<div class="tanrei-prose" data-measure="false"${size ? ` data-size="${size}"` : ''}>${blocks}</div>`;
const withProse = (page: P) => page.addStyleTag({ content: dist('prose.css') });

test.describe('behavior', () => {
  test('CLO-1: a container as wide as its place and as tall as its content, its corners by the shared rule and no elevation; the paddings, the glyph, the text and the close button from the start, the glyph and the close button centred on the first line, extra height below the content', async ({
    page,
  }) => {
    await mount(page, [
      fx('one', {}, 'One line.'),
      fx('status', { status: 'info', statusLabel: 'Information' }, 'One line.'),
      ...spec.fixtures.filter((f) => ['long-title', 'long-body', 'closable'].includes(f.id)),
    ]);
    const [padBlock, padInline, padClose, gap, iconSize, iconGap] = await Promise.all(
      ['container-padding-block', 'container-padding-inline', 'container-padding-inline-end-with-close', 'container-gap', 'icon-size', 'icon-gap'].map((n) => token(page, n)),
    );
    const small = await resolveToken(page, SMALL);
    const body = await role(page, 'body-typescale-medium');
    // CLO-1's verify: one line of body text — the paddings and one line; the text at the start padding.
    const one = await box(host(page, 'one'));
    near(one.height, 2 * padBlock + Number.parseFloat(body.lineHeight), 'one line');
    near(one.width, (await box(stage(page, 'one'))).width - 32, 'as wide as its place');
    near((await lines(part(page, 'one', '.body slot')))[0].left, one.x + padInline, 'the text at the start padding');
    expect(await css(container(page, 'one'), 'box-shadow')).toBe('none');
    // The corners: the shared rule, from the callout's shape token.
    expect(await container(page, 'one').getAttribute('data-tanrei-shape')).not.toBeNull();
    expect((await css(container(page, 'one'), '--tanrei-corner-radius')).trim()).toBe((await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), T('container-shape'))).trim());
    expect(Number.parseFloat(await css(container(page, 'one'), 'border-top-left-radius'))).toBeGreaterThan(0);
    // With a status: the glyph at the start padding, icon.size wide, the text icon.gap after it; the same height.
    const status = await box(host(page, 'status'));
    const glyph = await box(part(page, 'status', '.icon'));
    near(glyph.x, status.x + padInline, 'the glyph at the start padding');
    near(glyph.width, iconSize, 'icon.size');
    near(glyph.height, iconSize, 'icon.size');
    near((await lines(part(page, 'status', '.body slot')))[0].left, glyph.x + glyph.width + iconGap, 'the text after icon.gap');
    near(status.height, one.height, 'a glyph does not make the row taller');
    // The close button: container.gap after the column, the nearer padding after it.
    const closable = await box(host(page, 'closable'));
    const button = await box(close(page, 'closable'));
    near(button.x + button.width, closable.x + closable.width - padClose, 'the end padding after the close button');
    near((await box(part(page, 'closable', '.text'))).x + (await box(part(page, 'closable', '.text'))).width, button.x - gap, 'container.gap before the close button');
    near(button.height, small, 'the small Button');
    near(closable.height, one.height, 'a close button does not make the row taller');
    // However tall the text grows, the glyph and the close button stay centred on its first line.
    const first = (await lines(part(page, 'long-title', '.headline')))[0];
    expect((await lines(part(page, 'long-title', '.headline'))).length).toBeGreaterThan(2);
    near(centre(await box(part(page, 'long-title', '.icon'))), centre(first), 'the glyph on the first line', 1);
    near(centre(await box(close(page, 'long-title'))), centre(first), 'the close button on the first line', 1);
    near(centre(await box(part(page, 'long-body', '.icon'))), centre((await lines(part(page, 'long-body', '.headline')))[0]), 'the glyph on the title’s line', 1);
    near(centre(await box(part(page, 'status', '.icon'))), centre((await lines(part(page, 'status', '.body slot')))[0]), 'the glyph on the body’s line', 1);
    // Any height beyond the content lies below it.
    const parts = [['icon', part(page, 'long-title', '.icon')], ['text', part(page, 'long-title', '.text')], ['close', close(page, 'long-title')]] as const;
    const fromTop = async (locator: Locator) => (await box(locator)).y - (await box(host(page, 'long-title'))).y;
    const before = Object.fromEntries(await Promise.all(parts.map(async ([name, locator]) => [name, await fromTop(locator)] as const)));
    await page.addStyleTag({ content: `${TAG}::part(container) { min-block-size: 400px; }` });
    near((await box(host(page, 'long-title'))).height, 400, 'the taller container');
    for (const [name, locator] of parts) near(await fromTop(locator), before[name], `${name} stays at the top`);
  });

  test('CLO-2: with no status each variant fills its container and draws its title, its body and a glyph the product gave from that variant’s own tokens', async ({ page }) => {
    await mount(page, VARIANTS.map((variant) => fx(variant, { variant, title: 'Tip' }, 'Keep an action enabled.', { slots: { icon: 'lightbulb' } })));
    for (const variant of VARIANTS) {
      sameColor(await painted(container(page, variant), 'background-color'), await tokenColor(page, `container-color-${variant}`), `${variant} container`);
      sameColor(await painted(part(page, variant, '.headline'), 'color'), await tokenColor(page, `title-color-${variant}`), `${variant} title`);
      sameColor(await painted(part(page, variant, '.body'), 'color'), await tokenColor(page, `body-color-${variant}`), `${variant} body`);
      sameColor(await painted(part(page, variant, '.icon'), 'color'), await iconColor(page, 'default', variant), `${variant} glyph`);
    }
    // The two looks differ: the tonal fill is a color, the outlined look has none.
    expect((await painted(container(page, 'tonal'), 'background-color'))[3]).toBe(255);
    expect((await painted(container(page, 'outlined'), 'background-color'))[3]).toBe(0);
  });

  test('CLO-3: a status draws the container, the title, the body and the glyph from its variant’s parts of that status — colors, the glyph and nothing else: the size, shape, layout and edge stay', async ({ page }) => {
    const forms = VARIANTS.flatMap((variant) => STATUSES.map((status) => ({ variant, status, id: `${variant}-${status}` })));
    await mount(page, [
      ...forms.map(({ variant, status, id }) => fx(id, { variant, status, title: 'A title' }, 'The body of the notice.')),
      ...VARIANTS.map((variant) => fx(`${variant}-none`, { variant, title: 'A title' }, 'The body of the notice.', { slots: { icon: 'lightbulb' } })),
    ]);
    for (const { variant, status, id } of forms) {
      sameColor(await painted(container(page, id), 'background-color'), await tokenColor(page, formToken(status, 'container', variant)), `${id} container`);
      sameColor(await painted(part(page, id, '.headline'), 'color'), await tokenColor(page, formToken(status, 'title', variant)), `${id} title`);
      sameColor(await painted(part(page, id, '.body'), 'color'), await tokenColor(page, formToken(status, 'body', variant)), `${id} body`);
      sameColor(await painted(part(page, id, '.icon'), 'color'), await iconColor(page, status, variant), `${id} glyph`);
    }
    // The four tonal fills are four colors, and none is the fill without a status.
    const fills = await Promise.all(['none', ...STATUSES].map(async (s) => (await painted(container(page, `tonal-${s}`), 'background-color')).join(',')));
    expect(new Set(fills).size).toBe(5);
    // Nothing else changes: the box, the place of the glyph and of the text, the corners, the edge.
    for (const variant of VARIANTS) {
      const geometry = async (id: string) => {
        const h = await box(host(page, id));
        const rel = async (selector: string) => {
          const b = await box(part(page, id, selector));
          return [b.x - h.x, b.y - h.y, b.width, b.height].map((v) => Math.round(v * 2) / 2);
        };
        return { size: [h.width, h.height], icon: await rel('.icon'), title: await rel('.title'), body: await rel('.body'), radius: await css(container(page, id), 'border-top-left-radius'), edge: await css(container(page, id), 'box-shadow') };
      };
      const none = await geometry(`${variant}-none`);
      for (const status of STATUSES) expect(await geometry(`${variant}-${status}`), `${variant} ${status}`).toEqual(none);
    }
  });

  test('CLO-4: the outlined look draws one hairline inside its container, the same in every status and without changing the callout’s size or its content’s place; tonal draws no edge', async ({ page }) => {
    await mount(page, [...FORMS.map((status) => fx(`outlined-${status}`, { variant: 'outlined', status, title: 'A title' }, 'The body.')), fx('tonal', { status: 'info', title: 'A title' }, 'The body.'), fx('outlined', { variant: 'outlined', status: 'info', title: 'A title' }, 'The body.')]);
    const width = await token(page, 'outline-width');
    const color = await tokenColor(page, 'outline-color');
    const edges = new Set<string>();
    for (const status of FORMS) {
      const shadow = await css(container(page, `outlined-${status}`), 'box-shadow');
      edges.add(shadow);
      expect(shadow, status).toContain('inset');
      expect(shadow, status).toMatch(new RegExp(`0px 0px 0px ${width}px`));
      // The edge's color is the one hairline's, whatever the status.
      sameColor(await colorOf(page, shadow.replace(/ ?(-?[\d.]+px ?){4}/, '').replace('inset', '').trim()), color, `${status} edge`);
      expect(await css(container(page, `outlined-${status}`), 'border-top-width')).toBe('0px');
    }
    expect(edges.size).toBe(1);
    expect(await css(container(page, 'tonal'), 'box-shadow')).toBe('none');
    // Inside the container's size: the outlined callout is the tonal one's box, its content in the same place.
    const [t, o] = [await box(host(page, 'tonal')), await box(host(page, 'outlined'))];
    expect([o.width, o.height]).toEqual([t.width, t.height]);
    near((await box(part(page, 'outlined', '.body'))).x - o.x, (await box(part(page, 'tonal', '.body'))).x - t.x, 'the body’s place');
    near((await box(part(page, 'outlined', '.body'))).y - o.y, (await box(part(page, 'tonal', '.body'))).y - t.y, 'the body’s place');
  });

  test('CLO-5: a status with an empty icon slot draws that status’s glyph — the snackbar’s — in a box of icon.size, in its form’s icon color at icon.opacity of the glyph alone, in the icon set’s unselected family; it keeps 3:1, is hidden from assistive technology; no status, no glyph and no room for one', async ({
    page,
  }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { icons: true, theme });
      const size = await token(page, 'icon-size');
      const family = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-icon-family-unselected'))).replaceAll('"', '').trim();
      const surface = await colorOf(page, 'var(--tanrei-sys-color-surface)');
      for (const variant of VARIANTS) {
        for (const status of STATUSES) {
          const id = `${variant}-${status}`;
          const icon = part(page, id, '.icon');
          expect(await icon.locator('.ink').textContent(), id).toBe(GLYPHS[status]);
          const b = await box(icon);
          near(b.width, size, `${id} box`);
          near(b.height, size, `${id} box`);
          expect((await css(icon, 'font-family')).replaceAll('"', ''), id).toContain(family);
          expect(await css(icon, 'opacity'), `${id}: the opacity is the glyph’s color’s, not the element’s`).toBe('1');
          expect(await css(container(page, id), 'opacity')).toBe('1');
          const drawn = await painted(icon, 'color');
          sameColor(drawn, await iconColor(page, status, variant), `${id} glyph`);
          expect(drawn[3], `${id}: drawn at icon.opacity`).toBeLessThan(255);
          // 3:1 as drawn: the glyph's color at its opacity over its container (the surface, in the outlined look).
          const under = variant === 'tonal' ? await painted(container(page, id), 'background-color') : surface;
          const mixed = drawn.slice(0, 3).map((c, i) => (c * drawn[3] + under[i] * (255 - drawn[3])) / 255);
          const luminance = (rgb: number[]) => {
            const [r, g, bl] = rgb.map((c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4));
            return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
          };
          const [l1, l2] = [luminance(mixed), luminance(under)].sort((a, c) => c - a);
          expect((l1 + 0.05) / (l2 + 0.05), `${theme} ${id}: 3:1`).toBeGreaterThanOrEqual(3);
          expect(await part(page, id, '.lead').getAttribute('aria-hidden')).toBe('true');
        }
      }
      // Without a status: no glyph, no room — the text starts at the start padding.
      for (const id of ['tonal', 'outlined']) {
        await expect(part(page, id, '.lead')).toBeHidden();
        expect(await part(page, id, '.ink').count()).toBe(0);
        near((await lines(part(page, id, '.body slot')))[0].left, (await box(host(page, id))).x + (await token(page, 'container-padding-inline')), `${id}: the text at the start padding`);
      }
    }
  });

  test('CLO-6: a glyph in the icon slot is drawn in the status glyph’s place, box, color and opacity, in every status and without one; no status glyph is drawn beside it, and it is hidden from assistive technology', async ({ page }) => {
    await mountSpec(page, 'icon', 'icon-outlined', 'icon-info', 'title-info');
    const size = await token(page, 'icon-size');
    for (const [id, status, variant] of [['icon', 'default', 'tonal'], ['icon-outlined', 'default', 'outlined'], ['icon-info', 'info', 'tonal']] as const) {
      const icon = part(page, id, '.icon');
      expect(await icon.locator('.ink').count(), `${id}: no status glyph`).toBe(0);
      const slotted = host(page, id).locator('> [slot="icon"]');
      const [b, s] = [await box(icon), await box(slotted)];
      near(b.width, size, id);
      near(b.height, size, id);
      expect(s.x).toBeGreaterThanOrEqual(b.x - 0.5);
      expect(s.x + s.width).toBeLessThanOrEqual(b.x + b.width + 0.5);
      sameColor(await painted(slotted, 'color'), await iconColor(page, status, variant), `${id} glyph`);
      expect(await part(page, id, '.lead').getAttribute('aria-hidden')).toBe('true');
    }
    // The same place as the status glyph's.
    const [own, product] = [await box(part(page, 'title-info', '.icon')), await box(part(page, 'icon-info', '.icon'))];
    near(product.x - (await box(host(page, 'icon-info'))).x, own.x - (await box(host(page, 'title-info'))).x, 'the same place');
    // A glyph given later takes the status glyph's place; taken away, the status glyph is back.
    await host(page, 'title-info').evaluate((el) => el.insertAdjacentHTML('beforeend', '<span slot="icon">science</span>'));
    await expect(part(page, 'title-info', '.ink')).toHaveCount(0);
    await host(page, 'title-info').evaluate((el) => el.querySelector('[slot="icon"]')!.remove());
    await expect(part(page, 'title-info', '.icon .ink')).toHaveText('info');
  });

  test('CLO-7: the title is drawn above the body in the text style of its size and the title color of its form, title.gap above the body, wrapped and never cut; content in the title slot takes its place and keeps its role and level; a title given as text is never a heading; with neither, the body is on the first line', async ({
    page,
  }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['title', 'large-title-info', 'long-title', 'tonal', 'title-slot', 'title-only'].includes(f.id)),
      fx('h2', { status: 'info' }, '<h2 slot="title">A heading of level two</h2>The body.'),
      fx('h4', { status: 'info' }, '<h4 slot="title">A heading of level four</h4>The body.'),
      fx('both', { title: 'The prop' }, '<p slot="title">The slot</p>The body.'),
    ]);
    const gap = await token(page, 'title-gap');
    for (const [id, size] of [['title', 'medium'], ['large-title-info', 'large']] as const) {
      expect(await textStyle(part(page, id, '.headline')), id).toEqual(await role(page, `title-typescale-${size}`));
      near((await box(part(page, id, '.body'))).y - ((await box(part(page, id, '.title'))).y + (await box(part(page, id, '.title'))).height), gap, `${id}: title.gap`);
    }
    // It wraps and is never cut.
    const long = part(page, 'long-title', '.headline');
    expect((await lines(long)).length).toBeGreaterThan(2);
    expect(await css(long, 'text-overflow')).toBe('clip');
    expect(await css(part(page, 'long-title', '.title'), 'overflow-x')).toBe('visible');
    expect(await long.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    // A title given as text is plain text: no heading anywhere in these fixtures but the two the product gave.
    expect(await page.getByRole('heading').count()).toBe(2);
    // The verify: headings of level 2 and 4, both drawn in the title's style, both keeping their level.
    const medium = await role(page, 'title-typescale-medium');
    for (const [id, level, name] of [['h2', 2, 'A heading of level two'], ['h4', 4, 'A heading of level four']] as const) {
      const heading = page.getByRole('heading', { level, name });
      await expect(heading).toHaveCount(1);
      expect(await textStyle(heading), id).toEqual(medium);
      expect(await heading.evaluate((el) => [getComputedStyle(el).marginTop, getComputedStyle(el).marginBottom]), id).toEqual(['0px', '0px']);
      sameColor(await painted(heading, 'color'), await tokenColor(page, 'info-title-color-tonal'), `${id} color`);
      near((await box(part(page, id, '.body'))).y - ((await box(heading)).y + (await box(heading)).height), gap, `${id}: title.gap`);
    }
    // The slot in place of the prop.
    expect(await part(page, 'both', '.headline').count()).toBe(0);
    await expect(host(page, 'both').locator('> [slot="title"]')).toBeVisible();
    expect(await textStyle(host(page, 'title-slot').locator('> [slot="title"]'))).toEqual(medium);
    // Neither: the body alone, on the first line.
    await expect(part(page, 'tonal', '.title')).toBeHidden();
    near((await box(part(page, 'tonal', '.body'))).y, (await box(host(page, 'tonal'))).y + (await token(page, 'container-padding-block')), 'the body on the first line');
    // A title with no body: the container's bottom padding follows it.
    const only = await box(host(page, 'title-only'));
    near(only.height, 2 * (await token(page, 'container-padding-block')) + Number.parseFloat(medium.lineHeight), 'a title alone');
  });

  test('CLO-8: the body is the default slot’s content in the text style of its size and the body color of its form, wrapped and never cut; long-form blocks are prose of the callout’s size with no measure and no space before the first or after the last; nothing inside a component is styled; a link is underlined', async ({
    page,
  }) => {
    const blocks = '<p id="a">The first paragraph of the body.</p><p id="b">A second one, with <a id="link" href="#x">a link</a>.</p><ul id="list"><li>One point</li><li>Another</li></ul><p id="c">Run <code>pnpm generate</code> to see it.</p>';
    await mount(page, [
      ...spec.fixtures.filter((f) => ['tonal', 'large', 'long-body'].includes(f.id)),
      fx('blocks', { status: 'info', statusLabel: 'Information' }, prose(blocks)),
      fx('blocks-large', { status: 'info', statusLabel: 'Information', size: 'large' }, prose(blocks.replaceAll('id="', 'id="l-'), 'large')),
      fx('wide', { status: 'info', statusLabel: 'Information' }, prose(`<p id="wide-p">${'text '.repeat(200)}</p>`)),
      fx('component', {}, 'Text <tanrei-button id="in" variant="outlined">Reload</tanrei-button>'),
    ]);
    await withProse(page);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div class="stage"><tanrei-button id="out" variant="outlined">Reload</tanrei-button></div>'));
    for (const [id, size] of [['tonal', 'medium'], ['large', 'large']] as const) {
      expect(await textStyle(part(page, id, '.body')), id).toEqual(await role(page, `body-typescale-${size}`));
      sameColor(await painted(part(page, id, '.body'), 'color'), await tokenColor(page, 'body-color-tonal'), id);
    }
    // It wraps; nothing limits its lines or cuts it.
    const long = part(page, 'long-body', '.body');
    expect((await lines(part(page, 'long-body', '.body slot'))).length).toBeGreaterThan(6);
    expect(await css(long, 'overflow-y')).toBe('visible');
    expect(await css(long, '-webkit-line-clamp')).toBe('none');
    expect(await css(long, 'max-block-size')).toBe('none');
    // The verify: the first paragraph's first line on the glyph's centre, the blocks a block gap apart, the bottom
    // padding directly after the last block.
    const gap = await resolveToken(page, '--tanrei-comp-prose-block-gap');
    const padBlock = await token(page, 'container-padding-block');
    for (const [id, prefix, size] of [['blocks', '', 'medium'], ['blocks-large', 'l-', 'large']] as const) {
      const at = (name: string) => box(page.locator(`#${prefix}${name}`));
      const h = await box(host(page, id));
      near((await at('a')).y, h.y + padBlock, `${id}: no space before the first block`);
      near(centre((await lines(page.locator(`#${prefix}a`)))[0]), centre(await box(part(page, id, '.icon'))), `${id}: the first line on the glyph’s centre`, 1);
      near((await at('b')).y - ((await at('a')).y + (await at('a')).height), gap, `${id}: a block gap`);
      near((await at('list')).y - ((await at('b')).y + (await at('b')).height), gap, `${id}: a block gap`);
      near(h.y + h.height - ((await at('c')).y + (await at('c')).height), padBlock, `${id}: no space after the last block`);
      // Prose of the callout's size: the body's text style, in the form's body color.
      expect(await textStyle(page.locator(`#${prefix}a`)), id).toEqual(await role(page, `body-typescale-${size}`));
      sameColor(await painted(page.locator(`#${prefix}a`), 'color'), await tokenColor(page, 'info-body-color-tonal'), `${id}: the form’s body color`);
    }
    // No measure of its own: a long paragraph fills the text column.
    near((await box(page.locator('#wide-p'))).width, (await box(part(page, 'wide', '.body'))).width, 'no measure');
    // A link is underlined at rest.
    expect(await page.locator('#link').evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain('underline');
    // Nothing inside a component placed in the body is styled: the callout's only rules on what the product placed are
    // the title's and the glyph's, and a Button in the body is the Button outside it.
    const slotted = await host(page, 'component').evaluate((el) => {
      const rules: string[] = [];
      const walk = (list: CSSRuleList) => {
        for (const rule of list) {
          if ('selectorText' in rule && String(rule.selectorText).includes('::slotted')) rules.push(String(rule.selectorText));
          if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
        }
      };
      for (const sheet of el.shadowRoot!.adoptedStyleSheets) walk(sheet.cssRules);
      return rules;
    });
    expect(slotted.length).toBeGreaterThan(0);
    // (The one other rule is not on the body's content: an action is limited to its line and to its own least width,
    // and nothing else of it is declared — CLO-9, CLO-23.)
    const ACTIONS = '::slotted([slot="actions"])';
    for (const selector of slotted.filter((s) => s !== ACTIONS)) expect(selector, 'only the title and the glyph').toMatch(/slot=.title.|\.icon|\.glyph/);
    expect(slotted.filter((s) => s === ACTIONS)).toHaveLength(1);
    expect(
      await host(page, 'component').evaluate((el, selector) => {
        const declared: string[] = [];
        const walk = (list: CSSRuleList) => {
          for (const rule of list) {
            if ('selectorText' in rule && rule.selectorText === selector) declared.push(...Array.from((rule as CSSStyleRule).style));
            if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
          }
        };
        for (const sheet of el.shadowRoot!.adoptedStyleSheets) walk(sheet.cssRules);
        return declared.sort();
      }, ACTIONS),
      'an action’s two limits and nothing of its look',
    ).toEqual(['max-inline-size', 'min-inline-size']);
    const [inside, outside] = [await box(page.locator('#in')), await box(page.locator('#out'))];
    expect([inside.width, inside.height]).toEqual([outside.width, outside.height]);
  });

  test('CLO-9: the actions are a row below the text, actions.gap below it, starting at the text’s start edge, item-gap apart along the row and between rows where they wrap, no label cut; the callout does not restyle them, answer their presses or close; they follow the body in the focus order, before the close button', async ({
    page,
  }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['actions', 'actions-outlined', 'title-only'].includes(f.id)),
      fx('order', { status: 'error', title: 'Three fields', closable: true, closeLabel: 'Close' }, 'Enter <a id="body-link" class="tanrei-link" href="#x">a name</a>.', { slots: { actions: ['First', 'Second'] } }),
      fx('title-actions', { title: 'A title alone' }, undefined, { slots: { actions: 'Reload' } }),
    ]);
    const [gap, itemGap] = [await token(page, 'actions-gap'), await token(page, 'actions-item-gap')];
    const actions = (id: string) => host(page, id).locator('> [slot="actions"]');
    const [first, second] = [await box(actions('actions').nth(0)), await box(actions('actions').nth(1))];
    const body = await box(part(page, 'actions', '.body'));
    near(first.y, body.y + body.height + gap, 'actions.gap below the body');
    near(first.x, body.x, 'at the text’s start edge');
    near(second.x - (first.x + first.width), itemGap, 'item-gap along the row');
    near(second.y, first.y, 'one row');
    // Below the title where there is no body.
    const title = await box(part(page, 'title-actions', '.title'));
    near((await box(actions('title-actions'))).y, title.y + title.height + gap, 'actions.gap below the title');
    // Where they do not fit they wrap, item-gap between the rows, and no label is cut.
    // (The row is made as wide as its widest action and no wider — measured, since a label is as wide as the engine
    // sets its glyphs: 240 across the stage leaves the row 144, one less than the first label and its padding where
    // each glyph is set on a whole pixel (145, Chromium on Linux), and that Button then breaks its label in two lines.)
    const width = first.width;
    const row = await box(part(page, 'actions', '.actions'));
    expect(row.width, 'both fit on one row at first').toBeGreaterThanOrEqual(second.x + second.width - first.x);
    const narrow = Number.parseFloat(await css(stage(page, 'actions'), 'inline-size')) - row.width + Math.ceil(Math.max(first.width, second.width));
    await page.addStyleTag({ content: `[data-fixture="actions"] { inline-size: ${narrow}px !important; }` });
    expect((await box(part(page, 'actions', '.actions'))).width, 'room for one action, not for two').toBeLessThan(first.width + itemGap + second.width);
    const [a, b] = [await box(actions('actions').nth(0)), await box(actions('actions').nth(1))];
    near(b.y - (a.y + a.height), itemGap, 'item-gap between rows');
    near(b.x, a.x, 'the second row starts at the text’s edge');
    near(a.width, width, 'no label is cut');
    // The callout does nothing to an action: it is the Button it is outside one, and pressing it changes nothing here.
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div class="stage"><tanrei-button id="out" variant="text">Reload</tanrei-button></div>'));
    const [inside, outside] = [await box(actions('actions-outlined')), await box(page.locator('#out'))];
    expect([inside.width, inside.height]).toEqual([outside.width, outside.height]);
    await countDismiss(page);
    await actions('order').first().click();
    expect(await host(page, 'order').evaluate((el: HTMLElement & { open: boolean }) => el.open)).toBe(true);
    await expect(host(page, 'order')).toBeVisible();
    expect(await dismissed(page)).toBe(0);
    // Reading and focus order: the body's link, the actions, then the close button.
    await page.locator('#body-link').focus();
    const order: string[] = [];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      order.push(await page.evaluate(() => {
        let active: Element | null = document.activeElement;
        const top = active;
        while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
        const own = top?.shadowRoot?.activeElement;
        return top?.localName === 'tanrei-button' ? (top.textContent ?? '').trim() : own?.classList.contains('close') ? 'close' : (active?.localName ?? '');
      }));
    }
    expect(order).toEqual(['First', 'Second', 'close']);
  });

  test('CLO-10: closable draws at the end of the first row an icon-only Button of the small size with the close glyph, named closeLabel, in close-button.variant given through the Button’s channel and, in every look but outlined, in the tone of the form — its container the form’s body color made translucent, its glyph that color; the outlined look’s is the Button as it is outside; not closable, no button and no room for one', async ({
    page,
  }) => {
    const forms = [...FORMS.map((status) => ({ id: `tonal-${status}`, variant: 'tonal', status })), ...FORMS.map((status) => ({ id: `outlined-${status}`, variant: 'outlined', status }))];
    await mount(page, [...forms.map(({ id, variant, status }) => fx(id, { variant, status, title: 'A title', closable: true, closeLabel: 'Close' }, 'The body.')), fx('plain', {}, 'The body.')]);
    expect(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T('close-button-variant'))).toBe('tonal');
    const small = await resolveToken(page, SMALL);
    await page.mouse.move(0, 0);
    for (const { id, variant, status } of forms) {
      const button = close(page, id);
      // A Button, with no variant of its own: the callout gives it, and the Button draws it from its own tokens.
      expect(await button.evaluate((el) => [el.localName, el.getAttribute('size'), el.hasAttribute('variant'), el.querySelector('[slot="icon"]')?.textContent, el.getAttribute('part'), el.getAttribute('label')]), id).toEqual(['tanrei-button', 'small', false, 'close', 'close-button', 'Close']);
      const b = await box(closeBox(page, id));
      near(b.width, small, `${id}: the small Button’s circle`);
      near(b.height, small, `${id}: the small Button’s circle`);
      // At the end of the first row.
      near(centre(b), centre((await lines(part(page, id, '.headline')))[0]), `${id}: on the first line`, 1);
      expect(b.x).toBeGreaterThan((await box(part(page, id, '.text'))).x + (await box(part(page, id, '.text'))).width);
      const paint = () => closeBox(page, id).evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el.querySelector('.icon')!).color]);
      if (variant === 'outlined') {
        // No fill under it: no tone, and the tonal Button as it is drawn outside a callout.
        expect(await closeBox(page, id).getAttribute('data-tone'), id).toBeNull();
        await expect.poll(paint, { message: id }).toEqual([await resolveColor(page, '--tanrei-comp-button-tonal-container-color'), await computed(page, 'var(--tanrei-comp-button-tonal-icon-color)')]);
      } else {
        // The tone of the form: its body color, the fill's content color (BTN-45).
        const tone = `var(${T(formToken(status, 'body', 'tonal'))})`;
        expect(await closeBox(page, id).getAttribute('data-tone'), id).toBe('');
        await expect.poll(paint, { message: id }).toEqual([await computed(page, toneAt(tone, '--tanrei-comp-button-tone-container-opacity')), await computed(page, tone)]);
        expect((await paint())[0], `${id}: not the tonal Button’s own container`).not.toBe(await resolveColor(page, '--tanrei-comp-button-tonal-container-color'));
      }
    }
    await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(forms.length);
    // A system's choice of variant reaches it through the same channel, at the next update: text, a bare glyph in the tone.
    await override(page, { [T('close-button-variant')]: 'text' });
    await host(page, 'tonal-error').evaluate((el: HTMLElement & { headline: string }) => (el.headline = 'Another title'));
    await expect.poll(() => closeBox(page, 'tonal-error').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolveColor(page, '--tanrei-comp-button-text-container-color'));
    expect(await closeBox(page, 'tonal-error').evaluate((el) => getComputedStyle(el.querySelector('.icon')!).color)).toBe(await computed(page, `var(${T('error-body-color-tonal')})`));
    // A status changed while shown: the tone follows.
    await override(page, { [T('close-button-variant')]: '' });
    await host(page, 'tonal-error').evaluate((el: HTMLElement & { status: string }) => (el.status = 'success'));
    await expect.poll(() => closeBox(page, 'tonal-error').evaluate((el) => getComputedStyle(el.querySelector('.icon')!).color)).toBe(await computed(page, `var(${T('success-body-color-tonal')})`));
    // Moved in the page: the Button let go of what it was given when it disconnected; the callout gives it again.
    await host(page, 'tonal-info').evaluate((el) => el.parentElement!.append(el));
    await expect.poll(() => closeBox(page, 'tonal-info').getAttribute('data-tone')).toBe('');
    // Not closable: no button, and the text runs to the end padding.
    expect(await close(page, 'plain').count()).toBe(0);
    expect(await part(page, 'plain', '.end').count()).toBe(0);
    const [h, text] = [await box(host(page, 'plain')), await box(part(page, 'plain', '.text'))];
    near(text.x + text.width, h.x + h.width - (await token(page, 'container-padding-inline')), 'no room for a close button');
  });

  test('CLO-11: the close button, by pointer, Enter or Space, sets open to false, emits dismiss exactly once and closes; the callout never closes by itself and does not answer Escape', async ({ page }) => {
    for (const how of ['pointer', 'Enter', 'Space'] as const) {
      await mountSpec(page, 'closable', 'closable-title-actions');
      await countDismiss(page);
      const callout = host(page, 'closable');
      await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
      await page.locator('#start').focus();
      // It does not close by itself, and Escape is not its key.
      await tabTo(page, close(page, 'closable'));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      await expect(callout).toBeVisible();
      expect(await dismissed(page)).toBe(0);
      if (how === 'pointer') await close(page, 'closable').click();
      else await page.keyboard.press(how);
      await expect(callout).toBeHidden();
      expect(await callout.evaluate((el: HTMLElement & { open: boolean }) => [el.open, el.getAttribute('open')])).toEqual([false, 'false']);
      await frames(page);
      expect(await dismissed(page), how).toBe(1);
      // The other callout is untouched.
      await expect(host(page, 'closable-title-actions')).toBeVisible();
    }
  });

  test('CLO-11: a touch on the close button closes it and emits dismiss once', async ({ browser, browserName }) => {
    test.skip(browserName === 'firefox', 'Playwright’s Firefox has no touch input to tap with');
    const context = await browser.newContext({ hasTouch: true });
    const page = await context.newPage();
    await mountSpec(page, 'closable');
    await countDismiss(page);
    await close(page, 'closable').tap();
    await expect(host(page, 'closable')).toBeHidden();
    expect(await dismissed(page)).toBe(1);
    await context.close();
  });

  test('CLO-12: closed while focus is inside it, focus goes back to the element that had it before, so the next Tab reaches what followed the callout — or to the platform’s default where that element is gone; closed while focus is elsewhere, focus does not move', async ({
    page,
  }) => {
    const mountAround = async () => {
      await mountSpec(page, 'closable-title-actions');
      await page.evaluate(() => {
        const stage = document.querySelector('.stage')!;
        stage.insertAdjacentHTML('afterbegin', '<a id="before" href="#b">Before</a>');
        stage.insertAdjacentHTML('beforeend', '<a id="after" href="#a">After</a>');
      });
    };
    const id = 'closable-title-actions';
    // The verify: Tab from a link before the callout to its close button, Enter; focus is on that link, and Tab then
    // reaches the first focusable element after where the callout was.
    await mountAround();
    await page.locator('#before').focus();
    await tabTo(page, close(page, id));
    await page.keyboard.press('Enter');
    await expect(host(page, id)).toBeHidden();
    expect(await focused(page)).toBe('a#before');
    await tab(page);
    expect(await focused(page)).toBe('a#after');
    // Closed by the product while focus is inside it: the same.
    await mountAround();
    await page.locator('#before').focus();
    await tabTo(page, close(page, id));
    await host(page, id).evaluate((el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => ((el.open = false), el.updateComplete));
    expect(await focused(page)).toBe('a#before');
    // The element that had focus is gone: focus is left to the platform — nothing in the closed callout keeps it.
    await mountAround();
    await page.locator('#before').focus();
    await tabTo(page, close(page, id));
    await page.evaluate(() => document.getElementById('before')!.remove());
    await page.keyboard.press('Enter');
    await expect(host(page, id)).toBeHidden();
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement === null)).toBe(true);
    // Closed while focus is elsewhere: focus stays where it is.
    await mountAround();
    await page.locator('#after').focus();
    await host(page, id).evaluate((el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => ((el.open = false), el.updateComplete));
    expect(await focused(page)).toBe('a#after');
  });

  test('CLO-13: not open, the callout draws nothing, takes no space, exposes nothing and nothing in it is reachable by focus; open changes at once, without a motion, and dismiss is emitted only for a close the person made', async ({ page }) => {
    const f = spec.fixtures.find((fixture) => fixture.id === 'closable-title-actions')!;
    await mount(page, [{ ...f, id: 'closed', props: { ...f.props, open: false } }, { ...f, id: 'shown' }]);
    await page.evaluate(() => {
      for (const stage of document.querySelectorAll('.stage')) {
        stage.insertAdjacentHTML('afterbegin', '<a class="before" href="#b">Before</a>');
        stage.insertAdjacentHTML('beforeend', '<a class="after" href="#a">After</a>');
      }
    });
    await countDismiss(page);
    const closed = host(page, 'closed');
    // Markup starts it closed with open="false".
    expect(await closed.getAttribute('open')).toBe('false');
    expect(await closed.evaluate((el: HTMLElement & { open: boolean }) => el.open)).toBe(false);
    await expect(closed).toBeHidden();
    expect(await closed.boundingBox()).toBeNull();
    // It takes no space: the two links stand as they do with nothing between them.
    const [before, after] = [await box(stage(page, 'closed').locator('.before')), await box(stage(page, 'closed').locator('.after'))];
    near(after.x, before.x + before.width, 'no space', 6);
    // Nothing is exposed, and nothing in it takes focus.
    expect(await closed.getAttribute('role')).toBeNull();
    await expect(page.getByRole('alert')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(1);
    await stage(page, 'closed').locator('.before').focus();
    await tab(page);
    expect(await focused(page)).toBe('a.after');
    // Shown by the product: at once, with no motion and no event.
    await closed.evaluate((el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => ((el.open = true), el.updateComplete));
    await expect(closed).toBeVisible();
    expect(await closed.getAttribute('open')).toBeNull();
    expect(await closed.evaluate((el) => [...el.getAnimations({ subtree: true }), ...el.shadowRoot!.getAnimations()].length)).toBe(0);
    near((await box(closed)).height, (await box(host(page, 'shown'))).height, 'whole at once');
    expect(await closed.getAttribute('role')).toBe('alert');
    // Closed by the product: at once, and no dismiss.
    await closed.evaluate((el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => ((el.open = false), el.updateComplete));
    expect(await closed.boundingBox()).toBeNull();
    await frames(page);
    expect(await dismissed(page)).toBe(0);
    // The attribute spells it both ways.
    await closed.evaluate((el) => el.removeAttribute('open'));
    await expect(closed).toBeVisible();
    await closed.evaluate((el) => el.setAttribute('open', 'false'));
    await expect(closed).toBeHidden();
    expect(await dismissed(page)).toBe(0);
  });

  test('CLO-10: the close button answers hover, focus and press as a Button on the tone does — the tone laid over its container at the system’s state-layer opacities — and keeps its own focus ring and minimum target; the callout’s container, text and glyph do not change under a pointer, a press or focus', async ({
    page,
  }) => {
    await mount(page, [fx('tonal-error', { status: 'error', title: 'A title', closable: true, closeLabel: 'Close' }, 'The body.')]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    const id = 'tonal-error';
    const tone = `var(${T('error-body-color-tonal')})`;
    const rest = toneAt(tone, '--tanrei-comp-button-tone-container-opacity');
    const bg = () => closeBox(page, id).evaluate((el) => getComputedStyle(el).backgroundColor);
    const callout = async () => ({ container: await painted(container(page, id), 'background-color'), title: await painted(part(page, id, '.headline'), 'color'), body: await painted(part(page, id, '.body'), 'color'), icon: await painted(part(page, id, '.icon'), 'color') });
    const before = await callout();
    await expect.poll(bg).toBe(await computed(page, rest));
    // Hovered: the Button's own answer on the tone. (No state token of the callout's own is read: it has none.)
    await close(page, id).hover();
    await expect.poll(bg).toBe(await computed(page, toneOver(rest, tone, 'hover')));
    expect(await callout(), 'the callout under the pointer').toEqual(before);
    await page.mouse.move(0, 0);
    await expect.poll(bg).toBe(await computed(page, rest));
    // Focused by the keyboard: the Button's focus ring, its outer stroke in the tone.
    await page.locator('#start').focus();
    await tabTo(page, close(page, id));
    await expect.poll(bg).toBe(await computed(page, toneOver(rest, tone, 'focus')));
    expect(await closeBox(page, id).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
    expect(await closeBox(page, id).evaluate((el) => getComputedStyle(el).outlineColor)).toBe(await computed(page, tone));
    expect(await callout(), 'the callout while its close button is focused').toEqual(before);
    // The Button's own minimum target: its hit area reaches sys.target.pointer around the 32 × 32 circle.
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const area = await closeBox(page, id).evaluate((el) => {
      const s = getComputedStyle(el, '::before');
      return [Number.parseFloat(s.width), Number.parseFloat(s.height)];
    });
    for (const side of area) near(side, Math.max(pointer, await resolveToken(page, SMALL)), 'the Button’s minimum target');
    // The callout itself has no hover.
    await page.locator('#start').focus();
    await part(page, id, '.body').hover();
    expect(await callout(), 'the callout under the pointer on its text').toEqual(before);
    // Nothing of the callout's own is drawn for the close button: no ripple, no hold, no shape of its own.
    expect(await host(page, id).evaluate((el) => el.shadowRoot!.querySelectorAll('.ripple, .hold, .glyph, button').length)).toBe(0);
  });

  test('CLO-10: under cupertino, which draws no state layer, the toned close button is a bare glyph that stays at rest under the pointer and keyboard focus, as the preset’s close button was', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, system: 'cupertino', fixtures: [fx('c', { status: 'warning', title: 'A title', closable: true, closeLabel: 'Close' }, 'The body.')] });
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    expect(await page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), T('close-button-variant'))).toBe('text');
    // The text variant's container is none; on cupertino's tone no layer is laid over it in any state (its alpha stays 0).
    const alpha = async () => (await painted(closeBox(page, 'c'), 'background-color'))[3];
    await expect.poll(alpha).toBe(0);
    await close(page, 'c').hover();
    await expect.poll(() => closeBox(page, 'c').evaluate((el) => el.matches(':hover'))).toBe(true);
    // Whatever the hover started has ended: the color it rests at is the hovered one.
    await motionEnded(close(page, 'c'));
    expect(await alpha(), 'no hover layer').toBe(0);
    await page.mouse.move(0, 0);
    await page.locator('#start').focus();
    await tabTo(page, close(page, 'c'));
    expect(await closeBox(page, 'c').evaluate((el) => el.matches(':focus-visible'))).toBe(true);
    await motionEnded(close(page, 'c'));
    expect(await alpha(), 'no focus layer').toBe(0);
    expect(await closeBox(page, 'c').evaluate((el) => getComputedStyle(el.querySelector('.icon')!).color)).toBe(await computed(page, `var(${T('warning-body-color-tonal')})`));
  });

  test('CLO-19: the container’s corners are eased by sys.shape.corner-smoothing through the shared rule; the close button’s corners and its focus indicator are the Button’s', async ({ page }) => {
    await mountSpec(page, 'closable');
    expect(await container(page, 'closable').getAttribute('data-tanrei-shape')).not.toBeNull();
    expect(await closeBox(page, 'closable').getAttribute('data-tanrei-shape')).not.toBeNull();
    // The amount reaches the container: the radius the shared rule draws grows with it.
    const radius = async (el: Locator) => Number.parseFloat(await css(el, 'border-top-left-radius'));
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0' });
    const round = await radius(container(page, 'closable'));
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0.6' });
    const smooth = await radius(container(page, 'closable'));
    const curve = await css(container(page, 'closable'), 'corner-shape');
    // Where the browser draws a superellipse the radius is scaled and the curve named; elsewhere the corner stays a
    // quarter circle of the token's radius (the first value).
    if (curve && curve !== 'round') expect(smooth).toBeGreaterThan(round);
    else near(smooth, round, 'a quarter circle where the curve cannot be drawn');
    // The close button's corners are the Button's own: a circle of its small size.
    expect((await css(closeBox(page, 'closable'), '--tanrei-corner-radius')).trim()).toBe((await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-comp-button-container-shape'))).trim());
  });

  test('CLO-20: not live, the callout is a note, named by its title or else by statusLabel, read where it stands; statusLabel is text before the title and the body that is not drawn, and is ignored without a status; it is not announced when shown or changed, moves no focus and is no stop in the focus order', async ({
    page,
  }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['docs-caution', 'status-label', 'title-outlined-warning', 'title-slot', 'tonal'].includes(f.id)),
      fx('ignored', { statusLabel: 'Warning' }, 'A neutral aside.'),
    ]);
    // The verify: docs-caution has the note role and no live region.
    const caution = host(page, 'docs-caution');
    expect(await caution.getAttribute('role')).toBe('note');
    expect(await caution.getAttribute('aria-live')).toBeNull();
    await expect(page.getByRole('note', { name: 'Back up before you migrate' })).toHaveCount(1);
    // Named by the product's title where it is in the slot, by statusLabel without a title, by nothing otherwise.
    const slotTitle = host(page, 'title-slot').locator('> [slot="title"]');
    expect(await host(page, 'title-slot').getAttribute('aria-labelledby')).toBe(await slotTitle.getAttribute('id'));
    await expect(page.getByRole('note', { name: 'Where the split button went' })).toHaveCount(1);
    await expect(page.getByRole('note', { name: 'Warning', exact: true })).toHaveCount(1);
    expect(await host(page, 'tonal').getAttribute('aria-label')).toBeNull();
    expect(await host(page, 'tonal').getAttribute('aria-labelledby')).toBeNull();
    // The verify: status-label reads "Warning" before its body and draws no such word.
    const label = part(page, 'status-label', '.status-label');
    expect(await label.textContent()).toBe('Warning, ');
    const drawn = await box(label);
    expect(drawn.width).toBeLessThanOrEqual(1);
    expect(drawn.height).toBeLessThanOrEqual(1);
    expect(await label.evaluate((el) => !!(el.compareDocumentPosition(el.parentElement!.querySelector('.body')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    expect(await label.evaluate((el) => !!(el.compareDocumentPosition(el.parentElement!.querySelector('.title')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(host(page, 'status-label')).toMatchAriaSnapshot(`
      - note "Warning":
        - text: /Warning, Deleting a layer also deletes every token it declares\\./
    `);
    // Before the title too, where the title does not say the status.
    expect(await part(page, 'title-outlined-warning', '.status-label').textContent()).toBe('Warning, ');
    await expect(page.getByRole('note', { name: 'Accessibility' })).toHaveCount(1);
    // Ignored while status is default.
    expect(await part(page, 'ignored', '.status-label').count()).toBe(0);
    expect(await host(page, 'ignored').getAttribute('aria-label')).toBeNull();
    // Not announced: nothing is written to a live region when it is shown again or its content changes.
    await caution.evaluate(async (el: HTMLElement & { open: boolean; headline: string; updateComplete: Promise<unknown> }) => {
      el.open = false;
      await el.updateComplete;
      el.open = true;
      el.headline = 'Changed';
      el.append(' More text.');
      await el.updateComplete;
    });
    await frames(page);
    expect(await announced(page, 'docs-caution')).toEqual({ polite: '', assertive: '' });
    // No focus: it is not a stop, and nothing in a callout without controls is.
    expect(await caution.getAttribute('tabindex')).toBeNull();
    expect(await caution.evaluate((el) => el.shadowRoot!.querySelectorAll('[tabindex], button, a').length)).toBe(0);
    expect(await focused(page)).toBe('body');
  });

  test('CLO-21: live, the callout is a live region in place of a note — polite for default, info and success, assertive for warning and error — announced once when it is shown after its page was presented and when its title, body or status changes, statusLabel first, then the title, then the body; never with the page’s first presentation, never moving focus, and drawn as it is without it', async ({
    page,
  }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['live-success', 'tonal-success', 'closable-title-actions'].includes(f.id)),
      ...FORMS.map((status) => fx(`region-${status}`, { status, statusLabel: status === 'default' ? '' : `It is ${status}`, title: 'A title', live: true }, 'The body.')),
      fx('later', { status: 'warning', statusLabel: 'Warning', title: 'The file changed on disk', live: true, open: false }, 'Nothing is overwritten until you choose.', { slots: { actions: ['Reload'] } }),
    ]);
    await page.evaluate(() => document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<button id="start">start</button>'));
    await page.locator('#start').focus();
    // A live region in place of a note, by status.
    for (const status of FORMS) {
      const callout = host(page, `region-${status}`);
      expect(await callout.getAttribute('role'), status).toBe(status === 'warning' || status === 'error' ? 'alert' : 'status');
      // The announcement is the shadow region's, once: the host's own role does not announce a second time.
      expect(await callout.getAttribute('aria-live')).toBe('off');
      const regions = await callout.evaluate((el) => [...el.shadowRoot!.querySelectorAll('.announce')].map((r) => [r.getAttribute('role') ?? 'no role', r.getAttribute('aria-live'), r.getAttribute('aria-atomic')].join(', ')));
      expect(regions).toEqual(['no role, polite, true', 'no role, assertive, true']);
    }
    // Drawn with the page's first presentation: not announced.
    await frames(page);
    for (const id of ['live-success', 'closable-title-actions', ...FORMS.map((s) => `region-${s}`)]) expect(await announced(page, id), id).toEqual({ polite: '', assertive: '' });
    // live changes nothing that is drawn.
    const [live, still] = [host(page, 'live-success'), host(page, 'tonal-success')];
    await still.evaluate((el, text) => (el.textContent = text), 'Your changes are saved.');
    expect([(await box(live)).width, (await box(live)).height]).toEqual([(await box(still)).width, (await box(still)).height]);
    expect(await painted(container(page, 'live-success'), 'background-color')).toEqual(await painted(container(page, 'tonal-success'), 'background-color'));
    // Shown after the page was presented: announced once, assertively for a warning — statusLabel, the title, the body
    // (not the actions).
    const later = host(page, 'later');
    await later.evaluate((el: HTMLElement & { open: boolean }) => (el.open = true));
    await expect.poll(() => announced(page, 'later')).toEqual({ polite: '', assertive: 'Warning. The file changed on disk. Nothing is overwritten until you choose.' });
    expect(await focused(page), 'focus is not moved').toBe('button#start');
    // Its body changes while it is shown: announced again, whole.
    await later.evaluate((el) => [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!.replaceWith('Another program saved it.'));
    await expect.poll(() => announced(page, 'later')).toEqual({ polite: '', assertive: 'Warning. The file changed on disk. Another program saved it.' });
    // Its title changes.
    await later.evaluate((el: HTMLElement & { headline: string }) => (el.headline = 'The file is gone'));
    await expect.poll(async () => (await announced(page, 'later')).assertive).toBe('Warning. The file is gone. Another program saved it.');
    // Its status changes: the region of the new status, politely for info.
    await later.evaluate((el: HTMLElement & { status: string; statusLabel: string }) => ((el.status = 'info'), (el.statusLabel = 'Information')));
    await expect.poll(() => announced(page, 'later')).toEqual({ polite: 'Information. The file is gone. Another program saved it.', assertive: '' });
    expect(await later.getAttribute('role')).toBe('status');
    // What changes inside an action is not a change of the notice.
    await later.evaluate((el) => (el.shadowRoot!.querySelector('.announce[aria-live="polite"]')!.textContent = ''));
    await later.evaluate((el) => (el.querySelector('[slot="actions"]')!.textContent = 'Reload now'));
    await frames(page);
    expect((await announced(page, 'later')).polite).toBe('');
    // Closed: the region is emptied, so the same notice shown again is announced again.
    await later.evaluate((el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => ((el.open = false), el.updateComplete));
    expect(await announced(page, 'later')).toEqual({ polite: '', assertive: '' });
    await later.evaluate((el: HTMLElement & { open: boolean }) => (el.open = true));
    await expect.poll(async () => (await announced(page, 'later')).polite).toBe('Information. The file is gone. Another program saved it.');
    // Added by the product after the page was presented: announced.
    await page.evaluate(() => {
      const added = document.createElement('tanrei-callout') as HTMLElement & { live: boolean; status: string; statusLabel: string };
      added.id = 'added';
      added.live = true;
      added.status = 'error';
      added.statusLabel = 'Error';
      added.textContent = 'The file could not be read.';
      document.querySelector('.stage')!.append(added);
    });
    await expect.poll(() => page.locator('#added').evaluate((el) => el.shadowRoot?.querySelector('.announce[aria-live="assertive"]')?.textContent ?? '')).toBe('Error. The file could not be read.');
    expect(await focused(page)).toBe('button#start');
  });

  test('CLO-22: a block in the flow of its container that takes the whole inline size it is given, with no outer space, no minimum, no maximum and no measure of its own, never wider than its container; it does not scroll, float, stick or raise itself; in a list item of a prose 320 wide it starts at the item’s text and nothing overflows', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await mountFixtures(page, loadSpec('prose'), {
      icons: true,
      fixtures: [
        {
          id: 't',
          props: {},
          content: `<p>Before the steps.</p><ol><li id="one">The first step.</li><li id="two"><p id="two-text">The second step has a notice.</p><tanrei-callout id="nested" status="warning" headline="Pre-release: not published yet" closable close-label="Close">${prose('<p>The package is not on the registry yet. <a href="#x">Read why</a>.</p><pre><code>pnpm add @tanrei/web@next --registry https://registry.example.test/a/very/long/path</code></pre>')}</tanrei-callout></li></ol><p>After.</p>`,
        },
      ],
    });
    await page.addStyleTag({ content: 'main { display: block !important; } .stage { padding: 0 !important; } .stage > .tanrei-prose { box-sizing: border-box; inline-size: 320px !important; }' });
    near((await box(page.locator('.stage > .tanrei-prose'))).width, 320, 'a prose 320 wide');
    await page.waitForFunction(() => !!customElements.get('tanrei-callout'));
    const nested = page.locator('#nested');
    await nested.evaluate((el: HTMLElement & { updateComplete: Promise<unknown> }) => el.updateComplete);
    const [callout, text, item] = [await box(nested), await box(page.locator('#two-text')), await box(page.locator('#two'))];
    near(callout.x, text.x, 'its start edge is the item’s text’s');
    near(callout.x + callout.width, item.x + item.width, 'its end edge is the item’s');
    // Nothing overflows the list, and the page does not scroll sideways: the line of code scrolls in its own box.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await page.locator('ol').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await nested.locator('pre').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // A block with no outer space that does not scroll and is in the flow. (The one width limit here is the prose's
    // measure, which the prose gives a callout as it gives a text block — PRS-18; its own maximum is checked below.)
    const style = await nested.evaluate((el) => {
      const s = getComputedStyle(el);
      const c = getComputedStyle(el.shadowRoot!.querySelector('.container')!);
      return { display: s.display, margin: [s.marginLeft, s.marginRight, s.marginBottom], min: s.minWidth, max: s.maxWidth, position: s.position, float: s.float, overflow: [s.overflowX, c.overflowX, c.overflowY], z: s.zIndex, inner: [c.minWidth, c.maxWidth, c.position] };
    });
    expect(style).toEqual({ display: 'block', margin: ['0px', '0px', '0px'], min: expect.stringMatching(/^(0px|auto)$/), max: expect.stringMatching(/px$/), position: 'static', float: 'none', overflow: ['visible', 'visible', 'visible'], z: 'auto', inner: [expect.stringMatching(/^(0px|auto)$/), 'none', 'static'] });

    // In a page, in a card and in another callout's body alike: the whole inline size it is given.
    await page.setViewportSize({ width: 1280, height: 800 });
    await mount(page, [fx('outer', { title: 'An outer notice' }, '<div id="inside"><tanrei-callout id="inner" status="info" status-label="Information">An inner notice.</tanrei-callout></div>'), fx('card', {}, 'placeholder')]);
    await page.evaluate(() => {
      document.querySelector('[data-fixture="card"]')!.innerHTML = '<tanrei-card><div id="card-box"><tanrei-callout id="in-card">In a card.</tanrei-callout></div></tanrei-card>';
      document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div id="page" style="inline-size: 900px"><tanrei-callout id="in-page">In a page.</tanrei-callout></div>');
    });
    for (const [inner, outer] of [['#inner', '#inside'], ['#in-card', '#card-box'], ['#in-page', '#page']]) {
      const [a, b] = [await box(page.locator(inner)), await box(page.locator(outer))];
      near(a.x, b.x, `${inner} start`);
      near(a.width, b.width, `${inner} width`);
    }
    near((await box(page.locator('#in-page'))).width, 900, 'no maximum');
    expect(await page.locator('#in-page').evaluate((el) => [getComputedStyle(el).maxWidth, getComputedStyle(el).minWidth])).toEqual(['none', expect.stringMatching(/^(0px|auto)$/)]);
  });

  test('CLO-22, CLO-13: content written in the page keeps its place before the element is defined — the stylesheet gives it the box the element will have — so nothing moves when it is defined, and one that starts closed takes no space', async ({ page }) => {
    const callouts = `
      <tanrei-callout id="a" status="info"><p slot="title">A revised spec, not yet on every platform</p>The web draws this revision. SwiftUI, Compose, Flutter and React Native still draw the previous one.</tanrei-callout>
      <p class="after">After a.</p>
      <tanrei-callout id="b" size="large" status="warning" closable close-label="Close"><h3 slot="title">Pre-release: not published yet</h3>${prose('<p>The package is not available on the registry yet.</p><ul><li>One</li><li>Two</li></ul><p>The install steps show how it will work.</p>', 'large')}</tanrei-callout>
      <p class="after">After b.</p>
      <tanrei-callout id="c" variant="outlined"><span slot="icon">lightbulb</span><p slot="title">Tip</p>Keep an action enabled and explain what is missing when it is used.</tanrei-callout>
      <p class="after">After c.</p>
      <tanrei-callout id="d">Sizes are minimums: a control grows with enlarged text.</tanrei-callout>
      <p class="after">After d.</p>
      <tanrei-callout id="closed" open="false" status="error" live>Shown later.</tanrei-callout>
      <p class="after">After the closed one.</p>`;
    const bundle = dist('tanrei.bundle.js');
    // The page as a server sends it: the tokens, the stylesheets, the content — and no script yet.
    await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>before definition</title>
      <style>${dist('tokens.css')}</style><style>${dist('prose.css')}</style><style>${dist('callout.css')}</style>
      <style>body { margin: 16px; inline-size: 480px; font: var(--tanrei-sys-typescale-body-font); } p.after { margin: 8px 0; }</style></head><body>${callouts}</body></html>`);
    expect(await page.evaluate(() => !!customElements.get('tanrei-callout'))).toBe(false);
    const measure = () =>
      page.evaluate(() => {
        const rect = (el: Element | Range) => {
          const r = el.getBoundingClientRect();
          return [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 4) / 4);
        };
        const text = (el: Element) => {
          const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
          if (!node) return null;
          const range = document.createRange();
          range.selectNodeContents(node);
          return rect(range);
        };
        return {
          callouts: [...document.querySelectorAll('tanrei-callout')].map((el) => ({ id: el.id, box: rect(el), text: text(el), title: el.querySelector('[slot="title"]') ? rect(el.querySelector('[slot="title"]')!) : null, blocks: [...el.querySelectorAll('.tanrei-prose > *')].map(rect) })),
          after: [...document.querySelectorAll('.after')].map(rect),
        };
      });
    const before = await measure();
    // Before it is defined: its content is in the page and can be seen; a glyph's name is not; a closed one is nothing.
    await expect(page.locator('#a')).toContainText('The web draws this revision.');
    await expect(page.locator('#a > [slot="title"]')).toBeVisible();
    await expect(page.locator('#c > [slot="icon"]')).toBeHidden();
    expect(before.callouts.find((c) => c.id === 'closed')!.box.slice(2)).toEqual([0, 0]);
    expect(before.callouts.find((c) => c.id === 'a')!.box[2]).toBe(480);
    // The element is defined.
    await page.addScriptTag({ type: 'module', content: bundle });
    await page.waitForFunction(() => !!customElements.get('tanrei-callout'));
    await page.evaluate(() => Promise.all([...document.querySelectorAll('tanrei-callout')].map((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete)));
    await frames(page);
    const after = await measure();
    // Nothing moved: each callout's box, its text, its title, its blocks, and what follows it.
    const close = (a: number[] | null, b: number[] | null, what: string) => {
      expect(!!a, what).toBe(!!b);
      if (a && b) a.forEach((v, i) => expect(Math.abs(v - b[i]), `${what}: ${a.join(',')} → ${b.join(',')}`).toBeLessThanOrEqual(0.5));
    };
    for (const [i, was] of before.callouts.entries()) {
      const now = after.callouts[i];
      close(was.box, now.box, `${was.id} box`);
      close(was.text, now.text, `${was.id} text`);
      close(was.title, now.title, `${was.id} title`);
      was.blocks.forEach((block, n) => close(block, now.blocks[n], `${was.id} block ${n}`));
    }
    before.after.forEach((was, i) => close(was, after.after[i], `what follows callout ${i}`));
    // …and it is the element now: the fill, the glyph, the close button.
    await expect(page.locator('#b').locator('.close')).toBeVisible();
    expect(await page.locator('#c > [slot="icon"]').evaluate((el) => getComputedStyle(el).display)).not.toBe('none');
    // A live callout written in the page's markup is part of its first presentation: not announced (CLO-21).
    expect(await page.locator('#closed').evaluate((el) => el.shadowRoot!.querySelector('.announce[aria-live="assertive"]')!.textContent)).toBe('');
  });

  test('CLO-23: with the text enlarged the title and the body grow and wrap, the paddings and gaps stay, the glyph’s box and the close button keep their size on the first line, nothing is cut or overlaps, text-spacing overrides lose no content, and nothing scrolls sideways at 320 wide with text at 200 %', async ({
    page,
  }) => {
    const ids = ['actions', 'closable-title-actions'];
    await page.setViewportSize({ width: 320, height: 900 });
    await mount(page, [...spec.fixtures.filter((f) => ids.includes(f.id)), fx('short', { status: 'error', title: 'Three fields need attention', closable: true, closeLabel: 'Close' }, 'Enter a name, choose a start date, and give an address that can receive mail.', { slots: { actions: ['Fix', 'Skip'] } })]);
    const normal = await textStyle(part(page, 'actions', '.body'));
    const normalTitle = await textStyle(part(page, 'actions', '.headline'));
    const heights = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, (await box(host(page, id))).height] as const)));
    // The verify: 200 % text in a stage 320 wide.
    await page.addStyleTag({ content: 'html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; }' });
    await frames(page);
    // The tokens as they resolve now: the system's lengths are the reader's (rem), so a padding is still its token.
    const [iconSize, small, padBlock] = [await token(page, 'icon-size'), await resolveToken(page, SMALL), await token(page, 'container-padding-block')];
    near(Number.parseFloat((await textStyle(part(page, 'actions', '.body'))).fontSize), 2 * Number.parseFloat(normal.fontSize), 'the body grows');
    near(Number.parseFloat((await textStyle(part(page, 'actions', '.headline'))).fontSize), 2 * Number.parseFloat(normalTitle.fontSize), 'the title grows');
    // No horizontal scrolling: nothing of the callout's own is wider than the stage, and with actions that fit its
    // column nothing at all is. (The spec's two fixtures hold Buttons whose labels are longer than the column at this
    // size, and a Button's label is one line: the test below.)
    expect(await stage(page, 'short').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'no horizontal scrolling').toBe(true);
    for (const id of [...ids, 'short']) expect(await host(page, id).evaluate((el) => [...el.shadowRoot!.querySelectorAll('.container, .lead, .text, .title, .body, .end, .close')].every((p) => p.getBoundingClientRect().right <= el.getBoundingClientRect().right + 0.5)), `${id}: its own parts stay inside`).toBe(true);
    for (const id of ids) {
      const h = await box(host(page, id));
      expect(h.height, `${id} grows in height`).toBeGreaterThan(heights[id]);
      near(h.width, 320 - 32, `${id} fills the stage`);
      // The paddings stay; no fixed height; nothing cut.
      near((await box(part(page, id, '.title'))).y - h.y, padBlock, `${id}: the padding stays`);
      const c = container(page, id);
      expect(await c.evaluate((el) => [getComputedStyle(el).overflowX, getComputedStyle(el).overflowY, getComputedStyle(el).maxHeight, el.scrollHeight <= el.clientHeight + 1])).toEqual(['visible', 'visible', 'none', true]);
      for (const selector of ['.title', '.body']) {
        const b = await box(part(page, id, selector));
        expect(b.x, `${id} ${selector} inside`).toBeGreaterThanOrEqual(h.x - 0.5);
        expect(b.x + b.width, `${id} ${selector} inside`).toBeLessThanOrEqual(h.x + h.width + 0.5);
        expect(b.y + b.height, `${id} ${selector} inside`).toBeLessThanOrEqual(h.y + h.height + 0.5);
      }
      // The glyph's box keeps icon.size, centred on the first line.
      const icon = await box(part(page, id, '.icon'));
      near(icon.width, iconSize, `${id} glyph`);
      near(icon.height, iconSize, `${id} glyph`);
      near(centre(icon), centre((await lines(part(page, id, '.headline')))[0]), `${id}: the glyph on the first line`, 1.5);
      // Every action is whole — its label is not cut to make the row fit (CLO-9) — and starts at the text's edge.
      for (const action of await host(page, id).locator('> [slot="actions"]').all()) {
        const b = await box(action);
        near(b.x, (await box(part(page, id, '.body'))).x, `${id}: an action at the text’s start edge`);
        expect(await action.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: the label is whole`).toBe(true);
        await expect(action).toBeVisible();
      }
    }
    // Actions that fit are inside the callout.
    for (const action of await host(page, 'short').locator('> [slot="actions"]').all()) {
      const [b, h] = [await box(action), await box(host(page, 'short'))];
      expect(b.x + b.width).toBeLessThanOrEqual(h.x + h.width + 0.5);
    }
    // Both actions are visible, on rows of their own.
    const [a, b] = [await box(host(page, 'actions').locator('> [slot="actions"]').nth(0)), await box(host(page, 'actions').locator('> [slot="actions"]').nth(1))];
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height);
    // The close button keeps its own size (a Button's: rem, so it follows the root's font size, BTN-12) on the first
    // line, and nothing overlaps it.
    const button = await box(closeBox(page, 'closable-title-actions'));
    near(button.width, small, 'the close button');
    near(button.height, small, 'the close button');
    near(centre(button), centre((await lines(part(page, 'closable-title-actions', '.headline')))[0]), 'the close button on the first line', 1.5);
    for (const selector of ['.headline', '.body slot']) for (const line of await lines(part(page, 'closable-title-actions', selector))) expect(line.right, `${selector} does not run under the close button`).toBeLessThanOrEqual(button.x + 0.5);
    // Text spacing (WCAG 1.4.12): nothing is lost.
    const words = await host(page, 'closable-title-actions').evaluate((el) => (el as HTMLElement).innerText);
    const beforeSpacing = (await box(host(page, 'closable-title-actions'))).height;
    await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }' });
    await host(page, 'closable-title-actions').evaluate((el) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }');
      el.shadowRoot!.adoptedStyleSheets = [...el.shadowRoot!.adoptedStyleSheets, sheet];
    });
    await frames(page);
    const spaced = await box(host(page, 'closable-title-actions'));
    expect(spaced.height).toBeGreaterThanOrEqual(beforeSpacing);
    expect(await host(page, 'closable-title-actions').evaluate((el) => (el as HTMLElement).innerText)).toBe(words);
    expect(await container(page, 'closable-title-actions').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    for (const selector of ['.title', '.body', '.actions']) {
      const bx = await box(part(page, 'closable-title-actions', selector));
      expect(bx.y + bx.height).toBeLessThanOrEqual(spaced.y + spaced.height + 0.5);
    }
    expect(await stage(page, 'short').evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  });

  // CLO-23's verify, with the spec's own fixtures: their actions are text Buttons ("Reload from disk", "Go to the first
  // field") whose one line is wider than the callout's text column at 200 % in a stage 320 wide. An action is never
  // wider than its line (`::slotted([slot='actions'])`), and the callout tells its Buttons their label may wrap, as a
  // button group tells its items.
  test('CLO-23: the spec’s own fixtures at 200 % text in a stage 320 wide need no horizontal scrolling: every action is visible, whole and inside the callout, on rows of their own, a Button wider than its line wrapping its label', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mountSpec(page, 'actions', 'closable-title-actions');
    await page.addStyleTag({ content: 'html { font-size: 200%; } main { display: block !important; } .stage { box-sizing: border-box; inline-size: 320px !important; }' });
    await frames(page, 6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    for (const id of ['actions', 'closable-title-actions']) {
      const text = await box(part(page, id, '.text'));
      const c = await box(container(page, id));
      let below = 0;
      for (const action of await host(page, id).locator('> [slot="actions"]').all()) {
        await expect(action).toBeVisible();
        const b = await box(action);
        near(b.x, text.x, `${id}: starts at the text's start edge`);
        expect(b.x + b.width, `${id}: inside the callout`).toBeLessThanOrEqual(c.x + c.width + 0.5);
        expect(b.y, `${id}: on a row of its own`).toBeGreaterThanOrEqual(below);
        below = b.y + b.height;
        // Its box is what it draws: the native button does not run out of its element.
        near((await box(action.locator('button'))).width, b.width, `${id}: the action's box is its button's`, 0.1);
        if (id === 'closable-title-actions') {
          const x = await box(close(page, id));
          expect(b.y >= x.y + x.height || b.x + b.width <= x.x || b.x >= x.x + x.width, 'nothing overlaps the close button').toBe(true);
        }
        // Whole: the label is not cut (CLO-9) — the native button clips nothing and nothing in it scrolls.
        expect(await action.locator('button').evaluate((el) => [getComputedStyle(el).overflow, el.scrollWidth <= el.clientWidth + 1, getComputedStyle(el.querySelector('.label')!).textOverflow]), id).toEqual(['visible', true, 'clip']);
      }
    }
    // A Button wider than its line takes the line and wraps its label: "Reload from disk" in a column of 160.
    const rows = (action: Locator) =>
      action.locator('.label slot').evaluate((slot) => {
        const range = document.createRange();
        range.selectNodeContents((slot as HTMLSlotElement).assignedNodes({ flatten: true })[0]!);
        return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      });
    const reload = host(page, 'actions').locator('> [slot="actions"]').first();
    near((await box(reload)).width, (await box(part(page, 'actions', '.text'))).width, 'the action takes its line');
    expect(await rows(reload), 'the label is on several lines').toBeGreaterThan(1);
    await expect(reload).toHaveText('Reload from disk');
    // "Go to the first field" beside the close button has a column narrower than its longest word and its paddings: every
    // word is whole, one to a line, and the Button is as wide as that needs — past its column, under the close button's
    // column and inside the callout (asserted above).
    const long = host(page, 'closable-title-actions').locator('> [slot="actions"]').first();
    expect((await box(long)).width, 'no narrower than its line').toBeGreaterThanOrEqual((await box(part(page, 'closable-title-actions', '.text'))).width - 0.5);
    expect(await rows(long), 'the label is on several lines').toBeGreaterThan(1);
    await expect(long).toHaveText('Go to the first field');
  });

  test('CLO-9, CLO-23: an action that fits its line is not touched — a Button in the actions is, to a hundredth of a pixel, the Button it is outside a callout, its label one line; and one that leaves the actions is a Button alone again', async ({ page }) => {
    await mount(page, [fx('fits', { status: 'warning', title: 'The file changed on disk' }, 'Nothing is overwritten until you choose.', { slots: { actions: ['Reload from disk', 'Keep mine'] } })]);
    await page.evaluate(async () => {
      const alone = document.createElement('div');
      alone.id = 'alone';
      alone.style.cssText = 'display: flex; align-items: center;';
      for (const action of document.querySelectorAll('[data-fixture="fits"] [slot="actions"]')) {
        const copy = action.cloneNode(true) as HTMLElement;
        copy.removeAttribute('slot');
        alone.append(copy);
      }
      document.querySelector('main')!.append(alone);
      for (const el of alone.children) await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    await frames(page);
    const measure = (locator: Locator) =>
      locator.evaluate((el) => {
        const size = (node: Element) => [node.getBoundingClientRect().width, node.getBoundingClientRect().height];
        const native = el.shadowRoot!.querySelector('button')!;
        const label = el.shadowRoot!.querySelector('.label')!;
        const s = getComputedStyle(native);
        const target = getComputedStyle(native, '::before');
        return {
          host: size(el), native: size(native), label: size(label),
          paint: [s.borderRadius, s.paddingInline, s.backgroundColor, s.color, s.boxShadow],
          // The minimum target's size and where it stands across the row (along it, the two forms place the same box differently).
          target: [target.inlineSize, target.blockSize, target.insetBlock],
        };
      });
    const inside = await host(page, 'fits').locator('> [slot="actions"]').all();
    const alone = await page.locator('#alone > *').all();
    expect(inside.length).toBe(2);
    for (const [i, action] of inside.entries()) {
      const [a, b] = [await measure(action), await measure(alone[i]!)];
      for (const key of ['host', 'native', 'label'] as const) for (const axis of [0, 1]) expect(Math.abs(a[key][axis]! - b[key][axis]!), `action ${i} ${key} ${axis ? 'height' : 'width'}: ${a[key][axis]} = ${b[key][axis]}`).toBeLessThanOrEqual(0.01);
      expect(a.paint, `action ${i}: drawn as alone`).toEqual(b.paint);
      expect(a.target, `action ${i}: its target as alone`).toEqual(b.target);
      expect(a.label[1], 'one line').toBeLessThan(a.native[1]);
    }
    // An action that leaves the slot is told it has no place: it may no longer wrap.
    const wraps = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('button')!).whiteSpace);
    const first = inside[0]!;
    const placed = await wraps(first);
    await first.evaluate((el) => el.removeAttribute('slot'));
    await frames(page);
    expect([placed, await wraps(host(page, 'fits').locator('> tanrei-button').first())]).toEqual(['normal', 'nowrap']);
  });

  test('CLO-24: in forced colors every variant and status draws an edge of outline.width in the text color inside its container, its title, body and glyph in that color with the glyph whole, links in the link color and underlined, the close button in the button’s colors; nothing rests on a fill, nothing moves, and the statuses are told apart by their glyphs', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
    await mount(page, [...spec.fixtures, fx('link', { status: 'info', title: 'A title' }, 'Read <a id="l" class="tanrei-link" href="#x">the guide</a>.')]);
    await page.addStyleTag({ content: dist('link.css') });
    const ids = [...spec.fixtures.map((f) => f.id), 'link'];
    const geometry = async () => Object.fromEntries(await Promise.all(ids.map(async (id) => [id, [await box(host(page, id)), (await part(page, id, '.body').isVisible()) ? await box(part(page, id, '.body')) : null]] as const)));
    const before = await geometry();
    const width = await token(page, 'outline-width');
    await page.emulateMedia({ forcedColors: 'active' });
    const system = (name: string) => colorOf(page, name);
    const [canvasText, buttonText, linkText] = [await system('CanvasText'), await system('ButtonText'), await system('LinkText')];
    // The verify: every fixture has a visible edge in CanvasText; none relies on a background color.
    for (const id of ids) {
      const c = container(page, id);
      const edge = await c.evaluate((el) => {
        const s = getComputedStyle(el);
        return { widths: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth], style: s.borderTopStyle };
      });
      for (const side of edge.widths) near(Number.parseFloat(side), width, `${id}: an edge of outline.width`, 0.1);
      expect(edge.style, id).toBe('solid');
      sameColor(await painted(c, 'border-top-color'), canvasText, `${id}: the edge in the text color`);
      if (await part(page, id, '.body').isVisible()) sameColor(await painted(part(page, id, '.body'), 'color'), canvasText, `${id} body`);
      if (await part(page, id, '.title').isVisible()) sameColor(await painted(part(page, id, '.title'), 'color'), canvasText, `${id} title`);
      if (await part(page, id, '.icon').isVisible()) {
        const glyph = await painted(part(page, id, '.icon'), 'color');
        sameColor(glyph, canvasText, `${id} glyph`);
        expect(glyph[3], `${id}: the glyph whole`).toBe(255);
      }
      if (await close(page, id).count()) sameColor(await painted(closeBox(page, id).locator('.icon'), 'color'), buttonText, `${id}: the close button’s glyph, as a Button draws it`);
    }
    // Nothing moves: the edge is inside the container's size.
    const after = await geometry();
    for (const id of ids) {
      for (const [i, was] of before[id].entries()) {
        const now = after[id][i];
        if (!was || !now) continue;
        for (const key of ['x', 'y', 'width', 'height'] as const) near(now[key], was[key], `${id}: ${key} is as it was`);
      }
    }
    // The four statuses are told apart by their glyphs alone.
    expect(new Set(await Promise.all(STATUSES.map((s) => part(page, `tonal-${s}`, '.ink').textContent()))).size).toBe(4);
    // A link: the platform's link color, still underlined.
    sameColor(await painted(page.locator('#l'), 'color'), linkText, 'the link color');
    expect(await page.locator('#l').evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain('underline');
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('CLO-25: in right-to-left the order mirrors and the paddings follow the logical start and end — the glyph at the right, the text after it, the actions starting at the text’s right edge, the close button at the left', async ({
    page,
  }) => {
    await mountSpec(page, 'closable-actions-rtl', 'tonal-info-rtl');
    const id = 'closable-actions-rtl';
    const [padInline, padClose, iconGap, gap] = await Promise.all(['container-padding-inline', 'container-padding-inline-end-with-close', 'icon-gap', 'container-gap'].map((n) => token(page, n)));
    const [h, icon, text, button] = [await box(host(page, id)), await box(part(page, id, '.icon')), await box(part(page, id, '.text')), await box(closeBox(page, id))];
    near(icon.x + icon.width, h.x + h.width - padInline, 'the glyph at the right, after the start padding');
    near(text.x + text.width, icon.x - iconGap, 'the text after the glyph');
    near(button.x, h.x + padClose, 'the close button at the left, before the nearer padding');
    near(text.x, button.x + button.width + gap, 'container.gap between the text and the close button');
    const first = await box(host(page, id).locator('> [slot="actions"]').first());
    near(first.x + first.width, text.x + text.width, 'the actions start at the text’s right edge');
    const second = await box(host(page, id).locator('> [slot="actions"]').nth(1));
    expect(second.x + second.width).toBeLessThan(first.x);
    // The title's and the body's lines begin at the right.
    near((await lines(part(page, id, '.headline')))[0].right, text.x + text.width, 'the title’s line at the right');
  });

  test('CLO-26: the direction is the nearest ancestor’s, not the root’s and not a setting of the callout’s own; when it changes while the callout is shown it is drawn for the new direction at once, without a motion, keeping its open state and its focus', async ({ page }) => {
    await mountSpec(page, 'closable-actions-rtl', 'closable-title-actions');
    // The direction is on an ancestor inside the page (the stage), not on the root; the callout has no setting for it.
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    expect(await host(page, 'closable-actions-rtl').evaluate((el) => [el.getAttribute('dir'), 'direction' in el, Object.keys((el.constructor as unknown as { properties: object }).properties).includes('dir')])).toEqual([null, false, false]);
    const side = async (id: string) => ((await box(part(page, id, '.icon'))).x < (await box(part(page, id, '.text'))).x ? 'ltr' : 'rtl');
    expect(await side('closable-actions-rtl')).toBe('rtl');
    expect(await side('closable-title-actions')).toBe('ltr');
    // Changed after the first render, with focus on the close button.
    const id = 'closable-title-actions';
    await tabTo(page, close(page, id));
    await stage(page, id).evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await side(id)).toBe('rtl');
    const [h, button] = [await box(host(page, id)), await box(closeBox(page, id))];
    near(button.x, h.x + (await token(page, 'container-padding-inline-end-with-close')), 'the close button at the left');
    expect(await host(page, id).evaluate((el) => [...el.getAnimations({ subtree: true }), ...el.shadowRoot!.getAnimations()].filter((a) => !(a as CSSTransition).transitionProperty?.includes('color')).length), 'no motion').toBe(0);
    expect(await host(page, id).evaluate((el: HTMLElement & { open: boolean }) => el.open)).toBe(true);
    const onClose = () => close(page, id).evaluate((el) => (el.getRootNode() as ShadowRoot).activeElement === el);
    expect(await onClose()).toBe(true);
    // And back.
    await stage(page, id).evaluate((el) => el.removeAttribute('dir'));
    expect(await side(id)).toBe('ltr');
    expect(await onClose()).toBe(true);
  });

  test('CLO-27: in right-to-left the icon helper mirrors a glyph of the icon slot that the icon set marks, or the product forces, inside its own box, and not one the product forbids or an unmarked one; the callout’s own glyphs are not mirrored, nor an image, nor anything in left-to-right', async ({
    page,
  }) => {
    const MIRRORED = 'matrix(-1, 0, 0, 1, 0, 0)';
    const transform = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).transform);
    const slot = (name: string, attributes = '') => `<span slot="icon"${attributes ? ` ${attributes}` : ''}>${name}</span>`;
    await mount(page, [
      ...spec.fixtures.filter((f) => ['icon-rtl', 'tonal-info-rtl', 'closable-actions-rtl'].includes(f.id)),
      fx('unmarked', { title: 'Tip' }, `${slot('lightbulb')}Text.`, { direction: 'rtl' }),
      fx('forced', { title: 'Tip' }, `${slot('lightbulb', 'data-mirror="always"')}Text.`, { direction: 'rtl' }),
      fx('forbidden', { title: 'Next' }, `${slot('arrow_forward', 'data-mirror="never"')}Text.`, { direction: 'rtl' }),
      fx('image', { title: 'Next' }, '<svg slot="icon" viewBox="0 0 20 20"><path d="M2 10h14"/></svg>Text.', { direction: 'rtl' }),
      fx('ltr', { title: 'Next' }, `${slot('arrow_forward')}Text.`),
    ]);
    const glyph = (id: string) => host(page, id).locator('> [slot="icon"]');
    // The verify: icon-rtl draws arrow_forward mirrored; tonal-info-rtl draws info unmirrored.
    expect(await transform(glyph('icon-rtl'))).toBe(MIRRORED);
    expect(await transform(part(page, 'tonal-info-rtl', '.icon'))).toBe('none');
    expect(await transform(part(page, 'closable-actions-rtl', '.icon'))).toBe('none');
    expect(await transform(close(page, 'closable-actions-rtl').locator('[slot="icon"]'))).toBe('none');
    expect(await transform(glyph('unmarked'))).toBe('none');
    expect(await transform(glyph('forced'))).toBe(MIRRORED);
    expect(await transform(glyph('forbidden'))).toBe('none');
    expect(await transform(glyph('image'))).toBe('none');
    expect(await transform(glyph('ltr'))).toBe('none');
    // Inside its own box: its place, its size and its color are those of an unmirrored glyph, and the order is CLO-25's.
    const [mirrored, plain] = [await box(part(page, 'icon-rtl', '.icon')), await box(part(page, 'unmarked', '.icon'))];
    near(mirrored.x - (await box(host(page, 'icon-rtl'))).x, plain.x - (await box(host(page, 'unmarked'))).x, 'the same place');
    expect([mirrored.width, mirrored.height]).toEqual([plain.width, plain.height]);
    expect(await painted(glyph('icon-rtl'), 'color')).toEqual(await painted(glyph('unmarked'), 'color'));
    expect(mirrored.x).toBeGreaterThan((await box(part(page, 'icon-rtl', '.text'))).x);
    // The callout mirrors nothing itself: no part of it is transformed.
    expect(await transform(container(page, 'icon-rtl'))).toBe('none');
    expect(await transform(part(page, 'icon-rtl', '.icon'))).toBe('none');
  });

  test('CLO-28: a title given as text is text of its own direction, isolated: a left-to-right title keeps its order in a right-to-left layout and is still placed and aligned by the layout; the body’s blocks are laid out as prose lays out a block', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['ltr-title-rtl', 'tonal-info-rtl', 'title'].includes(f.id)),
      fx('prose-rtl', { status: 'info', title: 'ملاحظة' }, prose('<p id="ltr-p">Version 2.1 is out.</p><p id="rtl-p">تم نشر هذا الإصدار.</p>'), { direction: 'rtl' }),
    ]);
    await withProse(page);
    const id = 'ltr-title-rtl';
    const headline = part(page, id, '.headline');
    expect(await css(headline, 'unicode-bidi')).toBe('plaintext');
    // The verify: the glyph is at the right, the title begins at the right edge of the text column and reads left to right.
    const [icon, text] = [await box(part(page, id, '.icon')), await box(part(page, id, '.text'))];
    expect(icon.x).toBeGreaterThan(text.x + text.width - 1);
    const line = (await lines(headline))[0];
    near(line.right, text.x + text.width, 'the title’s line at the right edge of the text column');
    const letters = await headline.evaluate((el) => {
      const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!;
      const at = (i: number) => {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        return range.getBoundingClientRect().left;
      };
      return [at(0), at(node.textContent!.length - 1)];
    });
    expect(letters[0], '“v” is at the left of the final “a”: it reads left to right').toBeLessThan(letters[1]);
    // A right-to-left title in a right-to-left layout, and a left-to-right one in a left-to-right layout, as ever.
    near((await lines(part(page, 'tonal-info-rtl', '.headline')))[0].right, (await box(part(page, 'tonal-info-rtl', '.text'))).x + (await box(part(page, 'tonal-info-rtl', '.text'))).width, 'a right-to-left title at the right');
    near((await lines(part(page, 'title', '.headline')))[0].left, (await box(part(page, 'title', '.text'))).x, 'a left-to-right title at the left');
    // The body's blocks are prose's (PRS-25): each by its own first strong character, its lines at the layout's start edge.
    const column = await box(part(page, 'prose-rtl', '.body'));
    for (const block of ['#ltr-p', '#rtl-p']) {
      expect(await page.locator(block).evaluate((el) => getComputedStyle(el).unicodeBidi)).toBe('plaintext');
      near((await lines(page.locator(block)))[0].right, column.x + column.width, `${block}: its line at the right`);
    }
  });

  test('CLO-29: while the icon set cannot draw a glyph the callout draws nothing in its place — never the glyph’s name — and keeps its box; it draws the glyph once the set can; statusLabel and closeLabel still reach assistive technology', async ({ page }) => {
    await mountSpec(page, 'closable-outlined-info', 'icon');
    const family = await withoutIconFont(page);
    const id = 'closable-outlined-info';
    // The callout's own glyphs; the close button's is the Button's.
    const glyphs = [part(page, id, '.icon'), part(page, 'icon', '.icon')];
    const size = await token(page, 'icon-size');
    for (const glyph of glyphs) {
      await expect.poll(() => glyph.getAttribute('data-drawn')).toBeNull();
      expect(await css(glyph, 'visibility')).toBe('hidden');
      near((await box(glyph)).width, size, 'the box is kept');
      near((await box(glyph)).height, size, 'the box is kept');
    }
    // The product's glyph is hidden with its box: its name is not spelled.
    expect(await host(page, 'icon').locator('> [slot="icon"]').evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
    // The words still reach assistive technology.
    await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(1);
    expect(await part(page, id, '.status-label').textContent()).toBe('Information, ');
    await expect(page.getByRole('note', { name: 'Information' })).toHaveCount(1);
    // The set can draw them now.
    await iconFaceArrives(page, family);
    for (const glyph of glyphs) {
      await expect.poll(() => glyph.getAttribute('data-drawn')).not.toBeNull();
      expect(await css(glyph, 'visibility')).toBe('visible');
    }
  });

  test('CLO-30: a variant or size the active design system does not have, and a status this spec does not have, render as the default (tonal, medium, default) and are reported in debug builds', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('default', { title: 'A title' }, 'The body.'),
      fx('variant', { variant: 'accent', title: 'A title' }, 'The body.'),
      fx('size', { size: 'huge', title: 'A title' }, 'The body.'),
      fx('status', { status: 'tip', statusLabel: 'Tip', title: 'A title' }, 'The body.'),
      fx('unsafe', { variant: 'a b{', size: '9"x', title: 'A title' }, 'The body.'),
    ]);
    const look = async (id: string) => ({
      box: await box(host(page, id)).then((b) => [b.width, b.height]),
      fill: await painted(container(page, id), 'background-color'),
      title: [await textStyle(part(page, id, '.headline')), await painted(part(page, id, '.headline'), 'color')],
      body: [await textStyle(part(page, id, '.body')), await painted(part(page, id, '.body'), 'color')],
      edge: await css(container(page, id), 'box-shadow'),
      glyph: await part(page, id, '.lead').isVisible(),
    });
    const base = await look('default');
    sameColor(base.fill, await tokenColor(page, 'container-color-tonal'), 'the default is tonal');
    for (const id of ['variant', 'size', 'status', 'unsafe']) expect(await look(id), id).toEqual(base);
    // An unknown status draws no glyph and no status in words.
    expect(await part(page, 'status', '.status-label').count()).toBe(0);
    await expect.poll(() => seen.filter((w) => w.includes('CLO-30')).length).toBeGreaterThanOrEqual(5);
    const reported = seen.filter((w) => w.includes('CLO-30')).join('\n');
    expect(reported).toContain('variant "accent"');
    expect(reported).toContain('size "huge"');
    expect(reported).toContain('status "tip"');
    expect(reported).toContain('drawn as "tonal"');
    expect(reported).toContain('drawn as "medium"');
    expect(reported).toContain('drawn as "default"');
    // The known values are not reported.
    expect(seen.filter((w) => w.includes('CLO-30') && /"(tonal|outlined|medium|large|info)" is not/.test(w))).toEqual([]);
  });

  test('CLO-31: with no title, no title slot and no body the callout draws nothing, takes no space, exposes nothing and is reported; a status not given in words, a close button without a name and a statusLabel without a status still render and are reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('empty', { status: 'info', statusLabel: 'Information', closable: true, closeLabel: 'Close' }, '   ', { slots: { icon: 'lightbulb', actions: ['Reload'] } }),
      fx('no-words', { status: 'warning' }, 'Deleting a layer also deletes every token it declares.'),
      fx('no-name', { closable: true }, 'Search now covers the release notes.'),
      fx('no-status', { statusLabel: 'Warning' }, 'A neutral aside.'),
      fx('fine', { status: 'warning', title: 'Warning: not published yet', closable: true, closeLabel: 'Close' }, 'The package is not on the registry yet.'),
    ]);
    // Empty: nothing drawn, no space, nothing exposed — the glyph, the action and the close button alone are not a notice.
    const empty = host(page, 'empty');
    expect(await empty.boundingBox()).toBeNull();
    expect(await empty.evaluate((el) => getComputedStyle(el).display)).toBe('none');
    expect(await empty.getAttribute('role')).toBeNull();
    expect(await empty.getAttribute('aria-label')).toBeNull();
    near((await box(stage(page, 'empty'))).height, 32, 'the stage holds its padding alone');
    await expect(page.getByRole('button', { name: 'Reload' })).toHaveCount(0);
    // It draws once it has something to say, and nothing again without it.
    await empty.evaluate((el) => el.append('Now it has a body.'));
    await expect(empty).toBeVisible();
    expect(await empty.getAttribute('role')).toBe('note');
    await empty.evaluate((el) => [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).forEach((n) => n.remove()));
    await expect(empty).toBeHidden();
    await empty.evaluate((el: HTMLElement & { headline: string }) => (el.headline = 'A title is a notice'));
    await expect(empty).toBeVisible();
    // The others still render.
    for (const id of ['no-words', 'no-name', 'no-status', 'fine']) await expect(host(page, id)).toBeVisible();
    await expect(part(page, 'no-words', '.icon .ink')).toHaveText('warning');
    await expect(close(page, 'no-name')).toBeVisible();
    expect(await closeBox(page, 'no-name').getAttribute('aria-label')).toBeNull();
    expect(await part(page, 'no-status', '.status-label').count()).toBe(0);
    await expect.poll(() => seen.filter((w) => w.includes('CLO-31')).length).toBeGreaterThanOrEqual(4);
    const of = (id: string) => seen.filter((w) => w.includes('CLO-31')).join('\n');
    expect(of('all')).toContain('has no title and no body');
    expect(of('all')).toContain('the status is not given in words');
    expect(of('all')).toContain('the close button has no accessible name');
    expect(of('all')).toContain('is ignored while status is default');
    // A callout that has what it needs reports nothing: four reports, one for each of the four above.
    expect(seen.filter((w) => w.includes('CLO-31'))).toHaveLength(4);
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

  test('no axe violations with a prose body, a link, a heading as the title and a live callout that was opened', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mount(
        page,
        [
          fx('rich', { status: 'warning', closable: true, closeLabel: 'Close' }, `<h3 slot="title">Pre-release: not published yet</h3>${prose('<p>The package is not on the registry yet. <a href="#x">Read why</a>.</p><ul><li>One point</li><li>Another</li></ul>')}`),
          ...FORMS.map((status) => fx(`link-${status}`, { status, title: 'A title' }, prose('<p>Text with <a href="#x">a link in it</a>.</p>'))),
          fx('opened', { status: 'error', statusLabel: 'Error', title: 'Three fields need attention', live: true, open: false }, 'Enter a name.', { slots: { actions: ['Go to the first field'] } }),
        ],
        { theme },
      );
      await withProse(page);
      await host(page, 'opened').evaluate((el: HTMLElement & { open: boolean }) => (el.open = true));
      await expect.poll(async () => (await announced(page, 'opened')).assertive).not.toBe('');
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('every fixture is a note or a live region named as the spec says, with its text in reading order: the status in words, the title, the body, the actions, the close button', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      const callout = host(page, f.id);
      const status = String(f.props.status ?? 'default');
      const expected = f.props.live ? (status === 'warning' || status === 'error' ? 'alert' : 'status') : 'note';
      expect(await callout.getAttribute('role'), f.id).toBe(expected);
      const title = f.slots?.title ?? f.props.title;
      const name = title ?? (status !== 'default' ? f.props.statusLabel : undefined);
      if (name) await expect(stage(page, f.id).getByRole(expected, { name: String(name), exact: true }), f.id).toHaveCount(1);
      // The glyph is never exposed.
      expect(await part(page, f.id, '.lead').getAttribute('aria-hidden'), f.id).toBe('true');
    }
    await expect(host(page, 'closable-title-actions')).toMatchAriaSnapshot(`
      - alert "Three fields need attention":
        - text: Three fields need attention Enter a name, choose a start date, and give an address that can receive mail.
        - button "Go to the first field"
        - button "Close"
    `);
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the glyph, the title, the actions and the close button the spec gives it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(38);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      const status = String(f.props.status ?? 'default');
      const b = await box(host(page, f.id));
      expect(b.width, f.id).toBe(368);
      expect(b.height, f.id).toBeGreaterThan(40);
      expect(await part(page, f.id, '.lead').isVisible(), `${f.id} glyph`).toBe(status !== 'default' || !!f.slots?.icon);
      expect(await part(page, f.id, '.title').isVisible(), `${f.id} title`).toBe(!!f.props.title || !!f.slots?.title);
      expect(await part(page, f.id, '.body').isVisible(), `${f.id} body`).toBe(!!f.content);
      expect(await part(page, f.id, '.actions').isVisible(), `${f.id} actions`).toBe(!!f.slots?.actions);
      expect(await close(page, f.id).count(), `${f.id} close`).toBe(f.props.closable ? 1 : 0);
      if (f.content) await expect(host(page, f.id)).toContainText(f.content);
      // Every glyph is drawn by the icon set.
      for (const glyph of await host(page, f.id).locator('.lead > .icon').all()) if (await glyph.isVisible()) await expect.poll(() => glyph.getAttribute('data-drawn'), { message: f.id }).not.toBeNull();
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
