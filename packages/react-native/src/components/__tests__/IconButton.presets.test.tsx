// The shipped presets drive the same IconButton with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render } from '@testing-library/react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreIconButtonVariant, TanreiPaint, TanreiSystem } from '../../generated/vocabulary';
import { byTestID, describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { IconButton, type IconButtonProps } from '../IconButton';
import { iconButtonSubject } from './IconButton.subject';

const ID = 'icon-button';
const variants: TanreiCoreIconButtonVariant[] = ['standard', 'filled', 'tonal', 'outlined'];
const sizes = ['small', 'medium', 'large'] as const;
const { host, part } = byTestID(ID);
const glyph = () => part('glyph')!;

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor(system.colors.light[name]!);
const painted = (system: TanreiSystem, paint: TanreiPaint) => formatColor(evaluatePaint(paint, system.colors.light));
const fill = (system: TanreiSystem, paint: TanreiPaint) => (evaluatePaint(paint, system.colors.light).a === 0 ? undefined : painted(system, paint));

const mount = (system: TanreiSystem, props: Partial<IconButtonProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <IconButton testID={ID} accessibilityLabel="Favorite" {...props}>
        favorite
      </IconButton>
    </TanreiProvider>,
  );

settleMotion();
beforeEach(() => {
  // Every shipped preset draws selected icons with the FILL axis of one variable font, which a <Text> cannot set:
  // the icon helper reports it once (ICB-13, README "Icons"). That report is covered in IconButton.test.tsx.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('every shipped system values the IconButton vocabulary', () => {
  describeSharedVocabulary(iconButtonSubject);
});

describe('m3-like drives the IconButton', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.iconButton;

  test('round squares of 32 / 40 / 48 with icons 20 / 24 / 24', async () => {
    expect(sizes.map((size) => tokens.sizes[size].containerSize)).toEqual([32, 40, 48]);
    expect(sizes.map((size) => tokens.sizes[size].iconSize)).toEqual([20, 24, 24]);
    expect(tokens.containerShape).toBe(system.shape.full);
    for (const size of sizes) {
      const view = await mount(system, { size });
      const { containerSize, iconSize } = tokens.sizes[size];
      expect(viewStyle(host())).toMatchObject({ width: containerSize, height: containerSize, borderRadius: tokens.containerShape });
      expect(Number(viewStyle(host()).borderRadius)).toBeGreaterThanOrEqual(containerSize / 2);
      expect(textStyle(glyph())).toMatchObject({ fontSize: iconSize, fontFamily: system.icon.family.unselected.families[0] });
      await view.unmount();
    }
    // …and those are this system's values, not the default system's.
    expect(tokens.sizes.large.containerSize).not.toBe(tanrei.components.iconButton.sizes.large.containerSize);
  });

  test('a standard toggle that is on draws its icon in the system primary; off, in on-surface-variant', async () => {
    const on = await mount(system, { toggle: true, selected: true });
    expect(textStyle(glyph()).color).toBe(role(system, 'primary'));
    await on.unmount();
    await mount(system, { toggle: true, selected: false });
    expect(textStyle(glyph()).color).toBe(role(system, 'onSurfaceVariant'));
  });

  test('the icon style of the preset: its own family and weight reach the glyph', async () => {
    await mount(system);
    expect(system.icon.weight).toBe(400);
    expect(textStyle(glyph())).toMatchObject({ fontFamily: system.icon.family.unselected.families[0], fontWeight: '400' });
    expect(system.icon.family.unselected.families[0]).not.toBe(tanrei.icon.family.unselected.families[0]);
  });

  test('ICB-9: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });

  test('it adds no IconButton axis value', () => {
    const tokens = m3Like.components.iconButton;
    expect(Object.keys(tokens.sizes).sort()).toEqual([...sizes].sort());
    expect(Object.keys(tokens.variants).sort()).toEqual([...variants].sort());
  });
});

describe('cupertino drives the IconButton', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.iconButton;

  test('round squares of 28 / 34 / 44; the standard, outlined and selected-standard icons are the tint', async () => {
    expect(sizes.map((size) => tokens.sizes[size].containerSize)).toEqual([28, 34, 44]);
    expect(tokens.containerShape).toBe(system.shape.full);
    for (const props of [{ variant: 'standard' }, { variant: 'outlined' }, { variant: 'standard', toggle: true, selected: true }] as Partial<IconButtonProps>[]) {
      const view = await mount(system, props);
      expect(textStyle(glyph()).color).toBe(role(system, 'primary'));
      await view.unmount();
    }
  });

  test('standard and outlined toggles are on-surface-variant when off; on, standard is the tint and outlined its inverse look', async () => {
    for (const variant of ['standard', 'outlined'] as const) {
      const off = await mount(system, { variant, toggle: true, selected: false });
      expect(textStyle(glyph()).color).toBe(role(system, 'onSurfaceVariant'));
      const offColor = textStyle(glyph()).color;
      await off.unmount();
      const on = await mount(system, { variant, toggle: true, selected: true });
      expect(textStyle(glyph()).color).toBe(variant === 'standard' ? role(system, 'primary') : painted(system, tokens.variants.outlined.enabled.selectedIconColor));
      expect(textStyle(glyph()).color).not.toBe(offColor);
      await on.unmount();
    }
  });

  test.each(variants)('%s: hover and keyboard focus draw exactly like the resting state (no state layer)', async (variant) => {
    await mount(system, { variant });
    const resting = { ...viewStyle(host()) };
    const icon = textStyle(glyph()).color;
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host())).toEqual(resting);
    expect(textStyle(glyph()).color).toBe(icon);
    await fireEvent(host(), 'hoverOut');
    await fireEvent(host(), 'focus');
    expect(viewStyle(host()).backgroundColor).toBe(resting.backgroundColor);
  });

  test.each(variants)('ICB-9 dim: %s toggle, on, pressed dims the whole control to the pressed opacity and keeps its colors', async (variant) => {
    await mount(system, { variant, toggle: true, selected: true });
    const resting = viewStyle(host()).backgroundColor;
    expect(resting).toBe(fill(system, tokens.variants[variant].enabled.selectedContainerColor));
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).opacity).toBe(tokens.pressedOpacity);
    expect(tokens.pressedOpacity).toBe(0.7);
    expect(viewStyle(host()).backgroundColor).toBe(resting);
    await fireEvent(host(), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
    expect(viewStyle(host()).opacity).toBe(1);
  });

  test('ICB-10: its container, outline and focus ring use the continuous corner', async () => {
    await mount(system, { variant: 'outlined' });
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('outline')!, part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBe('continuous');
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the filled action — plus the toggle that is on, whose look
  // is where the presets differ most.
  describeFixtureBaselines(iconButtonSubject, { systems: [m3Like, cupertino], fixtures: ['filled-medium', 'standard-selected'] });
});
