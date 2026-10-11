// Tooltip — opening and closing, placement, the overlay layer, accessibility, motion, token binding and fixture
// baselines. Cases come from specs/tooltip.spec.json; every behaviour id is cited by the test that covers it.
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, Platform, Text, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiPaint, TanreiScheme, TanreiSystem, TanreiTooltipTokens } from '../../generated/vocabulary';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resolveElevation } from '../../theme/elevation';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { OverlayLayer } from '../../theme/overlay';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { IconButton } from '../IconButton';
import { Tooltip, placeTooltip, tooltipDescription, type TooltipProps } from '../Tooltip';
import { tooltipSubject } from './Tooltip.subject';

const spec = loadSpec('tooltip');
const tokens: TanreiTooltipTokens = tanrei.components.tooltip;
const ID = 'tip';
const ANCHOR = 'anchor';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};
/** Short delays, so that the timing tests run in milliseconds — and prove the tokens drive them. */
const FAST = withComponent(tanrei, 'tooltip', { motionShowDelay: 60, motionHideDelay: 30, timeoutTouch: 80 });
const fast = FAST.components.tooltip;

const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
/**
 * The delays are timed with Jest's clock, not the machine's: a loaded machine must not open a tooltip "early". Call
 * first in a test; `advance(ms)` moves the clock.
 */
function useClock() {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick', 'setImmediate'] });
  return (ms: number) =>
    act(async () => {
      jest.advanceTimersByTime(ms);
    });
}

type Props = Partial<TooltipProps> & { anchorProps?: Record<string, unknown> };
const element = ({ anchorProps, ...props }: Props = {}) => (
  <Tooltip testID={ID} text="Move to trash" {...props}>
    <IconButton testID={ANCHOR} accessibilityLabel="Delete" {...anchorProps}>
      delete
    </IconButton>
  </Tooltip>
);
function mount(props: Props = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light', system: FAST }) {
  return render(<TanreiProvider {...provider}>{element(props)}</TanreiProvider>);
}

const anchor = () => screen.getByTestId(ANCHOR);
const container = () => screen.queryByTestId(`${ID}.container`, { includeHiddenElements: true });
const placement = () => screen.queryByTestId(`${ID}.placement`, { includeHiddenElements: true });
const layer = () => screen.queryByTestId('tanrei.overlay', { includeHiddenElements: true });
const isOpen = () => container() !== null && placement()?.props.pointerEvents === 'auto';

/** The anchor at (100, 300), 48 × 48; the layer at the window's origin. */
const ANCHOR_BOX = { x: 100, y: 300, width: 48, height: 48 };
function measureSpy(box = ANCHOR_BOX) {
  return jest.spyOn(View.prototype as unknown as { measureInWindow: (callback: (...values: number[]) => void) => void }, 'measureInWindow').mockImplementation(function (this: { props?: { testID?: string } }, callback) {
    if (this.props?.testID === 'tanrei.overlay') callback(0, 0, 400, 800);
    else callback(box.x, box.y, box.width, box.height);
  });
}
const layOutTooltip = (size = { width: 120, height: 24 }) => fireEvent(placement()!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, ...size } } });

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
beforeEach(() => {
  reduceMotion(true);
  resetLookupReports();
  // The icon button's selected-fill report is IconButton's to test.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  development(true);
});
const tooltipReports = () => jest.mocked(console.warn).mock.calls.map(([message]) => String(message)).filter((message) => message.includes('Tooltip'));

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Tooltip.name);
    expect(platform.props).toEqual({ variant: 'variant', text: 'text', title: 'title', placement: 'placement', describes: 'describes', open: 'open' });
    expect(platform.events).toEqual({ toggle: 'onOpenChange' });
  });

  test('defaults follow the spec: plain, top, describes, closed — nothing is drawn and the overlay layer is not in the tree', async () => {
    const view = await mount();
    expect(container()).toBeNull();
    expect(layer()).toBeNull();
    // The provider renders exactly its children while the layer is empty: every other baseline stays still.
    const json = JSON.stringify(view.toJSON());
    await view.unmount();
    const bare = await render(element());
    expect(JSON.stringify(bare.toJSON())).toBe(json);
    expect(anchor().props.accessibilityHint).toBe('Move to trash');
  });
});

describe('opening and closing (TIP-1 … TIP-8)', () => {
  test('TIP-1: a pointer resting on the anchor for comp.tooltip.motion.show-delay opens it; leaving the anchor for the tooltip keeps it open; off both for the hide delay closes it', async () => {
    const advance = useClock();
    const onOpenChange = jest.fn();
    await mount({ onOpenChange });
    await fireEvent(anchor(), 'hoverIn');
    await advance(fast.motionShowDelay / 2);
    expect(isOpen()).toBe(false);
    await advance(fast.motionShowDelay / 2 + 20);
    expect(isOpen()).toBe(true);
    await fireEvent(anchor(), 'hoverOut');
    await fireEvent(container()!, 'pointerEnter');
    await advance(fast.motionHideDelay + 20);
    expect(isOpen()).toBe(true);
    await fireEvent(container()!, 'pointerLeave');
    await advance(fast.motionHideDelay / 2);
    expect(isOpen()).toBe(true);
    await advance(fast.motionHideDelay / 2 + 20);
    expect(isOpen()).toBe(false);
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  test('TIP-1: a pointer that leaves before the show delay opens nothing; the default delays are the tokens\' (500 and 100 ms)', async () => {
    const advance = useClock();
    expect(tokens).toMatchObject({ motionShowDelay: 500, motionHideDelay: 100 });
    await mount();
    await fireEvent(anchor(), 'hoverIn');
    await advance(fast.motionShowDelay / 2);
    await fireEvent(anchor(), 'hoverOut');
    await advance(fast.motionShowDelay);
    expect(isOpen()).toBe(false);
  });

  test('TIP-2: keyboard focus on the anchor opens it at once and blur closes it; focus that comes with a press does not open it', async () => {
    const onOpenChange = jest.fn();
    await mount({ onOpenChange });
    await fireEvent(anchor(), 'focus');
    expect(isOpen()).toBe(true);
    await fireEvent(anchor(), 'blur');
    expect(isOpen()).toBe(false);
    await fireEvent(anchor(), 'pressIn');
    await fireEvent(anchor(), 'focus');
    expect(isOpen()).toBe(false);
    await fireEvent(anchor(), 'pressOut');
    expect(onOpenChange.mock.calls).toEqual([[true], [false]]);
  });

  test('TIP-3: a long-press opens it without activating the anchor; once the finger lifts it stays comp.tooltip.timeout.touch, then closes (1500 by default)', async () => {
    const advance = useClock();
    expect(tokens.timeoutTouch).toBe(1500);
    const onPress = jest.fn();
    await mount({ anchorProps: { onPress } });
    await fireEvent(anchor(), 'pressIn');
    await fireEvent(anchor(), 'longPress');
    expect(isOpen()).toBe(true);
    await fireEvent(anchor(), 'pressOut');
    await advance(fast.timeoutTouch / 2);
    expect(isOpen()).toBe(true);
    await advance(fast.timeoutTouch / 2 + 30);
    expect(isOpen()).toBe(false);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('TIP-4: Escape closes it without moving focus and consumes the key; it stays closed until the anchor is focused or entered again', async () => {
    const onKeyDown = jest.fn();
    await mount({ anchorProps: { onKeyDown } });
    await fireEvent(anchor(), 'focus');
    const event = { nativeEvent: { key: 'Escape' }, preventDefault: jest.fn(), stopPropagation: jest.fn() };
    await fireEvent(anchor(), 'keyDown', event);
    expect(isOpen()).toBe(false);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    // The anchor's own handler still ran first; focus did not move (no blur).
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    await fireEvent(anchor(), 'blur');
    await fireEvent(anchor(), 'focus');
    expect(isOpen()).toBe(true);
  });

  test('TIP-5: while the pointer is over the anchor, or it has keyboard focus, it stays open with no time limit', async () => {
    const advance = useClock();
    await mount();
    await fireEvent(anchor(), 'hoverIn');
    await advance(fast.motionShowDelay + fast.motionHideDelay + fast.timeoutTouch + 50);
    expect(isOpen()).toBe(true);
    await fireEvent(anchor(), 'focus');
    await fireEvent(anchor(), 'hoverOut');
    await advance(fast.motionHideDelay + 50);
    expect(isOpen()).toBe(true);
  });

  test('TIP-6: activating the anchor closes it, and the same hover does not open it again until the pointer leaves and comes back', async () => {
    const advance = useClock();
    const onPress = jest.fn();
    await mount({ anchorProps: { onPress } });
    await fireEvent(anchor(), 'hoverIn');
    await advance(fast.motionShowDelay + 20);
    await fireEvent.press(anchor());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(isOpen()).toBe(false);
    await advance(fast.motionShowDelay + 20);
    expect(isOpen()).toBe(false);
    await fireEvent(anchor(), 'hoverOut');
    await fireEvent(anchor(), 'hoverIn');
    await advance(fast.motionShowDelay + 20);
    expect(isOpen()).toBe(true);
  });

  test('TIP-7: the product\'s open shows and hides it without a toggle; after it, the tooltip keeps following its own rules and reports them', async () => {
    const onOpenChange = jest.fn();
    const view = await mount({ onOpenChange, open: true });
    expect(isOpen()).toBe(true);
    await view.rerender(<TanreiProvider theme="light" system={FAST}>{element({ onOpenChange, open: false })}</TanreiProvider>);
    expect(isOpen()).toBe(false);
    expect(onOpenChange).not.toHaveBeenCalled();
    await fireEvent(anchor(), 'focus');
    expect(isOpen()).toBe(true);
    expect(onOpenChange.mock.calls).toEqual([[true]]);
  });

  test('TIP-8: a tooltip that opens while another is open closes the other at once and opens without the show delay; at most one is open', async () => {
    const first = jest.fn();
    const second = jest.fn();
    await render(
      <TanreiProvider theme="light" system={FAST}>
        <Tooltip testID="one" text="Archive" onOpenChange={first}>
          <IconButton testID="a" accessibilityLabel="Archive">archive</IconButton>
        </Tooltip>
        <Tooltip testID="two" text="Delete" onOpenChange={second}>
          <IconButton testID="b" accessibilityLabel="Delete">delete</IconButton>
        </Tooltip>
      </TanreiProvider>,
    );
    await fireEvent(screen.getByTestId('a'), 'focus');
    expect(screen.queryByTestId('one.container', { includeHiddenElements: true })).not.toBeNull();
    await fireEvent(screen.getByTestId('b'), 'hoverIn');
    expect(second.mock.calls).toEqual([[true]]);
    expect(first.mock.calls).toEqual([[true], [false]]);
    expect(screen.queryByTestId('two.container', { includeHiddenElements: true })).not.toBeNull();
    expect(screen.getByTestId('one.placement', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
  });
});

describe('placement (TIP-9)', () => {
  const area = { width: 400, height: 800 };
  const size = { width: 120, height: 24 };
  const place = (placement: 'top' | 'bottom' | 'start' | 'end', anchorBox = ANCHOR_BOX, rtl = false) => placeTooltip({ anchor: anchorBox, size, area, placement, offset: 4, margin: 8, rtl });

  test('TIP-9: comp.tooltip.offset from the anchor on the placement\'s side, centred along it; start and end follow the layout direction', () => {
    expect(place('top')).toEqual({ side: 'top', top: 300 - 4 - 24, left: 100 + 24 - 60 });
    expect(place('bottom')).toEqual({ side: 'bottom', top: 348 + 4, left: 64 });
    expect(place('start', { x: 200, y: 300, width: 48, height: 48 })).toEqual({ side: 'left', left: 200 - 4 - 120, top: 300 + 24 - 12 });
    expect(place('end', { x: 200, y: 300, width: 48, height: 48 })).toMatchObject({ side: 'right', left: 248 + 4 });
    expect(place('start', { x: 200, y: 300, width: 48, height: 48 }, true)).toMatchObject({ side: 'right' });
  });

  test('TIP-9: it flips when its side has no room, takes the side with more room when neither has, and shifts along the side to stay inside the margin', () => {
    expect(place('top', { x: 100, y: 10, width: 48, height: 48 })).toMatchObject({ side: 'bottom' });
    expect(place('bottom', { x: 100, y: 770, width: 48, height: 20 })).toMatchObject({ side: 'top' });
    expect(placeTooltip({ anchor: { x: 0, y: 5, width: 48, height: 30 }, size: { width: 120, height: 40 }, area: { width: 400, height: 50 }, placement: 'top', offset: 4, margin: 8, rtl: false })).toMatchObject({ side: 'bottom' });
    expect(place('top', { x: 0, y: 300, width: 20, height: 20 }).left).toBe(8);
    expect(place('top', { x: 390, y: 300, width: 10, height: 20 }).left).toBe(400 - 8 - 120);
  });

  test('TIP-9: inside the window\'s safe area — TanreiProvider\'s insets move each edge in: it flips away from a top inset and shifts clear of the side insets', () => {
    const insets = { top: 47, right: 30, bottom: 34, left: 20 };
    // Room above the anchor at y 60: 60 - 4 - 8 = 48 without insets (the 24-high tooltip fits), 1 with them.
    expect(placeTooltip({ anchor: { x: 100, y: 60, width: 48, height: 48 }, size, area, placement: 'top', offset: 4, margin: 8, rtl: false })).toMatchObject({ side: 'top' });
    expect(placeTooltip({ anchor: { x: 100, y: 60, width: 48, height: 48 }, size, area, placement: 'top', offset: 4, margin: 8, rtl: false, insets })).toMatchObject({ side: 'bottom' });
    expect(placeTooltip({ anchor: { x: 0, y: 300, width: 20, height: 20 }, size, area, placement: 'top', offset: 4, margin: 8, rtl: false, insets }).left).toBe(8 + 20);
    expect(placeTooltip({ anchor: { x: 390, y: 300, width: 10, height: 20 }, size, area, placement: 'top', offset: 4, margin: 8, rtl: false, insets }).left).toBe(400 - 8 - 30 - 120);
    expect(placeTooltip({ anchor: { x: 200, y: 790, width: 48, height: 4 }, size: { width: 120, height: 60 }, area, placement: 'end', offset: 4, margin: 8, rtl: false, insets }).top).toBe(800 - 8 - 34 - 60);
  });

  test('TIP-9: a tooltip in the app places itself with the provider\'s insets', async () => {
    measureSpy();
    await mount({ open: true }, { theme: 'light', system: FAST, insets: { top: 290 } });
    await layOutTooltip();
    expect(viewStyle(placement()!)).toMatchObject({ top: 348 + tokens.offset, left: 64 });
  });

  test('TIP-9: drawn in the overlay layer from the measured anchor and its own size; unseen until placed; measured again when the anchor lays out or the window changes; removed with its anchor', async () => {
    const measure = measureSpy();
    const view = await mount({ open: true });
    expect(viewStyle(placement()!).opacity).toBe(0);
    await layOutTooltip();
    expect(viewStyle(placement()!)).toMatchObject({ position: 'absolute', top: 300 - tokens.offset - 24, left: 64, opacity: 1 });
    const calls = measure.mock.calls.length;
    await fireEvent(anchor(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 48, height: 48 } } });
    expect(measure.mock.calls.length).toBeGreaterThan(calls);
    await act(async () => {
      Dimensions.set({ window: { ...WINDOW, width: 800, height: 400, fontScale: 1 }, screen: { ...WINDOW, width: 800, height: 400, fontScale: 1 } });
    });
    expect(measure.mock.calls.length).toBeGreaterThan(calls + 2);
    await act(async () => {
      Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
    });
    await view.rerender(<TanreiProvider theme="light" system={FAST}><View /></TanreiProvider>);
    expect(container()).toBeNull();
    expect(layer()).toBeNull();
  });
});

describe('the drawn tooltip (TIP-10 … TIP-13)', () => {
  test('TIP-10: plain — the text in its type style and color on the inverse surface, its corners, padding, minimum height and maximum width, level0; a title is ignored', async () => {
    await mount({ open: true, title: 'Ignored' }, { theme: 'light' });
    const style = viewStyle(container()!);
    expect(style).toMatchObject({
      backgroundColor: painted(tokens.plainContainerColor),
      borderRadius: tokens.plainContainerShape,
      paddingHorizontal: tokens.plainContainerPaddingInline,
      paddingVertical: tokens.plainContainerPaddingBlock,
      minHeight: tokens.plainContainerMinHeight,
      maxWidth: tokens.plainContainerMaxWidth,
    });
    expect(painted(tokens.plainContainerColor)).toBe(role('inverseSurface'));
    expect(style.boxShadow).toBeUndefined();
    const text = screen.getByTestId(`${ID}.text`, { includeHiddenElements: true });
    const expected = createTanreiTheme(tanrei, 'light').text(tokens.plainSupportingTextTypescale);
    expect(textStyle(text)).toMatchObject({ color: painted(tokens.plainSupportingTextColor), fontSize: expected.fontSize, lineHeight: expected.lineHeight });
    expect(text.props.numberOfLines).toBeUndefined();
    expect(screen.queryByTestId(`${ID}.title`, { includeHiddenElements: true })).toBeNull();
  });

  test('TIP-11: rich — the title above the text, the gap between, on surface-bright at level2 with its corners, padding and maximum width; without a title the text alone', async () => {
    const view = await mount({ open: true, variant: 'rich', title: 'Storage', text: 'Files in the trash still count.' }, { theme: 'light' });
    const style = viewStyle(container()!);
    expect(style).toMatchObject({ backgroundColor: painted(tokens.richContainerColor), borderRadius: tokens.richContainerShape, paddingHorizontal: tokens.richContainerPaddingInline, paddingVertical: tokens.richContainerPaddingBlock, gap: tokens.richContainerGap, maxWidth: tokens.richContainerMaxWidth });
    const level = resolveElevation(tanrei.elevation[tokens.richContainerElevation], (name) => role(name));
    expect(style.boxShadow).toEqual(level.boxShadow);
    const title = screen.getByTestId(`${ID}.title`, { includeHiddenElements: true });
    expect(textStyle(title)).toMatchObject({ color: painted(tokens.richTitleColor), fontSize: createTanreiTheme(tanrei, 'light').text(tokens.richTitleTypescale).fontSize });
    expect(container()!.children.indexOf(title)).toBeLessThan(container()!.children.indexOf(screen.getByTestId(`${ID}.text`, { includeHiddenElements: true })));
    expect(textStyle(screen.getByTestId(`${ID}.text`, { includeHiddenElements: true })).color).toBe(painted(tokens.richSupportingTextColor));
    await view.unmount();
    await mount({ open: true, variant: 'rich', text: 'Files in the trash still count.' }, { theme: 'light' });
    expect(screen.queryByTestId(`${ID}.title`, { includeHiddenElements: true })).toBeNull();
  });

  test('TIP-12: its corners ease by the smoothing (cupertino: continuous); it grows with the text (no height, no line limit) and starts its text at the layout direction\'s start', async () => {
    const view = await mount({ open: true }, { theme: 'light' });
    expect(viewStyle(container()!).borderCurve).toBeUndefined();
    const text = textStyle(screen.getByTestId(`${ID}.text`, { includeHiddenElements: true }));
    expect(text.textAlign).toBeUndefined();
    expect(viewStyle(container()!).height).toBeUndefined();
    await view.unmount();
    await mount({ open: true }, { theme: 'light', system: cupertino });
    expect(viewStyle(container()!)).toMatchObject({ borderCurve: 'continuous', borderRadius: cupertino.components.tooltip.plainContainerShape });
  });

  test('TIP-13: no focus and nothing pressable in it; nothing is dimmed or blocked (the layer takes no touch of its own); a press on it closes it and reaches nothing under it', async () => {
    const onOpenChange = jest.fn();
    await mount({ open: true, onOpenChange });
    expect(layer()!.props.pointerEvents).toBe('box-none');
    expect(viewStyle(layer()!)).toEqual({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 });
    expect(viewStyle(layer()!).backgroundColor).toBeUndefined();
    expect(placement()!.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(container()!.props.focusable).toBeUndefined();
    expect(screen.getAllByRole('button', { includeHiddenElements: true }).map((node) => node.props.testID)).toEqual([ANCHOR]);
    // It is the responder of a press on it, so nothing under it gets that press.
    expect(container()!.props.onStartShouldSetResponder()).toBe(true);
    await fireEvent(container()!, 'responderRelease');
    expect(isOpen()).toBe(false);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('TIP-13: it is drawn above the app\'s content (after it) and, inside a layer of its own (a dialog\'s window), above that layer\'s content and scrim', async () => {
    await render(
      <TanreiProvider theme="light" system={FAST}>
        <Text testID="content">Content</Text>
        <OverlayLayer own testID="dialog.layer">
          <View testID="scrim" />
          {element({ open: true })}
        </OverlayLayer>
      </TanreiProvider>,
    );
    const ancestors: (string | undefined)[] = [];
    for (let node = container()?.parent; node; node = node.parent) ancestors.push(node.props?.testID);
    expect(ancestors).toContain('dialog.layer');
    // The inner layer is drawn after the dialog's own content (its scrim); the provider's layer stays empty.
    const inner = screen.getByTestId('dialog.layer', { includeHiddenElements: true });
    expect(inner.parent?.children.at(-1)).toBe(inner);
    expect(layer()).toBeNull();
  });
});

describe('accessibility (TIP-14, TIP-16)', () => {
  test('TIP-14: while describes the text is the anchor\'s accessibility hint, open or not — after the title for a rich tooltip; the anchor\'s name and role stay its own; the drawn tooltip is not read again', async () => {
    const view = await mount();
    expect(anchor().props).toMatchObject({ accessibilityHint: 'Move to trash', accessibilityLabel: 'Delete', accessibilityRole: 'button' });
    await view.rerender(<TanreiProvider theme="light" system={FAST}>{element({ variant: 'rich', title: 'Trash', text: 'Deleted after 30 days.', open: true })}</TanreiProvider>);
    expect(anchor().props.accessibilityHint).toBe('Trash, Deleted after 30 days.');
    expect(tooltipDescription('plain', 'Trash', 'Deleted')).toBe('Deleted');
    expect(placement()!.props.accessibilityElementsHidden).toBe(true);
    await view.rerender(<TanreiProvider theme="light" system={FAST}>{element({ describes: false, anchorProps: { accessibilityHint: 'Own hint' } })}</TanreiProvider>);
    expect(anchor().props.accessibilityHint).toBe('Own hint');
    await view.rerender(<TanreiProvider theme="light" system={FAST}>{element({ anchorProps: { accessibilityHint: 'Own hint' } })}</TanreiProvider>);
    expect(anchor().props.accessibilityHint).toBe('Own hint, Move to trash');
  });

  test('TIP-16: with empty text it never opens and adds nothing, reported in development builds; a plain tooltip reports an ignored title; release builds are silent', async () => {
    const view = await mount({ text: '', open: true });
    expect(container()).toBeNull();
    await fireEvent(anchor(), 'focus');
    expect(container()).toBeNull();
    expect(anchor().props.accessibilityHint).toBeUndefined();
    await view.rerender(<TanreiProvider theme="light" system={FAST}>{element({ title: 'Trash' })}</TanreiProvider>);
    expect(tooltipReports()).toEqual([expect.stringContaining('a Tooltip (testID "tip") has no text'), expect.stringContaining('a plain Tooltip (testID "tip") ignores its title "Trash"')]);
    await view.unmount();
    jest.mocked(console.warn).mockClear();
    development(false);
    await mount({ text: '', title: 'Trash' });
    expect(tooltipReports()).toEqual([]);
  });

  test('an unknown variant or placement renders as plain / top, reported in development builds', async () => {
    const measure = measureSpy();
    await mount({ open: true, variant: 'loud' as never, placement: 'left' as never }, { theme: 'light' });
    await layOutTooltip();
    expect(viewStyle(container()!).backgroundColor).toBe(painted(tokens.plainContainerColor));
    expect(viewStyle(placement()!).top).toBe(300 - tokens.offset - 24);
    expect(tooltipReports()).toEqual([expect.stringContaining('Tooltip variant "loud" is not defined; using "plain"'), expect.stringContaining('Tooltip placement "left" is not defined; using "top"')]);
    expect(measure).toHaveBeenCalled();
  });
});

describe('motion (TIP-15)', () => {
  test('TIP-15: once placed it fades in over the enter motion and out over the exit motion before it leaves; it never moves or scales', async () => {
    reduceMotion(false);
    measureSpy();
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const view = await mount({ open: true }, { theme: 'light' });
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionEnterDuration)).toHaveLength(0);
    await layOutTooltip();
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionEnterDuration)?.[1]).toMatchObject({ toValue: 1, useNativeDriver: true });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionEnterEasing);
    expect(viewStyle(placement()!).transform).toBeUndefined();
    await wait(tokens.motionEnterDuration + 50);
    await view.rerender(<TanreiProvider theme="light">{element({ open: false })}</TanreiProvider>);
    expect(timing.mock.calls.find(([, config]) => config.duration === tokens.motionExitDuration)?.[1]).toMatchObject({ toValue: 0 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionExitEasing);
    expect(container()).not.toBeNull();
    await wait(tokens.motionExitDuration + 50);
    expect(container()).toBeNull();
  });

  test('TIP-15: where motion is reduced it keeps the fade on iOS and appears and disappears at once on Android', async () => {
    measureSpy();
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ open: true }, { theme: 'light' });
    await layOutTooltip();
    expect(Platform.OS).toBe('ios');
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionEnterDuration)).toBe(true);
    await wait(tokens.motionEnterDuration + 50);
    await view.unmount();
    timing.mockClear();
    jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    const android = await mount({ open: true }, { theme: 'light' });
    await layOutTooltip();
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionEnterDuration)).toBe(false);
    expect(viewStyle(placement()!).opacity).toBe(1);
    await android.rerender(<TanreiProvider theme="light">{element({ open: false })}</TanreiProvider>);
    expect(container()).toBeNull();
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  test.each(schemes)('$scheme: both variants draw their colors in this scheme', async ({ provider, scheme }) => {
    const view = await mount({ open: true }, provider);
    expect(viewStyle(container()!).backgroundColor).toBe(painted(tokens.plainContainerColor, scheme));
    expect(textStyle(screen.getByTestId(`${ID}.text`, { includeHiddenElements: true })).color).toBe(painted(tokens.plainSupportingTextColor, scheme));
    await view.unmount();
    await mount({ open: true, variant: 'rich', title: 'Title' }, provider);
    expect(viewStyle(container()!).backgroundColor).toBe(painted(tokens.richContainerColor, scheme));
    expect(textStyle(screen.getByTestId(`${ID}.title`, { includeHiddenElements: true })).color).toBe(painted(tokens.richTitleColor, scheme));
    expect(textStyle(screen.getByTestId(`${ID}.text`, { includeHiddenElements: true })).color).toBe(painted(tokens.richSupportingTextColor, scheme));
  });

  test('the default values: plain inverse-surface at corner 6 with body-small, rich surface-bright at level2 with a heading-6 title; offset 4, margin 8', () => {
    expect(tokens).toMatchObject({ plainContainerShape: 6, plainContainerElevation: 'level0', plainSupportingTextTypescale: 'bodySmall', richContainerElevation: 'level2', richTitleTypescale: 'heading6', offset: 4, windowMargin: 8 });
    expect(painted(tokens.richContainerColor)).toBe(role('surfaceBright'));
  });

  test('values re-valued by a layer are drawn', async () => {
    const system = withComponent(tanrei, 'tooltip', { plainContainerShape: 11, plainContainerPaddingInline: 13, plainContainerMaxWidth: 150, plainContainerColor: { kind: 'literal', r: 1, g: 2, b: 3, a: 1 } });
    await mount({ open: true }, { theme: 'light', system });
    expect(viewStyle(container()!)).toMatchObject({ borderRadius: 11, paddingHorizontal: 13, maxWidth: 150, backgroundColor: formatColor({ r: 1, g: 2, b: 3, a: 1 }) });
  });
});

describe('controlled use', () => {
  test('a product drives open from onOpenChange', async () => {
    function Product() {
      const [open, setOpen] = useState(false);
      return (
        <TanreiProvider theme="light" system={FAST}>
          {element({ open, onOpenChange: setOpen })}
        </TanreiProvider>
      );
    }
    await render(<Product />);
    await fireEvent(anchor(), 'focus');
    expect(isOpen()).toBe(true);
    await fireEvent(anchor(), 'blur');
    expect(isOpen()).toBe(false);
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(tooltipSubject);

  test('every fixture is open with a text (the snapshot harness draws the tooltip beside its anchor)', () => {
    for (const fixture of spec.fixtures) expect(fixture.props).toMatchObject({ open: true, text: expect.any(String) });
  });
});
