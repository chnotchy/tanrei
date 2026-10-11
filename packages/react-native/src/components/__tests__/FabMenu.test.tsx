// FabMenu — behaviour, accessibility, keyboard, the overlay, motion, token binding and fixture baselines.
// Cases come from specs/fab-menu.spec.json; every behaviour id is cited by the test that covers it.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, BackHandler, Dimensions, Easing, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCoreFabMenuVariant, TanreiFabMenuTokens, TanreiFabMenuVariantStateTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { iconFamily } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { FabMenu, type FabMenuItem, type FabMenuProps } from '../FabMenu';
import { acme } from './__fixtures__/acme';
import { fabMenuSubject } from './FabMenu.subject';

const spec = loadSpec('fab-menu');
const tokens: TanreiFabMenuTokens = tanrei.components.fabMenu;
const medium = tokens.sizes.medium;
const { measure } = tanrei;
const ID = 'fab';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const withFabMenu = (overrides: Partial<TanreiFabMenuTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'fabMenu', overrides);
const withVariant = (variant: TanreiCoreFabMenuVariant, overrides: { [State in InteractionState]?: Partial<TanreiFabMenuVariantStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.fabMenu.variants[variant];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withFabMenu({ variants: { ...base.components.fabMenu.variants, [variant]: { ...current, ...changed } } }, base);
};
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};

const ITEMS: FabMenuItem[] = [
  { label: 'Document', icon: 'description' },
  { label: 'Folder', icon: 'create_new_folder' },
  { label: 'Upload', icon: 'upload' },
];

function element(props: Partial<FabMenuProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return (
    <TanreiProvider {...provider}>
      <FabMenu testID={ID} icon="add" accessibilityLabel="Create" items={ITEMS} {...props} />
    </TanreiProvider>
  );
}
const mount = (props: Partial<FabMenuProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) => render(element(props, provider));

// The toggle sits at the bottom-right of a 400 × 800 window; the layer fills it.
const TOGGLE = { x: 336, y: 736, width: 48, height: 48 };
function mockMeasure() {
  const spy = jest.spyOn(View.prototype as unknown as { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void }, 'measureInWindow');
  spy.mockImplementation(function (this: { props?: { testID?: string } }, callback) {
    if (this?.props?.testID === ID) callback(TOGGLE.x, TOGGLE.y, TOGGLE.width, TOGGLE.height);
    else callback(0, 0, 400, 800);
  });
  return spy;
}

const toggle = () => screen.getByTestId(ID);
const tpart = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const item = (i: number) => screen.getByTestId(`${ID}.item.${i}`, { includeHiddenElements: true });
const ipart = (i: number, name: string) => screen.queryByTestId(`${ID}.item.${i}.${name}`, { includeHiddenElements: true });
const list = () => screen.queryByTestId(`${ID}.list`, { includeHiddenElements: true });
const click = (target: ReturnType<typeof screen.getByTestId>) => fireEvent(target, 'press', { nativeEvent: { target: 1 } });
const key = (target: ReturnType<typeof screen.getByTestId>, name: string) => fireEvent(target, 'keyDown', { nativeEvent: { key: name } });
const focusSpy = () => jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
const focused = (spy: jest.SpyInstance) => (spy.mock.contexts.at(-1) as { props?: { testID?: string } } | undefined)?.props?.testID;
const reportsOf = (warn: jest.SpyInstance) => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('FabMenu'));

const HOLD = tanrei.motion.duration.pressHold;
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
const ACTIVE = ['hovered', 'focused', 'pressed'] as const;
const opacityOf = (from: TanreiFabMenuTokens, in_: InteractionState) => ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity })[in_];

/** FBM-3 / FBM-6: the toggle from its closed (or open.) parts in one state. */
function expectToggleDrawnFrom(open: boolean, in_: InteractionState, { system = tanrei, scheme = 'light', variant = 'filled' }: { system?: TanreiSystem; scheme?: TanreiScheme; variant?: TanreiCoreFabMenuVariant } = {}) {
  const from = system.components.fabMenu;
  const state = from.variants[variant][in_];
  const paints = open ? { container: state.openContainerColor, icon: state.openIconColor, elevation: state.openContainerElevation } : { container: state.containerColor, icon: state.iconColor, elevation: state.containerElevation };
  const style = viewStyle(toggle());
  expect(style.backgroundColor).toBe(fill(paints.container, scheme, system));
  expect(style.opacity).toBe(opacityOf(from, in_));
  const elevation = createTanreiTheme(system, scheme).elevation(paints.elevation);
  expect(style.boxShadow).toEqual(elevation.boxShadow.length ? elevation.boxShadow : undefined);
  const glyph = tpart(open ? 'close.glyph' : 'glyph')!;
  expect(textStyle(glyph).color).toBe(painted(paints.icon, scheme, system));
}
/** FBM-3 / FBM-9: an item from the item parts in one state. */
function expectItemDrawnFrom(i: number, in_: InteractionState, { system = tanrei, scheme = 'light', variant = 'filled' }: { system?: TanreiSystem; scheme?: TanreiScheme; variant?: TanreiCoreFabMenuVariant } = {}) {
  const from = system.components.fabMenu;
  const state = from.variants[variant][in_];
  const style = viewStyle(item(i));
  expect(style.backgroundColor).toBe(fill(state.itemContainerColor, scheme, system));
  expect(style.opacity).toBe(opacityOf(from, in_));
  const elevation = createTanreiTheme(system, scheme).elevation(state.itemContainerElevation);
  expect(style.boxShadow).toEqual(elevation.boxShadow.length ? elevation.boxShadow : undefined);
  expect(textStyle(ipart(i, 'label')!).color).toBe(painted(state.itemLabelColor, scheme, system));
  expect(textStyle(ipart(i, 'icon.glyph')!).color).toBe(painted(state.itemIconColor, scheme, system));
}

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // The baselines at the tokens' own sizes (the Jest preset's window has fontScale 2).
  Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
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
  test('the React Native mapping in the spec matches this implementation: FabMenu and its item kind FabMenuItem', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(FabMenu.name);
    expect(platform.props).toEqual({ variant: 'variant', size: 'size', open: 'visible', label: 'accessibilityLabel', disabled: 'disabled' });
    expect(platform.events).toEqual({ toggle: 'onToggle', close: 'onDismiss' });
    expect(platform.items?.item?.name).toBe('FabMenuItem');
    expect(platform.items?.item?.props).toEqual({ label: 'label', icon: 'icon' });
    expect(platform.items?.item?.events).toEqual({ click: 'onPress' });
  });

  test('variant and size are token axes; defaults follow the spec — filled, medium, closed', async () => {
    expect(Object.keys(tokens.variants)).toEqual(['filled', 'tonal', 'surface']);
    expect(Object.keys(tokens.sizes)).toEqual(['small', 'medium', 'large']);
    await mount();
    expectToggleDrawnFrom(false, 'enabled');
    expect(list()).toBeNull();
  });
});

describe('the toggle (FBM-1, FBM-2, FBM-5 … FBM-11, FBM-21)', () => {
  test('FBM-1: activating the toggle asks for the opposite of visible; Down or Up Arrow on a closed toggle asks to open; the items show only when the product sets visible', async () => {
    const onToggle = jest.fn();
    const view = await mount({ onToggle });
    await fireEvent.press(toggle());
    expect(onToggle).toHaveBeenLastCalledWith(true);
    expect(list()).toBeNull();
    await key(toggle(), 'ArrowDown');
    await key(toggle(), 'ArrowUp');
    await key(toggle(), 'ArrowLeft');
    expect(onToggle.mock.calls).toEqual([[true], [true], [true]]);
    const spy = mockMeasure();
    try {
      await view.rerender(element({ onToggle, visible: true }));
      expect(list()).not.toBeNull();
      await wait(HOLD + 30);
      await click(toggle());
      expect(onToggle).toHaveBeenLastCalledWith(false);
      await key(toggle(), 'ArrowDown');
      expect(onToggle).toHaveBeenCalledTimes(4);
    } finally {
      spy.mockReset();
    }
  });

  test('FBM-2 / FBM-6: disabled — no toggle or close, not focusable, exposes disabled, drawn closed from the disabled tokens, no items whatever visible says', async () => {
    const onToggle = jest.fn();
    const onDismiss = jest.fn();
    await mount({ disabled: true, visible: true, onToggle, onDismiss });
    await fireEvent.press(toggle());
    await key(toggle(), 'ArrowDown');
    expect([onToggle, onDismiss].map((fn) => fn.mock.calls.length)).toEqual([0, 0]);
    expect(toggle().props.focusable).toBe(false);
    expect(toggle().props.accessibilityState).toEqual({ disabled: true, expanded: false });
    expectToggleDrawnFrom(false, 'disabled');
    expect(list()).toBeNull();
  });

  test.each(ACTIVE)('FBM-3: the toggle %s — closed and open — is drawn from that state\'s tokens of its look, and returns to rest', async (target) => {
    for (const open of [false, true]) {
      const view = await mount({ visible: open, inline: true });
      if (target === 'hovered') await fireEvent(toggle(), 'hoverIn');
      if (target === 'focused') await fireEvent(toggle(), 'focus');
      if (target === 'pressed') await fireEvent(toggle(), 'pressIn');
      expectToggleDrawnFrom(open, target);
      if (target === 'pressed') {
        await fireEvent(toggle(), 'pressOut');
        await wait(HOLD + 30);
      }
      if (target === 'hovered') await fireEvent(toggle(), 'hoverOut');
      if (target === 'focused') await fireEvent(toggle(), 'blur');
      expectToggleDrawnFrom(open, 'enabled');
      await view.unmount();
    }
  });

  test('FBM-3: precedence is pressed over focused over hovered, under the acme fixture system; focus that comes with a press does not select focused', async () => {
    const filled = acme.components.fabMenu.variants.filled;
    const expected = (name: InteractionState) => fill(filled[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    await mount({}, { theme: 'light', system: acme });
    const background = () => viewStyle(toggle()).backgroundColor;
    await fireEvent(toggle(), 'hoverIn');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(toggle(), 'focus');
    expect(background()).toBe(expected('focused'));
    await fireEvent(toggle(), 'pressIn');
    expect(background()).toBe(expected('pressed'));
    await fireEvent(toggle(), 'pressOut');
    await wait(HOLD + 30);
    expect(background()).toBe(expected('focused'));
    await fireEvent(toggle(), 'blur');
    await fireEvent(toggle(), 'hoverOut');
    await fireEvent(toggle(), 'pressIn');
    await fireEvent(toggle(), 'focus');
    await fireEvent(toggle(), 'pressOut');
    await wait(HOLD + 30);
    expect(background()).toBe(expected('enabled'));
  });

  test('FBM-4: keyboard focus shows the focus ring around the toggle\'s own shape and around an item\'s, without animation; focus that comes with a press does not', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ visible: true, inline: true });
    await wait(10);
    timing.mockClear();
    await fireEvent(toggle(), 'focus');
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(tpart('focus-ring')!)).toMatchObject({ top: -reach, borderRadius: Math.min(tokens.containerShapeOpen, medium.containerSize / 2) + reach });
    await fireEvent(item(1), 'focus');
    expect(viewStyle(ipart(1, 'focus-ring')!)).toMatchObject({ borderRadius: tokens.itemShape + reach });
    expect(timing.mock.calls.every(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
    await wait(tokens.motionStateDuration * 2);
    await fireEvent(item(0), 'pressIn');
    await fireEvent(item(0), 'focus');
    expect(ipart(0, 'focus-ring')).toBeNull();
    await fireEvent(item(0), 'pressOut');
    await wait(HOLD + tokens.motionStateDuration * 2);
  });

  test('FBM-5: a toggle smaller than the target extends its hit area to it on both axes; each item is at least the target tall and extends none', async () => {
    await mount({ size: 'small', visible: true, inline: true });
    const side = tokens.sizes.small.containerSize;
    const slop = Math.ceil((measure.target.touch - side) / 2);
    expect(toggle().props.hitSlop).toEqual({ top: slop, bottom: slop, left: slop, right: slop });
    expect(viewStyle(toggle())).toMatchObject({ width: side, height: side });
    expect(viewStyle(item(0)).minHeight).toBe(Math.max(tokens.itemHeight, measure.target.touch));
    expect(item(0).props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  test('FBM-7: an unknown variant or size renders as the default\'s tokens, and development builds report each once; a release build is silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const expected = await mount();
    const json = JSON.stringify(expected.toJSON());
    await expected.unmount();
    const view = await mount({ variant: 'glass' as never, size: 'huge' as never });
    expect(JSON.stringify(view.toJSON())).toBe(json);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('no FabMenu size "huge"; using "medium"'), expect.stringContaining('no FabMenu variant "glass"; using "filled"')]);
    await view.unmount();
    warn.mockClear();
    resetLookupReports();
    development(false);
    await mount({ variant: 'glass' as never });
    expect(warn).not.toHaveBeenCalled();
  });

  test('FBM-8: the pressed state appears at once and stays visible for duration.pressHold; a bare click shows it too', async () => {
    await mount();
    await fireEvent(toggle(), 'pressIn');
    expectToggleDrawnFrom(false, 'pressed');
    await fireEvent(toggle(), 'pressOut');
    await wait(HOLD / 2);
    expectToggleDrawnFrom(false, 'pressed');
    await wait(HOLD / 2 + 30);
    expectToggleDrawnFrom(false, 'enabled');
    await click(toggle());
    expectToggleDrawnFrom(false, 'pressed');
    await wait(HOLD + 30);
    expectToggleDrawnFrom(false, 'enabled');
  });

  test('FBM-9 overlay (the default) and ripple (m3-like): the pressed tokens at once / the pressed color grows from the point of contact — on the toggle and, in its own container, on an item', async () => {
    reduceMotion(false);
    const view = await mount();
    await fireEvent(toggle(), 'pressIn');
    expect(tpart('ripple')).toBeNull();
    expect(viewStyle(toggle()).backgroundColor).toBe(fill(tokens.variants.filled.pressed.containerColor));
    await fireEvent(toggle(), 'pressOut');
    await wait(HOLD + tokens.motionStateDuration * 2);
    await view.unmount();

    const m3 = m3Like.components.fabMenu;
    const timing = jest.spyOn(Animated, 'timing');
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 56, 56, 0, 0));
    await mount({ visible: true, inline: true }, { theme: 'light', system: m3Like });
    await fireEvent(toggle(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 56, height: 56 } } });
    timing.mockClear();
    await fireEvent(toggle(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 12 } });
    const reach = Math.hypot(56 - 10, 56 - 12);
    expect(viewStyle(tpart('ripple.wave')!)).toMatchObject({ left: 10 - reach, top: 12 - reach, backgroundColor: painted(m3.variants.filled.pressed.openContainerColor, 'light', m3Like) });
    expect(viewStyle(toggle()).backgroundColor).toBe(fill(m3.variants.filled.enabled.openContainerColor, 'light', m3Like));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: m3.motionFeedbackDuration, useNativeDriver: true });
    await fireEvent(toggle(), 'pressOut');
    await fireEvent(item(0), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 56, height: 56 } } });
    await fireEvent(item(0), 'pressIn', { nativeEvent: { pageX: 5, pageY: 5 } });
    expect(viewStyle(ipart(0, 'ripple.wave')!).backgroundColor).toBe(painted(m3.variants.filled.pressed.itemContainerColor, 'light', m3Like));
    expect(textStyle(ipart(0, 'label')!).color).toBe(painted(m3.variants.filled.pressed.itemLabelColor, 'light', m3Like));
    await fireEvent(item(0), 'pressOut');
    await wait(HOLD + m3.motionStateDuration * 2 + 50);
  });

  test('FBM-9 dim (cupertino): the pressed opacity on the whole toggle and no state layer; none: no answer at all, the toggle still asks', async () => {
    const cup = cupertino.components.fabMenu;
    const view = await mount({}, { theme: 'light', system: cupertino });
    await fireEvent(toggle(), 'pressIn');
    expect(cup.pressedOpacity).toBeLessThan(1);
    expect(viewStyle(toggle())).toMatchObject({ opacity: cup.pressedOpacity, backgroundColor: fill(cup.variants.filled.enabled.containerColor, 'light', cupertino) });
    await fireEvent(toggle(), 'pressOut');
    await wait(HOLD + 30);
    await view.unmount();

    const onToggle = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withVariant('filled', { pressed: { containerColor: literal(1, 2, 3), iconColor: literal(4, 5, 6) } }, withFabMenu({ pressedOpacity: 0.5 })));
    await mount({ onToggle }, { theme: 'light', system });
    await fireEvent(toggle(), 'pressIn');
    expectToggleDrawnFrom(false, 'enabled', { system });
    await fireEvent.press(toggle());
    expect(onToggle).toHaveBeenCalledWith(true);
    await fireEvent(toggle(), 'pressOut');
    await wait(HOLD + 30);
  });

  test('FBM-10: the toggle and the items ease their corners by the smoothing (cupertino: continuous); glow (acme) is one halo', async () => {
    const view = await mount({ visible: true, inline: true });
    expect(viewStyle(toggle()).borderCurve).toBeUndefined();
    await view.unmount();
    const second = await mount({ visible: true, inline: true }, { theme: 'light', system: cupertino });
    expect(viewStyle(toggle()).borderCurve).toBe('continuous');
    expect(viewStyle(item(0)).borderCurve).toBe('continuous');
    await second.unmount();
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(toggle(), 'focus');
    expect(viewStyle(tpart('focus-ring')!).boxShadow).toHaveLength(1);
  });

  test('FBM-11: a square of the size\'s container size with the size\'s corners while closed and container.shape-open while open; the icon slot\'s glyph while closed and the close glyph while open, at the icon size, unselected (acme)', async () => {
    const view = await mount({ size: 'large' }, { theme: 'light', system: acme });
    const large = acme.components.fabMenu.sizes.large;
    expect(viewStyle(toggle())).toMatchObject({ width: large.containerSize, height: large.containerSize, borderRadius: Math.min(large.containerShape, large.containerSize / 2) });
    expect(tpart('glyph')!.props.children).toBe('add');
    expect(tpart('close.glyph')).toBeNull();
    expect(textStyle(tpart('glyph')!)).toMatchObject({ fontSize: large.iconSize, fontFamily: iconFamily(acme.icon, false).families[0] });
    await view.rerender(element({ size: 'large', visible: true, inline: true }, { theme: 'light', system: acme }));
    expect(tpart('glyph')).toBeNull();
    expect(tpart('close.glyph')!.props.children).toBe('close');
    expect(viewStyle(toggle()).borderRadius).toBe(Math.min(acme.components.fabMenu.containerShapeOpen, large.containerSize / 2));
    expect(toggle().props.accessibilityState).toEqual({ disabled: false, expanded: true });
  });

  test('FBM-21: the toggle casts its elevation (closed and open parts) outside it, unclipped; a state change moves colors and elevation over comp.fab-menu.motion.state-*, a press at once; reduced motion at once', async () => {
    const view = await mount();
    const theme = createTanreiTheme(tanrei, 'light');
    expect(viewStyle(toggle()).boxShadow).toEqual(theme.elevation(tokens.variants.filled.enabled.containerElevation).boxShadow);
    expect(viewStyle(toggle()).overflow).toBeUndefined();
    await view.unmount();
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const second = await mount({}, { theme: 'light', system: withFabMenu({ motionStateDuration: 123 }) });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    await wait(10);
    timing.mockClear();
    await fireEvent(toggle(), 'hoverIn');
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: 123, useNativeDriver: false });
    await fireEvent(toggle(), 'hoverOut');
    await wait(300);
    timing.mockClear();
    await fireEvent(toggle(), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    await fireEvent(toggle(), 'pressOut');
    await wait(HOLD + 300);
    await second.unmount();
    reduceMotion(true);
    await mount();
    await wait(10);
    timing.mockClear();
    await fireEvent(toggle(), 'hoverIn');
    expect(timing).not.toHaveBeenCalled();
    expectToggleDrawnFrom(false, 'hovered');
  });
});

describe('the items (FBM-3, FBM-12 … FBM-20, FBM-22)', () => {
  test.each(ACTIVE)('FBM-3: an item %s is drawn from that state\'s item parts', async (target) => {
    await mount({ visible: true, inline: true });
    expectItemDrawnFrom(1, 'enabled');
    if (target === 'hovered') await fireEvent(item(1), 'hoverIn');
    if (target === 'focused') await fireEvent(item(1), 'focus');
    if (target === 'pressed') await fireEvent(item(1), 'pressIn');
    expectItemDrawnFrom(1, target);
    expectItemDrawnFrom(0, 'enabled');
    if (target === 'pressed') {
      await fireEvent(item(1), 'pressOut');
      await wait(HOLD + 30);
    }
  });

  test('FBM-12: the FAB menu never positions itself — the toggle lies at its own size where the layout puts it, and the items are drawn on the overlay layer, not in the layout', async () => {
    const spy = mockMeasure();
    try {
      await mount({ visible: true });
      expect(viewStyle(toggle())).toMatchObject({ alignSelf: 'flex-start', width: medium.containerSize, height: medium.containerSize });
      expect(viewStyle(toggle()).position).toBeUndefined();
      // The list is in the overlay layer, a sibling of the app's content.
      expect(screen.getByTestId('tanrei.overlay', { includeHiddenElements: true })).toBeTruthy();
      expect(toggle().children).not.toContain(list());
    } finally {
      spy.mockReset();
    }
  });

  test('FBM-13: open — a column above the toggle, list.offset from its top edge, list.gap apart, end edges aligned with the toggle\'s; focus moves to the first item (the last after Up Arrow); closed — removed, focus back to the toggle', async () => {
    const spy = mockMeasure();
    try {
      const focus = focusSpy();
      const view = await mount({ visible: true });
      expect(viewStyle(list()!)).toMatchObject({ position: 'absolute', bottom: 800 - TOGGLE.y + tokens.listOffset, right: 400 - (TOGGLE.x + TOGGLE.width), alignItems: 'flex-end', gap: tokens.listGap });
      expect(focused(focus)).toBe(`${ID}.item.0`);
      await fireEvent(item(0), 'focus');
      focus.mockClear();
      await view.rerender(element({ visible: false }));
      expect(list()).toBeNull();
      expect(focused(focus)).toBe(ID);
      // Up Arrow: the item nearest the toggle.
      const onToggle = jest.fn();
      await view.rerender(element({ visible: false, onToggle }));
      await key(toggle(), 'ArrowUp');
      await view.rerender(element({ visible: true, onToggle }));
      expect(focused(focus)).toBe(`${ID}.item.2`);
    } finally {
      spy.mockReset();
    }
  });

  test('FBM-14: while open it draws no scrim and makes nothing inert — the layer lets touches through except on its press-catcher, which is invisible and not an accessibility element', async () => {
    const spy = mockMeasure();
    try {
      await mount({ visible: true });
      const overlay = tpart('overlay')!;
      expect(overlay.props.pointerEvents).toBe('box-none');
      const outside = tpart('outside')!;
      expect(viewStyle(outside).backgroundColor).toBeUndefined();
      expect(outside.props.accessibilityElementsHidden).toBe(true);
      expect(toggle().props.focusable).toBe(true);
    } finally {
      spy.mockReset();
    }
  });

  test('FBM-15: Escape, back, a press outside, Tab and focus leaving the items and the toggle each ask to close once with their reason; a press on the toggle while open is a toggle to false', async () => {
    const spy = mockMeasure();
    let back: ((...args: never[]) => unknown) | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      back = handler;
      return { remove: jest.fn() };
    });
    try {
      const onDismiss = jest.fn();
      const onToggle = jest.fn();
      await mount({ visible: true, onDismiss, onToggle });
      await key(list()!, 'Escape');
      await act(async () => {
        expect(back!()).toBe(true);
      });
      await fireEvent(tpart('outside')!, 'press', { nativeEvent: { pageX: 20, pageY: 20 } });
      await fireEvent(tpart('outside')!, 'press', { nativeEvent: { pageX: TOGGLE.x + 10, pageY: TOGGLE.y + 10 } });
      await key(list()!, 'Tab');
      await fireEvent(item(0), 'focus');
      await fireEvent(item(0), 'blur');
      await wait(10);
      expect(onDismiss.mock.calls).toEqual([['escape'], ['back'], ['outside'], ['tab'], ['focus-out']]);
      expect(onToggle.mock.calls).toEqual([[false]]);
      // Focus moving from an item to the toggle is not leaving.
      onDismiss.mockClear();
      await fireEvent(item(1), 'focus');
      await act(async () => {
        fireEvent(item(1), 'blur');
        fireEvent(toggle(), 'focus');
      });
      await wait(10);
      expect(onDismiss).not.toHaveBeenCalled();
    } finally {
      spy.mockReset();
    }
  });

  test('FBM-16: activating an item emits its click once, then close with "item"', async () => {
    const spy = mockMeasure();
    try {
      const order: string[] = [];
      const items = ITEMS.map((each) => ({ ...each, onPress: () => order.push(`click:${each.label}`) }));
      await mount({ visible: true, items, onDismiss: (reason) => order.push(`close:${reason}`) });
      await fireEvent.press(item(1));
      expect(order).toEqual(['click:Folder', 'close:item']);
    } finally {
      spy.mockReset();
    }
  });

  test('FBM-17: Down and Up Arrow move through the items, wrapping; Home and End go to the first and last', async () => {
    const spy = mockMeasure();
    try {
      const focus = focusSpy();
      await mount({ visible: true });
      await key(list()!, 'ArrowDown');
      expect(focused(focus)).toBe(`${ID}.item.1`);
      await key(list()!, 'ArrowDown');
      await key(list()!, 'ArrowDown');
      expect(focused(focus)).toBe(`${ID}.item.0`);
      await key(list()!, 'ArrowUp');
      expect(focused(focus)).toBe(`${ID}.item.2`);
      await key(list()!, 'Home');
      expect(focused(focus)).toBe(`${ID}.item.0`);
      await key(list()!, 'End');
      expect(focused(focus)).toBe(`${ID}.item.2`);
    } finally {
      spy.mockReset();
    }
  });

  test('FBM-18: an item at least item.height tall and as wide as its content, corners item.shape, icon then label item.gap apart, its paddings, the label in item.label.typescale and never truncated, its item elevation', async () => {
    await mount({ visible: true, inline: true }, { theme: 'light', system: acme });
    const acmeTokens = acme.components.fabMenu;
    const theme = createTanreiTheme(acme, 'light');
    expect(viewStyle(item(0))).toMatchObject({ flexDirection: 'row', minHeight: Math.max(acmeTokens.itemHeight, acme.measure.target.touch), borderRadius: acmeTokens.itemShape, gap: acmeTokens.itemGap, paddingStart: acmeTokens.itemPaddingInlineStart, paddingEnd: acmeTokens.itemPaddingInlineEnd });
    expect(item(0).children.indexOf(ipart(0, 'icon')!)).toBeLessThan(item(0).children.indexOf(ipart(0, 'label')!));
    expect(viewStyle(ipart(0, 'icon')!).width).toBe(acmeTokens.itemIconSize);
    expect(textStyle(ipart(0, 'icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, false).families[0]);
    const text = theme.text(acmeTokens.itemLabelTypescale);
    expect(textStyle(ipart(0, 'label')!)).toMatchObject({ fontSize: text.fontSize, lineHeight: text.lineHeight });
    expect(ipart(0, 'label')!.props.numberOfLines).toBeUndefined();
    const elevation = theme.elevation(acmeTokens.variants.filled.enabled.itemContainerElevation);
    expect(viewStyle(item(0)).boxShadow).toEqual(elevation.boxShadow.length ? elevation.boxShadow : undefined);
    expect(viewStyle(item(0)).overflow).toBeUndefined();
  });

  test('FBM-19: opening turns the toggle over the open motion and grows each item in from its end edge, the nearest first, each next one motion.stagger later; closing fades them all out together over the close motion; reduced motion at once', async () => {
    const spy = mockMeasure();
    try {
      reduceMotion(false);
      const timing = jest.spyOn(Animated, 'timing');
      const view = await mount({});
      await wait(10);
      timing.mockClear();
      await view.rerender(element({ visible: true }));
      const opens = timing.mock.calls.filter(([, config]) => config.duration === tokens.motionOpenDuration);
      // Three items (delays 200, 100, 0) and the toggle's look and turn.
      expect(opens.map(([, config]) => config.delay ?? 0).sort()).toEqual(expect.arrayContaining([0, tokens.motionStagger, tokens.motionStagger * 2]));
      expect(viewStyle(screen.getByTestId(`${ID}.item.2.entrance`, { includeHiddenElements: true })).transformOrigin).toBe('right');
      // While it turns, both glyphs are drawn (cross-fade).
      expect(tpart('glyph')).not.toBeNull();
      expect(tpart('close.glyph')).not.toBeNull();
      await wait(tokens.motionOpenDuration + tokens.motionStagger * 2 + 150);
      expect(screen.queryByTestId(`${ID}.item.0.entrance`, { includeHiddenElements: true })).toBeNull();
      timing.mockClear();
      await view.rerender(element({ visible: false }));
      const closes = timing.mock.calls.filter(([, config]) => config.duration === tokens.motionCloseDuration);
      expect(closes.length).toBeGreaterThanOrEqual(3);
      expect(closes.every(([, config]) => !config.delay)).toBe(true);
      expect(list()).not.toBeNull();
      await wait(tokens.motionCloseDuration + 150);
      expect(list()).toBeNull();
      await view.unmount();
      reduceMotion(true);
      const reduced = await mount({});
      await wait(10);
      timing.mockClear();
      await reduced.rerender(element({ visible: true }));
      expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionOpenDuration)).toHaveLength(0);
      expect(tpart('glyph')).toBeNull();
    } finally {
      spy.mockReset();
    }
  });

  test('FBM-13\'s verify: in place (inline) the items stand above the toggle, list.offset from it, and the toggle under their end edges', async () => {
    await mount({ visible: true, inline: true });
    const stage = tpart('stage')!;
    expect(viewStyle(stage).alignItems).toBe('flex-end');
    expect(viewStyle(toggle()).alignSelf).toBe('flex-end');
    expect(viewStyle(list()!.parent as ReturnType<typeof screen.getByTestId>).marginBottom).toBe(tokens.listOffset);
  });

  test('FBM-20: the toggle is a button named by label with its expanded state; the items a menu named by label, each a menu item named by its label with its position; the icons hidden', async () => {
    await mount({ visible: true, inline: true, positionText: (position, count) => `${count} 件中 ${position} 件目` });
    expect(toggle().props).toMatchObject({ accessibilityRole: 'button', accessibilityLabel: 'Create', accessibilityState: { disabled: false, expanded: true } });
    expect(list()!.props).toMatchObject({ role: 'menu', accessibilityLabel: 'Create' });
    expect([0, 1, 2].map((i) => item(i).props.role)).toEqual(['menuitem', 'menuitem', 'menuitem']);
    expect([0, 1, 2].map((i) => item(i).props.accessibilityLabel)).toEqual(['Document', 'Folder', 'Upload']);
    expect(item(2).props.accessibilityValue).toEqual({ text: '3 件中 3 件目' });
    expect(ipart(0, 'icon')!.props.accessibilityElementsHidden).toBe(true);
    expect(tpart('icon')!.props.accessibilityElementsHidden).toBe(true);
  });

  test('FBM-22: right-to-left — the items\' end edges on the toggle\'s left edge, their contents mirrored with logical paddings; a ripple grows from the point of contact', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    const spy = mockMeasure();
    try {
      await mount({ visible: true });
      expect(viewStyle(list()!)).toMatchObject({ left: TOGGLE.x });
      expect(viewStyle(list()!).right).toBeUndefined();
      expect(viewStyle(item(0)).paddingLeft).toBeUndefined();
      expect(viewStyle(item(0)).flexDirection).toBe('row');
    } finally {
      spy.mockReset();
    }
    reduceMotion(false);
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 56, 56, 0, 0));
    await mount({}, { theme: 'light', system: m3Like });
    await fireEvent(toggle(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 56, height: 56 } } });
    await fireEvent(toggle(), 'pressIn', { nativeEvent: { pageX: 40, pageY: 10 } });
    const reach = Math.hypot(40, 56 - 10);
    expect(viewStyle(tpart('ripple.wave')!)).toMatchObject({ left: 40 - reach, top: 10 - reach });
    await fireEvent(toggle(), 'pressOut');
    await wait(HOLD + 400);
  });

  test('FBM-23: an empty label, an item without a label or an icon, and fewer than two or more than six items still render and are reported in development builds; release builds are silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ accessibilityLabel: '', items: [{ label: '', icon: '' }] });
    expect(toggle()).toBeTruthy();
    expect(reportsOf(warn)).toEqual([
      expect.stringContaining('a FabMenu (testID "fab") has no accessibilityLabel'),
      expect.stringContaining('holds 1 items; a FAB menu holds two to six'),
      expect.stringContaining('item 1 of a FabMenu (testID "fab") has no label'),
      expect.stringContaining('item 1 of a FabMenu (testID "fab") has no icon'),
    ]);
    await view.unmount();
    warn.mockClear();
    await mount({ items: Array.from({ length: 7 }, (_, i) => ({ label: `L${i}`, icon: 'add' })) });
    expect(reportsOf(warn)).toEqual([expect.stringContaining('holds 7 items')]);
    warn.mockClear();
    development(false);
    await mount({ accessibilityLabel: '', items: [] });
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
    test.each(['filled', 'tonal', 'surface'] as const)('%s: the toggle (closed and open) and the items resolve their parts in this scheme, at rest and hovered', async (variant) => {
      const closed = await mount({ variant, inline: true }, provider);
      expectToggleDrawnFrom(false, 'enabled', { scheme, variant });
      await closed.unmount();
      await mount({ variant, visible: true, inline: true }, provider);
      expectToggleDrawnFrom(true, 'enabled', { scheme, variant });
      expectItemDrawnFrom(0, 'enabled', { scheme, variant });
      await fireEvent(item(0), 'hoverIn');
      expectItemDrawnFrom(0, 'hovered', { scheme, variant });
    });
  });

  test('the default values: toggles 40 / 48 / 64 at the FAB\'s corners; items 48 tall at corner.large; the open toggle takes the variant\'s other look; a 100 ms stagger', () => {
    expect(Object.values(tokens.sizes).map((each) => each.containerSize)).toEqual([40, 48, 64]);
    expect(Object.values(tokens.sizes).map((each) => each.containerShape)).toEqual(Object.values(tanrei.components.fab.sizes).map((each) => each.containerShape));
    expect(tokens).toMatchObject({ itemHeight: 48, itemShape: tanrei.shape.large, motionStagger: tanrei.motion.duration.stagger });
    expect(tanrei.motion.duration.stagger).toBe(100);
    for (const variant of ['filled', 'tonal', 'surface'] as const) {
      const resting = tokens.variants[variant].enabled;
      expect(painted(resting.openContainerColor)).not.toBe(painted(resting.containerColor));
    }
  });
});

describe('fixtures', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  describeFixtureBaselines(fabMenuSubject);
});
