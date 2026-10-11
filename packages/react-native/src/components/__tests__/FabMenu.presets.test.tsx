// The shipped presets drive the same FabMenu with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE; a literal appears only where a
// preset's value is pinned on purpose.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { FabMenu, type FabMenuProps } from '../FabMenu';
import { fabMenuSubject } from './FabMenu.subject';

const ID = 'fab';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const toggle = () => screen.getByTestId(ID);
const item = (i: number) => screen.getByTestId(`${ID}.item.${i}`);
const mount = (system: TanreiSystem, props: Partial<FabMenuProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <FabMenu testID={ID} icon="add" accessibilityLabel="Create" inline items={[{ label: 'Document', icon: 'description' }, { label: 'Folder', icon: 'create_new_folder' }]} {...props} />
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

describe('every shipped system values the FabMenu vocabulary', () => {
  describeSharedVocabulary(fabMenuSubject);
});

describe('m3-like drives the FabMenu', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.fabMenu;

  test('as its FAB: toggles 40 / 56 / 96 with icons 24 / 24 / 36; items 56 tall at corner.full with 24 icons, heading-5 labels and 4 between them', async () => {
    expect(Object.values(tokens.sizes).map((each) => [each.containerSize, each.iconSize])).toEqual([
      [40, 24],
      [56, 24],
      [96, 36],
    ]);
    expect(tokens).toMatchObject({ itemHeight: 56, itemShape: system.shape.full, itemIconSize: 24, itemLabelTypescale: 'heading5', listGap: 4 });
    await mount(system, { visible: true });
    expect(viewStyle(item(0))).toMatchObject({ minHeight: 56, borderRadius: system.shape.full });
    expect(textStyle(screen.getByTestId(`${ID}.item.0.label`)).fontSize).toBe(createTanreiTheme(system, 'light').text('heading5').fontSize);
  });

  test('tonal in Material\'s primary set: closed and items on primary-container, open on primary', async () => {
    await mount(system, { variant: 'tonal', visible: true });
    expect(viewStyle(toggle()).backgroundColor).toBe(role(system, 'primary'));
    expect(viewStyle(item(0)).backgroundColor).toBe(role(system, 'primaryContainer'));
  });

  test('FBM-9: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the FabMenu', () => {
  test('it inherits m3-like\'s FAB menu', () => {
    expect(m3ExpressiveLike.components.fabMenu).toEqual(m3Like.components.fabMenu);
  });
});

describe('cupertino drives the FabMenu', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.fabMenu;

  test('a capsule toggle and capsule items (corner.full), body-large item labels, continuous corners', async () => {
    expect(Object.values(tokens.sizes).map((each) => each.containerShape)).toEqual([system.shape.full, system.shape.full, system.shape.full]);
    expect(tokens).toMatchObject({ itemShape: system.shape.full, itemLabelTypescale: 'bodyLarge' });
    await mount(system, { visible: true });
    expect(viewStyle(toggle())).toMatchObject({ borderRadius: tokens.sizes.medium.containerSize / 2, borderCurve: 'continuous' });
    expect(viewStyle(item(0)).borderCurve).toBe('continuous');
  });

  test('hover does not lift the toggle; a press dims it', async () => {
    const resting = tokens.variants.filled.enabled.containerElevation;
    expect(tokens.variants.filled.hovered.containerElevation).toBe(resting);
    await mount(system);
    const shadow = viewStyle(toggle()).boxShadow;
    await fireEvent(toggle(), 'hoverIn');
    expect(viewStyle(toggle()).boxShadow).toEqual(shadow);
    await fireEvent(toggle(), 'pressIn');
    expect(viewStyle(toggle()).opacity).toBe(tokens.pressedOpacity);
    await fireEvent(toggle(), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the open filled FAB menu, where the open toggle, its close
  // glyph, the items, their corners and elevation all show.
  describeFixtureBaselines(fabMenuSubject, { systems: [m3Like, cupertino], fixtures: ['filled-open'] });
});
