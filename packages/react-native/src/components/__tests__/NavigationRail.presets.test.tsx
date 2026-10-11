// The shipped presets drive the same NavigationRail with other values — "design systems differ in values, never in
// tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { NavigationRail } from '../NavigationRail';
import { FOUR, ID, part } from './destinations.shared';
import { navigationRailSubject } from './NavigationRail.subject';

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const mount = (system: TanreiSystem) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <NavigationRail testID={ID} accessibilityLabel="Main" destinations={FOUR} value="inbox" />
    </TanreiProvider>,
  );

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // Geometry at the tokens' own sizes (the Jest preset's window has fontScale 2).
  Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
settleMotion();
beforeEach(() => {
  // Every shipped preset draws a selected icon with the FILL axis of one variable font, which a <Text> cannot set: the
  // icon helper reports it once (README, "Icons"), covered in IconButton.test.tsx.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('every shipped system values the NavigationRail vocabulary', () => {
  describeSharedVocabulary(navigationRailSubject);
});

describe('m3-like drives the NavigationRail', () => {
  const system: TanreiSystem = m3Like;

  test('no edge; the indicator with full corners in secondary-container', async () => {
    await mount(system);
    expect(screen.queryByTestId(`${ID}.outline`, { includeHiddenElements: true })).toBeNull();
    expect(viewStyle(part(0, 'container')!).borderRadius).toBe(system.shape.full);
    expect(viewStyle(part(0, 'fill')!).backgroundColor).toBe(role(system, 'secondaryContainer'));
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the NavigationRail', () => {
  test('it inherits m3-like\'s rail (its 96 width waits for the fidelity reference: mimicry gap navigation-rail-expanded)', () => {
    expect(m3ExpressiveLike.components.navigationRail).toEqual(m3Like.components.navigationRail);
  });
});

describe('cupertino drives the NavigationRail', () => {
  const system: TanreiSystem = cupertino;

  test('no indicator — the selected icon and label in the tint; caption labels; the edge; dim', async () => {
    await mount(system);
    expect(part(0, 'fill')).toBeNull();
    expect(textStyle(part(0, 'icon.glyph')!).color).toBe(role(system, 'primary'));
    expect(textStyle(part(0, 'label')!)).toMatchObject({ color: role(system, 'primary'), fontSize: createTanreiTheme(system, 'light').text('caption').fontSize });
    expect(viewStyle(screen.getByTestId(`${ID}.outline`, { includeHiddenElements: true })).backgroundColor).toBe(role(system, 'outlineVariant'));
    expect(system.behavior.pressedFeedback).toBe('dim');
  });
});

describe('preset fixtures (light scheme)', () => {
  describeFixtureBaselines(navigationRailSubject, { systems: [m3Like, cupertino], fixtures: ['four-destinations'] });
});
