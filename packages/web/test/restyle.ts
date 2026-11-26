import type { Locator } from '@playwright/test';

/**
 * Writes an element's inline style from a test — a stage's width, a box's height: what a window or a product's layout
 * changes around a component — and has the page draw a frame after it. Each name of `style` is a CSS property as CSS
 * spells it (`inline-size`); a value of `''` takes it off.
 *
 * The frame is the point. Playwright's headless WebKit on Linux (the WPE build that CI runs, `scripts/ci-like.sh`)
 * now and then draws nothing after such a write: the new style and layout are there for any read, but no rendering
 * update follows — for seconds — so no resize observer is told and a component that answers its own size (a table that
 * releases its first column, an app bar whose actions come back) is seen not to answer. A repaint of the page or a
 * forced layout does not end it; a frame callback asked for does, at once. The same page in a headed WebKit (GTK, the
 * same engine drawing to a display) never did it, nor a browser that draws, and a product's page asks for frames of
 * its own all the time. So the write here asks for one frame and waits for it, and a test that waits for what follows
 * from a size waits for the component, never for that engine's next frame.
 *
 * Where the test holds the page's clock (`page.clock`, test/page-clock.ts), `requestAnimationFrame` is the clock's and
 * runs only as the test moves it: the write is made and no frame is waited for.
 */
export async function restyle(target: Locator, style: Readonly<Record<string, string>>): Promise<void> {
  await target.evaluate(async (el, declarations) => {
    const own = (el as HTMLElement).style;
    for (const [name, value] of Object.entries(declarations)) {
      if (value === '') own.removeProperty(name);
      else own.setProperty(name, value);
    }
    if (!/\[native code\]/.test(Function.prototype.toString.call(requestAnimationFrame))) return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, style);
}
