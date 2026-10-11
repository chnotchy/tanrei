// AppBar as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes an
// <AppBar>. A fixture's items arrive under their React Native names (`platforms.react-native.items`): the
// navigation item and the action items are `IconButton`s (label → `accessibilityLabel`, the glyph as content), placed in
// the `navigation` and `actions` nodes. The bar spans a 360-wide parent (a phone's width).
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { AppBar, type AppBarProps } from '../AppBar';
import { IconButton } from '../IconButton';

interface FixtureItem {
  kind: string;
  accessibilityLabel?: string;
  children?: string;
}
type SubjectProps = Omit<AppBarProps, 'size' | 'titleAlignment'> & { items?: FixtureItem[]; size?: string; titleAlignment?: string };

/** The icon buttons of one item kind, in order: one element, several in a fragment, none as undefined. */
function slot(items: readonly FixtureItem[], kind: string): ReactNode {
  const buttons = items
    .filter((item) => item.kind === kind)
    .map((item, index) => (
      <IconButton key={index} accessibilityLabel={item.accessibilityLabel} testID={`${kind}.${index}`}>
        {item.children}
      </IconButton>
    ));
  if (buttons.length === 0) return undefined;
  return buttons.length === 1 ? buttons[0] : <>{buttons}</>;
}

export const appBarSubject = defineSubject<SubjectProps>({
  component: 'AppBar',
  spec: 'app-bar',
  tokens: 'appBar',
  render: ({ items = [], ...props }) => (
    <View style={{ width: 360 }}>
      <AppBar {...(props as AppBarProps)} navigation={slot(items, 'navigation')} actions={slot(items, 'action')} />
    </View>
  ),
  axes: { size: 'sizes' },
});
