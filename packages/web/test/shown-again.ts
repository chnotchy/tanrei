import type { Locator } from '@playwright/test';
import { type Frames, type SampleOptions, sampleFrames } from './frames.js';
import { restyle } from './restyle.js';

/**
 * Hides `stage` (`display: none`, as a product hides a panel, a closed tab or a view it is not showing), lets the page
 * draw frames while it is hidden — a component's observers report its boxes at nothing in the first of them, and what
 * it decides from that is written by the last — runs `whileHidden`, and samples the frames of showing it again
 * (test/frames.ts).
 *
 * An element that is not rendered lays nothing out: every box it measures reads 0. A component that took that for a
 * size drew a state it then left once shown (a label that moved to its end, a row with no actions, a trail at an
 * SVG's own width): `expectFirstFrameAtRest(seen)` says whether the first frame shown is the rest, and the rest can be
 * told apart from what the stage drew before it was hidden.
 */
export async function shownAgain(stage: Locator, { whileHidden, sample }: { whileHidden?: () => Promise<unknown>; sample?: SampleOptions } = {}): Promise<Frames> {
  await restyle(stage, { display: 'none' });
  await stage.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
  await whileHidden?.();
  return sampleFrames(stage, () => restyle(stage, { display: '' }), sample);
}
