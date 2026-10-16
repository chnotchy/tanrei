// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiOptionGroup as TanreiOptionGroupElement } from '@tanrei/web/components/option';

/**
 * A run of related options of a select or a combobox, optionally titled: `<tanrei-option-group label="Asia">…</tanrei-option-group>`. The title is the `label` attribute, as a native `<optgroup>`'s — a `title` attribute would also draw the browser's tooltip. The field separates a group from what is next to it by a divider or a gap.
 *
 * Children, by their `slot`:
 * - default — The group's `<tanrei-option>` elements.
 */
export const OptionGroup = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-option-group',
  elementClass: TanreiOptionGroupElement,
  react: React,
  events: {},
});
