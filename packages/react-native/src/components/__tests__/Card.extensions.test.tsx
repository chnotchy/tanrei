// A design system that EXTENDS the Card's variant axis, end to end on React Native. The `acme` fixture layer
// (packages/tokens-build/test/fixtures/acme.system.json) does not extend the Card, so the product system here is built
// in memory the way a generated one is shaped: the core holders plus one added variant — an "inverse" card, the kind
// of value a layer adds in one line. `describeAxisExtensions` then
// proves that the added value renders from its own tokens without a report, and falls back to `outlined` under the
// default system.
import { render, screen } from '@testing-library/react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiCardVariantStateTokens, TanreiCardVariantTokens, TanreiCardVariants, TanreiPaint, TanreiSystem } from '../../generated/vocabulary';
import { INTERACTION_STATES } from '../../primitives/interaction';
import { describeAxisExtensions, settleMotion, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { evaluatePaint, formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { Card, type CardVariant } from '../Card';
import { acme } from './__fixtures__/acme';
import { cardSubject } from './Card.subject';

const core = tanrei.components.card;
const inversePaints = (tokens: TanreiCardVariantStateTokens): TanreiCardVariantStateTokens => ({
  ...tokens,
  containerColor: { kind: 'role', role: 'inverseSurface' },
  contentColor: { kind: 'role', role: 'inverseOnSurface' },
  stateLayerColor: { kind: 'role', role: 'inverseOnSurface' },
});
const inverse = Object.fromEntries(INTERACTION_STATES.map((state) => [state, inversePaints(core.variants.filled[state])])) as unknown as TanreiCardVariantTokens;

/** What a product's generated system looks like when its layer adds `inverse` to the Card's variant axis. */
const product: TanreiSystem = {
  ...withComponent(tanrei, 'card', { variants: { ...core.variants, inverse } as TanreiCardVariants }),
  id: 'product',
};

const painted = (paint: TanreiPaint) => formatColor(evaluatePaint(paint, product.colors.light));

settleMotion();

describe('a product system that adds a Card variant', () => {
  describeAxisExtensions(cardSubject, product);

  test('CRD-7: the added value is drawn from its own tokens — container and the content color it hands down', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await render(
      <TanreiProvider theme="light" system={product}>
        <Card testID="x" variant={'inverse' as CardVariant}>
          Storage almost full
        </Card>
      </TanreiProvider>,
    );
    expect(viewStyle(screen.getByTestId('x')).backgroundColor).toBe(painted({ kind: 'role', role: 'inverseSurface' }));
    expect(textStyle(screen.getByTestId('x.text')).color).toBe(painted({ kind: 'role', role: 'inverseOnSurface' }));
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('the acme fixture system', () => {
  test('extends no Card axis: when it does, run describeAxisExtensions(cardSubject, acme) here', () => {
    expect(Object.keys(acme.components.card.variants)).toEqual(Object.keys(core.variants));
  });
});
