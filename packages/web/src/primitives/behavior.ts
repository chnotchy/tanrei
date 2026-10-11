/**
 * Choices of kind. The value of `--tanrei-sys-behavior-*` is the choice's NAME, inherited into the shadow
 * tree from whatever ancestor carries the active system — so a style container query reads it with no script, follows
 * a runtime switch of `data-tanrei-system`, and never leaks between two systems on one page. Script reads it with
 * `choice()` at the moment of the interaction, never cached.
 */
export const BEHAVIOR = '--tanrei-sys-behavior';

/** A choice of kind, by name, as the cascade gives it to `host` — never cached, so a system switch is seen. */
export function choice(host: Element, name: string): string {
  return getComputedStyle(host).getPropertyValue(`${BEHAVIOR}-${name}`).trim();
}

/** `sys.behavior.pressed-feedback`. The first value is the default, and what an unknown value falls back to. */
export const PRESSED_FEEDBACK = ['overlay', 'ripple', 'dim', 'none'] as const;
export type PressedFeedback = (typeof PRESSED_FEEDBACK)[number];

/** How a press on `host` is answered right now. */
export function pressedFeedback(host: Element): PressedFeedback {
  const named = choice(host, 'pressed-feedback') as PressedFeedback;
  return PRESSED_FEEDBACK.includes(named) ? named : PRESSED_FEEDBACK[0];
}
