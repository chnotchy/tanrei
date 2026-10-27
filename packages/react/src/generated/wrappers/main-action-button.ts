// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiMainActionButton as TanreiMainActionButtonElement } from '@tanrei/web/components/main-action-button';

const MainActionButtonElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-main-action-button',
  elementClass: TanreiMainActionButtonElement,
  react: React,
  events: {},
});
const MainActionButtonAttributes = { variant: ['variant', 'filled'], size: ['size', 'medium'], extended: ['collapsed', true], fullWidth: ['full-width', false], iconPosition: ['icon-position', 'leading'], disabled: ['disabled', false], label: ['label', ''] } as const;
/**
 * Performs the single most important action of a screen on a raised container that floats above the content, showing its icon and its written name (extended), or collapsing to its icon alone.
 *
 * Children, by their `slot`:
 * - `icon` — The icon: a glyph of the system's icon set (its ligature text), or a `.tanrei-icon`, `<svg>` or `<img>`. Required to collapse. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 */
export const MainActionButton = /* @__PURE__ */ withServerAttributes(MainActionButtonElement, 'tanrei-main-action-button', TanreiMainActionButtonElement, MainActionButtonAttributes);
