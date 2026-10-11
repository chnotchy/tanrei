// Dialog — presentation, focus, dismissal, layout, scrolling, motion, accessibility, token binding and fixture
// baselines. Cases come from specs/dialog.spec.json; every behaviour id is cited by the test that covers it.
import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, Text, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiDialogTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, fixtureElement, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { useContentColor } from '../../theme/contentColor';
import { iconFamily } from '../../theme/icon';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Button } from '../Button';
import { Dialog, DialogSurface, type DialogProps } from '../Dialog';
import { IconButton } from '../IconButton';
import { useSnackbar, type SnackbarHost } from '../Snackbar';
import { Tooltip } from '../Tooltip';
import { dialogSubject } from './Dialog.subject';

const spec = loadSpec('dialog');
const tokens: TanreiDialogTokens = tanrei.components.dialog;
const ID = 'dlg';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
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
    <Button variant="text" testID="cancel">
      Cancel
    </Button>
    <Button variant="text" testID="discard">
      Discard
    </Button>
  </>
);
const element = (props: Partial<DialogProps> = {}) => <Dialog testID={ID} visible headline="Discard draft?" supportingText="The message will be deleted." actions={ACTIONS} {...props} />;
function mount(props: Partial<DialogProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(<TanreiProvider {...provider}>{element(props)}</TanreiProvider>);
}
function mountInPlace(props: Partial<DialogProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <View style={{ width: 480, height: 640 }}>
        <DialogSurface testID={ID} headline="Discard draft?" supportingText="The message will be deleted." actions={ACTIONS} {...props} />
      </View>
    </TanreiProvider>,
  );
}

const q = (name: string) => screen.queryByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const container = () => q('')!;
const layout = (name: string, box: { width: number; height: number }) => fireEvent(q(name)!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, ...box } } });
const setHandle = () => jest.spyOn(ReactNative, 'findNodeHandle').mockImplementation(((node: { props?: { testID?: string } } | null) => (node?.props?.testID === `${ID}.headline` ? 11 : node ? 22 : null)) as never);

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
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  development(true);
});
const dialogReports = () => jest.mocked(console.warn).mock.calls.map(([message]) => String(message)).filter((message) => message.includes('Dialog'));

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation: named as React Native\'s Modal', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Dialog.name);
    expect(platform.props).toEqual({ open: 'visible', headline: 'headline', supportingText: 'supportingText', alert: 'alert', dismissible: 'dismissible' });
    expect(platform.events).toEqual({ dismiss: 'onRequestClose' });
  });

  test('defaults follow the spec: closed (nothing, no Modal), dismissible, not an alert', async () => {
    const onRequestClose = jest.fn();
    const view = await mount({ visible: undefined });
    expect(q('modal')).toBeNull();
    await view.rerender(<TanreiProvider theme="light">{element({ onRequestClose })}</TanreiProvider>);
    expect(container().props.role).toBe('dialog');
    await fireEvent(q('modal')!, 'requestClose');
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});

describe('presentation and focus (DLG-1 … DLG-6, DLG-13 … DLG-15)', () => {
  test('DLG-1: open presents a transparent Modal (its own window: everything outside it is inert, the content behind cannot scroll) without the platform\'s animation or dim, and the scrim of comp.dialog.scrim.color over the whole window', async () => {
    await mount();
    expect(q('modal')!.props).toMatchObject({ visible: true, transparent: true, animationType: 'none', statusBarTranslucent: true, navigationBarTranslucent: true });
    const scrim = q('scrim')!;
    expect(viewStyle(scrim)).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: painted(tokens.scrimColor) });
    expect(painted(tokens.scrimColor)).toBe(role('scrim'));
    expect(evaluatePaint(tokens.scrimColor, tanrei.colors.light).a).toBeLessThan(1);
    expect(scrim.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(container().props['aria-modal']).toBe(true);
  });

  test('DLG-2: opening moves focus to the element marked by initialFocusRef (keyboard and screen reader); without one, the screen reader to the headline — at once, not after the motion', async () => {
    reduceMotion(false);
    const marked = { current: { focus: jest.fn() } };
    const view = await mount({ initialFocusRef: marked });
    expect(marked.current.focus).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledWith(marked.current, 'focus');
    await view.unmount();
    jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mockClear();
    await mount();
    // The headline's host view (the ref of its Text).
    const calls = jest.mocked(AccessibilityInfo.sendAccessibilityEvent).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]![0]).toBeTruthy();
    expect(calls[0]![1]).toBe('focus');
    // The Modal's onShow (the window is on screen) moves it again.
    await fireEvent(q('modal')!, 'show');
    expect(AccessibilityInfo.sendAccessibilityEvent).toHaveBeenCalledTimes(2);
  });

  test('DLG-3: focus stays inside — the Modal is a window of its own, the container is aria-modal (VoiceOver stays in it), and the README states what React Native does with Tab', async () => {
    await mount();
    expect(container().props['aria-modal']).toBe(true);
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('focus cannot leave its window');
  });

  test('DLG-4: closing takes the dialog away (after its exit motion) and restores the content behind; focus goes back as the platform returns it (README)', async () => {
    const view = await render(
      <TanreiProvider theme="light">
        <Text testID="behind">Behind</Text>
        {element()}
      </TanreiProvider>,
    );
    await view.rerender(
      <TanreiProvider theme="light">
        <Text testID="behind">Behind</Text>
        {element({ visible: false })}
      </TanreiProvider>,
    );
    await wait(tokens.motionExitDuration + 100);
    expect(q('modal')).toBeNull();
    expect(screen.getByTestId('behind')).toBeTruthy();
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toMatch(/focus goes back where the platform returns it: React\s+Native cannot tell which element had focus before\./);
  });

  test('DLG-5: while dismissible, Escape, Android\'s back, the iOS escape gesture and a press on the scrim each ask to close once; otherwise they do nothing', async () => {
    const onRequestClose = jest.fn();
    const view = await mount({ onRequestClose });
    await fireEvent(container(), 'keyDown', { nativeEvent: { key: 'Escape' }, preventDefault: jest.fn() });
    await fireEvent(q('modal')!, 'requestClose');
    await fireEvent(container(), 'accessibilityEscape');
    await fireEvent.press(q('scrim.press')!);
    expect(onRequestClose).toHaveBeenCalledTimes(4);
    onRequestClose.mockClear();
    await view.rerender(<TanreiProvider theme="light">{element({ onRequestClose, dismissible: false })}</TanreiProvider>);
    await fireEvent(container(), 'keyDown', { nativeEvent: { key: 'Escape' } });
    await fireEvent(q('modal')!, 'requestClose');
    await fireEvent(container(), 'accessibilityEscape');
    await fireEvent.press(q('scrim.press')!);
    expect(onRequestClose).not.toHaveBeenCalled();
  });

  test('DLG-6: an action does not close the dialog by itself; the product closes it from the action\'s handler', async () => {
    function Product() {
      const [open, setOpen] = useState(true);
      return (
        <TanreiProvider theme="light">
          <Dialog testID={ID} visible={open} headline="Discard draft?" actions={<><Button testID="keep">Keep</Button><Button testID="discard" onPress={() => setOpen(false)}>Discard</Button></>} />
        </TanreiProvider>
      );
    }
    await render(<Product />);
    await fireEvent.press(screen.getByTestId('keep'));
    expect(q('modal')).not.toBeNull();
    await fireEvent.press(screen.getByTestId('discard'));
    await wait(tokens.motionExitDuration + 100);
    expect(q('modal')).toBeNull();
  });

  test('DLG-13: it fades the scrim in and fades the container in while it grows from comp.dialog.motion.enter-scale, over the enter motion; it fades both out over the exit motion before it goes', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const view = await mount();
    await wait(10);
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionEnterDuration)?.[1]).toMatchObject({ toValue: 1, useNativeDriver: true });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionEnterEasing);
    expect(interpolate.mock.calls.map(([config]) => config.outputRange)).toContainEqual([tokens.motionEnterScale, 1]);
    expect(tokens.motionEnterScale).toBe(0.95);
    await wait(tokens.motionEnterDuration + 50);
    await view.rerender(<TanreiProvider theme="light">{element({ visible: false })}</TanreiProvider>);
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionExitDuration)?.[1]).toMatchObject({ toValue: 0 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionExitEasing);
    expect(q('modal')).not.toBeNull();
    await wait(tokens.motionExitDuration + 100);
    expect(q('modal')).toBeNull();
  });

  test('DLG-13: where motion is reduced it fades without growing on iOS, and appears and disappears at once on Android', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount();
    await wait(10);
    expect(viewStyle(container()).transform).toEqual([{ scale: 1 }]);
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionEnterDuration)).toBe(true);
    await view.unmount();
    timing.mockClear();
    jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    const android = await mount();
    await wait(10);
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionEnterDuration)).toBe(false);
    expect(viewStyle(container()).opacity).toBe(1);
    await android.rerender(<TanreiProvider theme="light">{element({ visible: false })}</TanreiProvider>);
    expect(q('modal')).toBeNull();
  });

  test('DLG-14: the dialog role (alertdialog while alert), named by the headline and described by the supporting text; an alert reads its headline and text as it opens; an empty headline still opens and is reported', async () => {
    const view = await mount();
    expect(container().props).toMatchObject({ role: 'dialog', accessibilityLabel: 'Discard draft?', accessibilityHint: 'The message will be deleted.' });
    expect(q('headline')!.props.role).toBe('heading');
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    await view.unmount();
    const alert = await mount({ alert: true });
    expect(container().props.role).toBe('alertdialog');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Discard draft?, The message will be deleted.');
    await alert.unmount();
    await mount({ headline: '' });
    expect(q('modal')).not.toBeNull();
    expect(dialogReports()).toEqual([expect.stringContaining('a Dialog (testID "dlg") has no headline')]);
    development(false);
    jest.mocked(console.warn).mockClear();
    await mountInPlace({ headline: '' });
    expect(dialogReports()).toEqual([]);
  });

  test('DLG-15: a dialog opened from a dialog stacks above it in a Modal of its own with its own scrim; back and Escape reach only the topmost', async () => {
    const outer = jest.fn();
    const inner = jest.fn();
    await render(
      <TanreiProvider theme="light">
        <Dialog testID="outer" visible headline="Settings" onRequestClose={outer}>
          <Dialog testID="inner" visible headline="Reset everything?" onRequestClose={inner} />
        </Dialog>
      </TanreiProvider>,
    );
    const modals = ['outer', 'inner'].map((id) => screen.getByTestId(`${id}.modal`, { includeHiddenElements: true }));
    expect(modals).toHaveLength(2);
    expect(screen.getByTestId('inner.scrim', { includeHiddenElements: true })).toBeTruthy();
    // The inner one is inside the outer one's window: the platform routes back and keys to the topmost window.
    const ancestors: (string | undefined)[] = [];
    for (let node = modals[1]!.parent; node; node = node.parent) ancestors.push(node.props?.testID);
    expect(ancestors).toContain('outer');
    await fireEvent(modals[1]!, 'requestClose');
    await fireEvent(screen.getByTestId('inner', { includeHiddenElements: true }), 'keyDown', { nativeEvent: { key: 'Escape' } });
    expect(inner).toHaveBeenCalledTimes(2);
    expect(outer).not.toHaveBeenCalled();
  });
});

describe('layout (DLG-7 … DLG-12, DLG-16)', () => {
  test('DLG-7: centred, in comp.dialog.container.color at its elevation with its corners; as wide as its content between the width bounds, never wider or taller than its area less the margins', async () => {
    await mountInPlace();
    const style = viewStyle(container());
    expect(viewStyle(q('area')!)).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
    expect(style).toMatchObject({ backgroundColor: painted(tokens.containerColor), borderRadius: tokens.containerShape, minWidth: tokens.containerMinWidth, maxWidth: tokens.containerMaxWidth });
    expect(style.boxShadow).toEqual(createTanreiTheme(tanrei, 'light').elevation(tokens.containerElevation).boxShadow);
    expect(style.borderCurve).toBeUndefined();
    await layout('area', { width: 300, height: 500 });
    expect(viewStyle(container())).toMatchObject({ minWidth: Math.min(tokens.containerMinWidth, 300 - 2 * tokens.containerMargin), maxWidth: 300 - 2 * tokens.containerMargin, maxHeight: 500 - 2 * tokens.containerMargin });
  });

  test('DLG-7: in a Modal the window bounds it before layout; the on-screen keyboard is kept a margin away; corners eased by the smoothing (cupertino: continuous)', async () => {
    const listeners: Record<string, (event: { endCoordinates: { height: number } }) => void> = {};
    jest.spyOn(ReactNative.Keyboard, 'addListener').mockImplementation(((type: string, listener: (event: { endCoordinates: { height: number } }) => void) => {
      listeners[type] = listener;
      return { remove: () => undefined };
    }) as never);
    const view = await mount();
    expect(viewStyle(container())).toMatchObject({ maxWidth: Math.min(tokens.containerMaxWidth, 400 - 2 * tokens.containerMargin), maxHeight: 800 - 2 * tokens.containerMargin });
    await act(async () => listeners.keyboardDidShow!({ endCoordinates: { height: 300 } }));
    expect(viewStyle(container()).maxHeight).toBe(800 - 2 * tokens.containerMargin - 300);
    expect(viewStyle(q('area')!).paddingBottom).toBe(300);
    await view.unmount();
    await mountInPlace({}, { theme: 'light', system: cupertino });
    expect(viewStyle(container())).toMatchObject({ borderCurve: 'continuous', borderRadius: cupertino.components.dialog.containerShape, minWidth: 270, maxWidth: 270 });
  });

  test('DLG-7: centred in the window\'s safe area — TanreiProvider\'s insets: each edge moved in by its inset, the margin inside it, the keyboard over the bottom inset while it is taller; in place, no insets', async () => {
    const listeners: Record<string, (event: { endCoordinates: { height: number } }) => void> = {};
    jest.spyOn(ReactNative.Keyboard, 'addListener').mockImplementation(((type: string, listener: (event: { endCoordinates: { height: number } }) => void) => {
      listeners[type] = listener;
      return { remove: () => undefined };
    }) as never);
    const insets = { top: 47, right: 12, bottom: 34, left: 20 };
    const view = await mount({}, { theme: 'light', insets });
    expect(viewStyle(q('area')!)).toMatchObject({ alignItems: 'center', justifyContent: 'center', paddingTop: 47, paddingRight: 12, paddingBottom: 34, paddingLeft: 20 });
    const margin = tokens.containerMargin;
    expect(viewStyle(container())).toMatchObject({ maxWidth: Math.min(tokens.containerMaxWidth, 400 - 2 * margin - 12 - 20), maxHeight: 800 - 2 * margin - 47 - 34 });
    await layout('area', { width: 360, height: 700 });
    expect(viewStyle(container())).toMatchObject({ maxWidth: Math.min(tokens.containerMaxWidth, 360 - 2 * margin - 12 - 20), maxHeight: 700 - 2 * margin - 47 - 34 });
    // A keyboard shorter than the bottom inset changes nothing; a taller one replaces it.
    await act(async () => listeners.keyboardDidShow!({ endCoordinates: { height: 20 } }));
    expect(viewStyle(q('area')!).paddingBottom).toBe(34);
    await act(async () => listeners.keyboardDidShow!({ endCoordinates: { height: 300 } }));
    expect(viewStyle(q('area')!).paddingBottom).toBe(300);
    expect(viewStyle(container()).maxHeight).toBe(700 - 2 * margin - 47 - 300);
    await view.unmount();
    // DialogSurface is drawn in a view, not the window: the provider's insets do not move it.
    await mountInPlace({}, { theme: 'light', insets });
    const area = viewStyle(q('area')!);
    expect([area.paddingTop, area.paddingLeft, area.paddingRight, area.paddingBottom]).toEqual([undefined, undefined, undefined, 0]);
  });

  test('DLG-8: inset by the padding; icon, headline, supporting text and content container.gap apart (an empty part left out); the actions actions.margin-block-start below; each text in its style and color; the content handed comp.dialog.content.color', async () => {
    let handed: string | undefined;
    function Content() {
      handed = useContentColor();
      return <Text>Anyone on the team with the link can open this document.</Text>;
    }
    const view = await mountInPlace({ children: <Content /> });
    expect(viewStyle(container()).padding).toBe(tokens.containerPadding);
    expect(viewStyle(q('top')!).gap).toBe(tokens.containerGap);
    expect(viewStyle(q('bottom')!).paddingTop).toBe(tokens.actionsMarginBlockStart);
    const theme = createTanreiTheme(tanrei, 'light');
    expect(textStyle(q('headline')!)).toMatchObject({ color: painted(tokens.headlineColor), fontSize: theme.text(tokens.headlineTypescale).fontSize });
    expect(textStyle(q('supporting-text')!)).toMatchObject({ color: painted(tokens.supportingTextColor), fontSize: theme.text(tokens.supportingTextTypescale).fontSize });
    expect(handed).toBe(painted(tokens.contentColor));
    expect(viewStyle(q('scroll')!).marginTop).toBe(tokens.containerGap);
    await view.unmount();
    await mountInPlace({ supportingText: '', actions: null });
    expect(q('supporting-text')).toBeNull();
    expect(q('scroll')).toBeNull();
    expect(q('bottom')).toBeNull();
  });

  test('DLG-8: a plain-text content is drawn in the content color and sys.typescale.body — as a card\'s content is (spec change 1c12655), not the supporting text\'s style', async () => {
    await mountInPlace({ children: 'Anyone on the team can open it.' });
    const text = screen.getByText('Anyone on the team can open it.');
    const body = createTanreiTheme(tanrei, 'light').text('body');
    expect(textStyle(text)).toMatchObject({ color: painted(tokens.contentColor), fontSize: body.fontSize, lineHeight: body.lineHeight, fontWeight: body.fontWeight, fontFamily: body.fontFamily });
    // Under a system whose supporting text is not body, the content still is.
    await mountInPlace({ children: 'Plain.' }, { theme: 'light', system: withComponent(tanrei, 'dialog', { supportingTextTypescale: 'bodySmall' }) });
    expect(textStyle(screen.getByText('Plain.')).fontSize).toBe(body.fontSize);
    expect(body.fontSize).not.toBe(createTanreiTheme(tanrei, 'light').text('bodySmall').fontSize);
  });

  test('DLG-9: with an icon — at comp.dialog.icon.size in its color and the unselected glyph — the icon and the headline are centred; without one the headline and supporting text start at the start', async () => {
    const view = await mountInPlace({ icon: 'delete' }, { theme: 'light', system: tanrei });
    expect(viewStyle(q('icon')!)).toMatchObject({ width: tokens.iconSize, height: tokens.iconSize });
    expect(textStyle(q('icon.glyph')!)).toMatchObject({ color: painted(tokens.iconColor), fontFamily: iconFamily(tanrei.icon, false).families[0] });
    expect(viewStyle(q('top')!).alignItems).toBe('center');
    expect(textStyle(q('headline')!).textAlign).toBe('center');
    expect(textStyle(q('supporting-text')!).textAlign).toBeUndefined();
    expect(q('icon')!.props.accessibilityElementsHidden).toBe(true);
    await view.unmount();
    await mountInPlace();
    expect(q('icon')).toBeNull();
    expect(viewStyle(q('top')!).alignItems).toBe('stretch');
    expect(textStyle(q('headline')!).textAlign).toBeUndefined();
  });

  test('DLG-10: the actions in one row at the end, actions.gap apart, in order; when they do not fit, a column at the end in the same order; the buttons are not restyled', async () => {
    await mountInPlace();
    const actions = q('actions')!;
    expect(viewStyle(actions)).toMatchObject({ flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.actionsGap });
    expect(screen.getAllByRole('button').map((button) => button.props.testID)).toEqual(['cancel', 'discard']);
    await fireEvent(actions, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 40 } } });
    await layout('actions.0', { width: 90, height: 40 });
    await layout('actions.1', { width: 100, height: 40 });
    expect(viewStyle(q('actions')!).flexDirection).toBe('row');
    await layout('actions.1', { width: 140, height: 40 });
    expect(viewStyle(q('actions')!)).toMatchObject({ flexDirection: 'column', alignItems: 'flex-end', gap: tokens.actionsGap });
    expect(screen.getAllByRole('button').map((button) => button.props.testID)).toEqual(['cancel', 'discard']);
    expect(viewStyle(screen.getByTestId('cancel'))).toMatchObject({ minHeight: tanrei.components.button.sizes.medium.containerHeight });
  });

  test('DLG-11: long content scrolls between the fixed headline and actions; a divider below the headline while scrolled down, above the actions while more lies below; none while everything fits', async () => {
    await mountInPlace();
    expect(q('divider-top')).toBeNull();
    expect(q('divider-bottom')).toBeNull();
    const scroll = q('scroll')!;
    expect(viewStyle(scroll)).toMatchObject({ flexGrow: 0, flexShrink: 1 });
    await fireEvent(scroll, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 200 } } });
    await fireEvent(scroll, 'contentSizeChange', 300, 600);
    expect(q('divider-top')).toBeNull();
    expect(viewStyle(q('divider-bottom')!)).toMatchObject({ height: tokens.dividerWidth, backgroundColor: painted(tokens.dividerColor), marginHorizontal: -tokens.containerPadding });
    await fireEvent(scroll, 'scroll', { nativeEvent: { contentOffset: { x: 0, y: 400 }, layoutMeasurement: { width: 300, height: 200 }, contentSize: { width: 300, height: 600 } } });
    expect(q('divider-top')).not.toBeNull();
    expect(q('divider-bottom')).toBeNull();
    await fireEvent(q('scroll')!, 'scroll', { nativeEvent: { contentOffset: { x: 0, y: 100 }, layoutMeasurement: { width: 300, height: 200 }, contentSize: { width: 300, height: 600 } } });
    expect(q('divider-top')).not.toBeNull();
    expect(q('divider-bottom')).not.toBeNull();
    // The headline and the actions are not in the scrolled part.
    const ancestors = (testID: string) => {
      const found: (string | undefined)[] = [];
      for (let node = q(testID)!.parent; node; node = node.parent) found.push(node.props?.testID);
      return found;
    };
    expect(ancestors('headline')).not.toContain(`${ID}.scroll`);
    expect(ancestors('actions')).not.toContain(`${ID}.scroll`);
    expect(ancestors('supporting-text')).toContain(`${ID}.scroll`);
  });

  test('DLG-12: when the icon, the headline and the actions leave no room for the scrolled part, everything scrolls together', async () => {
    await mountInPlace({ icon: 'warning' });
    await layout('area', { width: 480, height: 200 });
    await layout('top', { width: 300, height: 90 });
    await layout('bottom', { width: 300, height: 70 });
    const ancestors = (testID: string) => {
      const found: (string | undefined)[] = [];
      for (let node = q(testID)!.parent; node; node = node.parent) found.push(node.props?.testID);
      return found;
    };
    expect(ancestors('headline')).toContain(`${ID}.scroll`);
    expect(ancestors('actions')).toContain(`${ID}.scroll`);
  });

  test('DLG-16: right-to-left mirrors the layout by React Native\'s own rules — text aligned to its natural start, the actions at the row\'s end — and leaves the content alone', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mountInPlace({ children: <Text testID="custom">Content</Text> });
    expect(textStyle(q('headline')!).textAlign).toBeUndefined();
    expect(viewStyle(q('actions')!).justifyContent).toBe('flex-end');
    expect(textStyle(screen.getByTestId('custom')).textAlign).toBeUndefined();
  });
});

describe('the overlay layer inside the dialog', () => {
  test('TIP-13: a tooltip in the dialog is drawn in the dialog\'s own layer, above its scrim and container', async () => {
    await render(
      <TanreiProvider theme="light">
        <Dialog testID={ID} visible headline="Share">
          <Tooltip testID="tip" text="Copy link" open>
            <IconButton accessibilityLabel="Copy">link</IconButton>
          </Tooltip>
        </Dialog>
      </TanreiProvider>,
    );
    const layer = screen.getByTestId(`${ID}.layer`, { includeHiddenElements: true });
    const ancestors: (string | undefined)[] = [];
    for (let node = screen.getByTestId('tip.container', { includeHiddenElements: true }).parent; node; node = node.parent) ancestors.push(node.props?.testID);
    expect(ancestors).toContain(`${ID}.layer`);
    expect(layer.parent?.children.at(-1)).toBe(layer);
    expect(screen.queryByTestId('tanrei.overlay', { includeHiddenElements: true })).toBeNull();
  });

  test('SNK-12: a snackbar requested while a dialog is open waits until it closes, and is drawn under the dialog\'s window', async () => {
    let host: SnackbarHost | null = null;
    function Grab() {
      host = useSnackbar();
      return null;
    }
    const tree = (open: boolean) => (
      <TanreiProvider theme="light">
        <Grab />
        <Dialog testID={ID} visible={open} headline="Discard draft?" />
      </TanreiProvider>
    );
    const view = await render(tree(true));
    await act(async () => {
      void host!.show({ testID: 'snk', message: 'Draft saved' });
    });
    expect(screen.queryByTestId('snk', { includeHiddenElements: true })).toBeNull();
    await view.rerender(tree(false));
    await wait(tokens.motionExitDuration + 50);
    expect(screen.queryByTestId('snk', { includeHiddenElements: true })).not.toBeNull();
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  test.each(schemes)('$scheme: the scrim, the container, the icon, the headline and the supporting text', async ({ provider, scheme }) => {
    await mount({ icon: 'delete' }, provider);
    expect(viewStyle(q('scrim')!).backgroundColor).toBe(painted(tokens.scrimColor, scheme));
    expect(viewStyle(container()).backgroundColor).toBe(painted(tokens.containerColor, scheme));
    expect(textStyle(q('icon.glyph')!).color).toBe(painted(tokens.iconColor, scheme));
    expect(textStyle(q('headline')!).color).toBe(painted(tokens.headlineColor, scheme));
    expect(textStyle(q('supporting-text')!).color).toBe(painted(tokens.supportingTextColor, scheme));
  });

  test('the default values: surface-bright at level3, corner.large, 280 to 560 wide, padding 24, gap 16; headline heading-5 in on-surface; supporting text in on-surface-variant; icon 24 in secondary', () => {
    expect(tokens).toMatchObject({ containerElevation: 'level3', containerShape: tanrei.shape.large, containerMinWidth: 280, containerMaxWidth: 560, containerPadding: 24, containerGap: 16, headlineTypescale: 'heading5', iconSize: 24 });
    expect(painted(tokens.containerColor)).toBe(role('surfaceBright'));
    expect(painted(tokens.supportingTextColor)).toBe(role('onSurfaceVariant'));
    expect(painted(tokens.iconColor)).toBe(role('secondary'));
  });

  test('values re-valued by a layer are drawn', async () => {
    const system = withComponent(tanrei, 'dialog', { containerShape: 30, containerPadding: 10, containerGap: 5, actionsGap: 3, actionsMarginBlockStart: 11, scrimColor: { kind: 'literal', r: 1, g: 2, b: 3, a: 0.5 } });
    await mountInPlace({}, { theme: 'light', system });
    expect(viewStyle(container())).toMatchObject({ borderRadius: 30, padding: 10 });
    expect(viewStyle(q('top')!).gap).toBe(5);
    expect(viewStyle(q('actions')!).gap).toBe(3);
    expect(viewStyle(q('bottom')!).paddingTop).toBe(11);
    expect(viewStyle(q('scrim')!).backgroundColor).toBe(formatColor({ r: 1, g: 2, b: 3, a: 0.5 }));
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(dialogSubject);

  test('the icon fixture fills the icon slot with a glyph (the icon helper) and the actions slot with text Buttons, in order', async () => {
    const fixture = spec.fixtures.find((each) => each.id === 'icon')!;
    expect(fixture.slots).toEqual({ icon: 'delete', actions: ['Cancel', 'Delete'] });
    await render(fixtureElement(dialogSubject, fixture));
    const glyph = screen.getByText('delete', { includeHiddenElements: true });
    expect(textStyle(glyph)).toMatchObject({ fontFamily: iconFamily(tanrei.icon, false).families[0], color: painted(tokens.iconColor) });
    expect(screen.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual(['Cancel', 'Delete']);
    expect(viewStyle(screen.getByRole('button', { name: 'Cancel' })).backgroundColor).toBeUndefined();
  });

  test('every fixture is open (the harness draws the open surface in place)', () => {
    for (const fixture of spec.fixtures) expect(fixture.props.open).toBe(true);
  });

  test('the in-place surface is the dialog\'s own drawing: same scrim and container as in the Modal', async () => {
    await mountInPlace();
    expect(q('modal')).toBeNull();
    expect(q('scrim')).not.toBeNull();
  });
});
