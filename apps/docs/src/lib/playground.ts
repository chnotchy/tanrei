// What a playground does in the browser (components/visuals/Playground.astro): each control sets its prop on the live
// element, the frame's code follows (`SOURCE_EVENT`, lib/example.ts), and the page's address keeps what differs from
// where the playground started (lib/visuals/playground-state.ts). The controls are defined with the stage, once the
// frame comes near the view.
//
// Before the element is defined, a value is written as the attribute a product writes; once it is, as its property —
// the attribute of a prop the element does not reflect would otherwise be read only once.
import { NEAR_EVENT, SOURCE_EVENT } from './example';
import { attributeOf, hashEntries, hashOf, PRESENT, propertyOf, stateFromHash, writeHash, type Control, type State, type Value } from './visuals/playground-state';

interface Data {
  component: string;
  tag: string;
  /** The element as a product writes it where the playground starts. */
  markup: string;
  controls: Control[];
  start: State;
}

type ControlElement = HTMLElement & { value?: unknown; checked?: boolean };

/** Every playground of the page, by component: what its controls hold now, for the address. */
const written = new Map<string, string>();

const defined = (element: Element) => element.matches(':defined');

/** The control's value as its element holds it. */
function valueOf(control: Control, element: ControlElement): Value {
  switch (control.kind) {
    case 'switch':
      return Boolean(element.checked);
    case 'number': {
      const value = element.value;
      return value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
    }
    default:
      return element.value === null || element.value === undefined ? null : String(element.value);
  }
}

/** Shows a value in its control: its property once it is defined, else the attribute it starts from. */
function show(control: Control, element: ControlElement, value: Value) {
  if (control.kind === 'switch') {
    if (defined(element)) element.checked = Boolean(value);
    else element.toggleAttribute('checked', Boolean(value));
    return;
  }
  if (defined(element)) {
    element.value = control.kind === 'number' ? value : (value ?? '');
    return;
  }
  if (value === null || value === '') element.removeAttribute('value');
  else element.setAttribute('value', String(value));
}

/** The element as a product writes it with these values: what the code shows. */
function sourceOf(data: Data, state: State): string {
  const template = document.createElement('template');
  template.innerHTML = data.markup;
  const element = template.content.querySelector(data.tag);
  if (!element) return data.markup;
  for (const control of data.controls) {
    const value = attributeOf(control, state[control.prop]);
    // A boolean attribute is written with the word the code drops, as the build writes it.
    if (value === null) element.removeAttribute(control.attribute);
    else element.setAttribute(control.attribute, value === '' && control.kind === 'switch' ? PRESENT : value);
  }
  return template.innerHTML;
}

function setUp(frame: HTMLElement) {
  const holder = frame.querySelector<HTMLElement>('[data-example-controls]');
  const script = holder?.querySelector<HTMLScriptElement>('script[data-playground-data]');
  const stage = frame.querySelector<HTMLElement>('[data-example-stage]');
  if (!holder || !script || !stage) return;
  let data: Data;
  try {
    data = JSON.parse(script.textContent ?? '') as Data;
  } catch {
    return;
  }
  const element = stage.querySelector<HTMLElement & Record<string, unknown>>(data.tag);
  if (!element) return;
  const inputs = new Map<string, ControlElement>();
  for (const control of data.controls) {
    const input = holder.querySelector<ControlElement>(`[data-playground-prop="${control.prop}"]`);
    if (input) inputs.set(control.prop, input);
  }
  let state: State = { ...data.start };

  /** Sets one prop on the live element. */
  const apply = (control: Control) => {
    const value = state[control.prop];
    if (defined(element)) {
      element[control.property] = propertyOf(control, value);
      return;
    }
    const attribute = attributeOf(control, value);
    if (attribute === null) element.removeAttribute(control.attribute);
    else element.setAttribute(control.attribute, attribute);
  };
  /** The code and the address follow what the controls hold. */
  const publish = () => {
    frame.dispatchEvent(new CustomEvent(SOURCE_EVENT, { detail: { source: sourceOf(data, state) } }));
    written.set(data.component, hashOf(data.controls, state, data.start));
    const hash = writeHash(written);
    // Replaced, not pushed: a reader's Back leaves the page rather than stepping through every value they tried.
    if (hash !== location.hash) history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
  };
  /** Every control and the element at a state: from the address, or back where the playground started. */
  const goTo = (next: State) => {
    const before = state;
    state = next;
    for (const control of data.controls) {
      const input = inputs.get(control.prop);
      if (input && valueOf(control, input) !== state[control.prop]) show(control, input, state[control.prop]);
      if (before[control.prop] !== state[control.prop]) apply(control);
    }
    publish();
  };

  for (const control of data.controls) {
    const input = inputs.get(control.prop);
    if (!input) continue;
    // A text follows each key; a choice, a switch and a number when they are changed.
    const event = control.kind === 'text' ? 'input' : 'change';
    input.addEventListener(event, () => {
      const value = valueOf(control, input);
      if (value === state[control.prop]) return;
      state = { ...state, [control.prop]: value };
      apply(control);
      publish();
    });
  }
  frame.querySelector('[data-example-actions]')?.addEventListener('click', (event) => {
    if ((event.target as Element).closest('[data-playground-reset]')) goTo({ ...data.start });
  });
  // What the address says, as the page opens and when a reader changes it.
  const entry = () => hashEntries(location.hash).get(data.component);
  const opened = entry();
  if (opened) {
    const from = stateFromHash(data.controls, opened, data.start);
    state = { ...data.start };
    goTo(from);
    frame.scrollIntoView({ block: 'start' });
  } else {
    frame.dispatchEvent(new CustomEvent(SOURCE_EVENT, { detail: { source: sourceOf(data, state) } }));
  }
  // An address that holds no playground's entry (a heading's) is the page's: it leaves the playground as it is.
  window.addEventListener('hashchange', () => {
    if (hashEntries(location.hash).size) goTo(stateFromHash(data.controls, entry(), data.start));
  });

  // The controls are defined with the stage (lib/define-on-demand.ts leaves what a marked part holds alone).
  const release = () => holder.removeAttribute('data-example-pending');
  if (stage.hasAttribute('data-example-pending')) frame.addEventListener(NEAR_EVENT, release, { once: true });
  else release();
}

for (const frame of document.querySelectorAll<HTMLElement>('[data-example][data-playground]')) setUp(frame);
