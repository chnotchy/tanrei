// LoadingIndicator — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/loading-indicator.spec.json; every behaviour id is cited by the test that covers it.
import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, AppState, View, type AppStateStatus } from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCoreLoadingIndicatorSize, TanreiLoadingIndicatorTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, painted, settleMotion, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { createTanreiTheme, TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { resetLookupReports } from '../../theme/lookup';
import { toEasing } from '../../theme/motion';
import { LoadingIndicator, type LoadingIndicatorProps, type LoadingIndicatorSize } from '../LoadingIndicator';
import { loadingIndicatorSubject } from './LoadingIndicator.subject';

const spec = loadSpec('loading-indicator');
const tokens: TanreiLoadingIndicatorTokens = tanrei.components.loadingIndicator;
const ID = 'loading';
const LABEL = 'Loading';
const sizes: TanreiCoreLoadingIndicatorSize[] = ['small', 'medium', 'large'];

const hidden = { includeHiddenElements: true } as const;
const host = (): Instance => screen.getByTestId(ID);
const part = (name: string): Instance | null => screen.queryByTestId(`${ID}.${name}`, hidden);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const withLoading = (overrides: Partial<TanreiLoadingIndicatorTokens>, base: TanreiSystem = tanrei) => withComponent(base, 'loadingIndicator', overrides);

const element = (props: Partial<LoadingIndicatorProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) => (
  <TanreiProvider {...provider}>
    <LoadingIndicator testID={ID} accessibilityLabel={LABEL} {...props} />
  </TanreiProvider>
);
const mount = (props: Partial<LoadingIndicatorProps> = {}, provider?: Omit<TanreiProviderProps, 'children'>) => render(element(props, provider));

const rotate = (node: Instance) => (viewStyle(node).transform as { rotate: string }[])[0]!.rotate;
const innerRotate = (half: Instance) => rotate((half.children[0] as Instance).children[0] as Instance);
/** The one bordered circle of a whole-circle arc. */
const circle = (arc: Instance) => viewStyle(arc.children[0] as Instance);

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

/** Loops are captured, never run: a test reads the animation they were given and drives its value itself. */
function captureLoops() {
  const loops: { start: jest.Mock; stop: jest.Mock }[] = [];
  jest.spyOn(Animated, 'loop').mockImplementation(() => {
    const handle = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    loops.push(handle);
    return handle as unknown as Animated.CompositeAnimation;
  });
  return loops;
}

settleMotion();
let warn: jest.SpyInstance;
beforeEach(() => {
  // Loops never run in these tests (a running loop moves the drawing outside act and after the baseline): every test
  // sees the start of a cycle; a test that reads a loop captures it again with `captureLoops()`.
  captureLoops();
  resetLookupReports();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
const reports = () => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('LoadingIndicator'));

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(LoadingIndicator.name);
    expect(platform.props).toEqual({ size: 'size', contained: 'contained', label: 'accessibilityLabel' });
  });

  test('the size values under test are exactly the spec values, and they are the token axis', () => {
    expect(spec.props.find((p) => p.name === 'size')?.values).toEqual(sizes);
    expect(Object.keys(tokens.sizes)).toEqual(sizes);
  });

  test('defaults follow the spec: medium, not contained', async () => {
    await mount();
    expect(viewStyle(host())).toEqual({ alignSelf: 'flex-start', width: tokens.sizes.medium.indicatorSize, height: tokens.sizes.medium.indicatorSize });
  });
});

describe('behavior', () => {
  test.each(sizes)('LDG-1: %s — a quarter arc with round caps, stroke indicator.thickness, its outer edge on the indicator.size square, turning clockwise once per cycle at constant speed, with no track', async (size) => {
    reduceMotion(false);
    const loops = captureLoops();
    const timing = jest.spyOn(Animated, 'timing');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await mount({ size });
    const { indicatorSize, indicatorThickness } = tokens.sizes[size];
    const arc = part('indicator')!;
    expect(viewStyle(arc)).toMatchObject({ width: indicatorSize, height: indicatorSize });
    // A quarter: one half, clipped to 90°, from the top.
    expect(rotate(part('indicator.first')!)).toBe('0deg');
    expect(innerRotate(part('indicator.first')!)).toBe('-90deg');
    expect(part('indicator.second')).toBeNull();
    const ringOf = ((part('indicator.first')!.children[0] as Instance).children[0] as Instance).children[0] as Instance;
    expect(viewStyle(ringOf.children[0] as Instance)).toMatchObject({ width: indicatorSize, height: indicatorSize, borderRadius: indicatorSize / 2, borderWidth: indicatorThickness });
    // Round caps at both ends: dots of the stroke's width.
    expect(rotate(part('indicator.start-cap')!)).toBe('0deg');
    expect(rotate(part('indicator.end-cap')!)).toBe('90deg');
    expect(viewStyle(part('indicator.end-cap')!.children[0] as Instance)).toMatchObject({ width: indicatorThickness, height: indicatorThickness, borderRadius: indicatorThickness / 2 });
    // No track: the arc is the only thing drawn.
    expect(host().children).toHaveLength(1);
    // Turning: once per cycle, linear (sys.motion.easing.linear), native driver.
    expect(loops).toHaveLength(1);
    const [value, config] = timing.mock.calls.at(-1)!;
    expect(config).toMatchObject({ toValue: 1, duration: tokens.motionCycleDuration, useNativeDriver: true });
    const linear = toEasing(tanrei.motion.easing.linear);
    for (const t of [0.1, 0.5, 0.9]) expect(config.easing!(t)).toBeCloseTo(linear(t), 10);
    const turn = interpolate.mock.results.map((r) => r.value as Animated.AnimatedInterpolation<string>).at(-1)!;
    const at = async (ms: number) => {
      await act(async () => (value as Animated.Value).setValue(config.easing!(ms / tokens.motionCycleDuration)));
      return (turn as unknown as { __getValue(): string }).__getValue();
    };
    expect([await at(0), await at(tokens.motionCycleDuration / 4), await at(tokens.motionCycleDuration / 2), await at(tokens.motionCycleDuration)]).toEqual(['0deg', '90deg', '180deg', '360deg']);
  });

  test.each([
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('LDG-2: not contained, it takes exactly its indicator square, draws no container, and the arc is indicator.color (%s)', async (_name, theme) => {
    const scheme: TanreiScheme = theme;
    await mount({}, { theme });
    const { indicatorSize } = tokens.sizes.medium;
    expect(viewStyle(host())).toEqual({ alignSelf: 'flex-start', width: indicatorSize, height: indicatorSize });
    expect(part('elevation-ring')).toBeNull();
    // (Reduced motion is on: the arc is the whole circle.)
    expect(circle(part('indicator')!).borderColor).toBe(painted(tokens.indicatorColor, scheme));
  });

  test.each(sizes.flatMap((size) => [
    [size, 'light'],
    [size, 'dark'],
  ] as const))('LDG-3: contained %s — a container.size circle of container.shape in contained.container.color, raised by its elevation, the indicator centered in contained.indicator.color (%s)', async (size, theme) => {
    const scheme: TanreiScheme = theme;
    await mount({ size, contained: true }, { theme });
    const { containerSize, indicatorSize } = tokens.sizes[size];
    const elevation = createTanreiTheme(tanrei, scheme).elevation(tokens.containedContainerElevation);
    expect(viewStyle(host())).toMatchObject({
      width: containerSize,
      height: containerSize,
      borderRadius: tokens.containerShape,
      backgroundColor: painted(tokens.containedContainerColor, scheme),
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: elevation.boxShadow,
    });
    expect(viewStyle(part('elevation-ring')!)).toMatchObject({ borderWidth: elevation.ring!.width, borderColor: elevation.ring!.color, borderRadius: tokens.containerShape + elevation.ring!.width });
    expect(viewStyle(part('motion')!)).toMatchObject({ width: indicatorSize, height: indicatorSize });
    expect(circle(part('indicator')!).borderColor).toBe(painted(tokens.containedIndicatorColor, scheme));
  });

  test('LDG-3: a container elevation of level0 draws no shadow and no ring', async () => {
    await mount({ contained: true }, { theme: 'light', system: withLoading({ containedContainerElevation: 'level0' }) });
    expect(viewStyle(host()).boxShadow).toBeUndefined();
    expect(part('elevation-ring')).toBeNull();
  });

  test.each([false, true])('LDG-4: under reduced motion (contained: %s) it does not turn: the whole circle at the indicator\'s size and stroke, its opacity 1 → 0 → 1 once per cycle with sys.motion.easing.standard; a container stays still and opaque', async (contained) => {
    const loops = captureLoops();
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ contained });
    const { indicatorSize, indicatorThickness } = tokens.sizes.medium;
    expect(viewStyle(part('motion')!)).toMatchObject({ opacity: 1 });
    expect(viewStyle(part('motion')!).transform).toBeUndefined();
    expect(circle(part('indicator')!)).toMatchObject({ width: indicatorSize, height: indicatorSize, borderRadius: indicatorSize / 2, borderWidth: indicatorThickness });
    expect(part('indicator.start-cap')).toBeNull();
    expect(loops).toHaveLength(1);
    const pulse = timing.mock.calls.slice(-2);
    expect(pulse.map(([, config]) => config.toValue)).toEqual([0, 1]);
    const standard = toEasing(tanrei.motion.easing.standard);
    for (const [, config] of pulse) {
      expect(config).toMatchObject({ duration: tokens.motionCycleDuration / 2, useNativeDriver: true });
      expect(config.easing!(0.3)).toBeCloseTo(standard(0.3), 10);
    }
    // The container is the host: no opacity, no transform.
    expect(viewStyle(host()).opacity).toBeUndefined();
    expect(viewStyle(host()).transform).toBeUndefined();
  });

  test('LDG-4: no loop starts before the platform has said whether motion is reduced', async () => {
    const loops = captureLoops();
    let answer: (value: boolean) => void = () => undefined;
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    await mount();
    expect(loops).toHaveLength(0);
    await act(async () => answer(true));
    expect(loops).toHaveLength(1);
  });

  test('LDG-5: a progressbar named by the label, busy, with no current value', async () => {
    await mount({ contained: true });
    const bar = screen.getByRole('progressbar', { name: LABEL });
    expect(bar).toBe(host());
    expect(bar.props.accessibilityState).toEqual({ busy: true });
    expect(bar.props.accessibilityValue).toBeUndefined();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  test('LDG-6: never focusable, never a live region, and nothing is announced when it appears or disappears', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const view = await mount();
    expect(host().props.focusable).toBe(false);
    expect(host().props.accessibilityLiveRegion).toBeUndefined();
    await view.rerender(
      <TanreiProvider theme="light">
        <View />
      </TanreiProvider>,
    );
    expect(announce).not.toHaveBeenCalled();
  });

  test('LDG-7: the animation stops while the app is in the background and resumes when it comes back', async () => {
    reduceMotion(false);
    const loops = captureLoops();
    let onChange: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      onChange = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    await mount();
    expect(loops).toHaveLength(1);
    expect(loops[0]!.start).toHaveBeenCalled();
    await act(async () => onChange('background'));
    expect(loops[0]!.stop).toHaveBeenCalled();
    await act(async () => onChange('active'));
    expect(loops).toHaveLength(2);
    expect(loops[1]!.start).toHaveBeenCalled();
  });

  test('LDG-8: never mirrored — the arc is laid out left-to-right and turns clockwise in every direction', async () => {
    reduceMotion(false);
    captureLoops();
    await render(
      <TanreiProvider theme="light">
        <View style={{ direction: 'rtl' }}>
          <LoadingIndicator testID={ID} accessibilityLabel={LABEL} />
        </View>
      </TanreiProvider>,
    );
    expect(viewStyle(part('indicator')!).direction).toBe('ltr');
    expect(rotate(part('indicator.end-cap')!)).toBe('90deg');
  });

  test('LDG-9: an unknown size renders as medium and is reported in development builds', async () => {
    const expected = JSON.stringify((await mount()).toJSON());
    expect(reports()).toEqual([]);
    expect(JSON.stringify((await mount({ size: 'huge' as LoadingIndicatorSize })).toJSON())).toBe(expected);
    expect(reports()).toEqual([expect.stringContaining('LoadingIndicator size "huge"; using "medium"')]);
  });

  test('LDG-10: without a label it still renders, and development builds say it has no accessible name', async () => {
    await render(
      <TanreiProvider theme="light">
        <LoadingIndicator testID={ID} />
      </TanreiProvider>,
    );
    expect(host()).toBeTruthy();
    expect(reports()).toEqual([expect.stringContaining('has no accessibilityLabel')]);
    warn.mockClear();
    await mount();
    expect(reports()).toEqual([]);
  });
});

describe('the system drives rendering', () => {
  test('changed tokens reach the arc and the container', async () => {
    const system = withLoading({
      indicatorColor: literal(10, 20, 30),
      containedContainerColor: literal(250, 240, 230),
      containedIndicatorColor: literal(200, 0, 0),
      containerShape: 8,
      sizes: { ...tokens.sizes, medium: { indicatorSize: 30, indicatorThickness: 3, containerSize: 44 } },
    });
    await mount({}, { theme: 'light', system });
    expect(viewStyle(host())).toMatchObject({ width: 30, height: 30 });
    expect(circle(part('indicator')!)).toMatchObject({ width: 30, borderWidth: 3, borderColor: painted(literal(10, 20, 30)) });
    await mount({ contained: true }, { theme: 'light', system });
    expect(viewStyle(host())).toMatchObject({ width: 44, height: 44, borderRadius: 8, backgroundColor: painted(literal(250, 240, 230)) });
    expect(circle(part('indicator')!).borderColor).toBe(painted(literal(200, 0, 0)));
  });

  test('an indicator color that resolves to nothing draws no arc', async () => {
    await mount({}, { theme: 'light', system: withLoading({ indicatorColor: { kind: 'none' } }) });
    expect(part('indicator')).toBeNull();
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(loadingIndicatorSubject);

  test('every fixture names the indicator (label), so none of them reports LDG-10', () => {
    for (const fixture of spec.fixtures) expect(fixture.props.label).toBeTruthy();
  });
});
