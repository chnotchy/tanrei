// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiPageHeader as TanreiPageHeaderElement } from '@tanrei/web/components/page-header';

const PageHeaderElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-page-header',
  elementClass: TanreiPageHeaderElement,
  react: React,
  events: {},
});
const PageHeaderAttributes = { headline: ['headline', ''], description: ['description', ''], eyebrow: ['eyebrow', ''], size: ['size', 'medium'], level: ['level', 0], actionsPlacement: ['actions-placement', 'end'], divider: ['divider', false] } as const;
/**
 * The head of a page's content: the page's title as its heading, with a sentence that says what the page is, a line of facts about it, the actions for the whole page and the way back up above it — in the content, scrolling with it, laid out by its own width, and never a control.
 *
 * Children, by their `slot`:
 * - default — The page's own elements, in reading order: the breadcrumbs, `[data-part="eyebrow"]`, the heading, the description's `p`, `[data-part="meta"]` and `[data-part="actions"]`. They are children in the document, not slotted nodes: the element has no shadow root.
 */
export const PageHeader = /* @__PURE__ */ withServerAttributes(PageHeaderElement, 'tanrei-page-header', TanreiPageHeaderElement, PageHeaderAttributes);
