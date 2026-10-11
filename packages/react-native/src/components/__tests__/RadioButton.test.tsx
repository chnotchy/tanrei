// RadioButton and RadioGroup — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/radio-button.spec.json; every behaviour id is cited by the test that covers it.
import { createRef, useState, type ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import * as ReactNative from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCoreRadioButtonCondition, TanreiPaint, TanreiRadioButtonConditionStateTokens, TanreiRadioButtonConditions, TanreiRadioButtonTokens, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import type { InteractionState } from '../../primitives/interaction';
import { byTestID, describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { createTanreiTheme, TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { RadioButton, RadioGroup, type RadioButtonProps, type RadioButtonRef, type RadioGroupProps } from '../RadioButton';
import { acme } from './__fixtures__/acme';
import { radioButtonSubject } from './RadioButton.subject';

const spec = loadSpec('radio-button');
const { measure, state } = tanrei;
const colors: TanreiSystem['colors'] = tanrei.colors;
const tokens: TanreiRadioButtonTokens = tanrei.components.radioButton;
const ID = 'radio';
const LABEL = 'Weekly';

const { host, part } = byTestID(ID);

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));

const withRadio = (overrides: Partial<TanreiRadioButtonTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'radioButton', overrides);
const withCondition = (condition: TanreiCoreRadioButtonCondition, overrides: { [State in InteractionState]?: Partial<TanreiRadioButtonConditionStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.radioButton.conditions[condition];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as InteractionState], ...values }]));
  return withRadio({ conditions: { ...base.components.radioButton.conditions, [condition]: { ...current, ...changed } } as TanreiRadioButtonConditions }, base);
};

function element(props: Partial<RadioButtonProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }): ReactElement {
  return (
    <TanreiProvider {...provider}>
      <RadioButton testID={ID} label={LABEL} value="weekly" {...props} />
    </TanreiProvider>
  );
}
const mount = (props: Partial<RadioButtonProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) => render(element(props, provider));

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));

const CONDITIONS: TanreiCoreRadioButtonCondition[] = ['unselected', 'selected'];
const propsOf = (condition: TanreiCoreRadioButtonCondition): Partial<RadioButtonProps> => ({ selected: condition === 'selected' });
const shapeOf = (from: TanreiRadioButtonTokens, in_: InteractionState) =>
  ({
    enabled: { opacity: 1, shape: from.containerShape },
    hovered: { opacity: from.hoveredOpacity, shape: from.hoveredContainerShape },
    focused: { opacity: from.focusedOpacity, shape: from.focusedContainerShape },
    pressed: { opacity: from.pressedOpacity, shape: from.pressedContainerShape },
    disabled: { opacity: from.disabledOpacity, shape: from.disabledContainerShape },
  })[in_];

const click = (node = host()) => fireEvent(node, 'press', { nativeEvent: { target: 1 } });
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

/** Everything RAD-7 / RAD-10 name — container, ring, dot, label, opacity (and the shape) — from one state's tokens of one condition. */
function expectDrawnFrom(condition: TanreiCoreRadioButtonCondition, in_: InteractionState, from: TanreiRadioButtonTokens = tokens, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) {
  const t = from.conditions[condition][in_];
  const { opacity, shape } = shapeOf(from, in_);
  expect(viewStyle(host()).opacity).toBe(opacity);
  expect(viewStyle(part('container')!)).toMatchObject({ backgroundColor: fill(t.containerColor, scheme, system), borderRadius: shape });
  const ring = fill(t.ringColor, scheme, system);
  if (ring === undefined) expect(part('ring.stroke')).toBeNull();
  else expect(viewStyle(part('ring.stroke')!).borderColor).toBe(ring);
  if (condition === 'selected') expect(viewStyle(part('dot')!).backgroundColor).toBe(painted(t.dotColor, scheme, system));
  else expect(part('dot')).toBeNull();
  if (part('label')) expect(textStyle(part('label')!).color).toBe(painted(t.labelColor, scheme, system));
}

// ---------------------------------------------------------------------------------------------------------------
// A group of three options, controlled by the app (RAD-3 … RAD-5, RAD-16)

const OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const option = (value: string) => screen.getByTestId(`option.${value}`);
const group = () => screen.getByTestId('group');

function Group({ initial, disabled = [], onSelect, refs, groupProps }: { initial?: string; disabled?: string[]; onSelect?: (value: string) => void; refs?: Record<string, React.RefObject<RadioButtonRef | null>>; groupProps?: Partial<RadioGroupProps> }) {
  const [chosen, setChosen] = useState(initial);
  return (
    <TanreiProvider theme="light">
      <RadioGroup testID="group" accessibilityLabel="How often?" {...groupProps}>
        {OPTIONS.map((each) => (
          <RadioButton
            key={each.value}
            testID={`option.${each.value}`}
            ref={refs?.[each.value]}
            value={each.value}
            label={each.label}
            selected={chosen === each.value}
            disabled={disabled.includes(each.value)}
            onSelect={(next) => {
              onSelect?.(next);
              setChosen(next);
            }}
          />
        ))}
      </RadioGroup>
    </TanreiProvider>
  );
}
const checked = () => OPTIONS.map((each) => option(each.value).props.accessibilityState.checked);
const focusable = () => OPTIONS.map((each) => option(each.value).props.focusable);
const key = (name: string) => fireEvent(group(), 'keyDown', { nativeEvent: { key: name } });
/** `focus()` on a host view, spied: which option the group moved focus to. */
const focusSpy = () => jest.spyOn(View.prototype as unknown as { focus: () => void }, 'focus').mockImplementation(() => undefined);

beforeEach(() => {
  reduceMotion(true);
  resetLookupReports();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation: the spec\'s name is the RadioGroup', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(RadioButton.name);
    expect(platform.props).toEqual({ selected: 'selected', value: 'value', name: RadioGroup.name, disabled: 'disabled', label: 'label', labelHidden: 'labelHidden' });
    expect(platform.events).toEqual({ change: 'onSelect' });
  });

  test('the conditions under test are the token axis\'s core values', () => {
    expect(Object.keys(tokens.conditions)).toEqual(CONDITIONS);
  });

  test('defaults follow the spec: not selected, enabled, label drawn', async () => {
    await mount();
    expectDrawnFrom('unselected', 'enabled');
    expect(host().props.accessibilityState).toMatchObject({ disabled: false, checked: false });
    expect(part('label')!.props.children).toBe(LABEL);
  });
});

describe('selection (RAD-1, RAD-2, RAD-3, RAD-6)', () => {
  test('RAD-1: touch, a bare click (Space, Enter where the platform activates with it, assistive technology) and a press on the label each call onSelect once with the value', async () => {
    const onSelect = jest.fn();
    await mount({ onSelect });
    await fireEvent.press(host());
    await wait(HOLD + 30);
    await click();
    await wait(HOLD + 30);
    await fireEvent.press(part('label')!);
    expect(onSelect.mock.calls).toEqual([['weekly'], ['weekly'], ['weekly']]);
    expect(host().props.accessible).toBe(true);
    // Controlled: it does not select itself.
    expect(host().props.accessibilityState.checked).toBe(false);
  });

  test('RAD-2: activating an option that is already selected keeps it selected and emits nothing', async () => {
    const onSelect = jest.fn();
    const onPress = jest.fn();
    await mount({ selected: true, onSelect, onPress });
    await fireEvent.press(host());
    await click();
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(onSelect).not.toHaveBeenCalled();
    expect(host().props.accessibilityState.checked).toBe(true);
  });

  test('RAD-3: when an option becomes selected the others become unselected, and only the new one emits', async () => {
    const onSelect = jest.fn();
    await render(<Group initial="daily" onSelect={onSelect} />);
    expect(checked()).toEqual([true, false, false]);
    await fireEvent.press(option('monthly'));
    expect(checked()).toEqual([false, false, true]);
    expect(onSelect.mock.calls).toEqual([['monthly']]);
  });

  test('RAD-6: a disabled option does not change or call onSelect — touch, click or label — is not focusable and exposes disabled', async () => {
    const onSelect = jest.fn();
    await mount({ disabled: true, onSelect });
    await fireEvent.press(host());
    await click();
    await fireEvent.press(part('label')!);
    expect(onSelect).not.toHaveBeenCalled();
    expect(host().props.focusable).toBe(false);
    expect(host()).toBeDisabled();
    expect(screen.getByRole('radio', { name: LABEL, disabled: true })).toBe(host());
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'hoverIn');
    expect(part('focus-ring')).toBeNull();
    expectDrawnFrom('unselected', 'disabled');
  });
});

describe('the group (RAD-4, RAD-5, RAD-16)', () => {
  const refs = () => Object.fromEntries(OPTIONS.map((each) => [each.value, createRef<RadioButtonRef>()])) as Record<string, React.RefObject<RadioButtonRef | null>>;
  const focusedOption = (spy: jest.SpyInstance, all: Record<string, React.RefObject<RadioButtonRef | null>>) => {
    const target = spy.mock.contexts[spy.mock.contexts.length - 1];
    return Object.entries(all).find(([, ref]) => ref.current === target)?.[0];
  };

  test('RAD-4: Down and Right move focus to the next option and select it, wrapping from the last to the first', async () => {
    const focus = focusSpy();
    const all = refs();
    const onSelect = jest.fn();
    await render(<Group initial="daily" onSelect={onSelect} refs={all} />);
    await fireEvent(option('daily'), 'focus');
    await key('ArrowDown');
    expect(focusedOption(focus, all)).toBe('weekly');
    expect(checked()).toEqual([false, true, false]);
    await fireEvent(option('weekly'), 'focus');
    await key('ArrowRight');
    expect(focusedOption(focus, all)).toBe('monthly');
    await fireEvent(option('monthly'), 'focus');
    await key('ArrowDown');
    expect(focusedOption(focus, all)).toBe('daily');
    expect(checked()).toEqual([true, false, false]);
    expect(onSelect.mock.calls).toEqual([['weekly'], ['monthly'], ['daily']]);
  });

  test('RAD-4: Up and Left move to the previous option, wrapping from the first to the last; other keys do nothing', async () => {
    const focus = focusSpy();
    const all = refs();
    await render(<Group initial="daily" refs={all} />);
    await fireEvent(option('daily'), 'focus');
    await key('ArrowUp');
    expect(focusedOption(focus, all)).toBe('monthly');
    expect(checked()).toEqual([false, false, true]);
    await fireEvent(option('monthly'), 'focus');
    await key('ArrowLeft');
    expect(focusedOption(focus, all)).toBe('weekly');
    focus.mockClear();
    await key('Tab');
    await key('a');
    expect(focus).not.toHaveBeenCalled();
    expect(checked()).toEqual([false, true, false]);
  });

  test('RAD-4: in a right-to-left layout Right moves to the previous option and Left to the next', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    try {
      const focus = focusSpy();
      const all = refs();
      await render(<Group initial="weekly" refs={all} />);
      await fireEvent(option('weekly'), 'focus');
      await key('ArrowRight');
      expect(focusedOption(focus, all)).toBe('daily');
      await fireEvent(option('daily'), 'focus');
      await key('ArrowLeft');
      expect(focusedOption(focus, all)).toBe('weekly');
    } finally {
      rtl.restore();
    }
  });

  test('RAD-4: the caller\'s own onKeyDown on the group is still called', async () => {
    focusSpy();
    const onKeyDown = jest.fn();
    await render(<Group initial="daily" groupProps={{ onKeyDown } as Partial<RadioGroupProps>} />);
    await fireEvent(option('daily'), 'focus');
    await key('ArrowDown');
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(checked()).toEqual([false, true, false]);
  });

  test('RAD-4 / RAD-6: the arrow keys skip disabled options', async () => {
    const focus = focusSpy();
    const all = refs();
    await render(<Group initial="daily" disabled={['weekly']} refs={all} />);
    await fireEvent(option('daily'), 'focus');
    await key('ArrowDown');
    expect(focusedOption(focus, all)).toBe('monthly');
    expect(checked()).toEqual([false, false, true]);
  });

  test('RAD-5: exactly one option is in the tab order — the selected one, else the first enabled one', async () => {
    const view = await render(<Group initial="monthly" />);
    expect(focusable()).toEqual([false, false, true]);
    await fireEvent.press(option('weekly'));
    expect(focusable()).toEqual([false, true, false]);
    await view.unmount();

    const none = await render(<Group />);
    expect(focusable()).toEqual([true, false, false]);
    await none.unmount();

    await render(<Group disabled={['daily']} />);
    expect(focusable()).toEqual([false, true, false]);
  });

  test('RAD-5: an option outside a group is in the tab order on its own', async () => {
    await mount();
    expect(host().props.focusable).toBe(true);
  });

  test('RAD-16: each option is a radio with checked, its position and the group\'s size; the group is a radio group with the product\'s name', async () => {
    await render(<Group initial="weekly" />);
    // The group is a container, not one accessible element (that would merge its options into one): its role and name
    // are on the container view, which assistive technology announces on entering it (not yet checked on a device).
    expect(group().props).toMatchObject({ accessibilityRole: 'radiogroup', accessibilityLabel: 'How often?' });
    expect(group().props.accessible).toBeUndefined();
    expect(OPTIONS.map((each) => option(each.value).props.accessibilityValue.text)).toEqual(['1 of 3', '2 of 3', '3 of 3']);
    expect(screen.getByRole('radio', { name: 'Weekly', checked: true })).toBe(option('weekly'));
    expect(screen.getByRole('radio', { name: 'Daily', checked: false })).toBe(option('daily'));
  });

  test('RAD-16: the position text is the product\'s to word', async () => {
    await render(<Group groupProps={{ positionText: (position, count) => `${position}/${count}` }} />);
    expect(option('monthly').props.accessibilityValue.text).toBe('3/3');
  });

  test('RAD-16: an option added or removed later updates every position and the size', async () => {
    function Growing({ count }: { count: number }) {
      return (
        <TanreiProvider theme="light">
          <RadioGroup accessibilityLabel="Size">
            {OPTIONS.slice(0, count).map((each) => (
              <RadioButton key={each.value} testID={`option.${each.value}`} value={each.value} label={each.label} />
            ))}
          </RadioGroup>
        </TanreiProvider>
      );
    }
    const view = await render(<Growing count={2} />);
    expect(option('weekly').props.accessibilityValue.text).toBe('2 of 2');
    await view.rerender(<Growing count={3} />);
    expect(option('weekly').props.accessibilityValue.text).toBe('2 of 3');
    expect(option('monthly').props.accessibilityValue.text).toBe('3 of 3');
    await view.rerender(<Growing count={1} />);
    expect(option('daily').props.accessibilityValue.text).toBe('1 of 1');
  });

  test('RAD-16: iOS has no radio trait — an option also carries the selected state there; elsewhere it does not', async () => {
    const os = jest.replaceProperty(ReactNative.Platform, 'OS', 'ios');
    try {
      const view = await mount({ selected: true });
      expect(host().props.accessibilityState).toEqual({ disabled: false, checked: true, selected: true });
      await view.unmount();
    } finally {
      os.restore();
    }
    const android = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    try {
      await mount({ selected: true });
      expect(host().props.accessibilityState).toEqual({ disabled: false, checked: true });
    } finally {
      android.restore();
    }
  });
});

describe('conditions and states (RAD-7, RAD-10)', () => {
  test('RAD-7: hover, keyboard focus and press each draw the option from that state\'s tokens, and it returns', async () => {
    await mount({ selected: true });
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

  describe.each(CONDITIONS)('RAD-7: %s', (condition) => {
    test.each(['hovered', 'focused', 'pressed'] as const)('%s: container, ring, dot, label and opacity come from its tokens', async (target) => {
      await mount(propsOf(condition));
      await enter(target);
      expectDrawnFrom(condition, target);
    });
  });

  test('RAD-7: precedence is pressed over focused over hovered, under the acme fixture system (which values each differently)', async () => {
    const selected = acme.components.radioButton.conditions.selected;
    const expected = (name: InteractionState) => fill(selected[name].containerColor, 'light', acme);
    expect(new Set((['enabled', 'hovered', 'focused', 'pressed'] as const).map(expected)).size).toBe(4);
    await mount({ selected: true }, { theme: 'light', system: acme });
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

  test('RAD-7: in the default system the state layer is the condition\'s state-layer color (its ring color) at the state-layer opacity; the ring and dot keep their resting colors', async () => {
    for (const condition of CONDITIONS) {
      const view = await mount(propsOf(condition));
      const resting = tokens.conditions[condition].enabled;
      expect(painted(resting.stateLayerColor)).toBe(painted(resting.ringColor));
      const mix = (amount: number): TanreiPaint => ({ kind: 'mix', base: resting.containerColor, with: resting.stateLayerColor, amount });
      await fireEvent(host(), 'hoverIn');
      expect(viewStyle(part('container')!).backgroundColor).toBe(painted(mix(state.hoverStateLayerOpacity)));
      await fireEvent(host(), 'focus');
      expect(viewStyle(part('container')!).backgroundColor).toBe(painted(mix(state.focusStateLayerOpacity)));
      await fireEvent(host(), 'pressIn');
      expect(viewStyle(part('container')!).backgroundColor).toBe(painted(mix(state.pressedStateLayerOpacity)));
      expect(viewStyle(part('ring.stroke')!).borderColor).toBe(painted(resting.ringColor));
      await view.unmount();
    }
  });

  test('RAD-7: focus gained by touch or pointer does not select the focused state', async () => {
    const system = withCondition('unselected', { focused: { containerColor: literal(2, 0, 0) } });
    await mount({}, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    await release();
    expectDrawnFrom('unselected', 'enabled', system.components.radioButton, 'light', system);
  });

  test('RAD-7: state changes animate the state layer with the state motion tokens; a press is immediate', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ selected: true });
    expect(timing).not.toHaveBeenCalled();
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

  describe.each(CONDITIONS)('RAD-10: disabled %s', (condition) => {
    test('renders container, ring, dot, label and opacity from its disabled tokens', async () => {
      await mount({ ...propsOf(condition), disabled: true });
      expectDrawnFrom(condition, 'disabled');
    });
  });

  test('RAD-10: in the default system a disabled option keeps its round layer clear and fades ring, dot and label to on-surface 38 %', async () => {
    const faded = formatColor({ ...colors.light.onSurface, a: state.disabledContentOpacity });
    for (const condition of CONDITIONS) {
      const view = await mount({ ...propsOf(condition), disabled: true });
      expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
      expect(viewStyle(part('ring.stroke')!).borderColor).toBe(faded);
      expect(textStyle(part('label')!).color).toBe(faded);
      if (condition === 'selected') expect(viewStyle(part('dot')!).backgroundColor).toBe(faded);
      await view.unmount();
    }
  });
});

describe('press hold', () => {
  test('RAD-11: the pressed state appears in the same frame and stays visible for duration.pressHold although the press ended sooner', async () => {
    await mount();
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('unselected', 'pressed');
    await fireEvent(host(), 'pressOut');
    await wait(HOLD / 2);
    expectDrawnFrom('unselected', 'pressed');
    await wait(HOLD / 2 + 30);
    expectDrawnFrom('unselected', 'enabled');
  });

  test('RAD-11: Space / Enter / assistive activation — a bare click — shows the pressed state for the hold, in the NEW condition', async () => {
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <TanreiProvider theme="light">
          <RadioButton testID={ID} label={LABEL} value="weekly" selected={on} onSelect={() => setOn(true)} />
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

describe('choices of kind: system.behavior (RAD-12, RAD-13)', () => {
  const withBehavior = (overrides: Partial<TanreiSystem['behavior']>, base: TanreiSystem = tanrei): TanreiSystem => ({ ...base, behavior: { ...base.behavior, ...overrides } });
  const containerOnPage = (side: number, pageX: number, pageY: number) =>
    jest.spyOn(View.prototype as unknown as { measure: (callback: (...box: number[]) => void) => void }, 'measure').mockImplementation((callback) => callback(0, 0, side, side, pageX, pageY));

  test('RAD-12 overlay (the default): the pressed tokens reach the whole container at once; no ripple node exists', async () => {
    reduceMotion(false);
    await mount({ selected: true });
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(viewStyle(part('container')!).backgroundColor).toBe(painted(tokens.conditions.selected.pressed.containerColor));
    expect(part('container.ripple')).toBeNull();
    await release();
    await wait(tokens.motionStateDuration * 2);
  });

  test('RAD-12 ripple (m3-like): the pressed container color grows in the round container from the point of contact over comp.radio-button.motion.feedback-duration, and fades over the state duration; keyboard activation starts at the center', async () => {
    reduceMotion(false);
    const radio = m3Like.components.radioButton;
    const side = radio.containerSize;
    containerOnPage(side, 300, 500);
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ selected: true }, { theme: 'light', system: m3Like });
    timing.mockClear();
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 310, pageY: 530 } });
    const selected = radio.conditions.selected;
    expect(viewStyle(part('container')!).backgroundColor).toBe(fill(selected.enabled.containerColor, 'light', m3Like));
    const reach = Math.hypot(side - 10, 30);
    expect(viewStyle(part('container.ripple.wave')!)).toMatchObject({ left: 10 - reach, top: 30 - reach, backgroundColor: painted(selected.pressed.containerColor, 'light', m3Like) });
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: radio.motionFeedbackDuration, useNativeDriver: true });
    timing.mockClear();
    await release();
    expect(timing.mock.calls.some(([, config]) => config.toValue === 0 && config.duration === radio.motionStateDuration)).toBe(true);
    await wait(radio.motionStateDuration * 2 + 50);
    expect(part('container.ripple')).toBeNull();
    await view.unmount();

    await mount({}, { theme: 'light', system: m3Like });
    await click();
    const center = Math.hypot(side / 2, side / 2);
    expect(viewStyle(part('container.ripple.wave')!)).toMatchObject({ left: side / 2 - center, top: side / 2 - center });
    await wait(HOLD + radio.motionStateDuration * 2 + 80);
  });

  test('RAD-12: a press outside the round container (on the label) grows the ripple from the container\'s center', async () => {
    reduceMotion(false);
    const side = m3Like.components.radioButton.containerSize;
    containerOnPage(side, 300, 500);
    await mount({ selected: true }, { theme: 'light', system: m3Like });
    // Far beyond the container's end edge and below its top: on the label.
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 300 + side + 60, pageY: 500 + side / 2 + 3 } });
    const reach = Math.hypot(side / 2, side / 2);
    expect(viewStyle(part('container.ripple.wave')!)).toMatchObject({ left: side / 2 - reach, top: side / 2 - reach, width: reach * 2 });
    await release();
    await wait(m3Like.components.radioButton.motionStateDuration * 2 + 50);
  });

  test('RAD-12 ripple with reduced motion: nothing grows and the pressed tokens apply at once', async () => {
    await mount({}, { theme: 'light', system: m3Like });
    await fireEvent(host(), 'pressIn', { nativeEvent: { pageX: 10, pageY: 10 } });
    expect(part('container.ripple')).toBeNull();
    expect(viewStyle(part('container')!).backgroundColor).toBe(fill(m3Like.components.radioButton.conditions.unselected.pressed.containerColor, 'light', m3Like));
    await release();
  });

  test('RAD-12 dim: the pressed opacity on the whole control and NO state layer; ring, dot and label come from the pressed tokens', async () => {
    const system = withBehavior({ pressedFeedback: 'dim' }, withCondition('selected', { pressed: { ringColor: literal(10, 20, 30), dotColor: literal(40, 50, 60), labelColor: literal(70, 80, 90) } }, withRadio({ pressedOpacity: 0.5 })));
    await mount({ selected: true }, { theme: 'light', system });
    await fireEvent(host(), 'hoverIn');
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).opacity).toBe(0.5);
    expect(viewStyle(part('container')!).backgroundColor).toBe(painted(tokens.conditions.selected.hovered.containerColor));
    expect(viewStyle(part('ring.stroke')!).borderColor).toBe('rgb(10, 20, 30)');
    expect(viewStyle(part('dot')!).backgroundColor).toBe('rgb(40, 50, 60)');
    expect(textStyle(part('label')!).color).toBe('rgb(70, 80, 90)');
    await release();
  });

  test('RAD-12 none: no answer to the press — every part stays with the state under the press; selection still happens', async () => {
    const onSelect = jest.fn();
    const system = withBehavior({ pressedFeedback: 'none' }, withCondition('unselected', { pressed: { containerColor: literal(1, 2, 3), ringColor: literal(4, 5, 6) } }, withRadio({ pressedOpacity: 0.5 })));
    await mount({ onSelect }, { theme: 'light', system });
    await fireEvent(host(), 'pressIn');
    expectDrawnFrom('unselected', 'enabled', system.components.radioButton, 'light', system);
    await fireEvent.press(host());
    expect(onSelect).toHaveBeenCalledWith('weekly');
    await release();
  });

  test('RAD-13 corner smoothing: an amount above 0 (cupertino) reaches the container; the ring is a circle and stays one', async () => {
    const view = await mount({ selected: true });
    expect(viewStyle(part('container')!).borderCurve).toBeUndefined();
    await view.unmount();
    await mount({ selected: true }, { theme: 'light', system: cupertino });
    expect(viewStyle(part('container')!).borderCurve).toBe('continuous');
    expect(viewStyle(part('ring')!).borderRadius).toBe(cupertino.components.radioButton.ringSize / 2);
  });

  test('RAD-13 focus-style: glow (acme) draws the focus colors as ONE halo around the ring', async () => {
    await mount({}, { theme: 'light', system: acme });
    await fireEvent(host(), 'focus');
    const { offset, innerWidth, outerWidth } = acme.measure.focus;
    expect(viewStyle(part('focus-ring')!)).toMatchObject({
      borderRadius: acme.components.radioButton.ringSize / 2 + offset,
      boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: outerWidth, spreadDistance: innerWidth + outerWidth, color: painted({ kind: 'role', role: 'focusRing' }, 'light', acme) }],
    });
  });
});

describe('focus and target (RAD-8, RAD-9)', () => {
  test('RAD-8: keyboard focus shows the focus ring at the focus offset around the RING, without animation; touch focus does not', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mount();
    await fireEvent(host(), 'focus');
    const ring = part('focus-ring')!;
    const reach = measure.focus.offset + measure.focus.innerWidth + measure.focus.outerWidth;
    expect(viewStyle(ring)).toMatchObject({ top: -reach, left: -reach, borderWidth: measure.focus.outerWidth, borderColor: formatColor(colors.light.focusRing!), borderRadius: tokens.ringSize / 2 + reach });
    expect(part('ring')!.children).toContain(ring);
    expect(timing).not.toHaveBeenCalled();
    await fireEvent(host(), 'blur');
    await fireEvent(host(), 'pressIn');
    await fireEvent(host(), 'focus');
    expect(part('focus-ring')).toBeNull();
    await release();
  });

  test('RAD-9: the hit area reaches sys.target.touch on both axes — the container\'s square before layout, the whole row (label included) after — without changing the visual size', async () => {
    await mount();
    const side = tokens.containerSize;
    const slop = (measure.target.touch - side) / 2;
    expect(host().props.hitSlop).toEqual({ top: slop, bottom: slop, left: slop, right: slop });
    await fireEvent(host(), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 120, height: side } } });
    expect(host().props.hitSlop).toEqual({ top: slop, bottom: slop, left: 0, right: 0 });
    expect(host().children).toContain(part('label'));
    expect(viewStyle(part('container')!)).toMatchObject({ width: side, height: side });
  });
});

describe('geometry and motion (RAD-14, RAD-15)', () => {
  test('RAD-14: a ring of ring.size stroked at ring.width inside it, centered in a round container of container.size; a dot of dot.size while selected, none while unselected', async () => {
    const view = await mount({ selected: true });
    expect(viewStyle(part('container')!)).toMatchObject({ width: tokens.containerSize, height: tokens.containerSize, borderRadius: tokens.containerShape, alignItems: 'center', justifyContent: 'center' });
    expect(viewStyle(part('ring')!)).toMatchObject({ width: tokens.ringSize, height: tokens.ringSize, borderRadius: tokens.ringSize / 2, alignItems: 'center', justifyContent: 'center' });
    expect(viewStyle(part('ring.stroke')!)).toMatchObject({ position: 'absolute', top: 0, left: 0, borderWidth: tokens.ringWidth, borderRadius: tokens.ringSize / 2 });
    expect(viewStyle(part('dot')!)).toMatchObject({ width: tokens.dotSize, height: tokens.dotSize, borderRadius: tokens.dotSize / 2, transform: [{ scale: 1 }] });
    await view.unmount();
    await mount();
    expect(part('dot')).toBeNull();
  });

  test('RAD-15: becoming selected grows the dot from the ring\'s center and moves the ring color over the selection motion tokens; becoming unselected shrinks it back', async () => {
    reduceMotion(false);
    const system = withRadio({ motionSelectionDuration: 40 });
    const timing = jest.spyOn(Animated, 'timing');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    const view = await mount({}, { theme: 'light', system });
    timing.mockClear();
    await view.rerender(element({ selected: true }, { theme: 'light', system }));
    expect(timing.mock.calls.filter(([, config]) => config.duration === 40)).toHaveLength(2);
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    expect(ranges).toContainEqual([0, 1]);
    expect(ranges).toContainEqual([painted(tokens.conditions.unselected.enabled.ringColor), painted(tokens.conditions.selected.enabled.ringColor)]);
    // Scaled about its own center — the ring centers it.
    expect(part('dot')).not.toBeNull();
    expect(viewStyle(part('dot')!).transformOrigin).toBeUndefined();
    await wait(120);
    expect(viewStyle(part('dot')!).transform).toEqual([{ scale: 1 }]);
    interpolate.mockClear();
    await view.rerender(element({}, { theme: 'light', system }));
    expect(interpolate.mock.calls.map(([config]) => config.outputRange)).toContainEqual([1, 0]);
    expect(part('dot')).not.toBeNull();
    await wait(120);
    expect(part('dot')).toBeNull();
  });

  test('RAD-15: where motion is reduced the new condition shows at once', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount();
    await view.rerender(element({ selected: true }));
    expect(timing).not.toHaveBeenCalled();
    expectDrawnFrom('selected', 'enabled');
  });

  test('RAD-15: the selection easing is the token\'s', async () => {
    reduceMotion(false);
    const bezier = jest.spyOn(Easing, 'bezier');
    await mount();
    expect(bezier).toHaveBeenCalledWith(...tokens.motionSelectionEasing);
  });
});

describe('the label (RAD-17, RAD-18)', () => {
  test('RAD-17: the label sits at the inline end of the container, label.gap away, in label.typescale, wrapping rather than truncating', async () => {
    await mount();
    expect(viewStyle(host())).toMatchObject({ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.labelGap });
    expect(host().children.indexOf(part('container')!)).toBeLessThan(host().children.indexOf(part('label')!));
    expect(textStyle(part('label')!)).toMatchObject({ ...createTanreiTheme(tanrei, 'light').text(tokens.labelTypescale), flexShrink: 1 });
    expect(part('label')!.props.numberOfLines).toBeUndefined();
    expect(part('label')!.props.allowFontScaling).toBe(true);
  });

  test('RAD-17: right-to-left layouts mirror the order — the row is logical, nothing is placed by left or right', async () => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    try {
      await mount();
      const row = viewStyle(host());
      expect(row.flexDirection).toBe('row');
      for (const name of ['left', 'right', 'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight'] as const) expect(row[name]).toBeUndefined();
    } finally {
      rtl.restore();
    }
  });

  test('RAD-18: labelHidden draws no label and keeps label as the accessible name', async () => {
    await mount({ labelHidden: true, selected: true });
    expect(part('label')).toBeNull();
    expect(screen.getByRole('radio', { name: LABEL })).toBe(host());
  });

  describe('RAD-18: an unnamed option', () => {
    const development = (enabled: boolean) => {
      (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
    };
    afterEach(() => development(true));
    const reports = (spy: jest.SpyInstance) => spy.mock.calls.filter(([message]) => String(message).includes('has no label'));

    test('still renders and works, and development builds report it', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const onSelect = jest.fn();
      await mount({ label: '', onSelect });
      expect(host().props.accessibilityRole).toBe('radio');
      await fireEvent.press(host());
      expect(onSelect).toHaveBeenCalledWith('weekly');
      expect(reports(warn)).toHaveLength(1);
    });

    test('a release build says nothing', async () => {
      development(false);
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      await mount({ label: '' });
      expect(warn).not.toHaveBeenCalled();
    });
  });
});

describe('accessibility', () => {
  test('the parts are decorative — hidden from assistive technology and from touches; one accessible element per option', async () => {
    await mount({ selected: true });
    await fireEvent(host(), 'focus');
    for (const name of ['ring.stroke', 'focus-ring']) {
      expect(part(name)!.props.accessible).toBe(false);
      expect(viewStyle(part(name)!).pointerEvents).toBe('none');
    }
    expect(viewStyle(part('dot')!).pointerEvents).toBe('none');
    expect(screen.getAllByRole('radio')).toHaveLength(1);
  });

  test('forwards its ref to the underlying host view and passes caller handlers and layout style through', async () => {
    const ref = createRef<RadioButtonRef>();
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await mount({ ref, onFocus, onBlur, style: { marginTop: 4 } });
    expect(ref.current).not.toBeNull();
    await fireEvent(host(), 'focus');
    await fireEvent(host(), 'blur');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(viewStyle(host()).marginTop).toBe(4);
  });
});

describe('the open condition axis', () => {
  test('a system that adds a condition value leaves both core conditions drawn as before, and nothing is reported', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const product = withRadio({ conditions: { ...tokens.conditions, recommended: tokens.conditions.selected } as TanreiRadioButtonConditions });
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

  test('the default geometry: a 16 ring stroked at 1 with an 8 dot, in a 28 container, label 4 away in body', () => {
    expect([tokens.ringSize, tokens.ringWidth, tokens.dotSize, tokens.containerSize, tokens.labelGap, tokens.labelTypescale]).toEqual([16, 1, 8, 28, 4, 'body']);
  });

  test('re-valued sizes reach the container, the ring, its stroke, the dot, the gap and the target', async () => {
    const system = withRadio({ containerSize: 40, ringSize: 20, ringWidth: 2, dotSize: 10, labelGap: 12 });
    await mount({ selected: true }, { theme: 'light', system });
    expect(viewStyle(part('container')!)).toMatchObject({ width: 40, height: 40 });
    expect(viewStyle(part('ring')!)).toMatchObject({ width: 20, borderRadius: 10 });
    expect(viewStyle(part('ring.stroke')!).borderWidth).toBe(2);
    expect(viewStyle(part('dot')!)).toMatchObject({ width: 10, height: 10 });
    expect(viewStyle(host()).gap).toBe(12);
    expect(host().props.hitSlop).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(radioButtonSubject);

  test('every fixture names the option and puts it in a group', () => {
    for (const fixture of spec.fixtures) {
      expect(fixture.props.label).toBeTruthy();
      expect(fixture.props.name).toBeTruthy();
    }
  });
});

describe('the specs\' motion and first-line sentences', () => {
  test('RAD-7: a part a STATE recolors (the ring) moves over the state motion tokens, as the container does — at once under a press; a change of condition uses the selection motion', async () => {
    reduceMotion(false);
    const system = withCondition('selected', { hovered: { ringColor: literal(200, 0, 0) }, pressed: { ringColor: literal(0, 200, 0) } }, withRadio({ motionStateDuration: 30, motionSelectionDuration: 60 }));
    const timing = jest.spyOn(Animated, 'timing');
    const view = await mount({ selected: true }, { theme: 'light', system });
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
    await view.rerender(element({ selected: false }, { theme: 'light', system }));
    // The condition changed: the part moves over the selection duration (the container still over the state one).
    expect(timing.mock.calls.filter(([, config]) => config.duration === 60).length).toBeGreaterThanOrEqual(1);
    await wait(120);
  });

  test('RAD-17: the control is centered on the label\'s FIRST line — from the type style\'s line height until the label is laid out, then from the measured first line', async () => {
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

  test('RAD-17: without a drawn label the control is not moved', async () => {
    await mount({ labelHidden: true });
    expect(viewStyle(part('container')!).marginTop).toBeUndefined();
  });
});
