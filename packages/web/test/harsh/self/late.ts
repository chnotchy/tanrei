// A race's note that its read came later than the timing it takes for granted. test/harsh-self.test.mjs reads it: a race
// that fails with it ended "late" — it lost for the reason it is a race, not for another — and one that fails without it
// ended "failed".
import { test } from '@playwright/test';

/** The annotation's type, as test/harsh-self.test.mjs reads it. */
export const LATE = 'late';

/** Notes on the running test that its read came later than it takes for granted, saying by how much. */
export const late = (description: string): void => {
  test.info().annotations.push({ type: LATE, description });
};
