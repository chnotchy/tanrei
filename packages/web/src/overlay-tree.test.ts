// A component's top-layer surface is exposed as what it is, or not at all: an element with the `popover` attribute and
// no role is given the role `group` by Chromium, and stood — unnamed — between a menu and its items, around a select's
// list box, around a popover's dialog. A surface that is only
// a placed box carries `role="none"`; one that is the thing itself carries its role and its name (a submenu's and a FAB
// menu's `menu`, a tooltip's `tooltip`, a docked picker's `dialog`).
//
// Each component with a top-layer surface is opened as a real overlay (never `inline`, which has no popover) and read
// over the DevTools protocol: what Chromium computed for the popover element itself, and the tree around it.
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures } from '../test/harness.js';

type P = Page;

/** The page's accessibility tree as Chromium computed it: one line a node, indented by depth, without text runs and generic boxes. */
async function tree(page: P): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const lines: string[] = [];
  const walk = (id: string, depth: number) => {
    const node = byId.get(id);
    if (!node) return;
    const role = node.role?.value as string;
    const shown = !node.ignored && !['RootWebArea', 'StaticText', 'InlineTextBox', 'LineBreak', 'generic', 'none'].includes(role);
    if (shown) lines.push(`${'  '.repeat(depth)}${role}:${(node.name?.value as string | undefined) ?? ''}`);
    for (const child of node.childIds ?? []) walk(child, depth + (shown ? 1 : 0));
  };
  walk(nodes[0]!.nodeId, 0);
  return lines;
}

/**
 * Every element with the `popover` attribute, through shadow roots, with what Chromium computed for it: `ignored` (not
 * in the tree), or its role and name.
 */
async function popovers(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { result } = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const found = [];
      const walk = (root) => { for (const el of root.querySelectorAll('*')) { if (el.hasAttribute('popover')) found.push(el); if (el.shadowRoot) walk(el.shadowRoot); } };
      walk(document);
      return found;
    })()`,
  });
  const { result: properties } = await cdp.send('Runtime.getProperties', { objectId: result.objectId!, ownProperties: true });
  const out: { host: string; open: boolean; ignored: boolean; role: string; name: string }[] = [];
  for (const property of properties) {
    if (!/^\d+$/.test(property.name) || !property.value?.objectId) continue;
    const objectId = property.value.objectId;
    const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { objectId, fetchRelatives: false });
    const { result: about } = await cdp.send('Runtime.callFunctionOn', { objectId, functionDeclaration: 'function () { return [this.getRootNode().host?.localName ?? "", this.matches(":popover-open")]; }', returnByValue: true });
    const [host, open] = about.value as [string, boolean];
    const node = nodes[0]!;
    out.push({ host, open, ignored: !!node.ignored || ['generic', 'none'].includes(node.role?.value as string), role: node.ignored ? '' : (node.role?.value as string), name: node.ignored ? '' : ((node.name?.value as string | undefined) ?? '') });
  }
  await cdp.detach();
  return out;
}

/** One fixture of a component's spec, mounted as a real overlay. */
async function mount(page: P, name: string, id: string, props: Fixture['props'] = {}) {
  const spec = loadSpec(name);
  const fixture = spec.fixtures.find((f) => f.id === id);
  if (!fixture) throw new Error(`${name} has no fixture ${id}`);
  await mountFixtures(page, spec, { icons: true, reducedMotion: true, fixtures: [{ ...fixture, props: { ...fixture.props, ...props } }] });
}

/** Waits until `count` popover elements are open, and the frames after it. */
async function opened(page: P, count = 1) {
  await expect
    .poll(async () => (await popovers(page)).filter((p) => p.open).length)
    .toBe(count);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

/** No open popover element is a group without a name, and none is a group at all: a box is not exposed, a thing has its role. */
function expectNoBareGroup(found: Awaited<ReturnType<typeof popovers>>) {
  for (const p of found.filter((p) => p.open)) expect(p.ignored || p.role !== 'group', `${p.host}: its popover element is exposed as ${p.role}:${p.name}`).toBe(true);
}

test.describe('the top-layer surface in Chromium’s accessibility tree', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the computed tree is read over the DevTools protocol');

  test('menu: the surface is not exposed — the items, the titled groups and the separators are the menu’s own children', async ({ page }) => {
    await mount(page, 'menu', 'groups', { anchor: 'opener' });
    await opened(page);
    const found = await popovers(page);
    expectNoBareGroup(found);
    expect(found).toEqual([{ host: 'tanrei-menu', open: true, ignored: true, role: '', name: '' }]);
    expect(await tree(page)).toEqual(['main:', '  button:opener', '  menu:opener', '    group:', '      menuitem:Cut', '      menuitem:Copy', '      menuitem:Paste', '    separator:', '    group:', '      menuitem:Select all']);
  });

  test('menu with a submenu: the menu’s surface is not exposed, and the submenu’s surface is the submenu — a menu named by its item, under that item', async ({ page }) => {
    await mount(page, 'menu', 'submenu-open', { anchor: 'opener' });
    await opened(page, 2);
    const found = await popovers(page);
    expectNoBareGroup(found);
    expect(found).toEqual([
      { host: 'tanrei-menu', open: true, ignored: true, role: '', name: '' },
      { host: 'tanrei-submenu', open: true, ignored: false, role: 'menu', name: 'Open recent' },
    ]);
    expect(await tree(page)).toEqual(['main:', '  button:opener', '  menu:opener', '    menuitem:New', '    menuitem:Open recent', '      menu:Open recent', '        menuitem:Report.pdf', '        menuitem:Budget.xlsx', '        menuitem:Notes.txt', '    menuitem:Save']);
  });

  test('button with menu: its menu’s surface is not exposed — the items are the menu’s own children', async ({ page }) => {
    await mount(page, 'button-with-menu', 'filled-medium');
    await page.locator('tanrei-button-with-menu').evaluate((el) => {
      el.insertAdjacentHTML('beforeend', '<tanrei-menu-item slot="menu" label="Save as…"></tanrei-menu-item><tanrei-menu-item slot="menu" label="Save a copy"></tanrei-menu-item>');
      (el as HTMLElement & { open: boolean }).open = true;
    });
    await opened(page);
    const found = await popovers(page);
    expectNoBareGroup(found);
    expect(found).toEqual([{ host: 'tanrei-menu', open: true, ignored: true, role: '', name: '' }]);
    expect((await tree(page)).filter((line) => /^\s*(group|menu|menuitem):/.test(line))).toEqual(['  menu:More save options', '    menuitem:Save as…', '    menuitem:Save a copy']);
  });

  test('FAB menu: the list is the menu itself, named by the toggle’s label', async ({ page }) => {
    await mount(page, 'fab-menu', 'filled-open', { inline: false });
    await opened(page);
    const found = await popovers(page);
    expectNoBareGroup(found);
    expect(found).toEqual([{ host: 'tanrei-fab-menu', open: true, ignored: false, role: 'menu', name: 'Create' }]);
    expect((await tree(page)).filter((line) => /^\s*(menu|menuitem):/.test(line))).toEqual(['  menu:Create', '    menuitem:Document', '    menuitem:Folder', '    menuitem:Upload']);
  });

  test('select: the placed box is not exposed — the list box stands by itself, named by the label', async ({ page }) => {
    await mount(page, 'select', 'stacked-open', { inline: false });
    await opened(page);
    const found = await popovers(page);
    expectNoBareGroup(found);
    expect(found).toEqual([{ host: 'tanrei-select', open: true, ignored: true, role: '', name: '' }]);
    // The status row's two live regions (SEL-69) are there, empty, while the list is shown with nothing to say: beside the
    // list box, never inside it. An error of the value is still announced by the Field that frames the select.
    expect(await tree(page)).toEqual(['main:', '  combobox:Country', '  listbox:Country', '    option:Canada', '    option:France', '    option:Japan', '    option:Kenya', '    option:New Zealand', '  status:', '  alert:']);
  });

  test('combobox: the placed box is not exposed — the list box stands by itself, named by the label', async ({ page }) => {
    await mount(page, 'combobox', 'stacked-open', { inline: false });
    await opened(page);
    const found = await popovers(page);
    expectNoBareGroup(found);
    expect(found).toEqual([{ host: 'tanrei-combobox', open: true, ignored: true, role: '', name: '' }]);
    const lines = await tree(page);
    expect(lines.filter((line) => /^\s*(group|listbox|option):/.test(line))).toEqual(['  listbox:City', '    option:Kyoto', '    option:Lisbon', '    option:Nairobi', '    option:Tokyo', '    option:Toronto']);
    expect(lines[1], 'the field first').toBe('  combobox:City');
  });

  test('popover: the placed box is not exposed — the dialog stands by itself, named by its headline', async ({ page }) => {
    await mount(page, 'popover', 'closable', { anchor: 'opener' });
    await opened(page);
    const found = await popovers(page);
    expectNoBareGroup(found);
    expect(found).toEqual([{ host: 'tanrei-popover', open: true, ignored: true, role: '', name: '' }]);
    expect(await tree(page)).toEqual(['main:', '  button:Storage', '  dialog:Storage', '    heading:Storage', '    button:Close storage']);
  });

  test('tooltip: the surface is the tooltip — hidden while its text is the anchor’s description, and a tooltip with that text where it describes nothing', async ({ page }) => {
    // Describing (the default): the text is the anchor's description, and the surface is hidden from the tree.
    await mount(page, 'tooltip', 'plain');
    await opened(page);
    let found = await popovers(page);
    expectNoBareGroup(found);
    expect(found).toEqual([{ host: 'tanrei-tooltip', open: true, ignored: true, role: '', name: '' }]);
    expect((await tree(page)).filter((line) => /^\s*(group|tooltip):/.test(line))).toEqual([]);
    // Not describing: the surface itself is exposed, as a tooltip.
    await mount(page, 'tooltip', 'plain', { describes: false });
    await opened(page);
    found = await popovers(page);
    expectNoBareGroup(found);
    expect(found.map((p) => [p.host, p.open, p.ignored, p.role])).toEqual([['tanrei-tooltip', true, false, 'tooltip']]);
    expect((await tree(page)).filter((line) => /^\s*group:/.test(line))).toEqual([]);
  });

  test('date-time picker, docked: the surface is the dialog itself, named by its label', async ({ page }) => {
    await mount(page, 'date-time-picker', 'docked-date', { inline: false, anchor: 'opener' });
    await opened(page);
    const found = await popovers(page);
    expectNoBareGroup(found);
    expect(found.map((p) => [p.host, p.open, p.ignored, p.role])).toEqual([['tanrei-date-time-picker', true, false, 'dialog']]);
    expect(found[0]!.name).not.toBe('');
    const lines = await tree(page);
    expect(lines.filter((line) => line.search(/\S/) <= 2)).toEqual(['main:', '  button:opener', `  dialog:${found[0]!.name}`]);
    expect(lines.filter((line) => /^\s*group:$/.test(line)), 'no unnamed group anywhere in it').toEqual([]);
  });

  test('search view: the view is not exposed — the list of suggestions stands by itself, named by the field’s label', async ({ page }) => {
    await mount(page, 'search', 'docked', { inline: false });
    await opened(page);
    const found = await popovers(page);
    expectNoBareGroup(found);
    expect(found).toEqual([{ host: 'tanrei-search', open: true, ignored: true, role: '', name: '' }]);
    const lines = await tree(page);
    // The query row (the value as typed, SRC-57) is the listbox's first option, before the suggestions.
    expect(lines.filter((line) => /^\s*(group|listbox|option):/.test(line))).toEqual(['  listbox:Search mail', '    option:inv', '    option:invoices', '    option:invoice template', '    option:Invoices']);
    expect(lines[1], 'the field first').toBe('  combobox:Search mail');
  });
});
