// BottomSheet — presentation, focus, dismissal, heights, drag, the drag handle, layout, motion, accessibility, token
// binding and fixture baselines. Cases come from specs/bottom-sheet.spec.json; every behaviour id is cited by the test
// that covers it.
import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, PanResponder, Text, View, type PanResponderCallbacks } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiBottomSheetTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, viewStyle, textStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { useContentColor } from '../../theme/contentColor';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { BottomSheet, BottomSheetSurface, bottomSheetHeights, bottomSheetRelease, type BottomSheetProps } from '../BottomSheet';
import { Dialog } from '../Dialog';
import { acme } from './__fixtures__/acme';
import { bottomSheetSubject } from './BottomSheet.subject';

const spec = loadSpec('bottom-sheet');
const tokens: TanreiBottomSheetTokens = tanrei.components.bottomSheet;
const handleTokens = tokens.controls.dragHandle;
const ID = 'sheet';
const HOLD = tanrei.motion.duration.pressHold;
const { measure } = tanrei;

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

const LONG = 'Please read these terms before you continue. '.repeat(40);
const element = (props: Partial<BottomSheetProps> = {}) => (
  <BottomSheet testID={ID} open accessibilityLabel="Save photo" handleLabel="Resize sheet" {...props}>
    {props.children ?? 'Choose where to save the photo.'}
  </BottomSheet>
);
function mount(props: Partial<BottomSheetProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(<TanreiProvider {...provider}>{element(props)}</TanreiProvider>);
}
function mountInPlace(props: Partial<BottomSheetProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  const { open: _open, ...rest } = props;
  return render(
    <TanreiProvider {...provider}>
      <View style={{ width: 400, height: 720 }}>
        <BottomSheetSurface testID={ID} accessibilityLabel="Save photo" handleLabel="Resize sheet" {...rest}>
          {props.children ?? 'Choose where to save the photo.'}
        </BottomSheetSurface>
      </View>
    </TanreiProvider>,
  );
}

const q = (name: string) => screen.queryByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const sheet = () => q('')!;
const handle = () => q('handle')!;
const layout = (name: string, box: { width: number; height: number }) => fireEvent(q(name)!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, ...box } } });
/** What a platform that lays out tells the sheet: the area's height, the content's own height, and the sheet's height at rest. */
async function measureSheet({ area = 720, content, rest }: { area?: number; content: number; rest: number }) {
  await layout('area', { width: 400, height: area });
  await fireEvent(q('scroll')!, 'contentSizeChange', 400, content);
  await layout('', { width: 400, height: rest });
}
const release = async () => {
  await fireEvent(handle(), 'pressOut');
  await wait(HOLD + 30);
};
/** The PanResponder the sheet made (its drag). */
function captureDrag() {
  const captured: { handlers: PanResponderCallbacks } = { handlers: {} };
  const create = PanResponder.create.bind(PanResponder);
  jest.spyOn(PanResponder, 'create').mockImplementation((config) => {
    captured.handlers = config;
    return create(config);
  });
  return captured;
}
const gesture = (dy: number, vy = 0, dx = 0) => ({ dx, dy, vx: 0, vy, moveX: 0, moveY: 0, x0: 0, y0: 0, numberActiveTouches: 1, stateID: 1 }) as never;
async function dragBy(handlers: PanResponderCallbacks, dy: number, vy = 0) {
  await act(async () => {
    handlers.onPanResponderGrant!({} as never, gesture(0));
    handlers.onPanResponderMove!({} as never, gesture(dy));
  });
  await act(async () => handlers.onPanResponderRelease!({} as never, gesture(dy, vy)));
}
const reports = () => jest.mocked(console.warn).mock.calls.map(([message]) => String(message)).filter((message) => message.includes('BottomSheet'));

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  Dimensions.set({ window: { ...WINDOW, width: 400, height: 720, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 720, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
beforeEach(() => {
  jest.clearAllMocks();
  resetLookupReports();
  reduceMotion(true);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  development(true);
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(BottomSheet.name);
    expect(platform.props).toEqual({ variant: 'variant', open: 'open', detent: 'detent', dismissible: 'dismissible', handle: 'handle', handleLabel: 'handleLabel', inset: 'inset', label: 'accessibilityLabel' });
    expect(platform.events).toEqual({ close: 'onClose', detentChange: 'onDetentChange' });
  });

  test('defaults follow the spec: closed (nothing, no Modal), modal, partial, dismissible, with a handle, inset', async () => {
    const onClose = jest.fn();
    const view = await mount({ open: undefined, onClose });
    expect(q('modal')).toBeNull();
    expect(sheet()).toBeNull();
    await view.rerender(<TanreiProvider theme="light">{element({ onClose })}</TanreiProvider>);
    expect(q('modal')).not.toBeNull();
    expect(sheet().props.role).toBe('dialog');
    expect(viewStyle(sheet()).maxHeight).toBe('50%');
    expect(handle()).not.toBeNull();
    expect(q('scroll')!.props.contentContainerStyle).toMatchObject({ paddingStart: tokens.containerPadding, paddingEnd: tokens.containerPadding, paddingBottom: tokens.containerPadding });
    await fireEvent(q('modal')!, 'requestClose');
    expect(onClose).toHaveBeenCalledWith('back');
  });
});

describe('presentation, focus and dismissal (BSH-1 … BSH-5, BSH-20, BSH-23)', () => {
  test('BSH-1: open presents a modal sheet in a transparent Modal without the platform\'s animation or dim, over a scrim of comp.bottom-sheet.scrim.color; a standard sheet has neither Modal nor scrim', async () => {
    const view = await mount();
    expect(q('modal')!.props).toMatchObject({ visible: true, transparent: true, animationType: 'none', statusBarTranslucent: true, navigationBarTranslucent: true });
    expect(viewStyle(q('scrim')!)).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: painted(tokens.scrimColor) });
    expect(q('scrim')!.props.importantForAccessibility).toBe('no-hide-descendants');
    await view.unmount();
    await mount({ variant: 'standard' });
    expect(q('modal')).toBeNull();
    expect(q('scrim')).toBeNull();
    expect(sheet()).not.toBeNull();
  });

  test('BSH-1: opening slides the sheet up from below the bottom edge while the scrim fades in, over the enter motion; closing slides it down and fades the scrim over the exit motion, then it goes', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const view = await mount({ open: false });
    await view.rerender(<TanreiProvider theme="light">{element()}</TanreiProvider>);
    await wait(10);
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionEnterDuration)?.[1]).toMatchObject({ toValue: 1 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionEnterEasing);
    // From its own height (the window's until it is laid out) below its place, to its place.
    expect(interpolate.mock.calls.map(([config]) => config.outputRange)).toContainEqual([720, 0]);
    expect(viewStyle(q('scrim')!).opacity).toBeLessThan(1);
    await wait(tokens.motionEnterDuration + 50);
    // Settled: nothing is animated, the sheet carries no transform.
    expect(viewStyle(sheet()).transform).toBeUndefined();
    await view.rerender(<TanreiProvider theme="light">{element({ open: false })}</TanreiProvider>);
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionExitDuration)?.[1]).toMatchObject({ toValue: 0 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionExitEasing);
    expect(q('modal')).not.toBeNull();
    await wait(tokens.motionExitDuration + 100);
    expect(q('modal')).toBeNull();
  });

  test('BSH-1: a sheet mounted open appears in place without motion; where motion is reduced it fades in place (iOS) or appears at once (Android)', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const first = await mount();
    await wait(10);
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionEnterDuration)).toBe(false);
    expect(viewStyle(sheet()).transform).toBeUndefined();
    await first.unmount();
    reduceMotion(true);
    const second = await mount({ open: false });
    await wait(10);
    await second.rerender(<TanreiProvider theme="light">{element()}</TanreiProvider>);
    await wait(10);
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionEnterDuration)).toBe(true);
    // A fade, no slide: the translation is the drag's offset only (0).
    expect(viewStyle(sheet()).transform).toEqual([{ translateY: 0 }]);
    expect(viewStyle(sheet()).opacity).toBeLessThan(1);
    await second.unmount();
    timing.mockClear();
    jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    const android = await mount({ open: false });
    await wait(10);
    await android.rerender(<TanreiProvider theme="light">{element()}</TanreiProvider>);
    await wait(10);
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionEnterDuration)).toBe(false);
    await android.rerender(<TanreiProvider theme="light">{element({ open: false })}</TanreiProvider>);
    expect(q('modal')).toBeNull();
  });

  test('BSH-2: a modal sheet is a window of its own (everything outside it inert, the content behind not scrolled) and a modal dialog that keeps VoiceOver inside; the README states what React Native does with Tab', async () => {
    await mount();
    expect(q('modal')).not.toBeNull();
    expect(sheet().props).toMatchObject({ 'aria-modal': true, accessibilityViewIsModal: true });
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('### `BottomSheet` and `BottomSheetSurface`');
    expect(readme).toContain('focus cannot leave its window');
  });

  test('BSH-3: opening moves focus to initialFocusRef (keyboard and screen reader), else the screen reader to the container — at once, not after the motion; both variants; a modal sheet mounted open moves focus in as if it had just opened, a standard one mounted open moves nothing', async () => {
    reduceMotion(false);
    const marked = { current: { focus: jest.fn() } };
    const view = await mount({ open: false, initialFocusRef: marked });
    expect(marked.current.focus).not.toHaveBeenCalled();
    await view.rerender(<TanreiProvider theme="light">{element({ initialFocusRef: marked })}</TanreiProvider>);
    expect(marked.current.focus).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(marked.current, 'focus');
    // The Modal's onShow (its window is on screen) moves it once more for the same opening, as the dialog's does.
    await fireEvent(q('modal')!, 'show');
    expect(marked.current.focus).toHaveBeenCalledTimes(2);
    await fireEvent(q('modal')!, 'show');
    expect(marked.current.focus).toHaveBeenCalledTimes(2);
    await view.unmount();
    jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mockClear();
    const standard = await mount({ variant: 'standard', open: false });
    await standard.rerender(<TanreiProvider theme="light">{element({ variant: 'standard' })}</TanreiProvider>);
    const calls = jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]![0]).toBeTruthy();
    expect(calls[0]![1]).toBe('focus');
    await standard.unmount();
    // A modal sheet mounted open: everything behind it is unreachable, so focus moves in at once — and once more when
    // its window is on screen.
    jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mockClear();
    const mountedMarked = { current: { focus: jest.fn() } };
    const mounted = await mount({ initialFocusRef: mountedMarked });
    expect(mountedMarked.current.focus).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(mountedMarked.current, 'focus');
    await fireEvent(q('modal')!, 'show');
    expect(mountedMarked.current.focus).toHaveBeenCalledTimes(2);
    await mounted.unmount();
    jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mockClear();
    const unmarked = await mount();
    const toContainer = jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mock.calls;
    expect(toContainer).toHaveLength(1);
    expect((toContainer[0]![0] as unknown as { props: { testID: string } }).props.testID).toBe(ID);
    await unmarked.unmount();
    // A standard sheet mounted open moves nothing.
    jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mockClear();
    const standingMarked = { current: { focus: jest.fn() } };
    await mount({ variant: 'standard', initialFocusRef: standingMarked });
    expect(standingMarked.current.focus).not.toHaveBeenCalled();
    expect(AccessibilityInfo.sendAccessibilityEvent).not.toHaveBeenCalled();
  });

  test('BSH-3: closing leaves focus where the platform puts it — React Native cannot tell which element had it (README)', () => {
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('React Native cannot tell which element had focus before it opened, as for the dialog');
  });

  test('BSH-4: a standard sheet draws no scrim, is no Modal (nothing inert, no trap), lets presses above it through, ignores Escape and back, and docks to its parent\'s bottom edge', async () => {
    const onClose = jest.fn();
    await render(
      <TanreiProvider theme="light">
        <View style={{ height: 720 }}>
          <Text testID="content">Map</Text>
          {element({ variant: 'standard', onClose })}
        </View>
      </TanreiProvider>,
    );
    expect(q('scrim')).toBeNull();
    expect(q('modal')).toBeNull();
    expect(sheet().props['aria-modal']).toBeUndefined();
    expect(q('stage')!.props.pointerEvents).toBe('box-none');
    expect(q('area')!.props.pointerEvents).toBe('box-none');
    expect(viewStyle(q('area')!)).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' });
    expect(sheet().props.onKeyDown).toBeUndefined();
    expect(sheet().props.onAccessibilityEscape).toBeUndefined();
    expect(screen.getByTestId('content')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('BSH-5: while dismissible, the scrim, Escape, Android\'s back and the iOS escape gesture each emit close once with their reason; the sheet stays until the product closes it; while not dismissible, nothing — and the scrim still takes the press', async () => {
    const onClose = jest.fn();
    const view = await mount({ onClose });
    await fireEvent.press(q('scrim.press')!);
    await fireEvent(sheet(), 'keyDown', { nativeEvent: { key: 'Escape' }, preventDefault: jest.fn() });
    await fireEvent(q('modal')!, 'requestClose');
    await fireEvent(sheet(), 'accessibilityEscape');
    expect(onClose.mock.calls).toEqual([['scrim'], ['escape'], ['back'], ['back']]);
    expect(q('modal')).not.toBeNull();
    onClose.mockClear();
    await view.rerender(<TanreiProvider theme="light">{element({ onClose, dismissible: false })}</TanreiProvider>);
    await fireEvent.press(q('scrim.press')!);
    await fireEvent(sheet(), 'keyDown', { nativeEvent: { key: 'Escape' } });
    await fireEvent(q('modal')!, 'requestClose');
    await fireEvent(sheet(), 'accessibilityEscape');
    expect(onClose).not.toHaveBeenCalled();
    expect(q('scrim.press')).not.toBeNull();
  });

  test('BSH-5 / BSH-20: a released drag that asks to close emits close("drag") once; the product closing it slides it out from where the drag left it', async () => {
    const drag = captureDrag();
    function Product() {
      const [open, setOpen] = useState(true);
      return <TanreiProvider theme="light">{element({ open, onClose: () => setOpen(false) })}</TanreiProvider>;
    }
    await render(<Product />);
    await measureSheet({ content: 60, rest: 108 });
    await dragBy(drag.handlers, 80);
    // Below half of its one height: it asked, and the product closed it; it leaves from where it was.
    expect(viewStyle(sheet()).transform).toEqual([{ translateY: 80 }]);
    await wait(tokens.motionExitDuration + 100);
    expect(q('modal')).toBeNull();
  });

  test('BSH-20: a drag close the product declines holds for one frame where it was released, then settles back at the lowest height', async () => {
    const drag = captureDrag();
    const frames: ((time: number) => void)[] = [];
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));
    const onClose = jest.fn();
    await mount({ onClose });
    await measureSheet({ content: 60, rest: 108 });
    await act(async () => {
      drag.handlers.onPanResponderGrant!({} as never, gesture(0));
      drag.handlers.onPanResponderMove!({} as never, gesture(80));
      drag.handlers.onPanResponderRelease!({} as never, gesture(80));
    });
    expect(onClose).toHaveBeenCalledWith('drag');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(viewStyle(sheet())).toMatchObject({ height: 108, transform: [{ translateY: 80 }] });
    expect(frames.length).toBeGreaterThan(0);
    await wait(40);
    // Still where the drag left it until the frame has passed (the hold is the last frame asked for).
    expect(viewStyle(sheet())).toMatchObject({ height: 108, transform: [{ translateY: 80 }] });
    await act(async () => frames.at(-1)!(0));
    // Settled back (at once: reduce motion is on) and at rest again.
    expect(viewStyle(sheet()).transform).toBeUndefined();
    expect(viewStyle(sheet()).height).toBeUndefined();
  });

  test('BSH-23: the sheet\'s window hosts its own overlay layer; a dialog opened from it stacks above in a Modal inside its window, and back reaches only the topmost', async () => {
    const outer = jest.fn();
    const inner = jest.fn();
    await render(
      <TanreiProvider theme="light">
        {element({
          onClose: outer,
          children: <Dialog testID="inner" visible headline="Discard photo?" onRequestClose={inner} />,
        })}
      </TanreiProvider>,
    );
    const modal = screen.getByTestId('inner.modal', { includeHiddenElements: true });
    const ancestors: (string | undefined)[] = [];
    for (let node = modal.parent; node; node = node.parent) ancestors.push(node.props?.testID);
    expect(ancestors).toContain(ID);
    await fireEvent(modal, 'requestClose');
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });
});

describe('heights and layout (BSH-6 … BSH-8, BSH-12, BSH-24, BSH-26)', () => {
  test('BSH-6: the heights — partial is comp.bottom-sheet.container.partial-fraction of the area, full the area less margin-block-start, both no taller than the content; two heights only while the content is taller than the partial one', () => {
    expect(bottomSheetHeights(720, 2000, tokens)).toEqual({ partial: 360, full: 672, two: true });
    expect(bottomSheetHeights(720, 500, tokens)).toEqual({ partial: 360, full: 500, two: true });
    expect(bottomSheetHeights(720, 108, tokens)).toEqual({ partial: 108, full: 108, two: false });
    const custom = { containerPartialFraction: 0.25, containerMarginBlockStart: 100 };
    expect(bottomSheetHeights(800, 2000, custom)).toEqual({ partial: 200, full: 700, two: true });
  });

  test('BSH-6: at rest a partial sheet is bounded by the partial fraction of its area, a full one by the area less the top margin; the area is the window below its top inset (modal) or the parent (standard), ending at the keyboard', async () => {
    const listeners: Record<string, (event: { endCoordinates: { height: number } }) => void> = {};
    jest.spyOn(ReactNative.Keyboard, 'addListener').mockImplementation(((type: string, listener: (event: { endCoordinates: { height: number } }) => void) => {
      listeners[type] = listener;
      return { remove: () => undefined };
    }) as never);
    const view = await mount({}, { theme: 'light', insets: { top: 47, bottom: 34 } });
    expect(viewStyle(sheet()).maxHeight).toBe(`${tokens.containerPartialFraction * 100}%`);
    expect(viewStyle(q('area')!)).toMatchObject({ top: 47, bottom: 0, paddingTop: 0 });
    await act(async () => listeners.keyboardDidShow!({ endCoordinates: { height: 300 } }));
    expect(viewStyle(q('area')!).bottom).toBe(300);
    await view.rerender(<TanreiProvider theme="light" insets={{ top: 47, bottom: 34 }}>{element({ detent: 'full' })}</TanreiProvider>);
    expect(viewStyle(q('area')!).paddingTop).toBe(tokens.containerMarginBlockStart);
    expect(viewStyle(sheet()).maxHeight).toBeUndefined();
    await view.unmount();
    await mount({ variant: 'standard' }, { theme: 'light', insets: { top: 47 } });
    expect(viewStyle(q('area')!).top).toBe(0);
    // The tokens drive it.
    await mount({}, { theme: 'light', system: withComponent(tanrei, 'bottomSheet', { containerPartialFraction: 0.4 }) });
    expect(viewStyle(screen.getAllByTestId(ID, { includeHiddenElements: true }).at(-1)!).maxHeight).toBe('40%');
  });

  test('BSH-7: the container — as wide as the area up to comp.bottom-sheet.container.max-width, centred, in container.color at container.elevation, top corners container.shape, bottom corners square; its color under the bottom inset, its content above it, and on the keyboard with none', async () => {
    const listeners: Record<string, (event: { endCoordinates: { height: number } }) => void> = {};
    jest.spyOn(ReactNative.Keyboard, 'addListener').mockImplementation(((type: string, listener: (event: { endCoordinates: { height: number } }) => void) => {
      listeners[type] = listener;
      return { remove: () => undefined };
    }) as never);
    for (const scheme of ['light', 'dark'] as const) {
      const view = await mount({}, { theme: scheme, insets: { bottom: 34 } });
      const theme = createTanreiTheme(tanrei, scheme);
      expect(viewStyle(q('area')!).alignItems).toBe('center');
      expect(viewStyle(sheet())).toMatchObject({
        width: '100%',
        maxWidth: tokens.containerMaxWidth,
        backgroundColor: painted(tokens.containerColor, scheme),
        borderTopStartRadius: tokens.containerShape,
        borderTopEndRadius: tokens.containerShape,
        boxShadow: theme.elevation(tokens.containerElevation).boxShadow,
      });
      expect(viewStyle(q('drag')!).paddingBottom).toBe(34);
      expect(viewStyle(sheet()).borderBottomStartRadius).toBeUndefined();
      const ring = theme.elevation(tokens.containerElevation).ring!;
      expect(viewStyle(q('elevation-ring')!)).toMatchObject({ borderColor: ring.color, borderWidth: ring.width, borderTopStartRadius: tokens.containerShape + ring.width, borderBottomStartRadius: 0 });
      await act(async () => listeners.keyboardDidShow!({ endCoordinates: { height: 300 } }));
      expect(viewStyle(q('drag')!).paddingBottom).toBe(0);
      await view.unmount();
    }
    const custom = withComponent(tanrei, 'bottomSheet', { containerMaxWidth: 500, containerShape: 20, containerColor: { kind: 'role', role: 'primaryContainer' } });
    await mount({}, { theme: 'light', system: custom });
    expect(viewStyle(sheet())).toMatchObject({ maxWidth: 500, borderTopStartRadius: 20, backgroundColor: painted({ kind: 'role', role: 'primaryContainer' }) });
  });

  test('BSH-8: the handle row, then the content inset by container.padding at its start, end and bottom (and top without a handle), clipped, in comp.bottom-sheet.content.color; inset false reaches the edges; plain text takes sys.typescale.body', async () => {
    let handed: string | undefined;
    function Content() {
      handed = useContentColor();
      return <Text>Custom</Text>;
    }
    const view = await mountInPlace({ children: <Content /> });
    expect(handed).toBe(painted(tokens.contentColor));
    expect(viewStyle(q('content')!)).toMatchObject({ overflow: 'hidden', flexShrink: 1 });
    const order = q('drag')!.children.map((child) => (typeof child === 'string' ? child : child.props.testID));
    expect(order.indexOf(`${ID}.handle.row`)).toBeLessThan(order.indexOf(`${ID}.content`));
    expect(q('scroll')!.props.contentContainerStyle).toEqual({ paddingStart: 16, paddingEnd: 16, paddingBottom: 16, paddingTop: 0 });
    await view.unmount();
    const bare = await mountInPlace({ handle: false });
    expect(q('handle')).toBeNull();
    expect(q('scroll')!.props.contentContainerStyle).toEqual({ paddingStart: 16, paddingEnd: 16, paddingBottom: 16, paddingTop: 16 });
    // Without a handle the content reaches the rounded top corners: the clip follows them.
    expect(viewStyle(q('content')!)).toMatchObject({ borderTopStartRadius: tokens.containerShape, borderTopEndRadius: tokens.containerShape });
    await bare.unmount();
    const flush = await mountInPlace({ inset: false });
    expect(q('scroll')!.props.contentContainerStyle).toEqual({ paddingStart: 0, paddingEnd: 0, paddingBottom: 0, paddingTop: 0 });
    await flush.unmount();
    await mountInPlace();
    const body = createTanreiTheme(tanrei, 'light').text('body');
    expect(textStyle(q('text')!)).toMatchObject({ color: painted(tokens.contentColor), fontSize: body.fontSize, lineHeight: body.lineHeight, fontFamily: body.fontFamily });
  });

  test('BSH-12: the handle\'s box — handle.container-width × container-height with container-shape corners, handle.margin-block above and below, centred, in drag-handle.container.color — and the grip centred in it, handle.grip-width × grip-height with round ends, in drag-handle.grip.color; it stays out of the scrolled content', async () => {
    for (const scheme of ['light', 'dark'] as const) {
      const view = await mountInPlace({}, { theme: scheme });
      expect(viewStyle(q('handle.row')!)).toMatchObject({ alignSelf: 'center', marginVertical: tokens.handleMarginBlock });
      expect(viewStyle(handle())).toMatchObject({ width: tokens.handleContainerWidth, height: tokens.handleContainerHeight, borderRadius: tokens.handleContainerShape, alignItems: 'center', justifyContent: 'center' });
      expect(viewStyle(handle()).backgroundColor).toBe(fill(handleTokens.enabled.containerColor, scheme));
      expect(viewStyle(q('handle.grip')!)).toMatchObject({ width: tokens.handleGripWidth, height: tokens.handleGripHeight, borderRadius: tokens.handleContainerShape, backgroundColor: painted(handleTokens.enabled.gripColor, scheme) });
      const ancestors: (string | undefined)[] = [];
      for (let node = handle().parent; node; node = node.parent) ancestors.push(node.props?.testID);
      expect(ancestors).not.toContain(`${ID}.scroll`);
      await view.unmount();
    }
    const custom = withComponent(tanrei, 'bottomSheet', { handleGripWidth: 40, handleGripHeight: 6, handleMarginBlock: 8 });
    await mountInPlace({}, { theme: 'light', system: custom });
    expect(viewStyle(q('handle.grip')!)).toMatchObject({ width: 40, height: 6 });
    expect(viewStyle(q('handle.row')!).marginVertical).toBe(8);
  });

  test('BSH-24: enlarged text grows the content (it scales and the sheet is content-sized up to its bound) and never the handle', async () => {
    Dimensions.set({ window: { ...WINDOW, width: 400, height: 720, fontScale: 2 }, screen: { ...WINDOW, width: 400, height: 720, fontScale: 2 } });
    await mountInPlace();
    expect(q('text')!.props.allowFontScaling).toBe(true);
    expect(viewStyle(handle())).toMatchObject({ width: tokens.handleContainerWidth, height: tokens.handleContainerHeight });
    expect(viewStyle(sheet()).height).toBeUndefined();
    Dimensions.set({ window: { ...WINDOW, width: 400, height: 720, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 720, fontScale: 1 } });
  });

  test('BSH-26: right-to-left keeps the container and the handle centred, and the content\'s padding is logical (start / end), so it follows the direction', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mountInPlace();
    expect(viewStyle(q('area')!).alignItems).toBe('center');
    expect(viewStyle(q('handle.row')!).alignSelf).toBe('center');
    expect(Object.keys(q('scroll')!.props.contentContainerStyle)).toEqual(expect.arrayContaining(['paddingStart', 'paddingEnd']));
  });
});

describe('the drag (BSH-9, BSH-10, BSH-21)', () => {
  test('BSH-9: a released drag goes to the next height in a fling\'s direction (faster than 0.5 pt/ms), else the nearest; below half of the lowest height, or a downward fling with none below, it asks to close', () => {
    const two = { partial: 360, full: 672, two: true };
    expect(bottomSheetRelease(500, 0, two)).toBe('partial');
    expect(bottomSheetRelease(530, 0, two)).toBe('full');
    expect(bottomSheetRelease(400, -0.6, two)).toBe('full');
    expect(bottomSheetRelease(650, 0.6, two)).toBe('partial');
    expect(bottomSheetRelease(400, 0.4, two)).toBe('partial');
    expect(bottomSheetRelease(360, 0.6, two)).toBe('close');
    expect(bottomSheetRelease(170, 0, two)).toBe('close');
    expect(bottomSheetRelease(190, 0, two)).toBe('partial');
    const one = { partial: 108, full: 108, two: false };
    expect(bottomSheetRelease(60, 0, one)).toBe('partial');
    expect(bottomSheetRelease(50, 0, one)).toBe('close');
    expect(bottomSheetRelease(108, -2, one)).toBe('partial');
  });

  test('BSH-9: past the 8-point touch slop, vertically, the sheet follows the finger — never above its full height, below its lowest by an offset — and settles where the release says, setting the detent and emitting detentChange once', async () => {
    const drag = captureDrag();
    const onDetentChange = jest.fn();
    const onClose = jest.fn();
    await mountInPlace({ onDetentChange, onClose, children: LONG });
    await measureSheet({ content: 2000, rest: 360 });
    const { handlers } = drag;
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(-8))).toBe(false);
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(-9))).toBe(true);
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(-20, 0, 30))).toBe(false);
    await act(async () => {
      handlers.onPanResponderGrant!({} as never, gesture(0));
      handlers.onPanResponderMove!({} as never, gesture(-100));
    });
    expect(viewStyle(sheet()).height).toBe(460);
    await act(async () => handlers.onPanResponderMove!({} as never, gesture(-500)));
    expect(viewStyle(sheet()).height).toBe(672);
    await act(async () => handlers.onPanResponderMove!({} as never, gesture(100)));
    expect(viewStyle(sheet())).toMatchObject({ height: 360, transform: [{ translateY: 100 }] });
    await act(async () => handlers.onPanResponderMove!({} as never, gesture(-200)));
    await act(async () => handlers.onPanResponderRelease!({} as never, gesture(-200)));
    expect(onDetentChange.mock.calls).toEqual([['full']]);
    expect(onClose).not.toHaveBeenCalled();
    // At rest at full: bounded by the top margin, the handle expanded.
    expect(viewStyle(q('area')!).paddingTop).toBe(tokens.containerMarginBlockStart);
    expect(handle().props.accessibilityState).toMatchObject({ expanded: true });
    await layout('', { width: 400, height: 672 });
    // A drag down that does not reach the middle settles back at full: no event.
    await dragBy(handlers, 100);
    expect(onDetentChange).toHaveBeenCalledTimes(1);
    await layout('', { width: 400, height: 672 });
    // A fling down goes to partial.
    await dragBy(handlers, 30, 1);
    expect(onDetentChange.mock.calls).toEqual([['full'], ['partial']]);
    expect(viewStyle(sheet()).maxHeight).toBe('50%');
  });

  test('BSH-9: the enter motion settles it (at once where motion is reduced); while not dismissible a drag below the lowest height settles back instead of asking to close', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const drag = captureDrag();
    const onClose = jest.fn();
    await mountInPlace({ onClose, dismissible: false, children: LONG });
    await wait(10);
    await measureSheet({ content: 2000, rest: 360 });
    timing.mockClear();
    await dragBy(drag.handlers, 300);
    expect(onClose).not.toHaveBeenCalled();
    expect(timing.mock.calls.map(([, config]) => config)).toEqual(expect.arrayContaining([expect.objectContaining({ toValue: 360, duration: tokens.motionEnterDuration }), expect.objectContaining({ toValue: 0, duration: tokens.motionEnterDuration })]));
    await wait(tokens.motionEnterDuration + 50);
    expect(viewStyle(sheet()).height).toBeUndefined();
  });

  test('BSH-10: a drag on the content — upward it raises the sheet before the content scrolls, downward it lowers the sheet only once the content is at its top; the content scrolls inside the container below the handle\'s row', async () => {
    const drag = captureDrag();
    await mountInPlace({ children: LONG });
    await measureSheet({ content: 2000, rest: 360 });
    const { handlers } = drag;
    await fireEvent(q('content')!, 'touchStart');
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(-30))).toBe(true);
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(30))).toBe(true);
    await fireEvent(q('scroll')!, 'scroll', { nativeEvent: { contentOffset: { x: 0, y: 120 } } });
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(30))).toBe(false);
    await fireEvent(q('scroll')!, 'scroll', { nativeEvent: { contentOffset: { x: 0, y: 0 } } });
    // At full height an upward drag is the content's scroll.
    await dragBy(handlers, -400);
    await layout('', { width: 400, height: 672 });
    await fireEvent(q('content')!, 'touchStart');
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(-30))).toBe(false);
    // Off the content (the handle's row, the padding) every vertical drag is the sheet's.
    await act(async () => q('drag')!.props.onTouchEnd());
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(-30))).toBe(true);
    expect(q('scroll')!.type).toBe('RCTScrollView');
  });

  test('BSH-21: the product changing detent moves the sheet there without detentChange; a height the person chose stays until the product sets detent again', async () => {
    const onDetentChange = jest.fn();
    const drag = captureDrag();
    const view = await mountInPlace({ onDetentChange, children: LONG });
    await measureSheet({ content: 2000, rest: 360 });
    const again = (detent: 'partial' | 'full') =>
      view.rerender(
        <TanreiProvider theme="light">
          <View style={{ width: 400, height: 720 }}>
            <BottomSheetSurface testID={ID} accessibilityLabel="Save photo" handleLabel="Resize sheet" detent={detent} onDetentChange={onDetentChange}>
              {LONG}
            </BottomSheetSurface>
          </View>
        </TanreiProvider>,
      );
    await again('full');
    expect(viewStyle(q('area')!).paddingTop).toBe(tokens.containerMarginBlockStart);
    expect(onDetentChange).not.toHaveBeenCalled();
    await layout('', { width: 400, height: 672 });
    // The person lowers it: the product's detent is still full, the sheet stays partial.
    await dragBy(drag.handlers, 250);
    expect(onDetentChange.mock.calls).toEqual([['partial']]);
    await again('full');
    expect(viewStyle(sheet()).maxHeight).toBe('50%');
    // The product sets it again.
    await again('partial');
    await again('full');
    expect(viewStyle(q('area')!).paddingTop).toBe(tokens.containerMarginBlockStart);
    expect(onDetentChange).toHaveBeenCalledTimes(1);
  });
});

describe('the drag handle (BSH-11, BSH-13 … BSH-19)', () => {
  const expectHandleDrawnFrom = (state: Exclude<InteractionState, 'disabled'>, system: TanreiSystem = tanrei) => {
    const from = system.components.bottomSheet;
    const paints = from.controls.dragHandle[state];
    const opacity = { enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity }[state];
    expect(viewStyle(handle())).toMatchObject({ backgroundColor: fill(paints.containerColor, 'light', system), opacity });
    expect(viewStyle(q('handle.grip')!).backgroundColor).toBe(painted(paints.gripColor, 'light', system));
  };
  const twoHeights = async (props: Partial<BottomSheetProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) => {
    const view = await mountInPlace({ children: LONG, ...props }, provider);
    await measureSheet({ content: 2000, rest: 360 });
    return view;
  };

  test('BSH-11: with two heights the handle is one focusable button named by handleLabel, expanded at full; activating it moves to the other height and emits detentChange once; with one height it is drawn but not focusable, pressable or exposed', async () => {
    const onDetentChange = jest.fn();
    const view = await twoHeights({ onDetentChange });
    expect(handle().props).toMatchObject({ role: 'button', accessibilityLabel: 'Resize sheet', accessibilityState: { expanded: false }, focusable: true });
    expect(screen.getByRole('button', { name: 'Resize sheet' })).toBeTruthy();
    await fireEvent.press(handle());
    expect(onDetentChange.mock.calls).toEqual([['full']]);
    expect(handle().props.accessibilityState).toMatchObject({ expanded: true });
    await layout('', { width: 400, height: 672 });
    await fireEvent.press(handle());
    expect(onDetentChange.mock.calls).toEqual([['full'], ['partial']]);
    await wait(HOLD + 30);
    await view.unmount();
    const onOne = jest.fn();
    await mountInPlace({ onDetentChange: onOne });
    await measureSheet({ content: 60, rest: 108 });
    expect(handle().props).toMatchObject({ focusable: false, accessible: false, importantForAccessibility: 'no-hide-descendants', accessibilityState: { disabled: true } });
    expect(handle().props.role).toBeUndefined();
    expect(screen.queryByRole('button')).toBeNull();
    await fireEvent.press(handle());
    expect(onOne).not.toHaveBeenCalled();
  });

  test('BSH-11: an interactive handle without handleLabel still renders, and development builds report it; a handle that is not interactive is not reported', async () => {
    const view = await twoHeights({ handleLabel: '' });
    expect(handle()).not.toBeNull();
    expect(reports()).toEqual([expect.stringContaining('the drag handle of a BottomSheet (testID "sheet") has no handleLabel')]);
    await view.unmount();
    jest.mocked(console.warn).mockClear();
    await mountInPlace({ handleLabel: '' });
    await measureSheet({ content: 60, rest: 108 });
    expect(reports()).toEqual([]);
  });

  test('BSH-13: precedence is pressed over focused over hovered, under the acme fixture system; focus that comes with a press does not select focused', async () => {
    const paints = acme.components.bottomSheet.controls.dragHandle;
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map((state) => fill(paints[state].containerColor, 'light', acme))).size).toBe(4);
    await twoHeights({}, { theme: 'light', system: acme });
    await fireEvent(handle(), 'hoverIn');
    expectHandleDrawnFrom('hovered', acme);
    await fireEvent(handle(), 'focus');
    expectHandleDrawnFrom('focused', acme);
    await fireEvent(handle(), 'pressIn');
    expectHandleDrawnFrom('pressed', acme);
    await release();
    expectHandleDrawnFrom('focused', acme);
    await fireEvent(handle(), 'blur');
    await fireEvent(handle(), 'hoverOut');
    await fireEvent(handle(), 'pressIn');
    await fireEvent(handle(), 'focus');
    await release();
    expectHandleDrawnFrom('enabled', acme);
  });

  test('BSH-13: a drag that starts on the handle does not leave it pressed once the sheet follows it', async () => {
    const drag = captureDrag();
    await twoHeights();
    await fireEvent(handle(), 'pressIn');
    expectHandleDrawnFrom('pressed');
    // The sheet takes the gesture: the handle's Pressable is told the press is over.
    await act(async () => drag.handlers.onPanResponderGrant!({} as never, gesture(0)));
    await fireEvent(handle(), 'pressOut');
    await wait(HOLD + 30);
    expectHandleDrawnFrom('enabled');
    expect(drag.handlers.onPanResponderTerminationRequest!({} as never, gesture(0))).toBe(false);
  });

  test('BSH-14: keyboard focus shows the focus ring around the handle\'s box, without animation; focus that comes with a press does not', async () => {
    await twoHeights();
    await fireEvent(handle(), 'focus');
    expect(viewStyle(q('handle.focus-ring')!)).toMatchObject({ position: 'absolute', borderWidth: measure.focus.outerWidth, borderColor: formatColor(tanrei.colors.light.focusRing), top: -(measure.focus.offset + measure.focus.outerWidth) });
    await fireEvent(handle(), 'blur');
    await fireEvent(handle(), 'pressIn');
    await fireEvent(handle(), 'focus');
    expect(q('handle.focus-ring')).toBeNull();
    await release();
  });

  test('BSH-15: the hit area is the handle\'s whole row across its box, and at least sys.target.touch on both axes, its drawn size unchanged (cupertino\'s 16-high box with no margin still reaches the target)', async () => {
    const view = await twoHeights();
    expect(handle().props.hitSlop).toEqual({ top: tokens.handleMarginBlock, bottom: tokens.handleMarginBlock, left: 0, right: 0 });
    expect(tokens.handleContainerHeight + 2 * tokens.handleMarginBlock).toBe(measure.target.touch);
    await view.unmount();
    const cup = cupertino.components.bottomSheet;
    await twoHeights({}, { theme: 'light', system: cupertino });
    const vertical = (cupertino.measure.target.touch - cup.handleContainerHeight) / 2;
    expect(cup.handleMarginBlock).toBe(0);
    expect(handle().props.hitSlop).toEqual({ top: vertical, bottom: vertical, left: 0, right: 0 });
    expect(viewStyle(handle())).toMatchObject({ width: cup.handleContainerWidth, height: cup.handleContainerHeight });
  });

  test('BSH-16: the pressed state appears at once and stays visible for duration.pressHold; a bare click (Enter, Space) shows it too', async () => {
    await twoHeights();
    await fireEvent(handle(), 'pressIn');
    expectHandleDrawnFrom('pressed');
    await fireEvent(handle(), 'pressOut');
    await wait(HOLD / 2);
    expectHandleDrawnFrom('pressed');
    await wait(HOLD / 2 + 30);
    expectHandleDrawnFrom('enabled');
    await fireEvent(handle(), 'press', { nativeEvent: { target: 1 } });
    expectHandleDrawnFrom('pressed');
    await wait(HOLD + 30);
  });

  test('BSH-17: overlay (the default), ripple (m3-like), dim (cupertino) and none', async () => {
    const first = await twoHeights();
    await fireEvent(handle(), 'pressIn');
    expect(q('handle.ripple')).toBeNull();
    expect(viewStyle(handle()).backgroundColor).toBe(fill(handleTokens.pressed.containerColor));
    await release();
    await first.unmount();

    reduceMotion(false);
    const m3 = m3Like.components.bottomSheet;
    const timing = jest.spyOn(Animated, 'timing');
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 48, 24, 0, 0));
    const second = await twoHeights({}, { theme: 'light', system: m3Like });
    await fireEvent(handle(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 48, height: 24 } } });
    timing.mockClear();
    await fireEvent(handle(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 12 } });
    expect(viewStyle(q('handle.ripple.wave')!).backgroundColor).toBe(painted(m3.controls.dragHandle.pressed.containerColor, 'light', m3Like));
    expect(viewStyle(handle()).backgroundColor).toBe(fill(m3.controls.dragHandle.enabled.containerColor, 'light', m3Like));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: m3.motionFeedbackDuration });
    await release();
    await wait(m3.motionStateDuration * 2 + 50);
    await second.unmount();

    reduceMotion(true);
    const cup = cupertino.components.bottomSheet;
    const third = await twoHeights({}, { theme: 'light', system: cupertino });
    await fireEvent(handle(), 'pressIn');
    expect(viewStyle(handle())).toMatchObject({ opacity: cup.pressedOpacity, backgroundColor: fill(cup.controls.dragHandle.enabled.containerColor, 'light', cupertino) });
    expect(cup.pressedOpacity).toBeLessThan(1);
    await release();
    await third.unmount();

    const onDetentChange = jest.fn();
    await twoHeights({ onDetentChange }, { theme: 'light', system: withBehavior({ pressedFeedback: 'none' }) });
    await fireEvent(handle(), 'pressIn');
    expectHandleDrawnFrom('enabled');
    await fireEvent.press(handle());
    expect(onDetentChange).toHaveBeenCalledTimes(1);
    await release();
  });

  test('BSH-18: the container\'s top corners and the handle\'s box ease by the smoothing (cupertino: continuous; the default: circular); glow (acme) is one halo', async () => {
    const view = await twoHeights({}, { theme: 'light', system: cupertino });
    expect(viewStyle(sheet())).toMatchObject({ borderCurve: 'continuous', borderTopStartRadius: cupertino.components.bottomSheet.containerShape });
    expect(viewStyle(handle()).borderCurve).toBe('continuous');
    await view.unmount();
    const plain = await twoHeights();
    expect(viewStyle(sheet()).borderCurve).toBeUndefined();
    await plain.unmount();
    await twoHeights({}, { theme: 'light', system: acme });
    await fireEvent(handle(), 'focus');
    expect(viewStyle(q('handle.focus-ring')!).boxShadow).toHaveLength(1);
  });

  test('BSH-19: the handle\'s colors move over comp.bottom-sheet.motion.state-duration with state-easing, and at once where motion is reduced', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    await twoHeights({}, { theme: 'light', system: acme });
    await wait(10);
    timing.mockClear();
    await fireEvent(handle(), 'hoverIn');
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    await wait(tokens.motionStateDuration + 50);
    reduceMotion(true);
  });
});

describe('accessibility and unknown values (BSH-22, BSH-25)', () => {
  test('BSH-22: a modal sheet is a modal dialog named by its label, a standard one a region named by it; the grip is hidden; an empty label still renders and is reported in development builds only', async () => {
    const view = await mount();
    expect(sheet().props).toMatchObject({ role: 'dialog', 'aria-modal': true, accessibilityLabel: 'Save photo' });
    expect(q('handle.grip')!.props).toMatchObject({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' });
    await view.unmount();
    const standard = await mount({ variant: 'standard' });
    expect(sheet().props).toMatchObject({ role: 'region', accessibilityLabel: 'Save photo' });
    await standard.unmount();
    await mountInPlace({ accessibilityLabel: '' });
    expect(sheet()).not.toBeNull();
    expect(reports()).toEqual([expect.stringContaining('a BottomSheet (testID "sheet") has no accessibilityLabel, so its dialog has no name')]);
    development(false);
    jest.mocked(console.warn).mockClear();
    await mountInPlace({ accessibilityLabel: '' });
    expect(reports()).toEqual([]);
  });

  test('BSH-25: an unknown variant or detent renders as the default (modal, partial) and is reported once in development builds', async () => {
    const expected = JSON.stringify((await mountInPlace()).toJSON());
    await screen.unmount();
    const view = await mountInPlace({ variant: 'sidebar' as never, detent: 'half' as never });
    expect(JSON.stringify(view.toJSON())).toBe(expected);
    expect(reports()).toEqual([expect.stringContaining('BottomSheet variant "sidebar" is not defined; using "modal"'), expect.stringContaining('BottomSheet detent "half" is not defined; using "partial"')]);
  });
});

describe('fixture baselines', () => {
  describeFixtureBaselines(bottomSheetSubject);
});
