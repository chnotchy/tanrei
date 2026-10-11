// NavigationDrawer as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture
// becomes a <NavigationDrawer>. A fixture's items arrive under their React Native names with their `kind`
// (dropped here): destinations, and sections, whose `items` array tells them apart. A standard drawer stands in a
// 640-high row; a modal one is drawn in place (`inline`: its scrim over a 480 × 640 view and its panel at the start) —
// a `Modal` is a native window the snapshot does not include.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { NavigationDrawer, type NavigationDrawerItem, type NavigationDrawerProps } from '../NavigationDrawer';

type FixtureItem = { kind?: string; items?: FixtureItem[] } & Record<string, unknown>;
type SubjectProps = Omit<NavigationDrawerProps, 'items' | 'variant'> & { items?: FixtureItem[]; variant?: string };

/** A fixture item as a drawer item: its `kind` dropped, a section's items too. */
export const drawerItemOf = ({ kind: _kind, items, ...item }: FixtureItem): NavigationDrawerItem =>
  (items ? { ...item, items: items.map(drawerItemOf) } : item) as unknown as NavigationDrawerItem;

export const navigationDrawerSubject = defineSubject<SubjectProps>({
  component: 'NavigationDrawer',
  spec: 'navigation-drawer',
  tokens: 'navigationDrawer',
  render: ({ items = [], variant, ...props }) =>
    variant === 'modal' ? (
      <View style={{ width: 480, height: 640 }}>
        <NavigationDrawer {...(props as NavigationDrawerProps)} variant="modal" items={items.map(drawerItemOf)} inline />
      </View>
    ) : (
      <View style={{ height: 640, flexDirection: 'row' }}>
        <NavigationDrawer {...(props as NavigationDrawerProps)} variant={variant as NavigationDrawerProps['variant']} items={items.map(drawerItemOf)} />
      </View>
    ),
  axes: { variant: 'variants' },
});
