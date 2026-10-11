// Checkbox — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/checkbox.spec.json; every behaviour id is cited by the test that covers it.
import { createRef, useState, type ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCheckboxConditionStateTokens, TanreiCheckboxConditions, TanreiCheckboxTokens, TanreiCoreCheckboxCondition, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { byTestID, describeFixtureBaselines, textStyle, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { createTanreiTheme, TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Checkbox, checkboxCondition, type CheckboxProps, type CheckboxRef } from '../Checkbox';
import { acme } from './__fixtures__/acme';
import { checkboxSubject } from './Checkbox.subject';

const spec = loadSpec('checkbox');
const { measure, state } = tanrei;
const colors: TanreiSystem['colors'] = tanrei.colors;
const tokens: TanreiCheckboxTokens = tanrei.components.checkbox;
const ID = 'checkbox';
const LABEL = 'Email me updates';

const { host, part } = byTestID(ID);

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
/** `undefined` when the paint draws nothing: the component then sets no fill / renders no element. */
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));

/** The default system with some checkbox tokens changed — what a preset or a product layer does. */
const withCheckbox = (overrides: Partial<TanreiCheckboxTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'checkbox', overrides);
/** …with some tokens of one condition changed, per state. */
const withCondition = (condition: TanreiCoreCheckboxCondition, overrides: { [State in InteractionState]?: Partial<TanreiCheckboxConditionStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.checkbox.conditions[condition];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withCheckbox({ conditions: { ...base.components.checkbox.conditions, [condition]: { ...current, ...changed } } as TanreiCheckboxConditions }, base);
};

function element(props: Partial<CheckboxProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }): ReactElement {
  return (
    <TanreiProvider {...provider}>
      <Checkbox testID={ID} label={LABEL} {...props} />
    </TanreiProvider>
  );
}
const mount = (props: Partial<CheckboxProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) => render(element(props, provider));

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

// The six conditions, in the spec's order (the token axis's core values).
const CONDITIONS: TanreiCoreCheckboxCondition[] = ['unselected', 'selected', 'indeterminate', 'errorUnselected', 'errorSelected', 'errorIndeterminate'];
/** The props that select a condition (CHK-4), written out independently of the component. */
const propsOf = (condition: TanreiCoreCheckboxCondition): Partial<CheckboxProps> =>
  ({
    unselected: {},
    selected: { value: true },
    indeterminate: { indeterminate: true },
    errorUnselected: { error: true },
    errorSelected: { error: true, value: true },
    errorIndeterminate: { error: true, indeterminate: true },
  })[condition];
const marks = (condition: TanreiCoreCheckboxCondition) => ({ check: condition === 'selected' || condition === 'errorSelected', dash: condition === 'indeterminate' || condition === 'errorIndeterminate' });
/** The axis-free tokens of a state, written out independently of `stateShape`. */
const shapeOf = (from: TanreiCheckboxTokens, in_: InteractionState) =>
  ({
    enabled: { opacity: 1, shape: from.containerShape },
    hovered: { opacity: from.hoveredOpacity, shape: from.hoveredContainerShape },
    focused: { opacity: from.focusedOpacity, shape: from.focusedContainerShape },
    pressed: { opacity: from.pressedOpacity, shape: from.pressedContainerShape },
    disabled: { opacity: from.disabledOpacity, shape: from.disabledContainerShape },
  })[in_];

/** The strokes of the mark on screen (the check's two legs, or the dash). */
const strokes = (name: 'check' | 'dash'): Instance[] => {
  const node = part(name);
  if (!node) return [];
  return name === 'dash' ? [node] : (node.children as Instance[]);
};

/** Enter (Android, tvOS) / Space / assistive activation: a bare click (no press events, no touch data). */
const click = () => fireEvent(host(), 'press', { nativeEvent: { target: 1 } });

/** CHK-9: a press stays visible for `duration.pressHold`, so a release is over only after that. */
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

/** Everything CHK-5 / CHK-8 name — container, box, mark, outline, label, opacity (and the shape) — from one state's tokens of one condition. */
function expectDrawnFrom(condition: TanreiCoreCheckboxCondition, in_: InteractionState, from: TanreiCheckboxTokens = tokens, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) {
  const t = from.conditions[condition][in_];
  const { opacity, shape } = shapeOf(from, in_);
  expect(viewStyle(host()).opacity).toBe(opacity);
  expect(viewStyle(part('container')!)).toMatchObject({ backgroundColor: fill(t.containerColor, scheme, system), borderRadius: shape });
  const box = fill(t.boxColor, scheme, system);
  if (box === undefined) expect(part('fill')).toBeNull();
  else expect(viewStyle(part('fill')!).backgroundColor).toBe(box);
  const outline = fill(t.outlineColor, scheme, system);
  if (outline === undefined) expect(part('outline')).toBeNull();
  else expect(viewStyle(part('outline')!).borderColor).toBe(outline);
  if (part('label')) expect(textStyle(part('label')!).color).toBe(painted(t.labelColor, scheme, system));
  const { check, dash } = marks(condition);
  expect(strokes('check')).toHaveLength(check ? 2 : 0);
  expect(strokes('dash')).toHaveLength(dash ? 1 : 0);
  for (const stroke of [...strokes('check'), ...strokes('dash')]) expect(viewStyle(stroke).backgroundColor).toBe(painted(t.markColor, scheme, system));
}

beforeEach(() => {
  // Most tests assert settled values; the animated path has its own tests.
  reduceMotion(true);
  resetLookupReports();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Checkbox.name);
    expect(platform.props).toEqual({ checked: 'value', indeterminate: 'indeterminate', error: 'error', disabled: 'disabled', label: 'label', labelHidden: 'labelHidden' });
    expect(platform.events).toEqual({ change: 'onValueChange' });
  });

  test('the conditions under test are the token axis\'s core values, in the order of the spec\'s state variants', () => {
    expect(Object.keys(tokens.conditions)).toEqual(CONDITIONS);
  });

  test('defaults follow the spec: not checked, not indeterminate, no error, enabled, label drawn', async () => {
    await mount();
    expectDrawnFrom('unselected', 'enabled');
    expect(host().props.accessibilityState).toEqual({ disabled: false, checked: false });
    expect(part('label')!.props.children).toBe(LABEL);
  });
});

describe('activation (CHK-1, CHK-2, CHK-3)', () => {
  test('CHK-1: touch, a bare click (Space, Enter where the platform activates with it, assistive technology) and a press on the label each call onValueChange once with the new value', async () => {
    const onValueChange = jest.fn();
    await mount({ onValueChange });
    await fireEvent.press(host());
    expect(onValueChange).toHaveBeenLastCalledWith(true);
    await wait(HOLD + 30);
    await click();
    await wait(HOLD + 30);
    // The label is inside the pressable row: a press on it is a press on the checkbox.
    await fireEvent.press(part('label')!);
    expect(onValueChange.mock.calls).toEqual([[true], [true], [true]]);
    // Keyboard and assistive activation reach a focusable, accessible Pressable as the same native click; Enter is
    // the platform's convention (Android and tvOS click a focused view on Enter; iOS does not).
    expect(host().props.accessible).toBe(true);
    expect(host().props.focusable).toBe(true);
  });

  test('CHK-1: a checked checkbox asks for false; the checkbox never flips itself (controlled)', async () => {
    const onValueChange = jest.fn();
    await mount({ value: true, onValueChange });
    await fireEvent.press(host());
    expect(onValueChange).toHaveBeenCalledWith(false);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(host().props.accessibilityState.checked).toBe(true);
  });

  test('CHK-1: onPress, when given, is called first; a controlled checkbox round-trips through the app state', async () => {
    const calls: string[] = [];
    function App() {
      const [on, setOn] = useState(false);
      return (
        <TanreiProvider theme="light">
          <Checkbox testID={ID} label={LABEL} value={on} onPress={() => calls.push('press')} onValueChange={(next) => (calls.push(`change:${next}`), setOn(next))} />
        </TanreiProvider>
      );
    }
    await render(<App />);
    await fireEvent.press(host());
    expect(calls).toEqual(['press', 'change:true']);
    expect(host().props.accessibilityState.checked).toBe(true);
    await wait(HOLD + 30);
    await fireEvent.press(host());
    expect(host().props.accessibilityState.checked).toBe(false);
  });

  test.each([false, true])('CHK-2: activating an indeterminate checkbox (value %s) asks for true', async (value) => {
    const onValueChange = jest.fn();
    await mount({ value, indeterminate: true, onValueChange });
    await click();
    expect(onValueChange.mock.calls).toEqual([[true]]);
  });

  test('CHK-2: a select-all whose app clears indeterminate on change ends checked and drawn selected', async () => {
    function SelectAll() {
      const [state, setState] = useState({ value: false, indeterminate: true });
      return (
        <TanreiProvider theme="light">
          <Checkbox testID={ID} label="Select all" {...state} onValueChange={(next) => setState({ value: next, indeterminate: false })} />
        </TanreiProvider>
      );
    }
    await render(<SelectAll />);
    expect(host().props.accessibilityState.checked).toBe('mixed');
    await click();
    await wait(HOLD + 30);
    expect(host().props.accessibilityState.checked).toBe(true);
    expectDrawnFrom('selected', 'enabled');
  });

  test('CHK-3: a disabled checkbox does not change or call onValueChange — touch, click or label — is not focusable and exposes disabled', async () => {
    const onValueChange = jest.fn();
    await mount({ disabled: true, onValueChange });
    await fireEvent.press(host());
    await click();
    await fireEvent.press(part('label')!);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(host().props.focusable).toBe(false);
    expect(host()).toBeDisabled();
    expect(host().props.accessibilityState).toEqual({ disabled: true, checked: false });
    expect(screen.getByRole('checkbox', { name: LABEL, disabled: true })).toBe(host());
    // A focus or hover event that still arrives shows no ring and leaves the disabled tokens in place.
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'hoverIn');
    expect(part('focus-ring')).toBeNull();
    expectDrawnFrom('unselected', 'disabled');
  });
});

describe('conditions and states (CHK-4, CHK-5, CHK-8)', () => {
  test('CHK-4: the props pick the condition — indeterminate over checked, and the error form while error is true', async () => {
    const cases: [Partial<CheckboxProps>, TanreiCoreCheckboxCondition][] = [
      [{}, 'unselected'],
      [{ value: true }, 'selected'],
      [{ indeterminate: true }, 'indeterminate'],
      [{ value: true, indeterminate: true }, 'indeterminate'],
      [{ error: true }, 'errorUnselected'],
      [{ error: true, value: true }, 'errorSelected'],
      [{ error: true, indeterminate: true }, 'errorIndeterminate'],
      [{ error: true, value: true, indeterminate: true }, 'errorIndeterminate'],
    ];
    for (const [props, condition] of cases) {
      expect(checkboxCondition(props.value ?? false, props.indeterminate ?? false, props.error ?? false)).toBe(condition);
      const view = await mount(props);
      expectDrawnFrom(condition, 'enabled');
      await view.unmount();
    }
  });

  test('CHK-4: every condition is drawn from its own tokens — each one re-valued by a layer reaches the box', async () => {
    for (const [index, condition] of CONDITIONS.entries()) {
      const system = withCondition(condition, { enabled: { boxColor: literal(index + 1, 2, 3) } });
      const view = await mount(propsOf(condition), { theme: 'light', system });
      expect(viewStyle(part('fill')!).backgroundColor).toBe(`rgb(${index + 1}, 2, 3)`);
      await view.unmount();
    }
  });

  test('CHK-5: hover, keyboard focus and press each draw the checkbox from that state\'s tokens, and it returns', async () => {
    await mount({ value: true });
    expectDrawnFrom('selected', 'enabled');
    for (const target of ['hovered', 'focused', 'pressed'] as const) {
      await enter(target);
      expectDrawnFrom('selected', target);
      expect(viewStyle(part('container')!).backgroundColor).toBeDefined();
      if (target === 'hovered') await fireEvent(host(), 'hoverOut');
      if (target === 'focused') await fireEvent(host(), 'blur');
      if (target === 'pressed') await release();
      expectDrawnFrom('selected', 'enabled');
    }
  });

  describe.each(CONDITIONS)('CHK-5: %s', (condition) => {
    test.each(['hovered', 'focused', 'pressed'] as const)('%s: container, box, mark, outline, label and opacity come from its tokens', async (target) => {
      await mount(propsOf(condition));
      await enter(target);
      expectDrawnFrom(condition, target);
    });
  });

  test('CHK-5: precedence is pressed over focused over hovered, under the acme fixture system (which values each differently)', async () => {
    const selected = acme.components.checkbox.conditions.selected;
    const expected = (name: InteractionState) => fill(selected[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    expect(acme.behavior.pressedFeedback).toBe('overlay');
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

  test('CHK-5: in the default system the state layer is the condition\'s state-layer color (its outline color) at the state-layer opacity, and the box keeps its resting color', async () => {
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
      // Only the state layer answers the state: the box, the outline and the label keep their resting values.
      expect(part('fill') ? viewStyle(part('fill')!).backgroundColor : undefined).toBe(fill(resting.boxColor));
      expect(textStyle(part('label')!).color).toBe(painted(resting.labelColor));
      await view.unmount();
    }
  });

  test('CHK-5: focus gained by touch or pointer does not select the focused state', async () => {
    const system = withCondition('unselected', { focused: { containerColor: literal(2, 0, 0) } });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await release();
    expectDrawnFrom('unselected', 'enabled', system.components.checkbox, 'light', system);
  });

  test('CHK-5: state changes animate the state layer with the state motion tokens; a press is immediate', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    await mount({ value: true });
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    const curve = bezier.mock.results[bezier.mock.calls.findIndex((args) => JSON.stringify(args) === JSON.stringify(tokens.motionStateEasing))]!.value;
    expect(timing).not.toHaveBeenCalled();
    await fireEvent(host(), 'hoverIn');
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: tokens.motionStateDuration, easing: curve, useNativeDriver: false });
    await wait(tokens.motionStateDuration * 2);
    timing.mockClear();
    await fireEvent(host(), 'pressIn');
    expect(timing).not.toHaveBeenCalled();
    expect(viewStyle(part('container')!).backgroundColor).toBe(painted(tokens.conditions.selected.pressed.containerColor));
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  describe.each(CONDITIONS)('CHK-8: disabled %s', (condition) => {
    test('renders container, box, mark, outline, label and opacity from its disabled tokens', async () => {
      await mount({ ...propsOf(condition), disabled: true });
      expectDrawnFrom(condition, 'disabled');
    });
  });

  test('CHK-8: in the default system a disabled checkbox keeps its round layer clear, fades box, outline and label to on-surface 38 %, and draws its mark in surface; an empty box stays empty', async () => {
    const faded = formatColor({ ...colors.light.onSurface, a: state.disabledContentOpacity });
    for (const condition of CONDITIONS) {
      const view = await mount({ ...propsOf(condition), disabled: true });
      expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
      expect(viewStyle(part('outline')!).borderColor).toBe(faded);
      expect(textStyle(part('label')!).color).toBe(faded);
      const { check, dash } = marks(condition);
      if (check || dash) {
        expect(viewStyle(part('fill')!).backgroundColor).toBe(faded);
        for (const stroke of [...strokes('check'), ...strokes('dash')]) expect(viewStyle(stroke).backgroundColor).toBe(formatColor(colors.light.surface));
      } else {
        expect(part('fill')).toBeNull();
      }
      await view.unmount();
    }
  });
});

describe('press hold', () => {
  test('CHK-9: the pressed state appears in the same frame and stays visible for duration.pressHold although the press ended sooner', async () => {
    expect(HOLD).toBe(100);
    await mount();
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('unselected', 'pressed');
    await fireEvent(host(), 'pressOut');
    expectDrawnFrom('unselected', 'pressed');
    await wait(HOLD / 2);
    expectDrawnFrom('unselected', 'pressed');
    await wait(HOLD / 2 + 30);
    expectDrawnFrom('unselected', 'enabled');
  });

  test('CHK-9: Space / Enter / assistive activation — a bare click — shows the pressed state for the hold, in the NEW condition', async () => {
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <TanreiProvider theme="light">
          <Checkbox testID={ID} label={LABEL} value={on} onValueChange={setOn} />
        </TanreiProvider>
      );
    }
    await render(<Controlled />);
    expectDrawnFrom('unselected', 'enabled');
    await click();
    expectDrawnFrom('selected', 'pressed');
    await wait(HOLD + 30);
    expectDrawnFrom('selected', 'enabled');
  });
});

describe('choices of kind: system.behavior (CHK-10, CHK-11)', () => {
  const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
  const ROW = { nativeEvent: { layout: { x: 0, y: 0, width: 160, height: 28 } } };
  /** Where the round container is on the page: `measure` of every host view answers it (the ripple is measured in the container). */
  const containerOnPage = (side: number, pageX: number, pageY: number) =>
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, side, side, pageX, pageY));

  test('CHK-10 overlay (the default): the pressed tokens reach the whole container at once; no ripple node exists', async () => {
    reduceMotion(false);
    await mount({ value: true });
    await fireEvent(host(), 'layout', ROW);
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(viewStyle(part('container')!).backgroundColor).toBe(painted(tokens.conditions.selected.pressed.containerColor));
    expect(part('container.ripple')).toBeNull();
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  describe('CHK-10 ripple (m3-like)', () => {
    const checkbox = m3Like.components.checkbox;
    const color = (paint: TanreiPaint) => painted(paint, 'light', m3Like);

    test('the pressed container color of the condition grows in the round container from the point of contact over comp.checkbox.motion.feedback-duration; the container keeps the state under the press; it fades over the state duration', async () => {
      reduceMotion(false);
      const side = checkbox.containerSize;
      containerOnPage(side, 300, 500);
      const timing = jest.spyOn(Animated, 'timing');
      await mount({ value: true }, { theme: 'light', system: m3Like });
      expect(part('container.ripple')).toBeNull();
      timing.mockClear();
      // A press inside the container, 10 from its start and 30 from its top.
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 310, pageY: 530 } });

      const selected = checkbox.conditions.selected;
      expect(viewStyle(part('container')!).backgroundColor).toBe(fill(selected.enabled.containerColor, 'light', m3Like));
      expect(viewStyle(part('container.ripple')!)).toMatchObject({ position: 'absolute', overflow: 'hidden', pointerEvents: 'none', borderRadius: checkbox.pressedContainerShape });
      const reach = Math.hypot(side - 10, 30);
      expect(viewStyle(part('container.ripple.wave')!)).toMatchObject({ left: 10 - reach, top: 30 - reach, width: reach * 2, backgroundColor: color(selected.pressed.containerColor) });
      // Below the box, hidden from assistive technology.
      const layer = part('container')!;
      expect(layer.children.indexOf(part('container.ripple')!)).toBeLessThan(layer.children.indexOf(part('box')!));
      expect(part('container.ripple')!.props.accessible).toBe(false);
      expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: checkbox.motionFeedbackDuration, useNativeDriver: true });

      timing.mockClear();
      await release();
      expect(timing.mock.calls.some(([, config]) => config.toValue === 0 && config.duration === checkbox.motionStateDuration)).toBe(true);
      await wait(checkbox.motionStateDuration * 2 + 50);
      expect(part('container.ripple')).toBeNull();
    });

    test('CHK-10: a press outside the round container (on the label) grows the ripple from the container\'s center', async () => {
      reduceMotion(false);
      const side = m3Like.components.checkbox.containerSize;
      containerOnPage(side, 300, 500);
      await mount({ value: true }, { theme: 'light', system: m3Like });
      // Far beyond the container's end edge and below its top: on the label.
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 300 + side + 60, pageY: 500 + side / 2 + 3 } });
      const reach = Math.hypot(side / 2, side / 2);
      expect(viewStyle(part('container.ripple.wave')!)).toMatchObject({ left: side / 2 - reach, top: side / 2 - reach, width: reach * 2 });
      await release();
      await wait(m3Like.components.checkbox.motionStateDuration * 2 + 50);
    });

    test('keyboard activation ripples from the center of the container, even before the first layout pass; with reduce motion nothing grows and the pressed tokens apply at once', async () => {
      reduceMotion(false);
      const side = checkbox.containerSize;
      const view = await mount({}, { theme: 'light', system: m3Like });
      await click();
      const reach = Math.hypot(side / 2, side / 2);
      expect(viewStyle(part('container.ripple.wave')!)).toMatchObject({ left: side / 2 - reach, top: side / 2 - reach, width: reach * 2 });
      await wait(HOLD + 30);
      await wait(checkbox.motionStateDuration * 2 + 50);
      await view.unmount();

      reduceMotion(true);
      await mount({}, { theme: 'light', system: m3Like });
      await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
      expect(part('container.ripple')).toBeNull();
      expect(viewStyle(part('container')!).backgroundColor).toBe(fill(checkbox.conditions.unselected.pressed.containerColor, 'light', m3Like));
      await release();
    });
  });

  test('CHK-10 dim: the pressed opacity on the whole control and NO state layer — the container keeps the state under the press; box, mark and label come from the pressed tokens', async () => {
    const system = withBehavior(
      { pressedFeedback: 'dim' },
      withCondition('selected', { pressed: { boxColor: literal(10, 20, 30), markColor: literal(40, 50, 60), labelColor: literal(70, 80, 90) } }, withCheckbox({ pressedOpacity: 0.5, pressedContainerShape: 3 })),
    );
    await mount({ value: true }, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).opacity).toBe(0.5);
    expect(viewStyle(part('container')!)).toMatchObject({ borderRadius: 3, backgroundColor: painted(tokens.conditions.selected.hovered.containerColor) });
    expect(viewStyle(part('fill')!).backgroundColor).toBe('rgb(10, 20, 30)');
    expect(viewStyle(strokes('check')[0]!).backgroundColor).toBe('rgb(40, 50, 60)');
    expect(textStyle(part('label')!).color).toBe('rgb(70, 80, 90)');
    expect(part('container.ripple')).toBeNull();
    await release();
    expect(viewStyle(host()).opacity).toBe(tokens.hoveredOpacity);
  });

  test('CHK-10 none: no answer to the press — every part stays with the state under the press; the change still happens', async () => {
    const onValueChange = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withCondition('unselected', { pressed: { containerColor: literal(1, 2, 3), outlineColor: literal(10, 20, 30), labelColor: literal(40, 50, 60) } }, withCheckbox({ pressedOpacity: 0.5 })));
    await mount({ onValueChange }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('unselected', 'enabled', system.components.checkbox, 'light', system);
    await fireEvent.press(host());
    expect(onValueChange).toHaveBeenCalledWith(true);
    await release();
  });

  test('CHK-11 corner smoothing: an amount above 0 (cupertino: 0.6) reaches the container, the box, its fill, its outline and the focus ring as the OS curve; 0 adds nothing', async () => {
    const nodes = () => [part('container')!, part('box')!, part('fill')!, part('outline')!, part('focus-ring')!];
    expect(tanrei.shape.cornerSmoothing).toBe(0);
    const view = await mount({ value: true });
    await fireEvent(host(), 'focus');
    for (const node of nodes()) expect(viewStyle(node).borderCurve).toBeUndefined();
    await view.unmount();

    expect(cupertino.shape.cornerSmoothing).toBe(0.6);
    await mount({ value: true }, { theme: 'light', system: cupertino });
    await fireEvent(host(), 'focus');
    for (const node of nodes()) expect(viewStyle(node).borderCurve).toBe('continuous');
  });

  test('CHK-11 corner smoothing on Android: circular whatever the amount', async () => {
    const os = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    try {
      await mount({ value: true }, { theme: 'light', system: cupertino });
      expect(viewStyle(part('box')!).borderCurve).toBeUndefined();
    } finally {
      os.restore();
    }
  });

  test('CHK-11 focus-style: glow (acme) draws the focus colors as ONE halo around the box', async () => {
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(host(), 'focus');
    const { offset, innerWidth, outerWidth } = acme.measure.focus;
    expect(viewStyle(part('focus-ring')!)).toMatchObject({
      borderRadius: acme.components.checkbox.boxShape + offset,
      boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: outerWidth, spreadDistance: innerWidth + outerWidth, color: painted({ kind: 'role', role: 'focusRing' }, 'light', acme) }],
    });
    expect(part('focus-ring')!.props.accessible).toBe(false);
  });
});

describe('focus and target (CHK-6, CHK-7)', () => {
  test('CHK-6: keyboard focus shows the focus ring at the focus offset around the BOX, without animation', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    expect(part('focus-ring')).toBeNull();
    timing.mockClear();
    await fireEvent(host(), 'focus');
    const ring = part('focus-ring')!;
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(ring)).toEqual({
      position: 'absolute',
      top: -reach,
      right: -reach,
      bottom: -reach,
      left: -reach,
      borderWidth: measure.focus.outerWidth,
      borderColor: formatColor(colors.light.focusRing!),
      borderRadius: tokens.boxShape + reach,
      pointerEvents: 'none',
    });
    // It is the box's: drawn inside the box's view, not around the container or the row.
    expect(part('box')!.children).toContain(ring);
    expect(ring.type).toBe('View');
    expect(timing).not.toHaveBeenCalled();
    await fireEvent(host(), 'blur');
    expect(part('focus-ring')).toBeNull();
  });

  test('CHK-6: focus gained by touch or pointer does not show the focus ring; a later keyboard focus does', async () => {
    await mount();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).toBeNull();
    await release();
    expect(part('focus-ring')).toBeNull();
    await fireEvent(host(), 'blur');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).not.toBeNull();
  });

  test('CHK-7: the hit area reaches sys.target.touch on both axes — from the container\'s square before layout, from the whole row (label included) after — without changing the visual size', async () => {
    await mount();
    const side = tokens.containerSize;
    const slop = (measure.target.touch - side) / 2;
    expect(host().props.hitSlop).toEqual({ top: slop, bottom: slop, left: slop, right: slop });
    // The label is inside the host: the row is the hit area, and only its height needs extending.
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 160, height: side } } });
    expect(host().props.hitSlop).toEqual({ top: slop, bottom: slop, left: 0, right: 0 });
    expect(viewStyle(part('container')!)).toMatchObject({ width: side, height: side });
    expect(host().children).toContain(part('label'));
  });

  test('CHK-7: the target comes from the system', async () => {
    const system: TanreiSystem = { ...tanrei, measure: { ...measure, target: { ...measure.target, touch: 60 } } };
    await mount({ labelHidden: true }, { theme: 'light', system });
    const slop = (60 - tokens.containerSize) / 2;
    expect(host().props.hitSlop).toEqual({ top: slop, bottom: slop, left: slop, right: slop });
  });
});

describe('geometry and the mark (CHK-12, CHK-13)', () => {
  test('CHK-12: a box of box.size with corners box.shape, centered in a round container of container.size; the outline inside the edge; the fill inside the outline', async () => {
    await mount({ value: true });
    expect(viewStyle(part('container')!)).toMatchObject({ width: tokens.containerSize, height: tokens.containerSize, borderRadius: tokens.containerShape, alignItems: 'center', justifyContent: 'center' });
    expect(viewStyle(part('box')!)).toMatchObject({ width: tokens.boxSize, height: tokens.boxSize, borderRadius: tokens.boxShape });
    const w = tokens.outlineWidth;
    expect(viewStyle(part('outline')!)).toMatchObject({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderWidth: w, borderRadius: tokens.boxShape });
    expect(viewStyle(part('fill')!)).toMatchObject({ position: 'absolute', top: w, right: w, bottom: w, left: w, borderRadius: tokens.boxShape - w });
    // No real border anywhere: nothing changes the box's size.
    expect(viewStyle(part('box')!).borderWidth).toBeUndefined();
  });

  test('CHK-12: the mark is stroked at mark.width — a check (two legs) while selected, a horizontal dash while indeterminate, nothing while unselected', async () => {
    const selected = await mount({ value: true });
    expect(strokes('check')).toHaveLength(2);
    // Square caps: no rounding, each leg half a stroke longer at both ends than its points.
    for (const leg of strokes('check')) {
      expect(viewStyle(leg)).toMatchObject({ height: tokens.markWidth });
      expect(viewStyle(leg).borderRadius).toBeUndefined();
    }
    expect(part('dash')).toBeNull();
    // The check turns: its legs go down, then up (inline direction left to right, whatever the layout direction).
    const [first, second] = strokes('check').map((leg) => parseFloat(String((viewStyle(leg).transform as { rotate: string }[])[0]!.rotate)));
    expect(first).toBeGreaterThan(0);
    expect(second).toBeLessThan(0);
    expect(viewStyle(part('check')!).direction).toBe('ltr');
    // The spec's anatomy: (0.2, 0.5) → (0.4, 0.7) → (0.8, 0.3) of the side; each leg half a stroke longer at both ends.
    const side = tokens.boxSize;
    const w = tokens.markWidth;
    expect(strokes('check').map((leg) => Number(viewStyle(leg).width))).toEqual([Math.hypot(0.2 * side, 0.2 * side) + w, Math.hypot(0.4 * side, 0.4 * side) + w].map((n) => Math.round(n * 1e4) / 1e4));
    expect(Number(viewStyle(strokes('check')[0]!).left)).toBeCloseTo(0.2 * side - (w / 2) * Math.SQRT1_2, 3);
    await selected.unmount();

    const indeterminate = await mount({ indeterminate: true });
    expect(part('check')).toBeNull();
    const dash = viewStyle(part('dash')!);
    expect(dash).toMatchObject({ height: tokens.markWidth, top: (tokens.boxSize - tokens.markWidth) / 2, transform: [{ scaleX: 1 }] });
    // From 0.1375 to 0.8625 of the side (the spec's anatomy), with square caps: centered horizontally.
    expect(dash.left).toBeCloseTo(0.1375 * tokens.boxSize - tokens.markWidth / 2, 4);
    expect(dash.width).toBeCloseTo(0.725 * tokens.boxSize + tokens.markWidth, 4);
    expect(Number(dash.left) * 2 + Number(dash.width)).toBeCloseTo(tokens.boxSize, 6);
    expect(dash.borderRadius).toBeUndefined();
    await indeterminate.unmount();

    await mount({});
    expect(part('check')).toBeNull();
    expect(part('dash')).toBeNull();
  });

  /** The class of what `Animated.Value#interpolate` returns: the legs' lengths are interpolations of the check's progress. */
  const interpolationPrototype = () => Object.getPrototypeOf(new Animated.Value(0).interpolate({ inputRange: [0, 1], outputRange: [0, 1] })) as { interpolate: Animated.AnimatedInterpolation<number>['interpolate'] };

  test('CHK-13: checking draws the check along its path — the first leg, then the second — and fills the box, over the selection motion tokens', async () => {
    reduceMotion(false);
    const system = withCheckbox({ motionSelectionDuration: 40 });
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const legs = jest.spyOn(interpolationPrototype(), 'interpolate');
    const view = await mount({}, { theme: 'light', system });
    expect(part('check')).toBeNull();
    timing.mockClear();
    interpolate.mockClear();
    legs.mockClear();
    await view.rerender(element({ value: true }, { theme: 'light', system }));
    // The box, outline and mark colors, and the check: each over the selection duration with the selection easing.
    const curves = bezier.mock.calls.flatMap((args, index) => (JSON.stringify(args) === JSON.stringify(tokens.motionSelectionEasing) ? [bezier.mock.results[index]!.value] : []));
    const selection = timing.mock.calls.filter(([, config]) => config.duration === 40);
    expect(selection).toHaveLength(2);
    for (const [, config] of selection) {
      expect(config).toMatchObject({ toValue: 1, useNativeDriver: false });
      expect(curves).toContain(config.easing);
    }
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    // The check's progress runs 0 → 1; the box fills from nothing; the outline moves to the selected color.
    expect(ranges).toContainEqual([0, 1]);
    expect(ranges).toContainEqual([formatColor({ ...evaluatePaint(tokens.conditions.selected.enabled.boxColor, colors.light), a: 0 }), painted(tokens.conditions.selected.enabled.boxColor)]);
    expect(ranges).toContainEqual([painted(tokens.conditions.unselected.enabled.outlineColor), painted(tokens.conditions.selected.enabled.outlineColor)]);
    // No dash is drawn: its condition did not change.
    expect(part('dash')).toBeNull();
    // While it moves the legs are drawn from the start of the path: the first reaches its length before the second starts.
    expect(strokes('check')).toHaveLength(2);
    const [first, second] = legs.mock.calls.map(([config]) => config);
    expect(legs).toHaveBeenCalledTimes(2);
    expect(first!.inputRange).toEqual(second!.inputRange);
    const split = first!.inputRange[1]!;
    expect(split).toBeGreaterThan(0);
    expect(split).toBeLessThan(1);
    expect(first!.outputRange).toEqual([0, first!.outputRange[1], first!.outputRange[1]]);
    expect(second!.outputRange).toEqual([0, 0, second!.outputRange[2]]);
    await wait(120);
    // Settled: whole, plain values.
    expect(strokes('check').map((leg) => viewStyle(leg).width)).toEqual([first!.outputRange[1], second!.outputRange[2]]);
  });

  test('CHK-13: the dash grows from its center; unchecking reverses the drawing — the mark is still drawn while it goes away', async () => {
    reduceMotion(false);
    const system = withCheckbox({ motionSelectionDuration: 40 });
    const view = await mount({}, { theme: 'light', system });
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await view.rerender(element({ indeterminate: true }, { theme: 'light', system }));
    // scaleX from 0 about the dash's own center (the default transform origin) — the dash is centered in the box.
    expect(interpolate.mock.calls.map(([config]) => config.outputRange)).toContainEqual([0, 1]);
    expect((viewStyle(part('dash')!).transform as { scaleX: number }[])[0]!.scaleX).toBeLessThan(1);
    expect(viewStyle(part('dash')!).transformOrigin).toBeUndefined();
    await wait(120);
    expect(viewStyle(part('dash')!).transform).toEqual([{ scaleX: 1 }]);

    interpolate.mockClear();
    await view.rerender(element({}, { theme: 'light', system }));
    expect(interpolate.mock.calls.map(([config]) => config.outputRange)).toContainEqual([1, 0]);
    expect(part('dash')).not.toBeNull();
    await wait(120);
    expect(part('dash')).toBeNull();
  });

  test('CHK-13: where motion is reduced the new condition shows at once, with no transition', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount();
    await view.rerender(element({ value: true }));
    expect(timing).not.toHaveBeenCalled();
    expectDrawnFrom('selected', 'enabled');
    expect(viewStyle(strokes('check')[0]!).width).toBeGreaterThan(0);
  });
});

describe('accessibility (CHK-14, CHK-15, CHK-16)', () => {
  test('CHK-14: role checkbox, named by label, with checked false / true / mixed', async () => {
    for (const [props, checked] of [
      [{}, false],
      [{ value: true }, true],
      [{ indeterminate: true }, 'mixed'],
      [{ value: true, indeterminate: true }, 'mixed'],
    ] as const) {
      const view = await mount(props);
      expect(host().props.accessibilityRole).toBe('checkbox');
      expect(host().props.accessibilityState).toEqual({ disabled: false, checked });
      expect(screen.getByRole('checkbox', { name: LABEL, checked })).toBe(host());
      await view.unmount();
    }
  });

  test('CHK-14: React Native has no invalid state, so error changes no accessibility prop (README) — the form\'s message reaches it through the caller\'s own props', async () => {
    const plain = await mount({ value: true });
    const without = { ...host().props };
    await plain.unmount();
    await mount({ value: true, error: true, accessibilityHint: 'You must accept the terms' });
    const { accessibilityHint, ...rest } = host().props;
    expect(accessibilityHint).toBe('You must accept the terms');
    for (const key of ['accessibilityRole', 'accessibilityLabel', 'accessibilityState', 'accessibilityValue']) expect(rest[key]).toEqual(without[key]);
  });

  test('CHK-14: the parts are decorative — hidden from assistive technology and from touches; the label text is the host\'s name, not an element of its own', async () => {
    await mount({ value: true });
    await fireEvent(host(), 'focus');
    for (const name of ['outline', 'focus-ring']) {
      expect(part(name)!.props.accessible).toBe(false);
      expect(viewStyle(part(name)!).pointerEvents).toBe('none');
    }
    expect(viewStyle(part('fill')!).pointerEvents).toBe('none');
    expect(viewStyle(part('check')!).pointerEvents).toBe('none');
    // One accessible element: the host.
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  test('CHK-15: the label sits at the inline end of the container, label.gap away, in label.typescale, wrapping rather than truncating', async () => {
    await mount({ label: 'A long label that wraps onto a second line at a narrow width' });
    const row = viewStyle(host());
    // `row` (never `row-reverse`) is mirrored by React Native in a right-to-left layout: the label moves to the left.
    expect(row).toMatchObject({ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.labelGap });
    expect(host().children.indexOf(part('container')!)).toBeLessThan(host().children.indexOf(part('label')!));
    const label = part('label')!;
    expect(textStyle(label)).toMatchObject({ ...createTanreiTheme(tanrei, 'light').text(tokens.labelTypescale), flexShrink: 1 });
    expect(label.props.numberOfLines).toBeUndefined();
    expect(label.props.allowFontScaling).toBe(true);
  });

  test('CHK-15: right-to-left layouts mirror the order — the row is logical, nothing is placed by left or right', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    try {
      await mount({ value: true });
      const row = viewStyle(host());
      expect(row.flexDirection).toBe('row');
      for (const key of ['left', 'right', 'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight'] as const) expect(row[key]).toBeUndefined();
      expect(viewStyle(part('label')!).marginLeft).toBeUndefined();
    } finally {
      rtl.restore();
    }
  });

  test('CHK-16: labelHidden draws no label and keeps label as the accessible name', async () => {
    await mount({ label: 'Select row', labelHidden: true, value: true });
    expect(part('label')).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Select row' })).toBe(host());
    expect(host().children).toHaveLength(1);
  });

  describe('CHK-16: an unnamed checkbox', () => {
    const development = (enabled: boolean) => {
      (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
    };
    afterEach(() => development(true));
    const reports = (spy: jest.SpyInstance) => spy.mock.calls.filter(([message]) => String(message).includes('has no label'));

    test('still renders and works, and development builds report it', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const onValueChange = jest.fn();
      await mount({ label: '', onValueChange });
      expect(host().props.accessibilityRole).toBe('checkbox');
      expect(part('label')).toBeNull();
      await fireEvent.press(host());
      expect(onValueChange).toHaveBeenCalledWith(true);
      expect(reports(warn)).toHaveLength(1);
      expect(String(reports(warn)[0]![0])).toContain(`testID "${ID}"`);
    });

    test('a blank label is no name either; aria-label and accessibilityLabel are', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const blank = await mount({ label: '   ', labelHidden: true });
      expect(reports(warn)).toHaveLength(1);
      await blank.unmount();
      warn.mockClear();
      const aria = await mount({ label: '', 'aria-label': 'Row 3' });
      expect(reports(warn)).toHaveLength(0);
      expect(screen.getByRole('checkbox', { name: 'Row 3' })).toBe(host());
      await aria.unmount();
      await mount({ label: '', accessibilityLabel: 'Row 4' });
      expect(reports(warn)).toHaveLength(0);
    });

    test('a release build says nothing', async () => {
      development(false);
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount({ label: '' });
      expect(host()).toBeTruthy();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  test('forwards its ref to the underlying host view and passes caller handlers and layout style through', async () => {
    const ref = createRef<CheckboxRef>();
    const onPressIn = jest.fn();
    const onFocus = jest.fn();
    const onLayout = jest.fn();
    await mount({ ref, onPressIn, onFocus, onLayout, style: { marginTop: 4 } });
    expect(ref.current).not.toBeNull();
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 28 } } });
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onLayout).toHaveBeenCalledTimes(1);
    expect(viewStyle(host()).marginTop).toBe(4);
    await release();
  });
});

describe('the open condition axis', () => {
  test('a system that adds a condition value leaves every core condition drawn as before, and nothing is reported: no prop selects an added value', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const product = withCheckbox({ conditions: { ...tokens.conditions, warning: tokens.conditions.errorSelected } as TanreiCheckboxConditions });
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
      await mount(propsOf(condition), provider);
      expectDrawnFrom(condition, 'enabled', tokens, scheme);
      await fireEvent(host(), 'hoverIn');
      expectDrawnFrom(condition, 'hovered', tokens, scheme);
    });
  });

  test('the default geometry: box 16 in a 28 container, corner 3, outline 1, mark 2, label 4 away in body', () => {
    expect([tokens.boxSize, tokens.containerSize, tokens.boxShape, tokens.outlineWidth, tokens.markWidth, tokens.labelGap, tokens.labelTypescale]).toEqual([16, 28, 3, 1, 2, 4, 'body']);
  });
});

describe('the system drives rendering', () => {
  test('re-valued sizes reach the container, the box, the outline, the mark, the gap and the target', async () => {
    const system = withCheckbox({ containerSize: 40, boxSize: 20, boxShape: 5, outlineWidth: 2, markWidth: 3, labelGap: 10, labelTypescale: 'bodyLarge' });
    await mount({ indeterminate: true }, { theme: 'light', system });
    expect(viewStyle(part('container')!)).toMatchObject({ width: 40, height: 40 });
    expect(viewStyle(part('box')!)).toMatchObject({ width: 20, height: 20, borderRadius: 5 });
    expect(viewStyle(part('outline')!).borderWidth).toBe(2);
    expect(viewStyle(part('fill')!)).toMatchObject({ top: 2, borderRadius: 3 });
    expect(viewStyle(part('dash')!).height).toBe(3);
    expect(viewStyle(host()).gap).toBe(10);
    expect(textStyle(part('label')!)).toMatchObject(createTanreiTheme(system, 'light').text('bodyLarge'));
    expect(host().props.hitSlop).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
  });

  test('pressed shape 2 and pressed opacity 0.4 reach the container and the whole control', async () => {
    const system = withCheckbox({ pressedContainerShape: 2, pressedOpacity: 0.4 });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(part('container')!).borderRadius).toBe(2);
    expect(viewStyle(host()).opacity).toBe(0.4);
    await release();
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(checkboxSubject);

  test('every fixture of the spec names the checkbox (label), so none of them reports CHK-16', () => {
    for (const fixture of spec.fixtures) expect(fixture.props.label).toBeTruthy();
  });
});

describe('the specs\' motion and first-line sentences', () => {
  test('CHK-5: a part a STATE recolors (the box) moves over the state motion tokens, as the container does — at once under a press; a change of condition uses the selection motion', async () => {
    reduceMotion(false);
    const system = withCondition('selected', { hovered: { boxColor: literal(200, 0, 0) }, pressed: { boxColor: literal(0, 200, 0) } }, withCheckbox({ motionStateDuration: 30, motionSelectionDuration: 60 }));
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

  test('CHK-15: the control is centered on the label\'s FIRST line — from the type style\'s line height until the label is laid out, then from the measured first line', async () => {
    await mount();
    const control = tokens.containerSize;
    const lineHeight = Number(textStyle(part('label')!).lineHeight);
    const shift = (lineHeight - control) / 2;
    expect(viewStyle(part('container')!).marginTop).toBe(shift > 0 ? shift : undefined);
    expect(textStyle(part('label')!).marginTop).toBe(shift < 0 ? -shift : undefined);
    // Wrapped at a large text size: two lines of 44; the control moves down to the first line's center, not the block's.
    await fireEvent(part('label')!, 'textLayout', { nativeEvent: { lines: [{ x: 0, y: 0, width: 80, height: 44 }, { x: 0, y: 44, width: 60, height: 44 }] } });
    expect(viewStyle(part('container')!).marginTop).toBe(22 - control / 2);
    expect(textStyle(part('label')!).marginTop).toBeUndefined();
  });

  test('CHK-15: without a drawn label the control is not moved', async () => {
    await mount({ labelHidden: true });
    expect(viewStyle(part('container')!).marginTop).toBeUndefined();
  });
});
