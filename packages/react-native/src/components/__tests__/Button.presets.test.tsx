// The shipped presets prove the rule "design systems differ in values, never in tokens":
// the same Button, given another system object, reads as that system — with no preset-specific code.
// Expected values are READ FROM THE SYSTEM INSTANCE; a literal appears only where the brief names one.
import { act, fireEvent, render } from '@testing-library/react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiButtonTokens, TanreiButtonVariantStateTokens, TanreiColorRole, TanreiCoreButtonVariant, TanreiPaint, TanreiSystem } from '../../generated/vocabulary';
import { byTestID, describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { intentRoles, unknownRoles } from '../../testing/systemRoles';
import { lookupValue } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { fontFamilyOf } from '../../theme/typography';
import { Button, type ButtonProps } from '../Button';
import { buttonSubject } from './Button.subject';

const ID = 'button';
const variants: TanreiCoreButtonVariant[] = ['filled', 'tonal', 'elevated', 'outlined', 'text'];
const { host, part } = byTestID(ID);

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor(system.colors.light[name]!);
const painted = (system: TanreiSystem, paint: TanreiPaint) => formatColor(evaluatePaint(paint, system.colors.light));
const withButton = (base: TanreiSystem, overrides: Partial<TanreiButtonTokens>): TanreiSystem => withComponent(base, 'button', overrides);

/** `base` with the resting tokens of one variant changed. */
const withResting = (base: TanreiSystem, variant: TanreiCoreButtonVariant, overrides: Partial<TanreiButtonVariantStateTokens>): TanreiSystem => {
  const current = base.components.button.variants[variant];
  return withButton(base, { variants: { ...base.components.button.variants, [variant]: { ...current, enabled: { ...current.enabled, ...overrides } } } });
};

const mount = (system: TanreiSystem, props: Partial<ButtonProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Button testID={ID} {...props}>
        Deploy
      </Button>
    </TanreiProvider>,
  );

settleMotion();

// The shipped systems' own structure (schemes, roles, intents, series) is component-independent: src/__tests__/systems.test.ts.
describe('every shipped system values the Button vocabulary', () => {
  describeSharedVocabulary(buttonSubject);
});

describe('open role keys', () => {
  test('the declared palettes are intents of their own system only', () => {
    expect(tanrei.intents).toContain('accent');
    expect(m3Like.intents).toContain('tertiary');
    expect(m3Like.intents).not.toContain('accent');
    expect(cupertino.intents).not.toContain('accent');
    expect(unknownRoles(m3Like, intentRoles('accent'))).not.toEqual([]);
  });

  test.each([
    { system: tanrei as TanreiSystem, palette: 'accent' },
    { system: m3Like as TanreiSystem, palette: 'tertiary' },
  ])('$palette of $system.id is drawn from that system, without a fallback warning', async ({ system, palette }) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const [container, label] = intentRoles(palette) as [TanreiColorRole, TanreiColorRole];
    await mount(withResting(system, 'filled', { containerColor: { kind: 'role', role: container }, labelColor: { kind: 'role', role: label } }));
    expect(viewStyle(host()).backgroundColor).toBe(role(system, container));
    expect(textStyle(part('label')!).color).toBe(role(system, label));
    expect(role(system, container)).not.toBe(role(system, 'primary'));
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('m3-like drives the Button', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.button;

  test('filled medium is a pill filled with the system primary, labelled on-primary', async () => {
    await mount(system);
    const style = viewStyle(host());
    expect(style.borderRadius).toBe(tokens.containerShape);
    expect(tokens.containerShape).toBe(system.shape.full);
    expect(style.minHeight).toBe(tokens.sizes.medium.containerHeight);
    expect(Number(style.borderRadius)).toBeGreaterThanOrEqual(tokens.sizes.medium.containerHeight / 2);
    expect(style.backgroundColor).toBe(role(system, 'primary'));
    expect(textStyle(part('label')!).color).toBe(role(system, 'onPrimary'));
    // …and that is this system's value, not the default system's.
    expect(style.backgroundColor).not.toBe(role(tanrei, 'primary'));
    expect(style.borderRadius).not.toBe(tanrei.components.button.containerShape);
  });

  test('a state is a state layer: the container mixed with the label at the sys.state opacity', async () => {
    await mount(system);
    const mix = (amount: number): TanreiPaint => ({ kind: 'mix', base: tokens.variants.filled.enabled.containerColor, with: tokens.variants.filled.enabled.labelColor, amount });
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host()).backgroundColor).toBe(painted(system, mix(system.state.hoverStateLayerOpacity)));
    expect(viewStyle(host()).backgroundColor).not.toBe(painted(system, tokens.variants.filled.enabled.containerColor));
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).backgroundColor).toBe(painted(system, mix(system.state.pressedStateLayerOpacity)));
    expect(viewStyle(host()).opacity).toBe(tokens.pressedOpacity);
  });

  test('elevated is a shadow without a ring, and hover raises it to the hovered level', async () => {
    await mount(system, { variant: 'elevated' });
    const shadows = (level: keyof TanreiSystem['elevation']) =>
      system.elevation[level].map((l) => ({ offsetX: l.x, offsetY: l.y, blurRadius: l.blur, spreadDistance: l.spread, color: role(system, l.role) }));
    expect(part('elevation-ring')).toBeNull();
    expect(part('outline')).toBeNull();
    expect(viewStyle(host()).boxShadow).toEqual(shadows(tokens.variants.elevated.enabled.containerElevation));
    expect(viewStyle(host()).boxShadow!.length).toBeGreaterThan(0);
    expect(viewStyle(host()).backgroundColor).toBe(painted(system, tokens.variants.elevated.enabled.containerColor));
    await fireEvent(host(), 'hoverIn');
    expect(tokens.variants.elevated.hovered.containerElevation).not.toBe(tokens.variants.elevated.enabled.containerElevation);
    expect(viewStyle(host()).boxShadow).toEqual(shadows(tokens.variants.elevated.hovered.containerElevation));
    expect(part('elevation-ring')).toBeNull();
  });

  test('the pill reaches the outline and the focus ring', async () => {
    await mount(system, { variant: 'outlined' });
    expect(viewStyle(part('outline')!)).toMatchObject({ borderRadius: tokens.containerShape, borderWidth: tokens.sizes.medium.outlineWidth, borderColor: painted(system, tokens.variants.outlined.enabled.outlineColor) });
    await fireEvent(host(), 'focus');
    const { offset, innerWidth, outerWidth } = system.measure.focus;
    expect(viewStyle(part('focus-ring')!)).toMatchObject({ borderRadius: tokens.focusedContainerShape + offset + innerWidth + outerWidth, borderColor: role(system, 'focusRing') });
  });

  test('the label asks for the first family of the stack; an absent font falls back to the platform font natively', async () => {
    await mount(system);
    const token = lookupValue(system.typescale, tokens.sizes.medium.labelTypescale, 'body', 'typescale role');
    expect(token.font.system).toBe(false);
    expect(textStyle(part('label')!)).toMatchObject({ fontFamily: token.font.families[0], fontSize: token.size, letterSpacing: token.tracking, lineHeight: token.lineHeight });
    expect(fontFamilyOf(token.font, token.weight)).toBe(token.font.families[0]);
  });
});

describe('m3-expressive-like drives the Button', () => {
  // Extends m3-like: two more sizes (`xsmall`, `xlarge`, vocabulary extensions) and all five sizes revalued —
  // including the two members that are per size since this preset needed them (`containerGap`, `outlineWidth`).
  const system: TanreiSystem = m3ExpressiveLike;
  const sizes = system.components.button.sizes;

  test('it has the three core sizes and the two it added; the systems it does not extend have only the core', () => {
    expect(Object.keys(sizes).sort()).toEqual(['large', 'medium', 'small', 'xlarge', 'xsmall']);
    for (const other of [tanrei, m3Like, cupertino]) expect(Object.keys(other.components.button.sizes).sort()).toEqual(['large', 'medium', 'small']);
  });

  test('xlarge outlined is 136 tall with an outline 3 wide and a gap of 16', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount(system, { size: 'xlarge', variant: 'outlined' });
    const xlarge = sizes.xlarge!;
    expect(viewStyle(host())).toMatchObject({ minHeight: xlarge.containerHeight, gap: xlarge.containerGap });
    expect(viewStyle(part('outline')!).borderWidth).toBe(xlarge.outlineWidth);
    expect([xlarge.containerHeight, xlarge.outlineWidth, xlarge.containerGap]).toEqual([136, 3, 16]);
    // The outline is a ring: whatever its width, it never becomes a border of the host.
    expect(viewStyle(host()).borderWidth).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  test('xsmall is 32 tall, with this size\'s own outline width and gap', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount(system, { size: 'xsmall', variant: 'outlined' });
    const xsmall = sizes.xsmall!;
    expect(viewStyle(host())).toMatchObject({ minHeight: xsmall.containerHeight, gap: xsmall.containerGap });
    expect(viewStyle(part('outline')!).borderWidth).toBe(xsmall.outlineWidth);
    expect(xsmall.containerHeight).toBe(32);
    expect(warn).not.toHaveBeenCalled();
  });

  test('all five sizes: heights 32 / 40 / 56 / 96 / 136, read by the Button from the size it is given', async () => {
    const order = ['xsmall', 'small', 'medium', 'large', 'xlarge'] as const;
    expect(order.map((size) => sizes[size]!.containerHeight)).toEqual([32, 40, 56, 96, 136]);
    for (const size of order) {
      const view = await mount(system, { size, icon: () => null });
      expect(viewStyle(host()).minHeight).toBe(sizes[size]!.containerHeight);
      expect(viewStyle(part('icon')!)).toMatchObject({ width: sizes[size]!.iconSize, height: sizes[size]!.iconSize });
      await view.unmount();
    }
  });

  test('a size this preset added falls back to medium under a system that does not have it (with a dev warning)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount(m3Like, { size: 'xlarge' });
    expect(viewStyle(host()).minHeight).toBe(m3Like.components.button.sizes.medium.containerHeight);
    expect(warn).toHaveBeenCalled();
  });
});

describe('cupertino drives the Button', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.button;

  test('filled medium is a rounded rectangle in the system tint with a white label', async () => {
    await mount(system);
    const style = viewStyle(host());
    expect(style.borderRadius).toBe(tokens.containerShape);
    expect(tokens.containerShape).toBe(system.shape.medium);
    expect(Number(style.borderRadius)).toBeLessThan(tokens.sizes.medium.containerHeight / 2);
    expect(style.minHeight).toBe(tokens.sizes.medium.containerHeight);
    expect(style.backgroundColor).toBe(role(system, 'primary'));
    expect(textStyle(part('label')!).color).toBe(role(system, 'onPrimary'));
    expect(system.colors.light.onPrimary).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  test.each(variants)('%s: hover and keyboard focus draw the container exactly like the resting state', async (variant) => {
    await mount(system, { variant });
    const resting = { ...viewStyle(host()) };
    const label = textStyle(part('label')!).color;
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host())).toEqual(resting);
    expect(textStyle(part('label')!).color).toBe(label);
    await fireEvent(host(), 'hoverOut');
    await fireEvent(host(), 'focus');
    expect(viewStyle(host()).backgroundColor).toBe(resting.backgroundColor);
    expect(viewStyle(host()).opacity).toBe(resting.opacity);
  });

  test.each(variants)('%s: pressed dims the whole control to the pressed opacity and keeps its colors', async (variant) => {
    await mount(system, { variant });
    const resting = viewStyle(host()).backgroundColor;
    expect(viewStyle(host()).opacity).toBe(1);
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).opacity).toBe(tokens.pressedOpacity);
    expect(tokens.pressedOpacity).toBe(0.7);
    expect(viewStyle(host()).backgroundColor).toBe(resting);
    expect(viewStyle(host()).borderRadius).toBe(tokens.pressedContainerShape);
    await fireEvent(host(), 'pressOut');
    // BTN-8: the press stays visible for `duration.pressHold`.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
    expect(viewStyle(host()).opacity).toBe(1);
  });

  test('tonal is a gray fill with a TINTED label: the system primary, not on-surface', async () => {
    await mount(system, { variant: 'tonal' });
    expect(viewStyle(host()).backgroundColor).toBe(painted(system, tokens.variants.tonal.enabled.containerColor));
    expect(textStyle(part('label')!).color).toBe(role(system, 'primary'));
    expect(textStyle(part('label')!).color).not.toBe(role(system, 'onSurface'));
    // The default system labels tonal differently: the tint is a value of this system.
    expect(painted(tanrei, tanrei.components.button.variants.tonal.enabled.labelColor)).not.toBe(role(tanrei, 'primary'));
  });

  test('elevated has a soft shadow and no ring', async () => {
    await mount(system, { variant: 'elevated' });
    expect(part('elevation-ring')).toBeNull();
    expect(viewStyle(host()).boxShadow).toEqual(
      system.elevation[tokens.variants.elevated.enabled.containerElevation].map((l) => ({ offsetX: l.x, offsetY: l.y, blurRadius: l.blur, spreadDistance: l.spread, color: role(system, l.role) })),
    );
  });

  test('the system font stack means the platform font: no font name is requested', async () => {
    const token = lookupValue(system.typescale, tokens.sizes.medium.labelTypescale, 'body', 'typescale role');
    // The stack says so itself (`system: true`, read once in the token pipeline): no CSS keyword is interpreted here.
    expect(token.font).toMatchObject({ system: true, generic: 'sans-serif' });
    expect(token.font.families.length).toBeGreaterThan(0);
    expect(fontFamilyOf(token.font, token.weight)).toBeUndefined();
    await mount(system);
    expect(textStyle(part('label')!).fontFamily).toBeUndefined();
    expect(textStyle(part('label')!)).toMatchObject({ fontSize: token.size, fontWeight: String(token.weight) });
  });
});

describe('a ring that a system turns off by value', () => {
  test('the default elevation with a transparent elevation-ring role draws the shadows and no ring element', async () => {
    const light = { ...tanrei.colors.light, elevationRing: { ...tanrei.colors.light.elevationRing, a: 0 } };
    const base: TanreiSystem = { ...tanrei, id: 'ringless', colors: { ...tanrei.colors, light } };
    const system = withResting(base, 'elevated', { containerElevation: 'level3' });
    await mount(system, { variant: 'elevated' });
    expect(part('elevation-ring')).toBeNull();
    expect(viewStyle(host()).boxShadow).toHaveLength(tanrei.elevation.level3.length - 1);
  });
});

describe('preset fixtures (light scheme)', () => {
  describeFixtureBaselines(buttonSubject, { systems: [m3Like, cupertino], fixtures: ['filled-medium', 'tonal-medium', 'outlined-medium', 'elevated-medium', 'text-medium'] });
});
