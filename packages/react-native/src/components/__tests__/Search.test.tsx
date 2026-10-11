// Search — the bar, the input's editing and events, opening and closing the view, the docked view in the overlay layer,
// the full-screen view in a Modal, the suggestions, states, motion, accessibility, token binding and fixture baselines.
// Cases come from specs/search.spec.json; every behaviour id is cited by the test that covers it.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Dimensions, TextInput, View } from 'react-native';
import * as ReactNative from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiPaint, TanreiScheme, TanreiSearchTokens, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { describeFixtureBaselines, painted, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { useContentColor } from '../../theme/contentColor';
import { iconGlyphStyle } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { IconButton } from '../IconButton';
import { Search, type SearchCloseReason, type SearchProps, type SearchRef, type SearchSuggestion } from '../Search';
import { acme } from './__fixtures__/acme';
import { searchSubject } from './Search.subject';

const spec = loadSpec('search');
const tokens: TanreiSearchTokens = tanrei.components.search;
const standard = tokens.conditions.standard;
const ID = 'search';

const withSearch = (overrides: Partial<TanreiSearchTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'search', overrides);
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => painted(paint, scheme, system);
const HOLD = tanrei.motion.duration.pressHold;

const SUGGESTIONS: SearchSuggestion[] = [
  { value: 'invoices', headline: 'invoices', leadingIcon: 'history' },
  { value: 'invoice template', headline: 'invoice template', leadingIcon: 'history' },
  { value: 'folder:invoices', headline: 'Invoices', supportingText: 'Folder · 24 messages', leadingIcon: 'folder' },
];

function mount(props: Partial<SearchProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <Search testID={ID} accessibilityLabel="Search mail" placeholder="Search mail" clearLabel="Clear search" backLabel="Back" {...props} />
    </TanreiProvider>,
  );
}

/** A product that keeps the value and `expanded`, moving them from the callbacks, and records every callback in order. */
function Controlled({ initial = '', open = false, log, ...props }: Partial<SearchProps> & { initial?: string; open?: boolean; log: string[] }) {
  const [value, setValue] = useState(initial);
  const [expanded, setExpanded] = useState(open);
  return (
    <Search
      testID={ID}
      accessibilityLabel="Search mail"
      placeholder="Search mail"
      clearLabel="Clear search"
      backLabel="Back"
      suggestions={SUGGESTIONS}
      value={value}
      expanded={expanded}
      onChangeText={(next) => {
        log.push(`input:${next}`);
        setValue(next);
      }}
      onExpandedChange={(next: boolean, reason?: SearchCloseReason) => {
        log.push(`toggle:${next}${reason ? `:${reason}` : ''}`);
        setExpanded(next);
      }}
      onSubmitEditing={(submitted) => log.push(`submit:${submitted}`)}
      onSelect={(selected) => log.push(`select:${selected}`)}
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

const q = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const bar = () => q('bar')!;
const input = () => q('input')!;
const row = (i: number) => q(`view.suggestion.${i}`) ?? q(`suggestion.${i}`)!;
const rowPart = (i: number, name: string) => screen.queryByTestId(`${row(i).props.testID}.${name}`, { includeHiddenElements: true });
const keyPress = (name: string, target = input()) => fireEvent(target, 'keyPress', { nativeEvent: { key: name } });
const reportsOf = (warn: jest.SpyInstance) => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('Search'));
const inputFocus = () => jest.spyOn(TextInput.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined).mockClear();
const focusedInput = (spy: jest.SpyInstance) => (spy.mock.contexts.at(-1) as { props?: { testID?: string } } | undefined)?.props?.testID;

// The docked view is placed against the bar's box in the window; the layer fills the window.
const BAR = { x: 16, y: 40, width: 328, height: 40 };
function measureBar(box = BAR) {
  const window = Dimensions.get('window');
  return jest.spyOn(View.prototype as unknown as { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void }, 'measureInWindow').mockImplementation(function (this: { props?: { testID?: string } }, callback) {
    if (this.props?.testID === `${ID}.bar`) callback(box.x, box.y, box.width, box.height);
    else callback(0, 0, window.width, window.height);
  });
}
const layOutView = (height = 160) => fireEvent(q('view')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: BAR.width, height } } });

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

/** Everything SRC-18 names on the bar — container, outline and its width, glyph, input, placeholder, caret, opacity — from one state's tokens. */
function expectBarDrawnFrom(state: InteractionState, system: TanreiSystem = tanrei, scheme: TanreiScheme = 'light') {
  const from = system.components.search;
  const paints = from.conditions.standard[state];
  const opacity = { enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity }[state];
  const width = { enabled: from.outlineWidth, hovered: from.hoveredOutlineWidth, focused: from.focusedOutlineWidth, pressed: from.pressedOutlineWidth, disabled: from.disabledOutlineWidth }[state];
  expect(viewStyle(bar())).toMatchObject({ backgroundColor: fill(paints.containerColor, scheme, system), opacity });
  const outline = q('outline');
  if (evaluates(paints.outlineColor, scheme, system)) expect(viewStyle(outline!)).toMatchObject({ borderColor: fill(paints.outlineColor, scheme, system), borderWidth: width });
  else expect(outline).toBeNull();
  expect(textStyle(q('leading-icon.glyph')!).color).toBe(fill(paints.leadingIconColor, scheme, system));
  expect(textStyle(input()).color).toBe(fill(paints.inputColor, scheme, system));
  expect(input().props.placeholderTextColor).toBe(fill(paints.placeholderColor, scheme, system));
  expect(input().props.cursorColor).toBe(fill(paints.caretColor, scheme, system));
}
const evaluates = (paint: TanreiPaint, scheme: TanreiScheme, system: TanreiSystem) => createTanreiTheme(system, scheme.startsWith('dark') ? 'dark' : 'light').resolve(paint).a > 0;

describe('Search', () => {
  test('the spec is the one implemented here: behaviours SRC-1 … SRC-29 and the react-native mapping', () => {
    expect(spec.behavior.map((b) => b.id)).toEqual(Array.from({ length: 29 }, (_, i) => `SRC-${i + 1}`));
    const mapping = spec.platforms['react-native'];
    expect(mapping.name).toBe('Search');
    expect(mapping.events).toEqual({ input: 'onChangeText', submit: 'onSubmitEditing', select: 'onSelect', toggle: 'onExpandedChange' });
    expect(mapping.items!.suggestion!.name).toBe('SearchSuggestion');
  });

  describe('the bar', () => {
    test.each(['light', 'dark'] as const)('SRC-1: as wide as its layout, at least container.height, filled, raised and rounded by the tokens, one centered row: glyph, input (%s)', async (theme) => {
      await mount({}, { theme });
      const scheme: TanreiScheme = theme;
      expect(viewStyle(bar())).toMatchObject({
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.containerGap,
        minHeight: tokens.containerHeight,
        borderRadius: tokens.containerShape,
        paddingStart: tokens.containerPaddingInline,
        paddingEnd: tokens.containerPaddingInline,
        backgroundColor: fill(standard.enabled.containerColor, scheme),
      });
      expect(viewStyle(bar()).height).toBeUndefined();
      expect(viewStyle(bar()).alignSelf).toBeUndefined();
      expect(input().props.style).toBeDefined();
      expect(textStyle(input())).toMatchObject({ flex: 1 });
    });

    test('SRC-1: a leading icon button replaces the glyph padding-inline-with-button from the start; an icon button last (clear, trailing) ends padding-inline-with-button from the end; elements are centred', async () => {
      const view = await mount({ value: 'inv' });
      expect(viewStyle(bar())).toMatchObject({ paddingStart: tokens.containerPaddingInline, paddingEnd: tokens.containerPaddingInlineWithButton });
      expect(viewStyle(q('clear')!).alignSelf).toBe('center');
      await view.unmount();
      await mount({ leading: <IconButton accessibilityLabel="Menu">menu</IconButton>, trailing: <IconButton accessibilityLabel="Voice">mic</IconButton> });
      expect(viewStyle(bar())).toMatchObject({ paddingStart: tokens.containerPaddingInlineWithButton, paddingEnd: tokens.containerPaddingInlineWithButton });
      expect(q('leading-icon')).toBeNull();
      expect(q('leading')).not.toBeNull();
    });

    test('SRC-1: the values drive the drawing — a system that re-values the bar draws it', async () => {
      const system = withSearch({ containerHeight: 56, containerShape: 12, containerGap: 16, containerPaddingInline: 20, conditions: { standard: { ...standard, enabled: { ...standard.enabled, containerColor: { kind: 'role', role: 'primaryContainer' }, containerElevation: 'level2' } } } });
      await mount({}, { theme: 'light', system });
      expect(viewStyle(bar())).toMatchObject({ minHeight: 56, borderRadius: 12, gap: 16, paddingStart: 20, backgroundColor: fill({ kind: 'role', role: 'primaryContainer' }), boxShadow: createTanreiTheme(system, 'light').elevation('level2').boxShadow });
    });

    test('SRC-2: the search glyph at leading-icon.size in the leading-icon color, unselected, hidden from assistive technology', async () => {
      await mount();
      const glyph = iconGlyphStyle(tanrei.icon, tokens.leadingIconSize, { selected: false });
      expect(viewStyle(q('leading-icon')!)).toMatchObject({ width: tokens.leadingIconSize, height: tokens.leadingIconSize });
      expect(q('leading-icon')!.props.accessibilityElementsHidden).toBe(true);
      expect(q('leading-icon.glyph')!.props.children).toBe('search');
      expect(textStyle(q('leading-icon.glyph')!)).toMatchObject({ ...glyph.style, color: fill(standard.enabled.leadingIconColor) });
    });

    test('SRC-3: the value on one line in the input style and color, the placeholder in its color, the caret in the caret color, the selection in comp.text-field.selection.color (Android)', async () => {
      await mount({ value: 'inv' });
      const style = createTanreiTheme(tanrei, 'light').text(tokens.inputTypescale);
      expect(textStyle(input())).toMatchObject({ fontSize: style.fontSize, lineHeight: style.lineHeight, color: fill(standard.enabled.inputColor) });
      expect(input().props).toMatchObject({ multiline: false, placeholder: 'Search mail', placeholderTextColor: fill(standard.enabled.placeholderColor), cursorColor: fill(standard.enabled.caretColor) });
      if (ReactNative.Platform.OS === 'android') expect(input().props.selectionColor).toBe(fill(tanrei.components.textField.selectionColor));
      else expect(input().props.selectionColor).toBe(fill(standard.enabled.caretColor));
    });
  });

  test('SRC-4: the value is edited in TextInput with a search keyboard; input once per change, none when the product sets the value', async () => {
    const onChangeText = jest.fn();
    const view = await mount({ value: 'a', onChangeText });
    expect(input().props).toMatchObject({ keyboardType: 'default', inputMode: 'search', returnKeyType: 'search', enterKeyHint: 'search' });
    await fireEvent.changeText(input(), 'ab');
    expect(onChangeText.mock.calls).toEqual([['ab']]);
    await view.rerender(
      <TanreiProvider theme="light">
        <Search testID={ID} accessibilityLabel="Search mail" value="product" onChangeText={onChangeText} />
      </TanreiProvider>,
    );
    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(input().props.value).toBe('product');
  });

  describe('SRC-5: opening', () => {
    test('SRC-5: a press on the bar focuses the input and asks to open once; typing and Down Arrow ask to open; focus alone does not', async () => {
      const ref = createRef<SearchRef>();
      const log: string[] = [];
      const view = await mountControlled({ log, ref });
      const focus = jest.spyOn(ref.current as unknown as { focus: () => void }, 'focus').mockClear();
      await fireEvent(input(), 'focus');
      expect(log).toEqual([]);
      await fireEvent.press(bar());
      expect(focus).toHaveBeenCalled();
      expect(log).toEqual(['toggle:true']);
      await view.unmount();
      log.length = 0;
      await mountControlled({ log });
      await fireEvent.changeText(input(), 'i');
      expect(log).toEqual(['input:i', 'toggle:true']);
      await view.unmount();
    });

    test('SRC-5: a press on the input itself is a press on the bar; Down Arrow opens a closed view; the product opens it by setting expanded', async () => {
      const log: string[] = [];
      const view = await mountControlled({ log });
      await fireEvent(input(), 'pressIn', { nativeEvent: {} });
      expect(log).toEqual(['toggle:true']);
      await view.unmount();
      log.length = 0;
      await mountControlled({ log });
      await keyPress('ArrowDown');
      expect(log).toEqual(['toggle:true']);
    });
  });

  describe('SRC-6: closing', () => {
    test.each([
      ['Escape', 'escape'],
      ['Tab', 'tab'],
    ] as const)('SRC-6: %s asks to close with the reason "%s"; the value stays', async (name, reason) => {
      const log: string[] = [];
      await mountControlled({ log, initial: 'inv', open: true, inline: true });
      await keyPress(name);
      expect(log).toEqual([`toggle:false:${reason}`]);
      expect(input().props.value).toBe('inv');
    });

    test('SRC-6: the search asks once per change of expanded — a product that has not closed it yet is not asked again', async () => {
      const onExpandedChange = jest.fn();
      await mount({ value: 'inv', expanded: true, inline: true, suggestions: SUGGESTIONS, onExpandedChange });
      await keyPress('Escape');
      await keyPress('Escape');
      await fireEvent(input(), 'submitEditing');
      expect(onExpandedChange.mock.calls).toEqual([[false, 'escape']]);
    });

    test('SRC-6: focus that leaves the docked search asks to close with focus-out; focus that comes straight back does not', async () => {
      const log: string[] = [];
      measureBar();
      await mountControlled({ log, initial: 'inv', open: true });
      await fireEvent(input(), 'focus');
      // Focus moving to its own clear button and back in the same pass.
      await act(async () => {
        input().props.onBlur();
        input().props.onFocus();
      });
      await wait(5);
      expect(log).toEqual([]);
      await fireEvent(input(), 'blur');
      await wait(5);
      expect(log).toEqual(['toggle:false:focus-out']);
    });

    test('SRC-6: Android\'s back button asks to close the docked view with back', async () => {
      const handlers: (() => boolean)[] = [];
      jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
        handlers.push(handler as () => boolean);
        return { remove: () => undefined };
      });
      const log: string[] = [];
      measureBar();
      await mountControlled({ log, initial: 'inv', open: true });
      await act(async () => {
        expect(handlers.at(-1)!()).toBe(true);
      });
      expect(log).toEqual(['toggle:false:back']);
    });

    test('SRC-6: a press outside the bar and the view asks to close with outside; the bar itself stays reachable (the catchers surround it)', async () => {
      const log: string[] = [];
      measureBar();
      await mountControlled({ log, initial: 'inv', open: true });
      await layOutView();
      const catchers = [0, 1, 2, 3].map((i) => viewStyle(q(`outside.${i}`)!));
      expect(catchers[0]).toMatchObject({ top: 0, height: BAR.y });
      expect(catchers[1]).toMatchObject({ top: BAR.y + BAR.height, bottom: 0 });
      expect(catchers[2]).toMatchObject({ top: BAR.y, height: BAR.height, left: 0, width: BAR.x });
      expect(catchers[3]).toMatchObject({ top: BAR.y, height: BAR.height, left: BAR.x + BAR.width, right: 0 });
      await fireEvent.press(q('outside.1')!);
      expect(log).toEqual(['toggle:false:outside']);
    });
  });

  describe('SRC-7: the docked view', () => {
    test('SRC-7: in TanreiProvider\'s overlay layer, view.offset below the bar, as wide as it and aligned with it; filled, raised, rounded, clipped and padded by the view tokens', async () => {
      measureBar();
      await mount({ value: 'inv', expanded: true, suggestions: SUGGESTIONS });
      const layer = screen.getByTestId('tanrei.overlay', { includeHiddenElements: true });
      expect(layer).toBeTruthy();
      await layOutView();
      expect(viewStyle(q('placement')!)).toMatchObject({ position: 'absolute', top: BAR.y + BAR.height + tokens.viewOffset, left: BAR.x, width: BAR.width });
      expect(viewStyle(q('view')!)).toMatchObject({ borderRadius: tokens.viewContainerShape, backgroundColor: fill(tokens.viewContainerColor), boxShadow: createTanreiTheme(tanrei, 'light').elevation(tokens.viewContainerElevation).boxShadow });
      expect(viewStyle(q('view.clip')!)).toMatchObject({ overflow: 'hidden', borderRadius: tokens.viewContainerShape, paddingVertical: tokens.viewPaddingBlock, paddingStart: tokens.viewPaddingInline, paddingEnd: tokens.viewPaddingInline });
    });

    test('SRC-7: above the bar when the room below (less the viewport margin and the keyboard) is too small and above is more; its height limited to the room', async () => {
      const listeners: Record<string, (event: { endCoordinates: { height: number } }) => void> = {};
      jest.spyOn(ReactNative.Keyboard, 'addListener').mockImplementation(((event: string, handler: (event: { endCoordinates: { height: number } }) => void) => {
        listeners[event] = handler;
        return { remove: () => undefined };
      }) as never);
      // 120 above the keyboard: less room below than the view needs, more above.
      const y = WINDOW.height - 250 - 120;
      measureBar({ ...BAR, y });
      await mount({ value: 'inv', expanded: true, suggestions: SUGGESTIONS });
      await act(async () => listeners.keyboardDidShow!({ endCoordinates: { height: 250 } }));
      await layOutView(200);
      const placed = viewStyle(q('placement')!);
      expect(placed.top).toBe(y - tokens.viewOffset - 200);
      // The room above is ample: the view's height is not limited.
      expect(viewStyle(q('view')!).maxHeight).toBeGreaterThanOrEqual(200);
    });

    test('SRC-7: without content (no suggestion, no children) there is no view, and the search stays expanded', async () => {
      const onExpandedChange = jest.fn();
      await mount({ value: 'inv', expanded: true, suggestions: [], onExpandedChange, inline: true });
      expect(q('view')).toBeNull();
      expect(onExpandedChange).not.toHaveBeenCalled();
    });
  });

  test('SRC-8: the docked view never takes focus — rows are not focusable, taps keep the keyboard, nothing inert, no scrim', async () => {
    measureBar();
    const focus = inputFocus();
    await mount({ value: 'inv', expanded: true, suggestions: SUGGESTIONS });
    await layOutView();
    expect(focus).not.toHaveBeenCalled();
    expect(row(0).props.focusable).toBe(false);
    expect(q('suggestions')!.props.keyboardShouldPersistTaps).toBe('handled');
    expect(q('scrim')).toBeNull();
    expect(screen.queryByTestId(`${ID}.modal`, { includeHiddenElements: true })).toBeNull();
  });

  describe('SRC-9: the full-screen view', () => {
    test('SRC-9: a transparent Modal over the whole window, the view color to every edge, content inside the insets; a header, a divider, then the suggestions', async () => {
      await mount({ presentation: 'full-screen', value: 'inv', expanded: true, suggestions: SUGGESTIONS }, { theme: 'light', insets: { top: 47, bottom: 34, left: 0, right: 0 } });
      const modal = screen.getByTestId(`${ID}.modal`, { includeHiddenElements: true });
      expect(modal.props).toMatchObject({ visible: true, transparent: true, animationType: 'none', statusBarTranslucent: true, navigationBarTranslucent: true });
      expect(viewStyle(q('view')!)).toMatchObject({ flex: 1, paddingTop: 47, paddingBottom: 34, backgroundColor: fill(tokens.viewContainerColor) });
      expect(q('view')!.props).toMatchObject({ role: 'dialog', accessibilityLabel: 'Search mail', accessibilityViewIsModal: true });
      expect(viewStyle(q('header')!)).toMatchObject({ flexDirection: 'row', alignItems: 'center', minHeight: tokens.headerHeight, paddingStart: tokens.headerPaddingInline, paddingEnd: tokens.headerPaddingInline, gap: tokens.containerGap });
      expect(viewStyle(q('view.divider')!)).toMatchObject({ height: tokens.dividerThickness, backgroundColor: fill(tokens.dividerColor) });
      expect(q('header.input')!.props.value).toBe('inv');
      expect(row(0)).toBeTruthy();
    });

    test('SRC-9: focus moves to the header\'s input as it opens and back to the bar\'s input when it closes, which does not open it again', async () => {
      const focus = inputFocus();
      const log: string[] = [];
      const view = await render(
        <TanreiProvider theme="light">
          <Controlled log={log} presentation="full-screen" initial="inv" />
        </TanreiProvider>,
      );
      await fireEvent.press(bar());
      expect(log).toEqual(['toggle:true']);
      expect(focusedInput(focus)).toBe(`${ID}.header.input`);
      await fireEvent.press(q('back')!);
      expect(log).toEqual(['toggle:true', 'toggle:false:back']);
      expect(focusedInput(focus)).toBe(`${ID}.input`);
      await fireEvent(input(), 'focus');
      expect(log).toEqual(['toggle:true', 'toggle:false:back']);
      await view.unmount();
    });

    test('SRC-9: the keyboard pushes the content up; the Modal\'s back (onRequestClose) asks to close with back', async () => {
      const listeners: Record<string, (event: { endCoordinates: { height: number } }) => void> = {};
      jest.spyOn(ReactNative.Keyboard, 'addListener').mockImplementation(((event: string, handler: (event: { endCoordinates: { height: number } }) => void) => {
        listeners[event] = handler;
        return { remove: () => undefined };
      }) as never);
      const log: string[] = [];
      await mountControlled({ log, presentation: 'full-screen', initial: 'inv', open: true });
      await act(async () => listeners.keyboardDidShow!({ endCoordinates: { height: 300 } }));
      expect(viewStyle(q('view')!).paddingBottom).toBe(300);
      await act(async () => screen.getByTestId(`${ID}.modal`, { includeHiddenElements: true }).props.onRequestClose());
      expect(log).toEqual(['toggle:false:back']);
    });
  });

  test('SRC-10: while there is a value, a small standard clear button named by clearLabel: it empties the value (input once), focuses its input and opens and closes nothing; medium in the header', async () => {
    const ref = createRef<SearchRef>();
    const log: string[] = [];
    const view = await mountControlled({ log, initial: 'inv', ref });
    const focus = jest.spyOn(ref.current as unknown as { focus: () => void }, 'focus').mockClear();
    expect(q('clear')!.props).toMatchObject({ accessibilityLabel: 'Clear search', accessibilityRole: 'button' });
    expect(viewStyle(q('clear')!)).toMatchObject({ width: tanrei.components.iconButton.sizes.small.containerSize });
    await fireEvent.press(q('clear')!);
    expect(log).toEqual(['input:']);
    expect(focus).toHaveBeenCalled();
    expect(q('clear')).toBeNull();
    await view.unmount();
    await mount({ presentation: 'full-screen', value: 'inv', expanded: true, suggestions: SUGGESTIONS, inline: true });
    expect(viewStyle(q('header.clear')!)).toMatchObject({ width: tanrei.components.iconButton.sizes.medium.containerSize });
  });

  test('SRC-10: without clearLabel the clear button still shows, and development builds say it has no name', async () => {
    const warn = jest.mocked(console.warn);
    await mount({ value: 'inv', clearLabel: '' });
    expect(q('clear')).not.toBeNull();
    expect(reportsOf(warn)).toEqual([expect.stringContaining('clear button of a Search (testID "search") has no clearLabel')]);
  });

  test('SRC-11: the full-screen header starts with a standard medium back button named by backLabel (arrow_back, mirrored right-to-left) that asks to close with back; without a label it is reported', async () => {
    const warn = jest.mocked(console.warn);
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    const onExpandedChange = jest.fn();
    await mount({ presentation: 'full-screen', value: 'inv', expanded: true, suggestions: SUGGESTIONS, inline: true, backLabel: '', onExpandedChange });
    expect(q('back')!.props).toMatchObject({ accessibilityRole: 'button', accessibilityLabel: '' });
    expect(viewStyle(q('back')!)).toMatchObject({ width: tanrei.components.iconButton.sizes.medium.containerSize, transform: [{ scaleX: -1 }] });
    expect(q('back.icon')).not.toBeNull();
    await fireEvent.press(q('back')!);
    expect(onExpandedChange.mock.calls).toEqual([[false, 'back']]);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('back button of a full-screen Search (testID "search") has no backLabel')]);
  });

  test('SRC-12: while closed, Escape clears a value (input once) and does nothing without one', async () => {
    const log: string[] = [];
    await mountControlled({ log, initial: 'inv' });
    await keyPress('Escape');
    expect(log).toEqual(['input:']);
    await keyPress('Escape');
    expect(log).toEqual(['input:']);
  });

  test('SRC-13: the action key with no suggestion active submits the value, then an open view asks to close with submit', async () => {
    const log: string[] = [];
    const view = await mountControlled({ log, initial: 'inv', open: true, inline: true });
    await fireEvent(input(), 'submitEditing');
    expect(log).toEqual(['submit:inv', 'toggle:false:submit']);
    expect(input().props.submitBehavior).toBe('submit');
    await view.unmount();
    log.length = 0;
    await mountControlled({ log, initial: 'inv' });
    await fireEvent(input(), 'submitEditing');
    expect(log).toEqual(['submit:inv']);
  });

  test('SRC-14: Down Arrow makes the next suggestion active (staying on the last), Up Arrow the previous (none from the first); typing leaves none active; Enter chooses the active one', async () => {
    const log: string[] = [];
    await mountControlled({ log, initial: 'inv', open: true, inline: true });
    const activeRow = () => [0, 1, 2].find((i) => rowPart(i, 'focus-ring') !== null) ?? -1;
    expect(activeRow()).toBe(-1);
    await keyPress('ArrowDown');
    expect(activeRow()).toBe(0);
    for (let i = 0; i < 4; i += 1) await keyPress('ArrowDown');
    expect(activeRow()).toBe(2);
    await keyPress('ArrowUp');
    await keyPress('ArrowUp');
    expect(activeRow()).toBe(0);
    await keyPress('ArrowUp');
    expect(activeRow()).toBe(-1);
    await keyPress('ArrowDown');
    await fireEvent.changeText(input(), 'invo');
    expect(activeRow()).toBe(-1);
    await keyPress('ArrowDown');
    await keyPress('ArrowDown');
    await fireEvent(input(), 'submitEditing');
    expect(log).toEqual(['input:invo', 'select:invoice template', 'toggle:false:select']);
  });

  test('SRC-15: a press on a suggestion selects its value, then asks to close with select; the value is the product\'s to change', async () => {
    const log: string[] = [];
    await mountControlled({ log, initial: 'inv', open: true, inline: true });
    await fireEvent.press(row(2));
    expect(log).toEqual(['select:folder:invoices', 'toggle:false:select']);
    expect(input().props.value).toBe('inv');
  });

  test('SRC-16: each row at least the row height and the touch target, padded, the icon column kept in every row, the headline and supporting text in their styles, wrapping', async () => {
    const theme = createTanreiTheme(tanrei, 'light');
    await mount({ value: 'inv', expanded: true, inline: true, suggestions: [...SUGGESTIONS, { value: 'plain', headline: 'no icon' }] });
    expect(viewStyle(row(0))).toMatchObject({
      flexDirection: 'row',
      minHeight: Math.max(tokens.suggestionContainerHeight, tanrei.measure.target.touch),
      paddingStart: tokens.suggestionContainerPaddingInline,
      paddingEnd: tokens.suggestionContainerPaddingInline,
      paddingVertical: tokens.suggestionContainerPaddingBlock,
      gap: tokens.suggestionContainerGap,
      borderRadius: tokens.suggestionContainerShape,
    });
    expect(row(0).props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(viewStyle(rowPart(3, 'icon-column')!).width).toBe(tokens.suggestionLeadingIconSize);
    expect(rowPart(3, 'leading-icon')).toBeNull();
    expect(textStyle(rowPart(2, 'headline')!)).toMatchObject({ fontSize: theme.text(tokens.suggestionHeadlineTypescale).fontSize, color: fill(standard.enabled.suggestionHeadlineColor) });
    expect(textStyle(rowPart(2, 'supporting-text')!)).toMatchObject({ fontSize: theme.text(tokens.suggestionSupportingTextTypescale).fontSize, color: fill(standard.enabled.suggestionSupportingTextColor) });
    expect(rowPart(2, 'headline')!.props.numberOfLines).toBeUndefined();
    expect(textStyle(rowPart(0, 'leading-icon.glyph')!)).toMatchObject({ ...iconGlyphStyle(tanrei.icon, tokens.suggestionLeadingIconSize, { selected: false }).style, color: fill(standard.enabled.suggestionLeadingIconColor) });
  });

  describe('SRC-17: suggestion states', () => {
    test('SRC-17: hovered, active (the focused tokens, a focus ring inside the row) and pressed draw from their tokens; a pointer does not make a row active', async () => {
      await mount({ value: 'inv', expanded: true, inline: true, suggestions: SUGGESTIONS });
      await fireEvent(row(1), 'hoverIn');
      expect(viewStyle(row(1)).backgroundColor).toBe(fill(standard.hovered.suggestionContainerColor));
      expect(rowPart(1, 'focus-ring')).toBeNull();
      await keyPress('ArrowDown');
      expect(viewStyle(row(0)).backgroundColor).toBe(fill(standard.focused.suggestionContainerColor));
      expect(viewStyle(rowPart(0, 'focus-ring')!)).toMatchObject({ position: 'absolute', borderColor: fill({ kind: 'role', role: 'focusRing' }) });
    });

    test('SRC-17: precedence is pressed over active over hovered, under the acme fixture system', async () => {
      const conditions = acme.components.search.conditions.standard;
      const expected = (name: InteractionState) => fill(conditions[name].suggestionContainerColor, 'light', acme);
      expect(new Set((['hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(3);
      await mount({ value: 'inv', expanded: true, inline: true, suggestions: SUGGESTIONS }, { theme: 'light', system: acme });
      await fireEvent(row(0), 'hoverIn');
      expect(viewStyle(row(0)).backgroundColor).toBe(expected('hovered'));
      await keyPress('ArrowDown');
      expect(viewStyle(row(0)).backgroundColor).toBe(expected('focused'));
      await fireEvent(row(0), 'pressIn');
      expect(viewStyle(row(0)).backgroundColor).toBe(expected('pressed'));
      await fireEvent(row(0), 'pressOut');
      await wait(HOLD + 30);
      expect(viewStyle(row(0)).backgroundColor).toBe(expected('focused'));
    });
  });

  describe('SRC-18: bar states', () => {
    test('SRC-18: focus by any means draws the focused tokens — a thicker outline in the focus-ring color, the container at rest — and no focus ring around the bar', async () => {
      await mount();
      expectBarDrawnFrom('enabled');
      await fireEvent(input(), 'focus');
      expectBarDrawnFrom('focused');
      expect(viewStyle(q('outline')!)).toMatchObject({ borderWidth: tokens.focusedOutlineWidth, borderColor: fill({ kind: 'role', role: 'focusRing' }) });
      expect(viewStyle(bar()).backgroundColor).toBe(fill(standard.enabled.containerColor));
      expect(tokens.focusedOutlineWidth).toBeGreaterThan(tokens.outlineWidth);
      expect(q('focus-ring')).toBeNull();
      await fireEvent(bar(), 'hoverIn');
      expectBarDrawnFrom('focused');
      await fireEvent(input(), 'blur');
      expectBarDrawnFrom('hovered');
    });

    test('SRC-18: precedence is pressed over focused over hovered, under the acme fixture system; under glow the glow is drawn around the focused bar', async () => {
      const conditions = acme.components.search.conditions.standard;
      await mount({}, { theme: 'light', system: acme });
      await fireEvent(bar(), 'hoverIn');
      expect(viewStyle(bar()).backgroundColor).toBe(fill(conditions.hovered.containerColor, 'light', acme));
      await fireEvent(input(), 'focus');
      expect(viewStyle(bar()).backgroundColor).toBe(fill(conditions.focused.containerColor, 'light', acme));
      await fireEvent(bar(), 'pressIn');
      expect(viewStyle(bar()).backgroundColor).toBe(fill(conditions.pressed.containerColor, 'light', acme));
      await fireEvent(bar(), 'pressOut');
      await wait(HOLD + 30);
      const glowing = await mount({}, { theme: 'light', system: withBehavior({ focusStyle: 'glow' }) });
      await fireEvent(input(), 'focus');
      expect(screen.getAllByTestId(`${ID}.glow`, { includeHiddenElements: true })).toHaveLength(1);
      await glowing.unmount();
    });

    test('SRC-18: colors and widths move over the state motion, at once where motion is reduced', async () => {
      reduceMotion(false);
      await mount();
      await wait(10);
      const timing = jest.spyOn(Animated, 'timing');
      await fireEvent(input(), 'focus');
      expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
      await wait(tokens.motionStateDuration + 50);
    });
  });

  test('SRC-19: a press on the bar shows its pressed state at once and keeps it for at least press-hold', async () => {
    await mount({}, { theme: 'light', system: acme });
    const pressed = fill(acme.components.search.conditions.standard.pressed.containerColor, 'light', acme);
    await fireEvent(bar(), 'pressIn');
    expect(viewStyle(bar()).backgroundColor).toBe(pressed);
    await fireEvent(bar(), 'pressOut');
    expect(viewStyle(bar()).backgroundColor).toBe(pressed);
    await wait(HOLD + 30);
    expect(viewStyle(bar()).backgroundColor).not.toBe(pressed);
  });

  describe('SRC-20: pressed feedback', () => {
    test('SRC-20: dim draws no state layer on the bar and applies the pressed opacity; none answers nothing; overlay the pressed container', async () => {
      const view = await mount({}, { theme: 'light', system: withSearch({ pressedOpacity: 0.6 }, withBehavior({ pressedFeedback: 'dim' })) });
      await fireEvent(bar(), 'pressIn');
      expect(viewStyle(bar())).toMatchObject({ backgroundColor: fill(standard.enabled.containerColor), opacity: 0.6 });
      await view.unmount();
      const none = await mount({}, { theme: 'light', system: withSearch({ pressedOpacity: 0.6 }, withBehavior({ pressedFeedback: 'none' })) });
      await fireEvent(bar(), 'pressIn');
      expect(viewStyle(bar())).toMatchObject({ backgroundColor: fill(standard.enabled.containerColor), opacity: 1 });
      await none.unmount();
      await mount({}, { theme: 'light', system: withBehavior({ pressedFeedback: 'overlay' }) });
      await fireEvent(bar(), 'pressIn');
      expect(viewStyle(bar()).backgroundColor).toBe(fill(standard.pressed.containerColor));
    });

    test('SRC-20: ripple grows the pressed layer in the bar over feedback-duration, the container keeping the state under the press; a row gets its own', async () => {
      reduceMotion(false);
      await mount({ value: 'inv', expanded: true, inline: true, suggestions: SUGGESTIONS }, { theme: 'light', system: withBehavior({ pressedFeedback: 'ripple' }) });
      await wait(10);
      await fireEvent(bar(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 328, height: 40 } } });
      await fireEvent(row(0), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 48 } } });
      const timing = jest.spyOn(Animated, 'timing');
      await fireEvent(bar(), 'press', { nativeEvent: {} });
      expect(q('bar.ripple')).not.toBeNull();
      expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionFeedbackDuration)).toBe(true);
      expect(viewStyle(bar()).backgroundColor).toBe(fill(standard.enabled.containerColor));
      await wait(HOLD + 30);
      await wait(tokens.motionStateDuration + 100);
    });
  });

  test('SRC-21: bar, view and row corners ease by sys.shape.corner-smoothing (the continuous curve on iOS)', async () => {
    const system = { ...tanrei, shape: { ...tanrei.shape, cornerSmoothing: 0.6 } };
    await mount({ value: 'inv', expanded: true, inline: true, suggestions: SUGGESTIONS }, { theme: 'light', system });
    if (ReactNative.Platform.OS === 'ios') {
      expect(viewStyle(bar()).borderCurve).toBe('continuous');
      expect(viewStyle(q('view')!).borderCurve).toBe('continuous');
      expect(viewStyle(row(0)).borderCurve).toBe('continuous');
    }
  });

  test('SRC-22: the bar\'s hit area reaches sys.target.touch vertically without changing its size', async () => {
    await mount();
    const reach = Math.ceil((tanrei.measure.target.touch - tokens.containerHeight) / 2);
    expect(bar().props.hitSlop).toMatchObject({ top: reach, bottom: reach, left: 0, right: 0 });
    expect(viewStyle(bar()).minHeight).toBe(tokens.containerHeight);
  });

  test('SRC-23: the docked view fades in over the open motion and out over the close motion; at once where motion is reduced', async () => {
    reduceMotion(false);
    measureBar();
    const timing = jest.spyOn(Animated, 'timing');
    const element = (expanded: boolean) => (
      <TanreiProvider theme="light">
        <Search testID={ID} accessibilityLabel="Search mail" value="inv" expanded={expanded} suggestions={SUGGESTIONS} />
      </TanreiProvider>
    );
    const view = await render(element(true));
    await wait(10);
    await layOutView();
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionOpenDuration)).toBe(true);
    await wait(tokens.motionOpenDuration + 50);
    await view.rerender(element(false));
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionCloseDuration)).toBe(true);
    await wait(tokens.motionCloseDuration + 100);
    expect(q('view')).toBeNull();
  });

  test('SRC-24: the input is a search field named by the label (never the placeholder); rows are buttons named by their headline, described by their supporting text, with their position; icons hidden', async () => {
    await mount({ value: 'inv', expanded: true, inline: true, suggestions: SUGGESTIONS, placeholder: 'Try "invoice"' });
    expect(input().props).toMatchObject({ accessibilityRole: 'search', accessibilityLabel: 'Search mail' });
    expect(row(2).props).toMatchObject({ accessibilityRole: 'button', accessibilityLabel: 'Invoices', accessibilityHint: 'Folder · 24 messages', accessibilityValue: { text: '3 of 3' } });
    expect(rowPart(0, 'leading-icon')!.props.accessibilityElementsHidden).toBe(true);
    expect(q('leading-icon')!.props.accessibilityElementsHidden).toBe(true);
  });

  test('SRC-25: the slots\' icon buttons are not restyled and keep their own focus stops; the full-screen header draws neither slot', async () => {
    const leading = <IconButton testID="menu" accessibilityLabel="Menu">menu</IconButton>;
    const trailing = <IconButton testID="mic" accessibilityLabel="Voice search">mic</IconButton>;
    const view = await mount({ leading, trailing });
    expect(screen.getByTestId('menu').props).toMatchObject({ focusable: true, accessibilityLabel: 'Menu' });
    expect(viewStyle(screen.getByTestId('mic'))).toMatchObject({ width: tanrei.components.iconButton.sizes.medium.containerSize, alignSelf: 'flex-start' });
    await view.unmount();
    await mount({ presentation: 'full-screen', value: 'inv', expanded: true, inline: true, suggestions: SUGGESTIONS, leading, trailing });
    expect(screen.queryByTestId('menu')).toBeNull();
    expect(screen.queryByTestId('mic')).toBeNull();
  });

  test('SRC-26: disabled — not focusable or editable, no events, no clear button, the disabled state exposed, the bar from the disabled tokens', async () => {
    const log: string[] = [];
    await mountControlled({ log, initial: 'inv', disabled: true });
    expect(input().props).toMatchObject({ editable: false, readOnly: true, focusable: false, accessibilityState: { disabled: true } });
    expect(q('clear')).toBeNull();
    await fireEvent.press(bar());
    await fireEvent.changeText(input(), 'x');
    await keyPress('Escape');
    await keyPress('ArrowDown');
    await fireEvent(input(), 'submitEditing');
    expect(log).toEqual([]);
    expectBarDrawnFrom('disabled');
  });

  test('SRC-27: no label, an unknown presentation, empty or repeated suggestion values, an empty headline and more than two trailing elements all render and are reported in development builds', async () => {
    const warn = jest.mocked(console.warn);
    await mount({
      accessibilityLabel: '',
      presentation: 'sheet' as never,
      value: 'inv',
      expanded: true,
      inline: true,
      suggestions: [{ value: '', headline: 'a' }, { value: 'x', headline: 'b' }, { value: 'x', headline: '' }],
      trailing: (
        <>
          <IconButton accessibilityLabel="a">mic</IconButton>
          <IconButton accessibilityLabel="b">mic</IconButton>
          <IconButton accessibilityLabel="c">mic</IconButton>
        </>
      ),
    });
    expect(row(2)).toBeTruthy();
    const messages = warn.mock.calls.map(([message]) => String(message));
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('has no accessibilityLabel'),
        expect.stringContaining('Search presentation "sheet" is not defined; using "docked"'),
        expect.stringContaining('suggestion 1 of a Search (testID "search") has an empty value'),
        expect.stringContaining('suggestion 3 of a Search (testID "search") repeats the value "x"'),
        expect.stringContaining('suggestion 3 of a Search (testID "search") has no headline'),
        expect.stringContaining('trailing slot of a Search (testID "search") holds 3 elements'),
      ]),
    );
    warn.mockClear();
    resetLookupReports();
    development(false);
    await mount({ accessibilityLabel: '' });
    expect(reportsOf(warn)).toEqual([]);
  });

  test('SRC-28: the bar and the header grow with enlarged text (their heights are minimums), the value stays on one line, rows wrap, icon buttons do not scale', async () => {
    Dimensions.set({ window: { ...WINDOW, fontScale: 2 }, screen: { ...WINDOW, fontScale: 2 } });
    try {
      await mount({ presentation: 'full-screen', value: 'inv', expanded: true, inline: true, suggestions: SUGGESTIONS });
      expect(viewStyle(q('header')!)).toMatchObject({ minHeight: tokens.headerHeight });
      expect(viewStyle(q('header')!).height).toBeUndefined();
      expect(q('header.input')!.props).toMatchObject({ multiline: false, allowFontScaling: true });
      expect(rowPart(0, 'headline')!.props.allowFontScaling).toBe(true);
      expect(screen.getByTestId(`${ID}.back`).props.style).toBeDefined();
      expect(viewStyle(screen.getByTestId(`${ID}.back`)).height).toBe(tanrei.components.iconButton.sizes.medium.containerSize);
    } finally {
      Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
    }
  });

  test('SRC-29: the default slot\'s content gets the suggestion headline color as its foreground, inset like the rows; plain text takes sys.typescale.body', async () => {
    let seen: string | undefined;
    function Probe() {
      seen = useContentColor();
      return null;
    }
    const view = await mount({ value: 'inv', expanded: true, inline: true, children: <Probe /> });
    expect(seen).toBe(fill(standard.enabled.suggestionHeadlineColor));
    expect(viewStyle(q('content')!)).toMatchObject({ paddingStart: tokens.suggestionContainerPaddingInline, paddingEnd: tokens.suggestionContainerPaddingInline });
    await view.unmount();
    await mount({ value: 'inv', expanded: true, inline: true, children: 'No results' });
    expect(textStyle(q('content.text')!)).toMatchObject({ fontSize: createTanreiTheme(tanrei, 'light').text('body').fontSize, color: fill(standard.enabled.suggestionHeadlineColor) });
  });

  describe('fixtures (default system, light scheme)', () => {
    describeFixtureBaselines(searchSubject);
  });
});
