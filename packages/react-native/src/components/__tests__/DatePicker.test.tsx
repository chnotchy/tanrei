// DatePicker — presentation, focus, closing, choosing, the grid, the keyboard, the year view, text entry, locale,
// motion, states, accessibility, token binding and fixture baselines. Cases come from specs/date-picker.spec.json; every
// behaviour id is cited by the test that covers it.
import fs from 'node:fs';
import path from 'node:path';
import type { RefObject } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, BackHandler, Dimensions, TextInput, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreDatePickerCondition, TanreiDatePickerTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import { localeFirstDay, numericDatePattern, numericDateText, parseNumericDate, regionOf } from '../../primitives/calendar';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, fixtureElement, textStyle, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resolveElevation } from '../../theme/elevation';
import { iconFamily } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { DatePicker, DatePickerSurface, type DatePickerAnchor, type DatePickerProps, type DatePickerSurfaceProps } from '../DatePicker';
import { acme } from './__fixtures__/acme';
import { datePickerSubject } from './DatePicker.subject';

const spec = loadSpec('date-picker');
const tokens: TanreiDatePickerTokens = tanrei.components.datePicker;
const ID = 'dp';
const TODAY = '2026-09-24';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const withPicker = (overrides: Partial<TanreiDatePickerTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'datePicker', overrides);
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
const sizeOf = (typescale: Parameters<ReturnType<typeof createTanreiTheme>['text']>[0]) => createTanreiTheme(tanrei, 'light').text(typescale).fontSize;

const q = (name: string) => screen.queryByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const container = () => q('')!;
const day = (iso: string) => q(`day.${iso}`)!;
const dayPart = (iso: string, name: string) => q(`day.${iso}.${name}`);
const year = (n: number) => q(`year.${n}`)!;
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
/**
 * `Animated.timing` that runs until the test finishes it: Jest's native driver ends an animation at once, which would
 * hide what is drawn while it moves. `finishAll` ends every animation started so far, as the frame loop would.
 */
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

/** In place (the fixtures' presentation): a modal picker's scrim and centred container on a 480 × 640 stage. */
function mount(props: Partial<DatePickerSurfaceProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <View style={{ width: 480, height: 640 }}>
        <DatePickerSurface testID={ID} today={TODAY} locale="en-US" {...props} />
      </View>
    </TanreiProvider>,
  );
}
/** As a product opens it: a modal picker in its Modal, a docked one in TanreiProvider's overlay layer below an anchor. */
const ANCHOR = { x: 20, y: 100, width: 200, height: 56 };
function anchorRef(box = ANCHOR): RefObject<DatePickerAnchor> & { current: { measureInWindow: jest.Mock; focus: jest.Mock } } {
  return { current: { measureInWindow: jest.fn((callback) => callback(box.x, box.y, box.width, box.height)), focus: jest.fn() } };
}
async function mountPicker(props: Partial<DatePickerProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  const ref = anchorRef();
  const element = (visible: boolean, extra: Partial<DatePickerProps> = {}) => (
    <TanreiProvider {...provider}>
      <DatePicker testID={ID} anchorRef={ref} visible={visible} today={TODAY} locale="en-US" {...props} {...extra} />
    </TanreiProvider>
  );
  const view = await render(element(true));
  return { view, ref, element };
}
const SURFACE = { width: 360, height: 400 };
const layOut = (size = SURFACE) => fireEvent(q('placement')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, ...size } } });

/** Everything DTP-10 / DTP-12 / DTP-30 / DTP-31 name for a day — container, label, outline, opacity — from one state's tokens. */
function expectDayDrawnFrom(iso: string, condition: TanreiCoreDatePickerCondition, state: InteractionState, system: TanreiSystem = tanrei, scheme: TanreiScheme = 'light') {
  const from = system.components.datePicker;
  const paints = from.conditions[condition][state];
  const holder = condition === 'inRange' ? dayPart(iso, 'track')! : dayPart(iso, 'container')!;
  expect(viewStyle(holder).backgroundColor).toBe(fill(paints.containerColor, scheme, system));
  expect(textStyle(dayPart(iso, 'label')!).color).toBe(painted(paints.labelColor, scheme, system));
  const outline = dayPart(iso, 'outline');
  if (evaluatePaint(paints.outlineColor, system.colors[scheme]).a === 0) expect(outline).toBeNull();
  else expect(viewStyle(outline!).borderColor).toBe(painted(paints.outlineColor, scheme, system));
  const opacity = { enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity }[state];
  expect(viewStyle(day(iso)).opacity).toBe(opacity);
}

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // The baselines at the tokens' own sizes (the Jest preset's window has fontScale 2); a 400 × 800 window for placement.
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
const reports = () => jest.mocked(console.warn).mock.calls.map(([message]) => String(message)).filter((message) => message.includes('DatePicker'));

// ---------------------------------------------------------------------------------------------------------------

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation: DatePicker, its props, onChange and onClose, and the item kinds DatePickerDay and DatePickerYear', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(DatePicker.name);
    const expected = Object.fromEntries(spec.props.map((prop) => [prop.name, prop.name === 'open' ? 'visible' : prop.name]));
    expect(platform.props).toEqual(expected);
    expect(platform.events).toEqual({ change: 'onChange', close: 'onClose' });
    expect(platform.items).toMatchObject({ day: { name: 'DatePickerDay', props: { date: 'date', disabled: 'disabled' } }, year: { name: 'DatePickerYear', props: { year: 'year' } } });
    const source = fs.readFileSync(path.resolve(__dirname, '../DatePicker.tsx'), 'utf8');
    expect(source).toContain('function DatePickerDay(');
    expect(source).toContain('function DatePickerYear(');
  });

  test('the conditions are the token axis: unselected, today, selected and in-range; presentation, mode, firstDayOfWeek, entryMode and startView are closed', () => {
    expect(Object.keys(tokens.conditions)).toEqual(['unselected', 'today', 'selected', 'inRange']);
    expect(spec.props.filter((prop) => prop.axis)).toEqual([]);
  });

  test('defaults follow the spec: closed (nothing, no Modal); modal, single, calendar, the day view; every word its English default', async () => {
    const view = await render(
      <TanreiProvider theme="light">
        <DatePicker testID={ID} />
      </TanreiProvider>,
    );
    expect(q('modal')).toBeNull();
    await view.rerender(
      <TanreiProvider theme="light">
        <DatePicker testID={ID} visible today={TODAY} locale="en-US" />
      </TanreiProvider>,
    );
    expect(q('modal')!.props.visible).toBe(true);
    expect(container().props.accessibilityLabel).toBe('Select date');
    const defaults = Object.fromEntries(spec.props.filter((prop) => prop.type === 'string' && typeof prop.default === 'string' && prop.default !== '').map((prop) => [prop.name, prop.default]));
    expect(defaults).toEqual({
      label: 'Select date',
      dateLabel: 'Date',
      startLabel: 'Start date',
      endLabel: 'End date',
      confirmLabel: 'OK',
      cancelLabel: 'Cancel',
      previousMonthLabel: 'Previous month',
      nextMonthLabel: 'Next month',
      yearViewLabel: 'Choose a year',
      textEntryLabel: 'Switch to text entry',
      calendarEntryLabel: 'Switch to calendar',
      todayLabel: 'Today',
      invalidText: 'Enter a valid date',
      unavailableText: "This date can't be chosen",
    });
    expect(textOf(q('header.label'))).toBe(defaults.label);
    expect(q('previous')!.props.accessibilityLabel).toBe(defaults.previousMonthLabel);
    expect(q('next')!.props.accessibilityLabel).toBe(defaults.nextMonthLabel);
    expect(q('view-toggle')!.props.accessibilityHint).toBe(defaults.yearViewLabel);
    expect(q('entry-toggle')!.props.accessibilityLabel).toBe(defaults.textEntryLabel);
    expect(textOf(q('cancel'))).toBe(defaults.cancelLabel);
    expect(textOf(q('confirm'))).toBe(defaults.confirmLabel);
    expect(day(TODAY).props.accessibilityLabel).toBe('Thursday, September 24, 2026, Today');
    expect(textOf(q('header.value'))).toBe(defaults.dateLabel);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('presentation, focus and closing (DTP-1 … DTP-7, DTP-22)', () => {
  test('DTP-1: open presents a transparent Modal (its own window: everything outside it is inert, nothing behind scrolls) without the platform\'s animation, the scrim of comp.date-picker.modal.scrim.color over the whole window, and the container in its color, elevation and corners', async () => {
    await mountPicker();
    expect(q('modal')!.props).toMatchObject({ visible: true, transparent: true, animationType: 'none', statusBarTranslucent: true, navigationBarTranslucent: true });
    const scrim = q('scrim')!;
    expect(viewStyle(scrim)).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: painted(tokens.modalScrimColor) });
    expect(painted(tokens.modalScrimColor)).toBe(role('scrim'));
    expect(scrim.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(container().props['aria-modal']).toBe(true);
    const level = resolveElevation(tanrei.elevation[tokens.modalContainerElevation], (name) => role(name));
    expect(viewStyle(container())).toMatchObject({ backgroundColor: painted(tokens.modalContainerColor), borderRadius: tokens.modalContainerShape, boxShadow: level.boxShadow });
    expect(viewStyle(q('area')!)).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
    expect(viewStyle(q('clip')!)).toMatchObject({ overflow: 'hidden', borderRadius: tokens.modalContainerShape });
  });

  test('DTP-1: the container is at least comp.date-picker.modal.container.margin from every edge, the insets and the keyboard: taller content is bounded by the room left', async () => {
    const shown = jest.spyOn(ReactNative.Keyboard, 'addListener');
    await mountPicker({ insets: { top: 24, bottom: 34 } });
    const room = 800 - 2 * tokens.modalContainerMargin - 24 - 34;
    expect(viewStyle(container()).maxHeight).toBe(room);
    expect(viewStyle(q('area')!)).toMatchObject({ paddingTop: 24, paddingBottom: 34 });
    const onShow = shown.mock.calls.find(([event]) => event === 'keyboardDidShow')![1] as (event: { endCoordinates: { height: number } }) => void;
    await act(async () => onShow({ endCoordinates: { height: 300 } }));
    expect(viewStyle(container()).maxHeight).toBe(800 - 2 * tokens.modalContainerMargin - 24 - 300);
  });

  test('DTP-2: a docked picker is drawn in TanreiProvider\'s overlay layer (not a Modal), comp.date-picker.docked.offset below its anchor with the start edges aligned, in its color, elevation and corners, without a scrim or a focus trap', async () => {
    await mountPicker({ presentation: 'docked' });
    await layOut();
    expect(JSON.stringify(screen.toJSON())).not.toContain('"type":"Modal"');
    expect(viewStyle(q('placement')!)).toMatchObject({ top: ANCHOR.y + ANCHOR.height + tokens.dockedOffset, left: ANCHOR.x });
    const level = resolveElevation(tanrei.elevation[tokens.dockedContainerElevation], (name) => role(name));
    expect(viewStyle(container())).toMatchObject({ backgroundColor: painted(tokens.dockedContainerColor), borderRadius: tokens.dockedContainerShape, boxShadow: level.boxShadow });
    expect(container().props['aria-modal']).toBeUndefined();
    expect(q('scrim')).toBeNull();
    for (const index of [0, 1, 2, 3]) {
      const catcher = q(`outside.${index}`)!;
      expect(viewStyle(catcher).backgroundColor).toBeUndefined();
      expect(catcher.props).toMatchObject({ accessible: false, focusable: false, importantForAccessibility: 'no', accessibilityElementsHidden: true });
    }
    expect(q('header')).toBeNull();
    expect(q('actions')).toBeNull();
  });

  test('DTP-2: it flips above the anchor when below has too little room and above has more, shifts to stay within comp.date-picker.docked.viewport-margin, and limits its height to the room; right to left aligns the end edges', async () => {
    const low = { x: 300, y: 600, width: 80, height: 40 };
    const ref = anchorRef(low);
    await render(
      <TanreiProvider theme="light">
        <DatePicker testID={ID} presentation="docked" anchorRef={ref} visible today={TODAY} locale="en-US" />
      </TanreiProvider>,
    );
    await layOut();
    const placed = viewStyle(q('placement')!);
    expect(placed.top).toBe(low.y - tokens.dockedOffset - SURFACE.height);
    expect(placed.left).toBe(400 - tokens.dockedViewportMargin - SURFACE.width);
    expect(viewStyle(container()).maxHeight).toBe(low.y - tokens.dockedOffset - tokens.dockedViewportMargin);
    expect(placed.transformOrigin).toBe('bottom');
  });

  test('DTP-3: opening moves focus into the picker at once — to the active day (the chosen date), keyboard and screen reader', async () => {
    reduceMotion(false);
    const focus = focusSpy();
    const announce = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => undefined);
    await mountPicker({ value: '2026-09-17' });
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-09-17`);
    expect(announce).toHaveBeenCalledWith(expect.objectContaining({ props: expect.objectContaining({ testID: `${ID}.day.2026-09-17` }) }), 'focus');
    focus.mockClear();
    await fireEvent(q('modal')!, 'show');
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-09-17`);
  });

  test('DTP-3: in the year view focus moves to the displayed year; in text entry to the first field; a docked picker moves focus once it is placed', async () => {
    const focus = focusSpy();
    const first = await mountPicker({ value: '2026-09-17', startView: 'year' });
    expect(lastFocused(focus)).toBe(`${ID}.year.2026`);
    await first.view.unmount();
    const second = await mountPicker({ value: '2026-09-17', entryMode: 'text' });
    expect((inputFocus().mock.contexts.at(-1) as { props: { testID: string } }).props.testID).toBe(`${ID}.field.0.input`);
    await second.view.unmount();
    focus.mockClear();
    await mountPicker({ presentation: 'docked', value: '2026-09-17' });
    expect(focus).not.toHaveBeenCalled();
    await layOut();
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-09-17`);
  });

  test('DTP-4: closing gives focus back to the anchor when it was inside the picker (or inside when the close was asked for), not when it had already left; the Modal goes after its exit motion', async () => {
    const { view, ref, element } = await mountPicker({ value: '2026-09-17' });
    await fireEvent(day('2026-09-17'), 'focus');
    await view.rerender(element(false));
    expect(ref.current.focus).toHaveBeenCalledTimes(1);
    await wait(tokens.modalMotionCloseDuration + 50);
    expect(q('modal')).toBeNull();
    const docked = await mountPicker({ presentation: 'docked' });
    await docked.view.rerender(docked.element(false));
    expect(docked.ref.current.focus).not.toHaveBeenCalled();
    await docked.view.unmount();
    // Focus inside when the close is asked for (Escape) goes back even though it left before the picker closed; focus
    // that left on its own (focus-out) stays where it went.
    const again = await mountPicker({ presentation: 'docked', value: '2026-09-17' });
    await layOut();
    await fireEvent(day('2026-09-17'), 'focus');
    await key('Escape');
    await fireEvent(day('2026-09-17'), 'blur');
    await wait(10);
    await again.view.rerender(again.element(false));
    expect(again.ref.current.focus).toHaveBeenCalledTimes(1);
    await again.view.unmount();
    const away = await mountPicker({ presentation: 'docked', value: '2026-09-17' });
    await layOut();
    await fireEvent(day('2026-09-17'), 'focus');
    await fireEvent(day('2026-09-17'), 'blur');
    await wait(10);
    await away.view.rerender(away.element(false));
    expect(away.ref.current.focus).not.toHaveBeenCalled();
  });

  test('DTP-5: a modal picker — Escape, Android\'s back (the Modal\'s request), the iOS escape gesture, a press on the scrim, Cancel — each asks to close once with its reason and commits nothing', async () => {
    const onClose = jest.fn();
    const onChange = jest.fn();
    await mountPicker({ value: '2026-09-17', onClose, onChange });
    await press(day('2026-09-18'));
    expect(await key('Escape')).toHaveBeenCalled();
    await fireEvent(q('modal')!, 'requestClose');
    await fireEvent(container(), 'accessibilityEscape');
    await fireEvent.press(q('scrim.press')!);
    await fireEvent.press(q('cancel')!);
    expect(onClose.mock.calls).toEqual([[{ reason: 'escape' }], [{ reason: 'back' }], [{ reason: 'back' }], [{ reason: 'outside' }], [{ reason: 'cancel' }]]);
    expect(onChange).not.toHaveBeenCalled();
    const close = (spec as unknown as { events: { name: string; description: string }[] }).events.find((event) => event.name === 'close')!;
    for (const reason of ['escape', 'back', 'outside', 'tab', 'focus-out', 'cancel', 'confirm', 'select']) expect(close.description).toContain(reason);
  });

  test('DTP-5: a docked picker — Escape, Android\'s back, a press outside it and its anchor, Tab past the grid or Shift+Tab before the view toggle, and focus leaving it — each asks to close once with its reason', async () => {
    let back: ((...args: never[]) => unknown) | null = null;
    const remove = jest.fn();
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      back = handler;
      return { remove };
    });
    const onClose = jest.fn();
    const { view, element } = await mountPicker({ presentation: 'docked', value: '2026-09-17', onClose });
    await layOut();
    await key('Escape');
    await act(async () => {
      expect(back!()).toBe(true);
    });
    await fireEvent.press(q('outside.1')!);
    // Tab moving inside the picker is not a close: from the view toggle to the previous-month button.
    await fireEvent(q('view-toggle')!, 'focus');
    expect(await key('Tab')).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent(q('view-toggle')!, 'blur');
      fireEvent(q('previous')!, 'focus');
    });
    await wait(10);
    expect(onClose).toHaveBeenCalledTimes(3);
    // Tab from the grid (the last stop) leaves it; Shift+Tab from the view toggle (the first) does too.
    await fireEvent(day('2026-09-17'), 'focus');
    expect(await key('Tab')).toHaveBeenCalled();
    await fireEvent(q('view-toggle')!, 'focus');
    expect(await key('Tab', { shiftKey: true })).toHaveBeenCalled();
    // A blur that follows a close request is not another close.
    await fireEvent(q('view-toggle')!, 'blur');
    await wait(10);
    expect(onClose).toHaveBeenCalledTimes(5);
    // Focus leaving otherwise: a part lost focus and no other took it.
    await fireEvent(q('next')!, 'focus');
    await fireEvent(q('next')!, 'blur');
    await wait(10);
    expect(onClose.mock.calls.map(([event]) => event.reason)).toEqual(['escape', 'back', 'outside', 'tab', 'tab', 'focus-out']);
    await view.rerender(element(false));
    expect(remove).toHaveBeenCalled();
  });

  test('DTP-6: a modal picker holds the choice as pending — shown in the header and the grid — and commits it only on OK: change once (only when it differs), then close with confirm; a value set while open does not move it', async () => {
    const calls: string[] = [];
    const onChange = jest.fn(() => calls.push('change'));
    const onClose = jest.fn(({ reason }) => calls.push(`close:${reason}`));
    const { view, element } = await mountPicker({ value: '2026-09-17', onChange, onClose });
    await press(day('2026-09-20'));
    expect(onChange).not.toHaveBeenCalled();
    expect(textOf(q('header.value'))).toBe('Sun, Sep 20');
    expect(day('2026-09-20').props.accessibilityState.selected).toBe(true);
    expect(day('2026-09-17').props.accessibilityState.selected).toBe(false);
    await view.rerender(element(true, { value: '2026-09-03', onChange, onClose }));
    expect(textOf(q('header.value'))).toBe('Sun, Sep 20');
    await fireEvent.press(q('confirm')!);
    expect(onChange.mock.calls).toEqual([[{ value: '2026-09-20', start: '', end: '' }]]);
    expect(calls).toEqual(['change', 'close:confirm']);
    // OK with the choice it opened with: close only.
    onChange.mockClear();
    onClose.mockClear();
    await view.rerender(element(false));
    await view.rerender(element(true, { value: '2026-09-17', onChange, onClose }));
    await fireEvent.press(q('confirm')!);
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose.mock.calls).toEqual([[{ reason: 'confirm' }]]);
  });

  test('DTP-6: OK is disabled while the choice is incomplete — no date, no end — or a field holds text that is not an available date', async () => {
    const view = await mount({ mode: 'range', start: '2026-09-10' });
    expect(q('confirm')!.props.accessibilityState).toMatchObject({ disabled: true });
    await press(day('2026-09-12'));
    expect(q('confirm')!.props.accessibilityState).toMatchObject({ disabled: false });
    await view.unmount();
    await mount({});
    expect(q('confirm')!.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(q('entry-toggle')!);
    await fireEvent.changeText(q('field.0.input')!, '09/17/2026');
    expect(q('confirm')!.props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.changeText(q('field.0.input')!, '09/17/202');
    expect(q('confirm')!.props.accessibilityState).toMatchObject({ disabled: true });
  });

  test('DTP-7: a docked picker commits a completed choice — change when it differs, then close with select; choosing a range\'s start emits nothing and keeps it open', async () => {
    const calls: string[] = [];
    const onChange = jest.fn((selection) => calls.push(`change:${JSON.stringify(selection)}`));
    const onClose = jest.fn(({ reason }) => calls.push(`close:${reason}`));
    const single = await mountPicker({ presentation: 'docked', value: '2026-09-17', onChange, onClose });
    await layOut();
    await press(day('2026-09-17'));
    expect(calls).toEqual(['close:select']);
    await press(day('2026-09-18'));
    expect(calls).toEqual(['close:select', 'change:{"value":"2026-09-18","start":"","end":""}', 'close:select']);
    await single.view.unmount();
    calls.length = 0;
    await mountPicker({ presentation: 'docked', mode: 'range', onChange, onClose });
    await layOut();
    await press(day('2026-09-10'));
    expect(calls).toEqual([]);
    expect(day('2026-09-10').props.accessibilityState.selected).toBe(true);
    await press(day('2026-09-14'));
    expect(calls).toEqual(['change:{"value":"","start":"2026-09-10","end":"2026-09-14"}', 'close:select']);
  });

  test('DTP-22: a modal picker fades its scrim and container in while growing it from comp.date-picker.modal.motion.enter-scale over the open motion, and fades both out over the close motion before the Modal goes', async () => {
    reduceMotion(false);
    const running = stubTiming();
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const { view, element } = await mountPicker();
    await wait(0);
    expect(running.configs()).toContainEqual(expect.objectContaining({ toValue: 1, duration: tokens.modalMotionOpenDuration, useNativeDriver: true }));
    expect(interpolate).toHaveBeenCalledWith({ inputRange: [0, 1], outputRange: [tokens.modalMotionEnterScale, 1] });
    await running.finishAll();
    await view.rerender(element(false));
    await wait(0);
    expect(running.configs()).toContainEqual(expect.objectContaining({ toValue: 0, duration: tokens.modalMotionCloseDuration }));
    // Leaving: it fades without growing back.
    expect(viewStyle(container()).transform).toEqual([{ scale: 1 }]);
    expect(q('modal')).not.toBeNull();
    await running.finishAll();
    expect(q('modal')).toBeNull();
  });

  test('DTP-22: where motion is reduced a modal picker fades without growing (at once on Android); a docked one grows from the edge facing its anchor over the open motion, and appears at once where motion is reduced', async () => {
    await mountPicker();
    await wait(0);
    expect(viewStyle(container()).transform).toEqual([{ scale: 1 }]);
    const android = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    const timing = jest.spyOn(Animated, 'timing');
    const second = await mountPicker();
    await wait(0);
    expect(timing).not.toHaveBeenCalledWith(expect.any(Animated.Value), expect.objectContaining({ duration: tokens.modalMotionOpenDuration }));
    android.restore();
    await second.view.unmount();
    reduceMotion(false);
    timing.mockClear();
    await mountPicker({ presentation: 'docked' });
    await wait(0);
    await layOut();
    await wait(0);
    expect(timing).toHaveBeenCalledWith(expect.any(Animated.Value), expect.objectContaining({ toValue: 1, duration: tokens.dockedMotionOpenDuration }));
    expect(viewStyle(q('placement')!).transformOrigin).toBe('top');
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('choosing (DTP-8 … DTP-10, DTP-29, DTP-30)', () => {
  test('DTP-8: in single mode a press (or Enter / Space, the pressable\'s click) on an available day makes it the pending date', async () => {
    await mount({ value: '2026-09-17' });
    await press(day('2026-09-05'));
    expect(day('2026-09-05').props.accessibilityState.selected).toBe(true);
    expect(textOf(q('header.value'))).toBe('Sat, Sep 5');
  });

  test('DTP-9: in range mode the first choice is the start, the next the end; a day before the start, or any day once both are chosen, starts again; the same day twice is a one-day range', async () => {
    await mount({ mode: 'range', label: 'Select dates' });
    const header = () => textOf(q('header.value'));
    expect(header()).toBe('Start date – End date');
    await press(day('2026-09-10'));
    expect(header()).toBe('Sep 10 – End date');
    await press(day('2026-09-08'));
    expect(header()).toBe('Sep 8 – End date');
    await press(day('2026-09-12'));
    expect(header()).toBe('Sep 8 – Sep 12');
    await press(day('2026-09-20'));
    expect(header()).toBe('Sep 20 – End date');
    await press(day('2026-09-20'));
    expect(header()).toBe('Sep 20 – Sep 20');
    expect(dayPart('2026-09-20', 'band')).toBeNull();
  });

  test('DTP-9 / DTP-30: an unavailable day between the start and the end stays inside the range — drawn in-range from its disabled tokens and exposed as selected and disabled', async () => {
    await mount({ mode: 'range', start: '2026-09-10', end: '2026-09-16', disabledDates: ['2026-09-13'] });
    expectDayDrawnFrom('2026-09-13', 'inRange', 'disabled');
    expect(day('2026-09-13').props.accessibilityState).toEqual({ selected: true, disabled: true });
  });

  test('DTP-10: each day from exactly one condition — selected over in-range over today over unselected; years from selected (the displayed year) and today (the current year); the view toggle from unselected', async () => {
    const view = await mount({ mode: 'range', start: '2026-09-22', end: '2026-09-26' });
    expectDayDrawnFrom('2026-09-22', 'selected', 'enabled');
    expectDayDrawnFrom('2026-09-26', 'selected', 'enabled');
    // Today (24) inside the range: in-range wins, and the ring goes.
    expectDayDrawnFrom('2026-09-24', 'inRange', 'enabled');
    expectDayDrawnFrom('2026-09-23', 'inRange', 'enabled');
    expectDayDrawnFrom('2026-09-21', 'unselected', 'enabled');
    await view.unmount();
    await mount({ value: '2026-09-24' });
    expectDayDrawnFrom('2026-09-24', 'selected', 'enabled');
    await press(day('2026-09-02'));
    expectDayDrawnFrom('2026-09-24', 'today', 'enabled');
    await fireEvent.press(q('view-toggle')!);
    const years = tokens.conditions;
    expect(viewStyle(q('year.2026.container')!).backgroundColor).toBe(fill(years.selected.enabled.containerColor));
    expect(textStyle(q('year.2025.label')!).color).toBe(painted(years.unselected.enabled.labelColor));
    expect(textStyle(q('view-toggle.label')!).color).toBe(painted(years.unselected.enabled.labelColor));
    expect(viewStyle(q('view-toggle')!).backgroundColor).toBe(fill(years.unselected.enabled.containerColor));
  });

  test('DTP-10: the current year is today when it is not the displayed year', async () => {
    await mount({ value: '2026-09-17', today: '2027-01-15', startView: 'year' });
    expect(viewStyle(q('year.2027.outline')!).borderColor).toBe(painted(tokens.conditions.today.enabled.outlineColor));
    expect(textStyle(q('year.2027.label')!).color).toBe(painted(tokens.conditions.today.enabled.labelColor));
    expect(year(2027).props.accessibilityLabel).toBe('2027, Today');
    expect(year(2026).props.accessibilityState).toMatchObject({ selected: true });
  });

  test('DTP-29: before min, after max, in disabledDates or named by isDateDisabled a day is unavailable; the picker opens on the chosen month, else today\'s, clamped between min\'s and max\'s months', async () => {
    const isDateDisabled = jest.fn((iso: string) => iso === '2026-09-19');
    const view = await mount({ min: '2026-09-03', max: '2026-09-22', disabledDates: ['2026-09-12'], isDateDisabled });
    for (const iso of ['2026-09-02', '2026-09-23', '2026-09-12', '2026-09-19']) expect(day(iso).props.accessibilityState.disabled).toBe(true);
    for (const iso of ['2026-09-03', '2026-09-22', '2026-09-11']) expect(day(iso).props.accessibilityState.disabled).toBe(false);
    expect(isDateDisabled).toHaveBeenCalledWith('2026-09-19');
    await view.unmount();
    const later = await mount({ min: '2027-03-10' });
    expect(q('grid')!.props.accessibilityLabel).toBe('March 2027');
    await later.unmount();
    const chosen = await mount({ value: '2025-02-01' });
    expect(q('grid')!.props.accessibilityLabel).toBe('February 2025');
    await chosen.unmount();
    await mount({ max: '2026-05-31' });
    expect(q('grid')!.props.accessibilityLabel).toBe('May 2026');
  });

  test('DTP-30: an unavailable day is drawn from the disabled tokens of its condition, cannot be chosen, is exposed as disabled and stays reachable by the arrow keys; a value naming one is still drawn as chosen, from the selected condition\'s disabled tokens', async () => {
    await mount({ value: '2026-09-12', min: '2026-09-03', max: '2026-09-22', disabledDates: ['2026-09-12'] });
    expectDayDrawnFrom('2026-09-12', 'selected', 'disabled');
    expectDayDrawnFrom('2026-09-24', 'today', 'disabled');
    expectDayDrawnFrom('2026-09-02', 'unselected', 'disabled');
    // The default system: an unavailable day keeps its resting container; the selected one a faint fill; today's ring fades.
    expect(viewStyle(dayPart('2026-09-02', 'container')!).backgroundColor).toBeUndefined();
    expect(viewStyle(dayPart('2026-09-12', 'container')!).backgroundColor).toBe(formatColor({ ...tanrei.colors.light.onSurface, a: 0.12 }));
    expect(viewStyle(dayPart('2026-09-24', 'outline')!).borderColor).toBe(formatColor({ ...tanrei.colors.light.onSurface, a: 0.38 }));
    await press(day('2026-09-02'));
    expect(textOf(q('header.value'))).toBe('Sat, Sep 12');
    await fireEvent(day('2026-09-11'), 'focus');
    await key('ArrowRight');
    expect(day('2026-09-12').props.focusable).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('the grid (DTP-11 … DTP-13, DTP-17)', () => {
  test('DTP-11: a row of seven weekday names from the first day of the week, then six rows of seven cells of comp.date-picker.cell.size (never below sys.target.touch); the month\'s first day in its weekday\'s column, empty cells hidden, six rows even when five suffice', async () => {
    await mount({ value: '2026-09-17' });
    const cell = Math.max(tokens.cellSize, tanrei.measure.target.touch);
    expect(texts(q('weekdays'))).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
    const rows = [0, 1, 2, 3, 4, 5].map((index) => q(`row.${index}`)!);
    expect(rows.every(Boolean)).toBe(true);
    // September 2026 begins on a Tuesday: two empty cells, then 1.
    const first = rows[0]!.children as Instance[];
    expect(first).toHaveLength(7);
    expect((first[0] as Instance).props.importantForAccessibility).toBe('no-hide-descendants');
    expect((first[2] as Instance).props.testID).toBe(`${ID}.day.2026-09-01`);
    expect((rows[5]!.children as Instance[]).every((each) => each.props.importantForAccessibility === 'no-hide-descendants')).toBe(true);
    expect(viewStyle(day('2026-09-17'))).toMatchObject({ width: cell, minHeight: cell });
    // The cells are the hit areas: no hitSlop over the neighbours.
    expect(day('2026-09-17').props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(viewStyle(q('calendar')!)).toMatchObject({ paddingHorizontal: tokens.containerPaddingInline, paddingVertical: tokens.containerPaddingBlock });
    expect(viewStyle(container()).width).toBe(7 * cell + 2 * tokens.containerPaddingInline);
  });

  test('DTP-11: a larger target (a layer) grows the cells; a larger cell size (a layer) grows them', async () => {
    const view = await mount({}, { theme: 'light', system: withPicker({ cellSize: 52 }) });
    expect(viewStyle(day('2026-09-17'))).toMatchObject({ width: 52, minHeight: 52 });
    await view.unmount();
    await mount({}, { theme: 'light', system: { ...tanrei, measure: { ...tanrei.measure, target: { ...tanrei.measure.target, touch: 56 } } } });
    expect(viewStyle(day('2026-09-17'))).toMatchObject({ width: 56, minHeight: 56 });
  });

  test('DTP-12: a day\'s number in the locale\'s digits and comp.date-picker.day.label.typescale, on a square container of comp.date-picker.day.container.size with its corners and the outline of comp.date-picker.outline.width; an in-range day\'s container spans its cell, and a start and end draw the half cell toward each other in the band\'s color', async () => {
    await mount({ mode: 'range', start: '2026-09-10', end: '2026-09-16' });
    const square = viewStyle(dayPart('2026-09-24', 'container')!);
    expect(square).toMatchObject({ minWidth: tokens.dayContainerSize, minHeight: tokens.dayContainerSize, borderRadius: tokens.dayContainerShape });
    expect(textStyle(dayPart('2026-09-24', 'label')!)).toMatchObject({ fontSize: sizeOf(tokens.dayLabelTypescale) });
    expect(viewStyle(dayPart('2026-09-24', 'outline')!)).toMatchObject({ borderWidth: tokens.outlineWidth });
    // The band: the in-range day's track is its container, the full cell wide, square ends.
    expect(viewStyle(dayPart('2026-09-12', 'track')!)).toMatchObject({ alignSelf: 'stretch', backgroundColor: painted(tokens.conditions.inRange.enabled.containerColor) });
    expect(viewStyle(dayPart('2026-09-12', 'container')!).backgroundColor).toBeUndefined();
    // Start and end: the half toward the other, logical (start / end mirror right to left).
    expect(viewStyle(dayPart('2026-09-10', 'band')!)).toMatchObject({ start: '50%', end: 0, backgroundColor: painted(tokens.conditions.inRange.enabled.containerColor) });
    expect(viewStyle(dayPart('2026-09-16', 'band')!)).toMatchObject({ start: 0, end: '50%' });
    expect(dayPart('2026-09-17', 'band')).toBeNull();
    // The band breaks at the end of a row: 12 is a Saturday, 13 starts the next row.
    expect((q('row.1')!.children as Instance[]).at(-1)!.props.testID).toBe(`${ID}.day.2026-09-12`);
    expect((q('row.2')!.children as Instance[])[0]!.props.testID).toBe(`${ID}.day.2026-09-13`);
  });

  test('DTP-13: the weekdays\' narrow names from the locale, centred, in comp.date-picker.weekday.typescale and color, each a column header named by its full name; they take no focus', async () => {
    await mount({ locale: 'ja-JP' });
    expect(texts(q('weekdays'))).toEqual(['日', '月', '火', '水', '木', '金', '土']);
    const header = q('weekday.0')!;
    expect(header.props).toMatchObject({ role: 'columnheader', accessibilityLabel: '日曜日' });
    expect(header.props.focusable).toBeUndefined();
    expect(textStyle((header.children as Instance[])[0]!)).toMatchObject({ color: painted(tokens.weekdayColor), textAlign: 'center' });
  });

  test('DTP-17: the grid is one tab stop, the active day — the chosen date (the start) in the shown month, else today, else the first available day, else the first day', async () => {
    const focusable = () => (screen.getAllByRole('button', { includeHiddenElements: true }) as Instance[]).filter((each) => each.props.testID?.startsWith(`${ID}.day.`) && each.props.focusable).map((each) => each.props.testID);
    const one = await mount({ value: '2026-09-17' });
    expect(focusable()).toEqual([`${ID}.day.2026-09-17`]);
    await one.unmount();
    const two = await mount({});
    expect(focusable()).toEqual([`${ID}.day.${TODAY}`]);
    await two.unmount();
    const three = await mount({ min: '2026-10-05' });
    expect(focusable()).toEqual([`${ID}.day.2026-10-05`]);
    await three.unmount();
    await mount({ today: '2026-11-02', value: '2026-10-01', disabledDates: ['2026-10-01'], isDateDisabled: () => true });
    expect(focusable()).toEqual([`${ID}.day.2026-10-01`]);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('navigation, the view toggle and the year view (DTP-14 … DTP-16, DTP-19 … DTP-21)', () => {
  test('DTP-14: a navigation row at least a cell tall — the view toggle at the start, the previous and next buttons (standard, medium icon buttons, navigation.gap apart) at the end; disabled at min\'s and max\'s months; hidden in the year view', async () => {
    await mount({ min: '2026-09-03', max: '2026-10-22' });
    expect(viewStyle(q('navigation')!)).toMatchObject({ flexDirection: 'row', minHeight: tokens.cellSize });
    const previous = q('previous')!;
    expect(previous.props.accessibilityState).toMatchObject({ disabled: true });
    expect(q('next')!.props.accessibilityState).toMatchObject({ disabled: false });
    expect(textOf(previous)).toBe('chevron_left');
    expect(textOf(q('next'))).toBe('chevron_right');
    const iconButton = tanrei.components.iconButton;
    expect(viewStyle(previous)).toMatchObject({ width: iconButton.sizes.medium.containerSize, height: iconButton.sizes.medium.containerSize });
    expect(viewStyle(previous.parent as Instance).gap).toBe(tokens.navigationGap);
    await fireEvent.press(q('next')!);
    expect(q('grid')!.props.accessibilityLabel).toBe('October 2026');
    expect(q('next')!.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(q('view-toggle')!);
    expect(q('previous')).toBeNull();
    expect(q('next')).toBeNull();
  });

  test('DTP-15: the view toggle — at least view-toggle.container.height tall, its corners, padded at each end, the month and year then the expand_more glyph view-toggle.gap after it at view-toggle.icon.size, in the unselected colors — turns its chevron half a turn in the year view; its hit area meets the target', async () => {
    await mount({ value: '2026-09-17' });
    const toggle = q('view-toggle')!;
    expect(viewStyle(toggle)).toMatchObject({
      minHeight: tokens.viewToggleContainerHeight,
      borderRadius: tokens.viewToggleContainerShape,
      paddingStart: tokens.viewToggleContainerPaddingInline,
      paddingEnd: tokens.viewToggleContainerPaddingInline,
      gap: tokens.viewToggleGap,
    });
    expect(textOf(q('view-toggle.label'))).toBe('September 2026');
    expect(textStyle(q('view-toggle.label')!).fontSize).toBe(sizeOf(tokens.viewToggleLabelTypescale));
    const glyph = q('view-toggle.chevron.glyph')!;
    expect(textOf(glyph)).toBe('expand_more');
    expect(textStyle(glyph)).toMatchObject({ fontSize: tokens.viewToggleIconSize, fontFamily: iconFamily(tanrei.icon, false).families[0], color: painted(tokens.conditions.unselected.enabled.labelColor) });
    expect(viewStyle(q('view-toggle.chevron')!).transform).toEqual([{ rotate: '0deg' }]);
    const slop = toggle.props.hitSlop;
    expect(slop.top + slop.bottom + tokens.viewToggleContainerHeight).toBeGreaterThanOrEqual(tanrei.measure.target.touch);
    await fireEvent.press(toggle);
    expect(q('years')).not.toBeNull();
    expect(viewStyle(q('view-toggle.chevron')!).transform).toEqual([{ rotate: '180deg' }]);
    expect(q('view-toggle')!.props.accessibilityState).toEqual({ expanded: true });
    await fireEvent.press(q('view-toggle')!);
    expect(q('grid')).not.toBeNull();
    expect(q('grid')!.props.accessibilityLabel).toBe('September 2026');
  });

  test('DTP-15: the chevron turns over comp.date-picker.motion.state-duration with the state easing where motion is not reduced', async () => {
    reduceMotion(false);
    await mount({});
    await wait(0);
    const running = stubTiming();
    await fireEvent.press(q('view-toggle')!);
    await wait(0);
    expect(running.configs()).toContainEqual(expect.objectContaining({ duration: tokens.motionStateDuration }));
    await running.finishAll();
    expect(viewStyle(q('view-toggle.chevron')!).transform).toEqual([{ rotate: '180deg' }]);
  });

  test('DTP-16: the year view — min\'s year to max\'s (1900 to 2100 without them) in rows of three, a third of the grid wide and a cell tall, each year on its container; it opens with the displayed year in the third row; choosing one shows that year\'s month (clamped), focuses its active day and keeps the choice', async () => {
    const focus = focusSpy();
    const view = await mount({ value: '2026-09-17', startView: 'year' });
    const cell = Math.max(tokens.cellSize, tanrei.measure.target.touch);
    const list = q('years')!;
    expect(list.props.contentOffset).toEqual({ x: 0, y: ((2026 - 1900) / 3 - 2) * cell });
    expect(viewStyle(year(2026))).toMatchObject({ width: (7 * cell) / 3, minHeight: cell });
    expect(viewStyle(q('year.2026.container')!)).toMatchObject({ minWidth: tokens.yearContainerWidth, minHeight: tokens.yearContainerHeight, borderRadius: tokens.yearContainerShape });
    expect(textOf(q('year.2026.label'))).toBe('2026');
    await press(year(2031));
    expect(q('years')).toBeNull();
    expect(q('grid')!.props.accessibilityLabel).toBe('September 2031');
    expect(lastFocused(focus)).toBe(`${ID}.day.2031-09-01`);
    expect(textOf(q('header.value'))).toBe('Thu, Sep 17');
    await view.unmount();
    await mount({ value: '2026-09-17', startView: 'year', min: '2020-01-01', max: '2030-06-30' });
    expect(texts(q('years')).filter((text) => /^\d{4}$/.test(text))[0]).toBe('2020');
    expect(q('year.2031')).toBeNull();
    expect(q('years')!.props.contentOffset).toEqual({ x: 0, y: 0 });
    await press(year(2030));
    expect(q('grid')!.props.accessibilityLabel).toBe('June 2030');
  });

  test('DTP-19: in the year view the list is one tab stop (the displayed year); Right and Left move a year the way they point, Down and Up a row, Home and End to the ends; focus follows', async () => {
    const focus = focusSpy();
    await mount({ value: '2026-09-17', startView: 'year' });
    expect(year(2026).props.focusable).toBe(true);
    expect(year(2027).props.focusable).toBe(false);
    await fireEvent(year(2026), 'focus');
    await key('ArrowRight');
    expect(lastFocused(focus)).toBe(`${ID}.year.2027`);
    await fireEvent(year(2027), 'focus');
    await key('ArrowDown');
    expect(lastFocused(focus)).toBe(`${ID}.year.2030`);
    await fireEvent(year(2030), 'focus');
    await key('ArrowUp');
    await key('ArrowLeft');
    await fireEvent(year(2027), 'focus');
    await key('ArrowLeft');
    expect(lastFocused(focus)).toBe(`${ID}.year.2026`);
    await fireEvent(year(2026), 'focus');
    await key('End');
    expect(lastFocused(focus)).toBe(`${ID}.year.2100`);
    await fireEvent(year(2100), 'focus');
    await key('Home');
    expect(lastFocused(focus)).toBe(`${ID}.year.1900`);
    expect(year(1900).props.focusable).toBe(true);
  });

  test('DTP-20: the previous and next buttons show the previous or next month, keep focus, make the active day the same day number (the last day when shorter) and announce the new month once, politely; choosing a year announces too', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => undefined);
    const focus = focusSpy();
    await mount({ value: '2026-08-31' });
    await fireEvent(q('next')!, 'focus');
    await fireEvent.press(q('next')!);
    expect(q('grid')!.props.accessibilityLabel).toBe('September 2026');
    expect(day('2026-09-30').props.focusable).toBe(true);
    expect(focus).not.toHaveBeenCalled();
    expect(announce.mock.calls).toEqual([['September 2026', { queue: true }]]);
    await fireEvent.press(q('previous')!);
    expect(day('2026-08-30').props.focusable).toBe(true);
    await fireEvent.press(q('view-toggle')!);
    await press(year(2024));
    expect(announce.mock.calls.at(-1)).toEqual(['August 2024', { queue: true }]);
  });

  test('DTP-21: a later month slides in from the end while the old one slides out toward the start, over the page motion; a view change cross-fades; the navigation row and the surface keep their size; at once where motion is reduced', async () => {
    reduceMotion(false);
    await mount({ value: '2026-09-17' });
    await wait(0);
    const running = stubTiming();
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const cell = Math.max(tokens.cellSize, tanrei.measure.target.touch);
    await fireEvent.press(q('next')!);
    expect(q('page.leaving')).not.toBeNull();
    expect(q('grid.leaving')!.props.accessibilityLabel).toBe('September 2026');
    expect(q('page.leaving')!.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(running.configs()).toContainEqual(expect.objectContaining({ toValue: 1, duration: tokens.motionPageDuration }));
    expect(interpolate).toHaveBeenCalledWith({ inputRange: [0, 1], outputRange: [7 * cell, 0] });
    expect(interpolate).toHaveBeenCalledWith({ inputRange: [0, 1], outputRange: [0, -7 * cell] });
    expect(viewStyle(q('views')!)).toMatchObject({ width: 7 * cell, minHeight: 7 * cell, overflow: 'hidden' });
    await running.finishAll();
    expect(q('page.leaving')).toBeNull();
    // An earlier month comes in from the start.
    await fireEvent.press(q('previous')!);
    expect(interpolate).toHaveBeenCalledWith({ inputRange: [0, 1], outputRange: [-7 * cell, 0] });
    await running.finishAll();
    await fireEvent.press(q('view-toggle')!);
    expect(q('views.leaving')).not.toBeNull();
    expect(interpolate).toHaveBeenCalledWith({ inputRange: [0, 1], outputRange: [1, 0] });
    await running.finishAll();
    expect(q('views.leaving')).toBeNull();
  });

  test('DTP-21: where motion is reduced the month and the view change at once', async () => {
    await mount({ value: '2026-09-17' });
    await wait(0);
    await fireEvent.press(q('next')!);
    expect(q('page.leaving')).toBeNull();
    await fireEvent.press(q('view-toggle')!);
    expect(q('views.leaving')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('the keyboard (DTP-18)', () => {
  test('DTP-18: Right and Left move a day the way they point, Down and Up a week, Home and End to the ends of the week row, Page Down / Up a month (the last day when shorter), with Shift a year; another month is shown; focus follows', async () => {
    const focus = focusSpy();
    await mount({ value: '2026-09-17' });
    const steps: [string, Record<string, unknown>, string][] = [
      ['ArrowRight', {}, '2026-09-18'],
      ['ArrowLeft', {}, '2026-09-17'],
      ['ArrowDown', {}, '2026-09-24'],
      ['ArrowUp', {}, '2026-09-17'],
      ['Home', {}, '2026-09-13'],
      ['End', {}, '2026-09-19'],
      ['PageDown', {}, '2026-10-19'],
      ['PageUp', {}, '2026-09-19'],
      ['PageDown', { shiftKey: true }, '2027-09-19'],
      ['PageUp', { shiftKey: true }, '2026-09-19'],
    ];
    for (const [name, extra, expected] of steps) {
      const at = lastFocused(focus)?.slice(`${ID}.day.`.length) ?? '2026-09-17';
      await fireEvent(day(at), 'focus');
      expect(await key(name, extra)).toHaveBeenCalled();
      expect(lastFocused(focus)).toBe(`${ID}.day.${expected}`);
      expect(q('grid')!.props.accessibilityLabel).toBe(expected.startsWith('2027') ? 'September 2027' : expected.startsWith('2026-10') ? 'October 2026' : 'September 2026');
    }
    await fireEvent(day('2026-09-30'), 'focus');
    await key('ArrowRight');
    expect(q('grid')!.props.accessibilityLabel).toBe('October 2026');
    await fireEvent(day('2026-10-01'), 'focus');
    await key('PageDown');
    await fireEvent(day('2026-11-01'), 'focus');
    // 31 → the last day of a shorter month.
    await fireEvent(day('2026-11-01'), 'focus');
  });

  test('DTP-18: Page Down from the 31st lands on the last day of a shorter month; the active day never moves before min or after max; unavailable days are reached but not chosen; Enter and Space are the day\'s own click', async () => {
    const focus = focusSpy();
    await mount({ value: '2026-01-31', min: '2026-01-05', max: '2026-02-26', disabledDates: ['2026-01-30'] });
    await fireEvent(day('2026-01-31'), 'focus');
    await key('PageDown');
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-02-26`);
    await fireEvent(day('2026-02-26'), 'focus');
    await key('ArrowRight');
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-02-26`);
    await key('PageUp');
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-01-26`);
    await fireEvent(day('2026-01-26'), 'focus');
    await key('Home');
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-01-25`);
    await fireEvent(day('2026-01-25'), 'focus');
    await key('ArrowUp');
    await key('ArrowUp');
    await key('ArrowUp');
    await key('ArrowUp');
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-01-05`);
    await fireEvent(day('2026-01-31'), 'focus');
    await key('ArrowLeft');
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-01-30`);
    await press(day('2026-01-30'));
    expect(textOf(q('header.value'))).toBe('Sat, Jan 31');
    // A key that is not the grid's is left alone.
    await fireEvent(day('2026-01-30'), 'focus');
    expect(await key('a')).not.toHaveBeenCalled();
  });

  test('DTP-18 / DTP-39: right to left, Right Arrow moves to the previous day and Left to the next — the direction the arrow points', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    const focus = focusSpy();
    await mount({ value: '2026-09-17' });
    await fireEvent(day('2026-09-17'), 'focus');
    await key('ArrowRight');
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-09-16`);
    await fireEvent(day('2026-09-16'), 'focus');
    await key('ArrowLeft');
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-09-17`);
  });

  test('DTP-1: focus stays in a modal picker — Tab from its last element (OK, or Cancel while OK is disabled) moves to the first (the entry-mode toggle), Shift+Tab from the first to the last', async () => {
    const focus = focusSpy();
    await mount({ value: '2026-09-17' });
    await fireEvent(q('confirm')!, 'focus');
    expect(await key('Tab')).toHaveBeenCalled();
    expect(lastFocused(focus)).toBe(`${ID}.entry-toggle`);
    await fireEvent(q('entry-toggle')!, 'focus');
    expect(await key('Tab', { shiftKey: true })).toHaveBeenCalled();
    expect(lastFocused(focus)).toBe(`${ID}.confirm`);
    await fireEvent(day('2026-09-17'), 'focus');
    expect(await key('Tab')).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('the header, the actions and text entry (DTP-23 … DTP-28)', () => {
  test('DTP-23: the header — label in its type style and color, header.gap above the pending choice in its type style and color, a part not chosen in the placeholder color, the year added when it is not the current one; the entry-mode toggle at the end; a divider below', async () => {
    const view = await mount({ value: '2026-09-17' });
    expect(viewStyle(q('header')!)).toMatchObject({ paddingStart: tokens.headerPaddingInlineStart, paddingEnd: tokens.headerPaddingInlineEnd, paddingVertical: tokens.headerPaddingBlock, gap: tokens.headerGap });
    expect(textStyle(q('header.label')!)).toMatchObject({ color: painted(tokens.headerLabelColor) });
    expect(textStyle(q('header.value')!)).toMatchObject({ color: painted(tokens.headerValueColor), fontSize: sizeOf(tokens.headerValueTypescale), flex: 1 });
    expect(textOf(q('header.value'))).toBe('Thu, Sep 17');
    expect(textOf(q('entry-toggle'))).toBe('keyboard');
    expect(viewStyle(q('divider')!)).toMatchObject({ height: tokens.dividerWidth, backgroundColor: painted(tokens.dividerColor) });
    await view.unmount();
    const other = await mount({ value: '2026-09-17', today: '2027-01-15' });
    expect(textOf(q('header.value'))).toBe('Thu, Sep 17, 2026');
    await other.unmount();
    await mount({ mode: 'range', start: '2026-09-10' });
    expect(textStyle(q('header.value.start')!).color).toBe(painted(tokens.headerValueColor));
    expect(textStyle(q('header.value.end')!).color).toBe(painted(tokens.headerPlaceholderColor));
    expect(textOf(q('header.value'))).toBe('Sep 10 – End date');
  });

  test('DTP-24: Cancel and OK are text Buttons of the medium size, OK last, at the end, actions.gap apart, container.padding-inline from the end edge and actions.padding-block above and below; the picker does not restyle them', async () => {
    await mount({ value: '2026-09-17' });
    const actions = q('actions')!;
    expect(viewStyle(actions)).toMatchObject({ flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.actionsGap, paddingEnd: tokens.containerPaddingInline, paddingVertical: tokens.actionsPaddingBlock });
    expect((actions.children as Instance[]).map((each) => each.props.testID)).toEqual([`${ID}.cancel`, `${ID}.confirm`]);
    const button = tanrei.components.button;
    expect(viewStyle(q('confirm')!).minHeight).toBe(button.sizes.medium.containerHeight);
    expect(textStyle(q('confirm.label')!).color).toBe(painted(button.variants.text.enabled.labelColor));
  });

  test('DTP-25: text entry — outlined, medium text fields in place of the calendar, one full width (dateLabel) or two side by side input.gap apart (startLabel, endLabel), inset by input.padding-*; the placeholder is the locale\'s pattern', async () => {
    const view = await mount({ value: '2026-09-17', entryMode: 'text' });
    expect(q('calendar')).toBeNull();
    expect(viewStyle(q('fields')!)).toMatchObject({ flexDirection: 'row', gap: tokens.inputGap, paddingHorizontal: tokens.inputPaddingInline, paddingVertical: tokens.inputPaddingBlock });
    expect(q('field.0.input')!.props).toMatchObject({ accessibilityLabel: 'Date', value: '09/17/2026' });
    expect(viewStyle(q('field.0')!).flex).toBe(1);
    const outlined = tanrei.components.textField.variants.outlined;
    expect(outlined).toBeDefined();
    await view.unmount();
    await mount({ mode: 'range', start: '2026-09-10', end: '2026-09-16', entryMode: 'text' });
    expect(q('field.0.input')!.props).toMatchObject({ accessibilityLabel: 'Start date', value: '09/10/2026' });
    expect(q('field.1.input')!.props).toMatchObject({ accessibilityLabel: 'End date', value: '09/16/2026' });
    expect(numericDatePattern('en-US')).toBe('mm/dd/yyyy');
    expect(numericDatePattern('ja-JP')).toBe('yyyy/mm/dd');
    expect(numericDatePattern('de-DE')).toBe('dd.mm.yyyy');
  });

  test('DTP-25: in range mode, a start label that wraps and an end label that does not — the fields are equally tall, the taller one\'s height, with their containers level (TXF-13)', async () => {
    const medium = tanrei.components.textField.sizes.medium;
    const lineOf = (role: keyof typeof tanrei.typescale) => (tanrei.typescale[role] as { lineHeight: number }).lineHeight;
    const floatedLine = lineOf(medium.labelFloatedTypescale as keyof typeof tanrei.typescale);
    const restingLine = lineOf(medium.labelTypescale as keyof typeof tanrei.typescale);
    const lines = (widths: number[], height: number) => widths.map((width, index) => ({ x: 0, y: index * height, width, height, text: '', ascender: 0, descender: 0, capHeight: 0, xHeight: 0 }));
    /** Plays the layout a device reports for a field's container: where it sits in the field and how tall it is. */
    const layOutContainer = async (index: number, top: number, height: number) => fireEvent(q(`field.${index}.container`)!, 'layout', { nativeEvent: { layout: { x: 0, y: top, width: 140, height } } });
    /** The rows a field's container spans, from the field's top: its field's offset, plus the room reserved above it, plus its height. */
    const rows = (index: number) => {
      const field = viewStyle(q(`field.${index}`)!);
      const box = viewStyle(q(`field.${index}.container`)!);
      const top = ((field.marginTop as number | undefined) ?? 0) + ((box.marginTop as number | undefined) ?? 0);
      return { top, bottom: top + (box.minHeight as number) };
    };

    await mount({ mode: 'range', entryMode: 'text', startLabel: 'Start of the stay, first night', endLabel: 'End' });
    // The start label takes two lines resting and floated; the end label one.
    await fireEvent(q('field.0.label')!, 'textLayout', { nativeEvent: { lines: lines([90, 60], restingLine) } });
    await fireEvent(q('field.0.label.measure.resting')!, 'textLayout', { nativeEvent: { lines: lines([90, 60], restingLine) } });
    await fireEvent(q('field.0.label.measure.floated')!, 'textLayout', { nativeEvent: { lines: lines([100, 40], floatedLine) } });
    await fireEvent(q('field.1.label')!, 'textLayout', { nativeEvent: { lines: lines([30], restingLine) } });
    const start = viewStyle(q('field.0.container')!);
    expect(start.marginTop).toBe(floatedLine);
    expect(start.minHeight as number).toBeGreaterThan(medium.containerHeight);
    expect(viewStyle(q('field.1.container')!).minHeight).toBe(medium.containerHeight);

    // Laid out as a device reports: the end field moves down to the start container's top and its container is drawn
    // as tall as the start's.
    await layOutContainer(0, start.marginTop as number, start.minHeight as number);
    await layOutContainer(1, 0, medium.containerHeight);
    expect(viewStyle(q('field.1')!).marginTop).toBe(floatedLine);
    expect(viewStyle(q('field.0')!).marginTop).toBeUndefined();
    expect(viewStyle(q('field.1.container')!).minHeight).toBe(start.minHeight);
    expect(rows(1)).toEqual(rows(0));
    // Equally tall fields: the same rows above the container and the same container (neither shows supporting text).
    expect(textOf(q('field.0'))).not.toContain('Enter a valid date');
    expect(textOf(q('field.1'))).not.toContain('Enter a valid date');

    // The end container, now drawn at the floor, reports again: the layout holds (the floor never holds itself up).
    await layOutContainer(1, 0, start.minHeight as number);
    expect(viewStyle(q('field.1.container')!).minHeight).toBe(start.minHeight);
    expect(viewStyle(q('field.0.container')!).minHeight).toBe(start.minHeight);
    expect(rows(1)).toEqual(rows(0));

    // Both labels fit again: the fields come back to one height, level, with nothing moved.
    await fireEvent(q('field.0.label.measure.resting')!, 'textLayout', { nativeEvent: { lines: lines([90], restingLine) } });
    await fireEvent(q('field.0.label.measure.floated')!, 'textLayout', { nativeEvent: { lines: lines([100], floatedLine) } });
    await layOutContainer(0, 0, medium.containerHeight);
    await layOutContainer(1, 0, medium.containerHeight);
    expect(viewStyle(q('field.0.container')!).minHeight).toBe(medium.containerHeight);
    expect(viewStyle(q('field.1.container')!).minHeight).toBe(medium.containerHeight);
    expect(viewStyle(q('field.1')!).marginTop).toBeUndefined();
    expect(rows(1)).toEqual(rows(0));
  });

  test('DTP-26: a field is filled in the locale\'s numeric form and never reformatted; three digit groups in the locale\'s order with any separators read as a date; errors show when the field is committed and clear on the next edit', async () => {
    expect(numericDateText('ja-JP', { year: 2026, month: 9, day: 7 })).toBe('2026/09/07');
    for (const text of ['9/17/2026', '09-17-2026', '9 17 2026', ' 9.17.2026 ']) expect(parseNumericDate('en-US', text)).toEqual({ year: 2026, month: 9, day: 17 });
    for (const text of ['9/17/26', '2026/09/17', '13/01/2026', '2/30/2026', '9/17', '9/17/2026/1', '']) expect(parseNumericDate('en-US', text)).toBeNull();
    expect(parseNumericDate('de-DE', '17.9.2026')).toEqual({ year: 2026, month: 9, day: 17 });
    expect(parseNumericDate('ar-EG', '١٧/٠٩/٢٠٢٦')).toEqual({ year: 2026, month: 9, day: 17 });
    await mount({ entryMode: 'text', mode: 'range', min: '2026-09-03', disabledDates: ['2026-09-20'] });
    const input = (index: number) => q(`field.${index}.input`)!;
    await fireEvent.changeText(input(0), '9-10-2026');
    expect(input(0).props.value).toBe('9-10-2026');
    expect(textOf(q('header.value'))).toBe('Sep 10 – End date');
    // An end before the start: invalidText on commit; the next edit clears it.
    await fireEvent.changeText(input(1), '9/8/2026');
    await fireEvent(input(1), 'endEditing', { nativeEvent: { text: '9/8/2026' } });
    expect(textOf(q('field.1'))).toContain('Enter a valid date');
    await fireEvent.changeText(input(1), '9/20/2026');
    expect(textOf(q('field.1'))).not.toContain('Enter a valid date');
    await fireEvent(input(1), 'endEditing', { nativeEvent: { text: '9/20/2026' } });
    expect(textOf(q('field.1'))).toContain("This date can't be chosen");
    expect(textOf(q('header.value'))).toBe('Sep 10 – End date');
    await fireEvent.changeText(input(1), '9/21/2026');
    expect(textOf(q('header.value'))).toBe('Sep 10 – Sep 21');
    await fireEvent.changeText(input(0), '');
    expect(textOf(q('header.value'))).toBe('Start date – Sep 21');
  });

  test('DTP-27: the action key moves to the next field, and in the last one activates OK when it is enabled', async () => {
    const onClose = jest.fn();
    await mount({ entryMode: 'text', mode: 'range', start: '2026-09-10', end: '2026-09-16', onClose });
    expect(q('field.0.input')!.props.returnKeyType).toBe('next');
    await fireEvent(q('field.0.input')!, 'submitEditing', { nativeEvent: { text: '09/10/2026' } });
    expect((inputFocus().mock.contexts.at(-1) as { props: { testID: string } }).props.testID).toBe(`${ID}.field.1.input`);
    await fireEvent(q('field.1.input')!, 'submitEditing', { nativeEvent: { text: '09/16/2026' } });
    expect(onClose.mock.calls).toEqual([[{ reason: 'confirm' }]]);
  });

  test('DTP-28: the entry-mode toggle switches between the calendar and text entry, keeps the pending choice, shows the month of the pending date and moves focus; entryMode chooses the entry it opens with; a docked picker has the calendar only and reports text', async () => {
    const focus = focusSpy();
    const view = await mount({ value: '2026-09-17' });
    await press(day('2026-09-03'));
    await fireEvent.press(q('entry-toggle')!);
    expect(q('field.0.input')!.props.value).toBe('09/03/2026');
    expect(q('entry-toggle')!.props.accessibilityLabel).toBe('Switch to calendar');
    expect(textOf(q('entry-toggle'))).toBe('calendar_month');
    await fireEvent.changeText(q('field.0.input')!, '11/5/2026');
    await fireEvent.press(q('entry-toggle')!);
    expect(q('grid')!.props.accessibilityLabel).toBe('November 2026');
    expect(lastFocused(focus)).toBe(`${ID}.day.2026-11-05`);
    await view.unmount();
    await mount({ presentation: 'docked', entryMode: 'text' });
    expect(q('fields')).toBeNull();
    expect(q('grid')).not.toBeNull();
    expect(reports()).toEqual([expect.stringContaining('docked with entryMode "text"')]);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('states (DTP-31 … DTP-35)', () => {
  const ACTIVE = ['hovered', 'focused', 'pressed'] as const;
  async function enter(node: Instance, state: InteractionState) {
    if (state === 'hovered') await fireEvent(node, 'hoverIn');
    if (state === 'focused') await fireEvent(node, 'focus');
    if (state === 'pressed') await fireEvent(node, 'pressIn');
  }

  test.each(ACTIVE)('DTP-31: a %s day, year or view toggle is drawn from that state\'s tokens of its condition (acme values each state apart)', async (state) => {
    await mount({ value: '2026-09-17', mode: 'single' }, { theme: 'light', system: acme });
    for (const [iso, condition] of [['2026-09-17', 'selected'], ['2026-09-24', 'today'], ['2026-09-05', 'unselected']] as const) {
      await enter(day(iso), state);
      expectDayDrawnFrom(iso, condition, state, acme);
    }
    await enter(q('view-toggle')!, state);
    expect(viewStyle(q('view-toggle')!).backgroundColor).toBe(fill(acme.components.datePicker.conditions.unselected[state].containerColor, 'light', acme));
  });

  test('DTP-31: precedence is pressed over focused over hovered; focus from a press does not select focused; the colors move over the state motion', async () => {
    await mount({ value: '2026-09-17' }, { theme: 'light', system: acme });
    const iso = '2026-09-05';
    await fireEvent(day(iso), 'hoverIn');
    await fireEvent(day(iso), 'focus');
    expectDayDrawnFrom(iso, 'unselected', 'focused', acme);
    await fireEvent(day(iso), 'pressIn');
    expectDayDrawnFrom(iso, 'unselected', 'pressed', acme);
    await fireEvent(day(iso), 'pressOut');
    await wait(HOLD + 30);
    expectDayDrawnFrom(iso, 'unselected', 'focused', acme);
    await fireEvent(day(iso), 'blur');
    await fireEvent(day('2026-09-06'), 'pressIn');
    await fireEvent(day('2026-09-06'), 'focus');
    await fireEvent(day('2026-09-06'), 'pressOut');
    await wait(HOLD + 30);
    expect(dayPart('2026-09-06', 'focus-ring')).toBeNull();
  });

  test('DTP-32: keyboard focus shows the focus ring around the day\'s square — an in-range day\'s too — without animation; the view toggle and a year show theirs', async () => {
    await mount({ mode: 'range', start: '2026-09-10', end: '2026-09-16' });
    await fireEvent(day('2026-09-12'), 'focus');
    const ring = dayPart('2026-09-12', 'focus-ring')!;
    expect(ring).not.toBeNull();
    expect(dayPart('2026-09-12', 'container')!.children).toContain(ring);
    await fireEvent(q('view-toggle')!, 'focus');
    expect(q('view-toggle.focus-ring')).not.toBeNull();
    await fireEvent.press(q('view-toggle')!);
    await fireEvent(year(2026), 'focus');
    expect(q('year.2026.focus-ring')).not.toBeNull();
  });

  test('DTP-33: the pressed state appears at once and stays visible for sys.motion.duration.press-hold; a bare click (Enter, Space) shows it too', async () => {
    await mount({ value: '2026-09-17' }, { theme: 'light', system: acme });
    const iso = '2026-09-05';
    await fireEvent(day(iso), 'pressIn');
    await fireEvent(day(iso), 'pressOut');
    expectDayDrawnFrom(iso, 'unselected', 'pressed', acme);
    await wait(HOLD + 30);
    expectDayDrawnFrom(iso, 'unselected', 'enabled', acme);
    await press(day('2026-09-06'));
    expectDayDrawnFrom('2026-09-06', 'selected', 'pressed', acme);
  });

  test('DTP-34: overlay (the default) applies the pressed tokens at once; ripple (m3-like) grows the pressed layer in the day\'s container while the container keeps the state under the press; dim (cupertino) applies the pressed opacity and no layer; none answers nothing', async () => {
    const iso = '2026-09-05';
    const one = await mount({ value: '2026-09-17' });
    await fireEvent(day(iso), 'pressIn');
    expectDayDrawnFrom(iso, 'unselected', 'pressed');
    await one.unmount();
    reduceMotion(false);
    const side = m3Like.components.datePicker.dayContainerSize;
    const measure = jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, side, side, 100, 200));
    const two = await mount({ value: '2026-09-17' }, { theme: 'light', system: m3Like });
    await wait(0);
    await fireEvent(day(iso), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 48, height: 48 } } });
    await fireEvent(day(iso), 'pressIn', { nativeEvent: { pageX: 110, pageY: 205 } });
    const reach = Math.hypot(side - 10, side - 5);
    expect(dayPart(iso, 'container')!.children).toContain(dayPart(iso, 'ripple'));
    expect(viewStyle(q(`day.${iso}.ripple.wave`)!)).toMatchObject({ left: 10 - reach, top: 5 - reach, backgroundColor: painted(m3Like.components.datePicker.conditions.unselected.pressed.containerColor, 'light', m3Like) });
    expect(viewStyle(dayPart(iso, 'container')!).backgroundColor).toBe(fill(m3Like.components.datePicker.conditions.unselected.enabled.containerColor, 'light', m3Like));
    await fireEvent(day(iso), 'pressOut');
    await wait(HOLD + 30);
    await two.unmount();
    measure.mockRestore();
    reduceMotion(true);
    const three = await mount({ value: '2026-09-17' }, { theme: 'light', system: cupertino });
    await fireEvent(day(iso), 'pressIn');
    expect(viewStyle(day(iso)).opacity).toBe(cupertino.components.datePicker.pressedOpacity);
    expect(viewStyle(dayPart(iso, 'container')!).backgroundColor).toBe(fill(cupertino.components.datePicker.conditions.unselected.enabled.containerColor, 'light', cupertino));
    await three.unmount();
    await mount({ value: '2026-09-17' }, { theme: 'light', system: withBehavior({ pressedFeedback: 'none' }) });
    await fireEvent(day(iso), 'pressIn');
    expectDayDrawnFrom(iso, 'unselected', 'enabled');
  });

  test('DTP-35: the day, year and view toggle ease their corners by the smoothing (cupertino: continuous); the focus style glow (acme) is one halo', async () => {
    const view = await mount({ value: '2026-09-17' }, { theme: 'light', system: cupertino });
    expect(viewStyle(dayPart('2026-09-17', 'container')!).borderCurve).toBe('continuous');
    expect(viewStyle(q('view-toggle')!).borderCurve).toBe('continuous');
    await view.unmount();
    await mount({ value: '2026-09-17' }, { theme: 'light', system: acme });
    await fireEvent(day('2026-09-17'), 'focus');
    expect(viewStyle(dayPart('2026-09-17', 'focus-ring')!).boxShadow).toBeDefined();
    expect(dayPart('2026-09-17', 'focus-ring.inner')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('accessibility, locale, layout and reports (DTP-36 … DTP-40)', () => {
  test('DTP-36: a dialog named by label (modal while modal); the grid named by its month; each day a button named by its full date (with todayLabel), selected for the date and every day of a range, described by startLabel / endLabel, disabled while unavailable; the view toggle expanded; years selected', async () => {
    await mount({ mode: 'range', start: '2026-09-10', end: '2026-09-16', label: 'Select dates', disabledDates: ['2026-09-30'] });
    expect(container().props).toMatchObject({ role: 'dialog', accessibilityLabel: 'Select dates', 'aria-modal': true });
    expect(q('grid')!.props).toMatchObject({ role: 'grid', accessibilityLabel: 'September 2026' });
    expect(q('weekdays')!.props.role).toBe('row');
    expect(day('2026-09-10').props).toMatchObject({ role: 'button', accessibilityLabel: 'Thursday, September 10, 2026', accessibilityHint: 'Start date', accessibilityState: { selected: true, disabled: false } });
    expect(day('2026-09-16').props.accessibilityHint).toBe('End date');
    expect(day('2026-09-12').props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(day('2026-09-12').props.accessibilityHint).toBeUndefined();
    expect(day('2026-09-24').props.accessibilityLabel).toBe('Thursday, September 24, 2026, Today');
    expect(day('2026-09-30').props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(q('view-toggle')!.props).toMatchObject({ role: 'button', accessibilityLabel: 'September 2026', accessibilityHint: 'Choose a year', accessibilityState: { expanded: false } });
    // Glyphs are hidden: the buttons are named.
    expect(q('view-toggle.chevron.glyph')).not.toBeNull();
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('accessibilityState={{ expanded: open }}');
    expect(readme).toMatch(/give your anchor[\s\S]*opens a dialog/);
  });

  test('DTP-37: names, digits, the numeric order and the first day of the week come from locale (the platform\'s while empty); firstDayOfWeek overrides the locale\'s', async () => {
    const one = await mount({ locale: 'de-DE', value: '2026-09-17' });
    expect(texts(q('weekdays'))).toEqual(['M', 'D', 'M', 'D', 'F', 'S', 'S']);
    expect(textOf(q('view-toggle.label'))).toBe('September 2026');
    expect(textOf(q('header.value'))).toBe('Do., 17. Sept.');
    await one.unmount();
    const two = await mount({ locale: 'ar-EG', value: '2026-09-17' });
    expect(textOf(dayPart('2026-09-17', 'label'))).toBe('١٧');
    // Egypt's week starts on Saturday.
    expect(q('weekday.6')).not.toBeNull();
    expect((q('weekdays')!.children as Instance[])[0]!.props.testID).toBe(`${ID}.weekday.6`);
    await two.unmount();
    const three = await mount({ locale: 'en-US', firstDayOfWeek: 'monday' });
    expect(texts(q('weekdays'))).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    await three.unmount();
    expect([localeFirstDay('en-US'), localeFirstDay('de-DE'), localeFirstDay('ja'), localeFirstDay('ar-AE'), localeFirstDay('dv-MV'), localeFirstDay('xx')]).toEqual([0, 1, 0, 6, 5, 1]);
    expect(regionOf('zh-Hant-TW')).toBe('TW');
    expect(regionOf('es-419')).toBe('419');
    // fa-IR formats the Gregorian calendar (never the Persian one).
    await mount({ locale: 'fa-IR', value: '2026-09-17' });
    expect(q('grid')!.props.accessibilityLabel).toContain('۲۰۲۶');
  });

  test('DTP-37: today empty reads the device\'s date in its own time zone when the picker opens; an unsupported locale falls back to en-US and is reported', async () => {
    jest.useFakeTimers({ now: new Date(2031, 4, 6, 23, 30), doNotFake: ['queueMicrotask', 'nextTick', 'setImmediate', 'setTimeout', 'clearTimeout'] });
    try {
      await render(
        <TanreiProvider theme="light">
          <DatePickerSurface testID={ID} locale="en-US" />
        </TanreiProvider>,
      );
      expect(q('grid')!.props.accessibilityLabel).toBe('May 2031');
      expect(day('2031-05-06').props.accessibilityLabel).toContain('Today');
    } finally {
      jest.useRealTimers();
    }
  });

  test('DTP-38: the header and the actions stay while the calendar scrolls between them when the room is short; when they alone leave no room, everything scrolls together', async () => {
    await render(
      <TanreiProvider theme="light">
        <View style={{ width: 480, height: 640 }}>
          <DatePickerSurface testID={ID} today={TODAY} locale="en-US" value="2026-09-17" />
        </View>
      </TanreiProvider>,
    );
    await fireEvent(q('area')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 480, height: 400 } } });
    expect(viewStyle(container()).maxHeight).toBe(400 - 2 * tokens.modalContainerMargin);
    expect(viewStyle(q('scroll')!)).toMatchObject({ flexShrink: 1 });
    expect(q('top')).not.toBeNull();
    await fireEvent(q('top')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 300 } } });
    await fireEvent(q('bottom')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 56 } } });
    expect(q('top')).toBeNull();
    expect(q('header')).not.toBeNull();
    expect(q('scroll')!.children.length).toBeGreaterThan(0);
  });

  test('DTP-38: on a narrow window the margins give way first, then the container\'s inline padding (the cells keep the minimum target); on a 320-wide window the cells narrow equally so the grid fits, their numbers and height keep their size, and the surface is never wider than the window', async () => {
    const cell = Math.max(tokens.cellSize, tanrei.measure.target.touch);
    const atWindow = async (width: number, props: Partial<DatePickerProps> = {}) => {
      Dimensions.set({ window: { ...WINDOW, width, height: 800, fontScale: 1 }, screen: { ...WINDOW, width, height: 800, fontScale: 1 } });
      const mounted = await mountPicker({ value: '2026-09-17', ...props });
      const widths = {
        surface: viewStyle(container()).width as number,
        padding: viewStyle(q('calendar')!).paddingHorizontal as number,
        grid: viewStyle(q('grid')!).width as number,
        cells: [day('2026-09-17'), q('weekday.0')!].map((node) => viewStyle(node).width),
        heights: [day('2026-09-17'), q('weekday.0')!].map((node) => viewStyle(node).minHeight),
        number: textStyle(dayPart('2026-09-17', 'label')!).fontSize,
        actionsEnd: viewStyle(q('actions')!).paddingEnd,
      };
      await mounted.view.unmount();
      return widths;
    };
    try {
      // Wide enough: the tokens' own sizes.
      const wide = await atWindow(400);
      const numberSize = wide.number;
      expect(numberSize).toBeGreaterThan(0);
      expect(wide).toEqual({ surface: 7 * cell + 2 * tokens.containerPaddingInline, padding: tokens.containerPaddingInline, grid: 7 * cell, cells: [cell, cell], heights: [cell, cell], number: numberSize, actionsEnd: tokens.containerPaddingInline });
      // Narrower than the surface: the inline padding shrinks, the cells keep the target.
      expect(await atWindow(7 * cell + 6)).toEqual({ surface: 7 * cell + 6, padding: 3, grid: 7 * cell, cells: [cell, cell], heights: [cell, cell], number: numberSize, actionsEnd: 3 });
      // 320: narrower than seven targets — the cells share the window.
      expect(7 * cell).toBeGreaterThan(320);
      expect(await atWindow(320)).toEqual({ surface: 320, padding: 0, grid: 320, cells: [320 / 7, 320 / 7], heights: [cell, cell], number: numberSize, actionsEnd: 0 });
      // The safe area is the window: a 340-wide window with 10 on each side is 320 wide.
      expect((await atWindow(340, { insets: { left: 10, right: 10 } })).surface).toBe(320);
      // Docked: the viewport inside the insets.
      Dimensions.set({ window: { ...WINDOW, width: 320, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 320, height: 800, fontScale: 1 } });
      const docked = await mountPicker({ presentation: 'docked', value: '2026-09-17' });
      await layOut({ width: 320, height: 400 });
      expect(viewStyle(container()).width).toBe(320);
      expect(viewStyle(day('2026-09-17')).width).toBe(320 / 7);
      await docked.view.unmount();
    } finally {
      Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
    }
  });

  test('DTP-38: days, years, weekday names, the view toggle and the header grow with enlarged text (minimum sizes, font scaling on, no line limits)', async () => {
    await mount({ value: '2026-09-17' });
    for (const text of [dayPart('2026-09-17', 'label')!, q('view-toggle.label')!, q('header.value')!, q('header.label')!]) {
      expect(text.props.allowFontScaling).toBe(true);
      expect(text.props.numberOfLines).toBeUndefined();
    }
    expect(viewStyle(dayPart('2026-09-17', 'container')!).height).toBeUndefined();
    expect(viewStyle(day('2026-09-17')).height).toBeUndefined();
  });

  test('DTP-39: right to left the layout mirrors by logical values — the view toggle at the start, the previous and next glyphs swapped, the band\'s halves by start and end', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mount({ mode: 'range', start: '2026-09-10', end: '2026-09-16' });
    expect(textOf(q('previous'))).toBe('chevron_right');
    expect(textOf(q('next'))).toBe('chevron_left');
    expect(viewStyle(dayPart('2026-09-10', 'band')!)).toMatchObject({ start: '50%', end: 0 });
    expect(viewStyle(q('header')!)).toMatchObject({ paddingStart: tokens.headerPaddingInlineStart, paddingEnd: tokens.headerPaddingInlineEnd });
  });

  test('DTP-40: an unknown presentation, mode, entryMode, startView or firstDayOfWeek renders as its default and is reported once in development; release builds stay silent', async () => {
    const expected = await mount({ value: '2026-09-17' });
    const tree = JSON.stringify(expected.toJSON());
    await expected.unmount();
    jest.mocked(console.warn).mockClear();
    const view = await mount({ value: '2026-09-17', presentation: 'sheet' as never, mode: 'multi' as never, entryMode: 'voice' as never, startView: 'month' as never, firstDayOfWeek: 'someday' as never });
    expect(JSON.stringify(view.toJSON())).toBe(tree);
    const messages = reports();
    for (const [what, value] of [['presentation', 'sheet'], ['mode', 'multi'], ['entryMode', 'voice'], ['startView', 'month'], ['firstDayOfWeek', 'someday']]) expect(messages.filter((message) => message.includes(`DatePicker ${what} "${value}"`))).toHaveLength(1);
    await view.unmount();
    resetLookupReports();
    development(false);
    jest.mocked(console.warn).mockClear();
    await mount({ value: '2026-09-17', presentation: 'sheet' as never, min: 'soon' });
    expect(reports()).toEqual([]);
  });

  test('DTP-40: a malformed date, min after max, an end before its start, value in range mode or start in single mode is ignored and reported; an empty label still opens and is reported', async () => {
    const view = await mount({ value: '2026-9-17', min: '2026-10-01', max: '2026-09-01', today: 'tomorrow', disabledDates: ['2026-09-31'] });
    expect(q('grid')!.props.accessibilityLabel).toBe('September 2026');
    expect(textOf(q('header.value'))).toBe('Date');
    const messages = reports();
    for (const fragment of ['value "2026-9-17"', 'min "2026-10-01" after max "2026-09-01"', 'today "tomorrow"', 'disabledDates "2026-09-31"']) expect(messages.some((message) => message.includes(fragment))).toBe(true);
    await view.unmount();
    jest.mocked(console.warn).mockClear();
    const second = await mount({ mode: 'range', value: '2026-09-17', start: '2026-09-12', end: '2026-09-10' });
    expect(textOf(q('header.value'))).toBe('Sep 12 – End date');
    expect(reports().some((message) => message.includes('range mode has value'))).toBe(true);
    expect(reports().some((message) => message.includes('end "2026-09-10" before start'))).toBe(true);
    await second.unmount();
    jest.mocked(console.warn).mockClear();
    const third = await mount({ start: '2026-09-12' });
    expect(reports().some((message) => message.includes('single mode has start or end'))).toBe(true);
    await third.unmount();
    jest.mocked(console.warn).mockClear();
    await mount({ label: '' });
    expect(container().props.accessibilityLabel).toBeUndefined();
    expect(reports().some((message) => message.includes('empty label'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------

describe('token binding', () => {
  test('the default values: surface-bright at level3 (modal) and level2 (docked); cells 48, days 36 squares with corner.small; today a primary ring, selected primary, the band surface-dim', () => {
    expect(tokens).toMatchObject({ cellSize: 48, dayContainerSize: 36, dayContainerShape: tanrei.shape.small, modalContainerElevation: 'level3', dockedContainerElevation: 'level2', outlineWidth: 1 });
    expect(painted(tokens.modalContainerColor)).toBe(role('surfaceBright'));
    expect(painted(tokens.conditions.today.enabled.outlineColor)).toBe(role('primary'));
    expect(painted(tokens.conditions.selected.enabled.containerColor)).toBe(role('primary'));
    expect(painted(tokens.conditions.inRange.enabled.containerColor)).toBe(role('surfaceDim'));
    expect(painted(tokens.conditions.inRange.enabled.containerColor, 'dark')).toBe(role('surfaceDim', 'dark'));
  });

  test('the dark scheme draws the dark values', async () => {
    await mount({ value: '2026-09-17' }, { theme: 'dark' });
    expectDayDrawnFrom('2026-09-17', 'selected', 'enabled', tanrei, 'dark');
    expectDayDrawnFrom('2026-09-24', 'today', 'enabled', tanrei, 'dark');
    expect(viewStyle(container()).backgroundColor).toBe(painted(tokens.modalContainerColor, 'dark'));
  });

  test('values re-valued by a layer are drawn', async () => {
    const lime: TanreiPaint = { kind: 'literal', r: 0.5, g: 1, b: 0, a: 1 };
    const system = withPicker({
      dayContainerSize: 30,
      dayContainerShape: 2,
      modalContainerShape: 3,
      headerGap: 7,
      weekdayColor: lime,
      conditions: { ...tokens.conditions, selected: { ...tokens.conditions.selected, enabled: { ...tokens.conditions.selected.enabled, containerColor: lime } } },
    });
    await mount({ value: '2026-09-17' }, { theme: 'light', system });
    expect(viewStyle(dayPart('2026-09-17', 'container')!)).toMatchObject({ minWidth: 30, minHeight: 30, borderRadius: 2, backgroundColor: formatColor({ r: 0.5, g: 1, b: 0, a: 1 }) });
    expect(viewStyle(container()).borderRadius).toBe(3);
    expect(viewStyle(q('header')!).gap).toBe(7);
    expect(textStyle((q('weekday.0')!.children as Instance[])[0]!).color).toBe(formatColor({ r: 0.5, g: 1, b: 0, a: 1 }));
  });

  test('every fixture is open and sets locale en-US and today, so every platform draws the same month', () => {
    for (const fixture of spec.fixtures) expect(fixture.props).toMatchObject({ open: true, locale: 'en-US', today: expect.any(String) });
  });

  test('the in-place surface is the picker\'s own drawing: the Modal holds the same container', async () => {
    const fixture = spec.fixtures.find((each) => each.id === 'modal')!;
    await render(fixtureElement(datePickerSubject, fixture, { theme: 'light' }, { testID: ID }));
    const inPlace = viewStyle(container());
    await render(
      <TanreiProvider theme="light">
        <DatePicker visible testID="live" value="2026-09-17" today={TODAY} locale="en-US" />
      </TanreiProvider>,
    );
    const live = viewStyle(screen.getByTestId('live', { includeHiddenElements: true }));
    expect({ ...live, opacity: undefined, transform: undefined, maxHeight: undefined }).toEqual({ ...inPlace, opacity: undefined, transform: undefined, maxHeight: undefined });
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(datePickerSubject);
});
