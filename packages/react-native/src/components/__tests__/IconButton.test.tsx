// IconButton — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/icon-button.spec.json; every behaviour id is cited by the test that covers it.
import { createRef, useState, type ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type {
  TanreiColorRole,
  TanreiCoreIconButtonSize,
  TanreiCoreIconButtonVariant,
  TanreiIconButtonSizeTokens,
  TanreiIconButtonTokens,
  TanreiIconButtonVariantStateTokens,
  TanreiPaint,
  TanreiScheme,
  TanreiSystem,
} from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { stateShape } from '../../primitives/stateShape';
import { byTestID, describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetIconReport, type TanreiIconFontResolver } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { toFontWeight } from '../../theme/typography';
import { IconButton, type IconButtonIconProps, type IconButtonProps, type IconButtonRef, type IconButtonSize, type IconButtonVariant } from '../IconButton';
import { acme } from './__fixtures__/acme';
import { iconButtonSubject } from './IconButton.subject';

const spec = loadSpec('icon-button');
const { measure, state } = tanrei;
const colors: TanreiSystem['colors'] = tanrei.colors;
const tokens: TanreiIconButtonTokens = tanrei.components.iconButton;
const standard = tokens.variants.standard;
const medium = tokens.sizes.medium;
const ID = 'icon-button';
const LABEL = 'Favorite';

const { host, part } = byTestID(ID);
const glyph = () => part('glyph')!;

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light') => formatColor(colors[scheme][name]!);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
/** `undefined` when the paint draws nothing: the component then sets no fill / renders no outline. */
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));

/** The default system with some icon-button tokens changed — what a preset or a product layer does. */
const withIconButton = (overrides: Partial<TanreiIconButtonTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'iconButton', overrides);
/** …with some tokens of one variant changed, per state. */
const withVariant = (variant: TanreiCoreIconButtonVariant, overrides: { [State in InteractionState]?: Partial<TanreiIconButtonVariantStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.iconButton.variants[variant];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withIconButton({ variants: { ...base.components.iconButton.variants, [variant]: { ...current, ...changed } } }, base);
};
/** …with some tokens of one size changed. */
const withSize = (size: TanreiCoreIconButtonSize, overrides: Partial<TanreiIconButtonSizeTokens>, base: TanreiSystem = tanrei): TanreiSystem =>
  withIconButton({ sizes: { ...base.components.iconButton.sizes, [size]: { ...base.components.iconButton.sizes[size], ...overrides } } }, base);

function mount(props: Partial<IconButtonProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  const element: ReactElement = (
    <TanreiProvider {...provider}>
      <IconButton testID={ID} accessibilityLabel={LABEL} {...props}>
        {props.children ?? 'favorite'}
      </IconButton>
    </TanreiProvider>
  );
  return render(element);
}

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

// The CORE values of the two axes: what every system has. (Values a system adds: IconButton.extensions.test.tsx.)
const variants: TanreiCoreIconButtonVariant[] = ['standard', 'filled', 'tonal', 'outlined'];
const sizes: TanreiCoreIconButtonSize[] = ['small', 'medium', 'large'];

/** ICB-12: which parts of a variant are drawn — the variant's own (a plain button), or those of a toggle that is off / on. */
type Look = 'plain' | 'unselected' | 'selected';
const LOOKS: readonly Look[] = ['plain', 'unselected', 'selected'];
const lookProps = (look: Look): Partial<IconButtonProps> => (look === 'plain' ? {} : { toggle: true, selected: look === 'selected' });
/** Written out member by member, independently of the component. */
const paintsOf = (t: TanreiIconButtonVariantStateTokens, look: Look) =>
  look === 'plain'
    ? { container: t.containerColor, icon: t.iconColor, outline: t.outlineColor }
    : look === 'unselected'
      ? { container: t.unselectedContainerColor, icon: t.unselectedIconColor, outline: t.unselectedOutlineColor }
      : { container: t.selectedContainerColor, icon: t.selectedIconColor, outline: t.selectedOutlineColor };
/** The axis-free tokens of a state, written out independently of `stateShape`. */
const shapeOf = (from: TanreiIconButtonTokens, in_: InteractionState) =>
  ({
    enabled: { opacity: 1, shape: from.containerShape },
    hovered: { opacity: from.hoveredOpacity, shape: from.hoveredContainerShape },
    focused: { opacity: from.focusedOpacity, shape: from.focusedContainerShape },
    pressed: { opacity: from.pressedOpacity, shape: from.pressedContainerShape },
    disabled: { opacity: from.disabledOpacity, shape: from.disabledContainerShape },
  })[in_];

/** Enter / Space / D-pad centre and assistive activation: a bare click (no press events, no touch data). */
const click = () => fireEvent(host(), 'press', { nativeEvent: { target: 1 } });

/** ICB-8: a press stays visible for `duration.pressHold`, so a release is over only after that. */
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

/** Everything ICB-3 / ICB-6 / ICB-12 name — container, icon, outline, opacity, shape — from one state's tokens of one look. */
function expectDrawnFrom(variant: TanreiCoreIconButtonVariant, in_: InteractionState, look: Look = 'plain', from: TanreiIconButtonTokens = tokens, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) {
  const paints = paintsOf(from.variants[variant][in_], look);
  const { opacity, shape } = shapeOf(from, in_);
  const container = viewStyle(host());
  expect(container.backgroundColor).toBe(fill(paints.container, scheme, system));
  expect(container.opacity).toBe(opacity);
  expect(container.borderRadius).toBe(shape);
  expect(textStyle(glyph()).color).toBe(painted(paints.icon, scheme, system));
  const outline = fill(paints.outline, scheme, system);
  if (outline === undefined) expect(part('outline')).toBeNull();
  else expect(viewStyle(part('outline')!)).toMatchObject({ borderColor: outline, borderWidth: from.sizes.medium.outlineWidth, borderRadius: shape });
}

beforeEach(() => {
  // Most tests assert settled values; the animated path has its own test.
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
    expect(platform.name).toBe(IconButton.name);
    expect(platform.props).toEqual({ variant: 'variant', size: 'size', toggle: 'toggle', selected: 'selected', disabled: 'disabled', label: 'accessibilityLabel' });
    expect(platform.events).toEqual({ click: 'onPress', change: 'onSelectedChange' });
  });

  test('the enum values under test are exactly the spec values, and they are the token axes', () => {
    const values = (name: string) => spec.props.find((p) => p.name === name)?.values;
    expect(values('variant')).toEqual(variants);
    expect(values('size')).toEqual(sizes);
    expect(Object.keys(tokens.variants)).toEqual(variants);
    expect(Object.keys(tokens.sizes)).toEqual(sizes);
  });

  test('defaults follow the spec: variant standard, size medium, not a toggle, enabled', async () => {
    await mount();
    expectDrawnFrom('standard', 'enabled');
    expect(viewStyle(host())).toMatchObject({ width: medium.containerSize, height: medium.containerSize });
    expect(host().props.accessibilityState).toEqual({ disabled: false });
  });
});

describe('behavior', () => {
  test('ICB-1: activating the icon button calls onPress exactly once — touch and a bare (keyboard / assistive) click alike', async () => {
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

  test('ICB-2: a disabled icon button calls neither onPress nor onSelectedChange, is not focusable and exposes disabled', async () => {
    const onPress = jest.fn();
    const onSelectedChange = jest.fn();
    await mount({ onPress, onSelectedChange, toggle: true, disabled: true });
    await fireEvent.press(host());
    await click();
    expect(onPress).not.toHaveBeenCalled();
    expect(onSelectedChange).not.toHaveBeenCalled();
    expect(host().props.focusable).toBe(false);
    expect(host().props.accessibilityState).toEqual({ disabled: true, selected: false });
    expect(host()).toBeDisabled();
    expect(screen.getByRole('button', { name: LABEL, disabled: true })).toBe(host());
    // A focus or hover event that still arrives shows no ring and leaves the disabled tokens in place.
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'hoverIn');
    expect(part('focus-ring')).toBeNull();
    expectDrawnFrom('standard', 'disabled', 'unselected');
  });

  test('ICB-3: hover, keyboard focus and press each draw the icon button from that state\'s tokens, and it returns', async () => {
    await mount({ variant: 'filled' });
    expectDrawnFrom('filled', 'enabled');
    // There is no overlay element: the state is in the container's own values.
    expect(part('state-layer')).toBeNull();
    for (const target of ['hovered', 'focused', 'pressed'] as const) {
      await enter(target);
      expectDrawnFrom('filled', target);
      expect(viewStyle(host()).backgroundColor).not.toBe(painted(tokens.variants.filled.enabled.containerColor));
      if (target === 'hovered') await fireEvent(host(), 'hoverOut');
      if (target === 'focused') await fireEvent(host(), 'blur');
      if (target === 'pressed') await release();
      expectDrawnFrom('filled', 'enabled');
    }
  });

  test('ICB-3: precedence is pressed over focused over hovered, under the acme fixture system (which values each differently)', async () => {
    // The spec's `verify` hint: acme's state layers are 0.06 / 0.12 / 0.2, so each winner is observable with real tokens.
    const filled = acme.components.iconButton.variants.filled;
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

  describe.each(variants)('ICB-3: %s', (variant) => {
    test.each(LOOKS.flatMap((look) => (['hovered', 'focused', 'pressed'] as const).map((target) => ({ look, target }))))(
      '$look, $target: container, icon, outline, opacity and shape come from its tokens',
      async ({ look, target }) => {
        await mount({ variant, ...lookProps(look) });
        await enter(target);
        expectDrawnFrom(variant, target, look);
      },
    );
  });

  test('ICB-3: in the default system a state is the container mixed with the look\'s state-layer color, which is its icon color', async () => {
    for (const look of LOOKS) {
      const view = await mount({ variant: 'tonal', ...lookProps(look) });
      const resting = paintsOf(tokens.variants.tonal.enabled, look);
      const mix = (amount: number): TanreiPaint => ({ kind: 'mix', base: resting.container, with: resting.icon, amount });
      await fireEvent(host(), 'hoverIn');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(state.hoverStateLayerOpacity)));
      await fireEvent(host(), 'focus');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(state.focusStateLayerOpacity)));
      await fireEvent(host(), 'pressIn');
      expect(viewStyle(host()).backgroundColor).toBe(painted(mix(state.pressedStateLayerOpacity)));
      await view.unmount();
    }
  });

  test('ICB-3: focus gained by touch or pointer does not select the focused state', async () => {
    const system = withVariant('standard', { focused: { containerColor: literal(2, 0, 0) } });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await release();
    expectDrawnFrom('standard', 'enabled');
  });

  test('ICB-3: state changes animate with the motion tokens, press is immediate', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    await mount({ variant: 'filled' });
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

  test('ICB-3: a transition runs from the values on screen to the new state\'s values — the icon color too', async () => {
    reduceMotion(false);
    const system = withVariant('standard', { hovered: { containerColor: literal(255, 0, 0), iconColor: literal(0, 0, 255) } }, withIconButton({ motionStateDuration: 40, hoveredOpacity: 0.5, hoveredContainerShape: 20 }));
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await mount({}, { theme: 'light', system });
    interpolate.mockClear();
    await fireEvent(host(), 'hoverIn');
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    // The standard container draws nothing at rest: the transition fades the new color in from its own channels.
    expect(ranges).toContainEqual(['rgba(255, 0, 0, 0)', 'rgb(255, 0, 0)']);
    expect(ranges).toContainEqual([painted(standard.enabled.iconColor), 'rgb(0, 0, 255)']);
    expect(ranges).toContainEqual([1, 0.5]);
    expect(ranges).toContainEqual([tokens.containerShape, 20]);
    await wait(120);
  });

  test('ICB-4: keyboard focus shows the focus ring at the focus offset around the focused shape, without animation', async () => {
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
    expect(ring.type).toBe('View');
    expect(timing).not.toHaveBeenCalled();
    // The ring is outside the box: the square does not change.
    expect(viewStyle(host())).toMatchObject({ width: medium.containerSize, height: medium.containerSize });
    expect(viewStyle(host()).borderWidth).toBeUndefined();
    await fireEvent(host(), 'blur');
    expect(part('focus-ring')).toBeNull();
  });

  test('ICB-4: focus gained by touch or pointer does not show the focus ring; a later keyboard focus does', async () => {
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
    { size: 'small' as const, slop: 8 },
    { size: 'medium' as const, slop: 6 },
    { size: 'large' as const, slop: 4 },
  ])('ICB-5: the $size square gets a hit area of sys.target.touch on both axes, before and after layout, without changing its size', async ({ size, slop }) => {
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

  test('ICB-5: the target comes from the system', async () => {
    const system: TanreiSystem = { ...tanrei, measure: { ...measure, target: { ...measure.target, touch: 60 } } };
    await mount({}, { theme: 'light', system });
    expect(host().props.hitSlop).toEqual({ top: 12, bottom: 12, left: 12, right: 12 });
  });

  describe.each(variants)('ICB-6: disabled %s', (variant) => {
    test.each(LOOKS)('%s renders container, icon, outline, opacity and shape from its disabled tokens', async (look) => {
      await mount({ variant, disabled: true, ...lookProps(look) });
      expectDrawnFrom(variant, 'disabled', look);
    });
  });

  test('ICB-6: in the default system a disabled icon is on-surface at the disabled content opacity, a disabled container on-surface at the container opacity', async () => {
    const onSurface = colors.light.onSurface;
    await mount({ variant: 'filled', disabled: true });
    expect(viewStyle(host()).backgroundColor).toBe(formatColor({ ...onSurface, a: state.disabledContainerOpacity }));
    expect(textStyle(glyph()).color).toBe(formatColor({ ...onSurface, a: state.disabledContentOpacity }));
  });

  test('ICB-6: in the default system a look that is clear at rest stays clear when disabled, an outline that is none stays none, and the outlined border fades', async () => {
    const faded = formatColor({ ...colors.light.onSurface, a: state.disabledContainerOpacity });
    for (const variant of ['standard', 'outlined'] as const) {
      for (const look of LOOKS) {
        const resting = paintsOf(tokens.variants[variant].enabled, look);
        const view = await mount({ variant, disabled: true, ...lookProps(look) });
        if (evaluatePaint(resting.container, colors.light).a === 0) expect(viewStyle(host()).backgroundColor).toBeUndefined();
        if (evaluatePaint(resting.outline, colors.light).a === 0) expect(part('outline')).toBeNull();
        else expect(viewStyle(part('outline')!).borderColor).toBe(faded);
        await view.unmount();
      }
    }
    // No look of any variant gains an outline when disabled.
    for (const variant of variants) {
      for (const look of LOOKS) {
        const resting = paintsOf(tokens.variants[variant].enabled, look);
        if (evaluatePaint(resting.outline, colors.light).a === 0) expect(evaluatePaint(paintsOf(tokens.variants[variant].disabled, look).outline, colors.light).a).toBe(0);
      }
    }
  });

  test('ICB-6: a disabled toggle draws the disabled tokens of its selection', async () => {
    const system = withVariant('filled', { disabled: { selectedIconColor: literal(1, 2, 3), unselectedIconColor: literal(4, 5, 6) } });
    const on = await mount({ variant: 'filled', toggle: true, selected: true, disabled: true }, { theme: 'light', system });
    expect(textStyle(glyph()).color).toBe('rgb(1, 2, 3)');
    await on.unmount();
    await mount({ variant: 'filled', toggle: true, selected: false, disabled: true }, { theme: 'light', system });
    expect(textStyle(glyph()).color).toBe('rgb(4, 5, 6)');
  });
});

describe('press hold', () => {
  test('ICB-8: the pressed state appears in the same frame and stays visible for duration.pressHold although the press ended sooner', async () => {
    expect(HOLD).toBe(100);
    await mount({ variant: 'filled' });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('filled', 'pressed');
    await fireEvent(host(), 'pressOut');
    expectDrawnFrom('filled', 'pressed');
    await wait(HOLD / 2);
    expectDrawnFrom('filled', 'pressed');
    await wait(HOLD / 2 + 30);
    expectDrawnFrom('filled', 'enabled');
  });

  test('ICB-8: Enter / Space / assistive activation — a bare click — shows the pressed state for the hold', async () => {
    await mount({ variant: 'filled' });
    await click();
    expectDrawnFrom('filled', 'pressed');
    await wait(HOLD + 30);
    expectDrawnFrom('filled', 'enabled');
  });

  test('ICB-8: a toggle switched by the press is drawn pressed in its NEW look for the hold, then rests in it', async () => {
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <TanreiProvider theme="light">
          <IconButton testID={ID} accessibilityLabel={LABEL} variant="filled" toggle selected={on} onSelectedChange={setOn}>
            favorite
          </IconButton>
        </TanreiProvider>
      );
    }
    await render(<Controlled />);
    expectDrawnFrom('filled', 'enabled', 'unselected');
    await click();
    expectDrawnFrom('filled', 'pressed', 'selected');
    await wait(HOLD + 30);
    expectDrawnFrom('filled', 'enabled', 'selected');
  });
});

describe('choices of kind: system.behavior', () => {
  const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
  const LAYOUT = { nativeEvent: { layout: { x: 0, y: 0, width: 36, height: 36 } } };

  test('ICB-9 overlay (the default): the pressed tokens reach the whole container at once; no extra node exists', async () => {
    reduceMotion(false);
    await mount({ variant: 'tonal' });
    await fireEvent(host(), 'layout', LAYOUT);
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expectDrawnFrom('tonal', 'pressed');
    expect(part('ripple')).toBeNull();
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  describe('ICB-9 ripple (m3-like)', () => {
    const iconButton = m3Like.components.iconButton;
    const color = (paint: TanreiPaint) => painted(paint, 'light', m3Like);

    test('the pressed container color of the LOOK grows from the point of contact over comp.icon-button.motion.feedback-duration; the container keeps the state under the press; it fades over the state duration', async () => {
      reduceMotion(false);
      const timing = jest.spyOn(Animated, 'timing');
      const ref = createRef<IconButtonRef>();
      const side = iconButton.sizes.medium.containerSize;
      await mount({ ref, variant: 'filled', toggle: true, selected: true }, { theme: 'light', system: m3Like });
      (ref.current as unknown as { measure: unknown }).measure = (callback: (...box: number[]) => void) => callback(0, 0, side, side, 300, 500);
      await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: side, height: side } } });
      expect(part('ripple')).toBeNull();
      timing.mockClear();
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 310, pageY: 510 } });

      const filled = iconButton.variants.filled;
      expect(viewStyle(host()).backgroundColor).toBe(color(filled.enabled.selectedContainerColor));
      expect(viewStyle(host()).borderRadius).toBe(iconButton.pressedContainerShape);
      expect(viewStyle(part('ripple')!)).toMatchObject({ position: 'absolute', overflow: 'hidden', pointerEvents: 'none', borderRadius: iconButton.pressedContainerShape });
      const reach = Math.hypot(side - 10, side - 10);
      expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 10 - reach, top: 10 - reach, width: reach * 2, backgroundColor: color(filled.pressed.selectedContainerColor) });
      expect(color(filled.pressed.selectedContainerColor)).not.toBe(color(filled.enabled.selectedContainerColor));
      // Below the icon, hidden from assistive technology.
      expect(host().children.indexOf(part('ripple')!)).toBeLessThan(host().children.indexOf(part('icon')!));
      expect(part('ripple')!.props.accessible).toBe(false);
      expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: iconButton.motionFeedbackDuration, useNativeDriver: true });

      timing.mockClear();
      await release();
      expect(timing.mock.calls.some(([, config]) => config.toValue === 0 && config.duration === iconButton.motionStateDuration)).toBe(true);
      await wait(iconButton.motionStateDuration * 2 + 50);
      expect(part('ripple')).toBeNull();
    });

    test('keyboard activation ripples from the center; with reduce motion nothing grows and the pressed tokens apply at once', async () => {
      reduceMotion(false);
      const view = await mount({}, { theme: 'light', system: m3Like });
      await fireEvent(host(), 'layout', LAYOUT);
      await click();
      const reach = Math.hypot(18, 18);
      expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 18 - reach, top: 18 - reach, width: reach * 2 });
      await wait(HOLD + 30);
      await wait(iconButton.motionStateDuration * 2 + 50);
      await view.unmount();

      reduceMotion(true);
      await mount({}, { theme: 'light', system: m3Like });
      await fireEvent(host(), 'layout', LAYOUT);
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
      expect(part('ripple')).toBeNull();
      expect(viewStyle(host()).backgroundColor).toBe(fill(iconButton.variants.standard.pressed.containerColor, 'light', m3Like));
      await release();
    });
  });

  test('ICB-9 dim: the pressed opacity on the whole control and NO state layer — the container keeps the state under the press; the icon comes from the pressed tokens', async () => {
    const system = withBehavior({ pressedFeedback: 'dim' }, withVariant('filled', { pressed: { selectedIconColor: literal(10, 20, 30) } }, withIconButton({ pressedOpacity: 0.5, pressedContainerShape: 3 })));
    await mount({ variant: 'filled', toggle: true, selected: true }, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host())).toMatchObject({ opacity: 0.5, borderRadius: 3, backgroundColor: painted(tokens.variants.filled.hovered.selectedContainerColor) });
    expect(textStyle(glyph()).color).toBe('rgb(10, 20, 30)');
    expect(part('ripple')).toBeNull();
    await release();
    expect(viewStyle(host()).opacity).toBe(tokens.hoveredOpacity);
  });

  test('ICB-9 none: no answer to the press — every part stays with the state under the press; the click still happens', async () => {
    const onPress = jest.fn();
    const system = withBehavior(
      { pressedFeedback: 'none' },
      withVariant('outlined', { pressed: { containerColor: literal(1, 2, 3), iconColor: literal(10, 20, 30), outlineColor: literal(40, 50, 60) } }, withIconButton({ pressedOpacity: 0.5, pressedContainerShape: 2 })),
    );
    await mount({ variant: 'outlined', onPress }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('outlined', 'enabled', 'plain', system.components.iconButton);
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    await release();
  });

  test('ICB-10 corner smoothing: an amount above 0 (cupertino: 0.6) reaches the container, its outline and the focus ring as the OS curve; 0 adds nothing', async () => {
    expect(tanrei.shape.cornerSmoothing).toBe(0);
    const view = await mount({ variant: 'outlined' });
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('outline')!, part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBeUndefined();
    await view.unmount();

    expect(cupertino.shape.cornerSmoothing).toBe(0.6);
    await mount({ variant: 'outlined' }, { theme: 'light', system: cupertino });
    await fireEvent(host(), 'focus');
    for (const node of [host(), part('outline')!, part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBe('continuous');
  });

  test('ICB-10 corner smoothing on Android: circular whatever the amount', async () => {
    const os = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    try {
      await mount({ variant: 'outlined' }, { theme: 'light', system: cupertino });
      expect(viewStyle(host()).borderCurve).toBeUndefined();
    } finally {
      os.restore();
    }
  });

  test('ICB-10 focus-style: glow (acme) draws the focus colors as ONE halo around the focused shape', async () => {
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(host(), 'focus');
    const { offset, innerWidth, outerWidth } = acme.measure.focus;
    expect(viewStyle(part('focus-ring')!)).toMatchObject({
      borderRadius: acme.components.iconButton.focusedContainerShape + offset,
      boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: outerWidth, spreadDistance: innerWidth + outerWidth, color: painted({ kind: 'role', role: 'focusRing' }, 'light', acme) }],
    });
    expect(part('focus-ring')!.props.accessible).toBe(false);
  });
});

describe('toggle (ICB-11, ICB-12)', () => {
  test('ICB-11: activating a toggle calls onPress, then onSelectedChange with the opposite of selected; the button does not flip itself', async () => {
    const calls: string[] = [];
    const onPress = jest.fn(() => calls.push('press'));
    const onSelectedChange = jest.fn((next: boolean) => calls.push(`change:${next}`));
    const view = await mount({ toggle: true, selected: false, onPress, onSelectedChange });
    await fireEvent.press(host());
    expect(calls).toEqual(['press', 'change:true']);
    // Controlled, as Switch is: without a new `selected` it stays off.
    expect(host().props.accessibilityState).toEqual({ disabled: false, selected: false });
    await view.unmount();

    calls.length = 0;
    await mount({ toggle: true, selected: true, onPress, onSelectedChange });
    await click();
    expect(calls).toEqual(['press', 'change:false']);
  });

  test('ICB-11: a toggle exposes selected / not selected to assistive technology; a plain button never exposes a selected state', async () => {
    const on = await mount({ toggle: true, selected: true });
    expect(host().props.accessibilityState).toEqual({ disabled: false, selected: true });
    expect(screen.getByRole('button', { name: LABEL, selected: true })).toBe(host());
    await on.unmount();

    const off = await mount({ toggle: true, selected: false });
    expect(host().props.accessibilityState).toEqual({ disabled: false, selected: false });
    await off.unmount();

    // `selected` without `toggle` is ignored — and so is a selected state the caller put in accessibilityState.
    const onSelectedChange = jest.fn();
    await mount({ selected: true, accessibilityState: { selected: true, busy: true }, onSelectedChange });
    expect(host().props.accessibilityState).toEqual({ busy: true, disabled: false });
    await fireEvent.press(host());
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  test('ICB-11: a controlled toggle round-trips through the app state', async () => {
    function App() {
      const [on, setOn] = useState(false);
      return (
        <TanreiProvider theme="light">
          <IconButton testID={ID} accessibilityLabel={LABEL} toggle selected={on} onSelectedChange={setOn}>
            favorite
          </IconButton>
        </TanreiProvider>
      );
    }
    await render(<App />);
    expect(host().props.accessibilityState.selected).toBe(false);
    await fireEvent.press(host());
    expect(host().props.accessibilityState.selected).toBe(true);
    await wait(HOLD + 30);
    await fireEvent.press(host());
    expect(host().props.accessibilityState.selected).toBe(false);
  });

  describe.each(variants)('ICB-12: %s', (variant) => {
    test('a toggle draws its unselected parts when off and its selected parts when on; a plain button its own parts', async () => {
      for (const look of LOOKS) {
        const view = await mount({ variant, ...lookProps(look) });
        expectDrawnFrom(variant, 'enabled', look);
        await view.unmount();
      }
    });
  });

  test('ICB-12: selected without toggle draws the plain look', async () => {
    const system = withVariant('filled', { enabled: { containerColor: literal(1, 1, 1), selectedContainerColor: literal(2, 2, 2), unselectedContainerColor: literal(3, 3, 3) } });
    await mount({ variant: 'filled', selected: true }, { theme: 'light', system });
    expect(viewStyle(host()).backgroundColor).toBe('rgb(1, 1, 1)');
  });

  test('ICB-12: in the default system a toggle that is off is quieter than one that is on (filled: surface-container-highest → primary)', async () => {
    const filled = tokens.variants.filled.enabled;
    expect(painted(filled.unselectedContainerColor)).toBe(role('surfaceContainerHighest'));
    expect(painted(filled.selectedContainerColor)).toBe(role('primary'));
    expect(painted(filled.unselectedContainerColor)).not.toBe(painted(filled.selectedContainerColor));
  });

  test('ICB-12: in the default system a tonal toggle that is on is secondary / on-secondary, distinct from off', async () => {
    const tonal = tokens.variants.tonal.enabled;
    expect(painted(tonal.selectedContainerColor)).toBe(role('secondary'));
    expect(painted(tonal.selectedIconColor)).toBe(role('onSecondary'));
    expect(painted(tonal.unselectedContainerColor)).not.toBe(painted(tonal.selectedContainerColor));
  });

  test('ICB-12: switching the look moves with the state motion tokens', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ variant: 'filled', toggle: true, selected: false });
    timing.mockClear();
    await view.rerender(
      <TanreiProvider theme="light">
        <IconButton testID={ID} accessibilityLabel={LABEL} variant="filled" toggle selected>
          favorite
        </IconButton>
      </TanreiProvider>,
    );
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]![1]).toMatchObject({ duration: tokens.motionStateDuration });
    await wait(tokens.motionStateDuration * 2);
    expectDrawnFrom('filled', 'enabled', 'selected');
  });
});

describe('the icon (ICB-13)', () => {
  const warnings = (spy: jest.SpyInstance, needle: string) => spy.mock.calls.filter(([message]) => String(message).includes(needle));

  test.each(sizes)('ICB-13: %s draws the glyph at its icon size, in the unselected family of the icon style, at the system weight', async (size) => {
    await mount({ size });
    const iconSize = tokens.sizes[size].iconSize;
    expect(textStyle(glyph())).toMatchObject({ fontFamily: tanrei.icon.family.unselected.families[0], fontSize: iconSize, lineHeight: iconSize, fontWeight: toFontWeight(tanrei.icon.weight) });
    expect(viewStyle(part('icon')!)).toMatchObject({ width: iconSize, height: iconSize });
    expect(glyph().props.children).toBe('favorite');
    // sys.icon.small / medium / large.
    expect(iconSize).toBe(measure.icon[size]);
  });

  test('ICB-13: the selection decides family and FILL — selected only when toggle AND selected; opsz is the size clamped to the font\'s range', async () => {
    // What the icon received on the LAST render of each mount (a function icon is called on every render).
    const seen: IconButtonIconProps[] = [];
    let last: IconButtonIconProps | undefined;
    const icon = (props: IconButtonIconProps) => {
      last = props;
      return <View />;
    };
    const drawOnce = async (props: Partial<IconButtonProps>) => {
      const view = await mount({ ...props, children: icon });
      seen.push(last!);
      await view.unmount();
    };
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const props of [{}, { selected: true }, { toggle: true, selected: false }, { toggle: true, selected: true }] as Partial<IconButtonProps>[]) await drawOnce(props);
    expect(seen.map((each) => each.selected)).toEqual([false, false, false, true]);
    expect(seen.map((each) => each.glyph.axes.FILL)).toEqual([tanrei.icon.fillUnselected, tanrei.icon.fillUnselected, tanrei.icon.fillUnselected, tanrei.icon.fillSelected]);
    expect(seen.map((each) => each.glyph.family)).toEqual([tanrei.icon.family.unselected.families[0], tanrei.icon.family.unselected.families[0], tanrei.icon.family.unselected.families[0], tanrei.icon.family.selected.families[0]]);
    expect(seen[0]!.glyph.axes.wght).toBe(tanrei.icon.weight);

    // opsz: 16 (small) clamps up to the minimum 20; 24 (large) is inside the range.
    seen.length = 0;
    for (const size of sizes) await drawOnce({ size });
    const { opticalSizeMin, opticalSizeMax } = tanrei.icon;
    expect(seen.map((each) => each.glyph.axes.opsz)).toEqual(sizes.map((size) => Math.min(opticalSizeMax, Math.max(opticalSizeMin, tokens.sizes[size].iconSize))));
    expect(seen[0]!.glyph.axes.opsz).toBe(opticalSizeMin);
  });

  test('ICB-13: the default system (one variable family) cannot fill a selected glyph in a <Text>: development builds say so once, and nothing pretends', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const seen: IconButtonIconProps[] = [];
    await mount({ toggle: true, selected: true, children: (props: IconButtonIconProps) => (seen.push(props), <View />) });
    expect(seen[0]!.glyph.textDrawsFill).toBe(false);
    expect(warnings(warn, 'drawn UNFILLED')).toHaveLength(1);
  });

  test('ICB-13: a system whose icon set is a family per selection (acme: two static fonts) draws the selected family, without a report', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const off = await mount({ toggle: true, selected: false }, { theme: 'light', system: acme });
    expect(textStyle(glyph()).fontFamily).toBe(acme.icon.family.unselected.families[0]);
    await off.unmount();
    await mount({ toggle: true, selected: true }, { theme: 'light', system: acme });
    expect(textStyle(glyph()).fontFamily).toBe(acme.icon.family.selected.families[0]);
    expect(acme.icon.family.selected.families[0]).not.toBe(acme.icon.family.unselected.families[0]);
    expect(textStyle(glyph()).fontWeight).toBe(toFontWeight(acme.icon.weight));
    expect(warn).not.toHaveBeenCalled();
  });

  test('ICB-13: the provider\'s resolveIconFont maps family + axes to the font the app loaded, and is trusted', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const resolveIconFont = jest.fn<ReturnType<TanreiIconFontResolver>, Parameters<TanreiIconFontResolver>>((family, axes) => `${family}-${axes.FILL}`);
    await mount({ toggle: true, selected: true }, { theme: 'light', resolveIconFont });
    expect(textStyle(glyph()).fontFamily).toBe(`${tanrei.icon.family.selected.families[0]}-${tanrei.icon.fillSelected}`);
    expect(resolveIconFont).toHaveBeenCalledWith(tanrei.icon.family.selected.families[0], expect.objectContaining({ FILL: tanrei.icon.fillSelected, wght: tanrei.icon.weight }));
    expect(warnings(warn, 'UNFILLED')).toHaveLength(0);
  });

  test('ICB-13: the glyph takes the icon color of the state and look; a function icon receives it, the icon size and the selection', async () => {
    const icon = jest.fn((props: IconButtonIconProps) => <View style={{ width: props.size, height: props.size, backgroundColor: props.color }} />);
    await mount({ variant: 'outlined', toggle: true, selected: true, children: icon }, { theme: 'dark' });
    expect(icon).toHaveBeenCalledWith(expect.objectContaining({ color: painted(tokens.variants.outlined.enabled.selectedIconColor, 'dark'), size: medium.iconSize, selected: true }));
    expect(part('glyph')).toBeNull();
  });

  test('ICB-13: any other node is rendered as given, in the icon box', async () => {
    await mount({ children: <Text testID="custom">★</Text> });
    expect(screen.getByTestId('custom', { includeHiddenElements: true })).toBeTruthy();
    expect(part('glyph')).toBeNull();
    expect(viewStyle(part('icon')!)).toMatchObject({ width: medium.iconSize, height: medium.iconSize });
  });
});

describe('open size and variant keys', () => {
  const unknown = (size: string, variant: string) => ({ size: size as IconButtonSize, variant: variant as IconButtonVariant });
  const development = (enabled: boolean) => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
  };
  afterEach(() => development(true));

  test('ICB-7: an unknown size and an unknown variant render exactly like the default values, in every state and look', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const look of LOOKS) {
      const reference = await mount({ size: 'medium', variant: 'standard', ...lookProps(look) });
      const expected = JSON.stringify(reference.toJSON());
      await reference.unmount();
      const view = await mount({ ...unknown('jumbo', 'ghost'), ...lookProps(look) });
      expect(JSON.stringify(view.toJSON())).toBe(expected);
      for (const target of ['hovered', 'focused', 'pressed'] as const) {
        await enter(target);
        expectDrawnFrom('standard', target, look);
      }
      await view.unmount();
    }
  });

  test('ICB-7: each axis falls back on its own', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = await mount({ size: 'jumbo' as IconButtonSize, variant: 'outlined' });
    expect(viewStyle(host()).width).toBe(medium.containerSize);
    expectDrawnFrom('outlined', 'enabled');
    await first.unmount();
    await mount({ size: 'large', variant: 'ghost' as IconButtonVariant });
    expect(viewStyle(host()).width).toBe(tokens.sizes.large.containerSize);
    expectDrawnFrom('standard', 'enabled');
  });

  test('ICB-7: development builds report the unknown value once per key', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (let i = 0; i < 2; i += 1) {
      const view = await mount(unknown('colossal', 'phantom'));
      await view.unmount();
    }
    const reports = (needle: string) => warn.mock.calls.filter(([message]) => String(message).includes(needle));
    expect(reports('no IconButton size "colossal"; using "medium"')).toHaveLength(1);
    expect(reports('no IconButton variant "phantom"; using "standard"')).toHaveLength(1);
  });

  test('ICB-7: a release build renders the default silently', async () => {
    development(false);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount(unknown('titanic', 'spectre'));
    expectDrawnFrom('standard', 'enabled');
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

describe('accessible name (ICB-14)', () => {
  const development = (enabled: boolean) => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
  };
  afterEach(() => development(true));
  const unnamedReports = (spy: jest.SpyInstance) => spy.mock.calls.filter(([message]) => String(message).includes('has no accessibilityLabel'));

  test('ICB-14: without a label the icon button still renders and works, and development builds report it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onPress = jest.fn();
    await mount({ accessibilityLabel: undefined, onPress });
    expect(host().props.accessibilityRole).toBe('button');
    expect(glyph().props.children).toBe('favorite');
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(unnamedReports(warn)).toHaveLength(1);
    expect(String(unnamedReports(warn)[0]![0])).toContain(`testID "${ID}"`);
  });

  test('ICB-14: an empty or blank label is no name either; aria-label is one', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const blank = await mount({ accessibilityLabel: '  ' });
    expect(unnamedReports(warn)).toHaveLength(1);
    await blank.unmount();
    warn.mockClear();
    await mount({ accessibilityLabel: undefined, 'aria-label': LABEL });
    expect(unnamedReports(warn)).toHaveLength(0);
    expect(screen.getByRole('button', { name: LABEL })).toBe(host());
  });

  test('ICB-14: a release build says nothing', async () => {
    development(false);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ accessibilityLabel: '' });
    expect(host()).toBeTruthy();
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
    test.each(variants)('%s resolves container, icon and outline of every look from its paints in this scheme', async (variant) => {
      for (const look of LOOKS) {
        const view = await mount({ variant, ...lookProps(look) }, provider);
        expectDrawnFrom(variant, 'enabled', look, tokens, scheme);
        await fireEvent(host(), 'hoverIn');
        expectDrawnFrom(variant, 'hovered', look, tokens, scheme);
        await view.unmount();
      }
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
  });

  test.each(sizes)('%s is a square of containerSize with the container shape; the outline has the size\'s width', async (size) => {
    await mount({ size, variant: 'outlined' });
    const { containerSize, outlineWidth } = tokens.sizes[size];
    expect(viewStyle(host())).toMatchObject({ width: containerSize, height: containerSize, borderRadius: tokens.containerShape });
    expect(viewStyle(host()).minHeight).toBeUndefined();
    expect(viewStyle(part('outline')!).borderWidth).toBe(outlineWidth);
  });

  test('the default sizes are 32 / 36 / 40 with icons 16 / 20 / 24, matching Button\'s heights', () => {
    expect(sizes.map((size) => tokens.sizes[size].containerSize)).toEqual([32, 36, 40]);
    expect(sizes.map((size) => tokens.sizes[size].iconSize)).toEqual([16, 20, 24]);
    expect(sizes.map((size) => tokens.sizes[size].containerSize)).toEqual(sizes.map((size) => tanrei.components.button.sizes[size].containerHeight));
  });

  test('stateShape reads each state\'s axis-free tokens (the shared primitive)', () => {
    for (const name of ['enabled', 'hovered', 'focused', 'pressed', 'disabled'] as const) expect(stateShape(tokens, name)).toEqual(shapeOf(tokens, name));
  });
});

describe('the system drives rendering', () => {
  test('a size re-valued by a layer reaches the square, the icon box, the glyph and the target', async () => {
    const system = withSize('medium', { containerSize: 44, iconSize: 28, outlineWidth: 3 });
    await mount({ variant: 'outlined' }, { theme: 'light', system });
    expect(viewStyle(host())).toMatchObject({ width: 44, height: 44 });
    expect(viewStyle(part('icon')!)).toMatchObject({ width: 28, height: 28 });
    expect(textStyle(glyph())).toMatchObject({ fontSize: 28, lineHeight: 28 });
    expect(viewStyle(part('outline')!).borderWidth).toBe(3);
    expect(host().props.hitSlop).toEqual({ top: 2, bottom: 2, left: 2, right: 2 });
  });

  test('pressed shape 2 and pressed opacity 0.4 reach the container, the outline and the focus ring', async () => {
    const system = withIconButton({ pressedContainerShape: 2, pressedOpacity: 0.4 });
    await mount({ variant: 'outlined' }, { theme: 'light', system });
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host())).toMatchObject({ borderRadius: 2, opacity: 0.4 });
    expect(viewStyle(part('outline')!).borderRadius).toBe(2);
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(part('focus-ring')!).borderRadius).toBe(2 + reach);
    await release();
  });

  test('a selected look re-valued by a layer is drawn as that paint; the plain look is untouched', async () => {
    const system = withVariant('standard', { enabled: { selectedIconColor: { kind: 'role', role: 'primary' }, selectedContainerColor: { kind: 'role', role: 'primaryContainer' } } });
    const on = await mount({ toggle: true, selected: true }, { theme: 'dark', system });
    expect(textStyle(glyph()).color).toBe(role('primary', 'dark'));
    expect(viewStyle(host()).backgroundColor).toBe(role('primaryContainer', 'dark'));
    await on.unmount();
    await mount({}, { theme: 'dark', system });
    expect(textStyle(glyph()).color).toBe(painted(standard.enabled.iconColor, 'dark'));
  });
});

describe('accessibility', () => {
  test('role button; accessibilityLabel is the accessible name; the glyph is decorative and never part of it', async () => {
    await mount();
    expect(host().props.accessibilityRole).toBe('button');
    expect(screen.getByRole('button', { name: LABEL })).toBe(host());
    const box = part('icon')!;
    expect(box.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' });
    expect(screen.queryByText('favorite')).toBeNull();
  });

  test('text size does not change the icon\'s box: the glyph does not scale with the font, the square is fixed', async () => {
    await mount();
    expect(glyph().props.allowFontScaling).toBe(false);
    expect(viewStyle(host())).toMatchObject({ width: medium.containerSize, height: medium.containerSize });
    expect(viewStyle(host()).overflow).toBeUndefined();
  });

  test('decorative layers are hidden from assistive technology and from touches', async () => {
    await mount({ variant: 'outlined' });
    await fireEvent(host(), 'focus');
    for (const name of ['outline', 'focus-ring']) {
      expect(part(name)!.props.accessible).toBe(false);
      expect(part(name)!.props.importantForAccessibility).toBe('no');
      expect(viewStyle(part(name)!).pointerEvents).toBe('none');
    }
  });

  test('forwards its ref to the underlying host view and passes caller handlers and layout style through', async () => {
    const ref = createRef<IconButtonRef>();
    const onPressIn = jest.fn();
    const onFocus = jest.fn();
    const onLayout = jest.fn();
    await mount({ ref, onPressIn, onFocus, onLayout, style: { marginTop: 4 } });
    expect(ref.current).not.toBeNull();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 36, height: 36 } } });
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(viewStyle(host()).marginTop).toBe(4);
    await release();
  });
});

describe('fixtures', () => {
  // The default system cannot fill a selected glyph in a <Text> (ICB-13): the selected fixtures report it once.
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  describeFixtureBaselines(iconButtonSubject);

  test('every fixture of the spec names the button (label), so none of them reports ICB-14', () => {
    for (const fixture of spec.fixtures) expect(fixture.props.label).toBeTruthy();
  });
});
