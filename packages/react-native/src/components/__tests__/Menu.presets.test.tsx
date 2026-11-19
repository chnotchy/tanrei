// The shipped presets drive the same Menu with other values — "design systems differ in values, never in tokens" — with
// no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { resolveElevation } from '../../theme/elevation';
import { formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { Menu, type MenuEntry } from '../Menu';
import { menuSubject } from './Menu.subject';

const ID = 'menu';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const surface = () => screen.getByTestId(ID);
const row = (i: number) => screen.getByTestId(`${ID}.item.${i}`);
const part = (i: number, name: string) => screen.queryByTestId(`${ID}.item.${i}.${name}`, { includeHiddenElements: true });
const ITEMS: MenuEntry[] = [
  { kind: 'group', items: [{ label: 'Cut', leadingIcon: 'content_cut' }, { label: 'Copy', leadingIcon: 'content_copy' }] },
  { kind: 'group', items: [{ label: 'Delete', leadingIcon: 'delete', destructive: true }] },
];
const mount = (system: TanreiSystem, items: MenuEntry[] = ITEMS) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Menu testID={ID} visible inline items={items} />
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

describe('every shipped system values the Menu vocabulary', () => {
  describeSharedVocabulary(menuSubject);
});

describe('m3-like drives the Menu', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.menu;

  test('surface-container at corner.extra-small and level2, padded 8 above and below and 0 at the sides, 112 to 280 wide', async () => {
    expect(tokens).toMatchObject({ surfaceShape: system.shape.extraSmall, surfaceElevation: 'level2', surfacePaddingBlock: 8, surfacePaddingInline: 0, surfaceMinWidth: 112, surfaceMaxWidth: 280 });
    await mount(system);
    expect(viewStyle(surface())).toMatchObject({ backgroundColor: role(system, 'surfaceContainer'), borderRadius: system.shape.extraSmall, minWidth: 112, maxWidth: 280 });
    expect(viewStyle(surface()).boxShadow).toEqual(resolveElevation(system.elevation.level2, (name) => role(system, name)).boxShadow);
  });

  test('rows 48 tall with square corners and 24 icons; 8 of space around the divider', async () => {
    expect(tokens).toMatchObject({ containerHeight: 48, containerShape: 0, leadingIconSize: 24, dividerSpace: 8 });
    await mount(system);
    expect(viewStyle(row(0))).toMatchObject({ minHeight: 48, borderRadius: 0 });
    expect(viewStyle(part(0, 'leading-icon')!)).toMatchObject({ width: 24, height: 24 });
    expect(viewStyle(screen.getByTestId(`${ID}.divider.1`)).marginVertical).toBe(8);
  });

  test('MNU-16: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });

  test('it adds no Menu condition', () => {
    const tokens = m3Like.components.menu;
    expect(Object.keys(tokens.conditions)).toEqual(Object.keys(tanrei.components.menu.conditions));
  });
});

describe('cupertino drives the Menu', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.menu;

  test('surface-container-lowest at corner.extra-large with the continuous corner; labels in body-large (Apple\'s Body, 17)', async () => {
    expect(tokens.surfaceShape).toBe(system.shape.extraLarge);
    expect(tokens.labelTypescale).toBe('bodyLarge');
    await mount(system);
    expect(viewStyle(surface())).toMatchObject({ backgroundColor: role(system, 'surfaceContainerLowest'), borderRadius: system.shape.extraLarge, borderCurve: 'continuous' });
    expect(textStyle(part(0, 'label')!).fontSize).toBe(createTanreiTheme(system, 'light').text('bodyLarge').fontSize);
  });

  test('groups are separated by an 8 band of surface-container-high with no space around it', async () => {
    expect(tokens).toMatchObject({ dividerThickness: 8, dividerSpace: 0 });
    await mount(system);
    expect(viewStyle(screen.getByTestId(`${ID}.divider.1`))).toEqual({ height: 8, marginVertical: 0, backgroundColor: role(system, 'surfaceContainerHigh') });
  });

  test('a checked item shows the check in the tint; destructive is red', async () => {
    await mount(system, [{ kind: 'checkbox-item', label: 'Show grid', checked: true }, { label: 'Delete', destructive: true }]);
    for (const leg of part(0, 'check')!.children as ReturnType<typeof screen.getByTestId>[]) expect(viewStyle(leg).backgroundColor).toBe(role(system, 'primary'));
    expect(textStyle(part(1, 'label')!).color).toBe(role(system, 'error'));
  });

  test('hover draws the row at rest (no state layer); a press dims the row to 0.7 and keeps its colors', async () => {
    await mount(system);
    const resting = viewStyle(row(0)).backgroundColor;
    await fireEvent(row(0), 'hoverIn');
    expect(viewStyle(row(0)).backgroundColor).toBe(resting);
    expect(tokens.pressedOpacity).toBe(0.7);
    await fireEvent(row(0), 'pressIn');
    expect(viewStyle(row(0))).toMatchObject({ opacity: 0.7, backgroundColor: resting });
    await fireEvent(row(0), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — titled groups of checkbox and radio items, where the surface,
  // the rows, the title and the divider all show — plus the destructive menu with icons.
  describeFixtureBaselines(menuSubject, { systems: [m3Like, cupertino], fixtures: ['group-titles', 'destructive'] });
});
