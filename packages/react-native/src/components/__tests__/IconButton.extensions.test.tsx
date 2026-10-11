// A design system that EXTENDS the IconButton's axes, end to end on React Native. The `acme` fixture layer
// (packages/tokens-build/test/fixtures/acme.system.json) extends Button's axes but not yet IconButton's, so the
// product system here is built in memory the way a generated one is shaped: the core holders plus one added size and
// one added variant. The harness's `describeAxisExtensions` then proves that each added value renders from its own
// tokens without a report, and falls back to the spec default under the default system.
import { render, screen } from '@testing-library/react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiIconButtonSizes, TanreiIconButtonVariantStateTokens, TanreiIconButtonVariantTokens, TanreiIconButtonVariants, TanreiPaint, TanreiSystem } from '../../generated/vocabulary';
import { INTERACTION_STATES } from '../../primitives/interaction';
import { describeAxisExtensions, settleMotion, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { IconButton, type IconButtonSize, type IconButtonVariant } from '../IconButton';
import { acme } from './__fixtures__/acme';
import { iconButtonSubject } from './IconButton.subject';

const core = tanrei.components.iconButton;
const errorPaints = (tokens: TanreiIconButtonVariantStateTokens): TanreiIconButtonVariantStateTokens => ({
  ...tokens,
  containerColor: { kind: 'role', role: 'error' },
  iconColor: { kind: 'role', role: 'onError' },
  unselectedContainerColor: { kind: 'role', role: 'errorContainer' },
  unselectedIconColor: { kind: 'role', role: 'onErrorContainer' },
  selectedContainerColor: { kind: 'role', role: 'error' },
  selectedIconColor: { kind: 'role', role: 'onError' },
});
const danger = Object.fromEntries(INTERACTION_STATES.map((state) => [state, errorPaints(core.variants.filled[state])])) as unknown as TanreiIconButtonVariantTokens;

/** What a product's generated system looks like when its layer adds `xlarge` and `danger` to the IconButton's axes. */
const product: TanreiSystem = {
  ...withComponent(tanrei, 'iconButton', {
    sizes: { ...core.sizes, xlarge: { containerSize: 56, iconSize: 32, outlineWidth: 2 } } as TanreiIconButtonSizes,
    variants: { ...core.variants, danger } as TanreiIconButtonVariants,
  }),
  id: 'product',
};

const painted = (paint: TanreiPaint) => formatColor(evaluatePaint(paint, product.colors.light));

settleMotion();

describe('a product system that adds an IconButton size and variant', () => {
  describeAxisExtensions(iconButtonSubject, product);

  test('ICB-7: the added values are drawn from their own tokens — the square, the icon, the toggle looks', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await render(
      <TanreiProvider theme="light" system={product}>
        <IconButton testID="x" accessibilityLabel="Delete" size={'xlarge' as IconButtonSize} variant={'danger' as IconButtonVariant} toggle selected={false}>
          delete
        </IconButton>
      </TanreiProvider>,
    );
    expect(viewStyle(screen.getByTestId('x'))).toMatchObject({ width: 56, height: 56, backgroundColor: painted({ kind: 'role', role: 'errorContainer' }) });
    expect(textStyle(screen.getByTestId('x.glyph', { includeHiddenElements: true }))).toMatchObject({ fontSize: 32, color: painted({ kind: 'role', role: 'onErrorContainer' }) });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('the acme fixture system', () => {
  test('extends no IconButton axis yet: when it does, run describeAxisExtensions(iconButtonSubject, acme) here', () => {
    expect(Object.keys(acme.components.iconButton.sizes)).toEqual(Object.keys(core.sizes));
    expect(Object.keys(acme.components.iconButton.variants)).toEqual(Object.keys(core.variants));
  });
});
