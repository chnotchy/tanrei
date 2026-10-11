import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import {
  AvailabilityController,
  type ConventionReader,
  type KeyboardConvention,
  OpenAxesController,
  SHORTCUT_UPDATE,
  ambientConvention,
  chordsConverter,
  chordsOf,
  hostAria,
  notifyItemUpdate,
  platformConvention,
  report,
  unwatchConvention,
  watchConvention,
} from '../../primitives/index.js';
import type { TanreiKeyboardShortcutSizeRegistry, TanreiKeyboardShortcutVariantRegistry } from '../../registry.js';
import { AXES, styles } from './keyboard-shortcut.styles.js';

/** How the keys are drawn: in caps, or as a line of text. A design system may add values. */
export type TanreiKeyboardShortcutVariant = keyof TanreiKeyboardShortcutVariantRegistry;
/** The size of the caps and legends. A design system may add values. */
export type TanreiKeyboardShortcutSize = keyof TanreiKeyboardShortcutSizeRegistry;
/** Whose keyboard the keys are written for: `auto` is the nearest ancestor's `data-tanrei-keyboard-convention`, else the platform's. */
export type TanreiKeyboardShortcutConvention = 'auto' | 'apple' | 'standard';

const CONVENTIONS: readonly TanreiKeyboardShortcutConvention[] = ['auto', 'apple', 'standard'];

// ── The keys (KBS-1, KBS-3…5, KBS-10…12, KBS-18) ────────────────────────────────────────────────────────────────────

type Modifier = 'mod' | 'ctrl' | 'alt' | 'shift';
const MODIFIERS: readonly Modifier[] = ['mod', 'ctrl', 'alt', 'shift'];

/**
 * How one key is written and given to `aria-keyshortcuts`, in each convention. A legend is what the key itself carries
 * in that convention — an engraving, as a glyph is — and the `aria` form is a standard's notation, the same in every
 * language. Neither is a word of Tanrei's, and there is no third form: the shortcut has no names for keys (KBS-11).
 * What is read aloud is the product's `label`, or the notation.
 */
interface Writing {
  apple: string;
  standard: string;
}
interface KeyForms {
  legend: Writing;
  aria: Writing;
}
const same = (text: string): Writing => ({ apple: text, standard: text });
const key = (legend: Writing | string, aria: Writing | string): KeyForms => ({
  legend: typeof legend === 'string' ? same(legend) : legend,
  aria: typeof aria === 'string' ? same(aria) : aria,
});

/** KBS-3, KBS-4, KBS-12: the modifiers. */
const MODIFIER_FORMS: Record<Modifier, KeyForms> = {
  mod: key({ apple: '⌘', standard: 'Ctrl' }, { apple: 'Meta', standard: 'Control' }),
  ctrl: key({ apple: '⌃', standard: 'Ctrl' }, 'Control'),
  alt: key({ apple: '⌥', standard: 'Alt' }, 'Alt'),
  shift: key({ apple: '⇧', standard: 'Shift' }, 'Shift'),
};

/** KBS-3, KBS-4: the order modifiers are drawn and read in, whatever order keys gives. */
const DRAWN_ORDER: Record<KeyboardConvention, readonly Modifier[]> = {
  apple: ['ctrl', 'alt', 'shift', 'mod'],
  standard: ['mod', 'ctrl', 'alt', 'shift'],
};
/** KBS-12: the order of the modifiers in `aria-keyshortcuts` (Meta+Shift+K), as KBS-12 lists them. */
const ARIA_ORDER: readonly Modifier[] = ['mod', 'ctrl', 'alt', 'shift'];

/** KBS-1, KBS-3, KBS-4, KBS-12: the named keys. */
const NAMED: Record<string, KeyForms> = {
  enter: key({ apple: '↩', standard: 'Enter' }, 'Enter'),
  escape: key({ apple: '⎋', standard: 'Esc' }, 'Escape'),
  tab: key({ apple: '⇥', standard: 'Tab' }, 'Tab'),
  backspace: key({ apple: '⌫', standard: 'Backspace' }, 'Backspace'),
  delete: key({ apple: '⌦', standard: 'Delete' }, 'Delete'),
  space: key('Space', 'Space'),
  'arrow-up': key('↑', 'ArrowUp'),
  'arrow-down': key('↓', 'ArrowDown'),
  'arrow-left': key('←', 'ArrowLeft'),
  'arrow-right': key('→', 'ArrowRight'),
  home: key({ apple: '↖', standard: 'Home' }, 'Home'),
  end: key({ apple: '↘', standard: 'End' }, 'End'),
  'page-up': key({ apple: '⇞', standard: 'PgUp' }, 'PageUp'),
  'page-down': key({ apple: '⇟', standard: 'PgDn' }, 'PageDown'),
  'caps-lock': key({ apple: '⇪', standard: 'Caps Lock' }, 'CapsLock'),
  plus: key('+', 'Plus'),
  ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`f${i + 1}`, key(`F${i + 1}`, `F${i + 1}`)])),
};

/** KBS-5: a letter key is its capital letter; any other character is as given. */
const capital = (char: string) => {
  if (!/\p{L}/u.test(char)) return char;
  const upper = char.toUpperCase();
  return [...upper].length === 1 ? upper : char;
};

/** KBS-1, KBS-18: one key other than a modifier — named, a character, or an unknown name drawn as given. */
function keyForms(name: string): { forms: KeyForms; unknown: boolean } {
  const named = NAMED[name.toLowerCase()];
  if (named) return { forms: named, unknown: false };
  if ([...name].length === 1) {
    const char = capital(name);
    return { forms: key(char, char), unknown: false };
  }
  return { forms: key(name, name), unknown: true };
}

/** One key as drawn: its legend. */
interface DrawnKey {
  legend: string;
}
/** One chord as drawn, in the convention: its keys in order, and its `aria-keyshortcuts` form. */
interface DrawnChord {
  keys: DrawnKey[];
  aria: string;
}

/**
 * KBS-1, KBS-3…5, KBS-18: a chord ("mod+shift+k") as the convention writes it — each modifier once, in the convention's
 * order, then each other key once, in order — and what is wrong with it (reported in debug builds).
 */
function writeChord(chord: string, convention: KeyboardConvention): { drawn: DrawnChord; problems: string[] } {
  const names = chord.split('+').map((name) => name.trim());
  const problems: string[] = [];
  const modifiers = new Set<Modifier>();
  const others: KeyForms[] = [];
  let repeated = false;
  for (const name of names) {
    if (!name) continue;
    const lower = name.toLowerCase();
    if ((MODIFIERS as readonly string[]).includes(lower)) {
      if (modifiers.has(lower as Modifier)) repeated = true;
      modifiers.add(lower as Modifier);
      continue;
    }
    const { forms, unknown } = keyForms(name);
    if (unknown) problems.push(`the key "${name}" is not a key name; it is drawn as given`);
    if (others.some((other) => other.legend[convention] === forms.legend[convention])) repeated = true;
    else others.push(forms);
  }
  // A modifier the convention writes like another (ctrl and mod are both Ctrl in the standard convention) is drawn once.
  const drawnModifiers: KeyForms[] = [];
  for (const modifier of DRAWN_ORDER[convention]) {
    if (!modifiers.has(modifier)) continue;
    const forms = MODIFIER_FORMS[modifier];
    if (drawnModifiers.some((each) => each.legend[convention] === forms.legend[convention])) repeated = true;
    else drawnModifiers.push(forms);
  }
  const aria: string[] = [];
  for (const modifier of ARIA_ORDER) {
    const name = MODIFIER_FORMS[modifier].aria[convention];
    if (modifiers.has(modifier) && !aria.includes(name)) aria.push(name);
  }
  aria.push(...others.map((forms) => forms.aria[convention]));
  if (!names.some(Boolean)) problems.push('a chord is empty');
  else if (!others.length) problems.push('it holds only modifiers');
  if (others.length > 1) problems.push('it holds more than one key other than modifiers');
  if (repeated) problems.push('it names a key twice once the convention has written it');
  const keys = [...drawnModifiers, ...others].map((forms) => ({ legend: forms.legend[convention] }));
  return { drawn: { keys, aria: aria.join('+') }, problems };
}

// ── The element ─────────────────────────────────────────────────────────────────────────────────────────────────────

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
export class TanreiKeyboardShortcut extends LitElement implements ConventionReader {
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
    return chordsOf(this.keys).map((chord) => ({ chord, ...writeChord(chord, convention) }));
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
    if (changed.has('convention') && !CONVENTIONS.includes(this.convention)) {
      report(this, 'KBS-2', `convention "${this.convention}" is not auto, apple or standard; it is read as auto`);
    }
    if (changed.has('convention') && this.isConnected) this.resolved = this.resolveConvention();
    // KBS-18: what is drawn as it can be is reported in debug builds, chord by chord.
    if (changed.has('keys') || changed.has('resolved')) {
      for (const { chord, problems } of this.write(this.resolved)) {
        for (const problem of problems) report(this, 'KBS-18', `the chord "${chord}": ${problem}`);
      }
    }
  }

  protected override updated(changed: PropertyValues) {
    // KBS-11: a shortcut that is read where it sits, and has no words of the product's, reads the notation; the
    // developer is told once. (A hosted one is said by its host, which has no label to give it.)
    if (!this.hosted && !this.label.trim() && this.ariaKeyShortcuts) {
      report(this, 'KBS-11', 'label is empty, so the shortcut is read in the notation of aria-keyshortcuts; give it the shortcut in the product\'s own words ("Shift Command K"): Tanrei has no names for keys');
    }
    // KBS-13: a hosted shortcut exposes nothing (the host exposes it); KBS-10: otherwise the one hidden text is read.
    if (changed.has('hosted')) hostAria(this, { 'aria-hidden': this.hosted ? 'true' : null });
    // KBS-12: the host re-reads the form when the convention changes without it (an ancestor's attribute).
    if (changed.has('resolved') && changed.get('resolved') !== undefined) notifyItemUpdate(this, SHORTCUT_UPDATE);
  }

  protected override render() {
    const convention = this.resolved;
    const chords = this.write(convention)
      .map(({ drawn }) => drawn)
      .filter((chord) => chord.keys.length);
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
