// ButtonGroup as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes
// a <ButtonGroup>. A fixture's items are Buttons and IconButtons (item kinds whose component is button or icon-button)
// under their React Native names, the content being a Button's label or an IconButton's glyph. BGR-1's
// verify: the group at its natural width, start-aligned in a 400-wide stage.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { Button, type ButtonProps } from '../Button';
import { ButtonGroup, type ButtonGroupProps } from '../ButtonGroup';
import { IconButton, type IconButtonProps } from '../IconButton';

type FixtureItem = { kind: string; children?: string } & Record<string, unknown>;
type SubjectProps = Omit<ButtonGroupProps, 'variant' | 'children'> & { variant?: string; items?: FixtureItem[] };

/** A fixture item as the element the group holds. */
export function itemElement({ kind, children, ...props }: FixtureItem, index: number) {
  return kind === 'icon-button' ? (
    <IconButton key={index} {...(props as IconButtonProps)}>
      {children}
    </IconButton>
  ) : (
    <Button key={index} {...(props as ButtonProps)}>
      {children}
    </Button>
  );
}

export const buttonGroupSubject = defineSubject<SubjectProps>({
  component: 'ButtonGroup',
  spec: 'button-group',
  tokens: 'buttonGroup',
  render: ({ items = [], ...props }) => (
    <View style={{ width: 400, alignItems: 'flex-start' }}>
      <ButtonGroup {...(props as ButtonGroupProps)}>{items.map(itemElement)}</ButtonGroup>
    </View>
  ),
  axes: {},
});
