// What a pointer press did in the page, kept so that a press test that fails says why: every pointer and mouse event
// that reached the window or an open shadow root, with its target, position and buttons, and every change of
// `data-pressed` — the attribute `PressController` (src/primitives/press.ts) sets and takes away.
//
// A test that reads a press as drawn sees only the end of the story: "drawn hovered, never pressed". That can be a
// pointerdown that went to another element (the control moved), a pointerdown that never came, or a press that a
// `pointerleave`, `pointercancel` or `pointerup` ended while the button was still down — the first is the test's, the
// other two the engine's or the primitive's. The log tells them apart. It is attached to the failed test's result
// (`attachPressLog`), with the elements that are hovered or pressed when the test failed and where they are.
//
// What to look for after the test's `down:` note:
// - a pointerdown on another element: the control was not under the pointer (it moved after the hover was read);
// - a mousedown with no pointerdown: the engine took a button as already down, and a second button sends no
//   pointerdown (Pointer Events' chorded buttons) — WebKit does this for a mouse.down() while the button is down;
// - a pointerdown, data-pressed set, then a pointerleave, pointercancel or pointerup on the control before the test's
//   own release: the press was ended under a held button;
// - no pointer or mouse event at all: the input never reached the page.
// A `:hover` can outlast the pointer in WebKit while a button is held, so "hovered" in the list below is the engine's
// word, not where the pointer is: the events' positions are.
//
//   test.afterEach(({ page }, info) => attachPressLog(page, info));
//   await mountFixtures(page, spec, …);
//   await logPresses(page);                      // after each mount: a new document has no listeners
//   await notePress(page, 'down on the action');  // optional: a line of the test's own, to find the step
//
// The log costs nothing a test reads: listeners are passive and record in the event's turn, after nothing else.
import type { Page, TestInfo } from '@playwright/test';

/** The events a press is made, moved, ended or cancelled by. */
const EVENTS = [
  'pointerover',
  'pointerenter',
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'pointerout',
  'pointerleave',
  'gotpointercapture',
  'lostpointercapture',
  'mousedown',
  'mouseup',
  'click',
  'dragstart',
  'blur',
  'focus',
];

/** The most entries kept: the last ones say what happened. */
const KEEP = 600;

/**
 * Starts (or goes on with) the page's press log: listeners on the window and on every open shadow root in the
 * document, and an observer of `data-pressed` in each. Call it again after each mount — a document written anew
 * (`setContent`) drops the window's listeners — and after elements with shadow roots of their own were added. The log
 * itself lives on the window, so it runs on across mounts.
 */
export const logPresses = (page: Page) =>
  page.evaluate(
    ([events, keep]) => {
      type Log = { entries: unknown[][]; roots: WeakSet<object> };
      const w = window as unknown as { __pressLog?: Log };
      const log = (w.__pressLog ??= { entries: [], roots: new WeakSet() });
      const add = (entry: unknown[]) => {
        log.entries.push([Math.round(performance.now() * 10) / 10, ...entry]);
        if (log.entries.length > keep) log.entries.splice(0, log.entries.length - keep);
      };
      /** An element as a path a person can find: its tag and classes, and the fixture and host it is in. */
      const name = (node: unknown): string => {
        if (!(node instanceof Element)) return node === window ? 'window' : node === document ? 'document' : String((node as Node | null)?.nodeName ?? node);
        const own = `${node.localName}${node.id ? `#${node.id}` : ''}${typeof node.className === 'string' && node.className.trim() ? `.${node.className.trim().split(/\s+/).join('.')}` : ''}`;
        const host = (node.getRootNode() as ShadowRoot).host as Element | undefined;
        const fixture = (host ?? node).closest<HTMLElement>('[data-fixture]')?.dataset.fixture;
        return `${host ? `${name(host)} > ` : fixture ? `[${fixture}] ` : ''}${own}`;
      };
      const listen = (target: EventTarget, where: string) => {
        for (const type of events) {
          target.addEventListener(
            type,
            (event) => {
              const e = event as PointerEvent;
              add([where, type, name(e.composedPath()[0]), 'clientX' in e ? [e.clientX, e.clientY, e.buttons, e.button] : null, e.isTrusted]);
            },
            { capture: true, passive: true },
          );
        }
      };
      // The window's listeners are new with each document: a window listener survives no `setContent`.
      listen(window, 'window');
      const walk = (root: Document | ShadowRoot) => {
        for (const el of root.querySelectorAll('*')) {
          const shadow = el.shadowRoot;
          if (!shadow) continue;
          if (!log.roots.has(shadow)) {
            log.roots.add(shadow);
            // pointerenter and pointerleave are not composed: an element's inside a shadow root is heard only there.
            listen(shadow, 'shadow');
            new MutationObserver((records) => {
              for (const r of records) add(['observer', 'data-pressed', name(r.target), r.oldValue, (r.target as HTMLElement).dataset.pressed ?? null]);
            }).observe(shadow, { subtree: true, attributes: true, attributeFilter: ['data-pressed'], attributeOldValue: true });
          }
          walk(shadow);
        }
      };
      walk(document);
      add(['test', 'log started', document.querySelectorAll('[data-fixture]').length]);
    },
    [EVENTS, KEEP] as const,
  );

/** A line of the test's own in the log, to find a step by (where the page has a log). */
export const notePress = (page: Page, note: string) =>
  page.evaluate((n) => {
    const log = (window as unknown as { __pressLog?: { entries: unknown[][] } }).__pressLog;
    log?.entries.push([Math.round(performance.now() * 10) / 10, 'test', n]);
  }, note);

/**
 * After a test: where it failed and the page has a press log, attaches the log (`press-log`) and the elements that
 * are hovered or carry `data-pressed` now, with their boxes. A page that is gone (a crash, the test's time ran out)
 * attaches that it is gone.
 */
export async function attachPressLog(page: Page, info: TestInfo): Promise<void> {
  if (info.status === info.expectedStatus) return;
  const seen = await page
    .evaluate(() => {
      const log = (window as unknown as { __pressLog?: { entries: unknown[][] } }).__pressLog;
      if (!log) return null;
      const now: string[] = [];
      const walk = (root: Document | ShadowRoot) => {
        for (const el of root.querySelectorAll<HTMLElement>('*')) {
          if (el.matches(':hover') && !el.querySelector(':hover') && !el.shadowRoot?.querySelector(':hover')) {
            const r = el.getBoundingClientRect();
            now.push(`hovered (innermost): ${el.localName}.${el.className} at ${r.x},${r.y} ${r.width}×${r.height}`);
          }
          if (el.dataset.pressed !== undefined) {
            const r = el.getBoundingClientRect();
            now.push(`data-pressed="${el.dataset.pressed}": ${el.localName}.${el.className} at ${r.x},${r.y} ${r.width}×${r.height}, hovered ${el.matches(':hover')}`);
          }
          if (el.shadowRoot) walk(el.shadowRoot);
        }
      };
      walk(document);
      return { now, entries: log.entries };
    })
    .catch((error: Error) => ({ gone: error.message }));
  if (seen === null) return;
  const body =
    'gone' in seen
      ? `the page could not be read: ${seen.gone}`
      : [
          'When the test failed:',
          ...seen.now,
          '',
          'The log, oldest first: [ms, where, event, target, [clientX, clientY, buttons, button] | null, trusted] or [ms, "observer", "data-pressed", element, before, after]:',
          ...seen.entries.map((entry) => JSON.stringify(entry)),
        ].join('\n');
  await info.attach('press-log', { body, contentType: 'text/plain' });
}
