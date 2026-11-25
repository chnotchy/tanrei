// What an element held in a state draws (lib/visuals/pseudo-states.ts), in Chromium:
//
// - every element of the web package, held, adopts copies of its sheets that keep every rule of the sheet with every
//   declaration the browser read from it — the property, its value and its priority — in the same order, with only the
//   figure's copies put in. A sheet written back from the browser's `cssText` lost a `var()` shorthand that a later
//   longhand overrides (a role's `font`, the slider handle's `background`) and wrote `all` out as every longhand;
// - on the slider's and the navigation drawer's pages, the element the anatomy figure held focused to read its focus
//   ring (the slider, a drawer item) keeps the held copies, and computes, in each of its shadow tree's elements and
//   their `::before` and `::after`, the same value of every property as with its own sheets: at rest; held focused, as
//   the live element focused from the keyboard; and held hovered, as the live element under the pointer. The
//   transitions are left out, since a held element is still by design, and so is what the element inherits from what
//   holds it where that differs too (a drawer is focused within while its item has the focus; the figure holds the
//   item, not the drawer).
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and the web package's bundle, and serves `dist/` on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serveDist } from './host.mjs';
import { launch, settlePage } from './launch.mjs';

// Each test's limit, the backstop for a wait with none of its own (launch.mjs).
const LIMIT = { timeout: 120_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const repo = path.join(docs, '../..');
const bundle = path.join(repo, 'packages/web/dist/tanrei.bundle.js');
const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'packages/web/custom-elements.json'), 'utf8'));
const tags = manifest.modules.flatMap((module) => module.declarations ?? []).flatMap((declaration) => (declaration.tagName ? [declaration.tagName] : []));
/** The figure's script, as the page would run it, with what it exports given to the test. */
const pseudoStates = `${stripTypeScriptTypes(fs.readFileSync(path.join(docs, 'src/lib/visuals/pseudo-states.ts'), 'utf8'))}\nwindow.docsPseudoStates = { hold, STATE_ATTRIBUTE };\n`;

let host;
let browser;
before(async () => {
  host = await serveDist(dist);
  browser = await launch();
});
after(async () => {
  await browser?.close();
  await host?.close();
});

test('every element, held, adopts copies that keep every rule of its sheets with every declaration', LIMIT, async () => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  // A page of its own, which defines no element before the bundle does.
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body></body></html>');
  await page.addScriptTag({ path: bundle, type: 'module' });
  await page.addScriptTag({ content: pseudoStates, type: 'module' });
  await page.waitForFunction(() => 'docsPseudoStates' in window && customElements.get('tanrei-button'));
  const result = await page.evaluate(async (tags) => {
    const { hold, STATE_ATTRIBUTE } = window.docsPseudoStates;
    const stage = document.createElement('div');
    document.body.append(stage);
    const differences = [];
    let sheets = 0;
    let copied = 0;
    let rules = 0;
    /** The figure's own rules: a copy, and the rule that holds a held element still. */
    const ours = (rule) => 'selectorText' in rule && rule.selectorText.includes(STATE_ATTRIBUTE);
    const declarations = (style) => [...Array(style.length)].map((_, at) => style.item(at)).map((name) => `${name}: ${style.getPropertyValue(name)}${style.getPropertyPriority(name) ? ' !important' : ''}`);
    const compare = (original, copy, where) => {
      const kept = [...copy].filter((rule) => !ours(rule));
      if (kept.length !== original.length) return differences.push(`${where}: ${original.length} rules, ${kept.length} in the copy`);
      [...original].forEach((rule, at) => {
        const other = kept[at];
        const here = `${where} > ${rule.selectorText ?? rule.cssText.slice(0, rule.cssText.indexOf('{')).trim()}`;
        rules++;
        if (rule.constructor !== other.constructor || (rule.selectorText ?? rule.conditionText ?? '') !== (other.selectorText ?? other.conditionText ?? '')) return differences.push(`${here}: another rule in the copy`);
        if (rule.style) {
          const [a, b] = [declarations(rule.style), declarations(other.style)];
          const lost = a.filter((line) => !b.includes(line));
          const added = b.filter((line) => !a.includes(line));
          if (lost.length || added.length) differences.push(`${here}: lost ${lost.slice(0, 4).join('; ')}${lost.length > 4 ? ` (+${lost.length - 4})` : ''}; added ${added.slice(0, 4).join('; ')}${added.length > 4 ? ` (+${added.length - 4})` : ''}`);
        }
        if (rule.cssRules) compare(rule.cssRules, other.cssRules ?? [], here);
      });
    };
    const seen = new Set();
    let elements = 0;
    for (const tag of tags) {
      if (!customElements.get(tag)) continue;
      const element = document.createElement(tag);
      stage.append(element);
      await element.updateComplete;
      if (!element.shadowRoot) continue;
      elements++;
      const originals = [...element.shadowRoot.adoptedStyleSheets];
      hold(element, []);
      element.shadowRoot.adoptedStyleSheets.forEach((copy, at) => {
        const original = originals[at];
        if (seen.has(original)) return;
        seen.add(original);
        sheets++;
        if (copy !== original) copied++;
        compare(original.cssRules, copy.cssRules, tag);
      });
      element.remove();
    }
    return { elements, sheets, copied, rules, differences };
  }, tags);
  await context.close();
  assert.deepEqual(result.differences, [], `every rule of ${result.sheets} sheets (${result.rules} rules) kept in its copy`);
  assert.ok(result.elements > 100, `the web package's elements are defined (${result.elements})`);
  assert.ok(result.copied > 40, `the sheets with a rule to hold are copied (${result.copied} of ${result.sheets})`);
  console.log(`${result.elements} elements, ${result.sheets} sheets, ${result.copied} copied, ${result.rules} rules compared`);
});

/** The pages whose anatomy figure holds an element focused to read its focus ring, and that element. */
const FIGURES = [
  { page: 'slider', element: 'tanrei-slider' },
  { page: 'navigation-drawer', element: 'tanrei-navigation-drawer-item' },
];

for (const { page: name, element: tag } of FIGURES) {
  test(`${name}: the element the anatomy figure held draws, at rest, focused and hovered, what it draws with its own sheets`, LIMIT, async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', colorScheme: 'light' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${host.origin}/components/${name}/`);
    await page.waitForLoadState('load');
    // The anatomy figure brought into view and drawn (bounded: launch.mjs).
    await page.evaluate(() => document.querySelector('[data-blueprint-figure="anatomy"]').scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() => document.querySelector('[data-blueprint-figure="anatomy"] [data-example-overlay][data-drawn]:not([data-drawing])'), null, { timeout: 15_000 });
    await settlePage(page, { fonts: true });
    await page.mouse.move(0, 0);

    // The element the figure held: in the anatomy figure, the one of its tag whose shadow root adopts the figure's copies.
    const found = await page.evaluate((tag) => {
      const figure = document.querySelector('[data-blueprint-figure="anatomy"]');
      const all = [];
      const walk = (root) => {
        for (const element of root.querySelectorAll('*')) {
          if (element.localName === tag) all.push(element);
          if (element.shadowRoot) walk(element.shadowRoot);
        }
      };
      walk(figure);
      const held = all.filter((element) => element.shadowRoot.adoptedStyleSheets.some((sheet) => [...sheet.cssRules].some((rule) => rule.selectorText?.includes('data-docs-state'))));
      if (held.length) held[0].dataset.heldUnderTest = '';
      return { all: all.length, held: held.length };
    }, tag);
    assert.ok(found.held >= 1, `${name}: the anatomy figure held a ${tag} (of ${found.all}) and it keeps the copies`);

    await page.evaluate(() => {
      const element = document.querySelector('[data-held-under-test]') ?? [...document.querySelectorAll('*')].flatMap((each) => (each.shadowRoot ? [...each.shadowRoot.querySelectorAll('[data-held-under-test]')] : []))[0];
      const own = element.constructor.elementStyles.map((style) => (style instanceof CSSStyleSheet ? style : style.styleSheet));
      const copies = [...element.shadowRoot.adoptedStyleSheets];
      const SKIP = /^transition/;
      /** Every computed value of the host and of each element of its shadow tree, and of their `::before` and `::after`. */
      const read = () => {
        for (const node of [element, ...element.shadowRoot.querySelectorAll('*')]) for (const animation of node.getAnimations({ subtree: true })) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
        const values = new Map();
        [element, ...element.shadowRoot.querySelectorAll('*')].forEach((node, at) => {
          for (const pseudo of [null, '::before', '::after']) {
            const style = getComputedStyle(node, pseudo);
            for (let k = 0; k < style.length; k++) if (!SKIP.test(style[k])) values.set(`${at} <${node.localName}${node.className && typeof node.className === 'string' ? ` class="${node.className}"` : ''}>${pseudo ?? ''} ${style[k]}`, style.getPropertyValue(style[k]));
          }
        });
        // What holds the element: what it inherits from there is not the figure's to hold.
        const parent = getComputedStyle(element.parentElement);
        for (let k = 0; k < parent.length; k++) values.set(`parent ${parent[k]}`, parent.getPropertyValue(parent[k]));
        return values;
      };
      /**
       * The values that differ, but for a property that differs on what holds the element too: a drawer is focused
       * within while its item has the focus, and its guides drawn (`--_nvd-guides-on`, inherited by the item); the
       * figure holds the item, not the drawer.
       */
      const diff = (a, b) => {
        const outside = new Set([...a.keys()].filter((key) => key.startsWith('parent ') && a.get(key) !== b.get(key)).map((key) => key.slice('parent '.length)));
        return [...new Set([...a.keys(), ...b.keys()])]
          .filter((key) => !key.startsWith('parent ') && a.get(key) !== b.get(key) && !outside.has(key.slice(key.lastIndexOf(' ') + 1)))
          .map((key) => `${key}: ${a.get(key)} → ${b.get(key)}`);
      };
      /** Its own sheets, or the figure's copies of them (a sheet the element made itself is in both). */
      const adopt = (which) => (element.shadowRoot.adoptedStyleSheets = which === 'own' ? copies.map((copy, at) => own[at] ?? copy) : copies);
      const focusable = () => element.shadowRoot.querySelector('[tabindex]:not([tabindex="-1"]), button, a[href], input') ?? element;
      // The figure's stage is a picture (`inert`: nothing in it takes the focus or the pointer); the test makes it live,
      // for every reading alike, so that the live element can be focused and hovered.
      element.closest('[inert]')?.removeAttribute('inert');
      window.heldUnderTest = { read, diff, adopt, focusable, element };
    });

    // At rest: the copies, with the host carrying no state, draw what its own sheets draw.
    const rest = await page.evaluate(() => {
      const { read, diff, adopt, element } = window.heldUnderTest;
      element.removeAttribute('data-docs-state');
      adopt('copies');
      const held = read();
      adopt('own');
      const own = read();
      return { count: own.size, differences: diff(own, held) };
    });
    assert.ok(rest.count > 1000, `${name}: values read (${rest.count})`);
    assert.deepEqual(rest.differences, [], `${name}: at rest, the copies draw what the element's own sheets draw`);

    // Focused: the live element focused from the keyboard (Tab back to it from the element before it), then the element
    // held focused.
    await page.evaluate(() => {
      const { adopt, focusable } = window.heldUnderTest;
      adopt('own');
      focusable().focus();
    });
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const target = window.heldUnderTest.focusable();
      const chain = [];
      for (let active = document.activeElement; active; active = active.shadowRoot?.activeElement) chain.push(`${active.localName}.${active.className}`);
      return { visible: target.matches(':focus-visible'), localName: `${target.localName}.${target.className} (focused: ${chain.join(' > ')})` };
    });
    assert.ok(focused.visible, `${name}: the live element shows its focus (${focused.localName} matches :focus-visible)`);
    const focusDifferences = await page.evaluate(() => {
      const { read, diff, adopt, focusable, element } = window.heldUnderTest;
      const live = read();
      focusable().blur();
      adopt('copies');
      element.setAttribute('data-docs-state', 'focused');
      const held = read();
      element.removeAttribute('data-docs-state');
      adopt('own');
      return diff(live, held);
    });
    assert.deepEqual(focusDifferences, [], `${name}: held focused, it draws what it draws focused from the keyboard`);

    // Hovered: the live element under the pointer, then the element held hovered with the pointer away.
    const box = await page.evaluate(() => {
      const rect = window.heldUnderTest.focusable().getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    await page.mouse.move(box.x, box.y);
    const live = await page.evaluate(() => [...window.heldUnderTest.read()]);
    await page.mouse.move(0, 0);
    const hoverDifferences = await page.evaluate((live) => {
      const { read, diff, adopt, element } = window.heldUnderTest;
      adopt('copies');
      element.setAttribute('data-docs-state', 'hovered');
      const held = read();
      element.removeAttribute('data-docs-state');
      return diff(new Map(live), held);
    }, live);
    assert.deepEqual(hoverDifferences, [], `${name}: held hovered, it draws what it draws under the pointer`);
    assert.deepEqual(errors, [], `${name}: no error on the page`);
    await context.close();
  });
}
