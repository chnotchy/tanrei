// `.tanrei-timeline` (timeline.css, src/timeline.ts), driven by specs/timeline.spec.json: every behaviour id (TML-1…22)
// is cited by a test title, every fixture has a baseline, and every length and color is read back from the tokens,
// never from a number written here (the spec's own `verify` numbers are checked beside them). A marker and a connector
// are pseudo-elements: their sizes are read from their computed style, and what a marker PAINTS — a dot, a check, a
// disc with a dot, an empty ring — is read from the pixels of a screenshot. What assistive technology is given is read
// from Chromium's accessibility tree, over the DevTools protocol; the other two engines give no tree to a test, so
// there the generated content's alternative text is read from the computed style.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { fixtureHost, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab } from '../../test/harness.js';
import { drawnOpticalSize, opticalSize } from '../../test/icons.js';
import { decodePng } from '../../test/png.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '../..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

const spec = loadSpec('timeline');
type P = Page;
const T = (name: string) => `--tanrei-comp-timeline-${name}`;
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const timeline = (page: P, id: string) => fixtureHost(page, spec, id);
const items = (list: Locator) => list.locator(':scope > li');

interface MountOptions { system?: string; dir?: 'ltr' | 'rtl'; direction?: 'ltr' | 'rtl'; theme?: 'light' | 'dark' }
/** A window of its own for every mount: the script of the document before would still be observing. */
const fresh = (page: P) => page.goto('about:blank');
/** The spec's fixtures named, or all of them. */
const mountSpec = async (page: P, ids: string[] = [], options: MountOptions = {}) => {
  await fresh(page);
  await mountFixtures(page, spec, { icons: true, ...(ids.length ? { fixtures: spec.fixtures.filter((f) => ids.includes(f.id)) } : {}), ...options });
};
/** A stage holding `html` as it is: the fixture `t`. */
const mount = async (page: P, html: string, { direction, ...options }: MountOptions = {}) => {
  await fresh(page);
  await mountFixtures(page, spec, { icons: true, fixtures: [{ id: 't', props: {}, content: html, ...(direction ? { direction } : {}) }], ...options });
};
const OL = (inner: string, attributes = '') => `<ol class="tanrei-timeline" role="list" ${attributes}>${inner}</ol>`;
const EVENT = (title: string, attributes = '', more = '') => `<li ${attributes}><p class="tanrei-timeline-title">${title}</p>${more}</li>`;

const css = (target: Locator, property: string, pseudo?: string): Promise<string> =>
  target.evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? undefined).getPropertyValue(p as string), [property, pseudo ?? null] as const);
const px = async (target: Locator, property: string, pseudo?: string) => Number.parseFloat(await css(target, property, pseudo));
interface Box { x: number; y: number; width: number; height: number; right: number; bottom: number }
const box = (target: Locator): Promise<Box> => target.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
/** The box of the first line of the text an element holds (the text's own box, which is centred on its line). */
const firstLine = (target: Locator): Promise<Box> =>
  target.evaluate((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (node) => (node.parentElement!.closest('.tanrei-timeline-marker, .tanrei-timeline-status') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    let node = walker.nextNode();
    while (node && !node.textContent!.trim()) node = walker.nextNode();
    const range = document.createRange();
    range.selectNodeContents(node!);
    // (A line of mixed directions is several boxes: the first line is every box that begins where the first does.)
    const rects = [...range.getClientRects()].filter((rect) => rect.width > 0);
    const top = Math.min(...rects.map((rect) => rect.top));
    const line = rects.filter((rect) => rect.top < top + rect.height / 2);
    const [left, right, bottom] = [Math.min(...line.map((rect) => rect.left)), Math.max(...line.map((rect) => rect.right)), Math.max(...line.map((rect) => rect.bottom))];
    return { x: left, y: top, width: right - left, height: bottom - top, right, bottom };
  });
/** The inline extent of what an event holds in the flow: its time, its title and its body. */
const content = (item: Locator): Promise<{ left: number; right: number }> =>
  item.evaluate((el) => {
    const rects = [...el.children].filter((child) => !child.matches('.tanrei-timeline-marker, .tanrei-timeline-status')).map((child) => child.getBoundingClientRect());
    return { left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)) };
  });
const near = (actual: number, expected: number, what: string, tolerance = 0.5) => expect(Math.abs(actual - expected), `${what}: ${actual} ≠ ${expected}`).toBeLessThanOrEqual(tolerance);
/** The marker's box of an event (TML-6): the square at the start of the item, at the top the item's marker is given. */
const markerBox = async (item: Locator, size: 'medium' | 'large' = 'medium'): Promise<Box> => {
  const outer = await box(item);
  const side = await resolveToken(item.page(), T(`marker-height-${size}`));
  const top = Number.parseFloat(await css(item, '--_timeline-marker-top')) || 0;
  const x = (await css(item, 'direction')) === 'rtl' ? outer.right - side : outer.x;
  return { x, y: outer.y + top, width: side, height: side, right: x + side, bottom: outer.y + top + side };
};
/** What the item's `::before` draws, as a box: the dot, or the ring or disc that is the whole marker. */
const generatedBox = async (item: Locator): Promise<Box> => {
  const [outer, width, height, top] = [await box(item), await px(item, 'width', '::before'), await px(item, 'height', '::before'), await px(item, 'top', '::before')];
  const x = (await css(item, 'direction')) === 'rtl' ? outer.right - (await px(item, 'right', '::before')) - (await px(item, 'margin-right', '::before')) - width : outer.x + (await px(item, 'left', '::before')) + (await px(item, 'margin-left', '::before'));
  return { x, y: outer.y + top, width, height, right: x + width, bottom: outer.y + top + height };
};
/** The pixels of a region of the page. */
const pixels = async (page: P, region: Box) => decodePng(await page.screenshot({ clip: { x: region.x, y: region.y, width: region.width, height: region.height }, fullPage: true, animations: 'disabled', scale: 'css' }));
const rgb = (color: string) => { const [r, g, b] = rgba(color); return `rgb(${r}, ${g}, ${b})`; };

const rgba = (color: string): number[] => {
  const srgb = /^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)$/.exec(color);
  if (srgb) return [...srgb.slice(1, 4).map((c) => Math.round(Number(c) * 255)), Math.round(Number(srgb[4] ?? 1) * 100) / 100];
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [];
  return [...parts.slice(0, 3).map(Math.round), Math.round((parts[3] ?? 1) * 100) / 100];
};
const color = async (page: P, name: string) => rgba(await resolveColor(page, name));
/** A weight token as the browser computes it (a token may be an expression). */
const weight = (page: P, name: string) => page.evaluate((token) => { const probe = document.createElement('i'); probe.style.fontWeight = `var(${token})`; document.body.append(probe); const w = getComputedStyle(probe).fontWeight; probe.remove(); return w; }, name);
/** Debug reports of the page so far. */
const reports = (page: P) => {
  const seen: string[] = [];
  page.on('console', (message) => { if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text()); });
  return seen;
};

interface AXNode { nodeId: string; ignored: boolean; role?: { value: string }; name?: { value: string }; childIds?: string[]; properties?: { name: string; value: { value: unknown } }[] }
/** Chromium's accessibility tree: each list named `name`, as its items — every text an item is read as, in order, its roles and its properties. */
async function tree(page: P, name: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as unknown as { nodes: AXNode[] };
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const under = (id: string): AXNode[] => { const node = byId.get(id)!; return [node, ...(node.childIds ?? []).flatMap(under)]; };
  const lists = nodes.filter((node) => !node.ignored && node.role?.value === 'list' && node.name?.value === name);
  return lists.map((list) =>
    (list.childIds ?? []).map((id) => byId.get(id)!).filter((node) => node.role?.value === 'listitem').map((item) => {
      const inside = under(item.nodeId).filter((node) => !node.ignored);
      return {
        texts: inside.filter((node) => node.role?.value === 'StaticText').map((node) => (node.name?.value ?? '').trim()).filter(Boolean),
        roles: inside.slice(1).map((node) => node.role?.value ?? '').filter((role) => !['StaticText', 'InlineTextBox'].includes(role)),
        properties: Object.fromEntries((item.properties ?? []).map((p) => [p.name, p.value.value])),
      };
    }),
  );
}

test.describe('the stylesheet', () => {
  test('every value is a token: no literal color, length, duration or opacity', () => {
    const body = read('src/styles/timeline.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const literals = [...body.matchAll(/:\s*([^;{}]+);/g)]
      .map((m) => m[1].replace(/var\([^()]*(\([^()]*\))*[^()]*\)/g, '').replace(/calc\(|\)/g, ''))
      .flatMap((value) => value.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsl|\b\d*\.?\d+(px|rem|em|ms|s)\b/gi) ?? []);
    // `0px` is nothing: the floor of the space an event's content is lowered by, and the size of a generated box that
    // draws nothing. `1px`, twice, is the box of the status in words as an element — the smallest that is still read.
    expect(literals.filter((literal) => literal !== '0px')).toEqual(['1px', '1px']);
    expect(body.match(/[^;{}]*1px;/g)!.map((line) => line.trim())).toEqual(['inline-size: 1px;', 'block-size: 1px;']);
    // One text color, the time's (TML-3), and the marks' own; the forced colors are the platform's names.
    const colors = [...body.matchAll(/(?:^|[\s;{])((?:background-|border-)?color): ([^;]+);/g)].map((m) => m[2]);
    expect(colors.every((value) => /^var\(--tanrei-comp-timeline-(time-color|marker-[a-z-]+-color)\)$|^(transparent|CanvasText|Canvas)$/.test(value)), colors.join(' | ')).toBe(true);
    // No elevation (TML-1), and nothing for a state or a motion (TML-11, TML-13).
    expect(body).not.toMatch(/box-shadow|:hover|:focus|:active|cursor|animation|transition(?!: none)/);
  });

  test('a rule has no specificity: one class of the product wins, even in the same layer and written first', async ({ page }) => {
    await mount(page, `<style>@layer tanrei.components { .mine { column-gap: 3px; } .mine > .event { padding-block-start: 7px; } .mine > li > .title { letter-spacing: 3px; } .mine > li > .when { letter-spacing: 2px; } }</style><ol class="tanrei-timeline mine" role="list"><li class="event"><time class="tanrei-timeline-time when" datetime="2026-09-19">19 September</time><p class="tanrei-timeline-title title">One</p><p>Body</p></li></ol>`);
    expect(await css(page.locator('.mine'), 'column-gap')).toBe('3px');
    expect(await css(page.locator('.event'), 'padding-top')).toBe('7px');
    expect(await css(page.locator('.title'), 'letter-spacing')).toBe('3px');
    expect(await css(page.locator('.when'), 'letter-spacing')).toBe('2px');
  });

  test('dist/prose.css ends with the timeline’s own rules, so a timeline in a prose is drawn the same whichever stylesheet is loaded last; the corner rule is the shared one (TML-5, TML-6, TML-10)', async ({ page }) => {
    const rules = (text: string) => text.slice(text.indexOf('/* timeline:rules */') + '/* timeline:rules */'.length, text.indexOf('/* timeline:rules:end */')).trim();
    const [own, prose] = [read('dist/timeline.css'), read('dist/prose.css')];
    expect(rules(own).length).toBeGreaterThan(3000);
    // After every rule of prose's own, and after the steps', said again for the same reason: they end the file.
    expect(prose.trimEnd().endsWith(rules(own))).toBe(true);
    expect(prose.indexOf(rules(own))).toBeGreaterThan(prose.lastIndexOf('.tanrei-steps'));
    const { SHAPE_CSS } = (await import(path.join(pkg, 'dist/styles/shape.js'))) as { SHAPE_CSS: string };
    for (const selector of [':where(.tanrei-timeline) > :where(li)::before', ':where(.tanrei-timeline) > :where(li) > :is(.tanrei-timeline-marker, .tanrei-timeline-marker.tanrei-icon)']) {
      expect(own.replace(/\s+/g, ' ')).toContain(SHAPE_CSS.slice(SHAPE_CSS.indexOf('@supports'), SHAPE_CSS.indexOf('[data-tanrei-shape]::before')).replaceAll('[data-tanrei-shape]', selector).replace(/\s+/g, ' ').trim());
    }
    expect(read('src/styles/timeline.css')).not.toContain('superellipse');
    // Both orders, measured: a timeline in a prose with a time, a heading as the title, paragraphs, a list and a block.
    const html = `<div class="tanrei-prose"><p>Before.</p>${OL(`<li data-status="done" data-status-label="Done"><time class="tanrei-timeline-time" datetime="2026-09-19">19 September 2026</time><h3>Development begins</h3><p>The first paragraph of a body, with <a href="#x">a link</a>.</p><ul><li>One</li><li>Two</li></ul><pre><code>pnpm check</code></pre></li><li><p class="tanrei-timeline-time">Wave 1</p><p class="tanrei-timeline-title">Controls</p><p>Body.</p><p>Another.</p></li>`)}<p>After.</p></div>`;
    const measure = async (order: string[]) => {
      await page.goto('about:blank');
      const body = (await fixturesDocument(spec, { fixtures: [{ id: 't', props: {}, content: html }] })).replace(/<style>[^<]*tanrei-timeline[\s\S]*?<\/style>/, '');
      await page.setContent(body.replace('</head>', `${order.map((file) => `<style>${read(file)}</style>`).join('')}<style>.stage > .tanrei-prose { inline-size: 720px; }</style></head>`));
      await page.evaluate(() => document.fonts.ready);
      return page.evaluate(() => [...document.querySelectorAll('.tanrei-timeline, .tanrei-timeline > li, .tanrei-timeline > li > *, .tanrei-prose > p')].map((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return [el.localName, Math.round(r.left * 4), Math.round(r.top * 4), Math.round(r.width * 4), Math.round(r.height * 4), s.fontSize, s.fontWeight, s.color].join(' '); }));
    };
    const first = await measure(['dist/prose.css', 'dist/timeline.css']);
    expect(first.length).toBeGreaterThan(12);
    expect(await measure(['dist/timeline.css', 'dist/prose.css'])).toEqual(first);
    // …and prose.css alone draws it, as it draws its links and a set of steps.
    expect(await measure(['dist/prose.css'])).toEqual(first);
  });

  test('the marker and the connector are the steps’: the two components’ tokens resolve to the same values', async ({ page }) => {
    await mountSpec(page, ['plan']);
    const resolved = (name: string, property: string) =>
      page.evaluate(([token, prop]) => { const probe = document.createElement('i'); probe.style.cssText = `display: block; position: absolute; inline-size: 100px; block-size: 100px; border-style: solid; ${prop}: var(${token})`; document.body.append(probe); const value = getComputedStyle(probe).getPropertyValue(prop); probe.remove(); return value; }, [name, property] as const);
    const pairs: [string, string][] = [['marker-height-medium', 'width'], ['marker-height-large', 'width'], ['marker-shape', 'border-top-left-radius'], ['marker-outline-color', 'border-top-color'], ['marker-outline-width', 'border-top-width'], ['marker-gap', 'width'], ['connector-color', 'border-top-color'], ['connector-thickness', 'border-top-width'], ['connector-gap', 'width']];
    for (const [name, property] of pairs) {
      const [own, theirs] = [await resolved(T(name), property), await resolved(`--tanrei-comp-steps-${name}`, property)];
      expect(own, name).not.toBe('');
      expect(own, `${name}: the timeline's is the steps'`).toBe(theirs);
    }
    // The pill mark of the shape — whether the ring is drawn round whatever the smoothing — is the same too.
    expect(await css(page.locator('html'), T('marker-shape-pill'))).toBe(await css(page.locator('html'), '--tanrei-comp-steps-marker-shape-pill'));
    // And the two are drawn alike: a ring of a timeline and a ring of steps, side by side, are one box.
    await mount(page, `<style>${read('dist/steps.css')}</style>${OL(EVENT('One', 'data-status="upcoming"') + EVENT('Two', 'data-status="upcoming"'))}<ol class="tanrei-steps" role="list"><li><p class="tanrei-steps-title">One</p></li><li><p class="tanrei-steps-title">Two</p></li></ol>`);
    const look = (list: Locator) => list.locator(':scope > li').first().evaluate((li) => { const [b, a] = [getComputedStyle(li, '::before'), getComputedStyle(li, '::after')]; return [b.width, b.height, b.borderTopWidth, b.borderTopColor, b.borderTopLeftRadius, b.top, a.top, a.bottom, a.left, a.borderLeftWidth, a.borderLeftColor, getComputedStyle(li).paddingLeft].join(' | '); });
    expect(await look(page.locator('.tanrei-timeline'))).toBe(await look(page.locator('.tanrei-steps')));
  });
});

test.describe('layout', () => {
  test('TML-1 one column of events in the order given, each its marker in a column at the start as wide as the marker’s box and its content — time, title, body — beside it at one edge, to the end edge; no fill, edge, elevation or padding of the timeline’s own', async ({ page }) => {
    await mountSpec(page, ['dated', 'large', 'plan', 'icons']);
    const gap = await resolveToken(page, T('marker-gap'));
    for (const [id, size] of [['dated', 'medium'], ['large', 'large'], ['plan', 'medium'], ['icons', 'medium']] as const) {
      const list = timeline(page, id);
      const side = await resolveToken(page, T(`marker-height-${size}`));
      const outer = await box(list);
      const boxes: Box[] = [];
      for (const item of await items(list).all()) {
        boxes.push(await box(item));
        near(await px(item, 'padding-left'), side + gap, `${id}: the marker column and the gap`, 0.05);
        near((await content(item)).left, outer.x + side + gap, `${id}: the content edge`, 0.05);
        near((await content(item)).right, outer.right, `${id}: the content runs to the end edge`, 0.05);
        // In the item: the time, the title, the body, in that order, one under the other.
        const parts = await item.locator(':scope > :not(.tanrei-timeline-marker)').all();
        expect(await parts[0].evaluate((el) => el.className)).toBe('tanrei-timeline-time');
        expect(await parts[1].evaluate((el) => el.className)).toBe('tanrei-timeline-title');
        for (let i = 1; i < parts.length; i++) expect((await box(parts[i])).y).toBeGreaterThanOrEqual((await box(parts[i - 1])).bottom);
      }
      near(boxes[0].y, outer.y, `${id}: no space before the first`, 0.05);
      near(boxes.at(-1)!.bottom, outer.bottom, `${id}: no space after the last`, 0.05);
      for (let i = 1; i < boxes.length; i++) expect(boxes[i].y).toBeGreaterThan(boxes[i - 1].bottom);
      for (const b of boxes) near(b.right, outer.right, `${id}: an event runs to the end edge`, 0.05);
      for (const target of [list, items(list).first()]) {
        expect(rgba(await css(target, 'background-color'))[3]).toBe(0);
        expect(await css(target, 'background-image')).toBe('none');
        expect(await css(target, 'border-top-style')).toBe('none');
        expect(await css(target, 'box-shadow')).toBe('none');
      }
      expect([await css(list, 'padding-top'), await css(list, 'padding-left'), await css(list, 'padding-right'), await css(list, 'padding-bottom')]).toEqual(['0px', '0px', '0px', '0px']);
    }
    // The verify's own numbers, under the default system.
    expect(await resolveToken(page, T('marker-height-medium'))).toBe(24);
    near((await content(items(timeline(page, 'dated')).first())).left - (await box(timeline(page, 'dated'))).x, 36, 'medium: 24 and 12', 0.05);
    near((await content(items(timeline(page, 'large')).first())).left - (await box(timeline(page, 'large'))).x, 40, 'large: 28 and 12', 0.05);
  });

  test('TML-2 the item gap of the density is between the end of one event and the beginning of the next, and density changes nothing else; the order is the product’s: nothing is sorted, numbered, hidden or read from a time', async ({ page }) => {
    await mountSpec(page, ['titles-only', 'compact', 'large-plan-compact']);
    const [regular, compact] = [await resolveToken(page, T('item-gap-regular')), await resolveToken(page, T('item-gap-compact'))];
    expect([regular, compact]).toEqual([16, 8]);
    for (const [id, between] of [['titles-only', regular], ['compact', compact], ['large-plan-compact', compact]] as const) {
      const boxes = await Promise.all((await items(timeline(page, id)).all()).map(box));
      for (let i = 1; i < boxes.length; i++) near(boxes[i].y - boxes[i - 1].bottom, between, `${id}: before event ${i + 1}`, 0.05);
    }
    // Nothing else: the same events, regular and compact, differ in the space between them alone.
    const list = timeline(page, 'titles-only');
    const look = () => list.evaluate((ol) => [...ol.querySelectorAll(':scope > li')].map((li) => { const r = li.getBoundingClientRect(); const b = getComputedStyle(li, '::before'); return [r.width, r.height, getComputedStyle(li).padding, b.width, b.height, b.top, getComputedStyle(li, '::after').top, ...[...li.children].map((c) => `${getComputedStyle(c).font} ${c.getBoundingClientRect().height}`)].join(' '); }));
    const before = await look();
    await list.evaluate((ol) => ol.setAttribute('data-density', 'compact'));
    expect(await look()).toEqual(before);
    near((await box(items(list).nth(1))).y - (await box(items(list).first())).bottom, compact, 'compact at once', 0.05);
    // The verify: 2026 then 2025, drawn and exposed in that order — and an older date first stays first.
    await mount(page, OL(`<li><time class="tanrei-timeline-time" datetime="2026-01-01">2026</time><p class="tanrei-timeline-title">Later</p></li><li><time class="tanrei-timeline-time" datetime="2025-01-01">2025</time><p class="tanrei-timeline-title">Earlier</p></li><li><time class="tanrei-timeline-time" datetime="2027-01-01">2027</time><p class="tanrei-timeline-title">Latest</p></li>`, 'aria-label="Years"'));
    const years = page.getByRole('list', { name: 'Years' }).getByRole('listitem');
    await expect(years).toHaveText(['2026Later', '2025Earlier', '2027Latest']);
    const tops = await Promise.all((await years.all()).map(async (item) => (await box(item)).y));
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    await expect(years.locator(':scope[hidden], :scope[style]')).toHaveCount(0);
    // Not numbered: no counter is drawn, and no list marker.
    expect([await css(years.first(), 'list-style-type'), await css(years.first(), 'content', '::before')]).toEqual(['none', '""']);
    expect(read('src/timeline.ts')).not.toMatch(/datetime|Date\b|sort\(|reverse\(|Intl\./);
  });

  test('TML-3 a time is drawn first, as the product wrote it, in the time style of the size and the time’s color, wraps, and what follows begins the time gap below it; with datetime it is a time element whose value is not drawn, without it text; nothing formats or changes it', async ({ page, browserName }) => {
    await mountSpec(page, ['dated', 'large', 'plan']);
    const html = page.locator('html');
    for (const [id, size] of [['dated', 'medium'], ['large', 'large']] as const) {
      const item = items(timeline(page, id)).first();
      const time = item.locator('.tanrei-timeline-time');
      expect(await item.evaluate((li) => li.firstElementChild!.className)).toBe('tanrei-timeline-time');
      expect(await px(time, 'font-size')).toBe(await resolveToken(page, T(`time-typescale-${size}-font-size`)));
      expect(await css(time, 'font-weight')).toBe(await weight(page, T(`time-typescale-${size}-font-weight`)));
      near(await px(time, 'line-height'), (await resolveToken(page, T(`time-typescale-${size}-font-size`))) * Number(await css(html, T(`time-typescale-${size}-line-height`))), `${id}: the time's line`, 0.05);
      expect(rgba(await css(time, 'color'))).toEqual(await color(page, T('time-color')));
      near((await box(time.locator('xpath=following-sibling::*[1]'))).y - (await box(time)).bottom, await resolveToken(page, T('time-gap')), `${id}: the time gap`, 0.05);
      expect([await css(time, 'display'), await css(time, 'white-space-collapse'), await css(time, 'text-overflow'), await css(time, 'overflow-x')]).toEqual(['block', 'collapse', 'clip', 'visible']);
    }
    // A time and its machine-readable value: the element is the document's own, its text the product's, its value not drawn.
    const first = items(timeline(page, 'dated')).first().locator('time');
    expect(await first.evaluate((el: HTMLTimeElement) => [el.localName, el.dateTime, el.textContent, (el as HTMLElement).innerText])).toEqual(['time', '2026-09-22', '22 September 2026', '22 September 2026']);
    // Not a moment: text, with no role of its own.
    const wave = items(timeline(page, 'plan')).first().locator('.tanrei-timeline-time');
    expect(await wave.evaluate((el) => [el.localName, el.textContent, el.getAttribute('role'), el.hasAttribute('datetime')])).toEqual(['p', 'Wave 0', null, false]);
    if (browserName === 'chromium') {
      expect((await tree(page, 'Release history'))[0][0].roles).toEqual(['time', 'paragraph', 'paragraph']);
      expect((await tree(page, 'Roadmap'))[0][0].roles).toEqual(['paragraph', 'paragraph', 'paragraph']);
    }
    // A long time wraps and is not cut.
    await mount(page, `<div style="inline-size:200px">${OL(`<li><p class="tanrei-timeline-time" id="when">Some time between the third week of September and the first of October</p><p class="tanrei-timeline-title">Soon</p></li>`)}</div>`);
    const when = page.locator('#when');
    expect((await box(when)).height).toBeGreaterThan(2 * (await px(when, 'line-height')));
    expect(await when.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // The package's script changes no time and reads none: after it ran, the words and the value are as written.
    await mount(page, OL(`<li><time class="tanrei-timeline-time" datetime="2026-09-19T09:41:00Z">2 hours ago</time><p class="tanrei-timeline-title">Saved</p></li>`));
    await page.waitForTimeout(50);
    expect(await page.locator('time').evaluate((el: HTMLTimeElement) => [el.textContent, el.dateTime, el.attributes.length])).toEqual(['2 hours ago', '2026-09-19T09:41:00Z', 2]);
  });

  test('TML-4 a title is drawn after the time in the title style of the size and the surface’s content color, wraps, and the body begins the title gap below it; given as text it is no heading; a heading given as the title is drawn as any title and keeps its role, its level and what it holds', async ({ page }) => {
    await mountSpec(page, ['dated', 'large', 'long-bodies', 'no-time']);
    const html = page.locator('html');
    for (const [id, size] of [['dated', 'medium'], ['large', 'large']] as const) {
      const item = items(timeline(page, id)).first();
      const title = item.locator('.tanrei-timeline-title');
      expect(await title.evaluate((el) => el.previousElementSibling!.className)).toBe('tanrei-timeline-time');
      expect(await px(title, 'font-size')).toBe(await resolveToken(page, T(`title-typescale-${size}-font-size`)));
      expect(await css(title, 'font-weight')).toBe(await weight(page, T(`title-typescale-${size}-font-weight`)));
      near(await px(title, 'line-height'), (await resolveToken(page, T(`title-typescale-${size}-font-size`))) * Number(await css(html, T(`title-typescale-${size}-line-height`))), `${id}: the title's line`, 0.05);
      near((await box(item.locator('p').last())).y - (await box(title)).bottom, await resolveToken(page, T('title-gap')), `${id}: the title gap`, 0.05);
      expect(await title.evaluate((el) => [el.localName, el.getAttribute('role')])).toEqual(['p', null]);
    }
    await expect(timeline(page, 'dated').getByRole('heading')).toHaveCount(0);
    // The surface's content color, not one of the timeline's.
    await page.addStyleTag({ content: '.stage[data-fixture="dated"] { color: rgb(1, 2, 3); }' });
    expect(await css(items(timeline(page, 'dated')).first().locator('.tanrei-timeline-title'), 'color')).toBe('rgb(1, 2, 3)');
    // Wraps, never cut.
    const long = items(timeline(page, 'long-bodies')).first().locator('.tanrei-timeline-title');
    expect((await box(long)).height).toBeGreaterThan(2 * (await px(long, 'line-height')));
    expect([await css(long, 'overflow-x'), await css(long, 'text-overflow'), await css(long, '-webkit-line-clamp')]).toEqual(['visible', 'clip', 'none']);
    // A title with no time before it is the event's first line; a body with no title follows the time or begins the event.
    expect(await items(timeline(page, 'no-time')).first().evaluate((li) => li.firstElementChild!.className)).toBe('tanrei-timeline-title');
    // A heading of the product's as the title, of any level, with a link and a tag in it.
    await mount(page, `${OL(`<li><time class="tanrei-timeline-time" datetime="2026-09-21">21 September 2026</time><h2 id="two"><a href="#v2" id="link">v0.2.0</a></h2><p>Body.</p></li><li><h4 id="four">v0.1.0 <span role="note" id="tag">first</span></h4><p>Body.</p></li><li><span class="tanrei-timeline-marker tanrei-icon" aria-hidden="true">flag</span><h5 id="five">Tagged</h5><p>Body.</p><h3 id="inner">A heading of the body</h3></li><li><p class="tanrei-timeline-title" id="text">Text</p><p id="body">Body.</p></li>`, 'aria-label="Releases"')}<h3 id="outside">Outside</h3>`);
    const text = page.locator('#text');
    for (const id of ['#two', '#four', '#five']) {
      const heading = page.locator(id);
      for (const property of ['font-size', 'font-weight', 'line-height', 'letter-spacing', 'font-family']) expect(await css(heading, property), `${id}: ${property}`).toBe(await css(text, property));
      near((await box(heading.locator('xpath=following-sibling::*[1]'))).y - (await box(heading)).bottom, await resolveToken(page, T('title-gap')), `${id}: the title gap`, 0.05);
    }
    await expect(page.getByRole('heading', { level: 2, name: 'v0.2.0' })).toHaveCount(1);
    await expect(page.getByRole('list', { name: 'Releases' }).getByRole('heading', { level: 4 })).toHaveText('v0.1.0 first');
    await expect(page.getByRole('heading', { level: 5, name: 'Tagged' })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'v0.2.0' })).toHaveCount(1);
    await expect(page.getByRole('note')).toHaveText('first');
    expect(await page.locator('#two, #four, #five').evaluateAll((all) => all.map((el) => [el.getAttribute('role'), el.getAttribute('aria-level')]))).toEqual([[null, null], [null, null], [null, null]]);
    // A heading later in a body is the body's: it is not drawn as a title.
    expect([await css(page.locator('#inner'), 'font-size'), await css(page.locator('#inner'), 'font-weight')]).not.toEqual([await css(text, 'font-size'), await css(text, 'font-weight')]);
    expect(await css(page.locator('#inner'), 'unicode-bidi')).not.toBe('plaintext');
    near((await box(page.locator('#two'))).y - (await box(page.locator('time'))).bottom, await resolveToken(page, T('time-gap')), 'a heading follows the time by the time gap', 0.05);
  });

  test('TML-5 the body takes the body’s text style of the size and no color of the timeline’s; it wraps and is never cut; two blocks are the body gap apart; long-form blocks are prose’s in a prose; a block that is not text takes the body’s whole width and scrolls in its own box', async ({ page }) => {
    await mountSpec(page, ['dated', 'large', 'long-bodies']);
    const html = page.locator('html');
    for (const [id, size] of [['dated', 'medium'], ['large', 'large']] as const) {
      const body = items(timeline(page, id)).first().locator('p').last();
      expect(await px(body, 'font-size')).toBe(await resolveToken(page, T(`body-typescale-${size}-font-size`)));
      expect(await css(body, 'font-weight')).toBe(await weight(page, T(`body-typescale-${size}-font-weight`)));
      near(await px(body, 'line-height'), (await resolveToken(page, T(`body-typescale-${size}-font-size`))) * Number(await css(html, T(`body-typescale-${size}-line-height`))), `${id}: the body's line`, 0.05);
    }
    await page.addStyleTag({ content: '.stage[data-fixture="dated"] { color: rgb(1, 2, 3); }' });
    expect(await css(items(timeline(page, 'dated')).first().locator('p').last(), 'color')).toBe('rgb(1, 2, 3)');
    for (const item of await items(timeline(page, 'long-bodies')).all()) {
      const body = item.locator('p').last();
      expect([await css(item, 'overflow-x'), await css(body, 'overflow-x'), await css(body, '-webkit-line-clamp')]).toEqual(['visible', 'visible', 'none']);
      expect((await box(body)).height).toBeGreaterThan(3 * (await px(body, 'line-height')));
      near((await box(item)).bottom, (await box(body)).bottom, 'no space after the last block', 0.05);
    }
    // Several blocks, whatever they are: the body gap between two that follow each other; text placed directly is the body's.
    const gap = await resolveToken(page, T('body-gap'));
    expect(gap).toBe(8);
    await mount(page, `<div style="inline-size:320px">${OL(`<li><p class="tanrei-timeline-time">Wave 1</p><p class="tanrei-timeline-title">Controls</p><p id="a">One paragraph.</p><p id="b">Another.</p><pre id="pre"><code>${'a-long-line-of-code '.repeat(12)}</code></pre><div id="block" style="block-size:40px"></div><table id="table"><tr><td>1</td></tr></table></li><li id="bare">Text placed directly.</li>`)}</div>`);
    const blocks = await Promise.all(['#a', '#b', '#pre', '#block', '#table'].map((id) => box(page.locator(id))));
    for (let i = 1; i < blocks.length; i++) near(blocks[i].y - blocks[i - 1].bottom, gap, `block ${i + 1}`, 0.05);
    const list = page.locator('.tanrei-timeline');
    const edge = (await box(list)).x + (await resolveToken(page, T('marker-height-medium'))) + (await resolveToken(page, T('marker-gap')));
    for (const id of ['#a', '#pre', '#block']) {
      near((await box(page.locator(id))).x, edge, `${id}: from the content edge`, 0.05);
      near((await box(page.locator(id))).right, (await box(list)).right, `${id}: the body's whole width`, 0.05);
    }
    // A block whose content cannot shrink scrolls in its own box when it is a scroll box (prose makes a pre one); the timeline never does.
    await page.locator('#pre').evaluate((el) => (el.style.overflowX = 'auto'));
    expect(await page.locator('#pre').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    near((await box(page.locator('#pre'))).right, (await box(list)).right, 'the block ends at the end edge', 0.05);
    expect(await list.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await px(page.locator('#bare'), 'font-size')).toBe(await resolveToken(page, T('body-typescale-medium-font-size')));
    // In a prose the body's long-form blocks are prose's: a link underlined at rest, strong text at the emphasized
    // weight, a list with prose's markers, a pre that scrolls in its own box — of the prose's size.
    await mount(page, `<div class="tanrei-prose" style="inline-size:320px">${OL(`<li><p class="tanrei-timeline-title">Build</p><p><strong>Build.</strong> Read <a href="#x">the guide</a>.</p><ul><li id="nested">One</li></ul><pre><code>${'a-long-line-of-code '.repeat(12)}</code></pre></li><li><p>Done.</p></li>`)}</div>`);
    expect(await css(page.locator('a'), 'text-decoration-line')).toBe('underline');
    expect(await css(page.locator('strong'), 'font-weight')).toBe(await weight(page, T('body-typescale-medium-font-weight-emphasized')));
    expect(await css(page.locator('#nested'), 'list-style-type')).not.toBe('none');
    expect(await css(page.locator('#nested'), 'content', '::before')).toBe('none');
    const pre = page.locator('pre');
    expect(await pre.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    near((await box(pre)).right, (await box(page.locator('.tanrei-prose'))).right, 'the block ends at the end edge', 0.05);
    expect(await page.locator('.tanrei-timeline').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });

  test('TML-6 a marker is centred in a square box of the size at the top of its event, the box’s centre on the first line’s; where the box is the taller the content is lowered by half the difference; with no status and no glyph it is a dot — a circle whatever the ring’s corners — and with a glyph a ring holding it, the edge inside the box; no marker is exposed', async ({ page, browserName }) => {
    await mountSpec(page, ['dated', 'large', 'no-time', 'icons']);
    const dot = await resolveToken(page, T('marker-dot-size'));
    for (const [id, size] of [['dated', 'medium'], ['large', 'large'], ['no-time', 'medium'], ['icons', 'medium']] as const) {
      const side = await resolveToken(page, T(`marker-height-${size}`));
      const list = timeline(page, id);
      for (const [i, item] of (await items(list).all()).entries()) {
        const outer = await box(item);
        const marker = await markerBox(item, size);
        const line = await firstLine(item);
        // The box: at the start edge, at the top of the event, its centre on the first line's.
        near(marker.x, (await box(list)).x, `${id} ${i}: at the start edge`, 0.05);
        near(marker.y + side / 2, line.y + line.height / 2, `${id} ${i}: centred on the first line`, 1);
        expect(marker.y, `${id} ${i}: no marker reaches above its event`).toBeGreaterThanOrEqual(outer.y - 0.05);
        // The content is lowered by half of what the box is taller than the first line by.
        const first = item.locator(':scope > :not(.tanrei-timeline-marker)').first();
        const lineHeight = await px(first, 'line-height');
        expect(side).toBeGreaterThan(lineHeight);
        near((await box(first)).y - outer.y, (side - lineHeight) / 2, `${id} ${i}: lowered by half the difference`, 0.05);
        if (id === 'icons') continue;
        // The dot: a filled circle of the dot's size at the box's centre.
        const drawn = await generatedBox(item);
        expect([drawn.width, drawn.height]).toEqual([dot, dot]);
        near(drawn.x + dot / 2, marker.x + side / 2, `${id} ${i}: the dot in the column's centre`, 0.05);
        near(drawn.y + dot / 2, marker.y + side / 2, `${id} ${i}: the dot at the box's centre`, 0.05);
        expect(rgba(await css(item, 'background-color', '::before'))).toEqual(await color(page, T('marker-dot-color')));
        expect([await css(item, 'border-top-width', '::before'), await css(item, 'content', '::before')]).toEqual(['0px', '""']);
      }
    }
    // The verify, under the default system at medium: the dot is 8 across at the centre of a 24 box, 8 from each side.
    const first = items(timeline(page, 'dated')).first();
    const [marker, drawn] = [await markerBox(first), await generatedBox(first)];
    expect([marker.width, drawn.width, drawn.x - marker.x, marker.right - drawn.right, drawn.y - marker.y]).toEqual([24, 8, 8, 8, 8]);
    // …painted: the dot's color at its centre, the surface's at the box's corner.
    const shot = await pixels(page, marker);
    expect(shot.at(12, 12)).toBe(rgb(await resolveColor(page, T('marker-dot-color'))));
    expect(shot.at(2, 2)).toBe(rgb(await resolveColor(page, '--tanrei-sys-color-surface')));
    // A ring holding the product's glyph: the whole box, the edge inside it, a 16 glyph at its centre.
    for (const item of await items(timeline(page, 'icons')).all()) {
      const glyph = item.locator('.tanrei-timeline-marker');
      const [ring, expected] = [await box(glyph), await markerBox(item)];
      for (const key of ['x', 'y', 'width', 'height'] as const) near(ring[key], expected[key], `the ring is the box: ${key}`, 0.05);
      expect([ring.width, await px(glyph, 'font-size')]).toEqual([24, 16]);
      expect(await css(glyph, 'box-sizing')).toBe('border-box');
      expect(await px(glyph, 'border-top-width')).toBe(await resolveToken(page, T('marker-outline-width')));
      expect(rgba(await css(glyph, 'border-top-color'))).toEqual(await color(page, T('marker-outline-color')));
      expect(rgba(await css(glyph, 'background-color'))[3]).toBe(0);
      // The glyph's own box is at the ring's centre: one line as high as the ring is inside its edge, centred.
      near(await px(glyph, 'line-height'), 24 - 2 * (await px(glyph, 'border-top-width')), 'one line inside the ring', 0.05);
      expect(await css(glyph, 'text-align')).toBe('center');
      // The generated box draws nothing beside it.
      expect(await css(item, 'content', '::before')).toBe('none');
      await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    }
    // The ring's corners are the marker's shape, never more than half the side, by the shared corner rule; the dot stays a circle.
    await mountSpec(page, ['icons', 'dated', 'plan']);
    expect(await css(items(timeline(page, 'icons')).first().locator('.tanrei-timeline-marker'), 'border-top-left-radius')).toBe(await page.evaluate((token) => { const probe = document.createElement('i'); probe.style.cssText = `display:block;border-radius:var(${token})`; document.body.append(probe); const r = getComputedStyle(probe).borderTopLeftRadius; probe.remove(); return r; }, T('marker-shape')));
    await page.addStyleTag({ content: `:root { ${T('marker-shape')}: 6px; ${T('marker-shape-pill')}: 0; --tanrei-sys-shape-corner-smoothing: 0.6; }` });
    const eased = await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(2)'));
    const scale = eased ? 1 + 0.4 * 0.6 : 1;
    near(await px(items(timeline(page, 'icons')).first().locator('.tanrei-timeline-marker'), 'border-top-left-radius'), 6 * scale, 'the glyph ring’s corner', 0.01);
    near(await px(items(timeline(page, 'plan')).first(), 'border-top-left-radius', '::before'), 6 * scale, 'a status ring’s corner', 0.01);
    if (eased) expect(await css(items(timeline(page, 'plan')).first(), 'corner-top-left-shape', '::before')).not.toBe('round');
    expect(await css(items(timeline(page, 'dated')).first(), 'border-top-left-radius', '::before')).toBe('50%');
    if (eased) expect(await css(items(timeline(page, 'dated')).first(), 'corner-top-left-shape', '::before')).toMatch(/^(round|superellipse\(1\))$/);
    // Kept from assistive technology: the tree holds the time, the title and the body, and nothing for a marker.
    if (browserName === 'chromium') {
      expect((await tree(page, 'Activity'))[0].map((item) => item.texts)).toEqual([['Today, 10:12', 'Ada commented on the proposal'], ['Today, 09:30', 'The checks passed'], ['Yesterday', 'Grace opened the proposal']]);
      expect((await tree(page, 'Release history'))[0][0].texts).toEqual(['22 September 2026', 'Text styles by level', 'The text styles are named by their level, and every corner can be eased.']);
    }
  });

  test('TML-7 done is the ring holding a check, current the whole box filled holding a dot, upcoming the empty ring — three shapes — or each holding the event’s own glyph; a status changes the marker alone, any number of events may have any status, and none is derived', async ({ page }) => {
    await mountSpec(page, ['plan', 'plan-icons']);
    const list = timeline(page, 'plan');
    const all = await items(list).all();
    const surface = rgb(await resolveColor(page, '--tanrei-sys-color-surface'));
    const [primary, onPrimary] = [rgb(await resolveColor(page, T('marker-current-container-color'))), rgb(await resolveColor(page, T('marker-current-icon-color')))];
    const width = await resolveToken(page, T('marker-outline-width'));
    const shots = [];
    for (const [i, item] of all.entries()) {
      const [marker, drawn] = [await markerBox(item), await generatedBox(item)];
      // Every status marker is the whole box.
      for (const key of ['x', 'y', 'width', 'height'] as const) near(drawn[key], marker[key], `event ${i + 1}: the marker is the box: ${key}`, 0.05);
      shots.push(await pixels(page, marker));
    }
    // The verify: two rings with a check, one filled circle with a dot, one empty ring.
    const inked = (shot: Awaited<ReturnType<typeof pixels>>, from: number, to: number) => { let n = 0; for (let y = from; y < to; y++) for (let x = from; x < to; x++) if (shot.at(x, y) !== surface) n++; return n; };
    for (const i of [0, 1]) {
      expect([await css(all[i], 'border-top-width', '::before'), await css(all[i], 'border-top-style', '::before')]).toEqual([`${width}px`, 'solid']);
      expect(rgba(await css(all[i], 'border-top-color', '::before'))).toEqual(await color(page, T('marker-outline-color')));
      expect(await css(all[i], 'content', '::before')).toContain('"check"');
      expect(rgba(await css(all[i], 'color', '::before'))).toEqual(await color(page, T('marker-icon-color')));
      expect([rgba(await css(all[i], 'background-color', '::before'))[3], await css(all[i], 'background-image', '::before')]).toEqual([0, 'none']);
      // A mark is painted inside the ring, and the ring's inside is otherwise the surface.
      expect(inked(shots[i], 6, 18), `event ${i + 1}: a check is drawn`).toBeGreaterThan(8);
      expect(shots[i].at(4, 12)).toBe(surface);
    }
    expect(await css(all[2], 'border-top-width', '::before')).toBe('0px');
    expect(await css(all[2], 'background-image', '::before')).toContain('radial-gradient');
    expect([shots[2].at(12, 12), shots[2].at(11, 11), shots[2].at(4, 12), shots[2].at(12, 20), shots[2].at(0, 0)]).toEqual([onPrimary, onPrimary, primary, primary, surface]);
    // The dot inside it is the dot's size across: the mark's color for 8 along the middle row, the fill beside it.
    const row = Array.from({ length: 24 }, (_, x) => shots[2].at(x, 12));
    expect(row.filter((c) => c === onPrimary).length).toBe(await resolveToken(page, T('marker-dot-size')));
    expect(await css(all[3], 'border-top-width', '::before')).toBe(`${width}px`);
    expect(inked(shots[3], 6, 18), 'the upcoming ring is empty').toBe(0);
    expect(inked(shots[3], 0, 24), 'the upcoming ring is drawn').toBeGreaterThan(20);
    expect(await css(all[3], 'background-image', '::before')).toBe('none');
    // Three shapes, not three colors: with every color of the marker made one, the three still differ.
    await page.addStyleTag({ content: `:root { ${['marker-outline-color', 'marker-icon-color', 'marker-current-container-color', 'marker-dot-color'].map((name) => `${T(name)}: rgb(0, 0, 0);`).join(' ')} ${T('marker-current-icon-color')}: rgb(255, 255, 255); }` });
    const mono = await Promise.all([all[1], all[2], all[3]].map(async (item) => Buffer.from((await pixels(page, await markerBox(item))).data).toString('base64')));
    expect(new Set(mono).size).toBe(3);
    // The product's glyphs in place of the check, the dot and nothing (plan-icons): the ring, the fill, the ring.
    await mountSpec(page, ['plan', 'plan-icons']);
    const glyphs = await items(timeline(page, 'plan-icons')).locator('.tanrei-timeline-marker').all();
    expect(await Promise.all(glyphs.map((glyph) => glyph.textContent()))).toEqual(['receipt_long', 'local_shipping', 'home']);
    for (const i of [0, 2]) {
      expect(rgba(await css(glyphs[i], 'border-top-color'))).toEqual(await color(page, T('marker-outline-color')));
      expect(rgba(await css(glyphs[i], 'color'))).toEqual(await color(page, T('marker-icon-color')));
      expect(rgba(await css(glyphs[i], 'background-color'))[3]).toBe(0);
    }
    expect(rgba(await css(glyphs[1], 'background-color'))).toEqual(await color(page, T('marker-current-container-color')));
    expect(rgba(await css(glyphs[1], 'color'))).toEqual(await color(page, T('marker-current-icon-color')));
    expect(rgba(await css(glyphs[1], 'border-top-color'))[3]).toBe(0);
    // A status changes the marker only: time, title, body and connector are drawn as every other event's.
    const plan = await items(timeline(page, 'plan')).all();
    const rest = (item: Locator) => item.evaluate((li) => [...[...li.children].map((c) => { const s = getComputedStyle(c); return [s.font, s.color, s.letterSpacing, s.opacity, s.textDecorationLine].join(' '); }), (() => { const a = getComputedStyle(li, '::after'); return [a.borderLeftWidth, a.borderLeftColor, a.borderLeftStyle, a.top, a.left].join(' '); })(), getComputedStyle(li).padding, getComputedStyle(li).opacity].join(' | '));
    const looks = await Promise.all(plan.slice(0, 3).map(rest));
    expect(new Set(looks).size).toBe(1);
    // Any number of events may have any status: two under way are both drawn so, an upcoming one before a done one stays.
    await mount(page, OL(EVENT('A', 'data-status="upcoming"') + EVENT('B', 'data-status="current"') + EVENT('C', 'data-status="current"') + EVENT('D', 'data-status="done"') + EVENT('E')));
    await page.waitForTimeout(50);
    expect(await page.locator('.tanrei-timeline > li').evaluateAll((all) => all.map((li) => { const b = getComputedStyle(li, '::before'); return [li.getAttribute('data-status'), b.backgroundImage.startsWith('radial-gradient'), b.borderTopWidth, b.content.includes('check')]; }))).toEqual([['upcoming', false, '1px', false], ['current', true, '0px', false], ['current', true, '0px', false], ['done', false, '1px', true], [null, false, '0px', false]]);
    expect(read('src/timeline.ts')).not.toMatch(/setAttribute\('data-status/);
  });

  test('TML-8 a glyph is drawn in a box of the icon size at the marker’s centre, in the icon color — the current icon color on the event under way — in the unselected family and fill at the system’s weight, and is kept from assistive technology', async ({ page }) => {
    await mountSpec(page, ['plan', 'plan-icons', 'icons']);
    const size = await resolveToken(page, T('marker-icon-size'));
    const html = page.locator('html');
    const family = (await css(html, '--tanrei-sys-icon-family-unselected')).trim().replaceAll(/['"]/g, '');
    const [fill, wght] = [(await css(html, '--tanrei-sys-icon-fill-unselected')).trim(), await page.evaluate(() => { const probe = document.createElement('i'); probe.style.fontWeight = 'var(--tanrei-sys-icon-weight)'; document.body.append(probe); const w = getComputedStyle(probe).fontWeight; probe.remove(); return w; })];
    const settings = (value: string) => Object.fromEntries([...value.matchAll(/["'](\w+)["'] ([\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
    // The product's glyphs.
    await expect(timeline(page, 'plan-icons').locator('[aria-current="true"]')).toHaveCount(1);
    for (const id of ['icons', 'plan-icons']) {
      for (const item of await items(timeline(page, id)).all()) {
        const glyph = item.locator('.tanrei-timeline-marker');
        expect(await px(glyph, 'font-size'), id).toBe(size);
        expect((await css(glyph, 'font-family')).replaceAll(/['"]/g, ''), id).toContain(family);
        // Unselected, also in the item that is the list's current one (the icon helper fills a glyph under `aria-current`).
        expect(settings(await css(glyph, 'font-variation-settings')), id).toMatchObject({ FILL: Number(fill), wght: Number(wght) });
        expect(await css(glyph, 'font-optical-sizing')).toBe('auto');
        const current = (await item.getAttribute('data-status')) === 'current';
        expect(rgba(await css(glyph, 'color')), id).toEqual(await color(page, T(current ? 'marker-current-icon-color' : 'marker-icon-color')));
        await expect(glyph).toHaveAttribute('aria-hidden', 'true');
        // At the marker's centre: the glyph's text is one 16 box in the middle of the ring.
        const [ring, text] = [await box(glyph), await glyph.evaluate((el) => { const range = document.createRange(); range.selectNodeContents(el); const r = range.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width }; })];
        near(text.x, ring.x + ring.width / 2, `${id}: centred across`, 0.6);
        near(text.y, ring.y + ring.height / 2, `${id}: centred down`, 0.6);
        near(text.width, size, `${id}: one glyph, the icon size wide`, 0.6);
      }
    }
    // The check of a done event is a glyph of the same set, by name, with the same declarations, and is not read.
    const done = items(timeline(page, 'plan')).first();
    expect(await px(done, 'font-size', '::before')).toBe(size);
    expect((await css(done, 'font-family', '::before')).replaceAll(/['"]/g, '')).toContain(family);
    expect(settings(await css(done, 'font-variation-settings', '::before'))).toMatchObject({ FILL: Number(fill), wght: Number(wght) });
    // The optical size is the box's, written by hand (src/styles/icons.ts): not every engine draws font-optical-sizing: auto.
    expect(await drawnOpticalSize(done, '::before')).toBe(await opticalSize(page, size));
    expect(rgba(await css(done, 'color', '::before'))).toEqual(await color(page, T('marker-icon-color')));
    expect(await css(done, 'content', '::before')).toMatch(/^"check" \/ /);
    // Without the icon stylesheet no name is drawn as text: the check has no size (the ring stays).
    await page.addStyleTag({ content: ':root { --tanrei-icons: initial; }' });
    expect(await px(done, 'font-size', '::before')).toBe(0);
    expect(await px(done, 'width', '::before')).toBe(await resolveToken(page, T('marker-height-medium')));
  });

  test('TML-9 a connector joins an event’s marker to the next: a hairline on the marker column’s centre line, the connector gap from both boxes, through the space between the events however tall the upper one; none after the last event, none in a timeline of one; it takes no room, is the same between events of any status, and is not exposed', async ({ page }) => {
    await mountSpec(page, ['no-time', 'long-bodies', 'single', 'plan', 'large', 'compact']);
    const [thickness, gap] = [await resolveToken(page, T('connector-thickness')), await resolveToken(page, T('connector-gap'))];
    for (const [id, size] of [['no-time', 'medium'], ['long-bodies', 'medium'], ['plan', 'medium'], ['large', 'large'], ['compact', 'medium']] as const) {
      const all = await items(timeline(page, id)).all();
      for (const [i, item] of all.entries()) {
        if (i === all.length - 1) {
          expect(await css(item, 'content', '::after'), `${id}: none after the last`).toBe('none');
          continue;
        }
        const [outer, upper, lower] = [await box(item), await markerBox(item, size), await markerBox(all[i + 1], size)];
        expect([await css(item, 'position', '::after'), await css(item, 'pointer-events', '::after'), await css(item, 'content', '::after')]).toEqual(['absolute', 'none', '""']);
        expect([await px(item, 'border-left-width', '::after'), await px(item, 'width', '::after')]).toEqual([thickness, 0]);
        expect(rgba(await css(item, 'border-left-color', '::after'))).toEqual(await color(page, T('connector-color')));
        // From the gap below the upper box to the gap above the lower box, on the column's centre line.
        const top = outer.y + (await px(item, 'top', '::after'));
        const bottom = outer.bottom - (await px(item, 'bottom', '::after'));
        near(top, upper.bottom + gap, `${id} ${i}: begins the gap below the upper box`, 0.05);
        near(bottom, lower.y - gap, `${id} ${i}: ends the gap above the lower box`, 0.05);
        near(outer.x + (await px(item, 'left', '::after')) + thickness / 2, upper.x + upper.width / 2, `${id} ${i}: on the centre line`, 0.05);
        expect(bottom - top, `${id} ${i}: it has a length`).toBeGreaterThan(0);
        // Never over content: it stays inside the marker column.
        expect(outer.x + (await px(item, 'left', '::after')) + thickness).toBeLessThan((await content(item)).left);
      }
    }
    // The verify: between two one-line events with titles only, the upper box ends at 24 and the connector runs from 28
    // to 4 above the lower box's top — painted there, in the connector's color, and not beside it.
    const first = items(timeline(page, 'no-time')).first();
    const [outer, next] = [await box(first), await box(items(timeline(page, 'no-time')).nth(1))];
    expect([(await markerBox(first)).bottom - outer.y, await px(first, 'top', '::after'), next.y - (outer.bottom - (await px(first, 'bottom', '::after')))]).toEqual([24, 28, 4]);
    const shot = await pixels(page, { x: outer.x, y: outer.y, width: 24, height: next.y - outer.y, right: 0, bottom: 0 });
    const line = rgb(await resolveColor(page, T('connector-color')));
    const surface = rgb(await resolveColor(page, '--tanrei-sys-color-surface'));
    // (A hairline on the centre line of a 24 column stands between two pixels of a picture taken at one pixel a point:
    // it is one or two pixels of ink, and where it falls on one whole pixel that pixel is the connector's color.)
    const column = (y: number) => Array.from({ length: 24 }, (_, x) => shot.at(x, y)).filter((c) => c !== surface).length;
    expect([column(26), column(37)]).toEqual([0, 0]);
    for (const y of [28, 32, 35]) expect([1, 2], `row ${y}`).toContain(column(y));
    expect([shot.at(11, 30), shot.at(12, 30)].some((c) => c !== surface)).toBe(true);
    expect(line).not.toBe(surface);
    expect([shot.at(2, 30), shot.at(20, 30)]).toEqual([surface, surface]);
    // It takes no room: with the connector's thickness zero nothing moves and nothing is drawn.
    const rest = await timeline(page, 'plan').evaluate((ol) => [...ol.querySelectorAll('li, li > *')].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].join(' '); }));
    await page.addStyleTag({ content: `:root { ${T('connector-thickness')}: 0px; }` });
    expect(await timeline(page, 'plan').evaluate((ol) => [...ol.querySelectorAll('li, li > *')].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].join(' '); }))).toEqual(rest);
    expect(await px(items(timeline(page, 'plan')).first(), 'border-left-width', '::after')).toBe(0);
    // One event: none.
    expect(await css(items(timeline(page, 'single')).first(), 'content', '::after')).toBe('none');
    // The same line between events of any status.
    await mountSpec(page, ['plan']);
    const lines = await timeline(page, 'plan').evaluate((ol) => [...ol.querySelectorAll(':scope > li:not(:last-child)')].map((li) => { const a = getComputedStyle(li, '::after'); return [a.borderLeftWidth, a.borderLeftColor, a.borderLeftStyle, a.left, a.top, a.opacity].join(' '); }));
    expect(lines).toHaveLength(3);
    expect(new Set(lines).size).toBe(1);
  });

  test('TML-10 the timeline is a block in the flow: the whole inline size of its container from the text’s start edge, no outer space of its own, never wider than the container, no minimum or maximum width, and it does not scroll; in a prose that keeps a measure it takes the prose’s full width', async ({ page }) => {
    await mount(page, `<div id="box" style="inline-size:520px"><p id="before" style="margin:0">Before.</p>${OL(EVENT('One', '', '<p>Body.</p>') + EVENT('Two'))}<p id="after" style="margin:0">After.</p></div>`);
    const list = page.locator('.tanrei-timeline');
    const [outer, container] = [await box(list), await box(page.locator('#box'))];
    expect(await css(list, 'display')).toBe('block');
    near(outer.x, container.x, 'from the start edge', 0.05);
    near(outer.width, 520, 'the whole inline size', 0.05);
    near(outer.y, (await box(page.locator('#before'))).bottom, 'no space before', 0.05);
    near((await box(page.locator('#after'))).y, outer.bottom, 'no space after', 0.05);
    expect([await css(list, 'margin-top'), await css(list, 'margin-bottom'), await css(list, 'margin-left'), await css(list, 'margin-right')]).toEqual(['0px', '0px', '0px', '0px']);
    expect([await css(list, 'min-width'), await css(list, 'max-width'), await css(list, 'overflow-x'), await css(list, 'overflow-y')]).toEqual(['0px', 'none', 'visible', 'visible']);
    // Narrower than a word: still no wider than the container.
    await page.locator('#box').evaluate((el) => (el.style.inlineSize = '60px'));
    await list.evaluate((ol) => (ol.querySelector('.tanrei-timeline-title')!.textContent = 'Internationalisation'));
    near((await box(list)).width, 60, 'never wider than its container', 0.05);
    expect(await list.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // In a prose with a measure: the list is a block that is not text (PRS-18), the paragraphs of a body keep the measure.
    await mount(page, `<div class="tanrei-prose" style="inline-size:1100px"><p id="text">${'Words that fill the line. '.repeat(20)}</p>${OL(`<li><p class="tanrei-timeline-title">One</p><p id="body">${'Words that fill the line. '.repeat(20)}</p><div id="block" style="block-size:20px"></div></li>`)}</div>`);
    const prose = await box(page.locator('.tanrei-prose'));
    expect((await box(page.locator('#text'))).width).toBeLessThan(900);
    near((await box(page.locator('.tanrei-timeline'))).width, prose.width, 'the prose’s full width', 0.05);
    near((await box(page.locator('#block'))).right, prose.right, 'a block that is not text runs to the end edge', 0.05);
    near((await box(page.locator('#body'))).width, (await box(page.locator('#text'))).width, 'a paragraph of a body keeps the measure', 0.05);
    // The space before it in a prose is prose's rhythm, not none.
    expect(await px(page.locator('.tanrei-timeline'), 'margin-top')).toBeGreaterThan(0);
  });
});

test.describe('no input, and what is read', () => {
  test('TML-11 the timeline takes no input and no focus and changes nothing under a pointer or a press; what is in a title or a body keeps its own input, and the text stays selectable', async ({ page }) => {
    await mount(page, `<button id="before">before</button>${OL(`<li data-status="current" data-status-label="In progress"><p class="tanrei-timeline-time">Wave 2</p><h3><a href="#x" id="title">Navigation</a></h3><p>Read <a href="#y" id="inside">the plan</a>.</p></li><li><span class="tanrei-timeline-marker tanrei-icon" aria-hidden="true">flag</span><p class="tanrei-timeline-title">Then</p></li>`)}<button id="after">after</button>`);
    const list = page.locator('.tanrei-timeline');
    await page.locator('#before').focus();
    const stops: string[] = [];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      stops.push(await page.evaluate(() => document.activeElement?.id ?? ''));
    }
    expect(stops).toEqual(['title', 'inside', 'after']);
    expect(await list.evaluate((ol) => [ol, ...ol.querySelectorAll('li, .tanrei-timeline-time, .tanrei-timeline-title, .tanrei-timeline-marker, h3, p')].every((el) => (el as HTMLElement).tabIndex === -1 && !el.hasAttribute('tabindex')))).toBe(true);
    // Nothing changes under a pointer or a press, on an event or on a marker.
    const first = items(list).first();
    const glyph = items(list).nth(1).locator('.tanrei-timeline-marker');
    const look = () => list.evaluate((ol) => [...ol.querySelectorAll('li')].flatMap((li) => ['::before', '::after', null].map((pseudo) => { const s = getComputedStyle(li, pseudo); return [s.borderTopColor, s.borderLeftColor, s.backgroundColor, s.backgroundImage, s.color, s.opacity, s.cursor, s.outlineStyle, s.transform].join('|'); })).concat([...ol.querySelectorAll('.tanrei-timeline-marker, .tanrei-timeline-time')].map((el) => { const s = getComputedStyle(el); return [s.borderTopColor, s.backgroundColor, s.color, s.opacity, s.cursor].join('|'); })));
    const rest = await look();
    await first.hover({ position: { x: 10, y: 10 } });
    expect(await look()).toEqual(rest);
    await page.mouse.down();
    expect(await look()).toEqual(rest);
    await page.mouse.up();
    expect(await page.evaluate(() => document.activeElement?.localName)).not.toBe('li');
    // A marker is not a control: a press on the product's glyph goes through it, and it has no role.
    expect([await css(glyph, 'pointer-events'), await css(first, 'pointer-events', '::before'), await glyph.getAttribute('role')]).toEqual(['none', 'none', null]);
    // Selectable text.
    for (const target of [first, first.locator('.tanrei-timeline-time'), first.locator('h3'), first.locator('p').last()]) expect(await css(target, 'user-select')).not.toBe('none');
    // No event of its own, and nothing the script listens for.
    expect(read('src/timeline.ts')).not.toMatch(/addEventListener|dispatchEvent|CustomEvent|tabindex|tabIndex/);
    expect(await list.evaluate((ol) => [...ol.querySelectorAll('*')].some((el) => el.hasAttribute('aria-selected') || el.hasAttribute('aria-disabled') || el.hasAttribute('aria-pressed')))).toBe(false);
  });

  test('TML-12 the timeline is an ordered list of as many items as events, named by label; each item holds its status in words, its time, its title and its body, in that order — the words before the time, a phrase of their own, drawn nowhere and ignored while the status is none; exactly one current event is the list’s current item; nothing else says a status and no role is added', async ({ page, browserName }) => {
    await mountSpec(page, ['plan', 'plan-icons', 'dated', 'large-plan-compact']);
    const list = page.getByRole('list', { name: 'Roadmap' }).first();
    expect(await list.evaluate((el) => [el.localName, el.getAttribute('role')])).toEqual(['ol', 'list']);
    await expect(list.getByRole('listitem')).toHaveCount(4);
    await expect(page.getByRole('list', { name: 'Release history' }).getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('list', { name: 'Order 1042' }).getByRole('listitem')).toHaveCount(3);
    // The words are the alternative text of the marker — the item's first box, before its time — set apart by a comma.
    const all = await items(timeline(page, 'plan')).all();
    expect(await Promise.all(all.map((item) => css(item, 'content', '::before')))).toEqual(['"check" / "Done" ", "', '"check" / "Done" ", "', '"​" / "In progress" ", "', '"​" / "Not started" ", "'].map((value) => (browserName === 'webkit' ? value.replace(/" ", "$/, ', "') : value)));
    // …and with the product's glyph, which is hidden: the generated box holds the words and draws nothing.
    const withGlyph = await items(timeline(page, 'plan-icons')).all();
    expect((await Promise.all(withGlyph.map((item) => css(item, 'content', '::before')))).map((value) => value.replace(/" ", "$/, ', "'))).toEqual(['"​" / "Done, "', '"​" / "In progress, "', '"​" / "Not started, "']);
    for (const item of withGlyph) expect([await px(item, 'width', '::before'), await px(item, 'height', '::before'), await px(item, 'font-size', '::before')]).toEqual([0, 0, 0]);
    // Not drawn: no event's own text holds the words.
    expect(await timeline(page, 'plan').evaluate((ol) => (ol as HTMLElement).innerText)).not.toMatch(/Done|In progress|Not started/);
    // The time, the title and the body follow, in the document's order.
    expect(await all[2].evaluate((li) => [...li.children].map((child) => child.textContent))).toEqual(['Wave 2', 'Navigation and overlays', 'The drawer, tabs, dialogs, menus and sheets.']);
    // Exactly one current event: the list's current item, in the platform's own way.
    await expect(all[2]).toHaveAttribute('aria-current', 'true');
    expect(await timeline(page, 'plan').evaluate((ol) => [...ol.children].map((li) => li.getAttribute('aria-current')))).toEqual([null, null, 'true', null]);
    await expect(timeline(page, 'large-plan-compact').locator('> li[aria-current="true"]')).toHaveCount(1);
    // Nothing else says a status, and no role is added to a time, a title or a body.
    expect(await timeline(page, 'plan').evaluate((ol) => [...ol.querySelectorAll('*')].flatMap((el) => [...el.attributes].filter((a) => a.name === 'role' || (a.name.startsWith('aria-') && a.name !== 'aria-current')).map((a) => a.name)))).toEqual([]);
    expect(await timeline(page, 'dated').evaluate((ol) => [...ol.querySelectorAll('*')].flatMap((el) => [...el.attributes].filter((a) => a.name === 'role' || a.name.startsWith('aria-')).map((a) => a.name)))).toEqual([]);
    // What the engine's accessibility tree holds, where a test can read it (Chromium, over the DevTools protocol).
    if (browserName === 'chromium') {
      const [plan] = await tree(page, 'Roadmap');
      // The verify: a list of four items; the third is read as In progress, Wave 2, Navigation and overlays, and its body.
      expect(plan.map((item) => item.texts)).toEqual([
        ['Done,', 'Wave 0', 'Foundations', 'Tokens, theming, typography, icons, surfaces and the state primitives.'],
        ['Done,', 'Wave 1', 'The controls of day one', 'Buttons, fields, selection controls and the list.'],
        ['In progress,', 'Wave 2', 'Navigation and overlays', 'The drawer, tabs, dialogs, menus and sheets.'],
        ['Not started,', 'Wave 3', 'The specialised pieces', 'Pickers, the carousel and what a documentation site needs.'],
      ]);
      // The check's name, the dot and the rings are not read; nothing but text stands in an item.
      expect(plan.every((item) => item.roles.every((role) => role === 'paragraph'))).toBe(true);
      const [order] = await tree(page, 'Order 1042');
      expect(order.map((item) => item.texts)).toEqual([['Done,', 'Monday, 09:41', 'Order placed'], ['In progress,', 'Tuesday, 14:05', 'On its way'], ['Not started,', 'Expected Thursday', 'Delivered']]);
      // (The protocol's tree does not carry `aria-current` for any element, a link's `page` included: that the engine
      // exposes the attribute — which it does for every role — is not something this test can read; the attribute is.)
    } else {
      // The other engines give a test no tree: what a reader's software is handed is the same generated content, whose
      // alternative text they parse (above) — and Playwright's own reading of the page finds the words before the time.
      expect(await timeline(page, 'plan').ariaSnapshot()).toMatch(/- listitem:\s*\n\s*- text: In progress,\s*\n\s*- paragraph: Wave 2/);
    }
    // With none or several under way no item is the current one; a current item the product marked is left as it is.
    await mount(page, `${OL(EVENT('A', 'data-status="current" data-status-label="Now"') + EVENT('B', 'data-status="current" data-status-label="Now"'), 'id="two"')}${OL(EVENT('A', 'data-status="done" data-status-label="Done"') + EVENT('B'), 'id="none"')}${OL(EVENT('A', 'data-status="current" aria-current="step"') + EVENT('B'), 'id="theirs"')}`);
    await page.waitForTimeout(50);
    expect(await page.locator('#two > li, #none > li').evaluateAll((all) => all.map((li) => li.getAttribute('aria-current')))).toEqual([null, null, null, null]);
    expect(await page.locator('#theirs > li').first().getAttribute('aria-current')).toBe('step');
    // While the status is none the words are ignored: nothing is read before the time.
    await mount(page, OL(`<li data-status-label="Done"><p class="tanrei-timeline-time">Wave 0</p></li><li data-status="none" data-status-label="Done"><p class="tanrei-timeline-time">Wave 1</p></li><li data-status="finished" data-status-label="Done"><p class="tanrei-timeline-time">Wave 2</p></li>`, 'aria-label="Ignored"'));
    expect(await page.locator('.tanrei-timeline > li').evaluateAll((all) => all.map((li) => getComputedStyle(li, '::before').content))).toEqual(['""', '""', '""']);
    if (browserName === 'chromium') expect((await tree(page, 'Ignored'))[0].map((item) => item.texts)).toEqual([['Wave 0'], ['Wave 1'], ['Wave 2']]);
  });

  test('TML-12 where an engine does not take alternative text for generated content the script writes the words as an element at the event’s start, read and drawn nowhere; words the product wrote as an element are left alone', async ({ page, browserName }) => {
    // An engine without the syntax, as the script asks: `CSS.supports` answers no for it.
    await fresh(page);
    await page.addInitScript(() => {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = ((...args: [string, string?]) => (args[0] === 'content' && String(args[1]).includes('/') ? false : supports(...(args as [string, string])))) as typeof CSS.supports;
    });
    await page.goto('about:blank');
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => ['plan', 'plan-icons', 'dated'].includes(f.id)) });
    const all = await items(timeline(page, 'plan')).all();
    await expect(timeline(page, 'plan').locator('.tanrei-timeline-status')).toHaveText(['Done, ', 'Done, ', 'In progress, ', 'Not started, ']);
    // First in the event, before the time — after the product's glyph where there is one.
    expect(await all[2].evaluate((li) => [...li.children].map((child) => child.className))).toEqual(['tanrei-timeline-status', 'tanrei-timeline-time', 'tanrei-timeline-title', '']);
    expect(await items(timeline(page, 'plan-icons')).nth(1).evaluate((li) => [...li.children].map((child) => child.className))).toEqual(['tanrei-timeline-marker tanrei-icon', 'tanrei-timeline-status', 'tanrei-timeline-time', 'tanrei-timeline-title']);
    await expect(timeline(page, 'dated').locator('.tanrei-timeline-status')).toHaveCount(0);
    // Drawn nowhere and taking no room: the event is laid out as without it.
    const status = all[2].locator('.tanrei-timeline-status');
    expect([await css(status, 'position'), await css(status, 'width'), await css(status, 'height'), await css(status, 'overflow-x'), await css(status, 'clip-path')]).toEqual(['absolute', '1px', '1px', 'hidden', 'inset(50%)']);
    const marker = await resolveToken(page, T('marker-height-medium'));
    const time = all[2].locator('.tanrei-timeline-time');
    near((await box(time)).y - (await box(all[2])).y, (marker - (await px(time, 'line-height'))) / 2, 'the time is still the event’s first line', 0.05);
    near((await box(all[2].locator('.tanrei-timeline-title'))).y - (await box(time)).bottom, await resolveToken(page, T('time-gap')), 'the time gap', 0.05);
    near((await box(items(timeline(page, 'plan-icons')).nth(1).locator('.tanrei-timeline-time'))).y - (await box(items(timeline(page, 'plan-icons')).nth(1))).y, (marker - (await px(time, 'line-height'))) / 2, 'after a glyph too', 0.05);
    // Read: it is text of the item, before the time.
    await expect(all[2]).toHaveText('In progress, Wave 2Navigation and overlaysThe drawer, tabs, dialogs, menus and sheets.');
    if (browserName === 'chromium') expect((await tree(page, 'Roadmap'))[0][3].texts.filter((text) => text === 'Not started,').length).toBeGreaterThanOrEqual(1);
    // It follows the attributes, at once.
    await all[2].evaluate((li) => li.setAttribute('data-status-label', 'Under way'));
    await expect(status).toHaveText('Under way, ');
    await all[2].evaluate((li) => li.removeAttribute('data-status'));
    await expect(all[2].locator('.tanrei-timeline-status')).toHaveCount(0);
    // The product's own words as an element: nothing is written beside them, and nothing is reported.
    const seen = reports(page);
    await mount(page, OL(`<li data-status="done"><span class="tanrei-timeline-status" id="theirs">Finished, </span><p class="tanrei-timeline-time">Wave 0</p></li>`));
    await page.waitForTimeout(50);
    await expect(page.locator('.tanrei-timeline-status')).toHaveCount(1);
    await expect(page.locator('#theirs')).toHaveText('Finished, ');
    expect(seen.filter((line) => line.includes('TML-22'))).toEqual([]);
  });

  test('TML-13 a change of label, of a time, a title, a status, its words, a glyph or a body, and an event added, removed or moved, is drawn and exposed at once, without a motion, and announces nothing and scrolls nowhere', async ({ page, browserName }) => {
    await mountSpec(page, ['plan']);
    const list = timeline(page, 'plan');
    const first = items(list).first();
    await expect(items(list).nth(2)).toHaveAttribute('aria-current', 'true');
    const before = await box(first.locator('.tanrei-timeline-title'));
    await list.evaluate((ol) => {
      ol.setAttribute('aria-label', 'Another name');
      ol.querySelector('.tanrei-timeline-time')!.textContent = 'Wave zero';
      ol.querySelector('.tanrei-timeline-title')!.textContent = 'Foundations, and why they came first, in a title long enough to wrap onto a second line';
      ol.querySelector('li > p:last-child')!.textContent = 'A body of one line.';
    });
    await expect(page.getByRole('list', { name: 'Another name' })).toHaveCount(1);
    await expect(first.locator('.tanrei-timeline-time')).toHaveText('Wave zero');
    expect((await box(first.locator('.tanrei-timeline-title'))).height).toBeGreaterThan(before.height);
    await expect(first.locator('p').last()).toHaveText('A body of one line.');
    // A status and its words: the marker and what is read change with the attributes, in the same frame.
    await first.evaluate((li) => { li.setAttribute('data-status', 'upcoming'); li.setAttribute('data-status-label', 'Planned'); });
    expect((await css(first, 'content', '::before')).replace(/" ", "$/, ', "')).toBe('"​" / "Planned, "');
    await first.evaluate((li) => li.removeAttribute('data-status'));
    expect([await css(first, 'content', '::before'), await px(first, 'width', '::before')]).toEqual(['""', await resolveToken(page, T('marker-dot-size'))]);
    // The current item follows the statuses.
    // (The words are the product's and stay as they were written: only the statuses are changed here.)
    await items(list).nth(2).evaluate((li) => li.setAttribute('data-status', 'done'));
    await expect(list.locator('> li[aria-current]')).toHaveCount(0);
    await items(list).nth(3).evaluate((li) => li.setAttribute('data-status', 'current'));
    await expect(items(list).nth(3)).toHaveAttribute('aria-current', 'true');
    // A glyph given and taken away.
    await first.evaluate((li) => li.insertAdjacentHTML('afterbegin', '<span class="tanrei-timeline-marker tanrei-icon" aria-hidden="true">flag</span>'));
    expect(await css(first, 'content', '::before')).toBe('none');
    near((await box(first.locator('.tanrei-timeline-marker'))).width, await resolveToken(page, T('marker-height-medium')), 'the ring', 0.05);
    await first.evaluate((li) => li.querySelector('.tanrei-timeline-marker')!.remove());
    expect(await css(first, 'content', '::before')).toBe('""');
    // Added, removed, moved: the list and its connectors follow, and the order is the document's.
    await list.evaluate((ol) => ol.append(Object.assign(document.createElement('li'), { innerHTML: '<p class="tanrei-timeline-title">Wave 4</p>' })));
    await expect(page.getByRole('list', { name: 'Another name' }).getByRole('listitem')).toHaveCount(5);
    expect([await css(items(list).nth(3), 'content', '::after'), await css(items(list).nth(4), 'content', '::after')]).toEqual(['""', 'none']);
    await list.evaluate((ol) => ol.prepend(ol.lastElementChild!));
    expect(await items(list).first().textContent()).toBe('Wave 4');
    expect(await css(items(list).first(), 'content', '::after')).toBe('""');
    await list.evaluate((ol) => ol.firstElementChild!.remove());
    await expect(page.getByRole('list', { name: 'Another name' }).getByRole('listitem')).toHaveCount(4);
    await expect(items(list).nth(3)).toHaveAttribute('aria-current', 'true');
    if (browserName === 'chromium') expect((await tree(page, 'Another name'))[0].map((item) => item.texts[0])).toEqual(['Wave zero', 'Done,', 'In progress,', 'Not started,']);
    // Without a motion.
    await mountSpec(page, ['plan', 'plan-icons']);
    for (const id of ['plan', 'plan-icons']) {
      for (const item of await items(timeline(page, id)).all()) {
        for (const target of [item, ...(await item.locator(':scope > *').all())]) expect([await css(target, 'transition-duration'), await css(target, 'animation-name')], id).toEqual(['0s', 'none']);
        for (const pseudo of ['::before', '::after']) expect([await css(item, 'transition-duration', pseudo), await css(item, 'animation-name', pseudo)]).toEqual(['0s', 'none']);
      }
    }
    // Nothing announces and nothing scrolls: no live region on or in the timeline, and the script asks for neither.
    expect(await timeline(page, 'plan').evaluate((ol) => !!ol.closest('[aria-live], [role=status], [role=alert]') || !!ol.querySelector('[aria-live], [role=status], [role=alert]'))).toBe(false);
    expect(read('src/timeline.ts')).not.toMatch(/aria-live|role=|scrollIntoView|scrollTo|focus\(/);
  });
});

test.describe('scaling, forced colors, direction', () => {
  test('TML-14 with the text enlarged each time, title and body grows; every marker’s box, the dot and the glyph are their tokens, each still centred on its first line, and the gaps are theirs; everything wraps, nothing has a fixed height, raised text spacing loses nothing, and 320 wide at 200 % needs no sideways scrolling', async ({ page }) => {
    const measure = async (enlarged: boolean) => {
      await mountSpec(page, ['dated', 'plan-icons']);
      if (enlarged) await page.addStyleTag({ content: 'html { font-size: 200%; }' });
      await page.evaluate(() => document.fonts.ready);
      const item = items(timeline(page, 'dated')).first();
      return {
        time: await px(item.locator('.tanrei-timeline-time'), 'font-size'),
        title: await px(item.locator('.tanrei-timeline-title'), 'font-size'),
        body: await px(item.locator('p').last(), 'font-size'),
        dot: await px(item, 'width', '::before'),
        glyph: await px(items(timeline(page, 'plan-icons')).first().locator('.tanrei-timeline-marker'), 'font-size'),
        ring: (await box(items(timeline(page, 'plan-icons')).first().locator('.tanrei-timeline-marker'))).width,
        tokens: { dot: await resolveToken(page, T('marker-dot-size')), glyph: await resolveToken(page, T('marker-icon-size')), ring: await resolveToken(page, T('marker-height-medium')) },
      };
    };
    const [rest, large] = [await measure(false), await measure(true)];
    for (const key of ['time', 'title', 'body'] as const) expect(large[key], key).toBe(rest[key] * 2);
    for (const key of ['dot', 'glyph', 'ring'] as const) near(large[key], large.tokens[key], `${key}: its token`, 0.05);

    // 320 wide, text at 200 %.
    await page.setViewportSize({ width: 320, height: 800 });
    await mountSpec(page, ['dated', 'plan', 'long-bodies', 'icons']);
    await page.addStyleTag({ content: 'html { font-size: 200%; } .stage { box-sizing: border-box; inline-size: 320px; padding: 16px 8px; } .stage > .tanrei-timeline { inline-size: auto; }' });
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const gaps = { marker: await resolveToken(page, T('marker-gap')), item: await resolveToken(page, T('item-gap-regular')), time: await resolveToken(page, T('time-gap')), title: await resolveToken(page, T('title-gap')), connector: await resolveToken(page, T('connector-gap')) };
    const side = await resolveToken(page, T('marker-height-medium'));
    for (const id of ['dated', 'plan', 'long-bodies', 'icons']) {
      const list = timeline(page, id);
      const outer = await box(list);
      expect(outer.right, id).toBeLessThanOrEqual(320);
      const all = await items(list).all();
      for (const [i, item] of all.entries()) {
        const here = await box(item);
        expect(await css(item, 'overflow-x')).toBe('visible');
        for (const block of await item.locator(':scope > :not(.tanrei-timeline-marker)').all()) {
          expect(await block.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${id}: no word is cut`).toBe(true);
          expect((await box(block)).right).toBeLessThanOrEqual(outer.right + 0.5);
        }
        // The marker's box is the token's, at the start, centred on the event's first line (the line is now the taller).
        const marker = await markerBox(item);
        const line = await firstLine(item);
        near(marker.y + side / 2, line.y + line.height / 2, `${id} ${i}: centred on the first line`, 1.5);
        expect(marker.y).toBeGreaterThanOrEqual(here.y - 0.05);
        near((await content(item)).left, outer.x + side + gaps.marker, `${id} ${i}: the marker gap`, 0.05);
        const time = item.locator('.tanrei-timeline-time');
        if (await time.count()) near((await box(time.locator('xpath=following-sibling::*[1]'))).y - (await box(time)).bottom, gaps.time, `${id} ${i}: the time gap`, 0.05);
        const title = item.locator('.tanrei-timeline-title');
        if ((await title.count()) && (await title.locator('xpath=following-sibling::*[1]').count())) near((await box(title.locator('xpath=following-sibling::*[1]'))).y - (await box(title)).bottom, gaps.title, `${id} ${i}: the title gap`, 0.05);
        if (i === all.length - 1) continue;
        near((await box(all[i + 1])).y - here.bottom, gaps.item, `${id} ${i}: the item gap`, 0.05);
        near(here.y + (await px(item, 'top', '::after')), marker.bottom + gaps.connector, `${id} ${i}: the connector gap`, 0.05);
      }
    }
    // The reader's own text spacing (WCAG 1.4.12): nothing is cut and nothing has a fixed height.
    await mountSpec(page, ['dated', 'long-bodies']);
    const heights = await page.locator('.tanrei-timeline > li').evaluateAll((all) => all.map((li) => li.getBoundingClientRect().height));
    await page.addStyleTag({ content: '.tanrei-timeline * { line-height: 1.5em !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } .tanrei-timeline p { margin-block-end: 2em !important; }' });
    const spaced = await page.locator('.tanrei-timeline > li').evaluateAll((all) => all.map((li) => ({ height: li.getBoundingClientRect().height, inside: [...li.children].every((child) => child.getBoundingClientRect().bottom <= li.getBoundingClientRect().bottom + 0.5 && child.scrollWidth <= child.clientWidth + 1), clipped: getComputedStyle(li).overflow !== 'visible' })));
    for (const [i, event] of spaced.entries()) {
      expect(event.height).toBeGreaterThan(heights[i]);
      expect([event.inside, event.clipped]).toEqual([true, false]);
    }
  });

  test('TML-15 a timeline inside an event’s body is drawn as a timeline of its own in the body’s width, and is reported', async ({ page }) => {
    const seen = reports(page);
    await mount(page, OL(`<li><p class="tanrei-timeline-title">Outer</p>${OL(EVENT('Inner one', 'data-status="done" data-status-label="Done"') + EVENT('Inner two'), 'id="inner" data-size="large"')}</li>${EVENT('Next')}`, 'id="outer"'));
    const [outer, inner] = [page.locator('#outer'), page.locator('#inner')];
    const edge = (await box(outer)).x + (await resolveToken(page, T('marker-height-medium'))) + (await resolveToken(page, T('marker-gap')));
    near((await box(inner)).x, edge, 'from the body’s start edge', 0.05);
    near((await box(inner)).right, (await box(outer)).right, 'the body’s width', 0.05);
    // Its own markers, column, size and connector.
    const one = items(inner).first();
    near(await px(one, 'padding-left'), (await resolveToken(page, T('marker-height-large'))) + (await resolveToken(page, T('marker-gap'))), 'its own marker column, of its own size', 0.05);
    expect(await css(one, 'content', '::before')).toContain('check');
    expect([await css(one, 'content', '::after'), await css(items(inner).nth(1), 'content', '::after')]).toEqual(['""', 'none']);
    expect(await px(one.locator('.tanrei-timeline-title'), 'font-size')).toBe(await resolveToken(page, T('title-typescale-large-font-size')));
    near((await box(inner)).y - (await box(outer.locator(':scope > li > .tanrei-timeline-title').first())).bottom, await resolveToken(page, T('title-gap')), 'a block of the body', 0.05);
    await expect.poll(() => seen.filter((line) => line.includes('TML-15')).length).toBe(1);
    expect(seen.find((line) => line.includes('TML-15'))).toContain('inside an event');
  });

  test('TML-16 while the platform forces its colors every dot, ring, glyph and connector is its text color at their own sizes, the marker of the event under way a disc of that color with its mark in the background’s, and each time, title and body the text color; the three statuses still differ by shape', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountSpec(page);
    const system = (name: string) => page.evaluate((value) => { const probe = document.createElement('i'); probe.style.cssText = `color: ${value}; forced-color-adjust: none`; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, name);
    const [canvasText, canvas] = [await system('CanvasText'), await system('Canvas')];
    // The media query alone is not the mode: WebKit answers it under emulation and repaints nothing (see link.test.ts).
    const forced = await page.evaluate(() => { const probe = document.createElement('div'); probe.style.color = 'rgb(1, 2, 3)'; document.body.appendChild(probe); const repainted = getComputedStyle(probe).color !== 'rgb(1, 2, 3)'; probe.remove(); return repainted; });
    if (!forced) test.info().annotations.push({ type: 'forced-colors', description: 'the mode is not emulated by this browser: the stylesheet’s rule is read, the repaint of the text is not' });
    const [dot, ring, width, thickness] = [await resolveToken(page, T('marker-dot-size')), await resolveToken(page, T('marker-height-medium')), await resolveToken(page, T('marker-outline-width')), await resolveToken(page, T('connector-thickness'))];
    for (const f of spec.fixtures) {
      const large = f.props.size === 'large';
      const all = await items(timeline(page, f.id)).all();
      for (const [i, item] of all.entries()) {
        const status = (await item.getAttribute('data-status')) ?? 'none';
        const glyph = item.locator('.tanrei-timeline-marker');
        if (await glyph.count()) {
          expect(await css(glyph, 'border-top-color'), f.id).toBe(status === 'current' ? await css(glyph, 'border-top-color') : canvasText);
          expect([await css(glyph, 'color'), await css(glyph, 'background-color')], f.id).toEqual(status === 'current' ? [canvas, canvasText] : [canvasText, await css(glyph, 'background-color')]);
          if (status !== 'current') expect(rgba(await css(glyph, 'background-color'))[3]).toBe(0);
          expect(await px(glyph, 'border-top-width')).toBe(width);
        } else if (status === 'none') {
          expect([await css(item, 'background-color', '::before'), await px(item, 'width', '::before')], f.id).toEqual([canvasText, dot]);
        } else if (status === 'current') {
          const image = await css(item, 'background-image', '::before');
          expect(image, f.id).toContain('radial-gradient');
          // The disc is the text color, its mark the background's — the gradient names the platform's two colors.
          expect(image.toLowerCase().replaceAll(/\s+/g, ' '), f.id).toMatch(new RegExp(`${canvas.replaceAll(/[()]/g, '\\$&')}|canvas `));
          expect(image.toLowerCase(), f.id).toMatch(new RegExp(`${canvasText.replaceAll(/[()]/g, '\\$&')}|canvastext`));
          if (!large) expect(await px(item, 'width', '::before')).toBe(ring);
        } else {
          expect([await css(item, 'border-top-color', '::before'), await px(item, 'border-top-width', '::before')], f.id).toEqual([canvasText, width]);
          if (status === 'done') expect(await css(item, 'color', '::before'), f.id).toBe(canvasText);
        }
        if (forced) for (const part of await item.locator(':scope > :not(.tanrei-timeline-marker)').all()) expect(await css(part, 'color'), f.id).toBe(canvasText);
        if (i === all.length - 1) continue;
        const side = (await css(item, 'direction')) === 'rtl' ? 'right' : 'left';
        expect([await css(item, `border-${side}-color`, '::after'), await px(item, `border-${side}-width`, '::after')], f.id).toEqual([canvasText, thickness]);
      }
    }
    // The verify, painted: CanvasText rings, a CanvasText disc with a Canvas dot, CanvasText connectors — three shapes.
    if (forced) {
      const all = await items(timeline(page, 'plan')).all();
      const shots = await Promise.all(all.map(async (item) => pixels(page, await markerBox(item))));
      const [ink, paper] = [rgb(canvasText), rgb(canvas)];
      expect([shots[2].at(12, 12), shots[2].at(4, 12), shots[2].at(12, 20)]).toEqual([paper, ink, ink]);
      expect(shots[3].at(12, 12)).toBe(paper);
      // (The top of a ring is the curve's edge: ink, softened where the curve leaves the pixel.)
      expect([shots[3].at(12, 0), shots[0].at(12, 0)].every((c) => c !== paper)).toBe(true);
      const count = (shot: (typeof shots)[number]) => { let n = 0; for (let y = 6; y < 18; y++) for (let x = 6; x < 18; x++) if (shot.at(x, y) !== paper) n++; return n; };
      expect(count(shots[0])).toBeGreaterThan(8);
      expect(count(shots[3])).toBe(0);
      expect(new Set(shots.slice(1).map((shot) => Buffer.from(shot.data).toString('base64'))).size).toBe(3);
      // With the product's glyph the event under way is the same disc, its glyph in the background's color: the disc
      // is the text color around the glyph (no plate of the mode's behind it), and the glyph is drawn on it.
      const truck = await pixels(page, await markerBox(items(timeline(page, 'plan-icons')).nth(1)));
      expect([truck.at(12, 2), truck.at(2, 12), truck.at(21, 12), truck.at(12, 21)]).toEqual([ink, ink, ink, ink]);
      let light = 0;
      for (let y = 4; y < 20; y++) for (let x = 4; x < 20; x++) if (truck.at(x, y) !== ink) light++;
      expect(light, 'the glyph is drawn on the disc').toBeGreaterThan(8);
      expect(light, 'and is a glyph, not a plate').toBeLessThan(140);
      const first = await box(all[0]);
      const line = await pixels(page, { x: first.x, y: first.y + (await px(all[0], 'top', '::after')) + 2, width: 24, height: 1, right: 0, bottom: 0 });
      expect([1, 2]).toContain(Array.from({ length: 24 }, (_, x) => line.at(x, 0)).filter((c) => c !== paper).length);
    }
    await page.emulateMedia({ forcedColors: 'none' });
  });

  test('TML-17 right to left the marker column and the connectors are at the right and each event’s content at its left, from one edge to the timeline’s left edge', async ({ page }) => {
    await mountSpec(page, ['dated-rtl', 'plan-rtl', 'ltr-times-rtl']);
    const [side, gap, thickness] = [await resolveToken(page, T('marker-height-medium')), await resolveToken(page, T('marker-gap')), await resolveToken(page, T('connector-thickness'))];
    for (const id of ['dated-rtl', 'plan-rtl', 'ltr-times-rtl']) {
      const list = timeline(page, id);
      const outer = await box(list);
      expect(await css(list, 'direction')).toBe('rtl');
      const all = await items(list).all();
      for (const [i, item] of all.entries()) {
        const here = await box(item);
        expect([await px(item, 'padding-right'), await px(item, 'padding-left')], id).toEqual([side + gap, 0]);
        const inside = await content(item);
        near(inside.right, outer.right - side - gap, `${id} ${i}: the content begins at one edge`, 0.05);
        near(inside.left, outer.x, `${id} ${i}: and runs to the left edge`, 0.05);
        // The marker: in the column at the right, whatever draws it.
        const glyph = item.locator('.tanrei-timeline-marker');
        const drawn = (await glyph.count()) ? await box(glyph) : await generatedBox(item);
        near(drawn.x + drawn.width / 2, outer.right - side / 2, `${id} ${i}: the marker in the column at the right`, 0.05);
        if (i === all.length - 1) continue;
        near(here.right - (await px(item, 'right', '::after')) - thickness / 2, outer.right - side / 2, `${id} ${i}: the connector on the column's centre line`, 0.05);
        expect(await px(item, 'border-right-width', '::after')).toBe(thickness);
      }
    }
    // The same events left to right are the mirror image, box for box.
    const boxes = async () => timeline(page, 'plan-rtl').evaluate((ol) => { const o = ol.getBoundingClientRect(); return [...ol.querySelectorAll('li, li > *')].map((el) => { const r = el.getBoundingClientRect(); return [Math.round((r.left - o.left) * 8), Math.round((o.right - r.right) * 8), Math.round((r.top - o.top) * 8), Math.round(r.width * 8), Math.round(r.height * 8)]; }); });
    const rtl = await boxes();
    await stage(page, 'plan-rtl').evaluate((el) => el.setAttribute('dir', 'ltr'));
    expect((await boxes()).map(([left, right, ...rest]) => [right, left, ...rest])).toEqual(rtl);
  });

  test('TML-18 the direction is an ancestor’s inside the page, not a setting of the timeline; a change while it is shown is drawn at once, keeping what it shows', async ({ page }) => {
    await mountSpec(page, ['plan-icons']);
    const list = timeline(page, 'plan-icons');
    const holder = stage(page, 'plan-icons');
    expect(await page.locator('html').getAttribute('dir')).toBeNull();
    expect(await list.evaluate((ol) => [ol.hasAttribute('dir'), [...ol.querySelectorAll('*')].some((el) => el.hasAttribute('dir'))])).toEqual([false, false]);
    const side = await resolveToken(page, T('marker-height-medium'));
    const second = items(list).nth(1);
    const glyph = second.locator('.tanrei-timeline-marker');
    near((await box(glyph)).x, (await box(list)).x, 'left to right: the marker at the left', 0.05);
    const text = await list.evaluate((ol) => (ol as HTMLElement).innerText);
    await holder.evaluate((el) => el.setAttribute('dir', 'rtl'));
    near((await box(glyph)).right, (await box(list)).right, 'right to left: the marker at the right', 0.05);
    near((await content(second)).right, (await box(list)).right - side - (await resolveToken(page, T('marker-gap'))), 'the content beside it', 0.05);
    expect(await css(second.locator('.tanrei-timeline-title'), 'text-align')).toBe('right');
    expect([await css(second, 'transition-duration'), await css(glyph, 'transition-duration')]).toEqual(['0s', '0s']);
    expect(await list.evaluate((ol) => (ol as HTMLElement).innerText)).toBe(text);
    await expect(second).toHaveAttribute('aria-current', 'true');
    await holder.evaluate((el) => el.removeAttribute('dir'));
    near((await box(glyph)).x, (await box(list)).x, 'and back', 0.05);
    // The document's own direction where no ancestor sets one.
    await mountSpec(page, ['plan'], { dir: 'rtl' });
    const first = items(timeline(page, 'plan')).first();
    near((await generatedBox(first)).right, (await box(timeline(page, 'plan'))).right, 'the page’s direction', 0.05);
    expect(read('src/styles/timeline.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/(^|\s)direction:/);
  });

  test('TML-19 right to left a marker’s glyph is drawn mirrored exactly when the icon set marks its name or the product forces it, and unmirrored when the product forbids it — in its own box, its place, size and color unchanged; the dot, the ring and the check are never mirrored', async ({ page }) => {
    await mountSpec(page, ['plan-rtl', 'plan-icons']);
    const mirrored = (target: Locator, pseudo?: string) => css(target, 'transform', pseudo).then((value) => /^matrix\(-1, 0, 0, 1, 0, 0\)$/.test(value));
    // plan-rtl: arrow_forward is a name the icon set mirrors.
    const arrow = items(timeline(page, 'plan-rtl')).nth(1).locator('.tanrei-timeline-marker');
    await expect(arrow).toHaveAttribute('data-tanrei-mirrored', '');
    expect(await mirrored(arrow)).toBe(true);
    const place = await box(arrow);
    const look = [await css(arrow, 'font-size'), await css(arrow, 'color'), await css(arrow, 'font-variation-settings')];
    // The product forbids it for this use: unmirrored, in the same place, at the same size and color.
    await arrow.evaluate((el) => el.setAttribute('data-mirror', 'never'));
    expect(await mirrored(arrow)).toBe(false);
    expect(await box(arrow)).toEqual(place);
    expect([await css(arrow, 'font-size'), await css(arrow, 'color'), await css(arrow, 'font-variation-settings')]).toEqual(look);
    await arrow.evaluate((el) => el.removeAttribute('data-mirror'));
    expect(await mirrored(arrow)).toBe(true);
    // Left to right nothing is mirrored, whatever the name; right to left exactly the names the set marks.
    const glyphs = await items(timeline(page, 'plan-icons')).locator('.tanrei-timeline-marker').all();
    for (const glyph of glyphs) expect(await mirrored(glyph)).toBe(false);
    await stage(page, 'plan-icons').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await Promise.all(glyphs.map((glyph) => mirrored(glyph)))).toEqual([true, true, false]);
    // A name the set does not mark, forced by the product.
    await glyphs[2].evaluate((el) => el.setAttribute('data-mirror', 'always'));
    expect(await mirrored(glyphs[2])).toBe(true);
    // The timeline mirrors nothing itself: its stylesheet and its script name no transform, and the generated boxes — the
    // dot, the ring, the check — have none in a right-to-left layout.
    expect(read('src/styles/timeline.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/(^|[\s;{])(transform|scale|rotate):/);
    expect(read('src/timeline.ts')).not.toMatch(/mirror/i);
    for (const item of await items(timeline(page, 'plan-rtl')).all()) expect(await css(item, 'transform', '::before')).toBe('none');
    expect(await css(items(timeline(page, 'plan-rtl')).first(), 'content', '::before')).toContain('check');
  });

  test('TML-20 a time and a title given as text are each text of their own direction, isolated: a date in digits and a version keep their order in a right-to-left layout and are still placed and aligned by the layout; the body’s direction is its content’s', async ({ page }) => {
    await mountSpec(page, ['ltr-times-rtl', 'dated-rtl', 'dated']);
    const list = timeline(page, 'ltr-times-rtl');
    const edge = (await box(list)).right - (await resolveToken(page, T('marker-height-medium'))) - (await resolveToken(page, T('marker-gap')));
    for (const item of await items(list).all()) {
      for (const part of [item.locator('.tanrei-timeline-time'), item.locator('.tanrei-timeline-title')]) {
        expect([await css(part, 'unicode-bidi'), await css(part, 'text-align')]).toEqual(['plaintext', 'right']);
        // The verify: drawn in its own order, at the right edge of the content column.
        const glyphs = await part.evaluate((el) => { const node = el.firstChild!; const at = (i: number) => { const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1); return range.getBoundingClientRect().left; }; return [at(0), at(node.textContent!.length - 1)]; });
        expect(glyphs[0], 'the first character is at the left of the last').toBeLessThan(glyphs[1]);
        near((await firstLine(part)).right, edge, 'at the right edge of the content column', 0.6);
      }
      // The body beside them is Arabic, right to left, aligned to the same edge.
      const body = item.locator('p').last();
      expect(await css(body, 'direction')).toBe('rtl');
      near((await firstLine(body)).right, edge, 'the body at the same edge', 0.6);
    }
    // "v0.2.0" is read as written, not as "0.2.0v".
    await expect(items(list).first().locator('.tanrei-timeline-title')).toHaveText('v0.2.0');
    // Arabic times and titles in a right-to-left layout: right to left, at the right.
    const arabic = items(timeline(page, 'dated-rtl')).first();
    for (const part of [arabic.locator('.tanrei-timeline-time'), arabic.locator('.tanrei-timeline-title')]) {
      expect(await css(part, 'text-align')).toBe('right');
      near((await firstLine(part)).right, (await box(timeline(page, 'dated-rtl'))).right - 36, 'at the right', 0.6);
    }
    // And the reverse: an Arabic title in a left-to-right layout is laid out right to left, and still placed at the left.
    await mount(page, OL(`<li><p class="tanrei-timeline-time" id="time">١٩ سبتمبر ٢٠٢٦</p><p class="tanrei-timeline-title" id="title">بدء التطوير.</p><p id="body">Body.</p></li>`));
    for (const id of ['#time', '#title']) {
      expect([await css(page.locator(id), 'unicode-bidi'), await css(page.locator(id), 'text-align')]).toEqual(['plaintext', 'left']);
      near((await firstLine(page.locator(id))).x, (await box(page.locator('.tanrei-timeline'))).x + 36, `${id}: placed by the layout`, 0.6);
    }
    // (The full stop of the Arabic title is at its left end: the title's own direction is right to left.)
    expect(await page.locator('#title').evaluate((el) => { const node = el.firstChild!; const range = document.createRange(); range.setStart(node, node.textContent!.length - 1); range.setEnd(node, node.textContent!.length); return range.getBoundingClientRect().left - el.getBoundingClientRect().left; })).toBeLessThan(2);
    expect(await css(page.locator('#body'), 'unicode-bidi')).not.toBe('plaintext');
  });
});

test.describe('what is not valid', () => {
  test('TML-21 a size or a density the system does not have is drawn with the default’s tokens, a status the spec does not have as no status, and each is reported; a value the active design system defines is not', async ({ page }) => {
    const seen = reports(page);
    await mount(page, `${OL(EVENT('A', '', '<p>Body.</p>') + EVENT('B', 'data-status="failed" data-status-label="Failed"'), 'id="odd" data-size="huge" data-density="tight"')}${OL(EVENT('A', '', '<p>Body.</p>') + EVENT('B'), 'id="plain"')}`);
    const [odd, plain] = [page.locator('#odd'), page.locator('#plain')];
    const look = (list: Locator) => list.evaluate((ol) => [...ol.querySelectorAll(':scope > li')].map((li) => { const r = li.getBoundingClientRect(); const b = getComputedStyle(li, '::before'); return [r.width, r.height, r.top - ol.getBoundingClientRect().top, getComputedStyle(li).padding, b.width, b.height, b.content, b.borderTopWidth, b.backgroundColor, ...[...li.children].map((c) => getComputedStyle(c).font)].join(' | '); }));
    expect(await look(odd)).toEqual(await look(plain));
    near(await px(items(odd).first(), 'padding-left'), (await resolveToken(page, T('marker-height-medium'))) + (await resolveToken(page, T('marker-gap'))), 'medium', 0.05);
    near((await box(items(odd).nth(1))).y - (await box(items(odd).first())).bottom, await resolveToken(page, T('item-gap-regular')), 'regular', 0.05);
    // The unknown status: a dot, no words.
    expect([await css(items(odd).nth(1), 'content', '::before'), await px(items(odd).nth(1), 'width', '::before')]).toEqual(['""', await resolveToken(page, T('marker-dot-size'))]);
    await expect(items(odd).nth(1)).not.toHaveAttribute('aria-current');
    await expect.poll(() => seen.filter((line) => line.includes('TML-21')).length).toBe(3);
    expect(seen.some((line) => line.includes('data-size "huge"') && line.includes('drawn as "medium"'))).toBe(true);
    expect(seen.some((line) => line.includes('data-density "tight"') && line.includes('drawn as "regular"'))).toBe(true);
    expect(seen.some((line) => line.includes('data-status "failed"'))).toBe(true);
    // The spec's own values, `none` among them, and a value a design system defines by its tokens are not reported.
    const again = reports(page);
    await mount(page, `<style>:root { ${T('marker-height-small')}: 20px; ${T('item-gap-loose')}: 24px; }</style>${OL(EVENT('A', 'data-status="none"') + EVENT('B', 'data-status="done" data-status-label="Done"'), 'data-size="small" data-density="loose"')}${OL(EVENT('A'), 'data-size="large" data-density="compact"')}${OL(EVENT('A'), 'data-size="medium" data-density="regular"')}`);
    await page.waitForTimeout(100);
    expect(again.filter((line) => line.includes('TML-21'))).toEqual([]);
  });

  test('TML-22 a timeline with no event draws nothing, takes no room, exposes nothing and is reported; an event with neither a time, a title nor a body still draws its marker and is counted, and is reported; a status without its words is drawn and reported, and words without a status are ignored and reported', async ({ page }) => {
    const seen = reports(page);
    await mount(page, `<p id="before" style="margin:0">Before.</p>${OL('', 'id="empty" aria-label="Nothing"')}<p id="after" style="margin:0">After.</p>${OL(`${EVENT('One')}<li></li><li><span class="tanrei-timeline-marker tanrei-icon" aria-hidden="true">flag</span></li>${EVENT('Four', 'data-status="done"')}${EVENT('Five', 'data-status-label="Done"')}`, 'id="gap" aria-label="A gap"')}`);
    const empty = page.locator('#empty');
    expect(await css(empty, 'display')).toBe('none');
    near((await box(page.locator('#after'))).y, (await box(page.locator('#before'))).bottom, 'no room', 0.05);
    await expect(page.getByRole('list', { name: 'Nothing' })).toHaveCount(0);
    // The empty events: their markers, their connectors, their place in the list.
    const list = page.locator('#gap');
    await expect(page.getByRole('list', { name: 'A gap' }).getByRole('listitem')).toHaveCount(5);
    const side = await resolveToken(page, T('marker-height-medium'));
    const hollow = items(list).nth(1);
    near((await box(hollow)).height, side, 'as high as its marker’s box', 0.05);
    expect([await css(hollow, 'content', '::before'), await px(hollow, 'width', '::before'), await css(hollow, 'content', '::after')]).toEqual(['""', await resolveToken(page, T('marker-dot-size')), '""']);
    near((await box(items(list).nth(2))).height, side, 'with a glyph alone too', 0.05);
    near((await box(items(list).nth(2).locator('.tanrei-timeline-marker'))).height, side, 'its ring is drawn', 0.05);
    // A status without words is still drawn — the ring and its check — with nothing to read; words without a status draw a dot.
    expect(await css(items(list).nth(3), 'content', '::before')).toMatch(/^"check" \/ ""$/);
    expect(await px(items(list).nth(3), 'border-top-width', '::before')).toBe(await resolveToken(page, T('marker-outline-width')));
    expect(await css(items(list).nth(4), 'content', '::before')).toBe('""');
    await expect.poll(() => seen.filter((line) => line.includes('TML-22')).length).toBe(5);
    expect(seen.some((line) => line.includes('holds no event'))).toBe(true);
    expect(seen.filter((line) => line.includes('neither a time, a title nor a body'))).toHaveLength(2);
    expect(seen.some((line) => line.includes('status "done" is not given in words'))).toBe(true);
    expect(seen.some((line) => line.includes('data-status-label "Done" is ignored'))).toBe(true);
    // An event added to the empty timeline draws it.
    await empty.evaluate((ol) => ol.append(Object.assign(document.createElement('li'), { innerHTML: '<p class="tanrei-timeline-title">Now an event.</p>' })));
    expect(await css(empty, 'display')).toBe('block');
    await expect(page.getByRole('list', { name: 'Nothing' }).getByRole('listitem')).toHaveCount(1);
  });
});

test.describe('without the script', () => {
  test('the stylesheet alone draws every fixture: with scripting off the layout is the same box for box, the list is the document’s own ordered list with its time elements, and the status is still in words; only the current item is the script’s (TML-12)', async ({ page, browser, browserName }) => {
    const document = (await fixturesDocument(spec, { icons: true })).replace(/<script type="module">[\s\S]*<\/script>/, '');
    await mountSpec(page);
    const context = await browser.newContext({ javaScriptEnabled: false, deviceScaleFactor: 2 });
    const off = await context.newPage();
    await off.setContent(document);
    await off.waitForFunction(() => document.fonts.status === 'loaded').catch(() => {});
    const own = async (p: P) => {
      const rows: string[] = [];
      for (const f of spec.fixtures) rows.push(...(await p.locator(`[data-fixture="${f.id}"]`).evaluate((holder) => { const origin = holder.getBoundingClientRect(); return [...holder.querySelectorAll('.tanrei-timeline, .tanrei-timeline > li, .tanrei-timeline > li > *')].map((el) => { const r = el.getBoundingClientRect(); const [before, after] = [getComputedStyle(el, '::before'), getComputedStyle(el, '::after')]; return [el.localName, Math.round((r.left - origin.left) * 8), Math.round((r.top - origin.top) * 8), Math.round(r.width * 8), Math.round(r.height * 8), before.width, before.height, before.top, after.top, after.bottom].join(' '); }); })));
      return rows;
    };
    const [on, bare] = [await own(page), await own(off)];
    expect(bare.length).toBeGreaterThan(140);
    expect(bare).toEqual(on);
    // Nothing is written into the product's list by the script where the stylesheet's way is read: the markup is the same but for the current item.
    const markup = (p: P) => p.locator('.stage').evaluateAll((all) => all.map((holder) => holder.innerHTML.replaceAll(' aria-current="true"', '').replaceAll(' data-tanrei-mirrored=""', '')));
    expect(await markup(off)).toEqual(await markup(page));
    await expect(off.locator('[aria-current]')).toHaveCount(0);
    await expect(off.getByRole('list', { name: 'Roadmap' }).first().getByRole('listitem')).toHaveCount(4);
    expect(await off.locator('[data-fixture="dated"] ol').evaluate((ol) => [ol.localName, ol.children.length, ol.querySelectorAll('time[datetime]').length])).toEqual(['ol', 3, 3]);
    expect((await off.locator('[data-fixture="plan"] li').nth(2).evaluate((li) => getComputedStyle(li, '::before').content)).replace(/" ", "$/, ', "')).toBe('"​" / "In progress, "');
    if (browserName === 'chromium') expect((await tree(off, 'Roadmap'))[0].map((item) => item.texts[0])).toEqual(['Done,', 'Done,', 'In progress,', 'Not started,']);
    await context.close();
  });
});

test.describe('fixtures', () => {
  test('all 14 fixtures are mounted and visible, each an ordered list with the class alone on its stage, 400 wide, and the review gallery draws the same document', async ({ page }) => {
    expect(spec.fixtures).toHaveLength(14);
    await mountSpec(page);
    await expect(page.locator('.stage > ol.tanrei-timeline[role="list"]')).toHaveCount(14);
    for (const f of spec.fixtures) {
      const list = timeline(page, f.id);
      await expect(list, f.id).toHaveCount(1);
      await expect(list, f.id).toBeVisible();
      expect((await box(list)).width, f.id).toBe(400);
      expect((await box(list)).height, f.id).toBeGreaterThan(20);
      await expect(list, f.id).toHaveAttribute('aria-label', String(f.props.label));
      if (f.props.size === 'large') await expect(list).toHaveAttribute('data-size', 'large');
      if (f.props.density === 'compact') await expect(list).toHaveAttribute('data-density', 'compact');
      await expect(items(list), f.id).toHaveCount(f.items!.length);
      for (const [i, item] of f.items!.entries()) {
        const event = items(list).nth(i);
        if (item.props.status) await expect(event).toHaveAttribute('data-status', String(item.props.status));
        if (item.props.statusLabel) await expect(event).toHaveAttribute('data-status-label', String(item.props.statusLabel));
        if (item.props.icon) await expect(event.locator('> .tanrei-timeline-marker.tanrei-icon:first-child')).toHaveText(String(item.props.icon));
        if (item.props.datetime) await expect(event.locator('> time.tanrei-timeline-time')).toHaveAttribute('datetime', String(item.props.datetime));
        else if (item.props.time) await expect(event.locator('> p.tanrei-timeline-time')).toHaveText(String(item.props.time));
        if (item.props.title) await expect(event.locator('> p.tanrei-timeline-title')).toHaveText(String(item.props.title));
        if (item.content) await expect(event.locator('> p').last()).toHaveText(item.content);
      }
      if (f.direction === 'rtl') expect(await css(list, 'direction')).toBe('rtl');
    }
    const gallery = await fixturesDocument(spec, { icons: true, assets: { font: '/f.css', tokens: '/t.css', system: (id) => `/${id}.css`, icons: () => '/i.css', bundle: '/b.js' } });
    for (const f of spec.fixtures) expect(gallery, f.id).toContain(`data-fixture="${f.id}"`);
    expect(gallery.slice(gallery.indexOf('<body>')).match(/<ol class="tanrei-timeline" role="list"/g)).toHaveLength(14);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`accessibility: every fixture passes axe in ${theme}`, async ({ page }) => {
      await mountSpec(page, [], { theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, fixtures: [f] });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
