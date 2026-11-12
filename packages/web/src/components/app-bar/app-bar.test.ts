// <tanrei-app-bar>, driven by specs/app-bar.spec.json: every behaviour id (APB-1…34) is cited by a test title, every
// fixture has a baseline, and every length, color and duration is read back from the tokens — never from a number
// written here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, fixturesDocument, loadSpec, markMarkup, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { motionEnded } from '../../../test/motions.js';
import { expectBaseline } from '../../../test/baseline.js';

const spec = loadSpec('app-bar');
const dist = (file: string) => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../dist', file), 'utf8');
type P = Page;
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const bar = (page: P, id: string) => page.locator(`[data-fixture="${id}"] tanrei-app-bar`);
const inner = (page: P, id: string, selector: string) => bar(page, id).locator(selector);
const T = (name: string) => `--tanrei-comp-app-bar-${name}`;
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** A shadow as the browser computes it for a token (an elevation is a list of shadows). */
const resolveShadow = (page: P, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;box-shadow:var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).boxShadow;
    probe.remove();
    return value;
  }, name);

// Items as a fixture lists them: the navigation item and the actions are icon buttons.
const nav = (label: string, glyph: string): FixtureItem => ({ kind: 'navigation', props: { label }, content: glyph });
const act = (label: string, glyph: string): FixtureItem => ({ kind: 'action', props: { label }, content: glyph });
const fixture = (id: string, props: Fixture['props'], items: FixtureItem[] = []): Fixture => ({ id, props, items });
const BACK = nav('Back', 'arrow_back');
const SEARCH = act('Search', 'search');
const MORE = act('More options', 'more_vert');
const SHARE = act('Share', 'share');
/** An action whose overflow is never: the bar never takes it out of the top row, and the title gives way to it (APB-26). */
const keep = (item: FixtureItem): FixtureItem => ({ ...item, props: { ...item.props, overflow: 'never' } });

/** Which color, elevation and bottom edge a bar draws. */
const drawnCondition = (page: P, id: string) =>
  bar(page, id).evaluate((el) => {
    const root = el.shadowRoot!;
    const container = getComputedStyle(root.querySelector('.container')!);
    const outline = root.querySelector('.outline')!;
    return { color: container.backgroundColor, elevation: container.boxShadow, edge: getComputedStyle(outline).backgroundColor, edgeHeight: outline.getBoundingClientRect().height };
  });
/** What a condition draws; the edge is its own color under divider visibility scroll, the scrolled one's under always (APB-18). */
const expectedCondition = async (page: P, condition: 'flat' | 'scrolled', visibility: 'always' | 'scroll' = 'always') => ({
  color: await resolveColor(page, T(`${condition}-container-color`)),
  elevation: await resolveShadow(page, T(`${condition}-container-elevation`)),
  edge: await resolveColor(page, T(`${visibility === 'always' ? 'scrolled' : condition}-outline-color`)),
  edgeHeight: await resolveToken(page, T('outline-width')),
});

/** A page with a bar above a scrolling list, the bar connected to it by id. */
async function scrollPage(page: P, barAttributes: string, { rows = 60 }: { rows?: number } = {}) {
  await mountFixtures(page, spec, { icons: true, fixtures: [] });
  await page.evaluate(
    ([attributes, count]) => {
      const main = document.querySelector('main')!;
      main.innerHTML = `<div id="screen" style="display:flex;flex-direction:column;inline-size:360px;block-size:480px">
        <tanrei-app-bar ${attributes}>
          <tanrei-button variant="text" slot="navigation" label="Menu"><span slot="icon">menu</span></tanrei-button>
          <tanrei-button variant="text" slot="actions" label="Search"><span slot="icon">search</span></tanrei-button>
        </tanrei-app-bar>
        <div id="list" style="flex:1;overflow:auto">${Array.from({ length: count as number }, (_, i) => `<p style="margin:0;block-size:40px">Row ${i}</p>`).join('')}</div>
      </div>`;
    },
    [barAttributes, rows] as const,
  );
  await page.locator('#screen tanrei-app-bar').evaluate((el: any) => el.updateComplete);
}
const screenBar = (page: P) => page.locator('#screen tanrei-app-bar');
const scrollTo = async (page: P, top: number) => {
  await page.locator('#list').evaluate((el, t) => {
    el.scrollTop = t;
    el.dispatchEvent(new Event('scroll'));
  }, top);
  await screenBar(page).evaluate((el: any) => el.updateComplete);
};

test.describe('condition', () => {
  test('APB-1: while scrolled is false the bar fills with flat.container.color, raised by flat.container.elevation, its bottom edge outline.width thick — in scrolled.outline.color under always, in flat.outline.color under scroll', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const flat = await expectedCondition(page, 'flat');
    for (const f of spec.fixtures.filter((each) => !each.props.scrolled)) expect(await drawnCondition(page, f.id), f.id).toEqual(flat);
    await expect(bar(page, 'small')).not.toHaveAttribute('scrolled');
    // The default system's choice is always: the edge is drawn at rest, a visible line.
    expect(flat.edge).not.toBe('rgba(0, 0, 0, 0)');
    // Under scroll the flat condition's own edge (none in the default system).
    const scroll = spec.fixtures.filter((each) => !each.props.scrolled).map((f) => ({ ...f, id: `${f.id}-scroll`, props: { ...f.props, dividerVisibility: 'scroll' } }));
    await mountFixtures(page, spec, { icons: true, fixtures: scroll });
    const own = await expectedCondition(page, 'flat', 'scroll');
    for (const f of scroll) expect(await drawnCondition(page, f.id), f.id).toEqual(own);
  });

  test('APB-2: while scrolled is true the bar fills with scrolled.container.color, raised by scrolled.container.elevation, its bottom edge in scrolled.outline.color', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const scrolled = await expectedCondition(page, 'scrolled');
    for (const f of spec.fixtures.filter((each) => each.props.scrolled)) expect(await drawnCondition(page, f.id), f.id).toEqual(scrolled);
    // Under either divider visibility the scrolled edge is scrolled.outline.color (APB-18).
    expect(await expectedCondition(page, 'scrolled', 'scroll')).toEqual(scrolled);
    // Under scroll the two conditions differ visibly in the default system: the edge is what says content is under the bar.
    expect(scrolled.edge).not.toBe((await expectedCondition(page, 'flat', 'scroll')).edge);
    // The edge is inside the bar: it does not change the bar's height.
    const [flatBar, scrolledBar] = [await bounds(bar(page, 'small')), await bounds(bar(page, 'small-scrolled'))];
    expect(scrolledBar.height).toBe(flatBar.height);
    const [edge, own] = [await bounds(inner(page, 'small-scrolled', '.outline')), scrolledBar];
    expect(edge.y + edge.height).toBe(own.y + own.height);
    expect([edge.x, edge.width]).toEqual([own.x, own.width]);
  });

  test('APB-3: a change of scrolled moves color, elevation and edge over motion.condition-duration with motion.condition-easing; at once where motion is reduced; under always the edge does not change', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('bar', { title: 'Inbox', dividerVisibility: 'scroll' }, [BACK]), fixture('still', { title: 'Inbox' }, [BACK])] });
    // Under always the edge is the same line in both conditions: nothing of it moves when scrolled changes.
    const still = await css(inner(page, 'still', '.outline'), 'background-color');
    await bar(page, 'still').evaluate(async (el: any) => {
      el.scrolled = true;
      await el.updateComplete;
    });
    expect(await inner(page, 'still', '.outline').evaluate((el) => el.getAnimations().length)).toBe(0);
    expect(await css(inner(page, 'still', '.outline'), 'background-color')).toBe(still);
    const duration = await resolveToken(page, T('motion-condition-duration'), 'duration');
    const easing = await page.evaluate((n) => {
      const probe = document.createElement('div');
      probe.style.transitionTimingFunction = `var(${n})`;
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).transitionTimingFunction;
      probe.remove();
      return value;
    }, T('motion-condition-easing'));
    expect(duration).toBeGreaterThan(0);
    const timing = (selector: string) =>
      inner(page, 'bar', selector).evaluate((el) => {
        const s = getComputedStyle(el);
        return { property: s.transitionProperty, duration: s.transitionDuration, easing: s.transitionTimingFunction };
      });
    expect(await timing('.container')).toEqual({ property: 'background-color, box-shadow', duration: `${duration / 1000}s`, easing });
    expect(await timing('.outline')).toEqual({ property: 'background-color', duration: `${duration / 1000}s`, easing });
    // Mid-way the edge is neither the flat nor the scrolled color: it moves. The edge's own transition is held a third of
    // the way through its timeline and sampled there, so a slow machine cannot outlast (or not yet start) it.
    const [flatEdge, scrolledEdge] = [await resolveColor(page, T('flat-outline-color')), await resolveColor(page, T('scrolled-outline-color'))];
    const edgeMove = await bar(page, 'bar').evaluate(async (el: any, t) => {
      el.scrolled = true;
      await el.updateComplete;
      const outline = el.shadowRoot!.querySelector('.outline')!;
      const transitions = outline.getAnimations().filter((a: Animation) => a instanceof CSSTransition);
      for (const a of transitions) { a.pause(); a.currentTime = t; }
      const sampled = getComputedStyle(outline).backgroundColor;
      for (const a of transitions) a.play();
      // Rounded to whole milliseconds, as the token is: Firefox reports 200 ms as 200.000015 (a float of seconds).
      return { durations: transitions.map((a: Animation) => Math.round(Number(a.effect!.getTiming().duration))), mid: sampled };
    }, duration / 3);
    expect(edgeMove.durations).toEqual([duration]);
    const mid = edgeMove.mid;
    expect([flatEdge, scrolledEdge]).not.toContain(mid);
    await expect.poll(() => css(inner(page, 'bar', '.outline'), 'background-color')).toBe(scrolledEdge);
    // Reduced motion: no transition at all.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await timing('.container')).duration).toBe('0s');
    expect((await timing('.outline')).duration).toBe('0s');
    await bar(page, 'bar').evaluate((el: any) => (el.scrolled = false));
    await bar(page, 'bar').evaluate((el: any) => el.updateComplete);
    expect(await css(inner(page, 'bar', '.outline'), 'background-color')).toBe(flatEdge);
  });
});

test.describe('layout', () => {
  test('APB-4: the full width; a top row at least container.height.small; navigation padding-inline from the start, actions padding-inline from the end, container.gap and actions.gap between', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const [small, pad, gap, actionsGap, target] = await Promise.all(
      [T('container-height-small'), T('container-padding-inline'), T('container-gap'), T('actions-gap'), '--tanrei-sys-target-pointer'].map((n) => resolveToken(page, n)),
    );
    const own = await bounds(bar(page, 'small'));
    const room = await bounds(stage(page, 'small'));
    expect([own.x, own.width]).toEqual([room.x, room.width]);
    const row = await bounds(inner(page, 'small', '.row'));
    expect(row.height).toBeGreaterThanOrEqual(small);
    expect(own.height).toBe(row.height);
    const items = bar(page, 'small').locator('tanrei-button');
    const [back, search, more] = await Promise.all([0, 1, 2].map((i) => bounds(items.nth(i))));
    const area = await bounds(inner(page, 'small', '.title-area'));
    // Each item is a cell of at least the minimum target, its icon button centred in it.
    for (const cell of [back, search, more]) expect(Math.min(cell.width, cell.height)).toBeGreaterThanOrEqual(target);
    expect(back.x - own.x).toBe(pad);
    expect(area.x - (back.x + back.width)).toBe(gap);
    expect(search.x - (area.x + area.width)).toBe(gap);
    expect(more.x - (search.x + search.width)).toBe(actionsGap);
    expect(own.x + own.width - (more.x + more.width)).toBe(pad);
    // Each vertically centred in the row.
    for (const cell of [back, search, more, area]) expect(cell.y + cell.height / 2).toBeCloseTo(row.y + row.height / 2, 0);
  });

  test('APB-4: without a navigation item the title starts title.inset from the start edge, without actions it ends title.inset from the end edge', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('none', { title: 'Settings' }), fixture('actions-only', { title: 'Inbox' }, [SEARCH]), fixture('navigation-only', { title: 'Inbox' }, [BACK])],
    });
    const [inset, pad] = await Promise.all([T('title-inset'), T('container-padding-inline')].map((n) => resolveToken(page, n)));
    const edges = async (id: string) => {
      const [own, area] = [await bounds(bar(page, id)), await bounds(inner(page, id, '.title-area'))];
      return [area.x - own.x, own.x + own.width - (area.x + area.width)];
    };
    expect(await edges('none')).toEqual([inset, inset]);
    expect((await edges('actions-only'))[0]).toBe(inset);
    expect((await edges('navigation-only'))[1]).toBe(inset);
    const own = await bounds(bar(page, 'navigation-only'));
    expect((await bounds(bar(page, 'navigation-only').locator('tanrei-button'))).x - own.x).toBe(pad);
  });

  test('APB-4: a navigation item goes to the start and action items to the end wherever they stand among the children; right-to-left mirrors the order', async ({ page }) => {
    // The actions come first in the markup: their slot still puts them at the end.
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('shuffled', { title: 'Inbox' }, [SEARCH, BACK, MORE])] });
    const own = await bounds(bar(page, 'shuffled'));
    const labelled = (label: string) => bounds(bar(page, 'shuffled').locator(`tanrei-button[label="${label}"]`));
    const pad = await resolveToken(page, T('container-padding-inline'));
    expect((await labelled('Back')).x - own.x).toBe(pad);
    expect((await labelled('Search')).x).toBeLessThan((await labelled('More options')).x);
    const more = await labelled('More options');
    expect(own.x + own.width - (more.x + more.width)).toBe(pad);
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    const rtl = await bounds(bar(page, 'shuffled'));
    const back = await labelled('Back');
    expect(rtl.x + rtl.width - (back.x + back.width)).toBe(pad);
    expect((await labelled('Search')).x).toBeGreaterThan((await labelled('More options')).x);
    expect((await labelled('More options')).x - rtl.x).toBe(pad);
    const area = await bounds(inner(page, 'shuffled', '.title-area'));
    expect(area.x + area.width).toBeLessThan(back.x);
  });

  test('APB-5: the title on one line in title.typescale.small and title.color, the subtitle under it in subtitle.typescale.small and subtitle.color, centred as a block, each truncated with an ellipsis', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spec.fixtures.filter((f) => f.id === 'small-subtitle'),
        fixture('long', { title: 'A very long screen title that cannot fit into the top row of a phone', subtitle: 'And a subtitle that is much too long to fit on one line either' }, [BACK, keep(SEARCH)]),
      ],
    });
    // A letter spacing may be in em: it is resolved with its role's font.
    const probe = (name: string, property: string, font?: string) =>
      page.evaluate(
        ([n, p, f]) => {
          const el = document.createElement('div');
          el.style.cssText = `position:absolute;visibility:hidden;${f ? `font:var(${f});` : ''}${p}:var(${n})`;
          document.body.appendChild(el);
          const s = getComputedStyle(el);
          const value = p === 'font' ? `${s.fontWeight} ${s.fontSize} ${s.lineHeight} ${s.fontFamily}` : s.getPropertyValue(p);
          el.remove();
          return value;
        },
        [name, property, font ?? ''] as const,
      );
    const text = (locator: Locator) =>
      locator.evaluate((el) => {
        const s = getComputedStyle(el);
        return { font: `${s.fontWeight} ${s.fontSize} ${s.lineHeight} ${s.fontFamily}`, letterSpacing: s.letterSpacing, color: s.color, whiteSpace: s.whiteSpace, overflow: s.textOverflow };
      });
    const title = inner(page, 'small-subtitle', '.row .title');
    const subtitle = inner(page, 'small-subtitle', '.row .subtitle');
    expect(await text(title)).toEqual({
      font: await probe(T('title-typescale-small-font'), 'font'),
      letterSpacing: await probe(T('title-typescale-small-letter-spacing'), 'letter-spacing', T('title-typescale-small-font')),
      color: await resolveColor(page, T('title-color')),
      whiteSpace: 'nowrap',
      overflow: 'ellipsis',
    });
    expect(await text(subtitle)).toEqual({
      font: await probe(T('subtitle-typescale-small-font'), 'font'),
      letterSpacing: await probe(T('subtitle-typescale-small-letter-spacing'), 'letter-spacing', T('subtitle-typescale-small-font')),
      color: await resolveColor(page, T('subtitle-color')),
      whiteSpace: 'nowrap',
      overflow: 'ellipsis',
    });
    // Subtitle under the title; the two centred in the row as a block.
    const [t, s, row] = [await bounds(title), await bounds(subtitle), await bounds(inner(page, 'small-subtitle', '.row'))];
    expect(s.y).toBeCloseTo(t.y + t.height, 0);
    expect((t.y + s.y + s.height) / 2).toBeCloseTo(row.y + row.height / 2, 0);
    // Too long: one line each, cut at the end, nothing past the title area.
    for (const selector of ['.row .title', '.row .subtitle']) {
      const cut = await inner(page, 'long', selector).evaluate((el) => ({ over: el.scrollWidth > el.clientWidth, lines: Math.round(el.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(el).lineHeight)) }));
      expect(cut, selector).toEqual({ over: true, lines: 1 });
    }
    const [area, search] = [await bounds(inner(page, 'long', '.title-area')), await bounds(bar(page, 'long').locator('tanrei-button').nth(1))];
    expect(area.x + area.width).toBeLessThanOrEqual(search.x);
  });

  test('APB-6: center centres the title block on the bar’s full width, narrowed equally so it never runs under either slot; start begins it after the navigation slot', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        ...spec.fixtures.filter((f) => f.id === 'small-center' || f.id === 'small'),
        fixture('center-long', { title: 'A very long screen title that cannot fit into the top row', titleAlignment: 'center' }, [BACK, keep(SEARCH), keep(MORE)]),
        fixture('center-title-only', { title: 'Settings', titleAlignment: 'center' }),
      ],
    });
    const centre = async (id: string) => {
      const own = await bounds(bar(page, id));
      const title = inner(page, id, '.row .title');
      // The drawn text's own box (the title element spans its block; its text is centred in it).
      const text = await title.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        return { x: r.x, width: r.width };
      });
      return { own, text, align: await css(title, 'text-align') };
    };
    for (const id of ['small-center', 'center-title-only']) {
      const { own, text, align } = await centre(id);
      expect(align, id).toBe('center');
      expect(text.x + text.width / 2, id).toBeCloseTo(own.x + own.width / 2, 0);
    }
    // Narrowed equally: the block's distances to the bar's edges are equal, and it clears both slots.
    const own = await bounds(bar(page, 'center-long'));
    const block = await bounds(inner(page, 'center-long', '.row .title'));
    expect(block.x - own.x).toBeCloseTo(own.x + own.width - (block.x + block.width), 0);
    const items = bar(page, 'center-long').locator('tanrei-button');
    const [back, search] = [await bounds(items.nth(0)), await bounds(items.nth(1))];
    expect(block.x).toBeGreaterThanOrEqual(back.x + back.width);
    expect(block.x + block.width).toBeLessThanOrEqual(search.x);
    expect(await inner(page, 'center-long', '.row .title').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    // Start: after the navigation slot and the gap, start-aligned.
    const gap = await resolveToken(page, T('container-gap'));
    const [startBack, startTitle] = [await bounds(bar(page, 'small').locator('tanrei-button').first()), await bounds(inner(page, 'small', '.row .title'))];
    expect(startTitle.x - (startBack.x + startBack.width)).toBe(gap);
    // APB-17: the layout's start edge is written physically, because the title's own direction does not decide it.
    expect(await css(inner(page, 'small', '.row .title'), 'text-align')).toBe('left');
    // The balance follows a change of the slots.
    await bar(page, 'small-center').locator('tanrei-button').nth(2).evaluate((el) => el.remove());
    await expect.poll(async () => {
      const { own: o, text } = await centre('small-center');
      return Math.abs(Math.round(text.x + text.width / 2 - (o.x + o.width / 2)));
    }).toBe(0);
  });

  test('APB-7: an expanded large bar is at least container.height.large, draws no title in its top row, and its title and subtitle below in the large roles, title.inset from the start, padding-block-end above the bottom edge', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    const [large, small, inset, below] = await Promise.all(
      [T('container-height-large'), T('container-height-small'), T('title-inset'), T('container-padding-block-end')].map((n) => resolveToken(page, n)),
    );
    for (const id of ['large', 'large-subtitle']) {
      const own = await bounds(bar(page, id));
      expect(own.height, id).toBeGreaterThanOrEqual(large);
      expect((await bounds(inner(page, id, '.row'))).height, id).toBeGreaterThanOrEqual(small);
      await expect(inner(page, id, '.row .title'), id).toHaveCount(0);
      const title = inner(page, id, '.expanded .title');
      expect(await title.evaluate((el) => getComputedStyle(el).font), id).toBe(await page.evaluate((n) => {
        const p = document.createElement('div');
        p.style.font = `var(${n})`;
        document.body.appendChild(p);
        const v = getComputedStyle(p).font;
        p.remove();
        return v;
      }, T('title-typescale-large-font')));
      const t = await bounds(title);
      expect(t.x - own.x, id).toBe(inset);
      const last = await bounds(inner(page, id, id === 'large' ? '.expanded .title' : '.expanded .subtitle'));
      expect(own.y + own.height - (last.y + last.height), id).toBe(below);
    }
    const subtitle = inner(page, 'large-subtitle', '.expanded .subtitle');
    expect(await css(subtitle, 'font-size')).toBe(await page.evaluate((n) => {
      const p = document.createElement('div');
      p.style.font = `var(${n})`;
      document.body.appendChild(p);
      const v = getComputedStyle(p).fontSize;
      p.remove();
      return v;
    }, T('subtitle-typescale-large-font')));
    // One line, cut at the end, title.inset from the end edge too.
    await bar(page, 'large').evaluate((el: any) => (el.headline = 'A very long screen title that cannot fit on one line of a large bar'));
    await bar(page, 'large').evaluate((el: any) => el.updateComplete);
    const cut = await inner(page, 'large', '.expanded .title').evaluate((el) => ({ over: el.scrollWidth > el.clientWidth, nowrap: getComputedStyle(el).whiteSpace }));
    expect(cut).toEqual({ over: true, nowrap: 'nowrap' });
    const [own, t] = [await bounds(bar(page, 'large')), await bounds(inner(page, 'large', '.expanded .title'))];
    expect(own.x + own.width - (t.x + t.width)).toBe(inset);
  });
});

test.describe('scrolling', () => {
  test('APB-8: a connected large bar shrinks one for one with the scroll to its top row, the expanded title moving up under it, the top row’s title fading in with the part covered; it expands the same way back', async ({ page }) => {
    await scrollPage(page, 'size="large" headline="Inbox" scroll-target="list"');
    const small = await resolveToken(page, T('container-height-small'));
    const expandedHeight = (await bounds(screenBar(page))).height;
    const row = (await bounds(screenBar(page).locator('.row'))).height;
    const range = expandedHeight - row;
    expect(row).toBeGreaterThanOrEqual(small);
    const topTitleOpacity = () => screenBar(page).evaluate((el) => {
      const area = el.shadowRoot!.querySelector<HTMLElement>('.title-area')!;
      return area.querySelector('.title') ? Number(getComputedStyle(area).opacity) : 0;
    });
    expect(await topTitleOpacity()).toBe(0);
    // One for one.
    for (const d of [5, 12]) {
      await scrollTo(page, d);
      expect((await bounds(screenBar(page))).height, `${d}`).toBe(expandedHeight - d);
    }
    // The expanded title's top is still visible: nothing of it is covered, so the top title is invisible.
    const title = await screenBar(page).locator('.expanded .title').evaluate((el: HTMLElement) => ({ top: el.offsetTop, height: el.offsetHeight }));
    await scrollTo(page, title.top - 1);
    expect(await topTitleOpacity()).toBe(0);
    // Half the title covered: half visible.
    await scrollTo(page, title.top + title.height / 2);
    expect(await topTitleOpacity()).toBeCloseTo(0.5, 1);
    // The expanded title moved up with the bottom edge and is clipped under the top row.
    const clip = await bounds(screenBar(page).locator('.expanded'));
    const rowBox = await bounds(screenBar(page).locator('.row'));
    expect(clip.y).toBe(rowBox.y + rowBox.height);
    expect(await screenBar(page).locator('.expanded').evaluate((el) => getComputedStyle(el).overflow)).toBe('hidden');
    // Fully collapsed: only the top row, its title fully visible; further scrolling changes nothing.
    await scrollTo(page, range + 100);
    expect((await bounds(screenBar(page))).height).toBe(row);
    expect(await topTitleOpacity()).toBe(1);
    // Back toward the top: it expands the same way.
    await scrollTo(page, 7);
    expect((await bounds(screenBar(page))).height).toBe(expandedHeight - 7);
    await scrollTo(page, 0);
    expect((await bounds(screenBar(page))).height).toBe(expandedHeight);
    expect(await topTitleOpacity()).toBe(0);
  });

  test('APB-9: a connected bar takes scrolled from its scrolling element — a small one as soon as content is under it, a large one only once fully collapsed', async ({ page }) => {
    await scrollPage(page, 'headline="Inbox" scroll-target="list"');
    await expect(screenBar(page)).not.toHaveAttribute('scrolled');
    await scrollTo(page, 1);
    await expect(screenBar(page)).toHaveAttribute('scrolled', '');
    await scrollTo(page, 0);
    await expect(screenBar(page)).not.toHaveAttribute('scrolled');
    // Set by the product, a connected bar still follows its scroll on the next change.
    await scrollPage(page, 'size="large" headline="Inbox" scroll-target="list"');
    const expanded = (await bounds(screenBar(page))).height;
    const row = (await bounds(screenBar(page).locator('.row'))).height;
    await scrollTo(page, expanded - row - 1);
    await expect(screenBar(page)).not.toHaveAttribute('scrolled');
    await scrollTo(page, expanded - row + 1);
    await expect(screenBar(page)).toHaveAttribute('scrolled', '');
    expect((await bounds(screenBar(page))).height).toBe(row);
  });

  test('APB-9: by default the bar follows the document’s scroll; none follows nothing; unconnected, scrolled draws a large bar collapsed and its absence expanded', async ({ page }) => {
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        { id: 'document', props: { title: 'Inbox', scrollTarget: '' }, items: [BACK] },
        fixture('none', { title: 'Inbox' }, [BACK]),
        fixture('large-scrolled', { size: 'large', title: 'Inbox', scrolled: true }, [BACK]),
        fixture('large', { size: 'large', title: 'Inbox' }, [BACK]),
      ],
    });
    await page.addStyleTag({ content: 'body { min-block-size: 3000px; }' });
    await expect(bar(page, 'document')).not.toHaveAttribute('scrolled');
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect(bar(page, 'document')).toHaveAttribute('scrolled', '');
    await expect(bar(page, 'none')).not.toHaveAttribute('scrolled');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(bar(page, 'document')).not.toHaveAttribute('scrolled');
    // Unconnected large bars: collapsed while scrolled, expanded otherwise.
    const [small, large] = await Promise.all([T('container-height-small'), T('container-height-large')].map((n) => resolveToken(page, n)));
    expect((await bounds(bar(page, 'large-scrolled'))).height).toBeLessThan(large);
    expect((await bounds(bar(page, 'large-scrolled'))).height).toBe((await bounds(inner(page, 'large-scrolled', '.row'))).height);
    expect((await bounds(inner(page, 'large-scrolled', '.row'))).height).toBeGreaterThanOrEqual(small);
    await expect(inner(page, 'large-scrolled', '.row .title')).toHaveText('Inbox');
    expect((await bounds(bar(page, 'large'))).height).toBeGreaterThanOrEqual(large);
    // An id that names nothing: reported, and the bar draws what scrolled says.
    const seen = warnings(page);
    await bar(page, 'none').evaluate((el: any) => (el.scrollTarget = 'missing'));
    await expect.poll(() => seen.filter((w) => w.includes('APB-9')).length).toBe(1);
    expect(seen.find((w) => w.includes('APB-9'))).toMatch(/scroll-target "missing" names no element/);
  });
});

test.describe('insets and items', () => {
  test('APB-10: the color reaches under the top and side insets while the content stays below and inside them (env(safe-area-inset-*))', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'small') });
    // The stylesheet reads the platform's insets.
    const sheet = await bar(page, 'small').evaluate((el) => (el.constructor as any).styles.cssText as string);
    for (const side of ['top', 'left', 'right']) expect(sheet).toContain(`env(safe-area-inset-${side}, 0px)`);
    // With insets (a notched phone), the bar is taller by the top one, its color fills it, and its content is inside.
    const before = await bounds(bar(page, 'small'));
    await bar(page, 'small').evaluate((el) => el.setAttribute('style', '--_inset-top: 24px; --_inset-left: 10px; --_inset-right: 14px'));
    const own = await bounds(bar(page, 'small'));
    const container = await bounds(inner(page, 'small', '.container'));
    const row = await bounds(inner(page, 'small', '.row'));
    expect(own.height).toBe(before.height + 24);
    expect([container.y, container.height]).toEqual([own.y, own.height]);
    expect(row.y - own.y).toBe(24);
    expect([row.x - own.x, own.x + own.width - (row.x + row.width)]).toEqual([10, 14]);
    expect(await css(inner(page, 'small', '.container'), 'background-color')).toBe(await resolveColor(page, T('flat-container-color')));
  });

  test('APB-11: the items render as the icon buttons they are, from their own tokens and with their own semantics; the bar takes no focus, and Tab goes from the navigation item to the actions', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'small') });
    await page.evaluate(() => {
      document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div class="stage" id="alone"><tanrei-button variant="text" label="Alone"><span slot="icon">search</span></tanrei-button></div>');
    });
    const look = (locator: Locator) =>
      locator.evaluate((el) => {
        const b = el.shadowRoot!.querySelector('button')!;
        const s = getComputedStyle(b);
        const r = b.getBoundingClientRect();
        return { bg: s.backgroundColor, color: s.color, width: r.width, height: r.height, radius: s.borderTopLeftRadius };
      });
    const alone = await look(page.locator('#alone tanrei-button'));
    for (const i of [0, 1, 2]) expect(await look(bar(page, 'small').locator('tanrei-button').nth(i))).toEqual(alone);
    await expect(bar(page, 'small').getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(bar(page, 'small').getByRole('button', { name: 'Search' })).toBeVisible();
    // No role, no tab stop of its own.
    await expect(bar(page, 'small')).not.toHaveAttribute('role');
    await expect(bar(page, 'small')).not.toHaveAttribute('tabindex');
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
      document.getElementById('before')!.focus();
    });
    const order: string[] = [];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      order.push(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('label') ?? document.activeElement?.localName ?? ''));
    }
    expect(order).toEqual(['Back', 'Search', 'More options']);
  });

  test('APB-12: the title is a heading (level 1, or heading-level), the subtitle is read after it; a large bar exposes one title — the expanded one while any of it shows', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [...spec.fixtures, { id: 'level', props: { title: 'Inbox', headingLevel: 3 }, items: [] }] });
    await expect(stage(page, 'small-subtitle')).toMatchAriaSnapshot(`
      - button "Back"
      - heading "Quarterly report" [level=1]
      - text: Edited 5 minutes ago
      - button "Share"
    `);
    await expect(stage(page, 'level').getByRole('heading', { name: 'Inbox', level: 3 })).toHaveCount(1);
    for (const id of ['small', 'small-center', 'small-scrolled', 'small-title-only', 'large', 'large-subtitle', 'large-scrolled']) {
      await expect(stage(page, id).getByRole('heading'), id).toHaveCount(1);
    }
    await expect(stage(page, 'large-subtitle')).toMatchAriaSnapshot(`
      - button "Menu"
      - button "Search"
      - button "Account"
      - heading "Inbox" [level=1]
      - text: ada@example.com
    `);
    // Connected: one heading at every point of the collapse.
    await scrollPage(page, 'size="large" headline="Inbox" scroll-target="list"');
    const title = await screenBar(page).locator('.expanded .title').evaluate((el: HTMLElement) => ({ top: el.offsetTop, height: el.offsetHeight }));
    for (const d of [0, title.top + title.height / 2, 400]) {
      await scrollTo(page, d);
      await expect(page.locator('#screen').getByRole('heading', { name: 'Inbox' }), `${d}`).toHaveCount(1);
    }
    // Collapsed, the exposed one is the top row's.
    expect(await screenBar(page).locator('.expanded').getAttribute('aria-hidden')).toBe('true');
  });

  test('APB-13: an empty title draws no title block and exposes no heading; more than one navigation item still renders, and a debug build reports it; four actions that fit are all drawn and not reported', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fixture('untitled', { subtitle: 'Nothing' }, [BACK, SEARCH]),
        fixture('large-untitled', { size: 'large' }, [BACK]),
        fixture('crowded', { title: 'Inbox' }, [BACK, nav('Close', 'close'), SEARCH, MORE, SHARE, act('Delete', 'delete')]),
      ],
    });
    await expect(inner(page, 'untitled', '.title-block')).toHaveCount(0);
    await expect(stage(page, 'untitled').getByRole('heading')).toHaveCount(0);
    await expect(stage(page, 'large-untitled').getByRole('heading')).toHaveCount(0);
    // The large bar still has its (empty) title row.
    expect((await bounds(bar(page, 'large-untitled'))).height).toBeGreaterThanOrEqual(await resolveToken(page, T('container-height-large')));
    // Four actions, on a stage with room for them beside two navigation items: every one is drawn (APB-26).
    await stage(page, 'crowded').evaluate((el: HTMLElement) => {
      el.style.inlineSize = '480px';
    });
    const items = bar(page, 'crowded').locator(':scope > tanrei-button');
    await expect(items).toHaveCount(6);
    for (const i of [0, 1, 2, 3, 4, 5]) await expect(items.nth(i)).toBeVisible();
    await expect(bar(page, 'crowded').locator('[part~="overflow-button"]')).toBeHidden();
    await expect.poll(() => seen.filter((w) => w.includes('APB-13')).length).toBe(1);
    expect(seen).toEqual(expect.arrayContaining([expect.stringMatching(/<tanrei-app-bar>: the bar holds 2 navigation items; a bar has one navigation button \(APB-13\)/)]));
    // No count of actions is reported: the bar draws as many as fit (APB-26).
    expect(seen.filter((w) => /action items|overflow menu/.test(w))).toEqual([]);
  });

  test('APB-14: a size the active system does not have renders with small’s tokens and is reported; a size a layer adds is drawn from its own tokens', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('small', { title: 'Inbox' }, [BACK]), fixture('huge', { size: 'huge', title: 'Inbox' }, [BACK])] });
    expect(await bounds(bar(page, 'huge'))).toMatchObject({ height: (await bounds(bar(page, 'small'))).height });
    await expect(inner(page, 'huge', '.expanded')).toHaveCount(0);
    await expect(inner(page, 'huge', '.row .title')).toHaveText('Inbox');
    await expect.poll(() => seen.filter((w) => w.includes('APB-14')).length).toBe(1);
    expect(seen.find((w) => w.includes('APB-14'))).toMatch(/size "huge" is not a value of the active design system; it is drawn as "small"/);
    // A layer that adds `medium` (as m3-like may): its height and title role, a title row of its own.
    await page.addStyleTag({
      content: `:root { ${T('container-height-medium')}: 160px; ${T('title-typescale-medium-font')}: var(--tanrei-sys-typescale-heading-2-font); ${T('title-typescale-medium-letter-spacing')}: 0px; ${T('subtitle-typescale-medium-font')}: var(--tanrei-sys-typescale-body-font); ${T('subtitle-typescale-medium-letter-spacing')}: 0px; }`,
    });
    await bar(page, 'huge').evaluate((el: any) => (el.size = 'medium'));
    await expect(inner(page, 'huge', '.expanded .title')).toHaveText('Inbox');
    expect((await bounds(bar(page, 'huge'))).height).toBeGreaterThanOrEqual(160);
    expect(seen.filter((w) => w.includes('"medium"'))).toEqual([]);
  });

  test('APB-15: enlarged text grows the rows (heights are minimums) and keeps each line truncated; the navigation and action items do not scale', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: spec.fixtures.filter((f) => f.id === 'small-subtitle' || f.id === 'large-subtitle') });
    const button = (id: string) => bar(page, id).locator('tanrei-button').first();
    const before = { row: await bounds(inner(page, 'small-subtitle', '.row')), button: await bounds(button('small-subtitle')), large: await bounds(bar(page, 'large-subtitle')) };
    // Text only, as a platform's text size setting does: the type dial, not the size unit.
    await override(page, { '--tanrei-dial-type-base': '32px' });
    const row = await bounds(inner(page, 'small-subtitle', '.row'));
    const [title, subtitle] = [await bounds(inner(page, 'small-subtitle', '.row .title')), await bounds(inner(page, 'small-subtitle', '.row .subtitle'))];
    expect(row.height).toBeGreaterThan(before.row.height);
    expect(row.height).toBeGreaterThanOrEqual(title.height + subtitle.height);
    expect((await bounds(bar(page, 'large-subtitle'))).height).toBeGreaterThan(before.large.height);
    for (const selector of ['.row .title', '.row .subtitle']) {
      const lines = await inner(page, 'small-subtitle', selector).evaluate((el) => Math.round(el.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(el).lineHeight)));
      expect(lines, selector).toBe(1);
    }
    const after = await bounds(button('small-subtitle'));
    expect([after.width, after.height]).toEqual([before.button.width, before.button.height]);
  });
});

test.describe('divider visibility', () => {
  const edge = (page: P, locator: Locator) => css(locator.locator('.outline'), 'background-color');

  test('APB-18: always — the default — draws the edge on a connected bar at rest, with nothing scrolled, and keeps it while the content scrolls', async ({ page }) => {
    await scrollPage(page, 'headline="Inbox" scroll-target="list"');
    const line = await resolveColor(page, T('scrolled-outline-color'));
    await expect(screenBar(page)).not.toHaveAttribute('scrolled');
    expect(await edge(page, screenBar(page))).toBe(line);
    await scrollTo(page, 120);
    await expect(screenBar(page)).toHaveAttribute('scrolled');
    expect(await edge(page, screenBar(page))).toBe(line);
    await scrollTo(page, 0);
    expect(await edge(page, screenBar(page))).toBe(line);
  });

  test('APB-18: scroll draws the edge only while content lies under the bar, and follows the scroll both ways', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await scrollPage(page, 'headline="Inbox" scroll-target="list" divider-visibility="scroll"');
    const [none, line] = [await resolveColor(page, T('flat-outline-color')), await resolveColor(page, T('scrolled-outline-color'))];
    expect(await edge(page, screenBar(page))).toBe(none);
    await scrollTo(page, 120);
    expect(await edge(page, screenBar(page))).toBe(line);
    await scrollTo(page, 0);
    expect(await edge(page, screenBar(page))).toBe(none);
  });

  test('APB-18: auto follows comp.app-bar.outline.visibility; the attribute overrides it; a change is drawn at once; an unknown value is auto and reported', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const seen = warnings(page);
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('auto', { title: 'Inbox' }, [BACK]), fixture('always', { title: 'Inbox', dividerVisibility: 'always' }, [BACK]), fixture('unknown', { title: 'Inbox' }, [BACK])],
    });
    const [none, line] = [await resolveColor(page, T('flat-outline-color')), await resolveColor(page, T('scrolled-outline-color'))];
    // The component token aliases sys.behavior.divider-visibility, which the default system sets to always.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-comp-app-bar-outline-visibility').trim())).toBe('always');
    expect(await edge(page, bar(page, 'auto'))).toBe(line);
    // A layer that sets the token to scroll: auto follows it, at once; always keeps the line whatever the token says.
    await override(page, { [T('outline-visibility')]: 'scroll' });
    await expect.poll(() => edge(page, bar(page, 'auto'))).toBe(none);
    expect(await edge(page, bar(page, 'always'))).toBe(line);
    // The system-wide choice reaches the bar through its token.
    await override(page, { [T('outline-visibility')]: 'var(--tanrei-sys-behavior-divider-visibility)', '--tanrei-sys-behavior-divider-visibility': 'scroll' });
    await expect.poll(() => edge(page, bar(page, 'auto'))).toBe(none);
    await override(page, { '--tanrei-sys-behavior-divider-visibility': 'always' });
    await expect.poll(() => edge(page, bar(page, 'auto'))).toBe(line);
    // An attribute set on the instance: the other form at once.
    await bar(page, 'auto').evaluate(async (el: any) => {
      el.dividerVisibility = 'scroll';
      await el.updateComplete;
    });
    await expect(bar(page, 'auto')).toHaveAttribute('divider-visibility', 'scroll');
    expect(await edge(page, bar(page, 'auto'))).toBe(none);
    // A value the bar does not define is drawn as auto (always here) and reported in debug builds.
    await bar(page, 'unknown').evaluate(async (el: any) => {
      el.setAttribute('divider-visibility', 'sometimes');
      await el.updateComplete;
    });
    expect(await edge(page, bar(page, 'unknown'))).toBe(line);
    await expect.poll(() => seen.some((m) => m.includes('APB-18') && m.includes('sometimes'))).toBe(true);
  });

  test('APB-18: where the browser has no style queries the bar writes the name it reads on its container, and the same rules draw it', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('bar', { title: 'Inbox', dividerVisibility: 'scroll' }, [BACK])] });
    const written = await inner(page, 'bar', '.container').evaluate((el) => (el as HTMLElement).dataset.dividerVisibility ?? null);
    const supported = await page.evaluate(() => {
      const outer = document.createElement('div');
      const inner = document.createElement('div');
      outer.style.setProperty('--probe', 'on');
      const sheet = document.createElement('style');
      sheet.textContent = '@container style(--probe: on) { [data-probe] { --answer: yes; } }';
      inner.setAttribute('data-probe', '');
      outer.append(inner);
      document.head.append(sheet);
      document.body.append(outer);
      const answer = getComputedStyle(inner).getPropertyValue('--answer').trim() === 'yes';
      outer.remove();
      sheet.remove();
      return answer;
    });
    // With style queries the cascade answers and nothing is written; without them the name is written for the rules.
    expect(written).toBe(supported ? null : 'scroll');
    expect(await css(inner(page, 'bar', '.outline'), 'background-color')).toBe(await resolveColor(page, T('flat-outline-color')));
  });
});

test.describe('brand', () => {
  const BRAND_FIXTURES = ['small-brand', 'small-brand-symbol', 'small-brand-wordmark', 'small-brand-lockup', 'small-brand-responsive'];
  const brandFixtures = () => spec.fixtures.filter((f) => BRAND_FIXTURES.includes(f.id));
  const cell = (page: P, id: string) => inner(page, id, '.brand');
  const image = (page: P, id: string, slot: string) => bar(page, id).locator(`[slot="${slot}"]`);
  const centre = (box: { x: number; y: number; width: number; height: number }) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  /** A bar with a menu button, a brand and one action, alone on the page (no app shell). */
  async function brandPage(page: P, attributes: string, images: string, { navigation = true, theme = 'light' }: { navigation?: boolean; theme?: 'light' | 'dark' } = {}) {
    await mountFixtures(page, spec, { icons: true, theme, fixtures: [] });
    await page.evaluate(
      ([attrs, inside, withNavigation]) => {
        document.querySelector('main')!.innerHTML = `<div class="stage" id="brand-stage"><tanrei-app-bar scroll-target="none" ${attrs}>
          ${withNavigation ? '<tanrei-button variant="text" slot="navigation" label="Menu"><span slot="icon">menu</span></tanrei-button>' : ''}
          ${inside}
          <tanrei-button variant="text" slot="actions" label="Search"><span slot="icon">search</span></tanrei-button>
        </tanrei-app-bar></div>`;
      },
      [attributes, images, navigation] as const,
    );
    await page.locator('#brand-stage tanrei-app-bar').evaluate((el: any) => el.updateComplete);
  }
  const brandBar = (page: P) => page.locator('#brand-stage tanrei-app-bar');
  const NAMED = 'brand-href="#home" brand-label="Tanrei"';
  const SYMBOL = markMarkup('symbol', 'brand-symbol');
  const WORDMARK = markMarkup('wordmark', 'brand-wordmark');

  test('APB-19: the brand stands after the navigation item at actions.gap, in a cell as large as an icon button’s; a symbol stands where the menu icon stands, a wordmark at the same inset; without a navigation item, or with one not drawn, it starts container.padding-inline from the edge; rtl mirrors', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    await mountFixtures(page, spec, { icons: true, fixtures: brandFixtures() });
    const menu = await bounds(bar(page, 'small-brand-symbol').locator('tanrei-button[slot="navigation"]'));
    const icon = await bounds(bar(page, 'small-brand-symbol').locator('tanrei-button[slot="navigation"] [slot="icon"]'));
    const box = await bounds(cell(page, 'small-brand-symbol'));
    const symbol = await bounds(image(page, 'small-brand-symbol', 'brand-symbol'));
    expect(box.x - (menu.x + menu.width)).toBeCloseTo(await resolveToken(page, T('actions-gap')), 0);
    expect(box.width).toBeCloseTo(menu.width, 0);
    expect(box.height).toBeCloseTo(menu.height, 0);
    expect(symbol.x - box.x).toBeCloseTo(icon.x - menu.x, 0);
    expect(symbol.width).toBeCloseTo(icon.width, 0);
    expect(centre(symbol).y).toBeCloseTo(centre(icon).y, 0);
    const wordmarkBox = await bounds(cell(page, 'small-brand-wordmark'));
    const wordmark = await bounds(image(page, 'small-brand-wordmark', 'brand-wordmark'));
    expect(wordmark.x - wordmarkBox.x).toBeCloseTo(icon.x - menu.x, 0);
    expect(centre(wordmark).y).toBeCloseTo(centre(wordmarkBox).y, 0);
    // The title follows at container.gap.
    const title = await bounds(bar(page, 'small-brand-symbol').locator('.row .title'));
    expect(title.x - (box.x + box.width)).toBeCloseTo(await resolveToken(page, T('container-gap')), 0);

    await brandPage(page, NAMED, SYMBOL, { navigation: false });
    const start = (await bounds(brandBar(page).locator('.brand'))).x - (await bounds(brandBar(page))).x;
    expect(start).toBeCloseTo(await resolveToken(page, T('container-padding-inline')), 0);
    await brandPage(page, NAMED, SYMBOL);
    await brandBar(page).locator('tanrei-button[slot="navigation"]').evaluate((el: HTMLElement) => (el.style.display = 'none'));
    const undrawn = (await bounds(brandBar(page).locator('.brand'))).x - (await bounds(brandBar(page))).x;
    expect(undrawn).toBeCloseTo(await resolveToken(page, T('container-padding-inline')), 0);
    await page.locator('#brand-stage').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await brandBar(page).locator('tanrei-button[slot="navigation"]').evaluate((el: HTMLElement) => (el.style.display = ''));
    await brandBar(page).evaluate((el: any) => el.updateComplete);
    const rtlMenu = await bounds(brandBar(page).locator('tanrei-button[slot="navigation"]'));
    const rtlCell = await bounds(brandBar(page).locator('.brand'));
    expect(rtlMenu.x - (rtlCell.x + rtlCell.width)).toBeCloseTo(await resolveToken(page, T('actions-gap')), 0);
  });

  test('APB-25: a control in context stands actions.gap after the brand’s cell, centred on the row, the actions still at the end; Tab goes navigation, brand, context, actions; without a brand it follows the navigation item, without either it starts container.padding-inline from the edge; rtl mirrors', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    const CONTEXT = '<tanrei-button id="context" variant="text" slot="context" icon-position="trailing">tanrei<span slot="icon">expand_more</span></tanrei-button>';
    const control = () => brandBar(page).locator('#context');
    // The stage of a bar is a phone's width; a menu button, a wordmark, the control and an action need more.
    const widen = () => page.locator('#brand-stage').evaluate((el: HTMLElement) => (el.style.inlineSize = '600px'));
    await brandPage(page, NAMED, WORDMARK + CONTEXT);
    await widen();
    const gap = await resolveToken(page, T('actions-gap'));
    const box = await bounds(brandBar(page).locator('.brand'));
    const context = await bounds(control());
    const row = await bounds(brandBar(page).locator('.row'));
    expect(context.x - (box.x + box.width)).toBeCloseTo(gap, 0);
    expect(centre(context).y).toBeCloseTo(centre(row).y, 0);
    // Laid out, never restyled: the Button keeps its own height.
    expect((await bounds(control().locator('[part~="container"]'))).height).toBeCloseTo(await resolveToken(page, '--tanrei-comp-button-container-height-medium'), 0);
    // The actions stay where a bar without the control puts them.
    const end = await bounds(brandBar(page).locator('tanrei-button[slot="actions"]'));
    expect(end.x).toBeGreaterThan(context.x + context.width);
    await control().evaluate((el) => el.removeAttribute('slot'));
    await brandBar(page).evaluate((el: any) => el.updateComplete);
    expect((await bounds(brandBar(page).locator('tanrei-button[slot="actions"]'))).x).toBeCloseTo(end.x, 0);
    await control().evaluate((el) => el.setAttribute('slot', 'context'));
    await brandBar(page).evaluate((el: any) => el.updateComplete);

    await page.evaluate(() => {
      document.body.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
      document.getElementById('before')!.focus();
    });
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      await tab(page);
      order.push(
        await page.evaluate(() => {
          const host = document.activeElement as HTMLElement;
          const inside = host.shadowRoot?.activeElement as HTMLElement | null;
          return host.getAttribute('label') ?? inside?.getAttribute('aria-label') ?? host.getAttribute('slot') ?? host.tagName;
        }),
      );
    }
    expect(order).toEqual(['Menu', 'Tanrei', 'context', 'Search']);

    await brandPage(page, '', CONTEXT);
    const menu = await bounds(brandBar(page).locator('tanrei-button[slot="navigation"]'));
    expect((await bounds(control())).x - (menu.x + menu.width)).toBeCloseTo(gap, 0);
    await brandPage(page, '', CONTEXT, { navigation: false });
    expect((await bounds(control())).x - (await bounds(brandBar(page))).x).toBeCloseTo(await resolveToken(page, T('container-padding-inline')), 0);

    await brandPage(page, NAMED, WORDMARK + CONTEXT);
    await widen();
    await page.locator('#brand-stage').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await brandBar(page).evaluate((el: any) => el.updateComplete);
    const rtlCell = await bounds(brandBar(page).locator('.brand'));
    const rtlContext = await bounds(control());
    expect(rtlCell.x - (rtlContext.x + rtlContext.width)).toBeCloseTo(gap, 0);
  });

  test('APB-20: each image at its token’s height and as wide as its proportions; a mark in currentColor in brand.color; a lockup draws the symbol, then the wordmark lockup.gap after it, aligned as lockup.alignment names', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { icons: true, theme, fixtures: brandFixtures() });
      const one = await bounds(image(page, 'small-brand', 'brand'));
      expect(one.height).toBeCloseTo(await resolveToken(page, T('brand-image-height')), 0);
      const [, , frameWidth, frameHeight] = WORDMARK.match(/viewBox="([^"]*)"/)![1].split(' ').map(Number);
      expect(one.width).toBeCloseTo((one.height * frameWidth) / frameHeight, 0);
      expect((await bounds(image(page, 'small-brand-symbol', 'brand-symbol'))).height).toBeCloseTo(await resolveToken(page, T('brand-symbol-size')), 0);
      expect((await bounds(image(page, 'small-brand-wordmark', 'brand-wordmark'))).height).toBeCloseTo(await resolveToken(page, T('brand-wordmark-height')), 0);
      const color = await resolveColor(page, T('brand-color'));
      expect(color).toBe(await resolveColor(page, '--tanrei-sys-color-on-surface'));
      for (const id of BRAND_FIXTURES) expect(await css(cell(page, id), 'color'), `${theme} ${id}`).toBe(color);
      expect(await image(page, 'small-brand-symbol', 'brand-symbol').locator('path').evaluate((el) => getComputedStyle(el).fill)).toBe(color);
    }
    const symbol = await bounds(image(page, 'small-brand-lockup', 'brand-symbol'));
    const wordmark = await bounds(image(page, 'small-brand-lockup', 'brand-wordmark'));
    expect(wordmark.x - (symbol.x + symbol.width)).toBeCloseTo(await resolveToken(page, T('brand-lockup-gap')), 0);
    expect(centre(symbol).y).toBeCloseTo(centre(wordmark).y, 0);
    await override(page, { [T('brand-lockup-alignment')]: 'end' });
    await expect.poll(async () => {
      const [s, w] = [await bounds(image(page, 'small-brand-lockup', 'brand-symbol')), await bounds(image(page, 'small-brand-lockup', 'brand-wordmark'))];
      return Math.round(s.y + s.height - (w.y + w.height));
    }).toBe(0);
  });

  test('APB-21: one image, a symbol alone or a wordmark alone at every width; a lockup shows both at every width; responsive shows the wordmark in a medium or wider window and the symbol in a compact one, inside an app shell and outside one, focus staying on the brand', async ({ page }) => {
    for (const width of [1024, 390]) {
      await page.setViewportSize({ width, height: 600 });
      await mountFixtures(page, spec, { icons: true, fixtures: brandFixtures() });
      await expect(image(page, 'small-brand', 'brand')).toBeVisible();
      await expect(image(page, 'small-brand-symbol', 'brand-symbol')).toBeVisible();
      await expect(image(page, 'small-brand-wordmark', 'brand-wordmark')).toBeVisible();
      await expect(image(page, 'small-brand-lockup', 'brand-symbol')).toBeVisible();
      await expect(image(page, 'small-brand-lockup', 'brand-wordmark')).toBeVisible();
      const wide = width === 1024;
      await expect(image(page, 'small-brand-responsive', 'brand-wordmark')).toBeVisible({ visible: wide });
      await expect(image(page, 'small-brand-responsive', 'brand-symbol')).toBeVisible({ visible: !wide });
    }
    // Outside an app shell, across the breakpoint with focus on the brand: the link stays, and its focus.
    await page.setViewportSize({ width: 1024, height: 600 });
    await brandPage(page, `${NAMED} brand-layout="responsive"`, `${SYMBOL}${WORDMARK}`);
    const link = brandBar(page).getByRole('link', { name: 'Tanrei' });
    await link.focus();
    await page.setViewportSize({ width: 390, height: 600 });
    await expect(brandBar(page).locator('[slot="brand-symbol"]')).toBeVisible();
    await expect(brandBar(page).locator('[slot="brand-wordmark"]')).toBeHidden();
    await expect(link).toBeFocused();
    await page.setViewportSize({ width: 1024, height: 600 });
    await expect(brandBar(page).locator('[slot="brand-wordmark"]')).toBeVisible();
    await expect(link).toBeFocused();
    // Inside an app shell: the shell's window class.
    await page.setViewportSize({ width: 390, height: 600 });
    await page.evaluate(
      ([attrs, inside]) => {
        document.querySelector('main')!.innerHTML = `<tanrei-app-shell id="shell"><header slot="header"><tanrei-app-bar id="in-shell" scroll-target="none" ${attrs}>${inside}</tanrei-app-bar></header><main id="content">Content</main></tanrei-app-shell>`;
      },
      [`${NAMED} brand-layout="responsive"`, `${SYMBOL}${WORDMARK}`] as const,
    );
    await page.locator('#in-shell').evaluate((el: any) => el.updateComplete);
    await expect.poll(() => page.locator('#shell').evaluate((el: any) => el.windowClass)).toBe('compact');
    await expect(page.locator('#in-shell [slot="brand-symbol"]')).toBeVisible();
    await expect(page.locator('#in-shell [slot="brand-wordmark"]')).toBeHidden();
    await page.setViewportSize({ width: 1024, height: 600 });
    await expect.poll(() => page.locator('#shell').evaluate((el: any) => el.windowClass)).not.toBe('compact');
    await expect(page.locator('#in-shell [slot="brand-wordmark"]')).toBeVisible();
    await expect(page.locator('#in-shell [slot="brand-symbol"]')).toBeHidden();
  });

  test('APB-22: one link to brand-href named by brand-label in every arrangement, its images hidden; Tab goes navigation, brand, actions; the focus ring in brand.shape; without brand-href one image named by brand-label and no tab stop', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    await mountFixtures(page, spec, { icons: true, fixtures: brandFixtures() });
    for (const id of BRAND_FIXTURES) {
      await expect(stage(page, id).getByRole('link'), id).toHaveCount(1);
      await expect(stage(page, id).getByRole('link', { name: 'Tanrei', exact: true }), id).toHaveAttribute('href', '/');
      await expect(stage(page, id).getByRole('img'), id).toHaveCount(0);
    }
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
      document.getElementById('before')!.focus();
    });
    const order: string[] = [];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      order.push(await page.evaluate(() => {
        const host = document.activeElement as HTMLElement;
        const inside = host.shadowRoot?.activeElement as HTMLElement | null;
        return host.getAttribute('label') ?? inside?.getAttribute('aria-label') ?? host.tagName;
      }));
    }
    expect(order).toEqual(['Menu', 'Tanrei', 'Search']);
    await tab(page, { back: true });
    const ring = await cell(page, 'small-brand').evaluate((el) => ({ outline: getComputedStyle(el).outlineStyle, radius: getComputedStyle(el).borderTopLeftRadius }));
    expect(ring.outline).toBe('solid');
    expect(parseFloat(ring.radius)).toBeGreaterThanOrEqual((await bounds(cell(page, 'small-brand'))).height / 2);

    await brandPage(page, 'brand-label="Tanrei"', SYMBOL);
    await expect(brandBar(page).getByRole('link')).toHaveCount(0);
    await expect(brandBar(page).getByRole('img', { name: 'Tanrei', exact: true })).toHaveCount(1);
    expect(await brandBar(page).locator('.brand').evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);
  });

  test('APB-22: no axe violations in any arrangement, light and dark', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true, fixtures: brandFixtures() });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('APB-24: in a lockup the symbol stands at the wordmark’s height (lockup.symbol.size); alone, or in a compact window under responsive, it keeps symbol.size', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    await mountFixtures(page, spec, { icons: true, fixtures: brandFixtures() });
    const symbol = await bounds(image(page, 'small-brand-lockup', 'brand-symbol'));
    const wordmark = await bounds(image(page, 'small-brand-lockup', 'brand-wordmark'));
    expect(Math.abs(symbol.height - wordmark.height)).toBeLessThanOrEqual(0.5);
    expect(symbol.height).toBeCloseTo(await resolveToken(page, T('brand-lockup-symbol-size')), 0);
    expect(symbol.width).toBeCloseTo(symbol.height, 0);
    expect((await bounds(image(page, 'small-brand-symbol', 'brand-symbol'))).height).toBeCloseTo(await resolveToken(page, T('brand-symbol-size')), 0);
    await page.setViewportSize({ width: 390, height: 600 });
    await expect.poll(async () => Math.round((await image(page, 'small-brand-responsive', 'brand-symbol').boundingBox())?.height ?? 0)).toBe(Math.round(await resolveToken(page, T('brand-symbol-size'))));
  });

  test('APB-23: an unknown brand-layout is a lockup and is reported; an image in brand beside the parts shows alone and is reported; a brand without brand-label, and two images in one slot, still draw and are reported', async ({ page }) => {
    const seen = warnings(page);
    await page.setViewportSize({ width: 1024, height: 600 });
    await brandPage(page, `${NAMED} brand-layout="stacked"`, `${SYMBOL}${WORDMARK}`);
    await expect(brandBar(page).locator('[slot="brand-symbol"]')).toBeVisible();
    await expect(brandBar(page).locator('[slot="brand-wordmark"]')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('brand-layout "stacked"')).length).toBe(1);
    expect(seen.find((w) => w.includes('brand-layout "stacked"'))).toMatch(/drawn as "lockup" \(APB-23\)/);

    await brandPage(page, NAMED, `${markMarkup('wordmark', 'brand')}${SYMBOL}`);
    await expect(brandBar(page).locator('[slot="brand"]')).toBeVisible();
    await expect(brandBar(page).locator('[slot="brand-symbol"]')).toBeHidden();
    await expect.poll(() => seen.filter((w) => w.includes('shows the image in brand alone')).length).toBe(1);

    await brandPage(page, 'brand-href="#home"', SYMBOL);
    await expect.poll(() => seen.filter((w) => w.includes('no brand-label')).length).toBe(1);

    await brandPage(page, NAMED, `${SYMBOL}${SYMBOL}`);
    await expect(brandBar(page).locator('[slot="brand-symbol"]')).toHaveCount(2);
    await expect.poll(() => seen.filter((w) => w.includes('the brand-symbol slot holds 2 images')).length).toBe(1);
  });
});

test.describe('overflow', () => {
  /** The actions of a bar in reading order, with whether each is drawn. */
  const drawn = (page: P, id: string) => bar(page, id).evaluate((el) => [...el.querySelectorAll('[slot="actions"]')].map((item) => ({ label: item.getAttribute('label'), shown: item.getBoundingClientRect().width > 0, out: item.hasAttribute('app-bar-out') })));
  const shownLabels = async (page: P, id: string) => (await drawn(page, id)).filter((a) => a.shown).map((a) => a.label);
  const more = (page: P, id: string) => stage(page, id).getByRole('button', { name: 'More actions' });
  const moreHost = (page: P, id: string) => bar(page, id).locator('[part~="overflow-button"]');
  const overflowMenu = (page: P, id: string) => bar(page, id).locator('.overflow-menu');
  const widen = (page: P, id: string, width: string) =>
    stage(page, id).evaluate((el: HTMLElement, w) => {
      el.style.inlineSize = w;
    }, width);
  const settled = (page: P, id: string) => bar(page, id).evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const ALL = ['Search', 'Share', 'Edit', 'Archive', 'Delete', 'Print'];
  const OVERFLOW_FIXTURES = spec.fixtures.filter((f) => f.id.startsWith('small-overflow'));

  test('APB-26, APB-27: every action that fits is drawn, with no limit on their number; those that do not leave from the end and come back as soon as the room allows', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: OVERFLOW_FIXTURES });
    for (const id of ['small-overflow-menu', 'small-overflow-hide']) {
      const at360 = await drawn(page, id);
      const shown = at360.filter((a) => a.shown).map((a) => a.label);
      // From the end: what is drawn is the beginning of the reading order, and what is out carries the bar's mark.
      expect(shown, id).toEqual(ALL.slice(0, shown.length));
      expect(shown.length, id).toBeGreaterThan(0);
      expect(shown.length, id).toBeLessThan(ALL.length);
      expect(at360.filter((a) => a.out).map((a) => a.label), id).toEqual(ALL.slice(shown.length));
      // The last thing drawn at the end stays inside the row's end padding; the title keeps its whole width.
      const own = await bounds(bar(page, id));
      const padding = await resolveToken(page, T('container-padding-inline'));
      const last = id.endsWith('menu') ? await bounds(moreHost(page, id)) : await bounds(bar(page, id).locator(`[label="${shown.at(-1)}"]`));
      expect(last.x + last.width).toBeLessThanOrEqual(own.x + own.width - padding + 0.5);
      expect(await inner(page, id, '.row .title').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      // Room for all of them: every action is drawn, six of them, and no more button (APB-28).
      await widen(page, id, '1200px');
      await expect.poll(() => shownLabels(page, id), id).toEqual(ALL);
      await expect(more(page, id)).toHaveCount(0);
      // Narrowed again: the same ones leave.
      await widen(page, id, '360px');
      await expect.poll(() => shownLabels(page, id), id).toEqual(shown);
    }
    // Under menu the more button takes a place of its own: one action fewer than under hide, never the same count.
    expect((await shownLabels(page, 'small-overflow-menu')).length).toBeLessThan((await shownLabels(page, 'small-overflow-hide')).length);
  });

  test('APB-26: an action whose overflow is never stays and the one before it leaves; content that is not a Button never leaves; the title keeps its whole width first', async ({ page }) => {
    const items = ALL.map((label, i) => act(label, ['search', 'share', 'edit', 'archive', 'delete', 'print'][i]));
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [
        fixture('kept', { title: 'Inbox', overflowLabel: 'More actions' }, [BACK, ...items.slice(0, 5), keep(items[5])]),
        fixture('short', { title: 'Inbox', overflow: 'hide' }, [BACK, ...items]),
        fixture('long', { title: 'Messages from the whole team', overflow: 'hide' }, [BACK, ...items]),
      ],
    });
    const kept = await drawn(page, 'kept');
    expect(kept.at(-1)).toMatchObject({ label: 'Print', shown: true, out: false });
    const shown = kept.filter((a) => a.shown).map((a) => a.label);
    expect(shown.slice(0, -1)).toEqual(ALL.slice(0, shown.length - 1));
    // The more button stands after the last action drawn, which is the one kept.
    const [print, button] = [await bounds(bar(page, 'kept').locator('[label="Print"]')), await bounds(moreHost(page, 'kept'))];
    expect(button.x).toBeGreaterThan(print.x);
    // A wider title takes its room first: fewer actions are drawn beside it.
    expect((await shownLabels(page, 'long')).length).toBeLessThan((await shownLabels(page, 'short')).length);
    expect(await inner(page, 'long', '.row .title').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // Content of the actions slot that is not a Button is never taken out.
    await bar(page, 'short').evaluate((el) => {
      const span = document.createElement('span');
      span.slot = 'actions';
      span.className = 'not-a-button';
      span.textContent = 'Status';
      el.append(span);
    });
    await settled(page, 'short');
    await expect(bar(page, 'short').locator('.not-a-button')).toBeVisible();
    await expect(bar(page, 'short').locator('.not-a-button')).not.toHaveAttribute('app-bar-out', '');
  });

  test('APB-26: a large bar draws the same actions expanded and collapsed; the navigation item and the title block keep their room', async ({ page }) => {
    const items = ALL.map((label, i) => act(label, ['search', 'share', 'edit', 'archive', 'delete', 'print'][i]));
    await mountFixtures(page, spec, {
      icons: true,
      fixtures: [fixture('expanded', { size: 'large', title: 'Inbox', overflowLabel: 'More actions' }, [BACK, ...items]), fixture('collapsed', { size: 'large', title: 'Inbox', scrolled: true, overflowLabel: 'More actions' }, [BACK, ...items])],
    });
    const expanded = await shownLabels(page, 'expanded');
    expect(expanded.length).toBeLessThan(ALL.length);
    expect(await shownLabels(page, 'collapsed')).toEqual(expanded);
    // The navigation item keeps its size and place (APB-4).
    const [back, own] = [await bounds(bar(page, 'expanded').locator('[slot="navigation"]')), await bounds(bar(page, 'expanded'))];
    expect(back.x - own.x).toBe(await resolveToken(page, T('container-padding-inline')));
  });

  test('APB-28: the more button stands actions.gap after the last action drawn, an icon-only text Button showing more_horiz, named by overflow-label and exposed as a button that opens a menu, with its expanded state', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: OVERFLOW_FIXTURES });
    const id = 'small-overflow-menu';
    const button = more(page, id);
    await expect(button).toHaveCount(1);
    await expect(button).toHaveAttribute('aria-haspopup', 'menu');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    const host = moreHost(page, id);
    await expect(host).toHaveAttribute('variant', 'text');
    await expect(host).toHaveAttribute('size', 'medium');
    await expect(host.locator('[slot="icon"]')).toHaveText('more_horiz');
    const shown = await shownLabels(page, id);
    const [last, box] = [await bounds(bar(page, id).locator(`[label="${shown.at(-1)}"]`)), await bounds(host)];
    expect(box.x - (last.x + last.width)).toBeCloseTo(await resolveToken(page, T('actions-gap')), 1);
    expect(box.y + box.height / 2).toBeCloseTo(last.y + last.height / 2, 1);
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    // Under hide there is none.
    await expect(more(page, 'small-overflow-hide')).toHaveCount(0);
    await expect(bar(page, 'small-overflow-hide').locator('[part~="overflow-button"]')).toHaveCount(0);
  });

  test('APB-29: the menu holds the actions that are out in reading order, with their labels and glyphs; a row does what its action does, once, and closes the menu; a toggle is a checkbox item, a link a link item', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: OVERFLOW_FIXTURES });
    const id = 'small-overflow-menu';
    const out = (await drawn(page, id)).filter((a) => a.out).map((a) => a.label);
    await bar(page, id).evaluate((el) => {
      const clicks: string[] = [];
      (window as unknown as { clicks: string[] }).clicks = clicks;
      for (const item of el.querySelectorAll('[slot="actions"]')) item.addEventListener('click', () => clicks.push(item.getAttribute('label') ?? ''));
      el.addEventListener('click', (event) => {
        if ((event.composedPath()[0] as Element).closest?.('tanrei-menu-item')) clicks.push('leaked');
      });
    });
    await more(page, id).click();
    const menu = overflowMenu(page, id);
    await expect(menu).toHaveAttribute('open', '');
    // Bottom-end: below the more button, the end edges aligned — where the menu rests, once its appearance has ended.
    await motionEnded(page);
    const [button, surface] = [await bounds(moreHost(page, id)), await bounds(menu.locator('.surface').first())];
    expect(surface.y).toBeGreaterThanOrEqual(button.y + button.height - 0.5);
    expect(surface.x + surface.width).toBeCloseTo(button.x + button.width, 0);
    const rows = await menu.evaluate((el) => [...el.children].map((row) => `${row.localName}:${row.getAttribute('label')}:${row.getAttribute('leading-icon')}`));
    const glyph: Record<string, string> = { Search: 'search', Share: 'share', Edit: 'edit', Archive: 'archive', Delete: 'delete', Print: 'print' };
    expect(rows).toEqual(out.map((label) => `tanrei-menu-item:${label}:${glyph[label!]}`));
    await menu.locator(`tanrei-menu-item[label="${out[1]}"]`).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { clicks: string[] }).clicks)).toEqual([out[1]]);
    await expect(menu).not.toHaveAttribute('open');
    // A toggle is a checkbox item with its state; a link a link item to the same place.
    const last = bar(page, id).locator(`[slot="actions"][label="${out.at(-1)}"]`);
    await last.evaluate((el) => {
      el.setAttribute('toggle', '');
      el.setAttribute('selected', '');
    });
    const first = bar(page, id).locator(`[slot="actions"][label="${out[0]}"]`);
    await first.evaluate((el) => el.setAttribute('href', '#archive'));
    await settled(page, id);
    await more(page, id).click();
    await expect(menu.locator(`tanrei-menu-checkbox-item[label="${out.at(-1)}"]`)).toHaveAttribute('checked', '');
    await expect(menu.locator('tanrei-menu-item').first()).toHaveAttribute('href', '#archive');
    // While it is open, a change of what is out closes it.
    await widen(page, id, '1200px');
    await expect(menu).not.toHaveAttribute('open');
    expect(await page.evaluate(() => (window as unknown as { clicks: string[] }).clicks)).not.toContain('leaked');
  });

  test('APB-29, accessibility: Tab reaches the more button after the actions drawn; Enter opens the menu on its first item, the arrows move through it, Escape closes it and returns focus to the more button', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: OVERFLOW_FIXTURES });
    const id = 'small-overflow-menu';
    const shown = await shownLabels(page, id);
    const host = moreHost(page, id);
    await tabTo(page, bar(page, id).locator(`[label="${shown.at(-1)}"]`));
    await tab(page);
    await expect(host).toBeFocused();
    await page.keyboard.press('Enter');
    const menu = overflowMenu(page, id);
    await expect(menu).toHaveAttribute('open', '');
    const out = (await drawn(page, id)).filter((a) => a.out).map((a) => a.label);
    await expect(menu.locator(`tanrei-menu-item[label="${out[0]}"]`)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.locator(`tanrei-menu-item[label="${out[1]}"]`)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).not.toHaveAttribute('open');
    await expect(host).toBeFocused();
    // An action that is out is no stop of the tab order.
    await tab(page, { back: true });
    await expect(bar(page, id).locator(`[label="${shown.at(-1)}"]`)).toBeFocused();
  });

  test('APB-30: under hide an action that is out is drawn as nothing, takes no focus and is not exposed; it stays in the page with its listeners and comes back with the room', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: OVERFLOW_FIXTURES });
    const id = 'small-overflow-hide';
    const out = (await drawn(page, id)).filter((a) => a.out).map((a) => a.label);
    expect(out.length).toBeGreaterThan(0);
    for (const label of out) {
      const item = bar(page, id).locator(`[label="${label}"]`);
      await expect(item).toBeHidden();
      await expect(stage(page, id).getByRole('button', { name: label! })).toHaveCount(0);
    }
    // A page's own rule for the element cannot draw it (the bar's rule is important).
    await page.addStyleTag({ content: 'tanrei-app-bar > tanrei-button { display: inline-flex; }' });
    await expect(bar(page, id).locator(`[label="${out[0]}"]`)).toBeHidden();
    await bar(page, id)
      .locator(`[label="${out[0]}"]`)
      .evaluate((el) => el.addEventListener('click', () => ((window as unknown as { hit: boolean }).hit = true)));
    await widen(page, id, '1200px');
    await expect(stage(page, id).getByRole('button', { name: out[0]! })).toBeVisible();
    await stage(page, id).getByRole('button', { name: out[0]! }).click();
    expect(await page.evaluate(() => (window as unknown as { hit?: boolean }).hit)).toBe(true);
  });

  test('APB-31: an action with keyboard focus that goes out hands it to the more button (menu), or to the nearest action still drawn before it (hide), without scrolling', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: OVERFLOW_FIXTURES });
    for (const id of ['small-overflow-menu', 'small-overflow-hide']) {
      await widen(page, id, '1200px');
      await expect.poll(() => shownLabels(page, id), id).toEqual(ALL);
      await tabTo(page, bar(page, id).locator('[label="Print"]'));
      const scroll = await page.evaluate(() => [scrollX, scrollY]);
      await widen(page, id, '360px');
      await expect.poll(async () => (await drawn(page, id)).find((a) => a.label === 'Print')?.out, id).toBe(true);
      if (id.endsWith('menu')) await expect(moreHost(page, id), id).toBeFocused();
      else {
        const shown = await shownLabels(page, id);
        await expect(bar(page, id).locator(`[label="${shown.at(-1)}"]`), id).toBeFocused();
      }
      expect(await page.evaluate(() => [scrollX, scrollY]), id).toEqual(scroll);
    }
  });

  test('APB-26: right-to-left mirrors the order — the actions leave from the end of the reading order, and the more button is at the left end', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: OVERFLOW_FIXTURES });
    expect(await shownLabels(page, 'small-overflow-rtl')).toEqual(await shownLabels(page, 'small-overflow-menu'));
    const shown = await shownLabels(page, 'small-overflow-rtl');
    const [own, button, last, first, back] = [
      await bounds(bar(page, 'small-overflow-rtl')),
      await bounds(moreHost(page, 'small-overflow-rtl')),
      await bounds(bar(page, 'small-overflow-rtl').locator(`[label="${shown.at(-1)}"]`)),
      await bounds(bar(page, 'small-overflow-rtl').locator(`[label="${shown[0]}"]`)),
      await bounds(bar(page, 'small-overflow-rtl').locator('[slot="navigation"]')),
    ];
    expect(button.x).toBeLessThan(last.x);
    expect(last.x).toBeLessThan(first.x);
    expect(button.x - own.x).toBeCloseTo(await resolveToken(page, T('container-padding-inline')), 0);
    expect(back.x).toBeGreaterThan(first.x);
    await more(page, 'small-overflow-rtl').click();
    await expect(overflowMenu(page, 'small-overflow-rtl')).toHaveAttribute('open', '');
  });

  test('APB-32: what is out is decided before the first frame and in the frame the room changes — no action is drawn and then taken out, nothing moves after it, nothing is animated, and no observer loop', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true, fixtures: OVERFLOW_FIXTURES });
    const result = await page.evaluate(async () => {
      const errors: string[] = [];
      window.addEventListener('error', (event) => errors.push(event.message));
      const frame = () => new Promise<number>(requestAnimationFrame);
      const glyphs = ['search', 'share', 'edit', 'archive', 'delete', 'print', 'star', 'flag'];
      const holder = document.createElement('div');
      holder.style.inlineSize = '360px';
      document.body.append(holder);
      const appBar = document.createElement('tanrei-app-bar');
      appBar.setAttribute('scroll-target', 'none');
      appBar.setAttribute('headline', 'Inbox');
      appBar.setAttribute('overflow-label', 'More actions');
      appBar.innerHTML = `<tanrei-button slot="navigation" variant="text" label="Back"><span slot="icon">arrow_back</span></tanrei-button>${glyphs.map((g) => `<tanrei-button slot="actions" variant="text" label="${g}"><span slot="icon">${g}</span></tanrei-button>`).join('')}`;
      // Every mark the bar ever sets or takes off, from the start: an action drawn and then taken out would show here.
      const flips: string[] = [];
      new MutationObserver((records) => records.forEach((r) => flips.push(`${(r.target as Element).getAttribute('label')}:${(r.target as Element).hasAttribute('app-bar-out')}`))).observe(appBar, { attributes: true, subtree: true, attributeFilter: ['app-bar-out'] });
      const count = () => [...appBar.querySelectorAll('[slot="actions"]')].filter((child) => child.getBoundingClientRect().width > 0).length;
      const moreDrawn = () => {
        const button = appBar.shadowRoot?.querySelector('.more');
        return !!button && !button.classList.contains('idle');
      };
      holder.append(appBar);
      await frame();
      const first = { count: count(), more: moreDrawn() };
      await frame();
      await frame();
      const settled = { count: count(), more: moreDrawn() };
      const atStart = [...flips];
      // Where each action drawn stands: read in the frame after a change and two frames later, it is the same.
      const places = () => [...appBar.querySelectorAll('[slot="actions"]'), appBar.shadowRoot!.querySelector('.more')].map((item) => (item ? Math.round(item.getBoundingClientRect().x) : null)).join();
      const steps: [number, number, number][] = [];
      const moved: string[] = [];
      const heights = new Set<number>();
      for (const width of [1200, 360, 1200]) {
        holder.style.inlineSize = `${width}px`;
        await frame();
        const now = count();
        const placed = places();
        heights.add(Math.round(appBar.getBoundingClientRect().height));
        await frame();
        await frame();
        steps.push([width, now, count()]);
        if (places() !== placed) moved.push(`${width}: ${placed} -> ${places()}`);
      }
      const animations = appBar.shadowRoot!.getAnimations?.().length ?? 0;
      holder.remove();
      return { first, settled, steps, flipsAtStart: atStart, moved, heights: [...heights], animations, errors };
    });
    expect(result.first, 'the first frame shows what the last one does').toEqual(result.settled);
    expect(result.settled.count).toBeLessThan(8);
    expect(result.settled.more).toBe(true);
    // Each mark set once at the start, none taken off before the room changed.
    expect(result.flipsAtStart.filter((flip) => !flip.endsWith(':true')), result.flipsAtStart.join()).toEqual([]);
    for (const [width, now, later] of result.steps) expect(now, `${width}`).toBe(later);
    expect(result.steps[0][1]).toBe(8);
    expect(result.steps[1][1]).toBe(result.settled.count);
    expect(result.heights).toHaveLength(1);
    expect(result.animations).toBe(0);
    expect(result.moved).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test('APB-33: an overflow the bar does not define is menu, and reported; a more button without a name is still drawn and opens its menu, and the missing word is reported', async ({ page }) => {
    const seen = warnings(page);
    const items = ALL.map((label, i) => act(label, ['search', 'share', 'edit', 'archive', 'delete', 'print'][i]));
    await mountFixtures(page, spec, { icons: true, fixtures: [fixture('odd', { title: 'Inbox', overflow: 'wrap' }, [BACK, ...items])] });
    await expect.poll(() => seen.filter((w) => w.includes('APB-33')).length).toBeGreaterThanOrEqual(2);
    expect(seen).toEqual(expect.arrayContaining([expect.stringMatching(/overflow "wrap" is not a value of the app bar; it is drawn as "menu"/), expect.stringMatching(/toolbarOverflowLabel/)]));
    const host = moreHost(page, 'odd');
    await expect(host).toBeVisible();
    await host.click();
    await expect(overflowMenu(page, 'odd')).toHaveAttribute('open', '');
  });
});

test.describe('before its element is defined', () => {
  // Every fixture, and the bars a fixture does not show: a large bar that will follow the document (written scrolled, at
  // the top of a page that has just loaded: drawn expanded), a large bar with no title, and bars with no items.
  const more = [
    fixture('large-connected', { size: 'large', title: 'Inbox', subtitle: 'ada@example.com', scrolled: true }, [nav('Menu', 'menu'), SEARCH]),
    fixture('large-untitled', { size: 'large' }, [BACK, SEARCH]),
    fixture('large-alone', { size: 'large', title: 'Inbox', subtitle: 'ada@example.com' }),
    fixture('small-subtitle-alone', { title: 'Quarterly report', subtitle: 'Edited 5 minutes ago' }),
  ];
  /** Every stage, every bar and what follows them, as boxes. */
  const geometry = (page: P) =>
    page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('[data-fixture], [data-fixture] tanrei-app-bar, #after')].map((el) => {
          const r = el.getBoundingClientRect();
          return [`${el.closest('[data-fixture]')?.getAttribute('data-fixture') ?? 'after'} ${el.localName}`, [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(' ')];
        }),
      ),
    );

  for (const system of [undefined, 'cupertino'] as const) {
    test(`APB-34: with the app bar's stylesheet and no script every bar${system ? ` (${system})` : ''} is as high and as wide as once it is defined — the top row, an item's cell, a large bar's title row with its subtitle, a large bar that will follow the document — the content under it does not move, and Chromium records no layout shift`, async ({ page: first, browserName }) => {
      // A new window: one that has run the bundle keeps its elements defined, whatever document is written into it.
      const page = await first.context().newPage();
      await page.setViewportSize({ width: 480, height: 800 });
      const markup = await fixturesDocument(spec, { fixtures: [...spec.fixtures, ...more], icons: true, system });
      const script = markup.lastIndexOf('<script type="module">');
      // The page as a server sends it: the tokens, the stylesheet, the bars — and no script yet.
      await page.setContent(`${markup.slice(0, script).replace('</head>', `<style>${dist('app-bar.css')}</style></head>`)}<p id="after">After the bars.</p></body></html>`);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => !!customElements.get('tanrei-app-bar'))).toBe(false);
      // The bar that follows the document: no scroll-target, written scrolled, the page at its top.
      await bar(page, 'large-connected').evaluate((el) => el.removeAttribute('scroll-target'));
      const small = await resolveToken(page, T('container-height-small'));
      const large = await resolveToken(page, T('container-height-large'));
      const before = await geometry(page);
      const height = async (id: string) => (await bounds(bar(page, id))).height;
      // The heights each will have: a large bar's are larger, and its subtitle makes its title row taller still.
      expect(await height('small-title-only')).toBe(small);
      expect(await height('large-alone')).toBeGreaterThanOrEqual(large);
      expect(await height('large-scrolled')).toBe(await height('small'));
      expect(await height('large-subtitle')).toBeGreaterThan(await height('large'));
      // Nothing a slot holds is shown: a glyph is a name until its Button draws it.
      await expect(bar(page, 'small').locator('> [slot]').first()).toBeHidden();
      expect(await css(bar(page, 'small'), 'background-color')).toBe(await resolveColor(page, T('flat-container-color')));
      if (browserName === 'chromium') {
        await page.evaluate(() => {
          const w = window as unknown as { __shift: number };
          w.__shift = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) w.__shift += (entry as unknown as { value: number }).value;
          }).observe({ type: 'layout-shift', buffered: false });
        });
      }
      // The elements are defined.
      await page.addScriptTag({ type: 'module', content: dist('tanrei.bundle.js') });
      await page.waitForFunction(() => !!customElements.get('tanrei-app-bar'));
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      // …and they are the elements now: the connected bar is drawn expanded, and none of the stylesheet's rules matches.
      expect(await page.evaluate(() => document.querySelectorAll('tanrei-app-bar:not(:defined)').length)).toBe(0);
      await expect(inner(page, 'large-connected', '.expanded')).toBeVisible();
      expect(await bar(page, 'large-connected').evaluate((el) => el.hasAttribute('scrolled'))).toBe(false);
      expect(await geometry(page)).toEqual(before);
      if (browserName === 'chromium') expect(await page.evaluate(() => (window as unknown as { __shift: number }).__shift)).toBe(0);
      // The stylesheet is in the components' layer.
      expect(dist('app-bar.css')).toContain('@layer tanrei.components');
      await page.close();
    });
  }
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme, icons: true });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
    }
  });

  test('forced colors: the bottom edge is a system color wherever it is drawn — at rest under always, only while scrolled under scroll', async ({ page }) => {
    // Without motion, so that the switch to forced colors is not sampled half-way through the edge's transition.
    await mountFixtures(page, spec, {
      icons: true,
      reducedMotion: true,
      fixtures: [...spec.fixtures.filter((f) => f.id === 'small-scrolled' || f.id === 'small'), fixture('rest-scroll', { title: 'Inbox', dividerVisibility: 'scroll' }, [BACK])],
    });
    await page.emulateMedia({ forcedColors: 'active' });
    const forced = await page.evaluate(() => matchMedia('(forced-colors: active)').matches);
    test.skip(!forced, 'forced colors are not emulated by this browser');
    // Forced colors keep a color's alpha: an edge that is drawn is opaque, one that is not stays fully transparent.
    const alpha = async (id: string) => {
      const color = await css(inner(page, id, '.outline'), 'background-color');
      const match = /rgba\([^)]*,\s*([\d.]+)\)/.exec(color);
      return match ? Number(match[1]) : 1;
    };
    expect(await alpha('small-scrolled')).toBe(1);
    expect(await alpha('small')).toBe(1);
    expect(await alpha('rest-scroll')).toBe(0);
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expectBaseline(stage(page, f.id), [spec.name, `${f.id}.png`]);
    });
  }
});
