import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { hiddenHost } from '../../primitives/hidden.js';
import {
  AvailabilityController,
  GlyphDrawnController,
  GlyphMirrorController,
  PressController,
  SHEET_FLING_VELOCITY,
  SelectionController,
  SheetDrag,
  markConditionChange,
  report,
  selectionRippleOrigin,
  syncFocusStyle,
} from '../../primitives/index.js';
import { PROGRESS, styles } from './switch.styles.js';
import { disabledWaitsWhileFocused } from '../../primitives/disabled-while-focused.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** What `change` carries: the new value of `checked`. */
export interface TanreiSwitchChangeDetail {
  checked: boolean;
}

/**
 * Turns one setting on or off, taking effect at once, with a handle that follows a finger dragged along the track.
 *
 * Contract: specs/switch.spec.json. Every visual value comes from `--tanrei-comp-switch-*` tokens, one set per condition
 * (unselected, selected) and state — the handle's color, size and elevation included: how a state looks is the active
 * design system's decision. The handle travels to the inline end when on (the left in right-to-left layouts).
 *
 * A tap switches it. A drag along the track (touch, pen or mouse; from the track, the handle or the target around them,
 * not from the label) carries the handle with the pointer, and every part that differs between off and on is drawn at
 * the handle's progress between the two, with no threshold. `checked`, the form value and the exposed state change
 * when the pointer is released — to the nearer side, or the side a fling is toward — with one `input` and one `change`;
 * Escape, a cancelled pointer, `disabled` or a `checked` set meanwhile return the handle and fire nothing.
 *
 * Form-associated: while checked it submits `value` (default "on") under `name`, resets to its `checked` attribute and
 * follows a disabled `<fieldset>`, as a native checkbox does. It switches its own `checked` before it fires `input` and
 * `change`. The semantics are a native checkbox with the role switch in the shadow root, named by `label`; a click on
 * the visible label toggles it.
 *
 * @tag tanrei-switch
 * @csspart track - The track: its fill and outline.
 * @csspart handle - The handle (and the icons in it).
 * @csspart container - The round state layer centered on the handle (hover, focus, press).
 * @csspart icon - A glyph in the handle — the unselected one, the selected one, or both, as the props name them: the icon
 * set's glyph, drawn only once the icon set can draw it, at the opacity the handle's progress gives its condition.
 * @csspart label - The visible label.
 * @attr {string} form - The id of the form the switch belongs to, where it stands outside it: the platform's own attribute, which then wins over a form around it. The `form` property is read-only and returns the form element.
 * @fires input - The user switched it; `checked` is already the new value.
 * @fires {CustomEvent<TanreiSwitchChangeDetail>} change - The user switched it; `detail.checked` (and the element's `checked`) is the new value.
 */
export class TanreiSwitch extends LitElement {
  private readonly availability = new AvailabilityController(this, 'switch');
  static override styles = [styles, hiddenHost];

  static formAssociated = true;

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    checked: { type: Boolean },
    disabled: { type: Boolean, reflect: true },
    label: { type: String },
    labelHidden: { type: Boolean, attribute: 'label-hidden', reflect: true },
    checkedIcon: { type: String, attribute: 'checked-icon' },
    uncheckedIcon: { type: String, attribute: 'unchecked-icon' },
    name: { type: String, reflect: true },
    value: { type: String },
  };

  /** Whether the setting is on. The `checked` attribute is the default a form reset returns to. */
  checked = false;

  /** Prevents interaction and removes the switch from the focus order. */
  disabled = false;

  /** The text that names the setting: drawn next to the track and used as the accessible name. */
  label = '';

  /** Draws no visible label but keeps `label` as the accessible name (the `label-hidden` attribute). */
  labelHidden = false;

  /** The glyph (a name in the system's icon set) the handle shows while on; empty shows none (`checked-icon`). A name the icon set flags is drawn mirrored in right-to-left. */
  checkedIcon = '';

  /** The glyph the handle shows while off; empty shows none (`unchecked-icon`). A name the icon set flags is drawn mirrored in right-to-left. */
  uncheckedIcon = '';

  /** Web only: the name it is submitted under. */
  name = '';

  /** Web only: what it submits while checked. */
  value = 'on';

  /** Form association, a click on the host, Enter (src/primitives/selection.ts). */
  private readonly selection = new SelectionController(this, () => this.input, { named: () => !!this.label });

  /** SWT-7 / SWT-8: the pressed state, press-hold and the answer the system chooses (src/primitives/press.ts). */
  private readonly press = new PressController(this, {
    container: () => this.renderRoot.querySelector('.container'),
    holdCarrier: () => this.renderRoot.querySelector('.control'),
    disabled: () => this.selection.disabled,
    keys: [' '],
    origin: selectionRippleOrigin(() => this.renderRoot.querySelector('.container')),
  });

  /**
   * SWT-23: each glyph of the handle is marked when the icon set mirrors its name in right-to-left
   * (src/primitives/glyph-mirror.ts); `iconGlyph()` draws the mark, in the glyph's own box, wherever the handle is.
   */
  private readonly mirror = new GlyphMirrorController(this, { drawn: '.icon' });

  /** SWT-17: a glyph is drawn only while the icon set can draw it (src/primitives/glyph.ts). */
  private readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot.querySelectorAll<HTMLElement>('.icon'));

  private get input() {
    return this.renderRoot.querySelector('input');
  }

  /** The form it belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.selection.form;
  }

  /** `element.click()` switches it as a person would, and does nothing while disabled. */
  override click() {
    this.selection.click();
  }

  formResetCallback() {
    this.checked = this.hasAttribute('checked');
  }

  formStateRestoreCallback(state: string | null) {
    this.checked = state === 'true';
  }

  formDisabledCallback(disabled: boolean) {
    this.selection.formDisabledCallback(disabled);
  }

  /** SWT-9: where style queries are missing, the focus style is read when focus arrives. */
  private onFocus() {
    syncFocusStyle(this, this.input);
  }

  private onKeyDown(event: KeyboardEvent) {
    this.selection.onKeyDown(event);
    this.press.onKeyDown(event);
  }

  /**
   * A click on the label's text or on the target around the track is the label's; only the input's click is let out.
   * SWT-20: the click that follows a drag the switch took is not an activation — it never reaches the label.
   */
  private onRootClick(event: Event) {
    if (event.target === this.input) return;
    event.stopPropagation();
    if (!this.swallowClick) return;
    this.swallowClick = false;
    event.preventDefault();
  }

  /**
   * SWT-13: the handle sets out for the other condition, or for the one it left, and the parts are between the two
   * until it is there: `data-between` on `.root`, under which the two layers of a color are added (switch.styles.ts).
   * Marked before the style pass that starts the travel, with the label's change of condition, and taken away when the
   * thumb's travel ends — or two frames later where none began (motion is reduced, or the handle is where it goes).
   */
  private markTravel() {
    const root = this.root;
    if (!root) return;
    markConditionChange(root);
    root.setAttribute('data-between', '');
    const mark = ++this.travelMark;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (mark === this.travelMark) this.endTravel();
      }),
    );
  }
  private travelMark = 0;

  /** The thumb's travel ended, was replaced by another, or never began: at rest the parts are between nothing. */
  private readonly endTravel = (event?: TransitionEvent) => {
    if (event && (event.propertyName !== 'translate' || event.target !== event.currentTarget)) return;
    const thumb = this.renderRoot.querySelector('.thumb');
    const travelling = thumb?.getAnimations?.().some((animation) => (animation as CSSTransition).transitionProperty === 'translate' && animation.playState !== 'finished' && animation.playState !== 'idle');
    if (!travelling) this.root?.removeAttribute('data-between');
  };

  /** SWT-1: the native switch switched; the element takes the new value before anyone hears of it. */
  private onInput(event: Event) {
    event.stopPropagation();
    // SWT-13: the native switch is the new condition already, and the next style pass draws it.
    this.markTravel();
    this.checked = this.input!.checked;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  private onChange() {
    this.dispatchEvent(new CustomEvent<TanreiSwitchChangeDetail>('change', { bubbles: true, detail: { checked: this.checked } }));
  }

  /** The pointer that may become, or is, a drag (SWT-19); null when none is down on the control. */
  private drag: SheetDrag | null = null;
  /** The handle's progress while a drag holds it: what `PROGRESS` on `.root` was last written to. */
  private progress = 0;
  /** Where the pointer is along the track, as a progress, at its last move. */
  private pointerAt = 0;
  /** How far the handle was from the pointer when the drag was taken; the catch-up closes it. */
  private lag = 0;
  /** The catch-up's clock: an effect-less animation over the state motion, whose progress is the eased time. */
  private catchUp: Animation | null = null;
  private catchUpFrame = 0;
  /** The click after a drag the switch took is not an activation (SWT-20); cleared by that click or the next press. */
  private swallowClick = false;

  private get root() {
    return this.renderRoot.querySelector<HTMLElement>('.root');
  }

  /**
   * SWT-19: where the handle is drawn now — at rest, or on its way after a tap — as a progress: how far its `translate`
   * has carried it along its travel (the property the progress is drawn by, in the track's own pixels).
   */
  private drawnProgress(): number {
    const [thumb, track] = [this.renderRoot.querySelector<HTMLElement>('.thumb'), this.renderRoot.querySelector<HTMLElement>('.track')];
    const travel = track ? track.offsetWidth - track.offsetHeight : 0;
    if (!thumb || !track || travel <= 0) return this.checked ? 1 : 0;
    const along = Number.parseFloat(getComputedStyle(thumb).translate);
    if (!Number.isFinite(along)) return 0;
    return clamp((getComputedStyle(track).direction === 'rtl' ? -along : along) / travel);
  }

  /** SWT-19: where a pointer is along the track, as the handle's progress — 0 at its unselected position, 1 at its selected one (mirrored in RTL, SWT-11). */
  private progressAt(event: PointerEvent): number {
    const track = this.renderRoot.querySelector('.track');
    if (!track) return this.checked ? 1 : 0;
    const box = track.getBoundingClientRect();
    const travel = box.width - box.height;
    if (travel <= 0) return this.checked ? 1 : 0;
    const along = (event.clientX - box.left - box.height / 2) / travel;
    return clamp(getComputedStyle(track).direction === 'rtl' ? 1 - along : along);
  }

  /** SWT-19: a press on the track, the handle or the target around them may become a drag; the label is not part of the control. */
  private onControlPointerDown(event: PointerEvent) {
    if (this.drag || this.selection.disabled || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    this.drag = new SheetDrag(event, 'x');
    window.addEventListener('pointermove', this.onPointerMove, true);
    window.addEventListener('pointerup', this.onPointerUp, true);
    window.addEventListener('pointercancel', this.onPointerCancel, true);
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    const step = drag.move(event);
    if (step === 'start') this.takeDrag(event);
    else if (step === 'follow') {
      this.pointerAt = this.progressAt(event);
      this.drawDrag();
    }
  };

  /**
   * SWT-19: the drag is the switch's. The pointer is captured, the switch stays pressed, and the handle goes to the
   * pointer: over the state motion when it was away from it (the catch-up), then in the frame the pointer moves.
   */
  private takeDrag(event: PointerEvent) {
    const [root, control, sizer] = [this.root, this.renderRoot.querySelector('.control'), this.renderRoot.querySelector('.sizer')];
    if (!root || !control || !sizer) return;
    try {
      control.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that cannot be captured (it is no longer active) is still followed from the window's events.
    }
    // The pointer may have left the switch, which ended the press, before it passed the slop along the track.
    if (this.renderRoot.querySelector<HTMLElement>('.container')?.dataset.pressed === undefined) this.press.press({ x: event.clientX, y: event.clientY });
    // Where the handle is drawn now — at rest, or on its way after a tap — is where the drag takes it from.
    this.progress = this.drawnProgress();
    this.pointerAt = this.progressAt(event);
    this.lag = this.progress - this.pointerAt;
    root.style.setProperty(PROGRESS, String(this.progress));
    root.setAttribute('data-drag', '');
    window.addEventListener('keydown', this.onDragKeyDown, true);
    // The state motion, computed by a real property (`.sizer` carries it as an inert transition); none where motion
    // is reduced (SWT-21), so the handle is at the pointer at once.
    const motion = getComputedStyle(sizer);
    const duration = Number.parseFloat(motion.transitionDuration) * 1000;
    if (this.lag !== 0 && duration > 0 && typeof sizer.animate === 'function') {
      this.catchUp = sizer.animate(null, { duration, easing: motion.transitionTimingFunction });
      const frame = () => {
        if (!this.catchUp) return;
        this.drawDrag();
        if (this.catchUp.playState === 'finished') this.endCatchUp();
        else this.catchUpFrame = requestAnimationFrame(frame);
      };
      this.catchUpFrame = requestAnimationFrame(frame);
    }
    this.drawDrag();
  }

  /** SWT-19: the handle at the pointer's place — less what is left of the catch-up — and every part at that progress. */
  private drawDrag() {
    const left = this.catchUp ? 1 - (this.catchUp.playState === 'finished' ? 1 : (this.catchUp.effect?.getComputedTiming().progress ?? 1)) : 0;
    this.progress = clamp(this.pointerAt + this.lag * left);
    this.root?.style.setProperty(PROGRESS, String(this.progress));
  }

  private endCatchUp() {
    cancelAnimationFrame(this.catchUpFrame);
    this.catchUp?.cancel();
    this.catchUp = null;
  }

  /**
   * SWT-20: a release chooses the side a fling is toward, else the side the handle is nearer to — the other condition
   * from the middle on. A change switches `checked` with one `input` and one `change`, as an activation does; either
   * way the progress leaves the pointer's place for the condition's over the selection motion.
   */
  private readonly onPointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.following) {
      this.endDrag();
      return;
    }
    this.pointerAt = this.progressAt(event);
    this.drawDrag();
    const velocity = drag.velocity(event) * (getComputedStyle(this).direction === 'rtl' ? -1 : 1);
    const chosen = Math.abs(velocity) >= SHEET_FLING_VELOCITY ? velocity > 0 : this.checked ? this.progress > 0.5 : this.progress >= 0.5;
    const switches = chosen !== this.checked;
    // The native switch takes the chosen condition before the progress is let go, so that the progress leaves the
    // pointer's place for that condition's in one step.
    if (switches) {
      const input = this.input;
      if (input) input.checked = chosen;
      this.checked = chosen;
    }
    this.swallowClick = true;
    this.endDrag();
    this.press.release(event);
    if (!switches) return;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.onChange();
  };

  private readonly onPointerCancel = (event: PointerEvent) => {
    if (this.drag && event.pointerId === this.drag.id) this.cancelDrag();
  };

  /** SWT-21: Escape cancels a drag in progress, and is spent on it: nothing behind the switch hears it. */
  private readonly onDragKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !this.drag?.following) return;
    event.preventDefault();
    event.stopPropagation();
    this.cancelDrag();
  };

  /** SWT-21: a capture taken away (a system gesture) cancels the drag; after a release there is none left to cancel. */
  private onLostPointerCapture(event: PointerEvent) {
    if (this.drag?.following && event.pointerId === this.drag.id) this.cancelDrag();
  }

  /**
   * SWT-21: the drag is over without a choice. The handle and the look return to the condition `checked` holds, over
   * the selection motion; nothing is emitted, and a click the pointer still produces is not an activation.
   */
  private cancelDrag() {
    if (!this.drag) return;
    this.swallowClick = this.drag.following;
    this.endDrag();
    this.press.release('pointer');
  }

  /** Lets go of the pointer and of the progress: the stylesheet's value (0 or 1) is its target again. */
  private endDrag() {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    window.removeEventListener('pointermove', this.onPointerMove, true);
    window.removeEventListener('pointerup', this.onPointerUp, true);
    window.removeEventListener('pointercancel', this.onPointerCancel, true);
    window.removeEventListener('keydown', this.onDragKeyDown, true);
    this.endCatchUp();
    if (!drag.following) return;
    const [root, control] = [this.root, this.renderRoot.querySelector('.control')];
    // SWT-20, SWT-21: from where the pointer left it the handle travels to its condition's place.
    this.markTravel();
    root?.removeAttribute('data-drag');
    root?.style.removeProperty(PROGRESS);
    try {
      if (control?.hasPointerCapture(drag.id)) control.releasePointerCapture(drag.id);
    } catch {
      // The pointer is gone already.
    }
  }

  /** A new press: whatever click a drag left unanswered is not coming any more. Presses on the control arrive here after `onControlPointerDown`. */
  private onRootPointerDown(event: PointerEvent) {
    this.swallowClick = false;
    this.press.onPointerDown(event);
  }

  /** SWT-19: the switch stays pressed for as long as a drag lasts, wherever the captured pointer goes. */
  private onPointerLeave(event: PointerEvent) {
    if (!this.drag?.following) this.press.release(event);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.cancelDrag();
    this.swallowClick = false;
    this.travelMark += 1;
    this.root?.removeAttribute('data-between');
  }

  /** SWT-21: the product set `checked`, or the switch became disabled, while a drag lasted: the drag is cancelled. */
  protected override willUpdate(changed: PropertyValues<this>) {
    if (this.drag && ((this.hasUpdated && changed.has('checked')) || this.selection.disabled)) this.cancelDrag();
    // SWT-13: a change of condition the product made is drawn by this update.
    if (this.hasUpdated && changed.has('checked')) this.markTravel();
  }

  protected override updated(changed: PropertyValues<this>) {
    this.selection.setFormValue(this.checked ? this.value : null, String(this.checked));
    // SWT-16: a switch without a name still renders; a debug build says what is missing.
    if (changed.has('label') && !this.label && !this.selection.field.label) report(this, 'SWT-16', 'label is empty, so the switch has no accessible name; give it a label');
  }

  protected override render() {
    const visible = !!this.label && !this.labelHidden;
    // The native checkbox with the role switch supplies on / off (never a checked checkbox, SWT-14), focusability, Space
    // and the disabled state. The name is `label`, visible or not; the drawn text and the glyphs are hidden from
    // assistive technology, so on and off are announced from the state and the name once. Both glyphs are in the
    // handle, the unselected one under the selected one, and the progress crossfades them (SWT-19) — as it does the two
    // layers of the track (.fill), of the container (.tint) and of the handle (.paint); the two rulers and the row they
    // stand in (.sizer) are the handle's size (switch.styles.ts).
    return html`
      <label
        class="root"
        ?data-checked-icon=${!!this.checkedIcon}
        ?data-unchecked-icon=${!!this.uncheckedIcon}
        @click=${this.onRootClick}
        @pointerdown=${this.onRootPointerDown}
        @pointerup=${this.press.release}
        @pointercancel=${this.press.release}
        @pointerleave=${this.onPointerLeave}
      >
        <span class="control" @pointerdown=${this.onControlPointerDown} @lostpointercapture=${this.onLostPointerCapture}>
          <input
            class="native"
            type="checkbox"
            role="switch"
            .checked=${live(this.checked)}
            ?disabled=${this.selection.disabled}
            aria-label=${this.selection.field.name(this.label) || nothing}
            aria-description=${this.selection.field.description() || nothing}
            aria-invalid=${this.selection.field.invalid ? 'true' : nothing}
            aria-required=${this.selection.field.required ? 'true' : nothing}
            @input=${this.onInput}
            @change=${this.onChange}
            @keydown=${this.onKeyDown}
            @keyup=${this.press.onKeyUp}
            @blur=${this.press.onBlur}
            @focus=${this.onFocus}
          />
          <span part="track" class="track" data-tanrei-shape aria-hidden="true"><span class="fill off"></span><span class="fill on"></span></span>
          <span class="thumb" aria-hidden="true" @transitionend=${this.endTravel} @transitioncancel=${this.endTravel}>
            <span part="container" class="container" data-tanrei-shape><span class="tint off"></span><span class="tint on"></span></span>
            <span class="sizer">
              <span class="ruler more"><span></span></span>
              <span class="ruler less"><span></span></span>
              <span class="elevation off"></span>
              <span class="elevation on"></span>
              <span part="handle" class="handle">
                <span class="paint off"></span>
                <span class="paint on"></span>
                ${this.uncheckedIcon ? html`<span class="glyph off"><span part="icon" class="icon off"><span class="ink">${this.uncheckedIcon}</span></span></span>` : nothing}
                ${this.checkedIcon ? html`<span class="glyph on"><span part="icon" class="icon on"><span class="ink">${this.checkedIcon}</span></span></span>` : nothing}
              </span>
            </span>
          </span>
        </span>
        ${visible ? html`<span part="label" class="label" aria-hidden="true">${this.label}</span>` : nothing}
      </label>
    `;
  }
}

// Its `disabled` attribute, written while it holds focus, waits until focus has left: a frame at most.
disabledWaitsWhileFocused(TanreiSwitch);
// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiSwitch);
if (!customElements.get('tanrei-switch')) customElements.define('tanrei-switch', TanreiSwitch);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-switch': TanreiSwitch;
  }
}
