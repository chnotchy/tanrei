// A design system that EXTENDS the TextField's axes, end to end on React Native. The `acme` fixture layer
// does not extend the TextField, so the product system here is built in memory the way a generated one is shaped: the
// core holders plus the `small` size the spec leaves to a layer (32, for editing in a table cell) and one added
// variant. `describeAxisExtensions` proves each added value renders from its own tokens without a report, and falls
// back to the spec default under the default system.
import { render, screen } from '@testing-library/react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiTextFieldSizes, TanreiTextFieldVariantStateTokens, TanreiTextFieldVariantTokens, TanreiTextFieldVariants, TanreiSystem } from '../../generated/vocabulary';
import { describeAxisExtensions, settleMotion, viewStyle, withComponent } from '../../testing/harness';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { TextField, type TextFieldSize, type TextFieldVariant } from '../TextField';
import { acme } from './__fixtures__/acme';
import { textFieldSubject } from './TextField.subject';

const core = tanrei.components.textField;
const tinted = (tokens: TanreiTextFieldVariantStateTokens): TanreiTextFieldVariantStateTokens => ({ ...tokens, containerColor: { kind: 'role', role: 'primaryContainer' }, errorContainerColor: { kind: 'role', role: 'primaryContainer' } });
const tonal = Object.fromEntries((['enabled', 'hovered', 'focused', 'disabled'] as const).map((state) => [state, tinted(core.variants.filled[state])])) as unknown as TanreiTextFieldVariantTokens;

/** What a product's generated system looks like when its layer adds `small` and `tonal` to the TextField's axes. */
const product: TanreiSystem = {
  ...withComponent(tanrei, 'textField', {
    sizes: { ...core.sizes, small: { ...core.sizes.medium, containerHeight: 32, containerPaddingInline: 8, containerPaddingBlock: 4, labelTypescale: 'labelSmall', inputTypescale: 'bodySmall', iconSize: 16 } } as TanreiTextFieldSizes,
    variants: { ...core.variants, tonal } as TanreiTextFieldVariants,
  }),
  id: 'product',
};

settleMotion();

describe('a product system that adds a TextField size and variant', () => {
  describeAxisExtensions(textFieldSubject, product);

  test('TXF-9: the added values are drawn from their own tokens — the height, the padding, the fill', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await render(
      <TanreiProvider theme="light" system={product}>
        <TextField testID="x" label="Cell" size={'small' as TextFieldSize} variant={'tonal' as TextFieldVariant} labelHidden />
      </TanreiProvider>,
    );
    expect(viewStyle(screen.getByTestId('x.container'))).toMatchObject({ minHeight: 32, paddingStart: 8, backgroundColor: formatColor(evaluatePaint({ kind: 'role', role: 'primaryContainer' }, product.colors.light)) });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('the acme fixture system', () => {
  test('extends no TextField axis: when it does, run describeAxisExtensions(textFieldSubject, acme) here', () => {
    expect(Object.keys(acme.components.textField.sizes)).toEqual(Object.keys(core.sizes));
    expect(Object.keys(acme.components.textField.variants)).toEqual(Object.keys(core.variants));
  });
});
