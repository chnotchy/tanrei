// ProgressIndicator — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/progress-indicator.spec.json; every behaviour id is cited by the test that covers it.
import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, AppState, type AppStateStatus } from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCoreProgressIndicatorSize, TanreiPaint, TanreiProgressIndicatorTokens, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, painted, settleMotion, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { toEasing } from '../../theme/motion';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { ProgressIndicator, progressReading, type ProgressIndicatorProps, type ProgressIndicatorSize, type ProgressIndicatorVariant } from '../ProgressIndicator';
import { progressIndicatorSubject } from './ProgressIndicator.subject';

const spec = loadSpec('progress-indicator');
const tokens: TanreiProgressIndicatorTokens = tanrei.components.progressIndicator;
const ID = 'progress';
const LABEL = 'Uploading';
const sizes: TanreiCoreProgressIndicatorSize[] = ['small', 'medium', 'large'];

const hidden = { includeHiddenElements: true } as const;
const host = (): Instance => screen.getByTestId(ID);
const part = (name: string): Instance | null => screen.queryByTestId(`${ID}.${name}`, hidden);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const withProgress = (overrides: Partial<TanreiProgressIndicatorTokens>, base: TanreiSystem = tanrei) => withComponent(base, 'progressIndicator', overrides);

const element = (props: Partial<ProgressIndicatorProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) => (
  <TanreiProvider {...provider}>
    <ProgressIndicator testID={ID} accessibilityLabel={LABEL} {...props} />
  </TanreiProvider>
);
const mount = (props: Partial<ProgressIndicatorProps> = {}, provider?: Omit<TanreiProviderProps, 'children'>) => render(element(props, provider));

/** The rotation of an arc part (`<arc>.first` / `.second` / `.start-cap` / `.end-cap`) and of the inner frame of a half. */
const rotate = (node: Instance) => (viewStyle(node).transform as { rotate: string }[])[0]!.rotate;
const innerRotate = (half: Instance) => rotate((half.children[0] as Instance).children[0] as Instance);
/** Style keys that name a physical left or right edge. */
const physical = (style: object) => Object.keys(style).filter((key) => /^(left|right|marginLeft|marginRight|paddingLeft|paddingRight)$/.test(key));

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

/** Loops are captured, never run: a test reads the animation they were given and drives its value itself. */
function captureLoops() {
  const loops: { animation: Animated.CompositeAnimation; start: jest.Mock; stop: jest.Mock }[] = [];
  jest.spyOn(Animated, 'loop').mockImplementation((animation) => {
    const handle = { animation, start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    loops.push(handle);
    return handle as unknown as Animated.CompositeAnimation;
  });
  return loops;
}

/** Interpolations created while rendering, so a test can read an animated style at a value it sets. */
function captureInterpolations() {
  const made: { config: Parameters<Animated.Value['interpolate']>[0]; node: Animated.AnimatedInterpolation<string | number> }[] = [];
  const original = Animated.Value.prototype.interpolate;
  jest.spyOn(Animated.Value.prototype, 'interpolate').mockImplementation(function (this: Animated.Value, config) {
    const node = original.call(this, config);
    made.push({ config, node });
    return node;
  });
  return made;
}
const valueOf = (node: Animated.AnimatedInterpolation<string | number>) => (node as unknown as { __getValue(): string | number }).__getValue();

settleMotion();
let warn: jest.SpyInstance;
beforeEach(() => {
  // Loops never run in these tests (a running loop moves the drawing outside act and after the baseline): every test
  // sees the start of a cycle; a test that reads a loop captures it again with `captureLoops()`.
  captureLoops();
  resetLookupReports();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
const reports = () => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('ProgressIndicator'));

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(ProgressIndicator.name);
    expect(platform.props).toEqual({ variant: 'variant', size: 'size', value: 'value', min: 'min', max: 'max', label: 'accessibilityLabel', valueText: 'valueText' });
  });

  test('the enum values under test are exactly the spec values; size is the token axis', () => {
    const values = (name: string) => spec.props.find((p) => p.name === name)?.values;
    expect(values('variant')).toEqual(['linear', 'circular'] satisfies ProgressIndicatorVariant[]);
    expect(values('size')).toEqual(sizes);
    expect(Object.keys(tokens.sizes)).toEqual(sizes);
  });

  test('defaults follow the spec: linear, medium, indeterminate, range 0–1', async () => {
    await mount();
    expect(viewStyle(host())).toMatchObject({ height: tokens.sizes.medium.linearThickness, alignSelf: 'stretch' });
    expect(host().props.accessibilityState).toEqual({ busy: true });
    await mount({ value: 0.5 });
    expect(host().props.accessibilityValue).toEqual({ min: 0, max: 1, now: 0.5 });
  });
});

describe('behavior', () => {
  test.each([
    [0.4, '40%'],
    [0.75, '75%'],
    [0, '0%'],
    [1, '100%'],
  ])('PRG-1: a bar at %d fills %s of the track from its inline start', async (value, width) => {
    await mount({ value });
    expect(viewStyle(part('indicator')!)).toMatchObject({ width });
    // From the start: the indicator is the first flowing child of a row, with no offset of its own.
    const indicator = viewStyle(part('indicator')!);
    expect(indicator.position).toBeUndefined();
    expect(indicator.start).toBeUndefined();
    expect(viewStyle(host()).flexDirection).toBe('row');
  });

  test('PRG-1: the fraction is (value − min) / (max − min)', async () => {
    await mount({ value: 3, min: 0, max: 10 });
    expect(viewStyle(part('indicator')!).width).toBe('30%');
    await mount({ value: 15, min: 10, max: 30 });
    expect(viewStyle(part('indicator')!).width).toBe('25%');
  });

  test.each([
    [0.4, 144, false],
    [0.75, 270, true],
  ])('PRG-1: a ring at %d draws the indicator from the top, clockwise, over %d°', async (value, degrees, second) => {
    await mount({ variant: 'circular', value });
    expect(rotate(part('indicator.first')!)).toBe('0deg');
    expect(innerRotate(part('indicator.first')!)).toBe(`${Math.min(degrees, 180) - 180}deg`);
    if (second) {
      expect(rotate(part('indicator.second')!)).toBe('180deg');
      expect(innerRotate(part('indicator.second')!)).toBe(`${degrees - 360}deg`);
    } else expect(part('indicator.second')).toBeNull();
    expect(rotate(part('indicator.start-cap')!)).toBe('0deg');
    expect(rotate(part('indicator.end-cap')!)).toBe(`${degrees}deg`);
  });

  test('PRG-2: an indeterminate bar moves a segment two fifths long from beyond its start to beyond its end once per cycle, with the cycle easing', async () => {
    reduceMotion(false);
    const loops = captureLoops();
    const timing = jest.spyOn(Animated, 'timing');
    const interpolations = captureInterpolations();
    await mount();
    expect(viewStyle(part('indicator')!)).toMatchObject({ position: 'absolute', width: '40%', top: 0, bottom: 0 });
    expect(loops).toHaveLength(1);
    expect(loops[0]!.start).toHaveBeenCalledTimes(1);
    const [value, config] = timing.mock.calls.at(-1)!;
    expect(config).toMatchObject({ toValue: 1, duration: tokens.motionCycleDuration, useNativeDriver: false });
    const curve = toEasing(tokens.motionCycleEasing);
    for (const t of [0.1, 0.25, 0.5, 0.9]) expect(config.easing!(t)).toBeCloseTo(curve(t), 10);
    const start = [...interpolations].reverse().find(({ config: c }) => (c.outputRange as string[]).includes('100%'))!.node;
    // The segment's position at fixed times of the cycle: the eased progress, mapped from −40 % to 100 %.
    const at = async (t: number) => {
      await act(async () => (value as Animated.Value).setValue(config.easing!(t / tokens.motionCycleDuration)));
      return parseFloat(String(valueOf(start)));
    };
    expect(await at(0)).toBeCloseTo(-40, 6);
    expect(await at(tokens.motionCycleDuration / 2)).toBeCloseTo(-40 + 140 * curve(0.5), 6);
    expect(await at(tokens.motionCycleDuration)).toBeCloseTo(100, 6);
    // It clips to the track.
    expect(viewStyle(host()).overflow).toBe('hidden');
  });

  test('PRG-2: an indeterminate ring turns a quarter arc clockwise once per cycle at constant speed', async () => {
    reduceMotion(false);
    const loops = captureLoops();
    const timing = jest.spyOn(Animated, 'timing');
    const interpolations = captureInterpolations();
    await mount({ variant: 'circular' });
    expect(innerRotate(part('indicator.first')!)).toBe('-90deg');
    expect(part('indicator.second')).toBeNull();
    expect(loops).toHaveLength(1);
    const [value, config] = timing.mock.calls.at(-1)!;
    expect(config).toMatchObject({ toValue: 1, duration: tokens.motionCycleDuration, useNativeDriver: true });
    for (const t of [0.1, 0.5, 0.9]) expect(config.easing!(t)).toBeCloseTo(t, 10);
    const turn = [...interpolations].reverse().find(({ config: c }) => (c.outputRange as string[]).includes('360deg'))!.node;
    const at = async (t: number) => {
      await act(async () => (value as Animated.Value).setValue(config.easing!(t / tokens.motionCycleDuration)));
      return valueOf(turn);
    };
    expect(await at(0)).toBe('0deg');
    expect(await at(tokens.motionCycleDuration / 4)).toBe('90deg');
    expect(await at(tokens.motionCycleDuration / 2)).toBe('180deg');
    // The track stays still under it.
    expect(part('track')!.parent!.props.testID).toBe(ID);
  });

  test.each(sizes)('PRG-3: %s — a bar of linear.thickness across its layout; a ring filling a circular.size square with a circular.thickness stroke', async (size) => {
    const { linearThickness, circularSize, circularThickness } = tokens.sizes[size];
    const bar = await mount({ size, value: 0.4 });
    expect(viewStyle(host())).toMatchObject({ alignSelf: 'stretch', height: linearThickness });
    expect(viewStyle(host()).width).toBeUndefined();
    await bar.unmount();
    await mount({ size, variant: 'circular', value: 0.4 });
    expect(viewStyle(host())).toMatchObject({ width: circularSize, height: circularSize });
    const track = part('track')!.children[0] as Instance;
    expect(viewStyle(track)).toMatchObject({ width: circularSize, height: circularSize, borderRadius: circularSize / 2, borderWidth: circularThickness });
  });

  test.each([
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('PRG-4: track.color under indicator.color, ends rounded by track.shape clamped to half the thickness (%s)', async (_name, theme) => {
    const scheme: TanreiScheme = theme;
    const thickness = tokens.sizes.medium.linearThickness;
    await mount({ value: 0.4 }, { theme });
    expect(viewStyle(part('track')!)).toMatchObject({ backgroundColor: painted(tokens.trackColor, scheme), borderRadius: Math.min(tokens.trackShape, thickness / 2) });
    expect(viewStyle(part('indicator')!)).toMatchObject({ backgroundColor: painted(tokens.indicatorColor, scheme), borderRadius: thickness / 2 });
    // The track is drawn first: the indicator is over it.
    const children = host().children as Instance[];
    expect(children.indexOf(part('track')!)).toBeLessThan(children.indexOf(part('indicator')!));
    await mount({ value: 0.4, variant: 'circular' }, { theme });
    expect(viewStyle(part('track')!.children[0] as Instance).borderColor).toBe(painted(tokens.trackColor, scheme));
    expect(viewStyle(part('indicator.start-cap')!.children[0] as Instance).backgroundColor).toBe(painted(tokens.indicatorColor, scheme));
  });

  test('PRG-4: a smaller track.shape rounds less; corner none gives the ring butt ends (no caps)', async () => {
    await mount({ value: 0.4 }, { theme: 'light', system: withProgress({ trackShape: 1 }) });
    expect(viewStyle(part('indicator')!).borderRadius).toBe(1);
    await mount({ variant: 'circular', value: 0.4 }, { theme: 'light', system: withProgress({ trackShape: 0 }) });
    expect(part('indicator.start-cap')).toBeNull();
    expect(part('indicator.end-cap')).toBeNull();
    await mount({ variant: 'circular', value: 0.4 });
    expect(viewStyle(part('indicator.end-cap')!.children[0] as Instance)).toMatchObject({ width: tokens.sizes.medium.circularThickness, borderRadius: tokens.sizes.medium.circularThickness / 2 });
  });

  test('PRG-5: with a track.gap, a bar leaves that much empty space after the indicator while the value is strictly between the ends', async () => {
    const system = withProgress({ trackGap: 4 });
    await mount({ value: 0.4 }, { theme: 'light', system });
    const children = host().children as Instance[];
    expect(children.map((child) => child.props.testID)).toEqual([`${ID}.indicator`, `${ID}.track`]);
    expect(viewStyle(part('track')!)).toMatchObject({ flex: 1, marginStart: 4 });
    for (const value of [0, 1]) {
      await mount({ value }, { theme: 'light', system });
      expect(viewStyle(part('track')!)).toMatchObject({ position: 'absolute', start: 0, end: 0 });
      expect(viewStyle(part('track')!).marginStart).toBeUndefined();
    }
  });

  test('PRG-5: with a track.gap, a ring leaves that much empty space (plus the caps\' reach) at both ends of the indicator\'s arc', async () => {
    const system = withProgress({ trackGap: 4 });
    const { circularSize: size, circularThickness: stroke } = tokens.sizes.medium;
    await mount({ variant: 'circular', value: 0.4 }, { theme: 'light', system });
    const gapDegrees = ((4 + stroke) / ((size - stroke) / 2)) * (180 / Math.PI);
    const from = Math.round((144 + gapDegrees) * 1e4) / 1e4;
    expect(rotate(part('track.first')!)).toBe(`${from}deg`);
    // …and ends that far before the top, where the indicator starts.
    expect(parseFloat(rotate(part('track.end-cap')!))).toBeCloseTo(360 - gapDegrees, 3);
    // The indicator itself is not shortened: from the top over 144°.
    expect(rotate(part('indicator.end-cap')!)).toBe('144deg');
    // No gap by default: the track is the whole circle.
    await mount({ variant: 'circular', value: 0.4 });
    expect(part('track.first')).toBeNull();
    expect(viewStyle(part('track')!.children[0] as Instance)).toMatchObject({ borderRadius: size / 2 });
  });

  test('PRG-5: a determinate bar draws a stop indicator of stop-indicator.size in the indicator color, its center half the thickness before the track\'s end; 0 draws none', async () => {
    await mount({ value: 0.4 });
    expect(tokens.stopIndicatorSize).toBe(0);
    expect(part('stop-indicator')).toBeNull();
    const thickness = tokens.sizes.large.linearThickness;
    await mount({ value: 0.4, size: 'large' }, { theme: 'light', system: withProgress({ stopIndicatorSize: 4 }) });
    const dot = viewStyle(part('stop-indicator')!);
    expect(dot).toMatchObject({ position: 'absolute', width: 4, height: 4, backgroundColor: painted(tokens.indicatorColor) });
    // Its center: in the middle of the thickness, and half the thickness before the track's end (concentric with the
    // rounded end).
    expect((dot.top as number) + 4 / 2).toBe(thickness / 2);
    expect((dot.end as number) + 4 / 2).toBe(thickness / 2);
    // A dot larger than the thickness keeps the same center.
    await mount({ value: 0.4, size: 'small' }, { theme: 'light', system: withProgress({ stopIndicatorSize: 6 }) });
    const small = tokens.sizes.small.linearThickness;
    expect(viewStyle(part('stop-indicator')!)).toMatchObject({ top: (small - 6) / 2, end: (small - 6) / 2 });
    // Not on an indeterminate bar, nor on a ring.
    await mount({}, { theme: 'light', system: withProgress({ stopIndicatorSize: 4 }) });
    expect(part('stop-indicator')).toBeNull();
    await mount({ variant: 'circular', value: 0.4 }, { theme: 'light', system: withProgress({ stopIndicatorSize: 4 }) });
    expect(part('stop-indicator')).toBeNull();
  });

  test('PRG-6: a value change moves the indicator\'s end over value-duration with value-easing', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ value: 0.2 });
    timing.mockClear();
    await view.rerender(element({ value: 0.6 }));
    expect(timing).toHaveBeenCalledTimes(1);
    const config = timing.mock.calls[0]![1];
    expect(config).toMatchObject({ toValue: 1, duration: tokens.motionValueDuration });
    const curve = toEasing(tokens.motionValueEasing);
    for (const t of [0.2, 0.5, 0.8]) expect(config.easing!(t)).toBeCloseTo(curve(t), 10);
    // While it moves the width is an interpolation from the old fraction to the new one; it lands on the new value.
    expect(viewStyle(part('indicator')!).width).toBeDefined();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, tokens.motionValueDuration + 50));
    });
    expect(viewStyle(part('indicator')!).width).toBe('60%');
  });

  test('PRG-6: switching between determinate and indeterminate takes effect at once', async () => {
    reduceMotion(false);
    captureLoops();
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ value: 0.2 });
    timing.mockClear();
    await view.rerender(element({ value: null }));
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionValueDuration)).toEqual([]);
    await view.rerender(element({ value: 0.7 }));
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionValueDuration)).toEqual([]);
    expect(viewStyle(part('indicator')!).width).toBe('70%');
  });

  test('PRG-7: under reduced motion a value change is shown at once', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ value: 0.2 });
    await view.rerender(element({ value: 0.6 }));
    expect(timing).not.toHaveBeenCalled();
    expect(viewStyle(part('indicator')!).width).toBe('60%');
  });

  test.each(['linear', 'circular'] as const)('PRG-7: under reduced motion an indeterminate %s does not move: the whole track in the indicator color, pulsing 1 → 0 → 1 once per cycle', async (variant) => {
    const loops = captureLoops();
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ variant });
    if (variant === 'linear') {
      expect(viewStyle(part('indicator')!)).toMatchObject({ position: 'absolute', start: 0, end: 0, top: 0, bottom: 0, opacity: 1 });
      expect(viewStyle(part('indicator')!).width).toBeUndefined();
    } else {
      expect(viewStyle(part('motion')!)).toMatchObject({ opacity: 1 });
      expect(viewStyle(part('motion')!).transform).toBeUndefined();
      expect(viewStyle(part('indicator')!.children[0] as Instance)).toMatchObject({ borderWidth: tokens.sizes.medium.circularThickness, borderColor: painted(tokens.indicatorColor) });
    }
    // Recorded at the start of a cycle: opacity 1.
    expect(loops).toHaveLength(1);
    const pulse = timing.mock.calls.slice(-2);
    expect(pulse.map(([, config]) => config.toValue)).toEqual([0, 1]);
    const curve = toEasing(tokens.motionCycleEasing);
    for (const [, config] of pulse) {
      expect(config).toMatchObject({ duration: tokens.motionCycleDuration / 2, useNativeDriver: true });
      expect(config.easing!(0.3)).toBeCloseTo(curve(0.3), 10);
    }
    // The track stays still: a plain view, no animated style.
    expect(viewStyle(part('track')!).opacity).toBeUndefined();
  });

  test('PRG-8: determinate — a progressbar named by the label, with min, max, the clamped value and valueText', async () => {
    await mount({ value: 3, min: 0, max: 10, valueText: '3 of 10 files' });
    const bar = screen.getByRole('progressbar', { name: LABEL });
    expect(bar).toBe(host());
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 10, now: 3, text: '3 of 10 files' });
    expect(bar.props.accessibilityState).toBeUndefined();
    await mount({ value: 0.4 });
    expect(host().props.accessibilityValue).toEqual({ min: 0, max: 1, now: 0.4 });
  });

  test('PRG-9: indeterminate — a progressbar named by the label, busy, with no current value', async () => {
    await mount({ variant: 'circular' });
    const bar = screen.getByRole('progressbar', { name: LABEL });
    expect(bar.props.accessibilityState).toEqual({ busy: true });
    expect(bar.props.accessibilityValue).toBeUndefined();
  });

  test('PRG-10: never focusable, never a live region, and a value change announces nothing', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const view = await mount({ value: 0.2 });
    expect(host().props.focusable).toBe(false);
    await view.rerender(element({ value: 0.8 }));
    expect(host().props.accessibilityValue).toEqual({ min: 0, max: 1, now: 0.8 });
    expect(announce).not.toHaveBeenCalled();
    expect(host().props.accessibilityLiveRegion).toBeUndefined();
    // The progressbar role is what iOS marks as updating frequently (UIAccessibilityTraitUpdatesFrequently).
    expect(host().props.accessibilityRole).toBe('progressbar');
    // Its drawing is not a second element.
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  test.each([
    [-0.5, 0, 1, '0%', 0, 'value -0.5 is below min 0; using 0'],
    [1.5, 0, 1, '100%', 1, 'value 1.5 is above max 1; using 1'],
  ])('PRG-11: value %d in %d–%d is drawn and exposed clamped, and reported', async (value, min, max, width, now, message) => {
    await mount({ value, min, max });
    expect(viewStyle(part('indicator')!).width).toBe(width);
    expect(host().props.accessibilityValue).toMatchObject({ min, max, now });
    expect(reports()).toEqual([expect.stringContaining(message)]);
  });

  test.each([
    [5, 5],
    [5, 1],
  ])('PRG-11: min %d, max %d — the track with no indicator, exposed as 0 of 0–1, and reported', async (min, max) => {
    await mount({ value: 3, min, max });
    expect(viewStyle(part('indicator')!).width).toBe('0%');
    expect(host().props.accessibilityValue).toEqual({ min: 0, max: 1, now: 0 });
    expect(reports()).toEqual([expect.stringContaining('is not greater than min')]);
    await mount({ value: 3, min, max, variant: 'circular' });
    expect(part('indicator')).toBeNull();
    expect(part('track')).not.toBeNull();
    expect(progressReading(3, min, max).fraction).toBe(0);
  });

  test('PRG-12: an unknown size renders as medium, an unknown variant as linear, each reported in development builds', async () => {
    const expected = JSON.stringify((await mount({ value: 0.4 })).toJSON());
    expect(reports()).toEqual([]);
    expect(JSON.stringify((await mount({ value: 0.4, size: 'huge' as ProgressIndicatorSize })).toJSON())).toBe(expected);
    expect(JSON.stringify((await mount({ value: 0.4, variant: 'spiral' as ProgressIndicatorVariant })).toJSON())).toBe(expected);
    expect(reports()).toEqual([expect.stringContaining('ProgressIndicator size "huge"; using "medium"'), expect.stringContaining('ProgressIndicator variant "spiral" is not defined; using "linear"')]);
  });

  test('PRG-13: a bar fills and moves from the logical start (the right in right-to-left); a ring is never mirrored', async () => {
    const system = withProgress({ trackGap: 4, stopIndicatorSize: 4 });
    await mount({ value: 0.4 }, { theme: 'light', system });
    for (const node of [host(), part('indicator')!, part('track')!, part('stop-indicator')!]) expect(physical(viewStyle(node))).toEqual([]);
    reduceMotion(false);
    captureLoops();
    await mount({});
    expect(physical(viewStyle(part('indicator')!))).toEqual([]);
    expect(viewStyle(part('indicator')!).start).toBeDefined();
    // The ring's drawing is laid out left-to-right whatever the direction, and turns clockwise.
    await mount({ variant: 'circular', value: 0.4 });
    for (const arc of [part('track')!, part('indicator')!]) expect(viewStyle(arc).direction).toBe('ltr');
  });

  test('PRG-14: the indeterminate animation stops while the app is in the background and resumes when it comes back', async () => {
    reduceMotion(false);
    const loops = captureLoops();
    let onChange: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      onChange = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    await mount({ variant: 'circular' });
    expect(loops).toHaveLength(1);
    expect(loops[0]!.start).toHaveBeenCalled();
    await act(async () => onChange('background'));
    expect(loops[0]!.stop).toHaveBeenCalled();
    expect(loops).toHaveLength(1);
    await act(async () => onChange('active'));
    expect(loops).toHaveLength(2);
    expect(loops[1]!.start).toHaveBeenCalled();
    // A determinate indicator runs no loop at all.
    await mount({ value: 0.5 });
    expect(loops).toHaveLength(2);
  });

  test('PRG-15: without a label it still renders, and development builds say it has no accessible name', async () => {
    await render(
      <TanreiProvider theme="light">
        <ProgressIndicator testID={ID} value={0.4} />
      </TanreiProvider>,
    );
    expect(host()).toBeTruthy();
    expect(reports()).toEqual([expect.stringContaining('has no accessibilityLabel')]);
    warn.mockClear();
    await mount({ value: 0.4 });
    expect(reports()).toEqual([]);
  });
});

describe('the system drives rendering', () => {
  test('changed tokens reach the bar and the ring: thickness, size, stroke, colors', async () => {
    const system = withProgress({
      trackColor: literal(10, 20, 30),
      indicatorColor: literal(200, 100, 0),
      sizes: { ...tokens.sizes, medium: { linearThickness: 6, circularSize: 30, circularThickness: 3 } },
    });
    await mount({ value: 0.4 }, { theme: 'light', system });
    expect(viewStyle(host()).height).toBe(6);
    expect(viewStyle(part('track')!).backgroundColor).toBe(painted(literal(10, 20, 30)));
    expect(viewStyle(part('indicator')!)).toMatchObject({ backgroundColor: painted(literal(200, 100, 0)), borderRadius: 3 });
    await mount({ variant: 'circular', value: 0.4 }, { theme: 'light', system });
    expect(viewStyle(host())).toMatchObject({ width: 30, height: 30 });
    expect(viewStyle(part('track')!.children[0] as Instance)).toMatchObject({ borderWidth: 3, borderColor: painted(literal(10, 20, 30)) });
  });

  test('a track that resolves to nothing draws nothing', async () => {
    await mount({ value: 0.4 }, { theme: 'light', system: withProgress({ trackColor: { kind: 'none' } }) });
    expect(viewStyle(part('track')!).backgroundColor).toBeUndefined();
    await mount({ value: 0.4, variant: 'circular' }, { theme: 'light', system: withProgress({ trackColor: { kind: 'none' } }) });
    expect(part('track')).toBeNull();
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(progressIndicatorSubject);

  test('every fixture names the indicator (label), so none of them reports PRG-15', () => {
    for (const fixture of spec.fixtures) expect(fixture.props.label).toBeTruthy();
  });
});
