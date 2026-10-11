// <tanrei-divider>, driven by specs/divider.spec.json: every behaviour id (DIV-1…14) is cited by a test title, every
// fixture has a baseline, and every length and color is read back from the tokens — never from a number written here.
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, tab, rootTokens } from '../../../test/harness.js';
import { decodePng, paintedColor } from '../../../test/png.js';

const spec = loadSpec('divider');
type P = Page;
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-divider`);
const line = (page: P, id: string) => host(page, id).locator('.line');
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const T = (name: string) => `--tanrei-comp-divider-${name}`;
const box = async (locator: ReturnType<P['locator']>) => (await locator.boundingBox())!;
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
/** The content box of a fixture's stage: the container the divider spans. */
const container = (page: P, id: string) =>
  stage(page, id).evaluate((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const [t, rr, b, l] = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(Number.parseFloat);
    return { x: r.x + l, y: r.y + t, width: r.width - l - rr, height: r.height - t - b };
  });
/** Captures what the page reports in debug builds (console warnings). Call before mounting. */
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning') seen.push(message.text()); });
  return seen;
}
const fixture = (id: string, props: Fixture['props']): Fixture => ({ id, props });
const props = (id: string) => spec.fixtures.find((f) => f.id === id)!.props as Record<string, unknown>;
const styleOf = (id: string) => (props(id).lineStyle as string | undefined) ?? 'solid';
/** The thickness a fixture gives its own line (DIV-16), or null where it takes the token. */
const given = (id: string) => (props(id).thickness as number | undefined) ?? null;
const HORIZONTAL = spec.fixtures.filter((f) => f.id.startsWith('horizontal')).map((f) => f.id);
const VERTICAL = spec.fixtures.filter((f) => f.id.startsWith('vertical')).map((f) => f.id);
const WAVY = spec.fixtures.filter((f) => f.props.lineStyle === 'wavy').map((f) => f.id);
/** The fixtures drawn as a bordered line: solid, dotted and dashed. */
const STRAIGHT = spec.fixtures.filter((f) => f.props.lineStyle !== 'wavy').map((f) => f.id);
const SOLID = STRAIGHT.filter((id) => styleOf(id) === 'solid');
/** A line that is not translucent, where a test reads the geometry of dots, dashes and caps from the pixels. */
const OPAQUE = { [T('line-color')]: 'var(--tanrei-sys-color-on-surface)' };

/**
 * The ink along a divider's line through the middle of its cross axis, as runs [from, to] in CSS px from the host's
 * start (its left or top), read from the pixels. An end along the line is antialiased, so by default a pixel is ink when
 * the line covers at least half of it; `any` counts every pixel that is not the surface.
 */
async function inkRuns(
  page: P,
  id: string,
  { any = false, shot: given, color }: { any?: boolean; shot?: ReturnType<typeof decodePng>; color?: string } = {},
): Promise<[number, number][]> {
  const [s, own] = [await box(stage(page, id)), await box(host(page, id))];
  const shot = given ?? decodePng(await stage(page, id).screenshot({ animations: 'disabled' }));
  const dpr = await page.evaluate(() => devicePixelRatio);
  const surface = await resolveColor(page, '--tanrei-sys-color-surface');
  const red = (c: string) => Number(c.match(/\d+/)![0]);
  const [bare, full] = [red(surface), red(color ?? (await paintedColor(page, `var(${T('line-color')})`)))];
  const covered = (c: string) => (any ? c !== surface : (bare - red(c)) / (bare - full) >= 0.5);
  const vertical = id.startsWith('vertical');
  const from = Math.round((vertical ? own.y - s.y : own.x - s.x) * dpr);
  const length = Math.round((vertical ? own.height : own.width) * dpr);
  const pixel = (across: number, i: number) => (vertical ? shot.at(across, from + i) : shot.at(from + i, across));
  // A wave is read along its midline. A straight line is read along the device row (or column) its snapped border
  // painted — a hairline thinner than a device pixel may be rounded onto the row next to where layout put it.
  const [lo, extent] = vertical ? [own.x - s.x, own.width] : [own.y - s.y, own.height];
  const wavy = (await host(page, id).locator('.wave').count()) > 0;
  const candidates = wavy ? [Math.floor((lo + extent / 2) * dpr)] : Array.from({ length: Math.ceil((lo + extent) * dpr) - Math.floor(lo * dpr) + 2 }, (_, k) => Math.floor(lo * dpr) - 1 + k);
  const inkIn = (across: number) => Array.from({ length }, (_, i) => covered(pixel(across, i))).filter(Boolean).length;
  const across = candidates.reduce((best, c) => (inkIn(c) > inkIn(best) ? c : best), candidates[0]);
  const runs: [number, number][] = [];
  let open = -1;
  for (let i = 0; i <= length; i++) {
    const ink = i < length && covered(pixel(across, i));
    if (ink && open < 0) open = i;
    else if (!ink && open >= 0) (runs.push([open / dpr, i / dpr]), (open = -1));
  }
  return runs;
}

/**
 * DIV-10 / DIV-11, written out independently of the component: over a drawn length L, dashes of d at least g apart —
 * as many as fit, the first at the start and the last at the end, the gaps widened equally; one fits: centered, no
 * longer than L.
 */
function pattern(length: number, dash: number, gap: number, offset = 0): [number, number][] {
  const count = Math.floor((length + gap) / (dash + gap));
  if (count >= 2) {
    const pitch = dash + (length - count * dash) / (count - 1);
    return Array.from({ length: count }, (_, i) => [offset + i * pitch, offset + i * pitch + dash]);
  }
  const one = Math.min(dash, length);
  return one > 0 ? [[offset + (length - one) / 2, offset + (length + one) / 2]] : [];
}

/**
 * Runs match to within one device pixel at each edge: an edge along the line is not snapped and blends (DIV-8), and it
 * is read at device-pixel resolution. Far less than any pitch, so a dash too many, too few or out of place fails.
 */
function expectRuns(actual: [number, number][], expected: [number, number][], label: string) {
  expect(actual.length, `${label}: ${JSON.stringify(actual)}`).toBe(expected.length);
  actual.forEach(([a, b], i) => {
    expect(Math.abs(a - expected[i][0]), `${label}: start of ${i} (${a} vs ${expected[i][0]})`).toBeLessThanOrEqual(0.51);
    expect(Math.abs(b - expected[i][1]), `${label}: end of ${i} (${b} vs ${expected[i][1]})`).toBeLessThanOrEqual(0.51);
  });
}

/** The wave as drawn: its path data, points along it in the host's CSS px, and its stroke. */
function wave(page: P, id: string) {
  return host(page, id).evaluate((el) => {
    const path = el.shadowRoot!.querySelector<SVGPathElement>('.wave path')!;
    const d = path.getAttribute('d') ?? '';
    const total = d ? path.getTotalLength() : 0;
    const points = d ? Array.from({ length: 801 }, (_, i) => path.getPointAtLength((total * i) / 800)).map((p) => [p.x, p.y] as [number, number]) : [];
    const style = getComputedStyle(path);
    return { d, points, width: Number(path.getAttribute('stroke-width')), cap: style.strokeLinecap, stroke: style.stroke };
  });
}
const radii = (d: string) => [...d.matchAll(/A (\S+) (\S+) 0 0 ([01])/g)].map((m) => ({ r: Number(m[1]), sweep: Number(m[3]) }));

test.describe('behavior', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  test('DIV-1: one line of line.thickness — or of thickness while it is given — in line.color, in the style lineStyle names, along the full inline size (horizontal) or block size (vertical)', async ({ page }) => {
    const thickness = await resolveToken(page, T('line-thickness'));
    const color = await resolveColor(page, T('line-color'));
    expect(thickness).toBe(1);
    for (const id of STRAIGHT) {
      const vertical = id.startsWith('vertical');
      const side = vertical ? 'left' : 'top';
      const drawn = await line(page, id).evaluate((el, s) => {
        const c = getComputedStyle(el);
        return { width: Number.parseFloat(c.getPropertyValue(`border-${s}-width`)), style: c.getPropertyValue(`border-${s}-style`), color: c.getPropertyValue(`border-${s}-color`) };
      }, side);
      expect(drawn, id).toEqual({ width: given(id) ?? thickness, style: 'solid', color });
      // Only one side is drawn: one line, not a box.
      const others = await line(page, id).evaluate((el, s) => ['top', 'right', 'bottom', 'left'].filter((x) => x !== s).map((x) => getComputedStyle(el).getPropertyValue(`border-${x}-style`)), side);
      expect(others, id).toEqual(['none', 'none', 'none']);
      // Solid is the plain border; dotted and dashed are that border under the pattern's mask (DIV-10, DIV-11).
      const mask = await line(page, id).evaluate((el) => getComputedStyle(el).maskImage);
      if (styleOf(id) === 'solid' && props(id).lineCap !== 'round') expect(mask, id).toBe('none');
      else expect(mask, id).not.toBe('none');
    }
    for (const id of WAVY) {
      const drawn = await wave(page, id);
      expect([drawn.width, drawn.stroke], id).toEqual([thickness, color]);
      expect(drawn.d, id).toMatch(/^M .* A /);
      expect(await host(page, id).locator('.line').count(), id).toBe(0);
    }
    for (const id of [...HORIZONTAL, ...VERTICAL]) {
      const [own, room] = [await box(host(page, id)), await container(page, id)];
      if (id.startsWith('vertical')) expect([own.y, own.height], id).toEqual([room.y, room.height]);
      else expect([own.x, own.width], id).toEqual([room.x, room.width]);
    }
    // The defaults: horizontal, solid, butt.
    expect(await host(page, 'horizontal').evaluate((el: any) => [el.orientation, el.lineStyle, el.lineCap])).toEqual(['horizontal', 'solid', 'butt']);
  });

  test('DIV-1: a horizontal divider spans its container in block flow, a flex column and a grid; a vertical one in a flex row and a grid', async ({ page }) => {
    const cases = [
      ['horizontal', 'display: block; inline-size: 200px'],
      ['horizontal', 'display: flex; flex-direction: column; align-items: flex-start; inline-size: 200px'],
      ['horizontal', 'display: grid; place-items: center; inline-size: 200px; block-size: 40px'],
      ['vertical', 'display: flex; align-items: center; block-size: 40px'],
      ['vertical', 'display: grid; place-items: center; block-size: 40px'],
      ['horizontal-dashed', 'display: flex; flex-direction: column; align-items: flex-start; inline-size: 200px'],
      ['horizontal-wavy', 'display: grid; place-items: center; inline-size: 200px; block-size: 40px'],
      ['vertical-dotted', 'display: grid; place-items: center; block-size: 40px'],
      ['vertical-wavy', 'display: flex; align-items: center; block-size: 40px'],
    ] as const;
    for (const [id, layout] of cases) {
      await stage(page, id).evaluate((el, css) => el.setAttribute('style', css), layout);
      const [own, room] = [await box(host(page, id)), await container(page, id)];
      if (id.startsWith('vertical')) expect(own.height, `${id}: ${layout}`).toBe(room.height);
      else expect(own.width, `${id}: ${layout}`).toBe(room.width);
    }
  });

  test('DIV-2: exactly line.thickness across (a wavy one twice its amplitude plus the thickness), no margin or padding of its own', async ({ page }) => {
    const thickness = await resolveToken(page, T('line-thickness'));
    const amplitude = await resolveToken(page, T('line-wave-amplitude'));
    for (const id of [...HORIZONTAL, ...VERTICAL]) {
      const own = await box(host(page, id));
      const crest = props(id).amplitude as number | undefined;
      const across = styleOf(id) === 'wavy' ? 2 * (crest ?? amplitude) + thickness : (given(id) ?? thickness);
      expect(id.startsWith('vertical') ? own.width : own.height, id).toBe(across);
      const spacing = await host(page, id).evaluate((el) => { const s = getComputedStyle(el); return [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft, s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft]; });
      expect(new Set(spacing), id).toEqual(new Set(['0px']));
    }
    expect(amplitude).toBe(2 * thickness);
    // Between two blocks in a flex column: they are exactly the cross size apart (and so for a vertical one in a row).
    for (const [id, layout] of [['horizontal', 'display: flex; flex-direction: column'], ['vertical', 'display: flex'], ['horizontal-wavy', 'display: flex; flex-direction: column'], ['vertical-wavy', 'display: flex']] as const) {
      await stage(page, id).evaluate((el, css) => {
        el.setAttribute('style', css);
        for (const where of ['afterbegin', 'beforeend'] as const) el.insertAdjacentHTML(where, '<div class="block" style="inline-size: 24px; block-size: 24px; background: currentColor"></div>');
      }, layout);
      const [a, b] = await Promise.all([0, 1].map((i) => box(stage(page, id).locator('.block').nth(i))));
      const gap = id.startsWith('vertical') ? b.x - (a.x + a.width) : b.y - (a.y + a.height);
      expect(gap, id).toBe(styleOf(id) === 'wavy' ? 2 * amplitude + thickness : thickness);
    }
    // Whatever its length: a wave too short for its amplitude keeps the cross size it asked for.
    await mountFixtures(page, spec, { fixtures: [fixture('horizontal-steep', { lineStyle: 'wavy', amplitude: 20, wavelength: 16 })] });
    expect((await box(host(page, 'horizontal-steep'))).height).toBe(2 * 20 + thickness);
    await stage(page, 'horizontal-steep').evaluate((el) => (el.style.inlineSize = '24px'));
    expect((await box(host(page, 'horizontal-steep'))).height).toBe(2 * 20 + thickness);
  });

  test('DIV-3: inset start shortens the line by insetLength or line.inset at its start, inset both at each end; the inset stretch draws nothing', async ({ page }) => {
    const inset = await resolveToken(page, T('line-inset'));
    expect(inset).toBeGreaterThan(0);
    const expectLine = async (id: string, start: number, end: number) => {
      const [own, drawn] = [await box(host(page, id)), await box(line(page, id))];
      if (id.startsWith('vertical')) expect([drawn.y - own.y, own.y + own.height - (drawn.y + drawn.height)], id).toEqual([start, end]);
      else expect([drawn.x - own.x, own.x + own.width - (drawn.x + drawn.width)], id).toEqual([start, end]);
    };
    await expectLine('horizontal', 0, 0);
    await expectLine('horizontal-inset-start', inset, 0);
    await expectLine('horizontal-inset-both', inset, inset);
    await expectLine('vertical', 0, 0);
    await expectLine('vertical-inset-start', inset, 0); // the top of a vertical divider
    await expectLine('vertical-inset-both', inset, inset);
    // insetLength replaces the token for this divider.
    const given = props('horizontal-inset-start-length').insetLength as number;
    expect(given).not.toBe(inset);
    await expectLine('horizontal-inset-start-length', given, 0);
    // The stretch is the surface behind, pixel for pixel; the line is the line color.
    const [surface, color] = [await resolveColor(page, '--tanrei-sys-color-surface'), await paintedColor(page, `var(${T('line-color')})`)];
    for (const id of ['horizontal-inset-both', 'vertical-inset-both']) {
      const shot = decodePng(await stage(page, id).screenshot({ animations: 'disabled' }));
      const [s, own] = [await box(stage(page, id)), await box(host(page, id))];
      const dpr = await page.evaluate(() => devicePixelRatio);
      const vertical = id.startsWith('vertical');
      // Sample the middle of the inset stretch at each end, and the middle of the line, on the line's own axis.
      const along = (at: number) => (vertical ? [own.x - s.x + 0.5, own.y - s.y + at] : [own.x - s.x + at, own.y - s.y + 0.5]).map((v) => Math.floor(v * dpr));
      const length = vertical ? own.height : own.width;
      expect(shot.at(...(along(inset / 2) as [number, number])), `${id}: start stretch`).toBe(surface);
      expect(shot.at(...(along(length - inset / 2) as [number, number])), `${id}: end stretch`).toBe(surface);
      expect(shot.at(...(along(length / 2) as [number, number])), `${id}: line`).toBe(color);
    }
    // The style is laid out over the stretch that remains: whole dashes from one inset to the other.
    const width = (await box(host(page, 'horizontal-inset-both-dashed'))).width;
    const [dash, gap] = [await resolveToken(page, T('line-dash-length')), await resolveToken(page, T('line-dash-gap'))];
    expectRuns(await inkRuns(page, 'horizontal-inset-both-dashed'), pattern(width - 2 * inset, dash, gap, inset), 'horizontal-inset-both-dashed');
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('horizontal-wavy-inset', { lineStyle: 'wavy', inset: 'start', insetLength: 40 }),
        ...['solid', 'dotted', 'dashed', 'wavy'].map((s) => fixture(`horizontal-none-${s}`, { lineStyle: s, inset: 'both' })),
      ],
    });
    const w = await wave(page, 'horizontal-wavy-inset');
    expect(Math.min(...w.points.map(([x]) => x))).toBeCloseTo(40, 1);
    expect(Math.max(...w.points.map(([x]) => x))).toBeCloseTo(width, 1);
    // Where the insets leave no length the divider draws nothing, in every style.
    for (const s of ['solid', 'dotted', 'dashed', 'wavy']) {
      const id = `horizontal-none-${s}`;
      await stage(page, id).evaluate((el, room) => (el.style.inlineSize = `${room}px`), inset * 2);
      expect(await inkRuns(page, id, { any: true }), id).toEqual([]);
      await stage(page, id).evaluate((el, room) => (el.style.inlineSize = `${room}px`), inset);
      expect(await inkRuns(page, id, { any: true }), `${id}, insets past each other`).toEqual([]);
    }
  });

  test('DIV-4: in RTL the start inset of a horizontal divider is at its right end and a wave starts there, mirrored; a vertical divider does not change', async ({ page }) => {
    const inset = await resolveToken(page, T('line-inset'));
    const ltrWave = await wave(page, 'vertical-wavy');
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const [own, drawn] = [await box(host(page, 'horizontal-inset-start')), await box(line(page, 'horizontal-inset-start'))];
    expect([drawn.x - own.x, own.x + own.width - (drawn.x + drawn.width)]).toEqual([0, inset]);
    const [v, vd] = [await box(host(page, 'vertical-inset-start')), await box(line(page, 'vertical-inset-start'))];
    expect([vd.y - v.y, v.y + v.height - (vd.y + vd.height)]).toEqual([inset, 0]);
    // Both ends: the same either way.
    const [b, bd] = [await box(host(page, 'horizontal-inset-both')), await box(line(page, 'horizontal-inset-both'))];
    expect([bd.x - b.x, b.x + b.width - (bd.x + bd.width)]).toEqual([inset, inset]);
    // A horizontal wave: its first arc — toward the top — is now at the right end, the picture mirrored.
    expect(await firstCrestAbove(page, 'horizontal-wavy', 'right')).toBe(true);
    expect(await host(page, 'horizontal-wavy').locator('.wave').evaluate((el) => getComputedStyle(el).transform)).toBe('matrix(-1, 0, 0, 1, 0, 0)');
    // A vertical wave is the same path, not turned.
    expect(await wave(page, 'vertical-wavy')).toEqual(ltrWave);
    expect(await host(page, 'vertical-wavy').locator('.wave').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    await page.evaluate(() => document.documentElement.removeAttribute('dir'));
    expect(await firstCrestAbove(page, 'horizontal-wavy', 'left')).toBe(true);
  });

  test('DIV-5: decorative (the default) is hidden from assistive technology and not focusable', async ({ page }) => {
    const decorative = spec.fixtures.filter((f) => f.props.decorative !== false).map((f) => f.id);
    for (const id of decorative) {
      await expect(host(page, id), id).toHaveAttribute('aria-hidden', 'true');
      await expect(host(page, id), id).not.toHaveAttribute('role');
      expect(await host(page, id).evaluate((el) => (el as any).decorative), id).toBe(true);
      expect(await stage(page, id).ariaSnapshot(), id).toBe('');
    }
    await expect(page.getByRole('separator')).toHaveCount(spec.fixtures.length - decorative.length);
    await expectNotFocusable(page, decorative);
  });

  test('DIV-6: decorative false exposes the separator role and its orientation, with no name, and is not focusable', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [
        ...spec.fixtures,
        fixture('vertical-separator', { orientation: 'vertical', decorative: false }),
        fixture('wavy-separator', { lineStyle: 'wavy', decorative: false }),
        fixture('switched', {}),
      ],
    });
    await expect(host(page, 'horizontal-separator')).toHaveAttribute('role', 'separator');
    await expect(host(page, 'horizontal-separator')).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(host(page, 'horizontal-separator')).not.toHaveAttribute('aria-hidden');
    await expect(host(page, 'vertical-separator')).toHaveAttribute('aria-orientation', 'vertical');
    // The style carries nothing: a wavy separator is the same separator.
    for (const id of ['horizontal-separator', 'vertical-separator', 'wavy-separator']) {
      await expect(host(page, id), id).toHaveAccessibleName('');
      expect(await stage(page, id).ariaSnapshot(), id).toBe('- separator');
    }
    // The property switches it, both ways, and the orientation follows.
    await host(page, 'switched').evaluate((el) => ((el as any).decorative = false));
    await expect(host(page, 'switched')).toHaveAttribute('role', 'separator');
    await host(page, 'switched').evaluate((el) => ((el as any).orientation = 'vertical'));
    await expect(host(page, 'switched')).toHaveAttribute('aria-orientation', 'vertical');
    await host(page, 'switched').evaluate((el) => el.setAttribute('decorative', ''));
    await expect(host(page, 'switched')).toHaveAttribute('aria-hidden', 'true');
    await expect(host(page, 'switched')).not.toHaveAttribute('role');
    await expect(host(page, 'switched')).not.toHaveAttribute('aria-orientation');
    await host(page, 'switched').evaluate((el) => el.setAttribute('decorative', 'false'));
    await expect(host(page, 'switched')).toHaveAttribute('role', 'separator');
    await expectNotFocusable(page, ['horizontal-separator', 'vertical-separator', 'wavy-separator', 'switched']);
  });

  test('DIV-7: an orientation, inset, lineStyle or lineCap the divider does not define renders as the default, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('plain', {}),
        fixture('diagonal', { orientation: 'diagonal' }),
        fixture('middle', { inset: 'middle' }),
        fixture('zigzag', { lineStyle: 'zigzag' }),
        fixture('square', { lineCap: 'square' }),
      ],
    });
    const plain = await box(host(page, 'plain'));
    for (const id of ['diagonal', 'middle', 'zigzag', 'square']) {
      expect(await box(host(page, id)), id).toMatchObject({ width: plain.width, height: plain.height });
      const [own, drawn] = [await box(host(page, id)), await box(line(page, id))];
      expect([drawn.x, drawn.width], id).toEqual([own.x, own.width]);
      // Solid and butt: the plain border, no pattern and no caps.
      expect(await line(page, id).evaluate((el) => getComputedStyle(el).maskImage), id).toBe('none');
    }
    await expect.poll(() => seen.filter((w) => w.includes('DIV-7')).length).toBe(4);
    expect(seen).toEqual(expect.arrayContaining([
      expect.stringMatching(/<tanrei-divider>: orientation "diagonal" is not a value of the divider; it is drawn as "horizontal" \(DIV-7\)/),
      expect.stringMatching(/<tanrei-divider>: inset "middle" is not a value of the divider; it is drawn as "none" \(DIV-7\)/),
      expect.stringMatching(/<tanrei-divider>: lineStyle "zigzag" is not a value of the divider; it is drawn as "solid" \(DIV-7\)/),
      expect.stringMatching(/<tanrei-divider>: lineCap "square" is not a value of the divider; it is drawn as "butt" \(DIV-7\)/),
    ]));
    // An unknown orientation is still exposed as horizontal when the divider is a separator.
    await host(page, 'diagonal').evaluate((el) => ((el as any).decorative = false));
    await expect(host(page, 'diagonal')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  test('DIV-8: a solid line is at least one device pixel thick and on the device pixel grid, wherever the layout puts it', async ({ page }) => {
    await expectOnGrid(page, () => [fixture('horizontal', {}), fixture('vertical', { orientation: 'vertical' })]);
  });

  test('DIV-8: a dotted or dashed line is at least one device pixel thick and on the device pixel grid across, wherever the layout puts it', async ({ page }) => {
    await expectOnGrid(page, (thickness) => [
      fixture('horizontal-dashed', { lineStyle: 'dashed' }),
      fixture('vertical-dashed', { orientation: 'vertical', lineStyle: 'dashed' }),
      // A dot is as long as the line is thick: one thinner than a device pixel blends along the line, so only across.
      ...(thickness === '0.25px' ? [] : [fixture('horizontal-dotted', { lineStyle: 'dotted' }), fixture('vertical-dotted', { orientation: 'vertical', lineStyle: 'dotted' })]),
    ]);
  });

  test('DIV-8: a wavy line is at least one device pixel thick and antialiased', async ({ page }) => {
    const dpr = await page.evaluate(() => devicePixelRatio);
    for (const thickness of ['var(--tanrei-sys-border-hairline)', '0.25px']) {
      await mountFixtures(page, spec, { fixtures: [fixture('horizontal-w', { lineStyle: 'wavy' })] });
      await override(page, { [T('line-thickness')]: thickness });
      const css = await resolveToken(page, T('line-thickness'));
      await expect.poll(async () => (await wave(page, 'horizontal-w')).width, thickness).toBe(Math.max(css, 1 / dpr));
    }
    await mountFixtures(page, spec, { fixtures: [fixture('horizontal-w', { lineStyle: 'wavy' })] });
    await override(page, OPAQUE);
    const [color, surface] = [await paintedColor(page, `var(${T('line-color')})`), await resolveColor(page, '--tanrei-sys-color-surface')];
    const shot = decodePng(await stage(page, 'horizontal-w').screenshot({ animations: 'disabled' }));
    const pixels = Array.from({ length: shot.width * shot.height }, (_, i) => shot.at(i % shot.width, Math.floor(i / shot.width)));
    expect(pixels.filter((c) => c === color).length, 'the stroke is drawn').toBeGreaterThan(0);
    expect(pixels.filter((c) => c !== color && c !== surface).length, 'the curve is antialiased').toBeGreaterThan(0);
  });

  test('DIV-9: solid draws one unbroken stroke over the whole drawn stretch', async ({ page }) => {
    const inset = await resolveToken(page, T('line-inset'));
    for (const id of SOLID.filter((i) => props(i).lineCap !== 'round')) {
      const own = await box(host(page, id));
      const length = id.startsWith('vertical') ? own.height : own.width;
      const i = props(id).inset as string | undefined;
      const start = i ? ((props(id).insetLength as number | undefined) ?? inset) : 0;
      const end = i === 'both' ? inset : 0;
      expect(await inkRuns(page, id), id).toEqual([[start, length - end]]);
    }
  });

  test('DIV-10: dotted draws dots line.thickness long, at least line.dot.gap apart, whole at both ends with the gaps widened equally; one centered dot', async ({ page }) => {
    const [thickness, gap] = [await resolveToken(page, T('line-thickness')), await resolveToken(page, T('line-dot-gap'))];
    expect(gap).toBe(2 * thickness);
    for (const id of ['horizontal-dotted', 'horizontal-dotted-round', 'vertical-dotted']) {
      const own = await box(host(page, id));
      const expected = pattern(id.startsWith('vertical') ? own.height : own.width, thickness, gap);
      expect(expected.length, id).toBeGreaterThan(2);
      expectRuns(await inkRuns(page, id), expected, id);
    }
    // At a length that is not a whole number of pitches the gaps widen; where one dot fits it is centered.
    await mountFixtures(page, spec, { fixtures: [fixture('horizontal-a', { lineStyle: 'dotted' }), fixture('horizontal-one', { lineStyle: 'dotted' })] });
    await override(page, { ...OPAQUE, [T('line-thickness')]: '4px' });
    const [t4, g4] = [await resolveToken(page, T('line-thickness')), await resolveToken(page, T('line-dot-gap'))];
    for (const [id, room] of [['horizontal-a', 61], ['horizontal-one', 2 * t4 + g4 - 1]] as const) {
      await stage(page, id).evaluate((el, r) => (el.style.inlineSize = `${r}px`), room);
      expectRuns(await inkRuns(page, id), pattern(room, t4, g4), `${id} (${room}px)`);
    }
    expect((await inkRuns(page, 'horizontal-one')).length).toBe(1);
  });

  test('DIV-11: dashed draws dashes of dashLength (never shorter than the thickness), at least gap apart, whole at both ends; one centered dash no longer than the stretch', async ({ page }) => {
    const thickness = await resolveToken(page, T('line-thickness'));
    const [dash, gap] = [await resolveToken(page, T('line-dash-length')), await resolveToken(page, T('line-dash-gap'))];
    expect([dash, gap]).toEqual([4 * thickness, 4 * thickness]);
    for (const id of ['horizontal-dashed', 'horizontal-dashed-round', 'horizontal-dashed-custom']) {
      const own = await box(host(page, id));
      const expected = pattern(own.width, (props(id).dashLength as number | undefined) ?? dash, (props(id).gap as number | undefined) ?? gap);
      expect(expected.length, id).toBeGreaterThan(2);
      expectRuns(await inkRuns(page, id), expected, id);
    }
    await mountFixtures(page, spec, {
      fixtures: [
        fixture('horizontal-one', { lineStyle: 'dashed' }),
        fixture('horizontal-short', { lineStyle: 'dashed' }),
        fixture('horizontal-thin-dash', { lineStyle: 'dashed', dashLength: 1 }),
      ],
    });
    await override(page, { ...OPAQUE, [T('line-thickness')]: '4px' });
    const [t4, d4, g4] = await Promise.all(['line-thickness', 'line-dash-length', 'line-dash-gap'].map((n) => resolveToken(page, T(n))));
    // One fits: centered; the stretch is shorter than a dash: the dash is the stretch.
    for (const [id, room] of [['horizontal-one', 2 * d4 + g4 - 2], ['horizontal-short', d4 - 3]] as const) {
      await stage(page, id).evaluate((el, r) => (el.style.inlineSize = `${r}px`), room);
      expectRuns(await inkRuns(page, id), pattern(room, d4, g4), `${id} (${room}px)`);
    }
    // A dash shorter than the thickness is drawn as long as the line is thick.
    const own = await box(host(page, 'horizontal-thin-dash'));
    expectRuns(await inkRuns(page, 'horizontal-thin-dash'), pattern(own.width, t4, g4), 'horizontal-thin-dash');
  });

  test('DIV-12: wavy strokes circular arcs of half a fitted wavelength about the midline, crest at the amplitude (at most a quarter wavelength), first arc toward the top or the left', async ({ page }) => {
    const thickness = await resolveToken(page, T('line-thickness'));
    const [amplitude, wavelength] = [await resolveToken(page, T('line-wave-amplitude')), await resolveToken(page, T('line-wave-wavelength'))];
    expect([amplitude, wavelength]).toEqual([2 * thickness, 16 * thickness]);
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fixture('horizontal-steep', { lineStyle: 'wavy', amplitude: 20, wavelength: 16 })] });
    for (const id of [...WAVY, 'horizontal-steep']) {
      const vertical = id.startsWith('vertical');
      const own = await box(host(page, id));
      const [length, cross] = vertical ? [own.height, own.width] : [own.width, own.height];
      const p = id === 'horizontal-steep' ? { amplitude: 20, wavelength: 16 } : props(id);
      const waves = Math.max(1, Math.round(length / ((p.wavelength as number | undefined) ?? wavelength)));
      const fitted = length / waves;
      const crest = Math.min((p.amplitude as number | undefined) ?? amplitude, fitted / 4);
      const radius = ((fitted / 4) ** 2 + crest ** 2) / (2 * crest);
      const drawn = await wave(page, id);
      // A whole number of waves, two arcs each, every arc the same circle, alternating sides.
      const arcs = radii(drawn.d);
      expect(arcs.length, id).toBe(2 * waves);
      for (const [i, a] of arcs.entries()) {
        expect(a.r, `${id}: arc ${i}`).toBeCloseTo(radius, 2);
        expect(a.sweep, `${id}: arc ${i}`).toBe(arcs[0].sweep ^ (i % 2));
      }
      // It starts and ends on the midline, at the stretch's ends; its crests lie `crest` from the midline.
      const along = drawn.points.map(([x, y]) => (vertical ? y : x));
      const off = drawn.points.map(([x, y]) => (vertical ? x : y) - cross / 2);
      expect([along[0], off[0]], `${id}: start`).toEqual([expect.closeTo(0, 2), expect.closeTo(0, 2)]);
      expect([along.at(-1), off.at(-1)], `${id}: end`).toEqual([expect.closeTo(length, 2), expect.closeTo(0, 2)]);
      expect(Math.min(...off), `${id}: crest`).toBeCloseTo(-crest, 1);
      expect(Math.max(...off), `${id}: trough`).toBeCloseTo(crest, 1);
      // The first arc rises toward the top (horizontal) or the left (vertical): screen coordinates run down and right.
      const last = drawn.points.length - 1;
      expect(off[Math.round(last / (4 * waves))], `${id}: first arc`).toBeCloseTo(-crest, 1);
      // Where two arcs meet on the midline there is no corner: the direction just before and just after is the same
      // (a corner between these arcs would turn it by twice their angle to the midline, over a radian).
      const meet = Math.round(last / (2 * waves));
      const heading = (a: [number, number], b: [number, number]) => Math.atan2(b[1] - a[1], b[0] - a[0]);
      const turn = heading(drawn.points[meet], drawn.points[meet + 1]) - heading(drawn.points[meet - 1], drawn.points[meet]);
      expect(Math.abs(turn), `${id}: a corner where the arcs meet`).toBeLessThan(0.3);
    }
    // The capped wave is half circles: the radius is the crest, a quarter of the fitted wavelength.
    const steep = await box(host(page, 'horizontal-steep'));
    expect(radii((await wave(page, 'horizontal-steep')).d)[0].r).toBeCloseTo(steep.width / Math.round(steep.width / 16) / 4, 2);
    // Laid out again when its length changes.
    await stage(page, 'horizontal-wavy').evaluate((el) => (el.style.inlineSize = '100px'));
    await expect.poll(async () => radii((await wave(page, 'horizontal-wavy')).d).length).toBe(2 * Math.max(1, Math.round(100 / wavelength)));
  });

  test('DIV-13: round caps end the line, every dot, every dash and the wave in half-discs inside their lengths; butt ends are square and flush', async ({ page }) => {
    // The hairline is too thin to show a cap: a fixture layer draws these fixtures 4 thick (the spec's verify).
    const ids = ['horizontal-dotted', 'horizontal-dotted-round', 'horizontal-dashed', 'horizontal-dashed-round'];
    await mountFixtures(page, spec, {
      fixtures: [
        ...spec.fixtures.filter((f) => ids.includes(f.id)),
        fixture('horizontal-solid', { inset: 'both' }),
        fixture('horizontal-solid-round', { inset: 'both', lineCap: 'round' }),
        fixture('horizontal-wavy', { lineStyle: 'wavy', inset: 'start' }),
        fixture('horizontal-wavy-round', { lineStyle: 'wavy', inset: 'start', lineCap: 'round' }),
      ],
    });
    await override(page, { ...OPAQUE, [T('line-thickness')]: '4px' });
    const thickness = await resolveToken(page, T('line-thickness'));
    const inset = await resolveToken(page, T('line-inset'));
    const color = await paintedColor(page, `var(${T('line-color')})`);
    const dpr = await page.evaluate(() => devicePixelRatio);
    /** The pixel at a corner of the first dot, dash or line end, and at its middle. */
    const corners = async (id: string) => {
      const [s, own] = [await box(stage(page, id)), await box(host(page, id))];
      const shot = decodePng(await stage(page, id).screenshot({ animations: 'disabled' }));
      const [first] = await inkRuns(page, id);
      const x0 = Math.round((own.x - s.x + first[0]) * dpr);
      const y0 = Math.round((own.y - s.y) * dpr);
      return { corner: shot.at(x0, y0), middle: shot.at(x0 + Math.floor((thickness * dpr) / 2), y0 + Math.floor((thickness * dpr) / 2)), first };
    };
    for (const [butt, round] of [['horizontal-dotted', 'horizontal-dotted-round'], ['horizontal-dashed', 'horizontal-dashed-round'], ['horizontal-solid', 'horizontal-solid-round']]) {
      const [b, r] = [await corners(butt), await corners(round)];
      expect(b.corner, `${butt}: a square end`).toBe(color);
      expect(r.corner, `${round}: a rounded end`).not.toBe(color);
      expect([b.middle, r.middle], `${round}: both drawn`).toEqual([color, color]);
      // The rounded ends lie inside the same lengths: the dashes, the dots and the line cover the same stretches.
      expectRuns(await inkRuns(page, round), await inkRuns(page, butt), `${round} against ${butt}`);
    }
    // No rounded end reaches into an inset.
    expect((await inkRuns(page, 'horizontal-solid-round'))[0][0]).toBeGreaterThanOrEqual(inset - 0.5);
    // The wave's rounded ends are its first and last points, laid out over the stretch less half the thickness at each end.
    const [bw, rw] = [await wave(page, 'horizontal-wavy'), await wave(page, 'horizontal-wavy-round')];
    const width = (await box(host(page, 'horizontal-wavy'))).width;
    expect([bw.cap, rw.cap]).toEqual(['butt', 'round']);
    expect([bw.points[0][0], bw.points.at(-1)![0]]).toEqual([expect.closeTo(inset, 2), expect.closeTo(width, 2)]);
    expect([rw.points[0][0], rw.points.at(-1)![0]]).toEqual([expect.closeTo(inset + thickness / 2, 2), expect.closeTo(width - thickness / 2, 2)]);
  });

  test('DIV-14: a divider given no length holds no stylesheet of its own — two hundred of them share the static styles — and one is made when a length is first given; DIV-10: only a patterned line follows its size', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: Array.from({ length: 200 }, (_, i) => fixture(`horizontal-plain-${i}`, {})).concat([fixture('horizontal-thick', { thickness: 4 }), fixture('horizontal-dotted', { lineStyle: 'dotted' })]) });
    const sheets = () =>
      page.evaluate(() => {
        const own = new Set<CSSStyleSheet>();
        const shared = new Set<CSSStyleSheet>();
        const dividers = [...document.querySelectorAll('tanrei-divider')];
        const count = new Map<CSSStyleSheet, number>();
        for (const d of dividers) for (const sheet of d.shadowRoot!.adoptedStyleSheets) count.set(sheet, (count.get(sheet) ?? 0) + 1);
        for (const [sheet, n] of count) (n === dividers.length ? shared : own).add(sheet);
        return { shared: shared.size, own: own.size };
      });
    const before = await sheets();
    expect(before.shared).toBeGreaterThan(0);
    // The one given a thickness, and no other (the dotted one takes every length from its tokens).
    expect(before.own).toBe(1);
    expect(Number.parseFloat(await line(page, 'horizontal-thick').evaluate((el) => getComputedStyle(el).borderTopWidth))).toBe(4);
    // Given later: made then, and drawn.
    await host(page, 'horizontal-plain-0').evaluate((el: any) => ((el.thickness = 6), el.updateComplete));
    expect((await sheets()).own).toBe(2);
    expect(Number.parseFloat(await line(page, 'horizontal-plain-0').evaluate((el) => getComputedStyle(el).borderTopWidth))).toBe(6);
    // A pattern is laid out again when its line's length changes; it still is.
    const mask = () => line(page, 'horizontal-dotted').evaluate((el) => (el as HTMLElement).style.getPropertyValue('--_pattern'));
    const narrow = await mask();
    expect(narrow).not.toBe('');
    await stage(page, 'horizontal-dotted').evaluate((el) => ((el as HTMLElement).style.inlineSize = '311px'));
    await expect.poll(mask).not.toBe(narrow);
  });

  test('DIV-14: null lengths take their tokens; an invalid one takes its token and is reported; a given one is used as given; one the style does not draw is ignored', async ({ page }) => {
    const seen = warnings(page);
    const lengths = ['thickness', 'insetLength', 'dashLength', 'gap', 'amplitude', 'wavelength'];
    expect(await host(page, 'horizontal').evaluate((el: any, names) => names.map((n) => el[n]), lengths)).toEqual([null, null, null, null, null, null]);
    const invalid = {
      'horizontal-bad-inset': { inset: 'start', insetLength: -5 },
      'horizontal-bad-dash': { lineStyle: 'dashed', dashLength: 0 },
      'horizontal-bad-gap': { lineStyle: 'dotted', gap: 'wide' },
      'horizontal-bad-amplitude': { lineStyle: 'wavy', amplitude: 'Infinity' },
      'horizontal-bad-wavelength': { lineStyle: 'wavy', wavelength: 0 },
      'horizontal-negative-wavelength': { lineStyle: 'wavy', wavelength: -16 },
    };
    const ignored = {
      'horizontal-ignored-gap': { gap: -1 },
      'horizontal-ignored-amplitude': { lineStyle: 'dashed', amplitude: -1, wavelength: 0 },
      'horizontal-ignored-inset': { insetLength: -1 },
      'horizontal-ignored-dash': { lineStyle: 'dotted', dashLength: 0 },
    };
    await mountFixtures(page, spec, {
      fixtures: [
        ...spec.fixtures,
        fixture('horizontal-set-inset', { inset: 'start' }),
        ...Object.entries({ ...invalid, ...ignored }).map(([id, p]) => fixture(id, p)),
      ],
    });
    // Invalid: drawn as with the token.
    const [inset, amplitude, thickness] = [await resolveToken(page, T('line-inset')), await resolveToken(page, T('line-wave-amplitude')), await resolveToken(page, T('line-thickness'))];
    expect((await box(line(page, 'horizontal-bad-inset'))).x - (await box(host(page, 'horizontal-bad-inset'))).x).toBe(inset);
    expect(await inkRuns(page, 'horizontal-bad-dash')).toEqual(await inkRuns(page, 'horizontal-dashed'));
    expect(await inkRuns(page, 'horizontal-bad-gap')).toEqual(await inkRuns(page, 'horizontal-dotted'));
    expect((await box(host(page, 'horizontal-bad-amplitude'))).height).toBe(2 * amplitude + thickness);
    for (const id of ['horizontal-bad-amplitude', 'horizontal-bad-wavelength', 'horizontal-negative-wavelength']) expect((await wave(page, id)).d, id).toBe((await wave(page, 'horizontal-wavy')).d);
    await expect.poll(() => seen.filter((w) => w.includes('DIV-14')).length).toBe(Object.keys(invalid).length);
    expect(seen).toEqual(expect.arrayContaining([
      expect.stringMatching(/<tanrei-divider>: insetLength -5 is not a length the divider can draw; it takes comp\.divider\.line\.inset \(DIV-14\)/),
      expect.stringMatching(/dashLength 0 is not a length the divider can draw; it takes comp\.divider\.line\.dash\.length \(DIV-14\)/),
      expect.stringMatching(/gap NaN is not a length the divider can draw; it takes comp\.divider\.line\.dot\.gap or comp\.divider\.line\.dash\.gap \(DIV-14\)/),
      expect.stringMatching(/amplitude Infinity is not a length the divider can draw; it takes comp\.divider\.line\.wave\.amplitude \(DIV-14\)/),
      expect.stringMatching(/wavelength 0 is not a length the divider can draw; it takes comp\.divider\.line\.wave\.wavelength \(DIV-14\)/),
      expect.stringMatching(/wavelength -16 is not a length/),
    ]));
    // A prop the current style does not draw is ignored and not reported.
    expect(seen.filter((w) => w.includes('DIV-14') && /-1 |ignored/.test(w))).toEqual([]);
    expect(seen.filter((w) => /dashLength 0/.test(w)).length).toBe(1);
    expect(await inkRuns(page, 'horizontal-ignored-gap')).toEqual(await inkRuns(page, 'horizontal'));
    expect(await inkRuns(page, 'horizontal-ignored-amplitude')).toEqual(await inkRuns(page, 'horizontal-dashed'));
    // A given length is used as given, in CSS px: a thicker line (whose tokens derive from it) or a larger text size
    // changes the tokens, not the given lengths.
    const given = props('horizontal-dashed-custom') as { dashLength: number; gap: number };
    const insetLength = props('horizontal-inset-start-length').insetLength as number;
    await override(page, { [T('line-thickness')]: '2px' });
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    expect(await resolveToken(page, T('line-dash-length'))).toBe(8);
    const width = (await box(host(page, 'horizontal-dashed-custom'))).width;
    expectRuns(await inkRuns(page, 'horizontal-dashed-custom'), pattern(width, given.dashLength, given.gap), 'given dash and gap');
    expect((await box(line(page, 'horizontal-inset-start-length'))).x - (await box(host(page, 'horizontal-inset-start-length'))).x).toBe(insetLength);
    // Set as properties too, and back to null: the token again.
    await page.evaluate(() => (document.documentElement.style.fontSize = ''));
    const offset = async () => (await box(line(page, 'horizontal-set-inset'))).x - (await box(host(page, 'horizontal-set-inset'))).x;
    await host(page, 'horizontal-set-inset').evaluate((el: any) => (el.insetLength = 40));
    await expect.poll(offset).toBe(40);
    await host(page, 'horizontal-set-inset').evaluate((el: any) => (el.insetLength = null));
    await expect.poll(offset).toBe(inset);
  });
  test('DIV-14: a thickness of 0, a negative one or one that is not a number takes line.thickness and is reported, whatever the style; null takes the token and reports nothing', async ({ page }) => {
    const seen = warnings(page);
    const invalid = {
      'horizontal-zero': { thickness: 0 },
      'horizontal-negative': { thickness: -2 },
      'horizontal-word': { thickness: 'thick' },
      'vertical-zero': { orientation: 'vertical', thickness: 0 },
      'horizontal-dotted-zero': { lineStyle: 'dotted', thickness: 0 },
      'horizontal-wavy-negative': { lineStyle: 'wavy', thickness: -1 },
    };
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, ...Object.entries(invalid).map(([id, p]) => fixture(id, p))] });
    const [thickness, amplitude] = [await resolveToken(page, T('line-thickness')), await resolveToken(page, T('line-wave-amplitude'))];
    // The token's line: as thick, and the pattern the tokens give — not one scaled by a thickness that was not used.
    for (const id of ['horizontal-zero', 'horizontal-negative', 'horizontal-word']) expect((await box(host(page, id))).height, id).toBe(thickness);
    expect((await box(host(page, 'vertical-zero'))).width).toBe(thickness);
    expect(await inkRuns(page, 'horizontal-dotted-zero')).toEqual(await inkRuns(page, 'horizontal-dotted'));
    expect((await box(host(page, 'horizontal-wavy-negative'))).height).toBe(2 * amplitude + thickness);
    expect((await wave(page, 'horizontal-wavy-negative')).d).toBe((await wave(page, 'horizontal-wavy')).d);
    expect((await wave(page, 'horizontal-wavy-negative')).width).toBe(thickness);
    await expect.poll(() => seen.filter((w) => w.includes('DIV-14')).length).toBe(Object.keys(invalid).length);
    expect(seen).toEqual(expect.arrayContaining([
      expect.stringMatching(/<tanrei-divider>: thickness 0 is not a length the divider can draw; it takes comp\.divider\.line\.thickness \(DIV-14\)/),
      expect.stringMatching(/thickness -2 is not a length the divider can draw; it takes comp\.divider\.line\.thickness \(DIV-14\)/),
      expect.stringMatching(/thickness NaN is not a length the divider can draw; it takes comp\.divider\.line\.thickness \(DIV-14\)/),
      expect.stringMatching(/thickness -1 is not a length/),
    ]));
    // The fixtures that give a valid thickness, and the ones that give none, report nothing.
    expect(seen.filter((w) => /thickness (2|4|null|undefined) /.test(w))).toEqual([]);
  });

  test('DIV-16: thickness stands in for line.thickness — the line, the divider’s own cross size, a dot’s side, a dash’s width and least length, the wave’s stroke, a round cap’s diameter — in the fixtures and as a property; back to null it is the token again', async ({ page }) => {
    const token = await resolveToken(page, T('line-thickness'));
    expect(token).toBe(1);
    // The three fixtures: a solid line 2 thick in a divider 2 tall (or wide), and discs 4 across.
    expect([given('horizontal-thick'), given('vertical-thick'), given('horizontal-dotted-round-thick')]).toEqual([2, 2, 4]);
    expect((await box(host(page, 'horizontal-thick'))).height).toBe(2);
    expect((await box(host(page, 'vertical-thick'))).width).toBe(2);
    expect((await box(host(page, 'horizontal-dotted-round-thick'))).height).toBe(4);
    expect(await line(page, 'horizontal-thick').evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('2px');
    expect(await line(page, 'vertical-thick').evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe('2px');
    for (const id of ['horizontal-thick', 'vertical-thick']) {
      const own = await box(host(page, id));
      expectRuns(await inkRuns(page, id), [[0, id.startsWith('vertical') ? own.height : own.width]], id);
    }
    // Painted that thick: a cut across the solid line is two CSS px of the line's color.
    const shot = decodePng(await stage(page, 'horizontal-thick').screenshot({ animations: 'disabled' }));
    const dpr = await page.evaluate(() => devicePixelRatio);
    const surface = await resolveColor(page, '--tanrei-sys-color-surface');
    const column = Array.from({ length: shot.height }, (_, y) => shot.at(Math.floor(shot.width / 2), y)).filter((c) => c !== surface);
    expect(column.length).toBe(2 * dpr);
    expect(new Set(column)).toEqual(new Set([await paintedColor(page, `var(${T('line-color')})`)]));
    // As a property, on every style; and back to null.
    await mountFixtures(page, spec, {
      fixtures: [fixture('horizontal-set', {}), fixture('horizontal-dashed-set', { lineStyle: 'dashed' }), fixture('horizontal-wavy-set', { lineStyle: 'wavy', lineCap: 'round' }), fixture('vertical-set', { orientation: 'vertical' })],
    });
    await override(page, OPAQUE);
    const set = (id: string, value: number | null) => host(page, id).evaluate(async (el: any, v) => { el.thickness = v; await el.updateComplete; }, value);
    const cross = async (id: string) => { const b = await box(host(page, id)); return id.startsWith('vertical') ? b.width : b.height; };
    for (const id of ['horizontal-set', 'vertical-set']) {
      await set(id, 6);
      expect(await cross(id), id).toBe(6);
      await set(id, null);
      expect(await cross(id), id).toBe(token);
    }
    // A dash is as wide as the thickness, and never shorter than it: a dashLength below the thickness draws squares.
    await set('horizontal-dashed-set', 6);
    await host(page, 'horizontal-dashed-set').evaluate(async (el: any) => { el.dashLength = 2; el.gap = 10; await el.updateComplete; });
    expect(await cross('horizontal-dashed-set')).toBe(6);
    const width = (await box(host(page, 'horizontal-dashed-set'))).width;
    expectRuns(await inkRuns(page, 'horizontal-dashed-set'), pattern(width, 6, 10), 'a dash no shorter than the thickness given');
    // The wave's stroke, and its round caps inside the length: the ink starts at the host's start and is the stroke wide there.
    await set('horizontal-wavy-set', 4);
    expect((await wave(page, 'horizontal-wavy-set')).width).toBe(4);
    const drawn = await wave(page, 'horizontal-wavy-set');
    const w = (await box(host(page, 'horizontal-wavy-set'))).width;
    expect(drawn.points[0][0]).toBeCloseTo(2, 2);
    expect(drawn.points.at(-1)![0]).toBeCloseTo(w - 2, 2);
    await set('horizontal-wavy-set', null);
    expect((await wave(page, 'horizontal-wavy-set')).width).toBe(token);
  });

  test('DIV-16: the pattern lengths taken from tokens are scaled by thickness ÷ line.thickness — the dot gap, the dash and its gap, the wave’s amplitude and wavelength — and a pattern length given by a prop is used as given; the inset is not scaled', async ({ page }) => {
    const [token, dotGap, dash, dashGap, amplitude, wavelength, inset] = await Promise.all(
      ['line-thickness', 'line-dot-gap', 'line-dash-length', 'line-dash-gap', 'line-wave-amplitude', 'line-wave-wavelength', 'line-inset'].map((n) => resolveToken(page, T(n))),
    );
    // `horizontal-dotted-round-thick`: discs 4 across, at least 8 apart edge to edge (the token's 2, scaled by 4), the
    // first and the last at the line's ends.
    await override(page, OPAQUE);
    const id = 'horizontal-dotted-round-thick';
    const t = given(id)!;
    const own = await box(host(page, id));
    const expected = pattern(own.width, t, (dotGap * t) / token);
    expect((dotGap * t) / token).toBe(8);
    expect(expected.length).toBeGreaterThan(2);
    const runs = await inkRuns(page, id);
    expectRuns(runs, expected, id);
    expect(runs[0][0]).toBeLessThanOrEqual(0.51);
    expect(own.width - runs.at(-1)![1]).toBeLessThanOrEqual(0.51);
    for (let i = 1; i < runs.length; i++) expect(runs[i][0] - runs[i - 1][1], `gap ${i}`).toBeGreaterThanOrEqual(8 - 1.02);
    // A round cap shows here without a fixture layer (DIV-13): each dot is a disc — as wide as the thickness through
    // its middle, and narrower along its top row.
    const shot = decodePng(await stage(page, id).screenshot({ animations: 'disabled' }));
    const dpr = await page.evaluate(() => devicePixelRatio);
    // Both boxes after the screenshot, which may have scrolled the fixture into view.
    const [s, at] = [await box(stage(page, id)), await box(host(page, id))];
    const surface = await resolveColor(page, '--tanrei-sys-color-surface');
    const red = (c: string) => Number(c.match(/\d+/)![0]);
    const [bare, full] = [red(surface), red(await resolveColor(page, '--tanrei-sys-color-on-surface'))];
    // A pixel is the disc's where the disc covers at least half of it.
    const inkIn = (row: number) => Array.from({ length: Math.round(t * dpr) }, (_, i) => shot.at(Math.round((at.x - s.x) * dpr) + i, row)).filter((c) => (bare - red(c)) / (bare - full) >= 0.5).length;
    const top = Math.round((at.y - s.y) * dpr);
    // How much ink a row holds, in pixels: every pixel by the share of it that is covered.
    const inkOf = (row: number) => Array.from({ length: Math.round(t * dpr) }, (_, i) => shot.at(Math.round((at.x - s.x) * dpr) + i, row)).reduce((sum, c) => sum + Math.min(1, Math.max(0, (bare - red(c)) / (bare - full))), 0);
    const middle = top + Math.floor((t * dpr) / 2);
    expect(inkIn(middle)).toBe(t * dpr);
    // The top row: the box's two corner pixels are never the disc's, and the row holds far less ink than the middle
    // one — 3.6 px of 8 for a disc 8 px across, where a square holds all 8 and a square with its corners rounded by a
    // quarter of its side 6.5. How full an engine draws the pixels a mask's edge crosses is its own (those next to the
    // corners: 28% in one, 51% in another, of 17% by the geometry), so the row is weighed, not counted at one threshold.
    expect(inkIn(top)).toBeLessThanOrEqual(t * dpr - 2);
    expect(inkOf(top) / inkOf(middle)).toBeLessThanOrEqual(0.7);
    expect(inkIn(top)).toBeGreaterThan(0);

    // Each style, set to three times the token's thickness, beside the same style under a layer whose line is that
    // thick: the same pattern — a divider that thickens itself gets what a layer that thickens the line gets.
    const k = 3;
    const pairs = { dotted: { lineStyle: 'dotted' }, dashed: { lineStyle: 'dashed' }, wavy: { lineStyle: 'wavy' } } as const;
    await mountFixtures(page, spec, {
      fixtures: [
        ...Object.entries(pairs).flatMap(([name, p]) => [fixture(`horizontal-${name}-own`, { ...p, thickness: k * token }), fixture(`horizontal-${name}-layer`, p)]),
        fixture('horizontal-dashed-given', { lineStyle: 'dashed', thickness: k * token, dashLength: 5, gap: 7 }),
        fixture('horizontal-wavy-given', { lineStyle: 'wavy', thickness: k * token, amplitude: 5, wavelength: 20 }),
        fixture('horizontal-inset-thick', { inset: 'start', thickness: k * token }),
      ],
    });
    await override(page, OPAQUE);
    const widthOf = async (name: string) => (await box(host(page, name))).width;
    expectRuns(await inkRuns(page, 'horizontal-dotted-own'), pattern(await widthOf('horizontal-dotted-own'), k * token, k * dotGap), 'dotted: the dot gap scaled');
    expectRuns(await inkRuns(page, 'horizontal-dashed-own'), pattern(await widthOf('horizontal-dashed-own'), k * dash, k * dashGap), 'dashed: the dash and its gap scaled');
    const self = { dotted: await inkRuns(page, 'horizontal-dotted-own'), dashed: await inkRuns(page, 'horizontal-dashed-own'), wavy: await wave(page, 'horizontal-wavy-own') };
    // The wave: twice the scaled amplitude plus the thickness across, arcs of the scaled wavelength.
    expect((await box(host(page, 'horizontal-wavy-own'))).height).toBe(2 * k * amplitude + k * token);
    expect(self.wavy.width).toBe(k * token);
    const waves = Math.max(1, Math.round((await widthOf('horizontal-wavy-own')) / (k * wavelength)));
    expect(radii(self.wavy.d).length).toBe(waves * 2);
    // Given by a prop: used as given, not scaled.
    expectRuns(await inkRuns(page, 'horizontal-dashed-given'), pattern(await widthOf('horizontal-dashed-given'), 5, 7), 'dashLength and gap as given');
    expect((await box(host(page, 'horizontal-wavy-given'))).height).toBe(2 * 5 + k * token);
    expect(radii((await wave(page, 'horizontal-wavy-given')).d).length).toBe(Math.max(1, Math.round((await widthOf('horizontal-wavy-given')) / 20)) * 2);
    // The inset is not scaled.
    expect((await box(line(page, 'horizontal-inset-thick'))).x - (await box(host(page, 'horizontal-inset-thick'))).x).toBe(inset);
    // Now the layer: the line's token is that thick (and the pattern tokens, derived from it, follow). The dividers
    // that take the token draw what the ones that thickened themselves drew.
    await override(page, { [T('line-thickness')]: `${k * token}px` });
    await page.evaluate(async () => { for (const el of document.querySelectorAll<any>('tanrei-divider')) { el.requestUpdate(); await el.updateComplete; } });
    expect(await resolveToken(page, T('line-dot-gap'))).toBe(k * dotGap);
    expect(await inkRuns(page, 'horizontal-dotted-layer')).toEqual(self.dotted);
    expect(await inkRuns(page, 'horizontal-dashed-layer')).toEqual(self.dashed);
    expect((await wave(page, 'horizontal-wavy-layer')).d).toBe(self.wavy.d);
    // …and one given the layer's own thickness is scaled by 1: the same again.
    expect(await inkRuns(page, 'horizontal-dotted-own')).toEqual(self.dotted);
  });

  test('DIV-16: a thickness below one device pixel is drawn one device pixel thick (DIV-8), and the thickness changes nothing assistive technology is told', async ({ page }) => {
    await mountFixtures(page, spec, {
      fixtures: [fixture('horizontal-faint', { thickness: 0.2 }), fixture('horizontal-faint-layer', {}), fixture('horizontal-separator', { thickness: 4, decorative: false }), fixture('horizontal-plain', { decorative: false })],
    });
    await override(page, OPAQUE);
    // The same hairline from a layer's token, to compare with: the engine draws the least line it draws (the border's
    // snapped width), whole, in the line's color — and the same one for a thickness given as for the token.
    await stage(page, 'horizontal-faint-layer').evaluate((el, name) => el.style.setProperty(name, '0.2px'), T('line-thickness'));
    const dpr = await page.evaluate(() => devicePixelRatio);
    expect(1 / dpr).toBeGreaterThan(0.2);
    const surface = await resolveColor(page, '--tanrei-sys-color-surface');
    const cut = async (id: string) => {
      const shot = decodePng(await stage(page, id).screenshot({ animations: 'disabled' }));
      return Array.from({ length: shot.height }, (_, y) => shot.at(Math.floor(shot.width / 2), y)).filter((c) => c !== surface);
    };
    const column = await cut('horizontal-faint');
    expect(column.length).toBeGreaterThanOrEqual(1);
    expect(new Set(column)).toEqual(new Set([await resolveColor(page, '--tanrei-sys-color-on-surface')]));
    expect(column).toEqual(await cut('horizontal-faint-layer'));
    const told = (id: string) => host(page, id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-orientation'), el.getAttribute('aria-hidden'), el.getAttribute('aria-label'), el.tabIndex]);
    expect(await told('horizontal-separator')).toEqual(await told('horizontal-plain'));
    expect(await told('horizontal-separator')).toEqual(['separator', 'horizontal', null, null, -1]);
    expect(await told('horizontal-faint')).toEqual([null, null, 'true', null, -1]);
  });
});

/**
 * DIV-8 for straight lines: at the thickness token and at a hairline thinner than one device pixel at 2×, with the
 * layout putting the divider between device pixels, a cut across the line through its middle — through the middle of
 * its first dash or dot — is only the line or the surface, at least one device pixel, contiguous.
 */
async function expectOnGrid(page: P, fixturesFor: (thickness: string) => Fixture[]) {
  // The line color as painted over the surface (a translucent token composites).
  const color = await paintedColor(page, `var(${T('line-color')})`);
  const surface = await resolveColor(page, '--tanrei-sys-color-surface');
  for (const thickness of ['var(--tanrei-sys-border-hairline)', '0.25px']) {
    const fixtures = fixturesFor(thickness);
    await mountFixtures(page, spec, { fixtures });
    await override(page, { [T('line-thickness')]: thickness });
    await page.addStyleTag({ content: "[data-fixture^='horizontal'] { inline-size: 40px; } [data-fixture^='vertical'] { display: flex; block-size: 40px; }" });
    const css = await resolveToken(page, T('line-thickness'));
    const dpr = await page.evaluate(() => devicePixelRatio);
    for (const shift of [0, 0.3, 0.5, 0.75]) {
      await page.evaluate((s) => { for (const el of document.querySelectorAll<HTMLElement>('.stage')) el.style.padding = `${16 + s}px`; }, shift);
      for (const { id } of fixtures) {
        const vertical = id.startsWith('vertical');
        const shot = decodePng(await stage(page, id).screenshot({ animations: 'disabled' }));
        const [s, own] = [await box(stage(page, id)), await box(host(page, id))];
        // The engine snaps the line's box, so its first dash is found where it was painted, not where layout put it.
        const [first] = id.includes('-') ? await inkRuns(page, id, { shot, color }) : [[0, vertical ? own.height : own.width]];
        const at = Math.floor(((vertical ? own.y - s.y : own.x - s.x) + (first[0] + first[1]) / 2) * dpr);
        const across = vertical ? Array.from({ length: shot.width }, (_, x) => shot.at(x, at)) : Array.from({ length: shot.height }, (_, y) => shot.at(at, y));
        const label = `${id}, ${thickness}, +${shift}px`;
        expect(across.filter((c) => c !== color && c !== surface), `${label}: a blended pixel`).toEqual([]);
        const drawn = across.filter((c) => c === color).length;
        expect(drawn, `${label}: at least one device pixel`).toBeGreaterThanOrEqual(1);
        // A thickness of whole device pixels is drawn exactly; a thinner one is rounded up — to one device pixel
        // (WebKit) or one CSS pixel (Chromium, Firefox), never more.
        if (Number.isInteger(css * dpr)) expect(drawn, `${label}: the thickness in device pixels`).toBe(css * dpr);
        else expect(drawn, `${label}: rounded up to at most one CSS pixel`).toBeLessThanOrEqual(Math.ceil(css) * dpr);
        expect(across.lastIndexOf(color) - across.indexOf(color) + 1, `${label}: contiguous`).toBe(drawn);
      }
    }
  }
}

/** Whether the first crest of a horizontal wave, counted from `from`, is above the midline, read from the pixels. */
async function firstCrestAbove(page: P, id: string, from: 'left' | 'right') {
  const [s, own] = [await box(stage(page, id)), await box(host(page, id))];
  const shot = decodePng(await stage(page, id).screenshot({ animations: 'disabled' }));
  const dpr = await page.evaluate(() => devicePixelRatio);
  const surface = await resolveColor(page, '--tanrei-sys-color-surface');
  const wavelength = await resolveToken(page, T('line-wave-wavelength'));
  const fitted = own.width / Math.max(1, Math.round(own.width / wavelength));
  const x = Math.floor((own.x - s.x + (from === 'left' ? fitted / 4 : own.width - fitted / 4)) * dpr);
  const top = Math.floor((own.y - s.y) * dpr);
  const rows = Array.from({ length: Math.round(own.height * dpr) }, (_, i) => i).filter((i) => shot.at(x, top + i) !== surface);
  const mid = (own.height * dpr) / 2;
  return rows.length > 0 && rows.every((i) => i < mid);
}

/** Not focusable: no tabindex, focus() does nothing, and Tab passes from the control before it to the one after it. */
async function expectNotFocusable(page: P, ids: string[]) {
  for (const id of ids) {
    await expect(host(page, id), id).not.toHaveAttribute('tabindex');
    await host(page, id).evaluate((el) => (el as HTMLElement).focus());
    expect(await page.evaluate(() => document.activeElement?.localName), id).not.toBe('tanrei-divider');
  }
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
    document.body.insertAdjacentHTML('beforeend', '<button id="after">After</button>');
    document.getElementById('before')!.focus();
  });
  await tab(page);
  await expect(page.locator('#after')).toBeFocused();
}

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('the line is not text: a larger text size leaves it at the thickness token', async ({ page }) => {
    await mountFixtures(page, spec);
    const before = await Promise.all(['horizontal', 'horizontal-wavy'].map((id) => box(host(page, id))));
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    expect((await box(host(page, 'horizontal'))).height).toBe(before[0].height);
    expect((await box(host(page, 'horizontal-wavy'))).height).toBe(before[1].height);
  });

  test('forced colors: every style stays drawn in a system color where the engine has the mode', async ({ page }) => {
    await mountFixtures(page, spec);
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
    const text = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'CanvasText';
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    for (const id of ['horizontal', 'horizontal-dotted', 'horizontal-dashed']) {
      const drawn = await line(page, id).evaluate((el) => ({ style: getComputedStyle(el).borderTopStyle, color: getComputedStyle(el).borderTopColor }));
      expect(drawn.style, id).toBe('solid');
      expect(drawn.color, id).not.toBe('rgba(0, 0, 0, 0)');
    }
    expect((await wave(page, 'horizontal-wavy')).stroke).toBe(text);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec);
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
