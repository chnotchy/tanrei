// The document's first paint (MOT-4), in a module of its own: what waits for it to read the layout (a glyph, a
// light-DOM sheet, a measure of its own) need not bring the motions of motion.ts into its bundle. motion.ts re-exports
// it.

let painted = false;
// The promise `afterFirstPaint()` answers with is made when it is first asked for, not at the top of the module: a
// promise made there is kept in the bundle of every element that imports this module, and few of them ever ask.
let whenPainted: Promise<void> | undefined;
let tellPainted: (() => void) | undefined;
const markPainted = () => {
  painted = true;
  tellPainted?.();
};
// The second frame callback after the document is parsed runs once its first frame has been painted. Paint Timing would
// say so too, but Firefox reports no `first-paint`, and a `first-contentful-paint` before the parse ends (a browser may
// paint parsed content before the module scripts run) is a page whose overlays the module has not upgraded yet: they
// are still being mounted, and appear at once. A module that arrives after the parse (a chunk loaded later) finds a
// page that was painted where Paint Timing says so, and waits the two frames where it says nothing.
const twoFrames = () => requestAnimationFrame(() => requestAnimationFrame(markPainted));
if (typeof document !== 'undefined' && typeof requestAnimationFrame === 'function') {
  const navigation = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  const parsed = document.readyState === 'complete' || (navigation?.domContentLoadedEventEnd ?? 0) > 0;
  if (!parsed) document.addEventListener('DOMContentLoaded', twoFrames, { once: true });
  else if (performance.getEntriesByType?.('paint').length) markPainted();
  else twoFrames();
}

/** Whether the document has been painted once (MOT-4): false until then, and always on a server. */
export const documentPainted = (): boolean => painted;

/** Resolves once the document has been painted (MOT-4); never on a server. */
export const afterFirstPaint = (): Promise<void> =>
  (whenPainted ??= painted ? Promise.resolve() : new Promise<void>((resolve) => (tellPainted = resolve)));
