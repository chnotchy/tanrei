import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { AvailabilityController, GlyphDrawnController, report, WordsController, delegatedAria, namedByProduct, delegatesAria } from '../../primitives/index.js';
import type { TanreiButtonSizeRegistry, TanreiButtonVariantRegistry } from '../../registry.js';
import '../button/button.js';
import '../tooltip/tooltip.js';
import type { TanreiTooltip } from '../tooltip/tooltip.js';
import { AXES as BUTTON_AXES } from '../button/button.styles.js';
import { styles } from './copy-button.styles.js';
import { focusedAtFirst } from '../../primitives/autofocus.js';
import { TanreiElement } from '../../primitives/element.js';

/** The Button variant it is drawn as: the Button's own values. */
export type TanreiCopyButtonVariant = keyof TanreiButtonVariantRegistry;
/** The Button size it is drawn at: the Button's own values. */
export type TanreiCopyButtonSize = keyof TanreiButtonSizeRegistry;

/** How wide the labelled form's text box is (CPY-7, CPY-19): the widest of its three texts, or the one it shows. */
export type TanreiCopyButtonLabelWidth = 'widest' | 'fit';

/** What `copied` carries: the text that is now on the clipboard. */
export interface TanreiCopyButtonCopiedDetail {
  text: string;
}
/** What `copyfailed` carries: the platform's reason, where it gave one. */
export interface TanreiCopyButtonCopyFailedDetail {
  reason: unknown;
}

/** The three forms (CPY-3, CPY-4) and the glyph each shows. */
type Form = 'rest' | 'copied' | 'failed';
const GLYPHS: Record<Form, string> = { rest: 'content_copy', copied: 'check', failed: 'error' };

/** Its own defaults (CPY-17): the quiet icon action beside what it copies, at the Button's medium size. */
const DEFAULT_VARIANT = 'text';
const DEFAULT_SIZE = 'medium';

/**
 * Copies a given text to the clipboard with one press and confirms it — its glyph becomes a check for a moment and
 * assistive technology is told — or says that it could not. It is drawn by Button and never moves the layout.
 *
 * Contract: specs/copy-button.spec.json.
 *
 *     <tanrei-copy-button text="npm install @tanrei/web" label="Copy" copied-label="Copied" failed-label="Could not copy"></tanrei-copy-button>
 *     <tanrei-copy-button icon-only="false" variant="tonal" text="…" label="Copy link" copied-label="Link copied" failed-label="Could not copy"></tanrei-copy-button>
 *     <tanrei-copy-button icon-only="false" label-width="fit" text="…" label="Copy" copied-label="Copied to the clipboard" failed-label="Could not copy"></tanrei-copy-button>
 *
 * It has no color, shape or measure of its own: its shadow root holds a `<tanrei-button>` of the `variant` and `size`
 * you name, so every Button token, state and behaviour applies unchanged — the press and its hold, the focus
 * indicator, the corner smoothing, the hit area, the mirrored `content_copy` in a right-to-left layout.
 *
 * A press asks the browser to put `text` on the clipboard (`navigator.clipboard.writeText`, which needs a secure page
 * and the person's own press). Only when the browser has answered does the button change: the glyph `check` and the
 * `copied` event, or — where the browser refuses or has no clipboard — the glyph `error` and `copyfailed`. It returns
 * to rest after `--tanrei-comp-copy-button-confirmation-duration`. It tries no other way to copy, selects nothing and
 * opens nothing: what else happens on a failure is yours, on `copyfailed`.
 *
 * The words are yours: `label`, `copied-label` and `failed-label` have no defaults. The icon-only form is named by
 * `label` in every form; `copied-label` is announced politely and `failed-label` assertively, through a live region,
 * on every activation. The icon-only form also shows those words for as long as its glyph does, in a small bubble
 * drawn as a plain Tooltip is (a `<tanrei-tooltip>` around the Button), which takes no focus and is not read a second
 * time.
 *
 * The labelled form keeps the width of its widest text, so nothing beside it moves when its words change. With
 * `label-width="fit"` its width follows the text it shows instead, eased over
 * `--tanrei-comp-copy-button-motion-resize-duration` (at once where motion is reduced): for a button with nothing after
 * it in its row that a person may press next.
 *
 * The events are `copied` and `copyfailed`, not `copy`: `copy` is the document's own clipboard event.
 *
 * @tag tanrei-copy-button
 * @csspart button - The Button it is drawn by (a `<tanrei-button>`; its own parts are `container`, `icon` and `label`).
 * @csspart confirmation - The Tooltip that shows the confirmation of the icon-only form (a `<tanrei-tooltip>`).
 * @fires {CustomEvent<TanreiCopyButtonCopiedDetail>} copied - The browser confirmed that the text is on the clipboard; `detail.text` is the text.
 * @fires {CustomEvent<TanreiCopyButtonCopyFailedDetail>} copyfailed - The browser refused the copy or has no clipboard to write to; `detail.reason` is its reason, where it gave one.
 */
export class TanreiCopyButton extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'copy-button');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  static override styles = styles;

  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static override properties: PropertyDeclarations = {
    text: { type: String },
    label: { type: String },
    copiedLabel: { type: String, attribute: 'copied-label' },
    failedLabel: { type: String, attribute: 'failed-label' },
    // True unless the attribute says `false`: an HTML boolean cannot default to true.
    iconOnly: { attribute: 'icon-only', converter: { fromAttribute: (value: string | null) => value === null || value.trim().toLowerCase() !== 'false' } },
    labelWidth: { type: String, attribute: 'label-width', reflect: true },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    form: { state: true },
  };

  /** The text to copy, exactly as it will be pasted. Plain text only. */
  text = '';

  /** What the button does, in your language ("Copy", "Copy link"): the accessible name of the icon-only form and the visible text of the labelled one. Required. */
  label = '';

  /** What is announced, and shown in the labelled form, when the text has been copied ("Copied"). Required. */
  copiedLabel = '';

  /** What is announced, and shown in the labelled form, when the browser refuses the copy ("Could not copy"). Required. */
  failedLabel = '';

  /** True draws the glyph alone, named by `label`. False (`icon-only="false"`) draws the glyph and the label as text. */
  iconOnly = true;

  /**
   * How wide the labelled form's text box is. `widest`, the default, keeps it as wide as the widest of its three texts
   * at all times, so the button never changes its width (CPY-7). `fit` makes it as wide as the text it shows, and eases
   * its width to the new text when the form changes (CPY-19). Ignored while icon-only.
   */
  labelWidth: TanreiCopyButtonLabelWidth = 'widest';

  /**
   * The Button variant it is drawn as — `filled`, `tonal`, `elevated`, `outlined` or `text`. The default, text, is the
   * quiet icon action beside what it copies; a copy that is a view's main action takes another.
   */
  variant: TanreiCopyButtonVariant = DEFAULT_VARIANT;

  /** The Button size it is drawn at: `small` (32), `medium` (40) or `large` (56). */
  size: TanreiCopyButtonSize = DEFAULT_SIZE;

  /** Prevents the copy; the button is drawn and exposed as a disabled Button. */
  disabled = false;

  /** The form it shows now (CPY-3, CPY-4). */
  protected form: Form = 'rest';

  /** CPY-2: the browser has been asked and has not answered; a second activation is ignored until it does. */
  private pending = false;

  /** CPY-3: the return to rest. */
  private timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * CPY-11: while the icon set cannot draw a glyph, nothing is drawn in its place (src/primitives/glyph.ts): the glyph
   * is marked `data-drawn` once its ink is a ligature's and not its name spelled out. A page draws one copy button for
   * every code block it shows: the first decision is the frame's (`firstInFrame`), one pass for them all.
   */
  private readonly drawn = new GlyphDrawnController(
    this,
    () => {
      const glyph = this.renderRoot?.querySelector<HTMLElement>('.glyph');
      return glyph ? [glyph] : [];
    },
    { firstInFrame: true },
  );

  /** CPY-19: the width the label's box was given last, while labelWidth is fit; undefined before the first. */
  private fitted: number | undefined;

  /** CPY-19: a new face changes the texts' widths; the box takes the new width at once. */
  private readonly resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.fit(false));

  /** The label's box the observer watches the texts of. */
  private observed: Element | null = null;

  private get button() {
    return this.renderRoot?.querySelector('tanrei-button') ?? null;
  }

  /** CPY-18: the Tooltip that shows the icon-only form's confirmation. */
  private get confirmation(): TanreiTooltip | null {
    return this.renderRoot?.querySelector('tanrei-tooltip') ?? null;
  }

  private region(role: 'status' | 'alert') {
    return this.renderRoot?.querySelector<HTMLElement>(`.live[role="${role}"]`) ?? null;
  }

  /** `element.click()` activates the button as a person would: through the Button, and not at all while disabled. */
  override click() {
    const button = this.button;
    if (button) button.click();
    else if (!this.disabled) super.click();
  }

  override connectedCallback() {
    super.connectedCallback();
    // Back in a document: the texts are watched again (CPY-19).
    if (this.hasUpdated) this.watchLabels();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.resized?.disconnect();
    this.observed = null;
    // The timer does not outlive the element: it is at rest when it comes back.
    this.rest();
    this.pending = false;
  }

  /** comp.copy-button.confirmation.duration in milliseconds, as the cascade gives it now. */
  private get duration(): number {
    const probe = this.renderRoot?.querySelector('.time');
    const seconds = probe ? Number.parseFloat(getComputedStyle(probe).transitionDuration) : Number.NaN;
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
  }

  /** Back to rest, at once and without a word (CPY-5: nothing is announced on the return). */
  private rest() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.form = 'rest';
    const confirmation = this.confirmation;
    if (confirmation) confirmation.open = false;
    for (const role of ['status', 'alert'] as const) {
      const region = this.region(role);
      if (region) region.textContent = '';
    }
  }

  /**
   * CPY-3, CPY-4, CPY-8: the browser's answer — the form, its event, its announcement, and the time counted from now.
   */
  private answer(form: 'copied' | 'failed', text: string, reason?: unknown) {
    this.pending = false;
    if (!this.isConnected || this.disabled) return;
    clearTimeout(this.timer);
    this.form = form;
    // CPY-5: politely for a copy, assertively for a failure; the region was emptied when the press came, so the same
    // words are announced anew.
    const region = this.region(form === 'copied' ? 'status' : 'alert');
    if (region) region.textContent = form === 'copied' ? this.words.get('copiedLabel', this.copiedLabel) : this.words.get('copyFailedLabel', this.failedLabel);
    // CPY-18: the icon-only form shows the same words for as long as the form lasts; opened again by every answer, also
    // after Escape closed it.
    const confirmation = this.confirmation;
    if (confirmation && this.iconOnly) {
      confirmation.open = false;
      confirmation.open = true;
    }
    this.dispatchEvent(
      form === 'copied'
        ? new CustomEvent<TanreiCopyButtonCopiedDetail>('copied', { bubbles: true, detail: { text } })
        : new CustomEvent<TanreiCopyButtonCopyFailedDetail>('copyfailed', { bubbles: true, detail: { reason } }),
    );
    // CPY-9: a time to notice, not a motion: it is the same where motion is reduced.
    this.timer = setTimeout(() => this.rest(), this.duration);
  }

  /** CPY-2: an activation — by pointer, touch, Enter, Space or assistive technology, all of which click the Button. */
  #onClick() {
    if (this.disabled || this.pending) return;
    // CPY-5: every activation is announced anew.
    for (const role of ['status', 'alert'] as const) {
      const region = this.region(role);
      if (region) region.textContent = '';
    }
    const text = this.text;
    // CPY-4: nothing to copy is a failure.
    if (!text) {
      report(this, 'CPY-4', 'text is empty, so there is nothing to copy', { once: false });
      this.answer('failed', text, new Error('There is nothing to copy.'));
      return;
    }
    this.pending = true;
    let asked: Promise<void>;
    try {
      // The browser's own clipboard, as plain text. No fallback: where it is missing or refuses, that is CPY-4.
      asked = navigator.clipboard.writeText(text);
    } catch (reason) {
      asked = Promise.reject(reason);
    }
    asked.then(
      () => this.answer('copied', text),
      (reason: unknown) => this.answer('failed', text, reason),
    );
  }

  /** CPY-17: the Button value that is drawn — the prop's where the active design system's Button has it, else the copy button's own default. */
  private drawnValue(axis: 'variant' | 'size'): string {
    const value = this[axis] as string;
    const declared = BUTTON_AXES.find((each) => each.name === axis)!;
    if (declared.core.includes(value)) return value;
    const known = /^[a-z0-9][a-z0-9-]*$/.test(value) && this.isConnected && getComputedStyle(this).getPropertyValue(declared.probe(value)).trim() !== '';
    if (known) return value;
    const fallback = axis === 'variant' ? DEFAULT_VARIANT : DEFAULT_SIZE;
    report(this, 'CPY-17', `${axis} "${value}" is not a value of the Button in the active design system; it is drawn as "${fallback}"`);
    return fallback;
  }

  protected override willUpdate(changed: PropertyValues) {
    // CPY-9: what was copied is no longer what would be. CPY-10: a disabled button shows no confirmation.
    if ((changed.has('text') && this.form === 'copied' && changed.get('text') !== undefined) || (changed.has('disabled') && this.disabled && this.form !== 'rest')) this.rest();
    // CPY-18: the labelled form says it in its label, and shows no bubble.
    else if (changed.has('iconOnly') && !this.iconOnly && this.confirmation) this.confirmation.open = false;
  }

  /** CPY-19: watches the three texts of the label's box, while labelWidth is fit. */
  private watchLabels() {
    const labels = this.renderRoot?.querySelector('.labels[data-fit]') ?? null;
    if (labels === this.observed) return;
    this.resized?.disconnect();
    this.observed = labels;
    if (labels) for (const each of labels.children) this.resized?.observe(each);
  }

  /**
   * CPY-19: while labelWidth is fit, the label's box is as wide as the text it shows. A change of form, or of the words
   * shown, eases the width over the resize motion (the box's own transition, none where motion is reduced); the first
   * width, and one a new face gives, are taken at once (`animate` false).
   */
  private fit(animate: boolean) {
    const labels = this.renderRoot?.querySelector<HTMLElement>('.labels[data-fit]');
    if (!labels) {
      this.fitted = undefined;
      return;
    }
    const shown = labels.querySelector<HTMLElement>('.shown');
    // The text's own width (it is max-content wide), not its rendered box: an ancestor's transform does not change it.
    const width = shown ? Number.parseFloat(getComputedStyle(shown).inlineSize) : Number.NaN;
    // Not laid out yet (the Button has not drawn its slot): the observer brings the first width.
    if (!Number.isFinite(width) || width === this.fitted) return;
    const first = this.fitted === undefined;
    this.fitted = width;
    if (first || !animate) {
      labels.setAttribute('data-instant', '');
      labels.style.inlineSize = `${width}px`;
      // The width is in the style before the transition comes back, so nothing animates.
      void getComputedStyle(labels).inlineSize;
      labels.removeAttribute('data-instant');
    } else labels.style.inlineSize = `${width}px`;
  }

  protected override updated(changed: PropertyValues) {
    // CPY-19: the box of a fitting label follows the text it shows; a new box (labelled again, or fit again) starts anew.
    if (this.renderRoot.querySelector('.labels[data-fit]') !== this.observed) this.fitted = undefined;
    this.watchLabels();
    this.fit(true);
    if (!changed.has('label') && !changed.has('copiedLabel') && !changed.has('failedLabel') && !changed.has('iconOnly')) return;
    // CPY-17: it still renders and copies; a debug build says which words are missing.
    if (this.words.lacks('copyLabel', this.label) && !(this.iconOnly && namedByProduct(this))) report(this, 'CPY-17', this.iconOnly ? 'label is empty, so the icon-only button has no accessible name; give it a label' : 'label is empty; give the button its text');
    if (this.words.lacks('copiedLabel', this.copiedLabel)) report(this, 'CPY-17', 'copiedLabel is empty, so a copy is not announced; give it the words');
    if (this.words.lacks('copyFailedLabel', this.failedLabel)) report(this, 'CPY-17', 'failedLabel is empty, so a failure is not announced; give it the words');
  }

  protected override render() {
    // CPY-1: a Button of its variant and size, with the glyph in its icon slot (the Button draws it with the icon
    // helper, and mirrors `content_copy` in a right-to-left layout, CPY-16) and, labelled, the text after it.
    // CPY-6: icon-only, the name is `label` in every form; labelled, the name is the text it shows.
    const shown = this.form === 'copied' ? 'copied' : this.form === 'failed' ? 'failed' : 'label';
    const text = (name: string, value: string) => html`<span class=${name === shown ? 'shown' : ''}>${value}</span>`;
    // CPY-18: the Button is always inside the Tooltip, so that showing a confirmation moves nothing in the tree (and
    // never focus); the Tooltip opens only when the copy button opens it.
    return html`
      <tanrei-tooltip
        part="confirmation"
        .confirming=${true}
        .describes=${false}
        .text=${this.form === 'failed' ? this.words.get('copyFailedLabel', this.failedLabel) : this.words.get('copiedLabel', this.copiedLabel)}
      ><tanrei-button
        part="button"
        variant=${this.drawnValue('variant')}
        size=${this.drawnValue('size')}
        label=${this.iconOnly ? this.words.get('copyLabel', this.label) : nothing}
        ?disabled=${this.disabled}
        data-form=${this.form}
        ${delegatedAria(this, {})}
        @click=${this.#onClick}
      >
        <span slot="icon" class="glyph"><span class="ink">${GLYPHS[this.form]}</span></span>
        ${this.iconOnly ? nothing : html`<span class="labels" ?data-fit=${this.labelWidth === 'fit'} style=${this.labelWidth === 'fit' && this.fitted !== undefined ? `inline-size: ${this.fitted}px` : ''}>${text('label', this.words.get('copyLabel', this.label))}${text('copied', this.words.get('copiedLabel', this.copiedLabel))}${text('failed', this.words.get('copyFailedLabel', this.failedLabel))}</span>`}
      </tanrei-button></tanrei-tooltip>
      <span class="live" role="status"></span>
      <span class="live" role="alert"></span>
      <span class="time"></span>
    `;
  }
}

// `autofocus` on it gives it focus when the page first loads too (src/primitives/autofocus.ts).
focusedAtFirst(TanreiCopyButton);
// The product's ARIA on the host is the element's that carries the role; it is given to the Button it is drawn by, which exposes it; the disabled state is its own.
delegatesAria(TanreiCopyButton, { owns: ['aria-pressed', 'aria-disabled'], sentence: 'CPY-20' });
if (!customElements.get('tanrei-copy-button')) customElements.define('tanrei-copy-button', TanreiCopyButton);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-copy-button': TanreiCopyButton;
  }
}
