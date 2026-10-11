// The shipped presets drive the same SplitButton with other values — "design systems differ in values, never in
// tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE; a literal appears only where
// a preset's value is pinned on purpose.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { SplitButton, type SplitButtonProps } from '../SplitButton';
import { splitButtonSubject } from './SplitButton.subject';

const ID = 'split';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const half = (which: 'leading' | 'trailing') => screen.getByTestId(`${ID}.${which}`);
const mount = (system: TanreiSystem, props: Partial<SplitButtonProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <SplitButton testID={ID} label="Save" menuAccessibilityLabel="More save options" menuItems={[{ label: 'Save as…' }]} {...props} />
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
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('every shipped system values the SplitButton vocabulary', () => {
  describeSharedVocabulary(splitButtonSubject);
});

describe('m3-like drives the SplitButton', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.splitButton;

  test('restating its Button: full outer corners, 4 at the join (full again on the open trailing half), heights 32 / 40 / 56, icons 18 / 18 / 24', async () => {
    expect(tokens).toMatchObject({ containerShape: system.shape.full, containerInnerShape: 4, containerInnerShapeOpen: system.shape.full });
    expect(Object.values(tokens.sizes).map((each) => [each.containerHeight, each.iconSize])).toEqual([
      [32, 18],
      [40, 18],
      [56, 24],
    ]);
    await mount(system);
    expect(viewStyle(half('leading'))).toMatchObject({ borderTopStartRadius: system.shape.full, borderTopEndRadius: 4, minHeight: 40 });
  });

  test('the elevated variant on surface-container-low with primary labels, lifted to level2 on hover', async () => {
    expect(tokens.variants.elevated.hovered.containerElevation).toBe('level2');
    await mount(system, { variant: 'elevated' });
    expect(viewStyle(half('leading')).backgroundColor).toBe(role(system, 'surfaceContainerLow'));
    expect(textStyle(screen.getByTestId(`${ID}.leading.label`)).color).toBe(role(system, 'primary'));
  });

  test('SPB-10: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the SplitButton', () => {
  test('it inherits m3-like\'s split button', () => {
    expect(m3ExpressiveLike.components.splitButton).toEqual(m3Like.components.splitButton);
  });
});

describe('cupertino drives the SplitButton', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.splitButton;

  test('restating its Button: corner.medium, heights 28 / 34 / 50, tinted labels on the tonal variant, continuous corners', async () => {
    expect(tokens.containerShape).toBe(system.shape.medium);
    expect(Object.values(tokens.sizes).map((each) => each.containerHeight)).toEqual([28, 34, 50]);
    await mount(system, { variant: 'tonal' });
    expect(textStyle(screen.getByTestId(`${ID}.leading.label`)).color).toBe(role(system, 'primary'));
    expect(viewStyle(half('trailing')).borderCurve).toBe('continuous');
  });

  test('a press dims the pressed half and keeps its colors', async () => {
    await mount(system);
    const resting = viewStyle(half('leading')).backgroundColor;
    await fireEvent(half('leading'), 'pressIn');
    expect(viewStyle(half('leading'))).toMatchObject({ opacity: tokens.pressedOpacity, backgroundColor: resting });
    await fireEvent(half('leading'), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the open filled split button, where both halves, their outer
  // and inner corners, the open trailing half's corners and the turned chevron show.
  describeFixtureBaselines(splitButtonSubject, { systems: [m3Like, cupertino], fixtures: ['filled-open'] });
});
