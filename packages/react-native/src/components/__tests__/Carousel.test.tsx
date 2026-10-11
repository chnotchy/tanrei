// Carousel — the arrangement, the scroll-driven placement, settling, the items' states, keyboard, accessibility, token
// binding and fixture baselines. Cases come from specs/carousel.spec.json; every behaviour id is cited by the test that
// covers it.
import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, ScrollView, Text, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCarouselTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { useContentColor } from '../../theme/contentColor';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Carousel, CarouselItem, carouselArrangement, carouselItemAt, type CarouselProps } from '../Carousel';
import { acme } from './__fixtures__/acme';
import { carouselSubject } from './Carousel.subject';

const spec = loadSpec('carousel');
const tokens: TanreiCarouselTokens = tanrei.components.carousel;
const item = tokens.parts.item;
const ID = 'crl';
const HOLD = tanrei.motion.duration.pressHold;
const { measure } = tanrei;

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
const close = (value: number, expected: number) => expect(value).toBeCloseTo(expected, 2);

const LABELS = ['Coast path', 'Old forest', 'Lake shore', 'City park', 'Dunes', 'Summit'];
const element = (props: Partial<CarouselProps> = {}, count = 6, onPress?: (index: number) => void) => (
  <View style={{ width: 400, height: 200 }}>
    <Carousel testID={ID} accessibilityLabel="Walks near you" {...props}>
      {props.children ??
        LABELS.slice(0, count).map((label, index) => (
          <CarouselItem key={label} label={label} onPress={() => onPress?.(index)}>
            <Text>{label}</Text>
          </CarouselItem>
        ))}
    </Carousel>
  </View>
);
function mount(props: Partial<CarouselProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }, count = 6, onPress?: (index: number) => void) {
  return render(<TanreiProvider {...provider}>{element(props, count, onPress)}</TanreiProvider>);
}

const q = (name: string) => screen.queryByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const at = (i: number) => q(`item.${i}`)!;
const box = (i: number) => {
  const style = viewStyle(at(i));
  return { left: style.left as number, width: style.width as number };
};
const scrollBy = (x: number) => fireEvent.scroll(q('row')!, { nativeEvent: { contentOffset: { x, y: 0 } } });
const scrollToSpy = () => jest.spyOn(ScrollView.prototype as unknown as { scrollTo: (options: object) => void }, 'scrollTo').mockImplementation(() => undefined);
const focusSpy = () => jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined).mockClear();
const focused = (spy: jest.SpyInstance) => (spy.mock.contexts.at(-1) as { props?: { testID?: string } } | undefined)?.props?.testID;
const key = (name: string) => fireEvent(q('')!, 'keyDown', { nativeEvent: { key: name }, preventDefault: () => undefined });
const reports = () => jest.mocked(console.warn).mock.calls.map(([message]) => String(message)).filter((message) => message.includes('Carousel'));
const release = async (i: number) => {
  await fireEvent(at(i), 'pressOut');
  await wait(HOLD + 30);
};

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // The spec's stage: the carousel is the window's width (400) until it is laid out.
  Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
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
    expect(platform.name).toBe(Carousel.name);
    expect(platform.props).toEqual({ layout: 'layout', itemWidth: 'itemWidth', label: 'accessibilityLabel' });
    expect(platform.items).toEqual({ item: expect.objectContaining({ name: CarouselItem.name, props: { label: 'label' }, events: { click: 'onPress' } }) });
  });

  test('defaults follow the spec: multi-browse, the tokens\' large width', async () => {
    await mount();
    close(box(0).width, tokens.containerLargeWidth);
  });
});

describe('the arrangement (CRL-8 … CRL-13, CRL-15, CRL-21, CRL-23 … CRL-25)', () => {
  test('CRL-10: multi-browse — n large slots, a medium and a small one filling W exactly (the worked examples)', () => {
    const slots = (width: number, large: number | null) => carouselArrangement(width, tokens, 'multi-browse', large).slots.slice(1, -1).map((slot) => Number(slot.width.toFixed(2)));
    // W 368 (a 400 stage), L 200: n 1, S 50.67, M 101.33.
    expect(slots(400, null)).toEqual([200, 101.33, 50.67]);
    // W 368, L 120: n 2, S 40, M 64.
    expect(slots(400, 120)).toEqual([120, 120, 64, 40]);
    // W 768, L 200: n 3, S 45.33, M 90.67.
    expect(slots(800, null)).toEqual([200, 200, 200, 90.67, 45.33]);
    // W 460, L 120: n 2; S would be 56 and M 140, so M 120 and S 76 (the one case S may exceed small-max-width).
    expect(slots(492, 120)).toEqual([120, 120, 120, 76]);
    for (const width of [400, 492, 800]) {
      const arranged = carouselArrangement(width, tokens, 'multi-browse', null);
      const inView = arranged.slots.slice(1, -1);
      close(inView.at(-1)!.start + inView.at(-1)!.width, arranged.inner);
    }
  });

  test('CRL-11: hero — one large slot W − g − small-max-width wide and the small one at small-max-width; itemWidth ignored', () => {
    const hero = carouselArrangement(400, tokens, 'hero', 90);
    expect(hero.slots.slice(1, -1).map((slot) => slot.width)).toEqual([304, 56]);
    expect(hero.step).toBe(304 + tokens.layoutGap);
  });

  test('CRL-9: L is itemWidth or the token, at most W − 2 × (small-min + g) in multi-browse and W in uncontained; below 3 × small-min + 2g every layout is one slot W wide', () => {
    expect(carouselArrangement(400, tokens, 'multi-browse', 1000).large).toBe(368 - 2 * (tokens.containerSmallMinWidth + tokens.layoutGap));
    expect(carouselArrangement(400, tokens, 'uncontained', 1000).large).toBe(368);
    const narrow = 16 * 2 + 3 * tokens.containerSmallMinWidth + 2 * tokens.layoutGap - 1;
    for (const layout of ['multi-browse', 'hero', 'uncontained'] as const) expect(carouselArrangement(narrow, tokens, layout, null).large).toBe(narrow - 32);
    expect(carouselArrangement(narrow, tokens, 'hero', null).slots.slice(1, -1).map((slot) => slot.width)).toEqual([narrow - 32]);
  });

  test('CRL-12: item i sits at slot i − p, interpolated between the slots around it; slot −1 ends at the start edge, slot K starts at the end edge (the worked example at p 0.5)', () => {
    const arranged = carouselArrangement(400, tokens, 'multi-browse', null);
    const slots = arranged.slots.map((slot) => [Number(slot.start.toFixed(2)), Number(slot.width.toFixed(2))]);
    expect(slots).toEqual([[-66.67, 50.67], [0, 200], [208, 101.33], [317.33, 50.67], [384, 50.67]]);
    const expected = [[-33.33, 125.33], [104, 150.67], [262.67, 76], [350.67, 50.67]];
    expected.forEach(([start, width], index) => {
      const placed = carouselItemAt(arranged, index, 0.5)!;
      close(placed.start, start!);
      close(placed.width, width!);
    });
    expect(carouselItemAt(arranged, 4, 0.5)).toBeNull();
    expect(carouselItemAt(arranged, 5, 0.5)).toBeNull();
  });

  test('CRL-8 / CRL-12: rendered — as wide as its parent, layout.height tall, the items placed in the scroll content from the offset; scrolled half a step, the worked example', async () => {
    await mount();
    expect(viewStyle(q('')!)).toMatchObject({ alignSelf: 'stretch', height: tokens.layoutHeight });
    const P = tokens.layoutPaddingInline;
    close(box(0).left, P);
    close(box(1).left, P + 208);
    close(box(2).left, P + 317.33);
    // Five steps of 208 to scroll (6 items, one large slot).
    expect(q('row')!.props.contentContainerStyle).toMatchObject({ width: 400 + 5 * 208 });
    await scrollBy(104);
    // In the scroll content: the offset plus the padding plus the slot's start.
    close(box(0).left, 104 + P - 33.33);
    close(box(0).width, 125.33);
    close(box(1).left, 104 + P + 104);
    close(box(1).width, 150.67);
    close(box(2).width, 76);
    close(box(3).left, 104 + P + 350.67);
    // Out of view: beyond the end edge.
    expect(box(4).left).toBeGreaterThanOrEqual(104 + 400);
  });

  test('CRL-13: uncontained — every item L wide, g apart from the inner start, scrolling freely to where the last ends at the inner end edge; no scroll while they fit', async () => {
    const scrollTo = scrollToSpy();
    const view = await mount({ layout: 'uncontained' }, { theme: 'light' }, 5);
    [0, 1, 2, 3, 4].forEach((i) => {
      close(box(i).left, 16 + i * 208);
      close(box(i).width, 200);
    });
    expect(q('row')!.props.contentContainerStyle).toMatchObject({ width: 400 + (5 * 200 + 4 * 8 - 368) });
    await scrollBy(150);
    await fireEvent(q('row')!, 'scrollEndDrag', { nativeEvent: { contentOffset: { x: 150, y: 0 }, velocity: { x: 0, y: 0 } } });
    expect(scrollTo).not.toHaveBeenCalled();
    await view.unmount();
    await mount({ layout: 'uncontained', itemWidth: 100 }, { theme: 'light' }, 3);
    expect(q('row')!.props.contentContainerStyle).toMatchObject({ width: 400 });
  });

  test('CRL-15: each item\'s content is laid out at the large width and the item\'s height, centred on the container and clipped to its corners', async () => {
    await mount();
    for (const i of [0, 1, 2]) {
      const content = viewStyle(q(`item.${i}.content`)!);
      expect(content).toMatchObject({ position: 'absolute', top: 0, bottom: 0, width: 200 });
      close(content.left as number, (box(i).width - 200) / 2);
      expect(viewStyle(q(`item.${i}.clip`)!)).toMatchObject({ overflow: 'hidden', borderRadius: tokens.containerShape });
    }
    await scrollBy(104);
    close(viewStyle(q('item.1.content')!).left as number, (150.67 - 200) / 2);
  });

  test('CRL-21: a new width arranges the slots again and keeps the item at slot 0 where it was, without motion', async () => {
    const scrollTo = scrollToSpy();
    await mount();
    await scrollBy(416);
    await fireEvent(q('row')!, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 416, y: 0 } } });
    scrollTo.mockClear();
    await fireEvent(q('')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 800, height: 200 } } });
    // W 768: three large slots (step 208) — item 2 stays at slot 0.
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 2 * 208, animated: false });
    await fireEvent(q('')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 200 } } });
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 2 * 208, animated: false });
  });

  test('CRL-23: right-to-left mirrors the row — slot 0 at the right, the offset starting at the end of the range, items moving right as p grows; the content is not mirrored', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mount();
    const range = 5 * 208;
    expect(q('row')!.props.contentOffset).toEqual({ x: range, y: 0 });
    expect(viewStyle(q('row')!).direction).toBe('ltr');
    // At p 0 (offset = range): slot 0 at the right edge of the view, less the padding.
    close(box(0).left, range + 400 - 16 - 200);
    close(box(1).left, range + 400 - 16 - 208 - 101.33);
    await scrollBy(range - 104);
    close(box(0).width, 125.33);
    close(box(0).left, range - 104 + 400 - (16 - 33.33 + 125.33));
  });

  test('CRL-24: an unknown layout renders as multi-browse; an itemWidth that is not a positive number as null — each reported in development builds', async () => {
    const expected = JSON.stringify((await mount()).toJSON());
    await screen.unmount();
    const view = await mount({ layout: 'grid' as never });
    expect(JSON.stringify(view.toJSON())).toBe(expected);
    await view.unmount();
    for (const bad of [0, -5, Number.NaN]) {
      const again = await mount({ itemWidth: bad });
      expect(JSON.stringify(again.toJSON())).toBe(expected);
      await again.unmount();
    }
    expect(reports()).toEqual([
      expect.stringContaining('Carousel layout "grid" is not defined; using "multi-browse"'),
      expect.stringContaining('itemWidth 0'),
      expect.stringContaining('itemWidth -5'),
      expect.stringContaining('itemWidth NaN'),
    ]);
  });

  test('CRL-25: enlarged text changes nothing the carousel draws — its height, slots and items stay', async () => {
    const expected = JSON.stringify((await mount()).toJSON());
    await screen.unmount();
    Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 2 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 2 } });
    const view = await mount();
    expect(JSON.stringify(view.toJSON())).toBe(expected);
    Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
  });
});

describe('scrolling and focus (CRL-14, CRL-17, CRL-18)', () => {
  test('CRL-14: when a drag ends, multi-browse settles at the nearest whole position, or the next one in a fling\'s direction (0.5 pt/ms), over comp.carousel.motion.scroll-duration with scroll-easing', async () => {
    reduceMotion(false);
    const scrollTo = scrollToSpy();
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    await mount();
    await wait(10);
    const end = (x: number, velocity: number) => fireEvent(q('row')!, 'scrollEndDrag', { nativeEvent: { contentOffset: { x, y: 0 }, velocity: { x: velocity, y: 0 } } });
    await scrollBy(250);
    timing.mockClear();
    await end(250, 0);
    expect(timing.mock.calls.at(-1)![1]).toMatchObject({ toValue: 208, duration: tokens.motionScrollDuration });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionScrollEasing);
    await wait(tokens.motionScrollDuration + 60);
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 208, animated: false });
    await scrollBy(250);
    await end(250, 0.6);
    await wait(tokens.motionScrollDuration + 60);
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 416, animated: false });
    await scrollBy(400);
    await end(400, -0.6);
    await wait(tokens.motionScrollDuration + 60);
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 208, animated: false });
  });

  test('CRL-14: where motion is reduced it settles at once; a momentum scroll that ends between positions settles too', async () => {
    const scrollTo = scrollToSpy();
    await mount({ layout: 'hero' }, { theme: 'light' }, 4);
    await scrollBy(200);
    await fireEvent(q('row')!, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 200, y: 0 } } });
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 312, animated: false });
  });

  test('CRL-17: one Tab stop — the item at slot 0 at first, then the one focused last; Right / Left Arrow move to the next / previous without wrapping, Home and End to the first and last; mirrored in right-to-left', async () => {
    scrollToSpy();
    const focusables = () => [0, 1, 2, 3, 4, 5].map((i) => at(i).props.focusable);
    const view = await mount();
    expect(focusables()).toEqual([true, false, false, false, false, false]);
    const spy = focusSpy();
    await key('ArrowRight');
    expect(focused(spy)).toBe(`${ID}.item.1`);
    await fireEvent(at(1), 'focus');
    expect(focusables()).toEqual([false, true, false, false, false, false]);
    await key('End');
    expect(focused(spy)).toBe(`${ID}.item.5`);
    await fireEvent(at(5), 'focus');
    await key('ArrowRight');
    expect(focused(spy)).toBe(`${ID}.item.5`);
    await key('Home');
    expect(focused(spy)).toBe(`${ID}.item.0`);
    await view.unmount();
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mount();
    const mirrored = focusSpy();
    await key('ArrowLeft');
    expect(focused(mirrored)).toBe(`${ID}.item.1`);
  });

  test('CRL-17: after scrolling, the Tab stop is the item at slot 0 (multi-browse) or the first wholly in view (uncontained)', async () => {
    scrollToSpy();
    const view = await mount();
    await scrollBy(416);
    await fireEvent(q('row')!, 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 416, y: 0 } } });
    expect(at(2).props.focusable).toBe(true);
    await view.unmount();
    await mount({ layout: 'uncontained' }, { theme: 'light' }, 5);
    await scrollBy(150);
    await fireEvent(q('row')!, 'scrollEndDrag', { nativeEvent: { contentOffset: { x: 150, y: 0 }, velocity: { x: 0, y: 0 } } });
    expect(at(1).props.focusable).toBe(true);
  });

  test('CRL-18: an item that takes keyboard focus is scrolled to slot 0 (as near as the range allows) — uncontained: just wholly into view — over the scroll motion (at once where reduced)', async () => {
    const scrollTo = scrollToSpy();
    const view = await mount();
    await fireEvent(at(3), 'focus');
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 3 * 208, animated: false });
    await fireEvent(at(5), 'focus');
    // The range ends at p 5 (6 items, one large slot).
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 5 * 208, animated: false });
    await view.unmount();
    scrollTo.mockClear();
    await mount({ layout: 'uncontained' }, { theme: 'light' }, 5);
    await fireEvent(at(1), 'focus');
    // 16 + 208 + 200 + 16 = 440 > 400: scroll 40 so the item ends at the inner end edge.
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 40, animated: false });
    scrollTo.mockClear();
    await fireEvent(at(0), 'focus');
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, animated: false });
  });
});

describe('the items (CRL-1 … CRL-7, CRL-16, CRL-22)', () => {
  /** CRL-16: the state layer over the content — item.state-layer.color at the state's sys.state opacity; none at rest. */
  const layerOf = (state: Exclude<InteractionState, 'disabled'>, system: TanreiSystem = tanrei) => {
    if (state === 'enabled') return undefined;
    const color = evaluatePaint(system.components.carousel.parts.item[state].stateLayerColor, system.colors.light);
    const amount = { hovered: system.state.hoverStateLayerOpacity, focused: system.state.focusStateLayerOpacity, pressed: system.state.pressedStateLayerOpacity }[state];
    return formatColor({ ...color, a: color.a * amount });
  };
  const expectDrawnFrom = (i: number, state: Exclude<InteractionState, 'disabled'>, system: TanreiSystem = tanrei, layer: Exclude<InteractionState, 'disabled'> = state) => {
    const from = system.components.carousel;
    const opacity = { enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity }[state];
    const shape = { enabled: from.containerShape, hovered: from.hoveredContainerShape, focused: from.focusedContainerShape, pressed: from.pressedContainerShape }[state];
    // The container under the content keeps the resting fill in every state.
    expect(viewStyle(at(i))).toMatchObject({ backgroundColor: painted(from.parts.item.enabled.containerColor, 'light', system), opacity, borderRadius: shape });
    const drawnLayer = q(`item.${i}.state-layer`);
    expect(drawnLayer ? viewStyle(drawnLayer).backgroundColor : undefined).toBe(layerOf(layer, system));
  };

  test('CRL-1: activating an item emits its click once; a press that the row takes over as a scroll does not activate it', async () => {
    const pressed = jest.fn();
    await mount({}, { theme: 'light' }, 6, pressed);
    await fireEvent.press(at(1));
    expect(pressed.mock.calls).toEqual([[1]]);
    // The row takes the gesture: the item's press ends without a click.
    await fireEvent(at(2), 'pressIn');
    await fireEvent(at(2), 'pressOut');
    expect(pressed.mock.calls).toEqual([[1]]);
    const ancestors: (string | undefined)[] = [];
    for (let node = at(2).parent; node; node = node.parent) ancestors.push(node.props?.testID);
    expect(ancestors).toContain(`${ID}.row`);
    await wait(HOLD + 30);
  });

  test('CRL-2: precedence is pressed over focused over hovered, under the acme fixture system; focus that comes with a press does not select focused', async () => {
    scrollToSpy();
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map((state) => layerOf(state, acme))).size).toBe(4);
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(at(0), 'hoverIn');
    expectDrawnFrom(0, 'hovered', acme);
    await fireEvent(at(0), 'focus');
    expectDrawnFrom(0, 'focused', acme);
    await fireEvent(at(0), 'pressIn');
    expectDrawnFrom(0, 'pressed', acme);
    await release(0);
    expectDrawnFrom(0, 'focused', acme);
    await fireEvent(at(0), 'blur');
    await fireEvent(at(0), 'hoverOut');
    await fireEvent(at(0), 'pressIn');
    await fireEvent(at(0), 'focus');
    await release(0);
    expectDrawnFrom(0, 'enabled', acme);
  });

  test('CRL-3: keyboard focus shows the focus ring inside the item\'s container, without animation; focus that comes with a press does not', async () => {
    scrollToSpy();
    await mount();
    await fireEvent(at(0), 'focus');
    const ring = viewStyle(q('item.0.focus-ring')!);
    expect(ring).toMatchObject({ position: 'absolute', borderWidth: measure.focus.outerWidth, borderColor: formatColor(tanrei.colors.light.focusRing) });
    // Inside: its outer edge on the container's edge.
    expect(ring.top).toBe(0);
    await fireEvent(at(0), 'blur');
    await fireEvent(at(1), 'pressIn');
    await fireEvent(at(1), 'focus');
    expect(q('item.1.focus-ring')).toBeNull();
    await release(1);
  });

  test('CRL-4: the hit area is the container with half the gap on each side — a small item at small-min-width reaches sys.target.touch — and never less than the target where a system\'s widths give less; the drawn item is unchanged', async () => {
    const view = await mount({ itemWidth: 120 });
    // Item 3 rests in the small slot at small-min-width (40): 40 + 2 × 4 = 48.
    close(box(3).width, tokens.containerSmallMinWidth);
    expect(at(3).props.hitSlop).toEqual({ top: 0, bottom: 0, left: tokens.layoutGap / 2, right: tokens.layoutGap / 2 });
    expect(tokens.containerSmallMinWidth + tokens.layoutGap).toBe(measure.target.touch);
    await view.unmount();
    const tight = withComponent(tanrei, 'carousel', { containerSmallMinWidth: 30, containerSmallMaxWidth: 30, layoutHeight: 40 });
    await mount({ itemWidth: 120, style: { height: 40 } }, { theme: 'light', system: tight });
    await fireEvent(q('')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 40 } } });
    const small = [0, 1, 2, 3, 4, 5].find((i) => Math.abs(box(i).width - 30) < 0.01)!;
    expect(at(small).props.hitSlop).toEqual({ top: 4, bottom: 4, left: 9, right: 9 });
    close(box(small).width, 30);
  });

  test('CRL-5: the pressed state appears at once and stays visible for duration.pressHold; a bare click shows it too', async () => {
    await mount();
    await fireEvent(at(0), 'pressIn');
    expectDrawnFrom(0, 'pressed');
    await fireEvent(at(0), 'pressOut');
    await wait(HOLD / 2);
    expectDrawnFrom(0, 'pressed');
    await wait(HOLD / 2 + 30);
    expectDrawnFrom(0, 'enabled');
    await fireEvent(at(0), 'press', { nativeEvent: { target: 1 } });
    expectDrawnFrom(0, 'pressed');
    await wait(HOLD + 30);
  });

  test('CRL-6: overlay (the default), ripple (m3-like, from the point of contact), dim (cupertino) and none', async () => {
    const first = await mount();
    await fireEvent(at(0), 'pressIn');
    expect(q('item.0.ripple')).toBeNull();
    expectDrawnFrom(0, 'pressed');
    await release(0);
    await first.unmount();

    reduceMotion(false);
    const m3 = m3Like.components.carousel;
    const timing = jest.spyOn(Animated, 'timing');
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 200, 200, 16, 0));
    const second = await mount({}, { theme: 'light', system: m3Like });
    await fireEvent(at(0), 'layout', { nativeEvent: { layout: { x: 16, y: 0, width: 200, height: 200 } } });
    timing.mockClear();
    await fireEvent(at(0), 'pressIn', { nativeEvent: { pageX: 66, pageY: 50 } });
    const reach = Math.hypot(200 - 50, 200 - 50);
    // CRL-16: the ripple is the pressed state layer (state-layer.color at the pressed opacity), over the content.
    expect(viewStyle(q('item.0.ripple.wave')!)).toMatchObject({ left: 50 - reach, top: 50 - reach, backgroundColor: layerOf('pressed', m3Like) });
    const children = (at(0).children as Instance[]).map((each) => each.props.testID);
    expect(children.indexOf(`${ID}.item.0.ripple`)).toBeGreaterThan(children.indexOf(`${ID}.item.0.clip`));
    expect(viewStyle(at(0)).backgroundColor).toBe(painted(m3.parts.item.enabled.containerColor, 'light', m3Like));
    // While the ripple draws, the layer is the state under the press: none at rest.
    expect(q('item.0.state-layer')).toBeNull();
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: m3.motionFeedbackDuration });
    await release(0);
    await wait(m3.motionStateDuration * 2 + 50);
    await second.unmount();

    reduceMotion(true);
    const cup = cupertino.components.carousel;
    const third = await mount({}, { theme: 'light', system: cupertino });
    await fireEvent(at(0), 'pressIn');
    expect(viewStyle(at(0))).toMatchObject({ opacity: cup.pressedOpacity, backgroundColor: painted(cup.parts.item.enabled.containerColor, 'light', cupertino) });
    expect(q('item.0.state-layer')).toBeNull();
    expect(cup.pressedOpacity).toBeLessThan(1);
    await release(0);
    await third.unmount();

    const pressed = jest.fn();
    await mount({}, { theme: 'light', system: withBehavior({ pressedFeedback: 'none' }) }, 6, pressed);
    await fireEvent(at(0), 'pressIn');
    expectDrawnFrom(0, 'enabled');
    await fireEvent.press(at(0));
    expect(pressed).toHaveBeenCalledTimes(1);
    await release(0);
  });

  test('CRL-7: the corners ease by the smoothing (cupertino: continuous; the default: circular); glow (acme) is one halo', async () => {
    scrollToSpy();
    const view = await mount({}, { theme: 'light', system: cupertino });
    expect(viewStyle(at(0))).toMatchObject({ borderCurve: 'continuous', borderRadius: cupertino.components.carousel.containerShape });
    expect(viewStyle(q('item.0.clip')!).borderCurve).toBe('continuous');
    await view.unmount();
    const plain = await mount();
    expect(viewStyle(at(0)).borderCurve).toBeUndefined();
    await plain.unmount();
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(at(0), 'focus');
    expect(viewStyle(q('item.0.focus-ring')!).boxShadow).toHaveLength(1);
  });

  test('CRL-16: the state layer is drawn OVER the item\'s content — item.state-layer.color at the state\'s sys.state opacity, clipped to the corners, hidden, only while it draws — and the container under the content keeps the resting fill', async () => {
    scrollToSpy();
    await mount({}, { theme: 'light', system: acme });
    expect(q('item.0.state-layer')).toBeNull();
    await fireEvent(at(0), 'hoverIn');
    const layer = q('item.0.state-layer')!;
    expect(viewStyle(layer)).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: acme.components.carousel.hoveredContainerShape, backgroundColor: layerOf('hovered', acme) });
    expect(layer.props).toMatchObject({ pointerEvents: 'none', importantForAccessibility: 'no-hide-descendants' });
    const children = (at(0).children as Instance[]).map((each) => each.props.testID);
    expect(children.indexOf(`${ID}.item.0.state-layer`)).toBeGreaterThan(children.indexOf(`${ID}.item.0.clip`));
    expect(viewStyle(at(0)).backgroundColor).toBe(painted(acme.components.carousel.parts.item.enabled.containerColor, 'light', acme));
    await fireEvent(at(0), 'hoverOut');
    expect(q('item.0.state-layer')).toBeNull();
  });

  test('CRL-16: each item\'s container is filled with item.container.color (its resting fill), and its content handed item.content.color — in light and dark', async () => {
    for (const scheme of ['light', 'dark'] as const) {
      let handed: string | undefined;
      function Content() {
        handed = useContentColor();
        return <Text>Walk</Text>;
      }
      const view = await mount({ children: <CarouselItem label="Walk"><Content /></CarouselItem> }, { theme: scheme });
      expect(viewStyle(at(0)).backgroundColor).toBe(painted(item.enabled.containerColor, scheme));
      expect(handed).toBe(painted(item.enabled.contentColor, scheme));
      await view.unmount();
    }
    const custom = withComponent(tanrei, 'carousel', { parts: { item: { ...item, enabled: { ...item.enabled, containerColor: { kind: 'role', role: 'primaryContainer' } } } } });
    await mount({}, { theme: 'light', system: custom });
    expect(viewStyle(at(0)).backgroundColor).toBe(painted({ kind: 'role', role: 'primaryContainer' }));
  });

  test('CRL-22: an item\'s colors move over comp.carousel.motion.state-duration with state-easing, and at once where motion is reduced', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    await mount({}, { theme: 'light', system: acme });
    await wait(10);
    timing.mockClear();
    await fireEvent(at(0), 'hoverIn');
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    await wait(tokens.motionStateDuration + 50);
  });
});

describe('accessibility (CRL-19, CRL-20)', () => {
  test('CRL-19: a list named by the label; each item one button named by its label, its content hidden; items out of view stay exposed, in order', async () => {
    await mount();
    expect(q('')!.props).toMatchObject({ role: 'list', accessibilityLabel: 'Walks near you' });
    expect(screen.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual(LABELS);
    expect(q('item.0.content')!.props).toMatchObject({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' });
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain("the screen reader's own count");
  });

  test('CRL-20: an item without a label and a carousel without one still render, and are reported in development builds only; the README states that an item\'s content holds no interactive element', async () => {
    await mount({ accessibilityLabel: '', children: [
        <CarouselItem key="a" label="">
          <Text>x</Text>
        </CarouselItem>,
        <CarouselItem key="b" label="Old forest">
          <Text>y</Text>
        </CarouselItem>,
      ] });
    expect(at(0)).not.toBeNull();
    expect(reports().sort()).toEqual([expect.stringContaining('a Carousel (testID "crl") has no accessibilityLabel'), expect.stringContaining('a CarouselItem (testID "crl.item.0") (item 1 of its Carousel) has no label')]);
    await screen.unmount();
    development(false);
    jest.mocked(console.warn).mockClear();
    await mount({ accessibilityLabel: '' });
    expect(reports()).toEqual([]);
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('holds no interactive element');
  });
});

describe('fixture baselines', () => {
  describeFixtureBaselines(carouselSubject);
});
