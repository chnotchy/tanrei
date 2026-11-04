// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiSwatch as TanreiSwatchElement } from '@tanrei/web/components/swatch';

const SwatchElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-swatch',
  elementClass: TanreiSwatchElement,
  react: React,
  events: {},
});
const SwatchAttributes = { color: ['color', ''], label: ['label', ''], supportingText: ['supporting-text', ''], labelHidden: ['label-hidden', false], decorative: ['decorative', false], size: ['size', 'medium'], shape: ['shape', 'square'] } as const;
/**
 * Shows a color as a sample with its name beside it: a small square or dot of exactly that color, over a checkerboard where the color lets what is behind it through, edged so that a color close to the surface still shows where it ends. A sample to look at, never a control and never a picker.
 */
export const Swatch = /* @__PURE__ */ withServerAttributes(SwatchElement, 'tanrei-swatch', TanreiSwatchElement, SwatchAttributes);
