// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiLinkCard as TanreiLinkCardElement } from '@tanrei/web/components/link-card';

const LinkCardElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-link-card',
  elementClass: TanreiLinkCardElement,
  react: React,
  events: {},
});
const LinkCardAttributes = { href: ['href', ''], target: ['target', 'same'], targetLabel: ['target-label', ''], external: ['external', 'auto'], externalLabel: ['external-label', ''], headline: ['headline', ''], description: ['description', ''], image: ['image', ''], imageAlt: ['image-alt', ''], siteName: ['site-name', ''], siteIcon: ['site-icon', ''], variant: ['variant', 'outlined'] } as const;
/**
 * One link drawn as a block: the destination's title, a sentence about it, its picture and the site it is on — from values the card is given and never loads. The host under the text is always computed from `href`.
 *
 * Children, by their `slot`:
 * - default — The product's own anchor, holding the parts (`data-part`: `body` around `title`, `description`, `image-alt`, `site` and `words`; then `media`). A child in the document, not a slotted node: the element has no shadow root. Nothing in it is pressed by itself (LKC-35).
 */
export const LinkCard = /* @__PURE__ */ withServerAttributes(LinkCardElement, 'tanrei-link-card', TanreiLinkCardElement, LinkCardAttributes);
