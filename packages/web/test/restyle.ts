import type { Locator } from '@playwright/test';
import { askForFrame } from './frame-asked.js';

/**
 * Writes an element's inline style from a test — a stage's width, a box's height: what a window or a product's layout
 * changes around a component — and has the page draw a frame after it (`askForFrame()`, test/frame-asked.ts: why).
 * Each name of `style` is a CSS property as CSS spells it (`inline-size`); a value of `''` takes it off.
 *
 * Where the test holds the page's clock (`page.clock`, test/page-clock.ts), `requestAnimationFrame` is the clock's and
 * runs only as the test moves it: the write is made and no frame is waited for.
 */
export async function restyle(target: Locator, style: Readonly<Record<string, string>>): Promise<void> {
  await target.evaluate((el, declarations) => {
    const own = (el as HTMLElement).style;
    for (const [name, value] of Object.entries(declarations)) {
      if (value === '') own.removeProperty(name);
      else own.setProperty(name, value);
    }
  }, style);
  await askForFrame(target.page());
}
