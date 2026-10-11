// AppBar — behaviour, accessibility, layout, insets, the scroll connection, token binding and fixture baselines.
// Cases come from specs/app-bar.spec.json; every behaviour id is cited by the test that covers it.
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiAppBarConditionTokens, TanreiAppBarTokens, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, painted, textStyle, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { AppBar, useAppBarScroll, type AppBarProps, type AppBarScroll } from '../AppBar';
import { IconButton } from '../IconButton';
import { appBarSubject } from './AppBar.subject';

const spec = loadSpec('app-bar');
const tokens: TanreiAppBarTokens = tanrei.components.appBar;
const ID = 'bar';
const small = tokens.sizes.small;
const large = tokens.sizes.large;

const withAppBar = (overrides: Partial<TanreiAppBarTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'appBar', overrides);
const withCondition = (condition: 'flat' | 'scrolled', overrides: Partial<TanreiAppBarConditionTokens>, base: TanreiSystem = tanrei): TanreiSystem =>
  withAppBar({ conditions: { ...base.components.appBar.conditions, [condition]: { ...base.components.appBar.conditions[condition], ...overrides } } }, base);
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};
const text = (role: Parameters<ReturnType<typeof createTanreiTheme>['text']>[0], system: TanreiSystem = tanrei) => createTanreiTheme(system, 'light').text(role);

const BACK = (
  <IconButton accessibilityLabel="Back" testID="back">
    arrow_back
  </IconButton>
);
const ACTIONS = (
  <>
    <IconButton accessibilityLabel="Search" testID="search">
      search
    </IconButton>
    <IconButton accessibilityLabel="More options" testID="more">
      more_vert
    </IconButton>
  </>
);

function mount(props: Partial<AppBarProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <AppBar testID={ID} title="Inbox" navigation={BACK} actions={ACTIONS} {...props} />
    </TanreiProvider>,
  );
}

/** A screen with a connected scroll view: the bar and the hook, as a product writes them. */
function Connected({ bar, grab }: { bar: Partial<AppBarProps>; grab: (scroll: AppBarScroll) => void }) {
  const scroll = useAppBarScroll();
  grab(scroll);
  return <AppBar testID={ID} title="Inbox" navigation={BACK} actions={ACTIONS} {...bar} scrollState={scroll.state} />;
}
async function mountConnected(bar: Partial<AppBarProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  let scroll: AppBarScroll | null = null;
  let renders = 0;
  function Screen({ children }: { children: ReactNode }) {
    renders += 1;
    return <>{children}</>;
  }
  const view = await render(
    <TanreiProvider {...provider}>
      <Screen>
        <Connected bar={bar} grab={(value) => (scroll = value)} />
      </Screen>
    </TanreiProvider>,
  );
  const scrollTo = (y: number) => act(async () => scroll!.onScroll({ nativeEvent: { contentOffset: { x: 0, y } } } as NativeSyntheticEvent<NativeScrollEvent>));
  return { view, scrollTo, renders: () => renders };
}

const host = () => screen.getByTestId(ID);
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const layout = (instance: Instance, box: { x?: number; y?: number; width?: number; height: number }) => fireEvent(instance, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 0, ...box } } });
const hidden = (instance: Instance | null) => instance?.props.accessibilityElementsHidden === true;
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

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
  test('the React Native mapping in the spec matches this implementation: AppBar, its props, and IconButton items', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(AppBar.name);
    expect(platform.props).toEqual({ size: 'size', title: 'title', subtitle: 'subtitle', titleAlignment: 'titleAlignment', scrolled: 'scrolled' });
    expect(platform.items?.navigation).toMatchObject({ name: IconButton.name, props: { label: 'accessibilityLabel' }, events: { click: 'onPress' } });
    expect(platform.items?.action).toMatchObject({ name: IconButton.name, props: { label: 'accessibilityLabel' }, events: { click: 'onPress' } });
  });

  test('size is the token axis (small, the default, and large); titleAlignment is closed (start, center); the conditions are flat and scrolled', () => {
    expect(Object.keys(tokens.sizes)).toEqual(['small', 'large']);
    expect(spec.props.find((p) => p.name === 'titleAlignment')?.values).toEqual(['start', 'center']);
    expect(Object.keys(tokens.conditions)).toEqual(['flat', 'scrolled']);
  });
});

describe('conditions (APB-1 … APB-3)', () => {
  test.each(['light', 'dark'] as const)('APB-1: while scrolled is false the container is comp.app-bar.flat.container.color at flat.container.elevation, and the flat edge (transparent) draws nothing (%s)', async (theme) => {
    await mount({}, { theme });
    const scheme: TanreiScheme = theme;
    expect(viewStyle(host()).backgroundColor).toBe(painted(tokens.conditions.flat.containerColor, scheme));
    expect(viewStyle(host()).boxShadow).toBeUndefined();
    expect(tanrei.elevation[tokens.conditions.flat.containerElevation]).toEqual([]);
    expect(part('outline')).toBeNull();
  });

  test.each(['light', 'dark'] as const)('APB-2: while scrolled is true the container is scrolled.container.color and the bottom edge comp.app-bar.outline.width thick in scrolled.outline.color (%s)', async (theme) => {
    await mount({ scrolled: true }, { theme });
    const scheme: TanreiScheme = theme;
    expect(viewStyle(host()).backgroundColor).toBe(painted(tokens.conditions.scrolled.containerColor, scheme));
    expect(viewStyle(part('outline')!)).toMatchObject({ position: 'absolute', start: 0, end: 0, bottom: 0, height: tokens.outlineWidth, backgroundColor: painted(tokens.conditions.scrolled.outlineColor, scheme) });
    expect(painted(tokens.conditions.scrolled.outlineColor, scheme)).toBe(painted({ kind: 'role', role: 'outlineVariant' }, scheme));
    expect(hidden(part('outline'))).toBe(true);
  });

  test('APB-1 / APB-2: the values drive the drawing — a system that raises and tints the scrolled bar and edges the flat one', async () => {
    const system = withCondition('scrolled', { containerColor: { kind: 'role', role: 'surfaceContainer' }, containerElevation: 'level2' }, withCondition('flat', { outlineColor: { kind: 'role', role: 'outline' } }));
    const view = await mount({}, { theme: 'light', system });
    expect(viewStyle(part('outline')!).backgroundColor).toBe(painted({ kind: 'role', role: 'outline' }));
    await view.unmount();
    await mount({ scrolled: true }, { theme: 'light', system });
    expect(viewStyle(host()).backgroundColor).toBe(painted({ kind: 'role', role: 'surfaceContainer' }));
    expect(viewStyle(host()).boxShadow).toEqual(createTanreiTheme(system, 'light').elevation('level2').boxShadow);
    // The default system's level2 has its hairline ring, drawn outside the bar.
    expect(part('elevation-ring')).not.toBeNull();
  });

  test('APB-3: WHEN scrolled changes the color, elevation and edge move over comp.app-bar.motion.condition-duration with condition-easing', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const view = await mount();
    await wait(0);
    timing.mockClear();
    await view.rerender(
      <TanreiProvider theme="light">
        <AppBar testID={ID} title="Inbox" scrolled />
      </TanreiProvider>,
    );
    const move = timing.mock.calls.find(([, config]) => config.duration === tokens.motionConditionDuration);
    expect(move?.[1]).toMatchObject({ toValue: 1 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionConditionEasing);
    // While it moves the edge is drawn (fading in) and the fill is an interpolation.
    expect(part('outline')).not.toBeNull();
    await wait(tokens.motionConditionDuration + 100);
    expect(viewStyle(part('outline')!).backgroundColor).toBe(painted(tokens.conditions.scrolled.outlineColor));
  });

  test('APB-3: at once where motion is reduced', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount();
    await view.rerender(
      <TanreiProvider theme="light">
        <AppBar testID={ID} title="Inbox" scrolled />
      </TanreiProvider>,
    );
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionConditionDuration)).toHaveLength(0);
    expect(viewStyle(part('outline')!).backgroundColor).toBe(painted(tokens.conditions.scrolled.outlineColor));
  });
});

describe('layout (APB-4 … APB-7, APB-10, APB-15)', () => {
  test('APB-4: the parent\'s full width; a top row at least container.height.small high; the navigation item padding-inline from the start, the actions padding-inline from the end, container.gap between the slots and the title, actions.gap between two actions, each centred in the row', async () => {
    await mount();
    expect(viewStyle(host()).alignSelf).toBe('stretch');
    expect(viewStyle(part('top-row')!)).toEqual({ flexDirection: 'row', alignItems: 'center', minHeight: small.containerHeight, paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline, gap: tokens.containerGap });
    expect(viewStyle(part('actions')!)).toMatchObject({ flexDirection: 'row', alignItems: 'center', gap: tokens.actionsGap });
    const row = part('top-row')!.children as Instance[];
    expect(row.map((child) => child.props.testID)).toEqual([`${ID}.navigation`, `${ID}.title-area`, `${ID}.actions`]);
    expect(viewStyle(part('title-area')!).flex).toBe(1);
  });

  test('APB-4: without a navigation item the title block starts comp.app-bar.title.inset from the start edge (and without actions it ends title.inset from the end); the values drive it', async () => {
    const view = await mount({ navigation: undefined, actions: undefined });
    expect(viewStyle(part('top-row')!)).toMatchObject({ paddingStart: tokens.titleInset, paddingEnd: tokens.titleInset });
    expect(part('navigation')).toBeNull();
    await view.unmount();
    await mount({ navigation: undefined }, { theme: 'light', system: withAppBar({ titleInset: 24, containerPaddingInline: 2 }) });
    expect(viewStyle(part('top-row')!)).toMatchObject({ paddingStart: 24, paddingEnd: 2 });
  });

  test('APB-4: right-to-left mirrors the order — the row and its insets are logical (start / end), which React Native mirrors', async () => {
    await mount({ size: 'large' });
    const top = viewStyle(part('top-row')!);
    expect(top.flexDirection).toBe('row');
    expect(top).not.toHaveProperty('paddingLeft');
    expect(viewStyle(part('expanded-block')!)).toMatchObject({ paddingStart: tokens.titleInset, paddingEnd: tokens.titleInset });
    expect(viewStyle(part('outline') ?? host())).not.toHaveProperty('left');
  });

  test('APB-5: the title on one line in title.typescale.small and title.color, the subtitle on one line below it in subtitle.typescale.small and subtitle.color, centred as a block, each truncated at the end', async () => {
    await mount({ subtitle: 'Edited 5 minutes ago' });
    const title = part('title')!;
    const subtitle = part('subtitle')!;
    expect(textStyle(title)).toMatchObject({ ...text(small.titleTypescale), color: painted(tokens.titleColor) });
    expect(textStyle(subtitle)).toMatchObject({ ...text(small.subtitleTypescale), color: painted(tokens.subtitleColor) });
    for (const line of [title, subtitle]) expect(line.props).toMatchObject({ numberOfLines: 1, ellipsizeMode: 'tail' });
    expect(viewStyle(part('title-block')!).justifyContent).toBe('center');
    expect(part('title-block')!.children).toEqual([title, subtitle]);
  });

  test('APB-5: an empty subtitle draws none', async () => {
    await mount({ subtitle: '  ' });
    expect(part('subtitle')).toBeNull();
  });

  test('APB-6: centred — the title block is narrowed equally on both sides (from the laid-out slots) and its text centred; start — no narrowing, start-aligned text', async () => {
    const view = await mount({ titleAlignment: 'center', subtitle: 'Draft' });
    await layout(part('navigation')!, { width: 36, height: 36 });
    await layout(part('actions')!, { width: 36 * 2 + tokens.actionsGap, height: 36 });
    // Start extent: padding + 36 + gap; end extent: padding + 80 + gap. The start side takes the difference.
    const extra = 36 * 2 + tokens.actionsGap - 36;
    expect(viewStyle(part('title-area')!)).toMatchObject({ flex: 1, paddingStart: extra, paddingEnd: 0 });
    expect(textStyle(part('title')!).textAlign).toBe('center');
    expect(textStyle(part('subtitle')!).textAlign).toBe('center');
    await view.unmount();
    await mount({ titleAlignment: 'start' });
    await layout(part('actions')!, { width: 80, height: 36 });
    expect(viewStyle(part('title-area')!)).not.toHaveProperty('paddingStart');
    expect(textStyle(part('title')!).textAlign).toBeUndefined();
  });

  test('APB-6: a centred title with no navigation item balances title.inset against the actions', async () => {
    await mount({ titleAlignment: 'center', navigation: undefined });
    await layout(part('actions')!, { width: 80, height: 36 });
    const start = tokens.titleInset;
    const end = tokens.containerPaddingInline + 80 + tokens.containerGap;
    expect(viewStyle(part('title-area')!)).toMatchObject({ paddingStart: Math.max(0, end - start), paddingEnd: Math.max(0, start - end) });
  });

  test('APB-6: an unknown titleAlignment renders as start, and development builds report it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ titleAlignment: 'justify' as AppBarProps['titleAlignment'] });
    expect(textStyle(part('title')!).textAlign).toBeUndefined();
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('AppBar titleAlignment "justify" is not defined; using "start"')]);
  });

  test('APB-7: large and expanded — no title in the top row; below it the title in title.typescale.large and the subtitle in subtitle.typescale.large, title.inset from the start, ending container.padding-block-end above the bottom edge; at least container.height.large high', async () => {
    await mount({ size: 'large', subtitle: 'ada@example.com' });
    expect(part('title')).toBeNull();
    expect(viewStyle(part('expanded-block')!)).toEqual({ minHeight: large.containerHeight - small.containerHeight, justifyContent: 'flex-end', paddingStart: tokens.titleInset, paddingEnd: tokens.titleInset, paddingBottom: tokens.containerPaddingBlockEnd });
    expect(Number(viewStyle(part('top-row')!).minHeight) + Number(viewStyle(part('expanded-block')!).minHeight)).toBe(large.containerHeight);
    expect(textStyle(part('expanded-title')!)).toMatchObject({ ...text(large.titleTypescale), color: painted(tokens.titleColor) });
    expect(textStyle(part('expanded-subtitle')!)).toMatchObject({ ...text(large.subtitleTypescale), color: painted(tokens.subtitleColor) });
    for (const line of [part('expanded-title')!, part('expanded-subtitle')!]) expect(line.props).toMatchObject({ numberOfLines: 1, ellipsizeMode: 'tail' });
    // A centred bar's expanded row still starts at the start.
  });

  test('APB-7: an expanded title row starts at the start even while titleAlignment is center', async () => {
    await mount({ size: 'large', titleAlignment: 'center' });
    expect(textStyle(part('expanded-title')!).textAlign).toBeUndefined();
  });

  test('APB-10: the container reaches under the provider\'s top and side insets (its color fills them) and keeps its content inside', async () => {
    const view = await mount({}, { theme: 'light', insets: { top: 47, left: 20, right: 12, bottom: 34 } });
    expect(viewStyle(host())).toMatchObject({ paddingTop: 47, paddingLeft: 20, paddingRight: 12, backgroundColor: painted(tokens.conditions.flat.containerColor) });
    expect(viewStyle(host())).not.toHaveProperty('paddingBottom');
    await view.unmount();
    // The bar's own insets replace the provider's side by side: a bar below other content passes top: 0.
    await mount({ insets: { top: 0 } }, { theme: 'light', insets: { top: 47, left: 20 } });
    expect(viewStyle(host())).toMatchObject({ paddingTop: 0, paddingLeft: 20, paddingRight: 0 });
  });

  test('APB-15: heights are minimums, so enlarged text grows the rows; titles stay on one line and scale with the text; the icon buttons do not scale', async () => {
    await mount({ size: 'large', subtitle: 'ada@example.com', scrolled: false });
    expect(viewStyle(part('top-row')!)).not.toHaveProperty('height');
    expect(viewStyle(part('expanded-block')!)).not.toHaveProperty('height');
    for (const line of [part('expanded-title')!, part('expanded-subtitle')!]) expect(line.props).toMatchObject({ numberOfLines: 1, allowFontScaling: true });
    expect(screen.getByTestId('back.glyph', { includeHiddenElements: true }).props.allowFontScaling).toBe(false);
  });
});

describe('the scroll connection (APB-8, APB-9)', () => {
  test('APB-9: a small bar connected to a scroll view is scrolled while any content lies under it, flat at the top; scrolled is ignored while connected; only the bar re-renders', async () => {
    const { scrollTo, renders } = await mountConnected({ scrolled: true });
    expect(part('outline')).toBeNull();
    const before = renders();
    await scrollTo(1);
    expect(viewStyle(part('outline')!).backgroundColor).toBe(painted(tokens.conditions.scrolled.outlineColor));
    await scrollTo(0);
    expect(part('outline')).toBeNull();
    await scrollTo(-30);
    expect(part('outline')).toBeNull();
    expect(renders()).toBe(before);
  });

  test('APB-8: a large bar shrinks one for one with the scroll, the expanded title moving up with the bottom edge and clipped under the top row; the top row\'s title fades in with the covered part of the expanded title; back toward the top it expands again', async () => {
    const { scrollTo } = await mountConnected({ size: 'large' });
    // Laid out: the expanded row is 56 high, its title 40 high from y 4.
    await layout(part('expanded-block')!, { height: 56 });
    await layout(part('expanded-title')!, { y: 4, height: 40 });
    expect(part('title')).toBeNull();
    await scrollTo(20);
    expect(viewStyle(part('expanded')!)).toEqual({ overflow: 'hidden', height: 56 - 20 });
    expect(viewStyle(part('expanded-block')!).marginTop).toBe(-20);
    // 16 of the title's 40 are covered.
    expect(viewStyle(part('title-block')!).opacity).toBeCloseTo(16 / 40);
    await scrollTo(34);
    expect(viewStyle(part('title-block')!).opacity).toBeCloseTo(30 / 40);
    expect(part('outline')).toBeNull();
    await scrollTo(56);
    expect(viewStyle(part('expanded')!).height).toBe(0);
    expect(viewStyle(part('title-block')!).opacity).toBe(1);
    await scrollTo(200);
    expect(viewStyle(part('expanded')!).height).toBe(0);
    await scrollTo(10);
    expect(viewStyle(part('expanded')!).height).toBe(46);
    expect(viewStyle(part('title-block')!).opacity).toBeCloseTo(6 / 40);
    await scrollTo(0);
    expect(viewStyle(part('expanded')!)).toEqual({});
    expect(part('title')).toBeNull();
  });

  test('APB-9: a large bar is scrolled only once it has fully collapsed and content lies under it', async () => {
    const { scrollTo } = await mountConnected({ size: 'large' });
    await layout(part('expanded-block')!, { height: 56 });
    await scrollTo(40);
    expect(part('outline')).toBeNull();
    await scrollTo(56);
    expect(part('outline')).toBeNull();
    await scrollTo(57);
    expect(viewStyle(part('outline')!).backgroundColor).toBe(painted(tokens.conditions.scrolled.outlineColor));
  });

  test('APB-9: without a connection a large bar is drawn fully collapsed while scrolled is true (no expanded row, the title in the top row), and stays expanded while it is false', async () => {
    const view = await mount({ size: 'large', scrolled: true });
    expect(part('expanded')).toBeNull();
    expect(textStyle(part('title')!)).toMatchObject(text(small.titleTypescale));
    expect(viewStyle(part('title-block')!).opacity).toBe(1);
    await view.unmount();
    await mount({ size: 'large' });
    expect(part('expanded')).not.toBeNull();
    expect(part('title')).toBeNull();
  });
});

describe('accessibility (APB-11 … APB-13)', () => {
  test('APB-11: the bar has no role and takes no focus; its items are the icon buttons they are — drawn from their own tokens, with their own role and name — in reading order', async () => {
    await mount();
    expect(host().props.role).toBeUndefined();
    expect(host().props.accessibilityRole).toBeUndefined();
    expect(host().props.accessible).toBeUndefined();
    expect(host().props.focusable).toBeUndefined();
    const back = screen.getByTestId('back');
    expect(back.props).toMatchObject({ accessibilityRole: 'button', accessibilityLabel: 'Back', focusable: true });
    const standard = tanrei.components.iconButton;
    expect(viewStyle(back)).toMatchObject({ width: standard.sizes.medium.containerSize, height: standard.sizes.medium.containerSize });
    expect(textStyle(screen.getByTestId('back.glyph', { includeHiddenElements: true })).color).toBe(painted(standard.variants.standard.enabled.iconColor));
    const order = screen.getAllByRole('button').map((each) => each.props.accessibilityLabel);
    expect(order).toEqual(['Back', 'Search', 'More options']);
  });

  test('APB-11: pressing an item reaches its own onPress', async () => {
    const onPress = jest.fn();
    await mount({ navigation: <IconButton accessibilityLabel="Back" testID="back" onPress={onPress}>arrow_back</IconButton> });
    await fireEvent.press(screen.getByTestId('back'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('APB-12: the title is a heading and the subtitle text read after it', async () => {
    await mount({ subtitle: 'Edited 5 minutes ago' });
    const heading = screen.getByRole('heading');
    expect(heading.props.children).toBe('Inbox');
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(part('subtitle')!.props.role).toBeUndefined();
    expect(part('title-block')!.children).toEqual([part('title'), part('subtitle')]);
  });

  test('APB-12: a large bar exposes its title once — the expanded title while any of it is visible, the top row\'s once collapsed', async () => {
    const { scrollTo } = await mountConnected({ size: 'large' });
    await layout(part('expanded-block')!, { height: 56 });
    await layout(part('expanded-title')!, { y: 4, height: 40 });
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    await scrollTo(30);
    // Both drawn; only the expanded one is exposed.
    expect(hidden(part('title-block'))).toBe(true);
    expect(hidden(part('expanded'))).toBe(false);
    expect(screen.getAllByRole('heading').map((each) => each.props.testID)).toEqual([`${ID}.expanded-title`]);
    await scrollTo(56);
    expect(hidden(part('title-block'))).toBe(false);
    expect(hidden(part('expanded'))).toBe(true);
    expect(screen.getAllByRole('heading').map((each) => each.props.testID)).toEqual([`${ID}.title`]);
  });

  test('APB-13: an empty title draws no title block and exposes no heading; an expanded large bar keeps its empty title row', async () => {
    const view = await mount({ title: '' });
    expect(part('title')).toBeNull();
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
    await view.unmount();
    await mount({ title: '', size: 'large' });
    expect(part('expanded-title')).toBeNull();
    expect(viewStyle(part('expanded-block')!).minHeight).toBe(large.containerHeight - small.containerHeight);
  });

  test('APB-13: more than three actions or more than one navigation item still render, and development builds report each; release builds are silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const four = ['a', 'b', 'c', 'd'].map((name) => (
      <IconButton key={name} accessibilityLabel={name}>
        {name}
      </IconButton>
    ));
    const two = (
      <>
        <IconButton accessibilityLabel="Back">arrow_back</IconButton>
        <IconButton accessibilityLabel="Menu">menu</IconButton>
      </>
    );
    const view = await mount({ actions: <>{four}</>, navigation: two });
    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('holds 4 actions; more than three belong in an overflow menu'), expect.stringContaining('holds 2 navigation items; a bar has one navigation button')]);
    await view.unmount();
    warn.mockClear();
    development(false);
    await mount({ actions: <>{four}</>, navigation: two });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('open vocabulary (APB-14)', () => {
  test('APB-14: a size the active system does not have renders with small\'s tokens, and development builds report it once', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ size: 'medium' as AppBarProps['size'] });
    expect(viewStyle(part('top-row')!).minHeight).toBe(small.containerHeight);
    expect(part('expanded')).toBeNull();
    expect(textStyle(part('title')!)).toMatchObject(text(small.titleTypescale));
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('no AppBar size "medium"; using "small"')]);
    await view.unmount();
    await mount({ size: 'medium' as AppBarProps['size'] });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('APB-14: a size a system adds that is taller than small gets an expanded title row from its own tokens', async () => {
    const sizes = { ...tokens.sizes, medium: { containerHeight: 104, titleTypescale: 'heading2', subtitleTypescale: 'body' } } as TanreiAppBarTokens['sizes'];
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ size: 'medium' as AppBarProps['size'] }, { theme: 'light', system: withAppBar({ sizes }) });
    expect(viewStyle(part('expanded-block')!).minHeight).toBe(104 - small.containerHeight);
    expect(textStyle(part('expanded-title')!)).toMatchObject(text('heading2'));
    expect(warn).not.toHaveBeenCalled();
  });

  test('the size tokens drive the bar: a system with other heights and title styles', async () => {
    const sizes = { small: { ...small, containerHeight: 64, titleTypescale: 'heading3' }, large: { ...large, containerHeight: 152 } } as TanreiAppBarTokens['sizes'];
    await mount({ size: 'large', scrolled: true }, { theme: 'light', system: withAppBar({ sizes }) });
    expect(viewStyle(part('top-row')!).minHeight).toBe(64);
    expect(textStyle(part('title')!)).toMatchObject(text('heading3'));
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(appBarSubject);

  test('every fixture renders its items as the icon buttons they name, navigation first', async () => {
    for (const fixture of spec.fixtures) {
      const view = await render(
        <TanreiProvider theme="light">
          {appBarSubject.render({ ...(fixture.props as object), items: (fixture.items ?? []).map((item) => ({ kind: item.kind, accessibilityLabel: String(item.props.label), children: item.content })) })}
        </TanreiProvider>,
      );
      const labels = screen.queryAllByRole('button').map((each) => each.props.accessibilityLabel);
      expect(labels).toEqual((fixture.items ?? []).map((item) => item.props.label));
      await view.unmount();
    }
  });
});
