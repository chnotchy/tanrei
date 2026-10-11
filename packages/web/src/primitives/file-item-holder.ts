// The internal channel from a component that holds file items to each of them (FIT-19, FUP-25, FUP-58): what the
// holder gives every item — one form for all its rows, the names of the two actions, whether it is disabled, and that
// the item is an item of the holder's list — reaches the item here and through no prop, attribute or event of its own,
// as a Button takes its corners from a button group (src/primitives/group-item.ts).
//
// It is kept outside `src/components/**` — the files custom-elements.json is made from — so that none of it becomes
// part of the file item's public surface (the manifest, the generated React wrapper). What is given is kept beside the
// item, never on it: an item that is not defined yet is told when it is, and a product's own item keeps every
// attribute the product wrote.

/** What a holder gives one file item. A key that is left out is the item's own to say. */
export interface FileItemGiven {
  /** FUP-58: the form of every row of the holder, in place of the item's own `form`. */
  form?: string;
  /** FUP-58: whether every row draws a picture, in place of the item's own `preview`. */
  preview?: boolean;
  /** FUP-58: how every picture fills its box, in place of the item's own `fit`. */
  fit?: string;
  /** FUP-58: whether every tile hides its name, in place of the item's own `nameHidden`. */
  nameHidden?: boolean;
  /** FUP-58: the width of every tile's box, in place of the item's own `width`. */
  width?: number | null;
  /** FUP-58: the height of every tile's box, in place of the item's own `height`. */
  height?: number | null;
  /** FUP-58: the name of every remove action, in place of the item's own `removeLabel`. */
  removeLabel?: string;
  /** FUP-58: the name of every retry action, in place of the item's own `retryLabel`. */
  retryLabel?: string;
  /** FUP-28: the holder is disabled, so the item is, whatever its own `disabled` says. */
  disabled?: boolean;
  /** FIT-19, FUP-25: the item is one item of the holder's list, in the place of the group it is when it stands alone. */
  listItem?: boolean;
  /** FUP-45: the holder made the item itself; a word the item lacks is then the holder's to report, by its own prop. */
  made?: boolean;
  /**
   * FIT-18: what lies between this item and the next one of the holder's column, as a CSS length — an action's hit
   * area reaches no further toward a neighbour than half of it. Left out: nothing is known to lie between them.
   */
  between?: string;
}

type Updating = Element & { requestUpdate?: () => void };

const given = new WeakMap<Element, FileItemGiven>();
const KEYS: readonly (keyof FileItemGiven)[] = ['form', 'preview', 'fit', 'nameHidden', 'width', 'height', 'removeLabel', 'retryLabel', 'disabled', 'listItem', 'made', 'between'];
const same = (a: FileItemGiven | undefined, b: FileItemGiven | undefined) => a === b || (!!a && !!b && KEYS.every((key) => Object.is(a[key], b[key])));

/** The holder's word to `item`: what it gives it now, or `null` when it holds it no longer. The item draws itself again. */
export function giveFileItem(item: Element, gift: FileItemGiven | null): void {
  const had = given.get(item);
  if (gift ? same(had, gift) : !had) return;
  if (gift) given.set(item, { ...gift });
  else given.delete(item);
  (item as Updating).requestUpdate?.();
}

/** What `item`'s holder gives it now; nothing for an item that stands alone. */
export const fileItemGiven = (item: Element): FileItemGiven | undefined => given.get(item);

/**
 * Where a file item keeps the way its holder moves focus into it after a row left (FUP-30): to its remove action, or —
 * where it has none — to its body where that is pressable. It answers whether focus is now inside the item.
 */
export const FILE_ITEM_TAKE_FOCUS = Symbol.for('tanrei.file-item.take-focus');

/** The event a file item tells its holder with: it arrived, or something the holder reads of it changed. */
export const FILE_ITEM_UPDATE = 'tanrei-file-item-update';

/** The event a file picker ends one arrival with, after its `select` and `reject`, for the component that holds it (FUP-57). */
export const FILE_PICKER_ARRIVAL = 'tanrei-file-picker-arrival';

/** Tells the holder of a file picker that the events of one arrival have all been emitted. */
export function notifyArrival(picker: HTMLElement): void {
  picker.dispatchEvent(new Event(FILE_PICKER_ARRIVAL, { bubbles: true }));
}
