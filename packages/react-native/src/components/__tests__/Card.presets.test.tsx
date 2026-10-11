// The shipped presets drive the same Card with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render } from '@testing-library/react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiCoreCardVariant, TanreiSystem } from '../../generated/vocabulary';
import { byTestID, describeFixtureBaselines, describeSharedVocabulary, settleMotion, viewStyle } from '../../testing/harness';
import { resolveElevation } from '../../theme/elevation';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { Card, type CardProps } from '../Card';
import { cardSubject } from './Card.subject';

const ID = 'card';
const variants: TanreiCoreCardVariant[] = ['elevated', 'filled', 'outlined'];
const { host, part } = byTestID(ID);

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);

const mount = (system: TanreiSystem, props: Partial<CardProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Card testID={ID} accessibilityLabel="Quarterly report" onPress={() => undefined} {...props}>
        Quarterly report
      </Card>
    </TanreiProvider>,
  );

settleMotion();

describe('every shipped system values the Card vocabulary', () => {
  describeSharedVocabulary(cardSubject);
});

describe('m3-like drives the Card', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.card;

  test('corners of the medium shape (12), an elevated card on surface-container-low', async () => {
    expect(tokens.containerShape).toBe(system.shape.medium);
    expect(tokens.containerShape).toBe(12);
    await mount(system, { variant: 'elevated' });
    expect(viewStyle(host())).toMatchObject({ borderRadius: 12, backgroundColor: role(system, 'surfaceContainerLow') });
  });

  test('the elevated card rests at the preset\'s own level1 and hovers at level2', () => {
    expect(tokens.variants.elevated.enabled.containerElevation).toBe('level1');
    expect(tokens.variants.elevated.hovered.containerElevation).toBe('level2');
  });

  test.each(variants)('%s rises one level on hover (Material raises every card)', async (variant) => {
    await mount(system, { variant });
    await fireEvent(host(), 'hoverIn');
    const rest = tokens.variants[variant].enabled.containerElevation;
    const hovered = tokens.variants[variant].hovered.containerElevation;
    expect(Number(hovered.replace('level', ''))).toBe(Number(rest.replace('level', '')) + 1);
    const color = (name: TanreiColorRole) => role(system, name);
    const resolved = resolveElevation(system.elevation[hovered], color);
    expect(viewStyle(host()).boxShadow).toEqual(resolved.boxShadow.length ? resolved.boxShadow : undefined);
  });

  test('CRD-9: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the Card', () => {
  test('it inherits m3-like\'s card', () => {
    expect(m3ExpressiveLike.components.card).toEqual(m3Like.components.card);
  });
});

describe('cupertino drives the Card', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.card;

  test('corners of 10 with the continuous curve; the filled card is surface-container-highest, not the white surface it sits on', async () => {
    expect(tokens.containerShape).toBe(10);
    await mount(system, { variant: 'filled' });
    expect(viewStyle(host())).toMatchObject({ borderRadius: 10, borderCurve: 'continuous', backgroundColor: role(system, 'surfaceContainerHighest') });
    expect(role(system, 'surfaceContainerHighest')).not.toBe(role(system, 'surface'));
    expect(viewStyle(part('content')!).borderCurve).toBe('continuous');
  });

  test.each(variants)('%s: hover and keyboard focus draw exactly like the resting state (no state layer, no rise)', async (variant) => {
    await mount(system, { variant });
    const resting = { ...viewStyle(host()) };
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host())).toEqual(resting);
    await fireEvent(host(), 'hoverOut');
    await fireEvent(host(), 'focus');
    expect(viewStyle(host()).backgroundColor).toBe(resting.backgroundColor);
  });

  test.each(variants)('CRD-9 dim: %s pressed dims the whole card to 0.7 and keeps its colors', async (variant) => {
    await mount(system, { variant });
    const resting = viewStyle(host()).backgroundColor;
    await fireEvent(host(), 'pressIn');
    expect(tokens.pressedOpacity).toBe(0.7);
    expect(viewStyle(host())).toMatchObject({ opacity: 0.7, backgroundColor: resting });
    expect(part('ripple')).toBeNull();
    await fireEvent(host(), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
    expect(viewStyle(host()).opacity).toBe(1);
  });

  test('the elevated card rests at the preset\'s own level1 (a shadow) and does not rise', async () => {
    for (const name of ['enabled', 'hovered', 'focused', 'pressed'] as const) expect(tokens.variants.elevated[name].containerElevation).toBe('level1');
    await mount(system, { variant: 'elevated' });
    const resting = resolveElevation(system.elevation.level1, (name) => role(system, name));
    expect(resting.boxShadow.length).toBeGreaterThan(0);
    expect(viewStyle(host()).boxShadow).toEqual(resting.boxShadow);
  });

  test('its values are not the default system\'s', () => {
    expect(tokens.containerShape).not.toBe(tanrei.components.card.containerShape);
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the default outlined card — plus the elevated one, where the
  // presets differ most (surface and shadow).
  describeFixtureBaselines(cardSubject, { systems: [m3Like, cupertino], fixtures: ['outlined', 'elevated'] });
});
