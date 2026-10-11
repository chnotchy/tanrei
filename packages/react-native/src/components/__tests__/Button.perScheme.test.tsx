// A component color that differs per scheme, end to end on React Native:
// the fixture layer packages/tokens-build/test/fixtures/tone-per-state.system.json puts NON-MONOTONIC `tone` rules on
// two states of the filled Button (hovered: tone 35 in light, 80 in dark; pressed: 20 / 15 / 10 by contrast in light,
// 90 in dark). `__fixtures__/tone-per-state.ts` is what `buildProductSystem({ layerFile, targets: ['react-native'] })`
// writes for it (scripts/acme-fixture.mjs; stale → this file fails), and the Button is rendered under it in all six
// schemes. Expected colors are read from the generated paints — never written down here.
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TanreiSystem } from '../../generated/vocabulary';
import { SCHEME_SETTINGS, decidedColor, expectFixtureSystemsFresh, schemePaintPaths, settleMotion, viewStyle } from '../../testing/harness';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { Button } from '../Button';
import { tonePerState } from './__fixtures__/tone-per-state';

const system: TanreiSystem = tonePerState;
const filled = system.components.button.variants.filled;
const decided = decidedColor;
const background = () => viewStyle(screen.getByTestId('button')).backgroundColor;

settleMotion();

test('the fixture is what buildProductSystem({ targets: [\'react-native\'] }) writes today — React Native is not a refused target', () => {
  // Throws when a fixture is stale, or when the build is refused for this layer.
  expectFixtureSystemsFresh();
});

test('exactly the two ruled state colors are per-scheme paints, with one paint for each of the system\'s schemes', () => {
  expect(schemePaintPaths(system.components.button)).toEqual(['variants.filled.hovered.containerColor', 'variants.filled.pressed.containerColor']);
  for (const paint of [filled.hovered.containerColor, filled.pressed.containerColor]) {
    if (paint.kind !== 'scheme') throw new Error('not a scheme paint');
    expect(Object.keys(paint.by).sort()).toEqual(Object.keys(system.colors).sort());
  }
});

test('the rule is non-monotonic: the colors follow the theme AND the contrast level, and the two states differ', () => {
  expect(decided(filled.hovered.containerColor, 'light')).not.toBe(decided(filled.hovered.containerColor, 'dark'));
  expect(new Set((['light', 'lightMedium', 'lightHigh'] as const).map((scheme) => decided(filled.pressed.containerColor, scheme))).size).toBe(3);
  expect(decided(filled.hovered.containerColor, 'light')).not.toBe(decided(filled.pressed.containerColor, 'light'));
});

test.each(SCHEME_SETTINGS)('BTN-3 / BTN-6 in $scheme: hovered and pressed are drawn in the color decided for THAT scheme', async ({ scheme, theme, contrast }) => {
  await render(
    <TanreiProvider system={system} theme={theme} contrast={contrast}>
      <Button testID="button">Deploy</Button>
    </TanreiProvider>,
  );
  await fireEvent(screen.getByTestId('button'), 'hoverIn');
  expect(background()).toBe(decided(filled.hovered.containerColor, scheme));
  await fireEvent(screen.getByTestId('button'), 'pressIn');
  expect(background()).toBe(decided(filled.pressed.containerColor, scheme));
  await fireEvent(screen.getByTestId('button'), 'touchEnd');
});
