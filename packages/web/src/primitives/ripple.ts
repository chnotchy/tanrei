import { type CSSResult, unsafeCSS } from 'lit';

type Property = `--${string}`;

/** The component's custom properties the ripple is drawn from. Names only: the fragment wraps each in `var()`. */
export interface RippleTokens {
  /** The pressed container color (the state layer). */
  color: Property;
  /** How far the layer is inset from the container — its outline width, so the layer stays inside the outline. Omit for 0. */
  inset?: Property;
  /** How long the layer grows (e.g. `comp.<name>.motion.feedback-duration`). */
  grow: Property;
  /** How long it fades once the press and press-hold are over (e.g. `comp.<name>.motion.state-duration`). */
  fade: Property;
  /** The curve of both (e.g. `comp.<name>.motion.state-easing`). */
  easing: Property;
}

/**
 * The layer `sys.behavior.pressed-feedback: ripple` draws (BTN-9 and every control after it). It exists only while a
 * press under ripple is being answered (`PressController` adds and removes it). It is the pressed container color,
 * clipped to the container shape (inside the outline) and to a circle around the point of contact; `startRipple()`
 * sets `--_x`, `--_y` (the point) and `--_r` (the distance to the farthest corner). It sits above the container color
 * and below the content: the container must be its own stacking context (`isolation: isolate`) and a positioning
 * container. Under reduced motion it becomes an overlay: the whole layer at once, gone at once.
 */
export function rippleStyles(tokens: RippleTokens): CSSResult {
  const inset = tokens.inset ? `var(${tokens.inset})` : '0';
  const radius = tokens.inset ? `calc(var(--tanrei-corner-radius) * var(--_corner-scale) - var(${tokens.inset}))` : 'calc(var(--tanrei-corner-radius) * var(--_corner-scale))';
  return unsafeCSS(`
  .ripple {
    position: absolute;
    z-index: -1;
    inset: ${inset};
    border-radius: ${radius};
    corner-shape: inherit;
    background: var(${tokens.color});
    pointer-events: none;
    clip-path: circle(var(--_r) at var(--_x) var(--_y));
    animation: ripple-grow var(${tokens.grow}) var(${tokens.easing}) both;
    transition: opacity var(${tokens.fade}) var(${tokens.easing});
  }
  .ripple.leaving {
    opacity: 0;
  }
  @keyframes ripple-grow {
    from {
      clip-path: circle(0 at var(--_x) var(--_y));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple {
      animation: none;
      transition: none;
    }
  }
`);
}

/** A point of contact, in viewport coordinates. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Adds the layer as the first child of `container` and sets its origin: the point of contact, clamped into the layer,
 * or its center for a keyboard press (`at` null), and a radius that reaches the farthest corner.
 */
export function startRipple(container: HTMLElement, at: Point | null): HTMLElement {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.setAttribute('aria-hidden', 'true');
  container.prepend(ripple);
  // Measured on the layer itself: it is inset by the outline, and its box is what the circle is clipped in.
  const box = ripple.getBoundingClientRect();
  const x = at ? Math.min(Math.max(at.x - box.left, 0), box.width) : box.width / 2;
  const y = at ? Math.min(Math.max(at.y - box.top, 0), box.height) : box.height / 2;
  ripple.style.setProperty('--_x', `${x}px`);
  ripple.style.setProperty('--_y', `${y}px`);
  ripple.style.setProperty('--_r', `${Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y))}px`);
  return ripple;
}

/**
 * The press is over and press-hold has passed: the layer fades from here — still growing, if the press was shorter
 * than its growth — and is removed when the fade is done. Under reduced motion there is no fade.
 */
export function fadeRipple(ripple: HTMLElement) {
  ripple.classList.add('leaving');
  // getAnimations() computes style first, so the fade that `leaving` starts is already in the list.
  const fades = ripple.getAnimations().filter((animation) => typeof CSSTransition === 'undefined' || animation instanceof CSSTransition);
  void Promise.allSettled(fades.map((fade) => fade.finished)).then(() => ripple.remove());
}
