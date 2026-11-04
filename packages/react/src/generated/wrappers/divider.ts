// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiDivider as TanreiDividerElement } from '@tanrei/web/components/divider';

const DividerElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-divider',
  elementClass: TanreiDividerElement,
  react: React,
  events: {},
});
const DividerAttributes = { orientation: ['orientation', 'horizontal'], inset: ['inset', 'none'], lineStyle: ['line-style', 'solid'], lineCap: ['line-cap', 'butt'], insetLength: ['inset-length', null], thickness: ['thickness', null], dashLength: ['dash-length', null], gap: ['gap', null], amplitude: ['amplitude', null], wavelength: ['wavelength', null], decorative: ['decorative', true] } as const;
/**
 * Separates groups of content in a list, a layout or a toolbar with a thin line.
 */
export const Divider = /* @__PURE__ */ withServerAttributes(DividerElement, 'tanrei-divider', TanreiDividerElement, DividerAttributes);
