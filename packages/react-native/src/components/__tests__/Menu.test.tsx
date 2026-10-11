// Menu — behaviour, accessibility, keyboard, placement, token binding and fixture baselines.
// Cases come from specs/menu.spec.json; every behaviour id is cited by the test that covers it.
import fs from 'node:fs';
import path from 'node:path';
import { useState, type RefObject } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, BackHandler, Dimensions, Easing, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreMenuCondition, TanreiMenuConditionStateTokens, TanreiMenuTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { TYPEAHEAD_WINDOW } from '../../primitives/rovingFocus';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resolveElevation } from '../../theme/elevation';
import { iconFamily } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Dialog } from '../Dialog';
import { Menu, placeMenu, type MenuAnchor, type MenuDismissReason, type MenuEntry, type MenuPlacement, type MenuProps } from '../Menu';
import { acme } from './__fixtures__/acme';
import { menuSubject } from './Menu.subject';

const spec = loadSpec('menu');
const { measure } = tanrei;
const tokens: TanreiMenuTokens = tanrei.components.menu;
const ID = 'menu';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const withMenu = (overrides: Partial<TanreiMenuTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'menu', overrides);
const withCondition = (condition: TanreiCoreMenuCondition, overrides: { [State in InteractionState]?: Partial<TanreiMenuConditionStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.menu.conditions[condition];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withMenu({ conditions: { ...base.components.menu.conditions, [condition]: { ...current, ...changed } } }, base);
};
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });

const noop = () => undefined;
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};

const ACTIONS: MenuEntry[] = [
  { label: 'Cut', leadingIcon: 'content_cut', trailingText: '⌘X', onPress: noop },
  { label: 'Copy', leadingIcon: 'content_copy', trailingText: '⌘C', onPress: noop },
  { label: 'Paste', leadingIcon: 'content_paste', trailingText: '⌘V', onPress: noop },
];
const EVERY_KIND: MenuEntry[] = [
  { label: 'Archive', leadingIcon: 'archive' },
  { label: 'Delete', leadingIcon: 'delete', destructive: true },
  { kind: 'group', title: 'View', items: [{ kind: 'checkbox-item', label: 'Show grid', checked: true }, { kind: 'checkbox-item', label: 'Show rulers' }] },
  { kind: 'group', title: 'Sort by', value: 'date', items: [{ kind: 'radio-item', label: 'Name', value: 'name' }, { kind: 'radio-item', label: 'Date', value: 'date' }] },
];

/** An anchor that sits at (20, 100), 120 × 40, in a 400 × 800 window. */
const WINDOW = Dimensions.get('window');
const ANCHOR = { x: 20, y: 100, width: 120, height: 40 };
function anchorRef(box = ANCHOR): RefObject<MenuAnchor> & { current: { measureInWindow: jest.Mock; focus: jest.Mock } } {
  return { current: { measureInWindow: jest.fn((callback) => callback(box.x, box.y, box.width, box.height)), focus: jest.fn() } };
}

/** In place (the fixtures' presentation): no overlay layer, no motion, no focus move. */
function mountInline(props: Partial<MenuProps> & { items: readonly MenuEntry[] }, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <Menu testID={ID} visible inline {...props} />
    </TanreiProvider>,
  );
}
/** As a product opens it: in TanreiProvider's overlay layer, against an anchor. */
async function mountOverlay(props: Partial<MenuProps> & { items: readonly MenuEntry[] }, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  const ref = anchorRef();
  const element = (visible: boolean, extra: Partial<MenuProps> = {}) => (
    <TanreiProvider {...provider}>
      <Menu testID={ID} anchorRef={ref} visible={visible} accessibilityLabel="More" {...props} {...extra} />
    </TanreiProvider>
  );
  const view = await render(element(true));
  return { view, ref, element };
}
const SURFACE = { width: 200, height: 150 };
const layOut = (size = SURFACE) => fireEvent(screen.getByTestId(`${ID}.placement`, { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { x: 0, y: 0, ...size } } });

const surface = () => screen.getByTestId(ID, { includeHiddenElements: true });
const row = (i: number) => screen.getByTestId(`${ID}.item.${i}`, { includeHiddenElements: true });
const part = (i: number, name: string) => screen.queryByTestId(`${ID}.item.${i}.${name}`, { includeHiddenElements: true });
const key = (name: string) => fireEvent(surface(), 'keyDown', { nativeEvent: { key: name } });
const click = (i: number) => fireEvent(row(i), 'press', { nativeEvent: { target: 1 } });
const focusSpy = () => jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
const focusedRow = (spy: jest.SpyInstance) => (spy.mock.contexts.at(-1) as { props?: { testID?: string } } | undefined)?.props?.testID;

const HOLD = tanrei.motion.duration.pressHold;
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
async function release(i: number) {
  await fireEvent(row(i), 'pressOut');
  await wait(HOLD + 30);
}
async function enter(i: number, target: InteractionState) {
  if (target === 'hovered') await fireEvent(row(i), 'hoverIn');
  if (target === 'focused') await fireEvent(row(i), 'focus');
  if (target === 'pressed') await fireEvent(row(i), 'pressIn');
}

const ACTIVE = ['hovered', 'focused', 'pressed'] as const;
const CONDITIONS: TanreiCoreMenuCondition[] = ['unselected', 'selected', 'destructive'];
const opacityOf = (from: TanreiMenuTokens, in_: InteractionState) => ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity })[in_];
const shapeOf = (from: TanreiMenuTokens, in_: InteractionState) => ({ enabled: from.containerShape, hovered: from.hoveredContainerShape, focused: from.focusedContainerShape, pressed: from.pressedContainerShape, disabled: from.disabledContainerShape })[in_];
const checkLegs = (i: number) => (part(i, 'check')?.children ?? []) as Instance[];

/** Everything MNU-10 / MNU-13 name — container, label, supporting and trailing text, icons, mark, opacity — from one state's tokens. */
function expectRowDrawnFrom(i: number, condition: TanreiCoreMenuCondition, in_: InteractionState, system: TanreiSystem = tanrei, scheme: TanreiScheme = 'light') {
  const from = system.components.menu;
  const paints = from.conditions[condition][in_];
  const style = viewStyle(row(i));
  expect(style.backgroundColor).toBe(fill(paints.containerColor, scheme, system));
  expect(style.opacity).toBe(opacityOf(from, in_));
  expect(style.borderRadius).toBe(shapeOf(from, in_));
  expect(textStyle(part(i, 'label')!).color).toBe(painted(paints.labelColor, scheme, system));
  if (part(i, 'supporting-text')) expect(textStyle(part(i, 'supporting-text')!).color).toBe(painted(paints.supportingTextColor, scheme, system));
  if (part(i, 'trailing-text')) expect(textStyle(part(i, 'trailing-text')!).color).toBe(painted(paints.trailingTextColor, scheme, system));
  if (part(i, 'leading-icon')) expect(textStyle(part(i, 'leading-icon.glyph')!).color).toBe(painted(paints.leadingIconColor, scheme, system));
  if (part(i, 'trailing-icon')) expect(textStyle(part(i, 'trailing-icon.glyph')!).color).toBe(painted(paints.trailingIconColor, scheme, system));
  for (const leg of checkLegs(i)) expect(viewStyle(leg).backgroundColor).toBe(painted(paints.markColor, scheme, system));
}

beforeAll(() => {
  // The baselines at the tokens' own sizes (the Jest preset's window has fontScale 2); a 400 × 800 window for placement.
  Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
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
  test('the React Native mapping in the spec matches this implementation: Menu and its four item kinds', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Menu.name);
    expect(platform.props).toEqual({ open: 'visible', placement: 'placement' });
    expect(platform.events).toEqual({ close: 'onDismiss' });
    expect(Object.fromEntries(Object.entries(platform.items ?? {}).map(([kind, mapping]) => [kind, mapping.name]))).toEqual({ item: 'MenuItem', 'checkbox-item': 'MenuCheckboxItem', 'radio-item': 'MenuRadioItem', group: 'MenuGroup' });
    expect(platform.items?.item?.events).toEqual({ click: 'onPress' });
    expect(platform.items?.['checkbox-item']?.events).toEqual({ change: 'onCheckedChange' });
    expect(platform.items?.group?.events).toEqual({ change: 'onValueChange' });
  });

  test('the conditions are the token axis: unselected (the default), selected and destructive; placement is closed', () => {
    expect(Object.keys(tokens.conditions)).toEqual(CONDITIONS);
    expect(spec.props.find((p) => p.name === 'placement')?.values).toEqual(['bottom-start', 'bottom-end', 'top-start', 'top-end']);
  });

  test('defaults follow the spec: closed, bottom-start — nothing is rendered until visible', async () => {
    await render(
      <TanreiProvider theme="light">
        <Menu testID={ID} items={ACTIONS} />
      </TanreiProvider>,
    );
    expect(screen.queryByTestId(ID, { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId(`${ID}.overlay`, { includeHiddenElements: true })).toBeNull();
  });
});

describe('opening, placing and closing (MNU-1 … MNU-5, MNU-25)', () => {
  test('MNU-1 / MNU-25: open presents the surface in TanreiProvider\'s overlay layer (not a Modal), after the app\'s content, at comp.menu.surface.elevation, and moves focus to the first ENABLED item — keyboard and screen reader', async () => {
    const focus = focusSpy();
    const announce = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => undefined);
    await mountOverlay({ items: [{ label: 'Paste', disabled: true }, ...ACTIONS] });
    await layOut();
    await wait(0);
    expect(JSON.stringify(screen.toJSON())).not.toContain('"type":"Modal"');
    const layer = screen.getByTestId('tanrei.overlay', { includeHiddenElements: true });
    expect(layer.props.pointerEvents).toBe('box-none');
    expect(screen.getByTestId(`${ID}.overlay`, { includeHiddenElements: true }).props.pointerEvents).toBe('box-none');
    const level = resolveElevation(tanrei.elevation[tokens.surfaceElevation], (name) => role(name));
    expect(viewStyle(surface()).boxShadow).toEqual(level.boxShadow);
    expect(viewStyle(screen.getByTestId(`${ID}.elevation-ring`, { includeHiddenElements: true })).borderColor).toBe(level.ring!.color);
    expect(focusedRow(focus)).toBe(`${ID}.item.1`);
    expect(row(1).props.focusable).toBe(true);
    expect(announce).toHaveBeenCalledWith(expect.objectContaining({ props: expect.objectContaining({ testID: `${ID}.item.1` }) }), 'focus');
  });

  test('MNU-1: closing removes the surface and gives focus back to the anchor — only when focus was inside the menu', async () => {
    const { view, ref, element } = await mountOverlay({ items: ACTIONS });
    await fireEvent(row(0), 'focus');
    await view.rerender(element(false));
    expect(screen.queryByTestId(`${ID}.overlay`, { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId('tanrei.overlay', { includeHiddenElements: true })).toBeNull();
    expect(ref.current.focus).toHaveBeenCalledTimes(1);
    await view.rerender(element(true));
    await view.rerender(element(false));
    expect(ref.current.focus).toHaveBeenCalledTimes(1);
  });

  test('MNU-1: focus moves in again once the surface is placed (its rows are drawn in the layer after the first render)', async () => {
    const focus = focusSpy();
    await mountOverlay({ items: ACTIONS });
    await wait(0);
    focus.mockClear();
    await layOut();
    await wait(0);
    expect(focusedRow(focus)).toBe(`${ID}.item.0`);
  });

  test('MNU-1: outside a TanreiProvider there is no overlay layer: nothing is drawn, and development builds say so', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await render(<Menu testID={ID} anchorRef={anchorRef()} visible items={ACTIONS} />);
    expect(screen.queryByTestId(ID, { includeHiddenElements: true })).toBeNull();
    expect(warn.mock.calls.map(([message]) => String(message))).toContainEqual(expect.stringContaining('outside a TanreiProvider'));
  });

  test('MNU-1: inside a Dialog the menu is drawn in the dialog\'s own layer, above its scrim', async () => {
    await render(
      <TanreiProvider theme="light">
        <Dialog visible headline="Sort" testID="dialog">
          <Menu testID={ID} anchorRef={anchorRef()} visible items={ACTIONS} />
        </Dialog>
      </TanreiProvider>,
    );
    const inner = screen.getByTestId('dialog.layer', { includeHiddenElements: true });
    expect(within(inner).getByTestId(ID, { includeHiddenElements: true })).toBeTruthy();
  });

  test.each([
    ['bottom-start', { top: ANCHOR.y + ANCHOR.height + 4, left: ANCHOR.x, side: 'bottom' }],
    ['bottom-end', { top: ANCHOR.y + ANCHOR.height + 4, left: ANCHOR.x + ANCHOR.width - SURFACE.width, side: 'bottom' }],
    ['top-start', { top: ANCHOR.y - 4 - SURFACE.height, left: ANCHOR.x, side: 'top' }],
  ] as const)('MNU-2: %s places the surface comp.menu.surface.offset from the anchor on that side, aligned by that edge (clamped inside the margin)', (placement, expected) => {
    const anchor = { ...ANCHOR, y: 400 };
    const place = (p: MenuPlacement) => placeMenu({ anchor, surface: SURFACE, viewport: { width: 400, height: 800 }, placement: p, offset: 4, margin: 8, rtl: false });
    const at = place(placement);
    const top = expected.side === 'bottom' ? anchor.y + anchor.height + 4 : anchor.y - 4 - SURFACE.height;
    expect(at).toMatchObject({ top, side: expected.side, left: Math.max(8, expected.left) });
  });

  test('MNU-2: it flips to the other side when this one has too little room and the other has more; it shifts to stay within the margin; its height is limited to the room left; right-to-left mirrors start and end', () => {
    const viewport = { width: 400, height: 800 };
    const low = { x: 300, y: 700, width: 80, height: 40 };
    expect(placeMenu({ anchor: low, surface: SURFACE, viewport, placement: 'bottom-start', offset: 4, margin: 8, rtl: false })).toEqual({ top: 700 - 4 - 150, left: 400 - 8 - 200, maxHeight: 700 - 4 - 8, side: 'top' });
    const high = { x: 0, y: 10, width: 80, height: 40 };
    expect(placeMenu({ anchor: high, surface: SURFACE, viewport, placement: 'top-end', offset: 4, margin: 8, rtl: false })).toMatchObject({ side: 'bottom', top: 54, left: 8 });
    const tall = { width: 200, height: 2000 };
    const placed = placeMenu({ anchor: { x: 20, y: 100, width: 120, height: 40 }, surface: tall, viewport, placement: 'bottom-start', offset: 4, margin: 8, rtl: false });
    expect(placed).toEqual({ top: 144, left: 20, maxHeight: 800 - 8 - 144, side: 'bottom' });
    expect(placeMenu({ anchor: ANCHOR, surface: SURFACE, viewport, placement: 'bottom-start', offset: 4, margin: 8, rtl: true }).left).toBe(ANCHOR.x + ANCHOR.width - SURFACE.width < 8 ? 8 : ANCHOR.x + ANCHOR.width - SURFACE.width);
    const wide = { x: 150, y: 100, width: 120, height: 40 };
    expect(placeMenu({ anchor: wide, surface: SURFACE, viewport, placement: 'bottom-end', offset: 4, margin: 8, rtl: true }).left).toBe(150);
  });

  test('MNU-2: in the layer it places the surface from the measured anchor and its own size, scrolls its items beyond the room left, and measures the anchor again when the window changes', async () => {
    const { ref } = await mountOverlay({ items: ACTIONS });
    await layOut();
    expect(viewStyle(screen.getByTestId(`${ID}.placement`, { includeHiddenElements: true }))).toMatchObject({ position: 'absolute', top: ANCHOR.y + ANCHOR.height + tokens.surfaceOffset, left: ANCHOR.x, maxHeight: 800 - tokens.surfaceViewportMargin - (ANCHOR.y + ANCHOR.height + tokens.surfaceOffset) });
    expect(screen.getByTestId(`${ID}.scroll`, { includeHiddenElements: true })).toBeTruthy();
    const calls = ref.current.measureInWindow.mock.calls.length;
    await act(async () => {
      Dimensions.set({ window: { ...WINDOW, width: 800, height: 400, fontScale: 1 }, screen: { ...WINDOW, width: 800, height: 400, fontScale: 1 } });
    });
    expect(ref.current.measureInWindow.mock.calls.length).toBeGreaterThan(calls);
    await act(async () => {
      Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
    });
  });

  test('MNU-2: anchor coordinates are taken relative to the layer, and the provider\'s insets move the viewport\'s edges in', async () => {
    // The layer's host view is 20 down in the window. The View mock's measureInWindow is one shared jest.fn: reset after.
    const layerBox = jest.spyOn(View.prototype as unknown as { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void }, 'measureInWindow').mockImplementation((callback) => callback(0, 20, 400, 780));
    try {
      await mountOverlay({ items: ACTIONS, placement: 'top-start' }, { theme: 'light', insets: { top: 60, left: 30 } });
      await layOut();
    } finally {
      layerBox.mockReset();
    }
    // The anchor is 100 down in the window, 80 down in the layer; above it: 80 - 4 - 8 - (60 - 20) = 28 < 150, so it flips.
    const placed = viewStyle(screen.getByTestId(`${ID}.placement`, { includeHiddenElements: true }));
    expect(placed).toMatchObject({ top: 80 + ANCHOR.height + tokens.surfaceOffset, left: 30 + tokens.surfaceViewportMargin });
    expect(placeMenu({ anchor: { x: 0, y: 80, width: 120, height: 40 }, surface: SURFACE, viewport: { width: 400, height: 780 }, placement: 'bottom-start', offset: 4, margin: 8, rtl: false, insets: { top: 40, right: 0, bottom: 34, left: 30 } })).toEqual({ top: 124, left: 38, maxHeight: 780 - 8 - 34 - 124, side: 'bottom' });
  });

  test('MNU-3: the surface — its color, corners, padding and width bounds — clips its items to its shape; corner smoothing (cupertino) reaches it', async () => {
    const view = await mountInline({ items: ACTIONS });
    expect(viewStyle(surface())).toMatchObject({ alignSelf: 'flex-start', minWidth: tokens.surfaceMinWidth, maxWidth: tokens.surfaceMaxWidth, borderRadius: tokens.surfaceShape, backgroundColor: painted(tokens.surfaceColor) });
    expect(viewStyle(screen.getByTestId(`${ID}.clip`))).toMatchObject({ overflow: 'hidden', borderRadius: tokens.surfaceShape });
    expect(viewStyle(screen.getByTestId(`${ID}.clip`).children[0] as Instance)).toMatchObject({ paddingVertical: tokens.surfacePaddingBlock, paddingStart: tokens.surfacePaddingInline, paddingEnd: tokens.surfacePaddingInline });
    expect(viewStyle(surface()).borderCurve).toBeUndefined();
    await view.unmount();
    await mountInline({ items: ACTIONS }, { theme: 'light', system: cupertino });
    expect(viewStyle(surface())).toMatchObject({ borderRadius: cupertino.components.menu.surfaceShape, borderCurve: 'continuous' });
    expect(viewStyle(screen.getByTestId(`${ID}.clip`)).borderCurve).toBe('continuous');
  });

  test('MNU-4: once placed it fades in and grows from the edge facing the anchor over the open motion; it fades out over the close motion before it leaves', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const { view, element } = await mountOverlay({ items: ACTIONS });
    await wait(0);
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionOpenDuration)).toHaveLength(0);
    await layOut();
    const open = timing.mock.calls.find(([, config]) => config.duration === tokens.motionOpenDuration);
    expect(open?.[1]).toMatchObject({ toValue: 1, useNativeDriver: true });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionOpenEasing);
    expect(viewStyle(screen.getByTestId(`${ID}.placement`, { includeHiddenElements: true })).transformOrigin).toBe('top');
    await wait(tokens.motionOpenDuration + 50);
    await view.rerender(element(false));
    const close = timing.mock.calls.find(([, config]) => config.duration === tokens.motionCloseDuration);
    expect(close?.[1]).toMatchObject({ toValue: 0 });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionCloseEasing);
    expect(screen.getByTestId(`${ID}.overlay`, { includeHiddenElements: true })).toBeTruthy();
    await wait(tokens.motionCloseDuration + 50);
    expect(screen.queryByTestId(`${ID}.overlay`, { includeHiddenElements: true })).toBeNull();
  });

  test('MNU-4: opened above the anchor it grows from its bottom edge; where motion is reduced it appears and disappears at once', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const { view, element } = await mountOverlay({ items: ACTIONS, placement: 'top-start' });
    await layOut({ width: 200, height: 60 });
    expect(viewStyle(screen.getByTestId(`${ID}.placement`, { includeHiddenElements: true })).transformOrigin).toBe('bottom');
    expect(timing).not.toHaveBeenCalled();
    await view.rerender(element(false));
    expect(screen.queryByTestId(`${ID}.overlay`, { includeHiddenElements: true })).toBeNull();
  });

  test('MNU-5: Escape, Android\'s back button, a press outside and Tab each ask to close once, with their reason; Escape and Tab are consumed', async () => {
    let back: ((...args: never[]) => unknown) | null = null;
    const remove = jest.fn();
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      back = handler;
      return { remove };
    });
    const onDismiss = jest.fn();
    const { view, element } = await mountOverlay({ items: ACTIONS, onDismiss });
    const prevented = jest.fn();
    await fireEvent(surface(), 'keyDown', { nativeEvent: { key: 'Escape' }, preventDefault: prevented });
    await act(async () => {
      expect(back!()).toBe(true);
    });
    await fireEvent.press(screen.getByTestId(`${ID}.outside`, { includeHiddenElements: true }));
    await fireEvent(surface(), 'keyDown', { nativeEvent: { key: 'Tab' }, preventDefault: prevented });
    expect(onDismiss.mock.calls).toEqual([['escape'], ['back'], ['outside'], ['tab']] satisfies [MenuDismissReason][]);
    expect(prevented).toHaveBeenCalledTimes(2);
    await view.rerender(element(false));
    expect(remove).toHaveBeenCalled();
  });

  test('MNU-5: focus moving out of the menu — an item loses focus and no other item takes it — asks to close with \'focus-out\'; moving between items or a blur that comes with another close request does not', async () => {
    const onDismiss = jest.fn();
    await mountOverlay({ items: ACTIONS, onDismiss });
    await fireEvent(row(0), 'focus');
    // Focus moving from item to item: the blur and the focus arrive together.
    await act(async () => {
      fireEvent(row(0), 'blur');
      fireEvent(row(1), 'focus');
    });
    await wait(10);
    expect(onDismiss).not.toHaveBeenCalled();
    await fireEvent(row(1), 'blur');
    await wait(10);
    expect(onDismiss.mock.calls).toEqual([['focus-out']]);
    onDismiss.mockClear();
    await fireEvent(row(2), 'focus');
    await key('Tab');
    await fireEvent(row(2), 'blur');
    await wait(10);
    expect(onDismiss.mock.calls).toEqual([['tab']]);
    const close = (spec as unknown as { events: { name: string; description: string }[] }).events.find((event) => event.name === 'close')!;
    for (const reason of ['escape', 'back', 'outside', 'tab', 'focus-out', 'item'] satisfies MenuDismissReason[]) expect(close.description).toContain(reason);
  });

  test('MNU-5: focus that was inside when a close was asked for goes back to the anchor even when it left the rows before the menu closed', async () => {
    const { view, ref, element } = await mountOverlay({ items: ACTIONS });
    await fireEvent(row(0), 'focus');
    await key('Tab');
    await fireEvent(row(0), 'blur');
    await view.rerender(element(false));
    expect(ref.current.focus).toHaveBeenCalledTimes(1);
  });

  test('MNU-25: no scrim and no focus trap — the press-catcher behind the surface is transparent, takes no focus and is hidden from assistive technology, so the screen behind stays reachable; the README states what a press outside does', async () => {
    await mountOverlay({ items: ACTIONS });
    const outside = screen.getByTestId(`${ID}.outside`, { includeHiddenElements: true });
    expect(viewStyle(outside).backgroundColor).toBeUndefined();
    expect(outside.props).toMatchObject({ accessible: false, focusable: false, importantForAccessibility: 'no', accessibilityElementsHidden: true });
    expect(surface().props.accessibilityViewIsModal).toBeUndefined();
    expect(JSON.stringify(screen.toJSON())).not.toContain('"type":"Modal"');
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('a press outside closes the menu and does not reach what is under it');
    expect(readme).toMatch(/the screen behind it\s+stays reachable/);
  });
});

describe('activation (MNU-6, MNU-9)', () => {
  test('MNU-6: activating an action calls its onPress once, then asks to close', async () => {
    const calls: string[] = [];
    await mountOverlay({ items: [{ label: 'Copy', onPress: () => calls.push('click') }], onDismiss: (reason) => calls.push(`close:${reason}`) });
    await fireEvent.press(row(0));
    expect(calls).toEqual(['click', 'close:item']);
  });

  test('MNU-6: a checkbox item switches its checked through onCheckedChange; a radio item sets its group\'s value; a checked radio item emits nothing; each then asks to close', async () => {
    const onCheckedChange = jest.fn();
    const onValueChange = jest.fn();
    const onDismiss = jest.fn();
    await mountOverlay({
      items: [
        { kind: 'checkbox-item', label: 'Show grid', checked: true, onCheckedChange },
        { kind: 'group', value: 'name', onValueChange, items: [{ kind: 'radio-item', label: 'Name', value: 'name' }, { kind: 'radio-item', label: 'Date', value: 'date' }] },
      ],
      onDismiss,
    });
    await fireEvent.press(row(0));
    await wait(HOLD + 30);
    await fireEvent.press(row(2));
    await wait(HOLD + 30);
    await fireEvent.press(row(1));
    expect(onCheckedChange.mock.calls).toEqual([[false]]);
    expect(onValueChange.mock.calls).toEqual([['date']]);
    expect(onDismiss.mock.calls).toEqual([['item'], ['item'], ['item']]);
  });

  test('MNU-6: Space on a checkbox or radio item switches it and leaves the menu open; Enter closes it', async () => {
    const onCheckedChange = jest.fn();
    const onDismiss = jest.fn();
    await mountOverlay({ items: [{ kind: 'checkbox-item', label: 'Show grid', onCheckedChange }], onDismiss });
    await key(' ');
    await click(0);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(onDismiss).not.toHaveBeenCalled();
    await wait(HOLD + 30);
    await key('Enter');
    await click(0);
    expect(onDismiss.mock.calls).toEqual([['item']]);
  });

  test('MNU-6: a touch after a Space is a touch: it closes the menu', async () => {
    const onDismiss = jest.fn();
    await mountOverlay({ items: [{ kind: 'checkbox-item', label: 'Show grid' }], onDismiss });
    await key(' ');
    await fireEvent(row(0), 'pressIn');
    await fireEvent.press(row(0));
    expect(onDismiss.mock.calls).toEqual([['item']]);
    await release(0);
  });

  test('MNU-9: a disabled item emits no click, change or group change, and exposes disabled', async () => {
    const onPress = jest.fn();
    const onCheckedChange = jest.fn();
    const onValueChange = jest.fn();
    const onDismiss = jest.fn();
    await mountOverlay({
      items: [
        { label: 'Paste', onPress, disabled: true },
        { kind: 'checkbox-item', label: 'Show grid', onCheckedChange, disabled: true },
        { kind: 'group', value: null, onValueChange, items: [{ kind: 'radio-item', label: 'Name', value: 'name', disabled: true }] },
      ],
      onDismiss,
    });
    for (const i of [0, 1, 2]) {
      await fireEvent.press(row(i));
      await click(i);
      expect(row(i).props.accessibilityState.disabled).toBe(true);
      expect(row(i)).toBeDisabled();
    }
    expect([onPress, onCheckedChange, onValueChange, onDismiss].map((fn) => fn.mock.calls.length)).toEqual([0, 0, 0, 0]);
  });
});

describe('keyboard and pointer focus (MNU-7, MNU-8)', () => {
  test('MNU-7: Down and Up Arrow wrap through every item, passing through groups; Home and End go to the ends; disabled items are reached', async () => {
    const focus = focusSpy();
    await mountOverlay({ items: [{ label: 'Archive' }, { kind: 'group', title: 'View', items: [{ kind: 'checkbox-item', label: 'Show grid', disabled: true }, { kind: 'checkbox-item', label: 'Show rulers' }] }] });
    await wait(0);
    expect(focusedRow(focus)).toBe(`${ID}.item.0`);
    await fireEvent(row(0), 'focus');
    await key('ArrowUp');
    expect(focusedRow(focus)).toBe(`${ID}.item.2`);
    await fireEvent(row(2), 'focus');
    await key('ArrowDown');
    expect(focusedRow(focus)).toBe(`${ID}.item.0`);
    await fireEvent(row(0), 'focus');
    await key('ArrowDown');
    expect(focusedRow(focus)).toBe(`${ID}.item.1`);
    await key('End');
    expect(focusedRow(focus)).toBe(`${ID}.item.2`);
    await key('Home');
    expect(focusedRow(focus)).toBe(`${ID}.item.0`);
  });

  test('MNU-7: typeahead moves to the next item whose label begins with the typed characters; group titles and dividers never take focus', async () => {
    const focus = focusSpy();
    let now = 5_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    await mountOverlay({ items: EVERY_KIND });
    await fireEvent(row(0), 'focus');
    await key('s');
    expect(focusedRow(focus)).toBe(`${ID}.item.2`);
    await fireEvent(row(2), 'focus');
    now += 200;
    await key('h');
    await key('o');
    await key('w');
    await key(' ');
    await key('r');
    expect(focusedRow(focus)).toBe(`${ID}.item.3`);
    now += TYPEAHEAD_WINDOW + 1;
    await fireEvent(row(3), 'focus');
    await key('d');
    // After "Show rulers" the next label beginning with d is "Date" (the search wraps only past the end).
    expect(focusedRow(focus)).toBe(`${ID}.item.5`);
    await fireEvent(row(5), 'focus');
    now += TYPEAHEAD_WINDOW + 1;
    await key('d');
    expect(focusedRow(focus)).toBe(`${ID}.item.1`);
    for (const name of ['group.2.title', 'group.3.title', 'divider.2', 'divider.3']) expect(screen.getByTestId(`${ID}.${name}`, { includeHiddenElements: true }).props.focusable).toBeUndefined();
  });

  test('MNU-8: a pointer moving onto an item moves focus there — drawn hovered, without the focus ring — and focus stays there when the pointer leaves', async () => {
    const focus = focusSpy();
    await mountOverlay({ items: ACTIONS }, { theme: 'light', system: acme });
    await wait(0);
    await fireEvent(row(1), 'hoverIn');
    expect(focusedRow(focus)).toBe(`${ID}.item.1`);
    await fireEvent(row(1), 'focus');
    expect(part(1, 'focus-ring')).toBeNull();
    expectRowDrawnFrom(1, 'unselected', 'hovered', acme);
    expect(row(1).props.focusable).toBe(true);
    await fireEvent(row(1), 'hoverOut');
    expect(row(1).props.focusable).toBe(true);
    // The arrow keys continue from it, and focus they move shows the ring.
    await key('ArrowDown');
    expect(focusedRow(focus)).toBe(`${ID}.item.2`);
    await fireEvent(row(1), 'blur');
    await fireEvent(row(2), 'focus');
    expect(part(2, 'focus-ring')).not.toBeNull();
    expectRowDrawnFrom(2, 'unselected', 'focused', acme);
  });
});

describe('states (MNU-10 … MNU-18)', () => {
  describe.each([
    ['an action', 'unselected', [{ label: 'Copy', leadingIcon: 'content_copy', supportingText: 'To the clipboard', trailingText: '⌘C', trailingIcon: 'info' }]],
    ['a checked checkbox item', 'selected', [{ kind: 'checkbox-item', label: 'Show grid', leadingIcon: 'grid_on', checked: true }]],
    ['a destructive action', 'destructive', [{ label: 'Delete', leadingIcon: 'delete', destructive: true }]],
  ] as const)('MNU-10: %s', (_name, condition, items) => {
    test.each(ACTIVE)('%s: container, texts, icons, mark and opacity come from its condition\'s tokens, and it returns to rest', async (target) => {
      await mountInline({ items: items as unknown as MenuEntry[] });
      expectRowDrawnFrom(0, condition, 'enabled');
      await enter(0, target);
      expectRowDrawnFrom(0, condition, target);
      if (target === 'hovered') await fireEvent(row(0), 'hoverOut');
      if (target === 'focused') await fireEvent(row(0), 'blur');
      if (target === 'pressed') await release(0);
      expectRowDrawnFrom(0, condition, 'enabled');
    });
  });

  test('MNU-10: precedence is pressed over focused over hovered, under the acme fixture system; pointer or touch focus does not select focused', async () => {
    const unselected = acme.components.menu.conditions.unselected;
    const expected = (name: InteractionState) => fill(unselected[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    await mountInline({ items: ACTIONS }, { theme: 'light', system: acme });
    const background = () => viewStyle(row(0)).backgroundColor;
    await fireEvent(row(0), 'hoverIn');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(row(0), 'focus');
    // The hover moved focus here (MNU-8): still drawn hovered.
    expect(background()).toBe(expected('hovered'));
    await fireEvent(row(0), 'blur');
    await fireEvent(row(0), 'focus');
    expect(background()).toBe(expected('focused'));
    await fireEvent(row(0), 'pressIn');
    expect(background()).toBe(expected('pressed'));
    await release(0);
    expect(background()).toBe(expected('focused'));
    await fireEvent(row(0), 'blur');
    await fireEvent(row(0), 'hoverOut');
    await fireEvent(row(1), 'pressIn');
    await fireEvent(row(1), 'focus');
    await release(1);
    expect(viewStyle(row(1)).backgroundColor).toBe(expected('enabled'));
  });

  test('MNU-10: in the default system a state mixes the condition\'s state-layer color (its label color) into the row — the error color for a destructive one', async () => {
    for (const condition of CONDITIONS) {
      const resting = tokens.conditions[condition].enabled;
      expect(resting.stateLayerColor).toEqual(resting.labelColor);
    }
    await mountInline({ items: [{ label: 'Delete', destructive: true }] });
    await fireEvent(row(0), 'focus');
    const resting = tokens.conditions.destructive.enabled;
    expect(viewStyle(row(0)).backgroundColor).toBe(painted({ kind: 'mix', base: resting.containerColor, with: resting.stateLayerColor, amount: tanrei.state.focusStateLayerOpacity }));
    expect(painted(resting.labelColor)).toBe(role('error'));
  });

  test('MNU-11: keyboard focus shows the focus ring INSIDE the row, without animation; touch focus does not', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mountInline({ items: ACTIONS });
    await wait(10);
    timing.mockClear();
    await fireEvent(row(0), 'focus');
    expect(viewStyle(part(0, 'focus-ring')!)).toEqual({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: measure.focus.outerWidth, borderColor: role('focusRing'), borderRadius: tokens.focusedContainerShape, pointerEvents: 'none' });
    expect(timing.mock.calls.every(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
    await wait(tokens.motionStateDuration * 2);
    await fireEvent(row(1), 'pressIn');
    await fireEvent(row(1), 'focus');
    expect(part(1, 'focus-ring')).toBeNull();
    await release(1);
    await wait(tokens.motionStateDuration * 2);
  });

  test('MNU-12: every row is at least sys.target.touch tall (the default 44 grows to 48) and extends no hit area over its neighbours', async () => {
    expect(tokens.containerHeight).toBeLessThan(measure.target.touch);
    await mountInline({ items: ACTIONS });
    for (const i of [0, 1, 2]) {
      expect(viewStyle(row(i)).minHeight).toBe(measure.target.touch);
      expect(row(i).props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    }
  });

  test('MNU-13: a disabled item of each condition is drawn from its disabled tokens; in the default system it grows no fill and an unchecked or destructive one draws no check', async () => {
    await mountInline({ items: [{ label: 'Paste', disabled: true }, { kind: 'checkbox-item', label: 'Show grid', checked: true, disabled: true }, { label: 'Delete', destructive: true, disabled: true }] });
    expectRowDrawnFrom(0, 'unselected', 'disabled');
    expectRowDrawnFrom(1, 'selected', 'disabled');
    expectRowDrawnFrom(2, 'destructive', 'disabled');
    for (const condition of CONDITIONS) expect(evaluatePaint(tokens.conditions[condition].disabled.containerColor, tanrei.colors.light).a).toBe(0);
    expect(evaluatePaint(tokens.conditions.unselected.disabled.markColor, tanrei.colors.light).a).toBe(0);
    expect(evaluatePaint(tokens.conditions.destructive.disabled.markColor, tanrei.colors.light).a).toBe(0);
    expect(checkLegs(1)).toHaveLength(2);
  });

  test('MNU-14: an unknown placement renders as bottom-start, and development builds report it once; a release build is silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { view } = await mountOverlay({ items: ACTIONS, placement: 'left' as MenuPlacement });
    await layOut();
    expect(viewStyle(screen.getByTestId(`${ID}.placement`, { includeHiddenElements: true })).top).toBe(ANCHOR.y + ANCHOR.height + tokens.surfaceOffset);
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('Menu placement "left" is not defined; using "bottom-start"')]);
    await view.unmount();
    warn.mockClear();
    resetLookupReports();
    development(false);
    await mountOverlay({ items: ACTIONS, placement: 'right' as MenuPlacement });
    expect(warn).not.toHaveBeenCalled();
  });

  test('MNU-15: the pressed state appears at once and stays visible for duration.pressHold; a bare click shows it too', async () => {
    await mountInline({ items: ACTIONS });
    await fireEvent(row(0), 'pressIn');
    expectRowDrawnFrom(0, 'unselected', 'pressed');
    await fireEvent(row(0), 'pressOut');
    await wait(HOLD / 2);
    expectRowDrawnFrom(0, 'unselected', 'pressed');
    await wait(HOLD / 2 + 30);
    expectRowDrawnFrom(0, 'unselected', 'enabled');
    await click(1);
    expectRowDrawnFrom(1, 'unselected', 'pressed');
    await wait(HOLD + 30);
    expectRowDrawnFrom(1, 'unselected', 'enabled');
  });

  test('MNU-16 overlay (the default) and ripple (m3-like): the pressed tokens at once / the pressed color grows from the point of contact over the feedback duration while the row keeps the state under the press', async () => {
    reduceMotion(false);
    const view = await mountInline({ items: ACTIONS });
    await fireEvent(row(0), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } } });
    await fireEvent(row(0), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(part(0, 'ripple')).toBeNull();
    expect(viewStyle(row(0)).backgroundColor).toBe(fill(tokens.conditions.unselected.pressed.containerColor));
    await release(0);
    await wait(tokens.motionStateDuration * 2);
    await view.unmount();

    const menu3 = m3Like.components.menu;
    const timing = jest.spyOn(Animated, 'timing');
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 200, 48, 0, 0));
    await mountInline({ items: ACTIONS }, { theme: 'light', system: m3Like });
    await fireEvent(row(0), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 48 } } });
    timing.mockClear();
    await fireEvent(row(0), 'pressIn', { nativeEvent: { pageX: 30, pageY: 20 } });
    const reach = Math.hypot(200 - 30, 48 - 20);
    expect(viewStyle(part(0, 'ripple.wave')!)).toMatchObject({ left: 30 - reach, top: 20 - reach, backgroundColor: painted(menu3.conditions.unselected.pressed.containerColor, 'light', m3Like) });
    expect(viewStyle(row(0)).backgroundColor).toBe(fill(menu3.conditions.unselected.enabled.containerColor, 'light', m3Like));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: menu3.motionFeedbackDuration, useNativeDriver: true });
    await release(0);
    await wait(menu3.motionStateDuration * 2 + 50);
    expect(part(0, 'ripple')).toBeNull();
  });

  test('MNU-16 dim (cupertino): the pressed opacity on the whole row and no state layer; none: no answer at all, the click still happens', async () => {
    const menu3 = cupertino.components.menu;
    const view = await mountInline({ items: ACTIONS }, { theme: 'light', system: cupertino });
    await fireEvent(row(0), 'pressIn');
    expect(viewStyle(row(0))).toMatchObject({ opacity: menu3.pressedOpacity, backgroundColor: fill(menu3.conditions.unselected.enabled.containerColor, 'light', cupertino) });
    expect(textStyle(part(0, 'label')!).color).toBe(painted(menu3.conditions.unselected.pressed.labelColor, 'light', cupertino));
    await release(0);
    await view.unmount();

    const onPress = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withCondition('unselected', { pressed: { containerColor: literal(1, 2, 3), labelColor: literal(4, 5, 6) } }, withMenu({ pressedOpacity: 0.5 })));
    await mountInline({ items: [{ label: 'Copy', onPress }] }, { theme: 'light', system });
    await fireEvent(row(0), 'pressIn');
    expectRowDrawnFrom(0, 'unselected', 'enabled', system);
    await fireEvent.press(row(0));
    expect(onPress).toHaveBeenCalledTimes(1);
    await release(0);
  });

  test('MNU-17: rows ease their corners by the smoothing (cupertino: continuous) — the row and its focus ring; glow (acme) is one halo', async () => {
    const view = await mountInline({ items: ACTIONS }, { theme: 'light', system: cupertino });
    await fireEvent(row(0), 'focus');
    expect(viewStyle(row(0))).toMatchObject({ borderRadius: cupertino.components.menu.focusedContainerShape, borderCurve: 'continuous' });
    expect(viewStyle(part(0, 'focus-ring')!).borderCurve).toBe('continuous');
    await view.unmount();
    await mountInline({ items: ACTIONS }, { theme: 'light', system: acme });
    await fireEvent(row(0), 'focus');
    expect(viewStyle(part(0, 'focus-ring')!).boxShadow).toHaveLength(1);
  });

  test('MNU-18: a destructive action is drawn from destructive, a checked checkbox item and a checked radio item from selected, everything else from unselected', async () => {
    await mountInline({ items: EVERY_KIND });
    expectRowDrawnFrom(0, 'unselected', 'enabled');
    expectRowDrawnFrom(1, 'destructive', 'enabled');
    expectRowDrawnFrom(2, 'selected', 'enabled');
    expectRowDrawnFrom(3, 'unselected', 'enabled');
    expectRowDrawnFrom(4, 'unselected', 'enabled');
    expectRowDrawnFrom(5, 'selected', 'enabled');
    expect(textStyle(part(1, 'label')!).color).toBe(role('error'));
  });
});

describe('layout (MNU-19 … MNU-23, MNU-28)', () => {
  test('MNU-19: the mark column while any item is a checkbox or radio item and the icon column while any has an icon — kept in every row, so labels align', async () => {
    await mountInline({ items: EVERY_KIND });
    for (const i of [0, 1, 2, 3, 4, 5]) {
      expect(viewStyle(part(i, 'mark')!)).toMatchObject({ width: tokens.markSize });
      expect(viewStyle(part(i, 'icon-column')!)).toMatchObject({ width: tokens.leadingIconSize });
    }
    expect(part(2, 'leading-icon')).toBeNull();
    await screen.unmount();
    await mountInline({ items: [{ label: 'Cut' }, { label: 'Copy' }] });
    expect(part(0, 'mark')).toBeNull();
    expect(part(0, 'icon-column')).toBeNull();
  });

  test('MNU-19: one row — logical padding at each end, then the columns, the text taking the rest, the trailing text and icon, the gap between; right-to-left mirrors it by those logical values', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    try {
      await mountInline({ items: [{ kind: 'checkbox-item', label: 'Show grid', leadingIcon: 'grid_on', trailingText: '⌘G', trailingIcon: 'info' }] });
      expect(viewStyle(row(0))).toMatchObject({ flexDirection: 'row', paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInline, paddingVertical: tokens.containerPaddingBlock });
      for (const name of ['paddingLeft', 'paddingRight', 'direction'] as const) expect(viewStyle(row(0))[name]).toBeUndefined();
      const content = part(0, 'content')!;
      expect(viewStyle(content)).toMatchObject({ flexDirection: 'row', gap: tokens.containerGap, flex: 1 });
      const order = [part(0, 'mark')!, part(0, 'icon-column')!, part(0, 'text')!].map((node) => content.children.indexOf(node));
      expect(order).toEqual([0, 1, 2]);
      expect(content.children.length).toBe(5);
    } finally {
      rtl.restore();
    }
  });

  test('MNU-19: the mark, the icons and the trailing text sit on the label\'s FIRST line (the checkbox\'s rule): an icon taller than the line moves the label down, a wrapped label grows downwards', async () => {
    const system = withMenu({ leadingIconSize: 28 });
    await mountInline({ items: [{ kind: 'checkbox-item', label: 'Show grid', leadingIcon: 'grid_on', trailingText: '⌘G' }] }, { theme: 'light', system });
    const line = tanrei.typescale.label.lineHeight;
    expect(viewStyle(part(0, 'icon-column')!)).toMatchObject({ height: 28, justifyContent: 'center' });
    expect(viewStyle(part(0, 'mark')!)).toMatchObject({ height: 28 });
    expect(viewStyle(part(0, 'text')!).paddingTop).toBe((28 - line) / 2);
    await fireEvent(part(0, 'label')!, 'textLayout', { nativeEvent: { lines: [{ y: 0, height: 30 }, { y: 30, height: 30 }] } });
    expect(viewStyle(part(0, 'icon-column')!).height).toBe(30);
    expect(viewStyle(part(0, 'text')!).paddingTop).toBe(0);
  });

  test('MNU-20: a row is at least comp.menu.container.height tall (and the target), padded above and below; each text in its type style, wrapping, scaling with the font', async () => {
    await mountInline({ items: [{ label: 'Share link', supportingText: 'Anyone with the link can view', trailingText: '⌘L' }] }, { theme: 'light', system: withMenu({ containerHeight: 56 }) });
    expect(viewStyle(row(0))).toMatchObject({ minHeight: 56, paddingVertical: tokens.containerPaddingBlock });
    for (const [name, typescale] of [['label', tokens.labelTypescale], ['supporting-text', tokens.supportingTextTypescale], ['trailing-text', tokens.trailingTextTypescale]] as const) {
      const style = (tanrei.typescale as unknown as Record<string, { size: number; lineHeight: number }>)[typescale]!;
      expect(textStyle(part(0, name)!)).toMatchObject({ fontSize: style.size, lineHeight: style.lineHeight });
      expect(part(0, name)!.props.numberOfLines).toBeUndefined();
      expect(part(0, name)!.props.allowFontScaling).toBe(true);
    }
    expect(viewStyle(row(0)).height).toBeUndefined();
  });

  test('MNU-21: icons at their sizes in the glyph style of the item\'s condition (acme: a family per state); an empty name draws nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mountInline({ items: [{ kind: 'checkbox-item', label: 'Show grid', leadingIcon: 'grid_on', trailingIcon: 'info', checked: true }, { label: 'Copy', leadingIcon: 'content_copy', trailingIcon: '' }] }, { theme: 'light', system: acme });
    const menu3 = acme.components.menu;
    expect(viewStyle(part(0, 'leading-icon')!)).toMatchObject({ width: menu3.leadingIconSize, height: menu3.leadingIconSize });
    expect(viewStyle(part(0, 'trailing-icon')!)).toMatchObject({ width: menu3.trailingIconSize, height: menu3.trailingIconSize });
    expect(textStyle(part(0, 'leading-icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, true).families[0]);
    expect(textStyle(part(1, 'leading-icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, false).families[0]);
    expect(part(1, 'trailing-icon')).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  test('MNU-22: a checked item strokes a check at comp.menu.mark.width in a box of comp.menu.mark.size, in its mark color; hidden from assistive technology', async () => {
    await mountInline({ items: [{ kind: 'checkbox-item', label: 'Show grid', checked: true }, { kind: 'checkbox-item', label: 'Show rulers' }] });
    expect(viewStyle(part(0, 'check')!.parent as Instance)).toMatchObject({ width: tokens.markSize, height: tokens.markSize });
    for (const leg of checkLegs(0)) expect(viewStyle(leg)).toMatchObject({ height: tokens.markWidth, backgroundColor: painted(tokens.conditions.selected.enabled.markColor) });
    expect(part(1, 'check')).toBeNull();
    expect(part(0, 'mark')!.props.accessibilityElementsHidden).toBe(true);
  });

  test('MNU-22: checked changing while open draws the check along its path over the state motion; at once where motion is reduced', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    function Toggle() {
      const [checked, setChecked] = useState(false);
      return (
        <TanreiProvider theme="light">
          <Menu testID={ID} visible inline items={[{ kind: 'checkbox-item', label: 'Show grid', checked, onCheckedChange: setChecked }]} />
        </TanreiProvider>
      );
    }
    await render(<Toggle />);
    await wait(10);
    timing.mockClear();
    await fireEvent.press(row(0));
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionStateDuration && config.useNativeDriver === false).length).toBeGreaterThanOrEqual(2);
    await wait(HOLD + tokens.motionStateDuration * 2 + 50);
    expect(checkLegs(0)).toHaveLength(2);
    await screen.unmount();
    reduceMotion(true);
    timing.mockClear();
    await render(<Toggle />);
    await fireEvent.press(row(0));
    expect(timing).not.toHaveBeenCalled();
    expect(checkLegs(0)).toHaveLength(2);
  });

  test('MNU-23: a divider between a group and whatever is next to it — never at the ends — in its color, thickness and space, inside the surface\'s padding, exposed as a separator that takes no focus', async () => {
    await mountInline({ items: [{ kind: 'group', items: [{ label: 'Cut' }] }, { label: 'Select all' }, { label: 'Find' }, { kind: 'group', items: [{ label: 'Print' }] }] });
    const dividers = screen.getAllByTestId(/^menu\.divider\./, { includeHiddenElements: true });
    expect(dividers.map((node) => node.props.testID)).toEqual(['menu.divider.1', 'menu.divider.3']);
    for (const divider of dividers) {
      // Inside the surface's padding (comp.menu.surface.padding-inline), the same inset as the rows, and no more.
      expect(viewStyle(divider)).toEqual({ height: tokens.dividerThickness, marginVertical: tokens.dividerSpace, backgroundColor: painted(tokens.dividerColor) });
      expect(divider.parent).toBe(screen.getByTestId(`${ID}.clip`).children[0]);
      expect(divider.props).toMatchObject({ role: 'separator', accessible: true });
      expect(divider.props.focusable).toBeUndefined();
    }
  });

  test('MNU-28: a group\'s title is drawn above its items in its type style and color, where the labels start, padded like an item, and takes no focus', async () => {
    await mountInline({ items: EVERY_KIND });
    const title = screen.getByTestId(`${ID}.group.2.title`);
    const style = (tanrei.typescale as unknown as Record<string, { size: number; lineHeight: number }>)[tokens.groupTitleTypescale]!;
    expect(textStyle(title)).toMatchObject({
      color: painted(tokens.groupTitleColor),
      fontSize: style.size,
      paddingStart: tokens.containerPaddingInline + tokens.markSize + tokens.containerGap + tokens.leadingIconSize + tokens.containerGap,
      paddingEnd: tokens.containerPaddingInline,
      paddingVertical: tokens.containerPaddingBlock,
    });
    expect(title.props.allowFontScaling).toBe(true);
    expect(title.props.focusable).toBeUndefined();
    const group = screen.getByTestId(`${ID}.group.2`);
    expect(group.children[0]).toBe(title);
  });
});

describe('accessibility (MNU-24, MNU-26)', () => {
  test('MNU-24: the menu role named by the anchor; each item a menu item named by its label, described by its supporting text and shortcut, with its position; checkbox and radio items with their checked state; each group a group named by its title', async () => {
    await mountInline({ items: EVERY_KIND.map((entry, i) => (i === 0 ? { ...(entry as object), supportingText: 'Move to the archive', trailingText: '⌘E' } : entry)) as MenuEntry[], accessibilityLabel: 'More' });
    expect(surface().props).toMatchObject({ role: 'menu', accessibilityLabel: 'More' });
    expect([0, 1, 2, 3, 4, 5].map((i) => [row(i).props.role, row(i).props.accessibilityLabel, row(i).props.accessibilityState, row(i).props.accessibilityValue])).toEqual([
      ['menuitem', 'Archive', { disabled: false }, { text: '1 of 6' }],
      ['menuitem', 'Delete', { disabled: false }, { text: '2 of 6' }],
      ['menuitem', 'Show grid', { disabled: false, checked: true }, { text: '3 of 6' }],
      ['menuitem', 'Show rulers', { disabled: false, checked: false }, { text: '4 of 6' }],
      ['menuitem', 'Name', { disabled: false, checked: false }, { text: '5 of 6' }],
      ['menuitem', 'Date', { disabled: false, checked: true }, { text: '6 of 6' }],
    ]);
    expect(row(0).props.accessibilityHint).toBe('Move to the archive, ⌘E');
    expect(screen.getByTestId(`${ID}.group.2`).props).toMatchObject({ role: 'group', accessibilityLabel: 'View' });
    for (const name of ['leading-icon', 'mark']) expect(part(0, name)!.props.accessibilityElementsHidden).toBe(true);
    // One element per item: nothing inside it is accessible of its own.
    expect(screen.getAllByRole('menuitem')).toHaveLength(6);
  });

  test('MNU-24: the README tells the product to expose on its anchor that it opens a menu and whether it is open', () => {
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('accessibilityState={{ expanded: open }}');
  });

  test('MNU-26: an item without a label still renders, and development builds report it; release builds say nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mountInline({ items: [{ label: '' }, { label: 'Copy' }] });
    expect(row(0)).toBeTruthy();
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('item 1 of a Menu (testID "menu") has no label')]);
    await view.unmount();
    warn.mockClear();
    development(false);
    await mountInline({ items: [{ label: '' }] });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('motion (MNU-27)', () => {
  test('MNU-27: state changes animate with comp.menu.motion.state-*, the press is immediate, reduced motion lands at once', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const view = await mountInline({ items: ACTIONS });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    await wait(10);
    timing.mockClear();
    await fireEvent(row(0), 'hoverIn');
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: tokens.motionStateDuration, useNativeDriver: false });
    await wait(tokens.motionStateDuration * 2);
    timing.mockClear();
    await fireEvent(row(0), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    await release(0);
    await wait(tokens.motionStateDuration * 2);
    await view.unmount();
    reduceMotion(true);
    timing.mockClear();
    await mountInline({ items: ACTIONS });
    await fireEvent(row(0), 'hoverIn');
    expect(timing).not.toHaveBeenCalled();
    expectRowDrawnFrom(0, 'unselected', 'hovered');
  });
});

describe('structure (MNU-29)', () => {
  test('MNU-29: a radio item outside a group is unchecked; a group value naming none of its radio items checks none; two radio items sharing the value are both checked; a group inside a group is drawn as the outer one\'s items — each reported in development builds', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mountInline({
      items: [
        { kind: 'radio-item', label: 'Loose', value: 'loose' },
        { kind: 'group', value: 'size', items: [{ kind: 'radio-item', label: 'Name', value: 'name' }] },
        { kind: 'group', title: 'Sort by', value: 'date', items: [{ kind: 'radio-item', label: 'Date', value: 'date' }, { kind: 'radio-item', label: 'Also date', value: 'date' }, { kind: 'group', title: 'Inner', items: [{ label: 'Nested' }] }] },
      ],
    });
    expect([0, 1, 2, 3].map((i) => row(i).props.accessibilityState.checked)).toEqual([false, false, true, true]);
    expect(screen.getByTestId(`${ID}.group.2`).children).toContain(row(4));
    expect(screen.queryByText('Inner')).toBeNull();
    const messages = warn.mock.calls.map(([message]) => String(message));
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('the radio item "Loose" of a Menu (testID "menu") is not inside a group'),
        expect.stringContaining('has the value "size", which none of its radio items has'),
        expect.stringContaining('share the value "date"'),
        expect.stringContaining('holds another group'),
      ]),
    );
    expect(messages).toHaveLength(4);
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  describe.each(schemes)('$scheme', ({ provider, scheme }) => {
    test('every condition resolves its parts from its paints in this scheme, at rest and hovered; the surface from its color', async () => {
      await mountInline({ items: EVERY_KIND }, provider);
      expect(viewStyle(surface()).backgroundColor).toBe(painted(tokens.surfaceColor, scheme));
      for (const [i, condition] of [[0, 'unselected'], [1, 'destructive'], [2, 'selected']] as const) {
        expectRowDrawnFrom(i, condition, 'enabled', tanrei, scheme);
        await fireEvent(row(i), 'hoverIn');
        expectRowDrawnFrom(i, condition, 'hovered', tanrei, scheme);
        await fireEvent(row(i), 'hoverOut');
      }
    });
  });

  test('the default values: surface-bright at level2, corner 8, padding 4, 160 to 320 wide; rows 44 with corners 6; label in label; checked shows a primary check with no fill; destructive in error', () => {
    expect(painted(tokens.surfaceColor)).toBe(role('surfaceBright'));
    expect(tokens).toMatchObject({ surfaceElevation: 'level2', surfaceShape: tanrei.shape.medium, surfacePaddingBlock: 4, surfacePaddingInline: 4, surfaceMinWidth: 160, surfaceMaxWidth: 320, containerHeight: 44, containerShape: tanrei.shape.small, labelTypescale: 'label' });
    expect(painted(tokens.conditions.selected.enabled.markColor)).toBe(role('primary'));
    expect(evaluatePaint(tokens.conditions.selected.enabled.containerColor, tanrei.colors.light).a).toBe(0);
    expect(painted(tokens.conditions.destructive.enabled.labelColor)).toBe(role('error'));
  });
});

describe('the system drives rendering', () => {
  test('surface, row, column and divider values re-valued by a layer are drawn', async () => {
    const system = withMenu({ surfaceShape: 16, surfacePaddingBlock: 10, surfaceMinWidth: 200, containerPaddingInline: 20, containerGap: 6, markSize: 20, dividerThickness: 3, dividerSpace: 6, containerShape: 2 });
    await mountInline({ items: [{ kind: 'group', items: [{ kind: 'checkbox-item', label: 'Show grid' }] }, { label: 'Close' }] }, { theme: 'light', system });
    expect(viewStyle(surface())).toMatchObject({ borderRadius: 16, minWidth: 200 });
    expect(viewStyle(screen.getByTestId(`${ID}.clip`).children[0] as Instance).paddingVertical).toBe(10);
    expect(viewStyle(row(0))).toMatchObject({ paddingStart: 20, borderRadius: 2 });
    expect(viewStyle(part(0, 'content')!).gap).toBe(6);
    expect(viewStyle(part(0, 'mark')!).width).toBe(20);
    expect(viewStyle(screen.getByTestId(`${ID}.divider.1`))).toMatchObject({ height: 3, marginVertical: 6 });
    expect(viewStyle(screen.getByTestId(`${ID}.divider.1`)).marginStart).toBeUndefined();
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(menuSubject);

  test('every fixture is open: the baselines draw the open surface in place (MNU-19\'s verify)', () => {
    for (const fixture of spec.fixtures) expect(fixture.props.open).toBe(true);
  });
});
