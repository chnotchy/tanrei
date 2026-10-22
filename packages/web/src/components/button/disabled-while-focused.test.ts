// A Button that is disabled while it holds focus (BTN-2), and every place in the package where that happens.
//
// A Button is a form-associated element (BTN-29), and one engine takes focus from such an element inside the call that
// writes its `disabled` attribute, where every engine takes it from the platform's own `<button>` at the next frame.
// The Button writes that attribute when focus has left, a frame later at most (src/primitives/disabled-while-focused.ts),
// so its timing is the platform's in every engine. Held here: the Button beside a native twin; the containers that
// disable a focused Button of their own (a calendar's month buttons, a number input's steppers, a list's move buttons,
// a file upload's trigger); and the containers a product's Button stands in when it disables itself (a popover, a
// dialog, a side sheet, a docked picker, a toolbar, a button group) — where focus is, and that nothing closed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test } from '@playwright/test';
import { tab } from '../../../test/harness.js';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (file: string) => fs.readFileSync(path.join(web, file), 'utf8');

interface Probe {
  /** Where focus is, from the document down through every shadow root: `tag#id.class > …`. */
  deep(): string;
  /** Every `focusout` since the last read, as `from->to` (`nowhere` without a related target), and every event that closes something. */
  heard(): string[];
  frames(count?: number): Promise<void>;
  settle(): Promise<void>;
}
declare global {
  interface Window {
    probe: Probe;
  }
}

/** The page: the tokens, the bundle, the body, and a probe that hears focus leave and anything close, at the window. */
async function mount(page: Page, body: string) {
  await page.setContent(`<!doctype html>
<html lang="en"><head><style>${read('dist/tokens.css')}</style></head>
<body>${body}
<script type="module">${read('dist/tanrei.bundle.js')}</script></body></html>`);
  await page.waitForFunction(() => !!customElements.get('tanrei-button') && !!customElements.get('tanrei-date-time-picker'));
  await page.evaluate(async () => {
    const name = (el: Element | null | undefined) => (el ? `${el.localName}${el.id ? `#${el.id}` : ''}${typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).join('.')}` : ''}` : 'nowhere');
    const log: string[] = [];
    window.addEventListener('focusout', (event) => log.push(`focusout:${name(event.composedPath()[0] as Element)}->${name(event.relatedTarget as Element | null)}`), true);
    for (const type of ['close', 'cancel', 'dismiss', 'toggle']) window.addEventListener(type, (event) => log.push(`${type}:${name(event.target as Element)}`), true);
    const frames = async (count = 3) => {
      for (let i = 0; i < count; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
    };
    type Updating = Element & { updateComplete?: Promise<unknown> };
    const settle = async () => {
      for (let pass = 0; pass < 3; pass++) {
        const all: Updating[] = [];
        const walk = (root: ParentNode) => {
          for (const el of root.querySelectorAll<Updating>('*')) {
            all.push(el);
            if (el.shadowRoot) walk(el.shadowRoot);
          }
        };
        walk(document);
        for (const el of all) await el.updateComplete;
      }
    };
    window.probe = {
      deep() {
        const names: string[] = [];
        for (let at: Element | null = document.activeElement; at; at = at.shadowRoot?.activeElement ?? null) names.push(name(at));
        return names.join(' > ');
      },
      heard: () => log.splice(0),
      frames,
      settle,
    };
    await settle();
    await frames(2);
    await settle();
  });
}
const heard = (page: Page) => page.evaluate(() => window.probe.heard());
const deep = (page: Page) => page.evaluate(() => window.probe.deep());
const frames = (page: Page, count = 3) => page.evaluate((n) => window.probe.frames(n), count);

type Disableable = HTMLElement & { disabled: boolean; updateComplete?: Promise<unknown> };

test('BTN-2: a Button disabled while it holds focus — by its property, by setAttribute, by toggleAttribute — is disabled at once and gives up focus exactly when the platform’s own button beside it does: not within the turn, at the next frame, in every engine', async ({ page }) => {
  for (const how of ['property', 'setAttribute', 'toggleAttribute'] as const) {
    await mount(page, '<tanrei-button id="tanrei">Tanrei</tanrei-button><button id="native">Native</button><button id="after">After</button>');
    const outcome: Record<string, unknown> = {};
    for (const id of ['tanrei', 'native']) {
      outcome[id] = await page.evaluate(
        async ([id, how]) => {
          const el = document.querySelector(`#${id}`) as Disableable;
          const clicks: string[] = [];
          el.addEventListener('click', () => clicks.push('click'));
          el.focus();
          await window.probe.frames();
          window.probe.heard();
          if (how === 'property') el.disabled = true;
          else if (how === 'setAttribute') el.setAttribute('disabled', '');
          else el.toggleAttribute('disabled', true);
          await el.updateComplete;
          const inner = el.shadowRoot?.querySelector('button') ?? el;
          el.click();
          const within = { focus: document.activeElement === el, heard: window.probe.heard(), disabled: el.disabled, native: inner.matches(':disabled'), clicks: clicks.length };
          await window.probe.frames();
          const after = { focus: window.probe.deep(), heard: window.probe.heard().map((entry) => entry.replace(/^focusout:[^>]*->/, 'focusout->')), attribute: el.hasAttribute('disabled'), platform: el.matches(':disabled') };
          return { within, after };
        },
        [id, how],
      );
    }
    expect(outcome.tanrei, how).toEqual(outcome.native);
    expect(outcome.tanrei, how).toEqual({
      within: { focus: true, heard: [], disabled: true, native: true, clicks: 0 },
      after: { focus: 'body', heard: ['focusout->nowhere'], attribute: true, platform: true },
    });
    // Disabled at once also for the keyboard: Tab from before it passes it within the same turn.
    await mount(page, '<button id="before">Before</button><tanrei-button id="tanrei">Tanrei</tanrei-button><button id="after">After</button>');
    await page.evaluate(async (how) => {
      const el = document.querySelector('#tanrei') as Disableable;
      el.focus();
      if (how === 'property') el.disabled = true;
      else if (how === 'setAttribute') el.setAttribute('disabled', '');
      else el.toggleAttribute('disabled', true);
      await el.updateComplete;
      (document.querySelector('#before') as HTMLElement).focus();
    }, how);
    await tab(page);
    expect(await deep(page), `${how}: Tab passes it`).toBe('button#after');
  }
});

test('BTN-2: focus moved on within the turn in which the focused Button was disabled is all a page hears — no focusout to nowhere, in any engine — and the attribute is written as focus leaves', async ({ page }) => {
  await mount(page, '<div id="panel"><tanrei-button id="send">Send</tanrei-button><tanrei-button id="other">Other</tanrei-button></div>');
  const outcome = await page.evaluate(async () => {
    const [send, other] = [document.querySelector('#send') as Disableable, document.querySelector('#other') as Disableable];
    send.focus();
    await window.probe.frames();
    window.probe.heard();
    send.disabled = true;
    await send.updateComplete;
    other.focus();
    const within = { focus: window.probe.deep().replace(/ > .*/, ''), heard: window.probe.heard().map((entry) => entry.replace(/^focusout:[^>]*->/, 'focusout->').replace(/ > .*/, '')), attribute: send.hasAttribute('disabled') };
    await window.probe.frames();
    return { within, after: { focus: window.probe.deep().replace(/ > .*/, ''), heard: window.probe.heard() } };
  });
  expect(outcome).toEqual({
    within: { focus: 'tanrei-button#other', heard: ['focusout->tanrei-button#other'], attribute: true },
    after: { focus: 'tanrei-button#other', heard: [] },
  });
});

test('BTN-2: a Button disabled while it holds focus and enabled again before the frame — by its property, or by removing the attribute it was given — is enabled, keeps focus, emits click, and its attribute was never written', async ({ page }) => {
  for (const how of ['property', 'attribute', 'toggle'] as const) {
    await mount(page, '<tanrei-button id="send">Send</tanrei-button>');
    const outcome = await page.evaluate(async (how) => {
      const send = document.querySelector('#send') as Disableable;
      const written: string[] = [];
      new MutationObserver((records) => written.push(...records.map((record) => String(send.getAttribute(record.attributeName!))))).observe(send, { attributes: true, attributeFilter: ['disabled'] });
      let clicks = 0;
      send.addEventListener('click', () => clicks++);
      send.focus();
      await window.probe.frames();
      window.probe.heard();
      if (how === 'property') send.disabled = true;
      else if (how === 'attribute') send.setAttribute('disabled', '');
      else send.toggleAttribute('disabled');
      await send.updateComplete;
      const was = send.disabled;
      if (how === 'property') send.disabled = false;
      else if (how === 'attribute') send.removeAttribute('disabled');
      else send.toggleAttribute('disabled');
      await send.updateComplete;
      await window.probe.frames();
      send.click();
      return { was, disabled: send.disabled, native: send.shadowRoot!.querySelector('button')!.disabled, focus: window.probe.deep().replace(/ > .*/, ''), heard: window.probe.heard(), written, clicks };
    }, how);
    expect(outcome, how).toEqual({ was: true, disabled: false, native: false, focus: 'tanrei-button#send', heard: [], written: [], clicks: 1 });
  }
});

// ─── A product's Button in a container ───────────────────────────────────────────────────────────────────────────
//
// A submit button that disables itself in its own click, while the answer is awaited: focus was on it. Nothing closes;
// focus is where it was for as long as the turn lasts, and a page that moves it on within the turn hears nothing else.

const ACTIONS = (slot: string) => `<tanrei-button id="send" ${slot}>Send</tanrei-button><tanrei-button id="other" ${slot}>Other</tanrei-button>`;
const CONTAINERS: Record<string, { body: string; open: boolean }> = {
  'a popover': { body: `<button id="anchor">Anchor</button><tanrei-popover id="host" open anchor="anchor" label="Popover"><p>Text</p>${ACTIONS('slot="actions"')}</tanrei-popover>`, open: true },
  'a dialog': { body: `<tanrei-dialog id="host" open headline="Dialog">${ACTIONS('slot="actions"')}</tanrei-dialog>`, open: true },
  'a side sheet': { body: `<tanrei-side-sheet id="host" open headline="Sheet" close-label="Close">${ACTIONS('slot="actions"')}</tanrei-side-sheet>`, open: true },
  'a toolbar': { body: `<tanrei-toolbar id="host" label="Toolbar">${ACTIONS('')}</tanrei-toolbar>`, open: false },
  'a button group': { body: `<tanrei-button-group id="host" label="Group">${ACTIONS('')}</tanrei-button-group>`, open: false },
  'a callout': { body: `<tanrei-callout id="host" open closable close-label="Close" status-label="Note">Text ${ACTIONS('slot="actions"')}</tanrei-callout>`, open: true },
};

for (const [name, { body, open }] of Object.entries(CONTAINERS)) {
  test(`BTN-2: a Button in ${name} that disables itself in its own click keeps focus for the turn and loses it at the next frame, and nothing closes; a page that moves focus on within the turn hears no focus go nowhere`, async ({ page }) => {
    for (const moves of [false, true]) {
      await mount(page, body);
      await page.evaluate((moves) => {
        const send = document.querySelector('#send') as Disableable;
        send.addEventListener('click', () => {
          send.disabled = true;
          if (moves) void send.updateComplete?.then(() => (document.querySelector('#other') as HTMLElement).focus());
        });
      }, moves);
      await page.locator('#send').evaluate((el: HTMLElement) => el.focus());
      await frames(page);
      await heard(page);
      const within = await page.evaluate(async () => {
        const send = document.querySelector('#send') as Disableable;
        send.click();
        await send.updateComplete;
        await Promise.resolve();
        return { focus: window.probe.deep(), heard: window.probe.heard(), open: (document.querySelector('#host') as HTMLElement & { open?: boolean }).open };
      });
      await frames(page, 4);
      const after = { focus: await deep(page), heard: await heard(page), open: await page.locator('#host').evaluate((el: HTMLElement & { open?: boolean }) => el.open) };
      const still = open ? true : undefined;
      if (moves) {
        expect(within, 'focus moved on').toEqual({ focus: expect.stringMatching(/^tanrei-button#other/), heard: [expect.stringMatching(/^focusout:.*->tanrei-button#other$/)], open: still });
        expect(after, 'focus moved on, later').toEqual({ focus: expect.stringMatching(/^tanrei-button#other/), heard: [], open: still });
      } else {
        expect(within, 'within the turn').toEqual({ focus: expect.stringMatching(/^tanrei-button#send/), heard: [], open: still });
        // The platform's own button gives up focus at the next frame, to nowhere: the one thing heard, and nothing closes.
        expect(after.heard, 'later').toEqual([expect.stringMatching(/^focusout:.*->nowhere$/)]);
        expect(after.open, 'still open').toBe(still);
      }
    }
  });
}

test('TBR-10, BTN-2: a toolbar’s focused item that is disabled leaves the arrow keys’ order at once and the Tab stop within a frame: the stop is an enabled item', async ({ page }) => {
  await mount(page, '<button id="before">Before</button><tanrei-toolbar id="host" label="Toolbar"><tanrei-button id="a">A</tanrei-button><tanrei-button id="b">B</tanrei-button><tanrei-button id="c">C</tanrei-button></tanrei-toolbar>');
  await page.locator('#b').evaluate((el: HTMLElement) => el.focus());
  await frames(page);
  await page.locator('#b').evaluate(async (el: Disableable) => {
    el.disabled = true;
    await el.updateComplete;
  });
  await frames(page);
  expect(await page.evaluate(() => [...document.querySelectorAll('tanrei-toolbar > *')].map((el) => el.getAttribute('tabindex')))).toEqual(['0', null, '-1']);
  await page.locator('#before').focus();
  await tab(page);
  expect(await deep(page)).toMatch(/^tanrei-button#a/);
  await page.keyboard.press('ArrowRight');
  expect(await deep(page), 'the arrow keys pass the disabled item').toMatch(/^tanrei-button#c/);
});

test('TBR-10, BTN-32: in a disabled fieldset a toolbar counts only the items a key can reach — a link button, which no fieldset disables, is its Tab stop and the arrow keys stay on it — and when the fieldset is enabled the toolbar is one Tab stop again', async ({ page }) => {
  await mount(
    page,
    '<button id="before">Before</button><fieldset id="set" disabled><tanrei-toolbar id="host" label="Toolbar"><tanrei-button id="a">A</tanrei-button><tanrei-button id="link" href="#x">Link</tanrei-button><tanrei-button id="c">C</tanrei-button></tanrei-toolbar></fieldset><button id="after">After</button>',
  );
  const stops = () => page.evaluate(() => [...document.querySelectorAll('tanrei-toolbar > *')].map((el) => el.getAttribute('tabindex')));
  expect(await stops(), 'the link is the stop; a disabled item is untouched').toEqual([null, '0', null]);
  await page.locator('#before').focus();
  await tab(page);
  expect(await deep(page), 'Tab reaches the link').toMatch(/^tanrei-button#link/);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Home');
  expect(await deep(page), 'no key leaves it for an item that takes no focus').toMatch(/^tanrei-button#link/);
  await tab(page);
  expect(await deep(page), 'one stop').toBe('button#after');
  // Enabled: no attribute of an item changed, and the toolbar is one stop still — every item in the arrow keys' order.
  await page.locator('#set').evaluate((el: HTMLFieldSetElement) => (el.disabled = false));
  await frames(page);
  expect((await stops()).filter((value) => value === '0'), 'one Tab stop').toHaveLength(1);
  expect((await stops()).filter((value) => value === null), 'no item outside the roving').toHaveLength(0);
  await page.locator('#link').evaluate((el: HTMLElement) => el.focus());
  await page.keyboard.press('ArrowLeft');
  expect(await deep(page)).toMatch(/^tanrei-button#a/);
  // Disabled again while the toolbar stands: the stop goes back to the one item left.
  await page.locator('#set').evaluate((el: HTMLFieldSetElement) => (el.disabled = true));
  await frames(page);
  expect(await stops()).toEqual([null, '0', null]);
});

test('DLG-19, BTN-32: a dialog that cannot be dismissed and whose every action is disabled — one by itself, one by a fieldset around the dialog — is reported as one that leaves no way out', async ({ page }) => {
  const reports: string[] = [];
  page.on('console', (message) => reports.push(message.text()));
  await mount(page, '<fieldset disabled><tanrei-dialog id="host" headline="Dialog" closedby="none"><tanrei-button slot="actions" id="send">Send</tanrei-button><tanrei-button slot="actions" id="other" disabled>Other</tanrei-button></tanrei-dialog></fieldset>');
  await page.locator('#host').evaluate(async (el: HTMLElement & { open: boolean; updateComplete: Promise<unknown> }) => {
    el.open = true;
    await el.updateComplete;
  });
  await frames(page);
  expect(reports.filter((text) => text.includes('DLG-19')).join('\n')).toContain('every action is disabled');
});

// ─── Buttons a Tanrei element disables under the focus they hold ─────────────────────────────────────────────────

const CALENDAR = 'label="Calendar" value="2026-09-17" today="2026-09-17" previous-month-label="Previous month" next-month-label="Next month" year-view-label="Years"';

test('CAL-13: a month button that shows the last or the first month is disabled under the focus it holds, and focus stays in the calendar — on the other month button, or on the active day where both are disabled — with no focus heard going nowhere', async ({ page }) => {
  await mount(page, `<tanrei-calendar id="host" ${CALENDAR} min="2026-08-05" max="2026-10-20"></tanrei-calendar>`);
  const press = async (which: string) => {
    await page.locator('#host').evaluate((el, which) => (el.shadowRoot!.querySelector(`.${which}`) as HTMLElement).focus(), which);
    await frames(page);
    await heard(page);
    await page.keyboard.press('Enter');
    await page.evaluate(() => window.probe.settle());
    const within = await deep(page);
    await frames(page, 4);
    return { within, after: await deep(page), heard: (await heard(page)).filter((entry) => entry.endsWith('->nowhere')) };
  };
  const on = (which: string) => expect.stringMatching(new RegExp(`^tanrei-calendar#host > tanrei-button\\.${which}`));
  expect(await press('next'), 'the last month').toEqual({ within: on('previous'), after: on('previous'), heard: [] });
  expect(await page.locator('#host').evaluate((el) => (el.shadowRoot!.querySelector('.next') as Disableable).disabled)).toBe(true);
  // Back by the key that focus is now on: one press, the month before, and focus still there.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.evaluate(() => window.probe.settle());
  await frames(page, 4);
  expect(await deep(page), 'the first month').toEqual(on('next'));
  expect((await heard(page)).filter((entry) => entry.endsWith('->nowhere'))).toEqual([]);

  // Two months: the button that leads back was disabled until this very press, and takes focus once it is drawn enabled.
  await mount(page, `<tanrei-calendar id="host" ${CALENDAR} min="2026-09-01" max="2026-10-20"></tanrei-calendar>`);
  expect(await press('next'), 'two months').toEqual({ within: on('previous'), after: on('previous'), heard: [] });
});

test('CAL-13, DTM-5: in a docked date picker the month button that reaches the last month keeps focus in the picker, which stays open', async ({ page }) => {
  await mount(
    page,
    `<button id="anchor">Anchor</button><tanrei-date-time-picker id="host" presentation="docked" anchor="anchor" open ${CALENDAR} max="2026-10-20" confirm-label="OK" cancel-label="Cancel"></tanrei-date-time-picker>`,
  );
  await page.locator('#host').evaluate((el) => (el.shadowRoot!.querySelector('tanrei-calendar')!.shadowRoot!.querySelector('.next') as HTMLElement).focus());
  await frames(page);
  await heard(page);
  await page.keyboard.press('Enter');
  await page.evaluate(() => window.probe.settle());
  await frames(page, 4);
  expect(await deep(page)).toMatch(/^tanrei-date-time-picker#host > tanrei-calendar\.calendar > tanrei-button\.previous/);
  expect(await page.locator('#host').evaluate((el: HTMLElement & { open: boolean }) => el.open)).toBe(true);
  // Focus that moves inside one shadow root is heard by nothing outside it: the page hears nothing at all.
  expect(await heard(page)).toEqual([]);
});

test('NMI-26: a stepper pressed by pointer to the limit is disabled and focus has not moved — a focused input keeps it, and a field that was not focused has none — in every engine', async ({ page }) => {
  await mount(page, '<button id="before">Before</button><tanrei-number-input id="host" label="Number" value="9" max="10" increment-label="More" decrement-label="Less"></tanrei-number-input>');
  const up = page.locator('#host').locator('.stepper.up');
  await page.locator('#before').focus();
  await heard(page);
  await up.click();
  await frames(page, 4);
  expect(await page.locator('#host').evaluate((el: HTMLElement & { value: string }) => [el.value, (el.shadowRoot!.querySelector('.stepper.up') as Disableable).disabled])).toEqual([10, true]);
  expect(await deep(page), 'focus was elsewhere and stays there').toBe('button#before');
  expect(await heard(page)).toEqual([]);
  // From the focused input: the input keeps focus.
  await page.locator('#host').evaluate((el: HTMLElement & { value: number }) => (el.value = 9));
  await page.locator('#host').locator('input').focus();
  await heard(page);
  await up.click();
  await frames(page, 4);
  expect(await deep(page)).toMatch(/^tanrei-number-input#host > input/);
  expect(await heard(page)).toEqual([]);
  expect(await page.locator('#host').evaluate((el: HTMLElement & { value: number }) => [el.value, (el.shadowRoot!.querySelector('.stepper.up') as Disableable).disabled]), 'disabled once the press ended').toEqual([10, true]);
  // A press on the stepper that is disabled already steps nothing and leaves focus in the input.
  const box = (await up.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await frames(page, 4);
  expect(await deep(page), 'a press on a disabled stepper').toMatch(/^tanrei-number-input#host > input/);
  expect(await heard(page)).toEqual([]);
});

const LIST = `<tanrei-list id="host" reorderable label="Folders" drag-handle-label="Reorder {label}" move-to-start-label="Move to top" move-before-label="Move up" move-after-label="Move down" move-to-end-label="Move to bottom" lifted-text="{label} lifted" moved-text="{label}: {position} of {count}" cancelled-text="{label} returned">${['Inbox', 'Starred', 'Sent'].map((name) => `<tanrei-list-item label="${name}">${name}</tanrei-list-item>`).join('')}</tanrei-list>`;

// The list once disabled the move button focus was on at the end of the list; its handle is never disabled by a move,
// so what is held here is the other half of that case: the focused handle's item changes place in the document (or is
// replaced) under the keyboard, and focus arrives on the moved item's handle without going nowhere on the way.
test('LST-35, LST-43: a move by the keyboard to the last place keeps focus on the moved item’s handle, and a page hears no focus go nowhere on the way — whether the product reorders in the handler or a turn later, and with new items for the same content focus arrives there too', async ({ page }) => {
  for (const product of ['in the handler', 'a turn later', 'new items'] as const) {
    await mount(page, `<div id="editor">${LIST}</div>`);
    await page.evaluate((product) => {
      const list = document.querySelector('#host')!;
      list.addEventListener('move', (event) => {
        const { from, to } = (event as CustomEvent<{ from: number; to: number }>).detail;
        // The moved item holds focus: a product that keeps its elements moves the neighbour past it, not the item.
        const reorder = () => {
          const items = [...list.children];
          if (product === 'new items') {
            const [moved] = items.splice(from, 1);
            items.splice(to, 0, moved!);
            list.innerHTML = items.map((item) => `<tanrei-list-item label="${item.getAttribute('label')}">${item.getAttribute('label')}</tanrei-list-item>`).join('');
          } else if (to > from) list.insertBefore(items[to]!, items[from]!);
          else list.insertBefore(items[from]!, items[to]!);
        };
        if (product === 'a turn later') queueMicrotask(reorder);
        else reorder();
      });
    }, product);
    await page.locator('#host').evaluate((el) => (el.children[1]!.shadowRoot!.querySelector('.handle') as HTMLElement).focus());
    await frames(page);
    await heard(page);
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await page.evaluate(() => window.probe.settle());
    await frames(page, 6);
    expect(await page.locator('#host').evaluate((el) => [...el.children].map((item) => item.getAttribute('label'))), product).toEqual(['Inbox', 'Sent', 'Starred']);
    expect(await deep(page), product).toMatch(/^tanrei-list-item > tanrei-button[^ ]*\.handle/);
    expect(await page.evaluate(() => (document.activeElement as HTMLElement).getAttribute('label')), product).toBe('Starred');
    // New elements for the same content: the focused one is gone, which is the product's doing and may be heard.
    if (product !== 'new items') expect((await heard(page)).filter((entry) => entry.endsWith('->nowhere')), product).toEqual([]);
  }
});

test('FUP-16, BTN-2: a file upload disabled while focus is on its trigger disables the trigger at once, and focus leaves it as it leaves the platform’s own button: at the next frame, not within the turn', async ({ page }) => {
  await mount(page, '<tanrei-file-upload id="host" label="Files" remove-label="Remove"><tanrei-button id="send" slot="trigger">Choose</tanrei-button></tanrei-file-upload>');
  await page.locator('#send').evaluate((el: HTMLElement) => el.focus());
  await frames(page);
  await heard(page);
  const within = await page.evaluate(async () => {
    const host = document.querySelector('#host') as Disableable;
    host.disabled = true;
    await window.probe.settle();
    return { focus: window.probe.deep().replace(/ > .*/, ''), heard: window.probe.heard(), trigger: (document.querySelector('#send') as Disableable).disabled };
  });
  expect(within).toEqual({ focus: 'tanrei-button#send', heard: [], trigger: true });
  await frames(page, 4);
  expect(await heard(page)).toEqual([expect.stringMatching(/->nowhere$/)]);
});
