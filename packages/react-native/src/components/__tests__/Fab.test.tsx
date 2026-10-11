// FloatingActionButton — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/fab.spec.json; every behaviour id is cited by the test that covers it.
import { createRef, type ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, Text, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreFabSize, TanreiCoreFabVariant, TanreiFabSizeTokens, TanreiFabTokens, TanreiFabVariantStateTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { byTestID, describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resolveElevation } from '../../theme/elevation';
import { resetIconReport } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { toFontWeight } from '../../theme/typography';
import { FloatingActionButton, type FloatingActionButtonIconProps, type FloatingActionButtonProps, type FloatingActionButtonRef, type FloatingActionButtonSize, type FloatingActionButtonVariant } from '../Fab';
import { acme } from './__fixtures__/acme';
import { fabSubject } from './Fab.subject';

const spec = loadSpec('fab');
const { elevation, measure, state: sysState } = tanrei;
const colors: TanreiSystem['colors'] = tanrei.colors;
const tokens: TanreiFabTokens = tanrei.components.fab;
const medium = tokens.sizes.medium;
const ID = 'fab';
const LABEL = 'Create';

const { host, part } = byTestID(ID);
const glyph = () => part('glyph')!;

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });

const withFab = (overrides: Partial<TanreiFabTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'fab', overrides);
/** …with some tokens of one variant changed, per state. */
const withVariant = (variant: TanreiCoreFabVariant, overrides: { [State in InteractionState]?: Partial<TanreiFabVariantStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.fab.variants[variant];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withFab({ variants: { ...base.components.fab.variants, [variant]: { ...current, ...changed } } }, base);
};
/** …with some tokens of one size changed. */
const withSize = (size: TanreiCoreFabSize, overrides: Partial<TanreiFabSizeTokens>, base: TanreiSystem = tanrei): TanreiSystem =>
  withFab({ sizes: { ...base.components.fab.sizes, [size]: { ...base.components.fab.sizes[size], ...overrides } } }, base);
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });

function mount(props: Partial<FloatingActionButtonProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  const element: ReactElement = (
    <TanreiProvider {...provider}>
      <FloatingActionButton testID={ID} accessibilityLabel={LABEL} icon="add" {...props} />
    </TanreiProvider>
  );
  return render(element);
}

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

// The CORE values of the two axes: what every system has.
const variants: TanreiCoreFabVariant[] = ['filled', 'tonal', 'surface'];
const sizes: TanreiCoreFabSize[] = ['small', 'medium', 'large'];
const ACTIVE = ['hovered', 'focused', 'pressed'] as const;

/** The opacity of a state, written out independently of `stateShape`. */
const opacityOf = (from: TanreiFabTokens, in_: InteractionState) =>
  ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity })[in_];

/** Enter / Space / D-pad centre and assistive activation: a bare click (no press events, no touch data). */
const click = () => fireEvent(host(), 'press', { nativeEvent: { target: 1 } });

/** FAB-8: a press stays visible for `duration.pressHold`, so a release is over only after that. */
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

/** Everything FAB-3 / FAB-6 name — container, icon, elevation, opacity — from one state's tokens (and FAB-11's shape). */
function expectDrawnFrom(variant: TanreiCoreFabVariant, in_: InteractionState, from: TanreiFabTokens = tokens, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei, size: TanreiCoreFabSize = 'medium') {
  const paints = from.variants[variant][in_];
  const container = viewStyle(host());
  expect(container.backgroundColor).toBe(painted(paints.containerColor, scheme, system));
  expect(container.opacity).toBe(opacityOf(from, in_));
  expect(container.borderRadius).toBe(from.sizes[size].containerShape);
  expect(textStyle(glyph()).color).toBe(painted(paints.iconColor, scheme, system));
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
  // Most tests assert settled values; the animated path has its own tests.
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
    expect(platform.name).toBe(FloatingActionButton.name);
    expect(platform.props).toEqual({ variant: 'variant', size: 'size', disabled: 'disabled', label: 'accessibilityLabel' });
    expect(platform.events).toEqual({ click: 'onPress' });
  });

  test('the enum values under test are exactly the spec values, and they are the token axes', () => {
    const values = (name: string) => spec.props.find((p) => p.name === name)?.values;
    expect(values('variant')).toEqual(variants);
    expect(values('size')).toEqual(sizes);
    expect(Object.keys(tokens.variants)).toEqual(variants);
    expect(Object.keys(tokens.sizes)).toEqual(sizes);
  });

  test('defaults follow the spec: variant filled, size medium, enabled', async () => {
    await mount();
    expectDrawnFrom('filled', 'enabled');
    expect(viewStyle(host())).toMatchObject({ width: medium.containerSize, height: medium.containerSize });
    expect(host().props.accessibilityState).toEqual({ disabled: false });
  });
});

describe('behavior', () => {
  test('FAB-1: activating the FAB calls onPress exactly once — touch and a bare (keyboard / assistive) click alike', async () => {
    const onPress = jest.fn();
    await mount({ onPress });
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    await wait(HOLD + 30);
    await click();
    expect(onPress).toHaveBeenCalledTimes(2);
    // Keyboard and assistive activation reach a focusable, accessible Pressable as the same native click.
    expect(host().props.accessible).toBe(true);
    expect(host().props.focusable).toBe(true);
  });

  test('FAB-2: a disabled FAB does not call onPress, is not focusable and exposes disabled', async () => {
    const onPress = jest.fn();
    await mount({ onPress, disabled: true });
    await fireEvent.press(host());
    await click();
    expect(onPress).not.toHaveBeenCalled();
    expect(host().props.focusable).toBe(false);
    expect(host().props.accessibilityState).toEqual({ disabled: true });
    expect(host()).toBeDisabled();
    expect(screen.getByRole('button', { name: LABEL, disabled: true })).toBe(host());
    // A focus or hover event that still arrives shows no ring and leaves the disabled tokens in place.
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'hoverIn');
    expect(part('focus-ring')).toBeNull();
    expectDrawnFrom('filled', 'disabled');
  });

  describe.each(variants)('FAB-3: %s', (variant) => {
    test.each(ACTIVE)('%s: container, icon, elevation and opacity come from its tokens, and it returns to rest', async (target) => {
      await mount({ variant });
      expectDrawnFrom(variant, 'enabled');
      await enter(target);
      expectDrawnFrom(variant, target);
      if (target === 'hovered') await fireEvent(host(), 'hoverOut');
      if (target === 'focused') await fireEvent(host(), 'blur');
      if (target === 'pressed') await release();
      expectDrawnFrom(variant, 'enabled');
    });
  });

  test('FAB-3: precedence is pressed over focused over hovered, under the acme fixture system (which values each differently)', async () => {
    // The spec's `verify` hint: acme's state layers are 0.06 / 0.12 / 0.2, so each winner is observable with real tokens.
    const filled = acme.components.fab.variants.filled;
    const expected = (name: InteractionState) => painted(filled[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    expect(acme.behavior.pressedFeedback).toBe('overlay');
    await mount({ variant: 'filled' }, { theme: 'light', system: acme });
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

  test('FAB-3: in the default system hover raises the FAB (level4 against level3 at rest); focus and press keep level3', async () => {
    for (const variant of variants) {
      const each = tokens.variants[variant];
      expect([each.enabled, each.hovered, each.focused, each.pressed, each.disabled].map((t) => t.containerElevation)).toEqual(['level3', 'level4', 'level3', 'level3', 'level0']);
    }
    await mount();
    const rest = viewStyle(host()).boxShadow;
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host()).boxShadow).toEqual(resolveElevation(elevation.level4, (name) => role(name)).boxShadow);
    expect(viewStyle(host()).boxShadow).not.toEqual(rest);
  });

  test('FAB-3: in the default system a state is the container mixed with the variant\'s state-layer color, which is its icon color', async () => {
    for (const variant of variants) {
      const resting = tokens.variants[variant].enabled;
      expect(resting.stateLayerColor).toEqual(resting.iconColor);
      const mix = (amount: number): TanreiPaint => ({ kind: 'mix', base: resting.containerColor, with: resting.stateLayerColor, amount });
      const view = await mount({ variant });
      await fireEvent(host(), 'hoverIn');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(sysState.hoverStateLayerOpacity)));
      await fireEvent(host(), 'focus');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(sysState.focusStateLayerOpacity)));
      await fireEvent(host(), 'pressIn');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(sysState.pressedStateLayerOpacity)));
      await view.unmount();
    }
  });

  test('FAB-3: focus gained by touch or pointer does not select the focused state', async () => {
    const system = withVariant('filled', { focused: { containerColor: literal(2, 0, 0) } });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await release();
    expectDrawnFrom('filled', 'enabled', system.components.fab, 'light', system);
  });

  test('FAB-4: keyboard focus shows the focus ring at the focus offset around the size\'s corners, without animation', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    expect(part('focus-ring')).toBeNull();
    timing.mockClear();
    await fireEvent(host(), 'focus');
    const ring = part('focus-ring')!;
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(ring)).toEqual({
      position: 'absolute',
      top: -reach,
      right: -reach,
      bottom: -reach,
      left: -reach,
      borderWidth: measure.focus.outerWidth,
      borderColor: role('focusRing'),
      borderRadius: medium.containerShape + reach,
      pointerEvents: 'none',
    });
    expect(timing).not.toHaveBeenCalled();
    // The ring is outside the box: the square does not change.
    expect(viewStyle(host())).toMatchObject({ width: medium.containerSize, height: medium.containerSize });
    expect(viewStyle(host()).borderWidth).toBeUndefined();
    await fireEvent(host(), 'blur');
    expect(part('focus-ring')).toBeNull();
  });

  test('FAB-4: focus gained by touch or pointer does not show the focus ring; a later keyboard focus does', async () => {
    await mount();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).toBeNull();
    await release();
    expect(part('focus-ring')).toBeNull();
    await fireEvent(host(), 'blur');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).not.toBeNull();
  });

  test.each([
    { size: 'small' as const, slop: 4 },
    { size: 'medium' as const, slop: 0 },
    { size: 'large' as const, slop: 0 },
  ])('FAB-5: the $size square meets sys.target.touch on both axes, before and after layout, without changing its size', async ({ size, slop }) => {
    await mount({ size });
    const side = tokens.sizes[size].containerSize;
    // Before the first layout pass: from the size's token square.
    expect(host().props.hitSlop).toEqual({ top: slop, bottom: slop, left: slop, right: slop });
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: side, height: side } } });
    const hit = host().props.hitSlop;
    expect(side + hit.left + hit.right).toBeGreaterThanOrEqual(measure.target.touch);
    expect(side + hit.top + hit.bottom).toBeGreaterThanOrEqual(measure.target.touch);
    expect(viewStyle(host())).toMatchObject({ width: side, height: side });
  });

  test('FAB-5: the target comes from the system', async () => {
    const system: TanreiSystem = { ...tanrei, measure: { ...measure, target: { ...measure.target, touch: 60 } } };
    await mount({}, { theme: 'light', system });
    expect(host().props.hitSlop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
  });

  test.each(variants)('FAB-6: disabled %s renders container, icon, elevation and opacity from its disabled tokens', async (variant) => {
    await mount({ variant, disabled: true });
    expectDrawnFrom(variant, 'disabled');
  });

  test('FAB-6: in the default system a disabled FAB is an on-surface fill at the container opacity with an on-surface icon at the content opacity, and nothing raised', async () => {
    const onSurface = colors.light.onSurface;
    for (const variant of variants) {
      const view = await mount({ variant, disabled: true });
      expect(viewStyle(host()).backgroundColor).toBe(formatColor({ ...onSurface, a: sysState.disabledContainerOpacity }));
      expect(textStyle(glyph()).color).toBe(formatColor({ ...onSurface, a: sysState.disabledContentOpacity }));
      expect(viewStyle(host()).boxShadow).toBeUndefined();
      expect(part('elevation-ring')).toBeNull();
      await view.unmount();
    }
  });

  test('FAB-6: a disabled state re-valued by a layer is drawn as given (opacity included)', async () => {
    const system = withVariant('tonal', { disabled: { containerColor: literal(1, 2, 3), iconColor: literal(4, 5, 6), containerElevation: 'level1' } }, withFab({ disabledOpacity: 0.5 }));
    await mount({ variant: 'tonal', disabled: true }, { theme: 'light', system });
    expect(viewStyle(host())).toMatchObject({ backgroundColor: 'rgb(1, 2, 3)', opacity: 0.5 });
    expect(textStyle(glyph()).color).toBe('rgb(4, 5, 6)');
    expectDrawnFrom('tonal', 'disabled', system.components.fab, 'light', system);
  });
});

describe('press hold', () => {
  test('FAB-8: the pressed state appears in the same frame and stays visible for duration.pressHold although the press ended sooner', async () => {
    expect(HOLD).toBe(100);
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

  test('FAB-8: Enter / Space / assistive activation — a bare click — shows the pressed state for the hold', async () => {
    await mount({ variant: 'tonal' });
    await click();
    expectDrawnFrom('tonal', 'pressed');
    await wait(HOLD + 30);
    expectDrawnFrom('tonal', 'enabled');
  });
});

describe('choices of kind: system.behavior', () => {
  const LAYOUT = { nativeEvent: { layout: { x: 0, y: 0, width: medium.containerSize, height: medium.containerSize } } };

  test('FAB-9 overlay (the default): the pressed tokens reach the whole container at once; no extra node exists', async () => {
    reduceMotion(false);
    await mount({ variant: 'surface' });
    await fireEvent(host(), 'layout', LAYOUT);
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expectDrawnFrom('surface', 'pressed');
    expect(part('ripple')).toBeNull();
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  describe('FAB-9 ripple (m3-like)', () => {
    const fab = m3Like.components.fab;
    const color = (paint: TanreiPaint) => painted(paint, 'light', m3Like);

    test('the pressed container color grows from the point of contact over comp.fab.motion.feedback-duration; the container keeps the state under the press; icon and elevation are the pressed ones; it fades over the state duration', async () => {
      reduceMotion(false);
      const timing = jest.spyOn(Animated, 'timing');
      const ref = createRef<FloatingActionButtonRef>();
      const side = fab.sizes.medium.containerSize;
      await mount({ ref, variant: 'tonal' }, { theme: 'light', system: m3Like });
      (ref.current as unknown as { measure: unknown }).measure = (callback: (...box: number[]) => void) => callback(0, 0, side, side, 300, 500);
      await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: side, height: side } } });
      expect(part('ripple')).toBeNull();
      timing.mockClear();
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 310, pageY: 510 } });

      const tonal = fab.variants.tonal;
      expect(viewStyle(host()).backgroundColor).toBe(color(tonal.enabled.containerColor));
      expect(viewStyle(host()).boxShadow).toEqual(resolveElevation(m3Like.elevation[tonal.pressed.containerElevation], (name) => role(name, 'light', m3Like)).boxShadow);
      expect(viewStyle(part('ripple')!)).toMatchObject({ position: 'absolute', overflow: 'hidden', pointerEvents: 'none', borderRadius: fab.sizes.medium.containerShape });
      const reach = Math.hypot(side - 10, side - 10);
      expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 10 - reach, top: 10 - reach, width: reach * 2, backgroundColor: color(tonal.pressed.containerColor) });
      // Below the icon, hidden from assistive technology.
      expect(host().children.indexOf(part('ripple')!)).toBeLessThan(host().children.indexOf(part('icon')!));
      expect(part('ripple')!.props.accessible).toBe(false);
      expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: fab.motionFeedbackDuration, useNativeDriver: true });

      timing.mockClear();
      await release();
      expect(timing.mock.calls.some(([, config]) => config.toValue === 0 && config.duration === fab.motionStateDuration)).toBe(true);
      await wait(fab.motionStateDuration * 2 + 50);
      expect(part('ripple')).toBeNull();
    });

    test('keyboard activation ripples from the center; with reduce motion nothing grows and the pressed tokens apply at once', async () => {
      reduceMotion(false);
      const side = fab.sizes.medium.containerSize;
      const view = await mount({}, { theme: 'light', system: m3Like });
      await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: side, height: side } } });
      await click();
      const reach = Math.hypot(side / 2, side / 2);
      expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: side / 2 - reach, top: side / 2 - reach, width: reach * 2 });
      await wait(HOLD + 30);
      await wait(fab.motionStateDuration * 2 + 50);
      await view.unmount();

      reduceMotion(true);
      await mount({}, { theme: 'light', system: m3Like });
      await fireEvent(host(), 'layout', LAYOUT);
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
      expect(part('ripple')).toBeNull();
      expect(viewStyle(host()).backgroundColor).toBe(color(fab.variants.filled.pressed.containerColor));
      await release();
    });
  });

  test('FAB-9 dim: the pressed opacity on the whole control and NO state layer — the container keeps the state under the press; icon and elevation come from the pressed tokens', async () => {
    const system = withBehavior({ pressedFeedback: 'dim' }, withVariant('filled', { pressed: { iconColor: literal(10, 20, 30), containerElevation: 'level1' } }, withFab({ pressedOpacity: 0.5 })));
    await mount({ variant: 'filled' }, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host())).toMatchObject({ opacity: 0.5, backgroundColor: painted(tokens.variants.filled.hovered.containerColor) });
    expect(textStyle(glyph()).color).toBe('rgb(10, 20, 30)');
    expect(viewStyle(host()).boxShadow).toEqual(resolveElevation(elevation.level1, (name) => role(name)).boxShadow.length ? resolveElevation(elevation.level1, (name) => role(name)).boxShadow : undefined);
    expect(part('ripple')).toBeNull();
    await release();
    expect(viewStyle(host()).opacity).toBe(tokens.hoveredOpacity);
  });

  test('FAB-9 none: no answer to the press — every part stays with the state under the press; the click still happens', async () => {
    const onPress = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withVariant('filled', { pressed: { containerColor: literal(1, 2, 3), iconColor: literal(10, 20, 30), containerElevation: 'level5' } }, withFab({ pressedOpacity: 0.5 })));
    await mount({ variant: 'filled', onPress }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('filled', 'enabled', system.components.fab, 'light', system);
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    await release();
  });

  test('FAB-10 corner smoothing: an amount above 0 (cupertino: 0.6) reaches the container, the elevation ring and the focus ring as the OS curve; 0 adds nothing', async () => {
    expect(tanrei.shape.cornerSmoothing).toBe(0);
    const view = await mount();
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBeUndefined();
    await view.unmount();

    expect(cupertino.shape.cornerSmoothing).toBe(0.6);
    await mount({}, { theme: 'light', system: cupertino });
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBe('continuous');
    if (part('elevation-ring')) expect(viewStyle(part('elevation-ring')!).borderCurve).toBe('continuous');
  });

  test('FAB-10 corner smoothing on Android: circular whatever the amount', async () => {
    const os = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    try {
      await mount({}, { theme: 'light', system: cupertino });
      expect(viewStyle(host()).borderCurve).toBeUndefined();
    } finally {
      os.restore();
    }
  });

  test('FAB-10 focus-style: glow (acme) draws the focus colors as ONE halo around the size\'s corners', async () => {
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(host(), 'focus');
    const { offset, innerWidth, outerWidth } = acme.measure.focus;
    expect(acme.behavior.focusStyle).toBe('glow');
    expect(viewStyle(part('focus-ring')!)).toMatchObject({
      borderRadius: acme.components.fab.sizes.medium.containerShape + offset,
      boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: outerWidth, spreadDistance: innerWidth + outerWidth, color: painted({ kind: 'role', role: 'focusRing' }, 'light', acme) }],
    });
    expect(part('focus-ring')!.props.accessible).toBe(false);
  });
});

describe('geometry and the icon (FAB-11)', () => {
  test.each(sizes)('FAB-11: %s is a square of its container size with its own corners, and the glyph at its icon size in the unselected family at the system weight', async (size) => {
    await mount({ size });
    const { containerSize, containerShape, iconSize } = tokens.sizes[size];
    expect(viewStyle(host())).toMatchObject({ width: containerSize, height: containerSize, borderRadius: containerShape, alignItems: 'center', justifyContent: 'center' });
    expect(viewStyle(host()).minHeight).toBeUndefined();
    expect(viewStyle(part('icon')!)).toMatchObject({ width: iconSize, height: iconSize });
    expect(textStyle(glyph())).toMatchObject({ fontFamily: tanrei.icon.family.unselected.families[0], fontSize: iconSize, lineHeight: iconSize, fontWeight: toFontWeight(tanrei.icon.weight) });
    expect(glyph().props.children).toBe('add');
  });

  test('FAB-11: the default sizes are 40 / 48 / 64 with corners 8 / 12 / 16 and icons 20 / 24 / 24 (sys.icon.medium / large / large)', () => {
    expect(sizes.map((size) => tokens.sizes[size].containerSize)).toEqual([40, 48, 64]);
    expect(sizes.map((size) => tokens.sizes[size].containerShape)).toEqual([tanrei.shape.medium, tanrei.shape.large, tanrei.shape.extraLarge]);
    expect(sizes.map((size) => tokens.sizes[size].containerShape)).toEqual([8, 12, 16]);
    expect(sizes.map((size) => tokens.sizes[size].iconSize)).toEqual([measure.icon.medium, measure.icon.large, measure.icon.large]);
    // The medium FAB is exactly the touch target.
    expect(medium.containerSize).toBe(measure.target.touch);
  });

  test('FAB-11: the glyph is never drawn selected — unselected FILL, opsz the icon size clamped to the font\'s range; a function icon receives it with the color and size', async () => {
    const seen: FloatingActionButtonIconProps[] = [];
    const icon = (props: FloatingActionButtonIconProps) => (seen.push(props), <View />);
    for (const size of sizes) {
      const view = await mount({ size, icon }, { theme: 'dark' });
      await view.unmount();
    }
    const last = (size: TanreiCoreFabSize) => seen.filter((each) => each.size === tokens.sizes[size].iconSize).at(-1)!;
    const { opticalSizeMin, opticalSizeMax } = tanrei.icon;
    for (const size of sizes) {
      const { glyph: drawn, color } = last(size);
      expect(drawn.axes).toMatchObject({ FILL: tanrei.icon.fillUnselected, wght: tanrei.icon.weight, opsz: Math.min(opticalSizeMax, Math.max(opticalSizeMin, tokens.sizes[size].iconSize)) });
      expect(drawn.family).toBe(tanrei.icon.family.unselected.families[0]);
      expect(color).toBe(painted(tokens.variants.filled.enabled.iconColor, 'dark'));
    }
    expect(part('glyph')).toBeNull();
  });

  test('FAB-11: any other node is rendered as given, in the icon box; without an icon the square is still drawn', async () => {
    const view = await mount({ icon: <Text testID="custom">+</Text> });
    expect(screen.getByTestId('custom', { includeHiddenElements: true })).toBeTruthy();
    expect(part('glyph')).toBeNull();
    expect(viewStyle(part('icon')!)).toMatchObject({ width: medium.iconSize, height: medium.iconSize });
    await view.unmount();
    await mount({ icon: undefined });
    expect(part('icon')).toBeNull();
    expect(viewStyle(host())).toMatchObject({ width: medium.containerSize, height: medium.containerSize });
  });

  test('FAB-11: the provider\'s resolveIconFont maps the family and axes to the font the app loaded', async () => {
    const resolveIconFont = jest.fn(() => 'Loaded-Icons');
    await mount({}, { theme: 'light', resolveIconFont });
    expect(textStyle(glyph()).fontFamily).toBe('Loaded-Icons');
    expect(resolveIconFont).toHaveBeenCalledWith(tanrei.icon.family.unselected.families[0], expect.objectContaining({ FILL: tanrei.icon.fillUnselected }));
  });
});

describe('elevation (FAB-12)', () => {
  test.each(variants)('FAB-12: %s casts the elevation of its variant at rest outside the container, as boxShadow layers and the elevation ring, without clipping', async (variant) => {
    await mount({ variant });
    const [ringLayer, ...shadowLayers] = elevation[tokens.variants[variant].enabled.containerElevation];
    expect(ringLayer!.spread).toBeGreaterThan(0);
    expect(viewStyle(part('elevation-ring')!)).toMatchObject({ position: 'absolute', borderWidth: ringLayer!.spread, pointerEvents: 'none' });
    expect((viewStyle(host()).boxShadow as unknown[]).length).toBe(shadowLayers.length);
    expect(viewStyle(host()).overflow).toBeUndefined();
    expect(part('elevation-ring')!.props.accessible).toBe(false);
  });

  // Reads a transition MID-WAY on real timers: 600 ms, so that it outlasts a re-render on a loaded machine.
  test('FAB-12: hover moves every shadow layer and the ring color with the motion tokens; settled, the style is the plain boxShadow', async () => {
    reduceMotion(false);
    const system = withFab({ motionStateDuration: 600 });
    const from = resolveElevation(elevation.level3, (name) => role(name));
    const to = resolveElevation(elevation.level4, (name) => role(name));
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    await mount({}, { theme: 'light', system });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    expect(viewStyle(host()).boxShadow).toEqual(from.boxShadow);

    interpolate.mockClear();
    timing.mockClear();
    await fireEvent(host(), 'hoverIn');
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: 600, useNativeDriver: false });
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    expect(ranges).toContainEqual([from.boxShadow[0]!.offsetY, to.boxShadow[0]!.offsetY]);
    expect(ranges).toContainEqual([from.boxShadow[0]!.blurRadius, to.boxShadow[0]!.blurRadius]);
    expect(ranges).toContainEqual([painted(tokens.variants.filled.enabled.containerColor), painted(tokens.variants.filled.hovered.containerColor)]);
    await wait(900);
    expect(viewStyle(host()).boxShadow).toEqual(to.boxShadow);
  });

  test('FAB-12: a press is immediate; with reduce motion every change is at once', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    timing.mockClear();
    await fireEvent(host(), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    expectDrawnFrom('filled', 'pressed');
    await release();
    await wait(tokens.motionStateDuration * 2);

    reduceMotion(true);
    await screen.unmount();
    await mount();
    await wait(10);
    timing.mockClear();
    await fireEvent(host(), 'hoverIn');
    expect(timing).not.toHaveBeenCalled();
    expectDrawnFrom('filled', 'hovered');
  });

  test('FAB-12: becoming disabled fades the ring instead of popping it', async () => {
    reduceMotion(false);
    const system = withFab({ motionStateDuration: 600 });
    const view = await mount({}, { theme: 'light', system });
    expect(part('elevation-ring')).not.toBeNull();
    await view.rerender(
      <TanreiProvider theme="light" system={system}>
        <FloatingActionButton testID={ID} accessibilityLabel={LABEL} icon="add" disabled />
      </TanreiProvider>,
    );
    expect(part('elevation-ring')).not.toBeNull();
    await wait(900);
    expect(part('elevation-ring')).toBeNull();
    expect(viewStyle(host()).boxShadow).toBeUndefined();
  });
});

describe('layout (FAB-13)', () => {
  test('FAB-13: the FAB does not position itself — no absolute position, no inset, no scrim; the caller\'s style places it', async () => {
    const view = await mount();
    const box = viewStyle(host());
    for (const key of ['position', 'top', 'right', 'bottom', 'left', 'start', 'end', 'zIndex'] as const) expect(box[key]).toBeUndefined();
    expect(box.alignSelf).toBe('flex-start');
    // Only its own parts: elevation ring and icon (no scrim, nothing that covers content).
    expect(view.toJSON()).toMatchObject({ children: [expect.objectContaining({ type: 'View' }), expect.objectContaining({ type: 'View' })] });
    await view.unmount();
    await mount({ style: { position: 'absolute', end: 16, bottom: 16 } });
    expect(viewStyle(host())).toMatchObject({ position: 'absolute', end: 16, bottom: 16, width: medium.containerSize });
  });
});

describe('open size and variant keys', () => {
  const unknown = (size: string, variant: string) => ({ size: size as FloatingActionButtonSize, variant: variant as FloatingActionButtonVariant });
  const development = (enabled: boolean) => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
  };
  afterEach(() => development(true));

  test('FAB-7: an unknown size and an unknown variant render exactly like the default values, in every state', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reference = await mount({ size: 'medium', variant: 'filled' });
    const expected = JSON.stringify(reference.toJSON());
    await reference.unmount();
    const view = await mount(unknown('jumbo', 'ghost'));
    expect(JSON.stringify(view.toJSON())).toBe(expected);
    for (const target of ACTIVE) {
      await enter(target);
      expectDrawnFrom('filled', target);
    }
  });

  test('FAB-7: each axis falls back on its own', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = await mount({ size: 'jumbo' as FloatingActionButtonSize, variant: 'surface' });
    expect(viewStyle(host()).width).toBe(medium.containerSize);
    expectDrawnFrom('surface', 'enabled');
    await first.unmount();
    await mount({ size: 'large', variant: 'ghost' as FloatingActionButtonVariant });
    expect(viewStyle(host()).width).toBe(tokens.sizes.large.containerSize);
    expectDrawnFrom('filled', 'enabled', tokens, 'light', tanrei, 'large');
  });

  test('FAB-7: development builds report the unknown value once per key; release builds say nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (let i = 0; i < 2; i += 1) {
      const view = await mount(unknown('colossal', 'phantom'));
      await view.unmount();
    }
    const reports = (needle: string) => warn.mock.calls.filter(([message]) => String(message).includes(needle));
    expect(reports('no FloatingActionButton size "colossal"; using "medium"')).toHaveLength(1);
    expect(reports('no FloatingActionButton variant "phantom"; using "filled"')).toHaveLength(1);

    warn.mockClear();
    development(false);
    await mount(unknown('titanic', 'spectre'));
    expectDrawnFrom('filled', 'enabled');
    expect(warn).not.toHaveBeenCalled();
  });

  test('a known value is never reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const variant of variants) {
      for (const size of sizes) {
        const view = await mount({ size, variant });
        await view.unmount();
      }
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('accessible name (FAB-14)', () => {
  const development = (enabled: boolean) => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
  };
  afterEach(() => development(true));
  const unnamedReports = (spy: jest.SpyInstance) => spy.mock.calls.filter(([message]) => String(message).includes('has no accessibilityLabel'));

  test('FAB-14: without a label the FAB still renders and works, and development builds report it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onPress = jest.fn();
    await mount({ accessibilityLabel: undefined, onPress });
    expect(host().props.accessibilityRole).toBe('button');
    expect(glyph().props.children).toBe('add');
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(unnamedReports(warn)).toHaveLength(1);
    expect(String(unnamedReports(warn)[0]![0])).toContain(`testID "${ID}"`);
  });

  test('FAB-14: an empty or blank label is no name either; aria-label is one; a release build says nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const blank = await mount({ accessibilityLabel: '  ' });
    expect(unnamedReports(warn)).toHaveLength(1);
    await blank.unmount();
    warn.mockClear();
    const aria = await mount({ accessibilityLabel: undefined, 'aria-label': LABEL });
    expect(unnamedReports(warn)).toHaveLength(0);
    expect(screen.getByRole('button', { name: LABEL })).toBe(host());
    await aria.unmount();
    development(false);
    await mount({ accessibilityLabel: '' });
    expect(warn).not.toHaveBeenCalled();
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
    test.each(variants)('%s resolves container, icon and elevation from its paints in this scheme, at rest and hovered', async (variant) => {
      await mount({ variant }, provider);
      expectDrawnFrom(variant, 'enabled', tokens, scheme);
      await fireEvent(host(), 'hoverIn');
      expectDrawnFrom(variant, 'hovered', tokens, scheme);
    });
  });

  test('in the default palette the three variants have three different containers, in light and dark', () => {
    for (const scheme of ['light', 'dark'] as const) {
      expect(new Set(variants.map((variant) => painted(tokens.variants[variant].enabled.containerColor, scheme))).size).toBe(3);
    }
    expect(painted(tokens.variants.filled.enabled.containerColor)).toBe(role('primary'));
    expect(painted(tokens.variants.tonal.enabled.containerColor)).toBe(role('secondaryContainer'));
    expect(painted(tokens.variants.surface.enabled.containerColor)).toBe(role('surfaceContainerLowest'));
    expect(painted(tokens.variants.surface.enabled.iconColor)).toBe(role('primary'));
  });
});

describe('the system drives rendering', () => {
  test('a size re-valued by a layer reaches the square, its corners, the icon box, the glyph, the focus ring and the target', async () => {
    const system = withSize('medium', { containerSize: 44, containerShape: 5, iconSize: 28 });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'focus');
    expect(viewStyle(host())).toMatchObject({ width: 44, height: 44, borderRadius: 5 });
    expect(viewStyle(part('icon')!)).toMatchObject({ width: 28, height: 28 });
    expect(textStyle(glyph())).toMatchObject({ fontSize: 28, lineHeight: 28 });
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(part('focus-ring')!).borderRadius).toBe(5 + reach);
    expect(host().props.hitSlop).toEqual({ top: 2, bottom: 2, left: 2, right: 2 });
  });

  test('a pressed opacity of 0.4 reaches the whole control', async () => {
    const system = withFab({ pressedOpacity: 0.4 });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).opacity).toBe(0.4);
    await release();
  });
});

describe('accessibility', () => {
  test('role button; accessibilityLabel is the accessible name; the glyph is decorative and never part of it', async () => {
    await mount();
    expect(host().props.accessibilityRole).toBe('button');
    expect(screen.getByRole('button', { name: LABEL })).toBe(host());
    expect(part('icon')!.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' });
    expect(screen.queryByText('add')).toBeNull();
  });

  test('text size does not change the square: the glyph does not scale with the font (200% text size), and the label is still the name', async () => {
    Dimensions.set({ window: { ...WINDOW, fontScale: 2 }, screen: { ...WINDOW, fontScale: 2 } });
    try {
      await mount();
      expect(glyph().props.allowFontScaling).toBe(false);
      expect(viewStyle(host())).toMatchObject({ width: medium.containerSize, height: medium.containerSize });
      expect(screen.getByRole('button', { name: LABEL })).toBe(host());
    } finally {
      Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
    }
  });

  test('decorative layers are hidden from assistive technology and from touches', async () => {
    await mount();
    await fireEvent(host(), 'focus');
    for (const name of ['elevation-ring', 'focus-ring']) {
      expect(part(name)!.props.accessible).toBe(false);
      expect(part(name)!.props.importantForAccessibility).toBe('no');
      expect(viewStyle(part(name)!).pointerEvents).toBe('none');
    }
  });

  test('forwards its ref to the underlying host view and passes caller handlers and layout style through', async () => {
    const ref = createRef<FloatingActionButtonRef>();
    const onPressIn = jest.fn();
    const onFocus = jest.fn();
    const onLayout = jest.fn();
    await mount({ ref, onPressIn, onFocus, onLayout, style: { marginTop: 4 } });
    expect(ref.current).not.toBeNull();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 48, height: 48 } } });
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(viewStyle(host()).marginTop).toBe(4);
    await release();
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(fabSubject);

  test('every fixture of the spec names the button (label), so none of them reports FAB-14', () => {
    for (const fixture of spec.fixtures) expect(fixture.props.label).toBeTruthy();
  });
});
