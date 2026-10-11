// The shipped presets drive the same NavigationBar with other values — "design systems differ in values, never in
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
import { NavigationBar } from '../NavigationBar';
import { FOUR, ID, cell, part } from './destinations.shared';
import { navigationBarSubject } from './NavigationBar.subject';

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const mount = (system: TanreiSystem) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <NavigationBar testID={ID} accessibilityLabel="Main" destinations={FOUR} value="inbox" />
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

describe('every shipped system values the NavigationBar vocabulary', () => {
  describeSharedVocabulary(navigationBarSubject);
});

describe('m3-like drives the NavigationBar', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.navigationBar;

  test('surface-container with no edge, 80 high; a 64 × 32 indicator with full corners in secondary-container', async () => {
    expect(tokens).toMatchObject({ containerHeight: 80, itemContainerWidth: 64, itemContainerHeight: 32 });
    await mount(system);
    expect(viewStyle(screen.getByTestId(ID))).toMatchObject({ minHeight: 80, backgroundColor: role(system, 'surfaceContainer') });
    expect(screen.queryByTestId(`${ID}.outline`, { includeHiddenElements: true })).toBeNull();
    expect(viewStyle(part(0, 'container')!)).toMatchObject({ width: 64, height: 32, borderRadius: system.shape.full });
    expect(viewStyle(part(0, 'fill')!).backgroundColor).toBe(role(system, 'secondaryContainer'));
  });

  test('NVB-9: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the NavigationBar', () => {
  test('it inherits m3-like\'s navigation bar', () => {
    expect(m3ExpressiveLike.components.navigationBar).toEqual(m3Like.components.navigationBar);
  });
});

describe('cupertino drives the NavigationBar', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.navigationBar;

  test('49 high on surface-container-low with the edge; no indicator — the selected icon and label in the tint; caption labels 2 below the icon', async () => {
    expect(tokens).toMatchObject({ containerHeight: 49, itemGap: 2, itemLabelTypescale: 'caption' });
    await mount(system);
    expect(viewStyle(screen.getByTestId(ID))).toMatchObject({ minHeight: 49, backgroundColor: role(system, 'surfaceContainerLow') });
    expect(viewStyle(screen.getByTestId(`${ID}.outline`, { includeHiddenElements: true })).backgroundColor).toBe(role(system, 'outlineVariant'));
    expect(part(0, 'fill')).toBeNull();
    expect(textStyle(part(0, 'icon.glyph')!).color).toBe(role(system, 'primary'));
    expect(textStyle(part(0, 'label')!)).toMatchObject({ color: role(system, 'primary'), fontSize: createTanreiTheme(system, 'light').text('caption').fontSize });
    expect(viewStyle(part(0, 'label-slot')!).paddingTop).toBe(2);
    expect(textStyle(part(1, 'label')!).color).toBe(role(system, 'onSurfaceVariant'));
  });

  test('NVB-9: cupertino answers a press by dimming the whole destination', () => {
    expect(system.behavior.pressedFeedback).toBe('dim');
    expect(tokens.pressedOpacity).toBeLessThan(1);
  });

  test('NVB-10: its item containers ease their corners continuously', async () => {
    await mount(system);
    expect(viewStyle(part(1, 'container')!).borderCurve).toBe('continuous');
    expect(cell(1).props.role).toBe('tab');
  });
});

describe('preset fixtures (light scheme)', () => {
  describeFixtureBaselines(navigationBarSubject, { systems: [m3Like, cupertino], fixtures: ['four-destinations', 'badges'] });
});
