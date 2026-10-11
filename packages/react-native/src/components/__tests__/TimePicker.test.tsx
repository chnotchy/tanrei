// TimePicker — presentation, focus, closing, the pending time, the display, the period, the dial, the keyboard, text
// entry, layout, motion, states, accessibility, locale, token binding and fixture baselines. Cases come from
// specs/time-picker.spec.json; every behaviour id is cited by the test that covers it.
import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, TextInput, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreTimePickerCondition, TanreiPaint, TanreiScheme, TanreiSystem, TanreiTimePickerTokens } from '../../generated/vocabulary';
import { hourText, localeHourCycle, periodNames, periodPlace, timeSeparator } from '../../primitives/clock';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, fixtureElement, textStyle, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resolveElevation } from '../../theme/elevation';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { TimePicker, TimePickerSurface, type TimePickerProps, type TimePickerSurfaceProps } from '../TimePicker';
import { acme } from './__fixtures__/acme';
import { timePickerSubject } from './TimePicker.subject';

const spec = loadSpec('time-picker');
const tokens: TanreiTimePickerTokens = tanrei.components.timePicker;
const ID = 'tp';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const withPicker = (overrides: Partial<TanreiTimePickerTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'timePicker', overrides);
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
const sizeOf = (typescale: Parameters<ReturnType<typeof createTanreiTheme>['text']>[0], system: TanreiSystem = tanrei) => createTanreiTheme(system, 'light').text(typescale).fontSize;

const q = (name: string) => screen.queryByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const container = () => q('')!;
const texts = (node: Instance | null): string[] => {
  const out: string[] = [];
  const walk = (each: unknown) => {
    if (typeof each === 'string') out.push(each);
    else if (each && typeof each === 'object' && 'children' in (each as object)) for (const child of (each as { children: unknown[] }).children ?? []) walk(child);
  };
  walk(node);
  return out;
};
const textOf = (node: Instance | null) => texts(node).join('');
const key = async (name: string, extra: Record<string, unknown> = {}) => {
  const preventDefault = jest.fn();
  await fireEvent(container(), 'keyDown', { nativeEvent: { key: name, ...extra }, preventDefault });
  return preventDefault;
};
const press = (node: Instance) => fireEvent(node, 'press', { nativeEvent: { target: 1 } });
const focusSpy = () => jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
const lastFocused = (spy: jest.SpyInstance) => (spy.mock.contexts.at(-1) as { props?: { testID?: string } } | undefined)?.props?.testID;
const inputFocus = () => TextInput.prototype.focus as unknown as jest.Mock;
const selectorValue = (which: 'hour' | 'minute') => q(which)!.props.accessibilityValue.text as string;

/** `Animated.timing` that runs until the test finishes it (Jest's native driver would end it at once). */
function stubTiming() {
  const started: { config: Animated.TimingAnimationConfig; done?: (result: { finished: boolean }) => void }[] = [];
  jest.spyOn(Animated, 'timing').mockImplementation((_value, config) => {
    const entry: (typeof started)[number] = { config };
    started.push(entry);
    return {
      start: (done?: (result: { finished: boolean }) => void) => {
        entry.done = done;
      },
      stop: () => undefined,
      reset: () => undefined,
    } as Animated.CompositeAnimation;
  });
  return {
    configs: () => started.map((each) => each.config),
    finishAll: () =>
      act(async () => {
        for (const each of started.splice(0)) each.done?.({ finished: true });
      }),
  };
}

/** In place (the fixtures' presentation): the scrim and the centred container on a 480 × 640 stage. */
function mount(props: Partial<TimePickerSurfaceProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }, stage = { width: 480, height: 640 }) {
  return render(
    <TanreiProvider {...provider}>
      <View style={stage}>
        <TimePickerSurface testID={ID} value="07:30" hourCycle="h12" locale="en-US" {...props} />
      </View>
    </TanreiProvider>,
  );
}
async function mountPicker(props: Partial<TimePickerProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  const element = (visible: boolean, extra: Partial<TimePickerProps> = {}) => (
    <TanreiProvider {...provider}>
      <TimePicker testID={ID} visible={visible} value="07:30" hourCycle="h12" locale="en-US" {...props} {...extra} />
    </TanreiProvider>
  );
  const view = await render(element(true));
  return { view, element };
}

/** A selector's container, label, outline and opacity from one state's tokens of its condition (TMP-9, TMP-17). */
function expectSelectorDrawnFrom(which: 'hour' | 'minute', condition: TanreiCoreTimePickerCondition, state: Exclude<InteractionState, 'disabled'>, system: TanreiSystem = tanrei, scheme: TanreiScheme = 'light') {
  const from = system.components.timePicker;
  const tone = from.conditions[condition][state];
  expect(viewStyle(q(which)!).backgroundColor).toBe(fill(tone.selectorContainerColor, scheme, system));
  expect(textStyle(q(`${which}.label`)!).color).toBe(painted(tone.selectorLabelColor, scheme, system));
  const outline = q(`${which}.outline`);
  if (evaluatePaint(tone.selectorOutlineColor, system.colors[scheme]).a === 0) expect(outline).toBeNull();
  else expect(viewStyle(outline!)).toMatchObject({ borderColor: painted(tone.selectorOutlineColor, scheme, system), borderWidth: tone.selectorOutlineWidth });
  expect(viewStyle(q(which)!).opacity).toBe({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity }[state]);
}
function expectSegmentDrawnFrom(index: 0 | 1, condition: TanreiCoreTimePickerCondition, state: Exclude<InteractionState, 'disabled'>, system: TanreiSystem = tanrei) {
  const tone = system.components.timePicker.conditions[condition][state];
  expect(viewStyle(q(`period.${index}`)!).backgroundColor).toBe(fill(tone.periodContainerColor, 'light', system));
  expect(textStyle(q(`period.${index}.label`)!).color).toBe(painted(tone.periodLabelColor, 'light', system));
}

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
beforeEach(() => {
  jest.clearAllMocks();
  reduceMotion(true);
  resetLookupReports();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  development(true);
});
const reports = () => jest.mocked(console.warn).mock.calls.map(([message]) => String(message)).filter((message) => message.includes('TimePicker'));

// ---------------------------------------------------------------------------------------------------------------

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation: TimePicker, its props, onChange and onClose', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(TimePicker.name);
    expect(platform.props).toEqual(Object.fromEntries(spec.props.map((prop) => [prop.name, prop.name === 'open' ? 'visible' : prop.name])));
    expect(platform.events).toEqual({ change: 'onChange', close: 'onClose' });
    expect(platform.items).toBeUndefined();
  });

  test('the conditions are the token axis: unselected and selected; hourCycle, entryMode, unit and layout are closed', () => {
    expect(Object.keys(tokens.conditions)).toEqual(['unselected', 'selected']);
    expect(spec.props.filter((prop) => prop.axis)).toEqual([]);
  });

  test('defaults follow the spec: closed (nothing, no Modal); the locale\'s clock, the dial, the hour, auto; every word its English default', async () => {
    const view = await render(
      <TanreiProvider theme="light">
        <TimePicker testID={ID} />
      </TanreiProvider>,
    );
    expect(q('modal')).toBeNull();
    await view.rerender(
      <TanreiProvider theme="light">
        <TimePicker testID={ID} visible value="19:05" locale="en-US" />
      </TanreiProvider>,
    );
    const defaults = Object.fromEntries(spec.props.filter((prop) => prop.type === 'string' && prop.default !== '').map((prop) => [prop.name, prop.default]));
    expect(defaults).toEqual({ label: 'Select time', hourLabel: 'Hour', minuteLabel: 'Minute', confirmLabel: 'OK', cancelLabel: 'Cancel', textEntryLabel: 'Switch to text entry', dialEntryLabel: 'Switch to clock', invalidText: 'Enter a valid time' });
    expect(container().props.accessibilityLabel).toBe(defaults.label);
    expect(textOf(q('label'))).toBe(defaults.label);
    expect(q('hour')!.props.accessibilityLabel).toBe(defaults.hourLabel);
    expect(q('minute')!.props.accessibilityLabel).toBe(defaults.minuteLabel);
    expect(q('entry-toggle')!.props.accessibilityLabel).toBe(defaults.textEntryLabel);
    expect(textOf(q('cancel'))).toBe(defaults.cancelLabel);
    expect(textOf(q('confirm'))).toBe(defaults.confirmLabel);
    // en-US prefers the 12-hour clock; the dial shows hours; the hour selector is selected.
    expect(selectorValue('hour')).toBe('7 PM');
    expect(q('hour.outline')).not.toBeNull();
    expect(q('columns')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('presentation, focus and closing (TMP-1 … TMP-5, TMP-25)', () => {
  test('TMP-1: open presents a transparent Modal (its own window) without the platform\'s animation, the scrim over the whole window, the container in its color, elevation and corners, centred, a modal dialog', async () => {
    await mountPicker();
    expect(q('modal')!.props).toMatchObject({ visible: true, transparent: true, animationType: 'none', statusBarTranslucent: true, navigationBarTranslucent: true });
    expect(viewStyle(q('scrim')!)).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: painted(tokens.scrimColor) });
    expect(q('scrim')!.props.importantForAccessibility).toBe('no-hide-descendants');
    const level = resolveElevation(tanrei.elevation[tokens.containerElevation], (name) => role(name));
    expect(viewStyle(container())).toMatchObject({ backgroundColor: painted(tokens.containerColor), borderRadius: tokens.containerShape, boxShadow: level.boxShadow, maxHeight: 800 - 2 * tokens.containerMargin });
    expect(container().props['aria-modal']).toBe(true);
    expect(viewStyle(q('area')!)).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
  });

  test('TMP-1: focus stays in — Tab from the last element (OK, or Cancel while OK is disabled) moves to the first (the hour selector; the period where the locale writes it first), Shift+Tab back', async () => {
    const focus = focusSpy();
    const view = await mount();
    await fireEvent(q('confirm')!, 'focus');
    expect(await key('Tab')).toHaveBeenCalled();
    expect(lastFocused(focus)).toBe(`${ID}.hour`);
    await fireEvent(q('hour')!, 'focus');
    expect(await key('Tab', { shiftKey: true })).toHaveBeenCalled();
    expect(lastFocused(focus)).toBe(`${ID}.confirm`);
    await fireEvent(q('minute')!, 'focus');
    expect(await key('Tab')).not.toHaveBeenCalled();
    await view.unmount();
    await mount({ locale: 'ja-JP' });
    await fireEvent(q('confirm')!, 'focus');
    await key('Tab');
    expect(lastFocused(focus)).toBe(`${ID}.period.0`);
  });

  test('TMP-2: opening moves focus at once to the selector of unit (hour by default, minute when unit is minute), or to the hour field in text entry — keyboard and screen reader', async () => {
    reduceMotion(false);
    const focus = focusSpy();
    const announce = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => undefined);
    const first = await mountPicker();
    expect(lastFocused(focus)).toBe(`${ID}.hour`);
    expect(announce).toHaveBeenCalledWith(expect.objectContaining({ props: expect.objectContaining({ testID: `${ID}.hour` }) }), 'focus');
    await first.view.unmount();
    const second = await mountPicker({ unit: 'minute' });
    expect(lastFocused(focus)).toBe(`${ID}.minute`);
    expect(q('minute.outline')).not.toBeNull();
    await second.view.unmount();
    await mountPicker({ entryMode: 'text' });
    expect((inputFocus().mock.contexts.at(-1) as { props: { testID: string } }).props.testID).toBe(`${ID}.field.hour.input`);
  });

  test('TMP-3: closing takes the picker away after its exit motion; focus goes back where the platform returns it (README)', async () => {
    const { view, element } = await mountPicker();
    await view.rerender(element(false));
    await wait(tokens.motionCloseDuration + 50);
    expect(q('modal')).toBeNull();
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('### `TimePicker` and `TimePickerSurface`');
    expect(readme).toMatch(/TimePicker[\s\S]*goes where the platform returns it — React Native cannot tell which element had it/);
  });

  test('TMP-4: Escape, Android\'s back (the Modal\'s request), the iOS escape gesture, a press on the scrim and Cancel each ask to close once with their reason and commit nothing', async () => {
    const onClose = jest.fn();
    const onChange = jest.fn();
    await mountPicker({ onClose, onChange });
    await fireEvent(q('hour')!, 'focus');
    await key('ArrowUp');
    expect(await key('Escape')).toHaveBeenCalled();
    await fireEvent(q('modal')!, 'requestClose');
    await fireEvent(container(), 'accessibilityEscape');
    await fireEvent.press(q('scrim.press')!);
    await fireEvent.press(q('cancel')!);
    expect(onClose.mock.calls).toEqual([[{ reason: 'escape' }], [{ reason: 'back' }], [{ reason: 'back' }], [{ reason: 'outside' }], [{ reason: 'cancel' }]]);
    expect(onChange).not.toHaveBeenCalled();
    const close = (spec as unknown as { events: { name: string; description: string }[] }).events.find((event) => event.name === 'close')!;
    for (const reason of ['escape', 'back', 'outside', 'cancel', 'confirm']) expect(close.description).toContain(reason);
  });

  test('TMP-5: the pending time starts as value, ignores a value set while open, and is committed by OK — change once ("HH:MM") when it differs, then close with confirm', async () => {
    const calls: string[] = [];
    const onChange = jest.fn((value: string) => calls.push(`change:${value}`));
    const onClose = jest.fn(({ reason }) => calls.push(`close:${reason}`));
    const { view, element } = await mountPicker({ onChange, onClose });
    await fireEvent(q('minute')!, 'focus');
    await key('ArrowUp');
    expect(selectorValue('minute')).toBe('31');
    await view.rerender(element(true, { value: '10:00' }));
    expect(selectorValue('hour')).toBe('7 AM');
    await fireEvent.press(q('confirm')!);
    expect(calls).toEqual(['change:07:31', 'close:confirm']);
    calls.length = 0;
    await view.rerender(element(false));
    await view.rerender(element(true, { value: '07:30' }));
    await fireEvent.press(q('confirm')!);
    expect(calls).toEqual(['close:confirm']);
  });

  test('TMP-5: OK compares the pending time with value as it is at OK — a value the product set while open leaves the pending time as it was, and OK commits the time the person saw', async () => {
    const calls: string[] = [];
    const onChange = jest.fn((value: string) => calls.push(`change:${value}`));
    const onClose = jest.fn(({ reason }) => calls.push(`close:${reason}`));
    const { view, element } = await mountPicker({ onChange, onClose });
    // The person changes nothing; the product sets value while the picker is open.
    await view.rerender(element(true, { value: '10:00' }));
    expect(selectorValue('hour')).toBe('7 AM');
    expect(selectorValue('minute')).toBe('30');
    await fireEvent.press(q('confirm')!);
    expect(calls).toEqual(['change:07:30', 'close:confirm']);
    calls.length = 0;
    // A value set while open that equals the pending time: nothing to commit.
    await view.rerender(element(false, { value: '10:00' }));
    await view.rerender(element(true, { value: '10:00' }));
    await fireEvent(q('minute')!, 'focus');
    await key('ArrowUp');
    await view.rerender(element(true, { value: '10:01' }));
    expect(selectorValue('hour')).toBe('10 AM');
    expect(selectorValue('minute')).toBe('01');
    await fireEvent.press(q('confirm')!);
    expect(calls).toEqual(['close:confirm']);
  });

  test('TMP-5: while value is empty the picker starts from the device\'s current time to the minute, and OK commits it', async () => {
    jest.useFakeTimers({ now: new Date(2031, 4, 6, 18, 42, 55), doNotFake: ['queueMicrotask', 'nextTick', 'setImmediate', 'setTimeout', 'clearTimeout'] });
    try {
      const onChange = jest.fn();
      await mount({ value: '', onChange });
      expect(selectorValue('hour')).toBe('6 PM');
      expect(selectorValue('minute')).toBe('42');
      await fireEvent.press(q('confirm')!);
      expect(onChange).toHaveBeenCalledWith('18:42');
    } finally {
      jest.useRealTimers();
    }
  });

  test('TMP-25: it fades its scrim and container in while growing from comp.time-picker.motion.enter-scale over the open motion, and fades both out (without growing back) over the close motion before the Modal goes', async () => {
    reduceMotion(false);
    const running = stubTiming();
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const { view, element } = await mountPicker();
    await wait(0);
    expect(running.configs()).toContainEqual(expect.objectContaining({ toValue: 1, duration: tokens.motionOpenDuration, useNativeDriver: true }));
    expect(interpolate).toHaveBeenCalledWith({ inputRange: [0, 1], outputRange: [tokens.motionEnterScale, 1] });
    await running.finishAll();
    await view.rerender(element(false));
    await wait(0);
    expect(running.configs()).toContainEqual(expect.objectContaining({ toValue: 0, duration: tokens.motionCloseDuration }));
    expect(viewStyle(container()).transform).toEqual([{ scale: 1 }]);
    expect(q('modal')).not.toBeNull();
    await running.finishAll();
    expect(q('modal')).toBeNull();
  });

  test('TMP-25: where motion is reduced it fades without growing, and on Android it appears at once', async () => {
    const first = await mountPicker();
    await wait(0);
    expect(viewStyle(container()).transform).toEqual([{ scale: 1 }]);
    await first.view.unmount();
    jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    const timing = jest.spyOn(Animated, 'timing');
    await mountPicker();
    await wait(0);
    expect(timing).not.toHaveBeenCalledWith(expect.any(Animated.Value), expect.objectContaining({ duration: tokens.motionOpenDuration }));
    expect(viewStyle(container()).opacity).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('the clock, the display and the period (TMP-6, TMP-9 … TMP-11, TMP-27, TMP-28)', () => {
  test('TMP-6: h12 runs 1 to 12 with a period, h23 00 to 23 without one; locale takes the locale\'s clock (a 0–11 locale as h12, a 1–24 one as h23); value is 24-hour in every cycle', async () => {
    const view = await mount({ value: '00:15', hourCycle: 'h12' });
    expect(textOf(q('hour.label'))).toBe('12');
    expect(selectorValue('hour')).toBe('12 AM');
    await view.unmount();
    const other = await mount({ value: '00:15', hourCycle: 'h23' });
    expect(textOf(q('hour.label'))).toBe('00');
    expect(q('period')).toBeNull();
    await other.unmount();
    expect([localeHourCycle('en-US'), localeHourCycle('de-DE'), localeHourCycle('ja-JP'), localeHourCycle('ko-KR')]).toEqual(['h12', 'h23', 'h23', 'h12']);
    await mount({ value: '13:00', hourCycle: 'locale', locale: 'de-DE' });
    expect(textOf(q('hour.label'))).toBe('13');
  });

  test('TMP-9: the hour selector, the separator and the minute selector, selector.gap apart and always left to right; each box at least its size, its corners, its condition\'s colors and edge, the value centred in selector.label.typescale; the hour as the locale writes it and the minute with two digits', async () => {
    const view = await mount({ value: '07:05' });
    const time = q('time')!;
    expect(viewStyle(time)).toMatchObject({ flexDirection: 'row', gap: tokens.selectorGap, direction: 'ltr' });
    expect((time.children as Instance[]).map((each) => each.props.testID)).toEqual([`${ID}.hour`, `${ID}.separator`, `${ID}.minute`]);
    expect(viewStyle(q('hour')!)).toMatchObject({ minWidth: tokens.selectorContainerWidth, minHeight: tokens.selectorContainerHeight, borderRadius: tokens.selectorContainerShape });
    expect(textStyle(q('hour.label')!)).toMatchObject({ fontSize: sizeOf(tokens.selectorLabelTypescale), textAlign: 'center' });
    expect(textOf(q('hour.label'))).toBe('7');
    expect(textOf(q('minute.label'))).toBe('05');
    expectSelectorDrawnFrom('hour', 'selected', 'enabled');
    expectSelectorDrawnFrom('minute', 'unselected', 'enabled');
    expect(textStyle(q('separator')!)).toMatchObject({ color: painted(tokens.separatorColor), fontSize: sizeOf(tokens.separatorTypescale) });
    expect(textOf(q('separator'))).toBe(':');
    await view.unmount();
    await mount({ value: '07:05', hourCycle: 'h23' });
    expect(textOf(q('hour.label'))).toBe('07');
    expect(hourText('ja-JP', 'h23', 7)).toBe('7');
  });

  test('TMP-10: with the 12-hour clock the period selector sits where the locale\'s pattern writes the period — after the minutes in en, before the hour in ja, zh and ko — period.margin-inline-start from its neighbour: two segments, before noon first, bordered and divided in the outline', async () => {
    expect([periodPlace('en-US'), periodPlace('ja-JP'), periodPlace('zh-CN'), periodPlace('ko-KR'), periodPlace('de-DE')]).toEqual(['after', 'before', 'before', 'before', 'after']);
    const view = await mount();
    const display = q('display')!;
    expect((display.children as Instance[]).map((each) => each.props.testID)).toEqual([`${ID}.time`, `${ID}.period`]);
    expect(viewStyle(q('period')!)).toMatchObject({ marginStart: tokens.periodMarginInlineStart, borderRadius: tokens.periodContainerShape, minHeight: Math.max(tokens.selectorContainerHeight, tanrei.measure.target.touch), alignSelf: 'stretch' });
    expect(texts(q('period')).filter((text) => text === 'AM' || text === 'PM')).toEqual(['AM', 'PM']);
    expect(viewStyle(q('period.0')!)).toMatchObject({ minWidth: Math.max(tokens.periodContainerWidth, tanrei.measure.target.touch), borderTopStartRadius: tokens.periodContainerShape, borderTopEndRadius: 0 });
    expect(viewStyle(q('period.1')!)).toMatchObject({ borderTopStartRadius: 0, borderBottomEndRadius: tokens.periodContainerShape });
    expect(viewStyle(q('period.outline')!)).toMatchObject({ borderWidth: tokens.periodOutlineWidth, borderColor: painted(tokens.periodOutlineColor), borderRadius: tokens.periodContainerShape });
    expect(viewStyle(q('period.divider')!)).toMatchObject({ width: tokens.periodOutlineWidth, backgroundColor: painted(tokens.periodOutlineColor), start: '50%' });
    expect(textStyle(q('period.0.label')!).fontSize).toBe(sizeOf(tokens.periodLabelTypescale));
    expectSegmentDrawnFrom(0, 'selected', 'enabled');
    expectSegmentDrawnFrom(1, 'unselected', 'enabled');
    await view.unmount();
    await mount({ locale: 'ja-JP' });
    expect((q('display')!.children as Instance[]).map((each) => each.props.testID)).toEqual([`${ID}.period`, `${ID}.time`]);
    expect(viewStyle(q('period')!)).toMatchObject({ marginEnd: tokens.periodMarginInlineStart });
    expect(texts(q('period')).filter((text) => text.length === 2)).toEqual(['午前', '午後']);
  });

  test('TMP-10: in text entry the period and the separator follow the fields when they grow — enlarged text, or a label that wraps and reserves room above an outlined field — from their containers\' top, as tall as they are', async () => {
    const target = tanrei.measure.target.touch;
    const large = tanrei.components.textField.sizes.large;
    const floatedLine = (tanrei.typescale[large.labelFloatedTypescale] as { lineHeight: number }).lineHeight;
    const separatorBox = () => viewStyle(q('fields.separator')!.parent!);
    /** Plays the layout a device reports for a field's container: where it sits in the field and how tall it is. */
    const layOut = async (which: 'hour' | 'minute', top: number, height: number) => fireEvent(q(`field.${which}.container`)!, 'layout', { nativeEvent: { layout: { x: 0, y: top, width: tokens.selectorContainerWidth, height } } });

    // Enlarged text: both fields grow to 80; the period and the separator grow with them, and the period no longer needs a
    // hit area beyond its drawing.
    const enlarged = await mount({ entryMode: 'text' });
    expect(viewStyle(q('period')!).minHeight).toBe(large.containerHeight);
    await layOut('hour', 0, 80);
    await layOut('minute', 0, 80);
    expect(viewStyle(q('period')!)).toMatchObject({ minHeight: 80, alignSelf: 'flex-start' });
    expect(viewStyle(q('period.0')!).minHeight).toBe(80);
    expect(q('period.0')!.props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(separatorBox()).toMatchObject({ minHeight: 80, justifyContent: 'center' });
    expect(viewStyle(q('period')!).marginTop).toBeUndefined();
    await enlarged.unmount();

    // A label that wraps: the hour field's floated label takes two lines, so it reserves one line above its container
    // (TXF-13). The minute field's container is aligned with it, and the period and the separator start there too.
    for (const locale of ['en-US', 'ja-JP']) {
      const view = await mount({ entryMode: 'text', locale, hourLabel: 'Hour of the day' });
      const lines = (widths: number[], height: number) => widths.map((width, index) => ({ x: 0, y: index * height, width, height, text: '', ascender: 0, descender: 0, capHeight: 0, xHeight: 0 }));
      await fireEvent(q('field.hour.label')!, 'textLayout', { nativeEvent: { lines: lines([60, 40], floatedLine) } });
      await fireEvent(q('field.hour.label.measure.resting')!, 'textLayout', { nativeEvent: { lines: lines([70], 20) } });
      await fireEvent(q('field.hour.label.measure.floated')!, 'textLayout', { nativeEvent: { lines: lines([60, 40], floatedLine) } });
      const box = viewStyle(q('field.hour.container')!);
      expect(box.marginTop).toBe(floatedLine);
      await layOut('hour', box.marginTop as number, box.minHeight as number);
      await layOut('minute', 0, large.containerHeight);
      expect(viewStyle(q('field.minute')!).marginTop).toBe(floatedLine);
      expect(viewStyle(q('field.hour')!).marginTop).toBeUndefined();
      expect(viewStyle(q('period')!)).toMatchObject({ marginTop: floatedLine, minHeight: large.containerHeight });
      expect(q('period.0')!.props.hitSlop).toEqual({ top: (target - large.containerHeight) / 2, bottom: (target - large.containerHeight) / 2, left: 0, right: 0 });
      expect(separatorBox()).toMatchObject({ marginTop: floatedLine, minHeight: large.containerHeight });
      await view.unmount();
    }
  });

  test('TMP-11: a period segment chosen by press (or Enter / Space) keeps the hour\'s number; Left and Right Arrow move focus to the other segment and choose it; the selector is one tab stop, the chosen segment', async () => {
    const focus = focusSpy();
    await mount({ value: '07:30' });
    expect(q('period.0')!.props.focusable).toBe(true);
    expect(q('period.1')!.props.focusable).toBe(false);
    await press(q('period.1')!);
    expect(selectorValue('hour')).toBe('7 PM');
    expect(q('period.1')!.props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent(q('period.1')!, 'focus');
    expect(await key('ArrowLeft')).toHaveBeenCalled();
    expect(selectorValue('hour')).toBe('7 AM');
    expect(lastFocused(focus)).toBe(`${ID}.period.0`);
    await key('ArrowRight');
    expect(selectorValue('hour')).toBe('7 PM');
    expect(lastFocused(focus)).toBe(`${ID}.period.1`);
  });

  test('TMP-27: the period names, the digits, the separator and the preferred clock come from locale', async () => {
    expect(periodNames('en-US')).toEqual(['AM', 'PM']);
    expect(periodNames('ja-JP')).toEqual(['午前', '午後']);
    expect(timeSeparator('fi-FI')).toBe('.');
    const view = await mount({ locale: 'ar-EG', value: '07:05' });
    expect(textOf(q('hour.label'))).toBe('٧');
    expect(textOf(q('minute.label'))).toBe('٠٥');
    await view.unmount();
    await mount({ locale: 'fi-FI', hourCycle: 'locale', value: '07:05' });
    expect(textOf(q('separator'))).toBe('.');
    expect(q('period')).toBeNull();
  });

  test('TMP-28: right to left the period\'s place mirrors with the row, while the hour, the separator and the minute stay left to right and the dial runs clockwise', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mount();
    expect(viewStyle(q('display')!).flexDirection).toBe('row');
    expect(viewStyle(q('time')!).direction).toBe('ltr');
    expect(viewStyle(q('dial')!).direction).toBe('ltr');
    expect(viewStyle(q('period')!).marginStart).toBe(tokens.periodMarginInlineStart);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('the dial (TMP-12 … TMP-15)', () => {
  const size = tokens.dialContainerSize;
  const center = size / 2;
  const outer = center - tokens.dialPadding - tokens.dialHandleSize / 2;
  const inner = outer - tokens.dialHandleSize;
  const settle = (value: number) => Math.round(value * 1000) / 1000;
  const at = (angle: number, radius: number) => ({ left: settle(center + radius * Math.sin((angle * Math.PI) / 180) - tokens.dialHandleSize / 2), top: settle(center - radius * Math.cos((angle * Math.PI) / 180) - tokens.dialHandleSize / 2) });
  const numberBoxes = () => (q('dial.numbers')!.children as Instance[]).map((box) => ({ text: textOf(box), ...viewStyle(box) }));

  test('TMP-12: a circle of dial.container.size in its color with twelve numbers clockwise from the top — 12, 1 … 11 on the 12-hour hour dial; 00 … 11 outside and 12 … 23 inside on the 24-hour one; 00 … 55 on the minute dial — on the ring half the size less the padding less half the handle, the inner ring a handle smaller', async () => {
    const view = await mount();
    expect(viewStyle(q('dial')!)).toMatchObject({ width: size, height: size, borderRadius: size / 2, backgroundColor: painted(tokens.dialContainerColor) });
    const boxes = numberBoxes();
    expect(boxes.map((box) => box.text)).toEqual(['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
    expect(boxes[0]).toMatchObject({ ...at(0, outer), width: tokens.dialHandleSize });
    expect(boxes[3]!.left).toBeCloseTo(at(90, outer).left);
    const label = (q('dial.numbers')!.children as Instance[])[0]!.children[0] as Instance;
    expect(textStyle(label)).toMatchObject({ color: painted(tokens.dialLabelColor), fontSize: sizeOf(tokens.dialLabelTypescale) });
    await view.unmount();
    const day = await mount({ hourCycle: 'h23', value: '19:30' });
    const rings = numberBoxes();
    expect(rings.map((box) => box.text)).toEqual(['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23']);
    expect(rings[12]!.top).toBeCloseTo(at(0, inner).top);
    await day.unmount();
    await mount({ unit: 'minute' });
    expect(numberBoxes().map((box) => box.text)).toEqual(['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']);
  });

  test('TMP-13: the handle of dial.handle.size in its color at the pending value, the track from the centre in its width and color, the centre dot; the number under the handle in dial.selected-label.color; a minute between fives holds a dot', async () => {
    const view = await mount({ value: '07:30' });
    expect(viewStyle(q('dial.handle')!)).toMatchObject({ ...at(210, outer), width: tokens.dialHandleSize, height: tokens.dialHandleSize, borderRadius: tokens.dialHandleSize / 2, overflow: 'hidden', backgroundColor: painted(tokens.dialHandleColor) });
    expect(viewStyle(q('dial.track')!)).toMatchObject({ left: center, width: outer, height: tokens.dialTrackWidth, backgroundColor: painted(tokens.dialTrackColor), transform: [{ rotate: '120deg' }] });
    expect(viewStyle(q('dial.center')!)).toMatchObject({ width: tokens.dialCenterSize, backgroundColor: painted(tokens.dialTrackColor) });
    const selected = (q('dial.numbers.selected')!.children as Instance[])[7]!.children[0] as Instance;
    expect(textStyle(selected).color).toBe(painted(tokens.dialSelectedLabelColor));
    expect(viewStyle(q('dial.numbers.selected')!.parent as Instance)).toMatchObject({ left: -at(210, outer).left, top: -at(210, outer).top });
    expect(q('dial.handle.dot')).toBeNull();
    await view.unmount();
    const minute = await mount({ value: '07:32', unit: 'minute' });
    expect(viewStyle(q('dial.handle')!)).toMatchObject(at(192, outer));
    expect(viewStyle(q('dial.handle.dot')!)).toMatchObject({ width: tokens.dialCenterSize, backgroundColor: painted(tokens.dialSelectedLabelColor) });
    await minute.unmount();
    // 24-hour: 12 to 23 on the inner ring, as TMP-12 places them; 00 to 11 on the outer one.
    const evening = await mount({ value: '19:30', hourCycle: 'h23' });
    expect(viewStyle(q('dial.handle')!)).toMatchObject(at(210, inner));
    expect(viewStyle(q('dial.track')!).width).toBe(inner);
    await evening.unmount();
    const noon = await mount({ value: '12:00', hourCycle: 'h23' });
    expect(viewStyle(q('dial.handle')!)).toMatchObject(at(0, inner));
    expect(viewStyle(q('dial.track')!).width).toBe(inner);
    await noon.unmount();
    await mount({ value: '00:00', hourCycle: 'h23' });
    expect(viewStyle(q('dial.handle')!)).toMatchObject(at(0, outer));
    expect(viewStyle(q('dial.track')!).width).toBe(outer);
  });

  test('TMP-14: a press or a drag sets the value nearest the pointer\'s angle without animation (the nearer ring on the 24-hour dial; any minute on the minute dial); lifting it on the hour dial shows the minute dial and moves focus from the hour selector; the dial is hidden from assistive technology', async () => {
    const focus = focusSpy();
    const view = await mount({ value: '07:30' });
    const dial = q('dial')!;
    expect(dial.props).toMatchObject({ importantForAccessibility: 'no-hide-descendants', accessibilityElementsHidden: true, pointerEvents: 'box-only' });
    await fireEvent(q('hour')!, 'focus');
    // Pointer at 3 o'clock on the outer ring.
    await fireEvent(dial, 'responderGrant', { nativeEvent: { locationX: center + outer, locationY: center } });
    expect(selectorValue('hour')).toBe('3 AM');
    await fireEvent(dial, 'responderMove', { nativeEvent: { locationX: center, locationY: center + outer } });
    expect(selectorValue('hour')).toBe('6 AM');
    await fireEvent(dial, 'responderRelease', { nativeEvent: {} });
    expect(q('minute.outline')).not.toBeNull();
    expect(lastFocused(focus)).toBe(`${ID}.minute`);
    await fireEvent(dial, 'responderGrant', { nativeEvent: { locationX: center + outer * Math.sin((42 * Math.PI) / 180), locationY: center - outer * Math.cos((42 * Math.PI) / 180) } });
    expect(selectorValue('minute')).toBe('07');
    await view.unmount();
    await mount({ value: '07:30', hourCycle: 'h23' });
    await fireEvent(q('dial')!, 'responderGrant', { nativeEvent: { locationX: center + inner, locationY: center } });
    expect(selectorValue('hour')).toBe('15');
    await fireEvent(q('dial')!, 'responderMove', { nativeEvent: { locationX: center + outer, locationY: center } });
    expect(selectorValue('hour')).toBe('03');
  });

  test('TMP-15: a key moves the handle along the shorter arc over the dial motion; a change of unit cross-fades the numbers and moves the handle over it too', async () => {
    reduceMotion(false);
    await mount({ value: '07:58', unit: 'minute' });
    await wait(0);
    const running = stubTiming();
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await fireEvent(q('minute')!, 'focus');
    await key('ArrowUp');
    await key('ArrowUp');
    await wait(0);
    expect(running.configs()).toContainEqual(expect.objectContaining({ duration: tokens.motionDialDuration, useNativeDriver: false }));
    // 58 → 00 goes forward through the top, not back around.
    expect(running.configs().some((config) => config.duration === tokens.motionDialDuration && (config.toValue as number) >= 354)).toBe(true);
    expect(interpolate.mock.calls.some(([config]) => config.outputRange.length > 100)).toBe(true);
    await running.finishAll();
    expect(viewStyle(q('dial.handle')!)).toMatchObject(at(0, outer));
    await fireEvent(q('hour')!, 'focus');
    await wait(0);
    expect(q('dial.numbers.leaving')).not.toBeNull();
    expect(running.configs()).toContainEqual(expect.objectContaining({ duration: tokens.motionDialDuration, useNativeDriver: true }));
    await running.finishAll();
    expect(q('dial.numbers.leaving')).toBeNull();
  });

  test('TMP-15: a drag moves the handle at once; where motion is reduced every change is at once', async () => {
    reduceMotion(false);
    await mount({ value: '07:30' });
    await wait(0);
    const timing = jest.spyOn(Animated, 'timing');
    await fireEvent(q('dial')!, 'responderGrant', { nativeEvent: { locationX: center + outer, locationY: center } });
    expect(timing).not.toHaveBeenCalledWith(expect.any(Animated.Value), expect.objectContaining({ duration: tokens.motionDialDuration, useNativeDriver: false }));
    expect(viewStyle(q('dial.handle')!)).toMatchObject(at(90, outer));
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('the selectors (TMP-16 … TMP-22, TMP-26)', () => {
  test('TMP-16: Up and Right one later, Down and Left one earlier, wrapping without changing the other unit or the period; Page Up / Down five minutes; Home and End the first and last value; focusing or pressing a selector shows its unit', async () => {
    const view = await mount({ value: '11:58' });
    await fireEvent(q('hour')!, 'focus');
    await key('ArrowUp');
    expect(selectorValue('hour')).toBe('12 AM');
    await key('ArrowRight');
    expect(selectorValue('hour')).toBe('1 AM');
    await key('ArrowDown');
    await key('ArrowLeft');
    expect(selectorValue('hour')).toBe('11 AM');
    await key('End');
    expect(selectorValue('hour')).toBe('12 AM');
    await key('Home');
    expect(selectorValue('hour')).toBe('1 AM');
    expect(selectorValue('minute')).toBe('58');
    await fireEvent(q('minute')!, 'focus');
    expect(q('minute.outline')).not.toBeNull();
    expect(q('hour.outline')).toBeNull();
    await key('ArrowUp');
    await key('ArrowUp');
    expect(selectorValue('minute')).toBe('00');
    expect(selectorValue('hour')).toBe('1 AM');
    await key('PageDown');
    expect(selectorValue('minute')).toBe('55');
    await key('PageUp');
    expect(selectorValue('minute')).toBe('00');
    await key('End');
    expect(selectorValue('minute')).toBe('59');
    await press(q('hour')!);
    expect(q('hour.outline')).not.toBeNull();
    await view.unmount();
    await mount({ value: '23:10', hourCycle: 'h23' });
    await fireEvent(q('hour')!, 'focus');
    await key('ArrowUp');
    expect(selectorValue('hour')).toBe('00');
    await key('End');
    expect(selectorValue('hour')).toBe('23');
  });

  test('TMP-16 / TMP-26: each selector is adjustable, named by hourLabel or minuteLabel, its value read as drawn (the hour with its period); increment and decrement do what Up and Down do; the period is a radio group; the dial is hidden', async () => {
    await mount({ value: '07:30', hourLabel: 'Hours', minuteLabel: 'Minutes' });
    const hour = q('hour')!;
    expect(hour.props).toMatchObject({ accessibilityRole: 'adjustable', accessibilityLabel: 'Hours', accessibilityValue: { text: '7 AM' }, accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }] });
    expect(q('minute')!.props).toMatchObject({ accessibilityLabel: 'Minutes', accessibilityValue: { text: '30' } });
    await fireEvent(hour, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(selectorValue('hour')).toBe('8 AM');
    await fireEvent(q('minute')!, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(selectorValue('minute')).toBe('29');
    expect(q('period')!.props.role).toBe('radiogroup');
    expect(q('period.0')!.props).toMatchObject({ role: 'radio', accessibilityLabel: 'AM', accessibilityState: { checked: true } });
    expect(q('separator')!.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(container().props).toMatchObject({ role: 'dialog', 'aria-modal': true, accessibilityLabel: 'Select time' });
  });

  const ACTIVE = ['hovered', 'focused', 'pressed'] as const;
  async function enter(node: Instance, state: InteractionState) {
    if (state === 'hovered') await fireEvent(node, 'hoverIn');
    if (state === 'focused') await fireEvent(node, 'focus');
    if (state === 'pressed') await fireEvent(node, 'pressIn');
  }

  test.each(ACTIVE)('TMP-17: a %s selector or period segment is drawn from that state\'s tokens of its condition (acme values each state apart)', async (state) => {
    await mount({}, { theme: 'light', system: acme });
    await enter(q('minute')!, state);
    // Focusing the minute selector makes it the selected one (a press does when it completes).
    expectSelectorDrawnFrom('minute', state === 'focused' ? 'selected' : 'unselected', state, acme);
    await enter(q('period.1')!, state);
    expectSegmentDrawnFrom(1, 'unselected', state, acme);
    await enter(q('period.0')!, state);
    expectSegmentDrawnFrom(0, 'selected', state, acme);
  });

  test('TMP-17: precedence is pressed over focused over hovered; focus from a press does not select focused', async () => {
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(q('hour')!, 'hoverIn');
    await fireEvent(q('hour')!, 'focus');
    expectSelectorDrawnFrom('hour', 'selected', 'focused', acme);
    await fireEvent(q('hour')!, 'pressIn');
    expectSelectorDrawnFrom('hour', 'selected', 'pressed', acme);
    await fireEvent(q('hour')!, 'pressOut');
    await wait(HOLD + 30);
    expectSelectorDrawnFrom('hour', 'selected', 'focused', acme);
    await fireEvent(q('hour')!, 'blur');
    await fireEvent(q('period.1')!, 'pressIn');
    await fireEvent(q('period.1')!, 'focus');
    await fireEvent(q('period.1')!, 'pressOut');
    await wait(HOLD + 30);
    expect(q('period.1.focus-ring')).toBeNull();
  });

  test('TMP-18: keyboard focus shows the focus ring around the selector or segment, outside the selected edge, without animation', async () => {
    await mount();
    await fireEvent(q('hour')!, 'focus');
    expect(q('hour.focus-ring')).not.toBeNull();
    expect(q('hour.outline')).not.toBeNull();
    await fireEvent(q('period.0')!, 'focus');
    expect(q('period.0.focus-ring')).not.toBeNull();
  });

  test('TMP-19: the pressed state appears at once and stays visible for sys.motion.duration.press-hold; a bare click shows it too', async () => {
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(q('period.1')!, 'pressIn');
    await fireEvent(q('period.1')!, 'pressOut');
    expectSegmentDrawnFrom(1, 'unselected', 'pressed', acme);
    await wait(HOLD + 30);
    expectSegmentDrawnFrom(1, 'unselected', 'enabled', acme);
    await press(q('period.1')!);
    expectSegmentDrawnFrom(1, 'selected', 'pressed', acme);
  });

  test('TMP-20: overlay (the default) applies the pressed tokens at once; ripple (m3-like) grows the pressed layer while the container keeps the state under the press; dim (cupertino) the pressed opacity and no layer; none answers nothing', async () => {
    const one = await mount();
    await fireEvent(q('minute')!, 'pressIn');
    expectSelectorDrawnFrom('minute', 'unselected', 'pressed');
    await one.unmount();
    reduceMotion(false);
    const measure = jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 96, 80, 100, 200));
    const two = await mount({}, { theme: 'light', system: m3Like });
    await wait(0);
    await fireEvent(q('minute')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 96, height: 80 } } });
    await fireEvent(q('minute')!, 'pressIn', { nativeEvent: { pageX: 110, pageY: 210 } });
    expect(q('minute.ripple')).not.toBeNull();
    expect(viewStyle(q('minute.ripple.wave')!).backgroundColor).toBe(painted(m3Like.components.timePicker.conditions.unselected.pressed.selectorContainerColor, 'light', m3Like));
    expect(viewStyle(q('minute')!).backgroundColor).toBe(fill(m3Like.components.timePicker.conditions.unselected.enabled.selectorContainerColor, 'light', m3Like));
    await fireEvent(q('minute')!, 'pressOut');
    await wait(HOLD + 30);
    await two.unmount();
    measure.mockRestore();
    reduceMotion(true);
    const three = await mount({}, { theme: 'light', system: cupertino });
    await fireEvent(q('period.1')!, 'pressIn');
    expect(viewStyle(q('period.1')!).opacity).toBe(cupertino.components.timePicker.pressedOpacity);
    expect(viewStyle(q('period.1')!).backgroundColor).toBe(fill(cupertino.components.timePicker.conditions.unselected.enabled.periodContainerColor, 'light', cupertino));
    await three.unmount();
    await mount({}, { theme: 'light', system: withBehavior({ pressedFeedback: 'none' }) });
    await fireEvent(q('period.1')!, 'pressIn');
    expectSegmentDrawnFrom(1, 'unselected', 'enabled');
  });

  test('TMP-21: the selectors and the segments ease their corners by the smoothing (cupertino: continuous); the focus style glow (acme) is one halo', async () => {
    const view = await mount({}, { theme: 'light', system: cupertino });
    expect(viewStyle(q('hour')!).borderCurve).toBe('continuous');
    expect(viewStyle(q('period.0')!).borderCurve).toBe('continuous');
    await view.unmount();
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(q('hour')!, 'focus');
    expect(viewStyle(q('hour.focus-ring')!).boxShadow).toBeDefined();
  });

  test('TMP-22: selectors and segments are at least sys.target.touch in each dimension (a layer with smaller ones grows them) and extend no hit area over their neighbours', async () => {
    await mount({}, { theme: 'light', system: withPicker({ selectorContainerWidth: 30, selectorContainerHeight: 30, periodContainerWidth: 20 }) });
    const target = tanrei.measure.target.touch;
    expect(viewStyle(q('hour')!)).toMatchObject({ minWidth: target, minHeight: target });
    expect(viewStyle(q('period.0')!)).toMatchObject({ minWidth: target, minHeight: target });
    expect(q('hour')!.props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(q('period.1')!.props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  test('TMP-22: in text entry the period is drawn as tall as the fields and reaches the target\'s height with a hit area extending equally above and below, never sideways; its width is still drawn at least the target', async () => {
    const target = tanrei.measure.target.touch;
    const field = tanrei.components.textField.sizes.large.containerHeight;
    expect(field).toBeLessThan(target);
    const view = await mount({ entryMode: 'text' });
    const slop = (target - field) / 2;
    for (const index of [0, 1] as const) {
      expect(viewStyle(q(`period.${index}`)!)).toMatchObject({ minHeight: field, minWidth: Math.max(tokens.periodContainerWidth, target) });
      expect(q(`period.${index}`)!.props.hitSlop).toEqual({ top: slop, bottom: slop, left: 0, right: 0 });
    }
    expect(viewStyle(q('period')!).minHeight).toBe(field);
    await view.unmount();
    // A layer whose fields reach the target draws the period at their height and extends no hit area.
    await mount({ entryMode: 'text' }, { theme: 'light', system: withComponent(tanrei, 'textField', { sizes: { ...tanrei.components.textField.sizes, large: { ...tanrei.components.textField.sizes.large, containerHeight: target + 8 } } }) });
    expect(viewStyle(q('period.0')!).minHeight).toBe(target + 8);
    expect(q('period.0')!.props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('text entry, actions and layout (TMP-7, TMP-8, TMP-23, TMP-24)', () => {
  test('TMP-23: two outlined, large, number text fields (maxLength 2) of selector.container.width, labelled hourLabel and minuteLabel, the separator between them in the fields\' input style; filled with the pending hour and minute; the period beside them', async () => {
    await mount({ entryMode: 'text', value: '07:05' });
    expect(q('dial')).toBeNull();
    expect(q('field.hour.input')!.props).toMatchObject({ accessibilityLabel: 'Hour', value: '7', keyboardType: 'decimal-pad' });
    // maxLength 2: a third digit is not taken.
    await fireEvent.changeText(q('field.minute.input')!, '123');
    expect(q('field.minute.input')!.props.value).toBe('12');
    await fireEvent.changeText(q('field.minute.input')!, '05');
    expect(q('field.minute.input')!.props).toMatchObject({ accessibilityLabel: 'Minute', value: '05' });
    expect(viewStyle(q('field.hour')!).width).toBe(tokens.selectorContainerWidth);
    const large = tanrei.components.textField.sizes.large;
    expect(textStyle(q('fields.separator')!)).toMatchObject({ color: painted(tokens.separatorColor), fontSize: sizeOf(large.inputTypescale) });
    expect(q('period')).not.toBeNull();
    // TMP-22: as tall as the fields (the target is reached by a hit area, below).
    expect(viewStyle(q('period')!).minHeight).toBe(large.containerHeight);
    // Beside the fields the period keeps its own height from the top: a field's invalidText below it never stretches it.
    expect(viewStyle(q('period')!).alignSelf).toBe('flex-start');
    await fireEvent.changeText(q('field.hour.input')!, '13');
    await fireEvent(q('field.hour.input')!, 'endEditing', { nativeEvent: { text: '13' } });
    expect(textOf(q('field.hour'))).toContain('Enter a valid time');
    expect(viewStyle(q('period')!).alignSelf).toBe('flex-start');
  });

  test('TMP-23: a whole number of the unit (ASCII or the locale\'s digits) sets the pending value; a commit of anything else, empty included, shows invalidText until the next edit; OK is disabled meanwhile; the action key moves to the minute field, then activates OK', async () => {
    const onChange = jest.fn();
    const onClose = jest.fn();
    await mount({ entryMode: 'text', value: '07:05', onChange, onClose });
    const input = (which: string) => q(`field.${which}.input`)!;
    await fireEvent.changeText(input('hour'), '9');
    await fireEvent.changeText(input('minute'), '٤٥'.replace(/./g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))));
    await fireEvent.changeText(input('hour'), '13');
    expect(q('confirm')!.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent(input('hour'), 'endEditing', { nativeEvent: { text: '13' } });
    expect(textOf(q('field.hour'))).toContain('Enter a valid time');
    await fireEvent.changeText(input('hour'), '');
    expect(textOf(q('field.hour'))).not.toContain('Enter a valid time');
    await fireEvent(input('hour'), 'endEditing', { nativeEvent: { text: '' } });
    expect(textOf(q('field.hour'))).toContain('Enter a valid time');
    await fireEvent.changeText(input('hour'), '9');
    expect(q('confirm')!.props.accessibilityState).toMatchObject({ disabled: false });
    expect(input('hour').props.returnKeyType).toBe('next');
    await fireEvent(input('hour'), 'submitEditing', { nativeEvent: { text: '9' } });
    expect((inputFocus().mock.contexts.at(-1) as { props: { testID: string } }).props.testID).toBe(`${ID}.field.minute.input`);
    await fireEvent(input('minute'), 'submitEditing', { nativeEvent: { text: '45' } });
    expect(onChange).toHaveBeenCalledWith('09:45');
    expect(onClose).toHaveBeenCalledWith({ reason: 'confirm' });
  });

  test('TMP-24: the actions row — the entry-mode toggle (standard, medium; keyboard / schedule) at the start, Cancel and OK (text Buttons, medium) at the end, actions.gap apart; the toggle switches the entry, keeps the time and moves focus', async () => {
    const focus = focusSpy();
    await mount({ value: '07:30' });
    const actions = q('actions')!;
    expect(viewStyle(actions)).toMatchObject({ flexDirection: 'row', justifyContent: 'space-between', gap: tokens.actionsGap });
    expect((actions.children as Instance[])[0]!.props.testID).toBe(`${ID}.entry-toggle`);
    expect(((actions.children as Instance[])[1]!.children as Instance[]).map((each) => each.props.testID)).toEqual([`${ID}.cancel`, `${ID}.confirm`]);
    expect(textOf(q('entry-toggle'))).toBe('keyboard');
    expect(viewStyle(q('confirm')!).minHeight).toBe(tanrei.components.button.sizes.medium.containerHeight);
    await fireEvent(q('minute')!, 'focus');
    await key('ArrowUp');
    await fireEvent.press(q('entry-toggle')!);
    expect(q('field.minute.input')!.props.value).toBe('31');
    expect(textOf(q('entry-toggle'))).toBe('schedule');
    expect(q('entry-toggle')!.props.accessibilityLabel).toBe('Switch to clock');
    expect((inputFocus().mock.contexts.at(-1) as { props: { testID: string } }).props.testID).toBe(`${ID}.field.hour.input`);
    await fireEvent.press(q('entry-toggle')!);
    expect(lastFocused(focus)).toBe(`${ID}.hour`);
    expect(selectorValue('minute')).toBe('31');
  });

  test('TMP-7: vertical stacks the label, the time and the dial, centred, container.gap apart, the actions actions.margin-block-start below, all inset by the padding; horizontal puts the label, the time and the actions at the start and the dial at the end; the label in its style and color', async () => {
    const view = await mount({ layout: 'vertical' });
    expect(viewStyle(q('top')!)).toMatchObject({ paddingTop: tokens.containerPadding, paddingHorizontal: tokens.containerPadding, paddingBottom: tokens.containerGap, alignItems: 'center' });
    expect(viewStyle(q('middle')!)).toMatchObject({ alignItems: 'center', gap: tokens.containerGap });
    expect(viewStyle(q('bottom')!)).toMatchObject({ paddingTop: tokens.actionsMarginBlockStart, paddingBottom: tokens.containerPadding });
    expect(textStyle(q('label')!)).toMatchObject({ color: painted(tokens.headerLabelColor), fontSize: sizeOf(tokens.headerLabelTypescale) });
    await view.unmount();
    await mount({ layout: 'horizontal' }, { theme: 'light' }, { width: 720, height: 480 });
    expect(viewStyle(q('columns')!)).toMatchObject({ flexDirection: 'row', gap: tokens.containerGap });
    expect(q('start')!.children.map((each) => (each as Instance).props.testID).filter(Boolean)).toEqual([`${ID}.actions`]);
    expect(viewStyle(q('end')!).justifyContent).toBe('center');
    expect(q('scroll')!.props.contentContainerStyle).toMatchObject({ padding: tokens.containerPadding });
  });

  test('TMP-7: auto is horizontal only when the room is too short for vertical and wide enough for horizontal; text entry is always vertical', async () => {
    // Each measured part's own box (RNTL would hand an event on a view without onLayout to an ancestor's handler).
    const measured = async (name: string, box: { width: number; height: number }) => {
      const holder = q(name)?.parent as Instance | null | undefined;
      if (holder?.props.onLayout) await fireEvent(holder, 'layout', { nativeEvent: { layout: { x: 0, y: 0, ...box } } });
    };
    const layOut = async (height: number, width = 720) => {
      await fireEvent(q('area')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
      await measured('label', { width: 80, height: 20 });
      await measured('display', { width: 300, height: 64 });
      await measured('actions', { width: 300, height: 36 });
    };
    const view = await mount({ layout: 'auto' }, { theme: 'light' }, { width: 720, height: 480 });
    await layOut(640);
    expect(q('columns')).toBeNull();
    await layOut(400);
    expect(q('columns')).not.toBeNull();
    await view.unmount();
    const narrow = await mount({ layout: 'auto' });
    await layOut(400, 400);
    expect(q('columns')).toBeNull();
    await narrow.unmount();
    await mount({ layout: 'horizontal', entryMode: 'text' });
    expect(q('columns')).toBeNull();
    expect(q('fields')).not.toBeNull();
  });

  test('TMP-8: the label and the actions stay while the time and the dial scroll between them when the room is short; when they alone leave no room, everything scrolls; the texts grow with enlarged text', async () => {
    await mount();
    await fireEvent(q('area')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 480, height: 300 } } });
    expect(viewStyle(container()).maxHeight).toBe(300 - 2 * tokens.containerMargin);
    expect(viewStyle(q('scroll')!)).toMatchObject({ flexShrink: 1 });
    await fireEvent(q('top')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 150 } } });
    await fireEvent(q('bottom')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 100 } } });
    expect(q('top')).not.toBeNull();
    expect(q('scroll')!.children.length).toBeGreaterThan(0);
    expect((q('scroll')!.children[0] as Instance).children.length).toBeGreaterThan(1);
    for (const text of [q('hour.label')!, q('period.0.label')!, q('label')!]) expect(text.props.allowFontScaling).toBe(true);
    expect(viewStyle(q('hour')!).height).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('reports and token binding (TMP-29)', () => {
  test('TMP-29: an unknown hourCycle, entryMode, unit or layout renders as its default and is reported once in development; release builds stay silent', async () => {
    const expected = await mount({ hourCycle: 'locale' });
    const tree = JSON.stringify(expected.toJSON());
    await expected.unmount();
    jest.mocked(console.warn).mockClear();
    const view = await mount({ hourCycle: 'h11' as never, entryMode: 'voice' as never, unit: 'second' as never, layout: 'diagonal' as never });
    expect(JSON.stringify(view.toJSON())).toBe(tree);
    for (const [what, value] of [['hourCycle', 'h11'], ['entryMode', 'voice'], ['unit', 'second'], ['layout', 'diagonal']]) expect(reports().filter((message) => message.includes(`TimePicker ${what} "${value}"`))).toHaveLength(1);
    await view.unmount();
    resetLookupReports();
    development(false);
    jest.mocked(console.warn).mockClear();
    await mount({ unit: 'second' as never, value: '7:30' });
    expect(reports()).toEqual([]);
  });

  test('TMP-29: a value that is not a 24-hour "HH:MM" is treated as empty (the device\'s time) and reported; an empty label still opens and is reported', async () => {
    jest.useFakeTimers({ now: new Date(2031, 4, 6, 9, 5), doNotFake: ['queueMicrotask', 'nextTick', 'setImmediate', 'setTimeout', 'clearTimeout'] });
    try {
      const view = await mount({ value: '7:30pm' });
      expect(selectorValue('hour')).toBe('9 AM');
      expect(reports().some((message) => message.includes('"7:30pm"'))).toBe(true);
      await view.unmount();
      jest.mocked(console.warn).mockClear();
      await mount({ label: '' });
      expect(container().props.accessibilityLabel).toBeUndefined();
      expect(reports().some((message) => message.includes('empty label'))).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  test('the default values: surface-bright at level3, corner.large, padding 24; 80 × 64 selectors in display; the selected edge primary 2; the period chosen primary; the dial surface-dim, 240, a 36 primary handle', () => {
    expect(tokens).toMatchObject({ containerElevation: 'level3', containerShape: tanrei.shape.large, containerPadding: 24, selectorContainerWidth: 80, selectorContainerHeight: 64, selectorLabelTypescale: 'display', dialContainerSize: 240, dialHandleSize: 36 });
    expect(painted(tokens.conditions.selected.enabled.selectorOutlineColor)).toBe(role('primary'));
    expect(tokens.conditions.selected.enabled.selectorOutlineWidth).toBe(2);
    expect(painted(tokens.conditions.selected.enabled.periodContainerColor)).toBe(role('primary'));
    expect(painted(tokens.dialContainerColor)).toBe(role('surfaceDim'));
    expect(painted(tokens.dialHandleColor)).toBe(role('primary'));
  });

  test('the dark scheme draws the dark values', async () => {
    await mount({}, { theme: 'dark' });
    expectSelectorDrawnFrom('hour', 'selected', 'enabled', tanrei, 'dark');
    expect(viewStyle(q('dial')!).backgroundColor).toBe(painted(tokens.dialContainerColor, 'dark'));
  });

  test('values re-valued by a layer are drawn', async () => {
    const lime: TanreiPaint = { kind: 'literal', r: 0.5, g: 1, b: 0, a: 1 };
    await mount({}, { theme: 'light', system: withPicker({ dialContainerSize: 200, dialHandleColor: lime, selectorGap: 9, containerShape: 3 }) });
    expect(viewStyle(q('dial')!)).toMatchObject({ width: 200, height: 200 });
    expect(viewStyle(q('dial.handle')!).backgroundColor).toBe(formatColor({ r: 0.5, g: 1, b: 0, a: 1 }));
    expect(viewStyle(q('time')!).gap).toBe(9);
    expect(viewStyle(container()).borderRadius).toBe(3);
  });

  test('every fixture is open and sets locale and value, so every platform draws the same time', () => {
    for (const fixture of spec.fixtures) expect(fixture.props).toMatchObject({ open: true, locale: expect.any(String), value: expect.any(String) });
  });

  test('the in-place surface is the picker\'s own drawing: the Modal holds the same container', async () => {
    const fixture = spec.fixtures.find((each) => each.id === 'dial-hour')!;
    await render(fixtureElement(timePickerSubject, fixture, { theme: 'light' }, { testID: ID }));
    const inPlace = viewStyle(container());
    await render(
      <TanreiProvider theme="light">
        <TimePicker visible testID="live" value="07:30" hourCycle="h12" locale="en-US" />
      </TanreiProvider>,
    );
    const live = viewStyle(screen.getByTestId('live', { includeHiddenElements: true }));
    expect({ ...live, opacity: undefined, transform: undefined, maxHeight: undefined, maxWidth: undefined }).toEqual({ ...inPlace, opacity: undefined, transform: undefined, maxHeight: undefined, maxWidth: undefined });
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(timePickerSubject);
});
