// <tanrei-avatar> and <tanrei-avatar-group>, driven by specs/avatar.spec.json: every behaviour id (AVT-1…23) is cited by
// a test title, every fixture has a baseline, and every length and color is read back from the tokens — never from a
// number written here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, avatarPicture, iconFaceArrives, loadSpec, mountFixtures, resolveToken, setWords, tab, withoutIconFont, rootTokens } from '../../../test/harness.js';
import { decodePng } from '../../../test/png.js';

const spec = loadSpec('avatar');
type P = Page;
const TAG = 'tanrei-avatar';
const GROUP = 'tanrei-avatar-group';
const SIZES = ['small', 'medium', 'large'] as const;
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = (file: string) => fs.readFileSync(path.join(pkg, 'dist', file), 'utf8');
const PICTURE = fs.readFileSync(path.join(pkg, 'test/fixtures/avatar.png'));
/** A host no page of the tests is on: every picture asked from it is answered by the test (`page.route`). */
const PICTURES = 'https://pictures.test';

const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const avatar = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`).first();
const group = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${GROUP}`);
const members = (page: P, id: string) => group(page, id).locator(`> ${TAG}`);
const container = (host: Locator) => host.locator('.container').first();
const overflow = (page: P, id: string) => group(page, id).locator('.overflow');
const T = (name: string) => `--tanrei-comp-avatar-${name}`;
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
const member = (label: string, initials = '', props: Fixture['props'] = {}): FixtureItem => ({ kind: 'member', props: { label, ...(initials ? { initials } : {}), ...props } });
const fx = (id: string, props: Fixture['props'], extra: Partial<Fixture> = {}): Fixture => ({ id, props, ...extra });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const mountSpec = (page: P, ...ids: string[]) => mount(page, ids.length ? spec.fixtures.filter((f) => ids.includes(f.id)) : spec.fixtures);
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
/** Every avatar and group of the page has drawn what it was last told. */
const settled = async (page: P) => {
  await page.evaluate(async () => {
    for (let turn = 0; turn < 3; turn++) await Promise.all([...document.querySelectorAll('tanrei-avatar, tanrei-avatar-group')].map((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete));
  });
  await frames(page, 2);
};
/** Markup of the test's own, each piece in a stage of its own, on a page that has the tokens, the faces and the elements. */
async function mountHtml(page: P, stages: Record<string, string>, options: Parameters<typeof mountFixtures>[2] = {}) {
  await mount(page, [], options);
  await page.evaluate((entries) => {
    document.querySelector('main')!.innerHTML = entries.map(([id, markup]) => `<div class="stage" data-fixture="${id}">${markup}</div>`).join('');
  }, Object.entries(stages));
  await settled(page);
}
/** The picture has been drawn in the fallback's place. */
const pictured = async (host: Locator) => {
  await expect(host.locator('.image.loaded')).toHaveCount(1);
  // Loaded is not yet drawn: the picture is decoded off the page's turn (`decoding="async"`, AVT-4), and a picture
  // taken of the avatar before that shows its ground where the picture comes a frame later.
  await host.locator('.image.loaded').evaluate((el: HTMLImageElement) => el.decode());
};
/** What an avatar draws: the parts that can be seen. */
const drawn = (host: Locator) =>
  host.evaluate((el) => {
    const root = el.shadowRoot!;
    const seen = (part: Element | null) => !!part && getComputedStyle(part).display !== 'none' && getComputedStyle(part).visibility !== 'hidden' && (part as HTMLElement).offsetWidth > 0;
    const icon = root.querySelector('.icon');
    return {
      image: seen(root.querySelector('.image')),
      label: seen(root.querySelector('.label')) ? root.querySelector('.label')!.textContent : null,
      glyph: seen(icon) ? (icon!.querySelector('.ink')?.textContent ?? (icon!.querySelector('slot') as HTMLSlotElement).assignedElements()[0]?.textContent ?? '') : null,
      images: root.querySelectorAll('img').length,
    };
  });

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
const painted = (locator: Locator, property: string) =>
  locator.evaluate((el, p) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.fillStyle = getComputedStyle(el).getPropertyValue(p);
    context.fillRect(0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  }, property);
const sameColor = (actual: number[], expected: number[], message = '', tolerance = 2) => {
  for (let i = 0; i < 4; i++) expect(Math.abs(actual[i] - expected[i]), `${message}: ${actual.join(',')} ≈ ${expected.join(',')}`).toBeLessThanOrEqual(tolerance);
};
const tokenColor = (page: P, name: string) => colorOf(page, `var(${T(name)})`);
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
/** The pixels a locator paints, and the color at a point given in CSS pixels from its top left corner. */
async function pixels(locator: Locator) {
  const shot = decodePng(await locator.screenshot({ animations: 'disabled' }));
  const b = await box(locator);
  const scale = shot.width / b.width;
  return { at: (x: number, y: number) => shot.at(Math.min(shot.width - 1, Math.round(x * scale)), Math.min(shot.height - 1, Math.round(y * scale))), bytes: shot.data };
}
const rgb = (color: number[]) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
/** A picture made in the page: bands of color from left to right, each `[color, share of the width]`, `width` × `height`. */
const bands = (page: P, width: number, height: number, parts: [string, number][]) =>
  page.evaluate(
    ([w, h, list]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext('2d')!;
      let x = 0;
      for (const [color, share] of list) {
        context.fillStyle = color;
        context.fillRect(x, 0, Math.ceil(w * share), h);
        x += w * share;
      }
      return canvas.toDataURL('image/png');
    },
    [width, height, parts] as const,
  );

type AxNode = { nodeId: string; ignored: boolean; role?: { value: string }; name?: { value: string }; description?: { value: string }; childIds?: string[] };
/**
 * What Chromium's accessibility tree holds, read over the DevTools protocol: one line for each thing exposed — its role,
 * its name and its description — in reading order, nested by two spaces. Wrappers that say nothing are left out.
 */
async function exposed(page: P): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: AxNode[] };
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const SILENT = new Set(['RootWebArea', 'generic', 'none', 'main', 'InlineTextBox', 'paragraph', 'LineBreak']);
  const lines: string[] = [];
  const walk = (id: string, depth: number) => {
    const node = byId.get(id);
    if (!node) return;
    const kind = node.role?.value ?? '';
    const says = !node.ignored && !SILENT.has(kind);
    if (says) lines.push(`${'  '.repeat(depth)}${kind === 'StaticText' ? 'text' : kind} "${node.name?.value ?? ''}"${node.description?.value ? ` (${node.description.value})` : ''}`);
    for (const child of node.childIds ?? []) walk(child, says ? depth + 1 : depth);
  };
  walk(nodes[0].nodeId, 0);
  return lines;
}

test.describe('behavior', () => {
  test('AVT-1: a square box of the side of its size with the corners of its shape through the shared corner rule — a circle for the full step — filled with container.color, clipping what it draws, with no edge and no elevation; inline with its text as one box that a layout neither stretches nor shrinks', async ({ page }) => {
    await mountSpec(page, 'initials', 'initials-small', 'initials-large', 'square', 'square-small', 'square-large', 'glyph', 'image');
    // The verify: 40 by 40 and a circle; 24 and 56; a square one has corners of 6.
    const sides = { 'initials-small': 24, initials: 40, 'initials-large': 56, 'square-small': 24, square: 40, 'square-large': 56 } as const;
    for (const [id, side] of Object.entries(sides)) {
      const size = spec.fixtures.find((f) => f.id === id)!.props.size ?? 'medium';
      expect(await token(page, `container-size-${size}`), id).toBe(side);
      for (const part of [avatar(page, id), container(avatar(page, id))]) {
        const b = await box(part);
        expect([b.width, b.height], id).toEqual([side, side]);
      }
    }
    const smoothing = Number(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-shape-corner-smoothing'))) || 0;
    expect(smoothing).toBe(0);
    for (const id of ['initials-small', 'initials', 'initials-large', 'glyph', 'image']) {
      const side = (await box(avatar(page, id))).width;
      // A radius of at least half the side: the browser draws a circle, whatever the smoothing (the full step is a pill).
      expect(Number.parseFloat(await css(container(avatar(page, id)), 'border-top-left-radius')), id).toBeGreaterThanOrEqual(side / 2);
      expect((await css(container(avatar(page, id)), '--tanrei-corner-pill')).trim(), id).toBe('1');
    }
    expect(await token(page, 'container-shape-square')).toBe(6);
    for (const id of ['square-small', 'square', 'square-large']) {
      expect(await css(container(avatar(page, id)), 'border-top-left-radius'), id).toBe('6px');
      expect((await css(container(avatar(page, id)), '--tanrei-corner-pill')).trim(), id).toBe('0');
      expect(await container(avatar(page, id)).getAttribute('data-tanrei-shape'), id).not.toBeNull();
    }
    // The fill, the clip; no edge, no elevation.
    for (const id of ['initials', 'square', 'glyph', 'image']) {
      const c = container(avatar(page, id));
      sameColor(await painted(c, 'background-color'), await tokenColor(page, 'container-color'), `${id} fill`);
      expect(await css(c, 'overflow'), id).toBe('hidden');
      expect(await css(c, 'border-top-width'), id).toBe('0px');
      expect(await css(c, 'box-shadow'), id).toBe('none');
      expect(await css(c, 'outline-style'), id).toBe('none');
    }
    // The corners are eased by the system's amount, where the browser can: the square's scale follows it, the circle's does not.
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0.6' });
    const eased = await page.evaluate(() => CSS.supports('corner-shape: superellipse(log(2, 2))'));
    expect((await css(container(avatar(page, 'square')), '--_corner-scale')).trim() !== '1').toBe(eased);
    if (eased) near(Number.parseFloat(await css(container(avatar(page, 'square')), 'border-top-left-radius')), 6 * 1.24, 'the eased radius', 0.05);
    expect(Number.parseFloat(await css(container(avatar(page, 'initials')), 'border-top-left-radius'))).toBeGreaterThanOrEqual(20);
    await override(page, { '--tanrei-sys-shape-corner-smoothing': '0' });

    // Inline with text, as one box; in a row narrower than its content it keeps its side, and is not stretched by one that is taller.
    await mountHtml(page, {
      line: '<p id="line" style="margin:0;font:var(--tanrei-sys-typescale-body-font)"><span id="lead">Written by</span> <tanrei-avatar decorative size="small" initials="AL"></tanrei-avatar> <span id="trail">Ada Lovelace</span></p>',
      row: '<div style="display:flex;inline-size:60px;block-size:80px"><tanrei-avatar id="a" label="Ada Lovelace" initials="AL"></tanrei-avatar><span style="flex:1 0 200px">A long neighbour that does not fit</span></div>',
      column: '<div style="display:flex;flex-direction:column;inline-size:200px"><tanrei-avatar id="b" label="Ada Lovelace" initials="AL"></tanrei-avatar></div>',
      grid: '<div style="display:grid;grid-template-columns:200px;block-size:120px"><tanrei-avatar id="c" label="Ada Lovelace" initials="AL"></tanrei-avatar></div>',
    });
    const inline = avatar(page, 'line');
    expect(await css(inline, 'display')).toBe('inline-block');
    const [line, small] = [await box(page.locator('#line')), await box(inline)];
    expect(small.y).toBeGreaterThanOrEqual(line.y - 0.5);
    expect(small.y + small.height).toBeLessThanOrEqual(line.y + line.height + 0.5);
    // One line: the avatar stands between the two runs of text, each of which crosses its middle.
    const [lead, trail] = [await box(page.locator('#lead')), await box(page.locator('#trail'))];
    expect(lead.x + lead.width).toBeLessThanOrEqual(small.x);
    expect(small.x + small.width).toBeLessThanOrEqual(trail.x);
    for (const run of [lead, trail]) {
      expect(run.y).toBeLessThan(small.y + small.height / 2);
      expect(run.y + run.height).toBeGreaterThan(small.y + small.height / 2);
    }
    // A flex row that is taller, a flex column that is wider and a grid cell that is both: none stretches it.
    for (const id of ['a', 'b', 'c']) {
      for (const part of [page.locator(`#${id}`), container(page.locator(`#${id}`))]) {
        const b = await box(part);
        expect([b.width, b.height], id).toEqual([40, 40]);
      }
    }
  });

  test('AVT-2: exactly one of three is drawn at the centre — the picture once it has loaded, else the initials, else a glyph; never an empty box, a broken-picture mark or the address, and initials are never made out of label', async ({ page }) => {
    await mountSpec(page, 'image', 'initials', 'glyph', 'icon', 'image-failed', 'square-glyph');
    await pictured(avatar(page, 'image'));
    await expect.poll(() => drawn(avatar(page, 'image'))).toEqual({ image: true, label: null, glyph: null, images: 1 });
    expect(await drawn(avatar(page, 'initials'))).toEqual({ image: false, label: 'AL', glyph: null, images: 0 });
    // A name and no initials: a glyph, never letters taken from the name.
    await expect.poll(() => drawn(avatar(page, 'glyph'))).toEqual({ image: false, label: null, glyph: 'person', images: 0 });
    await expect.poll(() => drawn(avatar(page, 'square-glyph'))).toEqual({ image: false, label: null, glyph: 'category', images: 0 });
    await expect.poll(() => drawn(avatar(page, 'icon'))).toEqual({ image: false, label: null, glyph: 'smart_toy', images: 0 });
    // A picture that cannot be loaded: the initials, and no picture element left to draw a broken mark.
    await expect.poll(() => drawn(avatar(page, 'image-failed'))).toEqual({ image: false, label: 'AL', glyph: null, images: 0 });
    for (const id of ['image', 'initials', 'glyph', 'icon', 'image-failed']) {
      const text = await avatar(page, id).evaluate((el) => (el.shadowRoot!.querySelector('.container') as HTMLElement).innerText);
      expect(text, id).not.toContain('fixtures/');
      expect(text, id).not.toContain('Ada');
      // What is drawn is at the centre of the box.
      const part = avatar(page, id).locator(id === 'image' ? '.image' : id.startsWith('ini') || id === 'image-failed' ? '.label' : '.icon');
      const [outer, inner] = [await box(avatar(page, id)), await box(part)];
      near(inner.x + inner.width / 2, outer.x + outer.width / 2, `${id} centre x`);
      near(inner.y + inner.height / 2, outer.y + outer.height / 2, `${id} centre y`);
    }
    // Initials given and a glyph given: the initials. Initials of white space: the glyph.
    await mountHtml(page, {
      both: '<tanrei-avatar label="Build service" initials="BS"><span slot="icon">smart_toy</span></tanrei-avatar>',
      blank: '<tanrei-avatar label="Someone" initials="  "></tanrei-avatar>',
    });
    expect(await drawn(avatar(page, 'both'))).toEqual({ image: false, label: 'BS', glyph: null, images: 0 });
    await expect.poll(() => drawn(avatar(page, 'blank'))).toEqual({ image: false, label: null, glyph: 'person', images: 0 });
    // While the icon set cannot draw the glyph, its name is not spelled out in its place; it is drawn once the set can.
    await mountSpec(page, 'glyph', 'icon');
    const family = await withoutIconFont(page);
    for (const id of ['glyph', 'icon']) {
      await expect.poll(() => avatar(page, id).locator('.icon').getAttribute('data-drawn'), { message: id }).toBeNull();
      expect(await css(avatar(page, id).locator('.icon'), 'visibility'), id).toBe('hidden');
      expect((await box(avatar(page, id))).width, id).toBe(40);
    }
    await iconFaceArrives(page, family);
    for (const id of ['glyph', 'icon']) await expect.poll(() => avatar(page, id).locator('.icon').getAttribute('data-drawn'), { message: id }).not.toBeNull();
  });

  test('AVT-3: a loaded picture covers the whole box with its proportions kept and its centre on the box’s centre, clipped to the shape, over container.color — which shows through its transparent parts — with neither initials nor a glyph; it is not mirrored or tinted in any direction or scheme', async ({ page }) => {
    await mount(page, []);
    // The verify: a picture twice as wide as it is high shows its middle square.
    const wide = await bands(page, 160, 80, [['rgb(200, 0, 0)', 0.25], ['rgb(0, 160, 0)', 0.5], ['rgb(0, 0, 200)', 0.25]]);
    const tall = await bands(page, 80, 160, [['rgb(0, 160, 0)', 1]]);
    const clear = await bands(page, 80, 80, [['rgba(0, 0, 0, 0)', 1]]);
    const picture = avatarPicture();
    await mountHtml(page, {
      wide: `<tanrei-avatar label="Wide" initials="W" shape="square" src="${wide}"></tanrei-avatar>`,
      tall: `<tanrei-avatar label="Tall" initials="T" size="large" src="${tall}"></tanrei-avatar>`,
      clear: `<tanrei-avatar label="Clear" initials="C" src="${clear}"></tanrei-avatar>`,
      ltr: `<tanrei-avatar label="Ada Lovelace" shape="square" size="large" src="${picture}"></tanrei-avatar>`,
      rtl: `<div dir="rtl"><tanrei-avatar label="Ada Lovelace" shape="square" size="large" src="${picture}"></tanrei-avatar></div>`,
    });
    for (const id of ['wide', 'tall', 'clear', 'ltr', 'rtl']) await pictured(avatar(page, id));
    for (const id of ['wide', 'tall']) {
      const image = avatar(page, id).locator('.image');
      expect(await css(image, 'object-fit'), id).toBe('cover');
      expect(await css(image, 'object-position'), id).toBe('50% 50%');
      const [outer, inner] = [await box(avatar(page, id)), await box(image)];
      expect([inner.x, inner.y, inner.width, inner.height], id).toEqual([outer.x, outer.y, outer.width, outer.height]);
      expect(await drawn(avatar(page, id)), id).toMatchObject({ image: true, label: null, glyph: null });
    }
    const middle = await pixels(avatar(page, 'wide'));
    for (const x of [3, 12, 20, 28, 37]) expect(middle.at(x, 20), `the middle square at ${x}`).toBe('rgb(0, 160, 0)');
    // Clipped to the shape: the corner of a circle is the surface, not the picture.
    const round = await pixels(avatar(page, 'tall'));
    expect(round.at(28, 28)).toBe('rgb(0, 160, 0)');
    expect(round.at(1, 1)).not.toBe('rgb(0, 160, 0)');
    // A transparent picture shows the container color, and nothing else is drawn under it.
    const fill = rgb(await tokenColor(page, 'container-color'));
    const through = await pixels(avatar(page, 'clear'));
    for (const [x, y] of [[20, 20], [12, 20], [28, 20], [20, 10]]) expect(through.at(x, y), `through the picture at ${x},${y}`).toBe(fill);
    // Not mirrored: the picture's light disc is in its upper left in both directions.
    for (const id of ['ltr', 'rtl']) {
      const p = await pixels(avatar(page, id));
      expect(p.at(17, 18), `${id} upper left`).toBe('rgb(232, 238, 244)');
      expect(p.at(39, 18), `${id} upper right`).toBe('rgb(159, 179, 200)');
      expect(p.at(50, 50), `${id} lower right`).toBe('rgb(92, 122, 153)');
      expect(await css(avatar(page, id).locator('.image'), 'transform'), id).toBe('none');
      expect(await css(avatar(page, id).locator('.image'), 'filter'), id).toBe('none');
      expect(await css(avatar(page, id).locator('.image'), 'opacity'), id).toBe('1');
    }
    // Not tinted: the dark scheme draws the same pixels.
    const light = await pixels(avatar(page, 'ltr'));
    await page.evaluate(() => document.documentElement.setAttribute('data-tanrei-theme', 'dark'));
    await frames(page);
    const dark = await pixels(avatar(page, 'ltr'));
    for (const [x, y] of [[17, 18], [39, 18], [50, 50], [28, 28]]) expect(dark.at(x, y), `dark at ${x},${y}`).toBe(light.at(x, y));
  });

  test('AVT-4: until its picture has loaded the avatar draws its fallback at full size, and the picture takes the fallback’s place at once and without a motion, so nothing changes place; a picture that cannot be loaded leaves the fallback, is not asked for again and is reported; a new src starts from the fallback; an empty src asks for nothing', async ({ page }) => {
    const seen = warnings(page);
    const asked: string[] = [];
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(`${PICTURES}/**`, async (route) => {
      const url = route.request().url();
      asked.push(url);
      if (url.endsWith('/slow.png')) {
        await held;
        return route.fulfill({ contentType: 'image/png', body: PICTURE });
      }
      if (url.endsWith('/gone.png')) return route.fulfill({ status: 404, contentType: 'text/plain', body: 'gone' });
      return route.fulfill({ contentType: 'image/png', body: PICTURE });
    });
    await mountHtml(page, {
      slow: `<p id="byline" style="margin:0;font:var(--tanrei-sys-typescale-body-font)">By <tanrei-avatar decorative size="small" initials="AL" src="${PICTURES}/slow.png"></tanrei-avatar> <span id="name">Ada Lovelace</span></p><p id="next" style="margin:0">The next line.</p>`,
      glyph: `<tanrei-avatar label="Someone" src="${PICTURES}/slow.png"></tanrei-avatar>`,
      gone: `<tanrei-avatar label="Ada Lovelace" initials="AL" src="${PICTURES}/gone.png"></tanrei-avatar><span id="after">after</span>`,
      none: '<tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar>',
      blank: '<tanrei-avatar label="Ada Lovelace" initials="AL" src="  "></tanrei-avatar>',
    });
    const places = () =>
      page.evaluate(() => ['[data-fixture="slow"] tanrei-avatar', '#name', '#next', '[data-fixture="glyph"] tanrei-avatar', '[data-fixture="gone"] tanrei-avatar', '#after'].map((s) => { const r = document.querySelector(s)!.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    // The verify: the initials before it arrives, with the box's place and size…
    expect(await drawn(avatar(page, 'slow'))).toEqual({ image: false, label: 'AL', glyph: null, images: 1 });
    await expect.poll(() => drawn(avatar(page, 'glyph'))).toEqual({ image: false, label: null, glyph: 'person', images: 1 });
    expect((await box(avatar(page, 'slow'))).width).toBe(24);
    // …a picture that is not there yet draws nothing of its own: no broken mark, no alternative text.
    expect(await css(avatar(page, 'slow').locator('.image'), 'visibility')).toBe('hidden');
    expect(await avatar(page, 'slow').locator('.image').getAttribute('alt')).toBe('');
    await expect.poll(() => drawn(avatar(page, 'gone'))).toEqual({ image: false, label: 'AL', glyph: null, images: 0 });
    const before = await places();
    // …and the picture after, unchanged in place and size, without a motion.
    release();
    await pictured(avatar(page, 'slow'));
    await pictured(avatar(page, 'glyph'));
    expect(await drawn(avatar(page, 'slow'))).toEqual({ image: true, label: null, glyph: null, images: 1 });
    expect(await drawn(avatar(page, 'glyph'))).toEqual({ image: true, label: null, glyph: null, images: 1 });
    expect(await places()).toEqual(before);
    for (const id of ['slow', 'glyph']) {
      expect(await avatar(page, id).evaluate((el) => el.shadowRoot!.getAnimations().length), id).toBe(0);
      expect(await css(avatar(page, id).locator('.image'), 'transition-duration'), id).toBe('0s');
    }
    // The picture that cannot be loaded: asked for once, reported with its address, and never again by itself.
    await expect.poll(() => seen.filter((w) => w.includes('AVT-4')).length).toBe(1);
    expect(seen.find((w) => w.includes('AVT-4'))).toContain(`${PICTURES}/gone.png`);
    await avatar(page, 'gone').evaluate((el: HTMLElement & { label: string; size: string }) => {
      el.label = 'Ada';
      el.size = 'large';
    });
    await settled(page);
    await page.waitForTimeout(150);
    expect(asked.filter((url) => url.endsWith('/gone.png'))).toHaveLength(1);
    expect(await drawn(avatar(page, 'gone'))).toEqual({ image: false, label: 'AL', glyph: null, images: 0 });
    // An empty address, or one of white space, asks for nothing.
    for (const id of ['none', 'blank']) expect(await drawn(avatar(page, id)), id).toEqual({ image: false, label: 'AL', glyph: null, images: 0 });
    expect(asked.filter((url) => !url.endsWith('/slow.png') && !url.endsWith('/gone.png'))).toEqual([]);

    // A new src: the fallback until the new picture has loaded — the old picture is not left in its place.
    let releaseSecond: () => void = () => {};
    const second = new Promise<void>((resolve) => (releaseSecond = resolve));
    await page.route(`${PICTURES}/second.png`, async (route) => {
      await second;
      return route.fulfill({ contentType: 'image/png', body: PICTURE });
    });
    await avatar(page, 'slow').evaluate((el: HTMLElement & { src: string }, src) => (el.src = src), `${PICTURES}/second.png`);
    await settled(page);
    expect(await drawn(avatar(page, 'slow'))).toEqual({ image: false, label: 'AL', glyph: null, images: 1 });
    releaseSecond();
    await pictured(avatar(page, 'slow'));
    expect(await avatar(page, 'slow').locator('.image').getAttribute('src')).toBe(`${PICTURES}/second.png`);
    // The failed one may be asked again by the product: the same address set again is a new src only if it changed.
    await avatar(page, 'gone').evaluate((el: HTMLElement & { src: string }, src) => (el.src = src), `${PICTURES}/there.png`);
    await pictured(avatar(page, 'gone'));
    // src emptied: the fallback, and no picture element.
    await avatar(page, 'gone').evaluate((el: HTMLElement & { src: string }) => (el.src = ''));
    await settled(page);
    expect(await drawn(avatar(page, 'gone'))).toEqual({ image: false, label: 'AL', glyph: null, images: 0 });
    expect(await places().then((now) => now.slice(0, 3))).toEqual(before.slice(0, 3));
  });

  test('AVT-4: the fixture image-failed names a picture that does not exist and draws its initials; the picture element is decoded off the main thread, takes loading, referrerpolicy and crossorigin as the product wrote them and none of them otherwise, and has an empty alternative text', async ({ page }) => {
    await mountSpec(page, 'image-failed', 'image');
    await expect.poll(() => drawn(avatar(page, 'image-failed'))).toEqual({ image: false, label: 'AL', glyph: null, images: 0 });
    expect((await box(avatar(page, 'image-failed'))).width).toBe(40);
    await pictured(avatar(page, 'image'));
    const attributes = (host: Locator) => host.locator('.image').evaluate((el) => Object.fromEntries(['alt', 'decoding', 'loading', 'referrerpolicy', 'crossorigin', 'draggable'].map((name) => [name, el.getAttribute(name)])));
    expect(await attributes(avatar(page, 'image'))).toEqual({ alt: '', decoding: 'async', loading: null, referrerpolicy: null, crossorigin: null, draggable: 'false' });
    await page.route(`${PICTURES}/**`, (route) => route.fulfill({ contentType: 'image/png', body: PICTURE, headers: { 'access-control-allow-origin': '*' } }));
    await mountHtml(page, {
      given: `<tanrei-avatar label="Ada Lovelace" initials="AL" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous" src="${PICTURES}/ada.png"></tanrei-avatar>`,
      far: `<div style="block-size:4000px"></div><tanrei-avatar id="far" label="Grace Hopper" initials="GH" loading="lazy" src="${PICTURES}/grace.png"></tanrei-avatar>`,
    });
    expect(await attributes(avatar(page, 'given'))).toEqual({ alt: '', decoding: 'async', loading: 'lazy', referrerpolicy: 'no-referrer', crossorigin: 'anonymous', draggable: 'false' });
    await pictured(avatar(page, 'given'));
    // A lazy picture far below the window keeps its box — so it can be asked for when it comes near — and its fallback.
    expect(await drawn(page.locator('#far'))).toEqual({ image: false, label: 'GH', glyph: null, images: 1 });
    await page.locator('#far').scrollIntoViewIfNeeded();
    await pictured(page.locator('#far'));
  });

  test('AVT-5: initials are one line at the centre in the text style of the size and label.color, as written — no change of case — and no more than the first two characters as a reader counts them, a longer value reported; they are text of their own direction, isolated, and kept from assistive technology', async ({ page }) => {
    const seen = warnings(page);
    await mountSpec(page, 'initials', 'initials-small', 'initials-large', 'initials-cjk', 'initials-rtl', 'square');
    // The verify: the fixture initials draws AL; initials-cjk draws one character.
    expect((await drawn(avatar(page, 'initials'))).label).toBe('AL');
    expect((await drawn(avatar(page, 'initials-cjk'))).label).toBe('山');
    expect((await drawn(avatar(page, 'initials-rtl'))).label).toBe('لح');
    const roles = { 'initials-small': 'small', initials: 'medium', 'initials-large': 'large' } as const;
    for (const [id, size] of Object.entries(roles)) {
      const label = avatar(page, id).locator('.label');
      expect(await textStyle(label), id).toEqual(await role(page, `label-typescale-${size}`));
      sameColor(await painted(label, 'color'), await tokenColor(page, 'label-color'), `${id} color`);
      expect(await css(label, 'white-space'), id).toBe('nowrap');
      expect(await css(label, 'text-transform'), id).toBe('none');
      expect(await css(label, 'unicode-bidi'), id).toBe('plaintext');
      const [outer, inner] = [await box(avatar(page, id)), await box(label)];
      near(inner.x + inner.width / 2, outer.x + outer.width / 2, `${id} centre x`);
      near(inner.y + inner.height / 2, outer.y + outer.height / 2, `${id} centre y`);
      expect(inner.width, `${id} fits`).toBeLessThan(outer.width);
      // Kept from assistive technology: everything drawn is in a hidden box.
      expect(await container(avatar(page, id)).getAttribute('aria-hidden'), id).toBe('true');
    }
    expect(seen.filter((w) => w.includes('AVT-5'))).toEqual([]);

    // Two characters as a reader counts them, in each writing system — never half of one.
    const cases: Record<string, [given: string, drawn: string]> = {
      latin: ['ALKQ', 'AL'],
      lower: ['al', 'al'],
      mixed: ['aL', 'aL'],
      one: ['A', 'A'],
      japanese: ['山田花子', '山田'],
      kana: ['はなこ', 'はな'],
      // Outside the Basic Multilingual Plane: one character is two code units.
      chinese: ['𠮷野家', '𠮷野'],
      arabic: ['ليلى', 'لي'],
      // A consonant with its vowel sign is one character: two characters are four code points.
      devanagari: ['किरात', 'किरा'],
      // A letter with a combining mark, written as two code points each.
      accents: ['éäx', 'éä'],
      // One picture made of several: a family, then a flag.
      emoji: ['\u{1F468}‍\u{1F469}‍\u{1F467}\u{1F1EF}\u{1F1F5}A', '\u{1F468}‍\u{1F469}‍\u{1F467}\u{1F1EF}\u{1F1F5}'],
      hangul: ['김민준', '김민'],
      spaced: [' AL ', 'AL'],
    };
    const escape = (v: string) => v.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    await mountHtml(page, Object.fromEntries(Object.entries(cases).map(([id, [given]]) => [id, `<tanrei-avatar label="A name" initials="${escape(given)}"></tanrei-avatar>`])));
    for (const [id, [, expected]] of Object.entries(cases)) expect((await drawn(avatar(page, id))).label, id).toBe(expected);
    // The verify: initials of four letters draw two and report once.
    const longer = ['latin', 'japanese', 'chinese', 'arabic', 'devanagari', 'accents', 'emoji', 'hangul', 'kana'];
    await expect.poll(() => seen.filter((w) => w.includes('AVT-5')).length).toBe(longer.length);
    expect(seen.filter((w) => w.includes('AVT-5') && w.includes('"ALKQ"'))).toHaveLength(1);
    expect(seen.find((w) => w.includes('"ALKQ"'))).toContain('"AL"');
    await avatar(page, 'latin').evaluate((el: HTMLElement & { label: string }) => (el.label = 'Another name'));
    await settled(page);
    expect(seen.filter((w) => w.includes('AVT-5') && w.includes('"ALKQ"'))).toHaveLength(1);

    // Their own direction: Latin initials keep their order in a right-to-left layout, Arabic ones theirs in a
    // left-to-right one, and neither reorders the text beside the avatar.
    await mountHtml(page, {
      'latin-in-rtl': '<p dir="rtl" style="margin:0">كتبه <tanrei-avatar decorative initials="AL"></tanrei-avatar> ليلى</p>',
      'arabic-in-ltr': '<p style="margin:0">By <tanrei-avatar decorative initials="لح"></tanrei-avatar> Layla</p>',
    });
    const letters = (id: string) =>
      avatar(page, id).evaluate((el) => {
        const node = [...el.shadowRoot!.querySelector('.label')!.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()) as Text;
        return [0, 1].map((i) => {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          return range.getBoundingClientRect().left;
        });
      });
    const [a, l] = await letters('latin-in-rtl');
    expect(a).toBeLessThan(l);
    const [lam, hah] = await letters('arabic-in-ltr');
    expect(lam).toBeGreaterThan(hah);
  });

  test('AVT-6: a glyph is the icon slot’s, or the system’s for the shape — person for a circle, category for a square — in a box of the icon size of the size at the centre, in icon.color, the icon set’s unselected family and fill and sys.icon.weight, and kept from assistive technology', async ({ page }) => {
    await mountSpec(page, 'glyph', 'glyph-small', 'glyph-large', 'icon', 'square-glyph');
    const sizes = { 'glyph-small': 'small', glyph: 'medium', 'glyph-large': 'large' } as const;
    const family = (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-icon-family-unselected'))).replaceAll('"', '').trim();
    for (const [id, size] of Object.entries(sizes)) {
      const icon = avatar(page, id).locator('.icon');
      await expect.poll(() => icon.getAttribute('data-drawn'), { message: id }).not.toBeNull();
      const side = await token(page, `icon-size-${size}`);
      const [outer, inner] = [await box(avatar(page, id)), await box(icon)];
      expect([inner.width, inner.height], id).toEqual([side, side]);
      near(inner.x + inner.width / 2, outer.x + outer.width / 2, `${id} centre x`);
      near(inner.y + inner.height / 2, outer.y + outer.height / 2, `${id} centre y`);
      expect(await css(icon, 'font-size'), id).toBe(`${side}px`);
      sameColor(await painted(icon, 'color'), await tokenColor(page, 'icon-color'), `${id} color`);
      expect((await css(icon, 'font-family')).replaceAll('"', ''), id).toContain(family.split(',')[0].trim());
      const variation = await css(icon, 'font-variation-settings');
      expect(variation, id).toMatch(/["']FILL["'] 0/);
      expect(variation, id).toMatch(new RegExp(`["']wght["'] ${await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-sys-icon-weight').trim())}`));
      expect(await css(icon, 'font-optical-sizing'), id).toBe('auto');
      expect(await css(icon, 'transition-duration'), id).toBe('0s');
    }
    expect([await token(page, 'icon-size-small'), await token(page, 'icon-size-medium'), await token(page, 'icon-size-large')]).toEqual([16, 24, 32]);
    expect((await drawn(avatar(page, 'glyph'))).glyph).toBe('person');
    expect((await drawn(avatar(page, 'square-glyph'))).glyph).toBe('category');
    // The product's glyph, in the same box and color; the system's is not drawn beside it.
    await expect.poll(async () => (await drawn(avatar(page, 'icon'))).glyph).toBe('smart_toy');
    expect(await avatar(page, 'icon').locator('.ink').count()).toBe(0);
    const [own, given] = [await box(avatar(page, 'glyph').locator('.icon')), await box(avatar(page, 'icon').locator('.icon'))];
    expect([given.width, given.height]).toEqual([own.width, own.height]);
    sameColor(await painted(avatar(page, 'icon').locator('> [slot="icon"]'), 'color'), await tokenColor(page, 'icon-color'), 'the slotted glyph');
    // Kept from assistive technology.
    for (const id of ['glyph', 'icon']) expect(await container(avatar(page, id)).getAttribute('aria-hidden'), id).toBe('true');
  });

  test('AVT-7: the avatar takes no pointer, touch or keyboard input and no focus, is not a stop in the focus order, changes nothing it draws under a pointer, a press or focus — no state layer, no ripple, no focus indicator — and emits no event', async ({ page }) => {
    await mountHtml(page, {
      row: '<button id="before">Before</button> <tanrei-avatar id="a" label="Ada Lovelace" initials="AL"></tanrei-avatar> <tanrei-avatar id="g" label="Someone"></tanrei-avatar> <button id="after">After</button>',
    });
    const a = page.locator('#a');
    await expect.poll(() => page.locator('#g').locator('.icon').getAttribute('data-drawn')).not.toBeNull();
    // Counts every event that leaves an avatar by itself: none is its own.
    await page.evaluate(() => {
      const w = window as unknown as { __own: string[] };
      w.__own = [];
      const original = EventTarget.prototype.dispatchEvent;
      EventTarget.prototype.dispatchEvent = function (event: Event) {
        if (this instanceof Element && this.localName.startsWith('tanrei-avatar')) w.__own.push(event.type);
        return original.call(this, event);
      };
    });
    const rest = (await pixels(a)).bytes;
    // Not focusable, and not in the focus order.
    expect(await a.evaluate((el: HTMLElement) => [el.tabIndex, el.hasAttribute('tabindex'), el.shadowRoot!.querySelectorAll('[tabindex], button, a, input').length])).toEqual([-1, false, 0]);
    await page.locator('#before').focus();
    await tab(page);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after');
    await a.evaluate((el: HTMLElement) => el.focus());
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('after');
    // Under a pointer and under a press, the same pixels; the pointer is the text's own, not a control's.
    await a.hover();
    await frames(page);
    expect(Buffer.compare((await pixels(a)).bytes, rest)).toBe(0);
    expect(await css(a, 'cursor')).toBe('auto');
    const b = await box(a);
    await page.mouse.move(b.x + 20, b.y + 20);
    await page.mouse.down();
    await frames(page);
    expect(Buffer.compare((await pixels(a)).bytes, rest)).toBe(0);
    expect(await a.evaluate((el) => [el.shadowRoot!.querySelectorAll('.ripple, [data-pressed]').length, el.shadowRoot!.getAnimations().length])).toEqual([0, 0]);
    await page.mouse.up();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    // No state rule and no focus indicator in its styles.
    expect(await a.evaluate((el) => [...el.shadowRoot!.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).filter((text) => /:hover|:active|:focus|data-pressed|ripple/.test(text)).length)).toBe(0);
    expect(await page.evaluate(() => (window as unknown as { __own: string[] }).__own)).toEqual([]);
  });

  test('AVT-8: inside a link or a Button the avatar lets input reach that element, stays as it is drawn while that element is hovered, focused or pressed, and is not a second target; while it is not decorative its label is that element’s content, so a link or a Button that holds only an avatar is named by it', async ({ page, browserName }) => {
    await mountHtml(page, {
      link: '<a id="profile" href="#ada" style="display:inline-block"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar></a>',
      button: '<button id="account" type="button" style="padding:4px"><tanrei-avatar label="Grace Hopper" initials="GH" size="small"></tanrei-avatar></button>',
      beside: '<a id="byline" href="#katherine"><tanrei-avatar decorative label="Katherine Johnson" initials="KJ" size="small"></tanrei-avatar> Katherine Johnson</a>',
    });
    // The verify: the link's accessible name is Ada Lovelace…
    await expect(page.getByRole('link', { name: 'Ada Lovelace', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Grace Hopper', exact: true })).toHaveCount(1);
    // …a decorative avatar beside the name adds nothing to it…
    await expect(page.getByRole('link', { name: 'Katherine Johnson', exact: true })).toHaveCount(1);
    // …the avatar's pixels do not change on hover, on focus or under a press…
    const a = avatar(page, 'link');
    const rest = (await pixels(a)).bytes;
    await a.hover();
    await frames(page);
    expect(Buffer.compare((await pixels(a)).bytes, rest)).toBe(0);
    await page.locator('#profile').focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('profile');
    expect(await a.evaluate((el) => el.matches(':focus'))).toBe(false);
    // …it is not a second target: the element under the pointer is the avatar, whose press is the link's…
    const pressed = await page.evaluate(() => {
      const w = window as unknown as { __pressed: number };
      w.__pressed = 0;
      document.querySelector('#account')!.addEventListener('click', () => w.__pressed++);
      return w.__pressed;
    });
    expect(pressed).toBe(0);
    await avatar(page, 'button').click();
    expect(await page.evaluate(() => (window as unknown as { __pressed: number }).__pressed)).toBe(1);
    // …and a click on the avatar follows the link.
    await a.click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#ada');
    expect(await css(a, 'pointer-events')).toBe('auto');
    if (browserName === 'chromium') {
      const tree = await exposed(page);
      // One thing each: the link is not a link that holds a second, separately named thing to press.
      expect(tree.filter((line) => line.trim().startsWith('link "Ada Lovelace"'))).toHaveLength(1);
      expect(tree.filter((line) => line.trim().startsWith('button "Grace Hopper"'))).toHaveLength(1);
      expect(tree.filter((line) => /^\s*(link|button) /.test(line))).toHaveLength(3);
    }
  });

  test('AVT-9: not decorative and labelled, the avatar is one image named by label whatever it draws, and exposes nothing else — not the initials, the glyph’s name, the address, its size or its shape; decorative it exposes nothing; without a label it exposes nothing and is reported', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mountSpec(page, 'initials', 'glyph', 'icon', 'image', 'square-large', 'decorative', 'image-failed');
    await pictured(avatar(page, 'image'));
    const names = { initials: 'Ada Lovelace', glyph: 'Someone without a picture', icon: 'Build service', image: 'Ada Lovelace', 'square-large': 'Design team', 'image-failed': 'Ada Lovelace' };
    for (const [id, name] of Object.entries(names)) {
      await expect(stage(page, id).getByRole('img', { name, exact: true }), id).toHaveCount(1);
      expect(await avatar(page, id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-hidden')]), id).toEqual(['img', name, null]);
    }
    // Decorative: nothing.
    expect(await avatar(page, 'decorative').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-hidden')])).toEqual([null, null, 'true']);
    await expect(stage(page, 'decorative').getByRole('img')).toHaveCount(0);
    if (browserName === 'chromium') {
      // Seven fixtures, six images and nothing else: no text, no second image for the picture.
      expect(await exposed(page)).toEqual(['image "Ada Lovelace"', 'image "Someone without a picture"', 'image "Build service"', 'image "Design team"', 'image "Ada Lovelace"', 'image "Ada Lovelace"']);
    }
    expect(seen.filter((w) => w.includes('AVT-9'))).toEqual([]);
    // Without a label: nothing, and a report. Decorative without one is what a byline's avatar is: no report.
    await mountHtml(page, {
      unnamed: '<tanrei-avatar initials="AL"></tanrei-avatar>',
      blank: '<tanrei-avatar label="   " initials="AL"></tanrei-avatar>',
      quiet: '<tanrei-avatar decorative initials="AL"></tanrei-avatar>',
    });
    for (const id of ['unnamed', 'blank', 'quiet']) {
      expect(await avatar(page, id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-hidden')]), id).toEqual([null, null, 'true']);
    }
    if (browserName === 'chromium') expect(await exposed(page)).toEqual([]);
    await expect.poll(() => seen.filter((w) => w.includes('AVT-9')).length).toBe(2);
    // decorative changes while it is shown.
    await avatar(page, 'quiet').evaluate((el: HTMLElement & { label: string; decorative: boolean }) => {
      el.label = 'Ada Lovelace';
      el.decorative = false;
    });
    await settled(page);
    await expect(stage(page, 'quiet').getByRole('img', { name: 'Ada Lovelace', exact: true })).toHaveCount(1);
  });

  test('AVT-10: a change of label, initials, the icon slot’s glyph, size or shape is drawn and exposed at once, without a motion, and is not announced', async ({ page }) => {
    await mountSpec(page, 'initials', 'icon');
    const a = avatar(page, 'initials');
    await a.evaluate((el: HTMLElement & { label: string; initials: string; size: string; shape: string }) => {
      el.label = 'Grace Hopper';
      el.initials = 'GH';
      el.size = 'large';
      el.shape = 'square';
    });
    await a.evaluate((el: HTMLElement & { updateComplete: Promise<unknown> }) => el.updateComplete);
    // At once: read in the same task as the update, with nothing running.
    expect(await a.evaluate((el) => [el.shadowRoot!.querySelector('.label')!.textContent, el.getAttribute('aria-label'), el.getBoundingClientRect().width, getComputedStyle(el.shadowRoot!.querySelector('.container')!).borderTopLeftRadius, el.shadowRoot!.getAnimations().length])).toEqual(['GH', 'Grace Hopper', 56, '6px', 0]);
    for (const part of ['.container', '.label']) expect(await css(a.locator(part), 'transition-duration'), part).toBe('0s');
    // The glyph: another name in the slot, then no glyph of the product's at all.
    const icon = avatar(page, 'icon');
    await icon.evaluate((el) => (el.querySelector('[slot="icon"]')!.textContent = 'support_agent'));
    await expect.poll(async () => (await drawn(icon)).glyph).toBe('support_agent');
    await icon.evaluate((el) => el.querySelector('[slot="icon"]')!.remove());
    await expect.poll(async () => (await drawn(icon)).glyph).toBe('person');
    // Initials taken away: the glyph; given back: the initials.
    await a.evaluate((el: HTMLElement & { initials: string }) => (el.initials = ''));
    await expect.poll(async () => (await drawn(a)).glyph).toBe('category');
    // Nothing announces: no live region in either, no role that announces.
    for (const host of [a, icon]) {
      expect(await host.evaluate((el) => [el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length, el.getAttribute('aria-live')])).toEqual([0, null]);
    }
  });

  test('AVT-11: with the text enlarged the avatar keeps its box and its glyph at their sizes, and its initials are held to the glyph’s box of the size, so they still stand inside the avatar (the initials’ text role itself follows the text dial)', async ({ page }) => {
    await mountSpec(page, 'initials', 'initials-small', 'initials-large', 'glyph', 'glyph-small', 'glyph-large', 'square', 'group-max');
    const ids = ['initials', 'initials-small', 'initials-large', 'glyph', 'glyph-small', 'glyph-large', 'square'];
    const measure = async () => Object.fromEntries(await Promise.all(ids.map(async (id) => [id, [await box(avatar(page, id)).then((b) => [b.width, b.height]), id.startsWith('glyph') ? await box(avatar(page, id).locator('.icon')).then((b) => [b.width, b.height]) : null]] as const)));
    const before = await measure();
    const groupBefore = await box(group(page, 'group-max'));
    const sizeBefore = Number.parseFloat(await css(avatar(page, 'initials').locator('.label'), 'font-size'));
    // 200 % text.
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await frames(page);
    expect(await measure()).toEqual(before);
    expect(await box(group(page, 'group-max'))).toEqual(groupBefore);
    const sizes = { 'initials-small': 'small', initials: 'medium', 'initials-large': 'large', square: 'medium' } as const;
    for (const [id, size] of Object.entries(sizes)) {
      const label = avatar(page, id).locator('.label');
      const fontSize = Number.parseFloat(await css(label, 'font-size'));
      expect(fontSize, id).toBeLessThanOrEqual(await token(page, `icon-size-${size}`));
      const [outer, inner] = [await box(avatar(page, id)), await box(label)];
      expect(inner.width, `${id}: the initials stand inside the box`).toBeLessThan(outer.width);
      near(inner.x + inner.width / 2, outer.x + outer.width / 2, `${id} centre x`);
    }
    // The role's size is the text dial's, so the initials are larger than before.
    expect(Number.parseFloat(await css(avatar(page, 'initials').locator('.label'), 'font-size'))).toBeGreaterThan(sizeBefore);
    // The overflow box's count is held the same way.
    expect((await box(overflow(page, 'group-max').locator('.count'))).width).toBeLessThan((await box(overflow(page, 'group-max'))).width);
  });

  test('AVT-11: a byline and a group at 200 % text in a stage 320 wide keep their boxes and need no horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await mountHtml(page, {
      byline: '<p style="margin:0;font:var(--tanrei-sys-typescale-body-font)"><tanrei-avatar decorative size="small" initials="AL"></tanrei-avatar> Ada Lovelace, 7 October 2026</p>',
      group: `<tanrei-avatar-group label="Reviewers" max="4">${['AL', 'GH', 'KJ', 'HL', 'AE', 'MJ'].map((i) => `<tanrei-avatar label="Person ${i}" initials="${i}"></tanrei-avatar>`).join('')}</tanrei-avatar-group>`,
    });
    await override(page, { '--tanrei-dial-type-base': '32px' });
    await frames(page);
    expect((await box(avatar(page, 'byline'))).width).toBe(24);
    expect((await box(group(page, 'group'))).width).toBe(4 * 40 - 3 * (await token(page, 'group-overlap-medium')));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('AVT-12: as a badge’s anchor the avatar is drawn exactly as without one — its square box is the anchor’s bounds, the badge is placed by that box’s top-end corner outside the avatar’s clip, and the badge’s label is the avatar’s description after its name; it has no dot, count or status of its own', async ({ page, browserName }) => {
    await mountHtml(page, {
      plain: '<tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar>',
      dot: '<tanrei-badge label="New messages"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar></tanrei-badge>',
      count: '<tanrei-badge count="3" label="3 unread"><tanrei-avatar label="Grace Hopper" initials="GH"></tanrei-avatar></tanrei-badge>',
      rtl: '<div dir="rtl"><tanrei-badge label="New messages"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar></tanrei-badge></div>',
    });
    await page.evaluate(() => Promise.all([...document.querySelectorAll('tanrei-badge')].map((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete)));
    await frames(page);
    // Drawn exactly as without one.
    const plain = await pixels(avatar(page, 'plain'));
    const anchor = await box(avatar(page, 'dot'));
    expect([anchor.width, anchor.height]).toEqual([40, 40]);
    const badge = await box(page.locator('[data-fixture="dot"] tanrei-badge'));
    expect([badge.x, badge.y, badge.width, badge.height]).toEqual([anchor.x, anchor.y, 40, 40]);
    const anchored = await pixels(avatar(page, 'dot'));
    for (const [x, y] of [[20, 20], [6, 20], [20, 34], [8, 8]]) expect(anchored.at(x, y), `${x},${y}`).toBe(plain.at(x, y));
    // The verify: the dot's centre is where BDG-1 places it for a 40 by 40 anchor, and the dot is whole.
    const offset = await resolveToken(page, '--tanrei-comp-badge-dot-offset');
    const dotSize = await resolveToken(page, '--tanrei-comp-badge-dot-size');
    const dot = await box(page.locator('[data-fixture="dot"] tanrei-badge .corner > .container'));
    near(dot.x + dot.width / 2, anchor.x + anchor.width - offset, 'the dot’s centre x');
    near(dot.y + dot.height / 2, anchor.y + offset, 'the dot’s centre y');
    expect([dot.width, dot.height]).toEqual([dotSize, dotSize]);
    // Whole: it is not inside the avatar's clip — the pixel at its centre is the badge's color, not the avatar's.
    const dotColor = rgb(await colorOf(page, 'var(--tanrei-comp-badge-container-color)'));
    const whole = await pixels(stage(page, 'dot'));
    const st = await box(stage(page, 'dot'));
    expect(whole.at(dot.x + dot.width / 2 - st.x, dot.y + dot.height / 2 - st.y)).toBe(dotColor);
    expect(whole.at(dot.x + dot.width - 1.5 - st.x, dot.y + dot.height / 2 - st.y)).toBe(dotColor);
    // In right-to-left the top-end corner is the top left.
    const [rtlAnchor, rtlDot] = [await box(avatar(page, 'rtl')), await box(page.locator('[data-fixture="rtl"] tanrei-badge .corner > .container'))];
    near(rtlDot.x + rtlDot.width / 2, rtlAnchor.x + offset, 'the dot’s centre x in right-to-left');
    // Nothing of its own: no dot, no count in the avatar's shadow root.
    expect(await avatar(page, 'dot').evaluate((el) => el.shadowRoot!.querySelectorAll('.container > *:not(.label):not(.icon)').length)).toBe(0);
    // The badge's label is the avatar's description after its name.
    expect(await avatar(page, 'dot').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-description')])).toEqual(['img', 'Ada Lovelace', 'New messages']);
    expect(await avatar(page, 'count').getAttribute('aria-description')).toBe('3 unread');
    if (browserName === 'chromium') {
      const tree = await exposed(page);
      expect(tree).toContain('image "Ada Lovelace" (New messages)');
      expect(tree).toContain('image "Grace Hopper" (3 unread)');
    }
  });

  test('AVT-13: in forced colors a fallback draws an edge of the system’s hairline in the text color inside its box, following its shape, and its initials or its glyph in that color; a picture keeps its own colors', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit does not emulate forced colors');
    await mountSpec(page, 'initials', 'icon', 'glyph', 'square', 'image', 'group-max', 'group-image');
    await pictured(avatar(page, 'image'));
    await expect.poll(() => avatar(page, 'icon').locator('.icon').getAttribute('data-drawn')).not.toBeNull();
    const ids = ['initials', 'icon', 'glyph', 'square', 'image'];
    const geometry = async () => Object.fromEntries(await Promise.all(ids.map(async (id) => [id, [await box(avatar(page, id)), await box(avatar(page, id).locator(id === 'image' ? '.image' : id === 'initials' || id === 'square' ? '.label' : '.icon'))]] as const)));
    const before = await geometry();
    const picture = await pixels(avatar(page, 'image'));
    const hairline = await resolveToken(page, '--tanrei-sys-border-hairline');
    await page.emulateMedia({ forcedColors: 'active' });
    const canvasText = await colorOf(page, 'CanvasText');
    // The verify: the fixtures initials and icon have a CanvasText edge and CanvasText content…
    for (const id of ['initials', 'icon', 'glyph', 'square']) {
      const c = container(avatar(page, id));
      expect(await css(c, 'border-top-style'), id).toBe('solid');
      expect(Number.parseFloat(await css(c, 'border-top-width')), id).toBe(hairline);
      sameColor(await painted(c, 'border-top-color'), canvasText, `${id} edge`);
      sameColor(await painted(avatar(page, id).locator(id === 'initials' || id === 'square' ? '.label' : '.icon'), 'color'), canvasText, `${id} content`);
    }
    // …inside the box and following its shape: nothing moved, and the square's edge has the square's corners.
    expect(await geometry()).toEqual(before);
    expect(await css(container(avatar(page, 'square')), 'border-top-left-radius')).toBe('6px');
    expect(await css(container(avatar(page, 'square')), 'box-sizing')).toBe('border-box');
    // …and the fixture image keeps its picture's colors, with no edge over it.
    expect(await css(container(avatar(page, 'image')), 'border-top-style')).toBe('none');
    expect(await css(avatar(page, 'image').locator('.image'), 'forced-color-adjust')).toBe('none');
    const forced = await pixels(avatar(page, 'image'));
    for (const [x, y] of [[12, 13], [28, 13], [30, 30], [20, 20]]) expect(forced.at(x, y), `the picture at ${x},${y}`).toBe(picture.at(x, y));
    expect(new Set([[12, 13], [28, 13], [30, 30]].map(([x, y]) => forced.at(x, y))).size).toBe(3);
    // A group: every fallback box, the overflow box too, is a bounded mark; a member's picture is left alone.
    for (const part of [container(members(page, 'group-max').first()), overflow(page, 'group-max'), container(members(page, 'group-image').nth(2))]) {
      sameColor(await painted(part, 'border-top-color'), canvasText, 'a group’s edge');
      expect(Number.parseFloat(await css(part, 'border-top-width'))).toBe(hairline);
    }
    sameColor(await painted(overflow(page, 'group-max').locator('.count'), 'color'), canvasText, 'the count');
    expect(await css(container(members(page, 'group-image').first()), 'border-top-style')).toBe('none');
  });

  test('AVT-14: the direction is the nearest ancestor’s, not the root’s and not a setting of the avatar’s own; when it changes while the avatar is shown it is drawn for the new direction at once, without a motion, keeping what it shows — only its glyph and a group’s order differ', async ({ page }) => {
    const MIRRORED = 'matrix(-1, 0, 0, 1, 0, 0)';
    const transform = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).transform);
    // The verify: the direction set on an ancestor inside the page, not on the root…
    await mount(page, [
      ...spec.fixtures.filter((f) => ['icon-rtl', 'initials-rtl', 'group-max-rtl'].includes(f.id)),
      fx('picture', { label: 'Ada Lovelace', src: 'fixtures/avatar.png', shape: 'square', size: 'large' }, { direction: 'rtl' }),
    ]);
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    // …and no direction setting of its own: no property of the element names one.
    expect(await avatar(page, 'icon-rtl').evaluate((el) => [el.hasAttribute('dir'), Object.keys((el.constructor as unknown as { properties: object }).properties).filter((name) => /^dir/i.test(name))])).toEqual([false, []]);
    await pictured(avatar(page, 'picture'));
    const glyph = avatar(page, 'icon-rtl').locator('> [slot="icon"]');
    await expect.poll(() => transform(glyph)).toBe(MIRRORED);
    const lefts = async () => Promise.all((await members(page, 'group-max-rtl').all()).slice(0, 3).map(async (m) => (await box(m)).x));
    const rtl = await lefts();
    expect(rtl[0]).toBeGreaterThan(rtl[1]);
    expect(rtl[1]).toBeGreaterThan(rtl[2]);
    const picture = await pixels(avatar(page, 'picture'));
    const initials = await drawn(avatar(page, 'initials-rtl'));
    // …and again changed after the first render.
    await page.evaluate(() => {
      for (const ancestor of document.querySelectorAll('.stage, .stage div[dir]')) ancestor.setAttribute('dir', 'ltr');
    });
    await expect.poll(() => transform(glyph)).toBe('none');
    const ltr = await lefts();
    expect(ltr[0]).toBeLessThan(ltr[1]);
    expect(ltr[1]).toBeLessThan(ltr[2]);
    // What it shows is kept: the same picture, unmirrored, and the same initials in their own order.
    const after = await pixels(avatar(page, 'picture'));
    for (const [x, y] of [[17, 18], [39, 18], [50, 50]]) expect(after.at(x, y), `${x},${y}`).toBe(picture.at(x, y));
    expect(await drawn(avatar(page, 'initials-rtl'))).toEqual(initials);
    expect(await avatar(page, 'icon-rtl').evaluate((el) => el.shadowRoot!.getAnimations().length)).toBe(0);
    expect(await css(members(page, 'group-max-rtl').first(), 'transition-duration')).toBe('0s');
    // And back, on the document this time: the nearest ancestor that sets one still decides.
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl');
    });
    await frames(page);
    expect(await transform(glyph)).toBe('none');
    expect((await lefts())[0]).toBeLessThan((await lefts())[1]);
  });

  test('AVT-15: in right-to-left the icon helper mirrors a glyph of the icon slot that the icon set marks, or the product forces, inside its own box, and not one the product forbids or an unmarked one; the avatar mirrors nothing itself — not its picture and not its initials', async ({ page }) => {
    const MIRRORED = 'matrix(-1, 0, 0, 1, 0, 0)';
    const transform = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).transform);
    const rtl = (markup: string) => `<div dir="rtl">${markup}</div>`;
    await mountSpec(page, 'icon-rtl', 'initials-rtl');
    // The fixture icon-rtl draws help, which the icon set mirrors.
    await expect.poll(() => transform(avatar(page, 'icon-rtl').locator('> [slot="icon"]'))).toBe(MIRRORED);
    expect(await transform(avatar(page, 'initials-rtl').locator('.label'))).toBe('none');
    await mountHtml(page, {
      'icon-rtl': rtl('<tanrei-avatar label="خدمة المساعدة"><span slot="icon">help</span></tanrei-avatar>'),
      'initials-rtl': rtl('<tanrei-avatar label="ليلى حسن" initials="لح"></tanrei-avatar>'),
      unmarked: rtl('<tanrei-avatar label="Build service"><span slot="icon">smart_toy</span></tanrei-avatar>'),
      own: rtl('<tanrei-avatar label="Someone"></tanrei-avatar>'),
      picture: rtl(`<tanrei-avatar label="Ada Lovelace" src="${avatarPicture()}"></tanrei-avatar>`),
      ltr: '<tanrei-avatar label="Help"><span slot="icon">help</span></tanrei-avatar>',
      forced: rtl('<tanrei-avatar label="Build service"><span slot="icon" data-mirror="always">smart_toy</span></tanrei-avatar>'),
      forbidden: rtl('<tanrei-avatar label="Help"><span slot="icon" data-mirror="never">help</span></tanrei-avatar>'),
    });
    await pictured(avatar(page, 'picture'));
    const glyph = (id: string) => avatar(page, id).locator('> [slot="icon"]');
    await expect.poll(() => transform(glyph('icon-rtl'))).toBe(MIRRORED);
    expect(await transform(glyph('unmarked'))).toBe('none');
    expect(await transform(glyph('forced'))).toBe(MIRRORED);
    expect(await transform(glyph('forbidden'))).toBe('none');
    expect(await transform(glyph('ltr'))).toBe('none');
    // The system's own glyph goes through the same rule, which marks neither of them.
    expect(await transform(avatar(page, 'own').locator('.icon'))).toBe('none');
    // Inside its own box: the mirrored glyph's place, size and color are an unmirrored one's.
    const [mirrored, plain] = [await box(avatar(page, 'icon-rtl').locator('.icon')), await box(avatar(page, 'unmarked').locator('.icon'))];
    near(mirrored.x - (await box(avatar(page, 'icon-rtl'))).x, plain.x - (await box(avatar(page, 'unmarked'))).x, 'the same place');
    expect([mirrored.width, mirrored.height]).toEqual([plain.width, plain.height]);
    expect(await painted(glyph('icon-rtl'), 'color')).toEqual(await painted(glyph('unmarked'), 'color'));
    // The avatar mirrors nothing itself: no part of its own is transformed, nor its picture, nor its initials.
    for (const id of ['icon-rtl', 'initials-rtl', 'picture']) {
      expect(await transform(avatar(page, id)), id).toBe('none');
      expect(await transform(container(avatar(page, id))), id).toBe('none');
    }
    expect(await transform(avatar(page, 'icon-rtl').locator('.icon'))).toBe('none');
    expect(await transform(avatar(page, 'initials-rtl').locator('.label'))).toBe('none');
    expect(await transform(avatar(page, 'picture').locator('.image'))).toBe('none');
  });

  test('AVT-16: given members, the avatar is a group — one row that does not wrap, in the order given from the start edge, each member at the group’s size and shape with its own picture, initials or glyph; each box after the first lies over the end of the one before it by the overlap of the size and above it, every box is surrounded by a gap of group.outline that takes no room, and the group is as wide as its boxes less their overlaps and as high as one', async ({ page }) => {
    await mountSpec(page, 'group', 'group-small', 'group-large', 'group-square', 'group-image');
    // The verify: three medium members are 40 + 30 + 30 = 100 wide; the second covers the last 10 of the first, with 2 of the surface's color between the two.
    expect([await token(page, 'group-overlap-small'), await token(page, 'group-overlap-medium'), await token(page, 'group-overlap-large'), await token(page, 'group-outline-width')]).toEqual([6, 10, 14, 2]);
    const g = await box(group(page, 'group'));
    expect([g.width, g.height]).toEqual([100, 40]);
    const xs = await Promise.all((await members(page, 'group').all()).map(async (m) => (await box(m)).x - g.x));
    expect(xs).toEqual([0, 30, 60]);
    for (const [id, count] of [['group-small', 2], ['group-large', 3], ['group-square', 3], ['group-image', 3]] as const) {
      const size = String(spec.fixtures.find((f) => f.id === id)!.props.size ?? 'medium');
      const [side, overlap] = [await token(page, `container-size-${size}`), await token(page, `group-overlap-${size}`)];
      const b = await box(group(page, id));
      expect([b.width, b.height], id).toEqual([count * side - (count - 1) * overlap, side]);
    }
    expect(await css(group(page, 'group'), 'display')).toBe('inline-flex');
    expect(await css(group(page, 'group').locator('.row'), 'flex-wrap')).toBe('nowrap');
    // The gap: outside each box's edge, following its shape, taking no room.
    const [width, color] = [await token(page, 'group-outline-width'), await tokenColor(page, 'group-outline-color')];
    for (const m of await members(page, 'group').all()) {
      const shadow = await css(container(m), 'box-shadow');
      expect(shadow).toMatch(new RegExp(`0px 0px 0px ${width}px$`));
      sameColor(await colorOf(page, shadow.replace(/ 0px 0px 0px \d+(\.\d+)?px$/, '')), color, 'the gap’s color');
      expect((await box(m)).width).toBe(40);
    }
    // Painted: between the first member's fill and the second's, the gap in the surface's color; the second is above the first.
    const fill = rgb(await tokenColor(page, 'container-color'));
    const row = await pixels(group(page, 'group'));
    expect(row.at(26, 20)).toBe(fill);
    expect(row.at(29, 20)).toBe(rgb(color));
    expect(row.at(32, 20)).toBe(fill);
    const top = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.getAttribute('label'), [g.x + 35, g.y + 20] as const);
    expect(top).toBe('Grace Hopper');
    // Each member is an avatar of the group's size and shape, with its own picture, initials or glyph.
    for (const m of await members(page, 'group-small').all()) expect(await m.getAttribute('size')).toBe('small');
    for (const m of await members(page, 'group-square').all()) {
      expect(await m.getAttribute('shape')).toBe('square');
      expect(await css(container(m), 'border-top-left-radius')).toBe('6px');
    }
    await pictured(members(page, 'group-image').first());
    expect((await drawn(members(page, 'group-image').nth(2))).label).toBe('KJ');
    await expect.poll(async () => (await drawn(members(page, 'group-square').nth(2))).glyph).toBe('category');
    // The group ignores a src, initials, a glyph and decorative of its own, and a member's own size and shape.
    await mountHtml(page, {
      own: `<tanrei-avatar-group label="Authors" src="${avatarPicture()}" initials="XX" decorative size="small"><span slot="icon">help</span><tanrei-avatar label="Ada Lovelace" initials="AL" size="large" shape="square"></tanrei-avatar><tanrei-avatar label="Grace Hopper" initials="GH"></tanrei-avatar></tanrei-avatar-group>`,
    });
    const own = group(page, 'own');
    expect(await own.evaluate((el) => [el.shadowRoot!.querySelectorAll('img, .icon').length, el.getAttribute('role'), el.getAttribute('aria-hidden')])).toEqual([0, 'group', null]);
    expect(await members(page, 'own').first().evaluate((el) => [el.getAttribute('size'), el.getAttribute('shape')])).toEqual(['small', 'circle']);
    const o = await box(own);
    expect([o.width, o.height]).toEqual([2 * 24 - 6, 24]);
    // A container that stretches what has no size of its own leaves the group as wide as its boxes and as high as one.
    await mountHtml(page, {
      column: '<div style="display:flex;flex-direction:column;inline-size:300px"><tanrei-avatar-group id="col" label="Authors"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar><tanrei-avatar label="Grace Hopper" initials="GH"></tanrei-avatar></tanrei-avatar-group></div>',
      row: '<div style="display:flex;inline-size:50px;block-size:90px"><tanrei-avatar-group id="row" label="Authors"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar><tanrei-avatar label="Grace Hopper" initials="GH"></tanrei-avatar></tanrei-avatar-group></div>',
    });
    for (const id of ['col', 'row']) {
      const b = await box(page.locator(`#${id}`));
      expect([b.width, b.height], id).toEqual([70, 40]);
    }
    await expect(own.locator('> [slot="icon"]')).toBeHidden();
  });

  test('AVT-17: with more members than max, and max 2 or more, the group draws the first max less one members and then an overflow box — a box of the group’s size and shape in container.color, placed and surrounded as a member, holding a plus sign and the number not drawn in the label style and color; with max 0, or no more members than max, it draws every member and no box; the box takes no input and is not a control', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => ['group-max', 'group-large'].includes(f.id)),
      fx('four-of-four', { label: 'Authors', max: 4 }, { items: [member('A', 'A'), member('B', 'B'), member('C', 'C'), member('D', 'D')] }),
      fx('five-of-four', { label: 'Authors', max: 4 }, { items: [member('A', 'A'), member('B', 'B'), member('C', 'C'), member('D', 'D'), member('E', 'E')] }),
      fx('no-max', { label: 'Authors' }, { items: [member('A', 'A'), member('B', 'B'), member('C', 'C'), member('D', 'D'), member('E', 'E')] }),
      fx('two', { label: 'Authors', max: 2, shape: 'square', size: 'small' }, { items: [member('A', 'A'), member('B', 'B'), member('C', 'C')] }),
    ]);
    const shown = (id: string) => members(page, id).evaluateAll((list) => list.filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => el.getAttribute('label')));
    // The verify: six members and max 4 — three members and a box reading +3.
    expect(await shown('group-max')).toEqual(['Ada Lovelace', 'Grace Hopper', 'Katherine Johnson']);
    expect(await overflow(page, 'group-max').locator('.count').textContent()).toBe('+3');
    // The members it does not draw stay in the document.
    expect(await members(page, 'group-max').count()).toBe(6);
    // Four members with max 4: four members and no box; five: three and +2 — never a box to hide one member.
    expect(await shown('four-of-four')).toEqual(['A', 'B', 'C', 'D']);
    expect(await overflow(page, 'four-of-four').count()).toBe(0);
    expect(await shown('five-of-four')).toEqual(['A', 'B', 'C']);
    expect(await overflow(page, 'five-of-four').locator('.count').textContent()).toBe('+2');
    expect(await shown('no-max')).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(await overflow(page, 'no-max').count()).toBe(0);
    expect(await shown('two')).toEqual(['A']);
    expect(await overflow(page, 'two').locator('.count').textContent()).toBe('+2');
    // The row's width does not depend on how many are hidden.
    expect((await box(group(page, 'five-of-four'))).width).toBe((await box(group(page, 'four-of-four'))).width);
    // The box: the group's size and shape, the fallback's fill, placed and surrounded as a member is, last in the row.
    for (const [id, size] of [['group-max', 'medium'], ['group-large', 'large'], ['two', 'small']] as const) {
      const [side, overlap] = [await token(page, `container-size-${size}`), await token(page, `group-overlap-${size}`)];
      const [b, last, g] = [await box(overflow(page, id)), await box(members(page, id).nth((await shown(id)).length - 1)), await box(group(page, id))];
      expect([b.width, b.height], id).toEqual([side, side]);
      expect(b.x - last.x, id).toBe(side - overlap);
      near(b.x + b.width, g.x + g.width, `${id}: the last box`);
      sameColor(await painted(overflow(page, id), 'background-color'), await tokenColor(page, 'container-color'), `${id} fill`);
      expect(await css(overflow(page, id), 'box-shadow'), id).toBe(await css(container(members(page, id).first()), 'box-shadow'));
      const count = overflow(page, id).locator('.count');
      expect(await textStyle(count), id).toEqual(await role(page, `label-typescale-${size}`));
      sameColor(await painted(count, 'color'), await tokenColor(page, 'label-color'), `${id} count color`);
      expect(await css(count, 'white-space'), id).toBe('nowrap');
      const c = await box(count);
      near(c.x + c.width / 2, b.x + b.width / 2, `${id} count centre`);
    }
    expect(await css(overflow(page, 'two'), 'border-top-left-radius')).toBe('6px');
    // Above the member before it.
    const [g, b] = [await box(group(page, 'group-max')), await box(overflow(page, 'group-max'))];
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.localName, [b.x + 3, g.y + 20] as const)).toBe(GROUP);
    // Not a control: no role, no tab stop, nothing listens, the pointer is the text's.
    expect(await overflow(page, 'group-max').evaluate((el) => [el.getAttribute('role'), el.getAttribute('tabindex'), (el as HTMLElement).tabIndex, el.localName, getComputedStyle(el).cursor])).toEqual([null, null, -1, 'span', 'auto']);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement === null)).toBe(true);
  });

  test('AVT-18: with total greater than the members given, the group counts every member up to total and draws the overflow box with that number after the members it draws — all of them where they fit within max less one or max is 0; the number is in the locale’s digits with no grouping, 999 and a plus sign above 999, and the sign and the number are one left-to-right run, so the plus sign stays before the digits in right-to-left', async ({ page }) => {
    const three = [member('Ada Lovelace', 'AL'), member('Grace Hopper', 'GH'), member('Katherine Johnson', 'KJ')];
    const four = [...three, member('Hedy Lamarr', 'HL')];
    await mount(page, [
      ...spec.fixtures.filter((f) => f.id === 'group-total'),
      fx('no-max', { label: 'Members', total: 12 }, { items: three }),
      fx('fits', { label: 'Members', max: 5, total: 12 }, { items: three }),
      fx('full', { label: 'Members', max: 4, total: 10 }, { items: four }),
      fx('equal', { label: 'Members', max: 4, total: 4 }, { items: four }),
      fx('edge', { label: 'Members', max: 3, total: 1001, size: 'large' }, { items: three }),
      fx('capped', { label: 'Members', max: 3, total: 1002, size: 'large' }, { items: three }),
      fx('grouping', { label: 'Members', total: 2500, size: 'large' }, { items: three }),
      fx('rtl', { label: 'الأعضاء', max: 4, total: 240 }, { items: three, direction: 'rtl' }),
    ]);
    const shown = (id: string) => members(page, id).evaluateAll((list) => list.filter((el) => (el as HTMLElement).offsetWidth > 0).length);
    const text = (id: string) => overflow(page, id).locator('.count').textContent();
    // The verify: three members, max 4 and total 240 — three members and a box reading +237.
    expect([await shown('group-total'), await text('group-total')]).toEqual([3, '+237']);
    expect([await shown('no-max'), await text('no-max')]).toEqual([3, '+9']);
    expect([await shown('fits'), await text('fits')]).toEqual([3, '+9']);
    // The members given fill max: one fewer is drawn, and the box counts the rest.
    expect([await shown('full'), await text('full')]).toEqual([3, '+7']);
    expect([await shown('equal'), await overflow(page, 'equal').count()]).toEqual([4, 0]);
    // 999 is drawn as it is; above it, 999 and a plus sign; never a grouping separator.
    expect([await shown('edge'), await text('edge')]).toEqual([2, '+999']);
    expect([await shown('capped'), await text('capped')]).toEqual([2, '999+']);
    expect(await text('grouping')).toBe('999+');
    // One left-to-right run, isolated: in right-to-left the plus sign is still before (to the left of) the digits.
    const count = overflow(page, 'rtl').locator('.count');
    expect([await css(count, 'direction'), await css(count, 'unicode-bidi')]).toEqual(['ltr', 'isolate']);
    const [plus, digit] = await count.evaluate((el) => {
      const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.includes('+')) as Text;
      const at = node.textContent!.indexOf('+');
      return [at, at + 1].map((i) => {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        return range.getBoundingClientRect().left;
      });
    });
    expect(plus).toBeLessThan(digit);
    expect(await text('rtl')).toBe('+237');
    // The locale's digits: under a language whose numbers are written in other digits, those digits, still ungrouped.
    await mountHtml(page, {
      arab: `<div lang="ar-EG" dir="rtl"><tanrei-avatar-group label="الأعضاء" max="4" total="240">${['لح', 'عخ', 'نس'].map((i) => `<tanrei-avatar label="عضو ${i}" initials="${i}"></tanrei-avatar>`).join('')}</tanrei-avatar-group></div>`,
      hindi: `<div lang="hi-u-nu-deva"><tanrei-avatar-group label="सदस्य" total="1240" max="3">${['कि', 'रा'].map((i) => `<tanrei-avatar label="सदस्य ${i}" initials="${i}"></tanrei-avatar>`).join('')}</tanrei-avatar-group></div>`,
    });
    const expected = await page.evaluate(() => [new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(237), new Intl.NumberFormat('hi-u-nu-deva', { useGrouping: false }).format(999)]);
    expect(await text('arab')).toBe(`+${expected[0]}`);
    expect(expected[0]).not.toBe('237');
    expect(await text('hindi')).toBe(`${expected[1]}+`);
  });

  test('AVT-19: the group is one group named by its label, holding in order one image for each member it draws, each named by that member’s label whatever decorative says, and then the overflow’s text — overflowLabel or the product’s words with {count} filled by the real number not drawn, else the drawn text; the gaps and the members not drawn are kept from assistive technology; a group without a label and a member without one are reported', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mountSpec(page, 'group-max');
    // The verify: group Reviewers; image Ada Lovelace; image Grace Hopper; image Katherine Johnson; 3 more.
    await expect(group(page, 'group-max')).toMatchAriaSnapshot(`
      - group "Reviewers":
        - img "Ada Lovelace"
        - img "Grace Hopper"
        - img "Katherine Johnson"
        - text: 3 more
    `);
    expect(await group(page, 'group-max').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual(['group', 'Reviewers']);
    if (browserName === 'chromium') {
      expect(await exposed(page)).toEqual(['group "Reviewers"', '  image "Ada Lovelace"', '  image "Grace Hopper"', '  image "Katherine Johnson"', '  text "3 more"']);
    }
    expect(seen.filter((w) => w.includes('AVT-19'))).toEqual([]);
    await mountHtml(page, {
      // Without overflow-label the drawn text is read; a decorative member is still named.
      drawn: '<tanrei-avatar-group label="Authors" max="2"><tanrei-avatar decorative label="Ada Lovelace" initials="AL"></tanrei-avatar><tanrei-avatar label="Grace Hopper" initials="GH"></tanrei-avatar><tanrei-avatar label="Katherine Johnson" initials="KJ"></tanrei-avatar></tanrei-avatar-group>',
      // No name: the members without a group's name. A member without a label: nothing for it.
      unnamed: '<tanrei-avatar-group><tanrei-avatar label="Hedy Lamarr" initials="HL"></tanrei-avatar><tanrei-avatar initials="??"></tanrei-avatar><tanrei-avatar label="Annie Easley" initials="AE"></tanrei-avatar></tanrei-avatar-group>',
    });
    await expect(group(page, 'drawn')).toMatchAriaSnapshot(`
      - group "Authors":
        - img "Ada Lovelace"
        - text: "+2"
    `);
    expect(await members(page, 'drawn').first().evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-hidden'), el.hasAttribute('decorative')])).toEqual(['img', null, true]);
    expect(await group(page, 'unnamed').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual(['group', null]);
    expect(await members(page, 'unnamed').nth(1).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-hidden')])).toEqual([null, 'true']);
    if (browserName === 'chromium') {
      const tree = await exposed(page);
      expect(tree).toEqual(['group "Authors"', '  image "Ada Lovelace"', '  text "+2"', 'group ""', '  image "Hedy Lamarr"', '  image "Annie Easley"']);
    }
    await expect.poll(() => seen.filter((w) => w.includes('AVT-19')).length).toBe(2);
    const reports = seen.filter((w) => w.includes('AVT-19')).join('\n');
    expect(reports).toContain('the group has no label');
    expect(reports).toContain('a member of a group has no label');
    // The gap is a shadow, which is nothing to assistive technology; the count's drawn text is hidden where a label is read instead.
    await mountSpec(page, 'group-max');
    expect(await overflow(page, 'group-max').locator('.count').getAttribute('aria-hidden')).toBe('true');
    expect(await overflow(page, 'group-max').locator('.spoken').textContent()).toBe('3 more');
    expect((await box(overflow(page, 'group-max').locator('.spoken'))).width).toBeLessThanOrEqual(1);
    // The product's words, written once for every group, with the real count: the drawn text stops at 999+, the
    // spoken one does not. In a language whose order is its own, the place stands where it writes it.
    await mountHtml(page, {
      many: '<tanrei-avatar-group label="Watchers" max="4" total="1243"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar><tanrei-avatar label="Grace Hopper" initials="GH"></tanrei-avatar><tanrei-avatar label="Katherine Johnson" initials="KJ"></tanrei-avatar></tanrei-avatar-group>',
      ja: '<div lang="ja"><tanrei-avatar-group label="レビュアー" max="2"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar><tanrei-avatar label="Grace Hopper" initials="GH"></tanrei-avatar><tanrei-avatar label="Katherine Johnson" initials="KJ"></tanrei-avatar></tanrei-avatar-group></div>',
    });
    await setWords(page, { avatarGroupOverflowLabel: '{count} more' });
    await expect(overflow(page, 'many').locator('.count')).toHaveText('999+');
    await expect(overflow(page, 'many').locator('.spoken')).toHaveText('1240 more');
    await setWords(page, { avatarGroupOverflowLabel: 'ほか{count}人' });
    await expect(overflow(page, 'ja').locator('.spoken')).toHaveText('ほか2人');
    // The instance's own wins; a sentence without the place is read as written, and reported.
    await group(page, 'many').evaluate((el) => Object.assign(el, { overflowLabel: 'and more' }));
    await expect(overflow(page, 'many').locator('.spoken')).toHaveText('and more');
    await expect.poll(() => seen.filter((w) => w.includes('AVT-19') && w.includes('overflow-label has no place {count}')).length).toBe(1);
  });

  test('AVT-20: in right-to-left the group lays its row out from the right — the first member at the right, each following box over the left end of the one before it and above it, the overflow box leftmost — and the order that is read stays the order given', async ({ page }) => {
    await mountSpec(page, 'group-max-rtl', 'group-max');
    const g = await box(group(page, 'group-max-rtl'));
    const shown = (await members(page, 'group-max-rtl').all()).slice(0, 3);
    const boxes = await Promise.all(shown.map((m) => box(m)));
    const overlap = await token(page, 'group-overlap-medium');
    // The verify: the first member at the right and +3 at the left.
    near(boxes[0].x + boxes[0].width, g.x + g.width, 'the first member is at the right');
    expect(boxes[0].x - boxes[1].x).toBe(40 - overlap);
    expect(boxes[1].x - boxes[2].x).toBe(40 - overlap);
    const more = await box(overflow(page, 'group-max-rtl'));
    near(more.x, g.x, 'the overflow box is leftmost');
    expect(boxes[2].x - more.x).toBe(40 - overlap);
    expect(await overflow(page, 'group-max-rtl').locator('.count').textContent()).toBe('+3');
    expect([g.width, g.height]).toEqual([4 * 40 - 3 * overlap, 40]);
    // The same size as the left-to-right row.
    expect(g.width).toBe((await box(group(page, 'group-max'))).width);
    // Each following box is above the one before it, over its left end.
    const at = (x: number) =>
      page.evaluate(([px, py]) => {
        const top = document.elementFromPoint(px, py);
        return top?.localName === 'tanrei-avatar' ? top.getAttribute('label') : top?.localName;
      }, [x, g.y + 20] as const);
    expect(await at(boxes[0].x + 5)).toBe('Ada Lovelace');
    expect(await at(boxes[1].x + 5)).toBe('عمر خالد');
    expect(await at(boxes[2].x + 5)).toBe(GROUP);
    // The gap between two: the surface's color at the first member's covered end.
    const row = await pixels(group(page, 'group-max-rtl'));
    expect(row.at(boxes[1].x + 40 + 1 - g.x, 20)).toBe(rgb(await tokenColor(page, 'group-outline-color')));
    // What is read is the order given.
    await expect(group(page, 'group-max-rtl')).toMatchAriaSnapshot(`
      - group "المراجعون":
        - img "ليلى حسن"
        - img "Ada Lovelace"
        - img "عمر خالد"
        - text: و3 آخرون
    `);
    // Names in two scripts: each member's initials keep their own order.
    expect((await drawn(shown[0])).label).toBe('لح');
    expect((await drawn(shown[1])).label).toBe('AL');
  });

  test('AVT-21: a change of the group’s members, max, total, size or shape is drawn and exposed at once, without a motion, and is not announced', async ({ page }) => {
    await mountSpec(page, 'group-max');
    const g = group(page, 'group-max');
    type G = HTMLElement & { max: number; total: number | null; size: string; shape: string; label: string; overflowLabel: string; updateComplete: Promise<unknown> };
    const shown = () => members(page, 'group-max').evaluateAll((list) => list.filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => el.getAttribute('label')));
    const count = () => overflow(page, 'group-max').locator('.count').textContent();
    // max.
    await g.evaluate(async (el: G) => {
      el.max = 3;
      await el.updateComplete;
    });
    expect([await shown(), await count()]).toEqual([['Ada Lovelace', 'Grace Hopper'], '+4']);
    // total.
    await g.evaluate(async (el: G) => {
      el.total = 50;
      el.overflowLabel = '';
      await el.updateComplete;
    });
    expect(await count()).toBe('+48');
    await expect(g).toMatchAriaSnapshot(`
      - group "Reviewers":
        - img "Ada Lovelace"
        - img "Grace Hopper"
        - text: "+48"
    `);
    // The members: one removed from the front, one added at the end.
    await g.evaluate(async (el: G) => {
      el.total = null;
      el.firstElementChild!.remove();
      const added = document.createElement('tanrei-avatar');
      added.setAttribute('label', 'Dorothy Vaughan');
      added.setAttribute('initials', 'DV');
      added.setAttribute('size', 'large');
      el.append(added);
    });
    await settled(page);
    expect([await shown(), await count()]).toEqual([['Grace Hopper', 'Katherine Johnson'], '+4']);
    // A member added later is a member: named, and — the last of six, it is not drawn yet — at the group's size once it is.
    expect(await members(page, 'group-max').last().evaluate((el) => [el.getAttribute('role'), (el as HTMLElement).offsetWidth])).toEqual(['img', 0]);
    // size and shape: every box, the overflow box too.
    await g.evaluate(async (el: G) => {
      el.size = 'large';
      el.shape = 'square';
      el.max = 0;
      await el.updateComplete;
    });
    await settled(page);
    expect(await shown()).toHaveLength(6);
    for (const m of await members(page, 'group-max').all()) expect(await m.evaluate((el) => [el.getAttribute('size'), el.getAttribute('shape'), el.getBoundingClientRect().width])).toEqual(['large', 'square', 56]);
    expect((await box(g)).width).toBe(6 * 56 - 5 * (await token(page, 'group-overlap-large')));
    await g.evaluate(async (el: G) => {
      el.max = 2;
      await el.updateComplete;
    });
    expect((await box(overflow(page, 'group-max'))).width).toBe(56);
    expect(await css(overflow(page, 'group-max'), 'border-top-left-radius')).toBe('6px');
    // Without a motion, and nothing announces.
    expect(await g.evaluate((el) => [el.shadowRoot!.getAnimations().length, el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length, el.getAttribute('aria-live')])).toEqual([0, 0, null]);
    expect(await css(overflow(page, 'group-max'), 'transition-duration')).toBe('0s');
    expect(await css(members(page, 'group-max').first(), 'transition-duration')).toBe('0s');
  });

  test('AVT-22: a size or a shape the active design system does not have renders with the default’s tokens and is reported, and one a design system adds is drawn from its tokens; max of 1, a negative number or one that is not whole draws as for 0 and is reported; a total below the members given, negative or not whole counts the members given and is reported', async ({ page }) => {
    const seen = warnings(page);
    const three = [member('Ada Lovelace', 'AL'), member('Grace Hopper', 'GH'), member('Katherine Johnson', 'KJ')];
    await mount(page, [
      fx('default', { label: 'Ada Lovelace', initials: 'AL' }),
      fx('size', { label: 'Ada Lovelace', initials: 'AL', size: 'huge' }),
      fx('shape', { label: 'Ada Lovelace', initials: 'AL', shape: 'hexagon' }),
      fx('unsafe', { label: 'Ada Lovelace', initials: 'AL', size: '9"x', shape: 'a b{' }),
      fx('group-default', { label: 'Authors' }, { items: three }),
      fx('group-size', { label: 'Authors', size: 'huge', shape: 'hexagon' }, { items: three }),
      fx('max-one', { label: 'Authors', max: 1 }, { items: three }),
      fx('max-negative', { label: 'Authors', max: -2 }, { items: three }),
      fx('max-fraction', { label: 'Authors', max: 2.5 }, { items: three }),
      fx('total-low', { label: 'Authors', total: 2 }, { items: three }),
      fx('total-negative', { label: 'Authors', total: -5 }, { items: three }),
      fx('total-fraction', { label: 'Authors', total: 7.5 }, { items: three }),
    ]);
    const look = async (id: string) => ({
      box: await box(avatar(page, id)).then((b) => [b.width, b.height]),
      radius: await css(container(avatar(page, id)), 'border-top-left-radius'),
      pill: (await css(container(avatar(page, id)), '--tanrei-corner-pill')).trim(),
      label: await textStyle(avatar(page, id).locator('.label')),
    });
    const base = await look('default');
    expect(base.box).toEqual([40, 40]);
    for (const id of ['size', 'shape', 'unsafe']) expect(await look(id), id).toEqual(base);
    const groupLook = async (id: string) => ({ box: await box(group(page, id)).then((b) => [b.width, b.height]), shown: await members(page, id).evaluateAll((list) => list.filter((el) => (el as HTMLElement).offsetWidth > 0).length), more: await overflow(page, id).count() });
    const groupBase = await groupLook('group-default');
    expect(groupBase).toEqual({ box: [100, 40], shown: 3, more: 0 });
    for (const id of ['group-size', 'max-one', 'max-negative', 'max-fraction', 'total-low', 'total-negative', 'total-fraction']) expect(await groupLook(id), id).toEqual(groupBase);
    await expect.poll(() => seen.filter((w) => w.includes('AVT-22')).length).toBeGreaterThanOrEqual(12);
    const reported = seen.filter((w) => w.includes('AVT-22')).join('\n');
    for (const said of ['size "huge"', 'shape "hexagon"', 'drawn as "medium"', 'drawn as "circle"', 'max 1 ', 'max -2 ', 'max 2.5 ', 'total 2 ', 'total -5 ', 'total 7.5 ']) expect(reported, said).toContain(said);
    // The known values are not reported.
    expect(seen.filter((w) => w.includes('AVT-22') && /"(small|medium|large|circle|square)" is not/.test(w))).toEqual([]);
    // A size and a shape a design system adds: its tokens, and no report.
    const layer = `<style>:root { ${T('container-size-huge')}: 96px; ${T('icon-size-huge')}: 48px; ${T('group-overlap-huge')}: 24px; ${T('label-typescale-huge-font')}: 500 32px/1.25 Inter; ${T('label-typescale-huge-font-size')}: 32px; ${T('label-typescale-huge-letter-spacing')}: 0em; ${T('container-shape-hexagon')}: 12px; ${T('container-shape-hexagon-pill')}: 0; }</style>`;
    await page.evaluate(() => console.warn('— the layer is mounted —'));
    await mountHtml(page, {
      layer,
      added: '<tanrei-avatar label="Ada Lovelace" initials="AL" size="huge" shape="hexagon"></tanrei-avatar>',
      'added-group': '<tanrei-avatar-group label="Authors" size="huge" shape="hexagon" max="2"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar><tanrei-avatar label="Grace Hopper"></tanrei-avatar><tanrei-avatar label="Katherine Johnson"></tanrei-avatar></tanrei-avatar-group>',
    });
    expect(await look('added')).toMatchObject({ box: [96, 96], radius: '12px', pill: '0' });
    expect(await css(avatar(page, 'added').locator('.label'), 'font-size')).toBe('32px');
    const added = await box(group(page, 'added-group'));
    expect([added.width, added.height]).toEqual([2 * 96 - 24, 96]);
    expect((await box(overflow(page, 'added-group'))).width).toBe(96);
    expect(await css(overflow(page, 'added-group'), 'border-top-left-radius')).toBe('12px');
    await frames(page);
    expect(seen.slice(seen.indexOf('— the layer is mounted —')).filter((w) => w.includes('AVT-22'))).toEqual([]);
  });

  test('AVT-22: a size a design system adds is not reported as unknown on an avatar that stands in no slot — a member its group does not draw, a child no slot takes: it has no style to ask — and a size no system has is reported there once the avatar is drawn', async ({ page }) => {
    const seen = warnings(page);
    const layer = `<style>:root { ${T('container-size-huge')}: 96px; ${T('icon-size-huge')}: 48px; ${T('group-overlap-huge')}: 24px; ${T('label-typescale-huge-font')}: 500 32px/1.25 Inter; ${T('label-typescale-huge-font-size')}: 32px; ${T('label-typescale-huge-letter-spacing')}: 0em; }</style>`;
    await mountHtml(page, {
      layer,
      // The third member is not drawn (max 2: one member and the count), and the product itself wrote the layer's size on it.
      undrawn: '<tanrei-avatar-group label="Authors" max="2"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar><tanrei-avatar label="Grace Hopper"></tanrei-avatar><tanrei-avatar id="third" label="Katherine Johnson" size="huge"></tanrei-avatar></tanrei-avatar-group>',
      // A shadow host that has no slot: its child, with a size no system has, is put there below.
      unslotted: '<div id="shell"></div>',
    });
    // (Made where it will stand: an avatar that was drawn once has been asked already.)
    await page.evaluate(() => {
      const shell = document.getElementById('shell')!;
      shell.attachShadow({ mode: 'open' }).innerHTML = '<span>shell</span>';
      shell.insertAdjacentHTML('beforeend', '<tanrei-avatar id="lost" label="Ada Lovelace" initials="AL" size="nope"></tanrei-avatar>');
    });
    // Both have updated with their size, and neither is in the flat tree.
    // (No slot takes either. Chromium and Firefox then compute no style for them; WebKit computes one all the same.)
    expect(await page.evaluate(() => ['third', 'lost'].map((id) => document.getElementById(id)!.assignedSlot))).toEqual([null, null]);
    await page.evaluate(async () => {
      for (const id of ['third', 'lost']) await (document.getElementById(id) as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    await frames(page);
    expect(seen.filter((w) => w.includes('AVT-22'))).toEqual([]);
    // Drawn: the shell is given a slot, and the avatar updates — its size is asked about now, and no system has it.
    await page.evaluate(async () => {
      document.getElementById('shell')!.shadowRoot!.append(document.createElement('slot'));
      const lost = document.getElementById('lost') as HTMLElement & { label: string; updateComplete: Promise<unknown> };
      lost.label = 'Ada';
      await lost.updateComplete;
    });
    await expect.poll(() => seen.filter((w) => w.includes('AVT-22')).length).toBe(1);
    expect(seen.find((w) => w.includes('AVT-22'))).toContain('size "nope"');
  });

  test('AVT-23: a group whose every member has been removed draws nothing, takes no space and exposes nothing; max, total or overflowLabel on an avatar that has no members is ignored and reported', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mountHtml(page, {
      emptied: '<span id="left">left</span><tanrei-avatar-group label="Reviewers" max="4" overflow-label="and more"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar><tanrei-avatar label="Grace Hopper" initials="GH"></tanrei-avatar></tanrei-avatar-group><span id="right">right</span>',
      never: '<tanrei-avatar-group label="Nobody"> <span>not a member</span> </tanrei-avatar-group>',
      stray: '<tanrei-avatar label="Ada Lovelace" initials="AL" max="4" total="12" overflow-label="and 9 more"></tanrei-avatar>',
    });
    const g = group(page, 'emptied');
    near((await box(g)).width, 70, 'two members', 0.01);
    const gap = async () => (await box(page.locator('#right'))).x - (await box(page.locator('#left'))).x - (await box(page.locator('#left'))).width;
    const withGroup = await gap();
    await g.evaluate((el) => el.replaceChildren());
    await settled(page);
    // Nothing drawn, no space, nothing exposed.
    await expect(g).toBeHidden();
    expect(await g.evaluate((el) => [el.getBoundingClientRect().width, el.getBoundingClientRect().height, el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual([0, 0, null, null]);
    near(await gap(), withGroup - 70, 'the room the group took', 0.01);
    expect(await group(page, 'never').evaluate((el) => [el.getBoundingClientRect().width, el.getAttribute('role')])).toEqual([0, null]);
    await expect(stage(page, 'never').getByRole('group')).toHaveCount(0);
    await expect(stage(page, 'never').getByText('not a member')).toBeHidden();
    if (browserName === 'chromium') expect((await exposed(page)).filter((line) => line.includes('group'))).toEqual([]);
    // A member given again: the group again.
    await g.evaluate((el) => {
      el.innerHTML = '<tanrei-avatar label="Hedy Lamarr" initials="HL"></tanrei-avatar>';
    });
    await settled(page);
    near((await box(g)).width, 40, 'one member', 0.01);
    await expect(stage(page, 'emptied').getByRole('group', { name: 'Reviewers' })).toHaveCount(1);
    // The avatar with a group's props: drawn as any avatar, and reported.
    expect(await drawn(avatar(page, 'stray'))).toEqual({ image: false, label: 'AL', glyph: null, images: 0 });
    expect(await avatar(page, 'stray').evaluate((el) => el.shadowRoot!.querySelectorAll('.overflow').length)).toBe(0);
    await expect.poll(() => seen.filter((w) => w.includes('AVT-23')).length).toBeGreaterThanOrEqual(2);
    const reported = seen.filter((w) => w.includes('AVT-23')).join('\n');
    expect(reported).toContain('max, total, overflow-label are ignored on an avatar that has no members');
    expect(reported).toContain('a group that has no members');
  });

  test('AVT-1, AVT-16: before the elements are defined the stylesheet gives an avatar the box of its size and shape and a group the row of its members, so nothing moves when they are defined', async ({ page }) => {
    const people = [['Ada Lovelace', 'AL'], ['Grace Hopper', 'GH'], ['Katherine Johnson', 'KJ']];
    const body = `
      <p class="line">By <tanrei-avatar id="byline" decorative size="small" initials="AL"></tanrei-avatar> <span class="mark">Ada Lovelace</span></p>
      <p class="line"><tanrei-avatar id="medium" label="Ada Lovelace" initials="AL"></tanrei-avatar> <span class="mark">after medium</span></p>
      <p class="line"><tanrei-avatar id="large" label="Design team" initials="DT" size="large" shape="square"></tanrei-avatar> <span class="mark">after large</span></p>
      <p class="line"><tanrei-avatar id="glyph" label="Build service"><span slot="icon">smart_toy</span></tanrei-avatar> <span class="mark">after the glyph</span></p>
      ${['small', 'medium', 'large'].map((size) => `<p class="line"><tanrei-avatar-group id="group-${size}" label="Authors" size="${size}"${size === 'large' ? ' shape="square"' : ''}>${people.map(([label, initials]) => `<tanrei-avatar label="${label}" initials="${initials}"></tanrei-avatar>`).join('')}</tanrei-avatar-group> <span class="mark">after ${size}</span></p>`).join('')}
      <p class="line"><tanrei-avatar-group id="total" label="Members" max="4" total="240">${people.map(([label, initials]) => `<tanrei-avatar label="${label}" initials="${initials}"></tanrei-avatar>`).join('')}</tanrei-avatar-group><span class="mark" id="after-total">after total</span></p>
      <p class="line">The last line.</p>`;
    // The page as a server sends it: the tokens, the stylesheet, the content — and no script yet.
    await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head><meta charset="utf-8"><title>before definition</title>
      <style>${dist('tokens.css')}</style><style>${dist('avatar.css')}</style>
      <style>body { margin: 16px; inline-size: 480px; font: var(--tanrei-sys-typescale-body-font); } p.line { margin: 8px 0; }</style></head><body>${body}</body></html>`);
    expect(await page.evaluate(() => !!customElements.get('tanrei-avatar') || !!customElements.get('tanrei-avatar-group'))).toBe(false);
    const measure = () =>
      page.evaluate(() => {
        const rect = (el: Element) => {
          const r = el.getBoundingClientRect();
          return [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 4) / 4);
        };
        return {
          avatars: Object.fromEntries([...document.querySelectorAll('tanrei-avatar, tanrei-avatar-group')].map((el, i) => [el.id || `member-${i}`, rect(el)])),
          marks: Object.fromEntries([...document.querySelectorAll('.mark, .line')].map((el, i) => [el.id || `mark-${i}`, rect(el)])),
        };
      });
    const before = await measure();
    // The box each will have, in the container color; a glyph's name is not shown as text.
    expect(before.avatars.byline.slice(2)).toEqual([24, 24]);
    expect(before.avatars.medium.slice(2)).toEqual([40, 40]);
    expect(before.avatars.large.slice(2)).toEqual([56, 56]);
    expect(before.avatars['group-medium'].slice(2)).toEqual([100, 40]);
    expect(before.avatars['group-small'].slice(2)).toEqual([3 * 24 - 2 * 6, 24]);
    expect(before.avatars['group-large'].slice(2)).toEqual([3 * 56 - 2 * 14, 56]);
    await expect(page.locator('#glyph > [slot="icon"]')).toBeHidden();
    sameColor(await painted(page.locator('#medium'), 'background-color'), await tokenColor(page, 'container-color'), 'the box before it is defined');
    expect(await css(page.locator('#large'), 'border-top-left-radius')).toBe('6px');
    expect(Number.parseFloat(await css(page.locator('#medium'), 'border-top-left-radius'))).toBeGreaterThanOrEqual(20);
    // The elements are defined.
    await page.addScriptTag({ type: 'module', content: dist('tanrei.bundle.js') });
    await page.waitForFunction(() => !!customElements.get('tanrei-avatar-group'));
    await settled(page);
    const after = await measure();
    const close = (a: number[], b: number[], what: string) => a.forEach((v, i) => expect(Math.abs(v - b[i]), `${what}: ${a.join(',')} → ${b.join(',')}`).toBeLessThanOrEqual(0.5));
    // Nothing moved: every avatar, every group, every member, and what follows each — but for the group that counts
    // what it was not given, which gains its overflow box (the stylesheet cannot count: the README says so).
    for (const [id, was] of Object.entries(before.avatars)) if (id !== 'total') close(was, after.avatars[id], id);
    for (const [id, was] of Object.entries(before.marks)) if (id !== 'after-total') close(was, after.marks[id], id);
    // Only the text after the counting group moves, by one box less its overlap.
    expect(after.marks['after-total'][0] - before.marks['after-total'][0]).toBe(30);
    expect(after.avatars.total[2] - before.avatars.total[2]).toBe(30);
    // …and they are the elements now.
    await expect(page.locator('#medium').locator('.label')).toHaveText('AL');
    await expect(page.locator('#total').locator('.count')).toHaveText('+237');
    // The stylesheet's rules match nothing once the elements are defined, and are in the components' layer.
    expect(dist('avatar.css')).toContain('@layer tanrei.components');
    expect(await page.evaluate(() => document.querySelectorAll('tanrei-avatar:not(:defined), tanrei-avatar-group:not(:defined)').length)).toBe(0);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { icons: true, theme });
      await pictured(avatar(page, 'image'));
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('no axe violations for an avatar inside a link, inside a Button, under a badge and beside its name', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountHtml(
        page,
        {
          link: '<a href="#ada"><tanrei-avatar label="Ada Lovelace" initials="AL"></tanrei-avatar></a>',
          button: '<button type="button"><tanrei-avatar label="Grace Hopper" initials="GH" size="small"></tanrei-avatar></button>',
          badge: '<tanrei-badge count="3" label="3 unread"><tanrei-avatar label="Katherine Johnson" initials="KJ"></tanrei-avatar></tanrei-badge>',
          byline: '<p style="margin:0;font:var(--tanrei-sys-typescale-body-font);color:var(--tanrei-sys-color-on-surface)"><tanrei-avatar decorative size="small" initials="HL"></tanrei-avatar> Hedy Lamarr</p>',
        },
        { theme },
      );
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, theme).toEqual([]);
    }
  });

  test('every fixture is exposed as the spec says: an image named by its label, nothing while decorative, and a group named by its label that holds its drawn members’ names in order and then the overflow’s text', async ({ page, browserName }) => {
    await mountFixtures(page, spec, { icons: true });
    const expected: string[] = [];
    for (const f of spec.fixtures) {
      if (f.items) {
        const g = group(page, f.id);
        expect(await g.getAttribute('role'), f.id).toBe('group');
        await expect(stage(page, f.id).getByRole('group', { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
        const max = Number(f.props.max ?? 0);
        const total = Number(f.props.total ?? f.items.length);
        const shown = max && (total > f.items.length || f.items.length > max) ? Math.min(f.items.length, max - 1) : f.items.length;
        await expect(g.getByRole('img'), f.id).toHaveCount(shown);
        expected.push(`group "${f.props.label}"`, ...f.items.slice(0, shown).map((item) => `  image "${item.props.label}"`));
        // The sentence's place holds the count in the group's digits — the drawn count's, less its sign.
        const digits = total > shown ? ((await g.locator('.count').textContent()) ?? '').replace('+', '') : '';
        if (total > shown) expected.push(`  text "${f.props.overflowLabel ? String(f.props.overflowLabel).replace('{count}', digits) : `+${total - shown}`}"`);
      } else if (f.props.decorative) {
        await expect(stage(page, f.id).getByRole('img'), f.id).toHaveCount(0);
      } else {
        await expect(stage(page, f.id).getByRole('img', { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
        expected.push(`image "${f.props.label}"`);
      }
    }
    if (browserName === 'chromium') expect(await exposed(page)).toEqual(expected);
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, at the side of its size, drawing the picture, the initials or the glyph the spec gives it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(26);
    for (const f of spec.fixtures) {
      const size = String(f.props.size ?? 'medium') as (typeof SIZES)[number];
      const side = await token(page, `container-size-${size}`);
      if (f.items) {
        await expect(group(page, f.id), f.id).toBeVisible();
        expect((await box(group(page, f.id))).height, f.id).toBe(side);
        expect(await members(page, f.id).count(), f.id).toBe(f.items.length);
        for (const [i, item] of f.items.entries()) {
          const m = members(page, f.id).nth(i);
          if (!(await m.isVisible())) continue;
          if (item.props.src) await pictured(m);
          else if (item.props.initials) expect((await drawn(m)).label, `${f.id} ${i}`).toBe(item.props.initials);
          else await expect.poll(async () => (await drawn(m)).glyph, { message: `${f.id} ${i}` }).toBe(f.props.shape === 'square' ? 'category' : 'person');
        }
        continue;
      }
      const a = avatar(page, f.id);
      await expect(a, f.id).toBeVisible();
      const b = await box(a);
      expect([b.width, b.height], f.id).toEqual([side, side]);
      if (f.props.src === 'fixtures/avatar.png') await pictured(a);
      else if (f.props.initials) expect((await drawn(a)).label, f.id).toBe(f.props.initials);
      else await expect.poll(async () => (await drawn(a)).glyph, { message: f.id }).toBe(f.slots?.icon ?? (f.props.shape === 'square' ? 'category' : 'person'));
      // Every glyph is drawn by the icon set.
      if (!f.props.src && !f.props.initials) await expect.poll(() => a.locator('.icon').getAttribute('data-drawn'), { message: f.id }).not.toBeNull();
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      for (const picture of await page.locator('[data-fixture] tanrei-avatar[src^="data:"]').all()) await pictured(picture);
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
