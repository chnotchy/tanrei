// The behaviour a navigation bar and a navigation rail share: their destinations are the same cell
// (src/primitives/destination.tsx), specified twice with different ids (NVB-…, NVR-…). Each component's test file calls
// `describeDestinations` with ITS ids, written out literally there, so that every test name cites the component's own
// behaviour id. Not a test file itself.
import type { ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { textStyle, viewStyle, withComponent } from '../../testing/harness';
import { iconFamily } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import type { Destination } from '../../primitives/destination';
import { acme } from './__fixtures__/acme';

type Key = 'navigationBar' | 'navigationRail';
type StateTokens = { itemContainerColor: TanreiPaint; itemIconColor: TanreiPaint; itemLabelColor: TanreiPaint; itemStateLayerColor: TanreiPaint };
type Conditions = Record<'unselected' | 'selected', Record<InteractionState, StateTokens>>;

export interface DestinationIds {
  activate: string;
  disabled: string;
  selectedParts: string;
  states: string;
  focusRing: string;
  hitArea: string;
  disabledTokens: string;
  pressHold: string;
  feedback: string;
  smoothing: string;
  itemContainer: string;
  labelVisibility: string;
  icon: string;
  selectionMotion: string;
  badge: string;
  semantics: string;
  emptyLabel: string;
  textSize: string;
  duplicates: string;
}

export interface DestinationSuite {
  /** `NavigationBar` or `NavigationRail`. */
  component: string;
  key: Key;
  ids: DestinationIds;
  /** The label's line limit: the bar 1, the rail 2. */
  labelLines: number;
  /** Renders the component with testID `nav` under the provider. */
  element: (props: { destinations: readonly Destination[]; value?: string; labelVisibility?: string; onValueChange?: (value: string) => void; onReselect?: (value: string) => void }) => ReactElement;
}

export const ID = 'nav';
export const FOUR: Destination[] = [
  { value: 'inbox', label: 'Inbox', icon: 'inbox' },
  { value: 'sent', label: 'Sent', icon: 'send' },
  { value: 'starred', label: 'Starred', icon: 'star' },
  { value: 'settings', label: 'Settings', icon: 'settings' },
];
export const cell = (i: number) => screen.getByTestId(`${ID}.destination.${i}`, { includeHiddenElements: true });
export const part = (i: number, name: string) => screen.queryByTestId(`${ID}.destination.${i}.${name}`, { includeHiddenElements: true });
export const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const fillColor = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
export const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
export const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};
export const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
/**
 * A test that reads a value part-way through a timed thing (the press hold, the selection motion) runs on Jest's clock,
 * not the machine's: on a loaded machine real time between the trigger and the read can outrun the motion. The clock
 * fakes timers, `requestAnimationFrame` (a timer in the preset) and `Date` (what `Animated.timing` and the press hold
 * measure with); promises still settle. `run` restores real timers.
 */
async function onJestClock(run: (advance: (ms: number) => Promise<void>) => Promise<void>): Promise<void> {
  jest.useFakeTimers({ doNotFake: ['queueMicrotask', 'nextTick', 'setImmediate'] });
  try {
    await run((ms) =>
      act(async () => {
        jest.advanceTimersByTime(ms);
      }),
    );
  } finally {
    jest.useRealTimers();
  }
}
const HOLD = tanrei.motion.duration.pressHold;
const ACTIVE = ['hovered', 'focused', 'pressed'] as const;

export function describeDestinations({ component, key, ids, labelLines, element }: DestinationSuite): void {
  const tokensOf = (system: TanreiSystem = tanrei) => system.components[key];
  const conditionsOf = (system: TanreiSystem = tanrei) => tokensOf(system).conditions as unknown as Conditions;
  const withTokens = (overrides: Record<string, unknown>, base: TanreiSystem = tanrei) => withComponent(base, key, overrides as never);
  const mount = (props: Partial<Parameters<DestinationSuite['element']>[0]> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) =>
    render(<TanreiProvider {...provider}>{element({ destinations: FOUR, value: 'inbox', ...props })}</TanreiProvider>);
  const release = async (i: number) => {
    await fireEvent(cell(i), 'pressOut');
    await wait(HOLD + 30);
  };
  const enter = async (i: number, target: InteractionState) => {
    if (target === 'hovered') await fireEvent(cell(i), 'hoverIn');
    if (target === 'focused') await fireEvent(cell(i), 'focus');
    if (target === 'pressed') await fireEvent(cell(i), 'pressIn');
  };
  /** Item container fill, icon, label and opacity from one condition in one state. */
  const expectDrawnFrom = (i: number, selected: boolean, in_: InteractionState, system: TanreiSystem = tanrei, scheme: TanreiScheme = 'light') => {
    const tokens = tokensOf(system);
    const paints = conditionsOf(system)[selected ? 'selected' : 'unselected'][in_];
    const fill = part(i, 'fill');
    expect(fill ? viewStyle(fill).backgroundColor : undefined).toBe(fillColor(paints.itemContainerColor, scheme, system));
    expect(textStyle(part(i, 'icon.glyph')!).color).toBe(painted(paints.itemIconColor, scheme, system));
    if (part(i, 'label')) expect(textStyle(part(i, 'label')!).color).toBe(painted(paints.itemLabelColor, scheme, system));
    const opacity = { enabled: 1, hovered: tokens.hoveredOpacity, focused: tokens.focusedOpacity, pressed: tokens.pressedOpacity, disabled: tokens.disabledOpacity }[in_];
    expect(viewStyle(cell(i)).opacity).toBe(opacity);
  };

  describe(`${component}: activation (${ids.activate}, ${ids.disabled})`, () => {
    test(`${ids.activate}: activating a destination that is not selected — by touch, or a bare click (Enter, Space) — emits change once with its value; the selected one emits reselect once`, async () => {
      const onValueChange = jest.fn();
      const onReselect = jest.fn();
      await mount({ onValueChange, onReselect });
      await fireEvent.press(cell(1));
      await fireEvent(cell(2), 'press', { nativeEvent: { target: 1 } });
      await fireEvent.press(cell(0));
      expect(onValueChange.mock.calls).toEqual([['sent'], ['starred']]);
      expect(onReselect.mock.calls).toEqual([['inbox']]);
      await release(0);
    });

    test(`${ids.disabled}: a disabled destination emits neither, is not focusable and is exposed as disabled`, async () => {
      const onValueChange = jest.fn();
      const onReselect = jest.fn();
      await mount({ destinations: FOUR.map((each, i) => (i === 2 ? { ...each, disabled: true } : each)), onValueChange, onReselect });
      await fireEvent.press(cell(2));
      expect(onValueChange).not.toHaveBeenCalled();
      expect(onReselect).not.toHaveBeenCalled();
      expect(cell(2).props).toMatchObject({ focusable: false, accessibilityState: { disabled: true, selected: false } });
      expect(cell(1).props.focusable).toBe(true);
    });
  });

  describe(`${component}: looks and states (${ids.selectedParts} … ${ids.smoothing})`, () => {
    test.each(['light', 'dark'] as const)(`${ids.selectedParts}: the selected destination is drawn from the selected parts, every other from the unselected parts (%s)`, async (theme) => {
      await mount({}, { theme });
      expectDrawnFrom(0, true, 'enabled', tanrei, theme);
      expectDrawnFrom(1, false, 'enabled', tanrei, theme);
      expect(part(1, 'fill')).toBeNull();
    });

    test(`${ids.selectedParts}: a value no destination has selects none, and development builds report it; release builds are silent`, async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const view = await mount({ value: 'archive' });
      for (const i of [0, 1, 2, 3]) {
        expectDrawnFrom(i, false, 'enabled');
        expect(cell(i).props.accessibilityState.selected).toBe(false);
      }
      expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('has the value "archive", which no destination has')]);
      await view.unmount();
      warn.mockClear();
      development(false);
      await mount({ value: 'archive' });
      expect(warn).not.toHaveBeenCalled();
    });

    test(`${ids.selectedParts}: the values drive the drawing — a system that re-values the selected parts`, async () => {
      const conditions = conditionsOf();
      const selected = Object.fromEntries(Object.entries(conditions.selected).map(([state, paints]) => [state, { ...paints, itemContainerColor: literal(1, 2, 3), itemIconColor: literal(4, 5, 6), itemLabelColor: literal(7, 8, 9) }]));
      const system = withTokens({ conditions: { ...conditions, selected } });
      await mount({}, { theme: 'light', system });
      expect(viewStyle(part(0, 'fill')!).backgroundColor).toBe('rgb(1, 2, 3)');
      expect(textStyle(part(0, 'icon.glyph')!).color).toBe('rgb(4, 5, 6)');
      expect(textStyle(part(0, 'label')!).color).toBe('rgb(7, 8, 9)');
    });

    describe.each([
      ['unselected', 1, false],
      ['selected', 0, true],
    ] as const)(`${ids.states}: a %s destination`, (_name, i, selected) => {
      test.each(ACTIVE)('%s: item container, icon, label and opacity come from that state\'s tokens of its condition, and it returns to rest', async (target) => {
        await mount();
        await enter(i, target);
        expectDrawnFrom(i, selected, target);
        if (target === 'hovered') await fireEvent(cell(i), 'hoverOut');
        if (target === 'focused') await fireEvent(cell(i), 'blur');
        if (target === 'pressed') await release(i);
        expectDrawnFrom(i, selected, 'enabled');
      });
    });

    test(`${ids.states}: precedence is pressed over focused over hovered, under the acme fixture system; focus that comes with a press does not select focused`, async () => {
      const unselected = conditionsOf(acme).unselected;
      const expected = (name: InteractionState) => fillColor(unselected[name].itemContainerColor, 'light', acme);
      expect(new Set((['hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(3);
      await mount({}, { theme: 'light', system: acme });
      const background = () => (part(1, 'fill') ? viewStyle(part(1, 'fill')!).backgroundColor : undefined);
      await fireEvent(cell(1), 'hoverIn');
      expect(background()).toBe(expected('hovered'));
      await fireEvent(cell(1), 'focus');
      expect(background()).toBe(expected('focused'));
      await fireEvent(cell(1), 'pressIn');
      expect(background()).toBe(expected('pressed'));
      await release(1);
      expect(background()).toBe(expected('focused'));
      await fireEvent(cell(1), 'blur');
      await fireEvent(cell(1), 'hoverOut');
      await fireEvent(cell(2), 'pressIn');
      await fireEvent(cell(2), 'focus');
      await release(2);
      expect(part(2, 'fill')).toBeNull();
    });

    test(`${ids.states}: in the default system a state mixes the condition's state-layer color (its icon color) into the item container`, async () => {
      const conditions = conditionsOf();
      for (const condition of ['unselected', 'selected'] as const) expect(conditions[condition].enabled.itemStateLayerColor).toEqual(conditions[condition].enabled.itemIconColor);
      await mount();
      await fireEvent(cell(0), 'focus');
      const resting = conditions.selected.enabled;
      expect(viewStyle(part(0, 'fill')!).backgroundColor).toBe(painted({ kind: 'mix', base: resting.itemContainerColor, with: resting.itemStateLayerColor, amount: tanrei.state.focusStateLayerOpacity }));
    });

    test(`${ids.focusRing}: keyboard focus shows the focus ring around the item container, without animation; focus that comes with a press does not`, async () => {
      const tokens = tokensOf();
      await mount();
      await fireEvent(cell(1), 'focus');
      const ring = part(1, 'focus-ring')!;
      expect(part(1, 'container')!.children).toContain(ring);
      expect(viewStyle(ring)).toMatchObject({ position: 'absolute', borderWidth: tanrei.measure.focus.outerWidth });
      expect(viewStyle(part(1, 'container')!).borderRadius).toBe(tokens.itemContainerShape);
      await fireEvent(cell(1), 'blur');
      await fireEvent(cell(2), 'pressIn');
      await fireEvent(cell(2), 'focus');
      expect(part(2, 'focus-ring')).toBeNull();
      await release(2);
    });

    test(`${ids.hitArea}: the whole cell is the hit area — the pressable — at least sys.target.touch high, with no hit slop over its neighbours; a press anywhere in it answers on the item container`, async () => {
      await mount();
      expect(viewStyle(cell(1))).toMatchObject({ minHeight: tanrei.measure.target.touch });
      expect(cell(1).props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
      await fireEvent(cell(1), 'pressIn');
      expectDrawnFrom(1, false, 'pressed');
      await release(1);
    });

    test(`${ids.disabledTokens}: a disabled destination is drawn from its condition's disabled tokens — selected, it keeps its indicator`, async () => {
      const destinations = FOUR.map((each, i) => (i < 2 ? { ...each, disabled: true } : each));
      await mount({ destinations });
      expectDrawnFrom(0, true, 'disabled');
      expect(part(0, 'fill')).not.toBeNull();
      expectDrawnFrom(1, false, 'disabled');
      await fireEvent(cell(1), 'hoverIn');
      expectDrawnFrom(1, false, 'disabled');
    });

    test(`${ids.pressHold}: the pressed state appears at once and stays visible for duration.pressHold; a bare click shows it too`, () =>
      onJestClock(async (advance) => {
        await mount();
        await fireEvent(cell(1), 'pressIn');
        expectDrawnFrom(1, false, 'pressed');
        await fireEvent(cell(1), 'pressOut');
        await advance(HOLD - 1);
        expectDrawnFrom(1, false, 'pressed');
        await advance(1);
        expectDrawnFrom(1, false, 'enabled');
        await fireEvent(cell(2), 'press', { nativeEvent: { target: 1 } });
        expectDrawnFrom(2, false, 'pressed');
        await advance(HOLD);
        expectDrawnFrom(2, false, 'enabled');
      }));

    test(`${ids.feedback}: overlay (the default) — the pressed tokens on the whole item container at once; ripple (m3-like) — the pressed color grows in the item container from the point of contact (from its centre for a press on the label) while it keeps the state under the press`, async () => {
      reduceMotion(false);
      const view = await mount();
      await fireEvent(cell(1), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
      expect(part(1, 'ripple')).toBeNull();
      await release(1);
      await view.unmount();

      const tokens = tokensOf(m3Like);
      const pressed = conditionsOf(m3Like).unselected.pressed;
      const timing = jest.spyOn(Animated, 'timing');
      // The item container is 20 across and 30 down the page.
      jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, tokens.itemContainerWidth, tokens.itemContainerHeight, 20, 30));
      await mount({}, { theme: 'light', system: m3Like });
      timing.mockClear();
      await fireEvent(cell(1), 'pressIn', { nativeEvent: { pageX: 30, pageY: 40 } });
      const reach = Math.hypot(tokens.itemContainerWidth - 10, tokens.itemContainerHeight - 10);
      expect(viewStyle(part(1, 'ripple.wave')!)).toMatchObject({ left: 10 - reach, top: 10 - reach, backgroundColor: painted(pressed.itemContainerColor, 'light', m3Like) });
      expect(part(1, 'container')!.children).toContain(part(1, 'ripple'));
      expect(part(1, 'fill')).toBeNull();
      expect(textStyle(part(1, 'icon.glyph')!).color).toBe(painted(pressed.itemIconColor, 'light', m3Like));
      expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: tokens.motionFeedbackDuration, useNativeDriver: true });
      await release(1);
      await wait(tokens.motionStateDuration * 2 + 50);
      expect(part(1, 'ripple')).toBeNull();
      // On the label, below the item container: from the container's centre.
      await fireEvent(cell(2), 'pressIn', { nativeEvent: { pageX: 30, pageY: 30 + tokens.itemContainerHeight + 10 } });
      expect(viewStyle(part(2, 'ripple.wave')!)).toMatchObject({ left: tokens.itemContainerWidth / 2 - Math.hypot(tokens.itemContainerWidth / 2, tokens.itemContainerHeight / 2), top: tokens.itemContainerHeight / 2 - Math.hypot(tokens.itemContainerWidth / 2, tokens.itemContainerHeight / 2) });
      await release(2);
      await wait(tokens.motionStateDuration * 2 + 50);
    });

    test(`${ids.feedback}: dim (cupertino) — the pressed opacity on the whole destination and no state layer; none — no answer at all, and the activation still happens`, async () => {
      const tokens = tokensOf(cupertino);
      const view = await mount({}, { theme: 'light', system: cupertino });
      await fireEvent(cell(1), 'pressIn');
      expect(viewStyle(cell(1)).opacity).toBe(tokens.pressedOpacity);
      expect(tokens.pressedOpacity).toBeLessThan(1);
      expect(part(1, 'fill')).toBeNull();
      await release(1);
      await view.unmount();

      const onValueChange = jest.fn();
      const conditions = conditionsOf();
      const system = withBehavior({ pressedFeedback: 'none' }, withTokens({ pressedOpacity: 0.5, conditions: { ...conditions, unselected: { ...conditions.unselected, pressed: { ...conditions.unselected.pressed, itemContainerColor: literal(1, 2, 3) } } } }));
      await mount({ onValueChange }, { theme: 'light', system });
      await fireEvent(cell(1), 'pressIn');
      expectDrawnFrom(1, false, 'enabled', system);
      await fireEvent.press(cell(1));
      expect(onValueChange).toHaveBeenCalledWith('sent');
      await release(1);
    });

    test(`${ids.smoothing}: the item container eases its corners by the smoothing (cupertino: continuous) — the fill and the focus ring; glow (acme) is one halo`, async () => {
      const view = await mount();
      expect(viewStyle(part(0, 'fill')!).borderCurve).toBeUndefined();
      await view.unmount();
      // cupertino has no indicator; its hover or focus fill would be the one drawn, so a layer gives the selected one a fill.
      const conditions = conditionsOf(cupertino);
      const selected = Object.fromEntries(Object.entries(conditions.selected).map(([state, paints]) => [state, { ...paints, itemContainerColor: literal(1, 2, 3) }]));
      const second = await mount({}, { theme: 'light', system: withTokens({ conditions: { ...conditions, selected } }, cupertino) });
      await fireEvent(cell(0), 'focus');
      expect(viewStyle(part(0, 'fill')!).borderCurve).toBe('continuous');
      expect(viewStyle(part(0, 'container')!).borderCurve).toBe('continuous');
      expect(viewStyle(part(0, 'focus-ring')!).borderCurve).toBe('continuous');
      await second.unmount();
      await mount({}, { theme: 'light', system: acme });
      await fireEvent(cell(0), 'focus');
      expect(viewStyle(part(0, 'focus-ring')!).boxShadow).toHaveLength(1);
    });
  });

  describe(`${component}: the destination (${ids.itemContainer} … ${ids.badge})`, () => {
    test(`${ids.itemContainer}: an item container item.container.width × item.container.height with item.container.shape corners, the icon centred in it; the label item.gap below, centred, in item.label.typescale, at most ${labelLines} line(s), truncated at the end; the container and label centred as a group`, async () => {
      const tokens = tokensOf();
      await mount();
      expect(viewStyle(part(1, 'container')!)).toMatchObject({ width: tokens.itemContainerWidth, height: tokens.itemContainerHeight, borderRadius: tokens.itemContainerShape, alignItems: 'center', justifyContent: 'center' });
      expect(viewStyle(part(1, 'label-slot')!).paddingTop).toBe(tokens.itemGap);
      const label = part(1, 'label')!;
      expect(textStyle(label)).toMatchObject({ ...createTanreiTheme(tanrei, 'light').text(tokens.itemLabelTypescale), textAlign: 'center' });
      expect(label.props.numberOfLines).toBe(labelLines);
      expect(viewStyle(cell(1))).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
      expect(viewStyle(part(1, 'group')!).alignItems).toBe('center');
    });

    test(`${ids.itemContainer}: the item tokens drive the drawing`, async () => {
      await mount({}, { theme: 'light', system: withTokens({ itemContainerWidth: 70, itemContainerHeight: 40, itemContainerShape: 20, itemGap: 9 }) });
      expect(viewStyle(part(0, 'container')!)).toMatchObject({ width: 70, height: 40, borderRadius: 20 });
      expect(viewStyle(part(0, 'fill')!).borderRadius).toBe(20);
      expect(viewStyle(part(0, 'label-slot')!).paddingTop).toBe(9);
    });

    test(`${ids.labelVisibility}: always — every label; selected — only the selected one's; never — none; each label stays the destination's accessible name`, async () => {
      const view = await mount({ labelVisibility: 'always' });
      expect([0, 1, 2, 3].map((i) => part(i, 'label') !== null)).toEqual([true, true, true, true]);
      await view.rerender(<TanreiProvider theme="light">{element({ destinations: FOUR, value: 'sent', labelVisibility: 'selected' })}</TanreiProvider>);
      await wait(0);
      expect([0, 1, 2, 3].map((i) => part(i, 'label') !== null)).toEqual([false, true, false, false]);
      await view.rerender(<TanreiProvider theme="light">{element({ destinations: FOUR, value: 'sent', labelVisibility: 'never' })}</TanreiProvider>);
      expect([0, 1, 2, 3].map((i) => part(i, 'label') !== null)).toEqual([false, false, false, false]);
      expect([0, 1, 2, 3].map((i) => cell(i).props.accessibilityLabel)).toEqual(['Inbox', 'Sent', 'Starred', 'Settings']);
    });

    test(`${ids.labelVisibility}: an unknown labelVisibility renders as always, and development builds report it`, async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount({ labelVisibility: 'hover' });
      expect(part(2, 'label')).not.toBeNull();
      expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('labelVisibility "hover" is not defined; using "always"')]);
    });

    test(`${ids.icon}: each icon at item.icon.size in the family and fill of its condition (acme: a family per selection state)`, async () => {
      const tokens = tokensOf(acme);
      await mount({}, { theme: 'light', system: acme });
      expect(viewStyle(part(0, 'icon')!)).toMatchObject({ width: tokens.itemIconSize, height: tokens.itemIconSize });
      expect(textStyle(part(0, 'icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, true).families[0]);
      expect(textStyle(part(1, 'icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, false).families[0]);
      expect(iconFamily(acme.icon, true).families[0]).not.toBe(iconFamily(acme.icon, false).families[0]);
      expect(part(0, 'icon')!.props.accessibilityElementsHidden).toBe(true);
    });

    test(`${ids.selectionMotion}: WHEN the selection changes the new indicator grows from the centre of its item container (scaleX from 0), the previous fades, and colors move, over item selection motion; labels that follow the selection appear and disappear over it; at once where motion is reduced`, async () => {
      reduceMotion(false);
      const tokens = tokensOf();
      const timing = jest.spyOn(Animated, 'timing');
      const bezier = jest.spyOn(Easing, 'bezier');
      await onJestClock(async (advance) => {
        const view = await mount({ labelVisibility: 'selected' });
        await advance(10);
        timing.mockClear();
        await view.rerender(<TanreiProvider theme="light">{element({ destinations: FOUR, value: 'sent', labelVisibility: 'selected' })}</TanreiProvider>);
        const selection = timing.mock.calls.filter(([, config]) => config.duration === tokens.motionSelectionDuration);
        // The grow (JS-driven, with the fill's color), the two label slots, and the two destinations' colors.
        expect(selection.length).toBeGreaterThanOrEqual(5);
        expect(bezier).toHaveBeenCalledWith(...tokens.motionSelectionEasing);
        const scaleX = () => (viewStyle(part(1, 'fill')!).transform as { scaleX: number }[] | undefined)?.[0]?.scaleX;
        expect(viewStyle(part(1, 'fill')!).transform).toEqual([{ scaleX: 0 }]);
        expect(part(0, 'label-slot')).not.toBeNull();
        expect(viewStyle(part(1, 'label-slot')!)).toMatchObject({ overflow: 'hidden', paddingTop: tokens.itemGap });
        // Half-way through the selection motion: the new indicator part-grown, the previous one and its label still there, fading.
        const resting = conditionsOf().selected.enabled.itemContainerColor;
        const previousAtStart = viewStyle(part(0, 'fill')!).backgroundColor;
        // (A color in motion is written rgba(…).)
        const opaque = (color: unknown) => String(color).replace(/^rgb\((.*)\)$/, 'rgba($1, 1)');
        expect(opaque(previousAtStart)).toBe(opaque(fillColor(resting)));
        await advance(tokens.motionSelectionDuration / 2);
        expect(scaleX()).toBeGreaterThan(0);
        expect(scaleX()).toBeLessThan(1);
        expect(part(0, 'fill')).not.toBeNull();
        expect(viewStyle(part(0, 'fill')!).backgroundColor).not.toBe(previousAtStart);
        expect(part(0, 'label')).not.toBeNull();
        // Over the selection motion, and not later: settled once its duration has passed.
        await advance(tokens.motionSelectionDuration / 2 + 20);
        expect(viewStyle(part(1, 'fill')!).transform).toBeUndefined();
        expect(part(0, 'label')).toBeNull();
        expect(part(0, 'fill')).toBeNull();
        await view.unmount();
      });

      reduceMotion(true);
      timing.mockClear();
      const reduced = await mount({ labelVisibility: 'selected' });
      await reduced.rerender(<TanreiProvider theme="light">{element({ destinations: FOUR, value: 'sent', labelVisibility: 'selected' })}</TanreiProvider>);
      expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionSelectionDuration)).toHaveLength(0);
      expect(viewStyle(part(1, 'fill')!).transform).toBeUndefined();
      expect(part(0, 'label')).toBeNull();
      expect(part(1, 'label')).not.toBeNull();
    });

    test(`${ids.selectionMotion}: the new indicator grows in width only (spec change 6c8a6cf) — scaleX from 0 about the item container's centre to 1 over the selection motion, at its full height throughout (no vertical scale, the fill spans the container's top to bottom)`, async () => {
      reduceMotion(false);
      const tokens = tokensOf();
      const timing = jest.spyOn(Animated, 'timing');
      await onJestClock(async (advance) => {
        const view = await mount();
        await advance(10);
        timing.mockClear();
        await view.rerender(<TanreiProvider theme="light">{element({ destinations: FOUR, value: 'sent' })}</TanreiProvider>);
        // Where it starts: no width at all.
        expect(viewStyle(part(1, 'fill')!).transform).toEqual([{ scaleX: 0 }]);
        await advance(tokens.motionSelectionDuration / 2);
        const fill = viewStyle(part(1, 'fill')!);
        // Only a horizontal scale; no scaleY, no uniform scale, no moved origin (the centre is the default).
        expect(fill.transform).toHaveLength(1);
        expect(Object.keys((fill.transform as object[])[0]!)).toEqual(['scaleX']);
        // Mid-growth: between 0 (where it started) and 1 (the full width).
        const scaleX = (fill.transform as { scaleX: number }[])[0]!.scaleX;
        expect(scaleX).toBeGreaterThan(0);
        expect(scaleX).toBeLessThan(1);
        expect(fill).not.toHaveProperty('transformOrigin');
        expect(fill).toMatchObject({ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 });
        expect(fill).not.toHaveProperty('height');
        const grow = timing.mock.calls.find(([, config]) => config.duration === tokens.motionSelectionDuration && config.toValue === 1 && (config as { useNativeDriver?: boolean }).useNativeDriver === false);
        expect(grow).toBeDefined();
        await advance(tokens.motionSelectionDuration / 2 + 20);
        expect(viewStyle(part(1, 'fill')!).transform).toBeUndefined();
      });
    });

    test(`${ids.badge}: a Tanrei badge on the icon — the count, or the dot — kept while disabled; its description (badgeLabel, else the count shown) joins the destination's after its position`, async () => {
      const destinations: Destination[] = [
        { value: 'inbox', label: 'Inbox', icon: 'inbox', badge: { count: 3, label: '3 unread' } },
        { value: 'chat', label: 'Chat', icon: 'chat', badge: { label: 'New' } },
        { value: 'starred', label: 'Starred', icon: 'star', badge: { count: 1200 }, disabled: true },
        { value: 'settings', label: 'Settings', icon: 'settings', badge: { count: 0 } },
      ];
      await mount({ destinations });
      expect(part(0, 'badge.container')).not.toBeNull();
      expect(part(1, 'badge.dot')).not.toBeNull();
      expect(part(2, 'badge.container')).not.toBeNull();
      expect(part(3, 'badge.container')).toBeNull();
      expect(part(0, 'container')!.children).toContain(part(0, 'badge'));
      expect(viewStyle(part(0, 'badge')!).alignSelf).toBe('center');
      expect([0, 1, 2, 3].map((i) => cell(i).props.accessibilityValue.text)).toEqual(['1 of 4, 3 unread', '2 of 4, New', '3 of 4, 999+', '4 of 4']);
    });
  });

  describe(`${component}: accessibility (${ids.semantics}, ${ids.emptyLabel}, ${ids.textSize}, ${ids.duplicates})`, () => {
    test(`${ids.semantics}: a tab bar — the tablist role named by the component's label; each destination ONE element, the tab role, named by its label, with its selected state and its position; its icon hidden`, async () => {
      await mount();
      const list = screen.getByTestId(ID);
      expect(list.props).toMatchObject({ role: 'tablist', accessibilityLabel: 'Main' });
      expect(cell(0).props).toMatchObject({ role: 'tab', accessibilityLabel: 'Inbox', accessibilityState: { selected: true, disabled: false }, accessibilityValue: { text: '1 of 4' } });
      expect(cell(3).props.accessibilityValue).toEqual({ text: '4 of 4' });
      expect(part(0, 'icon')!.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' });
      expect(screen.getAllByRole('tab')).toHaveLength(4);
    });

    test(`${ids.emptyLabel}: a destination without a label still renders, and development builds report it; release builds are silent`, async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const view = await mount({ destinations: FOUR.map((each, i) => (i === 1 ? { ...each, label: ' ' } : each)) });
      expect(cell(1)).toBeTruthy();
      expect(warn.mock.calls.map(([message]) => String(message))).toContainEqual(expect.stringContaining('destination 2 of a'));
      await view.unmount();
      warn.mockClear();
      resetLookupReports();
      development(false);
      await mount({ destinations: FOUR.map((each, i) => (i === 1 ? { ...each, label: '' } : each)) });
      expect(warn).not.toHaveBeenCalled();
    });

    test(`${ids.textSize}: enlarged text grows the labels (they scale) and never the item containers or icons (a glyph does not scale); heights are minimums`, async () => {
      await mount();
      expect(part(1, 'label')!.props.allowFontScaling).toBe(true);
      expect(part(1, 'icon.glyph')!.props.allowFontScaling).toBe(false);
      expect(viewStyle(part(1, 'container')!)).toMatchObject({ width: tokensOf().itemContainerWidth, height: tokensOf().itemContainerHeight });
      expect(viewStyle(cell(1))).not.toHaveProperty('height');
    });

    test(`${ids.duplicates}: two destinations with one value — the first is the one the value selects, and development builds report it`, async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount({ destinations: [FOUR[0]!, FOUR[1]!, { ...FOUR[2]!, value: 'sent' }, FOUR[3]!], value: 'sent' });
      expect(cell(1).props.accessibilityState.selected).toBe(true);
      expect(cell(2).props.accessibilityState.selected).toBe(false);
      expect(warn.mock.calls.map(([message]) => String(message))).toContainEqual(expect.stringContaining('destination 3 of a'));
    });
  });
}
