// What the docs' focus order figure lays over the live component (components/visuals/FocusOrder.astro), run in the
// browser: a number on each element the Tab key stops at, in the order it reaches them, in the overlay of the docs' one
// frame (`whenDrawn` in lib/visuals/frame.ts), and the same stops in words, in the figure's list.
//
// - **The order is computed from the elements as they stand**, as the browser's sequential focus navigation finds it
//   (HTML, "sequential focus navigation"): the stage's tree in the order a reader meets it, each shadow root and each
//   slot a scope of its own placed where its owner stands, the elements of a positive `tabindex` first in each scope;
//   an element is a stop where it is focusable, not disabled, not inert, rendered and visible, and not a host that
//   delegates its focus. A component's roving `tabindex` is read as it is now, so the figure follows it: it is drawn
//   again when focus moves in the stage, when it is pressed, when a key is let go there, and when it changes size or
//   system. test/browser/focus-order.test.mjs presses Tab through every figure and asks that it stops where the numbers
//   say, in their order, and nowhere else.
// - **The component is live**: a reader presses Tab through it and meets the stops the numbers show. The numbers are
//   hidden from assistive technology; the list in the caption says the stops, each by its role and its name.
import { SYSTEM_EVENT, settled, whenDrawn } from './frame';

/** Sent on a figure's frame each time its overlay has been drawn. */
export const FOCUS_ORDER_EVENT = 'docs-focus-order-drawn';

/** What is focusable without a `tabindex` of its own (HTML's focusable areas the docs' fixtures can hold). */
const FOCUSABLE = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, iframe, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"])';

const tabindexOf = (element: Element): number | null => {
  const value = element.getAttribute('tabindex');
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/** Whether an element is a focusable area: focusable by default or by its `tabindex`, and not disabled. */
function focusable(element: Element): boolean {
  if (!(element instanceof HTMLElement || element instanceof SVGElement)) return false;
  if (element.matches(':disabled')) return false;
  if (tabindexOf(element) !== null) return true;
  if (element.matches(FOCUSABLE)) return true;
  // A details element's first summary.
  return element.localName === 'summary' && element.parentElement?.localName === 'details' && element.parentElement.querySelector(':scope > summary') === element;
}

/** Whether an element owns a scope of its own: a shadow host, or a slot. */
const owner = (element: Element) => Boolean(element.shadowRoot) || element.localName === 'slot';

/** Where an element stands in its scope's order: its `tabindex`, 0 where it has none. */
const orderOf = (element: Element) => tabindexOf(element) ?? (focusable(element) ? (element as HTMLElement).tabIndex : 0);

const visible = (element: Element) => element.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true } as CheckVisibilityOptions);

/** The elements of one scope, in tree order: the focusable areas and the owners of the scopes inside it. */
function scopeOf(elements: Iterable<Element>, out: Element[] = []): Element[] {
  for (const element of elements) {
    if (element instanceof HTMLElement && element.inert) continue;
    // Not rendered, with all it holds (a slot and a box of `display: contents` have no box, and still hold theirs).
    if (getComputedStyle(element).display === 'none') continue;
    if (owner(element)) {
      out.push(element);
      // A host's own children are met where its slots place them; a slot's, where nothing is assigned to it.
      continue;
    }
    if (focusable(element)) out.push(element);
    scopeOf(element.children, out);
  }
  return out;
}

/** What a scope's owner holds: a host's shadow tree; a slot's assigned elements, else its own children. */
function inside(element: Element): Element[] {
  if (element.shadowRoot) return scopeOf(element.shadowRoot.children);
  const slot = element as HTMLSlotElement;
  return scopeOf(slot.assignedNodes().length ? slot.assignedElements() : slot.children);
}

/** The stops of a scope's elements, in the order Tab reaches them, each owner's own stops right after it. */
function stopsOf(items: Element[]): HTMLElement[] {
  const kept = items.filter((element) => orderOf(element) >= 0);
  const positive = kept.filter((element) => orderOf(element) > 0).sort((a, b) => orderOf(a) - orderOf(b));
  const rest = kept.filter((element) => orderOf(element) === 0);
  const out: HTMLElement[] = [];
  for (const element of [...positive, ...rest]) {
    const delegates = element.shadowRoot?.delegatesFocus ?? false;
    if (focusable(element) && !delegates && visible(element)) out.push(element as HTMLElement);
    if (owner(element)) out.push(...stopsOf(inside(element)));
  }
  return out;
}

/** The elements under `root` the Tab key stops at, in the order it reaches them. */
export function tabOrder(root: Element): HTMLElement[] {
  return stopsOf(scopeOf(root.children));
}

// ── Saying a stop in words ───────────────────────────────────────────────────────────────────────────────────────────

const IMPLICIT: Record<string, string> = { a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', summary: 'button' };
const INPUTS: Record<string, string> = { checkbox: 'checkbox', radio: 'radio', range: 'slider', search: 'searchbox', button: 'button', submit: 'button', reset: 'button' };

function roleOf(element: HTMLElement): string {
  const given = element.getAttribute('role') ?? (element as HTMLElement & { role?: string | null }).role;
  if (given) return given.split(/\s+/)[0] ?? given;
  if (element instanceof HTMLInputElement) return INPUTS[element.type] ?? 'textbox';
  return IMPLICIT[element.localName] ?? element.localName;
}

/** The text a node draws, through shadow roots and slots, without what is hidden from assistive technology. */
function textOf(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof Element) || node.getAttribute('aria-hidden') === 'true' || node.matches('style, script, template')) return '';
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes({ flatten: true });
    return (assigned.length ? assigned : [...node.childNodes]).map(textOf).join(' ');
  }
  return [...(node.shadowRoot ?? node).childNodes].map(textOf).join(' ');
}

/** The text an element stands for: its own label, its labelling elements, its text, or the label of the host it is drawn in. */
function nameOf(element: HTMLElement): string {
  const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
  const root = element.getRootNode() as Document | ShadowRoot;
  const byIds = (ids: string | null) =>
    squash(
      (ids ?? '')
        .split(/\s+/)
        .map((id) => (id ? root.getElementById?.(id)?.textContent : ''))
        .join(' '),
    );
  const found =
    squash(element.getAttribute('aria-label')) ||
    byIds(element.getAttribute('aria-labelledby')) ||
    squash([...((element as HTMLInputElement).labels ?? [])].map((label) => label.textContent).join(' ')) ||
    squash(textOf(element)) ||
    squash(element.getAttribute('placeholder'));
  if (found) return found;
  const host = root instanceof ShadowRoot ? root.host : null;
  return host ? squash(host.getAttribute('aria-label') ?? host.getAttribute('label') ?? textOf(host)) : '';
}

// ── Drawing ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const round = (value: number) => String(Math.round(value * 100) / 100);

function draw(frame: HTMLElement, canvas: HTMLElement, overlay: HTMLElement, subject: HTMLElement): void {
  const stage = subject.querySelector<HTMLElement>('[data-fixture]') ?? subject;
  const stops = tabOrder(stage);
  const base = canvas.getBoundingClientRect();
  const direction = getComputedStyle(stage).direction;
  overlay.replaceChildren(
    ...stops.map((stop, index) => {
      const box = stop.getBoundingClientRect();
      const marker = document.createElement('span');
      marker.className = 'docs-blueprint-marker docs-focus-stop';
      marker.textContent = String(index + 1);
      // Centred on the stop's top corner at its start edge, where a reader's eye meets it first.
      marker.style.left = `${(direction === 'rtl' ? box.right : box.left) - base.left}px`;
      marker.style.top = `${box.top - base.top}px`;
      // Where the stop is, in the canvas's box, for the test that presses Tab through the figure.
      Object.assign(marker.dataset, { left: round(box.left - base.left), top: round(box.top - base.top), width: round(box.width), height: round(box.height) });
      return marker;
    }),
  );
  const list = frame.querySelector<HTMLOListElement>('[data-focus-order-list]');
  const none = frame.querySelector<HTMLElement>('[data-focus-order-none]');
  if (list) {
    const template = list.dataset.stop ?? '{role} “{name}”';
    list.replaceChildren(
      ...stops.map((stop) => {
        const item = document.createElement('li');
        const name = nameOf(stop);
        item.textContent = name ? template.replace('{role}', roleOf(stop)).replace('{name}', name) : roleOf(stop);
        return item;
      }),
    );
  }
  if (none) none.hidden = stops.length > 0;
  frame.dataset.focusStops = String(stops.length);
  frame.dispatchEvent(new CustomEvent(FOCUS_ORDER_EVENT, { detail: { stops: stops.length } }));
}

for (const subject of document.querySelectorAll<HTMLElement>('[data-focus-order]')) {
  const frame = subject.closest<HTMLElement>('[data-example]');
  if (!frame) continue;
  whenDrawn(frame, (canvas, overlay) => {
    let queued = false;
    const again = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        void settled(subject).then(() => draw(frame, canvas, overlay, subject));
      });
    };
    again();
    new ResizeObserver(again).observe(canvas);
    // A roving tabindex moves as focus and the keys move in the component.
    for (const type of ['focusin', 'focusout', 'click', 'keyup']) subject.addEventListener(type, again);
    frame.addEventListener(SYSTEM_EVENT, again);
    const stage = frame.querySelector('[data-example-stage]');
    if (stage) new MutationObserver(again).observe(stage, { attributes: true, attributeFilter: ['dir'] });
    void document.fonts.ready.then(again);
  });
}
