// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { type EventName, createComponent } from '@lit/react';
import * as React from 'react';
import type { TanreiEvent } from '../../events.js';
import { TanreiSnackbar as TanreiSnackbarElement, type TanreiSnackbarDismissDetail, type TanreiSnackbarExpandedChangeDetail } from '@tanrei/web/components/snackbar';

/**
 * Tells a person briefly, at the bottom edge of the screen, what the app just did or what happened (neutrally, or as information, a warning, an error or a success), with at most one action, without taking focus or interrupting their work.
 *
 * Events:
 * - `onAction` (`action`) — The action was activated; the snackbar closes.
 * - `onDismiss` (`dismiss`) — The snackbar closed without its action: `detail.reason` is `close`, `escape`, `timeout` or `host`.
 * - `onExpandedchange` (`expandedchange`) — The person expanded or collapsed the text with the expand button: `detail.expanded` is the new value. Not fired when the product sets `expanded`.
 */
export const Snackbar = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-snackbar',
  elementClass: TanreiSnackbarElement,
  react: React,
  events: {
    onAction: 'action' as EventName<TanreiEvent<TanreiSnackbarElement>>,
    onDismiss: 'dismiss' as EventName<TanreiEvent<TanreiSnackbarElement, CustomEvent<TanreiSnackbarDismissDetail>>>,
    onExpandedchange: 'expandedchange' as EventName<TanreiEvent<TanreiSnackbarElement, CustomEvent<TanreiSnackbarExpandedChangeDetail>>>,
  },
});
