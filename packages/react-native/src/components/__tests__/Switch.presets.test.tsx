// The shipped presets drive the same Switch with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render } from '@testing-library/react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiPaint, TanreiSystem } from '../../generated/vocabulary';
import { SHIPPED_SYSTEMS, byTestID, describeFixtureBaselines, describeSharedVocabulary, settleMotion, viewStyle } from '../../testing/harness';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { createTanreiTheme, TanreiProvider } from '../../theme/TanreiProvider';
import { Switch, type SwitchProps } from '../Switch';
import { switchSubject } from './Switch.subject';

const ID = 'switch';
const { host, part } = byTestID(ID);
const CONDITIONS = ['unselected', 'selected'] as const;

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor(system.colors.light[name]!);
const painted = (system: TanreiSystem, paint: TanreiPaint) => formatColor(evaluatePaint(paint, system.colors.light));

const mount = (system: TanreiSystem, props: Partial<SwitchProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Switch testID={ID} label="Wi-Fi" {...props} />
    </TanreiProvider>,
  );

settleMotion();
beforeEach(() => {
  // Every shipped preset draws a selected glyph with the FILL axis of one variable font (SWT-12, README "Icons").
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('every shipped system values the Switch vocabulary', () => {
  describeSharedVocabulary(switchSubject);

  test.each(SHIPPED_SYSTEMS.map((system) => [system.id, system] as const))('%s has both core conditions, each with the same parts in every state', (_id, system) => {
    const conditions = system.components.switch.conditions;
    expect(Object.keys(conditions)).toEqual([...CONDITIONS]);
    const parts = Object.keys(tanrei.components.switch.conditions.unselected.enabled).sort();
    for (const condition of CONDITIONS) for (const state of Object.values(conditions[condition])) expect(Object.keys(state).sort()).toEqual(parts);
  });
});

describe.each([
  ['m3-like', m3Like],
  ['m3-expressive-like', m3ExpressiveLike],
] as const)('%s drives the Switch', (_id, system) => {
  const tokens = system.components.switch;

  test('Material\'s geometry: a 52 × 32 track with a 2 outline and a 40 layer; the handle 16 off, 24 on, 24 with a glyph', async () => {
    expect([tokens.trackWidth, tokens.trackHeight, tokens.outlineWidth, tokens.containerSize, tokens.handleSizeWithIcon]).toEqual([52, 32, 2, 40, 24]);
    expect([tokens.conditions.unselected.enabled.handleSize, tokens.conditions.selected.enabled.handleSize]).toEqual([16, 24]);
    const off = await mount(system);
    expect(viewStyle(part('handle')!)).toMatchObject({ width: 16, height: 16 });
    expect(viewStyle(part('container')!)).toMatchObject({ width: 40, start: 16 - 20, top: -4 });
    await off.unmount();
    const withGlyph = await mount(system, { selectedIcon: 'check', unselectedIcon: 'close' });
    expect(viewStyle(part('handle')!)).toMatchObject({ width: 24, height: 24 });
    await withGlyph.unmount();
    await mount(system, { value: true });
    expect(viewStyle(part('handle')!)).toMatchObject({ width: 24, height: 24 });
    expect(viewStyle(part('container')!).start).toBe(52 - 16 - 20);
  });

  test.each(CONDITIONS)('SWT-3: %s — a press grows the handle to 28, and it returns', async (condition) => {
    expect(tokens.conditions[condition].pressed.handleSize).toBe(28);
    await mount(system, { value: condition === 'selected' });
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(part('handle')!)).toMatchObject({ width: 28, height: 28, borderRadius: 14 });
    await fireEvent(host(), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
    expect(viewStyle(part('handle')!).width).toBe(tokens.conditions[condition].enabled.handleSize);
  });

  test('Material\'s colors: off outline and handle, on primary track with an on-primary handle; the handle darkens under hover', async () => {
    const off = tokens.conditions.unselected;
    const on = tokens.conditions.selected;
    expect(painted(system, off.enabled.trackColor)).toBe(role(system, 'surfaceContainerHighest'));
    expect(painted(system, off.enabled.handleColor)).toBe(role(system, 'outline'));
    expect(painted(system, on.enabled.trackColor)).toBe(role(system, 'primary'));
    expect(painted(system, on.enabled.handleColor)).toBe(role(system, 'onPrimary'));
    expect(painted(system, off.hovered.handleColor)).toBe(role(system, 'onSurfaceVariant'));
    expect(painted(system, on.hovered.handleColor)).toBe(role(system, 'primaryContainer'));
    await mount(system, { value: true });
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(part('handle')!).backgroundColor).toBe(role(system, 'primaryContainer'));
  });

  test('SWT-8: it answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('cupertino drives the Switch', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.switch;

  test('Apple\'s geometry: a 51 × 31 track, a 27 handle on and off, glyph or not', async () => {
    expect([tokens.trackWidth, tokens.trackHeight, tokens.handleSizeWithIcon]).toEqual([51, 31, 27]);
    for (const props of [{}, { value: true }, { value: true, selectedIcon: 'check' }] as Partial<SwitchProps>[]) {
      const view = await mount(system, props);
      expect(viewStyle(part('handle')!)).toMatchObject({ width: 27, height: 27 });
      await view.unmount();
    }
  });

  test('the handle is on-primary in both conditions, raised at level 1; on is the tint, not green; off has no visible outline', async () => {
    for (const condition of CONDITIONS) {
      const view = await mount(system, { value: condition === 'selected' });
      const t = tokens.conditions[condition].enabled;
      expect(viewStyle(part('handle')!).backgroundColor).toBe(role(system, 'onPrimary'));
      expect(t.handleElevation).toBe('level1');
      expect(viewStyle(part('handle')!).boxShadow).toEqual(createTanreiTheme(system, 'light').elevation('level1').boxShadow);
      expect(painted(system, t.outlineColor)).toBe(painted(system, t.trackColor));
      await view.unmount();
    }
    expect(painted(system, tokens.conditions.selected.enabled.trackColor)).toBe(role(system, 'primary'));
  });

  test.each(CONDITIONS)('%s: hover and keyboard focus draw no state layer', async (condition) => {
    await mount(system, { value: condition === 'selected' });
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
    await fireEvent(host(), 'focus');
    expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
  });

  test('SWT-8 dim: a press dims the whole switch to 0.7 and draws no layer', async () => {
    await mount(system, { value: true });
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).opacity).toBe(0.7);
    expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
    await fireEvent(host(), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
    expect(viewStyle(host()).opacity).toBe(1);
  });

  test('SWT-9: the track, its fill and outline, the layer and the focus ring use the continuous corner', async () => {
    await mount(system, { value: true });
    await fireEvent(host(), 'focus');
    for (const name of ['track', 'track.fill', 'outline', 'container', 'focus-ring']) expect(viewStyle(part(name)!).borderCurve).toBe('continuous');
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the switch that is on, where track, handle and travel show.
  describeFixtureBaselines(switchSubject, { systems: [m3Like, cupertino], fixtures: ['selected'] });
});
