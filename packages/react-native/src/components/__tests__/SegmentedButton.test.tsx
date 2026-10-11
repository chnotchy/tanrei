// SegmentedButton — behaviour, accessibility, keyboard, layout, motion, token binding and fixture baselines.
// Cases come from specs/segmented-button.spec.json; every behaviour id is cited by the test that covers it.
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreSegmentedButtonCondition, TanreiPaint, TanreiScheme, TanreiSegmentedButtonConditionStateTokens, TanreiSegmentedButtonTokens, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resolveElevation } from '../../theme/elevation';
import { iconFamily } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { SegmentedButton, type Segment, type SegmentedButtonProps } from '../SegmentedButton';
import { acme } from './__fixtures__/acme';
import { segmentedButtonSubject } from './SegmentedButton.subject';

const spec = loadSpec('segmented-button');
const { measure } = tanrei;
const tokens: TanreiSegmentedButtonTokens = tanrei.components.segmentedButton;
const medium = tokens.sizes.medium;
const ID = 'seg';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const withSegmented = (overrides: Partial<TanreiSegmentedButtonTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'segmentedButton', overrides);
const withCondition = (condition: TanreiCoreSegmentedButtonCondition, overrides: { [State in InteractionState]?: Partial<TanreiSegmentedButtonConditionStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.segmentedButton.conditions[condition];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withSegmented({ conditions: { ...base.components.segmentedButton.conditions, [condition]: { ...current, ...changed } } }, base);
};
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};

const THREE: Segment[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];
const ICONS: Segment[] = [
  { value: 'list', label: 'List', icon: 'view_list' },
  { value: 'grid', label: 'Grid', icon: 'grid_view' },
  { value: 'map', label: 'Map', icon: 'map' },
];
const ICON_ONLY: Segment[] = ICONS.map((each) => ({ ...each, labelHidden: true }));
const WITH_DISABLED: Segment[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week', disabled: true },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

type LooseProps = Partial<Omit<SegmentedButtonProps, 'selectionMode'>> & { selectionMode?: string; value?: string | null; values?: readonly string[]; onSelectionChange?: (selection: never) => void };

function mount(props: LooseProps = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <SegmentedButton {...({ testID: ID, items: THREE, accessibilityLabel: 'Range', ...props } as SegmentedButtonProps)} />
    </TanreiProvider>,
  );
}

/** A product that keeps the selection: moves it from onSelectionChange. */
function Controlled({ items = THREE, initial = null, multiple = false, initialValues = [], onSelectionChange, ...props }: LooseProps & { initial?: string | null; multiple?: boolean; initialValues?: string[] }) {
  const [value, setValue] = useState<string | null>(initial);
  const [values, setValues] = useState<string[]>(initialValues);
  const common = { testID: ID, items, accessibilityLabel: 'Range', ...props };
  return multiple ? (
    <SegmentedButton
      {...(common as object)}
      items={items}
      selectionMode="multiple"
      values={values}
      onSelectionChange={(next) => {
        setValues(next);
        (onSelectionChange as ((selection: string[]) => void) | undefined)?.(next);
      }}
    />
  ) : (
    <SegmentedButton
      {...(common as object)}
      items={items}
      value={value}
      onSelectionChange={(next) => {
        setValue(next);
        (onSelectionChange as ((selection: string) => void) | undefined)?.(next);
      }}
    />
  );
}
const mountControlled = (props: Parameters<typeof Controlled>[0] = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) =>
  render(
    <TanreiProvider {...provider}>
      <Controlled {...props} />
    </TanreiProvider>,
  );

const set = () => screen.getByTestId(ID);
const seg = (i: number) => screen.getByTestId(`${ID}.segment.${i}`, { includeHiddenElements: true });
const part = (i: number, name: string) => screen.queryByTestId(`${ID}.segment.${i}.${name}`, { includeHiddenElements: true });
const setPart = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const key = (name: string) => fireEvent(set(), 'keyDown', { nativeEvent: { key: name } });
const click = (i: number) => fireEvent(seg(i), 'press', { nativeEvent: { target: 1 } });
const focusSpy = () => jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
const focusedSegment = (spy: jest.SpyInstance) => (spy.mock.contexts.at(-1) as { props?: { testID?: string } } | undefined)?.props?.testID;
const layoutLabel = (i: number, width: number) => fireEvent(part(i, 'label')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } } });
const checked = () => [0, 1, 2].map((i) => seg(i).props.accessibilityState.checked);

/** The reports of the SegmentedButton itself (the icon helper's fill report is IconButton's to test). */
const reportsOf = (warn: jest.SpyInstance) => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('SegmentedButton'));

const HOLD = tanrei.motion.duration.pressHold;
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
async function release(i: number) {
  await fireEvent(seg(i), 'pressOut');
  await wait(HOLD + 30);
}
async function enter(i: number, target: InteractionState) {
  if (target === 'hovered') await fireEvent(seg(i), 'hoverIn');
  if (target === 'focused') await fireEvent(seg(i), 'focus');
  if (target === 'pressed') await fireEvent(seg(i), 'pressIn');
}

const ACTIVE = ['hovered', 'focused', 'pressed'] as const;
const opacityOf = (from: TanreiSegmentedButtonTokens, in_: InteractionState) => ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity })[in_];

/** Everything SEG-4 / SEG-7 / SEG-12 name — container, label, icon or check, elevation and opacity — from one state's tokens of one condition. */
function expectSegmentDrawnFrom(i: number, condition: TanreiCoreSegmentedButtonCondition, in_: InteractionState, { system = tanrei, scheme = 'light' }: { system?: TanreiSystem; scheme?: TanreiScheme } = {}) {
  const from = system.components.segmentedButton;
  const state = from.conditions[condition][in_];
  const style = viewStyle(seg(i));
  expect(style.backgroundColor).toBe(fill(state.containerColor, scheme, system));
  expect(style.opacity).toBe(opacityOf(from, in_));
  const theme = createTanreiTheme(system, scheme);
  expect(style.boxShadow).toEqual(theme.elevation(state.containerElevation).boxShadow.length ? theme.elevation(state.containerElevation).boxShadow : undefined);
  if (part(i, 'label')) expect(textStyle(part(i, 'label')!).color).toBe(painted(state.labelColor, scheme, system));
  if (part(i, 'icon')) expect(textStyle(part(i, 'icon.glyph')!).color).toBe(painted(state.iconColor, scheme, system));
  if (part(i, 'check')) expect(textStyle(part(i, 'check.glyph')!).color).toBe(painted(state.iconColor, scheme, system));
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
  test('the React Native mapping in the spec matches this implementation: SegmentedButton and its item kind Segment', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(SegmentedButton.name);
    expect(platform.props).toEqual({ selection: 'selectionMode', value: 'value', values: 'values', size: 'size', label: 'accessibilityLabel' });
    expect(platform.events).toEqual({ change: 'onSelectionChange' });
    expect(platform.items?.segment?.name).toBe('Segment');
    expect(platform.items?.segment?.props).toEqual({ value: 'value', label: 'label', icon: 'icon', labelHidden: 'labelHidden', disabled: 'disabled' });
  });

  test('the size is the token axis (small, medium — the default — large); defaults follow the spec: single, nothing selected', async () => {
    expect(Object.keys(tokens.sizes)).toEqual(['small', 'medium', 'large']);
    expect(spec.props.find((p) => p.name === 'size')?.default).toBe('medium');
    expect(spec.props.find((p) => p.name === 'selection')?.default).toBe('single');
    await render(<SegmentedButton testID={ID} items={THREE} accessibilityLabel="Range" />);
    expect(set().props.role).toBe('radiogroup');
    expect(checked()).toEqual([false, false, false]);
    expect(viewStyle(set()).minHeight).toBe(medium.containerHeight);
  });

  test('an unknown selectionMode renders as single and development builds report it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ selectionMode: 'several', value: 'week' });
    expect(set().props.role).toBe('radiogroup');
    expect(checked()).toEqual([false, true, false]);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('SegmentedButton selectionMode "several" is not defined; using "single"')]);
  });
});

describe('selection (SEG-1, SEG-2, SEG-3, SEG-12)', () => {
  test('SEG-1: activating an enabled segment that is not the value — by touch, or a bare click (Enter, Space) — emits change once with its value; the selected segment changes nothing and emits nothing', async () => {
    const onSelectionChange = jest.fn();
    await mount({ value: 'week', onSelectionChange });
    await fireEvent.press(seg(0));
    await wait(HOLD + 30);
    await click(2);
    await wait(HOLD + 30);
    await fireEvent.press(seg(1));
    await click(1);
    expect(onSelectionChange.mock.calls).toEqual([['day'], ['month']]);
  });

  test('SEG-1: controlled — the set moves to the new value only when the product sets it; the old segment becomes unselected', async () => {
    const view = await mount({ value: 'week' });
    await fireEvent.press(seg(0));
    expect(checked()).toEqual([false, true, false]);
    await view.rerender(
      <TanreiProvider theme="light">
        <SegmentedButton testID={ID} items={THREE} accessibilityLabel="Range" value="day" />
      </TanreiProvider>,
    );
    expect(checked()).toEqual([true, false, false]);
    expectSegmentDrawnFrom(0, 'selected', 'enabled');
    expectSegmentDrawnFrom(1, 'unselected', 'enabled');
  });

  test('SEG-2: multiple — activation adds the value, or removes it when values holds it, and emits the new values once; values may become empty', async () => {
    const onSelectionChange = jest.fn();
    await mountControlled({ multiple: true, initialValues: ['day'], onSelectionChange });
    await fireEvent.press(seg(2));
    await wait(HOLD + 30);
    await click(0);
    await wait(HOLD + 30);
    await fireEvent.press(seg(2));
    expect(onSelectionChange.mock.calls).toEqual([[['day', 'month']], [['month']], [[]]]);
    expect([0, 1, 2].map((i) => seg(i).props.accessibilityState.selected)).toEqual([false, false, false]);
  });

  test('SEG-3: a disabled segment is not selected or cleared by a press, never the tab stop, and exposes disabled', async () => {
    const onSelectionChange = jest.fn();
    const view = await mount({ items: WITH_DISABLED, value: 'week', onSelectionChange });
    await fireEvent.press(seg(1));
    await click(1);
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(seg(1)).toBeDisabled();
    expect(seg(1).props.accessibilityState).toMatchObject({ disabled: true, checked: true });
    expect(seg(1).props.focusable).toBe(false);
    // The selected segment is disabled: the tab stop is the first enabled one.
    expect([0, 1, 2, 3].map((i) => seg(i).props.focusable)).toEqual([true, false, false, false]);
    await view.unmount();
    await mount({ selectionMode: 'multiple', items: WITH_DISABLED, values: ['week'], onSelectionChange });
    await fireEvent.press(seg(1));
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  test('SEG-12: a selected segment is drawn from the selected condition, every other one from the unselected condition (single and multiple)', async () => {
    const view = await mount({ value: 'month' });
    expectSegmentDrawnFrom(2, 'selected', 'enabled');
    expectSegmentDrawnFrom(0, 'unselected', 'enabled');
    await view.unmount();
    await mount({ selectionMode: 'multiple', values: ['day', 'week'] });
    expectSegmentDrawnFrom(0, 'selected', 'enabled');
    expectSegmentDrawnFrom(1, 'selected', 'enabled');
    expectSegmentDrawnFrom(2, 'unselected', 'enabled');
  });

  test('SEG-12: a value, or an entry of values, that names no segment selects nothing and is reported in development builds; release builds are silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ value: 'missing' });
    expect(checked()).toEqual([false, false, false]);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('has the value "missing", which no segment has')]);
    await view.unmount();
    warn.mockClear();
    const multiple = await mount({ selectionMode: 'multiple', values: ['day', 'nope'] });
    expect([0, 1, 2].map((i) => seg(i).props.accessibilityState.selected)).toEqual([true, false, false]);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('has the value "nope", which no segment has')]);
    await multiple.unmount();
    warn.mockClear();
    development(false);
    await mount({ value: 'missing' });
    expect(warn).not.toHaveBeenCalled();
  });

  test('SEG-12: a segment with an empty value or one that repeats another still renders; the first segment with the value is the one it selects; each is reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ items: [{ value: 'a', label: 'One' }, { value: '', label: 'Two' }, { value: 'a', label: 'Three' }], value: 'a' });
    expect(checked()).toEqual([true, false, false]);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('segment 2 of a SegmentedButton (testID "seg") has no value'), expect.stringContaining('segment 3 of a SegmentedButton (testID "seg") repeats the value "a" of segment 1')]);
  });
});

describe('states (SEG-4 … SEG-11, SEG-23, SEG-24)', () => {
  describe.each([
    ['unselected', 0],
    ['selected', 1],
  ] as const)('SEG-4: a %s segment', (condition, i) => {
    test.each(ACTIVE)('%s: container, label, check, elevation and opacity come from that state\'s tokens of its condition, and it returns to rest', async (target) => {
      await mount({ value: 'week' });
      expectSegmentDrawnFrom(i, condition, 'enabled');
      await enter(i, target);
      expectSegmentDrawnFrom(i, condition, target);
      if (target === 'hovered') await fireEvent(seg(i), 'hoverOut');
      if (target === 'focused') await fireEvent(seg(i), 'blur');
      if (target === 'pressed') await release(i);
      expectSegmentDrawnFrom(i, condition, 'enabled');
    });
  });

  test('SEG-4: precedence is pressed over focused over hovered, under the acme fixture system; focus that comes with a press does not select focused', async () => {
    const unselected = acme.components.segmentedButton.conditions.unselected;
    const expected = (name: InteractionState) => fill(unselected[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    await mount({ value: 'week' }, { theme: 'light', system: acme });
    const background = () => viewStyle(seg(0)).backgroundColor;
    await fireEvent(seg(0), 'hoverIn');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(seg(0), 'focus');
    expect(background()).toBe(expected('focused'));
    await fireEvent(seg(0), 'pressIn');
    expect(background()).toBe(expected('pressed'));
    await release(0);
    expect(background()).toBe(expected('focused'));
    await fireEvent(seg(0), 'blur');
    await fireEvent(seg(0), 'hoverOut');
    await fireEvent(seg(2), 'pressIn');
    await fireEvent(seg(2), 'focus');
    await release(2);
    expect(viewStyle(seg(2)).backgroundColor).toBe(expected('enabled'));
  });

  test('SEG-4: in the default system a state mixes the condition\'s state-layer color (its label color) into the segment', async () => {
    for (const condition of ['unselected', 'selected'] as const) {
      const resting = tokens.conditions[condition].enabled;
      expect(resting.stateLayerColor).toEqual(resting.labelColor);
    }
    await mount({ value: 'week' });
    await fireEvent(seg(1), 'focus');
    const resting = tokens.conditions.selected.enabled;
    expect(viewStyle(seg(1)).backgroundColor).toBe(painted({ kind: 'mix', base: resting.containerColor, with: resting.stateLayerColor, amount: tanrei.state.focusStateLayerOpacity }));
  });

  test('SEG-5: keyboard focus shows the focus ring INSIDE the segment — clear of the outline drawn over the set\'s edge, following the segment\'s corners — without animation; focus that comes with a press does not', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ value: 'week' });
    await wait(10);
    timing.mockClear();
    await fireEvent(seg(0), 'focus');
    // Inside the segment: the ring's outer edge lies the outline's overlap in from the segment's edge.
    const edge = Math.max(0, tokens.outlineWidth - tokens.setPadding);
    expect(edge).toBeGreaterThan(0);
    const outer = tokens.setShape - tokens.setPadding;
    expect(viewStyle(part(0, 'focus-ring')!)).toEqual({
      position: 'absolute',
      top: edge,
      right: edge,
      bottom: edge,
      left: edge,
      borderWidth: measure.focus.outerWidth,
      borderColor: role('focusRing'),
      borderTopStartRadius: outer - edge,
      borderBottomStartRadius: outer - edge,
      borderTopEndRadius: 0,
      borderBottomEndRadius: 0,
      pointerEvents: 'none',
    });
    expect(timing.mock.calls.every(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
    await wait(tokens.motionStateDuration * 2);
    await fireEvent(seg(2), 'pressIn');
    await fireEvent(seg(2), 'focus');
    expect(part(2, 'focus-ring')).toBeNull();
    await release(2);
    await wait(tokens.motionStateDuration * 2);
  });

  test('SEG-6: each segment is at least sys.target.touch wide, and its hit area extends above and below to the target — never sideways over its neighbours', async () => {
    await mount({ value: 'week', size: 'small' });
    const height = tokens.sizes.small.containerHeight - 2 * tokens.setPadding;
    const vertical = Math.ceil((measure.target.touch - height) / 2);
    for (const i of [0, 1, 2]) {
      expect(viewStyle(seg(i)).minWidth).toBe(measure.target.touch);
      expect(seg(i).props.hitSlop).toEqual({ top: vertical, bottom: vertical, left: 0, right: 0 });
    }
    await fireEvent(seg(0), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 40 } } });
    expect(seg(0).props.hitSlop).toEqual({ top: 4, bottom: 4, left: 0, right: 0 });
  });

  test('SEG-7: a disabled segment is drawn from the disabled tokens of its condition — unselected: no fill; selected: a faint fill — and the outline and dividers keep their colors', async () => {
    const view = await mount({ items: WITH_DISABLED, value: 'day' });
    expectSegmentDrawnFrom(1, 'unselected', 'disabled');
    expect(viewStyle(seg(1)).backgroundColor).toBeUndefined();
    const outline = viewStyle(setPart('outline')!).borderColor;
    const dividers = [0, 1, 2].map((i) => viewStyle(setPart(`divider.${i}`)!).backgroundColor);
    expect(outline).toBe(painted(tokens.outlineColor));
    expect(dividers).toEqual([0, 1, 2].map(() => painted(tokens.dividerColor)));
    await view.rerender(
      <TanreiProvider theme="light">
        <SegmentedButton testID={ID} items={WITH_DISABLED} accessibilityLabel="Range" value="week" />
      </TanreiProvider>,
    );
    expectSegmentDrawnFrom(1, 'selected', 'disabled');
    expect(viewStyle(seg(1)).backgroundColor).toBe(painted(tokens.conditions.selected.disabled.containerColor));
    expect(viewStyle(setPart('outline')!).borderColor).toBe(outline);
    expect([0, 1, 2].map((i) => viewStyle(setPart(`divider.${i}`)!).backgroundColor)).toEqual(dividers);
  });

  test('SEG-8: an unknown size renders as medium, and development builds report it once; a release build is silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const expected = await mount({ value: 'week' });
    const json = JSON.stringify(expected.toJSON());
    await expected.unmount();
    const view = await mount({ value: 'week', size: 'huge' as never });
    expect(JSON.stringify(view.toJSON())).toBe(json);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('has no SegmentedButton size "huge"; using "medium"')]);
    await view.unmount();
    warn.mockClear();
    resetLookupReports();
    development(false);
    await mount({ value: 'week', size: 'tiny' as never });
    expect(warn).not.toHaveBeenCalled();
  });

  test('SEG-9: the pressed state appears at once and stays visible for duration.pressHold; a bare click shows it too', async () => {
    await mount({ value: 'week' });
    await fireEvent(seg(0), 'pressIn');
    expectSegmentDrawnFrom(0, 'unselected', 'pressed');
    await fireEvent(seg(0), 'pressOut');
    await wait(HOLD / 2);
    expectSegmentDrawnFrom(0, 'unselected', 'pressed');
    await wait(HOLD / 2 + 30);
    expectSegmentDrawnFrom(0, 'unselected', 'enabled');
    await click(2);
    expectSegmentDrawnFrom(2, 'unselected', 'pressed');
    await wait(HOLD + 30);
    expectSegmentDrawnFrom(2, 'unselected', 'enabled');
  });

  test('SEG-10 overlay (the default) and ripple (m3-like): the pressed tokens at once / the pressed color grows from the point of contact, clipped to the segment\'s corners, while the segment keeps the state under the press', async () => {
    reduceMotion(false);
    const view = await mount({ value: 'week' });
    await fireEvent(seg(0), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 36 } } });
    await fireEvent(seg(0), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(part(0, 'ripple')).toBeNull();
    expect(viewStyle(seg(0)).backgroundColor).toBe(fill(tokens.conditions.unselected.pressed.containerColor));
    await release(0);
    await wait(tokens.motionStateDuration * 2);
    await view.unmount();

    const m3 = m3Like.components.segmentedButton;
    const timing = jest.spyOn(Animated, 'timing');
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 100, 40, 0, 0));
    await mount({ value: 'week' }, { theme: 'light', system: m3Like });
    await fireEvent(seg(0), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 40 } } });
    timing.mockClear();
    await fireEvent(seg(0), 'pressIn', { nativeEvent: { pageX: 30, pageY: 20 } });
    const reach = Math.hypot(100 - 30, 40 - 20);
    expect(viewStyle(part(0, 'ripple.wave')!)).toMatchObject({ left: 30 - reach, top: 20 - reach, backgroundColor: painted(m3.conditions.unselected.pressed.containerColor, 'light', m3Like) });
    // The first segment's outer corners are the set's (full, less its padding); its inner ones square.
    expect(viewStyle(part(0, 'ripple')!)).toMatchObject({ borderTopStartRadius: m3.setShape - m3.setPadding, borderTopEndRadius: m3.containerShape, overflow: 'hidden' });
    expect(viewStyle(seg(0)).backgroundColor).toBe(fill(m3.conditions.unselected.enabled.containerColor, 'light', m3Like));
    expect(textStyle(part(0, 'label')!).color).toBe(painted(m3.conditions.unselected.pressed.labelColor, 'light', m3Like));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: m3.motionFeedbackDuration, useNativeDriver: true });
    await release(0);
    await wait(m3.motionStateDuration * 2 + 50);
    expect(part(0, 'ripple')).toBeNull();
  });

  test('SEG-10 dim (cupertino): the pressed opacity on the whole segment and no state layer; none: no answer at all, the selection still happens', async () => {
    const cup = cupertino.components.segmentedButton;
    const view = await mount({ value: 'week' }, { theme: 'light', system: cupertino });
    await fireEvent(seg(0), 'pressIn');
    expect(cup.pressedOpacity).toBeLessThan(1);
    expect(viewStyle(seg(0))).toMatchObject({ opacity: cup.pressedOpacity });
    expect(viewStyle(seg(0)).backgroundColor).toBe(fill(cup.conditions.unselected.enabled.containerColor, 'light', cupertino));
    await release(0);
    await view.unmount();

    const onSelectionChange = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withCondition('unselected', { pressed: { containerColor: literal(1, 2, 3), labelColor: literal(4, 5, 6) } }, withSegmented({ pressedOpacity: 0.5 })));
    await mount({ value: 'week', onSelectionChange }, { theme: 'light', system });
    await fireEvent(seg(0), 'pressIn');
    expectSegmentDrawnFrom(0, 'unselected', 'enabled', { system });
    await fireEvent.press(seg(0));
    expect(onSelectionChange).toHaveBeenCalledWith('day');
    await release(0);
  });

  test('SEG-11: a segment eases its corners by the smoothing (cupertino: continuous) — the segment and its focus ring; glow (acme) is one halo following the segment\'s corners', async () => {
    const view = await mount({ value: 'week' });
    expect(viewStyle(seg(0)).borderCurve).toBeUndefined();
    await view.unmount();
    const second = await mount({ value: 'week' }, { theme: 'light', system: cupertino });
    await fireEvent(seg(0), 'focus');
    expect(viewStyle(seg(0)).borderCurve).toBe('continuous');
    expect(viewStyle(set()).borderCurve).toBe('continuous');
    expect(viewStyle(part(0, 'focus-ring')!).borderCurve).toBe('continuous');
    await second.unmount();
    await mount({ value: 'week' }, { theme: 'light', system: acme });
    await fireEvent(seg(0), 'focus');
    const glow = viewStyle(part(0, 'focus-ring')!);
    expect(glow.boxShadow).toHaveLength(1);
    expect(glow.borderTopEndRadius).toBe(0);
  });

  test('SEG-23: a state change animates over comp.segmented-button.motion.state-*, a press is immediate; reduced motion lands at once', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const system = withSegmented({ motionStateDuration: 123, motionSelectionDuration: 321 });
    const view = await mount({ value: 'week' }, { theme: 'light', system });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    await wait(10);
    timing.mockClear();
    await fireEvent(seg(0), 'hoverIn');
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: 123, useNativeDriver: false });
    await fireEvent(seg(0), 'hoverOut');
    await wait(300);
    timing.mockClear();
    await fireEvent(seg(2), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    await release(2);
    await wait(300);
    await view.unmount();
    reduceMotion(true);
    timing.mockClear();
    await mount({ value: 'week' });
    await fireEvent(seg(0), 'hoverIn');
    expect(timing).not.toHaveBeenCalled();
    expectSegmentDrawnFrom(0, 'unselected', 'hovered');
  });

  test('SEG-24: a raised selected segment (cupertino: level1) casts its elevation outside the segment and above its neighbours; the set clips nothing; the default raises none', async () => {
    const view = await mount({ value: 'week' });
    expect(tokens.conditions.selected.enabled.containerElevation).toBe('level0');
    expect(viewStyle(seg(1)).boxShadow).toBeUndefined();
    expect(viewStyle(seg(1)).zIndex).toBeUndefined();
    await view.unmount();
    const cup = cupertino.components.segmentedButton;
    expect(cup.conditions.selected.enabled.containerElevation).toBe('level1');
    await mount({ value: 'week' }, { theme: 'light', system: cupertino });
    const expected = resolveElevation(cupertino.elevation.level1, (name) => role(name, 'light', cupertino));
    expect(viewStyle(seg(1))).toMatchObject({ boxShadow: expected.boxShadow, zIndex: 1 });
    expect(viewStyle(seg(0)).zIndex).toBeUndefined();
    expect(viewStyle(set()).overflow).toBeUndefined();
    expect(viewStyle(seg(1)).overflow).toBeUndefined();
  });
});

describe('keyboard (SEG-18, SEG-19)', () => {
  test('SEG-18: single — one tab stop, the selected segment; Right / Down Arrow move to the next ENABLED segment and Left / Up Arrow to the previous one, wrapping, and select it; Home and End go to the ends', async () => {
    const focus = focusSpy();
    const onSelectionChange = jest.fn();
    await mountControlled({ items: WITH_DISABLED, initial: 'day', onSelectionChange });
    expect([0, 1, 2, 3].map((i) => seg(i).props.focusable)).toEqual([true, false, false, false]);
    await key('ArrowRight');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.2`);
    expect(onSelectionChange).toHaveBeenLastCalledWith('month');
    expect([0, 1, 2, 3].map((i) => seg(i).props.focusable)).toEqual([false, false, true, false]);
    await key('ArrowDown');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.3`);
    await key('ArrowDown');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.0`);
    await key('ArrowUp');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.3`);
    await key('ArrowLeft');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.2`);
    await key('Home');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.0`);
    await key('End');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.3`);
    expect(onSelectionChange.mock.calls.map(([value]) => value)).toEqual(['month', 'year', 'day', 'year', 'month', 'day', 'year']);
    // Printable characters are not the set's keys.
    onSelectionChange.mockClear();
    await key('d');
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  test('SEG-18: nothing selected — the first enabled segment is the tab stop; in a right-to-left layout Left Arrow moves to the next segment and Right Arrow to the previous', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    const focus = focusSpy();
    await mountControlled({ items: WITH_DISABLED.slice(1), initial: null });
    expect([0, 1, 2].map((i) => seg(i).props.focusable)).toEqual([false, true, false]);
    await key('ArrowLeft');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.2`);
    expect(seg(2).props.accessibilityState.checked).toBe(true);
    await key('ArrowRight');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.1`);
  });

  test('SEG-19: multiple — one tab stop (the first selected segment, else the first enabled one, then the last focused); arrows move without changing the selection; Enter or Space switch the focused segment', async () => {
    const focus = focusSpy();
    const onSelectionChange = jest.fn();
    await mountControlled({ multiple: true, items: WITH_DISABLED, initialValues: ['month'], onSelectionChange });
    expect(set().props.role).toBe('group');
    expect([0, 1, 2, 3].map((i) => seg(i).props.focusable)).toEqual([false, false, true, false]);
    await key('ArrowRight');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.3`);
    await key('ArrowRight');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.0`);
    await key('ArrowLeft');
    await key('ArrowUp');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.2`);
    await key('End');
    expect(focusedSegment(focus)).toBe(`${ID}.segment.3`);
    expect(onSelectionChange).not.toHaveBeenCalled();
    // The last focused segment is the tab stop.
    expect([0, 1, 2, 3].map((i) => seg(i).props.focusable)).toEqual([false, false, false, true]);
    await click(3);
    expect(onSelectionChange).toHaveBeenLastCalledWith(['month', 'year']);
    await wait(HOLD + 30);
    await fireEvent(seg(0), 'focus');
    expect([0, 1, 2, 3].map((i) => seg(i).props.focusable)).toEqual([true, false, false, false]);
  });

  test('SEG-19: multiple with nothing selected — the first enabled segment is the tab stop', async () => {
    await mount({ selectionMode: 'multiple', items: WITH_DISABLED.slice(1), values: [] });
    expect([0, 1, 2].map((i) => seg(i).props.focusable)).toEqual([false, true, false]);
  });
});

describe('accessibility (SEG-20, SEG-22)', () => {
  test('SEG-20: single — a radio group named by label; each segment a radio named by its label (drawn or not), with its checked state and its position; icons, the check, dividers and the outline hidden', async () => {
    await mount({ value: 'grid', items: ICON_ONLY, accessibilityLabel: 'View' });
    expect(set().props).toMatchObject({ role: 'radiogroup', accessibilityLabel: 'View' });
    expect([0, 1, 2].map((i) => seg(i).props.accessibilityRole)).toEqual(['radio', 'radio', 'radio']);
    expect([0, 1, 2].map((i) => seg(i).props.accessibilityLabel)).toEqual(['List', 'Grid', 'Map']);
    expect(checked()).toEqual([false, true, false]);
    expect(seg(1).props.accessibilityValue).toEqual({ text: '2 of 3' });
    expect(part(1, 'icon')!.props.accessibilityElementsHidden).toBe(true);
    expect(setPart('divider.0')!.props.accessibilityElementsHidden).toBe(true);
    expect(setPart('outline')!.props.importantForAccessibility).toBe('no');
    expect(screen.getByRole('radio', { name: 'Grid', checked: true })).toBe(seg(1));
  });

  test('SEG-20: iOS has no radio trait — a single-choice segment also carries the selected state there; Android hears checked alone', async () => {
    jest.replaceProperty(ReactNative.Platform, 'OS', 'ios');
    const view = await mount({ value: 'week' });
    expect(seg(1).props.accessibilityState).toEqual({ disabled: false, checked: true, selected: true });
    expect(seg(0).props.accessibilityState).toEqual({ disabled: false, checked: false, selected: false });
    await view.unmount();
    jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    await mount({ value: 'week' });
    expect(seg(1).props.accessibilityState).toEqual({ disabled: false, checked: true });
  });

  test('SEG-20: multiple — a group named by label; each segment a toggle button with its selected (pressed) state and its position; the check is hidden', async () => {
    await mount({ selectionMode: 'multiple', values: ['day', 'month'], accessibilityLabel: 'Days', positionText: (position, count) => `${count} 件中 ${position} 件目` });
    expect(set().props).toMatchObject({ role: 'group', accessibilityLabel: 'Days' });
    expect([0, 1, 2].map((i) => seg(i).props.accessibilityRole)).toEqual(['button', 'button', 'button']);
    expect([0, 1, 2].map((i) => seg(i).props.accessibilityState)).toEqual([
      { disabled: false, selected: true },
      { disabled: false, selected: false },
      { disabled: false, selected: true },
    ]);
    expect(seg(2).props.accessibilityValue).toEqual({ text: '3 件中 3 件目' });
    expect(part(0, 'check')!.props.accessibilityElementsHidden).toBe(true);
  });

  test('SEG-22: a segment without a label, labelHidden without an icon, a set without a label, and a set of fewer than two or more than five segments still render and are reported in development builds; release builds say nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ items: [{ value: 'a', label: '' }, { value: 'b', label: 'Beta', labelHidden: true }], accessibilityLabel: '' });
    expect(seg(0)).toBeTruthy();
    expect(textStyle(part(1, 'label')!)).toBeTruthy();
    expect(part(1, 'label')!.props.children).toBe('Beta');
    expect(reportsOf(warn)).toEqual([
      expect.stringContaining('a SegmentedButton (testID "seg") has no accessibilityLabel'),
      expect.stringContaining('segment 1 of a SegmentedButton (testID "seg") has no label'),
      expect.stringContaining('segment 2 of a SegmentedButton (testID "seg") hides its label but has no icon'),
    ]);
    await view.unmount();
    warn.mockClear();
    const one = await mount({ items: [{ value: 'a', label: 'Alpha' }] });
    const six = Array.from({ length: 6 }, (_, i) => ({ value: `v${i}`, label: `L${i}` }));
    await one.rerender(
      <TanreiProvider theme="light">
        <SegmentedButton testID={ID} items={six} accessibilityLabel="Range" />
      </TanreiProvider>,
    );
    expect(reportsOf(warn)).toEqual([expect.stringContaining('holds 1 segments; a set holds two to five'), expect.stringContaining('holds 6 segments; a set holds two to five')]);
    await one.unmount();
    warn.mockClear();
    development(false);
    await mount({ items: [{ value: 'a', label: '' }], accessibilityLabel: '' });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('layout (SEG-13 … SEG-17, SEG-21)', () => {
  test('SEG-13: one row in a set at least the size\'s height, filled with set.color, its corners set.shape, the segments set.padding in, and the outline inside its edge, drawn over the segments', async () => {
    const system = withSegmented({ setColor: literal(9, 9, 9), setPadding: 3, setShape: 12, outlineWidth: 2, outlineColor: literal(1, 2, 3) });
    await mount({ value: 'week' }, { theme: 'light', system });
    expect(viewStyle(set())).toMatchObject({ flexDirection: 'row', alignItems: 'stretch', alignSelf: 'flex-start', minHeight: medium.containerHeight, padding: 3, borderRadius: 12, backgroundColor: formatColor(literal(9, 9, 9) as never) });
    const outline = setPart('outline')!;
    expect(viewStyle(outline)).toMatchObject({ position: 'absolute', top: 0, left: 0, borderWidth: 2, borderRadius: 12, borderColor: formatColor(literal(1, 2, 3) as never) });
    expect(set().children.at(-1)).toBe(outline);
  });

  test('SEG-13: the end segments\' outer corners are the set\'s less set.padding (concentric); every other corner is comp.segmented-button.container.shape; the default set draws no fill of its own', async () => {
    const view = await mount({ value: 'week' });
    expect(viewStyle(set()).backgroundColor).toBeUndefined();
    const outer = tokens.setShape - tokens.setPadding;
    expect(viewStyle(seg(0))).toMatchObject({ borderTopStartRadius: outer, borderBottomStartRadius: outer, borderTopEndRadius: tokens.containerShape, borderBottomEndRadius: tokens.containerShape });
    expect(viewStyle(seg(1))).toMatchObject({ borderTopStartRadius: tokens.containerShape, borderTopEndRadius: tokens.containerShape });
    expect(viewStyle(seg(2))).toMatchObject({ borderTopStartRadius: tokens.containerShape, borderTopEndRadius: outer, borderBottomEndRadius: outer });
    await view.unmount();
    const cup = cupertino.components.segmentedButton;
    await mount({ value: 'week' }, { theme: 'light', system: cupertino });
    expect(viewStyle(seg(0)).borderTopStartRadius).toBe(cup.setShape - cup.setPadding);
    expect(viewStyle(seg(1)).borderTopStartRadius).toBe(cup.containerShape);
    expect(viewStyle(set())).toMatchObject({ padding: cup.setPadding, backgroundColor: role('surfaceContainerHigh', 'light', cupertino) });
    // Cupertino has no border: its track is its boundary.
    expect(setPart('outline')).toBeNull();
  });

  test('SEG-14: until the labels are measured each segment lies at its natural width; then every segment takes the same basis — the widest content measured as if selected (the check, the gap, the label) plus the padding on each side — growing and shrinking equally', async () => {
    await mount({ value: 'week' });
    for (const i of [0, 1, 2]) expect(viewStyle(seg(i))).toMatchObject({ flexShrink: 0, paddingStart: medium.containerPaddingInline, paddingEnd: medium.containerPaddingInline });
    await layoutLabel(0, 30);
    await layoutLabel(1, 38);
    expect(viewStyle(seg(0)).flexBasis).toBeUndefined();
    await layoutLabel(2, 44);
    // "Month" is the widest; it is not selected, but its width is measured as if it were: with the check.
    const basis = medium.checkSize + medium.containerGap + 44 + 2 * medium.containerPaddingInline;
    for (const i of [0, 1, 2]) expect(viewStyle(seg(i))).toMatchObject({ flexGrow: 1, flexShrink: 1, flexBasis: basis });
    // Once known, a label is not measured again: its layout no longer moves the width.
    expect(part(1, 'label')!.props.onLayout).toBeUndefined();
    // The labels wrap rather than truncate.
    expect(part(2, 'label')!.props.numberOfLines).toBeUndefined();
    expect(textStyle(part(2, 'label')!).flexShrink).toBe(1);
  });

  test('SEG-14: icon-only segments are as wide as the icon plus the padding, and never narrower than the target; a new label is measured again', async () => {
    const view = await mount({ value: 'grid', items: ICON_ONLY });
    const basis = Math.max(measure.target.touch, medium.iconSize + 2 * medium.containerPaddingInline);
    expect(viewStyle(seg(0)).flexBasis).toBe(basis);
    await view.rerender(
      <TanreiProvider theme="light">
        <SegmentedButton testID={ID} items={THREE} accessibilityLabel="Range" value="week" />
      </TanreiProvider>,
    );
    for (const i of [0, 1, 2]) await layoutLabel(i, 10);
    expect(viewStyle(seg(0)).flexBasis).toBe(Math.max(measure.target.touch, medium.checkSize + medium.containerGap + 10 + 2 * medium.containerPaddingInline));
    await view.rerender(
      <TanreiProvider theme="light">
        <SegmentedButton testID={ID} items={[THREE[0]!, THREE[1]!, { value: 'month', label: 'A much longer month' }]} accessibilityLabel="Range" value="week" />
      </TanreiProvider>,
    );
    expect(viewStyle(seg(0)).flexBasis).toBeUndefined();
    await layoutLabel(2, 150);
    expect(viewStyle(seg(0)).flexBasis).toBe(medium.checkSize + medium.containerGap + 150 + 2 * medium.containerPaddingInline);
  });

  test('SEG-14: where the check size is 0 (cupertino) the leading glyph measured is the icon, or nothing; padding-block keeps a wrapping label off the edges', async () => {
    const cup = cupertino.components.segmentedButton.sizes.medium;
    await mount({ value: 'week' }, { theme: 'light', system: cupertino });
    for (const i of [0, 1, 2]) await layoutLabel(i, 40);
    expect(viewStyle(seg(0))).toMatchObject({ flexBasis: 40 + 2 * cup.containerPaddingInline, paddingVertical: cup.containerPaddingBlock });
  });

  test('SEG-15: the content is centred, the leading glyph first; the label in the size\'s label style and the condition\'s label color; the icon at the icon size in the family of the segment\'s condition (acme: a family per state)', async () => {
    const view = await mount({ value: 'grid', items: ICON_ONLY }, { theme: 'light', system: acme });
    const size = acme.components.segmentedButton.sizes.medium.iconSize;
    expect(viewStyle(part(0, 'icon')!)).toMatchObject({ width: size, height: size });
    expect(textStyle(part(1, 'icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, true).families[0]);
    expect(textStyle(part(0, 'icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, false).families[0]);
    await view.unmount();
    await mount({ value: 'week', size: 'large' });
    expect(viewStyle(seg(0))).toMatchObject({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' });
    const expected = createTanreiTheme(tanrei, 'light').text(tokens.sizes.large.labelTypescale);
    expect(textStyle(part(1, 'label')!)).toMatchObject({ fontSize: expected.fontSize, lineHeight: expected.lineHeight, fontWeight: expected.fontWeight, textAlign: 'center' });
    expect(seg(1).children[0]).not.toBe(part(1, 'label'));
  });

  test('SEG-16: a selected segment with a label draws the check before it — in place of its icon — at the check size in the selected icon color; an icon-only segment keeps its icon and draws no check', async () => {
    const view = await mount({ value: 'grid', items: ICONS });
    expect(part(1, 'icon')).toBeNull();
    expect(part(1, 'check')).not.toBeNull();
    expect(viewStyle(part(1, 'check')!)).toMatchObject({ width: medium.checkSize, height: medium.checkSize });
    expect(textStyle(part(1, 'check.glyph')!)).toMatchObject({ color: painted(tokens.conditions.selected.enabled.iconColor), fontSize: medium.checkSize });
    expect(part(1, 'check.glyph')!.props.children).toBe('check');
    expect(part(0, 'check')).toBeNull();
    expect(part(0, 'icon')).not.toBeNull();
    await view.unmount();
    await mount({ value: 'grid', items: ICON_ONLY });
    expect(part(1, 'check')).toBeNull();
    expect(part(1, 'icon')).not.toBeNull();
  });

  test('SEG-16: WHILE the check size is 0 (cupertino) no check is drawn, no room is kept for it, and the icon stays', async () => {
    expect(Object.values(cupertino.components.segmentedButton.sizes).map((each) => each.checkSize)).toEqual([0, 0, 0]);
    const view = await mount({ value: 'week' }, { theme: 'light', system: cupertino });
    expect(part(1, 'check')).toBeNull();
    expect(seg(1).children).toEqual([part(1, 'label')]);
    await view.unmount();
    await mount({ value: 'grid', items: ICONS }, { theme: 'light', system: cupertino });
    expect(part(1, 'check')).toBeNull();
    expect(part(1, 'icon')).not.toBeNull();
  });

  test('SEG-16: WHEN a segment becomes selected the check grows in and the colors move over the selection motion; where motion is reduced both land at once', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const system = withSegmented({ motionSelectionDuration: 321 });
    const view = await mountControlled({ initial: 'week' }, { theme: 'light', system });
    await wait(10);
    timing.mockClear();
    await key('ArrowRight');
    expect(bezier).toHaveBeenCalledWith(...tokens.motionSelectionEasing);
    expect(timing.mock.calls.filter(([, config]) => config.duration === 321).length).toBeGreaterThanOrEqual(3);
    // The check of the newly selected segment widens from nothing while it moves.
    const checkBox = part(2, 'check')!.parent!;
    const growing = viewStyle(checkBox as Instance);
    expect(growing.overflow).toBe('hidden');
    expect(growing.width as number).toBeLessThan(medium.checkSize);
    expect(growing.opacity as number).toBeLessThan(1);
    await wait(321 * 2 + 150);
    expect(viewStyle(part(2, 'check')!).width).toBe(medium.checkSize);
    expect(viewStyle(part(2, 'check')!.parent as Instance)).toEqual({ marginEnd: medium.containerGap });
    expect(part(1, 'check')).toBeNull();
    await view.unmount();
    reduceMotion(true);
    timing.mockClear();
    await mountControlled({ initial: 'week' });
    await key('ArrowRight');
    expect(timing).not.toHaveBeenCalled();
    expect(part(2, 'check')).not.toBeNull();
    expectSegmentDrawnFrom(2, 'selected', 'enabled');
  });

  test('SEG-17: a divider of divider.width in divider.color between each two neighbours, full opacity whatever either segment\'s state or condition, hidden from assistive technology', async () => {
    await mount({ value: 'week' });
    const dividers = [0, 1].map((i) => setPart(`divider.${i}`)!);
    expect(setPart('divider.2')).toBeNull();
    for (const divider of dividers) expect(viewStyle(divider)).toEqual({ width: tokens.dividerWidth, backgroundColor: painted(tokens.dividerColor) });
    expect(set().children.map((child) => (child as Instance).props.testID)).toEqual([`${ID}.segment.0`, `${ID}.divider.0`, `${ID}.segment.1`, `${ID}.divider.1`, `${ID}.segment.2`, `${ID}.outline`]);
    await fireEvent(seg(1), 'hoverIn');
    await fireEvent(seg(0), 'pressIn');
    for (const divider of dividers) expect(viewStyle(divider)).toEqual({ width: tokens.dividerWidth, backgroundColor: painted(tokens.dividerColor) });
    await release(0);
  });

  test('SEG-21: right-to-left — the set is a flex row React Native mirrors, with logical paddings and corners; the check stays before the label; a ripple still grows from the point of contact', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    reduceMotion(false);
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 100, 40, 0, 0));
    await mount({ value: 'week' }, { theme: 'light', system: m3Like });
    expect(viewStyle(set()).flexDirection).toBe('row');
    const style = viewStyle(seg(0));
    expect(style).toMatchObject({ paddingStart: m3Like.components.segmentedButton.sizes.medium.containerPaddingInline, borderTopStartRadius: m3Like.components.segmentedButton.setShape });
    expect(style.paddingLeft).toBeUndefined();
    expect(style.borderTopLeftRadius).toBeUndefined();
    expect(seg(1).children.indexOf(part(1, 'check')!.parent as never)).toBeLessThan(seg(1).children.indexOf(part(1, 'label')!));
    await fireEvent(seg(0), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 40 } } });
    await fireEvent(seg(0), 'pressIn', { nativeEvent: { pageX: 80, pageY: 10 } });
    const reach = Math.hypot(80, 40 - 10);
    expect(viewStyle(part(0, 'ripple.wave')!)).toMatchObject({ left: 80 - reach, top: 10 - reach });
    await release(0);
    await wait(400);
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  describe.each(schemes)('$scheme', ({ provider, scheme }) => {
    test('both conditions resolve their parts from their paints in this scheme, at rest and hovered; the outline and dividers from their colors', async () => {
      await mount({ value: 'grid', items: ICONS }, provider);
      expect(viewStyle(setPart('outline')!).borderColor).toBe(painted(tokens.outlineColor, scheme));
      expect(viewStyle(setPart('divider.0')!).backgroundColor).toBe(painted(tokens.dividerColor, scheme));
      for (const [i, condition] of [[1, 'selected'], [0, 'unselected']] as const) {
        expectSegmentDrawnFrom(i, condition, 'enabled', { scheme });
        await fireEvent(seg(i), 'hoverIn');
        expectSegmentDrawnFrom(i, condition, 'hovered', { scheme });
        await fireEvent(seg(i), 'hoverOut');
      }
    });
  });

  test('the default values: heights 32 / 36 / 40, paddings 12 / 14 / 16, a 6 set corner, square inner corners, check and icons 16; unselected clear with an on-surface label, selected secondary-container', () => {
    expect(Object.values(tokens.sizes).map((each) => [each.containerHeight, each.containerPaddingInline, each.checkSize, each.iconSize])).toEqual([
      [32, 12, 16, 16],
      [36, 14, 16, 16],
      [40, 16, 16, 16],
    ]);
    expect(tokens).toMatchObject({ setShape: tanrei.shape.small, containerShape: 0, setPadding: 0, outlineWidth: 1, dividerWidth: 1 });
    expect(evaluatePaint(tokens.conditions.unselected.enabled.containerColor, tanrei.colors.light).a).toBe(0);
    expect(painted(tokens.conditions.unselected.enabled.labelColor)).toBe(role('onSurface'));
    expect(painted(tokens.conditions.selected.enabled.containerColor)).toBe(role('secondaryContainer'));
    // SEG-7's explicit token: a disabled unselected segment stays clear.
    expect(evaluatePaint(tokens.conditions.unselected.disabled.containerColor, tanrei.colors.light).a).toBe(0);
  });
});

describe('the system drives rendering', () => {
  test('heights, paddings, gap, icon and check sizes, divider and set values re-valued by a layer are drawn', async () => {
    const sizes = { ...tokens.sizes, medium: { ...medium, containerHeight: 50, containerPaddingInline: 20, containerPaddingBlock: 9, containerGap: 5, checkSize: 22, iconSize: 26 } };
    const system = withSegmented({ sizes, dividerWidth: 4, dividerColor: literal(1, 2, 3) });
    const view = await mount({ value: 'grid', items: ICONS }, { theme: 'light', system });
    expect(viewStyle(set()).minHeight).toBe(50);
    expect(viewStyle(seg(0))).toMatchObject({ paddingStart: 20, paddingVertical: 9 });
    expect(viewStyle(part(0, 'icon')!).width).toBe(26);
    expect(viewStyle(part(1, 'check')!).width).toBe(22);
    expect(viewStyle(part(1, 'check')!.parent as Instance).marginEnd).toBe(5);
    expect(viewStyle(setPart('divider.0')!)).toEqual({ width: 4, backgroundColor: formatColor(literal(1, 2, 3) as never) });
    await view.unmount();
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(segmentedButtonSubject);

  test('every fixture holds two to five segment items with a value and a label (SEG-14\'s verify)', () => {
    for (const fixture of spec.fixtures) {
      expect(fixture.items?.length).toBeGreaterThanOrEqual(2);
      expect(fixture.items?.length).toBeLessThanOrEqual(5);
      for (const item of fixture.items ?? []) expect(item).toMatchObject({ kind: 'segment', props: { value: expect.any(String), label: expect.any(String) } });
    }
  });
});
