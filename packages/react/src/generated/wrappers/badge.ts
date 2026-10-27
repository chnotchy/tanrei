// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiBadge as TanreiBadgeElement } from '@tanrei/web/components/badge';

const BadgeElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-badge',
  elementClass: TanreiBadgeElement,
  react: React,
  events: {},
});
const BadgeAttributes = { count: ['count', null], max: ['max', 999], label: ['label', ''] } as const;
/**
 * Marks an icon, a navigation item or an avatar with a dot or a small count to show that something is waiting.
 *
 * Children, by their `slot`:
 * - default — The anchor the badge sits on, which it needs: an icon, an icon button, a navigation item or an avatar. Its first element is the one that is described; with none, the badge draws nothing (BDG-16).
 */
export const Badge = /* @__PURE__ */ withServerAttributes(BadgeElement, 'tanrei-badge', TanreiBadgeElement, BadgeAttributes);
