// The gallery's fixtures that stand in the page's top layer are drawn closed and opened from their stage, on the page,
// as a product opens them, in each engine. A modal one (a dialog, a modal layer, an image preview, a modal picker, a
// modal sheet or drawer) is opened by the button in its stage: it opens modally, focus goes into it, and Escape — or an
// action, as a product's handler closes it — closes it and gives focus back to the button. Nothing opens as the reader
// scrolls: the stages are closed, the page is not inert, and neither its focus nor its scroll moves. A stage shows the
// fixture's picture open — its baseline, half the size of its window — above the button. What opens is drawn in the stage's scheme and
// the page's text (a modal layer's content, which it does not style, is not set in the browser's serif); axe finds
// nothing in the gallery, closed or open. One whose surface stands beside its anchor (a tooltip, a button's menu, a
// compact popover) is opened and closed by its stage's action, and the action shows whether it is open.
//
// It was written after the modal fixtures were drawn in windows of their own (`iframe`, `srcdoc`) written as they came
// near the view and emptied as they left it: a reader who jumped down the page met empty stages for seconds, and the
// modal layer's content was set in the browser's serif, a document that held none of the page's text style.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//   DOCS_ENGINES=chromium,firefox,webkit node --test test/browser/fixture-openers.test.mjs
//
// It reads `dist/` and serves it on a free port as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { serveDist } from './host.mjs';
import { engines, launch, settlePage } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs).
const LIMIT = { timeout: 150_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');

/** One modal fixture of each component whose modal fixtures are opened from their stage, besides the Dialog's (all of which are). */
const MODALS = [
  ['/components/modal-layer/', 'open', 'tanrei-modal-layer'],
  ['/components/image-preview/', 'single', 'tanrei-image-preview'],
  ['/components/date-time-picker/', 'modal-date', 'tanrei-date-time-picker'],
  ['/components/bottom-sheet/', 'modal', 'tanrei-bottom-sheet'],
  ['/components/side-sheet/', 'modal', 'tanrei-side-sheet'],
  ['/components/navigation-drawer/', 'modal', 'tanrei-navigation-drawer'],
];

let host;
let origin;
const browsers = new Map();

before(async () => {
  host = await serveDist(dist);
  origin = host.origin;
  for (const engine of engines('chromium,firefox,webkit')) browsers.set(engine, await launch(engine));
});

after(async () => {
  for (const browser of browsers.values()) await browser.close();
  await host?.close();
});

const stage = (id) => `.docs-stage[data-fixture-id="${id}"]`;

/**
 * Runs IN THE PAGE: what a modal stage's fixture is now — whether it is open (its attribute, and a native dialog of it
 * modal in the top layer), and where focus is: in it, on the stage's button, or elsewhere (named).
 */
function modalState([selector, tag]) {
  const figure = document.querySelector(selector);
  const element = figure?.querySelector(`[data-fixture-scope] > .stage ${tag}`);
  const trigger = figure?.querySelector('[data-stage-trigger]');
  if (!element || !trigger) return { drawn: false };
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  const within = (host) => {
    for (let node = active; node; node = node.getRootNode().host) if (node === host || host.contains(node)) return true;
    return false;
  };
  const modal = (root) => [...root.querySelectorAll('*')].some((node) => node.matches(':modal') || (node.shadowRoot && modal(node.shadowRoot)));
  return {
    drawn: true,
    open: element.hasAttribute('open'),
    modal: modal(element.shadowRoot ?? element),
    focus: within(element) ? 'in it' : within(trigger) ? 'on the button' : (active?.localName ?? 'nothing'),
  };
}

/** Waits up to 5 s for a modal stage's fixture to be as `want` says, and names the step and what it is then otherwise. */
async function expect(page, id, tag, what, want) {
  await page
    .waitForFunction(
      ([args, wanted]) => {
        const now = window.__modalState(args);
        return Object.entries(wanted).every(([key, value]) => now[key] === value);
      },
      [[stage(id), tag], want],
      { timeout: 5_000 },
    )
    .catch(async (cause) => {
      const now = await page.evaluate((args) => window.__modalState(args), [stage(id), tag]);
      throw new Error(`${id}: ${what}, and 5 s later it is not ${JSON.stringify(want)} (it is ${JSON.stringify(now)})`, { cause });
    });
}

async function openPage(engine, options = {}) {
  const context = await browsers.get(engine).newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(`window.__modalState = ${modalState.toString()};`);
  return { context, page, errors };
}

/** Brings a stage into view and waits for its fixture to be drawn and defined, and for its button to answer. */
async function reach(page, id, tag) {
  await page.locator(stage(id)).scrollIntoViewIfNeeded();
  await page.locator(`${stage(id)} [data-fixture-scope] > .stage ${tag}`).waitFor({ state: 'attached' });
  await page.waitForFunction((name) => customElements.get(name) && customElements.get('tanrei-button'), tag);
  await settlePage(page, { fonts: false });
}

/** Opens a modal stage's fixture with its button, and closes it with Escape: focus goes in, and back to the button. */
async function openAndEscape(page, id, tag) {
  await reach(page, id, tag);
  await expect(page, id, tag, 'it was drawn', { drawn: true, open: false, modal: false });
  await page.locator(`${stage(id)} [data-stage-trigger]`).click();
  await expect(page, id, tag, 'its button was pressed', { open: true, modal: true, focus: 'in it' });
  await page.keyboard.press('Escape');
  await expect(page, id, tag, 'Escape was pressed', { open: false, modal: false, focus: 'on the button' });
}

for (const engine of engines('chromium,firefox,webkit')) {
  describe(`the gallery opens its fixtures on the page (${engine})`, () => {
    test('the Dialog’s fixtures: nothing opens as the reader scrolls; each opens from its button and gives focus back', LIMIT, async () => {
      const { context, page, errors } = await openPage(engine);
      try {
        await page.goto(`${origin}/components/dialog/`, { waitUntil: 'load' });
        const ids = await page.locator('.docs-stage[data-fixture-id]').evaluateAll((stages) => stages.map((each) => [each.dataset.fixtureId, each.dataset.stage, each.hasAttribute('data-stage-modal')]));
        assert.ok(ids.length > 10, 'the Dialog has its fixtures');
        assert.deepEqual(ids.filter(([, kind, modal]) => kind !== 'opener' || !modal), [], 'every fixture of the Dialog is a modal opener');
        assert.equal(await page.locator('.docs-fixture-gallery iframe').count(), 0, 'no fixture is drawn in a window');
        // Its button says "Open", and its name says which fixture it opens.
        await reach(page, 'basic', 'tanrei-dialog');
        assert.equal(await page.locator(`${stage('basic')} [data-stage-trigger]`).evaluate((button) => button.textContent.trim()), 'Open');
        assert.equal(await page.locator(stage('basic')).getByRole('button', { name: 'Open basic', exact: true }).count(), 1);

        // Scrolled through stage by stage, with the reader's focus on something of the page: nothing opens, the page
        // keeps its scroll and its focus, and every stage shows the picture of its fixture open.
        await page.evaluate(() => {
          const probe = Object.assign(document.createElement('button'), { id: 'probe', textContent: 'Probe' });
          probe.style.cssText = 'position: fixed; inset-block-start: 0; inset-inline-start: 0';
          document.body.append(probe);
          probe.focus();
        });
        const moved = [];
        for (const [id] of ids) {
          await page.evaluate((selector) => document.querySelector(selector).scrollIntoView({ block: 'center' }), stage(id));
          await reach(page, id, 'tanrei-dialog');
          // Once it is drawn and defined: a fixture that opened as it was drawn would move the page's focus and scroll.
          const at = await page.evaluate(() => scrollY);
          await settlePage(page, { fonts: false });
          // Its picture has loaded, from the site.
          await page.waitForFunction((selector) => document.querySelector(`${selector} .docs-stage-picture`)?.complete, stage(id), { timeout: 10_000 }).catch(() => {});
          const now = await page.evaluate(
            ([selector, args]) => {
              const picture = document.querySelector(`${selector} .docs-stage-picture`);
              const box = picture?.getBoundingClientRect();
              return {
                y: scrollY,
                focus: document.activeElement?.id,
                state: window.__modalState(args),
                picture: picture ? { drawn: [box.width, box.height], wanted: [picture.width, picture.height], loaded: picture.complete && picture.naturalWidth > 0, natural: picture.naturalWidth, src: picture.getAttribute('src') } : null,
                inert: document.querySelector('main')?.closest('[inert]') !== null,
              };
            },
            [stage(id), [stage(id), 'tanrei-dialog']],
          );
          if (Math.abs(now.y - at) > 1) moved.push(`${id}: the page was scrolled from ${Math.round(at)} to ${Math.round(now.y)}`);
          if (now.focus !== 'probe') moved.push(`${id}: the focus moved to ${now.focus}`);
          if (now.state.open || now.state.modal) moved.push(`${id}: it opened by itself`);
          if (now.inert) moved.push(`${id}: the page is inert`);
          const { picture } = now;
          if (!picture) moved.push(`${id}: its stage shows no picture of it`);
          else {
            if (!picture.loaded) moved.push(`${id}: its picture ${picture.src} did not load`);
            // Half its window, drawn at twice that for the device pixel ratio the baselines are taken at.
            else if (picture.natural !== picture.wanted[0] * 2) moved.push(`${id}: its picture is ${picture.natural} wide, not twice ${picture.wanted[0]}`);
            if (Math.abs(picture.drawn[0] - picture.wanted[0]) > 1 || Math.abs(picture.drawn[1] - picture.wanted[1]) > 1) moved.push(`${id}: its picture is drawn ${picture.drawn.map(Math.round).join(' × ')}, not ${picture.wanted.join(' × ')}`);
          }
        }
        assert.deepEqual(moved, []);

        // Each opens from its button, takes focus, and closes on Escape, giving focus back to the button; its stage is as it was.
        for (const [id] of ids) {
          const before = await page.locator(`${stage(id)} .docs-stage-box`).boundingBox();
          await openAndEscape(page, id, 'tanrei-dialog');
          const after = await page.locator(`${stage(id)} .docs-stage-box`).boundingBox();
          assert.ok(Math.abs(before.height - after.height) <= 1 && Math.abs(before.width - after.width) <= 1, `${id}: its stage was ${before.width} × ${before.height} and is ${after.width} × ${after.height}`);
        }

        // An action closes it, as a product's handler does, and focus goes back to the button.
        await reach(page, 'basic', 'tanrei-dialog');
        await page.locator(`${stage('basic')} [data-stage-trigger]`).click();
        await expect(page, 'basic', 'tanrei-dialog', 'its button was pressed', { open: true, modal: true, focus: 'in it' });
        await page.locator(`${stage('basic')} tanrei-dialog > tanrei-button[dismissive]`).click();
        await expect(page, 'basic', 'tanrei-dialog', 'its dismissive action was pressed', { open: false, modal: false, focus: 'on the button' });
        assert.deepEqual(errors, [], 'errors the page threw');
      } finally {
        await context.close();
      }
    });

    test('a modal fixture of each component opens from its button, takes focus, and closes on Escape, giving focus back', LIMIT, async () => {
      const { context, page, errors } = await openPage(engine);
      try {
        for (const [pathname, id, tag] of MODALS) {
          await page.goto(`${origin}${pathname}`, { waitUntil: 'load' });
          assert.equal(await page.locator(stage(id)).getAttribute('data-stage'), 'opener', `${pathname}${id}`);
          await openAndEscape(page, id, tag);
        }
        assert.deepEqual(errors, [], 'errors the page threw');
      } finally {
        await context.close();
      }
    });

    test('what opens is drawn in the page’s text and the stage’s scheme', LIMIT, async () => {
      const { context, page } = await openPage(engine, { colorScheme: 'dark' });
      try {
        // A modal layer's content is the product's, and it does not style it: it is in the page's text.
        await page.goto(`${origin}/components/modal-layer/`, { waitUntil: 'load' });
        await reach(page, 'open', 'tanrei-modal-layer');
        await page.locator(`${stage('open')} [data-stage-trigger]`).click();
        await expect(page, 'open', 'tanrei-modal-layer', 'its button was pressed', { open: true, modal: true });
        const text = await page.evaluate((selector) => ({ layer: getComputedStyle(document.querySelector(`${selector} tanrei-modal-layer`)).fontFamily, page: getComputedStyle(document.querySelector('.docs-fixture-gallery')).fontFamily }), stage('open'));
        assert.equal(text.layer, text.page, 'the modal layer’s content is set in the page’s text');
        assert.doesNotMatch(text.layer, /^["']?(serif|Times)/i);
        await page.keyboard.press('Escape');

        // In the page's scheme (dark here), and in the stage's own once its switch is turned.
        await page.goto(`${origin}/components/dialog/`, { waitUntil: 'load' });
        await reach(page, 'basic', 'tanrei-dialog');
        const scheme = () => page.evaluate((selector) => getComputedStyle(document.querySelector(`${selector} tanrei-dialog`).shadowRoot.querySelector('dialog')).colorScheme, stage('basic'));
        await page.locator(`${stage('basic')} [data-stage-trigger]`).click();
        await expect(page, 'basic', 'tanrei-dialog', 'its button was pressed', { open: true, modal: true });
        assert.match(await scheme(), /dark/);
        await page.keyboard.press('Escape');
        await expect(page, 'basic', 'tanrei-dialog', 'Escape was pressed', { open: false });
        await page.locator(`${stage('basic')} [data-stage-theme]`).click();
        await page.waitForFunction((selector) => document.querySelector(`${selector} .docs-stage-box`)?.dataset.tanreiTheme === 'light', stage('basic'), { timeout: 5_000 });
        await page.locator(`${stage('basic')} [data-stage-trigger]`).click();
        await expect(page, 'basic', 'tanrei-dialog', 'its button was pressed again', { open: true, modal: true });
        assert.match(await scheme(), /light/);
      } finally {
        await context.close();
      }
    });

    test('axe finds nothing in the Dialog’s gallery, closed or with a fixture open', LIMIT, async () => {
      const { context, page } = await openPage(engine);
      try {
        await page.goto(`${origin}/components/dialog/`, { waitUntil: 'load' });
        await reach(page, 'basic', 'tanrei-dialog');
        const said = (report) => report.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`);
        assert.deepEqual(said(await new AxeBuilder({ page }).include(stage('basic')).analyze()), [], 'axe: a closed stage');
        await page.locator(`${stage('basic')} [data-stage-trigger]`).click();
        await expect(page, 'basic', 'tanrei-dialog', 'its button was pressed', { open: true, modal: true, focus: 'in it' });
        assert.deepEqual(said(await new AxeBuilder({ page }).include(`${stage('basic')} tanrei-dialog`).analyze()), [], 'axe: the open dialog');
      } finally {
        await context.close();
      }
    });

    // A stage's own actions in its header — its scheme, an opener's action, a window's redraw — are icon-only Buttons:
    // each icon is the icon set's glyph, drawn from its ligature in the icon slot, and not the ligature's word set as
    // the button's label. It was written after every stage's scheme switch read "dark_mode" on every component page:
    // the gallery's markup lost the `slot` of each icon on its way into the frame's actions.
    test('a stage’s actions draw their icons as glyphs, not as the words of their ligatures', LIMIT, async () => {
      const { context, page } = await openPage(engine);
      try {
        const drawn = [];
        for (const [pathname, id, selector] of [
          ['/components/button/', 'filled-medium', '[data-stage-theme]'],
          ['/components/tooltip/', 'plain', '[data-stage-open]'],
          ['/components/app-shell/', 'compact', '[data-stage-redraw]'],
        ]) {
          await page.goto(`${origin}${pathname}`, { waitUntil: 'load' });
          const action = page.locator(`${stage(id)} ${selector}`);
          await page.locator(stage(id)).scrollIntoViewIfNeeded();
          await action.waitFor();
          await page.waitForFunction(() => customElements.get('tanrei-button'));
          await settlePage(page);
          drawn.push(
            await action.evaluate((button, where) => {
              const icon = button.querySelector(':scope > span');
              const word = icon?.textContent.trim() ?? '';
              // The word in the page's text, as it would read were it a label: what a glyph is drawn in place of.
              const probe = Object.assign(document.createElement('span'), { textContent: word });
              probe.style.cssText = 'position: absolute; white-space: nowrap; font: inherit';
              button.after(probe);
              const asWord = probe.getBoundingClientRect().width;
              probe.remove();
              const box = icon?.getBoundingClientRect();
              return { where, word, slot: icon?.slot ?? null, glyph: box ? Math.round(box.width) : null, height: box ? Math.round(box.height) : null, asWord: Math.round(asWord), button: Math.round(button.getBoundingClientRect().width) };
            }, `${pathname} ${id}`),
          );
        }
        // A glyph is about as wide as it is tall, far narrower than its ligature's word; the button is as wide as it is high.
        const wrong = drawn.filter(({ slot, glyph, height, asWord }) => slot !== 'icon' || !(glyph > 0) || glyph > height * 1.25 || glyph > asWord / 2);
        assert.deepEqual(wrong, [], JSON.stringify(drawn));
      } finally {
        await context.close();
      }
    });

    // A fixture whose surface stands beside its anchor in the top layer is drawn closed in the page, and its stage's
    // action opens the real surface there and closes it again; the action shows whether it is open, however it closed.
    test('an opener’s stage draws its fixture closed, and its action opens and closes it on the page', LIMIT, async () => {
      const { context, page } = await openPage(engine);
      try {
        // Each is closed by what closes it in a product: the tooltip closes itself on Escape wherever focus is, and the
        // compact popover asks to be closed on Escape (`close`); the button with menu never closes itself — a press of
        // its trailing half asks to (`toggle`), and the page closes it from that, as a product does (its fixture holds
        // no menu item, so its open form presents no menu to dismiss).
        const OPENERS = [
          ['/components/tooltip/', 'plain', 'tanrei-tooltip', 'Escape'],
          ['/components/button-with-menu/', 'filled-open', 'tanrei-button-with-menu', 'trailing'],
          ['/components/popover/', 'compact', 'tanrei-popover', 'Escape'],
        ];
        for (const [pathname, id, tag, closing] of OPENERS) {
          await page.goto(`${origin}${pathname}`, { waitUntil: 'load' });
          const figure = page.locator(stage(id));
          await figure.scrollIntoViewIfNeeded();
          assert.equal(await figure.getAttribute('data-stage'), 'opener', `${pathname}${id}`);
          const element = figure.locator(`[data-fixture-scope] > .stage ${tag}`);
          await element.waitFor({ state: 'attached' });
          await page.waitForFunction((name) => customElements.get(name), tag);
          assert.equal(await element.evaluate((el) => el.hasAttribute('open')), false, `${id} is drawn closed`);
          const toggle = figure.locator('[data-stage-open]');
          // Each step waits 5 s for the fixture's `open` and the action's `selected` to say `want`, and a step that runs
          // out names itself and what they say then.
          const step = async (what, want) => {
            const handles = [await element.elementHandle(), await toggle.elementHandle()];
            await page.waitForFunction(([el, action, open]) => el.hasAttribute('open') === open && action.hasAttribute('selected') === open, [...handles, want], { timeout: 5_000 }).catch(async (cause) => {
              const now = await page.evaluate(([el, action]) => `open ${el.hasAttribute('open')}, the action selected ${action.hasAttribute('selected')}`, handles);
              throw new Error(`${pathname}${id}: ${what}, and 5 s later the fixture is not ${want ? 'open' : 'closed'} (${now})`, { cause });
            });
          };
          await toggle.click();
          await step('the action was pressed', true);
          // Closed by the fixture itself, and the action says so.
          if (closing === 'Escape') {
            await page.keyboard.press('Escape');
            await step('Escape was pressed', false);
          } else {
            await element.locator('button#trailing').click();
            await step('its trailing half was pressed', false);
          }
          // Opened again, and closed by the action.
          await toggle.click();
          await step('the action was pressed again', true);
          await toggle.click();
          await step('the action was pressed while it was open', false);
        }
      } finally {
        await context.close();
      }
    });
  });
}
