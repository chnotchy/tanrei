// A glyph of the icon set while its font cannot draw it yet, and once it can: what a component draws in the glyph's
// place (nothing — never the glyph's name spelled in a text face), where its boxes stand (where they stood: nothing
// moves), and the glyph once the face arrives. The face is held back as the checkbox's test holds it back (CHK-19): the
// icon set's families are named as a family no machine has (`withoutIconFont()`), and the default icon face is then
// registered under that name (`iconFaceArrives()`).
import { type Locator, type Page, expect } from '@playwright/test';
import { iconFaceArrives, withoutIconFont } from './harness.js';

/** One glyph box of a component. */
export interface HeldGlyph {
  /** What the case is called in a failure. */
  name: string;
  /** The component's element. */
  host: Locator;
  /** The glyph's box in the host's shadow root: the element `GlyphDrawnController` marks `data-drawn`. */
  box: string;
}

/** What one glyph box draws now. */
interface Reading {
  /** Whether the box is marked drawable. */
  drawn: boolean;
  /** The text in the box — its own, and what its slots hold — that is painted: a name the face cannot draw is not. */
  painted: string[];
  /** The text in the box, painted or not. */
  text: string[];
  /** The box's place in the host and its size, and the host's size: what a glyph's face could move. */
  box: { x: number; y: number; width: number; height: number };
  host: { width: number; height: number };
}

const read = (glyph: HeldGlyph): Promise<Reading> =>
  glyph.host.evaluate((el, selector) => {
    const box = el.shadowRoot!.querySelector<HTMLElement>(selector);
    if (!box) throw new Error(`no ${selector} in the shadow root`);
    const painted: string[] = [];
    const text: string[] = [];
    // The box's text, in the tree it is drawn in: its own children, and what its slots hold.
    const visit = (node: Node) => {
      if (node instanceof HTMLSlotElement) {
        for (const each of node.assignedNodes({ flatten: true })) visit(each);
        return;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const words = (node as Text).data.trim();
        if (!words) return;
        text.push(words);
        const parent = (node as Text).parentElement!;
        if (getComputedStyle(parent).visibility === 'visible' && parent.checkVisibility()) painted.push(words);
        return;
      }
      // The box a slot's glyph box is heard by is never drawn (src/primitives/glyph.ts, `probeOf`).
      if (node instanceof Element && !node.hasAttribute('data-tanrei-glyph-probe')) for (const child of node.childNodes) visit(child);
    };
    visit(box);
    const outer = el.getBoundingClientRect();
    const inner = box.getBoundingClientRect();
    return {
      drawn: box.hasAttribute('data-drawn'),
      painted,
      text,
      box: { x: inner.x - outer.x, y: inner.y - outer.y, width: inner.width, height: inner.height },
      host: { width: outer.width, height: outer.height },
    };
  }, glyph.box);

/** The two places within a hundredth of a pixel. */
function expectSamePlace(now: Reading, before: Reading, name: string, when: string) {
  const near = (a: number, b: number, what: string) => expect(Math.abs(a - b), `${name}: ${what} ${when} (${b} → ${a})`).toBeLessThan(0.01);
  for (const side of ['x', 'y', 'width', 'height'] as const) near(now.box[side], before.box[side], `the glyph’s box keeps its ${side}`);
  for (const side of ['width', 'height'] as const) near(now.host[side], before.host[side], `the component keeps its ${side}`);
}

/**
 * Holds every glyph's face back, and lets it arrive. While it is held back each box draws none of its text, whatever it
 * holds — its own ligature or the product's slotted glyph — and stands where it stood, as does its component; `whileHeld`
 * then checks what else the component still draws and exposes. Once the face arrives each box is marked drawable,
 * paints its glyph, and still stands where it stood.
 */
export async function expectGlyphsHeldBack(page: Page, glyphs: readonly HeldGlyph[], whileHeld?: () => Promise<void>) {
  for (const glyph of glyphs) await expect.poll(async () => (await read(glyph)).drawn, `${glyph.name}: drawn with its face`).toBe(true);
  const before = new Map<HeldGlyph, Reading>();
  for (const glyph of glyphs) {
    const reading = await read(glyph);
    expect(reading.text.length, `${glyph.name}: the box holds the glyph's name`).toBeGreaterThan(0);
    expect(reading.painted, `${glyph.name}: painted with its face`).toEqual(reading.text);
    before.set(glyph, reading);
  }

  const family = await withoutIconFont(page);
  for (const glyph of glyphs) {
    await expect.poll(async () => (await read(glyph)).drawn, `${glyph.name}: not drawable without its face`).toBe(false);
    const held = await read(glyph);
    expect(held.painted, `${glyph.name}: nothing of the glyph's name is painted`).toEqual([]);
    expectSamePlace(held, before.get(glyph)!, glyph.name, 'while the face is missing');
  }
  await whileHeld?.();

  await iconFaceArrives(page, family);
  for (const glyph of glyphs) {
    await expect.poll(async () => (await read(glyph)).drawn, `${glyph.name}: drawable once its face is there`).toBe(true);
    const back = await read(glyph);
    expect(back.painted, `${glyph.name}: the glyph is painted again`).toEqual(back.text);
    expectSamePlace(back, before.get(glyph)!, glyph.name, 'once the face is there');
  }
}
