// Tabs — behaviour, accessibility, keyboard, layout, motion, token binding and fixture baselines.
// Cases come from specs/tabs.spec.json; every behaviour id is cited by the test that covers it.
import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, ScrollView, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreTabsVariant, TanreiPaint, TanreiScheme, TanreiSystem, TanreiTabsTokens, TanreiTabsVariantStateTokens } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { iconFamily } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Tabs, type Tab, type TabsProps } from '../Tabs';
import { acme } from './__fixtures__/acme';
import { tabsSubject } from './Tabs.subject';

const spec = loadSpec('tabs');
const { measure } = tanrei;
const tokens: TanreiTabsTokens = tanrei.components.tabs;
const ID = 'tabs';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const withTabs = (overrides: Partial<TanreiTabsTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'tabs', overrides);
const withVariant = (variant: TanreiCoreTabsVariant, overrides: { [State in InteractionState]?: Partial<TanreiTabsVariantStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.tabs.variants[variant];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withTabs({ variants: { ...base.components.tabs.variants, [variant]: { ...current, ...changed } } }, base);
};
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};

const THREE: Tab[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'activity', label: 'Activity' },
  { value: 'settings', label: 'Settings' },
];
const ICONS: Tab[] = [
  { value: 'overview', label: 'Overview', icon: 'dashboard' },
  { value: 'activity', label: 'Activity', icon: 'history' },
  { value: 'settings', label: 'Settings', icon: 'settings' },
];
const WITH_DISABLED: Tab[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'billing', label: 'Billing', disabled: true },
  { value: 'activity', label: 'Activity' },
  { value: 'settings', label: 'Settings' },
];

function mount(props: Partial<TabsProps> & { items?: readonly Tab[] } = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <Tabs testID={ID} items={THREE} accessibilityLabel="Project" {...props} />
    </TanreiProvider>,
  );
}

/** A product that keeps the value: moves it from onValueChange. */
function Controlled({ items = THREE, initial = null, onValueChange, ...props }: Partial<TabsProps> & { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <Tabs
      testID={ID}
      items={items}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      {...props}
    />
  );
}
const mountControlled = (props: Parameters<typeof Controlled>[0] = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) =>
  render(
    <TanreiProvider {...provider}>
      <Controlled {...props} />
    </TanreiProvider>,
  );

const row = () => screen.getByTestId(ID);
const tab = (i: number) => screen.getByTestId(`${ID}.tab.${i}`, { includeHiddenElements: true });
const part = (i: number, name: string) => screen.queryByTestId(`${ID}.tab.${i}.${name}`, { includeHiddenElements: true });
const rowPart = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const key = (name: string) => fireEvent(row(), 'keyDown', { nativeEvent: { key: name } });
const click = (i: number) => fireEvent(tab(i), 'press', { nativeEvent: { target: 1 } });
const focusSpy = () => jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
const focusedTab = (spy: jest.SpyInstance) => (spy.mock.contexts.at(-1) as { props?: { testID?: string } } | undefined)?.props?.testID;
const layout = (instance: Instance, box: { x: number; width: number; y?: number; height?: number }) => fireEvent(instance, 'layout', { nativeEvent: { layout: { y: 0, height: 48, ...box } } });

/** The reports of the Tabs themselves (the icon helper's fill report is IconButton's to test). */
const tabsReports = (warn: jest.SpyInstance) => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('Tabs'));

const HOLD = tanrei.motion.duration.pressHold;
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
async function release(i: number) {
  await fireEvent(tab(i), 'pressOut');
  await wait(HOLD + 30);
}
async function enter(i: number, target: InteractionState) {
  if (target === 'hovered') await fireEvent(tab(i), 'hoverIn');
  if (target === 'focused') await fireEvent(tab(i), 'focus');
  if (target === 'pressed') await fireEvent(tab(i), 'pressIn');
}

const ACTIVE = ['hovered', 'focused', 'pressed'] as const;
const opacityOf = (from: TanreiTabsTokens, in_: InteractionState) => ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity })[in_];
function look(from: TanreiTabsVariantStateTokens, selected: boolean) {
  return selected
    ? { container: from.selectedContainerColor, label: from.selectedLabelColor, icon: from.selectedIconColor, indicator: from.selectedActiveIndicatorColor }
    : { container: from.containerColor, label: from.labelColor, icon: from.iconColor, indicator: from.activeIndicatorColor };
}

/** Everything TAB-3 / TAB-6 / TAB-11 name — container, label, icon, indicator and opacity — from one state's tokens in one look. */
function expectTabDrawnFrom(i: number, selected: boolean, in_: InteractionState, { system = tanrei, scheme = 'light', variant = 'primary' }: { system?: TanreiSystem; scheme?: TanreiScheme; variant?: TanreiCoreTabsVariant } = {}) {
  const from = system.components.tabs;
  const state = from.variants[variant][in_];
  const paints = look(state, selected);
  const style = viewStyle(tab(i));
  expect(style.backgroundColor).toBe(fill(paints.container, scheme, system));
  expect(style.opacity).toBe(opacityOf(from, in_));
  expect(style.borderRadius).toBe(from.containerShape);
  if (part(i, 'label')) expect(textStyle(part(i, 'label')!).color).toBe(painted(paints.label, scheme, system));
  if (part(i, 'icon')) expect(textStyle(part(i, 'icon.glyph')!).color).toBe(painted(paints.icon, scheme, system));
  const indicator = part(i, 'indicator');
  const drawsIndicator = evaluatePaint(paints.indicator, system.colors[scheme]).a > 0;
  expect(indicator !== null).toBe(drawsIndicator);
  if (indicator) expect(viewStyle(indicator)).toMatchObject({ backgroundColor: painted(paints.indicator, scheme, system), height: state.activeIndicatorThickness, borderTopLeftRadius: state.activeIndicatorShape, borderTopRightRadius: state.activeIndicatorShape });
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
  test('the React Native mapping in the spec matches this implementation: Tabs and its item kind Tab', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Tabs.name);
    expect(platform.props).toEqual({ variant: 'variant', scrollable: 'scrollable', selected: 'value', label: 'accessibilityLabel' });
    expect(platform.events).toEqual({ change: 'onValueChange' });
    expect(platform.items?.tab?.name).toBe('Tab');
    expect(platform.items?.tab?.props).toEqual({ value: 'value', label: 'label', icon: 'icon', labelHidden: 'labelHidden', disabled: 'disabled' });
  });

  test('the variant is the token axis (primary, the default, and secondary); defaults follow the spec — fixed, the first enabled tab selected', async () => {
    expect(Object.keys(tokens.variants)).toEqual(['primary', 'secondary']);
    expect(spec.props.find((p) => p.name === 'variant')?.default).toBe('primary');
    await render(<Tabs testID={ID} items={THREE} />);
    expect(rowPart('row')).not.toBeNull();
    expect(rowPart('scroll')).toBeNull();
    expect(tab(0).props.accessibilityState.selected).toBe(true);
    expectTabDrawnFrom(0, true, 'enabled');
  });
});

describe('selection (TAB-1, TAB-2, TAB-11)', () => {
  test('TAB-1: activating an enabled tab that is not selected — by touch, or a bare click (Enter, Space) — emits change once with its value; the selected tab emits nothing', async () => {
    const onValueChange = jest.fn();
    await mount({ value: 'overview', onValueChange });
    await fireEvent.press(tab(1));
    await wait(HOLD + 30);
    await click(2);
    await wait(HOLD + 30);
    await fireEvent.press(tab(0));
    expect(onValueChange.mock.calls).toEqual([['activity'], ['settings']]);
  });

  test('TAB-1: controlled — the row moves to the new value only when the product sets it', async () => {
    const view = await mount({ value: 'overview' });
    await fireEvent.press(tab(1));
    expect(tab(0).props.accessibilityState.selected).toBe(true);
    await view.rerender(
      <TanreiProvider theme="light">
        <Tabs testID={ID} items={THREE} value="activity" />
      </TanreiProvider>,
    );
    expect(tab(1).props.accessibilityState.selected).toBe(true);
    expect(tab(0).props.accessibilityState.selected).toBe(false);
  });

  test('TAB-2: a disabled tab is not selected by a press, is never focusable (not the tab stop even when it is selected), and exposes disabled', async () => {
    const onValueChange = jest.fn();
    await mount({ items: WITH_DISABLED, value: 'billing', onValueChange });
    await fireEvent.press(tab(1));
    await click(1);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(tab(1)).toBeDisabled();
    expect(tab(1).props.accessibilityState).toEqual({ selected: true, disabled: true });
    expect(tab(1).props.focusable).toBe(false);
    // The tab stop is then the first enabled tab.
    expect(tab(0).props.focusable).toBe(true);
    expect([2, 3].map((i) => tab(i).props.focusable)).toEqual([false, false]);
  });

  test('TAB-11: null selects the first ENABLED tab; the selected tab is drawn from the selected. parts, every other from the variant\'s own', async () => {
    await mount({ items: [{ value: 'billing', label: 'Billing', disabled: true }, ...THREE], value: null });
    expect([0, 1, 2, 3].map((i) => tab(i).props.accessibilityState.selected)).toEqual([false, true, false, false]);
    expectTabDrawnFrom(1, true, 'enabled');
    expectTabDrawnFrom(2, false, 'enabled');
    expectTabDrawnFrom(0, false, 'disabled');
  });

  test('TAB-11: a value that names no tab selects none (no indicator anywhere) and is reported in development builds; release builds are silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ value: 'missing' });
    expect([0, 1, 2].map((i) => tab(i).props.accessibilityState.selected)).toEqual([false, false, false]);
    expect([0, 1, 2].map((i) => part(i, 'indicator'))).toEqual([null, null, null]);
    // No tab selected: the first enabled one is the tab stop.
    expect(tab(0).props.focusable).toBe(true);
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('has the value "missing", which no tab has')]);
    await view.unmount();
    warn.mockClear();
    development(false);
    await mount({ value: 'missing' });
    expect(warn).not.toHaveBeenCalled();
  });

  test('TAB-11: a tab with an empty value or one that repeats another still renders; the first tab with a value is the one it selects; each is reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ items: [{ value: 'a', label: 'One' }, { value: '', label: 'Two' }, { value: 'a', label: 'Three' }], value: 'a' });
    expect([0, 1, 2].map((i) => tab(i).props.accessibilityState.selected)).toEqual([true, false, false]);
    const messages = warn.mock.calls.map(([message]) => String(message));
    expect(messages).toEqual([expect.stringContaining('tab 2 of a Tabs (testID "tabs") has no value'), expect.stringContaining('tab 3 of a Tabs (testID "tabs") repeats the value "a" of tab 1')]);
  });
});

describe('states (TAB-3 … TAB-10, TAB-23)', () => {
  describe.each([
    ['primary', 'not selected', 1, false],
    ['primary', 'selected', 0, true],
    ['secondary', 'not selected', 1, false],
    ['secondary', 'selected', 0, true],
  ] as const)('TAB-3: a %s tab, %s', (variant, _name, i, selected) => {
    test.each(ACTIVE)('%s: container, label, icon, indicator and opacity come from that state\'s tokens of its look, and it returns to rest', async (target) => {
      await mount({ variant, value: 'overview', items: ICONS });
      expectTabDrawnFrom(i, selected, 'enabled', { variant });
      await enter(i, target);
      expectTabDrawnFrom(i, selected, target, { variant });
      if (target === 'hovered') await fireEvent(tab(i), 'hoverOut');
      if (target === 'focused') await fireEvent(tab(i), 'blur');
      if (target === 'pressed') await release(i);
      expectTabDrawnFrom(i, selected, 'enabled', { variant });
    });
  });

  test('TAB-3: precedence is pressed over focused over hovered, under the acme fixture system; focus that comes with a press does not select focused', async () => {
    const primary = acme.components.tabs.variants.primary;
    const expected = (name: InteractionState) => fill(primary[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    await mount({ value: 'overview' }, { theme: 'light', system: acme });
    const background = () => viewStyle(tab(1)).backgroundColor;
    await fireEvent(tab(1), 'hoverIn');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(tab(1), 'focus');
    expect(background()).toBe(expected('focused'));
    await fireEvent(tab(1), 'pressIn');
    expect(background()).toBe(expected('pressed'));
    await release(1);
    expect(background()).toBe(expected('focused'));
    await fireEvent(tab(1), 'blur');
    await fireEvent(tab(1), 'hoverOut');
    await fireEvent(tab(2), 'pressIn');
    await fireEvent(tab(2), 'focus');
    await release(2);
    expect(viewStyle(tab(2)).backgroundColor).toBe(expected('enabled'));
  });

  test('TAB-3: in the default system a state mixes the look\'s state-layer color (its label color) into the transparent tab', async () => {
    for (const variant of ['primary', 'secondary'] as const) {
      const resting = tokens.variants[variant].enabled;
      expect(resting.stateLayerColor).toEqual(resting.labelColor);
      expect(resting.selectedStateLayerColor).toEqual(resting.selectedLabelColor);
    }
    await mount({ value: 'overview' });
    await fireEvent(tab(0), 'focus');
    const resting = tokens.variants.primary.enabled;
    expect(viewStyle(tab(0)).backgroundColor).toBe(painted({ kind: 'mix', base: resting.selectedContainerColor, with: resting.selectedStateLayerColor, amount: tanrei.state.focusStateLayerOpacity }));
  });

  test('TAB-4: keyboard focus shows the focus ring INSIDE the tab, without animation; focus that comes with a press does not', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ value: 'overview' });
    await wait(10);
    timing.mockClear();
    await fireEvent(tab(0), 'focus');
    expect(viewStyle(part(0, 'focus-ring')!)).toEqual({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: measure.focus.outerWidth, borderColor: role('focusRing'), borderRadius: tokens.containerShape, pointerEvents: 'none' });
    expect(timing.mock.calls.every(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
    await wait(tokens.motionStateDuration * 2);
    await fireEvent(tab(1), 'pressIn');
    await fireEvent(tab(1), 'focus');
    expect(part(1, 'focus-ring')).toBeNull();
    await release(1);
    await wait(tokens.motionStateDuration * 2);
  });

  test('TAB-5: every tab is at least sys.target.touch wide and tall, and extends no hit area over its neighbours or the panel', async () => {
    const system = withTabs({ containerHeight: 30, containerPaddingInline: 0 });
    await mount({ scrollable: true, items: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }, { theme: 'light', system });
    for (const i of [0, 1]) {
      expect(viewStyle(tab(i))).toMatchObject({ minWidth: measure.target.touch, minHeight: measure.target.touch });
      expect(tab(i).props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    }
  });

  test('TAB-6: a disabled tab is drawn from its variant\'s disabled tokens — not selected: no fill and no indicator; selected: its selected. parts, a faded indicator', async () => {
    for (const variant of ['primary', 'secondary'] as const) {
      const view = await mount({ variant, items: WITH_DISABLED, value: 'billing' });
      expectTabDrawnFrom(1, true, 'disabled', { variant });
      expect(part(1, 'indicator')).not.toBeNull();
      await view.rerender(
        <TanreiProvider theme="light">
          <Tabs testID={ID} variant={variant} items={WITH_DISABLED} value="overview" />
        </TanreiProvider>,
      );
      expectTabDrawnFrom(1, false, 'disabled', { variant });
      expect(viewStyle(tab(1)).backgroundColor).toBeUndefined();
      expect(part(1, 'indicator')).toBeNull();
      await view.unmount();
    }
  });

  test('TAB-7: an unknown variant renders as primary, and development builds report it once; a release build is silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const expected = await mount({ items: ICONS });
    const json = JSON.stringify(expected.toJSON());
    await expected.unmount();
    const view = await mount({ items: ICONS, variant: 'underline' as never });
    expect(JSON.stringify(view.toJSON())).toBe(json);
    expect(tabsReports(warn)).toEqual([expect.stringContaining('has no Tabs variant "underline"; using "primary"')]);
    await view.unmount();
    warn.mockClear();
    resetLookupReports();
    development(false);
    await mount({ variant: 'pill' as never });
    expect(warn).not.toHaveBeenCalled();
  });

  test('TAB-8: the pressed state appears at once and stays visible for duration.pressHold; a bare click shows it too', async () => {
    await mount({ value: 'overview' });
    await fireEvent(tab(1), 'pressIn');
    expectTabDrawnFrom(1, false, 'pressed');
    await fireEvent(tab(1), 'pressOut');
    await wait(HOLD / 2);
    expectTabDrawnFrom(1, false, 'pressed');
    await wait(HOLD / 2 + 30);
    expectTabDrawnFrom(1, false, 'enabled');
    await click(2);
    expectTabDrawnFrom(2, false, 'pressed');
    await wait(HOLD + 30);
    expectTabDrawnFrom(2, false, 'enabled');
  });

  test('TAB-9 overlay (the default) and ripple (m3-like): the pressed tokens at once / the pressed color grows from the point of contact over the feedback duration while the tab keeps the state under the press', async () => {
    reduceMotion(false);
    const view = await mount({ value: 'overview' });
    await layout(tab(1), { x: 120, width: 120 });
    await fireEvent(tab(1), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(part(1, 'ripple')).toBeNull();
    expect(viewStyle(tab(1)).backgroundColor).toBe(fill(tokens.variants.primary.pressed.containerColor));
    await release(1);
    await wait(tokens.motionStateDuration * 2);
    await view.unmount();

    const tabs3 = m3Like.components.tabs;
    const timing = jest.spyOn(Animated, 'timing');
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 120, 48, 0, 0));
    await mount({ value: 'overview' }, { theme: 'light', system: m3Like });
    await layout(tab(1), { x: 120, width: 120 });
    timing.mockClear();
    await fireEvent(tab(1), 'pressIn', { nativeEvent: { pageX: 30, pageY: 20 } });
    const reach = Math.hypot(120 - 30, 48 - 20);
    expect(viewStyle(part(1, 'ripple.wave')!)).toMatchObject({ left: 30 - reach, top: 20 - reach, backgroundColor: painted(tabs3.variants.primary.pressed.containerColor, 'light', m3Like) });
    expect(viewStyle(tab(1)).backgroundColor).toBe(fill(tabs3.variants.primary.enabled.containerColor, 'light', m3Like));
    expect(textStyle(part(1, 'label')!).color).toBe(painted(tabs3.variants.primary.pressed.labelColor, 'light', m3Like));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: tabs3.motionFeedbackDuration, useNativeDriver: true });
    await release(1);
    await wait(tabs3.motionStateDuration * 2 + 50);
    expect(part(1, 'ripple')).toBeNull();
  });

  test('TAB-9 dim (cupertino): the pressed opacity on the whole tab and no state layer; none: no answer at all, the selection still happens', async () => {
    const tabs3 = cupertino.components.tabs;
    const view = await mount({ value: 'overview' }, { theme: 'light', system: cupertino });
    await fireEvent(tab(1), 'pressIn');
    expect(viewStyle(tab(1))).toMatchObject({ opacity: tabs3.pressedOpacity, backgroundColor: fill(tabs3.variants.primary.enabled.containerColor, 'light', cupertino) });
    expect(tabs3.pressedOpacity).toBeLessThan(1);
    await release(1);
    await view.unmount();

    const onValueChange = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withVariant('primary', { pressed: { containerColor: literal(1, 2, 3), labelColor: literal(4, 5, 6) } }, withTabs({ pressedOpacity: 0.5 })));
    await mount({ value: 'overview', onValueChange }, { theme: 'light', system });
    await fireEvent(tab(1), 'pressIn');
    expectTabDrawnFrom(1, false, 'enabled', { system });
    await fireEvent.press(tab(1));
    expect(onValueChange).toHaveBeenCalledWith('activity');
    await release(1);
  });

  test('TAB-10: a tab eases its corners by the smoothing (cupertino: continuous) — the tab and its focus ring; glow (acme) is one halo; the default tab is square', async () => {
    const view = await mount({ value: 'overview' });
    expect(viewStyle(tab(0)).borderRadius).toBe(0);
    expect(viewStyle(tab(0)).borderCurve).toBeUndefined();
    await view.unmount();
    const rounded = withTabs({ containerShape: 12 }, cupertino);
    const second = await mount({ value: 'overview' }, { theme: 'light', system: rounded });
    await fireEvent(tab(0), 'focus');
    expect(viewStyle(tab(0))).toMatchObject({ borderRadius: 12, borderCurve: 'continuous' });
    expect(viewStyle(part(0, 'focus-ring')!).borderCurve).toBe('continuous');
    await second.unmount();
    await mount({ value: 'overview' }, { theme: 'light', system: acme });
    await fireEvent(tab(0), 'focus');
    expect(viewStyle(part(0, 'focus-ring')!).boxShadow).toHaveLength(1);
  });

  test('TAB-23: a state change animates over comp.tabs.motion.state-*, a press is immediate, and a change of selection moves the colors over the state motion too; reduced motion lands at once', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const view = await mountControlled({ initial: 'overview' });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    await wait(10);
    timing.mockClear();
    await fireEvent(tab(1), 'hoverIn');
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: tokens.motionStateDuration, useNativeDriver: false });
    await fireEvent(tab(1), 'hoverOut');
    await wait(tokens.motionStateDuration * 2);
    timing.mockClear();
    await fireEvent(tab(2), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    await release(2);
    await wait(tokens.motionStateDuration * 2);
    // A selection (by key, so no press): the two tabs whose look changes move over the state motion.
    timing.mockClear();
    await key('End');
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionStateDuration).length).toBeGreaterThanOrEqual(2);
    await wait(tokens.motionIndicatorDuration + 50);
    await view.unmount();
    reduceMotion(true);
    timing.mockClear();
    await mount({ value: 'overview' });
    await fireEvent(tab(1), 'hoverIn');
    expect(timing).not.toHaveBeenCalled();
    expectTabDrawnFrom(1, false, 'hovered');
  });
});

describe('keyboard (TAB-12)', () => {
  test('TAB-12: one tab stop, the selected tab; Right and Left Arrow move to the next and previous ENABLED tab, wrapping, and select it; Home and End go to the ends', async () => {
    const focus = focusSpy();
    const onValueChange = jest.fn();
    await mountControlled({ items: WITH_DISABLED, initial: 'overview', onValueChange, accessibilityLabel: 'Project' });
    expect([0, 1, 2, 3].map((i) => tab(i).props.focusable)).toEqual([true, false, false, false]);
    await key('ArrowRight');
    expect(focusedTab(focus)).toBe(`${ID}.tab.2`);
    expect(onValueChange).toHaveBeenLastCalledWith('activity');
    expect([0, 1, 2, 3].map((i) => tab(i).props.focusable)).toEqual([false, false, true, false]);
    await key('ArrowRight');
    await key('ArrowRight');
    expect(focusedTab(focus)).toBe(`${ID}.tab.0`);
    await key('ArrowLeft');
    expect(focusedTab(focus)).toBe(`${ID}.tab.3`);
    await key('Home');
    expect(focusedTab(focus)).toBe(`${ID}.tab.0`);
    await key('End');
    expect(focusedTab(focus)).toBe(`${ID}.tab.3`);
    expect(onValueChange.mock.calls.map(([value]) => value)).toEqual(['activity', 'settings', 'overview', 'settings', 'overview', 'settings']);
    // Up and Down Arrow and printable characters are not the tabs' keys.
    onValueChange.mockClear();
    await key('ArrowDown');
    await key('o');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test('TAB-12: in a right-to-left layout Left Arrow moves to the next tab and Right Arrow to the previous one', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    const focus = focusSpy();
    await mountControlled({ initial: 'overview' });
    await key('ArrowLeft');
    expect(focusedTab(focus)).toBe(`${ID}.tab.1`);
    expect(tab(1).props.accessibilityState.selected).toBe(true);
    await key('ArrowRight');
    expect(focusedTab(focus)).toBe(`${ID}.tab.0`);
  });

  test('TAB-12: Enter and Space select the focused tab (the Pressable\'s own click); Tab moves on from the selected tab into the panel (the product\'s next view in the focus order)', async () => {
    const onValueChange = jest.fn();
    await mount({ value: 'missing', onValueChange });
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await click(0);
    expect(onValueChange).toHaveBeenCalledWith('overview');
    // Only one tab takes Tab focus, so the next Tab leaves the row.
    expect([0, 1, 2].filter((i) => tab(i).props.focusable)).toHaveLength(1);
  });
});

describe('accessibility (TAB-13, TAB-19, TAB-22)', () => {
  test('TAB-13: the tab list role named by the row\'s label; each tab the tab role, named by its label (drawn or not), with its selected state and its position', async () => {
    await mount({ value: 'activity', items: ICONS.map((each) => ({ ...each, labelHidden: true })) });
    expect(row().props).toMatchObject({ role: 'tablist', accessibilityLabel: 'Project' });
    expect([0, 1, 2].map((i) => tab(i).props.role)).toEqual(['tab', 'tab', 'tab']);
    expect([0, 1, 2].map((i) => tab(i).props.accessibilityLabel)).toEqual(['Overview', 'Activity', 'Settings']);
    expect([0, 1, 2].map((i) => tab(i).props.accessibilityState.selected)).toEqual([false, true, false]);
    expect(tab(1).props.accessibilityValue).toEqual({ text: '2 of 3' });
    expect(screen.getByRole('tab', { name: 'Activity', selected: true })).toBe(tab(1));
    // Icons, the indicator and the divider are decorative.
    for (const name of ['icon', 'indicator']) expect(part(1, name)!.props.accessibilityElementsHidden).toBe(true);
    expect(rowPart('divider')!.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  test('TAB-13: positionText announces the position in the product\'s language; React Native has no tab panel role, and the README says the panel follows the row', async () => {
    await mount({ value: 'overview', positionText: (position, count) => `${count} 件中 ${position} 件目` });
    expect(tab(2).props.accessibilityValue).toEqual({ text: '3 件中 3 件目' });
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('React Native has no tab panel role');
  });

  test('TAB-19: labelHidden draws the icon alone and keeps the label as the name; labelHidden without an icon draws the label and is reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ value: 'a', items: [{ value: 'a', label: 'Alpha', icon: 'dashboard', labelHidden: true }, { value: 'b', label: 'Beta', labelHidden: true }] });
    expect(part(0, 'label')).toBeNull();
    expect(part(0, 'icon')).not.toBeNull();
    expect(tab(0).props.accessibilityLabel).toBe('Alpha');
    expect(screen.getByTestId(`${ID}.tab.1.label`, { includeHiddenElements: true }).props.children).toBe('Beta');
    expect(tabsReports(warn)).toEqual([expect.stringContaining('tab 2 of a Tabs (testID "tabs") hides its label but has no icon')]);
  });

  test('TAB-22: a tab without a label still renders, and development builds report it; release builds say nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ items: [{ value: 'a', label: '' }, { value: 'b', label: 'Beta' }] });
    expect(tab(0)).toBeTruthy();
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('tab 1 of a Tabs (testID "tabs") has no label')]);
    await view.unmount();
    warn.mockClear();
    development(false);
    await mount({ items: [{ value: 'a', label: '' }] });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('layout (TAB-14 … TAB-21)', () => {
  test('TAB-14: fixed — every tab takes an equal share of the row (flex basis 0), the tabs stretch to the tallest, and a label wraps', async () => {
    await mount({ value: 'overview' });
    expect(viewStyle(rowPart('row')!)).toMatchObject({ flexDirection: 'row', alignItems: 'stretch' });
    for (const i of [0, 1, 2]) {
      expect(viewStyle(tab(i))).toMatchObject({ flexGrow: 1, flexBasis: 0, paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline });
      expect(part(i, 'label')!.props.numberOfLines).toBeUndefined();
    }
  });

  test('TAB-14: scrollable — a horizontal ScrollView; each tab its content plus comp.tabs.container.padding-inline on each side, the label on one line', async () => {
    await mount({ value: 'overview', scrollable: true });
    const scroll = rowPart('scroll')!;
    expect(scroll.props.horizontal).toBe(true);
    for (const i of [0, 1, 2]) {
      const style = viewStyle(tab(i));
      expect(style.flexGrow).toBeUndefined();
      expect(style).toMatchObject({ paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline });
      expect(part(i, 'label')!.props.numberOfLines).toBe(1);
    }
  });

  test('TAB-15: a tab that becomes selected while partly out of view scrolls into view over the indicator motion; at once where motion is reduced', async () => {
    reduceMotion(false);
    const scrollTo = jest.spyOn(ScrollView.prototype as unknown as { scrollTo: (options: object) => void }, 'scrollTo').mockImplementation(() => undefined);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const view = await mountControlled({ initial: 'overview', scrollable: true });
    await fireEvent(rowPart('scroll')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } } });
    for (const i of [0, 1, 2]) await layout(tab(i), { x: i * 120, width: 120 });
    timing.mockClear();
    await key('End');
    const move = timing.mock.calls.find(([, config]) => config.duration === tokens.motionIndicatorDuration && config.toValue === 360 - 200);
    expect(move?.[1]).toMatchObject({ useNativeDriver: false });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionIndicatorEasing);
    await wait(tokens.motionIndicatorDuration + 100);
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 160, animated: false });
    await view.unmount();

    reduceMotion(true);
    scrollTo.mockClear();
    timing.mockClear();
    await mountControlled({ initial: 'overview', scrollable: true });
    await fireEvent(rowPart('scroll')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } } });
    for (const i of [0, 1, 2]) await layout(tab(i), { x: i * 120, width: 120 });
    await key('End');
    expect(scrollTo).toHaveBeenCalledWith({ x: 160, animated: false });
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionIndicatorDuration)).toHaveLength(0);
    // Keyboard focus on a tab out of view (on the start side) reveals it too.
    await fireEvent(rowPart('scroll')!, 'scroll', { nativeEvent: { contentOffset: { x: 160, y: 0 } } });
    await fireEvent(tab(0), 'focus');
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
  });

  test('TAB-15: when the row first appears with its selected tab out of view, it is scrolled into view at once, with no animation (spec change 1c12655); a selected tab in view is left where it is', async () => {
    reduceMotion(false);
    const scrollTo = jest.spyOn(ScrollView.prototype as unknown as { scrollTo: (options: object) => void }, 'scrollTo').mockImplementation(() => undefined);
    // The ScrollView mock's scrollTo is one shared jest.fn: forget the calls of earlier tests.
    scrollTo.mockClear();
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mountControlled({ initial: 'settings', scrollable: true });
    for (const i of [0, 1, 2]) await layout(tab(i), { x: i * 120, width: 120 });
    expect(scrollTo).not.toHaveBeenCalled();
    await fireEvent(rowPart('scroll')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } } });
    expect(scrollTo.mock.calls).toEqual([[{ x: 360 - 200, animated: false }]]);
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionIndicatorDuration)).toHaveLength(0);
    // Only the first appearance: a later layout pass does not scroll again.
    await fireEvent(rowPart('scroll')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 220, height: 48 } } });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    await view.unmount();
    scrollTo.mockClear();
    await mountControlled({ initial: 'overview', scrollable: true });
    await fireEvent(rowPart('scroll')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } } });
    for (const i of [0, 1, 2]) await layout(tab(i), { x: i * 120, width: 120 });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  test('TAB-16: a tab\'s content keeps the indicator\'s thickness from its top and bottom edges, so a label that wraps grows the tab instead of running under the indicator (spec change 1c12655)', async () => {
    const view = await mount({ value: 'overview' });
    expect(viewStyle(part(0, 'content')!).paddingVertical).toBe(tokens.variants.primary.enabled.activeIndicatorThickness);
    expect(part(0, 'content')!.children).not.toContain(part(0, 'indicator'));
    await view.unmount();
    await mount({ value: 'overview', variant: 'secondary' });
    expect(viewStyle(part(0, 'content')!).paddingVertical).toBe(tokens.variants.secondary.enabled.activeIndicatorThickness);
  });

  test('TAB-16: the indicator on the bottom edge — primary 3 thick with rounded top corners under the content, secondary 2 thick and square under the whole tab', async () => {
    expect(tokens.variants.primary.enabled).toMatchObject({ activeIndicatorThickness: 3, activeIndicatorShape: tanrei.shape.extraSmall });
    expect(tokens.variants.secondary.enabled).toMatchObject({ activeIndicatorThickness: 2, activeIndicatorShape: 0 });
    const view = await mount({ value: 'overview' });
    // Primary: inside the content's extent (as wide as the label, or the icon when it is wider).
    expect(part(0, 'extent')!.children).toContain(part(0, 'indicator'));
    expect(viewStyle(part(0, 'indicator')!)).toMatchObject({ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: tanrei.shape.extraSmall, borderTopRightRadius: tanrei.shape.extraSmall, backgroundColor: role('primary') });
    await view.unmount();
    await mount({ value: 'overview', variant: 'secondary' });
    expect(part(0, 'extent')).toBeNull();
    expect(tab(0).children).toContain(part(0, 'indicator'));
    expect(viewStyle(part(0, 'indicator')!)).toMatchObject({ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderTopLeftRadius: 0 });
  });

  test('TAB-17: WHEN the selection changes the indicator slides and resizes from the old tab to the new one over the indicator motion; the panel (the value) changes at once', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const onValueChange = jest.fn();
    await mountControlled({ initial: 'overview', onValueChange });
    for (const i of [0, 1, 2]) {
      await layout(tab(i), { x: i * 120, width: 120 });
      await fireEvent(part(i, 'extent')!, 'layout', { nativeEvent: { layout: { x: 30 + i, y: 0, width: 60 - i * 2, height: 48 } } });
    }
    timing.mockClear();
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await fireEvent.press(tab(2));
    expect(onValueChange).toHaveBeenCalledWith('settings');
    // From the first tab's content (0 + 30, 60 wide) to the third's (240 + 32, 56 wide).
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    expect(ranges).toEqual(expect.arrayContaining([[30, 272], [60, 56]]));
    const slide = timing.mock.calls.find(([, config]) => config.duration === tokens.motionIndicatorDuration);
    expect(slide?.[1]).toMatchObject({ toValue: 1, useNativeDriver: false });
    const slider = rowPart('slider')!;
    expect(slider).not.toBeNull();
    // The static indicators of both tabs wait while it moves.
    expect(part(0, 'indicator')).toBeNull();
    expect(part(2, 'indicator')).toBeNull();
    const style = viewStyle(slider);
    expect(style.left).toBeGreaterThanOrEqual(30);
    expect(style.left).toBeLessThanOrEqual(272);
    expect(style).toMatchObject({ height: 3, backgroundColor: role('primary'), bottom: 0 });
    await wait(tokens.motionIndicatorDuration + 100);
    expect(rowPart('slider')).toBeNull();
    expect(part(2, 'indicator')).not.toBeNull();
    await release(2);
  });

  test('TAB-17: where motion is reduced the indicator moves at once (no slide)', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mountControlled({ initial: 'overview' });
    for (const i of [0, 1, 2]) {
      await layout(tab(i), { x: i * 120, width: 120 });
      await fireEvent(part(i, 'extent')!, 'layout', { nativeEvent: { layout: { x: 30, y: 0, width: 60, height: 48 } } });
    }
    await key('ArrowRight');
    expect(rowPart('slider')).toBeNull();
    expect(part(1, 'indicator')).not.toBeNull();
    expect(part(0, 'indicator')).toBeNull();
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionIndicatorDuration)).toHaveLength(0);
  });

  test('TAB-18: a tab is at least comp.tabs.container.height tall; a primary row with stacked icons is height-with-icon, the icon above the label comp.tabs.container.gap apart; secondary puts the icon before the label', async () => {
    const view = await mount({ value: 'overview' });
    expect(viewStyle(tab(0)).minHeight).toBe(Math.max(tokens.containerHeight, measure.target.touch));
    await view.unmount();
    const icons = await mount({ value: 'overview', items: ICONS });
    expect(viewStyle(tab(0)).minHeight).toBe(tokens.containerHeightWithIcon);
    expect(viewStyle(part(0, 'content')!)).toMatchObject({ flexDirection: 'column', gap: tokens.containerGap });
    await icons.unmount();
    const iconOnly = await mount({ value: 'overview', items: ICONS.map((each) => ({ ...each, labelHidden: true })) });
    expect(viewStyle(tab(0)).minHeight).toBe(Math.max(tokens.containerHeight, measure.target.touch));
    await iconOnly.unmount();
    await mount({ value: 'overview', items: ICONS, variant: 'secondary' });
    expect(viewStyle(tab(0)).minHeight).toBe(Math.max(tokens.containerHeight, measure.target.touch));
    expect(viewStyle(part(0, 'content')!)).toMatchObject({ flexDirection: 'row', gap: tokens.containerGap });
  });

  test('TAB-18: the icon at comp.tabs.icon.size in the family of the tab\'s selection (acme: a family per state); the label in comp.tabs.label.typescale', async () => {
    const view = await mount({ value: 'overview', items: ICONS }, { theme: 'light', system: acme });
    const size = acme.components.tabs.iconSize;
    expect(viewStyle(part(0, 'icon')!)).toMatchObject({ width: size, height: size });
    expect(textStyle(part(0, 'icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, true).families[0]);
    expect(textStyle(part(1, 'icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, false).families[0]);
    await view.unmount();
    await mount({ value: 'overview' });
    const expected = createTanreiTheme(tanrei, 'light').text(tokens.labelTypescale);
    expect(textStyle(part(0, 'label')!)).toMatchObject({ fontSize: expected.fontSize, lineHeight: expected.lineHeight, fontWeight: expected.fontWeight, textAlign: 'center' });
  });

  test('TAB-20: a divider of comp.tabs.divider.thickness in comp.tabs.divider.color along the whole row\'s bottom, under the tabs, outside the scrolling content, hidden from assistive technology', async () => {
    await mount({ value: 'overview', scrollable: true });
    const divider = rowPart('divider')!;
    expect(viewStyle(divider)).toEqual({ position: 'absolute', left: 0, right: 0, bottom: 0, height: tokens.dividerThickness, backgroundColor: painted(tokens.dividerColor) });
    expect(painted(tokens.dividerColor)).toBe(role('outlineVariant'));
    // Drawn first (under the tabs and the indicator), and not inside the ScrollView (full width while it scrolls).
    expect(row().children[0]).toBe(divider);
    expect(row().children[1]).toBe(rowPart('scroll'));
    expect(divider.props.accessibilityElementsHidden).toBe(true);
  });

  test('TAB-21: right-to-left — the row is a flex row React Native mirrors, with logical padding; nothing in the tab is placed by a physical edge but the indicator\'s own span', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mount({ value: 'overview', items: ICONS, variant: 'secondary' });
    expect(viewStyle(rowPart('row')!).flexDirection).toBe('row');
    const style = viewStyle(tab(0));
    expect(style).toMatchObject({ paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline });
    expect(style.paddingLeft).toBeUndefined();
    expect(viewStyle(part(0, 'content')!).flexDirection).toBe('row');
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  describe.each(schemes)('$scheme', ({ provider, scheme }) => {
    test.each(['primary', 'secondary'] as const)('%s: both looks resolve their parts from their paints in this scheme, at rest and hovered; the divider from its color', async (variant) => {
      await mount({ value: 'overview', items: ICONS, variant }, provider);
      expect(viewStyle(rowPart('divider')!).backgroundColor).toBe(painted(tokens.dividerColor, scheme));
      for (const [i, selected] of [[0, true], [1, false]] as const) {
        expectTabDrawnFrom(i, selected, 'enabled', { scheme, variant });
        await fireEvent(tab(i), 'hoverIn');
        expectTabDrawnFrom(i, selected, 'hovered', { scheme, variant });
        await fireEvent(tab(i), 'hoverOut');
      }
    });
  });

  test('the default values: tabs 48 / 64 tall, padding 16, gap 4, square; label in label, icons 20; no fill; selected on-surface with a primary indicator, not selected on-surface-variant', () => {
    expect(tokens).toMatchObject({ containerHeight: 48, containerHeightWithIcon: 64, containerPaddingInline: 16, containerGap: 4, containerShape: 0, labelTypescale: 'label', iconSize: 20 });
    const primary = tokens.variants.primary.enabled;
    expect(evaluatePaint(primary.selectedContainerColor, tanrei.colors.light).a).toBe(0);
    expect(painted(primary.selectedLabelColor)).toBe(role('onSurface'));
    expect(painted(primary.labelColor)).toBe(role('onSurfaceVariant'));
    expect(painted(primary.selectedActiveIndicatorColor)).toBe(role('primary'));
    expect(evaluatePaint(primary.activeIndicatorColor, tanrei.colors.light).a).toBe(0);
  });
});

describe('the system drives rendering', () => {
  test('heights, padding, gap, icon size, divider and indicator values re-valued by a layer are drawn', async () => {
    const system = withVariant('primary', { enabled: { activeIndicatorThickness: 6, activeIndicatorShape: 5, selectedActiveIndicatorColor: literal(9, 8, 7) } }, withTabs({ containerHeightWithIcon: 80, containerPaddingInline: 20, containerGap: 9, iconSize: 30, dividerThickness: 4, dividerColor: literal(1, 2, 3) }));
    await mount({ value: 'overview', items: ICONS }, { theme: 'light', system });
    expect(viewStyle(tab(0))).toMatchObject({ minHeight: 80, paddingStart: 20 });
    expect(viewStyle(part(0, 'content')!).gap).toBe(9);
    expect(viewStyle(part(0, 'icon')!).width).toBe(30);
    expect(viewStyle(rowPart('divider')!)).toMatchObject({ height: 4, backgroundColor: formatColor(literal(1, 2, 3) as never) });
    expect(viewStyle(part(0, 'indicator')!)).toMatchObject({ height: 6, borderTopLeftRadius: 5, backgroundColor: formatColor(literal(9, 8, 7) as never) });
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(tabsSubject);

  test('every fixture holds tab items with a value and a label (TAB-14\'s verify)', () => {
    for (const fixture of spec.fixtures) {
      expect(fixture.items?.length).toBeGreaterThan(1);
      for (const item of fixture.items ?? []) expect(item).toMatchObject({ kind: 'tab', props: { value: expect.any(String), label: expect.any(String) } });
    }
  });
});
