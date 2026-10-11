// Snackbar — the bar, its controls, the host (queue, timing, pause, placement, motion, announcement), accessibility,
// token binding and fixture baselines. Cases come from specs/snackbar.spec.json; every behaviour id is cited by the
// test that covers it.
import { useState, type ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, AppState, Dimensions, Easing, Keyboard, Platform, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreSnackbarControl, TanreiPaint, TanreiScheme, TanreiSnackbarTokens, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { iconFamily } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { useOverlayCover } from '../../theme/overlay';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Snackbar, snackbarAnnouncement, snackbarTimeout, useSnackbar, type SnackbarHost, type SnackbarOptions, type SnackbarProps, type SnackbarResult } from '../Snackbar';
import { acme } from './__fixtures__/acme';
import { snackbarSubject } from './Snackbar.subject';

const spec = loadSpec('snackbar');
const { measure } = tanrei;
const tokens: TanreiSnackbarTokens = tanrei.components.snackbar;
const ID = 'snk';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};
/** Short timeouts, so that the host's tests run in milliseconds — and prove the tokens drive them. */
const FAST = withComponent(tanrei, 'snackbar', { timeoutShort: 80, timeoutLong: 160, motionEnterDuration: 20, motionExitDuration: 20 });
const fast = FAST.components.snackbar;

const HOLD = tanrei.motion.duration.pressHold;
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
/** Jest's clock for the host's timeouts: a loaded machine must not time a snackbar out "early". */
function useClock() {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick', 'setImmediate'] });
  return (ms: number) =>
    act(async () => {
      jest.advanceTimersByTime(ms);
    });
}

function mountInPlace(props: Partial<SnackbarProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <View style={{ width: 400 }}>
        <Snackbar testID={ID} message="Conversation archived" {...props} />
      </View>
    </TanreiProvider>,
  );
}

/** A provider (the host) and a handle on `useSnackbar()`. */
async function mountHost(provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light', system: FAST }, extra: ReactNode = null) {
  let host: SnackbarHost | null = null;
  function Grab() {
    host = useSnackbar();
    return null;
  }
  const view = await render(
    <TanreiProvider {...provider}>
      <Grab />
      {extra}
    </TanreiProvider>,
  );
  const show = async (options: Partial<SnackbarOptions> = {}) => {
    let promise: Promise<SnackbarResult> | null = null;
    await act(async () => {
      promise = host!.show({ testID: ID, message: 'Photo saved', ...options });
    });
    // An object, not the promise: an async function returning a promise would wait for it.
    return settled(promise!);
  };
  return { view, show, host: () => host! };
}
/** Tell the host item its height (after its first layout pass), which starts its entrance and its timeout. */
const layOut = (testID = ID, height = 48) => fireEvent(screen.getByTestId(`${testID}.motion`, { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height } } });
function settled(promise: Promise<SnackbarResult>) {
  const state: { value?: SnackbarResult } = {};
  promise.then((value) => {
    state.value = value;
  });
  return state;
}

const bar = () => screen.queryByTestId(ID, { includeHiddenElements: true });
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const control = (name: TanreiCoreSnackbarControl) => part(name)!;
async function release(name: TanreiCoreSnackbarControl) {
  await fireEvent(control(name), 'pressOut');
  await wait(HOLD + 30);
}
const opacityOf = (from: TanreiSnackbarTokens, in_: InteractionState) => ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: 1 })[in_];
function expectControlDrawnFrom(name: TanreiCoreSnackbarControl, in_: Exclude<InteractionState, 'disabled'>, system: TanreiSystem = tanrei, scheme: TanreiScheme = 'light') {
  const from = system.components.snackbar;
  const state = from.controls[name][in_];
  expect(viewStyle(control(name))).toMatchObject({ backgroundColor: fill(state.containerColor, scheme, system), opacity: opacityOf(from, in_), borderRadius: from.controlsShape });
  const content = name === 'action' ? part('action.label')! : part('close.glyph')!;
  expect(textStyle(content).color).toBe(painted(state.contentColor, scheme, system));
}

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
beforeEach(() => {
  // The platform mocks keep their calls across tests: start from none.
  jest.clearAllMocks();
  reduceMotion(true);
  resetLookupReports();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  development(true);
});
const snackbarReports = () => jest.mocked(console.warn).mock.calls.map(([message]) => String(message)).filter((message) => message.includes('Snackbar'));

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Snackbar.name);
    expect(platform.props).toEqual({ message: 'message', action: 'actionLabel', closable: 'closable', closeLabel: 'closeLabel', duration: 'duration' });
    expect(platform.events).toEqual({ action: 'onAction', dismiss: 'onDismiss' });
  });

  test('the controls are the token axis — action and close; duration is closed: auto, short, long, indefinite (unknown renders as auto, reported)', async () => {
    expect(Object.keys(tokens.controls)).toEqual(['action', 'close']);
    expect(spec.props.find((p) => p.name === 'duration')?.values).toEqual(['auto', 'short', 'long', 'indefinite']);
    const advance = useClock();
    const { show } = await mountHost();
    const result = await show({ duration: 'forever' as never });
    await layOut();
    await advance(fast.timeoutShort + 10);
    await advance(fast.motionExitDuration + 50);
    expect(result.value).toEqual({ result: 'dismiss', reason: 'timeout' });
    expect(snackbarReports()).toEqual([expect.stringContaining('Snackbar duration "forever" is not defined; using "auto"')]);
  });
});

describe('the controls (SNK-1 … SNK-7)', () => {
  test('SNK-1: the action emits action exactly once; the close button emits dismiss with the reason close exactly once', async () => {
    const onAction = jest.fn();
    const onDismiss = jest.fn();
    const view = await mountInPlace({ actionLabel: 'Undo', onAction, onDismiss });
    await fireEvent.press(control('action'));
    await fireEvent.press(control('action'));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
    await view.unmount();
    await mountInPlace({ closable: true, closeLabel: 'Close', onAction, onDismiss });
    await fireEvent.press(control('close'));
    await fireEvent.press(control('close'));
    expect(onDismiss.mock.calls).toEqual([['close']]);
  });

  test('SNK-1: shown by the host, the action resolves show() with action and the bar leaves after its exit motion', async () => {
    const { show } = await mountHost();
    const result = await show({ actionLabel: 'Undo' });
    await layOut();
    await fireEvent.press(control('action'));
    await wait(fast.motionExitDuration + 100);
    expect(result.value).toEqual({ result: 'action' });
    expect(bar()).toBeNull();
  });

  describe.each(['action', 'close'] as const)('SNK-2: the %s control', (name) => {
    test.each(['hovered', 'focused', 'pressed'] as const)('%s: its container, content color and opacity come from that state\'s tokens, and it returns to rest', async (target) => {
      await mountInPlace({ actionLabel: 'Undo', closable: true, closeLabel: 'Close' });
      expectControlDrawnFrom(name, 'enabled');
      if (target === 'hovered') await fireEvent(control(name), 'hoverIn');
      if (target === 'focused') await fireEvent(control(name), 'focus');
      if (target === 'pressed') await fireEvent(control(name), 'pressIn');
      expectControlDrawnFrom(name, target);
      if (target === 'hovered') await fireEvent(control(name), 'hoverOut');
      if (target === 'focused') await fireEvent(control(name), 'blur');
      if (target === 'pressed') await release(name);
      expectControlDrawnFrom(name, 'enabled');
    });
  });

  test('SNK-2: precedence is pressed over focused over hovered, under the acme fixture system; focus that comes with a press does not select focused', async () => {
    const action = acme.components.snackbar.controls.action;
    const expected = (name: Exclude<InteractionState, 'disabled'>) => fill(action[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    await mountInPlace({ actionLabel: 'Undo' }, { theme: 'light', system: acme });
    const background = () => viewStyle(control('action')).backgroundColor;
    await fireEvent(control('action'), 'hoverIn');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(control('action'), 'focus');
    expect(background()).toBe(expected('focused'));
    await fireEvent(control('action'), 'pressIn');
    expect(background()).toBe(expected('pressed'));
    await release('action');
    expect(background()).toBe(expected('focused'));
    await fireEvent(control('action'), 'blur');
    await fireEvent(control('action'), 'hoverOut');
    await fireEvent(control('action'), 'pressIn');
    await fireEvent(control('action'), 'focus');
    await release('action');
    expect(background()).toBe(expected('enabled'));
  });

  test('SNK-3: keyboard focus shows the focus ring around the control, without animation; focus that comes with a press does not', async () => {
    await mountInPlace({ actionLabel: 'Undo', closable: true, closeLabel: 'Close' });
    await fireEvent(control('close'), 'focus');
    expect(viewStyle(part('close.focus-ring')!)).toMatchObject({ position: 'absolute', borderWidth: measure.focus.outerWidth, borderColor: role('focusRing'), top: -(measure.focus.offset + measure.focus.outerWidth) });
    await fireEvent(control('action'), 'pressIn');
    await fireEvent(control('action'), 'focus');
    expect(part('action.focus-ring')).toBeNull();
    await release('action');
  });

  test('SNK-4: a control below the minimum target extends its hit area to sys.target.touch on both axes, its visual size unchanged', async () => {
    await mountInPlace({ actionLabel: 'Undo', closable: true, closeLabel: 'Close' });
    const slop = (measure.target.touch - tokens.controlsHeight) / 2;
    expect(control('close').props.hitSlop).toEqual({ top: slop, bottom: slop, left: slop, right: slop });
    expect(viewStyle(control('close'))).toMatchObject({ width: tokens.controlsHeight, height: tokens.controlsHeight });
    expect(control('action').props.hitSlop).toMatchObject({ top: slop, bottom: slop });
  });

  test('SNK-5: the pressed state appears at once and stays visible for duration.pressHold; a bare click shows it too', async () => {
    await mountInPlace({ actionLabel: 'Undo' });
    await fireEvent(control('action'), 'pressIn');
    expectControlDrawnFrom('action', 'pressed');
    await fireEvent(control('action'), 'pressOut');
    await wait(HOLD / 2);
    expectControlDrawnFrom('action', 'pressed');
    await wait(HOLD / 2 + 30);
    expectControlDrawnFrom('action', 'enabled');
    await fireEvent(control('action'), 'press', { nativeEvent: { target: 1 } });
    expectControlDrawnFrom('action', 'pressed');
    await wait(HOLD + 30);
  });

  test('SNK-6 overlay (the default), ripple (m3-like), dim (cupertino) and none', async () => {
    reduceMotion(false);
    const first = await mountInPlace({ actionLabel: 'Undo' });
    await fireEvent(control('action'), 'pressIn');
    expect(part('action.ripple')).toBeNull();
    expect(viewStyle(control('action')).backgroundColor).toBe(fill(tokens.controls.action.pressed.containerColor));
    await release('action');
    await wait(tokens.motionStateDuration * 2);
    await first.unmount();

    const m3 = m3Like.components.snackbar;
    const timing = jest.spyOn(Animated, 'timing');
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 60, 36, 0, 0));
    const second = await mountInPlace({ actionLabel: 'Undo' }, { theme: 'light', system: m3Like });
    await fireEvent(control('action'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 36 } } });
    timing.mockClear();
    await fireEvent(control('action'), 'pressIn', { nativeEvent: { pageX: 10, pageY: 12 } });
    const reach = Math.hypot(60 - 10, 36 - 12);
    expect(viewStyle(part('action.ripple.wave')!)).toMatchObject({ left: 10 - reach, top: 12 - reach, backgroundColor: painted(m3.controls.action.pressed.containerColor, 'light', m3Like) });
    expect(viewStyle(control('action')).backgroundColor).toBe(fill(m3.controls.action.enabled.containerColor, 'light', m3Like));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: m3.motionFeedbackDuration });
    await release('action');
    await wait(m3.motionStateDuration * 2 + 50);
    await second.unmount();

    reduceMotion(true);
    const cup = cupertino.components.snackbar;
    const third = await mountInPlace({ actionLabel: 'Undo' }, { theme: 'light', system: cupertino });
    await fireEvent(control('action'), 'pressIn');
    expect(viewStyle(control('action'))).toMatchObject({ opacity: cup.pressedOpacity, backgroundColor: fill(cup.controls.action.enabled.containerColor, 'light', cupertino) });
    await release('action');
    await third.unmount();

    const onAction = jest.fn();
    await mountInPlace({ actionLabel: 'Undo', onAction }, { theme: 'light', system: withBehavior({ pressedFeedback: 'none' }) });
    await fireEvent(control('action'), 'pressIn');
    expectControlDrawnFrom('action', 'enabled');
    await fireEvent.press(control('action'));
    expect(onAction).toHaveBeenCalledTimes(1);
    await release('action');
  });

  test('SNK-7: the container and the controls ease their corners by the smoothing (cupertino: continuous); glow (acme) is one halo', async () => {
    const view = await mountInPlace({ actionLabel: 'Undo', closable: true, closeLabel: 'Close' }, { theme: 'light', system: cupertino });
    expect(viewStyle(bar()!)).toMatchObject({ borderCurve: 'continuous', borderRadius: cupertino.components.snackbar.containerShape });
    expect(viewStyle(control('action')).borderCurve).toBe('continuous');
    expect(viewStyle(control('close')).borderCurve).toBe('continuous');
    await view.unmount();
    await mountInPlace({ actionLabel: 'Undo' }, { theme: 'light', system: acme });
    await fireEvent(control('action'), 'focus');
    expect(viewStyle(part('action.focus-ring')!).boxShadow).toHaveLength(1);
  });
});

describe('the host (SNK-8 … SNK-13, SNK-17)', () => {
  test('SNK-8: auto is short without an action and indefinite with one; short and long close after their timeouts (4 and 10 s by default) with the reason timeout', async () => {
    expect(snackbarTimeout(tokens, 'auto', false)).toBe(4000);
    expect(snackbarTimeout(tokens, 'auto', true)).toBeNull();
    expect(snackbarTimeout(tokens, 'long', true)).toBe(10000);
    expect(snackbarTimeout(tokens, 'indefinite', false)).toBeNull();
    const advance = useClock();
    const { show } = await mountHost();
    const first = await show();
    await layOut();
    await advance(fast.timeoutShort - 5);
    expect(bar()).not.toBeNull();
    await advance(10);
    await advance(fast.motionExitDuration + 50);
    expect(first.value).toEqual({ result: 'dismiss', reason: 'timeout' });
    const second = await show({ actionLabel: 'Undo' });
    await layOut();
    await advance(fast.timeoutLong * 3);
    expect(bar()).not.toBeNull();
    expect(second.value).toBeUndefined();
    const long = await show({ duration: 'long' });
    expect(long.value).toBeUndefined();
  });

  test('SNK-8: Android\'s accessibility timeout lengthens it; a screen reader keeps a snackbar with an action open', async () => {
    const advance = useClock();
    jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    jest.mocked(AccessibilityInfo.getRecommendedTimeoutMillis).mockImplementation((original: number) => Promise.resolve(original * 3));
    const { show } = await mountHost();
    const result = await show();
    await layOut();
    await advance(fast.timeoutShort * 2);
    expect(bar()).not.toBeNull();
    await advance(fast.timeoutShort + 10);
    await advance(fast.motionExitDuration + 50);
    expect(result.value).toEqual({ result: 'dismiss', reason: 'timeout' });
    expect(AccessibilityInfo.getRecommendedTimeoutMillis).toHaveBeenCalledWith(fast.timeoutShort);

    jest.mocked(AccessibilityInfo.isScreenReaderEnabled).mockImplementation(() => Promise.resolve(true));
    const timed = await show({ actionLabel: 'Undo', duration: 'short' });
    await layOut();
    await advance(fast.timeoutShort * 10);
    expect(timed.value).toBeUndefined();
  });

  test('SNK-9: paused while hovered, while focus is inside, while the app is in the background and while a modal dialog covers the host; it then starts again from its whole length', async () => {
    const advance = useClock();
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, listener: (state: string) => void) => {
      listeners.push(listener);
      return { remove: () => undefined };
    }) as never);
    let cover: (open: boolean) => void = () => undefined;
    function Cover() {
      const [open, setOpen] = useState(false);
      cover = setOpen;
      useOverlayCover(open);
      return null;
    }
    const { show } = await mountHost(undefined, <Cover />);
    const result = await show({ closable: true, closeLabel: 'Close' });
    await layOut();
    const rest = fast.timeoutShort;
    await advance(rest - 20);
    // Each pause comes 20 ms before the timeout would have closed it; each resume starts the whole length again.
    const pauseAndResume = async (pause: () => Promise<void>, resume: () => Promise<void>) => {
      await pause();
      await advance(rest * 3);
      expect(bar()).not.toBeNull();
      await resume();
      await advance(rest - 20);
      expect(bar()).not.toBeNull();
    };
    await pauseAndResume(
      () => fireEvent(bar()!, 'pointerEnter'),
      () => fireEvent(bar()!, 'pointerLeave'),
    );
    await pauseAndResume(
      () => fireEvent(control('close'), 'focus'),
      () => fireEvent(control('close'), 'blur'),
    );
    await pauseAndResume(
      async () => act(() => listeners.forEach((listener) => listener('background'))),
      async () => act(() => listeners.forEach((listener) => listener('active'))),
    );
    await pauseAndResume(
      async () => act(() => cover(true)),
      async () => act(() => cover(false)),
    );
    await advance(30);
    await advance(fast.motionExitDuration + 50);
    expect(result.value).toEqual({ result: 'dismiss', reason: 'timeout' });
  });

  test('SNK-10: a shown snackbar is announced once, politely (queued after current speech on iOS), its message then its action; nothing takes focus', async () => {
    const focus = jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
    const { show } = await mountHost();
    await show({ message: 'Conversation archived', actionLabel: 'Undo' });
    await layOut();
    await wait(10);
    expect(AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.announceForAccessibilityWithOptions).toHaveBeenCalledWith('Conversation archived, Undo', { queue: true });
    expect(snackbarAnnouncement('Saved', '')).toBe('Saved');
    expect(focus).not.toHaveBeenCalled();
    expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
  });

  test('SNK-11: the action and the close button are in the focus order; Escape while focus is inside closes it with the reason escape', async () => {
    const { show } = await mountHost();
    const result = await show({ actionLabel: 'Undo', closable: true, closeLabel: 'Close' });
    await layOut();
    expect(control('action').props.focusable).toBe(true);
    expect(control('close').props.focusable).toBe(true);
    expect(bar()!.props.focusable).toBeUndefined();
    await fireEvent(control('action'), 'focus');
    await fireEvent(bar()!, 'keyDown', { nativeEvent: { key: 'Escape' }, preventDefault: jest.fn() });
    await wait(fast.motionExitDuration + 100);
    expect(result.value).toEqual({ result: 'dismiss', reason: 'escape' });
  });

  test('SNK-12: one at a time, in order — the next waits until the first has closed; closing the showing one (dismissCurrent) closes only it and the next waiting one then shows; clearing the queue also drops every waiting one — each with the reason host', async () => {
    const { show, host } = await mountHost();
    const first = await show({ message: 'First', testID: 'one', actionLabel: 'Undo' });
    const second = await show({ message: 'Second', testID: 'two', actionLabel: 'Undo' });
    const third = await show({ message: 'Third', testID: 'three' });
    expect(screen.queryByTestId('one', { includeHiddenElements: true })).not.toBeNull();
    expect(screen.queryByTestId('two', { includeHiddenElements: true })).toBeNull();
    await act(async () => host().dismissCurrent());
    await wait(fast.motionExitDuration + 100);
    expect(first.value).toEqual({ result: 'dismiss', reason: 'host' });
    expect(screen.queryByTestId('one', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('two', { includeHiddenElements: true })).not.toBeNull();
    await act(async () => host().clear());
    await wait(fast.motionExitDuration + 100);
    expect(second.value).toEqual({ result: 'dismiss', reason: 'host' });
    expect(third.value).toEqual({ result: 'dismiss', reason: 'host' });
    expect(screen.queryByTestId('three', { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('tanrei.overlay', { includeHiddenElements: true })).toBeNull();
  });

  test('SNK-12: while a modal dialog covers the host, a snackbar not shown yet waits until it closes', async () => {
    let cover: (open: boolean) => void = () => undefined;
    function Cover() {
      const [open, setOpen] = useState(true);
      cover = setOpen;
      useOverlayCover(open);
      return null;
    }
    const { show } = await mountHost(undefined, <Cover />);
    await show();
    expect(bar()).toBeNull();
    await act(async () => cover(false));
    expect(bar()).not.toBeNull();
  });

  test('SNK-12: outside a TanreiProvider there is no host: show() resolves with dismiss, reason host, and development builds report it', async () => {
    let host: SnackbarHost | null = null;
    function Grab() {
      host = useSnackbar();
      return null;
    }
    await render(<Grab />);
    await expect(host!.show({ message: 'Lost' })).resolves.toEqual({ result: 'dismiss', reason: 'host' });
    expect(snackbarReports()).toEqual([expect.stringContaining('outside a TanreiProvider')]);
  });

  test('SNK-13: at the bottom of the host, centred, comp.snackbar.container.margin from the bottom and the sides, above the on-screen keyboard, in the overlay layer above the content', async () => {
    const listeners: Record<string, (event: { endCoordinates: { height: number } }) => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((type: string, listener: (event: { endCoordinates: { height: number } }) => void) => {
      listeners[type] = listener;
      return { remove: () => undefined };
    }) as never);
    const { show } = await mountHost();
    await show();
    const host = screen.getByTestId(`${ID}.host`, { includeHiddenElements: true });
    expect(viewStyle(host)).toEqual({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end', alignItems: 'center', paddingLeft: tokens.containerMargin, paddingRight: tokens.containerMargin, paddingBottom: tokens.containerMargin });
    expect(host.props.pointerEvents).toBe('box-none');
    await act(async () => listeners.keyboardDidShow!({ endCoordinates: { height: 300 } }));
    expect(viewStyle(host).paddingBottom).toBe(tokens.containerMargin + 300);
    await act(async () => listeners.keyboardDidHide!({ endCoordinates: { height: 0 } }));
    expect(viewStyle(host).paddingBottom).toBe(tokens.containerMargin);
    expect(screen.getByTestId('tanrei.overlay', { includeHiddenElements: true }).props.pointerEvents).toBe('box-none');
    expect(viewStyle(bar()!).alignSelf).toBe('center');
  });

  test('SNK-13: inside the safe area — TanreiProvider\'s insets: its margin from the bottom inset and the side insets, the keyboard over the bottom inset while it is shown, and never wider than the room between the side insets', async () => {
    const listeners: Record<string, (event: { endCoordinates: { height: number } }) => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((type: string, listener: (event: { endCoordinates: { height: number } }) => void) => {
      listeners[type] = listener;
      return { remove: () => undefined };
    }) as never);
    const insets = { top: 47, right: 12, bottom: 34, left: 20 };
    const { show } = await mountHost({ theme: 'light', system: FAST, insets });
    await show();
    const host = screen.getByTestId(`${ID}.host`, { includeHiddenElements: true });
    expect(viewStyle(host)).toMatchObject({ paddingLeft: tokens.containerMargin + 20, paddingRight: tokens.containerMargin + 12, paddingBottom: tokens.containerMargin + 34 });
    await act(async () => listeners.keyboardDidShow!({ endCoordinates: { height: 300 } }));
    expect(viewStyle(host).paddingBottom).toBe(tokens.containerMargin + 300);
    await act(async () => listeners.keyboardDidHide!({ endCoordinates: { height: 0 } }));
    expect(viewStyle(host).paddingBottom).toBe(tokens.containerMargin + 34);
    await fireEvent(host, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 800 } } });
    expect(viewStyle(bar()!).maxWidth).toBe(300 - 2 * tokens.containerMargin - 32);
  });

  test('SNK-14: never wider than the host less its margin on each side, even where its minimum width is wider', async () => {
    const { show } = await mountHost();
    await show();
    await fireEvent(screen.getByTestId(`${ID}.host`, { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 800 } } });
    expect(viewStyle(bar()!)).toMatchObject({ minWidth: 300 - 2 * tokens.containerMargin, maxWidth: 300 - 2 * tokens.containerMargin });
  });

  test('SNK-17: once laid out it rises from below the bottom edge by its height plus its margin while it fades in; it fades out in place; the next shows only after', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const bezier = jest.spyOn(Easing, 'bezier');
    const { show, host } = await mountHost({ theme: 'light' });
    await show({ actionLabel: 'Undo' });
    await show({ message: 'Next', testID: 'next' });
    await wait(10);
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionEnterDuration)).toHaveLength(0);
    expect(viewStyle(part('motion')!).opacity).toBe(0);
    await layOut(ID, 48);
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionEnterDuration)?.[1]).toMatchObject({ toValue: 1, useNativeDriver: true });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionEnterEasing);
    expect(interpolate.mock.calls.map(([config]) => config.outputRange)).toContainEqual([48 + tokens.containerMargin, 0]);
    await wait(tokens.motionEnterDuration + 50);
    await act(async () => host().dismissCurrent());
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionExitDuration)?.[1]).toMatchObject({ toValue: 0 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionExitEasing);
    expect(bar()).not.toBeNull();
    expect(screen.queryByTestId('next', { includeHiddenElements: true })).toBeNull();
    await wait(tokens.motionExitDuration + 100);
    expect(bar()).toBeNull();
    expect(screen.queryByTestId('next', { includeHiddenElements: true })).not.toBeNull();
  });

  test('SNK-17: where motion is reduced it fades without moving on iOS, and appears and disappears at once on Android', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const { show, host } = await mountHost({ theme: 'light' });
    await show({ actionLabel: 'Undo' });
    await layOut();
    expect(viewStyle(part('motion')!).transform).toBeUndefined();
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionEnterDuration)).toBe(true);
    await act(async () => host().dismissCurrent());
    await wait(tokens.motionExitDuration + 100);
    timing.mockClear();
    jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    await show({ actionLabel: 'Undo' });
    await layOut();
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionEnterDuration)).toBe(false);
    await act(async () => host().dismissCurrent());
    expect(bar()).toBeNull();
  });
});

describe('the bar (SNK-14 … SNK-16, SNK-18 … SNK-20)', () => {
  test('SNK-14: at least min-height tall, min-width to max-width wide, its color, elevation and corners; the message padded start, above and below, and the end padding without and with controls', async () => {
    const view = await mountInPlace();
    const style = viewStyle(bar()!);
    expect(style).toMatchObject({ minHeight: tokens.containerMinHeight, minWidth: tokens.containerMinWidth, maxWidth: tokens.containerMaxWidth, borderRadius: tokens.containerShape, backgroundColor: painted(tokens.containerColor), paddingStart: tokens.containerPaddingInlineStart, paddingEnd: tokens.containerPaddingInlineEnd });
    expect(painted(tokens.containerColor)).toBe(role('inverseSurface'));
    const level = createTanreiTheme(tanrei, 'light').elevation(tokens.containerElevation);
    expect(style.boxShadow).toEqual(level.boxShadow);
    expect(textStyle(part('message')!)).toMatchObject({ paddingTop: tokens.containerPaddingBlock, paddingBottom: tokens.containerPaddingBlock });
    await view.unmount();
    await mountInPlace({ closable: true, closeLabel: 'Close' });
    expect(viewStyle(bar()!).paddingEnd).toBe(tokens.containerPaddingInlineEndWithControls);
  });

  test('SNK-15: the message in its type style and color; container.gap to the controls, controls.gap between them; the action and the close button at their sizes, padding, type and glyph, with controls.shape corners', async () => {
    await mountInPlace({ actionLabel: 'Undo', closable: true, closeLabel: 'Close' });
    const theme = createTanreiTheme(tanrei, 'light');
    expect(textStyle(part('message')!)).toMatchObject({ color: painted(tokens.supportingTextColor), fontSize: theme.text(tokens.supportingTextTypescale).fontSize });
    expect(viewStyle(part('row')!).gap).toBe(tokens.containerGap);
    expect(viewStyle(part('controls')!).gap).toBe(tokens.controlsGap);
    expect(viewStyle(control('action'))).toMatchObject({ minHeight: tokens.controlsHeight, paddingStart: tokens.controlsPaddingInline, paddingEnd: tokens.controlsPaddingInline, borderRadius: tokens.controlsShape });
    expect(textStyle(part('action.label')!).fontSize).toBe(theme.text(tokens.controlsLabelTypescale).fontSize);
    expect(viewStyle(control('close'))).toMatchObject({ width: tokens.controlsHeight, height: tokens.controlsHeight, borderRadius: tokens.controlsShape });
    expect(viewStyle(part('close.icon')!)).toMatchObject({ width: tokens.controlsIconSize, height: tokens.controlsIconSize });
    expect(textStyle(part('close.glyph')!).fontFamily).toBe(iconFamily(tanrei.icon, false).families[0]);
    // Centred on the message's first line: the controls move down by (padding + line / 2) − height / 2.
    const line = theme.text(tokens.supportingTextTypescale).lineHeight as number;
    expect(viewStyle(part('controls')!).marginTop).toBe(Math.max(0, tokens.containerPaddingBlock + line / 2 - tokens.controlsHeight / 2));
    await fireEvent(part('message')!, 'textLayout', { nativeEvent: { lines: [{ height: 30, y: 0, width: 200, x: 0, text: '', ascender: 0, descender: 0, capHeight: 0, xHeight: 0 }] } });
    expect(viewStyle(part('controls')!).marginTop).toBe(Math.max(0, tokens.containerPaddingBlock + 15 - tokens.controlsHeight / 2));
  });

  test('SNK-16: a message that needs more than two lines, or an action label that would wrap, moves the action to its own row, end-aligned below the message; the close button stays on the first row', async () => {
    const line = { height: 22, y: 0, width: 200, x: 0, text: '', ascender: 0, descender: 0, capHeight: 0, xHeight: 0 };
    const view = await mountInPlace({ actionLabel: 'Review', closable: true, closeLabel: 'Close' });
    expect(part('action-row')).toBeNull();
    await fireEvent(part('message')!, 'textLayout', { nativeEvent: { lines: [line, line] } });
    expect(part('action-row')).toBeNull();
    await fireEvent(part('message')!, 'textLayout', { nativeEvent: { lines: [line, line, line] } });
    const own = part('action-row')!;
    expect(own.children).toContain(control('action'));
    expect(viewStyle(own)).toMatchObject({ flexDirection: 'row', justifyContent: 'flex-end' });
    const ancestors: (string | undefined)[] = [];
    for (let node = control('close').parent; node; node = node.parent) ancestors.push(node.props?.testID);
    expect(ancestors).toContain(`${ID}.row`);
    // The action's label never wraps or is cut: no line limit.
    expect(part('action.label')!.props.numberOfLines).toBeUndefined();
    expect(part('message')!.props.numberOfLines).toBeUndefined();
    await view.unmount();
    await mountInPlace({ actionLabel: 'Review files that failed' });
    await fireEvent(part('action.label')!, 'textLayout', { nativeEvent: { lines: [line, line] } });
    expect(part('action-row')).not.toBeNull();
  });

  test('SNK-18: right-to-left mirrors the bar — logical padding in a row React Native mirrors, the controls at the end', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mountInPlace({ actionLabel: 'Undo' });
    const style = viewStyle(bar()!);
    expect(style.paddingStart).toBe(tokens.containerPaddingInlineStart);
    expect(style.paddingLeft).toBeUndefined();
    expect(viewStyle(part('row')!).flexDirection).toBe('row');
  });

  test('SNK-19: drawn in place it has no timeout, queue, motion or announcement, and still emits action and dismiss', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const onDismiss = jest.fn();
    await mountInPlace({ duration: 'short', closable: true, closeLabel: 'Close', onDismiss }, { theme: 'light', system: FAST });
    await wait(fast.timeoutShort * 2);
    expect(bar()).not.toBeNull();
    expect(timing.mock.calls.filter(([, config]) => config.duration === fast.motionEnterDuration)).toHaveLength(0);
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    expect(AccessibilityInfo.announceForAccessibilityWithOptions).not.toHaveBeenCalled();
    expect(screen.queryByTestId('tanrei.overlay', { includeHiddenElements: true })).toBeNull();
    await fireEvent(bar()!, 'keyDown', { nativeEvent: { key: 'Escape' } });
    expect(onDismiss.mock.calls).toEqual([['escape']]);
  });

  test('SNK-19: drawn in place it is centred across the width it is given, as SNK-13 centres it in a host', async () => {
    await mountInPlace({});
    expect(viewStyle(bar()!).alignSelf).toBe('center');
  });

  test('SNK-20: an empty message still renders; a closable one without closeLabel still draws its button; a timed action reminds the product — each in development builds only', async () => {
    const view = await mountInPlace({ message: '', closable: true, actionLabel: 'Undo', duration: 'short' });
    expect(bar()).not.toBeNull();
    expect(control('close')).toBeTruthy();
    expect(snackbarReports()).toEqual([
      expect.stringContaining('a Snackbar (testID "snk") has no message'),
      expect.stringContaining('the close button of a Snackbar (testID "snk") has no closeLabel'),
      expect.stringContaining('times out (duration "short") with the action "Undo"; offer that action elsewhere too'),
    ]);
    await view.unmount();
    jest.mocked(console.warn).mockClear();
    development(false);
    await mountInPlace({ message: '', closable: true });
    expect(snackbarReports()).toEqual([]);
  });

  test('accessibility: the controls are buttons named by the action\'s label and closeLabel; the glyph is hidden', async () => {
    await mountInPlace({ actionLabel: 'Undo', closable: true, closeLabel: 'Close' });
    expect(screen.getByRole('button', { name: 'Undo' })).toBe(control('action'));
    expect(screen.getByRole('button', { name: 'Close' })).toBe(control('close'));
    expect(part('close.icon')!.props.accessibilityElementsHidden).toBe(true);
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  test.each(schemes)('$scheme: the bar, the message and both controls at rest and hovered', async ({ provider, scheme }) => {
    await mountInPlace({ actionLabel: 'Undo', closable: true, closeLabel: 'Close' }, provider);
    expect(viewStyle(bar()!).backgroundColor).toBe(painted(tokens.containerColor, scheme));
    expect(textStyle(part('message')!).color).toBe(painted(tokens.supportingTextColor, scheme));
    for (const name of ['action', 'close'] as const) {
      expectControlDrawnFrom(name, 'enabled', tanrei, scheme);
      await fireEvent(control(name), 'hoverIn');
      expectControlDrawnFrom(name, 'hovered', tanrei, scheme);
      await fireEvent(control(name), 'hoverOut');
    }
  });

  test('the default values: inverse-surface at level3, corner 6, 288 to 560 wide, 48 tall; the action in inverse-primary, the close glyph in inverse-on-surface', () => {
    expect(tokens).toMatchObject({ containerElevation: 'level3', containerShape: 6, containerMinWidth: 288, containerMaxWidth: 560, containerMinHeight: 48, timeoutShort: 4000, timeoutLong: 10000 });
    expect(painted(tokens.controls.action.enabled.contentColor)).toBe(role('inversePrimary'));
    expect(painted(tokens.controls.close.enabled.contentColor)).toBe(role('inverseOnSurface'));
  });

  test('values re-valued by a layer are drawn', async () => {
    const system = withComponent(tanrei, 'snackbar', { containerShape: 13, containerPaddingInlineStart: 21, controlsGap: 7, controlsHeight: 40 });
    await mountInPlace({ actionLabel: 'Undo', closable: true, closeLabel: 'Close' }, { theme: 'light', system });
    expect(viewStyle(bar()!)).toMatchObject({ borderRadius: 13, paddingStart: 21 });
    expect(viewStyle(part('controls')!).gap).toBe(7);
    expect(viewStyle(control('close'))).toMatchObject({ width: 40, height: 40 });
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(snackbarSubject);
});

