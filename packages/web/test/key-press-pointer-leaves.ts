// A press made by a key, while a pointer that rests over the control leaves it (BTN-8 / BTN-9 and every control after
// them: a press by pointer, Enter or Space keeps the pressed state WHILE pressed).
//
// The pointer did not press: it only rested there. It leaves because the mouse moved, or because the control moved out
// from under it (Enter raises a bottom sheet, and its handle goes up). The platform's own button keeps a key's press
// for as long as the key is down, wherever the pointer goes: Chromium and WebKit draw `:active` under Space held and
// keep it while the pointer leaves and comes back (Firefox draws no `:active` for a key at all). So a pointer's
// `pointerleave`, `pointerout` or `pointerup` ends only a press the pointer made, and the key's press ends with its
// keyup (or with focus).
//
// press-hold is 0 here: a press ended by the pointer is gone in the turn of the pointer's event, so what is read after
// the pointer has moved is what the pointer did — no wait, on any machine.
import { type Locator, type Page, expect } from '@playwright/test';
import { rootTokens } from './harness.js';

export interface KeyPressPointerLeaves {
  /** The control: where the pointer rests, and the element that carries `data-pressed` or holds the one that does. */
  control: Locator;
  /** The element focus is given to, where it is not the control, the first focusable element in it, or its host. */
  focus?: Locator;
  /** The key that presses it: Space where it is not said. */
  key?: string;
  /** Run while the key is down, before the pointer moves (Enter raised a sheet: wait until it has risen). */
  whileDown?: () => Promise<void>;
  /** Where the pointer goes: the window's top left corner where it is not said. `null`: it stays where it is (the control moved away from it). */
  away?: { x: number; y: number } | null;
}

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]';

/** What `data-pressed` says on the control or the element in it that carries it; `null` where none does. */
const pressedOf = (control: Locator) =>
  control.evaluate((el) => (el.matches('[data-pressed]') ? el : el.querySelector('[data-pressed]'))?.getAttribute('data-pressed') ?? null);

/**
 * Rests the pointer over the control, presses it with a key and holds the key down, moves the pointer off it, and
 * holds that the press is still shown — and that it ends when the key comes up.
 */
export async function expectKeyPressOutlastsPointer(page: Page, { control, focus, key = ' ', whileDown, away = { x: 1, y: 1 } }: KeyPressPointerLeaves) {
  await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '0ms' });
  const box = (await control.boundingBox())!;
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(middle.x, middle.y);
  if (focus) await focus.focus();
  else
    await control.evaluate((el, selector) => {
      const own = el.matches(selector) ? el : el.querySelector(selector);
      ((own ?? (el.getRootNode() as ShadowRoot).host) as HTMLElement).focus();
    }, FOCUSABLE);
  // The pointer's own events on the control: the test proves nothing unless the pointer did leave it.
  await control.evaluate((el) => {
    const left = { count: 0 };
    (el as unknown as { __left: typeof left }).__left = left;
    el.addEventListener('pointerleave', () => left.count++);
  });
  expect(await pressedOf(control), 'at rest').toBeNull();

  await page.keyboard.down(key);
  const pressed = await pressedOf(control);
  expect(pressed, 'the key pressed it').not.toBeNull();
  expect(pressed).not.toBe('none');
  await whileDown?.();
  // A pointer event of a moved layout arrives with the pointer's next move: a move of one pixel sends it.
  if (away) await page.mouse.move(away.x, away.y, { steps: 4 });
  else await page.mouse.move(middle.x, middle.y + 1);
  expect(await control.evaluate((el) => (el as unknown as { __left: { count: number } }).__left.count), 'the pointer left the control').toBeGreaterThan(0);
  expect(await pressedOf(control), 'the pointer that left ended no press of the key, which is still down').toBe(pressed);

  await page.keyboard.up(key);
  await expect.poll(() => pressedOf(control), { message: 'the key came up: its press is over' }).toBeNull();
  await rootTokens(page, { '--tanrei-sys-motion-duration-press-hold': '' });
}
