import type { PropertyDeclaration } from 'lit';

/**
 * A control that a host element places and steps or acts for by keys of its own is not a stop in the focus order (a
 * number field's steppers, NUM-25: Up Arrow and Down Arrow do their work from the input, and a form of twenty numbers
 * stays twenty stops long). The host says so on the control — `.outsideFocusOrder=${true}` — and the control renders
 * `tabindex="-1"` on the native element that carries its semantics, which stays in the accessibility tree, named, and
 * pressable by a pointer and by assistive technology. Declare it as a property (`outsideFocusOrder:
 * OUTSIDE_FOCUS_ORDER`). It has no attribute: an internal contract between Tanrei elements, not part of a control's
 * public surface.
 */
export const OUTSIDE_FOCUS_ORDER: PropertyDeclaration = { type: Boolean, attribute: false };
