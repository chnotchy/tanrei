// TextField — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/text-field.spec.json; every behaviour id is cited by the test that covers it.
import { createRef, useState, type ReactElement } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Dimensions, Easing, Text, View } from 'react-native';
import * as ReactNative from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCoreTextFieldSize, TanreiCoreTextFieldVariant, TanreiPaint, TanreiScheme, TanreiSystem, TanreiTextFieldTokens, TanreiTextFieldVariantStateTokens } from '../../generated/vocabulary';
import { graphemeCount, graphemes, limitEdit, resetGraphemeSegmenter } from '../../primitives/graphemes';
import { byTestID, describeFixtureBaselines, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { TextField, type TextFieldIconProps, type TextFieldProps, type TextFieldRef, type TextFieldSize, type TextFieldType, type TextFieldVariant } from '../TextField';
import { IconButton } from '../IconButton';
import { acme } from './__fixtures__/acme';
import { iconSlots, textFieldSubject } from './TextField.subject';

const spec = loadSpec('text-field');
const tokens: TanreiTextFieldTokens = tanrei.components.textField;
const medium = tokens.sizes.medium;
const ID = 'field';
const LABEL = 'Email';

const { host, part } = byTestID(ID);
const input = () => part('input')!;
const container = () => part('container')!;
const label = () => part('label')!;

const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const fill = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => (evaluatePaint(paint, system.colors[scheme]).a === 0 ? undefined : painted(paint, scheme, system));
const lineOf = (role: keyof typeof tanrei.typescale) => (tanrei.typescale[role] as { lineHeight: number }).lineHeight;
const floatedLineOf = () => lineOf('labelSmall');
const sizeOf = (role: keyof typeof tanrei.typescale) => (tanrei.typescale[role] as { size: number }).size;

const withField = (overrides: Partial<TanreiTextFieldTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'textField', overrides);
type FieldState = 'enabled' | 'hovered' | 'focused' | 'disabled';
const withVariant = (variant: TanreiCoreTextFieldVariant, overrides: { [State in FieldState]?: Partial<TanreiTextFieldVariantStateTokens> }, base: TanreiSystem = tanrei): TanreiSystem => {
  const current = base.components.textField.variants[variant];
  const changed = Object.fromEntries(Object.entries(overrides).map(([name, values]) => [name, { ...current[name as FieldState], ...values }]));
  return withField({ variants: { ...base.components.textField.variants, [variant]: { ...current, ...changed } } }, base);
};

function mount(props: Partial<TextFieldProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  const element: ReactElement = (
    <TanreiProvider {...provider}>
      <TextField testID={ID} label={LABEL} {...props} />
    </TanreiProvider>
  );
  return render(element);
}

const reduceMotion = (enabled: boolean) => jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(enabled));
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

const variants: TanreiCoreTextFieldVariant[] = ['filled', 'outlined'];
const sizes: TanreiCoreTextFieldSize[] = ['medium', 'large'];
const types: TextFieldType[] = ['text', 'email', 'password', 'number', 'search', 'tel', 'url'];
type Look = 'plain' | 'error';
const LOOKS: readonly Look[] = ['plain', 'error'];

/** The paints of a look, written out member by member, independently of the component. */
const paintsOf = (t: TanreiTextFieldVariantStateTokens, look: Look) =>
  look === 'plain'
    ? { container: t.containerColor, indicator: t.activeIndicatorColor, outline: t.outlineColor, label: t.labelColor, input: t.inputColor, placeholder: t.placeholderColor, affix: t.affixColor, leading: t.leadingIconColor, trailing: t.trailingIconColor, supporting: t.supportingTextColor, counter: t.counterColor, caret: t.caretColor }
    : { container: t.errorContainerColor, indicator: t.errorActiveIndicatorColor, outline: t.errorOutlineColor, label: t.errorLabelColor, input: t.errorInputColor, placeholder: t.errorPlaceholderColor, affix: t.errorAffixColor, leading: t.errorLeadingIconColor, trailing: t.errorTrailingIconColor, supporting: t.errorSupportingTextColor, counter: t.errorCounterColor, caret: t.errorCaretColor };
const widthsOf = (from: TanreiTextFieldTokens, state: FieldState) =>
  ({
    enabled: { outline: from.outlineWidth, indicator: from.activeIndicatorWidth, opacity: 1 },
    hovered: { outline: from.hoveredOutlineWidth, indicator: from.hoveredActiveIndicatorWidth, opacity: from.hoveredOpacity },
    focused: { outline: from.focusedOutlineWidth, indicator: from.focusedActiveIndicatorWidth, opacity: from.focusedOpacity },
    disabled: { outline: from.disabledOutlineWidth, indicator: from.disabledActiveIndicatorWidth, opacity: from.disabledOpacity },
  })[state];

/** The border's stroke: a Ring when no label is drawn, else the piece along the sides and the bottom. */
const outlineStroke = () => {
  const outline = part('outline');
  if (!outline) return null;
  const node = outline.children.length ? (outline.children[0] as typeof outline) : outline;
  const style = viewStyle(node);
  return { color: style.borderColor, width: style.borderWidth ?? style.borderBottomWidth };
};

/** Every part TXF-6 / TXF-5 / TXF-11 name, from one state's tokens of one look (fixture: a value, supporting text, counter, icons). */
function expectDrawnFrom(variant: TanreiCoreTextFieldVariant, state: FieldState, look: Look = 'plain', from: TanreiTextFieldTokens = tokens, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) {
  const p = paintsOf(from.variants[variant][state], look);
  const w = widthsOf(from, state);
  const box = viewStyle(container());
  expect(box.backgroundColor).toBe(fill(p.container, scheme, system));
  expect(box.opacity).toBe(w.opacity);
  if (part('label')) expect(textStyle(label()).color).toBe(painted(p.label, scheme, system));
  expect(textStyle(input()).color).toBe(painted(p.input, scheme, system));
  expect(input().props.placeholderTextColor).toBe(painted(p.placeholder, scheme, system));
  expect(input().props.cursorColor).toBe(painted(p.caret, scheme, system));
  expect(input().props.selectionColor).toBe(painted(p.caret, scheme, system));
  if (part('supporting-text')) expect(textStyle(part('supporting-text')!).color).toBe(painted(p.supporting, scheme, system));
  if (part('counter')) expect(textStyle(part('counter')!).color).toBe(painted(p.counter, scheme, system));
  if (part('leading-icon.glyph')) expect(textStyle(part('leading-icon.glyph')!).color).toBe(painted(p.leading, scheme, system));
  if (part('trailing-icon.glyph')) expect(textStyle(part('trailing-icon.glyph')!).color).toBe(painted(p.trailing, scheme, system));
  if (part('prefix')) expect(textStyle(part('prefix')!).color).toBe(painted(p.affix, scheme, system));
  const outline = fill(p.outline, scheme, system);
  if (outline === undefined) expect(part('outline')).toBeNull();
  else expect(outlineStroke()).toEqual({ color: outline, width: w.outline });
  const indicator = fill(p.indicator, scheme, system);
  if (indicator === undefined) expect(part('active-indicator')).toBeNull();
  else expect(viewStyle(part('active-indicator')!)).toMatchObject({ borderColor: indicator, borderBottomWidth: w.indicator });
}

const FULL: Partial<TextFieldProps> = { value: 'ada@', supportingText: 'Help', errorText: 'Wrong', counter: true, leadingIcon: 'search', trailingIcon: 'close', prefix: '$' };

async function enter(state: FieldState) {
  if (state === 'hovered') await fireEvent(container(), 'hoverIn');
  if (state === 'focused') await fireEvent(input(), 'focus');
}

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // The React Native Jest preset's window has fontScale 2; baselines and geometry are recorded at 1 (the tokens' own
  // sizes), and one test sets 2 on purpose.
  Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
beforeEach(() => {
  reduceMotion(true);
  resetLookupReports();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(TextField.name);
    expect(platform.props).toEqual({
      variant: 'variant',
      size: 'size',
      type: 'type',
      value: 'value',
      label: 'label',
      labelHidden: 'labelHidden',
      placeholder: 'placeholder',
      supportingText: 'supportingText',
      errorText: 'errorText',
      error: 'error',
      disabled: 'disabled',
      readOnly: 'readOnly',
      required: 'required',
      multiline: 'multiline',
      minRows: 'minRows',
      maxRows: 'maxRows',
      maxLength: 'maxLength',
      counter: 'counter',
      prefixText: 'prefix',
      suffixText: 'suffix',
      autocomplete: 'autoComplete',
    });
    expect(platform.events).toEqual({ input: 'onChangeText', change: 'onEndEditing', action: 'onSubmitEditing' });
  });

  test('the enum values under test are exactly the spec values; variant and size are the token axes', () => {
    const values = (name: string) => spec.props.find((p) => p.name === name)?.values;
    expect(values('variant')).toEqual(variants);
    expect(values('size')).toEqual(sizes);
    expect(values('type')).toEqual(types);
    expect(Object.keys(tokens.variants)).toEqual(variants);
    expect(Object.keys(tokens.sizes)).toEqual(sizes);
  });

  test('defaults follow the spec: outlined, medium, text, empty, single-line, enabled', async () => {
    await mount();
    expectDrawnFrom('outlined', 'enabled');
    expect(input().props).toMatchObject({ value: '', multiline: false, readOnly: false, focusable: true, keyboardType: 'default', inputMode: 'text' });
    expect(viewStyle(container()).minHeight).toBe(medium.containerHeight);
    expect(part('supporting-row')).toBeNull();
  });
});

describe('events (TXF-1, TXF-2, TXF-3)', () => {
  test('TXF-1: a user change emits onChangeText once with the new value; the product setting value emits nothing', async () => {
    const onChangeText = jest.fn();
    const onEndEditing = jest.fn();
    const view = await mount({ value: 'a', onChangeText, onEndEditing });
    await fireEvent.changeText(input(), 'ab');
    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(onChangeText).toHaveBeenCalledWith('ab');
    await view.rerender(
      <TanreiProvider theme="light">
        <TextField testID={ID} label={LABEL} value="set by the product" onChangeText={onChangeText} onEndEditing={onEndEditing} />
      </TanreiProvider>,
    );
    expect(input().props.value).toBe('set by the product');
    expect(onChangeText).toHaveBeenCalledTimes(1);
    expect(onEndEditing).not.toHaveBeenCalled();
  });

  test('TXF-1: paste, cut, dictation and autofill all arrive as a change of the native text — each is one onChangeText', async () => {
    const onChangeText = jest.fn();
    await mount({ onChangeText });
    for (const next of ['pasted text', 'pasted', 'pasted and dictated']) await fireEvent.changeText(input(), next);
    expect(onChangeText.mock.calls.map(([v]) => v)).toEqual(['pasted text', 'pasted', 'pasted and dictated']);
  });

  test('TXF-1: without a value the field keeps its own (uncontrolled), starting from defaultValue', async () => {
    await mount({ defaultValue: 'start' });
    expect(input().props.value).toBe('start');
    await fireEvent.changeText(input(), 'started');
    expect(input().props.value).toBe('started');
  });

  test('TXF-2: onEndEditing is called once, when focus leaves with a value other than the one at focus', async () => {
    const onEndEditing = jest.fn();
    function App() {
      const [value, setValue] = useState('a');
      return (
        <TanreiProvider theme="light">
          <TextField testID={ID} label={LABEL} value={value} onChangeText={setValue} onEndEditing={onEndEditing} />
        </TanreiProvider>
      );
    }
    await render(<App />);
    await fireEvent(input(), 'focus');
    await fireEvent(input(), 'blur');
    expect(onEndEditing).not.toHaveBeenCalled();
    await fireEvent(input(), 'focus');
    await fireEvent.changeText(input(), 'ab');
    await fireEvent(input(), 'endEditing', { nativeEvent: { text: 'ab' } });
    await fireEvent(input(), 'blur');
    expect(onEndEditing).toHaveBeenCalledTimes(1);
    expect(onEndEditing).toHaveBeenCalledWith('ab');
    // Back to the value it had at focus: no change.
    await fireEvent(input(), 'focus');
    await fireEvent.changeText(input(), 'abc');
    await fireEvent.changeText(input(), 'ab');
    await fireEvent(input(), 'blur');
    expect(onEndEditing).toHaveBeenCalledTimes(1);
  });

  test('TXF-3: the action key in a single-line field commits (onEndEditing), then calls onSubmitEditing; the blur after it commits nothing again', async () => {
    const calls: string[] = [];
    const onEndEditing = jest.fn((v: string) => calls.push(`change:${v}`));
    const onSubmitEditing = jest.fn((v: string) => calls.push(`action:${v}`));
    await mount({ onEndEditing, onSubmitEditing });
    await fireEvent(input(), 'focus');
    await fireEvent.changeText(input(), 'ada');
    await fireEvent(input(), 'submitEditing', { nativeEvent: { text: 'ada' } });
    await fireEvent(input(), 'endEditing', { nativeEvent: { text: 'ada' } });
    await fireEvent(input(), 'blur');
    expect(calls).toEqual(['change:ada', 'action:ada']);
    expect(input().props.submitBehavior).toBe('blurAndSubmit');
  });

  test('TXF-3: the action key without a change calls onSubmitEditing only', async () => {
    const onEndEditing = jest.fn();
    const onSubmitEditing = jest.fn();
    await mount({ value: 'ada', onEndEditing, onSubmitEditing });
    await fireEvent(input(), 'focus');
    await fireEvent(input(), 'submitEditing', { nativeEvent: { text: 'ada' } });
    expect(onEndEditing).not.toHaveBeenCalled();
    expect(onSubmitEditing).toHaveBeenCalledWith('ada');
  });

  test('TXF-3: in a multi-line field Enter is a line break — submitBehavior newline — and never onSubmitEditing', async () => {
    const onSubmitEditing = jest.fn();
    await mount({ multiline: true, onSubmitEditing });
    expect(input().props.submitBehavior).toBe('newline');
    await fireEvent(input(), 'submitEditing', { nativeEvent: { text: '' } });
    expect(onSubmitEditing).not.toHaveBeenCalled();
  });
});

describe('composition (TXF-4)', () => {
  test('TXF-4: the field hands the composition to the native TextInput — no keystroke handling of its own; a product that echoes value back causes no extra event', async () => {
    const onChangeText = jest.fn();
    const onEndEditing = jest.fn();
    function Echo() {
      const [value, setValue] = useState('');
      return (
        <TanreiProvider theme="light">
          <TextField
            testID={ID}
            label={LABEL}
            value={value}
            onChangeText={(next) => {
              onChangeText(next);
              setValue(next);
            }}
            onEndEditing={onEndEditing}
          />
        </TanreiProvider>
      );
    }
    await render(<Echo />);
    await fireEvent(input(), 'focus');
    // A Japanese input method: marked text grows, then is committed; React Native reports each step as a change.
    for (const step of ['k', 'か', 'かん', '漢']) await fireEvent.changeText(input(), step);
    expect(onChangeText.mock.calls.map(([v]) => v)).toEqual(['k', 'か', 'かん', '漢']);
    // The echo reaches the TextInput as the same text the native element holds — nothing to write back.
    expect(input().props.value).toBe('漢');
    expect(onEndEditing).not.toHaveBeenCalled();
    expect(input().props.onKeyPress).toBeUndefined();
    expect(input().props.onTextInput).toBeUndefined();
  });
});

describe('disabled and read-only (TXF-5, TXF-10)', () => {
  test('TXF-5: a disabled field is not focusable or editable, emits nothing, and exposes disabled', async () => {
    const onChangeText = jest.fn();
    const onEndEditing = jest.fn();
    const onSubmitEditing = jest.fn();
    await mount({ value: 'ada', disabled: true, onChangeText, onEndEditing, onSubmitEditing });
    expect(input().props).toMatchObject({ readOnly: true, focusable: false, accessibilityState: { disabled: true } });
    expect(container().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(input(), 'adam');
    await fireEvent(input(), 'submitEditing', { nativeEvent: { text: 'adam' } });
    await fireEvent(input(), 'blur');
    expect(onChangeText).not.toHaveBeenCalled();
    expect(onEndEditing).not.toHaveBeenCalled();
    expect(onSubmitEditing).not.toHaveBeenCalled();
    expect(input().props.value).toBe('ada');
  });

  describe.each(variants)('TXF-5: disabled %s', (variant) => {
    test.each(LOOKS)('%s: every part from its disabled tokens', async (look) => {
      await mount({ variant, disabled: true, error: look === 'error', ...FULL });
      expectDrawnFrom(variant, 'disabled', look);
      // A hover or a focus that still arrives changes nothing.
      await enter('hovered');
      await enter('focused');
      expectDrawnFrom(variant, 'disabled', look);
    });
  });

  test('TXF-5: in the default system a disabled field keeps its fill and fades its content; the outlined border fades to the container opacity', async () => {
    const { state } = tanrei;
    const faded = (a: number) => formatColor({ ...tanrei.colors.light.onSurface, a });
    await mount({ variant: 'filled', disabled: true, value: 'ada' });
    expect(viewStyle(container()).backgroundColor).toBe(painted(tokens.variants.filled.enabled.containerColor));
    expect(textStyle(input()).color).toBe(faded(state.disabledContentOpacity));
    await screen.unmount();
    await mount({ variant: 'outlined', disabled: true, value: 'ada' });
    expect(outlineStroke()!.color).toBe(faded(state.disabledContainerOpacity));
    expect(viewStyle(container()).backgroundColor).toBeUndefined();
  });

  test('TXF-10: a read-only field stays focusable and selectable, is not editable, emits nothing and is drawn as an enabled field — hover and focus included', async () => {
    const onChangeText = jest.fn();
    const onEndEditing = jest.fn();
    await mount({ variant: 'filled', value: 'ada', readOnly: true, onChangeText, onEndEditing });
    expect(input().props).toMatchObject({ readOnly: true, focusable: true, accessibilityState: { disabled: false } });
    expect(input().props.selectTextOnFocus).toBeUndefined();
    await fireEvent.changeText(input(), 'adam');
    expect(onChangeText).not.toHaveBeenCalled();
    expect(input().props.value).toBe('ada');
    expectDrawnFrom('filled', 'enabled');
    await enter('hovered');
    expectDrawnFrom('filled', 'hovered');
    await enter('focused');
    expectDrawnFrom('filled', 'focused');
    await fireEvent(input(), 'blur');
    expect(onEndEditing).not.toHaveBeenCalled();
  });
});

describe('states (TXF-6, TXF-7, TXF-8, TXF-14)', () => {
  describe.each(variants)('TXF-6: %s', (variant) => {
    test.each(LOOKS.flatMap((look) => (['hovered', 'focused'] as const).map((state) => ({ look, state }))))('$look, $state: every part, the edge widths and the opacity from its tokens', async ({ look, state }) => {
      await mount({ variant, error: look === 'error', ...FULL });
      expectDrawnFrom(variant, 'enabled', look);
      await enter(state);
      expectDrawnFrom(variant, state, look);
    });
  });

  test('TXF-6: focused wins over hovered, and focus by touch selects the focused state too', async () => {
    const system = withVariant('outlined', { hovered: { outlineColor: literal(1, 0, 0) }, focused: { outlineColor: literal(2, 0, 0) } });
    await mount({}, { theme: 'light', system });
    await fireEvent(container(), 'hoverIn');
    expect(outlineStroke()!.color).toBe('rgb(1, 0, 0)');
    // A press on the field focuses the input: the focus event arrives as it would from a touch.
    await fireEvent.press(container());
    await fireEvent(input(), 'focus');
    expect(outlineStroke()!.color).toBe('rgb(2, 0, 0)');
    await fireEvent(input(), 'blur');
    expect(outlineStroke()!.color).toBe('rgb(1, 0, 0)');
    await fireEvent(container(), 'hoverOut');
    expect(outlineStroke()!.color).toBe(painted(tokens.variants.outlined.enabled.outlineColor));
  });

  test('TXF-6: in the default system focus thickens the edge to border.thick in focus-ring, recolors the label and keeps the container; hover puts the state layer on a filled container only', async () => {
    const { measure, state } = tanrei;
    const focusRing = formatColor(tanrei.colors.light.focusRing);
    const outlined = await mount({ variant: 'outlined', value: 'ada' });
    await enter('focused');
    expect(outlineStroke()).toEqual({ color: focusRing, width: measure.border.thick });
    expect(textStyle(label()).color).toBe(formatColor(tanrei.colors.light.primary));
    expect(viewStyle(container()).backgroundColor).toBeUndefined();
    await outlined.unmount();

    await mount({ variant: 'filled', value: 'ada' });
    const resting = viewStyle(container()).backgroundColor;
    await enter('hovered');
    const layer: TanreiPaint = { kind: 'mix', base: tokens.variants.filled.enabled.containerColor, with: tokens.variants.filled.enabled.stateLayerColor, amount: state.hoverStateLayerOpacity };
    expect(viewStyle(container()).backgroundColor).toBe(painted(layer));
    await enter('focused');
    expect(viewStyle(container()).backgroundColor).toBe(resting);
    expect(viewStyle(part('active-indicator')!)).toMatchObject({ borderColor: focusRing, borderBottomWidth: measure.border.thick });
  });

  test('TXF-7: the focused edge is the indicator — no focus ring is drawn, whatever the focus style', async () => {
    await mount({ variant: 'outlined' });
    await enter('focused');
    expect(part('focus-ring')).toBeNull();
    expect(part('glow')).toBeNull();
  });

  test('TXF-7: under focus-style glow (acme) the glow is drawn around the container while focused, besides the edge', async () => {
    expect(acme.behavior.focusStyle).toBe('glow');
    await mount({ variant: 'outlined' }, { theme: 'light', system: acme });
    expect(part('glow')).toBeNull();
    await enter('focused');
    const { offset, innerWidth, outerWidth } = acme.measure.focus;
    expect(viewStyle(part('glow')!)).toMatchObject({
      borderRadius: acme.components.textField.containerShape + offset,
      boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: outerWidth, spreadDistance: innerWidth + outerWidth, color: painted({ kind: 'role', role: 'focusRing' }, 'light', acme) }],
    });
    await fireEvent(input(), 'blur');
    expect(part('glow')).toBeNull();
  });

  test('TXF-7: a renderer without boxShadow draws no glow — the edge alone shows focus (the first value, and never the ring)', async () => {
    const fabric = (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager;
    (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager = undefined;
    try {
      await mount({}, { theme: 'light', system: acme });
      await enter('focused');
      expect(part('glow')).toBeNull();
      expect(part('focus-ring')).toBeNull();
    } finally {
      (globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager = fabric;
    }
  });

  test('TXF-8: a press anywhere on the field focuses the input and draws no press answer', async () => {
    const ref = createRef<TextFieldRef>();
    await mount({ ref, leadingIcon: 'search' });
    const focus = jest.spyOn(ref.current as unknown as { focus: () => void }, 'focus').mockClear();
    const before = { ...viewStyle(container()) };
    await fireEvent(container(), 'pressIn');
    expect(viewStyle(container())).toEqual(before);
    await fireEvent.press(container());
    expect(focus).toHaveBeenCalledTimes(1);
    expect(part('ripple')).toBeNull();
    // The label and the decorative icon do not take the press.
    expect(textStyle(label()).pointerEvents).toBe('none');
    expect(part('leading-icon')!.props.accessible).toBe(false);
  });

  test('TXF-8: a disabled field does not focus on a press', async () => {
    const ref = createRef<TextFieldRef>();
    await mount({ ref, disabled: true });
    const focus = jest.spyOn(ref.current as unknown as { focus: () => void }, 'focus').mockClear();
    await fireEvent.press(container());
    expect(focus).not.toHaveBeenCalled();
  });

  test.each([
    { size: 'medium' as const, slop: 6 },
    { size: 'large' as const, slop: 4 },
  ])('TXF-8: the $size field extends its hit area vertically to sys.target.touch, not horizontally, without changing its size', async ({ size, slop }) => {
    await mount({ size });
    expect(container().props.hitSlop).toEqual({ top: slop, bottom: slop, left: 0, right: 0 });
    expect(Number(viewStyle(container()).minHeight) + 2 * slop).toBeGreaterThanOrEqual(tanrei.measure.target.touch);
  });

  test('TXF-8: the container itself is not an accessibility element or a focus stop (the input is)', async () => {
    await mount();
    expect(container().props).toMatchObject({ accessible: false, focusable: false });
    expect(screen.getAllByLabelText(LABEL)).toEqual([input()]);
  });

  test('TXF-14: colors and widths move over the state motion tokens', async () => {
    reduceMotion(false);
    const timing = jest.spyOn(Animated, 'timing');
    const bezier = jest.spyOn(Easing, 'bezier');
    await mount({ variant: 'outlined', value: 'ada' });
    timing.mockClear();
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await fireEvent(input(), 'focus');
    expect(bezier).toHaveBeenCalledWith(...tokens.motionStateEasing);
    expect(timing.mock.calls.some(([, config]) => config.duration === tokens.motionStateDuration && config.useNativeDriver === false)).toBe(true);
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    expect(ranges).toContainEqual([tokens.outlineWidth, tokens.focusedOutlineWidth]);
    expect(ranges).toContainEqual([painted(tokens.variants.outlined.enabled.outlineColor), painted(tokens.variants.outlined.focused.outlineColor)]);
    await wait(tokens.motionStateDuration * 2);
    expect(outlineStroke()!.width).toBe(tokens.focusedOutlineWidth);
  });

  test('TXF-14: the label floats over the label motion tokens — position and size together — and the gap in the border opens with it', async () => {
    reduceMotion(false);
    const system = withField({ motionLabelDuration: 40, motionStateDuration: 30 });
    const timing = jest.spyOn(Animated, 'timing');
    const interpolate = jest.spyOn(Animated.Value.prototype, 'interpolate');
    await mount({ variant: 'outlined' }, { theme: 'light', system });
    expect(part('outline.bridge')).not.toBeNull();
    timing.mockClear();
    interpolate.mockClear();
    await fireEvent(input(), 'focus');
    expect(timing.mock.calls.some(([, config]) => config.duration === 40)).toBe(true);
    const ranges = interpolate.mock.calls.map(([config]) => config.outputRange);
    expect(ranges).toContainEqual([sizeOf('label'), sizeOf('labelSmall')]);
    expect(ranges).toContainEqual([lineOf('label'), lineOf('labelSmall')]);
    await wait(120);
    expect(textStyle(label())).toMatchObject({ fontSize: sizeOf('labelSmall'), lineHeight: lineOf('labelSmall') });
    expect(part('outline.bridge')).toBeNull();
  });

  test('TXF-14: where motion is reduced both changes land at once', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await mount({ variant: 'outlined' });
    await fireEvent(input(), 'focus');
    expect(timing).not.toHaveBeenCalled();
    expect(textStyle(label()).fontSize).toBe(sizeOf('labelSmall'));
    expectDrawnFrom('outlined', 'focused');
  });
});

describe('open keys (TXF-9)', () => {
  const development = (enabled: boolean) => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
  };
  afterEach(() => development(true));

  test('TXF-9: an unknown variant and size render exactly like outlined and medium', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reference = await mount({ ...FULL });
    const expected = JSON.stringify(reference.toJSON());
    await reference.unmount();
    await mount({ ...FULL, variant: 'ghost' as TextFieldVariant, size: 'jumbo' as TextFieldSize });
    expect(JSON.stringify(screen.toJSON())).toBe(expected);
  });

  test('TXF-9: an unknown type behaves as text; development builds report each unknown value once', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (let i = 0; i < 2; i += 1) {
      const view = await mount({ type: 'date' as TextFieldType, variant: 'phantom' as TextFieldVariant, size: 'colossal' as TextFieldSize });
      expect(input().props).toMatchObject({ keyboardType: 'default', inputMode: 'text' });
      expect(input().props.secureTextEntry).toBeUndefined();
      await view.unmount();
    }
    const reports = (needle: string) => warn.mock.calls.filter(([message]) => String(message).includes(needle));
    expect(reports('TextField type "date" is not defined; using "text"')).toHaveLength(1);
    expect(reports('no TextField variant "phantom"; using "outlined"')).toHaveLength(1);
    expect(reports('no TextField size "colossal"; using "medium"')).toHaveLength(1);
  });

  test('TXF-9: a release build renders the defaults silently', async () => {
    development(false);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ type: 'week' as TextFieldType, variant: 'spectre' as TextFieldVariant });
    expectDrawnFrom('outlined', 'enabled');
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('error (TXF-11, TXF-12)', () => {
  test('TXF-11: error draws the error parts, shows errorText in place of supportingText, and makes it the description', async () => {
    await mount({ variant: 'outlined', value: 'ada@', error: true, errorText: 'Enter a complete email address.', supportingText: 'We only use it to sign you in.' });
    expectDrawnFrom('outlined', 'enabled', 'error');
    expect(part('supporting-text')!.props.children).toBe('Enter a complete email address.');
    expect(input().props.accessibilityHint).toBe('Enter a complete email address.');
    expect(outlineStroke()!.color).toBe(formatColor(tanrei.colors.light.error));
  });

  test('TXF-11: while errorText is empty the supporting text stays; without error errorText is not shown', async () => {
    const view = await mount({ value: 'x', error: true, supportingText: 'Help' });
    expect(part('supporting-text')!.props.children).toBe('Help');
    await view.unmount();
    await mount({ value: 'x', errorText: 'Wrong', supportingText: 'Help' });
    expect(part('supporting-text')!.props.children).toBe('Help');
    expectDrawnFrom('outlined', 'enabled', 'plain');
  });

  test('TXF-12: an error that appears while the input has focus is announced once, politely; changing errorText announces again', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockClear();
    const field = (props: Partial<TextFieldProps>) => (
      <TanreiProvider theme="light">
        <TextField testID={ID} label={LABEL} value="ada@" {...props} />
      </TanreiProvider>
    );
    const view = await render(field({}));
    await fireEvent(input(), 'focus');
    await view.rerender(field({ error: true, errorText: 'Enter a complete email address.' }));
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Enter a complete email address.', { queue: true });
    await view.rerender(field({ error: true, errorText: 'Enter a complete email address.' }));
    expect(announce).toHaveBeenCalledTimes(1);
    await view.rerender(field({ error: true, errorText: 'Add the domain.' }));
    expect(announce).toHaveBeenCalledTimes(2);
  });

  test('TXF-12: an error set while the field is not focused is not announced — it is the description the next time', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockClear();
    const view = await mount({ value: 'ada@' });
    await view.rerender(
      <TanreiProvider theme="light">
        <TextField testID={ID} label={LABEL} value="ada@" error errorText="Enter a complete email address." />
      </TanreiProvider>,
    );
    expect(announce).not.toHaveBeenCalled();
    expect(input().props.accessibilityHint).toBe('Enter a complete email address.');
  });
});

describe('the label (TXF-13, TXF-15, TXF-16)', () => {
  const floatedLine = lineOf('labelSmall');

  test('TXF-13: an empty, unfocused outlined field rests its label in the input line in label.typescale; focused or filled it floats onto the border\'s top edge in label.floated-typescale', async () => {
    const view = await mount({ variant: 'outlined' });
    const lineTop = (medium.containerHeight - lineOf('body')) / 2;
    expect(textStyle(label())).toMatchObject({ fontSize: sizeOf('label'), lineHeight: lineOf('label'), top: lineTop + (lineOf('body') - lineOf('label')) / 2, start: medium.containerPaddingInline });
    await fireEvent(input(), 'focus');
    expect(textStyle(label())).toMatchObject({ fontSize: sizeOf('labelSmall'), lineHeight: floatedLine, top: (tokens.outlineWidth - floatedLine) / 2, start: medium.containerPaddingInline });
    await view.unmount();
    await mount({ variant: 'outlined', value: 'ada' });
    expect(textStyle(label()).fontSize).toBe(sizeOf('labelSmall'));
  });

  test('TXF-13: the floated label on a border opens a gap of the notch padding on each side of it; resting, a line bridges the gap', async () => {
    const view = await mount({ variant: 'outlined' });
    const gap = part('outline.gap')!;
    expect(viewStyle(gap)).toMatchObject({ paddingStart: tokens.outlineNotchPadding, paddingEnd: tokens.outlineNotchPadding, overflow: 'hidden' });
    // The gap is as wide as the floated label: the label's own text, in the floated style, not drawn.
    expect(textStyle(gap.children[0] as never)).toMatchObject({ fontSize: sizeOf('labelSmall'), opacity: 0 });
    expect(viewStyle(part('outline.bridge')!)).toMatchObject({ transform: [{ scaleX: 1 }], backgroundColor: outlineStroke()!.color });
    // The first top segment ends at the label's start minus the notch padding.
    const segments = part('outline')!.children[1] as ReturnType<typeof part> & object;
    const lead = segments.children[1] as typeof segments;
    expect(viewStyle(lead).width).toBe(medium.containerPaddingInline - tokens.outlineNotchPadding - Math.max(tokens.containerShape, tokens.focusedOutlineWidth));
    await view.unmount();
    await mount({ variant: 'outlined', value: 'ada' });
    expect(part('outline.bridge')).toBeNull();
    expect(part('outline.gap')).not.toBeNull();
  });

  test('TXF-13 / TXF-16: a filled field that draws its label is 2 × padding-block-with-label + a floated line + an input line tall; the label rests centred in the container and floats to the top of the box', async () => {
    const view = await mount({ variant: 'filled' });
    const tall = 2 * medium.containerPaddingBlockWithLabel + floatedLine + lineOf('body');
    expect(tall).toBe(46);
    expect(viewStyle(container())).toMatchObject({ minHeight: tall, paddingVertical: medium.containerPaddingBlockWithLabel });
    // Centred in the container — not in the input line below the floated-label band.
    expect(textStyle(label()).top).toBe((tall - lineOf('label')) / 2);
    expect(textStyle(label()).top).not.toBe(medium.containerPaddingBlockWithLabel + floatedLine + (lineOf('body') - lineOf('label')) / 2);
    await fireEvent(input(), 'focus');
    expect(textStyle(label())).toMatchObject({ top: medium.containerPaddingBlockWithLabel, start: medium.containerPaddingInline, fontSize: sizeOf('labelSmall') });
    await view.unmount();
    // Without a drawn label it keeps the row height.
    await mount({ variant: 'filled', labelHidden: true });
    expect(viewStyle(container())).toMatchObject({ minHeight: medium.containerHeight, paddingVertical: medium.containerPaddingBlock });
  });

  test('TXF-13: beside a leading icon an outlined field floats its label to container.padding-inline, over the icon, and rests it at the input text; a filled field keeps it at the input text in both positions', async () => {
    for (const size of sizes) {
      const { containerPaddingInline, containerPaddingInlineWithIcon, iconSize, containerGap } = tokens.sizes[size];
      const textStart = containerPaddingInlineWithIcon + iconSize + containerGap;
      const outlined = await mount({ size, variant: 'outlined', leadingIcon: 'search' });
      expect(textStyle(label()).start).toBe(textStart);
      await fireEvent(input(), 'focus');
      expect(textStyle(label()).start).toBe(containerPaddingInline);
      expect(textStyle(label()).start).toBeLessThan(containerPaddingInlineWithIcon + iconSize);
      await outlined.unmount();
      const filled = await mount({ size, variant: 'filled', leadingIcon: 'search' });
      expect(textStyle(label()).start).toBe(textStart);
      await fireEvent(input(), 'focus');
      expect(textStyle(label()).start).toBe(textStart);
      await filled.unmount();
    }
  });

  test('TXF-13: in a field 96 wide a label that needs two lines wraps, resting and floated, in both variants: every line is drawn, none reaches the input line, the field grows, and an outlined gap is as wide as the widest line', async () => {
    // React Native lays text out natively: the test plays the layout a device reports for "Email address" 96 wide.
    const restingLine = lineOf('label');
    const lines = (height: number, widths: number[]) => widths.map((width, index) => ({ x: 0, y: index * height, width, height, text: '', ascender: 0, descender: 0, capHeight: 0, xHeight: 0 }));
    const RESTING = lines(restingLine, [44, 58]);
    const FLOATED = lines(floatedLine, [40, 47]);
    const inputLine = lineOf('body');
    /** The container's height and the room reserved above it, as laid out (the one-line geometry is the tokens'). */
    const extent = () => {
      const box = viewStyle(container());
      return { height: box.minHeight as number, above: (box.marginTop as number | undefined) ?? 0 };
    };

    for (const variant of variants) {
      const one = await mount({ variant, label: 'Email', style: { width: 96 } });
      const oneLine = extent();
      await fireEvent(input(), 'focus');
      const oneLineFloated = { top: textStyle(label()).top as number, bottom: (textStyle(label()).top as number) + floatedLine };
      await one.unmount();

      const view = await mount({ variant, label: 'Email address', style: { width: 96 } });
      // A label that fits renders nothing more: only once the drawn label reports a second line is it measured.
      expect(part('label.measure.resting')).toBeNull();
      await fireEvent(label(), 'textLayout', { nativeEvent: { lines: RESTING } });
      for (const position of ['resting', 'floated'] as const) {
        const copy = part(`label.measure.${position}`)!;
        // Measured where it is drawn — the same start, end and style — and never drawn or read.
        expect(textStyle(copy)).toMatchObject({ opacity: 0, start: position === 'resting' || variant === 'filled' ? textStyle(label()).start : medium.containerPaddingInline, end: textStyle(label()).end });
        expect(textStyle(copy).fontSize).toBe(sizeOf(position === 'resting' ? 'label' : 'labelSmall'));
        expect(copy.props.accessibilityElementsHidden).toBe(true);
        await fireEvent(copy, 'textLayout', { nativeEvent: { lines: position === 'resting' ? RESTING : FLOATED } });
      }

      // Every line is drawn: nothing limits the lines or cuts the label.
      expect(label().props.numberOfLines).toBeUndefined();
      expect(label().props.ellipsizeMode).toBeUndefined();
      expect(label().props.children).toBe('Email address');
      // The field is taller than with a one-line label.
      const grown = extent();
      expect(grown.height + grown.above).toBeGreaterThan(oneLine.height + oneLine.above);

      // Resting, the label wraps inside the container, centred in it.
      const resting = textStyle(label());
      expect(resting.fontSize).toBe(sizeOf('label'));
      expect(resting.top).toBe((grown.height - 2 * restingLine) / 2);
      expect(resting.top as number).toBeGreaterThanOrEqual(0);
      expect((resting.top as number) + 2 * restingLine).toBeLessThanOrEqual(grown.height);

      // Resting, the outlined field already reserves the room for the floated lines above the last (a filled field its band).
      if (variant === 'outlined') expect(grown.above).toBe(floatedLine);

      await fireEvent(input(), 'focus');
      // Neither variant changes height when its label floats (TXF-13, TXF-16): the same container, the same room above it.
      expect(extent()).toEqual(grown);
      const floated = textStyle(label());
      expect(floated.fontSize).toBe(sizeOf('labelSmall'));
      const top = floated.top as number;
      const bottom = top + 2 * floatedLine;
      if (variant === 'filled') {
        // Both lines above the input line: the band above it holds them, and the input line starts where they end.
        const band = part('input')!.parent!.parent!.children[0] as ReturnType<typeof part> & object;
        expect(viewStyle(band).height).toBe(2 * floatedLine);
        expect(top).toBe(medium.containerPaddingBlockWithLabel);
        expect(bottom).toBeLessThanOrEqual(top + (viewStyle(band).height as number));
        expect(grown.height).toBe(2 * medium.containerPaddingBlockWithLabel + 2 * floatedLine + inputLine);
        expect(grown.above).toBe(0);
      } else {
        // The last line sits on the outline's top edge where a one-line label does; the line above it takes the room
        // reserved above the container, so the label reaches no further toward the input line than one line would.
        expect(grown.above).toBe(floatedLine);
        expect(bottom).toBe(oneLineFloated.bottom);
        expect(top).toBe(oneLineFloated.top - floatedLine);
        expect(top + floatedLine).toBeLessThanOrEqual(0);
        // Above the reserved room it reaches only as far as a one-line label reaches above the container.
        expect(top + grown.above).toBe(oneLineFloated.top);
        // The gap is as wide as the widest line, notch padding on each side.
        const gap = part('outline.gap')!;
        expect(viewStyle(part('outline.gap.label')!).width).toBe(47);
        expect(viewStyle(gap)).toMatchObject({ paddingEnd: tokens.outlineNotchPadding });
        expect(part('outline.bridge')).toBeNull();
      }
      await view.unmount();
    }
  });

  test('TXF-15: labelHidden or an empty label draws no label; the placeholder shows only when the label is floated or not drawn', async () => {
    const hidden = await mount({ labelHidden: true, placeholder: 'Search components' });
    expect(part('label')).toBeNull();
    expect(input().props.placeholder).toBe('Search components');
    await hidden.unmount();
    const resting = await mount({ placeholder: 'name@example.com' });
    expect(input().props.placeholder).toBe('');
    await fireEvent(input(), 'focus');
    expect(input().props.placeholder).toBe('name@example.com');
    await resting.unmount();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ label: '', placeholder: 'hint' });
    expect(part('label')).toBeNull();
    expect(input().props.placeholder).toBe('hint');
  });

  test('TXF-15: the suffix sits at the end of the input line, affix.gap after the input, however short the value', async () => {
    await mount({ value: '1', suffix: 'kg', labelHidden: true });
    const row = part('suffix')!.parent!;
    const children = row.children as { props: { testID?: string } }[];
    expect(children.at(-1)!.props.testID).toBe(`${ID}.suffix`);
    // The input takes the rest of the line, so the suffix is pushed to its end, not placed after the typed text.
    expect(textStyle(input())).toMatchObject({ flex: 1 });
    expect(viewStyle(row).gap).toBe(tokens.affixGap);
  });

  test('TXF-15: while shown, the prefix and suffix are part of the input\'s description (read with the value); the drawn ones are not read twice', async () => {
    const view = await mount({ value: '120', prefix: '$', suffix: 'USD', supportingText: 'Before tax' });
    expect(input().props.accessibilityHint).toBe('$ USD, Before tax');
    for (const name of ['prefix', 'suffix']) expect(part(name)!.props).toMatchObject({ accessible: false, importantForAccessibility: 'no-hide-descendants' });
    await view.unmount();
    // Not shown (the label rests in the empty field): not in the description either.
    await mount({ prefix: '$', suffix: 'USD', supportingText: 'Before tax' });
    expect(part('prefix')).toBeNull();
    expect(input().props.accessibilityHint).toBe('Before tax');
  });

  test('TXF-15: prefix and suffix are shown exactly when the label is floated or not drawn, affix.gap from the value, in the input style', async () => {
    const view = await mount({ prefix: '$', suffix: 'USD' });
    expect(part('prefix')).toBeNull();
    expect(part('suffix')).toBeNull();
    await fireEvent(input(), 'focus');
    expect(textStyle(part('prefix')!)).toMatchObject({ fontSize: sizeOf('body'), lineHeight: lineOf('body'), color: painted(tokens.variants.outlined.focused.affixColor) });
    expect(part('suffix')!.props.children).toBe('USD');
    const row = part('prefix')!.parent!;
    expect(viewStyle(row).gap).toBe(tokens.affixGap);
    expect(row.children.map((node) => (node as { props: { testID?: string } }).props.testID)).toEqual([`${ID}.prefix`, `${ID}.input`, `${ID}.suffix`]);
    await view.unmount();
    await mount({ prefix: '$', labelHidden: true });
    expect(part('prefix')).not.toBeNull();
  });

  test('TXF-16: heights are minimums per size; the text is padded by padding-inline, an icon by padding-inline-with-icon', async () => {
    for (const size of sizes) {
      const view = await mount({ size });
      expect(viewStyle(container())).toMatchObject({ minHeight: tokens.sizes[size].containerHeight, paddingStart: tokens.sizes[size].containerPaddingInline, paddingEnd: tokens.sizes[size].containerPaddingInline });
      expect(viewStyle(container()).height).toBeUndefined();
      await view.unmount();
    }
    await mount({ leadingIcon: 'search', trailingIcon: 'close' });
    expect(viewStyle(container())).toMatchObject({ paddingStart: medium.containerPaddingInlineWithIcon, paddingEnd: medium.containerPaddingInlineWithIcon, gap: medium.containerGap });
  });

  test('TXF-16: an outlined field rounds four corners by container.shape; a filled one its top corners, and its bottom ones by shape-bottom', async () => {
    const outlined = await mount({ variant: 'outlined' });
    expect(viewStyle(container())).toMatchObject({ borderTopStartRadius: tokens.containerShape, borderTopEndRadius: tokens.containerShape, borderBottomStartRadius: tokens.containerShape, borderBottomEndRadius: tokens.containerShape });
    await outlined.unmount();
    await mount({ variant: 'filled' });
    expect(viewStyle(container())).toMatchObject({ borderTopStartRadius: tokens.containerShape, borderBottomStartRadius: tokens.containerShapeBottom, borderBottomEndRadius: tokens.containerShapeBottom });
    expect(viewStyle(part('active-indicator')!)).toMatchObject({ borderBottomStartRadius: tokens.containerShapeBottom });
  });

  test('TXF-16: corners ease by sys.shape.corner-smoothing (cupertino: continuous); 0 adds nothing', async () => {
    const view = await mount({ variant: 'outlined' });
    expect(viewStyle(container()).borderCurve).toBeUndefined();
    await view.unmount();
    const { cupertino } = jest.requireActual('../../generated/systems/cupertino') as { cupertino: TanreiSystem };
    await mount({ variant: 'filled' }, { theme: 'light', system: cupertino });
    expect(viewStyle(container()).borderCurve).toBe('continuous');
  });

  test('TXF-16: text grows the field — font scaling stays on, nothing sets a height or a line limit, and at a larger font scale the label follows the taller line', async () => {
    Dimensions.set({ window: { ...WINDOW, fontScale: 2 }, screen: { ...WINDOW, fontScale: 2 } });
    try {
      await mount({ variant: 'outlined', supportingText: 'A long help text that wraps' });
      for (const node of [input(), label(), part('supporting-text')!]) expect(node.props.allowFontScaling).toBe(true);
      expect(part('supporting-text')!.props.numberOfLines).toBeUndefined();
      expect(label().props.numberOfLines).toBeUndefined();
      await fireEvent(input(), 'focus');
      expect(textStyle(label()).top).toBe((tokens.outlineWidth - lineOf('labelSmall') * 2) / 2);
    } finally {
      Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
    }
  });
});

describe('multi-line (TXF-17)', () => {
  const line = lineOf('body');

  test('TXF-17: starts at minRows lines and grows to maxRows, then scrolls; maxRows 0 grows without limit', async () => {
    const view = await mount({ multiline: true, minRows: 3, maxRows: 5 });
    expect(input().props.multiline).toBe(true);
    expect(textStyle(input())).toMatchObject({ minHeight: 3 * line, maxHeight: 5 * line, textAlignVertical: 'top' });
    expect(input().props.scrollEnabled).toBeUndefined();
    await view.unmount();
    const unlimited = await mount({ multiline: true });
    expect(textStyle(input()).minHeight).toBe(2 * line);
    expect(textStyle(input()).maxHeight).toBeUndefined();
    await unlimited.unmount();
    // maxRows smaller than minRows: minRows.
    await mount({ multiline: true, minRows: 4, maxRows: 2 });
    expect(textStyle(input())).toMatchObject({ minHeight: 4 * line, maxHeight: 4 * line });
  });

  test('TXF-13: at a larger font scale a filled field\'s resting label stays centred in the grown container', async () => {
    Dimensions.set({ window: { ...WINDOW, fontScale: 2 }, screen: { ...WINDOW, fontScale: 2 } });
    try {
      await mount({ variant: 'filled' });
      const grown = 2 * medium.containerPaddingBlockWithLabel + 2 * (floatedLineOf() + lineOf('body'));
      expect(textStyle(label()).top).toBe((grown - lineOf('label') * 2) / 2);
    } finally {
      Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
    }
  });

  test('TXF-17: the label, icons and affixes align with the first line', async () => {
    await mount({ variant: 'outlined', multiline: true, minRows: 3, leadingIcon: 'notes' });
    expect(viewStyle(container()).alignItems).toBe('flex-start');
    expect(textStyle(label()).top).toBe(medium.containerPaddingBlock + (line - lineOf('label')) / 2);
    expect(viewStyle(part('leading-icon')!.parent!).marginTop).toBe((line - medium.iconSize) / 2);
  });

  test('TXF-17: a filled multi-line field rests its label on the first line (below the floated-label band), not centred in the grown box', async () => {
    await mount({ variant: 'filled', multiline: true, minRows: 3 });
    const firstLine = medium.containerPaddingBlockWithLabel + lineOf('labelSmall');
    expect(textStyle(label()).top).toBe(firstLine + (line - lineOf('label')) / 2);
  });

  test('TXF-19: the counter keeps container.gap of each size from the supporting text', async () => {
    for (const size of sizes) {
      const view = await mount({ size, supportingText: 'Help', counter: true });
      expect(viewStyle(part('supporting-row')!).gap).toBe(tokens.sizes[size].containerGap);
      await view.unmount();
    }
  });

  test('TXF-17: a password stays single-line, and development builds report a multi-line password', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount({ type: 'password', multiline: true });
    expect(input().props.multiline).toBe(false);
    expect(input().props.secureTextEntry).toBe(true);
    expect(warn.mock.calls.filter(([message]) => String(message).includes('multi-line password'))).toHaveLength(1);
  });
});

describe('maxLength and the counter (TXF-18, TXF-19)', () => {
  test('TXF-18: a user edit past maxLength user-perceived characters is refused; a paste is shortened to fit; an emoji or an accented letter counts once', async () => {
    const onChangeText = jest.fn();
    await mount({ maxLength: 5, onChangeText });
    await fireEvent.changeText(input(), 'abcd');
    await fireEvent.changeText(input(), 'abcd👩‍👩‍👧');
    expect(onChangeText).toHaveBeenLastCalledWith('abcd👩‍👩‍👧');
    await fireEvent.changeText(input(), 'abcd👩‍👩‍👧x');
    expect(onChangeText).toHaveBeenCalledTimes(2);
    expect(input().props.value).toBe('abcd👩‍👩‍👧');
    // React Native's own limit counts UTF-16 code units: it is not used.
    expect(input().props.maxLength).toBeUndefined();
  });

  test('TXF-18: a paste is shortened to fit; a value the product sets is never shortened', async () => {
    const onChangeText = jest.fn();
    const view = await mount({ maxLength: 4, onChangeText });
    await fireEvent.changeText(input(), 'ab');
    await fireEvent.changeText(input(), 'abcdefgh');
    expect(onChangeText).toHaveBeenLastCalledWith('abcd');
    await view.unmount();
    await mount({ maxLength: 4, value: 'longer than four' });
    expect(input().props.value).toBe('longer than four');
  });

  test('TXF-18: grapheme clusters — ZWJ families, flags, skin tones, combining accents, keycaps — with Intl.Segmenter and with the fallback Hermes uses', () => {
    const cases: [string, number][] = [
      ['👩‍👩‍👧', 1],
      ['🇯🇵🇫🇷', 2],
      ['👍🏽', 1],
      ['é', 1],
      ['1️⃣', 1],
      ['が', 1],
      ['が', 1],
      ['\r\n', 1],
      ['漢字', 2],
      ['abc', 3],
    ];
    for (const [text, count] of cases) expect(graphemeCount(text)).toBe(count);
    const segmenter = (Intl as { Segmenter?: unknown }).Segmenter;
    delete (Intl as { Segmenter?: unknown }).Segmenter;
    resetGraphemeSegmenter();
    try {
      for (const [text, count] of cases) expect([text, graphemeCount(text)]).toEqual([text, count]);
      expect(graphemes('a👩‍👩‍👧b')).toEqual(['a', '👩‍👩‍👧', 'b']);
    } finally {
      (Intl as { Segmenter?: unknown }).Segmenter = segmenter;
      resetGraphemeSegmenter();
    }
  });

  test('TXF-18: limitEdit keeps the rest of an edit — a replaced selection — and never refuses an edit that does not lengthen the value', () => {
    expect(limitEdit('abc', 'abcd', 3)).toBe('abc');
    expect(limitEdit('abc', 'aXYZc', 3)).toBe('aXc');
    expect(limitEdit('abcdef', 'abcde', 3)).toBe('abcde');
    expect(limitEdit('ab', 'ab👍🏽', 3)).toBe('ab👍🏽');
    expect(limitEdit('abc', 'abcdef', 0)).toBe('abcdef');
  });

  test('TXF-19: the counter shows the count of user-perceived characters and /maxLength at the end of the supporting row, in the supporting style, without wrapping', async () => {
    await mount({ value: 'Ada 👩‍👩‍👧', maxLength: 40, counter: true, supportingText: 'Shown on your profile' });
    const counter = part('counter')!;
    expect(counter.props.children).toBe('5/40');
    expect(counter.props.numberOfLines).toBe(1);
    expect(textStyle(counter)).toMatchObject({ fontSize: sizeOf('labelSmall'), lineHeight: lineOf('labelSmall'), flexShrink: 0 });
    const row = part('supporting-row')!;
    expect(row.children.map((node) => (node as { props: { testID?: string } }).props.testID)).toEqual([`${ID}.supporting-text`, `${ID}.counter`]);
    // At least comp.text-field.container.gap from the supporting text.
    expect(viewStyle(row)).toMatchObject({ flexDirection: 'row', gap: medium.containerGap, marginTop: tokens.supportingTextGap, paddingStart: medium.containerPaddingInline });
    // The count is part of the description.
    expect(input().props.accessibilityHint).toBe('Shown on your profile, 5/40');
  });

  test('TXF-19: without maxLength the counter shows the count alone; the supporting text starts aligned with the input text', async () => {
    await mount({ value: 'Ada', counter: true, leadingIcon: 'person' });
    expect(part('counter')!.props.children).toBe('3');
    expect(viewStyle(part('supporting-row')!).paddingStart).toBe(medium.containerPaddingInlineWithIcon + medium.iconSize + medium.containerGap);
  });

  test('TXF-19: the count is announced once, politely, as the counter\'s visible text, when typing pauses for one second — never on every keystroke', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockClear();
    await mount({ counter: true, maxLength: 10 });
    await fireEvent.changeText(input(), 'a');
    await wait(400);
    await fireEvent.changeText(input(), 'ab');
    await wait(400);
    expect(announce).not.toHaveBeenCalled();
    await wait(700);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('2/10', { queue: true });
  });
});

describe('types and autofill (TXF-20, TXF-21)', () => {
  test.each([
    { type: 'text' as const, expected: { keyboardType: 'default', inputMode: 'text' } },
    { type: 'email' as const, expected: { keyboardType: 'email-address', inputMode: 'email', autoCapitalize: 'none', autoCorrect: false } },
    { type: 'password' as const, expected: { secureTextEntry: true, autoCorrect: false, autoCapitalize: 'none' } },
    { type: 'number' as const, expected: { keyboardType: 'decimal-pad', inputMode: 'decimal' } },
    { type: 'search' as const, expected: { inputMode: 'search', returnKeyType: 'search', accessibilityRole: 'search' } },
    { type: 'tel' as const, expected: { keyboardType: 'phone-pad', inputMode: 'tel' } },
    { type: 'url' as const, expected: { keyboardType: 'url', inputMode: 'url', autoCapitalize: 'none', autoCorrect: false } },
  ])('TXF-20: $type chooses its keyboard and entry settings', async ({ type, expected }) => {
    await mount({ type });
    expect(input().props).toMatchObject(expected);
  });

  test('TXF-20: the value is a string for every type — number does not parse, round or validate it', async () => {
    const onChangeText = jest.fn();
    await mount({ type: 'number', onChangeText });
    await fireEvent.changeText(input(), '0012.50e');
    expect(onChangeText).toHaveBeenCalledWith('0012.50e');
  });

  test('TXF-21: autoComplete reaches the TextInput as its autofill hint; an autofill floats the label and emits onChangeText', async () => {
    const onChangeText = jest.fn();
    await mount({ autoComplete: 'email', onChangeText });
    expect(input().props.autoComplete).toBe('email');
    expect(textStyle(label()).fontSize).toBe(sizeOf('label'));
    await fireEvent.changeText(input(), 'ada@example.com');
    expect(onChangeText).toHaveBeenCalledWith('ada@example.com');
    expect(textStyle(label()).fontSize).toBe(sizeOf('labelSmall'));
  });

  test('TXF-21: no hint without autoComplete', async () => {
    await mount();
    expect(input().props.autoComplete).toBeUndefined();
  });
});

describe('selection (TXF-6)', () => {
  const selection = () => painted(tokens.selectionColor);

  test('TXF-6: the default system highlights selected text in primary-container, one token for every variant and state', () => {
    expect(tokens.selectionColor).toEqual({ kind: 'role', role: 'primaryContainer' });
  });

  test.each(variants)('TXF-6: on Android the highlight of a %s field is comp.text-field.selection.color in every state and look; the caret and its handles keep the caret color', async (variant) => {
    const os = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    try {
      for (const look of LOOKS) {
        const view = await mount({ variant, error: look === 'error', value: 'ada' });
        for (const state of ['enabled', 'hovered', 'focused'] as const) {
          await enter(state);
          const caret = painted(paintsOf(tokens.variants[variant][state === 'enabled' ? 'enabled' : state], look).caret);
          expect(input().props).toMatchObject({ selectionColor: selection(), cursorColor: caret, selectionHandleColor: caret });
        }
        await view.unmount();
      }
      await mount({ variant, disabled: true, value: 'ada' });
      expect(input().props.selectionColor).toBe(selection());
    } finally {
      os.restore();
    }
  });

  test('TXF-6: iOS has one tint for the caret and the highlight — it stays the caret color, so the caret stays visible', async () => {
    expect(ReactNative.Platform.OS).toBe('ios');
    await mount({ error: true, value: 'ada@' });
    const caret = painted(tokens.variants.outlined.enabled.errorCaretColor);
    expect(input().props).toMatchObject({ selectionColor: caret, cursorColor: caret });
    expect(input().props.selectionHandleColor).toBeUndefined();
  });

  test('TXF-6: a selection color re-valued by a layer reaches the highlight', async () => {
    const os = jest.replaceProperty(ReactNative.Platform, 'OS', 'android');
    try {
      await mount({}, { theme: 'dark', system: withField({ selectionColor: literal(1, 2, 3) }) });
      expect(input().props.selectionColor).toBe('rgb(1, 2, 3)');
    } finally {
      os.restore();
    }
  });
});

describe('icons (TXF-22)', () => {
  test.each(sizes)('TXF-22: %s draws a glyph slot at its icon size in the unselected glyph style, colored by its part, container.gap from the text', async (size) => {
    const iconSize = tokens.sizes[size].iconSize;
    await mount({ size, leadingIcon: 'search', trailingIcon: 'close' });
    for (const name of ['leading-icon', 'trailing-icon']) {
      expect(viewStyle(part(name)!)).toMatchObject({ width: iconSize, height: iconSize });
      expect(textStyle(part(`${name}.glyph`)!)).toMatchObject({ fontSize: iconSize, fontFamily: tanrei.icon.family.unselected.families[0] });
      expect(part(`${name}.glyph`)!.props.allowFontScaling).toBe(false);
    }
    expect(textStyle(part('leading-icon.glyph')!).color).toBe(painted(tokens.variants.outlined.enabled.leadingIconColor));
    expect(viewStyle(container()).gap).toBe(tokens.sizes[size].containerGap);
  });

  test('TXF-22: a glyph icon is decorative; a function icon receives the color, the size and the glyph', async () => {
    const icon = jest.fn((props: TextFieldIconProps) => <View testID="svg" style={{ width: props.size, backgroundColor: props.color }} />);
    await mount({ leadingIcon: icon, trailingIcon: 'close' });
    expect(icon).toHaveBeenCalledWith(expect.objectContaining({ color: painted(tokens.variants.outlined.enabled.leadingIconColor), size: medium.iconSize, glyph: expect.objectContaining({ family: tanrei.icon.family.unselected.families[0] }) }));
    expect(part('trailing-icon')!.props).toMatchObject({ accessible: false, importantForAccessibility: 'no-hide-descendants' });
  });

  test('TXF-22: a product\'s IconButton in the trailing slot keeps its own tokens and semantics and is its own focus stop after the input', async () => {
    const onPress = jest.fn();
    await mount({
      trailingIcon: (
        <IconButton testID="clear" accessibilityLabel="Clear" onPress={onPress}>
          close
        </IconButton>
      ),
    });
    const button = screen.getByRole('button', { name: 'Clear' });
    expect(button.props.focusable).toBe(true);
    const order = (id: string) => JSON.stringify(screen.toJSON()).indexOf(`"testID":"${id}"`);
    expect(order('clear')).toBeGreaterThan(order(`${ID}.input`));
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('TXF-22: the field builds in no clear or reveal action', async () => {
    await mount({ type: 'password', value: 'correct horse' });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(input().props.clearButtonMode).toBeUndefined();
  });
});

describe('accessibility (TXF-23)', () => {
  const development = (enabled: boolean) => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = enabled;
  };
  afterEach(() => development(true));

  test('TXF-23: the label is the input\'s accessible name, drawn or hidden; the placeholder never is; the drawn label is hidden from assistive technology', async () => {
    const view = await mount({ placeholder: 'name@example.com' });
    expect(screen.getByLabelText(LABEL)).toBe(input());
    expect(label().props).toMatchObject({ accessible: false, importantForAccessibility: 'no-hide-descendants' });
    await view.unmount();
    await mount({ labelHidden: true, placeholder: 'name@example.com' });
    expect(input().props.accessibilityLabel).toBe(LABEL);
    expect(screen.queryByLabelText('name@example.com')).toBeNull();
  });

  test('TXF-23: without a label the field still renders, and development builds report it; a release build says nothing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ label: '' });
    expect(input()).toBeTruthy();
    expect(warn.mock.calls.filter(([message]) => String(message).includes('a TextField (testID "field") has no label'))).toHaveLength(1);
    await view.unmount();
    warn.mockClear();
    development(false);
    await mount({ label: '' });
    expect(warn).not.toHaveBeenCalled();
  });

  test('TXF-23: required draws no mark of its own', async () => {
    const plain = await mount({});
    const expected = JSON.stringify(plain.toJSON());
    await plain.unmount();
    await mount({ required: true });
    expect(JSON.stringify(screen.toJSON())).toBe(expected);
  });

  test('the supporting row is the description (accessibilityHint), not a second reading: it is hidden from assistive technology', async () => {
    await mount({ supportingText: 'Help', counter: true });
    expect(part('supporting-row')!.props).toMatchObject({ accessible: false, importantForAccessibility: 'no-hide-descendants' });
    expect(input().props.accessibilityHint).toBe('Help, 0');
  });

  test('forwards its ref to the TextInput and passes TextInput props and layout style through', async () => {
    const ref = createRef<TextFieldRef>();
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await mount({ ref, onFocus, onBlur, autoFocus: true, returnKeyLabel: 'Go', style: { marginTop: 4 } });
    expect(ref.current).not.toBeNull();
    expect(input().props).toMatchObject({ autoFocus: true, returnKeyLabel: 'Go' });
    await fireEvent(input(), 'focus');
    await fireEvent(input(), 'blur');
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(viewStyle(host()).marginTop).toBe(4);
  });
});

describe('direction (TXF-24)', () => {
  test('TXF-24: the layout is logical — paddings, the label and the supporting row by start and end, the rows mirrored by React Native', async () => {
    await mount({ leadingIcon: 'search', prefix: '$', value: '1', supportingText: 'Help', counter: true });
    const box = viewStyle(container());
    for (const key of ['paddingLeft', 'paddingRight', 'paddingHorizontal'] as const) expect(box[key]).toBeUndefined();
    expect(box.flexDirection).toBe('row');
    const text = textStyle(label());
    expect(text.left).toBeUndefined();
    expect(text.right).toBeUndefined();
    expect(text.start).toBeDefined();
    expect(viewStyle(part('supporting-row')!).paddingStart).toBeDefined();
  });

  test.each(['email', 'url', 'tel', 'number', 'password'] as const)('TXF-24: a %s value is laid out left to right, aligned to the field\'s start (the right edge in right-to-left)', async (type) => {
    const rtl = jest.replaceProperty(ReactNative.I18nManager, 'isRTL', true);
    try {
      const view = await mount({ type });
      expect(textStyle(input())).toMatchObject({ writingDirection: 'ltr', textAlign: 'right' });
      await view.unmount();
    } finally {
      rtl.restore();
    }
    await mount({ type });
    expect(textStyle(input())).toMatchObject({ writingDirection: 'ltr', textAlign: 'left' });
  });

  test.each(['text', 'search'] as const)('TXF-24: a %s value follows its own direction', async (type) => {
    await mount({ type });
    expect(textStyle(input()).writingDirection).toBeUndefined();
    expect(textStyle(input()).textAlign).toBeUndefined();
  });
});

describe('token binding', () => {
  const schemes = [
    { provider: { theme: 'light' }, scheme: 'light' },
    { provider: { theme: 'dark' }, scheme: 'dark' },
    { provider: { theme: 'light', contrast: 'medium' }, scheme: 'lightMedium' },
    { provider: { theme: 'dark', contrast: 'high' }, scheme: 'darkHigh' },
  ] as const;

  describe.each(schemes)('$scheme', ({ provider, scheme }) => {
    test.each(variants)('%s resolves every part of both looks from its paints in this scheme', async (variant) => {
      for (const look of LOOKS) {
        const view = await mount({ variant, error: look === 'error', ...FULL }, provider);
        expectDrawnFrom(variant, 'enabled', look, tokens, scheme);
        await enter('focused');
        expectDrawnFrom(variant, 'focused', look, tokens, scheme);
        await view.unmount();
      }
    });
  });

  test('the default geometry: 36 / 40 minimum heights, padding 12 / 16, body / body-large input, label → label-small', () => {
    expect(sizes.map((size) => tokens.sizes[size].containerHeight)).toEqual([36, 40]);
    expect(sizes.map((size) => tokens.sizes[size].containerHeight)).toEqual(['medium', 'large'].map((size) => tanrei.components.button.sizes[size as 'medium'].containerHeight));
    expect(tokens.sizes.large.inputTypescale).toBe('bodyLarge');
    expect(medium.labelTypescale).toBe('label');
    expect(medium.labelFloatedTypescale).toBe('labelSmall');
  });

  test('the input is drawn in the size\'s input typescale', async () => {
    await mount({ size: 'large', value: 'x' });
    expect(textStyle(input())).toMatchObject({ fontSize: sizeOf('bodyLarge'), lineHeight: lineOf('bodyLarge') });
  });
});

describe('the system drives rendering', () => {
  test('a size re-valued by a layer reaches the height, the paddings, the gap and the icons', async () => {
    const system = withField({ sizes: { ...tokens.sizes, medium: { ...medium, containerHeight: 52, containerPaddingInline: 20, containerGap: 10, iconSize: 28 } } });
    await mount({ trailingIcon: 'close' }, { theme: 'light', system });
    expect(viewStyle(container())).toMatchObject({ minHeight: 52, paddingStart: 20, gap: 10 });
    expect(viewStyle(part('trailing-icon')!)).toMatchObject({ width: 28, height: 28 });
  });

  test('widths, the notch padding and the supporting gap re-valued by a layer are drawn', async () => {
    const system = withField({ focusedOutlineWidth: 3, outlineNotchPadding: 6, supportingTextGap: 9 });
    await mount({ supportingText: 'Help' }, { theme: 'light', system });
    await enter('focused');
    expect(outlineStroke()!.width).toBe(3);
    expect(viewStyle(part('outline.gap')!)).toMatchObject({ paddingStart: 6, paddingEnd: 6 });
    expect(viewStyle(part('supporting-row')!).marginTop).toBe(9);
  });

  test('a variant is drawn by its paints, never by its name: an outlined variant whose border a layer removes has no gap and a filled geometry', async () => {
    const system = withVariant('outlined', {
      enabled: { outlineColor: { kind: 'none' }, activeIndicatorColor: { kind: 'role', role: 'outline' } },
      focused: { outlineColor: { kind: 'none' } },
    });
    await mount({ variant: 'outlined' }, { theme: 'light', system });
    expect(part('outline')).toBeNull();
    expect(part('active-indicator')).not.toBeNull();
    expect(viewStyle(container()).minHeight).toBe(2 * medium.containerPaddingBlockWithLabel + lineOf('labelSmall') + lineOf('body'));
  });
});

describe('fixtures', () => {
  beforeEach(() => {
    // `outlined-label-hidden` names nothing it does not draw; no fixture reports.
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  describeFixtureBaselines(textFieldSubject);

  test('every fixture has a label, and the icon fixture\'s content names its slots', () => {
    for (const fixture of spec.fixtures) expect(fixture.props.label).toBeTruthy();
    const icons = spec.fixtures.find((fixture) => fixture.id === 'outlined-icons')!;
    expect(iconSlots(icons.content)).toEqual({ leadingIcon: 'search', trailingIcon: 'close' });
  });

  test('a text-only child is not a thing the field draws (the fixtures\' content only names icons)', async () => {
    await mount({ leadingIcon: <Text>★</Text> });
    expect(screen.getByText('★')).toBeTruthy();
  });
});
