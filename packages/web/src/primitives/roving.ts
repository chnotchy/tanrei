/**
 * How long typed characters add up to one typeahead search (LST-17, MNU-7: "within one second of each other"). A
 * behaviour of the spec, not a design value: no system re-values it.
 */
export const TYPEAHEAD_WINDOW = 1000;

/**
 * Whether `label` begins with the typed `text`, compared in the label's language `lang`: how typeahead compares, given
 * to `RovingKeys.target`. The one a column of items gives is `labelBegins` (`filter.ts`), the comparison of the
 * components' filters, so that typing to an item and filtering for it find the same labels.
 */
export type LabelBegins = (label: string, text: string, lang?: string) => boolean;

/** One item of a column that is moved through with the keyboard. */
export interface RovingItem {
  /** Whether it takes focus (a static list item does not; a disabled one does: it is reachable, not activatable). */
  focusable: boolean;
  /** The text it starts with, for typeahead (a list item's headline, a menu item's label). */
  label: string;
  /**
   * The language its label is in, for typeahead: the item's `ambientLocale()` (its nearest `lang`). Read only for the
   * items a typed text is compared with, so a getter may give it. Without one, the browser's language.
   */
  readonly lang?: string;
}

/**
 * The keyboard model of a column of items (a list with interactive items or options, LST-17; an open menu, MNU-7):
 * Down and Up Arrow move to the next and previous item that takes focus — wrapping at the ends or stopping there —
 * Home and End to the first and last, and printable characters typed within `TYPEAHEAD_WINDOW` of each other to the
 * next item whose text begins with them (as the comparison given to `target` says, `labelBegins`; a new search
 * starts after the current item, a longer one keeps matching from it). Moving focus never activates or selects: the
 * component moves focus to the index returned.
 *
 * One instance per column: it remembers what was typed.
 */
export class RovingKeys {
  private typed = '';
  private at = Number.NEGATIVE_INFINITY;

  /**
   * `repeat`: one character typed again within the window moves on to the next item that begins with it (SEL-33),
   * where otherwise the characters add up to a search for a text that begins with both.
   */
  constructor(private readonly options: { wrap: boolean; repeat?: boolean }) {}

  /** Whether characters typed now continue a search: a Space then belongs to it, not to the activation (see `target`). */
  searching(now = performance.now()): boolean {
    return now - this.at <= TYPEAHEAD_WINDOW;
  }

  /**
   * The index `key` moves focus to from `current` (-1: no item has focus yet), or `null` when the key is not one of the
   * column's. A Space that does not continue a search is not the column's: it activates the focused item. `begins` is
   * how a typed text is compared with a label (`labelBegins`); without it the column has no typeahead, and a
   * printable character is not its key.
   */
  target(key: string, current: number, items: readonly RovingItem[], begins?: LabelBegins, now = performance.now()): number | null {
    const order = items.flatMap((item, index) => (item.focusable ? [index] : []));
    if (order.length === 0) return null;
    const at = order.indexOf(current);
    const { wrap } = this.options;
    switch (key) {
      case 'ArrowDown':
        return at < 0 ? order[0] : wrap ? order[(at + 1) % order.length] : order[Math.min(at + 1, order.length - 1)];
      case 'ArrowUp':
        return at < 0 ? order[order.length - 1] : wrap ? order[(at - 1 + order.length) % order.length] : order[Math.max(at - 1, 0)];
      case 'Home':
        return order[0];
      case 'End':
        return order[order.length - 1];
    }
    // A printable character is one code point (`key` of a letter, a digit, punctuation, a Space).
    if (!begins || [...key].length !== 1) return null;
    const continues = this.searching(now);
    if (key === ' ' && !continues) return null;
    const typed = continues ? this.typed + key : key;
    this.typed = typed;
    this.at = now;
    // One character typed — or typed again, in either case — is looked for after the current item; a longer text from it.
    const [first, ...rest] = typed;
    // The same character again is told in the column's language: the focused item's, else the first item's.
    const same = (character: string) => begins(character, first, items[at < 0 ? order[0] : current].lang);
    const one = !rest.length || (!!this.options.repeat && rest.every(same));
    const text = one ? first : typed;
    const from = at < 0 ? 0 : one ? at + 1 : at;
    for (let step = 0; step < order.length; step += 1) {
      const index = order[(from + step) % order.length];
      if (begins(items[index].label, text, items[index].lang)) return index;
    }
    // Nothing matches: the key was the column's all the same (it is not typed into anything), focus stays.
    return current >= 0 ? current : null;
  }
}
