// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiButtonGroup as TanreiButtonGroupElement } from '@tanrei/web/components/button-group';

const ButtonGroupElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-button-group',
  elementClass: TanreiButtonGroupElement,
  react: React,
  events: {},
});
const ButtonGroupAttributes = { variant: ['variant', 'standard'], orientation: ['orientation', 'horizontal'], separation: ['separation', 'auto'], fullWidth: ['full-width', false], label: ['label', ''] } as const;
/**
 * Lays out a few related Buttons in one row or one column, spaced apart or joined into one shape, places the confirming and the dismissive ones by the orientation, and names them as a group.
 *
 * Children, by their `slot`:
 * - default — The items: `<tanrei-button>` elements, with `confirming` or `dismissive` on the ones the group should place. Anything else is still laid out, and reported in debug builds (BGR-10).
 */
export const ButtonGroup = /* @__PURE__ */ withServerAttributes(ButtonGroupElement, 'tanrei-button-group', TanreiButtonGroupElement, ButtonGroupAttributes);
