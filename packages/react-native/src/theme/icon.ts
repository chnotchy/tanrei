import type { TextStyle } from 'react-native';
import type { TanreiFontStack, TanreiIconStyle } from '../generated/vocabulary';
import { platformFontFamily, toFontWeight } from './typography';

/** The variable-font axes of an icon font, by their registered tags. A static icon font ignores them. */
export interface TanreiIconAxes {
  readonly FILL: number;
  readonly wght: number;
  readonly GRAD: number;
  readonly opsz: number;
}

/**
 * Lets an app map the token family of the selection state + the axes the tokens ask for to the font it loaded —
 * e.g. the STATIC instance of a variable icon font that has that FILL (React Native cannot set variable-font axes —
 * see the README). Return `undefined` for the platform default font.
 */
export type TanreiIconFontResolver = (family: string, axes: TanreiIconAxes) => string | undefined;

export interface TanreiIconGlyph {
  /** The token family of the selection state (`system.icon.family.unselected|selected`), before any resolver. */
  readonly family: string | undefined;
  /** What the tokens ask for. React Native's `TextStyle` cannot carry it: hand it to whatever draws the glyph. */
  readonly axes: TanreiIconAxes;
  /** `axes` in CSS `font-variation-settings` form, for a renderer that takes one (a web view, a canvas, an SVG text). */
  readonly fontVariationSettings: string;
  /**
   * False when a `<Text>` with `style` draws the WRONG glyph for this selection state: the system tells selected from
   * unselected by the FILL axis of one variable family, which React Native cannot set, and no resolver was given.
   */
  readonly textDrawsFill: boolean;
  /** For the `<Text>` that holds the glyph: family, a square `size` box, and the weight as far as `fontWeight` reaches. */
  readonly style: TextStyle;
}

// Grade is not a token: always 0. The optical-size range is (`sys.icon.optical-size.min|max`): it is the font's fact.
const GRADE = 0;

/** The rule of `system.icon`: an icon for something unselected is drawn with `fillUnselected`, selected with `fillSelected`. */
export function iconFill(icon: TanreiIconStyle, selected: boolean): number {
  return selected ? icon.fillSelected : icon.fillUnselected;
}

/** The icon font of a selection state: a static icon set has one family per state, a variable one names the same twice. */
export function iconFamily(icon: TanreiIconStyle, selected: boolean): TanreiFontStack {
  return selected ? icon.family.selected : icon.family.unselected;
}

/**
 * Does this icon style tell selected from unselected ONLY by the FILL axis — one family for both states, two fills?
 * That is what React Native's `<Text>` cannot draw. A set with a family per state (static instances) does not.
 */
export function iconNeedsFillAxis(icon: TanreiIconStyle): boolean {
  return icon.family.selected.families[0] === icon.family.unselected.families[0] && icon.fillSelected !== icon.fillUnselected;
}

let reported = false;
/** Test hook: report again. */
export function resetIconReport(): void {
  reported = false;
}

/**
 * Icon style tokens (`system.icon`) + an icon box size (`system.measure.icon.*`, a Button's `iconSize`) → what it
 * takes to draw one glyph of the icon font: the FAMILY of the selection state, FILL from `selected`, wght from the
 * tokens, opsz = the size clamped to the font's range (`icon.opticalSizeMin`–`opticalSizeMax`), GRAD 0. Pure: no font is bundled or loaded here, and
 * this is not a component.
 *
 * When the system needs the FILL axis for a selected icon (`iconNeedsFillAxis`) and no `resolveFont` maps it to a
 * static instance, the `<Text>` style draws the unfilled glyph: `textDrawsFill` is false and development builds say so
 * once, instead of silently drawing the wrong thing.
 */
export function iconGlyphStyle(icon: TanreiIconStyle, size: number, options: { selected?: boolean; resolveFont?: TanreiIconFontResolver } = {}): TanreiIconGlyph {
  const { selected = false, resolveFont } = options;
  const axes: TanreiIconAxes = { FILL: iconFill(icon, selected), wght: icon.weight, GRAD: GRADE, opsz: Math.min(icon.opticalSizeMax, Math.max(icon.opticalSizeMin, size)) };
  const font = iconFamily(icon, selected);
  const family = font.families[0];
  const textDrawsFill = !(selected && resolveFont === undefined && iconNeedsFillAxis(icon));
  if (!textDrawsFill && __DEV__ && !reported) {
    reported = true;
    console.warn(
      `Tanrei: this system draws selected icons with the FILL axis of one variable font ("${family ?? font.generic}"). React Native <Text> cannot set font axes, ` +
        'so a selected icon is drawn UNFILLED. Give the system a family per state (sys.icon.family.unselected / .selected → two static fonts), ' +
        'pass `resolveFont` to map the axes to a static instance, or draw SVG icons. See "Icons" in the @tanrei/react-native README.',
    );
  }
  return {
    family,
    axes,
    fontVariationSettings: Object.entries(axes).map(([tag, value]) => `'${tag}' ${value}`).join(', '),
    textDrawsFill,
    style: {
      fontFamily: family === undefined ? platformFontFamily(font.generic) : resolveFont ? resolveFont(family, axes) : family,
      fontSize: size,
      lineHeight: size,
      fontWeight: toFontWeight(icon.weight),
    },
  };
}
