// Whether a page can scroll sideways, read in every frame a change paints (test/frames.ts).
//
// A part laid out past the end of the window — a panel that slides out past its region's end edge — makes the document
// wider than the window even where nothing shows it: `clip-path` and a transform's offset leave its box in the
// document's scrollable overflow, and a focus moved into it then scrolls the window to it. Two numbers say whether that
// happened: how far the document reaches past the window (`over`, never above 0) and how far the window is scrolled
// sideways (`scrollX`, always 0 — negative in a right-to-left document).
import { expect } from '@playwright/test';
import type { Frame, Frames, Probe } from './frames.js';

/** A probe for `sampleFrames`: how far the document reaches past the window, and the window's sideways scroll. */
export const sidewaysProbe: Probe = () => ({
  over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  scrollX: window.scrollX,
});

/** The worst of a set of frames: the furthest the document reached past the window, and every sideways scroll seen. */
export function sideways(frames: readonly Frame[]): { over: number; scrollX: number[] } {
  const over = Math.max(...frames.map((f) => Number(f.probe.over)));
  // (`|| 0`: a right-to-left window at its start may report -0.)
  const scrollX = [...new Set(frames.map((f) => Number(f.probe.scrollX) || 0))];
  return { over, scrollX };
}

/** In the frame before the change, in every frame it painted and at rest, the page could not scroll sideways. */
export function expectNeverSideways(seen: Frames, label: string): void {
  expect(seen.frames.length, `${label}: frames were painted`).toBeGreaterThan(0);
  const worst = sideways([seen.before, ...seen.frames, seen.rest]);
  expect({ over: Math.max(0, worst.over), scrollX: worst.scrollX }, `${label}: the document reached ${worst.over}px past the window; scrollX ${worst.scrollX.join(', ')}`).toEqual({ over: 0, scrollX: [0] });
}
