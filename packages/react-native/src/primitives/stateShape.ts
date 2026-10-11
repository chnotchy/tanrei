import { RESTING_OPACITY } from './content';
import type { InteractionState } from './interaction';

/**
 * The component tokens that belong to an interaction state and to NO axis: the per-component `opacity` and
 * `container.shape` of every state (`dev.tanrei.states.perComponent`), which every pressable component has.
 * The resting state has a shape and no opacity (the resting opacity is not a token). Structural: any
 * component's generated tokens (`TanreiButtonTokens`, `TanreiIconButtonTokens`, `TanreiCardTokens`, …) satisfy it as
 * they are. A component whose corners do not change with the state (a card, a text field) has no `<state>ContainerShape`:
 * every state then has the resting `containerShape`. A component that cannot be pressed (a text field) has no
 * `pressedOpacity`; it is never in the pressed state, which would be drawn at the resting opacity.
 */
export interface StateShapeTokens {
  readonly containerShape: number;
  readonly hoveredOpacity: number;
  readonly hoveredContainerShape?: number;
  readonly focusedOpacity: number;
  readonly focusedContainerShape?: number;
  readonly pressedOpacity?: number;
  readonly pressedContainerShape?: number;
  readonly disabledOpacity: number;
  readonly disabledContainerShape?: number;
}

/** What one state's axis-free tokens say: the whole control's opacity and the container's corner radius. */
export interface StateShape {
  opacity: number;
  shape: number;
}

/**
 * Reads one state's `<state>Opacity` / `<state>ContainerShape`. Interaction states are closed, so this is
 * the one `switch` over them every component shares, instead of each writing its own. A token key is never built from the state's name.
 */
export function stateShape(tokens: StateShapeTokens, state: InteractionState): StateShape {
  switch (state) {
    case 'enabled':
      return { opacity: RESTING_OPACITY, shape: tokens.containerShape };
    case 'hovered':
      return { opacity: tokens.hoveredOpacity, shape: tokens.hoveredContainerShape ?? tokens.containerShape };
    case 'focused':
      return { opacity: tokens.focusedOpacity, shape: tokens.focusedContainerShape ?? tokens.containerShape };
    case 'pressed':
      return { opacity: tokens.pressedOpacity ?? RESTING_OPACITY, shape: tokens.pressedContainerShape ?? tokens.containerShape };
    case 'disabled':
      return { opacity: tokens.disabledOpacity, shape: tokens.disabledContainerShape ?? tokens.containerShape };
  }
}
