// ExtendedFloatingActionButton — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/extended-fab.spec.json; every behaviour id is cited by the test that covers it.
import { createRef, type ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, Text, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type {
  TanreiColorRole,
  TanreiCoreExtendedFabSize,
  TanreiCoreExtendedFabVariant,
  TanreiExtendedFabSizeTokens,
  TanreiExtendedFabTokens,
  TanreiExtendedFabVariantStateTokens,
  TanreiPaint,
  TanreiScheme,
  TanreiSystem,
} from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { byTestID, describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resolveElevation } from '../../theme/elevation';
import { resetIconReport } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { toFontWeight } from '../../theme/typography';
import {
  ExtendedFloatingActionButton,
  type ExtendedFloatingActionButtonIconProps,
  type ExtendedFloatingActionButtonProps,
  type ExtendedFloatingActionButtonRef,
  type ExtendedFloatingActionButtonSize,
  type ExtendedFloatingActionButtonVariant,
} from '../ExtendedFab';
import { acme } from './__fixtures__/acme';
import { extendedFabSubject } from './ExtendedFab.subject';

const spec = loadSpec('extended-fab');
const { elevation, measure, state: sysState } = tanrei;
const colors: TanreiSystem['colors'] = tanrei.colors;
const tokens: TanreiExtendedFabTokens = tanrei.components.extendedFab;
const medium = tokens.sizes.medium;
const ID = 'efab';
const LABEL = 'Compose';

const { host, part } = byTestID(ID);
const glyph = () => part('glyph')!;
const label = () => part('label')!;

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });

const withExtendedFab = (overrides: Partial<TanreiExtendedFabTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'extendedFab', overrides);
/** …with some tokens of one variant changed, per state. */
const withVariant = (variant: TanreiCoreExtendedFabVariant, overrides: { [State in InteractionState]?: Partial<TanreiExtendedFabVariantStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.extendedFab.variants[variant];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withExtendedFab({ variants: { ...base.components.extendedFab.variants, [variant]: { ...current, ...changed } } }, base);
};
/** …with some tokens of one size changed. */
const withSize = (size: TanreiCoreExtendedFabSize, overrides: Partial<TanreiExtendedFabSizeTokens>, base: TanreiSystem = tanrei): TanreiSystem =>
  withExtendedFab({ sizes: { ...base.components.extendedFab.sizes, [size]: { ...base.components.extendedFab.sizes[size], ...overrides } } }, base);
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });

const element = (props: Partial<ExtendedFloatingActionButtonProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }): ReactElement => (
  <TanreiProvider {...provider}>
    <ExtendedFloatingActionButton testID={ID} label={LABEL} icon="edit" {...props} />
  </TanreiProvider>
);
const mount = (props: Partial<ExtendedFloatingActionButtonProps> = {}, provider?: Omit<TanreiProviderProps, 'children'>) => render(element(props, provider));

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

// The CORE values of the two axes: what every system has.
const variants: TanreiCoreExtendedFabVariant[] = ['filled', 'tonal', 'surface'];
const sizes: TanreiCoreExtendedFabSize[] = ['small', 'medium', 'large'];
const ACTIVE = ['hovered', 'focused', 'pressed'] as const;

const opacityOf = (from: TanreiExtendedFabTokens, in_: InteractionState) =>
  ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity })[in_];

/** Enter / Space / D-pad centre and assistive activation: a bare click (no press events, no touch data). */
const click = () => fireEvent(host(), 'press', { nativeEvent: { target: 1 } });

/** EFB-8: a press stays visible for `duration.pressHold`, so a release is over only after that. */
const HOLD = tanrei.motion.duration.pressHold;
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
async function release() {
  await fireEvent(host(), 'pressOut');
  await wait(HOLD + 30);
}

async function enter(target: InteractionState) {
  if (target === 'hovered') await fireEvent(host(), 'hoverIn');
  if (target === 'focused') await fireEvent(host(), 'focus');
  if (target === 'pressed') await fireEvent(host(), 'pressIn');
}

/** Everything EFB-3 / EFB-6 name — container, label, icon, elevation, opacity — from one state's tokens. */
function expectDrawnFrom(variant: TanreiCoreExtendedFabVariant, in_: InteractionState, from: TanreiExtendedFabTokens = tokens, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei, size: TanreiCoreExtendedFabSize = 'medium') {
  const paints = from.variants[variant][in_];
  const container = viewStyle(host());
  expect(container.backgroundColor).toBe(painted(paints.containerColor, scheme, system));
  expect(container.opacity).toBe(opacityOf(from, in_));
  expect(container.borderRadius).toBe(from.sizes[size].containerShape);
  expect(textStyle(label()).color).toBe(painted(paints.labelColor, scheme, system));
  expect(textStyle(glyph()).color).toBe(painted(paints.labelColor, scheme, system));
  const resolved = resolveElevation(system.elevation[paints.containerElevation], (name) => role(name, scheme, system));
  expect(container.boxShadow).toEqual(resolved.boxShadow.length ? resolved.boxShadow : undefined);
  if (resolved.ring) expect(viewStyle(part('elevation-ring')!)).toMatchObject({ borderColor: resolved.ring.color, borderWidth: resolved.ring.width });
  else expect(part('elevation-ring')).toBeNull();
}

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // The React Native Jest preset's window has fontScale 2; baselines and geometry are recorded at 1 (the tokens' own
  // sizes), and one test sets 2 on purpose.
  Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
beforeEach(() => {
  reduceMotion(true);
  resetIconReport();
  resetLookupReports();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(ExtendedFloatingActionButton.name);
    expect(platform.props).toEqual({ variant: 'variant', size: 'size', expanded: 'expanded', disabled: 'disabled', label: 'label' });
    expect(platform.events).toEqual({ click: 'onPress' });
  });

  test('the enum values under test are exactly the spec values, and they are the token axes', () => {
    const values = (name: string) => spec.props.find((p) => p.name === name)?.values;
    expect(values('variant')).toEqual(variants);
    expect(values('size')).toEqual(sizes);
    expect(Object.keys(tokens.variants)).toEqual(variants);
    expect(Object.keys(tokens.sizes)).toEqual(sizes);
  });

  test('defaults follow the spec: variant filled, size medium, expanded, enabled', async () => {
    await mount();
    expectDrawnFrom('filled', 'enabled');
    expect(viewStyle(host())).toMatchObject({ minHeight: medium.containerHeight });
    expect(label().props.children).toBe(LABEL);
    expect(host().props.accessibilityState).toEqual({ disabled: false });
  });
});

describe('behavior', () => {
  test('EFB-1: activating the extended FAB calls onPress exactly once — touch and a bare (keyboard / assistive) click alike', async () => {
    const onPress = jest.fn();
    await mount({ onPress });
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    await wait(HOLD + 30);
    await click();
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(host().props.accessible).toBe(true);
    expect(host().props.focusable).toBe(true);
  });

  test('EFB-2: a disabled extended FAB does not call onPress, is not focusable and exposes disabled', async () => {
    const onPress = jest.fn();
    await mount({ onPress, disabled: true });
    await fireEvent.press(host());
    await click();
    expect(onPress).not.toHaveBeenCalled();
    expect(host().props.focusable).toBe(false);
    expect(host().props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByRole('button', { name: LABEL, disabled: true })).toBe(host());
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'hoverIn');
    expect(part('focus-ring')).toBeNull();
    expectDrawnFrom('filled', 'disabled');
  });

  describe.each(variants)('EFB-3: %s', (variant) => {
    test.each(ACTIVE)('%s: container, label, icon, elevation and opacity come from its tokens, and it returns to rest', async (target) => {
      await mount({ variant });
      await enter(target);
      expectDrawnFrom(variant, target);
      if (target === 'hovered') await fireEvent(host(), 'hoverOut');
      if (target === 'focused') await fireEvent(host(), 'blur');
      if (target === 'pressed') await release();
      expectDrawnFrom(variant, 'enabled');
    });
  });

  test('EFB-3: precedence is pressed over focused over hovered, under the acme fixture system (which values each differently)', async () => {
    const filled = acme.components.extendedFab.variants.filled;
    const expected = (name: InteractionState) => painted(filled[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    await mount({}, { theme: 'light', system: acme });
    const background = () => viewStyle(host()).backgroundColor;
    await fireEvent(host(), 'hoverIn');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(host(), 'focus');
    expect(background()).toBe(expected('focused'));
    await fireEvent(host(), 'pressIn');
    expect(background()).toBe(expected('pressed'));
    await release();
    expect(background()).toBe(expected('focused'));
    await fireEvent(host(), 'blur');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(host(), 'hoverOut');
    expect(background()).toBe(expected('enabled'));
  });

  test('EFB-3: in the default system hover raises it (level4 against level3); a state mixes the variant\'s state-layer color (its label color) into the container', async () => {
    for (const variant of variants) {
      const each = tokens.variants[variant];
      expect([each.enabled, each.hovered, each.focused, each.pressed, each.disabled].map((t) => t.containerElevation)).toEqual(['level3', 'level4', 'level3', 'level3', 'level0']);
      expect(each.enabled.stateLayerColor).toEqual(each.enabled.labelColor);
      const mix = (amount: number): TanreiPaint => ({ kind: 'mix', base: each.enabled.containerColor, with: each.enabled.stateLayerColor, amount });
      const view = await mount({ variant });
      await fireEvent(host(), 'hoverIn');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(sysState.hoverStateLayerOpacity)));
      expect(viewStyle(host()).boxShadow).toEqual(resolveElevation(elevation.level4, (name) => role(name)).boxShadow);
      await fireEvent(host(), 'focus');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(sysState.focusStateLayerOpacity)));
      await fireEvent(host(), 'pressIn');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(sysState.pressedStateLayerOpacity)));
      await view.unmount();
    }
  });

  test('EFB-3: focus gained by touch or pointer does not select the focused state', async () => {
    const system = withVariant('filled', { focused: { containerColor: literal(2, 0, 0) } });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await release();
    expectDrawnFrom('filled', 'enabled', system.components.extendedFab, 'light', system);
  });

  test('EFB-4: keyboard focus shows the focus ring around the size\'s corners, without animation; pointer focus does not', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).toBeNull();
    await release();
    await fireEvent(host(), 'blur');
    timing.mockClear();
    await fireEvent(host(), 'focus');
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(part('focus-ring')!)).toMatchObject({ position: 'absolute', top: -reach, left: -reach, borderColor: role('focusRing'), borderRadius: medium.containerShape + reach });
    expect(timing).not.toHaveBeenCalled();
    await fireEvent(host(), 'blur');
    expect(part('focus-ring')).toBeNull();
  });

  test.each([
    { size: 'small' as const, slop: 4 },
    { size: 'medium' as const, slop: 0 },
    { size: 'large' as const, slop: 0 },
  ])('EFB-5: the $size extended FAB meets sys.target.touch on both axes, before and after layout, without changing its size', async ({ size, slop }) => {
    await mount({ size });
    const height = tokens.sizes[size].containerHeight;
    expect(host().props.hitSlop).toEqual({ top: slop, bottom: slop, left: slop, right: slop });
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height } } });
    expect(host().props.hitSlop).toEqual({ top: slop, bottom: slop, left: 0, right: 0 });
    expect(viewStyle(host()).minHeight).toBe(height);
  });

  test.each(variants)('EFB-6: disabled %s renders container, label, icon, elevation and opacity from its disabled tokens', async (variant) => {
    await mount({ variant, disabled: true });
    expectDrawnFrom(variant, 'disabled');
  });

  test('EFB-6: in the default system disabled is an on-surface fill at the container opacity, label and icon at the content opacity, nothing raised', async () => {
    const onSurface = colors.light.onSurface;
    await mount({ variant: 'surface', disabled: true });
    expect(viewStyle(host()).backgroundColor).toBe(formatColor({ ...onSurface, a: sysState.disabledContainerOpacity }));
    expect(textStyle(label()).color).toBe(formatColor({ ...onSurface, a: sysState.disabledContentOpacity }));
    expect(textStyle(glyph()).color).toBe(formatColor({ ...onSurface, a: sysState.disabledContentOpacity }));
    expect(viewStyle(host()).boxShadow).toBeUndefined();
    expect(part('elevation-ring')).toBeNull();
  });
});

describe('press hold', () => {
  test('EFB-8: the pressed state appears in the same frame and stays visible for duration.pressHold although the press ended sooner', async () => {
    await mount({ variant: 'tonal' });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('tonal', 'pressed');
    await fireEvent(host(), 'pressOut');
    expectDrawnFrom('tonal', 'pressed');
    await wait(HOLD / 2);
    expectDrawnFrom('tonal', 'pressed');
    await wait(HOLD / 2 + 30);
    expectDrawnFrom('tonal', 'enabled');
  });

  test('EFB-8: Enter / Space / assistive activation — a bare click — shows the pressed state for the hold', async () => {
    await mount({ variant: 'tonal' });
    await click();
    expectDrawnFrom('tonal', 'pressed');
    await wait(HOLD + 30);
    expectDrawnFrom('tonal', 'enabled');
  });
});

describe('choices of kind: system.behavior', () => {
  test('EFB-9 overlay (the default): the pressed tokens reach the whole container at once; no extra node exists', async () => {
    reduceMotion(false);
    await mount({ variant: 'surface' });
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 48 } } });
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expectDrawnFrom('surface', 'pressed');
    expect(part('ripple')).toBeNull();
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  test('EFB-9 ripple (m3-like): the pressed container color grows from the point of contact over comp.extended-fab.motion.feedback-duration, below the icon and label; the container keeps the state under the press; it fades over the state duration', async () => {
    reduceMotion(false);
    const efab = m3Like.components.extendedFab;
    const timing = jest.spyOn(Animated, 'timing');
    const ref = createRef<ExtendedFloatingActionButtonRef>();
    await mount({ ref }, { theme: 'light', system: m3Like });
    (ref.current as unknown as { measure: unknown }).measure = (callback: (...box: number[]) => void) => callback(0, 0, 140, 56, 300, 500);
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 140, height: 56 } } });
    timing.mockClear();
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 330, pageY: 520 } });
    expect(viewStyle(host()).backgroundColor).toBe(painted(efab.variants.filled.enabled.containerColor, 'light', m3Like));
    const reach = Math.hypot(140 - 30, 56 - 20);
    expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 30 - reach, top: 20 - reach, width: reach * 2, backgroundColor: painted(efab.variants.filled.pressed.containerColor, 'light', m3Like) });
    expect(host().children.indexOf(part('ripple')!)).toBeLessThan(host().children.indexOf(part('icon')!));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: efab.motionFeedbackDuration, useNativeDriver: true });
    timing.mockClear();
    await release();
    expect(timing.mock.calls.some(([, config]) => config.toValue === 0 && config.duration === efab.motionStateDuration)).toBe(true);
    await wait(efab.motionStateDuration * 2 + 50);
    expect(part('ripple')).toBeNull();
  });

  test('EFB-9 dim: the pressed opacity on the whole control and NO state layer — the container keeps the state under the press; label, icon and elevation come from the pressed tokens', async () => {
    const system = withBehavior({ pressedFeedback: 'dim' }, withVariant('filled', { pressed: { labelColor: literal(10, 20, 30), containerElevation: 'level1' } }, withExtendedFab({ pressedOpacity: 0.5 })));
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host())).toMatchObject({ opacity: 0.5, backgroundColor: painted(tokens.variants.filled.hovered.containerColor) });
    expect(textStyle(label()).color).toBe('rgb(10, 20, 30)');
    expect(textStyle(glyph()).color).toBe('rgb(10, 20, 30)');
    expect(viewStyle(host()).boxShadow).toEqual(resolveElevation(elevation.level1, (name) => role(name)).boxShadow.length ? resolveElevation(elevation.level1, (name) => role(name)).boxShadow : undefined);
    expect(part('ripple')).toBeNull();
    await release();
  });

  test('EFB-9 none: no answer to the press — every part stays with the state under the press; the click still happens', async () => {
    const onPress = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withVariant('filled', { pressed: { containerColor: literal(1, 2, 3), labelColor: literal(10, 20, 30) } }, withExtendedFab({ pressedOpacity: 0.5 })));
    await mount({ onPress }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('filled', 'enabled', system.components.extendedFab, 'light', system);
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    await release();
  });

  test('EFB-10 corner smoothing: cupertino (0.6) reaches the container and the focus ring as the OS curve (a capsule); 0 adds nothing; glow (acme) is one halo', async () => {
    const view = await mount();
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBeUndefined();
    await view.unmount();
    const capsule = await mount({}, { theme: 'light', system: cupertino });
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBe('continuous');
    expect(viewStyle(host()).borderRadius).toBe(cupertino.shape.full);
    await capsule.unmount();
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(host(), 'focus');
    expect(viewStyle(part('focus-ring')!).boxShadow).toHaveLength(1);
  });

  test('EFB-10 corner smoothing on Android: circular whatever the amount', async () => {
    const os = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    try {
      await mount({}, { theme: 'light', system: cupertino });
      expect(viewStyle(host()).borderCurve).toBeUndefined();
    } finally {
      os.restore();
    }
  });
});

describe('geometry, label and icon (EFB-11, EFB-12)', () => {
  test.each(sizes)('EFB-11: %s with an icon — at least its height, its corners, the with-icon start padding, the end padding, the gap and the block padding', async (size) => {
    await mount({ size });
    const s = tokens.sizes[size];
    expect(viewStyle(host())).toMatchObject({
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: s.containerHeight,
      borderRadius: s.containerShape,
      paddingStart: s.containerPaddingInlineStartWithIcon,
      paddingEnd: s.containerPaddingInlineEnd,
      paddingVertical: s.containerPaddingBlock,
      gap: s.containerGap,
    });
    // As wide as its content: no width, no height of its own.
    expect(viewStyle(host()).width).toBeUndefined();
    expect(viewStyle(host()).height).toBeUndefined();
    // The icon, then the label.
    expect(host().children.indexOf(part('icon')!)).toBeLessThan(host().children.indexOf(label()));
  });

  test('EFB-11: without an icon the start padding is the plain one', async () => {
    await mount({ icon: undefined });
    expect(part('icon')).toBeNull();
    expect(viewStyle(host())).toMatchObject({ paddingStart: medium.containerPaddingInlineStart, paddingEnd: medium.containerPaddingInlineEnd });
  });

  test('EFB-11: the default values are Button\'s geometry at the FAB\'s heights: 40 / 48 / 64, corners 8 / 12 / 16', () => {
    expect(sizes.map((size) => tokens.sizes[size].containerHeight)).toEqual(sizes.map((size) => tanrei.components.fab.sizes[size].containerSize));
    expect(sizes.map((size) => tokens.sizes[size].containerShape)).toEqual(sizes.map((size) => tanrei.components.fab.sizes[size].containerShape));
    expect(sizes.map((size) => tokens.sizes[size].iconSize)).toEqual(sizes.map((size) => tanrei.components.fab.sizes[size].iconSize));
    expect(sizes.map((size) => tokens.sizes[size].containerHeight)).toEqual([40, 48, 64]);
  });

  test.each(sizes)('EFB-12: %s sets the label in its type style, in the label color, never truncated; the icon takes the same color at the icon size in the unselected glyph', async (size) => {
    await mount({ size }, { theme: 'dark' });
    const s = tokens.sizes[size];
    const type = createTanreiTheme(tanrei, 'dark').text(s.labelTypescale);
    expect(textStyle(label())).toMatchObject({ fontSize: type.fontSize, lineHeight: type.lineHeight, fontWeight: type.fontWeight, flexShrink: 1, color: painted(tokens.variants.filled.enabled.labelColor, 'dark') });
    expect(label().props.numberOfLines).toBeUndefined();
    expect(label().props.allowFontScaling).toBe(true);
    expect(viewStyle(part('icon')!)).toMatchObject({ width: s.iconSize, height: s.iconSize });
    expect(textStyle(glyph())).toMatchObject({ fontSize: s.iconSize, fontFamily: tanrei.icon.family.unselected.families[0], fontWeight: toFontWeight(tanrei.icon.weight), color: painted(tokens.variants.filled.enabled.labelColor, 'dark') });
  });

  test('EFB-12: the large size carries a larger label (heading5) than small and medium (label)', () => {
    expect(sizes.map((size) => tokens.sizes[size].labelTypescale)).toEqual(['label', 'label', 'heading5']);
  });

  test('EFB-12: a function icon receives the label color, the icon size and the unselected glyph; any other node is rendered as given', async () => {
    const seen: ExtendedFloatingActionButtonIconProps[] = [];
    const view = await mount({ variant: 'tonal', icon: (props: ExtendedFloatingActionButtonIconProps) => (seen.push(props), <View />) });
    expect(seen.at(-1)).toMatchObject({ color: painted(tokens.variants.tonal.enabled.labelColor), size: medium.iconSize });
    expect(seen.at(-1)!.glyph.axes.FILL).toBe(tanrei.icon.fillUnselected);
    await view.unmount();
    await mount({ icon: <Text testID="custom">✎</Text> });
    expect(screen.getByTestId('custom', { includeHiddenElements: true })).toBeTruthy();
  });

  test('EFB-12: at 200% text size the container grows — its height is a minimum and the label scales', async () => {
    Dimensions.set({ window: { ...WINDOW, fontScale: 2 }, screen: { ...WINDOW, fontScale: 2 } });
    try {
      await mount();
      expect(viewStyle(host()).minHeight).toBe(medium.containerHeight);
      expect(viewStyle(host()).height).toBeUndefined();
      expect(label().props.allowFontScaling).toBe(true);
      expect(glyph().props.allowFontScaling).toBe(false);
    } finally {
      Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
    }
  });
});

describe('collapse (EFB-13, EFB-14, EFB-15)', () => {
  test.each(sizes)('EFB-13: collapsed, %s is a square of its height holding only the centered icon; the label is still the accessible name', async (size) => {
    await mount({ size, expanded: false });
    const s = tokens.sizes[size];
    expect(viewStyle(host())).toMatchObject({ width: s.containerHeight, height: s.containerHeight, borderRadius: s.containerShape, justifyContent: 'center', alignItems: 'center' });
    for (const key of ['paddingStart', 'paddingEnd', 'minHeight'] as const) expect(viewStyle(host())[key]).toBeUndefined();
    expect(part('label')).toBeNull();
    expect(viewStyle(part('icon')!)).toMatchObject({ width: s.iconSize, height: s.iconSize });
    expect(screen.getByRole('button', { name: LABEL })).toBe(host());
  });

  test('EFB-13: a collapsed extended FAB has the square, corners and elevation of the FAB of its size', async () => {
    for (const size of sizes) {
      const view = await mount({ size, expanded: false });
      const fab = tanrei.components.fab.sizes[size];
      expect(viewStyle(host())).toMatchObject({ width: fab.containerSize, height: fab.containerSize, borderRadius: fab.containerShape });
      expect(viewStyle(host()).boxShadow).toEqual(resolveElevation(elevation[tanrei.components.fab.variants.filled.enabled.containerElevation], (name) => role(name)).boxShadow);
      await view.unmount();
    }
  });

  test('EFB-14: collapsing and expanding move the width over the resize motion — paddings, gap and a label clip that narrows and fades — then settle', async () => {
    reduceMotion(false);
    const system = withExtendedFab({ motionResizeDuration: 600 });
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const view = await mount({}, { theme: 'light', system });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionResizeEasing);
    // The label is measured where it is laid out.
    await fireEvent(label(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 20 } } });
    timing.mockClear();
    await view.rerender(element({ expanded: false }, { theme: 'light', system }));
    expect(timing.mock.calls.some(([, config]) => config.duration === 600 && config.useNativeDriver === false)).toBe(true);
    // While it moves: the label is in a clip of at most its own width, off the flow at that width; paddings in between.
    const clip = viewStyle(part('label-clip')!);
    expect(clip.overflow).toBe('hidden');
    expect(Number(clip.width)).toBeGreaterThanOrEqual(0);
    expect(Number(clip.width)).toBeLessThanOrEqual(80 * 1.1);
    expect(textStyle(label())).toMatchObject({ position: 'absolute', start: 0, width: 80 });
    expect(Number(viewStyle(host()).paddingStart)).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: LABEL })).toBe(host());
    await wait(900);
    expect(part('label-clip')).toBeNull();
    expect(part('label')).toBeNull();
    expect(viewStyle(host())).toMatchObject({ width: medium.containerHeight, height: medium.containerHeight });

    // …and back: the label fades in at its measured width and is in the flow again once settled.
    timing.mockClear();
    await view.rerender(element({ expanded: true }, { theme: 'light', system }));
    expect(part('label-clip')).not.toBeNull();
    await wait(900);
    expect(part('label-clip')).toBeNull();
    expect(textStyle(label()).position).toBeUndefined();
    expect(viewStyle(host())).toMatchObject({ minHeight: medium.containerHeight, paddingStart: medium.containerPaddingInlineStartWithIcon });
  });

  test('EFB-14: expanding one that was never laid out measures its label off the flow while the width moves', async () => {
    reduceMotion(false);
    const system = withExtendedFab({ motionResizeDuration: 600 });
    const view = await mount({ expanded: false }, { theme: 'light', system });
    await view.rerender(element({ expanded: true }, { theme: 'light', system }));
    expect(textStyle(label())).toMatchObject({ position: 'absolute' });
    expect(textStyle(label()).width).toBeUndefined();
    await fireEvent(label(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 72, height: 20 } } });
    expect(textStyle(label()).width).toBe(72);
    await wait(900);
    expect(part('label-clip')).toBeNull();
  });

  test('EFB-14: where motion is reduced the width changes at once', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount();
    await wait(10);
    timing.mockClear();
    await view.rerender(element({ expanded: false }));
    expect(timing).not.toHaveBeenCalled();
    expect(part('label-clip')).toBeNull();
    expect(viewStyle(host())).toMatchObject({ width: medium.containerHeight });
  });

  test('EFB-15: without an icon it cannot collapse — it stays expanded, and development builds say why', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ icon: undefined, expanded: false });
    expect(label().props.children).toBe(LABEL);
    expect(viewStyle(host())).toMatchObject({ minHeight: medium.containerHeight, paddingStart: medium.containerPaddingInlineStart });
    expect(viewStyle(host()).width).toBeUndefined();
    expect(warn.mock.calls.filter(([message]) => String(message).includes('cannot collapse without one'))).toHaveLength(1);
  });

  test('EFB-15: a release build stays expanded silently', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount({ icon: undefined, expanded: false });
      expect(part('label')).not.toBeNull();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    }
  });
});

describe('elevation (EFB-16)', () => {
  test.each(variants)('EFB-16: %s casts the elevation of its variant at rest outside the container, without clipping', async (variant) => {
    await mount({ variant });
    const [ringLayer, ...shadowLayers] = elevation[tokens.variants[variant].enabled.containerElevation];
    expect(viewStyle(part('elevation-ring')!)).toMatchObject({ position: 'absolute', borderWidth: ringLayer!.spread, pointerEvents: 'none' });
    expect((viewStyle(host()).boxShadow as unknown[]).length).toBe(shadowLayers.length);
    expect(viewStyle(host()).overflow).toBeUndefined();
  });

  test('EFB-16: hover moves every shadow layer and the colors with the state motion tokens; the press is immediate', async () => {
    reduceMotion(false);
    const system = withExtendedFab({ motionStateDuration: 600 });
    const from = resolveElevation(elevation.level3, (name) => role(name));
    const to = resolveElevation(elevation.level4, (name) => role(name));
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const timing = jest.spyOn(Animated, 'timing');
    await mount({}, { theme: 'light', system });
    interpolate.mockClear();
    timing.mockClear();
    await fireEvent(host(), 'hoverIn');
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: 600, useNativeDriver: false });
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    expect(ranges).toContainEqual([from.boxShadow[0]!.blurRadius, to.boxShadow[0]!.blurRadius]);
    expect(ranges).toContainEqual([painted(tokens.variants.filled.enabled.containerColor), painted(tokens.variants.filled.hovered.containerColor)]);
    await wait(900);
    expect(viewStyle(host()).boxShadow).toEqual(to.boxShadow);
    timing.mockClear();
    await fireEvent(host(), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    await release();
    await wait(900);
  });
});

describe('layout and direction (EFB-17, EFB-18)', () => {
  test('EFB-17: it does not position itself — no absolute position, no inset, no scrim; the caller\'s style places it', async () => {
    const view = await mount();
    const box = viewStyle(host());
    for (const key of ['position', 'top', 'right', 'bottom', 'left', 'start', 'end', 'zIndex'] as const) expect(box[key]).toBeUndefined();
    expect(box.alignSelf).toBe('flex-start');
    await view.unmount();
    await mount({ style: { position: 'absolute', end: 16, bottom: 16 } });
    expect(viewStyle(host())).toMatchObject({ position: 'absolute', end: 16, bottom: 16 });
  });

  test('EFB-18: in a right-to-left layout the row and the paddings stay logical, so the icon and label mirror; nothing is placed by left or right', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    try {
      await mount();
      const box = viewStyle(host());
      expect(box).toMatchObject({ flexDirection: 'row', paddingStart: medium.containerPaddingInlineStartWithIcon, paddingEnd: medium.containerPaddingInlineEnd });
      for (const key of ['paddingLeft', 'paddingRight', 'direction'] as const) expect(box[key]).toBeUndefined();
    } finally {
      rtl.restore();
    }
  });

  test('EFB-18: a ripple grows from the point of contact in right-to-left as in left-to-right (physical coordinates)', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    reduceMotion(false);
    try {
      const ref = createRef<ExtendedFloatingActionButtonRef>();
      await mount({ ref }, { theme: 'light', system: m3Like });
      (ref.current as unknown as { measure: unknown }).measure = (callback: (...box: number[]) => void) => callback(0, 0, 140, 56, 0, 0);
      await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 140, height: 56 } } });
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 30, pageY: 20 } });
      const reach = Math.hypot(110, 36);
      expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 30 - reach, top: 20 - reach });
      await release();
      await wait(m3Like.components.extendedFab.motionStateDuration * 2 + 50);
    } finally {
      rtl.restore();
    }
  });
});

describe('open size and variant keys', () => {
  const unknown = (size: string, variant: string) => ({ size: size as ExtendedFloatingActionButtonSize, variant: variant as ExtendedFloatingActionButtonVariant });

  test('EFB-7: an unknown size and an unknown variant render exactly like the default values, in every state', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reference = await mount({ size: 'medium', variant: 'filled' });
    const expected = JSON.stringify(reference.toJSON());
    await reference.unmount();
    await mount(unknown('jumbo', 'ghost'));
    expect(JSON.stringify(screen.toJSON())).toBe(expected);
    for (const target of ACTIVE) {
      await enter(target);
      expectDrawnFrom('filled', target);
    }
  });

  test('EFB-7: development builds report the unknown value once per key; release builds say nothing; known values never', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (let i = 0; i < 2; i += 1) {
      const view = await mount(unknown('colossal', 'phantom'));
      await view.unmount();
    }
    const reports = (needle: string) => warn.mock.calls.filter(([message]) => String(message).includes(needle));
    expect(reports('no ExtendedFloatingActionButton size "colossal"; using "medium"')).toHaveLength(1);
    expect(reports('no ExtendedFloatingActionButton variant "phantom"; using "filled"')).toHaveLength(1);
    warn.mockClear();
    for (const variant of variants) for (const size of sizes) await (await mount({ variant, size })).unmount();
    expect(warn).not.toHaveBeenCalled();
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      await mount(unknown('titanic', 'spectre'));
      expect(warn).not.toHaveBeenCalled();
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    }
  });
});

describe('accessible name (EFB-19)', () => {
  const unnamedReports = (spy: jest.SpyInstance) => spy.mock.calls.filter(([message]) => String(message).includes('has no label'));

  test('EFB-19: with an empty label it still renders and works, and development builds report it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onPress = jest.fn();
    await mount({ label: '', onPress });
    expect(host().props.accessibilityRole).toBe('button');
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(unnamedReports(warn)).toHaveLength(1);
    expect(String(unnamedReports(warn)[0]![0])).toContain(`testID "${ID}"`);
  });

  test('EFB-19: a blank label is no name; accessibilityLabel is one; a release build says nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const blank = await mount({ label: '   ' });
    expect(unnamedReports(warn)).toHaveLength(1);
    await blank.unmount();
    warn.mockClear();
    const named = await mount({ label: '', accessibilityLabel: 'Write a message' });
    expect(unnamedReports(warn)).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Write a message' })).toBe(host());
    await named.unmount();
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      await mount({ label: '' });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    }
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'light', contrast: 'medium' }, scheme: 'lightMedium' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  describe.each(schemes)('$scheme', ({ provider, scheme }) => {
    test.each(variants)('%s resolves container, label, icon and elevation from its paints in this scheme, at rest and hovered', async (variant) => {
      await mount({ variant }, provider);
      expectDrawnFrom(variant, 'enabled', tokens, scheme);
      await fireEvent(host(), 'hoverIn');
      expectDrawnFrom(variant, 'hovered', tokens, scheme);
    });
  });

  test('each variant\'s container, label color and elevations equal the FAB\'s of the same variant, so a collapsed one matches', () => {
    for (const variant of variants) {
      for (const name of ['enabled', 'hovered', 'focused', 'pressed', 'disabled'] as const) {
        const efab = tokens.variants[variant][name];
        const fab = tanrei.components.fab.variants[variant][name];
        expect(efab.containerColor).toEqual(fab.containerColor);
        expect(efab.labelColor).toEqual(fab.iconColor);
        expect(efab.containerElevation).toBe(fab.containerElevation);
      }
    }
  });
});

describe('the system drives rendering', () => {
  test('a size re-valued by a layer reaches the height, corners, paddings, gap, icon and the label style', async () => {
    const system = withSize('medium', { containerHeight: 52, containerShape: 5, containerPaddingInlineStartWithIcon: 11, containerPaddingInlineEnd: 13, containerGap: 7, iconSize: 28, labelTypescale: 'bodyLarge' });
    await mount({}, { theme: 'light', system });
    expect(viewStyle(host())).toMatchObject({ minHeight: 52, borderRadius: 5, paddingStart: 11, paddingEnd: 13, gap: 7 });
    expect(viewStyle(part('icon')!)).toMatchObject({ width: 28, height: 28 });
    expect(textStyle(label()).fontSize).toBe(tanrei.typescale.bodyLarge.size);
  });
});

describe('accessibility', () => {
  test('role button; the label is the accessible name; the icon is decorative', async () => {
    await mount();
    expect(screen.getByRole('button', { name: LABEL })).toBe(host());
    expect(part('icon')!.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' });
  });

  test('decorative layers are hidden from assistive technology and from touches; the ref and caller handlers pass through', async () => {
    const ref = createRef<ExtendedFloatingActionButtonRef>();
    const onFocus = jest.fn();
    await mount({ ref, onFocus, style: { marginTop: 4 } });
    await fireEvent(host(), 'focus');
    for (const name of ['elevation-ring', 'focus-ring']) {
      expect(part(name)!.props.accessible).toBe(false);
      expect(viewStyle(part(name)!).pointerEvents).toBe('none');
    }
    expect(ref.current).not.toBeNull();
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(viewStyle(host()).marginTop).toBe(4);
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(extendedFabSubject);

  test('every fixture names the button (label); only filled-no-icon has no icon, and none collapses without one', () => {
    for (const fixture of spec.fixtures) {
      expect(fixture.props.label).toBeTruthy();
      if (fixture.props.expanded === false) expect(fixture.content).toBeTruthy();
    }
    expect(spec.fixtures.filter((fixture) => fixture.content === undefined).map((fixture) => fixture.id)).toEqual(['filled-no-icon']);
  });
});
