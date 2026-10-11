// Card — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/card.spec.json; every behaviour id is cited by the test that covers it.
import { createRef, type ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCardTokens, TanreiCardVariantStateTokens, TanreiColorRole, TanreiCoreCardVariant, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { stateShape } from '../../primitives/stateShape';
import { byTestID, describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { useContentColor } from '../../theme/contentColor';
import { resolveElevation } from '../../theme/elevation';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Card, type CardProps, type CardRef, type CardVariant } from '../Card';
import { acme } from './__fixtures__/acme';
import { cardSubject } from './Card.subject';

const spec = loadSpec('card');
const { measure, state: sysState } = tanrei;
const colors: TanreiSystem['colors'] = tanrei.colors;
const tokens: TanreiCardTokens = tanrei.components.card;
const ID = 'card';
const LABEL = 'Quarterly report';
const TEXT = 'Quarterly report. Revenue grew 12% over the previous quarter.';

const { host, part } = byTestID(ID);

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
/** `undefined` when the paint draws nothing: the component then sets no fill / renders no outline. */
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));

const withCard = (overrides: Partial<TanreiCardTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'card', overrides);
/** …with some tokens of one variant changed, per state. */
const withVariant = (variant: TanreiCoreCardVariant, overrides: { [State in InteractionState]?: Partial<TanreiCardVariantStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.card.variants[variant];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withCard({ variants: { ...base.components.card.variants, [variant]: { ...current, ...changed } } }, base);
};
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });

const noop = () => undefined;

function mount(props: Partial<CardProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  const element: ReactElement = (
    <TanreiProvider {...provider}>
      <Card testID={ID} {...props}>
        {props.children ?? TEXT}
      </Card>
    </TanreiProvider>
  );
  return render(element);
}
/** An interactive card, named. */
const mountAction = (props: Partial<CardProps> = {}, provider?: Omit<TanreiProviderProps, 'children'>) => mount({ onPress: noop, accessibilityLabel: LABEL, ...props }, provider);

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

// The CORE values of the variant axis: what every system has. (Values a system adds: describeAxisExtensions below.)
const variants: TanreiCoreCardVariant[] = ['elevated', 'filled', 'outlined'];
const ACTIVE = ['hovered', 'focused', 'pressed'] as const;

/** The opacity of a state, written out independently of `stateShape`. */
const opacityOf = (from: TanreiCardTokens, in_: InteractionState) =>
  ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity })[in_];

/** Enter / Space / D-pad centre and assistive activation: a bare click (no press events, no touch data). */
const click = () => fireEvent(host(), 'press', { nativeEvent: { target: 1 } });

/** CRD-8: a press stays visible for `duration.pressHold`, so a release is over only after that. */
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

/** Everything CRD-3 / CRD-6 name — container, outline, elevation, content color, opacity — from one state's tokens. */
function expectDrawnFrom(variant: TanreiCoreCardVariant, in_: InteractionState, from: TanreiCardTokens = tokens, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) {
  const paints = from.variants[variant][in_];
  const container = viewStyle(host());
  expect(container.backgroundColor).toBe(fill(paints.containerColor, scheme, system));
  expect(container.opacity).toBe(opacityOf(from, in_));
  expect(container.borderRadius).toBe(from.containerShape);
  expect(textStyle(part('text')!).color).toBe(painted(paints.contentColor, scheme, system));
  const outline = fill(paints.outlineColor, scheme, system);
  if (outline === undefined) expect(part('outline')).toBeNull();
  else expect(viewStyle(part('outline')!)).toMatchObject({ borderColor: outline, borderWidth: from.outlineWidth, borderRadius: from.containerShape });
  const resolved = resolveElevation(system.elevation[paints.containerElevation], (name) => role(name, scheme, system));
  expect(container.boxShadow).toEqual(resolved.boxShadow.length ? resolved.boxShadow : undefined);
  if (resolved.ring) expect(viewStyle(part('elevation-ring')!)).toMatchObject({ borderColor: resolved.ring.color, borderWidth: resolved.ring.width });
  else expect(part('elevation-ring')).toBeNull();
}

beforeEach(() => {
  // Most tests assert settled values; the animated path has its own tests.
  reduceMotion(true);
  resetLookupReports();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Card.name);
    expect(platform.props).toEqual({ variant: 'variant', interactive: 'onPress', disabled: 'disabled', inset: 'inset', label: 'accessibilityLabel' });
    expect(platform.events).toEqual({ click: 'onPress' });
  });

  test('the variant values under test are exactly the spec values, and they are the token axis', () => {
    expect(spec.props.find((p) => p.name === 'variant')?.values).toEqual(variants);
    expect(Object.keys(tokens.variants)).toEqual(variants);
  });

  test('defaults follow the spec: outlined, not interactive, inset, no name', async () => {
    await mount();
    expectDrawnFrom('outlined', 'enabled');
    expect(host().props.accessibilityRole).toBeUndefined();
    expect(host().props.role).toBeUndefined();
    expect(viewStyle(part('content')!)).toMatchObject({ paddingStart: tokens.containerPadding, paddingEnd: tokens.containerPadding, paddingVertical: tokens.containerPadding });
  });
});

describe('behavior', () => {
  test('CRD-1: activating an interactive card calls onPress exactly once — touch and a bare (keyboard / assistive) click alike', async () => {
    const onPress = jest.fn();
    await mountAction({ onPress });
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    await wait(HOLD + 30);
    await click();
    expect(onPress).toHaveBeenCalledTimes(2);
    // Enter / Space and assistive activation reach a focusable, accessible Pressable as the same native click.
    expect(host().props.accessible).toBe(true);
    expect(host().props.focusable).toBe(true);
  });

  test('CRD-2: an interactive, disabled card does not call onPress, is not focusable and exposes disabled', async () => {
    const onPress = jest.fn();
    await mountAction({ onPress, disabled: true });
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
    expectDrawnFrom('outlined', 'disabled');
  });

  describe.each(variants)('CRD-3: %s', (variant) => {
    test.each(ACTIVE)('%s: container, outline, elevation, content color and opacity come from its tokens, and it returns to rest', async (target) => {
      await mountAction({ variant });
      await enter(target);
      expectDrawnFrom(variant, target);
      if (target === 'hovered') await fireEvent(host(), 'hoverOut');
      if (target === 'focused') await fireEvent(host(), 'blur');
      if (target === 'pressed') await release();
      expectDrawnFrom(variant, 'enabled');
    });
  });

  test('CRD-3: precedence is pressed over focused over hovered, under the acme fixture system (which values each differently)', async () => {
    // The spec's `verify` hint: acme's state layers are 0.06 / 0.12 / 0.2, so each winner is observable with real tokens.
    const outlined = acme.components.card.variants.outlined;
    const expected = (name: InteractionState) => painted(outlined[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    expect(acme.behavior.pressedFeedback).toBe('overlay');
    await mountAction({}, { theme: 'light', system: acme });
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

  test('CRD-3: in the default system a state is the container mixed with the variant\'s state-layer color, which is its content color', async () => {
    for (const variant of variants) {
      const view = await mountAction({ variant });
      const resting = tokens.variants[variant].enabled;
      expect(resting.stateLayerColor).toEqual(resting.contentColor);
      const mix = (amount: number): TanreiPaint => ({ kind: 'mix', base: resting.containerColor, with: resting.stateLayerColor, amount });
      await fireEvent(host(), 'hoverIn');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(sysState.hoverStateLayerOpacity)));
      await fireEvent(host(), 'focus');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(sysState.focusStateLayerOpacity)));
      await fireEvent(host(), 'pressIn');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(sysState.pressedStateLayerOpacity)));
      await release();
      await view.unmount();
    }
  });

  test('CRD-3: in the default system an elevated card rests on a shadow (level2) and rises to level3 on hover; filled and outlined stay flat', async () => {
    expect(tokens.variants.elevated.enabled.containerElevation).toBe('level2');
    expect(tokens.variants.elevated.hovered.containerElevation).toBe('level3');
    for (const variant of ['filled', 'outlined'] as const) for (const name of ['enabled', 'hovered', 'focused', 'pressed'] as const) expect(tokens.variants[variant][name].containerElevation).toBe('level0');
    await mountAction({ variant: 'elevated' });
    const level2 = resolveElevation(tanrei.elevation.level2, (name) => role(name));
    // At rest it casts a shadow: it does not draw exactly what an outlined card draws.
    expect(level2.boxShadow.length).toBeGreaterThan(0);
    expect(viewStyle(host()).boxShadow).toEqual(level2.boxShadow);
    await fireEvent(host(), 'hoverIn');
    const level3 = resolveElevation(tanrei.elevation.level3, (name) => role(name));
    expect(level3.boxShadow.length).toBeGreaterThan(level2.boxShadow.length);
    expect(viewStyle(host()).boxShadow).toEqual(level3.boxShadow);
  });

  test('CRD-3: focus gained by touch or pointer does not select the focused state', async () => {
    const system = withVariant('outlined', { focused: { containerColor: literal(2, 0, 0) } });
    await mountAction({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await release();
    expectDrawnFrom('outlined', 'enabled');
  });

  test('CRD-4: keyboard focus shows the focus ring at the focus offset around the container shape, without animation', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mountAction();
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
      borderRadius: tokens.containerShape + reach,
      pointerEvents: 'none',
    });
    expect(timing).not.toHaveBeenCalled();
    expect(viewStyle(host()).borderWidth).toBeUndefined();
    await fireEvent(host(), 'blur');
    expect(part('focus-ring')).toBeNull();
  });

  test('CRD-4: focus gained by touch or pointer does not show the focus ring; a later keyboard focus does', async () => {
    await mountAction();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).toBeNull();
    await release();
    expect(part('focus-ring')).toBeNull();
    await fireEvent(host(), 'blur');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).not.toBeNull();
  });

  test('CRD-5: a card smaller than the target gets a hit area of sys.target.touch on both axes, without changing its size; a larger one gets none', async () => {
    await mountAction({ inset: false });
    // Before the first layout pass: the smallest box a card can have — here none at all, so the whole target.
    const half = Math.ceil(measure.target.touch / 2);
    expect(host().props.hitSlop).toEqual({ top: half, bottom: half, left: half, right: half });
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 20 } } });
    const hit = host().props.hitSlop;
    expect(20 + hit.top + hit.bottom).toBeGreaterThanOrEqual(measure.target.touch);
    expect(hit.left).toBe(0);
    expect(viewStyle(host()).height).toBeUndefined();
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 120 } } });
    expect(host().props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  test('CRD-5: an inset card is never smaller than its padding around nothing: the estimate before layout', async () => {
    await mountAction();
    const slop = Math.max(0, Math.ceil((measure.target.touch - tokens.containerPadding * 2) / 2));
    expect(host().props.hitSlop).toEqual({ top: slop, bottom: slop, left: slop, right: slop });
  });

  describe.each(variants)('CRD-6: disabled %s', (variant) => {
    test('renders container, outline, elevation, content color and opacity from its disabled tokens', async () => {
      await mountAction({ variant, disabled: true });
      expectDrawnFrom(variant, 'disabled');
    });
  });

  test('CRD-6: in the default system a disabled card keeps its resting colors and dims as a whole to the disabled content opacity, with no shadow; a disabled elevated card keeps its ring (level1)', async () => {
    for (const variant of variants) {
      const view = await mountAction({ variant, disabled: true });
      const resting = tokens.variants[variant].enabled;
      expect(viewStyle(host())).toMatchObject({ opacity: sysState.disabledContentOpacity, backgroundColor: painted(resting.containerColor) });
      expect(textStyle(part('text')!).color).toBe(painted(resting.contentColor));
      expect(viewStyle(host()).boxShadow).toBeUndefined();
      if (variant === 'elevated') {
        expect(tokens.variants.elevated.disabled.containerElevation).toBe('level1');
        const ring = resolveElevation(tanrei.elevation.level1, (name) => role(name)).ring!;
        expect(viewStyle(part('elevation-ring')!)).toMatchObject({ borderColor: ring.color, borderWidth: ring.width });
      } else expect(part('elevation-ring')).toBeNull();
      await view.unmount();
    }
  });

  test('CRD-8: the pressed state appears in the same frame and stays visible for duration.pressHold although the press ended sooner', async () => {
    expect(HOLD).toBe(100);
    await mountAction({ variant: 'filled' });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('filled', 'pressed');
    await fireEvent(host(), 'pressOut');
    expectDrawnFrom('filled', 'pressed');
    await wait(HOLD / 2);
    expectDrawnFrom('filled', 'pressed');
    await wait(HOLD / 2 + 30);
    expectDrawnFrom('filled', 'enabled');
  });

  test('CRD-8: Enter / Space / assistive activation — a bare click — shows the pressed state for the hold', async () => {
    await mountAction({ variant: 'filled' });
    await click();
    expectDrawnFrom('filled', 'pressed');
    await wait(HOLD + 30);
    expectDrawnFrom('filled', 'enabled');
  });

  test('CRD-8: a touch ends on the touch events, not on Pressable\'s delayed onPressOut', async () => {
    await mountAction({ variant: 'filled' });
    await fireEvent(host(), 'pressIn', { nativeEvent: { timestamp: 0, touches: [] } });
    await fireEvent(host(), 'touchEnd', { nativeEvent: { timestamp: 10, touches: [] } });
    await wait(HOLD + 30);
    expectDrawnFrom('filled', 'enabled');
  });
});

describe('choices of kind: system.behavior', () => {
  const SIDE = { width: 240, height: 120 };
  const LAYOUT = { nativeEvent: { layout: { x: 0, y: 0, ...SIDE } } };

  test('CRD-9 overlay (the default): the pressed tokens reach the whole container at once; no extra node exists', async () => {
    reduceMotion(false);
    await mountAction({ variant: 'filled' });
    await fireEvent(host(), 'layout', LAYOUT);
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expectDrawnFrom('filled', 'pressed');
    expect(part('ripple')).toBeNull();
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  describe('CRD-9 ripple (m3-like)', () => {
    const card = m3Like.components.card;
    const color = (paint: TanreiPaint) => painted(paint, 'light', m3Like);

    test('the pressed container color grows from the point of contact over comp.card.motion.feedback-duration; the container keeps the state under the press; it fades over the state duration', async () => {
      expect(m3Like.behavior.pressedFeedback).toBe('ripple');
      reduceMotion(false);
      const timing = jest.spyOn(Animated, 'timing');
      const ref = createRef<CardRef>();
      await mountAction({ ref, variant: 'filled' }, { theme: 'light', system: m3Like });
      (ref.current as unknown as { measure: unknown }).measure = (callback: (...box: number[]) => void) => callback(0, 0, SIDE.width, SIDE.height, 300, 500);
      await fireEvent(host(), 'layout', LAYOUT);
      expect(part('ripple')).toBeNull();
      timing.mockClear();
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 310, pageY: 520 } });

      const filled = card.variants.filled;
      expect(viewStyle(host()).backgroundColor).toBe(color(filled.enabled.containerColor));
      expect(viewStyle(part('ripple')!)).toMatchObject({ position: 'absolute', overflow: 'hidden', pointerEvents: 'none', borderRadius: card.containerShape });
      const reach = Math.hypot(SIDE.width - 10, SIDE.height - 20);
      expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 10 - reach, top: 20 - reach, width: reach * 2, backgroundColor: color(filled.pressed.containerColor) });
      // Below the content, hidden from assistive technology.
      expect(host().children.indexOf(part('ripple')!)).toBeLessThan(host().children.indexOf(part('content')!));
      expect(part('ripple')!.props.accessible).toBe(false);
      expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: card.motionFeedbackDuration, useNativeDriver: true });
      // The content color still comes from the pressed tokens.
      expect(textStyle(part('text')!).color).toBe(color(filled.pressed.contentColor));

      timing.mockClear();
      await release();
      expect(timing.mock.calls.some(([, config]) => config.toValue === 0 && config.duration === card.motionStateDuration)).toBe(true);
      await wait(card.motionStateDuration * 2 + 50);
      expect(part('ripple')).toBeNull();
    });

    test('keyboard activation ripples from the center; with reduce motion nothing grows and the pressed tokens apply at once', async () => {
      reduceMotion(false);
      const view = await mountAction({}, { theme: 'light', system: m3Like });
      await fireEvent(host(), 'layout', LAYOUT);
      await click();
      const reach = Math.hypot(SIDE.width / 2, SIDE.height / 2);
      expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: SIDE.width / 2 - reach, top: SIDE.height / 2 - reach, width: reach * 2 });
      await wait(HOLD + 30);
      await wait(card.motionStateDuration * 2 + 50);
      await view.unmount();

      reduceMotion(true);
      await mountAction({}, { theme: 'light', system: m3Like });
      await fireEvent(host(), 'layout', LAYOUT);
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
      expect(part('ripple')).toBeNull();
      expect(viewStyle(host()).backgroundColor).toBe(fill(card.variants.outlined.pressed.containerColor, 'light', m3Like));
      await release();
    });
  });

  test('CRD-9 dim: the pressed opacity on the whole card and NO state layer — the container keeps the state under the press; content, outline and elevation come from the pressed tokens', async () => {
    const system = withBehavior(
      { pressedFeedback: 'dim' },
      withVariant('outlined', { pressed: { contentColor: literal(10, 20, 30), outlineColor: literal(40, 50, 60), containerElevation: 'level3' } }, withCard({ pressedOpacity: 0.5 })),
    );
    await mountAction({}, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host())).toMatchObject({ opacity: 0.5, backgroundColor: painted(tokens.variants.outlined.hovered.containerColor) });
    expect(textStyle(part('text')!).color).toBe('rgb(10, 20, 30)');
    expect(viewStyle(part('outline')!).borderColor).toBe('rgb(40, 50, 60)');
    expect(viewStyle(host()).boxShadow).toEqual(resolveElevation(tanrei.elevation.level3, (name) => role(name)).boxShadow);
    expect(part('ripple')).toBeNull();
    await release();
    expect(viewStyle(host()).opacity).toBe(tokens.hoveredOpacity);
  });

  test('CRD-9 none: no answer to the press — every part stays with the state under the press; the click still happens', async () => {
    const onPress = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withVariant('outlined', { pressed: { containerColor: literal(1, 2, 3), contentColor: literal(10, 20, 30), outlineColor: literal(40, 50, 60) } }, withCard({ pressedOpacity: 0.5 })));
    await mountAction({ onPress }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('outlined', 'enabled', system.components.card);
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    await release();
  });

  test('CRD-10 corner smoothing: an amount above 0 (cupertino: 0.6) reaches the container, the content clip, the outline and the focus ring as the OS curve; 0 adds nothing', async () => {
    expect(tanrei.shape.cornerSmoothing).toBe(0);
    const view = await mountAction();
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('content')!, part('outline')!, part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBeUndefined();
    await view.unmount();

    expect(cupertino.shape.cornerSmoothing).toBe(0.6);
    await mountAction({}, { theme: 'light', system: cupertino });
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('content')!, part('outline')!, part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBe('continuous');
  });

  test('CRD-10 corner smoothing on Android: circular whatever the amount', async () => {
    const os = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    try {
      await mountAction({}, { theme: 'light', system: cupertino });
      expect(viewStyle(host()).borderCurve).toBeUndefined();
    } finally {
      os.restore();
    }
  });

  test('CRD-10 focus-style: glow (acme) draws the focus colors as ONE halo around the container shape', async () => {
    await mountAction({}, { theme: 'light', system: acme });
    await fireEvent(host(), 'focus');
    const { offset, innerWidth, outerWidth } = acme.measure.focus;
    expect(viewStyle(part('focus-ring')!)).toMatchObject({
      borderRadius: acme.components.card.containerShape + offset,
      boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: outerWidth, spreadDistance: innerWidth + outerWidth, color: painted({ kind: 'role', role: 'focusRing' }, 'light', acme) }],
    });
    expect(part('focus-ring')!.props.accessible).toBe(false);
  });
});

describe('a card that is not interactive (CRD-11)', () => {
  test('CRD-11: without onPress the card is a plain view — not focusable, no role, no press handlers, no hit slop', async () => {
    await mount();
    expect(host().type).toBe('View');
    expect(host().props.accessibilityRole).toBeUndefined();
    expect(host().props.accessible).toBeUndefined();
    expect(host().props.focusable).toBeUndefined();
    expect(host().props.onClick).toBeUndefined();
    expect(host().props.onResponderRelease).toBeUndefined();
    expect(host().props.hitSlop).toBeUndefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('CRD-11: it draws no hover, focus or press answer and ignores disabled — the resting tokens of its variant', async () => {
    for (const variant of variants) {
      const view = await mount({ variant, disabled: true });
      expectDrawnFrom(variant, 'enabled');
      for (const target of ACTIVE) await enter(target);
      expectDrawnFrom(variant, 'enabled');
      expect(part('focus-ring')).toBeNull();
      expect(part('ripple')).toBeNull();
      expect(host().props.accessibilityState).toBeUndefined();
      await view.unmount();
    }
  });
});

describe('content (CRD-12, CRD-13)', () => {
  test('CRD-12: inset puts comp.card.container.padding on every side of the content, by logical start and end; inset false puts none', async () => {
    const inset = await mount();
    const clip = viewStyle(part('content')!);
    expect(clip).toMatchObject({ paddingStart: tokens.containerPadding, paddingEnd: tokens.containerPadding, paddingVertical: tokens.containerPadding });
    expect(clip.paddingLeft).toBeUndefined();
    expect(clip.paddingHorizontal).toBeUndefined();
    await inset.unmount();
    await mount({ inset: false });
    expect(viewStyle(part('content')!)).toMatchObject({ paddingStart: 0, paddingEnd: 0, paddingVertical: 0 });
  });

  test('CRD-12: the content is clipped to the container\'s shape, the outline is drawn above it, and the card has no height of its own', async () => {
    await mount({ inset: false, children: <View testID="photo" /> });
    expect(viewStyle(part('content')!)).toMatchObject({ overflow: 'hidden', borderRadius: tokens.containerShape });
    // The host is not the clip: its shadow and rings are drawn outside it.
    expect(viewStyle(host()).overflow).toBeUndefined();
    const children = host().children;
    expect(children.indexOf(part('outline')!)).toBeGreaterThan(children.indexOf(part('content')!));
    expect(viewStyle(part('outline')!)).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: tokens.outlineWidth });
    for (const key of ['height', 'minHeight', 'maxHeight'] as const) expect(viewStyle(host())[key]).toBeUndefined();
    expect(screen.getByTestId('photo')).toBeTruthy();
  });

  test('CRD-12: the outline is drawn for the outlined variant only (the others\' outline paint is none)', async () => {
    for (const variant of variants) {
      const view = await mount({ variant });
      if (variant === 'outlined') expect(part('outline')).not.toBeNull();
      else expect(part('outline')).toBeNull();
      await view.unmount();
    }
  });

  test('CRD-13: text content is drawn in the content color of the variant and state, in the body type style, scaling with the font', async () => {
    await mountAction({ variant: 'filled' }, { theme: 'dark' });
    const text = part('text')!;
    expect(textStyle(text).color).toBe(painted(tokens.variants.filled.enabled.contentColor, 'dark'));
    expect(textStyle(text)).toMatchObject({ fontSize: tanrei.typescale.body.size, lineHeight: tanrei.typescale.body.lineHeight });
    expect(text.props.allowFontScaling).toBe(true);
    expect(text.props.numberOfLines).toBeUndefined();
  });

  test('CRD-13: any other content reads the content color from the Tanrei context (useContentColor), in the card\'s current state', async () => {
    const seen: (string | undefined)[] = [];
    function Probe() {
      const color = useContentColor();
      seen.push(color);
      return <Text style={{ color }}>Revenue</Text>;
    }
    const system = withVariant('outlined', { hovered: { contentColor: literal(1, 2, 3) } });
    await mountAction({ children: <Probe /> }, { theme: 'light', system });
    expect(seen.at(-1)).toBe(painted(tokens.variants.outlined.enabled.contentColor));
    await fireEvent(host(), 'hoverIn');
    expect(seen.at(-1)).toBe('rgb(1, 2, 3)');
    expect(part('text')).toBeNull();
  });

  test('CRD-13: outside a card there is no content color', async () => {
    let seen: string | undefined = 'unset';
    function Probe() {
      seen = useContentColor();
      return null;
    }
    await render(<Probe />);
    expect(seen).toBeUndefined();
  });
});

describe('accessibility (CRD-14, CRD-15)', () => {
  const development = (enabled: boolean) => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
  };
  afterEach(() => development(true));
  const unnamedReports = (spy: jest.SpyInstance) => spy.mock.calls.filter(([message]) => String(message).includes('has no accessibilityLabel'));

  test('CRD-14: an interactive card is exactly one focusable element with the button role, named by its label', async () => {
    await mountAction();
    expect(screen.getByRole('button', { name: LABEL })).toBe(host());
    expect(host().props).toMatchObject({ accessibilityRole: 'button', accessible: true, focusable: true, accessibilityLabel: LABEL });
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  test('CRD-14 / CRD-15: the merged element is the only one exposed — nothing inside is accessible or focusable of its own', async () => {
    await mountAction({ children: [<Text key="h">{LABEL}</Text>, <Text key="b">Revenue grew 12%.</Text>] });
    type Node = { props: Record<string, unknown>; children: readonly (Node | string)[] };
    const exposed: Node[] = [];
    const walk = (node: Node | string) => {
      if (typeof node === 'string') return;
      if (node.props.accessible === true || node.props.focusable === true) exposed.push(node);
      node.children.forEach(walk);
    };
    walk(host() as unknown as Node);
    expect(exposed).toEqual([host()]);
  });

  test('CRD-14: without a label the content text is the name, and development builds report it once', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ onPress: noop });
    expect(screen.getByRole('button', { name: TEXT })).toBe(host());
    expect(unnamedReports(warn)).toHaveLength(1);
    expect(String(unnamedReports(warn)[0]![0])).toContain(`testID "${ID}"`);
  });

  test('CRD-14: without a label, non-text content is merged by the accessible host (no label of the card\'s own); aria-label counts as a name', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ onPress: noop, children: [<Text key="h">Report</Text>, <Text key="b">Revenue</Text>] });
    expect(host().props.accessibilityLabel).toBeUndefined();
    expect(host().props.accessible).toBe(true);
    expect(unnamedReports(warn)).toHaveLength(1);
    await view.unmount();
    warn.mockClear();
    await mount({ onPress: noop, 'aria-label': LABEL });
    expect(unnamedReports(warn)).toHaveLength(0);
  });

  test('CRD-14: a release build says nothing', async () => {
    development(false);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ onPress: noop });
    expect(warn).not.toHaveBeenCalled();
  });

  test('CRD-14: a card that is not interactive has no role and leaves its content\'s semantics untouched — no report either', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ children: [<Text key="h" accessibilityRole="header">{LABEL}</Text>, <Text key="b">Revenue</Text>] });
    expect(host().props.accessibilityRole).toBeUndefined();
    expect(host().props.role).toBeUndefined();
    expect(screen.getByRole('header', { name: LABEL })).toBeTruthy();
    expect(warn).not.toHaveBeenCalled();
  });

  test('CRD-14: a card that is not interactive, with a label, is a group named by it — still not one merged element', async () => {
    await mount({ accessibilityLabel: LABEL });
    expect(host().props).toMatchObject({ role: 'group', accessibilityLabel: LABEL });
    expect(host().props.accessible).toBeUndefined();
    expect(host().props.accessibilityRole).toBeUndefined();
  });

  test('decorative layers are hidden from assistive technology and from touches', async () => {
    await mountAction({ variant: 'outlined' });
    await fireEvent(host(), 'focus');
    for (const name of ['outline', 'focus-ring']) {
      expect(part(name)!.props.accessible).toBe(false);
      expect(part(name)!.props.importantForAccessibility).toBe('no');
      expect(viewStyle(part(name)!).pointerEvents).toBe('none');
    }
  });

  test('text size does not clip a card: no height, no line limit, font scaling on', async () => {
    await mount();
    expect(viewStyle(host()).height).toBeUndefined();
    expect(part('text')!.props.numberOfLines).toBeUndefined();
    expect(part('text')!.props.allowFontScaling).toBe(true);
  });

  test('forwards its ref to the host view and passes caller handlers and layout style through', async () => {
    const ref = createRef<CardRef>();
    const onPressIn = jest.fn();
    const onFocus = jest.fn();
    const onLayout = jest.fn();
    await mountAction({ ref, onPressIn, onFocus, onLayout, style: { marginTop: 4 } });
    expect(ref.current).not.toBeNull();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 100 } } });
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(viewStyle(host()).marginTop).toBe(4);
    await release();
  });

  test('a card that is not interactive forwards its ref and onLayout too', async () => {
    const ref = createRef<CardRef>();
    const onLayout = jest.fn();
    await mount({ ref, onLayout });
    expect(ref.current).not.toBeNull();
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 100 } } });
    expect(onLayout).toHaveBeenCalledTimes(1);
  });
});

describe('motion (CRD-16)', () => {
  test('CRD-16: state changes animate with comp.card.motion.state-*, the press is immediate', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    await mountAction({ variant: 'filled' });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    const curve = bezier.mock.results[0]!.value;
    expect(timing).not.toHaveBeenCalled();

    await fireEvent(host(), 'hoverIn');
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: tokens.motionStateDuration, easing: curve, useNativeDriver: false });
    await wait(tokens.motionStateDuration * 2);

    timing.mockClear();
    await fireEvent(host(), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    expect(viewStyle(host()).backgroundColor).toBe(painted(tokens.variants.filled.pressed.containerColor));
    await release();
    expect(timing).toHaveBeenCalledTimes(1);
    await wait(tokens.motionStateDuration * 2);
  });

  test('CRD-16: the elevation, the colors and the opacity move from the values on screen to the new state\'s', async () => {
    reduceMotion(false);
    const system = withVariant('elevated', { hovered: { containerColor: literal(255, 0, 0), contentColor: literal(0, 0, 255) } }, withCard({ motionStateDuration: 40, hoveredOpacity: 0.5 }));
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await mountAction({ variant: 'elevated' }, { theme: 'light', system });
    interpolate.mockClear();
    await fireEvent(host(), 'hoverIn');
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    expect(ranges).toContainEqual([painted(tokens.variants.elevated.enabled.containerColor), 'rgb(255, 0, 0)']);
    expect(ranges).toContainEqual([painted(tokens.variants.elevated.enabled.contentColor), 'rgb(0, 0, 255)']);
    expect(ranges).toContainEqual([1, 0.5]);
    // level2 (one shadow layer) → level3 (three): each layer moves, and the layers level2 lacks grow from nothing.
    const level2 = resolveElevation(tanrei.elevation.level2, (name) => role(name));
    const level3 = resolveElevation(tanrei.elevation.level3, (name) => role(name));
    expect(ranges).toContainEqual([level2.boxShadow[0]!.blurRadius, level3.boxShadow[0]!.blurRadius]);
    expect(ranges).toContainEqual([0, level3.boxShadow[1]!.blurRadius]);
    await wait(120);
    expect(viewStyle(host()).boxShadow).toEqual(level3.boxShadow);
  });

  test('CRD-16: where motion is reduced every change lands at once', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mountAction({ variant: 'elevated' });
    await fireEvent(host(), 'hoverIn');
    expect(timing).not.toHaveBeenCalled();
    expectDrawnFrom('elevated', 'hovered');
  });
});

describe('direction (CRD-17)', () => {
  test('CRD-17: in a right-to-left layout the padding stays logical and nothing is placed by left or right; the content is not mirrored by the card', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    try {
      await mount({ children: <View testID="row" style={{ flexDirection: 'row' }} /> });
      const clip = viewStyle(part('content')!);
      expect(clip).toMatchObject({ paddingStart: tokens.containerPadding, paddingEnd: tokens.containerPadding });
      for (const key of ['paddingLeft', 'paddingRight', 'direction', 'transform'] as const) expect(clip[key]).toBeUndefined();
      expect(viewStyle(host()).direction).toBeUndefined();
      expect(viewStyle(screen.getByTestId('row')).flexDirection).toBe('row');
    } finally {
      rtl.restore();
    }
  });

  test('CRD-17: a ripple grows from the point of contact in right-to-left as in left-to-right (physical coordinates)', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    reduceMotion(false);
    try {
      const ref = createRef<CardRef>();
      await mountAction({ ref }, { theme: 'light', system: m3Like });
      (ref.current as unknown as { measure: unknown }).measure = (callback: (...box: number[]) => void) => callback(0, 0, 200, 100, 0, 0);
      await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 100 } } });
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 30, pageY: 40 } });
      const reach = Math.hypot(170, 60);
      expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 30 - reach, top: 40 - reach });
      await release();
      await wait(m3Like.components.card.motionStateDuration * 2 + 50);
    } finally {
      rtl.restore();
    }
  });
});

describe('open variant key', () => {
  const development = (enabled: boolean) => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
  };
  afterEach(() => development(true));

  test('CRD-7: an unknown variant renders exactly like outlined, at rest and in every state', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reference = await mountAction({ variant: 'outlined' });
    const expected = JSON.stringify(reference.toJSON());
    await reference.unmount();
    await mountAction({ variant: 'ghost' as CardVariant });
    expect(JSON.stringify(screen.toJSON())).toBe(expected);
    for (const target of ACTIVE) {
      await enter(target);
      expectDrawnFrom('outlined', target);
    }
    await release();
  });

  test('CRD-7: development builds report the unknown value once per key; a release build renders the default silently', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (let i = 0; i < 2; i += 1) {
      const view = await mount({ variant: 'phantom' as CardVariant });
      await view.unmount();
    }
    expect(warn.mock.calls.filter(([message]) => String(message).includes('no Card variant "phantom"; using "outlined"'))).toHaveLength(1);
    warn.mockClear();
    resetLookupReports();
    development(false);
    await mount({ variant: 'spectre' as CardVariant });
    expectDrawnFrom('outlined', 'enabled');
    expect(warn).not.toHaveBeenCalled();
  });

  test('a known value is never reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const variant of variants) {
      const view = await mountAction({ variant });
      await view.unmount();
    }
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
    test.each(variants)('%s resolves container, content, outline and elevation from its paints in this scheme, at rest and hovered', async (variant) => {
      await mountAction({ variant }, provider);
      expectDrawnFrom(variant, 'enabled', tokens, scheme);
      await fireEvent(host(), 'hoverIn');
      expectDrawnFrom(variant, 'hovered', tokens, scheme);
    });
  });

  test('the default values: corner medium (8), padding space200 (16), hairline outline; outlined on surface / outline-variant, filled on surface-container-highest, elevated on surface-container-lowest', () => {
    expect(tokens.containerShape).toBe(tanrei.shape.medium);
    expect(tokens.containerPadding).toBe(tanrei.space.space200);
    expect(tokens.outlineWidth).toBe(tanrei.measure.border.hairline);
    expect(painted(tokens.variants.outlined.enabled.containerColor)).toBe(role('surface'));
    expect(painted(tokens.variants.outlined.enabled.outlineColor)).toBe(role('outlineVariant'));
    expect(painted(tokens.variants.filled.enabled.containerColor)).toBe(role('surfaceContainerHighest'));
    expect(painted(tokens.variants.elevated.enabled.containerColor)).toBe(role('surfaceContainerLowest'));
    for (const variant of variants) expect(painted(tokens.variants[variant].enabled.contentColor)).toBe(role('onSurface'));
    expect(evaluatePaint(tokens.variants.filled.enabled.outlineColor, colors.light).a).toBe(0);
  });

  test('stateShape reads the card\'s opacity per state; its corners do not change with the state', () => {
    for (const name of ['enabled', 'hovered', 'focused', 'pressed', 'disabled'] as const) expect(stateShape(tokens, name)).toEqual({ opacity: opacityOf(tokens, name), shape: tokens.containerShape });
  });
});

describe('the system drives rendering', () => {
  test('padding, shape and outline width re-valued by a layer reach the content inset, the clip, the container, the outline and the focus ring', async () => {
    const system = withCard({ containerPadding: 24, containerShape: 20, outlineWidth: 3 });
    await mountAction({}, { theme: 'light', system });
    await fireEvent(host(), 'focus');
    expect(viewStyle(part('content')!)).toMatchObject({ paddingStart: 24, paddingEnd: 24, paddingVertical: 24, borderRadius: 20 });
    expect(viewStyle(host()).borderRadius).toBe(20);
    expect(viewStyle(part('outline')!)).toMatchObject({ borderWidth: 3, borderRadius: 20 });
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(part('focus-ring')!).borderRadius).toBe(20 + reach);
  });

  test('a disabled opacity of 0.5 and a disabled content color re-valued by a layer are drawn', async () => {
    const system = withVariant('filled', { disabled: { contentColor: literal(7, 8, 9) } }, withCard({ disabledOpacity: 0.5 }));
    await mountAction({ variant: 'filled', disabled: true }, { theme: 'light', system });
    expect(viewStyle(host()).opacity).toBe(0.5);
    expect(textStyle(part('text')!).color).toBe('rgb(7, 8, 9)');
  });

  test('an outline or an elevation that exists only in one state appears in that state', async () => {
    const system = withVariant('filled', { hovered: { outlineColor: { kind: 'role', role: 'outline' }, containerElevation: 'level3' } });
    await mountAction({ variant: 'filled' }, { theme: 'light', system });
    expect(part('outline')).toBeNull();
    await fireEvent(host(), 'hoverIn');
    expectDrawnFrom('filled', 'hovered', system.components.card);
    expect(viewStyle(part('outline')!).borderColor).toBe(role('outline'));
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(cardSubject);

  test('every interactive fixture names the card (label), so none of them reports CRD-14', () => {
    for (const fixture of spec.fixtures) if (fixture.props.interactive) expect(fixture.props.label).toBeTruthy();
  });
});
