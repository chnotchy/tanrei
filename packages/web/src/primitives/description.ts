import type { PropertyDeclaration } from 'lit';

/**
 * `aria-description` set on the host, forwarded to the native element in the shadow root that carries the component's
 * semantics. A custom element's host is a generic box that assistive
 * technology passes over, so a description put on it — by a product, or by a `<tanrei-badge>` describing its anchor
 * (BDG-8) — would never be read with the button's name. Declare it as a property (`forwardedDescription:
 * FORWARDED_DESCRIPTION`) and render it on the native element: `aria-description=${this.forwardedDescription ?? nothing}`.
 * An ID reference (`aria-describedby`) cannot cross the shadow root and is not forwarded.
 */
export const FORWARDED_DESCRIPTION: PropertyDeclaration = { type: String, attribute: 'aria-description' };

/**
 * `aria-invalid` set on the host, forwarded the same way: a frame that marks an element it does not know as invalid
 * writes the attribute on the host (`giveAttributes()`, src/primitives/field.ts — a field around a Button, a file
 * upload around its trigger, FUP-16), and the host is not what assistive technology reads. Declare it as a property
 * (`forwardedInvalid: FORWARDED_INVALID`) and render it on the native element:
 * `aria-invalid=${this.forwardedInvalid === 'true' ? 'true' : nothing}`.
 */
export const FORWARDED_INVALID: PropertyDeclaration = { type: String, attribute: 'aria-invalid' };
