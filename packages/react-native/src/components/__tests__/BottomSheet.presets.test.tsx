// The shipped presets drive the same BottomSheet with other values — "design systems differ in values, never in
// tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions, View } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { BottomSheetSurface } from '../BottomSheet';
import { bottomSheetSubject } from './BottomSheet.subject';

const ID = 'sheet';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const part = (name: string) => screen.getByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const mount = (system: TanreiSystem) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <View style={{ width: 400, height: 720 }}>
        <BottomSheetSurface testID={ID} accessibilityLabel="Save photo" handleLabel="Resize sheet">
          Choose where to save the photo.
        </BottomSheetSurface>
      </View>
    </TanreiProvider>,
  );

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
settleMotion();

describe('every shipped system values the BottomSheet vocabulary', () => {
  describeSharedVocabulary(bottomSheetSubject);
});

describe('m3-like drives the BottomSheet', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.bottomSheet;

  test('corner.extra-large top corners, its level1 (a real shadow), an on-surface-variant grip; the rest as the default', async () => {
    expect(tokens).toMatchObject({ containerShape: system.shape.extraLarge, containerElevation: 'level1', containerMarginBlockStart: 48, handleGripWidth: 32, handleGripHeight: 4 });
    await mount(system);
    const elevation = createTanreiTheme(system, 'light').elevation('level1');
    expect(elevation.boxShadow.length).toBeGreaterThan(0);
    expect(viewStyle(part(''))).toMatchObject({ borderTopStartRadius: system.shape.extraLarge, backgroundColor: role(system, 'surfaceContainerLow'), boxShadow: elevation.boxShadow });
    expect(viewStyle(part('handle.grip')).backgroundColor).toBe(role(system, 'onSurfaceVariant'));
  });

  test('BSH-17: m3-like answers a press on the handle with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('cupertino drives the BottomSheet', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.bottomSheet;

  test('an Apple sheet — surface-container-lowest, corner.medium with the continuous corner, a 36 × 5 grabber in a 16 row with no margin (its hit area still the touch target); the grip keeps outline', async () => {
    expect(tokens).toMatchObject({ containerShape: system.shape.medium, handleGripWidth: 36, handleGripHeight: 5, handleContainerHeight: 16, handleMarginBlock: 0 });
    await mount(system);
    expect(viewStyle(part(''))).toMatchObject({ backgroundColor: role(system, 'surfaceContainerLowest'), borderTopStartRadius: system.shape.medium, borderCurve: 'continuous' });
    expect(viewStyle(part('handle.row')).marginVertical).toBe(0);
    expect(viewStyle(part('handle'))).toMatchObject({ height: 16, borderCurve: 'continuous' });
    expect(part('handle').props.hitSlop).toMatchObject({ top: (system.measure.target.touch - 16) / 2, bottom: (system.measure.target.touch - 16) / 2 });
    expect(viewStyle(part('handle.grip'))).toMatchObject({ width: 36, height: 5, backgroundColor: role(system, 'outline') });
  });

  test('BSH-17: cupertino answers a press on the handle by dimming it (dim, the pressed opacity below 1)', () => {
    expect(system.behavior.pressedFeedback).toBe('dim');
    expect(tokens.pressedOpacity).toBeLessThan(1);
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the modal sheet, where the scrim, the container, its corners and
  // elevation, the handle and the grip all show.
  describeFixtureBaselines(bottomSheetSubject, { systems: [m3Like, cupertino], fixtures: ['modal'] });
});
