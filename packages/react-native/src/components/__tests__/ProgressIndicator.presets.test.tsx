// The shipped presets drive the same ProgressIndicator with other values — "design systems differ in values, never in
// tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, viewStyle, type Instance } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { ProgressIndicator, type ProgressIndicatorProps } from '../ProgressIndicator';
import { progressIndicatorSubject } from './ProgressIndicator.subject';

const ID = 'progress';
const sizes = ['small', 'medium', 'large'] as const;
const host = () => screen.getByTestId(ID);
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor(system.colors.light[name]!);
const mount = (system: TanreiSystem, props: Partial<ProgressIndicatorProps>) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <ProgressIndicator testID={ID} accessibilityLabel="Uploading" {...props} />
    </TanreiProvider>,
  );

settleMotion();

describe('every shipped system values the ProgressIndicator vocabulary', () => {
  describeSharedVocabulary(progressIndicatorSubject);
});

describe.each([
  ['m3-like', m3Like],
  ['m3-expressive-like', m3ExpressiveLike],
] as const)('%s drives the ProgressIndicator', (_id, system) => {
  const tokens = system.components.progressIndicator;

  test('an indeterminate cycle of 1750 ms (dial.motion.unit × 35)', () => {
    expect(tokens.motionCycleDuration).toBe(1750);
  });

  test('one bar thickness of 4; rings of 24 / 40 / 48 with a stroke of 4', () => {
    expect(sizes.map((size) => tokens.sizes[size].linearThickness)).toEqual([4, 4, 4]);
    expect(sizes.map((size) => tokens.sizes[size].circularSize)).toEqual([24, 40, 48]);
    expect(sizes.map((size) => tokens.sizes[size].circularThickness)).toEqual([4, 4, 4]);
  });

  test('Material\'s current bar: primary on secondary-container, a gap of 4 after the indicator and a stop indicator of 4 at the end', async () => {
    await mount(system, { value: 0.4 });
    expect(viewStyle(part('indicator')!)).toMatchObject({ width: '40%', backgroundColor: role(system, 'primary') });
    expect(viewStyle(part('track')!)).toMatchObject({ marginStart: 4, flex: 1, backgroundColor: role(system, 'secondaryContainer') });
    expect(viewStyle(part('stop-indicator')!)).toMatchObject({ width: 4, height: 4, top: 0, end: 0, backgroundColor: role(system, 'primary') });
  });

  test('its ring leaves the gap at both ends of the indicator, and draws round caps', async () => {
    await mount(system, { value: 0.4, variant: 'circular' });
    expect(viewStyle(host())).toMatchObject({ width: 40, height: 40 });
    expect(part('track.first')).not.toBeNull();
    expect(part('indicator.end-cap')).not.toBeNull();
  });
});

describe('cupertino drives the ProgressIndicator', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.progressIndicator;

  test('bars 4 thick at every size; rings of 16 / 20 / 36 with a stroke of 2; the tint on the gray fill; no gap, no stop', async () => {
    expect(sizes.map((size) => tokens.sizes[size].linearThickness)).toEqual([4, 4, 4]);
    expect(sizes.map((size) => tokens.sizes[size].circularSize)).toEqual([16, 20, 36]);
    expect([tokens.trackGap, tokens.stopIndicatorSize]).toEqual([0, 0]);
    await mount(system, { value: 0.4 });
    expect(viewStyle(part('track')!)).toMatchObject({ position: 'absolute', backgroundColor: role(system, 'surfaceVariant') });
    expect(viewStyle(part('indicator')!)).toMatchObject({ backgroundColor: role(system, 'primary') });
    expect(part('stop-indicator')).toBeNull();
    // …and those are this system's values, not the default system's.
    expect(tokens.sizes.medium.circularSize).not.toBe(tanrei.components.progressIndicator.sizes.medium.circularSize);
  });

  test('its medium ring is 20 square', async () => {
    await mount(system, { value: 0.4, variant: 'circular' });
    expect(viewStyle(host())).toMatchObject({ width: 20, height: 20 });
    expect(viewStyle(part('track')!.children[0] as Instance)).toMatchObject({ borderWidth: 2, borderColor: role(system, 'surfaceVariant') });
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the determinate bar and ring, where m3-like's gap and stop
  // indicator and cupertino's sizes show.
  describeFixtureBaselines(progressIndicatorSubject, { systems: [m3Like, cupertino], fixtures: ['linear-determinate', 'circular-determinate'] });
});
