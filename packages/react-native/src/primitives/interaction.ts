export interface InteractionFlags {
  disabled?: boolean;
  hovered?: boolean;
  /** Keyboard focus only — see `useKeyboardFocus`. */
  focused?: boolean;
  pressed?: boolean;
}

/** The state whose tokens a component draws. `enabled` is the resting state. */
export type InteractionState = 'enabled' | 'hovered' | 'focused' | 'pressed' | 'disabled';

/** One state wins: disabled, else pressed > focused > hovered, else enabled. Pure; no tokens involved. */
export function resolveInteractionState({ disabled, hovered, focused, pressed }: InteractionFlags): InteractionState {
  if (disabled) return 'disabled';
  if (pressed) return 'pressed';
  if (focused) return 'focused';
  if (hovered) return 'hovered';
  return 'enabled';
}

/** Every interaction state, resting first: what a control iterates when it needs something of each (its most shadow layers). */
export const INTERACTION_STATES: readonly InteractionState[] = ['enabled', 'hovered', 'focused', 'pressed', 'disabled'];
