import { useRef } from 'react';
import type { Animated, ViewStyle } from 'react-native';
import type { TanreiColor } from '../generated/vocabulary';
import { supportsBoxShadow, type TanreiElevationLayers, type TanreiResolvedElevation } from '../theme/elevation';
import type { StateVisuals } from './stateTransition';

const NOTHING: TanreiColor = { r: 0, g: 0, b: 0, a: 0 };

/** The most shadow layers any of the given elevations has: how many layers `elevationVisuals` flattens. */
export function shadowLayerCount(levels: readonly TanreiElevationLayers[]): number {
  return Math.max(0, ...levels.map((layers) => layers.shadows.length));
}

/**
 * An elevation as flat numbers and colors, so that `useStateTransition` moves it like every other drawn value: spread
 * it into the transition's target next to the component's colors, opacity and shape. Two states may have different
 * numbers of shadow layers: the shorter list is padded with layers that draw nothing, as CSS does when it transitions
 * `box-shadow`. `count` is `shadowLayerCount()` over every state the control can be in.
 */
export function elevationVisuals(layers: TanreiElevationLayers, count: number): StateVisuals {
  const out: Record<string, TanreiColor | number> = { ringColor: layers.ring?.color ?? NOTHING };
  for (let i = 0; i < count; i += 1) {
    const l = layers.shadows[i];
    out[`shadow${i}X`] = l?.x ?? 0;
    out[`shadow${i}Y`] = l?.y ?? 0;
    out[`shadow${i}Blur`] = l?.blur ?? 0;
    out[`shadow${i}Spread`] = l?.spread ?? 0;
    out[`shadow${i}Color`] = l?.color ?? NOTHING;
  }
  return out;
}

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
/** What `useStateTransition` hands back for a target that contains `elevationVisuals()`. */
export type DrawnElevation = { ringColor: Moving<string> } & Record<string, Moving<string> | Moving<number>>;

export interface ElevationDrawing {
  /** Spread on the host: `boxShadow` (none when there is no layer), or the legacy shadow props without `boxShadow`. */
  shadow: ViewStyle;
  /** The elevation ring for `<Ring placement="outside">`, or null: none in this state and none fading. */
  ring: { width: number; color: Moving<string> } | null;
  /** True while the transition runs (the values are interpolations). */
  moving: boolean;
}

/**
 * The elevation to draw, from the transition's output (`drawn`) and the settled elevation of the current state
 * (`theme.elevation(level)`). Settled: the state's plain `boxShadow`. In transition: every layer interpolated
 * (JS-driven: neither colors nor `boxShadow` can use the native driver). A renderer without `boxShadow` switches its
 * legacy shadow with the state. The ring's color fades in and out with the transition; its width is the one of the
 * state that has a ring.
 */
export function useElevationDrawing(drawn: DrawnElevation, elevation: TanreiResolvedElevation, count: number): ElevationDrawing {
  const moving = typeof drawn.ringColor !== 'string';
  const boxShadow = moving
    ? Array.from({ length: count }, (_, i) => ({ offsetX: drawn[`shadow${i}X`], offsetY: drawn[`shadow${i}Y`], blurRadius: drawn[`shadow${i}Blur`], spreadDistance: drawn[`shadow${i}Spread`], color: drawn[`shadow${i}Color`] }))
    : elevation.boxShadow;
  const shadow: ViewStyle = !supportsBoxShadow() ? elevation.legacy : { boxShadow: boxShadow.length > 0 ? (boxShadow as ViewStyle['boxShadow']) : undefined };
  const ringWidth = useRef(0);
  if (elevation.ring) ringWidth.current = elevation.ring.width;
  const ring = moving && ringWidth.current > 0 ? { width: ringWidth.current, color: drawn.ringColor } : elevation.ring;
  return { shadow, ring, moving };
}
