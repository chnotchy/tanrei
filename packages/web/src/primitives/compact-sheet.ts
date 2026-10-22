import { type CSSResult, unsafeCSS } from 'lit';
import { cornerRadius } from '../styles/shape.js';
import { SCRIM_FILTER, scrimFilter } from './scrim.js';

// Tanrei's rule for a compact window (docs/architecture/overview.md, "Component conventions"): below the window width
// its own token names, a popover and a dialog take the bottom sheet's appearance — at the window's bottom edge, across
// its width up to the bottom sheet's greatest width, in the bottom sheet's color, elevation and top corners, square at
// the bottom, sliding up and down with its motion — while staying the component the product opened (POP-39, POP-41,
// DLG-17, DLG-18). The look is read from `comp.bottom-sheet.*`, so a system that restyles its bottom sheet restyles every
// surface presented as one.

const SHEET = '--tanrei-comp-bottom-sheet';
const S = (name: string) => `var(${SHEET}-${name})`;

/**
 * Whether the window is compact for a component: narrower than the window width its token gives. A media query cannot
 * read a custom property, so the resolved width is read from a probe whose inline size is the token
 * (`compactProbeStyles()`) and matched with `matchMedia('(width < …px)')`; 0 is no compact window. `read()` is called
 * whenever the component lays out (a system switch is seen then), and `onChange` when the window crosses the width.
 */
export class CompactWindow {
  private width = Number.NaN;
  private query: MediaQueryList | null = null;

  constructor(private readonly onChange: () => void) {}

  /** Whether the window is compact now; `probe` is the element `compactProbeStyles()` sizes. */
  read(probe: Element | null | undefined): boolean {
    const width = probe ? Number.parseFloat(getComputedStyle(probe).inlineSize) || 0 : 0;
    this.watch(width);
    return !!this.query?.matches;
  }

  /** Stops listening (the component left the page). */
  stop() {
    this.watch(Number.NaN);
  }

  private watch(width: number) {
    if (Object.is(width, this.width)) return;
    this.query?.removeEventListener('change', this.onChange);
    this.width = width;
    this.query = width > 0 && typeof matchMedia === 'function' ? matchMedia(`(width < ${width}px)`) : null;
    this.query?.addEventListener('change', this.onChange);
  }
}

/** The probe `CompactWindow.read()` measures: as wide as `token` (the component's compact window width), drawn nowhere. */
export function compactProbeStyles(selector: string, token: `--${string}`): CSSResult {
  return unsafeCSS(`
  ${selector} {
    position: fixed;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: var(${token});
    block-size: 0;
    visibility: hidden;
    pointer-events: none;
  }`);
}

export interface SheetLookOptions {
  /** The `<dialog>` drawn with the bottom sheet's appearance while this selector matches it (a class the script sets). */
  sheet: string;
  /** The padding the component keeps at its bottom edge inside the sheet: the bottom system inset is added to it. */
  paddingBlockEnd?: string;
  /** The scrim behind it: the component's own (a dialog's), or the bottom sheet's (a popover has none of its own). */
  scrim?: { color: string; blur: string };
}

/**
 * The bottom sheet's appearance for a modal `<dialog>` (BSH-7, BSH-1): docked to the window's bottom edge — above the
 * on-screen keyboard, which the script measures into `--_keyboard` and marks with the class `keyboard` — as wide as the
 * window up to `container.max-width` and centred, as tall as its parts up to the full height (the window below its top
 * inset less `container.margin-block-start`); `container.color`, `container.elevation`, the top corners
 * `container.shape` (eased by the smoothing) and square bottom corners; its color under the bottom inset and its parts
 * above it. It slides up from below the bottom edge over the bottom sheet's enter motion and down out of view over its
 * exit motion, the scrim fading with it; where motion is reduced it fades in place.
 */
export function sheetLookStyles({ sheet, paddingBlockEnd = '0px', scrim }: SheetLookOptions): CSSResult {
  const scrimColor = scrim?.color ?? S('scrim-color');
  const scrimBlur = scrim?.blur ?? S('scrim-blur');
  return unsafeCSS(`
  ${sheet} {
    box-sizing: border-box;
    position: fixed;
    inset-inline: 0;
    inset-block: auto var(--_keyboard, 0px);
    margin: 0 auto;
    inline-size: min(100%, ${S('container-max-width')});
    min-inline-size: 0;
    max-inline-size: none;
    block-size: fit-content;
    max-block-size: max(0px, calc(100% - env(safe-area-inset-top, 0px) - var(--_keyboard, 0px) - ${S('container-margin-block-start')}));
    padding-block-end: calc(${paddingBlockEnd} + env(safe-area-inset-bottom, 0px));
    background: ${S('container-color')};
    box-shadow: ${S('container-elevation')};
    ${cornerRadius(`${SHEET}-container-shape`)}
    border-end-start-radius: 0;
    border-end-end-radius: 0;
    opacity: 1;
    scale: none;
    translate: none;
    transition-property: translate;
    transition-duration: ${S('motion-exit-duration')};
    transition-timing-function: ${S('motion-exit-easing')};
  }
  /* Over the keyboard, nothing is under the bottom inset. */
  ${sheet}.keyboard {
    padding-block-end: ${paddingBlockEnd};
  }
  ${sheet}:not([open]) {
    translate: 0 100%;
  }
  ${sheet}[open] {
    transition-duration: ${S('motion-enter-duration')};
    transition-timing-function: ${S('motion-enter-easing')};
  }
  @starting-style {
    ${sheet}[open] {
      opacity: 1;
      scale: none;
      translate: 0 100%;
    }
  }
  ${scrimFilter(sheet, scrimBlur).cssText}
  ${sheet}::backdrop {
    background: ${scrimColor};
    backdrop-filter: ${SCRIM_FILTER.cssText};
    opacity: 0;
    transition-property: opacity;
    transition-duration: ${S('motion-exit-duration')};
    transition-timing-function: ${S('motion-exit-easing')};
  }
  ${sheet}[open]::backdrop {
    opacity: 1;
    transition-duration: ${S('motion-enter-duration')};
    transition-timing-function: ${S('motion-enter-easing')};
  }
  @starting-style {
    ${sheet}[open]::backdrop {
      opacity: 0;
    }
  }
  /* Where motion is reduced it fades in place. */
  @media (prefers-reduced-motion: reduce) {
    ${sheet} {
      transition-property: opacity;
      translate: none;
    }
    ${sheet}:not([open]) {
      opacity: 0;
      translate: none;
    }
    @starting-style {
      ${sheet}[open] {
        opacity: 0;
        translate: none;
      }
    }
  }`);
}
