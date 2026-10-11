// Menu as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// <Menu>. A fixture's items arrive under their React Native names with their `kind` (`platforms.react-native.items`),
// which is exactly a `MenuEntry`; a group holds its own. MNU-19's `verify`: the open menu is drawn in place — the
// test-only `inline` presentation, at its natural size, with its elevation, without an anchor, placement or motion.
import { defineSubject } from '../../testing/harness';
import { Menu, type MenuEntry, type MenuProps } from '../Menu';

type SubjectProps = Omit<MenuProps, 'items' | 'placement'> & { items?: MenuEntry[]; placement?: string };

export const menuSubject = defineSubject<SubjectProps>({
  component: 'Menu',
  spec: 'menu',
  tokens: 'menu',
  render: ({ items = [], ...props }) => <Menu {...(props as MenuProps)} items={items} inline />,
  // The conditions are a token axis no prop names: an item's kind and props pick one.
  axes: {},
});
