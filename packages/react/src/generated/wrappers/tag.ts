// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiTag as TanreiTagElement } from '@tanrei/web/components/tag';

/**
 * Names a category or a status with a short static label, quietly, outlined or filled, in the colors of a status where it has one. It is text, never a control.
 *
 * Children, by their `slot`:
 * - `icon` — The leading glyph: a glyph of the system's icon set (its ligature text), or an `<svg>` or `<img>`. It takes the dot's place. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 */
export const Tag = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-tag',
  elementClass: TanreiTagElement,
  react: React,
  events: {},
});
