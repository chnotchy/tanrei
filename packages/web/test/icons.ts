// What the web writes for an icon's optical size (src/styles/icons.ts), for the tests of every component that draws one.
import type { Locator, Page } from '@playwright/test';

/**
 * The `opsz` axis an icon box of `size` CSS px carries in its computed `font-variation-settings`: the box size clamped to
 * `sys.icon.optical-size.min/max` — where the engine evaluates the arithmetic that turns the box size into a number
 * (`tan(atan2(<length>, 1px))`, the `@supports` of src/styles/icons.ts). Elsewhere the axis is not written and
 * `font-optical-sizing: auto` draws it, and this is `undefined` — which `toEqual` reads as "no such key". Either way the
 * drawn glyph is the same: src/icons.test.ts and ICB-13 compare its pixels with an explicit axis.
 */
export async function opticalSize(page: Page, size: number): Promise<number | undefined> {
  const [written, least, most] = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return [
      CSS.supports('font-variation-settings', "'opsz' tan(atan2(1em, 1px))"),
      Number(root.getPropertyValue('--tanrei-sys-icon-optical-size-min')),
      Number(root.getPropertyValue('--tanrei-sys-icon-optical-size-max')),
    ] as const;
  });
  return written ? Math.min(most, Math.max(least, size)) : undefined;
}

/**
 * The same axis as the end of a `font-variation-settings` declaration — `, 'opsz' 20`, or nothing where the engine does
 * not write it — for a test that compares a glyph's computed value with a declaration it writes itself.
 */
export async function opticalSizeAxis(page: Page, size: number): Promise<string> {
  const opsz = await opticalSize(page, size);
  return opsz === undefined ? '' : `, 'opsz' ${opsz}`;
}

/**
 * The `opsz` a glyph carries in its computed `font-variation-settings` — the element's, or its generated box's
 * (`pseudo`) — to 1/1000 (Firefox serializes an opsz computed as tan(atan2(48px, 1px)) as 47.9999); `undefined` where
 * no axis is written. What `opticalSize(page, <the box's size>)` says it is, for a glyph a stylesheet draws by hand.
 */
export function drawnOpticalSize(glyph: Locator, pseudo?: string): Promise<number | undefined> {
  return glyph.evaluate((el, ps) => {
    const value = /["']opsz["'] ([\d.]+)/.exec(getComputedStyle(el, ps ?? undefined).fontVariationSettings)?.[1];
    return value === undefined ? undefined : Math.round(Number(value) * 1000) / 1000;
  }, pseudo ?? null);
}
