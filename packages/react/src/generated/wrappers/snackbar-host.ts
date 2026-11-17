// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiSnackbarHost as TanreiSnackbarHostElement } from '@tanrei/web/components/snackbar';

const SnackbarHostElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-snackbar-host',
  elementClass: TanreiSnackbarHostElement,
  react: React,
  events: {},
});
const SnackbarHostAttributes = { placement: ['placement', 'bottom'] } as const;
/**
 * Shows snackbars, one at a time, in the order they were asked for (SNK-12), at the bottom of the window (SNK-13) — above the navigation bar of `<tanrei-app-shell>`, whose height it reads from `--tanrei-app-shell-window-inset-bottom` on the document's root — or, with `placement="top-end"`, at its top end (SNK-35) — below its header, how far it reaches over the window read from `--tanrei-app-shell-window-inset-top`. The app shell sets both whatever scrolls; a product with a frame of its own sets those properties to how far its own bars reach over the window. Place it once, as the last element of the page: its place in the focus order is where a snackbar's controls are (SNK-11). It holds the two live regions their messages are announced in (SNK-10) — polite (`role="status"`) for the default, info and success forms, assertive (`role="alert"`) for warning and error — so it must be in the document before the first one.
 *
 * Children, by their `slot`:
 * - default — The snackbar being shown (the host puts it there).
 */
export const SnackbarHost = /* @__PURE__ */ withServerAttributes(SnackbarHostElement, 'tanrei-snackbar-host', TanreiSnackbarHostElement, SnackbarHostAttributes);
