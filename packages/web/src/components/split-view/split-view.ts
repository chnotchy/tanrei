import { type PropertyDeclarations, type PropertyValues, html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { hiddenHost } from '../../primitives/hidden.js';
import { AnimatedSize, AvailabilityController, report } from '../../primitives/index.js';
import { TanreiElement } from '../../primitives/element.js';
import '../handle/handle.js';
import type { TanreiHandleResizeDetail, TanreiHandleStepDetail } from '../handle/handle.js';
import { AXES, PRIMARIES, styles } from './split-view.styles.js';

/** Which size the split divides: the width (`horizontal`, the panes side by side) or the height (`vertical`, one above the other). */
export type TanreiSplitViewAxis = 'horizontal' | 'vertical';
/** The pane the value measures and that folds away: the start pane or the end pane. */
export type TanreiSplitViewPrimary = 'start' | 'end';
/**
 * What `resize`, `change` and `toggle` carry: the primary pane's share in percent and whether it is folded away. In
 * `resize` the share is the one drawn (0 while folded away); in `change` and `toggle`, `value` (the share a folded pane
 * comes back at).
 */
export interface TanreiSplitViewDetail {
  value: number;
  collapsed: boolean;
}

/** The value each number prop falls back to where it cannot be used (SPV-15): the spec's defaults. */
const DEFAULTS = { value: 50, min: 10, max: 90, step: 5, largeStep: 20, resetValue: 50 } as const;

/** A number attribute whose absence (or an empty value) is null: no bound in pixels. */
const nullableNumber = {
  fromAttribute: (value: string | null): number | null => (value === null || value.trim() === '' ? null : Number(value)),
  toAttribute: (value: number | null): string | null => (value === null || value === undefined ? null : String(value)),
};

const usable = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const clamp = (value: number, least: number, greatest: number) => Math.min(Math.max(value, least), Math.max(least, greatest));
/** Shares are kept to a hundredth of a percent: finer than a pixel of any region, and numbers a product can store. */
const tidy = (share: number) => Math.round(share * 100) / 100;
const EMBEDDED = 'iframe, object, embed';

/** How a change of the share is drawn: at once (a drag, a key, the first frame), or by one of the two motions. */
type Motion = 'still' | 'resize' | 'collapse';

interface Drag {
  /** The value and the fold when the drag began, and the share then drawn (0 while folded away). */
  value: number;
  collapsed: boolean;
  share: number;
  /** The embedded documents SPV-3 took the pointer from, with the inline value each had. */
  embedded: [HTMLElement, string][];
}

/**
 * Divides a region into two panes — side by side, or one above the other — with a hairline between them and a Handle on
 * it that a person drags, steps from the keyboard or presses to give one pane more room; where `collapsible` is set, a
 * press or Enter folds the primary pane away and brings it back.
 *
 * Contract: specs/split-view.spec.json. Built from `<tanrei-handle>`, in its shadow root, which follows the window
 * splitter pattern: a focusable separator whose value is the primary pane's share in percent, which controls the primary
 * pane (`aria-controls`), moved by the arrow keys the way they point, Page Up and Page Down, Home (the least share) and
 * End (the greatest), and folded and restored by Enter. The split view hears the Handle's events in its shadow root and
 * says what they mean in its own: `resize` in every frame of a drag, `change` once a person has changed the share,
 * `toggle` once a person has folded or restored the pane, each with `{ value, collapsed }`; none is sent for a `value`
 * or `collapsed` you set.
 *
 * The split view takes the size its layout gives it; a vertical one needs a height to divide. `value` is the primary
 * pane's share of the region less the divider, held between `min` and `max` (percent) and `min-size` and `max-size`
 * (pixels; where the region is too small for both, the least wins). While a drag lasts, every `<iframe>`, `<object>`
 * and `<embed>` in either pane takes no pointer, so the drag is not lost over it.
 *
 * @tag tanrei-split-view
 * @slot start - The content of the start pane: the inline-start side, or the top while axis is vertical.
 * @slot end - The content of the end pane.
 * @csspart start-pane - The start pane's box, which clips its content.
 * @csspart end-pane - The end pane's box.
 * @csspart divider - The hairline between the panes.
 * @csspart handle - The `<tanrei-handle>` on the divider.
 * @fires {CustomEvent<TanreiSplitViewDetail>} resize - The divider moved during a drag, in every frame it moves.
 * @fires {CustomEvent<TanreiSplitViewDetail>} change - A person changed the primary pane's share: a drag ended, a key, or a press that moved the divider.
 * @fires {CustomEvent<TanreiSplitViewDetail>} toggle - A person folded the primary pane away or brought it back.
 */
export class TanreiSplitView extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'split-view');
  static override styles = [styles, hiddenHost];

  /** @internal Its documented parts. */
  static readonly parts: readonly string[] = ['start-pane', 'end-pane', 'divider', 'handle'];

  static override properties: PropertyDeclarations = {
    axis: { type: String, reflect: true },
    primary: { type: String, reflect: true },
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    minSize: { attribute: 'min-size', converter: nullableNumber },
    maxSize: { attribute: 'max-size', converter: nullableNumber },
    step: { type: Number },
    largeStep: { type: Number, attribute: 'large-step' },
    resetValue: { type: Number, attribute: 'reset-value' },
    collapsible: { type: Boolean, reflect: true },
    collapsed: { type: Boolean, reflect: true },
    label: { type: String },
    valueText: { type: String, attribute: 'value-text' },
    disabled: { type: Boolean, reflect: true },
    region: { state: true },
  };

  /** `horizontal`: the panes stand side by side and the divider is upright. `vertical`: one above the other. */
  axis: TanreiSplitViewAxis = 'horizontal';

  /** The pane the value measures and that folds away: `start` (a list beside its detail) or `end` (an inspector after a canvas). */
  primary: TanreiSplitViewPrimary = 'start';

  /** The primary pane's share of the region less the divider, in percent. A person's drag, key or press changes it; setting it sends no event. */
  value: number = DEFAULTS.value;

  /** The least share of the primary pane, in percent, while it is shown. */
  min: number = DEFAULTS.min;

  /** The greatest share of the primary pane, in percent. */
  max: number = DEFAULTS.max;

  /** The least size of the primary pane in pixels along the axis (`min-size`), on top of `min`; null sets none. It wins over `max-size`. */
  minSize: number | null = null;

  /** The greatest size of the primary pane in pixels along the axis (`max-size`), on top of `max`; null sets none. */
  maxSize: number | null = null;

  /** Percent of the region one arrow key moves the divider by. */
  step: number = DEFAULTS.step;

  /** Percent of the region Shift with an arrow key, Page Up or Page Down moves the divider by (`large-step`). */
  largeStep: number = DEFAULTS.largeStep;

  /** The share a press on the Handle moves the primary pane to while it cannot fold (`reset-value`); the next press moves it back. */
  resetValue: number = DEFAULTS.resetValue;

  /** Lets the primary pane fold away: by Enter or a press on the Handle, and by a drag past half its least share. */
  collapsible = false;

  /** Whether the primary pane is folded away. A person's press, Enter or drag changes it; setting it sends no event. Ignored while `collapsible` is false. */
  collapsed = false;

  /** The Handle's accessible name, saying what it resizes ("Resize the message list"), in your words. Required. */
  label = '';

  /** The share in your words ("List 320 pixels wide", `value-text`), read in place of the percentage. */
  valueText = '';

  /** Keeps both panes as they are: the Handle takes no input and no focus. The panes' content stays operable. */
  disabled = false;

  /** The region's size along the axis less the divider, in pixels, as last measured (SPV-3, SPV-16). */
  private region = 0;

  private drag: Drag | null = null;
  /** The share a second press goes back to, and the share the first press gave (SPV-7). */
  private back: { from: number; to: number } | null = null;
  /** How the next update draws a change the split view itself made; null leaves it to `willUpdate` (SPV-9). */
  private own: Motion | null = null;
  /** How the update under way draws the change, for `updated()`. */
  private pending: Motion | null = null;
  /** Whether the fold drawn now came by a motion: the content goes out of sight once it has ended (SPV-8). */
  private foldMoves = false;

  private readonly motion = new AnimatedSize(
    this,
    ((host: TanreiSplitView) => ({
      box: () => host.primaryBox,
      get axis() {
        return host.shownAxis === 'vertical' ? ('block' as const) : ('inline' as const);
      },
      anchor: () => 'start' as const,
      get duration() {
        return host.pending === 'resize' ? 'var(--tanrei-comp-split-view-motion-resize-duration)' : 'var(--tanrei-comp-split-view-motion-collapse-duration)';
      },
      easing: 'var(--tanrei-comp-split-view-motion-collapse-easing)',
    }))(this),
  );

  /**
   * One resize watch for every split view: a frame reports all the regions that changed in one callback, all of them
   * read, then all of them write. A watch of each split view's own would have each read after the update of the one
   * before, and the browser lay the page out again for each.
   */
  private static observer: ResizeObserver | null = null;
  /** The split view each watched region belongs to. */
  private static readonly regions = new WeakMap<Element, TanreiSplitView>();
  private observed: Element | null = null;

  private static watchRegions(): ResizeObserver | null {
    if (typeof ResizeObserver !== 'function') return null;
    return (TanreiSplitView.observer ??= new ResizeObserver((entries) => {
      const writes: (() => void)[] = [];
      for (const entry of entries) {
        const write = TanreiSplitView.regions.get(entry.target)?.readRegion();
        if (write) writes.push(write);
      }
      for (const write of writes) write();
    }));
  }

  private get primaryBox(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.pane.primary') ?? null;
  }

  // ---- what is drawn: SPV-1, SPV-15, SPV-16 ----

  private get shownAxis(): TanreiSplitViewAxis {
    return (AXES as readonly string[]).includes(this.axis) ? this.axis : 'horizontal';
  }
  private get shownPrimary(): TanreiSplitViewPrimary {
    return (PRIMARIES as readonly string[]).includes(this.primary) ? this.primary : 'start';
  }
  /** min and max as they can be used: each within 0 and 100, min not above max; otherwise both defaults (SPV-15). */
  private get percentBounds(): { min: number; max: number } {
    const min = usable(this.min) && this.min >= 0 && this.min <= 100 ? this.min : DEFAULTS.min;
    const max = usable(this.max) && this.max >= 0 && this.max <= 100 ? this.max : DEFAULTS.max;
    return min <= max ? { min, max } : { min: DEFAULTS.min, max: DEFAULTS.max };
  }
  private usableSize(size: number | null): number | null {
    return usable(size) && size >= 0 ? size : null;
  }
  /** SPV-16: the least and the greatest share, counting the pixel bounds against the region; the least wins. */
  private get bounds(): { least: number; greatest: number } {
    const { min, max } = this.percentBounds;
    let least = min;
    let greatest = max;
    const minSize = this.usableSize(this.minSize);
    const maxSize = this.usableSize(this.maxSize);
    if (this.region > 0) {
      if (minSize !== null) least = Math.max(least, (minSize / this.region) * 100);
      if (maxSize !== null) greatest = Math.min(greatest, (maxSize / this.region) * 100);
    }
    least = clamp(least, 0, 100);
    greatest = clamp(greatest, 0, 100);
    return { least, greatest: Math.max(least, greatest) };
  }
  private number(name: 'step' | 'largeStep' | 'resetValue'): number {
    const value = this[name];
    return usable(value) && (name === 'resetValue' || value > 0) ? value : DEFAULTS[name];
  }
  /** The share the primary pane is drawn at while it is shown: value, held between the least and the greatest. */
  private get shownValue(): number {
    const { least, greatest } = this.bounds;
    return tidy(clamp(usable(this.value) ? this.value : DEFAULTS.value, least, greatest));
  }
  private get folded(): boolean {
    return this.collapsible && this.collapsed;
  }
  /** The share drawn now: 0 while the pane is folded away (SPV-8). */
  private get drawnShare(): number {
    return this.folded ? 0 : this.shownValue;
  }

  // ---- measuring: SPV-11, SPV-16 ----

  private measure() {
    this.readRegion()?.();
  }

  /** What `measure` reads, returning what it then writes: the reads of many split views can be made before any write. */
  private readRegion(): (() => void) | void {
    const root = this.renderRoot as ShadowRoot | undefined;
    const split = root?.querySelector<HTMLElement>('.split');
    const divider = root?.querySelector<HTMLElement>('.divider');
    if (!split || !divider) return;
    const vertical = this.shownAxis === 'vertical';
    const whole = split.getBoundingClientRect();
    const line = divider.getBoundingClientRect();
    const next = Math.max(0, vertical ? whole.height - line.height : whole.width - line.width);
    // SPV-11: the share is kept; a new region is drawn at once, and only the pixel bounds are counted again.
    return () => {
      if (Math.abs(next - this.region) >= 0.5) this.region = next;
    };
  }

  private watch() {
    const split = this.isConnected ? (this.renderRoot?.querySelector('.split') ?? null) : null;
    if (split === this.observed) return;
    const observer = TanreiSplitView.watchRegions();
    if (this.observed) {
      observer?.unobserve(this.observed);
      TanreiSplitView.regions.delete(this.observed);
    }
    if (split) {
      TanreiSplitView.regions.set(split, this);
      observer?.observe(split);
    }
    this.observed = split;
  }

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) this.watch();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.watch();
    if (this.drag) this.endDrag();
  }

  // ---- what the split view says ----

  private emit(type: 'resize' | 'change' | 'toggle', value: number) {
    const detail: TanreiSplitViewDetail = { value, collapsed: this.folded };
    // Each event is written out by its name, so that the manifest's analyzer finds all three.
    if (type === 'resize') this.dispatchEvent(new CustomEvent<TanreiSplitViewDetail>('resize', { bubbles: true, composed: true, detail }));
    else if (type === 'change') this.dispatchEvent(new CustomEvent<TanreiSplitViewDetail>('change', { bubbles: true, composed: true, detail }));
    else this.dispatchEvent(new CustomEvent<TanreiSplitViewDetail>('toggle', { bubbles: true, composed: true, detail }));
  }

  /** A person's change: written to the props, drawn as `motion` says. Any change but a press's ends the way back (SPV-7). */
  private write(motion: Motion, change: { value?: number; collapsed?: boolean }, fromPress = false) {
    if (!fromPress) this.back = null;
    // Only a write that changes something brings an update, which takes the motion; any other would leave it to the next.
    if ((change.value !== undefined && change.value !== this.value) || (change.collapsed !== undefined && change.collapsed !== this.collapsed)) this.own = motion;
    if (change.value !== undefined) this.value = change.value;
    if (change.collapsed !== undefined) this.collapsed = change.collapsed;
  }

  // ---- SPV-3, SPV-4: the drag ----

  private readonly onResizeStart = () => {
    if (this.disabled) return;
    // A motion under way is stopped where it is; the drag goes on from the share then shown.
    this.motion.fit(false);
    this.measure();
    const embedded: [HTMLElement, string][] = [];
    for (const slot of this.renderRoot.querySelectorAll('slot')) {
      for (const node of slot.assignedElements({ flatten: true })) {
        for (const el of [...(node.matches(EMBEDDED) ? [node] : []), ...node.querySelectorAll(EMBEDDED)] as HTMLElement[]) {
          embedded.push([el, el.style.getPropertyValue('pointer-events')]);
          el.style.setProperty('pointer-events', 'none');
        }
      }
    }
    this.drag = { value: this.shownValue, collapsed: this.folded, share: this.drawnShare, embedded };
  };

  private readonly onResize = (event: Event) => {
    const drag = this.drag;
    if (!drag || this.region <= 0) return;
    const { inline, block } = (event as CustomEvent<TanreiHandleResizeDetail>).detail;
    const distance = this.shownAxis === 'vertical' ? block : inline;
    // The divider follows the press: toward the end edge it gives the start pane room and takes it from the end pane.
    const sign = this.shownPrimary === 'start' ? 1 : -1;
    const raw = drag.share + (sign * distance * 100) / this.region;
    const { least, greatest } = this.bounds;
    const before = this.drawnShare;
    if (this.collapsible && raw < least / 2) this.write('still', { collapsed: true, value: drag.collapsed ? this.value : drag.value });
    else this.write('still', { collapsed: false, value: tidy(clamp(raw, least, greatest)) });
    const after = this.drawnShare;
    if (after !== before) this.emit('resize', after);
  };

  private readonly onResizeEnd = () => {
    if (this.drag) this.endDrag();
  };

  /** SPV-3, SPV-4: the drag has ended; change once where the share changed, toggle once where the fold did. */
  private endDrag() {
    const drag = this.drag;
    this.drag = null;
    if (!drag) return;
    for (const [el, value] of drag.embedded) {
      if (value) el.style.setProperty('pointer-events', value);
      else el.style.removeProperty('pointer-events');
    }
    if (!this.folded && this.shownValue !== drag.value) this.emit('change', this.shownValue);
    if (this.folded !== drag.collapsed) this.emit('toggle', this.shownValue);
  }

  // ---- SPV-5: the keys ----

  private readonly onStep = (event: Event) => {
    if (this.drag || this.disabled) return;
    const { direction, amount } = (event as CustomEvent<TanreiHandleStepDetail>).detail;
    const { least, greatest } = this.bounds;
    // The way the key points: toward the end edge, the primary start pane grows and a primary end pane shrinks.
    const grows = (this.shownPrimary === 'start' ? 1 : -1) * direction > 0;
    if (this.folded) {
      // A folded pane comes back for a step that gives it room, Home (at the least) and End (at the greatest).
      if (amount !== 'limit' && !grows) return;
      const value = amount === 'limit' && direction > 0 ? greatest : least;
      this.write('still', { collapsed: false, value });
      this.emit('toggle', value);
      this.emit('change', value);
      return;
    }
    const by = amount === 'large' ? this.number('largeStep') : this.number('step');
    const value = tidy(amount === 'limit' ? (direction < 0 ? least : greatest) : clamp(this.shownValue + (grows ? by : -by), least, greatest));
    if (value === this.shownValue) return;
    this.write('still', { value });
    this.emit('change', value);
  };

  // ---- SPV-6, SPV-7: a press without a drag, Enter and Space ----

  private readonly onActivate = () => {
    if (this.drag || this.disabled) return;
    if (this.collapsible) {
      const collapsed = !this.folded;
      this.write('collapse', { collapsed });
      this.emit('toggle', this.shownValue);
      return;
    }
    const { least, greatest } = this.bounds;
    const shown = this.shownValue;
    let value: number;
    if (this.back && this.back.from === shown) {
      value = this.back.to;
      this.back = null;
    } else {
      value = tidy(clamp(this.number('resetValue'), least, greatest));
      if (value === shown) return;
      this.back = { from: value, to: shown };
    }
    this.write('collapse', { value }, true);
    this.emit('change', value);
  };

  // ---- the update ----

  override willUpdate(changed: PropertyValues<this>) {
    const moved = changed.has('value') || changed.has('collapsed') || changed.has('collapsible');
    if (this.own) {
      this.pending = this.own;
      this.own = null;
    } else if (moved && this.hasUpdated && !this.drag) {
      // SPV-9: a share or a fold the product sets after the first frame moves; the first frame is drawn at once (MOT-3).
      this.back = null;
      this.pending = changed.has('collapsed') || changed.has('collapsible') ? 'collapse' : 'resize';
    } else if (moved || changed.has('min') || changed.has('max') || changed.has('minSize') || changed.has('maxSize') || changed.has('axis') || changed.has('primary')) {
      this.pending = 'still';
    }
    if (changed.has('collapsed') || changed.has('collapsible')) this.foldMoves = this.pending === 'collapse';
  }

  override updated(changed: PropertyValues<this>) {
    this.watch();
    // A change drawn at once while nothing moves has no motion to stop: the box is at its size already, and asking the
    // box for its motions would style the page in this host's own update.
    if (this.pending && (this.pending !== 'still' || this.motion.resizing)) this.motion.fit(this.pending !== 'still');
    this.pending = null;
    if (changed.has('axis') && this.axis !== this.shownAxis) report(this, 'SPV-15', `axis "${this.axis}" is not a value of the split view; it is laid out as "horizontal"`);
    if (changed.has('primary') && this.primary !== this.shownPrimary) report(this, 'SPV-15', `primary "${this.primary}" is not a value of the split view; it is taken as "start"`);
    if (changed.has('min') || changed.has('max')) {
      const { min, max } = this.percentBounds;
      if (min !== this.min || max !== this.max) report(this, 'SPV-15', `min ${this.min} and max ${this.max} are not a range within 0 and 100; ${min} and ${max} are used`);
    }
    for (const name of ['value', 'step', 'largeStep', 'resetValue'] as const) {
      if (!changed.has(name)) continue;
      const value = this[name];
      if (!usable(value) || (name !== 'value' && name !== 'resetValue' && value <= 0)) report(this, 'SPV-15', `${name} ${String(value)} is not a number it can use; ${DEFAULTS[name]} is used`);
    }
    for (const name of ['minSize', 'maxSize'] as const) {
      if (changed.has(name) && this[name] !== null && this[name] !== undefined && this.usableSize(this[name]) === null) report(this, 'SPV-15', `${name} ${String(this[name])} is not a size in pixels of 0 or more; it is ignored`);
    }
  }

  override render() {
    const axis = this.shownAxis;
    const primary = this.shownPrimary;
    const folded = this.folded;
    const { least, greatest } = this.bounds;
    const pane = (side: 'start' | 'end') => {
      const isPrimary = side === primary;
      const fold = isPrimary && folded;
      return html`<div
        part=${`${side}-pane`}
        id=${`${side}-pane`}
        class=${classMap({ pane: true, primary: isPrimary, rest: !isPrimary, folded: fold })}
        style=${styleMap(isPrimary ? { '--_spv-share': String(this.drawnShare) } : {})}
        ?inert=${fold}
      ><div class="content" style=${styleMap(fold && this.foldMoves ? { '--_spv-hide-after': 'var(--tanrei-comp-split-view-motion-collapse-duration)' } : {})}><slot name=${side}></slot></div></div>`;
    };
    return html`<div class=${classMap({ split: true, [axis]: true })}>
      ${pane('start')}
      <div part="divider" class="divider">
        <tanrei-handle
          part="handle"
          axis=${axis}
          size="medium"
          aria-controls=${`${primary}-pane`}
          .value=${Math.round(this.drawnShare)}
          .min=${this.collapsible ? 0 : Math.round(least)}
          .max=${Math.round(greatest)}
          .label=${this.label}
          .valueText=${this.valueText}
          .disabled=${this.disabled}
          @resizestart=${this.onResizeStart}
          @resize=${this.onResize}
          @resizeend=${this.onResizeEnd}
          @step=${this.onStep}
          @activate=${this.onActivate}
        ></tanrei-handle>
      </div>
      ${pane('end')}
    </div>`;
  }
}

if (!customElements.get('tanrei-split-view')) customElements.define('tanrei-split-view', TanreiSplitView);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-split-view': TanreiSplitView;
  }
}
