// A form's default button, reached one way from every control that submits its form on Enter (BTN-30).
//
// Each field's own sentence was amended to say it (TXF-3, NUM-20, CLF-19, CMB-28, OTC-13, SRC-13) and is held here,
// beside the selection controls (CHK-1, RAD-1, SWT-1) and the platform's own inputs, because the rule is one rule: the
// first submit button is pressed — its `click`, then its name and value in what is sent — a disabled one stops the
// key, and only a form with no submit button is asked directly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file: string) => fs.readFileSync(path.join(web, file), 'utf8');

const OPTIONS = '<tanrei-option value="a">Alpha</tanrei-option><tanrei-option value="b">Beta</tanrei-option>';
const NATIVE = (rest = '') => `<button id="native" type="submit" name="intent" value="native" ${rest}>Native</button>`;
const TANREI = (rest = '') => `<tanrei-button id="send" type="submit" name="intent" value="send" ${rest}>Send</tanrei-button>`;
const SECOND = '<input id="second" name="second" value="2" aria-label="Second" />';

/** The page: the tokens, the bundle and the form (or forms), and one log — `click:<id>`, `submit:<form>[data]`, `action`. */
async function mount(page: Page, body: string) {
  await page.setContent(`<!doctype html>
<html lang="en"><head><style>${read('dist/tokens.css')}</style></head>
<body>${body}
<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction(() => !!customElements.get('tanrei-button') && !!customElements.get('tanrei-text-field'));
  await page.evaluate(async () => {
    const log: string[] = ((window as unknown as { log: string[] }).log = []);
    for (const el of document.querySelectorAll<HTMLElement>('tanrei-button[id], button[id], input[type="submit"][id], input[type="image"][id]')) el.addEventListener('click', () => log.push(`click:${el.id}`));
    document.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.target as HTMLFormElement;
      const submitter = (event as SubmitEvent).submitter;
      log.push(`submit:${form.id}[${[...new FormData(form, submitter).entries()].map(([k, v]) => `${k}=${String(v)}`).join('&')}]`);
    });
    type Updating = HTMLElement & { updateComplete?: Promise<unknown> };
    for (let pass = 0; pass < 2; pass++) {
      for (const el of document.querySelectorAll<Updating>('form *, tanrei-button')) await el.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  });
}
const log = (page: Page) => page.evaluate(() => (window as unknown as { log: string[] }).log.splice(0));
const setDisabled = (page: Page, id: string, disabled: boolean) =>
  page.locator(`#${id}`).evaluate(async (el: HTMLElement & { disabled: boolean; updateComplete?: Promise<unknown> }, d) => {
    el.disabled = d;
    await el.updateComplete;
  }, disabled);
/** Enter in the control `#c` of the form on the page. */
async function enter(page: Page, id = 'c') {
  await page.locator(`#${id}`).evaluate((el: HTMLElement) => el.focus());
  await page.keyboard.press('Enter');
  // A selection control and a field render after the key; the log is read once they have.
  await page.locator(`#${id}`).evaluate((el: HTMLElement & { updateComplete?: Promise<unknown> }) => el.updateComplete);
}

/**
 * One control of a form of two fields, through the five cases of the rule. `sent` is what the control itself adds to
 * the data; `event` is its own event for the key, which — cancelled — keeps the button from being pressed.
 */
async function holdsTheRule(page: Page, control: string, { sent, event }: { sent: string; event: string | null }) {
  const data = (intent?: string) => [sent, 'second=2', ...(intent ? [`intent=${intent}`] : [])].filter(Boolean).join('&');

  // The platform's own submit button, alone: one click on it, and its pair in the data.
  await mount(page, `<form id="f">${control}${SECOND}${NATIVE()}</form>`);
  await enter(page);
  expect(await log(page), 'a native default button is pressed').toEqual(['click:native', `submit:f[${data('native')}]`]);
  // The control's own event for the key, cancelled: the button is not pressed.
  if (event) {
    await page.locator('#c').evaluate((el, name) => el.addEventListener(name, (e) => e.preventDefault(), { once: true }), event);
    await enter(page);
    expect(await log(page), `${event} cancelled`).toEqual([]);
  }
  // The same button disabled: nothing is sent.
  await setDisabled(page, 'native', true);
  await enter(page);
  expect(await log(page), 'a disabled native default button stops the key').toEqual([]);

  // A Tanrei Button of type submit counts exactly as the platform's own.
  await mount(page, `<form id="f">${control}${SECOND}${TANREI()}${NATIVE()}</form>`);
  await enter(page);
  expect(await log(page), 'a Tanrei default button is pressed, and the native one behind it is not').toEqual(['click:send', `submit:f[${data('send')}]`]);
  await setDisabled(page, 'send', true);
  await enter(page);
  expect(await log(page), 'a disabled Tanrei default button stops the key').toEqual([]);

  // No submit button of either kind: the form is asked directly, as before.
  await mount(page, `<form id="f">${control}${SECOND}<tanrei-button id="plain">Help</tanrei-button></form>`);
  await enter(page);
  expect(await log(page), 'no submit button: asked directly').toEqual([`submit:f[${data()}]`]);
}

test('TXF-3: Enter in a text field requests the submission through the form’s default button — the first submit button is pressed, a disabled one stops it, and only a form with no submit button is asked directly', async ({ page }) => {
  await holdsTheRule(page, '<tanrei-text-field id="c" name="c" label="Text" value="v"></tanrei-text-field>', { sent: 'c=v', event: 'action' });
});

test('NMI-20: Enter in a number input requests the submission through the form’s default button — the first submit button is pressed, a disabled one stops it, and only a form with no submit button is asked directly', async ({ page }) => {
  await holdsTheRule(page, '<tanrei-number-input id="c" name="c" label="Number" value="3"></tanrei-number-input>', { sent: 'c=3', event: 'action' });
});

test('NUM-48: Enter in a number field requests the submission of the number field’s own form through its default button — the first submit button is pressed, a disabled one stops it, and only a form with no submit button is asked directly', async ({ page }) => {
  await holdsTheRule(page, '<tanrei-number-field id="c" name="c" label="Number" value="3"></tanrei-number-field>', { sent: 'c=3', event: 'action' });
});

test('CLF-19: Enter in a color field requests the submission through the form’s default button — the first submit button is pressed, a disabled one stops it, and only a form with no submit button is asked directly', async ({ page }) => {
  await holdsTheRule(page, '<tanrei-color-field id="c" name="c" label="Color" value="#0f766e"></tanrei-color-field>', { sent: 'c=#0f766e', event: null });
});

test('CMB-28: Enter in a combobox with no option active requests the submission through the form’s default button — the first submit button is pressed, a disabled one stops it, and only a form with no submit button is asked directly', async ({ page }) => {
  await holdsTheRule(page, `<tanrei-combobox id="c" name="c" label="Combobox" value="a">${OPTIONS}</tanrei-combobox>`, { sent: 'c=a', event: 'action' });
});

test('CBF-4: Enter in a combobox field with no option active requests the submission of the field’s own form through that form’s default button — the first submit button is pressed, a disabled one stops it, and only a form with no submit button is asked directly', async ({ page }) => {
  await holdsTheRule(page, `<tanrei-combobox-field id="c" name="c" label="Combobox" value="a">${OPTIONS}</tanrei-combobox-field>`, { sent: 'c=a', event: 'action' });
});

test('OTC-13: Enter in a one-time-code input requests the submission through the form’s default button — the first submit button is pressed, a disabled one stops it, and only a form with no submit button is asked directly', async ({ page }) => {
  await holdsTheRule(page, '<tanrei-one-time-code-input id="c" name="c" label="Code" value="12"></tanrei-one-time-code-input>', { sent: 'c=12', event: 'action' });
});

test('OTF-4: Enter in a one-time-code field — in the cells of the input inside its shadow root, which is in no form — requests the submission through the default button of the field’s own form: the first submit button is pressed, a disabled one stops it, and only a form with no submit button is asked directly', async ({ page }) => {
  await holdsTheRule(page, '<tanrei-one-time-code-field id="c" name="c" label="Code" value="12"></tanrei-one-time-code-field>', { sent: 'c=12', event: 'action' });
});

test('SRC-13: Enter in a search requests the submission through the form’s default button — the first submit button is pressed, a disabled one stops it, and only a form with no submit button is asked directly', async ({ page }) => {
  await holdsTheRule(page, '<tanrei-search id="c" name="c" label="Search" value="q"></tanrei-search>', { sent: 'c=q', event: 'submit' });
});

for (const [id, name, control, sent] of [
  ['CHK-1', 'a checkbox', '<tanrei-checkbox id="c" name="c" label="Checkbox" checked></tanrei-checkbox>', 'c=on'],
  ['CKG-8', 'a checkbox of a checkbox group', '<tanrei-checkbox-group name="c" label="Group"><tanrei-checkbox id="c" value="on" label="Checkbox" checked></tanrei-checkbox></tanrei-checkbox-group>', 'c=on'],
  ['RAD-1', 'a radio button', '<tanrei-radio-button id="c" name="c" value="a" label="Radio" checked></tanrei-radio-button>', 'c=a'],
  ['SWT-1', 'a switch', '<tanrei-switch id="c" name="c" label="Switch" selected></tanrei-switch>', 'c=on'],
] as const) {
  test(`BTN-30, ${id}: Enter in ${name} presses the form’s default button — a disabled one stops it, and only a form with no submit button is asked directly — and does not switch the control`, async ({ page }) => {
    await holdsTheRule(page, control, { sent, event: null });
  });
}

test('BTN-30: the default button is the first submit button in document order — a button, an input of type submit or an image button of the platform’s, or a Tanrei Button of type submit — and never a reset button, a plain button, a toggle or a link', async ({ page }) => {
  const FIELD = '<tanrei-text-field id="c" name="c" label="Text" value="v"></tanrei-text-field>';
  const first = async (buttons: string, before = '') => {
    await mount(page, `${before}<form id="f">${FIELD}${SECOND}${buttons}</form>`);
    await enter(page);
    return (await log(page))[0] ?? null;
  };
  expect(await first(`<button id="r" type="reset">R</button><button id="p" type="button">P</button><tanrei-button id="tr" type="reset">TR</tanrei-button>${NATIVE()}`)).toBe('click:native');
  expect(await first(`<input id="in" type="submit" value="Go" />${TANREI()}`)).toBe('click:in');
  expect(await first(`<button id="bare">Bare</button>${TANREI()}`), 'a button without a type is a submit button').toBe('click:bare');
  // An image button is a submit button the platform leaves out of form.elements: before the Button it is the default.
  expect(await first(`<input id="img" type="image" alt="Go" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />${TANREI()}`)).toBe('click:img');
  expect(await first(`${TANREI()}<input id="img" type="image" alt="Go" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />`)).toBe('click:send');
  expect(await first(`<tanrei-button id="t" toggle type="submit">T</tanrei-button><tanrei-button id="l" href="#x" type="submit">L</tanrei-button><tanrei-button id="u" type="send">U</tanrei-button>${TANREI()}`)).toBe('click:send');
  // By the form attribute, from outside the form: where it stands in the document says whether it is first.
  expect(await first(NATIVE(), TANREI('form="f"'))).toBe('click:send');
  expect(await first(`${NATIVE()}</form>${TANREI('form="f"')}<form>`)).toBe('click:native');
});

// ─── The platform's own controls ─────────────────────────────────────────────────────────────────────────────────
//
// A native control knows only the platform's buttons. Where the form's default button is Tanrei's, the browser is
// given a button of its own to press for the length of the key — and the measure is the platform itself: the same
// keys in a twin form whose default button is the platform's own, in this engine, whatever this engine does.

const TWINS = (fields: string, tanrei = '', native = '') => `
  <form id="t">${fields.replaceAll('ID', 't')}<tanrei-button id="send" type="submit" name="intent" value="go" ${tanrei}>Send</tanrei-button></form>
  <form id="n">${fields.replaceAll('ID', 'n')}<button id="native" type="submit" name="intent" value="go" ${native}>Send</button></form>`;
/** What both forms logged, with the button and the form named alike. */
const alike = (entries: string[]) => entries.map((entry) => entry.replace(/click:(send|native)/, 'click:button').replace(/submit:[tn]\[/, 'submit:form[').replace(/^(formdata|reset):[tn]$/, '$1:form').replaceAll(/\b[tn]-/g, ''));

/**
 * Every event a page can hear of a key in a control, in order, at the window in the capture phase — the first place
 * any listener of the page could stand, added before the first key. A `submit` entry carries what was sent and what
 * a listener reads from the field then (`el.value`, and for a box `el.checked`), and what a `change` listener had
 * copied before it.
 */
async function hearEverything(page: Page) {
  await page.evaluate(() => {
    const log = (window as unknown as { log: string[] }).log;
    const copied = ((window as unknown as { copied: Map<string, string> }).copied = new Map<string, string>());
    const named = (el: EventTarget | null) => {
      const element = el as HTMLElement;
      // The submitter of a Tanrei Button is a button of the platform's that lasts as long as the dispatch (BTN-31).
      return element.id || (element.localName === 'button' && element.closest('tanrei-button') ? 'passing' : element.localName);
    };
    const read = (el: HTMLInputElement | HTMLSelectElement) => (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') ? String(el.checked) : el.value);
    for (const type of ['keydown', 'keypress', 'keyup', 'beforeinput', 'input', 'change', 'click', 'focusin', 'focusout', 'invalid', 'reset', 'formdata']) {
      window.addEventListener(
        type,
        (event) => {
          const target = event.composedPath()[0] as HTMLInputElement;
          if (type === 'change') copied.set(target.id, read(target));
          const key = event instanceof KeyboardEvent ? `(${[event.altKey && 'alt', event.ctrlKey && 'ctrl', event.metaKey && 'meta', event.shiftKey && 'shift', event.repeat && 'repeat', event.key].filter(Boolean).join('+')})` : '';
          // The button's own click is in the log already (mount); every other click is named here.
          if (type === 'click' && (target.id === 'send' || target.id === 'native' || (event.target as HTMLElement).id === 'send')) return;
          log.push(`${type}:${named(event.target)}${key}`);
        },
        true,
      );
    }
    document.addEventListener(
      'submit',
      (event) => {
        const form = event.target as HTMLFormElement;
        const fields = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')];
        const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
        log.push(`read:${fields.map((el) => `${el.id}=${read(el)}`).join(',')}`, `copied:${[...copied].filter(([id]) => id.startsWith(`${form.id}-`)).map(([id, value]) => `${id}=${value}`).join(',')}`, `submitter:${submitter ? `${submitter.localName}[${submitter.name}=${submitter.value}]` : 'none'}`, `elements:${form.elements.length - (submitter && submitter.id !== 'native' ? 1 : 0)}`);
      },
      true,
    );
  });
}

/** One act in each of the twin forms: what was heard in the Tanrei form and in the native one, named alike. */
async function inBoth(page: Page, control: string, act: (form: string) => Promise<void>): Promise<[string[], string[]]> {
  const pair: string[][] = [];
  for (const form of ['t', 'n']) {
    await page.locator(`#${form}-${control}`).focus();
    // What an earlier act left to be heard when focus moved (a change at blur) is not of this one.
    await log(page);
    await page.evaluate(() => (window as unknown as { copied: Map<string, string> }).copied.clear());
    await act(form);
    pair.push(alike(await log(page)));
    // Nothing of the key is left in the form: the button the browser was given is gone with the key — at its keyup,
    // or, where a list of the platform's own took the keyup (Enter in a select, in Chromium on Linux), in the task
    // after its keypress: a task queued here runs after that one.
    expect(await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)).then(() => document.querySelectorAll('tanrei-button > button').length)), 'no passing button is left').toBe(0);
  }
  return pair as [string[], string[]];
}

const CONTROLS = `
  <input id="ID-text" name="text" aria-label="text" />
  <input id="ID-search" type="search" name="search" aria-label="search" />
  <input id="ID-email" type="email" name="email" aria-label="email" />
  <input id="ID-url" type="url" name="url" aria-label="url" />
  <input id="ID-tel" type="tel" name="tel" aria-label="tel" />
  <input id="ID-password" type="password" name="password" aria-label="password" />
  <input id="ID-number" type="number" name="number" aria-label="number" />
  <input id="ID-date" type="date" name="date" aria-label="date" />
  <input id="ID-time" type="time" name="time" aria-label="time" />
  <input id="ID-month" type="month" name="month" aria-label="month" />
  <input id="ID-datetime" type="datetime-local" name="datetime" aria-label="datetime" />
  <input id="ID-color" type="color" name="color" aria-label="color" />
  <input id="ID-checkbox" type="checkbox" name="checkbox" aria-label="checkbox" />
  <input id="ID-radio" type="radio" name="radio" value="r" aria-label="radio" />
  <input id="ID-range" type="range" name="range" aria-label="range" />
  <input id="ID-file" type="file" name="file" aria-label="file" />
  <input id="ID-ro" readonly name="ro" value="r" aria-label="read-only" />
  <input id="ID-plain" type="button" value="B" />
  <input id="ID-clear" type="reset" value="R" />
  <textarea id="ID-area" name="area" aria-label="area"></textarea>
  <select id="ID-select" name="select" aria-label="select"><option>a</option><option>b</option></select>
  <select id="ID-listbox" name="listbox" size="3" aria-label="listbox"><option>a</option><option>b</option></select>`;
// A file input and a colour input open the system's own picker on Enter in some engines: a test cannot close it.
const NOT_PRESSED_IN_A_TEST = ['file', 'color'];
const CONTROL_IDS = [...CONTROLS.matchAll(/id="ID-([a-z]+)"/g)].map((match) => match[1]!).filter((id) => !NOT_PRESSED_IN_A_TEST.includes(id));

test('BTN-30: Enter in each of the platform’s own controls does to a form with a Tanrei default button exactly what this engine does to one with its own — every event in the same order, the same data, the same submitter’s pair — and presses nothing where the engine would not', async ({ page }) => {
  await mount(page, TWINS(CONTROLS));
  await hearEverything(page);
  const pressed: string[] = [];
  for (const control of CONTROL_IDS) {
    for (const key of ['Enter', 'Shift+Enter', 'Alt+Enter', 'Control+Enter', 'Meta+Enter']) {
      const [tanrei, native] = await inBoth(page, control, () => page.keyboard.press(key));
      expect(tanrei, `${key} in ${control}`).toEqual(native);
      if (tanrei.includes('click:button')) pressed.push(`${key} in ${control}`);
      // A select's list, a date's picker: closed before the next key.
      await page.keyboard.press('Escape');
      await page.evaluate(() => document.querySelectorAll('form').forEach((form) => form.reset()));
    }
  }
  // The comparison is not of two silences, and a key in a text area or on a button presses no default button.
  expect(pressed).toContain('Enter in text');
  expect(pressed).toContain('Shift+Enter in text');
  expect(pressed).toContain('Enter in number');
  expect(pressed).toContain('Enter in checkbox');
  expect(pressed.filter((entry) => / in (area|plain|clear)$/.test(entry))).toEqual([]);
});

test('BTN-30: Enter in a native control whose value the person just changed — typed text, a number, a date, a moved range, a chosen option, a ticked box — commits it first: change, then the button’s click, then submit, and a submit listener reads the new value, as with the platform’s own default button', async ({ page }) => {
  await mount(page, TWINS(CONTROLS));
  await hearEverything(page);
  const edits: [control: string, edit: () => Promise<void>][] = [
    ['text', () => page.keyboard.type('ab')],
    ['search', () => page.keyboard.type('q')],
    ['email', () => page.keyboard.type('a@b.example')],
    ['password', () => page.keyboard.type('pw')],
    ['number', () => page.keyboard.type('12')],
    ['number', () => page.keyboard.press('ArrowUp')],
    ['date', () => page.keyboard.type('01022026')],
    ['time', () => page.keyboard.type('0930')],
    ['range', () => page.keyboard.press('ArrowRight')],
    ['select', () => page.keyboard.press('ArrowDown')],
    ['listbox', () => page.keyboard.press('ArrowDown')],
    ['checkbox', () => page.keyboard.press('Space')],
    ['radio', () => page.keyboard.press('Space')],
  ];
  const TYPED = ['text', 'search', 'email', 'password'];
  const committed: string[] = [];
  for (const [control, edit] of edits) {
    const [tanrei, native] = await inBoth(page, control, async () => {
      await edit();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Escape');
    });
    expect(tanrei, `an edit, then Enter, in ${control}`).toEqual(native);
    const [change, click, submit] = [tanrei.indexOf(`change:${control}`), tanrei.indexOf('click:button'), tanrei.findIndex((entry) => entry.startsWith('submit:'))];
    if (click !== -1) committed.push(control);
    // Typed text is committed by the key in every engine; a picker's or a slider's value was committed as it was set.
    if (TYPED.includes(control)) expect(change !== -1 && click !== -1, `${control}: the key commits and submits — ${tanrei.join(' ')}`).toBe(true);
    if (click !== -1 && change !== -1) {
      expect(change < click && click < submit, `${control}: change, click, submit — ${tanrei.join(' ')}`).toBe(true);
      // What a change listener copied is what the submit listener reads: the page never reads an old copy.
      const read = tanrei.find((entry) => entry.startsWith('read:'))!.slice(5).split(',').find((entry) => entry.startsWith(`${control}=`));
      expect(tanrei.find((entry) => entry.startsWith('copied:'))!.slice(7).split(','), `${control}: the copy of change is the value at submit`).toContain(read);
    }
    await page.evaluate(() => document.querySelectorAll('form').forEach((form) => form.reset()));
  }
  // Text-like inputs submit in every engine, so the order was held and not skipped.
  expect(committed).toEqual(expect.arrayContaining(['text', 'search', 'email', 'password', 'number', 'checkbox']));
});

test('BTN-30: an Enter kept down in a native input presses a Tanrei default button once for each repeat, as the platform’s own; and a control outside its form that names it by the form attribute presses it too', async ({ page }) => {
  await mount(page, `<input id="t-out" form="t" name="out" value="o" aria-label="Outside" /><input id="n-out" form="n" name="out" value="o" aria-label="Outside" />${TWINS('<input id="ID-a" name="a" value="1" aria-label="A" /><input id="ID-b" name="b" aria-label="B" />')}`);
  await hearEverything(page);
  const [heldTanrei, heldNative] = await inBoth(page, 'a', async () => {
    await page.keyboard.down('Enter');
    await page.keyboard.down('Enter');
    await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
  });
  expect(heldTanrei, 'held').toEqual(heldNative);
  expect(heldTanrei.filter((entry) => entry === 'click:button')).toHaveLength(3);
  // BTN-29, BTN-30: a field of the form that stands outside it — its keys never pass the form element.
  const [outTanrei, outNative] = await inBoth(page, 'out', () => page.keyboard.press('Enter'));
  expect(outTanrei, 'outside').toEqual(outNative);
  expect(outTanrei).toContain('click:button');
  expect(outTanrei.find((entry) => entry.startsWith('submit:'))).toBe('submit:form[out=o&a=1&b=&intent=go]');
});

test('BTN-30: a Tanrei default button outside its form (the form attribute), in a disabled fieldset, and in a form inside a shadow root is pressed, or stops the key, from a native input exactly as the platform’s own button there', async ({ page }) => {
  // Outside the form, before it in the document: the first submit button of the form.
  await mount(page, `
    <tanrei-button id="send" type="submit" form="t" name="intent" value="go">Send</tanrei-button><button id="native" type="submit" form="n" name="intent" value="go">Send</button>
    <form id="t"><input id="t-a" name="a" value="1" aria-label="A" /><input id="t-b" name="b" aria-label="B" /></form>
    <form id="n"><input id="n-a" name="a" value="1" aria-label="A" /><input id="n-b" name="b" aria-label="B" /></form>`);
  await hearEverything(page);
  let [tanrei, native] = await inBoth(page, 'a', () => page.keyboard.press('Enter'));
  expect(tanrei, 'by the form attribute').toEqual(native);
  expect(tanrei).toContain('click:button');

  // A disabled fieldset around the button alone: the key is stopped, in a form of one field too.
  await mount(page, `
    <form id="t"><input id="t-a" name="a" value="1" aria-label="A" /><fieldset disabled><tanrei-button id="send" type="submit">Send</tanrei-button></fieldset></form>
    <form id="n"><input id="n-a" name="a" value="1" aria-label="A" /><fieldset disabled><button id="native" type="submit">Send</button></fieldset></form>`);
  await hearEverything(page);
  [tanrei, native] = await inBoth(page, 'a', () => page.keyboard.press('Enter'));
  expect(tanrei, 'in a disabled fieldset').toEqual(native);
  expect(tanrei.some((entry) => entry.startsWith('submit:') || entry.startsWith('click:'))).toBe(false);

  // A form in a shadow root, closed: its keys are heard in its own tree.
  await mount(page, '<div id="host-t"></div><div id="host-n"></div>');
  await page.evaluate(async () => {
    const log = (window as unknown as { log: string[] }).log;
    for (const [id, button] of [
      ['t', '<tanrei-button id="send" type="submit" name="intent" value="go">Send</tanrei-button>'],
      ['n', '<button id="native" type="submit" name="intent" value="go">Send</button>'],
    ] as const) {
      const root = document.querySelector(`#host-${id}`)!.attachShadow({ mode: 'closed' });
      root.innerHTML = `<form id="${id}"><input id="${id}-a" name="a" aria-label="A" /><input name="b" aria-label="B" />${button}</form>`;
      const form = root.querySelector('form')!;
      root.querySelector(`#${id === 't' ? 'send' : 'native'}`)!.addEventListener('click', () => log.push('click:button'));
      form.addEventListener('change', () => log.push('change'));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        log.push(`submit[${[...new FormData(form, (event as SubmitEvent).submitter).entries()].map(([k, v]) => `${k}=${String(v)}`).join('&')}]`);
      });
      (window as unknown as Record<string, HTMLElement>)[`input-${id}`] = root.querySelector('input')!;
      await (root.querySelector('tanrei-button') as (HTMLElement & { updateComplete: Promise<unknown> }) | null)?.updateComplete;
    }
  });
  const heard: string[][] = [];
  for (const id of ['t', 'n']) {
    await page.evaluate((key) => (window as unknown as Record<string, HTMLElement>)[key]!.focus(), `input-${id}`);
    await page.keyboard.type('x');
    await page.keyboard.press('Enter');
    heard.push(await log(page));
  }
  expect(heard[0], 'in a closed shadow root').toEqual(heard[1]);
  expect(heard[0]).toEqual(['change', 'click:button', 'submit[a=x&b=&intent=go]']);
});

test('BTN-31, BTN-30: the pressed Button’s pair is sent at the button’s own place among the form’s entries — between the fields it stands between — as the platform’s own button’s is, by its own press and by Enter in a native input and in a Tanrei field', async ({ page }) => {
  const form = (id: string, button: string) => `<form id="${id}"><input id="${id}-a" name="a" value="1" aria-label="A" />${button}<input id="${id}-b" name="b" value="2" aria-label="B" /><tanrei-text-field id="${id}-c" name="c" label="C" value="3"></tanrei-text-field></form>`;
  await mount(page, form('t', '<tanrei-button id="send" type="submit" name="intent" value="go">Send</tanrei-button>') + form('n', '<button id="native" type="submit" name="intent" value="go">Send</button>'));
  const heard: string[][] = [];
  for (const id of ['t', 'n']) {
    await page.locator(`#${id === 't' ? 'send' : 'native'}`).evaluate((el: HTMLElement) => el.click());
    await page.locator(`#${id}-a`).focus();
    await page.keyboard.press('Enter');
    await enter(page, `${id}-c`);
    heard.push(alike(await log(page)));
  }
  expect(heard[0]).toEqual(heard[1]);
  const pressed = ['click:button', 'submit:form[a=1&intent=go&b=2&c=3]'];
  expect(heard[0]).toEqual([...pressed, ...pressed, ...pressed]);
});

test('BTN-30: the browser’s press of the button it was given is heard by no listener of the page, and a page that stops the key on its way — keydown or keypress, before the form — still has its Tanrei default button pressed, as the platform’s own', async ({ page }) => {
  await mount(page, TWINS('<input id="ID-a" name="a" value="1" aria-label="A" /><input id="ID-b" name="b" aria-label="B" />'));
  await page.evaluate(() => {
    const log = (window as unknown as { log: string[] }).log;
    // Where a page's delegated listeners stand: the window, the document and the form, in both phases.
    for (const target of [window, document, ...document.querySelectorAll('form')]) {
      for (const capture of [true, false]) {
        target.addEventListener('click', (event) => log.push(`heard:${(event.target as HTMLElement).localName}`), capture);
      }
    }
    for (const type of ['keydown', 'keypress']) document.body.addEventListener(type, (event) => event.stopPropagation(), true);
  });
  const heard: string[][] = [];
  for (const form of ['t', 'n']) {
    await page.locator(`#${form}-a`).focus();
    await page.keyboard.press('Enter');
    heard.push((await log(page)).map((entry) => entry.replace('heard:tanrei-button', 'heard:button')));
  }
  expect(alike(heard[0]!), 'what the page hears').toEqual(alike(heard[1]!));
  // One click, on the button, heard six times on its way down and up; then the submission.
  expect(alike(heard[0]!)).toEqual(['heard:button', 'heard:button', 'heard:button', 'click:button', 'heard:button', 'heard:button', 'heard:button', 'submit:form[a=1&b=&intent=go]']);
});

test('BTN-30: a disabled Tanrei default button stops Enter in the platform’s own inputs as the platform’s own disabled button does — in a form of one field too, which the browser would otherwise submit behind it', async ({ page }) => {
  await mount(page, TWINS('<input id="ID-only" name="only" value="1" aria-label="Only" />', 'disabled', 'disabled'));
  for (const form of ['t', 'n']) {
    await page.locator(`#${form}-only`).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Shift+Enter');
    expect(await log(page), form).toEqual([]);
  }
  // A select beside the one field: in the engines that submit on Enter in a select, the key is stopped there too.
  await page.evaluate(() => document.querySelector('#t')!.insertAdjacentHTML('afterbegin', '<select id="t-select" name="s" aria-label="Select"><option>a</option></select>'));
  await page.locator('#t-select').focus();
  await page.keyboard.press('Enter');
  expect(await log(page), 'a select').toEqual([]);
  await page.locator('#t-select').evaluate((el) => el.remove());
  // Enabled again, the key is taken again.
  await setDisabled(page, 'send', false);
  await page.locator('#t-only').focus();
  await page.keyboard.press('Enter');
  expect(await log(page)).toEqual(['click:send', 'submit:t[only=1&intent=go]']);
});

test('BTN-30: the listener for the platform’s own inputs is on a form only while it holds a Tanrei submit Button — added with the first, removed with the last, following type, the form attribute and removal — and leaves a form whose default button is the platform’s own to the browser', async ({ page }) => {
  await mount(page, '<form id="f"><input id="a" name="a" value="1" aria-label="A" /><input id="b" name="b" value="2" aria-label="B" /><tanrei-button id="send" name="intent" value="send">Send</tanrei-button></form><form id="g"></form>');
  const enterA = async () => {
    await page.locator('#a').focus();
    await page.keyboard.press('Enter');
    return log(page);
  };
  // A plain Button: two fields and no submit button, so the platform's input submits nothing.
  expect(await enterA(), 'type button').toEqual([]);
  const set = (change: string) =>
    page.evaluate(async (c) => {
      type Send = HTMLElement & { type: string; toggle: boolean; updateComplete: Promise<unknown> };
      const kept = window as unknown as { keptButton?: Send };
      const el = (kept.keptButton ??= document.querySelector('#send') as Send);
      if (c === 'submit' || c === 'button' || c === 'reset') el.type = c;
      if (c === 'toggle') el.toggle = true;
      if (c === 'untoggle') el.toggle = false;
      if (c === 'away') el.setAttribute('form', 'g');
      if (c === 'back') el.removeAttribute('form');
      if (c === 'remove') el.remove();
      if (c === 'insert') document.querySelector('#f')!.append(el);
      await el.updateComplete;
    }, change);
  await set('submit');
  expect(await enterA(), 'type submit').toEqual(['click:send', 'submit:f[a=1&b=2&intent=send]']);
  await set('reset');
  expect(await enterA(), 'type reset').toEqual([]);
  await set('submit');
  await set('toggle');
  expect(await enterA(), 'a toggle ignores its type').toEqual([]);
  await set('untoggle');
  expect(await enterA(), 'no toggle any more').toEqual(['click:send', 'submit:f[a=1&b=2&intent=send]']);
  await set('away');
  expect(await enterA(), 'the form attribute names another form').toEqual([]);
  await set('back');
  expect(await enterA(), 'the form attribute removed').toEqual(['click:send', 'submit:f[a=1&b=2&intent=send]']);
  await set('remove');
  expect(await enterA(), 'removed from the document').toEqual([]);
  await set('insert');
  expect(await enterA(), 'inserted again').toEqual(['click:send', 'submit:f[a=1&b=2&intent=send]']);
  // A native submit button before it: the browser presses its own, and the Button is not pressed as well.
  await page.evaluate(() => document.querySelector('#f')!.insertAdjacentHTML('afterbegin', '<button id="native" type="submit" name="intent" value="native">N</button>'));
  await page.evaluate(() => document.querySelector('#native')!.addEventListener('click', () => (window as unknown as { log: string[] }).log.push('click:native')));
  expect(await enterA(), 'a native default button').toEqual(['click:native', 'submit:f[intent=native&a=1&b=2]']);
});

test('BTN-30: a key the page cancelled, Enter with Shift, and Enter held down are taken from a native input exactly as the platform takes them', async ({ page }) => {
  await mount(page, TWINS('<input id="ID-a" name="a" value="1" aria-label="A" /><input id="ID-b" name="b" aria-label="B" />'));
  const both = async (act: (form: string) => Promise<void>) => {
    const pair: string[][] = [];
    for (const form of ['t', 'n']) {
      await page.locator(`#${form}-a`).focus();
      await act(form);
      pair.push(alike(await log(page)));
    }
    return pair;
  };
  const same = async (what: string, act: (form: string) => Promise<void>, expected?: string[]) => {
    const [tanrei, native] = await both(act);
    expect(tanrei, what).toEqual(native);
    if (expected) expect(tanrei, what).toEqual(expected);
  };
  await same('Shift+Enter', () => page.keyboard.press('Shift+Enter'), ['click:button', 'submit:form[a=1&b=&intent=go]']);
  await same('keydown cancelled', async (form) => {
    await page.locator(`#${form}-a`).evaluate((el) => el.addEventListener('keydown', (event) => event.preventDefault(), { once: true }));
    await page.keyboard.press('Enter');
  }, []);
  await same('keypress cancelled', async (form) => {
    await page.locator(`#${form}-a`).evaluate((el) => el.addEventListener('keypress', (event) => event.preventDefault(), { once: true }));
    await page.keyboard.press('Enter');
  }, []);
  await same('keydown cancelled on the document, after the form heard it', async (form) => {
    await page.evaluate(() => document.addEventListener('keydown', (event) => event.preventDefault(), { once: true }));
    await page.keyboard.press('Enter');
    void form;
  }, []);
});

test('BTN-30: Enter that takes a suggestion of a datalist does to a form with a Tanrei default button what it does to one with the platform’s own', async ({ page }) => {
  await mount(page, TWINS('<input id="ID-a" name="a" list="ID-list" aria-label="A" autocomplete="off" /><datalist id="ID-list"><option value="apple"></option><option value="apricot"></option></datalist><input id="ID-b" name="b" aria-label="B" />'));
  const outcome: Record<string, { log: string[]; value: string }> = {};
  for (const form of ['t', 'n']) {
    await page.locator(`#${form}-a`).focus();
    await page.keyboard.type('ap');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    outcome[form] = { log: alike(await log(page)).map((entry) => entry.replace(/a=[a-z]*/, 'a=…')), value: await page.locator(`#${form}-a`).inputValue() };
    // The list is closed before the other form is tried.
    await page.keyboard.press('Escape');
    await page.locator(`#${form}-b`).focus();
  }
  expect(outcome.t, 'as the platform’s own default button').toEqual(outcome.n);
});

test('BTN-30: the Enter that ends an input method’s composition in a native input submits nothing; the next Enter presses the default button', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'only Chromium drives an input method from a test (CDP Input.imeSetComposition)');
  await mount(page, TWINS('<input id="ID-a" name="a" aria-label="A" /><input id="ID-b" name="b" aria-label="B" />'));
  const cdp = await page.context().newCDPSession(page);
  for (const form of ['t', 'n']) {
    await page.locator(`#${form}-a`).focus();
    for (const text of ['に', 'にほ', 'にほん']) await cdp.send('Input.imeSetComposition', { text, selectionStart: text.length, selectionEnd: text.length });
    // The key an input method takes: a keydown the page sees as 229, composing, and no keypress after it.
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Process', code: 'Enter', windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
    await cdp.send('Input.insertText', { text: '日本' });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    expect(await log(page), `${form}: the composition is committed and nothing is sent`).toEqual([]);
    await expect(page.locator(`#${form}-a`)).toHaveValue('日本');
    await page.keyboard.press('Enter');
    expect(alike(await log(page)), `${form}: the next Enter`).toEqual(['click:button', 'submit:form[a=日本&b=&intent=go]']);
  }
});
