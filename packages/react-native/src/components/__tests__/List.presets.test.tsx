// The shipped presets drive the same List with other values — "design systems differ in values, never in tokens" — with
// no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { List, type ListItem, type ListProps } from '../List';
import { listSubject } from './List.subject';

const ID = 'list';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const row = (i: number) => screen.getByTestId(`${ID}.item.${i}.row`);
const part = (i: number, name: string) => screen.queryByTestId(`${ID}.item.${i}.${name}`, { includeHiddenElements: true });
const noop = () => undefined;

const mount = (system: TanreiSystem, props: Partial<ListProps> & { items: ListItem[] }) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <List testID={ID} {...(props as ListProps)} />
    </TanreiProvider>,
  );
const options = (system: TanreiSystem) => mount(system, { items: [{ headline: 'Light', value: 'light', leadingIcon: 'light_mode' }, { headline: 'Dark', value: 'dark' }], selectionMode: 'single', value: 'light', accessibilityLabel: 'Theme' });

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

describe('every shipped system values the List vocabulary', () => {
  describeSharedVocabulary(listSubject);
});

describe('m3-like drives the List', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.list;

  test('rows of 56 / 72 / 88, 24 at the end, a gap of 16; headline body-large and supporting text body; icons 24 and images 56', async () => {
    expect([tokens.containerHeightOneLine, tokens.containerHeightTwoLine, tokens.containerHeightThreeLine]).toEqual([56, 72, 88]);
    expect(tokens).toMatchObject({ containerPaddingInlineEnd: 24, containerGap: 16, headlineTypescale: 'bodyLarge', supportingTextTypescale: 'body', overlineTypescale: 'labelSmall', trailingTextTypescale: 'labelSmall', leadingIconSize: 24, imageSize: 56 });
    await mount(system, { items: [{ headline: 'Wi-Fi', supportingText: 'Connected', leadingIcon: 'wifi', onPress: noop }] });
    expect(viewStyle(row(0))).toMatchObject({ minHeight: 72, paddingEnd: 24, gap: 16 });
    const theme = createTanreiTheme(system, 'light');
    expect(textStyle(part(0, 'headline')!).fontSize).toBe(theme.text('bodyLarge').fontSize);
    expect(textStyle(part(0, 'supporting-text')!).fontSize).toBe(theme.text('body').fontSize);
    expect(viewStyle(part(0, 'leading-icon')!)).toMatchObject({ width: 24, height: 24 });
  });

  test('a selected option: secondary-container with on-secondary-container text, as the default', async () => {
    await options(system);
    expect(viewStyle(row(0)).backgroundColor).toBe(role(system, 'secondaryContainer'));
    expect(textStyle(part(0, 'headline')!).color).toBe(role(system, 'onSecondaryContainer'));
  });

  test('LST-9: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the List', () => {
  test('it inherits m3-like\'s list, with no added condition', () => {
    const tokens = m3ExpressiveLike.components.list;
    expect(tokens).toEqual(m3Like.components.list);
    expect(Object.keys(tokens.conditions)).toEqual(['unselected', 'selected']);
  });
});

describe('cupertino drives the List', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.list;

  test('a one-line row of 44 (48 once it takes presses: the touch target), headline body-large (Apple\'s Body, 17)', async () => {
    expect(tokens.containerHeightOneLine).toBe(44);
    expect(tokens.headlineTypescale).toBe('bodyLarge');
    await mount(system, { items: [{ headline: 'Inbox' }, { headline: 'Wi-Fi', onPress: noop }] });
    expect(viewStyle(row(0)).minHeight).toBe(44);
    expect(viewStyle(row(1)).minHeight).toBe(system.measure.target.touch);
    expect(textStyle(part(0, 'headline')!).fontSize).toBe(createTanreiTheme(system, 'light').text('bodyLarge').fontSize);
  });

  test('a selected option has NO fill: the check in the tint shows it', async () => {
    expect(evaluatePaint(tokens.conditions.selected.enabled.containerColor, system.colors.light).a).toBe(0);
    await options(system);
    expect(viewStyle(row(0)).backgroundColor).toBeUndefined();
    const legs = part(0, 'check')!.children as ReturnType<typeof screen.getByTestId>[];
    for (const leg of legs) expect(viewStyle(leg).backgroundColor).toBe(role(system, 'primary'));
  });

  test('hover and keyboard focus draw the row at rest (no state layer); a press dims the row to 0.7 and keeps its colors', async () => {
    await mount(system, { items: [{ headline: 'Wi-Fi', onPress: noop }] });
    const resting = { ...viewStyle(row(0)) };
    await fireEvent(row(0), 'hoverIn');
    expect(viewStyle(row(0)).backgroundColor).toBe(resting.backgroundColor);
    await fireEvent(row(0), 'focus');
    expect(viewStyle(row(0)).backgroundColor).toBe(resting.backgroundColor);
    expect(tokens.pressedOpacity).toBe(0.7);
    await fireEvent(row(0), 'pressIn');
    expect(viewStyle(row(0))).toMatchObject({ opacity: 0.7, backgroundColor: resting.backgroundColor });
    await fireEvent(row(0), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
  });

  test('LST-10: the rows ease their corners by cupertino\'s smoothing (the OS curve)', async () => {
    await mount(system, { items: [{ headline: 'Wi-Fi', onPress: noop }] });
    expect(viewStyle(row(0)).borderCurve).toBe('continuous');
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the multiple-select list with icons and two lines, where
  // m3-like's larger rows and icons show — plus the single-select list, where cupertino differs most (no fill, a tinted check).
  describeFixtureBaselines(listSubject, { systems: [m3Like, cupertino], fixtures: ['multiple-selected', 'single-selected'] });
});
