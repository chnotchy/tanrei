import type { Ref } from 'react';
import type { Animated } from 'react-native';
import type { TanreiColor, TanreiCubicBezier, TanreiPaint } from '../generated/vocabulary';
import { useTanrei } from '../theme/TanreiProvider';
import type { InteractionState } from './interaction';
import type { VisualSize } from './minimumTarget';
import { usePressInteraction, type PressableHost, type PressInteraction, type PressInteractionHandlers, type PressInteractionOptions } from './pressInteraction';
import { useControlTransition } from './selectionControl';
import { stateShape, type StateShapeTokens } from './stateShape';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

// The row of a column of items — a list item (LST-3 … LST-10, LST-25), a menu item (MNU-10 … MNU-17, MNU-27), a tab, a
// navigation destination (NVB, NVR, NVD): one
// pressable row whose `container` carries the state answer and whose parts are drawn from the tokens of
// the row's CONDITION (unselected, selected, destructive — the component's state variants) in the state that wins.
// Package-internal: List and Menu lay their rows out differently; this is what they share.

export interface ItemRowOptions<Part extends string> extends PressInteractionHandlers {
  /** An interactive item or an option: false draws the resting tokens and answers nothing (a static list item, LST-11). */
  pressable: boolean;
  disabled: boolean;
  /** The row's condition: a change of it moves the colors, never at once under a press (a selection, LST-21). */
  condition: string;
  /** The paints of the row's condition in one interaction state: its `container` and every other part. */
  paints: (state: InteractionState) => Readonly<Record<'container' | Part, TanreiPaint>>;
  /** The component's per-state opacity and container shape (`stateShape`). */
  shapes: StateShapeTokens;
  /**
   * The component's motion tokens: the state motion moves every color, the feedback duration grows the ripple. A
   * component with a selection motion of its own (a navigation destination) gives it as `selectionDuration` /
   * `selectionEasing`: a change of condition then moves over it; without them, over the state motion.
   */
  motion: { feedbackDuration: number; stateDuration: number; stateEasing: TanreiCubicBezier; selectionDuration?: number; selectionEasing?: TanreiCubicBezier };
  /** Where the ripple grows when that is not the whole row (a destination's item container): `usePressInteraction`'s `rippleArea`. */
  rippleArea?: PressInteractionOptions['rippleArea'];
  /** The row's smallest box before its first layout pass. */
  estimate: VisualSize;
  ref?: Ref<PressableHost>;
  /** Focus that followed the pointer onto the row (a menu item, MNU-8): drawn hovered, without the focus ring. */
  pointerFocus?: boolean;
}

export interface ItemRow<Part extends string> {
  interaction: PressInteraction;
  /** The state that is drawn: `enabled` for a row that is not pressable. */
  state: InteractionState;
  /** Every part's color as drawn (plain when settled, an interpolation while it moves), the opacity and the corner radius. */
  drawn: Record<'container' | Part, Moving<string>> & { opacity: Moving<number>; shape: Moving<number> };
  /** The drawn container paint, resolved: `fillOf(container, drawn.container)` draws nothing for a paint of nothing. */
  container: TanreiColor;
  /** Every part's settled color string (what a glyph function receives). */
  colors: Record<'container' | Part, string>;
  /** The pressed container color of the condition: what a ripple grows in. */
  rippleColor: string;
}

/**
 * The shared state of an item row: `usePressInteraction` (press hold, hover, keyboard focus, the ripple — LST-8 / LST-9,
 * MNU-15 / MNU-16), the state that wins (disabled, else pressed > focused > hovered), its tokens resolved, and one
 * transition over the state motion: a state change moves at once under a press, a change of condition moves over the
 * state motion too (a list and a menu have no selection motion of their own). Under `ripple` (while one draws) and
 * `dim` the container keeps the color of the state under the press; every other part comes from the pressed tokens.
 */
export function useItemRow<Part extends string>({ pressable, disabled, condition, paints, shapes, motion, estimate, ref, pointerFocus, rippleArea, ...handlers }: ItemRowOptions<Part>): ItemRow<Part> {
  const theme = useTanrei();
  const interaction = usePressInteraction({ disabled: !pressable || disabled, estimate, motion, ref, pointerFocus, rippleArea, ...handlers });
  const state: InteractionState = pressable ? interaction.state : 'enabled';
  const under: InteractionState = pressable ? interaction.under : 'enabled';
  const current = paints(state);
  const containerPaint = pressable && interaction.layerless ? paints(under).container : current.container;
  const { opacity, shape } = stateShape(shapes, state);

  const resolved: Record<string, TanreiColor> = {};
  const colors: Record<string, string> = {};
  for (const [name, paint] of Object.entries(current) as [string, TanreiPaint][]) {
    const drawnPaint = name === 'container' ? containerPaint : paint;
    resolved[name] = theme.resolve(drawnPaint);
    colors[name] = theme.paint(drawnPaint);
  }
  const stateMotion = { duration: motion.stateDuration, easing: motion.stateEasing };
  const selectionMotion = { duration: motion.selectionDuration ?? motion.stateDuration, easing: motion.selectionEasing ?? motion.stateEasing };
  const drawn = useControlTransition({ ...resolved, opacity, shape }, condition, { state: stateMotion, selection: selectionMotion, pressed: state === 'pressed' });

  return {
    interaction,
    state,
    drawn: drawn as unknown as ItemRow<Part>['drawn'],
    container: resolved.container!,
    colors: colors as Record<'container' | Part, string>,
    rippleColor: theme.paint(paints('pressed').container),
  };
}
