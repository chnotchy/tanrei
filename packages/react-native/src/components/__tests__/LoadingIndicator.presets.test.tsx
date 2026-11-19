// The shipped presets drive the same LoadingIndicator with other values — "design systems differ in values, never in
// tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, viewStyle, type Instance } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { LoadingIndicator, type LoadingIndicatorProps } from '../LoadingIndicator';
import { loadingIndicatorSubject } from './LoadingIndicator.subject';

const ID = 'loading';
const sizes = ['small', 'medium', 'large'] as const;
const host = () => screen.getByTestId(ID);
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
/** Reduced motion is on in these tests: the arc is the whole circle, one bordered view. */
const circle = () => viewStyle(part('indicator')!.children[0] as Instance);
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor(system.colors.light[name]!);
const mount = (system: TanreiSystem, props: Partial<LoadingIndicatorProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <LoadingIndicator testID={ID} accessibilityLabel="Loading" {...props} />
    </TanreiProvider>,
  );

settleMotion();

describe('every shipped system values the LoadingIndicator vocabulary', () => {
  describeSharedVocabulary(loadingIndicatorSubject);
});

describe('m3-like drives the LoadingIndicator', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.loadingIndicator;

  test('Material\'s ring stands in: 24 / 38 / 48 with a stroke of 4, in primary', async () => {
    expect(sizes.map((size) => tokens.sizes[size].indicatorSize)).toEqual([24, 38, 48]);
    expect(sizes.map((size) => tokens.sizes[size].indicatorThickness)).toEqual([4, 4, 4]);
    await mount(system);
    expect(viewStyle(host())).toMatchObject({ width: 38, height: 38 });
    expect(circle()).toMatchObject({ borderWidth: 4, borderColor: role(system, 'primary') });
  });

  test('contained, each mark sits inside its circle: 24 in 32, 38 in 48, 48 in 56', async () => {
    expect(sizes.map((size) => tokens.sizes[size].containerSize)).toEqual([32, 48, 56]);
    for (const size of sizes) expect(tokens.sizes[size].containerSize).toBeGreaterThan(tokens.sizes[size].indicatorSize);
  });

  test('contained: a 38 mark on a flat 48 primary-container circle, in on-primary-container', async () => {
    expect([tokens.sizes.medium.indicatorSize, tokens.sizes.medium.containerSize]).toEqual([38, 48]);
    expect(tokens.containedContainerElevation).toBe('level0');
    await mount(system, { contained: true });
    expect(viewStyle(host())).toMatchObject({ width: 48, height: 48, backgroundColor: role(system, 'primaryContainer') });
    // sys.elevation.level0: no shadow, no ring.
    expect(viewStyle(host()).boxShadow).toBeUndefined();
    expect(part('elevation-ring')).toBeNull();
    expect(viewStyle(part('motion')!)).toMatchObject({ width: 38, height: 38 });
    expect(circle()).toMatchObject({ borderColor: role(system, 'onPrimaryContainer') });
  });
});

describe('cupertino drives the LoadingIndicator', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.loadingIndicator;

  test('16 / 20 / 36 in on-surface-variant (Apple\'s spinner is gray, not tinted); it draws the arc until a loading form exists', async () => {
    expect(sizes.map((size) => tokens.sizes[size].indicatorSize)).toEqual([16, 20, 36]);
    await mount(system);
    expect(viewStyle(host())).toMatchObject({ width: 20, height: 20 });
    expect(circle()).toMatchObject({ borderColor: role(system, 'onSurfaceVariant') });
    expect(tokens.sizes.medium.indicatorSize).not.toBe(tanrei.components.loadingIndicator.sizes.medium.indicatorSize);
  });

  test('its contained circle takes the continuous corner (corner smoothing above 0)', async () => {
    await mount(system, { contained: true });
    expect(viewStyle(host()).borderCurve).toBe('continuous');
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the inline mark and the contained one, where sizes and the
  // container's color and elevation differ most.
  describeFixtureBaselines(loadingIndicatorSubject, { systems: [m3Like, cupertino], fixtures: ['medium', 'contained-medium'] });
});
