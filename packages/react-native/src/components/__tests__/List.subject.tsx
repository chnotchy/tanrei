// List as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// <List>. A fixture's items arrive under their React Native names (`platforms.react-native.items.list-item`), so the
// spec's `interactive: true` arrives as `onPress: true` and becomes a handler that does nothing. LST-16's `verify`: the
// list is 360 wide; an avatar holds the first letter of the item's headline, an image is left empty.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { List, type ListItem, type ListProps } from '../List';

type FixtureItem = Omit<ListItem, 'onPress'> & { kind?: string; onPress?: ListItem['onPress'] | boolean };
type SubjectProps = Omit<ListProps, 'items' | 'selectionMode'> & { items?: FixtureItem[]; selectionMode?: string; value?: string | null; values?: string[] };

const noop = () => undefined;

/** A fixture item as a `ListItem`: its `kind` dropped, `onPress: true` a handler, an avatar's monogram from the headline. */
export function listItemOf({ kind: _kind, onPress, ...item }: FixtureItem): ListItem {
  return {
    ...item,
    onPress: typeof onPress === 'boolean' ? (onPress ? noop : undefined) : onPress,
    ...(item.leadingMedia === 'avatar' && item.leading === undefined ? { leading: item.headline.slice(0, 1) } : null),
  };
}

export const listSubject = defineSubject<SubjectProps>({
  component: 'List',
  spec: 'list',
  tokens: 'list',
  render: ({ items = [], ...props }) => (
    <View style={{ width: 360 }}>
      <List {...(props as ListProps)} items={items.map(listItemOf)} />
    </View>
  ),
  // The conditions are a token axis no prop names: the list's value or values pick one per option.
  axes: {},
});
