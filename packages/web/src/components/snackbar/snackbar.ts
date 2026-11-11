import { type PropertyDeclarations, type PropertyValues, adoptStyles, html, nothing, render } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AppearController,
  AvailabilityController,
  BUTTON_VARIANTS,
  GlyphDrawnController,
  PressController,
  SystemWatchController,
  compChoice,
  containedWheel,
  deepActive,
  focusWithin,
  giveTone,
  giveVariant,
  modalLayer,
  motionReduced,
  readTogether,
  report,
  styleQueries,
  syncFocusStyle,
  WordsController,
} from '../../primitives/index.js';
import '../button/button.js';
import { BUTTON_TONE, INVERSE, INVERSE_PROPERTY, INVERSE_TOKEN, STATUSES, hostStyles, mouthStyles, styles } from './snackbar.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** How long a snackbar stays by itself: auto is short without an action and indefinite with one (WCAG 2.2.1). */
export type TanreiSnackbarDuration = 'auto' | 'short' | 'long' | 'indefinite';
/** The form of a snackbar: the neutral bar, or a status form with its glyph (SNK-21). */
export type TanreiSnackbarStatus = 'default' | 'info' | 'warning' | 'error' | 'success';
/** Where the host places a snackbar: the bottom edge, centred (SNK-13), or the top edge at the end side (SNK-35). */
export type TanreiSnackbarPlacement = 'bottom' | 'top-end';
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
  /** Where it stands (SNK-35): left out, the host's own `placement`. */
  placement?: TanreiSnackbarPlacement;
}
/** How a snackbar the host showed closed: with its action, or dismissed and why. */
export type TanreiSnackbarResult = { result: 'action' } | { result: 'dismiss'; reason: TanreiSnackbarDismissReason };

const DURATIONS: readonly TanreiSnackbarDuration[] = ['auto', 'short', 'long', 'indefinite'];
/** SNK-21: each status form's glyph from the system's icon set. */
const GLYPHS: Record<(typeof STATUSES)[number], string> = { info: 'info', warning: 'warning', error: 'error', success: 'check_circle' };
/** The glyphs of the bar's controls: expand while collapsed, collapse while expanded, close. */
const CONTROL_GLYPHS = { expand: 'expand_more', collapse: 'expand_less', close: 'close' } as const;

/**
 * SNK-30: `inverse` is true, false or null, and its attribute says which: absent is null, present (empty, `true` or
 * anything else) is true, and `inverse="false"` is false — the one way to refuse a system whose choice is on.
 */
const inverseConverter = {
  fromAttribute: (value: string | null): boolean | null => (value === null ? null : value.trim().toLowerCase() !== 'false'),
  toAttribute: (value: unknown): string | null => (value === true ? '' : value === false ? 'false' : null),
};

/**
 * An element's height as it is laid out, in CSS pixels: what its computed block size resolves to. A bar that appears
 * is drawn scaled (SNK-17), and its drawn box (`getBoundingClientRect()`) is that much shorter — under `unfold` none
 * at its first frame — while its layout is the one at rest.
 */
const laidHeight = (el: HTMLElement) => Number.parseFloat(getComputedStyle(el).blockSize) || 0;
/** How many lines an element of text takes, as it is laid out. */
const lines = (el: HTMLElement | null | undefined) => {
  if (!el) return 0;
  const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 0;
  return line ? Math.round(laidHeight(el) / line) : 1;
};
/** Whether a clamped element of text is cut. */
const cut = (el: HTMLElement | null | undefined) => !!el && el.scrollHeight > el.clientHeight + 0.5;

/**
 * Tells a person briefly, at the bottom edge of the screen or at its top end, what the app just did or what happened
 * (neutrally, or as information, a warning, an error or a success), with at most one action, without taking focus or
 * interrupting their work.
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
 * The action is the snackbar's own control, drawn from `--tanrei-comp-snackbar-action-*` tokens per state and form; the
 * bar from `--tanrei-comp-snackbar-container-*`, or its form's `-<status>-*`, `-inverse-*` or `-inverse-<status>-*`. The
 * expand and close buttons are icon-only `<tanrei-button>`s of the small size (SNK-34), in the variant
 * `--tanrei-comp-snackbar-close-button-variant` names and in the form's tone: its message color and its focus color,
 * which they draw their glyph, their circle and their states in (BTN-45). The keyboard focus indicator's outer stroke is
 * the form's `-focus-ring-color` (SNK-3). The content is aligned to the top of the bar (SNK-29).
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
 * @csspart expand - The expand button, while the text is longer than its collapsed limit: a `<tanrei-button>` (its own parts are `container` and `icon`).
 * @csspart close - The close button: a `<tanrei-button>` (its own parts are `container` and `icon`).
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
    placement: { type: String, reflect: true },
    stacked: { state: true },
    expandable: { state: true },
    scrolls: { state: true },
    shown: { state: true },
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

  /**
   * Where its host places it: `bottom`, centred at the bottom edge (SNK-13), or `top-end`, at the top edge on the end side
   * — the top right in a left-to-right layout, the top left in a right-to-left one, and across the top of a compact
   * window (SNK-35). It enters from that edge (SNK-36) and, expanding, keeps that edge in place (SNK-24, SNK-37). An
   * unknown value is `bottom`. Drawn in place, `top-end` stands at the end of the width it is given (SNK-19).
   */
  placement: TanreiSnackbarPlacement = 'bottom';

  /** SNK-16: the action on its own row. */
  private stacked = false;
  /** SNK-23: the title or the message is longer than its collapsed limit, so the expand button is drawn. */
  private expandable = false;
  /** SNK-25: the expanded text scrolls inside the bar, so it is a focus stop. */
  private scrolls = false;
  /** SNK-17: its host shows it (`appearIn()`) and has not closed it yet (`leave()`): the bar is open. */
  private shown = false;
  /**
   * SNK-17, SNK-36: the bar's appearance, while a host shows it. A bar drawn in place (SNK-19) has none: it is at rest,
   * and carries no edge, which is what its appearance's rules are written for.
   */
  private readonly appear = new AppearController(this, { motion: () => (this.hosted ? (this.renderRoot?.querySelector<HTMLElement>('.bar') ?? null) : null) });
  /** SNK-24: the bar's own motion of its height, while it grows or shrinks. */
  private sizing: Animation | null = null;

  private readonly actionPress = this.press('.action');

  /**
   * SNK-26: each glyph box — the status glyph, and the glyph it gives the expand and close Buttons — carries `data-drawn`
   * while the icon set can draw its ligature; until then it draws nothing.
   */
  protected readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.status, .glyph') ?? []);

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

  /**
   * @internal The host that shows it — in the host, or in the topmost modal surface (SNK-38) — or null: drawn in place
   * (SNK-19).
   */
  holder: TanreiSnackbarHost | null = null;

  /** Whether a host shows it (else it is drawn in place, SNK-19). */
  get hosted(): boolean {
    return this.holder !== null;
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

  /**
   * @internal SNK-17: its host has shown it (in the top layer): the bar appears — at once before the document's first
   * paint (MOT-4), else from where the appearance starts it.
   */
  appearIn(instant = false) {
    this.shown = true;
    this.appear.enter(instant);
  }

  /**
   * @internal SNK-17: its host closes it: the bar goes back the way it came, from where it is. Resolves once that has
   * played (at once where it is not drawn), when the host takes it away.
   */
  leave(): Promise<boolean> {
    this.shown = false;
    return this.appear.exit(!this.isConnected);
  }

  /**
   * @internal SNK-39: keyboard focus to its first focus stop in SNK-11's order — the text while it scrolls, the action,
   * the expand button, the close button — with its focus indicator. Returns whether focus is now inside it; false where it
   * has no stop, or where focus cannot land there (inert behind a modal dialog that is not Tanrei's).
   */
  focusFirst(): boolean {
    const root = this.renderRoot;
    const first = root?.querySelector<HTMLElement>('.text[tabindex="0"]') ?? root?.querySelector<HTMLElement>('.action') ?? root?.querySelector<HTMLElement>('tanrei-button.expand') ?? root?.querySelector<HTMLElement>('tanrei-button.close');
    if (!first) return false;
    first.focus({ focusVisible: true } as FocusOptions);
    return focusWithin(this);
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
    this.giveButtons();
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

  /**
   * SNK-24, SNK-37: grows or shrinks the bar from its height before, keeping in place the edge a host places it at — the
   * host is fixed to the bottom edge or to the top one (snackbar.styles.ts), so the bar's height alone moves.
   */
  private resize(from: number) {
    const bar = this.renderRoot.querySelector<HTMLElement>('.bar');
    const probe = this.renderRoot.querySelector('.expand-timing');
    if (!bar || !probe || typeof bar.animate !== 'function') return;
    // Its own motion only: the bar's appearance (SNK-17) may be running too, and goes on.
    this.sizing?.cancel();
    this.sizing = null;
    const to = laidHeight(bar);
    if (Math.abs(to - from) < 0.5 || motionReduced()) return;
    const style = getComputedStyle(probe);
    const duration = (Number.parseFloat(style.transitionDuration) || 0) * 1000;
    if (!duration) return;
    bar.classList.add('resizing');
    const motion = bar.animate([{ blockSize: `${from}px` }, { blockSize: `${to}px` }], { duration, easing: style.transitionTimingFunction });
    this.sizing = motion;
    const done = () => {
      // Only the motion still running may end it: one cancelled by the next toggle leaves `resizing` to the motion that
      // toggle began, if it began one.
      if (this.sizing && this.sizing !== motion) return;
      this.sizing = null;
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
    // Its height as laid out (or as its own motion has got it to), not as drawn: a bar that appears is drawn scaled.
    if (changed.has('expanded') && this.hasUpdated && this.expandable) {
      const bar = this.renderRoot.querySelector<HTMLElement>('.bar');
      this.resizeFrom = bar ? laidHeight(bar) : null;
    }
    // SNK-30: where a browser has no style queries, the form the cascade names now is written for the same rules —
    // read here, before the bar is rendered, and rendered with it: a bar that is first drawn in the default form and
    // told its form afterwards would move its controls' colors there (motion.state-duration) each time it appears.
    // (`inverse` itself and not its attribute, which is written after this; unset, the token as the host inherits it.)
    if (!styleQueries()) {
      this.writtenInverse = (this.inverse ?? compChoice(this, INVERSE_TOKEN, INVERSE) === 'on') ? 'on' : 'off';
      // A style query follows a system switched on the root by itself; here the choice is read again when it is.
      this.systemWatch ??= new SystemWatchController(this);
    }
    this.giveButtons();
  }

  /**
   * SNK-34: the expand and close Buttons, given through the Button's internal channel the variant the snackbar's token
   * names — read at each render and layout, so a system switch is seen at the next one — and the tone of the form, which
   * is the same two custom properties in every form: each form's block sets them on the bar (snackbar.styles.ts), so a
   * change of form recolors the Buttons with no word to them. Read with every other host's of the turn, after the render
   * (src/primitives/read-phase.ts); asked before it (`willUpdate`), so a Button the render makes is given both before
   * it first draws itself.
   */
  private giveButtons() {
    readTogether(() => {
      if (!this.isConnected) return;
      const variant = compChoice(this, '--tanrei-comp-snackbar-close-button-variant', BUTTON_VARIANTS);
      return () => {
        for (const button of this.renderRoot?.querySelectorAll('tanrei-button.expand, tanrei-button.close') ?? []) {
          giveVariant(button, variant);
          giveTone(button, BUTTON_TONE);
        }
      };
    });
  }

  /**
   * SNK-24: the expand Button says whether the text is expanded and which text it shows and hides, on the native button
   * it draws in its shadow root — what is focused and read. The text is in this shadow root, so it is named as an
   * element (`ariaControlsElements`), which may point into a shadow-including ancestor's tree; an id may not.
   */
  private async stateExpand() {
    const button = this.renderRoot.querySelector<HTMLElement & { updateComplete?: Promise<unknown> }>('tanrei-button.expand');
    if (!button) return;
    await button.updateComplete;
    const native = button.shadowRoot?.querySelector<HTMLElement>('button, [role="button"]');
    if (!native || !button.isConnected) return;
    native.setAttribute('aria-expanded', String(this.showsExpanded));
    const text = this.renderRoot.querySelector('.text');
    if ('ariaControlsElements' in native) (native as unknown as { ariaControlsElements: Element[] | null }).ariaControlsElements = text ? [text] : null;
  }

  protected override updated(changed: PropertyValues<this>) {
    const has = (name: string) => changed.has(name as keyof TanreiSnackbar);
    if (has('expanded') || has('expandable')) void this.stateExpand();
    // SNK-34: a Button drawn in this render was given its variant and tone before it first draws itself (willUpdate).
    if (['message', 'headline', 'action', 'status', 'closable', 'expanded', 'stacked', 'expandable'].some(has)) this.layout();
    if (has('expanded') || has('expandable')) {
      if (!this.showsExpanded) this.renderRoot.querySelector('.text')?.scrollTo({ top: 0 });
      if (this.resizeFrom !== null) this.resize(this.resizeFrom);
      this.resizeFrom = null;
      // SNK-9: the host pauses the timeout while it is expanded.
      this.holder?.refresh();
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

  /** SNK-15: the action, the snackbar's own control. */
  private control(name: 'action', press: PressController, onClick: () => void, content: unknown) {
    return html`<button
      part=${name}
      class="control ${name}"
      type="button"
      data-tanrei-shape
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
    /** SNK-34: an icon-only Button of the small size, its glyph given in a box GlyphDrawnController watches (SNK-26). */
    const button = (name: 'expand' | 'close', glyph: string, label: string, onClick: () => void) =>
      html`<tanrei-button part=${name} class=${name} size="small" label=${label} @click=${onClick}><span slot="icon" class="glyph"><span class="ink">${glyph}</span></span></tanrei-button>`;
    return html`
      <div
        part="container"
        class=${classMap({ bar: true, open: this.shown, titled: !!headline, controls: !!action || this.closable || this.expandable, stacked: this.stacked && !!action, expanded, cut: this.expandable && !expanded })}
        data-edge=${this.hosted ? (this.placement === 'top-end' ? 'block-start' : 'block-end') : nothing}
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
          @wheel=${containedWheel}
        >
          ${form !== 'default' && this.statusLabel.trim() ? html`<span class="status-label">${this.statusLabel}</span>` : nothing}
          ${headline ? html`<span part="title" class="title" id="title">${this.headline}</span>` : nothing}
          <span part="supporting-text" class="message">${this.message}</span>
        </div>
        <span class="focus" data-tanrei-shape></span>
        ${action ? this.control('action', this.actionPress, this.onAction, html`<span class="hold">${action}</span>`) : nothing}
        ${this.expandable ? button('expand', expanded ? CONTROL_GLYPHS.collapse : CONTROL_GLYPHS.expand, this.words.get('expandLabel', this.expandLabel), this.onExpand) : nothing}
        ${this.closable ? button('close', CONTROL_GLYPHS.close, this.words.get('closeLabel', this.closeLabel), this.onClose) : nothing}
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
 * SNK-38: what the person does in a snackbar shown inside a modal surface goes no further than the box it is in, so that
 * the surface never reads it as its own: a press is not a press on its scrim, an arrow key does not move its content (an
 * image preview's), a wheel does not zoom it. Tab goes on, so that the surface's focus trap counts the snackbar's controls
 * with its own, and F6, which the host hears on the window (SNK-39); Escape is the snackbar's (SNK-11), which stops it
 * itself.
 */
const KEPT_IN_MOUTH = ['keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'mousedown', 'mouseup', 'click', 'dblclick', 'auxclick', 'contextmenu', 'wheel', 'touchstart', 'touchmove', 'touchend', 'touchcancel'] as const;
/** The keys that go on out of the box (SNK-38): Tab, which the surface's focus trap answers, and F6 (SNK-39). */
const KEYS_OUT_OF_MOUTH = new Set(['Tab', 'F6']);
const keepInMouth = (event: Event) => {
  if (event instanceof KeyboardEvent && KEYS_OUT_OF_MOUTH.has(event.key)) return;
  event.stopPropagation();
};

/** The snackbar a host shows, and whether it has been shown yet (it is drawn first, then shown). */
interface Current {
  request: Request;
  snackbar: TanreiSnackbar;
  visible: boolean;
}

/** SNK-38: the box the host shows its snackbar in while a modal surface is open, inside that surface's `<dialog>`. */
interface Mouth {
  dialog: HTMLDialogElement;
  box: HTMLElement;
}

/**
 * Shows snackbars, one at a time, in the order they were asked for (SNK-12), at the bottom of the window (SNK-13) or,
 * with `placement="top-end"`, at its top end (SNK-35) — below a sticky header of `<tanrei-app-shell>`, whose height it
 * reads from `--tanrei-app-shell-scroll-offset` on the document's root.
 * Place it once, as the last element of the page: its place in the focus order is where a snackbar's controls are
 * (SNK-11). It holds the two live regions their messages are announced in (SNK-10) — polite (`role="status"`) for the
 * default, info and success forms, assertive (`role="alert"`) for warning and error — so it must be in the document
 * before the first one.
 *
 * While a Tanrei modal surface is open (a dialog, a modal sheet or drawer, an image preview…), everything outside it is
 * inert, the host's live regions and its snackbar too; so the host shows its snackbar inside the topmost one, in a box of
 * its own with two live regions of its own, drawn above that surface and its scrim and reached by Tab after the
 * surface's controls (SNK-38). There it is in that surface's shadow tree: listen to the snackbar itself, or use what
 * `show()` resolves with, and style it through its tokens.
 *
 * `show(options)` resolves once that snackbar has closed: `{ result: 'action' }` or `{ result: 'dismiss', reason }`.
 * `dismissCurrent()` closes the showing one (reason `host`); `clear()` also drops every waiting one.
 *
 * F6 or Shift+F6 moves keyboard focus to the showing snackbar's first control from wherever it is, and from inside it back
 * to where it was (SNK-39); `focusCurrent()` moves it there from a shortcut of the product's own. A product that gives F6
 * a meaning of its own keeps it by handling the key first (`preventDefault()`): the host leaves a key that is handled.
 *
 * @tag tanrei-snackbar-host
 * @slot - The snackbar being shown (the host puts it there).
 */
export class TanreiSnackbarHost extends TanreiElement {
  static override styles = [hostStyles, hiddenHost];

  static override properties: PropertyDeclarations = {
    placement: { type: String, reflect: true },
  };

  /**
   * Where it places every snackbar whose `show()` options name no `placement` (SNK-35): `bottom`, the default, or
   * `top-end`. A product chooses one place for its snackbars.
   */
  placement: TanreiSnackbarPlacement = 'bottom';

  private readonly queue: Request[] = [];
  private current: Current | null = null;
  /** A snackbar leaving: the next waits for it (SNK-17). */
  private closing: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private hovered = false;
  private focusedInside = false;
  /** SNK-11: where focus was before it entered the snackbar. */
  private returnFocus: Element | null = null;
  private unsubscribe: (() => void) | null = null;
  /** SNK-38: where the snackbar is shown while a modal surface is open, in the topmost one. */
  private mouth: Mouth | null = null;
  /** SNK-38: a change of the modal surfaces is answered once, after the task that made it has done its own work. */
  private placing = false;
  /** The keyboard's height the visual viewport leaves (SNK-13), given to the box in a modal surface too. */
  private keyboard = '';

  override connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = modalLayer.subscribe(this.onLayer);
    window.addEventListener('keydown', this.onShortcut);
    document.addEventListener('visibilitychange', this.onConditions);
    window.addEventListener('blur', this.onConditions);
    window.addEventListener('focus', this.onConditions);
    window.visualViewport?.addEventListener('resize', this.onViewport);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
    window.removeEventListener('keydown', this.onShortcut);
    document.removeEventListener('visibilitychange', this.onConditions);
    window.removeEventListener('blur', this.onConditions);
    window.removeEventListener('focus', this.onConditions);
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    clearTimeout(this.timer);
    // Taken away, it takes its snackbar with it, wherever that is shown.
    const snackbar = this.current?.snackbar;
    if (snackbar && snackbar.parentNode !== this) this.append(snackbar);
    this.mouth?.box.remove();
    this.mouth = null;
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

  /**
   * SNK-39: moves keyboard focus to the showing snackbar's first control — the text while it scrolls, the action, the
   * expand button or the close button — as F6 does, for a shortcut of the product's own. Returns whether focus moved
   * there: false while no snackbar is shown or the one shown has no control. Focus goes back to where it was with F6, or
   * when the snackbar closes (SNK-11).
   */
  focusCurrent(): boolean {
    const current = this.current;
    if (!current?.visible) return false;
    if (focusWithin(current.snackbar)) return true;
    const from = deepActive();
    if (!current.snackbar.focusFirst()) return false;
    // Where it was, as deep as it was: an element inside another component's shadow root, not that component.
    this.returnFocus = from && from !== document.body ? from : null;
    return true;
  }

  /**
   * SNK-39: F6 or Shift+F6 — to the showing snackbar's first control, or from inside it back to where focus was. Heard on
   * the window as the key leaves the page, so that a key the product has handled (`defaultPrevented`) is left alone, as
   * is the key while no snackbar with a control is shown: F6 then keeps the browser's own meaning.
   */
  private readonly onShortcut = (event: KeyboardEvent) => {
    if (event.key !== 'F6' || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const current = this.current;
    if (!current?.visible) return;
    if (!focusWithin(current.snackbar)) {
      if (this.focusCurrent()) event.preventDefault();
      return;
    }
    event.preventDefault();
    // Back to where focus was before it entered the snackbar or, where that is gone or cannot take it (inert behind the
    // modal surface the snackbar now shows in), to the platform's default.
    const back = this.returnFocus as HTMLElement | null;
    if (back?.isConnected && typeof back.focus === 'function') back.focus({ focusVisible: true } as FocusOptions);
    if (focusWithin(current.snackbar)) (deepActive() as HTMLElement | null)?.blur();
  };

  /** The snackbar being shown, if any. */
  get snackbar(): TanreiSnackbar | null {
    return this.current?.snackbar ?? null;
  }

  /** @internal SNK-9: the showing snackbar was expanded or collapsed; its timeout pauses or starts again. */
  refresh() {
    this.onConditions();
  }

  /**
   * Shows the next waiting snackbar once nothing is showing or closing — in the host, or inside the topmost modal surface
   * while one is open (SNK-38), without waiting for it to close.
   */
  private async next() {
    if (this.current || this.closing || !this.isConnected) return;
    const request = this.queue.shift();
    if (!request) return;
    const snackbar = document.createElement('tanrei-snackbar');
    const { message, title = '', action = '', status = 'default', statusLabel = '', inverse = null, closable = false, closeLabel = '', expandLabel = '', duration = 'auto', placement = this.placement } = request.options;
    Object.assign(snackbar, { message, headline: title, action, status, statusLabel, inverse, closable, closeLabel, expandLabel, duration, placement });
    snackbar.setAttribute('popover', 'manual');
    snackbar.holder = this;
    this.current = { request, snackbar, visible: false };
    snackbar.addEventListener('action', this.onSettled);
    snackbar.addEventListener('dismiss', this.onSettled);
    snackbar.addEventListener('pointerenter', this.onPointerEnter);
    snackbar.addEventListener('pointerleave', this.onPointerLeave);
    snackbar.addEventListener('focusin', this.onFocusIn);
    snackbar.addEventListener('focusout', this.onFocusOut);
    this.layer().append(snackbar);
    await snackbar.updateComplete;
    if (this.current?.snackbar !== snackbar) return;
    // A modal surface may have opened or closed while it was drawn: it is shown where the topmost one is now.
    const layer = this.layer();
    if (snackbar.parentNode !== layer) layer.append(snackbar);
    snackbar.showPopover();
    this.current.visible = true;
    // SNK-17, SNK-36: the bar appears from the window's edge it stands at. The announcement does not wait for it.
    snackbar.appearIn();
    this.announce(snackbar.announcement, snackbar.assertive);
    this.onConditions();
  }

  /**
   * SNK-38: where a snackbar is shown now — the box inside the topmost modal surface while one is open (made there as it
   * becomes the topmost, with its two live regions, so that they are in the document before a message is written into
   * them), else the host itself. A box in a surface that is no longer the topmost is taken away.
   */
  private layer(): HTMLElement {
    const top = this.isConnected ? modalLayer.top : null;
    if ((this.mouth?.dialog ?? null) === top) return this.mouth?.box ?? this;
    const old = this.mouth;
    this.mouth = top ? { dialog: top, box: this.mouthIn(top) } : null;
    const to = this.mouth?.box ?? this;
    // What is shown in the old box moves out before it goes — also where its surface was taken out of the document
    // with it, which hid it.
    const current = this.current;
    if (old && current && current.snackbar.parentNode === old.box) this.move(current, to);
    old?.box.remove();
    return to;
  }

  /** SNK-38: the box in `dialog`: out of its flow, with two live regions of its own and a slot for the snackbar. */
  private mouthIn(dialog: HTMLDialogElement): HTMLElement {
    const box = document.createElement('div');
    const root = box.attachShadow({ mode: 'open' });
    adoptStyles(root, [mouthStyles]);
    render(this.regions(), root);
    for (const type of KEPT_IN_MOUTH) box.addEventListener(type, keepInMouth);
    if (this.keyboard) box.style.setProperty('--tanrei-snackbar-keyboard', this.keyboard);
    dialog.append(box);
    return box;
  }

  /**
   * SNK-38: a modal surface opened or closed. Answered at the end of the task that did it, once the surface has done its
   * own work (focus, its layout): the showing snackbar is moved to where snackbars are shown now, at once, still open.
   */
  private readonly onLayer = () => {
    if (this.placing) return;
    this.placing = true;
    queueMicrotask(() => {
      this.placing = false;
      this.place();
      this.onConditions();
    });
  };

  /**
   * SNK-38: the showing snackbar into the topmost modal surface, or back to the host where none is open — whole at once,
   * with no entrance, keeping its open state and its expanded state, and not announced again. Taking it out of the
   * document hides its popover (and ends a hover and a focus inside it); it is shown again where it now is. A snackbar
   * that is leaving stays where it leaves from; one not shown yet is placed when it is (`next()`).
   */
  private place() {
    const to = this.layer();
    const current = this.current;
    if (current && current.snackbar.parentNode !== to) this.move(current, to);
  }

  /** SNK-38: `current` into `to`; shown again at once there if it was shown. */
  private move(current: Current, to: HTMLElement) {
    const { snackbar } = current;
    to.append(snackbar);
    if (!current.visible) return;
    if (!snackbar.matches(':popover-open')) snackbar.showPopover();
    snackbar.appearIn(true);
    this.hovered = false;
    this.focusedInside = false;
    this.returnFocus = null;
  }

  /** SNK-10: announced once, politely or assertively, through the live regions where it is shown; focus is never moved. */
  private announce(text: string, assertive: boolean) {
    const root = this.mouth?.box.shadowRoot ?? this.renderRoot;
    const region = root.querySelector(assertive ? '.announce[role="alert"]' : '.announce[role="status"]');
    this.clearAnnouncements();
    if (!region) return;
    // A frame later, so a message equal to the last one is announced again.
    requestAnimationFrame(() => (region.textContent = text));
  }

  private clearAnnouncements() {
    for (const root of [this.renderRoot, this.mouth?.box.shadowRoot]) for (const region of root?.querySelectorAll('.announce') ?? []) region.textContent = '';
  }

  /**
   * SNK-8, SNK-9: the timeout runs only while nothing holds it, and starts again from its whole length — also when the
   * snackbar has moved into or out of a modal surface (SNK-38).
   */
  private readonly onConditions = () => {
    const current = this.current;
    clearTimeout(this.timer);
    if (!current) {
      void this.next();
      return;
    }
    const held = this.hovered || this.focusedInside || current.snackbar.showsExpanded || document.visibilityState === 'hidden' || !document.hasFocus();
    const timeout = current.snackbar.timeout;
    if (held || timeout === null) return;
    this.timer = setTimeout(() => current.snackbar.dismissByTimeout(), timeout);
  };

  /** SNK-13: above the on-screen keyboard (the part of the layout viewport the visual viewport no longer covers). */
  private readonly onViewport = () => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const covered = Math.max(0, document.documentElement.clientHeight - (viewport.offsetTop + viewport.height));
    this.keyboard = `${covered}px`;
    this.style.setProperty('--tanrei-snackbar-keyboard', this.keyboard);
    this.mouth?.box.style.setProperty('--tanrei-snackbar-keyboard', this.keyboard);
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

  /** SNK-1, SNK-12: the snackbar closed; its request resolves, it leaves the way it came, then the next shows. */
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
    // SNK-17: it goes back the way it came, in the top layer until then; the next one shows only after that.
    this.closing = snackbar.leave().then(() => {
      if (snackbar.matches(':popover-open')) snackbar.hidePopover();
      snackbar.remove();
      this.closing = null;
      void this.next();
    });
  };

  /** SNK-10: the two live regions — the host's own, and those of its box in a modal surface (SNK-38) — and the slot. */
  private regions() {
    return html`<div class="announce" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="announce" role="alert" aria-live="assertive" aria-atomic="true"></div>
      <slot></slot>`;
  }

  protected override render() {
    return this.regions();
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
