// Slider — values, the press and the drag, keys and assistive actions, ranges, the origin, stop dots, states, motion,
// the value indicator, accessibility, token binding and fixture baselines. Cases come from specs/slider.spec.json; every
// behaviour id is cited by the test that covers it.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions } from 'react-native';
import * as ReactNative from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiPaint, TanreiScheme, TanreiSliderTokens, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, painted, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Slider, TOUCH_SLOP, formatSliderValue, sliderScale, type SliderProps } from '../Slider';
import { acme } from './__fixtures__/acme';
import { sliderSubject } from './Slider.subject';

const spec = loadSpec('slider');
const tokens: TanreiSliderTokens = tanrei.components.slider;
const standard = tokens.conditions.standard;
const small = tokens.sizes.small;
const ID = 'slider';

const withSlider = (overrides: Partial<TanreiSliderTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'slider', overrides);
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

function mount(props: Partial<SliderProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <Slider testID={ID} accessibilityLabel="Volume" {...props} />
    </TanreiProvider>,
  );
}

/** A product that keeps the values: moves them from onValueChange, and records every callback in order. */
function Controlled({ initial = 40, initialStart = 20, log, ...props }: Partial<SliderProps> & { initial?: number; initialStart?: number; log: string[] }) {
  const [value, setValue] = useState(initial);
  const [start, setStart] = useState(initialStart);
  return (
    <Slider
      testID={ID}
      accessibilityLabel="Volume"
      startAccessibilityLabel="Minimum"
      value={value}
      startValue={start}
      onValueChange={(next, nextStart) => {
        log.push(`input:${next}${nextStart === undefined ? '' : `/${nextStart}`}`);
        setValue(next);
        if (nextStart !== undefined) setStart(nextStart);
      }}
      onSlidingComplete={(next, nextStart) => log.push(`change:${next}${nextStart === undefined ? '' : `/${nextStart}`}`)}
      {...props}
    />
  );
}
const mountControlled = (props: Parameters<typeof Controlled>[0], provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) =>
  render(
    <TanreiProvider {...provider}>
      <Controlled {...props} />
    </TanreiProvider>,
  );

const host = () => screen.getByTestId(ID);
const handle = (which: 'end' | 'start' = 'end') => screen.getByTestId(which === 'start' ? `${ID}.handle.start` : `${ID}.handle`);
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const parts = (prefix: string) => screen.queryAllByTestId(new RegExp(`^${ID}\\.${prefix.replace(/\./g, '\\.')}`), { includeHiddenElements: true });
const reportsOf = (warn: jest.SpyInstance) => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('Slider'));

// The geometry of a 320-long small slider: the travel of a handle's center starts container.size / 2 + thickness / 2 in.
const LENGTH = 320;
const START = tokens.containerSize / 2 + small.trackThickness / 2;
const TRAVEL = LENGTH - tokens.containerSize - small.trackThickness;
const xOf = (fraction: number) => START + fraction * TRAVEL;
const layout = (length = LENGTH, vertical = false) => fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: vertical ? 32 : length, height: vertical ? length : 32 } } });
const touch = (x: number, y = 16, vertical = false) => ({ nativeEvent: { locationX: vertical ? y : x, locationY: vertical ? x : y, pageX: vertical ? y : x, pageY: vertical ? x : y, identifier: 1, changedTouches: [] as unknown[], touches: [] as unknown[] } });
const grant = (x: number, y = 16, vertical = false) => fireEvent(host(), 'responderGrant', touch(x, y, vertical));
const moveTo = (x: number, y = 16, vertical = false) => fireEvent(host(), 'responderMove', touch(x, y, vertical));
const release = (x: number, y = 16, vertical = false) => fireEvent(host(), 'responderRelease', touch(x, y, vertical));
const key = (name: string, which: 'end' | 'start' = 'end') => fireEvent(handle(which), 'keyDown', { nativeEvent: { key: name }, preventDefault: () => undefined });
const HOLD = tanrei.motion.duration.pressHold;
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => painted(paint, scheme, system);

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
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  development(true);
  jest.restoreAllMocks();
});

describe('Slider', () => {
  test('the spec is the one implemented here: behaviours SLD-1 … SLD-23 and the react-native mapping', () => {
    expect(spec.behavior.map((b) => b.id)).toEqual(Array.from({ length: 23 }, (_, i) => `SLD-${i + 1}`));
    const mapping = spec.platforms['react-native'];
    expect(mapping.name).toBe('Slider');
    expect(mapping.props).toMatchObject({ min: 'minimumValue', max: 'maximumValue', label: 'accessibilityLabel', startLabel: 'startAccessibilityLabel' });
    expect(mapping.events).toEqual({ input: 'onValueChange', change: 'onSlidingComplete' });
  });

  describe('values', () => {
    test('SLD-1: values stay between min and max; with a step they are min plus whole multiples of step not above max, the nearest; with step 0 anything between', () => {
      const discrete = sliderScale(0, 95, 10);
      expect([discrete.snap(-5), discrete.snap(34), discrete.snap(36), discrete.snap(94), discrete.snap(200)]).toEqual([0, 30, 40, 90, 90]);
      const offset = sliderScale(5, 30, 10);
      expect([offset.snap(9), offset.snap(11), offset.snap(30)]).toEqual([5, 15, 25]);
      const continuous = sliderScale(0, 1, 0);
      expect([continuous.snap(0.123), continuous.snap(-1), continuous.snap(2)]).toEqual([0.123, 0, 1]);
      // Floating-point noise does not leave a value off its step.
      expect(sliderScale(0, 1, 0.1).snap(0.3)).toBe(0.3);
    });

    test('SLD-1: a key on a discrete slider moves to the next allowed value; End stops at the highest value the step reaches', async () => {
      const log: string[] = [];
      await mountControlled({ initial: 30, step: 10, maximumValue: 95, log });
      await key('ArrowRight');
      await key('End');
      expect(log).toEqual(['input:40', 'change:40', 'input:90', 'change:90']);
    });
  });

  describe('SLD-2: press and drag', () => {
    test('SLD-2: a press that does not move moves the handle to the value under it when it ends: input once, then change once', async () => {
      const log: string[] = [];
      await mountControlled({ initial: 40, log });
      await layout();
      await grant(xOf(0.75));
      expect(log).toEqual([]);
      await release(xOf(0.75));
      expect(log).toEqual(['input:75', 'change:75']);
      expect(handle().props.accessibilityValue.now).toBe(75);
    });

    test('SLD-2: a drag along the track moves the handle once it has travelled the touch slop, following the press, with input for each change and change once after the last', async () => {
      const log: string[] = [];
      await mountControlled({ initial: 40, step: 10, log });
      await layout();
      await grant(xOf(0.4));
      await moveTo(xOf(0.4) + TOUCH_SLOP - 1);
      expect(log).toEqual([]);
      await moveTo(xOf(0.52));
      await moveTo(xOf(0.53));
      await moveTo(xOf(0.61));
      await moveTo(xOf(2));
      expect(log).toEqual(['input:50', 'input:60', 'input:100']);
      await release(xOf(2));
      expect(log).toEqual(['input:50', 'input:60', 'input:100', 'change:100']);
    });

    test('SLD-2: a drag that returns to where it started emits no change', async () => {
      const log: string[] = [];
      await mountControlled({ initial: 40, step: 10, log });
      await layout();
      await grant(xOf(0.4));
      await moveTo(xOf(0.6));
      await moveTo(xOf(0.4));
      await release(xOf(0.4));
      expect(log).toEqual(['input:60', 'input:40']);
    });

    test('SLD-2: a press that first travels across the track is left to an enclosing scroll view and changes nothing; before a drag the responder may be taken, during one it is kept', async () => {
      const log: string[] = [];
      await mountControlled({ initial: 40, log });
      await layout();
      await grant(xOf(0.4));
      expect(host().props.onResponderTerminationRequest()).toBe(true);
      await moveTo(xOf(0.4) + 2, 16 + TOUCH_SLOP + 2);
      await moveTo(xOf(0.9), 16 + TOUCH_SLOP + 2);
      await release(xOf(0.9));
      expect(log).toEqual([]);
      await grant(xOf(0.4));
      await moveTo(xOf(0.6));
      expect(host().props.onResponderTerminationRequest()).toBe(false);
      await fireEvent(host(), 'responderTerminate', touch(xOf(0.6)));
      expect(log).toEqual(['input:60', 'change:60']);
    });

    test('SLD-2: in a range the press moves the nearer handle; where the handles meet, the one that can move toward the press; each is clamped to the other', async () => {
      const log: string[] = [];
      await mountControlled({ range: true, initial: 60, initialStart: 20, log });
      await layout();
      await grant(xOf(0.3));
      await release(xOf(0.3));
      expect(log).toEqual(['input:60/30', 'change:60/30']);
      log.length = 0;
      await grant(xOf(0.3));
      await moveTo(xOf(0.9));
      await release(xOf(0.9));
      // The start handle stops at the end handle's value.
      expect(log).toEqual(['input:60/60', 'change:60/60']);
      log.length = 0;
      await grant(xOf(0.8));
      await release(xOf(0.8));
      expect(log).toEqual(['input:80/60', 'change:80/60']);
      log.length = 0;
      await grant(xOf(0.1));
      await release(xOf(0.1));
      expect(log).toEqual(['input:80/10', 'change:80/10']);
    });
  });

  describe('SLD-3: keyboard', () => {
    test('SLD-3: Right / Up Arrow add one keyboard step, Left / Down Arrow take one away, Page Up / Down ten, Home / End the lowest and highest; each change emits input then change', async () => {
      const log: string[] = [];
      await mountControlled({ initial: 40, log });
      for (const name of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']) await key(name);
      expect(log).toEqual(['input:41', 'change:41', 'input:42', 'change:42', 'input:41', 'change:41', 'input:40', 'change:40', 'input:50', 'change:50', 'input:40', 'change:40', 'input:0', 'change:0', 'input:100', 'change:100']);
    });

    test('SLD-3: the keyboard step is step, or a hundredth of max − min while step is 0; a key that changes nothing emits nothing', async () => {
      const log: string[] = [];
      const view = await mountControlled({ initial: 0.5, minimumValue: 0, maximumValue: 1, log });
      await key('ArrowRight');
      expect(log).toEqual(['input:0.51', 'change:0.51']);
      await view.unmount();
      log.length = 0;
      await mountControlled({ initial: 100, step: 5, log });
      await key('ArrowRight');
      await key('End');
      await key('PageUp');
      expect(log).toEqual([]);
      await key('ArrowLeft');
      expect(log).toEqual(['input:95', 'change:95']);
    });
  });

  test('SLD-4: each handle is adjustable with increment and decrement actions, which move one keyboard step and emit input then change', async () => {
    const log: string[] = [];
    await mountControlled({ initial: 40, step: 5, log });
    expect(handle().props.accessibilityActions).toEqual([{ name: 'increment' }, { name: 'decrement' }]);
    await fireEvent(handle(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await fireEvent(handle(), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    await fireEvent(handle(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(log).toEqual(['input:45', 'change:45', 'input:40', 'change:40']);
  });

  test('SLD-5: a range draws a start and an end handle, each its own Tab stop and element (start first), stopping at the other\'s value; they meet but never cross', async () => {
    const log: string[] = [];
    await mountControlled({ range: true, initial: 60, initialStart: 20, log });
    const elements = screen.getAllByRole('adjustable');
    expect(elements.map((each) => each.props.testID)).toEqual([`${ID}.handle.start`, `${ID}.handle`]);
    expect(elements.map((each) => each.props.focusable)).toEqual([true, true]);
    await key('End', 'start');
    expect(log).toEqual(['input:60/60', 'change:60/60']);
    await key('ArrowRight', 'start');
    await key('Home', 'end');
    expect(log).toEqual(['input:60/60', 'change:60/60']);
    await key('ArrowRight', 'end');
    expect(log.at(-1)).toBe('change:61/60');
  });

  describe('SLD-6: the active track', () => {
    const pieces = () =>
      parts('track.').map((each) => ({ id: String(each.props.testID).slice(`${ID}.track.`.length), style: viewStyle(each) })).filter((each) => !each.id.startsWith('stop'));

    test('SLD-6: from min (the track\'s rounded start) to the value, the rest in the track color', async () => {
      await mount({ value: 40 });
      expect(pieces().map((each) => each.id)).toEqual(['active.active', 'inactive.after']);
      const [active, rest] = pieces();
      expect(active!.style).toMatchObject({ start: '0%', marginStart: -small.trackThickness / 2, end: '60%', backgroundColor: fill(standard.enabled.activeTrackColor) });
      expect(rest!.style).toMatchObject({ start: '40%', end: '0%', marginEnd: -small.trackThickness / 2, backgroundColor: fill(standard.enabled.trackColor) });
    });

    test('SLD-6: from an origin inside the range to the value, on whichever side the value lies', async () => {
      const view = await mount({ minimumValue: -50, maximumValue: 50, origin: 0, value: 20 });
      expect(pieces().map((each) => each.id)).toEqual(['inactive.before', 'active.active', 'inactive.after']);
      expect(pieces()[1]!.style).toMatchObject({ start: '50%', marginStart: 0, end: '30%' });
      await view.rerender(
        <TanreiProvider theme="light">
          <Slider testID={ID} accessibilityLabel="Balance" minimumValue={-50} maximumValue={50} origin={0} value={-30} />
        </TanreiProvider>,
      );
      expect(pieces().map((each) => each.id)).toEqual(['inactive.before', 'active.active', 'inactive.after']);
      expect(pieces()[1]!.style).toMatchObject({ start: '20%', end: '50%', marginEnd: 0 });
    });

    test('SLD-6: a range draws the active track between its handles; origin is ignored', async () => {
      await mount({ range: true, startValue: 20, value: 60, origin: 90, startAccessibilityLabel: 'Min' });
      expect(pieces().map((each) => each.id)).toEqual(['inactive.before', 'active.between', 'inactive.after']);
      expect(pieces()[1]!.style).toMatchObject({ start: '20%', end: '40%' });
    });
  });

  test('SLD-7: as thick as the larger of container.size and the handle height; the hit area reaches sys.target.touch across the axis; the track the size\'s thickness, inset half the container from each end; the handles travel half the thickness in from its ends', async () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      const view = await mount({ size });
      const dims = tokens.sizes[size];
      const across = Math.max(tokens.containerSize, dims.handleHeight);
      expect(viewStyle(host())).toMatchObject({ alignSelf: 'stretch', height: across });
      const reach = Math.max(0, Math.ceil((tanrei.measure.target.touch - across) / 2));
      expect(host().props.hitSlop).toEqual({ top: reach, bottom: reach, left: 0, right: 0 });
      expect(viewStyle(part('track')!)).toMatchObject({ start: tokens.containerSize / 2, end: tokens.containerSize / 2, height: dims.trackThickness, top: (across - dims.trackThickness) / 2 });
      expect(viewStyle(part('handles')!)).toMatchObject({ start: tokens.containerSize / 2 + dims.trackThickness / 2, end: tokens.containerSize / 2 + dims.trackThickness / 2 });
      await view.unmount();
    }
    // A thicker handle than the container sets the thickness.
    await mount({}, { theme: 'light', system: withSlider({ sizes: { ...tokens.sizes, small: { ...small, handleHeight: 44 } } }) });
    expect(viewStyle(host()).height).toBe(44);
    expect(host().props.hitSlop.top).toBe(Math.max(0, Math.ceil((tanrei.measure.target.touch - 44) / 2)));
  });

  test.each(['light', 'dark'] as const)('SLD-8: the tracks, the handle and its size and corners come from the tokens (%s)', async (theme) => {
    await mount({ value: 40 }, { theme });
    const scheme: TanreiScheme = theme;
    expect(viewStyle(part('track.active.active')!)).toMatchObject({ backgroundColor: fill(standard.enabled.activeTrackColor, scheme), borderRadius: Math.min(small.trackShape, small.trackThickness / 2) });
    expect(viewStyle(part('track.inactive.after')!).backgroundColor).toBe(fill(standard.enabled.trackColor, scheme));
    expect(viewStyle(part('handle.thumb')!)).toMatchObject({ width: standard.enabled.handleWidth, height: small.handleHeight, borderRadius: Math.min(tokens.handleShape, small.handleHeight / 2), backgroundColor: fill(standard.enabled.handleColor, scheme) });
  });

  test('SLD-8: the values drive the drawing — a bar handle, a track gap on each side of it, clamped corners and an elevation', async () => {
    const bar = { ...standard.enabled, handleWidth: 4, handleElevation: 'level2' as const };
    const system = withSlider({ trackGap: 6, handleShape: 99, sizes: { ...tokens.sizes, small: { trackThickness: 16, trackShape: 99, handleHeight: 44 } }, conditions: { standard: { ...standard, enabled: bar } } });
    await mount({ value: 40 }, { theme: 'light', system });
    expect(viewStyle(part('handle.thumb')!)).toMatchObject({ width: 4, height: 44, borderRadius: 2, boxShadow: createTanreiTheme(system, 'light').elevation('level2').boxShadow });
    expect(viewStyle(part('track.active.active')!)).toMatchObject({ borderRadius: 8, marginEnd: 4 / 2 + 6 });
    expect(viewStyle(part('track.inactive.after')!)).toMatchObject({ marginStart: 4 / 2 + 6 });
  });

  describe('SLD-9: stop dots', () => {
    const dots = () => parts('track.stop.').map((each) => ({ at: String(each.props.testID).slice(`${ID}.track.stop.`.length), color: viewStyle(each).backgroundColor, size: viewStyle(each).width }));

    test('SLD-9: at the end of the travel that lies on the track, in stop-indicator.color, stop-indicator.size across', async () => {
      await mount({ value: 40 });
      expect(dots()).toEqual([{ at: '1', color: fill(standard.enabled.stopIndicatorColor), size: tokens.stopIndicatorSize }]);
    });

    test('SLD-9: with stops, at every value a discrete slider can take — in active-stop-indicator.color on the active track — and none under the handle', async () => {
      await mount({ value: 30, step: 10, stops: true });
      const all = dots();
      expect(all.map((each) => each.at)).toEqual(['0', '0.1', '0.2', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1']);
      expect(all.slice(0, 3).every((each) => each.color === fill(standard.enabled.activeStopIndicatorColor))).toBe(true);
      expect(all.slice(3).every((each) => each.color === fill(standard.enabled.stopIndicatorColor))).toBe(true);
    });

    test('SLD-9: once laid out, a dot the handle or its gap covers is not drawn; stops are ignored while step is 0; a size of 0 draws none', async () => {
      const view = await mount({ value: 32, step: 1, stops: true, maximumValue: 40 });
      await layout();
      // The handle (20 wide) at 32 of 0–40 covers the dots within its half-width plus half a dot.
      const covered = dots().map((each) => Number(each.at) * 40);
      const reach = (standard.enabled.handleWidth / 2 + tokens.trackGap + tokens.stopIndicatorSize / 2) / TRAVEL * 40;
      expect(covered.every((at) => Math.abs(at - 32) >= reach)).toBe(true);
      expect(covered).toContain(30);
      await view.unmount();
      const continuous = await mount({ value: 40, stops: true });
      expect(dots().map((each) => each.at)).toEqual(['1']);
      await continuous.unmount();
      await mount({ value: 40, step: 10, stops: true }, { theme: 'light', system: withSlider({ stopIndicatorSize: 0 }) });
      expect(dots()).toEqual([]);
    });
  });

  test('SLD-10: the container is container.size square with container.shape corners, centered on the handle, invisible at rest; a size of 0 draws none', async () => {
    const view = await mount();
    expect(viewStyle(part('handle.container')!)).toMatchObject({ position: 'absolute', width: tokens.containerSize, height: tokens.containerSize, borderRadius: Math.min(tokens.containerShape, tokens.containerSize / 2) });
    expect(viewStyle(part('handle.container')!).backgroundColor).toBeUndefined();
    await view.unmount();
    await mount({}, { theme: 'light', system: withSlider({ containerSize: 0 }) });
    expect(part('handle.container')).toBeNull();
  });

  describe('SLD-11: states', () => {
    test('SLD-11: precedence is pressed over focused over hovered, under the acme fixture system (which values each differently)', async () => {
      const conditions = acme.components.slider.conditions.standard;
      const expected = (name: InteractionState) => fill(conditions[name].containerColor, 'light', acme);
      expect(new Set((['hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(3);
      await mount({ value: 40 }, { theme: 'light', system: acme });
      await layout();
      const layer = () => viewStyle(part('handle.container')!).backgroundColor;
      await fireEvent(host(), 'pointerEnter', { nativeEvent: { offsetX: xOf(0.4) } });
      expect(layer()).toBe(expected('hovered'));
      await fireEvent(handle(), 'focus');
      expect(layer()).toBe(expected('focused'));
      await grant(xOf(0.4));
      expect(layer()).toBe(expected('pressed'));
      await release(xOf(0.4));
      await wait(HOLD + 30);
      expect(layer()).toBe(expected('focused'));
      await fireEvent(handle(), 'blur');
      expect(layer()).toBe(expected('hovered'));
      await fireEvent(host(), 'pointerLeave');
      expect(layer()).toBeUndefined();
    });

    test('SLD-11: in the default system a state mixes state-layer.color (the handle color) into the container; the handle and the tracks keep their resting colors', async () => {
      expect(standard.enabled.stateLayerColor).toEqual(standard.enabled.handleColor);
      await mount({ value: 40 });
      await fireEvent(handle(), 'focus');
      expect(viewStyle(part('handle.container')!).backgroundColor).toBe(fill(standard.focused.containerColor));
      expect(fill(standard.focused.containerColor)).toBe(fill({ kind: 'mix', base: standard.enabled.containerColor, with: standard.enabled.stateLayerColor, amount: tanrei.state.focusStateLayerOpacity }));
      expect(viewStyle(part('handle.thumb')!).backgroundColor).toBe(fill(standard.enabled.handleColor));
      expect(viewStyle(part('track.active.active')!).backgroundColor).toBe(fill(standard.enabled.activeTrackColor));
    });

    test('SLD-11: in a range only the handle a press would move is hovered, and each handle has its own state; the tracks and opacity follow the highest state of any handle', async () => {
      const opacity = { ...tokens, hoveredOpacity: 0.9, focusedOpacity: 0.8, pressedOpacity: 0.7 };
      await mount({ range: true, startValue: 20, value: 60, startAccessibilityLabel: 'Min' }, { theme: 'light', system: withSlider(opacity) });
      await layout();
      await fireEvent(host(), 'pointerEnter', { nativeEvent: { offsetX: xOf(0.25) } });
      expect(viewStyle(part('handle.start.container')!).backgroundColor).toBe(fill(standard.hovered.containerColor));
      expect(viewStyle(part('handle.container')!).backgroundColor).toBeUndefined();
      expect(viewStyle(host()).opacity).toBe(0.9);
      await fireEvent(host(), 'pointerMove', { nativeEvent: { offsetX: xOf(0.55) } });
      expect(viewStyle(part('handle.container')!).backgroundColor).toBe(fill(standard.hovered.containerColor));
      expect(viewStyle(part('handle.start.container')!).backgroundColor).toBeUndefined();
      await fireEvent(handle('start'), 'focus');
      expect(viewStyle(part('handle.start.container')!).backgroundColor).toBe(fill(standard.focused.containerColor));
      expect(viewStyle(host()).opacity).toBe(0.8);
    });

    test('SLD-11: focus that comes with a press does not select the focused state; colors move over the state motion, at once where motion is reduced', async () => {
      reduceMotion(false);
      await mount({ value: 40 });
      await wait(10);
      await layout();
      const timing = jest.spyOn(Animated, 'timing');
      await fireEvent(handle(), 'focus');
      expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
      await wait(tokens.motionStateDuration * 2);
      await fireEvent(handle(), 'blur');
      await wait(tokens.motionStateDuration * 2);
      await grant(xOf(0.4));
      await fireEvent(handle(), 'focus');
      await release(xOf(0.4));
      // Each wait is one act() scope: a state change inside it takes effect when it ends.
      await wait(HOLD + 30);
      await wait(tokens.motionStateDuration * 2);
      expect(viewStyle(part('handle.container')!).backgroundColor).toBeUndefined();
      expect(part('handle.focus-ring')).toBeNull();
    });
  });

  test('SLD-12: keyboard focus shows the focus ring around the handle, without animation; focus from a press does not', async () => {
    reduceMotion(false);
    await mount({ value: 40 });
    await wait(10);
    const timing = jest.spyOn(Animated, 'timing');
    await fireEvent(handle(), 'focus');
    const radius = Math.min(tokens.handleShape, small.handleHeight / 2);
    expect(viewStyle(part('handle.focus-ring')!)).toMatchObject({ position: 'absolute', borderWidth: tanrei.measure.focus.outerWidth, borderRadius: radius + tanrei.measure.focus.offset + tanrei.measure.focus.outerWidth });
    expect(timing.mock.calls.filter(([, config]) => config.duration !== tokens.motionStateDuration)).toEqual([]);
    await fireEvent(handle(), 'blur');
    expect(part('handle.focus-ring')).toBeNull();
  });

  test('SLD-13: a press shows the pressed state of the handle it moves at once, keeps it while it lasts and for at least press-hold after', async () => {
    await mount({ value: 40 }, { theme: 'light', system: acme });
    await layout();
    const pressed = fill(acme.components.slider.conditions.standard.pressed.containerColor, 'light', acme);
    await grant(xOf(0.4));
    expect(viewStyle(part('handle.container')!).backgroundColor).toBe(pressed);
    await moveTo(xOf(0.6));
    expect(viewStyle(part('handle.container')!).backgroundColor).toBe(pressed);
    await release(xOf(0.6));
    expect(viewStyle(part('handle.container')!).backgroundColor).toBe(pressed);
    await wait(HOLD + 30);
    expect(viewStyle(part('handle.container')!).backgroundColor).toBeUndefined();
  });

  describe('SLD-14: pressed feedback', () => {
    const withFeedback = (pressedFeedback: TanreiSystem['behavior']['pressedFeedback'], base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, pressedFeedback } });

    test('SLD-14: overlay applies the pressed tokens to the container at once', async () => {
      await mount({ value: 40 }, { theme: 'light', system: withFeedback('overlay') });
      await layout();
      await grant(xOf(0.4));
      expect(viewStyle(part('handle.container')!).backgroundColor).toBe(fill(standard.pressed.containerColor));
      expect(part('handle.ripple')).toBeNull();
    });

    test('SLD-14: ripple grows the pressed state layer from the pressed handle\'s center over feedback-duration, the container keeping the state under the press; reduce motion shows it whole', async () => {
      reduceMotion(false);
      await mount({ value: 40 }, { theme: 'light', system: withFeedback('ripple') });
      await wait(10);
      await layout();
      const timing = jest.spyOn(Animated, 'timing');
      await grant(xOf(0.4));
      expect(part('handle.ripple')).not.toBeNull();
      expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionFeedbackDuration)).toBe(true);
      expect(viewStyle(part('handle.container')!).backgroundColor).toBeUndefined();
      const wave = viewStyle(screen.getByTestId(`${ID}.handle.ripple.wave`, { includeHiddenElements: true }));
      expect([wave.left, wave.top].map((each) => Number(each) + Number(wave.width) / 2)).toEqual([tokens.containerSize / 2, tokens.containerSize / 2]);
      await release(xOf(0.4));
      await wait(HOLD + tokens.motionStateDuration + 100);
    });

    test('SLD-14: dim draws no state layer and applies the pressed opacity to the whole slider; none draws no answer to the press', async () => {
      const system = withSlider({ pressedOpacity: 0.6 }, withFeedback('dim'));
      const view = await mount({ value: 40 }, { theme: 'light', system });
      await layout();
      await grant(xOf(0.4));
      expect(viewStyle(part('handle.container')!).backgroundColor).toBeUndefined();
      expect(viewStyle(host()).opacity).toBe(0.6);
      await release(xOf(0.4));
      await view.unmount();
      await mount({ value: 40 }, { theme: 'light', system: withSlider({ pressedOpacity: 0.6 }, withFeedback('none')) });
      await layout();
      await grant(xOf(0.4));
      expect(viewStyle(part('handle.container')!).backgroundColor).toBeUndefined();
      expect(viewStyle(host()).opacity).toBe(1);
    });
  });

  test('SLD-15: corners ease by sys.shape.corner-smoothing (the continuous curve on iOS) and keyboard focus is drawn as sys.behavior.focus-style names', async () => {
    const system = { ...tanrei, shape: { ...tanrei.shape, cornerSmoothing: 0.6 }, behavior: { ...tanrei.behavior, focusStyle: 'glow' as const } };
    await mount({ value: 40 }, { theme: 'light', system });
    await fireEvent(handle(), 'focus');
    if (ReactNative.Platform.OS === 'ios') {
      expect(viewStyle(part('handle.thumb')!).borderCurve).toBe('continuous');
      expect(viewStyle(part('track.active.active')!).borderCurve).toBe('continuous');
    }
    expect(viewStyle(part('handle.focus-ring')!).boxShadow).toEqual(expect.any(Array));
  });

  test('SLD-16: a value set by the product (or a key, or a tap) moves the handle over value-duration with value-easing and emits nothing; a drag follows at once; reduce motion shows every change at once', async () => {
    reduceMotion(false);
    const onValueChange = jest.fn();
    const bezier = jest.spyOn(ReactNative.Easing, 'bezier');
    const view = await mount({ value: 40, onValueChange });
    await wait(10);
    const timing = jest.spyOn(Animated, 'timing');
    await view.rerender(
      <TanreiProvider theme="light">
        <Slider testID={ID} accessibilityLabel="Volume" value={70} onValueChange={onValueChange} />
      </TanreiProvider>,
    );
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionValueDuration)).toBe(true);
    expect(bezier).toHaveBeenCalledWith(...tokens.motionValueEasing);
    expect(onValueChange).not.toHaveBeenCalled();
    await wait(tokens.motionValueDuration + 100);
    expect(viewStyle(part('track.active.active')!).end).toBe('30%');
    await view.unmount();

    const log: string[] = [];
    await mountControlled({ initial: 40, log });
    await wait(10);
    await layout();
    await grant(xOf(0.4));
    await moveTo(xOf(0.6));
    timing.mockClear();
    await moveTo(xOf(0.7));
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionValueDuration)).toEqual([]);
    expect(viewStyle(part('track.active.active')!).end).toBe('30%');
    await release(xOf(0.7));
    await wait(HOLD + 30);
  });

  describe('SLD-17: the value indicator', () => {
    test('SLD-17: always — offset beyond the handle\'s edge above it, in the indicator tokens, taking no input and hidden from assistive technology', async () => {
      await mount({ value: 40, valueIndicator: 'always' });
      const indicator = part('handle.value-indicator')!;
      expect(viewStyle(indicator)).toMatchObject({
        position: 'absolute',
        bottom: small.handleHeight / 2 + tokens.valueIndicatorOffset,
        minHeight: tokens.valueIndicatorContainerHeight,
        minWidth: tokens.valueIndicatorContainerHeight,
        paddingHorizontal: tokens.valueIndicatorContainerPaddingInline,
        borderRadius: tokens.valueIndicatorContainerShape,
        backgroundColor: fill(tokens.valueIndicatorContainerColor),
      });
      expect(indicator.props.pointerEvents).toBe('none');
      expect(indicator.props.accessibilityElementsHidden).toBe(true);
      const label = part('handle.value-indicator.label')!;
      expect(label.props.numberOfLines).toBe(1);
      expect(viewStyle(label)).toMatchObject({ color: fill(tokens.valueIndicatorLabelColor), fontSize: createTanreiTheme(tanrei, 'light').text(tokens.valueIndicatorLabelTypescale).fontSize });
      expect(label.props.children).toBe('40');
    });

    test('SLD-17: centered on the handle once measured, and shifted along the axis to stay inside the slider; in a vertical slider at the inline start', async () => {
      const view = await mount({ value: 0, valueIndicator: 'always' });
      await layout();
      await fireEvent(part('handle.value-indicator')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 24 } } });
      // Centered: -30; the handle's center is START from the slider's start, so the indicator is shifted by 30 - START.
      expect(viewStyle(part('handle.value-indicator')!).start).toBe(-30 + (30 - START));
      await view.unmount();
      await mount({ value: 40, valueIndicator: 'always', orientation: 'vertical' });
      expect(viewStyle(part('handle.value-indicator')!)).toMatchObject({ end: small.handleHeight / 2 + tokens.valueIndicatorOffset, top: -tokens.valueIndicatorContainerHeight / 2 });
    });

    test('SLD-17: active — shown while the handle is pressed or has keyboard focus, faded in and out over the state motion; none never shows it', async () => {
      reduceMotion(false);
      const view = await mount({ value: 40, valueIndicator: 'active' });
      await wait(10);
      await layout();
      expect(part('handle.value-indicator')).toBeNull();
      const timing = jest.spyOn(Animated, 'timing');
      await fireEvent(handle(), 'focus');
      expect(part('handle.value-indicator')).not.toBeNull();
      expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
      await fireEvent(handle(), 'blur');
      await wait(tokens.motionStateDuration + 100);
      expect(part('handle.value-indicator')).toBeNull();
      await grant(xOf(0.4));
      expect(part('handle.value-indicator')).not.toBeNull();
      await release(xOf(0.4));
      // Each wait is one act() scope: the press hold ends in the first, the fade runs in the second.
      await wait(HOLD + 30);
      await wait(tokens.motionStateDuration + 100);
      expect(part('handle.value-indicator')).toBeNull();
      await view.unmount();
      await mount({ value: 40 });
      await fireEvent(handle(), 'focus');
      expect(part('handle.value-indicator')).toBeNull();
    });
  });

  test('SLD-18: each handle\'s value text is valueText / startValueText, else the value in the locale with the keyboard step\'s fraction digits, at most two', async () => {
    expect(sliderScale(0, 100, 0).digits).toBe(0);
    expect(sliderScale(0, 10, 0.5).digits).toBe(1);
    expect(sliderScale(0, 1, 0).digits).toBe(2);
    expect(sliderScale(0, 1, 0.001).digits).toBe(2);
    expect(formatSliderValue(0.5, 2)).toBe(new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(0.5));
    const view = await mount({ value: 0.25, minimumValue: 0, maximumValue: 1 });
    expect(handle().props.accessibilityValue.text).toBe(formatSliderValue(0.25, 2));
    await view.unmount();
    await mount({ range: true, startValue: 20, value: 60, valueText: '$60', startValueText: '$20', startAccessibilityLabel: 'Min', valueIndicator: 'always' });
    expect(handle().props.accessibilityValue.text).toBe('$60');
    expect(handle('start').props.accessibilityValue.text).toBe('$20');
    expect(part('handle.start.value-indicator.label')!.props.children).toBe('$20');
  });

  test('SLD-19: each handle is an adjustable element named by its label, with its value, value text and the range it can still reach; the decorative parts are hidden', async () => {
    await mount({ range: true, startValue: 20, value: 60, startAccessibilityLabel: 'Minimum price', accessibilityLabel: 'Maximum price' });
    expect(handle('start').props).toMatchObject({ accessible: true, accessibilityRole: 'adjustable', accessibilityLabel: 'Minimum price', accessibilityValue: { min: 0, max: 60, now: 20, text: '20' }, accessibilityState: { disabled: false } });
    expect(handle().props).toMatchObject({ accessibilityLabel: 'Maximum price', accessibilityValue: { min: 20, max: 100, now: 60, text: '60' } });
    for (const name of ['track', 'handle.container', 'handle.thumb']) expect(part(name)!.props.accessibilityElementsHidden).toBe(true);
    expect(screen.getAllByRole('adjustable')).toHaveLength(2);
  });

  test('SLD-19: without a label, or a range without a start label, it still renders and says so in development builds only', async () => {
    const warn = jest.mocked(console.warn);
    const view = await mount({ accessibilityLabel: '' });
    expect(handle()).toBeTruthy();
    expect(reportsOf(warn)).toEqual([expect.stringContaining('has no accessibilityLabel')]);
    await view.unmount();
    warn.mockClear();
    const ranged = await mount({ range: true, startValue: 10, value: 50 });
    expect(reportsOf(warn)).toEqual([expect.stringContaining('has no startAccessibilityLabel')]);
    await ranged.unmount();
    warn.mockClear();
    development(false);
    await mount({ accessibilityLabel: '' });
    expect(reportsOf(warn)).toEqual([]);
  });

  test('SLD-20: disabled — no value changes, no input or change, not focusable, no value indicator, the disabled state exposed, every part from the disabled tokens', async () => {
    const log: string[] = [];
    await mountControlled({ initial: 60, step: 20, stops: true, disabled: true, valueIndicator: 'always', log });
    await layout();
    expect(host().props.onResponderGrant).toBeUndefined();
    await key('ArrowRight');
    await fireEvent(handle(), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(log).toEqual([]);
    expect(handle().props).toMatchObject({ focusable: false, accessibilityState: { disabled: true } });
    expect(handle().props.accessibilityActions).toBeUndefined();
    expect(part('handle.value-indicator')).toBeNull();
    const disabled = standard.disabled;
    expect(viewStyle(part('handle.thumb')!).backgroundColor).toBe(fill(disabled.handleColor));
    expect(viewStyle(part('track.active.active')!).backgroundColor).toBe(fill(disabled.activeTrackColor));
    expect(viewStyle(part('track.inactive.after')!).backgroundColor).toBe(fill(disabled.trackColor));
    expect(viewStyle(part('track.stop.0.2')!).backgroundColor).toBe(fill(disabled.activeStopIndicatorColor));
    expect(viewStyle(part('track.stop.1')!).backgroundColor).toBe(fill(disabled.stopIndicatorColor));
    expect(viewStyle(part('handle.container')!).backgroundColor).toBeUndefined();
    expect(viewStyle(host()).opacity).toBe(tokens.disabledOpacity);
    // The active track still stands apart from the track, so the value can be read.
    expect(fill(disabled.activeTrackColor)).not.toBe(fill(disabled.trackColor));
  });

  describe('SLD-21: orientation and direction', () => {
    test('SLD-21: vertical runs from the bottom (min) to the top (max), as tall as its layout gives it, every part turned', async () => {
      const log: string[] = [];
      await mountControlled({ initial: 40, orientation: 'vertical', log });
      expect(viewStyle(host())).toMatchObject({ height: '100%', width: Math.max(tokens.containerSize, small.handleHeight) });
      expect(host().props.hitSlop).toMatchObject({ top: 0, bottom: 0 });
      expect(viewStyle(part('track.active.active')!)).toMatchObject({ bottom: '0%', marginBottom: -small.trackThickness / 2, top: '60%' });
      await layout(LENGTH, true);
      // A press near the top is near max.
      await grant(LENGTH - xOf(0.9), 16, true);
      await release(LENGTH - xOf(0.9), 16, true);
      expect(log).toEqual(['input:90', 'change:90']);
      log.length = 0;
      await key('ArrowUp');
      expect(log).toEqual(['input:91', 'change:91']);
    });

    test('SLD-21: right-to-left mirrors a horizontal slider — the track and dots are logical, a press on the right is near min, and Left Arrow increases — but not a vertical one', async () => {
      jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
      const log: string[] = [];
      const view = await mountControlled({ initial: 40, log });
      expect(viewStyle(part('track.active.active')!)).toMatchObject({ start: '0%', end: '60%' });
      await layout();
      await grant(LENGTH - xOf(0.25));
      await release(LENGTH - xOf(0.25));
      expect(log).toEqual(['input:25', 'change:25']);
      log.length = 0;
      await key('ArrowLeft');
      await key('ArrowRight');
      expect(log).toEqual(['input:26', 'change:26', 'input:25', 'change:25']);
      await view.unmount();
      log.length = 0;
      await mountControlled({ initial: 40, orientation: 'vertical', log });
      await key('ArrowUp');
      await key('ArrowRight');
      expect(log).toEqual(['input:41', 'change:41', 'input:42', 'change:42']);
    });
  });

  test('SLD-22: values outside min and max or off a step are drawn clamped and snapped without input or change; a start above the end draws both at the end; each is reported', async () => {
    const warn = jest.mocked(console.warn);
    const onValueChange = jest.fn();
    const onSlidingComplete = jest.fn();
    const view = await mount({ value: 133, step: 10, onValueChange, onSlidingComplete });
    expect(handle().props.accessibilityValue.now).toBe(100);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onSlidingComplete).not.toHaveBeenCalled();
    expect(reportsOf(warn)).toEqual([expect.stringContaining('value 133 is outside 0–100 or off a step; it is drawn as 100')]);
    await view.unmount();
    warn.mockClear();
    const crossed = await mount({ range: true, startValue: 80, value: 30, startAccessibilityLabel: 'Min' });
    expect([handle('start').props.accessibilityValue.now, handle().props.accessibilityValue.now]).toEqual([30, 30]);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('startValue 80 is greater than value 30')]);
    await crossed.unmount();
    warn.mockClear();
    const origin = await mount({ origin: 250, value: 10 });
    expect(reportsOf(warn)).toEqual([expect.stringContaining('origin 250 is outside')]);
    await origin.unmount();
  });

  test('SLD-22: a max not above min draws the handles at the start and takes no input; a negative step is treated as 0; both reported', async () => {
    const warn = jest.mocked(console.warn);
    const log: string[] = [];
    const view = await mountControlled({ initial: 5, minimumValue: 10, maximumValue: 10, log });
    expect(handle().props.accessibilityValue.now).toBe(10);
    expect(part('track.active.active')).toBeNull();
    expect(host().props.onResponderGrant).toBeUndefined();
    await key('ArrowRight');
    expect(log).toEqual([]);
    expect(reportsOf(warn)).toEqual(expect.arrayContaining([expect.stringContaining('maximumValue (10) not greater than minimumValue (10)')]));
    await view.unmount();
    warn.mockClear();
    await mountControlled({ initial: 40, step: -5, log });
    await key('ArrowRight');
    expect(log).toEqual(['input:41', 'change:41']);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('negative step (-5)')]);
  });

  test('SLD-23: a size the active system does not have, or an orientation or valueIndicator the component does not define, renders with the default and is reported once', async () => {
    const warn = jest.mocked(console.warn);
    const reference = await mount({ value: 40 });
    const expected = JSON.stringify(reference.toJSON());
    await reference.unmount();
    const unknown = await mount({ value: 40, size: 'huge' as never, orientation: 'diagonal' as never, valueIndicator: 'sometimes' as never });
    expect(JSON.stringify(unknown.toJSON())).toBe(expected);
    const messages = warn.mock.calls.map(([message]) => String(message));
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Slider size "huge"; using "small"'),
        expect.stringContaining('Slider orientation "diagonal" is not defined; using "horizontal"'),
        expect.stringContaining('Slider valueIndicator "sometimes" is not defined; using "none"'),
      ]),
    );
  });

  describe('fixtures (default system, light scheme)', () => {
    describeFixtureBaselines(sliderSubject);
  });
});
