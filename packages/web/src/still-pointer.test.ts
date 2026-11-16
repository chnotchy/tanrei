// A surface that opens under a pointer at rest is the first frame of what it holds (MOT-3, docs/architecture/motion.md):
// the control the pointer is over is drawn hovered from the frame the engine hovers it, not faded into hover. The engines
// hover it some frames after the surface is drawn, each on its own clock — Chromium in the first frame after the opening
// one, Firefox in the second, WebKit some eight frames on, and in a sheet that slides in, WebKit once the slide has ended
// — so two frames of settling do not cover it.
// `holdStillPointer()` (src/primitives/motion.ts) holds it until the person next acts, and a hover the person's pointer
// makes afterwards moves as it always does.
//
// Each case opens a surface by script (as a key or a product's code does) with the pointer resting, or pressed and held,
// where one of its controls then stands, and samples the surface frame by frame as it opens (test/frames.ts): every
// motion in it is held at its start until a frame moves it on, so a hover transition that began would show as a hovered
// frame painted short of the hover's colors, on any machine. Then the pointer leaves the control and comes back: that hover moves.
import { type Locator, type Page, expect, test } from '@playwright/test';
import { sampleFrames } from '../test/frames.js';
import { type Fixture, type Spec, dialogWindow, fixtureHost, loadSpec, mountFixtures, popoverWindow } from '../test/harness.js';
import { boxAtRest } from '../test/at-rest.js';
import { motionEnded } from '../test/motions.js';
import { transitionsRun, watchTransitions } from '../test/transitions.js';
import { STILL_POINTER } from './styles/motion.js';

interface Case {
  /** What opens, and what the pointer is over. */
  name: string;
  spec: Spec;
  /** The fixture, as it is mounted closed. */
  fixture: Fixture;
  /** The property that opens it. */
  open: string;
  window: { width: number; height: number };
  /**
   * What opens, sampled frame by frame: it holds the control and every motion of its opening. What stays outside it is
   * not sampled — a search's bar, which the full-screen view covers as it opens: its hover leaves it there, under the
   * view, and Chromium at times begins, replaces and ends that transition between two frames.
   */
  surface: (host: Locator) => Locator;
  /** The control the pointer is over once it is open. */
  control: (host: Locator) => Locator;
  /**
   * The control is a row the component draws in its own shadow root as the surface opens (a search's suggestion): it is
   * not there while the surface is closed, so it is found as it opens, by where the pointer rests (`rowPaint`).
   */
  row?: true;
}

const closed = (spec: Spec, id: string, props: Fixture['props']): Fixture => {
  const fixture = spec.fixtures.find((f) => f.id === id);
  if (!fixture) throw new Error(`${spec.name} has no fixture ${id}`);
  return { ...fixture, props: { ...fixture.props, ...props } };
};

const dialog = loadSpec('dialog');
const sideSheet = loadSpec('side-sheet');
const menu = loadSpec('menu');
const search = loadSpec('search');

const CASES: Case[] = [
  {
    name: "a dialog's action",
    spec: dialog,
    fixture: closed(dialog, 'basic', { open: false }),
    open: 'open',
    window: dialogWindow('basic'),
    surface: (host) => host,
    control: (host) => host.locator('tanrei-button').last(),
  },
  {
    // The sheet slides in under the pointer. In real frames only WebKit hovers the button then, once the slide has ended;
    // sampled, the slide is moved on from script frame by frame, and every engine hovers it as it arrives.
    name: "a modal side sheet's close button",
    spec: sideSheet,
    fixture: closed(sideSheet, 'modal', { open: false }),
    open: 'open',
    window: { width: 720, height: 480 },
    surface: (host) => host,
    control: (host) => host.locator('tanrei-button.close'),
  },
  {
    name: "a full-screen search's back button",
    spec: search,
    // Live, as a product has it: the real modal view, not the one drawn in place for a fixture.
    fixture: closed(search, 'full-screen', { expanded: false, inline: false }),
    open: 'expanded',
    window: { width: 390, height: 700 },
    surface: (host) => host.locator('dialog.full'),
    control: (host) => host.locator('tanrei-button.back'),
  },
  {
    // The search draws its own rows in its shadow root: not elements of their own, held by a mark on the view.
    name: "a docked search's suggestion row",
    spec: search,
    fixture: closed(search, 'docked', { expanded: false, inline: false }),
    open: 'expanded',
    window: { width: 480, height: 640 },
    surface: (host) => host.locator('.view'),
    control: (host) => host.locator('.option[data-index="0"]'),
    row: true,
  },
  {
    // Not the query row: the search makes it active as the view opens (SRC-14), and active is drawn over hovered.
    name: "a full-screen search's suggestion row",
    spec: search,
    fixture: closed(search, 'full-screen', { expanded: false, inline: false }),
    open: 'expanded',
    window: { width: 390, height: 700 },
    surface: (host) => host.locator('dialog.full'),
    control: (host) => host.locator('.option[data-index="1"]'),
    row: true,
  },
  {
    name: "a menu's item",
    spec: menu,
    fixture: closed(menu, 'actions', { open: false }),
    open: 'open',
    window: popoverWindow,
    surface: (host) => host,
    control: (host) => host.locator('tanrei-menu-item').first(),
  },
];

const setOpen = (host: Locator, property: string, open: boolean) =>
  host.evaluate((el, [name, value]) => ((el as unknown as Record<string, boolean>)[name as string] = value as boolean), [property, open] as const);

/**
 * Runs in the page: whether the control kept on `window.__stillControl` is hovered, and the background colors it paints
 * — its own and those of everything in its shadow root (or, for a row a component draws in its own shadow root, inside
 * it), in order — which a hover changes and a hover transition moves.
 */
const hoverPaint = () => {
  const control = (window as unknown as { __stillControl: Element }).__stillControl;
  const parts = [control, ...(control.shadowRoot ?? control).querySelectorAll('*')];
  return { hovered: control.matches(':hover'), paint: parts.map((part) => getComputedStyle(part).backgroundColor).join(' ') };
};

/**
 * Runs in the page: the row under the point kept on `window.__stillAt` — a search's own row, or a result's in its shadow
 * root — its headline, whether it is hovered, and the colors it and everything in it paint. The innermost element at
 * the point may be the product's, slotted into the row (a result's link), so the row is looked for up the flat tree.
 */
const rowPaint = () => {
  const [x, y] = (window as unknown as { __stillAt: [number, number] }).__stillAt;
  let at: Element | null = document.elementFromPoint(x, y);
  while (at?.shadowRoot) {
    const inner = at.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === at) break;
    at = inner;
  }
  let row: Element | null = at;
  while (row && !row.matches('.option, .row')) row = row.assignedSlot ?? row.parentElement ?? ((row.parentNode as ShadowRoot | null)?.host || null);
  if (!row) return {};
  const parts = [row, ...row.querySelectorAll('*')];
  return {
    row: row.querySelector('.headline')?.textContent?.trim() ?? '',
    hovered: row.matches(':hover'),
    paint: parts.map((part) => `${getComputedStyle(part).backgroundColor} ${getComputedStyle(part).color}`).join(' '),
  };
};

/** Where the pointer goes to leave the control: below it and toward the start, inside the window. */
const away = (page: Page, x: number, y: number) => page.mouse.move(Math.max(4, x - 120), y + 60);

for (const c of CASES) {
  for (const pointer of ['resting', 'pressed'] as const) {
    test(`MOT-3: ${c.name} that opens under a ${pointer} pointer is drawn hovered at once, and a later hover moves`, async ({ page }) => {
      await page.setViewportSize(c.window);
      await mountFixtures(page, c.spec, { fixtures: [c.fixture] });
      const host = fixtureHost(page, c.spec, c.fixture.id);
      const control = c.control(host);

      // Where the control stands once the surface is open, read at rest; then closed again, to its end.
      await setOpen(host, c.open, true);
      await motionEnded(page);
      const box = await boxAtRest(control);
      await setOpen(host, c.open, false);
      await motionEnded(page);
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      if (c.row) await page.evaluate((point) => ((window as unknown as { __stillAt: [number, number] }).__stillAt = point), [x, y] as [number, number]);
      else await control.evaluate((el) => ((window as unknown as { __stillControl: Element }).__stillControl = el));
      const probe: () => { hovered?: boolean; paint?: string } = c.row ? rowPaint : hoverPaint;

      await page.mouse.move(x, y);
      if (pointer === 'pressed') await page.mouse.down();
      // Frames enough for the latest of the engines' hovers: WebKit's after the sheet's slide has ended.
      const seen = await sampleFrames(c.surface(host), () => setOpen(host, c.open, true), { elements: false, frames: 60, probe });
      // As it rests with the pointer as it is: a menu item under a held button is drawn pressed, so the button is let go
      // only after.
      await motionEnded(page);
      const rest = await page.evaluate(probe);
      if (pointer === 'pressed') await page.mouse.up();

      const hovered = seen.frames.filter((frame) => frame.probe.hovered === true);
      expect(hovered.length, 'the engine hovers the control before the pointer moves').toBeGreaterThan(0);
      expect(rest.hovered).toBe(true);
      for (const frame of hovered) expect(frame.probe.paint, `frame ${frame.index}: hovered, and painted as the hover rests`).toBe(rest.paint);

      // The person's pointer leaves the control and comes back: that hover moves, as every hover does.
      await away(page, x, y);
      await motionEnded(page);
      await watchTransitions(control);
      await page.mouse.move(x, y);
      await expect.poll(() => transitionsRun(control)).toContainEqual(expect.objectContaining({ property: 'background-color' }));
    });
  }
}

// The rows a view lists change under a pointer at rest: the person types, and the product answers with new suggestions
// or new results. A new row the pointer is over is drawn hovered from the frame the engine hovers it, as in a surface
// that opens: the key that asked for it ended the hold of the opening, and the engines hover the new row as late (WebKit
// later than an element's two frames of settling). The search holds it again as its rows change, until the person's
// next act.
const ANSWERS = [
  { name: 'a suggestion row', tag: 'tanrei-search-suggestion' },
  { name: 'a result', tag: 'tanrei-search-result' },
] as const;

for (const answer of ANSWERS) {
  test(`MOT-3: ${answer.name} a docked search lists under a resting pointer after a key is drawn hovered at once, and a later hover moves`, async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 640 });
    const fixture = closed(search, 'docked', { expanded: false, inline: false, value: '', queryRow: 'none' });
    await mountFixtures(page, search, { fixtures: [{ ...fixture, items: [] }] });
    const host = fixtureHost(page, search, fixture.id);
    // The product answers each input with three rows of its own, made anew, as a search for the typed text.
    await host.evaluate((el, tag) => {
      el.addEventListener('input', () => {
        const value = (el as unknown as { value: string }).value;
        el.querySelectorAll('tanrei-search-suggestion, tanrei-search-result').forEach((n) => n.remove());
        for (const n of ['a', 'b', 'c']) {
          const row = document.createElement(tag) as unknown as HTMLElement & Record<string, unknown>;
          Object.assign(row, { value: `${value} ${n}`, headline: `${value} ${n}`, leadingIcon: 'history' });
          if (tag === 'tanrei-search-result') Object.assign(row, { href: `#${n}`, leadingIcon: 'mail', textContent: `The ${value} ${n}` });
          el.append(row);
        }
      });
    }, answer.tag);
    await host.locator('.bar .input').focus();
    await page.keyboard.type('in');
    await setOpen(host, 'expanded', true);
    await motionEnded(page);

    // The pointer rests on the second row; the next key replaces every row, and a new one stands where it rests.
    const second = host.locator(answer.tag === 'tanrei-search-result' ? 'tanrei-search-result' : '.option').nth(1);
    const box = await boxAtRest(second);
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    await page.evaluate((point) => ((window as unknown as { __stillAt: [number, number] }).__stillAt = point), [x, y] as [number, number]);
    await page.mouse.move(x, y);
    await motionEnded(page);
    expect(await page.evaluate(rowPaint)).toEqual(expect.objectContaining({ row: 'in b', hovered: true }));

    const seen = await sampleFrames(host.locator('.view'), () => page.keyboard.press('v'), { elements: false, frames: 60, probe: rowPaint });
    await motionEnded(page);
    const rest = await page.evaluate(rowPaint);
    expect(rest).toEqual(expect.objectContaining({ row: 'inv b', hovered: true }));
    const hovered = seen.frames.filter((frame) => frame.probe.hovered === true && frame.probe.row === rest.row);
    expect(hovered.length, 'the engine hovers the new row before the pointer moves').toBeGreaterThan(0);
    for (const frame of hovered) expect(frame.probe.paint, `frame ${frame.index}: hovered, and painted as the hover rests`).toBe(rest.paint);

    // The person's pointer leaves the row and comes back: that hover moves, as every hover does.
    await away(page, x, y);
    await motionEnded(page);
    const watched = answer.tag === 'tanrei-search-result' ? host.locator('tanrei-search-result').nth(1) : host;
    await watchTransitions(watched);
    await page.mouse.move(x, y);
    await expect.poll(() => transitionsRun(watched)).toContainEqual(expect.objectContaining({ property: 'background-color', on: expect.stringMatching(/^div\.(option|row)\b/) }));
  });
}

// The hold is a rule in each element's shadow root (`stillPointerStyles`), composed by `TanreiElement` for every element
// that draws anything under a pointer. One whose spec says nothing it draws changes under a pointer, or that it draws
// nothing of its own, has no hover to hold, and carries no rule for a hover at all (`drawsHover`).
const HOVERLESS: [spec: string, fixture: string, tag: string][] = [
  ['avatar', 'initials', 'tanrei-avatar'],
  ['avatar', 'group', 'tanrei-avatar-group'],
  ['swatch', 'default', 'tanrei-swatch'],
  ['empty-state', 'actions', 'tanrei-empty-state'],
  ['code-block', 'copy', 'tanrei-code-block'],
  ['one-time-code-field', 'supporting', 'tanrei-one-time-code-field'],
];

/** Runs in the page: how many rules of the element's adopted stylesheets name the still-pointer attribute. */
const stillRules = (el: Element, attribute: string) =>
  [...el.shadowRoot!.adoptedStyleSheets].flatMap((sheet) => [...sheet.cssRules]).filter((rule) => rule.cssText.includes(attribute)).length;

test('MOT-3: an element that draws nothing under a pointer carries no rule that holds a hover; one that draws a hover carries it', async ({ page }) => {
  for (const [name, id, tag] of HOVERLESS) {
    const spec = loadSpec(name);
    await mountFixtures(page, spec, { fixtures: spec.fixtures.filter((f) => f.id === id) });
    const element = page.locator(`[data-fixture="${id}"] ${tag}`);
    await expect(element).toHaveCount(1);
    expect(await element.evaluate(stillRules, STILL_POINTER), `${tag} (${name}/${id})`).toBe(0);
  }
  // An element that draws a hover has it, inside these as anywhere: the code block's Copy button, the empty state's action.
  const button = loadSpec('button');
  await mountFixtures(page, button, { fixtures: button.fixtures.filter((f) => f.id === 'filled-medium') });
  expect(await fixtureHost(page, button, 'filled-medium').evaluate(stillRules, STILL_POINTER)).toBeGreaterThan(0);
});
