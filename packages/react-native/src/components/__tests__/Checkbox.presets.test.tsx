// The shipped presets drive the same Checkbox with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiPaint, TanreiSystem } from '../../generated/vocabulary';
import { SHIPPED_SYSTEMS, byTestID, describeFixtureBaselines, describeSharedVocabulary, settleMotion, viewStyle } from '../../testing/harness';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { Checkbox, type CheckboxProps } from '../Checkbox';
import { checkboxSubject } from './Checkbox.subject';

const ID = 'checkbox';
const { host, part } = byTestID(ID);
const CONDITIONS = ['unselected', 'selected', 'indeterminate', 'errorUnselected', 'errorSelected', 'errorIndeterminate'] as const;

const propsOf: Record<(typeof CONDITIONS)[number], Partial<CheckboxProps>> = {
  unselected: {},
  selected: { value: true },
  indeterminate: { indeterminate: true },
  errorUnselected: { error: true },
  errorSelected: { error: true, value: true },
  errorIndeterminate: { error: true, indeterminate: true },
};

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor(system.colors.light[name]!);
const painted = (system: TanreiSystem, paint: TanreiPaint) => formatColor(evaluatePaint(paint, system.colors.light));

const mount = (system: TanreiSystem, props: Partial<CheckboxProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Checkbox testID={ID} label="Email me updates" {...props} />
    </TanreiProvider>,
  );

settleMotion();

describe('every shipped system values the Checkbox vocabulary', () => {
  describeSharedVocabulary(checkboxSubject);

  test.each(SHIPPED_SYSTEMS.map((system) => [system.id, system] as const))('%s has every core condition, each with the same parts in every state', (_id, system) => {
    const conditions = system.components.checkbox.conditions;
    expect(Object.keys(conditions)).toEqual([...CONDITIONS]);
    const parts = Object.keys(tanrei.components.checkbox.conditions.unselected.enabled).sort();
    for (const condition of CONDITIONS) for (const state of Object.values(conditions[condition])) expect(Object.keys(state).sort()).toEqual(parts);
  });
});

describe.each([
  ['m3-like', m3Like],
  ['m3-expressive-like', m3ExpressiveLike],
] as const)('%s drives the Checkbox', (_id, system) => {
  const tokens = system.components.checkbox;

  test('Material\'s geometry: an 18 box with a 2 corner in a 40 layer, outline and mark 2', async () => {
    expect([tokens.boxSize, tokens.boxShape, tokens.containerSize, tokens.outlineWidth, tokens.markWidth]).toEqual([18, 2, 40, 2, 2]);
    await mount(system, { value: true });
    expect(viewStyle(part('container')!)).toMatchObject({ width: 40, height: 40 });
    expect(viewStyle(part('box')!)).toMatchObject({ width: 18, height: 18, borderRadius: 2 });
    expect(viewStyle(part('outline')!).borderWidth).toBe(2);
    // The hit area still meets the minimum target: 40 needs 4 on each side.
    expect(host().props.hitSlop).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
  });

  test('the unchecked outline is on-surface-variant, and its state layer on-surface; checked and error are the default\'s roles', async () => {
    const unselected = tokens.conditions.unselected;
    expect(painted(system, unselected.enabled.outlineColor)).toBe(role(system, 'onSurfaceVariant'));
    expect(painted(system, unselected.enabled.stateLayerColor)).toBe(role(system, 'onSurface'));
    expect(painted(system, tokens.conditions.selected.enabled.boxColor)).toBe(role(system, 'primary'));
    expect(painted(system, tokens.conditions.errorSelected.enabled.boxColor)).toBe(role(system, 'error'));
    await mount(system);
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(part('container')!).backgroundColor).toBe(painted(system, { kind: 'mix', base: unselected.enabled.containerColor, with: unselected.enabled.stateLayerColor, amount: system.state.hoverStateLayerOpacity }));
  });

  test('CHK-10: it answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('cupertino drives the Checkbox', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.checkbox;

  test('the default\'s 16 box in a 28 layer, with cupertino\'s own extra-small corner (4); checked is the tint', async () => {
    expect([tokens.boxSize, tokens.containerSize, tokens.boxShape]).toEqual([16, 28, system.shape.extraSmall]);
    expect(tokens.boxShape).toBe(4);
    await mount(system, { value: true });
    expect(viewStyle(part('box')!)).toMatchObject({ width: 16, borderRadius: 4 });
    expect(viewStyle(part('fill')!).backgroundColor).toBe(role(system, 'primary'));
  });

  test.each(CONDITIONS)('%s: hover and keyboard focus draw no state layer', async (condition) => {
    await mount(system, propsOf[condition]);
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
    await fireEvent(host(), 'focus');
    expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
  });

  test('CHK-10 dim: a press dims the whole checkbox to 0.7 and draws no layer', async () => {
    await mount(system, { value: true });
    await fireEvent(host(), 'pressIn');
    expect(tokens.pressedOpacity).toBe(0.7);
    expect(viewStyle(host()).opacity).toBe(0.7);
    expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
    expect(screen.queryByTestId(`${ID}.container.ripple`, { includeHiddenElements: true })).toBeNull();
    await fireEvent(host(), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
    expect(viewStyle(host()).opacity).toBe(1);
  });

  test('CHK-11: the box, its fill, its outline and the focus ring use the continuous corner', async () => {
    await mount(system, { value: true });
    await fireEvent(host(), 'focus');
    for (const name of ['box', 'fill', 'outline', 'focus-ring']) expect(viewStyle(part(name)!).borderCurve).toBe('continuous');
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the checked box, where box, fill, mark and corner all show.
  describeFixtureBaselines(checkboxSubject, { systems: [m3Like, cupertino], fixtures: ['selected'] });
});
