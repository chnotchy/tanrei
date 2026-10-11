// ExtendedFloatingActionButton as the test harness sees it (src/testing/harness.tsx): the one place its tests say how
// spec props become an <ExtendedFloatingActionButton>. The fixtures' `content` ("edit") arrives as `children` and becomes
// the `icon` prop — a glyph of the system's icon font (the spec's `platforms.react-native` notes); `filled-no-icon` has none.
import { defineSubject } from '../../testing/harness';
import { ExtendedFloatingActionButton, type ExtendedFloatingActionButtonProps } from '../ExtendedFab';

type SubjectProps = ExtendedFloatingActionButtonProps & { children?: string };

export const extendedFabSubject = defineSubject<SubjectProps>({
  component: 'ExtendedFab',
  spec: 'extended-fab',
  tokens: 'extendedFab',
  render: ({ children, ...props }) => <ExtendedFloatingActionButton icon={children} {...props} />,
  axes: { size: 'sizes', variant: 'variants' },
});
