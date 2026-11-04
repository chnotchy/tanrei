// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { withServerAttributes } from '../../server.js';
import { TanreiImagePreview as TanreiImagePreviewElement, type TanreiImagePreviewCloseDetail, type TanreiImagePreviewIndexChangeDetail, type TanreiImagePreviewZoomChangeDetail, type TanreiImagePreviewControlsHiddenChangeDetail, type TanreiImagePreviewLoadErrorDetail } from '@tanrei/web/components/image-preview';

const ImagePreviewElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-image-preview',
  elementClass: TanreiImagePreviewElement,
  react: React,
  events: {
    onClose: 'close' as EventName<TanreiEvent<TanreiImagePreviewElement, CustomEvent<TanreiImagePreviewCloseDetail>>>,
    onIndexChange: 'indexchange' as EventName<TanreiEvent<TanreiImagePreviewElement, CustomEvent<TanreiImagePreviewIndexChangeDetail>>>,
    onZoomChange: 'zoomchange' as EventName<TanreiEvent<TanreiImagePreviewElement, CustomEvent<TanreiImagePreviewZoomChangeDetail>>>,
    onControlsHiddenChange: 'controlshiddenchange' as EventName<TanreiEvent<TanreiImagePreviewElement, CustomEvent<TanreiImagePreviewControlsHiddenChangeDetail>>>,
    onLoadError: 'loaderror' as EventName<TanreiEvent<TanreiImagePreviewElement, CustomEvent<TanreiImagePreviewLoadErrorDetail>>>,
  },
});
const ImagePreviewAttributes = { open: ['open', false], index: ['index', 0], zoom: ['zoom', 1], maxZoom: ['max-zoom', null], controlsHidden: ['controls-hidden', false], label: ['label', ''], closeLabel: ['close-label', ''], previousLabel: ['previous-label', ''], nextLabel: ['next-label', ''], zoomInLabel: ['zoom-in-label', ''], zoomOutLabel: ['zoom-out-label', ''], countText: ['count-text', ''], loadingLabel: ['loading-label', ''], errorText: ['error-text', ''] } as const;
/**
 * Shows one picture of a set over the whole window when the person presses its thumbnail, to be looked at closely — enlarged and back by a double tap, a pinch, a control or a key, moved about while enlarged — and moved on to the next picture or back, until it is closed.
 *
 * Children, by their `slot`:
 * - default — The images: `<tanrei-image-preview-item>` elements, in the order they are shown. They are read, never drawn in place.
 *
 * Events:
 * - `onClose` (`close`) — The person asked to close the preview: `detail.reason` is `button`, `escape`, `back` or `swipe`. Set `open` to false.
 * - `onIndexChange` (`indexchange`) — The person moved to another image: `detail.index`, which `index` already is. Not fired when you set `index`.
 * - `onZoomChange` (`zoomchange`) — The zoom changed by the person's gesture, control or key, or returned to 1 because the image changed: `detail.zoom`, once the change has ended. Not fired when you set `zoom`.
 * - `onControlsHiddenChange` (`controlshiddenchange`) — The person hid or showed the controls: `detail.hidden`. Not fired when you set `controlsHidden`.
 * - `onLoadError` (`loaderror`) — The source of an image the preview asked for did not load: `detail.index`. Once for each source that fails.
 */
export const ImagePreview = /* @__PURE__ */ withServerAttributes(ImagePreviewElement, 'tanrei-image-preview', TanreiImagePreviewElement, ImagePreviewAttributes);
