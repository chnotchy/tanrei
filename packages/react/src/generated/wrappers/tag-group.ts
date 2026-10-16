// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiTagGroup as TanreiTagGroupElement } from '@tanrei/web/components/tag-group';

/**
 * Lays out a set of tags or chips in lines that wrap, spaced for what it holds, and exposes the set as one named list.
 *
 * Children, by their `slot`:
 * - default — The members: `<tanrei-tag>` and `<tanrei-chip>` elements. Anything else is still laid out, and reported in debug builds (TGR-11).
 */
export const TagGroup = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-tag-group',
  elementClass: TanreiTagGroupElement,
  react: React,
  events: {},
});
