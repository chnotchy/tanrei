// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiAvatarGroup as TanreiAvatarGroupElement } from '@tanrei/web/components/avatar';

const AvatarGroupElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-avatar-group',
  elementClass: TanreiAvatarGroupElement,
  react: React,
  events: {},
});
const AvatarGroupAttributes = { label: ['label', ''], max: ['max', 0], total: ['total', null], overflowLabel: ['overflow-label', ''], size: ['size', 'medium'], shape: ['shape', 'circle'] } as const;
/**
 * Several avatars drawn as one row in which each lies a little over the one before it, with a gap around each, and a last box that counts the members it does not draw: the avatar's group form.
 *
 * Children, by their `slot`:
 * - default — The members: `<tanrei-avatar>` elements, in order from the start edge.
 */
export const AvatarGroup = /* @__PURE__ */ withServerAttributes(AvatarGroupElement, 'tanrei-avatar-group', TanreiAvatarGroupElement, AvatarGroupAttributes);
