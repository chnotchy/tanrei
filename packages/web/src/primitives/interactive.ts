/**
 * What makes an element interactive, for the rule that an action's content holds nothing interactive (CRD-15, LST-24):
 * natively focusable or operable elements, anything with a tabindex or editable, and the widget roles. A custom element
 * counts when its own shadow tree holds one of these.
 */
const INTERACTIVE = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
  ...['button', 'link', 'checkbox', 'radio', 'switch', 'textbox', 'searchbox', 'combobox', 'slider', 'spinbutton', 'menuitem', 'option', 'tab'].map((role) => `[role="${role}"]`),
].join(', ');

/** The first interactive element in `root` (a slotted element and its subtree, shadow trees included), if any. */
export function findInteractive(root: Element): Element | null {
  if (root.matches(INTERACTIVE)) return root;
  if (root.shadowRoot && (root.shadowRoot.delegatesFocus || root.shadowRoot.querySelector(INTERACTIVE))) return root;
  for (const element of root.querySelectorAll('*')) {
    if (element.matches(INTERACTIVE)) return element;
    if (element.shadowRoot && (element.shadowRoot.delegatesFocus || element.shadowRoot.querySelector(INTERACTIVE))) return element;
  }
  return null;
}

/**
 * The first interactive element slotted into `slot` (its assigned elements and their subtrees), after the custom
 * elements among them have drawn their shadow trees (a `<tanrei-button>` draws its native control in its first update).
 */
export async function slottedInteractive(slot: HTMLSlotElement | null | undefined): Promise<Element | null> {
  const assigned = slot?.assignedElements({ flatten: true }) ?? [];
  const elements = assigned.flatMap((element) => [element, ...element.querySelectorAll('*')]);
  await Promise.all(elements.map((element) => (element as { updateComplete?: Promise<unknown> }).updateComplete).filter(Boolean));
  for (const element of assigned) {
    const found = findInteractive(element);
    if (found) return found;
  }
  return null;
}

/**
 * What takes a press itself, for a hit area that reaches over other content and must yield to it (TAB-5): what
 * `findInteractive()` looks for, less an element that is only a place focus is sent to (`tabindex="-1"`), plus a label
 * (a press on it is its control's) and whatever shows the pointer of a link.
 */
const ANSWERS = `${INTERACTIVE.replace('[tabindex]', '[tabindex]:not([tabindex^="-"])')}, label`;

/**
 * Whether a press whose composed path is `path` lands on something that answers it itself: the element pressed, or one
 * around it, is a control, a link, editable or a Tab stop — or the element pressed shows the pointer cursor, which is
 * how a product's own clickable box is told from text.
 */
export function answersPress(path: readonly EventTarget[]): boolean {
  const pressed = path[0];
  if (pressed instanceof Element && getComputedStyle(pressed).cursor === 'pointer') return true;
  return path.some((node) => node instanceof Element && node.matches(ANSWERS));
}

/** Every widget role, for a press inside content that a hit area reaches (ACC-36): a composite's parts and the composites. */
const WIDGET_ROLES = [
  'button',
  'link',
  'checkbox',
  'radio',
  'switch',
  'textbox',
  'searchbox',
  'combobox',
  'slider',
  'spinbutton',
  'scrollbar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'tab',
  'treeitem',
  'gridcell',
  'row',
  'listbox',
  'menu',
  'menubar',
  'radiogroup',
  'tablist',
  'tree',
  'treegrid',
  'grid',
];
/** What takes a press itself inside content: what `findInteractive()` looks for, a label, and every widget role. */
const TAKES_PRESS = [INTERACTIVE, 'label', ...WIDGET_ROLES.map((role) => `[role~="${role}"]`)].join(', ');

/**
 * Whether a press whose composed path is `path` is taken by something inside `within` before it reaches `within`
 * itself (ACC-36): the element pressed, or one around it up to `within`, is a control, a link, a label, a summary,
 * editable, has a tab index or a widget role, or is a custom element that takes focus (it delegates it, or has a tab
 * index of its own) — or the element pressed shows the pointer cursor while `within` does not, which is how a
 * product's own clickable box is told from text: a pointer `within` shows itself, and its content inherits, is not a
 * box of the product's. What lies around `within` is not asked: a press inside an item belongs to that item.
 */
export function pressTakenWithin(path: readonly EventTarget[], within: Element): boolean {
  const pressed = path[0];
  if (pressed instanceof Element && pressed !== within && getComputedStyle(pressed).cursor === 'pointer' && getComputedStyle(within).cursor !== 'pointer') return true;
  for (const node of path) {
    if (node === within) return false;
    if (!(node instanceof Element)) continue;
    if (node.matches(TAKES_PRESS)) return true;
    if (node.localName.includes('-') && (node.shadowRoot?.delegatesFocus || (node instanceof HTMLElement && node.tabIndex >= 0))) return true;
  }
  return false;
}
