// SideSheet — the two forms, focus, dismissal, the drag, layout, the header, the actions, accessibility, token binding
// and fixture baselines. Cases come from specs/side-sheet.spec.json; every behaviour id is cited by the test that covers it.
import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, PanResponder, Text, View, type PanResponderCallbacks } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiPaint, TanreiScheme, TanreiSideSheetTokens, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { useContentColor } from '../../theme/contentColor';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { IconButton } from '../IconButton';
import { SideSheet, SideSheetSurface, type SideSheetProps } from '../SideSheet';
import { sideSheetSubject } from './SideSheet.subject';

const spec = loadSpec('side-sheet');
const tokens: TanreiSideSheetTokens = tanrei.components.sideSheet;
const { standard, modal } = tokens.variants;
const ID = 'side';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

const ACTIONS = (
  <>
    <Button variant="text" testID="apply">
      Apply
    </Button>
    <Button variant="text" testID="reset">
      Reset
    </Button>
  </>
);
const element = (props: Partial<SideSheetProps> = {}) => (
  <View style={{ flex: 1, flexDirection: 'row' }}>
    <Text testID="content">Results</Text>
    <SideSheet testID={ID} open headline="Filters" closable closeLabel="Close filters" {...props}>
      {props.children ?? 'Show results from the last 30 days.'}
    </SideSheet>
  </View>
);
function mount(props: Partial<SideSheetProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(<TanreiProvider {...provider}>{element(props)}</TanreiProvider>);
}
const rerender = (view: Awaited<ReturnType<typeof mount>>, props: Partial<SideSheetProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) => view.rerender(<TanreiProvider {...provider}>{element(props)}</TanreiProvider>);
function mountInPlace(props: Partial<SideSheetProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  const { open: _open, ...rest } = props;
  return render(
    <TanreiProvider {...provider}>
      <View style={{ width: 720, height: 480, flexDirection: 'row' }}>
        <View style={{ flex: 1 }} />
        <SideSheetSurface testID={ID} headline="Filters" closable closeLabel="Close filters" {...rest}>
          {props.children ?? 'Show results from the last 30 days.'}
        </SideSheetSurface>
      </View>
    </TanreiProvider>,
  );
}

const q = (name: string) => screen.queryByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const sheet = () => q('')!;
const reports = () => jest.mocked(console.warn).mock.calls.map(([message]) => String(message)).filter((message) => message.includes('SideSheet'));
function captureDrag() {
  const captured: { handlers: PanResponderCallbacks } = { handlers: {} };
  const create = PanResponder.create.bind(PanResponder);
  jest.spyOn(PanResponder, 'create').mockImplementation((config) => {
    captured.handlers = config;
    return create(config);
  });
  return captured;
}
const gesture = (dx: number, vx = 0, dy = 0) => ({ dx, dy, vx, vy: 0, moveX: 0, moveY: 0, x0: 0, y0: 0, numberActiveTouches: 1, stateID: 1 }) as never;

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  Dimensions.set({ window: { ...WINDOW, width: 720, height: 480, fontScale: 1 }, screen: { ...WINDOW, width: 720, height: 480, fontScale: 1 } });
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
    expect(platform.name).toBe(SideSheet.name);
    expect(platform.props).toEqual({ variant: 'variant', open: 'open', headline: 'headline', closable: 'closable', closeLabel: 'closeLabel' });
    expect(platform.events).toEqual({ close: 'onClose' });
  });

  test('defaults follow the spec: closed (nothing), standard, not closable', async () => {
    const view = await render(
      <TanreiProvider theme="light">
        <SideSheet testID={ID} headline="Filters" />
      </TanreiProvider>,
    );
    expect(sheet()).toBeNull();
    await view.rerender(
      <TanreiProvider theme="light">
        <SideSheet testID={ID} open headline="Filters" />
      </TanreiProvider>,
    );
    expect(sheet().props.role).toBe('complementary');
    expect(q('modal')).toBeNull();
    expect(q('close')).toBeNull();
  });
});

describe('the two forms, focus and dismissal (SSH-1 … SSH-6, SSH-15)', () => {
  test('SSH-1: a standard sheet takes its width at the end of the row while open and nothing while closed; it slides while the content resizes (its width over the enter and exit motion); no scrim, no Modal, Escape, back and drags ignored', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const onClose = jest.fn();
    const view = await mount({ open: false, onClose });
    expect(sheet()).toBeNull();
    await rerender(view, { onClose });
    await wait(10);
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionEnterDuration)?.[1]).toMatchObject({ toValue: 1 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionEnterEasing);
    expect(interpolate.mock.calls.map(([config]) => config.outputRange)).toContainEqual([0, tokens.containerWidth]);
    await wait(tokens.motionEnterDuration + 50);
    expect(viewStyle(q('slot')!)).toMatchObject({ alignSelf: 'stretch', width: tokens.containerWidth });
    expect(q('scrim')).toBeNull();
    expect(q('modal')).toBeNull();
    expect(sheet().props.onKeyDown).toBeUndefined();
    expect(sheet().props.onAccessibilityEscape).toBeUndefined();
    expect(q('body')!.props.onMoveShouldSetResponder).toBeUndefined();
    await rerender(view, { open: false, onClose });
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionExitDuration)?.[1]).toMatchObject({ toValue: 0 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionExitEasing);
    await wait(tokens.motionExitDuration + 100);
    expect(sheet()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('SSH-1: with reduced motion a standard sheet takes and gives up its width at once', async () => {
    const view = await mount({ open: false });
    await wait(10);
    await rerender(view);
    expect(viewStyle(q('slot')!)).toMatchObject({ width: tokens.containerWidth });
    expect(viewStyle(q('slot')!).overflow).toBeUndefined();
    await rerender(view, { open: false });
    expect(sheet()).toBeNull();
  });

  test('SSH-2: a modal sheet is presented in a transparent Modal (inert behind, no platform dim), slides in from the end edge over a scrim of comp.side-sheet.scrim.color that fades in, and out over the exit motion; reduced motion fades (iOS) or cuts (Android)', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const view = await mount({ variant: 'modal', open: false });
    await rerender(view, { variant: 'modal' });
    await wait(10);
    expect(q('modal')!.props).toMatchObject({ visible: true, transparent: true, animationType: 'none', statusBarTranslucent: true, navigationBarTranslucent: true });
    expect(viewStyle(q('scrim')!)).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: painted(tokens.scrimColor) });
    expect(sheet().props).toMatchObject({ 'aria-modal': true, accessibilityViewIsModal: true });
    expect(interpolate.mock.calls.map(([config]) => config.outputRange)).toContainEqual([tokens.containerWidth, 0]);
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionEnterDuration)?.[1]).toMatchObject({ toValue: 1 });
    await wait(tokens.motionEnterDuration + 50);
    expect(viewStyle(sheet()).transform).toBeUndefined();
    await rerender(view, { variant: 'modal', open: false });
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionExitDuration)?.[1]).toMatchObject({ toValue: 0 });
    await wait(tokens.motionExitDuration + 100);
    expect(q('modal')).toBeNull();
    reduceMotion(true);
    jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    timing.mockClear();
    const android = await mount({ variant: 'modal', open: false });
    await wait(10);
    await rerender(android, { variant: 'modal' });
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionEnterDuration)).toBe(false);
    await rerender(android, { variant: 'modal', open: false });
    expect(q('modal')).toBeNull();
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('### `SideSheet` and `SideSheetSurface`');
  });

  test('SSH-3: opening moves focus to initialFocusRef, else the screen reader to the headline — at once, for both forms; a modal sheet mounted open moves focus in as if it had just opened, a standard one mounted open moves nothing; closing leaves focus where the platform puts it (README)', async () => {
    const marked = { current: { focus: jest.fn() } };
    const view = await mount({ variant: 'modal', open: false, initialFocusRef: marked });
    await rerender(view, { variant: 'modal', initialFocusRef: marked });
    expect(marked.current.focus).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(marked.current, 'focus');
    await view.unmount();
    jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mockClear();
    const standing = await mount({ open: false });
    await rerender(standing);
    const calls = jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mock.calls;
    expect(calls).toHaveLength(1);
    expect((calls[0]![0] as unknown as { props: { testID: string } }).props.testID).toBe(`${ID}.headline`);
    await standing.unmount();
    // A modal sheet mounted open: everything behind it is unreachable, so focus moves in at once (the headline, read
    // first) — and once more when its window is on screen.
    jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mockClear();
    const mounted = await mount({ variant: 'modal' });
    const moves = jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mock.calls;
    expect(moves).toHaveLength(1);
    expect((moves[0]![0] as unknown as { props: { testID: string } }).props.testID).toBe(`${ID}.headline`);
    await fireEvent(q('modal')!, 'show');
    expect(moves).toHaveLength(2);
    await mounted.unmount();
    // A standard sheet mounted open moves nothing.
    jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mockClear();
    const standingMarked = { current: { focus: jest.fn() } };
    await mount({ initialFocusRef: standingMarked });
    expect(standingMarked.current.focus).not.toHaveBeenCalled();
    expect(AccessibilityInfo.sendAccessibilityEvent).not.toHaveBeenCalled();
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toMatch(/### `SideSheet`[\s\S]*React Native cannot tell which element had focus\./);
  });

  test('SSH-4: a modal sheet — the scrim, Escape, Android\'s back and the iOS escape gesture each emit close once with their reason; the sheet stays until the product closes it', async () => {
    const onClose = jest.fn();
    await mount({ variant: 'modal', onClose });
    await fireEvent.press(q('scrim.press')!);
    await fireEvent(sheet(), 'keyDown', { nativeEvent: { key: 'Escape' }, preventDefault: jest.fn() });
    await fireEvent(q('modal')!, 'requestClose');
    await fireEvent(sheet(), 'accessibilityEscape');
    expect(onClose.mock.calls).toEqual([['scrim'], ['escape'], ['back'], ['back']]);
    expect(q('modal')).not.toBeNull();
  });

  test('SSH-4: past the 8-point slop, horizontally, the sheet follows a drag toward its end edge; released past half its width, or flung that way (0.5 pt/ms), it emits close("drag"); otherwise it slides back over the enter motion', async () => {
    reduceMotion(false);
    const drag = captureDrag();
    const timing = jest.spyOn(Animated, 'timing');
    const onClose = jest.fn();
    await mount({ variant: 'modal', onClose });
    await wait(10);
    const { handlers } = drag;
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(8))).toBe(false);
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(9))).toBe(true);
    expect(handlers.onMoveShouldSetPanResponderCapture!({} as never, gesture(20, 0, 40))).toBe(false);
    await act(async () => {
      handlers.onPanResponderGrant!({} as never, gesture(0));
      handlers.onPanResponderMove!({} as never, gesture(60));
    });
    expect(viewStyle(sheet()).transform).toEqual([{ translateX: 60 }]);
    // Toward the start it does not move.
    await act(async () => handlers.onPanResponderMove!({} as never, gesture(-40)));
    expect(viewStyle(sheet()).transform).toEqual([{ translateX: 0 }]);
    timing.mockClear();
    await act(async () => handlers.onPanResponderRelease!({} as never, gesture(tokens.containerWidth / 2 - 10)));
    expect(onClose).not.toHaveBeenCalled();
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 0, duration: tokens.motionEnterDuration });
    await wait(tokens.motionEnterDuration + 50);
    await act(async () => handlers.onPanResponderRelease!({} as never, gesture(tokens.containerWidth / 2 + 10)));
    expect(onClose.mock.calls).toEqual([['drag']]);
    await act(async () => handlers.onPanResponderRelease!({} as never, gesture(30, 1)));
    expect(onClose.mock.calls).toEqual([['drag'], ['drag']]);
  });

  test('SSH-4: in right-to-left the end edge is the left: a drag toward it is negative', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    const drag = captureDrag();
    const onClose = jest.fn();
    await mount({ variant: 'modal', onClose });
    await act(async () => drag.handlers.onPanResponderRelease!({} as never, gesture(tokens.containerWidth / 2 + 10)));
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => drag.handlers.onPanResponderRelease!({} as never, gesture(-(tokens.containerWidth / 2 + 10))));
    expect(onClose).toHaveBeenCalledWith('drag');
  });

  test('SSH-5: the close button is a standard, medium IconButton (unrestyled) showing the close glyph, named by closeLabel; it emits close("close") once in either form; an empty closeLabel still draws it and is reported', async () => {
    const onClose = jest.fn();
    const alone = await render(
      <TanreiProvider theme="light">
        <IconButton testID="alone" accessibilityLabel="Close filters">
          close
        </IconButton>
      </TanreiProvider>,
    );
    const own = viewStyle(screen.getByTestId('alone'));
    await alone.unmount();
    const view = await mount({ onClose });
    expect(viewStyle(q('close')!)).toEqual({ ...own, alignSelf: 'center' });
    expect(q('close')!.props).toMatchObject({ accessibilityRole: 'button', accessibilityLabel: 'Close filters' });
    expect(screen.getByText('close', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(q('close')!);
    expect(onClose.mock.calls).toEqual([['close']]);
    await view.unmount();
    onClose.mockClear();
    await mount({ variant: 'modal', onClose });
    await fireEvent.press(q('close')!);
    expect(onClose.mock.calls).toEqual([['close']]);
    jest.mocked(console.warn).mockClear();
    await mountInPlace({ closeLabel: '' });
    expect(q('close')).not.toBeNull();
    expect(reports()).toContainEqual(expect.stringContaining('the close button of a SideSheet (testID "side") has no closeLabel'));
  });

  test('SSH-6: a released drag that asked to close holds one frame; the product closing it slides it out from there, a product that declines sees it slide back', async () => {
    const drag = captureDrag();
    const frames: ((time: number) => void)[] = [];
    const frame = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));
    const onClose = jest.fn();
    await mount({ variant: 'modal', onClose });
    await act(async () => {
      drag.handlers.onPanResponderGrant!({} as never, gesture(0));
      drag.handlers.onPanResponderMove!({} as never, gesture(200));
      drag.handlers.onPanResponderRelease!({} as never, gesture(200));
    });
    expect(onClose).toHaveBeenCalledWith('drag');
    expect(viewStyle(sheet()).transform).toEqual([{ translateX: 200 }]);
    // The hold is the last frame asked for (Animated asks for its own).
    expect(frames.length).toBeGreaterThan(0);
    await act(async () => frames.at(-1)!(0));
    expect(viewStyle(sheet()).transform).toBeUndefined();
    await screen.unmount();
    frame.mockRestore();
    // The product closes it: it leaves from where the drag left it.
    function Product() {
      const [open, setOpen] = useState(true);
      return <TanreiProvider theme="light">{element({ variant: 'modal', open, onClose: () => setOpen(false) })}</TanreiProvider>;
    }
    await render(<Product />);
    await act(async () => {
      drag.handlers.onPanResponderGrant!({} as never, gesture(0));
      drag.handlers.onPanResponderMove!({} as never, gesture(200));
      drag.handlers.onPanResponderRelease!({} as never, gesture(200));
    });
    expect(viewStyle(sheet()).transform).toEqual([{ translateX: 200 }]);
    await wait(tokens.motionExitDuration + 100);
    expect(q('modal')).toBeNull();
  });

  test('SSH-15: the modal sheet\'s window hosts its own layer; a dialog opened from it stacks above in a Modal inside its window, and back reaches only the topmost', async () => {
    const outer = jest.fn();
    const inner = jest.fn();
    await mount({ variant: 'modal', onClose: outer, children: <Dialog testID="inner" visible headline="Reset filters?" onRequestClose={inner} /> });
    const modalView = screen.getByTestId('inner.modal', { includeHiddenElements: true });
    const ancestors: (string | undefined)[] = [];
    for (let node = modalView.parent; node; node = node.parent) ancestors.push(node.props?.testID);
    expect(ancestors).toContain(ID);
    await fireEvent(modalView, 'requestClose');
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });
});

describe('layout (SSH-7 … SSH-11, SSH-14)', () => {
  test('SSH-7: container.width wide beside the end inset, the parent\'s full height, the variant\'s color, elevation and start corners (square end corners), the start edge in the variant\'s outline color — in light and dark', async () => {
    for (const scheme of ['light', 'dark'] as const) {
      const theme = createTanreiTheme(tanrei, scheme);
      const view = await mountInPlace({}, { theme: scheme, insets: { top: 20, right: 30, bottom: 10 } });
      expect(viewStyle(sheet())).toMatchObject({ width: tokens.containerWidth + 30, paddingEnd: 30, paddingTop: 20, paddingBottom: 10, borderTopStartRadius: standard.containerShape, borderBottomStartRadius: standard.containerShape, backgroundColor: painted(standard.containerColor, scheme), flex: 1 });
      expect(viewStyle(sheet()).borderTopEndRadius).toBeUndefined();
      expect(viewStyle(q('outline')!)).toMatchObject({ position: 'absolute', top: 0, bottom: 0, start: 0, width: tokens.outlineWidth, backgroundColor: painted(standard.outlineColor, scheme) });
      expect(q('elevation-ring')).toBeNull();
      await view.unmount();
      const modalView = await mountInPlace({ variant: 'modal' }, { theme: scheme });
      expect(viewStyle(sheet())).toMatchObject({ width: tokens.containerWidth, borderTopStartRadius: modal.containerShape, backgroundColor: painted(modal.containerColor, scheme), position: 'absolute', top: 0, bottom: 0, end: 0, boxShadow: theme.elevation(modal.containerElevation).boxShadow });
      expect(q('outline')).toBeNull();
      expect(q('elevation-ring')).not.toBeNull();
      await modalView.unmount();
    }
    const custom = withComponent(tanrei, 'sideSheet', { containerWidth: 280, variants: { ...tokens.variants, standard: { ...standard, containerColor: { kind: 'role', role: 'surfaceContainer' } } } });
    await mountInPlace({}, { theme: 'light', system: custom });
    expect(viewStyle(sheet())).toMatchObject({ width: 280, backgroundColor: painted({ kind: 'role', role: 'surfaceContainer' }) });
  });

  test('SSH-7: a modal sheet is never wider than the window less sys.target.touch; right-to-left mirrors it (the left edge, the left inset)', async () => {
    Dimensions.set({ window: { ...WINDOW, width: 340, height: 480, fontScale: 1 }, screen: { ...WINDOW, width: 340, height: 480, fontScale: 1 } });
    const view = await mountInPlace({ variant: 'modal' });
    expect(viewStyle(sheet()).width).toBe(340 - tanrei.measure.target.touch);
    await view.unmount();
    Dimensions.set({ window: { ...WINDOW, width: 720, height: 480, fontScale: 1 }, screen: { ...WINDOW, width: 720, height: 480, fontScale: 1 } });
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mountInPlace({}, { theme: 'light', insets: { left: 24, right: 8 } });
    expect(viewStyle(sheet())).toMatchObject({ width: tokens.containerWidth + 24, paddingEnd: 24 });
  });

  test('SSH-8 / SSH-9: the header — at least header.height, the headline from container.padding-inline in headline.typescale and color (wrapping, a heading), the close button header.padding-inline-end from the end, header.gap apart, both centred; without a header the content starts container.padding-block below the top', async () => {
    const view = await mountInPlace();
    const header = viewStyle(q('header')!);
    expect(header).toMatchObject({ flexDirection: 'row', alignItems: 'center', minHeight: tokens.headerHeight, paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.headerPaddingInlineEnd, gap: tokens.headerGap });
    const theme = createTanreiTheme(tanrei, 'light');
    expect(textStyle(q('headline')!)).toMatchObject({ color: painted(tokens.headlineColor), fontSize: theme.text(tokens.headlineTypescale).fontSize });
    expect(q('headline')!.props).toMatchObject({ role: 'heading' });
    expect(q('headline')!.props.numberOfLines).toBeUndefined();
    expect(q('scroll')!.props.contentContainerStyle).toMatchObject({ paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline, paddingTop: 0, paddingBottom: tokens.containerPaddingBlock });
    await view.unmount();
    const plain = await mountInPlace({ closable: false });
    expect(viewStyle(q('header')!).paddingEnd).toBe(tokens.containerPaddingInline);
    await plain.unmount();
    await mountInPlace({ closable: false, headline: '' });
    expect(q('header')).toBeNull();
    expect(q('scroll')!.props.contentContainerStyle).toMatchObject({ paddingTop: tokens.containerPaddingBlock });
  });

  test('SSH-10: the content in comp.side-sheet.content.color (a string in sys.typescale.body), scrolling between the header and the actions', async () => {
    let handed: string | undefined;
    function Content() {
      handed = useContentColor();
      return <Text>Custom</Text>;
    }
    const view = await mountInPlace({ children: <Content />, actions: ACTIONS });
    expect(handed).toBe(painted(tokens.contentColor));
    expect(viewStyle(q('scroll')!).flex).toBe(1);
    const order = q('body')!.children.map((child) => (typeof child === 'string' ? child : child.props.testID));
    expect(order).toEqual([`${ID}.header`, `${ID}.scroll`, `${ID}.divider`, `${ID}.actions-row`]);
    await view.unmount();
    await mountInPlace();
    const body = createTanreiTheme(tanrei, 'light').text('body');
    expect(textStyle(q('text')!)).toMatchObject({ color: painted(tokens.contentColor), fontSize: body.fontSize, lineHeight: body.lineHeight });
  });

  test('SSH-11: with actions, a divider of divider.width in divider.color across the full width (hidden), then the buttons in a row from the start, container.padding-inline from the sides, actions.gap apart, actions.padding-block above and below; a column from the start when they do not fit; never restyled', async () => {
    await mountInPlace({ actions: ACTIONS });
    expect(viewStyle(q('divider')!)).toMatchObject({ height: tokens.dividerWidth, backgroundColor: painted(tokens.dividerColor) });
    expect(q('divider')!.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(viewStyle(q('actions-row')!)).toMatchObject({ paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline, paddingVertical: tokens.actionsPaddingBlock });
    expect(viewStyle(q('actions')!)).toMatchObject({ flexDirection: 'row', justifyContent: 'flex-start', gap: tokens.actionsGap });
    expect(q('scroll')!.props.contentContainerStyle).toMatchObject({ paddingBottom: 0 });
    await fireEvent(q('actions')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 150, height: 40 } } });
    await fireEvent(q('actions.0')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 40 } } });
    await fireEvent(q('actions.1')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 40 } } });
    expect(viewStyle(q('actions')!)).toMatchObject({ flexDirection: 'column', alignItems: 'flex-start', gap: tokens.actionsGap });
    expect(screen.getAllByRole('button').map((button) => button.props.testID)).toEqual([`${ID}.close`, 'apply', 'reset']);
    expect(viewStyle(screen.getByTestId('apply'))).toMatchObject({ minHeight: tanrei.components.button.sizes.medium.containerHeight });
  });

  test('SSH-14: enlarged text keeps the width, grows the header (a minimum height) with the wrapping headline, scrolls the content, and scales nothing itself', async () => {
    Dimensions.set({ window: { ...WINDOW, width: 720, height: 480, fontScale: 2 }, screen: { ...WINDOW, width: 720, height: 480, fontScale: 2 } });
    await mountInPlace();
    expect(viewStyle(sheet()).width).toBe(tokens.containerWidth);
    expect(viewStyle(q('header')!).minHeight).toBe(tokens.headerHeight);
    expect(viewStyle(q('header')!).height).toBeUndefined();
    expect(q('headline')!.props.allowFontScaling).toBe(true);
    Dimensions.set({ window: { ...WINDOW, width: 720, height: 480, fontScale: 1 }, screen: { ...WINDOW, width: 720, height: 480, fontScale: 1 } });
  });
});

describe('accessibility and unknown values (SSH-12, SSH-13)', () => {
  test('SSH-12: a modal sheet is a modal dialog named by its headline, a standard one a complementary region named by it; an empty headline still renders and is reported in development builds only', async () => {
    const view = await mount({ variant: 'modal' });
    expect(sheet().props).toMatchObject({ role: 'dialog', 'aria-modal': true, accessibilityLabel: 'Filters' });
    await view.unmount();
    const standing = await mount();
    expect(sheet().props).toMatchObject({ role: 'complementary', accessibilityLabel: 'Filters' });
    await standing.unmount();
    jest.mocked(console.warn).mockClear();
    await mountInPlace({ headline: '' });
    expect(sheet()).not.toBeNull();
    expect(reports()).toEqual([expect.stringContaining('a SideSheet (testID "side") has no headline, so its region has no name')]);
    await screen.unmount();
    development(false);
    jest.mocked(console.warn).mockClear();
    await mountInPlace({ headline: '' });
    expect(reports()).toEqual([]);
  });

  test('SSH-13: a variant the active system does not have renders from standard\'s tokens as a layout region, reported once in development builds', async () => {
    const expected = JSON.stringify((await mountInPlace()).toJSON());
    await screen.unmount();
    const view = await mountInPlace({ variant: 'drawer' as never });
    expect(JSON.stringify(view.toJSON())).toBe(expected);
    expect(reports()).toEqual([expect.stringContaining('the active system has no SideSheet variant "drawer"; using "standard"')]);
  });

  test('SSH-7: the corners ease by the smoothing where the variant rounds them (cupertino: continuous)', async () => {
    await mountInPlace({ variant: 'modal' }, { theme: 'light', system: cupertino });
    expect(viewStyle(sheet())).toMatchObject({ borderCurve: 'continuous', borderTopStartRadius: cupertino.components.sideSheet.variants.modal.containerShape });
  });
});

describe('fixture baselines', () => {
  describeFixtureBaselines(sideSheetSubject);
});
