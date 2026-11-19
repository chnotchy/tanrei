// The shipped presets drive the same SegmentedButton with other values — "design systems differ in values, never in
// tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { resolveElevation } from '../../theme/elevation';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { SegmentedButton, type Segment } from '../SegmentedButton';
import { segmentedButtonSubject } from './SegmentedButton.subject';

const ID = 'seg';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const seg = (i: number) => screen.getByTestId(`${ID}.segment.${i}`);
const part = (i: number, name: string) => screen.queryByTestId(`${ID}.segment.${i}.${name}`, { includeHiddenElements: true });
const setPart = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const ICONS: Segment[] = [
  { value: 'list', label: 'List', icon: 'view_list' },
  { value: 'grid', label: 'Grid', icon: 'grid_view' },
];
const mount = (system: TanreiSystem, size: 'small' | 'medium' | 'large' = 'medium') =>
  render(
    <TanreiProvider theme="light" system={system}>
      <SegmentedButton testID={ID} items={ICONS} value="grid" size={size} accessibilityLabel="View" />
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

describe('every shipped system values the SegmentedButton vocabulary', () => {
  describeSharedVocabulary(segmentedButtonSubject);
});

describe('m3-like drives the SegmentedButton', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.segmentedButton;

  test('Material\'s outlined segmented button: a full pill, heights 32 / 40 / 48, padding 12 at every size, icons and the check 18', async () => {
    expect(tokens.setShape).toBe(system.shape.full);
    expect(Object.values(tokens.sizes).map((each) => [each.containerHeight, each.containerPaddingInline, each.iconSize, each.checkSize])).toEqual([
      [32, 12, 18, 18],
      [40, 12, 18, 18],
      [48, 12, 18, 18],
    ]);
    await mount(system);
    expect(viewStyle(screen.getByTestId(ID))).toMatchObject({ minHeight: 40, borderRadius: system.shape.full });
    expect(viewStyle(part(1, 'check')!).width).toBe(18);
    expect(viewStyle(part(0, 'icon')!).width).toBe(18);
  });

  test('the selected segment on secondary-container with its check; unselected icons on-surface', async () => {
    await mount(system);
    expect(viewStyle(seg(1)).backgroundColor).toBe(role(system, 'secondaryContainer'));
    expect(textStyle(part(1, 'check.glyph')!).color).toBe(role(system, 'onSecondaryContainer'));
    expect(textStyle(part(0, 'icon.glyph')!).color).toBe(role(system, 'onSurface'));
    expect(viewStyle(setPart('outline')!).borderColor).toBe(role(system, 'outline'));
  });

  test('SEG-10: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('cupertino drives the SegmentedButton', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.segmentedButton;

  test('Apple\'s segmented control as values: a surface-container-high track 2 in, no border, outline-variant dividers, heights 28 / 32 / 40', async () => {
    expect(Object.values(tokens.sizes).map((each) => each.containerHeight)).toEqual([28, 32, 40]);
    await mount(system);
    expect(viewStyle(screen.getByTestId(ID))).toMatchObject({ padding: 2, backgroundColor: role(system, 'surfaceContainerHigh'), borderRadius: system.shape.small });
    expect(setPart('outline')).toBeNull();
    expect(viewStyle(setPart('divider.0')!).backgroundColor).toBe(role(system, 'outlineVariant'));
  });

  test('SEG-16 / SEG-24: no check (check size 0); the selection is surface-bright, lifted at cupertino\'s level1, with on-surface content', async () => {
    await mount(system);
    expect(part(1, 'check')).toBeNull();
    expect(part(1, 'icon')).not.toBeNull();
    expect(viewStyle(seg(1))).toMatchObject({ backgroundColor: role(system, 'surfaceBright'), boxShadow: resolveElevation(system.elevation.level1, (name) => role(system, name)).boxShadow, zIndex: 1 });
    expect(textStyle(part(1, 'label')!).color).toBe(role(system, 'onSurface'));
    expect(textStyle(part(0, 'icon.glyph')!).color).toBe(role(system, 'onSurface'));
  });

  test('label-small titles at small and medium, body-subhead at large', () => {
    expect(Object.values(tokens.sizes).map((each) => each.labelTypescale)).toEqual(['labelSmall', 'labelSmall', 'bodySubhead']);
  });

  test('hover draws the segment at rest (no state layer); a press dims it to its pressed opacity and keeps its colors; a disabled selected segment keeps its raised fill', async () => {
    const view = await mount(system);
    const resting = viewStyle(seg(0)).backgroundColor;
    await fireEvent(seg(0), 'hoverIn');
    expect(viewStyle(seg(0)).backgroundColor).toBe(resting);
    await fireEvent(seg(0), 'pressIn');
    expect(viewStyle(seg(0))).toMatchObject({ opacity: tokens.pressedOpacity, backgroundColor: resting });
    await fireEvent(seg(0), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
    await view.rerender(
      <TanreiProvider theme="light" system={system}>
        <SegmentedButton testID={ID} items={[ICONS[0]!, { ...ICONS[1]!, disabled: true }]} value="grid" accessibilityLabel="View" />
      </TanreiProvider>,
    );
    expect(viewStyle(seg(1)).backgroundColor).toBe(role(system, 'surfaceBright'));
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the icons set, where the selected look, the check (or its
  // absence), the icons, the dividers, the set's corners and cupertino's raised selection all show.
  describeFixtureBaselines(segmentedButtonSubject, { systems: [m3Like, cupertino], fixtures: ['icons'] });
});
