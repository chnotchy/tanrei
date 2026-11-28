// The cloak (`@tanrei/web/cloak.css`, src/styles/cloak.css): a page whose elements are defined late shows none of them
// unstyled and does not move when they are defined, with the cloak; without it, nothing changes.
//
// "Late" is an amount of layout, not a time. Every page is written as a server sends it — its stylesheets and its
// elements, and no script — and two frames are drawn before the bundle runs, so the first frames are always the page
// before any element is defined, which is what a reader on a slow line sees, however fast the machine is. Then the
// bundle runs, every element of the page is defined, and the page is read again once three frames running have drawn
// it the same. What moved in between is read twice:
// - as boxes, in every engine: each held element's height and the height of its fixture's stage, so that nothing below
//   a fixture moves;
// - as Chromium's own measure of it, the sum of every `layout-shift` entry recorded meanwhile (the Layout Instability
//   API; the other engines have none). Core Web Vitals calls a page's CLS good under 0.1; a page here is held to 0.01.
// affected: each component — each test names in its title the component it draws; the ones that name none hold the walk together.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, type FixtureItem, fixturesDocument, loadSpec } from '../test/harness.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = (file: string) => fs.readFileSync(path.join(here, '../dist', file), 'utf8');

/** A page's budget of layout shift, as Chromium measures it: a tenth of what Core Web Vitals calls good. */
const SHIFT_BUDGET = 0.01;

/**
 * The elements a rule of the cloak gives `declaration` — read from the built stylesheet, so a component it starts
 * holding, or takes out of the page, is tested here without anyone editing a list. With `styled`, only the elements
 * the rule styles (named in its last compound), not those it asks about on the way (a tab view whose panels after the
 * first it takes out of the page is not itself taken out).
 */
function tagsWith(declaration: RegExp, { styled = false } = {}): string[] {
  const css = dist('cloak.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const tags = new Set<string>();
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!declaration.test(body!)) continue;
    for (const one of styled ? lastCompounds(selector!) : [selector!]) {
      for (const [tag] of one.matchAll(/tanrei-[a-z-]+/g)) tags.add(tag);
    }
  }
  // An element that stands only inside another (a tab, a stepper's step) is tested in its container's fixtures.
  return [...tags].filter((tag) => fs.existsSync(path.join(here, '../../../specs', `${tag.replace(/^tanrei-/, '')}.spec.json`))).sort();
}

/** `text` split at each `separator` that stands outside any parentheses or brackets. */
function topLevel(text: string, separator: string): string[] {
  const out = [''];
  let depth = 0;
  for (const char of text) {
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth -= 1;
    if (char === separator && depth === 0) out.push('');
    else out[out.length - 1] += char;
  }
  return out.filter((part) => part.trim() !== '' && part.trim() !== '>');
}

/**
 * The compounds a selector list styles: of each selector, its last compound — and where the selector is written in
 * `:where()` (the cloak's are), the last compound of each selector inside it.
 */
function lastCompounds(list: string): string[] {
  return topLevel(list, ',').flatMap((selector) => {
    const last = topLevel(selector.trim(), ' ').at(-1)!.trim();
    // A rule for a box the element generates (its `::before`, its `::after`) styles no element.
    if (/::[\w-]+$/.test(last)) return [];
    const inside = /^:where\((.*)\)(?::where\(.*\))*$/.exec(last);
    if (!inside) return [last];
    // The first `:where()` holds the element; the ones after it hold its conditions.
    let depth = 0;
    let end = 0;
    for (let i = ':where('.length - 1; i < last.length; i++) {
      if (last[i] === '(') depth += 1;
      if (last[i] === ')' && --depth === 0) {
        end = i;
        break;
      }
    }
    return topLevel(last.slice(':where('.length, end), ',').map((each) => topLevel(each.trim(), ' ').at(-1)!);
  });
}

/**
 * The elements whose height the page gives them (their fixtures' stages give it): the cloak lays each out as the box it
 * will be, so that the page's size holds before it is defined, and they are tested with the controls it holds.
 */
const SIZED_BY_THE_PAGE = ['tanrei-scroll-area', 'tanrei-split-view'];

/**
 * The elements whose height is their items' (a list's column, line or grid of the product's content): the cloak lays
 * each out as the box it will be, its items in it, and holds it by that layout rather than by a height of its own.
 */
const LAID_OUT = ['tanrei-list'];

/**
 * The fixtures whose element the cloak holds lower than it will be drawn, by spec, with why: the cloak holds a
 * control's one row, and these grow past it by what they draw once they are defined — by what no token says (how many
 * rows, chips or attachments there are, or how wide the words are). None is held higher than it will be (the test asks
 * that of them), so what is below one moves down, never up. A reason leaves the list when the cloak learns to hold it.
 */
type Grows = { grows: (props: Record<string, unknown>, fixture: Fixture) => boolean; why: string };
const CHIPS: Grows = { grows: (props) => props.selection === 'multiple', why: 'a combobox of several values draws them as chips, on as many rows as they need' };
/**
 * A multi-line input is held at its fewest rows (`min-rows`, from its tokens: the multi-line fixtures below); one that
 * holds a value and follows its lines can take more than those, as many as its words and its width make.
 */
const ROWS: Grows = { grows: (props) => !!props.multiline && String(props.value ?? '') !== '' && props.resize !== 'fixed', why: 'a multiline input that holds a value is as tall as its lines, and the cloak holds its fewest rows' };
const ENTRIES: Grows = { grows: (props) => (Array.isArray(props.value) && props.value.length > 0) || (Array.isArray(props.entries) && props.entries.length > 0), why: 'its entries are drawn as chips in its box, on as many rows as they need' };
const VALUE_LINE: Grows = { grows: (_props, fixture) => fixture.id.endsWith('long-value-text'), why: 'a value text too long to share the label’s line takes a line of its own under it' };
/** A Field's control, the fixture's one item: by the reasons its own spec has. */
const CONTROL: Grows = {
  grows: (_props, fixture) => {
    const item = fixture.items?.[0];
    const props = (item?.props ?? {}) as Record<string, unknown>;
    return (!!item && ['chat-composer', 'file-picker', 'file-upload'].includes(item.kind)) || [CHIPS, ROWS, ENTRIES].some((reason) => reason.grows(props, fixture));
  },
  why: 'its control is one the cloak holds no higher than its one row (a multiline input, chips) or does not hold (a chat composer, a file picker, a file upload)',
};
const ROW_OF_CHOICES: Grows = { grows: (props) => props.orientation === 'horizontal', why: 'a row of choices wraps where they do not fit, and their widths are not held' };
const GROWS: Record<string, Grows[]> = {
  'chat-composer': [
    {
      grows: (props, fixture) => !!fixture.items?.length || String(props.value ?? '') !== '',
      why: 'its attachments are drawn above the line, and its text takes as many lines as it needs',
    },
  ],
  'checkbox-group': [ROW_OF_CHOICES],
  'chip-field': [ENTRIES],
  combobox: [CHIPS],
  'combobox-field': [CHIPS],
  'embedded-text-input': [ROWS],
  field: [CONTROL, VALUE_LINE],
  'field-group': [ROW_OF_CHOICES],
  'radio-group': [ROW_OF_CHOICES],
  'slider-field': [VALUE_LINE],
  snackbar: [{ grows: (props) => !!props.action, why: 'an action that does not fit beside the text takes a row of its own under it' }],
  'text-input': [ROWS],
  'text-field': [ROWS],
  'tab-view': [
    {
      grows: (props, fixture) => props.value !== undefined && props.value !== null && fixture.items?.[0]?.props?.value !== props.value,
      why: 'the panel shown is the one its value names, which CSS cannot match to a panel: the cloak holds the first panel, here a lower one',
    },
  ],
};

/**
 * Why any fixture may be held lower than it is drawn: a text the element draws, or one of the elements it lays out
 * draws — a field's label, its help or its error text, a step's label, a choice's label — that wraps onto more lines
 * than one where it is drawn (`stages()` reads it from the drawn element in each engine). The cloak holds a text at one
 * line: how many lines it takes is a matter of the words, the width and the face, which no token says.
 */
const WRAPS = 'a text it draws wraps onto more lines than one, and the cloak holds one';

/**
 * The page as a server sends it: `markup` with no script, and the cloak's stylesheet when `cloak` is set, then the
 * package's stylesheets named in `sheets` (an element's own for the time before it is defined: `callout.css`); the
 * scripts it held back.
 */
function withoutScripts(markup: string, cloak: boolean, sheets: string[] = []): { page: string; scripts: string[] } {
  const at = markup.indexOf('<script type="module">');
  const scripts = [...markup.slice(at).matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((match) => match[1]!);
  const head = `${[...(cloak ? ['cloak.css'] : []), ...sheets].map((sheet) => `<style>${dist(sheet)}</style>`).join('')}</head>`;
  return { page: `${markup.slice(0, at).replace('</head>', head)}<p id="after">After the fixtures.</p></body></html>`, scripts };
}

/** Runs in the page: resolves after `n` frames have been drawn. */
const frames = (page: Page, n: number) =>
  page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
        step(count);
      }),
    n,
  );

/** Starts the sum of Chromium's layout-shift entries (`window.__shift`), and the list of what moved (`window.__moved`). */
async function observeShifts(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __shift: number; __moved: string[] };
    w.__shift = 0;
    w.__moved = [];
    type Source = { node: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly };
    const rect = (r: DOMRectReadOnly) => `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}×${Math.round(r.height)}`;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as { hadRecentInput: boolean; value: number; sources: Source[] }[]) {
        if (entry.hadRecentInput) continue;
        w.__shift += entry.value;
        for (const source of entry.sources) w.__moved.push(`${entry.value.toFixed(4)} ${source.node?.nodeName ?? '?'} ${(source.node as Element | null)?.id ?? ''}: ${rect(source.previousRect)} → ${rect(source.currentRect)}`);
      }
    }).observe({ type: 'layout-shift', buffered: false });
  });
}

/** The sum `observeShifts()` started, and each box that moved (its entry's value, the node, its rectangles before and after). */
const shifts = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __shift: number; __moved: string[] };
    return { sum: w.__shift, moved: w.__moved.join('\n') };
  });

/**
 * Runs the scripts held back, then waits until every element of the page is defined, its faces are loaded and three
 * frames running have drawn the same `read`.
 */
async function define<T>(page: Page, scripts: string[], read: () => Promise<T>): Promise<T> {
  for (const content of scripts) await page.addScriptTag({ type: 'module', content });
  await page.evaluate(() => Promise.all([...new Set([...document.querySelectorAll('*')].map((el) => el.localName).filter((name) => name.startsWith('tanrei-')))].map((name) => customElements.whenDefined(name))));
  return settled(page, read);
}

/** Waits until the page's faces are loaded and three frames running have drawn the same `read`. */
async function settled<T>(page: Page, read: () => Promise<T>): Promise<T> {
  await page.evaluate(() => document.fonts.ready);
  let last = '';
  let same = 0;
  for (let frame = 0; frame < 120 && same < 3; frame++) {
    await frames(page, 1);
    const now = JSON.stringify(await read());
    same = now === last ? same + 1 : 0;
    last = now;
  }
  return read();
}

/**
 * Runs in the page: each fixture's element (by the spec's tag) — its height and width, its visibility, whether a rule holds its
 * height (a `min-block-size`, or a padding, that is not `0px`), whether a text it draws wraps — and its stage's height.
 */
function stages({ tag, sized }: { tag: string; sized: boolean }) {
  /**
   * A text drawn in a shadow tree under `root` — the element's own, its children's (a stepper's steps) — that is a
   * label, a description, a help, an error text or a value text, on more lines than one.
   */
  const wraps = (root: Element | ShadowRoot): boolean =>
    [...root.querySelectorAll('*')].some((el) => {
      if (el.matches('[part~="label"], [part~="description"], [part~="supporting-text"], [part~="error-text"], [part~="value-text"]') && el.getBoundingClientRect().height > 1.5 * parseFloat(getComputedStyle(el).lineHeight)) return true;
      return !!el.shadowRoot && wraps(el.shadowRoot);
    });
  return [...document.querySelectorAll('[data-fixture]')].map((stage) => {
    const element = stage.querySelector(tag);
    const style = element ? getComputedStyle(element) : undefined;
    return {
      id: stage.getAttribute('data-fixture')!,
      stage: stage.getBoundingClientRect().height,
      height: element?.getBoundingClientRect().height ?? 0,
      width: element?.getBoundingClientRect().width ?? 0,
      visibility: style?.visibility ?? '',
      // A rule holds its height: a minimum, or a row it keeps the room of (a field's label and supporting rows) — or, for
      // an element the page sizes, the box the size applies to, and for one whose height is its items', their layout.
      held: !!style && (!['0px', 'auto'].includes(style.minBlockSize) || style.paddingBlockStart !== '0px' || style.paddingBlockEnd !== '0px' || (sized && style.display !== 'inline')),
      wraps: !!element && ((!!element.shadowRoot && wraps(element.shadowRoot)) || wraps(element)),
    };
  });
}

/**
 * A spec's fixtures written with the cloak and no script, read in their first frames (`before`), then defined and read
 * again (`after`). In a new window: one that has run the bundle keeps its elements defined, whatever document is
 * written into it. Chromium's layout shifts are summed from just before the script runs. `system` draws the page under
 * a preset, `fixtures` mounts those in place of the spec's, and `sheets` loads those stylesheets of the package after
 * the cloak.
 */
async function mountedLate(first: Page, tag: string, browserName: string, options: { system?: string; fixtures?: Fixture[]; sheets?: string[] } = {}) {
  const spec = loadSpec(tag.replace(/^tanrei-/, ''));
  const page = await first.context().newPage();
  const { sheets, ...written } = options;
  const { page: markup, scripts } = withoutScripts(await fixturesDocument(spec, { icons: true, ...written }), true, sheets);
  await page.setContent(markup);
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 2);
  expect(await page.evaluate((t) => !!customElements.get(t), tag)).toBe(false);
  const sized = SIZED_BY_THE_PAGE.includes(tag) || LAID_OUT.includes(tag);
  const before = await page.evaluate(stages, { tag, sized });
  expect(before.length).toBe((options.fixtures ?? spec.fixtures).length);
  if (browserName === 'chromium') await observeShifts(page);
  const after = await define(page, scripts, () => page.evaluate(stages, { tag, sized }));
  return { spec, page, before, after };
}

test.describe('an element whose surface is in the top layer takes no room before it is defined, as after', () => {
  const tags = tagsWith(/display: none/, { styled: true });
  test('the cloak takes the overlays out of the page', () => {
    expect(tags).toEqual(['tanrei-bottom-sheet', 'tanrei-date-time-picker', 'tanrei-dialog', 'tanrei-image-preview', 'tanrei-modal-layer', 'tanrei-popover', 'tanrei-side-sheet']);
  });

  for (const tag of tags) {
    test(`${tag.replace(/^tanrei-/, '')}: with the cloak and no script, no fixture's stage is higher or lower than once it is defined`, async ({ page: first, browserName }) => {
      const { page, before, after } = await mountedLate(first, tag, browserName);
      expect(before.map((stage) => `${stage.id} ${Math.round(stage.stage)}px`)).toEqual(after.map((stage) => `${stage.id} ${Math.round(stage.stage)}px`));
      if (browserName === 'chromium') {
        const { sum, moved } = await shifts(page);
        expect(sum, moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      }
      await page.close();
    });
  }
});

/**
 * The elements the cloak holds only as they are drawn in place for documentation and tests, not as their spec's
 * fixtures draw them (in the top layer, where the cloak takes them out of the page): each is held below with its
 * fixtures drawn in place.
 */
const HELD_IN_PLACE = ['tanrei-date-time-picker'];

test.describe('the cloak holds every control it names at the height it will be drawn', () => {
  const tags = [...new Set([...tagsWith(/min-block-size:|padding-block-(?:start|end):/), ...SIZED_BY_THE_PAGE])].filter((tag) => !HELD_IN_PLACE.includes(tag)).sort();
  test('it holds the controls whose height is a token of their own, and lays out the elements the page sizes', () => {
    // The list the tests below go through: a rule of the stylesheet that no longer holds anything would shrink it.
    expect(tags.length).toBeGreaterThan(40);
    for (const tag of ['tanrei-button', 'tanrei-checkbox', 'tanrei-text-input', 'tanrei-select', 'tanrei-tabs', 'tanrei-text-field', 'tanrei-field-group']) expect(tags).toContain(tag);
    // An element the page sizes is given its box by a rule of its own.
    expect(SIZED_BY_THE_PAGE.filter((tag) => !tagsWith(/display: (?:block|flex)/).includes(tag))).toEqual([]);
  });

  for (const tag of tags) {
    const name = tag.replace(/^tanrei-/, '');
    test(`${name}: with the cloak and no script, every fixture is hidden and as high as once it is defined, and nothing below it moves`, async ({ page: first, browserName }) => {
      const { spec, page, before, after } = await mountedLate(first, tag, browserName);
      // Nothing of it is painted before it is defined, and all of it after.
      expect(before.filter((stage) => stage.visibility !== 'hidden').map((stage) => stage.id)).toEqual([]);
      expect(after.filter((stage) => stage.visibility !== 'visible').map((stage) => stage.id)).toEqual([]);
      // Each fixture the cloak holds is as high as it will be (within a device pixel's rounding) and so is its stage,
      // so nothing below it moves; one that grows by what it draws is held no higher than it will be. One it does not
      // hold (a vertical slider, a key drawn as plain text, an open search) is left as it is.
      const fixtures = new Map(spec.fixtures.map((fixture) => [fixture.id, fixture]));
      const growth = (i: number) => {
        const fixture = fixtures.get(before[i]!.id)!;
        const why = GROWS[name]?.find((reason) => reason.grows((fixture.props ?? {}) as Record<string, unknown>, fixture))?.why;
        return why ?? (after[i]!.wraps ? WRAPS : undefined);
      };
      const wrong = before.flatMap((stage, i) => {
        const drawn = after[i]!;
        if (!stage.held) return [];
        const why = growth(i);
        if (why ? stage.height <= drawn.height + 0.5 : Math.abs(stage.height - drawn.height) <= 0.5 && Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
        return [`${stage.id}: held ${stage.height}px in a stage of ${stage.stage}px, drawn ${drawn.height}px in ${drawn.stage}px${why ? ` (it grows: ${why})` : ''}`];
      });
      expect(wrong).toEqual([]);
      expect(before.filter((stage) => stage.held).length, 'the cloak holds some of the fixtures').toBeGreaterThan(0);
      // Chromium's own measure, for a spec whose every fixture is held as it will be drawn: within the budget.
      if (browserName === 'chromium' && before.every((stage, i) => stage.held && !growth(i))) {
        const { sum, moved } = await shifts(page);
        expect(sum, moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      }
      await page.close();
    });
  }
});

/**
 * The shipped presets: every layer in tokens/systems/ but the default system (named like the namespace) and the root
 * (the one layer without `extends`), as src/systems.test.ts discovers them.
 */
const repo = path.join(here, '../../..');
const namespace: string = JSON.parse(fs.readFileSync(path.join(repo, 'tanrei.config.json'), 'utf8')).namespace;
const PRESETS = fs
  .readdirSync(path.join(repo, 'tokens/systems'))
  .filter((file) => file.endsWith('.system.json'))
  .map((file) => ({ id: file.replace('.system.json', ''), layer: JSON.parse(fs.readFileSync(path.join(repo, 'tokens/systems', file), 'utf8')) }))
  .filter(({ id, layer }) => id !== namespace && layer.extends)
  .map(({ id }) => id)
  .sort();

test.describe('the cloak holds a slider as thick as it will be drawn, in every system and at every size', () => {
  // SLD-7: a horizontal slider is as thick as the larger of comp.slider.container.size and its size's
  // comp.slider.handle.height. In the m3 presets the handle (44, 44 and 52 at small, medium and large) is taller than
  // the container (32), so a cloak that held the container alone held the slider 12 to 20 lower than it is drawn, and
  // the page below it moved down when it was defined. Held here: a slider of each size, a slider field of each size
  // (with its label row, without it, and with an always-shown value indicator's room, FLD-34), and a Field around a
  // slider of each size, under the default system and each preset.
  const SIZES = ['small', 'medium', 'large'];
  const SUBJECTS: { tag: string; fixtures: Fixture[] }[] = [
    { tag: 'tanrei-slider', fixtures: SIZES.map((size) => ({ id: size, props: { size, value: 40, label: 'Volume' } })) },
    {
      tag: 'tanrei-slider-field',
      fixtures: SIZES.flatMap((size) => [
        { id: size, props: { size, label: 'Volume', value: 40 } },
        { id: `${size}-label-hidden`, props: { size, label: 'Volume', labelHidden: true, value: 40 } },
        { id: `${size}-value-indicator`, props: { size, label: 'Volume', value: 40, valueIndicator: 'always' } },
      ]),
    },
    { tag: 'tanrei-field', fixtures: SIZES.map((size) => ({ id: `slider-${size}`, props: { label: 'Volume', valueText: '40' }, items: [{ kind: 'slider', props: { size, value: 40 } }] })) },
  ];
  test('the presets are discovered from tokens/systems/', () => {
    expect(PRESETS.length).toBeGreaterThan(0);
  });
  for (const system of [undefined, ...PRESETS]) {
    for (const { tag, fixtures } of SUBJECTS) {
      test(`${system ?? 'the default system'}, ${tag.replace(/^tanrei-/, '')}: with the cloak and no script, each fixture is as high as once it is defined, and so is its stage`, async ({ page: first, browserName }) => {
        const { page, before, after } = await mountedLate(first, tag, browserName, { ...(system ? { system } : {}), fixtures });
        expect(before.filter((stage) => !stage.held).map((stage) => stage.id)).toEqual([]);
        const wrong = before.flatMap((stage, i) => {
          const drawn = after[i]!;
          if (Math.abs(stage.height - drawn.height) <= 0.5 && Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
          return [`${stage.id}: held ${stage.height}px in a stage of ${stage.stage}px, drawn ${drawn.height}px in ${drawn.stage}px`];
        });
        expect(wrong).toEqual([]);
        if (browserName === 'chromium') {
          const { sum, moved } = await shifts(page);
          expect(sum, moved).toBeLessThanOrEqual(SHIFT_BUDGET);
        }
        await page.close();
      });
    }
  }
});

/**
 * The fixtures whose width the cloak holds narrower than they are drawn, by spec, with why: what makes the difference
 * is something CSS cannot see. Each is still held at its height, and no wider than it is drawn.
 */
const NARROWER: Record<string, Grows> = {
  button: {
    grows: (props, fixture) => !!props.label && !!fixture.slots?.icon && !!fixture.content,
    why: 'a Button named by `label` that has a glyph is held as the icon-only one: CSS cannot see that words are written beside the glyph too',
  },
};

test.describe('the cloak holds the width of an element as it is drawn, in every system', () => {
  // TAG-1: a tag is its label between its paddings, with its glyph or its dot; CHK-15, RAD-17, SWT-15: a selection
  // control is its control, the label's gap and the label it draws. The words are attributes, which the cloak writes in
  // their text style: held at the width the element is drawn at, a row of them wraps where it will once they are
  // defined (a docs page's row of tags, 88 px high before, was 128 px drawn when they were held at no width).
  // BTN-11, BTN-12: a Button is the label written between its tags, in its text style, between its paddings, with its
  // glyph's box, or the width an icon-only one names; CPY-7, CPY-19: a Copy Button is the Button it is drawn by; MAB-11,
  // MAB-13: a Main Action Button is its label, its glyph and its paddings, or a square while collapsed. Held at the
  // width of the words written in them, a docs page's rows of buttons wrapped where they were not drawn wrapping.
  // CHP-16, CHP-17: a chip is its label between its paddings, with its glyph, its check or its avatar, and its remove
  // glyph or its new-context mark; TGR-1, TGR-2: a tag group lays them out in lines that wrap. Held at no width, the
  // chips of a docs page's row (100 px high before, 152 px drawn) wrapped only once they were defined.
  for (const tag of ['tanrei-tag', 'tanrei-chip', 'tanrei-tag-group', 'tanrei-checkbox', 'tanrei-radio-button', 'tanrei-switch', 'tanrei-button', 'tanrei-copy-button', 'tanrei-main-action-button', 'tanrei-button-with-menu', 'tanrei-button-group', 'tanrei-segmented-button', 'tanrei-fab-menu']) {
    // A component that lives in a layer (the FAB Menu, in m3-like) is drawn in the systems that ship it: its tokens are
    // in their stylesheets. The default system's fixtures are drawn under the layer that ships it (test/harness.ts).
    const tokens = `--tanrei-comp-${tag.replace(/^tanrei-/, '')}-`;
    const ships = (system: string) => dist(`systems/${system}.css`).includes(tokens) || dist('tokens.css').includes(tokens);
    for (const system of [undefined, ...PRESETS.filter(ships)]) {
      test(`${system ?? 'the default system'}, ${tag.replace(/^tanrei-/, '')}: with the cloak and no script, each fixture is as wide and as high as once it is defined`, async ({ page: first, browserName }) => {
        const { spec, page, before, after } = await mountedLate(first, tag, browserName, system ? { system } : {});
        const fixtures = new Map(spec.fixtures.map((fixture) => [fixture.id, fixture]));
        const reason = NARROWER[tag.replace(/^tanrei-/, '')];
        const wrong = before.flatMap((stage, i) => {
          const drawn = after[i]!;
          const fixture = fixtures.get(stage.id)!;
          const narrower = !!reason?.grows((fixture.props ?? {}) as Record<string, unknown>, fixture);
          const width = narrower ? stage.width <= drawn.width + 0.5 : Math.abs(stage.width - drawn.width) <= 0.5;
          if (width && Math.abs(stage.height - drawn.height) <= 0.5 && Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
          return [`${stage.id}: held ${stage.width}×${stage.height}px in a stage of ${stage.stage}px, drawn ${drawn.width}×${drawn.height}px in ${drawn.stage}px${narrower ? ` (held narrower: ${reason!.why})` : ''}`];
        });
        expect(wrong).toEqual([]);
        await page.close();
      });
    }
  }
});

test.describe('an element with a stylesheet of its own for the time before it is defined holds its box, in every system', () => {
  // CLO-1, CLO-7, CLO-9, CLO-10: a callout is its paddings, its glyph's and its close button's room, its title — the
  // slot's or the `headline` attribute's — the body, and the row of its actions (callout.css); EMP-1 to EMP-6: an empty
  // state is its paddings, its glyph's box, its title, its description and the row of its actions (empty-state.css).
  // Neither held its `headline` or its actions before: a docs page's figure of three callouts was 322 px high before
  // and 404 px drawn. Each fixture is written as a server sends it, with the cloak (which holds the Buttons among its
  // actions) and the element's own stylesheet.
  for (const tag of ['tanrei-callout', 'tanrei-empty-state']) {
    const name = tag.replace(/^tanrei-/, '');
    for (const system of [undefined, ...PRESETS]) {
      test(`${system ?? 'the default system'}, ${name}: with the cloak, ${name}.css and no script, each fixture is as wide and as high as once it is defined, and so is its stage`, async ({ page: first, browserName }) => {
        const { page, before, after } = await mountedLate(first, tag, browserName, { ...(system ? { system } : {}), sheets: [`${name}.css`] });
        const wrong = before.flatMap((stage, i) => {
          const drawn = after[i]!;
          if (Math.abs(stage.width - drawn.width) <= 0.5 && Math.abs(stage.height - drawn.height) <= 0.5 && Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
          return [`${stage.id}: held ${stage.width}×${stage.height}px in a stage of ${stage.stage}px, drawn ${drawn.width}×${drawn.height}px in ${drawn.stage}px`];
        });
        expect(wrong).toEqual([]);
        await page.close();
      });
    }
  }
});

/**
 * Runs in the page before its scripts: `customElements.define` holds back the elements named in `held` — as if their
 * modules had not arrived — until `window.__tanreiRelease()` defines them.
 */
function holdBack(held: string[]) {
  const registry = window.customElements;
  const define = registry.define.bind(registry);
  const waiting: Parameters<CustomElementRegistry['define']>[] = [];
  registry.define = (...args: Parameters<CustomElementRegistry['define']>) => {
    if (held.includes(args[0])) waiting.push(args);
    else define(...args);
  };
  (window as unknown as { __tanreiRelease: () => void }).__tanreiRelease = () => {
    registry.define = define;
    for (const args of waiting.splice(0)) define(...args);
  };
}

/**
 * Runs in the page: each fixture's container (by the spec's tag) — its box, and whether a rule holds its height, as
 * `stages()` reads them — its stage's height, and the height of each Button in it (0 where it is not drawn).
 */
function buttonsIn({ tag }: { tag: string }) {
  return [...document.querySelectorAll('[data-fixture]')].map((stage) => {
    const element = stage.querySelector(tag)!;
    const style = getComputedStyle(element);
    return {
      id: stage.getAttribute('data-fixture')!,
      stage: stage.getBoundingClientRect().height,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      held: !['0px', 'auto'].includes(style.minBlockSize) || style.paddingBlockStart !== '0px' || style.paddingBlockEnd !== '0px',
      buttons: [...element.querySelectorAll('tanrei-button')].map((button) => button.getBoundingClientRect().height),
    };
  });
}

test.describe('a Button Group and a Toolbar are drawn as they will be whichever of their modules arrives first, in every system', () => {
  // Each element's module may arrive on its own. BGR-26, TBR-31, BTN-48: a Button that sets no size draws the size its
  // nearest Button Group or Toolbar sets — also while that container is not defined yet: a Button defined before its
  // group drew itself medium, then shrank when the group was defined (a small group of the default system, 36 px high
  // and then 28) — and the cloak holds a Button not defined yet at the size of a container that is. BGR-3, BGR-23: a
  // Button not defined yet in a connected row of a group that is takes the target and the outer padding the group
  // gives it. Every fixture of each spec, with one of the two held back, read once the other is defined and again once
  // both are: each Button is as high meanwhile (it draws its size), and so is the container where the cloak holds its
  // height, and its stage; a Button Group, whose layout the cloak holds, is as wide too (a Toolbar's width is not held:
  // src/styles/cloak.css). Under a fine pointer in every engine, and in Chromium under a coarse one too (the touch
  // target, emulated).
  const ORDERS = [
    { first: 'the Buttons', held: (tag: string) => [tag] },
    { first: 'the container', held: () => ['tanrei-button'] },
  ];
  // BTN-48: the precedence holds while the group is not defined: a Button's own size wins over the group's, a medium
  // one included, and one that sets none takes the group's — as the heights of their sizes, before and after.
  test('button-group: the Buttons defined first, a Button’s own size wins over the size of its group, and one that sets none takes it', async ({ page: opener }) => {
    const spec = loadSpec('button-group');
    const item = (content: string, size?: string): FixtureItem => ({ kind: 'button', props: { variant: 'outlined', ...(size ? { size } : {}) }, content });
    const fixtures: Fixture[] = [{ id: 'own', props: { variant: 'standard', size: 'small' }, items: [item('Taken'), item('Large', 'large'), item('Medium', 'medium')] }];
    const page = await opener.context().newPage();
    const { page: markup, scripts } = withoutScripts(await fixturesDocument(spec, { icons: true, fixtures }), true);
    await page.setContent(markup);
    await page.evaluate(holdBack, ['tanrei-button-group']);
    for (const content of scripts) await page.addScriptTag({ type: 'module', content });
    await page.evaluate(() => customElements.whenDefined('tanrei-button'));
    const read = () =>
      page.evaluate(() => {
        const height = (size: string) => {
          const probe = document.body.appendChild(document.createElement('div'));
          probe.style.blockSize = `var(--tanrei-comp-button-container-height-${size})`;
          const value = probe.getBoundingClientRect().height;
          probe.remove();
          return value;
        };
        const drawn = [...document.querySelectorAll('[data-fixture="own"] tanrei-button')].map((button) => button.getBoundingClientRect().height);
        return { drawn, sizes: ['small', 'large', 'medium'].map(height) };
      });
    const before = await settled(page, read);
    expect(await page.evaluate(() => !!customElements.get('tanrei-button-group'))).toBe(false);
    expect(new Set(before.sizes).size).toBe(3);
    expect(before.drawn).toEqual(before.sizes);
    await page.evaluate(() => (window as unknown as { __tanreiRelease: () => void }).__tanreiRelease());
    expect((await define(page, [], read)).drawn).toEqual(before.sizes);
    await page.close();
  });
  for (const tag of ['tanrei-button-group', 'tanrei-toolbar']) {
    const wide = tag === 'tanrei-button-group';
    for (const system of [undefined, ...PRESETS]) {
      for (const { first, held } of ORDERS) {
        for (const pointer of ['fine', 'coarse'] as const) {
          test(`${system ?? 'the default system'}, ${tag.replace(/^tanrei-/, '')}: ${first} defined first, under a ${pointer} pointer, each fixture is drawn as once both are defined`, async ({ page: opener, browserName }) => {
            test.skip(pointer === 'coarse' && browserName !== 'chromium', 'touch emulation through CDP');
            const spec = loadSpec(tag.replace(/^tanrei-/, ''));
            const page = await opener.context().newPage();
            if (pointer === 'coarse') {
              const cdp = await page.context().newCDPSession(page);
              await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
              await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
            }
            const { page: markup, scripts } = withoutScripts(await fixturesDocument(spec, { icons: true, ...(system ? { system } : {}) }), true);
            await page.setContent(markup);
            if (pointer === 'coarse') expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
            const holding = held(tag);
            await page.evaluate(holdBack, holding);
            const read = () => page.evaluate(buttonsIn, { tag });
            for (const content of scripts) await page.addScriptTag({ type: 'module', content });
            const others = await page.evaluate((names) => [...new Set([...document.querySelectorAll('*')].map((el) => el.localName))].filter((name) => name.startsWith('tanrei-') && !names.includes(name)), holding);
            await page.evaluate((names) => Promise.all(names.map((name) => customElements.whenDefined(name))), others);
            const before = await settled(page, read);
            expect(await page.evaluate((names) => names.filter((name) => !!customElements.get(name)), holding)).toEqual([]);
            await page.evaluate(() => (window as unknown as { __tanreiRelease: () => void }).__tanreiRelease());
            const after = await define(page, [], read);
            expect(before.length).toBe(spec.fixtures.length);
            expect(before.filter((stage) => stage.buttons.length).length, 'the fixtures hold Buttons').toBeGreaterThan(0);
            const near = (a: number, b: number) => Math.abs(a - b) <= 0.5;
            const wrong = before.flatMap((stage, i) => {
              const drawn = after[i]!;
              const box = (!wide || near(stage.width, drawn.width)) && (!(wide || stage.held) || (near(stage.height, drawn.height) && near(stage.stage, drawn.stage)));
              // A Button a Toolbar keeps in its overflow menu is not drawn (0 px high) in one of the two reads: a Toolbar
              // that is not defined lays every item out, and one that is measures what it holds (a width).
              const buttons = stage.buttons.every((height, n) => !height || !drawn.buttons[n] || near(height, drawn.buttons[n]!));
              if (box && buttons) return [];
              return [`${stage.id}: ${stage.width}×${stage.height}px in a stage of ${stage.stage}px, Buttons ${stage.buttons.join(', ')}px high; then ${drawn.width}×${drawn.height}px in ${drawn.stage}px, Buttons ${drawn.buttons.join(', ')}px high`];
            });
            expect(wrong).toEqual([]);
            await page.close();
          });
        }
      }
    }
  }
});

test.describe('the cloak holds an open date and time picker drawn in place as its surface, in every system', () => {
  // DTM's surface drawn where it stands (`inline`, as the docs draw it): the header, the calendar and the time section,
  // and the actions, from its tokens. Each fixture of the spec, drawn in place in the layout it draws there (the
  // vertical one; the horizontal one the product chooses is not held), under the default system and each preset, whose
  // entry modes and actions' size differ.
  const spec = loadSpec('date-time-picker');
  const fixtures: Fixture[] = spec.fixtures
    .filter((fixture) => fixture.props?.layout !== 'horizontal')
    .map((fixture) => ({ ...fixture, props: { ...fixture.props, inline: true } }));
  test('the spec has fixtures to draw in place', () => {
    expect(HELD_IN_PLACE).toEqual(['tanrei-date-time-picker']);
    expect(fixtures.length).toBeGreaterThan(20);
  });
  for (const system of [undefined, ...PRESETS]) {
    test(`${system ?? 'the default system'}, date-time-picker: with the cloak and no script, each fixture drawn in place is as high as once it is defined, and so is its stage`, async ({ page: first, browserName }) => {
      const { page, before, after } = await mountedLate(first, 'tanrei-date-time-picker', browserName, { ...(system ? { system } : {}), fixtures });
      expect(before.filter((stage) => !stage.held).map((stage) => stage.id)).toEqual([]);
      expect(before.filter((stage) => stage.visibility !== 'hidden').map((stage) => stage.id)).toEqual([]);
      // Defined, the element is no box of its own (`display: contents`): its surface is, and the stage is as high as it.
      const wrong = before.flatMap((stage, i) => {
        const drawn = after[i]!;
        if (Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
        return [`${stage.id}: held ${stage.height}px in a stage of ${stage.stage}px, drawn in ${drawn.stage}px`];
      });
      expect(wrong).toEqual([]);
      if (browserName === 'chromium') {
        const { sum, moved } = await shifts(page);
        expect(sum, moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      }
      await page.close();
    });
  }
});

test.describe('the cloak holds a calendar as the box it draws, in every system', () => {
  // CAL-1: a calendar is its navigation row, its weekday row and six rows of days, each a cell (cell.size, never less
  // than the target), seven cells wide, with no surface or padding of its own; CAL-7: the year view takes the room of
  // the weekday row and the days. Held at no box, a docs page's figure of a calendar was 64 px high before it was
  // defined and 448 px drawn. Each fixture of the spec — one month, a range, a week from Monday, Japanese, unavailable
  // days, the neighbouring months' days, the year view — under the default system and each preset.
  for (const system of [undefined, ...PRESETS]) {
    test(`${system ?? 'the default system'}, calendar: with the cloak and no script, each fixture is as wide and as high as once it is defined, and so is its stage`, async ({ page: first, browserName }) => {
      const { page, before, after } = await mountedLate(first, 'tanrei-calendar', browserName, system ? { system } : {});
      expect(before.filter((stage) => !stage.held).map((stage) => stage.id)).toEqual([]);
      expect(before.filter((stage) => stage.visibility !== 'hidden').map((stage) => stage.id)).toEqual([]);
      const wrong = before.flatMap((stage, i) => {
        const drawn = after[i]!;
        if (Math.abs(stage.width - drawn.width) <= 0.5 && Math.abs(stage.height - drawn.height) <= 0.5 && Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
        return [`${stage.id}: held ${stage.width}×${stage.height}px in a stage of ${stage.stage}px, drawn ${drawn.width}×${drawn.height}px in ${drawn.stage}px`];
      });
      expect(wrong).toEqual([]);
      if (browserName === 'chromium') {
        const { sum, moved } = await shifts(page);
        expect(sum, moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      }
      await page.close();
    });
  }
});

test.describe('the cloak holds a multi-line input at its fewest rows, at every size and in every variant', () => {
  // TXI-17, TXI-51: a multi-line box is its first line's offset, min-rows lines of its input text and its block padding;
  // ETI-7: an embedded input is min-rows lines. Held from the tokens and the attribute, an empty field is as high
  // before it is defined as after, whatever min-rows says — a docs page's fields of three rows grew from one when the
  // cloak held a line.
  const SIZES = ['small', 'medium', 'large'];
  const ROW_COUNTS = [undefined, 1, 3, 5];
  const LOOKS: Record<string, string | boolean>[] = [
    { variant: 'stacked', label: 'Message' },
    { variant: 'outlined', label: 'Message' },
    { variant: 'filled', label: 'Message' },
    { variant: 'filled', label: 'Message', labelHidden: true },
  ];
  const boxes = (multiline: boolean): Fixture[] =>
    SIZES.flatMap((size) =>
      ROW_COUNTS.flatMap((minRows) =>
        LOOKS.map((look) => ({
          id: `${size}-${look.variant}${look.labelHidden ? '-label-hidden' : ''}-${minRows ?? 'default'}`,
          props: { size, multiline, ...look, ...(minRows === undefined ? {} : { minRows }) },
        })),
      ),
    );
  const SUBJECTS: { tag: string; fixtures: Fixture[] }[] = [
    { tag: 'tanrei-text-input', fixtures: boxes(true) },
    { tag: 'tanrei-text-field', fixtures: [...boxes(true), ...SIZES.map((size) => ({ id: `${size}-help-manual`, props: { size, multiline: true, minRows: 3, label: 'Notes', supportingText: 'A few lines', resize: 'manual', resizeLabel: 'Resize notes' } }))] },
    { tag: 'tanrei-embedded-text-input', fixtures: ROW_COUNTS.map((minRows) => ({ id: `rows-${minRows ?? 'default'}`, props: { multiline: true, label: 'Message', ...(minRows === undefined ? {} : { minRows }) } })) },
  ];
  for (const { tag, fixtures } of SUBJECTS) {
    test(`${tag.replace(/^tanrei-/, '')}: with the cloak and no script, each multi-line fixture is as high as once it is defined, and so is its stage`, async ({ page: first, browserName }) => {
      const { page, before, after } = await mountedLate(first, tag, browserName, { fixtures });
      expect(before.filter((stage) => !stage.held).map((stage) => stage.id)).toEqual([]);
      const wrong = before.flatMap((stage, i) => {
        const drawn = after[i]!;
        if (Math.abs(stage.height - drawn.height) <= 0.5 && Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
        return [`${stage.id}: held ${stage.height}px in a stage of ${stage.stage}px, drawn ${drawn.height}px in ${drawn.stage}px`];
      });
      expect(wrong).toEqual([]);
      if (browserName === 'chromium') {
        const { sum, moved } = await shifts(page);
        expect(sum, moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      }
      await page.close();
    });
  }
});

test.describe('the cloak holds a rating and a swatch at the width they are drawn', () => {
  // RAT-1, RAT-14: a rating is its marks' containers in a row, `max` of them; SWC-1, SWC-7: a swatch is its sample,
  // the gap and its column of text. The cloak held their height and no width, so a row of them wrapped only once they
  // were drawn: on the docs' Rating page, a figure of four ratings was 96 px high before and 240 px drawn at a phone's
  // width, and the Swatch page's first figure 106 px before and 164 px drawn. Each fixture is as wide as it is drawn.
  for (const tag of ['tanrei-rating', 'tanrei-swatch']) {
    test(`${tag.replace(/^tanrei-/, '')}: with the cloak and no script, every fixture is as wide as once it is defined`, async ({ page: first, browserName }) => {
      const { page, before, after } = await mountedLate(first, tag, browserName);
      const wrong = before.flatMap((stage, i) => (Math.abs(stage.width - after[i]!.width) <= 0.5 ? [] : [`${stage.id}: held ${stage.width}px wide, drawn ${after[i]!.width}px`]));
      expect(wrong).toEqual([]);
      await page.close();
    });
  }
});

test.describe('the cloak holds a field’s help and its error text at the lines they wrap onto', () => {
  // FLD-7, FLD-26, FLD-31: a help or an error text longer than its line wraps where the field draws it, from the start
  // of the control's content. The cloak held one line of it, so a narrow field grew when it was defined: on the docs'
  // Color field page, two fields 17.5rem wide were 248 px high before and 280 px drawn. Held here in fields narrow
  // enough that their texts take two lines or more, at each size, with a leading glyph, and in a Field around a box.
  const HELP = 'Six hexadecimal digits, like #0f766e, or a name the browser knows.';
  const ERROR = 'We cannot ship there yet. Choose another country, or ask when we will.';
  const style = 'inline-size: 13rem';
  const texts = (base: Record<string, unknown>): Fixture[] => [
    ...['small', 'medium', 'large'].map((size) => ({ id: `help-${size}`, props: { ...base, size, label: 'Color', supportingText: HELP, style } })),
    { id: 'error', props: { ...base, label: 'Color', error: true, errorText: ERROR, style } },
    { id: 'help-and-error', props: { ...base, label: 'Color', supportingText: HELP, error: true, errorText: ERROR, style } },
    { id: 'outlined', props: { ...base, variant: 'outlined', label: 'Color', supportingText: HELP, style } },
  ];
  const SUBJECTS: { tag: string; fixtures: Fixture[] }[] = [
    { tag: 'tanrei-text-field', fixtures: [...texts({}), { id: 'leading-icon', props: { label: 'Search', leadingIcon: 'search', supportingText: HELP, style } }] },
    { tag: 'tanrei-select-field', fixtures: texts({}) },
    { tag: 'tanrei-combobox-field', fixtures: texts({}) },
    { tag: 'tanrei-color-field', fixtures: [...texts({ value: '#0f766e' }), { id: 'picker', props: { value: '#0f766e', picker: true, pickerLabel: 'Choose color', label: 'Brand color', supportingText: 'Six hexadecimal digits, like #0f766e.', style: 'inline-size: 17.5rem' } }] },
    { tag: 'tanrei-number-field', fixtures: texts({}) },
    { tag: 'tanrei-field', fixtures: [{ id: 'help', props: { label: 'Color', supportingText: HELP, style }, items: [{ kind: 'text-input', props: {} }] }, { id: 'error', props: { label: 'Color', error: true, errorText: ERROR, style }, items: [{ kind: 'text-input', props: {} }] }, { id: 'color-input', props: { label: 'Color', supportingText: HELP, style }, items: [{ kind: 'color-input', props: { value: '#0f766e' } }] }, { id: 'number-input', props: { label: 'Count', supportingText: HELP, style }, items: [{ kind: 'number-input', props: {} }] }] },
  ];
  for (const { tag, fixtures } of SUBJECTS) {
    test(`${tag.replace(/^tanrei-/, '')}: with the cloak and no script, each field whose help or error text wraps is as high as once it is defined, and so is its stage`, async ({ page: first, browserName }) => {
      const { page, before, after } = await mountedLate(first, tag, browserName, { fixtures });
      // The texts are drawn on more lines than one: what this holds.
      expect(after.filter((stage) => !stage.wraps).map((stage) => stage.id)).toEqual([]);
      const wrong = before.flatMap((stage, i) => {
        const drawn = after[i]!;
        if (Math.abs(stage.height - drawn.height) <= 0.5 && Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
        return [`${stage.id}: held ${stage.height}px in a stage of ${stage.stage}px, drawn ${drawn.height}px in ${drawn.stage}px`];
      });
      expect(wrong).toEqual([]);
      if (browserName === 'chromium') {
        const { sum, moved } = await shifts(page);
        expect(sum, moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      }
      await page.close();
    });
  }
});

test.describe('the cloak holds a row of tabs at the height its content gives it, in every system', () => {
  // TAB-16, TAB-18: a row is the container height of its size, or taller where its labels need more: the label's line
  // inside the indicator's paddings, with the track's padding or the variant's underline above and below. In
  // cupertino a small row is 33.98 px drawn and its container height 32: held at the token, a docs figure of tonal
  // tabs grew by 1.98 px when it was defined. Each fixture of the Tabs and the Tab view, under each preset, is held as
  // the default system's test holds it (above).
  for (const tag of ['tanrei-tabs', 'tanrei-tab-view']) {
    const name = tag.replace(/^tanrei-/, '');
    for (const system of PRESETS) {
      test(`${system}, ${name}: with the cloak and no script, each fixture is as high as once it is defined, and so is its stage`, async ({ page: first, browserName }) => {
        const { spec, page, before, after } = await mountedLate(first, tag, browserName, { system });
        const fixtures = new Map(spec.fixtures.map((fixture) => [fixture.id, fixture]));
        const wrong = before.flatMap((stage, i) => {
          const drawn = after[i]!;
          if (!stage.held) return [];
          const fixture = fixtures.get(stage.id)!;
          const why = GROWS[name]?.find((reason) => reason.grows((fixture.props ?? {}) as Record<string, unknown>, fixture))?.why ?? (drawn.wraps ? WRAPS : undefined);
          if (why ? stage.height <= drawn.height + 0.5 : Math.abs(stage.height - drawn.height) <= 0.5 && Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
          return [`${stage.id}: held ${stage.height}px in a stage of ${stage.stage}px, drawn ${drawn.height}px in ${drawn.stage}px${why ? ` (it grows: ${why})` : ''}`];
        });
        expect(wrong).toEqual([]);
        expect(before.filter((stage) => stage.held).length, 'the cloak holds some of the fixtures').toBeGreaterThan(0);
        await page.close();
      });
    }
  }
});

test.describe('the cloak holds a file item’s second line at the lines it wraps onto, in every system', () => {
  // FIT-4: the second line joins the format, the size and the status in words (the error in its place while it
  // failed), a dot between each two, the status's mark before the status; it wraps and is never cut. The cloak held it
  // at one line where a format or a size stood before the status, so a row whose line wrapped grew when it was defined:
  // on the docs' File item page, a column of six rows 22.5rem wide was 412 px high before and 432 px drawn at a phone's
  // width, and in cupertino, whose face is wider where the system has no San Francisco, 388 px and 406 px at a
  // desktop's. Held here in rows and tiles narrow enough that the line wraps, its actions still beside the texts
  // (FIT-24), in each status, with and without a format and a size, under the default system and each preset.
  const style = 'inline-size: 16rem';
  const labels = { removeLabel: 'Remove {name}', retryLabel: 'Retry {name}' };
  const FIXTURES: Fixture[] = [
    { id: 'format-size-status', props: { ...labels, style, name: 'brief.pdf', formatText: 'PDF', sizeText: '820 KB', statusText: 'Waiting for the files before it to be sent' } },
    { id: 'size-uploading', props: { ...labels, style, name: 'floor-plan.png', sizeText: '3.4 MB', status: 'uploading', statusText: 'Uploading, about a minute left', progress: 0.4 } },
    { id: 'format-done', props: { ...labels, style, name: 'contract.pdf', formatText: 'PDF', status: 'done', statusText: 'Uploaded on 4 December by the review team' } },
    { id: 'size-error-retryable', props: { ...labels, style: 'inline-size: 20rem', name: 'site-photo.png', sizeText: '6.8 MB', status: 'error', errorText: 'The connection was lost. Try again once you are online.', retryable: true } },
    { id: 'error', props: { ...labels, style, name: 'scan-archive.zip', status: 'error', errorText: 'Larger than 10 MB. Choose a smaller file, or split it in two.' } },
    { id: 'format-size-done-readonly', props: { style: 'inline-size: 12rem', name: 'invoice-0412.pdf', formatText: 'PDF', sizeText: '96 KB', status: 'done', statusText: 'Sent on 4 December', readonly: true } },
    { id: 'tile-format-size-error', props: { ...labels, name: 'floor-plan.png', form: 'tile', formatText: 'PNG', sizeText: '3.4 MB', status: 'error', errorText: 'Larger than 10 MB.' } },
    { id: 'tile-size-done', props: { ...labels, name: 'survey.pdf', form: 'tile', sizeText: '1.1 MB', status: 'done', statusText: 'Uploaded just now' } },
  ];
  for (const system of [undefined, ...PRESETS]) {
    test(`${system ?? 'the default system'}, file-item: with the cloak and no script, each file item whose second line wraps is as high as once it is defined, and so is its stage`, async ({ page: first, browserName }) => {
      const { page, before, after } = await mountedLate(first, 'tanrei-file-item', browserName, { ...(system ? { system } : {}), fixtures: FIXTURES });
      // The second lines are drawn on more lines than one, and the rows' actions beside their texts: what this holds.
      expect(after.filter((stage) => !stage.wraps).map((stage) => stage.id)).toEqual([]);
      expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-file-item')].filter((item) => item.shadowRoot?.querySelector('[data-stacked]')).map((item) => item.closest('[data-fixture]')!.getAttribute('data-fixture')))).toEqual([]);
      const wrong = before.flatMap((stage, i) => {
        const drawn = after[i]!;
        if (Math.abs(stage.height - drawn.height) <= 0.5 && Math.abs(stage.stage - drawn.stage) <= 0.5) return [];
        return [`${stage.id}: held ${stage.height}px in a stage of ${stage.stage}px, drawn ${drawn.height}px in ${drawn.stage}px`];
      });
      expect(wrong).toEqual([]);
      if (browserName === 'chromium') {
        const { sum, moved } = await shifts(page);
        expect(sum, moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      }
      await page.close();
    });
  }
});

/**
 * A page of a product's: a heading and a paragraph, then a form and a toolbar of the controls a page is most often
 * made of, then text below them. The controls that stand side by side are in rows of their own, as a product lays out
 * a toolbar or a set of choices (a flex row with a gap): the cloak holds a control's height and not its width, so in
 * a line of running text, the words after a control would move sideways when it is defined.
 */
const ROW = 'display: flex; flex-wrap: wrap; align-items: center; gap: var(--tanrei-sys-space-space100); margin-block: var(--tanrei-sys-space-space200)';
const PRODUCT_PAGE = `
  <h1>Settings</h1>
  <p>Choose how the project is built and who is told when it is.</p>
  <tanrei-tabs value="general" label="Sections">
    <tanrei-tab value="general" label="General"></tanrei-tab>
    <tanrei-tab value="members" label="Members"></tanrei-tab>
    <tanrei-tab value="billing" label="Billing"></tanrei-tab>
  </tanrei-tabs>
  <tanrei-text-input label="Project name" value="Tanrei"></tanrei-text-input>
  <tanrei-text-field label="Notification email" supporting-text="Build results are sent to this address." value="team@example.com"></tanrei-text-field>
  <tanrei-select label="Region" value="eu">
    <tanrei-option value="eu" label="Europe"></tanrei-option>
    <tanrei-option value="us" label="United States"></tanrei-option>
  </tanrei-select>
  <div style="${ROW}">
    <tanrei-checkbox label="Build on every push" selected></tanrei-checkbox>
    <tanrei-switch label="Notify the team"></tanrei-switch>
  </div>
  <div style="${ROW}">
    <tanrei-chip label="Linux"></tanrei-chip>
    <tanrei-chip label="macOS"></tanrei-chip>
    <tanrei-tag label="Beta"></tanrei-tag>
  </div>
  <div style="${ROW}">
    <tanrei-button variant="filled">Save</tanrei-button>
    <tanrei-button variant="outlined">Cancel</tanrei-button>
    <tanrei-button-with-menu label="More"></tanrei-button-with-menu>
  </div>
  <tanrei-pagination label="Pages" page="2" count="5"></tanrei-pagination>
  <p id="below">Changes are saved for everyone in the project. A build that is running finishes with the settings it started with.</p>
`;

/** Runs in the page: every Tanrei element's box and visibility, and the paragraph below them. */
function productPage() {
  return {
    elements: [...document.querySelectorAll('#product *')]
      .filter((el) => el.localName.startsWith('tanrei-') && el.localName !== 'tanrei-tab' && el.localName !== 'tanrei-option')
      .map((el) => ({ tag: el.localName, height: el.getBoundingClientRect().height, visibility: getComputedStyle(el).visibility })),
    below: document.getElementById('below')!.getBoundingClientRect().top,
  };
}

test.describe('a page whose elements are defined late', () => {
  for (const cloak of [true, false]) {
    test(`${cloak ? 'with' : 'without'} the cloak: ${cloak ? 'nothing unstyled is painted, and the text below the controls stays where it is' : 'the elements are shown as the browser draws unknown elements, as before the cloak — it is opted into, never loaded for a page'}`, async ({ page: first, browserName }) => {
      const page = await first.context().newPage();
      await page.setViewportSize({ width: 800, height: 900 });
      // The page before the fixtures' document's (empty) stages: that document's tokens and faces, and no fixture.
      const markup = await fixturesDocument(loadSpec('button'), { fixtures: [], icons: true, lead: `<div id="product">${PRODUCT_PAGE}</div>` });
      const { page: html, scripts } = withoutScripts(markup, cloak);
      await page.setContent(html.replace('<body>', '<body style="font: var(--tanrei-sys-typescale-body-font-weight) var(--tanrei-sys-typescale-body-font-size)/var(--tanrei-sys-typescale-body-line-height) var(--tanrei-sys-typescale-body-font-family); margin: 16px">'));
      await page.evaluate(() => document.fonts.ready);
      await frames(page, 2);
      const before = await page.evaluate(productPage);
      expect(before.elements.length).toBe(13);
      if (browserName === 'chromium') await observeShifts(page);
      const after = await define(page, scripts, () => page.evaluate(productPage));
      const shift = browserName === 'chromium' ? await shifts(page) : undefined;
      if (shift) test.info().annotations.push({ type: 'layout shift', description: shift.sum.toFixed(4) });
      if (cloak) {
        expect(before.elements.filter((element) => element.visibility !== 'hidden').map((element) => element.tag)).toEqual([]);
        expect(after.elements.filter((element) => element.visibility !== 'visible').map((element) => element.tag)).toEqual([]);
        // Every control on it is held at the height it will be drawn, so the text below it stays where it is.
        const heights = (elements: typeof before.elements) => elements.map((element) => `${element.tag} ${Math.round(element.height)}px`);
        expect(heights(before.elements)).toEqual(heights(after.elements));
        expect(Math.round(after.below)).toBe(Math.round(before.below));
        if (shift) expect(shift.sum, shift.moved).toBeLessThanOrEqual(SHIFT_BUDGET);
      } else {
        // Without it, every element is painted from the first frame, laid out as an unknown element — the page moves
        // when they are defined, which is what the cloak is for.
        expect(before.elements.filter((element) => element.visibility !== 'visible').map((element) => element.tag)).toEqual([]);
        expect(after.below).not.toBe(before.below);
        if (shift) expect(shift.sum, shift.moved).toBeGreaterThan(SHIFT_BUDGET);
      }
      await page.close();
    });
  }

  test('the cloak is in no stylesheet a page loads by default: with tanrei.css, an element that is not defined is painted', async ({ page }) => {
    await page.setContent(`<!doctype html><html><head><style>${dist('tanrei.css')}</style></head><body><tanrei-button>Save</tanrei-button><tanrei-checkbox label="Build"></tanrei-checkbox></body></html>`);
    expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-button, tanrei-checkbox')].map((el) => [getComputedStyle(el).visibility, getComputedStyle(el).display]))).toEqual([
      ['visible', 'inline'],
      ['visible', 'inline'],
    ]);
  });
});
