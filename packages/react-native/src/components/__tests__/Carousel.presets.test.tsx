// The shipped presets drive the same Carousel with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions, Text, View } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { Carousel, CarouselItem } from '../Carousel';
import { carouselSubject } from './Carousel.subject';

const ID = 'crl';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const part = (name: string) => screen.getByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const mount = (system: TanreiSystem) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <View style={{ width: 400, height: 200 }}>
        <Carousel testID={ID} accessibilityLabel="Walks near you">
          {['Coast path', 'Old forest', 'Lake shore', 'City park'].map((label) => (
            <CarouselItem key={label} label={label}>
              <Text>{label}</Text>
            </CarouselItem>
          ))}
        </Carousel>
      </View>
    </TanreiProvider>,
  );

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  Dimensions.set({ window: { ...WINDOW, width: 400, height: 800, fontScale: 1 }, screen: { ...WINDOW, width: 400, height: 800, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
settleMotion();

describe('every shipped system values the Carousel vocabulary', () => {
  describeSharedVocabulary(carouselSubject);
});

describe('m3-like drives the Carousel', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.carousel;

  test('corner.extra-large items; the gap, the 40–56 small item, the padding as the default; the container kept on surface-container-highest', async () => {
    expect(tokens).toMatchObject({ containerShape: system.shape.extraLarge, layoutGap: 8, containerSmallMinWidth: 40, containerSmallMaxWidth: 56, layoutPaddingInline: 16 });
    await mount(system);
    expect(viewStyle(part('item.0'))).toMatchObject({ borderRadius: system.shape.extraLarge, backgroundColor: role(system, 'surfaceContainerHighest') });
  });

  test('CRL-6: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the Carousel', () => {
  test('it inherits m3-like\'s carousel', () => {
    expect(m3ExpressiveLike.components.carousel).toEqual(m3Like.components.carousel);
  });
});

describe('cupertino drives the Carousel', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.carousel;

  test('nothing pinned: corner.large with the continuous corner, the default geometry; a pressed item dims (no state layer)', async () => {
    expect(tokens.containerShape).toBe(system.shape.large);
    expect(tokens.containerLargeWidth).toBe(tanrei.components.carousel.containerLargeWidth);
    await mount(system);
    expect(viewStyle(part('item.0'))).toMatchObject({ borderRadius: system.shape.large, borderCurve: 'continuous' });
    expect(system.behavior.pressedFeedback).toBe('dim');
    expect(tokens.pressedOpacity).toBeLessThan(1);
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — multi-browse, where a large, a medium and a small item, their
  // corners and their color all show.
  describeFixtureBaselines(carouselSubject, { systems: [m3Like, cupertino], fixtures: ['multi-browse'] });
});
