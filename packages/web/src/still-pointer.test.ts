// A surface that opens under a pointer at rest is the first frame of what it holds (MOT-3, docs/architecture/motion.md):
// the control the pointer is over is drawn hovered from the frame the engine hovers it, not faded into hover. The engines
// hover it some frames after the surface is drawn, each on its own clock — Chromium in the first frame after the opening
// one, Firefox in the second, WebKit some eight frames on, and in a sheet that slides in, WebKit once the slide has ended
// — so two frames of settling do not cover it.
// `holdStillPointer()` (src/primitives/motion.ts) holds it until the person next acts, and a hover the person's pointer
// makes afterwards moves as it always does.
//
// Each case opens a surface by script (as a key or a product's code does) with the pointer resting, or pressed and held,
// where one of its controls then stands, and samples the opening frame by frame (test/frames.ts): every motion is held
// at its start until a frame moves it on, so a hover transition that began would show as a hovered frame painted short
// of the hover's colors, on any machine. Then the pointer leaves the control and comes back: that hover moves.
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
  /** The control the pointer is over once it is open. */
  control: (host: Locator) => Locator;
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
    control: (host) => host.locator('tanrei-button.close'),
  },
  {
    name: "a full-screen search's back button",
    spec: search,
    // Live, as a product has it: the real modal view, not the one drawn in place for a fixture.
    fixture: closed(search, 'full-screen', { expanded: false, inline: false }),
    open: 'expanded',
    window: { width: 390, height: 700 },
    control: (host) => host.locator('tanrei-button.back'),
  },
  {
    name: "a menu's item",
    spec: menu,
    fixture: closed(menu, 'actions', { open: false }),
    open: 'open',
    window: popoverWindow,
    control: (host) => host.locator('tanrei-menu-item').first(),
  },
];

const setOpen = (host: Locator, property: string, open: boolean) =>
  host.evaluate((el, [name, value]) => ((el as unknown as Record<string, boolean>)[name as string] = value as boolean), [property, open] as const);

/**
 * Runs in the page: whether the control kept on `window.__stillControl` is hovered, and the background colors it paints
 * — its own and those of everything in its shadow root, in order — which a hover changes and a hover transition moves.
 */
const hoverPaint = () => {
  const control = (window as unknown as { __stillControl: Element }).__stillControl;
  const parts = [control, ...control.shadowRoot!.querySelectorAll('*')];
  return { hovered: control.matches(':hover'), paint: parts.map((part) => getComputedStyle(part).backgroundColor).join(' ') };
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
      await control.evaluate((el) => ((window as unknown as { __stillControl: Element }).__stillControl = el));

      await page.mouse.move(x, y);
      if (pointer === 'pressed') await page.mouse.down();
      // Frames enough for the latest of the engines' hovers: WebKit's after the sheet's slide has ended.
      const seen = await sampleFrames(page, () => setOpen(host, c.open, true), { elements: false, frames: 60, probe: hoverPaint });
      // As it rests with the pointer as it is: a menu item under a held button is drawn pressed, so the button is let go
      // only after.
      await motionEnded(page);
      const rest = await page.evaluate(hoverPaint);
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

// The hold is a rule in each element's shadow root (`stillPointerStyles`), composed by `TanreiElement` for every element
// that draws anything under a pointer. One whose spec says nothing it draws changes under a pointer has no hover to
// hold, and carries no rule for a hover at all (`drawsHover`).
const HOVERLESS: [spec: string, fixture: string, tag: string][] = [
  ['avatar', 'initials', 'tanrei-avatar'],
  ['avatar', 'group', 'tanrei-avatar-group'],
  ['swatch', 'default', 'tanrei-swatch'],
  ['empty-state', 'actions', 'tanrei-empty-state'],
  ['code-block', 'copy', 'tanrei-code-block'],
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
