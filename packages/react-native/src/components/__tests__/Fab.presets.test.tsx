// The shipped presets drive the same FloatingActionButton with other values — "design systems differ in values, never in
// tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render } from '@testing-library/react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreFabVariant, TanreiSystem } from '../../generated/vocabulary';
import { byTestID, describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { resolveElevation } from '../../theme/elevation';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { FloatingActionButton, type FloatingActionButtonProps } from '../Fab';
import { fabSubject } from './Fab.subject';

const ID = 'fab';
const variants: TanreiCoreFabVariant[] = ['filled', 'tonal', 'surface'];
const sizes = ['small', 'medium', 'large'] as const;
const { host, part } = byTestID(ID);
const glyph = () => part('glyph')!;

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);

const mount = (system: TanreiSystem, props: Partial<FloatingActionButtonProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <FloatingActionButton testID={ID} accessibilityLabel="Create" icon="add" {...props} />
    </TanreiProvider>,
  );

settleMotion();

describe('every shipped system values the FloatingActionButton vocabulary', () => {
  describeSharedVocabulary(fabSubject);
});

describe('m3-like drives the FloatingActionButton', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.fab;

  test('squares of 40 / 56 / 96 with corners 12 / 16 / 28 and icons 24 / 24 / 36', async () => {
    expect(sizes.map((size) => tokens.sizes[size].containerSize)).toEqual([40, 56, 96]);
    expect(sizes.map((size) => tokens.sizes[size].containerShape)).toEqual([12, 16, 28]);
    expect(sizes.map((size) => tokens.sizes[size].iconSize)).toEqual([24, 24, 36]);
    for (const size of sizes) {
      const view = await mount(system, { size });
      const { containerSize, containerShape, iconSize } = tokens.sizes[size];
      expect(viewStyle(host())).toMatchObject({ width: containerSize, height: containerSize, borderRadius: containerShape });
      expect(textStyle(glyph())).toMatchObject({ fontSize: iconSize, fontFamily: system.icon.family.unselected.families[0] });
      await view.unmount();
    }
    expect(tokens.sizes.medium.containerSize).not.toBe(tanrei.components.fab.sizes.medium.containerSize);
  });

  test('tonal is Material\'s default FAB (primary-container / on-primary-container); surface is surface-container-high with a primary glyph', async () => {
    const tonal = await mount(system, { variant: 'tonal' });
    expect(viewStyle(host()).backgroundColor).toBe(role(system, 'primaryContainer'));
    expect(textStyle(glyph()).color).toBe(role(system, 'onPrimaryContainer'));
    await tonal.unmount();
    await mount(system, { variant: 'surface' });
    expect(viewStyle(host()).backgroundColor).toBe(role(system, 'surfaceContainerHigh'));
    expect(textStyle(glyph()).color).toBe(role(system, 'primary'));
  });

  test.each(variants)('%s rests at level3, rises to level4 on hover', async (variant) => {
    expect(tokens.variants[variant].enabled.containerElevation).toBe('level3');
    expect(tokens.variants[variant].hovered.containerElevation).toBe('level4');
    await mount(system, { variant });
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host()).boxShadow).toEqual(resolveElevation(system.elevation.level4, (name) => role(system, name)).boxShadow);
  });

  test('FAB-9: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });

  test('it adds no FAB axis value (Material 3\'s newer FAB sizes are left to its fidelity work)', () => {
    const tokens = m3Like.components.fab;
    expect(Object.keys(tokens.sizes).sort()).toEqual([...sizes].sort());
    expect(Object.keys(tokens.variants).sort()).toEqual([...variants].sort());
  });
});

describe('cupertino drives the FloatingActionButton', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.fab;

  test('every size is a circle with the continuous corner', async () => {
    for (const size of sizes) {
      expect(tokens.sizes[size].containerShape).toBe(system.shape.full);
      const view = await mount(system, { size });
      expect(Number(viewStyle(host()).borderRadius)).toBeGreaterThanOrEqual(tokens.sizes[size].containerSize / 2);
      expect(viewStyle(host()).borderCurve).toBe('continuous');
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

  test.each(variants)('FAB-9 dim: %s pressed dims the whole control to 0.7 and keeps its colors', async (variant) => {
    await mount(system, { variant });
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
  // One representative fixture per preset — the default filled FAB — plus the tonal one, where the
  // presets differ most (m3-like: primary-container; cupertino: its tinted fill).
  describeFixtureBaselines(fabSubject, { systems: [m3Like, cupertino], fixtures: ['filled-medium', 'tonal-medium'] });
});
