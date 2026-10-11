// The pure parts of the building blocks every pressable control shares. Their rendered behaviour is covered through
// Button (Button.test.tsx: BTN-3…BTN-10, the elevation transition, the label and icon slot).
import { Animated } from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import { resolveElevationLayers } from '../../theme/elevation';
import { roleColor } from '../../theme/paint';
import { drawsColor, fillOf, partTestID, textContent } from '../content';
import { elevationVisuals, shadowLayerCount } from '../elevationTransition';
import { INTERACTION_STATES, resolveInteractionState } from '../interaction';

const layers = (level: keyof typeof tanrei.elevation) => resolveElevationLayers(tanrei.elevation[level], (role) => roleColor(tanrei.colors.light, role));

describe('INTERACTION_STATES', () => {
  test('is every state resolveInteractionState can return, resting first', () => {
    const reachable = new Set(
      [false, true].flatMap((disabled) => [false, true].flatMap((pressed) => [false, true].flatMap((focused) => [false, true].map((hovered) => resolveInteractionState({ disabled, pressed, focused, hovered }))))),
    );
    expect([...INTERACTION_STATES].sort()).toEqual([...reachable].sort());
    expect(INTERACTION_STATES[0]).toBe('enabled');
  });
});

describe('elevation as flat values', () => {
  test('shadowLayerCount is the most shadow layers of the given elevations; none → 0', () => {
    expect(shadowLayerCount([])).toBe(0);
    expect(shadowLayerCount([layers('level0')])).toBe(0);
    expect(shadowLayerCount([layers('level0'), layers('level3'), layers('level1')])).toBe(Math.max(layers('level3').shadows.length, layers('level1').shadows.length));
  });

  test('elevationVisuals pads a shorter list with layers that draw nothing', () => {
    const count = layers('level3').shadows.length;
    const flat = elevationVisuals(layers('level0'), count);
    expect(Object.keys(flat)).toHaveLength(1 + count * 5);
    expect(flat.ringColor).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(flat[`shadow${count - 1}Color`]).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    const full = elevationVisuals(layers('level3'), count);
    expect(full.shadow0Y).toBe(layers('level3').shadows[0]!.y);
    expect(full.shadow0Color).toEqual(layers('level3').shadows[0]!.color);
  });
});

describe('content', () => {
  test('textContent: strings and numbers are one label; anything else names nothing', () => {
    expect(textContent('Deploy')).toEqual({ textOnly: true, text: 'Deploy' });
    expect(textContent(['Deploy ', 2])).toEqual({ textOnly: true, text: 'Deploy 2' });
    expect(textContent(undefined)).toEqual({ textOnly: false, text: undefined });
    expect(textContent(['Deploy', <Animated.View key="x" />])).toEqual({ textOnly: false, text: undefined });
  });

  test('partTestID derives from the host id, and is absent without one', () => {
    expect(partTestID('button', 'label')).toBe('button.label');
    expect(partTestID(undefined, 'label')).toBeUndefined();
  });

  test('a settled color that resolves to nothing is not drawn; a moving one always is', () => {
    const none = { r: 0, g: 0, b: 0, a: 0 };
    const some = { r: 1, g: 2, b: 3, a: 1 };
    const moving = new Animated.Value(0).interpolate({ inputRange: [0, 1], outputRange: ['rgba(0, 0, 0, 0)', 'rgb(1, 2, 3)'] });
    expect(drawsColor(none, 'rgba(0, 0, 0, 0)')).toBe(false);
    expect(fillOf(none, 'rgba(0, 0, 0, 0)')).toBeUndefined();
    expect(drawsColor(some, 'rgb(1, 2, 3)')).toBe(true);
    expect(fillOf(some, 'rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)');
    expect(drawsColor(none, moving)).toBe(true);
    expect(fillOf(none, moving)).toBe(moving);
  });
});
