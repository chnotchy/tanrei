// tabbables() and trapFocus() (src/primitives/modal.ts): the Tab stops inside a root, as the flat tree orders them,
// and the trap a modal overlay makes of them. Every overlay that calls them gives its `<dialog>` `tabindex="-1"`, so
// their own tests never meet a root that is a stop itself; this asks the primitive.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** The module as it is built: it imports nothing, so a page can load it alone. */
const MODULE = fs.readFileSync(path.join(pkg, 'dist/primitives/modal.js'), 'utf8');
const PAGE = 'http://modal.test/';

async function open(page: Page, body: string) {
  await page.unroute(PAGE);
  await page.unroute(`${PAGE}modal.js`);
  await page.route(PAGE, (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>modal</title></head><body>${body}</body></html>` }));
  await page.route(`${PAGE}modal.js`, (route) => route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: MODULE }));
  await page.goto(PAGE);
}

/** The stops inside the element `selector` names, by id. */
const stops = (page: Page, selector: string) =>
  page.evaluate(async (sel) => {
    const { tabbables } = (await import('/modal.js' as string)) as { tabbables(root: Node): HTMLElement[] };
    return tabbables(document.querySelector(sel)!).map((el) => el.id || el.localName);
  }, selector);

/** An element with a shadow tree of its own: a control, a slot, a control — and a slot that only named children fill. */
const HOST = `<script>
  customElements.define('x-host', class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = '<button id="before">before</button><slot></slot><button id="after">after</button><slot name="end"></slot>';
    }
  });
</script>`;

test.describe('tabbables()', () => {
  test('the root it is given is never one of its own stops: a root with a tabindex of its own, and a dialog — for which Firefox reports tabIndex 0 — hold their controls and nothing else', async ({ page }) => {
    await open(page, '<div id="root" tabindex="0"><button id="a">a</button><button id="b">b</button></div><dialog id="dialog" open><button id="c">c</button><input id="d" aria-label="d"></dialog>');
    expect(await stops(page, '#root')).toEqual(['a', 'b']);
    expect(await stops(page, '#dialog')).toEqual(['c', 'd']);
    // An element with a tabindex INSIDE the root is still a stop.
    await page.evaluate(() => document.querySelector('#root')!.insertAdjacentHTML('beforeend', '<div id="inner" tabindex="0">inner</div>'));
    expect(await stops(page, '#root')).toEqual(['a', 'b', 'inner']);
  });

  test('a slotted element is listed once, where the shadow tree places it; a child that no slot takes is not listed; a root that is a shadow host is asked through its shadow tree', async ({ page }) => {
    await open(page, `${HOST}<div id="root"><button id="first">first</button><x-host id="host"><button id="slotted">slotted</button><button id="ended" slot="end">ended</button><button id="lost" slot="nowhere">lost</button></x-host><button id="last">last</button></div>`);
    expect(await stops(page, '#root')).toEqual(['first', 'before', 'slotted', 'after', 'ended', 'last']);
    expect(await stops(page, '#host')).toEqual(['before', 'slotted', 'after', 'ended']);
  });

  test('what is disabled, hidden, inert or not drawn is no stop, and neither is anything inside it', async ({ page }) => {
    await open(page, '<div id="root"><button id="a">a</button><button id="off" disabled>off</button><div hidden><button id="h">h</button></div><div inert><button id="i">i</button></div><div style="display: none"><button id="n">n</button></div><button id="z">z</button></div>');
    expect(await stops(page, '#root')).toEqual(['a', 'z']);
  });
});

test.describe('trapFocus()', () => {
  test('Tab from the last stop goes to the first, and Shift+Tab from the first — or from the container itself — to the last, when the container has a tabIndex of its own', async ({ page }) => {
    await open(page, '<button id="outside">outside</button><div id="root" tabindex="0"><button id="a">a</button><button id="b">b</button><button id="c">c</button></div>');
    await page.evaluate(async () => {
      const { trapFocus } = (await import('/modal.js' as string)) as { trapFocus(event: KeyboardEvent, container: HTMLElement): void };
      const root = document.querySelector<HTMLElement>('#root')!;
      root.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') trapFocus(event, root);
      });
    });
    const active = () => page.evaluate(() => document.activeElement?.id);
    await page.locator('#c').focus();
    await page.keyboard.press('Tab');
    expect(await active(), 'Tab from the last').toBe('a');
    await page.keyboard.press('Shift+Tab');
    expect(await active(), 'Shift+Tab from the first').toBe('c');
    await page.locator('#root').focus();
    await page.keyboard.press('Shift+Tab');
    expect(await active(), 'Shift+Tab from the container').toBe('c');
  });
});
