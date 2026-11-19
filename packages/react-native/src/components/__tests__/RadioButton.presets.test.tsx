// The shipped presets drive the same RadioButton with other values — "design systems differ in values, never in
// tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE; a literal appears only
// where a preset's value is pinned on purpose.
import { act, fireEvent, render } from '@testing-library/react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiPaint, TanreiSystem } from '../../generated/vocabulary';
import { SHIPPED_SYSTEMS, byTestID, describeFixtureBaselines, describeSharedVocabulary, settleMotion, viewStyle } from '../../testing/harness';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { RadioButton, type RadioButtonProps } from '../RadioButton';
import { radioButtonSubject } from './RadioButton.subject';

const ID = 'radio';
const { host, part } = byTestID(ID);
const CONDITIONS = ['unselected', 'selected'] as const;

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor(system.colors.light[name]!);
const painted = (system: TanreiSystem, paint: TanreiPaint) => formatColor(evaluatePaint(paint, system.colors.light));

const mount = (system: TanreiSystem, props: Partial<RadioButtonProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <RadioButton testID={ID} label="Weekly" value="weekly" {...props} />
    </TanreiProvider>,
  );

settleMotion();

describe('every shipped system values the RadioButton vocabulary', () => {
  describeSharedVocabulary(radioButtonSubject);

  test.each(SHIPPED_SYSTEMS.map((system) => [system.id, system] as const))('%s has both core conditions, each with the same parts in every state', (_id, system) => {
    const conditions = system.components.radioButton.conditions;
    expect(Object.keys(conditions)).toEqual([...CONDITIONS]);
    const parts = Object.keys(tanrei.components.radioButton.conditions.unselected.enabled).sort();
    for (const condition of CONDITIONS) for (const state of Object.values(conditions[condition])) expect(Object.keys(state).sort()).toEqual(parts);
  });
});

describe.each([
  ['m3-like', m3Like],
] as const)('%s drives the RadioButton', (_id, system) => {
  const tokens = system.components.radioButton;

  test('Material\'s geometry: a 20 ring stroked at 2 with a 10 dot, in a 40 layer', async () => {
    expect([tokens.ringSize, tokens.ringWidth, tokens.dotSize, tokens.containerSize]).toEqual([20, 2, 10, 40]);
    await mount(system, { selected: true });
    expect(viewStyle(part('ring')!)).toMatchObject({ width: 20, height: 20 });
    expect(viewStyle(part('ring.stroke')!).borderWidth).toBe(2);
    expect(viewStyle(part('dot')!)).toMatchObject({ width: 10, height: 10 });
    expect(host().props.hitSlop).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
  });

  test('the unselected ring is on-surface-variant and its state layer on-surface; selected ring and dot are primary', () => {
    expect(painted(system, tokens.conditions.unselected.enabled.ringColor)).toBe(role(system, 'onSurfaceVariant'));
    expect(painted(system, tokens.conditions.unselected.enabled.stateLayerColor)).toBe(role(system, 'onSurface'));
    expect(painted(system, tokens.conditions.selected.enabled.ringColor)).toBe(role(system, 'primary'));
    expect(painted(system, tokens.conditions.selected.enabled.dotColor)).toBe(role(system, 'primary'));
  });

  test('RAD-12: it answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('cupertino drives the RadioButton', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.radioButton;

  test('the default\'s 16 ring and 8 dot; the selected ring and dot are the tint', async () => {
    expect([tokens.ringSize, tokens.dotSize]).toEqual([16, 8]);
    await mount(system, { selected: true });
    expect(viewStyle(part('ring.stroke')!).borderColor).toBe(role(system, 'primary'));
    expect(viewStyle(part('dot')!).backgroundColor).toBe(role(system, 'primary'));
  });

  test.each(CONDITIONS)('%s: hover and keyboard focus draw no state layer', async (condition) => {
    await mount(system, { selected: condition === 'selected' });
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
    await fireEvent(host(), 'focus');
    expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
  });

  test('RAD-12 dim: a press dims the whole option to 0.7 and draws no layer', async () => {
    await mount(system, { selected: true });
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).opacity).toBe(0.7);
    expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
    await fireEvent(host(), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
    expect(viewStyle(host()).opacity).toBe(1);
  });

  test('RAD-13: the container takes the continuous corner', async () => {
    await mount(system);
    expect(viewStyle(part('container')!).borderCurve).toBe('continuous');
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the selected option, where ring, dot and color all show.
  describeFixtureBaselines(radioButtonSubject, { systems: [m3Like, cupertino], fixtures: ['selected'] });
});
