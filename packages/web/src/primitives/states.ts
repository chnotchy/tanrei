import { type CSSResult, unsafeCSS } from 'lit';

/**
 * Names the element that paints a state, given the state's condition: `(state) => \`button${state}\``. The conditions
 * are `:hover`, `:focus-visible`, `[data-pressed…]` (written by `PressController` on its container) and `:disabled`.
 */
export type StateSelector = (state: string) => string;

/**
 * What each state paints: declarations, all from the component's own tokens for that state (container, label, outline,
 * elevation, opacity, `cornerRadius()` of its shape). How a state looks is the design system's decision; the component
 * only says which tokens a state reads.
 */
export interface StatePaints {
  hovered: string;
  focused: string;
  /** pressed-feedback: overlay — the pressed tokens on the whole container at once. */
  pressed: string;
  /**
   * pressed-feedback: ripple and dim — everything the pressed tokens give EXCEPT the container color, which stays with
   * the state under the press (resting, hovered or focused). The ripple brings the pressed container color as a layer;
   * dim has none.
   */
  pressedContent: string;
  disabled: string;
}

/**
 * The state rules and their precedence (BTN-3 / BTN-6 / BTN-8 / BTN-9 and every control after them). Later rules win:
 * pressed > focused > hovered, and disabled over all. Hover only where the primary pointer hovers. The pressed state
 * appears without a transition in; under pressed-feedback: none nothing about the control changes — its transitions
 * included — so there is no rule for it at all.
 *
 * Put it after the component's resting rule. Anything that must win over disabled (forced colors) comes after it.
 */
export function stateRules(on: StateSelector, paint: StatePaints): CSSResult {
  return unsafeCSS(`
  @media (hover: hover) {
    ${on(':hover')} {${paint.hovered}
    }
  }
  ${on(':focus-visible')} {${paint.focused}
  }
  ${on("[data-pressed]:not([data-pressed='none'])")} {
    transition-duration: 0s;
  }
  ${on("[data-pressed='overlay']")} {${paint.pressed}
  }
  ${on("[data-pressed='ripple']")},
  ${on("[data-pressed='dim']")} {${paint.pressedContent}
  }
  ${on(':disabled')} {${paint.disabled}
  }
`);
}
