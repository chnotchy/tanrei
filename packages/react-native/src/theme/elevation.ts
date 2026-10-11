import type { BoxShadowValue, ViewStyle } from 'react-native';
import type { TanreiColor, TanreiColorRole, TanreiElevationLayer } from '../generated/vocabulary';

// ── The ONE place where a shadow token becomes a React Native quantity ─────────────────────────────────────
// `sys.elevation` layers have CSS box-shadow semantics: `blur` is the CSS blur radius — the
// shadow edge is a Gaussian with standard deviation σ = blur / 2 — and `spread` grows the casting box.
//
//   boxShadow (New Architecture)   takes CSS semantics directly: blurRadius = blur, spreadDistance = spread.
//                                  Every layer is drawn. This is what the components use.
//   shadowRadius (iOS, legacy)     is CALayer.shadowRadius, the Gaussian's σ: shadowRadius = blur / 2.
//                                  ONE shadow per view and no spread: the dominant layer, spread dropped.
//   elevation (Android, legacy)    is a height in dp, not a blur: the platform draws its own two-light shadow.
//                                  Android's design guidance pairs the heights 1 / 3 / 6 / 8 / 12 dp with key shadows whose
//                                  y-offsets are 1 / 2 / 4 / 6 / 8, so: elevation = 1.5 × the largest offsetY (blur/2 when
//                                  nothing is offset). Offset, blur, spread and layer count cannot be expressed.

/** CSS blur radius → the Gaussian's standard deviation. */
export const shadowSigma = (blur: number): number => blur / 2;

/** CSS blur radius → `boxShadow`'s `blurRadius` (CSS semantics: unchanged). */
export const toBoxShadowBlur = (blur: number): number => blur;

/** CSS blur radius → iOS `shadowRadius` (= σ). */
export const toShadowRadius = (blur: number): number => shadowSigma(blur);

const ANDROID_ELEVATION_PER_OFFSET = 1.5;
/** Shadow layers → Android `elevation` (dp): 1.5 × the largest downward offset, or σ of the widest blur when no layer is offset. */
export function toAndroidElevation(layers: readonly Pick<TanreiElevationLayer, 'y' | 'blur'>[]): number {
  if (layers.length === 0) return 0;
  const offset = Math.max(0, ...layers.map((l) => l.y));
  return offset > 0 ? offset * ANDROID_ELEVATION_PER_OFFSET : Math.max(0, ...layers.map((l) => shadowSigma(l.blur)));
}

/** True on the New Architecture (Fabric), the only renderer that draws the `boxShadow` style prop (React Native ≥ 0.76). */
export function supportsBoxShadow(): boolean {
  return (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager != null;
}

/** One shadow layer with its color resolved in the active scheme. */
export interface TanreiShadowLayer {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly color: TanreiColor;
}

export interface TanreiElevationLayers {
  /** The 1px outside ring (a first layer that is only spread), or null. */
  readonly ring: { readonly width: number; readonly color: TanreiColor } | null;
  /** The remaining layers that draw something. */
  readonly shadows: readonly TanreiShadowLayer[];
}

export interface TanreiResolvedElevation {
  /** The 1px outside ring (first layer). Draw it with `<Ring placement="outside">`; it never changes the box size. */
  ring: { width: number; color: string } | null;
  /** The remaining layers, for the `boxShadow` style prop (New Architecture; every layer, with spread). */
  boxShadow: BoxShadowValue[];
  /** The same shadow for a renderer without `boxShadow` (`supportsBoxShadow()` is false): iOS `shadow*` of the dominant layer, Android `elevation`. */
  legacy: ViewStyle;
}

const isRing = (l: TanreiElevationLayer) => l.x === 0 && l.y === 0 && l.blur === 0 && l.spread > 0;
const isEmpty = (l: TanreiElevationLayer) => l.x === 0 && l.y === 0 && l.blur === 0 && l.spread === 0;

/**
 * Elevation layers (`system.elevation[level]`) → ring + shadow layers with structured colors: what a state
 * transition interpolates. An empty list (`level0`) and layers whose color resolves to nothing draw nothing.
 */
export function resolveElevationLayers(layers: readonly TanreiElevationLayer[], color: (role: TanreiColorRole) => TanreiColor): TanreiElevationLayers {
  const drawn = layers.filter((l) => !isEmpty(l)).map((l) => ({ layer: l, color: color(l.role) })).filter((l) => l.color.a > 0);
  const [first, ...rest] = drawn;
  const ring = first && isRing(first.layer) ? first : null;
  return {
    ring: ring ? { width: ring.layer.spread, color: ring.color } : null,
    shadows: (ring ? rest : drawn).map(({ layer, color: c }) => ({ x: layer.x, y: layer.y, blur: layer.blur, spread: layer.spread, color: c })),
  };
}

/** `boxShadow` layers → the legacy shadow style: the layer with the widest blur on iOS (its spread is dropped), a height on Android. */
export function toLegacyShadow(shadows: readonly BoxShadowValue[]): ViewStyle {
  if (shadows.length === 0) return {};
  const dominant = shadows.reduce((a, b) => ((b.blurRadius ?? 0) > (a.blurRadius ?? 0) ? b : a));
  return {
    shadowColor: dominant.color,
    shadowOpacity: 1,
    shadowOffset: { width: Number(dominant.offsetX), height: Number(dominant.offsetY) },
    shadowRadius: toShadowRadius(Number(dominant.blurRadius ?? 0)),
    elevation: toAndroidElevation(shadows.map((l) => ({ y: Number(l.offsetY), blur: Number(l.blurRadius ?? 0) }))),
  };
}

/** Elevation layers (`system.elevation[level]`) → ring + `boxShadow` layers (+ their legacy form), colored from the active scheme. */
export function resolveElevation(layers: readonly TanreiElevationLayer[], color: (role: TanreiColorRole) => string): TanreiResolvedElevation {
  const [first, ...rest] = layers;
  const ringLayer = first && isRing(first) ? first : null;
  const boxShadow = (ringLayer ? rest : layers)
    .filter((l) => !isEmpty(l))
    .map((l) => ({ offsetX: l.x, offsetY: l.y, blurRadius: toBoxShadowBlur(l.blur), spreadDistance: l.spread, color: color(l.role) }));
  return { ring: ringLayer ? { width: ringLayer.spread, color: color(ringLayer.role) } : null, boxShadow, legacy: toLegacyShadow(boxShadow) };
}
