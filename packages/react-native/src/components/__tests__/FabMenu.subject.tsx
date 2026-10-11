// FabMenu as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// <FabMenu>. FBM-13's verify: the toggle at the inline-end bottom corner of a 320 × 320 stage, 16 from both edges; an
// open fixture draws its items in place above the toggle (`inline`), settled, with their elevation.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { FabMenu, type FabMenuItem, type FabMenuProps } from '../FabMenu';

type FixtureItem = FabMenuItem & { kind?: string };
type SubjectProps = Omit<FabMenuProps, 'items' | 'variant' | 'size'> & { items?: FixtureItem[]; variant?: string; size?: string };

/** A fixture item as a `FabMenuItem`: its `kind` dropped. */
export const fabMenuItemOf = ({ kind: _kind, ...item }: FixtureItem): FabMenuItem => item;

export const fabMenuSubject = defineSubject<SubjectProps>({
  component: 'FabMenu',
  spec: 'fab-menu',
  tokens: 'fabMenu',
  render: ({ items = [], ...props }) => (
    <View style={{ width: 320, height: 320 }}>
      <View style={{ position: 'absolute', bottom: 16, end: 16 }}>
        <FabMenu {...(props as FabMenuProps)} items={items.map(fabMenuItemOf)} inline />
      </View>
    </View>
  ),
  axes: { variant: 'variants', size: 'sizes' },
});
