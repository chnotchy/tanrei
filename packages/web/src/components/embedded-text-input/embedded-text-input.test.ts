// <tanrei-embedded-text-input>, driven by specs/embedded-text-input.spec.json: every behaviour id (ETI-1…28) is cited by
// a test title, every fixture has a baseline, and every length and color is read back from the tokens — never from a
// number written here. The fixtures whose id begins `held-` are drawn inside the sample holder, which
// is where the holder's side of the contract is seen (ETI-10, ETI-11, ETI-12).
// ETI-29: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type Fixture, acmeSystemCss, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, tabTo } from '../../../test/harness.js';

const spec = loadSpec('embedded-text-input');
const fieldSpec = loadSpec('field');
type P = Page;
const TAG = 'tanrei-embedded-text-input';
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] ${TAG}`);
const native = (page: P, id: string) => host(page, id).locator('.input');
const T = (name: string) => `--tanrei-comp-embedded-text-input-${name}`;
const color = (page: P, name: string) => resolveColor(page, T(name));
const box = async (locator: Locator) => (await locator.boundingBox())!;
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const LABEL = 'Message';
/** A fixture of the test's own. */
const fx = (id: string, props: Fixture['props'] = {}, extra: Partial<Fixture> = {}): Fixture => ({ id, props: { label: LABEL, ...props }, ...extra });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { fixtures, ...options });
type El = HTMLElement & { value: string; rows: number; updateComplete: Promise<unknown>; selectionStart: number | null; selectionEnd: number | null; focusAt(x: number, y: number): void; setRangeText(text: string): void; setSelectionRange(a: number, b: number): void };
const settled = (page: P, id: string) =>
  host(page, id).evaluate(async (el) => {
    await (el as El).updateComplete;
    // What the element puts right a turn later (the end of a composition).
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (el as El).updateComplete;
  });
const set = async (page: P, id: string, props: Record<string, unknown>) => {
  await host(page, id).evaluate((el, p) => Object.assign(el, p), props);
  await settled(page, id);
};
const focus = async (page: P, id: string) => {
  await host(page, id).evaluate((el) => (el as HTMLElement).focus());
  await settled(page, id);
};
/** One line of the input's text style, in pixels, as the native element computes it. */
const line = (page: P, id: string) => native(page, id).evaluate((el) => Number.parseFloat(getComputedStyle(el).lineHeight));
const heightOf = async (page: P, id: string) => (await box(host(page, id))).height;
/** Every event the element fires from now on, as `type:value`, in order, heard on the element. */
const record = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const log: string[] = [];
    (window as unknown as { __events: string[] }).__events = log;
    for (const type of ['input', 'change', 'action', 'rowschange', 'focusin', 'focusout']) {
      el.addEventListener(type, (event) => {
        const detail = (event as CustomEvent<{ value?: string; rows?: number; scrolling?: boolean }>).detail;
        log.push(type === 'rowschange' ? `rowschange:${detail.rows}:${detail.scrolling}` : type === 'focusin' || type === 'focusout' ? type : `${type}:${(el as El).value}`);
      });
    }
  });
const events = (page: P) => page.evaluate(() => (window as unknown as { __events: string[] }).__events.splice(0));
const read = async (page: P, id: string) => {
  await settled(page, id);
  return host(page, id).evaluate((el) => {
    const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.input')!;
    return { value: (el as El).value, native: input.value, selection: [input.selectionStart, input.selectionEnd] as [number | null, number | null], focused: el.shadowRoot!.activeElement === input, rows: (el as El).rows };
  });
};
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
/** What each part computes of a box: nothing, in any state (ETI-1, ETI-11). */
const drawn = (page: P, id: string) =>
  host(page, id).evaluate((el) => {
    const parts = [el, el.shadowRoot!.querySelector('.box')!, el.shadowRoot!.querySelector('.input')!];
    return parts.map((part) => {
      const s = getComputedStyle(part);
      const widths = (side: string) => ['Top', 'Right', 'Bottom', 'Left'].map((edge) => Number.parseFloat(s.getPropertyValue(`${side}-${edge.toLowerCase()}${side === 'border' ? '-width' : ''}`)) || 0).reduce((a, b) => a + b, 0);
      return {
        background: s.backgroundColor,
        image: s.backgroundImage,
        border: widths('border'),
        padding: widths('padding'),
        outline: s.outlineStyle === 'none' ? 0 : Number.parseFloat(s.outlineWidth) || 0,
        shadow: s.boxShadow,
        radius: Number.parseFloat(s.borderTopLeftRadius) || 0,
      };
    });
  });
const NOTHING = { background: 'rgba(0, 0, 0, 0)', image: 'none', border: 0, padding: 0, outline: 0, shadow: 'none', radius: 0 };
/** The text colors the native element computes: the value, the caret, the placeholder and the selection. */
const paints = (page: P, id: string) =>
  native(page, id).evaluate((el) => {
    const s = getComputedStyle(el);
    const p = getComputedStyle(el, '::placeholder');
    const sel = getComputedStyle(el, '::selection');
    return { color: s.color, caret: s.caretColor, placeholder: p.color, selection: sel.backgroundColor, selected: sel.color, font: `${s.fontSize}/${s.lineHeight}`, weight: s.fontWeight };
  });
/** One Chromium accessibility node by role, over the DevTools protocol. */
async function textboxes(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes
    .filter((node) => !node.ignored && (node.role?.value === 'textbox' || node.role?.value === 'searchbox'))
    .map((node) => {
      const property = (name: string) => node.properties?.find((p) => p.name === name)?.value.value;
      return {
        role: node.role?.value as string,
        name: (node.name?.value ?? '') as string,
        description: (node.description?.value ?? '') as string,
        invalid: property('invalid'),
        required: property('required'),
        readonly: property('readonly'),
        disabled: property('disabled'),
        multiline: property('multiline'),
      };
    });
}
/**
 * Does `act` in the page and samples the motion of the height it starts, in one task: getAnimations() flushes the style
 * change, so the transition is read — and stepped by hand — before it can run out on a busy machine. `watch` names an
 * element whose height is sampled with the input's (a holder); `first` is the first line's distance from the top edge.
 */
const sample = (page: P, id: string, act: string, { again = '', watch = '' }: { again?: string; watch?: string } = {}) =>
  host(page, id).evaluate(
    (el, [action, next, watched]) => {
      const element = el as El;
      const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.input')!;
      const boxed = el.shadowRoot!.querySelector<HTMLElement>('.box')!;
      const holder = watched ? el.closest<HTMLElement>(watched) : null;
      const height = () => el.getBoundingClientRect().height;
      const held = () => (holder ? holder.getBoundingClientRect().height : 0);
      const first = () => input.getBoundingClientRect().y - el.getBoundingClientRect().y;
      const resizing = () => boxed.getAnimations().filter((a) => /^(block-size|height)$/.test((a as CSSTransition).transitionProperty)) as CSSTransition[];
      const told: string[] = [];
      el.addEventListener('rowschange', (event) => told.push(`${(event as CustomEvent<{ rows: number }>).detail.rows}@${Math.round(height())}`));
      const run = new Function('el', 'input', action) as (el: El, input: HTMLTextAreaElement) => void;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      const from = height();
      const heldFrom = held();
      const firstFrom = first();
      run(element, input);
      const running = resizing();
      const motion = running[0];
      if (!motion) return { from, running: 0, to: height(), told, heldFrom, heldTo: held(), scrollbar: getComputedStyle(input).overflowY };
      const timing = motion.effect!.getComputedTiming();
      for (const animation of boxed.getAnimations()) animation.pause();
      const samples: number[] = [];
      const helds: number[] = [];
      const firsts = [firstFrom];
      for (const part of [0, 0.25, 0.5, 0.75]) {
        for (const animation of boxed.getAnimations()) animation.currentTime = Number(timing.duration) * part;
        samples.push(height());
        helds.push(held());
        firsts.push(first());
      }
      const half = samples[2]!;
      let continued: number | null = null;
      let queued = 0;
      if (next) {
        // A change that arrives while one is running continues from the height then shown.
        (new Function('el', 'input', next) as typeof run)(element, input);
        queued = resizing().length;
        for (const animation of boxed.getAnimations()) {
          animation.pause();
          animation.currentTime = 0;
        }
        continued = height();
      }
      const overflow = getComputedStyle(input).overflowY;
      for (const animation of boxed.getAnimations()) animation.finish();
      firsts.push(first());
      return { from, running: running.length, duration: Math.round(Number(timing.duration)), easing: (motion.effect as KeyframeEffect).getTiming().easing, samples, helds, half, continued, queued, to: height(), told, firsts, heldFrom, heldTo: held(), scrollbar: overflow, inline: boxed.style.blockSize, moving: boxed.hasAttribute('data-resizing') };
    },
    [act, again, watch] as const,
  );
const TYPE_BREAK = `document.execCommand('insertText', false, '\\n')`;
const bundle = () => fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../dist/tanrei.bundle.js'), 'utf8');
const tokensCss = () => fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../dist/tokens.css'), 'utf8');

test.describe('behavior', () => {
  test('ETI-1: only what is typed is drawn — the value in the input text style and color, the caret and the selection in theirs — with no container, fill, edge, corner, shadow or padding on any part, at rest, focused, disabled and in error; it is as wide as its layout gives it and exactly one line tall, and fixtures single-line and error compute the same', async ({ page }) => {
    await mountFixtures(page, spec);
    const [text, caret, selection, selected] = [await color(page, 'standard-input-color'), await color(page, 'standard-caret-color'), await color(page, 'selection-color'), await color(page, 'selection-content-color')];
    const size = await resolveToken(page, T('input-typescale-font-size'));
    for (const id of ['single-line', 'error', 'multiline-grown', 'disabled', 'read-only', 'search']) {
      for (const part of await drawn(page, id)) expect(part, id).toEqual(NOTHING);
    }
    const plain = await paints(page, 'single-line');
    expect(plain.color).toBe(text);
    expect(plain.caret).toBe(caret);
    expect([plain.selection, plain.selected]).toEqual([selection, selected]);
    expect(Number.parseFloat(plain.font)).toBeCloseTo(size, 1);
    expect(await paints(page, 'error')).toEqual(plain);
    // As wide as the stage's content box, and exactly as tall as one line.
    const [outer, inner] = [await box(stage(page, 'single-line')), await box(host(page, 'single-line'))];
    near(inner.width, outer.width - 32, 'width');
    near(inner.height, await line(page, 'single-line'), 'one line');
    // Focused: still nothing.
    await focus(page, 'single-line');
    for (const part of await drawn(page, 'single-line')) expect(part, 'focused').toEqual(NOTHING);
    await focus(page, 'multiline-grown');
    for (const part of await drawn(page, 'multiline-grown')) expect(part, 'focused, multi-line').toEqual(NOTHING);
    // What the stage draws behind it shows through: the two stages are one picture, pixel for pixel.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const [a, b] = [await stage(page, 'single-line').screenshot({ animations: 'disabled' }), await stage(page, 'error').screenshot({ animations: 'disabled' })];
    expect(a.equals(b), 'single-line and error are the same picture').toBe(true);
  });

  test('ETI-2: each change by the person emits input once with the new value — which a capturing listener on the document already reads from the element; a value that is set is shown and emits neither input nor change, leaves the caret at its end while the input has focus, and changes nothing where it is the value already shown', async ({ page }) => {
    await mount(page, [fx('a', { multiline: true }), fx('s', { value: 'ab' })]);
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { __captured: string[] }).__captured = seen;
      document.addEventListener('input', (event) => seen.push((event.target as HTMLInputElement).value), true);
    });
    await record(page, 'a');
    await focus(page, 'a');
    await page.keyboard.type('hi');
    await page.keyboard.press('Backspace');
    await page.keyboard.insertText('ey there'); // a paste, dictation or autofill arrives as one insertion
    expect((await events(page)).filter((e) => !e.startsWith('focus') && !e.startsWith('rows'))).toEqual(['input:h', 'input:hi', 'input:h', 'input:hey there']);
    expect(await page.evaluate(() => (window as unknown as { __captured: string[] }).__captured)).toEqual(['h', 'hi', 'h', 'hey there']);
    // Set by the holder: shown, nothing emitted, the caret at the end.
    await host(page, 'a').evaluate((el) => {
      el.shadowRoot!.querySelector<HTMLTextAreaElement>('.input')!.setSelectionRange(1, 1);
      (el as El).value = 'A new value';
    });
    expect(await read(page, 'a')).toMatchObject({ value: 'A new value', native: 'A new value', selection: [11, 11], focused: true });
    expect((await events(page)).filter((e) => !e.startsWith('rows'))).toEqual([]);
    // The value it already shows: the caret stays where it is.
    await host(page, 'a').evaluate((el) => {
      el.shadowRoot!.querySelector<HTMLTextAreaElement>('.input')!.setSelectionRange(2, 4);
      (el as El).value = 'A new value';
    });
    expect((await read(page, 'a')).selection).toEqual([2, 4]);
    expect(await events(page)).toEqual([]);
    // Leaving after a set value commits nothing the person did not change… (the set value is not the person's)
    await record(page, 's');
    await set(page, 's', { value: 'abc' });
    expect(await events(page)).toEqual([]);
  });

  test('ETI-3: change is emitted once when focus leaves with a value different from the one it had when focus arrived, and once before the action that follows a change; not when nothing changed, and not twice for one value', async ({ page }) => {
    await mount(page, [fx('s', { value: 'ab' }), fx('m', { multiline: true, enterKey: 'action' })]);
    await record(page, 's');
    await focus(page, 's');
    await host(page, 's').evaluate((el) => (el as HTMLElement).blur());
    expect((await events(page)).filter((e) => !e.startsWith('focus'))).toEqual([]);
    await focus(page, 's');
    await page.keyboard.press('End');
    await page.keyboard.type('c');
    await page.keyboard.press('Enter');
    expect((await events(page)).filter((e) => !e.startsWith('focus'))).toEqual(['input:abc', 'change:abc', 'action:abc']);
    // The value was committed by the action: leaving emits nothing more.
    await host(page, 's').evaluate((el) => (el as HTMLElement).blur());
    expect((await events(page)).filter((e) => !e.startsWith('focus'))).toEqual([]);
    await record(page, 'm');
    await focus(page, 'm');
    await page.keyboard.type('x');
    await host(page, 'm').evaluate((el) => (el as HTMLElement).blur());
    expect((await events(page)).filter((e) => !e.startsWith('focus') && !e.startsWith('rows'))).toEqual(['input:x', 'change:x']);
  });

  test('ETI-4: a real composition in Japanese — the Enter that commits emits one input that is not composing and no action, under both values of enterKey and in a single-line input; nothing is written back while it runs; and the next Enter is read as ETI-6 says', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium drives an input method from a test (CDP Input.imeSetComposition)');
    await mount(page, [fx('act', { multiline: true, enterKey: 'action' }), fx('brk', { multiline: true }), fx('one')]);
    const cdp = await page.context().newCDPSession(page);
    for (const [id, after] of [['act', ['action:漢字']], ['brk', ['input:漢字\n']], ['one', ['action:漢字']]] as const) {
      await record(page, id);
      await focus(page, id);
      await events(page);
      for (const text of ['か', 'かん', 'かんじ']) await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
      // While composing the value follows the element, and the element's text is the input method's.
      expect(await host(page, id).evaluate((el) => [(el as El).value, el.shadowRoot!.querySelector<HTMLTextAreaElement>('.input')!.value])).toEqual(['かんじ', 'かんじ']);
      // The Enter that commits: the platform's key, sent as the input method sends it.
      await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Process', windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
      await cdp.send('Input.insertText', { text: '漢字' });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', windowsVirtualKeyCode: 13 });
      await settled(page, id);
      const committed = (await events(page)).filter((e) => !e.startsWith('rows'));
      expect(committed.filter((e) => e.startsWith('action') || e.startsWith('change')), id).toEqual([]);
      expect(committed.at(-1), id).toBe('input:漢字');
      expect((await read(page, id)).value, id).toBe('漢字');
      // The first Enter after the composition has ended.
      await page.keyboard.press('Enter');
      await settled(page, id);
      expect((await events(page)).filter((e) => !e.startsWith('rows') && !e.startsWith('change')), id).toEqual(after);
    }
    await cdp.detach();
  });

  for (const order of ['chromium', 'firefox', 'webkit'] as const) {
    test(`ETI-4: the events of a composition in the order ${order} reports them — the committing Enter emits no action and no change and inserts no line break of the input's own, also where the key arrives after the composition ended and still carries the platform's mark of one; a value set meanwhile is applied when it ends; a committed composition always produces an input`, async ({ page }) => {
      await mount(page, [fx('act', { multiline: true, enterKey: 'action' }), fx('one'), fx('set', { multiline: true })]);
      const compose = (id: string, commit: string) =>
        native(page, id).evaluate(
          (input, [o, final]) => {
            const element = input as HTMLTextAreaElement;
            const key = (type: string, name: string, composing: boolean, code229: boolean) => {
              const event = new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true, composed: true, isComposing: composing });
              if (code229) Object.defineProperty(event, 'keyCode', { value: 229 });
              element.dispatchEvent(event);
              return event.defaultPrevented;
            };
            const composition = (type: string, data: string) => element.dispatchEvent(new CompositionEvent(type, { data, bubbles: true, composed: true }));
            const typed = (inputType: string, data: string | null, composing: boolean) => element.dispatchEvent(new InputEvent('input', { inputType, data, isComposing: composing, bubbles: true, composed: true }));
            key('keydown', 'Process', false, true);
            composition('compositionstart', '');
            for (const text of ['か', 'かん']) {
              composition('compositionupdate', text);
              element.value = text;
              typed('insertCompositionText', text, true);
            }
            let prevented = false;
            if (o === 'chromium') {
              prevented = key('keydown', 'Enter', true, true);
              element.value = final;
              typed('insertCompositionText', final, true);
              composition('compositionend', final);
            } else if (o === 'firefox') {
              prevented = key('keydown', 'Enter', true, true);
              element.value = final;
              composition('compositionend', final);
              typed('insertCompositionText', final, false);
            } else {
              element.value = final;
              typed('insertFromComposition', final, true);
              composition('compositionend', final);
              // WebKit: the committing Enter is reported after the end, with key code 229 and isComposing false.
              prevented = key('keydown', 'Enter', false, true);
            }
            key('keyup', 'Enter', false, false);
            return prevented;
          },
          [order, commit] as const,
        );
      for (const id of ['act', 'one']) {
        await record(page, id);
        await focus(page, id);
        await events(page);
        expect(await compose(id, '漢'), `${id}: the key is left to the platform`).toBe(false);
        await settled(page, id);
        const heard = (await events(page)).filter((e) => !e.startsWith('rows'));
        expect(heard.filter((e) => e.startsWith('action') || e.startsWith('change')), id).toEqual([]);
        expect(heard.at(-1), id).toBe('input:漢');
        expect((await read(page, id)).value).toBe('漢');
      }
      // A key reported after the end of a composition that carries no mark at all, but was pressed no later than the end
      // (a key event's time is when the key was pressed), is still the composition's.
      await record(page, 'act');
      await focus(page, 'act');
      await events(page);
      // One task: no timer can run between the end and the key, as on a busy page, where input comes before timers.
      const keyAfterEnd = (after: number) =>
        native(page, 'act').evaluate((input, later) => {
          input.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true, composed: true }));
          const end = new CompositionEvent('compositionend', { data: '', bubbles: true, composed: true });
          input.dispatchEvent(end);
          const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, composed: true });
          Object.defineProperty(event, 'timeStamp', { value: end.timeStamp + later });
          input.dispatchEvent(event);
          return event.defaultPrevented;
        }, after);
      expect(await keyAfterEnd(0)).toBe(false);
      await settled(page, 'act');
      expect((await events(page)).filter((e) => e.startsWith('action'))).toEqual([]);
      // …and the first Enter after it acts.
      await page.keyboard.press('Enter');
      expect((await events(page)).filter((e) => e.startsWith('action'))).toEqual(['action:漢']);
      // A composition committed with no key at all (a candidate picked with the pointer): the first Enter pressed after
      // its end acts, though no timer has run since.
      expect(await keyAfterEnd(1)).toBe(true);
      expect((await events(page)).filter((e) => e.startsWith('action'))).toEqual(['action:漢']);
      // A value set during a composition is applied when the composition ends, and never written into it.
      await focus(page, 'set');
      await native(page, 'set').evaluate((input) => {
        const element = input as HTMLTextAreaElement;
        element.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true, composed: true }));
        element.value = 'か';
        element.dispatchEvent(new InputEvent('input', { inputType: 'insertCompositionText', data: 'か', isComposing: true, bubbles: true, composed: true }));
      });
      await host(page, 'set').evaluate(async (el) => {
        (el as El).value = 'given';
        await (el as El).updateComplete;
      });
      expect(await native(page, 'set').evaluate((input) => (input as HTMLTextAreaElement).value)).toBe('か');
      await native(page, 'set').evaluate((input) => input.dispatchEvent(new CompositionEvent('compositionend', { data: 'か', bubbles: true, composed: true })));
      expect(await read(page, 'set')).toMatchObject({ value: 'given', native: 'given' });
    });
  }

  test('ETI-5: a single-line value longer than its room stays on one line, scrolls sideways inside the input with the caret kept in view and widens nothing, and a pasted line break is taken as the platform’s single-line element takes it; a multi-line input wraps at its own width, breaks a run with no space between any two characters, and never scrolls sideways', async ({ page }) => {
    await mountFixtures(page, spec);
    const one = await line(page, 'single-line-long');
    const single = await native(page, 'single-line-long').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, height: el.getBoundingClientRect().height, tag: el.localName }));
    expect(single.tag).toBe('input');
    expect(single.scroll).toBeGreaterThan(single.client);
    near(single.height, one, 'one line');
    near((await box(host(page, 'single-line-long'))).width, (await box(host(page, 'single-line'))).width, 'no wider');
    // The caret is kept in view: End scrolls the line.
    await focus(page, 'single-line-long');
    await native(page, 'single-line-long').evaluate((el) => (el as HTMLInputElement).setSelectionRange((el as HTMLInputElement).value.length, (el as HTMLInputElement).value.length));
    await page.keyboard.type('!');
    expect(await native(page, 'single-line-long').evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await page.keyboard.insertText('a\nb');
    expect((await read(page, 'single-line-long')).value).not.toContain('\n');
    const unbroken = await native(page, 'multiline-long-unbroken').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, height: el.getBoundingClientRect().height, overflowX: getComputedStyle(el).overflowX }));
    expect(unbroken.scroll).toBeLessThanOrEqual(unbroken.client);
    expect(unbroken.height / one).toBeGreaterThanOrEqual(3);
    expect(Math.abs(unbroken.height / one - Math.round(unbroken.height / one))).toBeLessThan(0.05);
    expect(unbroken.overflowX).toBe('hidden');
    expect((await read(page, 'multiline-long-unbroken')).rows).toBe(Math.round(unbroken.height / one));
  });

  test('ETI-6: Enter — a single-line input emits action with the value; a multi-line one begins a new line under line-break and emits action and inserts nothing under action, with Shift+Enter a new line; Ctrl+Enter and Command+Enter emit action and insert nothing under both; the input keeps its value, its selection and its focus; a read-only input emits none; an unknown enterKey behaves as line-break and is reported', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('one', { value: 'ab' }), fx('brk', { multiline: true, value: 'ab' }), fx('act', { multiline: true, enterKey: 'action', value: 'ab' }), fx('ro', { value: 'ab', readOnly: true }), fx('odd', { multiline: true, enterKey: 'send', value: 'ab' })]);
    const press = async (id: string, key: string) => {
      await record(page, id);
      await focus(page, id);
      await native(page, id).evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(1, 1));
      await events(page);
      await page.keyboard.press(key);
      const state = await read(page, id);
      return { events: (await events(page)).filter((e) => !e.startsWith('rows')), ...state };
    };
    // The spec's table of keys ("Enter"), a row at a time.
    expect(await press('one', 'Enter')).toMatchObject({ events: ['action:ab'], value: 'ab', selection: [1, 1], focused: true });
    expect(await press('one', 'Control+Enter')).toMatchObject({ events: ['action:ab'], value: 'ab', focused: true });
    expect(await press('brk', 'Enter')).toMatchObject({ events: ['input:a\nb'], value: 'a\nb', focused: true });
    await set(page, 'brk', { value: 'ab' });
    expect(await press('brk', 'Shift+Enter')).toMatchObject({ events: ['input:a\nb'], value: 'a\nb' });
    await set(page, 'brk', { value: 'ab' });
    expect(await press('brk', 'Control+Enter')).toMatchObject({ events: ['action:ab'], value: 'ab', selection: [1, 1], focused: true });
    expect(await press('brk', 'Meta+Enter')).toMatchObject({ events: ['action:ab'], value: 'ab', selection: [1, 1], focused: true });
    expect(await press('act', 'Enter')).toMatchObject({ events: ['action:ab'], value: 'ab', selection: [1, 1], focused: true });
    expect(await press('act', 'Shift+Enter')).toMatchObject({ events: ['input:a\nb'], value: 'a\nb' });
    await set(page, 'act', { value: 'ab' });
    expect(await press('act', 'Control+Enter')).toMatchObject({ events: ['action:ab'], value: 'ab' });
    expect(await press('act', 'Meta+Enter')).toMatchObject({ events: ['action:ab'], value: 'ab' });
    // The return key asked of an on-screen keyboard.
    expect(await native(page, 'act').getAttribute('enterkeyhint')).toBe('enter');
    expect(await native(page, 'one').getAttribute('enterkeyhint')).toBeNull();
    // Read-only: no key asks for the action.
    expect((await press('ro', 'Enter')).events).toEqual([]);
    expect((await press('ro', 'Control+Enter')).events).toEqual([]);
    // A value it does not know: a line break, and a report.
    expect(await press('odd', 'Enter')).toMatchObject({ events: ['input:a\nb'], value: 'a\nb' });
    expect(seen.filter((text) => text.includes('ETI-6'))).toHaveLength(1);
  });

  test('ETI-6: in a form with a submit button, Enter in a single-line input presses that button once — after change and action — and not when action was cancelled; Enter in a multi-line input whose enterKey is action submits nothing', async ({ page }) => {
    await page.setContent(`<!doctype html><html><head><style>${tokensCss()}</style></head><body>
      <form id="f"><tanrei-embedded-text-input id="one" name="q" label="Search"></tanrei-embedded-text-input><tanrei-embedded-text-input id="many" name="m" label="Message" multiline enter-key="action"></tanrei-embedded-text-input><button id="go">Go</button></form>
      <script type="module">${bundle()}</script></body></html>`);
    await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { __log: string[] }).__log = log;
      const form = document.querySelector('form')!;
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        log.push(`submit:${new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString()}:${(event as SubmitEvent).submitter?.id ?? ''}`);
      });
      document.querySelector('#go')!.addEventListener('click', () => log.push('click'));
      for (const type of ['change', 'action']) document.addEventListener(type, (event) => log.push(`${type}:${(event.target as HTMLElement).id}`));
    });
    const log = () => page.evaluate(() => (window as unknown as { __log: string[] }).__log.splice(0));
    await page.locator('#one').evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.type('ab');
    await page.keyboard.press('Enter');
    expect(await log()).toEqual(['change:one', 'action:one', 'click', 'submit:q=ab&m=:go']);
    // Cancelled: the form is not asked.
    await page.evaluate(() => document.addEventListener('action', (event) => event.preventDefault(), { once: true }));
    await page.keyboard.press('Enter');
    expect(await log()).toEqual(['action:one']);
    await page.locator('#many').evaluate((el) => (el as HTMLElement).focus());
    await page.keyboard.type('x');
    await page.keyboard.press('Enter');
    expect(await log()).toEqual(['change:many', 'action:many']);
  });

  test('ETI-6: where the primary pointer is coarse and cannot hover, Enter in a multi-line input whose enterKey is action is taken for the return key of an on-screen keyboard and begins a new line, and Ctrl+Enter still emits action', async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium emulates a touch device whose primary pointer is coarse');
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 400, height: 700 } });
    const page = await context.newPage();
    await mount(page, [fx('act', { multiline: true, enterKey: 'action', value: 'ab' })]);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse) and (hover: none)').matches)).toBe(true);
    await record(page, 'act');
    await focus(page, 'act');
    await page.keyboard.press('End');
    await events(page);
    await page.keyboard.press('Enter');
    expect((await events(page)).filter((e) => !e.startsWith('rows'))).toEqual(['input:ab\n']);
    await page.keyboard.press('Control+Enter');
    expect((await events(page)).filter((e) => !e.startsWith('rows'))).toEqual(['change:ab\n', 'action:ab\n']);
    // ETI-12: for touch the hit area is a touch target high.
    const [touch, area] = [await resolveToken(page, '--tanrei-sys-target-touch'), await host(page, 'act').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height))];
    expect(area).toBeGreaterThanOrEqual(touch - 0.5);
    await context.close();
  });

  test('ETI-7: a multi-line input is exactly as tall as its lines — one, four with no limit, three of six at maxRows 3 where it scrolls inside with the caret in view, three while empty at minRows 3 — with no scrollbar while every line fits; maxRows below minRows is minRows, minRows below 1 is 1, and a single-line input is one line whatever they say', async ({ page }) => {
    await mountFixtures(page, spec, { reducedMotion: true, fixtures: [...spec.fixtures, fx('crossed', { multiline: true, minRows: 4, maxRows: 2, value: 'a' }), fx('zero', { multiline: true, minRows: 0 }), fx('flat', { minRows: 3, maxRows: 5, enterKey: 'action', value: 'a' })] });
    const one = await line(page, 'multiline-one-line');
    for (const [id, lines] of [['multiline-one-line', 1], ['multiline-grown', 4], ['multiline-at-maximum', 3], ['multiline-min-rows', 3], ['crossed', 4], ['zero', 1], ['flat', 1], ['held-capsule', 1], ['held-capsule-grown', 4], ['held-capsule-at-maximum', 3]] as const) {
      near(await heightOf(page, id), lines * one, id);
      expect((await read(page, id)).rows, id).toBe(lines);
    }
    const overflow = (id: string) => native(page, id).evaluate((el) => ({ y: getComputedStyle(el).overflowY, scroll: el.scrollHeight, client: el.clientHeight, top: el.scrollTop }));
    expect((await overflow('multiline-grown')).y).toBe('hidden');
    const full = await overflow('multiline-at-maximum');
    expect(full.y).toBe('auto');
    near(full.scroll, 6 * one, 'six lines inside');
    // The caret is kept in view: at the end of the text the input has scrolled to its last line.
    await focus(page, 'multiline-at-maximum');
    await native(page, 'multiline-at-maximum').evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange((el as HTMLTextAreaElement).value.length, (el as HTMLTextAreaElement).value.length));
    await page.keyboard.type('!');
    // (To its last line, give or take the room an engine keeps under a caret.)
    near((await overflow('multiline-at-maximum')).top, 3 * one, 'scrolled to the caret', 4);
    // Deleting follows too.
    await set(page, 'multiline-grown', { value: 'One\nTwo' });
    near(await heightOf(page, 'multiline-grown'), 2 * one, 'after a shorter value');
  });

  test('ETI-8: a typed line break moves the height from two lines to three over motion.resize-duration with motion.resize-easing, through heights in between, with the first line where it was at every sample and no scrollbar; a change that arrives meanwhile goes on from the height then shown and nothing is queued; forty pasted lines at maxRows 6 are one motion from one line to six with one rowschange; and a value emptied at six lines is one motion down to minRows', async ({ page }) => {
    await mount(page, [fx('two', { multiline: true, value: 'a\nb' }), fx('paste', { multiline: true, maxRows: 6, value: 'a' }), fx('empty', { multiline: true, maxRows: 6, value: '1\n2\n3\n4\n5\n6' })], { reducedMotion: false });
    const one = await line(page, 'two');
    const duration = await resolveToken(page, T('motion-resize-duration'), 'duration');
    const typed = await sample(page, 'two', TYPE_BREAK, { again: TYPE_BREAK });
    expect(typed.running).toBe(1);
    expect(typed.duration).toBe(Math.round(duration));
    expect(typed.easing).toMatch(/cubic-bezier/);
    near(typed.from, 2 * one, 'from two lines');
    near(typed.samples![0]!, 2 * one, 'the motion begins at the height shown');
    expect(typed.half).toBeGreaterThan(2 * one + 1);
    expect(typed.half).toBeLessThan(3 * one - 1);
    for (let i = 1; i < typed.samples!.length; i++) expect(typed.samples![i]!, 'never lower than the one before').toBeGreaterThanOrEqual(typed.samples![i - 1]!);
    for (const first of typed.firsts!) near(first, 0, 'the first line stays at the top edge');
    expect(typed.scrollbar).toBe('hidden');
    // The second line break, mid-motion: from the height then shown, as one motion.
    near(typed.continued!, typed.samples![3]!, 'continues from the height shown', 1);
    expect(typed.queued).toBe(1);
    near(typed.to, 4 * one, 'the end height');
    expect(typed.told).toEqual([`3@${Math.round(2 * one)}`, `4@${Math.round(typed.samples![3]!)}`]);
    // Forty lines at once: one motion, straight to the end height maxRows bounds.
    const pasted = await sample(page, 'paste', `document.execCommand('insertText', false, Array.from({ length: 40 }, (_, i) => 'line ' + i).join('\\n'))`);
    expect(pasted.running).toBe(1);
    near(pasted.from, one, 'from one line');
    for (let i = 1; i < pasted.samples!.length; i++) expect(pasted.samples![i]!).toBeGreaterThan(pasted.samples![i - 1]!);
    near(pasted.to, 6 * one, 'six lines');
    expect(pasted.told).toEqual([`6@${Math.round(one)}`]);
    // Emptied after it was sent: one motion down.
    const emptied = await sample(page, 'empty', `el.value = ''; el.performUpdate?.()`);
    expect(emptied.running).toBe(1);
    near(emptied.samples![0]!, 6 * one, 'from six lines');
    for (let i = 1; i < emptied.samples!.length; i++) expect(emptied.samples![i]!).toBeLessThan(emptied.samples![i - 1]!);
    near(emptied.to, one, 'down to minRows');
    expect(emptied.told).toEqual([`1@${Math.round(6 * one)}`]);
    // At rest again the box holds no height of its own.
    await expect.poll(() => host(page, 'empty').evaluate((el) => [el.shadowRoot!.querySelector<HTMLElement>('.box')!.style.blockSize, el.shadowRoot!.querySelector('.box')!.hasAttribute('data-resizing')])).toEqual(['', false]);
  });

  test('ETI-8: at every rendered frame of the motion a typed line break starts — in a holder at the top of its column and in one docked at the bottom of a column, which grows upward — the first line stays at the box’s top edge and the box never scrolls, because the caret on a line the box does not hold yet is not revealed by scrolling the box', async ({ page }) => {
    // The two holders, each with one line of text: one at the top of its stage, one docked at the bottom of a column
    // 400 px tall, as a conversation's composer is.
    await mount(page, [fx('held-top', { multiline: true, value: 'One line' }), fx('held-docked', { multiline: true, value: 'One line' })], { reducedMotion: false });
    await stage(page, 'held-docked').evaluate((el) => Object.assign((el as HTMLElement).style, { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', blockSize: '400px' }));
    const one = await line(page, 'held-top');
    for (const id of ['held-top', 'held-docked']) {
      // The motion is held at its start in the task that starts it — the `input` the key causes, after the element's own
      // handler — and then stepped by hand: every read below follows a frame that was rendered, so what the browser
      // does at a frame (revealing the caret) is seen, whatever the speed of the machine.
      await host(page, id).evaluate((el) => {
        const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.input')!;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        el.addEventListener(
          'input',
          () => {
            const animations = el.shadowRoot!.querySelector('.box')!.getAnimations();
            for (const animation of animations) {
              animation.pause();
              animation.currentTime = 0;
            }
            (window as unknown as { __held: number }).__held = animations.length;
          },
          { once: true },
        );
      });
      await page.keyboard.press('Enter');
      const frames = await host(page, id).evaluate(async (el) => {
        const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.input')!;
        const boxed = el.shadowRoot!.querySelector<HTMLElement>('.box')!;
        const capsule = el.closest<HTMLElement>('.capsule')!;
        const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const read = (at: string) => ({ at, first: input.getBoundingClientRect().top - boxed.getBoundingClientRect().top, scrolled: boxed.scrollTop, inHolder: input.getBoundingClientRect().top - capsule.getBoundingClientRect().top, height: boxed.getBoundingClientRect().height });
        const animations = boxed.getAnimations();
        const duration = Number(animations[0]?.effect?.getComputedTiming().duration ?? 0);
        await frame();
        const seen = [read('start')];
        for (const part of [0.25, 0.5, 0.75]) {
          for (const animation of animations) animation.currentTime = duration * part;
          await frame();
          seen.push(read(String(part)));
        }
        for (const animation of animations) animation.finish();
        await frame();
        seen.push(read('end'));
        return { held: (window as unknown as { __held: number }).__held, seen };
      });
      expect(frames.held, `${id}: one motion`).toBe(1);
      const padding = frames.seen.at(-1)!.inHolder;
      for (const f of frames.seen) {
        near(f.first, 0, `${id} at ${f.at}: the first line at the box’s top edge`, 0.5);
        expect(f.scrolled, `${id} at ${f.at}: the box has not scrolled`).toBe(0);
        near(f.inHolder, padding, `${id} at ${f.at}: the first line where it was in the holder`, 0.5);
      }
      near(frames.seen[0]!.height, one, `${id}: it starts at one line`);
      expect(frames.seen[2]!.height, `${id}: through heights in between`).toBeGreaterThan(one + 1);
      expect(frames.seen[2]!.height).toBeLessThan(2 * one - 1);
      near(frames.seen.at(-1)!.height, 2 * one, `${id}: it ends at two lines`);
    }
  });

  test('ETI-9: the height changes at once, with no motion — when a five-line value is first drawn; when it is shown again after it was not; when its width, minRows or maxRows changed; while a pointer is held down in its text; and where motion is reduced', async ({ page }) => {
    await mount(page, [fx('five', { multiline: true, value: '1\n2\n3\n4\n5' }), fx('w', { multiline: true, value: 'A line of text that wraps where the input is narrow enough for it to' }), fx('held', { multiline: true, value: 'a\nb' })], { reducedMotion: false });
    const one = await line(page, 'five');
    const moving = (id: string) => host(page, id).evaluate((el) => el.shadowRoot!.querySelector('.box')!.getAnimations().length);
    expect(await moving('five')).toBe(0);
    near(await heightOf(page, 'five'), 5 * one, 'five lines in the first frame');
    // A changed width.
    const before = await heightOf(page, 'w');
    await host(page, 'w').evaluate((el) => (el.style.inlineSize = '120px'));
    await page.waitForFunction(([id, h]) => document.querySelector(`[data-fixture="${id}"] tanrei-embedded-text-input`)!.getBoundingClientRect().height > (h as number), ['w', before] as const);
    expect(await moving('w')).toBe(0);
    // minRows and maxRows.
    await host(page, 'five').evaluate(async (el) => {
      Object.assign(el, { maxRows: 2 });
      await (el as El).updateComplete;
    });
    expect(await moving('five')).toBe(0);
    near(await heightOf(page, 'five'), 2 * one, 'maxRows at once');
    await host(page, 'five').evaluate(async (el) => {
      Object.assign(el, { maxRows: 0, minRows: 7 });
      await (el as El).updateComplete;
    });
    expect(await moving('five')).toBe(0);
    near(await heightOf(page, 'five'), 7 * one, 'minRows at once');
    // Not shown, changed, shown again.
    await host(page, 'five').evaluate(async (el) => {
      const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      (el.parentElement as HTMLElement).style.display = 'none';
      await frame();
      Object.assign(el, { minRows: 1, value: '1\n2\n3' });
      await (el as El).updateComplete;
      await frame();
      (el.parentElement as HTMLElement).style.display = '';
    });
    await page.waitForFunction((h) => Math.abs(document.querySelector('[data-fixture="five"] tanrei-embedded-text-input')!.getBoundingClientRect().height - h) < 1, 3 * one);
    expect(await moving('five')).toBe(0);
    // A pointer held down in the text: a value set from a script changes the height in the next frame.
    const b = await box(native(page, 'held'));
    await page.mouse.move(b.x + 10, b.y + 10);
    await page.mouse.down();
    const held = await host(page, 'held').evaluate(async (el) => {
      (el as El).value = 'a\nb\nc\nd';
      await (el as El).updateComplete;
      return { moving: el.shadowRoot!.querySelector('.box')!.getAnimations().length, height: el.getBoundingClientRect().height };
    });
    await page.mouse.up();
    expect(held.moving).toBe(0);
    near(held.height, 4 * one, 'four lines at once');
    // Let go: the next change moves again.
    expect((await sample(page, 'held', TYPE_BREAK)).running).toBe(1);
    // Reduced motion.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await sample(page, 'held', TYPE_BREAK);
    expect(reduced.running).toBe(0);
    near(reduced.to, reduced.from + one, 'a line more in the next frame');
  });

  test('ETI-8: a letter typed while the motion of a line break runs continues that motion — the motion it replaces reports its cancellation a frame later, and that report ends nothing: the height still moves from the one shown to the end height through heights on its curve, with no step of more than 35 % of the whole change', async ({ page }) => {
    await mount(page, [fx('typed', { multiline: true, value: 'One line' }), fx('held-typed', { multiline: true, value: 'One line' })], { reducedMotion: false });
    const one = await line(page, 'typed');
    for (const id of ['typed', 'held-typed']) {
      const run = await host(page, id).evaluate(async (el) => {
        const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.input')!;
        const boxed = el.shadowRoot!.querySelector<HTMLElement>('.box')!;
        const height = () => boxed.getBoundingClientRect().height;
        const resizing = () => boxed.getAnimations().filter((a) => /^(block-size|height)$/.test((a as CSSTransition).transitionProperty));
        const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        let cancelled = 0;
        boxed.addEventListener('transitioncancel', () => cancelled++);
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        const from = height();
        const hold = (at: (duration: number) => number) => {
          const held = resizing();
          const duration = Number(held[0]?.effect?.getComputedTiming().duration ?? 0);
          for (const motion of boxed.getAnimations()) {
            motion.pause();
            motion.currentTime = at(duration);
          }
          return held.length;
        };
        // A line break: its motion runs for a rendered frame, held a thirteenth of the way (every read below follows a
        // rendered frame).
        document.execCommand('insertText', false, '\n');
        const first = hold((duration) => duration / 13);
        await frame();
        const mid = height();
        // A letter, a moment later: its change replaces that motion with one from the height then shown, and the replaced
        // one is cancelled — which is reported with the next frame's events. The new motion is held at its start and then
        // stepped by hand, so what is read does not depend on the machine's speed.
        document.execCommand('insertText', false, 'b');
        const motions = resizing();
        for (const motion of boxed.getAnimations()) {
          motion.pause();
          motion.currentTime = 0;
        }
        const duration = Number(motions[0]?.effect?.getComputedTiming().duration ?? 0);
        await frame();
        const after = { motions: resizing().length, marked: boxed.hasAttribute('data-resizing'), cancelled };
        const heights = [from, mid, height()];
        // The eased progress at each read, from the motion itself: where the height should be, whatever the curve.
        const progress = [Number.NaN, 0, Number(motions[0]?.effect?.getComputedTiming().progress ?? 1)];
        for (let step = 1; step < 13; step++) {
          for (const motion of motions) motion.currentTime = (duration * step) / 13;
          await frame();
          heights.push(height());
          progress.push(Number(motions[0]?.effect?.getComputedTiming().progress ?? 1));
        }
        for (const motion of motions) motion.finish();
        await frame();
        heights.push(height());
        progress.push(1);
        return { first, held: motions.length, after, heights, progress };
      });
      expect(run.first, `${id}: the line break starts one motion`).toBe(1);
      expect(run.held, `${id}: one motion runs after the letter`).toBe(1);
      expect(run.after.cancelled, `${id}: the replaced motion reported its cancellation`).toBeGreaterThanOrEqual(1);
      expect({ motions: run.after.motions, marked: run.after.marked }, `${id}: after that report the motion still runs`).toEqual({ motions: 1, marked: true });
      const whole = run.heights.at(-1)! - run.heights[0]!;
      near(whole, one, `${id}: one line more`);
      // The letter's motion, from the height shown when it came: at each read where its curve has brought it.
      const rest = run.heights.at(-1)! - run.heights[1]!;
      expect(rest, `${id}: the letter's motion goes on from the height then shown`).toBeGreaterThan(1);
      run.heights.forEach((h, i) => i >= 1 && near(h, run.heights[1]! + run.progress[i]! * rest, `${id}: read ${i} on the curve (${run.heights.join(' → ')})`, 1));
      // And in the measure of a motion that jumps: at 13 evenly spaced times no step is more than 35 % of the change (the
      // standard curve's largest is 28 %; a motion ended by the report moves 100 % at once).
      for (let i = 1; i < run.heights.length; i++) {
        const step = run.heights[i]! - run.heights[i - 1]!;
        expect(step, `${id}: never lower than the one before (${run.heights.join(' → ')})`).toBeGreaterThanOrEqual(-0.01);
        expect(step / whole, `${id}: step ${i} is no more than 35 % of the change (${run.heights.join(' → ')})`).toBeLessThanOrEqual(0.35);
      }
    }
  });

  test('ETI-10: the height it takes in its layout is the animated one — a holder that sizes itself to its content is the input’s height plus its own paddings at every sample of a motion, with no jump at its start or its end; rowschange is emitted once when it is first drawn and once for each later change of the number of lines, before the first frame in which the height differs, and never for a text size alone', async ({ page }) => {
    // Heard from before the element is defined: the first one is not missed.
    const lead = `<script>window.__rows = []; document.addEventListener('rowschange', (event) => { const el = event.target; window.__rows.push(el.closest('[data-fixture]').getAttribute('data-fixture') + ':' + event.detail.rows + ':' + event.detail.scrolling + ':' + el.rows); });</script>`;
    await mountFixtures(page, spec, { reducedMotion: false, lead });
    const first = await page.evaluate(() => (window as unknown as { __rows: string[] }).__rows.splice(0));
    // Once each when it is first drawn, with the number it shows and whether it scrolls; `rows` reads the same number.
    // (A text that wraps otherwise when its face arrives shows another number of lines then, and says so: once more.)
    const said = (id: string) => first.filter((entry) => entry.startsWith(`${id}:`));
    for (const f of spec.fixtures) {
      expect(said(f.id).length, f.id).toBeGreaterThanOrEqual(1);
      expect(new Set(said(f.id)).size, `${f.id}: never the same number twice`).toBe(said(f.id).length);
    }
    expect(first.length).toBeLessThanOrEqual(spec.fixtures.length + 2);
    for (const [id, entry] of [['single-line', '1:false:1'], ['multiline-grown', '4:false:4'], ['multiline-at-maximum', '3:true:3'], ['multiline-min-rows', '3:false:3'], ['held-capsule-grown', '4:false:4']]) expect(said(id!), id).toEqual([`${id}:${entry}`]);
    const padding = await host(page, 'held-capsule-grown').evaluate((el) => el.closest('.capsule')!.getBoundingClientRect().height - el.getBoundingClientRect().height);
    expect(padding).toBeGreaterThan(0);
    const moved = await sample(page, 'held-capsule-grown', TYPE_BREAK, { watch: '.capsule' });
    expect(moved.running).toBe(1);
    near(moved.heldFrom, moved.from + padding, 'before');
    moved.samples!.forEach((height, index) => near(moved.helds![index]!, height + padding, `sample ${index}`));
    near(moved.heldTo, moved.to + padding, 'after');
    // One rowschange, emitted while the height was still the one shown.
    expect(moved.told).toEqual([`5@${Math.round(moved.from)}`]);
    expect((await page.evaluate(() => (window as unknown as { __rows: string[] }).__rows.splice(0))).filter((e) => e.startsWith('held-capsule-grown'))).toEqual(['held-capsule-grown:5:false:5']);
    // A larger text size changes the height and not the number of lines: nothing is emitted.
    const before = await heightOf(page, 'multiline-one-line');
    await page.evaluate(() => (document.documentElement.style.fontSize = '125%'));
    await page.waitForFunction((h) => document.querySelector('[data-fixture="multiline-one-line"] tanrei-embedded-text-input')!.getBoundingClientRect().height > h + 2, before);
    expect((await page.evaluate(() => (window as unknown as { __rows: string[] }).__rows.splice(0))).filter((e) => e.startsWith('multiline-one-line'))).toEqual([]);
  });

  test('ETI-11: focus is shown by the caret alone — given by Tab, by a press or by focus(), each reported once by focusin and ended by focusout, the host matching :focus-within for exactly that time, and no outline, shadow or border on any part, under ring and under glow; the sample holder draws its focused edge for exactly as long', async ({ page }) => {
    for (const system of [undefined, 'acme'] as const) {
      await mountFixtures(page, spec, system ? { system, systemCss: await acmeSystemCss() } : {});
      const id = 'held-capsule-grown';
      const edge = () => host(page, id).evaluate((el) => ({ color: getComputedStyle(el.closest('.capsule')!).outlineColor, within: el.matches(':focus-within') }));
      const ring = await resolveColor(page, '--tanrei-sys-color-focus-ring');
      await record(page, id);
      expect(await edge()).toEqual({ color: 'rgba(0, 0, 0, 0)', within: false });
      const ways: [string, () => Promise<unknown>][] = [
        ['Tab', () => tabTo(page, host(page, id))],
        ['a press', async () => {
          // Scrolled into view before it is measured: a box is a rectangle in the window and the press a point in it.
          // Where the Tab before it left the page is WebKit's to decide: it reveals a text control that Tab focused at
          // a later rendering update, which the blur that follows can come before, and the page then stays where the
          // previous stop was, the input below the window's bottom edge (y 757 in a window 720 high) and the press on
          // nothing.
          await native(page, id).scrollIntoViewIfNeeded();
          const b = await box(native(page, id));
          await page.mouse.click(b.x + 20, b.y + 10);
        }],
        ['focus()', () => focus(page, id)],
      ];
      for (const [way, give] of ways) {
        await give();
        expect((await events(page)).filter((e) => e.startsWith('focus')), `${system}: ${way}`).toEqual(['focusin']);
        expect(await edge(), `${system}: ${way}`).toEqual({ color: ring, within: true });
        for (const part of await drawn(page, id)) expect(part, `${system}: ${way}`).toEqual(NOTHING);
        await host(page, id).evaluate((el) => (el as HTMLElement).blur());
        expect((await events(page)).filter((e) => e.startsWith('focus')), `${system}: ${way}`).toEqual(['focusout']);
        expect(await edge(), `${system}: ${way}`).toEqual({ color: 'rgba(0, 0, 0, 0)', within: false });
      }
    }
  });

  test('ETI-12: a press above or below its one line, inside an area a pointer target high, gives the input focus and places the caret at the nearest point of the text, with no pressed state and no change of its size; a holder passes a press on its own padding on with focusAt(), which puts the caret where a press on the nearest point of the text would', async ({ page }) => {
    await mountFixtures(page, spec);
    const target = await resolveToken(page, '--tanrei-sys-target-pointer');
    const b = await box(host(page, 'single-line'));
    const one = await line(page, 'single-line');
    expect(target).toBeGreaterThan(one);
    near(await host(page, 'single-line').evaluate((el) => Number.parseFloat(getComputedStyle(el, '::before').height)), target, 'the hit area');
    near(b.height, one, 'the drawn size is its line');
    const reach = (target - one) / 2;
    // The caret by a press on the text itself, at the same x: what a press beyond the line must give.
    const at = async (x: number, y: number) => {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.mouse.click(x, y);
      return read(page, 'single-line');
    };
    const inside = await at(b.x + 48, b.y + one / 2);
    expect(inside.focused).toBe(true);
    expect(inside.selection[0]).toBeGreaterThan(0);
    for (const y of [b.y - reach + 2, b.y + one + reach - 2]) {
      const beyond = await at(b.x + 48, y);
      expect(beyond.focused, `y ${y}`).toBe(true);
      expect(beyond.selection, `y ${y}`).toEqual(inside.selection);
    }
    // Beyond the area: not the input's.
    expect((await at(b.x + 48, b.y - reach - 6)).focused).toBe(false);
    expect(await host(page, 'single-line').evaluate((el) => [el.hasAttribute('data-pressed'), !!el.shadowRoot!.querySelector('[data-pressed], .ripple')])).toEqual([false, false]);
    near((await box(host(page, 'single-line'))).height, one, 'unchanged');
    // The holder's side: a press on the capsule's padding.
    const id = 'held-capsule-grown';
    await stage(page, id).scrollIntoViewIfNeeded();
    const [capsule, text] = [await box(stage(page, id).locator('.capsule')), await box(native(page, id))];
    await page.mouse.click(text.x + 60, text.y + one * 1.5);
    const onText = await read(page, id);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    // Left of the second line, in the padding: the start of that line.
    await page.mouse.click(capsule.x + 3, text.y + one * 1.5);
    const fromPadding = await read(page, id);
    expect(fromPadding.focused).toBe(true);
    expect(fromPadding.selection[0]).toBe('Thanks for the draft.\n'.length);
    expect(fromPadding.selection[0]).toBeLessThan(onText.selection[0]!);
    // Below the last line: its end… of the line nearest, at that x.
    await page.mouse.click(text.x + text.width - 2, capsule.y + capsule.height - 2);
    expect((await read(page, id)).selection[0]).toBe((await read(page, id)).value.length);
    // A disabled input takes no press.
    await stage(page, 'held-capsule-disabled').scrollIntoViewIfNeeded();
    const off = await box(stage(page, 'held-capsule-disabled').locator('.capsule'));
    await page.mouse.click(off.x + 3, off.y + off.height / 2);
    expect((await read(page, 'held-capsule-disabled')).focused).toBe(false);
  });

  test('ETI-13: exposed as a text box — a multi-line one while multiline — named by label and described by description, invalid, required, read-only and disabled from the props of those names; the placeholder is never the name; with no label it still works and is reported; and inside a Field it sends the Field no question', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mount(page, [
      ...spec.fixtures.filter((f) => ['single-line', 'placeholder', 'multiline-one-line', 'read-only', 'disabled-placeholder'].includes(f.id)),
      fx('all', { label: 'Reply', description: '12 of 280. Everyone in this channel can read it.', error: true, required: true, placeholder: 'Write a reply' }),
      { id: 'nameless', props: { placeholder: 'Write a message' } },
    ]);
    const attributes = (id: string) => native(page, id).evaluate((el) => Object.fromEntries(['aria-label', 'aria-description', 'aria-invalid', 'aria-required', 'aria-readonly'].map((name) => [name, el.getAttribute(name)])));
    expect(await attributes('single-line')).toEqual({ 'aria-label': 'Message', 'aria-description': null, 'aria-invalid': null, 'aria-required': null, 'aria-readonly': null });
    expect(await attributes('all')).toEqual({ 'aria-label': 'Reply', 'aria-description': '12 of 280. Everyone in this channel can read it.', 'aria-invalid': 'true', 'aria-required': 'true', 'aria-readonly': null });
    expect((await attributes('read-only'))['aria-readonly']).toBe('true');
    // The host has no role and no name of its own.
    expect(await host(page, 'all').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label')])).toEqual([null, null]);
    // Without a label: it works, and a debug build says it has no name.
    await focus(page, 'nameless');
    await page.keyboard.type('x');
    expect((await read(page, 'nameless')).value).toBe('x');
    expect(seen.filter((text) => text.includes('ETI-13'))).toHaveLength(1);
    await expect(host(page, 'single-line').getByRole('textbox', { name: 'Message' })).toHaveCount(1);
    if (browserName === 'chromium') {
      await set(page, 'nameless', { value: '' });
      const tree = await textboxes(page);
      expect(tree.find((node) => node.name === 'Message' && !node.multiline && !node.readonly && !node.disabled)).toMatchObject({ role: 'textbox', description: '' });
      expect(tree.filter((node) => node.name === 'Message' && node.multiline)).toHaveLength(1);
      expect(tree.find((node) => node.name === 'Reply')).toMatchObject({ role: 'textbox', description: '12 of 280. Everyone in this channel can read it.', invalid: 'true', required: true });
      expect(tree.filter((node) => node.readonly)).toHaveLength(1);
      expect(tree.filter((node) => node.disabled)).toHaveLength(1);
      // The placeholder is the name of nothing that has a label.
      expect(tree.filter((node) => node.name === 'Write a message' || node.name === 'Write a reply').length).toBeLessThanOrEqual(1);
      expect(tree.find((node) => node.name === 'Reply')!.name).not.toContain('Write');
    }
    // Inside a Field: no question leaves it, and the Field reports a control that did not ask as it reports any.
    await mountFixtures(page, fieldSpec, { fixtures: [] });
    const asked = await page.evaluate(async (tag) => {
      const heard: string[] = [];
      document.addEventListener('tanrei-field-connect', (event) => heard.push((event.target as Element).localName), true);
      const field = document.createElement('tanrei-field');
      field.setAttribute('label', 'Message');
      field.innerHTML = `<${tag} label="Message" multiline></${tag}>`;
      document.body.append(field);
      await (field as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await (field.firstElementChild as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 0));
      return heard.filter((name) => name === tag);
    }, TAG);
    expect(asked).toEqual([]);
  });

  test('ETI-14: in error it computes exactly what it computes without — the same text, placeholder and caret colors, and no box — is exposed as invalid, and never sets error itself', async ({ page }) => {
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures.filter((f) => f.id === 'single-line' || f.id === 'error'), fx('hint', { placeholder: 'Write a message' }), fx('hint-error', { placeholder: 'Write a message', error: true, required: true })] });
    expect(await paints(page, 'error')).toEqual(await paints(page, 'single-line'));
    expect(await paints(page, 'hint-error')).toEqual(await paints(page, 'hint'));
    for (const part of await drawn(page, 'error')) expect(part).toEqual(NOTHING);
    expect(await native(page, 'error').getAttribute('aria-invalid')).toBe('true');
    // A required input left empty is invalid for its form and still not in error: validating is not its to do.
    await focus(page, 'hint');
    await set(page, 'hint', { required: true });
    await host(page, 'hint').evaluate((el) => (el as HTMLElement).blur());
    expect(await host(page, 'hint').evaluate((el) => [(el as unknown as { error: boolean }).error, el.hasAttribute('error')])).toEqual([false, false]);
  });

  test('ETI-15: disabled — out of the focus order, not editable, emitting nothing, exposed as disabled, left out of its form, its value and its placeholder drawn from the disabled tokens', async ({ page }) => {
    await mountFixtures(page, spec);
    const [text, hint] = [await color(page, 'standard-disabled-input-color'), await color(page, 'standard-disabled-placeholder-color')];
    expect((await paints(page, 'disabled')).color).toBe(text);
    expect((await paints(page, 'disabled-placeholder')).placeholder).toBe(hint);
    for (const part of await drawn(page, 'disabled')) expect(part).toEqual(NOTHING);
    await record(page, 'disabled');
    await host(page, 'disabled').evaluate((el) => (el as HTMLElement).focus());
    // In view before it is measured: the fixture stands below the window's bottom edge (y 766 in a window 720 high), and
    // a press at its place in the window would reach nothing and show nothing. The point is the element's.
    await host(page, 'disabled').scrollIntoViewIfNeeded();
    const b = await box(host(page, 'disabled'));
    expect(await host(page, 'disabled').evaluate((el, [x, y]) => el.contains(document.elementFromPoint(x!, y!)), [b.x + 10, b.y + 10])).toBe(true);
    await page.mouse.click(b.x + 10, b.y + 10);
    await page.keyboard.type('x');
    await page.keyboard.press('Control+Enter');
    expect(await events(page)).toEqual([]);
    expect(await read(page, 'disabled')).toMatchObject({ value: 'Sent from the meeting room.\nBack at two.', focused: false });
    expect(await native(page, 'disabled').evaluate((el) => (el as HTMLTextAreaElement).disabled)).toBe(true);
    // Tab passes it by.
    await focus(page, 'multiline-long-unbroken');
    await tab(page);
    expect(await host(page, 'disabled').evaluate((el) => el.matches(':focus-within'))).toBe(false);
    expect(await host(page, 'disabled-placeholder').evaluate((el) => el.matches(':focus-within'))).toBe(false);
    // Left out of its form.
    const sent = await page.evaluate((tag) => {
      const form = document.createElement('form');
      form.innerHTML = `<${tag} name="a" label="A" value="1" disabled></${tag}><${tag} name="b" label="B" value="2"></${tag}>`;
      document.body.append(form);
      return new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString();
    }, TAG);
    expect(sent).toBe('b=2');
  });

  test('ETI-16: read-only — focusable, selectable and copyable, not editable, emitting no input, change or action, exposed as read-only, submitted with its form, and drawn as an enabled input', async ({ page }) => {
    await mountFixtures(page, spec);
    expect(await paints(page, 'read-only')).toEqual(await paints(page, 'single-line'));
    await record(page, 'read-only');
    await tabTo(page, host(page, 'read-only'));
    await page.keyboard.type('x');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter');
    await host(page, 'read-only').evaluate((el) => (el as El & { select(): void }).select());
    expect(await read(page, 'read-only')).toMatchObject({ value: 'See you at ten.', selection: [0, 15], focused: true });
    await host(page, 'read-only').evaluate((el) => (el as HTMLElement).blur());
    expect((await events(page)).filter((e) => !e.startsWith('focus'))).toEqual([]);
    expect(await native(page, 'read-only').evaluate((el) => (el as HTMLInputElement).readOnly)).toBe(true);
    const sent = await page.evaluate((tag) => {
      const form = document.createElement('form');
      form.innerHTML = `<${tag} name="a" label="A" value="1" readonly required></${tag}>`;
      document.body.append(form);
      return [new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString(), form.checkValidity()];
    }, TAG);
    expect(sent).toEqual(['a=1', true]);
  });

  test('ETI-17: each type gives the native element its keyboard and its semantics, in a single-line and in a multi-line input — text, search, email and url without capitalization or correction, tel — and validates nothing; a type it does not know behaves as text and is reported', async ({ page }) => {
    const seen = warnings(page);
    const types = ['text', 'search', 'email', 'url', 'tel', 'date'];
    await mount(page, types.flatMap((type) => [fx(`one-${type}`, { type, value: 'not an address' }), fx(`many-${type}`, { type, multiline: true })]));
    const given = (id: string) => native(page, id).evaluate((el) => [el.localName, el.getAttribute('type'), el.getAttribute('inputmode'), el.getAttribute('autocapitalize'), el.getAttribute('autocorrect'), el.getAttribute('spellcheck')]);
    expect(await given('one-text')).toEqual(['input', 'text', null, null, null, null]);
    expect(await given('one-search')).toEqual(['input', 'search', null, null, null, null]);
    expect(await given('one-email')).toEqual(['input', 'text', 'email', 'none', 'off', 'false']);
    expect(await given('one-url')).toEqual(['input', 'text', 'url', 'none', 'off', 'false']);
    expect(await given('one-tel')).toEqual(['input', 'tel', null, null, null, null]);
    expect(await given('one-date')).toEqual(['input', 'text', null, null, null, null]);
    expect(await given('many-text')).toEqual(['textarea', null, null, null, null, null]);
    expect(await given('many-search')).toEqual(['textarea', null, 'search', null, null, null]);
    expect(await given('many-email')).toEqual(['textarea', null, 'email', 'none', 'off', 'false']);
    expect(await given('many-url')).toEqual(['textarea', null, 'url', 'none', 'off', 'false']);
    expect(await given('many-tel')).toEqual(['textarea', null, 'tel', null, null, null]);
    // Nothing is validated against the type.
    expect(await host(page, 'one-email').evaluate((el) => (el as unknown as { checkValidity(): boolean }).checkValidity())).toBe(true);
    expect(seen.filter((text) => text.includes('ETI-17'))).toHaveLength(2);
    // The attribute of the default is not written.
    expect(await host(page, 'one-text').evaluate((el) => el.outerHTML.includes('type='))).toBe(true);
    expect(await page.evaluate((tag) => document.createElement(tag).hasAttribute('type'), TAG)).toBe(false);
  });

  test('ETI-18: autocomplete is passed to the native element as its autofill hint, none where it is empty, and a value the browser fills in emits input with the filled value', async ({ page }) => {
    await mount(page, [fx('mail', { type: 'email', autocomplete: 'email' }), fx('none')]);
    expect(await native(page, 'mail').getAttribute('autocomplete')).toBe('email');
    expect(await native(page, 'none').getAttribute('autocomplete')).toBeNull();
    await record(page, 'mail');
    // An autofill: the element's text replaced, then `input`, with no key and no `beforeinput`.
    await native(page, 'mail').evaluate((input) => {
      (input as HTMLInputElement).value = 'ada@example.com';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText' }));
    });
    expect(await events(page)).toEqual(['input:ada@example.com']);
    expect((await read(page, 'mail')).value).toBe('ada@example.com');
  });

  test('ETI-19: in a form it submits its value under its name — nothing without a name or while disabled — resets to the value it was first given, is restored, follows a disabled fieldset, and reports a missing value while required and empty; inside the shadow root of a holder it has no form and does none of this', async ({ page }) => {
    await mount(page, []);
    const result = await page.evaluate(async (tag) => {
      const data = (form: HTMLFormElement) => new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString();
      const form = document.createElement('form');
      form.innerHTML = `<${tag} name="message" label="Message" value="first" multiline></${tag}><${tag} label="Nameless" value="x"></${tag}><fieldset><${tag} name="inside" label="Inside" value="in"></${tag}></fieldset><${tag} name="need" label="Needed" required></${tag}>`;
      document.body.append(form);
      type E = HTMLElement & { value: string; form: HTMLFormElement | null; updateComplete: Promise<unknown>; validity: ValidityState; validationMessage: string; checkValidity(): boolean; formStateRestoreCallback(state: string): void };
      const [message, , , need] = [...form.querySelectorAll(tag)] as E[];
      const all = () => Promise.all(([...form.querySelectorAll(tag)] as E[]).map((el) => el.updateComplete));
      await all();
      const out: Record<string, unknown> = { first: data(form), form: message!.form === form };
      message!.value = 'second\nline';
      await all();
      out.changed = data(form);
      form.reset();
      await all();
      out.reset = [data(form), message!.value];
      message!.formStateRestoreCallback('restored');
      await all();
      out.restored = message!.value;
      form.querySelector('fieldset')!.disabled = true;
      await all();
      out.fieldset = [data(form), form.querySelector<HTMLElement>('fieldset ' + tag)!.shadowRoot!.querySelector<HTMLInputElement>('.input')!.disabled];
      out.missing = [need!.validity.valueMissing, need!.checkValidity(), need!.validationMessage !== '', form.checkValidity()];
      need!.value = 'now';
      await all();
      out.given = [need!.validity.valid, form.checkValidity()];
      // A holder: a form-associated element of the test's own with the input in its shadow root.
      class Holder extends HTMLElement {
        static formAssociated = true;
        constructor() {
          super();
          this.attachShadow({ mode: 'open' }).innerHTML = `<${tag} name="held" label="Held" value="kept" required></${tag}>`;
        }
      }
      customElements.define('test-holder', Holder);
      const around = document.createElement('form');
      around.innerHTML = '<test-holder></test-holder>';
      document.body.append(around);
      const held = around.querySelector('test-holder')!.shadowRoot!.querySelector(tag) as E;
      await held.updateComplete;
      out.held = [data(around), held.form];
      return out;
    }, TAG);
    expect(result).toEqual({
      first: 'message=first&inside=in&need=',
      form: true,
      changed: 'message=second%0Aline&inside=in&need=',
      reset: ['message=first&inside=in&need=', 'first'],
      restored: 'restored',
      fieldset: ['message=restored&need=', true],
      missing: [true, false, true, false],
      given: [true, true],
      held: ['', null],
    });
  });

  test('ETI-20: laid out by where it is used — in a right-to-left stage a right-to-left paragraph and a left-to-right one each take their own direction, an empty input and its placeholder stand at the start edge, an address is laid out left to right and aligned to the start edge — and a direction that changes while it is shown keeps the value, the selection and the focus', async ({ page, browserName }) => {
    await mountFixtures(page, spec);
    const laid = (id: string) =>
      native(page, id).evaluate((el) => {
        const s = getComputedStyle(el);
        return { dir: el.getAttribute('dir'), direction: s.direction, align: s.textAlign, bidi: s.unicodeBidi, hint: getComputedStyle(el, '::placeholder').textAlign, hintBidi: getComputedStyle(el, '::placeholder').unicodeBidi };
      });
    // Two paragraphs, each by its own first strong character.
    expect(await laid('rtl')).toMatchObject({ dir: 'auto', bidi: 'plaintext' });
    // Empty: the layout's direction, so the caret and the placeholder are at the right.
    // (Firefox does not say what a placeholder computes for unicode-bidi; its alignment it does.)
    expect(await laid('rtl-placeholder')).toMatchObject({ dir: null, direction: 'rtl', hint: 'right', ...(browserName === 'firefox' ? {} : { hintBidi: 'plaintext' }) });
    expect(await laid('placeholder')).toMatchObject({ dir: null, direction: 'ltr', hint: 'left' });
    // An address: left to right, at the right.
    expect(await laid('rtl-email')).toMatchObject({ dir: 'ltr', direction: 'ltr', align: 'right' });
    // A single-line value of its own direction.
    expect(await laid('single-line')).toMatchObject({ dir: 'auto' });
    // It has no direction prop: the stage's `dir` is all there is.
    expect(await host(page, 'rtl').evaluate((el) => [el.hasAttribute('dir'), getComputedStyle(el).direction])).toEqual([false, 'rtl']);
    // The direction changes while it is shown.
    await focus(page, 'multiline-grown');
    await native(page, 'multiline-grown').evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(3, 9));
    await stage(page, 'multiline-grown').evaluate((el) => el.setAttribute('dir', 'rtl'));
    expect(await read(page, 'multiline-grown')).toMatchObject({ value: 'Thanks for the draft.\nTwo things before it goes out:\nthe dates in section 3,\nand who signs it.', selection: [3, 9], focused: true });
    expect(await host(page, 'multiline-grown').evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
  });

  test('ETI-21: every key reaches what holds the input before the input acts on it, and one the holder cancelled is not acted on; the holder reads and sets the selection and replaces the selected text, which emits nothing; Tab and Shift+Tab move focus out and insert no character; Escape does nothing', async ({ page }) => {
    await mount(page, [fx('before', { value: 'x' }), fx('act', { multiline: true, enterKey: 'action', value: 'Hello world' }), fx('after', { value: 'y' })]);
    await record(page, 'act');
    // A holder's listener on the element itself, added after the element was made: it still sees the key first.
    await host(page, 'act').evaluate((el) => {
      const order: string[] = [];
      (window as unknown as { __order: string[]; __take: boolean }).__order = order;
      el.addEventListener('keydown', (event) => {
        order.push(`holder:${(event as KeyboardEvent).key}`);
        if ((window as unknown as { __take: boolean }).__take) event.preventDefault();
      });
      el.addEventListener('action', () => order.push('action'));
    });
    await focus(page, 'act');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as unknown as { __order: string[] }).__order.splice(0))).toEqual(['holder:Enter', 'action']);
    // Cancelled by the holder: no action, and nothing of the input's own.
    await page.evaluate(() => ((window as unknown as { __take: boolean }).__take = true));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+Enter');
    expect(await page.evaluate(() => (window as unknown as { __order: string[] }).__order.splice(0))).toEqual(['holder:Enter', 'holder:Control', 'holder:Enter']);
    expect((await read(page, 'act')).value).toBe('Hello world');
    await page.evaluate(() => ((window as unknown as { __take: boolean }).__take = false));
    await events(page);
    // The selection, read and set; the selected text replaced.
    const selection = await host(page, 'act').evaluate(async (el) => {
      const input = el as El;
      input.setSelectionRange(6, 11);
      const read = [input.selectionStart, input.selectionEnd];
      input.setRangeText('there');
      await input.updateComplete;
      input.selectionStart = 0;
      input.selectionEnd = 5;
      return { read, value: input.value, now: [input.selectionStart, input.selectionEnd] };
    });
    expect(selection).toEqual({ read: [6, 11], value: 'Hello there', now: [0, 5] });
    expect(await events(page)).toEqual([]);
    // Escape: nothing.
    await page.keyboard.press('Escape');
    expect(await read(page, 'act')).toMatchObject({ value: 'Hello there', focused: true });
    expect(await events(page)).toEqual([]);
    // Tab moves on, Shift+Tab back, and neither inserts a character.
    await tab(page);
    expect(await host(page, 'after').evaluate((el) => el.matches(':focus-within'))).toBe(true);
    await tab(page, { back: true });
    expect(await host(page, 'act').evaluate((el) => el.matches(':focus-within'))).toBe(true);
    await tab(page, { back: true });
    expect(await host(page, 'before').evaluate((el) => el.matches(':focus-within'))).toBe(true);
    expect((await read(page, 'act')).value).toBe('Hello there');
  });

  test('ETI-22: the placeholder is shown while the value is empty, in the text style and placeholder.color, where the first character will be typed, and goes with the first character; a multi-line input is as tall as a placeholder that wraps, within minRows and maxRows, and a single-line one cuts it; it is never the accessible name', async ({ page }) => {
    const LONG = 'Write what you want every member of the planning group to read before the meeting on Thursday';
    await mountFixtures(page, spec, { fixtures: [...spec.fixtures, fx('long', { multiline: true, placeholder: LONG }), fx('long-capped', { multiline: true, maxRows: 2, placeholder: LONG }), fx('long-one', { placeholder: LONG })] });
    const one = await line(page, 'placeholder');
    expect((await paints(page, 'placeholder')).placeholder).toBe(await color(page, 'standard-placeholder-color'));
    expect(await native(page, 'placeholder').evaluate((el) => [(el as HTMLInputElement).placeholder, el.matches(':placeholder-shown')])).toEqual(['Write a message', true]);
    // Wrapped, and never cut.
    const tall = await heightOf(page, 'long');
    expect(tall / one).toBeGreaterThanOrEqual(3);
    expect((await read(page, 'long')).rows).toBe(Math.round(tall / one));
    near(await heightOf(page, 'long-capped'), 2 * one, 'within maxRows');
    near(await heightOf(page, 'long-one'), one, 'one line, cut');
    near(await heightOf(page, 'multiline-min-rows'), 3 * one, 'minRows');
    near(await heightOf(page, 'held-capsule'), one, 'a short hint');
    // The first character: the placeholder goes, and the height is the text's, at once.
    await focus(page, 'long');
    const typed = await host(page, 'long').evaluate((el) => {
      document.execCommand('insertText', false, 'H');
      return { moving: el.shadowRoot!.querySelector('.box')!.getAnimations().length, shown: el.shadowRoot!.querySelector('.input')!.matches(':placeholder-shown') };
    });
    expect(typed.shown).toBe(false);
    await page.waitForFunction((h) => Math.abs(document.querySelector('[data-fixture="long"] tanrei-embedded-text-input')!.getBoundingClientRect().height - h) < 1, one);
    // The name is the label.
    await expect(host(page, 'placeholder').getByRole('textbox', { name: 'Message', exact: true })).toHaveCount(1);
  });

  test('ETI-23: with a person’s own forced colors the value is the platform’s text color, the placeholder and a disabled value its color for text that is not available, the selection its highlight, the caret the platform’s — and still nothing else is drawn', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await mountFixtures(page, spec);
    const system = (name: string) =>
      page.evaluate((keyword) => {
        const probe = document.createElement('div');
        probe.style.cssText = `forced-color-adjust: none; color: ${keyword}`;
        document.body.append(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      }, name);
    const [text, gray, highlight, highlightText] = [await system('CanvasText'), await system('GrayText'), await system('Highlight'), await system('HighlightText')];
    const plain = await paints(page, 'single-line');
    expect(plain.color).toBe(text);
    expect([plain.selection, plain.selected]).toEqual([highlight, highlightText]);
    expect((await paints(page, 'placeholder')).placeholder).toBe(gray);
    expect((await paints(page, 'disabled')).color).toBe(gray);
    expect((await paints(page, 'disabled-placeholder')).placeholder).toBe(gray);
    expect(await native(page, 'single-line').evaluate((el) => el.style.caretColor)).toBe('');
    // (A fill that is taken away is written as the platform's own color at no opacity.)
    for (const id of ['single-line', 'disabled', 'multiline-grown']) for (const part of await drawn(page, id)) expect({ ...part, background: /, 0\)$/.test(part.background) ? NOTHING.background : part.background }, id).toEqual(NOTHING);
    // The holder's edge in those colors is the holder's (H7).
    await focus(page, 'held-capsule');
    expect(await stage(page, 'held-capsule').locator('.capsule').evaluate((el) => getComputedStyle(el).outlineColor)).toBe(highlight);
    expect(await stage(page, 'held-capsule-grown').locator('.capsule').evaluate((el) => getComputedStyle(el).outlineColor)).toBe(text);
  });

  test('ETI-24: at twice the text size in a holder 320 wide a multi-line input shows every character, wrapped, with a line the enlarged line height, no sideways scrolling and nothing cut, minRows and maxRows still counting lines; a single-line input keeps its one line and scrolls inside itself; the height changes at once', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await mountFixtures(page, spec, { reducedMotion: false, fixtures: spec.fixtures.filter((f) => ['single-line-long', 'multiline-grown', 'multiline-at-maximum', 'multiline-long-unbroken', 'multiline-min-rows', 'held-capsule-grown'].includes(f.id)) });
    await page.addStyleTag({ content: '.stage { box-sizing: border-box !important; inline-size: 320px !important; }' });
    const before = await line(page, 'multiline-grown');
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await page.waitForFunction((l) => Number.parseFloat(getComputedStyle(document.querySelector('[data-fixture="multiline-grown"] tanrei-embedded-text-input')!.shadowRoot!.querySelector('.input')!).lineHeight) > l * 1.9, before);
    const one = await line(page, 'multiline-grown');
    near(one, 2 * before, 'the enlarged line');
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-fixture="multiline-grown"] tanrei-embedded-text-input')!;
      const input = el.shadowRoot!.querySelector('.input')!;
      return input.scrollHeight <= input.clientHeight + 1;
    });
    expect(await host(page, 'multiline-grown').evaluate((el) => el.shadowRoot!.querySelector('.box')!.getAnimations().length)).toBe(0);
    for (const id of ['multiline-grown', 'multiline-long-unbroken']) {
      const fit = await native(page, id).evaluate((el) => ({ scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight, height: el.getBoundingClientRect().height }));
      expect(fit.scrollW, id).toBeLessThanOrEqual(fit.clientW);
      expect(fit.scrollH, id).toBeLessThanOrEqual(fit.clientH + 1);
      expect(Math.abs(fit.height / one - Math.round(fit.height / one)), id).toBeLessThan(0.05);
    }
    expect((await heightOf(page, 'multiline-grown')) / one).toBeGreaterThan(4);
    // In the holder its six lines are the most: the rest scrolls inside, up and down alone.
    near(await heightOf(page, 'held-capsule-grown'), 6 * one, 'maxRows in the holder');
    expect(await native(page, 'held-capsule-grown').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    near(await heightOf(page, 'multiline-at-maximum'), 3 * one, 'maxRows counts enlarged lines');
    near(await heightOf(page, 'multiline-min-rows'), 3 * one, 'minRows counts enlarged lines');
    near(await heightOf(page, 'single-line-long'), one, 'one line');
    expect(await native(page, 'single-line-long').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('ETI-25: a prop that changes while it is shown is drawn at once and keeps the value, the selection and the focus; multiline keeps the value as it is — its line breaks shown on one line as the platform’s single-line element shows them, and there again when multiline returns — and changes the height at once', async ({ page }) => {
    await mount(page, [fx('a', { multiline: true, value: 'One\nTwo\nThree' })], { reducedMotion: false });
    const one = await line(page, 'a');
    await focus(page, 'a');
    await native(page, 'a').evaluate((el) => (el as HTMLTextAreaElement).setSelectionRange(2, 6));
    await set(page, 'a', { placeholder: 'Hint', description: 'About it', error: true, required: true, enterKey: 'action', maxRows: 8, label: 'Renamed', autocomplete: 'off' });
    expect(await read(page, 'a')).toMatchObject({ value: 'One\nTwo\nThree', selection: [2, 6], focused: true });
    expect(await native(page, 'a').getAttribute('aria-label')).toBe('Renamed');
    // To one line: the value is kept whole, the element shows it without its breaks, focus and the selection stay.
    const single = await host(page, 'a').evaluate(async (el) => {
      Object.assign(el, { multiline: false });
      await (el as El).updateComplete;
      const input = el.shadowRoot!.querySelector<HTMLInputElement>('.input')!;
      return { tag: input.localName, value: (el as El).value, shown: input.value, focused: el.shadowRoot!.activeElement === input, selection: [input.selectionStart, input.selectionEnd], moving: el.shadowRoot!.querySelector('.box')!.getAnimations().length, height: el.getBoundingClientRect().height, rows: (el as El).rows };
    });
    expect(single).toMatchObject({ tag: 'input', value: 'One\nTwo\nThree', shown: 'OneTwoThree', focused: true, selection: [2, 6], moving: 0, rows: 1 });
    near(single.height, one, 'one line at once');
    // And back: the line breaks are there again.
    const again = await host(page, 'a').evaluate(async (el) => {
      Object.assign(el, { multiline: true });
      await (el as El).updateComplete;
      const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>('.input')!;
      return { tag: input.localName, value: (el as El).value, shown: input.value, focused: el.shadowRoot!.activeElement === input, moving: el.shadowRoot!.querySelector('.box')!.getAnimations().length, height: el.getBoundingClientRect().height };
    });
    expect(again).toMatchObject({ tag: 'textarea', value: 'One\nTwo\nThree', shown: 'One\nTwo\nThree', focused: true, moving: 0 });
    near(again.height, 3 * one, 'three lines at once');
  });

  test('ETI-26: it has no words of its own and reads none of the product’s — nothing stands in for an empty label, description or placeholder, whatever words the product has set, and it reports no missing word', async ({ page }) => {
    await mount(page, [{ id: 'bare', props: {} }]);
    await setWords(page, { sendLabel: 'Send', requiredText: 'Required', emptyText: 'Nothing here', clearLabel: 'Clear' });
    await set(page, 'bare', { required: true });
    expect(await native(page, 'bare').evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-description'), (el as HTMLInputElement).placeholder])).toEqual([null, null, '']);
    expect(await host(page, 'bare').evaluate((el) => el.shadowRoot!.textContent!.trim())).toBe('');
    expect(await missingWords(page)).toEqual([]);
  });

  test('ETI-27: before the element is defined the textarea the product wrote as its child is the control — named, typed in and submitted under its name; once it is defined its text is the first value where value was not given, the child is hidden and disabled, and the form submits one entry of that name', async ({ page }) => {
    await page.setContent(`<!doctype html><html><head><style>${tokensCss()}</style></head><body>
      <form><tanrei-embedded-text-input id="a" name="message" label="Message" multiline><textarea name="message" aria-label="Message">Written without script</textarea></tanrei-embedded-text-input>
      <tanrei-embedded-text-input id="b" name="title" label="Title" value="Given"><input name="title" aria-label="Title" value="The child's" /></tanrei-embedded-text-input></form></body></html>`);
    const data = () => page.evaluate(() => new URLSearchParams(new FormData(document.querySelector('form')!) as unknown as Record<string, string>).toString());
    expect(await page.evaluate((tag) => !!customElements.get(tag), TAG)).toBe(false);
    await page.locator('textarea').click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Meta+ArrowDown');
    await page.keyboard.type('!');
    expect(await data()).toBe('message=Written+without+script%21&title=The+child%27s');
    await expect(page.getByRole('textbox', { name: 'Message' })).toHaveCount(1);
    await page.addScriptTag({ content: bundle(), type: 'module' });
    await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
    await page.locator('#a').evaluate((el) => (el as El).updateComplete);
    await page.locator('#b').evaluate((el) => (el as El).updateComplete);
    expect(await data()).toBe('message=Written+without+script%21&title=Given');
    expect(await page.locator('#a').evaluate((el) => [(el as El).value, (el.firstElementChild as HTMLTextAreaElement).hidden, (el.firstElementChild as HTMLTextAreaElement).disabled, el.shadowRoot!.querySelector<HTMLTextAreaElement>('.input')!.value])).toEqual(['Written without script!', true, true, 'Written without script!']);
    expect(await page.locator('#b').evaluate((el) => [(el as El).value, (el.firstElementChild as HTMLInputElement).hidden, (el.firstElementChild as HTMLInputElement).disabled])).toEqual(['Given', true, true]);
    // One text box of each name is left for assistive technology.
    await expect(page.getByRole('textbox', { name: 'Message' })).toHaveCount(1);
    // A reset returns to what it was first given: the attribute, where there is one.
    await page.evaluate(() => document.querySelector('form')!.reset());
    expect(await page.locator('#b').evaluate((el) => (el as El).value)).toBe('Given');
  });

  test('ETI-28: with nothing around it that marks a box it renders and works exactly as it does in one — the same height, the same events, the same exposure — and reports nothing about where it stands', async ({ page }) => {
    const seen = warnings(page);
    await mountFixtures(page, spec);
    const one = await line(page, 'multiline-grown');
    near(await heightOf(page, 'multiline-grown'), await heightOf(page, 'held-capsule-grown'), 'the same lines');
    near(await heightOf(page, 'multiline-grown'), 4 * one, 'four lines');
    for (const id of ['multiline-grown', 'held-capsule-grown']) {
      await record(page, id);
      await focus(page, id);
      await page.keyboard.press('Control+End');
      await page.keyboard.press('Meta+ArrowDown');
      await page.keyboard.type('!');
      await page.keyboard.press('Control+Enter');
      const heard = (await events(page)).filter((e) => !e.startsWith('rows'));
      expect(heard.map((e) => e.split(':')[0]), id).toEqual(['focusin', 'input', 'change', 'action']);
      expect(await native(page, id).getAttribute('aria-label'), id).toBe('Message');
    }
    expect(seen).toEqual([]);
  });
});

test.describe('accessibility', () => {
  test('no axe violations in light and dark, at rest and with the held input focused', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await mountFixtures(page, spec, { theme });
      const rest = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(rest.violations, theme).toEqual([]);
      await focus(page, 'held-capsule');
      const focused = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(focused.violations, `${theme}, focused`).toEqual([]);
    }
  });

  test('the keyboard model of the spec: one stop; typing, selection and the arrows edit as the platform’s element does; Enter by enterKey; Escape is left to what holds it', async ({ page }) => {
    await mount(page, [fx('a', { multiline: true, value: 'ab' }), fx('b', { value: 'cd' })]);
    await tabTo(page, host(page, 'a'));
    await tab(page);
    expect(await host(page, 'b').evaluate((el) => el.matches(':focus-within'))).toBe(true);
    await native(page, 'b').evaluate((el) => (el as HTMLInputElement).setSelectionRange(0, 0));
    await page.keyboard.press('Shift+ArrowRight');
    expect((await read(page, 'b')).selection).toEqual([0, 1]);
    await page.keyboard.press('Delete');
    expect((await read(page, 'b')).value).toBe('d');
    await page.keyboard.press('Escape');
    expect(await read(page, 'b')).toMatchObject({ value: 'd', focused: true });
  });
});

test.describe('fixtures', () => {
  test('every fixture of the spec is mounted, the held ones inside the sample holder and every other bare on the stage', async ({ page }) => {
    await mountFixtures(page, spec);
    for (const f of spec.fixtures) {
      await expect(host(page, f.id), f.id).toHaveCount(1);
      expect(await host(page, f.id).evaluate((el) => !!el.closest('.capsule')), f.id).toBe(f.id.startsWith('held-'));
      expect((await read(page, f.id)).value, f.id).toBe(String(f.props.value ?? ''));
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec);
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
