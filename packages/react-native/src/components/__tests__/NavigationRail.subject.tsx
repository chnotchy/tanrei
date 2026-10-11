// NavigationRail as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes
// a <NavigationRail>. A fixture's items arrive under their React Native names: `header-button` items are
// `IconButton`s (label → `accessibilityLabel`, the glyph as content) placed in `header`; destinations nest their badge as
// the bar's subject does. The rail stands in a 640-high parent.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { IconButton } from '../IconButton';
import { NavigationRail, type NavigationRailProps } from '../NavigationRail';
import { destinationOf, type FixtureDestination } from './NavigationBar.subject';

type FixtureItem = FixtureDestination & { accessibilityLabel?: string; children?: string };
type SubjectProps = Omit<NavigationRailProps, 'destinations' | 'labelVisibility'> & { items?: FixtureItem[]; labelVisibility?: string };

export const navigationRailSubject = defineSubject<SubjectProps>({
  component: 'NavigationRail',
  spec: 'navigation-rail',
  tokens: 'navigationRail',
  render: ({ items = [], ...props }) => {
    const buttons = items
      .filter((item) => item.kind === 'header-button')
      .map((item, index) => (
        <IconButton key={index} accessibilityLabel={item.accessibilityLabel} testID={`header-button.${index}`}>
          {item.children}
        </IconButton>
      ));
    return (
      <View style={{ height: 640, flexDirection: 'row' }}>
        <NavigationRail {...(props as NavigationRailProps)} header={buttons.length > 0 ? <>{buttons}</> : undefined} destinations={items.filter((item) => item.kind === 'destination').map(destinationOf)} />
      </View>
    );
  },
  axes: {},
});
