// The shipped presets drive the same DatePicker with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions, View } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { DatePickerSurface, type DatePickerSurfaceProps } from '../DatePicker';
import { datePickerSubject } from './DatePicker.subject';

const ID = 'dp';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const q = (name: string) => screen.queryByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const mount = (system: TanreiSystem, props: Partial<DatePickerSurfaceProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <View style={{ width: 480, height: 640 }}>
        <DatePickerSurface testID={ID} today="2026-09-24" locale="en-US" mode="range" start="2026-09-10" end="2026-09-16" {...props} />
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

describe('every shipped system values the DatePicker vocabulary', () => {
  describeSharedVocabulary(datePickerSubject);
});

describe('m3-like drives the DatePicker', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.datePicker;

  test('round 40 days (corner.full), years and view toggle; body-large text; the band secondary-container with on-secondary-container; surface-container-high surfaces at level3; the header value heading-1 in on-surface-variant', async () => {
    expect(tokens).toMatchObject({ dayContainerSize: 40, dayContainerShape: system.shape.full, yearContainerShape: system.shape.full, viewToggleContainerShape: system.shape.full, dayLabelTypescale: 'bodyLarge', weekdayTypescale: 'bodyLarge', headerValueTypescale: 'heading1', modalContainerShape: system.shape.extraLarge, dockedContainerShape: system.shape.large, dockedContainerElevation: 'level3' });
    await mount(system);
    const theme = createTanreiTheme(system, 'light');
    expect(viewStyle(q('')!)).toMatchObject({ backgroundColor: role(system, 'surfaceContainerHigh'), borderRadius: tokens.modalContainerShape, boxShadow: theme.elevation('level3').boxShadow });
    expect(viewStyle(q('day.2026-09-10.container')!)).toMatchObject({ minWidth: 40, minHeight: 40, borderRadius: system.shape.full, backgroundColor: role(system, 'primary') });
    expect(viewStyle(q('day.2026-09-12.track')!).backgroundColor).toBe(role(system, 'secondaryContainer'));
    expect(textStyle(q('day.2026-09-12.label')!).color).toBe(role(system, 'onSecondaryContainer'));
    expect(textStyle(q('header.value')!)).toMatchObject({ color: role(system, 'onSurfaceVariant'), fontSize: theme.text('heading1').fontSize });
    expect(textStyle((q('weekday.0')!.children as never[])[0]!)).toMatchObject({ color: role(system, 'onSurface'), fontSize: theme.text('bodyLarge').fontSize });
    // Selected and today as the default draws them: primary, and a 1 primary ring.
    expect(system.components.datePicker.conditions.selected.enabled).toEqual(tanrei.components.datePicker.conditions.selected.enabled);
    expect(viewStyle(q('day.2026-09-24.outline')!)).toMatchObject({ borderColor: role(system, 'primary'), borderWidth: 1 });
  });

  test('ripple is its pressed feedback (DTP-34)', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('cupertino drives the DatePicker', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.datePicker;

  test('tinted 40 circles for the chosen days (primary-container with on-primary-container); today without a ring in the tint; the band surface-container-highest; the month title heading-5; continuous corners', async () => {
    expect(tokens).toMatchObject({ dayContainerSize: 40, dayContainerShape: system.shape.full, yearContainerShape: system.shape.full, viewToggleLabelTypescale: 'heading5' });
    await mount(system);
    expect(viewStyle(q('day.2026-09-10.container')!)).toMatchObject({ backgroundColor: role(system, 'primaryContainer'), borderCurve: 'continuous' });
    expect(textStyle(q('day.2026-09-10.label')!).color).toBe(role(system, 'onPrimaryContainer'));
    expect(q('day.2026-09-24.outline')).toBeNull();
    expect(textStyle(q('day.2026-09-24.label')!).color).toBe(role(system, 'primary'));
    expect(viewStyle(q('day.2026-09-12.track')!).backgroundColor).toBe(role(system, 'surfaceContainerHighest'));
    expect(textStyle(q('view-toggle.label')!).fontSize).toBe(createTanreiTheme(system, 'light').text('heading5').fontSize);
    expect(viewStyle(q('')!).borderCurve).toBe('continuous');
  });

  test('an unavailable today keeps no ring (its disabled outline is the transparent resting one); dim is its pressed feedback, with its pressed opacity', async () => {
    expect(system.behavior.pressedFeedback).toBe('dim');
    expect(tokens.pressedOpacity).toBeLessThan(1);
    await mount(system, { mode: 'single', start: undefined, end: undefined, max: '2026-09-20' });
    expect(q('day.2026-09-24.outline')).toBeNull();
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — a modal range, where the scrim, the surface, the header, the
  // selected start and end, the band, today's mark and the actions all show.
  describeFixtureBaselines(datePickerSubject, { systems: [m3Like, cupertino], fixtures: ['modal-range'] });
});
