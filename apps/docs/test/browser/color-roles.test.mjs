// The color role maps of the built site (components/visuals/ColorRoleMap.astro, lib/visuals/color-roles.ts), on the
// pages that place them:
//
// - every part a figure finds is drawn in the color of its row's token, as the browser computed the part (a fill's
//   `background-color`, a text's `color`, an edge's border): a component that binds a part to another token than its
//   tokens say fails here, and every such part is printed;
// - each token's value is what the default system resolves it to on disk, in the light and in the dark scheme, and
//   where the token is its role itself, the role's value too;
// - each ratio is the token build's own contrast of the token and what is drawn behind it: a text on its container is
//   the two tokens' ratio;
// - under a preset chosen in the header, the rows name the roles that system writes, with its values;
// - focusing a row's header outlines its part, inside the figure, and draws its leader heavier; the table is read as
//   a table of parts and roles; a translated page writes the heading in its language.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
//
// It reads `dist/` and serves it on a free port, as the host does (host.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { contrast } from '../../../../packages/tokens-build/src/invariants.js';
import { serveDist } from './host.mjs';
import { launch, settlePage } from './launch.mjs';

const LIMIT = { timeout: 240_000 };

const docs = fileURLToPath(new URL('../../', import.meta.url));
const dist = path.join(docs, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('apps/docs/dist holds no site: run `pnpm --filter @tanrei/docs build` first');
const repo = path.join(docs, '../..');
const NS = JSON.parse(fs.readFileSync(path.join(repo, 'tanrei.config.json'), 'utf8')).namespace;
const trees = new Map();
/** What a system resolves a token to in a scheme, read from disk (the default system's files are at the top). */
const resolvedIn = (system, dotted, scheme = 'light') => {
  const file = system === NS ? `design/tokens/${NS}.${scheme}.tokens.json` : `design/tokens/${system}/${NS}.${scheme}.tokens.json`;
  if (!trees.has(file)) trees.set(file, JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8')));
  return dotted.split('.').reduce((node, key) => node?.[key], trees.get(file))?.$value;
};
/** A DTCG color as the figure writes it: `#rrggbb`, or `#rrggbbaa` where it is translucent (8-bit, as drawn). */
const hexOf = (color) => {
  const alpha = color.alpha ?? 1;
  const channels = color.components.map((c) => Math.round(c * 255));
  // A fully transparent color is drawn as nothing: its channels are not kept.
  const shown = alpha === 0 ? [0, 0, 0, 0] : alpha < 1 ? [...channels, Math.round(alpha * 255)] : channels;
  return `#${shown.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
};
/** Two `#…` colors the same to one step of 8 bits a channel (a translucent color's channels are drawn premultiplied). */
const near = (a, b) => {
  const read = (hex) => (hex.length === 7 ? `${hex}ff` : hex).slice(1).match(/../g).map((pair) => parseInt(pair, 16));
  const [x, y] = [read(a), read(b)];
  const tolerance = x[3] < 255 ? Math.ceil(255 / Math.max(1, x[3])) : 1;
  return x.every((value, index) => Math.abs(value - y[index]) <= (index === 3 ? 1 : tolerance));
};

const PAGES = ['button', 'menu', 'tabs', 'slider', 'text-field'];

/**
 * The parts drawn in another color than the token their row names, as the figures find them today, each with why. A
 * part leaves the list when the component, its tokens or the figure's model of them are made to agree; none may join
 * it without a reason the spec gives.
 */
const KNOWN = {
  // BTN-13: an icon beside a label takes the label's color; `icon.color` is drawn only by an icon-only button. The
  // filled, tonal and elevated buttons alias the one to the other, so only these two show it.
  'button outlined: icon': 'drawn in the label’s color beside a label (BTN-13); its icon token is drawn only by an icon-only button',
  'button text: icon': 'drawn in the label’s color beside a label (BTN-13); its icon token is drawn only by an icon-only button',
  // MNU-38: the default system marks a checked item with the control look (a filled box and its check, the
  // `control` and `control-mark` tokens), which no part of the anatomy names; `mark.color` is the glyph look's.
  'menu selected: mark': 'the default system draws the control look (MNU-38); the mark token is the glyph look’s',
};
/**
 * The rows whose part the figure's fixture does not draw, as the figures find them today, each with why. A row that
 * comes to be drawn leaves the list; one that stops being drawn (a text whose contrast is no longer measured) fails
 * until it is understood, as a part drawn in another color does (KNOWN). The rows of AS_ON_MAIN were not drawn when
 * the list was written; each is still to be examined.
 */
const AS_ON_MAIN = 'not drawn when this list was written; not yet examined';
const KNOWN_NOT_DRAWN = {
  'menu Color roles: mark': AS_ON_MAIN,
  'menu Color roles: supporting-text': AS_ON_MAIN,
  'menu Color roles: trailing-text': AS_ON_MAIN,
  'menu Color roles: trailing-icon': AS_ON_MAIN,
  'menu Color roles: group-title': AS_ON_MAIN,
  'menu Color roles: divider': AS_ON_MAIN,
  'menu selected: container': AS_ON_MAIN,
  'menu selected: leading-icon': AS_ON_MAIN,
  'menu selected: label': AS_ON_MAIN,
  'menu selected: supporting-text': AS_ON_MAIN,
  'menu selected: trailing-text': AS_ON_MAIN,
  'menu selected: trailing-icon': AS_ON_MAIN,
  'menu selected: group-title': AS_ON_MAIN,
  'menu selected: divider': AS_ON_MAIN,
  // TAB-18: at rest the state layer is drawn as no element (hidden, its ::before drawing it, so that a contrast checker
  // still checks the label under it), which the figure does not find yet.
  'tabs primary · selected: state-layer': 'drawn as no element (its ::before), which the figure does not find yet',
  'tabs primary · selected: icon': 'the fixture’s tabs have labels and no icons',
  'text-field outlined: field.label': AS_ON_MAIN,
  'text-field outlined: field.label-icon': AS_ON_MAIN,
  'text-field outlined: field.supporting-text': AS_ON_MAIN,
  'text-field outlined: field.error-text': AS_ON_MAIN,
  'text-field outlined: field.counter': AS_ON_MAIN,
  'text-field outlined: text-input.outline': AS_ON_MAIN,
  'text-field outlined: text-input.required-asterisk': AS_ON_MAIN,
  'text-field outlined: text-input.leading-icon': AS_ON_MAIN,
  'text-field outlined: text-input.trailing-icon': AS_ON_MAIN,
};
const FIGURE = '[data-color-roles-figure]';

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

/** Each figure of the page brought into view and drawn (15 s each), then its rows as the page wrote them. */
async function figuresOf(page) {
  const count = await page.locator(FIGURE).count();
  const figures = [];
  for (let at = 0; at < count; at += 1) {
    const wait = ({ at, left, scroll }) => {
      const frame = document.querySelectorAll('[data-color-roles-figure]')[at];
      if (scroll) frame.scrollIntoView({ block: 'center' });
      const until = Date.now() + left;
      const done = () => frame.querySelector('[data-example-overlay][data-drawn]:not([data-drawing])');
      return (async () => {
        while (!done() && Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 50));
        return Boolean(done());
      })();
    };
    const deadline = Date.now() + 15_000;
    await page.evaluate(wait, { at, left: 15_000, scroll: true });
    await settlePage(page, { fonts: false });
    const drawn = await page.evaluate(wait, { at, left: Math.max(0, deadline - Date.now()), scroll: false });
    figures.push({
      drawn,
      ...(await page.evaluate((at) => {
        const frame = document.querySelectorAll('[data-color-roles-figure]')[at];
        return {
          title: frame.querySelector('[data-part="title"]').textContent.trim(),
          system: document.documentElement.dataset.docsLook,
          scoped: frame.querySelector('[data-example-stage]').hasAttribute('data-tanrei-system'),
          rows: [...frame.querySelectorAll('[data-role-row]')].map((row) => ({
            part: row.querySelector('[data-role-part]').textContent.trim(),
            token: row.dataset.token,
            role: row.dataset.role,
            name: row.querySelector('[data-role-name]').textContent.trim(),
            value: row.dataset.value,
            drawn: row.dataset.drawn,
            drawnColor: row.dataset.drawnColor,
            matches: row.dataset.matches,
            contrast: row.dataset.contrast,
            derived: !row.querySelector('[data-role-derived]').hidden,
          })),
        };
      }, at)),
    });
  }
  return figures;
}

describe('the color role maps', () => {
  for (const scheme of ['light', 'dark']) {
    test(`${scheme}: every part found is drawn in its row's token, each token is the default system's, and a role is its value`, LIMIT, async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const findings = [];
      const notDrawn = [];
      for (const name of PAGES) {
        await page.goto(`${host.origin}/components/${name}/`);
        await page.waitForLoadState('load');
        const figures = await figuresOf(page);
        assert.ok(figures.length > 0, `${name}: a color role map`);
        for (const figure of figures) {
          assert.ok(figure.drawn, `${name} ${figure.title}: drawn`);
          assert.ok(figure.rows.some((row) => row.drawn === 'true'), `${name} ${figure.title}: a part is found`);
          for (const row of figure.rows) {
            const where = `${name} ${figure.title}: ${row.part} (${row.token})`;
            const value = resolvedIn(NS, row.token, scheme);
            assert.ok(value, `${where}: resolved on disk`);
            assert.ok(near(row.value, hexOf(value)), `${where}: the swatch is ${row.value}, the default system resolves the token to ${hexOf(value)}`);
            if (row.role && !row.derived) {
              const role = resolvedIn(NS, row.role, scheme);
              assert.equal(row.name, row.role.split('.').slice(1).join('.'), `${where}: the row names its role`);
              assert.ok(role && near(hexOf(role), hexOf(value)), `${where}: the token is ${row.role} itself, which resolves to ${role && hexOf(role)}`);
            }
            if (row.drawn !== 'true') notDrawn.push({ key: `${name} ${figure.title}: ${row.part}`, where });
            else if (row.matches !== 'true') findings.push({ key: `${name} ${figure.title}: ${row.part}`, said: `${where}: drawn in ${row.drawnColor}, its token is ${row.value}` });
          }
          // A text on the container it stands in: the ratio is the token build's contrast of the two tokens.
          const container = figure.rows.find((row) => row.part === 'container' && row.drawn === 'true' && row.value.length === 7);
          for (const text of figure.rows.filter((row) => ['label', 'icon'].includes(row.part) && row.drawn === 'true' && row.matches === 'true' && row.contrast)) {
            if (!container) break;
            const expected = contrast(resolvedIn(NS, text.token, scheme), resolvedIn(NS, container.token, scheme));
            assert.ok(Math.abs(Number(text.contrast) - expected) < 0.02, `${name} ${figure.title}: ${text.part} on its container is ${text.contrast}:1, the token build measures ${expected.toFixed(2)}:1`);
          }
        }
      }
      await context.close();
      if (notDrawn.length) console.log(`Rows whose part the figure's fixture does not draw (${notDrawn.length}):\n  ${notDrawn.map(({ where }) => where).join('\n  ')}`);
      if (findings.length) console.log(`Parts drawn in another color than their token (${findings.length}):\n  ${findings.map(({ said, key }) => `${said}${KNOWN[key] ? ` — known: ${KNOWN[key]}` : ''}`).join('\n  ')}`);
      assert.deepEqual(errors, [], 'the pages throw nothing');
      assert.deepEqual(
        findings.map(({ key }) => key).sort(),
        Object.keys(KNOWN).sort(),
        'every part found is drawn in its token, but for the known ones (a new one is a binding to look at; one that left the list leaves KNOWN)',
      );
      assert.deepEqual(
        [...new Set(notDrawn.map(({ key }) => key))].sort(),
        Object.keys(KNOWN_NOT_DRAWN).sort(),
        'every row is drawn but for the known ones (a row that stops being drawn has lost its part, and its text its contrast; one that comes to be drawn leaves KNOWN_NOT_DRAWN)',
      );
    });
  }

  test('under a preset chosen in the header, the rows name that system’s roles and draw its values', LIMIT, async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${host.origin}/components/button/`);
    await page.waitForLoadState('load');
    await figuresOf(page);
    const presets = await page.locator('tanrei-popover[anchor="docs-appearance"] tanrei-list-item').evaluateAll((all) => all.map((item) => item.getAttribute('value')).slice(1));
    const token = `${NS}.comp.button.text.label.color`;
    const preset = presets.find((id) => resolvedIn(id, token) && hexOf(resolvedIn(id, token)) !== hexOf(resolvedIn(NS, token)));
    assert.ok(preset, 'a preset draws the text button’s label in another color than the default system');
    await page.goto(`${host.origin}/components/button/?look=${preset}`);
    await page.waitForLoadState('load');
    const figures = await figuresOf(page);
    await context.close();
    for (const figure of figures) {
      assert.deepEqual([figure.system, figure.scoped], [preset, false], `${figure.title}: drawn in ${preset}, the page’s look, with no system of its own`);
      for (const row of figure.rows) {
        const value = resolvedIn(preset, row.token);
        if (!value) continue;
        assert.ok(near(row.value, hexOf(value)), `${preset} ${figure.title}: ${row.part} is ${row.value}, ${preset} resolves ${row.token} to ${hexOf(value)}`);
        if (row.drawn === 'true') assert.equal(row.matches, 'true', `${preset} ${figure.title}: ${row.part} is drawn in ${row.drawnColor}, its token is ${row.value}`);
      }
    }
    const text = figures.find((figure) => figure.title === 'text');
    const label = text.rows.find((row) => row.part === 'label');
    const defaultLabel = resolvedIn(NS, token);
    assert.ok(label.role && label.name === label.role.split('.').slice(1).join('.'), `the text button’s label names the role ${preset} writes (${label.role})`);
    assert.ok(near(label.value, hexOf(resolvedIn(preset, token))) && !near(label.value, hexOf(defaultLabel)), `the text button’s label is ${preset}’s value`);
  });

  test('focusing a row outlines its part and draws its leader heavier; the table reads as parts and roles', LIMIT, async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${host.origin}/components/button/`);
    await page.waitForLoadState('load');
    await figuresOf(page);
    const figure = page.locator(FIGURE).first();
    const header = figure.locator('[data-role-row] th').first();
    await header.focus();
    const facts = await figure.evaluate((frame) => {
      const overlay = frame.querySelector('[data-example-overlay]');
      const ring = overlay.querySelector('.highlight[data-active]');
      const leader = overlay.querySelector('.leader[data-active]');
      const origin = overlay.getBoundingClientRect();
      const element = frame.querySelector('[data-color-roles] tanrei-button');
      const part = element.shadowRoot.querySelector('[part~="container"]').getBoundingClientRect();
      const box = ring?.getBBox();
      return {
        focused: document.activeElement?.closest('[data-role-row]')?.dataset.roleRow,
        ring: ring ? { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height, shown: getComputedStyle(ring).display !== 'none', dashed: getComputedStyle(ring).strokeDasharray !== 'none' } : null,
        part: { left: part.left - origin.left, top: part.top - origin.top, right: part.right - origin.left, bottom: part.bottom - origin.top },
        leader: leader ? { width: parseFloat(getComputedStyle(leader).strokeWidth), rest: parseFloat(getComputedStyle(overlay.querySelector('.leader:not([data-active])')).strokeWidth) } : null,
        room: { width: origin.width, height: origin.height },
      };
    });
    const snapshot = await figure.locator('[data-color-roles-table]').ariaSnapshot();
    await context.close();
    assert.equal(facts.focused, '0', 'the first row’s header takes the focus');
    assert.ok(facts.ring?.shown && facts.ring.dashed, 'its part is outlined with a dashed ring');
    assert.ok(facts.ring.left <= facts.part.left && facts.ring.top <= facts.part.top && facts.ring.right >= facts.part.right && facts.ring.bottom >= facts.part.bottom, 'the ring is around the part');
    assert.ok(facts.ring.left >= 0 && facts.ring.top >= 0 && facts.ring.right <= facts.room.width && facts.ring.bottom <= facts.room.height, 'the ring is inside the figure');
    assert.ok(facts.leader && facts.leader.width > facts.leader.rest, 'its leader is drawn heavier than the others');
    assert.match(snapshot, /rowheader "container fill"/);
    assert.match(snapshot, /cell "sys\.color\.primary"/);
  });

  test('a translated page writes the heading in its language', LIMIT, async () => {
    const html = fs.readFileSync(path.join(dist, 'ja/components/button/index.html'), 'utf8');
    assert.match(html, /<h3[^>]*>色のロール<\/h3>/);
    assert.equal((html.match(/data-color-roles-figure/g) ?? []).length, 6, 'the Japanese page places the English page’s six figures');
  });
});
