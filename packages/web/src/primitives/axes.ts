import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { report } from './report.js';

/**
 * One open axis of a component: a size or a variant, whose core values have static styles and whose other
 * values — added by a design system's layer — get theirs on demand.
 */
export interface OpenAxis {
  /** The property that names the value; it must reflect to the attribute of the same name. */
  name: string;
  /** The values every design system has (the component's static styles cover them). */
  core: readonly string[];
  /** What a value the active design system does not have is drawn as. */
  default: string;
  /**
   * The rules for a value the core does not have, under `selector` (`:host([<name>='<value>'])`), built by the same
   * function as the core blocks and falling back to the default's tokens where the active system lacks the value.
   */
  rules: (value: string, selector: string) => string;
  /** A custom property that a design system which HAS the value defines: how the value is known to be missing. */
  probe: (value: string) => `--${string}`;
}

export interface OpenAxesOptions {
  /** A key for the page-wide sheet cache: the component's name. */
  component: string;
  /** The behaviour that says an unknown value is drawn as the default and reported in debug builds (BTN-7…). */
  behavior: string;
  axes: readonly OpenAxis[];
}

/** Attribute values are interpolated into CSS: only token-name characters are accepted. */
const KEY = /^[a-z0-9][a-z0-9-]*$/;
const sheets = new Map<string, CSSStyleSheet>();

/** The stylesheet of one value, built once per page and shared by every shadow root that needs it. */
function sheetFor(component: string, axis: OpenAxis, value: string): CSSStyleSheet | null {
  if (!KEY.test(value) || typeof CSSStyleSheet === 'undefined') return null;
  const id = `${component}:${axis.name}:${value}`;
  let sheet = sheets.get(id);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(axis.rules(value, `:host([${axis.name}='${value}'])`));
    sheets.set(id, sheet);
  }
  return sheet;
}

/**
 * Open axes as a Lit controller (BTN-7 and every component with a size or variant axis). A value the core
 * does not have was added by a design system: its sheet is adopted before the host renders. After the render, a value
 * the ACTIVE system does not define — its probe property is empty — is reported in debug builds; it already draws as
 * the default through the sheet's fallbacks (or, for a value that is not a token name, through the host's own rules).
 */
export class OpenAxesController implements ReactiveController {
  private readonly seen = new Map<string, string>();
  private readonly pending = new Set<OpenAxis>();

  constructor(
    private readonly host: ReactiveControllerHost & HTMLElement & { renderRoot: HTMLElement | DocumentFragment },
    private readonly options: OpenAxesOptions,
  ) {
    host.addController(this);
  }

  private value(axis: OpenAxis): string {
    return String((this.host as unknown as Record<string, unknown>)[axis.name] ?? '');
  }

  hostUpdate() {
    for (const axis of this.options.axes) {
      const value = this.value(axis);
      if (this.seen.get(axis.name) === value) continue;
      this.seen.set(axis.name, value);
      if (axis.core.includes(value)) {
        // A value that was waiting to be asked about has been replaced by one every system has.
        this.pending.delete(axis);
        continue;
      }
      this.pending.add(axis);
      const sheet = sheetFor(this.options.component, axis, value);
      const root = this.host.renderRoot as ShadowRoot;
      if (sheet && !root.adoptedStyleSheets.includes(sheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    }
  }

  hostUpdated() {
    if (!this.pending.size) return;
    const style = getComputedStyle(this.host);
    // An element outside the flat tree — the child of a shadow host that no slot takes (a member an avatar group does
    // not draw) — has no computed style: every property reads empty, the probe of a value the system HAS among them.
    // It is asked at the next update in which it has one; until then nothing of it is drawn, rightly or wrongly.
    // (Chromium and Firefox say so by an empty style; WebKit computes one all the same, so the tree is asked too.)
    if (style.display === '' || (!!this.host.parentElement?.shadowRoot && !this.host.assignedSlot)) return;
    for (const axis of this.pending) {
      const value = this.value(axis);
      if (!KEY.test(value) || style.getPropertyValue(axis.probe(value)).trim() === '') {
        report(this.host, this.options.behavior, `${axis.name} "${value}" is not a value of the active design system; it is drawn as "${axis.default}"`);
      }
    }
    this.pending.clear();
  }
}
