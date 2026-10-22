// The contrast thresholds the token build holds, as a page writes them ("4.5:1"). A page that states a threshold
// imports it from here and never writes the number itself: the numbers are the build's own constants.
import { CONTRAST_THRESHOLDS } from '../../../../packages/tokens-build/src/invariants.js';

const ratio = (n: number) => `${n}:1`;

export const contrast = {
  /** Text, and a content color on its container, at standard and medium contrast. */
  text: ratio(CONTRAST_THRESHOLDS.text),
  /** The same pairs in the two high-contrast schemes. */
  highContrastText: ratio(CONTRAST_THRESHOLDS.highContrastText),
  /** A boundary that identifies a control, a status's mark, the focus ring. */
  nonText: ratio(CONTRAST_THRESHOLDS.nonText),
  /** The default system's hairline (`outline-variant`) at medium contrast. */
  hairlineMedium: ratio(CONTRAST_THRESHOLDS.hairline.medium),
  /** The default system's hairline at high contrast. */
  hairlineHigh: ratio(CONTRAST_THRESHOLDS.hairline.high),
} as const;
