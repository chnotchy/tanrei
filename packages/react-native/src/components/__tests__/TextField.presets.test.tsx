// The shipped presets drive the same TextField with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiCoreTextFieldVariant, TanreiSystem, TanreiTypescaleRole } from '../../generated/vocabulary';
import { byTestID, describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { TextField, type TextFieldProps } from '../TextField';
import { textFieldSubject } from './TextField.subject';

const ID = 'field';
const variants: TanreiCoreTextFieldVariant[] = ['filled', 'outlined'];
const { part } = byTestID(ID);
const container = () => part('container')!;
const input = () => part('input')!;

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const line = (system: TanreiSystem, name: TanreiTypescaleRole) => (system.typescale[name] as { lineHeight: number }).lineHeight;
/** The border's stroke (the piece along the sides and the bottom, when a label is drawn). */
const stroke = () => {
  const outline = part('outline')!;
  const style = viewStyle(outline.children.length ? (outline.children[0] as typeof outline) : outline);
  return { color: style.borderColor, width: style.borderWidth ?? style.borderBottomWidth };
};

const mount = (system: TanreiSystem, props: Partial<TextFieldProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <TextField testID={ID} label="Email" {...props} />
    </TanreiProvider>,
  );

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // As in TextField.test.tsx: geometry at the tokens' own sizes (the Jest preset's window has fontScale 2).
  Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
settleMotion();

describe('every shipped system values the TextField vocabulary', () => {
  describeSharedVocabulary(textFieldSubject);
});

describe('m3-like drives the TextField', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.textField;

  test('one height of 56; a filled field that draws its label is exactly 56 by the same formula (8 + 16 + 24 + 8)', async () => {
    expect(tokens.sizes.medium.containerHeight).toBe(56);
    expect(tokens.sizes.large.containerHeight).toBe(56);
    const { containerPaddingBlockWithLabel: padding } = tokens.sizes.medium;
    expect(2 * padding + line(system, 'bodySmall') + line(system, 'bodyLarge')).toBe(56);
    await mount(system, { variant: 'filled' });
    expect(viewStyle(container()).minHeight).toBe(56);
  });

  test('corners of extra-small (4): four on an outlined field; the top two on a filled one, square at the bottom', async () => {
    expect(tokens.containerShape).toBe(system.shape.extraSmall);
    const outlined = await mount(system, { variant: 'outlined' });
    expect(viewStyle(container())).toMatchObject({ borderTopStartRadius: 4, borderBottomEndRadius: 4 });
    await outlined.unmount();
    await mount(system, { variant: 'filled' });
    expect(viewStyle(container())).toMatchObject({ borderTopStartRadius: 4, borderBottomEndRadius: 0 });
  });

  test('focus turns the edge primary; the filled indicator rests in on-surface-variant; the label floats from body-large to body-small', async () => {
    const outlined = await mount(system, { variant: 'outlined' });
    expect(textStyle(part('label')!).fontSize).toBe(system.typescale.bodyLarge.size);
    await fireEvent(input(), 'focus');
    expect(stroke().color).toBe(role(system, 'primary'));
    expect(textStyle(part('label')!).fontSize).toBe(system.typescale.bodySmall.size);
    await outlined.unmount();
    await mount(system, { variant: 'filled' });
    expect(viewStyle(part('active-indicator')!).borderColor).toBe(role(system, 'onSurfaceVariant'));
  });
});

describe('cupertino drives the TextField', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.textField;

  test('heights 34 / 44; the filled field is the rounded fill field — all four corners 10, continuous, no indicator', async () => {
    expect([tokens.sizes.medium.containerHeight, tokens.sizes.large.containerHeight]).toEqual([34, 44]);
    await mount(system, { variant: 'filled', labelHidden: true, placeholder: 'Email' });
    expect(viewStyle(container())).toMatchObject({ minHeight: 34, borderTopStartRadius: 10, borderBottomStartRadius: 10, borderCurve: 'continuous', backgroundColor: role(system, 'surfaceContainerHigh') });
    expect(part('active-indicator')).toBeNull();
  });

  test.each(variants)('%s: hover and focus change nothing but the caret (no state layer, no focused edge)', async (variant) => {
    await mount(system, { variant, value: 'ada' });
    const resting = { container: { ...viewStyle(container()) }, label: textStyle(part('label')!).color, edge: part('outline') ? stroke() : null };
    await fireEvent(container(), 'hoverIn');
    await fireEvent(input(), 'focus');
    expect(viewStyle(container())).toEqual(resting.container);
    expect(textStyle(part('label')!).color).toBe(resting.label);
    if (resting.edge) expect(stroke()).toEqual(resting.edge);
  });

  test('TXF-13: where the corner (10) reaches past the notch padding, the gap starts at the corner and stays centred on the floated label', async () => {
    const { containerPaddingInline } = tokens.sizes.medium;
    await mount(system, { variant: 'outlined', value: 'ada' });
    const reach = Math.max(tokens.containerShape, tokens.focusedOutlineWidth);
    expect(reach).toBeGreaterThan(containerPaddingInline - tokens.outlineNotchPadding);
    expect(viewStyle(part('outline.gap')!)).toMatchObject({ paddingStart: containerPaddingInline - reach, paddingEnd: tokens.outlineNotchPadding });
    expect(textStyle(part('label')!).start).toBe(containerPaddingInline);
  });

  test('the input and label are body-large (Apple\'s 17 pt body); the caret is the tint', async () => {
    await mount(system, { value: 'ada' });
    expect(textStyle(input()).fontSize).toBe(system.typescale.bodyLarge.size);
    expect(input().props.cursorColor).toBe(role(system, 'primary'));
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — a filled-in field of each variant, where the presets differ
  // most (the edge, the corners, the floated label).
  describeFixtureBaselines(textFieldSubject, { systems: [m3Like, cupertino], fixtures: ['outlined-filled', 'filled-filled'] });
});
