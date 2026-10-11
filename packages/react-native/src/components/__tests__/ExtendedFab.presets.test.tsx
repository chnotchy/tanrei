// The shipped presets drive the same ExtendedFloatingActionButton with other values — "design systems differ in values,
// never in tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE; a literal appears
// only where a preset's value is pinned on purpose.
import { act, fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiCoreExtendedFabVariant, TanreiSystem } from '../../generated/vocabulary';
import { SHIPPED_SYSTEMS, byTestID, describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { ExtendedFloatingActionButton, type ExtendedFloatingActionButtonProps } from '../ExtendedFab';
import { extendedFabSubject } from './ExtendedFab.subject';

const ID = 'efab';
const variants: TanreiCoreExtendedFabVariant[] = ['filled', 'tonal', 'surface'];
const sizes = ['small', 'medium', 'large'] as const;
const { host, part } = byTestID(ID);

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);

const mount = (system: TanreiSystem, props: Partial<ExtendedFloatingActionButtonProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <ExtendedFloatingActionButton testID={ID} label="Compose" icon="edit" {...props} />
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

describe('every shipped system values the ExtendedFloatingActionButton vocabulary', () => {
  describeSharedVocabulary(extendedFabSubject);
});

describe('a collapsed extended FAB is the FAB of its size, in every shipped system (EFB-13)', () => {
  test.each(SHIPPED_SYSTEMS.map((system) => [system.id, system] as const))('%s: every size, collapsed, has the FAB\'s side, corners, icon size and elevations', async (_id, system) => {
    for (const size of sizes) {
      const fab = system.components.fab;
      const efab = system.components.extendedFab;
      expect(efab.sizes[size]).toMatchObject({ containerHeight: fab.sizes[size].containerSize, containerShape: fab.sizes[size].containerShape, iconSize: fab.sizes[size].iconSize });
      for (const variant of variants) {
        for (const state of ['enabled', 'hovered', 'focused', 'pressed', 'disabled'] as const) {
          expect(efab.variants[variant][state].containerColor).toEqual(fab.variants[variant][state].containerColor);
          expect(efab.variants[variant][state].containerElevation).toBe(fab.variants[variant][state].containerElevation);
        }
      }
      const view = await mount(system, { size, expanded: false });
      expect(viewStyle(host())).toMatchObject({ width: fab.sizes[size].containerSize, height: fab.sizes[size].containerSize, borderRadius: fab.sizes[size].containerShape });
      expect(textStyle(part('glyph')!).fontSize).toBe(fab.sizes[size].iconSize);
      await view.unmount();
    }
  });
});

describe('m3-like drives the ExtendedFloatingActionButton', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.extendedFab;

  test('the large one is the large FAB\'s 96 with a 36 icon (6ec1b35)', () => {
    expect(tokens.sizes.large).toMatchObject({ containerHeight: 96, iconSize: 36 });
  });

  test('Material\'s baseline extended FAB: 56 high, corners 16, 16 before the icon, 20 after the label, 12 between them', async () => {
    const medium = tokens.sizes.medium;
    expect(medium).toMatchObject({ containerHeight: 56, containerShape: 16, containerPaddingInlineStartWithIcon: 16, containerPaddingInlineEnd: 20, containerGap: 12 });
    await mount(system);
    expect(viewStyle(host())).toMatchObject({ minHeight: 56, borderRadius: 16, paddingStart: 16, paddingEnd: 20, gap: 12 });
  });

  test('tonal is primary-container / on-primary-container; surface is surface-container-high with a primary label', async () => {
    const tonal = await mount(system, { variant: 'tonal' });
    expect(viewStyle(host()).backgroundColor).toBe(role(system, 'primaryContainer'));
    expect(textStyle(part('label')!).color).toBe(role(system, 'onPrimaryContainer'));
    await tonal.unmount();
    await mount(system, { variant: 'surface' });
    expect(viewStyle(host()).backgroundColor).toBe(role(system, 'surfaceContainerHigh'));
    expect(textStyle(part('label')!).color).toBe(role(system, 'primary'));
  });

  test('EFB-9: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the ExtendedFloatingActionButton', () => {
  test('it inherits m3-like\'s extended FAB, with no added axis values', () => {
    const tokens = m3ExpressiveLike.components.extendedFab;
    expect(tokens).toEqual(m3Like.components.extendedFab);
    expect(Object.keys(tokens.sizes).sort()).toEqual([...sizes].sort());
    expect(Object.keys(tokens.variants).sort()).toEqual([...variants].sort());
  });
});

describe('cupertino drives the ExtendedFloatingActionButton', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.extendedFab;

  test('every size is a capsule with the continuous corner', async () => {
    for (const size of sizes) {
      expect(tokens.sizes[size].containerShape).toBe(system.shape.full);
      const view = await mount(system, { size });
      expect(viewStyle(host())).toMatchObject({ borderRadius: system.shape.full, borderCurve: 'continuous' });
      await view.unmount();
    }
  });

  test.each(variants)('%s: hover and keyboard focus draw exactly like the resting state (no state layer, no hover lift)', async (variant) => {
    expect(tokens.variants[variant].hovered.containerElevation).toBe(tokens.variants[variant].enabled.containerElevation);
    await mount(system, { variant });
    const resting = { ...viewStyle(host()) };
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host())).toEqual(resting);
    await fireEvent(host(), 'hoverOut');
    await fireEvent(host(), 'focus');
    expect(viewStyle(host()).backgroundColor).toBe(resting.backgroundColor);
  });

  test('EFB-9 dim: pressed dims the whole control to 0.7 and keeps its colors', async () => {
    await mount(system);
    const resting = viewStyle(host()).backgroundColor;
    await fireEvent(host(), 'pressIn');
    expect(tokens.pressedOpacity).toBe(0.7);
    expect(viewStyle(host())).toMatchObject({ opacity: 0.7, backgroundColor: resting });
    expect(part('ripple')).toBeNull();
    await fireEvent(host(), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
    expect(viewStyle(host()).opacity).toBe(1);
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the default filled one — plus the collapsed form, whose shape
  // is where the presets differ most (m3-like: a rounded square; cupertino: a circle).
  describeFixtureBaselines(extendedFabSubject, { systems: [m3Like, cupertino], fixtures: ['filled-medium', 'filled-collapsed'] });
});
