// <tanrei-select-field>, driven by specs/select-field.spec.json: a composed element — a Field around one
// select. What a composed element is, is held once for every such element by src/primitives/composed.test.ts (W13-1 to
// W13-8: declarations, passing, parts, events and the value, the form, focus, the twins — each of the fifty-seven
// fixtures the same pixels and the same control as the Field's fixture `select-<id>` — and reports). The members' own
// sentences are the members' tests (select.test.ts, SEL-1 to SEL-64; field.test.ts, FLD-1 to FLD-28). This file holds
// what the select field's own sentences add, SEF-1 to SEF-5, with the tests of
// the mechanism's (the options read through a slot: O1 to O9), and repeats no test of a member.
// SEF-6: the product's ARIA on the host is tested with every other control's, in every engine, in
// src/primitives/delegated-aria.test.ts.
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { type FixtureItem, loadSpec, missingWords, mountFixtures, resolveColor, resolveToken, setWords, tab, inputBoxSetApart } from '../../../test/harness.js';

const spec = loadSpec('select-field');
type P = Page;
const TAG = 'tanrei-select-field';
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
const one = (page: P, id: string) => page.locator(`#${id}`);
/** The members, in an element's shadow root. */
const field = (element: Locator) => element.locator('tanrei-field');
const select = (element: Locator) => element.locator('tanrei-select');
/** The select's trigger: the element that carries its semantics and takes focus. */
const trigger = (element: Locator) => select(element).locator('.field > .container');
const rows = (element: Locator) => select(element).locator('.scroll .row');
const bounds = async (locator: Locator) => (await locator.boundingBox())!;
const css = (locator: Locator, property: string) => locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
const read = (file: string) => fs.readFileSync(new URL(`../../../dist/${file}`, import.meta.url), 'utf8');
function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const OPTIONS = '<tanrei-option value="ca">Canada</tanrei-option><tanrei-option value="fr">France</tanrei-option><tanrei-option value="jp">Japan</tanrei-option>';
/** A page of the product's own markup, with the default system (or a preset) and every element; every element has updated. */
async function mountHtml(page: P, body: string, system?: string) {
  await page.setContent(
    `<!doctype html><html lang="en" data-tanrei-theme="light"${system ? ` data-tanrei-system="${system}"` : ''}><head><meta charset="utf-8" /><style>${read('tokens.css')}${system ? read(`systems/${system}.css`) : ''} body { margin: 16px; }</style></head><body>${body}<script type="module">${read('tanrei.bundle.js')}</script></body></html>`,
  );
  await page.waitForFunction((tag) => !!customElements.get(tag), TAG);
  await settle(page);
}
const settle = (page: P) =>
  page.evaluate(async () => {
    const all = (root: Document | ShadowRoot | Element): Element[] => [...root.querySelectorAll('*')].flatMap((el) => [el, ...(el.shadowRoot ? all(el.shadowRoot) : [])]);
    for (let round = 0; round < 3; round++) await Promise.all(all(document).map((el) => (el as Element & { updateComplete?: Promise<unknown> }).updateComplete));
  });
/** The focused element at each level: the document's, then each shadow root's inside it. */
const focusPath = (page: P) =>
  page.evaluate(() => {
    const path: string[] = [];
    for (let at: Element | null = document.activeElement; at; at = at.shadowRoot?.activeElement ?? null) path.push(at.localName + (at.id ? `#${at.id}` : '') + (at.classList.length ? `.${at.classList[0]}` : ''));
    return path;
  });
const blurAll = (page: P) =>
  page.evaluate(() => {
    let active = document.activeElement as HTMLElement | null;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement as HTMLElement;
    active?.blur();
  });
const pressAt = async (target: Locator) => {
  const b = await bounds(target);
  await target.page().mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};
/** The list of the select inside `element` is shown: in the top layer, or in place. */
const shown = (element: Locator) => select(element).evaluate((el) => el.shadowRoot!.querySelector('.surface')!.matches(':popover-open, .inline'));
/** What the select inside `element` — or `element` itself, where it is a select — drew of its options, in order: each entry a row, or a group with its rows. Its list is opened for the reading and closed again. */
const drawn = (element: Locator) =>
  element.evaluate(async (el) => {
    const inner = (el.localName === 'tanrei-select' ? el : el.shadowRoot!.querySelector('tanrei-select')!) as HTMLElement & { open: boolean; updateComplete: Promise<unknown> };
    const was = inner.open;
    inner.open = true;
    for (let round = 0; round < 2; round++) await inner.updateComplete;
    const row = (r: Element) =>
      [r.querySelector('.option-label')?.textContent ?? '', r.querySelector('.option-supporting')?.textContent ?? '', r.querySelector('.option-icon')?.textContent ?? '', r.getAttribute('aria-disabled') === 'true' ? 'disabled' : '', r.getAttribute('lang') ?? '', r.querySelector('.said')?.getAttribute('dir') ?? '']
        .join('|')
        .replace(/\|+$/, '');
    const list = [...inner.shadowRoot!.querySelectorAll('.scroll > .row, .scroll > .group')].map((entry) =>
      entry.classList.contains('group') ? `[${entry.querySelector('.group-title')?.textContent ?? ''}: ${[...entry.querySelectorAll('.row')].map(row).join(', ')}]` : row(entry),
    );
    const value = inner.shadowRoot!.querySelector('.value')?.textContent ?? null;
    inner.open = was;
    for (let round = 0; round < 2; round++) await inner.updateComplete;
    return { list, value };
  });

test.describe('behavior', () => {
  test('SEF-1: it is a Field that frames one select, and nothing else — its shadow root holds the two members’ own elements, each prop is on the member it is from and the select’s own label, labelHidden, error and disabled are never set; the label-icon slot is the Field’s, the leading-icon slot and the default slot the select’s; it draws no part, has no token and writes no custom property', async ({ page }) => {
    await mountHtml(
      page,
      `<${TAG} id="plain" label="Country" label-hidden error disabled supporting-text="Help." error-text="No." required required-mark="asterisk" required-text="Required" optional-text="Optional" variant="outlined" size="large" value="jp" placeholder="Choose" readonly separation="gap">
         ${OPTIONS}<span slot="label-icon">public</span><span slot="leading-icon">flag</span>
       </${TAG}>`,
    );
    const built = await one(page, 'plain').evaluate((el) => {
      const root = el.shadowRoot!;
      // An element, or text that is not white space (the template's own markers are comments).
      const isDrawn = (node: Node) => node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim());
      const named = (node: Node) => ((node as Element).localName === 'slot' ? `slot ${(node as HTMLSlotElement).name || '(default)'} → ${(node as Element).slot || '(default)'}` : ((node as Element).localName ?? '#text'));
      const [frame] = root.children;
      const control = [...frame!.children].find((child) => child.localName === 'tanrei-select') as HTMLElement & Record<string, unknown>;
      const framing = frame as HTMLElement & Record<string, unknown>;
      return {
        root: [...root.childNodes].filter(isDrawn).map(named),
        inFrame: [...frame!.childNodes].filter(isDrawn).map(named),
        inSelect: [...control.childNodes].filter(isDrawn).map(named),
        parts: [frame!.getAttribute('part'), control.getAttribute('part')],
        field: Object.fromEntries(['label', 'labelHidden', 'supportingText', 'errorText', 'error', 'disabled', 'required', 'optional', 'requiredMark', 'requiredText', 'optionalText'].map((name) => [name, framing[name]])),
        select: Object.fromEntries(['variant', 'size', 'value', 'placeholder', 'readOnly', 'open', 'separation'].map((name) => [name, control[name]])),
        // The select's own four: as a select has them by default, whatever the element was given.
        own: Object.fromEntries(['label', 'labelHidden', 'error', 'disabled', 'name'].map((name) => [name, control[name]])),
        ownAttributes: ['label', 'label-hidden', 'error', 'disabled'].filter((name) => control.hasAttribute(name)),
        // The options stay the product's children: never moved, never copied.
        children: [...el.children].map((child) => child.localName + (child.slot ? `[${child.slot}]` : '')),
        copies: root.querySelectorAll('tanrei-option, tanrei-option-group').length,
        assigned: (control.querySelector('slot:not([name])') as HTMLSlotElement).assignedElements().map((child) => child.getAttribute('value')),
        inline: [...root.querySelectorAll<HTMLElement>('*')].flatMap((child) => [...child.style]).filter((name) => name.startsWith('--')),
        display: getComputedStyle(el).display,
      };
    });
    expect(built.root).toEqual(['tanrei-field']);
    expect(built.inFrame).toEqual(['slot label-icon → label-icon', 'tanrei-select']);
    expect(built.inSelect).toEqual(['slot (default) → (default)', 'slot leading-icon → leading-icon']);
    expect(built.parts).toEqual(['field', 'select']);
    expect(built.field).toEqual({ label: 'Country', labelHidden: true, supportingText: 'Help.', errorText: 'No.', error: true, disabled: true, required: true, optional: false, requiredMark: 'asterisk', requiredText: 'Required', optionalText: 'Optional' });
    expect(built.select).toEqual({ variant: 'outlined', size: 'large', value: 'jp', placeholder: 'Choose', readOnly: true, open: false, separation: 'gap' });
    expect(built.own).toEqual({ label: '', labelHidden: false, error: false, disabled: false, name: '' });
    expect(built.ownAttributes).toEqual([]);
    expect(built.children).toEqual(['tanrei-option', 'tanrei-option', 'tanrei-option', 'span[label-icon]', 'span[leading-icon]']);
    expect(built.copies).toBe(0);
    expect(built.assigned).toEqual(['ca', 'fr', 'jp']);
    expect(built.inline).toEqual([]);
    expect(built.display).toBe('block');
    // The default slot is always there — with no option too — and a named one only while the element has a child for it.
    await mountHtml(page, `<${TAG} id="empty" label="Country"></${TAG}>`);
    expect(await one(page, 'empty').evaluate((el) => [...el.shadowRoot!.querySelectorAll('slot')].map((slot) => slot.name || '(default)'))).toEqual(['(default)']);
  });

  test('SEF-1: it gives its select every option and option group the product gives it, in the order given, as that select’s own — read through the default slot exactly as a select reads its children, and read again for every change a select answers: an option added, removed or moved, its label by attribute or by text, its value, supporting text, glyph, disabled, lang and dir, a group’s label, an option added to or removed from a group', async ({ page }) => {
    const GIVEN = `<tanrei-option value="a">Alpha</tanrei-option><tanrei-option value="b" label="Beta">ignored</tanrei-option><tanrei-option-group label="More"><tanrei-option value="c" supporting-text="Third" leading-icon="star" disabled>Gamma</tanrei-option></tanrei-option-group>`;
    // One list of cases, run twice: the options as children of a select, and as children of a select field (O4).
    await mountHtml(page, `<tanrei-select id="direct" label="Letters" value="b">${GIVEN}</tanrei-select><${TAG} id="through" label="Letters" value="b">${GIVEN}</${TAG}>`);
    const both = async () => {
      await settle(page);
      const [direct, through] = [await drawn(one(page, 'direct')), await drawn(one(page, 'through'))];
      expect(through, 'through the slot, as by hand').toEqual(direct);
      return through;
    };
    const change = (act: (el: Element) => void) => page.evaluate(([source]) => ['direct', 'through'].forEach((id) => (0, eval)(source!)(document.getElementById(id)!)), [act.toString()]);
    expect(await both()).toEqual({ list: ['Alpha', 'Beta', '[More: Gamma|Third|star|disabled]'], value: 'Beta' });
    // Added, removed, moved.
    await change((el) => el.insertAdjacentHTML('beforeend', '<tanrei-option value="d">Delta</tanrei-option>'));
    expect((await both()).list).toEqual(['Alpha', 'Beta', '[More: Gamma|Third|star|disabled]', 'Delta']);
    await change((el) => el.querySelector('[value="a"]')!.remove());
    expect((await both()).list).toEqual(['Beta', '[More: Gamma|Third|star|disabled]', 'Delta']);
    await change((el) => el.prepend(el.querySelector('[value="d"]')!));
    expect((await both()).list).toEqual(['Delta', 'Beta', '[More: Gamma|Third|star|disabled]']);
    // The label, by attribute and by text.
    await change((el) => (el.querySelector('[value="b"]')!.setAttribute('label', 'Second'), (el.querySelector('[value="d"]')!.textContent = 'Fourth')));
    expect(await both()).toEqual({ list: ['Fourth', 'Second', '[More: Gamma|Third|star|disabled]'], value: 'Second' });
    // The value: the chosen one is found again, and nothing is emitted.
    await page.evaluate(() => ((window as unknown as { heard: string[] }).heard = [], ['direct', 'through'].forEach((id) => ['change', 'toggle'].forEach((name) => document.getElementById(id)!.addEventListener(name, () => (window as unknown as { heard: string[] }).heard.push(`${id} ${name}`))))));
    await change((el) => (el.querySelector('[value="d"]')!.setAttribute('value', 'b'), el.querySelector('[label="Second"]')!.setAttribute('value', 'x')));
    expect(await both()).toEqual({ list: ['Fourth', 'Second', '[More: Gamma|Third|star|disabled]'], value: 'Fourth' });
    // Supporting text, glyph, disabled, lang and dir.
    await change((el) => {
      const option = el.querySelector('[value="c"]')!;
      option.setAttribute('supporting-text', 'Third letter');
      option.setAttribute('leading-icon', 'home');
      option.removeAttribute('disabled');
      option.setAttribute('lang', 'el');
      option.setAttribute('dir', 'rtl');
    });
    expect((await both()).list).toEqual(['Fourth', 'Second', '[More: Gamma|Third letter|home||el|rtl]']);
    // A group's label; an option added to a group, and removed from it.
    await change((el) => (el.querySelector('tanrei-option-group')!.setAttribute('label', 'Others'), el.querySelector('tanrei-option-group')!.insertAdjacentHTML('beforeend', '<tanrei-option value="e">Epsilon</tanrei-option>')));
    expect((await both()).list).toEqual(['Fourth', 'Second', '[Others: Gamma|Third letter|home||el|rtl, Epsilon]']);
    await change((el) => el.querySelector('[value="c"]')!.remove());
    expect((await both()).list).toEqual(['Fourth', 'Second', '[Others: Epsilon]']);
    // Every child replaced at once, as a product does by hand (`replaceChildren()` on the element it holds).
    await change((el) => {
      const made = ['x', 'y'].map((value) => Object.assign(document.createElement('tanrei-option'), { value, textContent: value.toUpperCase() }));
      el.replaceChildren(...made);
    });
    expect(await both(), 'the value that named a removed option names none now, and is kept').toEqual({ list: ['X', 'Y'], value: null });
    await page.evaluate(() => ['direct', 'through'].forEach((id) => ((document.getElementById(id) as HTMLElement & { value: string }).value = 'y')));
    expect(await both()).toEqual({ list: ['X', 'Y'], value: 'Y' });
    expect(await page.evaluate(() => (window as unknown as { heard: string[] }).heard), 'no change and no toggle for what the product did').toEqual([]);
  });

  test('SEF-1: options reach the select through two slots — a product’s own element that passes its children to a select field, or to a bare select — in order; a value set before the options are there shows nothing chosen, then the option, with no change; an option’s own lang and dir, or its group’s, are the row’s, and nothing above the options is read for them', async ({ page }) => {
    await mountHtml(
      page,
      `<div id="deep" lang="fr"><tanrei-option value="a">Alpha</tanrei-option><tanrei-option-group label="More"><tanrei-option value="b">Beta</tanrei-option></tanrei-option-group></div>
       <div id="door"><tanrei-option value="a">Alpha</tanrei-option><tanrei-option value="b">Beta</tanrei-option></div>
       <${TAG} id="late" label="Late" value="jp" placeholder="Choose"></${TAG}>
       <div lang="de" dir="rtl"><${TAG} id="said" label="Languages" value="x" lang="it"><tanrei-option value="x">Plain</tanrei-option><tanrei-option value="el" lang="el">Ελληνικά</tanrei-option><tanrei-option-group label="Right to left" dir="rtl" lang="ar"><tanrei-option value="ar">العربية</tanrei-option></tanrei-option-group></${TAG}></div>
       <script>
         document.getElementById('deep').attachShadow({ mode: 'open' }).innerHTML = '<${TAG} label="Deep" value="b"><slot></slot></${TAG}>';
         document.getElementById('door').attachShadow({ mode: 'open' }).innerHTML = '<tanrei-select label="Door" value="b"><slot></slot></tanrei-select>';
       </script>`,
    );
    // Two deep: the product's element → the select field → the select.
    const deep = page.locator('#deep').locator(TAG);
    expect(await drawn(deep)).toEqual({ list: ['Alpha', '[More: Beta]'], value: 'Beta' });
    await page.locator('#deep').evaluate((el) => (el.insertAdjacentHTML('afterbegin', '<tanrei-option value="z">Zeta</tanrei-option>'), (el.querySelector('[value="b"]')!.textContent = 'Second')));
    await settle(page);
    expect(await drawn(deep)).toEqual({ list: ['Zeta', 'Alpha', '[More: Second]'], value: 'Second' });
    // The same door for a product's own element around a bare select (O7).
    expect(await drawn(page.locator('#door').locator('tanrei-select'))).toEqual({ list: ['Alpha', 'Beta'], value: 'Beta' });
    await page.locator('#door').evaluate((el) => el.querySelector('[value="a"]')!.remove());
    await settle(page);
    expect((await drawn(page.locator('#door').locator('tanrei-select'))).list).toEqual(['Beta']);
    // The value before the options: nothing chosen, then the option, and no event.
    const late = one(page, 'late');
    await expect(select(late).locator('.placeholder')).toHaveText('Choose');
    expect(await late.evaluate((el) => (el as HTMLElement & { value: string }).value), 'the value is kept').toBe('jp');
    await late.evaluate((el) => {
      (window as unknown as { changes: number }).changes = 0;
      el.addEventListener('change', () => (window as unknown as { changes: number }).changes++);
      el.insertAdjacentHTML('beforeend', '<tanrei-option value="jp">Japan</tanrei-option>');
    });
    await expect(select(late).locator('.value')).toHaveText('Japan');
    expect(await page.evaluate(() => (window as unknown as { changes: number }).changes)).toBe(0);
    // Language and direction (O5): the option's own, or its group's, and nothing of the owner or of the page above it.
    expect((await drawn(one(page, 'said'))).list).toEqual(['Plain', 'Ελληνικά||||el', '[Right to left: العربية||||ar|rtl]']);
  });

  test('SEF-1: it emits its select’s events as its own, each once — one toggle for one opening, heard on the element with the element as its target and open already true, and by no ancestor: a details element around it hears none; change, with value already new; open is the select’s at every moment and is reflected as the select has it', async ({ page }) => {
    await mountHtml(page, `<details id="around" open><summary>Shipping</summary><${TAG} id="f" label="Country" supporting-text="Help.">${OPTIONS}</${TAG}></details>`);
    await page.evaluate(() => {
      const heard: string[] = [];
      (window as unknown as { heard: string[] }).heard = heard;
      const el = document.getElementById('f') as HTMLElement & { open: boolean; value: string };
      const note = (where: string) => (event: Event) => heard.push(`${where}: ${event.type} target=${event.target === el ? 'element' : (event.target as Element).localName} open=${el.open} value=${el.value} detail=${JSON.stringify((event as CustomEvent).detail ?? null)}`);
      for (const name of ['toggle', 'change']) {
        el.addEventListener(name, note('element'));
        document.getElementById('around')!.addEventListener(name, note('details'));
        document.addEventListener(name, note('document, capturing'), true);
      }
    });
    const heard = () => page.evaluate(() => (window as unknown as { heard: string[] }).heard.splice(0));
    const el = one(page, 'f');
    await el.evaluate((node: HTMLElement) => node.focus());
    await page.keyboard.press('Enter');
    await expect.poll(() => shown(el)).toBe(true);
    // Composed and not bubbling: on its way down, and on the element; never at the details element.
    expect(await heard()).toEqual(['document, capturing: toggle target=element open=true value= detail={"open":true}', 'element: toggle target=element open=true value= detail={"open":true}']);
    expect(await el.evaluate((node) => [(node as HTMLElement & { open: boolean }).open, node.hasAttribute('open')]), 'reflected as the select has it').toEqual([true, true]);
    expect(await page.locator('#around').evaluate((node) => (node as HTMLDetailsElement).open), 'the details element was not toggled').toBe(true);
    // A choice: change with the new value, then the close.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(await heard()).toEqual([
      'document, capturing: change target=element open=true value=fr detail=null',
      'element: change target=element open=true value=fr detail=null',
      'details: change target=element open=true value=fr detail=null',
      'document, capturing: toggle target=element open=false value=fr detail={"open":false,"reason":"select"}',
      'element: toggle target=element open=false value=fr detail={"open":false,"reason":"select"}',
    ]);
    await settle(page);
    expect(await el.evaluate((node) => [(node as HTMLElement & { open: boolean }).open, node.hasAttribute('open')])).toEqual([false, false]);
    // The product's open: shown and removed with no event; read back at once, and after the update as the select holds it.
    expect(await el.evaluate(async (node) => {
      const element = node as HTMLElement & { open: boolean; updateComplete: Promise<unknown> };
      element.open = true;
      const atOnce = element.open;
      await element.updateComplete;
      return [atOnce, element.open, element.shadowRoot!.querySelector<HTMLElement & { open: boolean }>('tanrei-select')!.open, element.hasAttribute('open')];
    })).toEqual([true, true, true, true]);
    await expect.poll(() => shown(el)).toBe(true);
    // The select takes it back with no event — it became read-only while open (SEL-36): the element's open is false at once.
    await el.evaluate(async (node) => {
      const element = node as HTMLElement & { readOnly: boolean; updateComplete: Promise<unknown> };
      element.readOnly = true;
      await element.updateComplete;
    });
    await settle(page);
    expect(await el.evaluate((node) => [(node as HTMLElement & { open: boolean }).open, node.hasAttribute('open')])).toEqual([false, false]);
    expect(await heard(), 'no toggle for what the product did').toEqual([]);
  });

  test('SEF-1: it is as wide as the place it stands in and its select fills it — a block with no width of its own, whichever option is chosen and in every look, where a bare select is as wide as its widest option; a width given to it sizes the box', async ({ page }) => {
    await mountHtml(
      page,
      `<div id="column" style="inline-size: 320px">
         <${TAG} id="stacked" label="Country" supporting-text="Help.">${OPTIONS}</${TAG}>
         <${TAG} id="outlined" variant="outlined" label="Country">${OPTIONS}</${TAG}>
         <${TAG} id="sized" label="Country" style="inline-size: 200px">${OPTIONS}</${TAG}>
         <tanrei-select id="bare" label="Country">${OPTIONS}</tanrei-select>
       </div>`,
    );
    for (const id of ['stacked', 'outlined']) {
      for (const value of ['', 'ca', 'jp']) {
        await one(page, id).evaluate((el, v) => ((el as HTMLElement & { value: string }).value = v), value);
        await settle(page);
        near((await bounds(one(page, id))).width, 320, `${id}: the element`);
        near((await bounds(trigger(one(page, id)))).width, 320, `${id}: its box, ${value || 'nothing'} chosen`);
      }
    }
    near((await bounds(trigger(one(page, 'sized')))).width, 200, 'a width given to the element sizes the box');
    expect((await bounds(one(page, 'bare'))).width, 'a bare select is as wide as its widest option').toBeLessThan(200);
    expect(await css(one(page, 'stacked'), 'display')).toBe('block');
  });

  test('SEF-1: what it shows is what the pair does — the Field’s label row and requirement mark above a stacked box; in a floating look no label row, the name floated in the box with the Field’s asterisk; the supporting row started where the value starts; the rows drawn focused while the list is open, whether or not it has focus', async ({ page }) => {
    await mountHtml(
      page,
      `<button id="elsewhere">Elsewhere</button>
       <${TAG} id="stacked" label="Language" value="ja" required required-text="Required" supporting-text="Applies to this device." style="inline-size: 280px"><tanrei-option value="en">English</tanrei-option><tanrei-option value="ja">日本語</tanrei-option><span slot="leading-icon">translate</span><span slot="label-icon">public</span></${TAG}>
       <${TAG} id="outlined" variant="outlined" label="Country" required required-text="Required" style="inline-size: 280px">${OPTIONS}</${TAG}>`,
      'm3-like',
    );
    const stacked = one(page, 'stacked');
    // (m3-like marks a required field with the asterisk: after the Field's label above, and after the floating one.)
    await expect(field(stacked).locator('.label-row > .label')).toHaveText('Language*');
    await expect(field(stacked).locator('.label-icon')).toHaveCount(1);
    await expect(select(stacked).locator('.floating')).toHaveCount(0);
    // The supporting row starts where the value starts: after the leading icon and its gap (FLD-26, SEL-63).
    near((await bounds(field(stacked).locator('.supporting-text'))).x, (await bounds(select(stacked).locator('.value'))).x, 'the help starts at the value');
    // A floating look: no row of the Field's, and the same name floats in the box, with the asterisk.
    const outlined = one(page, 'outlined');
    await expect(field(outlined).locator('.label-row')).toHaveCount(0);
    await expect(select(outlined).locator('.floating')).toHaveText('Country*');
    // Open by the product, with focus elsewhere: the Field's rows are drawn focused (FLD-13, SEL-20).
    const label = field(stacked).locator('.label-row > .label');
    const [rest, focused] = [await resolveColor(page, '--tanrei-comp-field-standard-label-color'), await resolveColor(page, '--tanrei-comp-field-standard-focused-label-color')];
    expect(focused).not.toBe(rest);
    await page.locator('#elsewhere').focus();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await css(label, 'color')).toBe(rest);
    await stacked.evaluate((el) => ((el as HTMLElement & { open: boolean }).open = true));
    await settle(page);
    await expect.poll(() => shown(stacked)).toBe(true);
    expect((await focusPath(page))[0]).toBe('button#elsewhere');
    await expect.poll(() => css(label, 'color')).toBe(focused);
    await stacked.evaluate((el) => ((el as HTMLElement & { open: boolean }).open = false));
    await settle(page);
    await expect.poll(() => css(label, 'color')).toBe(rest);
  });

  test('SEF-1: a child that is neither an option, a group of options nor a child for one of its two slots is not drawn, and is reported once for the element; an option and a glyph are not', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(page, `<${TAG} id="stray" label="Country">${OPTIONS}<p id="lost">A paragraph</p><span slot="trailing-icon">close</span></${TAG}><${TAG} id="fine" label="Country">${OPTIONS}<span slot="leading-icon">flag</span><span slot="label-icon">public</span></${TAG}>`);
    expect(await page.locator('#lost').evaluate((el) => el.getClientRects().length), 'not drawn').toBe(0);
    expect((await drawn(one(page, 'stray'))).list).toEqual(['Canada', 'France', 'Japan']);
    await one(page, 'stray').evaluate(async (el) => {
      (el as HTMLElement & { placeholder: string }).placeholder = 'Choose';
      await (el as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete;
    });
    const mine = seen.filter((w) => w.includes(`<${TAG}>`));
    expect(mine).toHaveLength(1);
    expect(mine[0]).toContain('SEF-1');
    expect(mine[0]).toContain('<p>');
  });

  test('SEF-1, SEL-65: a custom property of the box set on one select field reaches the select inside it — the property inherits through the composed element — and not its neighbour; set on an ancestor, both', async ({ page }) => {
    await mountHtml(page, '<tanrei-select-field label="Country"><tanrei-option value="jp" label="Japan"></tanrei-option></tanrei-select-field>');
    const { rest, one, both } = await inputBoxSetApart(page, TAG, 'tanrei-select');
    expect(rest[0], 'the box has corners to lose').toBeGreaterThan(0);
    expect(rest[1]).toBe(rest[0]);
    expect(one, 'the one it is set on, and not its neighbour').toEqual([0, rest[1]]);
    expect(both, 'both, from their parent').toEqual([0, 0]);
  });

  test('SEF-2: in a form it is the one control the form sees — its name, its select’s value, reset to the value it was first given and restored, submitted while read-only and left out while disabled or in a disabled fieldset; it reports what its select reports, a missing value while requirement is required and the value is empty, and the form’s report focuses its select’s container; its members take no part in the form', async ({ page }) => {
    await mountHtml(
      page,
      `<form id="form"><fieldset id="set"><${TAG} id="f" name="country" label="Country" value="fr" required required-text="Required"><tanrei-option value="">None</tanrei-option>${OPTIONS}</${TAG}></fieldset><button id="send">Send</button></form>
       <script>window.submitted = 0; document.getElementById('form').addEventListener('submit', (event) => { event.preventDefault(); window.submitted++; });</script>`,
    );
    const el = one(page, 'f');
    const data = () => page.evaluate(() => [...new FormData(document.querySelector<HTMLFormElement>('#form')!).entries()].map(([k, v]) => `${k}=${String(v)}`));
    const set = async (props: Record<string, unknown>) => (await el.evaluate((node, p) => void Object.assign(node, p), props), await settle(page));
    expect(await el.evaluate((node) => [(node.constructor as unknown as { formAssociated: boolean }).formAssociated, (node as unknown as HTMLSelectElement).form?.id, [...(node as unknown as HTMLSelectElement).form!.elements].map((control) => control.localName)])).toEqual([true, 'form', ['fieldset', TAG, 'button']]);
    expect(await el.evaluate((node) => [...node.shadowRoot!.querySelectorAll('tanrei-field, tanrei-select')].map((member) => [(member as HTMLElement & { form?: unknown }).form ?? null, (member as HTMLElement & { name?: string }).name || null]))).toEqual([[null, null], [null, null]]);
    expect(await data()).toEqual(['country=fr']);
    // The person chooses: the new value is submitted.
    await pressAt(trigger(el));
    await rows(el).filter({ hasText: 'Japan' }).click();
    await settle(page);
    expect(await data()).toEqual(['country=jp']);
    // Reset: to the value attribute; restore: what the platform hands back.
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.reset());
    await settle(page);
    expect([await el.evaluate((node) => (node as HTMLElement & { value: string }).value), await data()]).toEqual(['fr', ['country=fr']]);
    await el.evaluate((node) => (node as unknown as { formStateRestoreCallback(state: string, mode: string): void }).formStateRestoreCallback('ca', 'restore'));
    await settle(page);
    expect(await data()).toEqual(['country=ca']);
    // Read-only: submitted (SEL-47). Disabled, and in a disabled fieldset: left out (SEL-46).
    await set({ readOnly: true });
    expect(await data()).toEqual(['country=ca']);
    await set({ readOnly: false, disabled: true });
    expect(await data()).toEqual([]);
    await set({ disabled: false });
    await page.evaluate(() => (document.querySelector<HTMLFieldSetElement>('#set')!.disabled = true));
    await settle(page);
    expect([await data(), await trigger(el).getAttribute('aria-disabled')]).toEqual([[], 'true']);
    await page.evaluate(() => (document.querySelector<HTMLFieldSetElement>('#set')!.disabled = false));
    // Required and empty: a missing value, reported on the element; the form's report focuses the trigger.
    await set({ value: '' });
    expect(await el.evaluate((node) => [(node as unknown as HTMLSelectElement).validity.valueMissing, (node as unknown as HTMLSelectElement).validationMessage !== '', (node as unknown as HTMLSelectElement).checkValidity()])).toEqual([true, true, false]);
    await expect(select(el).locator('.value'), 'the option whose value is empty is still a choice that is shown').toHaveText('None');
    await page.locator('#send').click();
    expect(await page.evaluate(() => (window as unknown as { submitted: number }).submitted)).toBe(0);
    expect(await focusPath(page)).toEqual([`${TAG}#f`, 'tanrei-select', 'div.container']);
    // Not required: nothing is missing, and the form is submitted. (Asked of the form, not pressed: Firefox's own
    // message of the report stays open below the control while focus stays in it and no input is heard — a value set
    // by a script is none — and takes a press on what it covers, here the button below the field; it does the same
    // below the platform's own input.)
    await set({ required: false, optional: false });
    expect(await el.evaluate((node) => (node as unknown as HTMLSelectElement).checkValidity())).toBe(true);
    await page.evaluate(() => document.querySelector<HTMLFormElement>('#form')!.requestSubmit());
    expect(await page.evaluate(() => (window as unknown as { submitted: number }).submitted)).toBe(1);
  });

  test('SEF-3: focus given to it goes to its select’s container — by the product, by a press on its label row, which opens nothing, and by a form’s report — and it adds no stop to the focus order; a press on the container opens the list and a press on the help does nothing; while focus is inside it, or its list is open, it counts as focused for its Field', async ({ page }) => {
    await mountHtml(page, `<button id="before">Before</button><${TAG} id="f" label="Country" value="fr" supporting-text="Where your invoices are addressed." style="inline-size: 280px">${OPTIONS}</${TAG}><button id="after">After</button>`);
    const el = one(page, 'f');
    await el.evaluate((node: HTMLElement) => node.focus());
    expect(await focusPath(page)).toEqual([`${TAG}#f`, 'tanrei-select', 'div.container']);
    expect(await field(el).evaluate((node) => node.shadowRoot!.querySelector('.frame')!.hasAttribute('data-focused'))).toBe(true);
    await blurAll(page);
    expect(await field(el).evaluate((node) => node.shadowRoot!.querySelector('.frame')!.hasAttribute('data-focused'))).toBe(false);
    // The label row: focus, and nothing opens (FLD-12).
    await pressAt(field(el).locator('.label-row > .label'));
    expect(await focusPath(page)).toEqual([`${TAG}#f`, 'tanrei-select', 'div.container']);
    expect(await shown(el)).toBe(false);
    // One stop.
    await page.locator('#before').focus();
    await tab(page);
    expect((await focusPath(page))[0]).toBe(`${TAG}#f`);
    await tab(page);
    expect(await focusPath(page)).toEqual(['button#after']);
    // The help: nothing.
    await blurAll(page);
    await pressAt(field(el).locator('.supporting-text'));
    expect((await focusPath(page))[0]).not.toBe(`${TAG}#f`);
    expect(await shown(el)).toBe(false);
    // The container: the list opens, and a press on the Field's rows is a press outside it (SEL-27).
    await pressAt(trigger(el));
    await expect.poll(() => shown(el)).toBe(true);
    expect(await field(el).evaluate((node) => node.shadowRoot!.querySelector('.frame')!.hasAttribute('data-focused'))).toBe(true);
    await pressAt(field(el).locator('.label-row > .label'));
    await expect.poll(() => shown(el)).toBe(false);
    expect(await el.evaluate((node) => (node as HTMLElement & { value: string }).value)).toBe('fr');
  });

  test('SEF-4: placed in a Field it is drawn as it is and reported as a field already, with the bare control named — the select; in a field group it follows the group’s disabled through its own Field and takes nothing else from the group', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(
      page,
      `<tanrei-field id="outer" label="Outer"><${TAG} id="inner" label="Country" value="fr">${OPTIONS}</${TAG}></tanrei-field>
       <tanrei-field-group id="group" label="Shipping" error error-text="Check the address."><${TAG} id="member" label="Country" value="fr">${OPTIONS}</${TAG}></tanrei-field-group>`,
    );
    await expect(trigger(one(page, 'inner'))).toBeVisible();
    await expect(field(one(page, 'inner')).locator('.label-row > .label')).toHaveText('Country');
    await expect.poll(() => seen.filter((w) => w.includes('FLD-15')).length).toBe(1);
    const report = seen.find((w) => w.includes('FLD-15'))!;
    expect(report).toContain(`<${TAG}>`);
    expect(report).toContain('<tanrei-select>');
    // In a group: its own name and no error from the group; disabled with the group, through its Field.
    const member = one(page, 'member');
    expect(await trigger(member).evaluate((el) => [el.getAttribute('aria-label'), el.getAttribute('aria-invalid'), el.getAttribute('aria-disabled')])).toEqual(['Country', null, null]);
    await page.locator('#group').evaluate((el) => ((el as HTMLElement & { disabled: boolean }).disabled = true));
    await settle(page);
    await expect.poll(() => trigger(member).getAttribute('aria-disabled')).toBe('true');
    expect(await field(member).evaluate((el) => el.shadowRoot!.querySelector('.frame')!.hasAttribute('data-disabled'))).toBe(true);
    expect(await member.evaluate((el) => (el as HTMLElement & { disabled: boolean }).disabled), 'its own property does not change').toBe(false);
  });

  test('SEF-5: it has no words of its own and reads none — the required and the optional text are read by its Field, each from the instance’s prop and then from the product’s words; its select reads none', async ({ page }) => {
    const seen = warnings(page);
    await mountHtml(
      page,
      `<${TAG} id="required" label="Country" required>${OPTIONS}</${TAG}>
       <${TAG} id="optional" label="Region" optional>${OPTIONS}</${TAG}>
       <${TAG} id="own" label="City" required required-text="Needed">${OPTIONS}</${TAG}>`,
    );
    // No words given: the asterisk in the tag's place, no optional tag; the Field says what it lacks, the element nothing.
    await expect(field(one(page, 'required')).locator('.requirement-tag')).toHaveCount(0);
    await expect(field(one(page, 'required')).locator('.label-row .asterisk')).toHaveCount(1);
    await expect(field(one(page, 'optional')).locator('.requirement-tag')).toHaveCount(0);
    await expect(field(one(page, 'own')).locator('.requirement-tag .label')).toHaveText('Needed');
    expect(await missingWords(page)).toEqual(['optionalText', 'requiredText']);
    await expect.poll(() => seen.filter((w) => w.includes('FLD-24')).length).toBe(2);
    expect(seen.filter((w) => w.includes(`<${TAG}>`) || w.includes('SEL-62'))).toEqual([]);
    const words = () => page.evaluate((tag) => [...document.querySelectorAll(tag)].map((el) => `${el.shadowRoot!.textContent} ${el.shadowRoot!.querySelector('tanrei-select')!.shadowRoot!.textContent}`.replace(/\s+/g, ' ')).join(' '), TAG);
    expect(await words()).not.toMatch(/Required|Optional/);
    // The product's words, set once: the Field draws them; an instance's own prop wins.
    await setWords(page, { requiredText: 'Required', optionalText: 'Optional' });
    await expect(field(one(page, 'required')).locator('.requirement-tag .label')).toHaveText('Required');
    await expect(field(one(page, 'optional')).locator('.requirement-tag .label')).toHaveText('Optional');
    await expect(field(one(page, 'own')).locator('.requirement-tag .label')).toHaveText('Needed');
    expect(await missingWords(page)).toEqual([]);
    // The select's own tree holds the optional word as the description its Field gave it, and no other word of the product's.
    expect(await select(one(page, 'optional')).evaluate((el) => el.shadowRoot!.querySelector('#description')!.textContent)).toBe('Optional');
    expect(await select(one(page, 'required')).evaluate((el) => el.shadowRoot!.textContent!.replace(/\s+/g, ' '))).not.toMatch(/Required|Optional/);
  });
});

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations in ${theme}, in any fixture and in the pair by hand that is its twin`, async ({ page }) => {
      // One hundred and fourteen stages, fifteen of them with an open list: more than a default test's time in the slower engines.
      test.slow();
      // With its twins — the Field's fixtures `select-<id>`, a Field around a select by hand — on the same page.
      await mountFixtures(page, spec, { icons: true, theme, twins: true });
      expect(await page.locator('[data-twin-of]').count()).toBe(spec.fixtures.length);
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`), theme).toEqual([]);
    });
  }

  test('every fixture is one combobox named by its label — hidden or drawn — that opens a list box, required and invalid as its Field says and read-only and expanded as its select says; the element itself has no role and no name of its own', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      const said = await trigger(host(page, f.id)).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('aria-haspopup'), el.getAttribute('aria-required'), el.getAttribute('aria-invalid'), el.getAttribute('aria-readonly'), el.getAttribute('aria-disabled'), el.getAttribute('aria-expanded')]);
      expect(said, f.id).toEqual(['combobox', String(f.props.label), 'listbox', f.props.required ? 'true' : null, f.props.error ? 'true' : null, f.props.readOnly ? 'true' : null, f.props.disabled ? 'true' : null, f.props.open && !f.props.disabled ? 'true' : 'false']);
      expect(await host(page, f.id).evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), el.getAttribute('tabindex')]), f.id).toEqual([null, null, null]);
      const shownText = f.props.error && f.props.errorText ? f.props.errorText : f.props.supportingText;
      const described = [shownText, f.props.optional && !f.props.required ? f.props.optionalText : ''].filter(Boolean).join(' ');
      expect(await select(host(page, f.id)).evaluate((el) => el.shadowRoot!.querySelector('#description')?.textContent ?? ''), `${f.id}: the description`).toBe(described);
    }
  });
});

test.describe('fixtures', () => {
  test('every fixture is mounted, 280 wide, with the label where the Field or the select draws it, the options its select read and — where it is open — its list inside its stage', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    expect(spec.fixtures).toHaveLength(57);
    const flat = (items: FixtureItem[] = []): FixtureItem[] => items.flatMap((item) => (item.kind === 'option' ? [item] : flat(item.items)));
    for (const f of spec.fixtures) {
      const el = host(page, f.id);
      await expect(trigger(el), f.id).toBeVisible();
      near((await bounds(el)).width, 280, `${f.id}: as wide as its place`);
      near((await bounds(trigger(el))).width, 280, `${f.id}: its box fills it`);
      const stacked = (f.props.variant ?? 'stacked') === 'stacked';
      const labelled = !f.props.labelHidden;
      expect(await field(el).locator('.label-row > .label').count(), `${f.id}: the Field’s label row`).toBe(stacked && labelled ? 1 : 0);
      expect(await select(el).locator('.floating').count(), `${f.id}: the floating label`).toBe(!stacked && labelled ? 1 : 0);
      const options = flat(f.items);
      const chosen = options.find((o) => o.props.value === (f.props.value ?? ''));
      if (chosen) await expect(select(el).locator('.value'), f.id).toHaveText(String(chosen.props.label));
      const open = f.props.open === true && !f.props.disabled;
      expect(await rows(el).count(), `${f.id}: the rows`).toBe(open ? options.length : 0);
      if (open) {
        const [s, l, c] = [await bounds(page.locator(`[data-fixture="${f.id}"]`)), await bounds(select(el).locator('.list')), await bounds(trigger(el))];
        expect(l.y + l.height, `${f.id}: the list is inside its stage`).toBeLessThanOrEqual(s.y + s.height);
        // SEL-24, in a Field as bare: list.offset below the container, the start edges together. (The Field's frame is
        // a positioned box of another shadow root: the list is placed in it, not in the box a script sees.)
        near(l.y - (c.y + c.height), await resolveToken(page, '--tanrei-comp-select-list-offset'), `${f.id}: list.offset below the container`);
        // A list its options make wider than the container (SEL-25) is shifted along it to stay in the window, which
        // the stage stands for here; any other has the start edges together.
        if (l.width > c.width + 0.6) {
          expect(l.x, `${f.id}: wider than its container, inside its stage`).toBeGreaterThanOrEqual(s.x - 0.6);
          expect(l.x + l.width, `${f.id}: wider than its container, inside its stage`).toBeLessThanOrEqual(s.x + s.width + 0.6);
        } else if (f.direction === 'rtl') near(l.x + l.width, c.x + c.width, `${f.id}: the start edges together`);
        else near(l.x, c.x, `${f.id}: the start edges together`);
      }
    }
    // The icon faces are loaded: a glyph is drawn, not its name.
    const glyph = field(host(page, 'stacked-label-icon')).locator('.label-icon');
    near((await bounds(glyph)).width, await resolveToken(page, '--tanrei-comp-field-label-icon-size'), 'the label glyph');
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await mountFixtures(page, spec, { icons: true });
      await expect(page.locator(`[data-fixture="${f.id}"]`)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
