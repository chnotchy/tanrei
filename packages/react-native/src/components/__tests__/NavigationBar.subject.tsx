// NavigationBar as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes
// a <NavigationBar>. A fixture's items arrive under their React Native names
// (`platforms.react-native.items.destination`): `badge` stays the flag, `badgeCount` arrives as `count` and `badgeLabel`
// keeps its spec name (its React Native name, the badge's `label`, is the destination's label's too). The subject nests
// them as `badge: { count, label }`. The bar spans a 360-wide parent (a phone's width).
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { NavigationBar, type NavigationBarDestination, type NavigationBarProps } from '../NavigationBar';

/** A fixture item as the harness hands it over. */
export interface FixtureDestination {
  kind?: string;
  value: string;
  label: string;
  icon: string;
  disabled?: boolean;
  badge?: boolean;
  count?: number | null;
  badgeLabel?: string;
}
type SubjectProps = Omit<NavigationBarProps, 'destinations' | 'labelVisibility'> & { items?: FixtureDestination[]; labelVisibility?: string };

/** A fixture item as a destination: the badge's count and label nested under `badge` while `badge` is true. */
export const destinationOf = ({ kind: _kind, badge, count, badgeLabel, ...destination }: FixtureDestination): NavigationBarDestination => ({
  ...destination,
  ...(badge ? { badge: { count: count ?? null, label: badgeLabel ?? '' } } : null),
});

export const navigationBarSubject = defineSubject<SubjectProps>({
  component: 'NavigationBar',
  spec: 'navigation-bar',
  tokens: 'navigationBar',
  render: ({ items = [], ...props }) => (
    <View style={{ width: 360 }}>
      <NavigationBar {...(props as NavigationBarProps)} destinations={items.map(destinationOf)} />
    </View>
  ),
  axes: {},
});
