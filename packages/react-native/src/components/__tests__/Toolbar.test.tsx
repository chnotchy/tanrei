// Toolbar — layout of both variants, the insets, the one-Tab-stop keyboard over the product's IconButtons and Buttons
// (the internal channel, src/primitives/rovingItem.ts), accessibility, token binding and fixture baselines. Cases come
// from specs/toolbar.spec.json; every behaviour id is cited by the test that covers it.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Dimensions, ScrollView, Text, View } from 'react-native';
import * as ReactNative from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiScheme, TanreiSystem, TanreiToolbarTokens } from '../../generated/vocabulary';
import { describeFixtureBaselines, painted, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { Toolbar, type ToolbarProps } from '../Toolbar';
import { toolbarSubject } from './Toolbar.subject';

const spec = loadSpec('toolbar');
const tokens: TanreiToolbarTokens = tanrei.components.toolbar;
const { docked, floating } = tokens.variants;
const ID = 'toolbar';

const withToolbar = (overrides: Partial<TanreiToolbarTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'toolbar', overrides);
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};

const GLYPHS = ['archive', 'delete', 'mark_email_unread', 'drive_file_move'];
const actions = (props: (i: number) => Partial<Parameters<typeof IconButton>[0]> = () => ({})) =>
  GLYPHS.map((glyph, i) => (
    <IconButton key={glyph} testID={`item.${i}`} accessibilityLabel={glyph} {...props(i)}>
      {glyph}
    </IconButton>
  ));

function mount(props: Partial<ToolbarProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <Toolbar testID={ID} accessibilityLabel="Message actions" {...props}>
        {props.children ?? actions()}
      </Toolbar>
    </TanreiProvider>,
  );
}

const bar = () => screen.getByTestId(ID);
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const scroll = () => part('scroll')!;
const content = () => viewStyle({ props: { style: scroll().props.contentContainerStyle } } as never);
const item = (i: number) => screen.getByTestId(`item.${i}`);
const key = (name: string) => fireEvent(bar(), 'keyDown', { nativeEvent: { key: name, preventDefault: () => undefined } });
// A fresh record per test: the spy on the prototype is the same object from one test to the next.
const focusSpy = () => jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined).mockClear();
const focused = (spy: jest.SpyInstance) => (spy.mock.contexts.at(-1) as { props?: { testID?: string } } | undefined)?.props?.testID;
const reportsOf = (warn: jest.SpyInstance) => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('Toolbar'));
const focusables = () => [0, 1, 2, 3].map((i) => item(i).props.focusable);

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

describe('Toolbar', () => {
  test('the spec is the one implemented here: behaviours TBR-1 … TBR-14, the two item kinds, and the react-native mapping', () => {
    expect(spec.behavior.map((b) => b.id)).toEqual(Array.from({ length: 14 }, (_, i) => `TBR-${i + 1}`));
    const mapping = spec.platforms['react-native'];
    expect(mapping.name).toBe('Toolbar');
    expect(mapping.props).toEqual({ variant: 'variant', orientation: 'orientation', label: 'accessibilityLabel' });
    expect(Object.keys(mapping.items ?? {})).toEqual(['action', 'button']);
    expect(mapping.items!.action!.name).toBe('IconButton');
    expect(mapping.items!.button!.name).toBe('Button');
  });

  describe('docked', () => {
    test.each(['light', 'dark'] as const)('TBR-1: spans its parent, at least container.size.docked high, filled, raised and rounded by the docked tokens, its top edge outline.width thick in outline.color.docked (%s)', async (theme) => {
      await mount({}, { theme });
      const scheme: TanreiScheme = theme;
      const style = viewStyle(bar());
      expect(style).toMatchObject({ alignSelf: 'stretch', backgroundColor: painted(docked.containerColor, scheme), borderRadius: docked.containerShape });
      // level0: no shadow, no ring.
      expect(style.boxShadow).toBeUndefined();
      expect(part('elevation-ring')).toBeNull();
      expect(content().minHeight).toBe(docked.containerSize);
      expect(content().height).toBeUndefined();
      expect(viewStyle(part('outline')!)).toMatchObject({ position: 'absolute', top: 0, start: 0, end: 0, height: tokens.outlineWidth, backgroundColor: painted(docked.outlineColor, scheme) });
    });

    test('TBR-1: the values drive the drawing — a system that re-values the docked tokens draws them', async () => {
      const system = withToolbar({
        outlineWidth: 3,
        variants: { ...tokens.variants, docked: { ...docked, containerColor: { kind: 'role', role: 'primary' }, containerShape: 12, containerSize: 70, containerElevation: 'level2', outlineColor: { kind: 'role', role: 'error' } } },
      });
      await mount({}, { theme: 'light', system });
      expect(viewStyle(bar())).toMatchObject({ backgroundColor: painted({ kind: 'role', role: 'primary' }), borderRadius: 12, boxShadow: expect.any(Array) });
      expect(content().minHeight).toBe(70);
      expect(viewStyle(part('outline')!)).toMatchObject({ height: 3, backgroundColor: painted({ kind: 'role', role: 'error' }) });
    });

    test('TBR-1: an outline color that resolves to nothing draws no edge element', async () => {
      await mount({}, { theme: 'light', system: withToolbar({ variants: { ...tokens.variants, docked: { ...docked, outlineColor: { kind: 'none' } } } }) });
      expect(part('outline')).toBeNull();
    });

    test('TBR-2: one row in reading order, padding-inline at both ends, spread with at least the gap between neighbours, each centered across the row', async () => {
      await mount();
      expect(scroll().props.horizontal).toBe(true);
      expect(content()).toMatchObject({
        flexDirection: 'row',
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: docked.containerGap,
        paddingStart: docked.containerPaddingInline,
        paddingEnd: docked.containerPaddingInline,
      });
      // Reading order: the items are laid out in the order given.
      expect(screen.getAllByRole('button').map((each) => each.props.accessibilityLabel)).toEqual(GLYPHS);
      // Each item is centered across the row (in place of its own flex-start).
      expect([0, 1, 2, 3].map((i) => viewStyle(item(i)).alignSelf)).toEqual(['center', 'center', 'center', 'center']);
    });

    test('TBR-2: a toolbar with one item centers it', async () => {
      await mount({
        children: (
          <Button testID="item.0" variant="tonal">
            Reply
          </Button>
        ),
      });
      expect(content().justifyContent).toBe('center');
    });

    test('TBR-3: the container reaches under the provider\'s bottom and side insets (its color fills them) and keeps its items above and inside them; its own insets replace the provider\'s side by side', async () => {
      const view = await mount({}, { theme: 'light', insets: { top: 47, left: 20, right: 12, bottom: 34 } });
      expect(viewStyle(bar())).toMatchObject({ paddingBottom: 34, paddingLeft: 20, paddingRight: 12, backgroundColor: painted(docked.containerColor) });
      // The top inset is not the toolbar's.
      expect(viewStyle(bar()).paddingTop).toBeUndefined();
      await view.unmount();
      await mount({ insets: { bottom: 0 } }, { theme: 'light', insets: { left: 20, bottom: 34 } });
      expect(viewStyle(bar())).toMatchObject({ paddingBottom: 0, paddingLeft: 20 });
    });
  });

  describe('floating', () => {
    test.each(['light', 'dark'] as const)('TBR-4: filled, raised and rounded by the floating tokens, as long as its items need along its axis, at least container.size.floating across it (%s)', async (theme) => {
      await mount({ variant: 'floating' }, { theme });
      const scheme: TanreiScheme = theme;
      const style = viewStyle(bar());
      const elevation = tanrei.elevation[floating.containerElevation];
      expect(elevation.length).toBeGreaterThan(0);
      expect(style).toMatchObject({ alignSelf: 'flex-start', backgroundColor: painted(floating.containerColor, scheme), borderRadius: floating.containerShape, boxShadow: expect.any(Array) });
      expect(style.boxShadow).toHaveLength(elevation.filter((layer) => !(layer.x === 0 && layer.y === 0 && layer.blur === 0)).length);
      expect(content()).toMatchObject({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: floating.containerGap, paddingStart: floating.containerPaddingInline, paddingEnd: floating.containerPaddingInline, minHeight: floating.containerSize });
      // The default system's floating edge is transparent: no outline element.
      expect(part('outline')).toBeNull();
    });

    test('TBR-4: an edge that draws goes around the whole shape; the corners ease by sys.shape.corner-smoothing', async () => {
      const system = { ...withToolbar({ variants: { ...tokens.variants, floating: { ...floating, outlineColor: { kind: 'role', role: 'outline' } } } }), shape: { ...tanrei.shape, cornerSmoothing: 0.6 } };
      await mount({ variant: 'floating' }, { theme: 'light', system });
      expect(viewStyle(part('outline')!)).toMatchObject({ position: 'absolute', borderWidth: tokens.outlineWidth, borderColor: painted({ kind: 'role', role: 'outline' }), borderRadius: floating.containerShape });
      if (ReactNative.Platform.OS === 'ios') expect(viewStyle(bar()).borderCurve).toBe('continuous');
    });

    test('TBR-5: a floating toolbar does not place itself — no absolute position, no scrim, no inset; its layout places it through style', async () => {
      await mount({ variant: 'floating', style: { alignSelf: 'center', marginBottom: 16 } }, { theme: 'light', insets: { bottom: 34, left: 20 } });
      const style = viewStyle(bar());
      expect(style.position).toBeUndefined();
      expect(style.paddingBottom).toBeUndefined();
      expect(style.paddingLeft).toBeUndefined();
      expect(style).toMatchObject({ alignSelf: 'center', marginBottom: 16 });
      expect(part('scrim')).toBeNull();
    });

    test('TBR-6: vertical — the items stack top to bottom in order, the floating paddings and gap along the vertical axis, at least container.size.floating wide', async () => {
      await mount({ variant: 'floating', orientation: 'vertical' });
      expect(scroll().props.horizontal).toBe(false);
      expect(content()).toMatchObject({ flexDirection: 'column', alignItems: 'center', gap: floating.containerGap, paddingTop: floating.containerPaddingInline, paddingBottom: floating.containerPaddingInline, minWidth: floating.containerSize });
      expect(content().minHeight).toBeUndefined();
      expect(screen.getAllByRole('button').map((each) => each.props.accessibilityLabel)).toEqual(GLYPHS);
    });
  });

  test('TBR-6: a docked toolbar asked to be vertical lays out as a horizontal docked toolbar, and says so in development builds', async () => {
    const warn = jest.mocked(console.warn);
    await mount({ variant: 'docked', orientation: 'vertical' });
    expect(scroll().props.horizontal).toBe(true);
    expect(content()).toMatchObject({ flexDirection: 'row', minHeight: docked.containerSize });
    expect(reportsOf(warn)).toEqual([expect.stringContaining('a docked Toolbar (testID "toolbar") is horizontal')]);
  });

  test('TBR-7: right-to-left — the row is logical (start / end paddings, a flex row React Native mirrors) and Left Arrow moves to the next item; a vertical toolbar keeps its top-to-bottom order and Down Arrow', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    const spy = focusSpy();
    const view = await mount();
    expect(content()).toMatchObject({ flexDirection: 'row', paddingStart: docked.containerPaddingInline, paddingEnd: docked.containerPaddingInline });
    expect(content().paddingLeft).toBeUndefined();
    await key('ArrowLeft');
    expect(focused(spy)).toBe('item.1');
    await key('ArrowRight');
    expect(focused(spy)).toBe('item.0');
    await view.unmount();
    spy.mockClear();
    await mount({ variant: 'floating', orientation: 'vertical' });
    expect(content().flexDirection).toBe('column');
    await key('ArrowDown');
    expect(focused(spy)).toBe('item.1');
  });

  test('TBR-8: items that need more length than the toolbar has keep their size and the gap, scroll along the axis, and never wrap; development builds point to an overflow menu', async () => {
    const warn = jest.mocked(console.warn);
    await mount();
    const before = [0, 1, 2, 3].map((i) => viewStyle(item(i)));
    expect(content().flexWrap).toBeUndefined();
    await fireEvent(scroll(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: 56 } } });
    expect(reportsOf(warn)).toEqual([]);
    await fireEvent(scroll(), 'contentSizeChange', 16 + 4 * 36 + 3 * 8, 56);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('belong in an overflow menu')]);
    expect([0, 1, 2, 3].map((i) => viewStyle(item(i)))).toEqual(before);
    expect(before.every((style) => style.width === tanrei.components.iconButton.sizes.medium.containerSize && style.flexShrink === undefined)).toBe(true);
    // Items that fit are not reported.
    warn.mockClear();
    await fireEvent(scroll(), 'contentSizeChange', 100, 56);
    expect(reportsOf(warn)).toEqual([]);
  });

  test('TBR-8: an item that receives keyboard focus is brought fully into view, at once (the toolbar has no motion tokens)', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype as unknown as { scrollTo: (options: object) => void }, 'scrollTo').mockImplementation(() => undefined);
    focusSpy();
    await mount();
    await fireEvent(scroll(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 56 } } });
    for (const i of [0, 1, 2, 3]) await fireEvent(item(i), 'layout', { nativeEvent: { layout: { x: 8 + i * 44, y: 10, width: 36, height: 36 } } });
    await fireEvent(item(3), 'focus');
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 8 + 3 * 44 + 36 - 100, animated: false });
    await fireEvent(scroll(), 'scroll', { nativeEvent: { contentOffset: { x: 80, y: 0 } } });
    await fireEvent(item(0), 'focus');
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 8, animated: false });
    // In view already: no scroll.
    scrollTo.mockClear();
    await fireEvent(item(0), 'focus');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  test('TBR-9: the items are not restyled — an IconButton and a Button in a toolbar draw exactly as they do alone, a toggle stays a toggle, and they keep their own events (click, then change)', async () => {
    const alone = await render(
      <TanreiProvider theme="light">
        <IconButton testID="item.0" accessibilityLabel="Bold" toggle selected variant="tonal">
          format_bold
        </IconButton>
        <Button testID="item.1" variant="filled">
          Send
        </Button>
      </TanreiProvider>,
    );
    const standalone = [viewStyle(item(0)), viewStyle(item(1))];
    const standaloneState = item(0).props.accessibilityState;
    await alone.unmount();
    const calls: string[] = [];
    await mount({
      children: [
        <IconButton key="b" testID="item.0" accessibilityLabel="Bold" toggle selected variant="tonal" onPress={() => calls.push('click')} onSelectedChange={(next) => calls.push(`change:${next}`)}>
          format_bold
        </IconButton>,
        <Button key="s" testID="item.1" variant="filled" onPress={() => calls.push('send')}>
          Send
        </Button>,
      ],
    });
    // Laid out, not restyled: the one difference is where each sits across the row (centered, TBR-2).
    expect([viewStyle(item(0)), viewStyle(item(1))]).toEqual(standalone.map((style) => ({ ...style, alignSelf: 'center' })));
    expect(item(0).props.accessibilityState).toEqual(standaloneState);
    expect(item(0).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(item(0));
    await fireEvent.press(item(1));
    expect(calls).toEqual(['click', 'change:false', 'send']);
    // Their own target on every side without a neighbour: the minimum target's hitSlop is the icon button's (TBR-9 holds
    // the side toward the next item to half the gap, below).
    expect(item(0).props.hitSlop).toMatchObject({ top: 6, bottom: 6, left: 6 });
  });

  test('TBR-9: between two items the hit areas meet at the middle of the gap and never overlap (as BGR-4); each keeps its full target on a side with no neighbour — measured where a docked toolbar spreads its items, mirrored in right-to-left, top and bottom in a vertical toolbar', async () => {
    // The icon button's own target alone: (sys.target.touch − 36) / 2 = 6 on each side.
    const alone = await render(
      <TanreiProvider theme="light">
        <IconButton testID="item.0" accessibilityLabel="archive">
          archive
        </IconButton>
      </TanreiProvider>,
    );
    const own = item(0).props.hitSlop.left as number;
    await alone.unmount();
    const slops = () => [0, 1, 2, 3].map((i) => item(i).props.hitSlop);
    // The default's gap leaves room for every whole target: no reach is held back, and none overlaps.
    expect(own).toBeLessThanOrEqual(floating.containerGap / 2);
    const whole = await mount({ variant: 'floating' });
    expect(slops()).toEqual([0, 1, 2, 3].map(() => ({ top: own, bottom: own, left: own, right: own })));
    await whole.unmount();
    // A layer with a narrower gap (8): half of it is less than the item's own reach.
    const half = 4;
    const narrow = withToolbar({ variants: { ...tokens.variants, floating: { ...floating, containerGap: 2 * half } } });
    expect(own).toBeGreaterThan(half);
    // Floating: packed, the token's gap between neighbours.
    const view = await mount({ variant: 'floating' }, { theme: 'light', system: narrow });
    expect(slops()).toEqual([
      { top: own, bottom: own, left: own, right: half },
      { top: own, bottom: own, left: half, right: half },
      { top: own, bottom: own, left: half, right: half },
      { top: own, bottom: own, left: half, right: own },
    ]);
    // Two neighbours' reaches add up to the gap: they meet at its middle, never overlapping.
    expect(slops()[0]!.right! + slops()[1]!.left!).toBe(2 * half);
    await view.unmount();
    // Docked: the items are spread, so a gap is what the layout gives — measured once every item is laid out.
    await mount();
    const lay = (i: number, x: number) => fireEvent(item(i), 'layout', { nativeEvent: { layout: { x, y: 10, width: 36, height: 36 } } });
    expect(item(1).props.hitSlop).toMatchObject({ left: Math.min(own, docked.containerGap / 2), right: Math.min(own, docked.containerGap / 2) });
    await lay(0, 8);
    await lay(1, 54);
    await lay(2, 100);
    await lay(3, 146);
    // A 10-point gap: 5 each side, still under the icon button's own 6.
    expect(slops()).toEqual([
      { top: own, bottom: own, left: own, right: 5 },
      { top: own, bottom: own, left: 5, right: 5 },
      { top: own, bottom: own, left: 5, right: 5 },
      { top: own, bottom: own, left: 5, right: own },
    ]);
    // A gap wider than twice the target's reach changes nothing: the item keeps its own target.
    await lay(1, 80);
    await lay(2, 160);
    await lay(3, 240);
    expect(slops()[1]).toEqual({ top: own, bottom: own, left: own, right: own });
  });

  test('TBR-9: right-to-left holds the physical sides that face the neighbours (the first item\'s left, the last item\'s right); a vertical toolbar holds the top and bottom', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    // A layer with a narrower gap than the default's, so that the sides facing a neighbour are held back.
    const half = 4;
    const narrow = withToolbar({ variants: { ...tokens.variants, floating: { ...floating, containerGap: 2 * half } } });
    const view = await mount({ variant: 'floating' }, { theme: 'light', system: narrow });
    const own = item(0).props.hitSlop.right as number;
    expect(item(0).props.hitSlop).toEqual({ top: own, bottom: own, left: half, right: own });
    expect(item(3).props.hitSlop).toEqual({ top: own, bottom: own, left: own, right: half });
    await view.unmount();
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', false);
    await mount({ variant: 'floating', orientation: 'vertical' }, { theme: 'light', system: narrow });
    expect(item(0).props.hitSlop).toEqual({ top: own, bottom: half, left: own, right: own });
    expect(item(1).props.hitSlop).toEqual({ top: half, bottom: half, left: own, right: own });
    expect(item(3).props.hitSlop).toEqual({ top: half, bottom: own, left: own, right: own });
  });

  describe('TBR-10: one Tab stop, arrow keys inside', () => {
    test('TBR-10: only the first item that is not disabled is focusable at first; a focused item becomes the Tab stop', async () => {
      await mount({ children: actions((i) => ({ disabled: i === 0 })) });
      expect(focusables()).toEqual([false, true, false, false]);
      await fireEvent(item(3), 'focus');
      expect(focusables()).toEqual([false, false, false, true]);
    });

    test('TBR-10: Right and Left Arrow move focus to the next and previous enabled item, wrapping at the ends; Home and End to the first and last; the disabled item is skipped', async () => {
      const spy = focusSpy();
      await mount({ children: actions((i) => ({ disabled: i === 2 })) });
      await key('ArrowRight');
      expect(focused(spy)).toBe('item.1');
      await key('ArrowRight');
      expect(focused(spy)).toBe('item.3');
      await key('ArrowRight');
      expect(focused(spy)).toBe('item.0');
      await key('ArrowLeft');
      expect(focused(spy)).toBe('item.3');
      await key('Home');
      expect(focused(spy)).toBe('item.0');
      await key('End');
      expect(focused(spy)).toBe('item.3');
      // The item focus moved to is the Tab stop (focusable), the disabled one never is.
      expect(focusables()).toEqual([false, false, false, true]);
    });

    test('TBR-10: Down and Up Arrow do nothing in a horizontal toolbar; in a vertical one they move, and Right / Left do nothing', async () => {
      const spy = focusSpy();
      const view = await mount();
      await key('ArrowDown');
      await key('ArrowUp');
      expect(spy).not.toHaveBeenCalled();
      await view.unmount();
      await mount({ variant: 'floating', orientation: 'vertical' });
      await key('ArrowRight');
      expect(spy).not.toHaveBeenCalled();
      await key('ArrowDown');
      expect(focused(spy)).toBe('item.1');
      await key('ArrowUp');
      await key('ArrowUp');
      expect(focused(spy)).toBe('item.3');
    });

    test('TBR-10: moving focus never activates an item; Enter and Space are left to the focused item (its own click) and typing does not move focus', async () => {
      const spy = focusSpy();
      const pressed = jest.fn();
      await mount({ children: actions(() => ({ onPress: pressed })) });
      await key('ArrowRight');
      await key('End');
      expect(pressed).not.toHaveBeenCalled();
      spy.mockClear();
      const prevent = jest.fn();
      for (const name of ['Enter', ' ', 'd']) await fireEvent(bar(), 'keyDown', { nativeEvent: { key: name, preventDefault: prevent } });
      expect(spy).not.toHaveBeenCalled();
      expect(prevent).not.toHaveBeenCalled();
      // Enter / Space reach the item's Pressable as its own click.
      await fireEvent.press(item(3));
      expect(pressed).toHaveBeenCalledTimes(1);
    });

    test('TBR-10: the caller\'s own onKeyDown is called too', async () => {
      const onKeyDown = jest.fn();
      await mount({ ...({ onKeyDown } as object) });
      await key('ArrowRight');
      expect(onKeyDown).toHaveBeenCalledTimes(1);
    });

    test('TBR-10: an item outside a toolbar is its own Tab stop, exactly as before', async () => {
      await render(
        <TanreiProvider theme="light">
          <IconButton testID="item.0" accessibilityLabel="Archive">
            archive
          </IconButton>
          <IconButton testID="item.1" accessibilityLabel="Delete">
            delete
          </IconButton>
        </TanreiProvider>,
      );
      expect([item(0).props.focusable, item(1).props.focusable]).toEqual([true, true]);
    });
  });

  test('TBR-11: exposed as a toolbar named by label; each item keeps its own name, role and state, and the toolbar adds none', async () => {
    await mount({ children: actions((i) => ({ toggle: i === 0, selected: i === 0, disabled: i === 1 })) });
    expect(bar().props).toMatchObject({ role: 'toolbar', accessibilityLabel: 'Message actions' });
    expect(item(0).props).toMatchObject({ accessibilityRole: 'button', accessibilityLabel: 'archive', accessibilityState: { selected: true, disabled: false } });
    expect(item(1).props.accessibilityState).toMatchObject({ disabled: true });
    expect(item(2).props.accessibilityState.selected).toBeUndefined();
    // The decorative parts are hidden from assistive technology.
    expect(part('outline')!.props.accessibilityElementsHidden).toBe(true);
  });

  test('TBR-12: without a label, with no item, or with an element that is not an IconButton or a Button, it still renders and says so in development builds only', async () => {
    const warn = jest.mocked(console.warn);
    const view = await mount({ accessibilityLabel: '' });
    expect(bar()).toBeTruthy();
    expect(reportsOf(warn)).toEqual([expect.stringContaining('has no accessibilityLabel')]);
    await view.unmount();
    warn.mockClear();
    const empty = await mount({ children: [] });
    expect(bar()).toBeTruthy();
    expect(reportsOf(warn)).toEqual([expect.stringContaining('holds no item')]);
    await empty.unmount();
    warn.mockClear();
    const stray = await mount({ children: [...actions().slice(0, 2), <Text key="t" testID="stray">Draft</Text>] });
    expect(screen.getByTestId('stray')).toBeTruthy();
    expect(reportsOf(warn)).toEqual([expect.stringContaining('item 3 of a Toolbar (testID "toolbar") is not a Tanrei IconButton or Button')]);
    // A stray takes no part in the roving focus.
    expect([item(0).props.focusable, item(1).props.focusable]).toEqual([true, false]);
    await stray.unmount();
    warn.mockClear();
    development(false);
    await mount({ accessibilityLabel: '', children: [] });
    expect(reportsOf(warn)).toEqual([]);
  });

  test('TBR-13: a variant the active system does not have renders as docked, an orientation the component does not define as horizontal; development builds report each once', async () => {
    const warn = jest.mocked(console.warn);
    const reference = await mount({ variant: 'docked' });
    const expected = JSON.stringify(reference.toJSON());
    await reference.unmount();
    expect(reportsOf(warn)).toEqual([]);
    const unknown = await mount({ variant: 'inset' as never, orientation: 'diagonal' as never });
    expect(JSON.stringify(unknown.toJSON())).toBe(expected);
    const messages = warn.mock.calls.map(([message]) => String(message));
    expect(messages).toEqual(expect.arrayContaining([expect.stringContaining('Toolbar variant "inset"; using "docked"'), expect.stringContaining('Toolbar orientation "diagonal" is not defined; using "horizontal"')]));
  });

  test('TBR-13: a variant value a layer adds keeps its own values and takes the docked structure — the width, the insets, the spread items, a top edge — without a report', async () => {
    const warn = jest.mocked(console.warn);
    const inset = { ...floating, containerColor: { kind: 'role', role: 'primaryContainer' }, outlineColor: { kind: 'role', role: 'outline' }, containerSize: 64 } as const;
    const system = withToolbar({ variants: { ...tokens.variants, inset } as TanreiToolbarTokens['variants'] });
    await mount({ variant: 'inset' as never }, { theme: 'light', system, insets: { bottom: 34, left: 20 } });
    expect(viewStyle(bar())).toMatchObject({ alignSelf: 'stretch', paddingBottom: 34, paddingLeft: 20, backgroundColor: painted(inset.containerColor), borderRadius: inset.containerShape });
    expect(content()).toMatchObject({ justifyContent: 'space-between', minHeight: 64, paddingStart: inset.containerPaddingInline });
    expect(viewStyle(part('outline')!)).toMatchObject({ position: 'absolute', top: 0, height: tokens.outlineWidth, backgroundColor: painted(inset.outlineColor) });
    expect(reportsOf(warn)).toEqual([]);
  });

  test('TBR-14: enlarged text grows the toolbar across its axis (its size is a minimum) and the toolbar scales nothing itself', async () => {
    Dimensions.set({ window: { ...WINDOW, fontScale: 2 }, screen: { ...WINDOW, fontScale: 2 } });
    try {
      await mount({ children: [<Button key="r" testID="item.0" variant="tonal">Reply</Button>] });
      expect(content().minHeight).toBe(docked.containerSize);
      expect(content().height).toBeUndefined();
      expect(viewStyle(bar()).height).toBeUndefined();
      // The button grows as its own spec says (a minimum height, its label scaling).
      expect(viewStyle(item(0)).minHeight).toBe(tanrei.components.button.sizes.medium.containerHeight);
    } finally {
      Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
    }
  });

  describe('fixtures (default system, light scheme)', () => {
    describeFixtureBaselines(toolbarSubject);
  });
});
