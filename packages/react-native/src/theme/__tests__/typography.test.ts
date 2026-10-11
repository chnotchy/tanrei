// Font stacks: the token pipeline reads a CSS-style stack ONCE; this package takes the result and
// never looks at a CSS keyword itself.
import fs from 'node:fs';
import path from 'node:path';
import { Platform } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiFontStack, TanreiSystem } from '../../generated/vocabulary';
import { acme } from '../../components/__tests__/__fixtures__/acme';
import { emphasize, fontFamilyOf, platformFontFamily, toFontWeight, typeFamilyOf, typescaleStyle } from '../typography';

const stack = (font: Partial<TanreiFontStack>): TanreiFontStack => ({ stack: [], families: [], generic: 'sans-serif', system: false, ...font });
const on = (os: 'ios' | 'android', run: () => void) => {
  const original = Platform.OS;
  const select = Platform.select;
  Platform.OS = os;
  Platform.select = ((spec: Record<string, unknown>) => (os in spec ? spec[os] : spec.default)) as typeof Platform.select;
  try {
    run();
  } finally {
    Platform.OS = original;
    Platform.select = select;
  }
};

describe('the delivered model', () => {
  test.each([tanrei, m3Like, cupertino, acme] as readonly TanreiSystem[])('$id: every typeface and every type style is { stack, families, generic, system }', (system) => {
    // `typescale.emphasis` holds the weight steps, not a style.
    const { emphasis, ...roles } = system.typescale;
    expect(Object.keys(emphasis).sort()).toEqual(['body', 'display', 'heading', 'label']);
    const fonts = [...Object.values(system.typefaces), ...Object.values(roles).map((style) => style!.font), system.icon.family.unselected, system.icon.family.selected];
    expect(fonts.length).toBeGreaterThan(10);
    for (const font of fonts) {
      expect(Object.keys(font).sort()).toEqual(['families', 'generic', 'stack', 'system']);
      expect(['sans-serif', 'serif', 'monospace']).toContain(font.generic);
      // Named families are names: no CSS keyword is left among them.
      for (const family of font.families) expect(family).not.toMatch(/^(-apple-system|BlinkMacSystemFont|system-ui|ui-[a-z-]+|sans-serif|serif|monospace)$/i);
    }
  });

  test('the four named typefaces; the default system names Inter and Roboto Mono, cupertino asks for the platform font first', () => {
    expect(Object.keys(tanrei.typefaces).sort()).toEqual(['brand', 'icon', 'mono', 'plain']);
    expect(tanrei.typefaces.brand).toMatchObject({ families: ['Inter', 'Noto Sans JP', 'Noto Sans'], generic: 'sans-serif', system: false });
    expect(tanrei.typefaces.mono).toMatchObject({ families: ['Roboto Mono', 'Noto Sans JP'], generic: 'monospace', system: false });
    expect(cupertino.typefaces.brand).toMatchObject({ system: true, generic: 'sans-serif' });
    expect(m3Like.typefaces.brand.families[0]).toBe('Roboto');
  });

  test('this package does not interpret CSS font keywords any more', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../typography.ts'), 'utf8');
    expect(source).not.toMatch(/system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|toLowerCase/i);
  });
});

describe('fontFamilyOf: a stack → the ONE fontFamily React Native takes', () => {
  test('the first named family', () => {
    expect(fontFamilyOf(tanrei.typefaces.brand, 400)).toBe('Inter');
    expect(fontFamilyOf(tanrei.typefaces.mono, 400)).toBe('Roboto Mono');
  });

  test('a stack that asks for the platform font first gets the platform font of its class, although it names families', () => {
    expect(cupertino.typefaces.brand.families.length).toBeGreaterThan(0);
    expect(fontFamilyOf(cupertino.typefaces.brand, 400)).toBeUndefined();
    on('ios', () => expect(fontFamilyOf(stack({ families: ['Inter'], generic: 'monospace', system: true }), 400)).toBe('ui-monospace'));
    on('android', () => expect(fontFamilyOf(stack({ families: ['Inter'], generic: 'monospace', system: true }), 400)).toBe('monospace'));
  });

  test('a stack without named families gets the platform font of its class', () => {
    expect(fontFamilyOf(stack({ generic: 'sans-serif' }), 400)).toBeUndefined();
    on('ios', () => {
      expect(platformFontFamily('sans-serif')).toBeUndefined();
      expect(platformFontFamily('serif')).toBe('ui-serif');
      expect(platformFontFamily('monospace')).toBe('ui-monospace');
    });
    on('android', () => {
      expect(platformFontFamily('sans-serif')).toBeUndefined();
      expect(platformFontFamily('serif')).toBe('serif');
      expect(platformFontFamily('monospace')).toBe('monospace');
    });
  });

  test('the product\'s resolver hook is kept: it sees the first named family, the weight and the whole stack — and is not asked about the platform font', () => {
    const resolveFont = jest.fn((family: string, weight: number) => `${family}_${weight}`);
    expect(fontFamilyOf(tanrei.typefaces.brand, 500, resolveFont)).toBe('Inter_500');
    expect(resolveFont).toHaveBeenCalledWith('Inter', 500, tanrei.typefaces.brand);
    // An app that loaded a later family of the stack instead.
    expect(fontFamilyOf(tanrei.typefaces.brand, 400, (_family, _weight, font) => font.families[1])).toBe('Noto Sans JP');
    resolveFont.mockClear();
    expect(fontFamilyOf(cupertino.typefaces.brand, 400, resolveFont)).toBeUndefined();
    expect(resolveFont).not.toHaveBeenCalled();
    expect(typescaleStyle(tanrei.typescale.label, resolveFont).fontFamily).toBe('Inter_500');
  });
});

describe('emphasis is a weight step, not a role', () => {
  const ROLES = ['display', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'bodyLarge', 'body', 'bodySmall', 'label', 'labelSmall', 'caption', 'code', 'codeSmall', 'eyebrow'] as const;

  test('the sixteen roles by level, and every system carries the four steps', () => {
    const { emphasis, ...roles } = tanrei.typescale;
    expect(Object.keys(roles).sort()).toEqual([...ROLES].sort());
    for (const system of [tanrei, m3Like, cupertino, acme] as readonly TanreiSystem[]) {
      for (const family of ['display', 'heading', 'body', 'label'] as const) expect(typeof system.typescale.emphasis[family]).toBe('number');
    }
    // Headings weigh 500 or more, body 400; a heading and a body role may share a size.
    for (const role of ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6'] as const) expect(tanrei.typescale[role].weight).toBeGreaterThanOrEqual(500);
    for (const role of ['bodyLarge', 'body', 'bodySmall'] as const) expect(tanrei.typescale[role].weight).toBe(400);
  });

  test('typeFamilyOf: the first segment of the name; caption, code and eyebrow take the label step; an added role follows the same rule', () => {
    expect(ROLES.map(typeFamilyOf)).toEqual(['display', ...Array<'heading'>(6).fill('heading'), 'body', 'body', 'body', 'label', 'label', 'label', 'label', 'label', 'label']);
    // Roles a preset added (cupertino: bodyCallout, bodySubhead, captionSmall; m3-like: displayLarge, displaySmall).
    expect(['bodyCallout', 'bodySubhead', 'captionSmall', 'displayLarge', 'displaySmall'].map(typeFamilyOf)).toEqual(['body', 'body', 'label', 'display', 'display']);
  });

  test('the token build carries each role\'s family: every generated role has one, it agrees with the name rule, and emphasize reads it before the name', () => {
    for (const system of [tanrei, m3Like, cupertino, acme] as readonly TanreiSystem[]) {
      const { emphasis: _emphasis, ...roles } = system.typescale;
      for (const [role, token] of Object.entries(roles)) expect([system.id, role, token.family]).toEqual([system.id, role, typeFamilyOf(role)]);
    }
    // The build's word wins over the name: a token that SAYS display takes the display step whatever it is called.
    const steps = { display: 300, heading: 200, body: 100, label: 0 };
    expect(emphasize({ ...tanrei.typescale.label, family: 'display' }, steps, 'label').weight).toBe(tanrei.typescale.label.weight + 300);
    // A hand-written style without a family falls back to the name rule.
    const { family: _family, ...bare } = tanrei.typescale.heading2;
    expect(bare).not.toHaveProperty('family');
    expect(emphasize(bare, steps, 'heading2').weight).toBe(bare.weight + 200);
    expect(emphasize(bare, steps, 'eyebrow').weight).toBe(bare.weight);
  });

  test('emphasize adds the family step to the weight and nothing else; the default heading-1 emphasized is 600', () => {
    const plain = tanrei.typescale.heading1;
    const heavier = emphasize(plain, tanrei.typescale.emphasis, 'heading1');
    expect(plain.weight).toBe(500);
    expect(heavier).toEqual({ ...plain, weight: 600 });
    expect(typescaleStyle(heavier)).toEqual({ ...typescaleStyle(plain), fontWeight: '600' });
    expect(plain.weight).toBe(500);
  });

  test('m3-like emphasizes labels by 200: label emphasized is 700, and the resolver is asked for that weight', () => {
    expect(m3Like.typescale.emphasis).toEqual({ display: 100, heading: 100, body: 100, label: 200 });
    const heavier = emphasize(m3Like.typescale.label, m3Like.typescale.emphasis, 'label');
    expect(heavier.weight).toBe(700);
    const resolveFont = jest.fn((family: string, weight: number) => `${family}_${weight}`);
    expect(typescaleStyle(heavier, resolveFont)).toMatchObject({ fontFamily: 'Roboto_700', fontWeight: '700' });
  });

  test('React Native takes weights in hundreds: an emphasized weight still rounds to the nearest hundred and never leaves 100–900', () => {
    const odd = { ...tanrei.typescale.body, weight: 450 };
    expect(typescaleStyle(emphasize(odd, { display: 0, heading: 0, body: 30, label: 0 }, 'body')).fontWeight).toBe('500');
    expect(typescaleStyle(emphasize(odd, { display: 0, heading: 0, body: 600, label: 0 }, 'body')).fontWeight).toBe('900');
    expect(toFontWeight(480)).toBe('500');
  });
});
