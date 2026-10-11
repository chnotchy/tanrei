// An IconButton color that differs per scheme (paint kind `scheme`). The generated fixture layer
// `tone-per-state` rules only Button's colors, so the
// scheme paints here are put in memory where a generated system would carry them: the filled variant's hovered
// container of a toggle that is on, and its selected icon at rest — one paint per scheme, deliberately non-monotonic.
// The IconButton is rendered in all six schemes; expected colors are read from the paints, never written down twice.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import { SCHEME_SETTINGS, decidedColor, schemePaintPaths, settleMotion, textStyle, viewStyle, withComponent } from '../../testing/harness';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { IconButton } from '../IconButton';

/** One literal per scheme; the channel order is scrambled so no scheme follows from its neighbours. */
const perScheme = (seed: number): TanreiPaint => {
  const by = Object.fromEntries(SCHEME_SETTINGS.map(({ scheme }, i) => [scheme, { kind: 'literal', r: (seed * (i + 3) * 37) % 256, g: (seed + i * 91) % 256, b: (i * 53 + seed * 7) % 256, a: 1 }])) as Record<TanreiScheme, TanreiPaint>;
  return { kind: 'scheme', by };
};

const filled = tanrei.components.iconButton.variants.filled;
const system: TanreiSystem = withComponent(tanrei, 'iconButton', {
  variants: {
    ...tanrei.components.iconButton.variants,
    filled: {
      ...filled,
      enabled: { ...filled.enabled, selectedIconColor: perScheme(11) },
      hovered: { ...filled.hovered, selectedContainerColor: perScheme(29) },
    },
  },
});
const tokens = system.components.iconButton.variants.filled;

settleMotion();

test('exactly the two paints put in are per-scheme paints, with one paint for each of the system\'s schemes', () => {
  expect(schemePaintPaths(system.components.iconButton)).toEqual(['variants.filled.enabled.selectedIconColor', 'variants.filled.hovered.selectedContainerColor']);
  expect(new Set(SCHEME_SETTINGS.map(({ scheme }) => decidedColor(tokens.hovered.selectedContainerColor, scheme))).size).toBe(6);
});

test.each(SCHEME_SETTINGS)('ICB-3 / ICB-12 in $scheme: the selected icon and the hovered selected container are drawn in the color decided for THAT scheme', async ({ scheme, theme, contrast }) => {
  await render(
    <TanreiProvider system={system} theme={theme} contrast={contrast}>
      <IconButton testID="icon-button" accessibilityLabel="Favorite" variant="filled" toggle selected>
        favorite
      </IconButton>
    </TanreiProvider>,
  );
  const glyph = screen.getByTestId('icon-button.glyph', { includeHiddenElements: true });
  expect(textStyle(glyph).color).toBe(decidedColor(tokens.enabled.selectedIconColor, scheme));
  await fireEvent(screen.getByTestId('icon-button'), 'hoverIn');
  expect(viewStyle(screen.getByTestId('icon-button')).backgroundColor).toBe(decidedColor(tokens.hovered.selectedContainerColor, scheme));
});
