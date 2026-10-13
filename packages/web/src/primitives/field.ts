import type { ReactiveController, ReactiveControllerHost } from 'lit';

// A field and the control it frames live in different trees: the field's label and its help are in the field's shadow
// root, the control is the product's element in the light DOM, and its semantics are on a native element inside the
// control's own shadow root. An id cannot be referenced across any of those boundaries, so nothing here is tied with
// `aria-labelledby` or `aria-describedby`. The field GIVES its control what it would otherwise point at, as values
// (FLD-10, FLD-11, FLD-8, FLD-14; a field group gives its error condition and `disabled` the same way, FGR-8, FGR-14):
//
//   a control asks ─ `tanrei-field-connect`, a composed, bubbling CustomEvent it dispatches on itself when it is
//                    connected. Its `detail` is a `FieldConnection`: what the control is, and `update()`, through which
//                    it is told.
//   the nearest frame answers ─ a `<tanrei-field>`, a `<tanrei-field-group>` (later a radio group): it stops the event,
//                    keeps the connection, calls `update(state)` at once and again whenever a value changes, and
//                    `update(null)` when the control leaves it.
//   the control writes ─ the name, the description and the states on the element that carries its semantics, and lets
//                    its own `label` win.
//
// The exchange runs both ways (and its three conditions). Beside the name, the
// description and the states, a frame gives a control that draws the label itself whether the label is hidden and
// whether an asterisk or the optional word follows it (`labelHidden`, `requiredMark`, `optionalText`: FLD-25). And a control may say of itself what only
// it knows (`FieldSays`, through `FieldConnection.says`): that it draws the label (`drawsLabel`, FLD-25), how far its
// content is inset from its own edges (`inset`, FLD-26), and that it refused what was entered, with its words
// (`refusal`, FLD-28), and that it is drawn focused though focus may be elsewhere (`drawnFocused`, FLD-13: a list that
// is open). It says so again by calling `said()`, which the frame that keeps the connection sets. A
// control that says nothing is framed as before; a frame of an earlier day reads none of it and sets no `said`; and
// a control whose frame answers without the two new values draws its floating label with no asterisk, as a bare one.
// Nothing else carries any of this: a composed element takes no part in the exchange.
//
// `FieldControlController` is the control's side and `FieldProviderController` the frame's. A control the product built
// may speak the same protocol (dispatch the event, keep `update`); an element that does not is given plain attributes
// by the frame instead (`giveAttributes()`), and gets back exactly what it had when it leaves (`takeBack()`).

/** The event a control asks its nearest field with. */
export const FIELD_CONNECT = 'tanrei-field-connect';

/** Where an upgraded Tanrei control keeps its side of the protocol, so a frame defined after it can have it ask again. */
export const FIELD_CONTROL = Symbol.for('tanrei.field-control');

/** What a frame gives the control it frames. Every value is the frame's now; the control keeps none of its own in it. */
export interface FieldState {
  /** The control's accessible name while it has none of its own (FLD-10). Empty: the frame names nothing. */
  label: string;
  /** The control's description, after any it has of its own — a Field's: the help, the error text while it is in error, the optional text, in that order (FLD-11); a field group gives a checkbox its error text and a radio button nothing (FGR-11). */
  description: string;
  /** The control is exposed as invalid, and drawn in its own error condition where it has one (FLD-8, FGR-8). */
  invalid: boolean;
  /** The control is exposed as required (FLD-10). */
  required: boolean;
  /** "Required" in the product's words: what a control whose role has no required state adds to its description. */
  requiredText: string;
  /** The control is disabled as its own `disabled` does (FLD-14, FGR-14). */
  disabled: boolean;
  /** FLD-25: the frame's label is not drawn (`labelHidden`), so a control that draws the label itself draws none either. */
  labelHidden?: boolean;
  /** FLD-25: the required mark a control that draws the label itself draws after it: an asterisk, or none. */
  requiredMark?: 'asterisk' | 'none';
  /** FLD-25: the optional word a control that draws the label itself draws after it, while the frame's requirement is optional; empty otherwise. */
  optionalText?: string;
}

/** What a control says of itself to the frame around it (FLD-13, FLD-25, FLD-26, FLD-28). Every member may be left out. */
export interface FieldSays {
  /** FLD-25: the control draws the label itself — its look floats its name inside its own box — so the frame draws no label row. */
  drawsLabel?: boolean;
  /**
   * FLD-26: how far the control's content stands from its own start edge, and the room it keeps at its end edge, each
   * as a CSS length (an expression of the control's own tokens resolves where the frame reads it: custom properties
   * are inherited). The frame starts and ends its supporting row there.
   */
  inset?: { start: string; end: string } | null;
  /** FLD-28: the control refused what was entered, with its words for it (empty: it has none). */
  refusal?: { text: string } | null;
  /** FLD-13: the control is drawn focused whether or not focus is inside it (a combobox or a select for as long as its list is open), so the frame draws its rows focused with it. */
  drawnFocused?: boolean;
}

/** What a control tells the frame when it asks (the `detail` of `tanrei-field-connect`). */
export interface FieldConnection {
  /** The control: the element that dispatched the event. */
  control: Element;
  /** `all`: a control with no frame of its own. `disabled`: one that names, describes and marks itself (a text field, a field, a group) and follows only the frame's `disabled`. */
  takes: 'all' | 'disabled';
  /** The control draws an error condition of its own (a checkbox, a radio button): a field group marks only these invalid (FGR-8). */
  errorCondition: boolean;
  /** The control draws a label row, a supporting row and an error itself: it needs no field (FLD-15). */
  framed: boolean;
  /** Whether the control has an accessible name of its own right now (FLD-10's two reports). */
  named: () => boolean;
  /** The frame tells the control: the state now, or `null` when the control is no longer its control. */
  update: (state: FieldState | null) => void;
  /** What the control says of itself, read by the frame whenever it draws; left out by a control that says nothing. */
  says?: () => FieldSays;
  /** Set by the frame that keeps the connection: the control calls it when what it says has changed. */
  said?: () => void;
}

export interface FieldControlOptions {
  takes?: FieldConnection['takes'];
  errorCondition?: boolean;
  framed?: boolean;
  /** The role the control exposes has a required state (a checkbox, a switch, a text box; not a slider or a radio button). */
  requiredState?: boolean;
  named?: () => boolean;
  /** After the frame's state changed (the host is rendered again by the controller itself). */
  changed?: () => void;
  /** What the control says of itself to its frame (FLD-25, FLD-26, FLD-28), read after each of the host's updates. */
  says?: () => FieldSays;
  /**
   * The control does not ask yet: the frame it belongs to is not there to answer, and a frame further out would take
   * the question for its own — a checkbox in a checkbox group that is not defined yet, whose field group is drawn only
   * when it is (CKG-1). Whoever brings the frame has the control ask again (`ask()`).
   */
  waits?: () => boolean;
}

const saysKey = (says: FieldSays | undefined) => (says ? JSON.stringify([!!says.drawsLabel, says.inset?.start ?? null, says.inset?.end ?? null, says.refusal ? says.refusal.text : null, !!says.drawnFocused]) : '');

const same = (a: FieldState | null, b: FieldState | null) =>
  a === b || (!!a && !!b && a.label === b.label && a.description === b.description && a.invalid === b.invalid && a.required === b.required && a.requiredText === b.requiredText && a.disabled === b.disabled && !!a.labelHidden === !!b.labelHidden && (a.requiredMark ?? 'none') === (b.requiredMark ?? 'none') && (a.optionalText ?? '') === (b.optionalText ?? ''));

/**
 * The control's side: asks the nearest frame when the host is connected, keeps what it is told, renders the host again
 * when that changes, and forgets it when the host leaves the document. The host reads `name()`, `description()`,
 * `invalid`, `required` and `disabled` where it renders its semantics.
 */
export class FieldControlController implements ReactiveController {
  /** What the frame gave, or `null` outside any frame. */
  state: FieldState | null = null;
  private asking = false;
  /** The connection the frame keeps, and what the control last said through it. */
  private connection: FieldConnection | null = null;
  private saidKey = '';

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: FieldControlOptions = {},
  ) {
    host.addController(this);
    (host as unknown as Record<symbol, unknown>)[FIELD_CONTROL] = this;
  }

  hostConnected() {
    this.ask();
  }

  hostDisconnected() {
    this.receive(null);
  }

  /** What the host says of itself may have changed with its update: the frame is told once for each change. */
  hostUpdated() {
    if (!this.options.says || !this.connection) return;
    const key = saysKey(this.options.says());
    if (key === this.saidKey) return;
    this.saidKey = key;
    this.connection.said?.();
  }

  /** Asks the nearest frame, unless one has answered already. A frame that was defined after the control calls this. */
  ask() {
    if (this.state || this.asking || !this.host.isConnected || this.options.waits?.()) return;
    this.asking = true;
    const detail: FieldConnection = {
      control: this.host,
      takes: this.options.takes ?? 'all',
      errorCondition: this.options.errorCondition ?? false,
      framed: this.options.framed ?? false,
      named: () => this.options.named?.() ?? false,
      update: (state) => {
        if (state) this.connection = detail;
        this.receive(state);
      },
      ...(this.options.says ? { says: this.options.says } : {}),
    };
    // What the frame reads when it first draws is what was said by now.
    this.saidKey = saysKey(this.options.says?.());
    this.host.dispatchEvent(new CustomEvent<FieldConnection>(FIELD_CONNECT, { bubbles: true, composed: true, detail }));
    this.asking = false;
  }

  private receive(state: FieldState | null) {
    if (!state) this.connection = null;
    if (same(this.state, state)) return;
    this.state = state;
    this.options.changed?.();
    this.host.requestUpdate();
  }

  /** Inside a frame that gives this control everything a field gives (not only `disabled`). */
  private get all(): FieldState | null {
    return this.state && (this.options.takes ?? 'all') === 'all' ? this.state : null;
  }

  /** The frame's label, where it gives one. */
  get label(): string {
    return this.all?.label ?? '';
  }

  /** The accessible name: the control's own label wins, then the frame's (FLD-10). */
  name(own = ''): string {
    return own || this.label;
  }

  /**
   * The description: the control's own first, then the frame's, then — for a control whose role has no required state —
   * the required text, because the requirement must still reach assistive technology (FLD-10, FLD-11).
   */
  description(own = ''): string {
    const state = this.all;
    const required = state?.required && !(this.options.requiredState ?? true) ? state.requiredText : '';
    return [own, state?.description ?? '', required].filter(Boolean).join(' ');
  }

  get invalid(): boolean {
    return this.all?.invalid ?? false;
  }

  /** Whether to expose the required state: only a control whose role has one says it this way. */
  get required(): boolean {
    return (this.all?.required ?? false) && (this.options.requiredState ?? true);
  }

  get disabled(): boolean {
    return this.state?.disabled ?? false;
  }

  /** Inside a frame that answers everything: its label is hidden, so a control that draws the label draws none (FLD-25). */
  get labelHidden(): boolean {
    return this.all?.labelHidden ?? false;
  }

  /** The required mark a control that draws the label itself draws after it (FLD-25); none outside a frame, or in one that names none. */
  get requiredMark(): 'asterisk' | 'none' {
    return this.all?.requiredMark ?? 'none';
  }

  /** The optional word a control that draws the label itself draws after it (FLD-25); empty outside a frame, or where the requirement is not optional. */
  get optionalText(): string {
    return this.all?.optionalText ?? '';
  }

  /** Whether a frame that gives everything a field gives frames the host. */
  get framed(): boolean {
    return !!this.all;
  }
}

/** `node` is `ancestor` or inside it, through shadow roots too. */
export function composedContains(ancestor: Node, node: Node | null): boolean {
  for (let at: Node | null = node; at; at = at.parentNode ?? (at as ShadowRoot).host ?? null) if (at === ancestor) return true;
  return false;
}

// ── An element that does not ask ───────────────────────────────────────────────────────────────────────────

/** What a frame gives an element that does not speak the protocol, as attributes. */
export interface PlainGift {
  label?: string;
  description?: string;
  invalid?: boolean;
  required?: boolean;
  requiredText?: string;
  disabled?: boolean;
}

interface Given {
  /** Attribute → the value it had before (`null`: none) and the value the frame wrote. */
  attributes: Map<string, { before: string | null; wrote: string }>;
  /** The frame set the element's `disabled` property, which was false. */
  disabled: boolean;
}
const given = new WeakMap<Element, Given>();

/** Roles that have a required state (WAI-ARIA 1.2), and the native elements that have those roles without saying so. */
const REQUIRED_ROLES = new Set(['checkbox', 'combobox', 'gridcell', 'listbox', 'radiogroup', 'spinbutton', 'textbox', 'searchbox', 'switch', 'tree', 'treegrid', 'columnheader', 'rowheader']);
const NO_REQUIRED_INPUT = new Set(['range', 'button', 'submit', 'reset', 'image', 'color', 'hidden', 'radio']);

/** Whether `aria-required` means something on `element`: its role has the state. */
export function takesRequired(element: Element): boolean {
  const role = element.getAttribute('role');
  if (role) return REQUIRED_ROLES.has(role.trim().split(/\s+/)[0]);
  if (element instanceof HTMLInputElement) return !NO_REQUIRED_INPUT.has(element.type);
  return element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
}

/** Whether `element` has an accessible name the product gave it: an ARIA name, or a `<label>` of the page. */
export function namesItself(element: Element): boolean {
  const wrote = given.get(element)?.attributes.get('aria-label');
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel?.trim() && ariaLabel !== wrote?.wrote) return true;
  if (wrote?.before?.trim()) return true;
  if (element.getAttribute('aria-labelledby')?.trim()) return true;
  return ((element as HTMLInputElement).labels?.length ?? 0) > 0;
}

function write(element: Element, record: Given, name: string, value: string | null) {
  const had = record.attributes.get(name);
  if (value === null) {
    if (!had) return;
    // Take back only what is still the frame's: a value the product wrote meanwhile is the product's.
    if (element.getAttribute(name) === had.wrote) {
      if (had.before === null) element.removeAttribute(name);
      else element.setAttribute(name, had.before);
    }
    record.attributes.delete(name);
    return;
  }
  const before = had ? had.before : element.getAttribute(name);
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  record.attributes.set(name, { before, wrote: value });
}

/**
 * Gives a plain element the frame's values as attributes (the spec's web notes of the field and the field group):
 * `aria-label` only where it has no name of its own, `aria-description` after any description it has, `aria-invalid`,
 * `aria-required` where its role has that state (the required text joins the description where it has not), and
 * `disabled` where the element has the property and the product did not set it. Call it again with new values; what is
 * no longer given is taken back.
 */
export function giveAttributes(element: Element, gift: PlainGift) {
  const record: Given = given.get(element) ?? { attributes: new Map(), disabled: false };
  given.set(element, record);
  write(element, record, 'aria-label', gift.label && !namesItself(element) ? gift.label : null);
  const requiredState = takesRequired(element);
  const own = record.attributes.get('aria-description')?.before ?? (record.attributes.has('aria-description') ? null : element.getAttribute('aria-description'));
  const added = [gift.description ?? '', gift.required && !requiredState ? (gift.requiredText ?? '') : ''].filter(Boolean).join(' ');
  write(element, record, 'aria-description', added ? [own ?? '', added].filter(Boolean).join(' ') : null);
  write(element, record, 'aria-invalid', gift.invalid ? 'true' : null);
  write(element, record, 'aria-required', gift.required && requiredState ? 'true' : null);
  const control = element as Element & { disabled?: unknown };
  if (typeof control.disabled === 'boolean') {
    if (gift.disabled && !control.disabled) {
      control.disabled = true;
      record.disabled = true;
    } else if (!gift.disabled && record.disabled) {
      control.disabled = false;
      record.disabled = false;
    }
  }
}

/** Takes back from `element` everything `giveAttributes()` gave it, and nothing else (FLD-23, FGR-23). */
export function takeBack(element: Element) {
  const record = given.get(element);
  if (!record) return;
  for (const name of [...record.attributes.keys()]) write(element, record, name, null);
  if (record.disabled) (element as Element & { disabled: boolean }).disabled = false;
  given.delete(element);
}

// ── The frame's side ───────────────────────────────────────────────────────────────────────────────────────

export interface FieldProviderOptions {
  /** The elements it frames, in the order given: what its default slot holds. */
  controls: () => Element[];
  /** What it gives a control that asked; `index` is the place, among `controls()`, of the element the control is or is in. */
  state: (connection: FieldConnection, index: number) => FieldState;
  /** What it gives an element that did not ask (`null`: nothing). */
  plain: (element: Element, index: number) => PlainGift | null;
}

/**
 * The frame's side: hears the controls inside it ask, keeps their connections, and on `sync()` — after every render of
 * the host and on every `slotchange` — tells each its state now, gives plain attributes to what did not ask, and takes
 * back from what left. It asks the controls already inside it to ask again when the host is connected, so the order in
 * which the elements were defined does not matter.
 */
export class FieldProviderController implements ReactiveController {
  /** The controls that asked, by element. */
  readonly connections = new Map<Element, FieldConnection>();
  private readonly plain = new Set<Element>();
  private readonly awaited = new Set<string>();

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement,
    private readonly options: FieldProviderOptions,
  ) {
    host.addController(this);
    host.addEventListener(FIELD_CONNECT, this.onConnect as EventListener);
  }

  hostConnected() {
    // Controls that were upgraded before this element was: each asks again, and the nearest frame — this one, for those
    // that have no nearer — answers.
    for (const element of this.host.querySelectorAll('*')) (element as unknown as Record<symbol, FieldControlController | undefined>)[FIELD_CONTROL]?.ask();
  }

  hostDisconnected() {
    this.release();
  }

  private readonly onConnect = (event: CustomEvent<FieldConnection>) => {
    const connection = event.detail;
    const control = connection?.control;
    // The host's own question, to a frame around it, goes on.
    if (!control || control === this.host || typeof connection.update !== 'function') return;
    event.stopPropagation();
    this.connections.set(control, connection);
    // What the control says of itself later (FLD-25, FLD-26, FLD-28) draws the host again.
    connection.said = () => this.host.requestUpdate();
    const index = this.indexOf(control);
    // What it was given as a plain element — before it was defined, or as the wrapper of this control — goes back.
    for (const element of [...this.plain]) {
      if (composedContains(element, control)) {
        takeBack(element);
        this.plain.delete(element);
      }
    }
    connection.update(this.options.state(connection, index));
    this.host.requestUpdate();
  };

  /** The place, among the framed elements, of the one `control` is or is inside; -1 when it is in none. */
  indexOf(control: Element, controls = this.options.controls()): number {
    return controls.findIndex((element) => composedContains(element, control));
  }

  /** The connection of the control that the framed element `element` is, or holds. */
  connectionIn(element: Element): FieldConnection | undefined {
    for (const [control, connection] of this.connections) if (composedContains(element, control)) return connection;
    return undefined;
  }

  /** What the control that the framed element `element` is, or holds, says of itself now; nothing for one that says nothing. */
  says(element: Element | undefined): FieldSays {
    return (element && this.connectionIn(element)?.says?.()) || {};
  }

  /** Tells every control its state now, and takes back from those that left. */
  sync() {
    const controls = this.options.controls();
    for (const [control, connection] of [...this.connections]) {
      const index = this.indexOf(control, controls);
      if (index < 0 || !control.isConnected) {
        this.connections.delete(control);
        connection.update(null);
      } else connection.update(this.options.state(connection, index));
    }
    const now = new Set<Element>();
    controls.forEach((element, index) => {
      if (this.connectionIn(element)) return;
      // An element that is not defined yet may still ask: it is given nothing until it is known not to.
      if (element.localName.includes('-') && !customElements.get(element.localName)) {
        if (!this.awaited.has(element.localName)) {
          this.awaited.add(element.localName);
          void customElements.whenDefined(element.localName).then(() => this.host.isConnected && this.host.requestUpdate());
        }
        return;
      }
      const gift = this.options.plain(element, index);
      if (!gift) return;
      giveAttributes(element, gift);
      now.add(element);
    });
    for (const element of [...this.plain]) {
      if (!now.has(element)) {
        takeBack(element);
        this.plain.delete(element);
      }
    }
    for (const element of now) this.plain.add(element);
  }

  /** Lets every control go: the host left the document. */
  private release() {
    for (const [, connection] of this.connections) connection.update(null);
    this.connections.clear();
    for (const element of this.plain) takeBack(element);
    this.plain.clear();
  }
}
