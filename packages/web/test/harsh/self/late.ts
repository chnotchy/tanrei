// A race's note that its read came later than the timing it takes for granted. test/harsh-self.test.mjs reads it: a race
// with it ended "late", whether it failed (it lost for the reason it is a race, not for another) or passed (it read late
// and still won, which says nothing); one that fails without it ended "failed". A race notes it whenever the timing it
// takes for granted did not hold — by the order of what happened in the page, not by its clock alone, which counts whole
// milliseconds in Firefox and WebKit — so that a race lost to timing is never a plain failure.
import { test } from '@playwright/test';

/** The annotation's type, as test/harsh-self.test.mjs reads it. */
export const LATE = 'late';

/** Notes on the running test that its read came later than it takes for granted, saying by how much. */
export const late = (description: string): void => {
  test.info().annotations.push({ type: LATE, description });
};
