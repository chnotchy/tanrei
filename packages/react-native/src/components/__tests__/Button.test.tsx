// Button — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/button.spec.json; every behaviour id is cited by the test that covers it.
import { createRef, type ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Easing, Text, View, type TextStyle } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type {
  TanreiButtonSizeTokens,
  TanreiButtonTokens,
  TanreiButtonVariantStateTokens,
  TanreiColorRole,
  TanreiCoreButtonSize,
  TanreiCoreButtonVariant,
  TanreiPaint,
  TanreiScheme,
  TanreiSystem,
  TanreiTypescale,
} from '../../generated/vocabulary';
import { resolveInteractionState, type InteractionState } from '../../primitives/interaction';
import { minimumTargetHitSlop } from '../../primitives/minimumTarget';
import { resolveElevation } from '../../theme/elevation';
import { lookupValue } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, useTanrei, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { toFontWeight, typescaleStyle } from '../../theme/typography';
import { byTestID, describeFixtureBaselines, textStyle, viewStyle, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { Button, type ButtonProps, type ButtonRef, type ButtonSize, type ButtonVariant } from '../Button';
import { acme } from './__fixtures__/acme';
import flatTokens from './__fixtures__/button-flat-tokens.tanrei.json';
import { buttonSubject } from './Button.subject';

// A product system may declare palettes the default system does not have (open-ended roles).
declare module '../../generated/vocabulary' {
  interface TanreiColorRoleRegistry {
    correct: true;
    onCorrect: true;
  }
}

const spec = loadSpec('button');
const { elevation, measure, state, typescale } = tanrei;
const colors: TanreiSystem['colors'] = tanrei.colors;
const tokens: TanreiButtonTokens = tanrei.components.button;
/** The default values of the two axes (spec defaults). */
const filled = tokens.variants.filled;
const medium = tokens.sizes.medium;
const ID = 'button';

const { host, part } = byTestID(ID);

/** What a paint must look like in a scheme of `system`. */
const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light') => formatColor(colors[scheme][name]!);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
/** The default system with some button tokens changed — what a preset or a product layer does. */
const withButton = (overrides: Partial<TanreiButtonTokens>, base: TanreiSystem = tanrei): TanreiSystem => ({
  ...base,
  components: { ...base.components, button: { ...base.components.button, ...overrides } },
});
/** …with some tokens of one variant changed, per state. */
const withVariant = (variant: TanreiCoreButtonVariant, overrides: { [State in InteractionState]?: Partial<TanreiButtonVariantStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.button.variants[variant];
  const changed = Object.fromEntries(Object.entries(overrides).map(([state, values]) => [state, { ...current[state as InteractionState], ...values }]));
  return withButton({ variants: { ...base.components.button.variants, [variant]: { ...current, ...changed } } }, base);
};
/** …with some tokens of one size changed. */
const withSize = (size: TanreiCoreButtonSize, overrides: Partial<TanreiButtonSizeTokens>, base: TanreiSystem = tanrei): TanreiSystem =>
  withButton({ sizes: { ...base.components.button.sizes, [size]: { ...base.components.button.sizes[size], ...overrides } } }, base);

function mount(props: Partial<ButtonProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  const element: ReactElement = (
    <TanreiProvider {...provider}>
      <Button testID={ID} {...props}>
        {props.children ?? 'Deploy'}
      </Button>
    </TanreiProvider>
  );
  return render(element);
}

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

// The CORE values of the two axes: what every system has. (Values a system adds: Button.extensions.test.tsx.)
const variants: TanreiCoreButtonVariant[] = ['filled', 'tonal', 'elevated', 'outlined', 'text'];
const sizes: TanreiCoreButtonSize[] = ['small', 'medium', 'large'];
/** The tokens a variant must be drawn from in a state: the variant's tokens of that state + the state's shape and opacity. */
const expectedTokens = (variant: TanreiCoreButtonVariant, in_: InteractionState, from: TanreiButtonTokens = tokens) => ({
  ...from.variants[variant][in_],
  opacity: in_ === 'enabled' ? 1 : from[`${in_}Opacity`],
  shape: in_ === 'enabled' ? from.containerShape : from[`${in_}ContainerShape`],
});
/** `undefined` when the paint draws nothing: the component then sets no fill / renders no outline. */
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light') => (evaluatePaint(paint, colors[scheme]).a === 0 ? undefined : painted(paint, scheme));

/**
 * Enter / Space / D-pad centre and assistive activation: React Native hands the Pressable a bare click — `onPress`
 * with no press-in/out and no touch data. (`fireEvent.press` builds a TOUCH event.)
 */
const click = () => fireEvent(host(), 'press', { nativeEvent: { target: 1 } });

/** BTN-8: a press stays visible for `duration.pressHold`, so a release is over only after that. */
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

function expectDrawnFrom(variant: TanreiCoreButtonVariant, in_: InteractionState, from: TanreiButtonTokens = tokens, scheme: TanreiScheme = 'light') {
  const expected = expectedTokens(variant, in_, from);
  const container = viewStyle(host());
  expect(container.backgroundColor).toBe(fill(expected.containerColor, scheme));
  expect(container.opacity).toBe(expected.opacity);
  expect(container.borderRadius).toBe(expected.shape);
  expect(textStyle(part('label')!).color).toBe(painted(expected.labelColor, scheme));
  const outline = fill(expected.outlineColor, scheme);
  if (outline === undefined) expect(part('outline')).toBeNull();
  else expect(viewStyle(part('outline')!)).toMatchObject({ borderColor: outline, borderWidth: from.sizes.medium.outlineWidth, borderRadius: expected.shape });
  const resolved = resolveElevation(elevation[expected.containerElevation], (name) => role(name, scheme));
  expect(container.boxShadow).toEqual(resolved.boxShadow.length ? resolved.boxShadow : undefined);
  if (resolved.ring) expect(viewStyle(part('elevation-ring')!)).toMatchObject({ borderColor: resolved.ring.color, borderWidth: resolved.ring.width });
  else expect(part('elevation-ring')).toBeNull();
}

beforeEach(() => {
  // Most tests assert settled values; the animated path has its own test.
  reduceMotion(true);
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Button.name);
    expect(platform.props).toEqual({ variant: 'variant', size: 'size', disabled: 'disabled' });
    expect(platform.events).toEqual({ click: 'onPress' });
  });

  test('the enum values under test are exactly the spec values', () => {
    const values = (name: string) => spec.props.find((p) => p.name === name)?.values;
    expect(values('variant')).toEqual(variants);
    expect(values('size')).toEqual(sizes);
  });

  test('defaults follow the spec: variant filled, size medium, enabled', async () => {
    await mount();
    expect(viewStyle(host()).backgroundColor).toBe(painted(filled.enabled.containerColor));
    expect(viewStyle(host()).minHeight).toBe(medium.containerHeight);
    expect(host().props.accessibilityState).toEqual({ disabled: false });
  });
});

describe('behavior', () => {
  test('BTN-1: activating the button calls onPress exactly once', async () => {
    const onPress = jest.fn();
    await mount({ onPress });
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    // Keyboard (Enter / Space / D-pad centre) and assistive-technology activation reach a
    // focusable, accessible Pressable as the same native click, so they share this path.
    expect(host().props.accessible).toBe(true);
    expect(host().props.focusable).toBe(true);
  });

  test('BTN-2: a disabled button does not call onPress, is not focusable and exposes disabled', async () => {
    const onPress = jest.fn();
    await mount({ onPress, disabled: true });
    await fireEvent.press(host());
    expect(onPress).not.toHaveBeenCalled();
    expect(host().props.focusable).toBe(false);
    expect(host().props.accessibilityState).toEqual({ disabled: true });
    expect(host()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deploy', disabled: true })).toBe(host());
    // A focus or hover event that still arrives shows no ring and leaves the disabled tokens in place.
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'hoverIn');
    expect(part('focus-ring')).toBeNull();
    expectDrawnFrom('filled', 'disabled');
  });

  test('BTN-3: hover, keyboard focus and press each draw the container from that state\'s tokens', async () => {
    await mount();
    expectDrawnFrom('filled', 'enabled');
    // There is no overlay element: the state is in the container's own values.
    expect(part('state-layer')).toBeNull();

    await fireEvent(host(), 'hoverIn');
    expectDrawnFrom('filled', 'hovered');
    expect(viewStyle(host()).backgroundColor).not.toBe(painted(filled.enabled.containerColor));
    await fireEvent(host(), 'hoverOut');
    expectDrawnFrom('filled', 'enabled');

    await fireEvent(host(), 'focus');
    expectDrawnFrom('filled', 'focused');
    await fireEvent(host(), 'blur');
    expectDrawnFrom('filled', 'enabled');

    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('filled', 'pressed');
    await release();
    expectDrawnFrom('filled', 'enabled');
  });

  test('BTN-3: precedence is pressed over focused over hovered', async () => {
    expect(resolveInteractionState({ hovered: true, focused: true, pressed: true })).toBe('pressed');
    expect(resolveInteractionState({ hovered: true, focused: true })).toBe('focused');
    expect(resolveInteractionState({ hovered: true })).toBe('hovered');
    expect(resolveInteractionState({})).toBe('enabled');
    expect(resolveInteractionState({ disabled: true, hovered: true, focused: true, pressed: true })).toBe('disabled');

    // Through the component, under the `acme` fixture system (the spec's `verify` hint): it values the hovered, focused
    // and pressed state layers differently (0.06 / 0.12 / 0.2), so the winner is observable with REAL tokens — the
    // default system gives pressed and focused the same opacity. Nothing is overridden in memory here.
    const button = acme.components.button.variants.filled;
    const expected = (name: InteractionState) => painted(button[name].containerColor, 'light', acme);
    expect(new Set(['enabled', 'hovered', 'focused', 'pressed'].map((name) => expected(name as InteractionState))).size).toBe(4);
    expect(acme.behavior.pressedFeedback).toBe('overlay');
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

  describe.each(variants)('BTN-3: %s', (variant) => {
    test.each(['hovered', 'focused', 'pressed'] as const)('%s renders container, label, outline, elevation, opacity and shape from its tokens', async (target) => {
      await mount({ variant });
      await enter(target);
      expectDrawnFrom(variant, target);
    });
  });

  test('BTN-3: in the default system a state is the container mixed with the label at the sys.state opacity', async () => {
    // The visual result of the former state-layer overlay, now a value of the `tanrei` system.
    await mount({ variant: 'tonal' });
    const mix = (amount: number): TanreiPaint => ({ kind: 'mix', base: tokens.variants.tonal.enabled.containerColor, with: tokens.variants.tonal.enabled.labelColor, amount });
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host()).backgroundColor).toBe(painted(mix(state.hoverStateLayerOpacity)));
    await fireEvent(host(), 'focus');
    expect(viewStyle(host()).backgroundColor).toBe(painted(mix(state.focusStateLayerOpacity)));
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).backgroundColor).toBe(painted(mix(state.pressedStateLayerOpacity)));
  });

  test('BTN-3: focus gained by touch or pointer does not select the focused state', async () => {
    const system = withVariant('filled', { focused: { containerColor: literal(2, 0, 0) } });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await release();
    expectDrawnFrom('filled', 'enabled');
  });

  test('BTN-3: state changes animate with the motion tokens, press is immediate, reduce-motion disables the animation', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    await mount();
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    const curve = bezier.mock.results[0]!.value;
    expect(timing).not.toHaveBeenCalled();

    await fireEvent(host(), 'hoverIn');
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: tokens.motionStateDuration, easing: curve, useNativeDriver: false });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, tokens.motionStateDuration * 2));
    });

    timing.mockClear();
    await fireEvent(host(), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    expect(viewStyle(host()).backgroundColor).toBe(painted(filled.pressed.containerColor));
    await release();
    expect(timing).toHaveBeenCalledTimes(1);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, tokens.motionStateDuration * 2));
    });
  });

  test('BTN-3: a transition runs from the values on screen to the new state\'s values', async () => {
    reduceMotion(false);
    const system = withVariant('filled', { hovered: { containerColor: literal(255, 0, 0) } }, withButton({ motionStateDuration: 40, hoveredOpacity: 0.5, hoveredContainerShape: 20 }));
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await mount({}, { theme: 'light', system });
    interpolate.mockClear();
    await fireEvent(host(), 'hoverIn');
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    expect(ranges).toContainEqual([painted(filled.enabled.containerColor), 'rgb(255, 0, 0)']);
    expect(ranges).toContainEqual([1, 0.5]);
    expect(ranges).toContainEqual([tokens.containerShape, 20]);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120));
    });
  });

  test('BTN-3: with reduce motion on, no animation is started', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    timing.mockClear();
    await fireEvent(host(), 'hoverIn');
    await fireEvent(host(), 'focus');
    expect(timing).not.toHaveBeenCalled();
    expectDrawnFrom('filled', 'focused');
  });

  test('BTN-4: keyboard focus shows the focus ring at the focus offset, without animation', async () => {
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
      borderRadius: tokens.focusedContainerShape + reach,
      pointerEvents: 'none',
    });
    // The default system has no inner stroke.
    expect(measure.focus.innerWidth).toBe(0);
    expect(part('focus-ring.inner')).toBeNull();
    // Never animated: a plain View with constant style, and (reduce motion is on) no timing at all.
    expect(ring.type).toBe('View');
    expect(timing).not.toHaveBeenCalled();
    // The ring is outside the box: the container's own size and style do not change.
    expect(viewStyle(host()).minHeight).toBe(medium.containerHeight);
    expect(viewStyle(host()).borderWidth).toBeUndefined();

    await fireEvent(host(), 'blur');
    expect(part('focus-ring')).toBeNull();
  });

  test('BTN-4: the ring itself is not animated even when state changes are', async () => {
    reduceMotion(false);
    await mount();
    await fireEvent(host(), 'focus');
    const style = viewStyle(part('focus-ring')!);
    expect(style.borderColor).toBe(role('focusRing'));
    expect(typeof style.borderRadius).toBe('number');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, tokens.motionStateDuration * 2));
    });
  });

  test('BTN-4: focus gained by touch or pointer does not show the focus ring', async () => {
    await mount();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).toBeNull();
    await release();
    expect(part('focus-ring')).toBeNull();
    // A later keyboard focus does show it.
    await fireEvent(host(), 'blur');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).not.toBeNull();
  });

  test('BTN-4: the focus ring uses the focusRing role of the active scheme', async () => {
    await mount({}, { theme: 'dark', contrast: 'high' });
    await fireEvent(host(), 'focus');
    expect(viewStyle(part('focus-ring')!).borderColor).toBe(role('focusRing', 'darkHigh'));
  });

  test('BTN-5: a 36 × 36 visual box gets a hit area of at least sys.target.touch on both axes', async () => {
    await mount();
    const layout = { x: 0, y: 0, width: medium.containerHeight, height: medium.containerHeight };
    await fireEvent(host(), 'layout', { nativeEvent: { layout } });
    const slop = host().props.hitSlop;
    expect(slop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
    expect(layout.width + slop.left + slop.right).toBeGreaterThanOrEqual(measure.target.touch);
    expect(layout.height + slop.top + slop.bottom).toBeGreaterThanOrEqual(measure.target.touch);
    // …without changing the visual size.
    expect(viewStyle(host()).minHeight).toBe(medium.containerHeight);
    expect(viewStyle(host()).minWidth).toBeUndefined();
  });

  test('BTN-5: each axis is extended independently and never shrunk', async () => {
    await mount();
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 36 } } });
    expect(host().props.hitSlop).toEqual({ top: 6, bottom: 6, left: 0, right: 0 });
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 40, height: 64 } } });
    expect(host().props.hitSlop).toEqual({ top: 0, bottom: 0, left: 4, right: 4 });
    // Odd differences round up so the target is always met.
    expect(minimumTargetHitSlop({ width: 41, height: 33 }, measure.target.touch)).toEqual({ top: 8, bottom: 8, left: 4, right: 4 });
    expect(minimumTargetHitSlop({ width: 10, height: 10 }, measure.target.pointer)).toEqual({ top: 17, bottom: 17, left: 17, right: 17 });
  });

  test.each(sizes)('BTN-5: before layout the %s size already meets the target from its token height', async (size) => {
    await mount({ size });
    const { top, bottom, left, right } = host().props.hitSlop;
    const height = tokens.sizes[size].containerHeight;
    expect(height + top + bottom).toBeGreaterThanOrEqual(measure.target.touch);
    expect(height + left + right).toBeGreaterThanOrEqual(measure.target.touch);
  });

  test('BTN-5: the target comes from the system', async () => {
    const system: TanreiSystem = { ...tanrei, measure: { ...measure, target: { ...measure.target, touch: 60 } } };
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 36 } } });
    expect(host().props.hitSlop).toEqual({ top: 12, bottom: 12, left: 0, right: 0 });
  });

  test.each(variants)('BTN-6: disabled %s renders container, label, outline, elevation, opacity and shape from its disabled tokens', async (variant) => {
    await mount({ variant, disabled: true });
    expectDrawnFrom(variant, 'disabled');
  });

  test('BTN-6: in the default system disabled is on-surface at the sys.state disabled opacities, without elevation', async () => {
    const onSurface = colors.light.onSurface;
    const container = formatColor({ ...onSurface, a: state.disabledContainerOpacity });
    const content = formatColor({ ...onSurface, a: state.disabledContentOpacity });
    const elevated = await mount({ variant: 'elevated', disabled: true });
    expect(viewStyle(host()).backgroundColor).toBe(container);
    expect(viewStyle(host()).boxShadow).toBeUndefined();
    expect(part('elevation-ring')).toBeNull();
    expect(textStyle(part('label')!).color).toBe(content);
    await elevated.unmount();

    const outlined = await mount({ variant: 'outlined', disabled: true });
    expect(viewStyle(host()).backgroundColor).toBeUndefined();
    expect(viewStyle(part('outline')!).borderColor).toBe(container);
    expect(viewStyle(part('outline')!).borderWidth).toBe(medium.outlineWidth);
    expect(textStyle(part('label')!).color).toBe(content);
    await outlined.unmount();

    await mount({ variant: 'text', disabled: true });
    expect(viewStyle(host()).backgroundColor).toBeUndefined();
    expect(part('outline')).toBeNull();
    expect(textStyle(part('label')!).color).toBe(content);
  });

  test('BTN-6: disabled colors follow the scheme, and the icon receives the disabled label color', async () => {
    const icon = jest.fn(() => <View />);
    await mount({ disabled: true, icon }, { theme: 'dark' });
    const dimmed = painted(filled.disabled.labelColor, 'dark');
    expect(dimmed).toBe(formatColor({ ...colors.dark.onSurface, a: state.disabledContentOpacity }));
    expect(textStyle(part('label')!).color).toBe(dimmed);
    expect(icon).toHaveBeenCalledWith({ color: dimmed, size: medium.iconSize });
  });
});

describe('press hold', () => {
  test('BTN-8: the pressed state appears in the same frame and stays visible for duration.pressHold although the press ended sooner', async () => {
    expect(HOLD).toBe(100);
    await mount();
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('filled', 'pressed');
    await fireEvent(host(), 'pressOut');
    // A tap: released within the same frame — still drawn pressed.
    expectDrawnFrom('filled', 'pressed');
    await wait(HOLD / 2);
    expectDrawnFrom('filled', 'pressed');
    await wait(HOLD / 2 + 30);
    expectDrawnFrom('filled', 'enabled');
  });

  test('BTN-8: a press that lasted longer than the hold is released at once', async () => {
    await mount();
    await fireEvent(host(), 'pressIn');
    await wait(HOLD + 30);
    expectDrawnFrom('filled', 'pressed');
    await fireEvent(host(), 'pressOut');
    expectDrawnFrom('filled', 'enabled');
  });

  test('BTN-8: Enter / Space / assistive activation — a bare click, no press events — shows the pressed state for the hold, and clicks once', async () => {
    const onPress = jest.fn();
    await mount({ onPress });
    await click();
    expect(onPress).toHaveBeenCalledTimes(1);
    expectDrawnFrom('filled', 'pressed');
    await wait(HOLD + 30);
    expectDrawnFrom('filled', 'enabled');
  });

  test('BTN-8: the click that ends a touch press does not start a second hold', async () => {
    const onPress = jest.fn();
    await mount({ onPress });
    await fireEvent(host(), 'pressIn');
    await wait(HOLD + 30);
    // React Native calls onPressOut, then onPress, in the same task.
    await fireEvent(host(), 'pressOut');
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    expectDrawnFrom('filled', 'enabled');
  });

  test('BTN-8: the hold is the system\'s value; a new press during a hold restarts it; a disabled button never shows it', async () => {
    const instant: TanreiSystem = { ...tanrei, motion: { ...tanrei.motion, duration: { ...tanrei.motion.duration, pressHold: 0 } } };
    const view = await mount({}, { theme: 'light', system: instant });
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'pressOut');
    expectDrawnFrom('filled', 'enabled');
    await view.unmount();

    await mount();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'pressOut');
    await wait(HOLD - 30);
    await fireEvent(host(), 'pressIn');
    await wait(60);
    // The first hold's timer has passed; the second press is still down.
    expectDrawnFrom('filled', 'pressed');
    await release();
    expectDrawnFrom('filled', 'enabled');
    await screen.unmount();

    await mount({ disabled: true });
    await click();
    expectDrawnFrom('filled', 'disabled');
  });
});

// React Native's Pressable holds `onPressOut` back until 130 ms after the
// touch began (`DEFAULT_MIN_PRESS_DURATION` in Libraries/Pressability/Pressability.js; `Pressable` has no prop for it).
// These tests go through the REAL Pressability — the host's responder handlers — not through `onPressIn/Out` props.
describe('press hold: the end of a touch comes from the touch events, not from Pressable\'s delayed onPressOut', () => {
  const PRESSABILITY_MIN_PRESS = 130;
  const withHold = (pressHold: number): TanreiSystem => ({ ...tanrei, motion: { ...tanrei.motion, duration: { ...tanrei.motion.duration, pressHold } } });
  /** What the native side sends for one finger. */
  const touchEvent = (identifier = 1) => {
    const touch = { identifier, pageX: 10, pageY: 10, locationX: 10, locationY: 10, target: 1, timestamp: Date.now() };
    return { persist() {}, stopPropagation() {}, currentTarget: 1, target: 1, nativeEvent: { ...touch, touches: [touch], changedTouches: [touch] } };
  };

  test('React Native alone: a tap keeps Pressable\'s onPressOut back for 130 ms (why the touch events are needed)', async () => {
    const onPressOut = jest.fn();
    await mount({ onPressOut }, { theme: 'light', system: withHold(0) });
    await fireEvent(host(), 'responderGrant', touchEvent());
    expectDrawnFrom('filled', 'pressed');
    await fireEvent(host(), 'responderRelease', touchEvent());
    expect(onPressOut).not.toHaveBeenCalled();
    await wait(PRESSABILITY_MIN_PRESS + 40);
    expect(onPressOut).toHaveBeenCalledTimes(1);
    expectDrawnFrom('filled', 'enabled');
  });

  test('BTN-8: a tap is released after the token\'s hold — at once when it is 0 — although onPressOut has not arrived; it clicks once', async () => {
    const onPress = jest.fn();
    const onPressOut = jest.fn();
    const onTouchEnd = jest.fn();
    await mount({ onPress, onPressOut, onTouchEnd }, { theme: 'light', system: withHold(0) });
    await fireEvent(host(), 'responderGrant', touchEvent());
    expectDrawnFrom('filled', 'pressed');
    await fireEvent(host(), 'touchEnd', touchEvent());
    await fireEvent(host(), 'responderRelease', touchEvent());
    expectDrawnFrom('filled', 'enabled');
    expect(onPressOut).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onTouchEnd).toHaveBeenCalledTimes(1);
    // Pressable's late onPressOut changes nothing, and the click did not start a second hold.
    await wait(PRESSABILITY_MIN_PRESS + 40);
    expect(onPressOut).toHaveBeenCalledTimes(1);
    expectDrawnFrom('filled', 'enabled');
  });

  test('BTN-8: a hold shorter than 130 ms is honoured for touch', async () => {
    const onPressOut = jest.fn();
    await mount({ onPressOut }, { theme: 'light', system: withHold(40) });
    await fireEvent(host(), 'responderGrant', touchEvent());
    await fireEvent(host(), 'touchEnd', touchEvent());
    await fireEvent(host(), 'responderRelease', touchEvent());
    expectDrawnFrom('filled', 'pressed');
    await wait(40 + 30);
    expectDrawnFrom('filled', 'enabled');
    expect(onPressOut).not.toHaveBeenCalled();
    await wait(PRESSABILITY_MIN_PRESS);
  });

  test('a cancelled touch ends the press too; another finger\'s touch end does not', async () => {
    const onTouchCancel = jest.fn();
    await mount({ onTouchCancel }, { theme: 'light', system: withHold(0) });
    await fireEvent(host(), 'responderGrant', touchEvent(1));
    await fireEvent(host(), 'touchEnd', touchEvent(2));
    expectDrawnFrom('filled', 'pressed');
    await fireEvent(host(), 'touchCancel', touchEvent(1));
    expectDrawnFrom('filled', 'enabled');
    expect(onTouchCancel).toHaveBeenCalledTimes(1);
    await fireEvent(host(), 'responderTerminate', touchEvent(1));
    await wait(PRESSABILITY_MIN_PRESS + 40);
    expectDrawnFrom('filled', 'enabled');
  });

  test('a touch end without a press (a disabled button) does nothing', async () => {
    await mount({ disabled: true });
    await fireEvent(host(), 'touchEnd', touchEvent());
    expectDrawnFrom('filled', 'disabled');
  });
});

describe('choices of kind: system.behavior', () => {
  const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
  const withShape = (overrides: Partial<TanreiSystem['shape']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, shape: { ...base.shape, ...overrides } });
  const LAYOUT = { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 40 } } };

  test('every system names its two choices; the default is the first name of each', () => {
    expect(tanrei.behavior).toEqual({ pressedFeedback: 'overlay', focusStyle: 'ring' });
    expect(m3Like.behavior.pressedFeedback).toBe('ripple');
    expect(cupertino.behavior).toMatchObject({ pressedFeedback: 'dim' });
    expect(acme.behavior.focusStyle).toBe('glow');
  });

  test('BTN-9 overlay (the default): the pressed tokens reach the whole container at once; no extra node exists', async () => {
    reduceMotion(false);
    await mount();
    await fireEvent(host(), 'layout', LAYOUT);
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expectDrawnFrom('filled', 'pressed');
    expect(part('ripple')).toBeNull();
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  describe('BTN-9 ripple (m3-like)', () => {
    const button = m3Like.components.button;
    const color = (paint: TanreiPaint) => painted(paint, 'light', m3Like);

    test('at rest nothing is added to the tree', async () => {
      reduceMotion(false);
      await mount({}, { theme: 'light', system: m3Like });
      expect(part('ripple')).toBeNull();
      expect(host().children).toHaveLength(1);
    });

    test('the pressed state layer grows from the point of contact over comp.button.motion.feedback-duration with the state easing, clipped to the container shape; it fades over the state duration', async () => {
      reduceMotion(false);
      const timing = jest.spyOn(Animated, 'timing');
      const bezier = jest.spyOn(Easing, 'bezier');
      const ref = createRef<ButtonRef>();
      await mount({ ref }, { theme: 'light', system: m3Like });
      // Where the host is on the page, as the native side would answer.
      (ref.current as unknown as { measure: unknown }).measure = (callback: (...box: number[]) => void) => callback(0, 0, 120, 40, 300, 500);
      await fireEvent(host(), 'layout', LAYOUT);
      timing.mockClear();
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 330, pageY: 510 } });

      // The container keeps the color of the state under the press; the pressed color comes in as the circle.
      expect(viewStyle(host()).backgroundColor).toBe(color(button.variants.filled.enabled.containerColor));
      expect(viewStyle(host()).borderRadius).toBe(button.pressedContainerShape);
      const clip = viewStyle(part('ripple')!);
      expect(clip).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: button.pressedContainerShape });
      const wave = viewStyle(part('ripple.wave')!);
      // Contact at (30, 10) in a 120 × 40 box: the farthest corner is (120, 40).
      const reach = Math.hypot(90, 30);
      expect(wave).toMatchObject({ position: 'absolute', left: 30 - reach, top: 10 - reach, width: reach * 2, height: reach * 2, borderRadius: reach, backgroundColor: color(button.variants.filled.pressed.containerColor) });
      expect(color(button.variants.filled.pressed.containerColor)).not.toBe(color(button.variants.filled.enabled.containerColor));
      // Below the content, hidden from assistive technology.
      expect(host().children.indexOf(part('ripple')!)).toBeLessThan(host().children.indexOf(part('label')!));
      expect(part('ripple')!.props.accessible).toBe(false);
      expect(timing).toHaveBeenCalledTimes(1);
      expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: button.motionFeedbackDuration, useNativeDriver: true });
      expect(bezier).toHaveBeenCalledWith(...button.motionStateEasing);

      // Released: the layer fades with the same tokens, then its node goes away.
      timing.mockClear();
      await release();
      expect(timing.mock.calls.some(([, config]) => config.toValue === 0 && config.duration === button.motionStateDuration)).toBe(true);
      await wait(button.motionStateDuration * 2 + 50);
      expect(part('ripple')).toBeNull();
      expect(viewStyle(host()).backgroundColor).toBe(color(button.variants.filled.enabled.containerColor));
    });

    test('the growth duration is the COMPONENT token (feedback-duration), not a system step picked by the component', async () => {
      reduceMotion(false);
      const timing = jest.spyOn(Animated, 'timing');
      // A design system re-values the component token and leaves the system's duration steps alone.
      const system = withButton({ motionFeedbackDuration: 333 }, m3Like);
      expect(Object.values(system.motion.duration)).not.toContain(333);
      await mount({}, { theme: 'light', system });
      await fireEvent(host(), 'layout', LAYOUT);
      timing.mockClear();
      // No touch data: the ripple starts from the center of the laid-out box.
      await fireEvent(host(), 'pressIn');
      expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: 333 });
      await release();
      await wait(button.motionStateDuration * 2 + 50);
    });

    test('only the container color stays with the state under the press: label, outline, elevation, opacity and shape come from the pressed tokens', async () => {
      reduceMotion(false);
      const pressedLabel = literal(10, 20, 30);
      const pressedOutline = literal(40, 50, 60);
      const system = withVariant(
        'outlined',
        { pressed: { labelColor: pressedLabel, outlineColor: pressedOutline, containerElevation: 'level3' } },
        withButton({ pressedOpacity: 0.7, pressedContainerShape: 3 }, m3Like),
      );
      await mount({ variant: 'outlined' }, { theme: 'light', system });
      await fireEvent(host(), 'layout', LAYOUT);
      await fireEvent(host(), 'hoverIn');
      await wait(button.motionStateDuration * 2);
      await fireEvent(host(), 'pressIn');
      expect(part('ripple')).not.toBeNull();
      const under = system.components.button.variants.outlined.hovered;
      const container = viewStyle(host());
      // The container: the state under the press (hovered) …
      expect(container.backgroundColor).toBe(evaluatePaint(under.containerColor, m3Like.colors.light).a === 0 ? undefined : color(under.containerColor));
      // … everything else: the pressed tokens.
      expect(textStyle(part('label')!).color).toBe(color(pressedLabel));
      expect(viewStyle(part('outline')!).borderColor).toBe(color(pressedOutline));
      expect(container.opacity).toBe(0.7);
      expect(container.borderRadius).toBe(3);
      expect(container.boxShadow).toEqual(resolveElevation(m3Like.elevation.level3, (name) => formatColor((m3Like.colors as TanreiSystem['colors']).light[name]!)).boxShadow);
      await release();
      await wait(button.motionStateDuration * 2 + 50);
    });

    test('keyboard and assistive activation ripple from the center', async () => {
      reduceMotion(false);
      await mount({}, { theme: 'light', system: m3Like });
      await fireEvent(host(), 'layout', LAYOUT);
      await click();
      const reach = Math.hypot(60, 20);
      expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 60 - reach, top: 20 - reach, width: reach * 2 });
      await wait(HOLD + 30);
      await wait(button.motionStateDuration * 2 + 50);
      expect(part('ripple')).toBeNull();
    });

    test('keyboard and assistive activation BEFORE the first layout pass: no box to grow in, so no ripple node — the pressed tokens reach the whole container at once, as overlay does', async () => {
      reduceMotion(false);
      await mount({}, { theme: 'light', system: m3Like });
      // No `layout` event: the host has not been measured, and a bare click has no point of contact to measure from.
      await click();
      expect(part('ripple')).toBeNull();
      expect(host().children).toHaveLength(1);
      expect(viewStyle(host()).backgroundColor).toBe(color(button.variants.filled.pressed.containerColor));
      expect(viewStyle(host()).borderRadius).toBe(button.pressedContainerShape);
      // Still a press (BTN-8): held, then the state under it returns.
      await wait(HOLD + 30);
      await wait(button.motionStateDuration * 2 + 50);
      expect(part('ripple')).toBeNull();
      expect(viewStyle(host()).backgroundColor).toBe(color(button.variants.filled.enabled.containerColor));
    });

    test('with reduce motion nothing grows: the pressed tokens are applied at once, as overlay does', async () => {
      await mount({}, { theme: 'light', system: m3Like });
      await fireEvent(host(), 'layout', LAYOUT);
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
      expect(part('ripple')).toBeNull();
      expect(viewStyle(host()).backgroundColor).toBe(color(button.variants.filled.pressed.containerColor));
      await release();
    });

    test('a disabled button does not ripple', async () => {
      reduceMotion(false);
      await mount({ disabled: true }, { theme: 'light', system: m3Like });
      await fireEvent(host(), 'layout', LAYOUT);
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
      expect(part('ripple')).toBeNull();
    });
  });

  test('BTN-9 dim: the pressed opacity on the whole control and NO state layer — the container keeps the color of the state under the press', async () => {
    // cupertino is the shipped `dim` system (its own tests: Button.presets.test.tsx). Here: the default tokens, whose
    // pressed container IS a state layer, under `dim` — the layer must not be drawn.
    const system = withBehavior({ pressedFeedback: 'dim' }, withButton({ pressedOpacity: 0.5 }));
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).opacity).toBe(0.5);
    expect(viewStyle(host()).backgroundColor).toBe(painted(filled.hovered.containerColor));
    expect(painted(filled.pressed.containerColor)).not.toBe(painted(filled.hovered.containerColor));
    expect(viewStyle(host()).borderRadius).toBe(tokens.pressedContainerShape);
    expect(part('ripple')).toBeNull();
    await release();
    expect(viewStyle(host()).opacity).toBe(tokens.hoveredOpacity);
  });

  test('BTN-9 dim: only the container color stays with the state under the press — label, outline, elevation, opacity and shape come from the pressed tokens', async () => {
    const pressedLabel = literal(10, 20, 30);
    const pressedOutline = literal(40, 50, 60);
    const system = withBehavior(
      { pressedFeedback: 'dim' },
      withVariant('outlined', { pressed: { containerColor: literal(1, 2, 3), labelColor: pressedLabel, outlineColor: pressedOutline, containerElevation: 'level3' } }, withButton({ pressedOpacity: 0.5, pressedContainerShape: 3 })),
    );
    await mount({ variant: 'outlined' }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    const container = viewStyle(host());
    expect(container.backgroundColor).toBe(fill(tokens.variants.outlined.enabled.containerColor));
    expect(textStyle(part('label')!).color).toBe(painted(pressedLabel));
    expect(viewStyle(part('outline')!).borderColor).toBe(painted(pressedOutline));
    expect(container.opacity).toBe(0.5);
    expect(container.borderRadius).toBe(3);
    expect(container.boxShadow).toEqual(resolveElevation(elevation.level3, (name) => role(name)).boxShadow);
    await release();
  });

  test('BTN-9 none: no answer to the press — EVERY part stays with the state under the press; the click still happens', async () => {
    const onPress = jest.fn();
    // Every pressed token differs from the state under the press: none of them may be drawn.
    const system = withBehavior(
      { pressedFeedback: 'none' },
      withVariant('filled', { pressed: { containerColor: literal(1, 2, 3), labelColor: literal(10, 20, 30), outlineColor: literal(40, 50, 60), containerElevation: 'level3' } }, withButton({ pressedOpacity: 0.5, pressedContainerShape: 2 })),
    );
    await mount({ onPress }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('filled', 'enabled');
    await fireEvent(host(), 'hoverIn');
    expectDrawnFrom('filled', 'hovered');
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    await release();
    expectDrawnFrom('filled', 'hovered');
  });

  test('BTN-10 corner smoothing: an amount above 0 (cupertino: 0.6, the iOS corner) reaches the container, its rings and the focus ring as the OS curve; 0 adds nothing', async () => {
    expect(tanrei.shape.cornerSmoothing).toBe(0);
    expect(cupertino.shape.cornerSmoothing).toBe(0.6);
    const view = await mount({ variant: 'outlined' });
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('outline')!, part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBeUndefined();
    await view.unmount();

    await mount({ variant: 'outlined' }, { theme: 'light', system: cupertino });
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('outline')!, part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBe('continuous');
    // The same radius: only the curve of the corner changes.
    expect(viewStyle(host()).borderRadius).toBe(cupertino.components.button.focusedContainerShape);
    await screen.unmount();

    // iOS has only the OS's curve: the amount rounds to it — any amount above 0 draws `continuous`.
    await mount({ variant: 'elevated' }, { theme: 'light', system: withShape({ cornerSmoothing: 0.2 }) });
    expect(viewStyle(part('elevation-ring')!).borderCurve).toBe('continuous');
    expect(viewStyle(host()).borderCurve).toBe('continuous');
  });

  test('BTN-10 corner smoothing on Android: circular whatever the amount (`borderCurve` is iOS-only)', async () => {
    const os = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    try {
      await mount({ variant: 'outlined' }, { theme: 'light', system: cupertino });
      await fireEvent(host(), 'focus');
      for (const node of [host(), part('outline')!, part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBeUndefined();
    } finally {
      os.restore();
    }
  });

  test('BTN-10 focus-style: glow (acme) draws the focus colors as ONE soft halo over the ring\'s reach, blurred by the ring width; never animated', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mount({}, { theme: 'light', system: acme });
    expect(part('focus-ring')).toBeNull();
    await fireEvent(host(), 'focus');
    const { offset, innerWidth, outerWidth } = acme.measure.focus;
    const glow = part('focus-ring')!;
    expect(glow.type).toBe('View');
    expect(viewStyle(glow)).toEqual({
      position: 'absolute',
      top: -offset,
      right: -offset,
      bottom: -offset,
      left: -offset,
      borderRadius: acme.components.button.focusedContainerShape + offset,
      boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: outerWidth, spreadDistance: innerWidth + outerWidth, color: painted({ kind: 'role', role: 'focusRing' }, 'light', acme) }],
      pointerEvents: 'none',
    });
    expect(part('focus-ring.inner')).toBeNull();
    expect(glow.props.accessible).toBe(false);
    // The state change animates (one timing); the glow itself is a constant style.
    expect(timing).toHaveBeenCalledTimes(1);
    await wait(acme.components.button.motionStateDuration * 2);
  });

  test('BTN-10 focus-style: a glow with an inner color puts it on top; a renderer without boxShadow falls back to the ring (the first value)', async () => {
    const system: TanreiSystem = { ...withBehavior({ focusStyle: 'glow' }), measure: { ...measure, focus: { ...measure.focus, innerWidth: 1 } } };
    const view = await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'focus');
    expect(viewStyle(part('focus-ring')!).boxShadow).toEqual([
      { offsetX: 0, offsetY: 0, blurRadius: 1, spreadDistance: 1, color: role('focusRingInner') },
      { offsetX: 0, offsetY: 0, blurRadius: measure.focus.outerWidth, spreadDistance: 1 + measure.focus.outerWidth, color: role('focusRing') },
    ]);
    await view.unmount();

    const fabric = (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager;
    (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager = undefined;
    try {
      await mount({}, { theme: 'light', system });
      await fireEvent(host(), 'focus');
      expect(viewStyle(part('focus-ring')!).boxShadow).toBeUndefined();
      expect(viewStyle(part('focus-ring')!)).toMatchObject({ borderWidth: measure.focus.outerWidth, borderColor: role('focusRing') });
      expect(part('focus-ring.inner')).not.toBeNull();
    } finally {
      (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager = fabric;
    }
  });
});

// These two read a transition MID-WAY on real timers, so it must outlast a re-render on a loaded machine (every
// package's suite at once): 600 ms, where a few tens of milliseconds are over before the read.
describe('elevation moves with the state', () => {
  test('between two states every shadow layer and the ring color are interpolated with the motion tokens; settled, the style is the plain boxShadow', async () => {
    reduceMotion(false);
    const system = withVariant('elevated', { hovered: { containerElevation: 'level4' } }, withButton({ motionStateDuration: 600 }));
    const from = resolveElevation(elevation.level2, (name) => role(name));
    const to = resolveElevation(elevation.level4, (name) => role(name));
    expect(to.boxShadow.length).toBeGreaterThan(from.boxShadow.length);
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await mount({ variant: 'elevated' }, { theme: 'light', system });
    expect(viewStyle(host()).boxShadow).toEqual(from.boxShadow);

    interpolate.mockClear();
    await fireEvent(host(), 'hoverIn');
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    // The first layer moves from level2's values to level4's…
    expect(ranges).toContainEqual([from.boxShadow[0]!.offsetY, to.boxShadow[0]!.offsetY]);
    expect(ranges).toContainEqual([from.boxShadow[0]!.blurRadius, to.boxShadow[0]!.blurRadius]);
    // …and a layer only level4 has grows out of nothing (CSS pads the shorter list the same way).
    const last = to.boxShadow.at(-1)!;
    expect(ranges).toContainEqual([0, last.blurRadius]);
    expect(ranges.some((range) => range[1] === last.color && String(range[0]).endsWith(', 0)'))).toBe(true);
    // While it moves the host carries one entry per layer of the richer state.
    expect((viewStyle(host()).boxShadow as unknown[]).length).toBe(to.boxShadow.length);

    await wait(900);
    expect(viewStyle(host()).boxShadow).toEqual(to.boxShadow);
  });

  test('a ring that only one state has fades instead of popping; press is still immediate', async () => {
    reduceMotion(false);
    const system = withButton({ motionStateDuration: 600 });
    const view = await mount({ variant: 'elevated' }, { theme: 'light', system });
    expect(part('elevation-ring')!.type).toBe('View');
    await view.rerender(
      <TanreiProvider theme="light" system={system}>
        <Button testID={ID} variant="elevated" disabled>
          Deploy
        </Button>
      </TanreiProvider>,
    );
    // Disabled has no elevation: during the transition the ring is still there, with an animated color.
    expect(part('elevation-ring')).not.toBeNull();
    await wait(900);
    expect(part('elevation-ring')).toBeNull();
    expect(viewStyle(host()).boxShadow).toBeUndefined();
  });

  test('a renderer without boxShadow (old architecture) gets the legacy shadow of the state, switched not animated', async () => {
    const fabric = (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager;
    (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager = undefined;
    try {
      await mount({ variant: 'elevated' });
      const resolved = resolveElevation(elevation.level2, (name) => role(name));
      expect(viewStyle(host()).boxShadow).toBeUndefined();
      expect(viewStyle(host())).toMatchObject(resolved.legacy);
      expect(resolved.legacy.shadowRadius).toBe(elevation.level2[1]!.blur / 2);
    } finally {
      (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager = fabric;
    }
  });
});

describe('open size and variant keys', () => {
  // What a JavaScript caller, a stale screen or another product's code may pass: keys no system has.
  const unknown = (size: string, variant: string) => ({ size: size as ButtonSize, variant: variant as ButtonVariant });
  const development = (enabled: boolean) => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
  };
  afterEach(() => development(true));

  test('BTN-7: an unknown size and an unknown variant render exactly like the default values, in every state', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reference = await mount({ size: 'medium', variant: 'filled' });
    const expected = JSON.stringify(reference.toJSON());
    await reference.unmount();

    const view = await mount(unknown('jumbo', 'ghost'));
    expect(JSON.stringify(view.toJSON())).toBe(expected);
    expect(viewStyle(host()).minHeight).toBe(medium.containerHeight);
    expectDrawnFrom('filled', 'enabled');
    for (const target of ['hovered', 'focused', 'pressed'] as const) {
      await enter(target);
      expectDrawnFrom('filled', target);
    }
    await view.unmount();
    await mount({ ...unknown('jumbo', 'ghost'), disabled: true });
    expectDrawnFrom('filled', 'disabled');
  });

  test('BTN-7: each axis falls back on its own — an unknown size keeps the variant, an unknown variant keeps the size', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = await mount({ size: 'jumbo' as ButtonSize, variant: 'outlined' });
    expect(viewStyle(host()).minHeight).toBe(medium.containerHeight);
    expectDrawnFrom('outlined', 'enabled');
    await first.unmount();
    await mount({ size: 'large', variant: 'ghost' as ButtonVariant });
    expect(viewStyle(host()).minHeight).toBe(tokens.sizes.large.containerHeight);
    expectDrawnFrom('filled', 'enabled');
  });

  test('BTN-7: development builds report the unknown value once per key; a key of Object.prototype is unknown too', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = await mount(unknown('colossal', 'phantom'));
    await first.unmount();
    const second = await mount(unknown('colossal', 'phantom'));
    await second.unmount();
    const reports = (needle: string) => warn.mock.calls.filter(([message]) => String(message).includes(needle));
    expect(reports('no Button size "colossal"; using "medium"')).toHaveLength(1);
    expect(reports('no Button variant "phantom"; using "filled"')).toHaveLength(1);

    await mount(unknown('constructor', 'toString'));
    expect(reports('Button size "constructor"')).toHaveLength(1);
    expect(reports('Button variant "toString"')).toHaveLength(1);
    expectDrawnFrom('filled', 'enabled');
  });

  test('BTN-7: a release build renders the default silently — no report, no crash', async () => {
    development(false);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount(unknown('titanic', 'spectre'));
    expect(viewStyle(host()).minHeight).toBe(medium.containerHeight);
    expectDrawnFrom('filled', 'enabled');
    expect(warn).not.toHaveBeenCalled();
  });

  test('a known value is never reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const size of sizes) {
      const view = await mount({ size, variant: 'text' });
      await view.unmount();
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('the axis shape carries the values of the flat pin (the shape of the tokens never changes the visual output)', () => {
  // __fixtures__/button-flat-tokens.tanrei.json is `tanrei.components.button` in flat form: one flat member per
  // token (`containerHeightSmall`, `filledHoveredContainerColor`, …). A deliberate token VALUE change updates that
  // file; a change of shape must not.
  // `containerGap` and `outlineWidth` are on the size axis, but the pin has ONE value for each: every size must carry
  // exactly that value.
  const joinedSizeAxis = ['containerGap', 'outlineWidth'];
  // Tokens the pin does not have, each with the value it must equal:
  // `motion.feedback-duration` is the system step `duration.long1`;
  // each variant's state-layer color aliases its label color — the resting label under hover, focus and press (the
  // fallback keeps a part's resting value), the disabled label when disabled.
  const stateLayers = Object.fromEntries(
    ['filled', 'tonal', 'elevated', 'outlined', 'text'].flatMap((v) => [
      ...['', 'Hovered', 'Focused', 'Pressed'].map((s) => [`${v}${s}StateLayerColor`, (flatTokens as Record<string, unknown>)[`${v}LabelColor`]]),
      [`${v}DisabledStateLayerColor`, (flatTokens as Record<string, unknown>)[`${v}DisabledLabelColor`]],
    ]),
  );
  const addedSincePin: Record<string, unknown> = { motionFeedbackDuration: tanrei.motion.duration.long1, ...stateLayers };
  const flat: Record<string, unknown> = { ...flatTokens, ...addedSincePin };
  const pascal = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

  test('every old flat value equals the new axis value, and nothing else exists', () => {
    const { sizes: bySize, variants: byVariant, ...offAxis } = tokens;
    const rebuilt: Record<string, unknown> = { ...offAxis };
    for (const [size, members] of Object.entries(bySize)) {
      for (const [member, value] of Object.entries(members)) {
        if (joinedSizeAxis.includes(member)) {
          expect([size, member, value]).toEqual([size, member, flat[member]]);
          rebuilt[member] = value;
        } else rebuilt[`${member}${pascal(size)}`] = value;
      }
    }
    for (const [variant, states] of Object.entries(byVariant)) {
      for (const [state, members] of Object.entries(states)) {
        for (const [member, value] of Object.entries(members)) rebuilt[`${variant}${state === 'enabled' ? '' : pascal(state)}${pascal(member)}`] = value;
      }
    }
    for (const name of Object.keys(addedSincePin)) expect(flatTokens).not.toHaveProperty(name);
    expect(Object.keys(rebuilt).sort()).toEqual(Object.keys(flat).sort());
    expect(rebuilt).toEqual(flat);
  });

  test('the sizes are 32 / 36 / 40, and every size has the same label style and icon size', () => {
    expect(sizes.map((size) => tokens.sizes[size].containerHeight)).toEqual([32, 36, 40]);
    expect(medium).toEqual({ containerHeight: 36, containerPaddingInlineStart: 14, containerPaddingInlineEnd: 14, containerPaddingInlineStartWithIcon: 14, containerPaddingBlock: 6, labelTypescale: 'label', iconSize: 16, containerGap: 8, outlineWidth: 1 });
    for (const size of sizes) {
      // `label.typescale` and `icon.size` are on the size axis, with one value in the default system: `label`, 16.
      expect(tokens.sizes[size].labelTypescale).toBe('label');
      expect(tokens.sizes[size].iconSize).toBe(16);
      // So are `container.gap` and `outline.width`: containerGap 8, outlineWidth 1.
      expect(tokens.sizes[size].containerGap).toBe(8);
      expect(tokens.sizes[size].outlineWidth).toBe(1);
    }
  });
});

describe('the system drives rendering', () => {
  test('a hovered container that is a different paint is drawn as that paint', async () => {
    const system = withVariant('filled', { hovered: { containerColor: { kind: 'role', role: 'errorContainer' }, labelColor: { kind: 'role', role: 'onErrorContainer' } } });
    await mount({}, { theme: 'dark', system });
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host()).backgroundColor).toBe(role('errorContainer', 'dark'));
    expect(textStyle(part('label')!).color).toBe(role('onErrorContainer', 'dark'));
    expectDrawnFrom('filled', 'hovered', system.components.button, 'dark');
  });

  test('a system without hover feedback draws hover exactly like the resting state', async () => {
    const system = withVariant('filled', { hovered: { containerColor: filled.enabled.containerColor } });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host()).backgroundColor).toBe(painted(filled.enabled.containerColor));
  });

  test('pressed shape 2 and pressed opacity 0.4 reach the container, the outline and the focus ring', async () => {
    const system = withButton({ pressedContainerShape: 2, pressedOpacity: 0.4 });
    await mount({ variant: 'outlined' }, { theme: 'light', system });
    expect(viewStyle(host())).toMatchObject({ borderRadius: tokens.containerShape, opacity: 1 });
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host())).toMatchObject({ borderRadius: 2, opacity: 0.4 });
    expect(viewStyle(part('outline')!).borderRadius).toBe(2);
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(part('focus-ring')!).borderRadius).toBe(2 + reach);
    await release();
    expect(viewStyle(host())).toMatchObject({ borderRadius: tokens.focusedContainerShape, opacity: tokens.focusedOpacity });
  });

  test('a disabled state that dims the whole control (opacity) instead of recoloring it', async () => {
    const system = withVariant('filled', { disabled: { containerColor: filled.enabled.containerColor, labelColor: filled.enabled.labelColor } }, withButton({ disabledOpacity: 0.5 }));
    await mount({ disabled: true }, { theme: 'light', system });
    expect(viewStyle(host())).toMatchObject({ opacity: 0.5, backgroundColor: painted(filled.enabled.containerColor) });
    expect(textStyle(part('label')!).color).toBe(painted(filled.enabled.labelColor));
  });

  test('padding-inline-start doubled moves only the start edge; with an icon the with-icon token is used', async () => {
    const system = withSize('medium', { containerPaddingInlineStart: medium.containerPaddingInlineStart * 2, containerPaddingInlineStartWithIcon: 3, containerPaddingBlock: 9 });
    const plain = await mount({}, { theme: 'light', system });
    expect(viewStyle(host())).toMatchObject({ paddingStart: medium.containerPaddingInlineStart * 2, paddingEnd: medium.containerPaddingInlineEnd, paddingVertical: 9 });
    // RTL-aware logical edges, never physical ones.
    expect(viewStyle(host()).paddingLeft).toBeUndefined();
    expect(viewStyle(host()).paddingHorizontal).toBeUndefined();
    await plain.unmount();

    await mount({ icon: <View /> }, { theme: 'light', system });
    expect(viewStyle(host())).toMatchObject({ paddingStart: 3, paddingEnd: medium.containerPaddingInlineEnd });
  });

  test('an outline or an elevation that exists only in one state appears in that state', async () => {
    const system = withVariant('filled', { hovered: { outlineColor: { kind: 'role', role: 'outline' }, containerElevation: 'level3' } });
    await mount({}, { theme: 'light', system });
    expect(part('outline')).toBeNull();
    expect(part('elevation-ring')).toBeNull();
    await fireEvent(host(), 'hoverIn');
    expectDrawnFrom('filled', 'hovered', system.components.button);
    expect(viewStyle(part('outline')!).borderColor).toBe(role('outline'));
    expect(viewStyle(host()).boxShadow).toHaveLength(elevation.level3.length - 1);
  });

  test('BTN-4: inner focus width 1 adds an inner stroke in focus-ring-inner and pushes the outer stroke out', async () => {
    const focus = { offset: 3, innerWidth: 1, outerWidth: 4 };
    const system: TanreiSystem = { ...tanrei, measure: { ...measure, focus } };
    await mount({}, { theme: 'dark', system });
    await fireEvent(host(), 'focus');
    expect(viewStyle(part('focus-ring.inner')!)).toEqual({
      position: 'absolute',
      top: -4,
      right: -4,
      bottom: -4,
      left: -4,
      borderWidth: 1,
      borderColor: role('focusRingInner', 'dark'),
      borderRadius: tokens.focusedContainerShape + 4,
      pointerEvents: 'none',
    });
    expect(viewStyle(part('focus-ring')!)).toMatchObject({ top: -8, left: -8, right: -8, bottom: -8, borderWidth: 4, borderColor: role('focusRing', 'dark'), borderRadius: tokens.focusedContainerShape + 8 });
  });

  test('BTN-4: a negative focus offset draws the indicator inside the control', async () => {
    const system: TanreiSystem = { ...tanrei, measure: { ...measure, focus: { offset: -4, innerWidth: 0, outerWidth: 2 } } };
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'focus');
    expect(viewStyle(part('focus-ring')!)).toMatchObject({ top: 2, left: 2, right: 2, bottom: 2, borderWidth: 2, borderRadius: tokens.focusedContainerShape - 2 });
  });

  test('a system with its own palette: a declared role is drawn, in every scheme it values', async () => {
    const correct = { r: 1, g: 120, b: 60, a: 1 };
    const onCorrect = { r: 250, g: 255, b: 250, a: 1 };
    const base = withVariant('filled', { enabled: { containerColor: { kind: 'role', role: 'correct' }, labelColor: { kind: 'role', role: 'onCorrect' } } });
    const system: TanreiSystem = { ...base, id: 'product', colors: { ...base.colors, dark: { ...base.colors.dark, correct, onCorrect } } };
    await mount({}, { theme: 'dark', system });
    expect(viewStyle(host()).backgroundColor).toBe(formatColor(correct));
    expect(textStyle(part('label')!).color).toBe(formatColor(onCorrect));
  });

  test('a role the active system does not have falls back to the primary slot and warns once in development', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const system = withVariant('filled', { enabled: { containerColor: { kind: 'role', role: 'correct' }, labelColor: { kind: 'role', role: 'onCorrect' } } });
    const first = await mount({}, { theme: 'light', system });
    expect(viewStyle(host()).backgroundColor).toBe(role('primary'));
    expect(textStyle(part('label')!).color).toBe(role('onPrimary'));
    await first.unmount();
    await mount({}, { theme: 'light', system });
    expect(warn.mock.calls.filter(([message]) => String(message).includes('"correct"'))).toHaveLength(1);
    expect(warn.mock.calls.filter(([message]) => String(message).includes('"onCorrect"'))).toHaveLength(1);
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
    test.each(variants)('%s resolves container, label, outline and elevation from its paints in this scheme', async (variant) => {
      await mount({ variant }, provider);
      expectDrawnFrom(variant, 'enabled', tokens, scheme);
      await fireEvent(host(), 'hoverIn');
      expectDrawnFrom(variant, 'hovered', tokens, scheme);
    });

    test('outlined draws an inside ring in the outline paint that does not change the box', async () => {
      await mount({ variant: 'outlined' }, provider);
      expect(viewStyle(part('outline')!)).toEqual({
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderWidth: medium.outlineWidth,
        borderColor: painted(tokens.variants.outlined.enabled.outlineColor, scheme),
        borderRadius: tokens.containerShape,
        pointerEvents: 'none',
      });
      expect(viewStyle(host()).borderWidth).toBeUndefined();
    });

    test('elevated draws the elevation ring outside the box and the other layers as boxShadow', async () => {
      await mount({ variant: 'elevated' }, provider);
      const [ringLayer, ...shadowLayers] = elevation[tokens.variants.elevated.enabled.containerElevation];
      expect(viewStyle(part('elevation-ring')!)).toMatchObject({
        top: -ringLayer!.spread,
        left: -ringLayer!.spread,
        right: -ringLayer!.spread,
        bottom: -ringLayer!.spread,
        borderWidth: ringLayer!.spread,
        borderColor: role(ringLayer!.role, scheme),
        borderRadius: tokens.containerShape + ringLayer!.spread,
      });
      expect(viewStyle(host()).boxShadow).toEqual(
        shadowLayers.map((l) => ({ offsetX: l.x, offsetY: l.y, blurRadius: l.blur, spreadDistance: l.spread, color: role(l.role, scheme) })),
      );
    });
  });

  test.each(variants.filter((v) => v !== 'elevated'))('%s has no elevation', async (variant) => {
    await mount({ variant });
    expect(viewStyle(host()).boxShadow).toBeUndefined();
    expect(part('elevation-ring')).toBeNull();
  });

  test.each(sizes)('%s takes its minimum height and paddings from the size tokens', async (size) => {
    const plain = await mount({ size });
    expect(viewStyle(host())).toMatchObject({
      minHeight: tokens.sizes[size].containerHeight,
      paddingStart: tokens.sizes[size].containerPaddingInlineStart,
      paddingEnd: tokens.sizes[size].containerPaddingInlineEnd,
      paddingVertical: tokens.sizes[size].containerPaddingBlock,
      gap: tokens.sizes[size].containerGap,
      borderRadius: tokens.containerShape,
    });
    expect(viewStyle(host()).height).toBeUndefined();
    await plain.unmount();
    await mount({ size, icon: <View /> });
    expect(viewStyle(host()).paddingStart).toBe(tokens.sizes[size].containerPaddingInlineStartWithIcon);
  });

  test('the label uses the labelTypescale role of its size', async () => {
    await mount();
    // Roles are open (a preset's file augments `TanreiTypescale`): the role of a size is read as the component does.
    const token = lookupValue(typescale as TanreiTypescale, medium.labelTypescale, 'body', 'typescale role');
    expect(textStyle(part('label')!)).toMatchObject({
      fontFamily: token.font.families[0],
      fontSize: token.size,
      fontWeight: String(token.weight),
      letterSpacing: token.tracking,
      lineHeight: token.lineHeight,
    });
  });

  test('the icon slot is sized by the icon token and receives the label color', async () => {
    const icon = jest.fn(({ color, size }: { color: string; size: number }) => <View testID="glyph" style={{ width: size, height: size, backgroundColor: color }} />);
    await mount({ variant: 'tonal', icon });
    expect(icon).toHaveBeenCalledWith({ color: painted(tokens.variants.tonal.enabled.labelColor), size: medium.iconSize });
    expect(viewStyle(part('icon')!)).toMatchObject({ width: medium.iconSize, height: medium.iconSize });
    // Order: icon leads the label.
    const children = host().children.filter((c): c is Instance => typeof c !== 'string').map((c) => c.props.testID);
    expect(children.indexOf(`${ID}.icon`)).toBeLessThan(children.indexOf(`${ID}.label`));
  });
});

describe('accessibility', () => {
  test('role button; the label text is the accessible name', async () => {
    await mount();
    expect(host().props.accessibilityRole).toBe('button');
    expect(screen.getByRole('button', { name: 'Deploy' })).toBe(host());
    expect(host().props.accessibilityLabel).toBe('Deploy');
  });

  test('an explicit accessibilityLabel wins; node children leave naming to their own text', async () => {
    const first = await mount({ accessibilityLabel: 'Deploy to production' });
    expect(screen.getByRole('button', { name: 'Deploy to production' })).toBe(host());
    await first.unmount();

    await mount({ children: <Text>Ship it</Text> });
    expect(host().props.accessibilityLabel).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Ship it' })).toBe(host());
  });

  test('text scales: font scaling is on, the label never truncates and the height is a minimum', async () => {
    await mount();
    const label = part('label')!;
    expect(label.props.allowFontScaling).toBe(true);
    expect(label.props.numberOfLines).toBeUndefined();
    expect(label.props.ellipsizeMode).toBeUndefined();
    expect(viewStyle(host()).height).toBeUndefined();
    expect(viewStyle(host()).minHeight).toBe(medium.containerHeight);
    expect(viewStyle(host()).overflow).toBeUndefined();
  });

  test('decorative layers are hidden from assistive technology and from touches', async () => {
    await mount({ variant: 'elevated' });
    await fireEvent(host(), 'focus');
    for (const name of ['elevation-ring', 'focus-ring']) {
      expect(part(name)!.props.accessible).toBe(false);
      expect(part(name)!.props.importantForAccessibility).toBe('no');
      expect(viewStyle(part(name)!).pointerEvents).toBe('none');
    }
  });

  test('forwards its ref to the underlying host view and passes caller handlers through', async () => {
    const ref = createRef<ButtonRef>();
    const onPressIn = jest.fn();
    const onFocus = jest.fn();
    const onLayout = jest.fn();
    await mount({ ref, onPressIn, onFocus, onLayout, style: { marginTop: 4 } });
    expect(ref.current).not.toBeNull();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 36 } } });
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(viewStyle(host()).marginTop).toBe(4);
  });
});

describe('theme', () => {
  function Probe() {
    const { system, scheme, colors: palette, color } = useTanrei();
    return <Text testID="probe">{`${system.id}|${scheme}|${formatColor(palette.primary)}|${color('primary')}`}</Text>;
  }
  const probe = () => screen.getByTestId('probe').children.join('');

  test('system follows useColorScheme(); light and dark are explicit; contrast selects the scheme', async () => {
    const scheme = jest.spyOn(ReactNative, 'useColorScheme');
    scheme.mockReturnValue('dark');
    const view = await render(<TanreiProvider><Probe /></TanreiProvider>);
    expect(probe()).toBe(`tanrei|dark|${role('primary', 'dark')}|${role('primary', 'dark')}`);
    scheme.mockReturnValue('light');
    await view.rerender(<TanreiProvider theme="system"><Probe /></TanreiProvider>);
    expect(probe()).toBe(`tanrei|light|${role('primary', 'light')}|${role('primary', 'light')}`);
    await view.rerender(<TanreiProvider theme="dark" contrast="medium"><Probe /></TanreiProvider>);
    expect(probe()).toBe(`tanrei|darkMedium|${role('primary', 'darkMedium')}|${role('primary', 'darkMedium')}`);
    await view.rerender(<TanreiProvider theme="light" contrast="high"><Probe /></TanreiProvider>);
    expect(probe()).toBe(`tanrei|lightHigh|${role('primary', 'lightHigh')}|${role('primary', 'lightHigh')}`);
  });

  test('without a provider the standard light scheme is used', async () => {
    await render(<Probe />);
    expect(probe()).toBe(`tanrei|light|${role('primary', 'light')}|${role('primary', 'light')}`);
  });

  test('the provider renders the system it is given', async () => {
    const system: TanreiSystem = { ...tanrei, id: 'product', colors: { ...colors, light: { ...colors.light, primary: { r: 1, g: 2, b: 3, a: 1 } } } };
    await render(<TanreiProvider theme="light" system={system}><Probe /></TanreiProvider>);
    expect(probe()).toBe('product|light|rgb(1, 2, 3)|rgb(1, 2, 3)');
  });

  test('typescale → TextStyle: first family, weight as the nearest hundred string, tracking, line height', () => {
    expect(typescaleStyle(typescale.label)).toEqual({ fontFamily: 'Inter', fontSize: 14, fontWeight: '500', letterSpacing: 0, lineHeight: 20 });
    expect(toFontWeight(450)).toBe('500');
    expect(toFontWeight(440)).toBe('400');
    expect(toFontWeight(1000)).toBe('900');
    expect(toFontWeight(1)).toBe('100');
    expect(typescaleStyle(typescale.label, (family, weight) => `${family}_${weight}`).fontFamily).toBe('Inter_500');
    expect(typescaleStyle(typescale.label, () => undefined).fontFamily).toBeUndefined();
  });

  test('text(role, { emphasized }) adds the family step of system.typescale.emphasis to the weight; nothing else moves', async () => {
    const styles = {} as Record<'plain' | 'emphasized' | 'label' | 'caption', TextStyle>;
    function Probe() {
      const { text } = useTanrei();
      styles.plain = text('heading1');
      styles.emphasized = text('heading1', { emphasized: true });
      styles.label = text('label', { emphasized: true });
      styles.caption = text('caption', { emphasized: true });
      return null;
    }
    await render(<TanreiProvider theme="light"><Probe /></TanreiProvider>);
    expect(tanrei.typescale.emphasis).toEqual({ display: 100, heading: 100, body: 100, label: 100 });
    // The default system: heading-1 weighs 500 and the heading step is 100 → 600.
    expect(typescale.heading1.weight).toBe(500);
    expect(styles.emphasized).toEqual({ ...styles.plain, fontWeight: '600' });
    expect(styles.label.fontWeight).toBe(toFontWeight(typescale.label.weight + typescale.emphasis.label));
    // `caption` is in the label family.
    expect(styles.caption.fontWeight).toBe(toFontWeight(typescale.caption.weight + typescale.emphasis.label));

    // m3-like: a label emphasized is 500 + 200 = 700 (Material's per-family steps come from the tokens, not from code).
    await render(<TanreiProvider theme="light" system={m3Like}><Probe /></TanreiProvider>);
    expect(m3Like.typescale.emphasis.label).toBe(200);
    expect(m3Like.typescale.label.weight).toBe(500);
    expect(styles.label.fontWeight).toBe('700');
  });

  test('a font resolver on the provider reaches the label', async () => {
    await mount({}, { theme: 'light', resolveFont: (family, weight) => `${family}-${weight}` });
    expect(textStyle(part('label')!).fontFamily).toBe('Inter-500');
  });

  test('elevation → outside ring + boxShadow layers; level0 resolves to nothing', () => {
    const color = (name: TanreiColorRole) => role(name);
    // `level0` is an empty list: nothing is drawn, not a no-op shadow.
    expect(elevation.level0).toEqual([]);
    expect(resolveElevation(elevation.level0, color)).toEqual({ ring: null, boxShadow: [], legacy: {} });
    expect(resolveElevation(elevation.level1, color)).toEqual({ ring: { width: 1, color: role('elevationRing') }, boxShadow: [], legacy: {} });
    const level3 = resolveElevation(elevation.level3, color);
    expect(level3.ring).toEqual({ width: 1, color: role('elevationRing') });
    expect(level3.boxShadow).toHaveLength(elevation.level3.length - 1);
    expect(level3.boxShadow[1]).toEqual({ offsetX: 0, offsetY: 4, blurRadius: 8, spreadDistance: -4, color: role('elevationShadow1') });
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(buttonSubject);
});
