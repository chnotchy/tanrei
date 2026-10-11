// List — behaviour, accessibility, keyboard, token binding and fixture baselines.
// Cases come from specs/list.spec.json; every behaviour id is cited by the test that covers it.
import fs from 'node:fs';
import path from 'node:path';
import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, Switch, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreListCondition, TanreiListConditionStateTokens, TanreiListTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { TYPEAHEAD_WINDOW } from '../../primitives/rovingFocus';
import { describeFixtureBaselines, textStyle, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { useContentColor } from '../../theme/contentColor';
import { iconFamily } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { List, type ListItem, type ListProps } from '../List';
import { acme } from './__fixtures__/acme';
import { listSubject } from './List.subject';

const spec = loadSpec('list');
const { measure } = tanrei;
const tokens: TanreiListTokens = tanrei.components.list;
const ID = 'list';
const LABEL = 'Theme';

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor((system.colors as TanreiSystem['colors'])[scheme][name]!);
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
/** `undefined` when the paint draws nothing: the row then sets no fill. */
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));

const withList = (overrides: Partial<TanreiListTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'list', overrides);
/** …with some tokens of one condition changed, per state. */
const withCondition = (condition: TanreiCoreListCondition, overrides: { [State in InteractionState]?: Partial<TanreiListConditionStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.list.conditions[condition];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withList({ conditions: { ...base.components.list.conditions, [condition]: { ...current, ...changed } } }, base);
};
const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });

const noop = () => undefined;
const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const development = (enabled: boolean) => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
};

// The rows under test.
const ACTIONS: ListItem[] = [
  { headline: 'Wi-Fi', supportingText: 'Connected', leadingIcon: 'wifi', trailingIcon: 'chevron_right', onPress: noop },
  { headline: 'Bluetooth', supportingText: 'Off', leadingIcon: 'bluetooth', trailingIcon: 'chevron_right', onPress: noop },
];
const OPTIONS: ListItem[] = [
  { headline: 'Light', value: 'light', leadingIcon: 'light_mode', trailingText: 'Default' },
  { headline: 'Dark', value: 'dark' },
  { headline: 'Match the system', value: 'system' },
];

function mount(props: Partial<ListProps> & { items: readonly ListItem[] }, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <List testID={ID} {...(props as ListProps)} />
    </TanreiProvider>,
  );
}
const mountActions = (items: ListItem[] = ACTIONS, provider?: Omit<TanreiProviderProps, 'children'>) => mount({ items }, provider);
const mountOptions = (props: Partial<ListProps> = {}, provider?: Omit<TanreiProviderProps, 'children'>) =>
  mount({ items: OPTIONS, selectionMode: 'single', value: 'light', accessibilityLabel: LABEL, ...props } as ListProps, provider);

/** A controlled list: it moves its own selection from onSelectionChange, as a caller does. */
function Chooser({ mode, initial, onChange, items = OPTIONS }: { mode: 'single' | 'multiple'; initial: string | null | string[]; onChange?: (next: unknown) => void; items?: ListItem[] }) {
  const [selection, setSelection] = useState(initial);
  const change = (next: string | string[]) => {
    onChange?.(next);
    setSelection(next);
  };
  const props = mode === 'single' ? { selectionMode: 'single' as const, value: selection as string | null, onSelectionChange: change } : { selectionMode: 'multiple' as const, values: selection as string[], onSelectionChange: change };
  return (
    <TanreiProvider theme="light">
      <List testID={ID} accessibilityLabel={LABEL} items={items} {...props} />
    </TanreiProvider>
  );
}

const list = () => screen.getByTestId(ID);
const item = (i: number) => screen.getByTestId(`${ID}.item.${i}`, { includeHiddenElements: true });
const row = (i: number) => screen.getByTestId(`${ID}.item.${i}.row`, { includeHiddenElements: true });
const part = (i: number, name: string) => screen.queryByTestId(`${ID}.item.${i}.${name}`, { includeHiddenElements: true });
const key = (name: string) => fireEvent(list(), 'keyDown', { nativeEvent: { key: name } });
/** Enter / Space / D-pad centre and assistive activation: a bare click (no press events, no touch data). */
const click = (i: number) => fireEvent(row(i), 'press', { nativeEvent: { target: 1 } });
/** `focus()` on a host view, spied: which row the list moved focus to (by its testID). */
const focusSpy = () => jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);
const focusedRow = (spy: jest.SpyInstance) => (spy.mock.contexts.at(-1) as { props?: { testID?: string } } | undefined)?.props?.testID;

/** LST-8: a press stays visible for `duration.pressHold`, so a release is over only after that. */
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
const CONDITIONS: TanreiCoreListCondition[] = ['unselected', 'selected'];
/** The opacity of a state, written out independently of `stateShape`. */
const opacityOf = (from: TanreiListTokens, in_: InteractionState) => ({ enabled: 1, hovered: from.hoveredOpacity, focused: from.focusedOpacity, pressed: from.pressedOpacity, disabled: from.disabledOpacity })[in_];
const shapeOf = (from: TanreiListTokens, in_: InteractionState) => ({ enabled: from.containerShape, hovered: from.hoveredContainerShape, focused: from.focusedContainerShape, pressed: from.pressedContainerShape, disabled: from.disabledContainerShape })[in_];
/** A leg of the check (a stroked view inside the check's box). */
const checkLegs = (i: number) => (part(i, 'check')?.children ?? []) as Instance[];
const glyphColor = (i: number, name: 'leading-icon' | 'trailing-icon') => textStyle(part(i, `${name}.glyph`)!).color;

/** Everything LST-3 / LST-6 name — container, every text, the icons, the mark and the opacity — from one state's tokens. */
function expectRowDrawnFrom(i: number, condition: TanreiCoreListCondition, in_: InteractionState, system: TanreiSystem = tanrei, scheme: TanreiScheme = 'light') {
  const from = system.components.list;
  const paints = from.conditions[condition][in_];
  const style = viewStyle(row(i));
  expect(style.backgroundColor).toBe(fill(paints.containerColor, scheme, system));
  expect(style.opacity ?? 1).toBe(opacityOf(from, in_));
  expect(style.borderRadius).toBe(shapeOf(from, in_));
  expect(textStyle(part(i, 'headline')!).color).toBe(painted(paints.headlineColor, scheme, system));
  if (part(i, 'overline')) expect(textStyle(part(i, 'overline')!).color).toBe(painted(paints.overlineColor, scheme, system));
  if (part(i, 'supporting-text')) expect(textStyle(part(i, 'supporting-text')!).color).toBe(painted(paints.supportingTextColor, scheme, system));
  if (part(i, 'trailing-text')) expect(textStyle(part(i, 'trailing-text')!).color).toBe(painted(paints.trailingTextColor, scheme, system));
  if (part(i, 'leading-icon')) expect(glyphColor(i, 'leading-icon')).toBe(painted(paints.leadingIconColor, scheme, system));
  if (part(i, 'trailing-icon')) expect(glyphColor(i, 'trailing-icon')).toBe(painted(paints.trailingIconColor, scheme, system));
  for (const leg of checkLegs(i)) expect(viewStyle(leg).backgroundColor).toBe(painted(paints.markColor, scheme, system));
}

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // The baselines at the tokens' own sizes (the Jest preset's window has fontScale 2); the list itself never reads it.
  Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
beforeEach(() => {
  // Most tests assert settled values; the animated path has its own tests.
  reduceMotion(true);
  resetLookupReports();
});
afterEach(() => {
  jest.restoreAllMocks();
  development(true);
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation: List, its selection props, and ListItem', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(List.name);
    expect(platform.props).toEqual({ selection: 'selectionMode', label: 'accessibilityLabel', value: 'value', values: 'values' });
    expect(platform.events).toEqual({ change: 'onSelectionChange' });
    expect(platform.items?.['list-item']).toMatchObject({
      name: 'ListItem',
      props: {
        headline: 'headline',
        overline: 'overline',
        supportingText: 'supportingText',
        supportingMaxLines: 'supportingNumberOfLines',
        trailingText: 'trailingText',
        leadingIcon: 'leadingIcon',
        trailingIcon: 'trailingIcon',
        leadingMedia: 'leadingMedia',
        interactive: 'onPress',
        value: 'value',
        disabled: 'disabled',
        divider: 'divider',
      },
      events: { click: 'onPress' },
    });
  });

  test('the conditions are the token axis: unselected (the default) and selected', () => {
    expect(Object.keys(tokens.conditions)).toEqual(CONDITIONS);
    expect(spec.props.find((p) => p.name === 'selection')?.values).toEqual(['none', 'single', 'multiple']);
    expect(spec.items?.[0]?.props.find((p) => p.name === 'leadingMedia')?.values).toEqual(['none', 'avatar', 'image']);
  });

  test('defaults follow the spec: selection none, a list of static items drawn from the resting unselected tokens', async () => {
    await mount({ items: [{ headline: 'Inbox' }] });
    expect(list().props.accessibilityRole).toBe('list');
    expect(item(0).props.role).toBe('listitem');
    expect(row(0).type).toBe('View');
    expect(row(0).props.focusable).toBeUndefined();
    expectRowDrawnFrom(0, 'unselected', 'enabled');
    expect(part(0, 'mark')).toBeNull();
  });
});

describe('interactive items (LST-1, LST-2)', () => {
  test('LST-1: activating an interactive item calls its onPress exactly once — touch and a bare (keyboard / assistive) click alike', async () => {
    const onPress = jest.fn();
    await mountActions([{ headline: 'Wi-Fi', onPress }, { headline: 'Bluetooth', onPress: noop }]);
    await fireEvent.press(row(0));
    expect(onPress).toHaveBeenCalledTimes(1);
    await wait(HOLD + 30);
    await click(0);
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(row(0).props.accessible).toBe(true);
  });

  test('LST-2: a disabled interactive item calls nothing and exposes disabled; a disabled option changes nothing', async () => {
    const onPress = jest.fn();
    const view = await mountActions([{ headline: 'Archive', onPress, disabled: true }, { headline: 'Trash', onPress: noop }]);
    await fireEvent.press(row(0));
    await click(0);
    expect(onPress).not.toHaveBeenCalled();
    expect(row(0).props.accessibilityState).toEqual({ disabled: true });
    expect(row(0)).toBeDisabled();
    await view.unmount();

    const onChange = jest.fn();
    await render(<Chooser mode="single" initial="dark" onChange={onChange} items={[{ headline: 'Light', value: 'light', disabled: true }, { headline: 'Dark', value: 'dark' }]} />);
    await fireEvent.press(row(0));
    expect(onChange).not.toHaveBeenCalled();
    expect(row(0).props.accessibilityState).toEqual({ disabled: true, selected: false });
  });

  test('LST-2: the arrow keys still reach a disabled item — it becomes the tab stop and takes focus — but Space, Enter and presses do not activate it', async () => {
    const focus = focusSpy();
    const onPress = jest.fn();
    await mountActions([{ headline: 'Trash', onPress: noop }, { headline: 'Archive', onPress, disabled: true }]);
    await fireEvent(row(0), 'focus');
    await key('ArrowDown');
    expect(focusedRow(focus)).toBe(`${ID}.item.1.row`);
    expect(row(1).props.focusable).toBe(true);
    expect(row(0).props.focusable).toBe(false);
    await click(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('states (LST-3, LST-4, LST-6)', () => {
  describe.each([
    ['an interactive item', 'unselected', () => mountActions()],
    ['an unselected option', 'unselected', () => mountOptions({ value: 'dark' })],
    ['a selected option', 'selected', () => mountOptions({ value: 'light' })],
  ] as const)('LST-3: %s', (_name, condition, mountIt) => {
    test.each(ACTIVE)('%s: container, texts, icons, mark and opacity come from its condition\'s tokens, and it returns to rest', async (target) => {
      await mountIt();
      expectRowDrawnFrom(0, condition, 'enabled');
      await enter(0, target);
      expectRowDrawnFrom(0, condition, target);
      if (target === 'hovered') await fireEvent(row(0), 'hoverOut');
      if (target === 'focused') await fireEvent(row(0), 'blur');
      if (target === 'pressed') await release(0);
      expectRowDrawnFrom(0, condition, 'enabled');
    });
  });

  test('LST-3: precedence is pressed over focused over hovered, under the acme fixture system (which values each differently)', async () => {
    const unselected = acme.components.list.conditions.unselected;
    const expected = (name: InteractionState) => fill(unselected[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    expect(acme.behavior.pressedFeedback).toBe('overlay');
    await mountActions(ACTIONS, { theme: 'light', system: acme });
    const background = () => viewStyle(row(0)).backgroundColor;
    await fireEvent(row(0), 'hoverIn');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(row(0), 'focus');
    expect(background()).toBe(expected('focused'));
    await fireEvent(row(0), 'pressIn');
    expect(background()).toBe(expected('pressed'));
    await release(0);
    expect(background()).toBe(expected('focused'));
    await fireEvent(row(0), 'blur');
    expect(background()).toBe(expected('hovered'));
    await fireEvent(row(0), 'hoverOut');
    expect(background()).toBe(expected('enabled'));
  });

  test('LST-3: in the default system a state mixes the condition\'s state-layer color (its headline color) into the row', async () => {
    for (const condition of CONDITIONS) {
      const view = await mountOptions({ value: condition === 'selected' ? 'light' : 'dark' });
      const resting = tokens.conditions[condition].enabled;
      expect(resting.stateLayerColor).toEqual(resting.headlineColor);
      const mix = (amount: number): TanreiPaint => ({ kind: 'mix', base: resting.containerColor, with: resting.stateLayerColor, amount });
      await fireEvent(row(0), 'hoverIn');
      expect(viewStyle(row(0)).backgroundColor).toBe(painted(mix(tanrei.state.hoverStateLayerOpacity)));
      await fireEvent(row(0), 'focus');
      expect(viewStyle(row(0)).backgroundColor).toBe(painted(mix(tanrei.state.focusStateLayerOpacity)));
      await view.unmount();
    }
  });

  test('LST-3: focus gained by touch or pointer does not select the focused state', async () => {
    const system = withCondition('unselected', { focused: { containerColor: literal(2, 0, 0) } });
    await mountActions(ACTIONS, { theme: 'light', system });
    await fireEvent(row(0), 'pressIn');
    await fireEvent(row(0), 'focus');
    await release(0);
    expectRowDrawnFrom(0, 'unselected', 'enabled', system);
    expect(part(0, 'focus-ring')).toBeNull();
  });

  test('LST-4: keyboard focus shows the focus ring INSIDE the row — its outer edge on the row\'s edge — without animation', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mountActions();
    expect(part(0, 'focus-ring')).toBeNull();
    await wait(10);
    timing.mockClear();
    await fireEvent(row(0), 'focus');
    const ring = part(0, 'focus-ring')!;
    expect(measure.focus.innerWidth).toBe(0);
    expect(viewStyle(ring)).toEqual({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: measure.focus.outerWidth, borderColor: role('focusRing'), borderRadius: tokens.focusedContainerShape, pointerEvents: 'none' });
    // The ring is not animated (the row's colors are: one timing, for the state layer).
    expect(timing.mock.calls.every(([, config]) => config.duration === tokens.motionStateDuration)).toBe(true);
    await fireEvent(row(0), 'blur');
    expect(part(0, 'focus-ring')).toBeNull();
    await wait(tokens.motionStateDuration * 2);
  });

  test('LST-4: an inner stroke, where a system has one, lies inside the outer one; the glow (acme) is a halo within the row', async () => {
    const system: TanreiSystem = { ...tanrei, measure: { ...tanrei.measure, focus: { offset: 2, innerWidth: 1, outerWidth: 2 } } };
    const view = await mountActions(ACTIONS, { theme: 'light', system });
    await fireEvent(row(0), 'focus');
    expect(viewStyle(part(0, 'focus-ring')!)).toMatchObject({ top: 0, left: 0, borderWidth: 2 });
    expect(viewStyle(part(0, 'focus-ring.inner')!)).toMatchObject({ top: 2, left: 2, borderWidth: 1, borderColor: role('focusRingInner') });
    await view.unmount();

    await mountActions(ACTIONS, { theme: 'light', system: acme });
    await fireEvent(row(0), 'focus');
    const { innerWidth, outerWidth } = acme.measure.focus;
    const reach = innerWidth + outerWidth;
    expect(viewStyle(part(0, 'focus-ring')!)).toMatchObject({ top: reach, left: reach, boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: outerWidth, spreadDistance: reach, color: painted({ kind: 'role', role: 'focusRing' }, 'light', acme) }] });
  });

  test('LST-4: focus gained by touch or pointer shows no ring; a later keyboard focus does', async () => {
    await mountActions();
    await fireEvent(row(0), 'pressIn');
    await fireEvent(row(0), 'focus');
    expect(part(0, 'focus-ring')).toBeNull();
    await release(0);
    await fireEvent(row(0), 'blur');
    await fireEvent(row(0), 'focus');
    expect(part(0, 'focus-ring')).not.toBeNull();
  });

  test('LST-6: a disabled item and a disabled option are drawn from the disabled tokens of their condition, the opacity on the whole row — leading media included', async () => {
    const view = await mountActions([{ headline: 'Archive', leadingIcon: 'archive', onPress: noop, disabled: true }]);
    expectRowDrawnFrom(0, 'unselected', 'disabled');
    await view.unmount();
    await mount({ items: [{ headline: 'Ada', leadingMedia: 'avatar', leading: 'A', value: 'ada', disabled: true }, { headline: 'Grace', value: 'grace' }], selectionMode: 'single', value: 'ada', accessibilityLabel: 'People' });
    expectRowDrawnFrom(0, 'selected', 'disabled');
    // The avatar is inside the row, so the row's opacity dims it too.
    expect(row(0).children).toContain(part(0, 'avatar'));
  });

  test('LST-6: in the default system a disabled row keeps its resting colors (a selected one its fill) and dims as a whole to the disabled content opacity', async () => {
    for (const condition of CONDITIONS) {
      const disabled = tokens.conditions[condition].disabled;
      const resting = tokens.conditions[condition].enabled;
      for (const name of Object.keys(resting) as (keyof TanreiListConditionStateTokens)[]) expect(painted(disabled[name])).toBe(painted(resting[name]));
    }
    expect(tokens.disabledOpacity).toBe(tanrei.state.disabledContentOpacity);
    await mountOptions({ items: [{ headline: 'Light', value: 'light', disabled: true }, { headline: 'Dark', value: 'dark' }] });
    expect(viewStyle(row(0))).toMatchObject({ opacity: tanrei.state.disabledContentOpacity, backgroundColor: painted(tokens.conditions.selected.enabled.containerColor) });
  });
});

describe('minimum target (LST-5)', () => {
  test('LST-5: a row that takes presses is at least sys.target.touch tall — cupertino\'s 44 one-line row grows to 48 — and extends no hit area over its neighbours', async () => {
    expect(cupertino.components.list.containerHeightOneLine).toBeLessThan(cupertino.measure.target.touch);
    const view = await mountActions([{ headline: 'Wi-Fi', onPress: noop }], { theme: 'light', system: cupertino });
    expect(viewStyle(row(0)).minHeight).toBe(cupertino.measure.target.touch);
    expect(row(0).props.hitSlop).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    await view.unmount();
    // A static row keeps its own height: it is not a target.
    await mount({ items: [{ headline: 'Inbox' }] }, { theme: 'light', system: cupertino });
    expect(viewStyle(row(0)).minHeight).toBe(cupertino.components.list.containerHeightOneLine);
  });

  test('LST-5: the whole row — leading media and trailing elements included — is the item\'s hit area (one Pressable holds them)', async () => {
    await mount({ items: [{ headline: 'Ada', leadingMedia: 'avatar', leading: 'A', trailingText: '9:41', trailingIcon: 'chevron_right', value: 'ada' }], selectionMode: 'single', value: null, accessibilityLabel: 'People' });
    for (const name of ['avatar', 'text', 'trailing-text', 'trailing-icon', 'mark']) expect(row(0).children).toContain(part(0, name));
  });
});

describe('unknown values (LST-7)', () => {
  test('LST-7: an unknown selectionMode renders exactly as none, and development builds report it once', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reference = await mount({ items: [{ headline: 'Inbox' }, { headline: 'Sent' }] });
    const expected = JSON.stringify(reference.toJSON());
    await reference.unmount();
    expect(warn).not.toHaveBeenCalled();
    for (let i = 0; i < 2; i += 1) {
      const view = await mount({ items: [{ headline: 'Inbox' }, { headline: 'Sent' }], selectionMode: 'several' } as unknown as ListProps);
      expect(JSON.stringify(view.toJSON())).toBe(expected);
      await view.unmount();
    }
    expect(warn.mock.calls.filter(([message]) => String(message).includes('List selectionMode "several" is not defined; using "none"'))).toHaveLength(1);
  });

  test('LST-7: an unknown leadingMedia renders as none (the leading icon is drawn), and development builds report it; a release build is silent', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reference = await mount({ items: [{ headline: 'Inbox', leadingIcon: 'inbox' }] });
    const expected = JSON.stringify(reference.toJSON());
    await reference.unmount();
    await mount({ items: [{ headline: 'Inbox', leadingIcon: 'inbox', leadingMedia: 'video' as ListItem['leadingMedia'] }] });
    expect(JSON.stringify(screen.toJSON())).toBe(expected);
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('List leadingMedia "video" is not defined; using "none"')]);
    await screen.unmount();
    warn.mockClear();
    resetLookupReports();
    development(false);
    await mount({ items: [{ headline: 'Inbox', leadingMedia: 'film' as ListItem['leadingMedia'] }] });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('press (LST-8, LST-9, LST-10)', () => {
  const SIDE = { width: 360, height: 64 };
  const LAYOUT = { nativeEvent: { layout: { x: 0, y: 0, ...SIDE } } };

  test('LST-8: the pressed state appears in the same frame and stays visible for duration.pressHold although the press ended sooner', async () => {
    expect(HOLD).toBe(100);
    await mountActions();
    await fireEvent(row(0), 'pressIn');
    expectRowDrawnFrom(0, 'unselected', 'pressed');
    await fireEvent(row(0), 'pressOut');
    expectRowDrawnFrom(0, 'unselected', 'pressed');
    await wait(HOLD / 2);
    expectRowDrawnFrom(0, 'unselected', 'pressed');
    await wait(HOLD / 2 + 30);
    expectRowDrawnFrom(0, 'unselected', 'enabled');
  });

  test('LST-8: Enter / Space / assistive activation — a bare click — shows the pressed state for the hold; a touch ends on the touch events', async () => {
    await mountActions();
    await click(0);
    expectRowDrawnFrom(0, 'unselected', 'pressed');
    await wait(HOLD + 30);
    expectRowDrawnFrom(0, 'unselected', 'enabled');
    await fireEvent(row(1), 'pressIn', { nativeEvent: { timestamp: 0, touches: [] } });
    await fireEvent(row(1), 'touchEnd', { nativeEvent: { timestamp: 10, touches: [] } });
    await wait(HOLD + 30);
    expectRowDrawnFrom(1, 'unselected', 'enabled');
  });

  test('LST-9 overlay (the default): the pressed tokens reach the whole row at once; no ripple node exists', async () => {
    reduceMotion(false);
    await mountActions();
    await fireEvent(row(0), 'layout', LAYOUT);
    await fireEvent(row(0), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(viewStyle(row(0)).backgroundColor).toBe(fill(tokens.conditions.unselected.pressed.containerColor));
    expect(part(0, 'ripple')).toBeNull();
    await release(0);
    await wait(tokens.motionStateDuration * 2);
  });

  test('LST-9 ripple (m3-like): the pressed color grows from the point of contact over the feedback duration; the row keeps the state under the press; it fades over the state duration', async () => {
    const list3 = m3Like.components.list;
    expect(m3Like.behavior.pressedFeedback).toBe('ripple');
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, SIDE.width, SIDE.height, 0, 100));
    await mountActions(ACTIONS, { theme: 'light', system: m3Like });
    await fireEvent(row(0), 'layout', LAYOUT);
    timing.mockClear();
    await fireEvent(row(0), 'pressIn', { nativeEvent: { pageX: 40, pageY: 120 } });
    const unselected = list3.conditions.unselected;
    expect(viewStyle(row(0)).backgroundColor).toBe(fill(unselected.enabled.containerColor, 'light', m3Like));
    const reach = Math.hypot(SIDE.width - 40, SIDE.height - 20);
    expect(viewStyle(part(0, 'ripple.wave')!)).toMatchObject({ left: 40 - reach, top: 20 - reach, width: reach * 2, backgroundColor: painted(unselected.pressed.containerColor, 'light', m3Like) });
    expect(row(0).children.indexOf(part(0, 'ripple')!)).toBe(0);
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: list3.motionFeedbackDuration, useNativeDriver: true });
    // The texts still come from the pressed tokens.
    expect(textStyle(part(0, 'headline')!).color).toBe(painted(unselected.pressed.headlineColor, 'light', m3Like));
    timing.mockClear();
    await release(0);
    expect(timing.mock.calls.some(([, config]) => config.toValue === 0 && config.duration === list3.motionStateDuration)).toBe(true);
    await wait(list3.motionStateDuration * 2 + 50);
    expect(part(0, 'ripple')).toBeNull();
  });

  test('LST-9 ripple: keyboard activation ripples from the center; with reduce motion nothing grows and the pressed tokens apply at once', async () => {
    reduceMotion(false);
    const view = await mountActions(ACTIONS, { theme: 'light', system: m3Like });
    await fireEvent(row(0), 'layout', LAYOUT);
    await click(0);
    const reach = Math.hypot(SIDE.width / 2, SIDE.height / 2);
    expect(viewStyle(part(0, 'ripple.wave')!)).toMatchObject({ left: SIDE.width / 2 - reach, top: SIDE.height / 2 - reach });
    await wait(HOLD + 30);
    await wait(m3Like.components.list.motionStateDuration * 2 + 50);
    await view.unmount();

    reduceMotion(true);
    await mountActions(ACTIONS, { theme: 'light', system: m3Like });
    await fireEvent(row(0), 'layout', LAYOUT);
    await fireEvent(row(0), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(part(0, 'ripple')).toBeNull();
    expect(viewStyle(row(0)).backgroundColor).toBe(fill(m3Like.components.list.conditions.unselected.pressed.containerColor, 'light', m3Like));
    await release(0);
  });

  test('LST-9 dim (cupertino): the pressed opacity on the whole row and NO state layer — the row keeps the state under the press; the texts come from the pressed tokens', async () => {
    expect(cupertino.behavior.pressedFeedback).toBe('dim');
    const list3 = cupertino.components.list;
    expect(list3.pressedOpacity).toBeLessThan(1);
    await mountActions(ACTIONS, { theme: 'light', system: cupertino });
    await fireEvent(row(0), 'hoverIn');
    await fireEvent(row(0), 'pressIn');
    expect(viewStyle(row(0))).toMatchObject({ opacity: list3.pressedOpacity, backgroundColor: fill(list3.conditions.unselected.hovered.containerColor, 'light', cupertino) });
    expect(textStyle(part(0, 'headline')!).color).toBe(painted(list3.conditions.unselected.pressed.headlineColor, 'light', cupertino));
    expect(part(0, 'ripple')).toBeNull();
    await release(0);
    expect(viewStyle(row(0)).opacity).toBe(list3.hoveredOpacity);
  });

  test('LST-9 none: no answer to the press — every part stays with the state under the press; the click still happens', async () => {
    const onPress = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withCondition('unselected', { pressed: { containerColor: literal(1, 2, 3), headlineColor: literal(10, 20, 30) } }, withList({ pressedOpacity: 0.5 })));
    await mountActions([{ headline: 'Wi-Fi', onPress }], { theme: 'light', system });
    await fireEvent(row(0), 'pressIn');
    expectRowDrawnFrom(0, 'unselected', 'enabled', system);
    await fireEvent.press(row(0));
    expect(onPress).toHaveBeenCalledTimes(1);
    await release(0);
  });

  test('LST-10 corner smoothing: an amount above 0 (cupertino) reaches the row, its ripple and its focus ring as the OS curve; 0 adds nothing; square rows stay square', async () => {
    expect(tanrei.shape.cornerSmoothing).toBe(0);
    const view = await mountActions();
    await fireEvent(row(0), 'focus');
    for (const node of [row(0), part(0, 'focus-ring')!]) expect(viewStyle(node).borderCurve).toBeUndefined();
    await view.unmount();
    expect(cupertino.shape.cornerSmoothing).toBe(0.6);
    const rounded = withList({ containerShape: 12, focusedContainerShape: 12 }, cupertino);
    await mountActions(ACTIONS, { theme: 'light', system: rounded });
    await fireEvent(row(0), 'focus');
    for (const node of [row(0), part(0, 'focus-ring')!]) expect(viewStyle(node).borderCurve).toBe('continuous');
    expect(viewStyle(row(0)).borderRadius).toBe(12);
    expect(viewStyle(part(0, 'focus-ring')!).borderRadius).toBe(12);
  });

  test('LST-10 focus-style: glow (acme) draws the focus colors as ONE halo, hidden from assistive technology', async () => {
    expect(acme.behavior.focusStyle).toBe('glow');
    await mountActions(ACTIONS, { theme: 'light', system: acme });
    await fireEvent(row(0), 'focus');
    expect(viewStyle(part(0, 'focus-ring')!).boxShadow).toHaveLength(1);
    expect(part(0, 'focus-ring')!.props.accessible).toBe(false);
  });
});

describe('static items (LST-11)', () => {
  test('LST-11: a static item is a plain view — not focusable, no role of its own, no press handlers — drawn from the resting unselected tokens, and ignores disabled', async () => {
    await mount({ items: [{ headline: 'Inbox', leadingIcon: 'inbox', trailingText: '12', disabled: true }] });
    expect(row(0).props.accessible).toBeUndefined();
    expect(row(0).props.focusable).toBeUndefined();
    expect(row(0).props.onClick).toBeUndefined();
    expect(row(0).props.onResponderRelease).toBeUndefined();
    expect(row(0).props.accessibilityState).toBeUndefined();
    expectRowDrawnFrom(0, 'unselected', 'enabled');
    for (const target of ACTIVE) await enter(0, target);
    expectRowDrawnFrom(0, 'unselected', 'enabled');
    expect(part(0, 'focus-ring')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('LST-11: a control in a static item\'s trailing slot keeps its own semantics and focus stop; the row does not forward presses to it', async () => {
    const onValueChange = jest.fn();
    await mount({ items: [{ headline: 'Wi-Fi', trailing: <Switch testID="wifi-switch" accessibilityLabel="Wi-Fi" value onValueChange={onValueChange} /> }] });
    expect(screen.getByRole('switch', { name: 'Wi-Fi' })).toBe(screen.getByTestId('wifi-switch'));
    expect(part(0, 'trailing')!.props.accessible).toBeUndefined();
    await fireEvent.press(row(0));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('semantics and selection (LST-12, LST-13, LST-14, LST-26)', () => {
  test('LST-12: selection none — the list role; each item a list item; an interactive item ONE button inside it, named by its headline, with its position and the list\'s size', async () => {
    await mount({ items: [{ headline: 'Inbox' }, { headline: 'Wi-Fi', onPress: noop }] });
    expect(list().props.accessibilityRole).toBe('list');
    expect(item(0).props.role).toBe('listitem');
    expect(item(1).props.role).toBe('listitem');
    expect(screen.getByRole('button', { name: 'Wi-Fi' })).toBe(row(1));
    expect(row(1).props.accessibilityValue).toEqual({ text: '2 of 2' });
    expect(row(1).props.accessibilityState).toEqual({ disabled: false });
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  test('LST-12: selection single or multiple — the list named by its label, each item an option with its selected state and its position; onPress is ignored', async () => {
    const onPress = jest.fn();
    const onSelectionChange = jest.fn();
    await mount({ items: [{ headline: 'Light', value: 'light', onPress }, { headline: 'Dark', value: 'dark' }], selectionMode: 'multiple', values: ['dark'], onSelectionChange, accessibilityLabel: LABEL });
    expect(list().props).toMatchObject({ accessibilityRole: 'list', accessibilityLabel: LABEL });
    expect(item(0).props.role).toBeUndefined();
    expect(screen.getAllByRole('option').map((node) => [node.props.accessibilityLabel, node.props.accessibilityState, node.props.accessibilityValue])).toEqual([
      ['Light', { disabled: false, selected: false }, { text: '1 of 2' }],
      ['Dark', { disabled: false, selected: true }, { text: '2 of 2' }],
    ]);
    await fireEvent.press(row(0));
    expect(onPress).not.toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenCalledWith(['dark', 'light']);
  });

  test('LST-12: a product in another language names positions with positionText', async () => {
    await mount({ items: [{ headline: 'Wi-Fi', onPress: noop }], positionText: (position, count) => `${count} 件中 ${position} 件目` });
    expect(row(0).props.accessibilityValue).toEqual({ text: '1 件中 1 件目' });
  });

  test('LST-13: choosing an unselected option of a single-select list sets value to it (the other one unselects) and calls onSelectionChange once; choosing the selected one changes nothing', async () => {
    const onChange = jest.fn();
    await render(<Chooser mode="single" initial="light" onChange={onChange} />);
    await fireEvent.press(row(1));
    expect(onChange.mock.calls).toEqual([['dark']]);
    expect(screen.getAllByRole('option').map((node) => node.props.accessibilityState.selected)).toEqual([false, true, false]);
    await wait(HOLD + 30);
    await fireEvent.press(row(1));
    expect(onChange).toHaveBeenCalledTimes(1);
    expectRowDrawnFrom(1, 'selected', 'enabled');
    expectRowDrawnFrom(0, 'unselected', 'enabled');
  });

  test('LST-14: choosing an option of a multiple-select list adds its value, or removes it, and calls onSelectionChange once each time', async () => {
    const onChange = jest.fn();
    await render(<Chooser mode="multiple" initial={['light']} onChange={onChange} />);
    await fireEvent.press(row(2));
    await wait(HOLD + 30);
    await fireEvent.press(row(0));
    expect(onChange.mock.calls).toEqual([[['light', 'system']], [['system']]]);
    expect(screen.getAllByRole('option').map((node) => node.props.accessibilityState.selected)).toEqual([false, false, true]);
  });

  test('LST-26: an option is selected while value (single) equals, or values (multiple) holds, its value; every other one is unselected', async () => {
    const view = await mountOptions({ value: 'dark' });
    expect(screen.getAllByRole('option').map((node) => node.props.accessibilityState.selected)).toEqual([false, true, false]);
    expectRowDrawnFrom(1, 'selected', 'enabled');
    expectRowDrawnFrom(0, 'unselected', 'enabled');
    await view.unmount();
    await mountOptions({ selectionMode: 'multiple', value: undefined, values: ['light', 'system'] } as Partial<ListProps>);
    expect(screen.getAllByRole('option').map((node) => node.props.accessibilityState.selected)).toEqual([true, false, true]);
  });

  test('LST-26: a value naming no option selects nothing for it; an empty or repeated option value still renders; development builds report each, and release builds say nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const items: ListItem[] = [{ headline: 'Light', value: 'light' }, { headline: 'Dark', value: '' }, { headline: 'Also light', value: 'light' }];
    const view = await mount({ items, selectionMode: 'multiple', values: ['light', 'sepia'], accessibilityLabel: LABEL });
    expect(screen.getAllByRole('option').map((node) => node.props.accessibilityState.selected)).toEqual([true, false, true]);
    const messages = warn.mock.calls.map(([message]) => String(message));
    expect(messages).toEqual([expect.stringContaining('option 2 of a List (testID "list") has no value'), expect.stringContaining('option 3 of a List (testID "list") repeats the value "light"'), expect.stringContaining('selects "sepia", which no option has')]);
    await view.unmount();
    warn.mockClear();
    development(false);
    await mount({ items, selectionMode: 'single', value: 'sepia', accessibilityLabel: LABEL });
    expect(warn).not.toHaveBeenCalled();
    expect(screen.getAllByRole('option').map((node) => node.props.accessibilityState.selected)).toEqual([false, false, false]);
  });
});

describe('keyboard (LST-15)', () => {
  test('LST-15: one tab stop — the first selected option, else the first enabled item; static items never take focus', async () => {
    const view = await mountOptions({ value: 'dark' });
    expect(screen.getAllByRole('option').map((node) => node.props.focusable)).toEqual([false, true, false]);
    await view.unmount();
    const unselected = await mountOptions({ value: null });
    expect(screen.getAllByRole('option').map((node) => node.props.focusable)).toEqual([true, false, false]);
    await unselected.unmount();
    await mount({ items: [{ headline: 'Inbox' }, { headline: 'Archive', onPress: noop, disabled: true }, { headline: 'Trash', onPress: noop }] });
    expect(row(0).props.focusable).toBeUndefined();
    expect([row(1).props.focusable, row(2).props.focusable]).toEqual([false, true]);
  });

  test('LST-15: Down and Up Arrow move focus to the next and previous item WITHOUT wrapping; Home and End to the first and last; the selection does not change', async () => {
    const focus = focusSpy();
    const onChange = jest.fn();
    await render(<Chooser mode="single" initial="light" onChange={onChange} />);
    await fireEvent(row(0), 'focus');
    await key('ArrowUp');
    expect(focusedRow(focus)).toBe(`${ID}.item.0.row`);
    await key('ArrowDown');
    expect(focusedRow(focus)).toBe(`${ID}.item.1.row`);
    await fireEvent(row(1), 'focus');
    await key('ArrowDown');
    expect(focusedRow(focus)).toBe(`${ID}.item.2.row`);
    await fireEvent(row(2), 'focus');
    await key('ArrowDown');
    expect(focusedRow(focus)).toBe(`${ID}.item.2.row`);
    await key('Home');
    expect(focusedRow(focus)).toBe(`${ID}.item.0.row`);
    await key('End');
    expect(focusedRow(focus)).toBe(`${ID}.item.2.row`);
    expect(onChange).not.toHaveBeenCalled();
    // The row focused last is the tab stop now.
    expect(screen.getAllByRole('option').map((node) => node.props.focusable)).toEqual([false, false, true]);
  });

  test('LST-15: printable characters typed within one second move focus to the next item whose headline begins with them; a pause starts a new search', async () => {
    const focus = focusSpy();
    let now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    await mount({ items: [{ headline: 'Drafts', onPress: noop }, { headline: 'Inbox', onPress: noop }, { headline: 'Important', onPress: noop }, { headline: 'Sent', onPress: noop }] });
    await fireEvent(row(0), 'focus');
    await key('i');
    expect(focusedRow(focus)).toBe(`${ID}.item.1.row`);
    await fireEvent(row(1), 'focus');
    now += 300;
    await key('m');
    expect(focusedRow(focus)).toBe(`${ID}.item.2.row`);
    await fireEvent(row(2), 'focus');
    now += TYPEAHEAD_WINDOW + 1;
    await key('s');
    expect(focusedRow(focus)).toBe(`${ID}.item.3.row`);
    focus.mockClear();
    now += TYPEAHEAD_WINDOW + 1;
    await key('x');
    await key(' ');
    await key('Tab');
    expect(focus).not.toHaveBeenCalled();
  });

  test('LST-15: Space and Enter activate the focused item as its own click (the Pressable\'s), and the caller\'s own onKeyDown is still called', async () => {
    const onKeyDown = jest.fn();
    const onPress = jest.fn();
    await mount({ items: [{ headline: 'Wi-Fi', onPress }], ...({ onKeyDown } as object) });
    await key('Enter');
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    await click(0);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('layout (LST-16, LST-17, LST-18, LST-20, LST-21, LST-22)', () => {
  test('LST-16: one row — logical start and end paddings, the gap, and in order the leading element, the text column, the trailing text, the trailing icon, the trailing control and the mark', async () => {
    await mount({ items: [{ headline: 'Ada', leadingIcon: 'person', trailingText: '9:41', trailingIcon: 'chevron_right', value: 'ada' }], selectionMode: 'single', value: 'ada', accessibilityLabel: 'People' });
    expect(viewStyle(row(0))).toMatchObject({ flexDirection: 'row', paddingStart: tokens.containerPaddingInlineStart, paddingEnd: tokens.containerPaddingInlineEnd, paddingVertical: tokens.containerPaddingBlock, gap: tokens.containerGap });
    for (const key_ of ['paddingLeft', 'paddingRight', 'paddingHorizontal']) expect(viewStyle(row(0))[key_ as 'paddingLeft']).toBeUndefined();
    const order = ['leading-icon', 'text', 'trailing-text', 'trailing-icon', 'mark'].map((name) => row(0).children.indexOf(part(0, name)!));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(viewStyle(part(0, 'text')!).flex).toBe(1);
  });

  test('LST-16: in a right-to-left layout the row mirrors by its logical paddings and the divider\'s logical start; a ripple grows from the point of contact', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    reduceMotion(false);
    try {
      jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, 360, 56, 0, 0));
      await mount({ items: [{ headline: 'Wi-Fi', leadingIcon: 'wifi', onPress: noop, divider: true }] }, { theme: 'light', system: m3Like });
      expect(viewStyle(row(0))).toMatchObject({ paddingStart: m3Like.components.list.containerPaddingInlineStart, paddingEnd: m3Like.components.list.containerPaddingInlineEnd, flexDirection: 'row' });
      expect(viewStyle(row(0)).direction).toBeUndefined();
      expect(viewStyle(part(0, 'divider')!).start).toBeDefined();
      expect(viewStyle(part(0, 'divider')!).left).toBeUndefined();
      await fireEvent(row(0), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 56 } } });
      await fireEvent(row(0), 'pressIn', { nativeEvent: { pageX: 300, pageY: 20 } });
      const reach = Math.hypot(300, 56 - 20);
      expect(viewStyle(part(0, 'ripple.wave')!)).toMatchObject({ left: 300 - reach, top: 20 - reach });
      await release(0);
      await wait(m3Like.components.list.motionStateDuration * 2 + 50);
    } finally {
      rtl.restore();
    }
  });

  test('LST-17: the minimum height follows the lines — one-line, two-line (an overline, or one line of supporting text), three-line (two or more) — and is a minimum, never a height', async () => {
    const heights = async (items: ListItem[]) => {
      const view = await mount({ items });
      const out = items.map((_each, i) => viewStyle(row(i)).minHeight);
      for (const [i] of items.entries()) expect(viewStyle(row(i)).height).toBeUndefined();
      await view.unmount();
      return out;
    };
    expect(await heights([{ headline: 'Inbox' }, { headline: 'Inbox', overline: 'Mail' }, { headline: 'Inbox', supportingText: 'All mail' }, { headline: 'Inbox', overline: 'Mail', supportingText: 'All mail' }])).toEqual([
      tokens.containerHeightOneLine,
      tokens.containerHeightTwoLine,
      tokens.containerHeightTwoLine,
      tokens.containerHeightThreeLine,
    ]);
    // Supporting text laid out on two lines makes a three-line item.
    await mount({ items: [{ headline: 'Roadmap', supportingText: 'The plan for the next quarter, with milestones and owners.' }] });
    await fireEvent(part(0, 'supporting-text')!, 'textLayout', { nativeEvent: { lines: [{ y: 0, height: 20 }, { y: 20, height: 20 }] } });
    expect(viewStyle(row(0)).minHeight).toBe(tokens.containerHeightThreeLine);
  });

  test('LST-17: leading and trailing elements are centered on the text column in a one- or two-line item and aligned with its top in a taller one', async () => {
    await mount({ items: [{ headline: 'Inbox', supportingText: 'All mail' }, { headline: 'Roadmap', overline: 'Engineering', supportingText: 'The plan' }] });
    expect(viewStyle(row(0)).alignItems).toBe('center');
    expect(viewStyle(row(1)).alignItems).toBe('flex-start');
  });

  test('LST-18: each text in its type style; the headline, overline and trailing text wrap; supportingNumberOfLines cuts the supporting text, whose full text is still the description', async () => {
    const long = 'Spending so far this year against the plan, by team, with the forecast for the rest of it.';
    await mount({ items: [{ headline: 'Budget', overline: 'Finance', supportingText: long, supportingNumberOfLines: 2, trailingText: 'Yesterday', onPress: noop }] });
    const typescale = (name: string, role: string) => {
      const style = (tanrei.typescale as unknown as Record<string, { size: number; lineHeight: number }>)[role]!;
      expect(textStyle(part(0, name)!)).toMatchObject({ fontSize: style.size, lineHeight: style.lineHeight });
    };
    typescale('headline', tokens.headlineTypescale);
    typescale('overline', tokens.overlineTypescale);
    typescale('supporting-text', tokens.supportingTextTypescale);
    typescale('trailing-text', tokens.trailingTextTypescale);
    for (const name of ['headline', 'overline', 'trailing-text']) expect(part(0, name)!.props.numberOfLines).toBeUndefined();
    expect(part(0, 'supporting-text')!.props.numberOfLines).toBe(2);
    for (const name of ['headline', 'overline', 'supporting-text', 'trailing-text']) expect(part(0, name)!.props.allowFontScaling).toBe(true);
    expect(row(0).props.accessibilityHint).toBe(`Finance, ${long}, Yesterday`);
  });

  test('LST-19: icons at their sizes in the glyph style of the item\'s condition (acme: a family per selection state); an empty name draws nothing and leaves no space', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ items: [{ headline: 'Light', value: 'light', leadingIcon: 'light_mode', trailingIcon: 'info' }, { headline: 'Dark', value: 'dark', leadingIcon: '' }], selectionMode: 'single', value: 'light', accessibilityLabel: LABEL }, { theme: 'light', system: acme });
    const list3 = acme.components.list;
    expect(viewStyle(part(0, 'leading-icon')!)).toMatchObject({ width: list3.leadingIconSize, height: list3.leadingIconSize });
    expect(viewStyle(part(0, 'trailing-icon')!)).toMatchObject({ width: list3.trailingIconSize, height: list3.trailingIconSize });
    expect(textStyle(part(0, 'leading-icon.glyph')!).fontFamily).toBe(iconFamily(acme.icon, true).families[0]);
    expect(iconFamily(acme.icon, true).families[0]).not.toBe(iconFamily(acme.icon, false).families[0]);
    expect(part(1, 'leading-icon')).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  test('LST-20: avatar and image fit the leading slot\'s content into their boxes, filled behind it and handing it the media content color; leadingIcon is not drawn; none draws no slot', async () => {
    const seen: (string | undefined)[] = [];
    function Probe() {
      seen.push(useContentColor());
      return null;
    }
    await mount({
      items: [
        { headline: 'Ada', leadingMedia: 'avatar', leading: 'A', leadingIcon: 'person' },
        { headline: 'Roadmap', leadingMedia: 'image', leading: <Probe /> },
        { headline: 'Inbox', leading: <Probe /> },
      ],
    });
    expect(viewStyle(part(0, 'avatar')!)).toMatchObject({ width: tokens.avatarSize, height: tokens.avatarSize, borderRadius: tokens.avatarShape, overflow: 'hidden', backgroundColor: painted(tokens.mediaContainerColor) });
    expect(viewStyle(part(1, 'image')!)).toMatchObject({ width: tokens.imageSize, height: tokens.imageSize, borderRadius: tokens.imageShape, overflow: 'hidden', backgroundColor: painted(tokens.mediaContainerColor) });
    // A monogram is set in the headline's type style, centred.
    const headline = (tanrei.typescale as unknown as Record<string, { size: number; lineHeight: number }>)[tokens.headlineTypescale]!;
    expect(textStyle(part(0, 'avatar.monogram')!)).toMatchObject({ color: painted(tokens.mediaContentColor), textAlign: 'center', fontSize: headline.size, lineHeight: headline.lineHeight });
    expect(viewStyle(part(0, 'avatar')!)).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
    expect(part(0, 'leading-icon')).toBeNull();
    expect(seen).toEqual([painted(tokens.mediaContentColor)]);
    expect(part(2, 'avatar')).toBeNull();
    expect(part(2, 'image')).toBeNull();
    expect(part(0, 'avatar')!.props.accessibilityElementsHidden).toBe(true);
  });

  test('LST-21: every option reserves a box of the mark size at its end; a selected one strokes a check in it at the mark width in its mark color', async () => {
    await mountOptions({ value: 'dark' });
    for (const i of [0, 1, 2]) expect(viewStyle(part(i, 'mark')!)).toMatchObject({ width: tokens.markSize, height: tokens.markSize });
    expect(part(0, 'check')).toBeNull();
    expect(checkLegs(1)).toHaveLength(2);
    for (const leg of checkLegs(1)) expect(viewStyle(leg)).toMatchObject({ height: tokens.markWidth, backgroundColor: painted(tokens.conditions.selected.enabled.markColor) });
    expect(part(1, 'mark')!.props.accessibilityElementsHidden).toBe(true);
  });

  test('LST-21: choosing an option draws its check along its path and moves its colors over the state motion; where motion is reduced it happens at once', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await render(<Chooser mode="single" initial="light" />);
    await wait(10);
    timing.mockClear();
    interpolate.mockClear();
    await fireEvent.press(row(1));
    expect(timing.mock.calls.filter(([, config]) => config.duration === tokens.motionStateDuration && config.useNativeDriver === false).length).toBeGreaterThanOrEqual(2);
    expect(interpolate.mock.calls.map(([config]) => config.outputRange)).toContainEqual([painted(tokens.conditions.unselected.enabled.headlineColor), painted(tokens.conditions.selected.enabled.headlineColor)]);
    await wait(HOLD + tokens.motionStateDuration * 2 + 50);
    expect(checkLegs(1)).toHaveLength(2);
    expect(part(0, 'check')).toBeNull();
    await screen.unmount();

    reduceMotion(true);
    timing.mockClear();
    await render(<Chooser mode="single" initial="light" />);
    await fireEvent.press(row(2));
    expect(timing).not.toHaveBeenCalled();
    expect(checkLegs(2)).toHaveLength(2);
  });

  test('LST-22: the divider lies along the bottom edge, inside the item\'s height, from the start of the text column to the row\'s end, in the divider color; it keeps its color in every state and is hidden', async () => {
    await mount({ items: [{ headline: 'Inbox', leadingIcon: 'inbox', onPress: noop, divider: true }, { headline: 'Sent', divider: true }, { headline: 'Drafts' }] });
    const line = (i: number) => viewStyle(part(i, 'divider')!);
    const expected = { position: 'absolute', bottom: 0, end: 0, height: tokens.dividerThickness, backgroundColor: painted(tokens.dividerColor), pointerEvents: 'none' };
    expect(line(0)).toMatchObject({ ...expected, start: tokens.containerPaddingInlineStart + tokens.leadingIconSize + tokens.containerGap });
    expect(line(1)).toMatchObject({ ...expected, start: tokens.containerPaddingInlineStart });
    expect(part(2, 'divider')).toBeNull();
    // Beside the row, not in it: no state, condition or dimming reaches it.
    expect(item(0).children).toContain(part(0, 'divider'));
    expect(row(0).children).not.toContain(part(0, 'divider'));
    await fireEvent(row(0), 'pressIn');
    expect(line(0).backgroundColor).toBe(painted(tokens.dividerColor));
    expect(part(0, 'divider')!.props.accessibilityElementsHidden).toBe(true);
    await release(0);
  });

  test('LST-22: a disabled item\'s opacity and a dim press (cupertino) do not reach the divider: it keeps its full opacity', async () => {
    const view = await mount({ items: [{ headline: 'Archive', onPress: noop, disabled: true, divider: true }, { headline: 'Trash', onPress: noop }] });
    expect(viewStyle(row(0)).opacity).toBe(tokens.disabledOpacity);
    expect(viewStyle(part(0, 'divider')!).opacity).toBeUndefined();
    expect(viewStyle(item(0)).opacity).toBeUndefined();
    expect(viewStyle(part(0, 'divider')!).backgroundColor).toBe(painted(tokens.dividerColor));
    await view.unmount();
    await mount({ items: [{ headline: 'Archive', onPress: noop, divider: true }] }, { theme: 'light', system: cupertino });
    await fireEvent(row(0), 'pressIn');
    expect(viewStyle(row(0)).opacity).toBe(cupertino.components.list.pressedOpacity);
    expect(viewStyle(part(0, 'divider')!).opacity).toBeUndefined();
    expect(viewStyle(item(0)).opacity).toBeUndefined();
    await release(0);
  });

  test('the list never scrolls or virtualizes: every item is rendered in a plain column, no ScrollView or FlatList', async () => {
    const items = Array.from({ length: 60 }, (_each, i): ListItem => ({ headline: `Item ${i + 1}` }));
    const view = await mount({ items });
    expect(list().type).toBe('View');
    expect(list().children).toHaveLength(60);
    expect(JSON.stringify(view.toJSON())).not.toMatch(/ScrollView/);
  });
});

describe('accessibility (LST-23, LST-24)', () => {
  test('LST-23: an interactive item or an option is named by its headline and described by its overline, supporting text and trailing text, in reading order; icons and the mark are hidden', async () => {
    await mount({ items: [{ headline: 'Roadmap', overline: 'Engineering', supportingText: 'The plan', trailingText: '9:41', leadingIcon: 'map', trailingIcon: 'chevron_right', onPress: noop }] });
    expect(screen.getByRole('button', { name: 'Roadmap' }).props.accessibilityHint).toBe('Engineering, The plan, 9:41');
    for (const name of ['leading-icon', 'trailing-icon']) expect(part(0, name)!.props.accessibilityElementsHidden).toBe(true);
  });

  test('LST-23: media the product names stays readable; otherwise it is hidden', async () => {
    await mount({ items: [{ headline: 'Ada', leadingMedia: 'avatar', leading: <View accessibilityLabel="Photo of Ada" /> }] });
    expect(part(0, 'avatar')!.props.accessibilityElementsHidden).toBeUndefined();
  });

  test('LST-23: an item without a headline still renders, and development builds report it; a listbox without a label is reported; release builds say nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ items: [{ headline: '', value: 'a' }, { headline: 'B', value: 'b' }], selectionMode: 'single', value: 'a' } as ListProps);
    expect(row(0)).toBeTruthy();
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('item 1 of a List (testID "list") has no headline'), expect.stringContaining('a selectable List (testID "list") has no accessibilityLabel')]);
    await view.unmount();
    warn.mockClear();
    development(false);
    await mount({ items: [{ headline: '' }] });
    expect(warn).not.toHaveBeenCalled();
  });

  test('LST-24: an interactive item is ONE accessible element — nothing inside it is accessible or focusable of its own — and the README states the rule React Native cannot check', async () => {
    await mount({ items: [{ headline: 'Roadmap', supportingText: 'The plan', leadingIcon: 'map', onPress: noop }] });
    type Node = { props: Record<string, unknown>; children: readonly (Node | string)[] };
    const exposed: Node[] = [];
    const walk = (node: Node | string) => {
      if (typeof node === 'string') return;
      if (node.props.accessible === true || node.props.focusable === true) exposed.push(node);
      node.children.forEach(walk);
    };
    walk(row(0) as unknown as Node);
    expect(exposed).toEqual([row(0)]);
    const readme = fs.readFileSync(path.resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain('Never put an interactive element — a button, a link, a field, a switch — inside an interactive list item or an option');
  });
});

describe('motion (LST-25)', () => {
  test('LST-25: state changes animate with comp.list.motion.state-*, the press is immediate', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    await mountActions();
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
    expect(viewStyle(row(0)).backgroundColor).toBe(fill(tokens.conditions.unselected.pressed.containerColor));
    await release(0);
    expect(timing).toHaveBeenCalledTimes(1);
    await wait(tokens.motionStateDuration * 2);
  });

  test('LST-25: where motion is reduced every change lands at once', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mountActions();
    await fireEvent(row(0), 'hoverIn');
    expect(timing).not.toHaveBeenCalled();
    expectRowDrawnFrom(0, 'unselected', 'hovered');
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  describe.each(schemes)('$scheme', ({ provider, scheme }) => {
    test.each(CONDITIONS)('%s resolves every part from its paints in this scheme, at rest and hovered', async (condition) => {
      await mountOptions({ value: condition === 'selected' ? 'light' : 'dark' }, provider);
      expectRowDrawnFrom(0, condition, 'enabled', tanrei, scheme);
      await fireEvent(row(0), 'hoverIn');
      expectRowDrawnFrom(0, condition, 'hovered', tanrei, scheme);
    });
  });

  test('the default values: rows 48 / 64 / 80, paddings 16 / 16 / 8, gap 12, square corners, headline body; a selected option on secondary-container with a primary check; no fill and no check unselected', () => {
    expect([tokens.containerHeightOneLine, tokens.containerHeightTwoLine, tokens.containerHeightThreeLine]).toEqual([48, 64, 80]);
    expect(tokens.containerPaddingInlineStart).toBe(tanrei.space.space200);
    expect(tokens.containerPaddingInlineEnd).toBe(tanrei.space.space200);
    expect(tokens.containerPaddingBlock).toBe(tanrei.space.space100);
    expect(tokens.containerGap).toBe(tanrei.space.space150);
    expect(tokens.containerShape).toBe(0);
    expect(tokens.headlineTypescale).toBe('body');
    expect(painted(tokens.conditions.selected.enabled.containerColor)).toBe(role('secondaryContainer'));
    expect(painted(tokens.conditions.selected.enabled.markColor)).toBe(role('primary'));
    expect(evaluatePaint(tokens.conditions.unselected.enabled.containerColor, tanrei.colors.light).a).toBe(0);
    expect(evaluatePaint(tokens.conditions.unselected.enabled.markColor, tanrei.colors.light).a).toBe(0);
  });
});

describe('the system drives rendering', () => {
  test('heights, paddings, gap, sizes and shapes re-valued by a layer reach the row, the media, the mark and the divider', async () => {
    const system = withList({ containerHeightOneLine: 60, containerPaddingInlineStart: 20, containerPaddingInlineEnd: 28, containerGap: 10, avatarSize: 36, markSize: 24, dividerThickness: 2, containerShape: 4 });
    await mount({ items: [{ headline: 'Ada', leadingMedia: 'avatar', value: 'ada', divider: true }], selectionMode: 'single', value: 'ada', accessibilityLabel: 'People' }, { theme: 'light', system });
    expect(viewStyle(row(0))).toMatchObject({ minHeight: 60, paddingStart: 20, paddingEnd: 28, gap: 10, borderRadius: 4 });
    expect(viewStyle(part(0, 'avatar')!)).toMatchObject({ width: 36, height: 36 });
    expect(viewStyle(part(0, 'mark')!)).toMatchObject({ width: 24, height: 24 });
    expect(viewStyle(part(0, 'divider')!)).toMatchObject({ height: 2, start: 20 + 36 + 10 });
  });

  test('a selected fill and a disabled opacity re-valued by a layer are drawn', async () => {
    const system = withCondition('selected', { enabled: { containerColor: literal(7, 8, 9) } }, withList({ disabledOpacity: 0.5 }));
    await mountOptions({ items: [{ headline: 'Light', value: 'light' }, { headline: 'Dark', value: 'dark', disabled: true }] }, { theme: 'light', system });
    expect(viewStyle(row(0)).backgroundColor).toBe('rgb(7, 8, 9)');
    expect(viewStyle(row(1)).opacity).toBe(0.5);
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(listSubject);

  test('every selectable fixture names its list (label), so none of them reports LST-23', () => {
    for (const fixture of spec.fixtures) if (fixture.props.selection && fixture.props.selection !== 'none') expect(fixture.props.label).toBeTruthy();
  });
});
