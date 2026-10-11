// Series extensions never throw: a generated accessor of a step
// ONE system added is total — under a system that lacks the step it returns the value the declaring system gave it,
// and reports once in development builds.
import { cupertino } from '../../generated/systems/cupertino';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiSystem } from '../../generated/vocabulary';
import { acme, acmeSteps } from '../../components/__tests__/__fixtures__/acme';
import { seriesStep } from '../lookup';

let warn: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('acmeSteps: the generated accessors', () => {
  test('under acme: the system\'s own value, silently', () => {
    expect(acmeSteps.space.space1200(acme)).toBe(96);
    expect(acmeSteps.space.space1200(acme)).toBe(acme.space.space1200);
    expect(acmeSteps.motion.spring.standard.bouncy(acme)).toBe(acme.motion.spring.standard.bouncy);
    expect(warn).not.toHaveBeenCalled();
  });

  test('under a system WITHOUT the step: the value acme declared — no throw, no undefined — reported once per step in development', () => {
    expect((tanrei.space as TanreiSystem['space']).space1200).toBeUndefined();
    expect(acmeSteps.space.space1200(tanrei)).toBe(96);
    expect(acmeSteps.space.space1200(cupertino)).toBe(96);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toMatch(/space1200/);
  });

  test('an active system that re-values the step wins over the declared value', () => {
    const product: TanreiSystem = { ...tanrei, space: { ...tanrei.space, space1200: 120 } };
    expect(acmeSteps.space.space1200(product)).toBe(120);
  });

  test('springs are a series like the others: per spring scheme, a whole spring', () => {
    expect((tanrei.motion.spring.standard as TanreiSystem['motion']['spring']['standard']).bouncy).toBeUndefined();
    expect(acmeSteps.motion.spring.standard.bouncy(tanrei)).toEqual({ damping: 0.5, duration: 500, easing: [0.27, 1.06, 0.18, 1], stiffness: 700 });
    expect(acmeSteps.motion.spring.expressive.bouncy(tanrei)).toEqual(acme.motion.spring.expressive.bouncy);
    expect(acmeSteps.motion.spring.expressive.bouncy(tanrei)).not.toEqual(acmeSteps.motion.spring.standard.bouncy(tanrei));
  });

  test('a release build is silent', () => {
    const dev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      expect(seriesStep(tanrei.space, 'space9999', 7, 'space')).toBe(7);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
    }
  });

  test('only own properties count', () => {
    expect(seriesStep(tanrei.space, 'constructor', 5, 'space')).toBe(5);
  });
});
