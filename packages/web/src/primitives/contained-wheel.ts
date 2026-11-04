/**
 * A wheel turned toward an end a scroller already stands at scrolls nothing — not the page behind. The scroller's
 * `overscroll-behavior: contain` says so, and Chromium and WebKit keep to it for every wheel; Gecko keeps to it only
 * within one wheel transaction, which an event that scrolls nothing does not begin or prolong, so a wheel at the end
 * 1.5 s after the last one that scrolled something (`mousewheel.transaction.timeout`), or one at an end the scroller
 * was already at, scrolls the page.
 *
 * `containWheel(event, scroller)` cancels such a wheel, on the axis it is turned along: the larger of its two parts (a
 * trackpad's swipe has a little of the other), and sideways for Shift with a vertical wheel, which a browser scrolls
 * sideways. It lets through a wheel with Ctrl (the page's zoom, and a trackpad's pinch); one along an axis the scroller
 * does not contain (`overscroll-behavior` auto there, as on a row of tabs for a wheel turned up or down) or does not
 * scroll along (no range there, or `overflow` that is not a scroll); one the scroller can still take; and one that a
 * scroller inside it can still take. Sideways, right is right in every direction: a right-to-left scroller stands at
 * its start at 0 and goes negative toward its end.
 */
export function containWheel(event: WheelEvent, scroller: Element) {
  if (event.ctrlKey || !event.cancelable || event.defaultPrevented) return;
  const shifted = event.shiftKey && event.deltaX === 0;
  const across = shifted || Math.abs(event.deltaX) > Math.abs(event.deltaY);
  const delta = shifted ? event.deltaY : across ? event.deltaX : event.deltaY;
  if (delta === 0) return;
  const forward = delta > 0;
  const scrolls = (element: Element) => {
    const style = getComputedStyle(element);
    return /auto|scroll|overlay/.test(across ? style.overflowX : style.overflowY) ? style : null;
  };
  const canTake = (element: Element, style: CSSStyleDeclaration) => {
    if (!across) {
      const range = element.scrollHeight - element.clientHeight;
      return range >= 1 && (forward ? range - element.scrollTop >= 1 : element.scrollTop >= 1);
    }
    const range = element.scrollWidth - element.clientWidth;
    if (range < 1) return false;
    const [left, right] = style.direction === 'rtl' ? [-range, 0] : [0, range];
    return forward ? right - element.scrollLeft >= 1 : element.scrollLeft - left >= 1;
  };
  const own = scrolls(scroller);
  if (!own || (across ? own.overscrollBehaviorX : own.overscrollBehaviorY) === 'auto') return;
  if ((across ? scroller.scrollWidth - scroller.clientWidth : scroller.scrollHeight - scroller.clientHeight) < 1) return;
  if (canTake(scroller, own)) return;
  for (const each of event.composedPath()) {
    if (each === scroller) break;
    const style = each instanceof Element ? scrolls(each) : null;
    if (style && canTake(each as Element, style)) return;
  }
  event.preventDefault();
}

/**
 * `containWheel()` as a listener for the scroller itself (`@wheel=${containedWheel}` in a template, or
 * `addEventListener('wheel', containedWheel, containedWheel)`): not passive, so that it can cancel.
 */
export const containedWheel = {
  passive: false,
  handleEvent(event: WheelEvent) {
    containWheel(event, event.currentTarget as Element);
  },
};
