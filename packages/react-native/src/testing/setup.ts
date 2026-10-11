import { toMatchFixtureSnapshot } from './fixtureSnapshot';

expect.extend({ toMatchFixtureSnapshot });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      /** Compare a `toJSON()` render tree with `__snapshots__/<component>/<fixtureId>.json`. */
      toMatchFixtureSnapshot(component: string, fixtureId: string): R;
    }
  }
}
