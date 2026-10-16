// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { TanreiBreadcrumbs as TanreiBreadcrumbsElement } from '@tanrei/web/components/breadcrumbs';

/**
 * Shows where a page sits in a hierarchy of pages and leads back up it: the levels above as links, in order from the top, with the page itself last.
 *
 * Children, by their `slot`:
 * - default — The levels, from the top of the hierarchy to the page: `<a href>` and `<span>` children. They stay in the document.
 */
export const Breadcrumbs = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-breadcrumbs',
  elementClass: TanreiBreadcrumbsElement,
  react: React,
  events: {},
});
