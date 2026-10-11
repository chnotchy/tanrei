import { type CSSResult, unsafeCSS } from 'lit';
import { GROUP_ITEM, type GroupItem } from './group-item.js';
import { report } from './report.js';

// The actions at the foot of a host that places them as a full-width Button group places its items (BGR-12…19): a
// dialog's (DLG-10, DLG-20) and a side sheet's (SSH-11, SSH-17). The host assigns its children to its slots by hand
// (`slotAssignment: 'manual'`), the actions to three slots — `actions-first`, `actions-between`, `actions-last` — in the
// order the orientation places the runs, so that focus and the accessibility tree follow the placed order (BGR-15)
// without CSS `order`. It measures them at their own widths to decide a row or a column, and gives every action the
// Button variant its token names, which a Button draws while it has no `variant` attribute of its own (BTN-10).

/** Where a flagged action goes (BGR-13, BGR-14): the dismissive run, the unflagged one, the confirming one. */
export type ActionRun = 'dismissive' | 'neutral' | 'confirming';
/** The three runs in the order of a row (start to end) and of a column (top to bottom). */
export const ACTION_ROW: readonly ActionRun[] = ['dismissive', 'neutral', 'confirming'];
export const ACTION_COLUMN: readonly ActionRun[] = ['confirming', 'neutral', 'dismissive'];
/** The core Button variants, in the order of a `dev.tanrei.enum` choice of them: the first is the fallback. */
export const BUTTON_VARIANTS = ['filled', 'tonal', 'elevated', 'outlined', 'text'] as const;

const sameNodes = (a: readonly Node[], b: readonly Node[]) => a.length === b.length && a.every((node, i) => node === b[i]);

/** Assigns `nodes` to a manually assigned `slot`, unless it already holds exactly them. */
export function assignSlot(slot: HTMLSlotElement | null, nodes: readonly Node[]) {
  if (slot && !sameNodes(slot.assignedNodes(), nodes)) slot.assign(...(nodes as (Element | Text)[]));
}

/**
 * A choice of kind that a comp token names, read from the cascade on `host` now — never cached, so a system
 * switch is seen; an unknown name is the first value.
 */
export function compChoice<T extends string>(host: Element, property: string, values: readonly T[]): T {
  const named = getComputedStyle(host).getPropertyValue(property).trim() as T;
  return values.includes(named) ? named : values[0];
}

/** Gives `element` the variant its host chose for it (null: none), through the Button's group-item channel (BTN-10). */
export function giveVariant(element: Element | null | undefined, variant: string | null) {
  (element as (Element & Partial<GroupItem>) | null | undefined)?.[GROUP_ITEM]?.give(variant);
}

/** How the actions share the row: `fill` (equal shares of the inner width) or packed at their own widths. */
export type ActionArrangement = 'fill' | 'packed';

/** One layout of the actions: whether they stack, and the row's width at the widths it would draw them. */
export interface ActionMeasure {
  stacked: boolean;
  /** Packed: the sum of their own widths; fill: equal shares, each as wide as the widest action. Gaps included. */
  row: number;
  /** The row at their own widths, whatever the arrangement: the sum of them, gaps included (POP-7). */
  natural: number;
}

/**
 * A host's actions: which runs they fall into, whether they are a column, and the variant it gave them. The host calls
 * `read()` when its children change, `measure()` when it lays out, `assign()` after either, and `give()` when it reads
 * its variant token.
 */
export class ActionPlacement {
  actions: Element[] = [];
  runs: Record<ActionRun, Element[]> = { dismissive: [], neutral: [], confirming: [] };
  /** The actions are a column. */
  stacked = false;
  /** The actions it gave its variant to. */
  private given = new Set<Element>();

  constructor(
    private readonly host: Element,
    /** Called with each action as it is read: what changes the row's fit (a label drawn or changed) is observed. */
    private readonly observe?: (action: Element) => void,
  ) {}

  /** BGR-13, BGR-14, BGR-18: the actions by run, in the order given within each run; both flags are unflagged, reported. */
  read(actions: Element[]) {
    this.actions = actions;
    const runs: Record<ActionRun, Element[]> = { dismissive: [], neutral: [], confirming: [] };
    for (const action of actions) {
      const confirming = action.hasAttribute('confirming');
      const dismissive = action.hasAttribute('dismissive');
      if (confirming && dismissive) {
        report(this.host, 'BGR-18', `the action "${action.textContent?.trim() ?? ''}" is both confirming and dismissive; it is placed among the actions with neither`);
      }
      runs[confirming === dismissive ? 'neutral' : confirming ? 'confirming' : 'dismissive'].push(action);
      this.observe?.(action);
    }
    this.runs = runs;
  }

  /** Every action is told the host's variant, which it draws while its own is not set; a former action, none. */
  give(variant: string | null) {
    const now = new Set(this.actions);
    for (const element of this.given) if (!now.has(element)) giveVariant(element, null);
    for (const action of this.actions) giveVariant(action, variant);
    this.given = now;
  }

  /** The three slots, first to last, get the runs in the order of the orientation (BGR-15). */
  assign(slots: ArrayLike<HTMLSlotElement>) {
    const order = this.stacked ? ACTION_COLUMN : ACTION_ROW;
    for (let i = 0; i < slots.length && i < order.length; i++) assignSlot(slots[i], this.runs[order[i]]);
  }

  /**
   * BGR-16, BGR-17: measured as a row at their own widths, one line each (the `measuring` class on `box`, whose CSS
   * gives the actions their own widths), then drawn as they fit: `fill` stays a row while every label fits its equal
   * share of the box's inner width, `packed` while the row at their own widths fits it. Sets `stacked` on the box.
   * Returns whether the orientation changed (the host then assigns the slots again) and the measure.
   */
  measure(box: HTMLElement, arrangement: ActionArrangement): ActionMeasure & { changed: boolean } {
    box.classList.remove('stacked');
    box.classList.add('measuring');
    const drawn = this.actions.filter((action) => action.getClientRects().length > 0);
    const widths = drawn.map((action) => action.getBoundingClientRect().width);
    const style = getComputedStyle(box);
    const gap = Number.parseFloat(style.columnGap) || 0;
    const gaps = gap * Math.max(0, widths.length - 1);
    const packed = arrangement === 'packed';
    const natural = widths.reduce((sum, width) => sum + width, 0) + gaps;
    const row = packed ? natural : Math.max(0, ...widths) * widths.length + gaps;
    const inner = box.clientWidth - (Number.parseFloat(style.paddingInlineStart) || 0) - (Number.parseFloat(style.paddingInlineEnd) || 0);
    const share = widths.length ? (inner - gaps) / widths.length : inner;
    const fits = packed ? row <= inner + 0.5 : widths.every((width) => width <= share + 0.5);
    box.classList.remove('measuring');
    const stacked = widths.length > 0 && !fits;
    box.classList.toggle('stacked', stacked);
    const changed = stacked !== this.stacked;
    this.stacked = stacked;
    return { stacked, row, natural, changed };
  }
}

/**
 * The actions' box `box` (a flex container of the three slots) as a full-width Button group (BGR-17): a row the actions
 * share equally — each Button's container stretched across its share, its label centred — or, `stacked`, a column of
 * actions as wide as the box; `measuring`, a row at their own widths. `gap` is the host's gap token. A packed
 * arrangement is the host's own rules on top (each action `flex: none`).
 */
export function actionBoxStyles(box: string, gap: string): CSSResult {
  return unsafeCSS(`
  ${box} {
    display: flex;
    flex: none;
    gap: var(${gap});
  }
  ${box} ::slotted(*) {
    display: grid;
    flex: 1 1 0;
    min-inline-size: 0;
  }
  ${box}.stacked {
    flex-direction: column;
  }
  ${box}.stacked ::slotted(*),
  ${box}.measuring ::slotted(*) {
    flex: none;
  }`);
}

/**
 * A choice of kind that a comp token names (its value is the choice's name), drawn by CSS: a style query
 * where the browser has them, and the name the script read into `data-<attribute>` on `element` where it does not.
 * `rules` gets `element`'s selector; the query is answered by the element's own style, so only its descendants are
 * styled by it.
 */
export function whenChosen(property: string, element: string, attribute: string, value: string, rules: (element: string) => string): CSSResult {
  return unsafeCSS(`@container style(${property}: ${value}) {
${rules(element)}
}
${rules(`${element}[data-${attribute}='${value}']`)}`);
}
