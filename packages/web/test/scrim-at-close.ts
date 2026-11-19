// MOT-7: a surface that draws a scrim takes the scrim away at once as it begins to close, and fades it in as it opens.
//
// Read frame by frame (`sampleFrames`) on every modal `<dialog>` in the root, through shadow roots: its scrim is its
// `::backdrop`, drawn while the dialog is in the top layer — modal while open, a popover while it leaves
// (`closeModal()`, src/primitives/modal-exit.ts). The closing's first frame draws the scrim at no opacity and taking no
// press while the surface is still drawn and its own exit still plays; the opening's frames fade the scrim in from no
// opacity to whole, never back; where motion is reduced the closing's first frame draws no scrim either.
import { type Locator, type Page, expect } from '@playwright/test';
import { type Frames, type Probe, sampleFrames } from './frames.js';
import { motionEnded } from './motions.js';

/** Each `<dialog>` in the root, by its order: whether it is in the top layer, and its scrim's opacity and pointer-events there. */
export const scrimProbe: Probe = (root) => {
  const out: Record<string, number | string | boolean> = {};
  const dialogs: HTMLDialogElement[] = [];
  const walk = (node: ParentNode) => {
    for (const el of node.querySelectorAll('*')) {
      if (el instanceof HTMLDialogElement) dialogs.push(el);
      if (el.shadowRoot) walk(el.shadowRoot);
    }
  };
  walk(root);
  dialogs.forEach((dialog, i) => {
    const shown = dialog.matches(':modal') || dialog.matches(':popover-open');
    out[`shown${i}`] = shown;
    if (!shown) return;
    const scrim = getComputedStyle(dialog, '::backdrop');
    out[`scrim${i}`] = Math.round(Number(scrim.opacity) * 1000) / 1000;
    out[`takes${i}`] = scrim.pointerEvents;
  });
  return out;
};

/** The dialog whose scrim is drawn whole before the change (open), or after it (closed, then opened). */
function scrimmed(seen: Frames, { after = false } = {}): number {
  const frame = after ? seen.rest : seen.before;
  const found = Object.keys(frame.probe)
    .filter((key) => key.startsWith('scrim') && frame.probe[key] === 1)
    .map((key) => Number(key.slice('scrim'.length)));
  expect(found.length, 'one dialog draws its scrim whole').toBe(1);
  return found[0]!;
}

/** A transition of the surface itself (not of its scrim) that the change played. */
const surfaceMotions = (seen: Frames) => seen.motions.filter((motion) => !motion.on.includes('backdrop') && motion.duration > 0);

/**
 * With the surface open and at rest in `stage`: closes it by `close` and opens it again by `open`, frame by frame, and
 * once more where motion is reduced. `what` names the surface in the messages.
 */
export async function expectScrimTakenAwayAtClose(page: Page, stage: Locator, { open, close, what }: { open: () => Promise<unknown>; close: () => Promise<unknown>; what: string }): Promise<void> {
  const closing = await sampleFrames(stage, close, { probe: scrimProbe });
  expect(closing.complete, what).toBe(true);
  const i = scrimmed(closing);
  const first = closing.frames[0]!;
  expect(first.probe[`shown${i}`], `${what}: the surface is still drawn in the first frame of the closing`).toBe(true);
  expect(first.probe[`scrim${i}`], `${what}: the scrim in the first frame of the closing`).toBe(0);
  expect(first.probe[`takes${i}`], `${what}: the scrim takes no press from the first frame`).toBe('none');
  for (const frame of closing.frames) if (frame.probe[`shown${i}`]) expect(frame.probe[`scrim${i}`], `${what}: the scrim in frame ${frame.index}`).toBe(0);
  // The surface itself still leaves by its own motion, drawn until it ends.
  expect(surfaceMotions(closing).length, `${what}: the surface's own exit plays`).toBeGreaterThan(0);
  const drawnFrames = closing.frames.filter((frame) => frame.probe[`shown${i}`]).length;
  expect(drawnFrames, `${what}: frames the leaving surface is drawn in`).toBeGreaterThan(3);
  // (Closed, it is out of the top layer, or gone: a collapsible drawer's column takes the dialog's place.)
  expect(closing.rest.probe[`shown${i}`], `${what}: closed at rest`).not.toBe(true);
  await motionEnded(page);

  // The opening keeps its fade: from no opacity to whole, never back.
  const opening = await sampleFrames(stage, open, { probe: scrimProbe });
  expect(opening.complete, what).toBe(true);
  const opened = scrimmed(opening, { after: true });
  const values = opening.frames.map((frame) => Number(frame.probe[`scrim${opened}`] ?? 0));
  expect(values[0], `${what}: the scrim in the first frame of the opening`).toBe(0);
  for (let n = 1; n < values.length; n++) expect(values[n]!, `${what}: the scrim's fade in, frame ${n}`).toBeGreaterThanOrEqual(values[n - 1]!);
  expect(new Set(values).size, `${what}: the scrim fades in over frames (${values.join(', ')})`).toBeGreaterThan(3);
  await motionEnded(page);

  // MOT-7, MOT-6: where motion is reduced, the same.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  try {
    const reduced = await sampleFrames(stage, close, { probe: scrimProbe });
    const at = reduced.frames[0]!;
    if (at.probe[`shown${i}`]) expect(at.probe[`scrim${i}`], `${what}: the scrim in the first frame of a closing where motion is reduced`).toBe(0);
    await motionEnded(page);
    await open();
    await motionEnded(page);
  } finally {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
}
