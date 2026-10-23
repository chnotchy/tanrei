// The locators the web guide's "Testing" section gives a product (apps/docs/src/content/docs/getting-started/web.mdx):
// each one finds what the guide says it finds, and each one the guide warns against finds what the guide says it
// does not — in every engine. A change that moves a role into or out of a shadow root fails here before the guide
// is wrong.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');
const TAGS = ['tanrei-button', 'tanrei-switch', 'tanrei-tabs', 'tanrei-tab', 'tanrei-tab-panel', 'tanrei-dialog', 'tanrei-menu', 'tanrei-menu-item'];

async function mount(page: Page, body: string) {
  await page.setContent(`<!doctype html><html lang="en" data-tanrei-theme="light"><head>
    <style>${read('dist/tokens.css')}</style>
    </head><body>${body}<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction((tags) => tags.every((tag) => !!customElements.get(tag)), TAGS);
}

test('a control is found by its role and name: the role is on the native element in the shadow root', async ({ page }) => {
  await mount(page, `<tanrei-button id="save">Save</tanrei-button> <tanrei-switch label="Wi-Fi" checked></tanrei-switch>`);
  const save = page.getByRole('button', { name: 'Save' });
  await expect(save).toHaveCount(1);
  // The host has no role of its own; the button found is the one inside it.
  expect(await page.locator('#save').getAttribute('role')).toBeNull();
  expect(await save.evaluate((el) => [el.localName, (el.getRootNode() as ShadowRoot).host?.id])).toEqual(['button', 'save']);
  // A click on the button inside reaches the host's own listeners.
  await page.locator('#save').evaluate((host) => host.addEventListener('click', () => host.setAttribute('data-clicked', ''), { once: true }));
  await save.click();
  await expect(page.locator('#save')).toHaveAttribute('data-clicked', '');
  await expect(page.getByRole('switch', { name: 'Wi-Fi' })).toBeChecked();
});

test('tabs: the named tab list is in the shadow root and the tabs are the product’s children — chained from the list they are not found, from the element that holds the list they are', async ({ page }) => {
  await mount(page, `<tanrei-tabs label="Sections" value="general">
      <tanrei-tab value="general">General</tanrei-tab>
      <tanrei-tab value="billing">Billing</tanrei-tab>
      <tanrei-tab-panel value="general">Name and language</tanrei-tab-panel>
      <tanrei-tab-panel value="billing">Plan and invoices</tanrei-tab-panel>
    </tanrei-tabs>`);
  await expect(page.getByRole('tablist', { name: 'Sections' })).toHaveCount(1);
  await expect(page.getByRole('tablist', { name: 'Sections' }).getByRole('tab', { name: 'Billing' })).toHaveCount(0);
  const sections = page.locator('tanrei-tabs', { has: page.getByRole('tablist', { name: 'Sections' }) });
  const billing = sections.getByRole('tab', { name: 'Billing' });
  await expect(billing).toHaveCount(1);
  await billing.click();
  await expect(billing).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('tanrei-tabs')).toHaveJSProperty('value', 'billing');
});

test('dialog: the named dialog is in the shadow root and its actions are the product’s children — chained from the dialog they are not found, from the element that holds it they are', async ({ page }) => {
  await mount(page, `<tanrei-dialog headline="Delete the file?" open>
      <tanrei-button slot="actions" dismissive>Cancel</tanrei-button>
      <tanrei-button slot="actions" confirming>Delete</tanrei-button>
    </tanrei-dialog>`);
  const dialog = page.getByRole('dialog', { name: 'Delete the file?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  const confirm = page.locator('tanrei-dialog', { has: page.getByRole('dialog', { name: 'Delete the file?' }) });
  await expect(confirm.getByRole('button', { name: 'Delete' })).toBeVisible();
});

test('menu: while it is open the element is the menu, named by its anchor, and takes no room in the page — its items are visible, the element is not', async ({ page }) => {
  await mount(page, `<tanrei-button id="more">More</tanrei-button>
    <tanrei-menu anchor="more"><tanrei-menu-item label="Rename"></tanrei-menu-item><tanrei-menu-item label="Delete"></tanrei-menu-item></tanrei-menu>`);
  // The product opens the menu from its anchor and closes it when the menu asks.
  await page.locator('tanrei-menu').evaluate((element) => {
    const menu = element as HTMLElement & { open: boolean };
    document.getElementById('more')!.addEventListener('click', () => (menu.open = true));
    menu.addEventListener('close', () => (menu.open = false));
  });
  const menu = page.getByRole('menu', { name: 'More' });
  await expect(menu).toHaveCount(0);
  await page.getByRole('button', { name: 'More' }).click();
  await expect(menu).toBeAttached();
  await expect(menu.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
  // The surface is in the top layer; the element itself is an empty box in the page.
  await expect(menu).not.toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
});
