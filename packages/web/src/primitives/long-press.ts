/**
 * A long press of a touch or a pen, as the components that answer one measure it (a list's reorder, LST-36; a context
 * menu, MNU-60), and the press that ends after something opened under the finger (a tooltip, TIP-13; a context menu).
 */

/** The platform's touch slop where it names none: a press that moves farther is a scroll or a drag, not a press held. */
export const TOUCH_SLOP = 8;

/** The platform's long-press duration where it names none, in milliseconds. */
export const LONG_PRESS = 500;

/**
 * The rest of the press under way — its release and the click it makes — goes no further: something opened under the
 * finger or the pointer, and what lies under it now is not what the person pressed. The next press is a press on what is
 * there. Call it while the press is down.
 */
export function swallowRelease() {
  const types = ['pointerup', 'mouseup', 'click'] as const;
  const stop = (event: Event) => {
    event.stopPropagation();
    if (event.type !== 'pointerup') event.preventDefault();
    if (event.type === 'click') done();
  };
  const done = () => {
    for (const type of types) window.removeEventListener(type, stop, true);
    window.removeEventListener('pointerdown', done, true);
  };
  for (const type of types) window.addEventListener(type, stop, true);
  // Registered after this press's own pointerdown has passed the window: the next one ends it.
  window.addEventListener('pointerdown', done, true);
}
