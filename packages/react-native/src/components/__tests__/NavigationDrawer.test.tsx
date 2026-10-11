// NavigationDrawer — behaviour, accessibility, layout, the modal presentation, token binding and fixture baselines.
// Cases come from specs/navigation-drawer.spec.json; every behaviour id is cited by the test that covers it.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, I18nManager, PanResponder, View, type PanResponderCallbacks } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiNavigationDrawerConditionStateTokens, TanreiNavigationDrawerTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { iconFamily } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { IconButton } from '../IconButton';
import { NavigationDrawer, type NavigationDrawerItem, type NavigationDrawerProps } from '../NavigationDrawer';
import { acme } from './__fixtures__/acme';
import { navigationDrawerSubject } from './NavigationDrawer.subject';

const spec = loadSpec('navigation-drawer');
const tokens: TanreiNavigationDrawerTokens = tanrei.components.navigationDrawer;
const ID = 'drawer';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const fillColor = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const withDrawer = (overrides: Partial<TanreiNavigationDrawerTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'navigationDrawer', overrides);
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
const HOLD = tanrei.motion.duration.pressHold;
const ACTIVE = ['hovered', 'focused', 'pressed'] as const;

const MAIL: NavigationDrawerItem[] = [
  {
    heading: 'Mail',
    items: [
      { value: 'inbox', label: 'Inbox', icon: 'inbox', badge: '24' },
      { value: 'sent', label: 'Sent', icon: 'send' },
      { value: 'drafts', label: 'Drafts', icon: 'draft' },
    ],
  },
  { heading: 'Labels', divider: true, items: [{ value: 'family', label: 'Family', icon: 'label' }, { value: 'work', label: 'Work', icon: 'label', badge: 'New' }] },
];

function element(props: Partial<NavigationDrawerProps> = {}) {
  return <NavigationDrawer testID={ID} accessibilityLabel="Mail" open value="inbox" items={MAIL} {...props} />;
}
function mount(props: Partial<NavigationDrawerProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(<TanreiProvider {...provider}>{element(props)}</TanreiProvider>);
}
const rerender = (view: Awaited<ReturnType<typeof mount>>, props: Partial<NavigationDrawerProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) => view.rerender(<TanreiProvider {...provider}>{element(props)}</TanreiProvider>);

const row = (i: number) => screen.getByTestId(`${ID}.destination.${i}`, { includeHiddenElements: true });
const rowPart = (i: number, name: string) => screen.queryByTestId(`${ID}.destination.${i}.${name}`, { includeHiddenElements: true });
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const release = async (i: number) => {
  await fireEvent(row(i), 'pressOut');
  await wait(HOLD + 30);
};
const enter = async (i: number, target: InteractionState) => {
  if (target === 'hovered') await fireEvent(row(i), 'hoverIn');
  if (target === 'focused') await fireEvent(row(i), 'focus');
  if (target === 'pressed') await fireEvent(row(i), 'pressIn');
};
function expectRowDrawnFrom(i: number, selected: boolean, in_: InteractionState, system: TanreiSystem = tanrei, scheme: TanreiScheme = 'light') {
  const from = system.components.navigationDrawer;
  const paints: TanreiNavigationDrawerConditionStateTokens = from.conditions[selected ? 'selected' : 'unselected'][in_];
  const style = viewStyle(row(i));
  expect(style.backgroundColor).toBe(fillColor(paints.itemContainerColor, scheme, system));
  expect(style.opacity).toBe({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity }[in_]);
  expect(textStyle(rowPart(i, 'label')!).color).toBe(painted(paints.itemLabelColor, scheme, system));
  if (rowPart(i, 'icon')) expect(textStyle(rowPart(i, 'icon.glyph')!).color).toBe(painted(paints.itemIconColor, scheme, system));
  if (rowPart(i, 'badge')) expect(textStyle(rowPart(i, 'badge')!).color).toBe(painted(paints.itemBadgeColor, scheme, system));
}
const focusSpy = () => jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
const focusedRow = (spy: jest.SpyInstance) => (spy.mock.contexts.at(-1) as { props?: { testID?: string } } | undefined)?.props?.testID;

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // The baselines at the tokens' own sizes (the Jest preset's window has fontScale 2); a 400 × 800 window.
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
  test('the React Native mapping in the spec matches this implementation: NavigationDrawer, its destinations and sections', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(NavigationDrawer.name);
    expect(platform.props).toEqual({ variant: 'variant', open: 'open', value: 'value', label: 'accessibilityLabel' });
    expect(platform.events).toEqual({ change: 'onValueChange', reselect: 'onReselect', close: 'onClose' });
    expect(platform.items?.destination).toMatchObject({ name: 'NavigationDrawerDestination', props: { value: 'value', label: 'label', icon: 'icon', disabled: 'disabled', badge: 'badge' } });
    expect(platform.items?.section).toMatchObject({ name: 'NavigationDrawerSection', props: { heading: 'heading', divider: 'divider' } });
  });

  test('the variant is the token axis (standard, the default, and modal); the conditions are unselected and selected', () => {
    expect(Object.keys(tokens.variants)).toEqual(['standard', 'modal']);
    expect(Object.keys(tokens.conditions)).toEqual(['unselected', 'selected']);
  });
});

describe('activation (NVD-1, NVD-2, NVD-21)', () => {
  test('NVD-1: activating a destination that is not selected — by touch, or a bare click (Enter, Space) — emits change once with its value; the selected one emits reselect once; a standard drawer never closes', async () => {
    const onValueChange = jest.fn();
    const onReselect = jest.fn();
    const onClose = jest.fn();
    await mount({ onValueChange, onReselect, onClose });
    await fireEvent.press(row(1));
    await fireEvent(row(3), 'press', { nativeEvent: { target: 1 } });
    await fireEvent.press(row(0));
    expect(onValueChange.mock.calls).toEqual([['sent'], ['family']]);
    expect(onReselect.mock.calls).toEqual([['inbox']]);
    expect(onClose).not.toHaveBeenCalled();
    await release(0);
  });

  test('NVD-2: a disabled destination emits neither, is not focusable, and is exposed as disabled', async () => {
    const onValueChange = jest.fn();
    await mount({ items: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B', disabled: true }], value: 'a', onValueChange });
    await fireEvent.press(row(1));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(row(1).props).toMatchObject({ focusable: false, accessibilityState: { disabled: true, selected: false } });
  });

  test('NVD-21: in a modal drawer an activation emits change (or reselect) and then close, once', async () => {
    const calls: string[] = [];
    await mount({ variant: 'modal', onValueChange: (value) => calls.push(`change:${value}`), onReselect: (value) => calls.push(`reselect:${value}`), onClose: () => calls.push('close') });
    await fireEvent.press(row(2));
    expect(calls).toEqual(['change:drafts', 'close']);
    await fireEvent.press(row(0));
    expect(calls).toEqual(['change:drafts', 'close', 'reselect:inbox']);
    await release(0);
  });
});

describe('looks and states (NVD-3 … NVD-10)', () => {
  test.each(['light', 'dark'] as const)('NVD-3: the selected destination — wherever it stands, in a section or not — is drawn from the selected parts (container, icon, label, badge), every other from the unselected parts (%s)', async (theme) => {
    await mount({}, { theme });
    expectRowDrawnFrom(0, true, 'enabled', tanrei, theme);
    expectRowDrawnFrom(1, false, 'enabled', tanrei, theme);
    expect(row(0).props.accessibilityState.selected).toBe(true);
  });

  test('NVD-3: a value no destination has selects none, and development builds report it; release builds are silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ value: 'spam' });
    for (const i of [0, 1, 2, 3, 4]) expectRowDrawnFrom(i, false, 'enabled');
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('has the value "spam", which no destination has')]);
    await view.unmount();
    warn.mockClear();
    development(false);
    await mount({ value: 'spam' });
    expect(warn).not.toHaveBeenCalled();
  });

  describe.each([
    ['unselected', 1, false],
    ['selected', 0, true],
  ] as const)('NVD-4: a %s destination', (_name, i, selected) => {
    test.each(ACTIVE)('%s: its item container, icon, label, badge and opacity come from that state\'s tokens of its condition, and it returns to rest', async (target) => {
      await mount();
      await enter(i, target);
      expectRowDrawnFrom(i, selected, target);
      if (target === 'hovered') await fireEvent(row(i), 'hoverOut');
      if (target === 'focused') await fireEvent(row(i), 'blur');
      if (target === 'pressed') await release(i);
      expectRowDrawnFrom(i, selected, 'enabled');
    });
  });

  test('NVD-4: precedence is pressed over focused over hovered, under the acme fixture system; focus that comes with a press does not select focused', async () => {
    const unselected = acme.components.navigationDrawer.conditions.unselected;
    const expected = (name: InteractionState) => fillColor(unselected[name].itemContainerColor, 'light', acme);
    expect(new Set((['hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(3);
    await mount({}, { theme: 'light', system: acme });
    const background = () => viewStyle(row(1)).backgroundColor;
    await fireEvent(row(1), 'hoverIn');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(row(1), 'focus');
    expect(background()).toBe(expected('focused'));
    await fireEvent(row(1), 'pressIn');
    expect(background()).toBe(expected('pressed'));
    await release(1);
    expect(background()).toBe(expected('focused'));
    await fireEvent(row(1), 'blur');
    await fireEvent(row(1), 'hoverOut');
    await fireEvent(row(2), 'pressIn');
    await fireEvent(row(2), 'focus');
    await release(2);
    expect(viewStyle(row(2)).backgroundColor).toBe(expected('enabled'));
  });

  test('NVD-4: in the default system a state mixes the condition\'s state-layer color (its label color) into the row', async () => {
    for (const condition of ['unselected', 'selected'] as const) expect(tokens.conditions[condition].enabled.itemStateLayerColor).toEqual(tokens.conditions[condition].enabled.itemLabelColor);
    await mount();
    await fireEvent(row(1), 'focus');
    const resting = tokens.conditions.unselected.enabled;
    expect(viewStyle(row(1)).backgroundColor).toBe(painted({ kind: 'mix', base: resting.itemContainerColor, with: resting.itemStateLayerColor, amount: tanrei.state.focusStateLayerOpacity }));
  });

  test('NVD-5: keyboard focus shows the focus ring inside the item container, without animation; focus that comes with a press does not', async () => {
    await mount();
    await fireEvent(row(1), 'focus');
    const ring = rowPart(1, 'focus-ring')!;
    expect(viewStyle(ring)).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: tanrei.measure.focus.outerWidth, borderRadius: tokens.itemContainerShape });
    await fireEvent(row(1), 'blur');
    await fireEvent(row(2), 'pressIn');
    await fireEvent(row(2), 'focus');
    expect(rowPart(2, 'focus-ring')).toBeNull();
    await release(2);
  });

  test('NVD-6: the hit area is the item container with half of container.gap above and below it, never less than sys.target.touch high; the drawn row does not change', async () => {
    const view = await mount();
    const reach = Math.max(tokens.containerGap / 2, (tanrei.measure.target.touch - tokens.itemContainerHeight) / 2);
    expect(row(1).props.hitSlop).toEqual({ top: reach, bottom: reach, left: 0, right: 0 });
    expect(tokens.itemContainerHeight + 2 * reach).toBe(tanrei.measure.target.touch);
    await view.unmount();
    // A system whose rows and gap give less: the hit area still reaches the touch target.
    await mount({}, { theme: 'light', system: withDrawer({ itemContainerHeight: 36, containerGap: 2 }) });
    expect(row(1).props.hitSlop).toEqual({ top: 6, bottom: 6, left: 0, right: 0 });
    expect(viewStyle(row(1)).minHeight).toBe(36);
  });

  test('NVD-7: a disabled destination is drawn from its condition\'s disabled tokens — a selected one keeps its indicator', async () => {
    await mount({ items: [{ value: 'a', label: 'A', icon: 'inbox', badge: '3', disabled: true }, { value: 'b', label: 'B', icon: 'send', disabled: true }], value: 'a' });
    expectRowDrawnFrom(0, true, 'disabled');
    expect(viewStyle(row(0)).backgroundColor).toBeDefined();
    expectRowDrawnFrom(1, false, 'disabled');
    expect(rowPart(0, 'badge')).not.toBeNull();
  });

  test('NVD-8: the pressed state appears at once and stays visible for duration.pressHold; a bare click shows it too', async () => {
    await mount();
    await fireEvent(row(1), 'pressIn');
    expectRowDrawnFrom(1, false, 'pressed');
    await fireEvent(row(1), 'pressOut');
    await wait(HOLD / 2);
    expectRowDrawnFrom(1, false, 'pressed');
    await wait(HOLD / 2 + 30);
    expectRowDrawnFrom(1, false, 'enabled');
    await fireEvent(row(2), 'press', { nativeEvent: { target: 1 } });
    expectRowDrawnFrom(2, false, 'pressed');
    await wait(HOLD + 30);
  });

  test('NVD-9: overlay (the default) — the pressed tokens at once; ripple (m3-like) — the pressed color grows from the point of contact over the feedback duration while the row keeps the state under the press', async () => {
    reduceMotion(false);
    const view = await mount();
    await fireEvent(row(1), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(rowPart(1, 'ripple')).toBeNull();
    await release(1);
    await view.unmount();

    const drawer = m3Like.components.navigationDrawer;
    const timing = jest.spyOn(Animated, 'timing');
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 336, 56, 0, 0));
    await mount({}, { theme: 'light', system: m3Like });
    await fireEvent(row(1), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 336, height: 56 } } });
    timing.mockClear();
    await fireEvent(row(1), 'pressIn', { nativeEvent: { pageX: 30, pageY: 20 } });
    const reach = Math.hypot(336 - 30, 56 - 20);
    expect(viewStyle(rowPart(1, 'ripple.wave')!)).toMatchObject({ left: 30 - reach, top: 20 - reach, backgroundColor: painted(drawer.conditions.unselected.pressed.itemContainerColor, 'light', m3Like) });
    expect(viewStyle(row(1)).backgroundColor).toBe(fillColor(drawer.conditions.unselected.enabled.itemContainerColor, 'light', m3Like));
    expect(textStyle(rowPart(1, 'label')!).color).toBe(painted(drawer.conditions.unselected.pressed.itemLabelColor, 'light', m3Like));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: drawer.motionFeedbackDuration, useNativeDriver: true });
    await release(1);
    await wait(drawer.motionStateDuration * 2 + 50);
  });

  test('NVD-9: dim (cupertino) — the pressed opacity on the whole row and no state layer; none — no answer at all, the activation still happens', async () => {
    const drawer = cupertino.components.navigationDrawer;
    const view = await mount({}, { theme: 'light', system: cupertino });
    await fireEvent(row(1), 'pressIn');
    expect(viewStyle(row(1))).toMatchObject({ opacity: drawer.pressedOpacity, backgroundColor: fillColor(drawer.conditions.unselected.enabled.itemContainerColor, 'light', cupertino) });
    await release(1);
    await view.unmount();
    const onValueChange = jest.fn();
    const conditions = tokens.conditions;
    const system = withBehavior({ pressedFeedback: 'none' }, withDrawer({ pressedOpacity: 0.5, conditions: { ...conditions, unselected: { ...conditions.unselected, pressed: { ...conditions.unselected.pressed, itemContainerColor: literal(1, 2, 3) } } } }));
    await mount({ onValueChange }, { theme: 'light', system });
    await fireEvent(row(1), 'pressIn');
    expectRowDrawnFrom(1, false, 'enabled', system);
    await fireEvent.press(row(1));
    expect(onValueChange).toHaveBeenCalledWith('sent');
    await release(1);
  });

  test('NVD-10: rows and a modal drawer\'s end corners ease by the smoothing (cupertino: continuous); glow (acme) is one halo', async () => {
    const view = await mount({}, { theme: 'light', system: cupertino });
    expect(viewStyle(row(0))).toMatchObject({ borderRadius: cupertino.components.navigationDrawer.itemContainerShape, borderCurve: 'continuous' });
    await view.unmount();
    const second = await mount({ variant: 'modal' }, { theme: 'light', system: cupertino });
    expect(viewStyle(part('panel')!).borderCurve).toBe('continuous');
    await second.unmount();
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(row(1), 'focus');
    expect(viewStyle(rowPart(1, 'focus-ring')!).boxShadow).toHaveLength(1);
  });
});

describe('layout (NVD-11 … NVD-17, NVD-25, NVD-27)', () => {
  test.each(['light', 'dark'] as const)('NVD-11: standard — container.width wide, the parent\'s full height, container.color.standard at elevation.standard, square corners, its end edge outline.width of outline.color.standard (%s)', async (theme) => {
    const standard = tokens.variants.standard;
    await mount({}, { theme });
    expect(viewStyle(screen.getByTestId(ID))).toMatchObject({ alignSelf: 'stretch', width: tokens.containerWidth });
    expect(viewStyle(part('panel')!)).toMatchObject({ width: tokens.containerWidth, flex: 1, borderTopEndRadius: standard.containerShape, borderBottomEndRadius: standard.containerShape, backgroundColor: painted(standard.containerColor, theme) });
    expect(viewStyle(part('panel')!).boxShadow).toBeUndefined();
    expect(viewStyle(part('outline')!)).toMatchObject({ position: 'absolute', top: 0, bottom: 0, end: 0, width: tokens.outlineWidth, backgroundColor: painted(standard.outlineColor, theme) });
  });

  test.each(['light', 'dark'] as const)('NVD-11: modal — container.color.modal at elevation.modal (its shadow and the default level\'s hairline ring, following the corners), end corners container.shape.modal and square start corners, no edge (%s)', async (theme) => {
    const modal = tokens.variants.modal;
    await mount({ variant: 'modal' }, { theme });
    const level = createTanreiTheme(tanrei, theme).elevation(modal.containerElevation);
    expect(viewStyle(part('panel')!)).toMatchObject({ borderTopEndRadius: modal.containerShape, borderBottomEndRadius: modal.containerShape, backgroundColor: painted(modal.containerColor, theme), boxShadow: level.boxShadow });
    expect(viewStyle(part('panel')!)).not.toHaveProperty('borderTopStartRadius');
    expect(viewStyle(part('elevation-ring')!)).toMatchObject({ borderTopStartRadius: 0, borderBottomStartRadius: 0, borderTopEndRadius: modal.containerShape + level.ring!.width, borderColor: level.ring!.color });
    expect(part('outline')).toBeNull();
  });

  test('NVD-11: right-to-left — at the right edge, mirrored: the edge, the corners and the padding are logical (React Native mirrors them), and a modal drawer slides in from the right', async () => {
    reduceMotion(false);
    const translate = () => (viewStyle(part('panel')!).transform as { translateX: number }[])[0]!.translateX;
    const ltr = await mount({ variant: 'modal', open: false });
    await wait(10);
    await rerender(ltr, { variant: 'modal', open: true });
    expect(translate()).toBeLessThan(0);
    await ltr.unmount();
    const rtl = jest.replaceProperty(I18nManager, 'isRTL', true);
    const view = await mount({ variant: 'modal', open: false });
    await wait(10);
    await rerender(view, { variant: 'modal', open: true });
    expect(translate()).toBeGreaterThan(0);
    const panel = viewStyle(part('panel')!);
    expect(panel).toHaveProperty('borderTopEndRadius');
    expect(panel).toHaveProperty('paddingStart');
    expect(panel).not.toHaveProperty('borderTopRightRadius');
    expect(panel).toMatchObject({ start: 0 });
    rtl.restore();
    await wait(tokens.motionEnterDuration + 100);
  });

  test('NVD-12: container.padding-inline from its start and end and container.padding-block from its top and bottom, the header then the items in reading order container.gap apart, scrolling together', async () => {
    await mount({ header: <IconButton accessibilityLabel="Close" testID="close">close</IconButton> });
    const scroll = part('scroll')!;
    expect(scroll.props.contentContainerStyle).toEqual({ paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline, paddingVertical: tokens.containerPaddingBlock, gap: tokens.containerGap });
    const content = (scroll.children[0] as Instance).children as Instance[];
    expect(content.map((child) => child.props.testID)).toEqual([`${ID}.header`, `${ID}.section.0`, `${ID}.section.1`]);
    expect(viewStyle(part('section.0')!).gap).toBe(tokens.containerGap);
    expect(screen.getAllByRole(/button/).map((each) => each.props.accessibilityLabel)).toEqual(['Close', 'Inbox', 'Sent', 'Drafts', 'Family', 'Work']);
  });

  test('NVD-13: a row across the inner width, at least item.container.height, item.container.shape corners, item.padding-inline and item.gap: the icon, the label (wrapping) in item.label.typescale, the badge at the end in item.badge.typescale; without an icon, none', async () => {
    await mount({ items: [...MAIL, { value: 'plain', label: 'Plain' }] });
    expect(viewStyle(row(0))).toMatchObject({ flexDirection: 'row', alignItems: 'center', minHeight: tokens.itemContainerHeight, borderRadius: tokens.itemContainerShape, paddingStart: tokens.itemPaddingInline, paddingEnd: tokens.itemPaddingInline, gap: tokens.itemGap });
    const theme = createTanreiTheme(tanrei, 'light');
    expect(textStyle(rowPart(0, 'label')!)).toMatchObject(theme.text(tokens.itemLabelTypescale));
    expect(rowPart(0, 'label')!.props.numberOfLines).toBeUndefined();
    expect(textStyle(rowPart(0, 'badge')!)).toMatchObject(theme.text(tokens.itemBadgeTypescale));
    // In reading order (a row, mirrored in right-to-left): the icon, the label taking the rest, the badge.
    const order = (row(0).children as Instance[]).map((child) => child.props.testID ?? (child.children[0] as Instance | undefined)?.props?.testID);
    expect(order.slice(0, 3)).toEqual([`${ID}.destination.0.icon`, `${ID}.destination.0.label`, `${ID}.destination.0.badge`]);
    expect(rowPart(5, 'icon')).toBeNull();
  });

  test('NVD-14: each icon at item.icon.size in the family and fill of its condition (acme: a family per selection state)', async () => {
    const drawer = acme.components.navigationDrawer;
    await mount({}, { theme: 'light', system: acme });
    expect(viewStyle(rowPart(0, 'icon')!)).toMatchObject({ width: drawer.itemIconSize, height: drawer.itemIconSize });
    expect(textStyle(rowPart(0, 'icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, true).families[0]);
    expect(textStyle(rowPart(1, 'icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, false).families[0]);
    expect(rowPart(0, 'icon')!.props.accessibilityElementsHidden).toBe(true);
  });

  test('NVD-15: the badge is part of the destination\'s description, after its name, state and position, and stays while disabled', async () => {
    await mount({ items: [{ value: 'a', label: 'Inbox', badge: '24' }, { value: 'b', label: 'Work', badge: 'New', disabled: true }, { value: 'c', label: 'Trash' }], value: 'a' });
    expect([0, 1, 2].map((i) => row(i).props.accessibilityValue.text)).toEqual(['1 of 3, 24', '2 of 3, New', '3 of 3']);
    expect(rowPart(1, 'badge')).not.toBeNull();
  });

  test('NVD-16: a heading in heading.typescale and heading.color, in a row at least heading.height high, centred, starting where the destinations\' content starts; a heading that takes no focus; an empty heading draws no row', async () => {
    await mount({ items: [...MAIL, { heading: '', items: [{ value: 'x', label: 'X' }] }] });
    const heading = part('section.0.heading')!;
    expect(viewStyle(heading)).toEqual({ minHeight: tokens.headingHeight, justifyContent: 'center', paddingStart: tokens.itemPaddingInline, paddingEnd: tokens.itemPaddingInline });
    const text = part('section.0.heading.text')!;
    expect(textStyle(text)).toMatchObject({ ...createTanreiTheme(tanrei, 'light').text(tokens.headingTypescale), color: painted(tokens.headingColor) });
    expect(text.props.role).toBe('heading');
    expect(text.props.focusable).toBeUndefined();
    expect(part('section.2.heading')).toBeNull();
  });

  test('NVD-17: a divider (the divider component) before a section whose divider is true; a section inside a section is drawn as its destinations in its place, reported in development builds', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ items: [...MAIL, { heading: 'Outer', items: [{ value: 'o', label: 'O' }, { heading: 'Inner', divider: true, items: [{ value: 'i', label: 'I' }] }] }] });
    expect(part('section.0.divider')).toBeNull();
    expect(part('section.1.divider')).not.toBeNull();
    expect(viewStyle(part('section.1.divider')!)).toMatchObject({ alignSelf: 'stretch', height: tanrei.components.divider.lineThickness });
    expect(row(6).props.accessibilityLabel).toBe('I');
    expect(screen.queryByText('Inner')).toBeNull();
    expect(warn.mock.calls.map(([message]) => String(message))).toContainEqual(expect.stringContaining('sections do not nest'));
  });

  test('NVD-25: the drawer reaches under the provider\'s start, top and bottom insets and keeps its content inside them', async () => {
    await mount({ variant: 'modal' }, { theme: 'light', insets: { top: 47, bottom: 34, left: 20, right: 12 } });
    expect(viewStyle(part('panel')!)).toMatchObject({ width: tokens.containerWidth + 20, paddingStart: 20, paddingTop: 47, paddingBottom: 34, backgroundColor: painted(tokens.variants.modal.containerColor) });
  });

  test('NVD-27: enlarged text keeps the width and grows each destination and heading (heights are minimums); labels wrap; icons do not scale', async () => {
    await mount();
    expect(viewStyle(part('panel')!).width).toBe(tokens.containerWidth);
    expect(viewStyle(row(0))).not.toHaveProperty('height');
    expect(viewStyle(part('section.0.heading')!)).not.toHaveProperty('height');
    expect(rowPart(0, 'label')!.props.allowFontScaling).toBe(true);
    expect(rowPart(0, 'icon.glyph')!.props.allowFontScaling).toBe(false);
  });
});

describe('standard: a layout region (NVD-18, NVD-28)', () => {
  test('NVD-18: open, it takes its width in the layout; closed, no width and no presence to assistive technology or focus; no scrim, no Modal, and it never asks to close', async () => {
    const onClose = jest.fn();
    const view = await mount({ onClose });
    expect(viewStyle(screen.getByTestId(ID)).width).toBe(tokens.containerWidth);
    expect(part('scrim')).toBeNull();
    expect(part('modal')).toBeNull();
    await rerender(view, { onClose, open: false });
    expect(screen.queryByTestId(ID, { includeHiddenElements: true })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('NVD-18: WHEN open changes it slides while the content beside it resizes — its width over the enter motion when opening and the exit motion when closing; at once where motion is reduced', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const view = await mount({ open: false });
    await wait(10);
    await rerender(view, { open: true });
    const enter = timing.mock.calls.find(([, config]) => config.duration === tokens.motionEnterDuration);
    expect(enter?.[1]).toMatchObject({ toValue: 1, useNativeDriver: false });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionEnterEasing);
    expect(viewStyle(screen.getByTestId(ID)).overflow).toBe('hidden');
    expect(viewStyle(part('panel')!)).toMatchObject({ position: 'absolute', end: 0, width: tokens.containerWidth });
    await wait(tokens.motionEnterDuration + 100);
    expect(viewStyle(screen.getByTestId(ID))).toMatchObject({ width: tokens.containerWidth });
    await rerender(view, { open: false });
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionExitDuration)?.[1]).toMatchObject({ toValue: 0 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionExitEasing);
    expect(screen.getByTestId(ID)).toBeTruthy();
    await wait(tokens.motionExitDuration + 100);
    expect(screen.queryByTestId(ID)).toBeNull();
    await view.unmount();
    reduceMotion(true);
    timing.mockClear();
    const reduced = await mount({ open: false });
    await rerender(reduced, { open: true });
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionEnterDuration)).toHaveLength(0);
    expect(viewStyle(screen.getByTestId(ID)).width).toBe(tokens.containerWidth);
  });

  test('NVD-28: WHEN a standard drawer opens, focus moves to the selected destination (else the first enabled one), keyboard and screen reader; Tab moves out without closing it (no Modal, nothing traps focus)', async () => {
    const focus = focusSpy();
    const announce = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => undefined);
    const view = await mount({ open: false, value: 'sent' });
    await rerender(view, { open: true, value: 'sent' });
    await wait(0);
    expect(focusedRow(focus)).toBe(`${ID}.destination.1`);
    expect(announce).toHaveBeenCalledWith(expect.objectContaining({ props: expect.objectContaining({ testID: `${ID}.destination.1` }) }), 'focus');
    await rerender(view, { open: false, value: 'sent' });
    focus.mockClear();
    await rerender(view, { open: true, value: '', items: [{ value: 'a', label: 'A', disabled: true }, { value: 'b', label: 'B' }] });
    await wait(0);
    expect(focusedRow(focus)).toBe(`${ID}.destination.1`);
    expect(part('modal')).toBeNull();
  });
});

describe('modal: a modal overlay (NVD-19 … NVD-24)', () => {
  test('NVD-19: presented in a transparent Modal over a scrim in comp.navigation-drawer.scrim.color, moving focus to the selected destination; everything behind is inert (the Modal is a window of its own)', async () => {
    const focus = focusSpy();
    const view = await mount({ variant: 'modal', open: false, value: 'drafts' });
    expect(part('modal')).toBeNull();
    await rerender(view, { variant: 'modal', open: true, value: 'drafts' });
    const modal = part('modal')!;
    expect(modal.props).toMatchObject({ visible: true, transparent: true, animationType: 'none', statusBarTranslucent: true, navigationBarTranslucent: true });
    expect(viewStyle(part('scrim')!).backgroundColor).toBe(painted(tokens.scrimColor));
    await fireEvent(modal, 'show');
    await wait(0);
    expect(focusedRow(focus)).toBe(`${ID}.destination.2`);
  });

  test('NVD-19: it slides in from its start edge and the scrim fades in over the enter motion; at once where motion is reduced', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ variant: 'modal', open: false });
    await wait(10);
    await rerender(view, { variant: 'modal', open: true });
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionEnterDuration)?.[1]).toMatchObject({ toValue: 1 });
    expect(viewStyle(part('panel')!).transform).toEqual([{ translateX: expect.anything() }]);
    await wait(tokens.motionEnterDuration + 100);
    await view.unmount();
    reduceMotion(true);
    timing.mockClear();
    const reduced = await mount({ variant: 'modal', open: false });
    await rerender(reduced, { variant: 'modal', open: true });
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionEnterDuration)).toHaveLength(0);
  });

  test('NVD-20: a press on the scrim, Escape, Android\'s back, the iOS escape gesture each ask to close — once per opening', async () => {
    for (const how of ['scrim', 'escape', 'back', 'gesture'] as const) {
      const onClose = jest.fn();
      const view = await mount({ variant: 'modal', onClose });
      if (how === 'scrim') await fireEvent.press(part('scrim')!);
      if (how === 'escape') await fireEvent(part('panel')!, 'keyDown', { nativeEvent: { key: 'Escape' } });
      if (how === 'back') await fireEvent(part('modal')!, 'requestClose');
      if (how === 'gesture') await fireEvent(part('panel')!, 'accessibilityEscape');
      await fireEvent.press(part('scrim')!);
      expect(onClose).toHaveBeenCalledTimes(1);
      await view.unmount();
    }
  });

  test('NVD-20: a drag toward the start edge past half its width, or a fling that way, closes; a shorter, slower drag springs back', async () => {
    let handlers: PanResponderCallbacks = {};
    const create = PanResponder.create.bind(PanResponder);
    jest.spyOn(PanResponder, 'create').mockImplementation((config) => {
      handlers = config;
      return create(config);
    });
    const gesture = (dx: number, vx = 0) => ({ dx, dy: 0, vx, vy: 0 }) as never;
    const onClose = jest.fn();
    const view = await mount({ variant: 'modal', onClose });
    expect(handlers.onMoveShouldSetPanResponder!({} as never, gesture(-20))).toBe(true);
    expect(handlers.onMoveShouldSetPanResponder!({} as never, { dx: -5, dy: 40, vx: 0, vy: 0 } as never)).toBe(false);
    await act(async () => handlers.onPanResponderRelease!({} as never, gesture(-(tokens.containerWidth / 2) + 10)));
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => handlers.onPanResponderRelease!({} as never, gesture(-(tokens.containerWidth / 2) - 10)));
    expect(onClose).toHaveBeenCalledTimes(1);
    await view.unmount();
    const flung = jest.fn();
    await mount({ variant: 'modal', onClose: flung });
    await act(async () => handlers.onPanResponderRelease!({} as never, gesture(-30, -1)));
    expect(flung).toHaveBeenCalledTimes(1);
  });

  test('NVD-22: WHEN it closes it slides out and the scrim fades over the exit motion, then the Modal goes; focus returns where the platform puts it (README)', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const view = await mount({ variant: 'modal' });
    await wait(10);
    await rerender(view, { variant: 'modal', open: false });
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionExitDuration)?.[1]).toMatchObject({ toValue: 0 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionExitEasing);
    expect(part('modal')).not.toBeNull();
    await wait(tokens.motionExitDuration + 100);
    expect(part('modal')).toBeNull();
  });

  test('NVD-23: the modal drawer is a modal dialog named by its label; each destination ONE element — a button named by its label with its selected state and position, its icon hidden', async () => {
    await mount({ variant: 'modal' });
    expect(part('panel')!.props).toMatchObject({ role: 'dialog', 'aria-modal': true, accessibilityViewIsModal: true, accessibilityLabel: 'Mail' });
    expect(row(0).props).toMatchObject({ role: 'button', accessibilityLabel: 'Inbox', accessibilityState: { selected: true, disabled: false }, accessibilityValue: { text: '1 of 5, 24' } });
    expect(rowPart(0, 'icon')!.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  test('NVD-23: a standard drawer is no dialog', async () => {
    await mount();
    expect(part('panel')!.props.role).toBeUndefined();
    expect(part('panel')!.props.accessibilityViewIsModal).toBeUndefined();
  });

  test('NVD-24: a destination without a label still renders; a modal drawer without a label has a dialog without a name — both reported in development builds', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ variant: 'modal', accessibilityLabel: '', items: [{ value: 'a', label: '' }, { value: 'b', label: 'B' }], value: 'a' });
    expect(row(0)).toBeTruthy();
    const reports = warn.mock.calls.map(([message]) => String(message));
    expect(reports).toContainEqual(expect.stringContaining('destination 1 of a NavigationDrawer'));
    expect(reports).toContainEqual(expect.stringContaining('its dialog has no name'));
  });
});

describe('open vocabulary and values (NVD-26, NVD-29)', () => {
  test('NVD-26: a variant the active system does not have renders with standard\'s tokens (as a layout region), and development builds report it once', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ variant: 'dismissible' as NavigationDrawerProps['variant'] });
    expect(viewStyle(part('panel')!).backgroundColor).toBe(painted(tokens.variants.standard.containerColor));
    expect(part('modal')).toBeNull();
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('no NavigationDrawer variant "dismissible"; using "standard"')]);
  });

  test('NVD-29: two destinations with one value — the first in reading order is the one the value selects, reported in development builds', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ items: [{ value: 'a', label: 'A' }, { heading: 'S', items: [{ value: 'b', label: 'B' }, { value: 'a', label: 'A again' }] }], value: 'a' });
    expect(row(0).props.accessibilityState.selected).toBe(true);
    expect(row(2).props.accessibilityState.selected).toBe(false);
    expect(warn.mock.calls.map(([message]) => String(message))).toContainEqual(expect.stringContaining('repeats the value "a"'));
  });

  test('the values drive the drawer: a layer\'s width, rows and heading', async () => {
    await mount({}, { theme: 'light', system: withDrawer({ containerWidth: 320, itemContainerHeight: 52, itemPaddingInline: 20, headingHeight: 40 }) });
    expect(viewStyle(part('panel')!).width).toBe(320);
    expect(viewStyle(row(0))).toMatchObject({ minHeight: 52, paddingStart: 20 });
    expect(viewStyle(part('section.0.heading')!).minHeight).toBe(40);
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(navigationDrawerSubject);
});
