import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { AvailabilityController, GlyphDrawnController, PressController, SystemWatchController, compChoice, modalLayer, report, styleQueries, syncFocusStyle, WordsController } from '../../primitives/index.js';
import { INVERSE, INVERSE_PROPERTY, INVERSE_TOKEN, STATUSES, hostStyles, styles } from './snackbar.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** How long a snackbar stays by itself: auto is short without an action and indefinite with one (WCAG 2.2.1). */
export type TanreiSnackbarDuration = 'auto' | 'short' | 'long' | 'indefinite';
/** The form of a snackbar: the neutral bar, or a status form with its glyph (SNK-21). */
export type TanreiSnackbarStatus = 'default' | 'info' | 'warning' | 'error' | 'success';
/** Why a snackbar closed without its action. */
export type TanreiSnackbarDismissReason = 'close' | 'escape' | 'timeout' | 'host';
/** What `dismiss` carries. */
export interface TanreiSnackbarDismissDetail {
  reason: TanreiSnackbarDismissReason;
}
/** What `expandedchange` carries: the new `expanded`. */
export interface TanreiSnackbarExpandedChangeDetail {
  expanded: boolean;
}
/** What `<tanrei-snackbar-host>.show()` takes: the snackbar's props (`title` is the snackbar's `headline`). */
export interface TanreiSnackbarOptions {
  message: string;
  title?: string;
  action?: string;
  status?: TanreiSnackbarStatus;
  statusLabel?: string;
  /** Drawn inverse (true), on a surface of the scheme (false), or as the system chooses (null, the default): SNK-30. */
  inverse?: boolean | null;
  closable?: boolean;
  closeLabel?: string;
  expandLabel?: string;
  duration?: TanreiSnackbarDuration;
}
/** How a snackbar the host showed closed: with its action, or dismissed and why. */
export type TanreiSnackbarResult = { result: 'action' } | { result: 'dismiss'; reason: TanreiSnackbarDismissReason };

const DURATIONS: readonly TanreiSnackbarDuration[] = ['auto', 'short', 'long', 'indefinite'];
/** SNK-21: each status form's glyph from the system's icon set. */
const GLYPHS: Record<(typeof STATUSES)[number], string> = { info: 'info', warning: 'warning', error: 'error', success: 'check_circle' };

/**
 * SNK-30: `inverse` is true, false or null, and its attribute says which: absent is null, present (empty, `true` or
 * anything else) is true, and `inverse="false"` is false — the one way to refuse a system whose choice is on.
 */
const inverseConverter = {
  fromAttribute: (value: string | null): boolean | null => (value === null ? null : value.trim().toLowerCase() !== 'false'),
  toAttribute: (value: unknown): string | null => (value === true ? '' : value === false ? 'false' : null),
};

/** How many lines an element of text takes. */
const lines = (el: HTMLElement | null | undefined) => {
  if (!el) return 0;
  const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 0;
  return line ? Math.round(el.getBoundingClientRect().height / line) : 1;
};
/** Whether a clamped element of text is cut. */
const cut = (el: HTMLElement | null | undefined) => !!el && el.scrollHeight > el.clientHeight + 0.5;

/**
 * Tells a person briefly, at the bottom edge of the screen, what the app just did or what happened (neutrally, or as
 * information, a warning, an error or a success), with at most one action, without taking focus or interrupting their
 * work.
 *
 * Contract: specs/snackbar.spec.json. Shown by a `<tanrei-snackbar-host>` (`host.show({ message, action })`), which
 * queues, places, times, announces and closes it. Drawn outside a host (a documentation page, a test) it is drawn in
 * place, at rest: no timeout, queue, entrance or announcement (SNK-19); it still fires `action`, `dismiss` and
 * `expandedchange`.
 *
 * It is drawn on a raised surface of the scheme or, `inverse`, as a bar of the opposite scheme; left unset, the system
 * chooses (`--tanrei-comp-snackbar-container-inverse`, off in the default system). That and its `status` make its form,
 * one of ten, and the form changes colors only (SNK-30).
 *
 * The action, the expand button and the close button are the snackbar's own controls, drawn from
 * `--tanrei-comp-snackbar-action-*` and `-close-*` tokens per state and form; the bar from
 * `--tanrei-comp-snackbar-container-*`, or its form's `-<status>-*`, `-inverse-*` or `-inverse-<status>-*`. The keyboard
 * focus indicator's outer stroke is the form's `-focus-ring-color` (SNK-3). The content is aligned to the top of the bar
 * (SNK-29).
 *
 * `title` is the `headline` property and attribute, because HTML's global `title` would show a tooltip over the bar.
 *
 * @tag tanrei-snackbar
 * @csspart container - The bar: its color, corners, elevation and padding.
 * @csspart icon - The status glyph, in a status form.
 * @csspart text - The title and the message; it scrolls while expanded and taller than the bar may be.
 * @csspart title - The title.
 * @csspart supporting-text - The message.
 * @csspart action - The action button.
 * @csspart expand - The expand button, while the text is longer than its collapsed limit.
 * @csspart close - The close button.
 * @fires action - The action was activated; the snackbar closes.
 * @fires {CustomEvent<TanreiSnackbarDismissDetail>} dismiss - The snackbar closed without its action: `detail.reason` is `close`, `escape`, `timeout` or `host`.
 * @fires {CustomEvent<TanreiSnackbarExpandedChangeDetail>} expandedchange - The person expanded or collapsed the text with the expand button: `detail.expanded` is the new value. Not fired when the product sets `expanded`.
 */
export class TanreiSnackbar extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'snackbar');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  static override styles = [styles, hiddenHost];

  static override properties: PropertyDeclarations = {
    message: { type: String },
    headline: { type: String },
    action: { type: String },
    status: { type: String, reflect: true },
    statusLabel: { type: String, attribute: 'status-label' },
    inverse: { reflect: true, converter: inverseConverter },
    closable: { type: Boolean, reflect: true },
    closeLabel: { type: String, attribute: 'close-label' },
    expanded: { type: Boolean, reflect: true },
    expandLabel: { type: String, attribute: 'expand-label' },
    duration: { type: String, reflect: true },
    stacked: { state: true },
    expandable: { state: true },
    scrolls: { state: true },
  };

  /** What happened; with a title, the description. Required. Plain text: the whole message is announced. */
  message = '';

  /** The title above the message ("Message not sent"): the spec's `title`. Empty draws the message alone. */
  headline = '';

  /** The label of the one action ("Undo"), drawn as a tonal button. Empty draws no action. */
  action = '';

  /** The form: `default`, or `info`, `warning`, `error` or `success` with its glyph and colors. */
  status: TanreiSnackbarStatus = 'default';

  /** The status in words, in the product's language ("Error"), announced first. Required while `status` is not default. */
  statusLabel = '';

  /**
   * Whether it is drawn inverse — in the opposite scheme's colors, a dark bar in a light scheme. `false` draws it on a
   * surface of the scheme; `null`, the default, takes the system's choice (`comp.snackbar.container.inverse`, off in the
   * default system). The attribute: absent is null, `inverse` is true, `inverse="false"` is false. Colors only.
   */
  inverse: boolean | null = null;

  /** Draws a close button. */
  closable = false;

  /** The close button's accessible name, in the product's language ("Close"). Required while `closable` is set. */
  closeLabel = '';

  /** Whether the whole title and message show. No effect while they fit within their collapsed limits. */
  expanded = false;

  /** The expand button's accessible name ("Show full message"), the same in both states. Required while it is drawn. */
  expandLabel = '';

  /** How long it stays by itself: `auto` is short without an action and indefinite with one. */
  duration: TanreiSnackbarDuration = 'auto';

  /** SNK-16: the action on its own row. */
  private stacked = false;
  /** SNK-23: the title or the message is longer than its collapsed limit, so the expand button is drawn. */
  private expandable = false;
  /** SNK-25: the expanded text scrolls inside the bar, so it is a focus stop. */
  private scrolls = false;

  private readonly actionPress = this.press('.action');
  private readonly expandPress = this.press('.expand');
  private readonly closePress = this.press('.close');

  /** SNK-26: each glyph box carries `data-drawn` while the icon set can draw its ligature; until then it draws nothing. */
  protected readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.status, .icon') ?? []);

  private readonly resize$ = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.layout());
  /** Set once it has emitted how it closed: a snackbar closes once. */
  private settled = false;
  /** SNK-24: the bar's height before `expanded` changed, which it grows or shrinks from. */
  private resizeFrom: number | null = null;
  /** SNK-30, without style queries: renders again when the root switches the system, so the choice is read again. */
  private systemWatch: SystemWatchController | null = null;
  /** SNK-30, without style queries: the form the bar is rendered in (`data-inverse`); null where the cascade says it. */
  private writtenInverse: 'on' | 'off' | null = null;

  constructor() {
    super();
    this.addEventListener('keydown', this.onKeyDown);
  }

  private press(selector: string) {
    return new PressController(this, {
      container: () => this.renderRoot?.querySelector<HTMLElement>(selector) ?? null,
      holdCarrier: () => this.renderRoot.querySelector(`${selector} .hold`),
      disabled: () => false,
    });
  }

  /** Whether a host shows it (else it is drawn in place, SNK-19). */
  get hosted(): boolean {
    return this.parentElement instanceof TanreiSnackbarHost;
  }

  /** The status form it draws: an unknown value is the default. */
  private get form(): TanreiSnackbarStatus {
    return (STATUSES as readonly string[]).includes(this.status) ? this.status : 'default';
  }

  /**
   * @internal Whether it is drawn inverse right now (SNK-30): `inverse` when it is true or false, else the system's choice as
   * the cascade gives it at this moment — never cached, and an unknown name is the first value (off).
   */
  get drawnInverse(): boolean {
    return compChoice(this, INVERSE_PROPERTY, INVERSE) === 'on';
  }

  /** @internal SNK-9, SNK-23: whether it shows its whole text (expanded, and longer than its collapsed limits). */
  get showsExpanded(): boolean {
    return this.expanded && this.expandable;
  }

  /** @internal SNK-10: whether it is announced assertively (warning and error). */
  get assertive(): boolean {
    return this.form === 'warning' || this.form === 'error';
  }

  /** SNK-8: how long it stays by itself, in ms, as the tokens resolve now; `null` never times out. */
  get timeout(): number | null {
    const duration = DURATIONS.includes(this.duration) ? this.duration : 'auto';
    const kind = duration === 'auto' ? (this.action ? 'indefinite' : 'short') : duration;
    if (kind === 'indefinite') return null;
    const probe = this.renderRoot?.querySelector('.timing');
    if (!probe) return null;
    const style = getComputedStyle(probe);
    return (Number.parseFloat(kind === 'short' ? style.transitionDelay : style.transitionDuration) || 0) * 1000;
  }

  /** What is announced (SNK-10): statusLabel in a status form, the title, the whole message, then the action's label. */
  get announcement(): string {
    const status = this.form === 'default' ? '' : this.statusLabel;
    return [status, this.headline, this.message, this.action]
      .map((part) => part.trim())
      .filter(Boolean)
      .reduce((said, part) => (said ? `${said}${/[.!?。！？]$/u.test(said) ? ' ' : '. '}${part}` : part), '');
  }

  /** @internal The host closed it (dismissCurrent, clear): `dismiss` with the reason host. */
  dismissByHost() {
    this.settle('dismiss', 'host');
  }

  /** @internal The host's timeout ran out. */
  dismissByTimeout() {
    this.settle('dismiss', 'timeout');
  }

  /** Emits how it closed, once. */
  private settle(how: 'action' | 'dismiss', reason?: TanreiSnackbarDismissReason) {
    if (this.settled && this.hosted) return;
    this.settled = this.hosted;
    if (how === 'action') this.dispatchEvent(new CustomEvent('action', { bubbles: true }));
    else this.dispatchEvent(new CustomEvent<TanreiSnackbarDismissDetail>('dismiss', { bubbles: true, detail: { reason: reason! } }));
  }

  /** SNK-1: the action, by pointer, touch, Enter or Space (the native button's click). */
  private readonly onAction = () => this.settle('action');
  /** SNK-1: the close button. */
  private readonly onClose = () => this.settle('dismiss', 'close');
  /** SNK-24: the expand button toggles `expanded` and says so; focus stays on it, and the snackbar stays open. */
  private readonly onExpand = () => {
    this.expanded = !this.expanded;
    this.dispatchEvent(new CustomEvent<TanreiSnackbarExpandedChangeDetail>('expandedchange', { bubbles: true, detail: { expanded: this.expanded } }));
  };

  /** SNK-11: Escape while focus is inside closes it. */
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    this.settle('dismiss', 'escape');
  };

  /** SNK-7: where style queries are missing, the focus style is read when focus arrives. */
  private readonly onFocus = (event: FocusEvent) => syncFocusStyle(this, event.target as HTMLElement);

  /**
   * SNK-16, SNK-23, SNK-25, measured with the text collapsed:
   * - the action goes onto its own row when the title and the message together would need more than two lines beside
   *   the controls, or the action's label would not fit (measured with the action inline);
   * - the expand button is drawn when the title or the message is cut at its line limit (measured as it is drawn);
   * - expanded, the text is a focus stop when it scrolls inside the bar (measured as it is drawn).
   */
  private layout() {
    const bar = this.renderRoot?.querySelector<HTMLElement>('.bar');
    const text = this.renderRoot?.querySelector<HTMLElement>('.text');
    const title = this.renderRoot?.querySelector<HTMLElement>('.title');
    const message = this.renderRoot?.querySelector<HTMLElement>('.message');
    const action = this.renderRoot?.querySelector<HTMLElement>('.action');
    if (!bar || !text || !message) return;
    // SNK-24: while the bar grows or shrinks its height is the motion's, not its content's: measured when it ends.
    if (bar.classList.contains('resizing')) return;
    bar.classList.remove('stacked', 'expanded');
    const stacked = !!action && (lines(title) + lines(message) > 2 || action.scrollWidth > action.clientWidth + 0.5);
    bar.classList.toggle('stacked', stacked);
    const expandable = cut(title) || cut(message);
    bar.classList.toggle('stacked', this.stacked);
    bar.classList.toggle('expanded', this.showsExpanded);
    const scrolls = this.showsExpanded && text.scrollHeight > text.clientHeight + 0.5;
    if (stacked !== this.stacked) this.stacked = stacked;
    if (expandable !== this.expandable) this.expandable = expandable;
    if (scrolls !== this.scrolls) this.scrolls = scrolls;
  }

  /** SNK-24: grows or shrinks the bar from its height before, keeping its bottom edge where a host places it. */
  private resize(from: number) {
    const bar = this.renderRoot.querySelector<HTMLElement>('.bar');
    const probe = this.renderRoot.querySelector('.expand-timing');
    if (!bar || !probe || typeof bar.animate !== 'function') return;
    for (const running of bar.getAnimations()) running.cancel();
    const to = bar.getBoundingClientRect().height;
    if (Math.abs(to - from) < 0.5 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const style = getComputedStyle(probe);
    const duration = (Number.parseFloat(style.transitionDuration) || 0) * 1000;
    if (!duration) return;
    bar.classList.add('resizing');
    const motion = bar.animate([{ blockSize: `${from}px` }, { blockSize: `${to}px` }], { duration, easing: style.transitionTimingFunction });
    const done = () => {
      // Only the motion still running may end it: one cancelled by the next toggle leaves `resizing` to that one.
      if (bar.getAnimations().some((other) => other !== motion && other.playState === 'running')) return;
      bar.classList.remove('resizing');
      this.layout();
    };
    motion.addEventListener('finish', done);
    motion.addEventListener('cancel', done);
  }

  protected override firstUpdated() {
    const bar = this.renderRoot.querySelector('.bar');
    const text = this.renderRoot.querySelector('.text');
    if (bar) this.resize$?.observe(bar);
    if (text) this.resize$?.observe(text);
    this.resize$?.observe(this);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resize$?.disconnect();
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this.firstUpdated();
  }

  protected override willUpdate(changed: PropertyValues<this>) {
    // SNK-24: only a change of `expanded` moves (the expand button appearing on the first layout does not).
    if (changed.has('expanded') && this.hasUpdated && this.expandable) this.resizeFrom = this.renderRoot.querySelector('.bar')?.getBoundingClientRect().height ?? null;
    // SNK-30: where a browser has no style queries, the form the cascade names now is written for the same rules —
    // read here, before the bar is rendered, and rendered with it: a bar that is first drawn in the default form and
    // told its form afterwards would move its controls' colors there (motion.state-duration) each time it appears.
    // (`inverse` itself and not its attribute, which is written after this; unset, the token as the host inherits it.)
    if (!styleQueries()) {
      this.writtenInverse = (this.inverse ?? compChoice(this, INVERSE_TOKEN, INVERSE) === 'on') ? 'on' : 'off';
      // A style query follows a system switched on the root by itself; here the choice is read again when it is.
      this.systemWatch ??= new SystemWatchController(this);
    }
  }

  protected override updated(changed: PropertyValues<this>) {
    const has = (name: string) => changed.has(name as keyof TanreiSnackbar);
    if (['message', 'headline', 'action', 'status', 'closable', 'expanded', 'stacked', 'expandable'].some(has)) this.layout();
    if (has('expanded') || has('expandable')) {
      if (!this.showsExpanded) this.renderRoot.querySelector('.text')?.scrollTo({ top: 0 });
      if (this.resizeFrom !== null) this.resize(this.resizeFrom);
      this.resizeFrom = null;
      // SNK-9: the host pauses the timeout while it is expanded.
      if (this.hosted) (this.parentElement as TanreiSnackbarHost).refresh();
    }
    // SNK-20: what a debug build tells the product.
    if (has('message') && !this.message.trim()) report(this, 'SNK-20', 'message is empty; give the snackbar a message');
    if ((has('closable') || has('closeLabel')) && this.closable && this.words.lacks('closeLabel', this.closeLabel)) {
      report(this, 'SNK-20', 'closable is set but close-label is empty, so the close button has no accessible name; give it a close-label');
    }
    if ((has('status') || has('statusLabel')) && this.form !== 'default' && !this.statusLabel.trim()) {
      report(this, 'SNK-20', `status is "${this.form}" but status-label is empty, so the status is not given in words; give it a status-label`);
    }
    if ((has('expandable') || has('expandLabel')) && this.expandable && this.words.lacks('expandLabel', this.expandLabel)) {
      report(this, 'SNK-20', 'the text is longer than its collapsed limit, so the expand button is drawn, but expand-label is empty and it has no accessible name; give it an expand-label');
    }
    if ((has('duration') || has('action')) && this.action && (this.duration === 'short' || this.duration === 'long')) {
      report(this, 'SNK-20', `a snackbar that times out (duration "${this.duration}") has the action "${this.action}"; offer it elsewhere too, because a person may not reach it in time (WCAG 2.2.1)`);
    }
  }

  private control(name: 'action' | 'expand' | 'close', press: PressController, onClick: () => void, content: unknown, attributes: { label?: string; expanded?: boolean } = {}) {
    return html`<button
      part=${name}
      class="control ${name}"
      type="button"
      data-tanrei-shape
      aria-label=${attributes.label || nothing}
      aria-expanded=${attributes.expanded === undefined ? nothing : String(attributes.expanded)}
      aria-controls=${attributes.expanded === undefined ? nothing : 'text'}
      @click=${onClick}
      @focus=${this.onFocus}
      @pointerdown=${press.onPointerDown}
      @pointerup=${press.release}
      @pointercancel=${press.release}
      @pointerleave=${press.release}
      @keydown=${press.onKeyDown}
      @keyup=${press.onKeyUp}
      @blur=${press.onBlur}
    >
      ${content}
    </button>`;
  }

  protected override render() {
    const action = this.action.trim();
    const headline = this.headline.trim();
    const form = this.form;
    const expanded = this.showsExpanded;
    const glyph = (name: string) => html`<span class="icon hold" aria-hidden="true"><span class="ink">${name}</span></span>`;
    return html`
      <div
        part="container"
        class=${classMap({ bar: true, titled: !!headline, controls: !!action || this.closable || this.expandable, stacked: this.stacked && !!action, expanded, cut: this.expandable && !expanded })}
        data-status=${form}
        data-inverse=${this.writtenInverse ?? nothing}
        data-tanrei-shape
      >
        ${form === 'default' ? nothing : html`<span part="icon" class="status" aria-hidden="true"><span class="ink">${GLYPHS[form]}</span></span>`}
        <div
          part="text"
          class="text"
          id="text"
          data-tanrei-shape
          tabindex=${this.scrolls ? '0' : nothing}
          role=${this.scrolls && headline ? 'group' : nothing}
          aria-labelledby=${this.scrolls && headline ? 'title' : nothing}
          @focus=${this.onFocus}
        >
          ${form !== 'default' && this.statusLabel.trim() ? html`<span class="status-label">${this.statusLabel}</span>` : nothing}
          ${headline ? html`<span part="title" class="title" id="title">${this.headline}</span>` : nothing}
          <span part="supporting-text" class="message">${this.message}</span>
        </div>
        <span class="focus" data-tanrei-shape></span>
        ${action ? this.control('action', this.actionPress, this.onAction, html`<span class="hold">${action}</span>`) : nothing}
        ${this.expandable ? this.control('expand', this.expandPress, this.onExpand, glyph(expanded ? 'expand_less' : 'expand_more'), { label: this.words.get('expandLabel', this.expandLabel), expanded }) : nothing}
        ${this.closable ? this.control('close', this.closePress, this.onClose, glyph('close'), { label: this.words.get('closeLabel', this.closeLabel) }) : nothing}
      </div>
      <span class="timing" aria-hidden="true"></span>
      <span class="expand-timing" aria-hidden="true"></span>
    `;
  }
}

interface Request {
  options: TanreiSnackbarOptions;
  resolve: (result: TanreiSnackbarResult) => void;
}

/**
 * Shows snackbars, one at a time, in the order they were asked for (SNK-12), at the bottom of the window (SNK-13).
 * Place it once, as the last element of the page: its place in the focus order is where a snackbar's controls are
 * (SNK-11). It holds the two live regions their messages are announced in (SNK-10) — polite (`role="status"`) for the
 * default, info and success forms, assertive (`role="alert"`) for warning and error — so it must be in the document
 * before the first one.
 *
 * `show(options)` resolves once that snackbar has closed: `{ result: 'action' }` or `{ result: 'dismiss', reason }`.
 * `dismissCurrent()` closes the showing one (reason `host`); `clear()` also drops every waiting one.
 *
 * @tag tanrei-snackbar-host
 * @slot - The snackbar being shown (the host puts it there).
 */
export class TanreiSnackbarHost extends TanreiElement {
  static override styles = [hostStyles, hiddenHost];

  private readonly queue: Request[] = [];
  private current: { request: Request; snackbar: TanreiSnackbar } | null = null;
  /** A snackbar fading out: the next waits for it (SNK-17). */
  private closing: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private hovered = false;
  private focusedInside = false;
  /** SNK-11: where focus was before it entered the snackbar. */
  private returnFocus: Element | null = null;
  private unsubscribe: (() => void) | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = modalLayer.subscribe(this.onConditions);
    document.addEventListener('visibilitychange', this.onConditions);
    window.addEventListener('blur', this.onConditions);
    window.addEventListener('focus', this.onConditions);
    window.visualViewport?.addEventListener('resize', this.onViewport);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
    document.removeEventListener('visibilitychange', this.onConditions);
    window.removeEventListener('blur', this.onConditions);
    window.removeEventListener('focus', this.onConditions);
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    clearTimeout(this.timer);
  }

  /** SNK-12: asks for a snackbar; resolves once it has closed. */
  show(options: TanreiSnackbarOptions): Promise<TanreiSnackbarResult> {
    return new Promise((resolve) => {
      this.queue.push({ options, resolve });
      void this.next();
    });
  }

  /** SNK-12: closes the showing snackbar (dismiss, reason host); the next waiting one then shows. */
  dismissCurrent() {
    this.current?.snackbar.dismissByHost();
  }

  /** SNK-12: drops every waiting snackbar and closes the showing one, each resolved with dismiss and the reason host. */
  clear() {
    for (const request of this.queue.splice(0)) request.resolve({ result: 'dismiss', reason: 'host' });
    this.dismissCurrent();
  }

  /** The snackbar being shown, if any. */
  get snackbar(): TanreiSnackbar | null {
    return this.current?.snackbar ?? null;
  }

  /** @internal SNK-9: the showing snackbar was expanded or collapsed; its timeout pauses or starts again. */
  refresh() {
    this.onConditions();
  }

  /** Shows the next waiting snackbar once nothing is showing or closing and no modal dialog covers the host. */
  private async next() {
    if (this.current || this.closing || modalLayer.covered || !this.isConnected) return;
    const request = this.queue.shift();
    if (!request) return;
    const snackbar = document.createElement('tanrei-snackbar');
    const { message, title = '', action = '', status = 'default', statusLabel = '', inverse = null, closable = false, closeLabel = '', expandLabel = '', duration = 'auto' } = request.options;
    Object.assign(snackbar, { message, headline: title, action, status, statusLabel, inverse, closable, closeLabel, expandLabel, duration });
    snackbar.setAttribute('popover', 'manual');
    this.current = { request, snackbar };
    snackbar.addEventListener('action', this.onSettled);
    snackbar.addEventListener('dismiss', this.onSettled);
    snackbar.addEventListener('pointerenter', this.onPointerEnter);
    snackbar.addEventListener('pointerleave', this.onPointerLeave);
    snackbar.addEventListener('focusin', this.onFocusIn);
    snackbar.addEventListener('focusout', this.onFocusOut);
    this.append(snackbar);
    await snackbar.updateComplete;
    if (this.current?.snackbar !== snackbar) return;
    snackbar.showPopover();
    // SNK-17: it rises in while fading in (only fades where motion is reduced).
    snackbar.classList.add('entering');
    void Promise.allSettled(snackbar.getAnimations().map((a) => a.finished)).then(() => snackbar.classList.remove('entering'));
    this.announce(snackbar.announcement, snackbar.assertive);
    this.onConditions();
  }

  /** SNK-10: announced once, politely or assertively, through the host's live regions; focus is never moved. */
  private announce(text: string, assertive: boolean) {
    const region = this.renderRoot.querySelector(assertive ? '.announce[role="alert"]' : '.announce[role="status"]');
    this.clearAnnouncements();
    if (!region) return;
    // A frame later, so a message equal to the last one is announced again.
    requestAnimationFrame(() => (region.textContent = text));
  }

  private clearAnnouncements() {
    for (const region of this.renderRoot.querySelectorAll('.announce')) region.textContent = '';
  }

  /** SNK-8, SNK-9: the timeout runs only while nothing holds it, and starts again from its whole length. */
  private readonly onConditions = () => {
    const current = this.current;
    clearTimeout(this.timer);
    if (!current) {
      void this.next();
      return;
    }
    const held =
      this.hovered || this.focusedInside || current.snackbar.showsExpanded || document.visibilityState === 'hidden' || !document.hasFocus() || modalLayer.covered;
    const timeout = current.snackbar.timeout;
    if (held || timeout === null) return;
    this.timer = setTimeout(() => current.snackbar.dismissByTimeout(), timeout);
  };

  /** SNK-13: above the on-screen keyboard (the part of the layout viewport the visual viewport no longer covers). */
  private readonly onViewport = () => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const covered = Math.max(0, document.documentElement.clientHeight - (viewport.offsetTop + viewport.height));
    this.style.setProperty('--tanrei-snackbar-keyboard', `${covered}px`);
  };

  private readonly onPointerEnter = () => {
    this.hovered = true;
    this.onConditions();
  };

  private readonly onPointerLeave = () => {
    this.hovered = false;
    this.onConditions();
  };

  private readonly onFocusIn = (event: FocusEvent) => {
    if (!this.focusedInside) this.returnFocus = event.relatedTarget instanceof Element ? event.relatedTarget : null;
    this.focusedInside = true;
    this.onConditions();
  };

  private readonly onFocusOut = (event: FocusEvent) => {
    const to = event.relatedTarget as Node | null;
    const snackbar = this.current?.snackbar;
    if (snackbar && to && (snackbar.contains(to) || snackbar.renderRoot.contains(to))) return;
    this.focusedInside = false;
    this.returnFocus = null;
    this.onConditions();
  };

  /** SNK-1, SNK-12: the snackbar closed; its request resolves, it fades out, then the next shows. */
  private readonly onSettled = (event: Event) => {
    const current = this.current;
    if (!current || event.target !== current.snackbar) return;
    const { snackbar, request } = current;
    this.current = null;
    clearTimeout(this.timer);
    const result: TanreiSnackbarResult = event.type === 'action' ? { result: 'action' } : { result: 'dismiss', reason: (event as CustomEvent<TanreiSnackbarDismissDetail>).detail.reason };
    // SNK-11: focus goes back where it was before it entered the snackbar, or to the platform's default.
    const active = (snackbar.getRootNode() as Document).activeElement;
    const hadFocus = this.focusedInside || active === snackbar;
    this.hovered = false;
    this.focusedInside = false;
    if (hadFocus) {
      const back = this.returnFocus;
      if (back && back.isConnected && typeof (back as HTMLElement).focus === 'function') (back as HTMLElement).focus();
      else {
        // The deepest focused element, which a blur on its shadow host would not reach in every engine.
        let active: Element | null = document.activeElement;
        while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
        (active as HTMLElement | null)?.blur?.();
      }
    }
    this.returnFocus = null;
    this.clearAnnouncements();
    request.resolve(result);
    // SNK-17: it fades out in place; the next one shows only after that.
    snackbar.classList.remove('entering');
    snackbar.classList.add('leaving');
    this.closing = Promise.allSettled(snackbar.getAnimations().map((a) => a.finished)).then(() => {
      if (snackbar.matches(':popover-open')) snackbar.hidePopover();
      snackbar.remove();
      this.closing = null;
      void this.next();
    });
  };

  protected override render() {
    return html`<div class="announce" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="announce" role="alert" aria-live="assertive" aria-atomic="true"></div>
      <slot></slot>`;
  }
}

if (!customElements.get('tanrei-snackbar')) customElements.define('tanrei-snackbar', TanreiSnackbar);
if (!customElements.get('tanrei-snackbar-host')) customElements.define('tanrei-snackbar-host', TanreiSnackbarHost);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-snackbar': TanreiSnackbar;
    'tanrei-snackbar-host': TanreiSnackbarHost;
  }
}
