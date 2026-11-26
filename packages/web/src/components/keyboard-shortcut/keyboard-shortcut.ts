import { type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import {
  AvailabilityController,
  type ConventionReader,
  type KeyboardConvention,
  OpenAxesController,
  SHORTCUT_UPDATE,
  ambientConvention,
  chordsConverter,
  drawnChords,
  hostAria,
  notifyItemUpdate,
  platformConvention,
  report,
  unwatchConvention,
  watchConvention,
  writeChords,
} from '../../primitives/index.js';
import type { TanreiKeyboardShortcutSizeRegistry, TanreiKeyboardShortcutVariantRegistry } from '../../registry.js';
import { AXES, styles } from './keyboard-shortcut.styles.js';
import { TanreiElement } from '../../primitives/element.js';
import { DEBUG } from '../../primitives/debug.js';

/** How the keys are drawn: in caps, or as a line of text. A design system may add values. */
export type TanreiKeyboardShortcutVariant = keyof TanreiKeyboardShortcutVariantRegistry;
/** The size of the caps and legends. A design system may add values. */
export type TanreiKeyboardShortcutSize = keyof TanreiKeyboardShortcutSizeRegistry;
/** Whose keyboard the keys are written for: `auto` is the nearest ancestor's `data-tanrei-keyboard-convention`, else the platform's. */
export type TanreiKeyboardShortcutConvention = 'auto' | 'apple' | 'standard';

const CONVENTIONS: readonly TanreiKeyboardShortcutConvention[] = ['auto', 'apple', 'standard'];

// The keys are written by primitives/keyboard-writing.ts (KBS-1, KBS-3…5, KBS-12, KBS-18), which a page written on a
// server reads too (`@tanrei/web/keyboard-convention`), to draw the same keys before the element is defined.

/**
 * Shows the keys that perform a command, as keys or as text, in the modifier symbols and names of the keyboard the
 * person is using, read aloud in the product's own words.
 *
 * Contract: specs/keyboard-shortcut.spec.json. Write the keys once, in neutral names — `<tanrei-keyboard-shortcut
 * keys="mod+shift+k">` draws ⇧⌘K on Apple platforms and Ctrl+Shift+K elsewhere; `keys="mod+k mod+c"` is a sequence of
 * two chords. It only shows keys: it takes no focus and no input, and does not make them work (KBS-14). Every visual value
 * is a `--tanrei-comp-keyboard-shortcut-*` token.
 *
 * What is drawn is hidden from assistive technology; one visually hidden text is read in its place, where the shortcut
 * sits: `label`, the shortcut in the product's own words ("Shift Command K", KBS-10) — and without it the notation of
 * `aria-keyshortcuts` ("Meta+Shift+K", KBS-11), because Tanrei has no names for keys in any language. The convention is `convention`, or under
 * `auto` the nearest ancestor's `data-tanrei-keyboard-convention` (`apple` or `standard`), else the platform's (KBS-2).
 *
 * @tag tanrei-keyboard-shortcut
 * @csspart sequence - The chords, in order, a sequence gap apart (hidden from assistive technology).
 * @csspart chord - The `<kbd>` of one chord: the keys pressed together.
 * @csspart container - One key's `<kbd>`: its cap in the keycap form.
 * @csspart label - A key's legend.
 * @csspart separator - The + between two keys of a chord in the standard convention.
 * @cssprop --tanrei-comp-keyboard-shortcut-container-color - A cap's fill.
 * @cssprop --tanrei-comp-keyboard-shortcut-outline-color - A cap's edge.
 */
export class TanreiKeyboardShortcut extends TanreiElement implements ConventionReader {
  private readonly availability = new AvailabilityController(this, 'keyboard-shortcut');
  private readonly axes = new OpenAxesController(this, { component: 'keyboard-shortcut', behavior: 'KBS-6', axes: AXES });
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    keys: { converter: chordsConverter },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    convention: { type: String, reflect: true },
    label: { type: String },
    disabled: { type: Boolean, reflect: true },
    hosted: { type: Boolean, attribute: false },
    resolved: { state: true },
  };

  /**
   * The shortcut: one chord per string, pressed in order. A chord is key names joined by + (`mod+shift+k`): the modifiers
   * mod (Command on Apple platforms, Control elsewhere), ctrl, alt and shift; the named keys enter, escape, tab,
   * backspace, delete, space, arrow-up, arrow-down, arrow-left, arrow-right, home, end, page-up, page-down, caps-lock,
   * f1 to f24 and plus; any other single character is that character's key. Names ignore case. The attribute holds the
   * chords separated by spaces (`keys="mod+k mod+c"`).
   */
  keys: string[] = [];

  /** How the keys are drawn: `keycap` puts each key in its own cap; `plain` writes the shortcut as a line of text. */
  variant: TanreiKeyboardShortcutVariant = 'keycap';

  /** `small` (20 caps, 12 text) sits in a line of body text or a menu row; `medium` (24 caps, 14 text) beside larger text. */
  size: TanreiKeyboardShortcutSize = 'medium';

  /** Whose keyboard the keys are written for: `apple`, `standard`, or `auto` — the nearest ancestor's, else the platform's. */
  convention: TanreiKeyboardShortcutConvention = 'auto';

  /** What assistive technology reads in place of the drawn keys: the shortcut in the product's own words ("Shift Command K"). Tanrei has no names for keys: without it the notation of `aria-keyshortcuts` is read ("Meta+Shift+K"). */
  label = '';

  /** Fades the legends, for the shortcut of a command that is unavailable. The keys still show. */
  disabled = false;

  /**
   * @internal KBS-13: drawn in a part of another component (a menu item's trailing column), which exposes the shortcut
   * itself: the legends take the part's text style and color (they inherit the host element's `font`, `letter-spacing`
   * and `color`), and nothing is exposed to assistive technology.
   */
  hosted = false;

  /** The convention the keys are written in now (KBS-2). */
  private resolved: KeyboardConvention = 'standard';

  override connectedCallback() {
    super.connectedCallback();
    watchConvention(this, this);
    this.resolved = this.resolveConvention();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    unwatchConvention(this);
  }

  /** @internal KBS-2: an ancestor's `data-tanrei-keyboard-convention` changed somewhere; read it again. */
  conventionChanged() {
    const now = this.resolveConvention();
    if (now !== this.resolved) this.resolved = now;
  }

  /** KBS-2: `convention`, or under `auto` the nearest ancestor's, else the platform's — never the design system's. */
  private resolveConvention(): KeyboardConvention {
    const convention = this.convention;
    if (convention === 'apple' || convention === 'standard') return convention;
    return (this.isConnected ? ambientConvention(this) : null) ?? platformConvention();
  }

  /** The chords as drawn now, and what is wrong with each. */
  private write(convention = this.resolveConvention()) {
    return writeChords(this.keys, convention);
  }

  /**
   * KBS-12: the shortcut in the form `aria-keyshortcuts` takes — each chord's modifiers then its key joined by +, mod as
   * Meta under the apple convention and Control under the standard one, the chords separated by spaces (`Meta+Shift+K`;
   * `Control+K Control+C`) — or null without keys. Read-only: a component that hosts the shortcut (a menu item) sets it on
   * its own element. The shortcut itself sets no `aria-keyshortcuts`: it only shows keys.
   */
  override get ariaKeyShortcuts(): string | null {
    const chords = this.write()
      .map(({ drawn }) => drawn.aria)
      .filter(Boolean);
    return chords.length ? chords.join(' ') : null;
  }

  /**
   * @internal KBS-10, KBS-11: what is read in place of the keys — `label`, the product's words, else the notation of
   * `aria-keyshortcuts` ("Control+Backspace"), a standard's and the same in every language — for a component that hosts
   * the shortcut and has to say it itself (a menu item without the property, MNU-24; a tooltip whose anchor states
   * its own `aria-keyshortcuts`, TIP-27). Empty without keys.
   */
  get spokenKeys(): string {
    return this.label.trim() || (this.ariaKeyShortcuts ?? '');
  }

  protected override willUpdate(changed: PropertyValues) {
    if (DEBUG && changed.has('convention') && !CONVENTIONS.includes(this.convention)) {
      report(this, 'KBS-2', `convention "${this.convention}" is not auto, apple or standard; it is read as auto`);
    }
    if (changed.has('convention') && this.isConnected) this.resolved = this.resolveConvention();
    // KBS-18: what is drawn as it can be is reported in debug builds, chord by chord.
    if (changed.has('keys') || changed.has('resolved')) {
      for (const { chord, problems } of this.write(this.resolved)) {
        for (const problem of problems) DEBUG && report(this, 'KBS-18', `the chord "${chord}": ${problem}`);
      }
    }
  }

  protected override updated(changed: PropertyValues) {
    // KBS-11: a shortcut that is read where it sits, and has no words of the product's, reads the notation; the
    // developer is told once. (A hosted one is said by its host, which has no label to give it.)
    if (DEBUG && !this.hosted && !this.label.trim() && this.ariaKeyShortcuts) {
      report(this, 'KBS-11', 'label is empty, so the shortcut is read in the notation of aria-keyshortcuts; give it the shortcut in the product\'s own words ("Shift Command K"): Tanrei has no names for keys');
    }
    // KBS-13: a hosted shortcut exposes nothing (the host exposes it); KBS-10: otherwise the one hidden text is read.
    if (changed.has('hosted')) hostAria(this, { 'aria-hidden': this.hosted ? 'true' : null });
    // KBS-12: the host re-reads the form when the convention changes without it (an ancestor's attribute).
    if (changed.has('resolved') && changed.get('resolved') !== undefined) notifyItemUpdate(this, SHORTCUT_UPDATE);
  }

  protected override render() {
    const convention = this.resolved;
    const chords = drawnChords(this.keys, convention);
    // KBS-18: no keys draw nothing and expose nothing.
    if (!chords.length) return nothing;
    // KBS-4, KBS-7: the standard convention joins a chord's keys with +; Apple's writes none.
    const separator = convention === 'standard';
    // KBS-10, KBS-11: the product's words, else the notation; never a name of a key of Tanrei's.
    const spoken = this.spokenKeys;
    // KBS-6…8, KBS-10, KBS-15, KBS-16: a <kbd> per chord holding a <kbd> per key, hidden; the text read in their place.
    return html`${this.hosted ? nothing : html`<span class="spoken">${spoken}</span>`}<span part="sequence" class=${this.hosted ? 'sequence hosted' : 'sequence'} aria-hidden="true"
        >${chords.map(
          (chord) =>
            html`<kbd part="chord" class="chord"
              >${chord.keys.map(
                (k, i) =>
                  html`${separator && i > 0 ? html`<span part="separator" class="separator">+</span>` : nothing}<kbd part="container" class="key" data-tanrei-shape
                      ><span part="label" class="label">${k.legend}</span></kbd
                    >`,
              )}</kbd
            >`,
        )}</span
      >`;
  }
}

if (!customElements.get('tanrei-keyboard-shortcut')) customElements.define('tanrei-keyboard-shortcut', TanreiKeyboardShortcut);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-keyboard-shortcut': TanreiKeyboardShortcut;
  }
}
