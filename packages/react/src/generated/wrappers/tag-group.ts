// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiTagGroup as TanreiTagGroupElement, type TanreiTagGroupChangeDetail } from '@tanrei/web/components/tag-group';

/**
 * Lays out a set of tags or chips in lines that wrap, spaced for what it holds, and exposes the set as one named list.
 *
 * Children, by their `slot`:
 * - default — The members: `<tanrei-tag>` and `<tanrei-chip>` elements. Anything else is still laid out, and reported in debug builds (TGR-11).
 *
 * Events:
 * - `onChange` (`change`) — While `selection` is single or multiple, a person switched a filter chip: `detail.value` (single) or `detail.values` (multiple) after the change, which the group already holds. The chip's own `change` stops at the group.
 */
export const TagGroup = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-tag-group',
  elementClass: TanreiTagGroupElement,
  react: React,
  events: {
    onChange: 'change' as EventName<TanreiEvent<TanreiTagGroupElement, CustomEvent<TanreiTagGroupChangeDetail>>>,
  },
});
