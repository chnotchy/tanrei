// <tanrei-app-shell> and app-shell.css, driven by specs/app-shell.spec.json: every behaviour id (APS-1…32) is cited by
// a test title, every fixture has a baseline, and every length and color is read back from the tokens — never from a
// number written here (the numbers of a `verify` are the spec's own, for the default system). A fixture is drawn alone,
// in the window APS-2's verify names for it (`appShellWindow`): the frame reads the window's width and nothing else.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
// The build's own step (scripts/build.js), read here so a width that drifts from its token fails a test.
import { declarations, propertyOf, resolved, tokensIn, writeConditions } from '../../../scripts/conditions.js';
import { type DocumentOptions, type Fixture, appShellWindow, fixturesDocument, loadSpec, mountFixtures, resolveColor, resolveToken, tab, rootTokens } from '../../../test/harness.js';
import { allSettled } from '../../../test/settled.js';

const spec = loadSpec('app-shell');
type P = Page;
const TAG = 'tanrei-app-shell';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const T = (name: string) => `--tanrei-comp-app-shell-${name}`;
const WINDOWS = { compact: { width: 400, height: 800 }, medium: { width: 800, height: 800 }, expanded: { width: 1280, height: 800 } } as const;

const shell = (page: P) => page.locator(TAG).first();
const region = (page: P, name: string) => page.locator(`${TAG} > [slot="${name}"]`).first();
const main = (page: P) => page.locator(`${TAG} > main`).first();
const menu = (page: P) => page.locator(`${TAG} [data-app-shell-menu]`).first();
const drawer = (page: P) => page.locator(`${TAG} > tanrei-navigation-drawer`).first();
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const px = async (locator: Locator, property: string) => Number.parseFloat(await css(locator, property));
const edges = (locator: Locator) =>
  locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
/** Where the content of an element is drawn: its box less its paddings and borders. */
const contentBox = (locator: Locator) =>
  locator.evaluate((el) => {
    const [r, s] = [el.getBoundingClientRect(), getComputedStyle(el)];
    const n = (v: string) => Number.parseFloat(v) || 0;
    const left = r.left + n(s.borderLeftWidth) + n(s.paddingLeft);
    const right = r.right - n(s.borderRightWidth) - n(s.paddingRight);
    const top = r.top + n(s.borderTopWidth) + n(s.paddingTop);
    const bottom = r.bottom - n(s.borderBottomWidth) - n(s.paddingBottom);
    return { left, right, top, bottom, width: right - left, height: bottom - top };
  });
const near = (a: number, b: number, tolerance = 0.6) => expect(Math.abs(a - b), `${a} ≈ ${b}`).toBeLessThanOrEqual(tolerance);
const frame = (page: P) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning' && message.text().includes('[tanrei]')) seen.push(message.text());
  });
  return seen;
}
const fixture = (id: string) => spec.fixtures.find((f) => f.id === id)!;
/** A frame whose regions are written by the test (markup that holds a `<main>` is used as it is). */
const own = (id: string, props: Fixture['props'], content: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content, ...extra });
/** Whether an element is drawn at all: it and everything it stands in has a box. */
const shown = (locator: Locator) => locator.evaluate((el) => el.getClientRects().length > 0);
const windowClass = (page: P) => shell(page).evaluate((el) => (el as unknown as { windowClass: string | null }).windowClass);
const inherited = (page: P) => main(page).evaluate((el) => getComputedStyle(el).getPropertyValue('--tanrei-app-shell-window-class').trim());
const scrollY = (page: P) => page.evaluate(() => Math.round(window.scrollY));
const active = (page: P) =>
  page.evaluate(() => {
    let at: Element | null = document.activeElement;
    const path: string[] = [];
    while (at) {
      path.push(at.id ? `#${at.id}` : at.getAttribute('data-app-shell-menu') !== null ? 'menu' : at.getAttribute('slot') ? `${at.localName}[${at.getAttribute('slot')}]` : at.localName);
      at = at.shadowRoot?.activeElement ?? null;
    }
    return path.join(' » ');
  });

/** One fixture alone, in the window its id names (or the one given). */
async function mount(page: P, f: Fixture | string, { width, height, ...options }: DocumentOptions & { width?: number; height?: number; reducedMotion?: boolean } = {}) {
  const one = typeof f === 'string' ? fixture(f) : f;
  const size = appShellWindow(one.id);
  await page.setViewportSize({ width: width ?? size.width, height: height ?? size.height });
  await mountFixtures(page, spec, { icons: true, fixtures: [one], ...options });
  await frame(page);
}
/** Records the frame's two events from now on, in order: `[name, what it carried]`. */
async function record(page: P) {
  await page.evaluate(() => {
    const log: [string, unknown][] = [];
    (window as unknown as { __log: typeof log }).__log = log;
    document.addEventListener('windowclasschange', (event) => log.push(['windowclasschange', (event as CustomEvent).detail.windowClass]));
    document.addEventListener('navigationopenchange', (event) => log.push(['navigationopenchange', (event as CustomEvent).detail.navigationOpen]));
  });
  return () => page.evaluate(() => (window as unknown as { __log: [string, unknown][] }).__log);
}
const resize = async (page: P, width: number, height = 800) => {
  await page.setViewportSize({ width, height });
  await frame(page);
};

// A frame made of the real components (a fixture can fill a region with text only, so the frame is built here): an app bar with the menu button in a header, a responsive navigation drawer, a main
// region with headings and links, an aside, a footer and, where asked, a navigation bar.
const DRAWER = (attributes = 'responsive collapsible') => `<tanrei-navigation-drawer slot="navigation" ${attributes} label="Documentation" value="start">
  <tanrei-button slot="header-button" variant="text" label="Collapse navigation"><span slot="icon">menu</span></tanrei-button>
  <tanrei-navigation-drawer-item value="start" href="#s1" label="Getting started" icon="home"></tanrei-navigation-drawer-item>
  <tanrei-navigation-drawer-item value="tokens" href="#s2" label="Tokens" icon="palette"></tanrei-navigation-drawer-item>
</tanrei-navigation-drawer>`;
const BAR = `<tanrei-navigation-bar slot="navigation-bar" label="Sections" value="a">
  <tanrei-navigation-bar-item value="a" label="Home" icon="home"></tanrei-navigation-bar-item>
  <tanrei-navigation-bar-item value="b" label="Search" icon="search"></tanrei-navigation-bar-item>
  <tanrei-navigation-bar-item value="c" label="Saved" icon="bookmark"></tanrei-navigation-bar-item>
</tanrei-navigation-bar>`;
const SECTIONS = (count: number) =>
  Array.from({ length: count }, (_, i) => `<h2 id="s${i + 1}" style="margin: 0">Section ${i + 1}</h2><p style="block-size: 400px; margin: 0"><a id="link${i + 1}" href="#s1">Link ${i + 1}</a></p>`).join('');
interface Real {
  navigation?: string;
  aside?: string;
  footer?: boolean;
  bar?: boolean;
  sections?: number;
  props?: Fixture['props'];
  announcement?: string;
  direction?: 'rtl';
}
const real = ({ navigation = DRAWER(), aside = '<aside slot="aside"><a id="aside-link" href="#s1">Aside link</a></aside>', footer = true, bar = false, sections = 0, props = {}, announcement = '', direction }: Real = {}): Fixture =>
  own(
    'real',
    { asideLabel: 'On this page', ...props },
    `<a class="tanrei-link" data-standalone slot="skip-link" href="#main">Skip to content</a>
    ${announcement}
    <header slot="header"><tanrei-app-bar headline="Tanrei"><tanrei-button slot="navigation" data-app-shell-menu variant="text" label="Menu"><span slot="icon">menu</span></tanrei-button></tanrei-app-bar></header>
    ${navigation}
    ${props.asideOrder === 'before' ? aside : ''}
    <main id="main" tabindex="-1"><p style="margin: 0"><a id="first" href="#s3">First link</a></p>${SECTIONS(sections)}</main>
    ${props.asideOrder === 'before' ? '' : aside}
    ${footer ? '<footer slot="footer"><a id="footer-link" href="#main">Footer link</a></footer>' : ''}
    ${bar ? BAR : ''}`,
    direction ? { direction } : {},
  );
/** The landmarks of the page as Chromium's accessibility tree has them, in order: `role "name"`. */
async function landmarks(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const roles = ['banner', 'navigation', 'main', 'complementary', 'contentinfo'];
  // In the order of the tree: the list the protocol gives is not in it.
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const found: string[] = [];
  const walk = (id: string) => {
    const node = byId.get(id);
    if (!node) return;
    if (!node.ignored && roles.includes(String(node.role?.value))) found.push(`${node.role!.value}${node.name?.value ? ` "${node.name.value}"` : ''}`);
    for (const child of node.childIds ?? []) walk(child);
  };
  const root = nodes.find((node) => !node.parentId);
  if (root) walk(root.nodeId);
  return found;
}
/** One node of Chromium's accessibility tree by role and name: its properties by name. */
async function axNode(page: P, role: string, name: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const node = nodes.find((n) => !n.ignored && n.role?.value === role && n.name?.value === name);
  return node ? Object.fromEntries((node.properties ?? []).map((property) => [property.name, property.value.value ?? property.value.relatedNodes?.length])) : null;
}

test.describe('the frame and its regions', () => {
  test('APS-1: the frame fills the window with container.color and hands down content.color; the announcement and the header across the top, then the navigation at the start edge, the main region and the aside at the end edge, the footer across the bottom; a region that holds nothing takes no space and adds no landmark, and its neighbours take its room; no elevation and no corner', async ({ page }) => {
    await mount(page, 'expanded-announcement');
    const host = shell(page);
    expect(await css(host, 'background-color')).toBe(await resolveColor(page, T('container-color')));
    expect(await css(main(page), 'color')).toBe(await resolveColor(page, T('content-color')));
    expect([await css(host, 'box-shadow'), await px(host, 'border-top-left-radius')]).toEqual(['none', 0]);
    const [frameBox, announcement, header, navigation, content, aside, footer] = await Promise.all([host, region(page, 'announcement'), region(page, 'header'), region(page, 'navigation'), main(page), region(page, 'aside'), region(page, 'footer')].map(edges));
    // The frame is the window.
    expect([frameBox.left, frameBox.top, frameBox.width, frameBox.height]).toEqual([0, 0, 1280, 800]);
    // Across the top: the announcement, then the header, each the frame's whole width.
    expect([announcement.top, announcement.left, announcement.width]).toEqual([0, 0, 1280]);
    expect([header.top, header.left, header.width]).toEqual([announcement.bottom, 0, 1280]);
    // The row: the navigation at the start edge, the main region, the aside at the end edge.
    expect([navigation.left, navigation.top]).toEqual([0, header.bottom]);
    expect([content.left, content.top, content.right]).toEqual([navigation.right, header.bottom, aside.left]);
    expect([aside.right, aside.top]).toEqual([1280, header.bottom]);
    // The footer across the bottom of the page.
    expect([footer.left, footer.width, footer.bottom, footer.top]).toEqual([0, 1280, 800, content.bottom]);

    // A frame with a header and a main region only: the main region has the whole row, and nothing else is there.
    await mount(page, 'expanded-main-only');
    const alone = await edges(main(page));
    expect([alone.left, alone.width, alone.bottom]).toEqual([0, 1280, 800]);
    await expect(page.locator(`${TAG} > *`)).toHaveCount(2);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('complementary')).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    // Without an aside the main region reaches the end edge; without a navigation it starts at the start edge.
    await mount(page, 'expanded-no-aside');
    expect((await edges(main(page))).right).toBe(1280);
    await mount(page, 'expanded-no-navigation');
    expect((await edges(main(page))).left).toBe(0);
  });

  test('APS-2: the class is the window’s width alone — compact under breakpoint.medium (600), medium from it and under breakpoint.expanded (1024), expanded from that: 1024 is expanded and 1023 medium, 600 medium and 599 compact — derived anew at each change, never stored, and the height is not read', async ({ page }) => {
    await mount(page, real());
    expect([await resolveToken(page, T('breakpoint-medium')), await resolveToken(page, T('breakpoint-expanded'))]).toEqual([600, 1024]);
    for (const [width, expected] of [
      [1024, 'expanded'],
      [1023, 'medium'],
      [600, 'medium'],
      [599, 'compact'],
      [1280, 'expanded'],
      [320, 'compact'],
    ] as const) {
      await resize(page, width);
      expect([width, await windowClass(page), await shell(page).getAttribute('data-window-class'), await inherited(page)]).toEqual([width, expected, expected, expected]);
    }
    // The height, and nothing but the width, leaves the class as it is.
    await resize(page, 1280, 300);
    expect(await windowClass(page)).toBe('expanded');
    await resize(page, 500, 1400);
    expect(await windowClass(page)).toBe('compact');
    // Never stored: no attribute but the state attribute holds it, and the property cannot be written.
    expect(await shell(page).evaluate((el) => [...el.attributes].map((a) => a.name).filter((name) => /class/.test(name)))).toEqual(['data-window-class']);
    expect(await shell(page).evaluate((el) => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'windowClass')?.set)).toBeUndefined();
  });

  test('APS-2: the two widths in the stylesheet’s conditions are the tokens’, in rem, under the default system and every preset — and a layer that moves a width moves the conditions', async ({ page }) => {
    const source = fs.readFileSync(path.join(pkg, 'src/styles/app-shell.css'), 'utf8');
    const built = fs.readFileSync(path.join(pkg, 'dist/app-shell.css'), 'utf8');
    const ids = ['comp.app-shell.breakpoint.medium', 'comp.app-shell.breakpoint.expanded'];
    expect(tokensIn(source).sort()).toEqual([...ids].sort());
    // No width is written in the source, and no token() is left in what is built.
    expect(source.match(/@media[^{]*\d/g)).toBeNull();
    expect(built).not.toMatch(/(?<!`)token\(/);
    const conditions = [...built.matchAll(/@media \(width (>=|<) ([\d.]+rem)\)/g)].map((match) => match[2]);
    expect(conditions.length).toBeGreaterThanOrEqual(6);
    // The built conditions are what the page's tokens resolve to, under each shipped system.
    const systems = ['', ...fs.readdirSync(path.join(pkg, 'dist/systems')).filter((file) => /^[a-z0-9-]+\.css$/.test(file)).map((file) => file.replace('.css', ''))];
    expect(systems.length).toBeGreaterThan(3);
    for (const system of systems) {
      await mount(page, 'expanded-main-only', system ? { system } : {});
      const [medium, expanded] = [await resolveToken(page, T('breakpoint-medium')), await resolveToken(page, T('breakpoint-expanded'))];
      const sheet = system && fs.existsSync(path.join(pkg, `dist/systems/${system}.app-shell.css`)) ? fs.readFileSync(path.join(pkg, `dist/systems/${system}.app-shell.css`), 'utf8') : built;
      const written = [...new Set([...sheet.matchAll(/@media \(width (>=|<) ([\d.]+)rem\)/g)].map((match) => Number(match[2]) * 16))].sort((a, b) => a - b);
      expect(written, system || 'default').toEqual([medium, expanded]);
      // …and what the element listens to is what the stylesheet says.
      expect(await shell(page).evaluate((el) => ['medium', 'expanded'].map((name) => Number.parseFloat(getComputedStyle(el).getPropertyValue(`--_aps-breakpoint-${name}`)) * 16))).toEqual([medium, expanded]);
    }
    // A layer that sets the system's window classes — or the frame's own tokens — gets other conditions.
    const tokens = declarations(fs.readFileSync(path.join(pkg, 'src/generated/tokens.css'), 'utf8'));
    expect(ids.map((id) => resolved(id, tokens))).toEqual(['37.5rem', '64rem']);
    const layer = declarations(`:root { --tanrei-sys-breakpoint-medium: 45rem; ${propertyOf('comp.app-shell.breakpoint.expanded')}: 1200px; }`, tokens);
    expect(ids.map((id) => resolved(id, layer))).toEqual(['45rem', '75rem']);
    const moved = writeConditions(source, layer);
    expect(moved).toContain('@media (width >= 45rem)');
    expect(moved).toContain('@media (width >= 75rem)');
    expect(moved).toContain('--_aps-breakpoint-medium: 45rem;');
    expect(moved).not.toContain('37.5rem');
    // A width the build cannot resolve stops it.
    expect(() => writeConditions(source, declarations(`:root { --tanrei-sys-breakpoint-medium: 50vw; }`, tokens))).toThrow(/cannot resolve/);
  });

  test('APS-3: a frame created at 1280 emits one windowClassChange with expanded; resized to 1100 it emits nothing; resized to 500 it emits one with compact; what it holds inherits the class', async ({ page }) => {
    await mount(page, 'expanded-main-only', { width: 1280 });
    const log = await record(page);
    await page.evaluate(() => {
      const created = document.createElement('tanrei-app-shell');
      created.id = 'created';
      created.innerHTML = '<main><span id="inside">Main</span></main>';
      document.querySelector('.stage')!.replaceChildren(created);
    });
    await frame(page);
    expect(await log()).toEqual([['windowclasschange', 'expanded']]);
    const inside = () => page.locator('#inside').evaluate((el) => getComputedStyle(el).getPropertyValue('--tanrei-app-shell-window-class').trim());
    expect(await inside()).toBe('expanded');
    await resize(page, 1100);
    expect(await log()).toEqual([['windowclasschange', 'expanded']]);
    await resize(page, 500);
    expect(await log()).toEqual([
      ['windowclasschange', 'expanded'],
      ['windowclasschange', 'compact'],
    ]);
    expect(await inside()).toBe('compact');
    await resize(page, 520);
    await resize(page, 700);
    expect((await log()).map((entry) => entry[1])).toEqual(['expanded', 'compact', 'medium']);
    expect(await inside()).toBe('medium');
    // A component in the frame follows the class from the cascade alone, with no script of its own.
    await page.addStyleTag({ content: '@container style(--tanrei-app-shell-window-class: medium) { #inside { --followed: yes; } }' });
    const queries = await page.evaluate(() => CSS.supports('container-type: inline-size') && getComputedStyle(document.querySelector('#inside')!).getPropertyValue('--followed').trim() === 'yes');
    if (queries) {
      await resize(page, 1280);
      expect(await page.locator('#inside').evaluate((el) => getComputedStyle(el).getPropertyValue('--followed').trim())).toBe('');
    }
  });
});

test.describe('the window’s text size', () => {
  // A window's default text size is the browser's own setting: Chromium and Firefox take it at launch (WebKit has no
  // switch for it). A media condition in rem is compared with it, and with nothing the page can set.
  // The test launches a browser of its own for that (a launch option cannot be set for one test).
  test('APS-2: the widths are compared in rem — a window 1280 wide whose text size is doubled is a medium one, and one 1100 wide a compact one', async ({ playwright, browserName }) => {
    // WebKit has no launch switch for the default text size. Firefox has a preference for it, which sets the root's
    // font size and leaves the rem of a media condition at 16 px: there only the reader's zoom narrows the class.
    test.skip(browserName !== 'chromium', 'the default text size can be set at launch, and moves the rem of a media condition, in Chromium only');
    const browser = await playwright[browserName].launch({ args: ['--blink-settings=defaultFontSize=32'] });
    try {
      const page = await (await browser.newContext({ deviceScaleFactor: 2 })).newPage();
      await mount(page, real(), { width: 1280 });
      expect(await page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).fontSize))).toBe(32);
      expect([await windowClass(page), await inherited(page)]).toEqual(['medium', 'medium']);
      // The frame is laid out as a medium one: the aside is in the main region's column, below the main content.
      expect((await edges(region(page, 'aside'))).left).toBeLessThan((await edges(main(page))).right);
      expect((await contentBox(region(page, 'aside'))).top).toBeGreaterThanOrEqual((await contentBox(main(page))).bottom);
      await resize(page, 1100);
      expect(await windowClass(page)).toBe('compact');
      await resize(page, 2048);
      expect(await windowClass(page)).toBe('expanded');
    } finally {
      await browser.close();
    }
  });
});

test.describe('the navigation', () => {
  test('APS-4: a responsive, collapsible drawer in the region is standard at 1280 and Tab leaves it; at 800 its column is 72 wide beside the main region; at 400 nothing of it is in the layout; a drawer that is not collapsible is modal at 800 — the frame and the drawer never disagree', async ({ page }) => {
    await mount(page, real(), { width: 1280 });
    const presentation = () => drawer(page).evaluate((el) => (el as unknown as { presentation: string }).presentation);
    await expect.poll(presentation).toBe('standard');
    const wide = await edges(drawer(page));
    expect([wide.left, wide.width]).toEqual([0, await resolveToken(page, '--tanrei-comp-navigation-drawer-container-width')]);
    expect((await edges(main(page))).left).toBe(wide.right);
    // Tab leaves the drawer: it has a place in the layout, and does not hold focus.
    await drawer(page).locator('tanrei-navigation-drawer-item').last().evaluate((el) => (el as HTMLElement).focus());
    await tab(page);
    expect(await active(page)).not.toContain('tanrei-navigation-drawer');

    await resize(page, 800);
    await expect.poll(presentation).toBe('column');
    const column = await edges(drawer(page));
    expect([column.left, column.width]).toEqual([0, 72]);
    expect(column.width).toBe(await resolveToken(page, '--tanrei-comp-navigation-drawer-collapsed-container-width-regular'));
    expect((await edges(main(page))).left).toBe(72);

    await resize(page, 400);
    await expect.poll(presentation).toBe('modal');
    expect((await edges(drawer(page))).width).toBe(0);
    expect((await edges(main(page))).left).toBe(0);
    expect(await drawer(page).evaluate((el) => !!el.shadowRoot!.querySelector('dialog[open]'))).toBe(false);

    await mount(page, real({ navigation: DRAWER('responsive') }), { width: 800 });
    await expect.poll(presentation).toBe('modal');
    expect((await edges(main(page))).left).toBe(0);
    await expect.poll(() => shown(menu(page))).toBe(true);
  });

  test('APS-4: what cannot present itself over the content is shown beside it in an expanded window and not at all in a narrower one — no box, no focus, nothing for assistive technology — and a debug build says the navigation of a narrow window needs a navigation drawer', async ({ page }) => {
    const seen = warnings(page);
    const plain = real({ navigation: '<nav slot="navigation" aria-label="Documentation" style="inline-size: 200px"><a id="nav-link" href="#s1">Tokens</a></nav>' });
    await mount(page, plain, { width: 1280 });
    expect([await shown(region(page, 'navigation')), (await edges(region(page, 'navigation'))).width]).toEqual([true, 200]);
    await expect(page.getByRole('navigation', { name: 'Documentation' })).toHaveCount(1);
    expect(seen.filter((m) => m.includes('APS-4'))).toEqual([]);
    for (const width of [800, 400]) {
      await resize(page, width);
      expect(await shown(region(page, 'navigation')), String(width)).toBe(false);
      await expect(page.getByRole('navigation', { name: 'Documentation' })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Tokens' })).toHaveCount(0);
      expect((await edges(main(page))).left).toBe(0);
    }
    await expect.poll(() => seen.filter((m) => m.includes('APS-4') && m.includes('needs a navigation drawer')).length).toBe(1);
  });

  test('APS-5: the navigation is at the start edge of the row, as wide as what it holds draws itself and never wider than the window less a touch target, the main region has the rest, and the frame adds no padding, fill or edge; while the page scrolls it stays in view from below a sticky header — from the top of the window while the header is static — to the window’s bottom edge, and what it holds scrolls inside that height by itself', async ({ page }) => {
    const tall = '<nav slot="navigation" aria-label="Documentation" style="inline-size: 200px"><div id="tall" style="block-size: 3000px">Tokens</div></nav>';
    await mount(page, real({ navigation: tall, sections: 6 }), { width: 1280 });
    const navigation = region(page, 'navigation');
    const header = await edges(region(page, 'header'));
    const first = await edges(navigation);
    expect([first.left, first.top, first.width, first.height]).toEqual([0, header.bottom, 200, 800 - header.height]);
    expect((await edges(main(page))).left).toBe(200);
    expect([await px(navigation, 'padding-left'), await px(navigation, 'border-left-width'), await css(navigation, 'background-color')]).toEqual([0, 0, 'rgba(0, 0, 0, 0)']);
    // The page scrolls; the navigation stays, and scrolls inside its own height.
    await page.evaluate(() => window.scrollTo(0, 900));
    expect(await scrollY(page)).toBe(900);
    const scrolled = await edges(navigation);
    expect([scrolled.top, scrolled.height]).toEqual([header.bottom, 800 - header.height]);
    expect(await navigation.evaluate((el) => [el.scrollHeight > el.clientHeight, getComputedStyle(el).overflowY, getComputedStyle(el).overscrollBehaviorY])).toEqual([true, 'auto', 'contain']);
    await navigation.evaluate((el) => (el.scrollTop = 500));
    expect(await scrollY(page)).toBe(900);
    // It stops staying in view where the footer begins.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    expect((await edges(navigation)).bottom).toBeLessThanOrEqual((await edges(region(page, 'footer'))).top + 0.5);
    // A page shorter than the window: the navigation is as tall as the row, and the page does not scroll.
    await mount(page, real({ navigation: tall }), { width: 1280 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(800);
    near((await edges(region(page, 'navigation'))).bottom, (await edges(region(page, 'footer'))).top);
    // A static header: from the top of the window.
    await mount(page, real({ navigation: tall, sections: 6, props: { headerPosition: 'static' } }), { width: 1280 });
    await page.evaluate(() => window.scrollTo(0, 900));
    const underStatic = await edges(region(page, 'navigation'));
    expect([underStatic.top, underStatic.height]).toEqual([0, 800]);
    // Never wider than the window less a touch target.
    await mount(page, real({ navigation: tall.replace('200px', '2000px') }), { width: 1280 });
    expect((await edges(region(page, 'navigation'))).width).toBe(1280 - (await resolveToken(page, '--tanrei-sys-target-touch')));
    // A navigation drawer in the region is as tall as that height, and scrolls itself (NVD-61).
    await mount(page, real({ sections: 6 }), { width: 1280 });
    await page.evaluate(() => window.scrollTo(0, 900));
    const bar = await edges(region(page, 'header'));
    const panel = await edges(drawer(page));
    expect([panel.top, panel.height]).toEqual([bar.bottom, 800 - bar.height]);
  });
});

test.describe('the menu button', () => {
  test('APS-6: the fixtures compact and medium draw the menu button at the start of the header, and expanded draws none: not shown, no stop for the keyboard, nothing for assistive technology, and its place given to what is beside it; in the column presentation and with no navigation region there is none either; the button is the icon-only Button it is', async ({ page }) => {
    for (const id of ['compact', 'medium'] as const) {
      await mount(page, id);
      const [button, header] = [await edges(menu(page)), await contentBox(region(page, 'header'))];
      expect(await shown(menu(page)), id).toBe(true);
      near(button.left, header.left);
      await expect(page.getByRole('button', { name: 'Menu' })).toHaveCount(1);
      // Not restyled: its size is a plain icon-only text Button's.
      await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<tanrei-button id="plain" variant="text" label="Menu"><span slot="icon">menu</span></tanrei-button>'));
      await frame(page);
      const plain = await edges(page.locator('#plain'));
      expect([button.width, button.height]).toEqual([plain.width, plain.height]);
    }
    await mount(page, 'expanded');
    expect(await shown(menu(page))).toBe(false);
    await expect(page.getByRole('button', { name: 'Menu' })).toHaveCount(0);
    // Its place is given to what is beside it: the header's text starts where the button would.
    const text = await page.locator(`${TAG} > header`).evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].filter((rect) => rect.width > 0)[0].left;
    });
    near(text, (await contentBox(region(page, 'header'))).left);
    // The column presentation: the drawer's own first header button is its menu button (NVD-37).
    await mount(page, real(), { width: 800 });
    expect(await shown(menu(page))).toBe(false);
    await expect(page.getByRole('button', { name: 'Collapse navigation' })).toHaveCount(1);
    // No navigation region: no menu button, in any window.
    await mount(page, real({ navigation: '' }), { width: 400 });
    expect(await shown(menu(page))).toBe(false);
    // A navigation that arrives is followed at once, and one that leaves.
    await shell(page).evaluate((el, markup) => el.querySelector('header')!.insertAdjacentHTML('afterend', markup), DRAWER());
    await expect.poll(() => shown(menu(page))).toBe(true);
    await drawer(page).evaluate((el) => el.remove());
    await expect.poll(() => shown(menu(page))).toBe(false);
  });

  test('APS-6: where the browser has no style queries the element says whether the menu button is shown, and the same rule hides it', async ({ page }) => {
    await mount(page, real(), { width: 400 });
    const queries = await page.evaluate(() => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('@container style(--probe: on) { #probe-inner { --answer: yes; } }');
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      document.body.insertAdjacentHTML('beforeend', '<div style="--probe: on"><div id="probe-inner"></div></div>');
      return getComputedStyle(document.querySelector('#probe-inner')!).getPropertyValue('--answer').trim() === 'yes';
    });
    expect(await shell(page).getAttribute('data-menu')).toBe(queries ? null : 'shown');
    expect(await shown(menu(page))).toBe(true);
    await resize(page, 1280);
    expect(await shell(page).getAttribute('data-menu')).toBe(queries ? null : 'hidden');
    expect(await shown(menu(page))).toBe(false);
    await resize(page, 800);
    expect(await shell(page).getAttribute('data-menu')).toBe(queries ? null : 'hidden');
    expect(await shown(menu(page))).toBe(false);
    // The attribute alone hides the button, whatever the browser.
    await resize(page, 400);
    expect(await shown(menu(page))).toBe(true);
    await shell(page).evaluate((el) => el.setAttribute('data-menu', 'hidden'));
    expect(await shown(menu(page))).toBe(false);
  });

  test('APS-7: at 400 wide, activating the menu button opens the drawer with focus inside it, the button expanded and controlling the navigation, and one navigationOpenChange carried true; Escape closes it, focus is on the menu button and one carried false; opened at 400 and resized to 1280, the drawer is standard, nothing is inert and one navigationOpenChange carried false', async ({ page, browserName }) => {
    await mount(page, real(), { width: 400 });
    const log = await record(page);
    const open = () => shell(page).evaluate((el) => [(el as unknown as { navigationOpen: boolean }).navigationOpen, el.hasAttribute('navigation-open')]);
    const dialogOpen = () => drawer(page).evaluate((el) => !!el.shadowRoot!.querySelector('dialog[open]'));
    const expanded = () => menu(page).evaluate((el) => el.shadowRoot!.querySelector('button')!.getAttribute('aria-expanded'));
    await expect.poll(expanded).toBe('false');
    // The keyboard reaches the button and activates it.
    await menu(page).evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press('Enter');
    await expect.poll(dialogOpen).toBe(true);
    expect(await open()).toEqual([true, true]);
    expect(await log()).toEqual([['navigationopenchange', true]]);
    await expect.poll(() => active(page)).toContain('tanrei-navigation-drawer');
    await expect.poll(expanded).toBe('true');
    expect(await menu(page).evaluate((el) => {
      const button = el.shadowRoot!.querySelector('button') as HTMLElement & { ariaControlsElements?: Element[] | null };
      return 'ariaControlsElements' in button ? (button.ariaControlsElements ?? []).map((controlled) => controlled.localName) : ['tanrei-navigation-drawer'];
    })).toEqual(['tanrei-navigation-drawer']);
    if (browserName === 'chromium') {
      // The drawer is modal: the button is behind it. It is read again once the drawer has closed.
      expect(await axNode(page, 'dialog', 'Documentation')).not.toBeNull();
    }
    await page.keyboard.press('Escape');
    await expect.poll(dialogOpen).toBe(false);
    expect(await open()).toEqual([false, false]);
    expect(await log()).toEqual([
      ['navigationopenchange', true],
      ['navigationopenchange', false],
    ]);
    await expect.poll(() => active(page)).toContain('menu');
    await expect.poll(expanded).toBe('false');
    if (browserName === 'chromium') expect((await axNode(page, 'button', 'Menu'))?.expanded).toBe(false);

    // A pointer opens it too, and a change of the window's class closes it at once.
    await menu(page).click();
    await expect.poll(dialogOpen).toBe(true);
    await resize(page, 1280);
    await expect.poll(() => drawer(page).evaluate((el) => (el as unknown as { presentation: string }).presentation)).toBe('standard');
    expect(await dialogOpen()).toBe(false);
    expect(await open()).toEqual([false, false]);
    // (The drawer and the frame hear the same width: which of the two speaks first is the browser's.)
    expect((await log()).slice(2).map((entry) => entry.join(':')).sort()).toEqual(['navigationopenchange:false', 'navigationopenchange:true', 'windowclasschange:expanded']);
    expect(await page.evaluate(() => document.querySelectorAll('[inert]').length)).toBe(0);
    expect(await shown(drawer(page))).toBe(true);
  });

  test('APS-7: navigationOpen set by the product opens the navigation and puts it away without an event, and is ignored while the navigation stands beside the content; in the column presentation the drawer’s own menu button widens it over the content and the frame follows', async ({ page }) => {
    await mount(page, real(), { width: 400 });
    const log = await record(page);
    const dialogOpen = () => drawer(page).evaluate((el) => !!el.shadowRoot!.querySelector('dialog[open]'));
    const set = (value: boolean) => shell(page).evaluate((el, v) => ((el as unknown as { navigationOpen: boolean }).navigationOpen = v), value);
    await set(true);
    await expect.poll(dialogOpen).toBe(true);
    await set(false);
    await expect.poll(dialogOpen).toBe(false);
    expect(await log()).toEqual([]);
    // Beside the content the drawer is shown whatever navigationOpen says.
    await resize(page, 1280);
    await set(true);
    await frame(page);
    expect([await dialogOpen(), await shown(drawer(page))]).toEqual([false, true]);
    await set(false);
    // The column: its own menu button widens it over the content.
    await resize(page, 800);
    const before = (await log()).length;
    await page.getByRole('button', { name: 'Collapse navigation' }).click();
    await expect.poll(() => shell(page).evaluate((el) => (el as unknown as { navigationOpen: boolean }).navigationOpen)).toBe(true);
    expect((await log()).slice(before)).toEqual([['navigationopenchange', true]]);
    expect((await edges(main(page))).left).toBe(72);
    await page.keyboard.press('Escape');
    await expect.poll(() => shell(page).evaluate((el) => (el as unknown as { navigationOpen: boolean }).navigationOpen)).toBe(false);
    expect((await log()).slice(before)).toEqual([
      ['navigationopenchange', true],
      ['navigationopenchange', false],
    ]);
  });
});

test.describe('the main region, the aside, the footer', () => {
  test('APS-8: the main region’s content is inset by the gutter of the window’s class and by main.padding-block; contained, it is no wider than main.max-width and centred in its room — 768 centred in the 976 between gutters of 32 at 1280 beside a navigation 240 wide, 368 between gutters of 16 at 400; full, it takes all of that room; a table 2000 wide scrolls in its own box and leaves the window’s width at 400', async ({ page }) => {
    await mount(page, 'expanded-no-aside');
    const [gutter, block, max] = [await resolveToken(page, T('gutter-expanded')), await resolveToken(page, T('main-padding-block')), await resolveToken(page, T('main-max-width'))];
    expect([gutter, block, max]).toEqual([32, 32, 768]);
    const [outer, inner] = [await edges(main(page)), await contentBox(main(page))];
    expect(outer.width).toBe(1280 - 240);
    expect(inner.width).toBe(768);
    // Centred in the room between the gutters.
    near(inner.left - (outer.left + gutter), outer.right - gutter - inner.right);
    expect(outer.width - 2 * gutter).toBe(976);
    expect([inner.top - outer.top, await px(main(page), 'padding-bottom')]).toEqual([block, block]);
    // Full: all the room inside the gutters.
    await mount(page, 'expanded-full');
    expect((await contentBox(main(page))).width).toBe(976);
    // The gutter of each class.
    await mount(page, 'medium');
    expect([await px(main(page), 'padding-left'), await resolveToken(page, T('gutter-medium'))]).toEqual([24, 24]);
    await mount(page, 'compact');
    expect([(await contentBox(main(page))).width, await px(main(page), 'padding-left'), await resolveToken(page, T('gutter-compact'))]).toEqual([368, 16, 16]);
    // Content that cannot shrink scrolls inside its own box, and never widens the frame.
    const table = `<tanrei-table><table><thead><tr>${Array.from({ length: 20 }, (_, i) => `<th scope="col" data-wrap="false"><span style="display: inline-block; inline-size: 100px">Column ${i + 1}</span></th>`).join('')}</tr></thead><tbody><tr>${Array.from({ length: 20 }, () => '<td>1</td>').join('')}</tr></tbody></table></tanrei-table>`;
    await mount(page, own('table', {}, `<header slot="header">Header</header><main id="main">${table}</main>`), { width: 400 });
    await page.addStyleTag({ content: fs.readFileSync(path.join(pkg, 'dist/table.css'), 'utf8') });
    await frame(page);
    expect(await page.locator('tanrei-table table').evaluate((el) => el.scrollWidth)).toBeGreaterThanOrEqual(2000);
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])).toEqual([400, 400]);
    expect((await edges(main(page))).width).toBe(400);
  });

  test('APS-9: expanded draws the aside 240 wide at the end edge, inset by aside.padding-inline and by main.padding-block so its first line is level with the main content’s, in view while the page scrolls and scrolling inside that height by itself; medium and compact draw it in the main region’s column with its gutters, width and centring — below the main content, or above it while asideOrder is before — 24 from it, scrolling with it', async ({ page }) => {
    const long = `<aside slot="aside"><div id="tall" style="block-size: 2400px">Aside</div></aside>`;
    await mount(page, real({ aside: long, sections: 6 }), { width: 1280 });
    const aside = region(page, 'aside');
    const [width, inset, block, gap] = [await resolveToken(page, T('aside-width')), await resolveToken(page, T('aside-padding-inline')), await resolveToken(page, T('main-padding-block')), await resolveToken(page, T('aside-gap'))];
    expect([width, inset, gap]).toEqual([240, 16, 24]);
    const header = await edges(region(page, 'header'));
    const [box, content] = [await edges(aside), await edges(page.locator('#tall'))];
    expect([box.right, box.width, box.top, box.height]).toEqual([1280, 240, header.bottom, 800 - header.height]);
    expect([content.left - box.left, box.right - content.right, content.top - box.top]).toEqual([inset, inset, block]);
    // Level with the main content's first line.
    expect(content.top).toBe((await contentBox(main(page))).top);
    await page.evaluate(() => window.scrollTo(0, 900));
    const kept = await edges(aside);
    expect([kept.top, kept.height]).toEqual([header.bottom, 800 - header.height]);
    expect(await aside.evaluate((el) => [el.scrollHeight > el.clientHeight, getComputedStyle(el).overflowY])).toEqual([true, 'auto']);

    for (const id of ['medium', 'compact', 'medium-aside-before', 'compact-aside-before'] as const) {
      await mount(page, id);
      const [asideBox, asideContent, mainBox, mainContent] = [await edges(region(page, 'aside')), await contentBox(region(page, 'aside')), await edges(main(page)), await contentBox(main(page))];
      // The main region's gutters, width and centring.
      expect([asideContent.left, asideContent.right], id).toEqual([mainContent.left, mainContent.right]);
      if (id.endsWith('before')) {
        near(mainContent.top - asideContent.bottom, gap);
        near(asideContent.top - mainBox.top + (mainBox.top - asideBox.top), block);
        expect(asideBox.top, id).toBe((await edges(region(page, 'header'))).bottom);
      } else {
        near(asideContent.top - mainContent.bottom, gap);
        near(asideBox.bottom - asideContent.bottom, block);
        expect(asideBox.bottom, id).toBe((await edges(region(page, 'footer'))).top);
      }
      // It scrolls with the page: it is not kept in view.
      expect(await css(region(page, 'aside'), 'position'), id).toBe('static');
    }
    // A contained main region in a wide medium window: the aside is as wide as the content, and centred with it.
    await mount(page, 'medium', { width: 1000 });
    expect([(await contentBox(region(page, 'aside'))).width, (await contentBox(main(page))).width]).toEqual([768, 768]);
  });

  test('APS-10: a standard side sheet in the aside gives the aside its own width, with no inset and no edge of the frame’s beside it; a modal one takes no space in any class; the frame never changes the sheet’s variant', async ({ page }) => {
    const sheet = (variant: string, open = true) => `<tanrei-side-sheet slot="aside" variant="${variant}" headline="Details"${open ? ' open' : ''}>Details of the selected thing.</tanrei-side-sheet>`;
    await mount(page, real({ aside: sheet('standard') }), { width: 1280 });
    const aside = region(page, 'aside');
    await expect.poll(async () => (await edges(aside)).width).toBe(await resolveToken(page, '--tanrei-comp-side-sheet-container-width'));
    expect([await px(aside, 'padding-left'), await px(aside, 'padding-top'), await px(aside, 'border-left-width')]).toEqual([0, 0, 0]);
    expect((await edges(aside)).right).toBe(1280);
    expect((await edges(main(page))).right).toBe((await edges(aside)).left);
    await expect(aside).toHaveAttribute('variant', 'standard');
    expect(await aside.getAttribute('aria-label')).toBeNull();
    for (const width of [1280, 800, 400]) {
      await mount(page, real({ aside: sheet('modal', false) }), { width });
      const box = await edges(region(page, 'aside'));
      expect(width === 1280 ? box.width : box.height, String(width)).toBe(0);
      if (width === 1280) expect((await edges(main(page))).right).toBe(1280);
      await expect(region(page, 'aside')).toHaveAttribute('variant', 'modal');
    }
    // In a narrower window a standard sheet stands in the main region's column, still with no inset of the frame's.
    await mount(page, real({ aside: sheet('standard') }), { width: 800 });
    expect([await px(region(page, 'aside'), 'padding-top'), await px(region(page, 'aside'), 'margin-left'), await px(region(page, 'aside'), 'border-top-width')]).toEqual([0, 0, 0]);
    await expect(region(page, 'aside')).toHaveAttribute('variant', 'standard');
  });

  test('APS-11: while scroll is page the footer follows the row across the frame’s whole width and is reached at the end of the page; while scroll is main it stays at the bottom of the frame, above the navigation bar, always in view; its content is inset by the gutter of the class and by footer.padding-block, and nothing is laid out inside it', async ({ page }) => {
    await mount(page, real({ sections: 6 }), { width: 1280 });
    const footer = region(page, 'footer');
    const [gutter, block] = [await resolveToken(page, T('gutter-expanded')), await resolveToken(page, T('footer-padding-block'))];
    const [box, inner] = [await edges(footer), await contentBox(footer)];
    expect([box.left, box.width]).toEqual([0, 1280]);
    expect(box.top).toBeGreaterThan(800);
    expect([inner.left, 1280 - inner.right]).toEqual([gutter, gutter]);
    near(inner.top - box.top, block);
    near(box.bottom - inner.bottom, block);
    expect(await css(footer, 'display')).toBe('block');
    // The end of the page: the footer's bottom is the document's.
    expect(Math.round(box.bottom)).toBe(await page.evaluate(() => document.documentElement.scrollHeight));
    // scroll: main — in view, at the bottom of the frame, above the navigation bar.
    await mount(page, real({ sections: 6, bar: true, props: { scroll: 'main' } }), { width: 400 });
    const [fixed, bar] = [await edges(region(page, 'footer')), await edges(region(page, 'navigation-bar'))];
    expect([bar.bottom, fixed.bottom]).toEqual([800, bar.top]);
    expect((await contentBox(region(page, 'footer'))).left).toBe(await resolveToken(page, T('gutter-compact')));
    await mount(page, 'expanded-scroll-main');
    expect((await edges(region(page, 'footer'))).bottom).toBe(800);
  });

  test('APS-31: while footerHidden is true a filled footer is not shown — no space, no line, no landmark, no focus stop — its neighbours take its room and the navigation and the aside stay in view to the end of the page; while false the footer is shown exactly while it is filled; a change is drawn at once, keeps what the slot holds, and moves focus that was in the footer to the main region', async ({ page, browserName }) => {
    await mount(page, real({ sections: 6, props: { footerHidden: true } }), { width: 1280 });
    const footer = region(page, 'footer');
    await expect(shell(page)).toHaveAttribute('footer-hidden', '');
    // Hidden, whatever it holds: no box, and so no room, no line and no landmark.
    expect([await shown(footer), await css(footer, 'display')]).toEqual([false, 'none']);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    if (browserName === 'chromium') expect(await landmarks(page)).toEqual(['banner', 'navigation "Documentation"', 'main', 'complementary "On this page"']);
    // The page ends with the row, and the navigation and the aside stay in view to its end.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const end = await page.evaluate(() => document.documentElement.scrollHeight);
    near((await edges(main(page))).bottom + (await scrollY(page)), end);
    near((await edges(region(page, 'navigation'))).bottom, 800);
    near((await edges(region(page, 'aside'))).bottom, 800);
    expect(await shell(page).evaluate((el) => (el as HTMLElement).style.getPropertyValue('--_aps-footer'))).toBe('0px');
    // No stop in focus order: from the aside's link Tab leaves the frame, and never reaches the footer's.
    await page.locator('#aside-link').focus();
    await page.keyboard.press('Tab');
    expect(await active(page)).not.toBe('#footer-link');
    // A product's own display on its footer does not bring back what it asked to hide.
    await footer.evaluate((el) => ((el as HTMLElement).style.display = 'flex'));
    expect(await shown(footer)).toBe(false);
    await footer.evaluate((el) => (el as HTMLElement).style.removeProperty('display'));

    // Shown again, at once and with what it held: the content information, across the frame's width, after the row.
    await shell(page).evaluate((el) => ((el as unknown as { footerHidden: boolean }).footerHidden = false));
    await expect(shell(page)).not.toHaveAttribute('footer-hidden');
    expect(await shown(footer)).toBe(true);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await expect(page.locator('#footer-link')).toHaveCount(1);
    expect(await css(footer, 'transition-duration')).toBe('0s');
    const [box, line] = [await edges(footer), await px(footer, 'border-top-width')];
    expect([box.left, box.width, line]).toEqual([0, 1280, await resolveToken(page, T('outline-width'))]);
    // Hidden while focus is in it: focus goes to the main region.
    await page.locator('#footer-link').focus();
    expect(await active(page)).toBe('#footer-link');
    await shell(page).evaluate((el) => el.setAttribute('footer-hidden', ''));
    await expect.poll(() => active(page)).toBe('#main');
    expect(await shown(footer)).toBe(false);

    // scroll: main — the main region takes the footer's room, down to the navigation bar.
    await mount(page, real({ aside: '', sections: 6, bar: true, props: { scroll: 'main', footerHidden: true } }), { width: 400 });
    expect(await shown(region(page, 'footer'))).toBe(false);
    expect((await edges(region(page, 'navigation-bar'))).bottom).toBe(800);
    near((await edges(main(page))).bottom, (await edges(region(page, 'navigation-bar'))).top);
    // An unfilled footer slot is no footer: footerHidden false never makes one.
    await mount(page, real({ footer: false }), { width: 1280 });
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    // The fixture.
    await mount(page, 'expanded-footer-hidden');
    expect(await shown(region(page, 'footer'))).toBe(false);
    near((await edges(region(page, 'navigation'))).bottom, 800);
    near((await edges(region(page, 'aside'))).bottom, 800);
  });

  test('APS-12: the announcement stands across the frame’s whole width above the header in every class, with no inset; while scroll is page it scrolls away and a sticky header then rests at the top of the window, while scroll is main it stays above the header; what closes gives its room back at once', async ({ page }) => {
    const callout = '<div slot="announcement"><tanrei-callout id="notice" status="info" closable close-label="Dismiss">A new version is out.</tanrei-callout></div>';
    for (const width of [1280, 800, 400]) {
      await mount(page, real({ announcement: callout, sections: 4 }), { width });
      const [announcement, header] = [await edges(region(page, 'announcement')), await edges(region(page, 'header'))];
      expect([announcement.left, announcement.top, announcement.width], String(width)).toEqual([0, 0, width]);
      expect(announcement.height).toBeGreaterThan(0);
      expect([await px(region(page, 'announcement'), 'padding-left'), await px(region(page, 'announcement'), 'padding-top')]).toEqual([0, 0]);
      expect(header.top).toBe(announcement.bottom);
    }
    await mount(page, real({ announcement: callout, sections: 4 }), { width: 1280 });
    await page.evaluate(() => window.scrollTo(0, 600));
    expect([(await edges(region(page, 'header'))).top, (await edges(region(page, 'announcement'))).bottom < 0]).toEqual([0, true]);
    await page.evaluate(() => window.scrollTo(0, 0));
    // Removed, or closed: its room is given back at once.
    const before = (await edges(region(page, 'header'))).top;
    expect(before).toBeGreaterThan(0);
    await page.locator('#notice').evaluate((el) => ((el as unknown as { open: boolean }).open = false));
    await expect.poll(async () => (await edges(region(page, 'header'))).top).toBe(0);
    expect(await css(region(page, 'announcement'), 'transition-duration')).toBe('0s');
    // scroll: main — it stays above the header.
    await mount(page, real({ announcement: callout, sections: 4, props: { scroll: 'main' } }), { width: 1280 });
    await main(page).evaluate((el) => (el.scrollTop = 600));
    expect([(await edges(region(page, 'announcement'))).top, (await edges(region(page, 'header'))).top]).toEqual([0, (await edges(region(page, 'announcement'))).bottom]);
  });

  test('APS-13: in a compact window the navigation bar is kept at the bottom edge across the frame’s whole width, in view while the page scrolls, and the page ends above it so nothing is covered; in a medium or an expanded window it is not shown, has no stop and no space; the frame shows the menu button and the bar as the product gave them', async ({ page }) => {
    await mount(page, real({ bar: true, sections: 4 }), { width: 400 });
    const bar = region(page, 'navigation-bar');
    const first = await edges(bar);
    expect([first.left, first.width, first.bottom]).toEqual([0, 400, 800]);
    await page.evaluate(() => window.scrollTo(0, 700));
    expect((await edges(bar)).bottom).toBe(800);
    // The page ends above it: scrolled to its end, the footer's bottom is the bar's top.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    near((await edges(region(page, 'footer'))).bottom, (await edges(bar)).top);
    await expect(page.getByRole('navigation', { name: 'Sections' })).toHaveCount(1);
    // The frame chooses nothing for the product: both the bar and the menu button are there.
    expect(await shown(menu(page))).toBe(true);
    for (const width of [800, 1280]) {
      await resize(page, width);
      expect(await shown(bar), String(width)).toBe(false);
      await expect(page.getByRole('navigation', { name: 'Sections' })).toHaveCount(0);
      expect(Math.round((await edges(shell(page))).bottom + (await scrollY(page)))).toBe(await page.evaluate(() => document.documentElement.scrollHeight));
    }
    // The fixtures: the page ends above the bar, and with scroll main the footer stands above it.
    await mount(page, 'compact-navigation-bar');
    expect([(await edges(region(page, 'navigation-bar'))).bottom, (await edges(region(page, 'footer'))).bottom]).toEqual([800, (await edges(region(page, 'navigation-bar'))).top]);
  });
});

test.describe('what scrolls', () => {
  test('APS-14: while scroll is page the frame is at least as tall as the window and as tall as its content, the window’s own view scrolls the page and no region is a scrolling view but the navigation and the aside that stay in view: a link to a place in the page, and the return to it, are the browser’s own', async ({ page }) => {
    await mount(page, 'expanded-main-only');
    expect((await edges(shell(page))).height).toBe(800);
    await mount(page, real({ sections: 6 }), { width: 1280 });
    const tall = (await edges(shell(page))).height;
    expect(tall).toBeGreaterThan(2400);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(Math.round(tall));
    // No region scrolls but the two that are kept in view (a drawer scrolls inside itself: NVD-61).
    expect(await page.evaluate((tag) => [...document.querySelector(tag)!.children].filter((child) => ['auto', 'scroll'].includes(getComputedStyle(child).overflowY)).map((child) => child.getAttribute('slot') ?? child.localName), TAG)).toEqual(['aside']);
    expect(await css(shell(page), 'overflow-y')).toBe('visible');
    // A link to a place in the page is the browser's own: the window scrolls to it.
    await page.locator('#first').click();
    await expect.poll(() => scrollY(page)).toBeGreaterThan(400);
    expect(await page.evaluate(() => location.hash)).toBe('#s3');
  });

  test('APS-15: while scroll is main the frame is exactly as tall as the window, the announcement, the header, the footer and the navigation bar keep their place, the main region is the one scrolling view — reached and scrolled from the keyboard — the aside scrolls inside its own height beside it, and the window itself does not scroll', async ({ page }) => {
    const long = `<aside slot="aside"><div style="block-size: 2400px">Aside</div></aside>`;
    await mount(page, real({ aside: long, sections: 6, props: { scroll: 'main' } }), { width: 1280 });
    expect((await edges(shell(page))).height).toBe(800);
    expect(await page.evaluate(() => [document.documentElement.scrollHeight, document.documentElement.clientHeight])).toEqual([800, 800]);
    expect(await main(page).evaluate((el) => [getComputedStyle(el).overflowY, el.scrollHeight > el.clientHeight])).toEqual(['auto', true]);
    const before = await Promise.all(['header', 'navigation', 'footer'].map((name) => edges(region(page, name))));
    // The keyboard reaches the region through the skip link, and scrolls it.
    await tab(page);
    await page.keyboard.press('Enter');
    await expect.poll(() => active(page)).toBe('#main');
    await page.keyboard.press('End');
    await expect.poll(() => main(page).evaluate((el) => el.scrollTop)).toBeGreaterThan(1000);
    expect(await scrollY(page)).toBe(0);
    expect(await Promise.all(['header', 'navigation', 'footer'].map((name) => edges(region(page, name))))).toEqual(before);
    // The aside, beside the main region: its own height, its own scrolling.
    const aside = region(page, 'aside');
    expect(await aside.evaluate((el) => [getComputedStyle(el).overflowY, el.scrollHeight > el.clientHeight])).toEqual(['auto', true]);
    expect((await edges(aside)).bottom).toBe((await edges(region(page, 'footer'))).top);
    // The header is not sticky: it never moves.
    expect(await css(region(page, 'header'), 'position')).toBe('static');
    // The fixtures: the frame is the window, with the footer and the bar in view.
    await mount(page, 'compact-scroll-main');
    expect([(await edges(shell(page))).height, (await edges(region(page, 'navigation-bar'))).bottom, (await edges(region(page, 'footer'))).bottom]).toEqual([800, 800, (await edges(region(page, 'navigation-bar'))).top]);
  });

  test('APS-16: while scroll is page and headerPosition is sticky the header stays at the top of the window, above the main region, the navigation and the aside, while the page scrolls under it; static, it scrolls away; the frame gives it no fill, elevation or edge, and an app bar in it draws its own scrolled condition from the window', async ({ page }) => {
    await mount(page, real({ sections: 6 }), { width: 1280 });
    const header = region(page, 'header');
    expect([await css(header, 'position'), await css(header, 'background-color'), await css(header, 'box-shadow'), await px(header, 'border-bottom-width')]).toEqual(['sticky', 'rgba(0, 0, 0, 0)', 'none', 0]);
    await page.evaluate(() => window.scrollTo(0, 900));
    expect((await edges(header)).top).toBe(0);
    // Above the regions: what is at a point inside the header is the header's.
    expect(await page.evaluate(() => !!document.elementFromPoint(640, 20)?.closest('[slot="header"]'))).toBe(true);
    expect(Number(await css(header, 'z-index'))).toBeGreaterThan(0);
    // The app bar reads the window (APB-9): scrolled, it says so itself.
    await expect.poll(() => page.locator('tanrei-app-bar').evaluate((el) => el.hasAttribute('data-scrolled') || (el as unknown as { scrolled?: boolean }).scrolled === true || !!el.shadowRoot!.querySelector('[data-scrolled], .scrolled'))).toBe(true);
    await mount(page, real({ sections: 6, props: { headerPosition: 'static' } }), { width: 1280 });
    await page.evaluate(() => window.scrollTo(0, 900));
    expect((await edges(region(page, 'header'))).bottom).toBeLessThan(0);
  });

  test('APS-32: each region stacks what it holds inside itself — nothing in the main region, whatever its z-index, and not the footer, is drawn over the sticky header or the navigation bar; the frame is one stacking order of the page', async ({ page }) => {
    /** The points inside a region (a grid of them, 2 px in from its edges) where what the page draws is not the region's. */
    const covered = (name: string) =>
      region(page, name).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const out: string[] = [];
        for (let i = 0; i <= 40; i++)
          for (const f of [0.1, 0.5, 0.9]) {
            const [x, y] = [r.left + 2 + ((r.width - 4) * i) / 40, r.top + r.height * f];
            const hit = document.elementFromPoint(x, y);
            if (hit && !el.contains(hit)) out.push(`${Math.round(x)},${Math.round(y)}: ${hit.localName}${hit.id ? `#${hit.id}` : ''}`);
          }
        return out;
      });
    /** Scrolls the window until the top of `#id` stands at `y` in the window. */
    const scrollTopTo = (id: string, y: number) =>
      page.evaluate(([id, y]) => window.scrollBy(0, document.getElementById(id)!.getBoundingClientRect().top - y), [id, y] as const);
    // What a page puts in its main region: a Code block, whose copy button stands over its corner at a z-index of its
    // own, and an element of the product's raised by a large one.
    const content = (page: P) =>
      page.evaluate(() => {
        const first = document.querySelector('tanrei-app-shell > main')!.firstElementChild!;
        first.insertAdjacentHTML(
          'afterend',
          `<tanrei-code-block id="code" label="Example" copy copy-label="Copy" code="${'const line = 1;\n'.repeat(8)}"></tanrei-code-block>
           <div id="raised" style="position: relative; z-index: 10; block-size: 160px; background: rgb(255, 0, 0)">raised</div>`,
        );
      });
    await mount(page, real({ sections: 6, footer: false }), { width: 1280 });
    await content(page);
    await page.locator('#code').evaluate(async (el) => {
      await customElements.whenDefined('tanrei-code-block');
      await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    });
    // The Code block's copy button stands over its corner (COD-9) at a z-index of its own: the case a page meets.
    expect(await page.locator('#code').evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.corner')!).zIndex)).not.toBe('auto');
    const header = await edges(region(page, 'header'));
    for (const id of ['code', 'raised']) {
      await scrollTopTo(id, header.bottom - header.height / 2);
      await frame(page);
      expect((await edges(page.locator(`#${id}`))).top, id).toBeLessThan(header.bottom);
      expect.soft(await covered('header'), `${id} under the header`).toEqual([]);
    }
    // A footer taller than the window, scrolled under the header: the header stays over it.
    await mount(page, real({ sections: 2 }), { width: 1280 });
    await page.evaluate(() => {
      const footer = document.querySelector('tanrei-app-shell > [slot="footer"]')!;
      footer.insertAdjacentHTML('beforeend', '<div id="tall" style="block-size: 1600px"></div>');
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await frame(page);
    expect((await edges(region(page, 'footer'))).top).toBeLessThan(0);
    expect.soft(await covered('header'), 'the footer under the header').toEqual([]);
    expect(Number(await css(region(page, 'header'), 'z-index'))).toBeGreaterThan(Number(await css(region(page, 'footer'), 'z-index')));
    // A compact window: the same element under the navigation bar is under the bar, and under the header.
    await mount(page, real({ sections: 6, bar: true, footer: false }), { width: 400 });
    await content(page);
    const bar = await edges(region(page, 'navigation-bar'));
    await scrollTopTo('raised', bar.top + 4);
    await frame(page);
    expect.soft(await covered('navigation-bar'), 'raised under the navigation bar').toEqual([]);
    const top = await edges(region(page, 'header'));
    await scrollTopTo('raised', top.bottom - top.height / 2);
    await frame(page);
    expect.soft(await covered('header'), 'raised under the header, compact').toEqual([]);
    // How: the frame and each region are a stacking context of their own.
    expect(await shell(page).evaluate((el) => [el, ...el.children].filter((c) => c.getAttribute('slot') !== 'skip-link').map((c) => `${c.getAttribute('slot') ?? c.localName}:${getComputedStyle(c).isolation}`))).toEqual(
      ['tanrei-app-shell', 'header', 'navigation', 'main', 'aside', 'navigation-bar'].map((name) => `${name}:isolate`),
    );
  });

  test('APS-17: the frame holds the height of a sticky header — measured again whenever it changes size, nothing while it is static — and makes it known to the scrolling view and to what it holds: following a link to a heading in a long page leaves the heading 64 below the top of the window, Tab to a link under the header scrolls it out from under it, with the bar 80 high the distance is 80, and likewise the navigation bar’s height at the bottom', async ({ page }) => {
    await mount(page, real({ sections: 6 }), { width: 1280 });
    const offset = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tanrei-app-shell-scroll-offset').trim());
    const padding = () => page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop);
    await expect.poll(offset).toBe('64px');
    expect(await padding()).toBe('64px');
    expect((await edges(region(page, 'header'))).height).toBe(64);
    // What the frame holds reads the same distance.
    expect(await main(page).evaluate((el) => getComputedStyle(el).getPropertyValue('--tanrei-app-shell-scroll-offset').trim())).toBe('64px');
    await page.locator('#first').click();
    await expect.poll(async () => Math.round((await edges(page.locator('#s3'))).top)).toBe(64);
    // Tab to a link that is under the header scrolls it out from under it.
    await page.evaluate(() => window.scrollTo(0, document.getElementById('link2')!.getBoundingClientRect().top + window.scrollY - 20));
    expect((await edges(page.locator('#link2'))).top).toBeLessThan(64);
    await page.locator('#link1').evaluate((el) => (el as HTMLElement).focus({ preventScroll: true }));
    await tab(page);
    await expect.poll(() => active(page)).toBe('#link2');
    await expect.poll(async () => (await edges(page.locator('#link2'))).top).toBeGreaterThanOrEqual(64);
    // The header grows: the distance is measured again.
    await page.locator('tanrei-app-bar').evaluate((el) => ((el as HTMLElement).style.blockSize = '80px'));
    await expect.poll(offset).toBe('80px');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#first').click();
    await expect.poll(async () => Math.round((await edges(page.locator('#s3'))).top)).toBe(80);
    // Static, or scroll main: nothing is kept over the top.
    await shell(page).evaluate((el) => el.setAttribute('header-position', 'static'));
    await expect.poll(offset).toBe('');
    expect(await padding()).toBe('auto');
    await shell(page).evaluate((el) => el.removeAttribute('header-position'));
    await expect.poll(offset).toBe('80px');
    await shell(page).evaluate((el) => el.setAttribute('scroll', 'main'));
    await expect.poll(offset).toBe('');
    // The navigation bar's height at the bottom, in a compact window.
    await mount(page, real({ sections: 6, bar: true }), { width: 400 });
    const end = () => page.evaluate(() => [getComputedStyle(document.documentElement).getPropertyValue('--tanrei-app-shell-scroll-offset-end').trim(), getComputedStyle(document.documentElement).scrollPaddingBottom]);
    const barHeight = (await edges(region(page, 'navigation-bar'))).height;
    await expect.poll(end).toEqual([`${barHeight}px`, `${barHeight}px`]);
    await resize(page, 800);
    await expect.poll(end).toEqual(['', 'auto']);
    // Removed from the page, the frame takes back what it wrote on the root.
    await shell(page).evaluate((el) => el.remove());
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--tanrei-app-shell-scroll-offset'))).toBe('');
  });
});

test.describe('telling regions apart', () => {
  /** The lines the frame draws: above the footer, at the start edge of an aside beside the main region, between the main content and a stacked aside. */
  const lines = async (page: P) => {
    const [footer, aside] = [region(page, 'footer'), region(page, 'aside')];
    return { footer: await px(footer, 'border-top-width'), asideStart: await px(aside, 'border-inline-start-width'), asideAbove: await px(aside, 'border-top-width'), asideBelow: await px(aside, 'border-bottom-width') };
  };

  test('APS-18: auto parts the regions as comp.app-shell.separation names — under the default system a hairline of outline.width in outline.color above the footer and at the start edge of the aside — and divider and gap are themselves whatever the token says; the lines take no room; between the main content and a stacked aside the line is in the middle of aside.gap; no line around the navigation, the announcement or the navigation bar; an unknown value is auto', async ({ page }) => {
    const seen = warnings(page);
    const line = async () => [await resolveToken(page, T('outline-width')), await resolveColor(page, T('outline-color'))] as const;
    await mount(page, 'expanded');
    const [width, color] = await line();
    expect(await lines(page)).toEqual({ footer: width, asideStart: width, asideAbove: 0, asideBelow: 0 });
    expect([await css(region(page, 'footer'), 'border-top-color'), await css(region(page, 'aside'), 'border-inline-start-color')]).toEqual([color, color]);
    const withLines = [await contentBox(region(page, 'footer')), await contentBox(region(page, 'aside')), await edges(main(page))];
    for (const name of ['navigation', 'header']) expect(await region(page, name).evaluate((el) => ['Top', 'Right', 'Bottom', 'Left'].map((side) => Number.parseFloat(getComputedStyle(el)[`border${side}Width` as 'borderTopWidth'])))).toEqual([0, 0, 0, 0]);
    await mount(page, 'expanded-divider');
    expect(await lines(page)).toEqual({ footer: width, asideStart: width, asideAbove: 0, asideBelow: 0 });
    await mount(page, 'expanded-gap');
    expect(await lines(page)).toEqual({ footer: 0, asideStart: 0, asideAbove: 0, asideBelow: 0 });
    // The lines take no room of their own: the same spaces with and without them.
    expect([await contentBox(region(page, 'footer')), await contentBox(region(page, 'aside')), await edges(main(page))]).toEqual(withLines);

    // The system's choice is followed by auto alone; the named values are themselves under every system.
    const set = async (vars: Record<string, string>) => {
      await override(page, vars);
      await page.evaluate((tag) => {
        for (const element of document.querySelectorAll(`${tag}[data-separation]`)) (element as unknown as { read(): void }).read();
      }, TAG);
    };
    for (const [id, expected] of [
      ['expanded', 0],
      ['expanded-divider', width],
      ['expanded-gap', 0],
    ] as const) {
      await mount(page, id);
      await set({ '--tanrei-sys-behavior-separation': 'gap' });
      await expect.poll(async () => (await lines(page)).footer, { message: id }).toBe(expected);
    }
    await mount(page, 'expanded');
    await set({ [T('separation')]: 'gap' });
    await expect.poll(async () => (await lines(page)).asideStart).toBe(0);
    await set({ [T('separation')]: 'stripes' });
    await expect.poll(async () => (await lines(page)).asideStart).toBe(width);
    // The prop, changed while shown: at once.
    await shell(page).evaluate((el) => ((el as unknown as { separation: string }).separation = 'gap'));
    await expect.poll(async () => (await lines(page)).footer).toBe(0);
    await shell(page).evaluate((el) => ((el as unknown as { separation: string }).separation = 'dotted'));
    await expect.poll(async () => (await lines(page)).footer).toBe(width);
    await expect.poll(() => seen.filter((m) => m.includes('APS-18') && m.includes('"dotted"')).length).toBe(1);

    // A stacked aside: the line in the middle of aside.gap, as wide as the content.
    const gap = await resolveToken(page, T('aside-gap'));
    await mount(page, 'compact');
    expect(await lines(page)).toEqual({ footer: width, asideStart: 0, asideAbove: width, asideBelow: 0 });
    const [aside, content, asideContent] = [await edges(region(page, 'aside')), await contentBox(main(page)), await contentBox(region(page, 'aside'))];
    near(aside.top + width / 2, (content.bottom + asideContent.top) / 2, 0.01);
    near(asideContent.top - content.bottom, gap, 0.01);
    expect([aside.left, aside.right]).toEqual([content.left, content.right]);
    await mount(page, 'compact-aside-before');
    expect(await lines(page)).toEqual({ footer: width, asideStart: 0, asideAbove: 0, asideBelow: width });
    await mount(page, own('gap', { separation: 'gap', asideLabel: 'Related' }, '<main id="main">Main</main><aside slot="aside">Aside</aside><footer slot="footer">Footer</footer>'), { width: 400 });
    expect(await lines(page)).toEqual({ footer: 0, asideStart: 0, asideAbove: 0, asideBelow: 0 });
    near((await contentBox(region(page, 'aside'))).top - (await contentBox(main(page))).bottom, gap, 0.01);
  });

  test('APS-18: where the browser has no style queries the element names the tokens’ separation on the frame, and the same rules draw it', async ({ page }) => {
    await mount(page, 'expanded-gap');
    const queries = await page.evaluate(() => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('@container style(--probe: on) { #probe-inner { --answer: yes; } }');
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      document.body.insertAdjacentHTML('beforeend', '<div style="--probe: on"><div id="probe-inner"></div></div>');
      return getComputedStyle(document.querySelector('#probe-inner')!).getPropertyValue('--answer').trim() === 'yes';
    });
    expect(await shell(page).getAttribute('data-separation')).toBe(queries ? null : 'gap');
    expect(await lines(page)).toEqual({ footer: 0, asideStart: 0, asideAbove: 0, asideBelow: 0 });
    await mount(page, 'expanded');
    expect(await shell(page).getAttribute('data-separation')).toBe(queries ? null : 'divider');
    const width = await resolveToken(page, T('outline-width'));
    expect((await lines(page)).footer).toBe(width);
    // The attribute alone draws the gap form, whatever the browser.
    await shell(page).evaluate((el) => el.setAttribute('data-separation', 'gap'));
    expect(await lines(page)).toEqual({ footer: 0, asideStart: 0, asideAbove: 0, asideBelow: 0 });
  });
});

test.describe('the skip link, landmarks and focus', () => {
  test('APS-19: the skip link is the first element the keyboard reaches; nothing of it is drawn until then, and it is still exposed; with keyboard focus it is drawn skip-link.offset from the top and the start of the window, above every region and the sticky header, in a box of the container’s color, elevation, shape and paddings with its text in the label style; the Link keeps its own color, underline and focus ring; it appears at once and moves nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mount(page, 'expanded');
    const link = region(page, 'skip-link');
    // Not drawn: clipped to nothing — and still in the document, exposed and reachable.
    const hidden = await edges(link);
    expect(hidden.width * hidden.height).toBeLessThanOrEqual(1);
    expect(await css(link, 'clip-path')).toBe('inset(50%)');
    expect([await css(link, 'display'), await css(link, 'visibility')]).not.toContain('none');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(1);
    const before = await Promise.all([region(page, 'header'), region(page, 'navigation'), main(page), region(page, 'aside'), region(page, 'footer')].map(edges));
    await page.evaluate(() => window.scrollTo(0, 0));
    await tab(page);
    expect(await active(page)).toBe('a[skip-link]');
    const [offset, inline, block] = [await resolveToken(page, T('skip-link-offset')), await resolveToken(page, T('skip-link-container-padding-inline')), await resolveToken(page, T('skip-link-container-padding-block'))];
    const text = await edges(link);
    const box = await link.evaluate((el) => {
      const style = getComputedStyle(el, '::after');
      const rect = el.getBoundingClientRect();
      const n = Number.parseFloat;
      return { left: rect.left + n(style.left), top: rect.top + n(style.top), right: rect.right - n(style.right), bottom: rect.bottom - n(style.bottom), background: style.backgroundColor, shadow: style.boxShadow, radius: n(style.borderTopLeftRadius), position: style.position, z: style.zIndex };
    });
    // The box: offset from the top and the start edges of the window, padded around the text.
    near(box.left, offset);
    near(box.top, offset);
    near(text.left - box.left, inline);
    near(text.top - box.top, block);
    near(box.right - text.right, inline);
    near(box.bottom - text.bottom, block);
    expect(box.background).toBe(await resolveColor(page, T('skip-link-container-color')));
    expect(box.shadow).not.toBe('none');
    expect(box.radius).toBeGreaterThan(0);
    near(box.radius, (await resolveToken(page, T('skip-link-container-shape'))) * (await link.evaluate((el) => Number.parseFloat(getComputedStyle(el, '::after').getPropertyValue('--_corner-scale')) || 1)), 0.01);
    // One line of the label style plus the paddings: a pointer target high.
    expect(await px(link, 'font-size')).toBe(await resolveToken(page, '--tanrei-sys-typescale-label-font-size'));
    near(await px(link, 'line-height'), text.height, 0.01);
    near(box.bottom - box.top, text.height + 2 * block);
    // Above every region and the sticky header: the link is what is at its own place.
    expect(await css(link, 'position')).toBe('fixed');
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.getAttribute('slot'), [text.left + 2, text.top + 2])).toBe('skip-link');
    expect(Number(await css(link, 'z-index'))).toBeGreaterThan(Number(await css(region(page, 'header'), 'z-index')));
    // The Link's own: its color, its underline, its focus ring.
    expect(await css(link, 'color')).toBe(await resolveColor(page, '--tanrei-comp-link-standard-focused-label-color'));
    expect(await css(link, 'text-decoration-line')).toBe('underline');
    expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle !== 'none' || getComputedStyle(el).boxShadow !== 'none')).toBe(true);
    // At once, and nothing else moves.
    expect(await link.evaluate((el) => getComputedStyle(el, '::after').transitionDuration)).toBe('0s');
    expect(await Promise.all([region(page, 'header'), region(page, 'navigation'), main(page), region(page, 'aside'), region(page, 'footer')].map(edges))).toEqual(before);
    // It goes as it came.
    await link.evaluate((el) => (el as HTMLElement).blur());
    const gone = await edges(link);
    expect(gone.width * gone.height).toBeLessThanOrEqual(1);
    // A pointer's focus draws nothing of it: only the keyboard's.
    expect(fs.readFileSync(path.join(pkg, 'src/styles/app-shell.css'), 'utf8')).toMatch(/\[slot='skip-link'\]:focus-visible/);
  });

  test('APS-20: from a fresh page, Tab then Enter leaves focus on the main element itself, its top in view below the header, at once; the next Tab lands on the first link inside it; Shift+Tab from there returns to the last focusable element before the main region, not to the region', async ({ page }) => {
    await mount(page, real({ sections: 6 }), { width: 1280 });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await region(page, 'skip-link').evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.press('Enter');
    await expect.poll(() => active(page)).toBe('#main');
    await expect.poll(async () => Math.round((await edges(main(page))).top)).toBe(64);
    expect(await main(page).evaluate((el) => [el.getAttribute('tabindex'), getComputedStyle(el).outlineStyle])).toEqual(['-1', 'none']);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
    await tab(page);
    expect(await active(page)).toBe('#first');
    await tab(page, { back: true });
    // Not the region: what precedes it in the order — the navigation's last stop (the aside follows the main region).
    expect(await active(page)).not.toBe('#main');
    expect(await active(page)).toContain('tanrei-navigation-drawer');
    // A main region without a tab index is given one, so the link can reach it; it is never a stop of Tab.
    await mount(page, own('bare', {}, '<a class="tanrei-link" data-standalone slot="skip-link" href="#content">Skip</a><header slot="header"><a id="home" href="#x">Home</a></header><main id="content"><a id="inside" href="#y">Inside</a></main>'), { width: 1280 });
    await expect(main(page)).toHaveAttribute('tabindex', '-1');
    await tab(page);
    await page.keyboard.press('Enter');
    await expect.poll(() => active(page)).toBe('#content');
    await tab(page);
    expect(await active(page)).toBe('#inside');
    await page.locator('#home').evaluate((el) => (el as HTMLElement).focus());
    await tab(page);
    expect(await active(page)).toBe('#inside');
  });

  test('APS-21: each filled region is the landmark it is in the accessibility tree — the header the banner, the navigation and the navigation bar what they hold expose, each named, the one main region, the aside a complementary landmark named by asideLabel, the footer the content information; the announcement and the skip link add none; a region whose element gives no landmark is given it; a frame without a main region, with two, or with an unnamed aside is still laid out, and reported', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mount(page, real({ bar: true, announcement: '<div slot="announcement"><tanrei-callout status="info">A notice.</tanrei-callout></div>' }), { width: 400 });
    if (browserName === 'chromium') {
      // Compact: the drawer is presented over the content only when opened, so its landmark is not in the tree.
      expect(await landmarks(page)).toEqual(['banner', 'main', 'complementary "On this page"', 'contentinfo', 'navigation "Sections"']);
      await resize(page, 1280);
      expect(await landmarks(page)).toEqual(['banner', 'navigation "Documentation"', 'main', 'complementary "On this page"', 'contentinfo']);
      await mount(page, real({ props: { asideOrder: 'before' } }), { width: 1280 });
      expect(await landmarks(page)).toEqual(['banner', 'navigation "Documentation"', 'complementary "On this page"', 'main', 'contentinfo']);
    }
    await mount(page, real({ bar: true }), { width: 1280 });
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Documentation' })).toHaveCount(1);
    await expect(page.getByRole('complementary', { name: 'On this page' })).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    expect(await shell(page).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.tabIndex])).toEqual([null, null, -1]);
    expect(seen.filter((m) => m.includes('APS-21'))).toEqual([]);
    // The aside's name follows asideLabel; a name of its own is kept.
    await shell(page).evaluate((el) => ((el as unknown as { asideLabel: string }).asideLabel = 'Related'));
    await expect(page.getByRole('complementary', { name: 'Related' })).toHaveCount(1);

    // Regions whose elements give no landmark: the frame gives each its own.
    await mount(page, own('divs', { asideLabel: 'Details' }, '<div slot="header">Header</div><main id="main">Main</main><div slot="aside">Aside</div><div slot="footer">Footer</div>'), { width: 1280 });
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('complementary', { name: 'Details' })).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    if (browserName === 'chromium') expect(await landmarks(page)).toEqual(['banner', 'main', 'complementary "Details"', 'contentinfo']);
    // Taken out of the frame, a region loses what the frame gave it.
    const header = await page.locator(`${TAG} > [slot="header"]`).elementHandle();
    await header!.evaluate((el) => document.body.append(el));
    await expect.poll(() => header!.evaluate((el) => el.getAttribute('role'))).toBeNull();

    // What a debug build says of a frame it still lays out.
    await mount(page, own('unnamed', {}, '<main id="main">Main</main><aside slot="aside">Aside</aside>'), { width: 1280 });
    await expect.poll(() => seen.filter((m) => m.includes('APS-21') && m.includes('aside has no name')).length).toBe(1);
    expect((await edges(region(page, 'aside'))).width).toBe(await resolveToken(page, T('aside-width')));
    await mount(page, own('two', {}, '<main id="main">One</main><main id="other">Two</main>'), { width: 1280 });
    await expect.poll(() => seen.filter((m) => m.includes('APS-21') && m.includes('2 main regions')).length).toBe(1);
    // (No main region: the harness's own markup always writes one, so the frame is emptied in place.)
    await shell(page).evaluate((el) => el.replaceChildren(Object.assign(document.createElement('header'), { slot: 'header', textContent: 'Header' })));
    await expect.poll(() => seen.filter((m) => m.includes('APS-21') && m.includes('no main region')).length).toBe(1);
    expect((await edges(region(page, 'header'))).width).toBe(1280);
  });

  test('APS-22: the frame is not focusable and Tab walks its regions in reading order, the same in every class and in either direction — the skip link, the announcement, the header, the navigation, the aside while asideOrder is before, the main content, the aside while it is after, the footer, the navigation bar; a region that is not shown has no stop; no region in the layout keeps focus', async ({ page }) => {
    const notice = '<div slot="announcement"><a id="notice" href="#n">Notice</a></div>';
    const navigation = '<nav slot="navigation" aria-label="Documentation"><a id="nav-link" href="#s1">Tokens</a></nav>';
    const bar = '<nav slot="navigation-bar" aria-label="Sections"><a id="bar-link" href="#b">Home</a></nav>';
    const page1 = (order: 'before' | 'after') =>
      own(
        'order',
        { asideOrder: order, asideLabel: 'On this page' },
        `<a class="tanrei-link" data-standalone slot="skip-link" href="#main">Skip</a>${notice}<header slot="header"><tanrei-button data-app-shell-menu variant="text" label="Menu"><span slot="icon">menu</span></tanrei-button><a id="home" href="#h">Home</a></header>${navigation}${order === 'before' ? '<aside slot="aside"><a id="aside-link" href="#a">Aside</a></aside>' : ''}<main id="main" tabindex="-1"><a id="first" href="#f">First</a></main>${order === 'after' ? '<aside slot="aside"><a id="aside-link" href="#a">Aside</a></aside>' : ''}<footer slot="footer"><a id="footer-link" href="#t">Footer</a></footer>${bar}`,
      );
    const walk = async () => {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await region(page, 'skip-link').evaluate((el) => (el as HTMLElement).focus());
      const stops = [await active(page)];
      for (let presses = 0; presses < 12; presses++) {
        await tab(page);
        const now = await active(page);
        if (now === 'body' || now === stops.at(-1) || stops.includes(now)) break;
        stops.push(now);
      }
      return stops;
    };
    const expected = {
      1280: { after: ['a[skip-link]', '#notice', '#home', '#nav-link', '#first', '#aside-link', '#footer-link'], before: ['a[skip-link]', '#notice', '#home', '#nav-link', '#aside-link', '#first', '#footer-link'] },
      // Medium: the navigation is not a drawer, so it is not shown, and the menu button is.
      800: { after: ['a[skip-link]', '#notice', 'menu » button', '#home', '#first', '#aside-link', '#footer-link'], before: ['a[skip-link]', '#notice', 'menu » button', '#home', '#aside-link', '#first', '#footer-link'] },
      400: { after: ['a[skip-link]', '#notice', 'menu » button', '#home', '#first', '#aside-link', '#footer-link', '#bar-link'], before: ['a[skip-link]', '#notice', 'menu » button', '#home', '#aside-link', '#first', '#footer-link', '#bar-link'] },
    } as const;
    for (const width of [1280, 800, 400] as const) {
      for (const order of ['after', 'before'] as const) {
        for (const dir of ['ltr', 'rtl'] as const) {
          await mount(page, { ...page1(order), ...(dir === 'rtl' ? { direction: 'rtl' as const } : {}) }, { width });
          expect(await walk(), `${width} ${order} ${dir}`).toEqual(expected[width][order]);
        }
      }
    }
    expect(await shell(page).evaluate((el) => [el.tabIndex, el.hasAttribute('tabindex')])).toEqual([-1, false]);
  });

  test('APS-23: a change of the window’s class is drawn at once, without a motion; scroll, headerPosition, mainWidth, asideOrder, footerHidden and separation stay as they are; and keyboard focus on something the new arrangement does not show — the menu button, a destination of the navigation bar — moves to the main region', async ({ page }) => {
    await mount(page, real({ bar: true, sections: 2, props: { mainWidth: 'full', asideOrder: 'before', separation: 'gap', headerPosition: 'static' } }), { width: 400 });
    const props = () => shell(page).evaluate((el) => ['scroll', 'header-position', 'main-width', 'aside-order', 'footer-hidden', 'separation'].map((name) => el.getAttribute(name)));
    const kept = await props();
    expect(kept).toEqual([null, 'static', 'full', 'before', null, 'gap']);
    await menu(page).evaluate((el) => (el as HTMLElement).focus());
    expect(await active(page)).toContain('menu');
    await resize(page, 1280);
    await expect.poll(() => active(page)).toBe('#main');
    expect(await props()).toEqual(kept);
    // Drawn at once: the new arrangement is there in the same frame, and no region has a motion of the frame's.
    expect((await edges(region(page, 'aside'))).right).toBe(1280);
    for (const name of ['header', 'aside', 'footer']) expect(await css(region(page, name), 'transition-duration'), name).toBe('0s');
    expect(await css(main(page), 'transition-duration')).toBe('0s');
    // A destination of the navigation bar, which a wider window does not show.
    await resize(page, 400);
    await region(page, 'navigation-bar').locator('tanrei-navigation-bar-item').first().evaluate((el) => (el as HTMLElement).focus());
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe('tanrei-navigation-bar-item');
    await resize(page, 800);
    await expect.poll(() => active(page)).toBe('#main');
    // Focus on something that is still shown stays where it is.
    await page.locator('#footer-link').evaluate((el) => (el as HTMLElement).focus());
    await resize(page, 1280);
    await resize(page, 400);
    expect(await active(page)).toBe('#footer-link');
  });
});

test.describe('before its code runs, text size, forced colors, insets, direction', () => {
  /** The fixtures' document with the stylesheet a page loads and no script: the frame before its element is defined. */
  const withoutScript = async (first: P, f: Fixture, width: number, height = 800) => {
    // A new window: one that has run the bundle keeps its elements defined, whatever document is written into it.
    const page = await first.context().newPage();
    await page.setViewportSize({ width, height });
    const document = await fixturesDocument(spec, { fixtures: [f], icons: true });
    const script = document.lastIndexOf('<script type="module">');
    await page.setContent(`${document.slice(0, script)}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.bringToFront();
    return page;
  };
  const geometry = (page: P) =>
    page.evaluate((tag) =>
      [document.querySelector(tag)!, ...document.querySelector(tag)!.children].map((part) => {
        const r = part.getBoundingClientRect();
        return `${part.getAttribute('slot') ?? part.localName}: ${[r.left, r.top, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(' ')}`;
      }),
    TAG);

  test('APS-24: with no script the fixtures expanded, medium and compact are laid out as with it — every region in its place, the regions the class does not show taking no space, the menu button shown only where the class shows it — nothing is presented over the content, nothing is inert, and following the skip link moves focus to the main element; defining the element then moves nothing and records no layout shift', async ({ page: first, browserName }) => {
    for (const id of ['expanded', 'medium', 'compact'] as const) {
      const size = appShellWindow(id);
      // (Only the expanded fixture has a skip link: each is given one here.)
      const page = await withoutScript(first, { ...fixture(id), slots: { 'skip-link': 'Skip to content', ...fixture(id).slots } }, size.width, size.height);
      expect(await page.evaluate((tag) => !!customElements.get(tag), TAG)).toBe(false);
      // The menu button is a Tanrei Button, which draws itself when it is defined: here it keeps the place it will
      // have, so that what is measured is the frame's own.
      await page.addStyleTag({ content: 'tanrei-button:not(:defined) { box-sizing: border-box; inline-size: var(--tanrei-comp-button-container-height-medium); block-size: var(--tanrei-comp-button-container-height-medium); overflow: hidden; }' });
      const before = await geometry(page);
      expect(await shown(region(page, 'navigation')), id).toBe(id === 'expanded');
      expect((await edges(region(page, 'aside'))).width, id).toBe(id === 'expanded' ? await resolveToken(page, T('aside-width')) : (await contentBox(main(page))).width);
      expect(await page.evaluate(() => document.querySelectorAll('[inert], dialog[open]').length)).toBe(0);
      // The skip link is first and works: an anchor to the main region's id.
      await tab(page);
      expect(await active(page), id).toBe('a[skip-link]');
      await page.keyboard.press('Enter');
      await expect.poll(() => active(page), { message: id }).toBe(`#main-${id}`);
      await page.evaluate(() => (document.activeElement as HTMLElement).blur());
      if (browserName === 'chromium') {
        await page.evaluate(() => {
          const w = window as unknown as { __shift: number };
          w.__shift = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) w.__shift += (entry as unknown as { value: number }).value;
          }).observe({ type: 'layout-shift', buffered: false });
        });
      }
      await page.addScriptTag({ content: fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js'), 'utf8'), type: 'module' });
      await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
      await expect(shell(page)).toHaveAttribute('data-window-class', id);
      await frame(page);
      expect(await geometry(page), id).toEqual(before);
      if (browserName === 'chromium') expect(await page.evaluate(() => (window as unknown as { __shift: number }).__shift), id).toBe(0);
      await page.close();
    }
  });

  test('APS-24: before the element is defined a drawer in the navigation region keeps its place — its width beside the content in an expanded window, its column’s in a medium one while it is collapsible, none in a compact one — and the menu button is shown by the class alone; no event is emitted until the class is decided', async ({ page: first }) => {
    const places = { 1280: '--tanrei-comp-navigation-drawer-container-width', 800: '--tanrei-comp-navigation-drawer-collapsed-container-width-regular' } as const;
    for (const width of [1280, 800, 400] as const) {
      const page = await withoutScript(first, real(), width);
      const expected = width === 400 ? 0 : await resolveToken(page, places[width]);
      expect((await edges(region(page, 'navigation'))).width, String(width)).toBe(expected);
      expect((await edges(main(page))).left).toBe(expected);
      // The menu button is shown only in the compact window: the class alone decides, where the browser answers style queries.
      const queries = await page.evaluate(() => {
        document.body.insertAdjacentHTML('beforeend', '<style>@container style(--probe: on) { #probe-inner { --answer: yes; } }</style><div style="--probe: on"><div id="probe-inner"></div></div>');
        return getComputedStyle(document.querySelector('#probe-inner')!).getPropertyValue('--answer').trim() === 'yes';
      });
      if (queries) expect(await shown(menu(page)), String(width)).toBe(width === 400);
      await page.close();
    }
    // A drawer that is not collapsible has no place in a medium window.
    const page = await withoutScript(first, real({ navigation: DRAWER('responsive') }), 800);
    expect(await shown(region(page, 'navigation'))).toBe(false);
    // …and once the element is defined the class is told: not before.
    await page.evaluate(() => {
      (window as unknown as { __told: string[] }).__told = [];
      document.addEventListener('windowclasschange', (event) => (window as unknown as { __told: string[] }).__told.push((event as CustomEvent).detail.windowClass));
    });
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => (window as unknown as { __told: string[] }).__told)).toEqual([]);
    await page.addScriptTag({ content: fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js'), 'utf8'), type: 'module' });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __told: string[] }).__told)).toEqual(['medium']);
  });

  test('APS-25: at 200 % text in a window 320 wide the frame keeps its gutters, every region grows with its text, the frame is one column with a main region no narrower than the window less two gutters, no height is fixed, and nothing scrolls sideways but a block that scrolls in its own box', async ({ page }) => {
    await mount(page, 'compact-narrowest');
    const gutter = await resolveToken(page, T('gutter-compact'));
    const before = { header: (await edges(region(page, 'header'))).height, footer: (await edges(region(page, 'footer'))).height };
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    await frame(page);
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])).toEqual([320, 320]);
    // One column: every region starts at the frame's start edge and is the window wide.
    for (const name of ['announcement', 'header', 'footer']) expect([(await edges(region(page, name))).left, (await edges(region(page, name))).width], name).toEqual([0, 320]);
    const scaled = await resolveToken(page, T('gutter-compact'));
    expect((await contentBox(main(page))).width).toBe(320 - 2 * scaled);
    expect(scaled).toBe(2 * gutter);
    // Every region grows with its text; no height is fixed.
    expect((await edges(region(page, 'footer'))).height).toBeGreaterThan(before.footer);
    for (const name of ['announcement', 'header', 'footer', 'aside']) expect(await region(page, name).evaluate((el) => el.style.blockSize + getComputedStyle(el).maxBlockSize), name).toBe('none');
    expect(await css(main(page), 'max-block-size')).toBe('none');
    // The real frame, with a table that cannot shrink: only the table scrolls sideways.
    const table = `<tanrei-table><table><thead><tr>${Array.from({ length: 12 }, (_, i) => `<th scope="col" data-wrap="false">Column ${i + 1}</th>`).join('')}</tr></thead><tbody><tr>${Array.from({ length: 12 }, () => '<td>1</td>').join('')}</tr></tbody></table></tanrei-table>`;
    await mount(page, real({ bar: true, sections: 1, aside: `<aside slot="aside">${table}</aside>` }), { width: 320, height: 640 });
    await page.addStyleTag({ content: `html { font-size: 200%; } ${fs.readFileSync(path.join(pkg, 'dist/table.css'), 'utf8')}` });
    await frame(page);
    expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth])).toEqual([320, 320]);
    expect(await windowClass(page)).toBe('compact');
  });

  test('APS-26: in forced colors the system’s colors fill the frame, the lines between regions are the system’s text color while they are drawn, and the skip link’s box has an edge outline.width thick in the system’s text color', async ({ page, browserName }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, 'expanded');
    const system = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.cssText = 'color: CanvasText; background-color: Canvas';
      document.body.append(probe);
      const colors = [getComputedStyle(probe).color, getComputedStyle(probe).backgroundColor];
      probe.remove();
      return colors;
    });
    const active = await page.evaluate(() => matchMedia('(forced-colors: active)').matches);
    test.skip(!active, `${browserName} does not emulate forced colors`);
    expect([await css(shell(page), 'background-color'), await css(main(page), 'color')]).toEqual([system[1], system[0]]);
    const width = await resolveToken(page, T('outline-width'));
    expect([await px(region(page, 'footer'), 'border-top-width'), await css(region(page, 'footer'), 'border-top-color')]).toEqual([width, system[0]]);
    expect([await px(region(page, 'aside'), 'border-inline-start-width'), await css(region(page, 'aside'), 'border-inline-start-color')]).toEqual([width, system[0]]);
    await tab(page);
    expect(await region(page, 'skip-link').evaluate((el) => [getComputedStyle(el, '::after').borderTopWidth, getComputedStyle(el, '::after').borderTopStyle, getComputedStyle(el, '::after').borderTopColor])).toEqual([`${width}px`, 'solid', system[0]]);
    // While they are drawn: gap draws none here either.
    await mount(page, 'expanded-gap');
    expect(await px(region(page, 'footer'), 'border-top-width')).toBe(0);
  });

  test('APS-27: the frame’s fill reaches under every system inset, the main region’s, the aside’s and the footer’s content stay inside the start, the end and the bottom ones, and the header, the navigation and the navigation bar are not inset a second time', async ({ page }) => {
    // A browser on a desktop has no insets to give: the rules are read as they are written, and applied with insets given by hand.
    const source = fs.readFileSync(path.join(pkg, 'src/styles/app-shell.css'), 'utf8');
    for (const side of ['left', 'right', 'bottom', 'top']) expect(source, side).toContain(`env(safe-area-inset-${side}, 0px)`);
    await mount(page, 'compact');
    // No inset: the gutters alone.
    expect([await px(main(page), 'padding-left'), await px(shell(page), 'padding-bottom')]).toEqual([await resolveToken(page, T('gutter-compact')), 0]);
    // With insets (given through the frame's own private names, which the env() values feed): the content stays inside.
    await shell(page).evaluate((el) => el.setAttribute('style', '--_aps-inset-start: 44px; --_aps-inset-end: 20px; --_aps-inset-bottom: 34px'));
    expect([await px(main(page), 'padding-left'), await px(main(page), 'padding-right')]).toEqual([44, 20]);
    expect([await px(region(page, 'footer'), 'padding-left'), await px(region(page, 'footer'), 'padding-right')]).toEqual([44, 20]);
    expect([await px(region(page, 'aside'), 'margin-left'), await px(region(page, 'aside'), 'margin-right')]).toEqual([44, 20]);
    // The fill reaches the bottom of the window; the content ends above the bottom inset.
    expect([(await edges(shell(page))).bottom, (await edges(region(page, 'footer'))).bottom]).toEqual([800, 800 - 34]);
    // Not a second time: the header has no padding of the frame's, and with a navigation bar the frame adds none below.
    expect([await px(region(page, 'header'), 'margin-left'), (await edges(region(page, 'header'))).left, (await edges(region(page, 'header'))).width]).toEqual([0, 0, 400]);
    await mount(page, 'compact-navigation-bar');
    expect(await shell(page).evaluate((el) => getComputedStyle(el).getPropertyValue('--_aps-inset-bottom').trim())).toBe('0px');
    expect((await edges(region(page, 'navigation-bar'))).bottom).toBe(800);
  });

  test('APS-28: in a right-to-left layout the navigation stands at the right edge and the aside at the left, the skip link’s box at the top right, the menu button where the header puts its start and the lines on the mirrored edges; the direction is the nearest ancestor’s, a change of it is drawn at once keeping the class and navigationOpen, and the order of focus does not change', async ({ page }) => {
    await mount(page, 'expanded-rtl');
    const width = await resolveToken(page, T('outline-width'));
    const [navigation, content, aside] = [await edges(region(page, 'navigation')), await edges(main(page)), await edges(region(page, 'aside'))];
    expect([navigation.right, aside.left]).toEqual([1280, 0]);
    expect([content.right, content.left]).toEqual([navigation.left, aside.right]);
    // The aside's line is at its start edge: the right.
    expect([await px(region(page, 'aside'), 'border-right-width'), await px(region(page, 'aside'), 'border-left-width')]).toEqual([width, 0]);
    expect(await shell(page).evaluate((el) => [el.hasAttribute('dir'), el.matches(':dir(rtl)')])).toEqual([false, true]);
    // The compact fixture: the menu button at the right end of the header.
    await mount(page, 'compact-rtl');
    const [button, header] = [await edges(menu(page)), await contentBox(region(page, 'header'))];
    near(button.right, header.right);
    // The skip link's box at the top right.
    await mount(page, { ...fixture('expanded'), direction: 'rtl' });
    await tab(page);
    const link = region(page, 'skip-link');
    const [offset, inline] = [await resolveToken(page, T('skip-link-offset')), await resolveToken(page, T('skip-link-container-padding-inline'))];
    near(1280 - (await edges(link)).right, offset + inline);
    // The direction changes while shown: drawn at once, the class kept; the order of focus is the markup's.
    await mount(page, real(), { width: 400 });
    await menu(page).click();
    await expect.poll(() => drawer(page).evaluate((el) => !!el.shadowRoot!.querySelector('dialog[open]'))).toBe(true);
    await page.locator('.stage').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await frame(page);
    expect([await windowClass(page), await shell(page).evaluate((el) => (el as unknown as { navigationOpen: boolean }).navigationOpen)]).toEqual(['compact', true]);
    await page.keyboard.press('Escape');
    await resize(page, 1280);
    await expect.poll(async () => (await edges(drawer(page))).right).toBe(1280);
    expect(await css(main(page), 'transition-duration')).toBe('0s');
    await page.locator('.stage').evaluate((el) => el.removeAttribute('dir'));
    await expect.poll(async () => (await edges(drawer(page))).left).toBe(0);
  });

  test('APS-29: a value of scroll, headerPosition, mainWidth or asideOrder that the frame does not define renders with that prop’s default, and a debug build reports it', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, 'expanded');
    const reference = await page.evaluate((tag) => [...document.querySelector(tag)!.children].map((part) => JSON.stringify(part.getBoundingClientRect())), TAG);
    await mount(page, { ...fixture('expanded'), props: { ...fixture('expanded').props, scroll: 'window', headerPosition: 'fixed', mainWidth: 'wide', asideOrder: 'first' } });
    expect(await page.evaluate((tag) => [...document.querySelector(tag)!.children].map((part) => JSON.stringify(part.getBoundingClientRect())), TAG)).toEqual(reference);
    expect(await css(region(page, 'header'), 'position')).toBe('sticky');
    for (const [name, value, fallback] of [
      ['scroll', 'window', 'page'],
      ['headerPosition', 'fixed', 'sticky'],
      ['mainWidth', 'wide', 'contained'],
      ['asideOrder', 'first', 'after'],
    ]) {
      await expect.poll(() => seen.filter((m) => m.includes('APS-29') && m.includes(`${name} "${value}"`) && m.includes(`"${fallback}"`)).length, { message: name }).toBe(1);
    }
  });

  test('APS-30: the frame restyles, resizes and re-orders nothing the product puts in a region beyond its place and its insets, follows no link and stores nothing; every movement it causes is at once, whether or not motion is reduced', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await mount(page, real({ sections: 6 }), { width: 1280 });
    // The order of the regions is the markup's: nothing is moved in the document, and no `order` is set.
    expect(await page.evaluate((tag) => [...document.querySelector(tag)!.children].map((part) => `${part.getAttribute('slot') ?? part.localName}:${getComputedStyle(part).order}`), TAG)).toEqual(['skip-link:0', 'header:0', 'navigation:0', 'main:0', 'aside:0', 'footer:0']);
    // Nothing of a region's own look is set: no font, color or fill on the product's elements beyond what they inherit.
    for (const name of ['header', 'aside', 'footer']) {
      // (The footer stands on the frame's own fill, so that the end of a navigation that stays in view is under it.)
      expect(await region(page, name).evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).fontSize === getComputedStyle(el.parentElement!).fontSize, getComputedStyle(el).color === getComputedStyle(el.parentElement!).color]), name).toEqual([name === 'footer' ? await resolveColor(page, T('container-color')) : 'rgba(0, 0, 0, 0)', true, true]);
    }
    // It remembers nothing beyond its own lifetime, and sets neither the document's title nor its language.
    expect(await page.evaluate(() => [document.title, document.documentElement.lang])).toEqual(['app-shell fixtures', 'en']);
    expect(fs.readFileSync(path.join(pkg, 'src/components/app-shell/app-shell.ts'), 'utf8')).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie|history\.|location\.|document\.title|fetch\(/);
    // The skip link's movement is at once, with motion allowed and a page that scrolls smoothly.
    await page.addStyleTag({ content: 'html { scroll-behavior: smooth; }' });
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    await region(page, 'skip-link').evaluate((el) => (el as HTMLElement).focus());
    const jumped = await page.evaluate(() => {
      (document.activeElement as HTMLElement).click();
      return [document.activeElement?.id, Math.round(document.querySelector('main')!.getBoundingClientRect().top)];
    });
    expect(jumped).toEqual(['main', 64]);
    // The source has no transition, no animation and no smooth scrolling of the frame's own.
    expect(fs.readFileSync(path.join(pkg, 'src/styles/app-shell.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/transition\s*:|animation\s*:|transition-|animation-|(?<!over)scroll-behavior/);
  });
});

test.describe('the element and its stylesheet', () => {
  test('the element brings its stylesheet to the root it is connected to, listens to the window by two media queries and to no resize or frame, and a frame that leaves the page listens to nothing (APS-3, APS-24)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // A page that did not load app-shell.css: the element's own copy lays the frame out.
    await page.setContent(`<!doctype html><html><head><style>${fs.readFileSync(path.join(pkg, 'dist/tokens.css'), 'utf8')} body { margin: 0; }</style></head><body><script>
      window.__listeners = [];
      const add = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, ...rest) { if (this === window || this instanceof MediaQueryList) window.__listeners.push(this === window ? 'window:' + type : 'media:' + this.media); return add.call(this, type, ...rest); };
      window.__frames = 0;
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => (window.__frames++, raf(callback));
    </script><tanrei-app-shell><header slot="header">Header</header><nav slot="navigation" aria-label="Sections" style="inline-size: 200px">Navigation</nav><main id="main">Main</main></tanrei-app-shell><script type="module">${fs.readFileSync(path.join(pkg, 'dist/tanrei.bundle.js'), 'utf8')}</script></body></html>`);
    await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
    await expect(shell(page)).toHaveAttribute('data-window-class', 'expanded');
    expect((await edges(main(page))).left).toBe(200);
    expect(await page.evaluate(() => document.adoptedStyleSheets.length)).toBeGreaterThan(0);
    const listeners = await page.evaluate(() => (window as unknown as { __listeners: string[] }).__listeners);
    expect(listeners.filter((entry) => entry.startsWith('media:') && /37\.5rem|64rem/.test(entry)).sort()).toEqual(['media:(min-width: 37.5rem)', 'media:(min-width: 64rem)']);
    expect(listeners.filter((entry) => /resize|scroll/.test(entry))).toEqual([]);
    // Once it has drawn its first frames — every element settles over two frame callbacks after it is connected
    // (MOT-3, src/primitives/element.ts) — it asks for none.
    await allSettled(page);
    await page.evaluate(() => ((window as unknown as { __frames: number }).__frames = 0));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as unknown as { __frames: number }).__frames)).toBe(0);
  });

  test('no design value is written in the stylesheet or the element: every length, color, radius, duration and opacity is a token (APS-1, APS-8, APS-19)', async () => {
    const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const sheet = strip(fs.readFileSync(path.join(pkg, 'src/styles/app-shell.css'), 'utf8'));
    // Lengths: nothing but zero, the percentages and viewport units of the layout itself, and what a token names.
    const lengths = [...sheet.matchAll(/(?<![\w.-])(\d*\.?\d+)(px|rem|em|pt|ms|s)\b/g)].map((match) => match[0]).filter((value) => !/^0(px|s|ms)?$/.test(value));
    expect(lengths).toEqual([]);
    expect(sheet.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/gi)).toBeNull();
    expect(sheet.match(/opacity\s*:/g)).toBeNull();
    // The system colors of forced colors are the only named colors.
    expect([...new Set(sheet.match(/\b(CanvasText|Canvas|LinkText|Highlight)\b/g))].sort()).toEqual(['Canvas', 'CanvasText']);
    const element = strip(fs.readFileSync(path.join(pkg, 'src/components/app-shell/app-shell.ts'), 'utf8'));
    expect(element.match(/#[0-9a-f]{6}\b|rgba?\(/gi)).toBeNull();
  });
});

test.describe('fixtures', () => {
  test('every fixture of the spec is mounted, alone, in the window its id names', async ({ page }) => {
    test.setTimeout(120_000);
    expect(spec.fixtures).toHaveLength(20);
    for (const f of spec.fixtures) {
      await mount(page, f);
      const size = appShellWindow(f.id);
      await expect(shell(page), f.id).toHaveCount(1);
      expect(await windowClass(page), f.id).toBe(f.id.split('-')[0]);
      for (const [prop, attribute] of [['scroll', 'scroll'], ['headerPosition', 'header-position'], ['mainWidth', 'main-width'], ['asideOrder', 'aside-order'], ['separation', 'separation']] as const) {
        expect(await shell(page).getAttribute(attribute), `${f.id} ${prop}`).toBe(f.props[prop] === undefined ? null : String(f.props[prop]));
      }
      for (const name of Object.keys(f.slots ?? {})) await expect(region(page, name), `${f.id} ${name}`).toHaveCount(1);
      await expect(main(page), f.id).toHaveText(f.content ?? '');
      if (f.direction) await expect(page.locator('.stage')).toHaveAttribute('dir', f.direction);
      // The frame is the window, and nothing scrolls sideways.
      expect([(await edges(shell(page))).width, await page.evaluate(() => document.documentElement.scrollWidth)], f.id).toEqual([size.width, size.width]);
      expect((await edges(shell(page))).height, f.id).toBe(size.height);
      // The menu button, where the fixture has one: shown only while the navigation is presented over the content.
      if (f.items?.length) expect(await shown(menu(page)), f.id).toBe(!f.id.startsWith('expanded'));
    }
  });

  for (const [name, size] of Object.entries(WINDOWS)) {
    for (const theme of ['light', 'dark'] as const) {
      test(`no axe violations at the ${name} width, ${theme}: every fixture alone, and the frame of real components`, async ({ page }) => {
        test.setTimeout(180_000);
        const check = async (label: string) => {
          // (The stage is the whole page; what is asked of a page's content — a heading of level 1 — is the page header's.)
          const results = await new AxeBuilder({ page }).include('.stage').analyze();
          expect(results.violations, `${label}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
        };
        for (const f of spec.fixtures) {
          await mount(page, f, { ...size, theme });
          await check(`${f.id} at ${size.width}`);
        }
        await mount(page, real({ bar: true, sections: 1 }), { ...size, theme });
        await check(`the real frame at ${size.width}`);
      });
    }
  }

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mount(page, f);
      await expect(page).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
