/**
 * A wheel turned toward an end a scroller already stands at scrolls nothing — not the page behind. The scroller's
 * `overscroll-behavior: contain` says so, and Chromium and WebKit keep to it for every wheel; Gecko keeps to it only
 * within one wheel transaction, which an event that scrolls nothing does not begin or prolong, so a wheel at the end
 * 1.5 s after the last one that scrolled something (`mousewheel.transaction.timeout`), or one at an end the scroller
 * was already at, scrolls the page.
 *
 * `containWheel(event, scroller)` cancels such a wheel. It lets through a wheel with Ctrl (the page's zoom, and a
 * trackpad's pinch), one without a vertical part, one over a scroller that cannot scroll, and one that a scroller
 * inside it can still take.
 */
export function containWheel(event: WheelEvent, scroller: Element) {
  if (event.ctrlKey || event.deltaY === 0 || !event.cancelable) return;
  const down = event.deltaY > 0;
  const canTake = (element: Element) => {
    const range = element.scrollHeight - element.clientHeight;
    if (range < 1) return false;
    return down ? range - element.scrollTop >= 1 : element.scrollTop >= 1;
  };
  if (scroller.scrollHeight - scroller.clientHeight < 1 || canTake(scroller)) return;
  for (const each of event.composedPath()) {
    if (each === scroller) break;
    if (each instanceof Element && canTake(each) && /auto|scroll|overlay/.test(getComputedStyle(each).overflowY)) return;
  }
  event.preventDefault();
}

/**
 * `containWheel()` as a listener for the scroller itself (`@wheel=${containedWheel}` in a template): not passive, so
 * that it can cancel.
 */
export const containedWheel = {
  passive: false,
  handleEvent: (event: WheelEvent) => containWheel(event, event.currentTarget as Element),
};
