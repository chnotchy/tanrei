import { type CSSResult, type ReactiveController, type ReactiveControllerHost, unsafeCSS } from 'lit';
import { cornerRadius } from '../styles/shape.js';
import { formOf, pressDefaultButton } from './default-button.js';
import { FieldControlController, type FieldControlOptions } from './field.js';
import { takeFormDisabled } from './form-disabled.js';
import type { Point } from './ripple.js';
import { type StateSelector, stateRules } from './states.js';

/**
 * Selection controls (checkbox, radio button, switch): a form-associated element whose semantics
 * are a native `<input>` in its shadow root (axe cannot see ElementInternals roles),
 * wrapped in a `<label>` so that a click on the visible label — or on the minimum target around the control — activates
 * the input as a native label does. The anatomy every one of them shares, and that the pieces below assume:
 *
 *   <label class="root">                  hover, opacity; carries the current state's value of every part (--_<key>)
 *     <span class="control">              the control's layout box; the minimum target (::before); press-hold carrier
 *       <input class="native">            role, state, focus, keyboard, disabled — invisible, clicks reach it through the label
 *       <span class="container">          the round state layer: data-pressed, the ripple
 *       …the component's own parts
 *     <span class="label">                the visible label, when there is one
 *
 * `SelectionController` is the element's side (form value, fieldset-disabled, a click on the host, Enter); the CSS
 * helpers are its styles' side (the condition blocks, the state rules on `.root`, the label).
 */

/** The interaction states as the token names say them (`<condition>-<state>-<part>`), and their private suffix. */
export const SELECTION_STATES = { '': '-r', hovered: '-h', focused: '-f', pressed: '-p', disabled: '-d' } as const;

/**
 * One condition's parts in every state, as private custom properties under `selector`: `--_<key><suffix>`
 * reads `<prefix>-<condition>-[<state>-]<part>` — `--_c-h` is the container of this condition, hovered.
 */
export function conditionBlock(prefix: string, condition: string, parts: Record<string, string>, selector: string): string {
  return `${selector} {\n${Object.entries(SELECTION_STATES)
    .flatMap(([state, suffix]) => Object.entries(parts).map(([key, part]) => `  --_${key}${suffix}: var(${prefix}-${condition}-${state ? `${state}-` : ''}${part});`))
    .join('\n')}\n}`;
}

/**
 * Where each state is read (for `stateRules()`): hover is the whole `.root` — the label is part of the hit area — focus
 * and disabled are the native input's, and pressed is `data-pressed` on the container (`PressController`). `:where()`
 * keeps every state rule at the resting rule's specificity, so the order `stateRules()` writes them in is the precedence.
 */
export const selectionState = (state: string) =>
  state === ':hover' ? '.root:where(:hover)' : `.root:where(:has(${state.startsWith('[') ? '.container' : 'input'}${state}))`;

/**
 * The state rules of a component whose conditions are its state variants: each state sets, on `root`, the
 * current value of every part (`--_<key>`, from the condition block's `--_<key><suffix>`) from that state's tokens of
 * the current condition, the component's opacity and its container shape (`--_shape`, `--_shape-pill`, which the
 * container names with `selectionContainerShape`). Under ripple and dim everything but the container color (`container`
 * names its key) comes from the pressed tokens; under none nothing changes. `on` names where each state is read (see
 * `stateRules()`); every selector it returns must have the same specificity, so that the order is the precedence.
 */
export function conditionStates(prefix: string, parts: Record<string, string>, { container, root, on }: { container: string; root: string; on: StateSelector }): string {
  const set = (suffix: string, skip?: string) =>
    Object.keys(parts)
      .filter((key) => key !== skip)
      .map((key) => `\n    --_${key}: var(--_${key}${suffix});`)
      .join('');
  const shape = (state: string) => `
    --_shape: var(${prefix}-${state}-container-shape);
    --_shape-pill: var(${prefix}-${state}-container-shape-pill, 0);
    opacity: var(${prefix}-${state}-opacity);`;
  return `
  ${root} {${set('-r')}
    --_shape: var(${prefix}-container-shape);
    --_shape-pill: var(${prefix}-container-shape-pill, 0);
  }
  ${stateRules(on, {
    hovered: `${set('-h')}${shape('hovered')}`,
    focused: `${set('-f')}${shape('focused')}`,
    pressed: `${set('-p')}${shape('pressed')}`,
    pressedContent: `${set('-p', container)}${shape('pressed')}`,
    disabled: `
    cursor: default;${set('-d')}${shape('disabled')}`,
  })}`;
}

/**
 * The state rules of a selection control (CHK-5/8/9/10, RAD-7/10/11/12, SWT-3/6/7/8): `conditionStates()` on `.root`,
 * each state read where `selectionState` says. The container takes the pressed color without a transition in.
 */
export function selectionStates(prefix: string, parts: Record<string, string>, container: string): CSSResult {
  return unsafeCSS(`${conditionStates(prefix, parts, { container, root: '.root', on: selectionState })}
  .container[data-pressed]:not([data-pressed='none']) {
    transition-duration: 0s;
  }
`);
}

/** The container names the current state's shape token, the way `cornerRadius()` names one. */
export const selectionContainerShape = cornerRadius('--_shape');

/**
 * The root and its label (CHK-15, RAD-17, SWT-15): the control, then the label at its inline end `gap` away — RTL
 * mirrors the order — in the label's text role, wrapping rather than truncating. The label's first line is centered on
 * the control (`block` is the control's block size), and every line after it continues below.
 */
export function selectionLabel(prefix: string, block: string): CSSResult {
  return unsafeCSS(`
  :host {
    display: inline-flex;
    vertical-align: middle;
    max-inline-size: 100%;
  }
  .root {
    display: flex;
    flex: 1 1 auto;
    min-inline-size: 0;
    align-items: flex-start;
    gap: var(${prefix}-label-gap);
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: opacity var(${prefix}-motion-state-duration) var(${prefix}-motion-state-easing);
  }
  .control {
    position: relative;
    flex: none;
  }
  ${recolorTiming(prefix)}
  .native {
    all: unset;
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    /* A click anywhere on the control reaches the input through the label, like a click on the label's text. */
    pointer-events: none;
    appearance: none;
  }
  /* The control is centered on the label's first line: the root carries the label's text style, so 1lh is the label's
     line height on the control too. A line shorter than the control is padded down to its middle; a taller one moves
     the control down to the line's middle. */
  .root {
    font: var(${prefix}-label-typescale-font);
    letter-spacing: var(${prefix}-label-typescale-letter-spacing);
  }
  .root:has(.label) .control {
    margin-block-start: max(0px, calc((1lh - ${block}) / 2));
  }
  .label {
    flex: 0 1 auto;
    min-inline-size: 0;
    padding-block: max(0px, calc((${block} - 1lh) / 2));
    color: var(--_l);
    overflow-wrap: break-word;
    transition: color var(--_recolor-duration) var(--_recolor-easing);
  }
  @media (prefers-reduced-motion: reduce) {
    .root,
    .label {
      transition: none;
    }
  }
  @media (forced-colors: active) {
    .label {
      color: CanvasText;
    }
    .root:has(input:disabled) .label {
      color: GrayText;
    }
  }
`);
}

/**
 * The ripple's origin for `PressController` (CHK-10, RAD-12, SWT-8): the point of contact when it is on the round
 * container, its center when the press is outside it — on the label, or on a switch's track away from the handle.
 */
export const selectionRippleOrigin =
  (container: () => Element | null) =>
  (at: Point): Point | null => {
    const box = container()?.getBoundingClientRect();
    if (!box) return null;
    const [cx, cy] = [box.left + box.width / 2, box.top + box.height / 2];
    return Math.hypot(at.x - cx, at.y - cy) <= Math.min(box.width, box.height) / 2 ? at : null;
  };

/** The latest change of condition on each root, so that only the last one's frames remove the mark. */
const changes = new WeakMap<Element, number>();

/**
 * CHK-5 / CHK-13 (RAD-7 / RAD-15, SWT-3 / SWT-13): a part that both the interaction states and the condition recolor
 * changes over the state motion, except when the condition changes, which takes the selection motion. CSS cannot tell
 * the two apart, so the element marks a change of condition: `data-condition-change` on `.root` from the change until
 * two frames later — long enough for the transitions to start with the selection's timing (a running transition keeps
 * the timing it started with), and not so long that a hover right after it would take it. Call it before the update
 * that draws the new condition is styled (in `willUpdate`, or in the event that changed it).
 */
export function markConditionChange(root: Element | null | undefined) {
  if (!root) return;
  root.setAttribute('data-condition-change', '');
  const token = (changes.get(root) ?? 0) + 1;
  changes.set(root, token);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (changes.get(root) === token) root.removeAttribute('data-condition-change');
    }),
  );
}

/**
 * The timing of the parts that the states and the condition both recolor (see `markConditionChange`): on `.root`,
 * `--_recolor-duration` and `--_recolor-easing` are the state motion, and the selection motion while the condition changes.
 * `stateDuration` is the property the state motion's duration is read from, where it follows the size (the chip's and
 * the segmented button's: a private property of the size, written by the component's size block).
 */
export function recolorTiming(prefix: string, stateDuration = `${prefix}-motion-state-duration`): CSSResult {
  return unsafeCSS(`
  .root {
    --_recolor-duration: var(${stateDuration});
    --_recolor-easing: var(${prefix}-motion-state-easing);
  }
  .root[data-condition-change] {
    --_recolor-duration: var(${prefix}-motion-selection-duration);
    --_recolor-easing: var(${prefix}-motion-selection-easing);
  }
`);
}

/** What the controller needs from the element. */
export interface SelectionHost extends ReactiveControllerHost, HTMLElement {
  disabled: boolean;
  readonly isUpdatePending: boolean;
  readonly renderRoot: HTMLElement | DocumentFragment;
}

/**
 * The element's side of a selection control, as a Lit controller: its `ElementInternals` (form value, validity), the
 * disabled state an ancestor `<fieldset disabled>` gives it, a click on the host itself (a `<label for>` in the light
 * DOM, a dispatched click) activating the native input once, and Enter, which on the web submits the form instead of
 * activating the control (CHK-1, RAD-1, SWT-1). The element keeps `static formAssociated = true` and forwards its form
 * callbacks.
 */
export class SelectionController implements ReactiveController {
  readonly internals: ElementInternals;
  /** Set by an ancestor `<fieldset disabled>` (the element's `formDisabledCallback`). */
  formDisabled = false;
  /**
   * What a field or a field group around the control gives it (src/primitives/field.ts): the name while it has none of
   * its own, the description, the invalid and required states, and `disabled` (FLD-8, FLD-10, FLD-11, FLD-14, FGR-8,
   * FGR-14). The element reads it where it renders the native input.
   */
  readonly field: FieldControlController;

  constructor(
    private readonly host: SelectionHost,
    private readonly input: () => HTMLInputElement | null,
    field: FieldControlOptions = {},
  ) {
    this.field = new FieldControlController(host, field);
    this.internals = host.attachInternals();
    host.addController(this);
    host.addEventListener('click', this.onHostClick);
  }

  hostConnected() {
    // Nothing to do on connection: the element forwards its form callbacks, and a click on the host is heard from the start.
  }

  /** Disabled by its own `disabled`, by a disabled fieldset around it, or by the field or field group that frames it. */
  get disabled(): boolean {
    return this.host.disabled || this.formDisabled || this.field.disabled;
  }

  /** The form this element belongs to, if any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** `element.click()`: activates the native input as a person would, and does nothing while disabled. */
  click() {
    if (!this.disabled) this.input()?.click();
  }

  /** The value submitted with the form (`null`: nothing), and what a restored form state is. */
  setFormValue(value: string | null, state: string) {
    // Disabled, it submits nothing — said here too: the platform leaves a disabled element out by its attribute, which
    // waits a frame where the element holds focus (disabled-while-focused.ts).
    this.internals.setFormValue(this.host.disabled ? null : value, state);
  }

  /** The native input's validity is the element's (`required`, as the native control has it). */
  syncValidity() {
    const input = this.input();
    if (!input) return;
    if (input.validity.valid) this.internals.setValidity({});
    else this.internals.setValidity(input.validity, input.validationMessage, input);
  }

  formDisabledCallback(disabled: boolean) {
    takeFormDisabled(this.host, disabled, (value) => {
      this.formDisabled = value;
      this.host.requestUpdate();
    });
  }

  /**
   * Enter does not activate a selection control on the web: in a form it submits it (the native checkbox's convention)
   * — through the form's default button, which a disabled one stops (BTN-30).
   */
  readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.repeat) return;
    event.preventDefault();
    // In the shadow root of a form-associated element — a checkbox group's select-all checkbox — the form is that
    // element's (src/primitives/default-button.ts, `formOf`).
    const form = formOf(this.host, this.form);
    if (form) pressDefaultButton(form);
  };

  /**
   * A click aimed at the host itself — a light-DOM `<label for>` naming it, or a click dispatched on it — activates the
   * native input, once; that click then arrives from the input. A click from inside the shadow root already is the
   * input's (or the label's, which the browser turns into the input's).
   */
  private readonly onHostClick = (event: MouseEvent) => {
    if (event.composedPath()[0] !== this.host) return;
    event.stopImmediatePropagation();
    this.click();
  };
}
