// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiOption as TanreiOptionElement } from '@tanrei/web/components/option';

/**
 * One choice of a select or a combobox: a label, the value it stands for, and optionally a supporting line and a glyph. `<tanrei-option value="jp">Japan</tanrei-option>`: the label is the `label` attribute or, without one, the element's text, as a native `<option>`'s.
 *
 * Children, by their `slot`:
 * - default — The option's label, as text, where the `label` attribute is not given. It is read, never drawn in place.
 */
export const Option = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-option',
  elementClass: TanreiOptionElement,
  react: React,
  events: {},
});
