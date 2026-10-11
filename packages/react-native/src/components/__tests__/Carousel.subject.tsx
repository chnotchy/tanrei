// Carousel as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// carousel. The spec's stage: 400 × 200 on a `surface` page, the carousel filling it (W = 368), at its start. A fixture's
// items are `CarouselItem`s; an item's content is a glyph name, which the harness draws centred in the
// content box at sys.icon.large through the icon helper — the family and fill of an unselected icon — in the item's
// content color (`useContentColor()`), on the item's container color (the item kind's slot note).
import { Text, View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { useContentColor } from '../../theme/contentColor';
import { iconGlyphStyle } from '../../theme/icon';
import { useTanrei } from '../../theme/TanreiProvider';
import { Carousel, CarouselItem, type CarouselProps } from '../Carousel';
import { SheetStage } from './BottomSheet.subject';

type FixtureItem = { kind?: string; label?: string; children?: string };
type SubjectProps = Omit<CarouselProps, 'layout' | 'children'> & { layout?: string; items?: FixtureItem[] };

/** A fixture item's content: its glyph, centred in the content box, in the item's content color. */
export function FixtureGlyph({ name }: { name: string }) {
  const theme = useTanrei();
  const color = useContentColor();
  const size = theme.system.measure.icon.large;
  const glyph = iconGlyphStyle(theme.system.icon, size, { selected: false, resolveFont: theme.resolveIconFont });
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[glyph.style, { color }]} allowFontScaling={false}>
        {name}
      </Text>
    </View>
  );
}

export const carouselSubject = defineSubject<SubjectProps>({
  component: 'Carousel',
  spec: 'carousel',
  tokens: 'carousel',
  render: ({ items = [], layout, ...props }) => (
    <SheetStage width={400} height={200}>
      <Carousel {...props} layout={layout as CarouselProps['layout']}>
        {items.map(({ kind: _kind, label, children }, index) => (
          <CarouselItem key={index} label={label}>
            <FixtureGlyph name={children ?? ''} />
          </CarouselItem>
        ))}
      </Carousel>
    </SheetStage>
  ),
  axes: {},
});
