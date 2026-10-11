// Chip — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/chip.spec.json; every behaviour id is cited by the test that covers it.
import { createRef, useState, type ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, Text, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiChipSizeTokens, TanreiChipTokens, TanreiChipVariantStateTokens, TanreiColorRole, TanreiCoreChipSize, TanreiCoreChipVariant, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { byTestID, describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resolveElevation } from '../../theme/elevation';
import { resetIconReport } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { toFontWeight } from '../../theme/typography';
import { Chip, type ChipIconProps, type ChipKind, type ChipProps, type ChipRef, type ChipSize, type ChipVariant } from '../Chip';
import { acme } from './__fixtures__/acme';
import { FIXTURE_AVATAR } from './__fixtures__/avatar';
import { chipSubject } from './Chip.subject';

const spec = loadSpec('chip');
const { elevation, measure, state: sysState } = tanrei;
const colors: TanreiSystem['colors'] = tanrei.colors;
const tokens: TanreiChipTokens = tanrei.components.chip;
const medium = tokens.sizes.medium;
const ID = 'chip';
const LABEL = 'Vegetarian';
const REMOVE = 'Remove Vegetarian';

const { host, part } = byTestID(ID);
const container = () => part('container')!;
const label = () => part('label')!;
const glyph = () => part('glyph')!;
const removeHost = () => part('remove')!;
const removeCircle = () => part('remove.container')!;

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
/** `undefined` when the paint draws nothing: the chip then sets no fill / renders no outline. */
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));

const withChip = (overrides: Partial<TanreiChipTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'chip', overrides);
const withVariant = (variant: TanreiCoreChipVariant, overrides: { [State in InteractionState]?: Partial<TanreiChipVariantStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.chip.variants[variant];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withChip({ variants: { ...base.components.chip.variants, [variant]: { ...current, ...changed } } }, base);
};
const withSize = (size: TanreiCoreChipSize, overrides: Partial<TanreiChipSizeTokens>, base: TanreiSystem = tanrei): TanreiSystem =>
  withChip({ sizes: { ...base.components.chip.sizes, [size]: { ...base.components.chip.sizes[size], ...overrides } } }, base);
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });

const element = (props: Partial<ChipProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }): ReactElement => (
  <TanreiProvider {...provider}>
    <Chip testID={ID} label={LABEL} icon="event" {...props} />
  </TanreiProvider>
);
const mount = (props: Partial<ChipProps> = {}, provider?: Omit<TanreiProviderProps, 'children'>) => render(element(props, provider));
/** An input chip, its remove action named. */
const mountInput = (props: Partial<ChipProps> = {}, provider?: Omit<TanreiProviderProps, 'children'>) => mount({ kind: 'input', icon: undefined, removeAccessibilityLabel: REMOVE, ...props }, provider);

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

const variants: TanreiCoreChipVariant[] = ['outlined', 'elevated'];
const sizes: TanreiCoreChipSize[] = ['small', 'medium'];
const kinds: ChipKind[] = ['action', 'filter', 'input'];
const ACTIVE = ['hovered', 'focused', 'pressed'] as const;

/** CHP-12: which parts are drawn — the variant's own, or its `selected.` parts (a filter chip that is on). */
type Look = 'plain' | 'selected';
const LOOKS: readonly Look[] = ['plain', 'selected'];
const lookProps = (look: Look): Partial<ChipProps> => ({ kind: 'filter', selected: look === 'selected' });
/** Written out member by member, independently of the component. */
const partsOf = (t: TanreiChipVariantStateTokens, look: Look) =>
  look === 'plain'
    ? { container: t.containerColor, elevation: t.containerElevation, outline: t.outlineColor, label: t.labelColor, icon: t.iconColor }
    : { container: t.selectedContainerColor, elevation: t.selectedContainerElevation, outline: t.selectedOutlineColor, label: t.selectedLabelColor, icon: t.selectedIconColor };
const opacityOf = (from: TanreiChipTokens, in_: InteractionState) =>
  ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity })[in_];

/** Enter / Space / D-pad centre and assistive activation: a bare click (no press events, no touch data). */
const click = (target = host()) => fireEvent(target, 'press', { nativeEvent: { target: 1 } });
const key = (name: string) => fireEvent(host(), 'keyDown', { nativeEvent: { key: name } });

/** CHP-8: a press stays visible for `duration.pressHold`, so a release is over only after that. */
const HOLD = tanrei.motion.duration.pressHold;
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
async function release(target = host()) {
  await fireEvent(target, 'pressOut');
  await wait(HOLD + 30);
}

async function enter(stateName: InteractionState, target = host()) {
  if (stateName === 'hovered') await fireEvent(target, 'hoverIn');
  if (stateName === 'focused') await fireEvent(target, 'focus');
  if (stateName === 'pressed') await fireEvent(target, 'pressIn');
}

/** Everything CHP-3 / CHP-6 / CHP-12 name — container, outline, label, icon, elevation, opacity — from one state's tokens of one look. */
function expectDrawnFrom(variant: TanreiCoreChipVariant, in_: InteractionState, look: Look = 'plain', from: TanreiChipTokens = tokens, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) {
  const parts = partsOf(from.variants[variant][in_], look);
  const box = viewStyle(container());
  expect(box.backgroundColor).toBe(fill(parts.container, scheme, system));
  expect(box.opacity).toBe(opacityOf(from, in_));
  expect(box.borderRadius).toBe(from.containerShape);
  expect(textStyle(label()).color).toBe(painted(parts.label, scheme, system));
  const lead = part('glyph') ?? part('check.glyph');
  if (lead) expect(textStyle(lead).color).toBe(painted(parts.icon, scheme, system));
  const outline = fill(parts.outline, scheme, system);
  if (outline === undefined) expect(part('outline')).toBeNull();
  else expect(viewStyle(part('outline')!)).toMatchObject({ borderColor: outline, borderWidth: from.outlineWidth, borderRadius: from.containerShape });
  const resolved = resolveElevation(system.elevation[parts.elevation], (name) => role(name, scheme, system));
  expect(box.boxShadow).toEqual(resolved.boxShadow.length ? resolved.boxShadow : undefined);
  if (resolved.ring) expect(viewStyle(part('elevation-ring')!)).toMatchObject({ borderColor: resolved.ring.color, borderWidth: resolved.ring.width });
  else expect(part('elevation-ring')).toBeNull();
}

/** The remove action's container and glyph from one state's remove tokens. */
function expectRemoveFrom(variant: TanreiCoreChipVariant, in_: InteractionState, from: TanreiChipTokens = tokens, system: TanreiSystem = tanrei) {
  const t = from.variants[variant][in_];
  expect(viewStyle(removeCircle()).backgroundColor).toBe(fill(t.removeContainerColor, 'light', system));
  expect(textStyle(part('remove.glyph')!).color).toBe(painted(t.removeIconColor, 'light', system));
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

/**
 * Where a node is on the page, by its testID: `measure()` of the (mocked) host views answers `[x, y, width, height,
 * pageX, pageY]` for the ids given. The ripple is measured in the chip's container and in the remove action's round
 * container, neither of which the caller holds a ref to.
 */
const placeAt = (boxes: Record<string, number[]>) =>
  jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation(function (this: { props: { testID?: string } }, callback: (...box: number[]) => void) {
    const box = boxes[this.props.testID ?? ''];
    if (box) callback(...box);
  });

/** Reports other than the one-time "selected icons are drawn UNFILLED" of the default system (README, "Icons"). */
const reports = (spy: jest.SpyInstance, needle: string) => spy.mock.calls.filter(([message]) => String(message).includes(needle));

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Chip.name);
    expect(platform.props).toEqual({ kind: 'kind', variant: 'variant', size: 'size', selected: 'selected', disabled: 'disabled', label: 'label', removeLabel: 'removeAccessibilityLabel' });
    expect(platform.events).toEqual({ click: 'onPress', change: 'onSelectedChange', remove: 'onRemove' });
  });

  test('the enum values under test are exactly the spec values; variant and size are the token axes', () => {
    const values = (name: string) => spec.props.find((p) => p.name === name)?.values;
    expect(values('kind')).toEqual(kinds);
    expect(values('variant')).toEqual(variants);
    expect(values('size')).toEqual(sizes);
    expect(Object.keys(tokens.variants)).toEqual(variants);
    expect(Object.keys(tokens.sizes)).toEqual(sizes);
  });

  test('defaults follow the spec: an action chip, outlined, medium, not selected, enabled', async () => {
    await mount();
    expectDrawnFrom('outlined', 'enabled');
    expect(viewStyle(container()).minHeight).toBe(medium.containerHeight);
    expect(host().props.accessibilityState).toEqual({ disabled: false });
    expect(part('remove')).toBeNull();
  });
});

describe('behavior', () => {
  test.each(kinds)('CHP-1: activating a %s chip calls onPress exactly once — touch and a bare (keyboard / assistive) click alike', async (kind) => {
    const onPress = jest.fn();
    await mount({ kind, onPress, removeAccessibilityLabel: REMOVE });
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    await wait(HOLD + 30);
    await click();
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(host().props.accessible).toBe(true);
    expect(host().props.focusable).toBe(true);
  });

  test('CHP-2: a disabled chip emits no click, change or remove, is not focusable (nor its remove action) and exposes disabled', async () => {
    const onPress = jest.fn();
    const onSelectedChange = jest.fn();
    const onRemove = jest.fn();
    const filter = await mount({ kind: 'filter', disabled: true, onPress, onSelectedChange });
    await fireEvent.press(host());
    await click();
    expect(host().props.focusable).toBe(false);
    expect(host().props.accessibilityState).toEqual({ disabled: true, selected: false });
    expect(screen.getByRole('button', { name: LABEL, disabled: true })).toBe(host());
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).toBeNull();
    await filter.unmount();

    await mountInput({ disabled: true, onPress, onRemove });
    await fireEvent.press(removeHost());
    await click(removeHost());
    await key('Backspace');
    expect(removeHost().props.focusable).toBe(false);
    expect(removeHost()).toBeDisabled();
    expect(screen.getByRole('button', { name: REMOVE, disabled: true })).toBe(removeHost());
    expect(onPress).not.toHaveBeenCalled();
    expect(onSelectedChange).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  describe.each(variants)('CHP-3: %s', (variant) => {
    test.each(LOOKS.flatMap((look) => ACTIVE.map((target) => ({ look, target }))))('$look, $target: container, outline, label, icon, elevation and opacity come from its tokens, and it returns to rest', async ({ look, target }) => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount({ variant, ...lookProps(look) });
      await enter(target);
      expectDrawnFrom(variant, target, look);
      if (target === 'hovered') await fireEvent(host(), 'hoverOut');
      if (target === 'focused') await fireEvent(host(), 'blur');
      if (target === 'pressed') await release();
      expectDrawnFrom(variant, 'enabled', look);
    });
  });

  test('CHP-3: precedence is pressed over focused over hovered, under the acme fixture system (which values each differently)', async () => {
    const elevated = acme.components.chip.variants.elevated;
    const expected = (name: InteractionState) => painted(elevated[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    await mount({ variant: 'elevated' }, { theme: 'light', system: acme });
    const background = () => viewStyle(container()).backgroundColor;
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

  test('CHP-3: in the default system a state mixes the look\'s state-layer color (its label color) into the container; the elevated chip rises to level3 on hover', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const look of LOOKS) {
      const resting = tokens.variants.elevated.enabled;
      const base = partsOf(resting, look).container;
      const layer = look === 'plain' ? resting.stateLayerColor : resting.selectedStateLayerColor;
      expect(layer).toEqual(partsOf(resting, look).label);
      const mix = (amount: number): TanreiPaint => ({ kind: 'mix', base, with: layer, amount });
      const view = await mount({ variant: 'elevated', ...lookProps(look) });
      await fireEvent(host(), 'hoverIn');
      expect(viewStyle(container()).backgroundColor).toBe(painted(mix(sysState.hoverStateLayerOpacity)));
      expect(viewStyle(container()).boxShadow).toEqual(resolveElevation(elevation.level3, (name) => role(name)).boxShadow);
      await fireEvent(host(), 'focus');
      expect(viewStyle(container()).backgroundColor).toBe(painted(mix(sysState.focusStateLayerOpacity)));
      await fireEvent(host(), 'pressIn');
      expect(viewStyle(container()).backgroundColor).toBe(painted(mix(sysState.pressedStateLayerOpacity)));
      await view.unmount();
    }
  });

  test('CHP-3: focus gained by touch or pointer does not select the focused state', async () => {
    const system = withVariant('outlined', { focused: { containerColor: literal(2, 0, 0) } });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await release();
    expectDrawnFrom('outlined', 'enabled', 'plain', system.components.chip, 'light', system);
  });

  test('CHP-4: keyboard focus shows the focus ring around the chip\'s container, without animation; pointer focus does not', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).toBeNull();
    await release();
    await fireEvent(host(), 'blur');
    timing.mockClear();
    await fireEvent(host(), 'focus');
    const ring = part('focus-ring')!;
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(ring)).toMatchObject({ position: 'absolute', top: -reach, left: -reach, borderColor: role('focusRing'), borderRadius: tokens.containerShape + reach });
    // Around the chip's container: a child of it, not of the chip's pressable.
    expect(container().children).toContain(ring);
    expect(timing).not.toHaveBeenCalled();
    await fireEvent(host(), 'blur');
    expect(part('focus-ring')).toBeNull();
  });

  test.each([
    { size: 'small' as const, vertical: 12 },
    { size: 'medium' as const, vertical: 8 },
  ])('CHP-5: the $size chip meets sys.target.touch on both axes, before and after layout, without changing its size', async ({ size, vertical }) => {
    await mount({ size });
    const height = tokens.sizes[size].containerHeight;
    expect(host().props.hitSlop).toEqual({ top: vertical, bottom: vertical, left: vertical, right: vertical });
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height } } });
    expect(host().props.hitSlop).toEqual({ top: vertical, bottom: vertical, left: 0, right: 0 });
    expect(height + 2 * vertical).toBeGreaterThanOrEqual(measure.target.touch);
    expect(viewStyle(container()).minHeight).toBe(height);
  });

  describe.each(variants)('CHP-6: disabled %s', (variant) => {
    test.each(LOOKS)('%s renders container, outline, label, icon, elevation and opacity from its disabled tokens', async (look) => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount({ variant, disabled: true, ...lookProps(look) });
      expectDrawnFrom(variant, 'disabled', look);
    });

    test('an input chip draws its remove action from the disabled tokens and its avatar at the disabled content opacity', async () => {
      await mountInput({ variant, disabled: true, avatar: FIXTURE_AVATAR });
      expectRemoveFrom(variant, 'disabled');
      expect(viewStyle(part('avatar.image')!).opacity).toBe(sysState.disabledContentOpacity);
    });
  });

  test('CHP-6: in the default system the outlined chip keeps no fill and fades its border; a selected chip grows no border; the remove container stays invisible', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onSurface = colors.light.onSurface;
    const outlined = await mount({ disabled: true });
    expect(viewStyle(container()).backgroundColor).toBeUndefined();
    expect(viewStyle(part('outline')!).borderColor).toBe(formatColor({ ...onSurface, a: sysState.disabledContainerOpacity }));
    expect(textStyle(label()).color).toBe(formatColor({ ...onSurface, a: sysState.disabledContentOpacity }));
    await outlined.unmount();
    const selected = await mount({ kind: 'filter', selected: true, disabled: true });
    expect(viewStyle(container()).backgroundColor).toBe(formatColor({ ...onSurface, a: sysState.disabledContainerOpacity }));
    expect(part('outline')).toBeNull();
    await selected.unmount();
    await mountInput({ disabled: true });
    expect(viewStyle(removeCircle()).backgroundColor).toBeUndefined();
  });
});

describe('press hold', () => {
  test('CHP-8: the pressed state appears in the same frame and stays visible for duration.pressHold although the press ended sooner', async () => {
    await mount({ variant: 'elevated' });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('elevated', 'pressed');
    await fireEvent(host(), 'pressOut');
    expectDrawnFrom('elevated', 'pressed');
    await wait(HOLD / 2);
    expectDrawnFrom('elevated', 'pressed');
    await wait(HOLD / 2 + 30);
    expectDrawnFrom('elevated', 'enabled');
  });

  test('CHP-8: Enter / Space / assistive activation — a bare click — shows the pressed state for the hold', async () => {
    await mount({ variant: 'elevated' });
    await click();
    expectDrawnFrom('elevated', 'pressed');
    await wait(HOLD + 30);
    expectDrawnFrom('elevated', 'enabled');
  });

  test('CHP-8: a filter chip switched by the press is drawn pressed in its NEW look for the hold, then rests in it', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <TanreiProvider theme="light">
          <Chip testID={ID} label={LABEL} kind="filter" variant="elevated" selected={on} onSelectedChange={setOn} />
        </TanreiProvider>
      );
    }
    await render(<Controlled />);
    expectDrawnFrom('elevated', 'enabled', 'plain');
    await click();
    expectDrawnFrom('elevated', 'pressed', 'selected');
    await wait(HOLD + 30);
    expectDrawnFrom('elevated', 'enabled', 'selected');
  });
});

describe('choices of kind: system.behavior', () => {
  test('CHP-9 overlay (the default): the pressed tokens reach the whole container at once; no extra node exists', async () => {
    reduceMotion(false);
    await mount({ variant: 'elevated' });
    await fireEvent(container(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 32 } } });
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expectDrawnFrom('elevated', 'pressed');
    expect(part('ripple')).toBeNull();
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  test('CHP-9 ripple (m3-like): the pressed container color of the look grows in the whole container from the point of contact over comp.chip.motion.feedback-duration; the container keeps the state under the press; it fades over the state duration', async () => {
    reduceMotion(false);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const chip = m3Like.components.chip;
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ kind: 'filter', selected: true }, { theme: 'light', system: m3Like });
    // The ripple is measured in the container (the chip's pressable holds only its start and label).
    placeAt({ [`${ID}.container`]: [0, 0, 120, 32, 300, 500] });
    await fireEvent(container(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 32 } } });
    timing.mockClear();
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 310, pageY: 510 } });
    const outlined = chip.variants.outlined;
    expect(viewStyle(container()).backgroundColor).toBe(painted(outlined.enabled.selectedContainerColor, 'light', m3Like));
    const reach = Math.hypot(110, 22);
    expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 10 - reach, top: 10 - reach, width: reach * 2, backgroundColor: painted(outlined.pressed.selectedContainerColor, 'light', m3Like) });
    expect(container().children.indexOf(part('ripple')!)).toBeLessThan(container().children.indexOf(host()));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: chip.motionFeedbackDuration, useNativeDriver: true });
    timing.mockClear();
    await release();
    expect(timing.mock.calls.some(([, config]) => config.toValue === 0 && config.duration === chip.motionStateDuration)).toBe(true);
    await wait(chip.motionStateDuration * 2 + 50);
    expect(part('ripple')).toBeNull();
  });

  test('CHP-9 ripple: a bare click ripples from the center of the laid-out container', async () => {
    reduceMotion(false);
    await mount({}, { theme: 'light', system: m3Like });
    await fireEvent(container(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 32 } } });
    await click();
    const reach = Math.hypot(60, 16);
    expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 60 - reach, top: 16 - reach });
    await wait(HOLD + 30);
    await wait(m3Like.components.chip.motionStateDuration * 2 + 50);
  });

  test('CHP-9 dim: the pressed opacity on the whole control and NO state layer — the container keeps the state under the press; outline, label, icon and elevation come from the pressed tokens', async () => {
    const system = withBehavior({ pressedFeedback: 'dim' }, withVariant('elevated', { pressed: { labelColor: literal(10, 20, 30), iconColor: literal(40, 50, 60), containerElevation: 'level1' } }, withChip({ pressedOpacity: 0.5 })));
    await mount({ variant: 'elevated' }, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(container())).toMatchObject({ opacity: 0.5, backgroundColor: painted(tokens.variants.elevated.hovered.containerColor) });
    expect(textStyle(label()).color).toBe('rgb(10, 20, 30)');
    expect(textStyle(glyph()).color).toBe('rgb(40, 50, 60)');
    expect(part('ripple')).toBeNull();
    await release();
  });

  test('CHP-9 none: no answer to the press — every part stays with the state under the press; the click still happens', async () => {
    const onPress = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withVariant('outlined', { pressed: { containerColor: literal(1, 2, 3), labelColor: literal(10, 20, 30), outlineColor: literal(4, 5, 6) } }, withChip({ pressedOpacity: 0.5 })));
    await mount({ onPress }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('outlined', 'enabled', 'plain', system.components.chip, 'light', system);
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    await release();
  });

  test('CHP-10 corner smoothing: cupertino (0.6) reaches the container, its outline and both focus rings as the OS curve; 0 adds nothing; glow (acme) is one halo', async () => {
    const plain = await mountInput();
    await fireEvent(host(), 'focus');
    for (const node of [container(), part('outline')!, part('focus-ring')!]) expect(viewStyle(node).borderCurve).toBeUndefined();
    await plain.unmount();
    const smooth = await mountInput({}, { theme: 'light', system: cupertino });
    await fireEvent(host(), 'focus');
    for (const node of [container(), part('outline')!, part('focus-ring')!, removeCircle()]) expect(viewStyle(node).borderCurve).toBe('continuous');
    await smooth.unmount();
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(host(), 'focus');
    expect(viewStyle(part('focus-ring')!).boxShadow).toHaveLength(1);
  });

  test('CHP-10 corner smoothing on Android: circular whatever the amount', async () => {
    const os = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    try {
      await mount({}, { theme: 'light', system: cupertino });
      expect(viewStyle(container()).borderCurve).toBeUndefined();
    } finally {
      os.restore();
    }
  });
});

describe('filter chips (CHP-11, CHP-12, CHP-13)', () => {
  beforeEach(() => {
    // A selected filter chip draws its check in the selected glyph style, which the default system cannot fill in a
    // <Text> (README, "Icons"): that one-time report is covered by IconButton.test.tsx.
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  test('CHP-11: activating a filter chip emits click, then change — onPress, then onSelectedChange with the opposite of selected, in that order (as a native checkbox); it does not flip itself', async () => {
    const calls: string[] = [];
    const onPress = jest.fn(() => calls.push('press'));
    const onSelectedChange = jest.fn((next: boolean) => calls.push(`change:${next}`));
    const off = await mount({ kind: 'filter', selected: false, onPress, onSelectedChange });
    await fireEvent.press(host());
    expect(calls).toEqual(['press', 'change:true']);
    expect(host().props.accessibilityState).toEqual({ disabled: false, selected: false });
    await off.unmount();
    calls.length = 0;
    await mount({ kind: 'filter', selected: true, onPress, onSelectedChange });
    await click();
    expect(calls).toEqual(['press', 'change:false']);
  });

  test('CHP-11: a filter chip exposes selected (the pressed state) to assistive technology; other kinds ignore selected and never expose one', async () => {
    const on = await mount({ kind: 'filter', selected: true });
    expect(screen.getByRole('button', { name: LABEL, selected: true })).toBe(host());
    await on.unmount();
    for (const kind of ['action', 'input'] as const) {
      const onSelectedChange = jest.fn();
      const view = await mount({ kind, selected: true, accessibilityState: { selected: true, busy: true }, onSelectedChange, removeAccessibilityLabel: REMOVE });
      expect(host().props.accessibilityState).toEqual({ busy: true, disabled: false });
      await fireEvent.press(host());
      expect(onSelectedChange).not.toHaveBeenCalled();
      expectDrawnFrom('outlined', 'enabled', 'plain');
      expect(part('check')).toBeNull();
      await view.unmount();
    }
  });

  describe.each(variants)('CHP-12: %s', (variant) => {
    test('a filter chip that is on draws its selected parts, one that is off the variant\'s own parts', async () => {
      for (const look of LOOKS) {
        const view = await mount({ variant, ...lookProps(look) });
        expectDrawnFrom(variant, 'enabled', look);
        await view.unmount();
      }
    });
  });

  test('CHP-12: in the default system off and on differ — outlined: transparent in an outline → secondary-container with no border', () => {
    const outlined = tokens.variants.outlined.enabled;
    expect(evaluatePaint(outlined.containerColor, colors.light).a).toBe(0);
    expect(painted(outlined.outlineColor)).toBe(role('outline'));
    expect(painted(outlined.selectedContainerColor)).toBe(role('secondaryContainer'));
    expect(evaluatePaint(outlined.selectedOutlineColor, colors.light).a).toBe(0);
    expect(painted(tokens.variants.elevated.enabled.selectedContainerColor)).not.toBe(painted(tokens.variants.elevated.enabled.containerColor));
  });

  test('CHP-13: on, a filter chip shows the check in the leading position — in place of its icon — and the glyph start padding', async () => {
    const withIcon = await mount({ kind: 'filter', selected: true });
    expect(part('icon')).toBeNull();
    expect(part('check.glyph')!.props.children).toBe('check');
    await withIcon.unmount();
    const bare = await mount({ kind: 'filter', selected: true, icon: undefined });
    expect(viewStyle(host()).paddingStart).toBe(medium.containerPaddingInlineWithIcon);
    expect(viewStyle(part('check')!)).toMatchObject({ width: medium.iconSize, height: medium.iconSize });
    await bare.unmount();
    await mount({ kind: 'filter', selected: false, icon: undefined });
    expect(part('check')).toBeNull();
    expect(viewStyle(host()).paddingStart).toBe(medium.containerPaddingInline);
  });

  test('CHP-13: a change of selection moves the colors over the selection motion and grows the check and the width with it; settled, plain values', async () => {
    reduceMotion(false);
    const system = withChip({ motionSelectionDuration: 600 });
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const view = await mount({ kind: 'filter', selected: false, icon: undefined }, { theme: 'light', system });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionSelectionEasing);
    timing.mockClear();
    await view.rerender(element({ kind: 'filter', selected: true, icon: undefined }, { theme: 'light', system }));
    expect(timing.mock.calls.filter(([, config]) => config.duration === 600).length).toBeGreaterThanOrEqual(2);
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionStateDuration)).toBe(false);
    // While it moves the check box widens from nothing and the start padding moves between the two.
    const start = Number(viewStyle(host()).paddingStart);
    expect(start).toBeGreaterThanOrEqual(medium.containerPaddingInlineWithIcon - 1);
    expect(start).toBeLessThanOrEqual(medium.containerPaddingInline + 1);
    expect(part('check')).not.toBeNull();
    await wait(900);
    expectDrawnFrom('outlined', 'enabled', 'selected', system.components.chip, 'light', system);
    expect(viewStyle(host()).paddingStart).toBe(medium.containerPaddingInlineWithIcon);

    // …and back: the check shrinks away, and at rest there is no check node.
    await view.rerender(element({ kind: 'filter', selected: false, icon: undefined }, { theme: 'light', system }));
    expect(part('check')).not.toBeNull();
    await wait(900);
    expect(part('check')).toBeNull();
    expectDrawnFrom('outlined', 'enabled', 'plain', system.components.chip, 'light', system);
  });

  test('CHP-13: where motion is reduced the new condition shows at once', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ kind: 'filter', selected: false });
    await wait(10);
    timing.mockClear();
    await view.rerender(element({ kind: 'filter', selected: true }));
    expect(timing).not.toHaveBeenCalled();
    expectDrawnFrom('outlined', 'enabled', 'selected');
    expect(part('check')).not.toBeNull();
  });
});

describe('glyphs, avatar and geometry (CHP-14, CHP-15, CHP-16, CHP-17)', () => {
  test.each(sizes)('CHP-14: %s draws its icon at its icon size in the unselected family, at the system weight, in the look\'s icon color', async (size) => {
    await mount({ size }, { theme: 'dark' });
    const iconSize = tokens.sizes[size].iconSize;
    expect(viewStyle(part('icon')!)).toMatchObject({ width: iconSize, height: iconSize });
    expect(textStyle(glyph())).toMatchObject({ fontSize: iconSize, fontFamily: tanrei.icon.family.unselected.families[0], fontWeight: toFontWeight(tanrei.icon.weight), color: painted(tokens.variants.outlined.enabled.iconColor, 'dark') });
    expect(glyph().props.allowFontScaling).toBe(false);
  });

  test('CHP-14: the glyph style is the SELECTED one only for a filter chip that is on — check and icon alike; a function icon receives it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const seen: ChipIconProps[] = [];
    const icon = (props: ChipIconProps) => (seen.push(props), <View />);
    for (const props of [{}, { selected: true }, { kind: 'filter', selected: false }] as Partial<ChipProps>[]) await (await mount({ ...props, icon })).unmount();
    expect(seen.length).toBeGreaterThanOrEqual(3);
    expect(new Set(seen.map((each) => each.glyph.axes.FILL))).toEqual(new Set([tanrei.icon.fillUnselected]));
    expect(seen[0]).toMatchObject({ color: painted(tokens.variants.outlined.enabled.iconColor), size: medium.iconSize });
    await mount({ kind: 'filter', selected: true });
    expect(textStyle(part('check.glyph')!)).toMatchObject({ fontFamily: tanrei.icon.family.selected.families[0], color: painted(tokens.variants.outlined.enabled.selectedIconColor) });
    // The default system has one variable family: a selected glyph cannot be filled in a <Text>, and it says so once.
    expect(reports(warn, 'UNFILLED')).toHaveLength(1);
  });

  test('CHP-14: the remove glyph takes the remove color, at the icon size', async () => {
    await mountInput({ variant: 'elevated' }, { theme: 'dark' });
    expect(textStyle(part('remove.glyph')!)).toMatchObject({ fontSize: medium.iconSize, color: painted(tokens.variants.elevated.enabled.removeIconColor, 'dark') });
    expect(part('remove.glyph')!.props.children).toBe('close');
  });

  test.each(sizes)('CHP-15: a %s input chip draws its avatar leading, at the avatar size and shape, hidden from assistive technology, with the avatar start padding', async (size) => {
    await mountInput({ size, avatar: FIXTURE_AVATAR, icon: 'person' });
    const s = tokens.sizes[size];
    expect(viewStyle(part('avatar.image')!)).toMatchObject({ width: s.avatarSize, height: s.avatarSize, borderRadius: tokens.avatarShape, overflow: 'hidden' });
    expect(part('avatar.image')!.props.source).toEqual(FIXTURE_AVATAR);
    expect(part('avatar')!.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' });
    // In place of the icon.
    expect(part('icon')).toBeNull();
    expect(viewStyle(host()).paddingStart).toBe(s.containerPaddingInlineWithAvatar);
  });

  test('CHP-15: another kind ignores an avatar and reports it in development builds', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ kind: 'action', avatar: FIXTURE_AVATAR });
    expect(part('avatar')).toBeNull();
    expect(part('icon')).not.toBeNull();
    expect(reports(warn, 'was given an avatar')).toHaveLength(1);
  });

  test.each(sizes)('CHP-16: %s — at least its height, its corners, an outline inside its edge; ends padded by what they hold; the gap between the parts', async (size) => {
    const s = tokens.sizes[size];
    const text = await mount({ size, icon: undefined });
    expect(viewStyle(container())).toMatchObject({ flexDirection: 'row', minHeight: s.containerHeight, borderRadius: tokens.containerShape });
    expect(viewStyle(host())).toMatchObject({ paddingStart: s.containerPaddingInline, paddingEnd: s.containerPaddingInline, paddingVertical: s.containerPaddingBlock });
    expect(viewStyle(part('outline')!)).toMatchObject({ position: 'absolute', top: 0, left: 0, borderWidth: tokens.outlineWidth });
    await text.unmount();
    const glyphStart = await mount({ size });
    expect(viewStyle(host()).paddingStart).toBe(s.containerPaddingInlineWithIcon);
    expect(viewStyle(part('icon')!.parent as never)).toMatchObject({ marginEnd: s.containerGap });
    await glyphStart.unmount();
    // An input chip: the label meets the remove action a gap apart, and the remove glyph's end is a glyph end.
    await mountInput({ size });
    expect(viewStyle(host()).paddingEnd).toBe(s.containerGap);
    expect(viewStyle(container()).paddingEnd).toBe(s.containerPaddingInlineWithIcon);
    expect(viewStyle(removeHost())).toMatchObject({ width: s.iconSize, height: s.iconSize });
    expect(container().children.indexOf(host())).toBeLessThan(container().children.indexOf(removeHost()));
  });

  test('CHP-16: the default sizes are 24 / 32 high with a 6 corner and a 1 hairline outline', () => {
    expect(sizes.map((size) => tokens.sizes[size].containerHeight)).toEqual([24, 32]);
    expect(tokens.containerShape).toBe(tanrei.shape.small);
    expect(tokens.outlineWidth).toBe(1);
  });

  test.each(sizes)('CHP-17: %s sets its label on one line in its type style and the look\'s label color; the full label is the accessible name', async (size) => {
    const long = 'A label much longer than any chip in a narrow row could ever show';
    await mount({ size, label: long });
    const type = createTanreiTheme(tanrei, 'light').text(tokens.sizes[size].labelTypescale);
    expect(textStyle(label())).toMatchObject({ fontSize: type.fontSize, lineHeight: type.lineHeight, flexShrink: 1, color: painted(tokens.variants.outlined.enabled.labelColor) });
    expect(label().props.numberOfLines).toBe(1);
    expect(label().props.ellipsizeMode ?? 'tail').toBe('tail');
    expect(screen.getByRole('button', { name: long })).toBe(host());
    // The chip may shrink in its row (then the label ends in an ellipsis); it never sets a width of its own.
    expect(viewStyle(host()).flexShrink).toBe(1);
    expect(viewStyle(container()).width).toBeUndefined();
  });

  test('CHP-17: at 200% text size the chip grows in height — its height is a minimum and the label scales', async () => {
    Dimensions.set({ window: { ...WINDOW, fontScale: 2 }, screen: { ...WINDOW, fontScale: 2 } });
    try {
      await mount();
      expect(viewStyle(container()).minHeight).toBe(medium.containerHeight);
      expect(viewStyle(container()).height).toBeUndefined();
      expect(label().props.allowFontScaling).toBe(true);
    } finally {
      Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
    }
  });
});

describe('the remove action (CHP-18 … CHP-22)', () => {
  test('CHP-18: an input chip has a remove action at its inline end — a separate button named by removeAccessibilityLabel, after the chip; activating it calls onRemove once and never onPress', async () => {
    const onPress = jest.fn();
    const onRemove = jest.fn();
    await mountInput({ onPress, onRemove });
    expect(screen.getByRole('button', { name: REMOVE })).toBe(removeHost());
    expect(screen.getByRole('button', { name: LABEL })).toBe(host());
    // Two elements, siblings: an accessible element hides the ones inside it from VoiceOver.
    expect(host().children).not.toContain(removeHost());
    expect(removeHost().props.focusable).toBe(true);
    await fireEvent.press(removeHost());
    expect(onRemove).toHaveBeenCalledTimes(1);
    await wait(HOLD + 30);
    await click(removeHost());
    expect(onRemove).toHaveBeenCalledTimes(2);
    expect(onPress).not.toHaveBeenCalled();
    // A round container of the remove size and shape, centered on the glyph.
    const offset = (medium.iconSize - medium.removeContainerSize) / 2;
    expect(viewStyle(removeCircle())).toMatchObject({ position: 'absolute', top: offset, start: offset, width: medium.removeContainerSize, height: medium.removeContainerSize, borderRadius: tokens.removeContainerShape });
    expect(part('remove.icon')!.props).toMatchObject({ accessible: false, importantForAccessibility: 'no-hide-descendants' });
  });

  test('CHP-18: other kinds have no remove action', async () => {
    for (const kind of ['action', 'filter'] as const) {
      const view = await mount({ kind, removeAccessibilityLabel: REMOVE });
      expect(part('remove')).toBeNull();
      await view.unmount();
    }
  });

  test('CHP-19: Backspace or Delete on the focused input chip calls onRemove once each; not on other kinds', async () => {
    const onRemove = jest.fn();
    const view = await mountInput({ onRemove });
    await fireEvent(host(), 'focus');
    await key('Backspace');
    expect(onRemove).toHaveBeenCalledTimes(1);
    await key('Delete');
    expect(onRemove).toHaveBeenCalledTimes(2);
    await view.unmount();
    await mount({ kind: 'action', onRemove });
    await key('Backspace');
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  describe.each(variants)('CHP-20: %s', (variant) => {
    test.each(ACTIVE)('the remove action %s draws its container and glyph from its own state\'s remove tokens; the chip stays at rest', async (target) => {
      await mountInput({ variant });
      await enter(target, removeHost());
      expectRemoveFrom(variant, target);
      expectDrawnFrom(variant, 'enabled');
      if (target === 'pressed') await release(removeHost());
    });
  });

  test('CHP-20: the chip\'s state does not reach the remove action; keyboard focus on it rings its round container, not the chip', async () => {
    await mountInput();
    await fireEvent(host(), 'hoverIn');
    expectDrawnFrom('outlined', 'hovered');
    expectRemoveFrom('outlined', 'enabled');
    await fireEvent(host(), 'hoverOut');
    await fireEvent(removeHost(), 'focus');
    expect(part('focus-ring')).toBeNull();
    const ring = part('remove.focus-ring')!;
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(ring)).toMatchObject({ borderRadius: tokens.removeContainerShape + reach });
    expect(removeCircle().children).toContain(ring);
  });

  test('CHP-20: the chip is not hovered while the pointer is on its remove action — even when the chip\'s own view has not been left', async () => {
    const system = withVariant('outlined', { hovered: { containerColor: literal(9, 9, 9), labelColor: literal(8, 8, 8) } });
    await mountInput({}, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(container()).backgroundColor).toBe('rgb(9, 9, 9)');
    // The pointer reaches the remove action's hit area, which overlaps the chip's end padding: no hoverOut on the chip.
    await fireEvent(removeHost(), 'hoverIn');
    expectDrawnFrom('outlined', 'enabled', 'plain', system.components.chip, 'light', system);
    expectRemoveFrom('outlined', 'hovered', system.components.chip, system);
    await fireEvent(removeHost(), 'hoverOut');
    expect(viewStyle(container()).backgroundColor).toBe('rgb(9, 9, 9)');
  });

  test('CHP-20: the chip is not pressed while a press is on its remove action; its keyboard focus is kept', async () => {
    const onPress = jest.fn();
    const onRemove = jest.fn();
    await mountInput({ onPress, onRemove });
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'hoverIn');
    await fireEvent(removeHost(), 'pressIn');
    // The chip keeps its own highest state apart from hover and press: keyboard focus.
    expectDrawnFrom('outlined', 'focused');
    expect(part('focus-ring')).not.toBeNull();
    expectRemoveFrom('outlined', 'pressed');
    await fireEvent.press(removeHost());
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    await release(removeHost());
    expectDrawnFrom('outlined', 'focused');
  });

  test('CHP-20: in the default system the remove container is its state layer — nothing at rest, the remove glyph\'s color mixed in under hover', async () => {
    await mountInput();
    expect(viewStyle(removeCircle()).backgroundColor).toBeUndefined();
    await fireEvent(removeHost(), 'hoverIn');
    const t = tokens.variants.outlined.enabled;
    expect(t.removeStateLayerColor).toEqual(t.removeIconColor);
    expect(viewStyle(removeCircle()).backgroundColor).toBe(painted(tokens.variants.outlined.hovered.removeContainerColor));
    expect(evaluatePaint(tokens.variants.outlined.hovered.removeContainerColor, colors.light).a).toBeCloseTo(sysState.hoverStateLayerOpacity);
  });

  test('CHP-20: a press of the remove action is held (CHP-8) and ripples inside its round container, from the center when the press is outside it (CHP-9)', async () => {
    reduceMotion(false);
    await mountInput({}, { theme: 'light', system: m3Like });
    placeAt({ [`${ID}.remove.container`]: [0, 0, 24, 24, 200, 300] });
    await fireEvent(removeHost(), 'pressIn', { nativeEvent: { pageX: 206, pageY: 310 } });
    const reach = Math.hypot(18, 14);
    expect(viewStyle(part('remove.ripple.wave')!)).toMatchObject({ left: 6 - reach, top: 10 - reach, backgroundColor: painted(m3Like.components.chip.variants.outlined.pressed.removeContainerColor, 'light', m3Like) });
    expect(part('ripple')).toBeNull();
    await release(removeHost());
    await wait(m3Like.components.chip.motionStateDuration * 2 + 50);
    // A press in the hit area but outside the round container.
    await fireEvent(removeHost(), 'pressIn', { nativeEvent: { pageX: 240, pageY: 310 } });
    expect(viewStyle(part('remove.ripple.wave')!)).toMatchObject({ left: 12 - Math.hypot(12, 12), top: 12 - Math.hypot(12, 12) });
    await release(removeHost());
    await wait(m3Like.components.chip.motionStateDuration * 2 + 50);
  });

  test('CHP-20: under dim a press of the remove action dims only the remove action, and is held for duration.pressHold (CHP-8)', async () => {
    const system = withBehavior({ pressedFeedback: 'dim' }, withChip({ pressedOpacity: 0.5 }));
    await mountInput({}, { theme: 'light', system });
    await fireEvent(removeHost(), 'pressIn');
    expect(viewStyle(removeHost()).opacity).toBe(0.5);
    expect(viewStyle(container()).opacity).toBe(1);
    await fireEvent(removeHost(), 'pressOut');
    expect(viewStyle(removeHost()).opacity).toBe(0.5);
    await wait(HOLD + 30);
    expect(viewStyle(removeHost()).opacity).toBe(1);
  });

  test.each(sizes)('CHP-21: the %s remove action\'s hit area is at least sys.target.touch on both axes and reaches toward the label no further than the gap', async (size) => {
    await mountInput({ size });
    const s = tokens.sizes[size];
    const slop = removeHost().props.hitSlop;
    expect(s.iconSize + slop.left + slop.right).toBeGreaterThanOrEqual(measure.target.touch);
    expect(s.iconSize + slop.top + slop.bottom).toBeGreaterThanOrEqual(measure.target.touch);
    expect(slop.left).toBeLessThanOrEqual(s.containerGap);
    expect(slop.top).toBe(slop.bottom);
  });

  test('CHP-21: in right-to-left the remove action sits at the left, so its hit area reaches outward to the left', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    try {
      await mountInput();
      const slop = removeHost().props.hitSlop;
      expect(slop.right).toBeLessThanOrEqual(medium.containerGap);
      expect(slop.left).toBeGreaterThan(slop.right);
    } finally {
      rtl.restore();
    }
  });

  test('CHP-22: the chip does not remove itself or move focus when it asks to be removed', async () => {
    const focus = jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
    const onRemove = jest.fn();
    await mountInput({ onRemove });
    await fireEvent.press(removeHost());
    await fireEvent(host(), 'focus');
    await key('Delete');
    expect(onRemove).toHaveBeenCalledTimes(2);
    expect(host()).toBeTruthy();
    expect(removeHost()).toBeTruthy();
    expect(focus).not.toHaveBeenCalled();
  });
});

describe('keyboard and focus order (CHP-23)', () => {
  test('CHP-23: one tab stop (an input chip two: the chip, then its remove action); arrow keys are not handled', async () => {
    const onPress = jest.fn();
    const onRemove = jest.fn();
    const focus = jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
    const view = await mount({ onPress });
    const stops = () => screen.getAllByTestId(new RegExp(`^${ID}`), { includeHiddenElements: true }).filter((node) => node.props.focusable === true);
    expect(stops().map((node) => node.props.testID)).toEqual([ID]);
    await view.unmount();
    await mountInput({ onPress, onRemove });
    expect(stops().map((node) => node.props.testID)).toEqual([ID, `${ID}.remove`]);
    await fireEvent(host(), 'focus');
    for (const name of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) await key(name);
    expect(onPress).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  });
});

describe('motion and direction (CHP-24, CHP-25)', () => {
  test('CHP-24: a state change moves the colors and the elevation over the state motion tokens; the press is immediate; settled, plain values', async () => {
    reduceMotion(false);
    const system = withChip({ motionStateDuration: 600 });
    const from = resolveElevation(elevation.level2, (name) => role(name));
    const to = resolveElevation(elevation.level3, (name) => role(name));
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ variant: 'elevated' }, { theme: 'light', system });
    interpolate.mockClear();
    timing.mockClear();
    await fireEvent(host(), 'hoverIn');
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: 600, useNativeDriver: false });
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    expect(ranges).toContainEqual([from.boxShadow[0]!.blurRadius, to.boxShadow[0]!.blurRadius]);
    expect(ranges).toContainEqual([painted(tokens.variants.elevated.enabled.containerColor), painted(tokens.variants.elevated.hovered.containerColor)]);
    await wait(900);
    expect(viewStyle(container()).boxShadow).toEqual(to.boxShadow);
    timing.mockClear();
    await fireEvent(host(), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    await release();
    await wait(900);
  });

  test('CHP-24: where motion is reduced a state change is at once', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ variant: 'elevated' });
    await wait(10);
    timing.mockClear();
    await fireEvent(host(), 'hoverIn');
    expect(timing).not.toHaveBeenCalled();
    expectDrawnFrom('elevated', 'hovered');
  });

  test('CHP-25: in a right-to-left layout the rows and paddings stay logical, so the content mirrors and the remove action sits at the left', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    try {
      await mountInput({ icon: 'person' });
      for (const node of [container(), host()]) {
        const box = viewStyle(node);
        expect(box.flexDirection).toBe('row');
        for (const name of ['paddingLeft', 'paddingRight', 'direction'] as const) expect(box[name]).toBeUndefined();
      }
      expect(viewStyle(host()).paddingStart).toBe(medium.containerPaddingInlineWithIcon);
      expect(viewStyle(container()).paddingEnd).toBe(medium.containerPaddingInlineWithIcon);
      expect(viewStyle(removeCircle()).start).toBeDefined();
      expect(viewStyle(removeCircle()).left).toBeUndefined();
    } finally {
      rtl.restore();
    }
  });

  test('CHP-25: a ripple grows from the point of contact in right-to-left as in left-to-right (physical coordinates)', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    reduceMotion(false);
    try {
      await mount({}, { theme: 'light', system: m3Like });
      placeAt({ [`${ID}.container`]: [0, 0, 120, 32, 0, 0] });
      await fireEvent(container(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 32 } } });
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 30, pageY: 20 } });
      const reach = Math.hypot(90, 20);
      expect(viewStyle(part('ripple.wave')!)).toMatchObject({ left: 30 - reach, top: 20 - reach });
      await release();
      await wait(m3Like.components.chip.motionStateDuration * 2 + 50);
    } finally {
      rtl.restore();
    }
  });
});

describe('open size and variant keys', () => {
  const unknown = (size: string, variant: string) => ({ size: size as ChipSize, variant: variant as ChipVariant });

  test('CHP-7: an unknown size and an unknown variant render exactly like the default values, in every state and look', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const look of LOOKS) {
      const reference = await mount({ size: 'medium', variant: 'outlined', ...lookProps(look) });
      const expected = JSON.stringify(reference.toJSON());
      await reference.unmount();
      const view = await mount({ ...unknown('jumbo', 'ghost'), ...lookProps(look) });
      expect(JSON.stringify(view.toJSON())).toBe(expected);
      for (const target of ACTIVE) {
        await enter(target);
        expectDrawnFrom('outlined', target, look);
      }
      await view.unmount();
    }
  });

  test('CHP-7: development builds report the unknown value once per key; release builds say nothing; known values never', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (let i = 0; i < 2; i += 1) await (await mount(unknown('colossal', 'phantom'))).unmount();
    expect(reports(warn, 'no Chip size "colossal"; using "medium"')).toHaveLength(1);
    expect(reports(warn, 'no Chip variant "phantom"; using "outlined"')).toHaveLength(1);
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

  test('an unknown kind renders as an action chip and is reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ kind: 'toggle' as ChipKind, selected: true });
    expect(host().props.accessibilityState).toEqual({ disabled: false });
    expect(part('remove')).toBeNull();
    expect(reports(warn, 'Chip kind "toggle"')).toHaveLength(1);
  });
});

describe('accessible names (CHP-26)', () => {
  test('CHP-26: with an empty label the chip still renders and works, and development builds report it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onPress = jest.fn();
    await mount({ label: '', onPress });
    await fireEvent.press(host());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(reports(warn, 'has no label')).toHaveLength(1);
    expect(String(reports(warn, 'has no label')[0]![0])).toContain(`testID "${ID}"`);
  });

  test('CHP-26: an input chip without removeAccessibilityLabel reports its nameless remove action; other kinds do not need one', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const input = await mountInput({ removeAccessibilityLabel: '' });
    expect(part('remove')).not.toBeNull();
    expect(reports(warn, 'no removeAccessibilityLabel')).toHaveLength(1);
    await input.unmount();
    warn.mockClear();
    await mount({ kind: 'action' });
    expect(warn).not.toHaveBeenCalled();
  });

  test('CHP-26: accessibilityLabel names a chip without a label; a release build says nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const named = await mount({ label: '', accessibilityLabel: 'Vegetarian only' });
    expect(reports(warn, 'has no label')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Vegetarian only' })).toBe(host());
    await named.unmount();
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      await mountInput({ label: '', removeAccessibilityLabel: '' });
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
    test.each(variants)('%s resolves every part of both looks from its paints in this scheme, at rest and hovered', async (variant) => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      for (const look of LOOKS) {
        const view = await mount({ variant, ...lookProps(look) }, provider);
        expectDrawnFrom(variant, 'enabled', look, tokens, scheme);
        await fireEvent(host(), 'hoverIn');
        expectDrawnFrom(variant, 'hovered', look, tokens, scheme);
        await view.unmount();
      }
    });
  });
});

describe('the system drives rendering', () => {
  test('a size re-valued by a layer reaches the height, paddings, icon, avatar and remove sizes and the label style', async () => {
    const system = withSize('medium', { containerHeight: 36, containerPaddingInlineWithAvatar: 3, containerPaddingBlock: 5, containerGap: 7, iconSize: 18, avatarSize: 26, removeContainerSize: 30, labelTypescale: 'bodySmall' });
    await mountInput({ avatar: FIXTURE_AVATAR }, { theme: 'light', system });
    expect(viewStyle(container()).minHeight).toBe(36);
    expect(viewStyle(host())).toMatchObject({ paddingStart: 3, paddingEnd: 7, paddingVertical: 5 });
    expect(viewStyle(part('avatar.image')!)).toMatchObject({ width: 26, height: 26 });
    expect(viewStyle(removeHost())).toMatchObject({ width: 18, height: 18 });
    expect(viewStyle(removeCircle())).toMatchObject({ width: 30, height: 30, top: -6 });
    expect(textStyle(label()).fontSize).toBe(tanrei.typescale.bodySmall.size);
  });

  test('the container shape, outline width and avatar shape come from the tokens', async () => {
    const system = withChip({ containerShape: 3, outlineWidth: 2, avatarShape: 4 });
    await mountInput({ avatar: FIXTURE_AVATAR }, { theme: 'light', system });
    expect(viewStyle(container()).borderRadius).toBe(3);
    expect(viewStyle(part('outline')!)).toMatchObject({ borderWidth: 2, borderRadius: 3 });
    expect(viewStyle(part('avatar.image')!).borderRadius).toBe(4);
  });
});

describe('accessibility', () => {
  test('role button named by the label; the icon is decorative; the ref and caller handlers pass through; layout style goes on the container', async () => {
    const ref = createRef<ChipRef>();
    const onFocus = jest.fn();
    await mount({ ref, onFocus, style: { marginTop: 4 } });
    expect(screen.getByRole('button', { name: LABEL })).toBe(host());
    expect(part('icon')!.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true });
    expect(ref.current).not.toBeNull();
    await fireEvent(host(), 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(viewStyle(container()).marginTop).toBe(4);
    for (const name of ['outline', 'focus-ring']) {
      expect(part(name)!.props.accessible).toBe(false);
      expect(viewStyle(part(name)!).pointerEvents).toBe('none');
    }
  });

  test('any other icon node is rendered as given', async () => {
    await mount({ icon: <Text testID="custom">★</Text> });
    expect(screen.getByTestId('custom', { includeHiddenElements: true })).toBeTruthy();
    expect(part('glyph')).toBeNull();
  });
});

describe('fixtures', () => {
  beforeEach(() => {
    // The selected filter fixtures report the default system's unfilled selected glyph once (CHP-14).
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  describeFixtureBaselines(chipSubject);

  test('every fixture names its chip, and every input fixture names its remove action, so none of them reports CHP-26', () => {
    for (const fixture of spec.fixtures) {
      expect(fixture.props.label).toBeTruthy();
      if (fixture.props.kind === 'input') expect(fixture.props.removeLabel).toBeTruthy();
    }
  });
});
