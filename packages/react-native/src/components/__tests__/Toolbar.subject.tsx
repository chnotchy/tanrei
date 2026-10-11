// Toolbar as the test harness sees it (src/testing/harness.tsx): the one place its tests say how a fixture becomes a
// <Toolbar>. A fixture's items arrive under their React Native names (`platforms.react-native.items`): an
// `action` is an `IconButton` (its content the glyph), a `button` a `Button` (its content the label) — the product's own
// components, which the toolbar lays out and never restyles. The stages are the spec's: docked in a 360 × 56 stage
// (TBR-1), floating centered in a 360 × 96 stage (TBR-4), vertical centered in a 96 × 240 stage (TBR-6). A floating
// toolbar does not place itself (TBR-5): the stage centers it with `alignSelf`, as a product's layout would.
import { View } from 'react-native';
import { defineSubject } from '../../testing/harness';
import { Button, type ButtonProps } from '../Button';
import { IconButton, type IconButtonProps } from '../IconButton';
import { Toolbar, type ToolbarProps } from '../Toolbar';

export type ToolbarFixtureItem = { kind: string; children?: string } & Record<string, unknown>;
type SubjectProps = Omit<ToolbarProps, 'variant' | 'orientation' | 'children'> & { variant?: string; orientation?: string; items?: ToolbarFixtureItem[] };

/** A fixture item as the element the toolbar holds. */
export function toolbarItem({ kind, children, ...props }: ToolbarFixtureItem, index: number) {
  return kind === 'action' ? (
    <IconButton key={index} {...(props as IconButtonProps)}>
      {children}
    </IconButton>
  ) : (
    <Button key={index} {...(props as ButtonProps)}>
      {children}
    </Button>
  );
}

/** The spec's stage of a variant and orientation. */
export function toolbarStage(variant: string | undefined, orientation: string | undefined) {
  if (variant !== 'floating') return { width: 360, height: 56 };
  return orientation === 'vertical' ? { width: 96, height: 240, alignItems: 'center', justifyContent: 'center' } as const : { width: 360, height: 96, alignItems: 'center', justifyContent: 'center' } as const;
}

export const toolbarSubject = defineSubject<SubjectProps>({
  component: 'Toolbar',
  spec: 'toolbar',
  tokens: 'toolbar',
  render: ({ items = [], ...props }) => (
    <View style={toolbarStage(props.variant, props.orientation)}>
      <Toolbar {...(props as ToolbarProps)} style={props.variant === 'floating' ? { alignSelf: 'center' } : undefined}>
        {items.map(toolbarItem)}
      </Toolbar>
    </View>
  ),
  axes: { variant: 'variants' },
});
