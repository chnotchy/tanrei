import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';
// The only static read of generated values in the package: the default system.
import { tanrei } from '../generated/systems/tanrei';
import type {
  TanreiColor,
  TanreiColorRole,
  TanreiElevationLevel,
  TanreiPaint,
  TanreiScheme,
  TanreiSchemeColors,
  TanreiSystem,
  TanreiTypescaleRole,
} from '../generated/vocabulary';
import type { TanreiIconFontResolver } from './icon';
import { resolveElevation, resolveElevationLayers, type TanreiElevationLayers, type TanreiResolvedElevation } from './elevation';
import { lookupValue } from './lookup';
import { OverlayLayer } from './overlay';
import { evaluatePaint, formatColor, roleColor } from './paint';
import { resolveScheme, type TanreiContrast, type TanreiThemePreference } from './scheme';
import { emphasize, typescaleStyle, type TanreiFontResolver } from './typography';

export { tanrei };

export interface TanreiTextOptions {
  /** Heavier by the family's step of `system.typescale.emphasis`; nothing else moves. */
  emphasized?: boolean;
}

export interface TanreiTheme {
  /** The active design system: every token a component or primitive reads. */
  system: TanreiSystem;
  /** Key of `system.colors`, e.g. `light`, `darkHigh`. */
  scheme: TanreiScheme;
  /** The active scheme's role colors, structured. */
  colors: TanreiSchemeColors;
  /** Role → React Native color string. */
  color: (role: TanreiColorRole) => string;
  /** Paint → structured color in the active scheme (`a === 0` means nothing is drawn). */
  resolve: (paint: TanreiPaint) => TanreiColor;
  /** Paint → React Native color string. */
  paint: (paint: TanreiPaint) => string;
  /**
   * Typescale role → `TextStyle`, using the provider's font resolver. `emphasized` adds the role's family step
   * (`system.typescale.emphasis`) to its weight: `text('heading1', { emphasized: true })`.
   */
  text: (role: TanreiTypescaleRole, options?: TanreiTextOptions) => TextStyle;
  /** Elevation level → outside ring + `boxShadow` layers in the active scheme. */
  elevation: (level: TanreiElevationLevel) => TanreiResolvedElevation;
  /** The same, with structured colors: what a state transition interpolates between two levels. */
  elevationLayers: (level: TanreiElevationLevel) => TanreiElevationLayers;
  /**
   * The provider's icon font resolver, if any: what a component that draws an icon glyph (`IconButton`) hands to
   * `iconGlyphStyle`. React Native cannot set variable-font axes, so this is how an app maps the token family + axes of
   * a selection state to the static instance it loaded (README, "Icons").
   */
  resolveIconFont: TanreiIconFontResolver | undefined;
}

export function createTanreiTheme(system: TanreiSystem, scheme: TanreiScheme, resolveFont?: TanreiFontResolver, resolveIconFont?: TanreiIconFontResolver): TanreiTheme {
  const colors = system.colors[scheme];
  const color = (role: TanreiColorRole) => formatColor(roleColor(colors, role));
  // Series are open: a level only another system has falls back to a core level, with a dev-only warning.
  const layersOf = (level: TanreiElevationLevel) => lookupValue(system.elevation, level, 'level0', 'elevation level');
  return {
    system,
    scheme,
    colors,
    color,
    resolve: (paint) => evaluatePaint(paint, colors, scheme),
    paint: (paint) => formatColor(evaluatePaint(paint, colors, scheme)),
    // Series are open too: a step only another system has falls back to a core step, with a dev-only warning.
    text: (role, options) => {
      const token = lookupValue(system.typescale, role, 'body', 'typescale role');
      return typescaleStyle(options?.emphasized ? emphasize(token, system.typescale.emphasis, role) : token, resolveFont);
    },
    // A layer whose color resolves to nothing draws nothing: a system that turns the ring (or a shadow)
    // off by value gets no ring element and no empty `boxShadow` entry.
    elevation: (level) => resolveElevation(layersOf(level).filter((layer) => roleColor(colors, layer.role).a > 0), color),
    elevationLayers: (level) => resolveElevationLayers(layersOf(level), (role) => roleColor(colors, role)),
    resolveIconFont,
  };
}

// Without a provider components render the default system in the standard light scheme.
const TanreiContext = createContext<TanreiTheme>(createTanreiTheme(tanrei, resolveScheme('light')));

export interface TanreiProviderProps {
  /** The design system to render with: a shipped preset or a product's own generated system. Default: `tanrei`. */
  system?: TanreiSystem;
  /** `system` (default) follows `useColorScheme()`. */
  theme?: TanreiThemePreference;
  contrast?: TanreiContrast;
  /** Map token font families to the font names the app loaded. */
  resolveFont?: TanreiFontResolver;
  /**
   * Map an icon family + the axes a selection state asks for (FILL, wght, GRAD, opsz) to the icon font the app loaded —
   * e.g. the static FILL 1 instance for a selected icon, which a `<Text>` cannot otherwise draw (README, "Icons").
   */
  resolveIconFont?: TanreiIconFontResolver;
  /**
   * The window's system insets (status bar, camera cutout, home indicator, gesture bar), in points, physical sides.
   * React Native has no safe-area API of its own and the package takes no safe-area dependency: a product that uses
   * `react-native-safe-area-context` passes `useSafeAreaInsets()` here. The overlay layer keeps tooltips, snackbars and
   * menus inside them; `AppBar`, `NavigationBar` and `NavigationRail` reach under them and keep their content inside,
   * unless their own `insets` prop says otherwise. A missing side is 0; a nested provider without `insets` keeps its outer
   * provider's.
   */
  insets?: TanreiInsets;
  children?: ReactNode;
}

/** A window's system insets in points, by physical side (`useSafeAreaInsets()` has this shape). A missing side is 0. */
export interface TanreiInsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/** Insets with every side present. */
export type TanreiResolvedInsets = Required<TanreiInsets>;

export const NO_INSETS: TanreiResolvedInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Every side of `insets` (0 where it has none); a negative or non-finite side counts as 0. */
export function resolveInsets(insets: TanreiInsets | undefined, fallback: TanreiResolvedInsets = NO_INSETS): TanreiResolvedInsets {
  const side = (value: number | undefined, otherwise: number) => (value === undefined ? otherwise : Number.isFinite(value) && value > 0 ? value : 0);
  if (!insets) return fallback;
  return { top: side(insets.top, fallback.top), right: side(insets.right, fallback.right), bottom: side(insets.bottom, fallback.bottom), left: side(insets.left, fallback.left) };
}

const InsetsContext = createContext<TanreiResolvedInsets>(NO_INSETS);

export function TanreiProvider({ system = tanrei, theme = 'system', contrast = 'standard', resolveFont, resolveIconFont, insets, children }: TanreiProviderProps) {
  const device = useColorScheme();
  const brightness = theme === 'system' ? (device === 'dark' ? 'dark' : 'light') : theme;
  const scheme = resolveScheme(brightness, contrast);
  const value = useMemo(() => createTanreiTheme(system, scheme, resolveFont, resolveIconFont), [system, scheme, resolveFont, resolveIconFont]);
  // A nested provider without insets keeps the outer one's; a side it leaves out is 0.
  const outer = useContext(InsetsContext);
  const { top, right, bottom, left } = insets ?? {};
  const own = useMemo(() => (insets ? resolveInsets({ top, right, bottom, left }) : outer), [insets === undefined, outer, top, right, bottom, left]);
  // The overlay layer (src/theme/overlay.tsx): drawn after the children only while a tooltip or a snackbar is in it,
  // so an app without one renders exactly its children. A nested provider shares its outer provider's layer.
  return (
    <TanreiContext.Provider value={value}>
      <InsetsContext.Provider value={own}>
        <OverlayLayer>{children}</OverlayLayer>
      </InsetsContext.Provider>
    </TanreiContext.Provider>
  );
}

/**
 * The provider's system insets, every side present (zeros without a provider or `insets`). With `own`, a component's
 * own `insets` prop: each side it names replaces the provider's. Package-internal.
 */
export function useTanreiInsets(own?: TanreiInsets): TanreiResolvedInsets {
  const provided = useContext(InsetsContext);
  const { top, right, bottom, left } = own ?? {};
  return useMemo(() => (own ? resolveInsets({ top, right, bottom, left }, provided) : provided), [own === undefined, provided, top, right, bottom, left]);
}

/**
 * Renders `children` with `theme` — what an overlay drawn in the overlay layer (elsewhere in the tree) uses to keep the
 * theme of the component that opened it. Package-internal.
 */
export function TanreiThemeScope({ theme, children }: { theme: TanreiTheme; children?: ReactNode }) {
  return <TanreiContext.Provider value={theme}>{children}</TanreiContext.Provider>;
}

export function useTanrei(): TanreiTheme {
  return useContext(TanreiContext);
}
