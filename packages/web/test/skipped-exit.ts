// A surface whose subtree `content-visibility` skips while it leaves: nothing of it is drawn, so its exit has nothing
// to show, and it is out of the top layer at once.
//
// Firefox starts the exit's transitions there and leaves them pending — no start time, no frame of them — until the
// subtree is drawn again, and a script that gives them a start time sees them stand still: a surface that waited for
// its exit to end stood in the top layer, drawn nowhere, for as long as the box around it was hidden (3 s and more
// where the anchor's box was hidden with the component in it). Chromium and WebKit start no transition there.
import { type Locator, expect } from '@playwright/test';

/** Frames drawn after the exit's duration has passed before the surface counts as still standing in the top layer. */
const MARGIN_FRAMES = 4;

/**
 * Hides `box` — which holds the component, its anchor and so the surface in its shadow root — with
 * `content-visibility: hidden`, then expects `surface` (the element in the top layer, a popover) out of it within its
 * exit's duration — the longest transition or animation on it or on its motion element (`data-tanrei-appear`),
 * counted from the hiding, which comes before the close — and `MARGIN_FRAMES` frames more.
 */
export async function expectGoneWhileSkipped(surface: Locator, box: Locator, message = ''): Promise<void> {
  const handle = await box.elementHandle();
  const seen = await surface.evaluate(
    async (el, [wrapper, margin]) => {
      const motion = el.matches('[data-tanrei-appear]') ? el : (el.querySelector('[data-tanrei-appear]') ?? el);
      const longest = (element: Element) => {
        const style = getComputedStyle(element);
        const times = [style.transitionDuration, style.animationDuration].flatMap((list) => list.split(','));
        return Math.max(0, ...times.map((time) => Number.parseFloat(time) * (time.trim().endsWith('ms') ? 1 : 1000)));
      };
      const before = el.matches(':popover-open');
      (wrapper as HTMLElement).style.contentVisibility = 'hidden';
      const start = performance.now();
      let due = Number.POSITIVE_INFINITY;
      let after = 0;
      for (let frame = 0; ; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (!el.matches(':popover-open')) return { before, gone: true, frame, waited: Math.round(performance.now() - start) };
        if (due === Number.POSITIVE_INFINITY) due = start + Math.max(longest(el), longest(motion));
        if (performance.now() >= due && ++after > margin) return { before, gone: false, frame, waited: Math.round(performance.now() - start) };
      }
    },
    [handle, MARGIN_FRAMES] as const,
  );
  expect(seen.before, `${message}: in the top layer before the box is hidden`).toBe(true);
  expect(seen.gone, `${message}: out of the top layer within its exit and ${MARGIN_FRAMES} frames (${seen.frame} frames, ${seen.waited} ms)`).toBe(true);
}
