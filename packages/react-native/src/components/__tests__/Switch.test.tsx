// Switch — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/switch.spec.json; every behaviour id is cited by the test that covers it.
import { createRef, useState, type ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCoreSwitchCondition, TanreiPaint, TanreiScheme, TanreiSwitchConditionStateTokens, TanreiSwitchConditions, TanreiSwitchTokens, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { byTestID, describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetIconReport } from '../../theme/icon';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { createTanreiTheme, TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { toFontWeight } from '../../theme/typography';
import { Switch, type SwitchProps, type SwitchRef } from '../Switch';
import { acme } from './__fixtures__/acme';
import { switchSubject } from './Switch.subject';

const spec = loadSpec('switch');
const { measure, state } = tanrei;
const colors: TanreiSystem['colors'] = tanrei.colors;
const tokens: TanreiSwitchTokens = tanrei.components.switch;
const ID = 'switch';
const LABEL = 'Wi-Fi';

const { host, part } = byTestID(ID);

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));

const withSwitch = (overrides: Partial<TanreiSwitchTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'switch', overrides);
const withCondition = (condition: TanreiCoreSwitchCondition, overrides: { [State in InteractionState]?: Partial<TanreiSwitchConditionStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.switch.conditions[condition];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withSwitch({ conditions: { ...base.components.switch.conditions, [condition]: { ...current, ...changed } } as TanreiSwitchConditions }, base);
};

function element(props: Partial<SwitchProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }): ReactElement {
  return (
    <TanreiProvider {...provider}>
      <Switch testID={ID} label={LABEL} {...props} />
    </TanreiProvider>
  );
}
const mount = (props: Partial<SwitchProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) => render(element(props, provider));

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

const CONDITIONS: TanreiCoreSwitchCondition[] = ['unselected', 'selected'];
const propsOf = (condition: TanreiCoreSwitchCondition): Partial<SwitchProps> => ({ value: condition === 'selected' });
const shapeOf = (from: TanreiSwitchTokens, in_: InteractionState) =>
  ({
    enabled: { opacity: 1, shape: from.containerShape },
    hovered: { opacity: from.hoveredOpacity, shape: from.hoveredContainerShape },
    focused: { opacity: from.focusedOpacity, shape: from.focusedContainerShape },
    pressed: { opacity: from.pressedOpacity, shape: from.pressedContainerShape },
    disabled: { opacity: from.disabledOpacity, shape: from.disabledContainerShape },
  })[in_];
/** SWT-10: where the handle's center is, from the track's inline start — written out independently of the component. */
const centerOf = (from: TanreiSwitchTokens, on: boolean) => (on ? from.trackWidth - from.trackHeight / 2 : from.trackHeight / 2);

const click = () => fireEvent(host(), 'press', { nativeEvent: { target: 1 } });
const HOLD = tanrei.motion.duration.pressHold;
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
async function release() {
  await fireEvent(host(), 'pressOut');
  await wait(HOLD + 30);
}
async function enter(target: InteractionState) {
  if (target === 'hovered') await fireEvent(host(), 'hoverIn');
  if (target === 'focused') await fireEvent(host(), 'focus');
  if (target === 'pressed') await fireEvent(host(), 'pressIn');
}

/** Everything SWT-3 / SWT-6 name — container, track, outline, handle (color, size, elevation), icon, label and opacity — from one state's tokens of one condition. */
function expectDrawnFrom(condition: TanreiCoreSwitchCondition, in_: InteractionState, from: TanreiSwitchTokens = tokens, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) {
  const t = from.conditions[condition][in_];
  const { opacity, shape } = shapeOf(from, in_);
  expect(viewStyle(host()).opacity).toBe(opacity);
  expect(viewStyle(part('container')!)).toMatchObject({ backgroundColor: fill(t.containerColor, scheme, system), borderRadius: shape });
  const track = fill(t.trackColor, scheme, system);
  if (track === undefined) expect(part('track.fill')).toBeNull();
  else expect(viewStyle(part('track.fill')!).backgroundColor).toBe(track);
  const outline = fill(t.outlineColor, scheme, system);
  if (outline === undefined) expect(part('outline')).toBeNull();
  else expect(viewStyle(part('outline')!).borderColor).toBe(outline);
  const size = part('icon') ? Math.max(t.handleSize, from.handleSizeWithIcon) : t.handleSize;
  const handle = viewStyle(part('handle')!);
  expect(handle).toMatchObject({ width: size, height: size, borderRadius: size / 2, backgroundColor: fill(t.handleColor, scheme, system) });
  expect(handle.boxShadow).toEqual(createTanreiTheme(system, scheme).elevation(t.handleElevation).boxShadow.length ? createTanreiTheme(system, scheme).elevation(t.handleElevation).boxShadow : undefined);
  if (part('glyph')) expect(textStyle(part('glyph')!).color).toBe(painted(t.iconColor, scheme, system));
  if (part('label')) expect(textStyle(part('label')!).color).toBe(painted(t.labelColor, scheme, system));
}

beforeEach(() => {
  reduceMotion(true);
  resetLookupReports();
  resetIconReport();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Switch.name);
    expect(platform.props).toEqual({ selected: 'value', disabled: 'disabled', label: 'label', labelHidden: 'labelHidden', selectedIcon: 'selectedIcon', unselectedIcon: 'unselectedIcon' });
    expect(platform.events).toEqual({ change: 'onValueChange' });
  });

  test('the conditions under test are the token axis\'s core values', () => {
    expect(Object.keys(tokens.conditions)).toEqual(CONDITIONS);
  });

  test('defaults follow the spec: off, enabled, label drawn, no icon', async () => {
    await mount();
    expectDrawnFrom('unselected', 'enabled');
    expect(host().props.accessibilityState).toEqual({ disabled: false, checked: false });
    expect(part('icon')).toBeNull();
    expect(part('label')!.props.children).toBe(LABEL);
  });
});

describe('activation (SWT-1, SWT-2)', () => {
  test('SWT-1: touch, a bare click (Space, Enter where the platform activates with it, assistive technology) and a press on the label each call onValueChange once with the new value', async () => {
    const onValueChange = jest.fn();
    await mount({ onValueChange });
    await fireEvent.press(host());
    await wait(HOLD + 30);
    await click();
    await wait(HOLD + 30);
    await fireEvent.press(part('label')!);
    expect(onValueChange.mock.calls).toEqual([[true], [true], [true]]);
    expect(host().props.accessible).toBe(true);
    expect(host().props.focusable).toBe(true);
  });

  test('SWT-1: an on switch asks for false; controlled, it round-trips through the app state; onPress comes first', async () => {
    const calls: string[] = [];
    function App() {
      const [on, setOn] = useState(true);
      return (
        <TanreiProvider theme="light">
          <Switch testID={ID} label={LABEL} value={on} onPress={() => calls.push('press')} onValueChange={(next) => (calls.push(`change:${next}`), setOn(next))} />
        </TanreiProvider>
      );
    }
    await render(<App />);
    await fireEvent.press(host());
    expect(calls).toEqual(['press', 'change:false']);
    expect(host().props.accessibilityState.checked).toBe(false);
  });

  test('SWT-2: a disabled switch does not change or call onValueChange — touch, click or label — is not focusable and exposes disabled', async () => {
    const onValueChange = jest.fn();
    await mount({ disabled: true, onValueChange });
    await fireEvent.press(host());
    await click();
    await fireEvent.press(part('label')!);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(host().props.focusable).toBe(false);
    expect(host()).toBeDisabled();
    expect(screen.getByRole('switch', { name: LABEL, disabled: true })).toBe(host());
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'hoverIn');
    expect(part('focus-ring')).toBeNull();
    expectDrawnFrom('unselected', 'disabled');
  });
});

describe('states (SWT-3, SWT-6)', () => {
  test('SWT-3: hover, keyboard focus and press each draw the switch from that state\'s tokens, and it returns', async () => {
    await mount({ value: true });
    expectDrawnFrom('selected', 'enabled');
    for (const target of ['hovered', 'focused', 'pressed'] as const) {
      await enter(target);
      expectDrawnFrom('selected', target);
      if (target === 'hovered') await fireEvent(host(), 'hoverOut');
      if (target === 'focused') await fireEvent(host(), 'blur');
      if (target === 'pressed') await release();
      expectDrawnFrom('selected', 'enabled');
    }
  });

  describe.each(CONDITIONS)('SWT-3: %s', (condition) => {
    test.each(['hovered', 'focused', 'pressed'] as const)('%s: container, track, outline, handle, icon, label and opacity come from its tokens', async (target) => {
      await mount({ ...propsOf(condition), selectedIcon: 'check', unselectedIcon: 'close' });
      await enter(target);
      expectDrawnFrom(condition, target);
    });
  });

  test('SWT-3: a state\'s handle size and elevation reach the handle (m3-like grows it under a press)', async () => {
    const system = withCondition('selected', { pressed: { handleSize: 18, handleElevation: 'level2' } });
    await mount({ value: true }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(part('handle')!)).toMatchObject({ width: 18, height: 18, borderRadius: 9, boxShadow: createTanreiTheme(system, 'light').elevation('level2').boxShadow });
    await release();
    expect(viewStyle(part('handle')!).width).toBe(tokens.conditions.selected.enabled.handleSize);
  });

  test('SWT-3: precedence is pressed over focused over hovered, under the acme fixture system (which values each differently)', async () => {
    const selected = acme.components.switch.conditions.selected;
    const expected = (name: InteractionState) => fill(selected[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    await mount({ value: true }, { theme: 'light', system: acme });
    const layer = () => viewStyle(part('container')!).backgroundColor;
    await fireEvent(host(), 'hoverIn');
    expect(layer()).toBe(expected('hovered'));
    await fireEvent(host(), 'focus');
    expect(layer()).toBe(expected('focused'));
    await fireEvent(host(), 'pressIn');
    expect(layer()).toBe(expected('pressed'));
    await release();
    expect(layer()).toBe(expected('focused'));
    await fireEvent(host(), 'blur');
    expect(layer()).toBe(expected('hovered'));
    await fireEvent(host(), 'hoverOut');
    expect(layer()).toBe(expected('enabled'));
  });

  test('SWT-3: in the default system the state layer is the condition\'s state-layer color (its outline color) at the state-layer opacity; the track and handle keep their resting colors', async () => {
    for (const condition of CONDITIONS) {
      const view = await mount(propsOf(condition));
      const resting = tokens.conditions[condition].enabled;
      expect(painted(resting.stateLayerColor)).toBe(painted(resting.outlineColor));
      const mix = (amount: number): TanreiPaint => ({ kind: 'mix', base: resting.containerColor, with: resting.stateLayerColor, amount });
      await fireEvent(host(), 'hoverIn');
      expect(viewStyle(part('container')!).backgroundColor).toBe(painted(mix(state.hoverStateLayerOpacity)));
      await fireEvent(host(), 'focus');
      expect(viewStyle(part('container')!).backgroundColor).toBe(painted(mix(state.focusStateLayerOpacity)));
      await fireEvent(host(), 'pressIn');
      expect(viewStyle(part('container')!).backgroundColor).toBe(painted(mix(state.pressedStateLayerOpacity)));
      expect(viewStyle(part('track.fill')!).backgroundColor).toBe(painted(resting.trackColor));
      expect(viewStyle(part('handle')!).backgroundColor).toBe(painted(resting.handleColor));
      await view.unmount();
    }
  });

  test('SWT-3: focus gained by touch or pointer does not select the focused state', async () => {
    const system = withCondition('unselected', { focused: { containerColor: literal(2, 0, 0) } });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await release();
    expectDrawnFrom('unselected', 'enabled', system.components.switch, 'light', system);
  });

  test('SWT-3: state changes animate the state layer with the state motion tokens; a press is immediate', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ value: true });
    await fireEvent(host(), 'hoverIn');
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: tokens.motionStateDuration, useNativeDriver: false });
    await wait(tokens.motionStateDuration * 2);
    timing.mockClear();
    await fireEvent(host(), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  describe.each(CONDITIONS)('SWT-6: disabled %s', (condition) => {
    test('renders container, track, outline, handle, icon, label and opacity from its disabled tokens', async () => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount({ ...propsOf(condition), disabled: true, selectedIcon: 'check', unselectedIcon: 'close' });
      expectDrawnFrom(condition, 'disabled');
    });
  });

  test('SWT-6: in the default system a disabled switch keeps its round layer clear, fades track and outline together to on-surface 12 %, and keeps handle and glyph apart', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const faint = formatColor({ ...colors.light.onSurface, a: state.disabledContainerOpacity });
    const faded = formatColor({ ...colors.light.onSurface, a: state.disabledContentOpacity });
    const surface = formatColor(colors.light.surface);
    for (const condition of CONDITIONS) {
      const view = await mount({ ...propsOf(condition), disabled: true, selectedIcon: 'check', unselectedIcon: 'close' });
      expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
      expect(viewStyle(part('track.fill')!).backgroundColor).toBe(faint);
      expect(viewStyle(part('outline')!).borderColor).toBe(faint);
      expect(textStyle(part('label')!).color).toBe(faded);
      // Off: a faded handle with a surface glyph; on: a surface handle with a faded glyph.
      expect(viewStyle(part('handle')!).backgroundColor).toBe(condition === 'selected' ? surface : faded);
      expect(textStyle(part('glyph')!).color).toBe(condition === 'selected' ? faded : surface);
      await view.unmount();
    }
  });
});

describe('press hold', () => {
  test('SWT-7: the pressed state appears in the same frame and stays visible for duration.pressHold although the press ended sooner', async () => {
    await mount();
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('unselected', 'pressed');
    await fireEvent(host(), 'pressOut');
    await wait(HOLD / 2);
    expectDrawnFrom('unselected', 'pressed');
    await wait(HOLD / 2 + 30);
    expectDrawnFrom('unselected', 'enabled');
  });

  test('SWT-7: Space / Enter / assistive activation — a bare click — shows the pressed state for the hold, in the NEW condition', async () => {
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <TanreiProvider theme="light">
          <Switch testID={ID} label={LABEL} value={on} onValueChange={setOn} />
        </TanreiProvider>
      );
    }
    await render(<Controlled />);
    await click();
    expectDrawnFrom('selected', 'pressed');
    await wait(HOLD + 30);
    expectDrawnFrom('selected', 'enabled');
  });
});

describe('choices of kind: system.behavior (SWT-8, SWT-9)', () => {
  const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
  const containerOnPage = (side: number, pageX: number, pageY: number) =>
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, side, side, pageX, pageY));

  test('SWT-8 overlay (the default): the pressed tokens reach the whole container at once; no ripple node exists', async () => {
    reduceMotion(false);
    await mount({ value: true });
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(viewStyle(part('container')!).backgroundColor).toBe(painted(tokens.conditions.selected.pressed.containerColor));
    expect(part('container.ripple')).toBeNull();
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  test('SWT-8 ripple (m3-like): the pressed container color grows in the round container around the handle from the point of contact over comp.switch.motion.feedback-duration, and fades over the state duration; keyboard activation starts at its center', async () => {
    reduceMotion(false);
    const switchTokens = m3Like.components.switch;
    const side = switchTokens.containerSize;
    containerOnPage(side, 300, 500);
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ value: true }, { theme: 'light', system: m3Like });
    timing.mockClear();
    // A press inside the container, 5 from its start and 20 from its top.
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 305, pageY: 520 } });
    const selected = switchTokens.conditions.selected;
    expect(viewStyle(part('container')!).backgroundColor).toBe(fill(selected.enabled.containerColor, 'light', m3Like));
    const reach = Math.hypot(side - 5, 20);
    expect(viewStyle(part('container.ripple.wave')!)).toMatchObject({ left: 5 - reach, top: 20 - reach, backgroundColor: painted(selected.pressed.containerColor, 'light', m3Like) });
    expect(timing.mock.calls.some(([, config]) => config.duration === switchTokens.motionFeedbackDuration && config.useNativeDriver === true)).toBe(true);
    timing.mockClear();
    await release();
    expect(timing.mock.calls.some(([, config]) => config.toValue === 0 && config.duration === switchTokens.motionStateDuration)).toBe(true);
    await wait(switchTokens.motionStateDuration * 2 + 50);
    expect(part('container.ripple')).toBeNull();
    await view.unmount();

    await mount({}, { theme: 'light', system: m3Like });
    await click();
    const center = Math.hypot(side / 2, side / 2);
    expect(viewStyle(part('container.ripple.wave')!)).toMatchObject({ left: side / 2 - center, top: side / 2 - center });
    await wait(HOLD + switchTokens.motionSelectionDuration + switchTokens.motionStateDuration * 2 + 80);
  });

  test('SWT-8: a press outside the round container (on the label) grows the ripple from the container\'s center', async () => {
    reduceMotion(false);
    const side = m3Like.components.switch.containerSize;
    containerOnPage(side, 300, 500);
    await mount({ value: true }, { theme: 'light', system: m3Like });
    // Far beyond the container's end edge and below its top: on the label.
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 300 + side + 60, pageY: 500 + side / 2 + 3 } });
    const reach = Math.hypot(side / 2, side / 2);
    expect(viewStyle(part('container.ripple.wave')!)).toMatchObject({ left: side / 2 - reach, top: side / 2 - reach, width: reach * 2 });
    await release();
    await wait(m3Like.components.switch.motionStateDuration * 2 + 50);
  });

  test('SWT-8 ripple with reduced motion: nothing grows and the pressed tokens apply at once', async () => {
    await mount({}, { theme: 'light', system: m3Like });
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(part('container.ripple')).toBeNull();
    expect(viewStyle(part('container')!).backgroundColor).toBe(fill(m3Like.components.switch.conditions.unselected.pressed.containerColor, 'light', m3Like));
    await release();
  });

  test('SWT-8 dim: the pressed opacity on the whole control and NO state layer; track, handle and label come from the pressed tokens', async () => {
    const system = withBehavior({ pressedFeedback: 'dim' }, withCondition('selected', { pressed: { trackColor: literal(10, 20, 30), handleColor: literal(40, 50, 60), labelColor: literal(70, 80, 90) } }, withSwitch({ pressedOpacity: 0.5 })));
    await mount({ value: true }, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).opacity).toBe(0.5);
    expect(viewStyle(part('container')!).backgroundColor).toBe(painted(tokens.conditions.selected.hovered.containerColor));
    expect(viewStyle(part('track.fill')!).backgroundColor).toBe('rgb(10, 20, 30)');
    expect(viewStyle(part('handle')!).backgroundColor).toBe('rgb(40, 50, 60)');
    expect(textStyle(part('label')!).color).toBe('rgb(70, 80, 90)');
    await release();
  });

  test('SWT-8 none: no answer to the press — every part stays with the state under the press; the change still happens', async () => {
    const onValueChange = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withCondition('unselected', { pressed: { containerColor: literal(1, 2, 3), handleSize: 30 } }, withSwitch({ pressedOpacity: 0.5 })));
    await mount({ onValueChange }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('unselected', 'enabled', system.components.switch, 'light', system);
    await fireEvent.press(host());
    expect(onValueChange).toHaveBeenCalledWith(true);
    await release();
  });

  test('SWT-9 corner smoothing: an amount above 0 (cupertino) reaches the container, the track, its fill, its outline and the focus ring', async () => {
    const nodes = () => [part('container')!, part('track')!, part('track.fill')!, part('outline')!, part('focus-ring')!];
    const view = await mount({ value: true });
    await fireEvent(host(), 'focus');
    for (const node of nodes()) expect(viewStyle(node).borderCurve).toBeUndefined();
    await view.unmount();
    await mount({ value: true }, { theme: 'light', system: cupertino });
    await fireEvent(host(), 'focus');
    for (const node of nodes()) expect(viewStyle(node).borderCurve).toBe('continuous');
  });

  test('SWT-9 focus-style: glow (acme) draws the focus colors as ONE halo around the track', async () => {
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(host(), 'focus');
    const { offset, innerWidth, outerWidth } = acme.measure.focus;
    expect(viewStyle(part('focus-ring')!)).toMatchObject({
      borderRadius: acme.components.switch.trackShape + offset,
      boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: outerWidth, spreadDistance: innerWidth + outerWidth, color: painted({ kind: 'role', role: 'focusRing' }, 'light', acme) }],
    });
  });
});

describe('focus and target (SWT-4, SWT-5)', () => {
  test('SWT-4: keyboard focus shows the focus ring at the focus offset around the TRACK, without animation; touch focus does not', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    await fireEvent(host(), 'focus');
    const ring = part('focus-ring')!;
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(ring)).toMatchObject({ top: -reach, left: -reach, borderWidth: measure.focus.outerWidth, borderColor: formatColor(colors.light.focusRing!), borderRadius: tokens.trackShape + reach });
    expect(part('track')!.children).toContain(ring);
    expect(timing).not.toHaveBeenCalled();
    await fireEvent(host(), 'blur');
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).toBeNull();
    await release();
  });

  test('SWT-5: the hit area reaches sys.target.touch on both axes — the track before layout, the whole row (track and label) after — without changing the visual size', async () => {
    await mount();
    const target = measure.target.touch;
    expect(host().props.hitSlop).toEqual({ top: (target - tokens.trackHeight) / 2, bottom: (target - tokens.trackHeight) / 2, left: (target - tokens.trackWidth) / 2, right: (target - tokens.trackWidth) / 2 });
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 90, height: 22 } } });
    expect(host().props.hitSlop).toEqual({ top: (target - 22) / 2, bottom: (target - 22) / 2, left: 0, right: 0 });
    expect(host().children).toContain(part('track'));
    expect(host().children).toContain(part('label'));
    expect(viewStyle(part('track')!)).toMatchObject({ width: tokens.trackWidth, height: tokens.trackHeight });
  });
});

describe('geometry and motion (SWT-10, SWT-11, SWT-13)', () => {
  test.each(CONDITIONS)('SWT-10: %s — the track, its outline inside the edge, the fill inside the outline; the handle centered on the midline half the track height from its end; the container centered on the handle', async (condition) => {
    await mount(propsOf(condition));
    const w = tokens.outlineWidth;
    expect(viewStyle(part('track')!)).toMatchObject({ width: tokens.trackWidth, height: tokens.trackHeight, borderRadius: tokens.trackShape });
    expect(viewStyle(part('outline')!)).toMatchObject({ position: 'absolute', top: 0, left: 0, borderWidth: w, borderRadius: tokens.trackShape });
    expect(viewStyle(part('track.fill')!)).toMatchObject({ position: 'absolute', top: w, right: w, bottom: w, left: w, borderRadius: tokens.trackShape - w });
    const center = centerOf(tokens, condition === 'selected');
    const layer = viewStyle(part('container')!);
    // Absolute: it may extend beyond the track without affecting layout.
    expect(layer).toMatchObject({ position: 'absolute', width: tokens.containerSize, height: tokens.containerSize, top: (tokens.trackHeight - tokens.containerSize) / 2, start: center - tokens.containerSize / 2, alignItems: 'center', justifyContent: 'center' });
    // The handle is centered in the container, so its center is the container's.
    expect(part('container')!.children).toContain(part('handle'));
    const size = tokens.conditions[condition].enabled.handleSize;
    expect(viewStyle(part('handle')!)).toMatchObject({ width: size, height: size, borderRadius: size / 2 });
    // The default: centers 10 from each end of a 36 × 20 track.
    expect(center).toBe(condition === 'selected' ? 26 : 10);
  });

  test('SWT-11: right-to-left mirrors the handle\'s positions and travel, and the label — every placement is logical (start), none is left or right', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    try {
      await mount({ value: true });
      const layer = viewStyle(part('container')!);
      expect(layer.start).toBe(centerOf(tokens, true) - tokens.containerSize / 2);
      expect(layer.left).toBeUndefined();
      expect(layer.right).toBeUndefined();
      expect(layer.transform).toBeUndefined();
      const row = viewStyle(host());
      expect(row.flexDirection).toBe('row');
      for (const name of ['left', 'right', 'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight'] as const) expect(row[name]).toBeUndefined();
    } finally {
      rtl.restore();
    }
  });

  test('SWT-13: switching moves the handle along the track, and its colors and the track\'s, over the selection motion tokens (the spring)', async () => {
    reduceMotion(false);
    const system = withSwitch({ motionSelectionDuration: 40 });
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const view = await mount({}, { theme: 'light', system });
    timing.mockClear();
    interpolate.mockClear();
    await view.rerender(element({ value: true }, { theme: 'light', system }));
    expect(bezier).toHaveBeenCalledWith(...tokens.motionSelectionEasing);
    expect(timing.mock.calls.filter(([, config]) => config.duration === 40)).toHaveLength(1);
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    const start = (on: boolean) => centerOf(tokens, on) - tokens.containerSize / 2;
    expect(ranges).toContainEqual([start(false), start(true)]);
    const on = tokens.conditions.selected.enabled;
    const off = tokens.conditions.unselected.enabled;
    expect(ranges).toContainEqual([painted(off.trackColor), painted(on.trackColor)]);
    expect(ranges).toContainEqual([painted(off.handleColor), painted(on.handleColor)]);
    expect(ranges).toContainEqual([painted(off.outlineColor), painted(on.outlineColor)]);
    await wait(120);
    expect(viewStyle(part('container')!).start).toBe(start(true));
  });

  test('SWT-13: the handle changes size with the condition (a glyph that appears grows it)', async () => {
    reduceMotion(false);
    const system = withSwitch({ motionSelectionDuration: 40 });
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ selectedIcon: 'check' }, { theme: 'light', system });
    interpolate.mockClear();
    await view.rerender(element({ value: true, selectedIcon: 'check' }, { theme: 'light', system }));
    const off = tokens.conditions.unselected.enabled.handleSize;
    const on = Math.max(tokens.conditions.selected.enabled.handleSize, tokens.handleSizeWithIcon);
    expect(on).not.toBe(off);
    expect(interpolate.mock.calls.map(([config]) => config.outputRange)).toContainEqual([off, on]);
    await wait(120);
  });

  test('SWT-13: where motion is reduced the new condition shows at once', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount();
    await view.rerender(element({ value: true }));
    expect(timing).not.toHaveBeenCalled();
    expectDrawnFrom('selected', 'enabled');
    expect(viewStyle(part('container')!).start).toBe(centerOf(tokens, true) - tokens.containerSize / 2);
  });
});

describe('the icon (SWT-12)', () => {
  test('SWT-12: the handle shows selectedIcon while on and unselectedIcon while off, at icon.size, in a handle of at least size-with-icon; none when the prop is empty', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const on = await mount({ value: true, selectedIcon: 'check', unselectedIcon: 'close' });
    expect(part('glyph')!.props.children).toBe('check');
    expect(textStyle(part('glyph')!)).toMatchObject({ fontSize: tokens.iconSize, lineHeight: tokens.iconSize });
    expect(viewStyle(part('icon')!)).toMatchObject({ width: tokens.iconSize, height: tokens.iconSize });
    const size = Math.max(tokens.conditions.selected.enabled.handleSize, tokens.handleSizeWithIcon);
    expect(viewStyle(part('handle')!)).toMatchObject({ width: size, height: size });
    await on.unmount();
    const off = await mount({ value: false, selectedIcon: 'check', unselectedIcon: 'close' });
    expect(part('glyph')!.props.children).toBe('close');
    await off.unmount();
    // Only the on position marks: off shows nothing and keeps its own handle size.
    await mount({ value: false, selectedIcon: 'check' });
    expect(part('icon')).toBeNull();
    expect(viewStyle(part('handle')!).width).toBe(tokens.conditions.unselected.enabled.handleSize);
    expect(warn.mock.calls.filter(([message]) => String(message).includes('UNFILLED'))).toHaveLength(1);
  });

  test('SWT-12: the family and fill of the condition, the system weight, the optical size clamped to the font\'s range', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const resolveIconFont = jest.fn((family: string, axes: { FILL: number }) => `${family}-${axes.FILL}`);
    const on = await mount({ value: true, selectedIcon: 'check' }, { theme: 'light', resolveIconFont });
    const { opticalSizeMin, opticalSizeMax } = tanrei.icon;
    expect(resolveIconFont).toHaveBeenLastCalledWith(tanrei.icon.family.selected.families[0], expect.objectContaining({ FILL: tanrei.icon.fillSelected, wght: tanrei.icon.weight, opsz: Math.min(opticalSizeMax, Math.max(opticalSizeMin, tokens.iconSize)) }));
    expect(textStyle(part('glyph')!)).toMatchObject({ fontFamily: `${tanrei.icon.family.selected.families[0]}-${tanrei.icon.fillSelected}`, fontWeight: toFontWeight(tanrei.icon.weight) });
    await on.unmount();
    await mount({ value: false, unselectedIcon: 'close' }, { theme: 'light', resolveIconFont });
    expect(resolveIconFont).toHaveBeenLastCalledWith(tanrei.icon.family.unselected.families[0], expect.objectContaining({ FILL: tanrei.icon.fillUnselected }));
  });

  test('SWT-12: a system with a family per selection (acme) draws the selected family, without a report', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ value: true, selectedIcon: 'check' }, { theme: 'light', system: acme });
    expect(textStyle(part('glyph')!).fontFamily).toBe(acme.icon.family.selected.families[0]);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('accessibility (SWT-14, SWT-15, SWT-16)', () => {
  test('SWT-14: role switch with on / off as checked — never a checkbox; the icon is hidden from assistive technology', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const value of [false, true]) {
      const view = await mount({ value, selectedIcon: 'check', unselectedIcon: 'close' });
      expect(host().props.accessibilityRole).toBe('switch');
      expect(host().props.accessibilityState).toEqual({ disabled: false, checked: value });
      expect(screen.getByRole('switch', { name: LABEL, checked: value })).toBe(host());
      expect(screen.queryByRole('checkbox')).toBeNull();
      expect(part('icon')!.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' });
      expect(screen.queryByText(value ? 'check' : 'close')).toBeNull();
      expect(part('glyph')!.props.allowFontScaling).toBe(false);
      await view.unmount();
    }
  });

  test('SWT-14: the other parts are decorative — hidden from assistive technology and from touches', async () => {
    await mount({ value: true });
    await fireEvent(host(), 'focus');
    for (const name of ['outline', 'focus-ring']) {
      expect(part(name)!.props.accessible).toBe(false);
      expect(viewStyle(part(name)!).pointerEvents).toBe('none');
    }
    expect(viewStyle(part('track.fill')!).pointerEvents).toBe('none');
    expect(screen.getAllByRole('switch')).toHaveLength(1);
  });

  test('SWT-15: the label sits at the inline end of the track, label.gap away, in label.typescale, wrapping rather than truncating', async () => {
    await mount();
    expect(viewStyle(host())).toMatchObject({ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.labelGap });
    expect(host().children.indexOf(part('track')!)).toBeLessThan(host().children.indexOf(part('label')!));
    expect(textStyle(part('label')!)).toMatchObject({ ...createTanreiTheme(tanrei, 'light').text(tokens.labelTypescale), flexShrink: 1 });
    expect(part('label')!.props.numberOfLines).toBeUndefined();
    expect(part('label')!.props.allowFontScaling).toBe(true);
  });

  test('SWT-16: labelHidden draws no label and keeps label as the accessible name', async () => {
    await mount({ labelHidden: true, value: true });
    expect(part('label')).toBeNull();
    expect(screen.getByRole('switch', { name: LABEL })).toBe(host());
  });

  describe('SWT-16: an unnamed switch', () => {
    const development = (enabled: boolean) => {
      (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
    };
    afterEach(() => development(true));
    const reports = (spy: jest.SpyInstance) => spy.mock.calls.filter(([message]) => String(message).includes('has no label'));

    test('still renders and works, and development builds report it', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const onValueChange = jest.fn();
      await mount({ label: '', onValueChange });
      await fireEvent.press(host());
      expect(onValueChange).toHaveBeenCalledWith(true);
      expect(reports(warn)).toHaveLength(1);
    });

    test('a release build says nothing', async () => {
      development(false);
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount({ label: '' });
      expect(warn).not.toHaveBeenCalled();
    });
  });

  test('forwards its ref to the underlying host view and passes caller handlers and layout style through', async () => {
    const ref = createRef<SwitchRef>();
    const onPressIn = jest.fn();
    await mount({ ref, onPressIn, style: { marginTop: 4 } });
    expect(ref.current).not.toBeNull();
    await fireEvent(host(), 'pressIn');
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(viewStyle(host()).marginTop).toBe(4);
    await release();
  });
});

describe('the open condition axis', () => {
  test('a system that adds a condition value leaves both core conditions drawn as before, and nothing is reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const product = withSwitch({ conditions: { ...tokens.conditions, busy: tokens.conditions.selected } as TanreiSwitchConditions });
    for (const condition of CONDITIONS) {
      const reference = await mount(propsOf(condition));
      const expected = JSON.stringify(reference.toJSON());
      await reference.unmount();
      const view = await mount(propsOf(condition), { theme: 'light', system: product });
      expect(JSON.stringify(view.toJSON())).toBe(expected);
      await view.unmount();
    }
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'light', contrast: 'medium' }, scheme: 'lightMedium' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  describe.each(schemes)('$scheme', ({ provider, scheme }) => {
    test.each(CONDITIONS)('%s resolves every part from its paints in this scheme, at rest and hovered', async (condition) => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount({ ...propsOf(condition), selectedIcon: 'check', unselectedIcon: 'close' }, provider);
      expectDrawnFrom(condition, 'enabled', tokens, scheme);
      await fireEvent(host(), 'hoverIn');
      expectDrawnFrom(condition, 'hovered', tokens, scheme);
    });
  });

  test('the default geometry: a 36 × 20 track with a 1 outline, a 14 handle (16 with a glyph of 16), a 28 layer, label 8 away in body', () => {
    expect([tokens.trackWidth, tokens.trackHeight, tokens.outlineWidth, tokens.conditions.unselected.enabled.handleSize, tokens.conditions.selected.enabled.handleSize, tokens.handleSizeWithIcon, tokens.iconSize, tokens.containerSize, tokens.labelGap, tokens.labelTypescale]).toEqual([36, 20, 1, 14, 14, 16, 16, 28, 8, 'body']);
  });

  test('re-valued sizes reach the track, the layer, the handle\'s travel, the gap and the target', async () => {
    const system = withSwitch({ trackWidth: 52, trackHeight: 32, outlineWidth: 2, containerSize: 40, labelGap: 12 });
    await mount({ value: true }, { theme: 'light', system });
    expect(viewStyle(part('track')!)).toMatchObject({ width: 52, height: 32 });
    expect(viewStyle(part('outline')!).borderWidth).toBe(2);
    expect(viewStyle(part('container')!)).toMatchObject({ width: 40, top: -4, start: 52 - 16 - 20 });
    expect(viewStyle(host()).gap).toBe(12);
    expect(host().props.hitSlop).toEqual({ top: 8, bottom: 8, left: 0, right: 0 });
  });
});

describe('fixtures', () => {
  // The default system cannot fill a selected glyph in a <Text> (SWT-12): the icon fixtures report it once.
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  describeFixtureBaselines(switchSubject);

  test('every fixture names the switch (label), so none of them reports SWT-16', () => {
    for (const fixture of spec.fixtures) expect(fixture.props.label).toBeTruthy();
  });
});

describe('the specs\' motion and first-line sentences', () => {
  test('SWT-3: a part a STATE recolors (the handle) moves over the state motion tokens, as the container does — at once under a press; a change of condition uses the selection motion', async () => {
    reduceMotion(false);
    const system = withCondition('selected', { hovered: { handleColor: literal(200, 0, 0) }, pressed: { handleColor: literal(0, 200, 0) } }, withSwitch({ motionStateDuration: 30, motionSelectionDuration: 60 }));
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ value: true }, { theme: 'light', system });
    timing.mockClear();
    await fireEvent(host(), 'hoverIn');
    // The container's transition and the part's: both over the state duration.
    expect(timing.mock.calls.map(([, config]) => config.duration)).toEqual([30, 30]);
    await wait(80);
    timing.mockClear();
    await fireEvent(host(), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    await release();
    expect(timing.mock.calls.map(([, config]) => config.duration)).toEqual([30, 30]);
    await wait(80);
    timing.mockClear();
    await view.rerender(element({ value: false }, { theme: 'light', system }));
    // The condition changed: the part moves over the selection duration (the container still over the state one).
    expect(timing.mock.calls.filter(([, config]) => config.duration === 60).length).toBeGreaterThanOrEqual(1);
    await wait(120);
  });

  test('SWT-15: the control is centered on the label\'s FIRST line — from the type style\'s line height until the label is laid out, then from the measured first line', async () => {
    await mount();
    const control = tokens.trackHeight;
    const lineHeight = Number(textStyle(part('label')!).lineHeight);
    const shift = (lineHeight - control) / 2;
    expect(viewStyle(part('track')!).marginTop).toBe(shift > 0 ? shift : undefined);
    expect(textStyle(part('label')!).marginTop).toBe(shift < 0 ? -shift : undefined);
    // Wrapped at a large text size: two lines of 44; the control moves down to the first line's center, not the block's.
    await fireEvent(part('label')!, 'textLayout', { nativeEvent: { lines: [{ x: 0, y: 0, width: 80, height: 44 }, { x: 0, y: 44, width: 60, height: 44 }] } });
    expect(viewStyle(part('track')!).marginTop).toBe(22 - control / 2);
    expect(textStyle(part('label')!).marginTop).toBeUndefined();
  });

  test('SWT-15: without a drawn label the control is not moved', async () => {
    await mount({ labelHidden: true });
    expect(viewStyle(part('track')!).marginTop).toBeUndefined();
  });
});
