// SplitButton — behaviour, accessibility, keyboard, the menu it presents, motion, token binding and fixture baselines.
// Cases come from specs/split-button.spec.json; every behaviour id is cited by the test that covers it.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCoreSplitButtonVariant, TanreiPaint, TanreiScheme, TanreiSplitButtonTokens, TanreiSplitButtonVariantStateTokens, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { iconFamily } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import type { MenuEntry } from '../Menu';
import { SplitButton, type SplitButtonProps } from '../SplitButton';
import { acme } from './__fixtures__/acme';
import { splitButtonSubject } from './SplitButton.subject';

const spec = loadSpec('split-button');
const tokens: TanreiSplitButtonTokens = tanrei.components.splitButton;
const medium = tokens.sizes.medium;
const { measure } = tanrei;
const ID = 'split';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const withSplit = (overrides: Partial<TanreiSplitButtonTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'splitButton', overrides);
const withVariant = (variant: TanreiCoreSplitButtonVariant, overrides: { [State in InteractionState]?: Partial<TanreiSplitButtonVariantStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.splitButton.variants[variant];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withSplit({ variants: { ...base.components.splitButton.variants, [variant]: { ...current, ...changed } } }, base);
};
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};

const ITEMS: MenuEntry[] = [
  { label: 'Save as…', testID: 'menu.item.0' },
  { label: 'Save a copy', testID: 'menu.item.1' },
];

function element(props: Partial<SplitButtonProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return (
    <TanreiProvider {...provider}>
      <SplitButton testID={ID} label="Save" menuAccessibilityLabel="More save options" menuItems={ITEMS} {...props} />
    </TanreiProvider>
  );
}
const mount = (props: Partial<SplitButtonProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) => render(element(props, provider));

const half = (which: 'leading' | 'trailing') => screen.getByTestId(`${ID}.${which}`);
const part = (which: 'leading' | 'trailing', name: string) => screen.queryByTestId(`${ID}.${which}.${name}`, { includeHiddenElements: true });
const chevron = () => screen.getByTestId(`${ID}.trailing.chevron`, { includeHiddenElements: true });
const menu = () => screen.queryByTestId(`${ID}.menu`, { includeHiddenElements: true });
const click = (which: 'leading' | 'trailing') => fireEvent(half(which), 'press', { nativeEvent: { target: 1 } });
const reportsOf = (warn: jest.SpyInstance) => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('SplitButton'));
const radii = (which: 'leading' | 'trailing') => {
  const style = viewStyle(half(which));
  return [style.borderTopStartRadius, style.borderTopEndRadius, style.borderBottomStartRadius, style.borderBottomEndRadius];
};

const HOLD = tanrei.motion.duration.pressHold;
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
async function release(which: 'leading' | 'trailing') {
  await fireEvent(half(which), 'pressOut');
  await wait(HOLD + 30);
}
async function enter(which: 'leading' | 'trailing', target: InteractionState) {
  if (target === 'hovered') await fireEvent(half(which), 'hoverIn');
  if (target === 'focused') await fireEvent(half(which), 'focus');
  if (target === 'pressed') await fireEvent(half(which), 'pressIn');
}
const ACTIVE = ['hovered', 'focused', 'pressed'] as const;
const opacityOf = (from: TanreiSplitButtonTokens, in_: InteractionState) => ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity })[in_];

/** SPB-4 / SPB-7: a half's container, label or chevron, outline, elevation and opacity from one state's tokens. */
function expectHalfDrawnFrom(which: 'leading' | 'trailing', in_: InteractionState, { system = tanrei, scheme = 'light', variant = 'filled' }: { system?: TanreiSystem; scheme?: TanreiScheme; variant?: TanreiCoreSplitButtonVariant } = {}) {
  const from = system.components.splitButton;
  const state = from.variants[variant][in_];
  const style = viewStyle(half(which));
  expect(style.backgroundColor).toBe(fill(state.containerColor, scheme, system));
  expect(style.opacity).toBe(opacityOf(from, in_));
  const elevation = createTanreiTheme(system, scheme).elevation(state.containerElevation);
  expect(style.boxShadow).toEqual(elevation.boxShadow.length ? elevation.boxShadow : undefined);
  const glyph = which === 'leading' ? part('leading', 'label') : screen.getByTestId(`${ID}.trailing.chevron.glyph`, { includeHiddenElements: true });
  expect(textStyle(glyph!).color).toBe(painted(state.labelColor, scheme, system));
  const outline = part(which, 'outline');
  expect(outline !== null).toBe(evaluatePaint(state.outlineColor, system.colors[scheme]).a > 0);
  if (outline) expect(viewStyle(outline).borderColor).toBe(painted(state.outlineColor, scheme, system));
}

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // The baselines at the tokens' own sizes (the Jest preset's window has fontScale 2).
  Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
beforeEach(() => {
  reduceMotion(true);
  resetLookupReports();
});
afterEach(() => {
  jest.restoreAllMocks();
  development(true);
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(SplitButton.name);
    expect(platform.props).toEqual({ variant: 'variant', size: 'size', label: 'label', menuLabel: 'menuAccessibilityLabel', open: 'menuVisible', disabled: 'disabled' });
    expect(platform.events).toEqual({ click: 'onPress', toggle: 'onMenuToggle', close: 'onMenuDismiss' });
  });

  test('variant and size are token axes; defaults follow the spec — filled, medium, closed, enabled', async () => {
    expect(Object.keys(tokens.variants)).toEqual(['filled', 'tonal', 'elevated', 'outlined']);
    expect(Object.keys(tokens.sizes)).toEqual(['small', 'medium', 'large']);
    await mount();
    expectHalfDrawnFrom('leading', 'enabled');
    expect(half('trailing').props.accessibilityState).toEqual({ disabled: false, expanded: false });
    expect(viewStyle(half('leading')).minHeight).toBe(medium.containerHeight);
  });
});

describe('the two halves (SPB-1, SPB-2, SPB-3, SPB-17)', () => {
  test('SPB-1: activating the leading half — by touch or a bare click — emits click once and neither opens nor closes the menu', async () => {
    const onPress = jest.fn();
    const onMenuToggle = jest.fn();
    await mount({ onPress, onMenuToggle });
    await fireEvent.press(half('leading'));
    await wait(HOLD + 30);
    await click('leading');
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(onMenuToggle).not.toHaveBeenCalled();
    expect(menu()).toBeNull();
  });

  test('SPB-2: the trailing half asks for the opposite of menuVisible; Down Arrow on it asks to open a closed menu; the menu opens only when the product sets menuVisible', async () => {
    const onMenuToggle = jest.fn();
    const view = await mount({ onMenuToggle });
    await fireEvent.press(half('trailing'));
    expect(onMenuToggle).toHaveBeenLastCalledWith(true);
    expect(menu()).toBeNull();
    await fireEvent(half('trailing'), 'keyDown', { nativeEvent: { key: 'ArrowDown' } });
    expect(onMenuToggle).toHaveBeenLastCalledWith(true);
    await fireEvent(half('trailing'), 'keyDown', { nativeEvent: { key: 'ArrowUp' } });
    expect(onMenuToggle).toHaveBeenCalledTimes(2);
    await view.rerender(element({ onMenuToggle, menuVisible: true }));
    expect(menu()).not.toBeNull();
    await wait(HOLD + 30);
    await click('trailing');
    expect(onMenuToggle).toHaveBeenLastCalledWith(false);
    // Down Arrow does nothing while it is open.
    await fireEvent(half('trailing'), 'keyDown', { nativeEvent: { key: 'ArrowDown' } });
    expect(onMenuToggle).toHaveBeenCalledTimes(3);
  });

  test('SPB-3: disabled — no click, toggle or close; neither half focusable; both expose disabled; no menu and no open form whatever menuVisible says', async () => {
    const onPress = jest.fn();
    const onMenuToggle = jest.fn();
    const onMenuDismiss = jest.fn();
    await mount({ disabled: true, menuVisible: true, onPress, onMenuToggle, onMenuDismiss });
    await fireEvent.press(half('leading'));
    await fireEvent.press(half('trailing'));
    await fireEvent(half('trailing'), 'keyDown', { nativeEvent: { key: 'ArrowDown' } });
    expect([onPress, onMenuToggle, onMenuDismiss].map((fn) => fn.mock.calls.length)).toEqual([0, 0, 0]);
    expect([half('leading').props.focusable, half('trailing').props.focusable]).toEqual([false, false]);
    expect(half('leading')).toBeDisabled();
    expect(half('trailing').props.accessibilityState).toEqual({ disabled: true, expanded: false });
    expect(menu()).toBeNull();
    expect(radii('trailing')[0]).toBe(tokens.containerInnerShape);
  });

  test('SPB-17: two buttons in reading order, each its own Tab stop — the leading half named by label, the trailing half by menuAccessibilityLabel with its expanded state; the icon and chevron hidden; no element around them', async () => {
    await mount({ icon: 'save', menuVisible: true });
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((each) => each.props.accessibilityLabel)).toEqual(['Save', 'More save options']);
    expect(half('trailing').props.accessibilityState).toEqual({ disabled: false, expanded: true });
    expect([half('leading').props.focusable, half('trailing').props.focusable]).toEqual([true, true]);
    expect(part('leading', 'icon')!.props.accessibilityElementsHidden).toBe(true);
    expect(chevron().props.accessibilityElementsHidden).toBe(true);
    const row = screen.getByTestId(ID);
    expect(row.props.accessible).toBeUndefined();
    expect(row.props.role).toBeUndefined();
    expect(row.props.accessibilityRole).toBeUndefined();
  });
});

describe('states (SPB-4 … SPB-11, SPB-18)', () => {
  describe.each(['leading', 'trailing'] as const)('SPB-4: the %s half', (which) => {
    test.each(ACTIVE)('%s: its container, label or chevron, outline, elevation and opacity come from that state\'s tokens; the other half stays at rest', async (target) => {
      const other = which === 'leading' ? 'trailing' : 'leading';
      await mount({ variant: 'filled' });
      await enter(which, target);
      expectHalfDrawnFrom(which, target);
      expectHalfDrawnFrom(other, 'enabled');
      if (target === 'hovered') await fireEvent(half(which), 'hoverOut');
      if (target === 'focused') await fireEvent(half(which), 'blur');
      if (target === 'pressed') await release(which);
      expectHalfDrawnFrom(which, 'enabled');
    });
  });

  test('SPB-4: precedence is pressed over focused over hovered, under the acme fixture system; focus that comes with a press does not select focused', async () => {
    const filled = acme.components.splitButton.variants.filled;
    const expected = (name: InteractionState) => fill(filled[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    await mount({}, { theme: 'light', system: acme });
    const background = () => viewStyle(half('leading')).backgroundColor;
    await fireEvent(half('leading'), 'hoverIn');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(half('leading'), 'focus');
    expect(background()).toBe(expected('focused'));
    await fireEvent(half('leading'), 'pressIn');
    expect(background()).toBe(expected('pressed'));
    await release('leading');
    expect(background()).toBe(expected('focused'));
    await fireEvent(half('leading'), 'blur');
    await fireEvent(half('leading'), 'hoverOut');
    await fireEvent(half('trailing'), 'pressIn');
    await fireEvent(half('trailing'), 'focus');
    await release('trailing');
    expect(viewStyle(half('trailing')).backgroundColor).toBe(expected('enabled'));
  });

  test('SPB-5: keyboard focus shows the focus ring around that half\'s own shape, without animation; focus that comes with a press does not', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    await wait(10);
    timing.mockClear();
    await fireEvent(half('trailing'), 'focus');
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(part('trailing', 'focus-ring')!)).toMatchObject({ top: -reach, borderTopStartRadius: tokens.containerInnerShape + reach, borderTopEndRadius: tokens.containerShape + reach });
    expect(part('leading', 'focus-ring')).toBeNull();
    expect(timing.mock.calls.every(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
    await wait(tokens.motionStateDuration * 2);
    await fireEvent(half('leading'), 'pressIn');
    await fireEvent(half('leading'), 'focus');
    expect(part('leading', 'focus-ring')).toBeNull();
    await release('leading');
    await wait(tokens.motionStateDuration * 2);
  });

  test('SPB-6: each half extends its hit area to the touch target — above, below and outward — but toward the other half only to the middle of the gap (mirrored in right-to-left)', async () => {
    const view = await mount({ size: 'small' });
    const height = tokens.sizes.small.containerHeight;
    const own = Math.ceil((measure.target.touch - height) / 2);
    const half_ = tokens.containerInnerGap / 2;
    expect(half('leading').props.hitSlop).toEqual({ top: own, bottom: own, left: own, right: half_ });
    expect(half('trailing').props.hitSlop).toEqual({ top: own, bottom: own, left: half_, right: own });
    await view.unmount();
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mount({ size: 'small' });
    expect(half('leading').props.hitSlop).toEqual({ top: own, bottom: own, left: half_, right: own });
    expect(half('trailing').props.hitSlop).toEqual({ top: own, bottom: own, left: own, right: half_ });
  });

  test('SPB-7: disabled — both halves from the variant\'s disabled tokens (outlined: no fill and a faded border)', async () => {
    const view = await mount({ disabled: true });
    expectHalfDrawnFrom('leading', 'disabled');
    expectHalfDrawnFrom('trailing', 'disabled');
    await view.unmount();
    await mount({ disabled: true, variant: 'outlined' });
    expectHalfDrawnFrom('leading', 'disabled', { variant: 'outlined' });
    expect(viewStyle(half('leading')).backgroundColor).toBeUndefined();
    expect(part('leading', 'outline')).not.toBeNull();
  });

  test('SPB-8: an unknown variant or size renders as the default\'s tokens, and development builds report each once; a release build is silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const expected = await mount();
    const json = JSON.stringify(expected.toJSON());
    await expected.unmount();
    const view = await mount({ variant: 'glass' as never, size: 'huge' as never });
    expect(JSON.stringify(view.toJSON())).toBe(json);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('no SplitButton size "huge"; using "medium"'), expect.stringContaining('no SplitButton variant "glass"; using "filled"')]);
    await view.unmount();
    warn.mockClear();
    resetLookupReports();
    development(false);
    await mount({ variant: 'glass' as never });
    expect(warn).not.toHaveBeenCalled();
  });

  test('SPB-9: the pressed state appears at once on the pressed half and stays visible for duration.pressHold; a bare click shows it too', async () => {
    await mount();
    await fireEvent(half('leading'), 'pressIn');
    expectHalfDrawnFrom('leading', 'pressed');
    await fireEvent(half('leading'), 'pressOut');
    await wait(HOLD / 2);
    expectHalfDrawnFrom('leading', 'pressed');
    await wait(HOLD / 2 + 30);
    expectHalfDrawnFrom('leading', 'enabled');
    await click('trailing');
    expectHalfDrawnFrom('trailing', 'pressed');
    await wait(HOLD + 30);
    expectHalfDrawnFrom('trailing', 'enabled');
  });

  test('SPB-10 overlay (the default) and ripple (m3-like): the pressed tokens at once / the pressed color grows from the point of contact, clipped to the half\'s own corners', async () => {
    reduceMotion(false);
    const view = await mount();
    await fireEvent(half('leading'), 'pressIn');
    expect(part('leading', 'ripple')).toBeNull();
    expect(viewStyle(half('leading')).backgroundColor).toBe(fill(tokens.variants.filled.pressed.containerColor));
    await release('leading');
    await wait(tokens.motionStateDuration * 2);
    await view.unmount();

    const m3 = m3Like.components.splitButton;
    const timing = jest.spyOn(Animated, 'timing');
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 80, 40, 0, 0));
    await mount({}, { theme: 'light', system: m3Like });
    await fireEvent(half('leading'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 40 } } });
    timing.mockClear();
    await fireEvent(half('leading'), 'pressIn', { nativeEvent: { pageX: 20, pageY: 10 } });
    const reach = Math.hypot(80 - 20, 40 - 10);
    expect(viewStyle(part('leading', 'ripple.wave')!)).toMatchObject({ left: 20 - reach, top: 10 - reach, backgroundColor: painted(m3.variants.filled.pressed.containerColor, 'light', m3Like) });
    expect(viewStyle(part('leading', 'ripple')!)).toMatchObject({ borderTopStartRadius: m3.containerShape, borderTopEndRadius: m3.containerInnerShape, overflow: 'hidden' });
    expect(viewStyle(half('leading')).backgroundColor).toBe(fill(m3.variants.filled.enabled.containerColor, 'light', m3Like));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: m3.motionFeedbackDuration, useNativeDriver: true });
    await release('leading');
    await wait(m3.motionStateDuration * 2 + 50);
    expect(part('leading', 'ripple')).toBeNull();
  });

  test('SPB-10 dim (cupertino): the pressed opacity on the pressed half and no state layer; none: no answer at all, the click still happens', async () => {
    const cup = cupertino.components.splitButton;
    const view = await mount({}, { theme: 'light', system: cupertino });
    await fireEvent(half('trailing'), 'pressIn');
    expect(cup.pressedOpacity).toBeLessThan(1);
    expect(viewStyle(half('trailing'))).toMatchObject({ opacity: cup.pressedOpacity, backgroundColor: fill(cup.variants.filled.enabled.containerColor, 'light', cupertino) });
    expect(viewStyle(half('leading')).opacity).toBe(1);
    await release('trailing');
    await view.unmount();

    const onPress = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withVariant('filled', { pressed: { containerColor: literal(1, 2, 3), labelColor: literal(4, 5, 6) } }, withSplit({ pressedOpacity: 0.5 })));
    await mount({ onPress }, { theme: 'light', system });
    await fireEvent(half('leading'), 'pressIn');
    expectHalfDrawnFrom('leading', 'enabled', { system });
    await fireEvent.press(half('leading'));
    expect(onPress).toHaveBeenCalledTimes(1);
    await release('leading');
  });

  test('SPB-11: the halves ease their corners by the smoothing (cupertino: continuous), the focus ring too; glow (acme) is one halo', async () => {
    const view = await mount();
    expect(viewStyle(half('leading')).borderCurve).toBeUndefined();
    await view.unmount();
    const second = await mount({}, { theme: 'light', system: cupertino });
    await fireEvent(half('leading'), 'focus');
    expect(viewStyle(half('leading')).borderCurve).toBe('continuous');
    expect(viewStyle(half('trailing')).borderCurve).toBe('continuous');
    expect(viewStyle(part('leading', 'focus-ring')!).borderCurve).toBe('continuous');
    await second.unmount();
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(half('leading'), 'focus');
    expect(viewStyle(part('leading', 'focus-ring')!).boxShadow).toHaveLength(1);
  });

  test('SPB-18: each half casts its own elevation (elevated) outside it, unclipped; a state change moves colors and elevation over comp.split-button.motion.state-*, a press at once; reduced motion at once', async () => {
    const theme = createTanreiTheme(tanrei, 'light');
    const view = await mount({ variant: 'elevated' });
    const resting = theme.elevation(tokens.variants.elevated.enabled.containerElevation);
    for (const which of ['leading', 'trailing'] as const) {
      expect(viewStyle(half(which)).boxShadow).toEqual(resting.boxShadow.length ? resting.boxShadow : undefined);
      expect(viewStyle(half(which)).overflow).toBeUndefined();
      if (resting.ring) expect(part(which, 'elevation-ring')).not.toBeNull();
    }
    await view.unmount();
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const system = withSplit({ motionStateDuration: 123 });
    const second = await mount({}, { theme: 'light', system });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    await wait(10);
    timing.mockClear();
    await fireEvent(half('leading'), 'hoverIn');
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: 123, useNativeDriver: false });
    await fireEvent(half('leading'), 'hoverOut');
    await wait(300);
    timing.mockClear();
    await fireEvent(half('trailing'), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    await release('trailing');
    await wait(300);
    await second.unmount();
    reduceMotion(true);
    await mount();
    await wait(10);
    timing.mockClear();
    await fireEvent(half('leading'), 'hoverIn');
    expect(timing).not.toHaveBeenCalled();
    expectHalfDrawnFrom('leading', 'hovered');
  });
});

describe('layout (SPB-12, SPB-13, SPB-14, SPB-19)', () => {
  test('SPB-12: one row, the halves container.inner-gap apart; the leading half at least the size\'s height, its paddings and gap; the trailing half as tall, its chevron between its paddings', async () => {
    const view = await mount({ size: 'large' });
    const large = tokens.sizes.large;
    expect(viewStyle(screen.getByTestId(ID))).toMatchObject({ flexDirection: 'row', alignItems: 'stretch', alignSelf: 'flex-start', gap: tokens.containerInnerGap });
    expect(viewStyle(half('leading'))).toMatchObject({ minHeight: large.containerHeight, paddingStart: large.leadingPaddingInlineStart, paddingEnd: large.leadingPaddingInlineEnd, paddingVertical: large.containerPaddingBlock, gap: large.containerGap });
    expect(viewStyle(half('trailing'))).toMatchObject({ minHeight: large.containerHeight, paddingStart: large.trailingPaddingInline, paddingEnd: large.trailingPaddingInline, alignItems: 'center', justifyContent: 'center' });
    await view.unmount();
    const system = withSplit({ sizes: { ...tokens.sizes, medium: { ...medium, leadingPaddingInlineStartWithIcon: 7 } } });
    await mount({ icon: 'save' }, { theme: 'light', system });
    expect(viewStyle(half('leading')).paddingStart).toBe(7);
    expect(half('leading').children[0]).toBe(part('leading', 'icon'));
  });

  test('SPB-13: the leading half\'s start corners and the trailing half\'s end corners are container.shape, the corners where they meet container.inner-shape; each half draws its outline inside its own edge', async () => {
    await mount({ variant: 'outlined' });
    expect(radii('leading')).toEqual([tokens.containerShape, tokens.containerInnerShape, tokens.containerShape, tokens.containerInnerShape]);
    expect(radii('trailing')).toEqual([tokens.containerInnerShape, tokens.containerShape, tokens.containerInnerShape, tokens.containerShape]);
    expect(viewStyle(part('trailing', 'outline')!)).toMatchObject({ position: 'absolute', top: 0, borderWidth: medium.outlineWidth, borderTopStartRadius: tokens.containerInnerShape, borderTopEndRadius: tokens.containerShape });
  });

  test('SPB-13: WHILE open the trailing half\'s inner corners are container.inner-shape-open and the chevron points up; WHEN open changes they move over the open motion; at once where motion is reduced', async () => {
    const system = withSplit({ containerInnerShapeOpen: 11 });
    const view = await mount({ menuVisible: true }, { theme: 'light', system });
    expect(radii('trailing')).toEqual([11, tokens.containerShape, 11, tokens.containerShape]);
    expect(viewStyle(chevron()).transform).toEqual([{ rotate: '180deg' }]);
    await view.unmount();
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const moving = await mount({}, { theme: 'light', system });
    await wait(10);
    timing.mockClear();
    await moving.rerender(element({ menuVisible: true }, { theme: 'light', system }));
    expect(bezier).toHaveBeenCalledWith(...tokens.motionOpenEasing);
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionOpenDuration)).toBe(true);
    await wait(tokens.motionOpenDuration + 150);
    expect(radii('trailing')[0]).toBe(11);
    expect(viewStyle(chevron()).transform).toEqual([{ rotate: '180deg' }]);
  });

  test('SPB-14: the label in the size\'s type style and the label color, never truncated; the icon and chevron at the icon size in their own half\'s label color, the unselected family', async () => {
    await mount({ icon: 'save', size: 'small' }, { theme: 'light', system: acme });
    const small = acme.components.splitButton.sizes.small;
    const expected = createTanreiTheme(acme, 'light').text(small.labelTypescale);
    expect(textStyle(part('leading', 'label')!)).toMatchObject({ fontSize: expected.fontSize, lineHeight: expected.lineHeight });
    expect(part('leading', 'label')!.props.numberOfLines).toBeUndefined();
    expect(viewStyle(part('leading', 'icon')!).width).toBe(small.iconSize);
    const chevronGlyph = screen.getByTestId(`${ID}.trailing.chevron.glyph`, { includeHiddenElements: true });
    expect(chevronGlyph.props.children).toBe('keyboard_arrow_down');
    expect(textStyle(chevronGlyph).fontFamily).toBe(iconFamily(acme.icon, false).families[0]);
    expect(textStyle(part('leading', 'icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, false).families[0]);
    expect(textStyle(chevronGlyph).fontSize).toBe(small.iconSize);
  });

  test('SPB-19: right-to-left — the row mirrors (the trailing half on the left), paddings and corners are logical, the chevron is never mirrored', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mount({ icon: 'save' });
    expect(viewStyle(screen.getByTestId(ID)).flexDirection).toBe('row');
    expect(viewStyle(half('leading')).paddingLeft).toBeUndefined();
    expect(viewStyle(half('leading')).borderTopLeftRadius).toBeUndefined();
    expect(viewStyle(chevron()).direction).toBe('ltr');
  });
});

describe('the menu (SPB-15, SPB-16, SPB-20)', () => {
  const box = { x: 20, y: 100, width: 120, height: 36 };
  const mockMeasure = () => {
    const spy = jest.spyOn(View.prototype as unknown as { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void }, 'measureInWindow');
    spy.mockImplementation(function (this: { props?: { testID?: string } }, callback) {
      // The trailing half is the last 40 of the row.
      const id = this?.props?.testID;
      if (id === `${ID}.trailing`) callback(box.x + box.width - 40, box.y, 40, box.height);
      else if (id === ID) callback(box.x, box.y, box.width, box.height);
      // The overlay layer fills the window.
      else callback(0, 0, WINDOW.width, WINDOW.height);
    });
    return spy;
  };
  const layOut = () => fireEvent(screen.getByTestId(`${ID}.menu.placement`, { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 100 } } });

  test('SPB-15: WHEN menuVisible becomes true the items are presented as a Tanrei Menu on the overlay layer, below the whole split button with the end edges aligned (bottom-end), named by menuAccessibilityLabel; WHEN it becomes false the menu is removed and focus goes back to the trailing half', async () => {
    const spy = mockMeasure();
    try {
      const focus = jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
      const view = await mount({ menuVisible: true });
      await layOut();
      const menuTokens = tanrei.components.menu;
      expect(viewStyle(screen.getByTestId(`${ID}.menu.placement`, { includeHiddenElements: true }))).toMatchObject({ top: box.y + box.height + menuTokens.surfaceOffset, left: box.x + box.width - 100 });
      expect(menu()!.props.accessibilityLabel).toBe('More save options');
      expect(screen.getByTestId('menu.item.0', { includeHiddenElements: true })).toBeTruthy();
      await fireEvent(screen.getByTestId('menu.item.0', { includeHiddenElements: true }), 'focus');
      focus.mockClear();
      await view.rerender(element({ menuVisible: false }));
      expect(menu()).toBeNull();
      expect((focus.mock.contexts.at(-1) as { props?: { testID?: string } }).props?.testID).toBe(`${ID}.trailing`);
    } finally {
      spy.mockReset();
    }
  });

  test('SPB-16: the menu\'s close requests reach onMenuDismiss once with their reason; an action item emits its click first, then close with "item"; a press on the trailing half while open is a toggle to false, not "outside"', async () => {
    const spy = mockMeasure();
    try {
      const order: string[] = [];
      const onMenuDismiss = jest.fn((reason: string) => order.push(`close:${reason}`));
      const onMenuToggle = jest.fn((open: boolean) => order.push(`toggle:${open}`));
      const items: MenuEntry[] = [{ label: 'Save as…', testID: 'menu.item.0', onPress: () => order.push('click') }];
      await mount({ menuVisible: true, menuItems: items, onMenuDismiss, onMenuToggle });
      await layOut();
      await fireEvent.press(screen.getByTestId('menu.item.0', { includeHiddenElements: true }));
      expect(order).toEqual(['click', 'close:item']);
      order.length = 0;
      const outside = screen.getByTestId(`${ID}.menu.outside`, { includeHiddenElements: true });
      // On the trailing half (the last 40 of the row), then far away.
      await fireEvent(outside, 'press', { nativeEvent: { pageX: box.x + box.width - 20, pageY: box.y + 10 } });
      await fireEvent(outside, 'press', { nativeEvent: { pageX: 300, pageY: 600 } });
      expect(order).toEqual(['toggle:false', 'close:outside']);
      await fireEvent(screen.getByTestId(`${ID}.menu`, { includeHiddenElements: true }), 'keyDown', { nativeEvent: { key: 'Escape' } });
      expect(onMenuDismiss.mock.calls.map(([reason]) => reason)).toEqual(['item', 'outside', 'escape']);
    } finally {
      spy.mockReset();
    }
  });

  test('SPB-20: a half without a name, and an empty menu, still render and are reported in development builds; an empty menu still toggles and draws the open form, but presents no menu; release builds are silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onMenuToggle = jest.fn();
    const view = await mount({ label: '', menuAccessibilityLabel: '', menuItems: [], menuVisible: true, onMenuToggle });
    expect(reportsOf(warn)).toEqual([
      expect.stringContaining('the leading half of a SplitButton (testID "split") has no label'),
      expect.stringContaining('the trailing half of a SplitButton (testID "split") has no menuAccessibilityLabel'),
      expect.stringContaining('a SplitButton (testID "split") has no menuItems'),
    ]);
    expect(menu()).toBeNull();
    expect(radii('trailing')[0]).toBe(tokens.containerInnerShapeOpen);
    await fireEvent.press(half('trailing'));
    expect(onMenuToggle).toHaveBeenCalledWith(false);
    await view.unmount();
    warn.mockClear();
    development(false);
    await mount({ label: '', menuItems: [] });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  describe.each(schemes)('$scheme', ({ provider, scheme }) => {
    test.each(['filled', 'tonal', 'elevated', 'outlined'] as const)('%s: both halves resolve their parts from their paints in this scheme, at rest and hovered', async (variant) => {
      await mount({ variant }, provider);
      for (const which of ['leading', 'trailing'] as const) {
        expectHalfDrawnFrom(which, 'enabled', { scheme, variant });
        await fireEvent(half(which), 'hoverIn');
        expectHalfDrawnFrom(which, 'hovered', { scheme, variant });
        await fireEvent(half(which), 'hoverOut');
      }
    });
  });

  test('the default values are Button\'s: heights 32 / 36 / 40, corners 6, the join 2 apart at 3, the open trailing half back at the outer corner', () => {
    expect(Object.values(tokens.sizes).map((each) => each.containerHeight)).toEqual(Object.values(tanrei.components.button.sizes).map((each) => each.containerHeight));
    expect(tokens).toMatchObject({ containerShape: tanrei.components.button.containerShape, containerInnerGap: 2, containerInnerShape: 3, containerInnerShapeOpen: tokens.containerShape });
  });
});

describe('fixtures', () => {
  beforeEach(() => {
    // The fixtures cannot fill the menu slot: each reports its empty menu (SPB-20).
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  describeFixtureBaselines(splitButtonSubject);
});
