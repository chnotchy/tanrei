// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiAvatar as TanreiAvatarElement } from '@tanrei/web/components/avatar';

const AvatarElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-avatar',
  elementClass: TanreiAvatarElement,
  react: React,
  events: {},
});
const AvatarAttributes = { src: ['src', ''], label: ['label', ''], initials: ['initials', ''], decorative: ['decorative', false], size: ['size', 'medium'], shape: ['shape', 'circle'], loading: ['loading', ''], referrerPolicy: ['referrerpolicy', ''], crossOrigin: ['crossorigin', null] } as const;
/**
 * Stands for a person, or for a team or a project, by a small picture — by initials or a glyph where there is no picture — in a round or a square box of three sizes. A picture, never a control.
 *
 * Children, by their `slot`:
 * - `icon` — The fallback glyph: a glyph of the system's icon set (its ligature text, in an element), drawn where there is neither a picture nor initials. Empty draws the system's own glyph for the shape. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 */
export const Avatar = /* @__PURE__ */ withServerAttributes(AvatarElement, 'tanrei-avatar', TanreiAvatarElement, AvatarAttributes);
