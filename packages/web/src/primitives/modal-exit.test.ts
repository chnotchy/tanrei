// How every modal surface leaves (src/primitives/modal-exit.ts, MDL-7: "keeping them drawn until the fade ends"): the
// dialog (centred, and as a sheet in a compact window), the modal layer, the modal side and bottom sheets, the image
// preview, the popover's sheet, the modal navigation drawer (sliding, and collapsible: narrowing back to its column),
// and the search's dialog and full-screen views. In every engine, frame by frame on a held clock (test/frames.ts):
// closed, the surface and its scrim stay drawn in the top layer and move to their closed look — no frame where they are
// gone before the motion ends — while focus is back on the opener from the first frame (MDL-5) and the page behind is
// no longer inert. Where motion is reduced it fades in place, drawn until it has, or, where its spec says so, is gone at
// once. Opened again while it leaves, it goes back from the values it shows, modal again.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { buildSync } from 'esbuild';
import { type Frames, type Probe, expectNoFlicker, sampleFrames } from '../../test/frames.js';
import { type Fixture, dialogWindow, fixtureHost, fixturesDocument, loadSpec, mountFixtures, popoverWindow } from '../../test/harness.js';
import { motionEnded } from '../../test/motions.js';

interface Surface {
  name: string;
  spec: string;
  fixture: string;
  window: { width: number; height: number };
  /** How it moves out: a fade, a slide (`translate` on one axis), or a narrowing (its width) where motion is not reduced. */
  exit: 'fade' | 'slide' | 'narrow';
  /** It draws a scrim (its `::backdrop` is not clear). */
  scrim: boolean;
  /** Where motion is reduced: it fades in place, or it disappears at once (the search's SRC-23). */
  reduced?: 'fade' | 'at-once';
  /** The boolean that opens it (`open`, or the search's `expanded`). */
  prop?: 'open' | 'expanded';
  /** What it is mounted with besides being closed (the search's real overlay, not its view drawn in place). */
  props?: Fixture['props'];
  /** Focus goes back to the element itself (the search's bar input or trigger, in its shadow root), not to the opener. */
  returnsToSelf?: boolean;
}

const SURFACES: Surface[] = [
  { name: 'dialog', spec: 'dialog', fixture: 'basic', window: dialogWindow('basic'), exit: 'fade', scrim: true },
  { name: 'dialog as a sheet', spec: 'dialog', fixture: 'compact', window: dialogWindow('compact'), exit: 'slide', scrim: true },
  { name: 'modal layer', spec: 'modal-layer', fixture: 'open', window: { width: 640, height: 640 }, exit: 'fade', scrim: true },
  { name: 'modal side sheet', spec: 'side-sheet', fixture: 'modal', window: { width: 800, height: 640 }, exit: 'slide', scrim: true },
  { name: 'modal bottom sheet', spec: 'bottom-sheet', fixture: 'modal', window: { width: 480, height: 640 }, exit: 'slide', scrim: true },
  { name: 'image preview', spec: 'image-preview', fixture: 'single', window: { width: 640, height: 640 }, exit: 'fade', scrim: false },
  { name: 'popover as a sheet', spec: 'popover', fixture: 'compact', window: popoverWindow, exit: 'slide', scrim: true },
  // NVD-22: it slides out over its fading scrim, at once where motion is reduced.
  { name: 'modal navigation drawer', spec: 'navigation-drawer', fixture: 'modal', window: { width: 480, height: 640 }, exit: 'slide', scrim: true, reduced: 'at-once' },
  // NVD-22, NVD-40: a collapsible one narrows back to its column over its fading scrim, and once it has, its column
  // takes the dialog's place; at once where motion is reduced.
  { name: 'collapsible modal navigation drawer', spec: 'navigation-drawer', fixture: 'modal-collapsible-closed', window: { width: 800, height: 640 }, exit: 'narrow', scrim: true, reduced: 'at-once' },
  ...(['dialog-results', 'full-screen'] as const).map(
    (fixture): Surface => ({
      name: fixture === 'full-screen' ? 'full-screen search' : 'search as a dialog',
      spec: 'search',
      fixture,
      window: fixture === 'full-screen' ? { width: 480, height: 640 } : { width: 800, height: 640 },
      exit: 'fade',
      scrim: fixture !== 'full-screen',
      reduced: 'at-once',
      prop: 'expanded',
      props: { inline: false },
      returnsToSelf: true,
    }),
  ),
];

const propOf = (surface: Pick<Surface, 'prop'>) => surface.prop ?? 'open';

/**
 * The surface's `<dialog>` (the first in the host's shadow root): whether it is drawn in the top layer, its opacity, its
 * translation, its width, its scrim's opacity, and where focus is — and, where the host draws no dialog (a collapsible
 * drawer's column), that none is drawn. Self-contained: it is sent as its source.
 */
const probe: Probe = (root) => {
  const dialog = root.shadowRoot?.querySelector('dialog');
  const focus = document.activeElement?.id ?? '';
  if (!dialog) return { drawn: false, modal: false, scrim: 0, focus };
  const style = getComputedStyle(dialog);
  const [tx = '0px', ty = '0px'] = style.translate === 'none' ? [] : style.translate.split(' ');
  return {
    drawn: style.display !== 'none' && (dialog.matches(':modal') || dialog.matches(':popover-open')),
    modal: dialog.matches(':modal'),
    opacity: Number(style.opacity),
    tx: Number.parseFloat(tx),
    ty: Number.parseFloat(ty),
    width: Math.round(dialog.getBoundingClientRect().width * 10) / 10,
    scrim: Number(getComputedStyle(dialog, '::backdrop').opacity),
    focus,
  };
};

/** The fixture, closed, so that the test opens it. */
const closed = (surface: Surface): Fixture => {
  const fixture = loadSpec(surface.spec).fixtures.find((f) => f.id === surface.fixture)!;
  return { ...fixture, props: { ...fixture.props, ...surface.props, [propOf(surface)]: false } };
};

/** Mounts the surface closed, with a button before it that has focus when it opens; returns its host. */
async function mount(page: Page, surface: Surface): Promise<Locator> {
  await page.setViewportSize(surface.window);
  const spec = loadSpec(surface.spec);
  await mountFixtures(page, spec, { icons: true, fixtures: [closed(surface)] });
  const host = fixtureHost(page, spec, surface.fixture);
  await host.evaluate((el, returnsToSelf) => {
    // Where focus goes back to the element itself, it is named so that the probe can tell it.
    if (returnsToSelf) el.id = 'returned';
    // The popover's opener is its anchor, which the stage puts before it.
    const anchor = el.getAttribute('anchor');
    if (anchor && document.getElementById(anchor)) return;
    el.insertAdjacentHTML('beforebegin', '<button id="opener" type="button">Open</button>');
  }, !!surface.returnsToSelf);
  return host;
}

const openerOf = (host: Locator) => host.evaluate((el) => el.getAttribute('anchor') ?? 'opener');
/** Where focus is back once it has closed: on the opener, or on the element itself. */
const returnOf = async (host: Locator, surface: Surface) => (surface.returnsToSelf ? 'returned' : openerOf(host));

type Openable = HTMLElement & { updateComplete: Promise<unknown> } & Record<string, unknown>;

/** Sets the boolean that opens it, and waits for the update. */
const toggle = (host: Locator, surface: Surface, to: boolean) =>
  host.evaluate(
    async (el: Openable, [prop, to]) => {
      el[prop] = to;
      await el.updateComplete;
    },
    [propOf(surface), to] as const,
  );

/** Opens it from its opener, as a product does, and waits for its entrance to end. */
async function open(page: Page, host: Locator, surface: Surface) {
  const opener = await openerOf(host);
  await page.locator(`#${opener}`).focus();
  await toggle(host, surface, true);
  await expect.poll(() => host.evaluate((el) => !!el.shadowRoot!.querySelector('dialog')?.matches(':modal'))).toBe(true);
  await motionEnded(host);
}

const close = (host: Locator, surface: Surface) => toggle(host, surface, false);

const value = (seen: Frames, i: number, name: string) => seen.frames[i]!.probe[name] as number;

/**
 * What a close shows, frame by frame: the surface drawn (and no longer modal) in every frame until its motion and its
 * scrim's have ended, moving there — never back, and never done in one jump — and gone at rest; focus on the opener
 * from the first frame.
 */
function expectLeaves(seen: Frames, surface: Surface, opener: string, { reduced = false } = {}) {
  const frames = seen.frames;
  // The motion ends in the frame where nothing it moves changes any more.
  const moving = frames.filter((frame, i) => i < frames.length - 1 && ['opacity', 'tx', 'ty', 'width', 'scrim'].some((name) => frame.probe[name] !== frames[i + 1]!.probe[name]));
  expect(moving.length, 'the exit is drawn over several frames').toBeGreaterThanOrEqual(4);
  const last = moving.at(-1)!.index;
  const gone = frames.filter((frame) => frame.index <= last && frame.probe.drawn !== true).map((frame) => `frame ${frame.index} (${frame.time.toFixed(0)} ms)`);
  expect(gone, 'the surface is drawn in the top layer in every frame of its exit').toEqual([]);
  expect(frames.filter((frame) => frame.probe.modal === true).map((frame) => frame.index), 'it is no longer modal from the first frame').toEqual([]);
  expect(frames[0]!.probe.focus, 'focus is back on the opener from the first frame (MDL-5)').toBe(opener);
  expect(seen.rest.probe.drawn, 'at rest it has left the top layer').toBe(false);
  const fades = reduced || surface.exit === 'fade';
  // Its way, to the frame where it ends.
  const way = (name: string) => frames.slice(0, last + 2).map((_, i) => value(seen, i, name));
  const steps = (values: number[]) => values.filter((v, i) => i > 0 && Math.abs(v - values[i - 1]!) > 1e-4).length;
  if (fades) {
    const opacity = way('opacity');
    expect(steps(opacity), `it fades over several frames: ${opacity.join(' → ')}`).toBeGreaterThanOrEqual(4);
    expect(opacity.at(-1), 'and has faded out by the end of its motion').toBeLessThan(0.05);
  } else if (surface.exit === 'narrow') {
    // To the frame where it ends, drawn: the frame after it is the column's, which draws no dialog.
    const width = frames.slice(0, last + 1).map((_, i) => value(seen, i, 'width'));
    expect(steps(width), `it narrows over several frames: ${width.join(' → ')}`).toBeGreaterThanOrEqual(4);
    expect(width.every((v, i) => i === 0 || v <= width[i - 1]! + 0.1), `it only narrows: ${width.join(' → ')}`).toBe(true);
    expect(width.at(-1)!, 'to its column').toBeLessThan(width[0]! / 2);
  } else {
    const axis = Math.abs(value(seen, last, 'tx')) > Math.abs(value(seen, last, 'ty')) ? 'tx' : 'ty';
    const offset = way(axis);
    expect(steps(offset), `it slides over several frames: ${offset.join(' → ')}`).toBeGreaterThanOrEqual(4);
    expect(Math.abs(offset.at(-1)!), 'out of view by the end of its motion').toBeGreaterThan(Math.abs(offset[0]!));
  }
  if (surface.scrim) {
    const scrim = way('scrim');
    expect(steps(scrim), `the scrim fades with it: ${scrim.join(' → ')}`).toBeGreaterThanOrEqual(4);
    expect(scrim.every((v, i) => i === 0 || v <= scrim[i - 1]! + 1e-4), `the scrim only fades out: ${scrim.join(' → ')}`).toBe(true);
    expect(scrim.at(-1), 'and is clear by the end of the motion').toBeLessThan(0.05);
  }
  expectNoFlicker(seen);
}

for (const surface of SURFACES) {
  test.describe(surface.name, () => {
    test(`MDL-7: closed, the ${surface.name} and its scrim stay drawn in the top layer until their exit has played, focus back at once (MDL-5)`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const host = await mount(page, surface);
      await open(page, host, surface);
      const opener = await openerOf(host);
      const seen = await sampleFrames(host, () => close(host, surface), { probe, elements: false });
      expectLeaves(seen, surface, await returnOf(host, surface));
      // The page behind is no longer inert: what is outside takes focus and presses.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.locator(`#${opener}`).focus();
      await expect(page.locator(`#${opener}`)).toBeFocused();
    });

    if (surface.reduced === 'at-once') {
      test(`MDL-7: where motion is reduced the ${surface.name} disappears at once, its scrim with it, focus back`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const host = await mount(page, surface);
        await open(page, host, surface);
        const seen = await sampleFrames(host, () => close(host, surface), { probe, elements: false });
        const drawn = seen.frames.filter((frame) => frame.probe.drawn !== false).map((frame) => `frame ${frame.index} (${frame.time.toFixed(0)} ms)`);
        expect(drawn, 'it is gone from the first frame').toEqual([]);
        expect(seen.frames[0]!.probe.focus, 'focus is back from the first frame').toBe(await returnOf(host, surface));
        expect(seen.rest.probe.drawn, 'and stays gone').toBe(false);
      });
    } else {
      test(`MDL-7: where motion is reduced the ${surface.name} fades out in place, drawn until it has`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const host = await mount(page, surface);
        await open(page, host, surface);
        const seen = await sampleFrames(host, () => close(host, surface), { probe, elements: false });
        expectLeaves(seen, surface, await returnOf(host, surface), { reduced: true });
        const moved = seen.frames.filter((frame) => frame.probe.tx !== seen.frames[0]!.probe.tx || frame.probe.ty !== seen.frames[0]!.probe.ty);
        expect(moved.map((frame) => frame.index), 'nothing slides').toEqual([]);
      });
    }

    test(`MDL-7, MOT-1: opened at the end of a task that outlasts its entrance, the ${surface.name}${surface.scrim ? ' and its scrim move' : ' moves'} in from the first frame drawn after that task`, async ({ page }) => {
      // WebKit dates a transition begun in a task from the frame drawn before it, which stands still while the task
      // runs: a surface and a scrim opened at the end of a task longer than their entrance were drawn whole in the first
      // frame after it (a modal date-time picker, its calendar rendered in the task that opens it, on a loaded runner).
      // The task here is held for longer than the entrance, and that frame is read in its frame callback, as drawn.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const host = await mount(page, surface);
      await page.locator(`#${await openerOf(host)}`).focus();
      const read = (dialog: HTMLDialogElement) => {
        const style = getComputedStyle(dialog);
        return { opacity: Number(style.opacity), translate: style.translate, scrim: Number(getComputedStyle(dialog, '::backdrop').opacity) };
      };
      const first = await host.evaluate(async (el: Openable, [source, prop]) => {
        el[prop] = true;
        await el.updateComplete;
        const dialog = el.shadowRoot!.querySelector('dialog')!;
        const motions = () => dialog.getAnimations({ subtree: true }).filter((animation) => (animation.effect as KeyframeEffect).target === dialog);
        const entrance = Math.max(0, ...motions().map((animation) => Number(animation.effect!.getComputedTiming().endTime)));
        const end = performance.now() + entrance + 200;
        while (performance.now() < end);
        const shown = (0, eval)(`(${source})`) as (dialog: HTMLDialogElement) => Record<string, number | string>;
        return new Promise<{ entrance: number; shown: Record<string, number | string>; at: string[] }>((resolve) =>
          requestAnimationFrame(() =>
            resolve({ entrance, shown: shown(dialog), at: motions().map((animation) => `${(animation as CSSTransition).transitionProperty}${(animation.effect as KeyframeEffect).pseudoElement !== null ? ' (scrim)' : ''} at ${Math.round(Number(animation.currentTime))} ms`) }),
          ),
        );
      }, [read.toString(), propOf(surface)] as const);
      expect(first.entrance, 'its entrance takes time').toBeGreaterThan(0);
      expect(first.at.length, 'it moves in').toBeGreaterThan(0);
      expect(first.at.filter((motion) => !motion.endsWith(' at 0 ms')), 'in the first frame after the task every motion of the surface and its scrim stands at its start').toEqual([]);
      if (surface.scrim) expect(first.shown.scrim, 'the scrim is clear in that frame').toBe(0);
      await motionEnded(host);
      const rest = await host.evaluate((el, source) => ((0, eval)(`(${source})`) as (dialog: HTMLDialogElement) => Record<string, number | string>)(el.shadowRoot!.querySelector('dialog')!), read.toString());
      expect(first.shown, 'and the surface is drawn where its entrance starts, not where it ends').not.toEqual(rest);
      if (surface.scrim) expect(rest.scrim, 'the scrim has faded in at rest').toBe(1);
    });

    test(`MDL-7, MOT-1: closed by work that outlasts its exit, the ${surface.name}${surface.scrim ? ' and its scrim move' : ' moves'} out from the first frame drawn after it, still drawn`, async ({ page }) => {
      // The exit is begun in the work that closes it, and WebKit dated it from the frame drawn before that work: where
      // the work outlasted the exit, the first frame after it had the exit over, and the surface and its scrim were gone
      // without a frame of their motion. Here it is closed in a frame callback, where WebKit's timeline holds that
      // frame's time on any machine (in a task its time depends on what the page did before: on this page, after the
      // entrance, WebKit on macOS read it afresh in the task, and the exit was not over); the work is held for longer
      // than the exit, and the first frame after it is read in its frame callback, as drawn.
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const host = await mount(page, surface);
      await open(page, host, surface);
      const returned = await returnOf(host, surface);
      const read = (dialog: HTMLDialogElement) => {
        const style = getComputedStyle(dialog);
        // Its place as numbers: open, one engine writes `none`, another `0px`, and one held at an exit's start `0px 0%`.
        const [x = 0, y = 0] = style.translate === 'none' ? [] : style.translate.split(' ').map((length) => Number.parseFloat(length));
        return {
          drawn: style.display !== 'none' && (dialog.matches(':modal') || dialog.matches(':popover-open')),
          opacity: Number(style.opacity),
          translate: `${x} ${y}`,
          scrim: Number(getComputedStyle(dialog, '::backdrop').opacity),
        };
      };
      const first = await host.evaluate(async (el: Openable, [source, prop]) => {
        const dialog = el.shadowRoot!.querySelector('dialog')!;
        const shown = (0, eval)(`(${source})`) as (dialog: HTMLDialogElement) => Record<string, boolean | number | string>;
        const before = shown(dialog);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        // In that frame's callback.
        el[prop] = false;
        await el.updateComplete;
        const motions = () => dialog.getAnimations({ subtree: true }).filter((animation) => (animation.effect as KeyframeEffect).target === dialog);
        const exit = Math.max(0, ...motions().map((animation) => Number(animation.effect!.getComputedTiming().endTime)));
        const end = performance.now() + exit + 200;
        while (performance.now() < end);
        return new Promise<{ before: Record<string, boolean | number | string>; exit: number; shown: Record<string, boolean | number | string>; at: string[]; focus: string }>((resolve) =>
          requestAnimationFrame(() =>
            resolve({
              before,
              exit,
              shown: shown(dialog),
              at: motions().map((animation) => `${(animation as CSSTransition).transitionProperty}${(animation.effect as KeyframeEffect).pseudoElement !== null ? ' (scrim)' : ''} at ${Math.round(Number(animation.currentTime))} ms`),
              focus: document.activeElement?.id ?? '',
            }),
          ),
        );
      }, [read.toString(), propOf(surface)] as const);
      expect(first.exit, 'its exit takes time').toBeGreaterThan(0);
      expect(first.at.length, `it moves out: ${first.at.join(', ')}`).toBeGreaterThan(0);
      expect(first.at.filter((motion) => !motion.endsWith(' at 0 ms')), 'in the first frame after that work every motion of the surface and its scrim stands at its start').toEqual([]);
      if (surface.scrim) expect(first.at.some((motion) => motion.includes('(scrim)')), `the scrim fades out: ${first.at.join(', ')}`).toBe(true);
      expect(first.shown, 'and the surface and its scrim are drawn as they were shown open, in the top layer').toEqual(first.before);
      expect(first.focus, 'focus is back on the opener (MDL-5)').toBe(returned);
      // And it still leaves: its exit plays to its end, and then it is out of the top layer, not modal, not inert (or,
      // a collapsible drawer, its column has taken the dialog's place).
      await motionEnded(host);
      await expect
        .poll(() =>
          host.evaluate((el) => {
            const dialog = el.shadowRoot!.querySelector('dialog');
            if (!dialog) return { drawn: false, open: false, leaving: false, inert: false };
            return { drawn: getComputedStyle(dialog).display !== 'none', open: dialog.open, leaving: dialog.hasAttribute('data-tanrei-leaving'), inert: dialog.inert };
          }),
        )
        .toEqual({ drawn: false, open: false, leaving: false, inert: false });
    });

    test(`MOT-2: opened again while it leaves, the ${surface.name} goes back from what it shows, modal again`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const host = await mount(page, surface);
      await open(page, host, surface);
      // Closed, and its exit held a third of the way (the dialog's and its scrim's transitions); then opened again.
      const read = await host.evaluate(async (el: Openable, prop) => {
        const dialog = el.shadowRoot!.querySelector('dialog')!;
        const shown = () => {
          const style = getComputedStyle(dialog);
          return { opacity: Number(style.opacity), translate: style.translate, scrim: Number(getComputedStyle(dialog, '::backdrop').opacity), modal: dialog.matches(':modal'), drawn: style.display !== 'none' };
        };
        el[prop] = false;
        await el.updateComplete;
        const exit = dialog.getAnimations({ subtree: true });
        for (const animation of exit) {
          animation.pause();
          animation.currentTime = Number(animation.effect!.getComputedTiming().endTime) / 3;
        }
        const leaving = shown();
        el[prop] = true;
        await el.updateComplete;
        const back = shown();
        const entrance = dialog.getAnimations({ subtree: true }).map((animation) => (animation as CSSTransition).transitionProperty);
        return { leaving, back, entrance, exits: exit.length };
      }, propOf(surface));
      expect(read.exits, 'the exit was running').toBeGreaterThan(0);
      expect(read.leaving.drawn && !read.leaving.modal, 'a third of the way out, it is drawn and not modal').toBe(true);
      expect(read.back.modal, 'opened again, it is modal').toBe(true);
      expect(Math.abs(read.back.opacity - read.leaving.opacity), `its opacity goes on from ${read.leaving.opacity} (${read.back.opacity})`).toBeLessThan(0.02);
      expect(read.back.translate, 'its place goes on from where it was').toBe(read.leaving.translate);
      if (surface.scrim) expect(Math.abs(read.back.scrim - read.leaving.scrim), `its scrim goes on from ${read.leaving.scrim} (${read.back.scrim})`).toBeLessThan(0.02);
      expect(read.entrance.length, 'and moves back in').toBeGreaterThan(0);
      await motionEnded(host);
      const rest = await host.evaluate((el) => {
        const dialog = el.shadowRoot!.querySelector('dialog')!;
        return { modal: dialog.matches(':modal'), opacity: Number(getComputedStyle(dialog).opacity), scrim: Number(getComputedStyle(dialog, '::backdrop').opacity), leaving: dialog.hasAttribute('data-tanrei-leaving'), inert: dialog.inert };
      });
      expect(rest).toEqual({ modal: true, opacity: 1, scrim: surface.scrim ? 1 : rest.scrim, leaving: false, inert: false });
    });
  });
}

/**
 * The modal surfaces above, written open in the page's markup (the search's views opened by `expanded`: the harness
 * draws an expanded search's view in place unless `inline` is false). A collapsible modal drawer written open is drawn
 * open from its first frame as NVD-40 says (its own test).
 */
const WRITTEN_OPEN: (Pick<Surface, 'name' | 'spec' | 'fixture' | 'window' | 'scrim'> & { open: Fixture['props'] })[] = SURFACES.map((surface) => ({
  ...surface,
  open: { ...surface.props, [propOf(surface)]: true },
}));

for (const surface of WRITTEN_OPEN) {
  test(`MOT-4: written open in the page's markup, the ${surface.name}${surface.scrim ? ' and its scrim are' : ' is'} drawn open at once — no transition starts on its dialog before the document's first paint`, async ({ page }) => {
    // Its dialog's own fade is no part of an AppearController's motion element where that is inside the dialog (an
    // image preview's pages, a modal layer's content): left to itself it would play over the first frames, everything
    // in it translucent, so the dialog and its scrim are drawn at once before the first paint. Every transition that
    // starts on a dialog in a shadow root is counted from before the first element is made (WebKit names no
    // pseudo-element for a scrim's: the dialog's and its scrim's are counted alike).
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize(surface.window);
    const spec = loadSpec(surface.spec);
    const fixture = spec.fixtures.find((f) => f.id === surface.fixture)!;
    const count = `<script>window.__runs = []; const attach = Element.prototype.attachShadow; Element.prototype.attachShadow = function (init) { const root = attach.call(this, init); root.addEventListener('transitionrun', (event) => { if (event.target.localName === 'dialog') window.__runs.push(event.target.localName + event.pseudoElement + ' ' + event.propertyName); }); return root; };</script>`;
    const markup = await fixturesDocument(spec, { icons: true, fixtures: [{ ...fixture, props: { ...fixture.props, ...surface.open } }], lead: count });
    await page.route('http://modal-exit.test/', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: markup }));
    await page.goto('http://modal-exit.test/');
    const host = fixtureHost(page, spec, surface.fixture);
    await expect.poll(() => host.evaluate((el) => !!el.shadowRoot?.querySelector('dialog')?.matches(':modal'))).toBe(true);
    // What it draws now, and what the engine has told of the transitions begun by then, a frame later (it tells of a
    // transition in the frame after the one it began in).
    const seen = await host.evaluate(async (el) => {
      const dialog = el.shadowRoot!.querySelector('dialog')!;
      const at = { opacity: getComputedStyle(dialog).opacity, translate: getComputedStyle(dialog).translate, scrim: getComputedStyle(dialog, '::backdrop').opacity };
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { ...at, runs: (window as unknown as { __runs: string[] }).__runs };
    });
    expect(seen.runs, 'no transition starts on its dialog or its scrim').toEqual([]);
    expect(seen.opacity, 'it is drawn whole').toBe('1');
    await motionEnded(host);
    const rest = await host.evaluate((el) => {
      const dialog = el.shadowRoot!.querySelector('dialog')!;
      return { opacity: getComputedStyle(dialog).opacity, translate: getComputedStyle(dialog).translate, scrim: getComputedStyle(dialog, '::backdrop').opacity };
    });
    expect(seen, 'it stands where it rests, and its scrim is drawn as it rests').toMatchObject(rest);
  });
}

// openModal()'s `keep` (NVD-19: a modal navigation drawer opened while its selected destination has focus keeps it
// there), on a page of its own: a host whose shadow root holds a `<dialog>` with two controls of its own (`first`, then
// `own`), and two elements slotted into the host whose shadow roots each hold a control (`lead`, then `cell`, as a
// drawer's destinations). Each element kept comes after another that the engines would focus in its place, so that what
// keeps it is seen. Every focus and blur is logged, in every tree, from just before openModal() to two frames
// after it: what the dialog focusing steps of `showModal()` did is in the log the call leaves, and nothing may come
// after it.
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const KEEP_PAGE = 'http://modal-keep.test/';

/** openModal() and closeModal() as they are built, with what they import, as one module a page can import. */
let keepBundle: string | undefined;
const keepModule = () =>
  (keepBundle ??= buildSync({
    stdin: { contents: "export { closeModal, openModal } from './dist/primitives/modal-exit.js';\n", resolveDir: pkg, loader: 'js' },
    bundle: true,
    write: false,
    format: 'esm',
  }).outputFiles[0]!.text);

/**
 * `<x-modal>`'s dialog fades out over a long time when it closes, so that a dialog closed with closeModal() is still
 * leaving when the test opens it again; `<x-item>` is the slotted element. Before the dialog opens, the slot is in a
 * `<div>` beside it, drawn, as a collapsible drawer's column holds its destinations; the test moves the slot into the
 * dialog, as the drawer's template does as it opens: the slotted element is not moved, and keeps focus.
 */
const KEEP_MARKUP = `<button id="outside" type="button">outside</button><x-modal id="host"><x-item id="lead"></x-item><x-item id="item"></x-item></x-modal>
<script type="module">
  import { closeModal, openModal } from '/modal-keep.js';
  customElements.define('x-item', class extends HTMLElement {
    constructor() {
      super();
      const id = this.id === 'item' ? 'cell' : this.id;
      this.attachShadow({ mode: 'open' }).innerHTML = '<button id="' + id + '" type="button">' + id + '</button>';
    }
  });
  customElements.define('x-modal', class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML =
        '<style>dialog { opacity: 0; transition: opacity 600s linear; } dialog[open] { opacity: 1; }</style>' +
        '<div id="column"><slot></slot></div><dialog id="dialog"><button id="first" type="button">first</button><button id="own" type="button">own</button></dialog>';
    }
  });
  // A focus that moves between two elements of one tree is not seen past that tree's root (its target and its related
  // target are the same there): each tree logs the moves inside it, the document and each shadow root.
  window.focusLog = [];
  const watch = (root) => {
    for (const type of ['focusin', 'focusout']) {
      root.addEventListener(type, (event) => {
        const target = event.composedPath()[0];
        if (target.getRootNode() === root) window.focusLog.push(type + ' ' + (target.id || target.localName));
      }, true);
    }
  };
  watch(document);
  for (const element of document.querySelectorAll('x-modal, x-item')) watch(element.shadowRoot);
  window.keep = { closeModal, openModal };
</script>`;

async function openKeepPage(page: Page) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>keep</title></head><body>${KEEP_MARKUP}</body></html>`;
  await page.unroute(KEEP_PAGE);
  await page.unroute(`${KEEP_PAGE}modal-keep.js`);
  await page.route(KEEP_PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body }));
  await page.route(`${KEEP_PAGE}modal-keep.js`, (route) => route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: keepModule() }));
  await page.goto(KEEP_PAGE);
  await expect.poll(() => page.evaluate(() => 'keep' in window)).toBe(true);
}

type Kept = 'own' | 'cell';
interface Opened {
  /** Logged within openModal(). */
  log: string[];
  /** Logged in the two frames after it. */
  after: string[];
  /** The deepest element with focus once openModal() returns, and two frames later. */
  active: string;
  activeAfter: string;
  modal: boolean;
  /** Whether the kept element carries `autofocus` afterwards. */
  autofocus: boolean;
}

/**
 * Moves the slot into the dialog, takes it to leaving where `from` is `leaving` (opened, then closed `interactive`, as
 * a collapsible drawer narrowing to its column: not modal, still drawn, taking focus), focuses `focused`, and opens the
 * dialog with `keep` — given `autofocus` of its own first where `ownAutofocus` says so.
 */
const openKeeping = (page: Page, options: { keep: Kept; focused: Kept | 'outside'; from: 'closed' | 'leaving'; ownAutofocus?: boolean }) =>
  page.evaluate(async ({ keep, focused, from, ownAutofocus }): Promise<Opened> => {
    const w = window as unknown as {
      focusLog: string[];
      keep: {
        openModal(dialog: HTMLDialogElement, options?: { instant?: boolean; keep?: HTMLElement | null }): void;
        closeModal(dialog: HTMLDialogElement, options?: { interactive?: boolean }): Promise<boolean>;
      };
    };
    const root = document.getElementById('host')!.shadowRoot!;
    const dialog = root.getElementById('dialog') as HTMLDialogElement;
    const elements: Record<Kept | 'outside', HTMLElement> = {
      own: root.getElementById('own')!,
      cell: document.getElementById('item')!.shadowRoot!.getElementById('cell')!,
      outside: document.getElementById('outside')!,
    };
    const deep = () => {
      let at = document.activeElement;
      while (at?.shadowRoot?.activeElement) at = at.shadowRoot.activeElement;
      return at?.id || at?.localName || '';
    };
    const kept = elements[keep];
    // Keeping a slotted element, the dialog's own tree has nothing to focus, as a drawer's has not: what Firefox and
    // WebKit focus in its place is the dialog itself, and Chromium the first slotted control.
    if (keep === 'cell') for (const control of root.querySelectorAll('dialog > button')) control.remove();
    if (ownAutofocus) kept.setAttribute('autofocus', '');
    if (from === 'leaving') {
      dialog.append(root.querySelector('slot')!);
      w.keep.openModal(dialog, { instant: false });
      void w.keep.closeModal(dialog, { interactive: true });
      elements[focused].focus();
    } else {
      // Focused where it is drawn before the dialog opens, then the slot goes into the dialog.
      elements[focused].focus();
      dialog.append(root.querySelector('slot')!);
    }
    w.focusLog.length = 0;
    w.keep.openModal(dialog, { instant: false, keep: kept });
    const log = [...w.focusLog];
    const active = deep();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { log, after: w.focusLog.slice(log.length), active, activeAfter: deep(), modal: dialog.matches(':modal'), autofocus: kept.hasAttribute('autofocus') };
  }, options);

/** The focus out of the slotted element to the dialog itself and back that Firefox's and WebKit's `showModal()` makes. */
const THROUGH_THE_DIALOG = ['focusout cell', 'focusin dialog', 'focusout dialog', 'focusin cell'];

test.describe('openModal() keep', () => {
  test('NVD-19: an element of the dialog’s own tree that has focus keeps it as the dialog is taken back while it leaves — no focus moves at all, in every engine', async ({ page }) => {
    await openKeepPage(page);
    const opened = await openKeeping(page, { keep: 'own', focused: 'own', from: 'leaving' });
    expect(opened.log, 'the dialog focusing steps find it by its autofocus, focused already: no focus moves').toEqual([]);
    expect(opened.after, 'nor after').toEqual([]);
    expect(opened).toMatchObject({ active: 'own', activeAfter: 'own', modal: true, autofocus: false });
  });

  for (const from of ['closed', 'leaving'] as const) {
    test(`NVD-19: an element slotted into the dialog that has focus has it once openModal() returns (${from === 'closed' ? 'opened' : 'taken back while it leaves'}) — Chromium moves no focus; Firefox and WebKit, whose showModal() looks only in the dialog’s own tree as the standard says, give it to the dialog and back within the call; nothing moves after it`, async ({ page, browserName }) => {
      await openKeepPage(page);
      const opened = await openKeeping(page, { keep: 'cell', focused: 'cell', from });
      // The dialog focusing steps look among the dialog's descendants, and a slotted element is none of them
      // (whatwg/html#9245, #12649): Firefox and WebKit focus the dialog itself, and openModal() gives focus back in the
      // same task. Chromium looks through slots, finds the element's autofocus, and moves no focus. A change in this
      // log is an engine changing where it looks (openModal()'s `keep` says what each does).
      expect(opened.log, 'within openModal()').toEqual(browserName === 'chromium' ? [] : THROUGH_THE_DIALOG);
      expect(opened.after, 'nothing moves focus after it: no frame shows the dialog focused').toEqual([]);
      expect(opened).toMatchObject({ active: 'cell', activeAfter: 'cell', modal: true, autofocus: false });
    });
  }

  test('NVD-19: focus elsewhere goes to the kept element — of the dialog’s own tree in one move in every engine, slotted in one move in Chromium (Firefox and WebKit through the dialog) — and an autofocus of its own stays', async ({ page, browserName }) => {
    await openKeepPage(page);
    const own = await openKeeping(page, { keep: 'own', focused: 'outside', from: 'closed', ownAutofocus: true });
    expect(own.log).toEqual(['focusout outside', 'focusin own']);
    expect(own).toMatchObject({ after: [], active: 'own', activeAfter: 'own', modal: true, autofocus: true });
    await openKeepPage(page);
    const cell = await openKeeping(page, { keep: 'cell', focused: 'outside', from: 'closed' });
    expect(cell.log).toEqual(browserName === 'chromium' ? ['focusout outside', 'focusin cell'] : ['focusout outside', 'focusin dialog', 'focusout dialog', 'focusin cell']);
    expect(cell).toMatchObject({ after: [], active: 'cell', activeAfter: 'cell', modal: true, autofocus: false });
  });

  test('MDL-3, MOT-3: with nothing to keep, focus goes to the dialog itself in one move — never through its first control, whose state would begin a motion for a focus it holds for no frame — and nothing in it is left inert', async ({ page }) => {
    await openKeepPage(page);
    const opened = await page.evaluate(async () => {
      const w = window as unknown as { focusLog: string[]; keep: { openModal(dialog: HTMLDialogElement, options?: { instant?: boolean }): void } };
      const root = document.getElementById('host')!.shadowRoot!;
      const dialog = root.getElementById('dialog') as HTMLDialogElement;
      document.getElementById('outside')!.focus();
      w.focusLog.length = 0;
      w.keep.openModal(dialog, { instant: false });
      const log = [...w.focusLog];
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { log, after: w.focusLog.slice(log.length), active: (root.activeElement as HTMLElement | null)?.id ?? '', inert: [...dialog.querySelectorAll('*')].filter((el) => (el as HTMLElement).inert).length };
    });
    expect(opened).toEqual({ log: ['focusout outside', 'focusin dialog'], after: [], active: 'dialog', inert: 0 });
  });
});
