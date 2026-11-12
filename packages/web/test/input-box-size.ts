import AxeBuilder from '@axe-core/playwright';
import { type Page, expect } from '@playwright/test';
import { resolveToken, rootTokens } from './harness.js';

/**
 * The size cascade for an input box (TXI-73, NMI-49, CLI-47, SEL-73, CMB-83): a box that sets no size of its own is
 * drawn at the size its nearest container sets — a toolbar's here (TBR-31) —, a set size only and never a container's
 * default; its own size, medium included, wins; a size it lacks is its nearest; a change, a removal and a move are drawn
 * at once; at density 0.75, 1 and 1.5 every height is its size's token; and no size attribute is written on a box that
 * takes its size. `T` names a token of the box (`inputBoxToken(<component>)`); `attrs` is what each box is written with
 * besides its id, its size and its label; `inner.selector` selects, in the box's shadow root, a Button whose size follows
 * the size the box draws (a stepper, a picker button), and `inner.sizes` is that Button's size in the small box that takes
 * the toolbar's size, in the large box beside it and in the box of a toolbar that sets none. The page has a fixture
 * mounted, so that the tags are defined.
 */
export async function expectBoxTakesContainerSize(
  page: Page,
  tag: string,
  T: (name: string) => string,
  { attrs = '', inner }: { attrs?: string; inner?: { selector: string; sizes: readonly [string, string, string] } } = {},
): Promise<void> {
  await page.evaluate(
    ([name, rest]) => {
      const stage = document.createElement('div');
      stage.id = 'size-stage';
      // Each box has a length of its own (a toolbar lays a field out at the length the product gives it, TBR-29).
      const box = (id: string, size = '') => `<${name} id="${id}" ${size ? `size="${size}"` : ''} label="${id}" style="inline-size: 18rem" ${rest}></${name}>`;
      stage.innerHTML = `
        <tanrei-toolbar id="small" size="small" label="Small">${box('taken')}${box('own', 'large')}${box('own-medium', 'medium')}</tanrei-toolbar>
        <tanrei-toolbar id="unset" label="Unset">${box('free')}</tanrei-toolbar>
        ${box('alone')}`;
      document.body.append(stage);
    },
    [tag, attrs] as const,
  );
  const height = (size: string) => resolveToken(page, T(`stacked-container-height-${size}`));
  /** The height of each box's container, measured in one frame after `change` ran. */
  const boxes = (ids: string[], change = '') =>
    page.evaluate(
      async ([code, list]) => {
        new Function(code as string)();
        await new Promise(requestAnimationFrame);
        return Object.fromEntries((list as string[]).map((id) => [id, document.getElementById(id)!.shadowRoot!.querySelector('[part="container"]')!.getBoundingClientRect().height]));
      },
      [change, ids] as const,
    );
  const all = ['taken', 'own', 'own-medium', 'free', 'alone'];
  for (const density of ['0.75', '1', '1.5']) {
    await rootTokens(page, { '--tanrei-dial-density': density });
    const [small, medium, large] = [await height('small'), await height('medium'), await height('large')];
    expect(await boxes(all), `density ${density}`).toEqual({ taken: small, own: large, 'own-medium': medium, free: medium, alone: medium });
  }
  await rootTokens(page, { '--tanrei-dial-density': '' });
  const [small, medium, large] = [await height('small'), await height('medium'), await height('large')];
  // A small box is as tall as the small Buttons beside it (TXI-16): the toolbar's items stand in one line.
  expect(small).toBe(await resolveToken(page, '--tanrei-comp-button-container-height-small'));
  expect(await page.evaluate(() => ['taken', 'free', 'alone'].map((id) => document.getElementById(id)!.getAttribute('size')))).toEqual([null, null, null]);
  if (inner) {
    const sizes = await page.evaluate(
      (selector) => ['taken', 'own', 'free'].map((id) => document.getElementById(id)!.shadowRoot!.querySelector(selector)?.getAttribute('size') ?? null),
      inner.selector,
    );
    expect(sizes, `${inner.selector}: the size of the Button the box draws`).toEqual([...inner.sizes]);
  }
  // A size it lacks is its nearest; set, changed and removed on the container; set and given back on itself.
  expect(await boxes(['taken'], "document.getElementById('small').setAttribute('size', 'extra-large')")).toEqual({ taken: large });
  expect(await boxes(['taken', 'own'], "document.getElementById('small').size = 'small'")).toEqual({ taken: small, own: large });
  expect(await boxes(['taken'], "document.getElementById('small').removeAttribute('size')")).toEqual({ taken: medium });
  expect(await boxes(['free'], "document.getElementById('unset').size = 'large'")).toEqual({ free: large });
  expect(await boxes(['free'], "document.getElementById('free').size = 'medium'")).toEqual({ free: medium });
  expect(await page.locator('#free').getAttribute('size')).toBe('medium');
  expect(await boxes(['free'], "document.getElementById('free').size = null")).toEqual({ free: large });
  expect(await page.locator('#free').getAttribute('size')).toBeNull();
  expect(await page.locator('#free').evaluate((el) => (el as HTMLElement & { size: string }).size)).toBe('medium');
  // Moved out of every container, and into one.
  expect(await boxes(['free'], "document.body.append(document.getElementById('free'))")).toEqual({ free: medium });
  expect(await boxes(['alone'], "document.getElementById('unset').append(document.getElementById('alone'))")).toEqual({ alone: large });
  // Taken from a container, a size changes nothing a person who cannot see it is told.
  const results = await new AxeBuilder({ page }).include('#size-stage').analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
}
