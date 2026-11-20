// A closing navigation drawer keeps every row's glyph drawn while the panel slides out (NVD-22): what a row draws is
// taken away only by the window's start edge, which the panel crosses as it leaves, never by a frame of its own.
//
// Two paths close a modal drawer that is not collapsible, and each restyles the rows in its first frame in its own way:
// inside an app shell with a header the drawer is one held panel whose hiding is a delayed change of `visibility`
// (`navigation-drawer.styles.ts`), and outside one it is a `<dialog>` handed from modal to a popover as it leaves
// (`closeModal()`, src/primitives/modal-exit.ts). Both are read here the same way, in every engine:
//
// - the first frame, held still (`freezeFirstFrame`), is painted: each glyph's box holds as much ink as it did open;
// - every frame of the closing (`sampleFrames`) keeps each glyph that is still inside the window visible, opaque, shaped
//   as one glyph (its text no wider than it was open: a name drawn as letters is wider) and where it was in the panel.
import { type Locator, type Page, expect } from '@playwright/test';
import { type Frame, type Probe, frameAtRest, freezeFirstFrame, sampleFrames } from './frames.js';
import { motionEnded } from './motions.js';
import { decodePng } from './png.js';

/** Each row's glyph: its box, its offset from the panel's start edge, the width its text is shaped at, its visibility and the opacity it is drawn at. */
const glyphProbe: Probe = (root) => {
  const host = root.querySelector('tanrei-navigation-drawer')!;
  const panel = host.shadowRoot!.querySelector('.drawer')!.getBoundingClientRect();
  const out: Record<string, number | string> = {};
  /** The opacity an element is drawn at: its own and that of everything it is drawn inside, through slots and shadow roots. */
  const drawnOpacity = (el: Element) => {
    let opacity = 1;
    for (let at: Element | null = el; at && at !== document.documentElement; ) {
      opacity *= Number(getComputedStyle(at).opacity);
      at = at.assignedSlot ?? at.parentElement ?? ((at.parentNode as ShadowRoot | null)?.host ?? null);
    }
    return opacity;
  };
  [...host.querySelectorAll('tanrei-navigation-drawer-item')].forEach((item, i) => {
    const glyph = item.shadowRoot!.querySelector('.icon');
    if (!glyph) return;
    const box = glyph.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(glyph);
    const round = (n: number) => Math.round(n * 10) / 10;
    out[`x${i}`] = round(box.left);
    out[`y${i}`] = round(box.top);
    out[`w${i}`] = round(box.width);
    out[`h${i}`] = round(box.height);
    out[`offset${i}`] = round(box.left - panel.left);
    out[`shaped${i}`] = round(range.getBoundingClientRect().width);
    out[`visibility${i}`] = getComputedStyle(glyph).visibility;
    out[`opacity${i}`] = Math.round(drawnOpacity(glyph) * 1000) / 1000;
  });
  return out;
};

const rows = (frame: Frame) => Object.keys(frame.probe).filter((key) => key.startsWith('x')).map((key) => Number(key.slice(1)));

/** How many pixels of a glyph's box differ from the panel's color at its corner: its ink. */
async function ink(page: Page, frame: Frame, i: number): Promise<number> {
  const [x, y, width, height] = ['x', 'y', 'w', 'h'].map((axis) => Number(frame.probe[`${axis}${i}`]));
  const shot = decodePng(await page.screenshot({ clip: { x, y, width, height }, animations: 'allow' }));
  const [r0, g0, b0] = shot.data;
  let count = 0;
  for (let p = 0; p < shot.data.length; p += 4) if (Math.abs(shot.data[p]! - r0!) + Math.abs(shot.data[p + 1]! - g0!) + Math.abs(shot.data[p + 2]! - b0!) > 96) count++;
  return count;
}

/**
 * With the drawer open and at rest in `stage`, closes it twice by `close` (opening it again by `open` in between) and
 * holds every row's glyph to what it drew open: painted in the first frame, and drawn in every frame while it is inside
 * the window.
 */
export async function expectGlyphsKeptWhileClosing(page: Page, stage: Locator, { open, close, what }: { open: () => Promise<unknown>; close: () => Promise<unknown>; what: string }): Promise<void> {
  const shown = await frameAtRest(stage, { probe: glyphProbe, elements: false });
  const glyphs = rows(shown);
  expect(glyphs.length, `${what}: rows with a glyph`).toBeGreaterThan(1);
  const openInk = await Promise.all(glyphs.map((i) => ink(page, shown, i)));
  for (const [n, i] of glyphs.entries()) expect(openInk[n], `${what}: row ${i}'s glyph is painted open`).toBeGreaterThan(20);

  // The first frame, as it is painted.
  const frozen = await freezeFirstFrame(stage, close, { probe: glyphProbe, elements: false });
  try {
    for (const [n, i] of glyphs.entries()) {
      expect(frozen.frame.probe[`x${i}`], `${what}: row ${i}'s glyph in the first frame`).toBe(shown.probe[`x${i}`]);
      const painted = await ink(page, frozen.frame, i);
      expect(painted, `${what}: the ink of row ${i}'s glyph in the first frame of the closing (open: ${openInk[n]})`).toBeGreaterThanOrEqual(openInk[n]! * 0.9);
    }
  } finally {
    await frozen.release();
  }
  await motionEnded(page);
  await open();
  await motionEnded(page);

  // Every frame of the closing.
  const closing = await sampleFrames(stage, close, { probe: glyphProbe, elements: false });
  expect(closing.complete, what).toBe(true);
  expect(closing.frames.length, `${what}: frames of the closing`).toBeGreaterThan(3);
  for (const frame of closing.frames) {
    for (const i of glyphs) {
      const inside = Number(frame.probe[`x${i}`]) + Number(frame.probe[`w${i}`]) > 0;
      // The first three frames: the panel has not yet carried any glyph out of the window.
      if (frame.index < 3) expect(inside, `${what}: frame ${frame.index}, row ${i}'s glyph inside the window`).toBe(true);
      if (!inside) continue;
      const at = `${what}: frame ${frame.index} (${Math.round(frame.time)} ms), row ${i}'s glyph`;
      expect(frame.probe[`visibility${i}`], at).toBe('visible');
      expect(frame.probe[`opacity${i}`], at).toBe(1);
      expect(Math.abs(Number(frame.probe[`shaped${i}`]) - Number(shown.probe[`shaped${i}`])), `${at}: shaped as it was open`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(Number(frame.probe[`offset${i}`]) - Number(shown.probe[`offset${i}`])), `${at}: where it was in the panel`).toBeLessThanOrEqual(0.5);
    }
  }
}
