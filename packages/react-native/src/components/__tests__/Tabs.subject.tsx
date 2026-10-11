// Tabs as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// <Tabs>. A fixture's items arrive under their React Native names (`platforms.react-native.items.tab`) with their
// `kind`, which a `Tab` drops. TAB-14's `verify`: one row of tabs 360 wide and no panel.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { Tabs, type Tab, type TabsProps } from '../Tabs';

type FixtureTab = Tab & { kind?: string };
type SubjectProps = Omit<TabsProps, 'items' | 'variant'> & { items?: FixtureTab[]; variant?: string };

/** A fixture item as a `Tab`: its `kind` dropped. */
export const tabOf = ({ kind: _kind, ...tab }: FixtureTab): Tab => tab;

export const tabsSubject = defineSubject<SubjectProps>({
  component: 'Tabs',
  spec: 'tabs',
  tokens: 'tabs',
  render: ({ items = [], ...props }) => (
    <View style={{ width: 360 }}>
      <Tabs {...(props as TabsProps)} items={items.map(tabOf)} />
    </View>
  ),
  axes: { variant: 'variants' },
});
