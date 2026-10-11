import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiFontStack, TanreiIconStyle, TanreiSystem } from '../../generated/vocabulary';
// A product system whose icon set is STATIC: a family per selection state (packages/tokens-build/test/fixtures/acme.system.json).
import { acme } from '../../components/__tests__/__fixtures__/acme';
import { iconFamily, iconFill, iconGlyphStyle, iconNeedsFillAxis, resetIconReport } from '../icon';

const icon: TanreiIconStyle = tanrei.icon;
const named = (family: string): TanreiFontStack => ({ stack: [family], families: [family], generic: 'sans-serif', system: false });
const variable = named('Material Symbols Rounded');

let warn: jest.SpyInstance;
beforeEach(() => {
  resetIconReport();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('system.icon (tanrei.sys.icon.* + tanrei.ref.typeface.icon)', () => {
  test('the default icon style: the rounded symbols font, weight 300, fill 0 unselected and 1 selected, optical sizes 20–48', () => {
    expect(icon).toEqual({ family: { unselected: variable, selected: variable }, weight: 300, fillUnselected: 0, fillSelected: 1, opticalSizeMin: 20, opticalSizeMax: 48 });
  });

  test.each([tanrei, m3Like, m3ExpressiveLike, cupertino] as readonly TanreiSystem[])('$id values the whole group', (system) => {
    expect(Object.keys(system.icon).sort()).toEqual(Object.keys(icon).sort());
    expect(Object.keys(system.icon.family).sort()).toEqual(['selected', 'unselected']);
    expect(system.icon.family.unselected.families.length).toBeGreaterThan(0);
    expect(system.icon.family.selected.families.length).toBeGreaterThan(0);
  });

  test('the systems differ in their icon SET by value only: m3-like draws the outlined symbols at 400', () => {
    expect(m3Like.icon.family.unselected.families[0]).not.toBe(icon.family.unselected.families[0]);
    expect(m3Like.icon.weight).toBe(400);
  });

  test('acme is a static set: a family per selection state, weight 400', () => {
    expect(acme.icon.family.unselected.families).toEqual(['Material Icons Outlined']);
    expect(acme.icon.family.selected.families).toEqual(['Material Icons']);
    expect(acme.icon.weight).toBe(400);
  });
});

describe('iconFamily / iconNeedsFillAxis', () => {
  test('the family of the selection state', () => {
    expect(iconFamily(icon, false)).toBe(icon.family.unselected);
    expect(iconFamily(icon, true)).toBe(icon.family.selected);
    expect(iconFamily(acme.icon, false).families[0]).toBe('Material Icons Outlined');
    expect(iconFamily(acme.icon, true).families[0]).toBe('Material Icons');
  });

  test('one family + two fills needs the FILL axis (the default system, every shipped preset); a family per state does not', () => {
    for (const system of [tanrei, m3Like, m3ExpressiveLike, cupertino] as readonly TanreiSystem[]) expect(iconNeedsFillAxis(system.icon)).toBe(true);
    expect(iconNeedsFillAxis(acme.icon)).toBe(false);
    expect(iconNeedsFillAxis({ ...icon, fillSelected: icon.fillUnselected })).toBe(false);
  });
});

describe('iconFill', () => {
  test('selected → fill 1, unselected → fill 0', () => {
    expect(iconFill(icon, true)).toBe(1);
    expect(iconFill(icon, false)).toBe(0);
  });

  test('the fills are read from the tokens', () => {
    const other: TanreiIconStyle = { ...icon, fillUnselected: 0.25, fillSelected: 0.75 };
    expect(iconFill(other, false)).toBe(0.25);
    expect(iconFill(other, true)).toBe(0.75);
  });
});

describe('iconGlyphStyle', () => {
  const size = tanrei.measure.icon.medium;

  test('unselected by default: FILL 0, wght 300, GRAD 0, opsz = the icon box size', () => {
    expect(iconGlyphStyle(icon, size).axes).toEqual({ FILL: 0, wght: 300, GRAD: 0, opsz: size });
    expect(iconGlyphStyle(icon, size, { selected: false }).axes.FILL).toBe(0);
  });

  test('selected: FILL 1, everything else unchanged', () => {
    expect(iconGlyphStyle(icon, size, { selected: true }).axes).toEqual({ FILL: 1, wght: 300, GRAD: 0, opsz: size });
  });

  test('opsz clamps to the range of the font (sys.icon.optical-size.*: 20–48 by default); the drawn size does not', () => {
    expect(iconGlyphStyle(icon, 16).axes.opsz).toBe(20);
    expect(iconGlyphStyle(icon, 20).axes.opsz).toBe(20);
    expect(iconGlyphStyle(icon, 24).axes.opsz).toBe(24);
    expect(iconGlyphStyle(icon, 48).axes.opsz).toBe(48);
    expect(iconGlyphStyle(icon, 64).axes.opsz).toBe(48);
    expect(iconGlyphStyle(icon, 16).style).toMatchObject({ fontSize: 16, lineHeight: 16 });
    expect(iconGlyphStyle(icon, 64).style).toMatchObject({ fontSize: 64, lineHeight: 64 });
  });

  test('the optical-size range is the system\'s: a system with an 8–96 range clamps to it', () => {
    const wide: TanreiIconStyle = { ...icon, opticalSizeMin: 8, opticalSizeMax: 96 };
    expect(iconGlyphStyle(wide, 4).axes.opsz).toBe(8);
    expect(iconGlyphStyle(wide, 8).axes.opsz).toBe(8);
    expect(iconGlyphStyle(wide, 16).axes.opsz).toBe(16);
    expect(iconGlyphStyle(wide, 64).axes.opsz).toBe(64);
    expect(iconGlyphStyle(wide, 96).axes.opsz).toBe(96);
    expect(iconGlyphStyle(wide, 120).axes.opsz).toBe(96);
    expect(iconGlyphStyle(wide, 120).style).toMatchObject({ fontSize: 120, lineHeight: 120 });
  });

  test('the style asks for the token family at the token weight, in a square box', () => {
    expect(iconGlyphStyle(icon, 24).style).toEqual({ fontFamily: icon.family.unselected.families[0], fontSize: 24, lineHeight: 24, fontWeight: '300' });
    expect(iconGlyphStyle(icon, 24).family).toBe('Material Symbols Rounded');
  });

  test('weight and family follow the tokens', () => {
    const other: TanreiIconStyle = { ...icon, family: { unselected: named('Product Icons'), selected: named('Product Icons Filled') }, weight: 500 };
    const glyph = iconGlyphStyle(other, 24, { selected: true });
    expect(glyph.axes.wght).toBe(500);
    expect(glyph.style).toMatchObject({ fontFamily: 'Product Icons Filled', fontWeight: '500' });
    expect(iconGlyphStyle(other, 24).style.fontFamily).toBe('Product Icons');
  });

  test('a set without a named family draws with the platform font of its class', () => {
    const none: TanreiFontStack = { stack: ['sans-serif'], families: [], generic: 'sans-serif', system: false };
    const glyph = iconGlyphStyle({ ...icon, family: { unselected: none, selected: none } }, 24);
    expect(glyph.family).toBeUndefined();
    expect(glyph.style.fontFamily).toBeUndefined();
  });

  test('the axes in font-variation-settings form', () => {
    expect(iconGlyphStyle(icon, 24, { selected: true }).fontVariationSettings).toBe("'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24");
  });

  test('a resolver maps family + axes to the static instance the app loaded', () => {
    const resolveFont = jest.fn((family: string, axes: { FILL: number; wght: number }) => `${family.replaceAll(' ', '')}-${axes.wght}${axes.FILL === 1 ? '-Filled' : ''}`);
    expect(iconGlyphStyle(icon, 24, { selected: true, resolveFont }).style.fontFamily).toBe('MaterialSymbolsRounded-300-Filled');
    expect(iconGlyphStyle(icon, 24, { resolveFont }).style.fontFamily).toBe('MaterialSymbolsRounded-300');
    expect(resolveFont).toHaveBeenLastCalledWith('Material Symbols Rounded', { FILL: 0, wght: 300, GRAD: 0, opsz: 24 });
    expect(iconGlyphStyle(icon, 24, { resolveFont: () => undefined }).style.fontFamily).toBeUndefined();
  });
});

describe('the rule "unselected is outlined, selected is filled" on React Native', () => {
  const size = tanrei.measure.icon.medium;

  test('acme (static families): the FAMILY changes with the selection state — a <Text> draws the right glyph, nothing is reported', () => {
    const unselected = iconGlyphStyle(acme.icon, size);
    const selected = iconGlyphStyle(acme.icon, size, { selected: true });
    expect(unselected.style.fontFamily).toBe('Material Icons Outlined');
    expect(selected.style.fontFamily).toBe('Material Icons');
    expect(unselected.textDrawsFill).toBe(true);
    expect(selected.textDrawsFill).toBe(true);
    // The axes are still what the tokens say; a static font ignores them.
    expect(selected.axes).toEqual({ FILL: 1, wght: 400, GRAD: 0, opsz: size });
    expect(selected.style.fontWeight).toBe('400');
    expect(warn).not.toHaveBeenCalled();
  });

  test('the default system (one variable family): an unselected icon is right; a selected one CANNOT be filled and says so once in development', () => {
    expect(iconGlyphStyle(icon, size).textDrawsFill).toBe(true);
    expect(warn).not.toHaveBeenCalled();

    const selected = iconGlyphStyle(icon, size, { selected: true });
    expect(selected.textDrawsFill).toBe(false);
    // The family is the same as unselected: nothing a <Text> style can say asks for FILL 1.
    expect(selected.style.fontFamily).toBe(iconGlyphStyle(icon, size).style.fontFamily);
    expect(selected.axes.FILL).toBe(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toMatch(/FILL/);
    expect(String(warn.mock.calls[0]![0])).toMatch(/sys\.icon\.family/);

    iconGlyphStyle(icon, size, { selected: true });
    iconGlyphStyle(m3Like.icon, size, { selected: true });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('a resolver that maps the axes to a static instance takes the responsibility: no report', () => {
    const glyph = iconGlyphStyle(icon, size, { selected: true, resolveFont: (family, axes) => `${family}-${axes.FILL}` });
    expect(glyph.textDrawsFill).toBe(true);
    expect(glyph.style.fontFamily).toBe('Material Symbols Rounded-1');
    expect(warn).not.toHaveBeenCalled();
  });

  test('a release build stays silent', () => {
    const dev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      expect(iconGlyphStyle(icon, size, { selected: true }).textDrawsFill).toBe(false);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
    }
  });
});
