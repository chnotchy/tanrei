// The product's word on mirroring a glyph a component draws from a name it was given — `data-mirror` on the element that
// names it (src/primitives/glyph-mirror.ts, MirrorWordController) — read the same way in every component's tests.
import type { Locator } from '@playwright/test';

/** The computed `transform` of a glyph drawn mirrored left to right in its own box. */
export const MIRRORED = 'matrix(-1, 0, 0, 1, 0, 0)';

/** How a glyph is drawn: `mirrored`, `plain`, or the transform itself where it is neither. */
export type Mirroring = 'mirrored' | 'plain' | string;

const reading = (transform: string): Mirroring => (transform === MIRRORED ? 'mirrored' : transform === 'none' ? 'plain' : transform);

/** How each of `glyphs` is drawn now. */
export function mirroring(glyphs: readonly Locator[]): Promise<Mirroring[]> {
  return Promise.all(glyphs.map(async (glyph) => reading(await glyph.evaluate((el) => getComputedStyle(el).transform))));
}

/**
 * Writes `dir` on `ancestor` and reads how each of `glyphs` is drawn in the same task, before any frame: what a change of
 * direction draws at once. (A motion it started would leave a glyph between the two at its first frame; the caller
 * counts the host's motions after it.)
 */
export async function mirroringAfterDirection(ancestor: Locator, direction: 'ltr' | 'rtl', glyphs: readonly Locator[]): Promise<Mirroring[]> {
  const handles = await Promise.all(glyphs.map((glyph) => glyph.elementHandle()));
  const transforms = await ancestor.evaluate(
    (el, [dir, elements]) => {
      el.setAttribute('dir', dir);
      return elements.map((glyph) => getComputedStyle(glyph).transform);
    },
    [direction, handles] as const,
  );
  await Promise.all(handles.map((handle) => handle.dispose()));
  return transforms.map(reading);
}
