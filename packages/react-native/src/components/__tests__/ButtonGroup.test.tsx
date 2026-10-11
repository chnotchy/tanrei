// ButtonGroup — layout, the internal channel to its Buttons and IconButtons (BTN-10, ICB-10), accessibility, token
// binding and fixture baselines. Cases come from specs/button-group.spec.json; every behaviour id is cited by the test
// that covers it.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Text } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiButtonGroupTokens, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Button } from '../Button';
import { ButtonGroup, type ButtonGroupProps } from '../ButtonGroup';
import { IconButton } from '../IconButton';
import { buttonGroupSubject } from './ButtonGroup.subject';

const spec = loadSpec('button-group');
const tokens: TanreiButtonGroupTokens = tanrei.components.buttonGroup;
const button = tanrei.components.button;
const iconButton = tanrei.components.iconButton;
const { measure } = tanrei;
const ID = 'group';

const withGroup = (overrides: Partial<TanreiButtonGroupTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'buttonGroup', overrides);
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};

const BUTTONS = ['Cut', 'Copy', 'Paste'];
const buttons = (props: Partial<Parameters<typeof Button>[0]> = {}) =>
  BUTTONS.map((label, i) => (
    <Button key={label} testID={`item.${i}`} variant="outlined" {...props}>
      {label}
    </Button>
  ));
const icons = (props: Partial<Parameters<typeof IconButton>[0]> = {}) =>
  ['format_bold', 'format_italic', 'format_underlined'].map((glyph, i) => (
    <IconButton key={glyph} testID={`item.${i}`} accessibilityLabel={glyph} variant="tonal" {...props}>
      {glyph}
    </IconButton>
  ));

function mount(props: Partial<ButtonGroupProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <ButtonGroup testID={ID} {...props}>
        {props.children ?? buttons()}
      </ButtonGroup>
    </TanreiProvider>,
  );
}

const group = () => screen.getByTestId(ID);
const item = (i: number) => screen.getByTestId(`item.${i}`);
const part = (i: number, name: string) => screen.queryByTestId(`item.${i}.${name}`, { includeHiddenElements: true });
const reportsOf = (warn: jest.SpyInstance) => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('ButtonGroup'));
const layout = (target: ReturnType<typeof screen.getByTestId>, width: number, height = 40) => fireEvent(target, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
const radii = (i: number) => {
  const style = viewStyle(item(i));
  return [style.borderTopStartRadius, style.borderTopEndRadius, style.borderBottomStartRadius, style.borderBottomEndRadius];
};

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
  test('the React Native mapping in the spec matches this implementation: ButtonGroup holding Button and IconButton items, each as it is anywhere', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(ButtonGroup.name);
    expect(platform.props).toEqual({ variant: 'variant', label: 'accessibilityLabel' });
    expect(platform.items?.button?.name).toBe(Button.name);
    expect(platform.items?.['icon-button']?.name).toBe(IconButton.name);
    expect(platform.items?.button?.events).toEqual({ click: 'onPress' });
    expect(platform.items?.['icon-button']?.events).toEqual({ click: 'onPress', change: 'onSelectedChange' });
  });

  test('defaults follow the spec: standard, no label; the tokens are the default system\'s gaps and inner corner', async () => {
    expect(spec.props.find((p) => p.name === 'variant')?.default).toBe('standard');
    expect(tokens).toEqual({ standardGap: tanrei.space.space200, connectedGap: tanrei.space.space25, connectedInnerShape: tanrei.shape.extraSmall });
    // The default's gap keeps every icon button's whole target between neighbours (48 − the small one's 32).
    expect(tokens.standardGap).toBeGreaterThanOrEqual(measure.target.touch - iconButton.sizes.small.containerSize);
    await render(<ButtonGroup testID={ID}>{buttons()}</ButtonGroup>);
    expect(viewStyle(group()).gap).toBe(tokens.standardGap);
    expect(group().props.role).toBeUndefined();
  });
});

describe('layout (BGR-1, BGR-7, BGR-8, BGR-11)', () => {
  test('BGR-1: standard — one row, in order, comp.button-group.standard.gap apart, every item centred on the row\'s middle at its own size', async () => {
    await mount({ children: [...buttons().slice(0, 2), <IconButton key="i" testID="item.2" accessibilityLabel="More" size="small">more_vert</IconButton>] });
    expect(viewStyle(group())).toMatchObject({ flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: tokens.standardGap, alignSelf: 'flex-start' });
    expect(group().children.map((child) => (child as { props: { testID?: string } }).props.testID)).toEqual(['item.0', 'item.1', 'item.2']);
    expect([0, 1, 2].map((i) => viewStyle(item(i)).alignSelf)).toEqual(['center', 'center', 'center']);
    expect(viewStyle(item(2))).toMatchObject({ width: iconButton.sizes.small.containerSize, height: iconButton.sizes.small.containerSize });
    expect(viewStyle(item(0)).minHeight).toBe(button.sizes.medium.containerHeight);
  });

  test('BGR-1: connected — comp.button-group.connected.gap apart, every item stretched to the tallest (heights are minimums: an icon button trades its height for a minimum)', async () => {
    await mount({ variant: 'connected', children: [...buttons().slice(0, 2), <IconButton key="i" testID="item.2" accessibilityLabel="More">more_vert</IconButton>] });
    expect(viewStyle(group())).toMatchObject({ alignItems: 'stretch', gap: tokens.connectedGap });
    expect([0, 1, 2].map((i) => viewStyle(item(i)).alignSelf)).toEqual(['stretch', 'stretch', 'stretch']);
    expect(viewStyle(item(2))).toMatchObject({ minHeight: iconButton.sizes.medium.containerSize });
    expect(viewStyle(item(2)).height).toBeUndefined();
  });

  test('BGR-7: Buttons narrow when the row does not fit (their labels wrap), icon buttons keep their size, the row never wraps or scrolls; a row that still does not fit is reported in development builds', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ children: [...buttons().slice(0, 2), <IconButton key="i" testID="item.2" accessibilityLabel="More">more_vert</IconButton>] });
    expect(viewStyle(item(0)).flexShrink).toBe(1);
    expect(viewStyle(item(1)).flexShrink).toBe(1);
    expect(viewStyle(item(2)).flexShrink).toBeUndefined();
    expect(viewStyle(group()).flexWrap).toBe('nowrap');
    expect(part(0, 'label')!.props.numberOfLines).toBeUndefined();
    // It fits: 80 + gap + 80 + gap + 40.
    const fits = 80 + tokens.standardGap + 80 + tokens.standardGap + 40;
    await layout(item(0), 80);
    await layout(item(1), 80);
    await layout(item(2), 40);
    await layout(group(), fits);
    expect(reportsOf(warn)).toEqual([]);
    // It does not: the row got 16 less.
    await layout(group(), fits - 16);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('ButtonGroup (testID "group") does not fit its row')]);
    await view.unmount();
    warn.mockClear();
    development(false);
    await mount();
    await layout(item(0), 300);
    await layout(item(1), 300);
    await layout(item(2), 300);
    await layout(group(), 100);
    expect(warn).not.toHaveBeenCalled();
  });

  test('BGR-8: right-to-left — the row mirrors (a flex row) and the corners are logical, so the first item\'s outer corners are on its right; the reach toward a neighbour is on the mirrored side', async () => {
    jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    await mount({ variant: 'connected' });
    expect(viewStyle(group()).flexDirection).toBe('row');
    expect(radii(0)).toEqual([button.containerShape, tokens.connectedInnerShape, button.containerShape, tokens.connectedInnerShape]);
    expect(viewStyle(item(0)).borderTopLeftRadius).toBeUndefined();
    // The first item's neighbour is on its LEFT in right-to-left: that side is held to half the gap.
    expect(item(0).props.hitSlop.left).toBeLessThanOrEqual(tokens.connectedGap / 2);
  });

  test('BGR-11: an item that is added, removed or disabled keeps the others in order and moves the inner corners at once, without motion; a disabled item keeps its place, gap and corners', async () => {
    reduceMotion(false);
    const view = await mount({ variant: 'connected' });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const timing = jest.spyOn(Animated, 'timing');
    await view.rerender(
      <TanreiProvider theme="light">
        <ButtonGroup testID={ID} variant="connected">
          {buttons().slice(0, 2)}
        </ButtonGroup>
      </TanreiProvider>,
    );
    // The second item is now the last: its end corners are its own.
    expect(radii(1)).toEqual([tokens.connectedInnerShape, button.containerShape, tokens.connectedInnerShape, button.containerShape]);
    expect(timing).not.toHaveBeenCalled();
    await view.rerender(
      <TanreiProvider theme="light">
        <ButtonGroup testID={ID} variant="connected">
          {[buttons()[0], <Button key="Copy" testID="item.1" variant="outlined" disabled>Copy</Button>, buttons()[2]]}
        </ButtonGroup>
      </TanreiProvider>,
    );
    expect(item(1)).toBeDisabled();
    expect(radii(1)).toEqual([tokens.connectedInnerShape, tokens.connectedInnerShape, tokens.connectedInnerShape, tokens.connectedInnerShape]);
    expect(viewStyle(group()).gap).toBe(tokens.connectedGap);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, button.motionStateDuration * 2));
    });
  });
});

describe('the connected join (BGR-2, BGR-3, BGR-4; BTN-10, ICB-10)', () => {
  test('BGR-2 / BTN-10: in a connected group each Button takes comp.button-group.connected.inner-shape at the corners facing a neighbour and keeps its own at the outer ends; its outline follows', async () => {
    await mount({ variant: 'connected' });
    const inner = tokens.connectedInnerShape;
    const own = button.containerShape;
    expect(radii(0)).toEqual([own, inner, own, inner]);
    expect(radii(1)).toEqual([inner, inner, inner, inner]);
    expect(radii(2)).toEqual([inner, own, inner, own]);
    expect(viewStyle(item(0)).borderRadius).toBeUndefined();
    expect(viewStyle(part(0, 'outline')!)).toMatchObject({ borderTopStartRadius: own, borderTopEndRadius: inner, borderBottomEndRadius: inner });
  });

  test('BGR-2 / ICB-10: an IconButton takes the inner corners too — its fill and its focus ring follow the joined shape', async () => {
    await mount({ variant: 'connected', children: icons() });
    const inner = tokens.connectedInnerShape;
    const own = iconButton.containerShape;
    expect(radii(0)).toEqual([own, inner, own, inner]);
    await fireEvent(item(1), 'focus');
    const ring = viewStyle(part(1, 'focus-ring')!);
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(ring).toMatchObject({ borderTopStartRadius: inner + reach, borderTopEndRadius: inner + reach });
  });

  test('BGR-2: the ripple (m3-like) is clipped to the joined shape; corners ease by the smoothing (cupertino: continuous)', async () => {
    reduceMotion(false);
    jest.spyOn(ReactNative.View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 80, 40, 0, 0));
    const view = await mount({ variant: 'connected' }, { theme: 'light', system: m3Like });
    await layout(item(1), 80);
    await fireEvent(item(1), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    const inner = m3Like.components.buttonGroup.connectedInnerShape;
    expect(viewStyle(part(1, 'ripple')!)).toMatchObject({ borderTopStartRadius: inner, borderTopEndRadius: inner, overflow: 'hidden' });
    await fireEvent(item(1), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    await view.unmount();
    await mount({ variant: 'connected' }, { theme: 'light', system: cupertino });
    expect(viewStyle(item(0)).borderCurve).toBe('continuous');
    expect(radii(0)).toEqual([cupertino.components.button.containerShape, cupertino.components.buttonGroup.connectedInnerShape, cupertino.components.button.containerShape, cupertino.components.buttonGroup.connectedInnerShape]);
  });

  test('BGR-2: a standard group leaves every corner as the item draws it — the item renders exactly as it does alone, but for where it sits', async () => {
    const alone = await render(
      <TanreiProvider theme="light">
        <Button testID="item.0" variant="outlined">
          Cut
        </Button>
      </TanreiProvider>,
    );
    const expected = viewStyle(item(0));
    await alone.unmount();
    await mount();
    expect(viewStyle(item(0))).toEqual({ ...expected, alignSelf: 'center', flexShrink: 1 });
  });

  test('BGR-3: connected — each item at least sys.target.touch wide; a narrower icon button widens its container around its centred icon; above and below the hit area extends as BTN-5 / ICB-5 say', async () => {
    const view = await mount({ variant: 'connected', children: icons({ size: 'small' }) });
    const size = iconButton.sizes.small.containerSize;
    expect(size).toBeLessThan(measure.target.touch);
    expect(viewStyle(item(0))).toMatchObject({ width: measure.target.touch, alignItems: 'center', justifyContent: 'center' });
    expect(viewStyle(part(0, 'icon')!).width).toBe(iconButton.sizes.small.iconSize);
    const vertical = Math.ceil((measure.target.touch - size) / 2);
    // Estimated before layout from the icon button's own square: sideways only toward the ends, never over a neighbour.
    expect(item(1).props.hitSlop).toMatchObject({ top: vertical, bottom: vertical, left: tokens.connectedGap / 2, right: tokens.connectedGap / 2 });
    await layout(item(1), measure.target.touch, size);
    expect(item(1).props.hitSlop).toEqual({ top: vertical, bottom: vertical, left: 0, right: 0 });
    await view.unmount();
    await mount({ variant: 'connected' });
    expect(viewStyle(item(0)).minWidth).toBe(measure.target.touch);
  });

  test('BGR-4: standard — where neighbouring hit areas would overlap, each reaches only half the gap toward its neighbour, so a press on an item\'s bounds is that item\'s and a press in the gap goes to the nearer one; the outer ends reach as ICB-5 says', async () => {
    // The default's gap leaves room for every whole target, so the hit areas never overlap there: each item
    // reaches its own target on every side.
    const size = iconButton.sizes.small.containerSize;
    const own = Math.ceil((measure.target.touch - size) / 2);
    const view = await mount({ children: icons({ size: 'small' }) });
    expect(own).toBeLessThanOrEqual(tokens.standardGap / 2);
    for (const i of [0, 1, 2]) expect(item(i).props.hitSlop).toEqual({ top: own, bottom: own, left: own, right: own });
    await view.unmount();
    // A layer with a narrower gap: the hit areas would overlap, and each reaches only half the gap toward a neighbour.
    const gap = 8;
    await mount({ children: icons({ size: 'small' }) }, { theme: 'light', system: withGroup({ standardGap: gap }) });
    expect(own).toBeGreaterThan(gap / 2);
    expect(item(0).props.hitSlop).toEqual({ top: own, bottom: own, left: own, right: gap / 2 });
    expect(item(1).props.hitSlop).toEqual({ top: own, bottom: own, left: gap / 2, right: gap / 2 });
    expect(item(2).props.hitSlop).toEqual({ top: own, bottom: own, left: gap / 2, right: own });
  });
});

describe('items keep themselves (BGR-5)', () => {
  test('BGR-5: each item renders from its own tokens, answers its own states, emits its own events and keeps its own semantics and Tab stop; the group takes no focus, handles no keys and keeps no selection', async () => {
    const onPress = jest.fn();
    const onSelectedChange = jest.fn();
    await mount({
      variant: 'connected',
      children: [
        <Button key="b" testID="item.0" onPress={onPress}>
          Save
        </Button>,
        <IconButton key="i" testID="item.1" accessibilityLabel="Bold" toggle selected={false} onSelectedChange={onSelectedChange}>
          format_bold
        </IconButton>,
      ],
    });
    await fireEvent.press(item(0));
    await fireEvent.press(item(1));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
    expect(item(0).props.accessibilityRole).toBe('button');
    expect(item(1).props.accessibilityState).toMatchObject({ selected: false });
    expect([0, 1].map((i) => item(i).props.focusable)).toEqual([true, true]);
    expect(group().props.focusable).toBeUndefined();
    expect(group().props.onKeyDown).toBeUndefined();
    await fireEvent(item(0), 'hoverIn');
    expect(textStyle(part(0, 'label')!).color).toBeDefined();
  });
});

describe('accessibility (BGR-6, BGR-9, BGR-10)', () => {
  test('BGR-6: with a label the group is a group named by it, containing its items; without one it adds no element of its own', async () => {
    const view = await mount({ accessibilityLabel: 'Clipboard' });
    expect(group().props).toMatchObject({ role: 'group', accessibilityLabel: 'Clipboard' });
    expect(group().props.accessible).toBeUndefined();
    await view.unmount();
    await mount();
    expect(group().props.role).toBeUndefined();
    expect(group().props.accessibilityLabel).toBeUndefined();
  });

  test('BGR-9: an unknown variant renders as standard, and development builds report it; a release build is silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const expected = await mount();
    const json = JSON.stringify(expected.toJSON());
    await expected.unmount();
    const view = await mount({ variant: 'split' as never });
    expect(JSON.stringify(view.toJSON())).toBe(json);
    expect(reportsOf(warn)).toEqual([expect.stringContaining('ButtonGroup variant "split" is not defined; using "standard"')]);
    await view.unmount();
    warn.mockClear();
    resetLookupReports();
    development(false);
    await mount({ variant: 'joined' as never });
    expect(warn).not.toHaveBeenCalled();
  });

  test('BGR-10: a group of fewer than two items, or holding content that is not a Tanrei Button or IconButton, still renders and is reported in development builds', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ children: buttons().slice(0, 1) });
    expect(item(0)).toBeTruthy();
    expect(reportsOf(warn)).toEqual([expect.stringContaining('holds 1 item; a group holds two or more')]);
    await view.unmount();
    warn.mockClear();
    const mixed = await mount({ variant: 'connected', children: [...buttons().slice(0, 1), <Text key="t" testID="item.1">Note</Text>] });
    expect(item(1)).toBeTruthy();
    expect(reportsOf(warn)).toEqual([expect.stringContaining('item 2 of a ButtonGroup (testID "group") is not a Tanrei Button or IconButton')]);
    await mixed.unmount();
    warn.mockClear();
    development(false);
    await mount({ children: buttons().slice(0, 1) });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('the system drives rendering', () => {
  test('gaps and the inner corner re-valued by a layer are drawn', async () => {
    const system = withGroup({ standardGap: 13, connectedGap: 5, connectedInnerShape: 1 });
    const view = await mount({}, { theme: 'light', system });
    expect(viewStyle(group()).gap).toBe(13);
    await view.unmount();
    await mount({ variant: 'connected' }, { theme: 'light', system });
    expect(viewStyle(group()).gap).toBe(5);
    expect(radii(1)).toEqual([1, 1, 1, 1]);
  });
});

describe('fixtures', () => {
  beforeEach(() => {
    // The selected toggle's glyph: the icon helper's fill report, covered in IconButton.test.tsx.
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  describeFixtureBaselines(buttonGroupSubject);

  test('every fixture holds button or icon-button items (BGR-1\'s verify)', () => {
    for (const fixture of spec.fixtures) {
      expect(fixture.items?.length).toBeGreaterThanOrEqual(2);
      for (const each of fixture.items ?? []) expect(['button', 'icon-button']).toContain(each.kind);
    }
  });
});
