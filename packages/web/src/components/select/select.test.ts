// <tanrei-select>, driven by specs/select.spec.json: every behaviour id is cited by a test title, every fixture has a
// baseline, and every length and color is read back from the tokens — never from a number written here.
//
// The select is the bare control: the tests of the sentences the Field holds — the
// label above, the label glyph, the requirement tag, the help, an announced error (FLD-2 to FLD-9, FLD-11 to FLD-13) —
// are the Field's, and the twins hold that a select field is the pair. What a sentence says of "the Field that frames
// it" is tested with a Field around the select (`frame()`).
// SEL-71: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { appearProbe, bezierOf, expectAppearStart, expectExitEnd, resolveEasing } from '../../../test/appear.js';
import { expectNoFlicker, sampleFrames } from '../../../test/frames.js';
import { motionEnded } from '../../../test/motions.js';
import { holdClock, releaseClock } from '../../../test/page-clock.js';
import { expectPressShownAndHeld, watchPress } from '../../../test/watched-press.js';
import { type Fixture, type FixtureItem, acmeSystemCss, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo, withoutIconFont, inputBoxCopies, inputBoxOwn, inputBoxSetApart, inputBoxToken, rootTokens, mountFixtureAsInAll } from '../../../test/harness.js';

const spec = loadSpec('select');
type P = Page;
const TAG = 'tanrei-select';
const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
/** The select of a stage: the stage's own child, or the one a Field of the stage frames (`frame()`). */
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
/** A part of the select's own shadow root. */
const OWN: Record<string, string> = { '.container': '.field > .container' };
const part = (page: P, id: string, selector: string) => host(page, id).locator(OWN[selector] ?? selector);
/** The Field of a stage made by `frame()`, and a part of that Field's own shadow root — its rows, not a part of the select inside it. */
const field = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > tanrei-field`);
const fieldRow = (page: P, id: string, selector: string) => field(page, id).locator(selector);
const container = (page: P, id: string) => part(page, id, '.container');
const rows = (page: P, id: string) => part(page, id, '.scroll .row');
const row = (page: P, id: string, label: string) => part(page, id, '.scroll .row').filter({ has: page.locator('.option-label', { hasText: new RegExp(`^${label}$`) }) });
// The trigger is drawn from the one set of tokens every input box is drawn from (SEL-65); the list from the select's own.
const T = inputBoxToken('select');
/** The select's own family, for the names the rows of its list keep beside the box (motion.state-*, <state>.opacity). */
const ROW = inputBoxOwn('select');
const token = (page: P, name: string) => resolveToken(page, T(name));
const duration = (page: P, name: string) => resolveToken(page, T(name), 'duration');
const color = (page: P, name: string) => resolveColor(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const px = async (locator: Locator, property: string) => Number.parseFloat(await css(locator, property));
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const override = (page: P, vars: Record<string, string>) => rootTokens(page, vars);
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const frames = (page: P, count = 3) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);
const option = (label: string, value: string, extra: FixtureItem['props'] = {}): FixtureItem => ({ kind: 'option', props: { label, value, ...extra } });
const group = (title: string, items: FixtureItem[]): FixtureItem => ({ kind: 'option-group', props: title ? { title } : {}, items });
const COUNTRIES = [option('Canada', 'ca'), option('France', 'fr'), option('Japan', 'jp'), option('Kenya', 'ke'), option('New Zealand', 'nz')];
const MANY = Array.from({ length: 24 }, (_, i) => option(`Option ${i + 1}`, `o${i + 1}`));
/** A fixture of the test's own: props, then its options (the five countries unless given), or markup of the product's. */
const fx = (id: string, props: Fixture['props'], inside: FixtureItem[] | string = COUNTRIES, extra: Partial<Fixture> = {}): Fixture => ({
  id,
  props: { label: 'Country', ...props },
  ...(typeof inside === 'string' ? { content: inside } : { items: inside }),
  ...extra,
});
const COUNTRY_OPTIONS = '<tanrei-option value="ca">Canada</tanrei-option><tanrei-option value="fr">France</tanrei-option><tanrei-option value="jp">Japan</tanrei-option><tanrei-option value="ke">Kenya</tanrei-option><tanrei-option value="nz">New Zealand</tanrei-option>';
/**
 * A select inside a Field, as a stage of its own added to the mounted page: what a sentence says of "the Field that
 * frames it". The Field is as wide as the fixtures' stage; `fieldProps` and `props` are set as properties, and the
 * select holds `inside` (the five countries unless given). The words are this file's own: a test is the product there
 * and gives the Field its words itself (FLD-24).
 */
async function frame(page: P, id: string, fieldProps: Record<string, unknown>, props: Record<string, unknown> = {}, inside = COUNTRY_OPTIONS, direction?: 'rtl') {
  await page.evaluate(
    async ([stageId, given, own, children, dir]) => {
      const stage = Object.assign(document.createElement('div'), { className: 'stage' });
      stage.dataset.fixture = stageId as string;
      if (dir) stage.dir = dir as string;
      const framing = Object.assign(document.createElement('tanrei-field'), { requiredText: 'Required', optionalText: 'Optional', ...(given as object) }) as HTMLElement & { updateComplete: Promise<unknown> };
      framing.style.inlineSize = '280px';
      const framed = Object.assign(document.createElement('tanrei-select'), own) as HTMLElement & { updateComplete: Promise<unknown> };
      framed.innerHTML = children as string;
      framing.append(framed);
      stage.append(framing);
      document.querySelector('main')!.append(stage);
      for (let round = 0; round < 3; round++) await Promise.all([framing.updateComplete, framed.updateComplete]);
    },
    [id, fieldProps, props, inside, direction ?? ''] as const,
  );
}
/** Sets properties on the Field of a `frame()` stage, and waits for the Field and its select. */
const setField = (page: P, id: string, props: Record<string, unknown>) =>
  field(page, id).evaluate(async (el, p) => {
    Object.assign(el, p);
    const select = el.querySelector('tanrei-select') as HTMLElement & { updateComplete: Promise<unknown> };
    for (let round = 0; round < 3; round++) await Promise.all([(el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete, select.updateComplete]);
  }, props);
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const mountSpec = (page: P, ids: string[], options: Parameters<typeof mountFixtures>[2] = {}) => mount(page, spec.fixtures.filter((f) => ids.includes(f.id)), options);
const set = async (page: P, id: string, props: Record<string, unknown>) => {
  await host(page, id).evaluate(async (el, p) => {
    Object.assign(el, p);
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
  }, props);
};
/** What the select is now, read from the element and from the element that carries its semantics. */
const read = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const select = el as HTMLElement & { value: string; open: boolean };
    const root = el.shadowRoot!;
    const trigger = root.querySelector<HTMLElement>('.container')!;
    const active = trigger.getAttribute('aria-activedescendant');
    const surface = root.querySelector<HTMLElement>('.surface')!;
    return {
      value: select.value,
      open: select.open,
      expanded: trigger.getAttribute('aria-expanded'),
      shown: surface.matches(':popover-open') || surface.classList.contains('inline'),
      active: active ? (root.getElementById(active)?.querySelector('.option-label')?.textContent ?? null) : null,
      ring: [...root.querySelectorAll('.row.kf')].map((r) => r.querySelector('.option-label')!.textContent),
      selected: [...root.querySelectorAll('.row[aria-selected="true"]')].map((r) => r.querySelector('.option-label')!.textContent),
      shownValue: root.querySelector('.value')?.textContent ?? null,
      focused: root.activeElement === trigger,
    };
  });
/** Records `change` and `toggle` on the select, in order, with what the element holds when each is heard. */
const listen = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const w = window as unknown as { __events: string[] };
    w.__events = [];
    const select = el as HTMLElement & { value: string; open: boolean };
    el.addEventListener('change', (event) => w.__events.push(`change ${select.value}${event.bubbles && event.composed ? '' : ' (not composed)'}`));
    el.addEventListener('toggle', (event) => {
      const detail = (event as CustomEvent<{ open: boolean; reason?: string }>).detail;
      w.__events.push(`toggle ${detail.open}${detail.reason ? ` ${detail.reason}` : ''}${select.open === detail.open ? '' : ' (open not set)'}`);
    });
  });
const heard = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));
/** A press of the pointer at the centre of `target`, whatever it says of itself (a disabled option is still pressed). */
const pressOn = async (target: Locator) => {
  // Where it is once it has stopped moving: a list grows in, and a press aimed at a row of half its size lands beside it.
  await (await target.elementHandle())!.waitForElementState('stable');
  const b = (await target.boundingBox())!;
  await target.page().mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};
const focusSelect = (page: P, id: string) => host(page, id).evaluate((el) => (el as HTMLElement).focus());
const shownList = (page: P, id: string) => expect.poll(async () => (await read(page, id)).shown);
/** The list has come to rest: until its entrance ends it is still growing toward the container's edge (SEL-30). */
const arrived = (page: P, id: string) => motionEnded(part(page, id, '.motion'));
const closedList = async (page: P, id: string) => {
  await expect.poll(async () => (await read(page, id)).open).toBe(false);
  await expect.poll(() => part(page, id, '.surface').evaluate((el) => el.matches(':popover-open'))).toBe(false);
};
/** The list has grown in: a list closed from here fades out with its rows in it (a list closed as it opens has nothing to fade, and is gone at once). */
const grownIn = (page: P, id: string) => part(page, id, '.motion').evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
/** The Chromium accessibility nodes of a role, over the DevTools protocol: what the browser computed. */
async function axNodes(page: P, role: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  return nodes
    .filter((node) => !node.ignored && node.role?.value === role)
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value;
      const related = (name: string) => (property(name)?.relatedNodes ?? []).map((r: { text?: string; idref?: string }) => r.text ?? r.idref ?? '');
      return {
        name: (node.name?.value ?? '') as string,
        description: (node.description?.value ?? '') as string,
        value: (node.value?.value ?? '') as string,
        expanded: property('expanded')?.value as boolean | undefined,
        invalid: property('invalid')?.value as string | undefined,
        required: property('required')?.value as boolean | undefined,
        disabled: property('disabled')?.value as boolean | undefined,
        readonly: property('readonly')?.value as boolean | undefined,
        selected: property('selected')?.value as boolean | undefined,
        haspopup: property('hasPopup')?.value as string | undefined,
        active: related('activedescendant'),
        controls: related('controls'),
        children: (node.childIds ?? []).map((id) => byId.get(id)).filter((child) => child && !child.ignored).map((child) => child!.role?.value as string),
      };
    });
}
/** Every custom property a stylesheet declares for a component, by name. */
const declared = (sheet: string, component: string) => [...new Set([...sheet.matchAll(new RegExp(`--tanrei-comp-${component}-[a-z0-9-]+(?=:)`, 'g'))].map((m) => m[0]))];
/** The computed value of each custom property, with every reference resolved, as the page's root has it now. */
const computed = (page: P, names: string[]) =>
  page.evaluate((list) => {
    const probe = document.createElement('div');
    document.body.append(probe);
    const out: Record<string, string> = {};
    for (const name of list) {
      probe.style.setProperty('--probe', `var(${name})`);
      out[name] = getComputedStyle(probe).getPropertyValue('--probe').trim();
    }
    probe.remove();
    return out;
  }, names);
const SYSTEMS = [undefined, 'm3-like', 'm3-expressive-like', 'cupertino'] as const;
const THEMES = ['light', 'dark'] as const;

test.describe('behavior: the trigger', () => {
  test('SEL-1: the container is at least container.height of its size tall, its corners container.shape (a filled one’s bottom corners shape-bottom), and holds one centred row — the value from padding-inline, the chevron padding-inline-with-icon from the end, the leading icon where there is one', async ({ page }) => {
    await mountSpec(page, ['stacked-value', 'stacked-large', 'stacked-small', 'stacked-option-icon', 'filled-value']);
    for (const [id, size] of [['stacked-value', 'medium'], ['stacked-large', 'large'], ['stacked-small', 'small']] as const) {
      const c = await box(container(page, id));
      near(c.height, await token(page, `stacked-container-height-${size}`), `${id} height`);
      const value = await box(part(page, id, '.value'));
      const chevron = await box(part(page, id, '.chevron'));
      near(value.x - c.x, await token(page, `container-padding-inline-${size}`), `${id} text padding`);
      near(c.x + c.width - (chevron.x + chevron.width), await token(page, `container-padding-inline-with-icon-${size}`), `${id} glyph padding`);
      near(chevron.width, await token(page, `icon-size-${size}`), `${id} chevron`);
      near(chevron.y + chevron.height / 2, c.y + c.height / 2, `${id} chevron centred`);
      near(value.y + value.height / 2, c.y + c.height / 2, `${id} value centred`);
      near(await px(container(page, id), 'border-top-left-radius'), await token(page, 'container-shape'), `${id} corner`);
      near(await px(container(page, id), 'border-bottom-right-radius'), await token(page, 'container-shape'), `${id} bottom corner`);
    }
    // The default system's numbers (the spec's verify): a stacked select 40 and 56, as tall as a Button of its size, with 16 and 12 and a 24 chevron; 32 with 12 and 8 and a 20 one.
    expect([await token(page, 'stacked-container-height-medium'), await token(page, 'stacked-container-height-large'), await token(page, 'stacked-container-height-small')]).toEqual([40, 56, 32]);
    expect([await token(page, 'container-padding-inline-medium'), await token(page, 'container-padding-inline-with-icon-medium'), await token(page, 'icon-size-medium')]).toEqual([16, 12, 24]);
    expect([await token(page, 'container-padding-inline-small'), await token(page, 'container-padding-inline-with-icon-small'), await token(page, 'icon-size-small')]).toEqual([12, 8, 20]);
    // With a leading icon: the glyph padding before it, the gap after it, then the value.
    const c = await box(container(page, 'stacked-option-icon'));
    const icon = await box(part(page, 'stacked-option-icon', '.leading-own'));
    const value = await box(part(page, 'stacked-option-icon', '.value'));
    near(icon.x - c.x, await token(page, 'container-padding-inline-with-icon-medium'), 'glyph padding at the start');
    near(value.x - (icon.x + icon.width), await token(page, 'container-gap-medium'), 'the gap');
    // A filled select's bottom corners.
    near(await px(container(page, 'filled-value'), 'border-top-left-radius'), await token(page, 'container-shape'), 'filled top corner');
    near(await px(container(page, 'filled-value'), 'border-bottom-left-radius'), await token(page, 'container-shape-bottom'), 'filled bottom corner');
    expect(await container(page, 'filled-value').getAttribute('data-tanrei-shape')).not.toBeNull();
  });

  test('SEL-2, SEL-65: the select holds no token of the box under its own name — its own family is what it alone draws, in the default system and in each preset', async () => {
    const sheets = [fs.readFileSync(path.join(pkg, 'dist/tokens.css'), 'utf8'), ...SYSTEMS.filter((system): system is Exclude<(typeof SYSTEMS)[number], undefined> => system !== undefined).map((system) => fs.readFileSync(path.join(pkg, `dist/systems/${system}.css`), 'utf8'))];
    // No copy to hold equal: what the select reads of the box is the one set every input box is drawn from.
    expect(inputBoxCopies(sheets, 'select')).toEqual([]);
    // What stays under the select's name beside the list's and the options': the rows change state over, and are faded by, their own,
    // and the clear button stands its own gap from the chevron (SEL-72).
    const mine = declared(sheets[0]!, 'select').map((name) => name.replace('--tanrei-comp-select-', ''));
    expect(mine.filter((name) => !/^(list|option|group|divider|separation|status|motion-(feedback|open|close))|-(selected-)?option-/.test(name)).sort()).toEqual(['container-action-gap', 'disabled-opacity', 'focused-opacity', 'hovered-opacity', 'motion-state-duration', 'motion-state-easing', 'pressed-opacity']);
  });

  test('SEL-65: a custom property of the box set on one select changes that one alone; set on an ancestor, every select in it — and in every other input box there', async ({ page }) => {
    await mount(page, [fx('one', {})]);
    const { rest, one, both } = await inputBoxSetApart(page, 'tanrei-select');
    expect(rest[0], 'the box has corners to lose').toBeGreaterThan(0);
    expect(rest[1]).toBe(rest[0]);
    expect(one, 'the one it is set on, and not its neighbour').toEqual([0, rest[1]]);
    expect(both, 'both, from their parent').toEqual([0, 0]);
    // The other four read the same property: a text input beside the select follows the ancestor too.
    const others = await page.evaluate(() => {
      const parent = document.createElement('div');
      parent.style.setProperty('--tanrei-comp-input-box-container-shape', '0px');
      const tags = ['tanrei-text-input', 'tanrei-combobox', 'tanrei-number-input', 'tanrei-color-input'];
      const elements = tags.map((tag) => parent.appendChild(document.createElement(tag)));
      document.body.append(parent);
      return Promise.all(elements.map(async (element) => {
        await (element as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
        return parseFloat(getComputedStyle(element.shadowRoot!.querySelector('.container')!).borderTopLeftRadius);
      })).finally(() => parent.remove());
    });
    expect(others).toEqual([0, 0, 0, 0]);
  });

  test('SEL-2: a select field and a text field of the same variant, size, label and supporting text in one row share the tops and bottoms of their labels, containers, value lines and supporting rows, and their start edges', async ({ page }) => {
    for (const [system, variant, size] of [[undefined, 'stacked', 'small'], [undefined, 'stacked', 'medium'], [undefined, 'stacked', 'large'], ['m3-like', 'filled', 'small'], ['m3-like', 'filled', 'medium'], ['m3-like', 'outlined', 'large']] as const) {
      await mount(page, [fx('pair', {})], { system });
      await page.evaluate(
        async ([v, s, options]) => {
          const stage = document.querySelector<HTMLElement>('[data-fixture="pair"]')!;
          stage.replaceChildren();
          stage.style.cssText = 'display: flex; gap: 16px; align-items: flex-start; inline-size: 600px';
          const select = document.createElement('tanrei-select-field');
          Object.assign(select, { variant: v, size: s, label: 'Country', value: 'jp', supportingText: 'Where your invoices are addressed.' });
          select.innerHTML = options;
          const text = document.createElement('tanrei-text-field');
          Object.assign(text, { variant: v, size: s, label: 'Country', value: 'Japan', supportingText: 'Where your invoices are addressed.' });
          for (const each of [select, text]) {
            each.style.inlineSize = '280px';
            stage.append(each);
          }
          for (let round = 0; round < 3; round++) await Promise.all([select, text].map((each) => (each as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete));
        },
        [variant, size, COUNTRY_OPTIONS] as const,
      );
      const [select, text] = [page.locator('[data-fixture="pair"] > tanrei-select-field'), page.locator('[data-fixture="pair"] > tanrei-text-field')];
      await expect(text.locator('.container')).toBeVisible();
      await expect(select.locator('.value')).toHaveText('Japan');
      await frames(page);
      const where = `${system ?? 'tanrei'} ${variant} ${size}`;
      const pairs: [string, Locator, Locator][] = [
        ['container', select.locator('.field > .container'), text.locator('.container')],
        ['supporting row', select.locator('.supporting-text'), text.locator('.supporting-text')],
        ['label', variant === 'stacked' ? select.locator('.label-row > .label') : select.locator('.floating'), variant === 'stacked' ? text.locator('.label-row > .label') : text.locator('label.label')],
      ];
      for (const [name, mine, theirs] of pairs) {
        const [a, b] = [await box(mine), await box(theirs)];
        near(a.y, b.y, `${where}: ${name} top`);
        near(a.y + a.height, b.y + b.height, `${where}: ${name} bottom`);
        near(a.x - (await box(select)).x, b.x - (await box(text)).x, `${where}: ${name} start edge`);
      }
      // The value's line and the input's: the same text style, the same start edge and the same middle.
      const [value, input] = [select.locator('.value'), text.locator('.input')];
      for (const property of ['font-size', 'font-family', 'font-weight', 'letter-spacing', 'color']) expect(await css(value, property), `${where}: ${property}`).toBe(await css(input, property));
      const [a, b] = [await box(value), await box(input)];
      near(a.x - (await box(select)).x, b.x - (await box(text)).x, `${where}: value start edge`);
      near(a.y + a.height / 2, b.y + b.height / 2, `${where}: value line`);
      near((await box(select)).height, (await box(text)).height, `${where}: the whole field`);
    }
  });

  test('SEL-7: a floating label draws the asterisk the Field that frames it gives — for a tag or an asterisk named there, by the Field or by the design system — after its text, requirement.asterisk-gap from it, in the label’s style and the required-asterisk color of its variant, hidden from assistive technology; no mark where the Field names none, where the label is not drawn or where no Field frames it; never a tag, never an optional label', async ({ page }) => {
    await mount(page, [fx('bare', { variant: 'outlined' }), fx('bare-attribute', { variant: 'outlined' }, '<tanrei-option value="jp">Japan</tanrei-option>')], { system: 'm3-like' });
    for (const mark of ['auto', 'tag', 'asterisk', 'none'] as const) await frame(page, mark, { label: 'Country', required: true, requiredMark: mark }, { variant: 'outlined' });
    await frame(page, 'filled', { label: 'Country', required: true, requiredMark: 'tag' }, { variant: 'filled' });
    await frame(page, 'hidden', { label: 'Country', labelHidden: true, required: true, requiredMark: 'asterisk' }, { variant: 'outlined' });
    await frame(page, 'optional', { label: 'Country', required: false, optional: true }, { variant: 'filled' });
    await frame(page, 'error', { label: 'Country', required: true, requiredMark: 'asterisk', error: true }, { variant: 'outlined' });
    await frame(page, 'stacked', { label: 'Country', required: true, requiredMark: 'asterisk' }, {});
    const asterisks = (id: string) => part(page, id, '.floating .asterisk').count();
    // A tag named by the Field reaches a floating label as the asterisk; the asterisk is the asterisk.
    for (const id of ['tag', 'asterisk', 'filled']) expect(await asterisks(id), id).toBe(1);
    expect(await part(page, 'tag', '.floating').textContent()).toBe('Country*');
    const asterisk = part(page, 'asterisk', '.floating .asterisk');
    expect(await asterisk.evaluate((el) => [el.textContent, el.getAttribute('aria-hidden'), el.getAttribute('part')])).toEqual(['*', 'true', 'requirement-label']);
    expect(await css(asterisk, 'color')).toBe(await color(page, 'outlined-required-asterisk-color'));
    expect(await css(part(page, 'error', '.floating .asterisk'), 'color')).toBe(await color(page, 'outlined-error-required-asterisk-color'));
    expect(await css(asterisk, 'font-size')).toBe(await css(part(page, 'asterisk', '.floating'), 'font-size'));
    near(await px(asterisk, 'margin-left'), await token(page, 'requirement-asterisk-gap'), 'asterisk-gap');
    // None: no mark, and the required state kept. A label that is not drawn has none either.
    expect([await asterisks('none'), await container(page, 'none').getAttribute('aria-required')]).toEqual([0, 'true']);
    expect([await part(page, 'hidden', '.floating').count(), await container(page, 'hidden').getAttribute('aria-required')]).toEqual([0, 'true']);
    // The select draws no tag and no optional label of its own, in any look; the optional text is in its description.
    for (const id of ['tag', 'optional', 'stacked']) await expect(part(page, id, 'tanrei-tag, .requirement-tag, .chip'), id).toHaveCount(0);
    expect(await asterisks('optional')).toBe(0);
    expect(await part(page, 'optional', '#description').textContent()).toBe('Optional');
    // A stacked select draws no label, so no asterisk: the mark above it is the Field's.
    expect([await part(page, 'stacked', '.floating').count(), await fieldRow(page, 'stacked', '.label-row .asterisk').count()]).toEqual([0, 1]);
    // No Field: no mark, whatever is written on the select.
    await host(page, 'bare-attribute').evaluate((el) => el.setAttribute('required', ''));
    await set(page, 'bare-attribute', { placeholder: 'x' });
    for (const id of ['bare', 'bare-attribute']) expect([await asterisks(id), await container(page, id).getAttribute('aria-required')], id).toEqual([0, null]);
    // Under auto the Field gives what the design system names: m3-like names the asterisk…
    expect((await css(page.locator('html'), '--tanrei-comp-field-requirement-mark')).trim()).toBe('asterisk');
    expect(await asterisks('auto')).toBe(1);
    // …a system that names the tag gives a floating label the asterisk too, and one that names none gives none.
    await override(page, { '--tanrei-comp-field-requirement-mark': 'tag' });
    await setField(page, 'auto', { supportingText: 'x' });
    expect(await asterisks('auto')).toBe(1);
    await override(page, { '--tanrei-comp-field-requirement-mark': 'none' });
    await setField(page, 'auto', { supportingText: 'y' });
    expect([await asterisks('auto'), await container(page, 'auto').getAttribute('aria-required')]).toEqual([0, 'true']);
    expect(await asterisks('asterisk'), 'a Field that says keeps its own').toBe(1);
    // The Field's token follows the system's one choice (sys.behavior.requirement-mark): set for the page instead, it
    // is followed the same.
    await rootTokens(page, { '--tanrei-comp-field-requirement-mark': '' });
    await override(page, { '--tanrei-sys-behavior-requirement-mark': 'none' });
    await setField(page, 'auto', { supportingText: 'z' });
    expect([await asterisks('auto'), await container(page, 'auto').getAttribute('aria-required')]).toEqual([0, 'true']);
    await override(page, { '--tanrei-sys-behavior-requirement-mark': 'tag' });
    await setField(page, 'auto', { supportingText: 'w' });
    expect(await asterisks('auto'), 'the system’s tag reaches a floating label as the asterisk').toBe(1);
  });

  test('SEL-9: in error — its own, or its Field’s — the select is exposed as invalid and draws every part of its trigger from the error parts of its variant — a stacked one a line inside its edge at rest — while its list and options stay as they are; it shows no error text of its own and never sets error itself', async ({ page }) => {
    await mountSpec(page, ['stacked-error', 'stacked-error-value', 'stacked-value', 'filled-error']);
    await frame(page, 'framed', { label: 'Country', error: true, errorText: 'We cannot ship there yet.' }, { value: 'jp' });
    await frame(page, 'required', { label: 'Country', required: true }, {});
    for (const id of ['stacked-error-value', 'framed']) {
      expect(await container(page, id).getAttribute('aria-invalid'), id).toBe('true');
      const edge = part(page, id, '.edge');
      expect(await css(edge, 'border-top-color'), id).toBe(await color(page, 'stacked-error-outline-color'));
      near(await px(edge, 'border-top-width'), await token(page, 'outline-width'), `${id}: outline.width`);
      expect(await css(container(page, id), 'background-color'), id).toBe(await color(page, 'stacked-error-container-color'));
      expect(await css(part(page, id, '.value'), 'color'), id).toBe(await color(page, 'stacked-error-input-color'));
      expect(await css(part(page, id, '.chevron'), 'color'), id).toBe(await color(page, 'stacked-error-trailing-icon-color'));
      // No words of its own: the select's shadow root holds no row, and the Field's words are its description alone.
      await expect(part(page, id, '.supporting-text, .label-row, .announcer'), id).toHaveCount(0);
    }
    expect(await container(page, 'stacked-value').getAttribute('aria-invalid')).toBeNull();
    expect(await part(page, 'framed', '#description').textContent()).toBe('We cannot ship there yet.');
    await expect(fieldRow(page, 'framed', '.error-text')).toHaveText('We cannot ship there yet.');
    expect(await host(page, 'framed').evaluate((el) => (el as HTMLElement & { error: boolean }).error), 'the Field’s error is not copied to the select’s own').toBe(false);
    // A floating label is drawn from the error part of its variant.
    expect(await css(part(page, 'filled-error', '.floating'), 'color')).toBe(await color(page, 'filled-error-label-color'));
    // The edge takes no layout space: the container is as tall in error as at rest.
    const id = 'stacked-error-value';
    near((await box(container(page, id))).height, (await box(container(page, 'stacked-value'))).height, 'the container’s height');
    // The list is the same list.
    await set(page, id, { open: true });
    await set(page, 'stacked-value', { open: true });
    for (const property of ['background-color', 'box-shadow']) expect(await css(part(page, id, '.list'), property)).toBe(await css(part(page, 'stacked-value', '.list'), property));
    expect(await css(row(page, id, 'Canada').locator('.option-label'), 'color')).toBe(await css(row(page, 'stacked-value', 'Canada').locator('.option-label'), 'color'));
    // Never by itself: a required select left empty, opened and closed, is not in error.
    await set(page, id, { open: false });
    await set(page, 'stacked-value', { open: false });
    await container(page, 'required').click();
    await page.keyboard.press('Escape');
    expect(await host(page, 'required').evaluate((el) => (el as HTMLElement & { error: boolean }).error)).toBe(false);
    expect(await container(page, 'required').getAttribute('aria-invalid')).toBeNull();
  });

  test('SEL-11: a bare select is named by its label; in a Field it takes the Field’s label as its name — drawn or hidden — and its own label where it has one, the Field’s shown text as its description and the Field’s required state, reporting a missing value to the form while value is empty; the placeholder is never the name; it has no requirement of its own; a select with no name, and an option without one, still render and are reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('bare', { placeholder: 'Choose a country' }),
      fx('own-requirement', { placeholder: 'Choose a country' }),
      fx('nameless', { label: '', value: 'x' }, [option('', 'x'), option('Other', 'y')]),
    ]);
    await frame(page, 'framed', { label: 'Shipping country', supportingText: 'Where your order goes.' }, { placeholder: 'Choose a country' });
    await frame(page, 'hidden', { label: 'Shipping country', labelHidden: true, required: true }, { name: 'country', placeholder: 'Choose a country' });
    await frame(page, 'own', { label: '' }, { label: 'Its own' });
    await frame(page, 'both', { label: '', supportingText: 'Help.' }, { label: 'Its own' });
    const name = (id: string) => container(page, id).getAttribute('aria-label');
    const listName = (id: string) => part(page, id, '#list').evaluate((el) => (el.getRootNode() as ShadowRoot).getElementById(el.getAttribute('aria-labelledby')!)!.textContent);
    expect([await name('bare'), await listName('bare')]).toEqual(['Country', 'Country']);
    expect([await name('framed'), await listName('framed')]).toEqual(['Shipping country', 'Shipping country']);
    expect([await name('hidden'), await listName('hidden')], 'whether or not any label is drawn').toEqual(['Shipping country', 'Shipping country']);
    expect(await name('own')).toBe('Its own');
    expect(await name('both')).toBe('Its own');
    expect(await part(page, 'bare', '.placeholder').getAttribute('aria-hidden')).toBe('true');
    // The description is what the Field gives, as a value of the select's own tree.
    const description = (id: string) => container(page, id).evaluate((el) => (el.getAttribute('aria-describedby') ? (el.getRootNode() as ShadowRoot).getElementById(el.getAttribute('aria-describedby')!)!.textContent : null));
    expect(await description('framed')).toBe('Where your order goes.');
    expect(await description('bare')).toBeNull();
    await setField(page, 'framed', { error: true, errorText: 'We cannot ship there yet.' });
    expect(await description('framed'), 'the error text in the help’s place (FLD-11)').toBe('We cannot ship there yet.');
    // Required is the Field's to say: exposed whichever mark is drawn and where none is, and a missing value reported.
    const validity = (id: string) => host(page, id).evaluate((el) => ({ missing: (el as unknown as HTMLSelectElement).validity.valueMissing, valid: (el as unknown as HTMLSelectElement).checkValidity(), message: (el as unknown as HTMLSelectElement).validationMessage !== '' }));
    expect(await container(page, 'hidden').getAttribute('aria-required')).toBe('true');
    expect(await validity('hidden')).toEqual({ missing: true, valid: false, message: true });
    expect(await validity('framed')).toEqual({ missing: false, valid: true, message: false });
    await set(page, 'hidden', { value: 'jp' });
    expect(await validity('hidden')).toEqual({ missing: false, valid: true, message: false });
    await setField(page, 'hidden', { required: false, optional: false });
    await set(page, 'hidden', { value: '' });
    expect([await container(page, 'hidden').getAttribute('aria-required'), await validity('hidden')]).toEqual([null, { missing: false, valid: true, message: false }]);
    // No requirement of its own: the attribute that left does nothing, and the select does not validate because of it.
    await host(page, 'own-requirement').evaluate((el) => el.setAttribute('required', ''));
    await set(page, 'own-requirement', { placeholder: 'Choose' });
    expect([await container(page, 'own-requirement').getAttribute('aria-required'), await validity('own-requirement')]).toEqual([null, { missing: false, valid: true, message: false }]);
    await expect(container(page, 'nameless')).toBeVisible();
    await expect.poll(() => seen.filter((w) => w.includes('SEL-11')).length).toBeGreaterThanOrEqual(2);
    expect(seen.some((w) => w.includes('SEL-11') && w.includes('label is empty'))).toBe(true);
    expect(seen.some((w) => w.includes('an option has an empty label'))).toBe(true);
    expect(seen.filter((w) => w.includes('SEL-11') && w.includes('label is empty')), 'a select its Field names is not reported').toHaveLength(1);
  });

  test('SEL-13: the select adds one stop to the focus order, its container; a press on the label row of the Field that frames it moves focus to the container and opens nothing; a label that floats in the container is part of it, and a press on it opens the list', async ({ page }) => {
    await mount(page, [fx('one', { value: 'jp' }), fx('two', { value: 'fr' }), fx('floating', { variant: 'outlined' })], { system: 'm3-like' });
    await frame(page, 'framed', { label: 'Country', required: true, requiredMark: 'tag', supportingText: 'Help.' }, { value: 'jp' });
    // One stop: Tab from the first select's container reaches the second's, and back.
    await focusSelect(page, 'one');
    await tab(page);
    expect((await read(page, 'two')).focused).toBe(true);
    await tab(page, { back: true });
    expect((await read(page, 'one')).focused).toBe(true);
    // The Field's label row: focus, and nothing else (FLD-12).
    await listen(page, 'framed');
    for (const selector of ['.label-row > .label', '.requirement-tag']) {
      await page.mouse.click(700, 500);
      expect((await read(page, 'framed')).focused).toBe(false);
      await fieldRow(page, 'framed', selector).click();
      expect(await read(page, 'framed'), selector).toMatchObject({ focused: true, open: false, value: 'jp' });
    }
    expect(await container(page, 'framed').getAttribute('data-pressed')).toBeNull();
    await page.mouse.click(700, 500);
    await fieldRow(page, 'framed', '.supporting-text').click();
    expect(await read(page, 'framed')).toMatchObject({ focused: false, open: false });
    expect(await heard(page)).toEqual([]);
    // A floating label is part of the container: a press on it is a press on the container.
    const label = await box(part(page, 'floating', '.floating'));
    await page.mouse.click(label.x + label.width / 2, label.y + label.height / 2);
    await shownList(page, 'floating').toBe(true);
    expect((await read(page, 'floating')).focused).toBe(true);
  });

  test('SEL-15: a filled or outlined label rests in the value’s line in label.typescale while nothing is chosen and the select is neither focused nor open, and floats otherwise — to the top of a filled container, onto an outlined one’s top edge with its gap — in label.floated-typescale, over motion.label-*; the select does not change height, and a label that does not fit wraps and is never over the value', async ({ page }) => {
    await mountSpec(page, ['filled-empty', 'filled-value', 'outlined-empty', 'outlined-value', 'filled-small'], { system: 'm3-like', reducedMotion: true });
    for (const variant of ['filled', 'outlined'] as const) {
      const [empty, value] = [`${variant}-empty`, `${variant}-value`];
      const resting = part(page, empty, '.floating');
      const c = await box(container(page, empty));
      near(await px(resting, 'font-size'), await token(page, 'label-typescale-medium-font-size'), `${variant}: resting size`);
      near((await box(resting)).y + (await box(resting)).height / 2, c.y + c.height / 2, `${variant}: resting in the value’s line`);
      const floated = part(page, value, '.floating');
      near(await px(floated, 'font-size'), await token(page, 'label-floated-typescale-medium-font-size'), `${variant}: floated size`);
      const [f, fc, v] = [await box(floated), await box(container(page, value)), await box(part(page, value, '.value'))];
      expect(f.y + f.height, `${variant}: the floated label is above the value`).toBeLessThanOrEqual(v.y + 0.6);
      if (variant === 'filled') near(f.y - fc.y, await token(page, 'container-padding-block-with-label-medium'), 'filled: at the top of the container');
      else near(f.y + f.height / 2, fc.y + (await token(page, 'outline-width')) / 2, 'outlined: on the top edge', 1);
      near(c.height, fc.height, `${variant}: the same height resting and floated`);
      // Focus floats it, and the height stays.
      await focusSelect(page, empty);
      near(await px(resting, 'font-size'), await token(page, 'label-floated-typescale-medium-font-size'), `${variant}: focused floats`);
      near((await box(container(page, empty))).height, c.height, `${variant}: no change of height`);
      await container(page, empty).evaluate((el) => el.blur());
      near(await px(resting, 'font-size'), await token(page, 'label-typescale-medium-font-size'), `${variant}: rests again`);
      // Open floats it too.
      await set(page, empty, { open: true });
      near(await px(resting, 'font-size'), await token(page, 'label-floated-typescale-medium-font-size'), `${variant}: open floats`);
      await set(page, empty, { open: false });
    }
    // A filled select that draws its label is at least twice its label padding plus one line of each text style.
    const pad = await token(page, 'container-padding-block-with-label-small');
    const lines = (await token(page, 'label-floated-typescale-small-line-height')) * (await token(page, 'label-floated-typescale-small-font-size')) + (await token(page, 'input-typescale-small-line-height')) * (await token(page, 'input-typescale-small-font-size'));
    expect((await box(container(page, 'filled-small'))).height).toBeGreaterThanOrEqual(Math.max(await token(page, 'container-height-small'), 2 * pad + lines) - 0.6);
    // The outlined gap: the notch is open by the floated label's width and notch-padding on each side.
    const notch = await box(part(page, 'outlined-value', '.outline-notch'));
    near(notch.width, (await box(part(page, 'outlined-value', '.floating'))).width + 2 * (await token(page, 'outline-notch-padding')), 'the gap in the outline', 1.5);
    near((await box(part(page, 'outlined-empty', '.outline-notch'))).width, 0, 'no gap while the label rests');
    // The motion.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const moving = part(page, 'filled-empty', '.floating');
    expect((await css(moving, 'transition-duration')).split(',').map((d) => Math.round(Number.parseFloat(d) * 1000))[0]).toBe(Math.round(await duration(page, 'motion-label-duration')));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await px(moving, 'transition-duration')).toBe(0);
    // A label that does not fit wraps, in both positions, and stays clear of the value.
    await mount(page, [fx('long', { variant: 'filled', label: 'The country your invoices are addressed to', value: 'jp' }), fx('long-outlined', { variant: 'outlined', label: 'The country your invoices are addressed to' })], { system: 'm3-like', reducedMotion: true });
    for (const id of ['long', 'long-outlined']) await host(page, id).evaluate((el) => (el.style.inlineSize = '180px'));
    await frames(page, 4);
    for (const id of ['long', 'long-outlined']) {
      expect(await part(page, id, '.field').getAttribute('data-label-wraps'), id).not.toBeNull();
      expect(await part(page, id, '.floating').evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis'), `${id}: not cut`).toBe(true);
    }
    const [l, v] = [await box(part(page, 'long', '.floating')), await box(part(page, 'long', '.value'))];
    expect(l.y + l.height, 'the wrapped label ends above the value').toBeLessThanOrEqual(v.y + 0.6);
    // The label it floats is its accessible name: the label of the Field that frames it, or its own where none does —
    // in the label color of its variant. Hidden — by itself or by that Field — or without a name, it draws none; and a
    // stacked select draws no label at all.
    await mount(page, [fx('own', { variant: 'outlined' }), fx('own-hidden', { variant: 'outlined', labelHidden: true }), fx('nameless', { variant: 'filled', label: '' }), fx('stacked', { value: 'jp' }), fx('stacked-hidden', { labelHidden: true, value: 'jp' })], { system: 'm3-like', reducedMotion: true });
    await frame(page, 'framed', { label: 'Shipping country' }, { variant: 'outlined' });
    await frame(page, 'framed-hidden', { label: 'Shipping country', labelHidden: true }, { variant: 'filled' });
    await frame(page, 'framed-stacked', { label: 'Shipping country' }, { value: 'jp' });
    await expect(part(page, 'own', '.floating')).toHaveText('Country');
    await expect(part(page, 'framed', '.floating')).toHaveText('Shipping country');
    expect(await css(part(page, 'framed', '.floating'), 'color')).toBe(await color(page, 'outlined-label-color'));
    await expect(fieldRow(page, 'framed', '.label-row'), 'the Field draws no label row where its select draws the label').toHaveCount(0);
    for (const id of ['own-hidden', 'nameless', 'framed-hidden', 'stacked', 'stacked-hidden', 'framed-stacked']) await expect(part(page, id, '.floating, .label-row, .label'), id).toHaveCount(0);
    await expect(fieldRow(page, 'framed-hidden', '.label-row')).toHaveCount(0);
    await expect(fieldRow(page, 'framed-stacked', '.label-row > .label')).toHaveText('Shipping country');
    // A filled select whose label is not drawn keeps no room for one.
    near((await box(container(page, 'framed-hidden'))).height, await token(page, 'container-height-medium'), 'no band for a label that is not drawn');
    // The Field's label changes: the same text floats.
    await setField(page, 'framed', { label: 'Billing country' });
    await expect(part(page, 'framed', '.floating')).toHaveText('Billing country');
  });

  test('SEL-16: the container shows the chosen option’s label on one line in input.typescale and the input color, cut with an ellipsis where it does not fit with the icon, the chevron and the paddings kept whole; with nothing chosen it shows the placeholder in the placeholder color, only while the label is not in the line; never an option’s supporting text', async ({ page }) => {
    await mountSpec(page, ['long-value', 'stacked-value', 'stacked-placeholder', 'stacked-empty', 'open-supporting-text', 'filled-empty']);
    const value = part(page, 'stacked-value', '.value');
    near(await px(value, 'font-size'), await token(page, 'input-typescale-medium-font-size'), 'input.typescale');
    expect(await css(value, 'color')).toBe(await color(page, 'stacked-input-color'));
    const long = part(page, 'long-value', '.value');
    expect(await long.evaluate((el) => [getComputedStyle(el).whiteSpace, getComputedStyle(el).textOverflow, el.scrollWidth > el.clientWidth])).toEqual(['nowrap', 'ellipsis', true]);
    expect(await long.textContent(), 'the whole label is still there to be read').toBe('Send me every notification as it happens, including the ones about threads I only follow');
    const [c, v, chevron] = [await box(container(page, 'long-value')), await box(long), await box(part(page, 'long-value', '.chevron'))];
    near(c.width, 280, 'never wider than its layout');
    near(c.height, await token(page, 'stacked-container-height-medium'), 'one line');
    near(chevron.x - (v.x + v.width), await token(page, 'container-gap-medium'), 'the gap before the chevron is whole');
    near(c.x + c.width - (chevron.x + chevron.width), await token(page, 'container-padding-inline-with-icon-medium'), 'the end padding is whole');
    // The placeholder: same place and style, its own color; nothing where it is empty.
    const placeholder = part(page, 'stacked-placeholder', '.placeholder');
    await expect(placeholder).toHaveText('Choose a country');
    expect(await css(placeholder, 'color')).toBe(await color(page, 'stacked-placeholder-color'));
    expect(await css(placeholder, 'font-size')).toBe(await css(value, 'font-size'));
    near((await box(placeholder)).x - (await box(container(page, 'stacked-placeholder'))).x, await token(page, 'container-padding-inline-medium'), 'the placeholder’s start');
    await expect(part(page, 'stacked-empty', '.placeholder, .value')).toHaveCount(0);
    // Not while a floating label rests in the line; shown once it floats.
    await set(page, 'filled-empty', { placeholder: 'Choose a country' });
    expect(await css(part(page, 'filled-empty', '.placeholder'), 'color')).toBe('rgba(0, 0, 0, 0)');
    await focusSelect(page, 'filled-empty');
    await expect.poll(() => css(part(page, 'filled-empty', '.placeholder'), 'color')).toBe(await color(page, 'filled-focused-placeholder-color'));
    // The supporting text of the chosen option is in the list only.
    expect(await part(page, 'open-supporting-text', '.container').textContent()).not.toContain('Unlimited projects');
    await expect(part(page, 'open-supporting-text', '.value')).toHaveText('Team');
  });

  test('SEL-17: the chosen option is the first, in order and across groups, whose value equals value — a disabled one and one whose value is empty included; a value that names no option draws nothing chosen, is kept and reported; two options that share a value stand for the first, reported; when the options change the chosen one is found again and nothing is emitted', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['empty-value-option', 'open-disabled-chosen'].includes(f.id)),
      fx('unknown', { value: 'zz', placeholder: 'Choose' }),
      fx('twice', { value: 'x' }, [option('First', 'x'), group('More', [option('Second', 'x'), option('Third', 'y')])]),
      fx('grouped', { value: 'b' }, [group('One', [option('A', 'a')]), group('Two', [option('B', 'b')])]),
    ]);
    await expect(part(page, 'empty-value-option', '.value')).toHaveText('Standard');
    await expect(part(page, 'open-disabled-chosen', '.value')).toHaveText('Enterprise');
    await expect(part(page, 'grouped', '.value')).toHaveText('B');
    await expect(part(page, 'unknown', '.value')).toHaveCount(0);
    await expect(part(page, 'unknown', '.placeholder')).toHaveText('Choose');
    expect((await read(page, 'unknown')).value, 'the value stays as the product set it').toBe('zz');
    await expect(part(page, 'twice', '.value')).toHaveText('First');
    // In sight, so that the list stays open: the rows are drawn while it is shown.
    await host(page, 'twice').scrollIntoViewIfNeeded();
    await set(page, 'twice', { open: true });
    await shownList(page, 'twice').toBe(true);
    expect((await read(page, 'twice')).selected).toEqual(['First']);
    await set(page, 'twice', { open: false });
    await expect.poll(() => seen.some((w) => w.includes('SEL-17') && w.includes('names no option'))).toBe(true);
    await expect.poll(() => seen.some((w) => w.includes('SEL-17') && w.includes('share the value'))).toBe(true);
    // The options change: found again by value, with no event and no change of value.
    await listen(page, 'unknown');
    await host(page, 'unknown').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-option value="zz">Zanzibar</tanrei-option>'));
    await expect(part(page, 'unknown', '.value')).toHaveText('Zanzibar');
    await host(page, 'unknown').evaluate((el) => (el.querySelector('[value="zz"]')!.textContent = 'Zed'));
    await expect(part(page, 'unknown', '.value')).toHaveText('Zed');
    await host(page, 'unknown').evaluate((el) => el.querySelector('[value="zz"]')!.remove());
    await expect(part(page, 'unknown', '.value')).toHaveCount(0);
    expect((await read(page, 'unknown')).value).toBe('zz');
    expect(await heard(page)).toEqual([]);
  });

  test('SEL-18: a glyph in the leading-icon slot is drawn at the start of the container; otherwise the chosen option’s own; otherwise none, and the value starts at the text padding — at icon.size, unselected, in the leading-icon color, hidden from assistive technology; an interactive element in the slot is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['stacked-leading-icon', 'stacked-option-icon', 'stacked-value', 'small-label-hidden-icons'].includes(f.id)),
      fx('both', { value: 'dark' }, [option('Light', 'light', { leadingIcon: 'light_mode' }), option('Dark', 'dark', { leadingIcon: 'dark_mode' })], { slots: { 'leading-icon': 'translate' } }),
      fx('button', { value: 'ca' }, '<tanrei-option value="ca">Canada</tanrei-option><button slot="leading-icon">x</button>'),
    ]);
    const shown = (id: string, selector: string) => part(page, id, selector).evaluate((el) => getComputedStyle(el).display !== 'none');
    expect([await shown('stacked-leading-icon', '.leading-slot'), await shown('stacked-leading-icon', '.leading-own')]).toEqual([true, false]);
    expect([await shown('stacked-option-icon', '.leading-slot'), await shown('stacked-option-icon', '.leading-own')]).toEqual([false, true]);
    expect([await shown('both', '.leading-slot'), await shown('both', '.leading-own')], 'the slot takes the place of the option’s glyph').toEqual([true, false]);
    expect([await shown('stacked-value', '.leading-slot'), await shown('stacked-value', '.leading-own')]).toEqual([false, false]);
    await expect(part(page, 'stacked-option-icon', '.leading-own')).toHaveText('dark_mode');
    for (const [id, selector, size] of [['stacked-leading-icon', '.leading-slot', 'medium'], ['stacked-option-icon', '.leading-own', 'medium'], ['small-label-hidden-icons', '.leading-own', 'small']] as const) {
      const icon = part(page, id, selector);
      near((await box(icon)).width, await token(page, `icon-size-${size}`), `${id} icon.size`);
      near((await box(icon)).height, await token(page, `icon-size-${size}`), `${id} icon.size`);
      expect(await css(icon, 'color'), id).toBe(await color(page, 'stacked-leading-icon-color'));
      expect(await icon.getAttribute('aria-hidden'), id).toBe('true');
      expect(await css(icon, 'font-variation-settings'), id).toContain(`"FILL" ${(await css(page.locator('html'), '--tanrei-sys-icon-fill-unselected')).trim()}`);
    }
    // Choosing another option changes the glyph; one without a glyph draws none.
    await set(page, 'stacked-option-icon', { value: 'light' });
    await expect(part(page, 'stacked-option-icon', '.leading-own')).toHaveText('light_mode');
    await expect.poll(() => seen.some((w) => w.includes('SEL-18'))).toBe(true);
  });

  test('SEL-19: the chevron is the icon set’s expand_more at the end of the container, at icon.size in the trailing-icon color, the same glyph closed and open, never mirrored, never a target or a stop of its own, hidden from assistive technology; a read-only select draws none; until the icon set can draw it nothing stands in its place and its box is kept', async ({ page }) => {
    await mountSpec(page, ['stacked-value', 'stacked-read-only', 'stacked-error-value', 'long-value-rtl']);
    const chevron = part(page, 'stacked-value', '.chevron');
    await expect(chevron).toHaveText('expand_more');
    expect(await chevron.evaluate((el) => [el.getAttribute('aria-hidden'), el.tabIndex, el.hasAttribute('data-drawn'), getComputedStyle(el).visibility])).toEqual(['true', -1, true, 'visible']);
    expect(await css(chevron, 'color')).toBe(await color(page, 'stacked-trailing-icon-color'));
    expect(await css(part(page, 'stacked-error-value', '.chevron'), 'color')).toBe(await color(page, 'stacked-error-trailing-icon-color'));
    expect(await css(chevron, 'font-family')).toContain((await css(page.locator('html'), '--tanrei-sys-icon-family-unselected')).replaceAll('"', '').trim());
    const closed = await chevron.evaluate((el) => [el.textContent, getComputedStyle(el).transform, getComputedStyle(el).rotate]);
    // Not a target of its own: a press where it is drawn lands on the container.
    const at = await box(chevron);
    expect(await page.evaluate(([x, y]) => (document.elementFromPoint(x, y) as HTMLElement).shadowRoot!.elementFromPoint(x, y)!.className, [at.x + at.width / 2, at.y + at.height / 2])).toBe('container');
    await pressOn(chevron);
    await shownList(page, 'stacked-value').toBe(true);
    expect(await chevron.evaluate((el) => [el.textContent, getComputedStyle(el).transform, getComputedStyle(el).rotate]), 'it does not turn').toEqual(closed);
    await pressOn(chevron);
    await closedList(page, 'stacked-value');
    await expect(part(page, 'stacked-read-only', '.chevron')).toHaveCount(0);
    // Right-to-left: not marked for mirroring, and not transformed.
    expect(await part(page, 'long-value-rtl', '.chevron').evaluate((el) => [el.hasAttribute('data-tanrei-mirrored'), getComputedStyle(el).transform, getComputedStyle(el).scale])).toEqual([false, 'none', 'none']);
    // The icon font is missing: nothing in its place, and the box is kept.
    const before = await box(chevron);
    await withoutIconFont(page);
    await expect.poll(() => chevron.evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
    expect(await box(chevron)).toEqual(before);
  });

  test('SEL-20: hovered and focused draw every part of the trigger from that state’s tokens, focused over hovered, and for as long as the list is open; a stacked select has no edge at rest, a line inside its edge at the focused width while focused and the error line at rest in error; states change over motion.state-*, at once where motion is reduced', async ({ page }) => {
    await mountSpec(page, ['stacked-value', 'stacked-error-value', 'filled-value'], { system: 'm3-like', reducedMotion: true });
    const id = 'stacked-value';
    const edge = part(page, id, '.edge');
    expect(await css(edge, 'border-top-color'), 'no edge at rest').toBe(await color(page, 'stacked-outline-color'));
    expect(await color(page, 'stacked-outline-color')).toBe('rgba(0, 0, 0, 0)');
    const height = (await box(container(page, id))).height;
    await container(page, id).hover();
    await expect.poll(() => css(container(page, id), 'background-color')).toBe(await color(page, 'stacked-hovered-container-color'));
    expect(await color(page, 'stacked-hovered-container-color'), 'the state layer shows on the container').not.toBe(await color(page, 'stacked-container-color'));
    expect(await css(part(page, id, '.value'), 'color')).toBe(await color(page, 'stacked-hovered-input-color'));
    // Focused, with the pointer still over it: focused wins.
    await focusSelect(page, id);
    expect(await css(container(page, id), 'background-color')).toBe(await color(page, 'stacked-focused-container-color'));
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-focused-outline-color'));
    near(await px(edge, 'border-top-width'), await token(page, 'focused-outline-width'), 'the focused width');
    expect(await css(part(page, id, '.chevron'), 'color')).toBe(await color(page, 'stacked-focused-trailing-icon-color'));
    near((await box(container(page, id))).height, height, 'the line takes no layout space');
    // Open, and focus gone from the document's point of view: still focused.
    await page.mouse.move(700, 500);
    await set(page, id, { open: true });
    await container(page, id).evaluate((el) => el.blur());
    expect(await css(edge, 'border-top-color'), 'drawn focused while its list is open').toBe(await color(page, 'stacked-focused-outline-color'));
    await set(page, id, { open: false });
    expect(await css(edge, 'border-top-color')).toBe(await color(page, 'stacked-outline-color'));
    // In error, at rest: the error line at outline.width.
    expect(await css(part(page, 'stacked-error-value', '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-error-outline-color'));
    near(await px(part(page, 'stacked-error-value', '.edge'), 'border-top-width'), await token(page, 'outline-width'), 'outline.width');
    // Filled: the active indicator's color and width follow the state.
    const indicator = part(page, 'filled-value', '.indicator');
    near((await box(indicator)).height, await token(page, 'active-indicator-width'), 'the indicator at rest');
    await focusSelect(page, 'filled-value');
    near((await box(indicator)).height, await token(page, 'focused-active-indicator-width'), 'the indicator, focused');
    expect(await css(indicator, 'background-color')).toBe(await color(page, 'filled-focused-active-indicator-color'));
    // The motion.
    expect(await px(container(page, id), 'transition-duration')).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    near((await px(container(page, id), 'transition-duration')) * 1000, await duration(page, 'motion-state-duration-medium'), 'motion.state-duration', 1);
    near((await px(edge, 'transition-duration')) * 1000, await duration(page, 'motion-state-duration-medium'), 'the edge', 1);
  });

  test('SEL-21: focus is shown by the focused tokens — the focused edge is the indicator — and never by a ring around the container; where the focus style is glow the container also glows while focused', async ({ page }) => {
    await mount(page, [fx('one', { value: 'jp' })]);
    await tabTo(page, container(page, 'one'));
    expect(await css(container(page, 'one'), 'outline-style')).toBe('none');
    expect(await container(page, 'one').evaluate((el) => getComputedStyle(el, '::after').content)).toBe('none');
    await mount(page, [fx('one', { value: 'jp' })], { system: 'acme', systemCss: await acmeSystemCss() });
    expect((await css(page.locator('html'), '--tanrei-sys-behavior-focus-style')).trim()).toBe('glow');
    await tabTo(page, container(page, 'one'));
    expect(await part(page, 'one', '.field').getAttribute('data-focus-style')).toBe('glow');
    expect(await container(page, 'one').evaluate((el) => getComputedStyle(el, '::after').boxShadow)).not.toBe('none');
    expect(await css(container(page, 'one'), 'outline-style'), 'still no ring').toBe('none');
  });

  test('SEL-22: a container shorter than the minimum target extends its hit area to it without changing its size; the whole container — paddings, icon, value and chevron — is one target; a press on it draws no press answer of its own', async ({ page }) => {
    await mountSpec(page, ['stacked-small', 'stacked-option-icon']);
    const target = await container(page, 'stacked-small').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height));
    const least = await resolveToken(page, '--tanrei-sys-target-pointer');
    expect(target).toBeGreaterThanOrEqual(Math.max(least, await token(page, 'stacked-container-height-small')) - 0.01);
    near((await box(container(page, 'stacked-small'))).height, await token(page, 'stacked-container-height-small'), 'the visual size');
    const id = 'stacked-option-icon';
    const c = await box(container(page, id));
    for (const [name, x] of [['the start padding', 3], ['the leading icon', 20], ['the value', 70], ['the chevron', c.width - 20], ['the end padding', c.width - 3]] as const) {
      await page.mouse.click(c.x + x, c.y + c.height / 2);
      await shownList(page, id).toBe(true);
      expect(await container(page, id).getAttribute('data-pressed'), `${name}: no pressed state`).toBeNull();
      await expect(container(page, id).locator('.ripple'), name).toHaveCount(0);
      await page.keyboard.press('Escape');
      await closedList(page, id);
    }
  });

  test('SEL-62: the select has no words of its own — bare or framed, closed or open, with or without the product’s words it shows its options’ labels, its placeholder and its name and nothing else in words; its empty text is the instance’s emptyText, else the product’s noOptionsText, else none, and a select with nothing to show asks for that word once when the person tries to open it; the words of a requirement are read by the Field that frames it', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('bare', { placeholder: 'Choose a country' }),
      fx('floating', { variant: 'outlined', value: 'jp' }),
      fx('open', { value: 'jp', open: true }, [group('Asia', [option('Japan', 'jp', { supportingText: 'UTC+9', leadingIcon: 'schedule' })]), option('Kenya', 'ke')]),
      fx('none', { placeholder: 'Nothing to choose' }, []),
    ]);
    await frame(page, 'framed', { label: 'Shipping country', required: true, requiredText: '', optionalText: '' }, {});
    await frame(page, 'framed-optional', { label: 'Billing country', required: false, optional: true, requiredText: '', optionalText: '' }, {});
    /** Every word a select holds: the text of its shadow root, and every name it says by attribute. */
    const words = () =>
      page.evaluate((tag) =>
        [...document.querySelectorAll(tag)].map((el) =>
          `${el.shadowRoot!.textContent} ${[...el.shadowRoot!.querySelectorAll('*')].flatMap((each) => ['aria-label', 'aria-description', 'title', 'label'].map((name) => each.getAttribute(name) ?? '')).join(' ')}`.replace(/\s+/g, ' '),
        ),
      TAG);
    // What the test gave, the names of the two glyphs the select draws by name, and nothing else.
    const GIVEN = ['Country', 'Shipping country', 'Billing country', 'Choose a country', 'Nothing to choose', 'Canada', 'France', 'Japan', 'Kenya', 'New Zealand', 'Asia', 'UTC+9', 'schedule', 'expand_more', 'check', '*'];
    const unknown = async () => (await words()).map((text) => GIVEN.reduce((rest, word) => rest.replaceAll(word, ''), text).trim()).filter(Boolean);
    expect(await unknown()).toEqual([]);
    // The Field asks for its two words; the select asks for none, and reports none.
    expect(await missingWords(page)).toEqual(['optionalText', 'requiredText']);
    await expect.poll(() => seen.filter((w) => w.includes('FLD-24')).length).toBe(2);
    expect(seen.filter((w) => w.includes('SEL-62'))).toEqual([]);
    // The product's words, set once: the Field draws them, and gives the optional one to its select as part of the
    // description — the one place a select says a word it did not get from the product by its own props or children.
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional' });
    await expect(fieldRow(page, 'framed', '.requirement-tag .label')).toHaveText('Required');
    await expect.poll(() => part(page, 'framed-optional', '#description').textContent()).toBe('Optional');
    expect(await missingWords(page)).toEqual([]);
    const said = await words();
    expect(said.filter((text) => text.includes('Required')), 'the required word is the Field’s tag, never the select’s').toEqual([]);
    expect(said.filter((text) => text.includes('Optional')), 'the optional word is in the description the Field gives').toHaveLength(1);
    // A bare select, and one whose list holds nothing, draw no word of the product's or of their own.
    for (const id of ['bare', 'none']) expect(await host(page, id).evaluate((el) => el.shadowRoot!.textContent!.replace(/\s+/g, ' ').trim()), id).not.toMatch(/Required|Optional/);
    // The empty text. Nobody gives it: a select with no option does not open, and says once which words are missing.
    await mount(page, [fx('empty', {}, []), fx('own', { emptyText: 'No countries yet' }, [])], { reducedMotion: true });
    await container(page, 'empty').click();
    for (const key of ['Enter', 'ArrowDown']) await page.keyboard.press(key);
    expect((await read(page, 'empty')).shown).toBe(false);
    await expect.poll(() => seen.filter((w) => w.includes('SEL-62') && w.includes('empty-text is empty') && w.includes('noOptionsText')).length).toBe(1);
    expect(await missingWords(page)).toContain('noOptionsText');
    // The product's word: the select opens and draws it; an instance's own emptyText wins.
    await setWords(page, { noOptionsText: 'Nothing to choose here' });
    await container(page, 'empty').click();
    await shownList(page, 'empty').toBe(true);
    await expect(part(page, 'empty', '.status .status-text')).toHaveText('Nothing to choose here');
    await set(page, 'own', { open: true });
    await shownList(page, 'own').toBe(true);
    await expect(part(page, 'own', '.status .status-text')).toHaveText('No countries yet');
  });

  test('SEL-63: the select says to the Field that frames it that it draws the label while its variant floats one, where its value starts and ends, and that it is drawn focused while its list is open — and says it again when it changes; it takes the Field’s name, description and states, whether the label is hidden and whether an asterisk follows it; it keeps no count and reports no refusal', async ({ page }) => {
    await mount(page, [fx('base', {})], { system: 'm3-like', reducedMotion: true });
    await frame(page, 'one', { label: 'Country', supportingText: 'Where your invoices are addressed.', required: true }, { value: 'jp' });
    await frame(page, 'icon', { label: 'Language', supportingText: 'Applies to this device.' }, { value: 'ja' }, '<tanrei-option value="en">English</tanrei-option><tanrei-option value="ja">日本語</tanrei-option><span slot="leading-icon">translate</span>');
    await frame(page, 'other', { label: 'Other' }, { value: 'fr' });
    const id = 'one';
    // It draws the label itself while its variant floats one: the Field's row goes, and the same text floats.
    // (m3-like marks a required field with the asterisk: after the Field's label above, and after the floating one.)
    await expect(fieldRow(page, id, '.label-row > .label')).toHaveText('Country*');
    await expect(part(page, id, '.floating')).toHaveCount(0);
    await set(page, id, { variant: 'outlined' });
    await expect(fieldRow(page, id, '.label-row')).toHaveCount(0);
    await expect(part(page, id, '.floating')).toHaveText('Country*');
    await set(page, id, { variant: 'stacked' });
    await expect(fieldRow(page, id, '.label-row > .label')).toHaveText('Country*');
    // Where its value starts and ends: the Field's supporting row starts at the value and ends at the end padding.
    const starts = async (which: string) => {
      const [help, value, c] = [await box(fieldRow(page, which, '.supporting-text')), await box(part(page, which, '.value')), await box(container(page, which))];
      return { start: help.x - value.x, end: c.x + c.width - (help.x + help.width) };
    };
    near((await starts(id)).start, 0, 'the supporting row starts where the value starts');
    near((await starts(id)).end, await token(page, 'container-padding-inline-with-icon-medium'), 'and ends at the padding beside the chevron', 1);
    // Beside a leading icon: after the icon and its gap.
    near((await starts('icon')).start, 0, 'after the leading icon');
    near((await box(part(page, 'icon', '.value'))).x - (await box(container(page, 'icon'))).x, (await token(page, 'container-padding-inline-with-icon-medium')) + (await token(page, 'icon-size-medium')) + (await token(page, 'container-gap-medium')), 'padding, icon and gap');
    // Said again when it changes: the size, and a read-only select, which draws no chevron.
    await set(page, id, { size: 'small' });
    near((await starts(id)).start, 0, 'a small select’s value');
    near((await box(fieldRow(page, id, '.supporting-text'))).x - (await box(container(page, id))).x, await token(page, 'container-padding-inline-small'), 'a small select’s padding');
    await set(page, id, { size: 'medium', readOnly: true });
    near((await starts(id)).end, await token(page, 'container-padding-inline-medium'), 'the text padding where no chevron is drawn', 1);
    await set(page, id, { readOnly: false });
    // Drawn focused while its list is open, whether or not it has focus: the Field's rows take their focused tokens.
    const label = fieldRow(page, id, '.label-row > .label');
    const [rest, focused] = [await resolveColor(page, '--tanrei-comp-field-standard-label-color'), await resolveColor(page, '--tanrei-comp-field-standard-focused-label-color')];
    expect(focused, 'm3-like’s primary is chromatic: the focused label differs').not.toBe(rest);
    await focusSelect(page, 'other');
    expect(await css(label, 'color')).toBe(rest);
    await set(page, id, { open: true });
    await shownList(page, id).toBe(true);
    expect((await read(page, id)).focused, 'the product opened it: focus is elsewhere').toBe(false);
    expect(await css(label, 'color'), 'open: the Field’s label is drawn focused').toBe(focused);
    expect(await css(fieldRow(page, id, '.supporting-text'), 'color')).toBe(await resolveColor(page, '--tanrei-comp-field-standard-focused-supporting-text-color'));
    expect(await css(part(page, id, '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-focused-outline-color'));
    await set(page, id, { open: false });
    expect(await css(label, 'color')).toBe(rest);
    // What it takes: the name, the description and the three states.
    await setField(page, id, { error: true, errorText: 'We cannot ship there yet.', disabled: true });
    expect(await container(page, id).evaluate((el) => [el.getAttribute('aria-label'), (el.getRootNode() as ShadowRoot).getElementById('description')!.textContent, el.getAttribute('aria-invalid'), el.getAttribute('aria-required'), el.getAttribute('aria-disabled')])).toEqual(['Country', 'We cannot ship there yet.', 'true', 'true', 'true']);
    // No count and no refusal: the Field draws neither for a select.
    await setField(page, id, { disabled: false, error: false });
    await expect(fieldRow(page, id, '.counter')).toHaveCount(0);
    expect(await field(page, id).evaluate((el) => el.shadowRoot!.querySelector('.frame')!.hasAttribute('data-error'))).toBe(false);
  });

  test('SEL-64: the select draws no label row, no requirement tag, no help and no error text; bare it is complete — its container, the label that floats in it, its value, its list and its events — named by its own label and exactly as tall as its container; the six attributes that left and a child for label-icon draw nothing and are reported once for the element, naming the select field', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      fx('bare', { value: 'jp' }),
      fx('floating', { variant: 'outlined', value: 'jp' }),
      // What a person coming from the select field writes by habit: the harness writes each as its attribute.
      fx('left', { value: 'jp', supportingText: 'Help.', errorText: 'No.', required: true, requiredMark: 'tag', requiredText: 'Required', optionalText: 'Optional' }, `${COUNTRY_OPTIONS}<span slot="label-icon">schedule</span>`),
      fx('one', { value: 'jp', supportingText: 'Help.' }),
    ]);
    for (const id of ['bare', 'floating', 'left', 'one']) {
      // Nothing of a frame is in its tree, and it is exactly as tall as its container.
      await expect(part(page, id, '.label-row, .supporting-text, tanrei-tag, .requirement-tag, .announcer, slot[name="label-icon"]'), id).toHaveCount(0);
      const [h, c] = [await box(host(page, id)), await box(container(page, id))];
      near(h.height, c.height, `${id}: as tall as its container`);
      near(h.y, c.y, `${id}: the container at its top`);
    }
    near((await box(container(page, 'left'))).height, (await box(container(page, 'bare'))).height, 'what left changes nothing');
    expect(await host(page, 'left').locator('[slot="label-icon"]').evaluate((el) => el.getBoundingClientRect().width), 'a child for label-icon is not drawn').toBe(0);
    expect(await container(page, 'left').evaluate((el) => [el.getAttribute('aria-required'), el.getAttribute('aria-describedby'), el.getAttribute('aria-invalid')])).toEqual([null, null, null]);
    // Complete as a bare control: named by its own label, it opens, chooses and emits.
    expect(await container(page, 'bare').getAttribute('aria-label')).toBe('Country');
    await expect(part(page, 'floating', '.floating')).toHaveText('Country');
    await listen(page, 'bare');
    await container(page, 'bare').click();
    await row(page, 'bare', 'Kenya').click();
    expect(await heard(page)).toEqual(['toggle true', 'change ke', 'toggle false select']);
    await expect(part(page, 'bare', '.value')).toHaveText('Kenya');
    // Reported once for each element, naming what was given and the select field.
    await expect.poll(() => seen.filter((w) => w.includes('SEL-64')).length).toBe(2);
    const report = seen.find((w) => w.includes('SEL-64') && w.includes('label-icon'))!;
    for (const name of ['supporting-text', 'error-text', 'required', 'optional', 'required-mark', 'required-text', 'optional-text', 'label-icon', 'tanrei-select-field']) expect(report, name).toContain(name);
    await set(page, 'left', { placeholder: 'y' });
    await set(page, 'left', { value: 'ca' });
    expect(seen.filter((w) => w.includes('SEL-64')), 'once for the element').toHaveLength(2);
    expect(seen.filter((w) => w.includes('SEL-64') && !w.includes('tanrei-select-field'))).toEqual([]);
  });
});

test.describe('behavior: the list', () => {
  test('SEL-23: a press on the container, or Enter, Space, Down Arrow or Up Arrow while it has focus, takes focus, sets open, emits toggle once and presents the list; the container says that it opens a list box, whether it is open and which; a pointer entering, focus arriving or time passing opens nothing; nothing here changes the value', async ({ page }) => {
    await mount(page, [fx('one', { value: 'fr' }), fx('other', {})]);
    await listen(page, 'one');
    const c = container(page, 'one');
    expect(await c.evaluate((el) => [el.getAttribute('aria-haspopup'), el.getAttribute('aria-expanded'), el.getAttribute('aria-controls'), !!(el.getRootNode() as ShadowRoot).getElementById('list')])).toEqual(['listbox', 'false', 'list', true]);
    // Not by hovering, not by focus arriving, not by waiting.
    await c.hover();
    await focusSelect(page, 'one');
    await page.waitForTimeout(700);
    expect(await read(page, 'one')).toMatchObject({ open: false, focused: true });
    expect(await heard(page)).toEqual([]);
    for (const key of ['Enter', ' ', 'ArrowDown', 'ArrowUp']) {
      await page.keyboard.press(key === ' ' ? 'Space' : key);
      await shownList(page, 'one').toBe(true);
      expect(await read(page, 'one'), key).toMatchObject({ open: true, expanded: 'true', value: 'fr', active: 'France', focused: true });
      expect(await heard(page), key).toEqual(['toggle true']);
      await page.keyboard.press('Escape');
      await closedList(page, 'one');
      expect(await heard(page)).toEqual(['toggle false escape']);
    }
    // A press takes focus where it did not have it.
    await focusSelect(page, 'other');
    await c.click();
    await shownList(page, 'one').toBe(true);
    expect(await read(page, 'one')).toMatchObject({ open: true, focused: true, value: 'fr' });
    expect(await heard(page)).toEqual(['toggle true']);
    // The list is in the top layer.
    expect(await part(page, 'one', '.surface').evaluate((el) => el.matches(':popover-open'))).toBe(true);
  });

  test('SEL-24: the open list is in the overlay layer, list.offset below the container with the start edges together; above it where below has no room; it follows the container, and closes with the reason anchor-hidden when the container goes out of sight; it stays an anchored list in a narrow window', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    await mount(page, [fx('one', { value: 'fr' })]);
    await listen(page, 'one');
    await container(page, 'one').click();
    await shownList(page, 'one').toBe(true);
    await arrived(page, 'one');
    const offset = await token(page, 'list-offset');
    let [c, l] = [await box(container(page, 'one')), await box(part(page, 'one', '.list'))];
    near(l.y - (c.y + c.height), offset, 'list.offset below');
    near(l.x, c.x, 'start edges together');
    expect(await part(page, 'one', '.surface').evaluate((el) => [el.matches(':popover-open'), el.dataset.side, getComputedStyle(el).position])).toEqual([true, 'bottom', 'fixed']);
    // It follows the container.
    await page.evaluate(() => document.body.insertAdjacentHTML('afterbegin', '<div data-moved style="block-size: 40px"></div>'));
    await expect.poll(async () => Math.round((await box(part(page, 'one', '.list'))).y - (await box(container(page, 'one'))).y - (await box(container(page, 'one'))).height)).toBe(Math.round(offset));
    await page.keyboard.press('Escape');
    await closedList(page, 'one');
    await heard(page);
    // No room below, room above: it stands above.
    await page.evaluate(() => (document.querySelector<HTMLElement>('[data-moved]')!.style.blockSize = '560px'));
    await container(page, 'one').click();
    await shownList(page, 'one').toBe(true);
    [c, l] = [await box(container(page, 'one')), await box(part(page, 'one', '.list'))];
    near(c.y - (l.y + l.height), offset, 'list.offset above');
    expect(await part(page, 'one', '.surface').getAttribute('data-side')).toBe('top');
    // Neither side has room for all of it: limited to the room, inside the window's margin, and scrolling.
    await page.evaluate(() => (document.querySelector<HTMLElement>('[data-moved]')!.style.blockSize = '60px'));
    await expect.poll(async () => (await box(container(page, 'one'))).y).toBeLessThan(200);
    await page.setViewportSize({ width: 800, height: 260 });
    const margin = await token(page, 'list-viewport-margin');
    // The list is placed for the new window in the frame that hears of it, and it may still be growing in: its drawn
    // box is then shorter than its room whatever the placement is (it starts with no height at all), so the box alone
    // says nothing yet. What the placement decides is read first — the box that scrolls is limited at once, and no
    // motion scales its layout — and the drawn box once it has grown in.
    await expect.poll(() => part(page, 'one', '.scroll').evaluate((el) => el.scrollHeight > el.clientHeight), { message: 'it scrolls' }).toBe(true);
    await grownIn(page, 'one');
    const limited = await box(part(page, 'one', '.list'));
    near(limited.y + limited.height, 260 - margin, 'limited to the room: its end edge is the margin inside the window');
    expect(limited.y).toBeGreaterThanOrEqual(margin - 0.6);
    near(limited.y - (await box(container(page, 'one'))).y - (await box(container(page, 'one'))).height, offset, 'still list.offset from the container');
    expect(limited.height, 'shorter than its options').toBeLessThan(await part(page, 'one', '.scroll').evaluate((el) => el.scrollHeight));
    expect((await read(page, 'one')).shown, 'still an anchored list').toBe(true);
    await page.setViewportSize({ width: 800, height: 700 });
    await heard(page);
    // The container goes out of sight: closed, with the reason.
    await host(page, 'one').evaluate((el) => (el.style.display = 'none'));
    await expect.poll(() => heard(page)).toEqual(['toggle false anchor-hidden']);
    expect((await read(page, 'one')).open).toBe(false);
  });

  test('SEL-24: the list stays inside the visible part of the window — above the on-screen keyboard, and below a visual viewport scrolled down, as iOS leaves it to keep a field in view — and is whole again when that changes', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 700 });
    await mount(page, [fx('one', { value: 'fr' })]);
    await page.evaluate(() => document.body.insertAdjacentHTML('afterbegin', '<div style="block-size: 300px"></div>'));
    await container(page, 'one').click();
    await shownList(page, 'one').toBe(true);
    await grownIn(page, 'one');
    const margin = await token(page, 'list-viewport-margin');
    const before = await box(part(page, 'one', '.list'));
    const visual = (b: { top: number; height: number } | null) =>
      page.evaluate((v) => {
        const real = (window as any).__realViewport ?? ((window as any).__realViewport = window.visualViewport);
        const fake = v && { offsetTop: v.top, offsetLeft: 0, height: v.height, width: window.innerWidth, scale: 1, addEventListener() {}, removeEventListener() {} };
        Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => fake ?? real });
        window.dispatchEvent(new Event('resize'));
      }, b);
    await visual({ top: 200, height: 250 });
    await expect.poll(async () => ((l) => l.y + l.height)(await box(part(page, 'one', '.list')))).toBeLessThanOrEqual(450 - margin + 0.6);
    expect((await box(part(page, 'one', '.list'))).y, 'below the top of what is visible').toBeGreaterThanOrEqual(200 + margin - 0.6);
    expect((await read(page, 'one')).shown, 'still open').toBe(true);
    // The keyboard hides: whole again, on the side it took while that side has room (POP-5).
    await visual(null);
    await expect.poll(async () => (await box(part(page, 'one', '.list'))).height).toBeCloseTo(before.height, 1);
    expect((await box(part(page, 'one', '.list'))).y).toBeGreaterThanOrEqual(margin - 0.6);
  });

  test('SEL-25: the list is filled with list.color, raised by list.elevation, rounded by list.shape and insets its options by its paddings; it is as wide as its options need, never narrower than its container or list.min-width, never wider than list.max-width past a narrower container, and never wider than the window allows; as tall as its options up to list.max-height, scrolling beyond that, vertically only; opened with a chosen option, the whole of that option is in view', async ({ page }) => {
    const LONG = 'Every project, priority support, single sign-on and an audit log kept for a year';
    await mount(page, [
      ...spec.fixtures.filter((f) => ['open-many', 'stacked-open', 'small-label-hidden-open', 'open-supporting-text'].includes(f.id)),
      fx('narrow', { size: 'small', labelHidden: true, value: 'a', open: true }, [option('A', 'a'), option('B', 'b')]),
      fx('wraps', { label: 'Plan', value: 'free', open: true }, [option('Free', 'free'), option('Team', 'team', { supportingText: LONG })]),
    ]);
    const list = part(page, 'stacked-open', '.list');
    expect(await css(list, 'background-color')).toBe(await color(page, 'list-color'));
    const shadow = await page.evaluate((name) => {
      const probe = document.createElement('div');
      probe.style.boxShadow = `var(${name})`;
      document.body.append(probe);
      const value = getComputedStyle(probe).boxShadow;
      probe.remove();
      return value;
    }, T('list-elevation'));
    expect(await css(list, 'box-shadow')).toBe(shadow);
    near(await px(list, 'border-top-left-radius'), await token(page, 'list-shape'), 'list.shape');
    expect(await css(list, 'overflow')).toBe('hidden');
    const scroll = part(page, 'stacked-open', '.scroll');
    near(await px(scroll, 'padding-top'), await token(page, 'list-padding-block'), 'padding-block');
    near(await px(scroll, 'padding-left'), await token(page, 'list-padding-inline'), 'padding-inline');
    // As wide as its options need, never narrower than its container: the countries fit the container's width or
    // need a little more.
    expect((await box(list)).width).toBeGreaterThanOrEqual((await box(container(page, 'stacked-open'))).width - 0.6);
    const unwrapped = (id: string) =>
      part(page, id, '.list').evaluate((el) => {
        const list = el as HTMLElement;
        list.style.minInlineSize = '0';
        list.style.maxInlineSize = 'none';
        const width = list.getBoundingClientRect().width;
        list.style.removeProperty('min-inline-size');
        list.style.removeProperty('max-inline-size');
        return width;
      });
    near((await box(list)).width, Math.max(await unwrapped('stacked-open'), (await box(container(page, 'stacked-open'))).width), 'as wide as its options need, or its container');
    // A supporting text longer than the container: the list is wider than the container, every option on one line
    // of each text, while the container keeps the width its labels give it (SEL-49).
    const plans = await box(part(page, 'open-supporting-text', '.list'));
    const planBox = await box(container(page, 'open-supporting-text'));
    expect(plans.width, 'wider than its container').toBeGreaterThan(planBox.width + 1);
    near(plans.width, await unwrapped('open-supporting-text'), 'as wide as its options need');
    expect(plans.width).toBeLessThanOrEqual((await token(page, 'list-max-width')) + 0.6);
    const lines = (locator: Locator) => locator.evaluate((el) => Math.round(el.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(el).lineHeight)));
    expect(await lines(part(page, 'open-supporting-text', '.option-supporting').first()), 'a supporting text on one line').toBe(1);
    await set(page, 'open-supporting-text', { open: false });
    near((await box(container(page, 'open-supporting-text'))).width, planBox.width, 'the container’s width does not change for the list');
    // An option that needs more than list.max-width: the list is list.max-width wide — or what the window allows, the
    // stage standing for the window here — and the text wraps.
    expect(await token(page, 'list-max-width')).toBe(320);
    const allowed = await part(page, 'wraps', '.surface').evaluate((el) => Number.parseFloat(getComputedStyle(el).getPropertyValue('--_anchored-max-inline')));
    near((await box(part(page, 'wraps', '.list'))).width, Math.min(await token(page, 'list-max-width'), allowed), 'list.max-width');
    expect(await lines(part(page, 'wraps', '.option-supporting'))).toBeGreaterThan(1);
    // A container wider than list.max-width: the list is as wide as the container (a narrower max-width here, so that
    // the stage has room for it).
    await override(page, { [T('list-max-width')]: '200px' });
    await host(page, 'wraps').evaluate((el) => (el.style.inlineSize = '240px'));
    await expect.poll(async () => Math.round((await box(part(page, 'wraps', '.list'))).width)).toBe(240);
    expect(Math.round((await box(container(page, 'wraps'))).width)).toBe(240);
    await override(page, { [T('list-max-width')]: '' });
    // As tall as its options and paddings.
    const five = await box(rows(page, 'stacked-open').first());
    near((await box(list)).height, 5 * five.height + 2 * (await token(page, 'list-padding-block')), 'as tall as its options');
    // A container narrower than the least width: the list is list.min-width wide.
    const least = await token(page, 'list-min-width');
    expect((await box(container(page, 'narrow'))).width).toBeLessThan(least);
    near((await box(part(page, 'narrow', '.list'))).width, least, 'list.min-width');
    // 24 options with the 18th chosen: list.max-height high (320 in the default system), the chosen row whole inside it.
    const many = await box(part(page, 'open-many', '.list'));
    near(many.height, await token(page, 'list-max-height'), 'list.max-height');
    expect(await token(page, 'list-max-height')).toBe(320);
    const chosen = await box(row(page, 'open-many', 'corner.small'));
    expect(chosen.y).toBeGreaterThanOrEqual(many.y - 0.6);
    expect(chosen.y + chosen.height).toBeLessThanOrEqual(many.y + many.height + 0.6);
    expect(await part(page, 'open-many', '.scroll').evaluate((el) => [getComputedStyle(el).overflowY, getComputedStyle(el).overflowX, el.scrollWidth <= el.clientWidth, el.scrollTop > 0])).toEqual(['auto', 'hidden', true, true]);
    // The paddings scroll with the options: at the top, the first row is the padding below the list's edge.
    await part(page, 'open-many', '.scroll').evaluate((el) => (el.scrollTop = 0));
    near((await box(rows(page, 'open-many').first())).y - many.y, await token(page, 'list-padding-block'), 'the padding scrolls with the options');
    // It follows the container's width.
    await host(page, 'stacked-open').evaluate((el) => (el.style.inlineSize = '240px'));
    await expect.poll(async () => Math.round((await box(list)).width)).toBe(240);
  });

  test('SEL-26: while the list is open focus stays on the container — it is not moved into the list, nothing is trapped or inert and no scrim is drawn — and a press on an option, on a group title or on the list’s surface does not take it; one option at a time is the active one', async ({ page }) => {
    await mount(page, [fx('one', { value: 'b' }, [group('Letters', [option('A', 'a'), option('B', 'b', { disabled: true }), option('C', 'c')])]), fx('other', {})]);
    await container(page, 'one').click();
    await shownList(page, 'one').toBe(true);
    expect(await read(page, 'one')).toMatchObject({ focused: true, active: 'B' });
    expect(await part(page, 'one', '.row[tabindex], .scroll[tabindex], .list[tabindex]').count(), 'nothing in the list is a focus stop').toBe(0);
    // The presses below are aimed at parts of the sheet by their boxes, so the sheet is first left to grow in: while it
    // does, it is drawn smaller than it is laid out, and a point taken from a box may be another row's a frame later
    // (in Firefox, on a loaded machine, the press meant for the sheet's first pixel row chose the option A).
    await part(page, 'one', '.motion').evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
    // A press on a disabled option, on a title and on the sheet's padding leaves focus on the container (and the list open).
    await pressOn(row(page, 'one', 'B'));
    await pressOn(part(page, 'one', '.group-title'));
    const l = await box(part(page, 'one', '.list'));
    await page.mouse.click(l.x + l.width / 2, l.y + 1);
    expect(await read(page, 'one')).toMatchObject({ focused: true, open: true, value: 'b' });
    // Nothing is inert and nothing is trapped: the other select can still be pressed, which closes this one.
    expect(await page.evaluate(() => [...document.querySelectorAll('[inert]')].length)).toBe(0);
    expect(await part(page, 'one', '.surface').evaluate((el) => getComputedStyle(el, '::backdrop').backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    await page.keyboard.press('ArrowDown');
    expect(await host(page, 'one').evaluate((el) => el.shadowRoot!.querySelectorAll('.row.active').length)).toBe(1);
    expect((await read(page, 'one')).active).toBe('C');
    // While the list grows in: its placed box has its full size from the first frame and the sheet inside it does not,
    // so a press below what the sheet has reached lands on the box — and does not take focus either. (Seen once as a
    // failure of this test on a loaded machine, where the presses above came before the sheet had grown under them;
    // here the opening motion is slowed, so that the press is certain to land there.)
    await page.keyboard.press('Escape');
    await closedList(page, 'one');
    await override(page, { [`--tanrei-comp-${spec.name}-motion-open-duration`]: '20000ms' });
    await container(page, 'one').click();
    await shownList(page, 'one').toBe(true);
    const [placed, sheet] = [await box(part(page, 'one', '.surface')), await box(part(page, 'one', '.list'))];
    expect(sheet.height, 'the sheet has not grown to the press yet').toBeLessThan(placed.height - 4);
    await page.mouse.click(placed.x + placed.width / 2, placed.y + placed.height - 2);
    expect(await read(page, 'one')).toMatchObject({ focused: true, open: true, value: 'b' });
    expect(await page.evaluate(() => document.activeElement?.localName)).toBe(TAG);
  });

  test('SEL-27: Escape, a press outside, focus leaving, a press on the container, Tab and a choice each close the list and emit toggle once with that reason — escape, outside, focus-out, press, tab, select; every close but select chooses nothing; focus stays on the container, or where the person put it; Tab moves on at once; a press outside also reaches the element under it', async ({ page }) => {
    await mount(page, [fx('other', { value: 'ca' }), fx('one', { value: 'fr' })]);
    await page.evaluate(() => {
      // Beside the selects, clear of the open list.
      document.querySelector('main')!.insertAdjacentHTML('beforeend', '<div style="position: fixed; inset-block-start: 16px; inset-inline-end: 16px"><button id="under" type="button" style="margin: 24px">Under</button><p id="plain" style="margin: 24px">Plain text</p></div>');
      const w = window as unknown as { __clicks: number };
      w.__clicks = 0;
      document.querySelector('#under')!.addEventListener('click', () => (w.__clicks += 1));
    });
    // Whether a press focuses a button is the platform's, not the engine's: WebKit does not on a Mac and does on
    // Linux. So the engine is asked, with a button of the page's own, before any list is open.
    await page.locator('#under').click();
    const pressFocusesButton = await page.evaluate(() => document.activeElement?.id === 'under');
    await page.evaluate(() => ((document.activeElement as HTMLElement | null)?.blur(), ((window as unknown as { __clicks: number }).__clicks = 0)));
    await listen(page, 'one');
    const open = async () => {
      await focusSelect(page, 'one');
      await page.keyboard.press('ArrowDown');
      await shownList(page, 'one').toBe(true);
      await page.keyboard.press('ArrowDown');
      expect((await read(page, 'one')).active, 'another option is active, and is not chosen by closing').toBe('Japan');
      expect(await heard(page)).toEqual(['toggle true']);
    };
    await open();
    await page.keyboard.press('Escape');
    await closedList(page, 'one');
    expect([await heard(page), await read(page, 'one')]).toMatchObject([['toggle false escape'], { value: 'fr', focused: true }]);
    // A press on nothing focusable: closed, and focus stays on the container.
    await open();
    await page.locator('#plain').click();
    await closedList(page, 'one');
    expect(await heard(page)).toEqual(['toggle false outside']);
    await expect.poll(async () => (await read(page, 'one')).focused).toBe(true);
    expect((await read(page, 'one')).value).toBe('fr');
    // A press on another focusable element: closed, the element is pressed, and focus is where the person put it.
    await open();
    await page.locator('#under').click();
    await closedList(page, 'one');
    expect(await heard(page)).toEqual(['toggle false outside']);
    expect(await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks), 'the press reached the button').toBe(1);
    // (Where the platform does not focus a button that is pressed — Safari on a Mac — focus is lost with the press, and the container takes it again.)
    if (pressFocusesButton) expect(await page.evaluate(() => document.activeElement?.id)).toBe('under');
    else await expect.poll(async () => (await read(page, 'one')).focused).toBe(true);
    // Focus moved by script to another element.
    await open();
    await focusSelect(page, 'other');
    await closedList(page, 'one');
    expect([await heard(page), (await read(page, 'other')).focused, (await read(page, 'one')).value]).toEqual([['toggle false focus-out'], true, 'fr']);
    // A press on the container.
    await open();
    await container(page, 'one').click();
    await closedList(page, 'one');
    expect([await heard(page), await read(page, 'one')]).toMatchObject([['toggle false press'], { value: 'fr', focused: true }]);
    // Tab: closed at once, and focus moves on from the container as it would have.
    await open();
    await tab(page);
    expect((await read(page, 'one')).open).toBe(false);
    expect([await heard(page), await page.evaluate(() => document.activeElement?.id), (await read(page, 'one')).value], 'on to what follows the select').toEqual([['toggle false tab'], 'under', 'fr']);
    await open();
    await tab(page, { back: true });
    expect([await heard(page), (await read(page, 'other')).focused, (await read(page, 'one')).value], 'back to what stands before it').toEqual([['toggle false tab'], true, 'fr']);
    // A choice.
    await open();
    await page.keyboard.press('Enter');
    await closedList(page, 'one');
    expect([await heard(page), await read(page, 'one')]).toMatchObject([['change jp', 'toggle false select'], { value: 'jp', focused: true }]);
  });

  test('SEL-28: with the list open Escape is the select’s — it closes the list and goes no further, so a dialog the select stands in stays open; with the list closed the select does not act on Escape and leaves it to what holds it', async ({ page }) => {
    await mount(page, [fx('base', {})]);
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<dialog id="d" style="inline-size: 420px; block-size: 360px"><tanrei-select id="s" label="Country" value="fr"><tanrei-option value="ca">Canada</tanrei-option><tanrei-option value="fr">France</tanrei-option></tanrei-select></dialog>',
      );
      const w = window as unknown as { __log: string[] };
      w.__log = [];
      const dialog = document.querySelector<HTMLDialogElement>('#d')!;
      dialog.addEventListener('keydown', (event) => event.key === 'Escape' && w.__log.push('dialog:keydown'));
      dialog.addEventListener('cancel', () => w.__log.push('dialog:cancel'));
      dialog.showModal();
    });
    const select = page.locator('#s');
    const state = () => select.evaluate((el) => [(el as unknown as { open: boolean }).open, (document.querySelector('#d') as HTMLDialogElement).open]);
    await select.locator('.field > .container').click();
    await expect.poll(state).toEqual([true, true]);
    // SEL-29: above the dialog and operable while the rest of the window is inert.
    await select.locator('.row').first().hover();
    expect(await select.evaluate((el) => el.shadowRoot!.querySelector('.row.active .option-label')?.textContent)).toBe('Canada');
    await page.keyboard.press('Escape');
    await expect.poll(state).toEqual([false, true]);
    expect(await page.evaluate(() => (window as unknown as { __log: string[] }).__log)).toEqual([]);
    expect(await select.evaluate((el) => el.shadowRoot!.activeElement?.classList.contains('container'))).toBe(true);
    // Closed: the key is the dialog's.
    await page.keyboard.press('Escape');
    await expect.poll(state).toEqual([false, false]);
    expect(await page.evaluate(() => (window as unknown as { __log: string[] }).__log)).toContain('dialog:keydown');
  });

  test('SEL-29: a select inside a popover — its list belongs to that popover: a press in the list is not a press outside it, the list is presented above it, and it closes with the popover; the list opens no overlay of its own', async ({ page }) => {
    await mount(page, [fx('base', {})]);
    await page.evaluate(() => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<div style="padding: 24px"><button id="a" type="button">Filters</button>
           <tanrei-popover id="p" anchor="a" headline="Filters"><tanrei-select id="s" label="Country" value="fr"><tanrei-option value="ca">Canada</tanrei-option><tanrei-option value="fr">France</tanrei-option><tanrei-option value="jp">Japan</tanrei-option></tanrei-select></tanrei-popover></div>`,
      );
      const w = window as unknown as { __log: string[] };
      w.__log = [];
      const popover = document.querySelector('#p') as HTMLElement & { open: boolean };
      popover.addEventListener('close', (event) => {
        w.__log.push(`popover:close ${(event as CustomEvent<{ reason: string }>).detail.reason}`);
        popover.open = false;
      });
      document.querySelector('#s')!.addEventListener('toggle', (event) => w.__log.push(`select:toggle ${(event as CustomEvent<{ open: boolean; reason?: string }>).detail.open} ${(event as CustomEvent<{ reason?: string }>).detail.reason ?? ''}`.trim()));
      popover.open = true;
    });
    const select = page.locator('#s');
    const log = () => page.evaluate(() => (window as unknown as { __log: string[] }).__log.splice(0));
    await expect(select.locator('.field > .container')).toBeVisible();
    await select.locator('.field > .container').click();
    await expect.poll(() => select.evaluate((el) => el.shadowRoot!.querySelector('.surface')!.matches(':popover-open'))).toBe(true);
    // Above the popover: the option under the pointer is the list's.
    const japan = select.locator('.row').nth(2);
    const b = await box(japan);
    expect(await page.evaluate(([x, y]) => (document.elementFromPoint(x, y) as HTMLElement | null)?.id, [b.x + b.width / 2, b.y + b.height / 2])).toBe('s');
    // A press in the list is not a press outside the popover: it chooses, and the popover hears nothing.
    await japan.click();
    expect(await log()).toEqual(['select:toggle true', 'select:toggle false select']);
    expect(await page.locator('#p').evaluate((el) => (el as unknown as { open: boolean }).open)).toBe(true);
    // The popover closes: the list closes with it.
    await select.locator('.field > .container').click();
    await expect.poll(() => select.evaluate((el) => (el as unknown as { open: boolean }).open)).toBe(true);
    await log();
    await page.keyboard.press('Escape');
    await expect.poll(() => select.evaluate((el) => (el as unknown as { open: boolean }).open)).toBe(false);
    expect(await log(), 'Escape is the topmost overlay’s: the list’s').toEqual(['select:toggle false escape']);
    await select.locator('.field > .container').click();
    await expect.poll(() => select.evaluate((el) => (el as unknown as { open: boolean }).open)).toBe(true);
    await log();
    await page.locator('#p').evaluate((el) => ((el as unknown as { open: boolean }).open = false));
    await expect.poll(() => select.evaluate((el) => (el as unknown as { open: boolean }).open)).toBe(false);
    expect(await log()).toEqual(['select:toggle false anchor-hidden']);
    // The list holds options and nothing that opens anything.
    expect(await select.evaluate((el) => el.shadowRoot!.querySelectorAll('.list [popover], .list [aria-haspopup], .list a, .list button').length)).toBe(0);
  });

  test('SEL-30: the list appears from where the appearance starts it — opacity 0 and scale 0.96 — grown from the edge that faces the container, and leaves the same way back on the accelerating curve, its last frame leaving no more than that curve does; nothing flickers', async ({ page }) => {
    await mount(page, [fx('one', { value: 'fr' })], { reducedMotion: false });
    const opening = await sampleFrames(host(page, 'one'), () => container(page, 'one').click(), { probe: appearProbe });
    expectAppearStart(opening.frames[0]!, { opacity: 0, scale: 0.96 });
    expect(String(opening.frames[0]!.probe.origin)).toMatch(/ 0px$/);
    expect(opening.rest.probe).toMatchObject({ opacity: 1, sx: 1, sy: 1 });
    expectNoFlicker(opening);
    const closing = await sampleFrames(host(page, 'one'), () => page.keyboard.press('Escape'), { probe: appearProbe });
    expect(closing.rest.probe).toMatchObject({ opacity: 0, sx: 0.96, sy: 0.96 });
    expectNoFlicker(closing);
    const exit = await resolveEasing(page, T('motion-close-easing'));
    expect(exit).toBe(await resolveEasing(page, '--tanrei-sys-motion-easing-standard-accelerate'));
    expectExitEnd(closing, { duration: await resolveToken(page, T('motion-close-duration'), 'duration'), easing: bezierOf(exit) });
  });

  test('SEL-30: the list appears as a popover\'s container does over motion.open-*, leaves the same way over motion.close-*, and only fades, over role.reduced, where motion is reduced; closed or closing it takes no pointer input; the value and the open state change when it closes, not when its motion ends', async ({ page }) => {
    await mount(page, [fx('one', { value: 'fr' })], { reducedMotion: false });
    // The motions at 40 s, each ended by hand: what is read 'still fading' is read some round trips after the change that
    // begins the fade, and at 400 ms a runner that takes 150 ms an answer read a list that had arrived. The durations are
    // read from the list after the override, so the binding to the tokens is still what is proved.
    await override(page, { [T('motion-open-duration')]: '40s', [T('motion-close-duration')]: '40s' });
    await listen(page, 'one');
    const motion = part(page, 'one', '.motion');
    const arrive = () => motion.evaluate((el) => el.getAnimations().forEach((animation) => animation.finish()));
    await container(page, 'one').click();
    await shownList(page, 'one').toBe(true);
    expect(await motion.evaluate((el) => [getComputedStyle(el).transitionProperty, getComputedStyle(el).transitionDuration, getComputedStyle(el).transformOrigin.endsWith(' 0px')])).toEqual(['opacity, scale, translate, filter, display, overlay', '40s', true]);
    expect(Number(await css(motion, 'opacity')), 'still fading in').toBeLessThan(1);
    await arrive();
    await expect.poll(async () => Number(await css(motion, 'opacity'))).toBe(1);
    // Choosing: the value and open change at once, while the list is still fading out.
    await row(page, 'one', 'Kenya').click();
    expect(await read(page, 'one')).toMatchObject({ value: 'ke', open: false, expanded: 'false' });
    expect(await heard(page)).toEqual(['toggle true', 'change ke', 'toggle false select']);
    expect(await part(page, 'one', '.surface').evaluate((el) => [el.matches(':popover-open'), getComputedStyle(el).pointerEvents, el.inert]), 'still drawn, taking no input').toEqual([true, 'none', true]);
    expect(await css(motion, 'transition-duration')).toBe('40s');
    // Told to open while still closing: it turns round from where it is. (It had faded for a few answers of 40 s: from
    // nothing it would be near 0 now, from where it was it is near 1.)
    await container(page, 'one').click();
    expect((await read(page, 'one')).open).toBe(true);
    expect(Number(await css(motion, 'opacity')), 'not started again from nothing').toBeGreaterThan(0.5);
    await arrive();
    await expect.poll(async () => Number(await css(motion, 'opacity'))).toBe(1);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await read(page, 'one')).open).toBe(false);
    await arrive();
    await closedList(page, 'one');
    // Reduced motion: only a fade, over role.reduced — no scale, no distance.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await container(page, 'one').click();
    expect(await motion.evaluate((el) => [getComputedStyle(el).transitionProperty, Number.parseFloat(getComputedStyle(el).transitionDuration) * 1000, getComputedStyle(el).scale])).toEqual(['opacity, display, overlay', await resolveToken(page, '--tanrei-sys-motion-role-reduced', 'duration'), 'none']);
    await expect.poll(async () => Number(await css(motion, 'opacity'))).toBe(1);
    await page.keyboard.press('Escape');
    await expect.poll(() => part(page, 'one', '.surface').evaluate((el) => el.matches(':popover-open'))).toBe(false);
  });

  test('SEL-31: the opening list makes the chosen option active, or the first that is not disabled where none is chosen; Down and Up Arrow move by one across groups and stop at the ends, Home and End go to the first and last, Page Down and Page Up move by ten; a disabled option is reached like any other, a title never; nothing here changes the value, and the active option is scrolled into view', async ({ page }) => {
    await mount(page, [
      fx('none', {}, [option('A', 'a', { disabled: true }), group('Group', [option('B', 'b'), option('C', 'c', { disabled: true })]), option('D', 'd')]),
      fx('many', { value: 'o12' }, MANY),
    ]);
    await listen(page, 'none');
    await focusSelect(page, 'none');
    await page.keyboard.press('Enter');
    await shownList(page, 'none').toBe(true);
    const active = async (id: string) => (await read(page, id)).active;
    expect(await active('none'), 'the first that is not disabled').toBe('B');
    const steps: [string, string][] = [['ArrowUp', 'A'], ['ArrowUp', 'A'], ['ArrowDown', 'B'], ['ArrowDown', 'C'], ['ArrowDown', 'D'], ['ArrowDown', 'D'], ['Home', 'A'], ['End', 'D']];
    for (const [key, expected] of steps) {
      await page.keyboard.press(key);
      expect(await active('none'), key).toBe(expected);
    }
    expect([(await read(page, 'none')).value, await heard(page)]).toEqual(['', ['toggle true']]);
    await page.keyboard.press('Escape');
    // A long list: the chosen one first, then by ten, stopping at the ends, each scrolled into view.
    await focusSelect(page, 'many');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'many').toBe(true);
    expect(await active('many')).toBe('Option 12');
    const inView = async (label: string) => {
      const [l, r] = [await box(part(page, 'many', '.list')), await box(row(page, 'many', label))];
      return r.y >= l.y - 0.6 && r.y + r.height <= l.y + l.height + 0.6;
    };
    for (const [key, expected] of [['PageDown', 'Option 22'], ['PageDown', 'Option 24'], ['PageUp', 'Option 14'], ['PageUp', 'Option 4'], ['PageUp', 'Option 1'], ['End', 'Option 24'], ['Home', 'Option 1']] as const) {
      await page.keyboard.press(key);
      expect(await active('many'), key).toBe(expected);
      await expect.poll(() => inView(expected), { message: `${expected} is in view` }).toBe(true);
    }
    expect((await read(page, 'many')).value).toBe('o12');
    expect(await page.evaluate(() => window.scrollY), 'the page does not scroll').toBe(0);
  });

  test('SEL-32: the option that is active by the keyboard is drawn focused with the focus ring inside its row; a pointer that moves onto an option makes it the active one, hovered and without the ring, so the arrow keys go on from it; when the pointer leaves the list the option stays active', async ({ page }) => {
    await mount(page, [fx('one', { value: 'fr' })], { reducedMotion: true });
    await focusSelect(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    await page.keyboard.press('ArrowDown');
    const japan = row(page, 'one', 'Japan');
    expect(await read(page, 'one')).toMatchObject({ active: 'Japan', ring: ['Japan'] });
    expect(await css(japan, 'background-color')).toBe(await color(page, 'stacked-focused-option-container-color'));
    expect(await japan.evaluate((el) => [getComputedStyle(el).outlineStyle, Number.parseFloat(getComputedStyle(el).outlineOffset) < 0, getComputedStyle(el).transitionProperty.includes('outline')]), 'the ring, inside the row, never animated').toEqual(['solid', true, false]);
    near(await px(japan, 'outline-width'), await resolveToken(page, '--tanrei-sys-focus-outer-width'), 'the ring’s width');
    // The pointer moves onto another option.
    await row(page, 'one', 'Canada').hover();
    const canada = row(page, 'one', 'Canada');
    await expect.poll(async () => (await read(page, 'one')).active).toBe('Canada');
    expect((await read(page, 'one')).ring, 'no ring for the pointer').toEqual([]);
    expect(await css(canada, 'outline-style')).toBe('none');
    expect(await css(canada, 'background-color')).toBe(await color(page, 'stacked-hovered-option-container-color'));
    // The arrow keys continue from it.
    await page.keyboard.press('ArrowDown');
    expect(await read(page, 'one')).toMatchObject({ active: 'France', ring: ['France'] });
    // The pointer leaves the list: the option stays active.
    await row(page, 'one', 'Kenya').hover();
    await expect.poll(async () => (await read(page, 'one')).active).toBe('Kenya');
    await page.mouse.move(700, 600);
    expect((await read(page, 'one')).active).toBe('Kenya');
  });

  test('SEL-33: characters typed within a second of each other are one string, and the next option after the active one whose label begins with it — whatever the case, wrapping to the first — becomes active; one character typed again moves on to the next; on a closed select the first character opens the list and then does the same; typing never changes the value, and a Space typed within that second is a character', async ({ page }) => {
    await mount(page, [fx('one', { value: 'ca' }, [option('Canada', 'ca'), option('Chile', 'cl'), option('China', 'cn'), option('New Caledonia', 'nc'), option('New Zealand', 'nz'), option('Norway', 'no')])]);
    await listen(page, 'one');
    await focusSelect(page, 'one');
    const active = async () => (await read(page, 'one')).active;
    // The second is counted on the page's clock, held still and moved on by the test: the keys of one string are typed
    // at one moment of it, however long the machine takes between them, and "after a second" is 1001 ms on.
    await holdClock(page);
    await page.keyboard.press('n');
    await shownList(page, 'one').toBe(true);
    expect([await active(), (await read(page, 'one')).value, await heard(page)], 'the first character opens the list and looks').toEqual(['New Caledonia', 'ca', ['toggle true']]);
    // A longer string keeps matching from the active option; a Space within the second is a character.
    await page.keyboard.type('ew');
    expect(await active()).toBe('New Caledonia');
    await page.keyboard.press('Space');
    await page.keyboard.press('Z');
    expect([await active(), (await read(page, 'one')).open], '"new z", whatever the case; the Space did not choose').toEqual(['New Zealand', true]);
    await page.clock.runFor(1001);
    // One character typed again moves on, and wraps.
    for (const expected of ['Canada', 'Chile', 'China', 'Canada', 'Chile']) {
      await page.keyboard.press('c');
      expect(await active()).toBe(expected);
    }
    await page.clock.runFor(1001);
    await page.keyboard.press('x');
    expect(await active(), 'nothing begins with it: the active option stays').toBe('Chile');
    expect([(await read(page, 'one')).value, await heard(page)]).toEqual(['ca', []]);
    // After the second has passed a Space chooses.
    await page.clock.runFor(1001);
    await releaseClock(page);
    await page.keyboard.press('Space');
    await closedList(page, 'one');
    expect(await heard(page)).toEqual(['change cl', 'toggle false select']);
  });

  test('SEL-34: a press on an option, or Enter or Space on the active one, sets value, shows its label and emits change once with the new value, then closes the list with the reason select, so toggle follows change; the chosen option chosen again emits no change and still closes; setting value from the product emits nothing', async ({ page }) => {
    await mount(page, [fx('one', { value: 'fr' })], { reducedMotion: true });
    await listen(page, 'one');
    await container(page, 'one').click();
    await row(page, 'one', 'Kenya').click();
    await closedList(page, 'one');
    expect(await heard(page)).toEqual(['toggle true', 'change ke', 'toggle false select']);
    await expect(part(page, 'one', '.value')).toHaveText('Kenya');
    for (const [key, moves, expected] of [['Enter', 'ArrowDown', 'nz'], ['Space', 'ArrowUp', 'ke']] as const) {
      await page.keyboard.press('ArrowDown');
      await shownList(page, 'one').toBe(true);
      await page.keyboard.press(moves);
      await page.waitForTimeout(1050);
      await page.keyboard.press(key);
      await closedList(page, 'one');
      expect(await heard(page), key).toEqual(['toggle true', `change ${expected}`, 'toggle false select']);
      expect((await read(page, 'one')).focused).toBe(true);
    }
    // The chosen option again: no change, and it still closes.
    await container(page, 'one').click();
    await row(page, 'one', 'Kenya').click();
    await closedList(page, 'one');
    expect(await heard(page)).toEqual(['toggle true', 'toggle false select']);
    // From the product: the label follows, and nothing is emitted.
    await set(page, 'one', { value: 'ca' });
    await expect(part(page, 'one', '.value')).toHaveText('Canada');
    expect(await heard(page)).toEqual([]);
    // Without clearable the select has no way of its own back to nothing chosen (SEL-72).
    expect(await part(page, 'one', '[part~="clear-button"], button').count()).toBe(0);
  });

  test('SEL-35: a disabled option is not chosen by any input and leaves the list open when it is pressed or Enter or Space is pressed on it; it is exposed as disabled and drawn from the disabled tokens of its condition; a disabled option whose value is the select’s is still the chosen one, with the fill and the check from the disabled tokens', async ({ page }) => {
    await mountSpec(page, ['open-supporting-text', 'open-disabled-chosen'], { reducedMotion: true });
    const id = 'open-supporting-text';
    await set(page, id, { inline: false, open: false });
    await listen(page, id);
    await container(page, id).click();
    await shownList(page, id).toBe(true);
    const enterprise = row(page, id, 'Enterprise');
    expect(await enterprise.getAttribute('aria-disabled')).toBe('true');
    await pressOn(enterprise);
    await page.keyboard.press('End');
    expect((await read(page, id)).active, 'reached by the keys').toBe('Enterprise');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1050);
    await page.keyboard.press('Space');
    expect([await read(page, id), await heard(page)]).toMatchObject([{ open: true, value: 'team', shown: true }, ['toggle true']]);
    expect(await enterprise.getAttribute('data-pressed'), 'no pressed state').toBeNull();
    await page.mouse.move(700, 600);
    await page.keyboard.press('Home');
    expect(await css(enterprise, 'background-color')).toBe(await color(page, 'stacked-disabled-option-container-color'));
    expect(await css(enterprise.locator('.option-label'), 'color')).toBe(await color(page, 'stacked-disabled-option-label-color'));
    expect(await css(enterprise.locator('.option-supporting'), 'color')).toBe(await color(page, 'stacked-disabled-option-supporting-text-color'));
    near(Number(await css(enterprise, 'opacity')), Number((await css(page.locator('html'), ROW('disabled-opacity'))).trim()), 'disabled opacity', 0.001);
    // Chosen and disabled: the container shows it, and its row draws the fill and the check from the disabled tokens.
    const chosen = row(page, 'open-disabled-chosen', 'Enterprise');
    await expect(part(page, 'open-disabled-chosen', '.value')).toHaveText('Enterprise');
    expect(await chosen.getAttribute('aria-selected')).toBe('true');
    await page.mouse.move(700, 600);
    expect(await css(chosen, 'background-color')).toBe(await color(page, 'stacked-disabled-selected-option-container-color'));
    expect(await css(chosen.locator('.check'), 'color')).toBe(await color(page, 'stacked-disabled-selected-option-mark-color'));
    expect(await css(chosen.locator('.check'), 'visibility')).toBe('visible');
  });

  test('SEL-36: the product’s open shows and removes the list without toggle; its value moves the label, the fill and the check without change or toggle and leaves the active option where it is; options that change while the list is open keep the active option where its value still exists; a status that changes while the list is open is drawn as it then is and the list stays open; a select that becomes disabled or read-only, or is left with nothing to show, while open closes without toggle', async ({ page }) => {
    await mount(page, [fx('one', { value: 'fr' })], { reducedMotion: true });
    await listen(page, 'one');
    await set(page, 'one', { open: true });
    await shownList(page, 'one').toBe(true);
    expect(await read(page, 'one')).toMatchObject({ active: 'France', selected: ['France'], expanded: 'true' });
    await focusSelect(page, 'one');
    await page.keyboard.press('ArrowDown');
    await set(page, 'one', { value: 'nz' });
    expect(await read(page, 'one'), 'the fill and the check move; the active option stays').toMatchObject({ active: 'Japan', selected: ['New Zealand'], shownValue: 'New Zealand', open: true });
    // The options change: the active option's value still exists…
    await host(page, 'one').evaluate((el) => el.querySelector('[value="ca"]')!.remove());
    await expect.poll(() => rows(page, 'one').count()).toBe(4);
    expect((await read(page, 'one')).active).toBe('Japan');
    // …and then it does not: the option an opening list makes active (the chosen one).
    await host(page, 'one').evaluate((el) => el.querySelector('[value="jp"]')!.remove());
    await expect.poll(async () => (await read(page, 'one')).active).toBe('New Zealand');
    await set(page, 'one', { open: false });
    await closedList(page, 'one');
    expect(await heard(page), 'nothing was emitted').toEqual([]);
    // Disabled, read-only, or without options while open: closed, silently.
    for (const change of [{ disabled: true }, { readOnly: true }] as const) {
      await set(page, 'one', { open: true });
      await shownList(page, 'one').toBe(true);
      await set(page, 'one', change);
      await closedList(page, 'one');
      await set(page, 'one', { disabled: false, readOnly: false });
      expect((await read(page, 'one')).open).toBe(false);
    }
    await set(page, 'one', { open: true });
    await shownList(page, 'one').toBe(true);
    await host(page, 'one').evaluate((el) => el.replaceChildren());
    await closedList(page, 'one');
    expect(await heard(page)).toEqual([]);
    // Without options but with a status, it opens and stays open while the status changes; left with nothing to show,
    // it closes, silently.
    await set(page, 'one', { status: 'loading', statusText: 'Loading countries', open: true });
    await shownList(page, 'one').toBe(true);
    await expect(part(page, 'one', '.status tanrei-loading-indicator')).toHaveCount(1);
    await set(page, 'one', { status: 'error', statusText: 'Countries could not be loaded.' });
    expect((await read(page, 'one')).shown).toBe(true);
    await expect(part(page, 'one', '.status .status-text')).toHaveText('Countries could not be loaded.');
    await set(page, 'one', { status: 'idle', statusText: '' });
    await closedList(page, 'one');
    expect(await heard(page)).toEqual([]);
  });

  test('SEL-37: an option is one row — option.padding-inline from each edge, the leading icon column as SEL-66 says, the label with the supporting text below it, and the check’s box at the end, option.gap apart — at least option.height and the minimum target tall, wrapping and growing rather than cutting; the whole row is the hit area', async ({ page }) => {
    await mountSpec(page, ['stacked-open', 'open-icons', 'open-supporting-text', 'open-long-options']);
    const [pad, gap, mark, block] = [await token(page, 'option-padding-inline-regular'), await token(page, 'option-gap-regular'), await token(page, 'option-mark-size-regular'), await token(page, 'option-padding-block-regular')];
    const r = row(page, 'stacked-open', 'Canada');
    const [rb, label, check] = [await box(r), await box(r.locator('.option-label')), await box(r.locator('.mark'))];
    near(label.x - rb.x, pad, 'padding-inline at the start');
    near(rb.x + rb.width - (check.x + check.width), pad, 'padding-inline at the end');
    near(check.width, mark, 'the check’s box');
    near(check.height, mark, 'the check’s box');
    expect(rb.height).toBeGreaterThanOrEqual(Math.max(await token(page, 'option-height-regular'), await resolveToken(page, '--tanrei-sys-target-pointer')) - 0.6);
    near(await px(r.locator('.option-label'), 'font-size'), await token(page, 'option-label-typescale-font-size'), 'the label’s style');
    // The spec's verify: the label starts 16 from the list's edge, where the value starts in a medium container.
    near(label.x - (await box(part(page, 'stacked-open', '.list'))).x, (await token(page, 'list-padding-inline')) + pad, 'from the list’s edge');
    near(label.x, (await box(part(page, 'stacked-open', '.value'))).x, 'where the value starts');
    // The icon column: kept in every row, a gap before the label.
    const light = row(page, 'open-icons', 'Light');
    const [icon, text] = [await box(light.locator('.option-icon')), await box(light.locator('.option-label'))];
    near(icon.x - (await box(light)).x, pad, 'the icon at the row’s padding');
    near(text.x - (icon.x + icon.width), gap, 'option.gap');
    // An option without a glyph keeps the column, so that labels align.
    await host(page, 'open-icons').evaluate((el) => el.querySelector('[value="auto"]')!.removeAttribute('leading-icon'));
    await expect.poll(async () => (await box(row(page, 'open-icons', 'Follow the device').locator('.option-label'))).x).toBe(text.x);
    // The supporting text is below the label, in its own style; the row grows.
    const team = row(page, 'open-supporting-text', 'Team');
    const [l, s] = [await box(team.locator('.option-label')), await box(team.locator('.option-supporting'))];
    expect(s.y).toBeGreaterThanOrEqual(l.y + l.height - 0.6);
    near(s.x, l.x, 'under the label');
    near(await px(team.locator('.option-supporting'), 'font-size'), await token(page, 'option-supporting-text-typescale-font-size'), 'the supporting text’s style');
    // Long labels wrap and the row grows; nothing is cut.
    const long = rows(page, 'open-long-options').first();
    expect((await box(long)).height).toBeGreaterThan(rb.height + 10);
    expect(await long.locator('.option-label').evaluate((el) => [el.scrollWidth <= el.clientWidth + 1, getComputedStyle(el).textOverflow])).toEqual([true, 'clip']);
    near((await box(long.locator('.row-content'))).y - (await box(long)).y, block, 'padding-block above its content');
    // The whole row is the hit area: a press at its very end chooses.
    await mount(page, [fx('one', { value: 'fr' })], { reducedMotion: true });
    await container(page, 'one').click();
    await shownList(page, 'one').toBe(true);
    const end = await box(row(page, 'one', 'Kenya'));
    await page.mouse.click(end.x + end.width - 2, end.y + end.height - 2);
    await expect.poll(async () => (await read(page, 'one')).value).toBe('ke');
  });

  test('SEL-38: every option and selected-option token equals the menu’s unselected and selected token of the same part and state, and every token of the list and the row the menu’s surface and container token, in every scheme of the default system and of each preset', async ({ page }) => {
    const asTheMenu = (name: string): string | null => {
      const own = name.replace('--tanrei-comp-select-', '');
      const rules: [RegExp, string][] = [
        [/^list-(color|elevation|shape|padding-block|padding-inline|min-width|max-width|offset|viewport-margin)$/, 'surface-$1'],
        [/^option-(shape|(?:height|padding-inline|padding-block|gap)-(?:regular|compact))$/, 'container-$1'],
        [/^option-((?:label|supporting-text)-typescale-.+|(?:leading-icon-size|mark-size)-(?:regular|compact))$/, '$1'],
        [/^(group-title-.+|group-gap|divider-(?:color|space|thickness)|separation)$/, '$1'],
        [/^(motion-(?:feedback-duration|open-duration|open-easing|close-duration|close-easing))$/, '$1'],
        [/^(?:stacked|filled|outlined)-((?:hovered|focused|pressed|disabled)-)?option-([a-z-]+-color)$/, 'unselected-$1$2'],
        [/^(?:stacked|filled|outlined)-((?:hovered|focused|pressed|disabled)-)?selected-option-([a-z-]+-color)$/, 'selected-$1$2'],
      ];
      const rule = rules.find(([from]) => from.test(own));
      return rule ? `--tanrei-comp-menu-${own.replace(rule[0], rule[1])}` : null;
    };
    for (const system of SYSTEMS) {
      const sheet = fs.readFileSync(path.join(pkg, 'dist/tokens.css'), 'utf8') + (system ? fs.readFileSync(path.join(pkg, `dist/systems/${system}.css`), 'utf8') : '');
      const menu = new Set(declared(sheet, 'menu'));
      const pairs = declared(sheet, 'select')
        .map((name) => [name, asTheMenu(name)] as const)
        .filter((pair): pair is readonly [string, string] => !!pair[1] && menu.has(pair[1]));
      expect(pairs.length, `${system ?? 'tanrei'}: the pairs`).toBeGreaterThan(190);
      for (const theme of THEMES) {
        await mount(page, [fx('one', {})], { system, theme });
        const values = await computed(page, pairs.flat());
        const differing = pairs.filter(([mine, theirs]) => values[mine] !== values[theirs]).map(([mine, theirs]) => `${mine}: ${values[mine]} ≠ ${theirs}: ${values[theirs]}`);
        expect(differing, `${system ?? 'tanrei'} ${theme}`).toEqual([]);
      }
    }
  });

  test('SEL-38: an option is drawn from the condition it is in — selected-option for the chosen one, option for every other — and the state it is in, pressed over focused over hovered: its row’s fill within option.shape, its label, supporting text and leading icon in that condition’s colors, the same under every variant, changing over motion.state-*', async ({ page }) => {
    await mountSpec(page, ['open-supporting-text', 'open-icons'], { reducedMotion: true });
    const id = 'open-supporting-text';
    const paints = async (label: string, condition: string, state: string) => {
      const r = row(page, id, label);
      const t = (partName: string) => color(page, `stacked-${state ? `${state}-` : ''}${condition}-${partName}-color`);
      expect(await css(r, 'background-color'), `${label} ${state} fill`).toBe(await t('container'));
      expect(await css(r.locator('.option-label'), 'color'), `${label} ${state} label`).toBe(await t('label'));
      expect(await css(r.locator('.option-supporting'), 'color'), `${label} ${state} supporting`).toBe(await t('supporting-text'));
    };
    await page.mouse.move(700, 600);
    await paints('Free', 'option', '');
    await paints('Team', 'selected-option', '');
    await row(page, id, 'Free').hover();
    await paints('Free', 'option', 'hovered');
    await row(page, id, 'Team').hover();
    await paints('Team', 'selected-option', 'hovered');
    // Focused over hovered: the keyboard makes the hovered row the focused one.
    await set(page, id, { inline: false, open: false });
    await focusSelect(page, id);
    await page.keyboard.press('ArrowDown');
    await shownList(page, id).toBe(true);
    // …with the pointer resting on the row: the keys leave Free and come back to it, and it is drawn focused.
    await row(page, id, 'Free').hover();
    await page.keyboard.press('ArrowDown');
    await paints('Team', 'selected-option', 'focused');
    await page.keyboard.press('ArrowUp');
    await paints('Free', 'option', 'focused');
    await page.keyboard.press('ArrowDown');
    // Pressed over focused (the overlay feedback paints the whole row from the pressed tokens).
    const b = await box(row(page, id, 'Team'));
    await page.mouse.move(b.x + 20, b.y + 10);
    await page.mouse.down();
    await paints('Team', 'selected-option', 'pressed');
    await page.mouse.move(700, 600);
    await page.mouse.up();
    // The row's shape, the icon's color, and the motion.
    const r = row(page, 'open-icons', 'Light');
    near(await px(r, 'border-top-left-radius'), await token(page, 'option-shape'), 'option.shape');
    expect(await r.getAttribute('data-tanrei-shape')).not.toBeNull();
    expect(await css(r.locator('.option-icon'), 'color')).toBe(await color(page, 'stacked-option-leading-icon-color'));
    expect(await css(row(page, 'open-icons', 'Dark').locator('.option-icon'), 'color')).toBe(await color(page, 'stacked-selected-option-leading-icon-color'));
    expect(await px(r, 'transition-duration')).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    near((await px(r, 'transition-duration')) * 1000, await resolveToken(page, ROW('motion-state-duration'), 'duration'), 'motion.state-duration', 1);
    // The same list under another look of the field.
    await mount(page, [fx('s', { variant: 'stacked', value: 'fr', open: true }), fx('o', { variant: 'outlined', value: 'fr', open: true })], { system: 'm3-like' });
    for (const [label, property] of [['France', 'background-color'], ['Canada', 'background-color']] as const) expect(await css(row(page, 'o', label), property)).toBe(await css(row(page, 's', label), property));
    expect(await css(row(page, 'o', 'France').locator('.check'), 'color')).toBe(await color(page, 'outlined-selected-option-mark-color'));
  });

  test('SEL-39: the chosen option’s row is filled with the selected-option container color and draws the icon set’s check centred in the box at its end, in the mark color, in the selected family and fill; no other row draws anything there; the check is never mirrored and is never left out — the fill never shows the choice alone; it fades over motion.state-* without moving', async ({ page }) => {
    await mountSpec(page, ['stacked-open', 'open-rtl'], { reducedMotion: false });
    const id = 'stacked-open';
    const chosen = row(page, id, 'Japan');
    const check = chosen.locator('.check');
    await page.mouse.move(700, 600);
    expect(await css(chosen, 'background-color')).toBe(await color(page, 'stacked-selected-option-container-color'));
    await expect(check).toHaveText('check');
    expect(await check.evaluate((el) => [getComputedStyle(el).visibility, getComputedStyle(el).opacity, el.closest('[aria-hidden="true"]') !== null])).toEqual(['visible', '1', true]);
    expect(await css(check, 'color')).toBe(await color(page, 'stacked-selected-option-mark-color'));
    const root = page.locator('html');
    expect(await css(check, 'font-family')).toContain((await css(root, '--tanrei-sys-icon-family-selected')).replaceAll('"', '').trim());
    expect(await css(check, 'font-variation-settings')).toContain(`"FILL" ${(await css(root, '--tanrei-sys-icon-fill-selected')).trim()}`);
    expect(await css(check, 'font-variation-settings')).toContain(`"wght" ${(await css(root, '--tanrei-sys-icon-weight')).trim()}`);
    const [m, c] = [await box(chosen.locator('.mark')), await box(check)];
    near(c.x + c.width / 2, m.x + m.width / 2, 'centred in its box');
    near(c.y + c.height / 2, m.y + m.height / 2, 'centred in its box');
    near(c.width, await token(page, 'option-mark-size-regular'), 'mark.size');
    for (const label of ['Canada', 'France', 'Kenya', 'New Zealand']) expect(await css(row(page, id, label).locator('.check'), 'visibility'), label).toBe('hidden');
    // No path, shape or character of its own: the box holds the glyph's name and nothing else.
    expect(await chosen.locator('.mark').evaluate((el) => [el.querySelectorAll('svg, img').length, el.textContent?.trim()])).toEqual([0, 'check']);
    // Right-to-left: at the left of the row, not mirrored.
    const rtl = row(page, 'open-rtl', 'طوكيو');
    expect(await rtl.locator('.check').evaluate((el) => [el.hasAttribute('data-tanrei-mirrored'), getComputedStyle(el).transform, getComputedStyle(el).scale])).toEqual([false, 'none', 'none']);
    // A system whose fill is nothing still marks the chosen option.
    await override(page, { [T('stacked-selected-option-container-color')]: 'transparent' });
    expect(await css(check, 'visibility')).toBe('visible');
    // The chosen option changes while the list is open: the check fades, and does not move or scale.
    expect(await check.evaluate((el) => [getComputedStyle(el).transitionProperty.includes('opacity'), getComputedStyle(el).transitionProperty.includes('transform')])).toEqual([true, false]);
    near((await px(check, 'transition-duration')) * 1000, await resolveToken(page, ROW('motion-state-duration'), 'duration'), 'motion.state-duration', 1);
    await set(page, id, { value: 'ca' });
    await expect.poll(() => css(row(page, id, 'Canada').locator('.check'), 'opacity')).toBe('1');
    await expect.poll(() => css(check, 'visibility')).toBe('hidden');
  });

  test('SEL-40: an option’s leadingIcon is drawn at option.leading-icon.size by the icon helper, in the family and fill of the option’s condition — selected for the chosen option — in the leading-icon color of its condition and state, hidden from assistive technology; an empty name draws nothing', async ({ page }) => {
    await mountSpec(page, ['open-icons']);
    await page.mouse.move(700, 600);
    const root = page.locator('html');
    const [light, dark] = [row(page, 'open-icons', 'Light').locator('.option-icon'), row(page, 'open-icons', 'Dark').locator('.option-icon')];
    await expect(light).toHaveText('light_mode');
    near((await box(light)).width, await token(page, 'option-leading-icon-size-regular'), 'leading-icon.size');
    near((await box(light)).height, await token(page, 'option-leading-icon-size-regular'), 'leading-icon.size');
    expect(await css(light, 'font-variation-settings')).toContain(`"FILL" ${(await css(root, '--tanrei-sys-icon-fill-unselected')).trim()}`);
    expect(await css(dark, 'font-variation-settings')).toContain(`"FILL" ${(await css(root, '--tanrei-sys-icon-fill-selected')).trim()}`);
    expect(await css(dark, 'font-family')).toContain((await css(root, '--tanrei-sys-icon-family-selected')).replaceAll('"', '').trim());
    expect(await css(light, 'font-variation-settings')).toContain(`"wght" ${(await css(root, '--tanrei-sys-icon-weight')).trim()}`);
    expect(await css(light, 'color')).toBe(await color(page, 'stacked-option-leading-icon-color'));
    expect(await light.evaluate((el) => el.closest('[aria-hidden="true"]') !== null)).toBe(true);
    await host(page, 'open-icons').evaluate((el) => el.querySelector('[value="light"]')!.setAttribute('leading-icon', ''));
    await expect(light).toHaveText('');
    // No option has a glyph: no column at all.
    await host(page, 'open-icons').evaluate((el) => el.querySelectorAll('tanrei-option').forEach((o) => o.removeAttribute('leading-icon')));
    await expect(part(page, 'open-icons', '.option-icon')).toHaveCount(0);
  });

  test('SEL-41: a pressed option shows the pressed state without delay and keeps it for at least press-hold, even when the press ends sooner — by pointer and by Enter', async ({ page }) => {
    await mount(page, [fx('one', { value: 'fr' })], { reducedMotion: false });
    await override(page, { '--tanrei-sys-motion-duration-press-hold': '300ms', [T('motion-close-duration')]: '1500ms' });
    const kenya = row(page, 'one', 'Kenya');
    for (const by of ['pointer', 'key'] as const) {
      await focusSelect(page, 'one');
      await page.keyboard.press('ArrowDown');
      await shownList(page, 'one').toBe(true);
      // The rows are drawn while the list is shown: this opening's row is watched, and the list closes by fading out
      // (over longer than press-hold), with the row in it.
      await grownIn(page, 'one');
      await watchPress(kenya);
      if (by === 'pointer') await kenya.click();
      else {
        await page.keyboard.press('End');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Enter');
      }
      // Set in the turn of the event (the press has ended already), and there for press-hold from that event on —
      // counted from the event, not from when an observer hears of it: Enter chooses and closes before it returns.
      expect((await expectPressShownAndHeld(page, 300, by)).feedback, by).toBe('overlay');
      await closedList(page, 'one');
      await set(page, 'one', { value: 'fr' });
    }
  });

  test('SEL-42: a pressed option answers as sys.behavior.pressed-feedback names — overlay, ripple (from the point of contact, from the centre for the keyboard), dim or none — with the ripple growing over motion.feedback-duration and appearing whole where motion is reduced', async ({ page }) => {
    for (const feedback of ['overlay', 'ripple', 'dim', 'none'] as const) {
      await mount(page, [fx('one', { value: 'fr', open: true })], { reducedMotion: true });
      await override(page, { '--tanrei-sys-behavior-pressed-feedback': feedback, '--tanrei-sys-motion-duration-press-hold': '400ms' });
      const kenya = row(page, 'one', 'Kenya');
      const b = await box(kenya);
      await page.mouse.move(b.x + 30, b.y + b.height / 2);
      const hovered = await css(kenya, 'background-color');
      await page.mouse.down();
      expect(await kenya.getAttribute('data-pressed'), feedback).toBe(feedback);
      const fill = await css(kenya, 'background-color');
      if (feedback === 'overlay') expect(fill).toBe(await color(page, 'stacked-pressed-option-container-color'));
      else expect(fill, `${feedback}: the fill stays with the state under the press`).toBe(hovered);
      if (feedback === 'ripple') {
        const ripple = kenya.locator('.ripple');
        await expect(ripple).toHaveCount(1);
        expect(await css(ripple, 'background-color')).toBe(await color(page, 'stacked-pressed-option-container-color'));
        near(Number.parseFloat(await ripple.evaluate((el) => el.style.getPropertyValue('--_x'))), 30, 'from the point of contact', 1);
        expect(await css(ripple, 'animation-name'), 'whole at once where motion is reduced').toBe('none');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        expect(await css(ripple, 'animation-name')).not.toBe('none');
        near((await px(ripple, 'animation-duration')) * 1000, await duration(page, 'motion-feedback-duration'), 'motion.feedback-duration', 1);
        await page.emulateMedia({ reducedMotion: 'reduce' });
      } else await expect(kenya.locator('.ripple')).toHaveCount(0);
      if (feedback !== 'none') expect(await css(kenya.locator('.option-label'), 'color')).toBe(await color(page, 'stacked-pressed-option-label-color'));
      await page.mouse.move(700, 600);
      await page.mouse.up();
    }
    // The keyboard: the ripple grows from the row's centre.
    await mount(page, [fx('one', { value: 'fr' }, [option('France', 'fr'), option('Kenya', 'ke', { disabled: false })])], { reducedMotion: false });
    // (20 s each: the layer is read an answer after Enter, which chooses and closes — it is there for press-hold, in a
    // row that is drawn while the list fades out, and 500 ms and 800 ms are one answer of a slow runner.)
    await override(page, { '--tanrei-sys-behavior-pressed-feedback': 'ripple', '--tanrei-sys-motion-duration-press-hold': '20000ms', [T('motion-close-duration')]: '20000ms' });
    await focusSelect(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    await page.keyboard.press('ArrowDown');
    const kenya = row(page, 'one', 'Kenya');
    // Grown in: the list then closes by fading out, with the pressed row in it.
    await grownIn(page, 'one');
    const width = (await box(kenya)).width;
    await page.keyboard.press('Enter');
    near(Number.parseFloat(await kenya.locator('.ripple').evaluate((el) => el.style.getPropertyValue('--_x'))), width / 2, 'from the centre', 1);
  });

  test('SEL-43: an option’s corners are eased by sys.shape.corner-smoothing and its keyboard focus is shown as sys.behavior.focus-style names — the ring, or the glow inside its row', async ({ page }) => {
    await mount(page, [fx('one', { value: 'fr' })], { system: 'cupertino' });
    await focusSelect(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    const france = row(page, 'one', 'France');
    const smoothing = Number((await css(page.locator('html'), '--tanrei-sys-shape-corner-smoothing')).trim());
    expect(smoothing).toBeGreaterThan(0);
    const supported = await page.evaluate(() => CSS.supports('corner-shape', 'superellipse(2)'));
    if (supported) near(await px(france, 'border-top-left-radius'), (await token(page, 'option-shape')) * (1 + 0.4 * smoothing), 'the eased radius');
    else near(await px(france, 'border-top-left-radius'), await token(page, 'option-shape'), 'the quarter circle where the curve cannot be drawn');
    expect(await css(france, 'outline-style'), 'the ring').toBe('solid');
    // Glow: the halo inside the row, and no line.
    await mount(page, [fx('one', { value: 'fr' })], { system: 'acme', systemCss: await acmeSystemCss() });
    await focusSelect(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    const glowing = row(page, 'one', 'France');
    expect(await glowing.getAttribute('data-focus-style')).toBe('glow');
    expect(await glowing.evaluate((el) => [getComputedStyle(el).outlineColor, getComputedStyle(el, '::after').boxShadow !== 'none'])).toEqual(['rgba(0, 0, 0, 0)', true]);
  });

  test('SEL-44: a group’s title is drawn above its options in group-title.typescale and color, inset by group-title.padding-inline, with option.padding-block above and below, wrapping; it takes no focus, is never the active option, is not reached by typing and scrolls with its options; a group inside a group gives its options to the outer one, and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => f.id === 'open-groups'),
      fx('nested', { value: 'a', open: true }, '<tanrei-option-group label="Outer"><tanrei-option value="a">A</tanrei-option><tanrei-option-group label="Inner"><tanrei-option value="b">B</tanrei-option></tanrei-option-group><tanrei-option value="c">C</tanrei-option></tanrei-option-group>'),
    ]);
    const id = 'open-groups';
    const title = part(page, id, '.group-title').first();
    await expect(title).toHaveText('Asia');
    expect(await css(title, 'color')).toBe(await color(page, 'group-title-color'));
    near(await px(title, 'font-size'), await token(page, 'group-title-typescale-font-size'), 'group-title.typescale');
    near(await px(title, 'padding-left'), await token(page, 'group-title-padding-inline-regular'), 'padding-inline');
    near(await px(title, 'padding-top'), await token(page, 'option-padding-block-regular'), 'padding-block');
    near((await box(title)).x, (await box(rows(page, id).first())).x, 'from the rows’ start edge');
    expect((await box(title)).y + (await box(title)).height).toBeLessThanOrEqual((await box(rows(page, id).first())).y + 0.6);
    expect(await title.evaluate((el) => [el.tabIndex, el.getAttribute('role'), getComputedStyle(el).overflowWrap, el.closest('.scroll') !== null])).toEqual([-1, 'presentation', 'break-word', true]);
    await expect(part(page, id, '.group-title')).toHaveCount(2);
    // Never active, never reached by typing: "a" finds no option although a title begins with it.
    await set(page, id, { inline: false, open: false });
    await focusSelect(page, id);
    await page.keyboard.press('ArrowDown');
    await shownList(page, id).toBe(true);
    await page.keyboard.press('Home');
    expect((await read(page, id)).active).toBe('Tokyo');
    await page.keyboard.press('a');
    expect((await read(page, id)).active).toBe('Tokyo');
    await title.hover();
    expect((await read(page, id)).active).toBe('Tokyo');
    // Nested: one group, one title, the inner group's option in order among the outer's.
    await expect(part(page, 'nested', '.group')).toHaveCount(1);
    await expect(part(page, 'nested', '.group-title')).toHaveText(['Outer']);
    expect(await rows(page, 'nested').locator('.option-label').allTextContents()).toEqual(['A', 'B', 'C']);
    await expect(part(page, 'nested', '.divider')).toHaveCount(0);
    await expect.poll(() => seen.some((w) => w.includes('SEL-44'))).toBe(true);
  });

  test('SEL-45: a group is told from an adjacent group or option outside any group as separation names — auto takes comp.select.separation, divider draws a line of divider.thickness in divider.color with divider.space above and below, gap leaves group.gap and no line — never before the first or after the last element; an unknown value is auto, reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['open-groups', 'open-groups-divider', 'open-groups-gap'].includes(f.id)),
      fx('mixed', { value: 'x', open: true }, [option('X', 'x'), option('Y', 'y'), group('G', [option('Z', 'z')]), option('W', 'w')]),
      fx('odd', { value: 'x', open: true, separation: 'sometimes' }, [group('G', [option('X', 'x')]), group('H', [option('Y', 'y')])]),
    ]);
    const drawn = (id: string) =>
      host(page, id).evaluate((el) => {
        const all = (selector: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(selector)];
        const shown = (node: HTMLElement) => getComputedStyle(node).display !== 'none';
        return { dividers: all('.scroll > .divider').filter(shown).length, gaps: all('.scroll > .gap').filter(shown).length, places: all('.scroll > .divider').length };
      });
    expect((await css(page.locator('html'), T('separation'))).trim()).toBe((await css(page.locator('html'), '--tanrei-sys-behavior-separation')).trim());
    expect(await drawn('open-groups'), 'auto: the system’s divider').toEqual({ dividers: 2, gaps: 0, places: 2 });
    expect(await drawn('open-groups-divider')).toEqual({ dividers: 2, gaps: 0, places: 2 });
    expect(await drawn('open-groups-gap')).toEqual({ dividers: 0, gaps: 2, places: 2 });
    const divider = part(page, 'open-groups-divider', '.divider').first();
    near((await box(divider)).height, await token(page, 'divider-thickness'), 'divider.thickness');
    expect(await css(divider, 'background-color')).toBe(await color(page, 'divider-color'));
    near(await px(divider, 'margin-top'), await token(page, 'divider-space'), 'divider.space');
    near(await px(divider, 'margin-bottom'), await token(page, 'divider-space'), 'divider.space');
    const [l, d] = [await box(part(page, 'open-groups-divider', '.list')), await box(divider)];
    near(d.x - l.x, await token(page, 'list-padding-inline'), 'inside the list’s padding');
    near(l.x + l.width - (d.x + d.width), await token(page, 'list-padding-inline'), 'inside the list’s padding');
    near((await box(part(page, 'open-groups-gap', '.gap').first())).height, await token(page, 'group-gap'), 'group.gap');
    expect(await part(page, 'open-groups-gap', '.gap').first().getAttribute('aria-hidden')).toBe('true');
    // Between two options outside any group: nothing. Around a group: one on each side. Never first or last.
    expect(await drawn('mixed')).toEqual({ dividers: 2, gaps: 0, places: 2 });
    expect(await part(page, 'mixed', '.scroll').evaluate((el) => [el.firstElementChild!.classList.contains('row'), el.lastElementChild!.classList.contains('row')])).toEqual([true, true]);
    // The token, whatever the attribute's absence says; then the attribute over the token.
    await override(page, { [T('separation')]: 'gap' });
    await set(page, 'open-groups', { placeholder: 'x' });
    expect(await drawn('open-groups')).toEqual({ dividers: 0, gaps: 2, places: 2 });
    expect(await drawn('open-groups-divider'), 'the attribute wins').toEqual({ dividers: 2, gaps: 0, places: 2 });
    expect(await drawn('odd'), 'an unknown value is auto').toEqual({ dividers: 0, gaps: 1, places: 1 });
    await expect.poll(() => seen.some((w) => w.includes('SEL-45') && w.includes('sometimes'))).toBe(true);
  });

  test('SEL-66: iconSpace — auto keeps the leading icon column, empty, in a section where another option has an icon, and none in a section without icons; always in every option; never only in an option that has an icon; a section is a group or a run of options outside any group; decided again when an option changes; an unknown value is auto, reported', async ({ page }) => {
    const seen = warnings(page);
    const spaced = spec.fixtures.filter((f) => f.id.startsWith('icon-space-'));
    expect(spaced.map((f) => f.id)).toEqual(['icon-space-auto', 'icon-space-always', 'icon-space-never']);
    await mount(page, [
      ...spaced,
      fx('runs', { value: 'a', open: true }, [option('A', 'a', { leadingIcon: 'mail' }), option('B', 'b'), group('G', [option('C', 'c'), option('D', 'd')]), option('E', 'e')]),
      fx('odd', { value: 'a', open: true, iconSpace: 'sometimes' } as Fixture['props'], [group('G', [option('A', 'a', { leadingIcon: 'mail' }), option('B', 'b')]), group('H', [option('C', 'c')])]),
    ]);
    const [pad, gap, size] = [await token(page, 'option-padding-inline-regular'), await token(page, 'option-gap-regular'), await token(page, 'option-leading-icon-size-regular')];
    const none = pad;
    const kept = pad + size + gap;
    /** Where an option's label starts, from its row's start edge. */
    const at = async (id: string, label: string) => (await box(row(page, id, label).locator('.option-label'))).x - (await box(row(page, id, label))).x;
    const expectStarts = async (id: string, starts: Record<string, number>) => {
      for (const [label, start] of Object.entries(starts)) near(await at(id, label), start, `${id}: ${label}`);
    };
    expect(await host(page, 'icon-space-auto').evaluate((el: any) => el.iconSpace)).toBe('auto');
    // auto: the group Apps keeps the column on Copy link; the group Files has no icon and keeps none.
    await expectStarts('icon-space-auto', { Mail: kept, Messages: kept, 'Copy link': kept, Print: none, 'Save as PDF': none });
    await expect(row(page, 'icon-space-auto', 'Copy link').locator('.row-column.leading[aria-hidden="true"]')).toHaveCount(1);
    await expect(row(page, 'icon-space-auto', 'Print').locator('.row-column.leading')).toHaveCount(0);
    // A group's title keeps its own place whatever its section keeps (SEL-44).
    const titles = part(page, 'icon-space-auto', '.group-title');
    near((await box(titles.nth(0))).x, (await box(titles.nth(1))).x, 'the titles start alike');
    await expectStarts('icon-space-always', { Mail: kept, 'Copy link': kept, Print: kept, 'Save as PDF': kept });
    await expectStarts('icon-space-never', { Mail: kept, Messages: kept, 'Copy link': none, Print: none, 'Save as PDF': none });
    // Options outside any group are a section of their own, each run apart from the next.
    await expectStarts('runs', { A: kept, B: kept, C: none, D: none, E: none });
    // An unknown value is auto, reported.
    await expectStarts('odd', { A: kept, B: kept, C: none });
    await expect.poll(() => seen.some((w) => w.includes('(SEL-66)') && w.includes('sometimes'))).toBe(true);
    // Decided again: an icon given to Print keeps the column on Save as PDF; taken away, the group keeps none.
    await host(page, 'icon-space-auto').evaluate((el) => el.querySelector('[value="print"]')!.setAttribute('leading-icon', 'print'));
    await expect.poll(() => at('icon-space-auto', 'Save as PDF')).toBeCloseTo(kept, 0);
    await host(page, 'icon-space-auto').evaluate((el) => el.querySelector('[value="print"]')!.removeAttribute('leading-icon'));
    await expect.poll(() => at('icon-space-auto', 'Save as PDF')).toBeCloseTo(none, 0);
    // iconSpace changed while the list is shown.
    await host(page, 'icon-space-auto').evaluate((el: any) => (el.iconSpace = 'never'));
    await expect.poll(() => at('icon-space-auto', 'Copy link')).toBeCloseTo(none, 0);
    await host(page, 'icon-space-auto').evaluate((el) => el.setAttribute('icon-space', 'always'));
    await expect.poll(() => at('icon-space-auto', 'Print')).toBeCloseTo(kept, 0);
  });

  test('SEL-70: a compact select draws its options and group titles from the compact tokens — lower, set in less, smaller glyphs, the same text — as low as its density gives for a mouse and the touch target for touch, the field’s box unchanged; an unknown density is regular and reported, an added one is drawn from its tokens, and a change is drawn at once', async ({ page, browserName }) => {
    const seen = warnings(page);
    const compact = spec.fixtures.find((f) => f.id === 'density-compact')!;
    await mount(page, [
      compact,
      { ...compact, id: 'density-regular', props: { ...compact.props, density: 'regular' } },
      { ...compact, id: 'density-odd', props: { ...compact.props, density: 'huge' } as Fixture['props'] },
      { ...compact, id: 'density-added', props: { ...compact.props, density: 'roomy' } as Fixture['props'] },
    ]);
    const sizes = async (density: string) => {
      const [height, padBlock, padInline, gap, icon, mark, title] = await Promise.all(
        ['option-height', 'option-padding-block', 'option-padding-inline', 'option-gap', 'option-leading-icon-size', 'option-mark-size', 'group-title-padding-inline'].map((n) => token(page, `${n}-${density}`)),
      );
      return { height, padBlock, padInline, gap, icon, mark, title };
    };
    const [regular, small] = [await sizes('regular'), await sizes('compact')];
    // The default system's compact option: the menu's compact row, 32 high with 20 glyphs, 8 from its edges.
    expect([small.height, small.icon, small.mark, small.padInline]).toEqual([32, 20, 20, 8]);
    const pointer = await resolveToken(page, '--tanrei-sys-target-pointer');
    const drawn = async (id: string, label: string) => {
      const r = row(page, id, label);
      const [b, l, icon, font] = [await box(r), await box(r.locator('.option-label')), await px(r.locator('.option-icon'), 'font-size'), await css(r.locator('.option-label'), 'font-size')];
      return { height: b.height, start: l.x - b.x, icon, font };
    };
    const mail = await drawn('density-compact', 'Mail');
    const mailRegular = await drawn('density-regular', 'Mail');
    near(mail.height, small.height, 'a compact option');
    expect(mail.height).toBeLessThan(pointer);
    near(mail.icon, small.icon, 'its glyph');
    near(mail.start, small.padInline + small.icon + small.gap, 'its label after the padding, the glyph and the gap');
    near(mailRegular.height, Math.max(regular.height, pointer), 'a regular option');
    near(mailRegular.start, regular.padInline + regular.icon + regular.gap, 'a regular label');
    // The density never changes a text style; the check's box and a group's title take the density.
    expect(mail.font).toBe(mailRegular.font);
    const titles = part(page, 'density-compact', '.group-title');
    near(await px(titles.first(), 'padding-inline-start'), small.title, 'a group title’s inset');
    // The field's own box is size's, not the density's.
    near((await box(container(page, 'density-compact'))).height, (await box(container(page, 'density-regular'))).height, 'the field’s box');
    // An unknown density is drawn as regular, and a debug build says so.
    near((await drawn('density-odd', 'Mail')).height, mailRegular.height, 'an unknown density');
    await expect.poll(() => seen.filter((w) => w.includes('SEL-70') && w.includes('"huge"')).length).toBe(1);
    // A density a design system adds is drawn from its tokens, the default's where it has none.
    await rootTokens(page, { [T('option-height-roomy')]: '60px', [T('option-leading-icon-size-roomy')]: '28px' });
    await expect.poll(async () => (await drawn('density-added', 'Mail')).height).toBeCloseTo(60, 0);
    near((await drawn('density-added', 'Mail')).icon, 28, 'an added density’s glyph');
    // A change is drawn at once.
    await host(page, 'density-regular').evaluate((el: any) => (el.density = 'compact'));
    await expect.poll(async () => (await drawn('density-regular', 'Mail')).height).toBeCloseTo(mail.height, 0);
    // SEL-37: for touch a compact option is the touch target.
    if (browserName !== 'chromium') return;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    await expect.poll(async () => (await drawn('density-compact', 'Mail')).height).toBeCloseTo(await resolveToken(page, '--tanrei-sys-target-touch'), 0);
  });

  test('SEL-68, SEL-26, SEL-31, SEL-51, SEL-59: with a status the list draws a status row after the last option, outside the list box and the box that scrolls, inset and padded as an option, taking no input and never active — statusText, wrapping as text of its own direction, in status.typescale and status.color, in status.error.color while the source failed, and while loading one small loading indicator named by statusText in the text’s place, the row one line tall; the options left in the list stay choosable; a select with no option draws its empty text in the row’s place, its list without an active option; with no status the row takes no room', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['open-loading', 'open-status', 'open-status-error', 'open-empty', 'stacked-open'].includes(f.id)), fx('loading-more', { status: 'loading', statusText: 'Loading more countries', open: true })], { reducedMotion: true });
    const status = (id: string) => part(page, id, '.status');
    // Idle: the text, after the last option, outside the list box and the box that scrolls.
    let row_ = status('open-status');
    await expect(row_.locator('.status-text')).toHaveText('Your 3 most recent projects. Search for others on the Projects page.');
    const last = await box(rows(page, 'open-status').last());
    expect((await box(row_)).y, 'after the last option').toBeGreaterThanOrEqual(last.y + last.height - 0.6);
    near(await px(row_, 'padding-left'), await token(page, 'option-padding-inline-regular'), 'option.padding-inline');
    near(await px(row_, 'padding-top'), await token(page, 'option-padding-block-regular'), 'option.padding-block');
    near(await px(row_, 'font-size'), await token(page, 'status-typescale-font-size'), 'status.typescale');
    expect(await css(row_, 'color')).toBe(await color(page, 'status-color'));
    expect(await row_.evaluate((el) => [el.getAttribute('role'), el.tabIndex, el.closest('[role="listbox"]'), el.closest('.scroll')]), 'not an option, not in the list box, not in the box that scrolls').toEqual([null, -1, null, null]);
    expect(await row_.locator('.status-text').evaluate((el) => [el.scrollWidth <= el.clientWidth + 1, getComputedStyle(el).unicodeBidi]), 'it wraps, as text of its own direction').toEqual([true, 'plaintext']);
    // Error: the same row in the error color.
    expect(await css(status('open-status-error'), 'color')).toBe(await color(page, 'status-error-color'));
    await expect(status('open-status-error').locator('.status-text')).toHaveText('Projects could not be loaded. Check your connection.');
    // Loading: the indicator, named, at the row's start, and no text; the row as tall as one line of text.
    row_ = status('open-loading');
    const spinner = row_.locator('tanrei-loading-indicator');
    expect(await spinner.evaluate((el) => [el.getAttribute('size'), el.getAttribute('label')])).toEqual(['small', 'Loading projects']);
    await expect(row_.locator('.status-text')).toHaveCount(0);
    near((await box(spinner)).x - (await box(row_)).x, await token(page, 'option-padding-inline-regular'), 'at the row’s start', 1);
    near((await box(row_)).height, (await box(status('open-empty'))).height, 'one line of text tall');
    // The empty text, in the status row's place and style.
    await expect(status('open-empty').locator('.status-text')).toHaveText('No projects yet');
    expect(await css(status('open-empty'), 'color')).toBe(await color(page, 'status-color'));
    await expect(rows(page, 'open-empty')).toHaveCount(0);
    // No status: no row, and no room.
    expect((await box(status('stacked-open'))).height).toBe(0);
    // The options left in the list while loading are chosen as any option is.
    // Each select below is brought into the window before it is focused: the fixtures above it are tall, and a list a
    // key opens while its select is out of the window is closed at once (POP-5), and WebKit in Linux scrolls a focused
    // element into view a frame or more after focus(), after the key that opens the list has been handled.
    const focusInView = async (id: string) => {
      await host(page, id).scrollIntoViewIfNeeded();
      await focusSelect(page, id);
    };
    await set(page, 'loading-more', { inline: false, open: false });
    await focusInView('loading-more');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'loading-more').toBe(true);
    await arrived(page, 'loading-more');
    await pressOn(row(page, 'loading-more', 'Kenya'));
    expect(await read(page, 'loading-more')).toMatchObject({ value: 'ke', open: false });
    // A press on the row is no input and takes no focus; an arrow key never makes it active.
    await set(page, 'open-status', { inline: false, open: false });
    await focusInView('open-status');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'open-status').toBe(true);
    await arrived(page, 'open-status');
    await page.keyboard.press('End');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    expect((await read(page, 'open-status')).active).toBe('Comet');
    await pressOn(status('open-status'));
    expect(await read(page, 'open-status')).toMatchObject({ open: true, value: 'atlas', focused: true, active: 'Comet' });
    // A list with no option has no active option: the keys move nothing, Enter and Space choose nothing, Escape closes it.
    await set(page, 'open-empty', { inline: false, open: false });
    await listen(page, 'open-empty');
    await focusInView('open-empty');
    await page.keyboard.press('Enter');
    await shownList(page, 'open-empty').toBe(true);
    for (const key of ['ArrowDown', 'End', 'Enter', 'Space']) await page.keyboard.press(key);
    expect(await read(page, 'open-empty')).toMatchObject({ open: true, active: null, value: '', focused: true });
    await page.keyboard.press('Escape');
    await closedList(page, 'open-empty');
    expect(await heard(page)).toEqual(['toggle true', 'toggle false escape']);
  });

  test('SEL-69: the status row’s live regions are empty while the list is closed and are given the row’s text once it is shown — statusText or the empty text in the polite one (role status) while idle, in the assertive one (role alert) while the source failed; while loading both are empty and the list box is busy; a text changed while open is a change of the same region; the drawn text is kept from assistive technology; the select composes no text of its own', async ({ page }) => {
    await mount(page, [fx('one', { emptyText: 'No countries yet' }, [])], { reducedMotion: true });
    const regions = () =>
      part(page, 'one', '.status').evaluate((el) => ({
        polite: el.querySelector('[role="status"]')!.textContent,
        assertive: el.querySelector('[role="alert"]')!.textContent,
        busy: (el.getRootNode() as ShadowRoot).querySelector('[role="listbox"]')!.getAttribute('aria-busy'),
        drawn: el.querySelector('.status-text')?.getAttribute('aria-hidden') ?? null,
      }));
    expect(await regions(), 'closed: nothing to read').toEqual({ polite: '', assertive: '', busy: null, drawn: 'true' });
    // Shown, what the row already says is read.
    await container(page, 'one').click();
    await shownList(page, 'one').toBe(true);
    await expect.poll(regions).toEqual({ polite: 'No countries yet', assertive: '', busy: null, drawn: 'true' });
    const polite = await part(page, 'one', '.status [role="status"]').elementHandle();
    await set(page, 'one', { status: 'loading', statusText: 'Loading countries' });
    expect(await regions(), 'loading announces nothing, and the list box is busy').toEqual({ polite: '', assertive: '', busy: 'true', drawn: null });
    await set(page, 'one', { status: 'idle', statusText: '2 of 48 countries shown' });
    expect(await regions()).toEqual({ polite: '2 of 48 countries shown', assertive: '', busy: null, drawn: 'true' });
    expect(await part(page, 'one', '.status [role="status"]').evaluate((el, before) => el === before, polite), 'the same region: its text changed').toBe(true);
    await set(page, 'one', { status: 'error', statusText: 'Countries could not be loaded.' });
    expect(await regions()).toEqual({ polite: '', assertive: 'Countries could not be loaded.', busy: null, drawn: 'true' });
    // Closed, the regions are empty again; opened, what the row says is read again.
    await page.keyboard.press('Escape');
    await closedList(page, 'one');
    expect(await regions()).toMatchObject({ polite: '', assertive: '' });
    await container(page, 'one').click();
    await shownList(page, 'one').toBe(true);
    await expect.poll(regions).toMatchObject({ polite: '', assertive: 'Countries could not be loaded.' });
    // The number of options is the list's to expose: the row's words are the product's alone.
    await host(page, 'one').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-option value="ke">Kenya</tanrei-option>'));
    await set(page, 'one', { status: 'idle', statusText: '' });
    await expect(rows(page, 'one')).toHaveCount(1);
    expect(await regions()).toEqual({ polite: '', assertive: '', busy: null, drawn: null });
  });
});

test.describe('behavior: conditions, exposure, size and direction', () => {
  test('SEL-46: a disabled select — its own disabled, or its Field’s — is not focusable, does not open, emits nothing, is exposed as disabled, is left out of form submission and draws every part of its trigger, the chevron, the floating label and its asterisk included, from the disabled tokens of its variant, of its error parts while in error', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-disabled', 'outlined-disabled'].includes(f.id)), fx('after', { value: 'ca' }), fx('error', { value: 'jp', disabled: true, error: true })], { system: 'm3-like' });
    await frame(page, 'framed', { label: 'Country', disabled: true, required: true, requiredMark: 'asterisk' }, { variant: 'outlined', value: 'jp' });
    const id = 'stacked-disabled';
    await listen(page, id);
    expect(await container(page, id).evaluate((el) => [el.getAttribute('aria-disabled'), el.hasAttribute('tabindex'), el.tabIndex])).toEqual(['true', false, -1]);
    await container(page, id).click({ force: true });
    await focusSelect(page, id);
    await page.keyboard.press('ArrowDown');
    await set(page, id, { open: true });
    expect([await read(page, id), await heard(page)]).toMatchObject([{ shown: false, focused: false, expanded: 'false' }, []]);
    expect(await css(container(page, id), 'background-color')).toBe(await color(page, 'stacked-disabled-container-color'));
    expect(await css(part(page, id, '.value'), 'color')).toBe(await color(page, 'stacked-disabled-input-color'));
    expect(await css(part(page, id, '.chevron'), 'color')).toBe(await color(page, 'stacked-disabled-trailing-icon-color'));
    expect(await css(part(page, 'outlined-disabled', '.floating'), 'color')).toBe(await color(page, 'outlined-disabled-label-color'));
    expect(await css(part(page, 'error', '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-disabled-error-outline-color'));
    // Disabled by the Field that frames it: the same, the floating label and its asterisk included.
    expect(await container(page, 'framed').evaluate((el) => [el.getAttribute('aria-disabled'), el.hasAttribute('tabindex')])).toEqual(['true', false]);
    expect(await host(page, 'framed').evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled), 'its own disabled is not set').toBe(false);
    expect(await css(part(page, 'framed', '.floating'), 'color')).toBe(await color(page, 'outlined-disabled-label-color'));
    expect(await css(part(page, 'framed', '.floating .asterisk'), 'color')).toBe(await color(page, 'outlined-disabled-required-asterisk-color'));
    await container(page, 'framed').click({ force: true });
    expect(await read(page, 'framed')).toMatchObject({ shown: false, focused: false });
    // Left out of the form; and Tab passes it by.
    expect(
      await page.evaluate(async () => {
        const form = document.createElement('form');
        form.innerHTML = '<tanrei-select name="a" label="A" value="x" disabled><tanrei-option value="x">X</tanrei-option></tanrei-select><tanrei-select name="b" label="B" value="y"><tanrei-option value="y">Y</tanrei-option></tanrei-select><tanrei-field label="C" disabled><tanrei-select name="c" value="z"><tanrei-option value="z">Z</tanrei-option></tanrei-select></tanrei-field>';
        document.body.append(form);
        for (const select of form.querySelectorAll('tanrei-select, tanrei-field')) await (select as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
        for (const select of form.querySelectorAll('tanrei-select')) await (select as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
        return [...new FormData(form).entries()].map(([k, v]) => `${k}=${String(v)}`);
      }),
    ).toEqual(['b=y']);
    await tabTo(page, container(page, 'after'));
    expect((await read(page, id)).focused).toBe(false);
  });

  test('SEL-47: a read-only select stays focusable and shows its value, does not open by any input, lets nothing change its value, emits nothing, is exposed as read-only, is submitted with its form, and is drawn as an enabled select without its chevron, hovered and focused states included', async ({ page }) => {
    await mountSpec(page, ['stacked-read-only', 'stacked-value'], { reducedMotion: true });
    const id = 'stacked-read-only';
    await listen(page, id);
    await expect(part(page, id, '.value')).toHaveText('Japan');
    expect(await container(page, id).evaluate((el) => [el.getAttribute('aria-readonly'), el.getAttribute('aria-disabled'), el.tabIndex])).toEqual(['true', null, 0]);
    await container(page, id).click();
    for (const key of ['Enter', 'Space', 'ArrowDown', 'ArrowUp', 'k']) await page.keyboard.press(key);
    await set(page, id, { open: true });
    expect([await read(page, id), await heard(page)]).toMatchObject([{ shown: false, focused: true, value: 'jp', expanded: 'false' }, []]);
    await expect(part(page, id, '.chevron')).toHaveCount(0);
    // As an enabled select: the resting, focused and hovered colors of one.
    expect(await css(part(page, id, '.edge'), 'border-top-color')).toBe(await color(page, 'stacked-focused-outline-color'));
    await container(page, id).evaluate((el) => el.blur());
    await page.mouse.move(700, 600);
    expect(await css(container(page, id), 'background-color')).toBe(await css(container(page, 'stacked-value'), 'background-color'));
    await container(page, id).hover();
    await expect.poll(() => css(container(page, id), 'background-color')).toBe(await color(page, 'stacked-hovered-container-color'));
    // The value ends at the text padding, where the chevron would have been.
    const [c, v] = [await box(container(page, id)), await box(part(page, id, '.line'))];
    near(c.x + c.width - (v.x + v.width), await token(page, 'container-padding-inline-medium'), 'the end padding');
    expect(
      await page.evaluate(async () => {
        const form = document.createElement('form');
        form.innerHTML = '<tanrei-select name="a" label="A" value="x" readonly><tanrei-option value="x">X</tanrei-option></tanrei-select>';
        document.body.append(form);
        for (const select of form.children) await (select as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
        return [...new FormData(form).entries()].map(([k, v]) => `${k}=${String(v)}`);
      }),
    ).toEqual(['a=x']);
  });

  test('SEL-48: the container is a combobox that is not editable, named by label with the chosen option’s label as its value and, while open, aria-activedescendant naming the active option; the list is a listbox named by label whose options are named by their label and described by their supporting text, each with its selected and disabled state, its position and the number of options, in groups named by their title; glyphs, chevron, check and divider are hidden', async ({ page }) => {
    await mount(page, [fx('one', { value: 'team', open: true, inline: false, placeholder: 'Choose a plan', label: 'Plan' }, [group('Plans', [option('Free', 'free', { supportingText: 'One project' }), option('Team', 'team', { supportingText: 'Unlimited projects', leadingIcon: 'group' })]), group('', [option('Enterprise', 'enterprise', { disabled: true })])])]);
    await shownList(page, 'one').toBe(true);
    const c = container(page, 'one');
    expect(await c.evaluate((el) => [el.getAttribute('role'), el.localName, el.isContentEditable, el.querySelector('input, textarea') === null, el.getAttribute('aria-autocomplete'), el.getAttribute('aria-label')])).toEqual(['combobox', 'div', false, true, null, 'Plan']);
    const active = await c.getAttribute('aria-activedescendant');
    expect(await part(page, 'one', `#${active}`).locator('.option-label').textContent()).toBe('Team');
    const list = part(page, 'one', '#list');
    expect(await list.evaluate((el) => [el.getAttribute('role'), (el.getRootNode() as ShadowRoot).getElementById(el.getAttribute('aria-labelledby')!)!.textContent])).toEqual(['listbox', 'Plan']);
    const exposed = await host(page, 'one').evaluate((el) =>
      [...el.shadowRoot!.querySelectorAll('.row')].map((r) => {
        const text = (attribute: string) => (r.getAttribute(attribute) ? el.shadowRoot!.getElementById(r.getAttribute(attribute)!)!.textContent : null);
        return [r.getAttribute('role'), text('aria-labelledby'), text('aria-describedby'), r.getAttribute('aria-selected'), r.getAttribute('aria-disabled'), r.getAttribute('aria-posinset'), r.getAttribute('aria-setsize')];
      }),
    );
    expect(exposed).toEqual([
      ['option', 'Free', 'One project', 'false', null, '1', '3'],
      ['option', 'Team', 'Unlimited projects', 'true', null, '2', '3'],
      ['option', 'Enterprise', null, 'false', 'true', '3', '3'],
    ]);
    expect(await host(page, 'one').evaluate((el) => [...el.shadowRoot!.querySelectorAll('.group')].map((g) => [g.getAttribute('role'), g.getAttribute('aria-labelledby') ? el.shadowRoot!.getElementById(g.getAttribute('aria-labelledby')!)!.textContent : null]))).toEqual([['group', 'Plans'], ['group', null]]);
    for (const selector of ['.chevron', '.leading-own', '.divider', '.mark', '.row-column.leading']) for (const el of await part(page, 'one', selector).all()) expect(await el.getAttribute('aria-hidden'), selector).toBe('true');
    // Closed: no active descendant; the placeholder is not a value.
    await set(page, 'one', { open: false, value: '' });
    expect(await c.evaluate((el) => [el.getAttribute('aria-activedescendant'), el.getAttribute('aria-expanded')])).toEqual([null, 'false']);
    const exposedText = () =>
      c.evaluate((el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let text = '';
        while (walker.nextNode()) if (!walker.currentNode.parentElement!.closest('[aria-hidden="true"]')) text += walker.currentNode.textContent!.trim();
        return text;
      });
    expect(await exposedText(), 'nothing chosen: no value, and the placeholder is not one').toBe('');
    await set(page, 'one', { value: 'free' });
    expect(await exposedText()).toBe('Free');
  });

  test('SEL-48: Chromium’s accessibility tree — the combobox’s role, name, description, value, expanded state, active option, required, invalid, read-only and disabled states; the list box, its options with their names, descriptions, selected and disabled states, and its groups', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'the accessibility tree is read over the DevTools protocol');
    await mount(page, [fx('off', { label: 'Region', value: 'ca', disabled: true }), fx('fixed', { label: 'Language', value: 'fr', readOnly: true })]);
    // The name, the description and the required and invalid states are what a Field gives: two selects in Fields.
    await frame(
      page,
      'one',
      { label: 'Plan', supportingText: 'Billed monthly.', required: true },
      { value: 'team', placeholder: 'Choose a plan' },
      '<tanrei-option-group label="Plans"><tanrei-option value="free" supporting-text="One project">Free</tanrei-option><tanrei-option value="team" supporting-text="Unlimited projects" leading-icon="group">Team</tanrei-option></tanrei-option-group><tanrei-option value="enterprise" disabled>Enterprise</tanrei-option>',
    );
    await frame(page, 'states', { label: 'Country', labelHidden: true, required: false, optional: true, error: true, errorText: 'Choose a country.' }, { placeholder: 'Choose a country' });
    const comboboxes = async () => {
      const found = await axNodes(page, 'combobox');
      return ['Plan', 'Country', 'Region', 'Language'].map((name) => found.find((node) => node.name === name)!);
    };
    let boxes = await comboboxes();
    expect((await axNodes(page, 'combobox')).map((b) => b.name).sort()).toEqual(['Country', 'Language', 'Plan', 'Region']);
    expect(boxes[0]).toMatchObject({ name: 'Plan', description: 'Billed monthly.', value: 'Team', expanded: false, required: true, haspopup: 'listbox' });
    expect(boxes[0].invalid ?? 'false').toBe('false');
    // Named by the label where it is not drawn, never by the placeholder — which is not its value either.
    expect(boxes[1]).toMatchObject({ name: 'Country', description: 'Choose a country. Optional', value: '', invalid: 'true', expanded: false });
    expect(boxes[1].required ?? false).toBe(false);
    // (Chromium computes no value for a combobox that is disabled; what it holds is still in the tree, as its text.)
    expect(boxes[2]).toMatchObject({ name: 'Region', disabled: true });
    expect((await axNodes(page, 'StaticText')).map((node) => node.name)).toContain('Canada');
    // (The protocol's view of the tree lists no read-only property for the combobox role; the state is on the element.)
    expect(boxes[3]).toMatchObject({ name: 'Language', value: 'France' });
    expect(await container(page, 'fixed').getAttribute('aria-readonly')).toBe('true');
    // Nothing else of the select is a node of its own: no glyph, no chevron, no placeholder; and the Field's drawn
    // label and tag are not said a second time as text.
    const texts = (await axNodes(page, 'StaticText')).map((node) => node.name);
    for (const hidden of ['Plan', 'Required', 'expand_more', 'group', 'check', 'Choose a plan']) expect(texts, hidden).not.toContain(hidden);
    // Open, by the keyboard: expanded, with the active option.
    await focusSelect(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    boxes = await comboboxes();
    expect(boxes[0]).toMatchObject({ expanded: true, value: 'Team' });
    const lists = await axNodes(page, 'listbox');
    expect(lists).toHaveLength(1);
    expect(lists[0]).toMatchObject({ name: 'Plan' });
    expect(lists[0].children).toEqual(['group', 'option']);
    const options = await axNodes(page, 'option');
    expect(options.map((o) => [o.name, o.description, o.selected ?? false, o.disabled ?? false]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))).toEqual([
      ['Enterprise', '', false, true],
      ['Free', 'One project', false, false],
      ['Team', 'Unlimited projects', true, false],
    ]);
    expect((await axNodes(page, 'group')).map((g) => g.name).filter(Boolean)).toEqual(['Plans']);
    const activeId = await container(page, 'one').getAttribute('aria-activedescendant');
    expect(await part(page, 'one', `#${activeId}`).getAttribute('aria-selected')).toBe('true');
    await page.keyboard.press('ArrowDown');
    expect(await part(page, 'one', `#${await container(page, 'one').getAttribute('aria-activedescendant')}`).locator('.option-label').textContent()).toBe('Enterprise');
    // The error set later reaches the tree at once.
    await setField(page, 'one', { error: true, errorText: 'This plan is full.' });
    expect((await comboboxes())[0]).toMatchObject({ description: 'This plan is full.', invalid: 'true' });
  });

  test('SEL-49: bare and given no width the select is as wide as its widest option would make it, so choosing never changes its width, and at least as wide as its placeholder; it is never wider than its layout gives it, and fills a width the product gives; in a Field it fills the width that Field gives it, whichever option is chosen', async ({ page }) => {
    await mountSpec(page, ['small-label-hidden-icons', 'stacked-placeholder', 'long-value', 'stacked-value']);
    const id = 'small-label-hidden-icons';
    const widths: number[] = [];
    for (const value of ['light', 'dark', 'auto', '']) {
      await set(page, id, { value });
      widths.push((await box(container(page, id))).width);
    }
    expect(new Set(widths.map((w) => Math.round(w * 10))).size, `one width whatever is chosen: ${widths.join(', ')}`).toBe(1);
    // As the widest option needs: its label in the value's style, the icon column, the chevron, the gaps and paddings.
    await set(page, id, { value: 'auto' });
    const measured = (await box(part(page, id, '.value'))).width;
    const expected = 2 * (await token(page, 'container-padding-inline-with-icon-small')) + 2 * (await token(page, 'icon-size-small')) + 2 * (await token(page, 'container-gap-small')) + measured;
    near(widths[0], expected, 'the widest option, the icon column, the chevron, the gaps and the paddings', 1);
    expect(await css(host(page, id), 'display'), 'bare: an inline box').toBe('inline-flex');
    // At least as wide as its placeholder needs.
    const placeholder = part(page, 'stacked-placeholder', '.placeholder');
    expect(await placeholder.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // Never wider than its layout; and it fills a width it is given.
    near((await box(host(page, 'long-value'))).width, 280, 'cut at its layout’s width');
    await host(page, 'stacked-value').evaluate((el) => (el.style.inlineSize = '260px'));
    await expect.poll(async () => Math.round((await box(container(page, 'stacked-value'))).width)).toBe(260);
    // In a Field 280 wide: the same select has a container 280 wide, whichever option is chosen.
    const icons = spec.fixtures.find((f) => f.id === id)!;
    await frame(page, 'framed', { label: 'Theme' }, { size: 'small', value: 'light' }, (icons.items ?? []).map((item) => `<tanrei-option value="${String(item.props.value)}" leading-icon="${String(item.props.leadingIcon ?? '')}">${String(item.props.label)}</tanrei-option>`).join(''));
    for (const value of ['light', 'dark', 'auto', '']) {
      await set(page, 'framed', { value });
      near((await box(container(page, 'framed'))).width, 280, `in a Field, ${value || 'nothing'} chosen`);
    }
    expect(await css(host(page, 'framed'), 'display'), 'framed: a block-level box').toBe('flex');
    // The width of the pair is given to the Field.
    await field(page, 'framed').evaluate((el) => ((el as HTMLElement).style.inlineSize = '200px'));
    await expect.poll(async () => Math.round((await box(container(page, 'framed'))).width)).toBe(200);
    // Taken out of its Field it is a bare select again: as wide as its widest option.
    await page.evaluate(() => {
      const select = document.querySelector('[data-fixture="framed"] tanrei-select')!;
      document.querySelector('[data-fixture="framed"]')!.append(select);
    });
    await expect.poll(async () => Math.round((await box(container(page, 'framed'))).width * 10)).toBe(Math.round(widths[0] * 10));
  });

  test('SEL-51: with text enlarged to 200% the container grows with the value’s line and keeps it on one line, the glyphs keep their sizes, options and titles wrap, and the list scrolls where they no longer fit — nothing is lost in the list, nothing lies over another part and nothing scrolls sideways', async ({ page }) => {
    await mount(page, [
      fx('one', { label: 'Time zone of the account', value: 'Europe/Lisbon', open: true }, [group('Asia and the Pacific', [option('Tokyo', 'Asia/Tokyo'), option('Seoul', 'Asia/Seoul', { supportingText: 'Korea Standard Time, all year' })]), group('Europe', [option('Lisbon', 'Europe/Lisbon'), option('Berlin', 'Europe/Berlin')])]),
    ]);
    const sizes = async () => ({
      container: (await box(container(page, 'one'))).height,
      chevron: (await box(part(page, 'one', '.chevron'))).width,
      row: (await box(rows(page, 'one').first())).height,
    });
    const before = await sizes();
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await frames(page, 4);
    const after = await sizes();
    expect(after.container, 'the container grows with the value’s line').toBeGreaterThan(before.container);
    expect(after.container, 'the height of its size is a minimum').toBeGreaterThanOrEqual((await token(page, 'stacked-container-height-medium')) - 0.6);
    expect(after.row).toBeGreaterThan(before.row);
    near(after.chevron, await token(page, 'icon-size-medium'), 'the chevron keeps its size');
    expect(await part(page, 'one', '.value').evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('nowrap');
    near((await box(part(page, 'one', '.value'))).height, await px(part(page, 'one', '.value'), 'line-height'), 'one line', 1);
    for (const selector of ['.option-label', '.option-supporting', '.group-title']) {
      for (const el of await part(page, 'one', selector).all()) expect(await el.evaluate((node) => node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1 && getComputedStyle(node).textOverflow !== 'ellipsis'), `${selector} is whole`).toBe(true);
    }
    // The select is still exactly as tall as its container.
    near((await box(host(page, 'one'))).height, after.container, 'as tall as its container');
    // The list: no sideways scroll; where the taller options do not fit, it scrolls.
    const scroll = part(page, 'one', '.scroll');
    expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await override(page, { [T('list-max-height')]: '160px' });
    await set(page, 'one', { placeholder: 'x' });
    await expect.poll(() => scroll.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect((await box(part(page, 'one', '.list'))).height).toBeLessThanOrEqual(160.6);
  });

  test('SEL-52: in forced colors the floating label and its asterisk are drawn in the text color — of every filled and outlined fixture — and so is the status row’s text, in error too; no color of the select’s own tells an error: it is carried by the invalid state and the words of the Field that frames it', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced colors are emulated in Chromium');
    await page.emulateMedia({ forcedColors: 'active' });
    const floating = spec.fixtures.filter((f) => (f.props.variant === 'filled' || f.props.variant === 'outlined') && !f.props.disabled);
    expect(floating.length).toBeGreaterThanOrEqual(10);
    await mount(page, floating);
    await frame(page, 'required', { label: 'Country', required: true, requiredMark: 'asterisk' }, { variant: 'outlined' });
    await frame(page, 'error', { label: 'Country', required: true, requiredMark: 'asterisk', error: true, errorText: 'Choose a country.' }, { variant: 'filled' });
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    for (const f of floating) expect(await css(part(page, f.id, '.floating'), 'color'), f.id).toBe(canvasText);
    for (const id of ['required', 'error']) for (const selector of ['.floating', '.floating .asterisk']) expect(await css(part(page, id, selector), 'color'), `${id} ${selector}`).toBe(canvasText);
    // The error: the invalid state, and the Field's words in the Field's own row.
    expect(await container(page, 'error').getAttribute('aria-invalid')).toBe('true');
    await expect(fieldRow(page, 'error', '.error-text')).toHaveText('Choose a country.');
    expect(await css(part(page, 'error', '.floating'), 'color'), 'the label of a select in error is the label of one at rest').toBe(await css(part(page, 'required', '.floating'), 'color'));
    // The status row's text, in error too.
    await mountSpec(page, ['open-status', 'open-status-error']);
    for (const id of ['open-status', 'open-status-error']) expect(await css(part(page, id, '.status'), 'color'), id).toBe(canvasText);
  });

  test('SEL-53: in forced colors the container has an edge outline.width wide in the control text color in every variant, in the highlight color at the focused width while focused; the list an edge in the text color; the active option the highlight colors; a disabled select and a disabled option the disabled text color; the chosen option is shown by its check', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'forced colors are emulated in Chromium');
    await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, [...spec.fixtures.filter((f) => ['stacked-value', 'filled-value', 'outlined-value', 'stacked-disabled', 'open-supporting-text'].includes(f.id))]);
    const system = (name: string) =>
      page.evaluate((n) => {
        const probe = document.createElement('div');
        probe.style.color = n;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    for (const id of ['stacked-value', 'filled-value', 'outlined-value']) {
      expect(await css(container(page, id), 'border-top-color'), id).toBe(await system('ButtonText'));
      near(await px(container(page, id), 'border-top-width'), await token(page, 'outline-width'), `${id} outline.width`);
    }
    await focusSelect(page, 'stacked-value');
    expect(await css(container(page, 'stacked-value'), 'outline-color')).toBe(await system('Highlight'));
    near(await px(container(page, 'stacked-value'), 'outline-width'), await token(page, 'focused-outline-width'), 'the focused width');
    expect(await css(container(page, 'stacked-disabled'), 'border-top-color')).toBe(await system('GrayText'));
    expect(await css(part(page, 'stacked-disabled', '.value'), 'color')).toBe(await system('GrayText'));
    const id = 'open-supporting-text';
    expect(await css(part(page, id, '.list'), 'border-top-color')).toBe(await system('CanvasText'));
    near(await px(part(page, id, '.list'), 'border-top-width'), await resolveToken(page, '--tanrei-sys-border-hairline'), 'a hairline');
    const active = part(page, id, '.row.active');
    expect(await css(active, 'background-color')).toBe(await system('Highlight'));
    expect(await css(active.locator('.option-label'), 'color')).toBe(await system('HighlightText'));
    expect(await css(row(page, id, 'Enterprise').locator('.option-label'), 'color')).toBe(await system('GrayText'));
    expect(await css(row(page, id, 'Team').locator('.check'), 'visibility'), 'the check is drawn').toBe('visible');
  });

  test('SEL-55: in a right-to-left layout the leading icon is at the right of the container and the chevron at the left, a floating label starts at the right edge with its asterisk at its left; the list is aligned to the container’s right edge, and in each option the leading icon is at the right and the check at the left', async ({ page }) => {
    await mount(page, [...spec.fixtures.filter((f) => ['open-rtl', 'outlined-rtl'].includes(f.id))], { system: 'm3-like' });
    await frame(page, 'floating', { label: 'المنطقة الزمنية', required: true, requiredMark: 'asterisk', supportingText: 'تُعرض المواعيد بهذا التوقيت.' }, { variant: 'outlined' }, '<tanrei-option value="t" leading-icon="schedule">طوكيو</tanrei-option>', 'rtl');
    const right = (b: { x: number; width: number }) => b.x + b.width;
    const open = 'open-rtl';
    await set(page, open, { open: false });
    const [c, own, value, chevron] = [await box(container(page, open)), await box(part(page, open, '.leading-own')), await box(part(page, open, '.value')), await box(part(page, open, '.chevron'))];
    near(right(c), right(await box(host(page, open))), 'the container starts at the right edge');
    near(right(c) - right(own), await token(page, 'container-padding-inline-with-icon-medium'), 'the leading icon at the right');
    expect(right(value)).toBeLessThanOrEqual(own.x + 0.6);
    near(chevron.x - c.x, await token(page, 'container-padding-inline-with-icon-medium'), 'the chevron at the left');
    // A floating label: from the right edge, its asterisk at its left. (Resting: nothing is chosen.)
    const [fc, label, asterisk] = [await box(container(page, 'floating')), await box(part(page, 'floating', '.floating')), await box(part(page, 'floating', '.floating .asterisk'))];
    near(right(fc) - right(label), await token(page, 'container-padding-inline-medium'), 'the floating label starts at the right');
    near(asterisk.x, label.x, 'the asterisk at the label’s left end', 1);
    // The rows of the Field that frames it mirror with it (FLD-18): the help starts where the value will.
    near(right(await box(fieldRow(page, 'floating', '.supporting-text'))), right(fc) - (await token(page, 'container-padding-inline-medium')), 'the supporting row starts at the value’s start');
    // The list and its rows.
    await set(page, open, { open: true });
    await shownList(page, open).toBe(true);
    const [oc, list] = [await box(container(page, open)), await box(part(page, open, '.list'))];
    near(right(list), right(oc), 'the list is aligned to the container’s right edge');
    const tokyo = row(page, open, 'طوكيو');
    const [r, glyph, name, check] = [await box(tokyo), await box(tokyo.locator('.option-icon')), await box(tokyo.locator('.option-label')), await box(tokyo.locator('.mark'))];
    near(right(r) - right(glyph), await token(page, 'option-padding-inline-regular'), 'the option’s icon at the right');
    expect(right(name)).toBeLessThanOrEqual(glyph.x + 0.6);
    near(check.x - r.x, await token(page, 'option-padding-inline-regular'), 'the check at the left');
    near(right(await box(part(page, open, '.group-title').first())), right(r), 'the title starts at the right');
  });

  test('SEL-56: the layout direction comes from the nearest ancestor that sets one, and a change of it while the select is shown — its list open — is drawn at once, keeping the value, the open state, the active option and focus, the list placed again by the new direction', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 700 });
    await mount(page, [fx('one', { value: 'fr' })]);
    await page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>('[data-fixture="one"]')!;
      const section = document.createElement('section');
      section.id = 'region';
      section.style.cssText = 'inline-size: 600px; padding: 16px';
      stage.replaceWith(section);
      section.append(stage);
      stage.style.inlineSize = 'auto';
    });
    await focusSelect(page, 'one');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'one').toBe(true);
    await arrived(page, 'one');
    await page.keyboard.press('ArrowDown');
    const right = (b: { x: number; width: number }) => b.x + b.width;
    let [c, list, chevron] = [await box(container(page, 'one')), await box(part(page, 'one', '.list')), await box(part(page, 'one', '.chevron'))];
    near(list.x, c.x, 'left to right: start edges at the left');
    expect(chevron.x).toBeGreaterThan(c.x + c.width / 2);
    // The ancestor — not the root — becomes right-to-left.
    await page.locator('#region').evaluate((el) => (el.dir = 'rtl'));
    await expect.poll(async () => Math.round(right(await box(part(page, 'one', '.list'))) - right(await box(container(page, 'one'))))).toBe(0);
    [c, list, chevron] = [await box(container(page, 'one')), await box(part(page, 'one', '.list')), await box(part(page, 'one', '.chevron'))];
    expect(c.x, 'the select moved to the right edge').toBeGreaterThan(300);
    expect(chevron.x, 'the chevron is at the left').toBeLessThan(c.x + c.width / 2);
    expect(await read(page, 'one')).toMatchObject({ value: 'fr', open: true, active: 'Japan', focused: true, shown: true });
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('');
    // …and back.
    await page.locator('#region').evaluate((el) => (el.dir = 'ltr'));
    await expect.poll(async () => Math.round((await box(part(page, 'one', '.list'))).x - (await box(container(page, 'one'))).x)).toBe(0);
    expect(await read(page, 'one')).toMatchObject({ open: true, active: 'Japan', focused: true });
    expect(await host(page, 'one').evaluate((el) => (el as unknown as Record<string, unknown>).dir === '' && !('direction' in el))).toBe(true);
  });

  test('SEL-57: in a right-to-left layout a glyph of the leading-icon slot and an option’s leadingIcon is mirrored exactly when the icon set marks its name or the product forces it, inside its own box; the chevron and the check never are, and nothing mirrors an image of the product’s', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => f.id === 'open-rtl'),
      fx('slots', { value: 'a', label: 'Next' }, '<tanrei-option value="a" leading-icon="arrow_forward">A</tanrei-option><span slot="leading-icon">arrow_forward</span>', { direction: 'rtl' }),
      fx('unmarked', { value: 'a' }, '<tanrei-option value="a">A</tanrei-option><span slot="leading-icon">schedule</span>', { direction: 'rtl' }),
      fx('forced', { value: 'a' }, '<tanrei-option value="a">A</tanrei-option><span slot="leading-icon" data-mirror="always">schedule</span>', { direction: 'rtl' }),
      fx('forbidden', { value: 'a' }, '<tanrei-option value="a">A</tanrei-option><span slot="leading-icon" data-mirror="never">arrow_forward</span>', { direction: 'rtl' }),
      fx('image', { value: 'a' }, '<tanrei-option value="a">A</tanrei-option><svg slot="leading-icon" viewBox="0 0 24 24"><path d="M4 12h16"/></svg>', { direction: 'rtl' }),
      fx('ltr', { value: 'a' }, '<tanrei-option value="a" leading-icon="arrow_forward">A</tanrei-option>'),
    ]);
    const mirrored = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).transform !== 'none' || getComputedStyle(el).scale !== 'none');
    const open = 'open-rtl';
    const arrow = row(page, open, 'طوكيو').locator('.option-icon');
    expect(await arrow.getAttribute('data-tanrei-mirrored'), 'arrow_forward is in the icon set’s list').not.toBeNull();
    expect(await mirrored(arrow)).toBe(true);
    const before = await box(arrow);
    near(before.width, await token(page, 'option-leading-icon-size-regular'), 'the same box');
    expect(await mirrored(row(page, open, 'طوكيو').locator('.check'))).toBe(false);
    expect(await mirrored(part(page, open, '.chevron'))).toBe(false);
    // The chosen option's glyph in the container, and the slots.
    await set(page, open, { open: false });
    expect(await mirrored(part(page, open, '.leading-own'))).toBe(true);
    expect(await mirrored(host(page, 'slots').locator('[slot="leading-icon"]'))).toBe(true);
    expect(await mirrored(host(page, 'unmarked').locator('[slot="leading-icon"]')), 'schedule is not marked').toBe(false);
    expect(await mirrored(host(page, 'forced').locator('[slot="leading-icon"]'))).toBe(true);
    expect(await mirrored(host(page, 'forbidden').locator('[slot="leading-icon"]'))).toBe(false);
    expect(await mirrored(host(page, 'image').locator('[slot="leading-icon"]'))).toBe(false);
    // Left to right: marked all the same, and not mirrored.
    expect(await mirrored(part(page, 'ltr', '.leading-own'))).toBe(false);
  });

  test('SEL-58, SEL-59: the floating label, the placeholder, the value, an option’s label and supporting text and a group’s title are each a run of their own direction, isolated, placed and aligned by the layout direction; a value that does not fit is cut at the end of its own direction', async ({ page }) => {
    await mount(page, [
      ...spec.fixtures.filter((f) => f.id === 'long-value-rtl'),
      fx('mixed', { label: 'Phone +1 555 0100', placeholder: 'Choose +1', open: true }, [group('Europe (CET)', [option('Lisbon (WET)', 'l', { supportingText: 'UTC+0 in winter' }), option('برلين', 'b')])], { direction: 'rtl' }),
      fx('floating', { variant: 'outlined', label: 'Phone +1 555 0100' }, COUNTRIES, { direction: 'rtl' }),
    ]);
    for (const selector of ['.placeholder', '.option-label', '.option-supporting', '.group-title']) {
      for (const el of await part(page, 'mixed', selector).all()) expect(await css(el, 'unicode-bidi'), selector).toBe('plaintext');
    }
    const right = (b: { x: number; width: number }) => b.x + b.width;
    // The floating label: a left-to-right text in a right-to-left stage keeps its own order, and is placed and aligned by the layout — at the right.
    const label = part(page, 'floating', '.floating');
    expect([await css(label, 'unicode-bidi'), await css(label, 'text-align')]).toEqual(['plaintext', 'right']);
    near(right(await box(container(page, 'floating'))) - right(await box(label)), await token(page, 'container-padding-inline-medium'), 'the label is at the layout’s start', 1);
    expect(await css(row(page, 'mixed', 'Lisbon \\(WET\\)').locator('.option-label'), 'text-align')).toBe('right');
    const [c, placeholder] = [await box(container(page, 'mixed')), await box(part(page, 'mixed', '.placeholder'))];
    near(right(c) - right(placeholder), await token(page, 'container-padding-inline-medium'), 'the placeholder at the layout’s start');
    // The value: a left-to-right run in a right-to-left stage, cut at its own (right) end.
    const id = 'long-value-rtl';
    const value = part(page, id, '.value');
    expect(await value.evaluate((el) => [el.getAttribute('dir'), getComputedStyle(el).direction, getComputedStyle(el).textOverflow, el.scrollWidth > el.clientWidth])).toEqual(['auto', 'ltr', 'ellipsis', true]);
    const [lc, chevron, v] = [await box(container(page, id)), await box(part(page, id, '.chevron')), await box(value)];
    expect(chevron.x, 'the chevron is at the left').toBeLessThan(lc.x + lc.width / 2);
    // It begins with its first word: the first character is at the value box's left edge, inside it.
    const first = await value.evaluate((el) => {
      const text = [...el.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())!;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 1);
      return range.getBoundingClientRect().x;
    });
    near(first, v.x, 'the value begins with its first word', 1);
    expect(await value.evaluate((el) => el.scrollLeft)).toBe(0);
  });

  test('SEL-49, SEL-59: the width is measured from each option’s label in the language that option says — a line of its own in that language for each such option, as the value is then shown — and from one text for every option that says none', async ({ page }) => {
    const LANGUAGES = '<tanrei-option value="en">English</tanrei-option><tanrei-option value="de">Deutsch</tanrei-option><tanrei-option value="ja" lang="ja">日本語</tanrei-option><tanrei-option value="zh-CN" lang="zh-CN">简体中文（中国大陆）</tanrei-option>';
    await mount(page, [fx('said', { label: 'Language', value: 'zh-CN' }, LANGUAGES), fx('none', { value: 'o3' }, Array.from({ length: 5 }, (_, i) => `<tanrei-option value="o${i + 1}">Option ${i + 1}</tanrei-option>`).join(''))], { reducedMotion: true });
    await page.locator('.stage').evaluateAll((all) => all.forEach((el) => el.setAttribute('lang', 'fr')));
    const lines = (id: string) =>
      part(page, id, '.sizer').evaluate((el) => ({
        own: [...el.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join('').split('\n').filter((line) => line.trim()),
        said: [...el.children].map((line) => ({ text: line.textContent, lang: line.getAttribute('lang'), spoken: ['fr', 'ja', 'zh-CN'].filter((lang) => line.matches(`:lang(${lang})`)).join(' '), width: line.getBoundingClientRect().width })),
      }));
    const said = await lines('said');
    expect(said.own).toEqual(['English', 'Deutsch']);
    expect(said.said.map(({ text, lang, spoken }) => ({ text, lang, spoken }))).toEqual([
      { text: '日本語', lang: 'ja', spoken: 'ja' },
      { text: '简体中文（中国大陆）', lang: 'zh-CN', spoken: 'zh-CN' },
    ]);
    // The widest is the Chinese label: its line is as wide as the value shown, which is in the same language, and the
    // value is not cut.
    const value = part(page, 'said', '.value');
    await expect(value).toHaveAttribute('lang', 'zh-CN');
    const drawn = await value.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return { text: range.getBoundingClientRect().width, cut: el.scrollWidth > el.clientWidth };
    });
    near(said.said[1]!.width, drawn.text, 'the line measured and the value shown', 0.5);
    expect(drawn.cut).toBe(false);
    // A list that says no language is one text, and no element.
    const none = await lines('none');
    expect([none.own.length, none.said.length]).toEqual([5, 0]);
  });

  test('SEL-59, SEL-48: an option’s row, and the value the closed select shows, are in the language the option says (lang) and its words in the direction it says (dir) — its own or its group’s; the row is not turned; what assistive technology is told does not change; a change of either is drawn, and a long list’s rows carry them as they are drawn', async ({ page, browserName }) => {
    const LANGUAGES = `<tanrei-option value="en" lang="en">English</tanrei-option><tanrei-option value="ja" lang="ja">日本語</tanrei-option><tanrei-option value="zh-CN" lang="zh-CN">简体中文</tanrei-option><tanrei-option value="hi" lang="hi">हिन्दी</tanrei-option><tanrei-option value="es" lang="es">Español</tanrei-option><tanrei-option value="ar" lang="ar" dir="rtl">العربية (AR)</tanrei-option><tanrei-option value="none">Other</tanrei-option><tanrei-option-group label="Deutsch (DE)" lang="de" dir="ltr"><tanrei-option value="de-AT">Österreich</tanrei-option><tanrei-option value="de-CH" lang="de-CH" supporting-text="Schwiiz">Schweiz</tanrei-option></tanrei-option-group>`;
    await mount(page, [fx('languages', { label: 'Language', value: 'ja', open: true }, LANGUAGES), fx('closed', { label: 'Language', value: 'ar' }, LANGUAGES), fx('plain', { value: 'jp' })], { reducedMotion: true });
    await page.locator('.stage').evaluateAll((all) => all.forEach((el) => el.setAttribute('lang', 'fr')));
    await shownList(page, 'languages').toBe(true);
    // The option is data and is never drawn, so nothing
    // inherits its `lang` and `dir`; the row drawn from it takes them.
    const rows = () =>
      part(page, 'languages', '.scroll .row').evaluateAll((all) =>
        all.map((el) => {
          const [label, said] = [el.querySelector('.option-label')!, el.querySelector('.option-label > .said')];
          return {
            label: label.textContent,
            lang: el.getAttribute('lang'),
            // What the browser takes the words to be in: the selector that asks.
            spoken: ['en', 'ja', 'zh-CN', 'hi', 'es', 'ar', 'de', 'de-CH', 'fr'].filter((lang) => label.matches(`:lang(${lang})`)).join(' '),
            dir: said?.getAttribute('dir') ?? null,
            // The row itself is never turned: its columns are the layout's.
            row: [el.getAttribute('dir'), getComputedStyle(el).direction],
            words: getComputedStyle(said ?? label).direction,
          };
        }),
      );
    expect(await rows()).toEqual([
      { label: 'English', lang: 'en', spoken: 'en', dir: null, row: [null, 'ltr'], words: 'ltr' },
      { label: '日本語', lang: 'ja', spoken: 'ja', dir: null, row: [null, 'ltr'], words: 'ltr' },
      { label: '简体中文', lang: 'zh-CN', spoken: 'zh-CN', dir: null, row: [null, 'ltr'], words: 'ltr' },
      { label: 'हिन्दी', lang: 'hi', spoken: 'hi', dir: null, row: [null, 'ltr'], words: 'ltr' },
      { label: 'Español', lang: 'es', spoken: 'es', dir: null, row: [null, 'ltr'], words: 'ltr' },
      { label: 'العربية (AR)', lang: 'ar', spoken: 'ar', dir: 'rtl', row: [null, 'ltr'], words: 'rtl' },
      // An option that says nothing carries nothing: it is in the field's language — the stage's here, French, where
      // the engine hands an ancestor's language down into a shadow root (Chromium does; Firefox and WebKit answer
      // `:lang()` there from the document's or with none, which is theirs and not the row's).
      { label: 'Other', lang: null, spoken: browserName === 'chromium' ? 'fr' : expect.any(String), dir: null, row: [null, 'ltr'], words: 'ltr' },
      // A group's are its options' unless one says its own.
      { label: 'Österreich', lang: 'de', spoken: 'de', dir: 'ltr', row: [null, 'ltr'], words: 'ltr' },
      { label: 'Schweiz', lang: 'de-CH', spoken: 'de de-CH', dir: 'ltr', row: [null, 'ltr'], words: 'ltr' },
    ]);
    const swiss = row(page, 'languages', 'Schweiz');
    expect(await swiss.locator('.option-supporting').evaluate((el) => [el.matches(':lang(de-CH)'), el.querySelector('.said')?.getAttribute('dir')])).toEqual([true, 'ltr']);
    // The group's title is in the group's language and direction.
    expect(await part(page, 'languages', '.group').evaluate((el) => [el.getAttribute('lang'), el.getAttribute('dir'), el.querySelector('.group-title')!.matches(':lang(de)'), el.querySelector('.group-title > .said')?.getAttribute('dir')])).toEqual(['de', null, true, 'ltr']);
    // The words that say their direction are still placed by the layout: the Arabic name begins at the row's start
    // edge, the left, and its check is at the right — and "(AR)" stands at the LEFT of the name, as its direction has it.
    const arabic = row(page, 'languages', 'العربية \\(AR\\)');
    const [name, english, mark] = [await box(arabic.locator('.option-label')), await box(row(page, 'languages', 'English').locator('.option-label')), await box(arabic.locator('.mark'))];
    near(name.x, english.x, 'the same start edge as every row');
    expect(mark.x).toBeGreaterThan(name.x + name.width - 1);
    const ends = await arabic.locator('.said').evaluate((el) => {
      const text = [...el.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim())!;
      const at = (from: number, to: number) => {
        const range = document.createRange();
        range.setStart(text, from);
        range.setEnd(text, to);
        return range.getBoundingClientRect().x;
      };
      return { arabic: at(0, 7), latin: at(text.textContent!.indexOf('AR'), text.textContent!.indexOf('AR') + 2) };
    });
    expect(ends.latin, 'right to left: what is written last stands at the left').toBeLessThan(ends.arabic);
    // The value a closed select shows is the chosen option's words: its language, and its direction where it says one
    // (else the words' own, SEL-59).
    const shown = (id: string) => part(page, id, '.value').evaluate((el) => [el.textContent, el.getAttribute('lang'), el.getAttribute('dir'), getComputedStyle(el).direction]);
    expect(await shown('languages')).toEqual(['日本語', 'ja', 'auto', 'ltr']);
    expect(await shown('closed')).toEqual(['العربية (AR)', 'ar', 'rtl', 'rtl']);
    expect(await shown('plain'), 'an option that says neither: as before').toEqual(['Japan', null, 'auto', 'ltr']);
    await set(page, 'closed', { value: 'none' });
    expect(await shown('closed')).toEqual(['Other', null, 'auto', 'ltr']);
    await set(page, 'closed', { value: 'de-AT' });
    expect(await shown('closed')).toEqual(['Österreich', 'de', 'ltr', 'ltr']);
    // What assistive technology is told is what it was told: each option by its label, the combobox's value the label.
    // (The DevTools protocol gives a node no language: the attribute on the row and on the value is what a screen
    // reader's voice is chosen by.)
    if (browserName === 'chromium') {
      expect((await axNodes(page, 'option')).map((node) => node.name)).toEqual(['English', '日本語', '简体中文', 'हिन्दी', 'Español', 'العربية (AR)', 'Other', 'Österreich', 'Schweiz']);
      expect((await axNodes(page, 'combobox')).map((node) => node.value)).toEqual(['日本語', 'Österreich', 'Japan']);
    }
    // A change of either attribute is read as a change of the words is.
    await host(page, 'languages').evaluate((el) => {
      el.querySelector('[value="es"]')!.setAttribute('lang', 'es-MX');
      el.querySelector('[value="ar"]')!.removeAttribute('dir');
      el.querySelector('[value="ja"]')!.setAttribute('lang', 'ja-JP');
    });
    await expect(row(page, 'languages', 'Español')).toHaveAttribute('lang', 'es-MX');
    await expect(arabic.locator('.said')).toHaveCount(0);
    expect(await css(arabic.locator('.option-label'), 'unicode-bidi'), 'its words’ own direction again').toBe('plaintext');
    expect(await shown('languages')).toEqual(['日本語', 'ja-JP', 'auto', 'ltr']);
    // A long list draws the rows in view: one drawn later carries what its option says.
    await host(page, 'closed').evaluate((el) => {
      el.innerHTML = `${Array.from({ length: 300 }, (_, i) => `<tanrei-option value="o${i}">Option ${i + 1}</tanrei-option>`).join('')}<tanrei-option value="last" lang="ar" dir="rtl">الأخير</tanrei-option>`;
    });
    await focusSelect(page, 'closed');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'closed').toBe(true);
    await expect(row(page, 'closed', 'الأخير'), 'not drawn while it is far from view').toHaveCount(0);
    await page.keyboard.press('End');
    await expect(row(page, 'closed', 'الأخير')).toHaveAttribute('lang', 'ar');
    await expect(row(page, 'closed', 'الأخير').locator('.said')).toHaveAttribute('dir', 'rtl');
  });

  test('SEL-60: a variant or size the active design system does not have is drawn with the default’s tokens and reported; a variant a layer added draws no label and its edge as a stacked select does, with that value’s own tokens; a status the select does not define is idle, and reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('odd', { variant: 'ghost', size: 'huge', value: 'jp' }), fx('plain', { value: 'jp' })]);
    const [odd, plain] = [container(page, 'odd'), container(page, 'plain')];
    near((await box(odd)).height, (await box(plain)).height, 'the default size');
    for (const property of ['background-color', 'border-top-left-radius']) expect(await css(odd, property), property).toBe(await css(plain, property));
    expect(await css(part(page, 'odd', '.value'), 'color')).toBe(await css(part(page, 'plain', '.value'), 'color'));
    expect(await part(page, 'odd', '.field').getAttribute('data-layout')).toBe('stacked');
    await expect(part(page, 'odd', '.floating')).toHaveCount(0);
    for (const text of ['variant "ghost"', 'size "huge"']) await expect.poll(() => seen.some((w) => w.includes('SEL-60') && w.includes(text)), { message: text }).toBe(true);
    // The list of an unknown variant is the default's too.
    await set(page, 'odd', { open: true });
    await set(page, 'plain', { open: true });
    expect(await css(row(page, 'odd', 'Japan'), 'background-color')).toBe(await css(row(page, 'plain', 'Japan'), 'background-color'));
    // A variant a layer added: laid out as stacked — no label, the edge a line inside the container — from its own tokens:
    // the look is added to the box (`comp.input-box`), and to the select's own group for its options.
    await mount(page, [fx('added', { variant: 'tinted', value: 'jp' }), fx('added-open', { variant: 'tinted', value: 'jp', open: true })]);
    await page.addStyleTag({
      content: `:root { --tanrei-comp-input-box-tinted-container-color: rgb(1, 2, 3); --tanrei-comp-input-box-tinted-input-color: rgb(4, 5, 6); --tanrei-comp-select-tinted-selected-option-container-color: rgb(7, 8, 9); }`,
    });
    await page.mouse.move(700, 600);
    // The new values arrive over motion.state-*, each part by its own transition: every part is waited for. The
    // container's is no gate for the others — between two rgb() colors the value is read rounded to whole channels and
    // reaches the end some frames early, while the row moves from transparent and is read as oklab() until it is over.
    await expect.poll(() => css(container(page, 'added'), 'background-color')).toBe('rgb(1, 2, 3)');
    await expect.poll(() => css(part(page, 'added', '.value'), 'color')).toBe('rgb(4, 5, 6)');
    await expect.poll(() => css(row(page, 'added-open', 'Japan'), 'background-color')).toBe('rgb(7, 8, 9)');
    expect(await part(page, 'added', '.field').getAttribute('data-layout')).toBe('stacked');
    await expect(part(page, 'added', '.edge')).toHaveCount(1);
    await expect(part(page, 'added', '.floating')).toHaveCount(0);
    // What it does not define falls back to the default's.
    expect(await css(part(page, 'added', '.chevron'), 'color')).toBe(await color(page, 'stacked-trailing-icon-color'));
    // In a Field, a select of such a variant says it draws no label: the Field draws its row above it.
    await frame(page, 'framed', { label: 'Country' }, { variant: 'tinted', value: 'jp' });
    await expect(fieldRow(page, 'framed', '.label-row > .label')).toHaveText('Country');
    // A status the select does not define is idle: its text drawn as a status at rest, and reported.
    await mount(page, [fx('odd-status', { status: 'pending', statusText: '5 countries', open: true })], { reducedMotion: true });
    await expect(part(page, 'odd-status', '.status .status-text')).toHaveText('5 countries');
    expect(await part(page, 'odd-status', '.status').getAttribute('class')).toBe('status');
    await expect(part(page, 'odd-status', '.status tanrei-loading-indicator')).toHaveCount(0);
    await expect.poll(() => seen.some((w) => w.includes('SEL-60') && w.includes('status "pending"'))).toBe(true);
  });

  test('SEL-61, SEL-23: a select that has nothing to show — no option, no status and no empty text — draws its trigger as it is, stays focusable, does not open by any input or because open is true, draws no empty list and no text of its own, and is reported; given an empty text, a status text or a loading status it opens as any select does, its list that row alone', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('none', { placeholder: 'Nothing to choose', open: true, inline: false }, []), fx('plain', { placeholder: 'Nothing to choose' })]);
    await listen(page, 'none');
    near((await box(container(page, 'none'))).height, (await box(container(page, 'plain'))).height, 'the trigger as it is');
    await expect(part(page, 'none', '.chevron')).toHaveCount(1);
    expect((await read(page, 'none')).shown).toBe(false);
    await container(page, 'none').click();
    for (const key of ['Enter', 'Space', 'ArrowDown', 'ArrowUp', 'a']) await page.keyboard.press(key);
    expect(await read(page, 'none')).toMatchObject({ shown: false, focused: true, expanded: 'false' });
    expect(await heard(page)).toEqual([]);
    expect(await part(page, 'none', '.scroll').evaluate((el) => el.textContent?.trim())).toBe('');
    await expect.poll(() => seen.some((w) => w.includes('SEL-61'))).toBe(true);
    // Options that arrive are a select's again: it is open, as the product said.
    await host(page, 'none').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-option value="a">A</tanrei-option>'));
    await shownList(page, 'none').toBe(true);
    expect(await heard(page)).toEqual([]);
    // Something to say: it opens by a press, its list the status row alone.
    const given = [
      ['empty', { emptyText: 'No countries yet' }],
      ['failed', { status: 'error', statusText: 'Countries could not be loaded.' }],
      ['loading', { status: 'loading', statusText: 'Loading countries' }],
    ] as const;
    await mount(page, given.map(([id, props]) => fx(id, props, [])), { reducedMotion: true });
    for (const [id] of given) {
      await listen(page, id);
      await container(page, id).click();
      await shownList(page, id).toBe(true);
      expect(await heard(page), id).toEqual(['toggle true']);
      await expect(rows(page, id), id).toHaveCount(0);
      expect(await part(page, id, '.list').evaluate((el) => el.classList.contains('bare')), `${id}: the row alone`).toBe(true);
      await expect(part(page, id, id === 'loading' ? '.status tanrei-loading-indicator' : '.status .status-text'), id).toHaveCount(1);
      await page.keyboard.press('Escape');
      await closedList(page, id);
    }
  });
});

test.describe('the form, a frame around it and the option elements', () => {
  test('a form-associated element: it takes name and submits value, resets to the value it was first given, is restored, follows a disabled fieldset, and keeps a form with a select its Field says is required, left empty, from being submitted (SEL-11, SEL-46)', async ({ page }) => {
    await mount(page, [fx('base', {})]);
    await page.evaluate(async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<form id="f"><fieldset id="set"><tanrei-field label="Country" required required-text="Required"><tanrei-select id="s" name="country" value="fr">
           <tanrei-option value="">None</tanrei-option><tanrei-option value="ca">Canada</tanrei-option><tanrei-option value="fr">France</tanrei-option></tanrei-select></tanrei-field></fieldset></form>`,
      );
      for (let round = 0; round < 2; round++) for (const el of document.querySelectorAll('#f tanrei-field, #s')) await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    const select = page.locator('#s');
    const data = () => page.evaluate(() => [...new FormData(document.querySelector<HTMLFormElement>('#f')!).entries()].map(([k, v]) => `${k}=${String(v)}`));
    const settle = () => select.evaluate((el) => (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete);
    expect(await select.evaluate((el) => [(el.constructor as unknown as { formAssociated: boolean }).formAssociated, (el as unknown as HTMLSelectElement).form?.id, (el as unknown as HTMLSelectElement).willValidate])).toEqual([true, 'f', true]);
    expect(await data()).toEqual(['country=fr']);
    // The person chooses: the new value is submitted, and change bubbles to the form.
    await page.evaluate(() => ((window as unknown as { __changes: number }).__changes = 0, document.querySelector('#f')!.addEventListener('change', () => ((window as unknown as { __changes: number }).__changes += 1))));
    await select.locator('.field > .container').click();
    await select.locator('.row').nth(1).click();
    await settle();
    expect([await data(), await page.evaluate(() => (window as unknown as { __changes: number }).__changes)]).toEqual([['country=ca'], 1]);
    // Reset: back to the value attribute.
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.reset());
    await settle();
    expect([await select.evaluate((el) => (el as unknown as { value: string }).value), await data()]).toEqual(['fr', ['country=fr']]);
    // Restored on navigation: the browser hands the saved value back.
    await select.evaluate((el) => (el as unknown as { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('ca', 'restore'));
    await settle();
    expect(await select.evaluate((el) => (el as unknown as { value: string }).value)).toBe('ca');
    // Required and empty: the form does not validate, and the option whose value is empty is still a choice that is shown.
    await select.evaluate((el) => ((el as unknown as { value: string }).value = ''));
    await settle();
    expect(await page.evaluate(() => [document.querySelector<HTMLFormElement>('#f')!.checkValidity(), (document.querySelector('#s') as unknown as HTMLSelectElement).validity.valueMissing])).toEqual([false, true]);
    expect(await select.locator('.value').textContent()).toBe('None');
    expect(await select.evaluate((el) => (el as unknown as { error: boolean }).error), 'it never sets error').toBe(false);
    // A disabled fieldset: disabled, drawn so, and left out.
    await page.evaluate(() => (document.querySelector<HTMLFieldSetElement>('#set')!.disabled = true));
    await settle();
    // (A container that held focus keeps its tabindex for one frame, as the platform's own control keeps focus: src/primitives/disabled-while-focused.ts.)
    await expect.poll(() => select.locator('.field > .container').evaluate((el) => [el.getAttribute('aria-disabled'), el.hasAttribute('tabindex')])).toEqual(['true', false]);
    expect(await select.locator('.field').getAttribute('data-disabled')).not.toBeNull();
    expect(await data()).toEqual([]);
    expect(await page.evaluate(() => document.querySelector<HTMLFormElement>('#f')!.checkValidity()), 'a disabled select is not validated').toBe(true);
  });

  test('a select in a field group follows the group’s disabled and takes its error condition; a select in a Field is the way to build a select field by hand and is not reported, and it names, describes and marks itself from that Field (SEL-11, SEL-46, SEL-63)', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('base', {})]);
    await page.evaluate(async () => {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<tanrei-field-group id="g" label="Shipping"><tanrei-select id="s" label="Country" value="ca" name="country"><tanrei-option value="ca">Canada</tanrei-option></tanrei-select></tanrei-field-group>
         <tanrei-field label="Country" supporting-text="Where your order goes."><tanrei-select id="framed"><tanrei-option value="ca">Canada</tanrei-option></tanrei-select></tanrei-field>`,
      );
      for (let round = 0; round < 2; round++) for (const el of document.querySelectorAll('#g, #s, #framed, tanrei-field')) await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    const trigger = page.locator('#s .field > .container');
    expect(await trigger.evaluate((el) => [el.getAttribute('aria-disabled'), el.getAttribute('aria-label')])).toEqual([null, 'Country']);
    await page.locator('#g').evaluate(async (el) => {
      (el as unknown as { disabled: boolean }).disabled = true;
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await (document.querySelector('#s') as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    await expect.poll(() => trigger.getAttribute('aria-disabled')).toBe('true');
    expect(await page.locator('#s .field').getAttribute('data-disabled')).not.toBeNull();
    // In a Field: the Field's control, named and described by it, and no report that it is a field already.
    expect(await page.locator('#framed .field > .container').evaluate((el) => [el.getAttribute('aria-label'), (el.getRootNode() as ShadowRoot).getElementById('description')!.textContent])).toEqual(['Country', 'Where your order goes.']);
    await frames(page, 4);
    expect(seen.filter((w) => w.includes('FLD-15'))).toEqual([]);
    expect(seen.filter((w) => w.includes('[tanrei]') && w.includes('<tanrei-select>'))).toEqual([]);
  });

  test('the option elements: tanrei-option and tanrei-option-group are data — they draw nothing, reflect their properties, and the label is the label attribute or, without one, the element’s text; the select reads them again when an attribute, a property, the text or the children change (SEL-17, SEL-36)', async ({ page }) => {
    await mount(page, [fx('one', { value: 'b', open: true }, '<tanrei-option value="a">  Alpha\n  </tanrei-option><tanrei-option value="b" label="Beta">ignored text</tanrei-option><tanrei-option-group label="More"><tanrei-option value="c" supporting-text="Third" leading-icon="star" disabled>Gamma</tanrei-option></tanrei-option-group>')]);
    const h = host(page, 'one');
    expect(await page.evaluate(() => [customElements.get('tanrei-option')?.name, customElements.get('tanrei-option-group')?.name].every(Boolean))).toBe(true);
    expect(await h.evaluate((el) => [...el.querySelectorAll('tanrei-option, tanrei-option-group')].map((o) => o.getClientRects().length))).toEqual([0, 0, 0, 0]);
    // …and outside a select too: an option is never text of the page.
    expect(await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<tanrei-option-group class="loose" label="Loose"></tanrei-option-group><tanrei-option class="loose">Loose option</tanrei-option>');
      return [...document.querySelectorAll('.loose')].map((o) => getComputedStyle(o).display);
    })).toEqual(['none', 'none']);
    const labels = () => rows(page, 'one').locator('.option-label').allTextContents();
    expect(await labels()).toEqual(['Alpha', 'Beta', 'Gamma']);
    const gamma = row(page, 'one', 'Gamma');
    expect([await gamma.locator('.option-supporting').textContent(), await gamma.locator('.option-icon').textContent(), await gamma.getAttribute('aria-disabled')]).toEqual(['Third', 'star', 'true']);
    await expect(part(page, 'one', '.group-title')).toHaveText('More');
    // Properties reflect, and the select follows them.
    await h.evaluate((el) => {
      const option = el.querySelector('[value="a"]') as HTMLElement & { label: string; supportingText: string; leadingIcon: string; disabled: boolean; value: string };
      Object.assign(option, { label: 'First', supportingText: 'One', leadingIcon: 'home', disabled: true, value: 'first' });
    });
    await expect.poll(labels).toEqual(['First', 'Beta', 'Gamma']);
    expect(await h.evaluate((el) => el.querySelector('tanrei-option')!.getAttributeNames().sort())).toEqual(['disabled', 'label', 'leading-icon', 'supporting-text', 'value']);
    expect(await row(page, 'one', 'First').evaluate((el) => [el.getAttribute('aria-disabled'), el.querySelector('.option-supporting')?.textContent, el.querySelector('.option-icon')?.textContent])).toEqual(['true', 'One', 'home']);
    // The text, a group's title, and the children.
    await h.evaluate((el) => {
      el.querySelector('[value="c"]')!.textContent = 'Third letter';
      (el.querySelector('tanrei-option-group') as HTMLElement & { label: string }).label = 'Others';
      el.querySelector('[value="b"]')!.remove();
      el.querySelector('tanrei-option-group')!.insertAdjacentHTML('beforeend', '<tanrei-option value="d">Delta</tanrei-option>');
    });
    await expect.poll(labels).toEqual(['First', 'Third letter', 'Delta']);
    await expect(part(page, 'one', '.group-title')).toHaveText('Others');
    // The value that named the removed option names none now; it is kept.
    expect(await read(page, 'one')).toMatchObject({ value: 'b', selected: [] });
  });

  test('the default system leaves the filled and outlined selects out, and says so once per element in a debug build; they still render and work', async ({ page }) => {
    const seen = warnings(page);
    await mountSpec(page, ['filled-value', 'outlined-value', 'stacked-value']);
    await expect.poll(() => seen.filter((w) => w.includes('(availability)')).length).toBe(2);
    expect(seen.some((w) => w.includes('variant "filled" of select'))).toBe(true);
    expect(seen.some((w) => w.includes('variant "outlined" of select'))).toBe(true);
    await container(page, 'filled-value').click();
    await row(page, 'filled-value', 'Kenya').click();
    await expect(part(page, 'filled-value', '.value')).toHaveText('Kenya');
  });
});

// The rows are drawn while the list is shown and at no other time, and
// a list of more than a hundred options draws the rows near its scroll box. Counted, never timed.
test.describe('the rows: drawn while the list is shown, and in a long list those near the box that scrolls', () => {
  test('SEL-24: a list drawn open in place and turned to the overlay while it stays open (the test attribute inline, taken away) is presented in the top layer with every row drawn', async ({ page }) => {
    const id = 'stacked-open';
    await mountSpec(page, [id], { reducedMotion: true });
    await shownList(page, id).toBe(true);
    expect(await part(page, id, '.surface').evaluate((el) => [el.classList.contains('inline'), el.matches(':popover-open')])).toEqual([true, false]);
    await set(page, id, { inline: false });
    await expect.poll(() => part(page, id, '.surface').evaluate((el) => [el.classList.contains('inline'), el.matches(':popover-open')])).toEqual([false, true]);
    expect((await read(page, id)).open).toBe(true);
    const rows = part(page, id, '.scroll .row');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect.poll(() => rows.evaluateAll((all) => all.every((el) => el.getBoundingClientRect().height > 0))).toBe(true);
    // And back, in place again.
    await set(page, id, { inline: true });
    await expect.poll(() => part(page, id, '.surface').evaluate((el) => [el.classList.contains('inline'), el.matches(':popover-open')])).toEqual([true, false]);
    await expect.poll(() => rows.evaluateAll((all) => all.length > 0 && all.every((el) => el.getBoundingClientRect().height > 0))).toBe(true);
  });

  const many = (count: number) => Array.from({ length: count }, (_, i) => option(`Option ${i + 1}`, `o${i + 1}`));
  /** What the select's shadow root holds, counted. */
  const counted = (page: P, id: string) =>
    host(page, id).evaluate((el) => {
      const root = el.shadowRoot!;
      return { elements: root.querySelectorAll('*').length, rows: root.querySelectorAll('[role="option"]').length, rooms: root.querySelectorAll('.skipped').length };
    });
  /** The option `aria-activedescendant` names — an element of the shadow root, or null — with what it says of its place and whether the whole of it is in the box that scrolls. */
  const activeRow = (page: P, id: string) =>
    host(page, id).evaluate((el) => {
      const root = el.shadowRoot!;
      const named = root.querySelector('.container')!.getAttribute('aria-activedescendant');
      const row = named ? root.getElementById(named) : null;
      if (!row) return null;
      const [r, s] = [row.getBoundingClientRect(), root.querySelector('.scroll')!.getBoundingClientRect()];
      return { label: row.querySelector('.option-label')!.textContent, position: row.getAttribute('aria-posinset'), size: row.getAttribute('aria-setsize'), selected: row.getAttribute('aria-selected'), inView: r.top >= s.top - 0.6 && r.bottom <= s.bottom + 0.6 };
    });
  const scrollBox = (page: P, id: string) => part(page, id, '.scroll').evaluate((el) => ({ top: el.scrollTop, height: el.scrollHeight, view: el.clientHeight }));
  /** Turns the wheel over the list, a part of a page at a time (an engine may scroll no further for one turn), until the box has scrolled past `past` and stands still. */
  const wheelPast = async (page: P, id: string, past: number) => {
    for (let turn = 0; turn < 400 && (await scrollBox(page, id)).top <= past; turn++) {
      const before = (await scrollBox(page, id)).top;
      await page.mouse.wheel(0, 200);
      await expect.poll(async () => (await scrollBox(page, id)).top, { message: `turn ${turn}` }).toBeGreaterThan(before);
    }
    // …and has come to rest. An engine may take a turn of the wheel over many frames (WebKit on Linux: 200 px in
    // about ten steps over 230 ms), and the loop above ends at the first of them: what is read of the rows, and a
    // press, would otherwise meet a list still moving under the pointer.
    await part(page, id, '.scroll').evaluate(
      (el) =>
        new Promise<void>((resolve) => {
          let [last, still] = [el.scrollTop, 0];
          const look = () => {
            still = el.scrollTop === last ? still + 1 : 0;
            last = el.scrollTop;
            if (still >= 8) resolve();
            else requestAnimationFrame(look);
          };
          requestAnimationFrame(look);
        }),
    );
  };

  test('SEL-17, SEL-23, SEL-33, SEL-48: a closed select draws no row, and the number of elements in its shadow root does not grow with its options; it still shows the chosen option’s label, names its list box, and opens on a typed character with the option that character finds; opening draws the rows and closing takes them away', async ({ page }) => {
    await mount(page, [fx('few', { value: 'o3' }, many(5)), fx('some', { value: 'o30' }, many(60)), fx('many', { value: 'o1200' }, many(1632))], { reducedMotion: true });
    const [few, some, lots] = [await counted(page, 'few'), await counted(page, 'some'), await counted(page, 'many')];
    expect(few.rows).toBe(0);
    expect(some).toEqual(few);
    expect(lots).toEqual(few);
    expect(few.elements).toBeLessThan(40);
    // Closed, everything it says of its options is there: the value, and the list box its container names.
    await expect(part(page, 'many', '.value')).toHaveText('Option 1200');
    expect(await container(page, 'many').evaluate((el) => [el.getAttribute('aria-expanded'), el.getAttribute('aria-activedescendant'), (el.getRootNode() as ShadowRoot).getElementById(el.getAttribute('aria-controls')!)?.getAttribute('role')])).toEqual(['false', null, 'listbox']);
    // SEL-49: its width is still its widest option's (one hidden text, not an element for each option).
    expect((await box(container(page, 'many'))).width).toBeGreaterThan((await box(container(page, 'few'))).width);
    // Opened: a short list draws every row, each in its place.
    await focusSelect(page, 'some');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'some').toBe(true);
    expect(await counted(page, 'some')).toMatchObject({ rows: 60, rooms: 0 });
    expect(await activeRow(page, 'some')).toEqual({ label: 'Option 30', position: '30', size: '60', selected: 'true', inView: true });
    await page.keyboard.press('Escape');
    await closedList(page, 'some');
    await expect.poll(() => counted(page, 'some')).toEqual(few);
    // SEL-33: a character typed on a closed select opens it and finds its option — from the data, before any row is drawn.
    await set(page, 'few', { value: 'o1' });
    await host(page, 'few').evaluate((el) => el.querySelector('[value="o4"]')!.setAttribute('label', 'Zebra'));
    await focusSelect(page, 'few');
    await page.keyboard.press('z');
    await shownList(page, 'few').toBe(true);
    expect(await activeRow(page, 'few')).toMatchObject({ label: 'Zebra', position: '4', size: '5' });
    expect((await read(page, 'few')).value, 'typing never changes the value').toBe('o1');
  });

  test('SEL-25, SEL-31, SEL-48: a long list draws the rows near the box that scrolls — a number that does not grow with its options — and opens on its chosen option, whole and in view; the box scrolls over the whole list, and every drawn option says its position and the number of options', async ({ page }) => {
    await mount(page, [fx('long', { value: 'o450' }, many(600)), fx('longer', { value: 'o1200' }, many(1632))], { reducedMotion: true });
    const opened: Record<string, Awaited<ReturnType<typeof counted>>> = {};
    for (const [id, chosen, size] of [
      ['long', 450, 600],
      ['longer', 1200, 1632],
    ] as const) {
      await focusSelect(page, id);
      await page.keyboard.press('ArrowDown');
      await shownList(page, id).toBe(true);
      await expect.poll(() => activeRow(page, id), { message: id }).toEqual({ label: `Option ${chosen}`, position: String(chosen), size: String(size), selected: 'true', inView: true });
      opened[id] = await counted(page, id);
      expect(opened[id].rows, `${id}: far fewer rows than options`).toBeLessThan(80);
      expect(opened[id].rows).toBeGreaterThan(2 * 10);
      // The box scrolls over the whole list: as tall as every row, drawn or not.
      const rowHeight = (await box(row(page, id, `Option ${chosen}`))).height;
      const scroll = await scrollBox(page, id);
      near(scroll.height, size * rowHeight + 2 * (await token(page, 'list-padding-block')), `${id}: the scroll height`, 2);
      // Every drawn row is where its position says, with what it says of its place.
      const placed = await host(page, id).evaluate((el) => {
        const root = el.shadowRoot!;
        const first = root.querySelector<HTMLElement>('.row')!;
        return [...root.querySelectorAll<HTMLElement>('.row')].every((r) => r.getAttribute('aria-setsize') === first.getAttribute('aria-setsize') && Math.abs(r.offsetTop - first.offsetTop - (Number(r.getAttribute('aria-posinset')) - Number(first.getAttribute('aria-posinset'))) * first.offsetHeight) < 1 && r.querySelector('.option-label')!.textContent === `Option ${r.getAttribute('aria-posinset')}`);
      });
      expect(placed, `${id}: each drawn row stands at its position`).toBe(true);
      await page.keyboard.press('Escape');
      await closedList(page, id);
    }
    expect(opened.longer.rows, 'the rows drawn do not grow with the options').toBe(opened.long.rows);
    expect(opened.longer.elements).toBe(opened.long.elements);
  });

  test('SEL-25: a long list takes its width from the rows it draws as it opens and keeps it while it scrolls, so that a wider option drawn later wraps and the list does not change width under the pointer', async ({ page }) => {
    const wide = 'An option far down the list whose label is longer than any of the rows drawn as the list opens';
    await mount(page, [fx('long', { value: 'o1' }, [...many(280), option(wide, 'wide'), ...Array.from({ length: 5 }, (_, i) => option(`Last ${i + 1}`, `z${i}`))])], { reducedMotion: true });
    await focusSelect(page, 'long');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'long').toBe(true);
    await expect.poll(() => counted(page, 'long').then((c) => c.rooms)).toBeGreaterThan(0);
    const list = part(page, 'long', '.list');
    const opened = (await box(list)).width;
    expect(opened).toBeGreaterThanOrEqual((await box(container(page, 'long'))).width - 0.6);
    await page.keyboard.press('End');
    await expect.poll(() => activeRow(page, 'long').then((r) => r?.label)).toBe('Last 5');
    await expect(row(page, 'long', wide)).toHaveCount(1);
    near((await box(list)).width, opened, 'the width it opened with');
    const label = row(page, 'long', wide).locator('.option-label');
    expect(await label.evaluate((el) => el.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(el).lineHeight)), 'the wider option wraps').toBeGreaterThan(1.5);
    // Opened again, the width is taken again from what is drawn then: the rows near the wide option.
    await page.keyboard.press('Escape');
    await closedList(page, 'long');
    await set(page, 'long', { value: 'wide' });
    await focusSelect(page, 'long');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'long').toBe(true);
    await expect.poll(async () => (await box(list)).width).toBeGreaterThan(opened + 1);
  });

  test('SEL-31, SEL-32, SEL-33, SEL-34: in a long list every option is reached by the keys — the arrows, Home, End, the page keys and typing — and the active option is always an element aria-activedescendant names, whole and in view; Enter chooses it', async ({ page }) => {
    await mount(page, [fx('long', {}, [...many(1198), option('Zebra', 'z'), ...Array.from({ length: 433 }, (_, i) => option(`Later ${i + 1}`, `l${i + 1}`))])], { reducedMotion: true });
    await listen(page, 'long');
    await focusSelect(page, 'long');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'long').toBe(true);
    const at = (label: string, position: number) => expect.poll(() => activeRow(page, 'long'), { message: label }).toMatchObject({ label, position: String(position), size: '1632', inView: true });
    await at('Option 1', 1);
    await page.keyboard.press('ArrowDown');
    await at('Option 2', 2);
    for (let i = 0; i < 12; i++) await page.keyboard.press('PageDown');
    await at('Option 122', 122);
    await page.keyboard.press('End');
    await at('Later 433', 1632);
    const end = await scrollBox(page, 'long');
    expect(end.height - end.top - end.view, 'the box is at its end, but for the padding after the last option').toBeLessThanOrEqual((await token(page, 'list-padding-block')) + 1);
    await page.keyboard.press('ArrowUp');
    await at('Later 432', 1631);
    await page.keyboard.press('PageUp');
    await at('Later 422', 1621);
    // Typing finds an option far from what is drawn.
    await page.keyboard.press('z');
    await at('Zebra', 1199);
    await page.keyboard.press('Home');
    await at('Option 1', 1);
    expect((await scrollBox(page, 'long')).top, 'the box is at its start, but for the padding before the first option').toBeLessThanOrEqual((await token(page, 'list-padding-block')) + 1);
    expect((await counted(page, 'long')).rows, 'still a window').toBeLessThan(80);
    await page.keyboard.press('End');
    await at('Later 433', 1632);
    await page.keyboard.press('Enter');
    await closedList(page, 'long');
    expect(await read(page, 'long')).toMatchObject({ value: 'l433', shownValue: 'Later 433' });
    expect(await heard(page)).toEqual(['toggle true', 'change l433', 'toggle false select']);
  });

  test('SEL-25, SEL-26, SEL-34, SEL-48: a long list scrolled by the wheel draws the rows it comes to, and a press chooses one of them; the active option stays an element of the list however far the box is scrolled from it', async ({ page }) => {
    await mount(page, [fx('long', { value: 'o3' }, many(1632))], { reducedMotion: true });
    await focusSelect(page, 'long');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'long').toBe(true);
    await expect.poll(() => activeRow(page, 'long')).toMatchObject({ label: 'Option 3', inView: true });
    const list = await box(part(page, 'long', '.list'));
    const at = [list.x + list.width / 2, list.y + list.height / 2] as const;
    const under = () => host(page, 'long').evaluate((el, [x, y]) => (el.shadowRoot!.elementFromPoint(x, y)?.closest('.row')?.getAttribute('aria-posinset') ?? null) as string | null, at);
    // Scrolled with the pointer elsewhere (as its scroll bar does): the rows it comes to are drawn, and the active
    // option — far above now — is still an element of the list, as aria-activedescendant needs.
    await part(page, 'long', '.scroll').evaluate((el) => (el.scrollTop = 9000));
    await expect.poll(under).not.toBeNull();
    expect(Number(await under())).toBeGreaterThan(140);
    expect((await counted(page, 'long')).rows).toBeLessThan(80);
    expect(await activeRow(page, 'long')).toMatchObject({ label: 'Option 3', position: '3', size: '1632', inView: false });
    // By the wheel, a part of a page at a time: the row under the pointer is always one that is drawn.
    await page.mouse.move(at[0], at[1]);
    await wheelPast(page, 'long', 12000);
    await expect.poll(under).not.toBeNull();
    const position = Number(await under());
    expect(position).toBeGreaterThan(190);
    expect((await counted(page, 'long')).rows).toBeLessThan(80);
    await page.mouse.move(at[0], at[1] + 1);
    const hovered = await activeRow(page, 'long');
    expect(hovered, 'the row under the pointer is the active one').not.toBeNull();
    expect(Number(hovered!.position)).toBeGreaterThanOrEqual(position);
    await page.mouse.click(at[0], at[1] + 1);
    await closedList(page, 'long');
    expect((await read(page, 'long')).shownValue).toBe(hovered!.label);
  });

  test('SEL-37, SEL-44, SEL-45, SEL-48: a long list in groups, with rows of more than one height — a group that draws any of its options draws its title and is named by it, what is not drawn takes the room it would, and the last option is reached, whole and in view', async ({ page }) => {
    const groups = Array.from({ length: 24 }, (_, g) =>
      group(
        `Group ${g + 1}`,
        Array.from({ length: 25 }, (_, i) => option(`Option ${g + 1}.${i + 1}`, `g${g + 1}o${i + 1}`, i % 7 === 3 ? { supportingText: 'With a second line of its own' } : {})),
      ),
    );
    await mount(page, [fx('long', { value: 'g13o4' }, groups)], { reducedMotion: true });
    await focusSelect(page, 'long');
    await page.keyboard.press('ArrowDown');
    await shownList(page, 'long').toBe(true);
    await expect.poll(() => activeRow(page, 'long')).toEqual({ label: 'Option 13.4', position: String(12 * 25 + 4), size: '600', selected: 'true', inView: true });
    const drawn = () =>
      host(page, 'long').evaluate((el) => {
        const root = el.shadowRoot!;
        return [...root.querySelectorAll('.group')].map((g) => ({ role: g.getAttribute('role'), name: root.getElementById(g.getAttribute('aria-labelledby')!)?.textContent ?? null, first: g.firstElementChild!.className, rows: g.querySelectorAll('.row').length }));
      });
    const groupsDrawn = await drawn();
    expect(groupsDrawn.length).toBeGreaterThan(0);
    expect(groupsDrawn.length).toBeLessThan(8);
    for (const g of groupsDrawn) {
      expect(g.role).toBe('group');
      expect(g.name).toMatch(/^Group \d+$/);
      expect(g.first, 'its title stands first').toBe('group-title');
      expect(g.rows).toBeGreaterThan(0);
    }
    expect(groupsDrawn.map((g) => g.name)).toContain('Group 13');
    expect((await counted(page, 'long')).rows).toBeLessThan(100);
    // To the end and back: the rows seen on the way are measured, and the last option stands whole at the box's end.
    await page.keyboard.press('End');
    await expect.poll(() => activeRow(page, 'long')).toMatchObject({ label: 'Option 24.25', position: '600', inView: true });
    const end = await scrollBox(page, 'long');
    expect(end.height - end.top - end.view, 'the box is at its end, but for the padding after the last option').toBeLessThanOrEqual((await token(page, 'list-padding-block')) + 1);
    expect((await drawn()).map((g) => g.name)).toContain('Group 24');
    await page.keyboard.press('Home');
    await expect.poll(() => activeRow(page, 'long')).toMatchObject({ label: 'Option 1.1', position: '1', inView: true });
    expect((await drawn())[0]).toMatchObject({ name: 'Group 1', first: 'group-title' });
  });
});

test.describe('the clear button', () => {
  const clear = (page: P, id: string) => part(page, id, '.clear-button');
  const roomOf = (page: P, id: string) => part(page, id, '.clear');

  test('SEL-72, SEL-49: with clearable the select keeps the room of an icon-only text Button of Button’s small size before the chevron, action-gap from it, and draws the button — named by clearLabel, showing close — while a value is chosen; the chevron stays and a select given no width keeps its width as the value is cleared and chosen; a disabled and a read-only select draw none', async ({ page }) => {
    await mount(page, [
      fx('c', { value: 'jp', clearable: true, clearLabel: 'Clear country' }),
      fx('plain', { value: 'jp' }),
      fx('c-disabled', { value: 'jp', clearable: true, clearLabel: 'Clear country', disabled: true }),
      fx('c-read-only', { value: 'jp', clearable: true, clearLabel: 'Clear country', readOnly: true }),
    ]);
    await expect(clear(page, 'c')).toHaveAttribute('variant', 'text');
    await expect(clear(page, 'c')).toHaveAttribute('size', 'small');
    await expect(clear(page, 'c').locator('[slot="icon"]')).toHaveText('close');
    await expect(host(page, 'c').getByRole('button', { name: 'Clear country', exact: true })).toHaveCount(1);
    // Its glyph is centred on the container's height, action-gap before the chevron's box.
    const [c, chevron, g] = [await box(container(page, 'c')), await box(part(page, 'c', '.chevron')), await box(clear(page, 'c').locator('.icon'))];
    const [icon, gap] = [await token(page, 'icon-size-medium'), await resolveToken(page, '--tanrei-comp-select-container-action-gap')];
    near(chevron.x - (g.x + g.width / 2), gap + icon / 2, 'before the chevron');
    near(g.y + g.height / 2, c.y + c.height / 2, 'centred');
    // The chevron is the room further in than without clearable, and stays there as the value is cleared.
    const plain = await box(part(page, 'plain', '.chevron'));
    const [plainBox] = [await box(container(page, 'plain'))];
    near(c.width - plainBox.width, icon + gap, 'the room');
    near(c.x + c.width - (chevron.x + chevron.width), plainBox.x + plainBox.width - (plain.x + plain.width), 'the chevron from the end');
    await set(page, 'c', { value: '' });
    await expect(clear(page, 'c')).toHaveCount(0);
    await expect(roomOf(page, 'c')).toHaveCount(1);
    const [after, chevronAfter] = [await box(container(page, 'c')), await box(part(page, 'c', '.chevron'))];
    near(after.width, c.width, 'width kept');
    near(chevronAfter.x, chevron.x, 'chevron kept');
    for (const id of ['c-disabled', 'c-read-only']) {
      await expect(clear(page, id), id).toHaveCount(0);
      await expect(roomOf(page, id), id).toHaveCount(0);
    }
  });

  test('SEL-72, SEL-13: the clear button is a focus stop after the container, outside the combobox; a click and Enter on it empty the value, emit change once and give focus back to the container, which shows the placeholder; a press on it keeps focus on the container and leaves an open list open, with no toggle', async ({ page }) => {
    await mount(page, [fx('c', { value: 'jp', placeholder: 'Any country', clearable: true, clearLabel: 'Clear country' }), fx('after', { value: 'fr' })], { reducedMotion: true });
    // Outside the combobox: no button is in the element that carries its role.
    expect(await container(page, 'c').locator('tanrei-button, button').count()).toBe(0);
    await listen(page, 'c');
    // Tab: the container, then the clear button, then on.
    await tabTo(page, container(page, 'c'));
    await tab(page);
    await expect(clear(page, 'c').locator('button')).toBeFocused();
    await tab(page, { back: true });
    expect((await read(page, 'c')).focused).toBe(true);
    await tab(page);
    await page.keyboard.press('Enter');
    expect(await heard(page)).toEqual(['change ']);
    expect((await read(page, 'c')).focused).toBe(true);
    await expect(part(page, 'c', '.placeholder')).toHaveText('Any country');
    await expect(clear(page, 'c')).toHaveCount(0);
    // With the mouse, the list open: it stays open, nothing toggles, focus stays on the container, nothing is chosen.
    await set(page, 'c', { value: 'ke' });
    await container(page, 'c').click();
    await shownList(page, 'c').toBe(true);
    expect(await heard(page)).toEqual(['toggle true']);
    await clear(page, 'c').click();
    expect(await heard(page)).toEqual(['change ']);
    const now = await read(page, 'c');
    expect([now.open, now.shown, now.focused, now.selected]).toEqual([true, true, true, []]);
  });

  test('SEL-72, SEL-62: without clearLabel and the product’s words the clear button is drawn, works and has no name, and the report names clearLabel; the product’s words name it, and an instance’s own prop wins', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('nameless', { value: 'jp', clearable: true }), fx('own', { value: 'jp', clearable: true, clearLabel: 'Clear country' })]);
    await expect(clear(page, 'nameless')).toHaveCount(1);
    await expect(clear(page, 'nameless').locator('button')).not.toHaveAttribute('aria-label');
    await expect.poll(() => seen.filter((w) => w.includes('clear-label is empty') && w.includes('(SEL-72)')).length).toBe(1);
    expect(await missingWords(page)).toEqual(['clearLabel']);
    await setWords(page, { clearLabel: 'Clear' });
    await expect(host(page, 'nameless').getByRole('button', { name: 'Clear', exact: true })).toHaveCount(1);
    await expect(host(page, 'own').getByRole('button', { name: 'Clear country', exact: true })).toHaveCount(1);
    await clear(page, 'nameless').click();
    expect((await read(page, 'nameless')).value).toBe('');
    expect(await missingWords(page)).toEqual([]);
  });

  test('SEL-72, SEL-55: in a right-to-left layout the clear button stands at the left, between the chevron and the value, its glyph unmirrored', async ({ page }) => {
    await mountSpec(page, ['clearable-rtl']);
    const id = 'clearable-rtl';
    const [chevron, g, value] = [await box(part(page, id, '.chevron')), await box(clear(page, id).locator('.icon')), await box(part(page, id, '.value'))];
    expect(chevron.x).toBeLessThan(g.x);
    expect(g.x + g.width).toBeLessThan(value.x);
    expect(await clear(page, id).locator('[slot="icon"]').evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  });
});

test.describe('accessibility', () => {
  for (const theme of THEMES) {
    test(`axe: every fixture, closed and open, has no violations in ${theme}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true, theme });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([]);
    });

    test(`axe: the list in the top layer — opened by the keyboard, an option active, one disabled, groups — has no violations in ${theme}`, async ({ page }) => {
      await mount(page, [fx('one', { label: 'Plan', value: 'team' }, [group('Plans', [option('Free', 'free', { supportingText: 'One project' }), option('Team', 'team', { leadingIcon: 'group' })]), option('Enterprise', 'enterprise', { disabled: true })])], { theme, reducedMotion: true });
      await focusSelect(page, 'one');
      await page.keyboard.press('ArrowDown');
      await shownList(page, 'one').toBe(true);
      await page.keyboard.press('ArrowDown');
      // The list fades in, even where motion is reduced (MOT-6): its colors are read once it is whole.
      await motionEnded(page);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([]);
    });
  }
});

test.describe('fixtures', () => {
  test('every fixture is mounted and visible, with the floating label, the value or the placeholder, the glyphs and — where it is open — the list the spec gives it, and no row of a frame', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(57);
    const flat = (items: FixtureItem[] = []): FixtureItem[] => items.flatMap((item) => (item.kind === 'option' ? [item] : flat(item.items)));
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toBeVisible();
      await expect(container(page, f.id), f.id).toBeVisible();
      const options = flat(f.items);
      const chosen = options.find((o) => o.props.value === (f.props.value ?? ''));
      if (chosen) await expect(part(page, f.id, '.value'), f.id).toHaveText(String(chosen.props.label));
      else if (f.props.placeholder) await expect(part(page, f.id, '.placeholder'), f.id).toHaveText(String(f.props.placeholder));
      else await expect(part(page, f.id, '.value, .placeholder'), f.id).toHaveCount(0);
      // SEL-15, SEL-64: a filled or outlined select floats its name; a stacked one draws no label, and none draws a row.
      const variant = f.props.variant ?? 'stacked';
      const floats = variant !== 'stacked' && !f.props.labelHidden;
      expect(await part(page, f.id, '.floating').count(), `${f.id} label`).toBe(floats ? 1 : 0);
      if (floats) await expect(part(page, f.id, '.floating'), f.id).toHaveText(String(f.props.label));
      expect(await container(page, f.id).getAttribute('aria-label'), `${f.id} name`).toBe(String(f.props.label));
      expect(await part(page, f.id, '.label-row, .supporting-text, tanrei-tag').count(), `${f.id}: no row of a frame`).toBe(0);
      near((await box(host(page, f.id))).height, (await box(container(page, f.id))).height + (await container(page, f.id).evaluate((el) => Number.parseFloat(getComputedStyle(el).marginTop) || 0)), `${f.id}: as tall as its container`);
      expect(await part(page, f.id, '.chevron').count(), `${f.id} chevron`).toBe(f.props.readOnly ? 0 : 1);
      const open = f.props.open === true && !f.props.disabled;
      // The rows are drawn while the list is shown, and at no other time.
      expect(await rows(page, f.id).count(), `${f.id} options`).toBe(open ? options.length : 0);
      expect((await read(page, f.id)).shown, `${f.id} list`).toBe(open);
      if (open) {
        await expect(part(page, f.id, '.list'), f.id).toBeVisible();
        const [s, l] = [await box(stage(page, f.id)), await box(part(page, f.id, '.list'))];
        expect(l.y + l.height, `${f.id}: the list is inside its stage`).toBeLessThanOrEqual(s.y + s.height);
        expect(l.x + l.width, `${f.id}: the list is inside its stage`).toBeLessThanOrEqual(s.x + s.width + 0.6);
      }
      if (f.slots?.['leading-icon']) await expect.poll(() => host(page, f.id).locator('[slot="leading-icon"]').evaluate((el) => el.getBoundingClientRect().width > 0), { message: f.id }).toBe(true);
      expect((await box(host(page, f.id))).width, `${f.id}: never wider than its column`).toBeLessThanOrEqual(280.6);
    }
  });

  // One fixture is mounted for its picture, drawn as on the page of all of them (`mountFixtureAsInAll`): that page is
  // mounted once for a worker, not once for each picture.
  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtureAsInAll(page, spec, f, { icons: true });
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
