// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiImagePreviewItem as TanreiImagePreviewItemElement } from '@tanrei/web/components/image-preview';

const ImagePreviewItemElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-image-preview-item',
  elementClass: TanreiImagePreviewItemElement,
  react: React,
  events: {},
});
const ImagePreviewItemAttributes = { src: ['src', ''], alt: ['alt', ''], caption: ['caption', ''], thumbnailSrc: ['thumbnail-src', ''], width: ['width', null], height: ['height', null] } as const;
/**
 * One picture of an image preview's set: where it is, what it shows in words, and optionally what the product says about it. `<tanrei-image-preview-item src="room-large.jpg" alt="A bedroom with a window onto a garden">`.
 */
export const ImagePreviewItem = /* @__PURE__ */ withServerAttributes(ImagePreviewItemElement, 'tanrei-image-preview-item', TanreiImagePreviewItemElement, ImagePreviewItemAttributes);
