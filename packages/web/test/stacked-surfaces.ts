import { type Page, expect } from '@playwright/test';

/**
 * Modal surfaces opened in one task stack in the order their `open` was set, the later on top, whatever their kinds
 * (DLG-15, MDL-8, BSH-23, SSH-15, IMP-6, DTM-35, NVD-19, POP-40, SRC-9): every modal surface opens in the write that
 * follows the turn's reads, so none opens in its own update below one set open before it. Each component's test pairs
 * its own surface with a dialog and with a modal layer, in either order, with what these helpers add to its page.
 */

/** The property that opens an element, by tag, where it is not `open`: a search's view opens with `expanded`. */
const OPENS: Record<string, string> = { 'tanrei-search': 'expanded' };

/** A dialog, added at the end of `main`, whose marked button takes focus as it opens (DLG-2). */
export const STACKED_DIALOG = 'stacked-dialog';
/** A modal layer, added at the end of `main`, whose marked button takes focus as it opens (MDL-3). */
export const STACKED_LAYER = 'stacked-layer';

/** Adds the dialog and the modal layer (closed) and a button before everything, `opener`, which has focus. */
export async function addStackedSurfaces(page: Page): Promise<void> {
  await page.evaluate(
    ([dialog, layer]) => {
      const main = document.querySelector('main') ?? document.body;
      main.insertAdjacentHTML('afterbegin', '<button id="opener">Open</button>');
      main.insertAdjacentHTML(
        'beforeend',
        `<tanrei-dialog id="${dialog}" headline="Dialog"><button id="${dialog}-marked" autofocus>D</button><tanrei-button slot="actions" confirming>OK</tanrei-button></tanrei-dialog>` +
          `<tanrei-modal-layer id="${layer}" label="Layer"><div style="background: Canvas; padding: 16px"><button id="${layer}-marked" autofocus>L</button></div></tanrei-modal-layer>`,
      );
    },
    [STACKED_DIALOG, STACKED_LAYER],
  );
  await page.evaluate(async (ids) => {
    for (const id of ids) await (document.getElementById(id) as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
  }, [STACKED_DIALOG, STACKED_LAYER]);
  await page.locator('#opener').focus();
}

/**
 * Sets `open` (a search's `expanded`) on each element (by id) to `open`, in that order, in one task, and waits for their
 * updates.
 */
export const setOpenInOneTask = (page: Page, ids: string[], open: boolean): Promise<void> =>
  page.evaluate(
    async ([list, value, opens]) => {
      const elements = (list as string[]).map((id) => document.getElementById(id) as unknown as Record<string, boolean> & HTMLElement & { updateComplete: Promise<boolean> });
      for (const element of elements) element[(opens as Record<string, string>)[element.localName] ?? 'open'] = value as boolean;
      await Promise.all(elements.map((element) => element.updateComplete));
    },
    [ids, open, OPENS] as const,
  );

/**
 * Where focus is: `<the focused element's id, else its tag> in <the id of the innermost of the surfaces it is inside>`,
 * through shadow roots and slots (`page` where it is inside none of them).
 */
export const focusAmong = (page: Page, ids: string[]): Promise<string> =>
  page.evaluate((list) => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    let inside = 'page';
    for (let at: Node | null = active; at; at = at instanceof ShadowRoot ? at.host : at.parentNode) {
      if (at instanceof Element && list.includes(at.id)) {
        inside = at.id;
        break;
      }
    }
    return `${active?.id || active?.localName} in ${inside}`;
  }, ids);

/** The surface (of `ids`) a point near the window's top end corner hits: only the topmost's scrim or surface is there. */
export const hitAmong = (page: Page, ids: string[]): Promise<string | null> =>
  page.evaluate((list) => {
    let at: Element | null = document.elementFromPoint(document.documentElement.clientWidth - 4, 4);
    while (at && !list.includes(at.id)) at = at.parentElement ?? ((at.getRootNode() as ShadowRoot).host ?? null);
    return at?.id ?? null;
  }, ids);

/** Whether each surface's `<dialog>` is modal (`:modal`), by id. */
export const modalAmong = (page: Page, ids: string[]): Promise<boolean[]> =>
  page.evaluate((list) => list.map((id) => !!document.getElementById(id)?.shadowRoot?.querySelector('dialog')?.matches(':modal')), ids);

export interface StackedCase {
  /** The ids, in the order their `open` is set in one task. */
  order: [first: string, later: string];
  /** Where focus is (`focusAmong`) once the later one is closed: where the earlier one gives focus as it opens. */
  backInFirst: string | RegExp;
  /**
   * Where focus is once the earlier one is closed too: `opener in page` — the element that had it before either opened —
   * unless the earlier gives it back to an element of its own (a search, to its bar's input: SRC-9).
   */
  last?: string;
  /** A case's name, for the messages. */
  name: string;
}

/**
 * Opens two surfaces in one task, in `order`, and checks that the later is on top — both modal, the point hits the
 * later, focus inside it — that closing the later gives focus back where the earlier gives it (`backInFirst`), and that
 * closing the earlier then gives it back to `#opener`, which had it before either opened (or to `last`).
 */
export async function expectStackedInOrder(page: Page, ids: string[], { order: [first, later], backInFirst, last = 'opener in page', name }: StackedCase): Promise<void> {
  await page.locator('#opener').focus();
  await setOpenInOneTask(page, [first, later], true);
  expect(await modalAmong(page, [first, later]), name).toEqual([true, true]);
  // Above the earlier one: a point that the earlier one's scrim or surface covers hits the later one.
  expect(await hitAmong(page, ids), name).toBe(later);
  await expect.poll(() => focusAmong(page, ids).then((where) => where.endsWith(` in ${later}`)), { message: name }).toBe(true);
  await setOpenInOneTask(page, [later], false);
  if (typeof backInFirst === 'string') await expect.poll(() => focusAmong(page, ids), { message: name }).toBe(backInFirst);
  else await expect.poll(() => focusAmong(page, ids), { message: name }).toMatch(backInFirst);
  await setOpenInOneTask(page, [first], false);
  await expect.poll(() => focusAmong(page, ids), { message: name }).toBe(last);
}
