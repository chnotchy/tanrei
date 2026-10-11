// Paint evaluation: a component color is described once and evaluated against the scheme at runtime.
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColor, TanreiPaint, TanreiScheme, TanreiSchemeColors } from '../../generated/vocabulary';
import { evaluatePaint, formatColor, mixColors, roleColor } from '../paint';

const { light, dark } = tanrei.colors;
const role = (name: keyof typeof light): TanreiPaint => ({ kind: 'role', role: name });
const NOTHING: TanreiPaint = { kind: 'none' };

/** Source-over compositing of `over` at `opacity` on an opaque `base`: what a state-layer overlay shows. */
const overlay = (base: TanreiColor, over: TanreiColor, opacity: number): TanreiColor => ({
  r: base.r * (1 - opacity) + over.r * opacity,
  g: base.g * (1 - opacity) + over.g * opacity,
  b: base.b * (1 - opacity) + over.b * opacity,
  a: 1,
});

describe('evaluatePaint', () => {
  test.each([['light', light], ['dark', dark]] as const)('role: the role color of the %s scheme', (_, colors) => {
    expect(evaluatePaint(role('primary'), colors)).toEqual(colors.primary);
    expect(evaluatePaint(role('elevationRing'), colors)).toEqual(colors.elevationRing);
  });

  test('scheme: a paint decided per scheme at build time (a palette tone, a contrast pick) evaluates the paint of the scheme being drawn', () => {
    const schemes = Object.keys(tanrei.colors) as TanreiScheme[];
    const by = Object.fromEntries(schemes.map((scheme) => [scheme, scheme.startsWith('dark') ? role('onSurface') : role('primary')])) as { [S in TanreiScheme]: TanreiPaint };
    const paint: TanreiPaint = { kind: 'scheme', by };
    expect(evaluatePaint(paint, light, 'light')).toEqual(light.primary);
    expect(evaluatePaint(paint, dark, 'dark')).toEqual(dark.onSurface);
    // Nested: the scheme reaches the inside of a mix / alpha.
    expect(evaluatePaint({ kind: 'alpha', of: paint, amount: 0.5 }, dark, 'dark')).toEqual({ ...dark.onSurface, a: 0.5 });
    // A caller that does not name the scheme gets the standard light one.
    expect(evaluatePaint(paint, light)).toEqual(light.primary);
  });

  test('role: light and dark differ, so one paint gives two colors', () => {
    expect(formatColor(evaluatePaint(role('surface'), light))).not.toBe(formatColor(evaluatePaint(role('surface'), dark)));
  });

  test.each([['light', light], ['dark', dark]] as const)('mix of two opaque roles in %s equals a state layer composited over the container', (_, colors) => {
    const paint: TanreiPaint = { kind: 'mix', base: role('secondaryContainer'), with: role('onSecondaryContainer'), amount: 0.08 };
    const result = evaluatePaint(paint, colors);
    expect(result.a).toBe(1);
    expect(formatColor(result)).toBe(formatColor(overlay(colors.secondaryContainer, colors.onSecondaryContainer, 0.08)));
  });

  test('mix is premultiplied, like CSS color-mix(in srgb)', () => {
    const black: TanreiPaint = { kind: 'literal', r: 0, g: 0, b: 0, a: 1 };
    const white: TanreiPaint = { kind: 'literal', r: 255, g: 255, b: 255, a: 1 };
    expect(formatColor(evaluatePaint({ kind: 'mix', base: black, with: white, amount: 0.5 }, light))).toBe('rgb(128, 128, 128)');
    // color-mix(in srgb, red 50%, rgb(0 0 255 / 0.5)) = rgb(170 0 85 / 0.75): the opaque color weighs more.
    const red: TanreiPaint = { kind: 'literal', r: 255, g: 0, b: 0, a: 1 };
    const halfBlue: TanreiPaint = { kind: 'literal', r: 0, g: 0, b: 255, a: 0.5 };
    expect(formatColor(evaluatePaint({ kind: 'mix', base: red, with: halfBlue, amount: 0.5 }, light))).toBe('rgba(170, 0, 85, 0.75)');
    // Amounts clamp to 0…1.
    expect(mixColors(light.primary, light.error, 2)).toEqual({ ...light.error });
    expect(mixColors(light.primary, light.error, -1)).toEqual({ ...light.primary });
  });

  test.each([['light', light], ['dark', dark]] as const)('mix with none in %s keeps the other color and scales its alpha', (_, colors) => {
    const paint: TanreiPaint = { kind: 'mix', base: NOTHING, with: role('onSurface'), amount: 0.1 };
    const { r, g, b } = colors.onSurface;
    expect(evaluatePaint(paint, colors)).toEqual({ r, g, b, a: 0.1 });
    expect(formatColor(evaluatePaint(paint, colors))).toBe(`rgba(${r}, ${g}, ${b}, 0.1)`);
  });

  test.each([['light', light], ['dark', dark]] as const)('alpha in %s multiplies the alpha, also of an already translucent role', (_, colors) => {
    const { r, g, b } = colors.onSurface;
    expect(formatColor(evaluatePaint({ kind: 'alpha', of: role('onSurface'), amount: 0.38 }, colors))).toBe(`rgba(${r}, ${g}, ${b}, 0.38)`);
    const ring = colors.elevationRing;
    expect(evaluatePaint({ kind: 'alpha', of: role('elevationRing'), amount: 0.5 }, colors).a).toBeCloseTo(ring.a * 0.5);
  });

  test('none draws nothing in every scheme; mixing nothing with nothing is nothing', () => {
    for (const colors of [light, dark]) {
      expect(evaluatePaint(NOTHING, colors).a).toBe(0);
      expect(evaluatePaint({ kind: 'mix', base: NOTHING, with: NOTHING, amount: 0.5 }, colors).a).toBe(0);
      expect(evaluatePaint({ kind: 'alpha', of: NOTHING, amount: 0.5 }, colors).a).toBe(0);
    }
    expect(formatColor(evaluatePaint(NOTHING, light))).toBe('rgba(0, 0, 0, 0)');
  });

  test('literal is the same in every scheme', () => {
    const paint: TanreiPaint = { kind: 'literal', r: 10, g: 20, b: 30, a: 0.5 };
    expect(evaluatePaint(paint, light)).toEqual(evaluatePaint(paint, dark));
    expect(formatColor(evaluatePaint(paint, dark))).toBe('rgba(10, 20, 30, 0.5)');
  });

  test('paints nest', () => {
    const hovered: TanreiPaint = { kind: 'mix', base: role('primary'), with: role('onPrimary'), amount: 0.08 };
    const dimmed = evaluatePaint({ kind: 'alpha', of: hovered, amount: 0.5 }, dark);
    expect(dimmed.a).toBe(0.5);
    expect(formatColor({ ...dimmed, a: 1 })).toBe(formatColor(evaluatePaint(hovered, dark)));
  });

  test('every button paint of the default system evaluates in all six schemes', () => {
    const paints: TanreiPaint[] = Object.values(tanrei.components.button.variants).flatMap((variant) =>
      Object.values(variant).flatMap((state) => [state.containerColor, state.labelColor, state.outlineColor]),
    );
    // 5 variants × (resting + 4 interaction states) × 3 paints.
    expect(paints).toHaveLength(75);
    for (const colors of Object.values(tanrei.colors)) {
      for (const paint of paints) expect(formatColor(evaluatePaint(paint, colors))).toMatch(/^rgba?\(/);
    }
  });
});

describe('formatColor', () => {
  test('rgb() when opaque, rgba() otherwise; channels round to 8 bits, alpha to three decimals', () => {
    expect(formatColor({ r: 27, g: 27, b: 27, a: 1 })).toBe('rgb(27, 27, 27)');
    expect(formatColor({ r: 27.4, g: 27.5, b: 300, a: 0.12345 })).toBe('rgba(27, 28, 255, 0.123)');
  });
});

describe('roleColor', () => {
  test('an unknown role falls back to the matching primary slot and warns once', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const colors: TanreiSchemeColors = light;
    const lookup = (name: string) => roleColor(colors, name as never);
    expect(lookup('tertiary')).toBe(light.primary);
    expect(lookup('onTertiary')).toBe(light.onPrimary);
    expect(lookup('tertiaryContainer')).toBe(light.primaryContainer);
    expect(lookup('onTertiaryContainer')).toBe(light.onPrimaryContainer);
    lookup('tertiary');
    expect(warn.mock.calls.filter(([message]) => String(message).includes('"tertiary"'))).toHaveLength(1);
    warn.mockRestore();
  });
});
