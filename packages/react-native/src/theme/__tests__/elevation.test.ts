// Shadows have CSS box-shadow semantics. theme/elevation.ts is the ONE
// place where a shadow token becomes a React Native quantity; these are its conversions.
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColor, TanreiColorRole, TanreiElevationLayer, TanreiSchemeColors } from '../../generated/vocabulary';
import { resolveElevation, resolveElevationLayers, shadowSigma, supportsBoxShadow, toAndroidElevation, toBoxShadowBlur, toLegacyShadow, toShadowRadius } from '../elevation';
import { formatColor } from '../paint';

const colors: TanreiSchemeColors = tanrei.colors.light;
const structured = (role: TanreiColorRole): TanreiColor => colors[role]!;
const color = (role: TanreiColorRole) => formatColor(structured(role));
const layer = (l: Partial<TanreiElevationLayer>): TanreiElevationLayer => ({ x: 0, y: 0, blur: 0, spread: 0, role: 'elevationShadow1', ...l });

describe('the conversion of a CSS blur radius', () => {
  test('σ = blur / 2', () => {
    expect(shadowSigma(8)).toBe(4);
    expect(shadowSigma(0)).toBe(0);
  });

  test('boxShadow takes CSS semantics directly: blurRadius = blur, spreadDistance = spread (negative too)', () => {
    expect(toBoxShadowBlur(8)).toBe(8);
    const { boxShadow } = resolveElevation([layer({ y: 4, blur: 8, spread: -4 })], color);
    expect(boxShadow).toEqual([{ offsetX: 0, offsetY: 4, blurRadius: 8, spreadDistance: -4, color: color('elevationShadow1') }]);
  });

  test('iOS shadowRadius is the Gaussian\'s σ: blur / 2 — NOT the blur', () => {
    expect(toShadowRadius(8)).toBe(4);
    expect(toShadowRadius(3)).toBe(1.5);
  });

  test('Android elevation is a height: 1.5 × the largest downward offset (1→1.5, 2→3, 4→6, 8→12); σ of the widest blur when nothing is offset; 0 for nothing', () => {
    expect([1, 2, 4, 8].map((y) => toAndroidElevation([{ y, blur: y * 2 }]))).toEqual([1.5, 3, 6, 12]);
    expect(toAndroidElevation([{ y: 1, blur: 3 }, { y: 4, blur: 8 }])).toBe(6);
    expect(toAndroidElevation([{ y: 0, blur: 6 }])).toBe(3);
    expect(toAndroidElevation([{ y: -2, blur: 4 }])).toBe(2);
    expect(toAndroidElevation([])).toBe(0);
  });

  test('the legacy style: the layer with the widest blur, its spread dropped; one height', () => {
    const { boxShadow, legacy } = resolveElevation([layer({ y: 1, blur: 1 }), layer({ y: 4, blur: 8, spread: -4, role: 'elevationShadow2' })], color);
    expect(boxShadow).toHaveLength(2);
    expect(legacy).toEqual({ shadowColor: color('elevationShadow2'), shadowOpacity: 1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 4, elevation: 6 });
    expect(toLegacyShadow([])).toEqual({});
  });

  test('boxShadow is what this React Native draws (New Architecture): it is preferred, the legacy style is for a renderer without it', () => {
    expect(supportsBoxShadow()).toBe(true);
    const fabric = (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager;
    (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager = undefined;
    try {
      expect(supportsBoxShadow()).toBe(false);
    } finally {
      (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager = fabric;
    }
  });
});

describe('levels of the default system', () => {
  test('level0 is an empty list: nothing is drawn — no ring, no shadow entry, no legacy style', () => {
    expect(tanrei.elevation.level0).toEqual([]);
    expect(resolveElevation(tanrei.elevation.level0, color)).toEqual({ ring: null, boxShadow: [], legacy: {} });
    expect(resolveElevationLayers(tanrei.elevation.level0, structured)).toEqual({ ring: null, shadows: [] });
  });

  test('a first layer that is only spread is the outside ring; the rest are shadows with structured colors', () => {
    const level3 = resolveElevationLayers(tanrei.elevation.level3, structured);
    expect(level3.ring).toEqual({ width: 1, color: structured('elevationRing') });
    expect(level3.shadows).toHaveLength(tanrei.elevation.level3.length - 1);
    expect(level3.shadows[1]).toEqual({ x: 0, y: 4, blur: 8, spread: -4, color: structured('elevationShadow1') });
  });

  test('a layer whose color resolves to nothing, and an all-zero layer, draw nothing', () => {
    const nothing = (role: TanreiColorRole): TanreiColor => (role === 'elevationRing' ? { r: 0, g: 0, b: 0, a: 0 } : structured(role));
    expect(resolveElevationLayers(tanrei.elevation.level2, nothing).ring).toBeNull();
    expect(resolveElevationLayers([layer({})], structured)).toEqual({ ring: null, shadows: [] });
  });
});
