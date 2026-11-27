/**
 * One control height. A product sets `dial.control.height` once and every control and row of its default size is drawn
 * at it: these are the heights a test draws the rows of a family at — a compact product's, the default (HeroUI's desktop
 * height) and the presets' 40.
 */
import type { Page } from '@playwright/test';
import { resolveToken, rootTokens } from './harness.js';

export const CONTROL_HEIGHTS = [32, 36, 40] as const;

/**
 * Sets the control height on `:root`, and the minimum target to the system's own where that is no higher, or to the
 * control height where it is (a minimum above the control height is refused in every system). In the default system
 * the pointer target aliases the minimum, so a row of the default size is drawn at the control height under a mouse.
 * Returns the pointer target it gives.
 */
export async function atControlHeight(page: Page, height: number): Promise<number> {
  await rootTokens(page, { '--tanrei-dial-control-height': '', '--tanrei-sys-target-minimum': '' });
  const minimum = await resolveToken(page, '--tanrei-sys-target-minimum');
  await rootTokens(page, { '--tanrei-dial-control-height': `${height}px`, '--tanrei-sys-target-minimum': `${Math.min(minimum, height)}px` });
  return resolveToken(page, '--tanrei-sys-target-pointer');
}
