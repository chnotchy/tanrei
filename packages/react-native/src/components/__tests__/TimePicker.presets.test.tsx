// The shipped presets drive the same TimePicker with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions, View } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { TimePickerSurface, type TimePickerSurfaceProps } from '../TimePicker';
import { timePickerSubject } from './TimePicker.subject';

const ID = 'tp';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const q = (name: string) => screen.queryByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const mount = (system: TanreiSystem, props: Partial<TimePickerSurfaceProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <View style={{ width: 480, height: 640 }}>
        <TimePickerSurface testID={ID} value="07:30" hourCycle="h12" locale="en-US" {...props} />
      </View>
    </TanreiProvider>,
  );

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
settleMotion();

describe('every shipped system values the TimePicker vocabulary', () => {
  describeSharedVocabulary(timePickerSubject);
});

describe('m3-like drives the TimePicker', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.timePicker;

  test('a surface-container-high surface at level3 with corner.extra-large; the label label-small; 96 × 80 selectors in display-large with corner.small, surface-container-highest, the selected one primary-container with on-primary-container and no edge', async () => {
    expect(tokens).toMatchObject({ containerShape: system.shape.extraLarge, containerElevation: 'level3', headerLabelTypescale: 'labelSmall', selectorContainerWidth: 96, selectorContainerHeight: 80, selectorContainerShape: system.shape.small, selectorLabelTypescale: 'displayLarge', separatorTypescale: 'displayLarge' });
    await mount(system);
    const theme = createTanreiTheme(system, 'light');
    expect(viewStyle(q('')!)).toMatchObject({ backgroundColor: role(system, 'surfaceContainerHigh'), borderRadius: system.shape.extraLarge, boxShadow: theme.elevation('level3').boxShadow });
    expect(textStyle(q('label')!).fontSize).toBe(theme.text('labelSmall').fontSize);
    expect(viewStyle(q('hour')!)).toMatchObject({ minWidth: 96, minHeight: 80, borderRadius: system.shape.small, backgroundColor: role(system, 'primaryContainer') });
    expect(textStyle(q('hour.label')!)).toMatchObject({ color: role(system, 'onPrimaryContainer'), fontSize: theme.text('displayLarge').fontSize });
    // The selected selector has no edge: a transparent outline draws nothing.
    expect(q('hour.outline')).toBeNull();
    expect(viewStyle(q('minute')!).backgroundColor).toBe(role(system, 'surfaceContainerHighest'));
    expect(textStyle(q('separator')!).fontSize).toBe(theme.text('displayLarge').fontSize);
  });

  test('period segments 52 wide in heading-5 with corner.small, the chosen one tertiary-container with on-tertiary-container; a 256 surface-container-highest dial with a 48 handle; the track and the centre dot as the default\'s', async () => {
    expect(tokens).toMatchObject({ periodContainerWidth: 52, periodContainerShape: system.shape.small, periodLabelTypescale: 'heading5', dialContainerSize: 256, dialHandleSize: 48 });
    expect({ track: tokens.dialTrackWidth, center: tokens.dialCenterSize }).toEqual({ track: tanrei.components.timePicker.dialTrackWidth, center: tanrei.components.timePicker.dialCenterSize });
    await mount(system);
    const theme = createTanreiTheme(system, 'light');
    expect(viewStyle(q('period.0')!)).toMatchObject({ minWidth: 52, backgroundColor: role(system, 'tertiaryContainer'), borderTopStartRadius: system.shape.small });
    expect(textStyle(q('period.0.label')!)).toMatchObject({ color: role(system, 'onTertiaryContainer'), fontSize: theme.text('heading5').fontSize });
    expect(viewStyle(q('dial')!)).toMatchObject({ width: 256, height: 256, backgroundColor: role(system, 'surfaceContainerHighest') });
    expect(viewStyle(q('dial.handle')!)).toMatchObject({ width: 48, height: 48, backgroundColor: role(system, 'primary') });
  });

  test('ripple is its pressed feedback (TMP-20)', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the TimePicker', () => {
  test('it inherits m3-like\'s time picker', () => {
    expect(m3ExpressiveLike.components.timePicker).toEqual(m3Like.components.timePicker);
  });
});

describe('cupertino drives the TimePicker', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.timePicker;

  test('the selectors and the dial\'s face surface-container-highest in both conditions; the selected selector keeps the 2 primary edge and an on-surface number; the chosen period a primary fill; continuous corners', async () => {
    await mount(system);
    expect(viewStyle(q('hour')!)).toMatchObject({ backgroundColor: role(system, 'surfaceContainerHighest'), borderCurve: 'continuous' });
    expect(viewStyle(q('minute')!).backgroundColor).toBe(role(system, 'surfaceContainerHighest'));
    expect(viewStyle(q('hour.outline')!)).toMatchObject({ borderColor: role(system, 'primary'), borderWidth: 2 });
    expect(textStyle(q('hour.label')!).color).toBe(role(system, 'onSurface'));
    expect(viewStyle(q('dial')!).backgroundColor).toBe(role(system, 'surfaceContainerHighest'));
    expect(viewStyle(q('period.0')!).backgroundColor).toBe(role(system, 'primary'));
    expect(textStyle(q('period.0.label')!).color).toBe(role(system, 'onPrimary'));
    expect(viewStyle(q('')!).borderCurve).toBe('continuous');
    expect(viewStyle(q('')!).borderRadius).toBe(tokens.containerShape);
  });

  test('dim is its pressed feedback, with its pressed opacity (TMP-20)', () => {
    expect(system.behavior.pressedFeedback).toBe('dim');
    expect(tokens.pressedOpacity).toBeLessThan(1);
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the hour dial with the 12-hour clock, where the scrim, the
  // surface, both selector conditions, the separator, both period conditions, the dial, the handle and the actions show.
  describeFixtureBaselines(timePickerSubject, { systems: [m3Like, cupertino], fixtures: ['dial-hour'] });
});
