// The preview's five screens (src/ui/screens.ts): a product built from Tanrei's own components — an overview of every
// kind, a dashboard, a settings form, a list and its detail, a documentation page — switched from the preview's bar;
// light, dark, or the two side by side; every component on them drawn with the layer; the parts a setting reaches
// outlined on request (`highlight`); and nothing axe finds on any of them.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

const SCREENS = ['overview', 'dashboard', 'settings', 'list', 'docs'];
const WHY = 'Our checkout needs it; nothing in core fits.';

/** Show a screen as a person does: its tab in the preview's bar. Resolves once it is drawn and its components are defined. */
async function show(page, choose, screen) {
  await choose(page.locator('[data-screens]'), screen);
  await page.waitForSelector(`[data-scope] [data-screen="${screen}"]`);
  await page.evaluate(async () => {
    const names = new Set([...document.querySelectorAll('[data-scope] *')].map((el) => el.localName).filter((name) => name.includes('-')));
    await Promise.all([...names].map((name) => customElements.whenDefined(name)));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
/** The Tanrei components a screen draws, by element name. */
const components = (page, screen) => page.locator(`[data-scope] [data-screen="${screen}"]`).first().evaluate((el) => [...new Set([...el.querySelectorAll('*')].map((child) => child.localName).filter((name) => name.startsWith('tanrei-')))].sort());

studioTest('the five screens, from the bar: each built from Tanrei’s components, in light, dark and side by side, and axe finds nothing on any', {}, async ({ page, scope, choose, axe }, t) => {
  for (const screen of SCREENS) {
    await show(page, choose, screen);
    const used = await components(page, screen);
    assert.ok(used.length >= 8, `${screen} is built from Tanrei’s components: ${used.join(', ')}`);
    assert.equal(await scope.locator('.ts-pane').count(), 1, `${screen}: one pane, as large as the preview`);
    await axe('[data-scope]', `the ${screen} screen, light`);
    t.diagnostic(`${screen}: ${used.join(' ')}`);
  }
  // Light, dark, the two side by side: the scheme of the pane, or a second pane.
  for (const [mode, themes] of [['dark', ['dark']], ['both', ['light', 'dark']], ['light', ['light']]]) {
    await choose(page.locator('[data-modes]'), mode);
    await until(async () => JSON.stringify(await scope.locator('.ts-pane').evaluateAll((els) => els.map((el) => el.dataset.tanreiTheme))) === JSON.stringify(themes), `${mode}: the panes are ${themes}`);
    if (mode === 'both') {
      for (const screen of SCREENS) {
        await show(page, choose, screen);
        assert.equal(await scope.locator(`[data-screen="${screen}"]`).count(), 2, `side by side: the ${screen} screen in each scheme`);
        await axe('[data-scope]', `the ${screen} screen, light and dark side by side`);
      }
    }
  }
});

studioTest('switching screens and modes draws each screen once, then moves what exists: the measures on the page’s timeline', {}, async ({ page, choose }, t) => {
  const shown = () => page.evaluate(() => performance.getEntriesByName('tanrei-studio: preview shown').at(-1)?.duration ?? null);
  /** From the press to the frame after the one the switch was drawn in. */
  const press = (group, value) =>
    page.evaluate(
      ([selector, value]) =>
        new Promise((resolve) => {
          const started = performance.now();
          document.querySelector(`${selector} > tanrei-tab[data-value="${value}"]`).click();
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - started)));
        }),
      [group, value],
    );
  const first = {};
  const again = {};
  for (const screen of SCREENS) {
    first[screen] = await press('[data-screens]', screen);
    assert.ok((await shown()) !== null, 'each switch is measured');
    await show(page, choose, screen);
  }
  for (const screen of SCREENS) again[screen] = await press('[data-screens]', screen);
  const modes = {};
  for (const mode of ['dark', 'both', 'light']) modes[mode] = await press('[data-modes]', mode);
  const ms = (o) => Object.entries(o).map(([key, value]) => `${key} ${Math.round(value)} ms`).join(', ');
  t.diagnostic(`first time: ${ms(first)}`);
  t.diagnostic(`again: ${ms(again)}`);
  t.diagnostic(`modes: ${ms(modes)}`);
  // A screen drawn before is moved back, not drawn again: its elements are the same elements.
  await press('[data-screens]', 'settings');
  const marked = await page.evaluate(() => (document.querySelector('[data-scope] [data-screen="settings"]').dataset.seen = 'yes'));
  await press('[data-screens]', 'list');
  await press('[data-screens]', 'settings');
  assert.equal(await page.evaluate(() => document.querySelector('[data-scope] [data-screen="settings"]').dataset.seen), marked, 'the settings screen is the one drawn before');
});

studioTest('the screen and the mode are kept in this browser, never in the file', {}, async ({ page, choose, onDisk, scope }) => {
  const before = JSON.stringify(onDisk());
  await show(page, choose, 'docs');
  await choose(page.locator('[data-modes]'), 'both');
  await until(async () => (await scope.getAttribute('data-mode')) === 'both', 'side by side');
  await page.reload();
  await page.waitForSelector('[data-save-state="saved"]');
  await page.waitForSelector('[data-scope] [data-screen="docs"]');
  assert.deepEqual(await page.evaluate(() => window.tanreiStudio.getPreview()), { screen: 'docs', mode: 'both' });
  assert.equal(JSON.stringify(onDisk()), before, 'the file is as it was');
});

studioTest('every component the screens draw follows the layer: one change to the dials and the brand color reaches each of them', {}, async ({ page, choose }) => {
  /** Every Tanrei component drawn on the screen (an option of a closed select is not), and what its shadow tree draws: colors, corners, padding, type. */
  const looks = (screen) =>
    page.locator(`[data-scope] [data-screen="${screen}"]`).first().evaluate((root) => {
      const PROPERTIES = ['color', 'background-color', 'border-top-color', 'border-top-left-radius', 'padding-top', 'padding-inline-start', 'font-size', 'font-family', 'block-size', 'gap'];
      const drawn = (el) => [el, ...(el.shadowRoot ? [...el.shadowRoot.querySelectorAll('*')] : [])].map((part) => PROPERTIES.map((name) => getComputedStyle(part).getPropertyValue(name)).join('|')).join('/');
      const out = {};
      for (const el of root.querySelectorAll('*')) if (el.localName.startsWith('tanrei-') && el.getClientRects().length) (out[el.localName] ??= []).push(drawn(el));
      return out;
    });
  const seen = {};
  for (const screen of SCREENS) {
    await show(page, choose, screen);
    seen[screen] = await looks(screen);
  }
  await page.evaluate(() =>
    window.tanreiStudio.setLayer({
      id: 'acme',
      extends: 'tanrei',
      palettes: { primary: { source: { seed: '#0f766e' } }, neutral: { source: { seed: '#4a3b2a' } } },
      tokens: {
        'tanrei.dial.space.unit': { $value: { value: 10, unit: 'px' }, reason: 'A roomier product.' },
        'tanrei.dial.shape.unit': { $value: { value: 7, unit: 'px' }, reason: 'Rounder corners.' },
        'tanrei.dial.type.base': { $value: { value: 18, unit: 'px' }, reason: 'Larger text.' },
      },
    }),
  );
  await page.waitForFunction(() => window.tanreiStudio.getState().layer.tokens?.['tanrei.dial.type.base']);
  const unchanged = [];
  for (const screen of SCREENS) {
    await show(page, choose, screen);
    await page.waitForTimeout(400); // colors and sizes may transition
    const now = await looks(screen);
    for (const [name, before] of Object.entries(seen[screen])) if (JSON.stringify(now[name]) === JSON.stringify(before)) unchanged.push(`${screen}: ${name}`);
  }
  assert.deepEqual(unchanged, [], 'each component on each screen draws differently under the new layer');
});

studioTest('a variant the layer adds to a component the overview shows is drawn there with the others: a card', {}, async ({ page, choose, saved }) => {
  await show(page, choose, 'overview');
  assert.equal(await page.locator('[data-scope] [data-sample="card-brand"]').count(), 0);
  const problem = await page.evaluate((why) => window.tanreiStudio.addExtension({ vocabulary: { 'tanrei.comp.card.variant.brand': { from: 'outlined', rationale: why } } }), WHY);
  assert.equal(problem, null);
  await saved((layer) => layer.vocabulary?.['tanrei.comp.card.variant.brand'], 'the variant');
  await until(async () => (await page.locator('[data-scope] tanrei-card[variant="brand"]').count()) === 1, 'the overview draws <tanrei-card variant="brand">');
});

studioTest('highlight(ids): the parts of the screen that read a token, or a token that follows it, are outlined; clearHighlight takes the outline off', {}, async ({ page, choose }) => {
  await show(page, choose, 'dashboard');
  const lit = () => page.evaluate(() => [...document.querySelectorAll('[data-scope] [data-ts-lit]')].map((el) => `${el.localName}${el.getAttribute('variant') ? `[${el.getAttribute('variant')}]` : ''}`));
  const count = await page.evaluate(() => window.tanreiStudio.highlight(['tanrei.sys.color.primary']));
  const parts = await lit();
  assert.equal(count, parts.length);
  assert.ok(parts.includes('tanrei-button'), `the filled buttons read the primary color through their own tokens: ${parts}`);
  assert.ok(parts.includes('span'), `so do the chart’s bars, through the screen’s own rule: ${parts}`);
  assert.ok(!parts.includes('tanrei-navigation-drawer-item'), 'a part inside a lit component is that component’s, and is not outlined again');
  // An outline, not a change to what the part draws.
  const outline = await page.evaluate(() => getComputedStyle(document.querySelector('[data-scope] [data-ts-lit]')).outlineStyle);
  assert.equal(outline, 'solid');
  // A dial reaches what its steps reach: the corners.
  assert.ok((await page.evaluate(() => window.tanreiStudio.highlight(['tanrei.dial.shape.unit']))) > 0, 'the corner dial reaches parts of the dashboard');
  // The type the headings are set in.
  const headings = await page.evaluate(() => (window.tanreiStudio.highlight(['tanrei.ref.typeface.brand']), [...document.querySelectorAll('[data-scope] [data-ts-lit]')].map((el) => el.localName)));
  assert.ok(headings.includes('h4'), `the greeting is set in the brand face: ${headings}`);
  await page.evaluate(() => window.tanreiStudio.clearHighlight());
  assert.deepEqual(await lit(), []);
  assert.equal(await page.evaluate(() => window.tanreiStudio.highlight([])), 0);
});

for (const locale of ['en-US', 'ar', 'ja']) {
  studioTest(`${locale}, 390 wide: every screen is one column that fits, in the Studio’s language`, { locale, viewport: { width: 390, height: 844 } }, async ({ page, choose, fits }) => {
    for (const screen of SCREENS) {
      await show(page, choose, screen);
      await fits('[data-scope]', `${locale}: the ${screen} screen at 390`);
    }
    assert.deepEqual(await page.evaluate(() => window.tanreiStudio.missingWords()), [], 'every word a component on the screens reads is given');
  });
}
